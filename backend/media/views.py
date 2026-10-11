import ipaddress
import logging
import re
import socket
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin, ListModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet, ModelViewSet, ReadOnlyModelViewSet

logger = logging.getLogger(__name__)

MAX_POSTER_BYTES = 10 * 1024 * 1024
POSTER_CHUNK_SIZE = 64 * 1024
ALLOWED_POSTER_TYPES = (
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
)


def _is_safe_poster_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    try:
        addresses = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        return False
    for address in addresses:
        try:
            ip = ipaddress.ip_address(address[4][0])
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
    return True

from media.models import (
    Country,
    Genre,
    Informer,
    MediaEntry,
    MediaHistory,
    MediaInformer,
)
from media.serializers import (
    CountrySerializer,
    GenreSerializer,
    InformerSerializer,
    MediaEntryDetailSerializer,
    MediaEntryListSerializer,
    MediaEntryWriteSerializer,
    MediaHistoryCreateSerializer,
    MediaHistorySerializer,
    MediaInformerCreateSerializer,
    MediaInformerSerializer,
)
from shelves.services import link_media, unlink_media


CYRILLIC_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"
LATIN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
LETTER_GROUPS = set(CYRILLIC_ALPHABET) | set(LATIN_ALPHABET) | set("0123456789")

GROUP_ORDER = {}
for _index, _char in enumerate("0123456789"):
    GROUP_ORDER[_char] = (0, _index)
for _index, _char in enumerate(CYRILLIC_ALPHABET):
    GROUP_ORDER[_char] = (1, _index)
for _index, _char in enumerate(LATIN_ALPHABET):
    GROUP_ORDER[_char] = (2, _index)


def _title_group(title):
    if not title:
        return None
    char = title.lstrip()[:1].upper()
    if char in LETTER_GROUPS:
        return char
    return None


def _group_sort_key(char):
    return GROUP_ORDER.get(char, (3, char))


