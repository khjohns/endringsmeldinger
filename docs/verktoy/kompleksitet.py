"""Kompleksiteten per funksjon og de største filene i kjerne/, src/ og server/ (#2268).

Kjøres fra repo-roten: python3 docs/verktoy/kompleksitet.py [--filer N]
Skriptet er et signal til den ukentlige gjennomgangen i skillen `forbruk`, og
stopper ingenting: det avslutter med 0 også når en funksjon er over grensene.

Kompleksiteten måles med eslint-regelen `complexity` fra kommandolinja, med
oppsettet i repoet for å lese TypeScript og Svelte. Testfilene er utenfor, som i
målingen i #2268. Filstørrelsen gjelder alle sporede kildefiler i mappene, også
testene, fordi en økt betaler for hver fil den leser.
"""

import argparse
import json
import pathlib
import re
import subprocess
import sys

MAPPER = ("kjerne", "src", "server")
GRENSER = (12, 20)
KILDEFIL = re.compile(r"\.(ts|js|mjs|cjs|svelte)$")
TESTFIL = re.compile(r"(^|/)(tester|__tests__)/|\.(test|spec)\.|(^|/)test-setup\.")
MELDING = re.compile(r"^(.*?) has a complexity of (\d+)\.")
NAVN = re.compile(r"'([^']+)'")


def rot() -> pathlib.Path:
    return pathlib.Path(
        subprocess.run(
            ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True
        ).stdout.strip()
    )


def kjoer_eslint(repo: pathlib.Path) -> list[dict]:
    """Rapporten fra eslint som JSON. Grensen 0 gir én melding per funksjon, og
    `--no-inline-config` hindrer at en kommentar i koden skjuler en funksjon."""
    resultat = subprocess.run(
        [
            "npx", "eslint", "--no-inline-config", "--no-warn-ignored", "--format", "json",
            "--rule", '{"complexity": ["warn", 0]}', *MAPPER,
        ],
        cwd=repo, capture_output=True, text=True, check=False,
    )
    if not resultat.stdout.strip():
        raise RuntimeError(f"eslint ga ingen rapport (exit {resultat.returncode}): {resultat.stderr[-2000:]}")
    return json.loads(resultat.stdout)


def funksjoner(rapport: list[dict], repo: pathlib.Path) -> tuple[list[dict], list[str]]:
    """Én rad per funksjon utenfor testfilene, og filene eslint ikke kunne lese."""
    rader, uleste = [], []
    for fil in rapport:
        sti = pathlib.Path(fil["filePath"]).resolve().relative_to(repo.resolve()).as_posix()
        if TESTFIL.search(sti):
            continue
        for melding in fil["messages"]:
            if melding.get("fatal"):
                uleste.append(sti)
            if melding.get("ruleId") != "complexity":
                continue
            treff = MELDING.match(melding["message"])
            if not treff:
                continue
            navn = NAVN.search(treff.group(1))
            rader.append(
                {
                    "mappe": sti.split("/")[0],
                    "navn": navn.group(1) if navn else None,
                    "sted": f"{sti}:{melding['line']}",
                    "kompleksitet": int(treff.group(2)),
                }
            )
    return rader, uleste


def filstorrelser(repo: pathlib.Path) -> list[tuple[str, int, int]]:
    """(sti, linjer, byte) for hver sporet kildefil i mappene, størst først."""
    sporet = subprocess.run(
        ["git", "ls-files", "-z", "--", *MAPPER], cwd=repo, capture_output=True, text=True, check=True
    ).stdout.split("\0")
    storrelser = []
    for sti in filter(KILDEFIL.search, sporet):
        if not (repo / sti).is_file():
            continue
        innhold = (repo / sti).read_bytes()
        storrelser.append((sti, innhold.count(b"\n"), len(innhold)))
    return sorted(storrelser, key=lambda rad: (-rad[1], rad[0]))


def _funksjonsnavn(rad: dict) -> str:
    return f"`{rad['navn']}` (`{rad['sted']}`)" if rad["navn"] else f"`{rad['sted']}`"


def tabell(rader: list[dict], storrelser: list[tuple[str, int, int]], antall_filer: int) -> str:
    lav, hoy = GRENSER
    linjer = [
        "Kompleksitet per funksjon (eslint `complexity`, uten testfilene)",
        "",
        f"| | Funksjoner | Over {lav} | Over {hoy} | Høyest |",
        "| --- | --- | --- | --- | --- |",
    ]
    for mappe in MAPPER:
        egne = sorted(
            (r for r in rader if r["mappe"] == mappe), key=lambda r: (-r["kompleksitet"], r["sted"])
        )
        hoyest = ", ".join(f"{_funksjonsnavn(r)} {r['kompleksitet']}" for r in egne[:3])
        linjer.append(
            f"| `{mappe}/` | {len(egne)} | {sum(r['kompleksitet'] > lav for r in egne)} "
            f"| {sum(r['kompleksitet'] > hoy for r in egne)} | {hoyest} |"
        )
    linjer += [
        "",
        f"De {antall_filer} største filene (sporede kildefiler, med testene)",
        "",
        "| Fil | Linjer | kB |",
        "| --- | --- | --- |",
    ]
    linjer += [f"| `{sti}` | {n} | {round(byte / 1024)} |" for sti, n, byte in storrelser[:antall_filer]]
    return "\n".join(linjer)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--filer", type=int, default=10, help="antall filer i tabellen over størrelse")
    args = parser.parse_args(argv)
    repo = rot()
    rader, uleste = funksjoner(kjoer_eslint(repo), repo)
    print(tabell(rader, filstorrelser(repo), args.filer))
    if uleste := sorted(set(uleste)):
        print(f"\neslint kunne ikke lese {len(uleste)} filer: {', '.join(uleste)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
