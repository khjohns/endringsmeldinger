"""Database integration tests for catenda_contract_teams and RPC functions.

Verifies the database properties requested in architectural reviews:
1. RPC execution and atomicity (koe_set_contract_teams, koe_register_project)
2. Rollback on incomplete configurations:
   - koe_set_contract_teams rolls back without altering existing teams
   - koe_register_project rolls back entire project registration on invalid teams (missing TE)
   - koe_register_project rolls back entire project registration on empty teams ([])
3. Access control:
   - anon role is denied direct table access (RLS)
   - anon role is denied RPC execution (42501 permission denied) for both RPCs
   - authenticated role is denied RPC execution (42501 permission denied) for both RPCs
4. Service role client has full authorized access:
   - Successful registration with initial teams
   - Team replacement updates database
   - Failed replacement preserves existing teams
   - Registration with null teams leaves teams unconfigured
5. Teardown ensures test isolation

Enhetstestene øverst i denne fila kjører alltid. De live-merkede testene
treffer ekte Supabase og krever RUN_LIVE_SUPABASE=1:

    RUN_LIVE_SUPABASE=1 python -m pytest tests/test_auth/test_database_contract_teams_integration.py
"""

import os
import uuid
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from lib.auth.domain import catenda_id
from repositories.auth_repository import AuthRepository

TEST_PROJ_ID = "integration-test-proj-rpc"
FAILED_REG_PROJ_ID = "integration-test-failed-reg"
CAT_PROJ_UUID = "11111111-2222-3333-4444-555555555555"
LIB_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
FOLDER_UUID = "ffffffff-1111-2222-3333-444444444444"
BOARD_UUID = "99999999-8888-7777-6666-555555555555"

BH_TEAM_1 = "bbbb1111-0000-0000-0000-000000000001"
TE_TEAM_1 = "eeee1111-0000-0000-0000-000000000001"
BH_TEAM_2 = "bbbb2222-0000-0000-0000-000000000002"


# ---------------------------------------------------------------------------
# Unit tests for AuthRepository RPC calling contract (using mocks)
# ---------------------------------------------------------------------------

def test_auth_repo_set_contract_teams_calls_rpc():
    client = Mock()
    rpc_mock = Mock()
    client.rpc.return_value = rpc_mock
    rpc_mock.execute.return_value = SimpleNamespace(data=True)

    repo = AuthRepository(client=client)
    teams = [
        {"team_id": BH_TEAM_1, "contract_role": "BH"},
        {"team_id": TE_TEAM_1, "contract_role": "TE"},
    ]
    result = repo.set_contract_teams("test-proj", teams)

    client.rpc.assert_called_once_with(
        "koe_set_contract_teams",
        {"p_project": "test-proj", "p_teams": teams},
    )
    assert result is True


def test_auth_repo_register_project_calls_rpc():
    client = Mock()
    rpc_mock = Mock()
    client.rpc.return_value = rpc_mock
    rpc_mock.execute.return_value = SimpleNamespace(data=True)

    repo = AuthRepository(client=client)
    teams = [
        {"team_id": BH_TEAM_1, "contract_role": "BH"},
        {"team_id": TE_TEAM_1, "contract_role": "TE"},
    ]
    result = repo.register_project(
        project_id="test-proj",
        name="Test Prosjekt",
        catenda_project_id=CAT_PROJ_UUID,
        library_id=LIB_UUID,
        folder_id=FOLDER_UUID,
        topic_board_id=BOARD_UUID,
        description="Beskrivelse",
        teams=teams,
    )

    client.rpc.assert_called_once_with(
        "koe_register_project",
        {
            "p_project_id": "test-proj",
            "p_name": "Test Prosjekt",
            "p_description": "Beskrivelse",
            "p_catenda_project_id": CAT_PROJ_UUID,
            "p_library_id": LIB_UUID,
            "p_folder_id": FOLDER_UUID,
            "p_topic_board_id": BOARD_UUID,
            "p_teams": teams,
        },
    )
    assert result is True


def test_auth_repo_contract_teams_normalizes_uuids():
    client = Mock()
    table_mock = Mock()
    select_mock = Mock()
    eq_mock = Mock()

    client.table.return_value = table_mock
    table_mock.select.return_value = select_mock
    select_mock.eq.return_value = eq_mock
    eq_mock.execute.return_value = SimpleNamespace(
        data=[
            {"team_id": BH_TEAM_1, "contract_role": "BH"},
            {"team_id": TE_TEAM_1, "contract_role": "TE"},
        ]
    )

    repo = AuthRepository(client=client)
    teams = repo.contract_teams("test-proj")

    assert teams["BH"] == {catenda_id(BH_TEAM_1)}
    assert teams["TE"] == {catenda_id(TE_TEAM_1)}


