"""Load real contract data from Hospital General Latacunga into DimedService."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from apps.accounts.models import User
from apps.clients.models import Client, ClientContact
from apps.equipment.models import Equipment
from apps.contracts.models import Contract
from apps.work_orders.models import WorkOrder
from apps.scheduling.models import ScheduledMaintenance
from django.utils import timezone
from datetime import date

admin = User.objects.get(username="admin")

# === TECNICOS DIMED ===
tech1, _ = User.objects.get_or_create(
    username="jmorales",
    defaults=dict(
        first_name="Jorge", last_name="Morales",
        email="jmorales@dimedhealthcare.com", role="TECHNICIAN",
        company_type="DIMED", phone="0987654321",
        position="Ingeniero Biomédico",
    ),
)
tech1.set_password("dimed2026")
tech1.save()

tech2, _ = User.objects.get_or_create(
    username="clopez",
    defaults=dict(
        first_name="Carlos", last_name="López",
        email="clopez@dimedhealthcare.com", role="TECHNICIAN",
        company_type="DIMED", phone="0991234567",
        position="Ingeniero Biomédico",
    ),
)
tech2.set_password("dimed2026")
tech2.save()
print(f"Técnicos: {tech1}, {tech2}")

# === CLIENTE ===
client, _ = Client.objects.get_or_create(
    ruc="0660800430001",
    defaults=dict(
        name="Hospital General Latacunga - IESS",
        client_type="PUBLIC",
        address="Av. Amazonas y Antonia Vela, Latacunga",
        city="Latacunga",
        province="Cotopaxi",
        phone="032800200",
        email="hospital.latacunga@iess.gob.ec",
        status="ACTIVE",
        nda_signed=True,
        nda_signed_date=date(2024, 9, 1),
        notes="Hospital público IESS. Contrato SERCOP SIE-HGLA-2024-040.",
        created_by=admin,
    ),
)
print(f"Cliente: {client}")

# Contactos
ClientContact.objects.get_or_create(
    client=client, email="efernandez@iess.gob.ec",
    defaults=dict(
        name="Lic. Eliecer Fernández Pérez",
        position="Administrador del Contrato",
        phone="032800200 ext 1201",
        is_primary=True, is_signer=True, created_by=admin,
    ),
)
ClientContact.objects.get_or_create(
    client=client, email="clapo@iess.gob.ec",
    defaults=dict(
        name="Lic. Claudio Lapo",
        position="Delegado Técnico",
        phone="032800200 ext 1205",
        is_primary=False, is_signer=True, created_by=admin,
    ),
)
print("Contactos creados")

# === CONTRATO ===
contract, _ = Contract.objects.get_or_create(
    number="HGLA-052-2024",
    defaults=dict(
        contract_type="ALL_INCLUSIVE",
        client=client,
        sercop_reference="SIE-HGLA-2024-040",
        start_date=date(2024, 9, 12),
        end_date=date(2034, 9, 12),
        total_value=142000.00,
        payment_terms="Pago contra entrega equipo USD 126,000 + USD 16,000 por 16 mantenimientos preventivos semestrales. Retención sector público.",
        sla_response_hours=48,
        preventive_visits_per_year=2,
        status="ACTIVE",
        notes="Subasta Inversa Electrónica. Garantía fábrica 2 años desde 13-dic-2024. Vida útil 10 años. 16 mantenimientos preventivos semestrales incluidos.",
        created_by=admin,
    ),
)
print(f"Contrato: {contract}")

# === EQUIPO: ARCO EN C ALLENGERS ===
equipo, _ = Equipment.objects.get_or_create(
    serial_number="2K24100279-DC",
    defaults=dict(
        internal_code="DIM-FLUORO-001",
        hospital_asset_number="HGLA-IMG-2024-001",
        has_fda=False, has_ce=True, has_iso_13485=True,
        modality="FLUOROSCOPE",
        brand="Allengers",
        model_name="HF 59R (Digiscan V-30)",
        country_of_origin="India",
        year_of_manufacture=2024,
        technical_specs={
            "tipo": "Arco en C con detector flat panel",
            "monitor": "32 pulgadas, 2560x1440",
            "potencia_generador": "15 kW",
            "voltaje_max": "120 kV",
            "corriente_max": "150 mA",
            "punto_focal": "0.3 y 0.6 mm",
            "anodo": "365 KHU",
            "detector": "Panel plano 30x30 cm, 2304x3072 px",
            "almacenamiento": "80,000+ imágenes",
            "dicom": "Sí",
        },
        client=client,
        area="Servicio de Imagenología - Quirófano",
        city="Latacunga",
        province="Cotopaxi",
        status="OPERATIONAL",
        factory_warranty_start=date(2024, 12, 13),
        factory_warranty_end=date(2026, 12, 13),
        dimed_warranty_start=date(2024, 12, 13),
        dimed_warranty_end=date(2034, 12, 13),
        contract=contract,
        created_by=admin,
    ),
)
print(f"Equipo: {equipo}")

# === OT #1: INSTALACIÓN (cerrada) ===
ot1, _ = WorkOrder.objects.get_or_create(
    number="OT-2024-0001",
    defaults=dict(
        ot_type="INSTALLATION", priority="NORMAL", status="CLOSED",
        equipment=equipo, client=client,
        contract=contract, technician=tech1,
        arrival_at=timezone.make_aware(timezone.datetime(2024, 12, 10, 9, 0)),
        started_at=timezone.make_aware(timezone.datetime(2024, 12, 10, 9, 30)),
        finished_at=timezone.make_aware(timezone.datetime(2024, 12, 13, 16, 0)),
        closed_at=timezone.make_aware(timezone.datetime(2024, 12, 13, 17, 0)),
        total_hours=78.5,
        reported_problem="Instalación de equipo según contrato HGLA-052-2024",
        diagnosis="N/A - Instalación nueva",
        work_performed="Instalación completa del Arco en C Allengers HF 59R con flat panel. "
            "Desembalaje, ensamblaje mecánico, conexión eléctrica 220V/60Hz, "
            "configuración de software, calibración del detector flat panel, "
            "pruebas de fluoroscopía y radiografía, configuración DICOM, "
            "capacitación al personal del servicio de imagenología.",
        result="RESOLVED", travel_cost=350.00,
        client_signer_name="Lic. Eliecer Fernández Pérez",
        client_signer_position="Administrador del Contrato",
        signed_at=timezone.make_aware(timezone.datetime(2024, 12, 13, 16, 30)),
        created_by=admin,
    ),
)
print(f"OT Instalación: {ot1}")

# === OT #2: PREVENTIVO #1 (cerrada) ===
ot2, _ = WorkOrder.objects.get_or_create(
    number="OT-2025-0001",
    defaults=dict(
        ot_type="PREVENTIVE", priority="SCHEDULED", status="CLOSED",
        equipment=equipo, client=client,
        contract=contract, technician=tech1,
        arrival_at=timezone.make_aware(timezone.datetime(2025, 6, 23, 8, 30)),
        started_at=timezone.make_aware(timezone.datetime(2025, 6, 23, 9, 0)),
        finished_at=timezone.make_aware(timezone.datetime(2025, 6, 23, 15, 30)),
        closed_at=timezone.make_aware(timezone.datetime(2025, 6, 23, 16, 0)),
        total_hours=6.5,
        reported_problem="Mantenimiento preventivo semestral #1 según contrato",
        diagnosis="Equipo en buen estado. Desgaste normal en frenos del brazo orbital.",
        work_performed="Inspección visual completa. Limpieza detector y colimador. "
            "Verificación frenos (orbital, vertical, horizontal). Lubricación partes móviles. "
            "Prueba fluoroscopía pulsada 15fps OK. Calibración generador kV OK. "
            "Verificación mA 150mA OK. Limpieza filtros aire. Verificación DICOM OK. "
            "Prueba interruptores mano y pie OK. Verificación protecciones radiación.",
        result="RESOLVED", travel_cost=280.00,
        client_signer_name="Lic. Eliecer Fernández Pérez",
        client_signer_position="Administrador del Contrato",
        signed_at=timezone.make_aware(timezone.datetime(2025, 6, 23, 15, 45)),
        follow_up_notes="Próximo mantenimiento programado diciembre 2025.",
        created_by=admin,
    ),
)
print(f"OT PM #1: {ot2}")

# === OT #3: PREVENTIVO #2 (en ejecución) ===
ot3, _ = WorkOrder.objects.get_or_create(
    number="OT-2025-0002",
    defaults=dict(
        ot_type="PREVENTIVE", priority="SCHEDULED", status="IN_PROGRESS",
        equipment=equipo, client=client,
        contract=contract, technician=tech2,
        arrival_at=timezone.make_aware(timezone.datetime(2025, 12, 15, 8, 30)),
        started_at=timezone.make_aware(timezone.datetime(2025, 12, 15, 9, 0)),
        reported_problem="Mantenimiento preventivo semestral #2 según contrato",
        created_by=admin,
    ),
)
print(f"OT PM #2 (en ejecución): {ot3}")

# === OT #4: CORRECTIVO URGENTE (abierta) ===
ot4, _ = WorkOrder.objects.get_or_create(
    number="OT-2026-0001",
    defaults=dict(
        ot_type="CORRECTIVE", priority="URGENT", status="OPEN",
        equipment=equipo, client=client,
        contract=contract, technician=tech1,
        reported_problem="Error E-105 al iniciar fluoroscopía. Imagen se congela "
            "intermitentemente durante procedimientos quirúrgicos. Hospital solicita "
            "atención urgente por cirugías programadas esta semana.",
        created_by=admin,
    ),
)
print(f"OT Correctivo urgente: {ot4}")

# === OT #5: CALIBRACIÓN (pendiente firma) ===
ot5, _ = WorkOrder.objects.get_or_create(
    number="OT-2026-0002",
    defaults=dict(
        ot_type="CALIBRATION", priority="NORMAL", status="PENDING_SIGNATURE",
        equipment=equipo, client=client,
        contract=contract, technician=tech2,
        arrival_at=timezone.make_aware(timezone.datetime(2026, 3, 10, 9, 0)),
        started_at=timezone.make_aware(timezone.datetime(2026, 3, 10, 9, 30)),
        finished_at=timezone.make_aware(timezone.datetime(2026, 3, 10, 14, 0)),
        total_hours=4.5,
        reported_problem="Calibración anual del generador RX y detector flat panel",
        diagnosis="kV desviado 2% por encima del valor nominal.",
        work_performed="Calibración completa generador HF. Ajuste kV a 40/60/80/100/120. "
            "Calibración detector flat panel: ganancia, offset, corrección píxeles defectuosos. "
            "Verificación dosis DAP. Prueba calidad imagen con phantom. "
            "Todos los parámetros dentro de tolerancia post-calibración.",
        result="RESOLVED", travel_cost=280.00,
        created_by=admin,
    ),
)
print(f"OT Calibración (pendiente firma): {ot5}")

# === CRONOGRAMA ===
ScheduledMaintenance.objects.get_or_create(
    equipment=equipo, scheduled_date=date(2025, 6, 23), frequency="BIANNUAL",
    defaults=dict(contract=contract, work_order=ot2, status="COMPLETED", created_by=admin),
)
ScheduledMaintenance.objects.get_or_create(
    equipment=equipo, scheduled_date=date(2025, 12, 15), frequency="BIANNUAL",
    defaults=dict(contract=contract, work_order=ot3, status="COMPLETED", created_by=admin),
)
ScheduledMaintenance.objects.get_or_create(
    equipment=equipo, scheduled_date=date(2026, 6, 15), frequency="BIANNUAL",
    defaults=dict(contract=contract, status="PENDING", created_by=admin),
)
ScheduledMaintenance.objects.get_or_create(
    equipment=equipo, scheduled_date=date(2026, 12, 15), frequency="BIANNUAL",
    defaults=dict(contract=contract, status="PENDING", created_by=admin),
)
ScheduledMaintenance.objects.get_or_create(
    equipment=equipo, scheduled_date=date(2027, 6, 15), frequency="BIANNUAL",
    defaults=dict(contract=contract, status="PENDING", created_by=admin),
)
print("Cronograma creado")

# === RESUMEN ===
print("\n===== RESUMEN =====")
print(f"Clientes: {Client.objects.count()}")
print(f"Contactos: {ClientContact.objects.count()}")
print(f"Contratos: {Contract.objects.count()}")
print(f"Equipos: {Equipment.objects.count()}")
print(f"OTs totales: {WorkOrder.objects.count()}")
print(f"  - Cerradas: {WorkOrder.objects.filter(status='CLOSED').count()}")
print(f"  - En ejecución: {WorkOrder.objects.filter(status='IN_PROGRESS').count()}")
print(f"  - Abiertas: {WorkOrder.objects.filter(status='OPEN').count()}")
print(f"  - Pendiente firma: {WorkOrder.objects.filter(status='PENDING_SIGNATURE').count()}")
print(f"Mantenimientos programados: {ScheduledMaintenance.objects.count()}")
print(f"Técnicos: {User.objects.filter(role='TECHNICIAN').count()}")
