"""Kontrollen av domenetabellen: radene i `regler.json` mot bevis-sakene og
vedtaksfila, og tabellen i README-en (#271)."""

import copy

from test_domenetabell import korpus


def test_tabellen_og_bevis_sakene_henger_sammen():
    assert korpus.verktoy.valider(korpus.REGLER, korpus.KORPUS) == []


def test_kontrollen_finner_feil_i_bevis_sakene_for_maalmodellen():
    """Bevis-sakene for målmodellen (#304) kontrolleres med resten: en kontroll
    uten kilde, en ukjent handling og en rad uten bevis-sak gir feil."""
    maal = copy.deepcopy(korpus.verktoy.les_maalmodell())
    assert korpus.verktoy.valider(korpus.REGLER, korpus.KORPUS, maalmodell=maal) == []
    forlop, *resten = maal["forlop"]
    # #798: en rad som ikke er utsatt, og som bare har bevis-sak i målmodellen utenfor det
    # endrede forløpet, så testen ikke avhenger av hvilke rader som er utsatt.
    i_korpuset = {r for f in korpus.KORPUS["forlop"] for r in f["rader"]}
    rad = next(
        r["id"]
        for r in korpus.REGLER["rader"]
        if "utsatt" not in r and r["id"] not in forlop["rader"] and r["id"] not in i_korpuset
    )
    forlop["kontroller"][0]["kilde"] = []
    forlop["steg"][0]["handling"] = "ukjent"
    maal["forlop"] = [forlop] + [f for f in resten if rad not in f["rader"]]
    feil = korpus.verktoy.valider(korpus.REGLER, korpus.KORPUS, maalmodell=maal)
    assert any("mangler kilde" in f for f in feil)
    assert any("ukjent handling 'ukjent'" in f for f in feil)
    assert f"{rad}: ingen bevis-sak" in feil


def test_en_utsatt_rad_staar_uten_bevis_sak_men_ikke_med_en():
    """OV-U7: en rad med `utsatt` trenger ingen bevis-sak. Vedtaket i `utsatt` står
    blant kildene, raden har ingen regelkoder, og en bevis-sak for den gir feil."""
    regler = copy.deepcopy(korpus.REGLER)
    maal = copy.deepcopy(korpus.verktoy.les_maalmodell())
    rader = {r["id"]: r for r in regler["rader"]}
    assert rader["KA-32"]["utsatt"] == "OV-U7"
    assert korpus.verktoy.valider(regler, korpus.KORPUS, maalmodell=maal) == []

    del rader["KA-32"]["utsatt"]
    assert "KA-32: ingen bevis-sak" in korpus.verktoy.valider(regler, korpus.KORPUS, maalmodell=maal)

    rader["KA-32"]["utsatt"] = "OV-U99"
    rader["KA-32"]["regelkoder"] = ["FEIL_PART"]
    maal["forlop"][0]["rader"].append("KA-32")
    feil = korpus.verktoy.valider(regler, korpus.KORPUS, maalmodell=maal)
    assert "KA-32: `utsatt` er ikke et vedtak eller arbeidsvalg blant kildene" in feil
    assert "KA-32: en utsatt rad har ingen regelkoder" in feil
    assert "KA-32: er utsatt, men har en bevis-sak" in feil


def test_en_rad_utsatt_til_den_faar_bevis_kan_vise_til_funksjoner_og_regelkoder():
    """#1721: en rad utsatt etter AV-1791 mangler bare bevis. Den kan vise til koden som
    finnes, i motsetning til en rad som ikke er bygget (OV-U7)."""
    regler = copy.deepcopy(korpus.REGLER)
    rad = next(r for r in regler["rader"] if r.get("utsatt") == "AV-1791")
    rad["funksjoner"] = ["kjerne/utledning/utled.ts#utled"]
    rad["regelkoder"] = ["FEIL_PART"]
    feil = korpus.verktoy.valider(regler, korpus.KORPUS)
    assert f"{rad['id']}: en utsatt rad har ingen funksjoner" not in feil
    assert f"{rad['id']}: en utsatt rad har ingen regelkoder" not in feil


