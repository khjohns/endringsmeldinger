"""Vedtaksregisteret, docs/vedtaksregister/vedtak.toml, og vedtaksfila docs/plans/vedtak.md (#413, #1020).

Vedtaksfila var avsnitt 3.1 i hovedplanen. De syntetiske testene leser 3.1 i den formen
den hadde der (vr.logisk()), som kontrollene mot main gjør.

Testene som leser grunnlaget på main i historikken, hoppes over med en melding når
den mangler lokalt, og feiler i CI, som henter den. Testene som leser NS
8407-teksten, hoppes over når klonen av det private repoet khjohns/kontrakt
mangler, også i CI. De kjøres lokalt før en PR som fører et vedtak (#424).
"""

import copy
import datetime
import os
import pathlib

import pytest

from verktoymoduler import last

ROT = pathlib.Path(__file__).resolve().parents[3]


vr = last("vedtaksregister")


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
def plan(register):
    """3.1 slik den sto i hovedplanen, laget av registeret."""
    return vr.logisk(register)


@pytest.fixture(scope="module")
def hovedplan():
    return vr.HOVEDPLAN.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def grunnregister(register):
    """Registeret med bare de importerte postene. De syntetiske testene bygger på det, så de
    ikke påvirkes av de nye postene som føres senere."""
    grunn = copy.deepcopy(register)
    for g in grunn["gruppe"]:
        g["vedtak"] = [p for p in g["vedtak"] if not vr.er_ny(p)]
        for p in g["vedtak"]:
            # Det andre hjemmet kan være en ny post (#1534).
            p.pop("bindende_i", None)
            # «samler» og «bygger på» er ført etter importen (steg 3b i #1534).
            if "forhold" in p:
                p["forhold"] = [f for f in p["forhold"] if f["art"] in vr.FORHOLD_I_FOLGE]
    return grunn


@pytest.fixture(scope="module")
def grunnplan(grunnregister):
    return vr.logisk(grunnregister)


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
        "klasse": "vedtak",
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


def test_vedtaksfila_er_generert_fra_registeret(register):
    assert vr.VEDTAKSFIL.read_text(encoding="utf-8") == vr.vedtaksfil(register), (
        "Vedtaksfila er ikke lik registeret. Rett i docs/vedtaksregister/vedtak.toml "
        "og kjør python3 docs/verktoy/vedtaksregister.py."
    )


def test_3_1_leses_tilbake_byte_for_byte(plan):
    """Oppdragsgiver 12.10 (#413): radene i 3.1 står ordrett, også merknadene og radene uten
    anker. Kontrollene mot main leser 3.1 tilbake, så lesingen må gjenskape teksten."""
    tekst = plan[slice(*vr.avsnitt(plan))]
    assert vr.markdown(vr.les_avsnitt(tekst)) == tekst


def test_hovedplanen_har_ikke_lenger_vedtakene(hovedplan, register):
    """#1020: vedtakene står bare i vedtaksfila, og 3.1 i hovedplanen viser dit."""
    assert not set(vr.ankre_i(hovedplan)) & set(vr.ankre_i(vr.markdown(register)))
    stubb = hovedplan[slice(*vr.avsnitt(hovedplan))]
    assert "](vedtak.md)" in stubb and "|" not in stubb


def test_en_lenke_til_et_anker_utenfor_3_1_gaar_til_hovedplanen(grunnregister):
    """#1020: vedtaksfila ligger ved siden av planen, så filstiene står. Et anker i 3.1 er i
    vedtaksfila, og et annet anker er i hovedplanen."""
    endret = copy.deepcopy(grunnregister)
    endret["innledning"] += (
        "Se [KA-U1](#ka-u1), [B-12](#b-12-merknad-2026-10-11), [koden](../../kjerne/), "
        f"[lenke](<#ka-u1>), [GR-U2]({vr.HOVEDPLAN.name}#gr-u2), "
        f"[GR-U4](./{vr.HOVEDPLAN.name}#gr-u4) og [GR-U5](/docs/plans/{vr.HOVEDPLAN.name}#gr-u5).\n\n"
    )
    tekst = vr.vedtaksfil(endret)
    assert tekst.startswith(vr.VEDTAKSHODE)
    assert (
        "Se [KA-U1](#ka-u1), "
        f"[B-12]({vr.HOVEDPLAN.name}#b-12-merknad-2026-10-11), [koden](../../kjerne/), "
        "[lenke](<#ka-u1>), [GR-U2](#gr-u2), [GR-U4](#gr-u4) og [GR-U5](#gr-u5)."
    ) in tekst


