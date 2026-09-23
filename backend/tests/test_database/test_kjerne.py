"""Kjernen i datalaget over direkte tilkobling (F0b, punkt 1).

Kontrakten og mutasjonene som gjør hver test rød, står i
docs/gjennomforing-f0b-kjernen-2026-09-23.md. Testene kobler til som en
innloggingsrolle uten superbruker, og bytter til en kastbar rolle slik runtime
skal bytte til `koe_runtime` i F1.
"""

import json
import secrets
import threading
import uuid
from types import SimpleNamespace

import psycopg
import pytest
from psycopg import IsolationLevel, sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo
from psycopg.pq import TransactionStatus
from pydantic import SecretStr

from core.config import Settings
from core.container import Container
from lib.db import (
    KONTEKSTVARIABEL,
    ConcurrencyError,
    ConflictError,
    DatabaseIkkeKonfigurert,
    Kontekst,
    PermanentError,
    SerialiseringsFeil,
    TilgangAvvist,
    TransientError,
    UkjentUtfall,
    ValidationError,
    opprett_database,
)
from lib.db import database as database_modul
from tests.test_database.conftest import testinnstillinger

pytestmark = pytest.mark.database

AKTOR = "00000000-0000-4000-8000-0000000000a1"
TEAM = "ba0000000000400080000000000000a1"


@pytest.fixture(scope="module")
def miljo(testbase_url):
    suffiks = uuid.uuid4().hex[:8]
    m = SimpleNamespace(
        login=f"koe_kjernetest_login_{suffiks}",
        rolle=f"koe_kjernetest_rolle_{suffiks}",
        skjema=f"koe_kjernetest_{suffiks}",
        admin=testbase_url,
    )
    passord = secrets.token_hex(16)
    i = sql.Identifier
    with psycopg.connect(testbase_url, autocommit=True) as c:
        c.execute(sql.SQL("CREATE ROLE {} NOLOGIN NOINHERIT").format(i(m.rolle)))
        c.execute(
            sql.SQL("CREATE ROLE {} LOGIN NOINHERIT PASSWORD {}").format(
                i(m.login), sql.Literal(passord)
            )
        )
        c.execute(
            sql.SQL("GRANT {} TO {} WITH INHERIT FALSE, SET TRUE").format(
                i(m.rolle), i(m.login)
            )
        )
        c.execute(sql.SQL("CREATE SCHEMA {}").format(i(m.skjema)))
        c.execute(sql.SQL("SET search_path = {}").format(i(m.skjema)))
        c.execute(
            "CREATE TABLE rad (id INT PRIMARY KEY,"
            " verdi TEXT NOT NULL CHECK (verdi <> 'ugyldig'), n INT NOT NULL DEFAULT 0)"
        )
        c.execute("CREATE TABLE brudd (id INT)")
        c.execute(
            "CREATE FUNCTION avbryt() RETURNS trigger LANGUAGE plpgsql AS $$"
            " BEGIN PERFORM pg_terminate_backend(pg_backend_pid());"
            " PERFORM pg_sleep(5); RETURN NULL; END $$"
        )
        c.execute(
            "CREATE CONSTRAINT TRIGGER avbryt_ved_commit AFTER INSERT ON brudd"
            " DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION avbryt()"
        )
        c.execute(
            sql.SQL("GRANT USAGE ON SCHEMA {} TO {}, {}").format(
                i(m.skjema), i(m.login), i(m.rolle)
            )
        )
        c.execute(
            sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA {} TO {}").format(
                i(m.skjema), i(m.login)
            )
        )
        c.execute(sql.SQL("GRANT SELECT ON rad TO {}").format(i(m.rolle)))
        c.execute(
            sql.SQL("ALTER ROLE {} SET search_path = {}").format(i(m.login), i(m.skjema))
        )
    parametre = conninfo_to_dict(testbase_url)
    parametre.update(user=m.login, password=passord)
    m.url = make_conninfo(**parametre)
    m.passord = passord
    yield m
    with psycopg.connect(testbase_url, autocommit=True) as c:
        c.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = %s",
            (m.login,),
        )
        c.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(i(m.skjema)))
        c.execute(sql.SQL("DROP ROLE {}").format(i(m.login)))
        c.execute(sql.SQL("DROP ROLE {}").format(i(m.rolle)))