# ---------------------------------------------------------------------------
# Live Supabase integration tests (running against Supabase instance)
#
# Disse oppretter og sletter auth-brukere, prosjekter og team i det Supabase-
# prosjektet backend/.env peker på. De er derfor merket `live` og hoppes over
# med mindre RUN_LIVE_SUPABASE=1 er satt (se tests/conftest.py).
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def supabase_clients():
    url = os.getenv("SUPABASE_URL")
    secret_key = os.getenv("SUPABASE_SECRET_KEY")
    anon_key = os.getenv("SUPABASE_PUBLISHABLE_KEY")

    if not url or not secret_key:
        pytest.skip("SUPABASE_URL or SUPABASE_SECRET_KEY not configured")

    from supabase import create_client

    admin_client = create_client(url, secret_key)
    anon_client = create_client(url, anon_key) if anon_key else None

    # Verify table existence
    try:
        admin_client.table("catenda_contract_teams").select("*").limit(0).execute()
    except Exception as e:
        if "PGRST205" in str(e) or "not find the table" in str(e).lower():
            pytest.skip("Table catenda_contract_teams not yet migrated on remote Supabase")
        raise

    return admin_client, anon_client


@pytest.fixture(scope="module")
def authenticated_client(supabase_clients):
    admin_client, _ = supabase_clients
    url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_PUBLISHABLE_KEY")
    if not anon_key:
        pytest.skip("SUPABASE_PUBLISHABLE_KEY not configured")

    from supabase import create_client

    user_email = f"test_auth_{uuid.uuid4().hex[:8]}@example.com"
    user_password = f"P@{uuid.uuid4().hex}123!"

    user = admin_client.auth.admin.create_user(
        {"email": user_email, "password": user_password, "email_confirm": True}
    )
    auth_client = create_client(url, anon_key)
    auth_client.auth.sign_in_with_password({"email": user_email, "password": user_password})

    yield auth_client

    # Teardown user
    try:
        admin_client.auth.admin.delete_user(user.user.id)
    except Exception:
        pass


@pytest.fixture
def clean_test_project(supabase_clients):
    admin_client, _ = supabase_clients

    # Teardown before and after
    def cleanup():
        for pid in (TEST_PROJ_ID, FAILED_REG_PROJ_ID):
            try:
                admin_client.table("catenda_contract_teams").delete().eq("internal_project_id", pid).execute()
                admin_client.table("catenda_topic_board_configs").delete().eq("internal_project_id", pid).execute()
                admin_client.table("catenda_project_configs").delete().eq("internal_project_id", pid).execute()
                admin_client.table("projects").delete().eq("id", pid).execute()
            except Exception:
                pass

    cleanup()
    yield admin_client
    cleanup()


@pytest.mark.live
def test_anon_client_denied_direct_table_access(supabase_clients):
    """Anon client must NOT be allowed to read catenda_contract_teams."""
    _, anon_client = supabase_clients
    if not anon_client:
        pytest.skip("SUPABASE_PUBLISHABLE_KEY not configured")

    try:
        res = anon_client.table("catenda_contract_teams").select("*").execute()
        assert len(res.data) == 0
    except Exception as e:
        code = getattr(e, "code", None)
        assert code in {"42501", "PGRST301"} or "permission denied" in str(e).lower()


@pytest.mark.live
@pytest.mark.parametrize("rpc_name,args", [
    ("koe_set_contract_teams", {"p_project": "oslobygg", "p_teams": []}),
    ("koe_register_project", {
        "p_project_id": "test",
        "p_name": "Test",
        "p_description": None,
        "p_catenda_project_id": CAT_PROJ_UUID,
        "p_library_id": LIB_UUID,
    }),
])
def test_anon_client_denied_rpc_execution_with_permission_error(supabase_clients, rpc_name, args):
    """Anon client must receive concrete 42501 INSUFFICIENT PRIVILEGE error on both RPCs."""
    _, anon_client = supabase_clients
    if not anon_client:
        pytest.skip("SUPABASE_PUBLISHABLE_KEY not configured")

    with pytest.raises(Exception) as exc_info:
        anon_client.rpc(rpc_name, args).execute()

    code = getattr(exc_info.value, "code", None)
    msg = str(getattr(exc_info.value, "message", exc_info.value)).lower()

    if code == "PGRST202" or "not find the function" in msg:
        pytest.skip(f"Function {rpc_name} not yet deployed to remote Supabase")

    # Concrete check: Must be PostgreSQL 42501 Insufficient Privilege
    assert code == "42501"
    assert f"permission denied for function {rpc_name}" in msg


