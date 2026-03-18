from django.contrib import admin

from .models import SparePart


@admin.register(SparePart)
class SparePartAdmin(admin.ModelAdmin):
    list_display = [
        "part_number", "description", "modality", "manufacturer",
        "equipment_model", "stock_quantity", "minimum_stock", "unit_cost",
    ]
    list_filter = ["modality", "manufacturer"]
    search_fields = ["part_number", "description", "manufacturer", "equipment_model"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
