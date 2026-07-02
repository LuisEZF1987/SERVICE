from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import AuditLog, User


class AuthTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="jdoe", password="SuperSecret123", role=User.Role.COORDINATOR
        )

    def setUp(self):
        self.api = APIClient()

    def test_login_success_returns_tokens(self):
        resp = self.api.post(
            "/api/v1/auth/login/",
            {"username": "jdoe", "password": "SuperSecret123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertIn("access", body)
        self.assertIn("refresh", body)
        self.assertEqual(body["user"]["username"], "jdoe")

    def test_login_failure_is_audited(self):
        resp = self.api.post(
            "/api/v1/auth/login/",
            {"username": "jdoe", "password": "incorrecta"},
            format="json",
        )
        self.assertIn(resp.status_code, (400, 401))
        self.assertTrue(
            AuditLog.objects.filter(action=AuditLog.Action.LOGIN_FAILED).exists()
        )

    def test_me_requires_authentication(self):
        resp = self.api.get("/api/v1/auth/me/")
        self.assertEqual(resp.status_code, 401)

    def test_me_returns_current_user(self):
        self.api.force_authenticate(user=self.user)
        resp = self.api.get("/api/v1/auth/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["username"], "jdoe")
