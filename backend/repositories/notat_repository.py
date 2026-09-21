"""Lager for interne notater, utenfor hendelsesloggen (MS-05).

`hendelse` er append-only og skal få `REVOKE UPDATE, DELETE`. Notatene ligger
ikke der, nettopp for at en oppbevaringsregel skal kunne gjennomføres på dem.
Derfor har dette lageret en `slett` som hendelseslageret ikke har og ikke skal
ha.

Hvert kall tar med seg grensene det skal håndheve — prosjekt, sak, og for
sletting også eieren — framfor å ta dem som filtre kalleren kan glemme. Samme
form som `services/utkast_registry.py`, og av samme grunn: sletting er den ene
destruktive operasjonen her.
"""

import fcntl
import json
import os
from abc import ABC, abstractmethod
from contextlib import contextmanager
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
    def hent(self, sak_id: str, notat_id: str, prosjekt_id: str) -> Notat | None:
        """Ett notat, eller None når det ikke finnes i denne saken og prosjektet."""

    @abstractmethod
    def slett(
        self, sak_id: str, notat_id: str, prosjekt_id: str, aktor_id: str
    ) -> bool:
        """Slett forfatterens eget notat. True når en rad ble fjernet."""


class JsonFileNotatRepository(NotatRepository):
    """Notatlager på fil, for standardbackenden `json`.

    Én fil per sak. Skriving og sletting er les-endre-skriv, så hele
    operasjonen holder en eksklusiv lås: uten den ville to samtidige notater på
    samme sak kunne overskrevet hverandre. Låsen ligger på en egen fil framfor
    på datafila, fordi datafila byttes ut ved `rename` og en lås på den gamle
    inoden ikke stanser noen.
    """

    def __init__(self, base_path: str = "koe_data/notater"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _fil(self, sak_id: str) -> Path:
        trygg = sak_id.replace("/", "_").replace("\\", "_")
        return self.base_path / f"{trygg}.json"

    @contextmanager
    def _laast(self, sak_id: str):
        laasefil = self._fil(sak_id).with_suffix(".lock")
        with open(laasefil, "a+", encoding="utf-8") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

    def _les(self, sak_id: str) -> list[dict]:
        fil = self._fil(sak_id)
        if not fil.exists():
            return []
        with open(fil, encoding="utf-8") as f:
            return json.load(f)

    def _skriv(self, sak_id: str, rader: list[dict]) -> None:
        fil = self._fil(sak_id)
        midlertidig = fil.with_suffix(".tmp")
        with open(midlertidig, "w", encoding="utf-8") as f:
            json.dump(rader, f, ensure_ascii=False, indent=2, default=str)
            f.flush()
            os.fsync(f.fileno())
        midlertidig.rename(fil)

    def lagre(self, notat: Notat) -> Notat:
        with self._laast(notat.sak_id):
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
        return sorted(notater, key=lambda n: (n.opprettet, n.notat_id))

    def hent(self, sak_id: str, notat_id: str, prosjekt_id: str) -> Notat | None:
        for notat in self.for_sak(sak_id, prosjekt_id):
            if notat.notat_id == notat_id:
                return notat
        return None

    def slett(
        self, sak_id: str, notat_id: str, prosjekt_id: str, aktor_id: str
    ) -> bool:
        with self._laast(sak_id):
            rader = self._les(sak_id)
            beholdt = [
                rad
                for rad in rader
                if not (
                    rad.get("notat_id") == notat_id
                    and rad.get("prosjekt_id") == prosjekt_id
                    and rad.get("aktor_id") == aktor_id
                )
            ]
            if len(beholdt) == len(rader):
                return False
            self._skriv(sak_id, beholdt)
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
