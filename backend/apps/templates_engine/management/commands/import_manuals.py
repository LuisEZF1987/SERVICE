"""Bulk-import self-contained HTML manuals from a folder tree.

Expected layout (the Dimed/Allengers Dropbox convention):

    <root>/
      <MODELO - Familia>/                 e.g. "HF59R - Digiscan"
        <VARIANTE - detalle>/             optional level, e.g. "S20 - 6KW"
          1Pre-Instalacion/  2Service Manual/  3User Manual/
          4Capacitacion/     5Catalogo/        6Datasheet/   7HTML/
            *-EMBEBIDO.html

Creates/reuses the catalog entries (Manufacturer -> EquipmentModel ->
EquipmentSeries) and one TechnicalManual per *-EMBEBIDO.html file.
Idempotent: files already imported (same title + type + model) are skipped.

Usage:
    python manage.py import_manuals --root /app/manuales/allengers --brand Allengers
"""
import re
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from apps.equipment.catalog_models import EquipmentModel, EquipmentSeries, Manufacturer
from apps.templates_engine.models import TechnicalManual

DocType = TechnicalManual.DocumentType

# Modality by model code (first token of the model folder name)
MODALITY_BY_MODEL = {
    "HF49R": "FLUOROSCOPE",
    "HF59+": "FLUOROSCOPE",
    "HF59R": "FLUOROSCOPE",
    "MAM-VENUS+": "MAMMOGRAPH",
    "MARS32DR": "XRAY_PORTABLE",
    "MARS50": "XRAY_FIXED",
    "MARS80": "FLUOROSCOPE",
}

DOC_DIRS = {
    "1": None,  # 1Pre-Instalacion: decided per file (form vs manual)
    "2": DocType.SERVICE_MANUAL,
    "3": DocType.USER_MANUAL,
    "4": DocType.TRAINING,
    "5": DocType.BROCHURE,
    "6": DocType.DATASHEET,
    "7": None,  # 7HTML: classified by filename keywords
}

KEYWORD_RULES = [
    (("wiring", "calibration", "callibration", "troubleshooting", "work instruction",
      "installation manual", "mantenimiento", "service"), DocType.SERVICE_MANUAL),
    (("user manual", "usuario", "software"), DocType.USER_MANUAL),
    (("datasheet", "ficha", "specification"), DocType.DATASHEET),
    (("brochure",), DocType.BROCHURE),
]


def norm(value):
    """Normalize names for fuzzy matching: 'HF 59R' == 'HF59R'."""
    return re.sub(r"[\s\-_+]", "", value).lower()


def classify_free_file(filename):
    name = filename.lower()
    for keywords, doc_type in KEYWORD_RULES:
        if any(k in name for k in keywords):
            return doc_type
    return DocType.OTHER


def classify(doc_dir_name, filename):
    prefix = doc_dir_name[:1]
    fixed = DOC_DIRS.get(prefix)
    if fixed:
        return fixed
    if prefix == "1":
        return (
            DocType.PRE_INSTALL_FORM
            if filename.lower().startswith("formulario")
            else DocType.PRE_INSTALL_MANUAL
        )
    return classify_free_file(filename)


def clean_title(filename):
    title = re.sub(r"-?EMBEBIDO", "", Path(filename).stem, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", title.replace("-", " ").replace("_", " ")).strip()[:300]


class Command(BaseCommand):
    help = "Importa manuales HTML autocontenidos desde una carpeta estructurada."

    def add_arguments(self, parser):
        parser.add_argument("--root", required=True, help="Carpeta raíz de la marca")
        parser.add_argument("--brand", default="Allengers", help="Nombre del fabricante")
        parser.add_argument("--dry-run", action="store_true", help="Solo mostrar el plan")

    def handle(self, *args, **options):
        root = Path(options["root"])
        if not root.is_dir():
            raise CommandError(f"No existe la carpeta: {root}")
        brand = options["brand"]
        dry = options["dry_run"]

        manufacturer = None
        if not dry:
            manufacturer, _ = Manufacturer.objects.get_or_create(name=brand)

        created = skipped = 0
        for model_dir in sorted(p for p in root.iterdir() if p.is_dir()):
            parts = [p.strip() for p in model_dir.name.split(" - ", 1)]
            code, family = parts[0], (parts[1] if len(parts) > 1 else "")
            modality = MODALITY_BY_MODEL.get(code, "OTHER")

            cat_model = None
            if not dry:
                cat_model = self._get_or_create_model(manufacturer, code, modality)

            subdirs = [p for p in model_dir.iterdir() if p.is_dir()]
            doc_dirs = [d for d in subdirs if d.name[:1].isdigit()]
            variant_dirs = [d for d in subdirs if not d.name[:1].isdigit()]

            if doc_dirs:
                # Single-variant model: the family is the series (if present)
                series = None
                if not dry and cat_model and family:
                    series = self._get_or_create_series(cat_model, family)
                c, s = self._import_docs(
                    doc_dirs, brand, code, family, modality, cat_model, series, dry
                )
                created += c
                skipped += s

            for variant_dir in variant_dirs:
                variant_code = variant_dir.name.split(" - ", 1)[0].strip()
                series_name = f"{family} {variant_code}".strip() if family else variant_code
                series = None
                if not dry and cat_model:
                    series = self._get_or_create_series(cat_model, series_name)
                v_doc_dirs = [p for p in variant_dir.iterdir() if p.is_dir()]
                c, s = self._import_docs(
                    v_doc_dirs, brand, code, family, modality, cat_model, series, dry
                )
                created += c
                skipped += s

        self.stdout.write(
            self.style.SUCCESS(f"Importación completa: {created} creados, {skipped} ya existían.")
        )

    def _get_or_create_model(self, manufacturer, code, modality):
        target = norm(code)
        for m in EquipmentModel.objects.filter(manufacturer=manufacturer):
            if norm(m.name) == target:
                return m
        return EquipmentModel.objects.create(
            manufacturer=manufacturer, name=code, modality=modality
        )

    def _get_or_create_series(self, cat_model, series_name):
        target = norm(series_name)
        for s in EquipmentSeries.objects.filter(equipment_model=cat_model):
            if norm(s.name) == target:
                return s
        return EquipmentSeries.objects.create(equipment_model=cat_model, name=series_name)

    def _import_docs(self, doc_dirs, brand, code, family, modality, cat_model, series, dry):
        created = skipped = 0
        model_label = f"{code} {family}".strip()
        for doc_dir in sorted(doc_dirs):
            for html in sorted(doc_dir.rglob("*EMBEBIDO*.html")):
                doc_type = classify(doc_dir.name, html.name)
                title = clean_title(html.name)
                exists = TechnicalManual.objects.filter(
                    title=title, document_type=doc_type, model_name=model_label
                ).exists()
                if exists:
                    skipped += 1
                    continue
                if dry:
                    self.stdout.write(f"[plan] {model_label} | {doc_type} | {title}")
                    created += 1
                    continue
                manual = TechnicalManual(
                    title=title,
                    document_type=doc_type,
                    brand=brand,
                    modality=modality,
                    model_name=model_label,
                    language="Español",
                    equipment_model=cat_model,
                    equipment_series=series,
                )
                with html.open("rb") as fh:
                    manual.file.save(html.name, File(fh), save=True)
                created += 1
                self.stdout.write(f"[ok] {model_label} | {doc_type} | {title}")
        return created, skipped
