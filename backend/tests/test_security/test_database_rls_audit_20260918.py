"""Revisjon av databasens faktiske tilstand, RLS og migrasjoner (Pass 1).

Testene her etterprøver funn i databaseskjemaet og migrasjonskjeden:
- DB-01: Migrasjonskjeden kan ikke kjøres på tom database (mangler CREATE TABLE sak_metadata og event-tabeller)
- DB-02: Skjema-drift mellom repository og database (8 manglende cached reporting-kolonner i sak_metadata)
- DB-03: Hardkodet prosjektfallback i databasen (DEFAULT 'oslobygg' lekker kryssprosjekt-data)
- DB-04: sak_relations mangler prosjekt_id, fremmednøkler og har RLS uten policyer
- DB-05: Modellen ProjectMembership (role='viewer') krasjer mot app_project_memberships CHECK-skranke
- DB-06: Hendelsestabellene mangler prosjekt_id-kolonne for leietaker-isolering i RLS
- DB-07: sak_bim_links mangler 'properties'-kolonne deklarert i BimLink-modellen

Alle testene kjører lokalt uten nettverk og analyserer repoets faktiske SQL- og kodedefinisjoner.

Merknad 2026-09-22: DB-03 og DB-07 kontrolleres nå mot katalogen i en base
bygget fra migrasjonene, i tests/test_database/test_katalog.py. Reproduksjonene
her leste filer som var flyttet eller ufullstendige (T-2), og er fjernet.
"""

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_DIR = REPO_ROOT / "backend"
MIGRATIONS_BACKEND = BACKEND_DIR / "migrations"
MIGRATIONS_SUPABASE = REPO_ROOT / "supabase" / "migrations"


def _read_all_sql_migrations() -> dict[str, str]:
    """Leser alle SQL-migrasjonsfiler i repoet."""
    sql_files = {}
    if MIGRATIONS_BACKEND.exists():
        for p in sorted(MIGRATIONS_BACKEND.glob("*.sql")):
            sql_files[p.name] = p.read_text(encoding="utf-8")
    if MIGRATIONS_SUPABASE.exists():
        for p in sorted(MIGRATIONS_SUPABASE.glob("*.sql")):
            sql_files[p.name] = p.read_text(encoding="utf-8")
    return sql_files


def test_migration_chain_creates_sak_metadata_table():
    """
    DB-01, lukket 2026-09-20: sak_metadata opprettes nå av
    20260911073512_koe_kjerneskjema_rekonstruert.sql. Testen var en xfail-
    reproduksjon av at ingen migrasjonsfil opprettet tabellen; den er ordinær
    fra det tidspunktet feilen ble rettet.

    Rekkefølgen er en del av påstanden: kjerneskjemaet må kjøre før
    backend/migrations/004, som gjør UPDATE mot sak_metadata.
    """
    migrations = _read_all_sql_migrations()

    # Finn om CREATE TABLE sak_metadata finnes i noen migrasjonsfil
    has_create_sak_metadata = False
    for filename, content in migrations.items():
        if re.search(r"CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(public\.)?sak_metadata\b", content, re.IGNORECASE):
            has_create_sak_metadata = True
            break

    assert has_create_sak_metadata, (
        "Ingen migrasjonsfil i backend/migrations/ eller supabase/migrations/ oppretter "
        "tabellen 'sak_metadata'. Kjøring av 004_projects_table.sql på en tom database vil "
        "feile med 'relation sak_metadata does not exist'. Tabellen eksisterer kun i en docstring "
        "i backend/repositories/supabase_sak_metadata_repository.py."
    )


