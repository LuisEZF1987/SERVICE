from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.clients.models import Client, ClientContact
from apps.clients.services.nda import client_signer
from apps.clients.tasks import send_nda_for_signature
from apps.equipment.models import Equipment
from apps.equipment.serializers import EquipmentSerializer
from apps.work_orders.models import WorkOrder
from apps.work_orders.serializers import WorkOrderSerializer


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


class NDABlocksEquipmentAndWorkOrderTests(TestCase):
    """A client without a signed NDA is inactive and cannot hold equipment or OTs."""

    @classmethod
    def setUpTestData(cls):
        cls.active = Client.objects.create(
            name="Hospital Activo", ruc="1790012345003",
            client_type=Client.ClientType.PUBLIC, address="Av. A",
            city="Quito", province="Pichincha",
            nda_signed=True, status=Client.Status.ACTIVE,
        )
        cls.no_nda = Client.objects.create(
            name="Hospital Sin NDA", ruc="1790012345004",
            client_type=Client.ClientType.PRIVATE, address="Av. B",
            city="Quito", province="Pichincha",
            nda_signed=False,
        )
        cls.technician = User.objects.create_user(
            username="tec-nda", password="pw", role=User.Role.TECHNICIAN
        )

    def _equipment_payload(self, client, **overrides):
        payload = dict(
            internal_code="DIM-NDA-001", serial_number="SN-NDA-001",
            modality=Equipment.Modality.XRAY_FIXED, brand="ACME",
            model_name="X1", client=str(client.id),
            city="Quito", province="Pichincha",
        )
        payload.update(overrides)
        return payload

    def test_equipment_rejected_for_client_without_nda(self):
        serializer = EquipmentSerializer(data=self._equipment_payload(self.no_nda))
        self.assertFalse(serializer.is_valid())
        self.assertIn("client", serializer.errors)
        self.assertIn("NDA", str(serializer.errors["client"]))

    def test_equipment_accepted_for_client_with_nda(self):
        serializer = EquipmentSerializer(data=self._equipment_payload(self.active))
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_existing_equipment_stays_editable_if_client_deactivated(self):
        equipment = Equipment.objects.create(
            internal_code="DIM-NDA-002", serial_number="SN-NDA-002",
            modality=Equipment.Modality.XRAY_FIXED, brand="ACME",
            model_name="X1", client=self.active,
            city="Quito", province="Pichincha",
        )
        self.active.nda_signed = False
        self.active.save()  # forces INACTIVE
        serializer = EquipmentSerializer(
            equipment, data={"area": "Emergencias"}, partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_work_order_rejected_for_client_without_nda(self):
        equipment = Equipment.objects.create(
            internal_code="DIM-NDA-003", serial_number="SN-NDA-003",
            modality=Equipment.Modality.XRAY_FIXED, brand="ACME",
            model_name="X1", client=self.no_nda,
            city="Quito", province="Pichincha",
        )
        serializer = WorkOrderSerializer(data={
            "ot_type": WorkOrder.Type.CORRECTIVE,
            "equipment": str(equipment.id),
            "technician": str(self.technician.id),
            "reported_problem": "No enciende",
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("NDA", str(serializer.errors))

    def test_work_order_accepted_for_client_with_nda(self):
        equipment = Equipment.objects.create(
            internal_code="DIM-NDA-004", serial_number="SN-NDA-004",
            modality=Equipment.Modality.XRAY_FIXED, brand="ACME",
            model_name="X1", client=self.active,
            city="Quito", province="Pichincha",
        )
        serializer = WorkOrderSerializer(data={
            "ot_type": WorkOrder.Type.CORRECTIVE,
            "equipment": str(equipment.id),
            "technician": str(self.technician.id),
            "reported_problem": "No enciende",
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)


class NDADocumentFlowTests(TestCase):
    """Download the blank NDA, then upload it signed to activate the client."""

    @classmethod
    def setUpTestData(cls):
        cls.client_org = Client.objects.create(
            name="Hospital Sin NDA", ruc="1790012345005",
            client_type=Client.ClientType.PRIVATE, address="Av. C",
            city="Quito", province="Pichincha", nda_signed=False,
        )
        cls.coordinator = User.objects.create_user(
            username="coord-nda", password="pw", role=User.Role.COORDINATOR
        )
        cls.technician = User.objects.create_user(
            username="tec-upload", password="pw", role=User.Role.TECHNICIAN
        )

    def setUp(self):
        self.api = APIClient()

    def _pdf(self, name="nda-firmado.pdf"):
        return SimpleUploadedFile(name, b"%PDF-1.4 firmado", content_type="application/pdf")

    def test_blank_nda_downloads_even_without_signed_nda(self):
        self.api.force_authenticate(user=self.coordinator)
        resp = self.api.get(f"/api/v1/reports/nda/{self.client_org.id}/")
        self.assertEqual(resp.status_code, 200, getattr(resp, "content", b"")[:300])
        self.assertEqual(resp["Content-Type"], "application/pdf")
        self.assertTrue(resp.content.startswith(b"%PDF"))

    def test_upload_signed_nda_activates_client(self):
        self.api.force_authenticate(user=self.coordinator)
        signed_on = timezone.localdate() - timedelta(days=1)
        resp = self.api.post(
            f"/api/v1/clients/{self.client_org.id}/nda/",
            {"nda_document": self._pdf(), "nda_signed_date": signed_on.isoformat()},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 200, resp.content[:300])
        self.client_org.refresh_from_db()
        self.assertTrue(self.client_org.nda_signed)
        self.assertEqual(self.client_org.status, Client.Status.ACTIVE)
        self.assertEqual(self.client_org.nda_signed_date, signed_on)
        self.assertTrue(self.client_org.nda_document)

    def test_upload_rejects_future_signature_date(self):
        self.api.force_authenticate(user=self.coordinator)
        future = timezone.localdate() + timedelta(days=1)
        resp = self.api.post(
            f"/api/v1/clients/{self.client_org.id}/nda/",
            {"nda_document": self._pdf(), "nda_signed_date": future.isoformat()},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)
        self.client_org.refresh_from_db()
        self.assertFalse(self.client_org.nda_signed)

    def test_upload_rejects_unsupported_file_type(self):
        self.api.force_authenticate(user=self.coordinator)
        bad = SimpleUploadedFile("nda.exe", b"MZ", content_type="application/octet-stream")
        resp = self.api.post(
            f"/api/v1/clients/{self.client_org.id}/nda/",
            {"nda_document": bad, "nda_signed_date": timezone.localdate().isoformat()},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)

    def test_technician_cannot_upload_nda(self):
        self.api.force_authenticate(user=self.technician)
        resp = self.api.post(
            f"/api/v1/clients/{self.client_org.id}/nda/",
            {"nda_document": self._pdf(), "nda_signed_date": timezone.localdate().isoformat()},
            format="multipart",
        )
        self.assertIn(resp.status_code, (401, 403))
        self.client_org.refresh_from_db()
        self.assertFalse(self.client_org.nda_signed)


class NDASignerResolutionTests(TestCase):
    """Who appears as signer for the client on the NDA."""

    def _client(self, **overrides):
        defaults = dict(
            name="Hospital Firma", ruc="1790012345020",
            client_type=Client.ClientType.PRIVATE, address="Av. I",
            city="Quito", province="Pichincha",
        )
        defaults.update(overrides)
        return Client.objects.create(**defaults)

    def test_legal_representative_is_used_when_registered(self):
        client = self._client(
            legal_representative="Ana Ruiz", legal_representative_role="Gerente General"
        )
        self.assertEqual(
            client_signer(client), {"name": "Ana Ruiz", "position": "Gerente General"}
        )

    def test_legal_representative_defaults_role(self):
        client = self._client(ruc="1790012345021", legal_representative="Ana Ruiz")
        self.assertEqual(client_signer(client)["position"], "Representante Legal")

    def test_falls_back_to_signer_contact(self):
        client = self._client(ruc="1790012345022")
        ClientContact.objects.create(
            client=client, name="Luis Paz", position="Jefe de Compras",
            email="luis@hospital.test", is_signer=True,
        )
        self.assertEqual(
            client_signer(client), {"name": "Luis Paz", "position": "Jefe de Compras"}
        )

    def test_none_when_nothing_registered(self):
        self.assertIsNone(client_signer(self._client(ruc="1790012345023")))


class NDAEmailTaskTests(TestCase):
    """The task itself: renders the NDA and emails it to the right recipients."""

    def setUp(self):
        mail.outbox = []

    def _client(self, **overrides):
        defaults = dict(
            name="Hospital Nuevo", ruc="1790012345006",
            client_type=Client.ClientType.PRIVATE, address="Av. D",
            city="Quito", province="Pichincha",
            email="contacto@hospitalnuevo.test",
        )
        defaults.update(overrides)
        return Client.objects.create(**defaults)

    def test_sends_nda_with_pdf_attached(self):
        client = self._client()
        sent = send_nda_for_signature(str(client.id))
        self.assertEqual(sent, ["contacto@hospitalnuevo.test"])
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertIn("Acuerdo de Confidencialidad", message.subject)
        self.assertIn(client.name, message.subject)
        filename, content, mimetype = message.attachments[0]
        self.assertEqual(filename, "NDA-1790012345006.pdf")
        self.assertEqual(mimetype, "application/pdf")
        self.assertTrue(content.startswith(b"%PDF"))

    def test_skips_client_without_email(self):
        client = self._client(ruc="1790012345007", email="")
        self.assertIsNone(send_nda_for_signature(str(client.id)))
        self.assertEqual(len(mail.outbox), 0)

    def test_skips_client_that_already_signed(self):
        client = self._client(ruc="1790012345008", nda_signed=True)
        self.assertIsNone(send_nda_for_signature(str(client.id)))
        self.assertEqual(len(mail.outbox), 0)

    def test_signer_contact_preferred_over_institutional_email(self):
        client = self._client(ruc="1790012345009", email="general@hospital.test")
        ClientContact.objects.create(
            client=client, name="Ana Ruiz", position="Gerente",
            email="ana@hospital.test", is_signer=True,
        )
        send_nda_for_signature(str(client.id))
        self.assertEqual(mail.outbox[0].to, ["ana@hospital.test"])


class NDAAutoSendTests(TestCase):
    """Registering a client without a signed NDA queues the NDA email."""

    @classmethod
    def setUpTestData(cls):
        cls.coordinator = User.objects.create_user(
            username="coord-send", password="pw", role=User.Role.COORDINATOR
        )

    def setUp(self):
        self.api = APIClient()
        self.api.force_authenticate(user=self.coordinator)

    def _payload(self, **overrides):
        payload = dict(
            name="Hospital Nuevo", ruc="1790012345010",
            client_type=Client.ClientType.PRIVATE, address="Av. D",
            city="Quito", province="Pichincha",
            email="contacto@hospitalnuevo.test",
        )
        payload.update(overrides)
        return payload

    @patch("apps.clients.views.send_nda_for_signature.delay")
    def test_registration_queues_nda_email(self, delay):
        resp = self.api.post("/api/v1/clients/", self._payload(), format="json")
        self.assertEqual(resp.status_code, 201, resp.content[:300])
        delay.assert_called_once_with(resp.data["id"])

    @patch("apps.clients.views.send_nda_for_signature.delay")
    def test_no_email_when_registered_with_nda_signed(self, delay):
        resp = self.api.post(
            "/api/v1/clients/",
            self._payload(
                ruc="1790012345011",
                nda_signed=True,
                nda_signed_date=timezone.localdate().isoformat(),
            ),
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content[:300])
        delay.assert_not_called()

    @patch("apps.clients.views.send_nda_for_signature.delay")
    def test_resend_endpoint_queues_email(self, delay):
        client_org = Client.objects.create(
            name="Hospital Reenvio", ruc="1790012345012",
            client_type=Client.ClientType.PRIVATE, address="Av. E",
            city="Quito", province="Pichincha",
            email="reenvio@hospital.test",
        )
        resp = self.api.post(f"/api/v1/clients/{client_org.id}/nda/send/")
        self.assertEqual(resp.status_code, 200, resp.content[:300])
        self.assertIn("reenvio@hospital.test", resp.data["detail"])
        delay.assert_called_once_with(str(client_org.id))

    @patch("apps.clients.views.send_nda_for_signature.delay")
    def test_resend_rejected_when_already_signed(self, delay):
        client_org = Client.objects.create(
            name="Hospital Firmado", ruc="1790012345013",
            client_type=Client.ClientType.PRIVATE, address="Av. F",
            city="Quito", province="Pichincha",
            email="firmado@hospital.test", nda_signed=True,
        )
        resp = self.api.post(f"/api/v1/clients/{client_org.id}/nda/send/")
        self.assertEqual(resp.status_code, 400)
        delay.assert_not_called()

    @patch("apps.clients.views.send_nda_for_signature.delay")
    def test_resend_rejected_without_any_email(self, delay):
        client_org = Client.objects.create(
            name="Hospital Sin Correo", ruc="1790012345014",
            client_type=Client.ClientType.PRIVATE, address="Av. H",
            city="Quito", province="Pichincha", email="",
        )
        resp = self.api.post(f"/api/v1/clients/{client_org.id}/nda/send/")
        self.assertEqual(resp.status_code, 400)
        delay.assert_not_called()
