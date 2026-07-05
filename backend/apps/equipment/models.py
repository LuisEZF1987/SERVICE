from django.db import models

from common.models import BaseModel

# Register catalog models with the app at load time so cross-app string
# references like "equipment.EquipmentModel" resolve (they live in a
# separate module and would otherwise only register when views import them).
from .catalog_models import EquipmentModel, EquipmentSeries, Manufacturer  # noqa: F401


class Equipment(BaseModel):
    """Medical imaging equipment tracked by Dimed."""

    class Modality(models.TextChoices):
        XRAY_FIXED = "XRAY_FIXED", "Rayos X Fijo"
        XRAY_PORTABLE = "XRAY_PORTABLE", "Rayos X Portátil"
        CT = "CT", "Tomógrafo (TAC)"
        MRI = "MRI", "Resonancia Magnética"
        ULTRASOUND = "ULTRASOUND", "Ultrasonido"
        MAMMOGRAPH = "MAMMOGRAPH", "Mamógrafo"
        FLUOROSCOPE = "FLUOROSCOPE", "Fluoroscopio"
        DENSITOMETER = "DENSITOMETER", "Densitómetro"
        OTHER = "OTHER", "Otro"

    class Status(models.TextChoices):
        OPERATIONAL = "OPERATIONAL", "Operativo"
        MAINTENANCE = "MAINTENANCE", "En mantenimiento"
        OUT_OF_SERVICE = "OUT_OF_SERVICE", "Fuera de servicio"
        DECOMMISSIONED = "DECOMMISSIONED", "Baja"

    # Identification
    internal_code = models.CharField(
        "Código interno Dimed", max_length=30, unique=True,
        help_text="Formato: DIM-[TIPO]-[NÚMERO]"
    )
    serial_number = models.CharField(
        "Número de serie del fabricante", max_length=100, unique=True
    )
    hospital_asset_number = models.CharField(
        "Número de activo del hospital", max_length=100, blank=True
    )
    arcsa_registration = models.CharField(
        "Registro sanitario ARCSA", max_length=100, blank=True
    )

    # Certifications
    has_fda = models.BooleanField("Certificación FDA", default=False)
    has_ce = models.BooleanField("Certificación CE", default=False)
    has_iso_13485 = models.BooleanField("ISO 13485", default=False)

    # Technical data
    modality = models.CharField(
        "Modalidad", max_length=20, choices=Modality.choices
    )
    brand = models.CharField("Marca", max_length=100)
    model_name = models.CharField("Modelo", max_length=100)
    country_of_origin = models.CharField("País de origen", max_length=100, blank=True)
    year_of_manufacture = models.PositiveIntegerField("Año de fabricación", null=True, blank=True)
    technical_specs = models.JSONField("Especificaciones técnicas", default=dict, blank=True)

    # Location
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="equipment",
        verbose_name="Institución cliente",
    )
    area = models.CharField("Área/Sala/Piso", max_length=200, blank=True)
    city = models.CharField("Ciudad", max_length=100)
    province = models.CharField("Provincia", max_length=100)

    # Status
    status = models.CharField(
        "Estado", max_length=20, choices=Status.choices, default=Status.OPERATIONAL
    )

    # Warranties
    factory_warranty_start = models.DateField("Garantía fábrica inicio", null=True, blank=True)
    factory_warranty_end = models.DateField("Garantía fábrica fin", null=True, blank=True)
    dimed_warranty_start = models.DateField("Garantía Dimed inicio", null=True, blank=True)
    dimed_warranty_end = models.DateField("Garantía Dimed fin", null=True, blank=True)

    # Contract link
    contract = models.ForeignKey(
        "contracts.Contract",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="equipment",
        verbose_name="Contrato vinculado",
    )

    # Maintenance template
    maintenance_template = models.ForeignKey(
        "templates_engine.MaintenanceTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="equipment",
        verbose_name="Plantilla de mantenimiento",
    )

    # Photo
    photo = models.ImageField("Foto del equipo", upload_to="equipment/photos/", blank=True)

    class Meta:
        verbose_name = "Equipo"
        verbose_name_plural = "Equipos"
        ordering = ["internal_code"]

    def __str__(self):
        return f"{self.internal_code} — {self.brand} {self.model_name} ({self.get_modality_display()})"

    @property
    def is_under_factory_warranty(self):
        from django.utils import timezone
        today = timezone.now().date()
        if self.factory_warranty_end:
            return today <= self.factory_warranty_end
        return False

    @property
    def is_under_dimed_warranty(self):
        from django.utils import timezone
        today = timezone.now().date()
        if self.dimed_warranty_end:
            return today <= self.dimed_warranty_end
        return False
