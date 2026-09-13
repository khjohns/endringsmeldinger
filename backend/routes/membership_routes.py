"""Project members come from Catenda; only a local viewer limit is editable."""

from flask import Blueprint, g, jsonify, request

from lib.auth.project_access import require_project_access
from lib.auth.session import get_auth_service, require_auth

membership_bp = Blueprint("membership", __name__)


def public_member(m):
    return {
        **{
            k: m[k]
            for k in (
                "id",
                "project_id",
                "user_id",
                "user_email",
                "display_name",
                "created_at",
                "updated_at",
            )
        },
        "external_id": m["catenda_subject"],
        "source": "catenda",
        "role": "viewer" if m["viewer_override"] else m["role"],
        "catenda_role": m["role"],
        "viewer_override": m["viewer_override"],
    }


@membership_bp.get("/api/projects/<project_id>/members")
@require_auth
@require_project_access()
def list_members(project_id):
    members = get_auth_service().repo.memberships(project_id=project_id, active=True)
    return jsonify(members=[public_member(m) for m in members])


@membership_bp.post("/api/projects/<project_id>/members/sync")
@require_auth
@require_project_access(min_role="admin")
def sync_members(project_id):
    service = get_auth_service()
    try:
        config = next(
            c for c in service.repo.configs() if c["internal_project_id"] == project_id
        )
        changes = service.sync(config)
        return jsonify(success=True, **changes)
    except Exception:
        return jsonify(
            error="SYNC_UNAVAILABLE",
            message="Medlemskap kunne ikke oppdateres. Prøv igjen senere.",
        ), 503


@membership_bp.patch("/api/projects/<project_id>/members/<member_id>")
@require_auth
@require_project_access(min_role="admin")
def limit_member(project_id, member_id):
    payload = request.get_json(silent=True) or {}
    value = payload.get("viewer_override")
    if type(value) is not bool or set(payload) != {"viewer_override"}:
        return jsonify(
            error="INVALID_REQUEST",
            message="Angi viewer_override som true eller false.",
        ), 400
    repo = get_auth_service().repo
    member = next(
        (
            m
            for m in repo.memberships(project_id=project_id, active=True)
            if m["id"] == member_id
        ),
        None,
    )
    if member is None or member["user_id"] == g.user["id"]:
        return jsonify(
            error="FORBIDDEN", message="Du har ikke tilgang til denne endringen."
        ), 403
    repo.viewer_override(project_id, member_id, value)
    return jsonify(success=True)
