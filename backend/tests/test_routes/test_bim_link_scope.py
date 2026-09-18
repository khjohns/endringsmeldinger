"""A BIM link is addressed by a bare integer id, so deletion must be case-scoped (RV-07)."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context

HEADERS = {"X-Project-ID": "project-b", "X-CSRF-Token": "csrf"}


@pytest.fixture
def api(monkeypatch):
    from routes import bim_link_routes

    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(bim_link_routes.bim_bp)
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "u", "email": "b@example.com", "name": "B"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_membership.return_value = ("TE", "team-b")
    app.extensions["koe_auth"] = auth
    container = Mock()
    container.metadata_repository.get.side_effect = {
        "B-1": SimpleNamespace(prosjekt_id="project-b")
    }.get
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    repo = Mock()
    monkeypatch.setattr(bim_link_routes, "_get_bim_repo", lambda: repo)
    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(client=client, repo=repo)


def test_sletting_avgrenses_til_saken_i_url(api):
    """A link on another case must not be deletable through an authorized case."""
    api.repo.delete_link.return_value = False
    response = api.client.delete("/api/saker/B-1/bim-links/999", headers=HEADERS)
    call = api.repo.delete_link.call_args
    assert "B-1" in call.args or call.kwargs.get("sak_id") == "B-1"
    assert response.status_code == 404


def test_egen_lenke_slettes_fortsatt(api):
    api.repo.delete_link.return_value = True
    assert api.client.delete("/api/saker/B-1/bim-links/1", headers=HEADERS).status_code == 204


def test_uventet_feil_lekker_ikke_intern_tekst(api):
    api.repo.delete_link.side_effect = RuntimeError("password authentication failed for db")
    response = api.client.delete("/api/saker/B-1/bim-links/1", headers=HEADERS)
    assert response.status_code == 500
    assert "password" not in response.get_data(as_text=True)
