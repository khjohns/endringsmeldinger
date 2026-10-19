"""Databasearkitektur: repoet skal kunne opprette hver tabell som finnes i basen.

Gjennomgangen 2026-09-20 (docs/audit-databasearkitektur-2026-09-20.md) fant at
seks migrasjoner i basens historikk ikke fantes i repoet, og at sju tabeller
derfor ikke kunne opprettes fra fil. Testen er vakten mot at det skjer igjen:
tabellista er basens faktiske innhold, kontrollert mot prosjekt
gwdxadexwktegkklyobv.

Testen leser migrasjonsfilene, ikke databasen — den sier at repoet *erklærer*
tabellen, ikke at basen har den.
"""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATIONS = [
    REPO_ROOT / "backend" / "migrations",
    REPO_ROOT / "supabase" / "migrations",
]

# Alle 19 tabellene i public, kontrollert mot basen 2026-09-21 (notat kom til
# med MS-05; de øvrige atten ble kontrollert 2026-09-20).
TABELLER_I_BASEN = [
    "app_identities",
    "app_membership_sync",
    "app_oauth_attempts",
    "app_project_memberships",
    "app_sessions",
    "app_users",
    "catenda_contract_teams",
    "catenda_models_cache",
    "catenda_project_configs",
    "catenda_topic_board_configs",
    "hendelse",
    "leveringsoppdrag",
    "magic_links",
    "notat",
    "project_memberships",
    "projects",
    "sak_bim_links",
    "sak_metadata",
    "sak_relations",
    "user_groups",
]

SLUPPNE_TABELLER = [
    "koe_events",
    "forsering_events",
    "endringsordre_events",
]


def _opprettede_tabeller() -> set[str]:
    """Tabeller repoets migrasjoner oppretter, skrevet på begge former, utenom kommentarene.

    Den ene er en vanlig CREATE TABLE. Den andre er en DO-blokk som kjører
    format() med %I over en ARRAY av tabellnavn — der står navnet aldri ved
    siden av CREATE TABLE, så ARRAY-navn telles bare i filer som faktisk har
    en CREATE TABLE-mal.
    """
    funnet: set[str] = set()
    for katalog in MIGRATIONS:
        if not katalog.exists():
            continue
        for fil in sorted(katalog.glob("*.sql")):
            sql = uten_kommentarer(fil.read_text(encoding="utf-8"))

            funnet.update(
                m.group("navn").lower()
                for m in re.finditer(
                    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"
                    r"(?:public\.)?(?P<navn>[a-z_][a-z0-9_]*)",
                    sql,
                    re.IGNORECASE,
                )
            )

            if re.search(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"
                         r"public\.%I", sql, re.IGNORECASE):
                for blokk in re.findall(r"ARRAY\s*\[(.*?)\]", sql, re.DOTALL):
                    funnet.update(
                        n.lower() for n in re.findall(r"'([a-z_][a-z0-9_]*)'", blokk)
                    )
    return funnet


# Kommentarer fjernes før navnene leses; en strengliteral beholdes, så `--` eller
# en apostrof inne i den ikke forskyver hva som regnes som kommentar. Et
# dollar-sitat (`$$…$$`, `$tag$…$tag$`) er i migrasjonene en funksjons- eller
# DO-kropp, altså kode: grensene beholdes, og kroppen renses for seg (#634). Som i
# PostgreSQL åpner `$` etter et identifikatortegn ikke et sitat (`a$b$`), og kroppen
# slutter ved neste `$tag$`, også i en kommentar i kroppen (#861).
_SQL_DEL = re.compile(
    r"(?P<dollar>(?<![\w$])(?P<aapning>\$(?P<tag>[A-Za-z_][A-Za-z0-9_]*|)\$)(?P<kropp>.*?)\$(?P=tag)\$)"
    r"|(?P<streng>(?<![A-Za-z0-9_$])[Ee]'(?:[^'\\]|\\.|'')*'|'(?:[^']|'')*')"
    r"|--[^\n]*|/\*.*?\*/",
    re.DOTALL,
)


def _erstatt(m: re.Match) -> str:
    if m.group("dollar"):
        return m.group("aapning") + uten_kommentarer(m.group("kropp")) + m.group("aapning")
    return m.group("streng") or " "


def uten_kommentarer(sql: str) -> str:
    return _SQL_DEL.sub(_erstatt, sql)


def test_uten_kommentarer_apostrof_og_strek_i_dollarsitat_forskyver_ikke_resten():
    sql = (
        "DO $$ BEGIN -- TE's merknad\n RAISE NOTICE 'TE''s'; END $$;"
        " -- borte\nCREATE TABLE b ();"
    )
    renset = uten_kommentarer(sql)
    assert "RAISE NOTICE 'TE''s'; END $$;" in renset
    assert "merknad" not in renset
    assert "borte" not in renset
    assert "CREATE TABLE b" in renset


def test_uten_kommentarer_avslutter_tagget_dollarsitat_bare_paa_samme_tag():
    sql = "DO $fmt$ SELECT $$ ' $$; $x$ ' $x$ $fmt$; -- borte\nCREATE TABLE b ();"
    renset = uten_kommentarer(sql)
    assert "CREATE TABLE b" in renset
    assert "borte" not in renset


