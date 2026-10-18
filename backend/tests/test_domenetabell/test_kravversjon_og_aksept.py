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
    # #798: en rad som ikke er utsatt og ikke står i det endrede forløpet, så testen ikke
    # avhenger av hvilke rader som er utsatt.
    rad = next(
        r["id"]
        for r in korpus.REGLER["rader"]
        if "utsatt" not in r and r["id"] not in forlop["rader"]
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
