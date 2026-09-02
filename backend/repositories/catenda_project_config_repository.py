"""Repositories for CatendaProjectConfig.

The permanent Supabase implementation returns a complete project configuration
plus its *active* boards. A failed database lookup is distinct from an unknown
project, so the resolver can mark outages as retryable without any fallback.
"""

import os
from typing import Protocol, runtime_checkable

from models.catenda_project_config import CatendaProjectConfig


class ProjectRegistryRepositoryError(RuntimeError):
    """The project registry could not be queried (usually transient)."""


class ProjectRegistryConfigurationError(RuntimeError):
    """A registry row violates the application's required configuration."""


@runtime_checkable
class CatendaProjectConfigRepository(Protocol):
    """Grensesnitt for oppslag av CatendaProjectConfig."""

    def get_by_catenda_project(self, catenda_project_id: str) -> CatendaProjectConfig | None:
        """Slå opp konfigurasjon for et fysisk Catenda-prosjekt.

        Kan returnere None hvis prosjektet ikke er registrert.
        """
        ...


class InMemoryCatendaProjectConfigRepository:
    """In-memory implementasjon for enhetstester og lokal utvikling.

    Indekseres på catenda_project_id. Normaliserer nøkkel- og board-ID-er slik
    at oppslag er robust mot kompakt/dashed GUID-format.
    """

    def __init__(self, configs: list[CatendaProjectConfig] | None = None):
        self._by_catenda_project: dict[str, CatendaProjectConfig] = {}
        for config in configs or []:
            self.upsert(config)

    def upsert(self, config: CatendaProjectConfig) -> None:
        """Legg til eller erstatt en konfigurasjon."""
        self._by_catenda_project[self._normalise(config.catenda_project_id)] = config

    def get_by_catenda_project(self, catenda_project_id: str) -> CatendaProjectConfig | None:
        return self._by_catenda_project.get(self._normalise(catenda_project_id))

    @staticmethod
    def _normalise(guid: str) -> str:
        # Config-modellen og resolveren validerer UUID-er før repository-oppslag.
        return guid.replace("-", "").lower() if guid else guid


class SupabaseCatendaProjectConfigRepository:
    """Read active Catenda routing configuration from Supabase.

    ``client`` is injectable, keeping unit tests entirely offline. The
    repository caches neither hits nor misses so project/board activation is
    reflected without a backend restart.
    """

    PROJECT_TABLE = "catenda_project_configs"
    BOARD_TABLE = "catenda_topic_board_configs"

    def __init__(self, client=None, url: str | None = None, key: str | None = None):
        if client is None:
            from lib.supabase.client import create_supabase_client

            # This backend-only registry is protected by service-role-only RLS.
            # Resolve its key here rather than elevating the shared Supabase
            # client factory used by unrelated application flows.
            service_key = (
                key
                or os.environ.get("SUPABASE_SECRET_KEY")
                or os.environ.get("SUPABASE_KEY")
            )
            client = create_supabase_client(url=url, key=service_key)
        self.client = client

    def get_by_catenda_project(self, catenda_project_id: str) -> CatendaProjectConfig | None:
        """Return the project and its active boards, or ``None`` if inactive/unknown."""
        try:
            project_result = (
                self.client.table(self.PROJECT_TABLE)
                .select("internal_project_id, catenda_project_id, library_id, folder_id")
                .eq("catenda_project_id", catenda_project_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise ProjectRegistryRepositoryError(
                "Kunne ikke lese Catenda-prosjektregisteret"
            ) from exc

        rows = getattr(project_result, "data", None) or []
        if not rows:
            return None
        row = rows[0]

        try:
            boards_result = (
                self.client.table(self.BOARD_TABLE)
                .select("topic_board_id")
                .eq("internal_project_id", row["internal_project_id"])
                .eq("is_active", True)
                .execute()
            )
        except Exception as exc:
            raise ProjectRegistryRepositoryError(
                "Kunne ikke lese topic boards fra Catenda-prosjektregisteret"
            ) from exc

        try:
            return CatendaProjectConfig(
                internal_project_id=row["internal_project_id"],
                catenda_project_id=row["catenda_project_id"],
                topic_board_ids=[
                    board["topic_board_id"]
                    for board in (getattr(boards_result, "data", None) or [])
                ],
                library_id=row["library_id"],
                folder_id=row.get("folder_id"),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ProjectRegistryConfigurationError(
                "Ugyldig data i Catenda-prosjektregisteret"
            ) from exc
