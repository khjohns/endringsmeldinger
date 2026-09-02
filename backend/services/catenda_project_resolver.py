"""
CatendaProjectResolver — prosjektruting av Catenda-webhook-events.

Trinn 2A: erstatter webhook-tjenestens globale prosjektutledning med en dedikert
resolver som entydig kobler en webhook-payload til ett internt prosjekt.

Resolved-context (ResolvedProjectContext) som webhook-tjenesten skal motta:
  - internal_project_id  -> appens prosjekt_id
  - catenda_project_id   -> fysisk Catenda-prosjekt (brukes i API-kall/metadata)
  - board_id / topic_id  -> payloadens (eller boardets) normaliserte GUID-er

Resolveren bestemmer IKKE HTTP-status. Den kaster typede feil som ruten kan
mappe til retry/parkering i inbox-designet (trinn 3).
"""

from collections.abc import Callable
from dataclasses import dataclass
from uuid import UUID

from models.catenda_project_config import CatendaProjectConfig
from repositories.catenda_project_config_repository import (
    CatendaProjectConfigRepository,
    ProjectRegistryConfigurationError,
    ProjectRegistryRepositoryError,
)


class ProjectResolutionError(Exception):
    """Base for alle prosjektresolver-feil med stabil tjenestekontrakt."""

    error_code = "project_resolution_error"
    retryable = False


class MissingInputIdError(ProjectResolutionError):
    """Obligatorisk ID mangler i payload."""

    error_code = "missing_input_id"


class InvalidInputIdError(ProjectResolutionError):
    """En ID i payloaden er ikke en gyldig UUID."""

    error_code = "invalid_input_id"


class UnknownProjectError(ProjectResolutionError):
    """Ingen konfigurasjon funnet for det fysiske Catenda-prosjektet."""

    error_code = "unknown_project"


class UnknownBoardError(ProjectResolutionError):
    """Topic boardet hører ikke til det resolvede prosjektet."""

    error_code = "unknown_board"


class ProjectBoardMismatchError(ProjectResolutionError):
    """payload.project.id stemmer ikke med boardets bimsync_project_id."""

    error_code = "project_board_mismatch"


class TemporaryCatendaError(ProjectResolutionError):
    """Midlertidig Catenda-feil under board-oppslag. Skal kunne retries."""

    error_code = "temporary_catenda_error"
    retryable = True


class TemporaryProjectRegistryError(ProjectResolutionError):
    """Midlertidig feil ved oppslag i det permanente prosjektregisteret."""

    error_code = "temporary_project_registry_error"
    retryable = True


class InvalidProjectRegistryConfigError(ProjectResolutionError):
    """Permanent registerdata er ufullstendige eller ugyldige."""

    error_code = "invalid_project_registry_config"


@dataclass(frozen=True)
class ResolvedProjectContext:
    """Resultatet av prosjektrutingen, levert til webhook-tjenesten."""

    internal_project_id: str
    catenda_project_id: str
    board_id: str
    topic_id: str
    library_id: str
    folder_id: str | None = None


def normalise_guid(guid: str) -> str:
    """Validate and normalise a compact or dashed GUID."""
    return str(UUID(guid.strip()))


def _normalise_payload_guid(value: str, field_name: str) -> str:
    try:
        return normalise_guid(value)
    except (ValueError, AttributeError) as exc:
        raise InvalidInputIdError(
            f"{field_name} er ikke en gyldig UUID"
        ) from exc


