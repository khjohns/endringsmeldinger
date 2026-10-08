"""Klassifiseringen og slettesteget i scripts/rydd_grener.py, uten nett.

git- og gh-kallene er byttet ut, så testene viser hvilke grener verktøyet
foreslår og sletter, ikke at kommandoene virker mot GitHub.
"""

import importlib.util
import json
import subprocess
from pathlib import Path

import pytest

SKRIPT = Path(__file__).resolve().parents[3] / "scripts/rydd_grener.py"
_spec = importlib.util.spec_from_file_location("rydd_grener", SKRIPT)
rydd_grener = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rydd_grener)

REPO = "eier/repo"
I_MAIN = {"forfar", "flettet-merge"}


@pytest.fixture(autouse=True)
def historikk(monkeypatch):
    monkeypatch.setattr(rydd_grener, "er_forfar", lambda commit, maal: commit in I_MAIN)


def flettet_pr(gren: str, sha: str, *, repo: str = REPO, merge: str = "flettet-merge") -> dict:
    return {
        "number": 7,
        "merged_at": "2026-10-01T00:00:00Z",
        "merge_commit_sha": merge,
        "head": {"ref": gren, "sha": sha, "repo": {"full_name": repo}},
    }


def klassifiser(grener: dict[str, str], aapne: dict[str, int] | None = None, flettede=()):
    kandidater, beholdes = rydd_grener.klassifiser(REPO, "main", grener, aapne or {}, list(flettede))
    return {k["branch"] for k in kandidater}, dict(beholdes)


def test_gren_som_er_forfar_til_main_er_kandidat():
    kandidater, _ = klassifiser({"a": "forfar"})
    assert kandidater == {"a"}


def test_gren_i_aapen_pr_beholdes_selv_om_den_er_forfar():
    kandidater, beholdes = klassifiser({"a": "forfar"}, aapne={"a": 12})
    assert kandidater == set()
    assert beholdes["a"] == "I bruk av åpen PR #12"


def test_squashflettet_gren_med_uendret_sha_er_kandidat():
    kandidater, _ = klassifiser({"a": "head"}, flettede=[flettet_pr("a", "head")])
    assert kandidater == {"a"}


def test_gren_med_commits_etter_flettingen_beholdes():
    kandidater, beholdes = klassifiser({"a": "ny"}, flettede=[flettet_pr("a", "head")])
    assert kandidater == set()
    assert "a" in beholdes


def test_flettet_pr_fra_fork_med_samme_grennavn_teller_ikke():
    kandidater, _ = klassifiser({"a": "head"}, flettede=[flettet_pr("a", "head", repo="annen/repo")])
    assert kandidater == set()


def test_merge_commit_utenfor_main_teller_ikke():
    kandidater, _ = klassifiser({"a": "head"}, flettede=[flettet_pr("a", "head", merge="borte")])
    assert kandidater == set()


@pytest.mark.parametrize(
    "url",
    [
        "git@github.com:eier/repo.git",
        "https://github.com/eier/repo",
        "https://github.com/eier/repo.git/",
    ],
)
def test_repo_fra_url(url):
    assert rydd_grener.repo_fra_url(url) == REPO


def test_repo_fra_url_avviser_annen_vert():
    with pytest.raises(ValueError):
        rydd_grener.repo_fra_url("https://gitlab.com/eier/repo")


@pytest.fixture
def push(monkeypatch):
    kall: list[list[str]] = []

    def falsk_run(kommando, **_):
        kall.append(kommando)
        return subprocess.CompletedProcess(kommando, 0, "", "")

    monkeypatch.setattr(rydd_grener, "valider_origin", lambda: REPO)
    monkeypatch.setattr(rydd_grener.subprocess, "run", falsk_run)
    return kall


def skriv_plan(tmp_path: Path, repo: str, kandidater: list[dict]) -> rydd_grener.argparse.Namespace:
    sti = tmp_path / "plan.json"
    sti.write_text(json.dumps({"repo": repo, "candidates": kandidater}))
    return rydd_grener.argparse.Namespace(plan=str(sti))


def test_slett_bruker_lease_og_hopper_over_gren_i_ny_aapen_pr(tmp_path, push, monkeypatch):
    monkeypatch.setattr(rydd_grener, "grener_i_aapne_pr", lambda repo: {"b": 3})
    args = skriv_plan(tmp_path, REPO, [{"branch": "a", "sha": "s1"}, {"branch": "b", "sha": "s2"}])

    rydd_grener.slett(args)

    assert push == [["git", "push", "origin", "--delete", "a", "--force-with-lease=refs/heads/a:s1"]]


def test_slett_avviser_plan_for_et_annet_repo(tmp_path, push, monkeypatch):
    monkeypatch.setattr(rydd_grener, "grener_i_aapne_pr", lambda repo: {})
    args = skriv_plan(tmp_path, "annen/repo", [{"branch": "a", "sha": "s1"}])

    with pytest.raises(ValueError):
        rydd_grener.slett(args)
    assert push == []
