"""settings.contract drives the authority matrix, so it is not a plain admin setting (RV-07)."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context

HEADERS = {"X-Project-ID": "project-b", "X-CSRF-Token": "csrf"}


@pytest.fixture
def api(monkeypatch):
    from routes import project_routes

    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(project_routes.projects_bp)
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "u", "email": "a@example.com", "name": "A"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "admin"
    auth.contract_membership.return_value = (None, None)
    app.extensions["koe_auth"] = auth
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: Mock())
    repo = Mock()
    repo.update.side_effect = lambda pid, updates: SimpleNamespace(
        model_dump=lambda mode: {"id": pid, **updates}
    )
    monkeypatch.setattr(project_routes, "_get_project_repo", lambda: repo)
    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(client=client, repo=repo, auth=auth)


def test_dagmulktsats_krever_byggherrens_kontraktsside(api):
    """A project admin without a contract side could otherwise move an order from
    'hele kjeden' to 'ingen godkjenning' by lowering the daily rate."""
    body = {"settings": {"contract": {"dagmulkt_sats": 1}}}
    blocked = api.client.patch("/api/projects/project-b", json=body, headers=HEADERS)
    assert blocked.status_code == 403, blocked.json
    assert blocked.json["error"] == "CONTRACT_ROLE_REQUIRED"
    api.repo.update.assert_not_called()

    api.auth.contract_membership.return_value = ("BH", "bh-team")
    allowed = api.client.patch("/api/projects/project-b", json=body, headers=HEADERS)
    assert allowed.status_code == 200, allowed.json


def test_vanlige_prosjektfelter_er_uendret_for_admin(api):
    response = api.client.patch(
        "/api/projects/project-b", json={"name": "Nytt navn"}, headers=HEADERS
    )
    assert response.status_code == 200, response.json
    assert api.repo.update.call_args.args[1] == {"name": "Nytt navn"}


def test_uventet_feil_lekker_ikke_intern_tekst(api):
    api.auth.contract_membership.return_value = ("BH", "bh-team")
    api.repo.update.side_effect = RuntimeError("password authentication failed for db")
    response = api.client.patch(
        "/api/projects/project-b", json={"name": "N"}, headers=HEADERS
    )
    assert response.status_code == 500
    assert "password" not in response.get_data(as_text=True)
