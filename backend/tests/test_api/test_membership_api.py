"""API contract for Catenda membership and local viewer restrictions."""

from unittest.mock import Mock

import pytest
from flask import Flask

from lib.project_context import init_project_context
from routes.membership_routes import membership_bp


@pytest.fixture
def api(monkeypatch):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    app = Flask(__name__)
    app.testing = True
    app.register_blueprint(membership_bp)
    init_project_context(app)
    repo = Mock()
    repo.session.return_value = {
        "app_users": {"id": "caller", "email": "caller@example.com"},
        "csrf_token": "csrf",
    }
    repo.memberships.return_value = [
        {
            "id": "member-id",
            "project_id": "p",
            "user_id": "other",
            "catenda_subject": "catenda-id",
            "user_email": "u@example.com",
            "display_name": "User",
            "role": "member",
            "viewer_override": False,
            "active": True,
            "created_at": "now",
            "updated_at": "now",
        }
    ]
    service = Mock(repo=repo)
    service.role.return_value = "admin"
    repo.configs.return_value = [
        {"internal_project_id": "p", "catenda_project_id": "catenda-project"}
    ]
    service.sync.return_value = {"members": 1, "deactivated": 0}
    app.extensions["koe_auth"] = service
    client = app.test_client()
    client.set_cookie("__Host-koe_session", "cookie")
    return client, service


def test_list_members(api):
    client, service = api
    response = client.get("/api/projects/p/members")
    assert response.status_code == 200
    assert response.json["members"][0]["external_id"] == "catenda-id"
    assert response.json["members"][0]["source"] == "catenda"


def test_viewer_limit_is_reflected_in_public_role(api):
    client, service = api
    service.repo.memberships.return_value[0]["viewer_override"] = True
    assert client.get("/api/projects/p/members").json["members"][0]["role"] == "viewer"


@pytest.mark.parametrize(
    "method,path",
    [
        ("post", "/api/projects/p/members"),
        ("delete", "/api/projects/p/members/member-id"),
    ],
)
def test_local_creation_and_removal_are_not_supported(api, method, path):
    client, service = api
    assert getattr(client, method)(path).status_code == 405
    service.repo.viewer_override.assert_not_called()


@pytest.mark.parametrize("value", [True, False])
def test_admin_can_set_or_release_viewer_limit(api, value):
    client, service = api
    response = client.patch(
        "/api/projects/p/members/member-id",
        json={"viewer_override": value},
        headers={"X-CSRF-Token": "csrf"},
    )
    assert response.status_code == 200
    service.repo.viewer_override.assert_called_once_with("p", "member-id", value)


@pytest.mark.parametrize(
    "payload",
    [
        {"role": "admin"},
        {"viewer_override": "false"},
        {"viewer_override": True, "role": "admin"},
    ],
)
def test_cannot_assign_catenda_roles_locally(api, payload):
    client, service = api
    response = client.patch(
        "/api/projects/p/members/member-id",
        json=payload,
        headers={"X-CSRF-Token": "csrf"},
    )
    assert response.status_code == 400
    service.repo.viewer_override.assert_not_called()


def test_non_admin_cannot_change_override(api):
    client, service = api
    service.role.return_value = "member"
    response = client.patch(
        "/api/projects/p/members/member-id",
        json={"viewer_override": True},
        headers={"X-CSRF-Token": "csrf"},
    )
    assert response.status_code == 403
    service.repo.viewer_override.assert_not_called()


def test_cannot_limit_self_or_unknown_member(api):
    client, service = api
    service.repo.memberships.return_value[0]["user_id"] = "caller"
    for member in ("member-id", "unknown"):
        response = client.patch(
            f"/api/projects/p/members/{member}",
            json={"viewer_override": True},
            headers={"X-CSRF-Token": "csrf"},
        )
        assert response.status_code == 403
    service.repo.viewer_override.assert_not_called()


def test_sync_requires_admin_and_csrf(api):
    client, service = api
    assert client.post("/api/projects/p/members/sync").status_code == 403
    assert (
        client.post(
            "/api/projects/p/members/sync", headers={"X-CSRF-Token": "csrf"}
        ).status_code
        == 200
    )
    service.sync.assert_called_once()


def test_sync_error_is_generic(api):
    client, service = api
    service.sync.side_effect = RuntimeError("secret provider information")
    response = client.post(
        "/api/projects/p/members/sync", headers={"X-CSRF-Token": "csrf"}
    )
    assert response.status_code == 503
    assert b"secret" not in response.data


def test_other_project_header_is_rejected(api):
    client, service = api
    assert (
        client.get(
            "/api/projects/p/members", headers={"X-Project-ID": "other"}
        ).status_code
        == 403
    )
    service.repo.memberships.assert_not_called()
