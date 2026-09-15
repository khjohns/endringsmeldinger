"""Enhetstester for filteret som skiller partene på interne notater.

Fail-closed-egenskapen er selve sikkerhetsgarantien: kan ikke leserens TE/BH-
tilknytning bekreftes, skal notatet skjules. Den testes derfor direkte her, i
tillegg til gjennom lesepunktene i test_routes/test_internt_notat_confidentiality.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask, g

from lib.auth.event_visibility import (
    is_internal_note,
    reader_contract_role,
    visible_events,
)


def _note(rolle: str) -> SimpleNamespace:
    return SimpleNamespace(event_type="internt_notat", aktor_rolle=rolle)


def _claim(rolle: str = "TE") -> SimpleNamespace:
    return SimpleNamespace(event_type="grunnlag_opprettet", aktor_rolle=rolle)


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


def test_uten_bekreftet_rolle_skjules_notatet(app):
    """Fail-closed: ingen rolle i konteksten gir ingen interne notater."""
    with app.test_request_context():
        synlige = visible_events([_claim(), _note("TE"), _note("BH")])

    assert synlige == [_claim()]


def test_leser_ser_bare_sin_egen_sides_notat(app):
    with app.test_request_context():
        g.contract_role = "TE"
        synlige = visible_events([_claim(), _note("TE"), _note("BH")])

    assert synlige == [_claim(), _note("TE")]


def test_ovrige_hendelser_slippes_uendret_gjennom(app):
    """Filteret skal ikke røre noe annet enn interne notater."""
    hendelser = [_claim("TE"), _claim("BH")]
    with app.test_request_context():
        assert visible_events(hendelser) is hendelser


def test_feil_i_medlemsoppslag_gir_ingen_rolle(app):
    """Utilgjengelig medlemsoppslag skal skjule notatet, ikke kaste."""
    with app.test_request_context():
        g.project_id = "p"
        g.user = {"id": "u"}
        auth = Mock()
        auth.contract_role.side_effect = RuntimeError("nede")
        app.extensions["koe_auth"] = auth

        assert reader_contract_role() is None
        assert visible_events([_note("TE")]) == []


def test_ukjent_rolle_regnes_ikke_som_part(app):
    """En prosjektrolle uten TE/BH-tilknytning gir ikke innsyn."""
    with app.test_request_context():
        g.project_id = "p"
        g.user = {"id": "u"}
        auth = Mock()
        auth.contract_role.return_value = "viewer"
        app.extensions["koe_auth"] = auth

        assert reader_contract_role() is None
        assert visible_events([_note("TE")]) == []
