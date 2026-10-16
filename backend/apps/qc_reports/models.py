from django.db import models
from django.utils import timezone

from common.models import BaseModel

from .protocols import PRACTICE_CHOICES


class QCReport(BaseModel):
    """
    Maintenance and quality-control report (formats 9.1.1–9.1.6 of the
    Radiological Safety Manual) for one X-ray unit serviced under an OT.

    Unlike the OT, the regulator requires this report to carry ONLY the
    signature of the technician responsible for the maintenance. The client's
    acceptance of the equipment is recorded on the OT itself.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Borrador"
        ISSUED = "ISSUED", "Emitido — pendiente de firma del técnico"
        SIGNED = "SIGNED", "Firmado por el técnico"

    class ServiceType(models.TextChoices):
        INSTALLATION = "INSTALLATION", "Instalación"
        COMMISSIONING = "COMMISSIONING", "Puesta en marcha"
        PREVENTIVE = "PREVENTIVE", "Mantenimiento preventivo"
        CORRECTIVE = "CORRECTIVE", "Mantenimiento correctivo"

    class OverallResult(models.TextChoices):
        PASS = "PASS", "Cumple (aprobado)"
        PASS_WITH_OBSERVATIONS = "PASS_WITH_OBSERVATIONS", "Cumple con observaciones"
        FAIL = "FAIL", "No cumple (no aprobado)"

    number = models.CharField("Número de informe", max_length=25, unique=True, editable=False)
    work_order = models.ForeignKey(
        "work_orders.WorkOrder",
        on_delete=models.PROTECT,
        related_name="qc_reports",
        verbose_name="Orden de trabajo",
    )
    practice = models.CharField("Práctica", max_length=10, choices=PRACTICE_CHOICES)
    status = models.CharField("Estado", max_length=10, choices=Status.choices, default=Status.DRAFT)
    service_type = models.CharField(
        "Tipo de servicio", max_length=15, choices=ServiceType.choices, blank=True
    )

    # Snapshots taken when the report is created and editable by the
    # technician, so an issued report never changes when the client or the
    # equipment record is edited later.
    institution = models.JSONField("Institución usuaria", default=dict, blank=True)
    practice_info = models.JSONField("Práctica y técnica", default=dict, blank=True)
    equipment_data = models.JSONField("Datos del equipo", default=dict, blank=True)
    tube_data = models.JSONField("Datos del tubo", default=dict, blank=True)
    instruments = models.JSONField("Instrumentos utilizados", default=list, blank=True)
    tests = models.JSONField("Resultados de las pruebas", default=list, blank=True)
    hvl = models.JSONField("Capa hemirreductora", default=dict, blank=True)
    mammo_score = models.JSONField("Puntaje del fantoma ACR", default=dict, blank=True)
    radiation_levels = models.JSONField("Niveles de radiación", default=dict, blank=True)

    overall_result = models.CharField(
        "Resultado general", max_length=25, choices=OverallResult.choices, blank=True
    )
    observations = models.TextField("Observaciones", blank=True)
    recommendations = models.TextField("Recomendaciones", blank=True)

    # Signer data printed under the technician's signature (the only one the
    # regulator accepts on this report).
    technician_id_number = models.CharField("C.I. del técnico", max_length=13, blank=True)
    technician_license = models.CharField("Licencia personal del técnico", max_length=50, blank=True)

    pdf_document = models.FileField("PDF generado", upload_to="qc_reports/pdfs/", blank=True)
    signed_document = models.FileField(
        "PDF firmado electrónicamente por el técnico", upload_to="qc_reports/signed/", blank=True
    )
    issued_at = models.DateTimeField("Fecha de emisión", null=True, blank=True)
    signed_at = models.DateTimeField("Fecha de firma", null=True, blank=True)

    class Meta:
        verbose_name = "Informe de control de calidad"
        verbose_name_plural = "Informes de control de calidad"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number} — {self.get_practice_display()}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._generate_number()
        super().save(*args, **kwargs)

    def _generate_number(self):
        year = timezone.now().year
        prefix = f"DIMED-IM-{year}-"
        last = (
            QCReport.objects.filter(number__startswith=prefix)
            .order_by("-number")
            .first()
        )
        seq = int(last.number.split("-")[-1]) + 1 if last else 1
        return f"{prefix}{seq:04d}"

    @property
    def is_locked(self):
        return self.status == self.Status.SIGNED


class QCReportPhoto(BaseModel):
    """Photo for one of the report's image slots (nameplates, phantoms...)."""

    report = models.ForeignKey(QCReport, on_delete=models.CASCADE, related_name="photos")
    slot = models.CharField("Espacio del informe", max_length=30)
    image = models.ImageField("Imagen", upload_to="qc_reports/photos/")
    caption = models.CharField("Descripción", max_length=300, blank=True)

    class Meta:
        verbose_name = "Imagen del informe"
        verbose_name_plural = "Imágenes del informe"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.report.number} — {self.slot}"
