"""The writing assistant is mocked here — these tests cover the wiring and the
guardrails around it, not the model's output quality."""
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.work_orders.models import WorkOrder
from apps.work_orders.services.ai_writer import (
    WritingAssistantUnavailable,
    is_configured,
)
from apps.work_orders.tests import make_fixtures

DRAFT = {
    "diagnosis": "Se identificó el fusible de la fuente de alimentación en corto.",
    "work_performed": "Se reemplazó el fusible y se verificó el encendido del equipo.",
    "follow_up_notes": "Se recomienda revisar la instalación eléctrica del área.",
    "result": "RESOLVED",
    "omitted": [],
}

NOTES = "llegue y el equipo no prendia, revise la fuente y estaba quemado el fusible"


class AssistWritingEndpointTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_org, cls.equipment, cls.technician, cls.coordinator = make_fixtures()
        cls.ot = WorkOrder.objects.create(
            ot_type=WorkOrder.Type.CORRECTIVE,
            equipment=cls.equipment,
            client=cls.client_org,
            technician=cls.technician,
            status=WorkOrder.Status.IN_PROGRESS,
            reported_problem="El equipo no enciende.",
        )

    def setUp(self):
        self.api = APIClient()
        self.api.force_authenticate(user=self.technician)

    def _url(self, ot=None):
        return f"/api/v1/work-orders/{(ot or self.ot).id}/assist-writing/"

    @patch("apps.work_orders.views.draft_work_order_text", return_value=DRAFT)
    def test_returns_draft_without_touching_the_ot(self, drafter):
        resp = self.api.post(self._url(), {"notes": NOTES}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content[:300])
        self.assertEqual(resp.json(), DRAFT)
        # The proposal is not persisted — the technician reviews it first
        self.ot.refresh_from_db()
        self.assertEqual(self.ot.diagnosis, "")
        self.assertEqual(self.ot.work_performed, "")

    @patch("apps.work_orders.views.draft_work_order_text", return_value=DRAFT)
    def test_passes_the_notes_and_the_ot_to_the_assistant(self, drafter):
        self.api.post(self._url(), {"notes": NOTES}, format="json")
        work_order, notes = drafter.call_args.args
        self.assertEqual(work_order.id, self.ot.id)
        self.assertEqual(notes, NOTES)

    @patch("apps.work_orders.views.draft_work_order_text")
    def test_rejects_empty_or_trivial_notes(self, drafter):
        for notes in ("", "   ", "no prende"):
            resp = self.api.post(self._url(), {"notes": notes}, format="json")
            self.assertEqual(resp.status_code, 400, notes)
        drafter.assert_not_called()

    @patch("apps.work_orders.views.draft_work_order_text")
    def test_rejects_closed_work_order(self, drafter):
        closed = WorkOrder.objects.create(
            ot_type=WorkOrder.Type.CORRECTIVE, equipment=self.equipment,
            client=self.client_org, technician=self.technician,
            status=WorkOrder.Status.CLOSED,
        )
        resp = self.api.post(self._url(closed), {"notes": NOTES}, format="json")
        self.assertEqual(resp.status_code, 400)
        drafter.assert_not_called()

    @patch(
        "apps.work_orders.views.draft_work_order_text",
        side_effect=WritingAssistantUnavailable("El asistente no está configurado."),
    )
    def test_reports_unavailable_assistant_as_503(self, drafter):
        resp = self.api.post(self._url(), {"notes": NOTES}, format="json")
        self.assertEqual(resp.status_code, 503)
        self.assertIn("asistente", resp.json()["detail"].lower())

    def test_requires_authentication(self):
        self.api.force_authenticate(user=None)
        resp = self.api.post(self._url(), {"notes": NOTES}, format="json")
        self.assertIn(resp.status_code, (401, 403))


class AssistantConfigurationTests(TestCase):
    @override_settings(ANTHROPIC_API_KEY="")
    def test_not_configured_without_key(self):
        self.assertFalse(is_configured())

    @override_settings(ANTHROPIC_API_KEY="sk-ant-test")
    def test_configured_with_key(self):
        self.assertTrue(is_configured())

    @override_settings(ANTHROPIC_API_KEY="")
    def test_drafting_without_key_raises_rather_than_returning_empty(self):
        from apps.work_orders.services.ai_writer import draft_work_order_text

        with self.assertRaises(WritingAssistantUnavailable):
            draft_work_order_text(None, NOTES)


class TechnicianSignatureWindowTests(TestCase):
    """The technician can sign until the client's signature closes the document."""

    @classmethod
    def setUpTestData(cls):
        cls.client_org, cls.equipment, cls.technician, _ = make_fixtures()

    def setUp(self):
        self.api = APIClient()
        self.api.force_authenticate(user=self.technician)

    def _ot(self, status):
        return WorkOrder.objects.create(
            ot_type=WorkOrder.Type.CORRECTIVE, equipment=self.equipment,
            client=self.client_org, technician=self.technician, status=status,
        )

    def _sign(self, ot):
        # ImageField needs a file Pillow can actually open
        import io

        from PIL import Image

        buffer = io.BytesIO()
        Image.new("RGB", (2, 2), "white").save(buffer, format="PNG")
        png = SimpleUploadedFile(
            "firma.png", buffer.getvalue(), content_type="image/png"
        )
        return self.api.post(
            f"/api/v1/work-orders/{ot.id}/technician_sign/",
            {"technician_signature": png}, format="multipart",
        )

    def test_can_sign_while_in_progress(self):
        ot = self._ot(WorkOrder.Status.IN_PROGRESS)
        self.assertEqual(self._sign(ot).status_code, 200)
        ot.refresh_from_db()
        self.assertIsNotNone(ot.technician_signed_at)

    def test_can_still_sign_after_finishing_the_work(self):
        # The reason this test exists: finishing used to hide the button and
        # leave the OT with no way to add the technician's rubric.
        ot = self._ot(WorkOrder.Status.PENDING_SIGNATURE)
        self.assertEqual(self._sign(ot).status_code, 200, "sin firma tras finalizar")
        ot.refresh_from_db()
        self.assertIsNotNone(ot.technician_signed_at)

    def test_cannot_sign_once_the_client_signed(self):
        ot = self._ot(WorkOrder.Status.SIGNED)
        self.assertEqual(self._sign(ot).status_code, 400)
        ot.refresh_from_db()
        self.assertIsNone(ot.technician_signed_at)

    def test_cannot_sign_a_closed_work_order(self):
        ot = self._ot(WorkOrder.Status.CLOSED)
        self.assertEqual(self._sign(ot).status_code, 400)
        ot.refresh_from_db()
        self.assertIsNone(ot.technician_signed_at)
