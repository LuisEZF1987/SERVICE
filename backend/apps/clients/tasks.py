"""Celery tasks for clients: sending the NDA out for signature."""
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def nda_recipients(client):
    """Where the NDA is sent: the signer contacts, else the institutional email."""
    contacts = client.contacts.filter(is_signer=True).exclude(email="")
    emails = [c.email for c in contacts]
    if not emails:
        contacts = client.contacts.filter(is_primary=True).exclude(email="")
        emails = [c.email for c in contacts]
    if not emails and client.email:
        emails = [client.email]
    return [e for e in dict.fromkeys(emails) if e]


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_nda_for_signature(self, client_id):
    """Email the pre-filled NDA to a client so they can sign and return it.

    Triggered when a client is registered without a signed NDA. Silently does
    nothing if the client already signed or has no email on file — the NDA can
    always be downloaded manually from the client's page.
    """
    from .models import Client
    from .services.nda import nda_filename, render_nda_pdf

    try:
        client = Client.objects.prefetch_related("contacts").get(pk=client_id)
    except Client.DoesNotExist:
        logger.warning("Client %s not found for NDA email", client_id)
        return None

    if client.nda_signed:
        logger.info("Client %s already signed the NDA; skipping email", client.name)
        return None

    recipients = nda_recipients(client)
    if not recipients:
        logger.warning(
            "Client %s has no email on file; NDA not sent", client.name
        )
        return None

    body = render_to_string(
        "clients/email/nda_for_signature.txt",
        {
            "client": client,
            "company_name": settings.COMPANY_LEGAL_NAME,
            "from_email": settings.DEFAULT_FROM_EMAIL,
        },
    )
    email = EmailMessage(
        subject=f"Acuerdo de Confidencialidad para firma — {client.name}",
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
        reply_to=[settings.DEFAULT_FROM_EMAIL],
    )
    try:
        email.attach(nda_filename(client), render_nda_pdf(client), "application/pdf")
        email.send(fail_silently=False)
    except Exception as exc:
        logger.exception("Failed to send NDA to %s", client.name)
        raise self.retry(exc=exc)

    logger.info("Sent NDA for signature to %s (%s)", client.name, recipients)
    return recipients
