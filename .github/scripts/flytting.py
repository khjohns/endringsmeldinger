"""De endrede filene i kjernen ut over en flytting: regelversjonsvakten (#309).

Leser `git diff --name-status -M FRA HEAD` for kjernen på stdin og skriver hver
fil som er endret ut over en flytting, med stien i HEAD, eller i FRA for en
slettet fil. En omdøpt eller endret fil regnes som bare flyttet når teksten
utenfor import- og eksportsetningene med sti er byte-lik, og hver relativ sti i
dem peker på den samme fila, regnet gjennom omdøpingene. I setningene ses det
bort fra blanktegn og et komma før `}`, som prettier legger til når en import
brytes over flere linjer. Kjenner ikke git igjen omdøpingen, er fila ny, og den
regnes som endret.

En fil som flyttes ut av en av mappene etter `--dekket`, regnes som endret og
skrives med stien i FRA, så det vakten dekker, ikke krymper ved en flytting. En
flytting inn i mappene utvider dekningen.

Bruk: git diff --name-status -M FRA HEAD -- kjerne/ | python3 flytting.py FRA [--dekket MAPPE/ ...]
"""

import posixpath
import re
import subprocess
import sys

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
            spes = omdoept.get(maal, omdoept.get(maal + ".ts", maal))
        deler.append(f"{hode}<{spes}>")
        start = m.end()
    deler.append(innhold[start:])
    return deler


def main() -> int:
    base, *resten = sys.argv[1:]
    dekket = tuple(resten[1:]) if resten[:1] == ["--dekket"] else ()
    linjer = [l.split("\t") for l in sys.stdin.read().splitlines() if l.strip()]
    omdoept = {l[1]: l[2] for l in linjer if l[0].startswith("R")}
    for l in linjer:
        status = l[0][0]
        if status in "RM":
            gammel, ny = (l[1], l[2]) if status == "R" else (l[1], l[1])
            if dekket and gammel.startswith(dekket) and not ny.startswith(dekket):
                print(gammel)
                continue
            for_ = normalisert(tekst(base, gammel), gammel, omdoept)
            etter = normalisert(tekst("HEAD", ny), ny, {})
            # En sti i HEAD uten endelse beholder formen fra BASE.
            if [d.replace(".ts>", ">") for d in for_] == [d.replace(".ts>", ">") for d in etter]:
                continue
            print(ny)
        else:
            print(l[-1])
    return 0


if __name__ == "__main__":
    sys.exit(main())
