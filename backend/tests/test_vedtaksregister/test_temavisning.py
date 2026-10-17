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
import re

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


def _lenkekontroll():
    spesifikasjon = importlib.util.spec_from_file_location(
        "lenkekontroll", ROT / "docs" / "verktoy" / "lenkekontroll.py"
    )
    modul = importlib.util.module_from_spec(spesifikasjon)
    spesifikasjon.loader.exec_module(modul)
    return modul


lk = _lenkekontroll()

GRUNNLAGSSVAR = "grunnlagssvar-som-endringsordre"
MERKET = re.compile(r"^\*\*((?:Forkastet|Utsatt)[^*]*:)\*\* ")


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
        sti = tv.sti(tema)
        melding = (
            f"{sti.relative_to(ROT)} er ikke lik det generatoren lager. "
            "Kjør python3 docs/verktoy/temavisning.py."
        )
        assert sti.exists(), melding
        assert sti.read_text(encoding="utf-8") == tv.visning(tema, kilder), melding


def test_lenkene_i_de_innsjekkede_visningene_er_hele(temaer, capsys):
    """#494 og #509: en relativ lenke i 3.1 er relativ til docs/plans/, og visningen ligger et annet sted."""
    stier = [tv.sti(t) for t in temaer]
    mangler = [str(s.relative_to(ROT)) for s in stier if not s.exists()]
    assert not mangler, f"{', '.join(mangler)} mangler. Kjør python3 docs/verktoy/temavisning.py."
    assert lk.main([str(s) for s in stier]) == 0, capsys.readouterr().out


@pytest.mark.parametrize("tekst, forventet", [
    (
        "[KK-01](../vedlegg/review.md#kk-01-om--3413)",
        "[KK-01](../../vedlegg/review.md#kk-01-om--3413)",
    ),
    ("[tabellen](../domenetabell/README.md)", "[tabellen](../../domenetabell/README.md)"),
    ("[planen](annen-plan.md#a)", "[planen](../../plans/annen-plan.md#a)"),
    ("[GR-U10](#gr-u10)", "[GR-U10](#gr-u10)"),
    ("[GR-U2](#gr-u2)", f"[GR-U2]({tv.TIL_PLANEN}#gr-u2)"),
    ("[#264](https://github.com/khjohns/endringsmeldinger/issues/264)",
     "[#264](https://github.com/khjohns/endringsmeldinger/issues/264)"),
    ("[#264](HTTPS://github.com/a)", "[#264](HTTPS://github.com/a)"),
    ("[e-post](mailto:a@b.no)", "[e-post](mailto:a@b.no)"),
    ('[tabellen](../domenetabell/README.md "Tabellen")', '[tabellen](../../domenetabell/README.md "Tabellen")'),
    ("[tabellen](<../domenetabell/README.md> \"T\")", "[tabellen](<../../domenetabell/README.md> \"T\")"),
    ("[GR-U2](#gr-u2 'GR-U2')", f"[GR-U2]({tv.TIL_PLANEN}#gr-u2 'GR-U2')"),
    ("[tabellen](/docs/domenetabell/README.md#a)", "[tabellen](../../domenetabell/README.md#a)"),
    ("[GR-U10](2026-09-16-godkjenning-og-varig-levering.md#gr-u10)", "[GR-U10](#gr-u10)"),
    ("[GR-U2](2026-09-16-godkjenning-og-varig-levering.md#gr-u2)", f"[GR-U2]({tv.TIL_PLANEN}#gr-u2)"),
    ("[GR-U10](/docs/plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u10)", "[GR-U10](#gr-u10)"),
    ("[planen](2026-09-16-godkjenning-og-varig-levering.md)", f"[planen]({tv.TIL_PLANEN})"),
])
def test_lenkene_fra_3_1_skrives_om_til_mappen_visningen_ligger_i(tekst, forventet):
    assert tv._lenker(tekst, {"gr-u10"}) == forventet


def test_visningen_sier_at_3_1_er_autoritativ_og_lager_ingen_sammenslatt_ordlyd(tema, kilder):
    tekst = tv.visning(tema, kilder)
    assert "**Avsnitt [3.1 i hovedplanen](" in tekst
    assert "er autoritativ.**" in tekst
    assert "lager ingen sammenslått gjeldende ordlyd" in tekst


