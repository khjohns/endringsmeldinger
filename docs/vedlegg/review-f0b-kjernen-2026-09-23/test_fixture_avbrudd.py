"""Første test feiler med vilje; den andre kontrollerer fixture-finalizeren."""

import pytest
from lib.db import Kontekst

pytestmark = pytest.mark.database


def test_01_skriv_og_feil(skrivbar_base):
    with skrivbar_base.transaksjon(Kontekst()) as conn:
        conn.execute(
            "INSERT INTO sak_relations (source_sak_id, target_sak_id, relation_type, prosjekt_id) VALUES ('rk-feil','rk-b','forsering','rk-p')"
        )
    pytest.fail("tilsiktet avbrudd for å prøve fixture-finalizeren")


def test_02_finalizeren_har_ryddet(testbase):
    assert testbase.execute(
        "SELECT count(*) FROM sak_relations WHERE source_sak_id='rk-feil'"
    ).fetchone() == (0,)
