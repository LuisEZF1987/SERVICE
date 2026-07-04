"""Celery tasks for work orders: PDF generation and email notifications."""
import logging

from celery import shared_task
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


def _load_work_order(work_order_id):
    from .models import WorkOrder

    return (
        WorkOrder.objects.select_related(
            "equipment", "client", "technician", "contract"
        )
        .prefetch_related("checklist_items", "spare_parts_used", "photos")
        .get(pk=work_order_id)
    )


def _read_pdf_bytes(work_order):
    """Return the stored PDF bytes, or None if missing/unreadable."""
    if not work_order.pdf_document:
        return None
    try:
        work_order.pdf_document.open("rb")
        try:
            return work_order.pdf_document.read()
        finally:
            work_order.pdf_document.close()
    except (FileNotFoundError, ValueError, OSError):
        return None


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_work_order_pdf(self, work_order_id):
    """Render the OT to PDF and store it on the work order."""
    from .models import WorkOrder
    from .services.pdf import render_work_order_pdf

    try:
        ot = _load_work_order(work_order_id)
    except WorkOrder.DoesNotExist:
        logger.warning("WorkOrder %s not found for PDF generation", work_order_id)
        return None

    pdf_bytes = render_work_order_pdf(ot)
    ot.pdf_document.save(f"{ot.number}.pdf", ContentFile(pdf_bytes), save=True)
    logger.info("Generated PDF for WorkOrder %s", ot.number)
    return ot.pdf_document.name


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_work_order_signed_email(self, work_order_id, notify_client=True):
    """Ensure the OT PDF exists, then email it to Dimed staff and the client."""
    from .models import WorkOrder
    from .services.notifications import send_work_order_email
    from .services.pdf import render_work_order_pdf

    try:
        ot = _load_work_order(work_order_id)
    except WorkOrder.DoesNotExist:
        logger.warning("WorkOrder %s not found for email", work_order_id)
        return None

    pdf_bytes = _read_pdf_bytes(ot)
    if pdf_bytes is None:
        pdf_bytes = render_work_order_pdf(ot)
        ot.pdf_document.save(f"{ot.number}.pdf", ContentFile(pdf_bytes), save=True)

    sent = send_work_order_email(ot, pdf_bytes, notify_client=notify_client)
    if sent and not ot.signature_email_sent:
        ot.signature_email_sent = True
        ot.save(update_fields=["signature_email_sent"])
    return sent
