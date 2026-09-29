"""Løp a i F0b: journalen og notatene over direkte tilkobling, mot ekte PostgreSQL.

Oppdraget står i docs/prompt-f0b-fase2-repositorier-2026-09-24.md, og hvilke
regler som er prøvd røde, i docs/gjennomforing-f0b-lop-a-2026-09-24.md.
"""

import inspect
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import psycopg
import pytest
from psycopg.types.json import Jsonb

from lib.db import (
    ConcurrencyError,
    ConflictError,
    PermanentError,
    ValidationError,
    opprett_database,
)
from models.events import (
    InterntNotatData,
    InterntNotatEvent,
    SakOpprettetEvent,
    parse_event,
)
from models.notat import Notat
from repositories.event_repository import JournalfoeringAvvist
from repositories.postgres import hendelse as hendelsemodul
from repositories.postgres.hendelse import PostgresEventRepository
from repositories.postgres.notat import PostgresNotatRepository
from tests.test_database.conftest import testinnstillinger

pytestmark = pytest.mark.database

PROSJEKT = "p-lop-a"
ANNET_PROSJEKT = "p-lop-a-annet"
SAK = "SAK-LOP-A-1"
ANNEN_SAK = "SAK-LOP-A-2"
TE_TEAM = "22222222222222222222222222222222"
AKTOR = "5f1c0f2e-2f1a-4a64-9a2e-9f0b1d2c3e4f"
ANNEN_AKTOR = "0b6c1d8e-3f2a-4c5b-8d7e-6a5f4e3d2c1b"


def _sett_inn_saker(url, *saker):
    with psycopg.connect(url) as c, c.transaction():
        for sak_id, prosjekt_id in saker:
            c.execute(
                "INSERT INTO sak_metadata (sak_id, prosjekt_id, created_at, created_by)"
                " VALUES (%s, %s, now(), 'test')",
                (sak_id, prosjekt_id),
            )


@pytest.fixture
def saker(testbase_url, skrivbar_base):
    _sett_inn_saker(testbase_url, (SAK, PROSJEKT), (ANNEN_SAK, PROSJEKT))


@pytest.fixture
def autorisert(monkeypatch):
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: PROSJEKT)


@pytest.fixture
def journal(skrivbar_base, saker, autorisert):
    return PostgresEventRepository(skrivbar_base)


@pytest.fixture
def notater(skrivbar_base, saker):
    return PostgresNotatRepository(skrivbar_base)


def _hendelse(sak_id=SAK, **felter) -> SakOpprettetEvent:
    return SakOpprettetEvent(
        sak_id=sak_id,
        sakstittel=felter.pop("sakstittel", "Endret fundamentering"),
        aktor_id=AKTOR,
        aktor_rolle="TE",
        aktor_team_id=TE_TEAM,
        **felter,
    )


def _rader(url, sql="SELECT sak_id, versjon, prosjekt_id FROM hendelse ORDER BY id"):
    with psycopg.connect(url, autocommit=True) as c:
        return c.execute(sql).fetchall()


# --- Journalen ---------------------------------------------------------------


def test_rundturen_bevarer_serverens_stempler(journal, testbase_url):
    skrevet = _hendelse(kommentar="Før byggemøtet", catenda_topic_id="topic-1")

    assert journal.append(skrevet, expected_version=0) == 1
    hendelser, versjon = journal.get_events(SAK)

    assert versjon == 1
    (rad,) = hendelser
    assert rad["event_id"] == skrevet.event_id
    assert rad["aktor_id"] == AKTOR
    assert rad["aktor_rolle"] == "TE"
    assert rad["aktor_team_id"] == TE_TEAM
    assert rad["kommentar"] == "Før byggemøtet"
    assert rad["event_type"] == "sak_opprettet"
    assert rad["data"]["catenda_topic_id"] == "topic-1"
    assert rad["tidsstempel"].endswith("+00:00")
    assert datetime.fromisoformat(rad["tidsstempel"]) == skrevet.tidsstempel
    lest = parse_event(rad)
    assert lest.event_id == skrevet.event_id
    assert lest.aktor_team_id == TE_TEAM
    assert _rader(testbase_url) == [(SAK, 1, PROSJEKT)]


