"""Authorize the actual project/resource using fresh Catenda membership."""

from functools import wraps

from flask import g, jsonify, request

from lib.auth.domain import referenced_case_ids
from lib.auth.session import dev_auth_disabled, get_auth_service

OPEN_ACCESS_PROJECTS = frozenset()
ROLE_HIERARCHY = {"viewer": 0, "member": 1, "admin": 2}


def get_container():
    from core.container import get_container as container

    return container()


def cases_in_project(case_ids, project_id=None):
    """The subset of the ids that really belongs to the authorized project.

    Relations are client-supplied — a forsering case lists the rejected claims it
    builds on — so reading through one must not widen access. Cases without
    metadata, or in another project, are dropped rather than raising: the
    container case stays readable, its foreign relations do not (audit RV-07).
    """
    project_id = project_id or getattr(g, "project_id", None)
    if not project_id:
        return set()
    repository = get_container().metadata_repository
    allowed = set()
    for case_id in set(case_ids):
        record = repository.get(case_id)
        if record is not None and record.prosjekt_id == project_id:
            allowed.add(case_id)
    return allowed


def require_project_access(min_role="viewer"):
    if min_role not in ROLE_HIERARCHY:
        raise ValueError("Unknown minimum role")

    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if dev_auth_disabled():
                g.project_role = "admin"
                g.user_email = "test@example.com"
                return f(*args, **kwargs)
            project_id = kwargs.get("project_id") or getattr(g, "project_id", None)
            header_project = request.headers.get("X-Project-ID")

            def denied():
                return jsonify(error="FORBIDDEN", message="Du har ikke tilgang."), 403

            if not project_id or (header_project and header_project != project_id):
                return denied()
            g.project_id = project_id
            try:
                service = get_auth_service()
                role = service.role(project_id, g.user["id"])
                if (
                    role not in ROLE_HIERARCHY
                    or ROLE_HIERARCHY[role] < ROLE_HIERARCHY[min_role]
                ):
                    return denied()
                payload = request.get_json(silent=True) or {}
                if not isinstance(payload, dict):
                    return denied()
                if payload.get("prosjekt_id") not in {None, project_id}:
                    return denied()
                case_id = (
                    kwargs.get("sak_id")
                    or kwargs.get("sakId")
                    or kwargs.get("case_id")
                    or payload.get("sak_id")
                    or payload.get("sakId")
                )
                case_ids = referenced_case_ids(payload) | referenced_case_ids(kwargs)
                if case_id:
                    case_ids.add(case_id)
                for checked_id in case_ids:
                    metadata = get_container().metadata_repository.get(checked_id)
                    creating = (
                        checked_id == case_id
                        and request.endpoint == "events.submit_batch"
                        and payload.get("expected_version") == 0
                        and payload.get("events", [{}])[0].get("event_type")
                        == "sak_opprettet"
                    )
                    if metadata is None and creating:
                        continue
                    if metadata is None or metadata.prosjekt_id != project_id:
                        return denied()
                g.project_role = role
                g.user_email = g.user.get("email", "")
            except Exception:
                return jsonify(
                    error="ACCESS_UNAVAILABLE",
                    message="Tilgang kunne ikke bekreftes. Prøv igjen senere.",
                ), 503
            return f(*args, **kwargs)

        return decorated

    return decorator
