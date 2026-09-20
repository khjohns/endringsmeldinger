"""Private BH endpoints; identity and chain come exclusively from server configuration."""

import os

from flask import Blueprint, g, jsonify, request

from lib.auth.contract_role import require_contract_role
from lib.auth.project_access import require_project_access
from lib.auth.session import require_auth
from lib.project_context import get_project_id
from repositories.event_repository import ConcurrencyError
from services.approval_authority import handler_identity, policy_entry
from services.approval_policy import (
    authority_policy,
    project_policy,
    resolve_policy_actor,
)
from services.approval_service import ApprovalService

approval_bp = Blueprint("approvals", __name__)


def context(case_id):
    from core.container import get_container

    container = get_container()
    # Ingen fallback: uten autorisert prosjekt finnes ingen policy å slå opp.
    project = get_project_id()
    identity = getattr(g, "user", {}) or {}
    if identity.get("sak_id") and identity["sak_id"] != case_id:
        raise PermissionError("Du har ikke tilgang til saken.")
    metadata = container.metadata_repository.get(case_id)
    if metadata is None or not project or metadata.prosjekt_id != project:
        raise PermissionError("Saken tilhører ikke prosjektet.")
    policy = project_policy(project)
    if not policy:
        raise PermissionError("Intern godkjenning er ikke konfigurert for prosjektet.")
    # Which entry this user may act as — never the e-mail on its own (audit RV-03).
    actor = resolve_policy_actor(policy, identity)
    handlers = [
        str(policy_entry(entry).get("id", "")).lower()
        for entry in policy.get("handlers", [])
    ]
    chain = [{**user, "id": user["id"].lower()} for user in policy.get("chain", [])]
    resolved_policy = authority_policy(
        policy, project, lambda: getattr(container, "project_repository", None)
    )
    from services.business_rules import BusinessRuleValidator

    service = ApprovalService(
        os.environ.get("BH_APPROVAL_DB", "koe_data/approvals.sqlite3"),
        container.event_repository,
        container.timeline_service,
        BusinessRuleValidator(),
        authority_policy=resolved_policy,
    )
    allowed = actor in handlers + [u["id"] for u in chain]
    if actor and not allowed:
        existing = service.read(project, case_id)
        allowed = any(
            p["owner"] == actor or any(step["id"] == actor for step in p["steps"])
            for p in existing["packages"]
        )
    if not actor or not allowed:
        raise PermissionError("Du har ikke tilgang til byggherrens interne behandling.")
    return service, project, actor, chain, actor in handlers, policy


@approval_bp.route("/api/cases/<case_id>/approvals", methods=["GET", "POST"])
@require_auth
@require_project_access(min_role="member")
@require_contract_role("BH")
def approvals(case_id):
    try:
        service, project, actor, chain, can_prepare, policy = context(case_id)
        if request.method == "GET":
            service.reconcile_policy(project, case_id, chain)
            state = service.read(project, case_id)
        else:
            body = request.get_json()
            if not isinstance(body, dict):
                raise ValueError("Ugyldig forespørsel.")

            state = service.command(
                project,
                case_id,
                actor,
                chain,
                can_prepare,
                body,
                team=getattr(g, "contract_team", None),
            )
            if not isinstance(state, dict):
                return state
        if request.method == "POST" and body.get("action") == "publish":
            # Metadata is a cache; confirmed publication must remain successful if it fails.
            try:
                from datetime import UTC, datetime

                from core.container import get_container
                from models.events import parse_event

                container = get_container()
                raw, _ = container.event_repository.get_events(case_id)
                public = container.timeline_service.compute_state(
                    [parse_event(e) for e in raw]
                )
                container.metadata_repository.update_cache(
                    sak_id=case_id,
                    cached_title=public.sakstittel,
                    cached_status=public.overordnet_status,
                    last_event_at=datetime.now(UTC),
                    cached_sum_krevd=public.vederlag.krevd_belop,
                    cached_sum_godkjent=public.vederlag.godkjent_belop,
                    cached_dager_krevd=public.frist.krevd_dager,
                    cached_dager_godkjent=public.frist.godkjent_dager,
                )
            except Exception:
                from utils.logger import get_logger

                get_logger(__name__).exception(
                    "Approval publication: metadata cache refresh failed"
                )
        if request.method == "POST" and body.get("action") == "publish":

            def dispatch(package):
                import base64

                from core.config import settings
                from models.events import parse_event
                from routes.event_routes import (
                    _get_event_repo,
                    _get_metadata_repo,
                    _get_timeline_service,
                    _post_to_catenda,
                )
                from services.approval_letter import pdf_bytes, snapshot

                metadata = _get_metadata_repo().get(case_id)
                if not settings.is_catenda_enabled or not metadata.catenda_topic_id:
                    return "not_configured"
                raw, _ = _get_event_repo().get_events(case_id)
                events = [parse_event(e) for e in raw]
                public = _get_timeline_service().compute_state(events)
                event = next(e for e in events if e.event_id == package["eventIds"][-1])
                success, _, _ = _post_to_catenda(
                    case_id,
                    public,
                    event,
                    metadata.catenda_topic_id,
                    client_pdf_base64=base64.b64encode(
                        pdf_bytes(snapshot(package["letter"], package["id"]))
                    ).decode("ascii"),
                    client_pdf_filename=f"brev-{case_id}-{package['id']}.pdf",
                    require_supplied_pdf=True,
                )
                return "delivered" if success else "failed"

            service.deliver(project, case_id, body["packageId"], dispatch)
            state = service.read(project, case_id)
        return jsonify(
            state=state,
            actor=actor,
            chain=chain,
            canPrepare=can_prepare,
            sender=handler_identity(policy, actor),
            dailyRate=service.authority_policy.get("daily_rate"),
        )
    except PermissionError as error:
        return jsonify(message=str(error)), 403
    except ConcurrencyError:
        return jsonify(
            message="Behandlingen er endret av en annen bruker. Oppdater status og prøv igjen."
        ), 409
    except (ValueError, KeyError, StopIteration, TypeError) as error:
        return jsonify(message=str(error) or "Fant ikke vurderingen eller pakken."), 400
