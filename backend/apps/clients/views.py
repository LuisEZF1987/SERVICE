from django.db.models import Count
from rest_framework import viewsets

from rest_framework.permissions import IsAuthenticated

from common.permissions import IsAdminOrCoordinator
from .models import Client, ClientContact
from .serializers import ClientContactSerializer, ClientListSerializer, ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """CRUD for client institutions."""

    queryset = Client.objects.annotate(equipment_count=Count("equipment"))
    filterset_fields = ["client_type", "status", "city", "nda_signed"]
    search_fields = ["name", "ruc", "city"]
    ordering_fields = ["name", "city", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return ClientListSerializer
        return ClientSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAdminOrCoordinator()]

    def get_queryset(self):
        qs = super().get_queryset()
        # Client portal users only see their own organization
        if self.request.user.role == "CLIENT" and self.request.user.client_organization:
            qs = qs.filter(id=self.request.user.client_organization_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ClientContactViewSet(viewsets.ModelViewSet):
    """CRUD for contacts within a client institution."""

    serializer_class = ClientContactSerializer
    permission_classes = [IsAdminOrCoordinator]

    def get_queryset(self):
        return ClientContact.objects.filter(client_id=self.kwargs["client_pk"])

    def perform_create(self, serializer):
        serializer.save(
            client_id=self.kwargs["client_pk"],
            created_by=self.request.user,
        )
