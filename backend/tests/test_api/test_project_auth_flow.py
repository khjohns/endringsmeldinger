"""End-to-end integration test for Catenda OAuth login and project discovery flow.

Verifies:
1. User logs in via Catenda OAuth callback.
2. Catenda reports the user has access to 2 registered projects.
3. Memberships are reconciled.
4. User queries GET /api/projects with the session cookie.
5. GET /api/projects returns exactly the projects the user has access to.
6. Unauthenticated requests are rejected with 401.
"""

from datetime import UTC, datetime
from unittest.mock import Mock
from urllib.parse import parse_qs, urlsplit
from uuid import UUID
import pytest
from flask import Flask

from core.container import Container, set_container
from lib.auth.catenda_oauth import CatendaOAuth
from lib.auth.domain import catenda_id
from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from models.project import Project
from routes.auth_routes import auth_bp
from routes.project_routes import projects_bp
from services.auth_service import AuthService

CAT_PROJ_1 = "c9ebde6b-0d1e-46ba-b60c-6ba940ba17cd"
CAT_PROJ_2 = "66d5ec1c-7fa1-4765-adc1-e37341884b73"
CAT_PROJ_3 = "a4eeb4de-70a1-43fa-9ee3-f4bdb910d3a6"
CAT_USER = "d2a44194-56f7-474e-a0ec-0612c041b0af"


class FlowTestRepository:
    """In-memory test store mirroring AuthRepository methods."""

    def __init__(self, configs):
        self.users = {}
        self.identities = {}
        self.attempts = {}
        self.sessions = {}
        self.members = {}
        self.snapshots = {}
        self.project_configs = configs

    def identity(self, provider, issuer, subject, email, name):
        key = (provider, issuer, subject)
        user_id = self.identities.setdefault(key, f"user-{subject}")
        self.users[user_id] = {"id": user_id, "email": email, "name": name}
        return user_id

    def create_attempt(self, row):
        self.attempts[row["state_hash"]] = row

    def consume_attempt(self, state_hash, browser_hash):
        row = self.attempts.get(state_hash)
        if (
            row
            and row["browser_hash"] == browser_hash
            and datetime.fromisoformat(row["expires_at"]) > datetime.now(UTC)
        ):
            return self.attempts.pop(state_hash)

    def create_session(self, row):
        self.sessions[row["token_hash"]] = row

    def session(self, token_hash):
        row = self.sessions.get(token_hash)
        if row and datetime.fromisoformat(row["expires_at"]) > datetime.now(UTC):
            return {**row, "app_users": self.users[row["user_id"]]}

    def delete_session(self, token_hash):
        self.sessions.pop(token_hash, None)

    def configs(self):
        return self.project_configs

    def memberships(self, **filters):
        return [
            row
            for row in self.members.values()
            if all(row.get(key) == value for key, value in filters.items())
        ]

    def membership(self, project_id, user_id):
        rows = self.memberships(project_id=project_id, user_id=user_id, active=True)
        return rows[0] if rows else None

    def sync_state(self, project_id):
        return self.snapshots.get(project_id)

    def reconcile(self, project_id, catenda_project_id, members, started_at):
        for row in self.members.values():
            if row["project_id"] == project_id:
                row["active"] = False
        for member in members:
            user_id = self.identity(
                "catenda",
                CatendaOAuth.BASE,
                member["subject"],
                member["email"],
                member["name"],
            )
            self.members[(project_id, user_id)] = {
                "project_id": project_id,
                "user_id": user_id,
                "catenda_subject": member["subject"],
                "role": member["role"],
                "active": True,
                "viewer_override": False,
            }
        self.snapshots[project_id] = {
            "synced_at": started_at,
            "catenda_project_id": catenda_project_id,
        }

    def deactivate_user_projects(self, user_id, project_ids):
        for row in self.memberships(user_id=user_id):
            if row["project_id"] in project_ids:
                row["active"] = False


