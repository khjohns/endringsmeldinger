"""Domenetabellen kjørt mot Python-projeksjonen (#271).

Forventningene står i docs/domenetabell/ med kilde og tolkningsstatus per rad.
Domenebanen gjør det `/api/events` gjør før lagring (`korpus.bygg_hendelse`)
og regner tilstanden med `TimelineService`. Det journalen ville fått, er
`to_cloudevent()` i minnet; faktisk lagring prøves i databasebanen. Kjente
avvik er strenge `xfail` med funn-ID fra hovedplanen.
"""

import copy
from itertools import count

import pytest

from lib.auth.event_visibility import public_state
from models.events import SakOpprettetEvent
from services.timeline_service import TimelineService
from tests.test_domenetabell import korpus

_LOPENUMMER = count(1)


class Domenebane:
    def __init__(self, sakstype="standard"):
        """Byggherren oppretter en EO-sak, som i databasebanen."""
        self.sak_id = f"S-271-{next(_LOPENUMMER)}"
        rolle = "BH" if sakstype == "endringsordre" else "TE"
        self.timeline = TimelineService()
        self.hendelser = [
            SakOpprettetEvent(
                sak_id=self.sak_id,
                aktor_id=rolle.lower(),
                aktor_rolle=rolle,
                sakstittel="Domenetabell",
                prosjekt_id="p",
                sakstype=sakstype,
            )
        ]

    def sak(self):
        return self.timeline.compute_state(self.hendelser)

    def tilstand(self):
        return public_state(self.sak(), self.hendelser)

    def journal(self):
        return [h.event_id for h in self.hendelser]

    def raa_hendelser(self):
        return [{"event_type": h.event_type.value, "event_id": h.event_id} for h in self.hendelser]

    def lagret(self, hendelsestype):
        siste = next(h for h in reversed(self.hendelser) if h.event_type.value == hendelsestype)
        return siste.to_cloudevent()["data"]

    def prov(self, h):
        hendelse, melding = korpus.bygg_hendelse(h, self.sak(), self.sak_id)
        return hendelse is not None, melding

    def send(self, h):
        hendelse, melding = korpus.bygg_hendelse(h, self.sak(), self.sak_id)
        if hendelse is None:
            return False, melding
        self.hendelser.append(hendelse)
        return True, None


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
    assert "KA-32: `utsatt` er ikke et vedtak blant kildene" in feil
    assert "KA-32: en utsatt rad har ingen regelkoder" in feil
    assert "KA-32: er utsatt, men har en bevis-sak" in feil


def test_en_utsatt_rad_med_et_vedtak_som_ikke_utsetter_eller_med_funksjoner_gir_feil():
    """#669: `utsatt` må være et vedtak som utsetter (OV-U7), ikke hvilket som helst
    vedtak blant kildene, og en utsatt rad har ingen funksjoner før den bygges."""
    regler = copy.deepcopy(korpus.REGLER)
    rader = {r["id"]: r for r in regler["rader"]}
    rader["KA-32"]["kilder"].append("OV-U4")
    rader["KA-32"]["utsatt"] = "OV-U4"
    rader["KA-32"]["funksjoner"] = ["kjerne/utledning/utled.ts#utled"]
    feil = korpus.verktoy.valider(regler, korpus.KORPUS)
    assert "KA-32: `utsatt` er OV-U4, som ikke utsetter en rad (OV-U7)" in feil
    assert "KA-32: en utsatt rad har ingen funksjoner" in feil


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


@pytest.mark.parametrize("forlop", korpus.forlop_parametre())
def test_forlop(forlop):
    korpus.kjor(forlop, Domenebane)


@pytest.mark.parametrize("forlop", korpus.invariant_parametre())
def test_gjeldende_krav_er_det_samme_i_godkjenningen(forlop):
    """INV-GJELDENDE-KRAV (KA-U2): `claims()` i godkjenningsflyten og
    `krav_event_id` i projeksjonen peker på samme krav når sporet kan besvares."""
    korpus.kjor_invariant(forlop, Domenebane)
