"""Shared server policy for approval entry points and authority configuration."""

import json
import os


def project_policy(project):
    return json.loads(os.environ.get("BH_APPROVAL_POLICIES", "{}")).get(project)


def authority_policy(policy, project, get_project_repository):
    """Explicit override wins; resolve the project repository only for fallback."""
    result = dict(policy)
    if "daily_rate" not in result:
        project_repository = get_project_repository()
        record = (
            project_repository.get(project) if project_repository is not None else None
        )
        settings = record.settings if record is not None else {}
        contract = settings.get("contract") if isinstance(settings, dict) else None
        result["daily_rate"] = (
            contract.get("dagmulkt_sats") if isinstance(contract, dict) else None
        )
    return result


def public_event_block_reason(policy, event):
    """Public APIs cannot publish approval-controlled content directly.

    Internal publication writes validated events via the service/repository,
    never by supplying a bypass flag to a public HTTP endpoint. TE decisions
    (eo_akseptert/eo_bestridt) remain independent of BH's internal approval.
    """
    if not policy:
        return None
    kind = event.get("event_type", "")
    data = event.get("data")
    # Match SakOpprettetEvent's supported nested representation. A top-level
    # value takes precedence in the parser too.
    case_type = event.get(
        "sakstype", data.get("sakstype") if isinstance(data, dict) else None
    )
    if isinstance(kind, str) and kind.startswith("respons_"):
        return "BH-svar må publiseres gjennom intern godkjenning."
    if kind in {
        "eo_opprettet",
        "eo_utstedt",
        "eo_revidert",
        "eo_koe_lagt_til",
        "eo_koe_fjernet",
    } or (kind == "sak_opprettet" and case_type == "endringsordre"):
        return "Endringsordrer i prosjektet må opprettes og endres gjennom intern godkjenning."
    return None
