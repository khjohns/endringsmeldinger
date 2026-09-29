"""Saksrelasjoner over direkte tilkobling (F0b, løp b).

Hver lesing og skriving er avgrenset til det autoriserte prosjektet (RV-07,
AUT-01/02). `get_related_saks`, `get_all_relations` og `clear_all_relations`
er utelatt: ingen kaller dem gjennom containeren
(docs/gjennomforing-f0b-lop-b-2026-09-24.md).
"""

from __future__ import annotations

from typing import Literal

import psycopg

from lib.db import Database, Kontekst
from lib.project_context import get_project_id, krev_autorisert_prosjekt

RelationType = Literal["forsering", "endringsordre"]

# DO NOTHING: en eksisterende relasjon beholder prosjektet den ble skrevet i.
_SETT_INN = (
    "INSERT INTO sak_relations"
    " (source_sak_id, target_sak_id, relation_type, prosjekt_id)"
    " VALUES (%s, %s, %s, %s)"
    " ON CONFLICT (source_sak_id, target_sak_id, relation_type) DO NOTHING"
)


class PostgresRelationRepository:
    def __init__(self, database: Database):
        self._db = database

    def add_relation(
        self,
        source_sak_id: str,
        target_sak_id: str,
        relation_type: RelationType,
    ) -> bool:
        return (
            self.add_relations_batch(source_sak_id, [target_sak_id], relation_type) == 1
        )

    def add_relations_batch(
        self,
        source_sak_id: str,
        target_sak_ids: list[str],
        relation_type: RelationType,
    ) -> int:
        if not target_sak_ids:
            return 0
        prosjekt = krev_autorisert_prosjekt("relasjon")
        rader = [
            (source_sak_id, target, relation_type, prosjekt)
            for target in target_sak_ids
        ]

        def arbeid(conn: psycopg.Connection) -> None:
            with conn.cursor() as cur:
                cur.executemany(_SETT_INN, rader)

        self._db.utfor(Kontekst(), arbeid)
        return len(target_sak_ids)

    def remove_relation(
        self,
        source_sak_id: str,
        target_sak_id: str,
        relation_type: RelationType | None = None,
    ) -> bool:
        prosjekt = krev_autorisert_prosjekt("relasjon")

        def arbeid(conn: psycopg.Connection) -> bool:
            return (
                conn.execute(
                    "DELETE FROM sak_relations WHERE source_sak_id = %s"
                    " AND target_sak_id = %s AND prosjekt_id = %s"
                    " AND (%s::text IS NULL OR relation_type = %s)",
                    (
                        source_sak_id,
                        target_sak_id,
                        prosjekt,
                        relation_type,
                        relation_type,
                    ),
                ).rowcount
                > 0
            )

        return self._db.utfor(Kontekst(), arbeid)

    def get_containers_for_sak(
        self,
        target_sak_id: str,
        relation_type: RelationType,
    ) -> list[str]:
        """Sakene som viser til `target_sak_id`, i det autoriserte prosjektet.
        Uten prosjektkontekst: ingen."""
        prosjekt = get_project_id()
        if not prosjekt:
            return []
        with self._db.transaksjon(Kontekst()) as conn:
            rader = conn.execute(
                "SELECT source_sak_id FROM sak_relations"
                " WHERE target_sak_id = %s AND relation_type = %s"
                " AND prosjekt_id = %s ORDER BY source_sak_id",
                (target_sak_id, relation_type, prosjekt),
            ).fetchall()
        return [kilde for (kilde,) in rader]