def test_ukjent_sak_har_versjon_null(journal):
    assert journal.get_events("SAK-FINNES-IKKE") == ([], 0)
    assert journal.gjeldende_versjon("SAK-FINNES-IKKE") == 0


def test_batch_gir_fortlopende_versjoner(journal):
    assert journal.append_batch([_hendelse(), _hendelse()], expected_version=0) == 2
    assert journal.append(_hendelse(), expected_version=2) == 3

    hendelser, versjon = journal.get_events(SAK)
    assert versjon == 3
    assert journal.gjeldende_versjon(SAK) == 3
    assert len(hendelser) == 3


def test_feil_midt_i_batchen_etterlater_ingenting(journal, testbase_url):
    """Andre rad bryter event_id-skranken etter at første er sendt."""
    forste = _hendelse()
    duplikat = _hendelse()
    duplikat.event_id = forste.event_id

    with pytest.raises(ConflictError) as feil:
        journal.append_batch([forste, duplikat], expected_version=0)

    assert not isinstance(feil.value, ConcurrencyError)
    assert _rader(testbase_url) == []


@pytest.mark.parametrize("forventet", [0, 1, 3])
def test_feil_forventet_versjon_gir_konflikt(journal, testbase_url, forventet):
    """Også en forventet versjon *over* den faktiske: ellers blir det hull."""
    journal.append_batch([_hendelse(), _hendelse()], expected_version=0)

    with pytest.raises(ConcurrencyError) as feil:
        journal.append(_hendelse(), expected_version=forventet)

    assert (feil.value.expected, feil.value.actual) == (forventet, 2)
    assert len(_rader(testbase_url)) == 2


def _vent_paa_laaste(url, antall, frist=10.0):
    slutt = time.monotonic() + frist
    with psycopg.connect(url, autocommit=True) as c:
        while time.monotonic() < slutt:
            (ventende,) = c.execute(
                "SELECT count(*) FROM pg_locks"
                " WHERE relation = 'public.hendelse'::regclass AND NOT granted"
            ).fetchone()
            if ventende == antall:
                return
            time.sleep(0.02)
    pytest.fail(f"{antall} skrivinger kom aldri til låsen")


def _samtidig(testbase_url, skriv):
    """To skrivinger fra hver sin pool, sluppet løs samtidig.

    En tabellås holder begge igjen etter at de har lest versjonen og før de
    setter inn. Når låsen slippes, har begge sett samme versjon.
    """
    baser = [opprett_database(testinnstillinger(testbase_url)) for _ in range(2)]
    pool = ThreadPoolExecutor(2)
    try:
        with psycopg.connect(testbase_url) as laas:
            with laas.transaction():
                laas.execute("LOCK TABLE hendelse IN SHARE ROW EXCLUSIVE MODE")
                fremtider = [
                    pool.submit(skriv, PostgresEventRepository(db)) for db in baser
                ]
                _vent_paa_laaste(testbase_url, 2)
        utfall = []
        for fremtid in fremtider:
            try:
                utfall.append(fremtid.result(timeout=10))
            except Exception as feil:
                utfall.append(feil)
        return utfall
    finally:
        pool.shutdown(wait=True)
        for db in baser:
            db.lukk()


def test_samtidig_opprettelse_gir_en_commit_og_en_konflikt(journal, testbase_url):
    """TST-02 og KR-15 gjaldt JSON-lageret. Samme egenskap her."""
    utfall = _samtidig(
        testbase_url, lambda lager: lager.append(_hendelse(), expected_version=0)
    )

    konflikter = [u for u in utfall if isinstance(u, ConcurrencyError)]
    assert sorted(u for u in utfall if isinstance(u, int)) == [1], utfall
    assert len(konflikter) == 1, utfall
    assert (konflikter[0].expected, konflikter[0].actual) == (0, 1)
    assert _rader(testbase_url) == [(SAK, 1, PROSJEKT)]


