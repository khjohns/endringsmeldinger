"""Forseringssporet (§33.8) mangler tilstandsregler i BusinessRuleValidator.

`_get_rules_for_event` har ingen spesifikke regler for noen forsering-hendelse.
Sporet får derfor bare fellesreglene (rolle, lukket sak, CREATE_ONCE,
responsreferanse), og CREATE_ONCE dekker ikke forseringens opprettelsestype.
Testene her holder sporet opp mot de samme kravene de tre øvrige sporene har.
"""

import pytest

from models.events import (
    ForseringKostnaderOppdatertData,
    ForseringKostnaderOppdatertEvent,
    ForseringResponsData,
    ForseringResponsEvent,
    ForseringStoppetData,
    ForseringStoppetEvent,
    ForseringVarselData,
    ForseringVarselEvent,
    SakOpprettetEvent,
)
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService


@pytest.fixture
def validator():
    return BusinessRuleValidator()


@pytest.fixture
def timeline_service():
    return TimelineService()


def _sak_opprettet() -> SakOpprettetEvent:
    return SakOpprettetEvent(
        sak_id="FORS-001",
        aktor="TE Bruker",
        aktor_rolle="TE",
        sakstittel="Forseringssak",
        sakstype="forsering",
    )


def _varsel() -> ForseringVarselEvent:
    return ForseringVarselEvent(
        sak_id="FORS-001",
        aktor="TE Bruker",
        aktor_rolle="TE",
        data=ForseringVarselData(
            frist_krav_id="frist-1",
            respons_frist_id="respons-1",
            estimert_kostnad=100_000,
            begrunnelse="Avslått fristforlengelse",
            bekreft_30_prosent=True,
            dato_iverksettelse="2026-09-15",
            avslatte_dager=10,
            dagmulktsats=50_000,
        ),
    )


def _state(timeline_service, events):
    return timeline_service.compute_state(events)


def test_forsering_varsel_kan_ikke_sendes_to_ganger(validator, timeline_service):
    """Et forseringsvarsel er sporets opprettelse og skal bare kunne sendes én gang.

    De øvrige sporene stoppes av CREATE_ONCE; forsering er ikke med i den regelen.
    """
    state = _state(timeline_service, [_sak_opprettet(), _varsel()])

    result = validator.validate(_varsel(), state)

    assert not result.is_valid, (
        "Et nytt forseringsvarsel ble godtatt selv om sporet allerede er opprettet"
    )


def test_forsering_respons_krever_varsel(validator, timeline_service):
    """BH skal ikke kunne svare på en forsering som aldri er varslet."""
    state = _state(timeline_service, [_sak_opprettet()])

    respons = ForseringResponsEvent(
        sak_id="FORS-001",
        aktor="BH Bruker",
        aktor_rolle="BH",
        data=ForseringResponsData(aksepterer=True, begrunnelse="Akseptert"),
    )

    result = validator.validate(respons, state)

    assert not result.is_valid, "BH svarte på en forsering som ikke er varslet"


def test_forsering_kan_ikke_stoppes_uten_varsel(validator, timeline_service):
    """En forsering som aldri er varslet kan ikke stoppes."""
    state = _state(timeline_service, [_sak_opprettet()])

    stoppet = ForseringStoppetEvent(
        sak_id="FORS-001",
        aktor="TE Bruker",
        aktor_rolle="TE",
        data=ForseringStoppetData(
            dato_stoppet="2026-09-15",
            paalopte_kostnader=10_000,
            begrunnelse="Stoppet",
        ),
    )

    result = validator.validate(stoppet, state)

    assert not result.is_valid, "En uvarslet forsering ble stoppet"


def test_forsering_kan_ikke_stoppes_to_ganger(validator, timeline_service):
    """Dobbelt stopp gir motstridende påløpte kostnader i samme sak."""
    stoppet = ForseringStoppetEvent(
        sak_id="FORS-001",
        aktor="TE Bruker",
        aktor_rolle="TE",
        data=ForseringStoppetData(
            dato_stoppet="2026-09-15",
            paalopte_kostnader=10_000,
            begrunnelse="Stoppet",
        ),
    )
    state = _state(timeline_service, [_sak_opprettet(), _varsel(), stoppet])

    result = validator.validate(stoppet, state)

    assert not result.is_valid, "Forseringen ble stoppet en gang til"


def test_kostnader_kan_ikke_oppdateres_uten_varsel(validator, timeline_service):
    """Påløpte kostnader forutsetter en varslet forsering."""
    state = _state(timeline_service, [_sak_opprettet()])

    kostnader = ForseringKostnaderOppdatertEvent(
        sak_id="FORS-001",
        aktor="TE Bruker",
        aktor_rolle="TE",
        data=ForseringKostnaderOppdatertData(paalopte_kostnader=25_000),
    )

    result = validator.validate(kostnader, state)

    assert not result.is_valid, "Kostnader ble oppdatert uten varslet forsering"
