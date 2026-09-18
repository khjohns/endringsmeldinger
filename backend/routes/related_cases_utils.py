"""
Felles utilities for routes som håndterer relaterte saker.

Brukes av forsering_routes.py og endringsordre_routes.py for å redusere
duplisert kode for felles operasjoner på container-saker.
"""

from collections.abc import Callable
from typing import Any

from flask import jsonify

from lib.auth.event_visibility import visible_events
from lib.cloudevents import format_timeline_response
from models.sak_state import SakRelasjon, SakState
from utils.logger import get_logger

logger = get_logger(__name__)


def serialize_sak_relasjon(relasjon: SakRelasjon) -> dict[str, Any]:
    """
    Konverterer en SakRelasjon til dict for JSON-respons.

    Args:
        relasjon: SakRelasjon objekt

    Returns:
        Dict egnet for JSON serialisering
    """
    return {
        "relatert_sak_id": relasjon.relatert_sak_id,
        "relatert_sak_tittel": relasjon.relatert_sak_tittel,
        "bimsync_issue_board_ref": relasjon.bimsync_issue_board_ref,
        "bimsync_issue_number": relasjon.bimsync_issue_number,
    }


def serialize_relaterte_saker(relasjoner: list[SakRelasjon]) -> list[dict[str, Any]]:
    """
    Konverterer en liste med SakRelasjon til dicts for JSON-respons.

    Args:
        relasjoner: Liste med SakRelasjon objekter

    Returns:
        Liste med dicts egnet for JSON serialisering
    """
    return [serialize_sak_relasjon(r) for r in relasjoner]


def serialize_sak_states(states: dict[str, SakState]) -> dict[str, Any]:
    """
    Konverterer dict med SakState til dict for JSON-respons.

    Args:
        states: Dict[sak_id, SakState]

    Returns:
        Dict[sak_id, dict] egnet for JSON serialisering
    """
    # Aktivitetstall hører ikke hjemme i en relasjonsvisning: de teller hele
    # strømmen, også motpartens interne notater, og røper dermed at notatet
    # finnes (audit RV-09). Relasjonen viser sakens innhold, ikke aktiviteten.
    result = {}
    for sak_id, state in states.items():
        data = state.model_dump() if hasattr(state, "model_dump") else dict(state)
        data.pop("antall_events", None)
        data.pop("siste_aktivitet", None)
        result[sak_id] = data
    return result


def serialize_hendelser(hendelser: dict[str, list]) -> dict[str, list[dict]]:
    """
    Konverterer dict med hendelser til CloudEvents-format.

    Args:
        hendelser: Dict[sak_id, List[AnyEvent]]

    Returns:
        Dict[sak_id, List[CloudEvent dict]] egnet for JSON serialisering
    """
    result = {}
    for sak_id, events in hendelser.items():
        result[sak_id] = format_timeline_response(visible_events(events))
    return result


def build_relaterte_response(sak_id: str, relasjoner: list[SakRelasjon]) -> tuple:
    """
    Bygger standard respons for hent_relaterte_saker endepunkt.

    Args:
        sak_id: ID for containersaken
        relasjoner: Liste med relaterte saker

    Returns:
        Tuple (jsonify response, status_code)
    """
    return jsonify(
        {
            "success": True,
            "sak_id": sak_id,
            "relaterte_saker": serialize_relaterte_saker(relasjoner),
        }
    ), 200


