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


def _extra_allowed(maintenance):
    """¿Este mantenimiento permite avisar a los correos adicionales (VIAT)?
    Si su plan lo desactiva, solo se notifica internamente."""
    if maintenance is None:
        return True
    try:
        plan = maintenance.equipment.maintenance_plan
    except Exception:
        return True
    return plan.notify_extra_recipients


def _staff_recipients(maintenance=None):
    """Active Dimed admins/coordinators who coordinate maintenance visits.
    Suma los correos adicionales (VIAT) salvo que el plan del equipo los excluya."""
    from apps.accounts.models import User

    qs = (
        User.objects.filter(
            role__in=[User.Role.ADMIN, User.Role.COORDINATOR],
            is_active=True,
        )
        .exclude(email="")
    )
    emails = [u.email for u in qs]
    # Correos adicionales configurables (p. ej. contactos de VIAT).
    if _extra_allowed(maintenance):
        try:
            from .models import NotificationSettings
            emails += NotificationSettings.load().extra_recipients()
        except Exception:
            logger.exception("No se pudieron cargar los correos adicionales")
    return list(dict.fromkeys(emails))  # únicos, preservando orden


def _send_alert(maintenance, days_until):
    recipients = _staff_recipients(maintenance)
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


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def sync_maintenance_to_calendar(self, maintenance_id):
    """Crea/actualiza el evento de Google Calendar de UN mantenimiento (idempotente)."""
    from .models import ScheduledMaintenance
    from .services import gcal

    m = (ScheduledMaintenance.objects
         .select_related("equipment__client").filter(pk=maintenance_id).first())
    if not m:
        return
    try:
        eid = gcal.upsert_event(m)
        if eid and eid != m.gcal_event_id:
            ScheduledMaintenance.objects.filter(pk=m.pk).update(gcal_event_id=eid)
    except Exception as exc:  # red/quota/credencial → reintentar
        logger.exception("Fallo sincronizando mantenimiento %s a Calendar", maintenance_id)
        raise self.retry(exc=exc) from exc


@shared_task
def sync_all_maintenances_to_calendar(only_upcoming=True):
    """Encola la sincronización de los mantenimientos (por defecto pendientes/vencidos)."""
    from .models import ScheduledMaintenance

    qs = ScheduledMaintenance.objects.all()
    if only_upcoming:
        qs = qs.filter(status__in=[ScheduledMaintenance.Status.PENDING,
                                   ScheduledMaintenance.Status.OVERDUE])
    n = 0
    for mid in qs.values_list("id", flat=True):
        sync_maintenance_to_calendar.delay(str(mid))
        n += 1
    return n