@pytest.fixture
def test_setup(monkeypatch):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)

    app = Flask(__name__)
    app.testing = True

    # Configure 3 projects in the system: proj-1, proj-2, and proj-3
    project_configs = [
        {"internal_project_id": "proj-1", "catenda_project_id": CAT_PROJ_1},
        {"internal_project_id": "proj-2", "catenda_project_id": CAT_PROJ_2},
        {"internal_project_id": "proj-3", "catenda_project_id": CAT_PROJ_3},
    ]

    all_db_projects = [
        Project(id="proj-1", name="Prosjekt 1 (Sykehus)"),
        Project(id="proj-2", name="Prosjekt 2 (Skole)"),
        Project(id="proj-3", name="Prosjekt 3 (Lukket prosjekt)"),
    ]

    mock_project_repo = Mock()
    mock_project_repo.list_active.return_value = all_db_projects

    container = Container()
    container._project_repo = mock_project_repo
    set_container(container)

    repo = FlowTestRepository(project_configs)

    oauth = Mock(spec=CatendaOAuth)
    oauth.BASE = "https://api.catenda.com"
    oauth.redirect_uri = "https://app.example.com/api/auth/catenda/callback"
    oauth.client_id = "test-client"
    oauth.client_secret = "test-secret"
    oauth.authorize_url = lambda state: f"https://api.catenda.com/oauth2/authorize?state={state}"
    oauth.exchange = Mock(return_value="mock-token-xyz")
    oauth.user = Mock(
        return_value={
            "subject": catenda_id(CAT_USER),
            "email": "kasper@example.com",
            "name": "Kasper",
        }
    )
    # User has access to proj-1 and proj-2 in Catenda, but NOT proj-3
    oauth.projects = Mock(return_value={catenda_id(CAT_PROJ_1), catenda_id(CAT_PROJ_2)})
    oauth.members = Mock(
        side_effect=lambda catenda_project_id, token: [
            {
                "subject": catenda_id(CAT_USER),
                "email": "kasper@example.com",
                "name": "Kasper",
                "role": "admin",
            }
        ]
    )

    service = AuthService(repo=repo, oauth=oauth)
    service.frontend_url = "https://app.example.com"

    app.extensions["koe_auth"] = service
    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_bp)
    init_project_context(app)

    yield app.test_client(), service

    set_container(None)


def test_catenda_login_and_project_discovery_flow(test_setup):
    """Test full flow: login via Catenda OAuth -> GET /api/projects returns user's 2 projects."""
    client, service = test_setup

    # 1. Unauthenticated request to /api/projects should return 401
    unauth_resp = client.get("/api/projects", base_url="https://app.example.com")
    assert unauth_resp.status_code == 401
    assert unauth_resp.get_json()["error"] == "UNAUTHORIZED"

    # 2. Initiate login
    login_resp = client.get(
        "/api/auth/catenda/login",
        query_string={"return_to": "/"},
        base_url="https://app.example.com",
    )
    assert login_resp.status_code == 302
    assert "https://api.catenda.com/oauth2/authorize" in login_resp.location

    state = parse_qs(urlsplit(login_resp.location).query)["state"][0]
    browser_cookie = client.get_cookie(f"{cookie_name()}_login", domain="app.example.com")
    assert browser_cookie is not None

    # 3. Simulate callback from Catenda
    cb_resp = client.get(
        "/api/auth/catenda/callback",
        query_string={"state": state, "code": "catenda-auth-code-123"},
        base_url="https://app.example.com",
    )
    assert cb_resp.status_code == 302
    assert cb_resp.location == "https://app.example.com/"

    session_cookie = client.get_cookie(cookie_name(), domain="app.example.com")
    assert session_cookie is not None

    # 4. Check /api/auth/session
    session_resp = client.get("/api/auth/session", base_url="https://app.example.com")
    assert session_resp.status_code == 200
    user_data = session_resp.get_json()["user"]
    assert user_data["email"] == "kasper@example.com"
    assert user_data["name"] == "Kasper"

    # 5. Fetch projects list: should return proj-1 and proj-2, NOT proj-3
    projects_resp = client.get("/api/projects", base_url="https://app.example.com")
    assert projects_resp.status_code == 200

    data = projects_resp.get_json()
    projects = data["projects"]
    assert len(projects) == 2

    project_ids = [p["id"] for p in projects]
    assert "proj-1" in project_ids
    assert "proj-2" in project_ids
    assert "proj-3" not in project_ids

    # 6. Verify project names
    project_names = [p["name"] for p in projects]
    assert "Prosjekt 1 (Sykehus)" in project_names
    assert "Prosjekt 2 (Skole)" in project_names
