"""Offline contract tests for the permanent Catenda project registry."""

from types import SimpleNamespace

import pytest

from repositories.catenda_project_config_repository import (
    ProjectRegistryConfigurationError,
    ProjectRegistryRepositoryError,
    SupabaseCatendaProjectConfigRepository,
)

PROJECT_ID = "11111111-1111-1111-1111-111111111111"
BOARD_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
LIBRARY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
FOLDER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


class FakeQuery:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.calls = []

    def select(self, value):
        self.calls.append(("select", value))
        return self

    def eq(self, field, value):
        self.calls.append(("eq", field, value))
        return self

    def limit(self, value):
        self.calls.append(("limit", value))
        return self

    def execute(self):
        self.calls.append(("execute",))
        if self.error:
            raise self.error
        return SimpleNamespace(data=self.result)


class FakeClient:
    def __init__(self, project_result=None, board_result=None, project_error=None, board_error=None):
        self.project_query = FakeQuery(project_result, project_error)
        self.board_query = FakeQuery(board_result, board_error)
        self.tables = []

    def table(self, name):
        self.tables.append(name)
        if name == "catenda_project_configs":
            return self.project_query
        if name == "catenda_topic_board_configs":
            return self.board_query
        raise AssertionError(f"Unexpected table {name}")


def active_project_row():
    return {
        "internal_project_id": "project-oslobygg-1",
        "catenda_project_id": PROJECT_ID,
        "library_id": LIBRARY_ID,
        "folder_id": FOLDER_ID,
    }


def test_constructor_prefers_service_role_key_without_elevating_shared_client(
    monkeypatch,
):
    created_with = {}
    fake_client = FakeClient()

    def create_client(*, url=None, key=None):
        created_with.update(url=url, key=key)
        return fake_client

    monkeypatch.setenv("SUPABASE_URL", "https://registry.example.invalid")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "service-role-key")
    monkeypatch.setenv("SUPABASE_KEY", "legacy-key")
    monkeypatch.setattr("lib.supabase.client.create_supabase_client", create_client)

    repository = SupabaseCatendaProjectConfigRepository()

    assert repository.client is fake_client
    assert created_with == {
        "url": None,
        "key": "service-role-key",
    }


def test_maps_active_project_and_active_boards_to_validated_config():
    client = FakeClient(
        project_result=[active_project_row()],
        board_result=[{"topic_board_id": BOARD_ID}],
    )

    config = SupabaseCatendaProjectConfigRepository(client=client).get_by_catenda_project(
        PROJECT_ID.replace("-", "")
    )

    assert config is not None
    assert config.internal_project_id == "project-oslobygg-1"
    assert config.catenda_project_id == PROJECT_ID
    assert config.topic_board_ids == [BOARD_ID]
    assert config.library_id == LIBRARY_ID
    assert config.folder_id == FOLDER_ID
    assert client.tables == [
        "catenda_project_configs",
        "catenda_topic_board_configs",
    ]
    assert ("eq", "catenda_project_id", PROJECT_ID.replace("-", "")) in client.project_query.calls
    assert ("eq", "is_active", True) in client.project_query.calls
    assert ("eq", "internal_project_id", "project-oslobygg-1") in client.board_query.calls
    assert ("eq", "is_active", True) in client.board_query.calls


def test_unknown_or_inactive_project_returns_none_without_board_query():
    client = FakeClient(project_result=[])

    assert (
        SupabaseCatendaProjectConfigRepository(client=client).get_by_catenda_project(
            PROJECT_ID
        )
        is None
    )
    assert client.tables == ["catenda_project_configs"]


@pytest.mark.parametrize("failed_query", ["project", "board"])
def test_query_failure_is_not_mapped_to_unknown_project(failed_query):
    client = FakeClient(
        project_result=[active_project_row()] if failed_query == "board" else None,
        board_result=[{"topic_board_id": BOARD_ID}],
        project_error=RuntimeError("database unavailable") if failed_query == "project" else None,
        board_error=RuntimeError("database unavailable") if failed_query == "board" else None,
    )

    with pytest.raises(ProjectRegistryRepositoryError):
        SupabaseCatendaProjectConfigRepository(client=client).get_by_catenda_project(
            PROJECT_ID
        )


def test_invalid_or_empty_active_board_data_is_configuration_error():
    client = FakeClient(project_result=[active_project_row()], board_result=[])

    with pytest.raises(ProjectRegistryConfigurationError):
        SupabaseCatendaProjectConfigRepository(client=client).get_by_catenda_project(
            PROJECT_ID
        )