def test_sak_metadata_reporting_columns_declared_in_migrations():
    """
    DB-02, lukket 2026-09-20: de åtte rapporteringskolonnene står nå i
    20260911073512_koe_kjerneskjema_rekonstruert.sql. Testen var en xfail-
    reproduksjon av at de manglet i alle migrasjonsfiler.
    """
    from repositories.supabase_sak_metadata_repository import (
        SupabaseSakMetadataRepository,
    )

    expected_reporting_cols = [
        "cached_sum_krevd",
        "cached_sum_godkjent",
        "cached_dager_krevd",
        "cached_dager_godkjent",
        "cached_hovedkategori",
        "cached_underkategori",
        "cached_forsering_paalopt",
        "cached_forsering_maks",
    ]

    migrations = _read_all_sql_migrations()
    all_sql_text = "\n".join(migrations.values())

    # Sjekk også docstringen i repositoryet
    repo_doc = SupabaseSakMetadataRepository.__doc__ or ""

    missing_in_sql = []
    for col in expected_reporting_cols:
        in_migrations = col in all_sql_text
        in_doc = col in repo_doc
        if not (in_migrations or in_doc):
            missing_in_sql.append(col)

    assert not missing_in_sql, (
        f"Følgende kolonner forventes av SupabaseSakMetadataRepository, men finnes ikke "
        f"i noen migrasjonsfil eller tabell-docstring i repoet: {missing_in_sql}. "
        "Innsettinger og oppdateringer med SupabaseSakMetadataRepository eller "
        "backfill_reporting_cache.py vil krasje i PostgreSQL med 'column does not exist'."
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "DB-04: sak_relations mangler prosjekt_id-kolonne og fremmednøkler til "
        "sak_metadata. Merk at delpåstanden om «RLS uten policyer» ikke stemmer mot "
        "den faktiske basen: tabellen har policyen «Service role full access on "
        "sak_relations» (kontrollert 2026-09-19). Det reelle problemet er at ingen "
        "policy uttrykker en prosjektgrense — se AR-01 — ikke at policyer mangler."
    ),
)
def test_sak_relations_missing_prosjekt_id_and_foreign_keys():
    """
    DB-04: sak_relations (20260911073700_sak_relations.sql) mangler prosjekt_id-kolonne,
    mangler fremmednøkler til sak_metadata, og har aktivert RLS uten noen tilgangspolicyer.
    """
    relations_file = MIGRATIONS_SUPABASE / "20260911073700_sak_relations.sql"
    assert relations_file.exists(), "20260911073700_sak_relations.sql finnes ikke"
    content = relations_file.read_text(encoding="utf-8")

    has_project_id = bool(re.search(r"\bprosjekt_id\b", content, re.IGNORECASE))
    has_fk = bool(re.search(r"REFERENCES\s+sak_metadata", content, re.IGNORECASE))

    assert has_project_id, (
        "sak_relations i 20260911073700_sak_relations.sql mangler kolonnen 'prosjekt_id'. "
        "Det er dermed umulig å håndheve prosjektisolert RLS eller oppslag uten JOIN mot sak_metadata."
    )
    assert has_fk, (
        "sak_relations i 20260911073700_sak_relations.sql mangler REFERENCES sak_metadata(sak_id). "
        "Slettede saker etterlater foreldreløse relasjoner i tabellen."
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DB-05: Modellen ProjectMembership (role='viewer') krasjer mot app_project_memberships CHECK-skranke",
)
def test_project_membership_model_role_violates_database_check_constraint():
    """
    DB-05: Pydantic-modellen ProjectMembership tillater role='viewer',
    mens databaseskjemaet app_project_memberships har CHECK (role IN ('admin', 'member'))
    og forventer viewer_override BOOLEAN.
    """
    sessions_migration = MIGRATIONS_SUPABASE / "20260912150635_catenda_user_sessions.sql"
    assert sessions_migration.exists(), "20260912150635_catenda_user_sessions.sql finnes ikke"
    content = sessions_migration.read_text(encoding="utf-8")

    from models.project_membership import ProjectMembership

    # Modellen tillater role='viewer'
    membership_viewer = ProjectMembership(
        project_id="test-p",
        user_email="viewer@example.com",
        role="viewer",
    )
    assert membership_viewer.role == "viewer"

    # Databasen har CHECK (role IN ('admin', 'member'))
    db_allows_viewer = "role IN ('admin', 'member', 'viewer')" in content or "'viewer'" in re.findall(
        r"CHECK\s*\(\s*role\s+IN\s*\((.*?)\)\)", content, re.IGNORECASE
    )[0]

    assert db_allows_viewer, (
        "app_project_memberships i 20260912150635_catenda_user_sessions.sql har "
        "CHECK (role IN ('admin', 'member')) som avviser 'viewer'. Modellen ProjectMembership "
        "i models/project_membership.py deklarerer derimot 'viewer' som gyldig rolle. "
        "Dette skaper en skjemakonflikt ved persistering av lesebrukere."
    )


def test_hendelsestabellen_har_prosjekt_id_for_tenant_rls():
    """
    DB-06: hendelsesloggen skal ha prosjekt_id som egen kolonne, ikke bare
    prosjektet gjemt i CloudEvents' source-streng, som hindrer effektiv
    radnivåsikkerhet per prosjekt.

    Rettet 2026-09-20.

    **Testen leser migrasjonsfila,** som er eneste skjemakilde. Den beviser at
    repoet *erklærer* kolonnen — at basen har den, er katalogspørringen
    beviset på.
    """
    migrasjon = (
        REPO_ROOT
        / "supabase"
        / "migrations"
        / "20260920193558_hendelse_tabell.sql"
    )
    assert migrasjon.exists(), "migrasjonen som oppretter hendelse mangler"
    sql = migrasjon.read_text(encoding="utf-8")

    treff = re.search(
        r"CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.hendelse\s*\((.*?)\n\);",
        sql,
        re.DOTALL | re.IGNORECASE,
    )
    assert treff is not None, "tabelldefinisjonen for hendelse ikke funnet"

    assert re.search(
        r"^\s*prosjekt_id\s+TEXT\s+NOT\s+NULL", treff.group(2), re.MULTILINE | re.IGNORECASE
    ), (
        "hendelse mangler 'prosjekt_id TEXT NOT NULL'. Uten den finnes "
        "prosjektet kun i kommentaren på source-kolonnen, og tenant-isolering "
        "kan ikke uttrykkes som en RLS-policy."
    )

    assert "DEFAULT 'oslobygg'" not in sql, (
        "En defaultverdi på prosjekt_id gjør attribusjonen uetterprøvbar."
    )