@pytest.fixture
def db(miljo):
    with psycopg.connect(miljo.admin, autocommit=True) as c:
        c.execute(sql.SQL("TRUNCATE {}.rad, {}.brudd").format(
            sql.Identifier(miljo.skjema), sql.Identifier(miljo.skjema)))
    database = opprett_database(
        testinnstillinger(miljo.url, database_pool_min=1, database_pool_max=1)
    )
    yield database
    database.lukk()


def uavhengig(miljo, sporring, param=()):
    with psycopg.connect(miljo.admin, autocommit=True) as c:
        c.execute(sql.SQL("SET search_path = {}").format(sql.Identifier(miljo.skjema)))
        return c.execute(sporring, param).fetchall()


def full_kontekst(miljo):
    return Kontekst(
        rolle=miljo.rolle, aktor=AKTOR, prosjekt="prosjekt-a", side="BH", team=TEAM
    )


def sesjonen(db):
    """Tilstanden på forbindelsen poolen gir ut neste gang, utenfor kjernen."""
    with db._pool.connection() as conn:
        return conn.execute(
            "SELECT current_user, current_setting(%s, true), pg_backend_pid()",
            (KONTEKSTVARIABEL,),
        ).fetchone()


INNE = "SELECT current_user, current_setting('koe.krav', true), pg_backend_pid()"


# 1. Ingen lekkasje på gjenbrukt forbindelse ---------------------------------------


class Avbrudd(Exception):
    pass


def _commit(conn):
    pass


def _unntak(conn):
    raise Avbrudd


def _feil_i_basen(conn):
    conn.execute("SELECT 1 / 0")


@pytest.mark.parametrize(
    "avslutning, forventet",
    [(_commit, None), (_unntak, Avbrudd), (_feil_i_basen, ValidationError)],
    ids=["commit", "rollback", "feil-i-basen"],
)
def test_kontekst_lekker_ikke_til_neste_transaksjon(db, miljo, avslutning, forventet):
    k = full_kontekst(miljo)
    _, _, pid = sesjonen(db)

    def kjor():
        with db.transaksjon(k) as conn:
            rolle, krav, inne_pid = conn.execute(INNE).fetchone()
            assert (rolle, inne_pid) == (miljo.rolle, pid)
            assert json.loads(krav) == {
                "koe_aktor": AKTOR,
                "koe_prosjekt": "prosjekt-a",
                "koe_side": "BH",
                "koe_team": TEAM,
            }
            avslutning(conn)

    if forventet is None:
        kjor()
    else:
        with pytest.raises(forventet):
            kjor()

    assert sesjonen(db) == (miljo.login, "", pid)
    with db.transaksjon(Kontekst()) as conn:
        assert conn.execute(INNE).fetchone() == (miljo.login, "", pid)


def test_to_trader_mot_samme_pool_ser_hver_sin_kontekst(miljo):
    database = opprett_database(
        testinnstillinger(miljo.url, database_pool_min=2, database_pool_max=2)
    )
    begge_inne = threading.Barrier(2, timeout=5)
    sett = {}

    def trad(prosjekt):
        with database.transaksjon(Kontekst(rolle=miljo.rolle, prosjekt=prosjekt)) as c:
            begge_inne.wait()
            sett[prosjekt] = json.loads(c.execute(INNE).fetchone()[1])["koe_prosjekt"]
            begge_inne.wait()

    trader = [threading.Thread(target=trad, args=(p,)) for p in ("a", "b")]
    try:
        for t in trader:
            t.start()
        for t in trader:
            t.join(10)
    finally:
        database.lukk()
    assert sett == {"a": "a", "b": "b"}


def test_kontekst_satt_paa_sesjonsniva_kastes_med_forbindelsen(db, miljo, caplog):
    """Poolens reset er det andre laget: en forbindelse der noe har overlevd
    transaksjonen, gis ikke ut igjen."""
    _, _, pid = sesjonen(db)
    with db.transaksjon(Kontekst()) as conn:
        conn.execute("SELECT set_config(%s, 'lekket', false)", (KONTEKSTVARIABEL,))
        conn.execute(sql.SQL("SET ROLE {}").format(sql.Identifier(miljo.rolle)))

    rolle, krav, ny_pid = sesjonen(db)
    assert (rolle, krav or "") == (miljo.login, "")
    assert ny_pid != pid
    assert "kontekst på sesjonsnivå" in caplog.text


