from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from common.models import BaseModel


class WorkOrder(BaseModel):
    """
    Digital Work Order (OT) — the central document of DimedService.
    A client-signed OT is the official record certifying that the service
    was performed, and the source document for billing the client.
    """

    class Type(models.TextChoices):
        PREVENTIVE = "PREVENTIVE", "Preventivo"
        CORRECTIVE = "CORRECTIVE", "Correctivo"
        CALIBRATION = "CALIBRATION", "Calibración"
        INSTALLATION = "INSTALLATION", "Instalación"
        WARRANTY = "WARRANTY", "Garantía"

    class Priority(models.TextChoices):
        URGENT = "URGENT", "Urgente"
        NORMAL = "NORMAL", "Normal"
        SCHEDULED = "SCHEDULED", "Programado"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Abierta"
        IN_PROGRESS = "IN_PROGRESS", "En ejecución"
        PENDING_SIGNATURE = "PENDING_SIGNATURE", "Pendiente de firma cliente"
        SIGNED = "SIGNED", "Firmada por cliente"
        CLOSED = "CLOSED", "Cerrada y bloqueada"

    class Result(models.TextChoices):
        RESOLVED = "RESOLVED", "Resuelto"
        PARTIAL = "PARTIAL", "Parcial"
        FOLLOW_UP = "FOLLOW_UP", "Seguimiento"
        NOT_RESOLVED = "NOT_RESOLVED", "No resuelto"

    # Header
    number = models.CharField(
        "Número de OT", max_length=20, unique=True, editable=False
    )
    ot_type = models.CharField(
        "Tipo", max_length=20, choices=Type.choices
    )
    priority = models.CharField(
        "Prioridad", max_length=20, choices=Priority.choices, default=Priority.NORMAL
    )
    status = models.CharField(
        "Estado", max_length=20, choices=Status.choices, default=Status.OPEN
    )

    # Equipment & Client
    equipment = models.ForeignKey(
        "equipment.Equipment",
        on_delete=models.PROTECT,
        related_name="work_orders",
        verbose_name="Equipo",
    )
    # Denormalized for quick access
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="work_orders",
        verbose_name="Cliente",
    )

    # Contract
    contract = models.ForeignKey(
        "contracts.Contract",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_orders",
        verbose_name="Contrato vinculado",
    )

    # Assigned technician
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assigned_work_orders",
        verbose_name="Técnico asignado",
        limit_choices_to={"role": "TECHNICIAN"},
    )

    # Support ticket that originated this OT (one case → several visits)
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_orders",
        verbose_name="Ticket de origen",
    )

    # Maintenance template (for preventive OTs)
    template_version = models.ForeignKey(
        "templates_engine.TemplateVersion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_orders",
        verbose_name="Versión de plantilla",
    )

    # Time tracking
    opened_at = models.DateTimeField("Fecha de apertura", auto_now_add=True)
    arrival_at = models.DateTimeField("Llegada al sitio", null=True, blank=True)
    started_at = models.DateTimeField("Inicio del trabajo", null=True, blank=True)
    finished_at = models.DateTimeField("Fin del trabajo", null=True, blank=True)
    closed_at = models.DateTimeField("Fecha de cierre", null=True, blank=True)
    total_hours = models.DecimalField(
        "Total horas", max_digits=6, decimal_places=2, null=True, blank=True
    )

    # Technical description
    reported_problem = models.TextField("Problema reportado", blank=True)
    diagnosis = models.TextField("Diagnóstico", blank=True)
    work_performed = models.TextField("Trabajo realizado", blank=True)

    # Result
    result = models.CharField(
        "Resultado", max_length=20, choices=Result.choices,
        blank=True
    )
    follow_up_notes = models.TextField("Notas de seguimiento", blank=True)

    # Travel costs
    travel_cost = models.DecimalField(
        "Gastos de traslado", max_digits=10, decimal_places=2, default=0
    )

    # Client signature (rubric capture)
    client_signature = models.ImageField(
        "Rúbrica del cliente", upload_to="work_orders/signatures/", blank=True
    )
    client_signer_name = models.CharField(
        "Nombre de quien firma", max_length=200, blank=True
    )
    client_signer_position = models.CharField(
        "Cargo de quien firma", max_length=100, blank=True
    )
    signed_at = models.DateTimeField("Fecha/hora de firma", null=True, blank=True)

    # Technician signature
    technician_signature = models.ImageField(
        "Firma del técnico", upload_to="work_orders/signatures/", blank=True
    )
    technician_signed_at = models.DateTimeField(
        "Fecha/hora firma técnico", null=True, blank=True
    )

    # Generated PDF
    pdf_document = models.FileField(
        "PDF generado", upload_to="work_orders/pdfs/", blank=True
    )

    # Email tracking for electronic signature
    signature_email_sent = models.BooleanField(
        "Email para firma electrónica enviado", default=False
    )
    electronic_signature_document = models.FileField(
        "Documento con firma electrónica", upload_to="work_orders/signed_pdfs/", blank=True
    )

    class Meta:
        verbose_name = "Orden de Trabajo"
        verbose_name_plural = "Órdenes de Trabajo"
        ordering = ["-opened_at"]

    def __str__(self):
        return f"{self.number} — {self.equipment.internal_code} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._generate_number()
        # Auto-calculate total hours
        if self.started_at and self.finished_at:
            delta = self.finished_at - self.started_at
            self.total_hours = round(delta.total_seconds() / 3600, 2)
        # Auto-set client from equipment
        if self.equipment_id and not self.client_id:
            self.client = self.equipment.client
        super().save(*args, **kwargs)

    def clean(self):
        # BUSINESS RULE: Closed OTs cannot be modified
        if self.pk:
            try:
                original = WorkOrder.objects.get(pk=self.pk)
                if original.status == self.Status.CLOSED:
                    raise ValidationError(
                        "Una OT cerrada y firmada no puede ser modificada."
                    )
            except WorkOrder.DoesNotExist:
                pass

    def _generate_number(self):
        year = timezone.now().year
        last_ot = (
            WorkOrder.objects
            .filter(number__startswith=f"OT-{year}-")
            .order_by("-number")
            .first()
        )
        if last_ot:
            last_seq = int(last_ot.number.split("-")[-1])
            new_seq = last_seq + 1
        else:
            new_seq = 1
        return f"OT-{year}-{new_seq:04d}"

    @property
    def is_signed_by_client(self):
        return bool(self.client_signature) and self.signed_at is not None

    @property
    def can_be_closed(self):
        return (
            self.status == self.Status.SIGNED
            and self.is_signed_by_client
            and self.result
        )


