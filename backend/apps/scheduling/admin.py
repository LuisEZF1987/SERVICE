from django.contrib import admin

from .models import MaintenancePlan, ScheduledMaintenance


@admin.register(ScheduledMaintenance)
class ScheduledMaintenanceAdmin(admin.ModelAdmin):
    list_display = [
        "equipment", "scheduled_date", "visit_number", "cost_type", "status",
        "contract", "work_order", "alert_sent",
    ]
    list_filter = ["frequency", "cost_type", "status", "alert_sent"]
    search_fields = ["equipment__internal_code", "equipment__serial_number"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by", "gcal_event_id"]
    raw_id_fields = ["equipment", "contract", "work_order"]
    date_hierarchy = "scheduled_date"


@admin.register(MaintenancePlan)
class MaintenancePlanAdmin(admin.ModelAdmin):
    list_display = [
        "equipment", "anchor_date", "frequency", "total_visits",
        "free_visits", "completed_visits", "post_warranty_type", "active",
    ]
    list_filter = ["frequency", "post_warranty_type", "active"]
    search_fields = ["equipment__internal_code", "equipment__serial_number", "contract_reference"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["equipment", "contract"]
    actions = ["regenerar_cronograma"]

    @admin.action(description="Regenerar cronograma de las visitas")
    def regenerar_cronograma(self, request, queryset):
        total_c = total_a = 0
        for plan in queryset:
            c, a = plan.generate_schedule()
            total_c += c; total_a += a
        self.message_user(request, f"Visitas: {total_c} creadas, {total_a} actualizadas.")
