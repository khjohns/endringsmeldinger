"""Hendelseskatalogen i docs/datamodell/ skal dekke EventType og beskrive koden (spor M, 1b).

Avsender, modell, datamodell og behandler sammenliknes med koden. Det viser at
katalogen beskriver koden, ikke at koden er riktig: forventningen er koden
selv. Om hver side sender det NS 8407 og vedtakene sier, prøves i fase 3.
"""

import copy

import pytest

from models.events import (
    FristResponsData,
    ResponsEvent,
    SakOpprettetEvent,
    SporType,
    VederlagData,
    VederlagEvent,
    VederlagsMetode,
)
from tests.test_datamodell.test_tabellregister import dm

hk = dm.hk


@pytest.fixture(scope="module")
def katalog():
    return hk.les()


def _oppforing(katalog, navn):
    return next(h for h in katalog["hendelse"] if h["navn"] == navn)


def _uten(katalog, navn):
    return {**katalog, "hendelse": [h for h in katalog["hendelse"] if h["navn"] != navn]}


def test_katalogen_er_gyldig(katalog):
    assert hk.valider(katalog, dm.funnregisteret()) == []


def test_hver_hendelsestype_har_en_oppforing(katalog):
    uten_oppforing, uten_type = hk.avvik(katalog, hk.typene_i_koden())
    assert uten_oppforing == [], "Hendelsestyper uten oppføring i hendelser.toml"
    assert uten_type == [], "Oppføringer uten hendelsestype i EventType"


def test_katalogen_stemmer_med_koden(katalog):
    assert hk.mot_koden(katalog) == []


def test_vakta_melder_type_som_mangler_og_oppforing_som_er_til_overs(katalog):
    endret = _uten(katalog, "eo_revidert")
    endret["hendelse"].append({**_oppforing(katalog, "eo_akseptert"), "navn": "finnes_ikke"})
    uten_oppforing, uten_type = hk.avvik(endret, hk.typene_i_koden())
    assert uten_oppforing == ["eo_revidert"]
    assert uten_type == ["finnes_ikke"]


@pytest.mark.parametrize(
    ("felt", "verdi", "melding"),
    [
        ("avsender", "BH", "rollekontrollen TE"),
        ("modell", "FristEvent", "parse_event GrunnlagEvent"),
        ("data", "FristData", "er ikke en av"),
        ("behandler", "_handle_finnes_ikke", "har ikke _handle_finnes_ikke"),
    ],
)
def test_vakta_melder_avvik_fra_koden(katalog, felt, verdi, melding):
    endret = copy.deepcopy(katalog)
    _oppforing(endret, "grunnlag_opprettet")[felt] = verdi
    assert any(melding in feil for feil in hk.mot_koden(endret)), hk.mot_koden(endret)


def test_en_bestemmelse_uten_kjent_kilde_avvises(katalog):
    endret = copy.deepcopy(katalog)
    _oppforing(endret, "forsering_varsel")["ns8407_kilde"] = "antakelse"
    assert any("antakelse" in feil for feil in hk.valider(endret))


def test_en_funn_id_som_ikke_finnes_i_hovedplanen_avvises(katalog):
    endret = copy.deepcopy(katalog)
    _oppforing(endret, "respons_frist")["funn"] = ["ZZ-99"]
    assert any("ZZ-99" in feil for feil in hk.valider(endret, dm.funnregisteret()))


def _lagret(hendelse) -> set[str]:
    return set(hendelse.to_cloudevent()["data"])


def test_feltene_for_sak_opprettet_er_det_journalen_lagrer(katalog):
    """Uten datamodell lagres toppnivåfeltene; katalogen må vise de samme."""
    alle_satt = SakOpprettetEvent(
        sak_id="s",
        aktor_id="u",
        aktor_rolle="TE",
        sakstittel="t",
        prosjekt_id="p",
        catenda_topic_id="c",
        sakstype="forsering",
        prosjekt_navn="n",
        byggherre="b",
        leverandor="l",
        forsering_data={"avslatte_fristkrav": []},
    )
    felt = {f["felt"] for f in hk.datafelt(_oppforing(katalog, "sak_opprettet"))}
    assert _lagret(alle_satt) == felt


def test_feltene_i_data_dekker_det_journalen_lagrer(katalog):
    """Beregnede felt og `spor` havner i `data` og må stå i katalogen."""
    krav = VederlagEvent(
        sak_id="s",
        aktor_id="u",
        aktor_rolle="TE",
        data=VederlagData(metode=VederlagsMetode.ENHETSPRISER, belop_direkte=1, begrunnelse="b"),
    )
    svar = ResponsEvent(
        sak_id="s",
        aktor_id="u",
        aktor_rolle="BH",
        event_type="respons_frist",
        spor=SporType.FRIST,
        data=FristResponsData(beregnings_resultat="godkjent"),
    )
    for hendelse, navn in ((krav, "vederlag_krav_sendt"), (svar, "respons_frist")):
        felt = {f["felt"] for f in hk.datafelt(_oppforing(katalog, navn))}
        assert _lagret(hendelse) <= felt, _lagret(hendelse) - felt
    assert {"netto_belop", "krevd_belop"} <= _lagret(krav)
    assert "spor" in _lagret(svar)


def test_markdown_er_generert_fra_katalogen(katalog):
    assert hk.MARKDOWN.read_text(encoding="utf-8") == hk.markdown(katalog, dm.HENDELSESMERKNAD), (
        "hendelser.md er utdatert. Kjør /tmp/venv/bin/python docs/verktoy/datamodell.py fra repo-roten."
    )


def test_excel_har_de_to_hendelsesarkene():
    """Kilde: oppdragsgivers svar 29.09 (gjennomføringsnotatet for spor M, 1b)."""
    ark = dm.excel_verdier(dm.EXCEL)
    assert ark["Hendelsestyper"][0] == [
        "Hendelsestype",
        "Beskrivelse",
        "Hvem sender",
        "Spor",
        "Sakstype",
        "Bestemmelse i NS 8407",
        "Kilde for bestemmelsen",
        "Virkning på status",
        "Lagres i",
    ]
    assert ark["Hendelsesfelt"][0] == ["Hendelsestype", "Felt", "Type", "Påkrevd", "Beskrivelse"]
    assert len(ark["Hendelsestyper"]) == len(hk.typene_i_koden()) + 1
