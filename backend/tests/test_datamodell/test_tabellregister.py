"""Tabellregisteret i docs/datamodell/ skal være uttømmende og oppdatert (spor M, 1a).

PostgreSQL-tabellene sammenliknes med `TABELLER_I_BASEN`, som katalogtesten i
CI-jobben `database` holder lik en base bygget fra migrasjonene. En ny migrasjon
gjør dermed først katalogtesten rød, og deretter denne. SQLite-tabellene
sammenliknes med `CREATE TABLE` i modulene som bruker `sqlite_connection`.
SQL Server-tabellene sammenliknes med katalog.json i
`test_katalogen_har_de_samme_tabellene_som_registeret`
(`test_relasjoner_og_dataflyt.py`, #558, #647, #673).
"""

import importlib.util
import pathlib
import re

import pytest

from tests.test_security.test_database_arkitektur_20260920 import TABELLER_I_BASEN

ROT = pathlib.Path(__file__).resolve().parents[3]
BACKEND = ROT / "backend"
SQLITE_TABELL = re.compile(r"CREATE TABLE IF NOT EXISTS\s+(\w+)")


def _verktoy():
    spesifikasjon = importlib.util.spec_from_file_location(
        "datamodell", ROT / "docs" / "verktoy" / "datamodell.py"
    )
    modul = importlib.util.module_from_spec(spesifikasjon)
    spesifikasjon.loader.exec_module(modul)
    return modul


dm = _verktoy()


@pytest.fixture(scope="module")
def register():
    return dm.les()


def sqlite_tabeller_i_koden() -> set[str]:
    tabeller = set()
    for fil in BACKEND.rglob("*.py"):
        relativ = fil.relative_to(BACKEND)
        if relativ.parts[0] in ("tests", "venv", ".venv"):
            continue
        kilde = fil.read_text(encoding="utf-8")
        if "sqlite_connection" in kilde:
            tabeller |= set(SQLITE_TABELL.findall(kilde))
    return tabeller


def test_registeret_er_gyldig(register):
    assert dm.valider(register, dm.funnregisteret()) == []


def test_hver_postgresql_tabell_har_en_oppforing(register):
    uten_oppforing, uten_tabell = dm.avvik(register, "PostgreSQL", set(TABELLER_I_BASEN))
    assert uten_oppforing == [], "Tabeller i basen uten oppføring i registeret"
    assert uten_tabell == [], "Oppføringer uten tabell i basen"


def test_hver_sqlite_tabell_har_en_oppforing(register):
    i_koden = sqlite_tabeller_i_koden()
    if not i_koden:
        pytest.fail("Fant ingen SQLite-tabeller i koden; søket har sluttet å virke")
    uten_oppforing, uten_tabell = dm.avvik(register, "SQLite", i_koden)
    assert uten_oppforing == [], "SQLite-tabeller uten oppføring i registeret"
    assert uten_tabell == [], "Oppføringer uten SQLite-tabell i koden"


def test_vakta_melder_tabell_som_mangler_og_oppforing_som_er_til_overs(register):
    """Vakta selv: én tabell fjernet fra registeret, én oppføring lagt til."""
    endret = {
        **register,
        "tabell": [t for t in register["tabell"] if t["navn"] != "hendelse"]
        + [{**register["tabell"][0], "navn": "finnes_ikke"}],
    }
    faktiske = {t["navn"] for t in register["tabell"] if t["lagring"] == "PostgreSQL"}
    uten_oppforing, uten_tabell = dm.avvik(endret, "PostgreSQL", faktiske)
    assert uten_oppforing == ["hendelse"]
    assert uten_tabell == ["finnes_ikke"]


def test_en_tabell_i_bruk_uten_skriver_avvises(register):
    endret = {
        "tabell": [{**register["tabell"][0], "skrivere": [], "status": "i bruk"}],
    }
    assert any("uten skriver" in feil for feil in dm.valider(endret))


def test_en_funn_id_som_ikke_finnes_i_hovedplanen_avvises(register):
    endret = {"tabell": [{**register["tabell"][0], "funn": ["ZZ-99"]}]}
    assert any("ZZ-99" in feil for feil in dm.valider(endret, dm.funnregisteret()))


