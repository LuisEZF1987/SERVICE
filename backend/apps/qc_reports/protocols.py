"""Quality-control protocols per radiological practice.

Each protocol mirrors one of the report formats 9.1.1–9.1.6 of Dimed's
Radiological Safety Manual (Rev. 8): the result tables of each test (see
methods.py), the HVL aluminium steps, the photo slots and the default
instruments. A new report
starts as a copy of its protocol; from then on the report owns its rows, so
later edits to this file never alter reports already issued.
"""

from .methods import SECTIONS

PASS = "PASS"
FAIL = "FAIL"
NOT_APPLICABLE = "NA"

# Points of section 7.6 of the manual. Reference levels in µSv/h (net of background).
RADIATION_POINTS = [
    ("Consola de mando / puesto del operador (detrás de la mampara)", "Controlada (POE)", "10"),
    ("Visor plomado de la mampara", "Controlada (POE)", "10"),
    ("Puerta de acceso a la sala (a 30 cm de la superficie exterior)", "Pública", "0.5"),
    ("Sala de espera de pacientes", "Pública", "0.5"),
    ("Pasillo de circulación", "Pública", "0.5"),
    ("Área adyacente 1:", "", ""),
    ("Área adyacente 2:", "", ""),
    ("Área adyacente 3:", "", ""),
    ("Vestidor / área de preparación del paciente", "Pública", "0.5"),
    ("Piso superior / inferior (si existe área ocupada)", "Pública", "0.5"),
]

COMMON_PHOTO_SLOTS = [
    ("EQUIPMENT_PLATE", "Placa de identificación del equipo"),
    ("TUBE_PLATE", "Placa de identificación del tubo de rayos X"),
]

