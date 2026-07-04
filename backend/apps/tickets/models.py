from datetime import timedelta

from django.db import models
from django.utils import timezone

from common.models import BaseModel


class Ticket(BaseModel):
    """Support case reported by a client.

    The ticket is the case history: one fault can require several visits
    (work orders). The full conversation lives in the comment thread and every
    update is emailed with the ticket number in the subject.
    """

    class Channel(models.TextChoices):
        PHONE = "PHONE", "Teléfono"
        EMAIL = "EMAIL", "Email"
        WHATSAPP = "WHATSAPP", "WhatsApp"
        PORTAL = "PORTAL", "Portal cliente"
        IN_PERSON = "IN_PERSON", "Presencial"

    class Priority(models.TextChoices):
        CRITICAL = "CRITICAL", "Crítica (equipo parado)"
        HIGH = "HIGH", "Alta"
        NORMAL = "NORMAL", "Normal"
        LOW = "LOW", "Baja"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Abierto"
        IN_PROGRESS = "IN_PROGRESS", "En atención"
        ESCALATED = "ESCALATED", "Escalado"
        RESOLVED = "RESOLVED", "Resuelto"
        CLOSED = "CLOSED", "Cerrado"

    number = models.CharField(
        "Número de ticket", max_length=20, unique=True, editable=False
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="tickets",
        verbose_name="Cliente",
    )
    equipment = models.ForeignKey(
        "equipment.Equipment",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="tickets",
        verbose_name="Equipo",
    )
    contract = models.ForeignKey(
        "contracts.Contract",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
        verbose_name="Contrato (SLA)",
    )

    subject = models.CharField("Asunto", max_length=300)
    description = models.TextField("Descripción de la falla")
    channel = models.CharField(
        "Canal de reporte", max_length=15, choices=Channel.choices, default=Channel.PHONE
    )
    priority = models.CharField(
        "Prioridad", max_length=10, choices=Priority.choices, default=Priority.NORMAL
    )
    status = models.CharField(
        "Estado", max_length=15, choices=Status.choices, default=Status.OPEN
    )

    reported_by_name = models.CharField("Reportado por", max_length=200, blank=True)
    reported_by_email = models.EmailField("Email de quien reporta", blank=True)

    assigned_to = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
        verbose_name="Responsable",
    )

    # SLA — derived from the contract's response hours at creation
    sla_due_at = models.DateTimeField("Vencimiento SLA", null=True, blank=True)

    resolution_notes = models.TextField("Notas de resolución", blank=True)
    resolved_at = models.DateTimeField("Fecha de resolución", null=True, blank=True)
    closed_at = models.DateTimeField("Fecha de cierre", null=True, blank=True)

    class Meta:
        verbose_name = "Ticket"
        verbose_name_plural = "Tickets"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number} — {self.subject} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._generate_number()
        if not self.pk:
            # Inherit the contract from the equipment when not set explicitly
            if not self.contract_id and self.equipment_id and self.equipment.contract_id:
                self.contract = self.equipment.contract
            # SLA deadline from the contract's committed response time
            if not self.sla_due_at and self.contract and self.contract.sla_response_hours:
                self.sla_due_at = timezone.now() + timedelta(
                    hours=self.contract.sla_response_hours
                )
        super().save(*args, **kwargs)

    def _generate_number(self):
        year = timezone.now().year
        last = (
            Ticket.objects.filter(number__startswith=f"TKT-{year}-")
            .order_by("-number")
            .first()
        )
        seq = int(last.number.split("-")[-1]) + 1 if last else 1
        return f"TKT-{year}-{seq:04d}"

    @property
    def is_sla_breached(self):
        if not self.sla_due_at:
            return False
        if self.status in (self.Status.RESOLVED, self.Status.CLOSED):
            reference = self.resolved_at or self.closed_at
            return bool(reference and reference > self.sla_due_at)
        return timezone.now() > self.sla_due_at


class TicketComment(BaseModel):
    """Entry in the ticket conversation thread.

    Internal comments are visible to Dimed staff only and never emailed to
    the client.
    """

    ticket = models.ForeignKey(
        Ticket, on_delete=models.CASCADE, related_name="comments"
    )
    body = models.TextField("Comentario")
    is_internal = models.BooleanField("Nota interna (solo Dimed)", default=False)

    class Meta:
        verbose_name = "Comentario de ticket"
        verbose_name_plural = "Comentarios de ticket"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.ticket.number} — {self.created_at:%d/%m/%Y %H:%M}"