def test_markdown_er_generert_fra_registeret(register):
    assert dm.MARKDOWN.read_text(encoding="utf-8") == dm.markdown(register), (
        "tabeller.md er utdatert. Kjør /tmp/venv/bin/python docs/verktoy/datamodell.py fra repo-roten."
    )


def test_excel_er_generert_fra_registeret(register):
    assert dm.excel_verdier(dm.EXCEL) == dm.ark(register, dm.hk.les()), (
        "tabellbeskrivelse.xlsx er utdatert. Kjør /tmp/venv/bin/python docs/verktoy/datamodell.py fra repo-roten."
    )


def test_excel_har_ikts_kolonner_og_de_fire_oppdragsgiver_valgte():
    """Kilde: oppdragsgivers svar 29.09 (gjennomføringsnotatet for spor M, 1a)."""
    overskrift = dm.excel_verdier(dm.EXCEL)["Tabeller"][0]
    assert overskrift == [
        "Tabellnavn",
        "Beskrivelse",
        "Er dette en transaksjonstabell?",
        "Hvor fra appen lagres og redigeres",
        "Er dette en grunndatatabell?",
        "Tabell der data hentes inn, f.eks. via Catenda-API-et",
        "Beskrivelse av relasjon til en annen tabell",
        "Lagring",
        "Type",
        "Status",
        "Personopplysninger",
    ]


SQLSERVER_DEFINISJON = re.compile(
    r"^\s*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+(?:PROCEDURE|PROC|TRIGGER|FUNCTION)\s+(\w+\.\w+)",
    re.IGNORECASE | re.MULTILINE,
)
SQLSERVER_SKRIVER = re.compile(r"^(database/migrasjoner/\S+\.sql) \((.*)\)$")


def siste_sqlserver_definisjon() -> dict[str, str]:
    """Migrasjonen med den gjeldende definisjonen av hver prosedyre og trigger.

    Filnavnrekkefølgen er rekkefølgen runneren anvender filene i."""
    siste = {}
    for fil in sorted((ROT / "database" / "migrasjoner").glob("*.sql")):
        for navn in SQLSERVER_DEFINISJON.findall(fil.read_text(encoding="utf-8")):
            siste[navn] = fil.relative_to(ROT).as_posix()
    return siste


def skrivere_i_feil_migrasjon(register: dict, siste: dict[str, str]) -> list[str]:
    """Hver prosedyre eller trigger i `skrivere` står ved migrasjonen som definerer
    den sist. Navnet etter «innført i» er der den ble laget, og telles ikke."""
    feil = []
    for tabell in register["tabell"]:
        for skriver in tabell.get("skrivere", []):
            treff = SQLSERVER_SKRIVER.match(skriver)
            if not treff:
                continue
            fil, resten = treff.groups()
            resten = re.sub(r"innført i `[^`]*`", "", resten)
            for navn in re.findall(r"`(koe\w*\.\w+)`", resten):
                if siste.get(navn) != fil:
                    feil.append(f"{tabell['navn']}: {navn} er sist definert i {siste.get(navn)}, ikke i {fil}")
    return feil


def test_skriverne_i_sql_server_viser_til_den_gjeldende_definisjonen(register):
    """#703: hvilken migrasjon som har den gjeldende definisjonen, ble ført for hånd
    og gled fra migrasjonene to ganger (#682, #700)."""
    assert skrivere_i_feil_migrasjon(register, siste_sqlserver_definisjon()) == []


def test_vakta_melder_skriver_ved_en_eldre_definisjon(register):
    siste = siste_sqlserver_definisjon()
    endret = {
        "tabell": [
            {
                "navn": "koe.hendelse",
                "skrivere": [
                    "database/migrasjoner/20261016120000_kommandoer.sql (`koe_api.skriv_hendelse`)",
                    "database/migrasjoner/20261016120000_kommandoer.sql (`koe_api.finnes_ikke`)",
                ],
            }
        ]
    }
    assert len(skrivere_i_feil_migrasjon(endret, siste)) == 2
