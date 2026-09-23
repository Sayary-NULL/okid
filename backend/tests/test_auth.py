import pytest
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestAuth:
    def test_register_first_user(self):
        client = APIClient()
        resp = client.post(
            "/api/auth/register/",
            {"username": "admin", "password": "pass12345"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["username"] == "admin"

    def test_register_second_user_fails(self):
        User.objects.create_user("admin", password="pass12345")
        client = APIClient()
        resp = client.post(
            "/api/auth/register/",
            {"username": "user2", "password": "pass12345"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_returns_jwt(self):
        User.objects.create_user("admin", password="pass12345")
        client = APIClient()
        resp = client.post(
            "/api/auth/login/",
            {"username": "admin", "password": "pass12345"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_unauthenticated_request_returns_401(self):
        client = APIClient()
        resp = client.get("/api/media/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED