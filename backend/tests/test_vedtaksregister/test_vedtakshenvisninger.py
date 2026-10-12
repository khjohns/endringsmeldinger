"""Vedtaks-ID-ene i kjerne/, server/ og src/ mot vedtaksregisteret (#452).

Reglene står i docs/verktoy/vedtakshenvisninger.py og i #451, punkt 2: en ukjent
ID gir feil, og en opphevet ID gir feil når den står som eneste grunnlag, unntatt
i en test merket historisk.
"""

import importlib.util
import pathlib

import pytest

ROT = pathlib.Path(__file__).resolve().parents[3]


def _verktoy():
    spesifikasjon = importlib.util.spec_from_file_location(
        "vedtakshenvisninger", ROT / "docs" / "verktoy" / "vedtakshenvisninger.py"
    )
    modul = importlib.util.module_from_spec(spesifikasjon)
    spesifikasjon.loader.exec_module(modul)
    return modul


vh = _verktoy()
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


def test_kontrollen_leser_vedtaks_id_er_i_alle_tre_mappene():
    funnet = {
        sti.split("/")[0] for sti, tekst in vh.filer() if vh.HENVISNING.search(tekst)
    }
    assert funnet == set(vh.MAPPER)


def test_mm_u9_gjoer_mm_u4_til_mm_u6_opphevet(register):
    # Forventningen er raden til MM-U9 i 3.1: «Opphever MM-U4, MM-U5 og MM-U6».
    kjente, opphevet = vh.vedtak(register)
    assert {"MM-U4", "MM-U5", "MM-U6"} <= opphevet
    assert {"MM-U4", "MM-U9"} <= kjente


def test_b_id_er_fra_radene_og_de_aapne_beslutningene(register, plan):
    kjente, _ = vh.vedtak(register)
    assert {"B-13", "B-17"} <= kjente
    assert "B-16" in vh.aapne_beslutninger(plan) - kjente


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
    ["kjerne/tester/regel.ts", "src/lib/regel.test.ts", "server/tester/a.ts"],
)
def test_opphevet_id_i_en_test_merket_historisk_er_lov(sti):
    assert _feil("it('historisk: MM-U4 avviste brevet', () => {})", sti) == []


def test_opphevet_id_i_en_test_uten_merket_gir_feil():
    assert _feil("it('MM-U4 avviser brevet', () => {})", "src/lib/a.test.ts") == [
        "src/lib/a.test.ts:1: MM-U4 er opphevet og står som eneste grunnlag"
    ]


def test_merket_historisk_utenfor_en_test_gir_feil():
    assert _feil("// historisk: MM-U4") == [
        "kjerne/regel.ts:1: MM-U4 er opphevet og står som eneste grunnlag"
    ]


def test_linjenummeret_er_starten_paa_kommentarblokken():
    tekst = "kode()\n/**\n * Etter MM-U4.\n */"
    assert _feil(tekst) == [
        "kjerne/regel.ts:2: MM-U4 er opphevet og står som eneste grunnlag"
    ]
