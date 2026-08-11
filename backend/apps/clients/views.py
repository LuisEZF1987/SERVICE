from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsAdminOrCoordinator

from .models import Client, ClientContact
from .serializers import (
    ClientContactSerializer,
    ClientListSerializer,
    ClientSerializer,
    NDAUploadSerializer,
)


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

    @action(
        detail=True,
        methods=["post"],
        url_path="nda",
        permission_classes=[IsAdminOrCoordinator],
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_nda(self, request, pk=None):
        """Register the signed NDA and activate the client in one step."""
        client = self.get_object()
        serializer = NDAUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client.nda_document = serializer.validated_data["nda_document"]
        client.nda_signed_date = serializer.validated_data["nda_signed_date"]
        client.nda_signed = True
        client.status = Client.Status.ACTIVE
        client.updated_by = request.user
        client.save()
        return Response(ClientSerializer(client).data, status=status.HTTP_200_OK)


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
