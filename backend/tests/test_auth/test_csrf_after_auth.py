"""CSRF håndheves etter autentisering, ikke før.

En utlogget bruker som sender et skjema skal få 401 og bli sendt til innlogging.
Får hen 403 i stedet, redirecter ikke klienten: `src/lib/api/client.ts` sender
bare til login på 401, og prøver 403 med CSRF-feil om igjen med et nytt token
som heller ikke finnes. Resultatet blir «Prøv igjen» i evig løkke for en
sesjon som har løpt ut midt i arbeidet.

CSRF-kontrollen bor i `require_auth`, som har sesjonen den skal sammenlikne
mot. En egen ytre dekoratør ville kjørt før den og svart 403 på noe som er en
innloggingsfeil.
"""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context
from routes import utkast_routes, vedlegg_routes


@pytest.fixture
def app(monkeypatch, tmp_path):
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.delenv("DISABLE_AUTH", raising=False)

    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(utkast_routes.utkast_bp)
    app.register_blueprint(vedlegg_routes.vedlegg_bp)

    auth = Mock()
    # Ingen gyldig sesjon: cookien peker ikke på noe.
    auth.repo.session.return_value = None
    app.extensions["koe_auth"] = auth

    container = Mock()
    container.metadata_repository.get.return_value = SimpleNamespace(
        prosjekt_id="p", catenda_topic_id="topic"
    )
    monkeypatch.setattr("lib.auth.project_access.get_container", lambda: container)
    return app


def _svar(app, med_cookie: bool):
    client = app.test_client()
    if med_cookie:
        client.set_cookie(cookie_name(), "utlopt-sesjon")
    return client.put(
        "/api/cases/S1/utkast/grunnlag",
        json={"revisjon": 0, "innhold": {"a": "b"}, "forventet_versjon": None},
        headers={"X-Project-ID": "p"},
    )


def test_utlopt_sesjon_gir_401_ikke_csrf_feil(app):
    svar = _svar(app, med_cookie=True)

    assert svar.status_code == 401
    assert svar.get_json()["error"] == "UNAUTHORIZED"


def test_forespørsel_uten_cookie_gir_401(app):
    svar = _svar(app, med_cookie=False)

    assert svar.status_code == 401
    assert svar.get_json()["error"] == "UNAUTHORIZED"


def test_innlogget_uten_csrf_token_gir_fortsatt_403(app):
    """Fjerningen av den ytre dekoratøren svekker ikke CSRF-vernet."""
    app.extensions["koe_auth"].repo.session.return_value = {
        "app_users": {"id": "u", "email": "bh@example.test", "name": "BH"},
        "csrf_token": "riktig-token",
    }

    svar = _svar(app, med_cookie=True)

    assert svar.status_code == 403
    assert svar.get_json()["error"] == "CSRF validation failed"


def test_feil_csrf_token_gir_403(app):
    app.extensions["koe_auth"].repo.session.return_value = {
        "app_users": {"id": "u", "email": "bh@example.test", "name": "BH"},
        "csrf_token": "riktig-token",
    }
    client = app.test_client()
    client.set_cookie(cookie_name(), "sesjon")

    svar = client.post(
        "/api/cases/S1/vedlegg",
        data={},
        headers={"X-Project-ID": "p", "X-CSRF-Token": "feil-token"},
    )

    assert svar.status_code == 403
    assert svar.get_json()["error"] == "CSRF validation failed"
