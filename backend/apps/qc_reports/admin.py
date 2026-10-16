from django.contrib import admin

from .models import QCReport, QCReportPhoto


class QCReportPhotoInline(admin.TabularInline):
    model = QCReportPhoto
    extra = 0


@admin.register(QCReport)
class QCReportAdmin(admin.ModelAdmin):
    list_display = ["number", "work_order", "practice", "status", "overall_result", "issued_at", "signed_at"]
    list_filter = ["practice", "status", "overall_result"]
    search_fields = ["number", "work_order__number", "work_order__client__name"]
    readonly_fields = ["number", "issued_at", "signed_at"]
    inlines = [QCReportPhotoInline]
