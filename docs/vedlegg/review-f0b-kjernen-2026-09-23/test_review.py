"""Lokale reviewforsøk. Kjør med kjor.py; ingen delt base brukes."""

import json
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import psycopg
import pytest
from core.container import Container
from lib.db import (
    Kontekst,
    SerialiseringsFeil,
    TransientError,
    UkjentUtfall,
    opprett_database,
)
from psycopg import sql
from tests.test_database import test_kjerne as kjerne
from tests.test_database.conftest import testinnstillinger as innstillinger
from tests.test_database.test_kjerne import (
    full_kontekst,
    sesjonen,
    uavhengig,
)

db = kjerne.db
miljo = kjerne.miljo
pytestmark = pytest.mark.database


@pytest.mark.parametrize("felt", ["rolle", "krav"])
def test_reset_kontrollerer_hvert_felt_alene(db, miljo, felt):
    _, _, pid = sesjonen(db)
    with db.transaksjon(Kontekst()) as conn:
        if felt == "rolle":
            conn.execute(sql.SQL("SET ROLE {}").format(sql.Identifier(miljo.rolle)))
        else:
            conn.execute("SELECT set_config('koe.krav', 'gammelt', false)")
    rolle, krav, neste_pid = sesjonen(db)
    assert (rolle, krav or "") == (miljo.login, "")
    assert neste_pid != pid


def test_neste_transaksjon_stempler_tom_kontekst(db, miljo):
    with db.transaksjon(full_kontekst(miljo)) as conn:
        assert conn.execute("SELECT current_user").fetchone() == (miljo.rolle,)
    with db.transaksjon(Kontekst()) as conn:
        assert conn.execute(
            "SELECT current_user, current_setting('koe.krav', true)"
        ).fetchone() == (miljo.login, "")


def test_aapen_behandler_holder_forbindelsen_til_den_lukkes(miljo):
    database = opprett_database(
        innstillinger(
            miljo.url,
            database_pool_max=1,
            database_pool_timeout=0.15,
        )
    )
    behandler = database.transaksjon(full_kontekst(miljo))
    conn = behandler.__enter__()
    pid = conn.info.backend_pid
    try:

        def neste():
            with database.transaksjon(Kontekst()):
                pass

        with ThreadPoolExecutor(max_workers=1) as trader, pytest.raises(TransientError):
            trader.submit(neste).result(timeout=3)
        assert conn.execute("SELECT current_user").fetchone() == (miljo.rolle,)
    finally:
        behandler.gen.close()
    try:
        assert sesjonen(database) == (miljo.login, "", pid)
    finally:
        database.lukk()


def test_commit_og_begin_skjuler_brudd_i_transaksjonen(db, miljo):
    with pytest.raises(ValueError), db.transaksjon(Kontekst()) as conn:
        conn.execute("INSERT INTO rad (id, verdi) VALUES (71, 'forste')")
        conn.execute("COMMIT; BEGIN")
        raise ValueError("avbrudd")
    assert uavhengig(miljo, "SELECT id FROM rad") == [(71,)]
    with db.transaksjon(full_kontekst(miljo)) as conn:
        conn.execute("COMMIT; BEGIN")
        assert conn.execute("SELECT current_user").fetchone() == (miljo.login,)
        assert conn.execute("SELECT current_setting('koe.krav', true)").fetchone() == (
            "",
        )
        conn.execute("INSERT INTO rad (id, verdi) VALUES (72, 'andre')")
    assert uavhengig(miljo, "SELECT id FROM rad ORDER BY id") == [(71,), (72,)]


def test_containerens_forste_oppslag_kan_lage_to_pooler(miljo, monkeypatch):
    import lib.db

    container = Container(config=innstillinger(miljo.url))
    barriere = threading.Barrier(2, timeout=5)
    ekte = lib.db.opprett_database

    def samtidig(config):
        barriere.wait()
        return ekte(config)

    monkeypatch.setattr(lib.db, "opprett_database", samtidig)
    with ThreadPoolExecutor(max_workers=2) as trader:
        svar = list(trader.map(lambda _: container.database, range(2)))
    try:
        assert svar[0] is not svar[1]
        assert container.database in svar
        container.reset()
        assert sum(d._pool.closed for d in svar) == 1
    finally:
        for database in svar:
            database.lukk()


def test_retry_er_hel_transaksjon_ogsaa_med_gammel_dekorator(db, monkeypatch):
    from lib.supabase import retry

    monkeypatch.setattr(retry.time, "sleep", lambda _: None)
    kall = []

    def arbeid(conn):
        kall.append(1)
        conn.execute("DO $$ BEGIN RAISE EXCEPTION 'x' USING ERRCODE='40001'; END $$")

    @retry.with_retry(max_attempts=3)
    def metode():
        db.utfor(Kontekst(), arbeid)

    with pytest.raises(SerialiseringsFeil):
        metode()
    assert len(kall) == 9


