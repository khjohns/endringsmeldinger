"""Security integration tests with real Flask cookies and no auth bypass."""

from datetime import UTC, datetime
from unittest.mock import Mock, patch
from urllib.parse import parse_qs, urlsplit

import pytest
from flask import Flask, jsonify

from lib.auth.catenda_oauth import CatendaOAuth, CatendaUnavailable
from lib.auth.domain import map_catenda_role, reconciliation_changes, safe_return_path
from lib.auth.project_access import require_project_access
from lib.auth.session import digest, require_auth
from lib.project_context import init_project_context
from routes.auth_routes import auth_bp
from services.auth_service import AuthService

USER = "11111111111111111111111111111111"
PROJECT = "22222222222222222222222222222222"


class MemoryRepo:
    def __init__(self):
        self.attempts = {}
        self.sessions = {}

    def create_attempt(self, row):
        self.attempts[row["state_hash"]] = row

    def consume_attempt(self, state_hash, browser_hash):
        row = self.attempts.get(state_hash)
        if (
            not row
            or row["browser_hash"] != browser_hash
            or datetime.fromisoformat(row["expires_at"]) <= datetime.now(UTC)
        ):
            return None
        return self.attempts.pop(state_hash)

    def create_session(self, row):
        self.sessions[row["token_hash"]] = {
            **row,
            "app_users": {"id": USER, "email": "u@example.com", "name": "User"},
        }

    def session(self, token_hash):
        row = self.sessions.get(token_hash)
        if row and datetime.fromisoformat(row["expires_at"]) > datetime.now(UTC):
            return row

    def delete_session(self, token_hash):
        self.sessions.pop(token_hash, None)


@pytest.fixture
def browser(monkeypatch):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    app = Flask(__name__)
    app.testing = True
    repo = MemoryRepo()
    service = Mock(repo=repo)
    service.frontend_url = "https://app.example.com"
    service.oauth = Mock(
        wraps=CatendaOAuth(
            "client", "secret", "https://app.example.com/api/auth/catenda/callback"
        )
    )
    service.oauth.exchange = Mock(return_value="provider-token")
    service.login.return_value = USER
    service.role.return_value = "member"
    app.extensions["koe_auth"] = service
    app.register_blueprint(auth_bp)
    init_project_context(app)

    @app.route("/api/projects/<project_id>/protected", methods=["GET", "POST"])
    @require_auth
    @require_project_access()
    def protected(project_id):
        return jsonify(ok=True)

    return app.test_client(), service


def sign_in(client, return_to="/project/case"):
    response = client.get(
        "/api/auth/catenda/login",
        query_string={"return_to": return_to},
        base_url="https://app.example.com",
    )
    assert response.status_code == 302
    state = parse_qs(urlsplit(response.location).query)["state"][0]
    response = client.get(
        "/api/auth/catenda/callback",
        query_string={"state": state, "code": "one-code"},
        base_url="https://app.example.com",
    )
    return response, state


def test_login_cookie_and_logout(browser):
    client, service = browser
    response, state = sign_in(client)
    assert response.location == "https://app.example.com/project/case"
    cookie = response.headers.getlist("Set-Cookie")[0]
    assert "HttpOnly" in cookie and "Secure" in cookie and "SameSite=Lax" in cookie
    assert "provider-token" not in str(response.headers)
    token = client.get_cookie("__Host-koe_session", domain="app.example.com").value
    assert digest(token) in service.repo.sessions and token not in service.repo.sessions
    session = client.get("/api/auth/session", base_url="https://app.example.com").json
    assert session["user"]["id"] == USER
    assert (
        client.post("/api/auth/logout", base_url="https://app.example.com").status_code
        == 403
    )
    response = client.post(
        "/api/auth/logout",
        base_url="https://app.example.com",
        headers={"X-CSRF-Token": session["csrfToken"]},
    )
    assert response.status_code == 200
    assert not service.repo.sessions
    assert (
        client.get("/api/auth/session", base_url="https://app.example.com").status_code
        == 401
    )


def test_callback_replay_does_not_exchange_twice(browser):
    client, service = browser
    _, state = sign_in(client)
    client.get(
        "/api/auth/catenda/callback",
        query_string={"state": state, "code": "one-code"},
        base_url="https://app.example.com",
    )
    service.oauth.exchange.assert_called_once()


