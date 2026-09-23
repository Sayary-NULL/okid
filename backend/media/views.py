import requests
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin, ListModelMixin
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet, ModelViewSet, ReadOnlyModelViewSet

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


class GenreViewSet(ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [AllowAny]
    pagination_class = None


class CountryViewSet(ReadOnlyModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]
    pagination_class = None


class MediaEntryViewSet(ModelViewSet):
    def get_queryset(self):
        return MediaEntry.objects.filter(user=self.request.user)

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
            queryset = queryset.filter(title__icontains=q)
        if is_favorite:
            queryset = queryset.filter(is_favorite=True)
        if is_anime:
            queryset = queryset.filter(is_anime=True)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def save_poster(self, request, pk=None):
        entry = self.get_object()
        if not entry.poster_url:
            return Response(
                {"error": "No poster URL to download."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            resp = requests.get(entry.poster_url, timeout=10)
            resp.raise_for_status()
            from django.core.files.base import ContentFile
            ext = entry.poster_url.rsplit(".", 1)[-1].split("?")[0]
            if len(ext) > 5 or "/" in ext:
                ext = "jpg"
            filename = f"poster_{entry.id}.{ext}"
            entry.poster_local.save(filename, ContentFile(resp.content), save=True)
            return Response({"poster_local": entry.poster_local.url})
        except requests.RequestException:
            return Response(
                {"error": "Failed to download poster."},
                status=status.HTTP_502_BAD_GATEWAY,
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


class InformerViewSet(CreateModelMixin, ListModelMixin, GenericViewSet):
    queryset = Informer.objects.all()
    serializer_class = InformerSerializer
    pagination_class = None


class SearchView(APIView):
    permission_classes = [AllowAny]

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
        params = {"query": query, "field": "name", "limit": 20}
        if year:
            params["year"] = year
        if media_type == "series":
            params["type"] = "tv-series"
        elif media_type == "movie":
            params["type"] = "movie"

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
            for item in data.get("docs", []):
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
                        "media_type": media_type_convert[item.get("type", media_type)],
                        "is_anime": item.get("type") == "anime",
                        "rating_kp": (item.get("rating") or {}).get("kp"),
                        "rating_imdb": (item.get("rating") or {}).get("imdb"),
                        "rating_tmdb": (item.get("rating") or {}).get("tmdb"),
                        "status": item.get("status", ""),
                        "movie_length": item.get("movieLength"),
                        "is_series": item.get("isSeries", False),
                        "total_series_length": item.get("totalSeriesLength"),
                        "series_length": item.get("seriesLength"),
                        "external_kp_id": str(item.get("id", "")),
                        "external_imdb_id": (item.get("externalId") or {}).get("imdb", ""),
                        "external_tmdb_id": str((item.get("externalId") or {}).get("tmdb", "")),
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
        except requests.RequestException as error:
            print(f"{error}")
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
                }
            }
        """
        variables = {
            "search": query,
            "limit": 20,
            "kind": "movie" if media_type == "movie" else "tv",
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
            results = []
            for item in (data.get("data") or {}).get("animes") or []:
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
        except requests.RequestException as error:
            print(f"{error}")
            return Response(
                {"error": "Failed to search Shikimori."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class ImportView(APIView):
    def post(self, request):
        try:
            data = request.data
            media_type = data.get("media_type", "movie")
            print(media_type)

            genres_data = data.pop("genres", [])
            countries_data = data.pop("countries", [])

            data["user"] = request.user
            serializer = MediaEntryWriteSerializer(
                data=data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)

            genres = []
            for name in genres_data:
                genre, _ = Genre.objects.get_or_create(
                    slug=name.lower().replace(" ", "-"),
                    defaults={"name": name},
                )
                genres.append(genre)

            countries = []
            for name in countries_data:
                country, _ = Country.objects.get_or_create(name=name)
                countries.append(country)

            entry = serializer.save()
            entry.genres.set(genres)
            entry.countries.set(countries)
            return Response(
                MediaEntryDetailSerializer(entry).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as error:
            print(f"{error}")
            return Response(
                {"error": "Failed to add media."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
