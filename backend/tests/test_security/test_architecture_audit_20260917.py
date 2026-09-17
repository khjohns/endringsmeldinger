"""Reproductions for open architecture findings; no live provider calls."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name, digest
from lib.project_context import init_project_context
from routes import analytics_routes, oauth_auto_consent_routes, oauth_consent_routes


@pytest.mark.xfail(strict=True, reason="SA-01: anonymous auto-consent is still exposed")
def test_auto_consent_requires_application_session(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://provider.invalid")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "test-publishable")
    monkeypatch.setenv("MCP_REQUIRE_AUTH", "false")
    transport = Mock()
    transport.__enter__ = Mock(return_value=transport)
    transport.__exit__ = Mock(return_value=False)
    transport.post.side_effect = [
        SimpleNamespace(status_code=200, json=lambda: {"access_token": "test-token"}),
        SimpleNamespace(
            status_code=200,
            json=lambda: {"redirect_to": "https://client.invalid/callback"},
        ),
    ]
    monkeypatch.setattr(
        oauth_auto_consent_routes.httpx, "Client", Mock(return_value=transport)
    )
    app = Flask(__name__)
    app.register_blueprint(oauth_auto_consent_routes.oauth_auto_consent_bp)
    response = app.test_client().get("/oauth/consent?authorization_id=test")
    assert response.status_code in {401, 403, 404}
    transport.post.assert_not_called()


def test_consent_proxy_does_not_approve_without_bearer(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://provider.invalid")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret")
    transport = Mock()
    monkeypatch.setattr(oauth_consent_routes.httpx, "Client", transport)
    app = Flask(__name__)
    app.register_blueprint(oauth_consent_routes.oauth_consent_bp)
    response = app.test_client().post("/api/oauth/authorization/test/approve")
    assert response.status_code == 401
    transport.assert_not_called()


@pytest.mark.xfail(
    strict=True, reason="SA-02: actor analytics exposes internal activity"
)
def test_analytics_hides_other_contract_sides_internal_actor(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    metadata = Mock()
    metadata.list_all.return_value = [SimpleNamespace(sak_id="case-1")]
    events = SimpleNamespace(
        get_events=lambda _: (
            [
                {
                    "event_type": "internt_notat",
                    "aktor": "Private BH author",
                    "aktor_rolle": "BH",
                    "data": {"tekst": "Private deliberation"},
                }
            ],
            1,
        )
    )
    container = SimpleNamespace(event_repository=events, metadata_repository=metadata)
    monkeypatch.setattr(analytics_routes, "_get_container", lambda: container)
    app = Flask(__name__)
    init_project_context(app)
    app.register_blueprint(analytics_routes.analytics_bp)
    auth = Mock()
    auth.repo.session.side_effect = lambda token: (
        {"app_users": {"id": "te-user"}, "csrf_token": "csrf"}
        if token == digest("test-session")
        else None
    )
    auth.role.return_value = "member"
    auth.contract_membership.return_value = ("TE", "te-team")
    app.extensions["koe_auth"] = auth
    client = app.test_client()
    client.set_cookie(cookie_name(), "test-session")
    response = client.get(
        "/api/analytics/actors", headers={"X-Project-ID": "project-1"}
    )
    assert response.status_code == 200
    assert response.json["top_actors"] == []
