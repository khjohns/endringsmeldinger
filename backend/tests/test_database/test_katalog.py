"""Katalogen i en base bygget fra supabase/migrations/ (F0 i hovedplanen).

Testene leser pg_catalog og information_schema i basen KOE_TESTBASE_URL peker
på. Basen bygges fra tom av scripts/testbase/bygg_testbase.sh: plattformstubben,
så alle migrasjoner i filnavnrekkefølge. Det testene beviser, er hva repoets
migrasjoner bygger — ikke hva prosjektets base inneholder. Den sammenlikningen
er en katalogspørring mot prosjektet.
"""

import pytest

from tests.test_security.test_database_arkitektur_20260920 import TABELLER_I_BASEN

pytestmark = pytest.mark.database

REGULERTE_ROLLER = ("anon", "authenticated")


def _kolonne(testbase, tabell: str, kolonne: str):
    return testbase.execute(
        """
        SELECT is_nullable, column_default, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s AND column_name = %s
        """,
        (tabell, kolonne),
    ).fetchone()


def test_basen_har_hver_tabell_prosjektet_har(testbase):
    rader = testbase.execute(
        """
        SELECT relname FROM pg_class
        WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p')
        """
    ).fetchall()
    bygget = {navn for (navn,) in rader}

    assert sorted(set(TABELLER_I_BASEN) - bygget) == []
    assert sorted(bygget - set(TABELLER_I_BASEN)) == []


def test_sak_metadata_prosjekt_id_har_ingen_default(testbase):
    """DB-03.

    Erstatter 2026-09-22 den strenge xfail-reproduksjonen
    `test_sak_metadata_database_default_hardcodes_oslobygg_fallback` i
    test_security/test_database_rls_audit_20260918.py (T-2). Den leste
    backend/migrations/004_projects_table.sql, som ble flyttet 2026-09-20, og
    feilet derfor på at fila manglet — ikke på defaulten. Katalogen er det
    stedet påstanden kan avgjøres.
    """
    rad = _kolonne(testbase, "sak_metadata", "prosjekt_id")

    assert rad is not None, "sak_metadata.prosjekt_id finnes ikke"
    er_nullbar, default, _ = rad
    assert default is None, f"sak_metadata.prosjekt_id har DEFAULT {default}"
    assert er_nullbar == "NO"


def test_sak_bim_links_har_properties(testbase):
    """DB-07.

    Erstatter 2026-09-22 den strenge xfail-reproduksjonen
    `test_sak_bim_links_missing_properties_column_declared_in_model` i
    test_security/test_database_rls_audit_20260918.py (T-2). Den leste bare
    20260911073800_bim_tables.sql, mens kolonnen legges til i
    20260920160000_avstem_backend_migrations.sql.
    """
    rad = _kolonne(testbase, "sak_bim_links", "properties")

    assert rad is not None, "sak_bim_links.properties finnes ikke"
    assert rad[2] == "jsonb"


@pytest.mark.parametrize("tabell", ["hendelse", "sak_relations"])
def test_prosjekt_id_er_not_null_uten_default(testbase, tabell):
    rad = _kolonne(testbase, tabell, "prosjekt_id")

    assert rad is not None, f"{tabell}.prosjekt_id finnes ikke"
    er_nullbar, default, _ = rad
    assert er_nullbar == "NO", f"{tabell}.prosjekt_id er nullbar"
    assert default is None, f"{tabell}.prosjekt_id har DEFAULT {default}"


def test_anon_og_authenticated_har_ingen_tabellrettigheter(testbase):
    """Plattformstubben gir rollene alt på nye tabeller, slik Supabase gjør.

    At de står uten rettigheter her, er derfor migrasjonenes verk
    (20260918131137_lock_down_data_api.sql).
    """
    rader = testbase.execute(
        """
        SELECT c.relname, r.rolname
        FROM pg_class c
        CROSS JOIN unnest(%s::text[]) AS r(rolname)
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
          AND (
            has_table_privilege(r.rolname, c.oid,
              'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
            OR has_any_column_privilege(r.rolname, c.oid,
              'SELECT, INSERT, UPDATE, REFERENCES')
          )
        ORDER BY 1, 2
        """,
        (list(REGULERTE_ROLLER),),
    ).fetchall()

    assert rader == []


@pytest.mark.parametrize("rolle", REGULERTE_ROLLER)
def test_rollen_avvises_ved_lesing_av_hver_tabell(testbase, rolle):
    """Samme påstand som over, prøvd med rollen i stedet for lest av katalogen."""
    from psycopg import errors, sql

    tabeller = [
        navn
        for (navn,) in testbase.execute(
            """
            SELECT relname FROM pg_class
            WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p', 'v', 'm')
            ORDER BY 1
            """
        ).fetchall()
    ]
    assert tabeller, "fant ingen tabeller å prøve"

    lesbare = []
    with testbase.transaction(force_rollback=True):
        testbase.execute(sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(rolle)))
        for tabell in tabeller:
            try:
                with testbase.transaction():
                    testbase.execute(
                        sql.SQL("SELECT 1 FROM public.{} LIMIT 0").format(
                            sql.Identifier(tabell)
                        )
                    )
                lesbare.append(tabell)
            except errors.InsufficientPrivilege:
                pass

    assert lesbare == []


def test_anon_og_authenticated_har_ingen_sekvensrettigheter(testbase):
    rader = testbase.execute(
        """
        SELECT c.relname, r.rolname
        FROM pg_class c
        CROSS JOIN unnest(%s::text[]) AS r(rolname)
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relkind = 'S'
          AND has_sequence_privilege(r.rolname, c.oid, 'USAGE, SELECT, UPDATE')
        ORDER BY 1, 2
        """,
        (list(REGULERTE_ROLLER),),
    ).fetchall()

    assert rader == []


def test_anon_og_authenticated_kan_ikke_kjore_funksjoner_i_public(testbase):
    """Omfatter også EXECUTE arvet fra PUBLIC (20260918131223)."""
    rader = testbase.execute(
        """
        SELECT p.oid::regprocedure::text, r.rolname
        FROM pg_proc p
        CROSS JOIN unnest(%s::text[]) AS r(rolname)
        WHERE p.pronamespace = 'public'::regnamespace
          AND has_function_privilege(r.rolname, p.oid, 'EXECUTE')
        ORDER BY 1, 2
        """,
        (list(REGULERTE_ROLLER),),
    ).fetchall()

    assert rader == []
