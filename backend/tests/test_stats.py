import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import Client
from rest_framework import status
from rest_framework.test import APIClient

from media.models import Genre, Informer, MediaEntry, MediaInformer
from stats.models import MediaStatSnapshot, StatCounter
from stats.services import recalculate_stats


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
def staff_client(user):
    user.is_staff = True
    user.save()
    client = APIClient()
    resp = client.post(
        "/api/auth/login/",
        {"username": "admin", "password": "pass12345"},
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    client.user = user
    return client


def counter(user, dimension, bucket, media_type, is_anime):
    return StatCounter.objects.filter(
        user=user,
        dimension=dimension,
        bucket=bucket,
        media_type=media_type,
        is_anime=is_anime,
    ).first()


@pytest.mark.django_db
class TestStatsSignals:
    def test_create_builds_counters(self, user):
        MediaEntry.objects.create(
            user=user,
            title="Аниме фильм",
            media_type="movie",
            is_anime=True,
            my_rating=9,
            my_status="completed",
            download_status="downloaded",
            is_favorite=True,
            year_start=2020,
        )
        snap = MediaStatSnapshot.objects.get(media_entry__user=user)
        assert snap.buckets
        assert counter(user, "total", "", "movie", True).count == 1
        assert counter(user, "rating", "9", "movie", True).count == 1
        assert counter(user, "my_status", "completed", "movie", True).count == 1
        assert (
            counter(user, "download_status", "downloaded", "movie", True).count
            == 1
        )
        assert counter(user, "favorite", "true", "movie", True).count == 1
        assert counter(user, "year", "2020", "movie", True).count == 1

    def test_no_rating_and_unknown_year(self, user):
        MediaEntry.objects.create(user=user, title="Без данных")
        assert counter(user, "rating", "none", "movie", False).count == 1
        assert counter(user, "year", "unknown", "movie", False).count == 1

    def test_update_moves_counter(self, user):
        entry = MediaEntry.objects.create(
            user=user, title="Фильм", my_rating=5
        )
        assert counter(user, "rating", "5", "movie", False).count == 1
        entry.my_rating = 7
        entry.save()
        assert counter(user, "rating", "5", "movie", False) is None
        assert counter(user, "rating", "7", "movie", False).count == 1

    def test_delete_removes_counters(self, user):
        entry = MediaEntry.objects.create(user=user, title="Фильм")
        assert StatCounter.objects.filter(user=user).exists()
        entry.delete()
        assert not StatCounter.objects.filter(user=user).exists()
        assert not MediaStatSnapshot.objects.filter(
            media_entry__user=user
        ).exists()

    def test_genre_change_updates_counters(self, user):
        genre = Genre.objects.create(name="Драма", slug="drama")
        entry = MediaEntry.objects.create(user=user, title="Фильм")
        assert counter(user, "genre", "drama", "movie", False) is None
        entry.genres.add(genre)
        assert counter(user, "genre", "drama", "movie", False).count == 1
        entry.genres.remove(genre)
        assert counter(user, "genre", "drama", "movie", False) is None

    def test_informer_change_updates_counters(self, user):
        entry = MediaEntry.objects.create(user=user, title="Фильм")
        informer = Informer.objects.create(name="Вася")
        link = MediaInformer.objects.create(
            user=user, media_entry=entry, informer=informer
        )
        assert counter(user, "informer", str(informer.id), "movie", False).count == 1
        link.delete()
        assert (
            counter(user, "informer", str(informer.id), "movie", False) is None
        )

    def test_multiple_informers(self, user):
        entry = MediaEntry.objects.create(user=user, title="Фильм")
        first = Informer.objects.create(name="Вася")
        second = Informer.objects.create(name="Петя")
        MediaInformer.objects.create(
            user=user, media_entry=entry, informer=first
        )
        MediaInformer.objects.create(
            user=user, media_entry=entry, informer=second
        )
        assert counter(user, "informer", str(first.id), "movie", False).count == 1
        assert counter(user, "informer", str(second.id), "movie", False).count == 1


@pytest.mark.django_db
class TestStatsApi:
    def test_requires_auth(self):
        client = APIClient()
        resp = client.get("/api/stats/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_summary_breakdown(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(
            user=user, title="M1", media_type="movie", is_anime=True
        )
        MediaEntry.objects.create(
            user=user, title="M2", media_type="movie", is_anime=False
        )
        MediaEntry.objects.create(
            user=user, title="S1", media_type="series", is_anime=True
        )
        resp = auth_client.get("/api/stats/")
        assert resp.status_code == status.HTTP_200_OK
        summary = resp.data["summary"]
        assert summary["movie"] == {"total": 2, "anime": 1, "not_anime": 1}
        assert summary["series"] == {"total": 1, "anime": 1, "not_anime": 0}

    def test_dimension_payload(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(
            user=user,
            title="M1",
            media_type="movie",
            is_anime=True,
            my_rating=8,
        )
        MediaEntry.objects.create(
            user=user,
            title="M2",
            media_type="movie",
            is_anime=False,
            my_rating=8,
        )
        resp = auth_client.get("/api/stats/")
        rating = resp.data["dimensions"]["rating"]
        assert len(rating) == 1
        assert rating[0]["bucket"] == "8"
        assert rating[0]["counts"]["movie_anime"] == 1
        assert rating[0]["counts"]["movie_not_anime"] == 1
        assert rating[0]["counts"]["series_anime"] == 0
        assert rating[0]["total"] == 2

    def test_rating_order_numeric(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(user=user, title="A", my_rating=10)
        MediaEntry.objects.create(user=user, title="B", my_rating=2)
        MediaEntry.objects.create(user=user, title="C")
        resp = auth_client.get("/api/stats/")
        buckets = [item["bucket"] for item in resp.data["dimensions"]["rating"]]
        assert buckets == ["2", "10", "none"]

    def test_lazy_initialization(self, auth_client):
        user = auth_client.user
        MediaEntry.objects.create(user=user, title="A")
        StatCounter.objects.filter(user=user).delete()
        MediaStatSnapshot.objects.filter(media_entry__user=user).delete()
        resp = auth_client.get("/api/stats/")
        assert resp.data["summary"]["movie"]["total"] == 1

    def test_recalculate_endpoint_staff_only(self, auth_client):
        resp = auth_client.post("/api/stats/recalculate/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_recalculate_endpoint(self, staff_client):
        user = staff_client.user
        MediaEntry.objects.create(user=user, title="A", my_rating=4)
        StatCounter.objects.filter(user=user).delete()
        resp = staff_client.post("/api/stats/recalculate/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "ok"
        assert counter(user, "rating", "4", "movie", False).count == 1


@pytest.mark.django_db
class TestRecalculateService:
    def test_recalculate_rebuilds_from_scratch(self, user):
        MediaEntry.objects.create(
            user=user, title="A", my_rating=3, is_favorite=True
        )
        MediaEntry.objects.create(user=user, title="B", media_type="series")
        StatCounter.objects.all().delete()
        MediaStatSnapshot.objects.all().delete()
        created = recalculate_stats()
        assert created > 0
        assert counter(user, "total", "", "movie", False).count == 1
        assert counter(user, "total", "", "series", False).count == 1
        assert counter(user, "favorite", "true", "movie", False).count == 1
        assert MediaStatSnapshot.objects.filter(media_entry__user=user).count() == 2

    def test_recalculate_single_user(self, user):
        other = User.objects.create_user("other", password="pass12345")
        MediaEntry.objects.create(user=user, title="A")
        MediaEntry.objects.create(user=other, title="B")
        StatCounter.objects.filter(user=other).delete()
        recalculate_stats(user=user)
        assert StatCounter.objects.filter(user=user).exists()
        assert not StatCounter.objects.filter(user=other).exists()

    def test_management_command(self, user):
        MediaEntry.objects.create(user=user, title="A", my_rating=6)
        StatCounter.objects.all().delete()
        call_command("recalculate_stats")
        assert counter(user, "rating", "6", "movie", False).count == 1


@pytest.mark.django_db
class TestStatsAdmin:
    def test_recalculate_button_rendered(self, user):
        user.is_staff = True
        user.is_superuser = True
        user.save()
        client = Client()
        client.force_login(user)
        resp = client.get("/admin/stats/statcounter/")
        assert resp.status_code == 200
        assert "Пересчитать статистику" in resp.content.decode()
