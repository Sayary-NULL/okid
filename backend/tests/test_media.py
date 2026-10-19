import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from media import views
from media.models import Genre, Country, MediaEntry, MediaHistory

PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture
def user():
    return User.objects.create_user("admin", password="pass12345")


@pytest.fixture
def auth_client(user):
    client = APIClient()
    resp = client.post(
        "/api/auth/login/",
        {"username": "admin", "password": "pass12345"},
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    client.user = user
    return client


@pytest.fixture
def genre():
    return Genre.objects.create(name="Комедия", slug="comedy")


@pytest.mark.django_db
class TestMedia:
    def test_create_manual_entry(self, auth_client):
        resp = auth_client.post(
            "/api/media/",
            {
                "title": "Test Movie",
                "media_type": "movie",
                "my_status": "plan_to_watch",
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == "Test Movie"

    def test_list_media(self, auth_client):
        MediaEntry.objects.create(
            user=auth_client.user,
            title="Existing",
        )
        resp = auth_client.get("/api/media/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 1

    def test_list_ordered_by_title(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(user=user, title="Второй")
        MediaEntry.objects.create(user=user, title="Первый")
        MediaEntry.objects.create(user=user, title="Третий")
        resp = auth_client.get("/api/media/")
        assert resp.status_code == status.HTTP_200_OK
        titles = [item["title"] for item in resp.data["results"]]
        assert titles == sorted(titles)

    def test_filter_by_type(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(user=user, title="A", media_type="movie")
        MediaEntry.objects.create(user=user, title="B", media_type="series")
        resp = auth_client.get("/api/media/?type=series")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_filter_by_title(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(user=user, title="Человек паук")
        MediaEntry.objects.create(user=user, title="Другой фильм")
        resp = auth_client.get("/api/media/?q=паук")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["title"] == "Человек паук"

    def test_filter_by_original_title(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(
            user=user, title="Человек паук", original_title="Spider man"
        )
        MediaEntry.objects.create(user=user, title="Другой фильм")
        resp = auth_client.get("/api/media/?q=spider")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["original_title"] == "Spider man"

    def test_filter_by_letter(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(user=user, title="Аватар")
        MediaEntry.objects.create(user=user, title="Аладдин")
        MediaEntry.objects.create(user=user, title="Бэтмен")
        resp = auth_client.get("/api/media/?letter=А")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2
        assert all(
            item["title"].startswith("А") for item in resp.data["results"]
        )

    def test_filter_by_letter_ignores_case(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(user=user, title="avatar")
        MediaEntry.objects.create(user=user, title="Бэтмен")
        resp = auth_client.get("/api/media/?letter=A")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["title"] == "avatar"

    def test_letters_index(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(user=user, title="Аватар")
        MediaEntry.objects.create(user=user, title="Бэтмен")
        MediaEntry.objects.create(user=user, title="12 обезьян")
        MediaEntry.objects.create(user=user, title="[Без буквы]")
        resp = auth_client.get("/api/media/letters/")
        assert resp.status_code == status.HTTP_200_OK
        counts = {item["letter"]: item["count"] for item in resp.data}
        assert counts["А"] == 1
        assert counts["Б"] == 1
        assert counts["1"] == 1
        assert "[" not in counts

    def test_filter_by_is_anime(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(
            user=user, title="A", media_type="series", is_anime=True
        )
        MediaEntry.objects.create(user=user, title="B", media_type="series")
        resp = auth_client.get("/api/media/?is_anime=true")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_detail(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Detail Test")
        resp = auth_client.get(f"/api/media/{entry.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == "Detail Test"

    def test_update(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Old")
        resp = auth_client.patch(
            f"/api/media/{entry.id}/",
            {"title": "New Title"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == "New Title"

    def test_delete(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Delete Me")
        resp = auth_client.delete(f"/api/media/{entry.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_update_poster_url(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Poster URL")
        resp = auth_client.patch(
            f"/api/media/{entry.id}/",
            {"poster_url": "https://example.com/poster.jpg"},
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        assert entry.poster_url == "https://example.com/poster.jpg"

    def test_upload_and_remove_poster(self, auth_client, tmp_path, settings):
        settings.MEDIA_ROOT = tmp_path
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Upload Poster")
        upload = SimpleUploadedFile(
            "poster.png", PNG_BYTES, content_type="image/png"
        )
        resp = auth_client.post(
            f"/api/media/{entry.id}/poster/",
            {"poster": upload},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["poster_local"]
        entry.refresh_from_db()
        assert entry.poster_local

        removed = auth_client.delete(f"/api/media/{entry.id}/poster/")
        assert removed.status_code == status.HTTP_204_NO_CONTENT
        entry.refresh_from_db()
        assert not entry.poster_local

    def test_reject_non_image_media_poster(self, auth_client, tmp_path, settings):
        settings.MEDIA_ROOT = tmp_path
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Bad Poster")
        upload = SimpleUploadedFile(
            "note.txt", b"hello", content_type="text/plain"
        )
        resp = auth_client.post(
            f"/api/media/{entry.id}/poster/",
            {"poster": upload},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_history_create_and_list(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="History Test")
        resp = auth_client.post(
            f"/api/media/{entry.id}/history/",
            {"old_status": "plan_to_watch", "new_status": "watching"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        resp2 = auth_client.get(f"/api/media/{entry.id}/history/")
        assert resp2.status_code == status.HTTP_200_OK
        assert len(resp2.data) == 1

    def test_history_updates_media_status(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(
            user=user, title="History State Test", my_status="plan_to_watch"
        )
        resp = auth_client.post(
            f"/api/media/{entry.id}/history/",
            {"old_status": "plan_to_watch", "new_status": "completed"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        entry.refresh_from_db()
        assert entry.my_status == "completed"

    def test_history_delete(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="History Delete Test")
        auth_client.post(
            f"/api/media/{entry.id}/history/",
            {"old_status": "plan_to_watch", "new_status": "watching"},
        )
        history = MediaHistory.objects.get(media_entry=entry)
        resp = auth_client.delete(
            f"/api/media/{entry.id}/history/{history.id}/"
        )
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        resp2 = auth_client.get(f"/api/media/{entry.id}/history/")
        assert len(resp2.data) == 0
        entry.refresh_from_db()
        assert entry.my_status == "plan_to_watch"

    def test_history_delete_rolls_back_latest_status(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Rollback Test")
        auth_client.post(
            f"/api/media/{entry.id}/history/",
            {"old_status": "plan_to_watch", "new_status": "watching"},
        )
        auth_client.post(
            f"/api/media/{entry.id}/history/",
            {"old_status": "watching", "new_status": "completed"},
        )
        entry.refresh_from_db()
        assert entry.my_status == "completed"
        latest = MediaHistory.objects.filter(media_entry=entry).order_by(
            "-created_at"
        ).first()
        resp = auth_client.delete(
            f"/api/media/{entry.id}/history/{latest.id}/"
        )
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        entry.refresh_from_db()
        assert entry.my_status == "watching"

    def test_informers_create_and_list(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Informer Test")
        resp = auth_client.post(
            f"/api/media/{entry.id}/informers/",
            {"informer_name": "Friend"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["informer"]["name"] == "Friend"
        resp2 = auth_client.get(f"/api/media/{entry.id}/informers/")
        assert resp2.status_code == status.HTTP_200_OK
        assert len(resp2.data) == 1

    def test_informer_reused_across_entries(self, auth_client):
        from media.models import Informer

        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        auth_client.post(
            f"/api/media/{first.id}/informers/", {"informer_name": "Friend"}
        )
        auth_client.post(
            f"/api/media/{second.id}/informers/", {"informer_name": "friend"}
        )
        assert Informer.objects.count() == 1

    def test_informers_list_and_create(self, auth_client):
        resp = auth_client.post("/api/informers/", {"name": "Colleague"})
        assert resp.status_code == status.HTTP_201_CREATED
        resp2 = auth_client.get("/api/informers/")
        assert resp2.status_code == status.HTTP_200_OK
        assert len(resp2.data) == 1

    def test_informer_delete(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Delete Informer")
        resp = auth_client.post(
            f"/api/media/{entry.id}/informers/",
            {"informer_name": "Friend"},
        )
        informer_id = resp.data["id"]
        resp2 = auth_client.delete(
            f"/api/media/{entry.id}/informers/{informer_id}/"
        )
        assert resp2.status_code == status.HTTP_204_NO_CONTENT
        resp3 = auth_client.get(f"/api/media/{entry.id}/informers/")
        assert len(resp3.data) == 0

    def test_filter_by_informer(self, auth_client):
        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="A")
        MediaEntry.objects.create(user=user, title="B")
        resp = auth_client.post(
            f"/api/media/{first.id}/informers/", {"informer_name": "Friend"}
        )
        informer_id = resp.data["informer"]["id"]
        resp2 = auth_client.get(f"/api/media/?informer={informer_id}")
        assert resp2.status_code == status.HTTP_200_OK
        assert resp2.data["count"] == 1
        assert resp2.data["results"][0]["title"] == "A"

    def test_other_users_media_invisible(self, auth_client):
        other = User.objects.create_user("other", password="pass12345")
        MediaEntry.objects.create(user=other, title="Secret")
        resp = auth_client.get("/api/media/")
        assert all(e["title"] != "Secret" for e in resp.data["results"])

    def test_import_creates_entry(self, auth_client):
        resp = auth_client.post(
            "/api/import/",
            {
                "title": "Imported",
                "media_type": "movie",
                "external_pk_id": "777",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] is True
        assert resp.data["entry"]["title"] == "Imported"

    def test_import_duplicate_pk_id(self, auth_client):
        user = auth_client.user
        existing = MediaEntry.objects.create(
            user=user, title="Existing", external_pk_id="666"
        )
        resp = auth_client.post(
            "/api/import/",
            {
                "title": "Duplicate",
                "media_type": "movie",
                "external_pk_id": "666",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["created"] is False
        assert resp.data["entry"]["id"] == existing.id
        assert MediaEntry.objects.filter(user=user).count() == 1

    def test_import_duplicate_shikimori_id(self, auth_client):
        user = auth_client.user
        existing = MediaEntry.objects.create(
            user=user, title="Anime", external_shikimori_id="31240"
        )
        resp = auth_client.post(
            "/api/import/",
            {
                "title": "Anime Duplicate",
                "media_type": "series",
                "external_shikimori_id": "31240",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["created"] is False
        assert resp.data["entry"]["id"] == existing.id
        assert MediaEntry.objects.filter(user=user).count() == 1

    def test_import_duplicate_only_within_user(self, auth_client):
        other = User.objects.create_user("other", password="pass12345")
        MediaEntry.objects.create(
            user=other, title="Other", external_pk_id="666"
        )
        resp = auth_client.post(
            "/api/import/",
            {
                "title": "Mine",
                "media_type": "movie",
                "external_pk_id": "666",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] is True

    def test_import_without_external_ids_not_deduplicated(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(user=user, title="Manual")
        resp = auth_client.post(
            "/api/import/",
            {"title": "Manual", "media_type": "movie"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] is True

    def test_search_poiskkino_marks_existing_entry(self, auth_client, monkeypatch):
        user = auth_client.user
        existing = MediaEntry.objects.create(
            user=user, title="Existing", external_pk_id="111"
        )

        class FakeResponse:
            status_code = 200

            def raise_for_status(self):
                pass

            def json(self):
                return {
                    "docs": [
                        {"id": 111, "name": "Existing", "type": "movie"},
                        {"id": 222, "name": "New", "type": "movie"},
                    ]
                }

        monkeypatch.setattr(views.settings, "POISKKINO_API_KEY", "test-key")
        monkeypatch.setattr(views.requests, "get", lambda *a, **k: FakeResponse())

        resp = auth_client.post(
            "/api/search/",
            {"query": "x", "type": "movie", "source": "poiskkino"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        by_id = {
            r["external_pk_id"]: r["existing_entry_id"]
            for r in resp.data["results"]
        }
        assert by_id["111"] == existing.id
        assert by_id["222"] is None

    def test_search_existing_entry_only_within_user(self, auth_client, monkeypatch):
        other = User.objects.create_user("other", password="pass12345")
        MediaEntry.objects.create(user=other, title="Other", external_pk_id="111")

        class FakeResponse:
            status_code = 200

            def raise_for_status(self):
                pass

            def json(self):
                return {"docs": [{"id": 111, "name": "Shared", "type": "movie"}]}

        monkeypatch.setattr(views.settings, "POISKKINO_API_KEY", "test-key")
        monkeypatch.setattr(views.requests, "get", lambda *a, **k: FakeResponse())

        resp = auth_client.post(
            "/api/search/",
            {"query": "x", "type": "movie", "source": "poiskkino"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["results"][0]["existing_entry_id"] is None

    def test_search_shikimori_marks_existing_entry(self, auth_client, monkeypatch):
        user = auth_client.user
        existing = MediaEntry.objects.create(
            user=user, title="Anime", external_shikimori_id="31240"
        )

        class FakeResponse:
            status_code = 200

            def raise_for_status(self):
                pass

            def json(self):
                return {
                    "data": {
                        "animes": [
                            {"id": 31240, "name": "Anime", "kind": "tv"},
                            {"id": 999, "name": "Other", "kind": "movie"},
                        ]
                    }
                }

        monkeypatch.setattr(views.requests, "post", lambda *a, **k: FakeResponse())

        resp = auth_client.post(
            "/api/search/",
            {"query": "x", "type": "all", "source": "shikimori"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        by_id = {
            r["external_shikimori_id"]: r["existing_entry_id"]
            for r in resp.data["results"]
        }
        assert by_id["31240"] == existing.id
        assert by_id["999"] is None

    def test_update_external_ids(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="External Ids")
        resp = auth_client.patch(
            f"/api/media/{entry.id}/",
            {
                "external_pk_id": "666",
                "external_shikimori_id": "31240",
            },
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        assert entry.external_pk_id == "666"
        assert entry.external_shikimori_id == "31240"

    def test_update_external_links(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="External Links")
        links = [
            {"name": "IMDb", "icon": "imdb", "url": "https://www.imdb.com/title/tt1/"},
        ]
        resp = auth_client.patch(
            f"/api/media/{entry.id}/", {"external_links": links}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        assert entry.external_links == links

    def test_clear_external_ids(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(
            user=user, title="Clear", external_pk_id="666"
        )
        resp = auth_client.patch(
            f"/api/media/{entry.id}/", {"external_pk_id": ""}
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        assert entry.external_pk_id == ""

    def test_reimport_without_source(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="No Source")
        resp = auth_client.post(f"/api/media/{entry.id}/reimport/", {})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_reimport_missing_archive_id(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="No Archive Id")
        resp = auth_client.post(
            f"/api/media/{entry.id}/reimport/", {"source": "poiskkino"}
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_reimport_poiskkino(self, auth_client, monkeypatch):
        user = auth_client.user
        entry = MediaEntry.objects.create(
            user=user,
            title="Old",
            external_pk_id="666",
            poster_url="https://old.example/poster.jpg",
        )
        monkeypatch.setattr(
            "media.views._fetch_poiskkino_movie",
            lambda movie_id: {
                "id": 666,
                "name": "New Name",
                "description": "New Description",
                "poster": {"url": "https://img.example/poster.jpg"},
                "rating": {"kp": 7.1, "imdb": 8.2, "tmdb": 6.3},
                "externalId": {"imdb": "tt1", "tmdb": 9},
            },
        )

        preview = auth_client.get(
            f"/api/media/{entry.id}/reimport/?source=poiskkino"
        )
        assert preview.status_code == status.HTTP_200_OK
        assert preview.data["title"] == "New Name"
        icons = {link["icon"] for link in preview.data["external_links"]}
        assert {"kp", "imdb", "tmdb"} <= icons

        resp = auth_client.post(
            f"/api/media/{entry.id}/reimport/",
            {
                "source": "poiskkino",
                "fields": ["title", "description", "poster_url", "links", "ratings"],
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        assert entry.title == "New Name"
        assert entry.description == "New Description"
        assert entry.poster_url == "https://img.example/poster.jpg"
        assert entry.rating_kp == 7.1
        assert entry.rating_imdb == 8.2
        assert entry.rating_tmdb == 6.3
        by_icon = {link["icon"]: link for link in entry.external_links}
        assert by_icon["kp"]["url"] == "https://www.kinopoisk.ru/film/666/"
        assert by_icon["imdb"]["url"] == "https://www.imdb.com/title/tt1/"
        assert by_icon["tmdb"]["url"] == "https://www.themoviedb.org/movie/9"

    def test_reimport_merges_links(self, auth_client, monkeypatch):
        user = auth_client.user
        entry = MediaEntry.objects.create(
            user=user,
            title="Merge",
            external_pk_id="666",
            external_links=[
                {"name": "Shikimori", "icon": "shikimori", "url": "https://s/a"},
                {"name": "IMDb", "icon": "imdb", "url": "https://old/imdb"},
            ],
        )
        monkeypatch.setattr(
            "media.views._fetch_poiskkino_movie",
            lambda movie_id: {
                "id": 666,
                "name": "Merge",
                "rating": {},
                "externalId": {"imdb": "tt2"},
            },
        )
        resp = auth_client.post(
            f"/api/media/{entry.id}/reimport/",
            {"source": "poiskkino", "fields": ["links"]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        by_icon = {link["icon"]: link["url"] for link in entry.external_links}
        assert by_icon["shikimori"] == "https://s/a"
        assert by_icon["imdb"] == "https://www.imdb.com/title/tt2/"

    def test_reimport_keeps_title_when_not_selected(self, auth_client, monkeypatch):
        user = auth_client.user
        entry = MediaEntry.objects.create(
            user=user, title="Keep Me", external_pk_id="666"
        )
        monkeypatch.setattr(
            "media.views._fetch_poiskkino_movie",
            lambda movie_id: {
                "id": 666,
                "name": "Remote Name",
                "rating": {"kp": 5.0},
                "externalId": {},
            },
        )
        resp = auth_client.post(
            f"/api/media/{entry.id}/reimport/",
            {"source": "poiskkino", "fields": []},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        assert entry.title == "Keep Me"
        assert entry.rating_kp is None

    def test_reimport_selected_ratings_only(self, auth_client, monkeypatch):
        user = auth_client.user
        entry = MediaEntry.objects.create(
            user=user, title="Keep Me", external_pk_id="666"
        )
        monkeypatch.setattr(
            "media.views._fetch_poiskkino_movie",
            lambda movie_id: {
                "id": 666,
                "name": "Remote Name",
                "rating": {"kp": 5.0},
                "externalId": {},
            },
        )
        resp = auth_client.post(
            f"/api/media/{entry.id}/reimport/",
            {"source": "poiskkino", "fields": ["ratings"]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        assert entry.title == "Keep Me"
        assert entry.rating_kp == 5.0

    def test_reimport_shikimori(self, auth_client, monkeypatch):
        user = auth_client.user
        entry = MediaEntry.objects.create(
            user=user, title="Anime", external_shikimori_id="31240"
        )
        monkeypatch.setattr(
            "media.views._fetch_shikimori_anime",
            lambda anime_id: {
                "id": "31240",
                "name": "Re:Zero",
                "russian": "Re:Zero",
                "description": "Описание",
                "score": 8.4,
                "poster": {"originalUrl": "https://shiki.example/p.jpg"},
                "url": "https://shikimori.io/animes/z31240-re-zero",
            },
        )
        resp = auth_client.post(
            f"/api/media/{entry.id}/reimport/",
            {"source": "shikimori", "fields": ["description", "links", "ratings"]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        assert entry.rating_shikimori == 8.4
        assert entry.description == "Описание"
        by_icon = {link["icon"]: link["url"] for link in entry.external_links}
        assert by_icon["shikimori"] == "https://shikimori.io/animes/z31240-re-zero"

    def test_build_external_links_series(self):
        from media.views import _build_external_links

        links = _build_external_links(
            kp_id="10", imdb_id="tt10", tmdb_id="20", is_series=True
        )
        by_icon = {link["icon"]: link["url"] for link in links}
        assert by_icon["kp"] == "https://www.kinopoisk.ru/series/10/"
        assert by_icon["tmdb"] == "https://www.themoviedb.org/tv/20"
        assert len(links) == 3

    def test_watchability_links(self):
        from media.views import _watchability_links

        item = {
            "watchability": {
                "items": [
                    {
                        "name": "Кинопоиск",
                        "url": "https://www.kinopoisk.ru/film/666/watch/",
                        "logo": {"url": "https://logo/1.png"},
                    },
                    {"name": "Без ссылки"},
                ]
            }
        }
        assert _watchability_links(item) == [
            {
                "name": "Кинопоиск",
                "icon": "https://logo/1.png",
                "url": "https://www.kinopoisk.ru/film/666/watch/",
            }
        ]
        assert _watchability_links({}) == []

    def test_reimport_adds_watchability_links(self, auth_client, monkeypatch):
        user = auth_client.user
        entry = MediaEntry.objects.create(
            user=user, title="Cinema", external_pk_id="666"
        )
        monkeypatch.setattr(
            "media.views._fetch_poiskkino_movie",
            lambda movie_id: {
                "id": 666,
                "name": "Cinema",
                "rating": {},
                "externalId": {},
                "watchability": {
                    "items": [
                        {
                            "name": "Иви",
                            "url": "https://www.ivi.ru/watch/666",
                            "logo": {"url": "https://logo/ivi.png"},
                        }
                    ]
                },
            },
        )
        resp = auth_client.post(
            f"/api/media/{entry.id}/reimport/",
            {"source": "poiskkino", "fields": ["links"]},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        entry.refresh_from_db()
        links = {link["name"]: link for link in entry.external_links}
        assert links["Иви"]["url"] == "https://www.ivi.ru/watch/666"
        assert links["Иви"]["icon"] == "https://logo/ivi.png"