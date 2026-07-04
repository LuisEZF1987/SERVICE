from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import AuditLog
from apps.accounts.utils import create_audit_log
from common.permissions import IsAdminOrCoordinator

from .models import ChecklistExecution, WorkOrder, WorkOrderPhoto, WorkOrderSparePart
from .serializers import (
    ChecklistExecutionSerializer,
    SignWorkOrderSerializer,
    TechnicianSignWorkOrderSerializer,
    WorkOrderListSerializer,
    WorkOrderPhotoSerializer,
    WorkOrderSerializer,
    WorkOrderSparePartSerializer,
)
from .tasks import generate_work_order_pdf, send_work_order_signed_email


class WorkOrderViewSet(viewsets.ModelViewSet):
    """
    CRUD and lifecycle management for Work Orders (OT).
    The OT is the central document of DimedService.
    """

    queryset = WorkOrder.objects.select_related(
        "equipment", "client", "technician", "contract"
    ).prefetch_related("photos", "spare_parts_used", "checklist_items")
    filterset_fields = ["ot_type", "status", "priority", "technician", "client", "equipment"]
    search_fields = ["number", "equipment__internal_code", "client__name"]
    ordering_fields = ["opened_at", "priority", "status", "number"]

    def get_serializer_class(self):
        if self.action == "list":
            return WorkOrderListSerializer
        if self.action == "sign":
            return SignWorkOrderSerializer
        if self.action == "technician_sign":
            return TechnicianSignWorkOrderSerializer
        return WorkOrderSerializer

    def get_permissions(self):
        if self.action in ("create", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.role == "TECHNICIAN":
            # Technicians only see their own assigned OTs
            qs = qs.filter(technician=user)
        elif user.role == "CLIENT" and user.client_organization:
            # Client portal: only their OTs
            qs = qs.filter(client=user.client_organization)

        return qs

    def perform_create(self, serializer):
        ot = serializer.save(created_by=self.request.user)
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            model_name="WorkOrder",
            object_id=str(ot.id),
            details={"number": ot.number, "type": ot.ot_type},
            request=self.request,
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Technician starts working on the OT."""
        ot = self.get_object()
        if ot.status != WorkOrder.Status.OPEN:
            return Response(
                {"detail": "Solo se puede iniciar una OT abierta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ot.status = WorkOrder.Status.IN_PROGRESS
        ot.arrival_at = timezone.now()
        ot.started_at = timezone.now()
        ot.save(update_fields=["status", "arrival_at", "started_at"])
        return Response(WorkOrderSerializer(ot).data)

    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        """Technician finishes the work, OT goes to pending signature."""
        ot = self.get_object()
        if ot.status != WorkOrder.Status.IN_PROGRESS:
            return Response(
                {"detail": "Solo se puede finalizar una OT en ejecución."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ot.status = WorkOrder.Status.PENDING_SIGNATURE
        ot.finished_at = timezone.now()
        ot.save(update_fields=["status", "finished_at", "total_hours"])
        return Response(WorkOrderSerializer(ot).data)

    @action(detail=True, methods=["post"])
    def technician_sign(self, request, pk=None):
        """Capture the assigned technician's signature (rubric) on the OT."""
        ot = self.get_object()
        serializer = TechnicianSignWorkOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ot.technician_signature = serializer.validated_data["technician_signature"]
        ot.technician_signed_at = timezone.now()
        ot.save(update_fields=["technician_signature", "technician_signed_at"])
        return Response(WorkOrderSerializer(ot).data)

    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        """Client signs the OT with a rubric."""
        ot = self.get_object()
        if ot.status != WorkOrder.Status.PENDING_SIGNATURE:
            return Response(
                {"detail": "La OT debe estar pendiente de firma."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SignWorkOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ot.client_signature = serializer.validated_data["client_signature"]
        ot.client_signer_name = serializer.validated_data["client_signer_name"]
        ot.client_signer_position = serializer.validated_data["client_signer_position"]
        ot.signed_at = timezone.now()
        ot.status = WorkOrder.Status.SIGNED
        ot.save(update_fields=[
            "client_signature", "client_signer_name", "client_signer_position",
            "signed_at", "status",
        ])

        create_audit_log(
            user=request.user,
            action=AuditLog.Action.SIGN,
            model_name="WorkOrder",
            object_id=str(ot.id),
            details={
                "number": ot.number,
                "signer": ot.client_signer_name,
            },
            request=request,
        )

        # Generate the signed OT PDF and email it to the client's signers
        # and to Dimed staff (runs async via Celery; eager in local/dev).
        send_work_order_signed_email.delay(str(ot.id))

        return Response(WorkOrderSerializer(ot).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminOrCoordinator])
    def close(self, request, pk=None):
        """Admin/Coordinator closes and locks the OT."""
        ot = self.get_object()
        if not ot.can_be_closed:
            return Response(
                {"detail": "La OT debe estar firmada y tener un resultado para cerrarse."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ot.status = WorkOrder.Status.CLOSED
        ot.closed_at = timezone.now()
        ot.save(update_fields=["status", "closed_at"])

        create_audit_log(
            user=request.user,
            action=AuditLog.Action.APPROVE,
            model_name="WorkOrder",
            object_id=str(ot.id),
            details={"number": ot.number, "action": "closed"},
            request=request,
        )

        # Regenerate the final, locked PDF for the closed OT.
        generate_work_order_pdf.delay(str(ot.id))

        return Response(WorkOrderSerializer(ot).data)


class LockedWorkOrderGuardMixin:
    """Rejects mutations on nested OT resources once the OT is signed or closed.

    Evidence (photos, checklist, spare parts) is part of the record the client
    signed — it must not change afterwards.
    """

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in SAFE_METHODS:
            locked = WorkOrder.objects.filter(
                pk=self.kwargs["ot_pk"],
                status__in=[WorkOrder.Status.SIGNED, WorkOrder.Status.CLOSED],
            ).exists()
            if locked:
                raise PermissionDenied(
                    "Las evidencias de una OT firmada o cerrada no pueden modificarse."
                )


class WorkOrderPhotoViewSet(LockedWorkOrderGuardMixin, viewsets.ModelViewSet):
    """Photos attached to a work order."""

    serializer_class = WorkOrderPhotoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WorkOrderPhoto.objects.filter(work_order_id=self.kwargs["ot_pk"])

    def perform_create(self, serializer):
        serializer.save(
            work_order_id=self.kwargs["ot_pk"],
            created_by=self.request.user,
        )


class WorkOrderSparePartViewSet(LockedWorkOrderGuardMixin, viewsets.ModelViewSet):
    """Spare parts used in a work order."""

    serializer_class = WorkOrderSparePartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WorkOrderSparePart.objects.filter(work_order_id=self.kwargs["ot_pk"])

    def perform_create(self, serializer):
        serializer.save(
            work_order_id=self.kwargs["ot_pk"],
            created_by=self.request.user,
        )


class ChecklistExecutionViewSet(LockedWorkOrderGuardMixin, viewsets.ModelViewSet):
    """Checklist items executed during a work order."""

    serializer_class = ChecklistExecutionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChecklistExecution.objects.filter(work_order_id=self.kwargs["ot_pk"])

    def perform_create(self, serializer):
        serializer.save(
            work_order_id=self.kwargs["ot_pk"],
            created_by=self.request.user,
        )
