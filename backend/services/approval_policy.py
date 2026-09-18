"""Shared server policy for approval entry points and authority configuration."""

import json
import os


def project_policy(project):
    return json.loads(os.environ.get("BH_APPROVAL_POLICIES", "{}")).get(project)


def _policy_entries(policy):
    for entry in (policy or {}).get("handlers", []):
        yield entry if isinstance(entry, dict) else {"id": entry}
    for entry in (policy or {}).get("chain", []):
        yield entry if isinstance(entry, dict) else {"id": entry}


def _email_binding_allowed():
    return os.environ.get("APP_ENV", "development").lower() not in {
        "production",
        "staging",
    }


def resolve_policy_actor(policy, user):
    """The policy entry a signed-in user may act as, or an empty string.

    Authority cannot be keyed on e-mail. The identity provider supplies it on every
    login, `app_users.email` is overwritten each time and has no unique constraint,
    so whoever sets their provider address to an approver's would inherit that
    approver's limit. An entry that names `user_id` is therefore matched on that
    stable id only, and outside development an entry without one cannot be used at
    all — it fails closed with a configuration error instead (audit RV-03).
    """
    email = str(user.get("email") or "").lower()
    user_id = str(user.get("id") or "")
    unbound_match = False
    for entry in _policy_entries(policy):
        entry_id = str(entry.get("id") or "").lower()
        configured = str(entry.get("user_id") or "")
        if configured:
            if user_id and configured == user_id:
                return entry_id
            continue
        if entry_id and entry_id == email:
            if _email_binding_allowed():
                return entry_id
            unbound_match = True
    if unbound_match:
        raise PermissionError(
            "Godkjenningspolicyen må binde fullmakten til en bruker-ID (user_id), "
            "ikke bare e-postadresse."
        )
    return ""


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
    # A forsering answer commits money under NS 8407 §33.8 exactly as respons_* does,
    # even though its type name does not share the prefix (audit RV-04).
    if kind == "forsering_respons":
        return "Svar på forseringsvarsel må publiseres gjennom intern godkjenning."
    if kind in {
        "eo_opprettet",
        "eo_utstedt",
        "eo_revidert",
        "eo_koe_lagt_til",
        "eo_koe_fjernet",
    } or (kind == "sak_opprettet" and case_type == "endringsordre"):
        return "Endringsordrer i prosjektet må opprettes og endres gjennom intern godkjenning."
    return None
