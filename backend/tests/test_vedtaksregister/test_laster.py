"""Den felles lasteren for docs/verktoy/ (#861, punkt 3 og 4)."""

import ast
import subprocess
import sys

import pytest

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


LASTEKALL = {"spec_from_file_location", "module_from_spec", "exec_module", "SourceFileLoader"}


def _egen_lasting(kilde: str) -> list[str]:
    """Kall og importer i `kilde` som laster en modul selv, uansett stavemåte."""
    funn = []
    for node in ast.walk(ast.parse(kilde)):
        if isinstance(node, ast.Attribute | ast.Name):
            navn = node.attr if isinstance(node, ast.Attribute) else node.id
            if navn in LASTEKALL:
                funn.append(navn)
        elif isinstance(node, ast.Import):
            funn += [a.name for a in node.names if a.name.split(".")[-1] == "laster"]
        elif isinstance(node, ast.ImportFrom):
            funn += [a.name for a in node.names if a.name in LASTEKALL]
            if (node.module or "").split(".")[-1] == "laster" and node.module != "verktoy.laster":
                funn.append(node.module)
    return funn


def test_modulene_bruker_den_ene_lasteren_og_har_ingen_egen_kopi():
    """#925 punkt 5: en kopi som glir fra, gir modulen en egen laster."""
    lasteren = sys.modules["verktoy.laster"]
    for navn in ("dataflyt", "datamodell", "temavisning", "vedtakshenvisninger"):
        assert last(navn).last is lasteren.last, navn
    kopier = {
        sti.name: funn
        for sti in sorted(MAPPE.glob("*.py"))
        if sti.name != "laster.py" and (funn := _egen_lasting(sti.read_text()))
    }
    assert not kopier, f"egen lasting utenom verktoy.laster: {kopier}"


@pytest.mark.parametrize(
    "kilde",
    [
        "import importlib.util as u\ns = u.spec_from_file_location(\n    'verktoy.laster', 'x'\n)",
        "from importlib.util import spec_from_file_location as f\nnavn = 'verktoy.laster'\nf(navn, 'x')",
        "from importlib.machinery import SourceFileLoader",
        "from laster import last",
        "import laster",
    ],
)
def test_vakten_mot_egne_kopier_fanger_andre_stavemaater(kilde):
    """#958: over flere linjer, med enkle anførselstegn, navnet i en variabel eller et
    annet navn enn verktoy.laster."""
    assert _egen_lasting(kilde)


def test_vakten_godtar_importen_fra_verktoy_laster():
    assert not _egen_lasting("from verktoy.laster import last")


@pytest.mark.parametrize("flagg", ["-P", "-I"])
def test_et_skript_kjoerer_uten_mappa_i_sys_path(flagg):
    """#958: med `-P` og `-I` står ikke skriptets mappe i `sys.path`."""
    resultat = subprocess.run(
        [sys.executable, flagg, str(MAPPE / "temavisning.py"), "--help"],
        capture_output=True, text=True, cwd=MAPPE.parents[1],
    )
    assert resultat.returncode == 0, resultat.stderr


def test_en_modul_lastet_paa_sti_av_en_annen_kaller_bruker_verktoy_laster(tmp_path):
    """#958: en kaller som laster modulen med `spec_from_file_location`, uten
    tests.verktoy.last og uten mappa i `sys.path`."""
    skript = (
        "import importlib.util as u, sys; "
        "s = u.spec_from_file_location('vh', sys.argv[1]); m = u.module_from_spec(s); "
        "s.loader.exec_module(m); "
        "assert m.last is sys.modules['verktoy.laster'].last"
    )
    resultat = subprocess.run(
        [sys.executable, "-I", "-c", skript, str(MAPPE / "vedtakshenvisninger.py")],
        capture_output=True, text=True, cwd=tmp_path,
    )
    assert resultat.returncode == 0, resultat.stderr


def test_en_annen_modul_som_heter_laster_kolliderer_ikke(tmp_path):
    """#958: en annen `laster`, importert før eller etter, berører ikke verktøylasteren."""
    (tmp_path / "laster.py").write_text("FREMMED = True\n")
    skript = (
        "import sys; sys.path.insert(0, sys.argv[1]); import laster; "
        "sys.path.insert(0, sys.argv[2]); from tests.verktoy import last; "
        "vh = last('vedtakshenvisninger'); "
        "assert vh.last is sys.modules['verktoy.laster'].last; "
        "assert sys.modules['laster'].FREMMED"
    )
    resultat = subprocess.run(
        [sys.executable, "-c", skript, str(tmp_path), str(MAPPE.parents[1] / "backend")],
        capture_output=True, text=True, cwd=tmp_path,
    )
    assert resultat.returncode == 0, resultat.stderr
