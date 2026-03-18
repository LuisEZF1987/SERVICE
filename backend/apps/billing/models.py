from django.conf import settings
from django.db import models

from common.models import BaseModel


class ClientInvoice(BaseModel):
    """Invoice issued to a client for services rendered."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Borrador"
        ISSUED = "ISSUED", "Emitida"
        PAID = "PAID", "Pagada"
        CANCELLED = "CANCELLED", "Anulada"

    invoice_number = models.CharField(
        "N\u00famero de factura", max_length=50, unique=True
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="invoices",
        verbose_name="Cliente",
    )
    work_orders = models.ManyToManyField(
        "work_orders.WorkOrder",
        blank=True,
        related_name="client_invoices",
        verbose_name="\u00d3rdenes de trabajo",
    )
    concept = models.CharField("Concepto", max_length=500)
    subtotal = models.DecimalField(
        "Subtotal", max_digits=12, decimal_places=2
    )
    iva = models.DecimalField("IVA", max_digits=12, decimal_places=2)
    total = models.DecimalField("Total", max_digits=12, decimal_places=2)
    income_tax_retention = models.DecimalField(
        "Retenci\u00f3n de renta", max_digits=12, decimal_places=2, default=0
    )
    iva_retention = models.DecimalField(
        "Retenci\u00f3n de IVA", max_digits=12, decimal_places=2, default=0
    )
    status = models.CharField(
        "Estado", max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    issued_date = models.DateField("Fecha de emisi\u00f3n", null=True, blank=True)
    due_date = models.DateField("Fecha de vencimiento", null=True, blank=True)
    paid_date = models.DateField("Fecha de pago", null=True, blank=True)
    document = models.FileField(
        "Documento", upload_to="billing/invoices/", blank=True
    )
    notes = models.TextField("Notas", blank=True)

    class Meta:
        verbose_name = "Factura a Cliente"
        verbose_name_plural = "Facturas a Clientes"
        ordering = ["-issued_date"]

    def __str__(self):
        return f"{self.invoice_number} — {self.client.name} ({self.get_status_display()})"


class ViatPayment(BaseModel):
    """Payment tracking for Viat sub-contractor invoices."""

    class Status(models.TextChoices):
        PENDING_OT = "PENDING_OT", "Pendiente de OT firmada"
        OT_SIGNED_WAITING_INVOICE = "OT_SIGNED_WAITING_INVOICE", "OT firmada, esperando factura"
        IN_REVIEW = "IN_REVIEW", "En revisi\u00f3n"
        APPROVED = "APPROVED", "Aprobado"
        PAID = "PAID", "Pagado"
        REJECTED = "REJECTED", "Rechazado"

    work_orders = models.ManyToManyField(
        "work_orders.WorkOrder",
        related_name="viat_payments",
        verbose_name="\u00d3rdenes de trabajo",
    )
    viat_invoice_number = models.CharField(
        "N\u00famero de factura Viat", max_length=50
    )
    viat_invoice_date = models.DateField("Fecha de factura Viat")
    viat_invoice_amount = models.DecimalField(
        "Monto factura Viat", max_digits=12, decimal_places=2
    )
    viat_invoice_document = models.FileField(
        "Documento factura Viat", upload_to="billing/viat_invoices/"
    )
    concept = models.CharField("Concepto", max_length=500)
    agreed_value = models.DecimalField(
        "Valor acordado", max_digits=12, decimal_places=2
    )
    difference = models.DecimalField(
        "Diferencia", max_digits=12, decimal_places=2, default=0
    )
    difference_justification = models.TextField(
        "Justificaci\u00f3n de diferencia", blank=True
    )
    status = models.CharField(
        "Estado", max_length=30, choices=Status.choices, default=Status.PENDING_OT
    )
    rejection_reason = models.TextField("Motivo de rechazo", blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_viat_payments",
        verbose_name="Aprobado por",
    )
    approved_at = models.DateTimeField("Fecha de aprobaci\u00f3n", null=True, blank=True)
    paid_at = models.DateTimeField("Fecha de pago", null=True, blank=True)
    payment_reference = models.CharField(
        "Referencia de pago", max_length=100, blank=True
    )
    payment_proof = models.FileField(
        "Comprobante de pago", upload_to="billing/payment_proofs/", blank=True
    )
    evidence_photos_verified = models.BooleanField(
        "Fotos de evidencia verificadas", default=False
    )
    technical_report_received = models.BooleanField(
        "Informe t\u00e9cnico recibido", default=False
    )

    class Meta:
        verbose_name = "Pago a Viat"
        verbose_name_plural = "Pagos a Viat"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Viat {self.viat_invoice_number} — {self.get_status_display()}"
