from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from common.permissions import IsAdminOrCoordinator

from .models import ScheduledMaintenance
from .serializers import ScheduledMaintenanceListSerializer, ScheduledMaintenanceSerializer


def _ics_escape(value):
    """Escape text for the iCalendar format (RFC 5545)."""
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def calendar_export(request):
    """Download the maintenance schedule as an .ics calendar file.

    All-day events for pending/overdue maintenances — importable into
    Google Calendar, Outlook or Apple Calendar.
    """
    maintenances = (
        ScheduledMaintenance.objects.filter(
            status__in=[
                ScheduledMaintenance.Status.PENDING,
                ScheduledMaintenance.Status.OVERDUE,
            ]
        )
        .select_related("equipment", "equipment__client")
        .order_by("scheduled_date")
    )
    stamp = timezone.now().strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//DimedService//Cronograma de Mantenimientos//ES",
        "CALSCALE:GREGORIAN",
        "X-WR-CALNAME:Mantenimientos Dimed Healthcare",
    ]
    for m in maintenances:
        eq = m.equipment
        summary = _ics_escape(
            f"Mantenimiento {m.get_frequency_display().lower()} — {eq.internal_code} ({eq.client.name})"
        )
        description = _ics_escape(
            f"Equipo: {eq.brand} {eq.model_name}\n"
            f"Cliente: {eq.client.name}\n"
            f"Ubicación: {eq.area or '—'} · {eq.city}\n"
            f"Estado: {m.get_status_display()}"
        )
        date = m.scheduled_date.strftime("%Y%m%d")
        lines += [
            "BEGIN:VEVENT",
            f"UID:sm-{m.id}@dimedservice",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{date}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{description}",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    response = HttpResponse("\r\n".join(lines), content_type="text/calendar; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="cronograma-dimedservice.ics"'
    return response


class ScheduledMaintenanceViewSet(viewsets.ModelViewSet):
    """CRUD for scheduled preventive maintenance entries."""

    queryset = ScheduledMaintenance.objects.select_related(
        "equipment", "equipment__client", "work_order",
    ).all()
    filterset_fields = ["status", "frequency", "equipment"]
    search_fields = [
        "equipment__internal_code", "equipment__serial_number",
        "equipment__brand", "equipment__client__name",
    ]
    ordering_fields = ["scheduled_date", "status", "created_at"]
    ordering = ["scheduled_date"]

    def get_serializer_class(self):
        if self.action == "list":
            return ScheduledMaintenanceListSerializer
        return ScheduledMaintenanceSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
