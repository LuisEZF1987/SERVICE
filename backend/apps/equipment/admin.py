from django.contrib import admin

from .models import Equipment


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = [
        "internal_code", "brand", "model_name", "modality",
        "client", "city", "status",
    ]
    list_filter = ["modality", "status", "brand", "city"]
    search_fields = ["internal_code", "serial_number", "brand", "model_name"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["client", "contract", "maintenance_template"]
