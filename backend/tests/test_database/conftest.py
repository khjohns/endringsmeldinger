import os
from graphlib import TopologicalSorter

import pytest

TESTBASE_ENV = "KOE_TESTBASE_URL"
TESTBASE_MERKE = "koe-kastbar-testbase"


def _url_og_driver() -> str:
    """Innsamlingen hopper over `database`-merkede tester når variabelen mangler.
    Er den satt, skal en manglende driver gi rød test, ikke en stille skip."""
    url = os.environ.get(TESTBASE_ENV)
    if not url:
        pytest.skip(f"{TESTBASE_ENV} er ikke satt")
    try:
        import psycopg  # noqa: F401
    except ImportError:
        pytest.fail(
            f"{TESTBASE_ENV} er satt, men psycopg mangler. "
            "Installer backend/requirements.txt."
        )
    return url


@pytest.fixture(scope="session")
def testbase():
    """Lesende tilkobling til basen i KOE_TESTBASE_URL."""
    import psycopg

    url = _url_og_driver()
    with psycopg.connect(
        url, autocommit=True, options="-c default_transaction_read_only=on"
    ) as tilkobling:
        yield tilkobling


def krev_kastbar_testbase(url: str) -> str:
    import psycopg

    with psycopg.connect(url, autocommit=True) as tilkobling:
        (merke,) = tilkobling.execute(
            "SELECT shobj_description(oid, 'pg_database') FROM pg_database"
            " WHERE datname = current_database()"
        ).fetchone()
    if merke != TESTBASE_MERKE:
        pytest.fail(
            f"{TESTBASE_ENV} peker ikke på en kastbar testbase. Skrivbare tester "
            "kjører bare mot en base bygget av scripts/testbase/bygg_testbase.sh."
        )
    return url


@pytest.fixture(scope="session")
def testbase_url() -> str:
    """KOE_TESTBASE_URL, men bare om basen er merket av bygg_testbase.sh."""
    return krev_kastbar_testbase(_url_og_driver())


def testinnstillinger(url: str, **overstyr):
    from pydantic import SecretStr

    from core.config import Settings

    verdier = {
        "database_url": SecretStr(url),
        "database_pool_min": 1,
        "database_pool_max": 4,
        "database_pool_timeout": 5.0,
        "database_retry_backoff_base": 0.0,
    }
    verdier.update(overstyr)
    return Settings(**verdier)


def les_frodata(url: str):
    """Radene i `public` og rekkefølgen tabellene kan tømmes i."""
    import psycopg

    with psycopg.connect(url, autocommit=True) as tilkobling:
        tabeller = [
            navn
            for (navn,) in tilkobling.execute(
                "SELECT oid::regclass::text FROM pg_class"
                " WHERE relnamespace = 'public'::regnamespace"
                " AND relkind IN ('r', 'p') ORDER BY 1"
            )
        ]
        rader = {
            tabell: tilkobling.execute(
                f"SELECT coalesce(array_agg(to_jsonb(t)), '{{}}') FROM {tabell} t"
            ).fetchone()[0]
            for tabell in tabeller
        }
        avhengig = TopologicalSorter()
        for tabell in tabeller:
            avhengig.add(tabell)
        for refererende, referert in tilkobling.execute(
            "SELECT conrelid::regclass::text, confrelid::regclass::text"
            " FROM pg_constraint WHERE contype = 'f'"
            " AND connamespace = 'public'::regnamespace AND conrelid <> confrelid"
        ):
            if referert in rader:
                avhengig.add(referert, refererende)
    return rader, list(avhengig.static_order())


@pytest.fixture(scope="session")
def _frodata(testbase_url):
    """Radene migrasjonene la inn, lest før første skrivbare test.

    Øyeblikksbildet stoler på basen slik den er ved oppstart. En kjøring som
    ble drept midt i en test, kan ha etterlatt rader; bygg basen på nytt da.
    """
    return les_frodata(testbase_url)


def _rydd(url: str, frodata) -> None:
    import psycopg
    from psycopg.types.json import Jsonb

    rader, rekkefolge = frodata
    rader = {t: [Jsonb(r) for r in liste] for t, liste in rader.items()}
    tomme = [t for t in rekkefolge if not rader[t]]
    med_frodata = [t for t in rekkefolge if rader[t]]
    avvik = []
    with psycopg.connect(url) as tilkobling, tilkobling.transaction():
        # Uten triggere: ellers lager en gjeninnsatt rad nye frødata ved siden
        # av de gamle (project_memberships fylles av en trigger på projects).
        tilkobling.execute("SET LOCAL session_replication_role = replica")
        tilkobling.execute(f"TRUNCATE {', '.join(tomme)} RESTART IDENTITY")
        for tabell in med_frodata:
            tilkobling.execute(
                f"DELETE FROM {tabell} t WHERE NOT (to_jsonb(t) = ANY(%s::jsonb[]))",
                (rader[tabell],),
            )
        for tabell in reversed(med_frodata):
            tilkobling.execute(
                f"INSERT INTO {tabell} OVERRIDING SYSTEM VALUE SELECT * FROM"
                f" jsonb_populate_recordset(NULL::{tabell}, to_jsonb(%s::jsonb[]))"
                " ON CONFLICT DO NOTHING",
                (rader[tabell],),
            )
            (antall,) = tilkobling.execute(
                f"SELECT count(*) FROM {tabell} t"
                " WHERE to_jsonb(t) = ANY(%s::jsonb[])",
                (rader[tabell],),
            ).fetchone()
            if antall != len(rader[tabell]):
                avvik.append(tabell)
    if avvik:
        pytest.fail(f"Frødata i {', '.join(avvik)} lot seg ikke gjenopprette")


@pytest.fixture
def skrivbar_base(testbase_url, _frodata):
    """`lib.db.Database` mot testbasen. Skriver med commit, som i produksjon.

    Etter testen, også når den feiler, settes alle tabeller i `public` tilbake
    til det migrasjonene la inn: tabeller som var tomme, tømmes, og frødata som
    er endret eller slettet, legges inn igjen.
    """
    from lib.db import opprett_database

    database = opprett_database(testinnstillinger(testbase_url))
    try:
        yield database
    finally:
        database.lukk()
        _rydd(testbase_url, _frodata)


@pytest.fixture
def container_mot_testbasen(testbase_url, skrivbar_base):
    """Standardcontaineren med DATALAG=postgres og `database` pekt på testbasen.

    Lagrene i POSTGRES_LAGRE får denne databasen. Et lager som ikke er
    konvertert ennå, gir `LagerIkkeKonvertert` når det brukes.
    """
    from core.container import Container, set_container

    container = Container(config=testinnstillinger(testbase_url, datalag="postgres"))
    container._database = skrivbar_base
    set_container(container)
    try:
        yield container
    finally:
        set_container(None)
