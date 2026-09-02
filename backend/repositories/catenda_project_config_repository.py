"""
Repository for CatendaProjectConfig.

Definerer et injiserbart grensesnitt (Protocol) som resolveren avhenger av, samt
et in-memory-repository for enhetstester og lokal utvikling.

I trinn 2B foreslås permanent lagring i dedikerte, normaliserte tabeller.
Dette grensesnittet er utformet slik at en slik implementasjon kan erstatte
InMemoryCatendaProjectConfigRepository uten å endre resolver eller webhook-flyt.
"""

from typing import Protocol, runtime_checkable

from models.catenda_project_config import CatendaProjectConfig


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
