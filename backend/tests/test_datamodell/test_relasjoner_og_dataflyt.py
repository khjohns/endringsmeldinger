"""Relasjonene og dataflyten mot Catenda i docs/datamodell/ (spor M, 1c).

Relasjonsregisteret sammenliknes med katalog.json, som
`test_database/test_katalog_json.py` holder lik en base bygget fra
migrasjonene. Dataflyten sammenliknes med kallene til Catenda-klienten, funnet
med AST i backend. Testene viser at registrene beskriver koden og skjemaet, ikke
at koden gjør det riktige.
"""

import copy

import pytest

from tests.test_datamodell.test_tabellregister import dm, sqlite_tabeller_i_koden
from tests.test_security.test_database_arkitektur_20260920 import TABELLER_I_BASEN

rel, df, kat = dm.rel, dm.df, dm.kat


@pytest.fixture(scope="module")
def kilder():
    return dm.kilder()


@pytest.fixture(scope="module")
def tabellregister():
    return dm.les()


def _uten(liste: list[dict], **felt) -> list[dict]:
    return [x for x in liste if any(x.get(k) != v for k, v in felt.items())]


# ---------------------------------------------------------------------------
# Katalogen
# ---------------------------------------------------------------------------


def test_katalogen_har_de_samme_tabellene_som_registeret(kilder, tabellregister):
    skjema = kilder["katalog"]
    assert sorted(skjema["postgresql"]["tabeller"]) == sorted(TABELLER_I_BASEN)
    assert sorted(skjema["sqlite"]["tabeller"]) == sorted(sqlite_tabeller_i_koden())
    assert dm.katalogavvik(tabellregister, skjema) == []


def test_sqlite_delen_er_skjemaet_koden_oppretter(kilder):
    assert kat.les_sqlite() == kilder["katalog"]["sqlite"], (
        "katalog.json er utdatert. Kjør KOE_TESTBASE_URL=... /tmp/venv/bin/python "
        "docs/verktoy/katalog.py fra repo-roten."
    )


# ---------------------------------------------------------------------------
# Relasjonene
# ---------------------------------------------------------------------------


def test_relasjonsregisteret_er_gyldig(kilder):
    assert rel.valider(kilder["relasjoner"], kilder["katalog"], dm.funnregisteret()) == []


def test_hver_fremmednokkel_i_katalogen_har_en_oppforing(kilder):
    fk = set(rel.fremmednøkler(kilder["katalog"]))
    beskrevet = {
        (r["fra"], r["til"]) for r in kilder["relasjoner"]["relasjon"] if r["art"] == "fremmednøkkel"
    }
    assert len(fk) == 15, "Katalogen 29.09 har 15 fremmednøkler; har søket sluttet å virke?"
    assert beskrevet == fk


def test_vakta_melder_fremmednokkel_uten_oppforing(kilder):
    endret = {**kilder["relasjoner"], "relasjon": _uten(kilder["relasjoner"]["relasjon"], fra="notat.sak_id")}
    feil = rel.valider(endret, kilder["katalog"])
    assert any("notat.sak_id → sak_metadata.sak_id i katalogen mangler" in f for f in feil), feil


def test_vakta_melder_logisk_kobling_ført_som_fremmednokkel(kilder):
    endret = copy.deepcopy(kilder["relasjoner"])
    next(r for r in endret["relasjon"] if r["fra"] == "sak_relations.source_sak_id")["art"] = "fremmednøkkel"
    feil = rel.valider(endret, kilder["katalog"])
    assert any("katalogen har ingen slik" in f for f in feil), feil


def test_vakta_melder_nokkelkolonne_uten_relasjon_eller_begrunnelse(kilder):
    skjema = copy.deepcopy(kilder["katalog"])
    skjema["postgresql"]["tabeller"]["hendelse"]["kolonner"].append(["godkjent_av", "text", "NULL"])
    feil = rel.valider(kilder["relasjoner"], skjema)
    assert any(f.startswith("hendelse.godkjent_av:") for f in feil), feil

    endret = {
        **kilder["relasjoner"],
        "uten_relasjon": _uten(kilder["relasjoner"]["uten_relasjon"], kolonne="vedlegg.lastet_opp_av"),
    }
    assert any(f.startswith("vedlegg.lastet_opp_av:") for f in rel.valider(endret, kilder["katalog"]))


def test_vakta_melder_kolonne_som_ikke_finnes(kilder):
    endret = copy.deepcopy(kilder["relasjoner"])
    next(r for r in endret["relasjon"] if r["fra"] == "hendelse.actorid")["fra"] = "hendelse.aktor_id"
    feil = rel.valider(endret, kilder["katalog"])
    assert any("hendelse.aktor_id finnes ikke" in f for f in feil), feil


