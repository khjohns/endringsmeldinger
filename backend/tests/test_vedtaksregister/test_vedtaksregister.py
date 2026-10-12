"""Vedtaksregisteret, docs/vedtaksregister/vedtak.toml, og avsnitt 3.1 i hovedplanen (#413).

Testene som leser historikken (grunnlaget på main og NS 8407-teksten i
507e2254^), hoppes over med en melding når den mangler lokalt. I CI feiler de i
stedet, fordi jobben henter historikken.
"""

import copy
import datetime
import importlib.util
import os
import pathlib

import pytest

ROT = pathlib.Path(__file__).resolve().parents[3]


def _verktoy():
    spesifikasjon = importlib.util.spec_from_file_location(
        "vedtaksregister", ROT / "docs" / "verktoy" / "vedtaksregister.py"
    )
    modul = importlib.util.module_from_spec(spesifikasjon)
    spesifikasjon.loader.exec_module(modul)
    return modul


vr = _verktoy()


def _uten_historikk(melding: str):
    if os.environ.get("CI"):
        pytest.fail(f"{melding} CI-jobben skal hente historikken (.github/workflows/ci.yml).")
    pytest.skip(f"{melding} Hent den med git fetch --unshallow origin main.")


@pytest.fixture(scope="module")
def register():
    return vr.les()


@pytest.fixture(scope="module")
def plan():
    return vr.HOVEDPLAN.read_text(encoding="utf-8")


def ny_post(**endringer) -> dict:
    """En ny post slik orkestratoren fører den: alternativene ordrett, det valgte er vedtaket."""
    post = {
        "id": "XX-U1",
        "dato": datetime.date(2026, 10, 12),
        "hvem": "oppdragsgiver",
        "kilde": ["#413"],
        "sporsmal": "Skal TE kunne trekke kravet? Vedtaket sier «Et krav TE har trukket, kan ikke tas opp igjen».",
        "alternativ": [
            {"navn": "A", "tekst": "TE kan trekke kravet."},
            {"navn": "B", "tekst": "TE kan ikke trekke kravet.", "forkastet": True},
            {"navn": "C", "tekst": "Spørsmålet avgjøres senere."},
        ],
        "valgt": "A",
        "svar": "«A»",
        "forhold": [{"art": "presiserer", "vedtak": "ka-u1"}],
        "folge": "Ikke bygget",
        "sitat": [{"kilde": "hovedplanen", "tekst": "Et krav TE har trukket, kan ikke tas opp igjen"}],
    }
    return post | endringer


def med(register: dict, post: dict) -> dict:
    endret = copy.deepcopy(register)
    endret["gruppe"][0]["vedtak"].append(post)
    return endret


# --------------------------------------------------------------------------
# Registeret og 3.1
# --------------------------------------------------------------------------


def test_registeret_er_gyldig(register):
    assert vr.valider(register) == []


def test_3_1_er_generert_fra_registeret(register, plan):
    assert vr.plan_med(register, plan) == plan, (
        "3.1 i hovedplanen er ikke lik registeret. Rett i docs/vedtaksregister/vedtak.toml "
        "og kjør python3 docs/verktoy/vedtaksregister.py."
    )


def test_importen_gjenskaper_3_1_byte_for_byte(plan):
    """Oppdragsgiver 12.10 (#413): alle rader i 3.1 importeres ordrett, også merknadene og radene uten anker."""
    tekst = plan[slice(*vr.avsnitt(plan))]
    importert = vr.les_avsnitt(tekst)
    assert vr.markdown(importert) == tekst
    assert vr.les_avsnitt(vr.markdown(vr.tomllib.loads(vr.toml(importert)))) == importert


def test_de_importerte_postene_har_tomme_felt_for_sporsmal_og_forhold(register):
    """Oppdragsgiver 12.10 (#413): spørsmålene og forholdene finnes ikke for de eldre radene."""
    for p in vr.poster(register):
        if not vr.er_ny(p):
            assert set(p) <= vr.IMPORTERT


