"""Lenkekontrollen som CI-steget «Lenker i Markdown» kjører (#602, #752).

Leveranseskillen krever et gyldig tilfelle og et representativt avvik for en
kontroll som kjører i CI. Hvert tilfelle lager et eget git-repo med docs/ i
tmp_path og kjører skriptet derfra uten argumenter, som steget gjør. Uten
argumenter leser skriptet filene git sporer (#851).
"""

import subprocess
import sys
from pathlib import Path

import pytest

SKRIPT = Path(__file__).resolve().parents[3] / "docs/verktoy/lenkekontroll.py"


MAAL = """# Mål

## Andre avsnitt

## Andre avsnitt

<a id="eget-anker"></a>
"""


def _kjoer(
    rot: Path, lenke: str, kilde: str | None = None, usporet: dict[str, str] | None = None
) -> subprocess.CompletedProcess:
    docs = rot / "docs"
    docs.mkdir()
    (docs / "maal.md").write_text(MAAL, encoding="utf-8")
    (docs / "fil (2).md").write_text("# Parentes\n", encoding="utf-8")
    (docs / "kode.py").write_text("x = 1\n", encoding="utf-8")
    tekst = f"Se [målet]({lenke}).\n" if kilde is None else kilde
    (docs / "kilde.md").write_text(tekst, encoding="utf-8")
    subprocess.run(["git", "init", "-q"], cwd=rot, check=True)
    subprocess.run(["git", "add", "-A"], cwd=rot, check=True)
    for fil, innhold in (usporet or {}).items():
        (rot / fil).parent.mkdir(parents=True, exist_ok=True)
        (rot / fil).write_text(innhold, encoding="utf-8")
    return subprocess.run(
        [sys.executable, str(SKRIPT)], cwd=rot, capture_output=True, text=True
    )


@pytest.mark.parametrize("lenke", ["maal.md", "maal.md#andre-avsnitt"])
def test_hel_lenke_gir_exit_0(tmp_path, lenke):
    resultat = _kjoer(tmp_path, lenke)
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr
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
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert f"{melding}: docs/kilde.md -> {lenke}" in resultat.stdout
    assert "brutte: 1;" in resultat.stdout


@pytest.mark.parametrize(
    "lenke",
    [
        "maal.md#andre-avsnitt-1",
        "maal.md#eget-anker",
        "kode.py#L1",
        "<maal.md#andre-avsnitt>",
        "fil%20(2).md#parentes",
        "https://example.com/finnes-ikke.md",
        "mailto:noen@example.com",
    ],
)
def test_unntak_og_lenkeformer_som_finnes_gir_exit_0(tmp_path, lenke):
    resultat = _kjoer(tmp_path, lenke)
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr


@pytest.mark.parametrize(
    "lenke, melding",
    [
        ("maal.md#andre-avsnitt-2", "BRUTT ANKER"),
        ("<finnes-ikke.md>", "BRUTT FIL"),
        ("fil%20(3).md", "BRUTT FIL"),
        ("fil%20(2).md#finnes-ikke", "BRUTT ANKER"),
    ],
)
def test_brutt_lenke_i_andre_former_gir_exit_1(tmp_path, lenke, melding):
    resultat = _kjoer(tmp_path, lenke)
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert f"{melding}: docs/kilde.md ->" in resultat.stdout


@pytest.mark.parametrize(
    "kilde",
    [
        "```\n[x](finnes-ikke.md)\n```\n",
        "~~~md\n[x](finnes-ikke.md)\n~~~\n",
        "Skriv `[x](finnes-ikke.md)` slik.\n",
    ],
)
def test_lenke_i_kode_kontrolleres_ikke(tmp_path, kilde):
    resultat = _kjoer(tmp_path, "", kilde)
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr


@pytest.mark.parametrize(
    "maal, kode",
    [
        ("maal.md#andre-avsnitt", 0),
        ("maal.md#finnes-ikke", 1),
        ("<finnes-ikke.md>", 1),
        ('maal.md#finnes-ikke "Tittel"', 1),
        ("finnes-ikke.md (Tittel)", 1),
    ],
)
def test_referansedefinisjon_kontrolleres(tmp_path, maal, kode):
    resultat = _kjoer(tmp_path, "", f"Se [målet][m].\n\n[m]: {maal}\n")
    assert resultat.returncode == kode, resultat.stdout + resultat.stderr


@pytest.mark.parametrize("fil", ["AGENTS.md", "CLAUDE.md", ".claude/rules/regel.md"])
def test_brutt_anker_i_filene_som_lastes_i_oektene_gir_exit_1(tmp_path, fil):
    sti = tmp_path / fil
    sti.parent.mkdir(parents=True, exist_ok=True)
    maal = "docs/maal.md" if sti.parent == tmp_path else "../../docs/maal.md"
    sti.write_text(f"Se [planen]({maal}#finnes-ikke).\n", encoding="utf-8")
    resultat = _kjoer(tmp_path, "maal.md")
    assert resultat.returncode == 1, resultat.stdout + resultat.stderr
    assert f"BRUTT ANKER: {fil} ->" in resultat.stdout


@pytest.mark.parametrize(
    "kilde",
    [
        "Tekst.[^1]\n\n[^1]: Se vedtaket B-17.\n",
        "[Merk]:\nDette gjelder TE.\n",
        "[Merk]: Dette gjelder TE.\n",
    ],
)
def test_fotnote_tom_referanselinje_og_etikett_med_prosa_er_ikke_lenker(tmp_path, kilde):
    """#851: `[Merk]: Dette gjelder TE.` har tekst etter målet som ikke er en tittel."""
    resultat = _kjoer(tmp_path, "", kilde)
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr


@pytest.mark.parametrize("fil", [".claude/worktrees/gren/docs/brutt.md", "docs/utkast.md"])
def test_usporet_fil_som_arbeidstre_eller_utkast_kontrolleres_ikke(tmp_path, fil):
    """#851: filene velges med `git ls-files`."""
    resultat = _kjoer(tmp_path, "maal.md", usporet={fil: "Se [x](finnes-ikke.md).\n"})
    assert resultat.returncode == 0, resultat.stdout + resultat.stderr
