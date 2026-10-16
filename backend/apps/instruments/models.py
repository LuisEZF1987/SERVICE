from calendar import monthrange
from datetime import date

from django.db import models
from django.utils import timezone

from common.models import BaseModel

# Days before the due date when the calibration alert is emailed. The first
# one (90 days) gives time to send the instrument to an accredited lab.
ALERT_MILESTONES = [90, 30, 7]
DUE_SOON_DAYS = ALERT_MILESTONES[0]


def add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year, month = d.year + month_index // 12, month_index % 12 + 1
    return date(year, month, min(d.day, monthrange(year, month)[1]))


class MeasuringInstrument(BaseModel):
    """Measuring instrument / test tool owned by Dimed (section 7.2 of the
    Radiological Safety Manual). Instruments that require calibration are
    watched daily and staff are emailed before the certificate expires."""

    class InstrumentType(models.TextChoices):
        DOSIMETER = "DOSIMETER", "Multímetro dosimétrico / kVp"
        ION_CHAMBER = "ION_CHAMBER", "Cámara de ionización"
        SURVEY_METER = "SURVEY_METER", "Detector de radiación"
        CURRENT_PROBE = "CURRENT_PROBE", "Sensor de corriente / mAs"
        ELECTRICAL = "ELECTRICAL", "Instrumento eléctrico"
        QA_TOOL = "QA_TOOL", "Herramienta de control de calidad"
        PHANTOM = "PHANTOM", "Fantoma"
        PERSONAL_DOSIMETER = "PERSONAL_DOSIMETER", "Dosímetro personal"
        OTHER = "OTHER", "Otro"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "En uso"
        AT_LAB = "AT_LAB", "En calibración"
        IN_REPAIR = "IN_REPAIR", "En reparación"
        RETIRED = "RETIRED", "Dado de baja"

    class CalibrationStatus(models.TextChoices):
        NOT_REQUIRED = "NOT_REQUIRED", "No requiere calibración"
        NO_RECORD = "NO_RECORD", "Sin calibración registrada"
        VALID = "VALID", "Vigente"
        DUE_SOON = "DUE_SOON", "Por vencer"
        EXPIRED = "EXPIRED", "Vencida"

    name = models.CharField("Instrumento", max_length=200)
    instrument_type = models.CharField(
        "Tipo", max_length=20, choices=InstrumentType.choices, default=InstrumentType.OTHER
    )
    brand = models.CharField("Marca", max_length=100)
    model_name = models.CharField("Modelo", max_length=100)
    serial_number = models.CharField("Número de serie", max_length=100, unique=True)
    status = models.CharField("Estado", max_length=15, choices=Status.choices, default=Status.ACTIVE)
    assigned_to = models.CharField("Ubicación / asignado a", max_length=200, blank=True)
    notes = models.TextField("Observaciones", blank=True)

    requires_calibration = models.BooleanField("Requiere calibración", default=True)
    calibration_interval_months = models.PositiveSmallIntegerField(
        "Intervalo de calibración (meses)", default=12
    )
    # Denormalized from the latest calibration so the daily alert job and the
    # list filters query a single column.
    last_calibration_date = models.DateField("Última calibración", null=True, blank=True)
    calibration_due_date = models.DateField("Vencimiento de la calibración", null=True, blank=True)
    alerts_sent = models.JSONField(
        "Hitos de alerta enviados para el vencimiento actual", default=list, blank=True
    )

    class Meta:
        verbose_name = "Instrumento de medición"
        verbose_name_plural = "Instrumentos de medición"
        ordering = ["calibration_due_date", "name"]

    def __str__(self):
        return f"{self.name} — {self.brand} {self.model_name} (S/N {self.serial_number})"

    @property
    def days_to_due(self):
        if not self.calibration_due_date:
            return None
        return (self.calibration_due_date - timezone.localdate()).days

    @property
    def calibration_status(self):
        if not self.requires_calibration:
            return self.CalibrationStatus.NOT_REQUIRED
        days = self.days_to_due
        if days is None:
            return self.CalibrationStatus.NO_RECORD
        if days < 0:
            return self.CalibrationStatus.EXPIRED
        if days <= DUE_SOON_DAYS:
            return self.CalibrationStatus.DUE_SOON
        return self.CalibrationStatus.VALID

    def refresh_from_calibrations(self):
        """Point the current due date at the latest approved calibration and reset alerts.

        A rejected certificate does not make the instrument usable, so it
        never extends the due date.
        """
        latest = (
            self.calibrations.filter(result=InstrumentCalibration.Result.APPROVED)
            .order_by("-calibration_date", "-created_at")
            .first()
        )
        new_due = latest.due_date if latest else None
        if new_due != self.calibration_due_date:
            self.alerts_sent = []
        self.last_calibration_date = latest.calibration_date if latest else None
        self.calibration_due_date = new_due
        self.save(update_fields=["last_calibration_date", "calibration_due_date", "alerts_sent", "updated_at"])


class InstrumentCalibration(BaseModel):
    """One calibration certificate (Formato 9.12 — registro de calibración)."""

    class Result(models.TextChoices):
        APPROVED = "APPROVED", "Aprobado"
        REJECTED = "REJECTED", "Rechazado"

    instrument = models.ForeignKey(
        MeasuringInstrument, on_delete=models.CASCADE, related_name="calibrations",
        verbose_name="Instrumento",
    )
    calibration_date = models.DateField("Fecha de calibración")
    due_date = models.DateField("Próxima calibración", blank=True)
    laboratory = models.CharField("Laboratorio calibrador", max_length=200, blank=True)
    certificate_number = models.CharField("Nro. de certificado", max_length=100, blank=True)
    certificate_file = models.FileField(
        "Certificado (PDF)", upload_to="instruments/certificates/", blank=True
    )
    result = models.CharField("Resultado", max_length=10, choices=Result.choices, default=Result.APPROVED)
    notes = models.TextField("Observaciones", blank=True)

    class Meta:
        verbose_name = "Calibración"
        verbose_name_plural = "Calibraciones"
        ordering = ["-calibration_date", "-created_at"]

    def __str__(self):
        return f"{self.instrument.serial_number} — {self.calibration_date:%d/%m/%Y}"

    def save(self, *args, **kwargs):
        if not self.due_date:
            self.due_date = add_months(self.calibration_date, self.instrument.calibration_interval_months)
        super().save(*args, **kwargs)
        self.instrument.refresh_from_calibrations()

    def delete(self, *args, **kwargs):
        instrument = self.instrument
        result = super().delete(*args, **kwargs)
        instrument.refresh_from_calibrations()
        return result
