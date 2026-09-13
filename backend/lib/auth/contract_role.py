"""Contract authority is independent of project admin/member permissions."""

from functools import wraps

from flask import g, jsonify, request

from lib.auth.session import dev_auth_disabled, get_auth_service


def require_contract_role(required=None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if dev_auth_disabled():
                payload = request.get_json(silent=True) or {}
                event = payload.get("event") or (payload.get("events") or [{}])[0]
                g.contract_role = required or event.get("aktor_rolle", "TE")
            else:
                try:
                    role = get_auth_service().contract_role(g.project_id, g.user["id"])
                except Exception:
                    return jsonify(
                        error="CONTRACT_ACCESS_UNAVAILABLE",
                        message="Teamtilknytning kunne ikke bekreftes.",
                    ), 503
                if role not in {"TE", "BH"} or (required and role != required):
                    return jsonify(
                        error="CONTRACT_ROLE_REQUIRED",
                        message="Du har ikke nødvendig TE/BH-teamtilknytning.",
                    ), 403
                g.contract_role = role
            return f(*args, **kwargs)

        return decorated

    return decorator
