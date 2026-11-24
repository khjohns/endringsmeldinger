"""Oppdateringen av en kjerne-PR mot main i .github/scripts/oppdater_kjerne_pr.py (#2293).

Hvert tilfelle bygger et eget git-repo med en base og en PR-gren, kjører skriptet med
`--lokal` og kontrollerer grenen og regelversjonsvakten etterpå.
"""

import importlib.util
import os
import subprocess
import sys
from pathlib import Path

import pytest

SKRIPTER = Path(__file__).resolve().parents[3] / ".github/scripts"
SKRIPT = SKRIPTER / "oppdater_kjerne_pr.py"

REGELSETT = "kjerne/regler/regelsett.ts"
VERSJON = "kjerne/versjon.ts"
STARTJOURNALER = "docs/domenetabell/brukerforlop/startjournaler.json"


def _last():
    spes = importlib.util.spec_from_file_location("oppdater_kjerne_pr", SKRIPT)
    modul = importlib.util.module_from_spec(spes)
    spes.loader.exec_module(modul)
    return modul


oppdater = _last()


def _miljo() -> dict[str, str]:
    miljo = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    return {**miljo, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t"}


def _git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True, env=_miljo()).stdout.strip()


def _skriv(repo: Path, filer: dict[str, str], melding: str = "endring") -> None:
    for sti, innhold in filer.items():
        (repo / sti).parent.mkdir(parents=True, exist_ok=True)
        (repo / sti).write_text(innhold)
    _git(repo, "add", "-A")
    _git(repo, "commit", "-qm", melding)


def _versjoner(regel: int, projeksjon: int, ekstra: str = "") -> dict[str, str]:
    return {
        REGELSETT: f"export const REGELVERSJON = {regel};\n{ekstra}",
        VERSJON: f"export const PROJEKSJONSVERSJON = {projeksjon};\n",
    }


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    sti = tmp_path / "repo"
    sti.mkdir()
    _git(sti, "init", "-q", "-b", "main")
    _skriv(
        sti,
        {
            **_versjoner(5, 2),
            "kjerne/regler/frist.ts": "export const a = 1;\n",
            "kjerne/utled.ts": "export const a = 1;\n",
            "kjerne/frosset/standpunkt.ts": "export const a = 1;\n",
            "kjerne/format/format.ts": "export const FORMAT = 1;\nexport const LESERFORMAT = 1;\n",
            STARTJOURNALER: '{"regelversjon": 5}\n',
            "README.md": "a\n",
        },
    )
    _git(sti, "branch", "pr")
    return sti


def _pr(repo: Path, filer: dict[str, str]) -> None:
    _git(repo, "checkout", "-q", "pr")
    _skriv(repo, filer)
    _git(repo, "checkout", "-q", "main")


def _kjor(repo: Path, tmp_path: Path, *ekstra: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SKRIPT), "pr", "--lokal", "--mappe", str(tmp_path / "tre"), *ekstra],
        cwd=repo, capture_output=True, text=True, env=_miljo(),
    )


def _fil(repo: Path, ref: str, sti: str) -> str:
    return _git(repo, "show", f"{ref}:{sti}")


def _vakt(repo: Path, ref: str, base: str) -> subprocess.CompletedProcess:
    _git(repo, "checkout", "-q", "--detach", ref)
    try:
        return subprocess.run(
            ["bash", str(SKRIPTER / "regelversjon.sh")], cwd=repo, capture_output=True, text=True,
            env={**{k: v for k, v in os.environ.items() if not k.startswith("GIT_")}, "BASE": base},
        )
    finally:
        _git(repo, "checkout", "-q", "main")


def test_samme_okning_paa_begge_sider_gir_en_ny_over_basen(repo, tmp_path):
    """Git fletter to like økninger uten konflikt, og vakten ville avvist resultatet."""
    _pr(repo, {"kjerne/regler/frist.ts": "export const a = 2;\n", **_versjoner(6, 2)})
    _skriv(repo, {"kjerne/regler/ny.ts": "export const b = 1;\n", **_versjoner(6, 2)})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 0, svar.stderr
    tre = tmp_path / "tre"
    assert "export const REGELVERSJON = 7;" in (tre / REGELSETT).read_text()
    assert "REGELVERSJON 6 -> 7" in svar.stdout


