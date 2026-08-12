"""Writing assistant for work orders.

Takes the technician's raw field notes and returns them redistributed into the
OT's fields, written in formal technical Spanish. It only reorganizes and
rewrites what the technician actually wrote: the signed OT certifies the
service performed and is the basis for billing the client, so inventing a
detail here would mean certifying work that never happened.
"""
import logging

from django.conf import settings

from apps.work_orders.models import WorkOrder

logger = logging.getLogger(__name__)

MODEL = "claude-opus-5"
MAX_TOKENS = 16000

RESULT_VALUES = [choice[0] for choice in WorkOrder.Result.choices]

SYSTEM_PROMPT = """\
Eres asistente de redacción para los técnicos de Dimed Healthcare S.A., empresa \
ecuatoriana de servicio técnico de equipos médicos de imagenología.

El técnico te entrega sus notas de campo en bruto: como las escribió en el sitio, \
con abreviaturas, sin tildes y sin estructura. Tu trabajo es reescribirlas en \
español formal de Ecuador y repartirlas en los campos de la orden de trabajo.

REGLA PRINCIPAL, POR ENCIMA DE TODO: no inventes nada. La orden de trabajo firmada \
es el documento que certifica ante el cliente el servicio realizado y es la base \
para facturarlo. Escribir un procedimiento, una medición, un repuesto o una \
conclusión que el técnico no mencionó equivale a certificar trabajo que no se hizo.

De modo que:
- Reescribe únicamente lo que el técnico escribió. Corrige ortografía, gramática y \
  puntuación; ordena las ideas; usa terminología técnica correcta.
- No agregues procedimientos, mediciones, valores, marcas, repuestos ni normas que \
  no aparezcan en las notas.
- No conviertas una observación en una conclusión. Si el técnico escribió "se veia \
  quemado", no escribas "se confirmó la falla del componente".
- Si un campo no tiene información en las notas, déjalo como cadena vacía. Un campo \
  vacío es correcto; uno inventado no.
- Mantén las cifras, códigos y nombres propios exactamente como los escribió.

Cómo repartir el contenido:
- diagnosis: qué se encontró y cuál es la causa de la falla, según el técnico.
- work_performed: las acciones concretas que ejecutó sobre el equipo.
- follow_up_notes: lo que queda pendiente, recomendaciones al cliente o riesgos \
  advertidos. Vacío si no mencionó nada pendiente.
- result: el desenlace del servicio, deducido de las notas. Usa NOT_RESOLVED si el \
  equipo sigue inoperativo, PARTIAL si quedó funcionando con limitaciones, \
  FOLLOW_UP si requiere una visita adicional ya prevista, RESOLVED si quedó operativo \
  sin pendientes. Si las notas no permiten deducirlo, usa cadena vacía.

Escribe en tercera persona impersonal ("se revisó", "se reemplazó"), en pasado, sin \
encabezados ni viñetas: párrafos corridos, que es como se leen en el PDF de la OT."""

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "diagnosis": {
            "type": "string",
            "description": "Diagnóstico: hallazgo y causa de la falla. Vacío si no consta.",
        },
        "work_performed": {
            "type": "string",
            "description": "Trabajo realizado sobre el equipo. Vacío si no consta.",
        },
        "follow_up_notes": {
            "type": "string",
            "description": "Pendientes o recomendaciones. Vacío si no consta.",
        },
        "result": {
            "type": "string",
            "enum": RESULT_VALUES + [""],
            "description": "Desenlace del servicio, o vacío si no se deduce.",
        },
        "omitted": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
                "Datos que la OT normalmente lleva y que las notas no mencionan, "
                "para que el técnico los complete. Vacío si no falta nada."
            ),
        },
    },
    "required": ["diagnosis", "work_performed", "follow_up_notes", "result", "omitted"],
    "additionalProperties": False,
}


class WritingAssistantUnavailable(RuntimeError):
    """The assistant is not configured or the API could not be reached."""


def is_configured():
    return bool(settings.ANTHROPIC_API_KEY)


def _equipment_context(work_order):
    """What the equipment is, so the wording uses the right terminology."""
    equipment = work_order.equipment
    lines = [
        f"Equipo: {equipment.brand} {equipment.model_name}",
        f"Modalidad: {equipment.get_modality_display()}",
        f"Código interno: {equipment.internal_code}",
        f"Cliente: {work_order.client.name}",
        f"Tipo de OT: {work_order.get_ot_type_display()}",
    ]
    if work_order.reported_problem:
        lines.append(f"Problema reportado por el cliente: {work_order.reported_problem}")
    return "\n".join(lines)


def draft_work_order_text(work_order, raw_notes):
    """Return {diagnosis, work_performed, follow_up_notes, result, omitted}.

    Raises WritingAssistantUnavailable when the API key is missing or the call
    fails — the caller surfaces that instead of writing a partial draft.
    """
    if not is_configured():
        raise WritingAssistantUnavailable(
            "El asistente de redacción no está configurado (falta ANTHROPIC_API_KEY)."
        )

    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    user_content = (
        f"Contexto de la orden de trabajo:\n{_equipment_context(work_order)}\n\n"
        f"Notas de campo del técnico:\n{raw_notes}"
    )

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            output_config={
                "effort": "medium",
                "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA},
            },
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.APIError as exc:
        logger.exception("Writing assistant failed for OT %s", work_order.number)
        raise WritingAssistantUnavailable(
            "No se pudo contactar al asistente de redacción. Intente nuevamente."
        ) from exc

    if response.stop_reason == "refusal":
        raise WritingAssistantUnavailable(
            "El asistente no pudo procesar estas notas. Redacte los campos a mano."
        )

    import json

    text = next((b.text for b in response.content if b.type == "text"), "")
    draft = json.loads(text)
    logger.info(
        "Drafted OT %s (%s in / %s out tokens)",
        work_order.number,
        response.usage.input_tokens,
        response.usage.output_tokens,
    )
    return draft
