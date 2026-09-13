"""Catenda browser login and provider-independent application sessions."""

import logging
import secrets
from datetime import UTC, datetime, timedelta

from flask import Blueprint, g, jsonify, redirect, request

from lib.auth.domain import safe_return_path
from lib.auth.session import (
    cookie_name,
    dev_auth_disabled,
    digest,
    get_auth_service,
    load_session,
    require_auth,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
logger = logging.getLogger(__name__)


def expires(seconds):
    return (datetime.now(UTC) + timedelta(seconds=seconds)).isoformat()


def set_cookie(response, name, value, max_age):
    response.set_cookie(
        name,
        value,
        max_age=max_age,
        httponly=True,
        secure=cookie_name().startswith("__Host-"),
        samesite="Lax",
        path="/",
    )


@auth_bp.after_request
def private_response(response):
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@auth_bp.get("/catenda/login")
def login():
    try:
        service = get_auth_service()
        service.validate_config()
        state, browser = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        service.repo.create_attempt(
            {
                "state_hash": digest(state),
                "browser_hash": digest(browser),
                "return_path": safe_return_path(request.args.get("return_to")),
                "expires_at": expires(600),
            }
        )
        response = redirect(service.oauth.authorize_url(state))
        set_cookie(response, cookie_name() + "_login", browser, 600)
        return response
    except Exception as exc:
        logger.warning("Login initiation unavailable (%s)", type(exc).__name__)
        return jsonify(
            error="AUTH_UNAVAILABLE", message="Innlogging er midlertidig utilgjengelig."
        ), 503


@auth_bp.get("/catenda/callback")
def callback():
    try:
        service = get_auth_service()
        service.validate_config()
    except Exception as exc:
        logger.warning("Login callback unavailable (%s)", type(exc).__name__)
        return jsonify(error="AUTH_UNAVAILABLE"), 503
    response = redirect(service.frontend_url + "/login?error=login_failed")
    try:
        state = request.args.getlist("state")
        code = request.args.getlist("code")
        browser = request.cookies.get(cookie_name() + "_login", "")
        if len(state) != 1 or not state[0] or not browser:
            return response
        attempt = service.repo.consume_attempt(digest(state[0]), digest(browser))
        if not attempt or request.args.get("error") or len(code) != 1 or not code[0]:
            return response
        token = service.oauth.exchange(code[0])
        user_id = service.login(token)
        session_token = secrets.token_urlsafe(32)
        service.repo.create_session(
            {
                "token_hash": digest(session_token),
                "user_id": user_id,
                "csrf_token": secrets.token_urlsafe(32),
                "expires_at": expires(8 * 3600),
            }
        )
        old_token = request.cookies.get(cookie_name())
        if old_token:
            service.repo.delete_session(digest(old_token))
        response = redirect(
            service.frontend_url + safe_return_path(attempt["return_path"])
        )
        set_cookie(response, cookie_name(), session_token, 8 * 3600)
    except Exception as exc:
        # No OAuth codes/tokens/provider errors in logs or redirect parameters.
        logger.warning("Login callback failed (%s)", type(exc).__name__)
    finally:
        set_cookie(response, cookie_name() + "_login", "", 0)
    return response


@auth_bp.get("/session")
@require_auth
def session_info():
    return jsonify(
        user=g.user,
        csrfToken=(
            "development" if dev_auth_disabled() else load_session()["csrf_token"]
        ),
    )


@auth_bp.post("/logout")
@require_auth
def logout():
    if not dev_auth_disabled():
        get_auth_service().repo.delete_session(digest(request.cookies[cookie_name()]))
    response = jsonify(success=True)
    set_cookie(response, cookie_name(), "", 0)
    return response
