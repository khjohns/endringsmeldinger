"""CI-vakten i .github/scripts/regelversjon.sh mot konstruerte differ (#191, #216, #221).

Hvert tilfelle bygger et eget git-repo med de to speilene, slik at skriptet
kjører uten å røre filene i dette repoet.
"""

import os
import subprocess
from pathlib import Path

import pytest

SKRIPT = Path(__file__).resolve().parents[3] / ".github/scripts/regelversjon.sh"
TS = "src/lib/domain/regelversjon.ts"
PY = "backend/regler/__init__.py"


def _git(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
        cwd=repo, check=True, capture_output=True, text=True,
    ).stdout.strip()


def _skriv(repo: Path, filer: dict[str, str]) -> None:
    for sti, innhold in filer.items():
        (repo / sti).parent.mkdir(parents=True, exist_ok=True)
        (repo / sti).write_text(innhold)
    _git(repo, "add", "-A")
    _git(repo, "commit", "-qm", "endring")


def _versjoner(ts: int, py: int) -> dict[str, str]:
    return {TS: f"export const REGELVERSJON = {ts};\n", PY: f"REGELVERSJON = {py}\n"}


@pytest.fixture
def repo(tmp_path: Path) -> tuple[Path, str]:
    _git(tmp_path, "init", "-q")
    _skriv(tmp_path, {**_versjoner(3, 3), "src/lib/domain/regel.ts": "a\n"})
    return tmp_path, _git(tmp_path, "rev-parse", "HEAD")


def _uten_git_miljo() -> dict[str, str]:
    return {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}


def _kjor(repo: Path, base: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(SKRIPT)], cwd=repo, env={**_uten_git_miljo(), "BASE": base},
        capture_output=True, text=True,
    )


def test_regelendring_uten_okt_versjon_feiler_og_nevner_fixturen(repo):
    sti, base = repo
    _skriv(sti, {"src/lib/domain/regel.ts": "b\n"})
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert "backend/tests/fixtures/skjemaenes_nyttelast.json" in svar.stdout
    assert "npx vitest run -u src/lib/kontraktsbord/skjemanyttelast.test.ts" in svar.stdout


def test_versjon_okt_bare_i_ett_speil_feiler(repo):
    sti, base = repo
    _skriv(sti, {"backend/regler/regel.py": "b\n", **_versjoner(4, 3)})
    assert _kjor(sti, base).returncode == 1


def test_regelendring_med_okt_versjon_i_begge_passerer(repo):
    sti, base = repo
    _skriv(sti, {"src/lib/domain/regel.ts": "b\n", **_versjoner(4, 4)})
    svar = _kjor(sti, base)
    assert svar.returncode == 0, svar.stdout + svar.stderr


def test_endring_bare_i_domenetestene_passerer(repo):
    sti, base = repo
    _skriv(sti, {"src/lib/domain/__tests__/regel.test.ts": "b\n"})
    assert _kjor(sti, base).returncode == 0


def test_mangler_base_gir_bruksmelding(repo):
    sti, _ = repo
    svar = _kjor(sti, "")
    assert svar.returncode == 2
    assert "BASE=" in svar.stderr
