"""Result tables of formats 9.1.1–9.1.6 (Manual de Seguridad Radiológica, Rev. 8).

Each test of section 7 of a report is a *section*: a small table that follows
the methodology of its procedure (selected value, every reading taken, the
calculated values, tolerance and result). A section is plain JSON so it is
snapshotted into the report when it is created:

    {"key", "kind", "title", "method", "label_header"?,
     "columns": [{"key", "label", "calc"?, "digits"?}],
     "params": [{"key", "label", "value"}],
     "rows": [{"label"?, "v": {column key: typed value}, "tolerance", "result"}]}

Columns without ``calc`` are typed by the technician; columns with ``calc``
are computed from the row (and, for a few operations, from other rows or the
section parameters). ``evaluate_section`` is mirrored by ``evaluateSection``
in frontend/src/pages/qc-reports/qcMethods.ts — keep both in step.

Kinds ``hvl`` and ``acr`` are placeholders: their data lives in the report's
``hvl`` and ``mammo_score`` fields.
"""
import math
import re


def _col(key, label, calc=None, digits=None):
    c = {"key": key, "label": label}
    if calc:
        c["calc"] = calc
    if digits is not None:
        c["digits"] = digits
    return c


def _row(v=None, tolerance="", label=None):
    r = {"v": v or {}, "tolerance": tolerance, "result": ""}
    if label is not None:
        r["label"] = label
    return r


def _readings(prefix, unit, n, short=False):
    name = "L" if short else "Lectura "
    return [_col(f"{prefix}{i}", f"{name}{i} ({unit})") for i in range(1, n + 1)]


def _avg(keys):
    return "avg:" + ",".join(keys)


M_EXAC = "{n} lecturas por cada valor seleccionado; Desviación (%) = (promedio − valor seleccionado) / valor seleccionado × 100."
M_REPRO = "{n} disparos con la misma técnica; CV (%) = desviación estándar / promedio × 100."
M_LIN = ("3 disparos por cada valor; rendimiento X = dosis promedio / mAs; coeficiente de linealidad entre valores "
         "consecutivos CL = |X1 − X2| / (X1 + X2).")
M_MEAN = "3 lecturas por condición; se compara el promedio con la tolerancia."
M_SIMPLE = "Lectura única u observación directa, comparada con el criterio indicado."
M_HVL = ("1 disparo sin lámina (D0) y 1 disparo por cada espesor acumulado; HVL por interpolación logarítmica entre "
         "los espesores t1 y t2 cuyas dosis D1 y D2 quedan por encima y por debajo de D0/2: "
         "HVL = t1 + (t2 − t1) × ln(2·D1/D0) / ln(D1/D2).")
M_COINC = ("1 exposición sobre el fantoma Primus A; por eje se suman las desviaciones absolutas de los dos bordes y se "
           "expresan como porcentaje de la DFP.")
M_FUGA = ("3 disparos por punto a la carga máxima; se promedia la dosis por disparo y se normaliza a la carga máxima "
          "continua del fabricante: Tasa (mGy/h) = dosis promedio × I × 3600 / Q.")
NA_NOTE = " Equipos sin cable de alto voltaje accesible: «N/A»."


def exac(key, title, unit, values, tol, diff="%", first=None, labels=None, label_header=None, method=None):
    reads = [f"r{i}" for i in (1, 2, 3)]
    cols = ([_col("sel", first or f"Valor seleccionado ({unit})")] + _readings("r", unit, 3)
            + [_col("avg", f"Promedio ({unit})", _avg(reads), 3)])
    if diff == "%":
        cols.append(_col("dev", "Desviación (%)", "dev_pct:avg,sel", 1))
    else:
        cols.append(_col("dev", f"Diferencia ({diff})", "diff:avg,sel", 2))
    rows = [_row({"sel": v}, tol, labels[i] if labels else None) for i, v in enumerate(values)]
    s = {"key": key, "kind": "exac", "title": title, "method": method or M_EXAC.format(n=3), "columns": cols,
         "params": [], "rows": rows}
    if label_header:
        s["label_header"] = label_header
    return s


