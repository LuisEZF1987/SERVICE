"""Test settings — fast, isolated, no external services beyond Postgres."""
from .base import *  # noqa: F401,F403

DEBUG = False

# Tasks run inline is NOT wanted in tests; keep them queued (no-op) so the
# OT flow can be asserted without invoking WeasyPrint or sending email.
# In-memory broker AND result backend keep tests fully independent of Redis
# (.delay() with the redis result backend would try to connect on publish).
CELERY_TASK_ALWAYS_EAGER = False
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"},
}

DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Fast password hashing in tests.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Don't let rate limiting interfere with tests.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {"login": "10000/min"}  # noqa: F405
