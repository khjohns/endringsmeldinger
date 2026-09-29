"""BIM-koblinger og modellcache over direkte tilkobling (F0b, løp b).

`sak_bim_links` har ingen `prosjekt_id`. Prosjektet er sakens, og hver lesing
og skriving går gjennom `sak_metadata` med det autoriserte prosjektet.
`upsert_cached_models` er utelatt: ingen kaller den
(docs/gjennomforing-f0b-lop-b-2026-09-24.md).
"""

from __future__ import annotations

import psycopg
from psycopg import sql
from psycopg.rows import dict_row

from lib.db import Database, Kontekst, NotFoundError
from lib.project_context import get_project_id, krev_autorisert_prosjekt
from models.bim_link import BimLink, BimLinkCreate, CatendaModelCache

_LENKE = tuple(BimLink.model_fields)
_NY_LENKE = tuple(BimLinkCreate.model_fields)
_MODELL = tuple(CatendaModelCache.model_fields)


def _kolonner(navn: tuple[str, ...], alias: str | None = None) -> sql.Composable:
    return sql.SQL(", ").join(
        sql.Identifier(*((alias, k) if alias else (k,))) for k in navn
    )


_LES_LENKER = sql.SQL(
    "SELECT {} FROM sak_bim_links b JOIN sak_metadata m ON m.sak_id = b.sak_id"
    " WHERE b.sak_id = %s AND m.prosjekt_id = %s"
    " ORDER BY b.fag, b.model_name, b.id"
).format(_kolonner(_LENKE, "b"))

_SETT_INN_LENKE = sql.SQL(
    "INSERT INTO sak_bim_links (sak_id, linked_by, {})"
    " SELECT sak_id, %s, {} FROM sak_metadata WHERE sak_id = %s AND prosjekt_id = %s"
    " RETURNING {}"
).format(
    _kolonner(_NY_LENKE),
    sql.SQL(", ").join(sql.Placeholder() * len(_NY_LENKE)),
    _kolonner(_LENKE),
)

_LES_MODELLER = sql.SQL(
    "SELECT {} FROM catenda_models_cache WHERE prosjekt_id = %s"
    " ORDER BY fag, model_name, id"
).format(_kolonner(_MODELL))


class PostgresBimLinkRepository:
    def __init__(self, database: Database):
        self._db = database

    def get_links_for_sak(self, sak_id: str) -> list[BimLink]:
        prosjekt = get_project_id()
        if not prosjekt:
            return []
        with self._db.transaksjon(Kontekst()) as conn:
            rader = (
                conn.cursor(row_factory=dict_row)
                .execute(_LES_LENKER, (sak_id, prosjekt))
                .fetchall()
            )
        return [BimLink.model_validate(rad) for rad in rader]

    def create_link(self, sak_id: str, link: BimLinkCreate, linked_by: str) -> BimLink:
        prosjekt = krev_autorisert_prosjekt("BIM-kobling")
        felt = link.model_dump()
        verdier = (linked_by, *(felt[k] for k in _NY_LENKE), sak_id, prosjekt)

        def arbeid(conn: psycopg.Connection) -> dict | None:
            return (
                conn.cursor(row_factory=dict_row)
                .execute(_SETT_INN_LENKE, verdier)
                .fetchone()
            )

        rad = self._db.utfor(Kontekst(), arbeid)
        if rad is None:
            raise NotFoundError("Saken finnes ikke i prosjektet")
        return BimLink.model_validate(rad)

    def delete_link(self, link_id: int, sak_id: str | None = None) -> bool:
        prosjekt = krev_autorisert_prosjekt("BIM-kobling")

        def arbeid(conn: psycopg.Connection) -> bool:
            return (
                conn.execute(
                    "DELETE FROM sak_bim_links b USING sak_metadata m"
                    " WHERE b.id = %s AND m.sak_id = b.sak_id AND m.prosjekt_id = %s"
                    " AND (%s::text IS NULL OR b.sak_id = %s)",
                    (link_id, prosjekt, sak_id, sak_id),
                ).rowcount
                > 0
            )

        return self._db.utfor(Kontekst(), arbeid)

    def get_cached_models(self, prosjekt_id: str) -> list[CatendaModelCache]:
        if not prosjekt_id:
            return []
        with self._db.transaksjon(Kontekst()) as conn:
            rader = (
                conn.cursor(row_factory=dict_row)
                .execute(_LES_MODELLER, (prosjekt_id,))
                .fetchall()
            )
        return [CatendaModelCache.model_validate(rad) for rad in rader]
