"""Lager for interne notater, utenfor hendelsesloggen (MS-05).

`hendelse` er append-only og skal få `REVOKE UPDATE, DELETE`. Notatene ligger
ikke der, nettopp for at en oppbevaringsregel skal kunne gjennomføres på dem.
Derfor har dette lageret en `slett` som hendelseslageret ikke har og ikke skal
ha.

Prosjektet er et påkrevd argument på hvert lese- og slettepunkt, ikke et filter
kalleren kan glemme: `sak_id` alene ville latt en sak i ett prosjekt leses fra
et annet.
"""

import fcntl
import json
import os
from abc import ABC, abstractmethod
from pathlib import Path

from models.notat import Notat


class NotatRepository(ABC):
    """Interne notater for én sak."""

    @abstractmethod
    def lagre(self, notat: Notat) -> Notat:
        """Lagre notatet. Returnerer notatet slik det ble lagret."""

    @abstractmethod
    def for_sak(self, sak_id: str, prosjekt_id: str) -> list[Notat]:
        """Alle notater på saken, eldste først. Tom liste om saken ikke har noen."""

    @abstractmethod
    def hent(self, notat_id: str, prosjekt_id: str) -> Notat | None:
        """Ett notat, eller None når det ikke finnes i dette prosjektet."""

    @abstractmethod
    def slett(self, notat_id: str, prosjekt_id: str) -> bool:
        """Slett notatet. True når en rad ble fjernet."""


class JsonFileNotatRepository(NotatRepository):
    """Notatlager på fil, for standardbackenden `json`.

    Én fil per sak, med samme låsing som hendelsesfilene: notatene er ikke
    versjonert, men to samtidige skrivinger på samme sak skal ikke kunne
    overskrive hverandre.
    """

    def __init__(self, base_path: str = "koe_data/notater"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _fil(self, sak_id: str) -> Path:
        trygg = sak_id.replace("/", "_").replace("\\", "_")
        return self.base_path / f"{trygg}.json"

    def _les(self, sak_id: str) -> list[dict]:
        fil = self._fil(sak_id)
        if not fil.exists():
            return []
        with open(fil, encoding="utf-8") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            try:
                return json.load(f)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

    def _skriv(self, sak_id: str, rader: list[dict]) -> None:
        fil = self._fil(sak_id)
        midlertidig = fil.with_suffix(".tmp")
        with open(midlertidig, "w", encoding="utf-8") as f:
            json.dump(rader, f, ensure_ascii=False, indent=2, default=str)
            f.flush()
            os.fsync(f.fileno())
        midlertidig.rename(fil)

    def lagre(self, notat: Notat) -> Notat:
        rader = self._les(notat.sak_id)
        rader.append(notat.til_rad())
        self._skriv(notat.sak_id, rader)
        return notat

    def for_sak(self, sak_id: str, prosjekt_id: str) -> list[Notat]:
        notater = [
            Notat.fra_rad(rad)
            for rad in self._les(sak_id)
            if rad.get("prosjekt_id") == prosjekt_id
        ]
        return sorted(notater, key=lambda n: n.opprettet)

    def hent(self, notat_id: str, prosjekt_id: str) -> Notat | None:
        for rad in self._les_alle():
            if rad.get("notat_id") == notat_id and rad.get("prosjekt_id") == prosjekt_id:
                return Notat.fra_rad(rad)
        return None

    def _les_alle(self) -> list[dict]:
        rader: list[dict] = []
        for fil in self.base_path.glob("*.json"):
            rader.extend(self._les(fil.stem))
        return rader

    def slett(self, notat_id: str, prosjekt_id: str) -> bool:
        notat = self.hent(notat_id, prosjekt_id)
        if notat is None:
            return False
        rader = [
            rad for rad in self._les(notat.sak_id) if rad.get("notat_id") != notat_id
        ]
        self._skriv(notat.sak_id, rader)
        return True


def create_notat_repository(backend: str | None = None, **kwargs) -> NotatRepository:
    """Notatlager etter `EVENT_STORE_BACKEND`, samme bryter som hendelsene.

    Notatene følger hendelsene med vilje: en installasjon som har journalen i
    Supabase og notatene på fil ville hatt tidslinjen i to lagre med ulik
    levetid.
    """
    if backend is None:
        backend = os.environ.get("EVENT_STORE_BACKEND", "json")

    if backend == "json":
        return JsonFileNotatRepository(**kwargs)

    if backend == "supabase":
        from .supabase_notat_repository import SupabaseNotatRepository

        return SupabaseNotatRepository(**kwargs)

    raise ValueError(f"Ukjent notatlager: {backend}")
