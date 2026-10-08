"""Domenetabellen gjennom `/api/events` og testbasen (#271).

Samme bevis-saker som `tests/test_domenetabell/`, men hver handling sendes
gjennom ruta med ekte dekoratører og lagre mot PostgreSQL. Tilstanden leses av
journalen etter gjenlesing, og tilstanden ruta returnerte, skal være lik den.
En avvist handling skal la journalen stå uendret. Kontrollsakene (`prov`)
prøves mot forretningsreglene på den gjenleste tilstanden, fordi en prøve
gjennom ruta ville skrevet hendelsen. Bare innloggingstjenesten er byttet ut.
"""

import copy
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


class Rutebane:
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
        return self.sak().model_dump(mode="json")

    def journal(self):
        return [h["event_id"] for h in self.raa_hendelser()]

    def lagret(self, hendelsestype):
        return next(h for h in reversed(self.raa_hendelser()) if h["event_type"] == hendelsestype)["data"]

    def prov(self, h):
        from api.validators import ValidationError, validate_event_data
        from models.events import parse_event_from_request

        sak = self.sak()
        rolle, foresporsel = korpus.foresporsel(h, sak, self.sak_id)
        data = copy.deepcopy(foresporsel["data"])
        try:
            validate_event_data(foresporsel["event_type"], data)
            hendelse = parse_event_from_request(
                {**foresporsel, "data": data, "sak_id": self.sak_id, "aktor_id": "x", "aktor_rolle": rolle}
            )
        except (ValidationError, ValueError) as feil:
            return False, str(feil)
        resultat = BusinessRuleValidator().validate(hendelse, sak)
        return resultat.is_valid, resultat.message

    def send(self, h):
        rolle, foresporsel = korpus.foresporsel(h, self.sak(), self.sak_id)
        self._som(rolle)
        svar = self.klient.post(
            "/api/events",
            json={"sak_id": self.sak_id, "expected_version": len(self.journal()), "event": foresporsel},
            headers=HEADERS,
        )
        if svar.status_code != 201:
            return False, f"{svar.status_code} {svar.get_json()}"
        gjenlest = public_state(self.sak(), self._hendelser())
        if svar.get_json()["state"] != gjenlest:
            pytest.fail(f"{h['handling']}: tilstanden fra ruta er ikke lik tilstanden etter gjenlesing")
        return True, None


@pytest.fixture
def bane(hendelsesklient, innlogging, container_mot_testbasen):
    return Rutebane(hendelsesklient, innlogging, container_mot_testbasen.event_repository)


@pytest.mark.parametrize("forlop", korpus.forlop_parametre())
def test_forlop_gjennom_ruta(forlop, bane):
    korpus.kjor(forlop, bane)


@pytest.mark.parametrize("forlop", korpus.invariant_parametre())
def test_gjeldende_krav_er_det_samme_i_godkjenningen(forlop, bane):
    korpus.kjor_invariant(forlop, bane)


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
def test_godkjenningsflyten_kan_svare_etter_et_konsekvensvarsel(bane, tmp_path):
    """KA-15 og KA-U2. Kontrollsaken er samme svar før konsekvensvarselet."""
    for h in korpus.KORPUS["prefikser"]["basis"]:
        if not bane.send(h)[0]:
            pytest.fail(f"Forutsetning: {h['handling']} avvist")
    if (feil := _vederlagssvar_til_godkjenning(bane, tmp_path)) is not None:
        pytest.fail(f"Kontrollsak: svaret avvises også uten konsekvensvarsel: {feil}")

    if not bane.send({"handling": "konsekvensvarsel", "type": "rigg_drift"})[0]:
        pytest.fail("Forutsetning: konsekvensvarselet avvist")
    feil = _vederlagssvar_til_godkjenning(bane, tmp_path)
    assert feil is None, feil