@pytest.mark.live
@pytest.mark.parametrize("rpc_name,args", [
    ("koe_set_contract_teams", {"p_project": "oslobygg", "p_teams": []}),
    ("koe_register_project", {
        "p_project_id": "test",
        "p_name": "Test",
        "p_description": None,
        "p_catenda_project_id": CAT_PROJ_UUID,
        "p_library_id": LIB_UUID,
    }),
])
def test_authenticated_client_denied_rpc_execution_with_permission_error(authenticated_client, rpc_name, args):
    """Authenticated user must receive concrete 42501 INSUFFICIENT PRIVILEGE error on both RPCs."""
    with pytest.raises(Exception) as exc_info:
        authenticated_client.rpc(rpc_name, args).execute()

    code = getattr(exc_info.value, "code", None)
    msg = str(getattr(exc_info.value, "message", exc_info.value)).lower()

    if code == "PGRST202" or "not find the function" in msg:
        pytest.skip(f"Function {rpc_name} not yet deployed to remote Supabase")

    # Concrete check: Must be PostgreSQL 42501 Insufficient Privilege
    assert code == "42501"
    assert f"permission denied for function {rpc_name}" in msg


@pytest.mark.live
def test_live_atomic_project_registration_and_contract_teams(clean_test_project):
    """Live test of successful project registration, team update, and rollback on failed team replacement."""
    admin_client = clean_test_project
    repo = AuthRepository(client=admin_client)

    initial_teams = [
        {"team_id": BH_TEAM_1, "contract_role": "BH"},
        {"team_id": TE_TEAM_1, "contract_role": "TE"},
    ]

    # 1. Atomic project registration including contract teams
    try:
        repo.register_project(
            project_id=TEST_PROJ_ID,
            name="Integration Test Project",
            catenda_project_id=CAT_PROJ_UUID,
            library_id=LIB_UUID,
            folder_id=FOLDER_UUID,
            topic_board_id=BOARD_UUID,
            description="Opprettet under automatisert test",
            teams=initial_teams,
        )
    except Exception as e:
        if "PGRST202" in str(e) or "not find the function" in str(e).lower():
            pytest.skip("koe_register_project not yet deployed on Supabase")
        raise

    # Verify project exists and is active
    config = repo.project_config(TEST_PROJ_ID)
    assert config is not None
    assert config["internal_project_id"] == TEST_PROJ_ID
    assert catenda_id(config["catenda_project_id"]) == catenda_id(CAT_PROJ_UUID)

    # Verify initial teams exist
    teams = repo.contract_teams(TEST_PROJ_ID)
    assert teams["BH"] == {catenda_id(BH_TEAM_1)}
    assert teams["TE"] == {catenda_id(TE_TEAM_1)}

    # 2. Update teams: replace with new BH team
    updated_teams = [
        {"team_id": BH_TEAM_2, "contract_role": "BH"},
        {"team_id": TE_TEAM_1, "contract_role": "TE"},
    ]
    repo.set_contract_teams(TEST_PROJ_ID, updated_teams)

    teams_after = repo.contract_teams(TEST_PROJ_ID)
    assert teams_after["BH"] == {catenda_id(BH_TEAM_2)}
    assert teams_after["TE"] == {catenda_id(TE_TEAM_1)}

    # 3. Rollback verification on incomplete teams update (missing TE)
    invalid_teams = [
        {"team_id": BH_TEAM_1, "contract_role": "BH"},
    ]
    with pytest.raises(Exception) as exc_info:
        repo.set_contract_teams(TEST_PROJ_ID, invalid_teams)
    assert "Både BH og TE" in str(exc_info.value)

    # Verify rollback: existing teams are preserved completely intact!
    teams_after_rollback = repo.contract_teams(TEST_PROJ_ID)
    assert teams_after_rollback["BH"] == {catenda_id(BH_TEAM_2)}
    assert teams_after_rollback["TE"] == {catenda_id(TE_TEAM_1)}

    # 4. Rollback on empty array update
    with pytest.raises(Exception):
        repo.set_contract_teams(TEST_PROJ_ID, [])

    # Previous teams still intact
    teams_after_empty = repo.contract_teams(TEST_PROJ_ID)
    assert teams_after_empty["BH"] == {catenda_id(BH_TEAM_2)}
    assert teams_after_empty["TE"] == {catenda_id(TE_TEAM_1)}


