"""
Helsesjekken mot Catenda med kontrollert klient.

Testene fastholder svarene helsesjekken ga da den hentet klienten fra
SystemContext, slik at byttet til klientfabrikken (#49) ikke endrer dem.
Ingen levende Catenda-kall.
"""

from unittest.mock import MagicMock

import pytest

from core.config import settings

URL = "/api/health/catenda"


@pytest.fixture
def catenda_enabled(monkeypatch):
    monkeypatch.setattr(settings, "catenda_enabled", "true")


@pytest.fixture
def fabrikk(monkeypatch):
    """Erstatter klientfabrikken og registrerer hvor mange ganger den kalles."""
    kall = []

    def bruk(klient):
        def get_catenda_client(*args, **kwargs):
            kall.append((args, kwargs))
            return klient

        monkeypatch.setattr(
            "lib.catenda_factory.get_catenda_client", get_catenda_client
        )
        return kall

    return bruk


def test_deaktivert_svarer_disabled_uten_aa_bygge_klient(client, monkeypatch, fabrikk):
    monkeypatch.setattr(settings, "catenda_enabled", "false")
    kall = fabrikk(MagicMock())

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json["status"] == "disabled"
    assert kall == []


@pytest.mark.usefixtures("catenda_enabled")
def test_uten_klient_svarer_unconfigured(client, fabrikk):
    fabrikk(None)

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json["status"] == "unconfigured"


@pytest.mark.usefixtures("catenda_enabled")
def test_klient_uten_token_svarer_unconfigured_uten_kall(client, fabrikk):
    klient = MagicMock(access_token=None)
    fabrikk(klient)

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json["status"] == "unconfigured"
    klient.list_projects.assert_not_called()


@pytest.mark.usefixtures("catenda_enabled")
def test_tilkoblet_svarer_connected_med_antall_prosjekter(client, fabrikk):
    klient = MagicMock(access_token="token")
    klient.list_projects.return_value = [{"id": "a"}, {"id": "b"}]
    fabrikk(klient)

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json == {
        "status": "connected",
        "message": "Tilkoblet (2 prosjekt(er))",
    }


@pytest.mark.usefixtures("catenda_enabled")
def test_tomt_svar_fra_catenda_svarer_disconnected(client, fabrikk):
    klient = MagicMock(access_token="token")
    klient.list_projects.return_value = None
    fabrikk(klient)

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json["status"] == "disconnected"


@pytest.mark.usefixtures("catenda_enabled")
def test_forbindelsesfeil_svarer_disconnected(client, fabrikk):
    klient = MagicMock(access_token="token")
    klient.list_projects.side_effect = ConnectionError("Catenda utilgjengelig")
    fabrikk(klient)

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json["status"] == "disconnected"


@pytest.mark.usefixtures("catenda_enabled")
def test_feil_i_klientfabrikken_svarer_disconnected(client, monkeypatch):
    def feiler(*args, **kwargs):
        raise RuntimeError("autentisering feilet")

    monkeypatch.setattr("lib.catenda_factory.get_catenda_client", feiler)

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json["status"] == "disconnected"
