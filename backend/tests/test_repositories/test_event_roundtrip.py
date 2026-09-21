"""Round-trip-tester for event-lagrene.

En hendelse som er skrevet til lageret og lest tilbake må kunne parses til
samme modell igjen. Feltene som serveren stempler på hendelsen — aktør, rolle
og aktørens Catenda-team — er en del av den kontrakten, og
`lib/auth/event_visibility` bruker teamet til å avgjøre hva leseren får se.

Etter MS-05 dekker filen også den motsatte kontrakten: journalen skal *avvise*
en hendelsestype som har sitt eget lager. Den vakten ligger i lageret og ikke i
ruta, fordi det finnes to innsendingsruter.

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

from models.events import (
    InterntNotatData,
    InterntNotatEvent,
    SakOpprettetEvent,
    parse_event,
)
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


def _journalhendelse() -> SakOpprettetEvent:
    return SakOpprettetEvent(
        sak_id=SAK_ID,
        sakstittel="Endret fundamentering",
        aktor_id=AKTOR_ID,
        aktor_rolle="TE",
        aktor_team_id=TE_TEAM,
        kommentar="Skrevet før byggemøtet",
    )


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
    """Serverens stempel må overleve rundturen."""
    repo, _client = supabase_repo
    repo.append(_journalhendelse(), expected_version=0)

    lagrede, versjon = repo.get_events(SAK_ID)

    assert versjon == 1
    parsed = parse_event(lagrede[0])
    assert parsed.aktor_team_id == TE_TEAM
    assert parsed.aktor_id == AKTOR_ID
    assert parsed.aktor_rolle == "TE"
    assert parsed.kommentar == "Skrevet før byggemøtet"


def test_supabase_cloudevents_eksport_tar_med_aktorteam(supabase_repo):
    """Eksterne integrasjoner leser CloudEvents-formatet direkte."""
    repo, _client = supabase_repo
    repo.append(_journalhendelse(), expected_version=0)

    cloudevents = repo.get_events_as_cloudevents(SAK_ID)

    assert cloudevents[0]["actorteam"] == TE_TEAM


def test_json_roundtrip_beholder_aktor_team_id(json_repo):
    """Samme kontrakt for JSON-lageret, som lagrer hele model_dump."""
    json_repo.append(_journalhendelse(), expected_version=0)

    lagrede, versjon = json_repo.get_events(SAK_ID)

    assert versjon == 1
    parsed = parse_event(lagrede[0])
    assert parsed.aktor_team_id == TE_TEAM
    assert parsed.aktor_id == AKTOR_ID
    assert parsed.aktor_rolle == "TE"
    assert parsed.kommentar == "Skrevet før byggemøtet"


def test_supabase_journalen_avviser_internt_notat(supabase_repo):
    """MS-05: notatet har sitt eget lager, og journalen kan ikke rettes i ettertid."""
    repo, client = supabase_repo

    with pytest.raises(ValueError, match="eget lager"):
        repo.append(_internt_notat(), expected_version=0)

    skrevet = [rad for rader in client.tables.values() for rad in rader]
    assert skrevet == [], "Et internt notat ble skrevet til journalen"


def test_json_journalen_avviser_internt_notat(json_repo):
    """Samme vakt i fil-lageret: regelen ligger i lageret, ikke i ruta."""
    with pytest.raises(ValueError, match="eget lager"):
        json_repo.append(_internt_notat(), expected_version=0)

    assert json_repo.get_events(SAK_ID) == ([], 0)


def test_batchskriving_avviser_internt_notat(json_repo):
    """Batchruta er den andre innsendingsveien, og den gikk utenom grenen i ruta."""
    with pytest.raises(ValueError, match="eget lager"):
        json_repo.append_batch(
            [_journalhendelse(), _internt_notat()], expected_version=0
        )

    assert json_repo.get_events(SAK_ID) == ([], 0)


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
        repo.append(_journalhendelse(), expected_version=0)

    skrevet = [rad for rader in client.tables.values() for rad in rader]
    assert skrevet == [], "En hendelse ble skrevet uten prosjekt"
