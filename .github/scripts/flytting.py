"""Hvilke versjoner endringene i kjernen krever: regelversjonsvakten (#309).

Leser `git diff --name-status -M FRA HEAD` for kjernen utenom testene på stdin og
skriver én linje per krav, `REGELVERSJON<TAB>sti` eller
`PROJEKSJONSVERSJON<TAB>sti`. En fil som bare er flyttet, skrives som
`flyttet<TAB>sti`. Omfanget står bare her: REGELVERSJON dekker `REGELVERSJON`,
PROJEKSJONSVERSJON resten av kjernen (B-14, MM-U11, #330).

En omdøpt eller endret fil er bare flyttet når teksten utenfor import- og
eksportsetningene med sti er byte-lik, og hver relativ sti i dem peker på den
samme fila, regnet gjennom omdøpingene. I setningene ses det bort fra blanktegn
og et komma før `}`, som prettier legger til når en import brytes over flere
linjer. En import med doble anførselstegn eller noe etter stien er tekst og må
være lik. Kjenner ikke git igjen omdøpingen, er fila slettet og ny, og begge
teller som endret.

En endret fil krever versjonene for både den gamle og den nye plassen. En fil
som bare er flyttet, krever versjonen som dekket den gamle plassen og ikke den
nye, så det vakten dekker, ikke krymper ved en flytting.

Bruk: git -c core.quotePath=false diff --name-status -M FRA HEAD \\
  -- kjerne/ ':(exclude)kjerne/tester' | python3 flytting.py FRA
"""

import posixpath
import re
import subprocess
import sys

REGELVERSJON = ("kjerne/regler/", "kjerne/frosset/")


def dekker(versjon: str, sti: str) -> bool:
    if versjon == "REGELVERSJON":
        return sti.startswith(REGELVERSJON)
    return sti.startswith("kjerne/") and not sti.startswith("kjerne/regler/")


SETNING = re.compile(r"^(?:import|export)\b[^;'\"]*?\bfrom\s*'([^']*)';|^import\s*'([^']*)';", re.MULTILINE)


def tekst(ref: str, sti: str) -> str:
    return subprocess.run(["git", "show", f"{ref}:{sti}"], check=True, capture_output=True, text=True).stdout


def normalisert(innhold: str, sti: str, omdoept: dict[str, str]) -> list[str]:
    """Teksten mellom setningene, og hver setning uten blanktegn med målet løst."""
    deler, start = [], 0
    for m in SETNING.finditer(innhold):
        deler.append(innhold[start:m.start()])
        spes = m.group(1) if m.group(1) is not None else m.group(2)
        hode = innhold[m.start():m.end()].replace(f"'{spes}'", "")
        hode = re.sub(r",(\s*)\}", r"\1}", re.sub(r"\s+", "", hode))
        if spes.startswith("."):
            maal = posixpath.normpath(posixpath.join(posixpath.dirname(sti), spes))
            spes = omdoept.get(maal, omdoept.get(maal + ".ts", maal)).removesuffix(".ts")
        deler.append(f"{hode}<{spes}>")
        start = m.end()
    deler.append(innhold[start:])
    return deler


def main() -> int:
    fra = sys.argv[1]
    linjer = [l.split("\t") for l in sys.stdin.read().splitlines() if l.strip()]
    omdoept = {l[1]: l[2] for l in linjer if l[0].startswith("R")}
    for l in linjer:
        status = l[0][0]
        if status in "RM":
            gammel, ny = (l[1], l[2]) if status == "R" else (l[1], l[1])
            lik = normalisert(tekst(fra, gammel), gammel, omdoept) == normalisert(tekst("HEAD", ny), ny, {})
        else:
            gammel = ny = l[-1]
            lik = False
        krav = False
        for versjon in ("REGELVERSJON", "PROJEKSJONSVERSJON"):
            if lik and dekker(versjon, gammel) and not dekker(versjon, ny):
                print(f"{versjon}\t{gammel}")
                krav = True
            elif not lik and (dekker(versjon, gammel) or dekker(versjon, ny)):
                print(f"{versjon}\t{ny if dekker(versjon, ny) else gammel}")
                krav = True
        if not krav:
            print(f"flyttet\t{ny}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
