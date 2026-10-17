"""Lenkekontrollen som CI-steget «Lenker i docs/» kjører (#602).

Leveranseskillen krever et gyldig tilfelle og et representativt avvik for en
kontroll som kjører i CI. Hvert tilfelle skriver egne filer i tmp_path.
"""

import subprocess
import sys
from pathlib import Path

import pytest

SKRIPT = Path(__file__).resolve().parents[3] / "docs/verktoy/lenkekontroll.py"


def _kjoer(mappe: Path, lenke: str) -> subprocess.CompletedProcess:
    (mappe / "maal.md").write_text("# Mål\n\n## Andre avsnitt\n", encoding="utf-8")
    kilde = mappe / "kilde.md"
    kilde.write_text(f"Se [målet]({lenke}).\n", encoding="utf-8")
    return subprocess.run(
        [sys.executable, str(SKRIPT), str(kilde)], capture_output=True, text=True
    )


@pytest.mark.parametrize("lenke", ["maal.md", "maal.md#andre-avsnitt"])
def test_hel_lenke_gir_exit_0(tmp_path, lenke):
    resultat = _kjoer(tmp_path, lenke)
    assert resultat.returncode == 0, resultat.stdout
    assert "brutte: 0" in resultat.stdout


@pytest.mark.parametrize(
    "lenke, melding",
    [
        ("finnes-ikke.md", "BRUTT FIL"),
        ("maal.md#finnes-ikke", "BRUTT ANKER"),
    ],
)
def test_brutt_lenke_gir_exit_1_og_navngir_lenken(tmp_path, lenke, melding):
    resultat = _kjoer(tmp_path, lenke)
    assert resultat.returncode == 1, resultat.stdout
    assert f"{melding}:" in resultat.stdout and lenke in resultat.stdout
