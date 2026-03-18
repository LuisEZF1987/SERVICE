from django.contrib import admin

from .models import Contract


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = [
        "number", "client", "contract_type", "start_date", "end_date",
        "total_value", "status",
    ]
    list_filter = ["contract_type", "status"]
    search_fields = ["number", "client__name", "sercop_reference"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["client"]
    date_hierarchy = "start_date"