@pytest.mark.parametrize(
    "scenario",
    ["missing-cookie", "wrong-state", "expired", "duplicate-state", "denied"],
)
def test_invalid_attempt_never_exchanges(browser, scenario):
    client, service = browser
    response = client.get("/api/auth/catenda/login", base_url="https://app.example.com")
    state = parse_qs(urlsplit(response.location).query)["state"][0]
    query = {"state": state, "code": "code"}
    if scenario == "missing-cookie":
        client.delete_cookie("__Host-koe_session_login", domain="app.example.com")
    elif scenario == "wrong-state":
        query["state"] = "wrong"
    elif scenario == "expired":
        service.repo.attempts[digest(state)]["expires_at"] = "2000-01-01T00:00:00+00:00"
    elif scenario == "duplicate-state":
        query["state"] = [state, state]
    else:
        query["error"] = "access_denied"
    response = client.get(
        "/api/auth/catenda/callback",
        query_string=query,
        base_url="https://app.example.com",
    )
    assert response.location == "https://app.example.com/login?error=login_failed"
    service.oauth.exchange.assert_not_called()


def test_magic_bearer_no_longer_authenticates(browser):
    client, _ = browser
    assert (
        client.get(
            "/api/projects/oslobygg/protected",
            headers={"Authorization": "Bearer old-magic-token"},
        ).status_code
        == 401
    )


def test_header_cannot_authorize_another_path_project(browser):
    client, service = browser
    sign_in(client)
    response = client.get(
        "/api/projects/other/protected",
        base_url="https://app.example.com",
        headers={"X-Project-ID": "mine"},
    )
    assert response.status_code == 403
    service.role.assert_not_called()


def test_default_project_is_not_open(browser):
    client, service = browser
    sign_in(client)
    service.role.return_value = None
    assert (
        client.get(
            "/api/projects/oslobygg/protected", base_url="https://app.example.com"
        ).status_code
        == 403
    )
    service.role.assert_called_with("oslobygg", USER)


def test_session_expiry(browser):
    client, service = browser
    sign_in(client)
    for row in service.repo.sessions.values():
        row["expires_at"] = "2000-01-01T00:00:00+00:00"
    assert (
        client.get("/api/auth/session", base_url="https://app.example.com").status_code
        == 401
    )


def test_csrf_is_bound_to_session(browser):
    client, service = browser
    sign_in(client)
    old = client.get("/api/auth/session", base_url="https://app.example.com").json[
        "csrfToken"
    ]
    sign_in(client)
    assert len(service.repo.sessions) == 1
    response = client.post(
        "/api/projects/p/protected",
        base_url="https://app.example.com",
        headers={"X-CSRF-Token": old},
    )
    assert response.status_code == 403


@pytest.mark.parametrize(
    "value",
    [
        "https://evil.test",
        "//evil.test",
        "/%2fevil.test",
        "/\\evil.test",
        "/%0aevil",
        "/api/auth/logout",
    ],
)
def test_return_path_rejects_external_or_control_paths(value):
    assert safe_return_path(value) == "/"


def test_return_path_preserves_case_link():
    assert safe_return_path("/project/case?tab=history") == "/project/case?tab=history"


@pytest.mark.parametrize(
    "source,expected",
    [("owner", "admin"), ("administrator", "admin"), ("member", "member")],
)
def test_roles(source, expected):
    assert map_catenda_role(source) == expected


def test_unknown_role_cannot_grant_access():
    with pytest.raises(ValueError):
        map_catenda_role("viewer")


def test_integration_organization_token_is_not_a_personal_login():
    oauth = CatendaOAuth("client", "secret", "http://127.0.0.1:18080/callback")
    with patch.object(
        oauth, "_request", return_value={"id": USER, "type": "organization"}
    ):
        with pytest.raises(CatendaUnavailable, match="Expected a user identity"):
            oauth.user("integration-token")


def test_disposable_live_store_uses_real_identity_and_consumes_state_once():
    from scripts.test_catenda_login_live import DisposableRepository

    repo = DisposableRepository(PROJECT)
    user_id = repo.identity(
        "catenda", CatendaOAuth.BASE, USER, "user@example.com", "User"
    )
    repo.create_session(
        {
            "token_hash": "hash",
            "user_id": user_id,
            "csrf_token": "csrf",
            "expires_at": "2099-01-01T00:00:00+00:00",
        }
    )
    assert repo.session("hash")["app_users"]["id"] == user_id
    repo.create_attempt(
        {
            "state_hash": "state",
            "browser_hash": "browser",
            "return_path": "/done",
            "expires_at": "2099-01-01T00:00:00+00:00",
        }
    )
    assert repo.consume_attempt("state", "wrong") is None
    assert repo.consume_attempt("state", "browser")["return_path"] == "/done"
    assert repo.consume_attempt("state", "browser") is None


