"""Kontrollerer lokale lenker og ankre i Markdown under docs/.

Kjøres fra repo-roten: python3 docs/verktoy/lenkekontroll.py [filer ...]
Uten argumenter kontrolleres alle .md-filer under docs/.
"""

import pathlib
import re
import sys
import unicodedata
from urllib.parse import unquote

KODEBLOKK = re.compile(r"^(```|~~~).*?^\1[^\n]*$", re.S | re.M)
INLINE_KODE = re.compile(r"`[^`\n]*`")
LENKE = re.compile(r"\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
OVERSKRIFT = re.compile(r"^#{1,6}\s+(.*?)\s*#*\s*$", re.M)
EKSPLISITT_ID = re.compile(r"""(?:id|name)=["']([^"']+)["']""")
EKSTERN = re.compile(r"^(https?:|mailto:|file:)")


def github_slug(overskrift: str) -> str:
    tekst = re.sub(r"<[^>]+>", "", overskrift)
    tekst = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", tekst).replace("`", "")
    beholdt = [
        tegn
        for tegn in tekst.strip().lower()
        if tegn in " -" or unicodedata.category(tegn)[0] in "LNM" or unicodedata.category(tegn) == "Pc"
    ]
    return "".join(beholdt).replace(" ", "-")


def ankre(sti: pathlib.Path) -> set[str]:
    tekst = KODEBLOKK.sub("", sti.read_text(encoding="utf-8"))
    sett: dict[str, int] = {}
    resultat = set(EKSPLISITT_ID.findall(tekst))
    for treff in OVERSKRIFT.finditer(tekst):
        slug = github_slug(treff.group(1))
        n = sett.get(slug, 0)
        resultat.add(slug if n == 0 else f"{slug}-{n}")
        sett[slug] = n + 1
    return resultat


def main(filer: list[str]) -> int:
    stier = [pathlib.Path(f) for f in filer] or sorted(pathlib.Path("docs").rglob("*.md"))
    brutte = 0
    linjeankre = 0
    for sti in stier:
        tekst = INLINE_KODE.sub("", KODEBLOKK.sub("", sti.read_text(encoding="utf-8")))
        for treff in LENKE.finditer(tekst):
            mål = treff.group(1)
            if EKSTERN.match(mål):
                continue
            fil, _, fragment = mål.partition("#")
            destinasjon = (sti.parent / unquote(fil)).resolve() if fil else sti.resolve()
            if not destinasjon.exists():
                print("BRUTT FIL:", sti, "->", mål)
                brutte += 1
            elif fragment and destinasjon.suffix != ".md":
                linjeankre += 1
            elif fragment and unquote(fragment) not in ankre(destinasjon):
                print("BRUTT ANKER:", sti, "->", mål)
                brutte += 1
    print(f"brutte: {brutte}; ankre mot kildefiler, ikke kontrollert: {linjeankre}")
    return 1 if brutte else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