@pytest.mark.live
def test_live_registration_rollback_on_invalid_teams(clean_test_project):
    """If p_teams is invalid during registration, the ENTIRE registration must roll back."""
    admin_client = clean_test_project
    repo = AuthRepository(client=admin_client)

    # Incomplete teams: only BH provided, TE missing
    invalid_teams = [
        {"team_id": BH_TEAM_1, "contract_role": "BH"},
    ]

    try:
        with pytest.raises(Exception) as exc_info:
            repo.register_project(
                project_id=FAILED_REG_PROJ_ID,
                name="Should Rollback",
                catenda_project_id=CAT_PROJ_UUID,
                library_id=LIB_UUID,
                folder_id=FOLDER_UUID,
                topic_board_id=BOARD_UUID,
                description="Test rollback",
                teams=invalid_teams,
            )
        assert "Både BH og TE" in str(exc_info.value)
    except pytest.skip.Exception:
        raise
    except Exception as e:
        if "PGRST202" in str(e) or "not find the function" in str(e).lower():
            pytest.skip("koe_register_project not yet deployed on Supabase")
        raise

    # Verify atomic rollback: NO traces of the project exist in any table!
    proj_rows = admin_client.table("projects").select("id").eq("id", FAILED_REG_PROJ_ID).execute().data
    cfg_rows = admin_client.table("catenda_project_configs").select("internal_project_id").eq("internal_project_id", FAILED_REG_PROJ_ID).execute().data
    board_rows = admin_client.table("catenda_topic_board_configs").select("topic_board_id").eq("internal_project_id", FAILED_REG_PROJ_ID).execute().data
    team_rows = admin_client.table("catenda_contract_teams").select("team_id").eq("internal_project_id", FAILED_REG_PROJ_ID).execute().data

    assert len(proj_rows) == 0, "projects row was not rolled back"
    assert len(cfg_rows) == 0, "catenda_project_configs row was not rolled back"
    assert len(board_rows) == 0, "catenda_topic_board_configs row was not rolled back"
    assert len(team_rows) == 0, "catenda_contract_teams rows were not rolled back"


@pytest.mark.live
def test_live_registration_rollback_on_empty_teams(clean_test_project):
    """Calling register_project with an empty team list [] must fail and roll back everything."""
    admin_client = clean_test_project
    repo = AuthRepository(client=admin_client)

    try:
        with pytest.raises(Exception) as exc_info:
            repo.register_project(
                project_id=FAILED_REG_PROJ_ID,
                name="Empty Teams Rollback",
                catenda_project_id=CAT_PROJ_UUID,
                library_id=LIB_UUID,
                folder_id=FOLDER_UUID,
                topic_board_id=BOARD_UUID,
                description="Should fail and rollback on []",
                teams=[],
            )
        assert "Både BH og TE" in str(exc_info.value)
    except pytest.skip.Exception:
        raise
    except Exception as e:
        if "PGRST202" in str(e) or "not find the function" in str(e).lower():
            pytest.skip("koe_register_project not yet deployed on Supabase")
        raise

    # Verify atomic rollback: NO traces of the project exist in any table!
    proj_rows = admin_client.table("projects").select("id").eq("id", FAILED_REG_PROJ_ID).execute().data
    cfg_rows = admin_client.table("catenda_project_configs").select("internal_project_id").eq("internal_project_id", FAILED_REG_PROJ_ID).execute().data
    assert len(proj_rows) == 0, "projects row was not rolled back on empty teams"
    assert len(cfg_rows) == 0, "catenda_project_configs row was not rolled back on empty teams"


@pytest.mark.live
def test_live_registration_with_null_teams_leaves_teams_empty(clean_test_project):
    """When p_teams is None, registration succeeds and contract_teams table is not touched."""
    admin_client = clean_test_project
    repo = AuthRepository(client=admin_client)

    try:
        repo.register_project(
            project_id=TEST_PROJ_ID,
            name="No Teams Project",
            catenda_project_id=CAT_PROJ_UUID,
            library_id=LIB_UUID,
            folder_id=FOLDER_UUID,
            topic_board_id=BOARD_UUID,
            description="Null teams registration",
            teams=None,
        )
    except Exception as e:
        if "PGRST202" in str(e) or "not find the function" in str(e).lower():
            pytest.skip("koe_register_project not yet deployed on Supabase")
        raise

    # Project is registered
    config = repo.project_config(TEST_PROJ_ID)
    assert config is not None
    assert config["internal_project_id"] == TEST_PROJ_ID

    # Contract teams are empty
    teams = repo.contract_teams(TEST_PROJ_ID)
    assert teams == {"BH": set(), "TE": set()}
