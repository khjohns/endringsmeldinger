"""Reproduksjon for åpent arkitekturfunn; ingen kall mot ekte leverandører.

SA-01 (åpen Supabase-consent) er lukket ved at hele OAuth-flaten er fjernet;
regresjonen ligger nå i test_public_route_registry.py, som holder hele
ruteregisteret opp mot en eksplisitt liste over offentlige ruter.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name, digest
from lib.project_context import init_project_context
from routes import analytics_routes


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
