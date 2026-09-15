"""Shared provider-independent cookie authentication for the application API."""

import hashlib
import hmac
import os
from functools import wraps

from flask import current_app, g, jsonify, request


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def dev_auth_disabled() -> bool:
    return os.getenv("DISABLE_AUTH", "").lower() == "true" and (
        current_app.testing or os.getenv("APP_ENV") == "development"
    )


def get_auth_service():
    service = current_app.extensions.get("koe_auth")
    if service is None:
        from services.auth_service import AuthService

        service = AuthService()
        current_app.extensions["koe_auth"] = service
    return service


def cookie_name():
    return (
        "koe_session" if os.getenv("APP_ENV") == "development" else "__Host-koe_session"
    )


def load_session():
    if hasattr(g, "auth_session"):
        return g.auth_session
    token = request.cookies.get(cookie_name(), "")
    g.auth_session = get_auth_service().repo.session(digest(token)) if token else None
    return g.auth_session


def csrf_valid() -> bool:
    session = load_session()
    value = request.headers.get("X-CSRF-Token", "")
    return bool(session and value and hmac.compare_digest(value, session["csrf_token"]))


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if dev_auth_disabled():
            g.user = {
                "id": "development",
                "email": "test@example.com",
                "name": "Utvikler",
            }
        else:
            try:
                session = load_session()
            except Exception:
                return jsonify(
                    error="AUTH_UNAVAILABLE",
                    message="Innlogging er midlertidig utilgjengelig.",
                ), 503
            if not session:
                return jsonify(error="UNAUTHORIZED", message="Du må logge inn."), 401
            g.user = session["app_users"]
            # Eneste CSRF-håndhevingspunkt i appen, og bevisst plassert her:
            # kontrollen trenger sesjonen å sammenlikne mot, og en dekoratør
            # utenpå denne ville kjørt først og svart 403 på en utlogget bruker
            # som egentlig skal ha 401 og sendes til innlogging. At den ligger
            # inne i autentiseringen betyr også at en ny mutasjonsrute ikke kan
            # gå glipp av den ved å mangle en dekoratør.
            if request.method not in {"GET", "HEAD", "OPTIONS"} and not csrf_valid():
                return jsonify(
                    error="CSRF validation failed", message="Prøv igjen."
                ), 403
        return f(*args, **kwargs)

    return decorated