def repro(key, title, unit, cond, tol, n=5):
    reads = [f"r{i}" for i in range(1, n + 1)]
    cols = (_readings("r", unit, n, short=True)
            + [_col("avg", f"Promedio ({unit})", _avg(reads), 3),
               _col("sd", "Desv. estándar s", "sd:" + ",".join(reads), 3),
               _col("cv", "CV = s / promedio × 100 (%)", "pct:sd,avg", 2)])
    return {"key": key, "kind": "repro", "title": title, "method": M_REPRO.format(n=n), "label_header": "Condición",
            "columns": cols, "params": [], "rows": [_row({}, tol, cond)]}


def lin(key, title, var, values, mas_values=None):
    reads = ["d1", "d2", "d3"]
    cols = ([_col("sel", f"{var} seleccionado")] + [_col(k, f"Dosis L{i} (µGy)") for i, k in enumerate(reads, 1)]
            + [_col("avg", "Dosis promedio (µGy)", _avg(reads), 3),
               _col("mas", "mAs empleados"),
               _col("x", "Rendimiento X = dosis / mAs (µGy/mAs)", "div:avg,mas", 3),
               _col("cl", "CL con el valor siguiente", "cl_next:x", 3)])
    rows = [_row({"sel": v, "mas": (mas_values or values)[i] if (mas_values or var == "mAs") else ""}, "CL ≤ 0.1")
            for i, v in enumerate(values)]
    return {"key": key, "kind": "lin", "title": title, "method": M_LIN, "columns": cols, "params": [], "rows": rows}


def rend(key, title, tech, mas):
    reads = ["d1", "d2", "d3"]
    cols = ([_col(k, f"Dosis L{i} (µGy)") for i, k in enumerate(reads, 1)]
            + [_col("avg", "Dosis promedio (µGy)", _avg(reads), 3),
               _col("mas", "mAs"),
               _col("x", "Rendimiento = dosis / mAs (µGy/mAs)", "div:avg,mas", 3),
               _col("ref", "Referencia del fabricante (µGy/mAs)"),
               _col("dev", "Desviación (%)", "dev_pct:x,ref", 1)])
    return {"key": key, "kind": "rend", "title": title, "label_header": "Técnica",
            "method": "3 disparos; rendimiento = dosis promedio / mAs; Desviación (%) = (rendimiento − referencia) / referencia × 100.",
            "columns": cols, "params": [], "rows": [_row({"mas": mas}, "Fabricante: ±____ %", tech)]}


def mean(key, title, unit, rows, method=M_MEAN, label_header="Condición / modo"):
    reads = ["r1", "r2", "r3"]
    cols = _readings("r", unit, 3) + [_col("avg", f"Promedio ({unit})", _avg(reads), 3)]
    return {"key": key, "kind": "mean", "title": title, "method": method, "label_header": label_header,
            "columns": cols, "params": [], "rows": [_row({}, tol, label) for label, tol in rows]}


def hvl(key, title, kv_note=""):
    return {"key": key, "kind": "hvl", "title": title, "method": M_HVL + kv_note, "columns": [], "params": [], "rows": []}


def coinc(key="coinc"):
    cols = [_col("b1", "Desviación borde 1 (cm)"), _col("b2", "Desviación borde 2 (cm)"),
            _col("sum", "Suma |b1| + |b2| (cm)", "sum_abs:b1,b2", 2), _col("dfp", "DFP empleada (cm)"),
            _col("pct", "Suma / DFP × 100 (%)", "pct:sum,dfp", 2)]
    rows = [_row({"dfp": "100"}, "≤ 2% de la DFP", "X (X1, X2)"), _row({"dfp": "100"}, "≤ 2% de la DFP", "Y (Y1, Y2)")]
    return {"key": key, "kind": "coinc", "title": "Coincidencia del campo luminoso con el campo de radiación",
            "method": M_COINC, "label_header": "Eje", "columns": cols, "params": [], "rows": rows}


