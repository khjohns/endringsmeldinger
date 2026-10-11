"""Testoppsettet nekter en testbase som er eldre enn migrasjonene (#379).

Arbeidstreet etterliknes med en kopi av stubben og migrasjonene, så basen ikke
røres. Samme sum regnes i bash (`bygg_testbase.sh`) og i TS
(`server/kastbar.ts`); at de tre er enige, viser at fixturene slipper gjennom
mot basen CI bygger.
"""

import shutil

import pytest

from .conftest import ROT, krev_fersk_testbase

pytestmark = pytest.mark.database


@pytest.fixture
def kopi(tmp_path):
    (tmp_path / "scripts/testbase").mkdir(parents=True)
    shutil.copy(ROT / "scripts/testbase/plattformstubb.sql", tmp_path / "scripts/testbase")
    shutil.copytree(ROT / "supabase/migrations", tmp_path / "supabase/migrations")
    return tmp_path


def test_basen_bygget_av_arbeidstreet_godtas(testbase_url, kopi):
    krev_fersk_testbase(testbase_url, kopi)


def test_en_ny_migrasjon_etter_byggingen_gir_en_tydelig_feil(testbase_url, kopi):
    (kopi / "supabase/migrations/99991231000000_senere.sql").write_text("SELECT 1;\n")
    with pytest.raises(pytest.fail.Exception, match="bygg_paa_nytt.sh"):
        krev_fersk_testbase(testbase_url, kopi)


def test_en_endret_migrasjon_gir_en_tydelig_feil(testbase_url, kopi):
    forste = min((kopi / "supabase/migrations").glob("*.sql"))
    forste.write_text(forste.read_text() + "\n-- endret\n")
    with pytest.raises(pytest.fail.Exception, match="ikke bygget av migrasjonene"):
        krev_fersk_testbase(testbase_url, kopi)