def test_en_utsatt_rad_med_et_vedtak_som_ikke_utsetter_eller_med_funksjoner_gir_feil():
    """#669, #1721: `utsatt` må være et vedtak eller arbeidsvalg som utsetter
    (AV-1791, OV-U7), ikke hvilket som helst vedtak eller arbeidsvalg blant kildene,
    og en utsatt rad har ingen funksjoner før den bygges."""
    regler = copy.deepcopy(korpus.REGLER)
    rader = {r["id"]: r for r in regler["rader"]}
    rader["KA-32"]["kilder"].append("OV-U4")
    rader["KA-32"]["utsatt"] = "OV-U4"
    rader["KA-32"]["funksjoner"] = ["kjerne/utledning/utled.ts#utled"]
    feil = korpus.verktoy.valider(regler, korpus.KORPUS)
    assert "KA-32: `utsatt` er OV-U4, som ikke utsetter en rad (AV-1791, OV-U7)" in feil
    assert "KA-32: en utsatt rad har ingen funksjoner" in feil


def test_det_frosne_arkivet_teller_ikke_som_bevis_og_vises_ikke_som_bevis_i_tabellen():
    """#1721, #1791 (svar A på spørsmål 10): `bevis-saker.json` kjøres ikke etter #49
    og teller verken som bevis i valideringen eller i tabellen. De 20 radene som bare
    står i arkivet, er markert `utsatt` (AV-1791)."""
    forventet_utsatt = {
        "EO-01", "EO-02", "EO-03", "EO-05", "EO-06", "EO-07", "EO-09", "EO-10", "EO-11",
        "EO-15", "EO-16", "EO-21", "EO-22", "EO-23", "EO-24",
        "KA-08a", "KA-08b", "KA-15", "KA-16", "KA-18a",
    }
    rader_av_1791 = {r["id"] for r in korpus.REGLER["rader"] if r.get("utsatt") == "AV-1791"}
    assert rader_av_1791 == forventet_utsatt

    regler = copy.deepcopy(korpus.REGLER)
    rader = {r["id"]: r for r in regler["rader"]}
    del rader["EO-01"]["utsatt"]
    assert "EO-01: ingen bevis-sak" in korpus.verktoy.valider(regler, korpus.KORPUS)

    # Et nytt forløp i det frosne arkivet teller heller ikke som bevis.
    regler = copy.deepcopy(korpus.REGLER)
    korpus_ = copy.deepcopy(korpus.KORPUS)
    rader = {r["id"]: r for r in regler["rader"]}
    del rader["KA-32"]["utsatt"]
    forlop = copy.deepcopy(korpus_["forlop"][0])
    forlop["id"] = "F-ARKIV-NY"
    forlop["rader"] = ["KA-32"]
    forlop["forventningsgrunnlag"] = rader["KA-32"]["tolkningsstatus"]
    korpus_["forlop"].append(forlop)
    assert "KA-32: ingen bevis-sak" in korpus.verktoy.valider(regler, korpus_)

    # Tabellen viser de utsatte radene som utsatt (AV-1791), ikke med arkivforløpene.
    tabelltekst = korpus.verktoy.tabell(korpus.REGLER, korpus.KORPUS)
    eo01 = next(linje for linje in tabelltekst.splitlines() if linje.startswith("| EO-01 |"))
    ka01 = next(linje for linje in tabelltekst.splitlines() if linje.startswith("| KA-01 |"))
    assert "| utsatt (AV-1791) |" in eo01
    assert "F-EO-01" not in eo01
    assert "F-KA-01" not in ka01
    assert "F-MM-E1 (målmodellen)" in ka01


def test_arbeidsvalg_som_ikke_utsetter_eller_standard_i_utsatt_gir_feil():
    """#1721: bare vedtak eller arbeidsvalg i `UTSETTER` godtas i `utsatt`, ikke et
    annet arbeidsvalg eller en standardhenvisning."""
    regler = copy.deepcopy(korpus.REGLER)
    rader = {r["id"]: r for r in regler["rader"]}
    rader["EO-01"]["kilder"].append("AV-479")
    rader["EO-01"]["utsatt"] = "AV-479"
    rader["KA-16"]["utsatt"] = "NS-33.6.2-1"
    feil = korpus.verktoy.valider(regler, korpus.KORPUS)
    assert "EO-01: `utsatt` er AV-479, som ikke utsetter en rad (AV-1791, OV-U7)" in feil
    assert "KA-16: `utsatt` er ikke et vedtak eller arbeidsvalg blant kildene" in feil


