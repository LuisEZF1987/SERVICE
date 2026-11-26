from django.contrib import admin

from .models import ChecklistExecution, WorkOrder, WorkOrderPhoto, WorkOrderSparePart


class WorkOrderPhotoInline(admin.TabularInline):
    model = WorkOrderPhoto
    extra = 0


class WorkOrderSparePartInline(admin.TabularInline):
    model = WorkOrderSparePart
    extra = 0


class ChecklistExecutionInline(admin.TabularInline):
    model = ChecklistExecution
    extra = 0


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    def has_delete_permission(self, request, obj=None):
        # OT firmada/cerrada = documento oficial: no se elimina (tampoco por acción masiva)
        if obj is not None and obj.status in (WorkOrder.Status.SIGNED, WorkOrder.Status.CLOSED):
            return False
        return super().has_delete_permission(request, obj)

    def get_actions(self, request):
        acciones = super().get_actions(request)
        acciones.pop("delete_selected", None)   # el borrado masivo no pasa por las reglas
        return acciones

    list_display = [
        "number", "ot_type", "priority", "status", "equipment",
        "client", "technician", "opened_at",
    ]
    list_filter = ["ot_type", "status", "priority"]
    search_fields = ["number", "equipment__internal_code", "client__name"]
    readonly_fields = [
        "number", "opened_at", "closed_at", "total_hours",
        "created_at", "updated_at", "created_by", "updated_by",
    ]
    raw_id_fields = ["equipment", "client", "contract", "technician", "template_version"]
    inlines = [WorkOrderPhotoInline, WorkOrderSparePartInline, ChecklistExecutionInline]
    date_hierarchy = "opened_at"
