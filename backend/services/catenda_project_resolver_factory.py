"""Factories for Catenda project resolvers.

The legacy adapter builds one resolver from the current single-project .env
configuration and remains the backwards-compatible local default.
The permanent Supabase registry is fail-closed when selected.

Bygger en CatendaProjectResolver fra de globale Settings-verdiene
(settings.catenda_project_id, catenda_topic_board_id, catenda_library_id,
catenda_folder_id) og en catenda-client.

Dette er en overgangsløsning som bare godtar EKSATT samsvar mellom den
konfigurerte prosjekt-/board-konfigurasjonen og payloaden. Ved ethvert avvik
feiler den lukket (via resolverens typede feil) istedenfor å falle tilbake til
globale verdier.

Bruk intern prosjekt-ID "oslobygg" (appens egen), aldri en Catenda-ID, som
intern ID.
"""

from collections.abc import Callable

from core.config import settings
from models.catenda_project_config import CatendaProjectConfig
from repositories.catenda_project_config_repository import (
    CatendaProjectConfigRepository,
    InMemoryCatendaProjectConfigRepository,
    SupabaseCatendaProjectConfigRepository,
)
from services.catenda_project_resolver import CatendaProjectResolver

# Appens egen interne prosjekt-ID for dagens enkelt-prosjekt-oppsett.
LEGACY_INTERNAL_PROJECT_ID = "oslobygg"


class LegacyProjectResolverConfigurationError(RuntimeError):
    """Legacy project routing cannot be constructed safely."""


class ProjectResolverConfigurationError(RuntimeError):
    """The selected project-registry backend cannot be constructed safely."""


def _make_bimsync_lookup(catenda_client) -> Callable[[str], str | None]:
    """Bygg et eksplisitt board-bimsync_project_id-oppslag."""

    if catenda_client is None:
        raise LegacyProjectResolverConfigurationError(
            "Catenda-klient mangler; prosjektresolver kan ikke bygges"
        )

    def lookup(board_id: str) -> str | None:
        details = catenda_client.get_topic_board_details(board_id)
        if not details:
            return None
        return details.get("bimsync_project_id")

    return lookup


def build_legacy_project_resolver(catenda_client) -> CatendaProjectResolver:
    """Bygg en resolver kun fra dagens globale Settings + catenda-client.

    Krever prosjekt-, board- og library-ID. Mangelfull konfigurasjon avvises
    under konstruksjon, slik at runtime aldri kan falle tilbake til globale
    prosjektverdier.
    """
    if catenda_client is None:
        raise LegacyProjectResolverConfigurationError(
            "Catenda-klient mangler; prosjektresolver kan ikke bygges"
        )

    required = {
        "CATENDA_PROJECT_ID": settings.catenda_project_id,
        "CATENDA_TOPIC_BOARD_ID": settings.catenda_topic_board_id,
        "CATENDA_LIBRARY_ID": settings.catenda_library_id,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise LegacyProjectResolverConfigurationError(
            "Mangler obligatorisk Catenda-prosjektkonfigurasjon: "
            + ", ".join(missing)
        )

    config = CatendaProjectConfig(
        internal_project_id=LEGACY_INTERNAL_PROJECT_ID,
        catenda_project_id=settings.catenda_project_id,
        topic_board_ids=[settings.catenda_topic_board_id],
        library_id=settings.catenda_library_id,
        folder_id=settings.catenda_folder_id or None,
    )
    register = InMemoryCatendaProjectConfigRepository([config])

    return CatendaProjectResolver(register, _make_bimsync_lookup(catenda_client))


def build_project_resolver(
    catenda_client,
    *,
    backend: str | None = None,
    registry: CatendaProjectConfigRepository | None = None,
) -> CatendaProjectResolver:
    """Build the selected routing backend without an implicit fallback.

    ``legacy`` is the local CSV-development choice. ``supabase`` reads the
    durable multi-project registry. If Supabase is selected but unavailable,
    construction raises; global Catenda project IDs are never used as a rescue
    path. ``registry`` is injectable for wiring tests.
    """
    selected = (backend or settings.catenda_project_registry_backend).strip().lower()
    if selected == "legacy":
        if registry is not None:
            raise ProjectResolverConfigurationError(
                "Legacy project resolver støtter ikke et eksternt register"
            )
        return build_legacy_project_resolver(catenda_client)

    if selected == "supabase":
        if catenda_client is None:
            raise ProjectResolverConfigurationError(
                "Catenda-klient mangler; prosjektresolver kan ikke bygges"
            )
        try:
            permanent_registry = (
                registry
                if registry is not None
                else SupabaseCatendaProjectConfigRepository()
            )
        except Exception as exc:
            raise ProjectResolverConfigurationError(
                "Kunne ikke opprette Supabase Catenda-prosjektregister"
            ) from exc
        return CatendaProjectResolver(
            permanent_registry,
            _make_bimsync_lookup(catenda_client),
        )

    raise ProjectResolverConfigurationError(
        "Ukjent CATENDA_PROJECT_REGISTRY_BACKEND: " + selected
    )
