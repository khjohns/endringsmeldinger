"""
Legacy-adapter for dagens ene .env-baserte Catenda-konfigurasjon.

Bygger en CatendaProjectResolver fra de globale Settings-verdiene
(settings.catenda_project_id, catenda_topic_board_id, catenda_library_id,
catenda_folder_id) og en catenda-client.

Dette er en overgangsløsning som bare godtar EKSATT samsvar mellom den
konfigurerte prosjekt-/board-konfigurasjonen og payloaden. Ved ethvert avvik
feiler den lukket (via resolverens typede feil) istedenfor å falle tilbake til
globale verdier.

Bruk intern prosjekt-ID "oslobygg" (appens egen), aldri en Catenda-ID, som
intern ID. Når permanent lagring (trinn 2B) gjøres, erstattes denne fabrikken
med et register som leser fra dedikerte tabeller.
"""

from collections.abc import Callable

from core.config import settings
from models.catenda_project_config import CatendaProjectConfig
from repositories.catenda_project_config_repository import (
    InMemoryCatendaProjectConfigRepository,
)
from services.catenda_project_resolver import CatendaProjectResolver

# Appens egen interne prosjekt-ID for dagens enkelt-prosjekt-oppsett.
LEGACY_INTERNAL_PROJECT_ID = "oslobygg"


class LegacyProjectResolverConfigurationError(RuntimeError):
    """Legacy project routing cannot be constructed safely."""


def _make_bimsync_lookup(catenda_client) -> Callable[[str], str | None]:
    """Bygg en board-bimsync_project_id-oppslag knyttet til catenda-client.

    Dagens catenda-client krever at topic_board_id settes på klienten før
    get_topic_board_details(). Vi muterer kun for oppslaget og henter
    bimsync_project_id fra responsen.
    """

    if catenda_client is None:
        raise LegacyProjectResolverConfigurationError(
            "Catenda-klient mangler; prosjektresolver kan ikke bygges"
        )

    def lookup(board_id: str) -> str | None:
        catenda_client.topic_board_id = board_id
        details = catenda_client.get_topic_board_details()
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
