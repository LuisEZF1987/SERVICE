"""Email notifications for work orders."""
import logging

from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _dimed_recipients():
    """Active Dimed admins/coordinators that should receive a copy of every OT."""
    from apps.accounts.models import User

    qs = (
        User.objects.filter(
            role__in=[User.Role.ADMIN, User.Role.COORDINATOR],
            is_active=True,
        )
        .exclude(email="")
    )
    return [u.email for u in qs]


def _client_signer_recipients(work_order):
    """Client contacts authorized to sign; fall back to the institutional email."""
    contacts = work_order.client.contacts.filter(is_signer=True).exclude(email="")
    emails = [c.email for c in contacts]
    if not emails and work_order.client.email:
        emails = [work_order.client.email]
    return emails


def send_work_order_email(work_order, pdf_bytes, notify_client=True):
    """Send the OT PDF to Dimed staff and (optionally) the client's signers.

    Returns True if an email was dispatched, False if there were no recipients.
    """
    recipients = list(_dimed_recipients())
    if notify_client:
        recipients += _client_signer_recipients(work_order)
    # De-duplicate while preserving order, drop empties.
    recipients = [r for r in dict.fromkeys(recipients) if r]
    if not recipients:
        logger.warning("No recipients for WorkOrder %s email", work_order.number)
        return False

    subject = f"Orden de Trabajo {work_order.number} — {work_order.client.name}"
    body = render_to_string(
        "work_orders/email/work_order_signed.txt", {"ot": work_order}
    )
    email = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    )
    email.attach(f"OT-{work_order.number}.pdf", pdf_bytes, "application/pdf")
    email.send(fail_silently=False)
    logger.info("Sent WorkOrder %s email to %s", work_order.number, recipients)
    return True
