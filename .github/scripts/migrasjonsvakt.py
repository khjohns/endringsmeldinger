"""Migrasjonsvakten (#1057 del 1): en migrasjon som er merget, er uforanderlig.

Runneren i server/migrering.ts avviser en endret, fjernet eller forbigått fil,
men bare mot en base med historikken. CI bygger basene fra tom og ser det ikke.
Vakten sammenlikner derfor HEAD med BASE i git, for hver mappe i MAPPER:

- en fil i BASE skal finnes i HEAD med samme innhold, byte for byte
  (`.claude/rules/database.md`: også kommentarene er en del av fila);
- en ny fil skal ha formen ÅÅÅÅMMDDTTMMSS_navn.sql, et gyldig tidspunkt og en
  versjon som er høyere enn hver versjon i BASE, ellers ville runneren nekte å
  anvende den på en base som har den høyeste;
- ingen to filer i HEAD har samme versjon.

Lokalt: python3 .github/scripts/migrasjonsvakt.py <BASE>, der BASE er tuppen
av basegrenen uten endringene som skal prøves. Hvordan CI velger BASE, står i
.github/workflows/migrasjoner.yml.
"""

import re
import subprocess
import sys
from datetime import datetime

MAPPER = ("database/migrasjoner", "supabase/migrations")
FILNAVN = re.compile(r"^(\d{14})_[a-z0-9_]+\.sql$")


def filer(ref: str, mappe: str) -> dict[str, str]:
    """Filnavn til blob-sum for filene rett under `mappe` i `ref`."""
    ut = subprocess.run(
        ["git", "ls-tree", "-z", "--full-tree", ref, "--", f"{mappe}/"],
        check=True, capture_output=True, text=True,
    ).stdout
    resultat = {}
    for linje in filter(None, ut.split("\0")):
        hode, sti = linje.split("\t", 1)
        resultat[sti.rsplit("/", 1)[-1]] = hode.split()[2]
    return resultat


def gyldig_tidspunkt(versjon: str) -> bool:
    try:
        datetime.strptime(versjon, "%Y%m%d%H%M%S")
    except ValueError:
        return False
    return True


def kontroller(base: str, mappe: str) -> list[str]:
    for_ = filer(base, mappe)
    etter = filer("HEAD", mappe)
    funn = []
    for navn, blob in sorted(for_.items()):
        if navn not in etter:
            funn.append(f"{mappe}/{navn} er merget, men er fjernet eller omdøpt.")
        elif etter[navn] != blob:
            funn.append(f"{mappe}/{navn} er merget, men er endret. Skriv en ny migrasjon i stedet.")
    hoyeste = max((m.group(1) for n in for_ if (m := FILNAVN.match(n))), default="")
    versjoner: dict[str, list[str]] = {}
    for navn in sorted(etter):
        treff = FILNAVN.match(navn)
        if navn in for_:
            if treff:
                versjoner.setdefault(treff.group(1), []).append(navn)
            continue
        if not treff:
            funn.append(f"{mappe}/{navn} har ikke formen ÅÅÅÅMMDDTTMMSS_navn.sql.")
            continue
        versjon = treff.group(1)
        versjoner.setdefault(versjon, []).append(navn)
        if not gyldig_tidspunkt(versjon):
            funn.append(f"{mappe}/{navn}: {versjon} er ikke et gyldig tidspunkt.")
        if versjon <= hoyeste:
            funn.append(
                f"{mappe}/{navn} er ny, men versjonen {versjon} er ikke høyere enn "
                f"{hoyeste}, som alt er merget. Gi fila et senere tidsstempel."
            )
    for versjon, navn in sorted(versjoner.items()):
        if len(navn) > 1:
            funn.append(f"{mappe}: versjonen {versjon} har flere filer: {', '.join(navn)}.")
    return funn


def main() -> int:
    if len(sys.argv) != 2:
        print(f"Bruk: {sys.argv[0]} <BASE>", file=sys.stderr)
        return 2
    base = sys.argv[1]
    funn = [f for mappe in MAPPER for f in kontroller(base, mappe)]
    for f in funn:
        print(f"::error::{f}")
    if not funn:
        print(f"Migrasjonene i {' og '.join(MAPPER)} er uendret mot {base}, og de nye kommer etter dem.")
    return 1 if funn else 0


if __name__ == "__main__":
    sys.exit(main())
