from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.clients.models import Client
from apps.equipment.models import Equipment
from apps.work_orders.models import WorkOrder


def make_fixtures():
    client = Client.objects.create(
        name="Hospital Reportes",
        ruc="1790012345030",
        client_type=Client.ClientType.PUBLIC,
        address="Av. Siempre Viva",
        city="Quito",
        province="Pichincha",
        nda_signed=True,
        status=Client.Status.ACTIVE,
    )
    equipment = Equipment.objects.create(
        internal_code="DIM-TEST-030",
        serial_number="SN-TEST-030",
        modality=Equipment.Modality.MAMMOGRAPH,
        brand="ACME",
        model_name="M1",
        client=client,
        city="Quito",
        province="Pichincha",
    )
    technician = User.objects.create_user(
        username="tec-rep", password="pw", role=User.Role.TECHNICIAN
    )
    coordinator = User.objects.create_user(
        username="coord-rep", password="pw", role=User.Role.COORDINATOR
    )
    signed_ot = WorkOrder.objects.create(
        ot_type=WorkOrder.Type.PREVENTIVE,
        equipment=equipment,
        client=client,
        technician=technician,
        status=WorkOrder.Status.SIGNED,
        result=WorkOrder.Result.RESOLVED,
        client_signature="work_orders/signatures/test.png",
        client_signer_name="Lic. Prueba",
        client_signer_position="Administrador",
        signed_at=timezone.now(),
        finished_at=timezone.now(),
    )
    return client, equipment, technician, coordinator, signed_ot


class ReportsApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        (cls.client_org, cls.equipment, cls.technician,
         cls.coordinator, cls.signed_ot) = make_fixtures()

    def setUp(self):
        self.api = APIClient()

    def test_maintenance_certificate_returns_pdf(self):
        self.api.force_authenticate(user=self.coordinator)
        resp = self.api.get(
            f"/api/v1/reports/maintenance-certificate/{self.signed_ot.id}/"
        )
        self.assertEqual(resp.status_code, 200, getattr(resp, "content", b"")[:300])
        self.assertEqual(resp["Content-Type"], "application/pdf")
        self.assertTrue(resp.content.startswith(b"%PDF"))

    def test_certificate_rejected_for_unsigned_ot(self):
        open_ot = WorkOrder.objects.create(
            ot_type=WorkOrder.Type.CORRECTIVE,
            equipment=self.equipment,
            client=self.client_org,
            technician=self.technician,
        )
        self.api.force_authenticate(user=self.coordinator)
        resp = self.api.get(f"/api/v1/reports/maintenance-certificate/{open_ot.id}/")
        self.assertEqual(resp.status_code, 400)

    def test_equipment_history_returns_pdf(self):
        self.api.force_authenticate(user=self.coordinator)
        resp = self.api.get(f"/api/v1/reports/equipment-history/{self.equipment.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "application/pdf")
        self.assertTrue(resp.content.startswith(b"%PDF"))

    def test_client_portal_cannot_access_other_org_reports(self):
        other_client = Client.objects.create(
            name="Otra Institución",
            ruc="1790012345031",
            client_type=Client.ClientType.PRIVATE,
            address="X",
            city="Quito",
            province="Pichincha",
            nda_signed=True,
            status=Client.Status.ACTIVE,
        )
        portal_user = User.objects.create_user(
            username="portal-rep", password="pw", role=User.Role.CLIENT,
            company_type=User.CompanyType.CLIENT, client_organization=other_client,
        )
        self.api.force_authenticate(user=portal_user)
        resp = self.api.get(f"/api/v1/reports/equipment-history/{self.equipment.id}/")
        self.assertEqual(resp.status_code, 403)