def test_samtidig_batch_mot_samme_versjon_gir_en_commit(journal, testbase_url):
    journal.append(_hendelse(), expected_version=0)

    utfall = _samtidig(
        testbase_url,
        lambda lager: lager.append_batch([_hendelse(), _hendelse()], 1),
    )

    assert sorted(u for u in utfall if isinstance(u, int)) == [3], utfall
    assert len([u for u in utfall if isinstance(u, ConcurrencyError)]) == 1, utfall
    assert [v for _, v, _ in _rader(testbase_url)] == [1, 2, 3]


def test_internt_notat_journalfores_ikke(journal, testbase_url):
    notat = InterntNotatEvent(
        sak_id=SAK,
        aktor_id=AKTOR,
        aktor_rolle="TE",
        aktor_team_id=TE_TEAM,
        data=InterntNotatData(tekst="Internt", spor="frist"),
    )

    with pytest.raises(JournalfoeringAvvist) as feil:
        journal.append_batch([_hendelse(), notat], expected_version=0)

    assert isinstance(feil.value, PermanentError)
    assert _rader(testbase_url) == []


def test_skriving_uten_autorisert_prosjekt_avvises(journal, testbase_url, monkeypatch):
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: None)

    with pytest.raises(PermanentError, match="uten autorisert prosjekt"):
        journal.append(_hendelse(), expected_version=0)

    assert _rader(testbase_url) == []


def test_lesing_ser_bare_det_autoriserte_prosjektet(journal, monkeypatch):
    journal.append(_hendelse(catenda_topic_id="topic-a"), expected_version=0)
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: ANNET_PROSJEKT)

    assert journal.get_events(SAK) == ([], 0)
    assert journal.gjeldende_versjon(SAK) == 0
    assert journal.get_all_sak_ids() == []
    assert journal.find_sak_id_by_catenda_topic("topic-a") is None


@pytest.mark.parametrize(
    "les",
    [
        lambda j: j.get_events(SAK),
        lambda j: j.gjeldende_versjon(SAK),
        lambda j: j.get_all_sak_ids(),
        lambda j: j.find_sak_id_by_catenda_topic("topic-a"),
    ],
    ids=["get_events", "gjeldende_versjon", "get_all_sak_ids", "topic"],
)
def test_lesing_uten_autorisert_prosjekt_avvises(journal, monkeypatch, les):
    journal.append(_hendelse(catenda_topic_id="topic-a"), expected_version=0)
    monkeypatch.setattr("lib.project_context.get_project_id", lambda: None)

    with pytest.raises(PermanentError, match="uten autorisert prosjekt"):
        les(journal)


@pytest.mark.parametrize("sak_id", ["SAK-LOP-A-3", "SAK-UTEN-METADATA"])
def test_skriving_til_sak_utenfor_prosjektet_avvises(journal, testbase_url, sak_id):
    """Samme svar for en sak i et annet prosjekt og en sak som ikke finnes."""
    _sett_inn_saker(testbase_url, ("SAK-LOP-A-3", ANNET_PROSJEKT))

    with pytest.raises(PermanentError, match="finnes ikke i det autoriserte") as feil:
        journal.append(_hendelse(sak_id), expected_version=0)

    assert not isinstance(feil.value, ConflictError)
    assert _rader(testbase_url) == []


def test_journalen_har_ingen_vei_til_endring_eller_sletting():
    offentlige = {
        navn
        for navn, _ in inspect.getmembers(PostgresEventRepository, inspect.isfunction)
        if not navn.startswith("_")
    }
    assert offentlige == {
        "append",
        "append_batch",
        "get_events",
        "gjeldende_versjon",
        "get_all_sak_ids",
        "find_sak_id_by_catenda_topic",
    }
    kilde = inspect.getsource(hendelsemodul).upper()
    assert "UPDATE" not in kilde and "DELETE" not in kilde


