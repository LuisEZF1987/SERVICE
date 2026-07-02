"""Celery tasks for preventive maintenance scheduling alerts."""
import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)

# Days-before-due milestones that trigger a reminder email.
ALERT_MILESTONES = [30, 15, 7, 1]


def _staff_recipients():
    """Active Dimed admins/coordinators who coordinate maintenance visits."""
    from apps.accounts.models import User

    qs = (
        User.objects.filter(
            role__in=[User.Role.ADMIN, User.Role.COORDINATOR],
            is_active=True,
        )
        .exclude(email="")
    )
    return [u.email for u in qs]


def _send_alert(maintenance, days_until):
    recipients = _staff_recipients()
    if not recipients:
        logger.warning("No staff recipients for maintenance alert %s", maintenance.pk)
        return False
    overdue = days_until < 0
    context = {"m": maintenance, "days": days_until, "overdue": overdue}
    subject = (
        f"[Mantenimiento] {maintenance.equipment.internal_code} — "
        f"{'VENCIDO' if overdue else f'en {days_until} día(s)'}"
    )
    body = render_to_string("scheduling/email/maintenance_alert.txt", context)
    EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=recipients,
    ).send(fail_silently=True)
    return True


@shared_task
def process_maintenance_schedule():
    """Daily job: send 30/15/7/1-day reminders and flag overdue maintenances.

    Overdue notices are sent exactly once, because marking a maintenance OVERDUE
    removes it from the PENDING queryset this task iterates over on the next run.
    """
    from .models import ScheduledMaintenance

    today = timezone.localdate()
    qs = ScheduledMaintenance.objects.filter(
        status=ScheduledMaintenance.Status.PENDING
    ).select_related("equipment", "equipment__client", "contract")

    alerts = 0
    overdue = 0
    for m in qs:
        days = (m.scheduled_date - today).days

        if days < 0:
            m.status = ScheduledMaintenance.Status.OVERDUE
            m.alert_sent = True
            m.save(update_fields=["status", "alert_sent"])
            _send_alert(m, days)
            overdue += 1
            continue

        reached = [x for x in ALERT_MILESTONES if days <= x]
        already = set(m.alerts_sent or [])
        if any(x not in already for x in reached):
            _send_alert(m, days)
            m.alerts_sent = sorted(already | set(reached))
            m.alert_sent = True
            m.save(update_fields=["alerts_sent", "alert_sent"])
            alerts += 1

    logger.info(
        "Maintenance schedule processed: %s reminder(s), %s overdue", alerts, overdue
    )
    return {"alerts": alerts, "overdue": overdue}
