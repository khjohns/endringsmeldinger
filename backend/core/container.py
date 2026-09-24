"""
Dependency Injection Container for KOE Backend.

Sentralisert håndtering av alle avhengigheter. Erstatter hardkodede imports
og globale singletons med lazy-loaded, testbare komponenter.

Fordeler:
- Testbarhet: Kan injisere mock-objekter
- Lazy loading: Opprettes kun ved behov
- Sentralisert: Ett sted å konfigurere alle avhengigheter
- Azure-klar: Kan enkelt bytte implementasjoner

Usage:
    # Flask app
    container = Container(settings)
    event_repo = container.event_repository
    timeline = container.timeline_service

    # Azure Functions
    container = Container(settings)
    service = container.get_forsering_service()

    # Testing
    container = Container(settings)
    container._event_repo = MockEventRepository()
    service = container.get_forsering_service()  # Bruker mock
"""

import importlib
import threading
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Optional

from core.config import Settings
from core.config import settings as default_settings

if TYPE_CHECKING:
    from core.unit_of_work import TrackingUnitOfWork
    from integrations.catenda import CatendaClient
    from lib.db import Database
    from repositories import EventRepository, SakMetadataRepository
    from repositories.bim_link_repository import BimLinkRepository
    from repositories.membership_repository import SupabaseMembershipRepository
    from repositories.notat_repository import NotatRepository
    from repositories.project_repository import SupabaseProjectRepository
    from services.catenda_service import CatendaService
    from services.endringsordre_service import EndringsordreService
    from services.forsering_service import ForseringService
    from services.timeline_service import TimelineService


# F0b punkt 2: med DATALAG=postgres lager hver property sitt lager fra denne
# tabellen, med `Container.database` som eneste argument. Tråden som konverterer
# et lager, legger til modulen og klassen her navngitt — og ingenting annet
# delt. Fordelingen på trådene (a)–(d) står i
# docs/gjennomforing-f0b-kjernen-2026-09-23.md, avsnitt 7.
POSTGRES_LAGRE: dict[str, tuple[str, str]] = {
    "event_repository": ("repositories.postgres.hendelse", "PostgresEventRepository"),
    "notat_repository": ("repositories.postgres.notat", "PostgresNotatRepository"),
    "metadata_repository": (
        "repositories.postgres.sak_metadata",
        "PostgresSakMetadataRepository",
    ),
    "relation_repository": (
        "repositories.postgres.relasjon",
        "PostgresRelationRepository",
    ),
    "bim_link_repository": ("repositories.postgres.bim", "PostgresBimLinkRepository"),
    "auth_repository": ("repositories.postgres.identitet", "PostgresAuthRepository"),
    "project_repository": (
        "repositories.postgres.prosjekt",
        "PostgresProjectRepository",
    ),
    "membership_repository": (
        "repositories.postgres.medlemskap",
        "PostgresMembershipRepository",
    ),
    "catenda_config_repository": (
        "repositories.postgres.catenda_konfig",
        "PostgresCatendaProjectConfigRepository",
    ),
}


class LagerIkkeKonvertert(RuntimeError):
    pass


