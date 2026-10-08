#!/usr/bin/env python3
"""Rydder flettede grener på origin i to faser.

Formål: slette grener på GitHub som er fullt flettet inn i hovedgrenen, uten å
røre grener i åpne PR-er eller grener med commits som ikke er flettet.
Ansvarlig: khjohns. Avhengigheter: git og en innlogget `gh` med `--slurp`
(2.48 eller nyere), og push-tilgang til origin.

  1. python3 scripts/rydd_grener.py plan --ut kandidater.json
     Skriver kandidatene til fila og en rapport over hva som beholdes. Sletter
     ingenting.
  2. Les kandidater.json. Fjern grener du vil beholde.
  3. python3 scripts/rydd_grener.py slett --plan kandidater.json
     Avviser en plan som er eldre enn ett døgn. Hopper over beskyttede og faste
     grener og grener i åpne PR-er, og sletter resten med `--force-with-lease`
     mot SHA-en fra planen. En gren som har fått nye commits siden planen,
     avvises av GitHub og blir stående.

En gren er kandidat når SHA-en er en forfar til hovedgrenen, eller når den er
head i en flettet PR fra samme repo med uendret SHA og merge-commiten finnes i
hovedgrenen (squash og rebase). Testene i
backend/tests/test_scripts/test_rydd_grener.py prøver klassifiseringen og
slettesteget uten nett; bare en kjøring mot GitHub prøver git og gh.
"""

from __future__ import annotations

import argparse
import datetime
import json
import re
import subprocess
from typing import Any

ALLTID_BEHOLD = {"main", "master", "develop", "staging"}
MAKS_ALDER_PAA_PLAN = datetime.timedelta(days=1)


class GitFeil(RuntimeError):
    pass


def kjor(kommando: list[str], sjekk: bool = True) -> str:
    resultat = subprocess.run(kommando, capture_output=True, text=True, check=False)
    if sjekk and resultat.returncode != 0:
        raise GitFeil(f"Kommando feilet ({' '.join(kommando)}):\n{resultat.stderr.strip()}")
    return resultat.stdout.strip()


def repo_fra_url(url: str) -> str:
    """Gir 'eier/repo' fra både git@github.com:… og https://github.com/…"""
    renset = url.strip().rstrip("/").removesuffix(".git")
    treff = re.search(r"github\.com[:/](?P<eier>[^/]+)/(?P<repo>[^/]+)$", renset)
    if not treff:
        raise ValueError(f"Kunne ikke utlede GitHub-repo fra URL: {url}")
    return f"{treff.group('eier')}/{treff.group('repo')}"


def valider_origin() -> str:
    hent = repo_fra_url(kjor(["git", "remote", "get-url", "origin"])).lower()
    push = repo_fra_url(kjor(["git", "remote", "get-url", "--push", "origin"])).lower()
    if hent != push:
        raise ValueError(f"origin henter fra {hent}, men pusher til {push}.")
    return hent


def hent_fra_github(repo: str, endepunkt: str) -> list[dict[str, Any]]:
    svar = kjor(["gh", "api", f"/repos/{repo}/{endepunkt}", "--paginate", "--slurp"])
    if not svar:
        return []
    elementer: list[dict[str, Any]] = []
    for side in json.loads(svar):
        if isinstance(side, list):
            elementer.extend(side)
        elif isinstance(side, dict):
            elementer.append(side)
    return elementer


def sikre_commit(sha: str) -> None:
    if subprocess.run(["git", "cat-file", "-e", f"{sha}^{{commit}}"], capture_output=True, check=False).returncode:
        kjor(["git", "fetch", "origin", sha])


def er_forfar(commit: str, maal: str) -> bool:
    sikre_commit(commit)
    resultat = subprocess.run(
        ["git", "merge-base", "--is-ancestor", commit, maal], capture_output=True, text=True, check=False
    )
    if resultat.returncode in (0, 1):
        return resultat.returncode == 0
    raise GitFeil(
        f"merge-base feilet for {commit} mot {maal} (kode {resultat.returncode}):\n"
        f"{resultat.stderr.strip()}"
    )


def merge_commit_i(sha: str, maal: str) -> bool:
    """En merge-commit som ikke kan hentes, regnes som ikke flettet."""
    try:
        return er_forfar(sha, maal)
    except GitFeil:
        return False


def faste_grener(repo: str) -> tuple[str, set[str]]:
    """Hovedgrenen og alle grener som aldri skal slettes."""
    hovedgren = json.loads(kjor(["gh", "api", f"/repos/{repo}"])).get("default_branch", "main")
    beskyttet = {g["name"] for g in hent_fra_github(repo, "branches?protected=true&per_page=100")}
    return hovedgren, beskyttet | ALLTID_BEHOLD | {hovedgren}


def grener_i_aapne_pr(repo: str) -> dict[str, int]:
    """Både head og base, slik at en gren som er base for en åpen PR, beholdes."""
    i_bruk: dict[str, int] = {}
    for pr in hent_fra_github(repo, "pulls?state=open&per_page=100"):
        for side in ("head", "base"):
            ref = pr.get(side, {}).get("ref")
            if ref:
                i_bruk[ref] = pr["number"]
    return i_bruk


