"""B-17: med TS-skrivestien på skriver Python ingen hendelse i journalen (#668).

Kilden for forventningen er B-17 («Ingen Python-funksjon skal endre
KOE-journalen etter byttet, heller ikke indirekte gjennom endringsordre eller
forsering») og OV-U1 (Python skriver ikke i noen av de tre sakstypene).
Bryteren er `TS_SKRIVESTI` (`settings.ts_skrivesti`). Rutene, dekoratørene,
lagrene og basen er ekte. Bare innloggingstjenesten er byttet ut. Hver
avvisning har en kontrollsak med bryteren av, som ellers er lik.
Tjenesteinngangene prøves i `tests/test_repositories/test_ts_skrivesti_vakt.py`.
"""

from uuid import uuid4

import psycopg
import pytest

from core.config import settings
from lib.db import PermanentError
from models.events import SakOpprettetEvent
from repositories.event_repository import PythonSkrivingStengt
from repositories.postgres.hendelse import PostgresEventRepository
from tests.test_database.conftest import journalen

pytestmark = pytest.mark.database

PROSJEKT = "p-ts-skrivesti"
HEADERS = {"X-Project-ID": PROSJEKT, "X-CSRF-Token": "csrf"}
SAKSTYPER = ["standard", "endringsordre", "forsering"]
GRUNNLAG = {
    "event_type": "grunnlag_opprettet",
    "data": {
        "tittel": "Fundament",
        "hovedkategori": "ENDRING",
        "underkategori": "IRREG",
        "beskrivelse": "Endret fundamentering",
        "dato_oppdaget": "2026-09-13",
    },
}


@pytest.fixture
def skrivesti(monkeypatch):
    def sett(paa: bool) -> None:
        monkeypatch.setattr(settings, "ts_skrivesti", paa)

    sett(False)
    return sett


def _opprett_i_batch(klient, sak_id: str, sakstype: str):
    return klient.post(
        "/api/events/batch",
        json={
            "sak_id": sak_id,
            "expected_version": 0,
            "sakstype": sakstype,
            "events": [{"event_type": "sak_opprettet", "sakstittel": "Fundament", "sakstype": sakstype}],
        },
        headers=HEADERS,
    )


def _ny_sak(klient, sakstype: str) -> str:
    sak_id = str(uuid4())
    svar = _opprett_i_batch(klient, sak_id, sakstype)
    assert svar.status_code == 201, svar.get_json()
    return sak_id


def _metadata_finnes(url: str, sak_id: str) -> bool:
    with psycopg.connect(url, autocommit=True) as c:
        return c.execute("SELECT 1 FROM sak_metadata WHERE sak_id = %s", (sak_id,)).fetchone() is not None


def _send_enkelt(klient, sak_id: str):
    return klient.post(
        "/api/events",
        json={
            "sak_id": sak_id,
            "event": GRUNNLAG,
            "expected_version": 1,
        },
        headers=HEADERS,
    )


def _send_batch(klient, sak_id: str):
    return klient.post(
        "/api/events/batch",
        json={
            "sak_id": sak_id,
            "expected_version": 1,
            "events": [GRUNNLAG],
        },
        headers=HEADERS,
    )


@pytest.mark.parametrize("send", [_send_enkelt, _send_batch], ids=["enkelt", "batch"])
@pytest.mark.parametrize("sakstype", SAKSTYPER)
def test_hendelse_i_eksisterende_sak_avvises_med_400_naar_ts_skrivestien_er_paa(
    hendelsesklient, testbase_url, skrivesti, sakstype, send
):
    sak_id = _ny_sak(hendelsesklient, sakstype)
    skrivesti(True)

    svar = send(hendelsesklient, sak_id)

    assert svar.status_code == 400, svar.get_json()
    assert "TS-kjernen" in svar.get_json()["message"]
    assert journalen(testbase_url, sak_id) == ["sak_opprettet"]


@pytest.mark.parametrize("send", [_send_enkelt, _send_batch], ids=["enkelt", "batch"])
@pytest.mark.parametrize("sakstype", SAKSTYPER)
def test_kontroll_hendelse_i_eksisterende_sak_lagres_naar_ts_skrivestien_er_av(
    hendelsesklient, testbase_url, skrivesti, sakstype, send
):
    sak_id = _ny_sak(hendelsesklient, sakstype)

    svar = send(hendelsesklient, sak_id)

    assert svar.status_code == 201, svar.get_json()
    assert journalen(testbase_url, sak_id) == ["sak_opprettet", "grunnlag_opprettet"]


@pytest.mark.parametrize("sakstype", SAKSTYPER)
def test_opprettelse_i_batch_feiler_uten_hendelse_og_metadata_naar_ts_skrivestien_er_paa(
    hendelsesklient, testbase_url, skrivesti, sakstype
):
    skrivesti(True)
    sak_id = str(uuid4())

    svar = _opprett_i_batch(hendelsesklient, sak_id, sakstype)

    assert svar.status_code == 500, svar.get_json()
    assert svar.get_json()["error"] == "CREATION_FAILED"
    assert "TS-kjernen" in svar.get_json()["message"]
    assert journalen(testbase_url, sak_id) == []
    assert not _metadata_finnes(testbase_url, sak_id)


def test_kontroll_opprettelse_i_batch_lagrer_saken_naar_ts_skrivestien_er_av(
    hendelsesklient, testbase_url, skrivesti
):
    sak_id = _ny_sak(hendelsesklient, "standard")

    assert journalen(testbase_url, sak_id) == ["sak_opprettet"]
    assert _metadata_finnes(testbase_url, sak_id)


@pytest.mark.parametrize("paa", [True, False], ids=["paa", "av_kontroll"])
def test_postgres_lageret_avviser_hendelsen_bare_naar_ts_skrivestien_er_paa(
    skrivbar_base, testbase_url, skrivesti, monkeypatch, paa
):
    sak_id = f"SAK-TS-{uuid4()}"
    with psycopg.connect(testbase_url) as c, c.transaction():
        c.execute(
            "INSERT INTO sak_metadata (sak_id, prosjekt_id, created_at, created_by)"
            " VALUES (%s, %s, now(), 'test')",
            (sak_id, PROSJEKT),
        )
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: PROSJEKT)
    journal = PostgresEventRepository(skrivbar_base)
    hendelse = SakOpprettetEvent(
        sak_id=sak_id,
        sakstittel="Fundament",
        aktor_id="5f1c0f2e-2f1a-4a64-9a2e-9f0b1d2c3e4f",
        aktor_rolle="TE",
        aktor_team_id="22222222222222222222222222222222",
    )
    skrivesti(paa)

    if paa:
        with pytest.raises(PythonSkrivingStengt) as feil:
            journal.append(hendelse, expected_version=0)
        assert isinstance(feil.value, PermanentError)
        assert journalen(testbase_url, sak_id) == []
    else:
        assert journal.append(hendelse, expected_version=0) == 1
        assert journalen(testbase_url, sak_id) == ["sak_opprettet"]
