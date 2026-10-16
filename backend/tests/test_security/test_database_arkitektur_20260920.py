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

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRATIONS = [
    REPO_ROOT / "backend" / "migrations",
    REPO_ROOT / "supabase" / "migrations",
]
# Migrasjonene i T-SQL for SQL Server (#53), anvendt av runneren i server/migrering.ts.
SQLSERVER_MIGRASJONER = REPO_ROOT / "database" / "migrasjoner"

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


# Kommentarer fjernes før navnene leses; en strengliteral beholdes, så `--` inne i
# en streng ikke tas for en kommentar.
_SQL_DEL = re.compile(r"'(?:[^']|'')*'|--[^\n]*|/\*.*?\*/", re.DOTALL)
_IDENT = r"\[?[a-z_#][a-z0-9_]*\]?"
_NAVN = rf"{_IDENT}(?:\.{_IDENT})?"
_SQLSERVER_DDL = re.compile(
    rf"\bCREATE\s+TABLE\s+(?P<opprett>{_NAVN})"
    rf"|\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?P<slipp>{_NAVN}(?:\s*,\s*{_NAVN})*)"
    r"|\bsp_rename\s+(?:@objname\s*=\s*)?N?'(?P<gammelt>[^']*)'\s*,\s*"
    r"(?:@newname\s*=\s*)?N?'(?P<nytt>[^']*)'"
    r"(?:\s*,\s*(?:@objtype\s*=\s*)?N?'(?P<objekttype>[^']*)')?",
    re.IGNORECASE,
)


def uten_kommentarer(sql: str) -> str:
    return _SQL_DEL.sub(lambda m: m.group(0) if m.group(0).startswith("'") else " ", sql)


def _tabellnavn(navn: str, fil: str) -> str | None:
    """«skjema.tabell» uten hakeparenteser, eller None for en midlertidig tabell."""
    deler = [d.strip("[]").lower() for d in navn.split(".")]
    if deler[-1].startswith("#"):
        return None
    if len(deler) != 2:
        raise AssertionError(
            f"{fil}: tabellen {navn!r} er ikke kvalifisert med skjemaet. Vakta kan ikke "
            "avgjøre hvilket skjema den havner i; skriv skjemaet (#591)."
        )
    return ".".join(deler)


def sqlserver_tabeller_etter(filer: list[tuple[str, str]]) -> set[str]:
    """Tabellene som finnes etter at migrasjonene (filnavn, sql) er kjørt i rekkefølge:
    CREATE TABLE legger til, DROP TABLE trekker fra, og sp_rename på en tabell bytter
    navnet. Kommentarer telles ikke (#591)."""
    tabeller: set[str] = set()
    for fil, sql in filer:
        for m in _SQLSERVER_DDL.finditer(uten_kommentarer(sql)):
            if m.group("opprett"):
                if navn := _tabellnavn(m.group("opprett"), fil):
                    tabeller.add(navn)
            elif m.group("slipp"):
                for del_ in m.group("slipp").split(","):
                    if navn := _tabellnavn(del_.strip(), fil):
                        tabeller.discard(navn)
            elif (m.group("objekttype") or "OBJECT").upper() == "OBJECT":
                gammelt = _tabellnavn(m.group("gammelt"), fil)
                if gammelt in tabeller:
                    nytt = m.group("nytt").strip("[]").lower()
                    tabeller.remove(gammelt)
                    tabeller.add(f"{gammelt.partition('.')[0]}.{nytt}")
    return tabeller


def tabeller_i_sqlserver_migrasjonene() -> set[str]:
    """Tabellene migrasjonene i SQL Server etterlater, kvalifisert med skjemaet (#558).

    Leser filene, ikke katalogen, så vakta kan kjøre uten base. Katalogen i
    katalog.json, som `test_katalogen_har_de_samme_tabellene_som_registeret`
    sammenlikner med, er lest fra en base bygget av runneren."""
    return sqlserver_tabeller_etter(
        [(fil.name, fil.read_text(encoding="utf-8")) for fil in sorted(SQLSERVER_MIGRASJONER.glob("*.sql"))]
    )


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


def test_sqlserver_vakta_folger_drop_table_sp_rename_og_kommentarer():
    """#591: tabellsettet er det migrasjonene etterlater, ikke hver CREATE TABLE i teksten."""
    filer = [
        (
            "1.sql",
            "-- CREATE TABLE koe.i_kommentar (id int)\n"
            "/* CREATE TABLE koe.i_blokk (id int) */\n"
            "CREATE TABLE [koe].[a] (id int); CREATE TABLE koe.b (id int);\n"
            "CREATE TABLE koe.c (id int); CREATE TABLE #midlertidig (id int);\n"
            "SELECT '-- ikke en kommentar'; CREATE TABLE koe.d (id int);",
        ),
        (
            "2.sql",
            "DROP TABLE IF EXISTS koe.a, [koe].[c];\n"
            "EXEC sp_rename N'koe.b', N'b2';\n"
            "EXEC sp_rename 'koe.d.id', 'nr', 'COLUMN';\n"
            "EXEC sp_rename @objname = N'koe.PK_finnes_ikke', @newname = N'PK_ny';",
        ),
    ]
    assert sqlserver_tabeller_etter(filer) == {"koe.b2", "koe.d"}


def test_sqlserver_vakta_avviser_tabell_uten_skjema():
    with pytest.raises(AssertionError, match="1.sql: tabellen 'uten_skjema' er ikke kvalifisert"):
        sqlserver_tabeller_etter([("1.sql", "CREATE TABLE uten_skjema (id int);")])