# ---------------------------------------------------------------------------
# Dataflyten
# ---------------------------------------------------------------------------


def test_dataflyten_er_gyldig(kilder, tabellregister):
    assert df.valider(kilder["dataflyt"], kilder["katalog"], tabellregister, dm.funnregisteret()) == []


def test_klientlaget_gir_metodene_som_kaller_catenda():
    """Forutsetningen for vakta under: søket finner kjente kall og ingen konstruktører."""
    metoder = df.catenda_metoder()
    assert {"create_comment", "upload_document", "update_topic_status", "members", "team_members"} <= metoder
    assert not {m for m in metoder if m.startswith("__")}


def test_hvert_kall_til_catenda_har_en_pil(kilder):
    steder = df.kallsteder(frozenset(kilder["dataflyt"]["autentisering"]))
    assert "backend/routes/event_routes.py:_post_catenda_comment" in steder, "Søket har sluttet å virke"
    assert "backend/services/auth_service.py:AuthService.sync" in steder
    assert df.udekkede_kallsteder(kilder["dataflyt"], steder) == []


def test_vakta_melder_kall_uten_pil(kilder):
    endret = {**kilder["dataflyt"], "flyt": _uten(kilder["dataflyt"]["flyt"], id="C09")}
    steder = df.kallsteder(frozenset(kilder["dataflyt"]["autentisering"]))
    udekket = df.udekkede_kallsteder(endret, steder)
    assert udekket == ["backend/routes/vedlegg_routes.py:last_ned_vedlegg kaller download_document"]


def test_vakta_melder_kode_som_ikke_finnes(kilder, tabellregister):
    endret = copy.deepcopy(kilder["dataflyt"])
    endret["flyt"][0]["steg"][0]["kode"] = [
        "backend/routes/catenda_webhook_routes.py:finnes_ikke",
        "databasefunksjon:koe_finnes_ikke",
    ]
    feil = df.valider(endret, kilder["katalog"], tabellregister)
    assert any("finnes_ikke er ikke definert" in f for f in feil), feil
    assert any("koe_finnes_ikke finnes ikke i katalogen" in f for f in feil), feil


def test_vakta_melder_pil_som_ikke_berorer_catenda(kilder, tabellregister):
    endret = copy.deepcopy(kilder["dataflyt"])
    endret["flyt"][0]["steg"][0] = {**endret["flyt"][0]["steg"][0], "fra": "hendelse", "til": ["notat"]}
    feil = df.valider(endret, kilder["katalog"], tabellregister)
    assert any("må gå fra eller til Catenda" in f for f in feil), feil


# ---------------------------------------------------------------------------
# De genererte filene
# ---------------------------------------------------------------------------


def test_relasjoner_md_er_generert_fra_registrene(tabellregister, kilder):
    assert dm.RELASJONER.read_text(encoding="utf-8") == dm.relasjoner_markdown(tabellregister, kilder), (
        "relasjoner.md er utdatert. Kjør /tmp/venv/bin/python docs/verktoy/datamodell.py fra repo-roten."
    )


def test_excel_har_arkene_relasjoner_og_dataflyt(kilder):
    """Kilde: oppdragsgivers svar 29.09 (gjennomføringsnotatet for spor M, 1c)."""
    ark = dm.excel_verdier(dm.EXCEL)
    assert ark["Relasjoner"][0] == rel.RELASJONSKOLONNER
    assert ark["Dataflyt"][0] == df.DATAFLYTKOLONNER
    assert len(ark["Relasjoner"]) == len(kilder["relasjoner"]["relasjon"]) + 1
    assert len(ark["Dataflyt"]) == len(df.piler(kilder["dataflyt"])) + 1
    assert all(rad[7] for rad in ark["Dataflyt"][1:]), "En pil uten kode"


def test_kolonne_7_lages_fra_relasjonsregisteret():
    """Fastholder formen kolonne 7 fikk i 1c; teksten er ikke lenger skrevet for hånd."""
    rader = {rad[0]: rad for rad in dm.excel_verdier(dm.EXCEL)["Tabeller"][1:]}
    assert "sak_id → sak_metadata.sak_id (fremmednøkkel, ON DELETE CASCADE)" in rader["hendelse"][6]
    assert "Ingen relasjoner til andre tabeller." in rader["app_oauth_attempts"][6]
    assert "Dataflyt: fra Catenda i C01" in rader["sak_metadata"][5]
