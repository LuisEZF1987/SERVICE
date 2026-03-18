from django.contrib import admin

from .models import Client, ClientContact


class ClientContactInline(admin.TabularInline):
    model = ClientContact
    extra = 1


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ["name", "ruc", "client_type", "city", "status", "nda_signed"]
    list_filter = ["client_type", "status", "nda_signed", "city"]
    search_fields = ["name", "ruc"]
    inlines = [ClientContactInline]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
