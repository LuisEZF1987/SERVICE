from rest_framework import viewsets

from common.permissions import IsAdminOrCoordinator, IsDimedStaff

from .models import TechnicalManual
from .serializers import TechnicalManualSerializer


class TechnicalManualViewSet(viewsets.ModelViewSet):
    """Technical documentation library.

    Any Dimed staff member (including field technicians) can browse and open
    manuals; only admins/coordinators manage them. Client portal users have
    no access — this is internal documentation.
    """

    queryset = TechnicalManual.objects.select_related(
        "equipment_model", "equipment_model__manufacturer", "equipment_series"
    )
    serializer_class = TechnicalManualSerializer
    filterset_fields = [
        "document_type", "modality", "brand", "equipment_model", "equipment_series",
    ]
    search_fields = ["title", "brand", "model_name", "notes"]
    ordering_fields = ["brand", "model_name", "document_type", "created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsDimedStaff()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
