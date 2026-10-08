import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from media.models import MediaEntry
from shelves.models import Collection, CollectionItem


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


def _link(client, entry, linked):
    return client.post(
        f"/api/media/{entry.id}/universe/", {"media_entry": linked.id}
    )


@pytest.mark.django_db
class TestUniverseLinking:
    def test_link_creates_franchise(self, auth_client):
        user = auth_client.user
        first = MediaEntry.objects.create(
            user=user, title="First", description="Desc"
        )
        second = MediaEntry.objects.create(user=user, title="Second")
        resp = _link(auth_client, first, second)
        assert resp.status_code == status.HTTP_200_OK
        first.refresh_from_db()
        second.refresh_from_db()
        assert first.universe_collection_id == second.universe_collection_id
        assert first.universe_collection is not None
        collection = first.universe_collection
        assert collection.is_universe is True
        assert collection.name == "First"
        assert collection.description == "Desc"
        assert collection.items.count() == 2

    def test_link_adds_to_existing_franchise(self, auth_client):
        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        third = MediaEntry.objects.create(user=user, title="Third")
        _link(auth_client, first, second)
        collection_id = MediaEntry.objects.get(pk=first.pk).universe_collection_id

        resp = _link(auth_client, first, third)
        assert resp.status_code == status.HTTP_200_OK
        third.refresh_from_db()
        assert third.universe_collection_id == collection_id
        assert Collection.objects.get(pk=collection_id).items.count() == 3

    def test_link_current_to_linked_franchise(self, auth_client):
        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        third = MediaEntry.objects.create(user=user, title="Third")
        _link(auth_client, first, second)
        collection_id = MediaEntry.objects.get(pk=first.pk).universe_collection_id

        resp = _link(auth_client, third, first)
        assert resp.status_code == status.HTTP_200_OK
        third.refresh_from_db()
        assert third.universe_collection_id == collection_id

    def test_link_conflicting_franchises_fails(self, auth_client):
        user = auth_client.user
        a1 = MediaEntry.objects.create(user=user, title="A1")
        a2 = MediaEntry.objects.create(user=user, title="A2")
        b1 = MediaEntry.objects.create(user=user, title="B1")
        b2 = MediaEntry.objects.create(user=user, title="B2")
        _link(auth_client, a1, a2)
        _link(auth_client, b1, b2)

        resp = _link(auth_client, a1, b1)
        assert resp.status_code == status.HTTP_409_CONFLICT
        assert "невозможно" in resp.data["error"]

    def test_link_self_fails(self, auth_client):
        user = auth_client.user
        entry = MediaEntry.objects.create(user=user, title="Self")
        resp = _link(auth_client, entry, entry)
        assert resp.status_code == status.HTTP_409_CONFLICT

    def test_media_detail_exposes_universe_collection_id(self, auth_client):
        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        _link(auth_client, first, second)
        collection = Collection.objects.get(is_universe=True)

        resp = auth_client.get(f"/api/media/{first.id}/")
        assert resp.data["universe_collection_id"] == collection.id

    def test_franchise_common_list_includes_all_members_ordered(
        self, auth_client
    ):
        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        third = MediaEntry.objects.create(user=user, title="Third")
        _link(auth_client, first, second)
        _link(auth_client, first, third)
        collection = Collection.objects.get(is_universe=True)

        resp = auth_client.get(f"/api/collections/{collection.id}/")
        member_ids = [
            item["media_entry"] for item in resp.data["items"]
        ]
        assert member_ids == [first.id, second.id, third.id]

    def test_unlink_removes_and_deletes_small_franchise(self, auth_client):
        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        _link(auth_client, first, second)

        resp = auth_client.delete(f"/api/media/{first.id}/universe/{second.id}/")
        assert resp.status_code == status.HTTP_200_OK
        first.refresh_from_db()
        second.refresh_from_db()
        assert first.universe_collection_id is None
        assert second.universe_collection_id is None
        assert Collection.objects.filter(is_universe=True).count() == 0

    def test_collections_registry_excludes_and_includes_franchises(
        self, auth_client
    ):
        user = auth_client.user
        Collection.objects.create(user=user, name="Normal")
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        _link(auth_client, first, second)

        normal = auth_client.get("/api/collections/")
        assert [c["name"] for c in normal.data["results"]] == ["Normal"]

        universe = auth_client.get("/api/collections/?universe=true")
        assert len(universe.data["results"]) == 1
        assert universe.data["results"][0]["is_universe"] is True

    def test_franchise_detail_has_is_universe(self, auth_client):
        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        _link(auth_client, first, second)
        collection = Collection.objects.get(is_universe=True)
        resp = auth_client.get(f"/api/collections/{collection.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_universe"] is True
        assert len(resp.data["items"]) == 2

    def test_collection_item_add_maintains_universe_fk(self, auth_client):
        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        _link(auth_client, first, second)
        collection = Collection.objects.get(is_universe=True)
        third = MediaEntry.objects.create(user=user, title="Third")

        resp = auth_client.post(
            f"/api/collections/{collection.id}/items/",
            {"media_entry": third.id},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        third.refresh_from_db()
        assert third.universe_collection_id == collection.id

    def test_collection_item_delete_clears_universe_fk(self, auth_client):
        user = auth_client.user
        first = MediaEntry.objects.create(user=user, title="First")
        second = MediaEntry.objects.create(user=user, title="Second")
        third = MediaEntry.objects.create(user=user, title="Third")
        _link(auth_client, first, second)
        collection = Collection.objects.get(is_universe=True)
        _link(auth_client, first, third)

        item = CollectionItem.objects.get(
            collection=collection, media_entry=third
        )
        resp = auth_client.delete(
            f"/api/collections/{collection.id}/items/{item.id}/"
        )
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        third.refresh_from_db()
        assert third.universe_collection_id is None
        assert Collection.objects.filter(is_universe=True).count() == 1
