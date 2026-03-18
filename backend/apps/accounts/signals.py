from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.dispatch import receiver

from .models import AuditLog
from .utils import create_audit_log, get_client_ip


@receiver(user_login_failed)
def log_failed_login(sender, credentials, request, **kwargs):
    """Log failed login attempts."""
    if request:
        AuditLog.objects.create(
            user=None,
            action=AuditLog.Action.LOGIN_FAILED,
            details={"username": credentials.get("username", "")},
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )


@receiver(user_logged_in)
def log_successful_login(sender, request, user, **kwargs):
    """Log successful logins via Django session auth (admin)."""
    if request:
        create_audit_log(
            user=user,
            action=AuditLog.Action.LOGIN,
            request=request,
        )
