"""Skjemaet slik katalogen i SQL Server viser det, til ER-diagrammet (spor M, fase 1c).

Tabellene, nøklene og kolonnene leses i sys.tables og sys.foreign_keys i en base
runneren bygger fra database/migrasjoner/, av server/tester/katalog.ts, og krever
KOE_SQLSERVER_TILKOBLING (#558). De skrives til docs/datamodell/katalog.json, som
diagrammet og relasjonsregisteret lages fra.

Oppdater øyeblikksbildet fra repo-roten etter en ny migrasjon:
  KOE_SQLSERVER_TILKOBLING=... python3 docs/verktoy/katalog.py
"""

import json
import os
import pathlib
import re
import subprocess
import sys

ROT = pathlib.Path(__file__).resolve().parents[2]
KATALOG = ROT / "docs" / "datamodell" / "katalog.json"


def les_sqlserver() -> dict:
    """Tabellene i SQL Server, med navnet kvalifisert med skjemaet (`koe.app_users`)."""
    svar = subprocess.run(
        ["node", "server/tester/katalog.ts"], cwd=ROT, capture_output=True, text=True, check=False
    )
    if svar.returncode != 0:
        raise RuntimeError(f"server/tester/katalog.ts feilet:\n{svar.stderr}")
    return json.loads(svar.stdout)


def les(sti: pathlib.Path = KATALOG) -> dict:
    return json.loads(sti.read_text(encoding="utf-8"))


_LISTE_AV_VERDIER = re.compile(r"\[\s+([^\[\]{}]*?)\s+\]")


def serialiser(katalog: dict) -> str:
    """JSON med én linje per kolonne og nøkkel, så en endring gir en lesbar diff."""
    tekst = json.dumps(katalog, ensure_ascii=False, indent=1)
    return _LISTE_AV_VERDIER.sub(lambda m: "[" + " ".join(m.group(1).split()) + "]", tekst) + "\n"


def main() -> int:
    if not os.environ.get("KOE_SQLSERVER_TILKOBLING"):
        print("KOE_SQLSERVER_TILKOBLING er ikke satt. Katalogen leses fra en base bygget fra migrasjonene.")
        return 1
    katalog = {"sqlserver": les_sqlserver()}
    ny = serialiser(katalog)
    if not KATALOG.exists() or KATALOG.read_text(encoding="utf-8") != ny:
        KATALOG.write_text(ny, encoding="utf-8")
        print(f"skrev {KATALOG.relative_to(ROT)}")
    print(f"{len(katalog['sqlserver']['tabeller'])} tabeller i SQL Server")
    return 0


if __name__ == "__main__":
    sys.exit(main())