def unif():
    cols = [_col("hu", "Número CT (HU)"), _col("diff", "Diferencia con el centro (HU)", "diff_row:hu,Centro", 1)]
    rows = [_row({}, "Referencia", "Centro")] + [
        _row({}, "±5 HU", f"Periferia — {p}") for p in ("arriba (12 h)", "derecha (3 h)", "abajo (6 h)", "izquierda (9 h)")]
    return {"key": "unif", "kind": "unif", "title": "Uniformidad espacial",
            "method": "1 escaneo del fantoma de agua; diferencia (HU) = número CT de la periferia − número CT del centro.",
            "label_header": "Región de interés (ROI)", "columns": cols, "params": [], "rows": rows}


def aec(key, title, measure, method):
    cols = [_col("sel", "Espesor de PMMA (cm)"), _col("kv", "kV seleccionado por el control automático"),
            _col("mas", "mAs entregado"), _col("val", measure),
            _col("dev", "Desviación respecto de 4 cm (%)", "dev_pct_row:val,sel,4", 1)]
    rows = [_row({"sel": e}, "Fabricante: ±____ %") for e in ("2", "4", "6")]
    return {"key": key, "kind": "aec", "title": title, "method": method, "columns": cols, "params": [], "rows": rows}


def dgm():
    reads = ["k1", "k2", "k3"]
    cols = ([_col(k, f"Kerma de entrada L{i} (mGy)") for i, k in enumerate(reads, 1)]
            + [_col("avg", "Kerma promedio K (mGy)", _avg(reads), 3), _col("f", "Factores g · c · s"),
               _col("dgm", "DGM = K · g · c · s (mGy)", "mul:avg,f", 3)])
    return {"key": "dgm", "kind": "dgm", "title": "Dosis glandular media (DGM) con el fantoma ACR",
            "method": "3 disparos en modo AEC; DGM = kerma promedio de entrada K × factores de conversión g · c · s del "
                      "protocolo (Dance) para el HVL medido.",
            "label_header": "Técnica AEC (kV / mAs / ánodo-filtro)", "columns": cols, "params": [],
            "rows": [_row({}, "≤ 3.0 mGy", "")]}


LEAK_POINTS_TUBE = ["Punto 1: cara frontal (dirección del haz útil, colimador cerrado)", "Punto 2: cara posterior",
                    "Punto 3: lateral derecho", "Punto 4: lateral izquierdo", "Punto 5: cara superior",
                    "Punto 6: cara inferior", "Punto 7: unión coraza–colimador"]
LEAK_POINTS_GANTRY = ["Punto 1: frontal (entrada del gantry)", "Punto 2: posterior (salida del gantry)",
                      "Punto 3: lateral derecho", "Punto 4: lateral izquierdo", "Punto 5: superior",
                      "Punto 6: inferior", "Punto 7: superficie de la mesa a la altura del isocentro"]


def fuga(gantry=False):
    reads = ["d1", "d2", "d3"]
    if gantry:
        params = [{"key": "kv", "label": "kV de carga máxima", "value": ""},
                  {"key": "ma", "label": "mA de carga máxima", "value": ""},
                  {"key": "t", "label": "Tiempo de exposición por escaneo t (s)", "value": ""}]
        rate = "rate_t:avg,p.t"
        method = ("3 escaneos por punto a la carga máxima; se promedia la dosis por escaneo y se convierte a tasa: "
                  "Tasa (mGy/h) = dosis promedio × 3600 / t.")
        title, points = "Radiación de fuga del gantry (a 1 m)", LEAK_POINTS_GANTRY
    else:
        params = [{"key": "kv", "label": "kVp de carga máxima", "value": ""},
                  {"key": "q", "label": "Carga por disparo Q (mAs)", "value": ""},
                  {"key": "i", "label": "Corriente continua máxima del fabricante I (mA)", "value": ""}]
        rate = "rate:avg,p.i,p.q"
        method = M_FUGA
        title, points = "Radiación de fuga de la coraza (a 1 m del foco)", LEAK_POINTS_TUBE
    cols = ([_col(k, f"Dosis L{i} (mGy)") for i, k in enumerate(reads, 1)]
            + [_col("avg", "Dosis promedio (mGy)", _avg(reads), 4), _col("rate", "Tasa de fuga calculada (mGy/h)", rate, 3)])
    return {"key": "fuga", "kind": "fuga", "title": title, "method": method, "label_header": "Punto de medición (a 1 m)",
            "columns": cols, "params": params, "rows": [_row({}, "≤ 1 mGy/h", p) for p in points]}


