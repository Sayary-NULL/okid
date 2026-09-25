import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from media.models import MediaEntry
from shelves.models import Collection

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

    def test_media_detail_lists_only_member_collections(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Member")
        Collection.objects.create(user=user, name="Empty")
        member = Collection.objects.create(user=user, name="Has")
        auth_client.post(
            f"/api/collections/{member.id}/items/",
            {"media_entry": entry.id},
        )
        resp = auth_client.get(f"/api/media/{entry.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["collections"] == [
            {"id": member.id, "name": "Has", "poster": None}
        ]

    def test_set_and_remove_collection_poster(self, auth_client, tmp_path, settings):
        settings.MEDIA_ROOT = tmp_path
        user = auth_client.user
        col = Collection.objects.create(user=user, name="Poster")
        upload = SimpleUploadedFile(
            "poster.png", PNG_BYTES, content_type="image/png"
        )
        resp = auth_client.post(
            f"/api/collections/{col.id}/poster/",
            {"poster": upload},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["poster"]

        detail = auth_client.get(f"/api/collections/{col.id}/")
        assert detail.data["poster"]

        removed = auth_client.delete(f"/api/collections/{col.id}/poster/")
        assert removed.status_code == status.HTTP_204_NO_CONTENT
        col.refresh_from_db()
        assert not col.poster

    def test_reject_non_image_poster(self, auth_client, tmp_path, settings):
        settings.MEDIA_ROOT = tmp_path
        user = auth_client.user
        col = Collection.objects.create(user=user, name="Bad")
        upload = SimpleUploadedFile(
            "note.txt", b"hello", content_type="text/plain"
        )
        resp = auth_client.post(
            f"/api/collections/{col.id}/poster/",
            {"poster": upload},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

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