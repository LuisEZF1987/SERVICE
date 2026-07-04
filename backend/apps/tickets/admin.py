from django.contrib import admin

from .models import Ticket, TicketComment


class TicketCommentInline(admin.TabularInline):
    model = TicketComment
    extra = 0
    readonly_fields = ["created_at", "created_by"]


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = [
        "number", "subject", "client", "equipment", "priority",
        "status", "assigned_to", "sla_due_at", "created_at",
    ]
    list_filter = ["status", "priority", "channel"]
    search_fields = ["number", "subject", "client__name", "equipment__internal_code"]
    readonly_fields = ["number", "created_at", "updated_at", "created_by", "updated_by"]
    raw_id_fields = ["client", "equipment", "contract", "assigned_to"]
    inlines = [TicketCommentInline]
    date_hierarchy = "created_at"
