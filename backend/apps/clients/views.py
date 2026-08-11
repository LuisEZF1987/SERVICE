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
from .tasks import nda_recipients, send_nda_for_signature


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
        client = serializer.save(created_by=self.request.user)
        # A new client starts inactive until the NDA is signed, so send it out
        # for signature right away. The task is a no-op without an email.
        if not client.nda_signed:
            send_nda_for_signature.delay(str(client.id))

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(
        detail=True,
        methods=["post"],
        url_path="nda/send",
        permission_classes=[IsAdminOrCoordinator],
    )
    def send_nda(self, request, pk=None):
        """Re-send the NDA for signature (the same email sent on registration)."""
        client = self.get_object()
        if client.nda_signed:
            return Response(
                {"detail": "El cliente ya tiene el NDA firmado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        recipients = nda_recipients(client)
        if not recipients:
            return Response(
                {"detail": "El cliente no tiene un correo registrado. "
                           "Añada un contacto firmante o el email institucional."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        send_nda_for_signature.delay(str(client.id))
        return Response({"detail": f"NDA enviado a {', '.join(recipients)}."})

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
