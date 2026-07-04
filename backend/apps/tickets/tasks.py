"""Email notifications for ticket updates.

Every ticket event is emailed with the ticket number in the subject, so the
whole case history is traceable both in the app and in each inbox.
"""
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

EVENT_LABELS = {
    "created": "Nuevo ticket",
    "comment": "Nuevo comentario",
    "escalated": "Ticket escalado",
    "resolved": "Ticket resuelto",
    "closed": "Ticket cerrado",
}


def _staff_recipients(ticket):
    from apps.accounts.models import User

    qs = (
        User.objects.filter(
            role__in=[User.Role.ADMIN, User.Role.COORDINATOR],
            is_active=True,
        )
        .exclude(email="")
    )
    emails = [u.email for u in qs]
    if ticket.assigned_to and ticket.assigned_to.email:
        emails.append(ticket.assigned_to.email)
    return emails


def _client_recipients(ticket):
    if ticket.reported_by_email:
        return [ticket.reported_by_email]
    contacts = ticket.client.contacts.filter(is_primary=True).exclude(email="")
    emails = [c.email for c in contacts]
    if not emails and ticket.client.email:
        emails = [ticket.client.email]
    return emails


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_ticket_email(self, ticket_id, event, comment_id=None):
    """Notify staff (and the client, unless internal) about a ticket event."""
    from .models import Ticket, TicketComment

    try:
        ticket = Ticket.objects.select_related(
            "client", "equipment", "assigned_to", "contract"
        ).get(pk=ticket_id)
    except Ticket.DoesNotExist:
        logger.warning("Ticket %s not found for email", ticket_id)
        return None

    comment = None
    if comment_id:
        comment = TicketComment.objects.filter(pk=comment_id).first()

    internal_only = bool(comment and comment.is_internal)
    recipients = list(_staff_recipients(ticket))
    if not internal_only:
        recipients += _client_recipients(ticket)
    recipients = [r for r in dict.fromkeys(recipients) if r]
    if not recipients:
        logger.warning("No recipients for ticket %s email", ticket.number)
        return False

    event_label = EVENT_LABELS.get(event, "Actualización")
    subject = f"[{ticket.number}] {event_label} — {ticket.subject}"
    body = render_to_string(
        "tickets/email/ticket_update.txt",
        {"ticket": ticket, "event_label": event_label, "comment": comment},
    )
    EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    ).send(fail_silently=False)
    logger.info("Sent ticket %s email (%s) to %s", ticket.number, event, recipients)
    return True
