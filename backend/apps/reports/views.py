"""PDF report generation.

Reports are rendered on demand with WeasyPrint (same engine as the OT PDF)
and streamed back as application/pdf — no persistent models needed.
"""
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.equipment.models import Equipment
from apps.scheduling.models import ScheduledMaintenance
from apps.work_orders.models import WorkOrder
from common.branding import company_logo_data_uri


def _render_pdf(template, context, filename):
    # Lazy import: WeasyPrint's native stack only exists in the containers/CI.
    from weasyprint import HTML

    context["generated_at"] = timezone.localtime()
    context["logo_uri"] = company_logo_data_uri()
    html = render_to_string(template, context)
    pdf = HTML(string=html).write_pdf()
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return response


def _check_client_access(user, client_id):
    """Client portal users can only generate reports for their own org."""
    if user.role == "CLIENT" and user.client_organization_id != client_id:
        raise PermissionDenied("No tiene acceso a este recurso.")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maintenance_certificate(request, ot_id):
    """Certificate that the service documented in a signed OT was performed."""
    ot = get_object_or_404(
        WorkOrder.objects.select_related("equipment", "client", "technician", "contract"),
        pk=ot_id,
    )
    _check_client_access(request.user, ot.client_id)
    if ot.status not in (WorkOrder.Status.SIGNED, WorkOrder.Status.CLOSED):
        return Response(
            {"detail": "El certificado solo se emite para OTs firmadas o cerradas."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    next_maintenance = (
        ScheduledMaintenance.objects.filter(
            equipment=ot.equipment,
            status=ScheduledMaintenance.Status.PENDING,
        )
        .order_by("scheduled_date")
        .first()
    )
    return _render_pdf(
        "reports/pdf/maintenance_certificate.html",
        {"ot": ot, "equipment": ot.equipment, "client": ot.client,
         "next_maintenance": next_maintenance},
        f"certificado-{ot.number}.pdf",
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def service_report(request, ot_id):
    """Technical service report — the narrative document sent the day after
    the visit (many clients request it in addition to the signed OT)."""
    ot = get_object_or_404(
        WorkOrder.objects.select_related(
            "equipment", "client", "technician", "contract"
        ).prefetch_related("checklist_items", "spare_parts_used", "photos"),
        pk=ot_id,
    )
    _check_client_access(request.user, ot.client_id)
    if not ot.finished_at:
        return Response(
            {"detail": "El informe se emite cuando el trabajo está finalizado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from apps.work_orders.services.pdf import photo_thumbnail_data_uri

    photos = []
    for p in ot.photos.all():
        uri = photo_thumbnail_data_uri(p.photo)
        if uri:
            photos.append(
                {"uri": uri, "type_display": p.get_photo_type_display(), "caption": p.caption}
            )
    checklist = list(ot.checklist_items.all())
    spare_parts = list(ot.spare_parts_used.all())
    return _render_pdf(
        "reports/pdf/service_report.html",
        {
            "ot": ot,
            "equipment": ot.equipment,
            "client": ot.client,
            "checklist": checklist,
            "checklist_ok": sum(1 for c in checklist if c.completed),
            "spare_parts": spare_parts,
            "photos": photos,
        },
        f"informe-{ot.number}.pdf",
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def equipment_history(request, equipment_id):
    """Full service history of one equipment: every OT plus upcoming visits."""
    equipment = get_object_or_404(
        Equipment.objects.select_related("client", "contract"), pk=equipment_id
    )
    _check_client_access(request.user, equipment.client_id)

    work_orders = list(
        equipment.work_orders.select_related("technician").order_by("-opened_at")
    )
    upcoming = list(
        equipment.scheduled_maintenances.filter(
            status__in=[
                ScheduledMaintenance.Status.PENDING,
                ScheduledMaintenance.Status.OVERDUE,
            ]
        ).order_by("scheduled_date")
    )
    total_hours = sum((float(ot.total_hours or 0) for ot in work_orders), 0.0)
    return _render_pdf(
        "reports/pdf/equipment_history.html",
        {
            "equipment": equipment,
            "client": equipment.client,
            "work_orders": work_orders,
            "upcoming": upcoming,
            "total_hours": total_hours,
        },
        f"historial-{equipment.internal_code}.pdf",
    )