@pytest.mark.parametrize(
    ("endring", "melding"),
    [
        (lambda p: p.pop("svar"), "mangler svar"),
        (lambda p: p.update(valgt="D"), "er ikke et alternativ"),
        (lambda p: p.update(id="xx-u1"), "formen AB-U1"),
        (lambda p: p.update(dato="12.10"), "TOML-dato"),
        (lambda p: p.update(kilde="#413"), "kilde skal være en liste"),
        (lambda p: p.update(forhold=[{"art": "erstatter", "vedtak": "ka-u1"}]), "ukjent forhold"),
        (lambda p: p.update(forhold=[{"art": "endrer", "vedtak": "finnes-ikke"}]), "ikke er ankeret til et vedtak"),
        (lambda p: p.update(id="KA-U1"), "står to ganger"),
        (lambda p: p.update(begrunnelse="x"), "ukjent felt begrunnelse"),
        (lambda p: p["alternativ"][0].update(forkastet=True), "det valgte alternativet er forkastet"),
        (lambda p: p["alternativ"][0].update(tekst="TE | BH"), "har | uten"),
        (lambda p: p["alternativ"][0].update(tekst="TE  kan"), "dobbelt mellomrom"),
        (lambda p: p["sitat"][0].update(kilde="finnes/ikke.md"), "sitatkilden"),
    ],
)
def test_vakta_melder_feil_i_en_ny_post(register, endring, melding):
    post = ny_post()
    endring(post)
    feil = vr.valider(med(register, post))
    assert any(melding in f for f in feil), feil


def test_en_importert_post_kan_ikke_ha_felt_fra_en_ny(register):
    endret = copy.deepcopy(register)
    endret["gruppe"][0]["vedtak"][0]["forhold"] = [{"art": "endrer", "vedtak": "ka-u1"}]
    assert any("ukjent felt forhold i en importert post" in f for f in vr.valider(endret))


# --------------------------------------------------------------------------
# En ny post gjennom verktøyet
# --------------------------------------------------------------------------


def test_raden_for_en_ny_post_er_det_valgte_alternativet_ordrett(register):
    endret = med(register, ny_post())
    assert vr.valider(endret) == []
    rad = vr.rad(endret["gruppe"][0]["vedtak"][-1], endret)
    assert rad == (
        '| <a id="xx-u1"></a>XX-U1: TE kan trekke kravet. Forkastet: «TE kan ikke trekke kravet.» '
        "| 12.10, oppdragsgiver (#413) | Presiserer [KA-U1](#ka-u1). Ikke bygget |"
    )


def test_forholdet_star_begge_veier(register):
    """For hver ny post med forhold: lenken står hos posten og hos vedtaket den gjelder."""
    for reg in (register, med(register, ny_post())):
        alle = {vr.anker(p): p for p in vr.poster(reg) if vr.anker(p)}
        for p in vr.poster(reg):
            for f in p.get("forhold", []) if vr.er_ny(p) else []:
                assert f"(#{f['vedtak']})" in vr.folgecelle(p, reg)
                assert f"av [{p['id']}](#{vr.anker(p)})" in vr.folgecelle(alle[f["vedtak"]], reg)


def test_henvisningen_kommer_forst_i_folge_hos_det_eldre_vedtaket(register):
    endret = med(register, ny_post())
    ka_u1 = next(p for p in vr.poster(endret) if vr.anker(p) == "ka-u1")
    assert vr.folgecelle(ka_u1, endret).startswith("Presisert 12.10 av [XX-U1](#xx-u1). Presiserer SK-02")


def test_vedtaksteksten_i_en_ny_post_har_ingen_kodenavn(register):
    """#413: gjelder nye poster. De importerte har kodenavn i dag og skrives ikke om."""
    assert [(p["id"], vr.kodenavn(p)) for p in vr.poster(register) if vr.er_ny(p) and vr.kodenavn(p)] == []


