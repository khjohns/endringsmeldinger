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

    def __init__(self, klient, innlogging, lager, forste=()):
        """`forste` er TE-handlinger som sendes i samme batch som `sak_opprettet`."""
        self.klient, self.innlogging, self.lager = klient, innlogging, lager
        self.sak_id = str(uuid4())
        self._som("TE")
        svar = klient.post(
            "/api/events/batch",
            json={
                "sak_id": self.sak_id,
                "expected_version": 0,
                "events": [{"event_type": "sak_opprettet", "sakstittel": "Domenetabell"}]
                + [korpus.foresporsel(h, None, self.sak_id)[1] for h in forste],
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


# Handlingene til TE leser ikke tilstanden, så flere kan gå i én batch. En batch
# har én kontraktsrolle, og byggherrens svar viser til hendelser i tilstanden.
TE_HANDLINGER = {
    "grunnlag", "grunnlag_ny_versjon", "vederlagskrav", "vederlagskrav_ny_versjon",
    "konsekvensvarsel", "fristvarsel", "fristkrav", "fristkrav_spesifisert", "aksept", "trekk",
}
SERVERTID = {"tidsstempel", "siste_oppdatert", "opprettet", "siste_aktivitet"}


def _grupper(steg):
    """Påfølgende TE-handlinger i én gruppe; byggherrens handlinger hver for seg."""
    grupper = []
    for h in steg:
        if h["handling"] in TE_HANDLINGER and grupper and grupper[-1][0]["handling"] in TE_HANDLINGER:
            grupper[-1].append(h)
        else:
            grupper.append([h])
    return grupper


def _normalisert(bane):
    """Journal og tilstand uten serverens ID-er og klokkeslett, så to saker kan sammenliknes."""
    raa = bane.raa_hendelser()
    navn = {h["event_id"]: f"hendelse-{i}" for i, h in enumerate(raa)}
    navn[bane.sak_id] = "sak"

    def rens(v):
        if isinstance(v, dict):
            return {k: rens(x) for k, x in v.items() if k not in SERVERTID}
        if isinstance(v, list):
            return [rens(x) for x in v]
        return navn.get(v, v) if isinstance(v, str) else v

    return rens([[h["event_type"], h["data"]] for h in raa]), rens(bane.tilstand())


def _send_batch(bane, gruppe):
    rolle, _ = korpus.foresporsel(gruppe[0], bane.sak(), bane.sak_id)
    bane._som(rolle)
    return bane.klient.post(
        "/api/events/batch",
        json={
            "sak_id": bane.sak_id,
            "expected_version": len(bane.journal()),
            "events": [korpus.foresporsel(h, bane.sak(), bane.sak_id)[1] for h in gruppe],
        },
        headers=HEADERS,
    )


@pytest.mark.parametrize("forlop", korpus.forlop_parametre(marker_avvik=False))
def test_forlop_i_batcher_gir_samme_journal_og_tilstand(forlop, hendelsesklient, innlogging, container_mot_testbasen):
    """Kontrakten i `submit_batch`: hendelsene valideres i rekkefølge mot tilstanden
    etter de foregående og lagres samlet. Forløpet sendt i batcher skal derfor gi
    samme journal og tilstand som sendt hendelse for hendelse. Dette er likhet
    mellom to innganger i samme implementasjon, ikke en domenefasit; kjente avvik
    gir samme utfall i begge og merkes ikke. Handlinger som avvises enkeltvis,
    utelates fra batchene."""
    lager = container_mot_testbasen.event_repository
    prefiks, steg = korpus.steg_med_prefiks(forlop)
    enkeltvis = Rutebane(hendelsesklient, innlogging, lager)
    godtatt = [h for h in prefiks + steg if enkeltvis.send(h)[0]]

    grupper = _grupper(godtatt)
    forste = grupper.pop(0) if grupper and grupper[0][0]["handling"] in TE_HANDLINGER else []
    batch = Rutebane(hendelsesklient, innlogging, lager, forste=forste)
    for gruppe in grupper:
        svar = _send_batch(batch, gruppe)
        if svar.status_code != 201:
            pytest.fail(f"Batchen {[h['handling'] for h in gruppe]} ble avvist: {svar.status_code} {svar.get_json()}")
        if svar.get_json()["state"] != batch.tilstand():
            pytest.fail("Tilstanden fra ruta er ikke lik tilstanden etter gjenlesing")
    assert _normalisert(batch) == _normalisert(enkeltvis)


def _avvisninger_i_te_grupper():
    """Hver TE-handling som domenebanen avviser rett etter godtatte TE-handlinger:
    (forløp, indeksen der gruppen starter, antall godtatte i gruppen)."""
    from tests.test_domenetabell.test_kravversjon_og_aksept import Domenebane

    tilfeller = []
    for forlop in korpus.KORPUS["forlop"]:
        prefiks, steg = korpus.steg_med_prefiks(forlop)
        bane, start, antall = Domenebane(), 0, 0
        for i, h in enumerate(prefiks + steg):
            godtatt, _ = bane.send(h)
            if h["handling"] not in TE_HANDLINGER:
                antall = 0
            elif not godtatt:
                if antall:
                    tilfeller.append(pytest.param(forlop, start, antall, id=f"{forlop['id']}-steg{i}"))
                antall = 0
            else:
                start, antall = (start, antall + 1) if antall else (i, 1)
    return tilfeller


@pytest.mark.parametrize(("forlop", "start", "antall"), _avvisninger_i_te_grupper())
def test_batch_med_en_avvist_hendelse_lagrer_ingenting(
    forlop, start, antall, hendelsesklient, innlogging, container_mot_testbasen
):
    """`submit_batch`: avvises én hendelse, lagres ingen. Batchen er TE-handlingene
    som ble godtatt rett før en avvist TE-handling i forløpet, pluss den avviste.
    Kontrollsaken er samme batch uten den avviste, som skal godtas."""
    prefiks, steg = korpus.steg_med_prefiks(forlop)
    alle = prefiks + steg
    bane = Rutebane(hendelsesklient, innlogging, container_mot_testbasen.event_repository)
    for h in alle[:start]:
        bane.send(h)
    gruppe = alle[start : start + antall + 1]
    journal_for = bane.journal()
    svar = _send_batch(bane, gruppe)
    if svar.status_code != 400 or (svar.get_json() or {}).get("error") not in AVVISNINGER:
        pytest.fail(f"Ventet avvisning av batchen: {svar.status_code} {svar.get_json()}")
    assert bane.journal() == journal_for, "En avvist batch skrev hendelser"
    kontroll = _send_batch(bane, gruppe[:-1])
    if kontroll.status_code != 201:
        pytest.fail(f"Kontrollsak: batchen uten den avviste ble også avvist: {kontroll.get_json()}")
