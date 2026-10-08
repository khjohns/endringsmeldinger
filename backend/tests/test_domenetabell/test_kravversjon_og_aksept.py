"""Domenetabellen for kravversjon og aksept, kjørt mot Python-projeksjonen (#271).

Forventningene står i docs/domenetabell/ med kilde og tolkningsstatus per rad.
Domenebanen gjør det `/api/events` gjør før lagring (`korpus.bygg_hendelse`)
og regner tilstanden med `TimelineService`. Det journalen ville fått, er
`to_cloudevent()` i minnet; faktisk lagring prøves i databasebanen. Kjente
avvik er strenge `xfail` med funn-ID fra hovedplanen.
"""

import pytest

from lib.auth.event_visibility import public_state
from models.events import SakOpprettetEvent
from services.timeline_service import TimelineService
from tests.test_domenetabell import korpus

SAK = "S-271"


class Domenebane:
    def __init__(self):
        self.timeline = TimelineService()
        self.hendelser = [
            SakOpprettetEvent(
                sak_id=SAK, aktor_id="te", aktor_rolle="TE", sakstittel="Domenetabell", prosjekt_id="p"
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
        hendelse, melding = korpus.bygg_hendelse(h, self.sak(), SAK)
        return hendelse is not None, melding

    def send(self, h):
        hendelse, melding = korpus.bygg_hendelse(h, self.sak(), SAK)
        if hendelse is None:
            return False, melding
        self.hendelser.append(hendelse)
        return True, None


def test_tabellen_og_bevis_sakene_henger_sammen():
    assert korpus.verktoy.valider(korpus.REGLER, korpus.KORPUS) == []


def test_tabellen_i_readme_er_skrevet_av_verktoyet():
    readme = korpus.verktoy.README.read_text(encoding="utf-8")
    assert korpus.verktoy.med_tabell(readme, korpus.REGLER, korpus.KORPUS) == readme, (
        "Kjør python3 docs/verktoy/domenetabell.py --skriv"
    )


@pytest.mark.parametrize("forlop", korpus.forlop_parametre())
def test_forlop(forlop):
    korpus.kjor(forlop, Domenebane())


@pytest.mark.parametrize("forlop", korpus.invariant_parametre())
def test_gjeldende_krav_er_det_samme_i_godkjenningen(forlop):
    """INV-GJELDENDE-KRAV (KA-U2): `claims()` i godkjenningsflyten og
    `krav_event_id` i projeksjonen peker på samme krav når sporet kan besvares."""
    korpus.kjor_invariant(forlop, Domenebane())
