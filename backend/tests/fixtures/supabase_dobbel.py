"""Supabase-klient i minnet, for lagertester uten nettverk.

Dobbelen har to egenskaper som er hele grunnen til at den finnes framfor en
`Mock`:

- **`insert` avviser ukjente kolonner.** Det er den eneste vakten i suiten mot
  at koden skriver en kolonne migrasjonsfila ikke erklærer. Kolonnesettet
  speiler `supabase/migrations/20260920193558_hendelse_tabell.sql` og holdes i
  synk manuelt.
- **`execute` projiserer etter `select(...)`.** Uten den passerer en test på
  CloudEvents-eksporten uavhengig av hvilke kolonner spørringen ber om.

Merk: settet speiler repoet, ikke den levende basen. Dobbelen fanger at koden
og migrasjonsfila er uenige, aldri at fila og basen er det — det er
katalogspørringen som er beviset på at en skjemaendring har nådd fram.
"""

import json
from types import SimpleNamespace


def _felt(row: dict, field: str):
    """Verdien et PostgREST-filter ville sammenliknet med.

    `data->>nokkel` plukker ut en tekstverdi fra JSON-kolonnen, slik `->>`
    gjør i PostgREST. Kolonnen kan ligge som dict eller som rå JSON-streng.
    """
    if "->>" not in field:
        return row.get(field)
    kolonne, nokkel = field.split("->>", 1)
    verdi = row.get(kolonne.strip())
    if isinstance(verdi, str):
        try:
            verdi = json.loads(verdi)
        except json.JSONDecodeError:
            return None
    if not isinstance(verdi, dict):
        return None
    ut = verdi.get(nokkel.strip())
    return None if ut is None else str(ut)


HENDELSE_KOLONNER = {
    "id",
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
    "created_at",
}


class FakeTable:
    """Én spørring mot én tabell i minnet.

    Bygges på nytt per `client.table(...)`-kall, slik at filtre ikke lekker
    mellom spørringer — som hos den ekte klienten.
    """

    def __init__(self, name: str, rows: list[dict], kolonner: set[str], logg: list[str]):
        self._name = name
        self._rows = rows
        self._kolonner = kolonner
        self._logg = logg
        self._select: str | None = None
        self._filters: list[tuple[str, object]] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._range: tuple[int, int] | None = None
        self._pending_insert: list[dict] | None = None

    def insert(self, rows):
        self._logg.append(self._name)
        rows = rows if isinstance(rows, list) else [rows]
        for row in rows:
            unknown = set(row) - self._kolonner
            if unknown:
                raise AssertionError(
                    f"Tabellen {self._name} har ingen kolonne(r) {sorted(unknown)}"
                )
        self._pending_insert = rows
        return self

    def select(self, columns="*"):
        self._logg.append(self._name)
        self._select = columns
        return self

    def eq(self, field, value):
        self._filters.append((field, value))
        return self

    def order(self, field, desc=False):
        self._order = (field, desc)
        return self

    def limit(self, count):
        self._limit = count
        return self

    def range(self, start, end):
        self._range = (start, end)
        return self

    def execute(self):
        if self._pending_insert is not None:
            self._rows.extend(dict(row) for row in self._pending_insert)
            return SimpleNamespace(data=list(self._pending_insert))

        rows = [
            row
            for row in self._rows
            if all(_felt(row, field) == value for field, value in self._filters)
        ]
        if self._order:
            field, desc = self._order
            rows = sorted(rows, key=lambda row: row.get(field), reverse=desc)
        if self._range is not None:
            start, end = self._range
            rows = rows[start : end + 1]
        if self._limit is not None:
            rows = rows[: self._limit]
        if self._select and self._select != "*":
            wanted = [part.strip() for part in self._select.split(",")]
            rows = [{key: row.get(key) for key in wanted} for row in rows]
        return SimpleNamespace(data=[dict(row) for row in rows])


class FakeSupabaseClient:
    """Minimal Supabase-klient uten nettverk.

    `brukte_tabeller` logger hver tabell en spørring har rørt, slik at en test
    kan slå fast at sakstypen ikke velger tabell lenger (MS-01).
    """

    def __init__(self, kolonner: set[str] | None = None):
        self.tables: dict[str, list[dict]] = {}
        self.brukte_tabeller: list[str] = []
        self._kolonner = kolonner if kolonner is not None else HENDELSE_KOLONNER

    def table(self, name: str) -> FakeTable:
        return FakeTable(
            name,
            self.tables.setdefault(name, []),
            self._kolonner,
            self.brukte_tabeller,
        )