def _seksjon(tekst: str, etikett: str) -> list[str]:
    """Linjene under overskriften til vedtaket, fram til neste overskrift på nivå 2 eller 3."""
    vedtakene = tekst.split("\n## Vedtakene\n", 1)[1].split("\n## ", 1)[0]
    deler = vedtakene.split("\n### ")
    return next(d for d in deler if d.split("\n", 1)[0].endswith(f"</a>{etikett}")).splitlines()[1:]


def test_seksjonen_for_det_siste_vedtaket_slutter_foer_regelradene(tema, kilder):
    tekst = tv.visning(tema, kilder)
    siste = vr.etikett(tv.utdrag(tema, kilder)["poster"][-1])
    seksjon = [linje for linje in _seksjon(tekst, siste) if linje]
    assert seksjon[-1].startswith("**Bevis-saker som viser til vedtaket:**")
    assert not any(linje.startswith("#") for linje in seksjon)


def test_hvert_vedtak_i_temaet_star_ordrett_med_det_forkastede_merket_for_seg(tema, kilder):
    tekst = tv.visning(tema, kilder)
    for vedtak in tema["vedtak"]:
        post = _post(kilder["register"], vedtak.lower())
        seksjon = [linje for linje in _seksjon(tekst, vr.etikett(post)) if linje]
        sitat = [linje.removeprefix("> ") for linje in seksjon if linje.startswith("> ")]
        forkastet = [MERKET.sub(r"\1 ", linje) for linje in seksjon if MERKET.match(linje)]
        assert len(sitat) == 1
        if "vedtak" in post:
            assert not tv.MERKE.search(sitat[0])
        celle = re.sub(r'^<a id="[^"]*"></a>', "", vr.vedtakscelle(post))
        assert re.sub(r"\]\([^)]*#", "](#", " ".join(sitat + forkastet)) == celle


@pytest.mark.parametrize("anker, merker", [
    ("gr-u14", ["Forkastet for registrerte krav:"]),
    ("lv-u4", ["Forkastet for setningen om endringsordren i punkt 1:", "Forkastet for punkt 6:"]),
    ("ka-u16", ["Forkastet foreløpig:"]),
    ("ka-u19", ["Forkastet:", "Utsatt:"]),
    ("gr-u10", []),
])
def test_de_forkastede_alternativene_skilles_ut_med_merket_og_teksten_blir_lik_3_1(anker, merker, kilder):
    post = _post(kilder["register"], anker)
    vedtak, forkastet = tv.vedtak_og_forkastet(post)
    assert [m for m, _ in forkastet] == merker
    assert " ".join([vedtak, *(f"{m} {t}" for m, t in forkastet)]) == vr.linje(post["vedtak"])


def _kjederad(tekst: str, etikett: str) -> tuple[list[str], list[str]]:
    """Forholdene i raden til vedtaket i kjeden: de vedtaket viser til, og de som viser til det."""
    kjeden = tekst.split("\n## Kjeden\n", 1)[1].split("\n## ", 1)[0]
    rad = next(r for r in kjeden.splitlines() if r.startswith(f"| [{etikett}]("))
    _, aktive, passive = (c.strip() for c in rad.strip("| ").split(" | "))
    return aktive.split("; "), passive.split("; ")


def test_kjeden_viser_forholdene_begge_veier_i_raden_til_vedtaket(tema, kilder):
    tekst = tv.visning(tema, kilder)
    aktive, _ = _kjederad(tekst, "GR-U13")
    assert {"Endrer [GR-U10](#gr-u10)", "Endrer [GR-U12](#gr-u12)"} <= set(aktive)
    _, passive = _kjederad(tekst, "GR-U10")
    assert "Endret av [GR-U13](#gr-u13)" in passive
    _, passive = _kjederad(tekst, "GR-U13")
    assert "Utvidet av [GR-U15](#gr-u15)" in passive
    aktive, passive = _kjederad(tekst, "GR-U15")
    assert aktive == ["Utvider [GR-U13](#gr-u13)"] and passive == ["—"]


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


