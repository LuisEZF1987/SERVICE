"""Office server settings (server01).

Hardened like production but served over plain HTTP on a private network
(office LAN + Tailscale), so the TLS-only settings stay off. Files live on
a local Docker volume instead of S3.
"""
from .base import *  # noqa: F401,F403

DEBUG = False

# Private-network hardening (no TLS termination here)
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Local volume storage; nginx serves /media/ directly
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Real email only when SendGrid is configured; otherwise log to console
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
    if env("SENDGRID_API_KEY", default="")  # noqa: F405
    else "django.core.mail.backends.console.EmailBackend"
)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
