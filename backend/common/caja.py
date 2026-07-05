"""Client for the CAJA billing hub — the suite's integration pattern.

Every Dimed system pushes charges ("cargos") to CAJA via
POST /api/integration/cargos with an X-Service-Key header; CAJA consolidates
them into SRI invoices and CONTABILIDAD pulls the accounting feed from CAJA.
Idempotency is guaranteed by (source_product, source_ref).

Disabled (no-op) until CAJA_API_URL and CAJA_SERVICE_KEY are set in the env.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

SOURCE_PRODUCT = "dimedservice"


def caja_enabled():
    return bool(settings.CAJA_API_URL and settings.CAJA_SERVICE_KEY)


def push_cargo(*, ruc, description, amount, source_ref, tax_rate=15):
    """Push one charge to CAJA. Returns True if accepted, False otherwise."""
    if not caja_enabled():
        logger.info("CAJA no configurada; cargo omitido (%s)", source_ref)
        return False

    payload = {
        "source_product": SOURCE_PRODUCT,
        "cargo": {
            "patient_document": ruc,
            "description": description[:500],
            "quantity": 1,
            "unit_price": float(amount),
            "tax_rate": tax_rate,
            "source_product": SOURCE_PRODUCT,
            "source_ref": source_ref,
        },
    }
    request = urllib.request.Request(
        settings.CAJA_API_URL.rstrip("/") + "/api/integration/cargos",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Service-Key": settings.CAJA_SERVICE_KEY,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            ok = 200 <= response.status < 300
    except urllib.error.URLError as exc:
        logger.error("Error enviando cargo a CAJA (%s): %s", source_ref, exc)
        raise
    if ok:
        logger.info("Cargo enviado a CAJA: %s ($%s)", source_ref, amount)
    return ok