def test_tom_kontekst_overstyrer_det_sesjonen_har(miljo):
    """Det første laget virker også uten poolens reset, for eksempel når en
    mellomliggende pooler gir en forbindelse med en annens sesjonstilstand."""
    with psycopg.connect(miljo.url, autocommit=True) as conn:
        conn.execute(sql.SQL("SET ROLE {}").format(sql.Identifier(miljo.rolle)))
        conn.execute("SELECT set_config(%s, 'lekket', false)", (KONTEKSTVARIABEL,))
        with conn.transaction():
            database_modul._sett_kontekst(conn, Kontekst())
            assert conn.execute(INNE).fetchone()[:2] == (miljo.login, "")


# 2. Kontekst settes bare inne i en transaksjon -------------------------------------


def test_kontekst_kan_ikke_settes_utenfor_transaksjon(miljo):
    with psycopg.connect(miljo.url, autocommit=True) as conn:
        with pytest.raises(RuntimeError, match="åpen transaksjon"):
            database_modul._sett_kontekst(conn, full_kontekst(miljo))
        assert conn.execute(INNE).fetchone()[:2] == (miljo.login, None)


def test_hjelperen_aapner_transaksjonen_selv(db, miljo):
    with db.transaksjon(full_kontekst(miljo)) as conn:
        assert conn.info.transaction_status == TransactionStatus.INTRANS
        assert conn.execute("SELECT now() = statement_timestamp()").fetchone() == (
            False,
        )
        assert conn.execute(INNE).fetchone()[0] == miljo.rolle


def test_commit_inne_i_blokken_er_forbudt(db, miljo):
    with pytest.raises(PermanentError) as feil, db.transaksjon(Kontekst()) as conn:
        conn.execute("INSERT INTO rad (id, verdi) VALUES (1, 'x')")
        conn.commit()
    assert isinstance(feil.value.original, psycopg.ProgrammingError)
    assert uavhengig(miljo, "SELECT count(*) FROM rad") == [(0,)]


def test_transaksjon_som_er_avsluttet_i_blokken_avvises(db):
    with pytest.raises(RuntimeError, match="avsluttet"), db.transaksjon(
        Kontekst()
    ) as conn:
        conn.execute("COMMIT")


def test_transaksjoner_kan_ikke_nostes_i_samme_trad(db):
    with db.transaksjon(Kontekst()), pytest.raises(RuntimeError, match="allerede"):
        with db.transaksjon(Kontekst()):
            pass


def test_transaksjon_krever_kontekst(db):
    with pytest.raises(TypeError), db.transaksjon(None):
        pass


# 3. Delvis skriving finnes ikke ----------------------------------------------------


def test_to_skrivinger_committes_sammen(db, miljo):
    with db.transaksjon(Kontekst()) as conn:
        conn.execute("INSERT INTO rad (id, verdi) VALUES (1, 'a'), (2, 'b')")
    assert uavhengig(miljo, "SELECT count(*) FROM rad") == [(2,)]


@pytest.mark.parametrize("feil", ["python", "basen"])
def test_feil_etter_forste_skriving_etterlater_ingenting(db, miljo, feil):
    with pytest.raises((Avbrudd, ConflictError)), db.transaksjon(Kontekst()) as conn:
        conn.execute("INSERT INTO rad (id, verdi) VALUES (1, 'a')")
        assert uavhengig(miljo, "SELECT count(*) FROM rad") == [(0,)]
        if feil == "python":
            raise Avbrudd
        conn.execute("INSERT INTO rad (id, verdi) VALUES (1, 'b')")
    assert uavhengig(miljo, "SELECT count(*) FROM rad") == [(0,)]


# 4. Feilklassifisering med ekte SQLSTATE -------------------------------------------


