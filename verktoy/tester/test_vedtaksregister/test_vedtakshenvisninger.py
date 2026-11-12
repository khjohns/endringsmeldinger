"""Vedtaks-ID-ene i kjerne/, server/ og src/ mot vedtaksregisteret (#452).

Reglene står i docs/verktoy/vedtakshenvisninger.py og i #451, punkt 2: en ukjent
ID gir feil, og en opphevet ID gir feil når den står uten posten som opphever den,
unntatt i en test merket historisk (oppdragsgiver 05.11, #1606).
"""

import collections
import pathlib
import re

import pytest

from verktoymoduler import last

ROT = pathlib.Path(__file__).resolve().parents[3]


vh = last("vedtakshenvisninger")
vr = vh.vr

KJENTE = {"MM-U4", "MM-U9", "KA-U1", "B-13"}
OPPHEVET = {"MM-U4": {"MM-U9"}}
AAPNE = {"B-06"}


def _feil(tekst: str, sti: str = "kjerne/regel.ts") -> list[str]:
    return vh.feil_i(sti, tekst, KJENTE, OPPHEVET, AAPNE)


@pytest.fixture(scope="module")
def register():
    return vr.les()


@pytest.fixture(scope="module")
def plan():
    return vr.HOVEDPLAN.read_text(encoding="utf-8")


def test_henvisningene_i_treet_holder(register, plan):
    assert vh.kontroller(register, plan) == []


def test_filer_leser_de_tre_mappene_og_hopper_over_byggmappene(tmp_path):
    rot = tmp_path / "build" / "repo"
    for sti in ("kjerne/a.ts", "server/b.ts", "src/c.svelte", "src/node_modules/d.ts"):
        (rot / sti).parent.mkdir(parents=True, exist_ok=True)
        (rot / sti).write_text("// KA-U1\n", encoding="utf-8")
    (rot / "annet").mkdir()
    (rot / "annet" / "e.ts").write_text("// KA-U99\n", encoding="utf-8")
    assert [sti for sti, _ in vh.filer(rot)] == [
        "kjerne/a.ts",
        "server/b.ts",
        "src/c.svelte",
    ]


def test_mm_u9_gjoer_mm_u4_til_mm_u6_opphevet(register):
    # Forventningen er raden til MM-U9 i 3.1: «Opphever MM-U4, MM-U5 og MM-U6».
    kjente, opphevet = vh.vedtak(register)
    assert {i: opphevet[i] for i in ("MM-U4", "MM-U5", "MM-U6")} == dict.fromkeys(
        ("MM-U4", "MM-U5", "MM-U6"), {"MM-U9"}
    )
    assert {"MM-U4", "MM-U9", "B-13", "B-17"} <= kjente


def test_et_opphevet_vedtak_med_anker_som_ikke_er_id_en_gjelder_b_id_en():
    register = {
        "gruppe": [
            {
                "vedtak": [
                    {
                        "anker": "b-03-dokument",
                        "vedtak": "B-03, dokumentet: x",
                        "vedtatt": "d",
                    },
                    {
                        "anker": "ka-u1",
                        "vedtak": "KA-U1: y",
                        "vedtatt": "d",
                        "forhold": [{"art": "opphever", "vedtak": "b-03-dokument"}],
                    },
                ]
            }
        ]
    }
    assert vh.vedtak(register) == ({"B-03", "KA-U1"}, {"B-03": {"KA-U1"}})


def test_en_b_id_er_opphevet_bare_naar_hver_rad_for_den_er_opphevet():
    """Svar 14 i PR #1537: rad-076, en av radene for B-13, er opphevet av GR-U18. B-13 er
    vedtaket for flere rader, og de andre gjelder."""
    to_rader = [
        {"anker": "b-13-frafalt", "vedtak": "B-13 «frafalt» x", "vedtatt": "d"},
        {"vedtak": "B-13 hovedvalg: y", "vedtatt": "d"},
        {
            "anker": "gr-u18",
            "vedtak": "GR-U18: z",
            "vedtatt": "d",
            "forhold": [{"art": "opphever", "vedtak": "b-13-frafalt"}],
        },
    ]
    assert vh.vedtak({"gruppe": [{"vedtak": to_rader}]})[1] == {}
    del to_rader[1]
    assert vh.vedtak({"gruppe": [{"vedtak": to_rader}]})[1] == {"B-13": {"GR-U18"}}


