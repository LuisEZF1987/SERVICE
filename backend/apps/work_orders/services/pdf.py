"""PDF generation for Work Orders using WeasyPrint.

The rendered PDF is the official service record (OT) certifying the work
performed by Dimed Healthcare. Signature images are embedded as base64 data
URIs so rendering works identically with local storage (dev) and S3 (prod),
without WeasyPrint needing filesystem or network access to the media backend.
"""
import base64
import mimetypes

from django.template.loader import render_to_string
from django.utils import timezone


def image_data_uri(field):
    """Read an ImageField/FileField from its storage and return a base64 data URI.

    Returns None if the field is empty or the underlying file cannot be read.
    """
    if not field:
        return None
    try:
        field.open("rb")
        try:
            data = field.read()
        finally:
            field.close()
    except (FileNotFoundError, ValueError, OSError):
        return None
    mime, _ = mimetypes.guess_type(field.name)
    mime = mime or "image/png"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def build_work_order_context(work_order):
    """Build the template context for the work order PDF."""
    spare_parts = list(work_order.spare_parts_used.all())
    return {
        "ot": work_order,
        "equipment": work_order.equipment,
        "client": work_order.client,
        "technician": work_order.technician,
        "contract": work_order.contract,
        "checklist_items": list(work_order.checklist_items.all()),
        "spare_parts": spare_parts,
        "total_spare_parts_cost": sum((sp.total_cost for sp in spare_parts), 0),
        "client_signature_uri": image_data_uri(work_order.client_signature),
        "technician_signature_uri": image_data_uri(work_order.technician_signature),
        "generated_at": timezone.localtime(),
    }


def render_work_order_pdf(work_order) -> bytes:
    """Render the work order to PDF bytes."""
    # Imported lazily so importing this module never requires the native
    # WeasyPrint stack (only present in the backend/celery containers).
    from weasyprint import HTML

    context = build_work_order_context(work_order)
    html_string = render_to_string("work_orders/pdf/work_order.html", context)
    return HTML(string=html_string).write_pdf()
