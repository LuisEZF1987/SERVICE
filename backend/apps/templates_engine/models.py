from django.conf import settings
from django.db import models

from common.models import BaseModel


class TechnicalManual(BaseModel):
    """Technical documentation library: service/user manuals, datasheets,
    pre-installation forms, etc. Feeds the technicians in the field and,
    later, the AI-based template generation."""

    class Modality(models.TextChoices):
        XRAY_FIXED = "XRAY_FIXED", "Rayos X Fijo"
        XRAY_PORTABLE = "XRAY_PORTABLE", "Rayos X Port\u00e1til"
        CT = "CT", "Tom\u00f3grafo (TAC)"
        MRI = "MRI", "Resonancia Magn\u00e9tica"
        ULTRASOUND = "ULTRASOUND", "Ultrasonido"
        MAMMOGRAPH = "MAMMOGRAPH", "Mam\u00f3grafo"
        FLUOROSCOPE = "FLUOROSCOPE", "Fluoroscopio"
        DENSITOMETER = "DENSITOMETER", "Densit\u00f3metro"
        OTHER = "OTHER", "Otro"

    class DocumentType(models.TextChoices):
        SERVICE_MANUAL = "SERVICE_MANUAL", "Manual de servicio"
        USER_MANUAL = "USER_MANUAL", "Manual de usuario"
        PRE_INSTALL_FORM = "PRE_INSTALL_FORM", "Formulario de pre-instalaci\u00f3n"
        PRE_INSTALL_MANUAL = "PRE_INSTALL_MANUAL", "Manual de pre-instalaci\u00f3n"
        TRAINING = "TRAINING", "Plan de capacitaci\u00f3n"
        BROCHURE = "BROCHURE", "Cat\u00e1logo / Brochure"
        DATASHEET = "DATASHEET", "Datasheet"
        OTHER = "OTHER", "Otro"

    title = models.CharField("T\u00edtulo", max_length=300, blank=True)
    document_type = models.CharField(
        "Tipo de documento",
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.SERVICE_MANUAL,
    )
    brand = models.CharField("Marca", max_length=100)
    modality = models.CharField(
        "Modalidad", max_length=20, choices=Modality.choices
    )
    model_name = models.CharField("Modelo", max_length=100)
    language = models.CharField("Idioma", max_length=50, blank=True, default="Espa\u00f1ol")
    file = models.FileField("Archivo del manual", upload_to="manuales/")
    notes = models.TextField("Notas", blank=True)

    # Optional links to the equipment catalog (Manufacturer \u2192 Model \u2192 Series)
    equipment_model = models.ForeignKey(
        "equipment.EquipmentModel",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="manuals",
        verbose_name="Modelo del cat\u00e1logo",
    )
    equipment_series = models.ForeignKey(
        "equipment.EquipmentSeries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="manuals",
        verbose_name="Serie del cat\u00e1logo",
    )

    class Meta:
        verbose_name = "Manual T\u00e9cnico"
        verbose_name_plural = "Manuales T\u00e9cnicos"
        ordering = ["brand", "model_name", "document_type"]

    def __str__(self):
        label = self.title or f"{self.brand} {self.model_name}"
        return f"{label} ({self.get_document_type_display()})"


class MaintenanceTemplate(BaseModel):
    """AI-generated or manually created maintenance checklist template."""

    class Modality(models.TextChoices):
        XRAY_FIXED = "XRAY_FIXED", "Rayos X Fijo"
        XRAY_PORTABLE = "XRAY_PORTABLE", "Rayos X Port\u00e1til"
        CT = "CT", "Tom\u00f3grafo (TAC)"
        MRI = "MRI", "Resonancia Magn\u00e9tica"
        ULTRASOUND = "ULTRASOUND", "Ultrasonido"
        MAMMOGRAPH = "MAMMOGRAPH", "Mam\u00f3grafo"
        FLUOROSCOPE = "FLUOROSCOPE", "Fluoroscopio"
        DENSITOMETER = "DENSITOMETER", "Densit\u00f3metro"
        OTHER = "OTHER", "Otro"

    class TemplateType(models.TextChoices):
        CUSTOM = "CUSTOM", "Personalizada"
        GENERAL = "GENERAL", "General"

    class Status(models.TextChoices):
        GENERATED = "GENERATED", "Generada"
        PENDING = "PENDING", "Pendiente"
        NO_MANUAL = "NO_MANUAL", "Sin manual"

    name = models.CharField("Nombre de la plantilla", max_length=300)
    brand = models.CharField("Marca", max_length=100)
    modality = models.CharField(
        "Modalidad", max_length=20, choices=Modality.choices
    )
    model_name = models.CharField("Modelo", max_length=100)
    serial_number = models.CharField("N\u00famero de serie", max_length=100, blank=True)
    template_type = models.CharField(
        "Tipo de plantilla", max_length=10, choices=TemplateType.choices
    )
    status = models.CharField(
        "Estado", max_length=10, choices=Status.choices, default=Status.PENDING
    )
    template_data = models.JSONField(
        "Datos de la plantilla", default=dict, blank=True
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_templates",
        verbose_name="Aprobado por",
    )
    approved_at = models.DateTimeField("Fecha de aprobaci\u00f3n", null=True, blank=True)

    class Meta:
        verbose_name = "Plantilla de Mantenimiento"
        verbose_name_plural = "Plantillas de Mantenimiento"
        ordering = ["brand", "model_name"]

    def __str__(self):
        return f"{self.name} — {self.brand} {self.model_name}"


class TemplateVersion(BaseModel):
    """Version history for maintenance templates."""

    template = models.ForeignKey(
        MaintenanceTemplate,
        on_delete=models.CASCADE,
        related_name="versions",
        verbose_name="Plantilla",
    )
    version = models.CharField("Versi\u00f3n", max_length=20)
    template_data = models.JSONField("Datos de la versi\u00f3n", default=dict)
    change_notes = models.TextField("Notas del cambio", blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="template_versions_created",
        verbose_name="Creado por",
    )

    class Meta:
        verbose_name = "Versi\u00f3n de Plantilla"
        verbose_name_plural = "Versiones de Plantilla"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.template.name} v{self.version}"
