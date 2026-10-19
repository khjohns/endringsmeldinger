"""Vedtaks-ID-ene i kjerne/, server/ og src/ mot vedtaksregisteret (#452).

Reglene står i docs/verktoy/vedtakshenvisninger.py og i #451, punkt 2: en ukjent
ID gir feil, og en opphevet ID gir feil når den står som eneste grunnlag, unntatt
i en test merket historisk.
"""

import pathlib

import pytest

from tests.verktoy import last

ROT = pathlib.Path(__file__).resolve().parents[3]


vh = last("vedtakshenvisninger")
vr = vh.vr

KJENTE = {"MM-U4", "MM-U9", "KA-U1", "B-13"}
OPPHEVET = {"MM-U4"}
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
    assert {"MM-U4", "MM-U5", "MM-U6"} <= opphevet
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
    assert vh.vedtak(register) == ({"B-03", "KA-U1"}, {"B-03"})


@pytest.mark.parametrize("neste", ["## 4. Funnregister", "# Vedlegg", "### 3.5 x"])
def test_aapne_beslutninger_leses_bare_fra_3_4(neste):
    plan = (
        "#### 3.4 Et underavsnitt\n| B-01 | x |\n"
        "### 3.4 Åpne beslutninger\n| B-16 | x |\n"
        f"{neste}\n| B-02 | x |\n"
    )
    assert vh.aapne_beslutninger(plan) == {"B-16"}


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
        "kjerne/regel.ts:1: MM-U4 er opphevet og står som eneste grunnlag"
    ]


def test_opphevet_id_med_gjeldende_vedtak_i_samme_kommentarblokk_er_lov():
    tekst = "// Var MM-U4,\n// opphevet av MM-U9.\nkode()"
    assert _feil(tekst) == []


def test_gjeldende_vedtak_utenfor_kommentarblokken_teller_ikke():
    tekst = "// Avvises etter MM-U4.\nkode()\n// MM-U9"
    assert _feil(tekst) == [
        "kjerne/regel.ts:1: MM-U4 er opphevet og står som eneste grunnlag"
    ]


def test_aapen_b_id_er_ikke_et_gjeldende_grunnlag_for_en_opphevet_id():
    assert _feil("// MM-U4 og B-06") == [
        "kjerne/regel.ts:1: MM-U4 er opphevet og står som eneste grunnlag"
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
        "src/lib/a.test.ts:1: MM-U4 er opphevet og står som eneste grunnlag"
    ]


def test_et_ord_som_begynner_med_historisk_er_ikke_merket():
    tekst = "it('MM-U4 avviser, som i historiske saker', () => {})"
    assert len(_feil(tekst, "src/lib/a.test.ts")) == 1


def test_ikke_historisk_er_ikke_merket():
    tekst = "it('ikke historisk: MM-U4 avviser', () => {})"
    assert len(_feil(tekst, "src/lib/a.test.ts")) == 1


def test_merket_historisk_utenfor_en_test_gir_feil():
    assert _feil("// historisk: MM-U4") == [
        "kjerne/regel.ts:1: MM-U4 er opphevet og står som eneste grunnlag"
    ]


def test_linjenummeret_er_starten_paa_avsnittet():
    tekst = "kode()\n/**\n * Etter MM-U4.\n */"
    assert _feil(tekst) == [
        "kjerne/regel.ts:3: MM-U4 er opphevet og står som eneste grunnlag"
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
        "kjerne/regel.ts:3: MM-U4 er opphevet og står som eneste grunnlag"
    ]
