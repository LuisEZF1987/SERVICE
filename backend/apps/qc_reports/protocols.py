"""Quality-control protocols per radiological practice.

Each protocol mirrors one of the report formats 9.1.1–9.1.6 of Dimed's
Radiological Safety Manual (Rev. 7): the tests, their tolerances, the HVL
aluminium steps, the photo slots and the default instruments. A new report
starts as a copy of its protocol; from then on the report owns its rows, so
later edits to this file never alter reports already issued.
"""

PASS = "PASS"
FAIL = "FAIL"
NOT_APPLICABLE = "NA"

LEAK_POINTS_TUBE = [
    "cara frontal (dirección del haz útil, colimador cerrado)",
    "cara posterior",
    "lateral derecho",
    "lateral izquierdo",
    "cara superior",
    "cara inferior",
    "unión coraza–colimador",
]
LEAK_POINTS_GANTRY = [
    "frontal (entrada del gantry)",
    "posterior (salida del gantry)",
    "lateral derecho",
    "lateral izquierdo",
    "superior",
    "inferior",
    "superficie de la mesa a la altura del isocentro",
]

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

LEAK_TOL = "≤ 1 mGy/h a 1 m"


def _leak(points, gantry=False):
    if gantry:
        return [(f"Radiación de fuga del gantry — punto {i}: {p}, a 1 m", LEAK_TOL)
                for i, p in enumerate(points, 1)]
    return [(f"Radiación de fuga — punto {i}: {p}, a 1 m del foco", LEAK_TOL)
            for i, p in enumerate(points, 1)]


