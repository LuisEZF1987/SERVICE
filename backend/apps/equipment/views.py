from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from common.permissions import IsAdminOrCoordinator
from .models import Equipment
from .serializers import EquipmentListSerializer, EquipmentSerializer


class EquipmentViewSet(viewsets.ModelViewSet):
    """CRUD for medical equipment inventory."""

    queryset = Equipment.objects.select_related("client", "contract").all()
    filterset_fields = ["modality", "status", "brand", "client", "city"]
    search_fields = ["internal_code", "serial_number", "brand", "model_name", "client__name"]
    ordering_fields = ["internal_code", "brand", "created_at", "status"]

    def get_serializer_class(self):
        if self.action == "list":
            return EquipmentListSerializer
        return EquipmentSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        # Client portal users only see their own equipment
        user = self.request.user
        if user.role == "CLIENT" and user.client_organization:
            qs = qs.filter(client=user.client_organization)
        # Technicians see all equipment (they need to for assigned OTs)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
