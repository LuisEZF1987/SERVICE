from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from common.permissions import IsAdminOrCoordinator
from .models import ScheduledMaintenance
from .serializers import ScheduledMaintenanceListSerializer, ScheduledMaintenanceSerializer


class ScheduledMaintenanceViewSet(viewsets.ModelViewSet):
    """CRUD for scheduled preventive maintenance entries."""

    queryset = ScheduledMaintenance.objects.select_related(
        "equipment", "equipment__client", "work_order",
    ).all()
    filterset_fields = ["status", "frequency", "equipment"]
    search_fields = [
        "equipment__internal_code", "equipment__serial_number",
        "equipment__brand", "equipment__client__name",
    ]
    ordering_fields = ["scheduled_date", "status", "created_at"]
    ordering = ["scheduled_date"]

    def get_serializer_class(self):
        if self.action == "list":
            return ScheduledMaintenanceListSerializer
        return ScheduledMaintenanceSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
