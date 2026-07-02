from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from common.permissions import IsAdminOrCoordinator

from .models import SparePart
from .serializers import SparePartListSerializer, SparePartSerializer


class SparePartViewSet(viewsets.ModelViewSet):
    """CRUD for spare parts inventory."""

    queryset = SparePart.objects.all()
    filterset_fields = ["modality", "manufacturer", "equipment_model", "equipment_series"]
    search_fields = ["part_number", "description", "manufacturer", "equipment_model"]
    ordering_fields = ["part_number", "manufacturer", "unit_cost", "stock_quantity", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return SparePartListSerializer
        return SparePartSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
