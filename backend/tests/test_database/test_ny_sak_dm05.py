"""DM-05: skjemaet for ny sak kan ikke opprette saken.

Skjemaet (`NewCaseForm.svelte`) sender `sak_opprettet` med en ny sak-ID som
enkelthendelse til `POST /api/events`. `require_project_access` godtar en sak
uten metadata bare på `/api/events/batch` med `sak_opprettet` først, så
innsendingen avvises med 403.

Kilden for forventningen er oppdragsgivers svar 29.09: saker skal kunne
opprettes både fra skjemaet i appen og fra en topic i Catenda. Kontrollen
sender samme hendelse til batch-ruta og viser at brukeren har tilgang og at
saken kan opprettes over dette lageret. Ruter, dekoratører, lagre og base er
ekte; bare innloggingstjenesten er byttet ut. Beskrevet i
docs/gjennomforing-spor-m-1b-2026-09-29.md.
"""

from unittest.mock import Mock
from uuid import uuid4

import psycopg
import pytest
from flask import Flask

from lib.auth.session import cookie_name
from lib.project_context import init_project_context

pytestmark = pytest.mark.database

PROSJEKT = "p-dm05"
HEADERS = {"X-Project-ID": PROSJEKT, "X-CSRF-Token": "csrf"}
BRUKER = "5f1c0f2e-2f1a-4a64-9a2e-9f0b1d2c3e4f"


@pytest.fixture
def klient(container_mot_testbasen, monkeypatch):
    from routes import event_routes

    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    innlogging = Mock()
    innlogging.repo.session.return_value = {
        "app_users": {"id": BRUKER, "email": "te@example.com", "name": "TE"},
        "csrf_token": "csrf",
    }
    innlogging.role.return_value = "member"
    innlogging.contract_membership.return_value = ("TE", "team-te")
    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(event_routes.events_bp)
    app.extensions["koe_auth"] = innlogging
    klient = app.test_client()
    klient.set_cookie(cookie_name(), "session")
    return klient


def _journalen(url: str, sak_id: str) -> list[str]:
    with psycopg.connect(url, autocommit=True) as c:
        rader = c.execute(
            "SELECT event_type FROM hendelse WHERE sak_id = %s ORDER BY versjon", (sak_id,)
        ).fetchall()
    return [r[0] for r in rader]


def _som_skjemaet_sender(sak_id: str) -> dict:
    """Formen fra `submitEvent` i src/lib/api/events.ts."""
    return {
        "sak_id": sak_id,
        "event": {
            "event_type": "sak_opprettet",
            "aktor_rolle": "TE",
            "data": {"prosjekt_id": PROSJEKT, "sakstype": "standard", "sakstittel": "Ny sak"},
        },
        "expected_version": 0,
    }


def test_dm05_kontroll_batch_ruta_oppretter_saken(klient, testbase_url):
    sak_id = str(uuid4())
    svar = klient.post(
        "/api/events/batch",
        json={
            "sak_id": sak_id,
            "expected_version": 0,
            "sakstype": "standard",
            "events": [{"event_type": "sak_opprettet", "sakstittel": "Ny sak", "sakstype": "standard"}],
        },
        headers=HEADERS,
    )

    assert svar.status_code == 201, svar.get_json()
    assert _journalen(testbase_url, sak_id) == ["sak_opprettet"]


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DM-05: POST /api/events avviser sak_opprettet for en ny sak med 403",
)
def test_dm05_skjemaet_oppretter_saken(klient, testbase_url):
    sak_id = str(uuid4())
    svar = klient.post("/api/events", json=_som_skjemaet_sender(sak_id), headers=HEADERS)
    if svar.status_code not in (201, 403):
        pytest.fail(f"Uventet svar {svar.status_code}: {svar.get_json()}")

    assert svar.status_code == 201, svar.get_json()
    assert _journalen(testbase_url, sak_id) == ["sak_opprettet"]