def test_alle_sak_ids_teller_saker_ikke_hendelser(journal):
    journal.append_batch([_hendelse(), _hendelse()], expected_version=0)
    journal.append(_hendelse(ANNEN_SAK), expected_version=0)

    assert sorted(journal.get_all_sak_ids()) == [SAK, ANNEN_SAK]


def test_topic_slaas_opp_bare_paa_sak_opprettet(journal, testbase_url):
    journal.append(_hendelse(catenda_topic_id="topic-a"), expected_version=0)
    with psycopg.connect(testbase_url) as c, c.transaction():
        c.execute(
            "INSERT INTO hendelse (event_id, source, type, subject, actorid,"
            " actorrole, data, sak_id, event_type, versjon, prosjekt_id)"
            " VALUES (%s, 's', 't', %s, %s, 'TE', %s, %s, 'annen_type', 1, %s)",
            (
                str(uuid.uuid4()),
                ANNEN_SAK,
                AKTOR,
                Jsonb({"catenda_topic_id": "topic-b"}),
                ANNEN_SAK,
                PROSJEKT,
            ),
        )

    assert journal.find_sak_id_by_catenda_topic("topic-a") == SAK
    assert journal.find_sak_id_by_catenda_topic("topic-b") is None
    assert journal.find_sak_id_by_catenda_topic("") is None


# --- Notatene ----------------------------------------------------------------


def _notat(sak_id=SAK, prosjekt_id=PROSJEKT, aktor_id=AKTOR, **felter) -> Notat:
    return Notat(
        sak_id=sak_id,
        prosjekt_id=prosjekt_id,
        aktor_id=aktor_id,
        aktor_rolle="TE",
        aktor_team_id=TE_TEAM,
        tekst=felter.pop("tekst", "Internt: vi venter med fristkravet."),
        spor="frist",
        **felter,
    )


def test_notatet_kommer_tilbake_som_det_ble_lagret(notater):
    skrevet = _notat(kommentar="k", refererer_til_event_id=str(uuid.uuid4()))

    assert notater.lagre(skrevet) == skrevet
    (lest,) = notater.for_sak(SAK, PROSJEKT)

    assert lest == skrevet
    hendelse = lest.til_hendelse()
    assert hendelse.aktor_team_id == TE_TEAM
    assert hendelse.data.tekst == skrevet.tekst


def test_notatene_er_avgrenset_til_sak_og_prosjekt(notater, testbase_url):
    _sett_inn_saker(testbase_url, ("SAK-LOP-A-3", ANNET_PROSJEKT))
    notater.lagre(_notat())
    notater.lagre(_notat(sak_id=ANNEN_SAK))
    notater.lagre(_notat(sak_id="SAK-LOP-A-3", prosjekt_id=ANNET_PROSJEKT))

    assert [n.sak_id for n in notater.for_sak(SAK, PROSJEKT)] == [SAK]
    assert notater.for_sak(SAK, ANNET_PROSJEKT) == []
    assert notater.for_sak("SAK-LOP-A-3", PROSJEKT) == []
    assert notater.for_sak(SAK, None) == []


def test_notatene_kommer_i_tidsrekkefolge(notater):
    naa = datetime.now(UTC)
    senere = _notat(tekst="senere", opprettet=naa)
    tidligere = _notat(tekst="tidligere", opprettet=naa - timedelta(minutes=5))
    notater.lagre(senere)
    notater.lagre(tidligere)

    assert [n.tekst for n in notater.for_sak(SAK, PROSJEKT)] == [
        "tidligere",
        "senere",
    ]


def test_notatet_flytter_ikke_sakens_versjon(skrivbar_base, notater, autorisert):
    journal = PostgresEventRepository(skrivbar_base)
    journal.append(_hendelse(), expected_version=0)

    notater.lagre(_notat())

    assert journal.gjeldende_versjon(SAK) == 1
    assert len(journal.get_events(SAK)[0]) == 1