def test_ulike_okninger_i_konflikt_tar_basens_tall_pluss_en(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 4)})
    _skriv(repo, {"kjerne/regler/frist.ts": "export const a = 2;\n", **_versjoner(6, 3)})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 0, svar.stderr + svar.stdout
    assert f"Løste konflikter i: {VERSJON}" in svar.stdout
    tre = tmp_path / "tre"
    assert (tre / VERSJON).read_text() == "export const PROJEKSJONSVERSJON = 4;\n"
    assert (tre / REGELSETT).read_text() == "export const REGELVERSJON = 6;\n"
    ny = _git(tre, "rev-parse", "HEAD")
    assert _vakt(repo, ny, _git(repo, "rev-parse", "main")).returncode == 0


def test_uten_push_staar_grenen_urort(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 3)})
    for_ = _git(repo, "rev-parse", "pr")
    _skriv(repo, {"kjerne/ny.ts": "export const c = 1;\n", **_versjoner(5, 3)})
    assert _kjor(repo, tmp_path).returncode == 0
    assert _git(repo, "rev-parse", "pr") == for_


def test_push_flytter_grenen_til_det_vakten_godtar(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 3)})
    _skriv(repo, {"kjerne/ny.ts": "export const c = 1;\n", **_versjoner(5, 3)})
    _git(repo, "remote", "add", "origin", str(repo))
    svar = _kjor(repo, tmp_path, "--push", "--remote", "origin")
    assert svar.returncode == 0, svar.stderr
    assert _fil(repo, "pr", VERSJON) == "export const PROJEKSJONSVERSJON = 4;"
    assert _git(repo, "merge-base", "--is-ancestor", "main", "pr") == ""
    assert _vakt(repo, "pr", _git(repo, "rev-parse", "main")).returncode == 0
    assert not (tmp_path / "tre").exists()


def test_hoeyere_versjon_paa_grenen_endres_ikke(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 9)})
    _skriv(repo, {"README.md": "b\n"})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 0, svar.stderr
    assert "Økte" not in svar.stdout
    tre = tmp_path / "tre"
    assert _git(tre, "log", "-1", "--format=%s").startswith("Merge branch 'main' into pr")


def test_annen_konflikt_stopper_uten_endring(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 3)})
    for_ = _git(repo, "rev-parse", "pr")
    _skriv(repo, {"kjerne/utled.ts": "export const a = 3;\n", **_versjoner(5, 3)})
    svar = _kjor(repo, tmp_path, "--push")
    assert svar.returncode == 1
    assert "kjerne/utled.ts" in svar.stderr
    assert _git(repo, "rev-parse", "pr") == for_
    assert not (tmp_path / "tre").exists()


def test_konflikt_utenfor_versjonslinja_i_versjonsfila_stopper(repo, tmp_path):
    _pr(repo, {"kjerne/regler/frist.ts": "export const a = 2;\n", **_versjoner(6, 2, "export const x = 1;\n")})
    _skriv(repo, {"kjerne/regler/ny.ts": "export const b = 1;\n", **_versjoner(6, 2, "export const x = 2;\n")})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 1
    assert REGELSETT in svar.stderr


def test_konflikt_i_generert_fil_tar_basens_innhold(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", STARTJOURNALER: '{"regelversjon": 6}\n', **_versjoner(5, 3)})
    _skriv(repo, {STARTJOURNALER: '{"regelversjon": 7}\n'})
    svar = _kjor(repo, tmp_path)
    assert svar.returncode == 0, svar.stderr
    assert (tmp_path / "tre" / STARTJOURNALER).read_text() == '{"regelversjon": 7}\n'


def test_grenen_som_alt_har_basen_endres_ikke(repo, tmp_path):
    _pr(repo, {"kjerne/utled.ts": "export const a = 2;\n", **_versjoner(5, 3)})
    svar = _kjor(repo, tmp_path, "--push")
    assert svar.returncode == 0
    assert "Ingenting å gjøre" in svar.stdout
    assert not (tmp_path / "tre").exists()


@pytest.mark.parametrize(
    "innhold, ventet",
    [
        pytest.param(
            "a\n<<<<<<< HEAD\nexport const X = 3;\n=======\nexport const X = 4;\n>>>>>>> main\nb\n",
            "a\nexport const X = 4;\nb\n",
            id="bare versjonslinja",
        ),
        pytest.param(
            "<<<<<<< HEAD\nexport const X = 3;\nc\n=======\nexport const X = 4;\n>>>>>>> main\n",
            None,
            id="mer enn versjonslinja",
        ),
        pytest.param(
            "<<<<<<< HEAD\nexport const Y = 3;\n=======\nexport const Y = 4;\n>>>>>>> main\n",
            None,
            id="en annen konstant",
        ),
    ],
)
def test_versjonskonflikten_loses_bare_for_versjonslinja(innhold, ventet):
    assert oppdater.los_versjonskonflikt(innhold, "X") == ventet
