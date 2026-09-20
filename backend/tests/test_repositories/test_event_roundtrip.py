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
from types import SimpleNamespace

import pytest

from models.events import InterntNotatData, InterntNotatEvent, parse_event
from repositories.event_repository import JsonFileEventRepository
from repositories.supabase_event_repository import SupabaseEventRepository

TE_TEAM = "22222222222222222222222222222222"
SAK_ID = "KOE-ROUNDTRIP-001"
NOTAT_TEKST = "Internt: vi bør ikke spille ut fristkravet ennå."

# Kolonnene `hendelse` faktisk har. Speiler
# supabase/migrations/20260920193558_hendelse_tabell.sql, og holdes i synk
# manuelt — det er poenget: skriver koden en kolonne som ikke står her, mangler
# den også i databasen.
#
# MERK: lista speiler repoet, ikke den levende basen. Den fanger at koden og
# migrasjonsfila er uenige, aldri at fila og basen er det — det er
# katalogspørringen som er beviset på at en skjemaendring har nådd fram.
EVENT_TABLE_COLUMNS = {
    "id",
    "specversion",
    "event_id",
    "source",
    "type",
    "time",
    "subject",
    "datacontenttype",
    "actorid",
    "actorrole",
    "actorteam",
    "comment",
    "referstoid",
    "data",
    "prosjekt_id",
    "sak_id",
    "event_type",
    "versjon",
    "created_at",
}


class _FakeTable:
    """Én spørring mot én tabell i minnet.

    Bygges på nytt per `client.table(...)`-kall, slik at filtre ikke lekker
    mellom spørringer — som hos den ekte klienten.
    """

    def __init__(self, name: str, rows: list[dict]):
        self._name = name
        self._rows = rows
        self._columns: str | None = None
        self._filters: list[tuple[str, object]] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._pending_insert: list[dict] | None = None

    def insert(self, rows):
        rows = rows if isinstance(rows, list) else [rows]
        for row in rows:
            unknown = set(row) - EVENT_TABLE_COLUMNS
            if unknown:
                raise AssertionError(
                    f"Tabellen {self._name} har ingen kolonne(r) {sorted(unknown)}"
                )
        self._pending_insert = rows
        return self

    def select(self, columns="*"):
        self._columns = columns
        return self

    def eq(self, field, value):
        self._filters.append((field, value))
        return self

    def order(self, field, desc=False):
        self._order = (field, desc)
        return self

    def limit(self, count):
        self._limit = count
        return self

    def execute(self):
        if self._pending_insert is not None:
            self._rows.extend(dict(row) for row in self._pending_insert)
            return SimpleNamespace(data=list(self._pending_insert))

        rows = [
            row
            for row in self._rows
            if all(row.get(field) == value for field, value in self._filters)
        ]
        if self._order:
            field, desc = self._order
            rows = sorted(rows, key=lambda row: row.get(field), reverse=desc)
        if self._limit is not None:
            rows = rows[: self._limit]
        if self._columns and self._columns != "*":
            wanted = [part.strip() for part in self._columns.split(",")]
            rows = [{key: row.get(key) for key in wanted} for row in rows]
        return SimpleNamespace(data=[dict(row) for row in rows])


class _FakeSupabaseClient:
    """Minimal Supabase-klient uten nettverk."""

    def __init__(self):
        self.tables: dict[str, list[dict]] = {}

    def table(self, name: str) -> _FakeTable:
        return _FakeTable(name, self.tables.setdefault(name, []))


@pytest.fixture
def supabase_repo(monkeypatch):
    client = _FakeSupabaseClient()
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
        aktor_id="Kari Nordmann",
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
    assert parsed.aktor_id == "Kari Nordmann"
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
    assert parsed.aktor_id == "Kari Nordmann"
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
