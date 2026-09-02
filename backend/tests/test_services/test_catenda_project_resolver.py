"""
Enhetstester for CatendaProjectResolver (trinn 2A).

Dekker:
  - Korrekt resolved kontekst (internal/catenda/board/topic/library)
  - Manglende project.id / boardId / issue.id
  - Ukjent prosjekt (ingen config, eller payload peker på feil catenda_project_id)
  - Board som hører til et annet prosjekt (bimsync_project_id-mismatch)
  - Board som ikke er godkjent for prosjektet
  - Midlertidig Catenda-feil under board-oppslag (retriable)
  - GUID-normalisering (kompakt vs dashed)
"""

import pytest
from pydantic import ValidationError

from models.catenda_project_config import CatendaProjectConfig
from repositories.catenda_project_config_repository import (
    InMemoryCatendaProjectConfigRepository,
)
from services.catenda_project_resolver import (
    CatendaProjectResolver,
    InvalidInputIdError,
    MissingInputIdError,
    ProjectBoardMismatchError,
    TemporaryCatendaError,
    UnknownBoardError,
    UnknownProjectError,
    normalise_guid,
)

FIXTURE_PROJECT_ID = "11111111111111111111111111111111"
FIXTURE_PROJECT_ID_DASHED = "11111111-1111-1111-1111-111111111111"
BOARD_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
TOPIC_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"
LIBRARY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
FOLDER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


def make_config(
    internal="internal-a",
    catenda=FIXTURE_PROJECT_ID,
    boards=None,
    library=LIBRARY_ID,
    folder=None,
):
    return CatendaProjectConfig(
        internal_project_id=internal,
        catenda_project_id=catenda,
        topic_board_ids=[BOARD_ID] if boards is None else boards,
        library_id=library,
        folder_id=folder,
    )


def make_resolver(configs, bimsync_by_board=None, raise_on=None):
    bimsync_by_board = bimsync_by_board or {}
    normalized_lookup = {
        key.replace("-", "").lower(): value for key, value in bimsync_by_board.items()
    }
    register = InMemoryCatendaProjectConfigRepository(configs)

    def lookup(board_id: str) -> str | None:
        if raise_on and board_id in raise_on:
            raise RuntimeError("Catenda API nede")
        return normalized_lookup.get(board_id.replace("-", "").lower())

    return CatendaProjectResolver(register, lookup)


class TestNormaliseGuid:
    def test_compact_guid_adds_dashes(self):
        assert (
            normalise_guid("cccccccccccccccccccccccccccccccc")
            == "cccccccc-cccc-cccc-cccc-cccccccccccc"
        )

    def test_dashed_guid_preserved(self):
        assert (
            normalise_guid("cccccccc-cccc-cccc-cccc-cccccccccccc")
            == "cccccccc-cccc-cccc-cccc-cccccccccccc"
        )

    def test_uppercase_guid_is_lowercased(self):
        assert normalise_guid(BOARD_ID.upper()) == BOARD_ID

    def test_invalid_guid_is_rejected(self):
        with pytest.raises(ValueError):
            normalise_guid("aabbccddeeff")


class TestProjectConfigValidation:
    def test_normalises_all_external_ids(self):
        config = make_config(
            catenda=FIXTURE_PROJECT_ID.upper(),
            boards=[BOARD_ID.replace("-", "").upper()],
            library=LIBRARY_ID.replace("-", "").upper(),
            folder=FOLDER_ID.replace("-", "").upper(),
        )

        assert config.catenda_project_id == FIXTURE_PROJECT_ID_DASHED
        assert config.topic_board_ids == [BOARD_ID]
        assert config.library_id == LIBRARY_ID
        assert config.folder_id == FOLDER_ID

    @pytest.mark.parametrize(
        ("overrides", "field_name"),
        [
            ({"internal": "  "}, "internal_project_id"),
            ({"catenda": "not-a-uuid"}, "catenda_project_id"),
            ({"boards": []}, "topic_board_ids"),
            ({"boards": [BOARD_ID, BOARD_ID.replace("-", "")]}, "topic_board_ids"),
            ({"library": "not-a-uuid"}, "library_id"),
            ({"folder": "not-a-uuid"}, "folder_id"),
        ],
    )
    def test_invalid_config_is_rejected(self, overrides, field_name):
        with pytest.raises(ValidationError) as exc_info:
            make_config(**overrides)
        assert field_name in str(exc_info.value)


class TestResolveHappyPath:
    def test_returns_resolved_context(self):
        resolver = make_resolver(
            [make_config()],
            bimsync_by_board={
                BOARD_ID: FIXTURE_PROJECT_ID,
            },
        )
        ctx = resolver.resolve(
            project_id=FIXTURE_PROJECT_ID,
            board_id=BOARD_ID,
            topic_id=TOPIC_ID,
        )
        assert ctx.internal_project_id == "internal-a"
        assert ctx.catenda_project_id == FIXTURE_PROJECT_ID_DASHED
        assert ctx.board_id == BOARD_ID
        assert ctx.topic_id == TOPIC_ID
        assert ctx.library_id == LIBRARY_ID
        assert ctx.folder_id is None

    def test_accepts_compact_guids_and_normalises(self):
        resolver = make_resolver(
            [make_config()],
            bimsync_by_board={BOARD_ID: FIXTURE_PROJECT_ID},
        )
        ctx = resolver.resolve(
            project_id=FIXTURE_PROJECT_ID.replace("-", ""),
            board_id=BOARD_ID.replace("-", ""),
            topic_id=TOPIC_ID.replace("-", ""),
        )
        assert ctx.catenda_project_id == FIXTURE_PROJECT_ID_DASHED
        assert ctx.board_id == BOARD_ID
        assert ctx.topic_id == TOPIC_ID

    def test_carries_optional_folder_id(self):
        resolver = make_resolver(
            [make_config(folder=FOLDER_ID)],
            bimsync_by_board={BOARD_ID: FIXTURE_PROJECT_ID},
        )
        ctx = resolver.resolve(
            project_id=FIXTURE_PROJECT_ID, board_id=BOARD_ID, topic_id=TOPIC_ID
        )
        assert ctx.folder_id == FOLDER_ID


