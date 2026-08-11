"""Rendering of the confidentiality agreement (NDA) sent to clients for signature."""
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from common.branding import company_logo_data_uri

NDA_TEMPLATE = "reports/pdf/nda.html"


def client_signer(client):
    """Who signs for the client: the registered legal representative, else the
    contact flagged as signer. Returns {name, position} or None."""
    if client.legal_representative:
        return {
            "name": client.legal_representative,
            "position": client.legal_representative_role or "Representante Legal",
        }
    contact = next((c for c in client.contacts.all() if c.is_signer), None)
    if contact:
        return {"name": contact.name, "position": contact.position}
    return None


def nda_context(client):
    """Template context for the NDA: client, signer and company identity."""
    return {
        "client": client,
        "signer": client_signer(client),
        "nda_validity_years": settings.NDA_VALIDITY_YEARS,
        "company": {
            "legal_name": settings.COMPANY_LEGAL_NAME,
            "ruc": settings.COMPANY_RUC,
            "address": settings.COMPANY_ADDRESS,
            "city": settings.COMPANY_CITY,
            "representative": settings.COMPANY_REPRESENTATIVE,
            "representative_role": settings.COMPANY_REPRESENTATIVE_ROLE,
        },
        "generated_at": timezone.localtime(),
        "logo_uri": company_logo_data_uri(),
    }


def render_nda_pdf(client):
    """Return the NDA as PDF bytes, pre-filled with the client's data."""
    # Lazy import: WeasyPrint's native stack only exists in the containers/CI.
    from weasyprint import HTML

    html = render_to_string(NDA_TEMPLATE, nda_context(client))
    return HTML(string=html).write_pdf()


def nda_filename(client):
    return f"NDA-{client.ruc}.pdf"
