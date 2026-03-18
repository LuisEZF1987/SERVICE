from django.db import models

from common.models import BaseModel


class ScheduledMaintenance(BaseModel):
    """Scheduled preventive maintenance entry linked to equipment and contracts."""

    class Frequency(models.TextChoices):
        DAILY = "DAILY", "Diario"
        WEEKLY = "WEEKLY", "Semanal"
        MONTHLY = "MONTHLY", "Mensual"
        QUARTERLY = "QUARTERLY", "Trimestral"
        BIANNUAL = "BIANNUAL", "Semestral"
        ANNUAL = "ANNUAL", "Anual"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendiente"
        COMPLETED = "COMPLETED", "Completado"
        OVERDUE = "OVERDUE", "Vencido"
        CANCELLED = "CANCELLED", "Cancelado"

    equipment = models.ForeignKey(
        "equipment.Equipment",
        on_delete=models.CASCADE,
        related_name="scheduled_maintenances",
        verbose_name="Equipo",
    )
    contract = models.ForeignKey(
        "contracts.Contract",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scheduled_maintenances",
        verbose_name="Contrato",
    )
    scheduled_date = models.DateField("Fecha programada")
    frequency = models.CharField(
        "Frecuencia", max_length=10, choices=Frequency.choices
    )
    work_order = models.ForeignKey(
        "work_orders.WorkOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scheduled_maintenances",
        verbose_name="Orden de trabajo",
    )
    status = models.CharField(
        "Estado", max_length=10, choices=Status.choices, default=Status.PENDING
    )
    alert_sent = models.BooleanField("Alerta enviada", default=False)

    class Meta:
        verbose_name = "Mantenimiento Programado"
        verbose_name_plural = "Mantenimientos Programados"
        ordering = ["scheduled_date"]

    def __str__(self):
        return f"{self.equipment} — {self.scheduled_date} ({self.get_status_display()})"
