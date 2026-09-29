"""Interne notater over direkte tilkobling (F0b, løp a). Skjemaet står i
`supabase/migrations/20260921153900_notat_tabell.sql`.

`hent` er utelatt: ingen kaller den (docs/gjennomforing-f0b-lop-a-2026-09-24.md).
"""

from __future__ import annotations

import uuid

import psycopg
from psycopg import sql
from psycopg.rows import dict_row
from psycopg.types.string import TextLoader

from lib.db import Database, Kontekst
from models.notat import Notat

_KOLONNER = tuple(Notat.model_fields)

_LES = sql.SQL("SELECT {} FROM notat").format(
    sql.SQL(", ").join(map(sql.Identifier, _KOLONNER))
)

_SETT_INN = sql.SQL("INSERT INTO notat ({}) VALUES ({})").format(
    sql.SQL(", ").join(map(sql.Identifier, _KOLONNER)),
    sql.SQL(", ").join(sql.Placeholder() * len(_KOLONNER)),
)


class PostgresNotatRepository:
    def __init__(self, database: Database):
        self._db = database

    def lagre(self, notat: Notat) -> Notat:
        rad = notat.til_rad()
        verdier = tuple(rad[k] for k in _KOLONNER)

        def arbeid(conn: psycopg.Connection) -> None:
            conn.execute(_SETT_INN, verdier)

        self._db.utfor(Kontekst(), arbeid)
        return notat

    def for_sak(self, sak_id: str, prosjekt_id: str) -> list[Notat]:
        with self._db.transaksjon(Kontekst()) as conn:
            cur = conn.cursor(row_factory=dict_row)
            cur.adapters.register_loader("uuid", TextLoader)
            rader = cur.execute(
                _LES
                + sql.SQL(
                    " WHERE sak_id = %s AND prosjekt_id = %s"
                    " ORDER BY opprettet, notat_id"
                ),
                (sak_id, prosjekt_id),
            ).fetchall()
        return [Notat.fra_rad(rad) for rad in rader]

    def slett(
        self, sak_id: str, notat_id: str, prosjekt_id: str, aktor_id: str
    ) -> bool:
        try:
            notat_uuid = uuid.UUID(notat_id)
        except (TypeError, ValueError):
            return False

        def arbeid(conn: psycopg.Connection) -> bool:
            return (
                conn.execute(
                    "DELETE FROM notat WHERE sak_id = %s AND notat_id = %s"
                    " AND prosjekt_id = %s AND aktor_id = %s",
                    (sak_id, notat_uuid, prosjekt_id, aktor_id),
                ).rowcount
                > 0
            )

        return self._db.utfor(Kontekst(), arbeid)
