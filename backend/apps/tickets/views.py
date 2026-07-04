from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import AuditLog
from apps.accounts.utils import create_audit_log
from common.permissions import IsAdmin

from .models import Ticket, TicketComment
from .serializers import (
    ResolveTicketSerializer,
    TicketCommentSerializer,
    TicketListSerializer,
    TicketSerializer,
)
from .tasks import send_ticket_email


class TicketViewSet(viewsets.ModelViewSet):
    """Support tickets: the case history of every client fault report."""

    queryset = Ticket.objects.select_related(
        "client", "equipment", "assigned_to", "contract"
    ).prefetch_related("comments", "work_orders")
    filterset_fields = ["status", "priority", "channel", "client", "equipment", "assigned_to"]
    search_fields = ["number", "subject", "client__name", "equipment__internal_code"]
    ordering_fields = ["created_at", "priority", "status", "sla_due_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return TicketListSerializer
        if self.action == "resolve":
            return ResolveTicketSerializer
        return TicketSerializer

    def get_permissions(self):
        if self.action == "destroy":
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "CLIENT" and user.client_organization:
            qs = qs.filter(client=user.client_organization)
        elif user.role == "TECHNICIAN":
            qs = qs.filter(assigned_to=user)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        extra = {"created_by": user}
        # Client portal users can only open tickets for their own organization
        if user.role == "CLIENT" and user.client_organization:
            extra["client"] = user.client_organization
            if not serializer.validated_data.get("reported_by_name"):
                extra["reported_by_name"] = user.get_full_name() or user.username
            if not serializer.validated_data.get("reported_by_email") and user.email:
                extra["reported_by_email"] = user.email
        ticket = serializer.save(**extra)
        create_audit_log(
            user=user,
            action=AuditLog.Action.CREATE,
            model_name="Ticket",
            object_id=str(ticket.id),
            details={"number": ticket.number, "subject": ticket.subject},
            request=self.request,
        )
        send_ticket_email.delay(str(ticket.id), "created")

    def _transition(self, request, ticket, new_status, event, **fields):
        ticket.status = new_status
        for name, value in fields.items():
            setattr(ticket, name, value)
        ticket.save()
        create_audit_log(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            model_name="Ticket",
            object_id=str(ticket.id),
            details={"number": ticket.number, "status": new_status},
            request=request,
        )
        send_ticket_email.delay(str(ticket.id), event)
        return Response(TicketSerializer(ticket, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def escalate(self, request, pk=None):
        """Escalate the case (visible urgency + notification)."""
        ticket = self.get_object()
        if ticket.status in (Ticket.Status.RESOLVED, Ticket.Status.CLOSED):
            return Response(
                {"detail": "No se puede escalar un ticket resuelto o cerrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._transition(request, ticket, Ticket.Status.ESCALATED, "escalated")

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status == Ticket.Status.CLOSED:
            return Response(
                {"detail": "El ticket ya está cerrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ResolveTicketSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._transition(
            request,
            ticket,
            Ticket.Status.RESOLVED,
            "resolved",
            resolved_at=timezone.now(),
            resolution_notes=serializer.validated_data.get("resolution_notes", ""),
        )

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status != Ticket.Status.RESOLVED:
            return Response(
                {"detail": "Solo se puede cerrar un ticket resuelto."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._transition(
            request, ticket, Ticket.Status.CLOSED, "closed", closed_at=timezone.now()
        )

    @action(detail=True, methods=["post"])
    def start_progress(self, request, pk=None):
        """Mark the case as being attended."""
        ticket = self.get_object()
        if ticket.status not in (Ticket.Status.OPEN, Ticket.Status.ESCALATED):
            return Response(
                {"detail": "El ticket no está abierto."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ticket.status = Ticket.Status.IN_PROGRESS
        if not ticket.assigned_to:
            ticket.assigned_to = request.user
        ticket.save()
        return Response(TicketSerializer(ticket, context={"request": request}).data)


class TicketCommentViewSet(viewsets.ModelViewSet):
    """Conversation thread of a ticket (create + list; history is immutable)."""

    serializer_class = TicketCommentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = TicketComment.objects.filter(ticket_id=self.kwargs["ticket_pk"])
        if self.request.user.role == "CLIENT":
            qs = qs.filter(is_internal=False)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        is_internal = serializer.validated_data.get("is_internal", False)
        # Client portal users cannot write internal notes
        if user.role == "CLIENT":
            is_internal = False
        comment = serializer.save(
            ticket_id=self.kwargs["ticket_pk"],
            created_by=user,
            is_internal=is_internal,
        )
        send_ticket_email.delay(
            str(comment.ticket_id), "comment", comment_id=str(comment.id)
        )
