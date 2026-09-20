"""Målskjemaet: hendelsestabellen, aktør-identiteten og organisasjonsgrensen.

Vaktene for de tre beslutningene som ble gjennomført 2026-09-20 fordi basen er
tom og de blir dyre eller umulige når journalen først bærer ekte saker:
MS-01 (én hendelsestabell), MS-04 (aktor_id framfor personnavn) og MS-10
(organisasjon_id på projects). Se
docs/design-maalskjema-database-2026-09-20.md.

Testene er uten nettverk. Supabase-klienten er en tabell i minnet, slik at
hvilken tabell koden faktisk skriver til, og hvilke kolonner den fyller, kan
observeres framfor å utledes.
"""

from pathlib import Path
from types import SimpleNamespace

import pytest

from models.events import InterntNotatData, InterntNotatEvent, parse_event
from repositories.supabase_event_repository import (
    HENDELSE_TABELL,
    SupabaseEventRepository,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
MIGRASJONER = REPO_ROOT / "supabase" / "migrations"

TE_TEAM = "22222222222222222222222222222222"
AKTOR_ID = "5f1c0f2e-2f1a-4a64-9a2e-9f0b1d2c3e4f"
AKTOR_NAVN = "Kari Nordmann"


class _Tabell:
    def __init__(self, navn, rader, logg):
        self._navn = navn
        self._rader = rader
        self._logg = logg
        self._filtre = []
        self._innsetting = None
        self._order = None
        self._limit = None
        self._kolonner = None

    def insert(self, rader):
        self._logg.append(self._navn)
        self._innsetting = rader if isinstance(rader, list) else [rader]
        return self

    def select(self, kolonner="*"):
        self._logg.append(self._navn)
        self._kolonner = kolonner
        return self

    def eq(self, felt, verdi):
        self._filtre.append((felt, verdi))
        return self

    def order(self, felt, desc=False):
        self._order = (felt, desc)
        return self

    def limit(self, antall):
        self._limit = antall
        return self

    def execute(self):
        if self._innsetting is not None:
            self._rader.extend(dict(r) for r in self._innsetting)
            return SimpleNamespace(data=list(self._innsetting))
        rader = [
            r
            for r in self._rader
            if all(r.get(f) == v for f, v in self._filtre)
        ]
        if self._order:
            felt, desc = self._order
            rader = sorted(rader, key=lambda r: r.get(felt), reverse=desc)
        if self._limit is not None:
            rader = rader[: self._limit]
        return SimpleNamespace(data=[dict(r) for r in rader])


class _Klient:
    def __init__(self):
        self.tabeller: dict[str, list[dict]] = {}
        self.brukte_tabeller: list[str] = []

    def table(self, navn):
        return _Tabell(navn, self.tabeller.setdefault(navn, []), self.brukte_tabeller)


@pytest.fixture
def lager(monkeypatch):
    klient = _Klient()
    monkeypatch.setattr(
        "repositories.supabase_event_repository.create_client",
        lambda url, key: klient,
    )
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: "p-maalskjema")
    repo = SupabaseEventRepository(
        url="https://maalskjema.example.invalid", key="test-key"
    )
    return repo, klient


def _notat(sak_id="SAK-MS-001"):
    return InterntNotatEvent(
        sak_id=sak_id,
        aktor_id=AKTOR_ID,
        aktor_rolle="TE",
        aktor_team_id=TE_TEAM,
        data=InterntNotatData(tekst="Internt", spor="frist"),
    )


# ---------------------------------------------------------------- MS-01


