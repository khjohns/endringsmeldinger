#!/usr/bin/env python3
"""Kjører en sjekk, skriver hele loggen til fil og viser bare feilene og sammendraget.

Formål: holde verktøysvarene i en skyøkt små (#2401, punkt 2). Ansvarlig: khjohns.
Avhengigheter: bare standardbiblioteket.

  python3 scripts/kort_logg.py -- npx tsc -p server/tsconfig.json
  python3 scripts/kort_logg.py --hale 30 -- npx vitest run --project node

Skriptet skriver stien til loggen, utfallet, linjene som ser ut som feil (høyst
`--feil`, uten gjentakelser) og de siste `--hale` linjene, der testverktøyene skriver
sammendraget. Fargekodene er fjernet. Utgangskoden er kommandoens. Hele loggen leses
med `grep` eller `sed -n` i fila, ikke med `cat`. Testene står i
verktoy/tester/test_skript/test_kort_logg.py.
"""

from __future__ import annotations

import argparse
import datetime
import re
import subprocess
import sys
from pathlib import Path

LOGGMAPPE = Path("/tmp/kort-logg")
ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
FEILLINJE = re.compile(
    r"error TS\d+|\berror\b|\bErrors?\b|\bFAIL(ED)?\b|\bfailed\b|AssertionError"
    r"|Traceback|^\s*[✗×]\s|^E\s{2,}",
)
INGEN_FEIL = re.compile(r"\b0 (errors?|failed)\b|\bErrors?: 0\b", re.IGNORECASE)


def er_feillinje(linje: str) -> bool:
    return bool(FEILLINJE.search(linje)) and not INGEN_FEIL.search(linje)


def kortform(linjer: list[str], maks_feil: int, hale: int) -> list[str]:
    """Feillinjene utenfor halen, uten gjentakelser og høyst `maks_feil`, og så halen."""
    start_hale = max(len(linjer) - hale, 0)
    feil: list[str] = []
    sett: set[str] = set()
    for linje in linjer[:start_hale]:
        if er_feillinje(linje) and linje not in sett:
            sett.add(linje)
            feil.append(linje)
    ut = []
    if feil:
        ut.append(f"--- feil ({len(feil)}) ---")
        ut.extend(feil[:maks_feil])
        if len(feil) > maks_feil:
            ut.append(f"... og {len(feil) - maks_feil} til i loggen")
    if linjer[start_hale:]:
        ut.append(f"--- siste {len(linjer) - start_hale} linjer ---")
        ut.extend(linjer[start_hale:])
    return ut


def loggsti(kommando: list[str]) -> Path:
    navn = re.sub(r"[^A-Za-z0-9]+", "-", " ".join(Path(k).name for k in kommando[:2]))
    tid = datetime.datetime.now(datetime.UTC).strftime("%Y%m%d-%H%M%S-%f")
    return LOGGMAPPE / f"{navn.strip('-') or 'kommando'}-{tid}.log"


def main(argv: list[str] | None = None) -> int:
    tolker = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    tolker.add_argument("--logg", type=Path, help="sti til loggen")
    tolker.add_argument(
        "--feil", type=int, default=40, help="høyst så mange feillinjer"
    )
    tolker.add_argument(
        "--hale", type=int, default=15, help="så mange linjer fra slutten"
    )
    tolker.add_argument("kommando", nargs=argparse.REMAINDER)
    args = tolker.parse_args(argv)
    kommando = args.kommando[1:] if args.kommando[:1] == ["--"] else args.kommando
    if not kommando:
        tolker.error("mangler kommandoen etter --")

    sti = args.logg or loggsti(kommando)
    sti.parent.mkdir(parents=True, exist_ok=True)
    try:
        prosess = subprocess.run(
            kommando, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False
        )
    except FileNotFoundError:
        print(f"Fant ikke kommandoen {kommando[0]}", file=sys.stderr)
        return 127
    tekst = ANSI.sub("", prosess.stdout.decode("utf-8", errors="replace"))
    sti.write_text(tekst, encoding="utf-8")

    linjer = tekst.splitlines()
    print(f"Logg: {sti} ({len(linjer)} linjer)")
    print(f"Utfall: kode {prosess.returncode}")
    for linje in kortform(linjer, args.feil, args.hale):
        print(linje[:300])
    return prosess.returncode


if __name__ == "__main__":
    sys.exit(main())
