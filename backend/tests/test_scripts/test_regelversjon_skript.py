"""CI-vakten i .github/scripts/regelversjon.sh mot konstruerte differ (#191, #216, #221, #308, #330).

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


def test_regelendring_med_okt_versjon_i_begge_passerer_og_minner_om_fixturen(repo):
    sti, base = repo
    _skriv(sti, {"src/lib/domain/regel.ts": "b\n", **_versjoner(4, 4)})
    svar = _kjor(sti, base)
    assert svar.returncode == 0, svar.stdout + svar.stderr
    assert "::notice file=backend/tests/fixtures/skjemaenes_nyttelast.json::" in svar.stdout
    assert "npx vitest run -u src/lib/kontraktsbord/skjemanyttelast.test.ts" in svar.stdout


def test_endring_bare_i_domenetestene_passerer_uten_fixturhint(repo):
    sti, base = repo
    _skriv(sti, {"src/lib/domain/__tests__/regel.test.ts": "b\n"})
    svar = _kjor(sti, base)
    assert svar.returncode == 0
    assert "skjemaenes_nyttelast" not in svar.stdout


def test_mangler_base_gir_bruksmelding(repo):
    sti, _ = repo
    svar = _kjor(sti, "")
    assert svar.returncode == 2
    assert "BASE=" in svar.stderr


KJERNE_REGLER = "kjerne/regler/regelsett.ts"
KJERNE_VERSJON = "kjerne/versjon.ts"


def _kjerne(regel: int, projeksjon: int) -> dict[str, str]:
    return {
        KJERNE_REGLER: f"export const REGELVERSJON = {regel};\n",
        KJERNE_VERSJON: f"export const PROJEKSJONSVERSJON = {projeksjon};\n",
    }


@pytest.fixture
def kjerne(repo):
    sti, _ = repo
    _skriv(
        sti,
        {
            **_kjerne(5, 2),
            "kjerne/regler/frist.ts": "a\n",
            "kjerne/utled.ts": "a\n",
            "kjerne/standpunkt.ts": "a\n",
        },
    )
    return sti, _git(sti, "rev-parse", "HEAD")


@pytest.mark.parametrize(
    "filer, ventet",
    [
        pytest.param({"kjerne/regler/frist.ts": "b\n"}, 1, id="regelsettet uten ny regelversjon"),
        pytest.param({"kjerne/regler/frist.ts": "b\n", **_kjerne(6, 2)}, 0, id="regelsettet med ny regelversjon"),
        pytest.param({"kjerne/utled.ts": "b\n"}, 1, id="utledningen uten ny projeksjonsversjon"),
        pytest.param({"kjerne/utled.ts": "b\n", **_kjerne(5, 3)}, 0, id="utledningen med ny projeksjonsversjon"),
        pytest.param({"kjerne/utled.ts": "b\n", **_kjerne(6, 2)}, 1, id="utledningen med bare ny regelversjon"),
        # #330: standpunkt.ts bestemmer hva beslutningsgrunnlaget fryser (MM-U11),
        # så den krever ny regelversjon, og ny projeksjonsversjon som resten av kjernen.
        pytest.param({"kjerne/standpunkt.ts": "b\n"}, 1, id="standpunktene uten nye versjoner"),
        pytest.param({"kjerne/standpunkt.ts": "b\n", **_kjerne(5, 3)}, 1, id="standpunktene med bare ny projeksjonsversjon"),
        pytest.param({"kjerne/standpunkt.ts": "b\n", **_kjerne(6, 2)}, 1, id="standpunktene med bare ny regelversjon"),
        pytest.param({"kjerne/standpunkt.ts": "b\n", **_kjerne(6, 3)}, 0, id="standpunktene med begge versjonene"),
        pytest.param({"kjerne/tester/kjerne.test.ts": "b\n"}, 0, id="bare testene"),
    ],
)
def test_kjernen_krever_ny_versjon_der_den_er_endret(kjerne, filer, ventet):
    sti, base = kjerne
    _skriv(sti, filer)
    svar = _kjor(sti, base)
    assert svar.returncode == ventet, svar.stdout + svar.stderr


def test_kjernen_uten_standpunkt_ts_feiler(kjerne):
    """#330: kravet om ny regelversjon forsvinner ikke stille om standpunkt.ts flyttes."""
    sti, base = kjerne
    _git(sti, "rm", "-q", "kjerne/standpunkt.ts")
    _git(sti, "commit", "-qm", "flytt")
    svar = _kjor(sti, base)
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert "kjerne/standpunkt.ts finnes ikke" in svar.stdout


def test_kjernen_og_speilene_kontrolleres_hver_for_seg(kjerne):
    """En endring i kjernen redder ikke en regelendring i speilene uten ny versjon."""
    sti, base = kjerne
    _skriv(sti, {"src/lib/domain/regel.ts": "b\n", "kjerne/utled.ts": "b\n", **_kjerne(5, 3)})
    assert _kjor(sti, base).returncode == 1