class WorkOrderPhoto(BaseModel):
    """Photos attached to a work order (before/during/after)."""

    class PhotoType(models.TextChoices):
        BEFORE = "BEFORE", "Antes"
        DURING = "DURING", "Durante"
        AFTER = "AFTER", "Después"

    work_order = models.ForeignKey(
        WorkOrder, on_delete=models.CASCADE, related_name="photos"
    )
    photo = models.ImageField("Foto", upload_to="work_orders/photos/")
    photo_type = models.CharField(
        "Tipo", max_length=10, choices=PhotoType.choices
    )
    caption = models.CharField("Descripción", max_length=300, blank=True)

    class Meta:
        verbose_name = "Foto de OT"
        verbose_name_plural = "Fotos de OT"

    def __str__(self):
        return f"{self.work_order.number} — {self.get_photo_type_display()}"


class WorkOrderSparePart(BaseModel):
    """Spare parts used in a work order."""

    work_order = models.ForeignKey(
        WorkOrder, on_delete=models.CASCADE, related_name="spare_parts_used"
    )
    spare_part = models.ForeignKey(
        "spare_parts.SparePart",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="work_order_usage",
        verbose_name="Repuesto del inventario",
    )
    description = models.CharField("Descripción", max_length=300)
    code = models.CharField("Código", max_length=50, blank=True)
    quantity = models.PositiveIntegerField("Cantidad", default=1)
    unit_cost = models.DecimalField(
        "Costo unitario", max_digits=12, decimal_places=2, default=0
    )

    class Meta:
        verbose_name = "Repuesto utilizado"
        verbose_name_plural = "Repuestos utilizados"

    @property
    def total_cost(self):
        return self.quantity * self.unit_cost


class ChecklistExecution(BaseModel):
    """Execution record of a maintenance checklist item during an OT."""

    work_order = models.ForeignKey(
        WorkOrder, on_delete=models.CASCADE, related_name="checklist_items"
    )
    task_name = models.CharField("Tarea", max_length=500)
    frequency = models.CharField("Frecuencia", max_length=50, blank=True)
    completed = models.BooleanField("Completado", default=False)
    measured_value = models.CharField("Valor medido", max_length=100, blank=True)
    reference_value = models.CharField("Valor de referencia", max_length=100, blank=True)
    tolerance = models.CharField("Tolerancia", max_length=100, blank=True)
    is_within_tolerance = models.BooleanField("Dentro de tolerancia", null=True)
    notes = models.TextField("Observaciones", blank=True)
    photo = models.ImageField(
        "Foto de evidencia", upload_to="work_orders/checklist_photos/", blank=True
    )
    order = models.PositiveIntegerField("Orden", default=0)

    class Meta:
        verbose_name = "Ítem de checklist ejecutado"
        verbose_name_plural = "Ítems de checklist ejecutados"
        ordering = ["order"]