def test_alle_sakstyper_skriver_til_en_tabell(lager):
    """Sakstypen velger ikke lenger tabell.

    Forseringshendelser og endringsordrehendelser lå i hver sin tabell, og en
    lesing uten oppgitt sakstype prøvde alle tre etter tur.
    """
    from models.events import EventType, SakOpprettetEvent

    repo, klient = lager
    for sak_id, sakstype in (
        ("SAK-STD", "standard"),
        ("SAK-FOR", "forsering"),
        ("SAK-EO", "endringsordre"),
    ):
        repo.append(
            SakOpprettetEvent(
                sak_id=sak_id,
                event_type=EventType.SAK_OPPRETTET,
                aktor_id=AKTOR_ID,
                aktor_rolle="TE",
                sakstittel="Sak",
                sakstype=sakstype,
            ),
            expected_version=0,
        )

    assert set(klient.tabeller) == {HENDELSE_TABELL}
    assert set(klient.brukte_tabeller) == {HENDELSE_TABELL}


def test_lesing_treffer_en_tabell_uten_a_prove_seg_fram(lager):
    repo, klient = lager
    repo.append(_notat(), expected_version=0)
    klient.brukte_tabeller.clear()

    hendelser, versjon = repo.get_events("SAK-MS-001")

    assert versjon == 1
    assert klient.brukte_tabeller == [HENDELSE_TABELL]


def test_migrasjonen_gir_hendelse_samme_skranker_som_de_tre_hadde():
    sql = (MIGRASJONER / "20260920193558_hendelse_tabell.sql").read_text(
        encoding="utf-8"
    )
    assert "CONSTRAINT unique_hendelse_sak_versjon UNIQUE (sak_id, versjon)" in sql, (
        "Uten unik-skranken på (sak_id, versjon) finnes ingen optimistisk lås."
    )
    assert "REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE" in sql
    assert "actorrole TEXT NOT NULL CHECK (actorrole IN ('TE', 'BH'))" in sql
    assert "ENABLE ROW LEVEL SECURITY" in sql
    assert "GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER" in sql, (
        "Uten eksplisitt GRANT virker tabellen bare fordi plattformen deler ut "
        "rettigheter ved prosjektoppsett."
    )


# ---------------------------------------------------------------- MS-04


def test_journalen_bærer_identiteten_og_ikke_navnet(lager):
    """Ingen kolonne i raden skal inneholde et personnavn."""
    repo, klient = lager
    repo.append(_notat(), expected_version=0)

    rad = klient.tabeller[HENDELSE_TABELL][0]
    assert rad["actorid"] == AKTOR_ID
    assert "actor" not in rad
    assert AKTOR_NAVN not in str(rad)


def test_aktor_id_overlever_rundturen(lager):
    repo, _klient = lager
    repo.append(_notat(), expected_version=0)

    lagrede, _versjon = repo.get_events("SAK-MS-001")
    parsed = parse_event(lagrede[0])

    assert parsed.aktor_id == AKTOR_ID
    assert parsed.aktor_team_id == TE_TEAM


def test_cloudevents_eksporten_bruker_actorid(lager):
    repo, _klient = lager
    repo.append(_notat(), expected_version=0)

    eksport = repo.get_events_as_cloudevents("SAK-MS-001")

    assert eksport[0]["actorid"] == AKTOR_ID
    assert "actor" not in eksport[0]


def test_hendelse_uten_aktor_id_avvises():
    """Et tomt aktørfelt er ikke en gyldig identitet."""
    with pytest.raises(ValueError):
        InterntNotatEvent(
            sak_id="SAK-MS-002",
            aktor_id="",
            aktor_rolle="TE",
            aktor_team_id=TE_TEAM,
            data=InterntNotatData(tekst="Internt"),
        )


# ---------------------------------------------------------------- MS-10


def test_organisasjon_id_har_ingen_defaultverdi():
    sql = (MIGRASJONER / "20260920192448_organisasjon_id_paa_projects.sql").read_text(
        encoding="utf-8"
    )
    assert "ALTER COLUMN organisasjon_id SET NOT NULL" in sql
    assert "SET DEFAULT" not in sql, (
        "En defaultverdi ville gjort organisasjonstilhørigheten like "
        "uetterprøvbar som prosjekt_id var før 20260920053427."
    )
