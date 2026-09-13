"""Real auth and route parsing, with only external storage/providers replaced."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from routes import event_routes


@pytest.fixture
def api(monkeypatch):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("BH_APPROVAL_POLICIES", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(event_routes.events_bp)
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "user", "email": "real@example.com", "name": "Real Actor"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "TE"
    app.extensions["koe_auth"] = auth
    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id="owned-topic"
    )
    # Conflict after parsing: no mutation or Catenda access should occur.
    container.event_repository.get_events.return_value = ([], 7)
    monkeypatch.setattr(event_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    parser = Mock(wraps=event_routes.parse_event_from_request)
    monkeypatch.setattr(event_routes, "parse_event_from_request", parser)
    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(client=client, auth=auth, container=container, parser=parser)


def payload():
    return {
        "sak_id": "case",
        "expected_version": 1,
        "event": {
            "event_type": "grunnlag_opprettet",
            "aktor": "Forged Actor",
            "aktor_rolle": "BH",
            "data": {
                "tittel": "Test claim",
                "hovedkategori": "ENDRING",
                "underkategori": "IRREG",
                "beskrivelse": "Beskrivelse",
                "dato_oppdaget": "2026-09-13",
            },
        },
    }


def post(api, body, batch=False):
    return api.client.post(
        "/api/events/batch" if batch else "/api/events",
        json=body,
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )


@pytest.mark.parametrize("batch", [False, True])
def test_actor_and_role_come_from_server(api, batch):
    body = payload()
    if batch:
        body["events"] = [body.pop("event")]
    response = post(api, body, batch)
    assert response.status_code == 409, response.json
    parsed = api.parser.call_args.args[0]
    assert parsed["aktor"] == "Real Actor"
    assert parsed["aktor_rolle"] == "TE"
    api.container.event_repository.append.assert_not_called()
    api.container.event_repository.append_batch.assert_not_called()


@pytest.mark.parametrize("batch", [False, True])
def test_invalid_category_rejected_before_storage(api, batch):
    body = payload()
    body["event"]["data"]["hovedkategori"] = "INVALID"
    if batch:
        body["events"] = [body.pop("event")]
    response = post(api, body, batch)
    assert response.status_code == 400
    api.parser.assert_not_called()
    api.container.event_repository.get_events.assert_not_called()


def test_client_cannot_redirect_catenda_side_effects(api):
    body = payload()
    body["catenda_topic_id"] = "other-topic"
    response = post(api, body)
    assert response.status_code == 400
    assert response.json["error"] == "CATENDA_TOPIC_MISMATCH"
    api.parser.assert_not_called()
    api.container.event_repository.get_events.assert_not_called()


@pytest.mark.parametrize("role", [None, "admin", "viewer"])
def test_project_membership_does_not_grant_contract_authority(api, role):
    api.auth.contract_role.return_value = role
    assert post(api, payload()).status_code == 403
    api.parser.assert_not_called()


def test_team_outage_fails_closed(api):
    api.auth.contract_role.side_effect = RuntimeError("Catenda unavailable")
    assert post(api, payload()).status_code == 503
    api.parser.assert_not_called()


@pytest.mark.parametrize("batch", [False, True])
def test_bh_cannot_submit_te_claim_even_without_existing_events(api, batch):
    api.auth.contract_role.return_value = "BH"
    body = payload()
    if batch:
        body["events"] = [body.pop("event")]
    assert post(api, body, batch).status_code == 403
    api.container.event_repository.get_events.assert_not_called()