class GenreViewSet(ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class CountryViewSet(ReadOnlyModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class MediaEntryViewSet(ModelViewSet):
    def get_queryset(self):
        return MediaEntry.objects.filter(user=self.request.user).order_by("title")

    def get_serializer_class(self):
        if self.action == "list":
            return MediaEntryListSerializer
        elif self.action in ("create", "update", "partial_update"):
            return MediaEntryWriteSerializer
        return MediaEntryDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        year = request.query_params.get("year")
        genre = request.query_params.get("genre")
        media_type = request.query_params.get("type")
        my_status = request.query_params.get("my_status")
        download_status = request.query_params.get("download_status")
        informer = request.query_params.get("informer")
        q = request.query_params.get("q")
        is_favorite = request.query_params.get("is_favorite")
        is_anime = request.query_params.get("is_anime")
        letter = request.query_params.get("letter")

        if year:
            queryset = queryset.filter(year_start=year)
        if genre:
            queryset = queryset.filter(genres__slug=genre)
        if media_type:
            queryset = queryset.filter(media_type=media_type)
        if my_status:
            queryset = queryset.filter(my_status=my_status)
        if download_status:
            queryset = queryset.filter(download_status=download_status)
        if informer:
            queryset = queryset.filter(informers__informer_id=informer).distinct()
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q) | Q(original_title__icontains=q)
            )
        if is_favorite:
            queryset = queryset.filter(is_favorite=True)
        if is_anime == "true":
            queryset = queryset.filter(is_anime=True)
        elif is_anime == "false":
            queryset = queryset.filter(is_anime=False)
        if letter:
            queryset = queryset.filter(title__iregex=rf"^\s*{re.escape(letter)}")

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def letters(self, request):
        titles = MediaEntry.objects.filter(user=request.user).values_list(
            "title", flat=True
        )
        counts = {}
        for title in titles:
            group = _title_group(title)
            if group is not None:
                counts[group] = counts.get(group, 0) + 1
        items = sorted(counts.items(), key=lambda item: _group_sort_key(item[0]))
        return Response(
            [{"letter": char, "count": count} for char, count in items]
        )

    @action(detail=True, methods=["post"], url_path="save-poster")
    def save_poster(self, request, pk=None):
        entry = self.get_object()
        if not entry.poster_url:
            return Response(
                {"error": "No poster URL to download."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not _is_safe_poster_url(entry.poster_url):
            return Response(
                {"error": "Poster URL is not allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django.core.files.base import ContentFile

        try:
            with requests.get(
                entry.poster_url, timeout=10, stream=True, allow_redirects=False
            ) as resp:
                resp.raise_for_status()
                content_type = resp.headers.get("Content-Type", "")
                if content_type and not content_type.startswith("image/"):
                    return Response(
                        {"error": "URL does not point to an image."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                chunks = []
                size = 0
                for chunk in resp.iter_content(POSTER_CHUNK_SIZE):
                    size += len(chunk)
                    if size > MAX_POSTER_BYTES:
                        return Response(
                            {"error": "Poster is too large."},
                            status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        )
                    chunks.append(chunk)
                content = b"".join(chunks)

            ext = entry.poster_url.rsplit(".", 1)[-1].split("?")[0].lower()
            if len(ext) > 5 or "/" in ext or not ext.isalnum():
                ext = "jpg"
            filename = f"poster_{entry.id}.{ext}"
            entry.poster_local.save(filename, ContentFile(content), save=True)
            return Response({"poster_local": entry.poster_local.url})
        except requests.RequestException:
            logger.warning(
                "Failed to download poster for media %s", entry.id, exc_info=True
            )
            return Response(
                {"error": "Failed to download poster."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=True, methods=["post", "delete"], url_path="poster")
    def poster(self, request, pk=None):
        entry = self.get_object()
        if request.method == "DELETE":
            if entry.poster_local:
                entry.poster_local.delete(save=False)
            entry.poster_local = None
            entry.save(update_fields=["poster_local", "updated_at"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        upload = request.FILES.get("poster")
        if upload is None:
            return Response(
                {"error": "No poster file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > MAX_POSTER_BYTES:
            return Response(
                {"error": "Poster is too large."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        if upload.content_type not in ALLOWED_POSTER_TYPES:
            return Response(
                {"error": "Unsupported image type."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if entry.poster_local:
            entry.poster_local.delete(save=False)
        entry.poster_local = upload
        entry.save(update_fields=["poster_local", "updated_at"])
        return Response(
            MediaEntryDetailSerializer(
                entry, context=self.get_serializer_context()
            ).data
        )

    @action(detail=True, methods=["get", "post"])
    def history(self, request, pk=None):
        entry = self.get_object()
        if request.method == "GET":
            queryset = MediaHistory.objects.filter(
                media_entry=entry, user=request.user
            )
            serializer = MediaHistorySerializer(queryset, many=True)
            return Response(serializer.data)

        serializer = MediaHistoryCreateSerializer(
            data=request.data,
            context={"request": request, "media_entry": entry},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"history/(?P<history_pk>\d+)",
    )
    def delete_history(self, request, pk=None, history_pk=None):
        entry = self.get_object()
        history = MediaHistory.objects.filter(
            media_entry=entry, user=request.user, pk=history_pk
        ).first()
        if history is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        history.delete()
        latest = (
            MediaHistory.objects.filter(media_entry=entry, user=request.user)
            .order_by("-created_at")
            .first()
        )
        entry.my_status = (
            latest.new_status
            if latest is not None
            else history.old_status or MediaEntry.MyStatus.PLAN_TO_WATCH
        )
        entry.save(update_fields=["my_status", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"])
    def informers(self, request, pk=None):
        entry = self.get_object()
        if request.method == "GET":
            queryset = MediaInformer.objects.filter(
                media_entry=entry, user=request.user
            )
            serializer = MediaInformerSerializer(queryset, many=True)
            return Response(serializer.data)

        serializer = MediaInformerCreateSerializer(
            data=request.data,
            context={"request": request, "media_entry": entry},
        )
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(
            MediaInformerSerializer(instance).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"informers/(?P<informer_pk>\d+)",
    )
    def delete_informer(self, request, pk=None, informer_pk=None):
        entry = self.get_object()
        deleted, _ = MediaInformer.objects.filter(
            media_entry=entry, user=request.user, pk=informer_pk
        ).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="universe")
    def link_universe(self, request, pk=None):
        entry = self.get_object()
        linked_id = request.data.get("media_entry")
        if not linked_id:
            return Response(
                {"error": "Поле media_entry обязательно."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        linked = get_object_or_404(
            MediaEntry, pk=linked_id, user=request.user
        )
        try:
            link_media(entry, linked)
        except ValidationError as exc:
            return Response(
                {"error": exc.messages[0]},
                status=status.HTTP_409_CONFLICT,
            )
        out = MediaEntryDetailSerializer(
            entry, context=self.get_serializer_context()
        )
        return Response(out.data)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"universe/(?P<media_id>[^/.]+)",
    )
    def unlink_universe(self, request, pk=None, media_id=None):
        entry = self.get_object()
        other = get_object_or_404(
            MediaEntry, pk=media_id, user=request.user
        )
        collection = entry.universe_collection or other.universe_collection
        if collection is not None:
            unlink_media(collection, other)
        entry.refresh_from_db()
        out = MediaEntryDetailSerializer(
            entry, context=self.get_serializer_context()
        )
        return Response(out.data)

    @action(detail=True, methods=["get", "post"])
    def reimport(self, request, pk=None):
        entry = self.get_object()
        source = request.query_params.get("source") or request.data.get("source")

        if source == "shikimori":
            archive_id = entry.external_shikimori_id
            if not archive_id:
                return Response(
                    {"error": "У карточки нет id в Шикимори."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            fetch = _fetch_shikimori_anime
            mapper = _shikimori_reimport_data
        elif source == "poiskkino":
            archive_id = entry.external_pk_id
            if not archive_id:
                return Response(
                    {"error": "У карточки нет id в ПоискКино."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            fetch = _fetch_poiskkino_movie
            is_series = entry.media_type == MediaEntry.MediaType.SERIES
            mapper = lambda item: _poiskkino_reimport_data(item, is_series)
        else:
            return Response(
                {"error": "Не указан внешний архив."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = mapper(fetch(archive_id))
        except LookupError as exc:
            return Response(
                {"error": str(exc)}, status=status.HTTP_404_NOT_FOUND
            )
        except (requests.RequestException, RuntimeError):
            logger.warning(
                "Reimport failed for media %s", entry.id, exc_info=True
            )
            return Response(
                {"error": "Не удалось получить данные из внешнего архива."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if request.method == "GET":
            return Response(payload)

        fields = request.data.get("fields") or []
        if isinstance(fields, str):
            fields = [fields]

        update = {}
        if "ratings" in fields:
            update.update(
                {
                    key: payload[key]
                    for key in REIMPORT_RATING_FIELDS
                    if key in payload
                }
            )
        if "links" in fields and payload.get("external_links"):
            update["external_links"] = _merge_external_links(
                entry.external_links, payload["external_links"]
            )
        if "title" in fields and payload.get("title"):
            update["title"] = payload["title"]
        if "description" in fields:
            update["description"] = payload.get("description", "")
        if "poster_url" in fields and not entry.poster_local:
            update["poster_url"] = payload.get("poster_url", "")

        for attr, value in update.items():
            setattr(entry, attr, value)
        entry.save()

        out = MediaEntryDetailSerializer(
            entry, context=self.get_serializer_context()
        )
        return Response(out.data)


class InformerViewSet(CreateModelMixin, ListModelMixin, GenericViewSet):
    queryset = Informer.objects.all()
    serializer_class = InformerSerializer
    pagination_class = None


def _as_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _poiskkino_matches_year(item, year):
    if item.get("year") == year:
        return True
    for span in item.get("releaseYears") or []:
        start = span.get("start")
        end = span.get("end") or start
        if start is not None and end is not None and start <= year <= end:
            return True
    return False


def _shikimori_matches_year(item, year):
    start = (item.get("airedOn") or {}).get("year")
    end = (item.get("releasedOn") or {}).get("year") or start
    if start is None:
        return False
    if start == year:
        return True
    return start <= year <= (end if end is not None else start)


def _build_external_links(
    kp_id="", imdb_id="", tmdb_id="", shikimori_url="", is_series=False
):
    links = []
    if kp_id:
        kind = "series" if is_series else "film"
        links.append(
            {
                "name": "КиноПоиск",
                "icon": "kp",
                "url": f"https://www.kinopoisk.ru/{kind}/{kp_id}/",
            }
        )
    if imdb_id:
        links.append(
            {
                "name": "IMDb",
                "icon": "imdb",
                "url": f"https://www.imdb.com/title/{imdb_id}/",
            }
        )
    if tmdb_id:
        kind = "tv" if is_series else "movie"
        links.append(
            {
                "name": "TMDB",
                "icon": "tmdb",
                "url": f"https://www.themoviedb.org/{kind}/{tmdb_id}",
            }
        )
    if shikimori_url:
        links.append(
            {
                "name": "Shikimori",
                "icon": "shikimori",
                "url": shikimori_url,
            }
        )
    return links


def _merge_external_links(existing, new_links):
    new_icons = {link.get("icon") for link in new_links}
    merged = [
        link for link in (existing or []) if link.get("icon") not in new_icons
    ]
    merged.extend(new_links)
    return merged


def _watchability_links(item):
    links = []
    for entry in (item.get("watchability") or {}).get("items") or []:
        url = entry.get("url")
        if not url:
            continue
        links.append(
            {
                "name": entry.get("name") or "Смотреть",
                "icon": (entry.get("logo") or {}).get("url") or "",
                "url": url,
            }
        )
    return links


def _fetch_poiskkino_movie(movie_id):
    api_key = settings.POISKKINO_API_KEY
    if not api_key:
        raise RuntimeError("PoiskKino API key is not configured.")
    resp = requests.get(
        f"https://api.poiskkino.dev/v1.5/movie/{movie_id}",
        headers={"X-API-KEY": api_key},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def _poiskkino_reimport_data(item, is_series=False):
    external = item.get("externalId") or {}
    links = _build_external_links(
        kp_id=str(item.get("id", "")),
        imdb_id=external.get("imdb", "") or "",
        tmdb_id=str(external.get("tmdb", "") or ""),
        is_series=is_series,
    )
    links.extend(_watchability_links(item))
    return {
        "source": "poiskkino",
        "title": item.get("name", "") or "",
        "description": item.get("description") or "",
        "poster_url": (item.get("poster") or {}).get("url") or "",
        "rating_kp": (item.get("rating") or {}).get("kp"),
        "rating_imdb": (item.get("rating") or {}).get("imdb"),
        "rating_tmdb": (item.get("rating") or {}).get("tmdb"),
        "external_links": links,
    }


def _fetch_shikimori_anime(anime_id):
    headers = {
        "Content-Type": "application/json",
        "User-Agent": settings.SHIKIMORI_APP_NAME,
    }
    query = """
        query ($ids: String) {
            animes(ids: $ids) {
                id
                name
                russian
                description
                score
                poster { originalUrl }
                url
            }
        }
    """
    resp = requests.post(
        "https://shikimori.io/api/graphql",
        headers=headers,
        json={"query": query, "variables": {"ids": str(anime_id)}},
        timeout=15,
    )
    resp.raise_for_status()
    animes = (resp.json().get("data") or {}).get("animes") or []
    if not animes:
        raise LookupError("Shikimori anime not found.")
    return animes[0]


def _shikimori_reimport_data(item):
    return {
        "source": "shikimori",
        "title": item.get("russian") or item.get("name") or "",
        "description": item.get("description") or "",
        "poster_url": (item.get("poster") or {}).get("originalUrl") or "",
        "rating_shikimori": item.get("score"),
        "external_links": _build_external_links(
            shikimori_url=item.get("url") or ""
        ),
    }


REIMPORT_RATING_FIELDS = (
    "rating_kp",
    "rating_imdb",
    "rating_tmdb",
    "rating_shikimori",
)


class SearchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get("query", "")
        media_type = request.data.get("type", "movie")
        year = request.data.get("year")
        source = request.data.get("source", "poiskkino")

        if not query:
            return Response(
                {"error": "Query is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if source == "shikimori":
            return self._search_shikimori(query, media_type, year)
        return self._search_poiskkino(query, media_type, year)

    def _search_poiskkino(self, query, media_type, year):
        api_key = settings.POISKKINO_API_KEY
        if not api_key:
            return Response(
                {"error": "PoiskKino API key is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        params = {"query": query, "field": "name", "limit": 250}

        try:
            resp = requests.get(
                "https://api.poiskkino.dev/v1.5/movie/search",
                headers={"X-API-KEY": api_key},
                params=params,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            results = []
            media_type_convert = {
                "movie": "movie", 
                "tv-series": "series", 
                "cartoon": "series", 
                "anime": "series", 
                "animated-series": "series", 
                "tv-show": "series"
            }
            series_types = {
                "tv-series",
                "cartoon",
                "anime",
                "animated-series",
                "tv-show",
            }
            docs = data.get("docs", [])
            if media_type == "movie":
                docs = [item for item in docs if item.get("type") == "movie"]
            elif media_type == "series":
                docs = [
                    item for item in docs if item.get("type") in series_types
                ]
            if year and (year_int := _as_int(year)) is not None:
                docs = [
                    item for item in docs if _poiskkino_matches_year(item, year_int)
                ]
            for item in docs:
                external = item.get("externalId") or {}
                external_links = _build_external_links(
                    kp_id=str(item.get("id", "")),
                    imdb_id=external.get("imdb", "") or "",
                    tmdb_id=str(external.get("tmdb", "") or ""),
                    is_series=item.get("type") != "movie",
                )
                external_links.extend(_watchability_links(item))
                results.append(
                    {
                        "external_id": item.get("id"),
                        "title": item.get("name", ""),
                        "original_title": item.get("alternativeName", "")
                        or item.get("enName", ""),
                        "year": item.get("year"),
                        "description": item.get("description", ""),
                        "short_description": item.get("shortDescription", ""),
                        "poster_url": (item.get("poster") or {}).get("url", ""),
                        "media_type": media_type_convert.get(
                            item.get("type", media_type), "series"
                        ),
                        "is_anime": item.get("type") == "anime",
                        "rating_kp": (item.get("rating") or {}).get("kp"),
                        "rating_imdb": (item.get("rating") or {}).get("imdb"),
                        "rating_tmdb": (item.get("rating") or {}).get("tmdb"),
                        "status": item.get("status", ""),
                        "movie_length": item.get("movieLength"),
                        "is_series": item.get("isSeries", False),
                        "total_series_length": item.get("totalSeriesLength"),
                        "series_length": item.get("seriesLength"),
                        "external_pk_id": str(item.get("id", "")),
                        "external_links": external_links,
                        "genres": [
                            g["name"] for g in (item.get("genres") or [])
                        ],
                        "countries": [
                            c["name"] for c in (item.get("countries") or [])
                        ],
                        "year_start": (item.get("releaseYears") or [{}])[0].get(
                            "start"
                        )
                        if item.get("releaseYears")
                        else item.get("year"),
                        "year_end": (item.get("releaseYears") or [{}])[0].get("end")
                        if item.get("releaseYears")
                        else None,
                    }
                )
            return Response({"results": results, "source": "poiskkino"})
        except requests.RequestException:
            logger.warning("PoiskKino search failed", exc_info=True)
            return Response(
                {"error": "Failed to search PoiskKino."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    def _search_shikimori(self, query, media_type, year):
        headers = {
            "Content-Type": "application/json",
            "User-Agent": settings.SHIKIMORI_APP_NAME,
        }

        graphql_query = """
            query ($search: String, $limit: PositiveInt, $kind: AnimeKindString) {
                animes(search: $search, limit: $limit, kind: $kind) {
                    id
                    name
                    russian
                    description
                    kind
                    status
                    score
                    airedOn { year }
                    releasedOn { year }
                    poster { originalUrl }
                    genres { name russian }
                    url
                }
            }
        """
        variables = {
            "search": query,
            "limit": 20,
            "kind": {"movie": "movie", "series": "tv"}.get(media_type),
        }
        try:
            resp = requests.post(
                "https://shikimori.io/api/graphql",
                headers=headers,
                json={"query": graphql_query, "variables": variables},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            animes = (data.get("data") or {}).get("animes") or []
            if year and (year_int := _as_int(year)) is not None:
                animes = [
                    item
                    for item in animes
                    if _shikimori_matches_year(item, year_int)
                ]
            results = []
            for item in animes:
                item_kind = item.get("kind")
                is_movie = item_kind == "movie"
                aired_on = item.get("airedOn") or {}
                released_on = item.get("releasedOn") or {}
                results.append(
                    {
                        "external_id": item.get("id"),
                        "title": item.get("russian", "") or item.get("name", ""),
                        "original_title": item.get("name", ""),
                        "year": aired_on.get("year"),
                        "description": item.get("description") or "",
                        "short_description": "",
                        "poster_url": (item.get("poster") or {}).get("originalUrl") or "",
                        "media_type": "movie" if is_movie else "series",
                        "is_anime": True,
                        "rating_shikimori": item.get("score"),
                        "status": item.get("status", ""),
                        "is_series": not is_movie,
                        "external_shikimori_id": str(item.get("id", "")),
                        "external_links": _build_external_links(
                            shikimori_url=item.get("url") or ""
                        ),
                        "genres": [
                            g.get("russian") or g.get("name", "")
                            for g in (item.get("genres") or [])
                        ],
                        "countries": [],
                        "year_start": aired_on.get("year"),
                        "year_end": released_on.get("year"),
                    }
                )
            return Response({"results": results, "source": "shikimori"})
        except requests.RequestException:
            logger.warning("Shikimori search failed", exc_info=True)
            return Response(
                {"error": "Failed to search Shikimori."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class ImportView(APIView):
    def post(self, request):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(
            request.data
        )

        existing = self._find_existing(request.user, data)
        if existing is not None:
            return Response(
                {
                    "entry": MediaEntryDetailSerializer(
                        existing, context={"request": request}
                    ).data,
                    "created": False,
                }
            )

        serializer = MediaEntryWriteSerializer(
            data=data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        return Response(
            {
                "entry": MediaEntryDetailSerializer(
                    entry, context={"request": request}
                ).data,
                "created": True,
            },
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _find_existing(user, data):
        pk_id = str(data.get("external_pk_id") or "").strip()
        if pk_id:
            existing = MediaEntry.objects.filter(
                user=user, external_pk_id=pk_id
            ).first()
            if existing is not None:
                return existing
        shikimori_id = str(data.get("external_shikimori_id") or "").strip()
        if shikimori_id:
            return MediaEntry.objects.filter(
                user=user, external_shikimori_id=shikimori_id
            ).first()
        return None
