"""Klassifiseringen og slettesteget i scripts/rydd_grener.py, uten nett.

git- og gh-kallene er byttet ut, så testene viser hvilke grener verktøyet
foreslår og sletter, ikke at kommandoene virker mot GitHub.
"""

import datetime
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
FASTE = {"main", "develop", "beskyttet"}


@pytest.fixture(autouse=True)
def historikk(monkeypatch):
    def er_forfar(commit, maal):
        if commit == "kan-ikke-hentes":
            raise rydd_grener.GitFeil("fetch feilet")
        return commit in I_MAIN

    monkeypatch.setattr(rydd_grener, "er_forfar", er_forfar)


def flettet_pr(gren: str, sha: str, *, repo: str = REPO, merge: str = "flettet-merge") -> dict:
    return {
        "number": 7,
        "merged_at": "2026-10-01T00:00:00Z",
        "merge_commit_sha": merge,
        "head": {"ref": gren, "sha": sha, "repo": {"full_name": repo}},
    }


def klassifiser(grener: dict[str, str], aapne: dict[str, int] | None = None, flettede=()):
    kandidater, beholdes = rydd_grener.klassifiser(
        REPO, "main", grener, FASTE, aapne or {}, list(flettede)
    )
    return {k["branch"] for k in kandidater}, dict(beholdes)


def test_gren_som_er_forfar_til_main_er_kandidat():
    kandidater, _ = klassifiser({"a": "forfar"})
    assert kandidater == {"a"}


def test_beskyttet_eller_fast_gren_beholdes_selv_om_den_er_forfar():
    kandidater, beholdes = klassifiser({"main": "forfar", "beskyttet": "forfar"})
    assert kandidater == set()
    assert beholdes == {"main": "Beskyttet eller fast gren", "beskyttet": "Beskyttet eller fast gren"}


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


def test_merge_commit_som_ikke_kan_hentes_beholder_grenen_uten_aa_avbryte():
    kandidater, beholdes = klassifiser(
        {"a": "head", "b": "forfar"}, flettede=[flettet_pr("a", "head", merge="kan-ikke-hentes")]
    )
    assert kandidater == {"b"}
    assert "a" in beholdes


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
    monkeypatch.setattr(rydd_grener, "faste_grener", lambda repo: ("main", FASTE))
    monkeypatch.setattr(rydd_grener.subprocess, "run", falsk_run)
    return kall


def skriv_plan(
    tmp_path: Path, repo: str, kandidater: list[dict], alder: datetime.timedelta = datetime.timedelta()
) -> rydd_grener.argparse.Namespace:
    laget = datetime.datetime.now(datetime.UTC) - alder
    sti = tmp_path / "plan.json"
    sti.write_text(json.dumps({"repo": repo, "created_at": laget.isoformat(), "candidates": kandidater}))
    return rydd_grener.argparse.Namespace(plan=str(sti))


def test_slett_bruker_lease_og_hopper_over_gren_i_ny_aapen_pr(tmp_path, push, monkeypatch):
    monkeypatch.setattr(rydd_grener, "grener_i_aapne_pr", lambda repo: {"b": 3})
    args = skriv_plan(tmp_path, REPO, [{"branch": "a", "sha": "s1"}, {"branch": "b", "sha": "s2"}])

    rydd_grener.slett(args)

    assert push == [["git", "push", "origin", "--delete", "a", "--force-with-lease=refs/heads/a:s1"]]


def test_slett_hopper_over_beskyttet_gren_i_planen(tmp_path, push, monkeypatch):
    monkeypatch.setattr(rydd_grener, "grener_i_aapne_pr", lambda repo: {})
    args = skriv_plan(tmp_path, REPO, [{"branch": "main", "sha": "s0"}, {"branch": "a", "sha": "s1"}])

    rydd_grener.slett(args)

    assert push == [["git", "push", "origin", "--delete", "a", "--force-with-lease=refs/heads/a:s1"]]


def test_slett_avviser_plan_eldre_enn_et_dogn(tmp_path, push):
    args = skriv_plan(tmp_path, REPO, [{"branch": "a", "sha": "s1"}], alder=datetime.timedelta(days=2))

    with pytest.raises(ValueError, match="Kjør `plan` på nytt"):
        rydd_grener.slett(args)
    assert push == []


def test_slett_avviser_plan_for_et_annet_repo(tmp_path, push):
    args = skriv_plan(tmp_path, "annen/repo", [{"branch": "a", "sha": "s1"}])

    with pytest.raises(ValueError):
        rydd_grener.slett(args)
    assert push == []
