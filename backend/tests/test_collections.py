import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from media.models import MediaEntry
from shelves.models import Collection


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


@pytest.mark.django_db
class TestCollections:
    def test_create_collection(self, auth_client):
        resp = auth_client.post(
            "/api/collections/",
            {"name": "Favorites", "description": "Best movies"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "Favorites"

    def test_list_collections(self, auth_client):
        user = auth_client.user
        Collection.objects.create(user=user, name="C1")
        Collection.objects.create(user=user, name="C2")
        resp = auth_client.get("/api/collections/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_add_item_to_collection(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Item")
        col = Collection.objects.create(user=user, name="Col")
        resp = auth_client.post(
            f"/api/collections/{col.id}/items/",
            {"media_entry": entry.id},
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_duplicate_item_fails(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Dup")
        col = Collection.objects.create(user=user, name="Col")
        auth_client.post(
            f"/api/collections/{col.id}/items/",
            {"media_entry": entry.id},
        )
        resp = auth_client.post(
            f"/api/collections/{col.id}/items/",
            {"media_entry": entry.id},
        )
        assert resp.status_code == status.HTTP_409_CONFLICT

    def test_delete_item(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Del")
        col = Collection.objects.create(user=user, name="Col")
        post = auth_client.post(
            f"/api/collections/{col.id}/items/",
            {"media_entry": entry.id},
        )
        item_id = post.data["id"]
        resp = auth_client.delete(
            f"/api/collections/{col.id}/items/{item_id}/"
        )
        assert resp.status_code == status.HTTP_204_NO_CONTENT