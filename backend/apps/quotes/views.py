from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import AuditLog
from apps.accounts.utils import create_audit_log
from apps.work_orders.models import WorkOrder
from common.permissions import IsAdminOrCoordinator

from .models import Quote
from .serializers import (
    AcceptQuoteSerializer,
    GenerateOtSerializer,
    QuoteListSerializer,
    QuoteSerializer,
)
from .tasks import notify_crm, push_quote_advance_charge, send_quote_email


class QuoteViewSet(viewsets.ModelViewSet):
    """Quotations for non-contract services and spare parts.

    Lifecycle: DRAFT → (send) SENT → (accept) ACCEPTED → advance paid →
    generate the work order; the balance is charged when the OT closes.
    """

    queryset = Quote.objects.select_related(
        "client", "equipment", "ticket", "work_order"
    ).prefetch_related("items")
    filterset_fields = ["status", "client", "equipment", "advance_paid"]
    search_fields = ["number", "title", "client__name", "equipment__internal_code"]
    ordering_fields = ["created_at", "valid_until", "status"]

    def get_serializer_class(self):
        if self.action == "list":
            return QuoteListSerializer
        if self.action == "accept":
            return AcceptQuoteSerializer
        if self.action == "generate_ot":
            return GenerateOtSerializer
        return QuoteSerializer

    def get_permissions(self):
        if self.action in (
            "create", "update", "partial_update", "destroy",
            "send", "accept", "reject", "mark_advance_paid", "generate_ot",
        ):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "CLIENT" and user.client_organization:
            qs = qs.filter(client=user.client_organization).exclude(
                status=Quote.Status.DRAFT
            )
        elif user.role == "TECHNICIAN":
            qs = qs.none()
        return qs

    def perform_create(self, serializer):
        quote = serializer.save(created_by=self.request.user)
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            model_name="Quote",
            object_id=str(quote.id),
            details={"number": quote.number, "title": quote.title},
            request=self.request,
        )

    def _full(self, quote):
        return Response(QuoteSerializer(quote, context={"request": self.request}).data)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        """Send the quote: generates the PDF and emails it to the client."""
        quote = self.get_object()
        if quote.status not in (Quote.Status.DRAFT, Quote.Status.SENT):
            return Response(
                {"detail": "Solo se puede enviar una cotización en borrador."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not quote.items.exists():
            return Response(
                {"detail": "Agrega al menos un ítem antes de enviar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quote.status = Quote.Status.SENT
        quote.sent_at = timezone.now()
        quote.save(update_fields=["status", "sent_at"])
        send_quote_email.delay(str(quote.id))
        notify_crm.delay(str(quote.id), "enviada")
        return self._full(quote)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """Register the client's acceptance → charge the advance via CAJA."""
        quote = self.get_object()
        if quote.status != Quote.Status.SENT:
            return Response(
                {"detail": "Solo se puede aceptar una cotización enviada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AcceptQuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quote.status = Quote.Status.ACCEPTED
        quote.accepted_at = timezone.now()
        quote.accepted_by_name = serializer.validated_data["accepted_by_name"]
        quote.save(update_fields=["status", "accepted_at", "accepted_by_name"])
        create_audit_log(
            user=request.user,
            action=AuditLog.Action.APPROVE,
            model_name="Quote",
            object_id=str(quote.id),
            details={"number": quote.number, "accepted_by": quote.accepted_by_name},
            request=request,
        )
        push_quote_advance_charge.delay(str(quote.id))
        notify_crm.delay(str(quote.id), "aceptada")
        return self._full(quote)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        quote = self.get_object()
        if quote.status not in (Quote.Status.SENT, Quote.Status.DRAFT):
            return Response(
                {"detail": "La cotización ya fue resuelta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quote.status = Quote.Status.REJECTED
        quote.rejected_at = timezone.now()
        quote.save(update_fields=["status", "rejected_at"])
        notify_crm.delay(str(quote.id), "rechazada")
        return self._full(quote)

    @action(detail=True, methods=["post"])
    def mark_advance_paid(self, request, pk=None):
        """Coordinator confirms the 50% advance arrived (until CAJA webhooks land)."""
        quote = self.get_object()
        if quote.status != Quote.Status.ACCEPTED:
            return Response(
                {"detail": "La cotización debe estar aceptada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quote.advance_paid = True
        quote.advance_paid_at = timezone.now()
        quote.save(update_fields=["advance_paid", "advance_paid_at"])
        return self._full(quote)

    @action(detail=True, methods=["post"])
    def generate_ot(self, request, pk=None):
        """Create the authorized work order once the advance is received."""
        quote = self.get_object()
        if quote.status != Quote.Status.ACCEPTED:
            return Response(
                {"detail": "La cotización debe estar aceptada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not quote.advance_paid:
            return Response(
                {"detail": "Registra el anticipo antes de generar la OT."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if quote.work_order_id:
            return Response(
                {"detail": f"Esta cotización ya generó la OT {quote.work_order.number}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not quote.equipment_id:
            return Response(
                {"detail": "Asocia un equipo a la cotización para generar la OT."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = GenerateOtSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ot = WorkOrder.objects.create(
            ot_type=WorkOrder.Type.CORRECTIVE,
            priority=WorkOrder.Priority.NORMAL,
            equipment=quote.equipment,
            client=quote.client,
            technician_id=serializer.validated_data["technician"],
            ticket=quote.ticket,
            reported_problem=f"[{quote.number}] {quote.title}\n\n{quote.notes}".strip(),
            created_by=request.user,
        )
        quote.work_order = ot
        quote.save(update_fields=["work_order"])
        from apps.work_orders.serializers import WorkOrderSerializer

        return Response(
            WorkOrderSerializer(ot, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