@pytest.mark.parametrize("neste", ["## 4. Funnregister", "# Vedlegg", "### 3.5 x"])
def test_aapne_beslutninger_leses_bare_fra_3_4(neste):
    plan = (
        "#### 3.4 Et underavsnitt\n| B-01 | x |\n"
        "### 3.4 Åpne beslutninger\n| B-16 | x |\n"
        f"{neste}\n| B-02 | x |\n"
    )
    assert vh.aapne_beslutninger(plan) == {"B-16"}


def test_en_avgjort_beslutning_i_listen_i_3_4_er_kjent():
    """#1020: B-06 er avgjort med GFK-U3 og GFK-U4 og står i listen over avgjorte
    beslutninger, så en henvisning til B-06 i koden finner beslutningen og vedtakene."""
    plan = (
        "### 3.4 Åpne beslutninger\n| B-16 | x |\n\n"
        "- **B-06** fullmakt uten dagmulktssats: avgjort 18.10 med GFK-U3.\n"
        "- **B-02** tilgangsmekanisme: alternativ C,\n  avgjort 23.09.\n"
        "- **B-19** fortsatt åpen, se issuet\n"
        "- B-07 i løpende tekst\n"
        "### 3.5 x\n- **B-02** utenfor\n"
    )
    assert vh.aapne_beslutninger(plan) == {"B-16"}
    assert vh.avgjorte_beslutninger(plan) == {"B-06", "B-02"}


def test_en_plan_uten_3_4_gir_feil_og_ikke_en_tom_mengde():
    with pytest.raises(ValueError, match="3.4"):
        vh.aapne_beslutninger("### 3.1 Vedtatte\n| B-16 | x |\n")


def test_et_forhold_til_et_ukjent_anker_gir_feil():
    register = {
        "gruppe": [
            {
                "vedtak": [
                    {
                        "anker": "ka-u1",
                        "vedtak": "KA-U1: y",
                        "vedtatt": "d",
                        "forhold": [{"art": "opphever", "vedtak": "mm-u44"}],
                    }
                ]
            }
        ]
    }
    with pytest.raises(ValueError, match="mm-u44"):
        vh.vedtak(register)


def test_ukjent_vedtaks_id_gir_feil():
    assert _feil("// Følger KA-U99.") == [
        "kjerne/regel.ts:1: KA-U99 er ikke et vedtak i registeret"
    ]


def test_ukjent_b_id_gir_feil_og_en_aapen_b_id_er_kjent():
    assert _feil("// B-99 og B-06") == [
        "kjerne/regel.ts:1: B-99 er ikke et vedtak i registeret"
    ]


@pytest.mark.parametrize("tekst", ["// RV-07 og SK-02", "kode P1 AF-06", "// ka-u99"])
def test_funn_id_foeringer_og_smaa_bokstaver_leses_ikke(tekst):
    assert _feil(tekst) == []


def test_id_som_del_av_et_lengre_navn_leses_ikke():
    assert _feil("const x = 'KOE-KA-U99-1'; // ABCD-U1") == []


def test_opphevet_id_alene_gir_feil():
    assert _feil("// Avvises etter MM-U4.") == [
        "kjerne/regel.ts:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"
    ]


def test_opphevet_id_med_gjeldende_vedtak_i_samme_kommentarblokk_er_lov():
    tekst = "// Var MM-U4,\n// opphevet av MM-U9.\nkode()"
    assert _feil(tekst) == []


def test_opphevet_id_med_bare_et_annet_gjeldende_vedtak_gir_feil():
    """Oppdragsgiver 05.11, #1606: det er ikke nok at et annet vedtak som gjelder, står der."""
    assert _feil("// Var MM-U4, se også KA-U1.") == [
        "kjerne/regel.ts:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"
    ]


def test_opphevet_id_med_en_av_flere_poster_som_opphever_den_er_lov():
    opphevet = {"MM-U4": {"MM-U9", "KA-U1"}}
    assert vh.feil_i("kjerne/regel.ts", "// MM-U4, KA-U1", KJENTE, opphevet, AAPNE) == []


@pytest.mark.parametrize(
    ("kilde", "feil"),
    [
        (["MM-U4", "MM-U9"], []),
        (["MM-U4", "KA-U1"], ["a.json: x/kilde: MM-U4 er opphevet og står uten MM-U9, som opphever den"]),
        ("MM-U4, KA-U1", ["a.json: x/kilde: MM-U4 er opphevet og står uten MM-U9, som opphever den"]),
    ],
)
def test_en_kildeliste_godtar_den_opphevede_id_en_bare_med_posten_som_opphever_den(kilde, feil):
    assert vh.kildefeil("a.json", {"x": {"kilde": kilde}}, KJENTE, OPPHEVET, AAPNE) == feil