def test_uten_kommentarer_tar_ikke_dollar_i_en_identifikator_som_dollarsitat():
    """#861: `a$b$` er én identifikator i PostgreSQL, og `$b$` åpner ikke et sitat."""
    sql = "SELECT a$b$ FROM t WHERE x = ' $b$ '; -- borte\nCREATE TABLE b (c text DEFAULT 'x');"
    renset = uten_kommentarer(sql)
    assert "borte" not in renset
    assert "CREATE TABLE b (c text DEFAULT 'x');" in renset


def test_uten_kommentarer_kjenner_omvendt_skraastrek_i_e_streng():
    sql = "SELECT E'TE\\'s -- ikke kommentar'; -- borte\nCREATE TABLE b ();"
    renset = uten_kommentarer(sql)
    assert "E'TE\\'s -- ikke kommentar'" in renset
    assert "borte" not in renset
    assert "CREATE TABLE b" in renset


def test_uten_kommentarer_beholder_dobbel_apostrof_og_fjerner_blokkommentar():
    renset = uten_kommentarer("SELECT 'TE''s -- krav' /* CREATE TABLE x */;")
    assert renset == "SELECT 'TE''s -- krav'  ;"


def test_hver_tabell_i_basen_opprettes_av_en_migrasjonsfil():
    opprettet = _opprettede_tabeller()
    mangler = [t for t in TABELLER_I_BASEN if t not in opprettet]

    assert not mangler, (
        "Disse tabellene finnes i basen, men ingen migrasjonsfil i repoet "
        f"oppretter dem: {mangler}. En base bygget fra repoet blir ufullstendig."
    )


def test_sluppne_tabeller_opprettes_for_de_slippes():
    """Et sett som bygger fra tom, må kunne kjøre hele historikken.

    De tre hendelsestabellene finnes ikke i basen lenger, men migrasjonene
    mellom kjerneskjemaet og sammenslåingen endrer dem — legger til
    prosjekt_id og actorteam. Mangler CREATE TABLE, stopper settet der.
    """
    opprettet = _opprettede_tabeller()
    mangler = [t for t in SLUPPNE_TABELLER if t not in opprettet]
    assert not mangler, (
        f"Disse tabellene slippes av en migrasjon uten å opprettes først: {mangler}."
    )

    drop_fil = (
        REPO_ROOT / "supabase" / "migrations" / "20260920193558_hendelse_tabell.sql"
    )
    sql = drop_fil.read_text(encoding="utf-8")
    for tabell in SLUPPNE_TABELLER:
        assert f"DROP TABLE IF EXISTS public.{tabell}" in sql, (
            f"{tabell} står som sluppet, men {drop_fil.name} slipper den ikke."
        )


def test_kjerneskjemaet_kommer_for_projects_migrasjonen():
    """Rekkefølgen er en skranke, ikke en detalj.

    backend/migrations/004_projects_table.sql gjør UPDATE mot sak_metadata, og
    kjerneskjemaet oppretter den. Kjøres 004 først, feiler den med
    'relation sak_metadata does not exist' — observert 2026-09-20.
    """
    kjerne = (
        REPO_ROOT
        / "supabase"
        / "migrations"
        / "20260911073512_koe_kjerneskjema_rekonstruert.sql"
    )
    assert kjerne.exists(), "kjerneskjemamigrasjonen mangler"

    innhold = kjerne.read_text(encoding="utf-8")
    assert re.search(
        r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.sak_metadata", innhold
    ), "kjerneskjemaet oppretter ikke lenger sak_metadata"

    # Kjerneskjemaet skal ikke selv avhenge av projects; da blir rekkefølgen
    # sirkulær. project_memberships ligger derfor i en egen, senere fil.
    assert "REFERENCES public.projects" not in innhold, (
        "kjerneskjemaet refererer til projects. Da kan det ikke kjøre før "
        "backend/migrations/004, som selv krever sak_metadata — sirkulært."
    )


def test_migrasjonsmappa_er_eneste_kilde():
    """DA-03: all DDL skal ligge i supabase/migrations/ for PostgreSQL og i
    database/migrasjoner/ for SQL Server (#53, #558).

    `backend/migrations/` var merket «legacy», men fire filer der var fortsatt
    nødvendige for å bygge basen — og to av dem måtte kjøres midt inne i
    supabase-sekvensen. Da kan ikke filnavnrekkefølgen være apply-rekkefølgen,
    og `supabase db push` kan ikke virke. Filene ble flyttet 2026-09-20.
    """
    etterlatt = sorted((REPO_ROOT / "backend" / "migrations").glob("*.sql"))
    assert not etterlatt, (
        "Disse SQL-filene ligger utenfor supabase/migrations/ og database/migrasjoner/: "
        f"{[f.name for f in etterlatt]}. Da er migrasjonsmappa ikke eneste "
        "kilde, og apply-rekkefølgen lar seg ikke lese av filnavnene."
    )


def test_config_toml_peker_paa_riktig_prosjekt():
    """Uten config.toml er `supabase db push` ikke konfigurert mot noe."""
    config = REPO_ROOT / "supabase" / "config.toml"
    assert config.exists(), "supabase/config.toml mangler"
    innhold = config.read_text(encoding="utf-8")
    assert 'project_id = "gwdxadexwktegkklyobv"' in innhold
    assert "major_version = 17" in innhold, (
        "Basen kjører PostgreSQL 17; config.toml må si det samme."
    )
