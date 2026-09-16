"""Utkastruter: teamavgrensning, revisjonsgrense og samtidighet.

Tilgangskontrollen er vår, ikke Catendas. Catenda er kilden for hvem som sitter
i hvilket team, men backend snakker med Catenda gjennom appens tjenestekonto,
så bibliotekets teamrettigheter gater ingenting her. Hver forespørsel må derfor
autoriseres mot `contract_membership` og avgrenses på team-ID.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from routes import utkast_routes


@pytest.fixture
def api(monkeypatch, tmp_path):
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)

    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(utkast_routes.utkast_bp)

    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "u", "email": "bh@example.test", "name": "BH Bruker"},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "BH"
    auth.contract_membership.return_value = ("BH", "team-bh")
    app.extensions["koe_auth"] = auth

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id="topic"
    )
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)

    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    return SimpleNamespace(client=client, auth=auth)


def _hent(api, sak="S1", spor="grunnlag", revisjon=0):
    return api.client.get(
        f"/api/cases/{sak}/utkast/{spor}?revisjon={revisjon}",
        headers={"X-Project-ID": "p"},
    )


def _lagre(
    api, innhold=None, forventet_versjon=None, sak="S1", spor="grunnlag", revisjon=0
):
    return api.client.put(
        f"/api/cases/{sak}/utkast/{spor}",
        json={
            "revisjon": revisjon,
            "innhold": innhold
            if innhold is not None
            else {"begrunnelseHtml": "<p>Tekst</p>"},
            "forventet_versjon": forventet_versjon,
        },
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )


def test_tomt_utkast_gir_null_uten_aa_feile(api):
    svar = _hent(api)
    assert svar.status_code == 200
    assert svar.get_json()["utkast"] is None
    assert svar.get_json()["team_id"] == "team-bh"
    assert svar.get_json()["user_id"] == "u"


def test_lagret_utkast_hentes_tilbake(api):
    assert _lagre(api).status_code == 200
    utkast = _hent(api).get_json()["utkast"]
    assert utkast["innhold"] == {"begrunnelseHtml": "<p>Tekst</p>"}
    assert utkast["versjon"] == 1
    assert utkast["oppdatert_av"] == "bh@example.test"


def test_kollega_i_samme_team_ser_utkastet(api):
    _lagre(api)
    api.auth.repo.session.return_value = {
        "app_users": {"id": "u2", "email": "kollega@example.test", "name": "Kollega"},
        "csrf_token": "csrf",
    }
    assert _hent(api).get_json()["utkast"]["innhold"] == {
        "begrunnelseHtml": "<p>Tekst</p>"
    }


def test_annet_team_paa_samme_side_ser_ikke_utkastet(api):
    """Byggherrens eksterne rådgiver er en annen organisasjon på BH-siden."""
    _lagre(api)
    api.auth.contract_membership.return_value = ("BH", "team-radgiver")
    assert _hent(api).get_json()["utkast"] is None


def test_motparten_ser_ikke_utkastet(api):
    _lagre(api)
    api.auth.contract_membership.return_value = ("TE", "team-te")
    assert _hent(api).get_json()["utkast"] is None


def test_flertydig_organisasjon_gir_ikke_tilgang(api):
    """`contract_membership` gir team None når brukeren treffer flere team."""
    _lagre(api)
    api.auth.contract_membership.return_value = ("BH", None)
    assert _hent(api).status_code == 403
    assert _lagre(api, forventet_versjon=1).status_code == 403


def test_bruker_uten_kontraktsside_avvises(api):
    api.auth.contract_membership.return_value = (None, None)
    assert _hent(api).status_code == 403


def test_ukjent_spor_avvises(api):
    assert _hent(api, spor="honorar").status_code == 400
    assert _lagre(api, spor="honorar").status_code == 400


def test_revisjon_maa_vaere_et_tall(api):
    assert api.client.get(
        "/api/cases/S1/utkast/grunnlag?revisjon=nyeste",
        headers={"X-Project-ID": "p"},
    ).status_code == 400


def test_ny_revisjon_lar_forrige_staa_urort(api):
    _lagre(api, innhold={"begrunnelseHtml": "<p>Sendt</p>"}, revisjon=0)
    _lagre(api, innhold={"begrunnelseHtml": "<p>Nytt</p>"}, revisjon=1)
    assert _hent(api, revisjon=0).get_json()["utkast"]["innhold"] == {
        "begrunnelseHtml": "<p>Sendt</p>"
    }


def test_samtidig_lagring_gir_konflikt_med_gjeldende_tekst(api):
    _lagre(api)
    _lagre(api, innhold={"begrunnelseHtml": "<p>Alice</p>"}, forventet_versjon=1)
    svar = _lagre(api, innhold={"begrunnelseHtml": "<p>Bob</p>"}, forventet_versjon=1)
    assert svar.status_code == 409
    kropp = svar.get_json()
    assert kropp["error"] == "UTKAST_KONFLIKT"
    assert kropp["utkast"]["innhold"] == {"begrunnelseHtml": "<p>Alice</p>"}
    assert kropp["utkast"]["versjon"] == 2


def test_sletting_fjerner_utkastet(api):
    _lagre(api)
    assert (
        api.client.delete(
            "/api/cases/S1/utkast/grunnlag?revisjon=0",
            headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
        ).status_code
        == 204
    )
    assert _hent(api).get_json()["utkast"] is None


def test_skriving_uten_csrf_token_avvises(api):
    """Utkastet er en skriving som en annen nettside ikke skal kunne utløse."""
    svar = api.client.put(
        "/api/cases/S1/utkast/grunnlag",
        json={"revisjon": 0, "innhold": {"a": "b"}, "forventet_versjon": None},
        headers={"X-Project-ID": "p"},
    )
    assert svar.status_code == 403
    assert _hent(api).get_json()["utkast"] is None


def test_sak_i_annet_prosjekt_avvises(api, monkeypatch):
    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="annet", catenda_topic_id="topic"
    )
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    assert _hent(api).status_code == 403
