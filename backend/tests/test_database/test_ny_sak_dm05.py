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

from uuid import uuid4

import pytest

from tests.test_database.conftest import journalen

pytestmark = pytest.mark.database

PROSJEKT = "p-dm05"
HEADERS = {"X-Project-ID": PROSJEKT, "X-CSRF-Token": "csrf"}


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


def test_dm05_kontroll_batch_ruta_oppretter_saken(hendelsesklient, testbase_url):
    sak_id = str(uuid4())
    svar = hendelsesklient.post(
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
    assert journalen(testbase_url, sak_id) == ["sak_opprettet"]


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="DM-05: POST /api/events avviser sak_opprettet for en ny sak med 403",
)
def test_dm05_skjemaet_oppretter_saken(hendelsesklient, testbase_url):
    sak_id = str(uuid4())
    svar = hendelsesklient.post("/api/events", json=_som_skjemaet_sender(sak_id), headers=HEADERS)
    if svar.status_code not in (201, 403):
        pytest.fail(f"Uventet svar {svar.status_code}: {svar.get_json()}")

    assert svar.status_code == 201, svar.get_json()
    assert journalen(testbase_url, sak_id) == ["sak_opprettet"]
