"""Auth-boundary tests without live identity providers or database access."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask, g, jsonify

from lib.auth.entra_id import require_entra_auth
from lib.auth.magic_link import require_magic_link
from lib.auth.session import cookie_name, digest, require_auth
from routes.utility_routes import utility_bp


@pytest.mark.parametrize("decorator", [require_magic_link, require_entra_auth])
@pytest.mark.parametrize(
    "environment,testing,disabled,expected",
    [
        ("production", False, "true", 401),
        ("staging", False, "true", 401),
        ("development", False, "true", 200),
        ("production", True, "true", 200),
        ("development", True, "false", 401),
    ],
)
def test_legacy_bypass_requires_explicit_development_or_testing(
    monkeypatch, decorator, environment, testing, disabled, expected
):
    monkeypatch.setenv("APP_ENV", environment)
    monkeypatch.setenv("DISABLE_AUTH", disabled)
    monkeypatch.setattr(
        "lib.auth.entra_id.settings", SimpleNamespace(entra_enabled=False)
    )
    app = Flask(__name__)
    app.testing = testing
    # Flask's test client does not imply the application is in test mode;
    # keep this explicit so the production/staging matrix is meaningful.
    app.config["TESTING"] = testing
    app.add_url_rule("/protected", view_func=decorator(lambda: "ok"))
    assert app.test_client().get("/protected").status_code == expected


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.register_blueprint(utility_bp)

    @app.route("/identity", methods=["GET", "POST"])
    @require_auth
    def identity():
        return jsonify(user=g.user["id"])

    sessions = {
        digest(token): {"app_users": {"id": token}, "csrf_token": f"csrf-{token}"}
        for token in ("alice", "bob")
    }
    auth = Mock()
    auth.repo.session.side_effect = sessions.get
    app.extensions["koe_auth"] = auth
    return app.test_client(), auth


@pytest.mark.parametrize("entra_enabled", ["true", "false"])
def test_bearer_cannot_replace_cookie_session(api, monkeypatch, entra_enabled):
    monkeypatch.setenv("ENTRA_ENABLED", entra_enabled)
    client, auth = api
    headers = {"Authorization": "Bearer alice", "X-User-ID": "alice", "X-Role": "BH"}
    assert client.get("/identity", headers=headers).status_code == 401
    assert client.get("/api/csrf-token", headers=headers).status_code == 401
    auth.repo.session.assert_not_called()
    client.set_cookie(cookie_name(), "bob")
    response = client.get("/identity", headers=headers)
    assert response.status_code == 200
    assert response.json == {"user": "bob"}


def test_csrf_is_bound_to_authenticated_session(api):
    client, _ = api
    client.set_cookie(cookie_name(), "alice")
    response = client.get("/api/csrf-token")
    assert response.status_code == 200
    assert "no-store" in response.headers["Cache-Control"]
    alice_csrf = response.json["csrfToken"]
    client.set_cookie(cookie_name(), "bob")
    for token in ("", alice_csrf):
        assert client.post("/identity", headers={"X-CSRF-Token": token}).status_code == 403
    assert client.post(
        "/identity", headers={"X-CSRF-Token": "csrf-bob"}
    ).json == {"user": "bob"}


def test_invalid_cookie_and_storage_failure_do_not_fall_back_to_bearer(api):
    client, auth = api
    client.set_cookie(cookie_name(), "unknown")
    headers = {"Authorization": "Bearer alice"}
    assert client.get("/identity", headers=headers).status_code == 401
    auth.repo.session.side_effect = RuntimeError("storage unavailable")
    response = client.get("/identity", headers=headers)
    assert response.status_code == 503
    assert "storage unavailable" not in response.get_data(as_text=True)


def test_retired_magic_link_endpoint_does_not_issue_session(api):
    client, _ = api
    response = client.get(
        "/api/magic-link/verify?token=legacy", headers={"Authorization": "Bearer legacy"}
    )
    assert response.status_code == 410
    assert "Set-Cookie" not in response.headers
