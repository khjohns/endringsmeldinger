"""Testoppsettet nekter en testbase som er eldre enn migrasjonene, og
`bygg_paa_nytt.sh` bygger den på nytt med samme URL (#379).

Arbeidstreet etterliknes med en kopi av det basen bygges av, og
`bygg_paa_nytt.sh` prøves mot en egen base på samme server, så testbasen ikke
røres.
"""

import os
import shutil
import subprocess
import uuid

import psycopg
import pytest
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from .conftest import ROT, krev_kastbar_testbase

pytestmark = pytest.mark.database


@pytest.fixture
def kopi(tmp_path):
    (tmp_path / "scripts/testbase").mkdir(parents=True)
    for fil in ("bygg_testbase.sh", "plattformstubb.sql"):
        shutil.copy(ROT / "scripts/testbase" / fil, tmp_path / "scripts/testbase")
    shutil.copytree(ROT / "supabase/migrations", tmp_path / "supabase/migrations")
    return tmp_path


def test_basen_bygget_av_arbeidstreet_godtas(testbase_url, kopi):
    krev_kastbar_testbase(testbase_url, kopi)


def test_en_ny_migrasjon_etter_byggingen_gir_en_tydelig_feil(testbase_url, kopi):
    (kopi / "supabase/migrations/99991231000000_senere.sql").write_text("SELECT 1;\n")
    with pytest.raises(pytest.fail.Exception, match="bygg_paa_nytt.sh"):
        krev_kastbar_testbase(testbase_url, kopi)


def test_en_endret_migrasjon_gir_en_tydelig_feil(testbase_url, kopi):
    forste = min((kopi / "supabase/migrations").glob("*.sql"))
    forste.write_bytes(forste.read_bytes() + b"\n-- endret\n")
    with pytest.raises(pytest.fail.Exception, match="ikke bygget av migrasjonene"):
        krev_kastbar_testbase(testbase_url, kopi)


@pytest.fixture
def egen_base(testbase_url):
    """En tom base på samme server som testbasen, slettet etterpå."""
    navn = f"koe_paa_nytt_{uuid.uuid4().hex[:8]}"
    with psycopg.connect(testbase_url, autocommit=True) as c:
        c.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(navn)))
    try:
        yield make_conninfo(**{**conninfo_to_dict(testbase_url), "dbname": navn})
    finally:
        with psycopg.connect(testbase_url, autocommit=True) as c:
            c.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(navn)))


def _bygg_paa_nytt(url):
    return subprocess.run(
        [str(ROT / "scripts/testbase/bygg_paa_nytt.sh")],
        env={**os.environ, "KOE_TESTBASE_URL": url},
        capture_output=True,
        text=True,
        check=False,
    )


def test_bygg_paa_nytt_gir_en_fersk_base_paa_samme_url(egen_base):
    with psycopg.connect(egen_base, autocommit=True) as c:
        c.execute(
            sql.SQL("COMMENT ON DATABASE {} IS 'koe-kastbar-testbase'").format(
                sql.Identifier(conninfo_to_dict(egen_base)["dbname"])
            )
        )
        c.execute("CREATE TABLE public.gammel (id int)")
    svar = _bygg_paa_nytt(egen_base)
    assert svar.returncode == 0, svar.stderr
    assert krev_kastbar_testbase(egen_base) == egen_base
    with psycopg.connect(egen_base, autocommit=True) as c:
        assert c.execute("SELECT to_regclass('public.gammel')").fetchone()[0] is None


def test_bygg_paa_nytt_nekter_en_base_uten_merket(egen_base):
    with psycopg.connect(egen_base, autocommit=True) as c:
        c.execute("CREATE TABLE public.behold (id int)")
    svar = _bygg_paa_nytt(egen_base)
    assert svar.returncode == 1 and "Avbryter" in svar.stderr
    with psycopg.connect(egen_base, autocommit=True) as c:
        assert c.execute("SELECT to_regclass('public.behold')").fetchone()[0] is not None
