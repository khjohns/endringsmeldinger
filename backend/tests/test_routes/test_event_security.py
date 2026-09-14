"""Real auth and route parsing, with only external storage/providers replaced."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from routes import event_routes


@pytest.fixture
def api(monkeypatch, tmp_path):
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
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


@pytest.mark.parametrize("failure", ["catenda", "catenda_auth", "cache"])
def test_committed_event_is_successful_when_secondary_work_fails(
    api, monkeypatch, failure
):
    from integrations.catenda import CatendaAuthError
    from services.timeline_service import TimelineService

    api.container.event_repository.get_events.return_value = ([], 0)
    api.container.event_repository.append.return_value = 1
    api.container.timeline_service = TimelineService()
    monkeypatch.setattr(event_routes, "_ensure_catenda_auth", lambda _: None)
    monkeypatch.setattr(
        "core.config.settings", SimpleNamespace(is_catenda_enabled=True)
    )
    sync = Mock(return_value=(True, "server", []))
    monkeypatch.setattr(event_routes, "_post_to_catenda", sync)
    if failure == "cache":
        api.container.metadata_repository.update_cache.side_effect = RuntimeError(
            "Cache unavailable"
        )
    else:
        sync.side_effect = (
            CatendaAuthError("Token expired")
            if failure == "catenda_auth"
            else RuntimeError("Upload failed")
        )
    body = payload()
    body["expected_version"] = 0
    response = post(api, body)
    api.container.event_repository.append.assert_called_once()
    assert response.status_code == 201, response.json
    assert response.json["success"] is True
    assert response.json["new_version"] == 1
    if failure != "cache":
        assert response.json["catenda_synced"] is False


@pytest.mark.parametrize("encoded", ["not base64", "aGVsbG8=", "", 123])
def test_invalid_pdf_is_rejected_before_event_commit(api, encoded):
    body = payload()
    body["pdf_base64"] = encoded
    response = post(api, body)
    assert response.status_code == 400
    api.parser.assert_not_called()
    api.container.event_repository.append.assert_not_called()


def test_committed_batch_survives_cache_failure(api):
    from models.events import SakOpprettetEvent
    from services.timeline_service import TimelineService

    created = SakOpprettetEvent(
        sak_id="case", aktor="TE", aktor_rolle="TE", sakstittel="Sak"
    )
    api.container.event_repository.get_events.return_value = (
        [created.model_dump(mode="json")],
        1,
    )
    api.container.event_repository.append_batch.return_value = 2
    api.container.timeline_service = TimelineService()
    api.container.metadata_repository.update_cache.side_effect = RuntimeError(
        "Cache unavailable"
    )
    body = payload()
    body["events"] = [body.pop("event")]
    response = post(api, body, batch=True)
    api.container.event_repository.append_batch.assert_called_once()
    assert response.status_code == 201, response.json
    assert response.json["new_version"] == 2


def test_failed_delivery_is_in_reloaded_case_context(api, monkeypatch):
    from services.timeline_service import TimelineService

    api.container.event_repository.get_events.return_value = ([], 0)
    api.container.event_repository.append.return_value = 1
    api.container.timeline_service = TimelineService()
    monkeypatch.setattr(event_routes, "_ensure_catenda_auth", lambda _: None)
    monkeypatch.setattr(
        "core.config.settings", SimpleNamespace(is_catenda_enabled=True)
    )
    monkeypatch.setattr(
        event_routes, "_post_to_catenda", Mock(return_value=(False, None, []))
    )
    body = payload()
    body["expected_version"] = 0
    assert post(api, body).status_code == 201
    event = api.container.event_repository.append.call_args.args[0]
    api.container.event_repository.get_events.return_value = (
        [event.model_dump(mode="json")],
        1,
    )
    result = api.client.get("/api/cases/case/context", headers={"X-Project-ID": "p"})
    assert result.status_code == 200, result.json
    assert result.json["catenda_sync"] == {"status": "failed", "outstanding": 1}