def test_reconciliation_preserves_viewer_and_handles_changed_email():
    changes = reconciliation_changes(
        [
            {"subject": USER, "email": "old@example.com", "viewer_override": True},
            {"subject": "removed"},
        ],
        [
            {"subject": USER, "email": "new@example.com", "role": "admin"},
            {"subject": "new", "role": "member"},
        ],
    )
    assert changes["deactivate"] == ["removed"]
    assert changes["upsert"][0]["viewer_override"] is True
    assert changes["upsert"][0]["email"] == "new@example.com"
    assert changes["upsert"][1]["active"] is True


def test_incomplete_collection_never_commits():
    oauth = CatendaOAuth("client", "secret", "https://app.example.com/callback")
    repo = Mock()
    service = AuthService(repo=repo, oauth=oauth)
    page = [
        {"role": "member", "user": {"id": f"{i:032x}", "type": "user"}}
        for i in range(100)
    ]
    with patch.object(
        oauth, "_request", side_effect=[page, CatendaUnavailable("failed")]
    ):
        with pytest.raises(CatendaUnavailable):
            service.sync(
                {"internal_project_id": "p", "catenda_project_id": PROJECT}, "token"
            )
    repo.reconcile.assert_not_called()


def test_pagination_and_duplicate_page_guard():
    oauth = CatendaOAuth("client", "secret", "https://app.example.com/callback")
    page = [{"id": str(i)} for i in range(100)]
    with patch.object(oauth, "_request", side_effect=[page, [{"id": "last"}]]) as call:
        assert len(oauth.collection("/v2/projects", "token")) == 101
        assert call.call_args.kwargs["params"]["page"] == 2
    with patch.object(oauth, "_request", side_effect=[page, page]):
        with pytest.raises(CatendaUnavailable):
            oauth.collection("/v2/projects", "token")


def test_stale_membership_failure_denies_instead_of_using_cache():
    repo = Mock()
    repo.configs.return_value = [
        {"internal_project_id": "p", "catenda_project_id": PROJECT}
    ]
    repo.sync_state.return_value = {
        "catenda_project_id": PROJECT,
        "synced_at": "2000-01-01T00:00:00+00:00",
    }
    service = AuthService(repo=repo, oauth=Mock())
    with patch.object(service, "sync", side_effect=CatendaUnavailable("offline")):
        with pytest.raises(CatendaUnavailable):
            service.role("p", USER)
    repo.membership.assert_not_called()


def test_fresh_cache_does_not_call_catenda():
    repo = Mock()
    repo.configs.return_value = [
        {"internal_project_id": "p", "catenda_project_id": PROJECT}
    ]
    repo.sync_state.return_value = {
        "catenda_project_id": PROJECT,
        "synced_at": datetime.now(UTC).isoformat(),
    }
    repo.membership.return_value = {"role": "admin", "viewer_override": True}
    service = AuthService(repo=repo, oauth=Mock())
    assert service.role("p", USER) == "viewer"
    service.oauth.members.assert_not_called()


def test_login_deactivates_projects_the_user_has_left():
    repo, oauth = Mock(), Mock()
    oauth.BASE = "https://api.catenda.com"
    oauth.user.return_value = {
        "subject": USER,
        "email": "changed@example.com",
        "name": "User",
    }
    oauth.projects.return_value = set()
    repo.identity.return_value = "internal-user"
    repo.configs.return_value = [
        {"internal_project_id": "p", "catenda_project_id": PROJECT}
    ]
    service = AuthService(repo=repo, oauth=oauth)
    assert service.login("token") == "internal-user"
    repo.identity.assert_called_once_with(
        "catenda",
        "https://api.catenda.com",
        subject=USER,
        email="changed@example.com",
        name="User",
    )
    repo.deactivate_user_projects.assert_called_once_with("internal-user", ["p"])
    oauth.members.assert_not_called()
