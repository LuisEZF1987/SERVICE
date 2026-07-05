from django.db import models

from common.models import BaseModel


class Contract(BaseModel):
    """Service contract between Dimed and a client institution."""

    class ContractType(models.TextChoices):
        ALL_INCLUSIVE = "ALL_INCLUSIVE", "Todo incluido"
        PREVENTIVE_ONLY = "PREVENTIVE_ONLY", "Solo preventivo"
        FACTORY_WARRANTY = "FACTORY_WARRANTY", "Garant\u00eda de f\u00e1brica"
        TECHNICAL_WARRANTY = "TECHNICAL_WARRANTY", "Garant\u00eda t\u00e9cnica"
        PER_EVENT = "PER_EVENT", "Por evento"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Borrador"
        ACTIVE = "ACTIVE", "Activo"
        EXPIRED = "EXPIRED", "Expirado"
        CANCELLED = "CANCELLED", "Cancelado"

    number = models.CharField("N\u00famero de contrato", max_length=50, unique=True)
    contract_type = models.CharField(
        "Tipo de contrato", max_length=20, choices=ContractType.choices
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="contracts",
        verbose_name="Cliente",
    )
    sercop_reference = models.CharField(
        "Referencia SERCOP", max_length=100, blank=True
    )
    start_date = models.DateField("Fecha de inicio")
    end_date = models.DateField("Fecha de fin")
    total_value = models.DecimalField(
        "Valor total", max_digits=12, decimal_places=2
    )
    # Amount charged to CAJA when each scheduled preventive visit's OT closes
    value_per_visit = models.DecimalField(
        "Valor por visita preventiva",
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Monto del cargo a CAJA por cada mantenimiento preventivo del cronograma",
    )
    payment_terms = models.TextField("Condiciones de pago")
    sla_response_hours = models.PositiveIntegerField(
        "Horas de respuesta SLA"
    )
    preventive_visits_per_year = models.PositiveIntegerField(
        "Visitas preventivas por a\u00f1o"
    )
    status = models.CharField(
        "Estado", max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    document = models.FileField(
        "Documento del contrato", upload_to="contracts/", blank=True
    )
    notes = models.TextField("Observaciones", blank=True)

    class Meta:
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.number} — {self.client.name} ({self.get_status_display()})"
