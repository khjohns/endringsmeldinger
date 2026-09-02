"""Tests for the fail-closed legacy Catenda project-resolver factory."""

from unittest.mock import MagicMock

import pytest

from core.config import settings
from services.catenda_project_resolver import (
    ProjectBoardMismatchError,
    UnknownProjectError,
)
from services.catenda_project_resolver_factory import (
    LEGACY_INTERNAL_PROJECT_ID,
    LegacyProjectResolverConfigurationError,
    build_legacy_project_resolver,
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
    assert client.topic_board_id == BOARD_ID
    client.get_topic_board_details.assert_called_once_with()


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
