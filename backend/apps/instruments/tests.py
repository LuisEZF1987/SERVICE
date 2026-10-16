from datetime import date, timedelta
from unittest.mock import patch

from django.core import mail
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User

from .models import InstrumentCalibration, MeasuringInstrument, add_months
from .tasks import process_calibration_alerts


def make_instrument(**kw):
    defaults = dict(name="Multímetro dosimétrico", brand="RTI", model_name="Piranha 657",
                    serial_number="CB2-06030020")
    defaults.update(kw)
    return MeasuringInstrument.objects.create(**defaults)


class CalibrationModelTests(TestCase):
    def test_add_months_clamps_end_of_month(self):
        self.assertEqual(add_months(date(2026, 1, 31), 1), date(2026, 2, 28))
        self.assertEqual(add_months(date(2026, 10, 16), 12), date(2027, 10, 16))

    def test_due_date_defaults_to_interval_and_updates_instrument(self):
        inst = make_instrument(calibration_interval_months=12)
        InstrumentCalibration.objects.create(instrument=inst, calibration_date=date(2026, 3, 1))
        inst.refresh_from_db()
        self.assertEqual(inst.calibration_due_date, date(2027, 3, 1))
        self.assertEqual(inst.last_calibration_date, date(2026, 3, 1))

    def test_rejected_calibration_does_not_extend_due_date(self):
        inst = make_instrument()
        InstrumentCalibration.objects.create(instrument=inst, calibration_date=date(2026, 1, 1))
        InstrumentCalibration.objects.create(
            instrument=inst, calibration_date=date(2026, 6, 1),
            result=InstrumentCalibration.Result.REJECTED,
        )
        inst.refresh_from_db()
        self.assertEqual(inst.calibration_due_date, date(2027, 1, 1))

    def test_status(self):
        today = timezone.localdate()
        self.assertEqual(make_instrument(serial_number="a").calibration_status, "NO_RECORD")
        self.assertEqual(make_instrument(serial_number="b", requires_calibration=False).calibration_status, "NOT_REQUIRED")
        self.assertEqual(make_instrument(serial_number="c", calibration_due_date=today - timedelta(days=1)).calibration_status, "EXPIRED")
        self.assertEqual(make_instrument(serial_number="d", calibration_due_date=today + timedelta(days=90)).calibration_status, "DUE_SOON")
        self.assertEqual(make_instrument(serial_number="e", calibration_due_date=today + timedelta(days=91)).calibration_status, "VALID")


@patch("apps.instruments.tasks.timezone.localdate")
class CalibrationAlertTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User.objects.create_user(username="rsr", password="pw", role=User.Role.ADMIN, email="rsr@dimed.test")
        User.objects.create_user(username="tec", password="pw", role=User.Role.TECHNICIAN, email="tec@dimed.test")

    def _inst(self, today, days, **kw):
        return make_instrument(calibration_due_date=today + timedelta(days=days), **kw)

    def test_first_alert_three_months_before(self, localdate):
        today = date(2026, 10, 16)
        localdate.return_value = today
        self._inst(today, 91)
        process_calibration_alerts()
        self.assertEqual(len(mail.outbox), 0)

        localdate.return_value = today + timedelta(days=1)  # 90 days left
        process_calibration_alerts()
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("vence en 90 día(s)", mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ["rsr@dimed.test"])

    def test_each_milestone_is_sent_once(self, localdate):
        today = date(2026, 10, 16)
        inst = self._inst(today, 60)
        for offset in range(0, 70):
            localdate.return_value = today + timedelta(days=offset)
            process_calibration_alerts()
        # 90-day notice (at 60 left), 30, 7 and the expiry notice.
        self.assertEqual(len(mail.outbox), 4)
        self.assertIn("VENCIDA", mail.outbox[-1].subject)
        inst.refresh_from_db()
        self.assertEqual(inst.alerts_sent, [0, 7, 30, 90])

    def test_new_calibration_resets_alerts(self, localdate):
        today = date(2026, 10, 16)
        localdate.return_value = today
        inst = self._inst(today, 10)
        process_calibration_alerts()
        InstrumentCalibration.objects.create(instrument=inst, calibration_date=today)
        inst.refresh_from_db()
        self.assertEqual(inst.alerts_sent, [])

    def test_retired_and_not_required_are_ignored(self, localdate):
        today = date(2026, 10, 16)
        localdate.return_value = today
        self._inst(today, 5, serial_number="x", status=MeasuringInstrument.Status.RETIRED)
        self._inst(today, 5, serial_number="y", requires_calibration=False)
        process_calibration_alerts()
        self.assertEqual(len(mail.outbox), 0)


class InstrumentApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.coord = User.objects.create_user(username="coord", password="pw", role=User.Role.COORDINATOR)
        cls.tech = User.objects.create_user(username="tec", password="pw", role=User.Role.TECHNICIAN)

    def setUp(self):
        self.api = APIClient()

    def test_coordinator_registers_instrument_and_calibration(self):
        self.api.force_authenticate(self.coord)
        res = self.api.post("/api/v1/instruments/", {
            "name": "Cámara de ionización", "brand": "Radcal", "model_name": "10X6-1800",
            "serial_number": "R-1", "instrument_type": "ION_CHAMBER",
        }, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        inst_id = res.data["id"]
        res = self.api.post(f"/api/v1/instruments/{inst_id}/calibrations/", {
            "calibration_date": "2026-05-10", "laboratory": "Lab acreditado", "certificate_number": "C-77",
        }, format="multipart")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["due_date"], "2027-05-10")
        res = self.api.get(f"/api/v1/instruments/{inst_id}/")
        self.assertEqual(res.data["latest_calibration"]["certificate_number"], "C-77")

    def test_technician_reads_but_cannot_edit(self):
        make_instrument()
        self.api.force_authenticate(self.tech)
        self.assertEqual(self.api.get("/api/v1/instruments/").status_code, 200)
        res = self.api.post("/api/v1/instruments/", {"name": "x", "brand": "x", "model_name": "x", "serial_number": "z"}, format="json")
        self.assertEqual(res.status_code, 403)

    def test_only_admin_deletes_instruments(self):
        inst = make_instrument()
        self.api.force_authenticate(self.coord)
        self.assertEqual(self.api.delete(f"/api/v1/instruments/{inst.id}/").status_code, 403)
        admin = User.objects.create_user(username="adm", password="pw", role=User.Role.ADMIN)
        self.api.force_authenticate(admin)
        self.assertEqual(self.api.delete(f"/api/v1/instruments/{inst.id}/").status_code, 204)

    def test_filter_by_calibration_state(self):
        today = timezone.localdate()
        make_instrument(serial_number="exp", calibration_due_date=today - timedelta(days=3))
        make_instrument(serial_number="soon", calibration_due_date=today + timedelta(days=40))
        make_instrument(serial_number="ok", calibration_due_date=today + timedelta(days=300))
        self.api.force_authenticate(self.coord)
        serials = lambda q: [i["serial_number"] for i in self.api.get(f"/api/v1/instruments/?calibration={q}").data["results"]]
        self.assertEqual(serials("expired"), ["exp"])
        self.assertEqual(serials("due_soon"), ["soon"])
        self.assertEqual(serials("valid"), ["ok"])
