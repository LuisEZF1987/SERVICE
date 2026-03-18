from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AuditLog, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "get_full_name", "role", "company_type", "is_active", "date_joined"]
    list_filter = ["role", "company_type", "is_active"]
    search_fields = ["username", "first_name", "last_name", "email"]

    fieldsets = BaseUserAdmin.fieldsets + (
        ("DimedService", {
            "fields": ("role", "company_type", "phone", "position", "is_2fa_enabled",
                       "privacy_policy_accepted_at", "client_organization"),
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("DimedService", {
            "fields": ("role", "company_type", "first_name", "last_name", "email",
                       "phone", "position"),
        }),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "user", "action", "model_name", "ip_address"]
    list_filter = ["action", "model_name"]
    search_fields = ["user__username", "model_name", "details"]
    readonly_fields = ["id", "user", "action", "model_name", "object_id",
                       "details", "ip_address", "user_agent", "timestamp"]
    date_hierarchy = "timestamp"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
