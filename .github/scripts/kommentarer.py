"""Koden i en TypeScript- eller JavaScript-fil uten kommentarer, for flytting.py (#1549).

En fil er uendret når koden uten kommentarer er lik før og etter. TypeScript og
JavaScript skrives ut av TypeScript-printeren uten kommentarer og JSDoc
(`uten_kommentarer.mjs`). Formateringen ses det dermed også bort fra. Språk som
ikke er TypeScript eller JavaScript, og filer som ikke kan leses eller parses,
gir None.
"""

import subprocess
import sys
from pathlib import Path

SKRIVER = Path(__file__).with_name("uten_kommentarer.mjs")


def uten_kommentarer(innhold: str, sti: str) -> str | None:
    """Koden i `sti` uten kommentarer, eller None når den ikke kan leses."""
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


def tekst(ref: str, sti: str) -> str:
    return subprocess.run(["git", "show", f"{ref}:{sti}"], check=True, capture_output=True, text=True).stdout