def _parallell_oppdatering(db, miljo, isolasjon):
    uavhengig(miljo, "INSERT INTO rad (id, verdi) VALUES (1, 'a') RETURNING id")
    with db.transaksjon(Kontekst(), isolasjon=isolasjon) as conn:
        conn.execute("SELECT n FROM rad WHERE id = 1").fetchone()
        uavhengig(miljo, "UPDATE rad SET n = n + 1 WHERE id = 1 RETURNING n")
        conn.execute("UPDATE rad SET n = n + 10 WHERE id = 1")


def test_40001_er_serialiseringsfeil(db, miljo):
    with pytest.raises(SerialiseringsFeil) as feil:
        _parallell_oppdatering(db, miljo, IsolationLevel.REPEATABLE_READ)
    assert feil.value.original.sqlstate == "40001"
    assert isinstance(feil.value, TransientError)


def test_40P01_er_serialiseringsfeil(db, miljo):
    uavhengig(miljo, "INSERT INTO rad (id, verdi) VALUES (1, 'a'), (2, 'b') RETURNING id")
    database = opprett_database(
        testinnstillinger(miljo.url, database_pool_min=2, database_pool_max=2)
    )
    forste_laas = threading.Barrier(2, timeout=10)
    utfall = {}

    def trad(forst, sist):
        try:
            with database.transaksjon(Kontekst()) as conn:
                conn.execute("UPDATE rad SET n = 1 WHERE id = %s", (forst,))
                forste_laas.wait()
                conn.execute("UPDATE rad SET n = 1 WHERE id = %s", (sist,))
            utfall[forst] = "ok"
        except Exception as e:
            utfall[forst] = e

    trader = [threading.Thread(target=trad, args=a) for a in ((1, 2), (2, 1))]
    try:
        for t in trader:
            t.start()
        for t in trader:
            t.join(15)
    finally:
        database.lukk()
    feil = [u for u in utfall.values() if u != "ok"]
    assert len(feil) == 1, utfall
    assert isinstance(feil[0], SerialiseringsFeil)
    assert feil[0].original.sqlstate == "40P01"


def _versjonskonflikt(conn):
    conn.execute(
        "DO $$ BEGIN RAISE EXCEPTION 'versjonskonflikt' USING ERRCODE = 'KO409',"
        ' DETAIL = \'{"forventet": 1, "faktisk": 2}\'; END $$'
    )


def test_versjonskonflikt_er_concurrency_error(db):
    with pytest.raises(ConcurrencyError) as feil, db.transaksjon(Kontekst()) as conn:
        _versjonskonflikt(conn)
    assert (feil.value.expected, feil.value.actual) == (1, 2)
    assert isinstance(feil.value, ConflictError)
    assert isinstance(feil.value, PermanentError)
    assert not isinstance(feil.value, TransientError)


def test_versjonskonflikt_uten_detalj_har_ukjente_versjoner(db):
    with pytest.raises(ConcurrencyError) as feil, db.transaksjon(Kontekst()) as conn:
        conn.execute("DO $$ BEGIN RAISE EXCEPTION 'x' USING ERRCODE = 'KO409'; END $$")
    assert (feil.value.expected, feil.value.actual) == (None, None)


@pytest.mark.parametrize(
    "sporring, sqlstate, klasse",
    [
        ("INSERT INTO rad (id, verdi) VALUES (1, 'a'), (1, 'b')", "23505", ConflictError),
        ("INSERT INTO rad (id, verdi) VALUES (1, 'ugyldig')", "23514", ValidationError),
        ("INSERT INTO rad (id, verdi) VALUES (1, NULL)", "23502", ValidationError),
        ("SELECT 'x'::uuid", "22P02", ValidationError),
        ("SELECT 1 / 0", "22012", ValidationError),
        ("SELECT * FROM finnes_ikke", "42P01", PermanentError),
        ("SELEKT 1", "42601", PermanentError),
    ],
)
def test_avvisninger_er_permanente(db, sporring, sqlstate, klasse):
    with pytest.raises(klasse) as feil, db.transaksjon(Kontekst()) as conn:
        conn.execute(sporring)
    assert feil.value.code == sqlstate
    assert isinstance(feil.value, PermanentError)
    assert not isinstance(feil.value, TransientError)


