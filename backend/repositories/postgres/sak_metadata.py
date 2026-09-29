"""Saksmetadata over direkte tilkobling (F0b, løp b).

`exists`, `count_by_sakstype` og `upsert` er utelatt: ingen kaller dem gjennom
containeren (docs/gjennomforing-f0b-lop-b-2026-09-24.md).
"""

from __future__ import annotations

from datetime import UTC, datetime

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from lib.db import Database, Kontekst, NotFoundError
from lib.project_context import get_project_id
from models.sak_metadata import SakMetadata

_KOLONNER = tuple(SakMetadata.model_fields)

_LES = sql.SQL("SELECT {} FROM sak_metadata").format(
    sql.SQL(", ").join(map(sql.Identifier, _KOLONNER))
)

_SETT_INN = sql.SQL("INSERT INTO sak_metadata ({}) VALUES ({})").format(
    sql.SQL(", ").join(map(sql.Identifier, _KOLONNER)),
    sql.SQL(", ").join(sql.Placeholder() * len(_KOLONNER)),
)

_NYESTE_FORST = sql.SQL(" ORDER BY last_event_at DESC NULLS LAST, sak_id")


def _utc(tidspunkt: datetime | None) -> datetime | None:
    """Et tidspunkt uten sone er UTC, som i Supabase-basen."""
    if tidspunkt is not None and tidspunkt.tzinfo is None:
        return tidspunkt.replace(tzinfo=UTC)
    return tidspunkt


class PostgresSakMetadataRepository:
    def __init__(self, database: Database):
        self._db = database

    def _les(self, betingelse: sql.Composable, parametre: tuple) -> list[SakMetadata]:
        with self._db.transaksjon(Kontekst()) as conn:
            rader = (
                conn.cursor(row_factory=dict_row)
                .execute(_LES + betingelse, parametre)
                .fetchall()
            )
        return [SakMetadata.model_validate(rad) for rad in rader]

    def create(self, metadata: SakMetadata) -> None:
        rad = metadata.model_dump()
        rad["created_at"] = _utc(rad["created_at"])
        rad["last_event_at"] = _utc(rad["last_event_at"])
        verdier = tuple(rad[k] for k in _KOLONNER)

        def arbeid(conn: psycopg.Connection) -> None:
            conn.execute(_SETT_INN, verdier)

        self._db.utfor(Kontekst(), arbeid)

    def get(self, sak_id: str) -> SakMetadata | None:
        treff = self._les(sql.SQL(" WHERE sak_id = %s"), (sak_id,))
        return treff[0] if treff else None

    def get_by_topic_id(self, topic_id: str) -> SakMetadata | None:
        """Saken for topicen i det autoriserte prosjektet. Uten prosjekt: ingen."""
        prosjekt = get_project_id()
        if not prosjekt:
            return None
        treff = self._les(
            sql.SQL(
                " WHERE catenda_topic_id = %s AND prosjekt_id = %s"
                " ORDER BY created_at, sak_id LIMIT 1"
            ),
            (topic_id, prosjekt),
        )
        return treff[0] if treff else None

    def set_catenda_mapping(
        self,
        sak_id: str,
        prosjekt_id: str,
        topic_id: str,
        board_id: str,
        catenda_project_id: str,
    ) -> None:
        def arbeid(conn: psycopg.Connection) -> int:
            return conn.execute(
                "UPDATE sak_metadata SET catenda_topic_id = %s,"
                " catenda_board_id = %s, catenda_project_id = %s"
                " WHERE sak_id = %s AND prosjekt_id = %s",
                (topic_id, board_id, catenda_project_id, sak_id, prosjekt_id),
            ).rowcount

        if not self._db.utfor(Kontekst(), arbeid):
            raise NotFoundError("Saken finnes ikke i prosjektet")

    def update_cache(
        self,
        sak_id: str,
        cached_title: str | None = None,
        cached_status: str | None = None,
        last_event_at: datetime | None = None,
        cached_sum_krevd: float | None = None,
        cached_sum_godkjent: float | None = None,
        cached_dager_krevd: int | None = None,
        cached_dager_godkjent: int | None = None,
        cached_hovedkategori: str | None = None,
        cached_underkategori: str | None = None,
        cached_forsering_paalopt: float | None = None,
        cached_forsering_maks: float | None = None,
    ) -> None:
        """Bare feltene som er oppgitt. `None` lar kolonnen stå (MS-06)."""
        oppgitt = {
            "cached_title": cached_title,
            "cached_status": cached_status,
            "last_event_at": _utc(last_event_at),
            "cached_sum_krevd": cached_sum_krevd,
            "cached_sum_godkjent": cached_sum_godkjent,
            "cached_dager_krevd": cached_dager_krevd,
            "cached_dager_godkjent": cached_dager_godkjent,
            "cached_hovedkategori": cached_hovedkategori,
            "cached_underkategori": cached_underkategori,
            "cached_forsering_paalopt": cached_forsering_paalopt,
            "cached_forsering_maks": cached_forsering_maks,
        }
        endringer = [(k, v) for k, v in oppgitt.items() if v is not None]
        if not endringer:
            return
        setning = sql.SQL("UPDATE sak_metadata SET {} WHERE sak_id = %s").format(
            sql.SQL(", ").join(
                sql.SQL("{} = %s").format(sql.Identifier(k)) for k, _ in endringer
            )
        )
        verdier = (*(v for _, v in endringer), sak_id)

        def arbeid(conn: psycopg.Connection) -> None:
            conn.execute(setning, verdier)

        self._db.utfor(Kontekst(), arbeid)

    def probe(self) -> None:
        with self._db.transaksjon(Kontekst()) as conn:
            conn.execute("SELECT 1 FROM sak_metadata LIMIT 1").fetchall()

    def list_all(
        self, prosjekt_id: str | None = None, *, alle_prosjekter: bool = False
    ) -> list[SakMetadata]:
        """Saker i prosjektet. Uten prosjektkontekst: ingen, med mindre
        `alle_prosjekter` sier noe annet."""
        pid = prosjekt_id or get_project_id()
        if pid:
            return self._les(sql.SQL(" WHERE prosjekt_id = %s") + _NYESTE_FORST, (pid,))
        if alle_prosjekter:
            return self._les(_NYESTE_FORST, ())
        return []

    def list_by_sakstype(
        self, sakstype: str, prosjekt_id: str | None = None
    ) -> list[SakMetadata]:
        pid = prosjekt_id or get_project_id()
        if not pid:
            return []
        return self._les(
            sql.SQL(" WHERE prosjekt_id = %s AND sakstype = %s") + _NYESTE_FORST,
            (pid, sakstype),
        )

    def delete(self, sak_id: str) -> bool:
        def arbeid(conn: psycopg.Connection) -> bool:
            return (
                conn.execute(
                    "DELETE FROM sak_metadata WHERE sak_id = %s", (sak_id,)
                ).rowcount
                > 0
            )

        return self._db.utfor(Kontekst(), arbeid)
