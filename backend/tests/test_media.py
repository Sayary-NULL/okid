import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from media.models import Genre, Country, MediaEntry, MediaHistory


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