@dataclass
class Container:
    """
    Dependency injection container.

    Alle avhengigheter lazy-loades ved første tilgang.
    Kan overstyres for testing ved å sette private felter direkte.

    Attributes:
        config: Application settings (påkrevd)

    Properties (lazy-loaded):
        event_repository: EventRepository instans
        notat_repository: NotatRepository instans (interne notater, MS-05)
        metadata_repository: SakMetadataRepository instans
        timeline_service: TimelineService instans
        catenda_service: CatendaService instans
        catenda_client: CatendaClient instans

    Factory methods:
        get_forsering_service(): Ny ForseringService med avhengigheter
        get_endringsordre_service(): Ny EndringsordreService med avhengigheter
    """

    config: Settings = field(default_factory=lambda: default_settings)

    # Private cache for lazy-loaded instances
    _database: Optional["Database"] = field(default=None, repr=False)
    _database_laas: threading.Lock = field(
        default_factory=threading.Lock, repr=False, compare=False
    )
    _event_repo: Optional["EventRepository"] = field(default=None, repr=False)
    _metadata_repo: Optional["SakMetadataRepository"] = field(default=None, repr=False)
    _project_repo: Optional["SupabaseProjectRepository"] = field(default=None, repr=False)
    _membership_repo: Optional["SupabaseMembershipRepository"] = field(default=None, repr=False)
    _bim_link_repo: Optional["BimLinkRepository"] = field(default=None, repr=False)
    _notat_repo: Optional["NotatRepository"] = field(default=None, repr=False)
    _timeline_service: Optional["TimelineService"] = field(default=None, repr=False)
    _catenda_service: Optional["CatendaService"] = field(default=None, repr=False)
    _catenda_client: Optional["CatendaClient"] = field(default=None, repr=False)

    # -------------------------------------------------------------------------
    # Database (direkte tilkobling, F0b)
    # -------------------------------------------------------------------------

    @property
    def database(self) -> "Database":
        """Pool mot DATABASE_URL, opprettet ved første bruk.

        Uten DATABASE_URL kastes `DatabaseIkkeKonfigurert`. Repositoriene over
        direkte tilkobling tar denne som eneste avhengighet.
        """
        if self._database is None:
            with self._database_laas:
                if self._database is None:
                    from lib.db import opprett_database

                    self._database = opprett_database(self.config)
        return self._database

    @property
    def bruker_postgres(self) -> bool:
        return self.config.datalag == "postgres"

    def _postgres_lager(self, navn: str) -> Any:
        modul, klasse = POSTGRES_LAGRE[navn]
        try:
            lager = getattr(importlib.import_module(modul), klasse)
        except ModuleNotFoundError as feil:
            if feil.name != modul:
                raise
            raise LagerIkkeKonvertert(
                f"{navn} er ikke konvertert til PostgreSQL ennå ({modul})"
            ) from None
        return lager(self.database)

    # -------------------------------------------------------------------------
    # Repositories
    # -------------------------------------------------------------------------

    @property
    def event_repository(self) -> "EventRepository":
        """
        Lazy-load EventRepository basert på config.

        Støtter backends:
        - "json": JsonFileEventRepository (lokal utvikling)
        - "supabase": SupabaseEventRepository (dev/test)
        - "azure_sql": AzureSqlEventRepository (fremtidig)
        """
        if self._event_repo is None and self.bruker_postgres:
            self._event_repo = self._postgres_lager("event_repository")
        if self._event_repo is None:
            from repositories import create_event_repository

            self._event_repo = create_event_repository()
        return self._event_repo

    @property
    def notat_repository(self) -> "NotatRepository":
        """Lazy-load NotatRepository — interne notater, utenfor journalen (MS-05).

        Følger samme backend-bryter som hendelsene: `EVENT_STORE_BACKEND`.
        """
        if self._notat_repo is None and self.bruker_postgres:
            self._notat_repo = self._postgres_lager("notat_repository")
        if self._notat_repo is None:
            from repositories import create_notat_repository

            self._notat_repo = create_notat_repository()
        return self._notat_repo

    @property
    def metadata_repository(self) -> "SakMetadataRepository":
        """
        Lazy-load SakMetadataRepository basert på config.

        Støtter backends:
        - "csv": SakMetadataRepository (lokal utvikling)
        - "supabase": SupabaseSakMetadataRepository (dev/test)
        """
        if self._metadata_repo is None and self.bruker_postgres:
            self._metadata_repo = self._postgres_lager("metadata_repository")
        if self._metadata_repo is None:
            from repositories import create_metadata_repository

            self._metadata_repo = create_metadata_repository()
        return self._metadata_repo

    @property
    def project_repository(self) -> "SupabaseProjectRepository":
        """
        Lazy-load ProjectRepository.

        Only supports Supabase backend (projects are a cloud feature).
        """
        if self._project_repo is None and self.bruker_postgres:
            self._project_repo = self._postgres_lager("project_repository")
        if self._project_repo is None:
            from repositories.project_repository import SupabaseProjectRepository

            self._project_repo = SupabaseProjectRepository()
        return self._project_repo

    @property
    def membership_repository(self) -> "SupabaseMembershipRepository":
        """Lazy-load MembershipRepository."""
        if self._membership_repo is None and self.bruker_postgres:
            self._membership_repo = self._postgres_lager("membership_repository")
        if self._membership_repo is None:
            from repositories.membership_repository import SupabaseMembershipRepository

            self._membership_repo = SupabaseMembershipRepository()
        return self._membership_repo

    @property
    def bim_link_repository(self) -> "BimLinkRepository":
        """Lazy-load BimLinkRepository."""
        if self._bim_link_repo is None and self.bruker_postgres:
            self._bim_link_repo = self._postgres_lager("bim_link_repository")
        if self._bim_link_repo is None:
            from repositories.bim_link_repository import BimLinkRepository

            self._bim_link_repo = BimLinkRepository()
        return self._bim_link_repo

    # Tre lagre som i dag lages utenfor containeren, hver gang de brukes. Uten
    # DATALAG=postgres beholdes det: en ny instans per oppslag, som før.

    @property
    def relation_repository(self) -> Any:
        """Relasjonslageret, eller `None` når det ikke finnes (JSON-lageret)."""
        if self.bruker_postgres:
            return self._postgres_lager("relation_repository")
        import os

        if os.environ.get("EVENT_STORE_BACKEND", "json") != "supabase":
            return None
        from repositories import create_relation_repository

        return create_relation_repository()

    @property
    def auth_repository(self) -> Any:
        if self.bruker_postgres:
            return self._postgres_lager("auth_repository")
        from repositories.auth_repository import AuthRepository

        return AuthRepository()

    @property
    def catenda_config_repository(self) -> Any:
        """Det varige Catenda-registeret fra valgt datalag."""
        if self.bruker_postgres:
            return self._postgres_lager("catenda_config_repository")
        from repositories.catenda_project_config_repository import (
            SupabaseCatendaProjectConfigRepository,
        )

        return SupabaseCatendaProjectConfigRepository()

    # -------------------------------------------------------------------------
    # Services
    # -------------------------------------------------------------------------

    @property
    def timeline_service(self) -> "TimelineService":
        """
        Lazy-load TimelineService.

        TimelineService er stateless og har ingen avhengigheter,
        så dette er en enkel instansiering.
        """
        if self._timeline_service is None:
            from services.timeline_service import TimelineService

            self._timeline_service = TimelineService()
        return self._timeline_service

    @property
    def catenda_service(self) -> "CatendaService":
        """
        Lazy-load CatendaService.

        CatendaService bruker environment variables for config.
        """
        if self._catenda_service is None:
            from services.catenda_service import CatendaService

            self._catenda_service = CatendaService()
        return self._catenda_service

    @property
    def catenda_client(self) -> "CatendaClient":
        """
        Lazy-load CatendaClient.

        Bruker access_token fra config hvis tilgjengelig.
        """
        if self._catenda_client is None:
            from integrations.catenda import CatendaClient

            self._catenda_client = CatendaClient(
                client_id=self.config.catenda_client_id,
                client_secret=self.config.catenda_client_secret,
            )
            if self.config.catenda_access_token:
                self._catenda_client.set_access_token(self.config.catenda_access_token)
        return self._catenda_client

    # -------------------------------------------------------------------------
    # Service Factories (for services med flere avhengigheter)
    # -------------------------------------------------------------------------

    def get_forsering_service(self) -> "ForseringService":
        """
        Opprett ForseringService med alle avhengigheter injisert.

        Returns:
            ForseringService med event_repository, timeline_service, catenda_client
        """
        from services.forsering_service import (
            ForseringService,
            _get_relation_repository,
        )

        return ForseringService(
            relation_repository=_get_relation_repository(self),
            catenda_client=self.catenda_client,
            event_repository=self.event_repository,
            timeline_service=self.timeline_service,
        )

    def get_endringsordre_service(self) -> "EndringsordreService":
        """
        Opprett EndringsordreService med alle avhengigheter injisert.

        Returns:
            EndringsordreService med event_repository, timeline_service, catenda_client
        """
        from services.endringsordre_service import (
            EndringsordreService,
            _get_relation_repository,
        )

        return EndringsordreService(
            relation_repository=_get_relation_repository(self),
            catenda_client=self.catenda_client,
            event_repository=self.event_repository,
            timeline_service=self.timeline_service,
            metadata_repository=self.metadata_repository,
        )

    def create_unit_of_work(self) -> "TrackingUnitOfWork":
        """
        Opprett ny Unit of Work for koordinerte repository-operasjoner.

        Bruk som context manager for automatisk commit/rollback:

            with container.create_unit_of_work() as uow:
                uow.metadata.create(metadata)
                uow.events.append(event, expected_version=0)
                # Commit ved exit, rollback ved exception

        Returns:
            TrackingUnitOfWork som wrapper event og metadata repositories
        """
        from core.unit_of_work import TrackingUnitOfWork

        return TrackingUnitOfWork(self)

    # -------------------------------------------------------------------------
    # Utility methods
    # -------------------------------------------------------------------------

    def reset(self) -> None:
        """
        Nullstill alle cached instanser.

        Nyttig for testing eller når config endres runtime.
        """
        with self._database_laas:
            if self._database is not None:
                self._database.lukk()
            self._database = None
        self._event_repo = None
        self._metadata_repo = None
        self._project_repo = None
        self._membership_repo = None
        self._bim_link_repo = None
        self._notat_repo = None
        self._timeline_service = None
        self._catenda_service = None
        self._catenda_client = None

    def __enter__(self) -> "Container":
        """Context manager support."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Cleanup ved context exit."""
        self.reset()


# ---------------------------------------------------------------------------
# Module-level convenience functions
# ---------------------------------------------------------------------------

# Default container instance (kan overstyres i tester)
_default_container: Container | None = None


def get_container() -> Container:
    """
    Hent default container instans.

    Oppretter en ny container med default settings ved første kall.
    Bruk set_container() for å overstyre i tester.

    Returns:
        Container instans
    """
    global _default_container
    if _default_container is None:
        _default_container = Container()
    return _default_container


def set_container(container: Container | None) -> None:
    """
    Sett default container instans.

    Bruk dette i tester for å injisere mock-avhengigheter.

    Args:
        container: Container instans eller None for å resette

    Example:
        # I test
        mock_container = Container(settings)
        mock_container._event_repo = MockEventRepository()
        set_container(mock_container)

        # Etter test
        set_container(None)
    """
    global _default_container
    _default_container = container