def test_manglende_rettighet_er_tilgang_avvist(db, miljo):
    with pytest.raises(TilgangAvvist) as feil, db.transaksjon(
        Kontekst(rolle=miljo.rolle)
    ) as conn:
        conn.execute("INSERT INTO rad (id, verdi) VALUES (1, 'a')")
    assert feil.value.code == "42501"
    assert isinstance(feil.value, PermanentError)


def test_tidsavbrudd_er_forbigaaende(db):
    with pytest.raises(TransientError) as feil, db.transaksjon(Kontekst()) as conn:
        conn.execute("SET LOCAL statement_timeout = '50ms'")
        conn.execute("SELECT pg_sleep(2)")
    assert feil.value.original.sqlstate == "57014"


def test_tapt_forbindelse_for_commit_er_forbigaaende(db, miljo):
    with pytest.raises(TransientError) as feil, db.transaksjon(Kontekst()) as conn:
        conn.execute("INSERT INTO rad (id, verdi) VALUES (1, 'a')")
        uavhengig(
            miljo,
            "SELECT pg_terminate_backend(%s)",
            (conn.execute("SELECT pg_backend_pid()").fetchone()[0],),
        )
        conn.execute("SELECT 1")
    assert not isinstance(feil.value, UkjentUtfall)
    assert uavhengig(miljo, "SELECT count(*) FROM rad") == [(0,)]
    assert sesjonen(db)[0] == miljo.login


def test_tapt_forbindelse_under_commit_gir_ukjent_utfall(db, miljo):
    with pytest.raises(UkjentUtfall) as feil, db.transaksjon(Kontekst()) as conn:
        conn.execute("INSERT INTO brudd VALUES (1)")
    assert not isinstance(feil.value, (TransientError, PermanentError))
    assert uavhengig(miljo, "SELECT count(*) FROM brudd") == [(0,)]


def test_unntak_fra_koden_gaar_gjennom_uendret(db):
    class Egen(Exception):
        pass

    with pytest.raises(Egen), db.transaksjon(Kontekst()):
        raise Egen


def test_feilmeldingen_gjengir_ikke_verdier(db):
    hemmelig = "hemmelig-" + secrets.token_hex(4)
    with pytest.raises(ConflictError) as feil, db.transaksjon(Kontekst()) as conn:
        conn.execute(
            "CREATE TEMP TABLE t (v TEXT UNIQUE)",
        )
        conn.execute("INSERT INTO t VALUES (%s), (%s)", (hemmelig, hemmelig))
    assert hemmelig in str(feil.value.original)
    assert hemmelig not in str(feil.value)
    assert feil.value.__cause__ is None and feil.value.__suppress_context__


# 5. Retry gjelder hele transaksjonen -----------------------------------------------


def test_40001_kjorer_hele_transaksjonen_paa_nytt(db, miljo):
    uavhengig(miljo, "INSERT INTO rad (id, verdi) VALUES (1, 'a') RETURNING id")
    kall = []

    def arbeid(conn):
        kall.append(1)
        conn.execute("SELECT n FROM rad WHERE id = 1").fetchone()
        if len(kall) == 1:
            uavhengig(miljo, "UPDATE rad SET n = n + 1 WHERE id = 1 RETURNING n")
        conn.execute("UPDATE rad SET n = n + 10 WHERE id = 1")
        return len(kall)

    assert db.utfor(Kontekst(), arbeid, isolasjon=IsolationLevel.REPEATABLE_READ) == 2
    assert uavhengig(miljo, "SELECT n FROM rad WHERE id = 1") == [(11,)]


def test_serialiseringsfeil_gir_opp_etter_siste_forsok(db):
    kall = []

    def arbeid(conn):
        kall.append(1)
        conn.execute("DO $$ BEGIN RAISE EXCEPTION 'x' USING ERRCODE = '40001'; END $$")

    with pytest.raises(SerialiseringsFeil):
        db.utfor(Kontekst(), arbeid)
    assert len(kall) == Settings().database_retry_max_forsok


def test_versjonskonflikt_kjores_ikke_paa_nytt(db):
    kall = []

    def arbeid(conn):
        kall.append(1)
        _versjonskonflikt(conn)

    with pytest.raises(ConcurrencyError):
        db.utfor(Kontekst(), arbeid)
    assert kall == [1]


