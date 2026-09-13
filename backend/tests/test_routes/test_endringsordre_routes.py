"""EO routes keep project membership, CSRF and actor identity on the server."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from routes.endringsordre_routes import endringsordre_bp


@pytest.fixture
def api(monkeypatch):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(endringsordre_bp)
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {
            "id": "user",
            "email": "bh@example.com",
            "name": "Saksbehandler BH",
        },
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    app.extensions["koe_auth"] = auth
    service = Mock()
    service.opprett_endringsordresak.return_value = {
        "sak_id": "EO-new",
        "catenda_synced": False,
    }
    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(prosjekt_id="p")
    monkeypatch.setattr(
        "routes.endringsordre_routes._get_endringsordre_service", lambda: service
    )
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    client = app.test_client()
    client.set_cookie(cookie_name(), "token")
    return SimpleNamespace(
        client=client, service=service, auth=auth, container=container
    )


def post(api, **payload):
    return api.client.post(
        "/api/endringsordre/opprett",
        json={
            "eo_nummer": "EO-001",
            "beskrivelse": "Endring av fundament",
            **payload,
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )


def test_direct_order_uses_session_actor_and_allows_no_koe(api):
    response = post(api, utstedt_av="Forfalsket navn")
    assert response.status_code == 201
    args = api.service.opprett_endringsordresak.call_args.kwargs
    assert args["utstedt_av"] == "Saksbehandler BH"
    assert args["koe_sak_ids"] == []
    assert args["kompensasjon_belop"] is None


@pytest.mark.parametrize("role", ["viewer", None, "unknown"])
def test_creation_requires_project_member(api, role):
    api.auth.role.return_value = role
    assert post(api).status_code == 403
    api.service.opprett_endringsordresak.assert_not_called()


def test_unauthenticated_cannot_issue(api):
    api.auth.repo.session.return_value = None
    assert post(api).status_code == 401
    api.service.opprett_endringsordresak.assert_not_called()


def test_creation_requires_valid_csrf(api):
    response = api.client.post(
        "/api/endringsordre/opprett",
        json={
            "eo_nummer": "EO-001",
            "beskrivelse": "Test",
        },
        headers={"X-Project-ID": "p"},
    )
    assert response.status_code == 403
    api.service.opprett_endringsordresak.assert_not_called()


@pytest.mark.parametrize("project", [None, "other-project"])
def test_every_selected_case_must_belong_to_project(api, project):
    api.container.metadata_repository.get.side_effect = lambda sak_id: (
        SimpleNamespace(prosjekt_id="p")
        if sak_id == "own"
        else SimpleNamespace(prosjekt_id=project)
        if project
        else None
    )
    assert post(api, koe_sak_ids=["own", "foreign"]).status_code == 403
    api.service.opprett_endringsordresak.assert_not_called()


def test_case_context_must_belong_to_project(api):
    api.container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="foreign"
    )
    response = api.client.get(
        "/api/endringsordre/EO-foreign/kontekst", headers={"X-Project-ID": "p"}
    )
    assert response.status_code == 403
    api.service.hent_komplett_eo_kontekst.assert_not_called()


def test_validation_failure_is_reviewable_400(api):
    api.service.opprett_endringsordresak.side_effect = ValueError(
        "KOE inngår allerede i en endringsordre"
    )
    response = post(api, koe_sak_ids=["own"])
    assert response.status_code == 400
    assert "allerede" in response.json["message"]


def test_backlink_failure_is_not_reported_as_empty_success(api):
    api.service.finn_eoer_for_koe.side_effect = RuntimeError("unavailable")
    response = api.client.get(
        "/api/endringsordre/by-relatert/own", headers={"X-Project-ID": "p"}
    )
    assert response.status_code == 502
    assert response.json["success"] is False
