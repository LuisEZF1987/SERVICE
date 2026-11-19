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

    class CostType(models.TextChoices):
        WARRANTY = "WARRANTY", "Garantía (sin costo)"
        BILLABLE = "BILLABLE", "Con costo para la entidad"
        CONTRACT = "CONTRACT", "Contrato de mantenimiento"

    visit_number = models.PositiveIntegerField("Visita #", null=True, blank=True)
    cost_type = models.CharField(
        "Tipo", max_length=20, choices=CostType.choices, blank=True
    )
    notes = models.TextField("Nota", blank=True)
    gcal_event_id = models.CharField(
        "ID evento Google Calendar", max_length=200, blank=True
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
    alerts_sent = models.JSONField(
        "Hitos de alerta enviados", default=list, blank=True
    )

    class Meta:
        verbose_name = "Mantenimiento Programado"
        verbose_name_plural = "Mantenimientos Programados"
        ordering = ["scheduled_date"]

    def __str__(self):
        return f"{self.equipment} — {self.scheduled_date} ({self.get_status_display()})"


def _add_months(d, months):
    """Suma `months` a una fecha, ajustando fin de mes (sin dependencias)."""
    import calendar
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    return d.replace(year=y, month=m, day=min(d.day, calendar.monthrange(y, m)[1]))


class MaintenancePlan(BaseModel):
    """Regla de mantenimiento por equipo. Genera las visitas (ScheduledMaintenance)
    a partir de: fecha ancla (instalación) + frecuencia + nº de visitas +
    cuántas van en garantía. Idempotente: regenerar no duplica."""

    class PostWarranty(models.TextChoices):
        BILLABLE = "BILLABLE", "Con costo para la entidad"
        CONTRACT = "CONTRACT", "Contrato de mantenimiento"

    equipment = models.OneToOneField(
        "equipment.Equipment", on_delete=models.CASCADE,
        related_name="maintenance_plan", verbose_name="Equipo",
    )
    contract = models.ForeignKey(
        "contracts.Contract", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="maintenance_plans", verbose_name="Contrato",
    )
    anchor_date = models.DateField("Fecha de instalación / ancla")
    frequency = models.CharField(
        "Frecuencia", max_length=10, choices=ScheduledMaintenance.Frequency.choices,
        default=ScheduledMaintenance.Frequency.BIANNUAL,
    )
    total_visits = models.PositiveIntegerField("Total de visitas", default=0)
    free_visits = models.PositiveIntegerField("Visitas sin costo (garantía)", default=0)
    completed_visits = models.PositiveIntegerField("Visitas ya realizadas", default=0)
    post_warranty_type = models.CharField(
        "Tipo tras garantía", max_length=20, choices=PostWarranty.choices,
        default=PostWarranty.BILLABLE,
    )
    billable_unit_cost = models.DecimalField(
        "Costo por visita con costo", max_digits=12, decimal_places=2, default=0,
    )
    contract_reference = models.CharField("Referencia de contrato", max_length=120, blank=True)
    notes = models.TextField("Notas", blank=True)
    active = models.BooleanField("Activo", default=True)

    _MONTHS = {"MONTHLY": 1, "QUARTERLY": 3, "BIANNUAL": 6, "ANNUAL": 12}

    class Meta:
        verbose_name = "Plan de mantenimiento"
        verbose_name_plural = "Planes de mantenimiento"

    def __str__(self):
        return f"Plan {self.equipment.internal_code} — {self.get_frequency_display()} x{self.total_visits}"

    def generate_schedule(self):
        """Materializa/actualiza las visitas. Devuelve (creadas, actualizadas).
        No pisa el estado COMPLETED de visitas ya realizadas/enlazadas a una OT."""
        from django.utils import timezone
        today = timezone.localdate()
        step = self._MONTHS.get(self.frequency, 6)
        creadas = actualizadas = 0
        for i in range(1, self.total_visits + 1):
            date = _add_months(self.anchor_date, step * i)
            if i <= self.free_visits:
                cost = ScheduledMaintenance.CostType.WARRANTY
            elif self.post_warranty_type == self.PostWarranty.CONTRACT:
                cost = ScheduledMaintenance.CostType.CONTRACT
            else:
                cost = ScheduledMaintenance.CostType.BILLABLE
            if i <= self.completed_visits:
                status = ScheduledMaintenance.Status.COMPLETED
            elif date < today:
                status = ScheduledMaintenance.Status.OVERDUE
            else:
                status = ScheduledMaintenance.Status.PENDING
            obj, new = ScheduledMaintenance.objects.get_or_create(
                equipment=self.equipment, visit_number=i,
                defaults=dict(scheduled_date=date, frequency=self.frequency,
                              cost_type=cost, contract=self.contract, status=status,
                              notes=self.notes if i == 1 else ""),
            )
            if new:
                creadas += 1
            else:
                # No degradar un COMPLETED ya enlazado a una OT; sí refrescar fecha/tipo.
                obj.scheduled_date = date
                obj.frequency = self.frequency
                obj.cost_type = cost
                obj.contract = self.contract
                if obj.status != ScheduledMaintenance.Status.COMPLETED:
                    obj.status = status
                obj.save(update_fields=["scheduled_date", "frequency", "cost_type",
                                        "contract", "status", "updated_at"])
                actualizadas += 1
        return creadas, actualizadas
