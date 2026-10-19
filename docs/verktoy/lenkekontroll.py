"""Kontrollerer lokale lenker og ankre i Markdown.

Kjøres fra repo-roten: python3 docs/verktoy/lenkekontroll.py [filer ...]
Uten argumenter kontrolleres .md-filene git sporer under docs/ og .claude/, og
AGENTS.md og CLAUDE.md i roten. De to siste lastes automatisk i øktene og
lenker til ankre i hovedplanen (#752). Usporede filer, som arbeidstrærne i
.claude/worktrees/, kontrolleres ikke (#851).

Lenkeformene som kontrolleres: [x](mål), [x](<mål>), mål med ett nivå
parenteser, og referansedefinisjoner ([x]: mål "tittel"), men ikke fotnoter
([^1]: tekst) eller en etikett med prosa etter ([Merk]: Dette gjelder TE.).
"""

import functools
import pathlib
import re
import subprocess
import sys
import unicodedata
from urllib.parse import unquote

KODEBLOKK = re.compile(r"^(```|~~~).*?^\1[^\n]*$", re.S | re.M)
INLINE_KODE = re.compile(r"`[^`\n]*`")
MÅL = r"(<[^<>\n]+>|(?:[^()\s]|\([^()\s]*\))+)"
TITTEL = r"(?:\"[^\"]*\"|'[^']*'|\([^)]*\))"
LENKE = re.compile(r"\]\(\s*" + MÅL + r"(?:\s+" + TITTEL + r")?\s*\)")
REFERANSE = re.compile(
    r"^ {0,3}\[(?!\^)[^\]\n]+\]:[ \t]*" + MÅL + r"(?:[ \t]+" + TITTEL + r")?[ \t]*$", re.M
)
OVERSKRIFT = re.compile(r"^#{1,6}\s+(.*?)\s*#*\s*$", re.M)
EKSPLISITT_ID = re.compile(r"""(?:id|name)=["']([^"']+)["']""")
EKSTERN = re.compile(r"^(https?:|mailto:|file:)")
ROTFILER = ("AGENTS.md", "CLAUDE.md")


def github_slug(overskrift: str) -> str:
    tekst = re.sub(r"<[^>]+>", "", overskrift)
    tekst = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", tekst).replace("`", "")
    beholdt = [
        tegn
        for tegn in tekst.strip().lower()
        if tegn in " -" or unicodedata.category(tegn)[0] in "LNM" or unicodedata.category(tegn) == "Pc"
    ]
    return "".join(beholdt).replace(" ", "-")


@functools.cache
def ankre(sti: pathlib.Path) -> frozenset[str]:
    tekst = KODEBLOKK.sub("", sti.read_text(encoding="utf-8"))
    sett: dict[str, int] = {}
    resultat = set(EKSPLISITT_ID.findall(tekst))
    for treff in OVERSKRIFT.finditer(tekst):
        slug = github_slug(treff.group(1))
        n = sett.get(slug, 0)
        resultat.add(slug if n == 0 else f"{slug}-{n}")
        sett[slug] = n + 1
    return frozenset(resultat)


def standardfiler() -> list[pathlib.Path]:
    sporet = subprocess.run(
        ["git", "ls-files", "-z", "--", "*.md"], capture_output=True, text=True, check=True
    ).stdout.split("\0")
    stier = [
        pathlib.Path(f)
        for f in sorted(sporet)
        if f.startswith(("docs/", ".claude/")) or f in ROTFILER
    ]
    return [s for s in stier if s.is_file()]


def lenkemål(tekst: str) -> list[str]:
    treff = [t.group(1) for t in LENKE.finditer(tekst)] + [t.group(1) for t in REFERANSE.finditer(tekst)]
    return [m[1:-1] if m.startswith("<") else m for m in treff]


def main(filer: list[str]) -> int:
    stier = [pathlib.Path(f) for f in filer] or standardfiler()
    brutte = 0
    linjeankre = 0
    for sti in stier:
        tekst = INLINE_KODE.sub("", KODEBLOKK.sub("", sti.read_text(encoding="utf-8")))
        for mål in lenkemål(tekst):
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
