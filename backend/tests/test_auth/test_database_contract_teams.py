"""Comprehensive tests for database-driven contract teams (BH/TE).

Verifies all production requirements and architectural constraints:
1. Multi-project isolation: same user can have BH in project A and TE in project B.
2. Dynamic update: database changes take effect immediately without restart.
3. API route status codes:
   - Missing/incomplete team mapping -> 403 CONTRACT_ROLE_REQUIRED
   - Membership on both sides -> 403 CONTRACT_ROLE_REQUIRED
   - Catenda service failure -> 503 CONTRACT_ACCESS_UNAVAILABLE
   - Database failure -> 503 CONTRACT_ACCESS_UNAVAILABLE
4. Deactivated project rejection (fails closed).
5. UUID normalization: handles dashed and compact hex UUIDs consistently.
6. Multiple teams on same side: grants role, but sets team_id=None (ambiguous org).
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask, jsonify

from lib.auth.catenda_oauth import CatendaUnavailable
from lib.auth.contract_role import require_contract_role
from lib.auth.domain import catenda_id
from lib.auth.session import cookie_name, require_auth
from lib.project_context import init_project_context
from services.auth_service import AuthService

CAT_PROJ_A = "11111111-1111-1111-1111-111111111111"
CAT_PROJ_B = "22222222-2222-2222-2222-222222222222"

BH_TEAM_A = "33333333-3333-3333-3333-333333333333"
TE_TEAM_A = "44444444-4444-4444-4444-444444444444"

BH_TEAM_B = "55555555-5555-5555-5555-555555555555"
TE_TEAM_B = "66666666-6666-6666-6666-666666666666"

EXTRA_BH_TEAM_A = "77777777-7777-7777-7777-777777777777"

USER_ID = "user-uuid-1234"
CAT_SUBJECT = "88888888-8888-8888-8888-888888888888"


class InMemoryContractTeamsRepo:
    """Mock repository with direct project_config and contract_teams lookups."""

    def __init__(self):
        self.projects = {
            "proj-a": {"internal_project_id": "proj-a", "catenda_project_id": CAT_PROJ_A, "is_active": True},
            "proj-b": {"internal_project_id": "proj-b", "catenda_project_id": CAT_PROJ_B, "is_active": True},
        }
        self.teams = {
            "proj-a": {"BH": {catenda_id(BH_TEAM_A)}, "TE": {catenda_id(TE_TEAM_A)}},
            "proj-b": {"BH": {catenda_id(BH_TEAM_B)}, "TE": {catenda_id(TE_TEAM_B)}},
        }
        self.user_memberships = {
            ("proj-a", USER_ID): {"active": True, "viewer_override": False, "catenda_subject": CAT_SUBJECT},
            ("proj-b", USER_ID): {"active": True, "viewer_override": False, "catenda_subject": CAT_SUBJECT},
        }

    def project_config(self, project_id):
        p = self.projects.get(project_id)
        return p if (p and p.get("is_active")) else None

    def contract_teams(self, project_id):
        raw = self.teams.get(project_id, {"BH": set(), "TE": set()})
        return {
            role: {catenda_id(t) for t in teams}
            for role, teams in raw.items()
        }

    def membership(self, project_id, user_id):
        return self.user_memberships.get((project_id, user_id))

    def sync_state(self, project_id):
        p = self.projects.get(project_id)
        return {"synced_at": "2099-01-01T00:00:00Z", "catenda_project_id": p["catenda_project_id"]} if p else None

    def session(self, token_hash):
        return {
            "token_hash": token_hash,
            "csrf_token": "csrf-valid-123",
            "app_users": {"id": USER_ID, "email": "kasper@example.com", "name": "Kasper"},
        }


@pytest.fixture
def app_setup(monkeypatch):
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("CATENDA_CONTRACT_TEAMS", raising=False)

    repo = InMemoryContractTeamsRepo()
    oauth = Mock()
    client = Mock()
    client.ensure_authenticated.return_value = True
    client.access_token = "mock-catenda-token"

    monkeypatch.setattr("core.container.get_container", lambda: SimpleNamespace(catenda_client=client))

    service = AuthService(repo=repo, oauth=oauth)

    app = Flask(__name__)
    app.testing = True
    app.extensions["koe_auth"] = service
    init_project_context(app)

    @app.route("/api/projects/<project_id>/test-write", methods=["POST"])
    @require_auth
    @require_contract_role("BH")
    def write_endpoint(project_id):
        from flask import g
        return jsonify(ok=True, role=g.contract_role, team=g.contract_team)

    test_client = app.test_client()
    test_client.set_cookie(cookie_name(), "dummy-session-cookie")

    return test_client, service, repo, oauth, client


AUTH_HEADERS = {"X-CSRF-Token": "csrf-valid-123", "X-Project-ID": "proj-a"}


def test_multi_project_different_roles(app_setup):
    """Same user has BH in project A, but TE in project B."""
    _, service, _, oauth, _ = app_setup

    subj = catenda_id(CAT_SUBJECT)
    bh_a = catenda_id(BH_TEAM_A)
    te_b = catenda_id(TE_TEAM_B)

    oauth.team_members.side_effect = lambda cat_pid, team_id, token: (
        {subj}
        if (catenda_id(cat_pid) == catenda_id(CAT_PROJ_A) and catenda_id(team_id) == bh_a)
        or (catenda_id(cat_pid) == catenda_id(CAT_PROJ_B) and catenda_id(team_id) == te_b)
        else set()
    )

    role_a, team_a = service.contract_membership("proj-a", USER_ID)
    assert role_a == "BH"
    assert team_a == bh_a

    role_b, team_b = service.contract_membership("proj-b", USER_ID)
    assert role_b == "TE"
    assert team_b == te_b


def test_dynamic_update_without_restart(app_setup):
    """Database updates take effect immediately on next query without restarting backend."""
    _, service, repo, oauth, _ = app_setup

    subj = catenda_id(CAT_SUBJECT)
    bh_a = catenda_id(BH_TEAM_A)
    te_a = catenda_id(TE_TEAM_A)

    # User is in BH_TEAM_A, not in TE_TEAM_A
    oauth.team_members.side_effect = lambda cat_pid, team_id, token: (
        {subj} if catenda_id(team_id) == bh_a else set()
    )

    # Initially repo has empty contract teams for proj-a
    repo.teams["proj-a"] = {"BH": set(), "TE": set()}
    assert service.contract_role("proj-a", USER_ID) is None

    # Now database is updated with BH and TE teams
    repo.teams["proj-a"] = {"BH": {bh_a}, "TE": {te_a}}

    # Immediately on next call, role is granted without restarting anything
    assert service.contract_role("proj-a", USER_ID) == "BH"


def test_route_returns_403_when_role_missing(app_setup):
    """API route returns 403 CONTRACT_ROLE_REQUIRED when user lacks team membership."""
    client, _, _, oauth, _ = app_setup
    oauth.team_members.return_value = set()  # User is not in any team

    resp = client.post("/api/projects/proj-a/test-write", headers=AUTH_HEADERS)
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "CONTRACT_ROLE_REQUIRED"


def test_route_returns_403_on_both_sides(app_setup):
    """User in both BH and TE teams is rejected with 403."""
    client, _, _, oauth, _ = app_setup
    oauth.team_members.return_value = {catenda_id(CAT_SUBJECT)}

    resp = client.post("/api/projects/proj-a/test-write", headers=AUTH_HEADERS)
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "CONTRACT_ROLE_REQUIRED"


def test_route_returns_503_on_catenda_outage(app_setup):
    """Provider outage returns 503 CONTRACT_ACCESS_UNAVAILABLE, not 403."""
    client, _, _, oauth, _ = app_setup
    oauth.team_members.side_effect = CatendaUnavailable("Catenda API is down")

    resp = client.post("/api/projects/proj-a/test-write", headers=AUTH_HEADERS)
    assert resp.status_code == 503
    assert resp.get_json()["error"] == "CONTRACT_ACCESS_UNAVAILABLE"


def test_route_returns_503_on_database_error(app_setup):
    """Database lookup failure raises and returns 503, failing closed safely."""
    client, _, repo, _, _ = app_setup
    repo.contract_teams = Mock(side_effect=RuntimeError("Database connection lost"))

    resp = client.post("/api/projects/proj-a/test-write", headers=AUTH_HEADERS)
    assert resp.status_code == 503
    assert resp.get_json()["error"] == "CONTRACT_ACCESS_UNAVAILABLE"


def test_deactivated_project_fails_closed(app_setup):
    """Deactivated project returns None from project_config and 403 from route."""
    client, _, repo, oauth, _ = app_setup
    repo.projects["proj-a"]["is_active"] = False
    oauth.team_members.return_value = {catenda_id(CAT_SUBJECT)}

    resp = client.post("/api/projects/proj-a/test-write", headers=AUTH_HEADERS)
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "CONTRACT_ROLE_REQUIRED"


def test_uuid_normalization(app_setup):
    """Dashed and compact hex UUIDs match correctly."""
    _, service, repo, oauth, _ = app_setup

    dashed_bh = "33333333-3333-3333-3333-333333333333"
    compact_bh = "33333333333333333333333333333333"
    subj = catenda_id(CAT_SUBJECT)

    # Database has dashed format
    repo.teams["proj-a"] = {"BH": {dashed_bh}, "TE": {TE_TEAM_A}}

    # Catenda API returns compact format for team membership
    oauth.team_members.side_effect = lambda cat_pid, team_id, token: (
        {subj} if catenda_id(team_id) == compact_bh else set()
    )

    role, team = service.contract_membership("proj-a", USER_ID)
    assert role == "BH"
    assert team == compact_bh


def test_multiple_teams_same_side_ambiguous_organization(app_setup):
    """Multiple teams on same side: role is BH, but team_id is None (ambiguous org)."""
    _, service, repo, oauth, _ = app_setup

    bh1 = catenda_id(BH_TEAM_A)
    bh2 = catenda_id(EXTRA_BH_TEAM_A)
    subj = catenda_id(CAT_SUBJECT)

    repo.teams["proj-a"] = {"BH": {bh1, bh2}, "TE": {catenda_id(TE_TEAM_A)}}
    oauth.team_members.side_effect = lambda cat_pid, team_id, token: (
        {subj} if catenda_id(team_id) in {bh1, bh2} else set()
    )

    role, team = service.contract_membership("proj-a", USER_ID)
    assert role == "BH"
    assert team is None