def simple(rows):
    return {"key": "simple", "kind": "simple", "title": "Pruebas de lectura única y verificaciones funcionales",
            "method": M_SIMPLE, "label_header": "Prueba / verificación",
            "columns": [_col("value", "Valor medido u observación")], "params": [],
            "rows": [_row({}, tol, label) for label, tol in rows]}


def acr():
    return {"key": "acr", "kind": "acr", "title": "Imagen de la prueba de fantoma y su puntaje (score)",
            "method": "", "columns": [], "params": [], "rows": []}


SECTIONS = {
    "RX": lambda: [
        exac("kvp", "Exactitud de kVp (DFD = ____ cm)", "kVp", ["60", "80", "100", "120"], "±5%"),
        repro("repkvp", "Reproducibilidad de kVp", "kVp", "80 kVp, 10 mAs", "CV ≤ 2%"),
        exac("mas", "Exactitud de mAs (sensor Radcal 90M10)", "mAs", ["10", "20", "50"], "±10%",
             method=M_EXAC.format(n=3) + NA_NOTE),
        exac("time", "Exactitud del tiempo de exposición", "ms", ["50", "100", "200"], "±10%"),
        lin("lin", "Linealidad del rendimiento con mAs (80 kVp, 100 cm)", "mAs", ["10", "20", "40"]),
        rend("rend", "Rendimiento del tubo a 1 m", "80 kVp / 10 mAs", "10"),
        hvl("hvl", "Filtración total — capa hemirreductora (HVL) a 80 kVp"),
        coinc(),
        fuga(),
        simple([("Perpendicularidad del haz (IBA BATT): desviación angular (°)", "≤ 1.5°"),
                ("Calidad de imagen con fantoma IBA Primus A: grupo de resolución y detalles de contraste visibles", "Sin artefactos"),
                ("Resistencia de puesta a tierra (Ω)", "< 4 Ω"),
                ("Voltaje neutro–tierra (V)", "≤ 3 V"),
                ("Movimientos, frenos, enclavamientos y parada de emergencia", "Operativos"),
                ("Señalización luminosa de emisión de radiación", "Operativa")]),
    ],
    "MAMMO": lambda: [
        mean("comp", "Fuerza de compresión máxima", "N", [("Compresión motorizada máxima", "111–200 N")]),
        exac("kvp", "Exactitud de kVp (DFD = ____ cm; ánodo/filtro: ______)", "kV", ["25", "28", "30"], "±5%"),
        exac("mas", "Exactitud de mAs (sensor Radcal 90M10, 28 kV)", "mAs", ["20", "50", "100"], "±10%",
             method=M_EXAC.format(n=3) + NA_NOTE),
        exac("time", "Exactitud del tiempo de exposición (28 kV, 50 mAs)", "ms", [""], "±10%",
             first="Tiempo indicado por la consola (ms)",
             method="3 lecturas; el valor de referencia es el tiempo que indica la consola; Desviación (%) = "
                    "(promedio − tiempo de consola) / tiempo de consola × 100."),
        lin("lin", "Linealidad del rendimiento con mAs (28 kV)", "mAs", ["20", "50", "100"]),
        hvl("hvl", "Capa hemirreductora (HVL) a 28 kV", " Mínimo: HVL ≥ kVp/100 + 0.03 mm Al."),
        dgm(),
        acr(),
        aec("aec", "Control automático de exposición (placas de PMMA del set IBA VD0203810)",
            "Valor medio de píxel (VMP) en la ROI",
            "1 disparo en modo AEC por espesor; Desviación (%) = (VMP del espesor − VMP con 4 cm) / VMP con 4 cm × 100."),
        fuga(),
        simple([("Uniformidad del detector (campo plano)", "Sin artefactos"),
                ("Parada de emergencia y liberación de la compresión", "Operativas")]),
    ],
    "CT": lambda: [
        exac("kvp", "Exactitud de kVp (tubo estacionario, isocentro)", "kV", ["80", "100", "120", "140"], "±5%"),
        repro("repkvp", "Reproducibilidad de kVp", "kV", "120 kV", "CV ≤ 2%"),
        exac("time", "Exactitud del tiempo de exposición / rotación", "s", ["1.0"], "±10%"),
        lin("lin", "Linealidad del rendimiento con mA (120 kV, 1 s)", "mA", ["100", "200", "300"]),
        repro("reprend", "Reproducibilidad del rendimiento", "µGy", "120 kV, 200 mA, 1 s", "CV ≤ 5%"),
        hvl("hvl", "Calidad del haz — capa hemirreductora (HVL) a 120 kV"),
        mean("ctagua", "Número CT del agua y del aire", "HU",
             [("Agua (ROI central del fantoma)", "0 ± 4 HU"), ("Aire (escaneo sin objeto)", "−1000 ± 5 HU")],
             method="3 escaneos; se lee el número CT en una ROI central y se compara el promedio con la tolerancia."),
        unif(),
        mean("ruido", "Ruido de imagen", "HU",
             [("Ruido σ en la ROI central — referencia del fabricante: ____ HU", "Fabricante: ±____ %")],
             method="3 escaneos; desviación estándar del número CT en la ROI central; se compara el promedio con la "
                    "referencia del fabricante."),
        exac("corte", "Espesor de corte", "mm", ["2", "5", "10"], "±1 mm", diff="mm", first="Espesor nominal (mm)",
             method="3 imágenes por espesor nominal; espesor medido = ancho a media altura (FWHM) del perfil de la "
                    "rampa; Diferencia (mm) = promedio − nominal."),
        exac("mesa", "Exactitud de posicionamiento de la mesa", "mm", ["100", "100"], "±1 mm", diff="mm",
             first="Desplazamiento ordenado (mm)", labels=["Entrada", "Salida"], label_header="Sentido",
             method="3 desplazamientos de 100 mm en cada sentido; Diferencia (mm) = promedio − 100 mm."),
        fuga(gantry=True),
        simple([("Resolución de alto contraste (pl/cm visibles)", "Fabricante: ____"),
                ("Resolución de bajo contraste (diámetro mínimo visible al % de contraste)", "Fabricante: ____"),
                ("Láseres de alineación", "Coinciden con el isocentro"),
                ("Movimientos de la mesa y parada de emergencia", "Operativos")]),
    ],
    "ANGIO": lambda: [
        exac("kvp", "Exactitud de kVp (DFD = ____ cm)", "kVp", ["60", "80", "100", "120"], "±5%"),
        hvl("hvl", "Filtración total — capa hemirreductora (HVL) a 80 kVp"),
        lin("lin", "Linealidad del rendimiento con mAs (80 kVp, 100 cm)", "mAs", ["10", "20", "40"]),
        repro("reprend", "Reproducibilidad del rendimiento", "µGy", "80 kVp, 20 mAs", "CV ≤ 5%"),
        mean("receptor", "Dosis en el receptor de imagen (FOV máximo, con rejilla, atenuador de 25 mm Al)", "µGy/s · µGy",
             [("Tasa de dosis en fluoroscopia (µGy/s) — referencia del fabricante: ____", "Fabricante: ±____ %"),
              ("Dosis por imagen en registro (µGy) — referencia del fabricante: ____", "Fabricante: ±____ %")]),
        mean("paciente", "Dosis a la entrada del maniquí de agua de 20 cm", "mGy/min · mGy",
             [("Fluoroscopia (mGy/min) — referencia del fabricante: ____", "Fabricante: ±____ %"),
              ("Registro (mGy/imagen) — referencia del fabricante: ____", "Fabricante: ±____ %")]),
        mean("tasa", "Tasa de exposición en fluoroscopia", "mGy/min",
             [("Modo normal", "≤ 87.6 mGy/min"), ("Modo de alta tasa (con aviso al operador)", "≤ 175 mGy/min")]),
        simple([("Resolución de pares de líneas — FOV 1: ____ (pl/mm)", "Fabricante: ____"),
                ("Resolución de pares de líneas — FOV 2: ____ (pl/mm)", "Fabricante: ____"),
                ("Resolución de pares de líneas — FOV 3: ____ (pl/mm)", "Fabricante: ____"),
                ("Resistencia de la tierra de protección (Ω)", "≤ 0.3 Ω (IEC 62353)"),
                ("Corriente de fuga del equipo, método diferencial (µA)", "≤ 500 µA (IEC 62353, clase I)"),
                ("Aviso al operador en alta tasa", "Operativo"),
                ("Anticolisión, parada de emergencia, retroceso de emergencia y enclavamientos", "Operativos")]),
    ],
    "CARM": lambda: [
        mean("tasa", "Tasa de dosis en fluoroscopia", "mGy/min", [("Modo normal", "≤ 50 mGy/min")]),
        exac("kvp", "Exactitud de kVp (DFD = ____ cm)", "kVp", ["60", "80", "100"], "±5%"),
        exac("ma", "Exactitud de mA (sensor Radcal 90M10)", "mA", ["", ""], "±10%", labels=["Fluoroscopia", "Radiografía"],
             label_header="Modo", method=M_EXAC.format(n=3) + " Equipos monobloque sin cable de alto voltaje accesible: «N/A»."),
        exac("time", "Exactitud del tiempo de exposición", "s", ["0.5"], "±10%"),
        fuga(),
        simple([("Temporizador de fluoroscopia: tiempo acumulado al sonar la alarma (min)", "Alarma a los 5 min"),
                ("Resolución espacial con IBA Primus FG-18 (pl/mm)", "Fabricante: ____"),
                ("Uniformidad de imagen", "Sin artefactos"),
                ("Frenos de seguridad en todos los ejes", "Operativos"),
                ("Parada de emergencia", "Operativa")]),
    ],
    "FLUORO": lambda: [
        mean("tasa", "Tasa de dosis en fluoroscopia", "mGy/min",
             [("Modo normal", "≤ 50 mGy/min"), ("Modo de alta tasa", "≤ 87.6 mGy/min")]),
        exac("kvp", "Exactitud de kVp (DFD = ____ cm)", "kVp", ["60", "80", "100"], "±5%"),
        exac("ma", "Exactitud de mA (sensor Radcal 90M10)", "mA", ["", ""], "±10%", labels=["Fluoroscopia", "Radiografía"],
             label_header="Modo", method=M_EXAC.format(n=3) + NA_NOTE),
        exac("time", "Exactitud del tiempo de exposición", "s", ["0.5"], "±10%"),
        aec("aec", "Control automático de exposición (placas de PMMA del set IBA VD0203800)",
            "Tasa de dosis a la entrada del receptor (µGy/s)",
            "1 lectura por espesor en fluoroscopia automática; Desviación (%) = (tasa del espesor − tasa con 4 cm) / "
            "tasa con 4 cm × 100."),
        coinc(),
        fuga(),
        simple([("Perpendicularidad del haz (IBA BATT): desviación angular (°)", "≤ 1.5°"),
                ("Temporizador de fluoroscopia: tiempo acumulado al sonar la alarma (min)", "Alarma a los 5 min"),
                ("Resolución espacial con IBA Primus FG-18 (pl/mm)", "Fabricante: ____"),
                ("Resolución de bajo contraste con IBA Primus FG-18", "Fabricante: ____"),
                ("Frenos, movimientos y parada de emergencia", "Operativos"),
                ("Señalización de alta tasa al operador", "Operativa")]),
    ],
}