def klassifiser(
    repo: str,
    hovedgren: str,
    grener: dict[str, str],
    faste: set[str],
    i_aapne_pr: dict[str, int],
    flettede_pr: list[dict[str, Any]],
) -> tuple[list[dict[str, str]], list[tuple[str, str]]]:
    maal = f"origin/{hovedgren}"
    pr_per_gren: dict[str, list[dict[str, Any]]] = {}
    for pr in flettede_pr:
        if pr.get("merged_at") and pr.get("head", {}).get("ref"):
            pr_per_gren.setdefault(pr["head"]["ref"], []).append(pr)

    kandidater: list[dict[str, str]] = []
    beholdes: list[tuple[str, str]] = []
    for gren, sha in sorted(grener.items()):
        if gren in faste:
            beholdes.append((gren, "Beskyttet eller fast gren"))
            continue
        if gren in i_aapne_pr:
            beholdes.append((gren, f"I bruk av åpen PR #{i_aapne_pr[gren]}"))
            continue
        if er_forfar(sha, maal):
            kandidater.append({"branch": gren, "sha": sha, "reason": f"Direkte forfar til {maal}"})
            continue
        flettet = next(
            (
                pr
                for pr in pr_per_gren.get(gren, [])
                if (pr["head"].get("repo") or {}).get("full_name", "").lower() == repo
                and pr["head"].get("sha") == sha
                and pr.get("merge_commit_sha")
                and merge_commit_i(pr["merge_commit_sha"], maal)
            ),
            None,
        )
        if flettet:
            kandidater.append({
                "branch": gren,
                "sha": sha,
                "reason": (
                    f"Flettet i PR #{flettet['number']} "
                    f"(SHA matcher, merge-commit funnet i {hovedgren}-historikk)"
                ),
            })
        else:
            beholdes.append((gren, "Ikke verifisert i hovedgren / inneholder uflettede commits"))
    return kandidater, beholdes


def plan(args: argparse.Namespace) -> None:
    repo = valider_origin()
    print(f"Låst til repository: {repo}")
    kjor(["git", "fetch", "origin", "--prune"])

    hovedgren, faste = faste_grener(repo)
    sikre_commit(kjor(["git", "rev-parse", f"origin/{hovedgren}"]))
    print(f"Hovedgren: {hovedgren}. Beskyttede og faste grener beholdes: {sorted(faste)}")

    grener: dict[str, str] = {}
    for linje in kjor(["git", "ls-remote", "--heads", "origin"]).splitlines():
        if linje.strip():
            sha, ref = linje.split("\t")
            grener[ref.removeprefix("refs/heads/")] = sha
    print(f"Fant {len(grener)} grener på origin.")

    kandidater, beholdes = klassifiser(
        repo,
        hovedgren,
        grener,
        faste,
        grener_i_aapne_pr(repo),
        hent_fra_github(repo, f"pulls?state=closed&base={hovedgren}&per_page=100"),
    )

    print(f"\nBEHOLDES ({len(beholdes)}):")
    for gren, grunn in beholdes:
        print(f"  [BEHOLD] {gren:<45} -> {grunn}")
    print(f"\nKANDIDATER FOR SLETTING ({len(kandidater)}):")
    for k in kandidater:
        print(f"  [SLETT]  {k['branch']:<45} ({k['sha'][:7]}) -> {k['reason']}")

    with open(args.ut, "w", encoding="utf-8") as f:
        json.dump(
            {
                "repo": repo,
                "created_at": datetime.datetime.now(datetime.UTC).isoformat(),
                "candidates": kandidater,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )
    print(f"\nPlanen er lagret i {args.ut}. Les den, og kjør så `slett --plan {args.ut}`.")


def slett(args: argparse.Namespace) -> None:
    repo = valider_origin()
    with open(args.plan, encoding="utf-8") as f:
        manifest = json.load(f)
    if manifest.get("repo", "").lower() != repo:
        raise ValueError(f"Planen gjelder {manifest.get('repo')!r}, men origin er {repo!r}.")

    alder = datetime.datetime.now(datetime.UTC) - datetime.datetime.fromisoformat(
        manifest["created_at"]
    )
    if alder > MAKS_ALDER_PAA_PLAN:
        raise ValueError(f"Planen er {alder} gammel. Kjør `plan` på nytt.")

    kandidater = manifest.get("candidates", [])
    if not kandidater:
        print("Ingen kandidater i planen.")
        return

    _, faste = faste_grener(repo)
    i_aapne_pr = grener_i_aapne_pr(repo)
    slettet = hoppet_over = feilet = 0
    for k in kandidater:
        gren, sha = k["branch"], k["sha"]
        if gren in faste:
            print(f"  ⚠ Hopper over {gren}: beskyttet eller fast gren.")
            hoppet_over += 1
            continue
        if gren in i_aapne_pr:
            print(f"  ⚠ Hopper over {gren}: tatt i bruk i åpen PR #{i_aapne_pr[gren]} etter planen.")
            hoppet_over += 1
            continue
        resultat = subprocess.run(
            ["git", "push", "origin", "--delete", gren, f"--force-with-lease=refs/heads/{gren}:{sha}"],
            capture_output=True,
            text=True,
            check=False,
        )
        if resultat.returncode == 0:
            print(f"  ✓ Slettet {gren} (lease: {sha[:7]})")
            slettet += 1
        else:
            print(f"  ✗ Kunne ikke slette {gren}:\n    {resultat.stderr.strip()}")
            feilet += 1

    print(f"\nResultat: {slettet} slettet, {hoppet_over} hoppet over, {feilet} feilet.")
    print("Kjør `git fetch --prune` for å rydde lokale sporinger.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Trygg opprydding av flettede grener på origin.")
    kommandoer = parser.add_subparsers(dest="kommando", required=True)
    plan_parser = kommandoer.add_parser("plan", help="Lag kandidatlisten uten å slette noe")
    plan_parser.add_argument("--ut", default="kandidater.json", help="Fila planen skrives til")
    slett_parser = kommandoer.add_parser("slett", help="Slett grenene i planen")
    slett_parser.add_argument("--plan", default="kandidater.json", help="Planen som skal utføres")

    args = parser.parse_args()
    {"plan": plan, "slett": slett}[args.kommando](args)


if __name__ == "__main__":
    main()