def test_ukjent_utfall_slipper_gjennom_gammel_dekorator(db):
    from lib.supabase.retry import with_retry

    kall = []

    @with_retry(max_attempts=3)
    def metode():
        kall.append(1)
        with db.transaksjon(Kontekst()) as conn:
            conn.execute("INSERT INTO brudd VALUES (1)")

    with pytest.raises(UkjentUtfall):
        metode()
    assert kall == [1]


def test_avbrutt_transaksjon_kan_ikke_fortsette(db, miljo):
    from lib.db import PermanentError

    with pytest.raises(PermanentError) as feil, db.transaksjon(Kontekst()) as conn:
        conn.execute("INSERT INTO rad (id, verdi) VALUES (81, 'a')")
        try:
            conn.execute("SELECT 1 / 0")
        except psycopg.Error:
            pass
        conn.execute("INSERT INTO rad (id, verdi) VALUES (82, 'b')")
    assert feil.value.code == "25P02"
    assert uavhengig(miljo, "SELECT count(*) FROM rad") == [(0,)]


@pytest.mark.parametrize(
    "type_grense", ["statement_timeout", "idle_in_transaction_session_timeout"]
)
def test_grense_paa_login_beholdes_etter_rollebytte(miljo, type_grense):
    with psycopg.connect(miljo.admin, autocommit=True) as admin:
        admin.execute(
            sql.SQL("ALTER ROLE {} SET {} = '100ms'").format(
                sql.Identifier(miljo.login),
                sql.Identifier(type_grense),
            )
        )
    database = opprett_database(innstillinger(miljo.url))
    try:
        with (
            pytest.raises(TransientError) as feil,
            database.transaksjon(full_kontekst(miljo)) as conn,
        ):
            assert conn.execute(
                sql.SQL("SHOW {}").format(sql.Identifier(type_grense))
            ).fetchone() == ("100ms",)
            if type_grense == "statement_timeout":
                conn.execute("SELECT pg_sleep(1)")
            else:
                time.sleep(0.3)
                conn.execute("SELECT 1")
        assert feil.value.original.sqlstate in ("57014", "25P03")
        assert sesjonen(database)[0] == miljo.login
    finally:
        database.lukk()
        with psycopg.connect(miljo.admin, autocommit=True) as admin:
            admin.execute(
                sql.SQL("ALTER ROLE {} RESET {}").format(
                    sql.Identifier(miljo.login),
                    sql.Identifier(type_grense),
                )
            )


def test_lesende_fixture_ser_bare_committet(skrivbar_base, testbase):
    with skrivbar_base.transaksjon(Kontekst()) as conn:
        conn.execute(
            "INSERT INTO sak_relations (source_sak_id, target_sak_id, relation_type, prosjekt_id) VALUES ('rk-a','rk-b','forsering','rk-p')"
        )
        assert testbase.execute(
            "SELECT count(*) FROM sak_relations WHERE source_sak_id='rk-a'"
        ).fetchone() == (0,)
    assert testbase.execute(
        "SELECT count(*) FROM sak_relations WHERE source_sak_id='rk-a'"
    ).fetchone() == (1,)


def test_kontekstformen_er_strenger_uten_standardprosjekt():
    assert Kontekst().krav() == ""
    krav = json.loads(Kontekst(aktor="aktor", prosjekt="", side="", team="").krav())
    assert krav == {
        "koe_aktor": "aktor",
        "koe_prosjekt": "",
        "koe_side": "",
        "koe_team": "",
    }
    with pytest.raises(TypeError):
        Kontekst(prosjekt={"id": "p"}).krav()


def test_to_tidsgrenser_begrenser_ikke_total_transaksjonstid(miljo):
    with psycopg.connect(miljo.admin, autocommit=True) as admin:
        for navn in ("statement_timeout", "idle_in_transaction_session_timeout"):
            admin.execute(
                sql.SQL("ALTER ROLE {} SET {} = '200ms'").format(
                    sql.Identifier(miljo.login),
                    sql.Identifier(navn),
                )
            )
    database = opprett_database(innstillinger(miljo.url))
    try:
        with database.transaksjon(full_kontekst(miljo)) as conn:
            start = time.monotonic()
            for _ in range(10):
                conn.execute("SELECT pg_sleep(0.04)")
            assert time.monotonic() - start > 0.4
            assert conn.execute("SELECT current_user").fetchone() == (miljo.rolle,)
    finally:
        database.lukk()
        with psycopg.connect(miljo.admin, autocommit=True) as admin:
            admin.execute(
                sql.SQL("ALTER ROLE {} RESET ALL").format(sql.Identifier(miljo.login))
            )
            admin.execute(
                sql.SQL("ALTER ROLE {} SET search_path = {}").format(
                    sql.Identifier(miljo.login),
                    sql.Identifier(miljo.skjema),
                )
            )