def test_datoen_til_et_senere_vedtak_utenfor_temaet_endrer_kontrollsummen(tema, kilder):
    """Følge hos GR-U13 viser datoen til XX-U1. Den leses gjennom `senere`, ikke gjennom postene i temaet."""
    endret = _med_ny_post(kilder)
    assert "XX-U1" not in tema["vedtak"]
    ut = tv.utdrag(tema, endret)
    assert "xx-u1" not in {vr.anker(p) for p in ut["poster"]}
    assert ("xx-u1", datetime.date(2026, 10, 12), {"art": "endrer", "vedtak": "gr-u13"}) in ut["senere"]

    senere_dato = copy.deepcopy(endret)
    _post(senere_dato["register"], "xx-u1")["dato"] = datetime.date(2026, 10, 13)
    assert tv.kontrollsum(tv.utdrag(tema, senere_dato)) != tv.kontrollsum(ut)


def test_et_ukjent_vedtak_og_en_kjerne_utenfor_vedtakene_gir_feil(tema, kilder):
    tema["vedtak"].append("GR-U99")
    tema["kjerne"].append("GR-U16")
    assert tv.feil(tema, kilder["register"]) == [
        f"{GRUNNLAGSSVAR}: GR-U99 er ikke et vedtak med anker i registeret",
        f"{GRUNNLAGSSVAR}: GR-U16 står i kjernen, men ikke i vedtakene",
    ]


def test_kontrollsummen_endres_med_kildegrunnlaget_og_ikke_med_resten(tema, kilder):
    for_ = tv.kontrollsum(tv.utdrag(tema, kilder))

    rad = copy.deepcopy(kilder)
    next(r for r in rad["regler"]["rader"] if r["id"] == "GR-28")["tilfelle"] += " Endret."
    assert tv.kontrollsum(tv.utdrag(tema, rad)) != for_

    post = copy.deepcopy(kilder)
    _post(post["register"], "gr-u13")["folge"] += " Endret."
    assert tv.kontrollsum(tv.utdrag(tema, post)) != for_

    resten = copy.deepcopy(kilder)
    ut = tv.utdrag(tema, resten)
    lest = set(ut["etiketter"]) | {vr.anker(p) for p in ut["poster"]} | {a for a, _, _ in ut["senere"]}
    poster = [p for p in vr.poster(resten["register"]) if vr.anker(p) not in lest]
    rader = [r for r in resten["regler"]["rader"] if r not in ut["rader"]]
    lest_forlop = {(f["merke"], f["id"]) for f in ut["forlop"]}
    forlop = [
        f for merke, korpus in resten["bevis"].items() for f in korpus["forlop"]
        if (merke, f["id"]) not in lest_forlop
    ]
    assert poster and rader and forlop
    for p in poster:
        for felt in set(p) - {"id", "anker", "valgt", "forhold"}:
            if isinstance(p[felt], str):
                p[felt] += " Endret."
        for a in p.get("alternativ", []):
            a["tekst"] += " Endret."
        if "dato" in p:
            p["dato"] += datetime.timedelta(days=1)
    for r in rader:
        for felt in set(r) - {"id", "kilder"}:
            if isinstance(r[felt], str):
                r[felt] += " Endret."
    for f in forlop:
        f["forventningsgrunnlag"] = f"{f['forventningsgrunnlag']} Endret."
        f["kontroller"].append({"rolle": "TE", "forventet": "Endret."})
    assert tv.kontrollsum(tv.utdrag(tema, resten)) == for_


def test_et_vedtak_som_star_to_ganger_med_ulik_skrivemate_gir_feil(tema, kilder):
    tema["vedtak"].append("gr-u10")
    assert tv.feil(tema, kilder["register"]) == [
        f"{GRUNNLAGSSVAR}: et vedtak står mer enn én gang"
    ]


def test_en_visning_uten_tema_er_foreldreloes(temaer, tmp_path, monkeypatch):
    monkeypatch.setattr(tv, "MAPPE", tmp_path)
    for tema in temaer:
        tv.sti(tema).write_text("", encoding="utf-8")
    (tmp_path / "gammelt-tema.md").write_text("", encoding="utf-8")
    assert tv.foreldreloese(temaer) == [tmp_path / "gammelt-tema.md"]


def test_ingen_innsjekket_visning_er_foreldreloes(temaer):
    assert tv.foreldreloese(temaer) == []