PROTOCOLS = {
    "RX": {
        "label": "Rayos X Convencional (fijo, móvil y portátil)",
        "format": "9.1.1",
        "practice": "Radiodiagnóstico médico",
        "techniques": ["Rayos X convencional fijo", "Rayos X móvil", "Rayos X portátil"],
        "equipment_extras": ["Generador (marca / modelo / S/N)", "Detector / receptor de imagen (marca / modelo / S/N)"],
        "tube_extras": ["Colimador (marca / modelo / S/N)"],
        "instruments": [
            ("Multímetro dosimétrico", "RTI Piranha 657"),
            ("Sensor de mAs no invasivo", "Radcal 90M10 + Accu-Gold+ AGDM+"),
            ("Kit de colimación y alineación", "Fluke Biomedical 07-661 / 07-662"),
            ("Láminas de aluminio tipo 1100", ""),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
            ("Multímetro", "Fluke 117"),
        ],
        "tests": [
            ("Exactitud de kVp a 60 kVp (DFD = ____ cm)", "±5%"),
            ("Exactitud de kVp a 80 kVp", "±5%"),
            ("Exactitud de kVp a 100 kVp", "±5%"),
            ("Exactitud de kVp a 120 kVp", "±5%"),
            ("Reproducibilidad de kVp a 80 kVp", "CV ≤ 2%"),
            ("Exactitud de mAs (sensor 90M10)", "±10%"),
            ("Exactitud del tiempo de exposición", "±10%"),
            ("Linealidad del rendimiento", "CL ≤ 0.1"),
            ("Rendimiento del tubo a 1 m, 80 kVp (µGy/mAs)", "Según fabricante"),
            ("Filtración total — HVL a 80 kVp (ver tabla HVL)", "≥ 2.5 mm Al"),
            ("Coincidencia campo luminoso / radiación — eje X (X1 + X2)", "≤ 2% de la DFP"),
            ("Coincidencia campo luminoso / radiación — eje Y (Y1 + Y2)", "≤ 2% de la DFP"),
            ("Perpendicularidad del haz (cilindro Fluke 07-662)", "≤ 1.5°"),
            *_leak(LEAK_POINTS_TUBE),
            ("Calidad de imagen con fantoma (cuña escalonada)", "Sin artefactos"),
            ("Resistencia de puesta a tierra", "< 4 Ω"),
            ("Voltaje neutro–tierra", "≤ 3 V"),
            ("Movimientos, frenos, enclavamientos y parada de emergencia", "Operativos"),
            ("Señalización luminosa de emisión de radiación", "Operativa"),
        ],
        "hvl": ("80 kVp", ["0.0", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5"], "2.5"),
        "photo_slots": [
            ("LIGHT_FIELD", "Prueba de coincidencia del haz luminoso con el haz de radiación (placa Fluke 07-661)"),
            ("PERPENDICULARITY", "Prueba de perpendicularidad del haz (cilindro Fluke 07-662)"),
            ("PHANTOM", "Fantoma de calidad de imagen (cuña escalonada)"),
        ],
        "radiation_conditions": "Técnica ____ kVp / ____ mAs; fantoma de dispersión de PMMA de 20 cm en el centro del campo, con el haz dirigido hacia la barrera evaluada.",
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
            ("Bloques de PMMA", ""),
            ("Dinamómetro de compresión", ""),
            ("Láminas de aluminio tipo 1100 (0.1 mm)", ""),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "tests": [
            ("Fuerza de compresión máxima", "111–200 N"),
            ("Exactitud de kVp a 25 kV (DFD = ____ cm)", "±5%"),
            ("Exactitud de kVp a 28 kV", "±5%"),
            ("Exactitud de kVp a 30 kV", "±5%"),
            ("Exactitud de mAs (sensor 90M10)", "±10%"),
            ("Exactitud del tiempo de exposición", "±10%"),
            ("Linealidad del rendimiento con mAs", "CL ≤ 0.1"),
            ("Capa hemirreductora a 28 kV (ver tabla HVL)", "≥ kVp/100 + 0.03 mm Al"),
            ("Dosis glandular media con fantoma ACR", "≤ 3.0 mGy"),
            ("Uniformidad del detector (campo plano)", "Sin artefactos"),
            ("Control automático de exposición (bloques de PMMA de 2, 4 y 6 cm)", "Variación según fabricante"),
            *_leak(LEAK_POINTS_TUBE),
            ("Parada de emergencia y liberación de la compresión", "Operativas"),
        ],
        "hvl": ("28 kV", ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6"], "0.31"),
        "mammo_score": True,
        "photo_slots": [
            ("ACR_PHANTOM", "Imagen de la prueba de fantoma ACR"),
            ("UNIFORMITY", "Uniformidad del detector (campo plano)"),
        ],
        "radiation_conditions": "Técnica clínica de mayor carga (____ kV / ____ mAs); fantoma de dispersión de PMMA (bloque de 4–6 cm) sobre el soporte de la mama.",
    },
    "CT": {
        "label": "Tomografía Computarizada (TC)",
        "format": "9.1.3",
        "practice": "Radiodiagnóstico médico",
        "techniques": ["Tomógrafo computarizado"],
        "equipment_extras": ["Gantry / detector (marca / modelo / S/N)", "Número de cortes", "Versión de software"],
        "tube_extras": [],
        "instruments": [
            ("Multímetro dosimétrico", "RTI Piranha 657"),
            ("Láminas de aluminio tipo 1100 (1.0 mm)", ""),
            ("Fantoma de agua / QA del fabricante (de la institución usuaria)", ""),
            ("Dial indicator / regla", "Mitutoyo 2046S"),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "tests": [
            ("Exactitud de kVp a 80 kV (tubo estacionario, isocentro)", "±5%"),
            ("Exactitud de kVp a 100 kV", "±5%"),
            ("Exactitud de kVp a 120 kV", "±5%"),
            ("Exactitud de kVp a 140 kV", "±5%"),
            ("Reproducibilidad de kVp a 120 kV", "CV ≤ 2%"),
            ("Exactitud del tiempo de exposición / rotación", "±10%"),
            ("Linealidad del rendimiento con mA/mAs (mA: ____ / ____ / ____)", "CL ≤ 0.1"),
            ("Reproducibilidad del rendimiento", "CV ≤ 5%"),
            ("Calidad del haz — HVL a 120 kV (ver tabla HVL)", "Según norma / fabricante"),
            ("Número CT del agua", "0 ± 4 HU"),
            ("Número CT del aire", "-1000 ± 5 HU"),
            ("Uniformidad espacial (centro vs. periferia)", "±5 HU"),
            ("Ruido de imagen (ROI central)", "Según fabricante"),
            ("Resolución de alto contraste", "Según fabricante"),
            ("Resolución de bajo contraste", "Según fabricante"),
            ("Espesor de corte (cortes ≥ 2 mm)", "±1 mm"),
            ("Exactitud de posicionamiento de la mesa", "±1 mm"),
            ("Láseres de alineación", "Coinciden con el isocentro"),
            *_leak(LEAK_POINTS_GANTRY, gantry=True),
            ("Movimientos de la mesa y parada de emergencia", "Operativos"),
        ],
        "hvl": ("120 kV", ["0.0", "1.0", "2.0", "3.0", "4.0", "5.0", "6.0"], ""),
        "photo_slots": [
            ("WATER_PHANTOM", "Fantoma de agua (número CT, uniformidad y ruido)"),
            ("RESOLUTION_PHANTOM", "Fantoma de resolución / espesor de corte"),
            ("PHANTOM_LABEL", "Fantoma utilizado (marca, modelo y S/N)"),
        ],
        "radiation_conditions": "Protocolo de abdomen de mayor carga (____ kV / ____ mAs, colimación ____ mm), con el fantoma de agua del fabricante centrado en el gantry.",
        "notes": "DIMED HEALTHCARE S.A. no realiza la medición del CTDI.",
    },
    "ANGIO": {
        "label": "Angiografía / Radiología Intervencionista",
        "format": "9.1.4",
        "practice": "Radiología intervencionista",
        "techniques": ["Angiógrafo monoplano", "Angiógrafo biplano"],
        "equipment_extras": ["Detector de panel plano (marca / modelo / S/N)", "Generador (marca / modelo / S/N)"],
        "tube_extras": [],
        "instruments": [
            ("Multímetro dosimétrico", "RTI Piranha 657"),
            ("Láminas de aluminio tipo 1100", ""),
            ("Fantoma de PMMA 20 cm / atenuador Al-Cu", ""),
            ("Patrón de pares de líneas", ""),
            ("Pinza de corriente de fuga / multímetro", "Fluke 368 FC / Fluke 117"),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "tests": [
            ("Exactitud de kVp a 60 kVp (DFD = ____ cm)", "±5%"),
            ("Exactitud de kVp a 80 kVp", "±5%"),
            ("Exactitud de kVp a 100 kVp", "±5%"),
            ("Exactitud de kVp a 120 kVp", "±5%"),
            ("Filtración total — HVL a 80 kVp (ver tabla HVL)", "≥ 2.5 mm Al"),
            ("Linealidad del rendimiento", "CL ≤ 0.1"),
            ("Reproducibilidad del rendimiento", "CV ≤ 5%"),
            ("Tasa de dosis en el receptor de imagen (FOV máximo, con rejilla)", "Según fabricante"),
            ("Dosis por imagen en modo de registro", "Según fabricante"),
            ("Dosis a la entrada del fantoma PMMA 20 cm — fluoroscopia", "Según fabricante"),
            ("Dosis a la entrada del fantoma PMMA 20 cm — registro", "Según fabricante"),
            ("Resolución de pares de líneas — FOV 1: ____", "Según fabricante"),
            ("Resolución de pares de líneas — FOV 2: ____", "Según fabricante"),
            ("Tasa de exposición en fluoroscopia — modo normal", "≤ 87.6 mGy/min"),
            ("Tasa de exposición en fluoroscopia — alta tasa (con aviso al operador)", "≤ 175 mGy/min"),
            ("Resistencia de tierra de protección y corrientes de fuga", "Según norma"),
            ("Anticolisión, parada de emergencia, retroceso de emergencia y enclavamientos", "Operativos"),
        ],
        "hvl": ("80 kVp", ["0.0", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0"], "2.5"),
        "photo_slots": [
            ("LINE_PAIRS", "Patrón de pares de líneas"),
        ],
        "radiation_conditions": "Fluoroscopia continua en modo normal (____ kV / ____ mA), fantoma de dispersión de PMMA de 20 cm en el isocentro.",
    },
    "CARM": {
        "label": "Arco en C con Intensificador de Imágenes o Detector",
        "format": "9.1.5",
        "practice": "Radiodiagnóstico médico",
        "techniques": ["Arco en C con intensificador de imágenes", "Arco en C con detector de panel plano"],
        "equipment_extras": ["Intensificador / detector (marca / modelo / S/N)"],
        "tube_extras": [],
        "instruments": [
            ("Multímetro dosimétrico", "RTI Piranha 657"),
            ("Sensor de mA no invasivo", "Radcal 90M10 + Accu-Gold+ AGDM+"),
            ("Patrón de pares de líneas", ""),
            ("Cronómetro", ""),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "tests": [
            ("Tasa de dosis en fluoroscopia — modo normal", "≤ 50 mGy/min"),
            ("Exactitud de kVp (DFD = ____ cm)", "±5%"),
            ("Exactitud de mA (sensor 90M10)", "±10%"),
            ("Exactitud del tiempo de exposición", "±10%"),
            ("Temporizador de fluoroscopia", "Alarma a los 5 min"),
            ("Resolución espacial (lp/mm)", "Según fabricante"),
            ("Uniformidad de imagen", "Sin artefactos"),
            *_leak(LEAK_POINTS_TUBE),
            ("Frenos de seguridad en todos los ejes", "Operativos"),
            ("Parada de emergencia", "Operativa"),
        ],
        "hvl": None,
        "photo_slots": [
            ("LINE_PAIRS", "Patrón de pares de líneas"),
            ("UNIFORMITY", "Uniformidad de imagen"),
        ],
        "radiation_conditions": "Fluoroscopia continua en modo normal (____ kV / ____ mA), fantoma de dispersión de PMMA de 20 cm en el centro del campo.",
    },
    "FLUORO": {
        "label": "Fluoroscopio Fijo",
        "format": "9.1.6",
        "practice": "Radiodiagnóstico médico",
        "techniques": ["Fluoroscopio fijo (telecomandado / convencional)"],
        "equipment_extras": ["Intensificador / detector (marca / modelo / S/N)", "Generador (marca / modelo / S/N)"],
        "tube_extras": ["Colimador (marca / modelo / S/N)"],
        "instruments": [
            ("Multímetro dosimétrico", "RTI Piranha 657"),
            ("Sensor de mA no invasivo", "Radcal 90M10 + Accu-Gold+ AGDM+"),
            ("Kit de colimación y alineación", "Fluke Biomedical 07-661 / 07-662"),
            ("Patrón de pares de líneas", ""),
            ("Fantoma de bajo contraste", ""),
            ("Bloques de PMMA / atenuadores", ""),
            ("Cámara de ionización (fuga y áreas)", "Radcal 10X6-1800"),
        ],
        "tests": [
            ("Tasa de dosis en fluoroscopia — modo normal", "≤ 50 mGy/min"),
            ("Tasa de dosis en fluoroscopia — alta tasa", "≤ 87.6 mGy/min"),
            ("Exactitud de kVp (DFD = ____ cm)", "±5%"),
            ("Exactitud de mA (sensor 90M10)", "±10%"),
            ("Exactitud del tiempo de exposición", "±10%"),
            ("Control automático de exposición (CAE) con distintos espesores", "Brillo / dosis estable"),
            ("Temporizador de fluoroscopia", "Alarma a los 5 min"),
            ("Resolución espacial (lp/mm)", "Según fabricante"),
            ("Resolución de bajo contraste", "Según fabricante"),
            ("Coincidencia campo luminoso / radiación — eje X (X1 + X2)", "≤ 2% de la DFP"),
            ("Coincidencia campo luminoso / radiación — eje Y (Y1 + Y2)", "≤ 2% de la DFP"),
            ("Perpendicularidad del haz (cilindro Fluke 07-662)", "≤ 1.5°"),
            *_leak(LEAK_POINTS_TUBE),
            ("Frenos, movimientos y parada de emergencia", "Operativos"),
            ("Señalización de alta tasa al operador", "Operativa"),
        ],
        "hvl": None,
        "photo_slots": [
            ("LIGHT_FIELD", "Prueba de coincidencia del haz luminoso con el haz de radiación (placa Fluke 07-661)"),
            ("PERPENDICULARITY", "Prueba de perpendicularidad del haz (cilindro Fluke 07-662)"),
            ("LOW_CONTRAST", "Fantoma de bajo contraste"),
            ("LINE_PAIRS", "Patrón de pares de líneas"),
        ],
        "radiation_conditions": "Fluoroscopia continua en modo normal (____ kV / ____ mA), fantoma de dispersión de PMMA de 20 cm en el centro del campo.",
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
            "extras": [{"label": label, "value": ""} for label in protocol["equipment_extras"]],
        },
        "tube_data": {
            "brand": "",
            "model": "",
            "serial": "",
            "year": "",
            "extras": [{"label": label, "value": ""} for label in protocol["tube_extras"]],
        },
        "instruments": [
            {"name": name, "model": model, "serial": "", "certificate": "", "valid_until": ""}
            for name, model in protocol["instruments"]
        ],
        "tests": [
            {"label": label, "tolerance": tol, "m1": "", "m2": "", "m3": "", "result": ""}
            for label, tol in protocol["tests"]
        ],
        "hvl": hvl,
        "mammo_score": mammo_score,
        "radiation_levels": {
            "conditions": protocol["radiation_conditions"],
            "instrument_serial": "",
            "rows": [
                {"point": point, "area_type": area, "background": "", "measured": "",
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
