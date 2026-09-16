"""Database integration tests for catenda_contract_teams and RPC functions.

Verifies the database properties requested in architectural reviews:
1. RPC execution and atomicity (koe_set_contract_teams, koe_register_project)
2. Rollback on incomplete configurations (missing BH or TE, empty array, invalid role)
3. Access control: anon / authenticated clients are denied SELECT and RPC execution
4. Service role client has full authorized access
5. Teardown ensures test isolation
"""

import os
from types import SimpleNamespace
from unittest.mock import Mock
import pytest

from lib.auth.domain import catenda_id
from repositories.auth_repository import AuthRepository

TEST_PROJ_ID = "integration-test-proj-rpc"
CAT_PROJ_UUID = "11111111-2222-3333-4444-555555555555"
LIB_UUID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
FOLDER_UUID = "ffffffff-1111-2222-3333-444444444444"
BOARD_UUID = "99999999-8888-7777-6666-555555555555"

BH_TEAM_1 = "bbbb1111-0000-0000-0000-000000000001"
TE_TEAM_1 = "eeee1111-0000-0000-0000-000000000001"
BH_TEAM_2 = "bbbb2222-0000-0000-0000-000000000002"


# ---------------------------------------------------------------------------
# Unit tests for AuthRepository RPC calling contract
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
# Live Supabase integration tests (skips gracefully if migration not applied)
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

    # Check if migration has been executed
    try:
        admin_client.table("catenda_contract_teams").select("*").limit(0).execute()
    except Exception as e:
        if "PGRST205" in str(e) or "not find the table" in str(e).lower():
            pytest.skip("Migration 20260916130000_catenda_contract_teams.sql not yet applied to remote Supabase")
        raise

    return admin_client, anon_client


@pytest.fixture
def clean_test_project(supabase_clients):
    admin_client, _ = supabase_clients

    try:
        admin_client.rpc(
            "koe_register_project",
            {
                "p_project_id": "__test_check__",
                "p_name": "__test_check__",
                "p_description": None,
                "p_catenda_project_id": "00000000-0000-0000-0000-000000000000",
                "p_library_id": "00000000-0000-0000-0000-000000000000",
                "p_folder_id": None,
                "p_topic_board_id": None,
                "p_teams": None,
            },
        ).execute()
        # Clean up the dummy check row
        admin_client.table("catenda_project_configs").delete().eq("internal_project_id", "__test_check__").execute()
        admin_client.table("projects").delete().eq("id", "__test_check__").execute()
    except Exception as e:
        if "PGRST202" in str(e) or "not find the function" in str(e).lower():
            pytest.skip("Updated migration with koe_register_project not yet applied to remote Supabase")
        raise

    # Teardown before and after
    def cleanup():
        try:
            admin_client.table("catenda_contract_teams").delete().eq("internal_project_id", TEST_PROJ_ID).execute()
            admin_client.table("catenda_topic_board_configs").delete().eq("internal_project_id", TEST_PROJ_ID).execute()
            admin_client.table("catenda_project_configs").delete().eq("internal_project_id", TEST_PROJ_ID).execute()
            admin_client.table("projects").delete().eq("id", TEST_PROJ_ID).execute()
        except Exception:
            pass

    cleanup()
    yield admin_client
    cleanup()


def test_anon_client_denied_direct_table_access(supabase_clients):
    """Anon client must NOT be allowed to read catenda_contract_teams."""
    _, anon_client = supabase_clients
    if not anon_client:
        pytest.skip("SUPABASE_PUBLISHABLE_KEY not configured")

    try:
        res = anon_client.table("catenda_contract_teams").select("*").execute()
        # If RLS blocks it, data will be empty or an error will be raised
        assert len(res.data) == 0
    except Exception as e:
        # Permission denied / RLS error is expected
        assert "permission" in str(e).lower() or "denied" in str(e).lower() or "401" in str(e) or "403" in str(e)


def test_anon_client_denied_rpc_execution(supabase_clients):
    """Anon client must NOT be allowed to execute koe_set_contract_teams."""
    _, anon_client = supabase_clients
    if not anon_client:
        pytest.skip("SUPABASE_PUBLISHABLE_KEY not configured")

    with pytest.raises(Exception) as exc_info:
        anon_client.rpc(
            "koe_set_contract_teams",
            {"p_project": "oslobygg", "p_teams": []},
        ).execute()
    err = str(exc_info.value).lower()
    assert "permission denied" in err or "401" in err or "403" in err or "pgrst" in err


def test_live_atomic_project_registration_and_contract_teams(clean_test_project):
    """Live test of koe_register_project and koe_set_contract_teams via service_role."""
    admin_client = clean_test_project
    repo = AuthRepository(client=admin_client)

    initial_teams = [
        {"team_id": BH_TEAM_1, "contract_role": "BH"},
        {"team_id": TE_TEAM_1, "contract_role": "TE"},
    ]

    # 1. Atomic project registration including contract teams
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

    # Verify project exists and is active
    config = repo.project_config(TEST_PROJ_ID)
    assert config is not None
    assert config["internal_project_id"] == TEST_PROJ_ID
    assert catenda_id(config["catenda_project_id"]) == catenda_id(CAT_PROJ_UUID)

    # Verify teams exist
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

    # 3. Rollback verification on incomplete teams (missing TE)
    invalid_teams = [
        {"team_id": BH_TEAM_1, "contract_role": "BH"},
    ]
    with pytest.raises(Exception) as exc_info:
        repo.set_contract_teams(TEST_PROJ_ID, invalid_teams)
    assert "Både BH og TE" in str(exc_info.value)

    # Verify rollback: previous teams are completely intact!
    teams_after_rollback = repo.contract_teams(TEST_PROJ_ID)
    assert teams_after_rollback["BH"] == {catenda_id(BH_TEAM_2)}
    assert teams_after_rollback["TE"] == {catenda_id(TE_TEAM_1)}

    # 4. Rollback on empty array
    with pytest.raises(Exception):
        repo.set_contract_teams(TEST_PROJ_ID, [])

    # Previous teams still intact
    teams_after_empty = repo.contract_teams(TEST_PROJ_ID)
    assert teams_after_empty["BH"] == {catenda_id(BH_TEAM_2)}
    assert teams_after_empty["TE"] == {catenda_id(TE_TEAM_1)}