# ------------------------------------------------------------------ calculations

def to_number(value):
    """Parse a technician-typed number ('0,35', ' 12.4 ', '100 (entrada)') or return None."""
    if value in (None, ""):
        return None
    m = re.match(r"\s*([-−+]?\d+(?:[.,]\d+)?)", str(value))
    if not m:
        return None
    return float(m.group(1).replace(",", ".").replace("−", "-"))


def fmt(value, digits=3):
    if value is None:
        return ""
    return f"{value:.{digits}f}".rstrip("0").rstrip(".") if digits else f"{value:.0f}"


def _arg(name, values, params):
    if name.startswith("p."):
        return to_number(params.get(name[2:]))
    if name in values:
        v = values[name]
        return v if isinstance(v, float) or v is None else to_number(v)
    return to_number(name)


def _row_op(op, args, values, params):
    nums = [_arg(a, values, params) for a in args]
    if op == "avg":
        xs = [x for x in nums if x is not None]
        return sum(xs) / len(xs) if xs else None
    if op == "sd":
        xs = [x for x in nums if x is not None]
        if len(xs) < 2:
            return None
        m = sum(xs) / len(xs)
        return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))
    if op == "max":
        xs = [x for x in nums if x is not None]
        return max(xs) if xs else None
    if any(x is None for x in nums):
        return None
    a = nums[0]
    if op == "dev_pct":
        return (a - nums[1]) / nums[1] * 100 if nums[1] else None
    if op == "diff":
        return a - nums[1]
    if op == "div":
        return a / nums[1] if nums[1] else None
    if op == "mul":
        return a * nums[1]
    if op == "pct":
        return a / nums[1] * 100 if nums[1] else None
    if op == "sum_abs":
        return abs(a) + abs(nums[1])
    if op == "rate":          # dose (mGy) × I (mA) × 3600 / Q (mAs)
        return a * nums[1] * 3600 / nums[2] if nums[2] else None
    if op == "rate_t":        # dose (mGy) × 3600 / t (s)
        return a * 3600 / nums[1] if nums[1] else None
    raise ValueError(op)


