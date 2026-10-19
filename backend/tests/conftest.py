"""
pytest fixtures for integration testing

Provides:
- Flask app, test client og CLI-runner
"""

import os

# Import Flask app
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Miljøet går foran backend/.env, også for skriptene testene starter som egne
# prosesser. Et uttrykkelig `TS_SKRIVESTI=true pytest` står seg for dem; i
# testene holder fixturen `ts_skrivesti_av` under bryteren av (#692, #958).
os.environ.setdefault("TS_SKRIVESTI", "false")

# CSRF håndheves i `require_auth`, som har sesjonen å sammenlikne mot. Det er
# ett håndhevingspunkt, og det kan ikke slås av her — tester som sender en
# mutasjon må sende `X-CSRF-Token` som samsvarer med sesjonens token, eller
# kjøre med DISABLE_AUTH.
from app import app as flask_app

# Importen av `app` over kaller load_dotenv og legger backend/.env inn i miljøet.
# SUPABASE_URL og SUPABASE_SECRET_KEY blir dermed satt for hele testkjøringen,
# og en test som bygger en Supabase-klient treffer det konfigurerte prosjektet
# — også når utvikleren bare kjørte `pytest`. Tester som faktisk skal ut mot
# Supabase må derfor merkes `@pytest.mark.live` og bes om eksplisitt.
LIVE_SUPABASE_ENV = "RUN_LIVE_SUPABASE"


def pytest_collection_modifyitems(config, items):
    """Hopp over `live`-merkede tester uten eksplisitt miljø.

    Skippingen skjer i innsamlingen, ikke i en fixture, slik at verken klienter
    eller opprydding kjører: standard `pytest` skal ikke gjøre nettverkskall.
    """
    skip_live = pytest.mark.skip(
        reason=f"Live Supabase-test. Sett {LIVE_SUPABASE_ENV}=1 for å kjøre."
    )
    kjor_live = os.environ.get(LIVE_SUPABASE_ENV) == "1"

    for item in items:
        if not kjor_live and item.get_closest_marker("live") is not None:
            item.add_marker(skip_live)


@pytest.fixture(autouse=True)
def ts_skrivesti_av(monkeypatch):
    """Testene kjører med TS-skrivestien av, også når backend/.env slår den på (#692).

    Med bryteren på avviser Python-lageret hver hendelse (B-17), og resten av suiten
    blir rød uten at noe peker på årsaken. En test som prøver bryteren, slår den på selv
    med `monkeypatch`, og fixturen setter den av igjen før neste test.
    """
    from core.config import settings

    monkeypatch.setattr(settings, "ts_skrivesti", False)


@pytest.fixture
def app():
    """Create Flask app configured for testing"""
    flask_app.config.update(
        {
            "TESTING": True,
            "WTF_CSRF_ENABLED": False,  # Disable CSRF for testing
        }
    )
    yield flask_app


@pytest.fixture
def client(app):
    """Create Flask test client"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create Flask CLI runner"""
    return app.test_cli_runner()
