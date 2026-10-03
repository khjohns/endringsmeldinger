"""Markdown til markup for ReportLab-`Paragraph`, felles for brev og rapport.

Hver linje escapes før den konverteres, slik at markup i inndata blir tekst.
Uttrykkene kjøres i fast rekkefølge; atferden er fastholdt i
`tests/test_lib/test_pdf_markdown.py`. Tabeller støttes ikke.

Fet og kursiv krever ordgrense utenfor markøren og ikke-mellomrom innenfor
(#124), slik at `snake_case` og `a * b * c` blir stående som tekst.
"""

import re
from html import escape

FET_STJERNE = re.compile(r"(?<!\w)\*\*([^\s*](?:[^*]*[^\s*])?)\*\*(?!\w)")
FET_UNDERSTREK = re.compile(r"(?<!\w)__([^\s_](?:.*?[^\s_])??)__(?!\w)")
KURSIV_STJERNE = re.compile(r"(?<![\w*])\*([^\s*](?:[^*]*[^\s*])?)\*(?![\w*])")
KURSIV_UNDERSTREK = re.compile(r"(?<!\w)_([^\s_](?:.*?[^\s_])??)_(?!\w)")


def markdown_to_reportlab(text: str) -> str:
    result_lines = []

    for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = escape(line)
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

        line = re.sub(
            r"`([^`]+)`", r'<font face="Courier" color="#C7254E">\1</font>', line
        )

        result_lines.append(line)

    return "<br/>".join(result_lines)
