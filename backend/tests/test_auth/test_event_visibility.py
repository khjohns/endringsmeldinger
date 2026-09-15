"""Enhetstester for filteret som skiller organisasjonene på interne notater.

Skillet går på Catenda-team, ikke på kontraktsside: en side kan ha flere team,
og to av dem er ulike organisasjoner. Fail-closed-egenskapen er selve
sikkerhetsgarantien og testes derfor direkte her, i tillegg til gjennom
lesepunktene i test_routes/test_internt_notat_confidentiality.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask, g

from lib.auth.event_visibility import (
    is_internal_note,
    reader_contract_team,
    visible_events,
)

BYGGHERRE_TEAM = "33333333333333333333333333333333"
RADGIVER_TEAM = "55555555555555555555555555555555"
TE_TEAM = "22222222222222222222222222222222"


def _note(team: str | None, rolle: str = "BH") -> SimpleNamespace:
    return SimpleNamespace(
        event_type="internt_notat", aktor_rolle=rolle, aktor_team_id=team
    )


def _claim(rolle: str = "TE") -> SimpleNamespace:
    return SimpleNamespace(
        event_type="grunnlag_opprettet", aktor_rolle=rolle, aktor_team_id=TE_TEAM
    )


@pytest.fixture
def app():
    application = Flask(__name__)
    application.testing = True
    return application


def test_is_internal_note_godtar_bade_enum_og_streng():
    from models.events import EventType

    assert is_internal_note(SimpleNamespace(event_type="internt_notat"))
    assert is_internal_note(SimpleNamespace(event_type=EventType.INTERNT_NOTAT))
    assert not is_internal_note(SimpleNamespace(event_type="grunnlag_opprettet"))


def test_samme_kontraktsside_men_annet_team_ser_ikke_notatet(app):
    """Kjernen i teamfilteret: rådgiveren er BH-side, men ikke byggherren."""
    with app.test_request_context():
        g.contract_team = RADGIVER_TEAM
        synlige = visible_events([_claim(), _note(BYGGHERRE_TEAM)])

    assert synlige == [_claim()]


def test_eget_team_ser_eget_notat(app):
    with app.test_request_context():
        g.contract_team = BYGGHERRE_TEAM
        synlige = visible_events([_claim(), _note(BYGGHERRE_TEAM)])

    assert synlige == [_claim(), _note(BYGGHERRE_TEAM)]


def test_notat_uten_team_skjules_for_alle(app):
    """Et notat vi ikke vet hvem eier, vises ikke — heller ikke til forfatteren."""
    with app.test_request_context():
        g.contract_team = BYGGHERRE_TEAM
        assert visible_events([_note(None)]) == []

    with app.test_request_context():
        g.contract_team = None
        assert visible_events([_note(None)]) == []


def test_uten_bekreftet_team_skjules_notatet(app):
    """Fail-closed: ingen bekreftet organisasjon gir ingen interne notater."""
    with app.test_request_context():
        synlige = visible_events([_claim(), _note(BYGGHERRE_TEAM)])

    assert synlige == [_claim()]


def test_ovrige_hendelser_slippes_uendret_gjennom(app):
    """Filteret skal ikke røre noe annet enn interne notater."""
    hendelser = [_claim("TE"), _claim("BH")]
    with app.test_request_context():
        assert visible_events(hendelser) is hendelser


def test_feil_i_medlemsoppslag_gir_ingen_team(app):
    """Utilgjengelig medlemsoppslag skal skjule notatet, ikke kaste."""
    with app.test_request_context():
        g.project_id = "p"
        g.user = {"id": "u"}
        auth = Mock()
        auth.contract_membership.side_effect = RuntimeError("nede")
        app.extensions["koe_auth"] = auth

        assert reader_contract_team() is None
        assert visible_events([_note(BYGGHERRE_TEAM)]) == []


def test_flere_team_pa_samme_side_gir_ingen_entydig_organisasjon(app):
    """Er leseren med i to team på samme side, er organisasjonen tvetydig."""
    with app.test_request_context():
        g.project_id = "p"
        g.user = {"id": "u"}
        auth = Mock()
        auth.contract_membership.return_value = ("BH", None)
        app.extensions["koe_auth"] = auth

        assert reader_contract_team() is None
        assert visible_events([_note(BYGGHERRE_TEAM)]) == []
