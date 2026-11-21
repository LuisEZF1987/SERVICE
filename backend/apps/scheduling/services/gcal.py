"""Sincronización de mantenimientos con Google Calendar.

- Lazy: las librerías de Google y la credencial solo se cargan al sincronizar, de
  modo que un fallo de configuración nunca tumba la app.
- Idempotente: cada ScheduledMaintenance guarda su `gcal_event_id`; se hace
  insert/patch/delete según corresponda. Re-sincronizar no duplica.
- Evento de DÍA COMPLETO en la fecha programada (sin líos de zona horaria), con
  recordatorio de 7 días (email + popup) y los correos adicionales como invitados.
"""
import logging

from django.conf import settings

log = logging.getLogger(__name__)
SCOPES = ["https://www.googleapis.com/auth/calendar"]
REMINDER_MIN = 7 * 24 * 60  # 7 días en minutos


def enabled():
    return bool(getattr(settings, "GOOGLE_CALENDAR_ENABLED", False))


def _service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds = service_account.Credentials.from_service_account_file(
        settings.GOOGLE_CALENDAR_SA_JSON, scopes=SCOPES
    )
    if settings.GOOGLE_CALENDAR_IMPERSONATE:
        creds = creds.with_subject(settings.GOOGLE_CALENDAR_IMPERSONATE)
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _event_body(m):
    from datetime import timedelta
    from apps.scheduling.models import NotificationSettings

    e = m.equipment
    tipo = m.get_cost_type_display() if m.cost_type else m.get_frequency_display()
    summary = f"Mantenimiento V{m.visit_number or '-'} — {e.internal_code} {e.brand} {e.model_name}"
    description = (
        f"Cliente: {e.client.name}\n"
        f"Equipo: {e.brand} {e.model_name} (S/N {e.serial_number})\n"
        f"Visita: {m.visit_number or '—'} · Tipo: {tipo}\n"
        f"{m.notes or ''}"
    ).strip()
    try:
        invitados = NotificationSettings.load().extra_recipients()
    except Exception:
        invitados = []
    return {
        "summary": summary,
        "description": description,
        "start": {"date": m.scheduled_date.isoformat()},
        "end": {"date": (m.scheduled_date + timedelta(days=1)).isoformat()},
        "transparency": "transparent",
        "attendees": [{"email": a} for a in invitados],
        "reminders": {"useDefault": False, "overrides": [
            {"method": "email", "minutes": REMINDER_MIN},
            {"method": "popup", "minutes": REMINDER_MIN},
        ]},
    }


def upsert_event(m):
    """Crea o actualiza el evento del mantenimiento. Devuelve el event_id (o None)."""
    if not enabled():
        return None
    svc = _service()
    cal = settings.GOOGLE_CALENDAR_ID
    body = _event_body(m)
    if m.gcal_event_id:
        try:
            svc.events().patch(calendarId=cal, eventId=m.gcal_event_id,
                               body=body, sendUpdates="all").execute()
            return m.gcal_event_id
        except Exception:
            log.warning("patch falló para %s; se crea de nuevo", m.gcal_event_id)
    ev = svc.events().insert(calendarId=cal, body=body, sendUpdates="all").execute()
    return ev["id"]


def delete_event(m):
    if not (enabled() and m.gcal_event_id):
        return
    try:
        _service().events().delete(calendarId=settings.GOOGLE_CALENDAR_ID,
                                   eventId=m.gcal_event_id, sendUpdates="all").execute()
    except Exception:
        log.warning("No se pudo borrar el evento %s", m.gcal_event_id)
