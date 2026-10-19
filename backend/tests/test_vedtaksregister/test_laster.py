"""Den felles lasteren for docs/verktoy/ (#861, punkt 3 og 4)."""

from tests.verktoy import last


def test_dataflyt_kan_lastes_alene_uten_at_relasjoner_er_lastet_foerst():
    df = last("dataflyt")
    assert df.rel.LAGRINGER


def test_moduler_lastet_i_samme_kall_deler_avhengighetene():
    dm = last("datamodell")
    assert dm.df.rel is dm.rel


def test_to_kall_utenfra_deler_ikke_moduler_eller_cache():
    foerste, andre = last("datamodell"), last("datamodell")
    assert foerste.df is not andre.df
    assert foerste.df.catenda_metoder is not andre.df.catenda_metoder
