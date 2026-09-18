"""
Endringsordre Routes Blueprint

REST API for endringsordresaker (§31.3 NS 8407).

Endpoints:
- POST /api/endringsordre/opprett - Opprett ny endringsordresak
- GET /api/endringsordre/<sak_id>/relaterte - Hent relaterte KOE-saker
- GET /api/endringsordre/<sak_id>/kontekst - Hent komplett kontekst
- POST /api/endringsordre/<sak_id>/koe - Legg til KOE-sak
- DELETE /api/endringsordre/<sak_id>/koe/<koe_sak_id> - Fjern KOE-sak
- GET /api/endringsordre/kandidater - Hent kandidat-KOE-saker for ny EO
- GET /api/endringsordre/by-relatert/<sak_id> - Finn EO-er for en KOE-sak
- GET/POST /api/endringsordre/godkjenninger - Intern godkjenning før utstedelse
"""

import os

from flask import Blueprint, g, jsonify, request

from lib.auth.contract_role import require_contract_role
from lib.auth.project_access import cases_in_project, require_project_access
from lib.auth.session import require_auth
from lib.decorators import handle_service_errors
from routes.related_cases_utils import (
    build_kandidater_response,
    build_kontekst_response,
    build_relaterte_response,
    validate_required_fields,
)
from services.approval_policy import (
    authority_policy,
    project_policy,
    public_event_block_reason,
)
from utils.logger import get_logger

logger = get_logger(__name__)

# Create Blueprint
endringsordre_bp = Blueprint("endringsordre", __name__)


# ---------------------------------------------------------------------------
# Dependency access via Container
# ---------------------------------------------------------------------------


def _get_container():
    """Hent DI Container."""
    from core.container import get_container

    return get_container()


def _get_endringsordre_service():
    """Hent EndringsordreService fra Container."""
    return _get_container().get_endringsordre_service()


@endringsordre_bp.route("/api/endringsordre/opprett", methods=["POST"])
@require_auth
@require_project_access(min_role="member")
@require_contract_role("BH")
@handle_service_errors
def opprett_endringsordresak():
    """
    Opprett en ny endringsordresak.

    Request:
    {
        "eo_nummer": "EO-001",
        "beskrivelse": "Endring av fundamenter...",
        "koe_sak_ids": ["sak-guid-1", "sak-guid-2"],
        "konsekvenser": {...},
        "oppgjorsform": "ENHETSPRISER",
        "kompensasjon_belop": 150000,
        ...
    }
    """
    blocked = public_event_block_reason(
        project_policy(g.project_id), {"event_type": "eo_opprettet"}
    )
    if blocked:
        return jsonify(error="APPROVAL_REQUIRED", message=blocked), 403

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Forespørselen må inneholde et JSON-objekt")

    # Valider påkrevde felter
    error = validate_required_fields(payload, ["eo_nummer", "beskrivelse"])
    if error:
        return error

    service = _get_endringsordre_service()

    result = service.opprett_endringsordresak(
        eo_nummer=payload["eo_nummer"],
        beskrivelse=payload["beskrivelse"],
        koe_sak_ids=payload.get("koe_sak_ids", []),
        konsekvenser=payload.get("konsekvenser"),
        konsekvens_beskrivelse=payload.get("konsekvens_beskrivelse"),
        oppgjorsform=payload.get("oppgjorsform"),
        kompensasjon_belop=payload.get("kompensasjon_belop"),
        fradrag_belop=payload.get("fradrag_belop"),
        er_estimat=payload.get("er_estimat", False),
        frist_dager=payload.get("frist_dager"),
        ny_sluttdato=payload.get("ny_sluttdato"),
        utstedt_av=g.user.get("name") or g.user.get("email") or g.user["id"],
    )

    logger.info(
        f"Endringsordresak opprettet: {result['sak_id']} (catenda_synced={result.get('catenda_synced')})"
    )

    return jsonify({"success": True, **result}), 201


@endringsordre_bp.route("/api/endringsordre/<sak_id>/relaterte", methods=["GET"])
@require_auth
@require_project_access()
@handle_service_errors
def hent_relaterte_koe_saker(sak_id: str):
    """Hent alle KOE-saker relatert til en endringsordre."""
    service = _get_endringsordre_service()
    relasjoner = service.hent_relaterte_saker(sak_id)
    return build_relaterte_response(sak_id, relasjoner)


@endringsordre_bp.route("/api/endringsordre/<sak_id>/kontekst", methods=["GET"])
@require_auth
@require_project_access()
@handle_service_errors
def hent_eo_kontekst(sak_id: str):
    """
    Hent komplett kontekst for en endringsordresak.

    Inkluderer relaterte KOE-saker, states, hendelser og oppsummering.
    """
    service = _get_endringsordre_service()
    kontekst = service.hent_komplett_eo_kontekst(
        sak_id, tillatte_saker=cases_in_project
    )

    # EO har ekstra felt: eo_hendelser
    return build_kontekst_response(
        sak_id,
        kontekst,
        extra_fields={"eo_hendelser": kontekst.get("eo_hendelser", [])},
    )