@pytest.mark.parametrize(
    ("tekst", "feil"),
    [
        ("Regelen sto i MM-U4 (opphevet av MM-U9).\n", []),
        ("Regelen sto i MM-U4, se KA-U1.\n", ["x.md:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"]),
    ],
)
def test_et_dokument_godtar_den_opphevede_id_en_bare_med_posten_som_opphever_den(tekst, feil):
    assert vh.feil_i("x.md", tekst, KJENTE, OPPHEVET, AAPNE) == feil


def test_kontroller_leser_posten_som_opphever_av_registeret(register, plan, tmp_path):
    """MM-U50 opphever MM-U3 (svar Y i #1534). MM-U9 gjelder, men opphever ikke MM-U3."""
    rot = _tre(
        tmp_path,
        {"kjerne/a.ts": "// MM-U3, MM-U50\n", "kjerne/b.ts": "// MM-U3, MM-U9\n"},
    )
    assert vh.kontroller(register, plan, rot, (), ()) == [
        "kjerne/b.ts:1: MM-U3 er opphevet og står uten MM-U50, som opphever den"
    ]


def test_radene_for_samme_fil_og_id_telles_sammen():
    rader = (
        ("kjerne/regel.ts", "MM-U4", 1, "#1433"),
        ("kjerne/regel.ts", "MM-U4", 2, "#1606"),
    )
    treff = collections.Counter({("kjerne/regel.ts", "MM-U4"): 3})
    assert vh.avviksfeil(rader, treff) == []
    treff[("kjerne/regel.ts", "MM-U4")] = 4
    assert vh.avviksfeil(rader, treff) == [
        "KJENTE_AVVIK: MM-U4 står uten posten som opphever den 4 ganger i kjerne/regel.ts, og "
        "radene (#1433, #1606) tillater 3; en ny henvisning må vise til posten som opphever den"
    ]


def test_gjeldende_vedtak_utenfor_kommentarblokken_teller_ikke():
    tekst = "// Avvises etter MM-U4.\nkode()\n// MM-U9"
    assert _feil(tekst) == [
        "kjerne/regel.ts:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"
    ]


def test_aapen_b_id_er_ikke_et_gjeldende_grunnlag_for_en_opphevet_id():
    assert _feil("// MM-U4 og B-06") == [
        "kjerne/regel.ts:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"
    ]


@pytest.mark.parametrize(
    "sti",
    [
        "kjerne/tester/regel.ts",
        "src/lib/regel.test.ts",
        "server/tester/a.ts",
        "src/lib/__tests__/Harness.svelte",
    ],
)
def test_opphevet_id_i_en_test_merket_historisk_er_lov(sti):
    assert _feil("it('historisk: MM-U4 avviste brevet', () => {})", sti) == []


def test_opphevet_id_i_en_test_uten_merket_gir_feil():
    assert _feil("it('MM-U4 avviser brevet', () => {})", "src/lib/a.test.ts") == [
        "src/lib/a.test.ts:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"
    ]


def test_et_ord_som_begynner_med_historisk_er_ikke_merket():
    tekst = "it('MM-U4 avviser, som i historiske saker', () => {})"
    assert len(_feil(tekst, "src/lib/a.test.ts")) == 1


def test_ikke_historisk_er_ikke_merket():
    tekst = "it('ikke historisk: MM-U4 avviser', () => {})"
    assert len(_feil(tekst, "src/lib/a.test.ts")) == 1


def test_merket_historisk_utenfor_en_test_gir_feil():
    assert _feil("// historisk: MM-U4") == [
        "kjerne/regel.ts:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"
    ]


def test_linjenummeret_er_starten_paa_avsnittet():
    tekst = "kode()\n/**\n * Etter MM-U4.\n */"
    assert _feil(tekst) == [
        "kjerne/regel.ts:3: MM-U4 er opphevet og står uten MM-U9, som opphever den"
    ]


@pytest.mark.parametrize(
    "tekst",
    [
        "/*\n Var MM-U4,\n opphevet av MM-U9.\n*/",
        "<!-- Var MM-U4,\n     opphevet av MM-U9 -->",
    ],
)
def test_en_blokkommentar_uten_stjerne_paa_hver_linje_er_ett_avsnitt(tekst):
    assert _feil(tekst) == []


