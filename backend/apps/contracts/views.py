from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from common.permissions import IsAdminOrCoordinator
from .models import Contract
from .serializers import ContractListSerializer, ContractSerializer


class ContractViewSet(viewsets.ModelViewSet):
    """CRUD for service contracts."""

    queryset = Contract.objects.select_related("client").all()
    filterset_fields = ["contract_type", "status", "client"]
    search_fields = ["number", "client__name", "sercop_reference"]
    ordering_fields = ["number", "start_date", "end_date", "status", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return ContractListSerializer
        return ContractSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
