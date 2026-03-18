from django.contrib import admin

from .models import MaintenanceTemplate, TechnicalManual


@admin.register(TechnicalManual)
class TechnicalManualAdmin(admin.ModelAdmin):
    list_display = ["brand", "model_name", "modality", "language"]
    list_filter = ["modality", "brand"]
    search_fields = ["brand", "model_name"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]


@admin.register(MaintenanceTemplate)
class MaintenanceTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "brand", "model_name", "modality", "template_type", "status"]
    list_filter = ["modality", "template_type", "status"]
    search_fields = ["name", "brand", "model_name"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["approved_by"]
