"""Testoppsettet nekter en testbase som er eldre enn migrasjonene (#379).

Arbeidstreet etterliknes med en kopi av det basen bygges av, så basen ikke
røres.
"""

import shutil

import pytest

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