@pytest.mark.parametrize(
    "tekst",
    [
        "// MM-U9\n//\n// Avvist etter MM-U4.",
        "/**\n * MM-U9\n *\n * Avvist etter MM-U4.\n */",
        "// MM-U9 gjelder\n#felt = 'MM-U4'",
        "/** MM-U9 */\n// Avvist etter MM-U4.",
        "<!-- MM-U9 -->\n<!-- Avvist etter MM-U4 -->",
    ],
)
def test_et_annet_avsnitt_eller_en_kodelinje_er_en_egen_henvisning(tekst):
    assert len(_feil(tekst)) == 1


def test_en_glob_i_koden_aapner_ingen_kommentar():
    assert _feil("const m = 'src/**/*.ts';\nkode() // MM-U9\nx('MM-U4')") == [
        "kjerne/regel.ts:3: MM-U4 er opphevet og står uten MM-U9, som opphever den"
    ]


FORLOEP = {
    "id": "BF-99",
    "kontrollpunkter": [
        {
            "id": "p",
            "kontroller": [{"kilde": ["MM-U4", "MM-U9"]}],
            "forstaaelse": [{"tekst": "x", "kilde": ["MM-U4"]}],
        }
    ],
    "kilder": ["KA-U99", "KA-01"],
    "endringer": [{"grunnlag": "MM-U4", "kilde": ["MM-U4"]}],
}


def _kildefeil(data) -> list[str]:
    return vh.kildefeil("a.json", data, KJENTE, OPPHEVET, AAPNE)


def test_kildelistene_i_et_brukerforloep_har_stedet_med_id_ene():
    assert vh.kildelister(FORLOEP) == [
        ("BF-99/kontrollpunkter/p/kontroller[0]/kilde", ["MM-U4", "MM-U9"]),
        ("BF-99/kontrollpunkter/p/forstaaelse[0]/kilde", ["MM-U4"]),
        ("BF-99/kilder", ["KA-U99", "KA-01"]),
    ]


def test_en_kildeliste_med_et_opphevet_vedtak_alene_eller_en_ukjent_id_gir_feil():
    """En liste er én henvisning: MM-U4 med MM-U9 er lov, MM-U4 alene er det ikke.
    `endringer` fører historikken og leses ikke, og KA-01 er en rad, ikke et vedtak."""
    assert _kildefeil(FORLOEP) == [
        "a.json: BF-99/kontrollpunkter/p/forstaaelse[0]/kilde: MM-U4 er opphevet "
        "og står uten MM-U9, som opphever den",
        "a.json: BF-99/kilder: KA-U99 er ikke et vedtak i registeret",
    ]


def test_en_kilde_som_tekst_og_en_id_med_merknad_kontrolleres():
    """Invariantene i bevis-sakene har kilden som tekst, som `MM-U2` eller `KA-U1, KT-U1`."""
    assert _kildefeil(
        {"invarianter": [{"kilde": "MM-U4"}, {"kilde": "KA-U99 (merknad), MM-U9"}]}
    ) == [
        "a.json: invarianter[0]/kilde: MM-U4 er opphevet og står uten MM-U9, som opphever den",
        "a.json: invarianter[1]/kilde: KA-U99 er ikke et vedtak i registeret",
    ]


def test_merket_historisk_gjelder_ikke_i_en_kildeliste():
    assert len(_kildefeil({"kilde": ["MM-U4", "historisk"]})) == 1


def test_kildefilene_er_json_filene_i_domenetabellen(tmp_path):
    for sti in ("docs/domenetabell/a.json", "docs/domenetabell/b/c.json"):
        (tmp_path / sti).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / sti).write_text('{"kilde": ["MM-U4"]}', encoding="utf-8")
    (tmp_path / "docs/domenetabell/README.md").write_text("MM-U4", encoding="utf-8")
    assert [sti for sti, _ in vh.kildefiler(tmp_path)] == [
        "docs/domenetabell/a.json",
        "docs/domenetabell/b/c.json",
    ]



