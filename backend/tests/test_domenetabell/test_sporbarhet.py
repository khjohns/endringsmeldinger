"""Sporbarheten i domenetabellen: regelrad, funksjon og regelkode (#455, punkt 6 i #451).

Kontrollen står i `docs/verktoy/domenetabell.py`. Hver test endrer én ting i en
kopi av `regler.json` og viser at kontrollen melder akkurat det.
"""

import copy

import pytest

from tests.test_domenetabell import korpus

v = korpus.verktoy


def _feil(regler, rot=v.ROT):
    return v.valider(regler, korpus.KORPUS, rot=rot)


@pytest.fixture
def regler():
    return copy.deepcopy(korpus.REGLER)


def _rad_med(regler, felt):
    return next(r for r in regler["rader"] if felt in r)


def test_regler_json_er_sporbar_uten_feil(regler):
    assert _feil(regler) == []


def test_hver_regelkode_i_kjernen_staar_paa_en_rad_eller_uten_rad_med_grunn(regler):
    koder, feil = v._regelkoder_i_kjernen(v.ROT)
    assert feil == []
    paa_rad = {k for r in regler["rader"] for k in r.get("regelkoder", [])}
    assert koder == paa_rad | set(regler["koder_uten_rad"])


def test_en_funksjon_som_ikke_er_deklarert_gir_feil(regler):
    rad = _rad_med(regler, "funksjoner")
    sti = rad["funksjoner"][0].partition("#")[0]
    rad["funksjoner"] = [f"{sti}#finnesIkke", "kjerne/finnes-ikke.ts#utled", "kjerne/../x.ts#y", f"{v.ROT}/{sti}#utled"]
    feil = _feil(regler)
    assert f"{rad['id']}: finnesIkke er ikke deklarert i {sti}" in feil
    assert f"{rad['id']}: funksjonen 'kjerne/finnes-ikke.ts#utled' er ikke `sti#navn` med en fil som finnes" in feil
    assert f"{rad['id']}: funksjonen 'kjerne/../x.ts#y' er ikke `sti#navn` med en fil som finnes" in feil
    assert f"{rad['id']}: funksjonen '{v.ROT}/{sti}#utled' er ikke `sti#navn` med en fil som finnes" in feil


def test_et_navn_i_en_kommentar_eller_midt_paa_en_linje_er_ikke_en_deklarasjon(tmp_path):
    sti = tmp_path / "a.ts"
    sti.write_text(
        "// function borte\nx = 1; const ogsaa = 2;\nfunction ytre() {\n  const lokal = 1;\n}\n"
        "export function her() {}\nexport default function d() {}\nexport abstract class A {}\n"
        "function *gen() {}\n",
        encoding="utf-8",
    )
    navn = ("borte", "ogsaa", "lokal", "her", "d", "A", "gen")
    assert [v._deklarert(sti, n) for n in navn] == [False, False, False, True, True, True, True]


def test_en_regelkode_paa_en_rad_uten_bevis_sak_som_kontrollerer_den_gir_feil(regler):
    """Koden finnes i kjernen, men ingen bevis-sak for KA-01 kontrollerer den."""
    rad = next(r for r in regler["rader"] if r["id"] == "KA-01")
    kode = next(iter(regler["koder_uten_rad"]))
    del regler["koder_uten_rad"][kode]
    rad["regelkoder"] = [kode]
    assert _feil(regler) == [f"KA-01: ingen bevis-sak for raden kontrollerer regelkoden {kode}"]


def test_en_ukjent_regelkode_paa_en_rad_gir_feil(regler):
    rad = _rad_med(regler, "regelkoder")
    rad["regelkoder"] = rad["regelkoder"] + ["FINNES_IKKE"]
    assert _feil(regler) == [f"{rad['id']}: regelkoden FINNES_IKKE finnes ikke i kjernen"]


def test_en_regelkode_som_verken_staar_paa_en_rad_eller_uten_rad_gir_feil(regler):
    kode = next(iter(regler["koder_uten_rad"]))
    del regler["koder_uten_rad"][kode]
    assert _feil(regler) == [f"{kode}: regelkoden står verken på en rad eller i koder_uten_rad"]


def test_en_regelkode_paa_en_rad_kan_ikke_ogsaa_staa_uten_rad(regler):
    kode = _rad_med(regler, "regelkoder")["regelkoder"][0]
    regler["koder_uten_rad"][kode] = "grunn"
    assert _feil(regler) == [f"koder_uten_rad: {kode} står også på en rad"]


