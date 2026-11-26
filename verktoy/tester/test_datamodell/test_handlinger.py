"""Registeret over handlingene og tilstandene, docs/datamodell/handlinger.toml (#2003, OV-U97).

Her prøves formen, kildene mot vedtaksregisteret, at hvert skjema i Varden har en rad og at
handlinger.md er generert. At kjernens kommandoer, handlingsnøkler og betegnelser har rad,
og at kjernen ikke tilbyr en handling som venter, sendes som innlegg eller er opphevet,
prøves i kjerne/tester/ (steg 2 i #2003).
"""

import copy

import pytest

from verktoymoduler import last

hr, vh = last("handlinger", "vedtakshenvisninger")
vr = vh.vr


@pytest.fixture(scope="module")
def register():
    return hr.les()


def _rad(register, id_):
    return next(h for h in register["handling"] if h["id"] == id_)


def _med_avvik(r):
    """Registeret med et gyldig avvik, så formen på avvikene kan prøves også når lista er tom."""
    r.setdefault("avvik", []).append({"noekler": ["protest:*"], "handling": "I2", "funn": "K0", "issue": 1})
    return r["avvik"]


def test_registeret_er_gyldig(register):
    assert hr.valider(register) == []


@pytest.mark.parametrize(
    ("endring", "melding"),
    [
        (lambda r: r["handling"][0].pop("kilde"), "mangler kilde"),
        (lambda r: r["handling"][0].update(hjemmel="32.2"), "ukjent felt hjemmel"),
        (lambda r: r["handling"][0].update(part="TE eller BH"), "ukjent part"),
        (lambda r: r["handling"][0].update(spor=["pris"]), "ukjent spor pris"),
        (lambda r: r["handling"][0].update(status="senere"), "ukjent status senere"),
        (lambda r: r["handling"][0].update(status="naa"), "passer ikke til serien"),
        (lambda r: r["handling"][0].update(id="X1"), "id er ikke på formen"),
        (lambda r: r["handling"][0].update(id=""), "id er ikke på formen"),
        (lambda r: r["handling"][0].update(skjema=["svare:frist"]), "er ikke en av nøklene i raden"),
        (lambda r: r["handling"][0].update(noekler=["Krav forhold"]), "er ikke på formen type"),
        (lambda r: r["handling"][0].update(kilde=[]), "kilde er tom"),
        (lambda r: r["handling"].append(copy.deepcopy(r["handling"][0])), "står i både G1 og G1"),
        (lambda r: r["handling"][1]["noekler"].append("krav:forhold"), "krav:forhold: står i både"),
        (lambda r: r["handling"][1]["noekler"].append("korrigere:krav-1"), "mens korrigere:* står i U7"),
        (lambda r: r["betegnelse"][0].update(status="foreldet"), "ukjent status foreldet"),
        (lambda r: r["betegnelse"].append(copy.deepcopy(r["betegnelse"][0])), "står to ganger"),
        (lambda r: r["betegnelse"][0].update(kilde="OV-U97"), "kilde er ikke en liste"),
        (lambda r: _med_avvik(r).append(copy.deepcopy(r["avvik"][-1])), "står i et annet avvik"),
        (lambda r: _med_avvik(r)[-1].update(handling="G1"), "nøklene står ikke i handlingen G1"),
        (lambda r: r.update(tilstand=[]), "ukjent seksjon"),
    ],
)
def test_vakta_melder_feil_i_formen(register, endring, melding):
    endret = copy.deepcopy(register)
    endring(endret)
    assert any(melding in feil for feil in hr.valider(endret)), hr.valider(endret)


def test_et_avvik_maa_gjelde_en_handling_som_ikke_skal_tilbys(register):
    endret = copy.deepcopy(register)
    endret.setdefault("avvik", []).append({"noekler": ["krav:forhold"], "handling": "G1", "funn": "K0", "issue": 1})
    assert any("ikke et avvik" in f for f in hr.valider(endret))


def test_hver_kilde_er_et_vedtak_i_registeret(register):
    vedtakene = vr.les()
    kjente, opphevet = vh.vedtak(vedtakene)
    plan = vr.HOVEDPLAN.read_text(encoding="utf-8")
    aapne = vh.aapne_beslutninger(plan) | vh.avgjorte_beslutninger(plan)
    assert vh.kildefeil("docs/datamodell/handlinger.toml", register, kjente, opphevet, aapne) == []


def test_en_ukjent_eller_opphevet_kilde_gir_feil(register):
    kjente, opphevet = vh.vedtak(vr.les())
    endret = copy.deepcopy(register)
    _rad(endret, "G1")["kilde"].append("GR-U999")
    _rad(endret, "O3")["kilde"].remove("OV-U101")
    feil = vh.kildefeil("handlinger.toml", endret, kjente, opphevet, set())
    assert any("GR-U999 er ikke et vedtak" in f for f in feil), feil
    assert any("GR-U35 er opphevet" in f for f in feil), feil


def test_hvert_skjema_i_varden_har_en_rad(register):
    i_registeret = {s for h in register["handling"] for s in h["skjema"]}
    i_varden = hr.skjemaene_i_varden()
    assert i_varden - i_registeret == set(), "Skjemaet i Varden mangler rad i handlinger.toml"
    assert i_registeret - i_varden == set(), "Raden viser til et skjema Varden ikke har"


def test_skjemaene_i_varden_leses_av_noeklene_i_hvert_skjema(tmp_path):
    sti = tmp_path / "Vardensak.svelte"
    sti.write_text(
        "  const skjemaene = {\n"
        "    vederlagssvar: {\n"
        "      noekler: ['svare:vederlag'],\n"
        "      aapne: () => (arbeid = { art: '}', noekler: ['godta:vederlag'] }),\n"
        "    },\n"
        "    // noekler: ['krav:frist'] i en kommentar\n"
        "    korrigering: { noekler: [], vises: () => [`{${x}`] },\n"
        '    fristkrav: { noekler: ["innlegg:forhold", `registrere_brev`], skjema: fristkrav },\n'
        "  } satisfies Record<string, Skjema>;\n"
        "  const andre = { a: { noekler: ['godta:frist'] } };\n",
        encoding="utf-8",
    )
    assert hr.skjemaene_i_varden(sti) == {"svare:vederlag", "innlegg:forhold", "registrere_brev"}


def test_skjemaene_i_varden_feiler_naar_tabellen_mangler_eller_ikke_lukkes(tmp_path):
    sti = tmp_path / "Vardensak.svelte"
    sti.write_text("  const skjemaer = {};\n", encoding="utf-8")
    with pytest.raises(ValueError, match="ingen `const skjemaene`"):
        hr.skjemaene_i_varden(sti)
    sti.write_text("  const skjemaene = {\n    fristsvar: { noekler: ['svare:frist'],\n", encoding="utf-8")
    with pytest.raises(ValueError, match="lukkes ikke"):
        hr.skjemaene_i_varden(sti)


def test_hver_handling_i_skjemaet_i_vurderingsfila_har_en_rad(register):
    """G1–G5 og U1–U9 i tabellene «Skjemaet» i vurderingsfila."""
    ider = {h["id"] for h in register["handling"]}
    assert {f"G{n}" for n in range(1, 6)} | {f"U{n}" for n in range(1, 10)} <= ider


def test_markdown_er_generert_fra_registeret(register):
    assert hr.MARKDOWN.read_text(encoding="utf-8") == hr.markdown(register), (
        "handlinger.md er utdatert. Kjør /tmp/venv/bin/python docs/verktoy/datamodell.py fra repo-roten."
    )
