"""Den skrivbare fixturen: vernet mot feil base og ryddingen etter hver test."""

import uuid

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from core.container import get_container
from lib.db import Kontekst
from tests.test_database.conftest import _rydd, krev_kastbar_testbase

pytestmark = pytest.mark.database


def test_base_uten_merket_avvises(testbase_url):
    navn = f"koe_umerket_{uuid.uuid4().hex[:8]}"
    with psycopg.connect(testbase_url, autocommit=True) as c:
        c.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(navn)))
    try:
        umerket = make_conninfo(**{**conninfo_to_dict(testbase_url), "dbname": navn})
        with pytest.raises(pytest.fail.Exception, match="kastbar testbase"):
            krev_kastbar_testbase(umerket)
    finally:
        with psycopg.connect(testbase_url, autocommit=True) as c:
            c.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(navn)))


def _tilstand(url):
    with psycopg.connect(url, autocommit=True) as c:
        return c.execute(
            "SELECT (SELECT count(*) FROM sak_relations),"
            " (SELECT array_agg(to_jsonb(p) ORDER BY id) FROM projects p)"
        ).fetchone()


def test_ryddingen_tommer_nye_rader_og_gjenoppretter_frodata(testbase_url, _frodata):
    foer = _tilstand(testbase_url)
    assert foer[0] == 0 and foer[1], "testen forutsetter frødata i projects"
    with psycopg.connect(testbase_url) as c, c.transaction():
        c.execute(
            "INSERT INTO sak_relations"
            " (source_sak_id, target_sak_id, relation_type, prosjekt_id)"
            " VALUES ('a', 'b', 'forsering', 'p')"
        )
        c.execute(
            "INSERT INTO projects (id, name, organisasjon_id)"
            " SELECT 'ny-test', 'Ny', organisasjon_id FROM projects LIMIT 1"
        )
        c.execute("UPDATE projects SET name = 'endret'")
    assert _tilstand(testbase_url) != foer

    _rydd(testbase_url, _frodata)

    assert _tilstand(testbase_url) == foer


def test_containeren_bruker_testbasen(container_mot_testbasen, skrivbar_base):
    assert get_container().database is skrivbar_base
    with get_container().database.transaksjon(Kontekst()) as conn:
        assert conn.execute("SELECT current_database()").fetchone()[0]
