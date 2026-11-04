"""Filene der mer enn kommentarene er endret: regelversjonsvakten (#1549).

En fil er uendret når koden uten kommentarer er lik før og etter. TypeScript og
JavaScript skrives ut av TypeScript-printeren uten kommentarer og JSDoc
(`uten_kommentarer.mjs`), Python sammenlignes som syntakstre, der en docstring er
en streng og teller. Formateringen ses det dermed også bort fra. Kan en av
versjonene ikke leses eller parses, eller er språket ukjent, er fila endret.

Leser `git diff --name-status --no-renames FRA HEAD` på stdin og skriver stien
til hver fil som er endret, lagt til eller slettet.

Bruk: git -c core.quotePath=false diff --name-status --no-renames FRA HEAD \\
  -- <stier> | python3 kommentarer.py FRA
"""

import ast
import subprocess
import sys
from pathlib import Path

SKRIVER = Path(__file__).with_name("uten_kommentarer.mjs")


def uten_kommentarer(innhold: str, sti: str) -> str | None:
    """Koden i `sti` uten kommentarer, eller None når den ikke kan leses."""
    if sti.endswith(".py"):
        try:
            return ast.dump(ast.parse(innhold))
        except (SyntaxError, ValueError):
            return None
    if not sti.endswith((".ts", ".mts", ".cts", ".js", ".mjs", ".cjs")):
        return None
    try:
        svar = subprocess.run(["node", str(SKRIVER), sti], input=innhold, capture_output=True, text=True, check=False)
    except OSError as feil:
        svar = subprocess.CompletedProcess([], 1, "", str(feil))
    if svar.returncode == 0:
        return svar.stdout
    if svar.returncode != 3:
        print(f"Kunne ikke fjerne kommentarene i {sti}, så fila regnes som endret: {svar.stderr.strip()}", file=sys.stderr)
    return None


def bare_kommentarer(for_: str, etter: str, sti: str) -> bool:
    if for_ == etter:
        return True
    uten = uten_kommentarer(for_, sti)
    return uten is not None and uten == uten_kommentarer(etter, sti)


def tekst(ref: str, sti: str) -> str:
    return subprocess.run(["git", "show", f"{ref}:{sti}"], check=True, capture_output=True, text=True).stdout


def main() -> int:
    fra = sys.argv[1]
    for linje in sys.stdin.read().splitlines():
        if not linje.strip():
            continue
        status, sti = linje.split("\t")[0], linje.split("\t")[-1]
        if status != "M" or not bare_kommentarer(tekst(fra, sti), tekst("HEAD", sti), sti):
            print(sti)
    return 0


if __name__ == "__main__":
    sys.exit(main())
