"""CI-vakten i .github/scripts/migrasjonsvakt.py mot konstruerte differ (#1057 del 1).

Hvert tilfelle bygger et eget git-repo med migrasjonsmappene, slik at vakten
kjører uten å røre filene i dette repoet. Forventningene står i
`.claude/rules/database.md` («En anvendt migrasjon er uforanderlig») og i
`vurder` i server/migrering.ts, som avviser en endret eller fjernet fil og en
ny fil foran en anvendt.
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest

SKRIPT = Path(__file__).resolve().parents[3] / ".github/scripts/migrasjonsvakt.py"
MSSQL = "database/migrasjoner"
PG = "supabase/migrations"


def _git(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
        cwd=repo, check=True, capture_output=True, text=True,
    ).stdout.strip()


def _skriv(repo: Path, filer: dict[str, str | None]) -> None:
    for sti, innhold in filer.items():
        if innhold is None:
            (repo / sti).unlink()
            continue
        (repo / sti).parent.mkdir(parents=True, exist_ok=True)
        (repo / sti).write_text(innhold)
    _git(repo, "add", "-A")
    _git(repo, "commit", "-qm", "endring")


@pytest.fixture
def repo(tmp_path: Path) -> tuple[Path, str]:
    _git(tmp_path, "init", "-q")
    _skriv(tmp_path, {
        f"{MSSQL}/20261020100000_a.sql": "CREATE TABLE a (x int);\n",
        f"{MSSQL}/20261020110000_b.sql": "-- kommentar\nCREATE TABLE b (x int);\n",
        f"{PG}/20261011090000_c.sql": "create table c (x int);\n",
    })
    return tmp_path, _git(tmp_path, "rev-parse", "HEAD")


def _kjor(repo: Path, base: str) -> subprocess.CompletedProcess:
    miljo = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    return subprocess.run(
        [sys.executable, str(SKRIPT), base], cwd=repo, env=miljo,
        capture_output=True, text=True,
    )


def _feiler_med(svar: subprocess.CompletedProcess, tekst: str) -> None:
    assert svar.returncode == 1, svar.stdout + svar.stderr
    assert tekst in svar.stdout, svar.stdout


def test_ny_migrasjon_etter_de_mergede_passerer(repo):
    sti, base = repo
    _skriv(sti, {
        f"{MSSQL}/20261020120000_d.sql": "CREATE TABLE d (x int);\n",
        f"{PG}/20261012090000_e.sql": "create table e (x int);\n",
    })
    svar = _kjor(sti, base)
    assert svar.returncode == 0, svar.stdout + svar.stderr


def test_ingen_endring_i_migrasjonene_passerer(repo):
    sti, base = repo
    _skriv(sti, {"README.md": "x\n"})
    assert _kjor(sti, base).returncode == 0


def test_endret_kommentar_i_merget_migrasjon_feiler(repo):
    sti, base = repo
    _skriv(sti, {f"{MSSQL}/20261020110000_b.sql": "-- kommentar rettet\nCREATE TABLE b (x int);\n"})
    _feiler_med(_kjor(sti, base), f"{MSSQL}/20261020110000_b.sql er merget, men er endret")


def test_endret_merget_migrasjon_i_supabase_feiler(repo):
    sti, base = repo
    _skriv(sti, {f"{PG}/20261011090000_c.sql": "create table c (x bigint);\n"})
    _feiler_med(_kjor(sti, base), f"{PG}/20261011090000_c.sql er merget, men er endret")


def test_fjernet_merget_migrasjon_feiler(repo):
    sti, base = repo
    _skriv(sti, {f"{MSSQL}/20261020100000_a.sql": None})
    _feiler_med(_kjor(sti, base), f"{MSSQL}/20261020100000_a.sql er merget, men er fjernet eller omdøpt")


def test_omdoept_merget_migrasjon_feiler(repo):
    sti, base = repo
    _git(sti, "mv", f"{MSSQL}/20261020100000_a.sql", f"{MSSQL}/20261020100000_a2.sql")
    _git(sti, "commit", "-qm", "omdøping")
    _feiler_med(_kjor(sti, base), f"{MSSQL}/20261020100000_a.sql er merget, men er fjernet eller omdøpt")


def test_ny_migrasjon_foran_en_merget_feiler(repo):
    sti, base = repo
    _skriv(sti, {f"{MSSQL}/20261020105000_foran.sql": "SELECT 1;\n"})
    _feiler_med(_kjor(sti, base), "versjonen 20261020105000 er ikke høyere enn 20261020110000")


def test_ny_migrasjon_med_samme_versjon_som_en_merget_feiler(repo):
    sti, base = repo
    _skriv(sti, {f"{MSSQL}/20261020110000_annen.sql": "SELECT 1;\n"})
    svar = _kjor(sti, base)
    _feiler_med(svar, "versjonen 20261020110000 er ikke høyere enn 20261020110000")
    assert "versjonen 20261020110000 har flere filer" in svar.stdout


def test_to_nye_migrasjoner_med_samme_versjon_feiler(repo):
    sti, base = repo
    _skriv(sti, {
        f"{MSSQL}/20261020120000_d.sql": "SELECT 1;\n",
        f"{MSSQL}/20261020120000_e.sql": "SELECT 2;\n",
    })
    _feiler_med(_kjor(sti, base), "versjonen 20261020120000 har flere filer")


def test_ny_migrasjon_med_ugyldig_tidspunkt_feiler(repo):
    sti, base = repo
    _skriv(sti, {f"{MSSQL}/20261020240000_d.sql": "SELECT 1;\n"})
    _feiler_med(_kjor(sti, base), "20261020240000 er ikke et gyldig tidspunkt")


def test_ny_fil_med_feil_form_feiler(repo):
    sti, base = repo
    _skriv(sti, {f"{MSSQL}/20261020120000-D.sql": "SELECT 1;\n"})
    _feiler_med(_kjor(sti, base), "har ikke formen ÅÅÅÅMMDDTTMMSS_navn.sql")


def test_mappene_vurderes_hver_for_seg(repo):
    """En ny fil i supabase/ sammenliknes bare med de mergede filene der."""
    sti, base = repo
    _skriv(sti, {f"{PG}/20261012090000_e.sql": "select 1;\n"})
    assert _kjor(sti, base).returncode == 0
