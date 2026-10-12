"""Temavisningene av regelgrunnlaget (#454, punkt 5 og 9 i #451).

Forventningene står i #451: visningen er generert og kontrollert i CI, samler
vedtakene ordrett med kjedene, lager ingen sammenslått gjeldende ordlyd og sier at
3.1 er autoritativ. #454 legger til de forkastede alternativene, henvisningene og
kontrollsummen, og arbeidsvalg A i kommentaren på #454 sier hvilke vedtak et tema
har: også hvert vedtak som endrer, utvider, snevrer inn, presiserer eller opphever
et vedtak i temaet.
"""

import copy
import datetime
import importlib.util
import pathlib

import pytest

ROT = pathlib.Path(__file__).resolve().parents[3]


def _verktoy():
    spesifikasjon = importlib.util.spec_from_file_location(
        "temavisning", ROT / "docs" / "verktoy" / "temavisning.py"
    )
    modul = importlib.util.module_from_spec(spesifikasjon)
    spesifikasjon.loader.exec_module(modul)
    return modul


tv = _verktoy()
vr = tv.vr

GRUNNLAGSSVAR = "grunnlagssvar-som-endringsordre"


@pytest.fixture(scope="module")
def kilder():
    return tv.les_kilder()


@pytest.fixture(scope="module")
def temaer():
    return tv.les_temaer()


@pytest.fixture
def tema(temaer):
    return copy.deepcopy(next(t for t in temaer if t["id"] == GRUNNLAGSSVAR))


def _post(register: dict, anker: str) -> dict:
    return next(p for p in vr.poster(register) if vr.anker(p) == anker)


def _ny_post_som_endrer_gr_u13() -> dict:
    return {
        "id": "XX-U1",
        "dato": datetime.date(2026, 10, 12),
        "hvem": "oppdragsgiver",
        "kilde": ["#454"],
        "sporsmal": "Spørsmålet.",
        "alternativ": [
            {"navn": "A", "tekst": "Det valgte alternativet."},
            {"navn": "B", "tekst": "Et forkastet alternativ.", "forkastet": True},
        ],
        "valgt": "A",
        "svar": "«A»",
        "forhold": [{"art": "endrer", "vedtak": "gr-u13"}],
    }


def _med_ny_post(kilder: dict) -> dict:
    endret = copy.deepcopy(kilder)
    endret["register"]["gruppe"][0]["vedtak"].append(_ny_post_som_endrer_gr_u13())
    return endret


def test_temaene_er_gyldige(temaer, kilder):
    assert [m for t in temaer for m in tv.feil(t, kilder["register"])] == []


def test_den_innsjekkede_visningen_er_lik_generatoren(temaer, kilder):
    for tema in temaer:
        assert tv.sti(tema).read_text(encoding="utf-8") == tv.visning(tema, kilder), (
            f"{tv.sti(tema).relative_to(ROT)} er ikke lik det generatoren lager. "
            "Kjør python3 docs/verktoy/temavisning.py."
        )


def test_visningen_sier_at_3_1_er_autoritativ_og_lager_ingen_sammenslatt_ordlyd(tema, kilder):
    tekst = tv.visning(tema, kilder)
    assert "**Avsnitt [3.1 i hovedplanen](" in tekst
    assert "er autoritativ.**" in tekst
    assert "lager ingen sammenslått gjeldende ordlyd" in tekst


def test_hvert_vedtak_i_temaet_star_ordrett_med_det_forkastede_merket_for_seg(tema, kilder):
    tekst = tv.visning(tema, kilder)
    linjer = tekst.splitlines()
    medlemmer = {"gr-u10", "gr-u12", "gr-u13", "gr-u14", "gr-u15", "mm-u17"}
    for anker in sorted(medlemmer):
        post = _post(kilder["register"], anker)
        vedtak, _, forkastet = vr.linje(post["vedtak"]).partition(tv.FORKASTET)
        assert f"> {tv._lenker(vedtak, medlemmer)}" in linjer
        if forkastet:
            assert f"**Forkastet:** {tv._lenker(forkastet, medlemmer)}" in linjer
            assert not any(linje.startswith("> ") and forkastet in linje for linje in linjer)


