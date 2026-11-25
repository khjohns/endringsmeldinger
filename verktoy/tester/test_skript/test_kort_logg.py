"""Kortformen i scripts/kort_logg.py: feillinjene, halen, loggen og utgangskoden."""

import importlib.util
import sys
from pathlib import Path

SKRIPT = Path(__file__).resolve().parents[3] / "scripts/kort_logg.py"
_spec = importlib.util.spec_from_file_location("kort_logg", SKRIPT)
kort_logg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kort_logg)


def test_feillinjer_foran_halen_vises_en_gang_og_halen_til_slutt():
    linjer = ["ok 1", "src/a.ts(3,1): error TS2322: feil type", "ok 2"]
    linjer += ["src/a.ts(3,1): error TS2322: feil type", "ok 3", "Found 1 error."]
    ut = kort_logg.kortform(linjer, maks_feil=10, hale=1)
    assert ut == [
        "--- feil (1) ---",
        "src/a.ts(3,1): error TS2322: feil type",
        "--- siste 1 linjer ---",
        "Found 1 error.",
    ]


def test_linjer_som_sier_null_feil_regnes_ikke_som_feil():
    linjer = [
        "svelte-check found 0 errors and 0 warnings",
        "Tests 12 passed | 0 failed",
    ]
    assert kort_logg.kortform(linjer, maks_feil=10, hale=0) == []


def test_feillinjene_kappes_ved_maks_med_antallet_som_gjenstaar():
    linjer = [f"FAIL test{n}" for n in range(5)]
    ut = kort_logg.kortform(linjer, maks_feil=2, hale=0)
    assert ut == [
        "--- feil (5) ---",
        "FAIL test0",
        "FAIL test1",
        "... og 3 til i loggen",
    ]


def test_hele_loggen_skrives_til_fil_uten_fargekoder_og_utgangskoden_beholdes(
    tmp_path, capsys
):
    logg = tmp_path / "logg.txt"
    kode = (
        "import sys\n"
        "for n in range(100): print(f'linje {n}')\n"
        "print('\\x1b[31mFAIL x.test.ts\\x1b[0m', file=sys.stderr)\n"
        "print('slutt')\n"
        "sys.exit(3)\n"
    )
    utfall = kort_logg.main(
        ["--logg", str(logg), "--hale", "2", "--", sys.executable, "-u", "-c", kode]
    )
    assert utfall == 3
    tekst = logg.read_text()
    assert "linje 0\n" in tekst and "\x1b" not in tekst
    vist = capsys.readouterr().out
    assert "linje 0\n" not in vist
    assert "Utfall: kode 3" in vist
    assert vist.endswith("--- siste 2 linjer ---\nFAIL x.test.ts\nslutt\n")


def test_en_linje_med_feil_vises_selv_om_den_ogsaa_sier_null_av_noe_annet():
    assert kort_logg.er_feillinje("Tests  3 failed | 0 errors")
    assert kort_logg.er_feillinje("ERROR collecting test_a.py")
    assert not kort_logg.er_feillinje("Tests  3 passed | 0 failed")
