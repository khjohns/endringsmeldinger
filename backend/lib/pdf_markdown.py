"""Markdown til markup for ReportLab-`Paragraph`, felles for brev og rapport.

Hver linje escapes før den konverteres, slik at markup i inndata blir tekst.
Uttrykkene kjøres i fast rekkefølge; atferden er fastholdt i
`tests/test_lib/test_pdf_markdown.py`. Tabeller støttes ikke.

Fet og kursiv krever ordgrense utenfor markøren og ikke-mellomrom innenfor
(#124), slik at `snake_case` og `a * b * c` blir stående som tekst.

Kodespenn er bokstavelige (#133): de tas ut før de andre uttrykkene og settes
tilbake til slutt. Plassholderen `<n>` kan ikke stå i en escapet linje.
"""

import re
from html import escape

FET_STJERNE = re.compile(r"(?<!\w)\*\*([^\s*](?:[^*]*[^\s*])?)\*\*(?!\w)")
FET_UNDERSTREK = re.compile(r"(?<!\w)__([^\s_](?:.*?[^\s_])??)__(?!\w)")
KURSIV_STJERNE = re.compile(r"(?<![\w*])\*([^\s*](?:[^*]*[^\s*])?)\*(?![\w*])")
KURSIV_UNDERSTREK = re.compile(r"(?<!\w)_([^\s_](?:.*?[^\s_])??)_(?!\w)")
KODESPENN = re.compile(r"`([^`]+)`")
PLASSHOLDER = re.compile(r"<(\d+)>")
KODE_FONT = '<font face="Courier" color="#C7254E">{}</font>'


def _sett_tilbake(kodespenn: list[str]):
    return lambda match: KODE_FONT.format(kodespenn[int(match.group(1))])


def markdown_to_reportlab(text: str) -> str:
    result_lines = []

    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = escape(line)
        deler = KODESPENN.split(line)
        kodespenn = deler[1::2]
        line = "".join(
            del_ if i % 2 == 0 else f"<{i // 2}>" for i, del_ in enumerate(deler)
        )

        if line.startswith("### "):
            line = f'<font size="11"><b>{line[4:]}</b></font>'
        elif line.startswith("## "):
            line = f'<font size="12"><b>{line[3:]}</b></font>'
        elif line.startswith("# "):
            line = f'<font size="14"><b>{line[2:]}</b></font>'
        elif match := re.match(r"^#{4,6} ", line):
            line = f"<b>{line[match.end():]}</b>"
        elif re.match(r"^[\t ]*[-*+] \S", line):
            line = re.sub(r"^[\t ]*([-*+]) ", "    • ", line)
        elif re.match(r"^[\t ]*\d+\. \S", line):
            line = re.sub(r"^[\t ]*(\d+)\. ", r"    \1. ", line)

        line = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", line)

        line = FET_STJERNE.sub(r"<b>\1</b>", line)
        line = FET_UNDERSTREK.sub(r"<b>\1</b>", line)

        line = KURSIV_STJERNE.sub(r"<i>\1</i>", line)
        line = KURSIV_UNDERSTREK.sub(r"<i>\1</i>", line)

        line = re.sub(r"~~([^~]+)~~", r"<strike>\1</strike>", line)

        line = PLASSHOLDER.sub(_sett_tilbake(kodespenn), line)

        result_lines.append(line)

    return "<br/>".join(result_lines)