def test_notat_uten_team_avvises_av_basen(notater, testbase_url):
    """Modellen slipper det ikke gjennom; basen er skranken bak."""
    for team in (None, ""):
        uten_team = _notat().model_copy(update={"aktor_team_id": team})
        with pytest.raises(ValidationError):
            notater.lagre(uten_team)

    assert _rader(testbase_url, "SELECT notat_id FROM notat") == []


def test_forfatteren_sletter_eget_notat(notater):
    notat = notater.lagre(_notat())

    assert notater.slett(SAK, notat.notat_id.upper(), PROSJEKT, AKTOR) is True
    assert notater.for_sak(SAK, PROSJEKT) == []
    assert notater.slett(SAK, notat.notat_id, PROSJEKT, AKTOR) is False


@pytest.mark.parametrize(
    "sak_id, prosjekt_id, aktor_id",
    [
        (ANNEN_SAK, PROSJEKT, AKTOR),
        (SAK, ANNET_PROSJEKT, AKTOR),
        (SAK, None, AKTOR),
        (SAK, PROSJEKT, ANNEN_AKTOR),
    ],
    ids=["annen-sak", "annet-prosjekt", "uten-prosjekt", "annen-forfatter"],
)
def test_sletting_utenfor_grensene_gjor_ingenting(notater, sak_id, prosjekt_id, aktor_id):
    notat = notater.lagre(_notat())

    assert notater.slett(sak_id, notat.notat_id, prosjekt_id, aktor_id) is False
    assert [n.notat_id for n in notater.for_sak(SAK, PROSJEKT)] == [notat.notat_id]


def test_ugyldig_notat_id_er_ikke_funnet(notater):
    assert notater.slett(SAK, "ikke-en-uuid", PROSJEKT, AKTOR) is False


# --- Containeren og skriptene ------------------------------------------------


def test_containeren_gir_lagrene_over_samme_database(container_mot_testbasen):
    container = container_mot_testbasen
    assert isinstance(container.event_repository, PostgresEventRepository)
    assert isinstance(container.notat_repository, PostgresNotatRepository)
    assert container.event_repository._db is container.database
    assert container.notat_repository._db is container.database



def test_rapportcachen_fylles_for_saker_i_hvert_prosjekt(
    container_mot_testbasen, testbase_url, monkeypatch
):
    """Skriptet har ingen forespørsel og leser hver sak under sitt eget prosjekt.

    Saksmetadataene er en dobbel: det lageret er løp b sitt.
    """
    from lib import project_context
    from scripts.backfill_reporting_cache import backfill_reporting_cache

    ekte = project_context.get_project_id
    _sett_inn_saker(testbase_url, (SAK, PROSJEKT), ("SAK-LOP-A-3", ANNET_PROSJEKT))
    journal = container_mot_testbasen.event_repository
    for sak_id, prosjekt_id in ((SAK, PROSJEKT), ("SAK-LOP-A-3", ANNET_PROSJEKT)):
        monkeypatch.setattr(project_context, "get_project_id", lambda p=prosjekt_id: p)
        journal.append(_hendelse(sak_id), expected_version=0)
    monkeypatch.setattr(project_context, "get_project_id", ekte)

    oppdatert = []

    class Metadata:
        def list_all(self, alle_prosjekter=False):
            assert alle_prosjekter
            return [
                SimpleNamespace(sak_id=SAK, prosjekt_id=PROSJEKT, sakstype="standard"),
                SimpleNamespace(
                    sak_id="SAK-LOP-A-3", prosjekt_id=ANNET_PROSJEKT, sakstype="standard"
                ),
            ]

        def update_cache(self, sak_id, **verdier):
            oppdatert.append(sak_id)

    container_mot_testbasen._metadata_repo = Metadata()

    backfill_reporting_cache()

    assert oppdatert == [SAK, "SAK-LOP-A-3"]
