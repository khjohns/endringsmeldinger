"""CATENDA_GRUNNADRESSE i Python-klienten (#806), med samme regel som TS-klienten:
en https-origin, eller http mot localhost i utvikling. Ingen stille fallback."""

import pytest

from integrations.catenda import CatendaClient
from integrations.catenda.base import CATENDA, grunnadresse


@pytest.mark.parametrize(
    ("verdi", "app_env", "forventet"),
    [
        (None, None, CATENDA),
        ("", "production", CATENDA),
        ("https://broker.example", None, "https://broker.example"),
        ("https://Broker.Example:443/", "production", "https://broker.example"),
        ("https://broker.example:8443", "production", "https://broker.example:8443"),
        ("http://localhost:9000", "development", "http://localhost:9000"),
        ("https://[::1]:8443", "production", "https://[::1]:8443"),
        ("https://Bøker.example", "production", "https://xn--bker-gra.example"),
    ],
)
def test_godtar(verdi, app_env, forventet):
    assert grunnadresse(verdi, app_env) == forventet


@pytest.mark.parametrize(
    ("verdi", "app_env"),
    [
        ("http://broker.example", "development"),
        ("http://localhost:9000", "production"),
        ("https://broker.example/catenda", "production"),
        ("https://broker.example/?a=1", "production"),
        ("https://broker.example/#a", "production"),
        ("https://bruker@broker.example", "production"),
        ("https://:hemmelig@broker.example", "production"),
        ("ftp://broker.example", "production"),
        ("broker.example", "production"),
        ("https://broker.example:99999", "production"),
    ],
)
def test_avviser(verdi, app_env):
    with pytest.raises(ValueError, match="CATENDA_GRUNNADRESSE"):
        grunnadresse(verdi, app_env)


def test_klienten_leser_variabelen(monkeypatch):
    monkeypatch.setenv("CATENDA_GRUNNADRESSE", "https://broker.example")
    assert CatendaClient(client_id="k").base_url == "https://broker.example"


def test_klienten_bruker_catenda_uten_variabelen(monkeypatch):
    monkeypatch.delenv("CATENDA_GRUNNADRESSE", raising=False)
    assert CatendaClient(client_id="k").base_url == CATENDA


def test_klienten_avviser_ugyldig_verdi(monkeypatch):
    monkeypatch.setenv("CATENDA_GRUNNADRESSE", "http://broker.example")
    with pytest.raises(ValueError, match="CATENDA_GRUNNADRESSE"):
        CatendaClient(client_id="k")