def test_et_kall_til_avvis_uten_strenglitteral_gir_feil(tmp_path):
    """Kontrollen finner bare koder som strenglitteral, så et annet kall må synes."""
    (tmp_path / "kjerne" / "tester").mkdir(parents=True)
    (tmp_path / "kjerne" / "a.ts").write_text(
        "/** `avvis(kode, melding)` */\n// avvis('I_KOMMENTAR', 'm')\nexport const f = () =>\n  avvis(\n    'KODE_A', 'm') ?? avvis(k, 'm');\n"
        "/*\n  Eksempel: avvis(kode, melding)\n*/\n/* NB */ avvis(k2, 'm');\n",
        encoding="utf-8",
    )
    (tmp_path / "kjerne" / "tester" / "b.ts").write_text("avvis('KODE_I_TEST', 'm');\n", encoding="utf-8")
    koder, feil = v._regelkoder_i_kjernen(tmp_path)
    assert koder == {"KODE_A"}
    assert feil == [
        "kjerne/a.ts:5: `avvis` uten regelkoden som strenglitteral",
        "kjerne/a.ts:9: `avvis` uten regelkoden som strenglitteral",
    ]


def _arbeidsvalg(**endring):
    return {
        "id": "A-451",
        "type": "arbeidsvalg",
        "dato": "2026-10-12",
        "issue": 451,
        "merknad": "Hvordan koden viser til vedtakene.",
        **endring,
    }


def test_et_arbeidsvalg_er_en_gyldig_kilde_for_en_arbeidshypotese(regler):
    regler["kilder"].append(_arbeidsvalg())
    rad = next(r for r in regler["rader"] if r["tolkningsstatus"] == "arbeidshypotese")
    rad["kilder"] = ["A-451"]
    assert _feil(regler) == []
    assert v._kilde(_arbeidsvalg()) == (
        "[arbeidsvalg i #451](https://github.com/khjohns/endringsmeldinger/issues/451)"
    )


def test_avklart_tolkning_uten_et_vedtak_blant_kildene_gir_feil(regler):
    """Punkt 9 i #451: autoriteten flyttes ikke; et arbeidsvalg er ikke et vedtak."""
    regler["kilder"].append(_arbeidsvalg())
    rad = next(r for r in regler["rader"] if r["tolkningsstatus"] == "avklart_tolkning")
    rad["kilder"] = ["A-451", "NS-32.1"]
    assert _feil(regler) == [f"{rad['id']}: avklart tolkning uten et vedtak blant kildene"]


def test_et_arbeidsvalg_uten_issue_dato_eller_merknad_gir_feil(regler):
    regler["kilder"].append(_arbeidsvalg(issue="#451", dato="12.10", merknad=""))
    assert _feil(regler) == [
        "A-451: et arbeidsvalg viser til issuet med `issue`",
        "A-451: et arbeidsvalg har `dato`",
        "A-451: et arbeidsvalg sier i `merknad` hva som ble valgt",
    ]


def test_en_ukjent_kildetype_gir_feil(regler):
    regler["kilder"].append(_arbeidsvalg(type="hypotese"))
    assert _feil(regler) == ["A-451: ukjent kildetype 'hypotese'"]


def _maal_med_kontroll(kilde):
    """Et forløp for KA-31 og VS-06 der én kontroll har regelkoden GRUNNLAG_IKKE_SENDT."""
    maal = copy.deepcopy(v.les_maalmodell())
    kontroll = {"etter": 0, "rolle": "mal", "kilde": kilde, "forventet": {"regel": "GRUNNLAG_IKKE_SENDT"}}
    for f in maal["forlop"]:
        f["kontroller"] = [k for k in f["kontroller"] if k["forventet"].get("regel") != "GRUNNLAG_IKKE_SENDT"]
    maal["forlop"].append({"id": "F-PROVE", "rader": ["KA-31", "VS-06"], "kontroller": [kontroll]})
    return maal


def test_en_regelkode_gjelder_raden_kontrollen_viser_til_i_kilde(regler):
    """Begge radene har GRUNNLAG_IKKE_SENDT. Viser kontrollen til KA-31, er koden ikke prøvd for VS-06."""
    navngitt = v._valider_sporbarhet(regler, _maal_med_kontroll(["KA-31", "KA-U15"]), v.ROT)
    uten_rad = v._valider_sporbarhet(regler, _maal_med_kontroll(["KA-U15"]), v.ROT)
    assert navngitt == ["VS-06: ingen bevis-sak for raden kontrollerer regelkoden GRUNNLAG_IKKE_SENDT"]
    assert uten_rad == []


def test_en_kontroll_som_viser_til_en_rad_forloepet_ikke_har_gir_feil(regler):
    maal = _maal_med_kontroll(["KA-31", "GR-28"])
    feil = v._valider_sporbarhet(regler, maal, v.ROT)
    assert "F-PROVE: kontrollen viser til GR-28, som ikke står i forløpets rader" in feil