def test_en_vedtakskilde_viser_til_vedtaksfila():
    """#1020: vedtakene står i vedtaksfila. En kilde som viser til et vedtak i hovedplanen,
    eller til et anker som ikke er i vedtaksfila, gir feil."""
    regler = copy.deepcopy(korpus.REGLER)
    kilde = next(k for k in regler["kilder"] if k["id"] == "KA-U1")
    kilde["ref"] = "../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1"
    feil = korpus.verktoy.valider(regler, korpus.KORPUS)
    assert "KA-U1: `ref` viser ikke til vedtaksfila, ../plans/vedtak.md (#1020)" in feil
    kilde["ref"] = "../plans/vedtak.md#ka-u99"
    feil = korpus.verktoy.valider(regler, korpus.KORPUS)
    assert "KA-U1: ankeret #ka-u99 finnes ikke i vedtaksfila" in feil


def _avvik_med(funn, issue):
    korpus_ = copy.deepcopy(korpus.KORPUS)
    forlop = next(f for f in korpus_["forlop"] if f["id"] == "F-GR-02")
    forlop["kjent_avvik"] = {"funn": funn} if issue is None else {"funn": funn, "issue": issue}
    return korpus.verktoy.valider(korpus.REGLER, korpus_)


def test_et_kjent_avvik_med_en_vedtaks_id_krever_vedtaket_blant_radens_kilder_og_et_issue():
    """#628: et vedtak i 3.1 som `funn` godtas bare når det er en kilde for raden
    avviket gjelder, og `issue` sier hvilket issue som sporer avviket."""
    melding = (
        "F-GR-02: funnet {} står ikke i hovedplanens funnregister, "
        "og er ikke et vedtak i 3.1 blant radenes kilder med `issue`"
    )
    assert _avvik_med("GR-U22", 837) == []
    assert melding.format("GR-U22") in _avvik_med("GR-U22", None)
    assert melding.format("HF-U5") in _avvik_med("HF-U5", 837)


def test_en_rad_uten_id_gir_feil_og_ikke_krasj():
    """#475: kontrollen melder en rad uten `id` i stedet for å feile med `KeyError`."""
    regler = copy.deepcopy(korpus.REGLER)
    del regler["rader"][0]["id"]
    feil = korpus.verktoy.valider(regler, korpus.KORPUS)
    assert any(f.startswith("<uten id>: feltene er") for f in feil)


def test_en_rad_uten_kilder_med_et_kjent_avvik_gir_feil_og_ikke_krasj():
    """#475: en rad uten `kilder` som et kjent avvik med vedtaks-ID gjelder, meldes
    i stedet for å feile med `KeyError` når avviket kontrolleres."""
    korpus_ = copy.deepcopy(korpus.KORPUS)
    forlop = next(f for f in korpus_["forlop"] if f["id"] == "F-GR-02")
    forlop["kjent_avvik"] = {"funn": "GR-U22", "issue": 837}
    regler = copy.deepcopy(korpus.REGLER)
    rad = next(r for r in regler["rader"] if r["id"] in forlop["rader"])
    del rad["kilder"]
    feil = korpus.verktoy.valider(regler, korpus_)
    assert any(f.startswith(f"{rad['id']}: feltene er") for f in feil)


def test_en_rad_uten_tolkningsstatus_i_et_maalmodellforloep_gir_feil_og_ikke_krasj():
    """#475: en rad uten `tolkningsstatus` som et målmodellforløp bruker, meldes
    i stedet for å feile med `KeyError`."""
    regler = copy.deepcopy(korpus.REGLER)
    radid = korpus.verktoy.les_maalmodell()["forlop"][0]["rader"][0]
    del next(r for r in regler["rader"] if r["id"] == radid)["tolkningsstatus"]
    feil = korpus.verktoy.valider(regler, korpus.KORPUS)
    assert any(f.startswith(f"{radid}: feltene er") for f in feil)


def test_tabellen_i_readme_er_skrevet_av_verktoyet():
    readme = korpus.verktoy.README.read_text(encoding="utf-8")
    assert korpus.verktoy.med_tabell(readme, korpus.REGLER, korpus.KORPUS) == readme, (
        "Kjør python3 docs/verktoy/domenetabell.py --skriv"
    )
