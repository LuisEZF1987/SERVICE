import math
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.work_orders.models import WorkOrder
from apps.work_orders.tests import make_fixtures

from .methods import SECTIONS, evaluate_section, hvl_interpolated
from .models import QCReport
from .protocols import PROTOCOLS, initial_report_data
from .services.pdf import hvl_rows, radiation_rows, render_qc_report_html

FAKE_PDF = b"%PDF-1.4 fake"


class ProtocolTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_org, cls.equipment, cls.technician, _ = make_fixtures()
        cls.ot = WorkOrder.objects.create(
            ot_type=WorkOrder.Type.PREVENTIVE, equipment=cls.equipment, technician=cls.technician
        )

    def test_every_practice_builds_initial_data(self):
        for practice in PROTOCOLS:
            data = initial_report_data(self.ot, practice)
            self.assertEqual(len(data["tests"]), len(SECTIONS[practice]()), practice)
            self.assertTrue(all("columns" in s for s in data["tests"]), practice)
            self.assertEqual(data["equipment_data"]["serial"], self.equipment.serial_number)
            self.assertEqual(data["institution"]["ruc"], self.client_org.ruc)
            self.assertEqual(len(data["radiation_levels"]["rows"]), 10)

    def test_ct_report_has_no_ctdi_test(self):
        text = str(SECTIONS["CT"]())
        self.assertNotIn("CTDI", text)

    def test_only_mammography_has_phantom_score(self):
        for practice in PROTOCOLS:
            data = initial_report_data(self.ot, practice)
            self.assertEqual(bool(data["mammo_score"]), practice == "MAMMO")

    def test_hvl_percent_relative_to_d0(self):
        rows = hvl_rows({"rows": [{"thickness": "0.0", "dose": "200"}, {"thickness": "2.5", "dose": "100,0"}]})
        self.assertEqual(rows[0]["pct"], "100")
        self.assertEqual(rows[1]["pct"], "50")

    def test_radiation_net_subtracts_background(self):
        rows = radiation_rows({"rows": [{"measured": "0.45", "background": "0.15"}, {"measured": ""}]})
        self.assertEqual(rows[0]["net"], "0.3")
        self.assertEqual(rows[1]["net"], "")

    def test_radiation_uses_maximum_of_three_readings(self):
        rows = radiation_rows({"rows": [{"r1": "0.30", "r2": "0,45", "r3": "0.40", "background": "0.15"}]})
        self.assertEqual((rows[0]["max"], rows[0]["net"]), ("0.45", "0.3"))

    def test_exactitude_mean_and_deviation(self):
        section = SECTIONS["RX"]()[0]
        section["rows"][0]["v"].update({"r1": "61", "r2": "62", "r3": "63"})
        cells = [c["value"] for c in evaluate_section(section)[0]["cells"]]
        self.assertEqual(cells, ["60", "61", "62", "63", "62", "3.3"])

    def test_reproducibility_cv(self):
        section = SECTIONS["RX"]()[1]
        section["rows"][0]["v"].update({f"r{i}": v for i, v in enumerate(["80", "81", "79", "80", "80"], 1)})
        cells = {c["key"]: cell["value"] for c, cell in zip(section["columns"], evaluate_section(section)[0]["cells"], strict=True)}
        self.assertEqual((cells["avg"], cells["sd"], cells["cv"]), ("80", "0.707", "0.88"))

    def test_linearity_coefficient_between_consecutive_rows(self):
        section = SECTIONS["RX"]()[4]
        for row, dose in zip(section["rows"], ("100", "210", "400"), strict=True):
            row["v"].update({"d1": dose, "d2": dose, "d3": dose})
        rows = evaluate_section(section)
        cl = [r["cells"][-1]["value"] for r in rows]
        self.assertEqual(cl, ["0.024", "0.024", ""])

    def test_leakage_rate_normalised_to_continuous_load(self):
        section = next(s for s in SECTIONS["RX"]() if s["kind"] == "fuga")
        section["params"] = [{"key": "q", "value": "100"}, {"key": "i", "value": "3"}]
        section["rows"][0]["v"].update({"d1": "0.002", "d2": "0.002", "d3": "0.002"})
        self.assertEqual(evaluate_section(section)[0]["cells"][-1]["value"], "0.216")

    def test_aec_deviation_against_4_cm(self):
        section = next(s for s in SECTIONS["MAMMO"]() if s["kind"] == "aec")
        for row, val in zip(section["rows"], ("440", "400", "380"), strict=True):
            row["v"]["val"] = val
        devs = [r["cells"][-1]["value"] for r in evaluate_section(section)]
        self.assertEqual(devs, ["10", "", "-5"])

    def test_hvl_log_interpolation(self):
        rows = [{"thickness": "0", "dose": "100"}, {"thickness": "2.5", "dose": "55"}, {"thickness": "3.0", "dose": "45"}]
        self.assertAlmostEqual(hvl_interpolated(rows), 2.5 + 0.5 * math.log(1.1) / math.log(55 / 45), 6)