def test_ukjent_utfall_kjores_ikke_paa_nytt(db, miljo):
    kall = []

    def arbeid(conn):
        kall.append(1)
        conn.execute("INSERT INTO brudd VALUES (1)")

    with pytest.raises(UkjentUtfall):
        db.utfor(Kontekst(), arbeid)
    assert kall == [1]


def test_forbigaaende_feil_utenom_serialisering_kjores_ikke_paa_nytt(db):
    kall = []

    def arbeid(conn):
        kall.append(1)
        conn.execute("SET LOCAL statement_timeout = '50ms'")
        conn.execute("SELECT pg_sleep(2)")

    with pytest.raises(TransientError):
        db.utfor(Kontekst(), arbeid)
    assert kall == [1]


# 6. Ingen DATABASE_URL -------------------------------------------------------------


@pytest.fixture
def libpq_peker_paa_testbasen(monkeypatch, testbase_url):
    """Uten DATABASE_URL ville libpq ellers funnet basen gjennom PG*-miljøet."""
    parametre = conninfo_to_dict(testbase_url)
    for navn, variabel in (
        ("host", "PGHOST"),
        ("port", "PGPORT"),
        ("user", "PGUSER"),
        ("password", "PGPASSWORD"),
        ("dbname", "PGDATABASE"),
    ):
        if navn in parametre:
            monkeypatch.setenv(variabel, str(parametre[navn]))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    tilkoblinger = []
    ekte = psycopg.Connection.connect

    def registrer(*args, **kwargs):
        tilkoblinger.append((args, kwargs))
        return ekte(*args, **kwargs)

    monkeypatch.setattr(psycopg.Connection, "connect", registrer)
    return tilkoblinger


def test_uten_database_url_finnes_ingen_standardverdi(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert Settings(_env_file=None).database_url is None


@pytest.mark.parametrize("verdi", [None, "", "   "])
def test_uten_database_url_ingen_tilkobling(libpq_peker_paa_testbasen, verdi):
    innstillinger = Settings(
        _env_file=None, database_url=None if verdi is None else SecretStr(verdi)
    )
    with pytest.raises(DatabaseIkkeKonfigurert, match="DATABASE_URL"):
        opprett_database(innstillinger)
    with pytest.raises(DatabaseIkkeKonfigurert):
        _ = Container(config=innstillinger).database
    assert libpq_peker_paa_testbasen == []


def test_manglende_database_url_proves_ikke_paa_nytt(monkeypatch):
    """Under dagens `@with_retry` ville en ukjent feil blitt prøvd på nytt."""
    from lib.supabase.retry import with_retry

    kall = []

    @with_retry(max_attempts=3, backoff_base=0.0)
    def metode():
        kall.append(1)
        opprett_database(Settings(_env_file=None, database_url=None))

    with pytest.raises(DatabaseIkkeKonfigurert):
        metode()
    assert kall == [1]


def test_uleselig_database_url_lekker_ikke_passordet(libpq_peker_paa_testbasen):
    hemmelig = "hemmelig" + secrets.token_hex(4)
    innstillinger = Settings(
        _env_file=None, database_url=SecretStr(f"postgres//bruker:{hemmelig}@vert/b")
    )
    with pytest.raises(DatabaseIkkeKonfigurert) as feil:
        opprett_database(innstillinger)
    assert hemmelig not in str(feil.value)
    assert feil.value.__cause__ is None and feil.value.__suppress_context__
    assert hemmelig not in repr(innstillinger)
    assert libpq_peker_paa_testbasen == []


def test_base_som_ikke_svarer_gir_forbigaaende_feil_uten_passord(caplog):
    hemmelig = "hemmelig" + secrets.token_hex(4)
    database = opprett_database(
        testinnstillinger(
            f"postgresql://bruker:{hemmelig}@127.0.0.1:1/b",
            database_pool_timeout=0.5,
            database_connect_timeout=1,
        )
    )
    try:
        with pytest.raises(TransientError) as feil, database.transaksjon(Kontekst()):
            pass
    finally:
        database.lukk()
    assert hemmelig not in str(feil.value)
    assert hemmelig not in caplog.text
