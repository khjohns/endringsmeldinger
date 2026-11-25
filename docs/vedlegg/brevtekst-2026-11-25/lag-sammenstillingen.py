"""Lager sammenstilling.html: forslagene fra sparringen i #2337 som hele brev side om side.

Teksten står i sammenstilling-tekst.md. En linje `<!-- brev NN -->` der blir et rutenett
med dagens brev (brev-NN-*.md, laget av kjernen) og brevet slik hver modell skrev det om
(sparring-*.md, svarene ordrett fra #2337). Kjøres fra roten av repoet:

    python3 docs/vedlegg/brevtekst-2026-11-25/lag-sammenstillingen.py
"""

from __future__ import annotations

import html
import re
from pathlib import Path

MAPPA = Path(__file__).resolve().parent
MODELLENE = [("fable", "Fable"), ("codex", "Codex (Astra)"), ("gemini", "Gemini (Argon)")]


def inline(tekst: str) -> str:
    t = html.escape(tekst, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\w*])\*([^*\s][^*]*)\*(?![\w*])", r"<em>\1</em>", t)
    t = re.sub(r"(?<![\w_])_([^_\s][^_]*)_(?![\w_])", r"<em>\1</em>", t)
    t = re.sub(r"~~([^~]+)~~", r"<del>\1</del>", t)
    t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', t)
    return t


def som_html(markdown: str, overskrift_ned: int = 0) -> str:
    """Et lite utvalg av Markdown: overskrifter, avsnitt, lister, tabeller og sitat."""
    ut: list[str] = []
    blokker = re.split(r"\n\s*\n", markdown.strip("\n"))
    for blokk in blokker:
        linjer = blokk.split("\n")
        foerste = linjer[0]
        if all(l.startswith(">") for l in linjer):
            ut.append(f"<blockquote>{som_html(chr(10).join(re.sub(r'^> ?', '', l) for l in linjer))}</blockquote>")
        elif len(linjer) == 1 and (m := re.match(r"^(#{1,6}) (.*)$", foerste)):
            n = min(6, len(m.group(1)) + overskrift_ned)
            ut.append(f"<h{n}>{inline(m.group(2))}</h{n}>")
        elif foerste.startswith("|"):
            rader = [r for r in linjer if not re.match(r"^\|\s*:?-{3,}", r)]
            celler = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rader]
            hode = "".join(f"<th>{inline(c)}</th>" for c in celler[0])
            kropp = "".join(
                "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in rad) + "</tr>" for rad in celler[1:]
            )
            ut.append(f"<table><thead><tr>{hode}</tr></thead><tbody>{kropp}</tbody></table>")
        elif re.match(r"^\s*(-|\d+\.) ", foerste):
            nummerert = bool(re.match(r"^\s*\d+\. ", foerste))
            punkter: list[str] = []
            for l in linjer:
                if re.match(r"^\s*(-|\d+\.) ", l):
                    punkter.append(re.sub(r"^\s*(-|\d+\.) ", "", l))
                else:
                    punkter[-1] += " " + l.strip()
            tagg = "ol" if nummerert else "ul"
            start = re.match(r"^\s*(\d+)\.", foerste)
            attr = f' start="{start.group(1)}"' if nummerert and start and start.group(1) != "1" else ""
            ut.append(f"<{tagg}{attr}>" + "".join(f"<li>{inline(p)}</li>" for p in punkter) + f"</{tagg}>")
        elif foerste.strip() in ("---", "***"):
            ut.append("<hr>")
        else:
            tekst = "<br>".join(inline(l.rstrip()) for l in linjer)
            ut.append(f"<p>{tekst}</p>")
    return "\n".join(ut)


def dagens(nn: str) -> str:
    fil = next(MAPPA.glob(f"brev-{nn}-*.md"))
    return fil.read_text(encoding="utf-8").split("\n---\n", 1)[1]


