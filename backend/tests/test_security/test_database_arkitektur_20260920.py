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

# Alle 18 tabellene i public, kontrollert mot basen 2026-09-20 etter at
# koe_events, forsering_events og endringsordre_events ble slått sammen til
# hendelse (MS-01). De tre opprettes fortsatt av kjerneskjemaet og slippes av
# 20260920193558 — et sett som bygger basen fra tom, må gjøre begge deler.
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
    "magic_links",
    "project_memberships",
    "projects",
    "sak_bim_links",
    "sak_metadata",
    "sak_relations",
    "user_groups",
]

# Tabeller repoet oppretter og siden slipper. De skal ikke stå i lista over —
# de finnes ikke i basen — men en migrasjon må fortsatt kunne opprette dem,
# ellers feiler de senere migrasjonene som endrer dem.
SLUPPNE_TABELLER = [
    "koe_events",
    "forsering_events",
    "endringsordre_events",
]


def _opprettede_tabeller() -> set[str]:
    """Tabeller repoets migrasjoner oppretter, skrevet på begge former.

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
            sql = fil.read_text(encoding="utf-8")

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
    """DA-03: all DDL skal ligge i supabase/migrations/.

    `backend/migrations/` var merket «legacy», men fire filer der var fortsatt
    nødvendige for å bygge basen — og to av dem måtte kjøres midt inne i
    supabase-sekvensen. Da kan ikke filnavnrekkefølgen være apply-rekkefølgen,
    og `supabase db push` kan ikke virke. Filene ble flyttet 2026-09-20.
    """
    etterlatt = sorted((REPO_ROOT / "backend" / "migrations").glob("*.sql"))
    assert not etterlatt, (
        "Disse SQL-filene ligger utenfor supabase/migrations/: "
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
