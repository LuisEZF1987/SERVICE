from django.contrib import admin

from .models import Quote, QuoteItem


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 0


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = [
        "number", "title", "client", "status", "advance_paid",
        "valid_until", "created_at",
    ]
    list_filter = ["status", "advance_paid"]
    search_fields = ["number", "title", "client__name"]
    readonly_fields = [
        "number", "sent_at", "accepted_at", "rejected_at",
        "created_at", "updated_at", "created_by", "updated_by",
    ]
    raw_id_fields = ["client", "equipment", "ticket", "work_order"]
    inlines = [QuoteItemInline]
    date_hierarchy = "created_at"
