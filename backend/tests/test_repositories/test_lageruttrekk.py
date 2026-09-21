"""Uttrekkene som leser mer enn én sak om gangen.

`get_all_sak_ids` og `find_sak_id_by_catenda_topic` er de to spørringene som
ikke er avgrenset til én sak. Begge var før ufiltrerte `select`-kall som
PostgREST avkorter stille, og begge ble skrevet om i KR-02 og KR-03.

Testene går gjennom testdobbelen, ikke en Mock, fordi det er selve
spørringsformen som er poenget: at uttrekket paginerer forbi sidegrensen, og at
topic-oppslaget bruker et serverfilter på JSON-kolonnen framfor å hente hver
sak. Dobbelen speiler repoet og ikke den levende basen — den beviser at koden
ber om riktig form, ikke at serveren svarer som antatt.
"""

import pytest

from lib.supabase.paginering import SIDESTORRELSE
from repositories.supabase_event_repository import (
    HENDELSE_TABELL,
    SupabaseEventRepository,
)

from ..fixtures.supabase_dobbel import FakeSupabaseClient


@pytest.fixture
def lager(monkeypatch):
    client = FakeSupabaseClient()
    monkeypatch.setattr(
        "repositories.supabase_event_repository.create_client",
        lambda url, key: client,
    )
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: "p-uttrekk")
    repo = SupabaseEventRepository(
        url="https://uttrekk.example.invalid", key="test-key"
    )
    return repo, client


def _rad(nr: int, sak_id: str, event_type: str = "sak_opprettet", data=None) -> dict:
    return {
        "id": nr,
        "sak_id": sak_id,
        "event_type": event_type,
        "data": data if data is not None else {},
    }


def test_get_all_sak_ids_henter_forbi_sidegrensen(lager):
    """Saker som ligger etter første side skal ikke falle ut."""
    repo, client = lager
    antall = SIDESTORRELSE * 2 + 7
    client.tables[HENDELSE_TABELL] = [
        _rad(nr, f"SAK-{nr:05d}") for nr in range(antall)
    ]

    sak_ids = repo.get_all_sak_ids()

    assert len(sak_ids) == antall
    assert f"SAK-{antall - 1:05d}" in sak_ids


def test_get_all_sak_ids_teller_saker_ikke_hendelser(lager):
    """Loggen har én rad per hendelse; uttrekket skal gi saker."""
    repo, client = lager
    client.tables[HENDELSE_TABELL] = [
        _rad(1, "SAK-A"),
        _rad(2, "SAK-A", event_type="varsel_sendt"),
        _rad(3, "SAK-B"),
    ]

    assert sorted(repo.get_all_sak_ids()) == ["SAK-A", "SAK-B"]


def test_find_sak_id_by_catenda_topic_filtrerer_paa_serveren(lager):
    """Topicen slås opp med et filter, ikke ved å hente hver sak."""
    repo, client = lager
    client.tables[HENDELSE_TABELL] = [
        _rad(1, "SAK-A", data={"catenda_topic_id": "guid-a"}),
        _rad(2, "SAK-B", data={"catenda_topic_id": "guid-b"}),
    ]

    assert repo.find_sak_id_by_catenda_topic("guid-b") == "SAK-B"
    assert repo.find_sak_id_by_catenda_topic("guid-ukjent") is None


def test_find_sak_id_by_catenda_topic_ser_bort_fra_andre_hendelsestyper(lager):
    """Bare sak_opprettet bærer topic-GUID-en saken ble til av."""
    repo, client = lager
    client.tables[HENDELSE_TABELL] = [
        _rad(1, "SAK-A", event_type="varsel_sendt", data={"catenda_topic_id": "guid"}),
    ]

    assert repo.find_sak_id_by_catenda_topic("guid") is None
