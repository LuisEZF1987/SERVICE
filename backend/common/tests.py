from datetime import date

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase

from apps.instruments.models import InstrumentCalibration, MeasuringInstrument
from apps.instruments.serializers import InstrumentCalibrationSerializer


class RelativeFileUrlTests(TestCase):
    def test_file_urls_are_site_relative(self):
        inst = MeasuringInstrument.objects.create(name="x", brand="x", model_name="x", serial_number="s1")
        cal = InstrumentCalibration.objects.create(
            instrument=inst, calibration_date=date(2026, 1, 1),
            certificate_file=SimpleUploadedFile("cert.pdf", b"%PDF-1.4"),
        )
        request = RequestFactory().get("/", HTTP_HOST="server01.tailf6dbbc.ts.net")
        data = InstrumentCalibrationSerializer(cal, context={"request": request}).data
        self.assertTrue(data["certificate_file"].startswith("/media/instruments/certificates/"))
        cal.certificate_file.delete(save=False)
