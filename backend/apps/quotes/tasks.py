"""Celery tasks for quotes: PDF, client email, CAJA charges and CRM notice."""
import json
import logging
import urllib.error
import urllib.request

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

from common.caja import push_cargo

logger = logging.getLogger(__name__)


def _load_quote(quote_id):
    from .models import Quote

    return Quote.objects.select_related(
        "client", "equipment", "ticket", "work_order"
    ).prefetch_related("items").get(pk=quote_id)


def render_quote_pdf(quote) -> bytes:
    from django.utils import timezone
    from weasyprint import HTML

    from common.branding import company_logo_data_uri

    html = render_to_string(
        "quotes/pdf/quote.html",
        {
            "quote": quote,
            "client": quote.client,
            "items": list(quote.items.all()),
            "logo_uri": company_logo_data_uri(),
            "generated_at": timezone.localtime(),
        },
    )
    return HTML(string=html).write_pdf()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_quote_email(self, quote_id):
    """Generate the quote PDF and email it to the client's contacts."""
    from .models import Quote

    try:
        quote = _load_quote(quote_id)
    except Quote.DoesNotExist:
        logger.warning("Quote %s not found for email", quote_id)
        return None

    pdf_bytes = render_quote_pdf(quote)
    quote.pdf_document.save(f"{quote.number}.pdf", ContentFile(pdf_bytes), save=True)

    contacts = quote.client.contacts.filter(is_primary=True).exclude(email="")
    recipients = [c.email for c in contacts]
    if not recipients and quote.client.email:
        recipients = [quote.client.email]
    if not recipients:
        logger.warning("Quote %s has no client recipients", quote.number)
        return False

    body = render_to_string("quotes/email/quote_sent.txt", {"quote": quote})
    email = EmailMessage(
        subject=f"Cotización {quote.number} — Dimed Healthcare",
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    email.attach(f"{quote.number}.pdf", pdf_bytes, "application/pdf")
    email.send(fail_silently=False)
    logger.info("Quote %s emailed to %s", quote.number, recipients)
    return True


@shared_task(bind=True, max_retries=5, default_retry_delay=120)
def push_quote_advance_charge(self, quote_id):
    """Charge the 50% advance to CAJA when the quote is accepted."""
    from .models import Quote

    try:
        quote = _load_quote(quote_id)
    except Quote.DoesNotExist:
        return None
    try:
        return push_cargo(
            ruc=quote.client.ruc,
            description=f"Anticipo {quote.advance_percent}% — Cotización {quote.number}: {quote.title}",
            amount=quote.advance_amount,
            source_ref=f"COT:{quote.number}:ANTICIPO",
            tax_rate=int(quote.iva_rate),
        )
    except urllib.error.URLError as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=5, default_retry_delay=120)
def push_quote_balance_charge(self, quote_id):
    """Charge the remaining balance to CAJA when the linked OT closes."""
    from .models import Quote

    try:
        quote = _load_quote(quote_id)
    except Quote.DoesNotExist:
        return None
    try:
        return push_cargo(
            ruc=quote.client.ruc,
            description=f"Saldo — Cotización {quote.number}: {quote.title}",
            amount=quote.balance_amount,
            source_ref=f"COT:{quote.number}:SALDO",
            tax_rate=int(quote.iva_rate),
        )
    except urllib.error.URLError as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=5, default_retry_delay=120)
def push_contract_visit_charge(self, work_order_id):
    """Charge the contract's per-visit value when a scheduled preventive OT closes."""
    from apps.work_orders.models import WorkOrder

    try:
        ot = WorkOrder.objects.select_related("contract", "client").get(pk=work_order_id)
    except WorkOrder.DoesNotExist:
        return None
    contract = ot.contract
    if not contract or not contract.value_per_visit:
        return False
    try:
        return push_cargo(
            ruc=ot.client.ruc,
            description=(
                f"Mantenimiento preventivo {ot.number} — contrato {contract.number}"
            ),
            amount=contract.value_per_visit,
            source_ref=f"OT:{ot.number}",
        )
    except urllib.error.URLError as exc:
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_crm(self, quote_id, event):
    """Optional webhook to the CRM (activates once CRM_WEBHOOK_URL is set and
    the CRM's `integrations` app exposes the receiving endpoint)."""
    if not settings.CRM_WEBHOOK_URL:
        return False
    from .models import Quote

    try:
        quote = _load_quote(quote_id)
    except Quote.DoesNotExist:
        return None
    payload = {
        "source": "dimedservice",
        "event": event,
        "cotizacion": quote.number,
        "titulo": quote.title,
        "cliente_ruc": quote.client.ruc,
        "cliente_nombre": quote.client.name,
        "total": float(quote.total),
        "estado": quote.status,
    }
    request = urllib.request.Request(
        settings.CRM_WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return 200 <= response.status < 300
    except urllib.error.URLError as exc:
        logger.warning("CRM webhook failed for %s: %s", quote.number, exc)
        raise self.retry(exc=exc) from exc
