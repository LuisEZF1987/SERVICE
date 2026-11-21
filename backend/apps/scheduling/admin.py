from django.contrib import admin

from .models import MaintenancePlan, NotificationSettings, ScheduledMaintenance


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    list_display = ["__str__", "extra_email_1", "extra_email_2", "notify_days_before"]

    def has_add_permission(self, request):
        # Singleton: solo una configuración.
        return not NotificationSettings.objects.exists()


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
    actions = ["sincronizar_calendar"]

    @admin.action(description="Sincronizar a Google Calendar")
    def sincronizar_calendar(self, request, queryset):
        from .services import gcal
        if not gcal.enabled():
            self.message_user(request, "Google Calendar está desactivado (GOOGLE_CALENDAR_ENABLED).")
            return
        ok = err = 0
        for m in queryset:
            try:
                eid = gcal.upsert_event(m)
                if eid and eid != m.gcal_event_id:
                    ScheduledMaintenance.objects.filter(pk=m.pk).update(gcal_event_id=eid)
                ok += 1
            except Exception:
                err += 1
        self.message_user(request, f"Google Calendar — sincronizados: {ok}, errores: {err}.")


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
