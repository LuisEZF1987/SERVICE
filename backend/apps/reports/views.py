"""PDF report generation.

Reports are rendered on demand with WeasyPrint (same engine as the OT PDF)
and streamed back as application/pdf — no persistent models needed.
"""
import re

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.services.nda import nda_filename, render_nda_pdf
from apps.equipment.models import Equipment
from apps.scheduling.models import ScheduledMaintenance
from apps.spare_parts.models import SparePart
from apps.work_orders.models import WorkOrder
from common.branding import company_logo_data_uri


def _norm(s):
    return re.sub(r"[^A-Z0-9]", "", (s or "").upper())


def _stock_para_equipo(equipment):
    """Repuestos en inventario para el modelo del equipo: mismo fabricante y
    modelo coincidente (subcadena en cualquier sentido); si el repuesto no fija
    modelo, se incluye por modalidad igual."""
    emodel = _norm(equipment.model_name)
    emod = equipment.modality
    out = []
    qs = SparePart.objects.filter(manufacturer__iexact=equipment.brand).order_by("part_number")
    for p in qs:
        pmodel = _norm(p.equipment_model)
        if (pmodel and (pmodel in emodel or emodel in pmodel)) or (not pmodel and p.modality == emod):
            out.append(p)
    return out


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
def nda_agreement(request, client_id):
    """Confidentiality agreement pre-filled with the client's data, ready to print
    and sign. Available before the NDA exists — that is precisely its purpose."""
    client = get_object_or_404(
        Client.objects.prefetch_related("contacts"), pk=client_id
    )
    _check_client_access(request.user, client.id)

    pdf = render_nda_pdf(client)
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{nda_filename(client)}"'
    return response


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
        equipment.work_orders.select_related("technician")
        .prefetch_related("spare_parts_used")
        .order_by("-opened_at")
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

    # Partes/accesorios reemplazados en este equipo (de sus OTs), con fecha.
    parts_used = []
    for ot in work_orders:
        fecha = ot.finished_at or ot.closed_at or ot.opened_at
        for sp in ot.spare_parts_used.all():
            parts_used.append({
                "fecha": fecha, "ot": ot.number, "descripcion": sp.description,
                "codigo": sp.code, "cantidad": sp.quantity,
            })
    parts_used.sort(key=lambda x: x["fecha"] or timezone.now(), reverse=True)

    # Repuestos en inventario para el MODELO de este equipo (mismo fabricante +
    # modelo coincidente; si el repuesto no fija modelo, se usa la modalidad).
    stock = _stock_para_equipo(equipment)

    return _render_pdf(
        "reports/pdf/equipment_history.html",
        {
            "equipment": equipment,
            "client": equipment.client,
            "work_orders": work_orders,
            "upcoming": upcoming,
            "total_hours": total_hours,
            "parts_used": parts_used,
            "stock": stock,
        },
        f"historial-{equipment.internal_code}.pdf",
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maintenance_schedule(request, equipment_id):
    """Cronograma de mantenimiento de UN equipo (para imprimir/enviar al cliente)."""
    equipment = get_object_or_404(
        Equipment.objects.select_related("client"), pk=equipment_id
    )
    _check_client_access(request.user, equipment.client_id)
    items = list(equipment.scheduled_maintenances.order_by("scheduled_date"))
    return _render_pdf(
        "reports/pdf/maintenance_schedule.html",
        {"client": equipment.client,
         "groups": [{"equipment": equipment, "items": items}],
         "title": f"Cronograma de mantenimiento — {equipment.internal_code}"},
        f"cronograma-{equipment.internal_code}.pdf",
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def client_maintenance_schedule(request, client_id):
    """Cronograma de un cliente. Opcional ?equipment=<id>,<id> para seleccionar equipos."""
    client = get_object_or_404(Client, pk=client_id)
    _check_client_access(request.user, client.id)
    eq_qs = client.equipment.order_by("internal_code")
    sel = request.query_params.get("equipment")
    if sel:
        eq_qs = eq_qs.filter(pk__in=[x for x in sel.split(",") if x])
    groups = [{"equipment": e,
               "items": list(e.scheduled_maintenances.order_by("scheduled_date"))}
              for e in eq_qs]
    return _render_pdf(
        "reports/pdf/maintenance_schedule.html",
        {"client": client, "groups": groups,
         "title": f"Cronograma de mantenimiento — {client.name}"},
        f"cronograma-{(client.ruc or str(client.id))}.pdf",
    )


# ── Cronograma en .ics (el cliente lo importa a su propio calendario) ──────────
def _ics_escape(s):
    return (str(s or "").replace("\\", "\\\\").replace("\n", "\\n")
            .replace(",", "\\,").replace(";", "\\;"))


def _ics_for_groups(groups, calname):
    from datetime import timedelta

    from django.http import HttpResponse
    from django.utils import timezone

    stamp = timezone.now().strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0",
             "PRODID:-//Dimed Healthcare//DimedService//ES",
             "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
             f"X-WR-CALNAME:{_ics_escape(calname)}"]
    for g in groups:
        e = g["equipment"]
        for m in g["items"]:
            if m.status in ("COMPLETED", "CANCELLED"):
                continue  # solo visitas futuras/pendientes
            d = m.scheduled_date
            tipo = m.get_cost_type_display() if m.cost_type else m.get_frequency_display()
            summary = (f"Mantenimiento V{m.visit_number or '-'} — "
                       f"{e.internal_code} {e.brand} {e.model_name}")
            desc = (f"Cliente: {e.client.name} | Equipo: {e.brand} {e.model_name} "
                    f"(S/N {e.serial_number}) | Tipo: {tipo}. {m.notes or ''}")
            lines += [
                "BEGIN:VEVENT", f"UID:{m.id}@dimedservice", f"DTSTAMP:{stamp}",
                f"DTSTART;VALUE=DATE:{d.strftime('%Y%m%d')}",
                f"DTEND;VALUE=DATE:{(d + timedelta(days=1)).strftime('%Y%m%d')}",
                f"SUMMARY:{_ics_escape(summary)}",
                f"DESCRIPTION:{_ics_escape(desc)}",
                "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY",
                "DESCRIPTION:Recordatorio de mantenimiento", "END:VALARM",
                "END:VEVENT",
            ]
    lines.append("END:VCALENDAR")
    body = "\r\n".join(lines) + "\r\n"
    resp = HttpResponse(body, content_type="text/calendar; charset=utf-8")
    return resp


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def maintenance_schedule_ics(request, equipment_id):
    equipment = get_object_or_404(Equipment.objects.select_related("client"), pk=equipment_id)
    _check_client_access(request.user, equipment.client_id)
    groups = [{"equipment": equipment,
               "items": list(equipment.scheduled_maintenances.order_by("scheduled_date"))}]
    resp = _ics_for_groups(groups, f"Cronograma {equipment.internal_code}")
    resp["Content-Disposition"] = f'attachment; filename="cronograma-{equipment.internal_code}.ics"'
    return resp


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def client_maintenance_schedule_ics(request, client_id):
    client = get_object_or_404(Client, pk=client_id)
    _check_client_access(request.user, client.id)
    eq_qs = client.equipment.order_by("internal_code")
    sel = request.query_params.get("equipment")
    if sel:
        eq_qs = eq_qs.filter(pk__in=[x for x in sel.split(",") if x])
    groups = [{"equipment": e,
               "items": list(e.scheduled_maintenances.order_by("scheduled_date"))}
              for e in eq_qs]
    resp = _ics_for_groups(groups, f"Cronograma {client.name}")
    resp["Content-Disposition"] = f'attachment; filename="cronograma-{(client.ruc or client.id)}.ics"'
    return resp
