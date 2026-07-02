from django.db import models

from common.models import BaseModel


class Manufacturer(BaseModel):
    """Equipment manufacturer/brand."""
    name = models.CharField("Nombre", max_length=200, unique=True)
    country = models.CharField("País", max_length=100, blank=True)
    is_active = models.BooleanField("Activo", default=True)

    class Meta:
        verbose_name = "Fabricante"
        verbose_name_plural = "Fabricantes"
        ordering = ["name"]

    def __str__(self):
        return self.name


class EquipmentModel(BaseModel):
    """Equipment model belonging to a manufacturer and modality."""

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

    manufacturer = models.ForeignKey(
        Manufacturer, on_delete=models.CASCADE,
        related_name="models", verbose_name="Fabricante"
    )
    modality = models.CharField("Modalidad", max_length=20, choices=Modality.choices)
    name = models.CharField("Nombre del modelo", max_length=200)
    is_active = models.BooleanField("Activo", default=True)

    class Meta:
        verbose_name = "Modelo de Equipo"
        verbose_name_plural = "Modelos de Equipo"
        ordering = ["manufacturer__name", "name"]
        unique_together = ["manufacturer", "name"]

    def __str__(self):
        return f"{self.manufacturer.name} — {self.name}"


class EquipmentSeries(BaseModel):
    """Equipment series/variant belonging to a model."""
    equipment_model = models.ForeignKey(
        EquipmentModel, on_delete=models.CASCADE,
        related_name="series", verbose_name="Modelo"
    )
    name = models.CharField("Nombre de la serie", max_length=200)
    description = models.TextField("Descripción", blank=True)
    is_active = models.BooleanField("Activo", default=True)

    class Meta:
        verbose_name = "Serie de Equipo"
        verbose_name_plural = "Series de Equipo"
        ordering = ["equipment_model__name", "name"]
        unique_together = ["equipment_model", "name"]

    def __str__(self):
        return f"{self.equipment_model} — {self.name}"