@override_settings(MEDIA_ROOT="/tmp/test-media-qc")
class QCReportApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_org, cls.equipment, cls.technician, cls.coordinator = make_fixtures()
        cls.other_tech = User.objects.create_user(
            username="tecnico2", password="pw", role=User.Role.TECHNICIAN
        )
        cls.ot = WorkOrder.objects.create(
            ot_type=WorkOrder.Type.PREVENTIVE, equipment=cls.equipment, technician=cls.technician
        )

    def setUp(self):
        self.api = APIClient()
        self.api.force_authenticate(self.technician)

    def _create(self, practice="RX"):
        res = self.api.post("/api/v1/qc-reports/", {"work_order": str(self.ot.id), "practice": practice}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def test_create_initializes_report_from_protocol(self):
        data = self._create("MAMMO")
        self.assertTrue(data["number"].startswith("DIMED-IM-"))
        self.assertEqual(data["format_code"], "9.1.2")
        self.assertEqual(data["service_type"], "PREVENTIVE")
        self.assertEqual(len(data["tests"]), len(SECTIONS["MAMMO"]()))
        self.assertEqual(data["status"], "DRAFT")

    def test_other_technician_cannot_create_or_see(self):
        self._create()
        self.api.force_authenticate(self.other_tech)
        res = self.api.post("/api/v1/qc-reports/", {"work_order": str(self.ot.id), "practice": "RX"}, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(self.api.get("/api/v1/qc-reports/").data["count"], 0)

    def test_update_measurements(self):
        data = self._create()
        tests = data["tests"]
        tests[0]["rows"][0]["v"].update({"r1": "60.8", "r2": "61.0", "r3": "60.9"})
        tests[0]["rows"][0]["result"] = "PASS"
        res = self.api.patch(f"/api/v1/qc-reports/{data['id']}/", {"tests": tests}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(QCReport.objects.get(pk=data["id"]).tests[0]["rows"][0]["v"]["r1"], "60.8")

    def test_rejects_malformed_json_sections(self):
        data = self._create()
        res = self.api.patch(f"/api/v1/qc-reports/{data['id']}/", {"tests": {"a": 1}}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_generate_requires_overall_result(self):
        data = self._create()
        res = self.api.post(f"/api/v1/qc-reports/{data['id']}/generate-pdf/")
        self.assertEqual(res.status_code, 400)

    @patch("apps.qc_reports.views.render_qc_report_pdf", return_value=FAKE_PDF)
    def test_full_flow_generate_sign_lock(self, _render):
        data = self._create()
        self.api.patch(f"/api/v1/qc-reports/{data['id']}/", {"overall_result": "PASS"}, format="json")

        res = self.api.post(f"/api/v1/qc-reports/{data['id']}/generate-pdf/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "ISSUED")
        self.assertTrue(res.data["pdf_document"])

        signed = SimpleUploadedFile("firmado.pdf", FAKE_PDF, content_type="application/pdf")
        res = self.api.post(f"/api/v1/qc-reports/{data['id']}/upload-signed/", {"signed_document": signed}, format="multipart")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "SIGNED")

        res = self.api.patch(f"/api/v1/qc-reports/{data['id']}/", {"observations": "x"}, format="json")
        self.assertEqual(res.status_code, 403)

    @patch("apps.qc_reports.views.render_qc_report_pdf", return_value=FAKE_PDF)
    def test_editing_an_issued_report_returns_it_to_draft(self, _render):
        data = self._create()
        self.api.patch(f"/api/v1/qc-reports/{data['id']}/", {"overall_result": "PASS"}, format="json")
        self.api.post(f"/api/v1/qc-reports/{data['id']}/generate-pdf/")
        res = self.api.patch(f"/api/v1/qc-reports/{data['id']}/", {"observations": "Corrección"}, format="json")
        self.assertEqual(res.data["status"], "DRAFT")

    def test_upload_signed_requires_issued_pdf(self):
        data = self._create()
        signed = SimpleUploadedFile("firmado.pdf", FAKE_PDF, content_type="application/pdf")
        res = self.api.post(f"/api/v1/qc-reports/{data['id']}/upload-signed/", {"signed_document": signed}, format="multipart")
        self.assertEqual(res.status_code, 400)

    def test_photo_slot_must_belong_to_practice(self):
        data = self._create("CT")
        img = SimpleUploadedFile("p.gif", b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;", content_type="image/gif")
        res = self.api.post(f"/api/v1/qc-reports/{data['id']}/photos/", {"slot": "LIGHT_FIELD", "image": img}, format="multipart")
        self.assertEqual(res.status_code, 400)

    def test_practices_catalogue(self):
        res = self.api.get("/api/v1/qc-reports/practices/")
        self.assertEqual([p["value"] for p in res.data], list(PROTOCOLS))

    def test_html_renders_for_every_practice(self):
        for practice in PROTOCOLS:
            report = QCReport.objects.create(
                work_order=self.ot, practice=practice, **initial_report_data(self.ot, practice)
            )
            html = render_qc_report_html(report)
            self.assertIn(report.number, html)
            self.assertNotIn("Representante del Cliente", html)
            self.assertIn("Método y cálculo", html)
            self.assertNotIn("Medición 1", html)

    def test_report_created_before_rev8_keeps_its_layout(self):
        report = QCReport.objects.create(
            work_order=self.ot, practice="RX",
            tests=[{"label": "Exactitud de kVp a 60 kVp", "tolerance": "±5%", "m1": "60.4", "m2": "", "m3": "", "result": "PASS"}],
            radiation_levels={"rows": [{"point": "Consola", "measured": "0.2", "background": "0.1", "reference": "10"}]},
        )
        html = render_qc_report_html(report)
        self.assertIn("Medición 1", html)
        self.assertIn("60.4", html)


class QCReportDeleteAndDashboardTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.client_org, cls.equipment, cls.technician, cls.coordinator = make_fixtures()
        cls.admin = User.objects.create_user(username="admin1", password="pw", role=User.Role.ADMIN)
        cls.superuser = User.objects.create_user(
            username="root", password="pw", role=User.Role.ADMIN, is_superuser=True, is_staff=True
        )
        cls.ot = WorkOrder.objects.create(
            ot_type=WorkOrder.Type.PREVENTIVE, equipment=cls.equipment, technician=cls.technician
        )

    def setUp(self):
        self.api = APIClient()

    def _report(self, **kw):
        return QCReport.objects.create(work_order=self.ot, practice="RX", **kw)

    def test_only_admin_deletes(self):
        report = self._report()
        self.api.force_authenticate(self.coordinator)
        self.assertEqual(self.api.delete(f"/api/v1/qc-reports/{report.id}/").status_code, 403)
        self.api.force_authenticate(self.admin)
        self.assertEqual(self.api.delete(f"/api/v1/qc-reports/{report.id}/").status_code, 204)
        self.assertFalse(QCReport.objects.filter(pk=report.pk).exists())

    def test_signed_report_cannot_be_deleted(self):
        report = self._report(status=QCReport.Status.SIGNED)
        self.api.force_authenticate(self.admin)
        self.assertEqual(self.api.delete(f"/api/v1/qc-reports/{report.id}/").status_code, 403)

    def test_me_exposes_superuser_flag(self):
        self.api.force_authenticate(self.superuser)
        self.assertTrue(self.api.get("/api/v1/auth/me/").data["is_superuser"])

    def test_list_includes_client_and_ot_summary(self):
        self._report()
        self._report(status=QCReport.Status.SIGNED)
        self.api.force_authenticate(self.coordinator)
        row = self.api.get("/api/v1/qc-reports/").data["results"][0]
        self.assertEqual(row["client_name"], self.client_org.name)
        ot_row = self.api.get("/api/v1/work-orders/").data["results"][0]
        self.assertEqual(ot_row["qc_reports_summary"], {"total": 2, "signed": 1})

    def test_dashboard_counts_pending_reports(self):
        self._report()
        self._report(status=QCReport.Status.ISSUED)
        self.api.force_authenticate(self.coordinator)
        data = self.api.get("/api/v1/dashboard/stats/").data
        self.assertEqual((data["qc_draft"], data["qc_pending_signature"]), (1, 1))
        self.assertIn("instruments_expired", data)
