import json
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask, g

from routes.approval_routes import approval_bp


@pytest.fixture
def api(monkeypatch, tmp_path):
    app = Flask(__name__)
    app.register_blueprint(approval_bp)
    app.before_request(lambda: setattr(g, "project_id", "p1"))
    monkeypatch.setenv("DISABLE_AUTH", "true")
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.setenv(
        "BH_APPROVAL_POLICIES",
        json.dumps(
            {
                "p1": {
                    "handlers": ["test@example.com"],
                    "chain": [
                        {"id": "manager@test", "name": "Manager", "role": "Leder"}
                    ],
                }
            }
        ),
    )
    container = SimpleNamespace(
        metadata_repository=Mock(), event_repository=Mock(), timeline_service=Mock()
    )
    container.metadata_repository.get.return_value = SimpleNamespace(prosjekt_id="p1")
    monkeypatch.setattr("core.container.get_container", lambda: container)
    return app.test_client(), container


def test_internal_state_requires_explicit_server_membership(api, monkeypatch):
    client, _ = api
    assert client.get("/api/cases/c1/approvals").status_code == 200
    monkeypatch.setenv(
        "BH_APPROVAL_POLICIES",
        json.dumps({"p1": {"handlers": ["other@test"], "chain": []}}),
    )
    response = client.get("/api/cases/c1/approvals", headers={"X-Role": "BH"})
    assert response.status_code == 403
    assert "state" not in response.json


def test_case_and_project_boundary(api):
    client, container = api
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="other"
    )
    assert client.get("/api/cases/c1/approvals").status_code == 403
    container.metadata_repository.get.return_value = None
    assert client.get("/api/cases/c1/approvals").status_code == 403


def test_no_implicit_approval_policy(api, monkeypatch):
    client, _ = api
    monkeypatch.delenv("BH_APPROVAL_POLICIES")
    assert client.get("/api/cases/c1/approvals").status_code == 403


def test_letter_draft_persists_without_public_events(api):
    client, container = api
    response = client.post(
        "/api/cases/c1/approvals",
        json={
            "action": "saveLetter",
            "commandId": "1",
            "expectedVersion": 0,
            "draft": {"introduction": "Hei", "closing": "Hilsen", "included": []},
        },
    )
    assert response.status_code == 200
    assert (
        client.get("/api/cases/c1/approvals").json["state"]["drafts"][
            "test@example.com"
        ]["introduction"]
        == "Hei"
    )
    container.event_repository.append_batch.assert_not_called()
