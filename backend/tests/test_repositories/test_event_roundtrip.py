"""Round-trip-tester for event-lagrene.

En hendelse som er skrevet til lageret og lest tilbake må kunne parses til
samme modell igjen. Feltene som serveren stempler på hendelsen — aktør, rolle
og aktørens Catenda-team — er en del av den kontrakten: `InterntNotatEvent`
krever `aktor_team_id`, og `lib/auth/event_visibility` bruker det til å avgjøre
hvem som får lese notatet.

Konsekvensen av et felt som faller ut er ikke bare at notatet blir usynlig:
`parse_event` kaster `pydantic.ValidationError` (en `ValueError`), og
`routes/event_routes` oversetter det til HTTP 400 for *alle* senere
innsendinger på saken. Derfor har hver lagerimplementasjon sin egen test her.

Testene er uten nettverk: Supabase-klienten er erstattet av en tabell i minnet
som avviser kolonner den ikke kjenner, slik at et felt koden skriver uten at
skjemaet har kolonnen også blir fanget.
"""

import tempfile

import pytest

from models.events import InterntNotatData, InterntNotatEvent, parse_event
from repositories.event_repository import JsonFileEventRepository
from repositories.supabase_event_repository import SupabaseEventRepository

from ..fixtures.supabase_dobbel import FakeSupabaseClient

TE_TEAM = "22222222222222222222222222222222"
SAK_ID = "KOE-ROUNDTRIP-001"
AKTOR_ID = "5f1c0f2e-2f1a-4a64-9a2e-9f0b1d2c3e4f"
NOTAT_TEKST = "Internt: vi bør ikke spille ut fristkravet ennå."


@pytest.fixture
def supabase_repo(monkeypatch):
    client = FakeSupabaseClient()
    monkeypatch.setattr(
        "repositories.supabase_event_repository.create_client",
        lambda url, key: client,
    )
    # prosjekt_id stemples fra autorisert kontekst (NOT NULL fra 2026-09-20).
    # Testene kjører uten forespørsel, så konteksten gjøres eksplisitt framfor
    # å arves fra et fallback, slik den ble før.
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: "p-roundtrip")
    repo = SupabaseEventRepository(
        url="https://roundtrip.example.invalid", key="test-key"
    )
    return repo, client


@pytest.fixture
def json_repo():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield JsonFileEventRepository(base_path=tmpdir)


def _internt_notat() -> InterntNotatEvent:
    return InterntNotatEvent(
        sak_id=SAK_ID,
        aktor_id=AKTOR_ID,
        aktor_rolle="TE",
        aktor_team_id=TE_TEAM,
        kommentar="Skrevet før byggemøtet",
        data=InterntNotatData(tekst=NOTAT_TEKST, spor="frist"),
    )


def test_supabase_roundtrip_beholder_aktor_team_id(supabase_repo):
    """Notatet må kunne leses tilbake av forfatterens eget team."""
    repo, _client = supabase_repo
    repo.append(_internt_notat(), expected_version=0)

    lagrede, versjon = repo.get_events(SAK_ID)

    assert versjon == 1
    parsed = parse_event(lagrede[0])
    assert parsed.aktor_team_id == TE_TEAM
    assert parsed.aktor_id == AKTOR_ID
    assert parsed.aktor_rolle == "TE"
    assert parsed.kommentar == "Skrevet før byggemøtet"
    assert parsed.data.tekst == NOTAT_TEKST


def test_supabase_cloudevents_eksport_tar_med_aktorteam(supabase_repo):
    """Eksterne integrasjoner leser CloudEvents-formatet direkte."""
    repo, _client = supabase_repo
    repo.append(_internt_notat(), expected_version=0)

    cloudevents = repo.get_events_as_cloudevents(SAK_ID)

    assert cloudevents[0]["actorteam"] == TE_TEAM


def test_json_roundtrip_beholder_aktor_team_id(json_repo):
    """Samme kontrakt for JSON-lageret, som lagrer hele model_dump."""
    json_repo.append(_internt_notat(), expected_version=0)

    lagrede, versjon = json_repo.get_events(SAK_ID)

    assert versjon == 1
    parsed = parse_event(lagrede[0])
    assert parsed.aktor_team_id == TE_TEAM
    assert parsed.aktor_id == AKTOR_ID
    assert parsed.aktor_rolle == "TE"
    assert parsed.kommentar == "Skrevet før byggemøtet"
    assert parsed.data.tekst == NOTAT_TEKST


def test_supabase_skriving_uten_autorisert_prosjekt_avvises(supabase_repo, monkeypatch):
    """Fail-closed: uten autorisert prosjekt skrives ingen hendelse.

    prosjekt_id er NOT NULL i databasen, men grensen skal håndheves før
    spørringen sendes — en gjetning her ville gjenopprettet tvetydigheten
    kolonnen fjerner. Databasen er siste skanse, ikke første.
    """
    repo, client = supabase_repo
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: None)

    from lib.supabase.exceptions import PermanentError

    with pytest.raises(PermanentError, match="uten autorisert prosjekt"):
        repo.append(_internt_notat(), expected_version=0)

    skrevet = [rad for rader in client.tables.values() for rad in rader]
    assert skrevet == [], "En hendelse ble skrevet uten prosjekt"