def test_de_importerte_postene_har_tomme_felt_for_sporsmal(register):
    """Oppdragsgiver 12.10 (#413): spørsmålene finnes ikke for de eldre radene. Forholdene
    Følge sier uttrykkelig, føres (oppdragsgiver 12.10 i #423), og klassen med delene
    (#1534)."""
    for p in vr.poster(register):
        if not vr.er_ny(p):
            assert set(p) <= {"anker", "vedtak", "vedtatt", "folge", "forhold"} | vr.KLASSEFELT


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
    vedtaket, for hvert importert forhold som ikke står i EN_VEI. «samler» og «bygger på»
    skriver verktøyet, så de står ikke i Følge i den importerte posten."""
    en_vei = {(a, art, b) for a, art, b, _ in vr.EN_VEI}
    antall = 0
    for p in vr.poster(register):
        for f in [] if vr.er_ny(p) else p.get("forhold", []):
            if (vr.anker(p), f["art"], f["vedtak"]) in en_vei or f["art"] not in vr.FORHOLD_I_FOLGE:
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
    """#423: forholdet står allerede i Følge, så raden blir lik byte for byte.

    Posten er en importert post med forhold som ingen ny post har forhold til; KA-U20
    fikk et senere forhold 01.11 (OV-U79)."""
    _, senere = vr.indeks(register)
    importert = next(
        p
        for p in vr.poster(register)
        if not vr.er_ny(p) and p.get("forhold") and vr.anker(p) not in senere
    )
    assert vr.folgecelle(importert, register) == vr.linje(importert["folge"])


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


def test_doble_ankre_finner_et_anker_som_staar_to_ganger(plan):
    assert vr.doble_ankre(plan) == []
    assert vr.doble_ankre(plan + '<a id="ka-u1"></a>') == [
        "ankeret «ka-u1» står 2 ganger i hovedplanen og vedtaksfila"
    ]


def test_et_anker_i_hovedplanen_kan_ikke_vaere_et_vedtak(register, hovedplan):
    """#1020: en lenke til et vedtaksanker skrives om til vedtaksfila, så ankeret kan ikke stå i
    hovedplanen også."""
    assert vr.historiske_feil(register, hovedplan, None) == []
    assert "ankeret «ka-u1» står 2 ganger i hovedplanen og vedtaksfila" in vr.historiske_feil(
        register, hovedplan + '<a id="ka-u1"></a>', None
    )


def test_det_registeret_forer_holder_mot_main(register, hovedplan):
    """Vedtaket, ankeret og vedtaksdatoen i hver rad på main står uendret. En ny post føres ikke i importert form, tar ikke en ID som er i bruk, og spørsmålet,
    alternativene og svaret i en merget post endres ikke. Sitatene står ordrett i kilden."""
    assert vr.historiske_feil(register, hovedplan, None) == []
    grunnlag = vr.grunnlag()
    if grunnlag is None or vr.git_fil(grunnlag, vr.HOVEDPLAN_I_GIT) is None:
        _uten_historikk("Grunnlaget på main finnes ikke lokalt.")
    assert vr.historiske_feil(register, hovedplan, grunnlag) == []


def test_vakta_melder_ny_post_i_importert_form(grunnregister, grunnplan):
    endret = copy.deepcopy(grunnregister)
    endret["gruppe"][0]["vedtak"].append(
        {
            "anker": "zz-u9",
            "vedtak": "ZZ-U9: `kode_navn`",
            "vedtatt": "12.10",
            "folge": "x",
            "klasse": "vedtak",
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


@pytest.mark.parametrize("id_", ["SK-12", "MG-02", "B-13", "AF-06", "AP-01"])
def test_vakta_melder_id_som_er_i_bruk(grunnregister, grunnplan, hovedplan, id_):
    """Også ID-er uten anker, som SK-12, ID-er i hovedplanen utenfor 3.1, og et avsluttet
    funn i arkivet, som AP-01 (#1020)."""
    arkiv = vr.ARKIV.read_text(encoding="utf-8")
    feil = vr.mot_grunnlag(
        med(grunnregister, ny_post(id=id_, forhold=[])),
        grunnplan,
        None,
        "\n".join([hovedplan, arkiv, grunnplan]),
    )
    assert f"{id_}: ID-en står i hovedplanen, arkivet eller vedtaksfila på main fra før" in feil


def test_en_merget_ny_post_har_ledig_id_og_kan_bare_endre_folge(
    grunnregister, grunnplan
):
    merget = med(grunnregister, ny_post())
    gammel_plan = vr.logisk(merget)
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
            "XX-U1: spørsmålet, alternativene, svaret eller et annet felt enn folge, "
            "forholdene og klassen er endret etter merge"
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
    assert vr.sitatfeil(endret, kilder(hovedplanen=vr.logisk(endret))) == [
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
    i_treet = vr.logisk(endret).replace(
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
    ny_plan = vr.logisk(endret)
    assert vr.valider(endret) == []
    assert vr.kodenavn(endret["gruppe"][0]["vedtak"][-1]) == []
    assert vr.doble_ankre(ny_plan) == []
    assert vr.endrede_rader(plan, ny_plan) == []
    assert vr.endret_rundt_vedtakene(plan, ny_plan) == []
    assert vr.mot_grunnlag(endret, plan, register) == []
    assert vr.sitatfeil(endret, {"hovedplanen": plan}.get) == []
    senere = copy.deepcopy(endret)
    senere["gruppe"][0]["vedtak"][-1]["folge"] = "Bygget 13.10"
    senere_plan = vr.logisk(senere)
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


def _med_anbefalt(*navn: str, **endringer) -> dict:
    post = ny_post(**endringer)
    for a in post["alternativ"]:
        if a["navn"] in navn:
            a["anbefalt"] = True
    return post


@pytest.mark.parametrize("svar", [
    "Ja til anbefalingen",
    "Ja til alle anbefalingene, merge #481",
    "Ja til anbefalingen. Det er ikke nødvendig å vente.",
    "Ja til anbefalingen. I dag er det ikke nødvendig å vente.",
    "Ja til anbefalingen, jf. NS 8407. Det er ikke nødvendig å vente.",
    "Svar: Ja til anbefalingen",
    "«Ja til anbefalingen»",
])
def test_svaret_kan_slutte_seg_til_anbefalingen_naar_det_valgte_er_anbefalt(grunnregister, svar):
    """#486: svaret nevner ingen bokstav, men det valgte alternativet er det anbefalte.

    #759: et forbeholdsord i en senere setning hindrer ikke, og setningen kan begynne
    etter et kolon eller et anførselstegn. #861: punktumet etter en forkortelse slutter
    ikke setningen.
    """
    assert vr.valider(med(grunnregister, _med_anbefalt("A", svar=svar))) == []


@pytest.mark.parametrize("svar", [
    "Nei, ikke anbefalingen",
    "Ja, men ikke anbefalingen",
    "Ja, men ikkje anbefalingen",
    "Ja til anbefalingen, ikkje for punkt 2",
    "Ja, anbefalingen er feil",
    "Ja til anbefalingen unntatt punkt 2",
    "Ja til alle anbefalingene. Men ikke for punkt 3",
    "Nei. Ja til anbefalingen bare om B faller bort",
    "Ja til anbefalingen, med forbehold om punkt 2",
    "Ja til anbefalingen dersom B faller bort",
    "Ja til anbefalingen hvis B faller bort",
    "Ja til anbefalingen kun for punkt 1",
    "Ja til anbefalingen med mindre B faller bort",
    "Ja til anbefalingen så nær som punkt 2",
    "Ja til anbefalingen. Punkt 3 skal ikke med.",
    "Ja til anbefalingen. B skal ikke med.",
    "Ja til anbefalingen, jf. pkt. 2, men ikke punkt 3.",
    "Ja",
])
def test_et_svar_som_avviser_eller_tar_forbehold_slutter_seg_ikke_til_anbefalingen(grunnregister, svar):
    """#604, #759: svaret må da nevne det valgte alternativet, selv om det er det anbefalte.

    #861: også når forbeholdet står i en senere setning om et punkt eller et alternativ,
    eller etter en forkortelse som «jf.» i samme setning.
    """
    feil = vr.valider(med(grunnregister, _med_anbefalt("A", svar=svar)))
    assert any(f.startswith("XX-U1: svaret nevner ikke det valgte alternativet «A»") for f in feil), feil


@pytest.mark.parametrize("svar", [
    "Ja til anbefalingen. Vedlegg D er ikke oppdatert.",
    "Ja til anbefalingen. Tabell H viser bare tallene.",
])
def test_et_forbeholdsord_i_en_senere_setning_om_noe_annet_enn_et_alternativ_hindrer_ikke(
    grunnregister, svar
):
    """#925 punkt 3: en stor bokstav som ikke er et av postens alternativer, gjør ikke
    setningen til et forbehold om anbefalingen."""
    assert vr.valider(med(grunnregister, _med_anbefalt("A", svar=svar))) == []


@pytest.mark.parametrize("svar, ordet", [
    ("Ja til anbefalingen. Anbefalingen er bare en formalitet.", "bare"),
    ("Ja til anbefalingen. Punkt 3 er ikke kontroversielt.", "ikke"),
])
def test_et_forbeholdsord_i_en_senere_setning_om_et_punkt_gir_forbehold_med_vilje(
    grunnregister, svar, ordet
):
    """#925 punkt 2, valg A: regelen leser ordet, ikke meningen, og feilen går i den
    trygge retningen. Testen låser utfallet; svaret må da nevne alternativet."""
    assert (
        f"XX-U1: svaret nevner ikke det valgte alternativet «A», og «{ordet}» gjør at svaret "
        "ikke slutter seg til anbefalingen"
    ) in vr.valider(med(grunnregister, _med_anbefalt("A", svar=svar)))


@pytest.mark.parametrize("svar", [
    "Ja til anbefalingen. Vent med tilpasset bestilling, den skal ikke med.",
    "Ja til anbefalingen. TILPASSET BESTILLING skal ikke med.",
])
def test_et_alternativ_med_flere_ord_kjennes_igjen_uten_hensyn_til_store_bokstaver(svar):
    """#958: setningen gjelder alternativet «Tilpasset bestilling» også med liten forbokstav."""
    assert vr._forbeholdet(svar, ["Standard bestilling", "Tilpasset bestilling"]) == "ikke"


def test_en_enkelt_liten_bokstav_er_ikke_et_alternativ_med_stor_bokstav():
    """#958: «i» er en preposisjon, ikke alternativ I."""
    svar = "Ja til anbefalingen. Det er ikke behov for mer i dag."
    assert vr._forbeholdet(svar, ["H", "I"]) is None


@pytest.mark.parametrize("svar, ordet", [
    ("Nei. Ja til anbefalingen bare om B faller bort", "bare"),
    ("Ja til anbefalingen, med forbehold om punkt 2", "forbehold"),
    ("Ja til alle anbefalingene. Men ikke for punkt 3", "Men"),
    ("Ja til anbefalingen så nær som punkt 2", "så nær som"),
])
def test_feilmeldingen_nevner_forbeholdsordet_som_hindrer_tilslutningen(grunnregister, svar, ordet):
    """#759: ordet i setningen med «Ja til anbefalingen» går foran et ord i setningen før."""
    feil = vr.valider(med(grunnregister, _med_anbefalt("A", svar=svar)))
    assert (
        f"XX-U1: svaret nevner ikke det valgte alternativet «A», og «{ordet}» gjør at svaret "
        "ikke slutter seg til anbefalingen"
    ) in feil, feil


@pytest.mark.parametrize("anbefalte, grunn", [
    ([], ", og ingen alternativer er merket anbefalt"),
    (["C"], ", og det valgte alternativet er ikke det anbefalte"),
    (["A", "C"], ", og mer enn ett alternativ er anbefalt"),
])
def test_feilmeldingen_sier_hvorfor_svaret_ikke_slutter_seg_til_det_valgte(
    grunnregister, anbefalte, grunn
):
    post = _med_anbefalt(*anbefalte, svar="Ja til anbefalingen")
    assert f"XX-U1: svaret nevner ikke det valgte alternativet «A»{grunn}" in vr.valider(
        med(grunnregister, post)
    )


def test_mer_enn_ett_anbefalt_alternativ_gir_feil(grunnregister):
    post = _med_anbefalt("A", "C", svar="Ja til anbefalingen")
    assert "XX-U1: mer enn ett alternativ er anbefalt" in vr.valider(med(grunnregister, post))


def test_et_alternativ_kan_ikke_vaere_baade_anbefalt_og_forkastet(grunnregister):
    """#604: gjelder hvert alternativ, ikke bare det valgte."""
    post = _med_anbefalt("C", svar="A")
    post["alternativ"][2]["forkastet"] = True
    assert vr.valider(med(grunnregister, post)) == ["XX-U1: alternativ C er både anbefalt og forkastet"]


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
    "gammel",
    ["Merknaden.\n", "Merknaden.\n\n", "> Første.\n>\n> Andre.\n"],
)
def test_nytt_avsnitt_etter_tekst_med_linjeskift_paa_slutten_er_lov(gammel):
    """Teksten etter en gruppe slutter med linjeskift. Et nytt avsnitt etter den er lagt
    til og ikke en endring (PR #1564, PR #1565)."""
    assert vr._bare_lagt_til(gammel, gammel.rstrip("\n") + "\n\nNytt avsnitt.\n")
    assert not vr._bare_lagt_til(gammel, "Endret.\n\nNytt avsnitt.\n")


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
    feil = vr.valider(med(grunnregister, ny_post(svar="«A eller C»")))
    assert any("svaret nevner også alternativ C" in f for f in feil), feil


@pytest.mark.parametrize(
    "svar",
    [
        "«A, ikke B»",
        "A, sammen med 2b-C. «Ja»",
        "A, sammen med 5-C. «Ja»",
        "A, sammen med 2B-C. «Ja»",
        "A, sammen med 2b–C. «Ja»",
    ],
)
def test_svaret_kan_omtale_et_forkastet_alternativ_og_et_annet_sporsmal(grunnregister, svar):
    """B er forkastet i ny_post. «2b-C» og «5-C» er alternativer i andre spørsmål."""
    feil = vr.valider(med(grunnregister, ny_post(svar=svar)))
    assert not any("svaret nevner også alternativ" in f for f in feil), feil


@pytest.mark.parametrize(
    "svar",
    [
        "A, sammen med 2b-C, eller C",
        "2b-A, eller 2b-C",
        "A eller 26.10-C",
        "A, og fra OV-U49-C",
    ],
)
def test_et_sporsmalsnummer_skjuler_ikke_et_annet_valg(grunnregister, svar):
    """Samme nummer som foran det valgte, eller et tall i en dato eller en ID, er ikke et annet
    spørsmål."""
    feil = vr.valider(med(grunnregister, ny_post(svar=svar)))
    assert any("svaret nevner også alternativ C" in f for f in feil), feil


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
def test_hele_setninger_etter_fet_skrift_kolon_og_anker(plan, hovedplan, sitat, kilde):
    tekst = vr.setningstekst(hovedplan + "\n\n" + plan)
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


# --------------------------------------------------------------------------
# Klassen, delene og det andre hjemmet (#1534, steg 3a)
# --------------------------------------------------------------------------
# Kildene er svarene 04.11 i #1534: svar 1 (klassen er vedtak, beslutning eller design, og
# om posten gjelder, regnes av forholdene), svar 4 og 5 (samler og bygger på), kontroll 1
# (klassen er påkrevd) og arbeidsvalget for kontroll 2 (det andre hjemmet), og svar 14 og 20
# i PR #1537 (forholdene for de fire postene og feltene for delene).


def _importert(register: dict, anker: str) -> dict:
    return next(p for p in vr.poster(register) if vr.anker(p) == anker)


def test_hver_post_i_registeret_har_en_av_de_tre_klassene(register):
    assert {p["klasse"] for p in vr.poster(register)} <= set(vr.KLASSER)


@pytest.mark.parametrize("ny", [True, False])
def test_en_post_uten_klasse_avvises(grunnregister, ny):
    if ny:
        post = ny_post()
        del post["klasse"]
        endret = med(grunnregister, post)
    else:
        endret = copy.deepcopy(grunnregister)
        del endret["gruppe"][0]["vedtak"][0]["klasse"]
    assert any("mangler klasse" in f for f in vr.valider(endret)), vr.valider(endret)


@pytest.mark.parametrize(
    ("endring", "melding"),
    [
        (lambda p: p.update(klasse="historisk"), "ukjent klasse «historisk»"),
        (lambda p: p.update(klasse=["vedtak"]), "klasse skal være tekst"),
        (lambda p: p.update(klasse="design", designdel="x"), "har ingen designdel"),
        (lambda p: p.update(klasse="beslutning", beslutningsdel="x"), "har ingen beslutningsdel"),
        (lambda p: p.update(klasse="design", beslutningsdel="x"), "har ingen beslutningsdel"),
        (lambda p: p.update(bindende_i=["ka-u2"]), "bindende_i hører til en design- eller beslutningspost"),
        (lambda p: p.update(klasse="design", bindende_i="ka-u2"), "bindende_i skal være en liste"),
        (lambda p: p.update(klasse="design", bindende_i=[]), "bindende_i skal være en liste"),
        (lambda p: p.update(klasse="design", bindende_i=["finnes-ikke"]), "som ikke er ankeret til et vedtak"),
        (lambda p: p.update(klasse="design", bindende_i=["xx-u1"]), "bindende_i viser til posten selv"),
        (lambda p: p.update(flyttet_til="BF-06.md"), "er ikke et punkt i et brukerforløp"),
        (lambda p: p.update(flyttet_til="system.md#mm-u22"), "er ikke et punkt i et brukerforløp"),
    ],
)
def test_vakta_melder_feil_i_klassen_og_delene(grunnregister, endring, melding):
    post = ny_post()
    endring(post)
    feil = vr.valider(med(grunnregister, post))
    assert any(melding in f for f in feil), feil


@pytest.mark.parametrize(
    "felt",
    [
        {"klasse": "vedtak", "designdel": "x", "beslutningsdel": "y"},
        {"klasse": "beslutning", "designdel": "x", "bindende_i": ["ka-u1"]},
        {"klasse": "design", "bindende_i": ["ka-u1", "mm-u12"], "flyttet_til": "BF-06.md#u-12"},
    ],
)
def test_delene_og_hjemmet_som_passer_til_klassen_godtas(grunnregister, felt):
    assert vr.valider(med(grunnregister, ny_post(**felt))) == []


def test_en_importert_post_kan_ha_klassen_og_delene(grunnregister):
    endret = copy.deepcopy(grunnregister)
    endret["gruppe"][0]["vedtak"][0].update(klasse="beslutning", designdel="x")
    assert vr.valider(endret) == []


def test_et_opphevet_vedtak_i_bindende_i_avvises_til_det_er_samlet(grunnregister):
    """Arbeidsvalget for kontroll 2 04.11 i #1534: verktøyet feiler når et vedtak i feltet er
    opphevet uten å være samlet."""
    design = ny_post(id="XX-U1", klasse="design", bindende_i=["ka-u1"], forhold=[])
    opphever = ny_post(id="XX-U2", forhold=[{"art": "opphever", "vedtak": "ka-u1"}])
    endret = med(med(grunnregister, design), opphever)
    assert vr.valider(endret) == [
        "xx-u1: den bindende setningen står i ka-u1, som er opphevet av xx-u2 og ikke samlet; "
        "før den inn i et gjeldende vedtak"
    ]
    samler = ny_post(id="XX-U3", forhold=[{"art": "samler", "vedtak": "ka-u1"}])
    assert vr.valider(med(endret, samler)) == []


def test_en_post_i_bindende_i_som_ikke_er_et_vedtak_avvises(grunnregister):
    """Svar 2 og 8 04.11 i #1534: den bindende setningen har hjemmet sitt i et gjeldende vedtak.
    En designpost som hjem kan endres i brukerprøven uten vedtak."""
    hjem = ny_post(id="XX-U2", klasse="design", forhold=[])
    design = ny_post(id="XX-U1", klasse="design", bindende_i=["xx-u2"], forhold=[])
    assert vr.valider(med(med(grunnregister, hjem), design)) == [
        "xx-u1: den bindende setningen står i xx-u2, som har klassen «design»; "
        "den må stå i et vedtak"
    ]
    hjem["klasse"] = "vedtak"
    assert vr.valider(med(med(grunnregister, hjem), design)) == []


def test_et_vedtak_samlet_av_et_opphevet_samlevedtak_har_mistet_hjemmet(grunnregister):
    """Arbeidsvalget for kontroll 2 04.11 i #1534: et samlevedtak som er opphevet, gjelder
    ikke, så den bindende setningen har ikke noe gjeldende hjem."""
    design = ny_post(id="XX-U1", klasse="design", bindende_i=["ka-u1"], forhold=[])
    opphever = ny_post(id="XX-U2", forhold=[{"art": "opphever", "vedtak": "ka-u1"}])
    samler = ny_post(id="XX-U3", forhold=[{"art": "samler", "vedtak": "ka-u1"}])
    opphever_samleren = ny_post(id="XX-U4", forhold=[{"art": "opphever", "vedtak": "xx-u3"}])
    endret = med(med(med(med(grunnregister, design), opphever), samler), opphever_samleren)
    assert vr.valider(endret) == [
        "xx-u1: den bindende setningen står i ka-u1, som er opphevet av xx-u2 og ikke samlet; "
        "før den inn i et gjeldende vedtak"
    ]


def test_samler_og_bygger_paa_staar_begge_veier(grunnregister):
    """Svar 4 og 5 04.11 i #1534. Den passive formen for «bygger på» er «Lagt til grunn», så
    den ikke leses som byggestatus («Bygget»)."""
    post = ny_post(
        forhold=[{"art": "samler", "vedtak": "ka-u1"}, {"art": "bygger på", "vedtak": "ka-u2"}]
    )
    endret = med(grunnregister, post)
    assert vr.valider(endret) == []
    assert vr.folgecelle(endret["gruppe"][0]["vedtak"][-1], endret).startswith(
        "Samler [KA-U1](#ka-u1). Bygger på [KA-U2](#ka-u2)."
    )
    assert vr.folgecelle(_importert(endret, "ka-u1"), endret).startswith("Samlet 12.10 av [XX-U1](#xx-u1).")
    folge = vr.folgecelle(_importert(endret, "ka-u2"), endret)
    assert folge.startswith("Lagt til grunn 12.10 av [XX-U1](#xx-u1).")
    assert vr.byggestatus_i(folge) == vr.byggestatus_i(_importert(endret, "ka-u2")["folge"])


def test_folge_i_en_importert_post_leses_bare_med_de_fem_eldre_forholdene():
    """«samler» og «bygger på» kom etter importen (#423), så en importert Følge leses ikke for dem."""
    assert vr.les_forhold("Samler [KA-U1](#ka-u1). Bygger på [KA-U2](#ka-u2).")[0] == []


def test_vedtaksfila_har_klassen_og_den_logiske_formen_har_den_ikke(grunnregister):
    """Kontrollene mot main leser 3.1 uten klassekolonnen, så klassen endrer ikke en rad der."""
    post = ny_post(klasse="design", forhold=[], bindende_i=["ka-u1"], flyttet_til="BF-06.md#u-12")
    endret = med(grunnregister, post)
    assert vr.TABELLHODE_MED_KLASSE in vr.vedtaksfil(endret)
    assert vr.TABELLHODE_MED_KLASSE not in vr.logisk(endret)
    assert vr.rad(endret["gruppe"][0]["vedtak"][-1], endret, klasse=True) == (
        '| <a id="xx-u1"></a>XX-U1: TE kan trekke kravet. Forkastet: «TE kan ikke trekke kravet.» '
        "| design. Bindende i [KA-U1](#ka-u1). Flyttet til "
        "[BF-06 U-12](../domenetabell/brukerforlop/BF-06.md#u-12) "
        "| 12.10, oppdragsgiver (#413) | Ikke bygget |"
    )
    vedtak = ny_post(id="XX-U2", designdel="x", beslutningsdel="y")
    assert vr.klassecelle(vedtak, vr.indeks(endret)) == "vedtak med designdel og beslutningsdel"


def test_klassen_kan_rettes_etter_merge(grunnregister):
    """Svar 8 04.11 i #1534: orkestratoren kan rette klassen etter en uavhengig kontroll."""
    merget = med(grunnregister, ny_post())
    senere = copy.deepcopy(merget)
    senere["gruppe"][0]["vedtak"][-1].update(klasse="beslutning", designdel="x")
    assert vr.mot_grunnlag(senere, vr.logisk(merget), merget) == []


@pytest.mark.parametrize(
    ("forhold", "feil"),
    [
        ([{"art": "opphever", "vedtak": "ka-u1"}], []),
        ([{"art": "samler", "vedtak": "ka-u1"}], []),
        ([{"art": "presiserer", "vedtak": "ka-u1"}, {"art": "bygger på", "vedtak": "ka-u2"}], []),
        (
            [{"art": "presiserer", "vedtak": "ka-u1"}, {"art": "endrer", "vedtak": "ka-u2"}],
            ["XX-U1: forholdet «endrer ka-u2» er lagt til etter merge; bare bygger på, opphever, samler kan legges til"],
        ),
        ([], ["XX-U1: forholdet «presiserer ka-u1» er fjernet etter merge"]),
        (
            [{"art": "endrer", "vedtak": "ka-u1"}],
            [
                "XX-U1: forholdet «endrer ka-u1» er lagt til etter merge; bare bygger på, opphever, samler kan legges til",
                "XX-U1: forholdet «presiserer ka-u1» er fjernet etter merge",
            ],
        ),
    ],
)
def test_et_forhold_etter_merge_kan_bare_bli_opphever_eller_samler(grunnregister, forhold, feil):
    """Svar 14 i PR #1537: et senere vedtak som har tatt innholdet, opphever det eldre."""
    merget = med(grunnregister, ny_post())
    senere = copy.deepcopy(merget)
    senere["gruppe"][0]["vedtak"][-1]["forhold"] = forhold
    assert sorted(vr.mot_grunnlag(senere, vr.logisk(merget), merget)) == sorted(feil)


def test_et_opphever_etter_merge_kan_ikke_bli_samler(grunnregister):
    """Svar 14 i PR #1537: et forhold kan bli «opphever» eller «samler». Et «opphever» som blir
    «samler», ville gjort det opphevede vedtaket gjeldende igjen."""
    merget = med(grunnregister, ny_post(forhold=[{"art": "opphever", "vedtak": "ka-u1"}]))
    senere = copy.deepcopy(merget)
    senere["gruppe"][0]["vedtak"][-1]["forhold"] = [{"art": "samler", "vedtak": "ka-u1"}]
    assert vr.mot_grunnlag(senere, vr.logisk(merget), merget) == [
        "XX-U1: forholdet «opphever ka-u1» er fjernet etter merge"
    ]


def _rad_uten_anker(register: dict) -> dict:
    return next(p for p in vr.poster(register) if not vr.er_ny(p) and "anker" not in p)


def test_en_rad_uten_anker_kan_faa_et_anker(grunnregister, grunnplan):
    """Svar 14 i PR #1537: rad-076 får forholdet «opphever», og et forhold viser til et anker."""
    endret = copy.deepcopy(grunnregister)
    rad_ = _rad_uten_anker(endret)
    rad_["anker"] = "rad-med-nytt-anker"
    plan = vr.logisk(endret)
    assert vr.valider(endret) == []
    assert vr.endrede_rader(grunnplan, plan) == []
    assert vr.endret_rundt_vedtakene(grunnplan, plan) == []
    assert vr.mot_grunnlag(endret, grunnplan, grunnregister) == []
    rad_["vedtak"] += " endret"
    plan = vr.logisk(endret)
    assert len(vr.endrede_rader(grunnplan, plan)) == 1
    assert len(vr.mot_grunnlag(endret, grunnplan, grunnregister)) == 1


def test_folge_i_en_rad_som_har_faatt_anker_prooves_fortsatt(grunnregister, grunnplan):
    endret = copy.deepcopy(grunnregister)
    rad_ = _rad_uten_anker(endret)
    rad_["anker"] = "rad-med-nytt-anker"
    rad_["folge"] = "Ny tekst. " + rad_["folge"]
    assert any(
        "Følge er endret" in f for f in vr.endret_rundt_vedtakene(grunnplan, vr.logisk(endret))
    )


def test_byggestatusen_i_en_rad_som_har_faatt_anker_er_ikke_ny(grunnregister):
    endret = copy.deepcopy(grunnregister)
    rad_ = next(
        p for p in vr.poster(endret)
        if not vr.er_ny(p) and "anker" not in p and vr.byggestatus_i(p["folge"])
    )
    rad_["anker"] = "rad-med-nytt-anker"
    assert vr.ny_byggestatus(grunnregister, endret) == []


def test_ov_u71_rad_076_mm_u28_og_mm_u29_er_opphevet_etter_svar_14(register):
    """Svar 14 i PR #1537 og svar 1 04.11 i #1534: vedtaket som har tatt innholdet, opphever."""
    opphevet, _ = vr.opphevet_og_samlet(register)
    assert sorted(opphevet["mm-u28"]) == ["mm-u37", "mm-u38", "mm-u39"]
    assert opphevet["mm-u29"] == ["mm-u40"]
    assert opphevet["ov-u71"] == ["ov-u86"]
    assert opphevet["b-13-frafalt"] == ["gr-u18"]


# --------------------------------------------------------------------------
# Kontrollene i steg 3b i #1534
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "flyttet_til, gyldig",
    [
        ("BF-06.md#u-12", True),
        ("BF-02A.md#u-3", True),
        ("BF-01V.md#u-1", True),
        ("BF-2A.md#u-3", False),
        ("BF-02AB.md#u-3", False),
        ("BF-06.md#U-12", False),
        ("BF-06.json#u-12", False),
        (".interface-design/system.md#mm-u22", True),
        (".interface-design/system.md#gfk-u2", True),
        (".interface-design/system.md#u-1", False),
        (".interface-design/system.md#MM-U22", False),
        ("system.md#mm-u22", False),
    ],
)
def test_flyttet_til_er_et_punkt_i_et_brukerforloep_ogsaa_med_bokstav(
    grunnregister, flyttet_til, gyldig
):
    """Kravet fra reviewet av PR #1542: forløpene BF-01V og BF-02A–BF-02C har en bokstav. I
    systemfila er punktet ankeret med vedtakets ID (arbeidsvalg 04.11 fra økta som følger #1534)."""
    endret = med(grunnregister, ny_post(klasse="design", forhold=[], flyttet_til=flyttet_til))
    feil = vr.valider(endret)
    assert (feil == []) is gyldig, feil


def test_lenken_i_flyttet_til_gaar_til_ankeret_lenkekontrollen_leser(grunnregister, tmp_path):
    """Lenkekontrollen feiler når ankeret i «Flyttet til» ikke finnes (svar 5 04.11 i #1534).
    Den leser et U-punkt med ankeret foran, som `<a id="u-3"></a>**U-3**`."""
    lk = last("lenkekontroll")
    post = ny_post(klasse="design", forhold=[], flyttet_til="BF-02A.md#u-3")
    celle = vr.klassecelle(post, vr.indeks(med(grunnregister, post)))
    assert celle.endswith("Flyttet til [BF-02A U-3](../domenetabell/brukerforlop/BF-02A.md#u-3)")
    bestilling = tmp_path / "BF-02A.md"
    bestilling.write_text('- <a id="u-3"></a>**U-3** BH ser svaret.\n', encoding="utf-8")
    assert "u-3" in lk.ankre(bestilling)
    assert "u-4" not in lk.ankre(bestilling)
    post = ny_post(klasse="design", forhold=[], flyttet_til=".interface-design/system.md#mm-u22")
    assert vr.klassecelle(post, vr.indeks(med(grunnregister, post))).endswith(
        "Flyttet til [system.md MM-U22](../../.interface-design/system.md#mm-u22)"
    )


def _opphever(id_: str, vedtak: str, dato=datetime.date(2026, 10, 13)) -> dict:
    return ny_post(id=id_, dato=dato, forhold=[{"art": "opphever", "vedtak": vedtak}])


@pytest.mark.parametrize("art", ["presiserer", "utvider", "snevrer inn", "endrer", "bygger på"])
def test_et_gjeldende_vedtak_med_forhold_til_et_opphevet_vedtak_gir_feil(grunnregister, art):
    """Svar 5 04.11 i #1534: et gjeldende vedtak presiserer, utvider, endrer eller bygger ikke
    på et opphevet vedtak. «snevrer inn» etter arbeidsvalget 04.11 fra økta som følger #1534."""
    endret = med(
        med(grunnregister, ny_post(forhold=[{"art": art, "vedtak": "ka-u2"}])),
        _opphever("XX-U2", "ka-u2"),
    )
    assert vr.forhold_til_opphevet_feil(endret, frozenset()) == [
        f"xx-u1: {art} ka-u2, som er opphevet av xx-u2; et gjeldende vedtak kan ikke "
        "presisere, utvide, snevre inn, endre eller bygge på et opphevet vedtak"
    ]
    kjent = frozenset({("xx-u1", art, "ka-u2", "#1534, steg 4")})
    assert vr.forhold_til_opphevet_feil(endret, kjent) == []


def test_et_opphevet_vedtak_eller_et_samlevedtak_gir_ingen_feil(grunnregister):
    """Kontrollen gjelder gjeldende vedtak, og ikke «samler»: et samlevedtak opphever ikke."""
    endret = med(
        med(grunnregister, ny_post(forhold=[{"art": "samler", "vedtak": "ka-u2"}])),
        _opphever("XX-U2", "ka-u2"),
    )
    assert vr.forhold_til_opphevet(endret) == {}
    endret = med(
        med(grunnregister, ny_post(forhold=[{"art": "presiserer", "vedtak": "ka-u2"}])),
        _opphever("XX-U2", "ka-u2"),
    )
    endret = med(endret, _opphever("XX-U3", "xx-u1"))
    assert vr.forhold_til_opphevet(endret) == {}


def test_et_forhold_til_et_vedtak_et_samlevedtak_opphever_gir_ingen_feil(grunnregister):
    """S1 A i vedtaks-PR-en for samlevedtaket for endringsordren, etter svar 4 A 04.11 i #1534:
    samlevedtaket har tatt innholdet, så forholdet leses som et forhold til samlevedtaket.
    Kontrollsaken: et vedtak som opphever uten å samle, gir fortsatt feil."""
    presiserer = ny_post(forhold=[{"art": "presiserer", "vedtak": "ka-u2"}])
    samlevedtak = ny_post(
        id="XX-U2",
        dato=datetime.date(2026, 10, 13),
        forhold=[{"art": "opphever", "vedtak": "ka-u2"}, {"art": "samler", "vedtak": "ka-u1"}],
    )
    assert vr.forhold_til_opphevet_feil(med(med(grunnregister, presiserer), samlevedtak), frozenset()) == []
    endret = med(med(grunnregister, presiserer), _opphever("XX-U2", "ka-u2"))
    assert vr.forhold_til_opphevet(endret) != {}
    selv = copy.deepcopy(samlevedtak)
    selv["forhold"].append({"art": "bygger på", "vedtak": "ka-u2"})
    assert vr.forhold_til_opphevet(med(grunnregister, selv)) != {}


def test_en_gruppe_uten_tekst_etter_tabellen_kan_faa_tekst():
    """Teksten etter en tabell kan bare få hele avsnitt lagt til, også når det ikke sto noe der."""
    assert vr._bare_lagt_til("", "##### Ny overskrift\n\nEt nytt avsnitt.\n")
    assert vr._bare_lagt_til("\n", "Et nytt avsnitt.\n")
    assert not vr._bare_lagt_til("Et avsnitt.", "Et annet avsnitt.")


def test_lista_over_forhold_til_opphevede_vedtak_kan_bare_krympe(grunnregister):
    """En rad som ikke lenger finnes, og en rad uten issuet, gir feil."""
    assert vr.forhold_til_opphevet_feil(
        grunnregister, frozenset({("xx-u1", "presiserer", "ka-u1", "#1534, steg 4")})
    ) == ["KJENTE_FORHOLD_TIL_OPPHEVET: xx-u1 presiserer ka-u1 finnes ikke lenger; fjern raden"]
    assert vr.forhold_til_opphevet_feil(
        grunnregister, frozenset({("xx-u1", "presiserer", "ka-u1", "steg 4")})
    )[0].startswith("KJENTE_FORHOLD_TIL_OPPHEVET: raden")


def test_forholdene_til_opphevede_vedtak_i_registeret_er_de_kjente(register):
    assert vr.forhold_til_opphevet_feil(register) == []


def test_et_forhold_fra_et_opphevet_vedtak_er_merket_i_foelge(grunnregister, grunnplan):
    """M2 A 04.11 i #1534: «Utvidet av OV-U48 (opphevet 30.10 av OV-U69)». Følge i den
    importerte posten får bare tekst verktøyet skriver først, så kontrollen mot main holder."""
    endret = med(
        med(grunnregister, ny_post(forhold=[{"art": "utvider", "vedtak": "ka-u2"}])),
        _opphever("XX-U2", "xx-u1"),
    )
    assert vr.folgecelle(_importert(endret, "ka-u2"), endret).startswith(
        "Utvidet 12.10 av [XX-U1](#xx-u1) (opphevet 13.10 av [XX-U2](#xx-u2))."
    )
    assert vr.endret_rundt_vedtakene(grunnplan, vr.logisk(endret)) == []


def test_et_forhold_fra_et_opphevet_importert_vedtak_er_merket_i_foelge(grunnregister, grunnplan):
    """Står forholdet i Følge i den importerte posten selv, som at EO-U5 presiserer EO-U2,
    merkes opphevelsen med en egen setning foran teksten."""
    endret = med(grunnregister, _opphever("XX-U1", "eo-u5", datetime.date(2026, 10, 12)))
    folge = vr.folgecelle(_importert(endret, "eo-u2"), endret)
    assert folge.startswith("[EO-U5](#eo-u5) er opphevet 12.10 av [XX-U1](#xx-u1). ")
    assert folge.endswith(vr.linje(_importert(endret, "eo-u2")["folge"]))
    assert vr.endret_rundt_vedtakene(grunnplan, vr.logisk(endret)) == []


def test_en_importert_post_kan_faa_bygger_paa_og_verktoeyet_skriver_det(grunnregister, grunnplan):
    """M2 A 04.11 i #1534: forholdene for OV-U2 og EO-U1 føres i registeret. Følge i en
    importert post sier dem ikke, så verktøyet skriver dem begge veier, som i en ny post."""
    endret = copy.deepcopy(grunnregister)
    ka_u1 = _importert(endret, "ka-u1")
    ka_u1["forhold"] = ka_u1.get("forhold", []) + [{"art": "bygger på", "vedtak": "ka-u2"}]
    assert vr.valider(endret) == []
    assert vr.forholdfeil(endret) == []
    assert vr.folgecelle(ka_u1, endret).startswith("Bygger på [KA-U2](#ka-u2). ")
    assert vr.folgecelle(_importert(endret, "ka-u2"), endret).startswith(
        "Lagt til grunn av [KA-U1](#ka-u1). "
    )
    assert vr.endret_rundt_vedtakene(grunnplan, vr.logisk(endret)) == []


def test_en_rad_uten_anker_kan_ikke_faa_bygger_paa(grunnregister):
    endret = copy.deepcopy(grunnregister)
    _rad_uten_anker(endret)["forhold"] = [{"art": "bygger på", "vedtak": "ka-u2"}]
    assert any("gi raden et anker" in f for f in vr.valider(endret))


def test_et_forhold_oppdragsgiver_har_bestemt_kan_foeres_etter_merge(grunnregister, monkeypatch):
    """M2 A 04.11 i #1534: EO-U17 får sin endring av vedtaket 23.09 om ubegrenset fullmakt."""
    merget = med(grunnregister, ny_post())
    senere = copy.deepcopy(merget)
    senere["gruppe"][0]["vedtak"][-1]["forhold"].append({"art": "endrer", "vedtak": "ka-u2"})
    assert len(vr.mot_grunnlag(senere, vr.logisk(merget), merget)) == 1
    monkeypatch.setattr(
        vr, "FORHOLD_FOERT_ETTER_MERGE", {("xx-u1", "endrer", "ka-u2"): "en test"}
    )
    assert vr.mot_grunnlag(senere, vr.logisk(merget), merget) == []


def test_et_forhold_oppdragsgiver_har_bestemt_kan_fjernes_etter_merge(grunnregister, monkeypatch):
    """KA-U49 E2 (V2 A 04.11 i #1534): KA-U45 og OV-U80 mister forholdene til OV-U48 og OV-U49."""
    merget = med(grunnregister, ny_post())
    merget["gruppe"][0]["vedtak"][-1]["forhold"].append({"art": "endrer", "vedtak": "ka-u2"})
    senere = copy.deepcopy(merget)
    senere["gruppe"][0]["vedtak"][-1]["forhold"].pop()
    assert len(vr.mot_grunnlag(senere, vr.logisk(merget), merget)) == 1
    monkeypatch.setattr(
        vr, "FORHOLD_FJERNET_ETTER_MERGE", {("xx-u1", "endrer", "ka-u2"): "en test"}
    )
    assert vr.mot_grunnlag(senere, vr.logisk(merget), merget) == []


def test_et_annet_forhold_kan_ikke_fjernes_etter_merge_selv_om_lista_har_rader(
    grunnregister, monkeypatch
):
    """Lista er lukket: bare raden selv kan fjernes, ikke et annet forhold i samme post."""
    merget = med(grunnregister, ny_post())
    merget["gruppe"][0]["vedtak"][-1]["forhold"].append({"art": "endrer", "vedtak": "ka-u2"})
    senere = copy.deepcopy(merget)
    senere["gruppe"][0]["vedtak"][-1]["forhold"].pop()
    monkeypatch.setattr(
        vr, "FORHOLD_FJERNET_ETTER_MERGE", {("xx-u1", "presiserer", "ka-u2"): "en test, #1"}
    )
    assert vr.mot_grunnlag(senere, vr.logisk(merget), merget) == [
        "XX-U1: forholdet «endrer ka-u2» er fjernet etter merge"
    ]


def test_et_fjernet_forhold_kan_fortsatt_sta_med_ord_i_folge_i_en_importert_post(
    register, monkeypatch
):
    """MM-U50 E9 (svar 1 A 05.11 i #1534): Følge i VS-U7 sier fortsatt «Utvider [MM-U8]», og
    forholdet er fjernet."""
    endret = copy.deepcopy(register)
    ka_u20 = _post(endret, "ka-u20")
    ka_u20["folge"] = vr.linje(ka_u20["folge"]) + ". Presiserer [KA-U1](#ka-u1)."
    melding = "ka-u20: Følge sier «presiserer #ka-u1», men forholdet står ikke i registeret"
    assert melding in vr.forholdfeil(endret)
    monkeypatch.setattr(
        vr, "FORHOLD_FJERNET_ETTER_MERGE", {("ka-u20", "presiserer", "ka-u1"): "en test, #1"}
    )
    assert melding not in vr.forholdfeil(endret)


def test_henvisningen_verktoyet_satte_for_et_fjernet_forhold_kan_falle_bort(monkeypatch):
    """MM-U50 E1 (svar 1 A 05.11 i #1534): MM-U4 mister «Lagt til grunn av [MM-U8]» i Følge."""
    gammel = "Presisert 10.10 av [KA-U15](#ka-u15). Ikke bygget"
    ny = "Ikke bygget"
    assert not vr.folge_bare_lagt_til(gammel, ny, "ka-u12")
    monkeypatch.setattr(
        vr, "FORHOLD_FJERNET_ETTER_MERGE", {("ka-u15", "presiserer", "ka-u12"): "en test, #1"}
    )
    assert vr.folge_bare_lagt_til(gammel, ny, "ka-u12")
    assert not vr.folge_bare_lagt_til(gammel, ny, "ka-u13")


def test_lista_over_fjernede_forhold_kan_bare_ha_forhold_som_er_fjernet(grunnregister):
    """En rad med et forhold som fortsatt står, en post som ikke finnes, og en kilde uten
    issuet, gir feil."""
    med_forhold = med(grunnregister, ny_post(forhold=[{"art": "endrer", "vedtak": "ka-u2"}]))
    assert vr.forhold_fjernet_feil(med_forhold, {("xx-u1", "endrer", "ka-u2"): "#1"}) == [
        "FORHOLD_FJERNET_ETTER_MERGE: xx-u1 endrer ka-u2: forholdet står fortsatt i registeret; "
        "fjern forholdet eller raden"
    ]
    assert vr.forhold_fjernet_feil(med_forhold, {("xx-u9", "endrer", "ka-u2"): "#1"}) == [
        "FORHOLD_FJERNET_ETTER_MERGE: xx-u9 endrer ka-u2: posten eller vedtaket finnes ikke i "
        "registeret"
    ]
    uten = med(grunnregister, ny_post())
    assert vr.forhold_fjernet_feil(uten, {("xx-u1", "endrer", "ka-u2"): "#1"}) == []
    assert vr.forhold_fjernet_feil(uten, {("xx-u1", "endrer", "ka-u2"): "E2"}) == [
        "FORHOLD_FJERNET_ETTER_MERGE: xx-u1 endrer ka-u2: kilden må ha issuet"
    ]


def test_forholdene_ka_u49_e2_fjernet_staar_ikke_i_registeret(register):
    assert vr.forhold_fjernet_feil(register) == []
    for post, art, vedtak in vr.FORHOLD_FJERNET_ETTER_MERGE:
        assert {"art": art, "vedtak": vedtak} not in _importert(register, post)["forhold"]
    assert all(rad[:3] not in vr.FORHOLD_FJERNET_ETTER_MERGE for rad in vr.KJENTE_FORHOLD_TIL_OPPHEVET)


def test_eo_u17_endrer_vedtaket_om_ubegrenset_fullmakt(register):
    eo_u17 = _importert(register, "eo-u17")
    assert {"art": "endrer", "vedtak": "ubegrenset-fullmakt"} in eo_u17["forhold"]
    for post, art, vedtak in vr.FORHOLD_FOERT_ETTER_MERGE:
        assert {"art": art, "vedtak": vedtak} in _importert(register, post)["forhold"]


@pytest.mark.parametrize(
    "tekst, varsel",
    [
        ("Appen viser svaret.", True),
        ("Løsningen viser det i appen.", True),
        ("Brevet sier «sendt fra appen».", False),
        ("Merket ‹Registrert i appen› står.", False),
        ("Løsningen viser svaret.", False),
        ("Applikasjonen og en app-lignende visning.", False),
    ],
)
def test_app_utenfor_sitattegn_i_en_ny_post_gir_et_varsel(grunnregister, tekst, varsel):
    """Svar 6 04.11 i #1534 (kontroll 3) og språkreglene i docs/sprak.md."""
    post = ny_post()
    post["alternativ"][0]["tekst"] = tekst
    endret = med(grunnregister, post)
    forventet = ["XX-U1: «app» utenfor sitattegn i vedtaksteksten; se språkreglene i docs/sprak.md"]
    assert vr.varsler(endret, grunnregister) == (forventet if varsel else [])
    assert vr.varsler(endret, endret) == []


def test_varselet_om_app_gjelder_bare_det_valgte_alternativet(grunnregister):
    post = ny_post()
    post["alternativ"][1]["tekst"] = "Appen avgjør."
    assert vr.varsler(med(grunnregister, post), grunnregister) == []


@pytest.mark.parametrize("antall, varsel", [(2, False), (3, True)])
def test_den_tredje_endringen_av_et_samlevedtak_gir_et_varsel(grunnregister, antall, varsel):
    """Svar 6 og 10 04.11 i #1534: tellingen begynner når temaet er samlet."""
    endret = med(grunnregister, ny_post(forhold=[{"art": "samler", "vedtak": "ka-u1"}]))
    for i, art in zip(range(antall), ("presiserer", "endrer", "snevrer inn")):
        endret = med(
            endret, ny_post(id=f"XX-U{i + 2}", forhold=[{"art": art, "vedtak": "xx-u1"}])
        )
    forventet = [
        "xx-u1: har fått 3 endringer etter at temaet er samlet; den neste endringen skrives "
        "som et samlevedtak (svar 6 og 10 04.11 i #1534)"
    ]
    assert vr.varsler(endret, endret) == (forventet if varsel else [])


@pytest.mark.parametrize("overtatt, varsel", [(True, False), (False, True)])
def test_en_endring_fra_en_opphevet_post_telles_ikke(grunnregister, overtatt, varsel):
    """Svar 2 A 05.11 i #1614: en endring telles bare fra en gjeldende post. XX-U4 opphever
    XX-U3 og overtar endringen fra den, slik et samlevedtak gjør, så den telles én gang."""
    endret = med(grunnregister, ny_post(forhold=[{"art": "samler", "vedtak": "ka-u1"}]))
    for i in (2, 3):
        endret = med(endret, ny_post(id=f"XX-U{i}", forhold=[{"art": "endrer", "vedtak": "xx-u1"}]))
    forhold = [{"art": "endrer", "vedtak": "xx-u1"}]
    if overtatt:
        forhold.append({"art": "opphever", "vedtak": "xx-u3"})
    endret = med(endret, ny_post(id="XX-U4", forhold=forhold))
    forventet = [
        "xx-u1: har fått 3 endringer etter at temaet er samlet; den neste endringen skrives "
        "som et samlevedtak (svar 6 og 10 04.11 i #1534)"
    ]
    assert vr.varsler(endret, endret) == (forventet if varsel else [])


def test_et_vedtak_som_ikke_er_samlet_telles_ikke(grunnregister):
    """Svar 10 04.11 i #1534: til temaet er samlet, skrives en ny endring som før."""
    endret = grunnregister
    for i in range(4):
        endret = med(endret, ny_post(id=f"XX-U{i + 1}", forhold=[{"art": "endrer", "vedtak": "ka-u1"}]))
    assert vr.varsler(endret, endret) == []


# --------------------------------------------------------------------------
# Oppslag: --vis og --kjede, så en økt slår opp poster ordrett uten å lese registeret
# --------------------------------------------------------------------------


def test_oppslaget_finner_posten_paa_id_anker_og_etikett(register):
    """Etiketten er det en lenke viser, og den eneste nøkkelen en importert post uten anker har."""
    uten_anker = next(p for p in vr.poster(register) if not vr.anker(p))
    assert vr.finn(register, "KA-U1") is vr.finn(register, "ka-u1") is _post(register, "ka-u1")
    assert vr.finn(register, vr.etikett(uten_anker).upper()) is uten_anker
    assert vr.finn(register, "XX-U999") is None


def test_raden_i_oppslaget_er_raden_i_vedtaksfila_ordrett(register):
    """Vedtaksfila er autoritativ for vedtakene (AGENTS.md, «Hvor hva står»), så hver celle i
    oppslaget står ordrett i vedtaksfila, med lenkene skrevet om som der, for hver post."""
    fil = vr.VEDTAKSFIL.read_text(encoding="utf-8")
    ix = vr.indeks(register)
    ankre = set(vr.ankre_i(vr.markdown(register, klasse=True)))
    avvik = [
        (vr.etikett(p), celle.split(": ", 1)[0])
        for p in vr.poster(register)
        for celle in vr.vis(p, register, ix, ankre).splitlines()[1:]
        if f"{celle.split(': ', 1)[1]} |" not in fil
    ]
    assert avvik == []
    celler = vr.vis(_post(register, "ka-u1"), register, ix, ankre).splitlines()[1:]
    assert [c.split(": ", 1)[0] for c in celler] == ["Beslutning", "Klasse", "Vedtatt", "Følge"]


def test_kjeden_folger_bare_det_som_erstatter_innholdet_videre(grunnregister):
    """XX-U2 opphever XX-U1 og XX-U4 endrer XX-U2, så kjeden fra XX-U1 ender i XX-U4. At XX-U3
    presiserer XX-U2, og at KA-U1 har egne forhold, er ikke med: de slås opp for seg."""
    endret = med(grunnregister, ny_post())
    endret = med(endret, _opphever("XX-U2", "xx-u1"))
    endret = med(endret, ny_post(id="XX-U3", forhold=[{"art": "presiserer", "vedtak": "xx-u2"}]))
    endret = med(
        endret,
        ny_post(
            id="XX-U4",
            dato=datetime.date(2026, 10, 14),
            forhold=[{"art": "endrer", "vedtak": "xx-u2"}],
        ),
    )
    forhold = vr.kjede(endret, vr.finn(endret, "xx-u1"))
    assert [(vr.etikett(p), art, vr.etikett(v)) for p, art, v in forhold] == [
        ("XX-U1", "presiserer", "KA-U1"),
        ("XX-U2", "opphever", "XX-U1"),
        ("XX-U4", "endrer", "XX-U2"),
    ]


def test_oppslaget_avviser_en_id_som_ikke_finnes(register, capsys):
    assert vr.oppslag(register, ["KA-U1", "XX-U999"], None) == 1
    assert capsys.readouterr().out == "Finnes ikke i registeret:\n  XX-U999\n"
