"""Vedtaksregisteret, docs/vedtaksregister/vedtak.toml, og avsnitt 3.1 i hovedplanen (#413).

Testene som leser grunnlaget på main i historikken, hoppes over med en melding når
den mangler lokalt, og feiler i CI, som henter den. Testene som leser NS
8407-teksten, hoppes over når klonen av det private repoet khjohns/kontrakt
mangler, også i CI. De kjøres lokalt før en PR som fører et vedtak (#424).
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
        pytest.fail(
            f"{melding} CI-jobben skal hente historikken (.github/workflows/ci.yml)."
        )
    pytest.skip(f"{melding} Hent historikken med git fetch --unshallow origin main.")


def _ns_8407() -> str:
    tekst = vr.ns_8407()
    if tekst is None:
        pytest.skip(f"NS 8407-teksten mangler. {vr.NS_8407_HJELP}")
    return tekst


@pytest.fixture(scope="module")
def register():
    return vr.les()


@pytest.fixture(scope="module")
def plan():
    return vr.HOVEDPLAN.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def grunnregister(register):
    """Registeret med bare de importerte postene. De syntetiske testene bygger på det, så de
    ikke påvirkes av de nye postene som føres senere."""
    grunn = copy.deepcopy(register)
    for g in grunn["gruppe"]:
        g["vedtak"] = [p for p in g["vedtak"] if not vr.er_ny(p)]
    return grunn


@pytest.fixture(scope="module")
def grunnplan(grunnregister, plan):
    return vr.plan_med(grunnregister, plan)


def ny_post(**endringer) -> dict:
    """En ny post slik orkestratoren fører den: alternativene ordrett, det valgte er vedtaket."""
    post = {
        "id": "XX-U1",
        "dato": datetime.date(2026, 10, 12),
        "hvem": "oppdragsgiver",
        "kilde": ["#413"],
        "sporsmal": "Skal TE kunne trekke kravet? Vedtaket sier «Et krav TE har trukket, kan ikke tas opp igjen med en oppdatering.»",
        "alternativ": [
            {"navn": "A", "tekst": "TE kan trekke kravet."},
            {"navn": "B", "tekst": "TE kan ikke trekke kravet.", "forkastet": True},
            {"navn": "C", "tekst": "Spørsmålet avgjøres senere."},
        ],
        "valgt": "A",
        "svar": "«A»",
        "forhold": [{"art": "presiserer", "vedtak": "ka-u1"}],
        "folge": "Ikke bygget",
        "sitat": [
            {
                "kilde": "hovedplanen",
                "tekst": "Et krav TE har trukket, kan ikke tas opp igjen med en oppdatering.",
            }
        ],
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
    assert (
        vr.les_avsnitt(vr.markdown(vr.tomllib.loads(vr.toml(importert)))) == importert
    )


def test_de_importerte_postene_har_tomme_felt_for_sporsmal(register):
    """Oppdragsgiver 12.10 (#413): spørsmålene finnes ikke for de eldre radene. Forholdene
    Følge sier uttrykkelig, føres (oppdragsgiver 12.10 i #423)."""
    for p in vr.poster(register):
        if not vr.er_ny(p):
            assert set(p) <= {"anker", "vedtak", "vedtatt", "folge", "forhold"}


@pytest.mark.parametrize(
    ("endring", "melding"),
    [
        (lambda p: p.pop("svar"), "mangler svar"),
        (lambda p: p.update(valgt="D"), "er ikke et alternativ"),
        (lambda p: p.update(id="xx-u1"), "formen AB-U1"),
        (lambda p: p.update(dato="12.10"), "TOML-dato"),
        (lambda p: p.update(kilde="#413"), "kilde skal være en liste"),
        (
            lambda p: p.update(forhold=[{"art": "erstatter", "vedtak": "ka-u1"}]),
            "ukjent forhold",
        ),
        (
            lambda p: p.update(forhold=[{"art": "endrer", "vedtak": "finnes-ikke"}]),
            "ikke er ankeret til et vedtak",
        ),
        (lambda p: p.update(id="KA-U1"), "står to ganger"),
        (lambda p: p.update(begrunnelse="x"), "ukjent felt begrunnelse"),
        (
            lambda p: p["alternativ"][0].update(forkastet=True),
            "det valgte alternativet er forkastet",
        ),
        (lambda p: p["alternativ"][0].update(tekst="TE | BH"), "har | uten"),
        (lambda p: p["alternativ"][0].update(tekst="TE  kan"), "dobbelt mellomrom"),
        (lambda p: p["sitat"][0].update(kilde="finnes/ikke.md"), "sitatkilden"),
        (
            lambda p: p.update(forhold=[{"art": "endrer", "vedtk": "ka-u1"}]),
            "forhold 1 mangler vedtak",
        ),
        (lambda p: p["alternativ"][1].pop("tekst"), "alternativ 2 mangler tekst"),
        (lambda p: p["sitat"][0].pop("tekst"), "sitat 1 mangler tekst"),
        (lambda p: p["sitat"][0].update(merknad="x"), "sitat 1: ukjent felt merknad"),
        (
            lambda p: p["alternativ"][1].update(forkastet="nei"),
            "forkastet skal være true eller false",
        ),
        (
            lambda p: p.update(dato=datetime.datetime(2026, 10, 12, 9)),
            "uten klokkeslett",
        ),
        (lambda p: p.update(kilde=[413]), "kilde skal være en liste"),
        (lambda p: p.update(id=5), "id skal være tekst"),
        (lambda p: p.update(alternativ=["A"]), "alternativ 1 er ikke en tabell"),
        (
            lambda p: p.update(alternativ={"navn": "A", "tekst": "x"}),
            "alternativ skal være en liste",
        ),
        (lambda p: p.update(forhold=["ka-u1"]), "forhold 1 er ikke en tabell"),
        (lambda p: p["alternativ"][0].update(navn=["A"]), "navn skal være tekst"),
        (lambda p: p["forhold"][0].update(art=["x"]), "art skal være tekst"),
        (lambda p: p["sitat"][0].update(kilde=5), "kilde skal være tekst"),
        (lambda p: p["sitat"][0].update(kilde="/etc/hostname"), "sitatkilden"),
        (lambda p: p["sitat"][0].update(kilde="../README.md"), "sitatkilden"),
    ],
)
def test_vakta_melder_feil_i_en_ny_post(grunnregister, endring, melding):
    post = ny_post()
    endring(post)
    feil = vr.valider(med(grunnregister, post))
    assert any(melding in f for f in feil), feil


def test_en_importert_post_kan_ikke_ha_felt_fra_en_ny(grunnregister):
    endret = copy.deepcopy(grunnregister)
    endret["gruppe"][0]["vedtak"][0]["sporsmal"] = "Skal TE kunne trekke kravet?"
    assert any(
        "ukjent felt sporsmal i en importert post" in f for f in vr.valider(endret)
    )


# --------------------------------------------------------------------------
# En ny post gjennom verktøyet
# --------------------------------------------------------------------------


def test_raden_for_en_ny_post_er_det_valgte_alternativet_ordrett(grunnregister):
    endret = med(grunnregister, ny_post())
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
                assert f"av [{p['id']}](#{vr.anker(p)})" in vr.folgecelle(
                    alle[f["vedtak"]], reg
                )


def test_henvisningen_kommer_forst_i_folge_hos_det_eldre_vedtaket(grunnregister):
    endret = med(grunnregister, ny_post())
    ka_u1 = next(p for p in vr.poster(endret) if vr.anker(p) == "ka-u1")
    folge = vr.folgecelle(ka_u1, endret)
    assert "Presisert 12.10 av [XX-U1](#xx-u1)." in folge
    assert folge.index("Presisert 12.10 av [XX-U1](#xx-u1).") < folge.index(
        "Presiserer SK-02"
    )


def test_to_senere_vedtak_samme_dag_med_samme_forhold(grunnregister):
    endret = med(grunnregister, ny_post())
    endret["gruppe"][0]["vedtak"].append(ny_post(id="XX-U2"))
    assert vr.valider(endret) == []
    ka_u1 = next(p for p in vr.poster(endret) if vr.anker(p) == "ka-u1")
    assert (
        "Presisert 12.10 av [XX-U1](#xx-u1). Presisert 12.10 av [XX-U2](#xx-u2)."
        in vr.folgecelle(ka_u1, endret)
    )


def test_vedtaksteksten_i_en_ny_post_har_ingen_kodenavn(register):
    """#413: gjelder nye poster. De importerte har kodenavn i dag og skrives ikke om."""
    assert vr.valider(register) == []
    assert [
        (p["id"], vr.kodenavn(p))
        for p in vr.poster(register)
        if vr.er_ny(p) and vr.kodenavn(p)
    ] == []


@pytest.mark.parametrize(
    "tekst",
    [
        "TE sender `grunnlag_opprettet`.",
        "BH sender `svar`.",
        "Saken er LUKKET_TRUKKET.",
        "Regelen i kanInngaaIEo gjelder.",
        "Feltet varsel_type avgjør.",
        "claims() avviser.",
        "Se kjerne/regler/eo.ts.",
    ],
)
def test_vakta_finner_kodenavn(tekst):
    post = ny_post()
    post["alternativ"][0]["tekst"] = tekst
    assert vr.kodenavn(post)


def test_vakta_finner_ikke_kodenavn_i_kontraktsbegreper():
    post = ny_post()
    post["alternativ"][0]["tekst"] = (
        "TE varsler etter § 33.8, jf. KA-U1 og B-13. BH svarer «avslått» i EO-saken."
    )
    assert vr.kodenavn(post) == []


# --------------------------------------------------------------------------
# Forholdene i de importerte postene (#423)
# --------------------------------------------------------------------------


def _post(register: dict, anker: str) -> dict:
    return next(p for p in vr.poster(register) if vr.anker(p) == anker)


def test_forholdene_i_de_importerte_postene_er_de_folge_sier_uttrykkelig(register):
    """Oppdragsgiver 12.10 i #423: de uttrykkelige forholdene føres, og de står begge veier
    unntatt dem i EN_VEI, som er lagt fram for oppdragsgiver."""
    assert vr.forholdfeil(register) == []


def test_et_importert_forhold_star_begge_veier_i_folge(register):
    """Uavhengig av leseren: lenken til vedtaket står hos posten, og lenken til posten hos
    vedtaket, for hvert importert forhold som ikke står i EN_VEI."""
    en_vei = {(a, art, b) for a, art, b, _ in vr.EN_VEI}
    antall = 0
    for p in vr.poster(register):
        for f in [] if vr.er_ny(p) else p.get("forhold", []):
            if (vr.anker(p), f["art"], f["vedtak"]) in en_vei:
                continue
            assert f"](#{f['vedtak']})" in vr.linje(p["folge"])
            assert f"](#{vr.anker(p)})" in vr.linje(
                _post(register, f["vedtak"])["folge"]
            )
            antall += 1
    assert antall > 0


@pytest.mark.parametrize(
    ("folge", "forhold"),
    [
        # Formene i #423.
        ("Presiserer [KA-U11](#ka-u11).", [("aktiv", "presiserer", "ka-u11")]),
        ("Endret 11.10 av [GR-U14](#gr-u14).", [("passiv", "endrer", "gr-u14")]),
        ("Utvidet 11.10 av [MM-U19](#mm-u19).", [("passiv", "utvider", "mm-u19")]),
        (
            "**Opphevet 2026-10-09 av [MM-U9](#mm-u9).** Var en sperre.",
            [("passiv", "opphever", "mm-u9")],
        ),
        (
            "Snevrer inn [KA-U6](#ka-u6), [KA-U13](#ka-u13) og [GR-U5](#gr-u5) til byggedel 3.",
            [
                ("aktiv", "snevrer inn", "ka-u6"),
                ("aktiv", "snevrer inn", "ka-u13"),
                ("aktiv", "snevrer inn", "gr-u5"),
            ],
        ),
        (
            "Presiserer og utvider [VS-U1](#vs-u1): etter svaret.",
            [("aktiv", "presiserer", "vs-u1"), ("aktiv", "utvider", "vs-u1")],
        ),
        (
            "Snevrer inn [KA-U1](#ka-u1) med en ny grunn, og presiserer [FO-U1](#fo-u1).",
            [("aktiv", "snevrer inn", "ka-u1"), ("aktiv", "presiserer", "fo-u1")],
        ),
        (
            "Presisert 11.10 av [KA-U26](#ka-u26) og [KA-U28](#ka-u28), og av [MM-U19](#mm-u19) for brev.",
            [
                ("passiv", "presiserer", "ka-u26"),
                ("passiv", "presiserer", "ka-u28"),
                ("passiv", "presiserer", "mm-u19"),
            ],
        ),
        (
            "Endret 11.10 av [GR-U14](#gr-u14) («a; b») og utvidet av [GR-U15](#gr-u15) (c).",
            [("passiv", "endrer", "gr-u14"), ("passiv", "utvider", "gr-u15")],
        ),
        (
            "Presiserer [KA-U1, pkt. 3: a](#ka-u1).",
            [("aktiv", "presiserer", "ka-u1")],
        ),
        # Annen tekst tolkes ikke.
        ("Presiserer KA-U8, KA-U11 og EO-U5.", []),
        ("MM-U4, som teksten viser til, er opphevet 09.10 av [MM-U9](#mm-u9).", []),
        ("En merking endrer ikke utfallet, etter [KA-U26](#ka-u26).", []),
        ("Presisert 10.10 for formatet av [HF-U2](#hf-u2).", []),
        ("Avgrenset 10.10 av [GR-U13](#gr-u13).", []),
        ("Raden sier «Endret 11.10 av [GR-U14](#gr-u14)» om pålegget.", []),
        ("I tråd med [KA-U14](#ka-u14). Ikke bygget.", []),
        (
            "Presisert 11.10 av [KA-U25](#ka-u25): presiserer [KA-U9](#ka-u9).",
            [("passiv", "presiserer", "ka-u25")],
        ),
    ],
)
def test_leseren_leser_bare_de_uttrykkelige_formuleringene(folge, forhold):
    assert vr.les_forhold(folge)[0] == forhold


@pytest.mark.parametrize(
    ("folge", "ulest"),
    [
        ("Presiserer KA-U8, KA-U11 og EO-U5.", True),
        ("MM-U4, som teksten viser til, er opphevet 09.10 av [MM-U9](#mm-u9).", True),
        ("Presiserer [KA-U17](#ka-u17) og brevteksten i [KA-U22](#ka-u22).", True),
        ("Presiserer [KA-U17](#ka-u17) og [KA-U22](#ka-u22).", False),
        ("Presiserer vedtaket om ny kravversjon 05.10.", False),
        ("I tråd med [KA-U14](#ka-u14).", False),
    ],
)
def test_leseren_melder_det_den_ikke_kan_lese(folge, ulest):
    """#423: hver formulering skriptet ikke kan lese entydig, listes for oppdragsgiver."""
    assert bool(vr.les_forhold(folge)[1]) is ulest


def test_verktoyet_skriver_ikke_forholdene_i_en_importert_post(register):
    """#423: forholdet står allerede i Følge, så raden blir lik byte for byte."""
    ka_u20 = _post(register, "ka-u20")
    assert ka_u20["forhold"]
    assert vr.folgecelle(ka_u20, register) == vr.linje(ka_u20["folge"])


@pytest.mark.parametrize(
    ("endring", "melding"),
    [
        (
            lambda r: _post(r, "ka-u20")["forhold"].append(
                {"art": "endrer", "vedtak": "gr-u2"}
            ),
            "ka-u20: forholdet «endrer #gr-u2» står i registeret, men ikke uttrykkelig i Følge",
        ),
        (
            lambda r: _post(r, "ka-u20")["forhold"].pop(0),
            "ka-u20: Følge sier «presiserer #ka-u16», men forholdet står ikke i registeret",
        ),
        (
            lambda r: _post(r, "ka-u12").update(
                folge=vr.linje(_post(r, "ka-u12")["folge"]).replace(
                    "Presisert 10.10 av [KA-U17](#ka-u17)", "Presisert 10.10 av KA-U17"
                )
            ),
            "ka-u17 presiserer #ka-u12: står bare hos ka-u17",
        ),
        (
            lambda r: _post(r, "ka-u15").update(
                folge="Presiserer [KA-U12](#ka-u12). "
                + vr.linje(_post(r, "ka-u15")["folge"])
            ),
            "ka-u15 presiserer #ka-u12: står i EN_VEI, men ikke bare én vei i Følge",
        ),
    ],
)
def test_vakta_melder_forhold_som_ikke_stemmer_med_folge(register, endring, melding):
    endret = copy.deepcopy(register)
    endring(endret)
    assert melding in vr.forholdfeil(endret)


@pytest.mark.parametrize(
    ("tillegg", "melding"),
    [
        (
            " Presiserer [KA-U1](#finnes-ikke).",
            "ka-u20: «presiserer» viser til #finnes-ikke, som ikke er et vedtak",
        ),
        (
            " Endrer [KA-U20](#ka-u20).",
            "ka-u20: forholdet viser til vedtaket selv",
        ),
        (
            " Presisert 13.10 av [HF-U3](#hf-u3).",
            "ka-u20: «Presisert av #hf-u3» står i teksten, men #hf-u3 er en ny post",
        ),
    ],
)
def test_vakta_melder_et_uttrykkelig_forhold_som_ikke_kan_fores(
    register, tillegg, melding
):
    """En lenke som ikke kan bli et forhold, er en feil, ikke bare en linje i listen (#423)."""
    endret = copy.deepcopy(register)
    ka_u20 = _post(endret, "ka-u20")
    ka_u20["folge"] = vr.linje(ka_u20["folge"]) + "." + tillegg
    assert melding in vr.forholdfeil(endret)


def test_en_passiv_lenke_til_en_ny_post_er_feil_ogsaa_i_en_rad_uten_anker(register):
    endret = copy.deepcopy(register)
    uten_anker = next(
        p for p in vr.poster(endret) if not vr.er_ny(p) and not vr.anker(p)
    )
    uten_anker["folge"] = (
        vr.linje(uten_anker["folge"]) + ". Presisert 13.10 av [HF-U3](#hf-u3)."
    )
    assert any("#hf-u3 er en ny post" in f for f in vr.forholdfeil(endret))


@pytest.mark.parametrize(
    ("forhold", "melding"),
    [
        ({"art": "erstatter", "vedtak": "ka-u1"}, "ukjent forhold"),
        (
            {"art": "endrer", "vedtak": "finnes-ikke"},
            "som ikke er ankeret til et vedtak",
        ),
        ({"art": "endrer", "vedtak": "ka-u20"}, "viser til vedtaket selv"),
        ({"art": "endrer"}, "forhold 5 mangler vedtak"),
    ],
)
def test_vakta_melder_feil_i_forholdet_i_en_importert_post(register, forhold, melding):
    endret = copy.deepcopy(register)
    _post(endret, "ka-u20")["forhold"].append(forhold)
    feil = vr.valider(endret)
    assert any(melding in f for f in feil), feil


# --------------------------------------------------------------------------
# Kildene: grunnlaget på main og NS 8407
# --------------------------------------------------------------------------


def test_vakta_melder_endret_vedtak_og_fjernet_rad(plan):
    endret = plan.replace(
        "Delvis enighet er ikke aksept |", "Delvis enighet er aksept |", 1
    )
    uten_rad = plan.replace(
        next(linje for linje in plan.splitlines() if linje.startswith("| P6: ")) + "\n",
        "",
    )
    assert [f.split(":")[0] for f in vr.endrede_rader(plan, endret)] == ["ka-u1"]
    assert [f.split(":")[0] for f in vr.endrede_rader(plan, uten_rad)] == ["P6"]
    assert vr.endrede_rader(plan, plan) == []


def test_hvert_anker_i_hovedplanen_star_en_gang(plan):
    assert vr.doble_ankre(plan) == []
    assert vr.doble_ankre(plan + '<a id="ka-u1"></a>') == [
        "ankeret «ka-u1» står 2 ganger i hovedplanen"
    ]


def test_det_registeret_forer_holder_mot_main(register, plan):
    """Vedtaket, ankeret og vedtaksdatoen i hver rad på main står uendret. En ny post føres ikke i importert form, tar ikke en ID som er i bruk, og spørsmålet,
    alternativene og svaret i en merget post endres ikke. Sitatene står ordrett i kilden."""
    assert vr.historiske_feil(register, plan, None) == []
    grunnlag = vr.grunnlag()
    if grunnlag is None or vr.git_fil(grunnlag, vr.HOVEDPLAN_I_GIT) is None:
        _uten_historikk("Grunnlaget på main finnes ikke lokalt.")
    assert vr.historiske_feil(register, plan, grunnlag) == []


def test_vakta_melder_ny_post_i_importert_form(grunnregister, grunnplan):
    endret = copy.deepcopy(grunnregister)
    endret["gruppe"][0]["vedtak"].append(
        {
            "anker": "zz-u9",
            "vedtak": "ZZ-U9: `kode_navn`",
            "vedtatt": "12.10",
            "folge": "x",
        }
    )
    assert vr.valider(endret) == []
    assert vr.mot_grunnlag(endret, grunnplan, None) == [
        "zz-u9: en importert post som ikke står i 3.1 på main; et nytt vedtak føres som ny post"
    ]
    assert vr.mot_grunnlag(grunnregister, grunnplan, None) == []


def test_vakta_melder_kopi_av_en_rad_uten_anker(grunnregister, grunnplan):
    endret = copy.deepcopy(grunnregister)
    kopi = copy.deepcopy(next(p for p in vr.poster(endret) if "anker" not in p))
    endret["gruppe"][0]["vedtak"].append(kopi | {"folge": "x"})
    assert vr.valider(endret) == []
    assert len(vr.mot_grunnlag(endret, grunnplan, None)) == 1


@pytest.mark.parametrize("id_", ["SK-12", "MG-02", "B-13", "AF-06"])
def test_vakta_melder_id_som_er_i_bruk(grunnregister, grunnplan, id_):
    """Også ID-er uten anker, som SK-12, og ID-er utenfor 3.1."""
    feil = vr.mot_grunnlag(
        med(grunnregister, ny_post(id=id_, forhold=[])), grunnplan, None
    )
    assert f"{id_}: ID-en står i hovedplanen på main fra før" in feil


def test_en_merget_ny_post_har_ledig_id_og_kan_bare_endre_folge(
    grunnregister, grunnplan
):
    merget = med(grunnregister, ny_post())
    gammel_plan = vr.plan_med(merget, grunnplan)
    senere = copy.deepcopy(merget)
    senere["gruppe"][0]["vedtak"][-1]["folge"] = "Bygget 13.10"
    assert vr.mot_grunnlag(senere, gammel_plan, merget) == []
    for felt, verdi in (
        ("svar", "«B»"),
        ("sporsmal", "Et annet spørsmål?"),
        ("kilde", ["#414"]),
    ):
        endret = copy.deepcopy(merget)
        endret["gruppe"][0]["vedtak"][-1][felt] = verdi
        assert vr.mot_grunnlag(endret, gammel_plan, merget) == [
            "XX-U1: spørsmålet, alternativene, svaret eller et annet felt enn folge er endret etter merge"
        ]
    assert vr.mot_grunnlag(grunnregister, gammel_plan, merget) == [
        "XX-U1: posten er fjernet fra registeret"
    ]


def test_ns_8407_kan_leses_fra_den_private_kilden():
    ns_8407 = _ns_8407()
    assert "33.8 Forsering ved uberettiget avslag" in ns_8407


def test_vakta_melder_sitat_som_ikke_star_i_kilden(grunnregister, grunnplan):
    def kilder(ns_8407=None, hovedplanen=grunnplan):
        return {"ns8407": ns_8407, "hovedplanen": hovedplanen}.get

    riktig = med(grunnregister, ny_post())
    assert vr.sitatfeil(riktig, kilder()) == []
    post = ny_post(sitat=[{"kilde": "hovedplanen", "tekst": "TE kan trekke kravet."}])
    endret = med(grunnregister, post)
    assert vr.sitatfeil(endret, kilder(hovedplanen=vr.plan_med(endret, grunnplan))) == [
        "XX-U1: sitatet «TE kan trekke kravet.» står ikke ordrett i hovedplanen på main"
    ], "Raden til posten selv skal ikke telle som kilde"
    post = ny_post(sitat=[{"kilde": "ns8407", "tekst": "TE skal forsere"}])
    feil = vr.sitatfeil(
        med(grunnregister, post), kilder(ns_8407="TE kan velge å forsere")
    )
    assert any("står ikke i spørsmålet" in f for f in feil) and any(
        "ordrett i ns8407 på main" in f for f in feil
    )


def test_sitatet_proves_mot_main_ikke_mot_treet(grunnregister, grunnplan):
    """Et sitat fra hovedplanen kan ikke få kilden sin i samme PR."""
    post = ny_post(
        sporsmal="Vedtaket sier «Et nytt utsagn i samme PR».",
        sitat=[{"kilde": "hovedplanen", "tekst": "Et nytt utsagn i samme PR"}],
    )
    endret = med(grunnregister, post)
    i_treet = vr.plan_med(endret, grunnplan).replace(
        "### 3.2 ", "Et nytt utsagn i samme PR\n\n### 3.2 ", 1
    )
    assert vr.sitatfeil(endret, {"hovedplanen": i_treet}.get) == []
    assert vr.sitatfeil(endret, {"hovedplanen": grunnplan}.get) == [
        "XX-U1: sitatet «Et nytt utsagn i samme PR» står ikke ordrett i hovedplanen på main"
    ]
    assert vr.kilder_paa(None)("hovedplanen") is None


def test_sitat_fra_en_fil_som_ikke_finnes_paa_main_er_feil(grunnregister):
    post = ny_post(
        sporsmal="Koden sier «Hei verden».",
        sitat=[{"kilde": "ny/fil.md", "tekst": "Hei verden"}],
    )
    assert vr.sitatfeil(med(grunnregister, post), {"ny/fil.md": ""}.get) == [
        "XX-U1: sitatet «Hei verden» står ikke ordrett i ny/fil.md på main"
    ]


def test_sitatene_i_en_merget_post_proves_ikke_igjen(grunnregister):
    """Kilden kan endres etter merge, og sitatet kan ikke; posten ble prøvd da den ble ført."""
    endret = med(grunnregister, ny_post())
    assert vr.sitatfeil(endret, {"hovedplanen": ""}.get) != []
    assert vr.sitatfeil(endret, {"hovedplanen": ""}.get, frozenset({"XX-U1"})) == []


def test_en_gyldig_ny_post_i_det_levende_registeret(register, plan):
    """Det levende registeret med en ny post til: alle kontrollene holder, også mot main
    før og etter merge. Fanger at en kontroll bare holder for registeret slik det er nå."""
    endret = med(register, ny_post(id="ZZ-U99"))
    ny_plan = vr.plan_med(endret, plan)
    assert vr.valider(endret) == []
    assert vr.kodenavn(endret["gruppe"][0]["vedtak"][-1]) == []
    assert vr.doble_ankre(ny_plan) == []
    assert vr.endrede_rader(plan, ny_plan) == []
    assert vr.endret_rundt_vedtakene(plan, ny_plan) == []
    assert vr.mot_grunnlag(endret, plan, register) == []
    assert vr.sitatfeil(endret, {"hovedplanen": plan}.get) == []
    senere = copy.deepcopy(endret)
    senere["gruppe"][0]["vedtak"][-1]["folge"] = "Bygget 13.10"
    senere_plan = vr.plan_med(senere, plan)
    assert vr.endrede_rader(ny_plan, senere_plan) == []
    assert vr.endret_rundt_vedtakene(ny_plan, senere_plan, frozenset({"zz-u99"})) == []
    assert vr.mot_grunnlag(senere, ny_plan, endret) == []
    assert (
        vr.sitatfeil(senere, {"hovedplanen": ny_plan}.get, frozenset({"ZZ-U99"})) == []
    )


def test_svaret_nevner_det_valgte_alternativet(grunnregister):
    assert any(
        "svaret nevner ikke" in f
        for f in vr.valider(med(grunnregister, ny_post(svar="«B»")))
    )
    assert any(
        "svaret nevner ikke" in f
        for f in vr.valider(med(grunnregister, ny_post(svar="«Alt»")))
    )


def _endre_i_avsnitt(plan: str, gammel: str, ny: str) -> str:
    start, slutt = vr.avsnitt(plan)
    assert plan[start:slutt].count(gammel) >= 1, gammel
    return plan[:start] + plan[start:slutt].replace(gammel, ny, 1) + plan[slutt:]


@pytest.mark.parametrize(
    ("gammel", "ny", "melding"),
    [
        ("Disse styrer implementeringen.", "Disse styrer.", "innledningen"),
        (
            "> sammen med tilbakekallingen.",
            "> sammen med noe annet.",
            "teksten etter gruppen",
        ),
        (
            "#### Premissene P1–P7",
            "#### Premissene",
            "er fjernet eller har fått ny tittel",
        ),
        (
            "Utføres i kontrakten av [KT-U1](#kt-u1) (08.10). ",
            "",
            "lenken [KT-U1](#kt-u1) er fjernet",
        ),
        (
            "Merknad 11.10 (oppdragsgiver):",
            "Merknad (oppdragsgiver):",
            "Følge er endret",
        ),
    ],
)
def test_vakta_melder_endring_rundt_vedtakene(plan, gammel, ny, melding):
    feil = vr.endret_rundt_vedtakene(plan, _endre_i_avsnitt(plan, gammel, ny))
    assert any(melding in f for f in feil), feil


def test_vakta_melder_rad_flyttet_til_en_annen_gruppe(plan):
    linje = next(linje for linje in plan.splitlines() if linje.startswith("| P6: "))
    flyttet = plan.replace(linje + "\n", "").replace(
        "#### Krav, kravversjon og trekk\n\n" + vr.TABELLHODE,
        "#### Krav, kravversjon og trekk\n\n" + vr.TABELLHODE + linje + "\n",
    )
    assert vr.endrede_rader(plan, flyttet) == []
    feil = vr.endret_rundt_vedtakene(plan, flyttet)
    assert len(feil) == 1 and feil[0].endswith(
        "raden er flyttet fra gruppen «Premissene P1–P7»"
    ), feil


def test_tekst_lagt_til_rundt_vedtakene_er_lov(plan):
    lagt_til = _endre_i_avsnitt(
        plan,
        "#### Premissene P1–P7",
        "> **Merknad 2026-10-13:** ny.\n\n#### Premissene P1–P7",
    )
    assert vr.endret_rundt_vedtakene(plan, lagt_til) == []


@pytest.mark.parametrize(
    ("sitat", "hele"),
    [
        ("Det kan lages etter at brevet er lagret", False),
        (
            "Det kan lages etter at brevet er lagret, men det bevares fra første gang det lages,",
            False,
        ),
        ("Et dokument som leveres, er en tro gjengivelse av den frosne teksten.", True),
        ("Et dokument som leveres, er en tro gjengivelse av den frosne teksten", True),
        ("en tro gjengivelse av den frosne teksten.", False),
    ],
)
def test_et_sitat_er_hele_setninger(plan, sitat, hele):
    tekst = vr.setningstekst(plan)
    assert sitat in tekst
    assert vr.hele_setninger(sitat, tekst) is hele


def test_et_halvt_sitat_slipper_bare_gjennom_som_utdrag(grunnregister, grunnplan):
    halvt = "Det kan lages etter at brevet er lagret"
    post = ny_post(
        sporsmal=f"LV-U2 sier «{halvt}».",
        sitat=[{"kilde": "hovedplanen", "tekst": halvt}],
    )
    assert any(
        "er ikke hele setninger" in f
        for f in vr.sitatfeil(med(grunnregister, post), {"hovedplanen": grunnplan}.get)
    )
    post["sitat"][0]["utdrag"] = True
    assert vr.sitatfeil(med(grunnregister, post), {"hovedplanen": grunnplan}.get) == []


def test_et_halvt_sitat_fra_ns_8407_er_feil():
    ns_8407 = _ns_8407()
    tekst = vr.setningstekst(ns_8407)
    assert vr.hele_setninger("33.8 Forsering ved uberettiget avslag", tekst)
    assert not vr.hele_setninger("ved uberettiget avslag", tekst)


@pytest.mark.parametrize(
    ("gammel", "ny"),
    [
        ("Presiserer KA-U8, KA-U11 og EO-U5", "Endrer KA-U8, KA-U11 og EO-U5"),
        (
            "Presisert 10.10 av [KA-U15](#ka-u15):",
            "Opphevet 10.10 av [KA-U15](#ka-u15):",
        ),
        ("Hvor langt avkallet rekker, står i", "Hvor langt avkallet rekker, sto i"),
    ],
)
def test_vakta_melder_endret_folge_i_en_importert_rad(plan, gammel, ny):
    feil = vr.endret_rundt_vedtakene(plan, _endre_i_avsnitt(plan, gammel, ny))
    assert any("Følge er endret" in f for f in feil), feil


def test_folge_i_en_importert_rad_kan_fa_henvisninger_forst_og_tekst_til_slutt():
    gammel = "Presisert 10.10 av [KA-U15](#ka-u15). Ikke bygget"
    for ny in (
        "Presisert 10.10 av [KA-U15](#ka-u15). Presisert 13.10 av [XX-U1](#xx-u1). Ikke bygget",
        "Presisert 10.10 av [KA-U15](#ka-u15). Ikke bygget. Bygget 14.10",
    ):
        assert vr.folge_bare_lagt_til(gammel, ny), ny
    for ny in (
        "Presisert 13.10 av [XX-U1](#xx-u1). Ikke bygget",
        "Presisert 13.10 av [XX-U1](#xx-u1). Presisert 10.10 av [KA-U15](#ka-u15). Delvis bygget",
        "Ny tekst. Presisert 10.10 av [KA-U15](#ka-u15). Ikke bygget",
    ):
        assert not vr.folge_bare_lagt_til(gammel, ny), ny


def test_ny_tekst_rundt_vedtakene_ma_vaere_hele_avsnitt(plan):
    midt_i = _endre_i_avsnitt(
        plan, "avgjort med\n> [HF-U1](#hf-u1)", "avgjort med\n> ikke\n> [HF-U1](#hf-u1)"
    )
    assert any(
        "tekst er endret eller fjernet" in f
        for f in vr.endret_rundt_vedtakene(plan, midt_i)
    )


def test_svaret_nevner_ikke_et_annet_alternativ(grunnregister):
    feil = vr.valider(med(grunnregister, ny_post(svar="«A, ikke B»")))
    assert any("svaret nevner også alternativ B" in f for f in feil), feil


@pytest.mark.parametrize(
    ("sitat", "kilde"),
    [
        ("Vedtakene står i 3.1.", "Bold"),
        (
            "lagringsformatet er avgjort med [HF-U1](#hf-u1) og [HF-U2](#hf-u2).",
            "Merknad",
        ),
        (
            "TEs aksept gjelder hele det konkrete svaret byggherren har gitt på gjeldende kravversjon i sporet,",
            "ID først",
        ),
    ],
)
def test_hele_setninger_etter_fet_skrift_kolon_og_anker(plan, sitat, kilde):
    tekst = vr.setningstekst(plan)
    assert sitat in tekst, kilde
    if kilde == "ID først":
        assert (
            vr.hele_setninger(
                "KA-U1: " + sitat[:-1] + " med alle standpunktene i det:", tekst
            )
            is False
        )
        sitat = "KA-U1: TEs aksept gjelder hele det konkrete svaret byggherren har gitt på gjeldende kravversjon i sporet, med alle standpunktene i det: preklusjon, vilkår, beløp eller dager og subsidiære standpunkter."
    assert vr.hele_setninger(sitat, tekst), kilde


def test_forste_setning_etter_en_overskrift_i_ns_8407():
    ns_8407 = _ns_8407()
    tekst = vr.setningstekst(ns_8407)
    assert vr.hele_setninger(
        "Når parten har grunnlag for å beregne omfanget, skal han uten ugrunnet opphold angi og "
        "begrunne det antall dager han krever som fristforlengelse.",
        tekst,
    )
