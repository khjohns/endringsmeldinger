"""Skjemaet slik katalogene viser det, til ER-diagrammet (spor M, fase 1c).

PostgreSQL-delen leses fra pg_catalog i en base bygget fra migrasjonene og krever
KOE_TESTBASE_URL. SQLite-delen leses fra sqlite_master etter at klassene som eier
tabellene, har opprettet dem i en tom fil. Begge skrives til
docs/datamodell/katalog.json, som diagrammet og relasjonsregisteret lages fra.

Oppdater øyeblikksbildet fra repo-roten etter en ny migrasjon:
  KOE_TESTBASE_URL=... /tmp/venv/bin/python docs/verktoy/katalog.py
"""

import json
import os
import pathlib
import re
import sys
import tempfile

ROT = pathlib.Path(__file__).resolve().parents[2]
BACKEND = ROT / "backend"
KATALOG = ROT / "docs" / "datamodell" / "katalog.json"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

VED_SLETTING = {
    "a": "NO ACTION",
    "r": "RESTRICT",
    "c": "CASCADE",
    "n": "SET NULL",
    "d": "SET DEFAULT",
}

_TABELLER = """
SELECT c.oid, c.relname FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p')
ORDER BY c.relname
"""
_KOLONNER = """
SELECT a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull
FROM pg_attribute a
WHERE a.attrelid = %s AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum
"""
_SKRANKER = """
SELECT k.contype, k.conname,
       ARRAY(SELECT a.attname FROM unnest(k.conkey) WITH ORDINALITY u(n, i)
             JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = u.n
             ORDER BY u.i),
       fn.nspname, f.relname,
       ARRAY(SELECT a.attname FROM unnest(k.confkey) WITH ORDINALITY u(n, i)
             JOIN pg_attribute a ON a.attrelid = k.confrelid AND a.attnum = u.n
             ORDER BY u.i),
       k.confdeltype
FROM pg_constraint k
LEFT JOIN pg_class f ON f.oid = k.confrelid
LEFT JOIN pg_namespace fn ON fn.oid = f.relnamespace
WHERE k.conrelid = %s AND k.contype IN ('p', 'u', 'f')
ORDER BY k.contype, k.conname
"""
# Unike indekser som ikke hører til en skranke, som et uttrykk med COALESCE.
_UNIKE_INDEKSER = r"""
SELECT regexp_replace(pg_get_indexdef(i.indexrelid), '^.* USING \w+ ', '')
FROM pg_index i
WHERE i.indrelid = %s AND i.indisunique
  AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conindid = i.indexrelid)
ORDER BY 1
"""
_FUNKSJONER = """
SELECT DISTINCT p.proname FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace ORDER BY 1
"""
_TRIGGERE = """
SELECT c.relname, t.tgname, p.proname
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
ORDER BY 1, 2
"""


def les_postgres(tilkobling) -> dict:
    """Tabeller, nøkler, funksjoner og triggere i `public`."""
    tabeller = {}
    for oid, navn in tilkobling.execute(_TABELLER).fetchall():
        tabell = {
            "kolonner": [
                [kolonne, type_, "NOT NULL" if påkrevd else "NULL"]
                for kolonne, type_, påkrevd in tilkobling.execute(_KOLONNER, (oid,)).fetchall()
            ],
            "primærnøkkel": [],
            "unike": [],
            "unike_indekser": [
                definisjon for (definisjon,) in tilkobling.execute(_UNIKE_INDEKSER, (oid,)).fetchall()
            ],
            "fremmednøkler": [],
        }
        for art, _navn, kolonner, skjema, til, til_kolonner, sletting in tilkobling.execute(
            _SKRANKER, (oid,)
        ).fetchall():
            if art == "p":
                tabell["primærnøkkel"] = list(kolonner)
            elif art == "u":
                tabell["unike"].append(list(kolonner))
            else:
                tabell["fremmednøkler"].append(
                    {
                        "kolonner": list(kolonner),
                        "til": til if skjema == "public" else f"{skjema}.{til}",
                        "til_kolonner": list(til_kolonner),
                        "ved_sletting": VED_SLETTING[sletting],
                    }
                )
        tabell["unike"].sort()
        tabell["fremmednøkler"].sort(key=lambda f: f["kolonner"])
        tabeller[navn] = tabell
    return {
        "tabeller": tabeller,
        "funksjoner": [navn for (navn,) in tilkobling.execute(_FUNKSJONER).fetchall()],
        "triggere": [list(rad) for rad in tilkobling.execute(_TRIGGERE).fetchall()],
    }


