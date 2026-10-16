"""Daily calibration-expiry alerts for Dimed's measuring instruments."""
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone

from .models import ALERT_MILESTONES, MeasuringInstrument

logger = logging.getLogger(__name__)

# Milestone stored once the due date has passed, so the expiry notice is sent once.
EXPIRED_MILESTONE = 0


def _staff_recipients():
    """Active Dimed admins/coordinators (the RSR receives them as admin)."""
    from apps.accounts.models import User

    qs = User.objects.filter(
        role__in=[User.Role.ADMIN, User.Role.COORDINATOR], is_active=True
    ).exclude(email="")
    return [u.email for u in qs]


def _send_alert(instrument, days):
    recipients = _staff_recipients()
    if not recipients:
        logger.warning("No staff recipients for calibration alert %s", instrument.pk)
        return False
    expired = days < 0
    subject = (
        f"[Calibración] {instrument.name} S/N {instrument.serial_number} — "
        f"{'VENCIDA' if expired else f'vence en {days} día(s)'}"
    )
    body = render_to_string(
        "instruments/email/calibration_alert.txt",
        {"i": instrument, "days": days, "expired": expired},
    )
    EmailMessage(
        subject=subject, body=body, from_email=settings.DEFAULT_FROM_EMAIL, to=recipients
    ).send(fail_silently=True)
    return True


@shared_task
def process_calibration_alerts():
    """Email 90/30/7-day reminders and a single expiry notice per due date."""
    today = timezone.localdate()
    qs = MeasuringInstrument.objects.filter(
        requires_calibration=True, calibration_due_date__isnull=False
    ).exclude(status=MeasuringInstrument.Status.RETIRED)

    sent = 0
    for instrument in qs:
        days = (instrument.calibration_due_date - today).days
        already = set(instrument.alerts_sent or [])
        if days < 0:
            reached = {EXPIRED_MILESTONE}
        else:
            reached = {m for m in ALERT_MILESTONES if days <= m}
        # Only the most urgent pending milestone is emailed: an instrument
        # registered 20 days before expiry gets one 30-day notice, not two.
        if reached - already:
            _send_alert(instrument, days)
            instrument.alerts_sent = sorted(already | reached)
            instrument.save(update_fields=["alerts_sent", "updated_at"])
            sent += 1

    logger.info("Calibration alerts processed: %s email(s)", sent)
    return {"alerts": sent}