PROTOCOLS = {
    "RX": {
        "label": "Rayos X Convencional (fijo, móvil y portátil)",
        "format": "9.1.1",
        "practice": "Radiodiagnóstico médico",
        "techniques": ["Rayos X convencional fijo", "Rayos X móvil", "Rayos X portátil"],
        "equipment_extras": ["Generador (marca / modelo / S/N)", "Detector / receptor de imagen (marca / modelo / S/N)"],
        "tube_extras": ["Colimador (marca / modelo / S/N)"],
        "instruments": [
            ("Digitalizador y multisensor", "Radcal Accu-Gold+ AGDM+ / AGMS-DM+"),
            ("Sensor de mAs no invasivo", "Radcal 90M10 + Accu-Gold+ AGDM+"),
            ("Set de colimación y alineación", "IBA LiRa VD0403865 (Primus A + BATT)"),
            ("Láminas de aluminio para HVL", "IBA VD0403320"),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
            ("Multímetro", "Fluke 117"),
        ],
        "hvl": ("80 kVp", ["0.0", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5"], "2.5"),
        "photo_slots": [
            ("LIGHT_FIELD", "Prueba de coincidencia del haz luminoso con el haz de radiación (fantoma IBA Primus A)"),
            ("PERPENDICULARITY", "Prueba de perpendicularidad del haz (IBA BATT)"),
            ("PHANTOM", "Fantoma de calidad de imagen (IBA Primus A)"),
        ],
        "radiation_conditions": "Técnica ____ kVp / ____ mAs; fantoma de dispersión: maniquí de agua de 20 cm en el centro del campo, con el haz dirigido hacia la barrera evaluada.",
    },
    "MAMMO": {
        "label": "Mamografía",
        "format": "9.1.2",
        "practice": "Radiodiagnóstico médico",
        "techniques": ["Mamógrafo digital 2D", "Mamógrafo con tomosíntesis (3D)"],
        "equipment_extras": ["Detector (marca / modelo / S/N)"],
        "tube_extras": ["Combinación ánodo / filtro"],
        "instruments": [
            ("Digitalizador y multisensor", "Radcal Accu-Gold+ AGDM+ / AGMS-DM+"),
            ("Sensor de mAs no invasivo", "Radcal 90M10"),
            ("Fantoma ACR de mamografía", ""),
            ("Placas de PMMA (set AEC)", "IBA VD0203810"),
            ("Medidor de fuerza de compresión", "IBA VD0203480"),
            ("Láminas de aluminio para HVL (0.1 mm, 99.9%)", "IBA VD0403310"),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "hvl": ("28 kV", ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6"], "0.31"),
        "mammo_score": True,
        "photo_slots": [
            ("ACR_PHANTOM", "Imagen de la prueba de fantoma ACR"),
            ("UNIFORMITY", "Uniformidad del detector (campo plano)"),
        ],
        "radiation_conditions": "Técnica clínica de mayor carga (____ kV / ____ mAs); fantoma de dispersión de PMMA (set AEC IBA VD0203810, 4–6 cm) sobre el soporte de la mama.",
    },
    "CT": {
        "label": "Tomografía Computarizada (TC)",
        "format": "9.1.3",
        "practice": "Radiodiagnóstico médico",
        "techniques": ["Tomógrafo computarizado"],
        "equipment_extras": ["Gantry / detector (marca / modelo / S/N)", "Número de cortes", "Versión de software"],
        "tube_extras": [],
        "instruments": [
            ("Digitalizador y multisensor", "Radcal Accu-Gold+ AGDM+ / AGMS-DM+"),
            ("Láminas de aluminio para HVL (1.0 mm)", "IBA VD0403320"),
            ("Fantoma de agua / QA del fabricante (de la institución usuaria)", ""),
            ("Dial indicator / regla", "Mitutoyo 2046S"),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "hvl": ("120 kV", ["0.0", "1.0", "2.0", "3.0", "4.0", "5.0", "6.0"], ""),
        "photo_slots": [
            ("WATER_PHANTOM", "Fantoma de agua (número CT, uniformidad y ruido)"),
            ("RESOLUTION_PHANTOM", "Fantoma de resolución / espesor de corte"),
            ("PHANTOM_LABEL", "Fantoma utilizado (marca, modelo y S/N)"),
        ],
        "radiation_conditions": "Protocolo de abdomen de mayor carga (____ kV / ____ mAs, colimación ____ mm), con el fantoma de agua del fabricante centrado en el gantry.",
    },
    "ANGIO": {
        "label": "Angiografía / Radiología Intervencionista",
        "format": "9.1.4",
        "practice": "Radiología intervencionista",
        "techniques": ["Angiógrafo monoplano", "Angiógrafo biplano"],
        "equipment_extras": ["Detector de panel plano (marca / modelo / S/N)", "Generador (marca / modelo / S/N)"],
        "tube_extras": [],
        "instruments": [
            ("Digitalizador y multisensor", "Radcal Accu-Gold+ AGDM+ / AGMS-DM+"),
            ("Láminas de aluminio para HVL", "IBA VD0403320"),
            ("Maniquí de agua 20 cm / set AEC (PMMA y Al)", "IBA VD0203800"),
            ("Fantoma de fluoroscopia (pares de líneas)", "IBA Primus FG-18"),
            ("Pinza de corriente de fuga / multímetro", "Fluke 368 FC / Fluke 117"),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "hvl": ("80 kVp", ["0.0", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0"], "2.5"),
        "photo_slots": [
            ("LINE_PAIRS", "Fantoma IBA Primus FG-18 (pares de líneas)"),
        ],
        "radiation_conditions": "Fluoroscopia continua en modo normal (____ kV / ____ mA), fantoma de dispersión: maniquí de agua de 20 cm en el isocentro.",
    },
    "CARM": {
        "label": "Arco en C con Intensificador de Imágenes o Detector",
        "format": "9.1.5",
        "practice": "Radiodiagnóstico médico",
        "techniques": ["Arco en C con intensificador de imágenes", "Arco en C con detector de panel plano"],
        "equipment_extras": ["Intensificador / detector (marca / modelo / S/N)"],
        "tube_extras": [],
        "instruments": [
            ("Digitalizador y multisensor", "Radcal Accu-Gold+ AGDM+ / AGMS-DM+"),
            ("Sensor de mA no invasivo", "Radcal 90M10 + Accu-Gold+ AGDM+"),
            ("Fantoma de fluoroscopia (pares de líneas)", "IBA Primus FG-18"),
            ("Cronómetro", ""),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "hvl": None,
        "photo_slots": [
            ("LINE_PAIRS", "Fantoma IBA Primus FG-18 (pares de líneas)"),
            ("UNIFORMITY", "Uniformidad de imagen"),
        ],
        "radiation_conditions": "Fluoroscopia continua en modo normal (____ kV / ____ mA), fantoma de dispersión: maniquí de agua de 20 cm en el centro del campo.",
    },
    "FLUORO": {
        "label": "Fluoroscopio Fijo",
        "format": "9.1.6",
        "practice": "Radiodiagnóstico médico",
        "techniques": ["Fluoroscopio fijo (telecomandado / convencional)"],
        "equipment_extras": ["Intensificador / detector (marca / modelo / S/N)", "Generador (marca / modelo / S/N)"],
        "tube_extras": ["Colimador (marca / modelo / S/N)"],
        "instruments": [
            ("Digitalizador y multisensor", "Radcal Accu-Gold+ AGDM+ / AGMS-DM+"),
            ("Sensor de mA no invasivo", "Radcal 90M10 + Accu-Gold+ AGDM+"),
            ("Set de colimación y alineación", "IBA LiRa VD0403865 (Primus A + BATT)"),
            ("Fantoma de fluoroscopia (pares de líneas)", "IBA Primus FG-18"),
            ("Fantoma de fluoroscopia (bajo contraste)", "IBA Primus FG-18"),
            ("Placas de PMMA y aluminio (set AEC)", "IBA VD0203800"),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "hvl": None,
        "photo_slots": [
            ("LIGHT_FIELD", "Prueba de coincidencia del haz luminoso con el haz de radiación (fantoma IBA Primus A)"),
            ("PERPENDICULARITY", "Prueba de perpendicularidad del haz (IBA BATT)"),
            ("LOW_CONTRAST", "Fantoma IBA Primus FG-18 (bajo contraste)"),
            ("LINE_PAIRS", "Fantoma IBA Primus FG-18 (pares de líneas)"),
        ],
        "radiation_conditions": "Fluoroscopia continua en modo normal (____ kV / ____ mA), fantoma de dispersión: maniquí de agua de 20 cm en el centro del campo.",
    },
}

PRACTICE_CHOICES = [(key, p["label"]) for key, p in PROTOCOLS.items()]

# Equipment modality → most likely practice, to preselect it in the UI.
MODALITY_TO_PRACTICE = {
    "XRAY_FIXED": "RX",
    "XRAY_PORTABLE": "RX",
    "MAMMOGRAPH": "MAMMO",
    "CT": "CT",
    "FLUOROSCOPE": "FLUORO",
}

MAMMO_SCORE_ROWS = [
    ("Fibras", "4.0", "2.0"),
    ("Grupos de microcalcificaciones", "3.0", "3.0"),
    ("Masas", "3.0", "2.0"),
]


def photo_slots(practice):
    return COMMON_PHOTO_SLOTS + PROTOCOLS[practice]["photo_slots"]


def _contacts_text(client):
    contacts = client.contacts.all() if hasattr(client, "contacts") else []
    names = [f"{c.name} ({c.position})" for c in contacts if c.name]
    return ", ".join(names)


def initial_report_data(work_order, practice):
    """Field values for a brand-new report of `practice` on `work_order`."""
    protocol = PROTOCOLS[practice]
    equipment = work_order.equipment
    client = work_order.client

    hvl = {}
    if protocol.get("hvl"):
        kv, steps, minimum = protocol["hvl"]
        hvl = {
            "kv": kv,
            "rows": [{"thickness": s, "dose": ""} for s in steps],
            "hvl_value": "",
            "hvl_min": minimum,
            "result": "",
        }

    mammo_score = {}
    if protocol.get("mammo_score"):
        mammo_score = {
            "phantom_type": "",
            "phantom_id": "",
            "technique": "",
            "rows": [
                {"object": o, "score": "", "min_rmi": rmi, "min_dm": dm, "result": ""}
                for o, rmi, dm in MAMMO_SCORE_ROWS
            ],
            "overall": "",
        }

    return {
        "institution": {
            "name": client.name,
            "ruc": client.ruc,
            "address": f"{client.address}, {client.city} – {client.province}".strip(", –"),
            "phone": client.phone,
            "contacts": _contacts_text(client),
            "license": "",
            "room": equipment.area,
        },
        "practice_info": {
            "practice": protocol["practice"],
            "technique": protocol["techniques"][0] if len(protocol["techniques"]) == 1 else "",
            "risk_category": "",
        },
        "equipment_data": {
            "brand": equipment.brand,
            "model": equipment.model_name,
            "serial": equipment.serial_number,
            "year": str(equipment.year_of_manufacture or ""),
            "extras": [{"label": label, "value": ""} for label in protocol.get("equipment_extras", [])],
        },
        "tube_data": {
            "brand": "",
            "model": "",
            "serial": "",
            "year": "",
            "extras": [{"label": label, "value": ""} for label in protocol.get("tube_extras", [])],
        },
        "instruments": [
            {"name": name, "model": model, "serial": "", "certificate": "", "valid_until": ""}
            for name, model in protocol["instruments"]
        ],
        # Section 7: one result table per test, in the order of the manual's format.
        "tests": SECTIONS[practice](),
        "hvl": hvl,
        "mammo_score": mammo_score,
        "radiation_levels": {
            "conditions": protocol["radiation_conditions"],
            "instrument_serial": "",
            "rows": [
                {"point": point, "area_type": area, "background": "", "r1": "", "r2": "", "r3": "",
                 "reference": ref, "result": ""}
                for point, area, ref in RADIATION_POINTS
            ],
        },
    }


def practices_payload():
    """Practice catalogue exposed to the frontend."""
    return [
        {
            "value": key,
            "label": p["label"],
            "format": p["format"],
            "techniques": p["techniques"],
            "photo_slots": [{"slot": s, "label": label} for s, label in photo_slots(key)],
        }
        for key, p in PROTOCOLS.items()
    ]
