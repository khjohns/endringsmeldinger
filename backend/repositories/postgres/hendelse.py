"""Journalen over direkte tilkobling (F0b, løp a). Erstatter
`SupabaseEventRepository`; skjemaet står i
`supabase/migrations/20260920193558_hendelse_tabell.sql`."""

from __future__ import annotations

from datetime import UTC

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from lib import project_context
from lib.db import ConcurrencyError, ConflictError, Database, Kontekst, PermanentError
from lib.project_context import krev_autorisert_prosjekt
from models.cloudevents import CLOUDEVENTS_NAMESPACE
from repositories.event_repository import EventRepository, krev_journalhendelser

VERSJONSSKRANKE = "unique_hendelse_sak_versjon"

_KOLONNER = (
    "specversion",
    "event_id",
    "source",
    "type",
    "time",
    "subject",
    "datacontenttype",
    "actorid",
    "actorrole",
    "actorteam",
    "comment",
    "referstoid",
    "data",
    "prosjekt_id",
    "sak_id",
    "event_type",
    "versjon",
)

_SETT_INN = (
    f"INSERT INTO hendelse ({', '.join(_KOLONNER)})"
    f" VALUES ({', '.join(['%s'] * len(_KOLONNER))})"
)

_LES = (
    "SELECT event_id::text AS event_id, sak_id, event_type, time, actorid,"
    " actorrole, actorteam, data, comment, referstoid::text AS referstoid,"
    " specversion, source, type, subject, datacontenttype, versjon"
    " FROM hendelse"
)


def _lesbart_prosjekt() -> str:
    """Lesing er avgrenset til prosjektet forespørselen er autorisert for."""
    prosjekt = project_context.get_project_id()
    if not prosjekt:
        raise PermanentError("Kan ikke lese hendelser uten autorisert prosjekt.")
    return prosjekt


def _tidspunkt(verdi) -> str:
    """Samme form som Supabase-lageret ga: ISO 8601 i UTC."""
    return verdi.astimezone(UTC).isoformat()