class CatendaProjectResolver:
    """Resolved et webhook-payload til et internt prosjekt.

    Avhengigheter (begge injiserbare for tester):
      - register: CatendaProjectConfigRepository
      - bimsync_project_id_lookup: gir boardets bimsync_project_id (Catenda API)
    """

    def __init__(
        self,
        register: CatendaProjectConfigRepository,
        bimsync_project_id_lookup: Callable[[str], str | None],
    ):
        self._register = register
        self._bimsync_lookup = bimsync_project_id_lookup

    def resolve(
        self,
        *,
        project_id: str | None,
        board_id: str | None,
        topic_id: str | None,
    ) -> ResolvedProjectContext:
        """Resolved prosjektruting for en webhook-payload.

        Leser project.id og issue.boardId (og topic-id), normaliserer GUID-ene,
        slår opp prosjektkonfigurasjonen og kryssjekker boardets
        bimsync_project_id mot project.id før noen sideeffekter utføres.
        """
        if not project_id:
            raise MissingInputIdError("project.id mangler i payload")
        if not board_id:
            raise MissingInputIdError("issue.boardId mangler i payload")
        if not topic_id:
            raise MissingInputIdError("issue.id mangler i payload")

        normalised_project_id = _normalise_payload_guid(project_id, "project.id")
        normalised_board_id = _normalise_payload_guid(board_id, "issue.boardId")
        normalised_topic_id = _normalise_payload_guid(topic_id, "issue.id")

        try:
            config = self._register.get_by_catenda_project(normalised_project_id)
        except ProjectRegistryRepositoryError as exc:
            raise TemporaryProjectRegistryError(
                "Midlertidig feil ved oppslag i Catenda-prosjektregisteret"
            ) from exc
        except ProjectRegistryConfigurationError as exc:
            raise InvalidProjectRegistryConfigError(
                "Ugyldig konfigurasjon i Catenda-prosjektregisteret"
            ) from exc
        if config is None:
            raise UnknownProjectError(
                f"Ingen prosjektkonfigurasjon for catenda_project_id "
                f"{normalised_project_id}"
            )

        # Avvis ukjente boards lokalt før et Catenda-kall. Dette er både
        # fail-closed-ruting og unngår unødvendige eksterne oppslag.
        if not self._is_board_allowed(config, normalised_board_id):
            raise UnknownBoardError(
                f"Board {normalised_board_id} hører ikke til prosjekt "
                f"{config.internal_project_id}"
            )

        # Kryssjekk: project.id må stemme med boardets bimsync_project_id.
        # Midlertidige Catenda-feil under board-oppslag er retriable.
        try:
            board_bimsync_project_id = self._bimsync_lookup(normalised_board_id)
        except Exception as e:
            raise TemporaryCatendaError(
                f"Midlertidig Catenda-feil ved board-oppslag for {normalised_board_id}: {e}"
            ) from e

        if not board_bimsync_project_id:
            raise UnknownBoardError(
                f"Kunne ikke hente board-detaljer for {normalised_board_id}"
            )

        # Config.data catenda_project_id og boardets bimsync_project_id skal være
        # samme fysiske prosjekt som payload.project.id.
        try:
            board_project = normalise_guid(board_bimsync_project_id)
        except (ValueError, AttributeError) as exc:
            raise TemporaryCatendaError(
                f"Catenda returnerte ugyldig bimsync_project_id for board "
                f"{normalised_board_id}"
            ) from exc

        config_project = config.catenda_project_id
        payload_project = normalised_project_id

        if config_project != payload_project:
            raise UnknownProjectError(
                f"Payload project.id {normalised_project_id} peker på et annet "
                f"prosjekt enn konfigurert catenda_project_id {config.catenda_project_id}"
            )

        if board_project != payload_project:
            raise ProjectBoardMismatchError(
                f"Boardet {normalised_board_id} tilhører bimsync_prosjektet "
                f"{board_bimsync_project_id}, men payload.project.id er "
                f"{normalised_project_id}"
            )

        return ResolvedProjectContext(
            internal_project_id=config.internal_project_id,
            catenda_project_id=normalised_project_id,
            board_id=normalised_board_id,
            topic_id=normalised_topic_id,
            library_id=config.library_id,
            folder_id=config.folder_id,
        )

    @staticmethod
    def _is_board_allowed(config: CatendaProjectConfig, board_id: str) -> bool:
        return board_id in config.topic_board_ids
