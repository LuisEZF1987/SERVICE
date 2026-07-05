"""Company branding assets for generated documents (PDFs)."""
import base64
from functools import lru_cache
from pathlib import Path

from django.conf import settings

LOGO_PATH = Path(settings.BASE_DIR) / "assets" / "logo-dimed.png"


@lru_cache(maxsize=1)
def company_logo_data_uri():
    """Full-color company logo as a data URI, or None if the asset is missing.

    Embedded as base64 so WeasyPrint renders it without filesystem/network
    access to static storage.
    """
    try:
        data = LOGO_PATH.read_bytes()
    except OSError:
        return None
    return "data:image/png;base64," + base64.b64encode(data).decode("ascii")