def test_en_rad_i_kjente_avvik_slipper_den_opphevede_id_en_i_fila_og_teller_treffet():
    truffet = collections.Counter()
    avvik = frozenset({("kjerne/regel.ts", "MM-U4")})
    tekst = "// Avvises etter MM-U4.\nkode()\n// MM-U4 igjen"
    assert vh.feil_i("kjerne/regel.ts", tekst, KJENTE, OPPHEVET, AAPNE, avvik, truffet) == []
    assert truffet == {("kjerne/regel.ts", "MM-U4"): 2}


def test_en_rad_i_kjente_avvik_gjelder_ikke_en_annen_fil():
    avvik = frozenset({("kjerne/regel.ts", "MM-U4")})
    feil = vh.feil_i(
        "kjerne/annen.ts", "// MM-U4", KJENTE, OPPHEVET, AAPNE, avvik, collections.Counter()
    )
    assert feil == ["kjerne/annen.ts:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"]


@pytest.mark.parametrize(
    ("treff", "melding"),
    [
        (0, "rett antallet eller fjern raden"),
        (1, "rett antallet eller fjern raden"),
        (3, "en ny henvisning må vise til posten som opphever den"),
    ],
)
def test_en_rad_i_kjente_avvik_med_et_annet_antall_treff_gir_feil(treff, melding):
    rader = (("kjerne/regel.ts", "MM-U4", 2, "#1433"),)
    feil = vh.avviksfeil(rader, collections.Counter({("kjerne/regel.ts", "MM-U4"): treff}))
    assert len(feil) == 1 and melding in feil[0]


def test_en_rad_i_kjente_avvik_med_riktig_antall_treff_gir_ingen_feil():
    rader = (("kjerne/regel.ts", "MM-U4", 2, "#1433"),)
    assert vh.avviksfeil(rader, collections.Counter({("kjerne/regel.ts", "MM-U4"): 2})) == []


@pytest.mark.parametrize(
    "rad",
    [
        ("kjerne/*.ts", "MM-U4", 1, "#1433"),
        ("kjerne/", "MM-U4", 1, "#1433"),
        ("kjerne/regel.ts", "MM-U4", 1, ""),
        ("kjerne/regel.ts", "MM-U4 og MM-U5", 1, "#1433"),
        ("kjerne/regel.ts", "MM-U4", 0, "#1433"),
    ],
)
def test_en_rad_i_kjente_avvik_med_feil_form_gir_feil(rad):
    feil = vh.avviksfeil((rad,), collections.Counter({(rad[0], rad[1]): rad[2]}))
    assert len(feil) == 1 and "må ha én fil, én ID, antallet og issuet" in feil[0]


def _tre(tmp_path, filer: dict[str, str]):
    for sti, tekst in filer.items():
        (tmp_path / sti).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / sti).write_text(tekst, encoding="utf-8")
    (tmp_path / "docs" / "domenetabell").mkdir(parents=True, exist_ok=True)
    return tmp_path


def test_kontroller_slipper_bare_raden_og_teller_treffene_per_fil(register, plan, tmp_path):
    # KA-U24 er opphevet av KA-U43 (#1433) og KA-U46.
    rot = _tre(tmp_path, {"kjerne/a.ts": "// KA-U24\n", "kjerne/b.ts": "// KA-U24\n"})
    rader = (("kjerne/a.ts", "KA-U24", 1, "#1433"),)
    assert vh.kontroller(register, plan, rot, rader, ()) == [
        "kjerne/b.ts:1: KA-U24 er opphevet og står uten KA-U43 eller KA-U46, som opphever den"
    ]


def test_kontroller_avviser_en_rad_med_feil_form_og_unntar_ingenting(register, plan, tmp_path):
    rot = _tre(tmp_path, {"kjerne/a.ts": "// KA-U24\n"})
    rader = (("kjerne/a.ts", "KA-U24", 1, ""),)
    feil = vh.kontroller(register, plan, rot, rader, ())
    assert "kjerne/a.ts:1: KA-U24 er opphevet og står uten KA-U43 eller KA-U46, som opphever den" in feil
    assert any("må ha én fil, én ID, antallet og issuet" in f for f in feil)


# --------------------------------------------------------------------------
# Dokumentene og designpostene (steg 3b i #1534)
# --------------------------------------------------------------------------


