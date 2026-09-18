"""A relation is client-supplied, so it must never widen project access (RV-07).

Real routes and decorators; only storage and the membership provider are doubles.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from models.events import SakOpprettetEvent

HEADERS = {"X-Project-ID": "project-b", "X-CSRF-Token": "csrf"}


def _auth(role="member", contract=("TE", "team-b")):
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "user-b", "email": "b@example.com", "name": "B"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = role
    auth.contract_membership.return_value = contract
    return auth


def _client(monkeypatch, auth, *blueprints):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    for blueprint in blueprints:
        app.register_blueprint(blueprint)
    app.extensions["koe_auth"] = auth
    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return client


@pytest.fixture
def forsering_context(monkeypatch):
    from routes import forsering_routes
    from services.forsering_service import ForseringService
    from services.timeline_service import TimelineService

    other_project = SakOpprettetEvent(
        sak_id="A-1",
        sakstittel="HEMMELIG PROSJEKT A",
        aktor="a",
        aktor_rolle="TE",
        prosjekt_id="project-a",
    ).model_dump(mode="json")
    forsering = SakOpprettetEvent(
        sak_id="B-F",
        sakstittel="Forsering B",
        aktor="b",
        aktor_rolle="TE",
        prosjekt_id="project-b",
        sakstype="forsering",
        forsering_data={"avslatte_fristkrav": ["A-1", "B-2"]},
    ).model_dump(mode="json")
    own_project = SakOpprettetEvent(
        sak_id="B-2",
        sakstittel="Eget fristkrav",
        aktor="b",
        aktor_rolle="TE",
        prosjekt_id="project-b",
    ).model_dump(mode="json")
    store = {"A-1": [other_project], "B-F": [forsering], "B-2": [own_project]}
    metadata = {
        "A-1": SimpleNamespace(prosjekt_id="project-a", catenda_topic_id=None),
        "B-F": SimpleNamespace(prosjekt_id="project-b", catenda_topic_id=None),
        "B-2": SimpleNamespace(prosjekt_id="project-b", catenda_topic_id=None),
    }
    events = Mock()
    events.get_events.side_effect = lambda sak: (store.get(sak, []), len(store.get(sak, [])))
    container = Mock()
    container.metadata_repository.get.side_effect = metadata.get
    container.get_forsering_service.side_effect = lambda: ForseringService(
        catenda_client=None,
        event_repository=events,
        timeline_service=TimelineService(),
        relation_repository=Mock(),
    )
    monkeypatch.setattr(forsering_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    return _client(monkeypatch, _auth(), forsering_routes.forsering_bp)


def test_kontekst_utelater_relaterte_saker_fra_andre_prosjekter(forsering_context):
    direct = forsering_context.get("/api/forsering/A-1/kontekst", headers=HEADERS)
    assert direct.status_code == 403, "kontrollen: direkte oppslag er allerede stengt"

    response = forsering_context.get("/api/forsering/B-F/kontekst", headers=HEADERS)
    assert response.status_code == 200, response.json
    body = response.get_json()
    assert "A-1" not in body["sak_states"]
    assert "A-1" not in body["hendelser"]
    assert [r["relatert_sak_id"] for r in body["relaterte_saker"]] == ["B-2"]
    assert "HEMMELIG PROSJEKT A" not in response.get_data(as_text=True)
    # Egen sak i samme prosjekt er fortsatt med.
    assert body["sak_states"]["B-2"]["sakstittel"] == "Eget fristkrav"


def test_forsering_data_referanse_autoriseres_ved_innsending(monkeypatch):
    from routes import event_routes

    container = Mock()
    container.metadata_repository.get.side_effect = {
        "A-1": SimpleNamespace(prosjekt_id="project-a", catenda_topic_id=None)
    }.get
    container.event_repository.get_events.return_value = ([], 3)
    monkeypatch.setattr(event_routes, "_get_container", lambda: container)
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    client = _client(monkeypatch, _auth(), event_routes.events_bp)
    body = {
        "sak_id": "B-NEW",
        "expected_version": 0,
        "sakstype": "forsering",
        "events": [
            {
                "event_type": "sak_opprettet",
                "sakstittel": "Forsering",
                "sakstype": "forsering",
                "forsering_data": {"avslatte_fristkrav": ["A-1"]},
            }
        ],
    }
    response = client.post("/api/events/batch", json=body, headers=HEADERS)
    assert response.status_code == 403, response.json
    assert "A-1" in [call.args[0] for call in container.metadata_repository.get.call_args_list]
