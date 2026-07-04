from django.test import TestCase

from apps.clients.models import Client


class ClientBusinessRuleTests(TestCase):
    """Business rule: a client without a signed NDA cannot be active."""

    def _make(self, **overrides):
        defaults = dict(
            name="Hospital de Prueba",
            ruc="1790012345001",
            client_type=Client.ClientType.PUBLIC,
            address="Av. Siempre Viva",
            city="Quito",
            province="Pichincha",
        )
        defaults.update(overrides)
        return Client.objects.create(**defaults)

    def test_client_without_nda_is_forced_inactive(self):
        client = self._make(nda_signed=False, status=Client.Status.ACTIVE)
        self.assertEqual(client.status, Client.Status.INACTIVE)

    def test_client_with_nda_keeps_active(self):
        client = self._make(
            ruc="1790012345002", nda_signed=True, status=Client.Status.ACTIVE
        )
        self.assertEqual(client.status, Client.Status.ACTIVE)