def build_kontekst_response(
    sak_id: str, kontekst: dict[str, Any], extra_fields: dict[str, Any] | None = None
) -> tuple:
    """
    Bygger standard respons for hent_kontekst endepunkt.

    Args:
        sak_id: ID for containersaken
        kontekst: Dict med kontekst-data fra service
        extra_fields: Eventuelle ekstra felter for spesifikk sakstype
                      (f.eks. eo_hendelser for endringsordre)

    Returns:
        Tuple (jsonify response, status_code)

    Note:
        Hendelser formateres som CloudEvents v1.0 for konsistens
        med /api/cases/<sak_id>/timeline endepunktet.
    """
    # A relation is client-supplied, so every referenced case is re-checked against
    # the authorized project before anything about it is returned (audit RV-07).
    from lib.auth.project_access import cases_in_project

    relaterte = list(kontekst.get("relaterte_saker", []))
    states = dict(kontekst.get("sak_states", {}))
    hendelser = dict(kontekst.get("hendelser", {}))
    referenced = (
        {getattr(r, "relatert_sak_id", None) for r in relaterte}
        | set(states)
        | set(hendelser)
    ) - {None}
    if referenced:
        allowed = cases_in_project(referenced)
        relaterte = [
            r for r in relaterte if getattr(r, "relatert_sak_id", None) in allowed
        ]
        states = {k: v for k, v in states.items() if k in allowed}
        hendelser = {k: v for k, v in hendelser.items() if k in allowed}

    response = {
        "success": True,
        "sak_id": sak_id,
        "relaterte_saker": serialize_relaterte_saker(relaterte),
        "sak_states": serialize_sak_states(states),
        "hendelser": serialize_hendelser(hendelser),
        "oppsummering": kontekst.get("oppsummering", {}),
    }

    # Legg til ekstra felter hvis de finnes
    # Formater hendelser i extra_fields som CloudEvents
    if extra_fields:
        for key, value in extra_fields.items():
            if key.endswith("_hendelser") and isinstance(value, list):
                # Formater som CloudEvents (f.eks. eo_hendelser, forsering_hendelser)
                response[key] = format_timeline_response(visible_events(value))
            else:
                response[key] = value

    return jsonify(response), 200


def build_kandidater_response(kandidater: list[dict[str, Any]]) -> tuple:
    """
    Bygger standard respons for hent_kandidater endepunkt.

    Args:
        kandidater: Liste med kandidat-saker

    Returns:
        Tuple (jsonify response, status_code)
    """
    return jsonify({"success": True, "kandidat_saker": kandidater}), 200


def build_success_message(
    message: str, extra_data: dict[str, Any] | None = None
) -> tuple:
    """
    Bygger standard suksess-respons med melding.

    Args:
        message: Suksessmelding
        extra_data: Eventuelle ekstra felter

    Returns:
        Tuple (jsonify response, status_code)
    """
    response = {"success": True, "message": message}
    if extra_data:
        response.update(extra_data)
    return jsonify(response), 200


def validate_required_fields(
    payload: dict[str, Any], required: list[str]
) -> tuple | None:
    """
    Validerer at påkrevde felter finnes i payload.

    Args:
        payload: Request payload
        required: Liste med påkrevde feltnavn

    Returns:
        None hvis ok, ellers (error_response, status_code)
    """
    missing = [f for f in required if f not in payload or payload[f] is None]
    if missing:
        return jsonify(
            {
                "success": False,
                "error": "MISSING_FIELDS",
                "message": f"Mangler påkrevde felter: {', '.join(missing)}",
            }
        ), 400
    return None


def safe_find_related(service_method: Callable, sak_id: str, result_key: str) -> tuple:
    """
    Trygt søk etter relaterte saker med graceful fallback.

    Brukes for by-relatert endepunkter som ikke bør feile med 500.

    Args:
        service_method: Service-metode å kalle (f.eks. service.finn_forseringer_for_sak)
        sak_id: Sak-ID å søke etter
        result_key: Nøkkel i respons (f.eks. "forseringer" eller "endringsordrer")

    Returns:
        Tuple (jsonify response, status_code)
    """
    try:
        results = service_method(sak_id)
        return jsonify({"success": True, result_key: results}), 200
    except Exception as e:
        logger.warning(f"Kunne ikke søke etter {result_key} for {sak_id}: {e}")
        return jsonify({"success": True, result_key: []}), 200