CROSS_ROW = ("cl_next", "diff_row", "dev_pct_row")


def evaluate_section(section):
    """Rows of `section` with every calculated column filled in (raw floats under 'calc')."""
    params = {p["key"]: p.get("value", "") for p in section.get("params", [])}
    rows = section.get("rows", [])
    values = [dict(r.get("v", {})) for r in rows]
    cols = section.get("columns", [])
    for col in cols:
        calc = col.get("calc")
        if not calc:
            continue
        op, _, rest = calc.partition(":")
        args = rest.split(",") if rest else []
        for i, vals in enumerate(values):
            if op == "cl_next":
                x = _arg(args[0], vals, params)
                nxt = _arg(args[0], values[i + 1], params) if i + 1 < len(values) else None
                vals[col["key"]] = abs(x - nxt) / (x + nxt) if (x is not None and nxt is not None and x + nxt) else None
            elif op == "diff_row":
                ref = next((v for r, v in zip(rows, values, strict=True) if r.get("label") == args[1]), None)
                if rows[i].get("label") == args[1] or ref is None:
                    vals[col["key"]] = None
                else:
                    a, b = _arg(args[0], vals, params), _arg(args[0], ref, params)
                    vals[col["key"]] = a - b if (a is not None and b is not None) else None
            elif op == "dev_pct_row":
                key, match_col, match_val = args
                ref = next((v for v in values if to_number(v.get(match_col)) == to_number(match_val)), None)
                if ref is None or ref is vals:
                    vals[col["key"]] = None
                else:
                    a, b = _arg(key, vals, params), _arg(key, ref, params)
                    vals[col["key"]] = (a - b) / b * 100 if (a is not None and b) else None
            else:
                vals[col["key"]] = _row_op(op, args, vals, params)
    out = []
    for r, vals in zip(rows, values, strict=True):
        cells = []
        for col in cols:
            if col.get("calc"):
                cells.append({"value": fmt(vals.get(col["key"]), col.get("digits", 3)), "calc": True})
            else:
                cells.append({"value": r.get("v", {}).get(col["key"], ""), "calc": False})
        out.append({**r, "cells": cells})
    return out


def hvl_interpolated(rows):
    """HVL (mm Al) by log interpolation between the steps that bracket D0/2, or None."""
    pts = [(to_number(r.get("thickness")), to_number(r.get("dose"))) for r in rows or []]
    pts = [(t, d) for t, d in pts if t is not None and d is not None and d > 0]
    if len(pts) < 2:
        return None
    d0 = pts[0][1]
    half = d0 / 2
    for (t1, d1), (t2, d2) in zip(pts, pts[1:], strict=False):
        if d1 >= half >= d2 and d1 != d2:
            return t1 + (t2 - t1) * math.log(2 * d1 / d0) / math.log(d1 / d2)
    return None
