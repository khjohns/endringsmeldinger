"""Domenetabellen kjørt mot Python-projeksjonen (#271).

Forventningene står i docs/domenetabell/ med kilde og tolkningsstatus per rad.
Domenebanen gjør det `/api/events` gjør før lagring (`korpus.bygg_hendelse`)
og regner tilstanden med `TimelineService`. Det journalen ville fått, er
`to_cloudevent()` i minnet; faktisk lagring prøves i databasebanen. Kjente
avvik er strenge `xfail` med funn-ID fra hovedplanen.
"""

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


@pytest.mark.parametrize("forlop", korpus.forlop_parametre())
def test_forlop(forlop):
    korpus.kjor(forlop, Domenebane)


@pytest.mark.parametrize("forlop", korpus.invariant_parametre())
def test_gjeldende_krav_er_det_samme_i_godkjenningen(forlop):
    """INV-GJELDENDE-KRAV (KA-U2): `claims()` i godkjenningsflyten og
    `krav_event_id` i projeksjonen peker på samme krav når sporet kan besvares."""
    korpus.kjor_invariant(forlop, Domenebane)