def test_dokumentene_er_bestillingene_systemfila_skillene_og_agents(tmp_path):
    """Svar 5 04.11 i #1534: der designet fra registeret flyttes."""
    for sti in (
        "docs/domenetabell/brukerforlop/BF-02A.md",
        "docs/domenetabell/brukerforlop/README.md",
        ".interface-design/system.md",
        ".claude/skills/vedtak/SKILL.md",
        ".claude/skills/miljo/referanse/x.md",
        "CLAUDE.md",
        "docs/annet.md",
    ):
        (tmp_path / sti).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / sti).write_text("KA-U1\n", encoding="utf-8")
    assert [sti for sti, _ in vh.dokumenter(tmp_path)] == [
        ".claude/skills/miljo/referanse/x.md",
        ".claude/skills/vedtak/SKILL.md",
        ".interface-design/system.md",
        "CLAUDE.md",
        "docs/domenetabell/brukerforlop/BF-02A.md",
    ]


@pytest.mark.parametrize(
    "tekst, feil",
    [
        ("Regelen står i MM-U4\nog i MM-U9.\n", []),
        ("Regelen står i MM-U4.\n\nDen står i MM-U9.\n", ["x.md:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"]),
        ("- MM-U4 gjelder.\n- MM-U9 gjelder.\n", ["x.md:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"]),
        ("| MM-U4 |\n| MM-U9 |\n", ["x.md:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"]),
        ("## MM-U4\nMM-U9 gjelder.\n", ["x.md:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"]),
        ("- MM-U4 gjelder\n  fortsatt etter MM-U9.\n", []),
        ("Se XX-U7.\n", ["x.md:1: XX-U7 er ikke et vedtak i registeret"]),
    ],
)
def test_i_et_dokument_er_henvisningen_et_avsnitt_et_punkt_en_rad_eller_en_overskrift(tekst, feil):
    assert _feil(tekst, "x.md") == feil


def test_historisk_slipper_ikke_en_opphevet_id_i_et_dokument():
    assert _feil("Historisk: MM-U4.\n", "CLAUDE.md") == [
        "CLAUDE.md:1: MM-U4 er opphevet og står uten MM-U9, som opphever den"
    ]


DESIGN = {"MM-U22": ["VS-U3"], "OV-U77": []}
KJENTE_D = KJENTE | {"MM-U22", "OV-U77", "VS-U3"}


def _designfeil(tekst: str, sti: str) -> list[str]:
    return vh.feil_i(sti, tekst, KJENTE_D, OPPHEVET, AAPNE, design_=DESIGN)


@pytest.mark.parametrize(
    "sti",
    [
        "kjerne/frosset/a.ts",
        "kjerne/kommandoer/a.ts",
        "kjerne/regler/a.ts",
        # #1783: rollefilene i et spor som hører til mappene over.
        "kjerne/spor/vederlag/frysing.ts",
        "kjerne/spor/vederlag/tekst.ts",
        "kjerne/spor/frist/kommando.ts",
    ],
)
def test_en_designpost_alene_i_reglene_gir_feil_som_foreslaar_bindende_i(sti):
    """Arbeidsvalget for kontroll 2 04.11 i #1534."""
    assert _designfeil("// MM-U22\n", sti) == [
        f"{sti}:1: MM-U22 er design og står som eneste grunnlag; vis også til VS-U3"
    ]
    assert _designfeil("// MM-U22, VS-U3\n", sti) == []


def test_en_designpost_uten_bindende_i_ber_om_feltet():
    assert _designfeil("// OV-U77\n", "kjerne/regler/a.ts") == [
        "kjerne/regler/a.ts:1: OV-U77 er design og står som eneste grunnlag; "
        "før vedtaket med den bindende setningen i bindende_i i registeret"
    ]


@pytest.mark.parametrize(
    "sti",
    [
        "kjerne/utledning/a.ts",
        "server/a.ts",
        "src/a.ts",
        "kjerne/reglerx/a.ts",
        "kjerne/spor/vederlag/utledning.ts",
        "kjerne/spor/vederlag/visning.ts",
        "kjerne/spor/vederlag/format.ts",
        "kjerne/spor/vederlag/tekst/a.ts",
    ],
)
def test_en_designpost_alene_utenfor_reglene_er_lov(sti):
    assert _designfeil("// MM-U22\n", sti) == []


def test_en_kjent_designhenvisning_telles_og_slipper_gjennom():
    truffet = collections.Counter()
    feil = vh.feil_i(
        "kjerne/regler/a.ts", "// MM-U22\n", KJENTE_D, OPPHEVET, AAPNE,
        design_=DESIGN, designavvik=frozenset({("kjerne/regler/a.ts", "MM-U22")}),
        designtruffet=truffet,
    )
    assert feil == [] and truffet == {("kjerne/regler/a.ts", "MM-U22"): 1}


