"""Domenetabellen gjennom `/api/events`, `/api/events/batch` og testbasen (#271).

Samme bevis-saker som `tests/test_domenetabell/`, men hver handling sendes
gjennom ruta med ekte dekoratører og lagre mot PostgreSQL. Batchbanen sender
hver handling som eneste hendelse i en batch. Tilstanden leses av
journalen etter gjenlesing, og tilstanden ruta returnerte, skal være lik den.
En avvist handling skal la journalen stå uendret. Kontrollsakene (`prov`)
prøves med `korpus.bygg_hendelse` på den gjenleste tilstanden, fordi en prøve
gjennom ruta ville skrevet hendelsen. Bare innloggingstjenesten er byttet ut.
"""

from contextlib import contextmanager
from uuid import uuid4

import pytest
from flask import g

from lib.auth.event_visibility import public_state
from models.events import parse_event
from services.approval_service import ApprovalService
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService
from tests.test_domenetabell import korpus

pytestmark = pytest.mark.database

PROSJEKT = "p-domenetabell"
HEADERS = {"X-Project-ID": PROSJEKT, "X-CSRF-Token": "csrf"}
AVVISNINGER = {"BUSINESS_RULE_VIOLATION", "VALIDATION_ERROR"}


class Rutebane:
    rute = "/api/events"

    def __init__(self, klient, innlogging, lager):
        self.klient, self.innlogging, self.lager = klient, innlogging, lager
        self.sak_id = str(uuid4())
        self._som("TE")
        svar = klient.post(
            "/api/events/batch",
            json={
                "sak_id": self.sak_id,
                "expected_version": 0,
                "events": [{"event_type": "sak_opprettet", "sakstittel": "Domenetabell"}],
            },
            headers=HEADERS,
        )
        if svar.status_code != 201:
            pytest.fail(f"Saken ble ikke opprettet: {svar.status_code} {svar.get_json()}")

    def _som(self, rolle):
        self.innlogging.contract_membership.return_value = (rolle, f"team-{rolle.lower()}")

    @contextmanager
    def lesing(self):
        """Lageret leser bare i prosjektet forespørselen er autorisert for."""
        with self.klient.application.test_request_context():
            g.project_id = PROSJEKT
            yield

    def raa_hendelser(self):
        with self.lesing():
            return self.lager.get_events(self.sak_id)[0]

    def _hendelser(self):
        return [parse_event(h) for h in self.raa_hendelser()]

    def sak(self):
        return TimelineService().compute_state(self._hendelser())

    def tilstand(self):
        return public_state(self.sak(), self._hendelser())

    def journal(self):
        return [h["event_id"] for h in self.raa_hendelser()]

    def lagret(self, hendelsestype):
        return next(h for h in reversed(self.raa_hendelser()) if h["event_type"] == hendelsestype)["data"]

    def prov(self, h):
        hendelse, melding = korpus.bygg_hendelse(h, self.sak(), self.sak_id)
        return hendelse is not None, melding

    def send(self, h):
        rolle, foresporsel = korpus.foresporsel(h, self.sak(), self.sak_id)
        self._som(rolle)
        svar = self.klient.post(self.rute, json=self._nyttelast(foresporsel), headers=HEADERS)
        if svar.status_code != 201:
            feil = svar.get_json() or {}
            # Bare en avvisning fra validering eller forretningsregler er et domeneutfall.
            if svar.status_code != 400 or feil.get("error") not in AVVISNINGER:
                pytest.fail(f"{h['handling']}: {svar.status_code} {feil}")
            # Batchruta gjør også et krasj i projeksjonen til VALIDATION_ERROR.
            if self.prov(h)[0]:
                pytest.fail(f"{h['handling']}: ruta avviste det forretningsreglene godtar: {feil}")
            return False, f"{feil.get('error')}: {feil.get('message')}"
        gjenlest = public_state(self.sak(), self._hendelser())
        if svar.get_json()["state"] != gjenlest:
            pytest.fail(f"{h['handling']}: tilstanden fra ruta er ikke lik tilstanden etter gjenlesing")
        return True, None

    def _nyttelast(self, foresporsel):
        return {"sak_id": self.sak_id, "expected_version": len(self.journal()), "event": foresporsel}


class Batchbane(Rutebane):
    rute = "/api/events/batch"

    def _nyttelast(self, foresporsel):
        return {"sak_id": self.sak_id, "expected_version": len(self.journal()), "events": [foresporsel]}


@pytest.fixture(params=[Rutebane, Batchbane], ids=["events", "batch"])
def bane(request, hendelsesklient, innlogging, container_mot_testbasen):
    return request.param(hendelsesklient, innlogging, container_mot_testbasen.event_repository)


@pytest.fixture
def rutebane(hendelsesklient, innlogging, container_mot_testbasen):
    return Rutebane(hendelsesklient, innlogging, container_mot_testbasen.event_repository)


@pytest.mark.parametrize("forlop", korpus.forlop_parametre())
def test_forlop_gjennom_ruta(forlop, bane):
    korpus.kjor(forlop, bane)


@pytest.mark.parametrize("forlop", korpus.invariant_parametre())
def test_gjeldende_krav_er_det_samme_i_godkjenningen(forlop, rutebane):
    """En batch med én hendelse lagrer det samme, så invarianten prøves bare én gang."""
    korpus.kjor_invariant(forlop, rutebane)


def _vederlagssvar_til_godkjenning(bane, tmp_path):
    sak = bane.sak()
    _, foresporsel = korpus.foresporsel({"handling": "vederlagssvar", "vurdering": "godkjent"}, sak, bane.sak_id)
    godkjenning = ApprovalService(
        tmp_path / "godkjenning.sqlite", bane.lager, TimelineService(), BusinessRuleValidator()
    )
    element = {
        "track": "vederlag",
        "eventType": "respons_vederlag",
        "claimId": sak.vederlag.krav_event_id,
        "owner": "bh",
        "data": foresporsel["data"],
    }
    try:
        with bane.lesing():
            godkjenning.validate_items(bane.sak_id, [element], check_basis=False)
    except ValueError as feil:
        return str(feil)
    return None


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DT-02 (#256): claims() regner konsekvensvarselet som krav, og godkjenningsflyten avviser svaret",
)
def test_godkjenningsflyten_kan_svare_etter_et_konsekvensvarsel(rutebane, tmp_path):
    """KA-15 og KA-U2. Kontrollsaken er samme svar før konsekvensvarselet."""
    bane = rutebane
    for h in korpus.KORPUS["prefikser"]["basis"]:
        if not bane.send(h)[0]:
            pytest.fail(f"Forutsetning: {h['handling']} avvist")
    if (feil := _vederlagssvar_til_godkjenning(bane, tmp_path)) is not None:
        pytest.fail(f"Kontrollsak: svaret avvises også uten konsekvensvarsel: {feil}")

    if not bane.send({"handling": "konsekvensvarsel", "type": "rigg_drift"})[0]:
        pytest.fail("Forutsetning: konsekvensvarselet avvist")
    feil = _vederlagssvar_til_godkjenning(bane, tmp_path)
    assert feil is None, feil