@endringsordre_bp.route("/api/endringsordre/<sak_id>/koe", methods=["POST"])
@require_auth
@require_project_access(min_role="member")
@require_contract_role("BH")
@handle_service_errors
def legg_til_koe(sak_id: str):
    """Legg til en KOE-sak til endringsordren."""
    blocked = public_event_block_reason(
        project_policy(g.project_id), {"event_type": "eo_koe_lagt_til"}
    )
    if blocked:
        return jsonify(error="APPROVAL_REQUIRED", message=blocked), 403
    payload = request.json

    error = validate_required_fields(payload, ["koe_sak_id"])
    if error:
        return error

    service = _get_endringsordre_service()
    result = service.legg_til_koe(
        sak_id, payload["koe_sak_id"], aktor=g.user.get("name") or g.user["email"]
    )

    logger.info(
        f"KOE {payload['koe_sak_id']} lagt til EO {sak_id} (catenda_synced={result.get('catenda_synced')})"
    )
    return jsonify(
        {
            "success": True,
            "message": "KOE lagt til endringsordre",
            "catenda_synced": result.get("catenda_synced", False),
        }
    )


@endringsordre_bp.route(
    "/api/endringsordre/<sak_id>/koe/<koe_sak_id>", methods=["DELETE"]
)
@require_auth
@require_project_access(min_role="member")
@require_contract_role("BH")
@handle_service_errors
def fjern_koe(sak_id: str, koe_sak_id: str):
    """Fjern en KOE-sak fra endringsordren."""
    blocked = public_event_block_reason(
        project_policy(g.project_id), {"event_type": "eo_koe_fjernet"}
    )
    if blocked:
        return jsonify(error="APPROVAL_REQUIRED", message=blocked), 403
    service = _get_endringsordre_service()
    result = service.fjern_koe(
        sak_id, koe_sak_id, aktor=g.user.get("name") or g.user["email"]
    )

    logger.info(
        f"KOE {koe_sak_id} fjernet fra EO {sak_id} (catenda_synced={result.get('catenda_synced')})"
    )
    return jsonify(
        {
            "success": True,
            "message": "KOE fjernet fra endringsordre",
            "catenda_synced": result.get("catenda_synced", False),
        }
    )


@endringsordre_bp.route("/api/endringsordre/neste-nummer", methods=["GET"])
@require_auth
@require_project_access()
@handle_service_errors
def hent_neste_eo_nummer():
    """
    Hent neste ledige EO-nummer basert på antall eksisterende endringsordrer.

    Returns:
        { "neste_nummer": "EO-004", "antall_eksisterende": 3 }
    """
    return jsonify(_get_endringsordre_service().hent_neste_eo_nummer())


@endringsordre_bp.route("/api/endringsordre/kandidater", methods=["GET"])
@require_auth
@require_project_access()
@handle_service_errors
def hent_kandidat_koe_saker():
    """Hent KOE-saker som kan legges til i en endringsordre."""
    service = _get_endringsordre_service()
    kandidater = service.hent_kandidat_koe_saker()
    return build_kandidater_response(kandidater)


@endringsordre_bp.route("/api/endringsordre/by-relatert/<sak_id>", methods=["GET"])
@require_auth
@require_project_access()
@handle_service_errors
def finn_eoer_for_koe(sak_id: str):
    """Finn endringsordrer som refererer til en gitt KOE-sak."""
    service = _get_endringsordre_service()
    return jsonify(success=True, endringsordrer=service.finn_eoer_for_koe(sak_id))


@endringsordre_bp.route("/api/endringsordre/godkjenninger", methods=["GET", "POST"])
@require_auth
@require_project_access(min_role="member")
@require_contract_role("BH")
def eo_godkjenninger():
    """Private BH approval of change orders; identities and chain come from server policy."""
    from repositories.event_repository import ConcurrencyError
    from services.approval_authority import handler_identity
    from services.eo_approval_service import EOApprovalService

    project = getattr(g, "project_id", "oslobygg")
    identity = getattr(g, "user", {}) or {}
    actor = (identity.get("email") or "").lower()
    policy = project_policy(project)
    try:
        if not policy:
            raise PermissionError(
                "Intern godkjenning er ikke konfigurert for prosjektet."
            )
        policy = authority_policy(
            policy,
            project,
            lambda: getattr(_get_container(), "project_repository", None),
        )
        service = EOApprovalService(
            os.environ.get("BH_APPROVAL_DB", "koe_data/approvals.sqlite3"),
            _get_endringsordre_service(),
            policy,
            # Events are the commit point of case creation, not metadata.
            issued=lambda sak_id: _get_container().event_repository.get_events(sak_id)[
                1
            ]
            > 0,
        )
        if not actor or not (
            service.is_handler(actor) or any(u["id"] == actor for u in service.chain)
        ):
            raise PermissionError(
                "Du har ikke tilgang til byggherrens interne behandling."
            )
        if request.method == "GET":
            state = service.read(project, actor)
        else:
            body = request.get_json(silent=True)
            if not isinstance(body, dict):
                raise ValueError("Ugyldig forespørsel.")
            state = service.command(project, actor, body, identity.get("name") or actor)
        return jsonify(
            state=state,
            actor=actor,
            sender=handler_identity(policy, actor),
            chain=service.chain,
            canPrepare=service.is_handler(actor),
            dailyRate=policy.get("daily_rate"),
        )
    except PermissionError as error:
        return jsonify(message=str(error)), 403
    except ConcurrencyError:
        return jsonify(
            message="Behandlingen er endret av en annen bruker. Oppdater status og prøv igjen."
        ), 409
    except (ValueError, KeyError, TypeError) as error:
        return jsonify(message=str(error) or "Ugyldig forespørsel."), 400
