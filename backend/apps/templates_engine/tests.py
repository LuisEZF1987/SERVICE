import tempfile
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.clients.models import Client
from apps.equipment.catalog_models import EquipmentSeries
from apps.templates_engine.models import TechnicalManual


class TechnicalManualApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.coordinator = User.objects.create_user(
            username="coord-man", password="pw", role=User.Role.COORDINATOR
        )
        cls.technician = User.objects.create_user(
            username="tec-man", password="pw", role=User.Role.TECHNICIAN
        )
        client_org = Client.objects.create(
            name="Hospital Manuales",
            ruc="1790012345040",
            client_type=Client.ClientType.PUBLIC,
            address="X",
            city="Quito",
            province="Pichincha",
            nda_signed=True,
            status=Client.Status.ACTIVE,
        )
        cls.portal_user = User.objects.create_user(
            username="portal-man", password="pw", role=User.Role.CLIENT,
            company_type=User.CompanyType.CLIENT, client_organization=client_org,
        )

    def setUp(self):
        self.api = APIClient()

    def _upload(self):
        file = SimpleUploadedFile(
            "manual-servicio.html",
            b"<html><body>Manual de servicio</body></html>",
            content_type="text/html",
        )
        return self.api.post(
            "/api/v1/templates/manuals/",
            {
                "document_type": "SERVICE_MANUAL",
                "brand": "Allengers",
                "modality": "FLUOROSCOPE",
                "model_name": "HF 59R",
                "file": file,
            },
            format="multipart",
        )

    def test_coordinator_can_upload_manual(self):
        self.api.force_authenticate(user=self.coordinator)
        resp = self._upload()
        self.assertEqual(resp.status_code, 201, resp.content)
        # Title auto-generated from brand + model
        self.assertEqual(resp.json()["title"], "Allengers HF 59R")

    def test_technician_can_browse_but_not_upload(self):
        self.api.force_authenticate(user=self.coordinator)
        self._upload()

        self.api.force_authenticate(user=self.technician)
        resp = self.api.get("/api/v1/templates/manuals/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["count"], 1)

        resp = self._upload()
        self.assertEqual(resp.status_code, 403)

    def test_client_portal_has_no_access(self):
        self.api.force_authenticate(user=self.portal_user)
        resp = self.api.get("/api/v1/templates/manuals/")
        self.assertEqual(resp.status_code, 403)

    def test_import_manuals_command(self):
        """Bulk import maps folder structure to catalog + document types."""
        with tempfile.TemporaryDirectory() as tmp_media, tempfile.TemporaryDirectory() as tmp_root:
            root = Path(tmp_root)
            # Model with variants (Digiscan) + doc-type folders
            svc = root / "HF59R - Digiscan" / "S20 - 6KW" / "2Service Manual"
            svc.mkdir(parents=True)
            (svc / "Manual-Servicio-DIGISCAN-S20-EMBEBIDO.html").write_text("<html/>")
            pre = root / "HF59R - Digiscan" / "S20 - 6KW" / "1Pre-Instalacion"
            pre.mkdir(parents=True)
            (pre / "Formulario-PreInstalacion-DIGISCAN-S20-EMBEBIDO.html").write_text("<html/>")
            # Single-variant model
            ds = root / "MARS32DR - MobilXDR" / "6Datasheet"
            ds.mkdir(parents=True)
            (ds / "Datasheet-MARS32DR-EMBEBIDO.html").write_text("<html/>")

            with override_settings(MEDIA_ROOT=tmp_media):
                call_command("import_manuals", root=str(root), brand="Allengers")
                self.assertEqual(TechnicalManual.objects.count(), 3)
                self.assertTrue(
                    TechnicalManual.objects.filter(
                        document_type="PRE_INSTALL_FORM", model_name="HF59R Digiscan"
                    ).exists()
                )
                self.assertTrue(
                    EquipmentSeries.objects.filter(name__iexact="Digiscan S20").exists()
                    or EquipmentSeries.objects.filter(name="Digiscan S-20").exists()
                )
                # Idempotent: re-running creates nothing new
                call_command("import_manuals", root=str(root), brand="Allengers")
                self.assertEqual(TechnicalManual.objects.count(), 3)

    def test_filter_by_document_type(self):
        self.api.force_authenticate(user=self.coordinator)
        self._upload()
        TechnicalManual.objects.create(
            brand="Allengers", modality="FLUOROSCOPE", model_name="HF 59R",
            document_type="DATASHEET",
            file=SimpleUploadedFile("ds.pdf", b"%PDF-1.4 test"),
        )
        resp = self.api.get("/api/v1/templates/manuals/?document_type=DATASHEET")
        self.assertEqual(resp.json()["count"], 1)