@pytest.mark.parametrize(
    "tekst",
    ["TE sender `grunnlag_opprettet`.", "Saken er LUKKET_TRUKKET.", "Regelen i kanInngaaIEo gjelder.",
     "Feltet varsel_type avgjør.", "claims() avviser.", "Se kjerne/regler/eo.ts."],
)
def test_vakta_finner_kodenavn(tekst):
    post = ny_post()
    post["alternativ"][0]["tekst"] = tekst
    assert vr.kodenavn(post)


def test_vakta_finner_ikke_kodenavn_i_kontraktsbegreper():
    post = ny_post()
    post["alternativ"][0]["tekst"] = "TE varsler etter § 33.8, jf. KA-U1 og B-13. BH svarer «avslått» i EO-saken."
    assert vr.kodenavn(post) == []


# --------------------------------------------------------------------------
# Kildene: grunnlaget på main og NS 8407
# --------------------------------------------------------------------------


def test_eksisterende_vedtak_ankre_og_datoer_er_uendret(plan):
    grunnlag = vr.grunnlag()
    gammel = vr.git_fil(grunnlag, vr.HOVEDPLAN_I_GIT) if grunnlag else None
    if gammel is None:
        _uten_historikk("Grunnlaget på main finnes ikke lokalt.")
    assert vr.endrede_rader(gammel, plan) == []


def test_vakta_melder_endret_vedtak_og_fjernet_rad(plan):
    endret = plan.replace("Delvis enighet er ikke aksept |", "Delvis enighet er aksept |", 1)
    uten_rad = plan.replace(next(linje for linje in plan.splitlines() if linje.startswith("| P6: ")) + "\n", "")
    assert [f.split(":")[0] for f in vr.endrede_rader(plan, endret)] == ["ka-u1"]
    assert [f.split(":")[0] for f in vr.endrede_rader(plan, uten_rad)] == ["P6"]
    assert vr.endrede_rader(plan, plan) == []


def test_hvert_anker_i_hovedplanen_er_ledig(plan):
    """Et nytt vedtak kan ikke ta en ID som finnes i planen fra før."""
    ankre = vr.ankre_i(plan)
    assert sorted({a for a in ankre if ankre.count(a) > 1}) == []


def test_sitatene_star_ordrett_i_kilden(register, plan):
    ns_8407 = vr.git_fil(vr.NS_8407_COMMIT, vr.NS_8407_STI)
    if ns_8407 is None and any(s["kilde"] == "ns8407" for p in vr.poster(register) for s in p.get("sitat", [])):
        _uten_historikk("NS 8407-teksten i 507e2254^ finnes ikke lokalt.")
    assert vr.sitatfeil(register, plan, ns_8407) == []


def test_ns_8407_kan_leses_fra_historikken():
    ns_8407 = vr.git_fil(vr.NS_8407_COMMIT, vr.NS_8407_STI)
    if ns_8407 is None:
        _uten_historikk("NS 8407-teksten i 507e2254^ finnes ikke lokalt.")
    assert "33.8 Forsering ved uberettiget avslag" in ns_8407


def test_vakta_melder_sitat_som_ikke_star_i_kilden(register, plan):
    riktig = med(register, ny_post())
    assert vr.sitatfeil(riktig, vr.plan_med(riktig, plan), None) == []
    post = ny_post(sitat=[{"kilde": "hovedplanen", "tekst": "TE kan trekke kravet."}])
    feil = vr.sitatfeil(med(register, post), vr.plan_med(med(register, post), plan), None)
    assert feil == ["XX-U1: sitatet «TE kan trekke kravet.» står ikke ordrett i hovedplanen"], (
        "Raden til posten selv skal ikke telle som kilde"
    )
    post = ny_post(sitat=[{"kilde": "ns8407", "tekst": "TE skal forsere"}])
    feil = vr.sitatfeil(med(register, post), plan, "TE kan velge å forsere")
    assert any("står ikke i spørsmålet" in f for f in feil) and any("ordrett i ns8407" in f for f in feil)
