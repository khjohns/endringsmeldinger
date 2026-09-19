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


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DB-01: Migrasjonskjeden mangler CREATE TABLE for sak_metadata og event-tabeller; 004 krasjer på tom database",
)
def test_migration_chain_fails_on_empty_db_missing_sak_metadata_table():
    """
    DB-01: 004_projects_table.sql forutsetter at sak_metadata allerede eksisterer
    (UPDATE sak_metadata SET prosjekt_id = 'oslobygg'), men tabellen opprettes
    aldri i noen migrasjonsfil. En ny database feiler ved migrering.
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


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DB-02: SupabaseSakMetadataRepository forventer 8 reporting-kolonner som mangler i alle SQL-migrasjoner",
)
def test_sak_metadata_schema_drift_missing_cached_reporting_columns():
    """
    DB-02: SupabaseSakMetadataRepository skriver og leser 8 rapporteringskolonner
    (cached_sum_krevd, cached_sum_godkjent, cached_dager_krevd, osv.),
    men ingen av disse kolonnene er definert i noen SQL-migrasjon eller i tabell-docstringen.
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
    reason="DB-03: 004_projects_table.sql har hardkodet DEFAULT 'oslobygg' som tilordner saker fra andre leietakere til Oslobygg",
)
def test_sak_metadata_database_default_hardcodes_oslobygg_fallback():
    """
    DB-03: 004_projects_table.sql setter DEFAULT 'oslobygg' på sak_metadata.prosjekt_id.
    Dette gjør at saker opprettet uten prosjekt-ID i et multitenant-miljø
    stille tilordnes Oslobygg KF i stedet for å feile med NOT NULL-feil.
    """
    projects_migration = MIGRATIONS_BACKEND / "004_projects_table.sql"
    assert projects_migration.exists(), "004_projects_table.sql finnes ikke"
    content = projects_migration.read_text(encoding="utf-8")

    # Søk etter hardkodet DEFAULT 'oslobygg' på prosjekt_id
    has_oslobygg_default = bool(
        re.search(r"ALTER\s+COLUMN\s+prosjekt_id\s+SET\s+DEFAULT\s+['\"]oslobygg['\"]", content, re.IGNORECASE)
    )

    assert not has_oslobygg_default, (
        "backend/migrations/004_projects_table.sql inneholder hardkodet "
        "ALTER COLUMN prosjekt_id SET DEFAULT 'oslobygg'. I et flerbrukermiljø fører dette "
        "til at saker uten eksplisitt prosjekt feilaktig havner i Oslobyggs portefølje "
        "uten å avvises av NOT NULL-skranken."
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
    DB-04: sak_relations (003_sak_relations.sql) mangler prosjekt_id-kolonne,
    mangler fremmednøkler til sak_metadata, og har aktivert RLS uten noen tilgangspolicyer.
    """
    relations_file = MIGRATIONS_BACKEND / "003_sak_relations.sql"
    assert relations_file.exists(), "003_sak_relations.sql finnes ikke"
    content = relations_file.read_text(encoding="utf-8")

    has_project_id = bool(re.search(r"\bprosjekt_id\b", content, re.IGNORECASE))
    has_fk = bool(re.search(r"REFERENCES\s+sak_metadata", content, re.IGNORECASE))

    assert has_project_id, (
        "sak_relations i 003_sak_relations.sql mangler kolonnen 'prosjekt_id'. "
        "Det er dermed umulig å håndheve prosjektisolert RLS eller oppslag uten JOIN mot sak_metadata."
    )
    assert has_fk, (
        "sak_relations i 003_sak_relations.sql mangler REFERENCES sak_metadata(sak_id). "
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


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DB-06: koe_events mangler prosjekt_id-kolonne for effektiv leietaker-isolering og RLS",
)
def test_event_tables_missing_prosjekt_id_column_for_tenant_rls():
    """
    DB-06: Hendelsestabellene (koe_events, forsering_events, endringsordre_events)
    mangler prosjekt_id-kolonne. Prosjektet finnes kun i CloudEvents source-strengen,
    noe som hindrer effektiv radnivåsikkerhet (RLS) per prosjekt.
    """
    import repositories.supabase_event_repository as event_repo_module

    doc = event_repo_module.__doc__ or ""

    # Sjekk om koe_events har prosjekt_id kolonne
    koe_match = re.search(r"CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?koe_events\s*\((.*?)\);", doc, re.DOTALL | re.IGNORECASE)
    assert koe_match is not None, "koe_events tabelldefinisjon ikke funnet i docstring"
    koe_sql = koe_match.group(2)

    has_prosjekt_id = bool(re.search(r"^\s*prosjekt_id\s+\w+", koe_sql, re.MULTILINE | re.IGNORECASE))
    assert has_prosjekt_id, (
        "koe_events mangler kolonnen 'prosjekt_id'. Tabellen har kun prosjekt som en del "
        "av kommentarene på source-kolonnen ('/projects/{prosjekt_id}/cases/{sak_id}'). "
        "Dette umuliggjør direkte leietaker-indeksering og effektiv prosjektbasert RLS."
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "DB-07: ingen migrasjon deklarerer 'properties' på sak_bim_links, selv om "
        "BimLink-modellen har feltet. Testen leser migrasjonsfilene, ikke databasen — "
        "kolonnen FINNES i den faktiske basen (kontrollert 2026-09-19), så dette er "
        "migrasjonsdrift og ikke datatap. Testen forblir xfail til migrasjonen dekker "
        "skjemaet, uavhengig av hva basen inneholder."
    ),
)
def test_sak_bim_links_missing_properties_column_declared_in_model():
    """
    DB-07: BimLink-modellen i backend/models/bim_link.py har feltet 'properties'
    (for IFC property sets, mengder og materialer), men sak_bim_links-tabellen
    i backend/migrations/006_bim_tables.sql mangler denne kolonnen.
    """
    from models.bim_link import BimLink

    assert "properties" in BimLink.model_fields, "BimLink mangler properties-feltet"

    bim_migration = MIGRATIONS_BACKEND / "006_bim_tables.sql"
    assert bim_migration.exists(), "006_bim_tables.sql finnes ikke"
    content = bim_migration.read_text(encoding="utf-8")

    sak_bim_links_match = re.search(r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+sak_bim_links\s*\((.*?)\);", content, re.DOTALL)
    assert sak_bim_links_match, "sak_bim_links ikke funnet i 006_bim_tables.sql"
    table_sql = sak_bim_links_match.group(1)

    has_properties = bool(re.search(r"\bproperties\b", table_sql, re.IGNORECASE))
    assert has_properties, (
        "sak_bim_links i backend/migrations/006_bim_tables.sql mangler kolonnen 'properties'. "
        "Modellen BimLink i backend/models/bim_link.py deklarerer properties: dict[str, Any] | None. "
        "Forsøk på å lagre eller laste IFC properties vil føre til datatap eller databasefeil."
    )
