"""docs/datamodell/katalog.json mot en base bygget fra migrasjonene (spor M, 1c).

ER-diagrammet og relasjonsregisteret lages fra øyeblikksbildet. Denne testen
holder PostgreSQL-delen av det lik katalogen, så en ny migrasjon som endrer en
kolonne, en nøkkel, en funksjon eller en trigger gjør testen rød til bildet er
tatt på nytt med docs/verktoy/katalog.py.
"""

import pytest

from tests.test_datamodell.test_tabellregister import dm

pytestmark = pytest.mark.database


def test_katalog_json_er_lik_katalogen_i_basen(testbase):
    assert dm.kat.les_postgres(testbase) == dm.kat.les()["postgresql"], (
        "katalog.json er utdatert. Kjør KOE_TESTBASE_URL=... /tmp/venv/bin/python "
        "docs/verktoy/katalog.py fra repo-roten, og så datamodell.py."
    )
