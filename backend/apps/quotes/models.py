from datetime import timedelta
from decimal import Decimal

from django.db import models
from django.utils import timezone

from common.models import BaseModel


class Quote(BaseModel):
    """Service/parts quotation for clients without a covering contract.

    Business flow (as practiced by Dimed): quote the service or spare part →
    client accepts → 50% advance is charged (via CAJA) → the work order is
    authorized → on OT close the remaining balance is charged.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Borrador"
        SENT = "SENT", "Enviada"
        ACCEPTED = "ACCEPTED", "Aceptada"
        REJECTED = "REJECTED", "Rechazada"
        EXPIRED = "EXPIRED", "Vencida"

    number = models.CharField(
        "Número de cotización", max_length=20, unique=True, editable=False
    )
    title = models.CharField("Título / objeto", max_length=300)
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="quotes",
        verbose_name="Cliente",
    )
    equipment = models.ForeignKey(
        "equipment.Equipment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotes",
        verbose_name="Equipo",
    )
    ticket = models.ForeignKey(
        "tickets.Ticket",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotes",
        verbose_name="Ticket de origen",
    )
    status = models.CharField(
        "Estado", max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    valid_until = models.DateField("Válida hasta", null=True, blank=True)

    iva_rate = models.DecimalField(
        "IVA %", max_digits=5, decimal_places=2, default=Decimal("15")
    )
    advance_percent = models.DecimalField(
        "Anticipo %", max_digits=5, decimal_places=2, default=Decimal("50")
    )

    # Commercial conditions (defaults mirror the CRM's proven quote format)
    payment_terms = models.TextField(
        "Forma de pago",
        default="50% de anticipo para iniciar el trabajo; 50% contra entrega e instalación.",
    )
    delivery_terms = models.CharField(
        "Plazo de entrega",
        max_length=300,
        blank=True,
        default="30 días contados desde la confirmación del pedido.",
    )
    warranty_terms = models.CharField(
        "Garantía",
        max_length=300,
        blank=True,
        default="Los repuestos cuentan con garantía de fábrica de 6 meses desde la entrega.",
    )
    notes = models.TextField("Observaciones", blank=True)

    # Lifecycle
    sent_at = models.DateTimeField("Enviada el", null=True, blank=True)
    accepted_at = models.DateTimeField("Aceptada el", null=True, blank=True)
    accepted_by_name = models.CharField(
        "Aceptada por (nombre)", max_length=200, blank=True
    )
    rejected_at = models.DateTimeField("Rechazada el", null=True, blank=True)
    advance_paid = models.BooleanField("Anticipo recibido", default=False)
    advance_paid_at = models.DateTimeField("Anticipo recibido el", null=True, blank=True)

    # Resulting work order once authorized
    work_order = models.ForeignKey(
        "work_orders.WorkOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quotes",
        verbose_name="Orden de trabajo generada",
    )

    pdf_document = models.FileField(
        "PDF generado", upload_to="quotes/pdfs/", blank=True
    )

    class Meta:
        verbose_name = "Cotización"
        verbose_name_plural = "Cotizaciones"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.number} — {self.client.name} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._generate_number()
        # Default validity: 90 days (the CRM's proven standard)
        if self._state.adding and not self.valid_until:
            self.valid_until = timezone.localdate() + timedelta(days=90)
        super().save(*args, **kwargs)

    def _generate_number(self):
        year = timezone.now().year
        last = (
            Quote.objects.filter(number__startswith=f"COT-{year}-")
            .order_by("-number")
            .first()
        )
        seq = int(last.number.split("-")[-1]) + 1 if last else 1
        return f"COT-{year}-{seq:04d}"

    @property
    def subtotal(self):
        return sum((item.total for item in self.items.all()), Decimal("0"))

    @property
    def iva_amount(self):
        return (self.subtotal * self.iva_rate / Decimal("100")).quantize(Decimal("0.01"))

    @property
    def total(self):
        return self.subtotal + self.iva_amount

    @property
    def advance_amount(self):
        return (self.total * self.advance_percent / Decimal("100")).quantize(
            Decimal("0.01")
        )

    @property
    def balance_amount(self):
        return self.total - self.advance_amount


class QuoteItem(BaseModel):
    """Line item of a quote: labor, spare part, travel or other."""

    class Kind(models.TextChoices):
        LABOR = "LABOR", "Mano de obra"
        PART = "PART", "Repuesto"
        TRAVEL = "TRAVEL", "Traslado / viáticos"
        OTHER = "OTHER", "Otro"

    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name="items")
    kind = models.CharField(
        "Tipo", max_length=10, choices=Kind.choices, default=Kind.LABOR
    )
    spare_part = models.ForeignKey(
        "spare_parts.SparePart",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quote_items",
        verbose_name="Repuesto del inventario",
    )
    description = models.CharField("Descripción", max_length=300)
    code = models.CharField("Código", max_length=50, blank=True)
    quantity = models.DecimalField(
        "Cantidad", max_digits=8, decimal_places=2, default=Decimal("1")
    )
    unit_price = models.DecimalField(
        "Precio unitario", max_digits=12, decimal_places=2, default=Decimal("0")
    )
    order = models.PositiveIntegerField("Orden", default=0)

    class Meta:
        verbose_name = "Ítem de cotización"
        verbose_name_plural = "Ítems de cotización"
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.quote.number} — {self.description}"

    @property
    def total(self):
        return (self.quantity * self.unit_price).quantize(Decimal("0.01"))