def _opprett_sqlite_tabellene(sti: str) -> None:
    """Hver klasse oppretter sine tabeller ved oppstart, slik appen gjør."""
    from services.approval_service import ApprovalService
    from services.catenda_delivery_status import CatendaDeliveryStatus
    from services.eo_approval_service import EOApprovalService
    from services.utkast_registry import UtkastRegistry
    from services.vedlegg_registry import VedleggRegistry

    ApprovalService(sti, None, None, None)
    EOApprovalService(sti, None, None, None)
    UtkastRegistry(sti)
    VedleggRegistry(sti)
    CatendaDeliveryStatus(sti)


def les_sqlite() -> dict:
    """Tabellene i fila BH_APPROVAL_DB, slik koden oppretter dem i en tom fil."""
    import sqlite3

    with tempfile.TemporaryDirectory() as mappe:
        sti = os.path.join(mappe, "katalog.sqlite3")
        _opprett_sqlite_tabellene(sti)
        tilkobling = sqlite3.connect(sti)
        try:
            navn = [
                n
                for (n,) in tilkobling.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
                )
            ]
            tabeller = {}
            for tabell in navn:
                info = tilkobling.execute(f"PRAGMA table_info({tabell})").fetchall()
                tabeller[tabell] = {
                    "kolonner": [
                        # SQLite godtar NULL i en PRIMARY KEY-kolonne uten NOT NULL.
                        [kolonne, type_, "NOT NULL" if påkrevd else "NULL"]
                        for _, kolonne, type_, påkrevd, _, _ in info
                    ],
                    "primærnøkkel": [
                        kolonne for _, kolonne in sorted((r[5], r[1]) for r in info if r[5])
                    ],
                    "unike": [],
                    "unike_indekser": [],
                    "fremmednøkler": [],
                }
            return {"tabeller": tabeller}
        finally:
            tilkobling.close()


def les(sti: pathlib.Path = KATALOG) -> dict:
    return json.loads(sti.read_text(encoding="utf-8"))


_LISTE_AV_VERDIER = re.compile(r"\[\s+([^\[\]{}]*?)\s+\]")


def serialiser(katalog: dict) -> str:
    """JSON med én linje per kolonne og nøkkel, så en endring gir en lesbar diff."""
    tekst = json.dumps(katalog, ensure_ascii=False, indent=1)
    return _LISTE_AV_VERDIER.sub(lambda m: "[" + " ".join(m.group(1).split()) + "]", tekst) + "\n"


def main() -> int:
    url = os.environ.get("KOE_TESTBASE_URL")
    if not url:
        print("KOE_TESTBASE_URL er ikke satt. Katalogen leses fra en base bygget fra migrasjonene.")
        return 1
    import psycopg

    with psycopg.connect(url, autocommit=True) as tilkobling:
        katalog = {"postgresql": les_postgres(tilkobling), "sqlite": les_sqlite()}
    ny = serialiser(katalog)
    if not KATALOG.exists() or KATALOG.read_text(encoding="utf-8") != ny:
        KATALOG.write_text(ny, encoding="utf-8")
        print(f"skrev {KATALOG.relative_to(ROT)}")
    print(
        f"{len(katalog['postgresql']['tabeller'])} tabeller i PostgreSQL, "
        f"{len(katalog['sqlite']['tabeller'])} i SQLite"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
