from django.contrib import admin

from .models import ClientInvoice, ViatPayment


@admin.register(ClientInvoice)
class ClientInvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "client", "concept", "total", "status", "issued_date"]
    list_filter = ["status"]
    search_fields = ["invoice_number", "client__name", "concept"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["client"]


@admin.register(ViatPayment)
class ViatPaymentAdmin(admin.ModelAdmin):
    list_display = [
        "viat_invoice_number", "concept", "viat_invoice_amount",
        "agreed_value", "status",
    ]
    list_filter = ["status", "evidence_photos_verified", "technical_report_received"]
    search_fields = ["viat_invoice_number", "concept"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["approved_by"]