def test_kjeden_viser_forholdene_begge_veier(tema, kilder):
    tekst = tv.visning(tema, kilder)
    assert "| [GR-U13](#gr-u13) | Endrer [GR-U10](#gr-u10); Endrer [GR-U12](#gr-u12) |" in tekst
    assert "| [GR-U10](#gr-u10) |" in tekst and "Endret av [GR-U13](#gr-u13) |" in tekst
    assert "Utvidet av [GR-U15](#gr-u15)" in tekst


def test_vedtak_utenfor_temaet_lenkes_til_3_1(tema, kilder):
    tekst = tv.visning(tema, kilder)
    assert f"[GR-U2]({tv.TIL_PLANEN}#gr-u2)" in tekst
    assert "[GR-U2](#gr-u2)" not in tekst


def test_regelradene_og_bevis_sakene_som_viser_til_vedtaket_er_med(tema, kilder):
    tekst = tv.visning(tema, kilder)
    gr_28 = next(r for r in kilder["regler"]["rader"] if r["id"] == "GR-28")
    assert {"GR-U10", "GR-U12", "GR-U13"} <= set(gr_28["kilder"])
    assert '<a id="rad-gr-28"></a>GR-28' in tekst
    assert "[GR-28](#rad-gr-28)" in tekst
    assert "F-MM-G18 (målmodellen)" in tekst


def test_et_vedtak_som_endrer_kjeden_og_mangler_i_temaet_gir_feil(tema, kilder):
    tema["vedtak"].remove("GR-U14")
    assert tv.feil(tema, kilder["register"]) == [
        f"{GRUNNLAGSSVAR}: GR-U14 endrer GR-U13, men står ikke i temaet"
    ]


def test_et_nytt_vedtak_som_endrer_kjeden_gir_feil_til_det_er_tatt_inn(tema, kilder):
    endret = _med_ny_post(kilder)
    assert tv.feil(tema, endret["register"]) == [
        f"{GRUNNLAGSSVAR}: XX-U1 endrer GR-U13, men står ikke i temaet"
    ]
    tema["vedtak"].append("XX-U1")
    assert tv.feil(tema, endret["register"]) == []
    tekst = tv.visning(tema, endret)
    assert "> XX-U1: Det valgte alternativet." in tekst
    assert "**Forkastet:** «Et forkastet alternativ.»" in tekst
    assert "Endret 12.10 av [XX-U1](#xx-u1)." in tekst


def test_et_ukjent_vedtak_og_en_kjerne_utenfor_vedtakene_gir_feil(tema, kilder):
    tema["vedtak"].append("GR-U99")
    tema["kjerne"].append("GR-U16")
    assert tv.feil(tema, kilder["register"]) == [
        f"{GRUNNLAGSSVAR}: GR-U99 er ikke et vedtak med anker i registeret",
        f"{GRUNNLAGSSVAR}: GR-U16 står i kjernen, men ikke i vedtakene",
    ]


def test_kontrollsummen_endres_med_kildegrunnlaget_og_ikke_med_resten(tema, kilder):
    for_ = tv.kontrollsum(tema, kilder)

    rad = copy.deepcopy(kilder)
    next(r for r in rad["regler"]["rader"] if r["id"] == "GR-28")["tilfelle"] += " Endret."
    assert tv.kontrollsum(tema, rad) != for_

    post = copy.deepcopy(kilder)
    _post(post["register"], "gr-u13")["folge"] += " Endret."
    assert tv.kontrollsum(tema, post) != for_

    lenket = set(tv.utdrag(tema, kilders := copy.deepcopy(kilder))["etiketter"])
    medlemmer = {v.lower() for v in tema["vedtak"]}
    utenfor = next(
        p for p in vr.poster(kilders["register"])
        if vr.anker(p) and vr.anker(p) not in lenket | medlemmer and "folge" in p
    )
    utenfor["folge"] += " Endret."
    assert tv.kontrollsum(tema, kilders) == for_