class TestResolveMissingIds:
    @pytest.fixture
    def resolver(self):
        return make_resolver(
            [make_config()], bimsync_by_board={BOARD_ID: FIXTURE_PROJECT_ID}
        )

    def test_missing_project_id(self, resolver):
        with pytest.raises(MissingInputIdError):
            resolver.resolve(project_id=None, board_id=BOARD_ID, topic_id=TOPIC_ID)

    def test_missing_board_id(self, resolver):
        with pytest.raises(MissingInputIdError):
            resolver.resolve(
                project_id=FIXTURE_PROJECT_ID, board_id=None, topic_id=TOPIC_ID
            )

    def test_missing_topic_id(self, resolver):
        with pytest.raises(MissingInputIdError):
            resolver.resolve(
                project_id=FIXTURE_PROJECT_ID, board_id=BOARD_ID, topic_id=None
            )


class TestResolveInvalidIds:
    @pytest.fixture
    def resolver(self):
        return make_resolver(
            [make_config()], bimsync_by_board={BOARD_ID: FIXTURE_PROJECT_ID}
        )

    @pytest.mark.parametrize(
        ("field", "expected_name"),
        [
            ("project_id", "project.id"),
            ("board_id", "issue.boardId"),
            ("topic_id", "issue.id"),
        ],
    )
    def test_invalid_payload_id(self, resolver, field, expected_name):
        values = {
            "project_id": FIXTURE_PROJECT_ID,
            "board_id": BOARD_ID,
            "topic_id": TOPIC_ID,
        }
        values[field] = "x" * 32
        with pytest.raises(InvalidInputIdError) as exc_info:
            resolver.resolve(**values)
        assert expected_name in str(exc_info.value)
        assert exc_info.value.error_code == "invalid_input_id"
        assert exc_info.value.retryable is False


class TestResolveUnknownProject:
    def test_no_config_for_project(self):
        resolver = make_resolver(
            [], bimsync_by_board={BOARD_ID: FIXTURE_PROJECT_ID}
        )
        with pytest.raises(UnknownProjectError):
            resolver.resolve(
                project_id=FIXTURE_PROJECT_ID, board_id=BOARD_ID, topic_id=TOPIC_ID
            )

    def test_payload_points_to_wrong_catenda_project(self):
        # Configens catenda_project_id er FIXTURE_PROJECT_ID, men payloaden
        # sender en annen project.id. Dette er et ukjent prosjekt, ikke et
        # board-mismatch — de kaster ulike feil.
        other_project = "99999999999999999999999999999999"
        resolver = make_resolver(
            [make_config()], bimsync_by_board={BOARD_ID: other_project}
        )
        with pytest.raises(UnknownProjectError):
            resolver.resolve(
                project_id=other_project, board_id=BOARD_ID, topic_id=TOPIC_ID
            )


class TestResolveBoardMembership:
    def test_board_belongs_to_another_project_mismatch(self):
        # Configen er for FIXTURE_PROJECT_ID, og payload.project.id er det.
        # Men boardets bimsync_project_id peker på et annet prosjekt → mismatch.
        other_project = "99999999999999999999999999999999"
        resolver = make_resolver(
            [make_config()], bimsync_by_board={BOARD_ID: other_project}
        )
        with pytest.raises(ProjectBoardMismatchError):
            resolver.resolve(
                project_id=FIXTURE_PROJECT_ID, board_id=BOARD_ID, topic_id=TOPIC_ID
            )

    def test_board_not_in_allowed_list(self):
        other_board = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
        lookup_calls = []
        resolver = make_resolver(
            [make_config()],
            bimsync_by_board={other_board: FIXTURE_PROJECT_ID},
        )
        original_lookup = resolver._bimsync_lookup

        def recording_lookup(board_id):
            lookup_calls.append(board_id)
            return original_lookup(board_id)

        resolver._bimsync_lookup = recording_lookup
        with pytest.raises(UnknownBoardError):
            resolver.resolve(
                project_id=FIXTURE_PROJECT_ID,
                board_id=other_board,
                topic_id=TOPIC_ID,
            )
        assert lookup_calls == []

    def test_cannot_fetch_board_details(self):
        other_board = BOARD_ID
        resolver = make_resolver(
            [make_config()], bimsync_by_board={}
        )
        with pytest.raises(UnknownBoardError):
            resolver.resolve(
                project_id=FIXTURE_PROJECT_ID,
                board_id=other_board,
                topic_id=TOPIC_ID,
            )


class TestResolveTemporaryCatendaError:
    def test_board_lookup_exception_is_retriable(self):
        resolver = make_resolver(
            [make_config()],
            bimsync_by_board={BOARD_ID: FIXTURE_PROJECT_ID},
            raise_on={BOARD_ID},
        )
        with pytest.raises(TemporaryCatendaError):
            resolver.resolve(
                project_id=FIXTURE_PROJECT_ID, board_id=BOARD_ID, topic_id=TOPIC_ID
            )
