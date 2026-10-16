"""PDF rendering for quality-control reports (formats 9.1.1–9.1.6).

The PDF is generated unsigned; the technician signs it electronically
(FirmaEC) outside the system and uploads the signed file, which becomes the
official report delivered to the user institution.
"""
from django.template.loader import render_to_string
from django.utils import timezone

from apps.work_orders.services.pdf import photo_thumbnail_data_uri
from common.branding import company_logo_data_uri

from ..protocols import FAIL, NOT_APPLICABLE, PASS, PROTOCOLS, photo_slots

RESULT_LABELS = {PASS: "Cumple", FAIL: "No cumple", NOT_APPLICABLE: "N/A"}

COMPANY = {
    "name": "DIMED HEALTHCARE S.A.",
    "ruc": "1793193550001",
    "address": "Av. Shyris N35-174 y Calle Suecia, Edificio Renazzo Plaza, oficina 801, Quito – Pichincha",
    "phone": "02-2241058 / (+593) 99 298 2522",
    "contact": "Luis Enrique Zambrano Ferrer — Representante Legal y RSR — presidencia@dimedhealthcare.com",
}


def _number(value):
    """Parse a technician-typed number ('0,35', ' 12.4 ') or return None."""
    if value in (None, ""):
        return None
    try:
        return float(str(value).strip().replace(",", "."))
    except ValueError:
        return None


def _fmt(value, digits=2):
    return f"{value:.{digits}f}".rstrip("0").rstrip(".") if value is not None else ""


def hvl_rows(hvl):
    """HVL table rows with the % of the unfiltered dose (D0) filled in."""
    rows = hvl.get("rows", []) if hvl else []
    d0 = _number(rows[0].get("dose")) if rows else None
    out = []
    for row in rows:
        dose = _number(row.get("dose"))
        pct = _fmt(dose / d0 * 100, 1) if (dose is not None and d0) else ""
        out.append({"thickness": row.get("thickness", ""), "dose": row.get("dose", ""), "pct": pct})
    return out


def radiation_rows(levels):
    """Radiation-level rows with the net value (measured − background)."""
    out = []
    for row in (levels or {}).get("rows", []):
        measured = _number(row.get("measured"))
        background = _number(row.get("background"))
        net = None
        if measured is not None:
            net = max(measured - (background or 0), 0)
        out.append({**row, "net": _fmt(net, 3), "result_label": RESULT_LABELS.get(row.get("result"), "")})
    return out


def build_qc_report_context(report):
    protocol = PROTOCOLS[report.practice]
    images = {}
    for photo in report.photos.all():
        uri = photo_thumbnail_data_uri(photo.image, max_px=1100, quality=75)
        if uri:
            images.setdefault(photo.slot, []).append({"uri": uri, "caption": photo.caption})
    slots = [{"slot": s, "label": label, "images": images.get(s, [])} for s, label in photo_slots(report.practice)]

    tests = [{**t, "result_label": RESULT_LABELS.get(t.get("result"), "")} for t in report.tests]
    mammo = report.mammo_score or {}
    mammo_rows = [{**r, "result_label": RESULT_LABELS.get(r.get("result"), "")} for r in mammo.get("rows", [])]

    work_order = report.work_order
    return {
        "logo_uri": company_logo_data_uri(),
        "company": COMPANY,
        "report": report,
        "protocol": protocol,
        "work_order": work_order,
        "technician": work_order.technician,
        "tests": tests,
        "hvl": report.hvl,
        "hvl_rows": hvl_rows(report.hvl),
        "hvl_result_label": RESULT_LABELS.get((report.hvl or {}).get("result"), ""),
        "mammo": mammo,
        "mammo_rows": mammo_rows,
        "mammo_overall_label": RESULT_LABELS.get(mammo.get("overall"), ""),
        "radiation_rows": radiation_rows(report.radiation_levels),
        "radiation": report.radiation_levels or {},
        "photo_slots": slots,
        "generated_at": timezone.localtime(),
    }


def render_qc_report_html(report) -> str:
    return render_to_string("qc_reports/pdf/qc_report.html", build_qc_report_context(report))


def render_qc_report_pdf(report) -> bytes:
    # Imported lazily: the native WeasyPrint stack only exists in the
    # backend/celery containers.
    from weasyprint import HTML

    return HTML(string=render_qc_report_html(report)).write_pdf()
