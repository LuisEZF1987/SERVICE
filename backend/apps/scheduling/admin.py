from django.contrib import admin

from .models import ScheduledMaintenance


@admin.register(ScheduledMaintenance)
class ScheduledMaintenanceAdmin(admin.ModelAdmin):
    list_display = [
        "equipment", "scheduled_date", "frequency", "status",
        "contract", "work_order", "alert_sent",
    ]
    list_filter = ["frequency", "status", "alert_sent"]
    search_fields = ["equipment__internal_code", "equipment__serial_number"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["equipment", "contract", "work_order"]
    date_hierarchy = "scheduled_date"