def omskrevet(modell: str, nn: str) -> str | None:
    """Brevet modellen skrev om for tilfelle `nn`, fra overskriften «### Brev NN» i svaret."""
    tekst = (MAPPA / f"sparring-{modell}.md").read_text(encoding="utf-8")
    m = re.search(rf"^### Brev {nn}\b.*$", tekst, flags=re.M)
    if not m:
        return None
    resten = tekst[m.end():]
    slutt = re.search(r"^(---\s*$|### Brev |## )", resten, flags=re.M)
    brevet = resten[: slutt.start()] if slutt else resten
    linjer = [re.sub(r"^> ?", "", l) for l in brevet.strip("\n").split("\n")]
    return "\n".join(linjer)


def rutenett(nn: str) -> str:
    kolonner = [("I dag (kjernen)", dagens(nn))]
    for modell, navn in MODELLENE:
        b = omskrevet(modell, nn)
        kolonner.append((navn, b if b is not None else "_Ikke skrevet om i dette svaret._"))
    celler = "".join(
        f'<section class="brev"><h4 class="kolonne">{html.escape(navn)}</h4>{som_html(tekst, 2)}</section>'
        for navn, tekst in kolonner
    )
    return f'<div class="rutenett">{celler}</div>'


STIL = """
:root { --bg:#fff; --fg:#1d1d1f; --demp:#5b5b66; --kant:#d8d8de; --flate:#f6f6f8; --merke:#2a5bd7; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg:#16161a; --fg:#e8e8ec; --demp:#a3a3ad; --kant:#33333b; --flate:#1f1f25; --merke:#8fb0ff; } }
:root[data-theme="dark"] { --bg:#16161a; --fg:#e8e8ec; --demp:#a3a3ad; --kant:#33333b; --flate:#1f1f25; --merke:#8fb0ff; }
body { background:var(--bg); color:var(--fg); font:16px/1.5 system-ui, sans-serif; margin:0; padding:24px 16px 64px; }
main { max-width:1500px; margin:0 auto; }
h1 { font-size:1.6rem; } h2 { margin-top:2.5rem; border-bottom:1px solid var(--kant); padding-bottom:.3rem; }
a { color:var(--merke); }
table { border-collapse:collapse; margin:.5rem 0 1rem; font-size:.92rem; }
th, td { border:1px solid var(--kant); padding:.35rem .5rem; text-align:left; vertical-align:top; }
th { background:var(--flate); }
.rutenett { display:grid; grid-template-columns:repeat(4, minmax(280px, 1fr)); gap:12px; overflow-x:auto; }
.brev { background:var(--flate); border:1px solid var(--kant); border-radius:8px; padding:12px 14px; font-size:.9rem; }
.brev h4.kolonne { margin:0 0 .6rem; color:var(--demp); font-size:.8rem; text-transform:uppercase; letter-spacing:.04em; }
.brev h3, .brev h4, .brev h5, .brev h6 { font-size:.95rem; margin:1rem 0 .3rem; }
.brev p { margin:.4rem 0; }
blockquote { margin:0; padding:0; }
@media (max-width: 900px) { .rutenett { grid-template-columns:repeat(4, 85vw); } }
"""


def main() -> None:
    kilde = (MAPPA / "sammenstilling-tekst.md").read_text(encoding="utf-8")
    deler = re.split(r"^<!-- brev (\d\d) -->$", kilde, flags=re.M)
    kropp = [som_html(deler[0])]
    for i in range(1, len(deler), 2):
        kropp.append(rutenett(deler[i]))
        kropp.append(som_html(deler[i + 1]))
    dokument = (
        '<!doctype html>\n<html lang="nb">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        "<title>Brevteksten side om side</title>\n"
        f"<style>{STIL}</style>\n</head>\n<body>\n<main>\n" + "\n".join(kropp) + "\n</main>\n</body>\n</html>\n"
    )
    (MAPPA / "sammenstilling.html").write_text(dokument, encoding="utf-8")


if __name__ == "__main__":
    main()