class PostgresEventRepository(EventRepository):
    def __init__(self, database: Database):
        self._db = database

    def _rad(self, event, prosjekt_id: str, versjon: int) -> tuple:
        ce = event.to_cloudevent()
        referanse = ce.get("referstoid")
        verdier = {
            "specversion": ce["specversion"],
            "event_id": str(ce.get("id")),
            "source": ce.get("source"),
            "type": ce.get("type"),
            "time": ce.get("time"),
            "subject": ce["subject"],
            "datacontenttype": ce["datacontenttype"],
            "actorid": ce.get("actorid"),
            "actorrole": ce.get("actorrole"),
            "actorteam": ce.get("actorteam"),
            "comment": ce.get("comment"),
            "referstoid": str(referanse) if referanse else None,
            "data": Jsonb(ce.get("data", {})),
            "prosjekt_id": prosjekt_id,
            "sak_id": event.sak_id,
            "event_type": ce.get("type", "").replace(f"{CLOUDEVENTS_NAMESPACE}.", ""),
            "versjon": versjon,
        }
        return tuple(verdier[k] for k in _KOLONNER)

    @staticmethod
    def _til_hendelse(rad: dict) -> dict:
        return {
            "event_id": rad["event_id"],
            "sak_id": rad["sak_id"],
            "event_type": rad["event_type"],
            "tidsstempel": _tidspunkt(rad["time"]),
            "aktor_id": rad["actorid"],
            "aktor_rolle": rad["actorrole"],
            "aktor_team_id": rad["actorteam"],
            "data": rad["data"],
            "kommentar": rad["comment"],
            "refererer_til_event_id": rad["referstoid"],
            "_cloudevents": {
                "specversion": rad["specversion"],
                "source": rad["source"],
                "type": rad["type"],
                "subject": rad["subject"],
                "datacontenttype": rad["datacontenttype"],
            },
        }

    @staticmethod
    def _versjon(conn: psycopg.Connection, sak_id: str) -> int:
        (versjon,) = conn.execute(
            "SELECT coalesce(max(versjon), 0) FROM hendelse WHERE sak_id = %s",
            (sak_id,),
        ).fetchone()
        return versjon

    def append(self, event, expected_version: int) -> int:
        return self.append_batch([event], expected_version)

    def append_batch(self, events: list, expected_version: int) -> int:
        """Alle eller ingen. Raises: ConcurrencyError ved versjonskonflikt,
        JournalfoeringAvvist for en hendelsestype med eget lager, og
        PermanentError uten autorisert prosjekt."""
        if not events:
            raise ValueError("Kan ikke legge til tom event-liste")

        krev_journalhendelser(events)

        sak_id = events[0].sak_id
        if not all(e.sak_id == sak_id for e in events):
            raise ValueError("Alle events må tilhøre samme sak_id")

        prosjekt_id = krev_autorisert_prosjekt("hendelse")
        rader = [
            self._rad(event, prosjekt_id, expected_version + i + 1)
            for i, event in enumerate(events)
        ]

        def arbeid(conn: psycopg.Connection) -> int:
            faktisk = self._versjon(conn, sak_id)
            if faktisk != expected_version:
                raise ConcurrencyError(expected_version, faktisk)
            with conn.cursor() as cur:
                cur.executemany(_SETT_INN, rader)
            return expected_version + len(events)

        try:
            return self._db.utfor(Kontekst(), arbeid)
        except ConcurrencyError:
            raise
        except ConflictError as feil:
            diag = getattr(feil.original, "diag", None)
            if getattr(diag, "constraint_name", None) != VERSJONSSKRANKE:
                raise
        with self._db.transaksjon(Kontekst()) as conn:
            faktisk = self._versjon(conn, sak_id)
        raise ConcurrencyError(expected_version, faktisk)

    def get_events(self, sak_id: str) -> tuple[list[dict], int]:
        prosjekt_id = _lesbart_prosjekt()
        with self._db.transaksjon(Kontekst()) as conn:
            rader = conn.cursor(row_factory=dict_row).execute(
                f"{_LES} WHERE sak_id = %s AND prosjekt_id = %s ORDER BY versjon",
                (sak_id, prosjekt_id),
            ).fetchall()
        if not rader:
            return [], 0
        return [self._til_hendelse(r) for r in rader], rader[-1]["versjon"]

    def gjeldende_versjon(self, sak_id: str) -> int:
        prosjekt_id = _lesbart_prosjekt()
        with self._db.transaksjon(Kontekst()) as conn:
            (versjon,) = conn.execute(
                "SELECT coalesce(max(versjon), 0) FROM hendelse"
                " WHERE sak_id = %s AND prosjekt_id = %s",
                (sak_id, prosjekt_id),
            ).fetchone()
        return versjon

    def get_all_sak_ids(self) -> list[str]:
        prosjekt_id = _lesbart_prosjekt()
        with self._db.transaksjon(Kontekst()) as conn:
            return [
                sak_id
                for (sak_id,) in conn.execute(
                    "SELECT DISTINCT sak_id FROM hendelse WHERE prosjekt_id = %s",
                    (prosjekt_id,),
                )
            ]

    def find_sak_id_by_catenda_topic(self, catenda_topic_id: str) -> str | None:
        if not catenda_topic_id:
            return None
        prosjekt_id = _lesbart_prosjekt()
        with self._db.transaksjon(Kontekst()) as conn:
            rad = conn.execute(
                "SELECT sak_id FROM hendelse WHERE event_type = 'sak_opprettet'"
                " AND data->>'catenda_topic_id' = %s AND prosjekt_id = %s"
                " ORDER BY id LIMIT 1",
                (catenda_topic_id, prosjekt_id),
            ).fetchone()
        return rad[0] if rad else None
