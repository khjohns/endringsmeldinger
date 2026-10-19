"""Den felles lasteren for docs/verktoy/ (#861, punkt 3 og 4)."""

import subprocess
import sys

from tests.verktoy import MAPPE, last


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


def test_modulene_bruker_den_ene_lasteren_og_har_ingen_egen_kopi():
    """#925 punkt 5: en kopi som glir fra, gir modulen en egen laster."""
    lasteren = sys.modules["verktoy.laster"]
    for navn in ("dataflyt", "datamodell", "temavisning", "vedtakshenvisninger"):
        assert last(navn).last is lasteren.last, navn
    kopier = [
        sti.name
        for sti in sorted(MAPPE.glob("*.py"))
        if sti.name != "laster.py" and "spec_from_file_location(\"verktoy.laster\"" in sti.read_text()
    ]
    assert not kopier, f"egen kopi av lasteren i {', '.join(kopier)}"


def test_et_skript_og_modulene_det_laster_deler_lasteren(tmp_path):
    """Kjørt som skript importeres lasteren som `laster`, og modulene den laster,
    får samme instans."""
    skript = (
        "import sys; sys.path.insert(0, sys.argv[1]); import laster; "
        "vh = laster.last('vedtakshenvisninger'); "
        "assert sys.modules['verktoy.laster'] is laster; "
        "assert vh.last is laster.last"
    )
    resultat = subprocess.run(
        [sys.executable, "-c", skript, str(MAPPE)], capture_output=True, text=True, cwd=tmp_path
    )
    assert resultat.returncode == 0, resultat.stderr
