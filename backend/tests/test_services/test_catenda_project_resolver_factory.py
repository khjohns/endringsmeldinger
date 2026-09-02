"""Tests for the fail-closed legacy Catenda project-resolver factory."""

from unittest.mock import MagicMock

import pytest

from core.config import settings
from models.catenda_project_config import CatendaProjectConfig
from repositories.catenda_project_config_repository import (
    InMemoryCatendaProjectConfigRepository,
)
from services.catenda_project_resolver import (
    ProjectBoardMismatchError,
    UnknownProjectError,
)
from services.catenda_project_resolver_factory import (
    LEGACY_INTERNAL_PROJECT_ID,
    LegacyProjectResolverConfigurationError,
    ProjectResolverConfigurationError,
    build_legacy_project_resolver,
    build_project_resolver,
)

PROJECT_ID = "11111111-1111-1111-1111-111111111111"
OTHER_PROJECT_ID = "22222222-2222-2222-2222-222222222222"
BOARD_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
TOPIC_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"
LIBRARY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"


@pytest.fixture
def configured_settings(monkeypatch):
    monkeypatch.setattr(settings, "catenda_project_id", PROJECT_ID)
    monkeypatch.setattr(settings, "catenda_topic_board_id", BOARD_ID)
    monkeypatch.setattr(settings, "catenda_library_id", LIBRARY_ID)
    monkeypatch.setattr(settings, "catenda_folder_id", "")


def make_client(board_project_id=PROJECT_ID):
    client = MagicMock()
    client.get_topic_board_details.return_value = {
        "bimsync_project_id": board_project_id
    }
    return client


def test_complete_settings_build_and_resolve(configured_settings):
    client = make_client()
    resolver = build_legacy_project_resolver(client)

    context = resolver.resolve(
        project_id=PROJECT_ID.replace("-", ""),
        board_id=BOARD_ID.replace("-", ""),
        topic_id=TOPIC_ID.replace("-", ""),
    )

    assert context.internal_project_id == LEGACY_INTERNAL_PROJECT_ID
    assert context.catenda_project_id == PROJECT_ID
    assert context.board_id == BOARD_ID
    assert context.topic_id == TOPIC_ID
    assert context.library_id == LIBRARY_ID
    client.get_topic_board_details.assert_called_once_with(BOARD_ID)


@pytest.mark.parametrize(
    "missing_setting",
    ["catenda_project_id", "catenda_topic_board_id", "catenda_library_id"],
)
def test_missing_required_setting_fails_closed(
    configured_settings, monkeypatch, missing_setting
):
    monkeypatch.setattr(settings, missing_setting, "")

    with pytest.raises(LegacyProjectResolverConfigurationError) as exc_info:
        build_legacy_project_resolver(make_client())

    assert "Mangler obligatorisk" in str(exc_info.value)


def test_missing_client_fails_closed(configured_settings):
    with pytest.raises(LegacyProjectResolverConfigurationError) as exc_info:
        build_legacy_project_resolver(None)

    assert "Catenda-klient mangler" in str(exc_info.value)


def test_board_project_mismatch_is_rejected(configured_settings):
    resolver = build_legacy_project_resolver(make_client(OTHER_PROJECT_ID))

    with pytest.raises(ProjectBoardMismatchError):
        resolver.resolve(
            project_id=PROJECT_ID,
            board_id=BOARD_ID,
            topic_id=TOPIC_ID,
        )


def test_global_settings_cannot_override_payload_after_build(
    configured_settings, monkeypatch
):
    client = make_client()
    resolver = build_legacy_project_resolver(client)
    monkeypatch.setattr(settings, "catenda_project_id", OTHER_PROJECT_ID)

    with pytest.raises(UnknownProjectError):
        resolver.resolve(
            project_id=OTHER_PROJECT_ID,
            board_id=BOARD_ID,
            topic_id=TOPIC_ID,
        )

    client.get_topic_board_details.assert_not_called()


def test_supabase_backend_uses_injected_permanent_registry_not_global_settings(
    configured_settings, monkeypatch
):
    monkeypatch.setattr(settings, "catenda_project_id", OTHER_PROJECT_ID)
    registry = InMemoryCatendaProjectConfigRepository(
        [
            CatendaProjectConfig(
                internal_project_id="internal-project-2",
                catenda_project_id=PROJECT_ID,
                topic_board_ids=[BOARD_ID],
                library_id=LIBRARY_ID,
            )
        ]
    )
    client = make_client()

    resolver = build_project_resolver(client, backend="supabase", registry=registry)
    context = resolver.resolve(
        project_id=PROJECT_ID,
        board_id=BOARD_ID,
        topic_id=TOPIC_ID,
    )

    assert context.internal_project_id == "internal-project-2"
    assert context.library_id == LIBRARY_ID


def test_selected_supabase_backend_fails_closed_when_registry_cannot_start(
    configured_settings, monkeypatch
):
    monkeypatch.setattr(
        "services.catenda_project_resolver_factory.SupabaseCatendaProjectConfigRepository",
        lambda: (_ for _ in ()).throw(RuntimeError("Supabase unavailable")),
    )

    with pytest.raises(ProjectResolverConfigurationError):
        build_project_resolver(make_client(), backend="supabase")


def test_unknown_registry_backend_fails_closed(configured_settings):
    with pytest.raises(ProjectResolverConfigurationError):
        build_project_resolver(make_client(), backend="not-a-backend")
