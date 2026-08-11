"""Assign real internal codes to equipment saved with a placeholder.

Before the code became auto-generated, the form pre-filled "DIM-" and the
validation only checked the prefix, so an equipment could be saved with the
bare prefix as its code.
"""
from django.db import migrations

MODALITY_CODES = {
    "XRAY_FIXED": "RX",
    "XRAY_PORTABLE": "RXP",
    "CT": "TAC",
    "MRI": "RM",
    "ULTRASOUND": "US",
    "MAMMOGRAPH": "MAMO",
    "FLUOROSCOPE": "FLUORO",
    "DENSITOMETER": "DENSI",
    "OTHER": "GEN",
}


def _next_code(Equipment, modality):
    prefix = f"DIM-{MODALITY_CODES.get(modality, 'GEN')}-"
    highest = 0
    for code in Equipment.objects.filter(
        internal_code__startswith=prefix
    ).values_list("internal_code", flat=True):
        suffix = code[len(prefix):]
        if suffix.isdigit():
            highest = max(highest, int(suffix))
    return f"{prefix}{highest + 1:03d}"


def fix_placeholder_codes(apps, schema_editor):
    Equipment = apps.get_model("equipment", "Equipment")
    broken = [
        eq
        for eq in Equipment.objects.all()
        if not eq.internal_code or eq.internal_code.strip("- ").upper() == "DIM"
    ]
    for equipment in broken:
        equipment.internal_code = _next_code(Equipment, equipment.modality)
        equipment.save(update_fields=["internal_code"])


def noop(apps, schema_editor):
    """Codes are identifiers now in use; reverting would break traceability."""


class Migration(migrations.Migration):

    dependencies = [
        ("equipment", "0003_alter_equipment_internal_code"),
    ]

    operations = [
        migrations.RunPython(fix_placeholder_codes, noop),
    ]
