from django.db import models

from common.models import BaseModel


class SparePart(BaseModel):
    """Spare part inventory item for medical equipment maintenance."""

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

    # Equipment identification
    modality = models.CharField(
        "Modalidad", max_length=20, choices=Modality.choices
    )
    manufacturer = models.CharField("Fabricante", max_length=100)
    equipment_model = models.CharField("Modelo del equipo", max_length=100, blank=True)
    equipment_series = models.CharField(
        "Serie del equipo", max_length=100, blank=True,
        help_text="Variante o línea del modelo (ej: Digiscan V-30)"
    )

    # Part identification
    part_number = models.CharField("Part #", max_length=100, unique=True)
    description = models.TextField("Descripción")

    # Inventory
    unit_cost = models.DecimalField(
        "Costo unitario", max_digits=12, decimal_places=2, default=0
    )
    stock_quantity = models.PositiveIntegerField("Cantidad en stock", default=0)
    minimum_stock = models.PositiveIntegerField("Stock mínimo", default=1)
    location = models.CharField("Ubicación", max_length=200, blank=True)
    supplier = models.CharField("Proveedor", max_length=200, blank=True)

    class Meta:
        verbose_name = "Repuesto"
        verbose_name_plural = "Repuestos"
        ordering = ["manufacturer", "part_number"]

    def __str__(self):
        return f"{self.part_number} — {self.description} ({self.manufacturer})"

    @property
    def is_below_minimum_stock(self):
        return self.stock_quantity <= self.minimum_stock