def test_en_designpost_alene_i_en_bevis_sak_gir_feil():
    """Steg 3b i #1534: `kilde` i bevis-sakene er ikke bare en designpost."""
    data = {"saker": [{"id": "S-1", "kilde": ["MM-U22"]}]}
    def feil(sti):
        return vh.kildefeil(sti, data, KJENTE_D, OPPHEVET, AAPNE, DESIGN)
    assert feil("docs/domenetabell/bevis-saker.json") == [
        "docs/domenetabell/bevis-saker.json: saker/S-1/kilde: MM-U22 er design og står som "
        "eneste grunnlag; vis også til VS-U3"
    ]
    assert feil("docs/domenetabell/brukerforlop/BF-01.json") == []
    data["saker"][0]["kilde"].append("VS-U3")
    assert feil("docs/domenetabell/bevis-saker-maalmodell.json") == []


def test_designpostene_er_id_ene_der_hver_post_er_design(register):
    design = vh.design(register)
    assert "OV-U81" in design and "VS-U3" not in design
    assert design["OV-U70"] == ["MM-U50", "OV-U4", "OV-U80"]


@pytest.mark.parametrize("issue, gyldig", [("#1534, steg 4", True), ("#1433", True), ("steg 4", False), ("#1534 steg 4", False)])
def test_en_rad_i_lista_viser_til_issuet_eventuelt_med_steget(issue, gyldig):
    assert vh.gyldig_rad(("kjerne/a.ts", "MM-U22", 1, issue)) is gyldig


def test_lista_over_kjente_designavvik_kan_bare_krympe(register, plan, tmp_path):
    rot = _tre(tmp_path, {"kjerne/regler/a.ts": "// OV-U81\n"})
    rader = (("kjerne/regler/a.ts", "OV-U81", 2, "#1534, steg 4"),)
    assert vh.kontroller(register, plan, rot, (), rader) == [
        "KJENTE_DESIGNAVVIK: OV-U81 står som eneste grunnlag 1 ganger i kjerne/regler/a.ts, og "
        "raden (#1534, steg 4) sier 2; rett antallet eller fjern raden"
    ]


def test_et_kjent_avvik_i_en_kildeliste_telles_og_gir_ingen_feil():
    """En opphevet ID alene i en JSON-kilde kan stå i KJENTE_AVVIK med issuet som skriver den om
    (#1553), som i koden. Kontrollsaken: uten raden gir den feil."""
    avvik = frozenset({("a.json", "MM-U4")})
    truffet: collections.Counter = collections.Counter()
    data = {"kilder": ["MM-U4"]}
    assert vh.kildefeil("a.json", data, KJENTE, OPPHEVET, AAPNE, avvik=avvik, truffet=truffet) == []
    assert truffet[("a.json", "MM-U4")] == 1
    assert len(_kildefeil(data)) == 1


def test_en_historisk_sporsmalsfil_kan_ha_en_opphevet_id_alene():
    """BF-06-sporsmal.md fører spørsmålene ordrett slik de ble stilt (S2 A, #1534). En ukjent ID
    gir fortsatt feil der."""
    sti = "docs/domenetabell/brukerforlop/BF-06-sporsmal.md"
    assert sti in vh.HISTORISKE_DOKUMENTER
    assert _feil("Følger MM-U4.", sti) == []
    assert len(_feil("Følger XX-U99.", sti)) == 1
    assert len(_feil("Følger MM-U4.", "docs/domenetabell/brukerforlop/BF-06.md")) == 1


def test_grunnlagsmappene_dekker_rollefilene_arkitekturtesten_regner_til_dem():
    """#1783: rollene i arkitekturtesten og `i_grunnlagsmappe` er samme regel."""
    tekst = (ROT / "kjerne/tester/arkitektur.test.ts").read_text()
    tabell = re.search(r"const ROLLER = \{(.*?)\} as const;", tekst, re.S)
    assert tabell, "fant ikke ROLLER i arkitekturtesten"
    roller = dict(re.findall(r"(\w+): '(\w+)'", tabell.group(1)))
    assert len(roller) >= 6, roller
    for rolle, mappe in roller.items():
        sti = f"kjerne/spor/vederlag/{rolle}.ts"
        assert vh.i_grunnlagsmappe(sti) == (f"kjerne/{mappe}/" in vh.GRUNNLAGSMAPPER), sti
