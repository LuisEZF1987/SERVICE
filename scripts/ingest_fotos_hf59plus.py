# -*- coding: utf-8 -*-
"""Adjunta las fotos reales (ya copiadas a /app/media/_ingest) a las OT y al
informe de Control de Calidad del HF59PLUS, y regenera los 5 PDF.

Idempotente: reemplaza las fotos de las OT de instalación/preventivo/no-enciende
y la del slot del QC; NO toca la OT-2026-0005 (que ya tiene sus 2 fotos reales).

    docker compose -f docker-compose.server.yml exec -T backend \
        python manage.py shell < scripts/ingest_fotos_hf59plus.py
"""
import os
from django.core.files.base import ContentFile

from apps.accounts.models import User
from apps.equipment.models import Equipment
from apps.work_orders.models import WorkOrder, WorkOrderPhoto
from apps.qc_reports.models import QCReport, QCReportPhoto
from apps.work_orders.services.pdf import render_work_order_pdf
from apps.qc_reports.services.pdf import render_qc_report_pdf

ING = "/app/media/_ingest"
OUT = "/app/media/_entrega"
os.makedirs(OUT, exist_ok=True)
admin = User.objects.get(username="admin")
B, D, A = "BEFORE", "DURING", "AFTER"


def blob(name):
    with open(os.path.join(ING, name), "rb") as fh:
        return fh.read()


def set_ot_photos(number, items):
    ot = WorkOrder.objects.get(number=number)
    ot.photos.all().delete()
    for name, typ, cap in items:
        p = WorkOrderPhoto(work_order=ot, photo_type=typ, caption=cap, created_by=admin)
        p.photo.save(f"{number}_{name}", ContentFile(blob(name)), save=True)
    print(f"{number}: {ot.photos.count()} fotos")
    return ot


eq = Equipment.objects.get(internal_code="DIM-FLUORO-002")
eq.photo.save("HF59PLUS_DIM-FLUORO-002.jpg", ContentFile(blob("equipo.jpg")), save=True)
print("Foto del equipo cargada.")

inst = set_ot_photos("OT-2026-0007", [
    ("inst_antes_1.jpg",   B, "Equipo embalado a su llegada (desembalaje)"),
    ("inst_antes_2.jpg",   B, "Desembalaje del arco en C"),
    ("inst_durante_1.jpg", D, "Conexión eléctrica y cableado interno"),
    ("inst_durante_2.jpg", D, "Configuración del panel de control"),
    ("inst_durante_3.jpg", D, "Instalación y configuración del software"),
    ("inst_despues_1.jpg", A, "Equipo instalado y operativo"),
    ("inst_despues_2.jpg", A, "Prueba de imagen de verificación"),
])
prev = set_ot_photos("OT-2026-0008", [
    ("prev_despues.jpg", D, "Revisión y limpieza del detector de panel plano"),
    ("prev_durante.jpg", A, "Detector verificado y equipo operativo"),
])
corr = set_ot_photos("OT-2026-0009", [
    ("noenc_antes.jpg",     B, "Cable interno enrollado y tensionado por el giro excesivo del arco en C"),
    ("noenc_durante.jpg",   D, "Equipo encendido tras rehacer las conexiones internas"),
    ("noenc_despues_1.jpg", A, "Prueba de calidad de imagen (fluoroscopía)"),
    ("noenc_despues_2.jpg", A, "Prueba de imagen — equipo operativo"),
])
det = WorkOrder.objects.get(number="OT-2026-0005")  # se deja con sus 2 fotos reales

# Control de Calidad — slot de resolución (pares de líneas)
qc = QCReport.objects.get(number="DIMED-IM-2026-0002")
qc.photos.filter(slot="LINE_PAIRS").delete()
qp = QCReportPhoto(report=qc, slot="LINE_PAIRS", created_by=admin,
                   caption="Imagen de resolución espacial — prueba de aceptación en instalación")
qp.image.save("qc_resolucion.jpg", ContentFile(blob("qc_resolucion.jpg")), save=True)
print(f"QC {qc.number}: {qc.photos.count()} imagen(es)")

# ---------------------------------------------------------------- PDFs
def save_pdf(name, data, obj):
    with open(os.path.join(OUT, name), "wb") as fh:
        fh.write(data)
    obj.pdf_document.save(name, ContentFile(data), save=True)
    print(f"   PDF -> {name}  ({len(data)//1024} KB)")

print("\nRegenerando PDFs...")
save_pdf("01_Instalacion_HF59PLUS_DIM-FLUORO-002.pdf", render_work_order_pdf(inst), inst)
save_pdf("02_Preventivo1_HF59PLUS_DIM-FLUORO-002.pdf", render_work_order_pdf(prev), prev)
save_pdf("03_Correctivo_Detector_HF59PLUS_DIM-FLUORO-002.pdf", render_work_order_pdf(det), det)
save_pdf("04_Correctivo_NoEnciende_HF59PLUS_DIM-FLUORO-002.pdf", render_work_order_pdf(corr), corr)
save_pdf("05_ControlCalidad_Instalacion_HF59PLUS_DIM-FLUORO-002.pdf", render_qc_report_pdf(qc), qc)
print("\nLISTO.")
