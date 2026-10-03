"""Markdown til markup for ReportLab-`Paragraph`, felles for brev og rapport.

Hver linje escapes før den konverteres, slik at markup i inndata blir tekst.
Uttrykkene kjøres i fast rekkefølge; atferden er fastholdt i
`tests/test_lib/test_pdf_markdown.py`. Tabeller støttes ikke.
"""

import re
from html import escape


def markdown_to_reportlab(text: str) -> str:
    result_lines = []

    for line in text.split("\n"):
        line = escape(line)
        if line.startswith("### "):
            line = f'<font size="11"><b>{line[4:]}</b></font>'
        elif line.startswith("## "):
            line = f'<font size="12"><b>{line[3:]}</b></font>'
        elif line.startswith("# "):
            line = f'<font size="14"><b>{line[2:]}</b></font>'
        elif re.match(r"^[\t ]*[-*+] \S", line):
            line = re.sub(r"^[\t ]*([-*+]) ", "    • ", line)
        elif re.match(r"^[\t ]*\d+\. \S", line):
            line = re.sub(r"^[\t ]*(\d+)\. ", r"    \1. ", line)

        line = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", line)

        line = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", line)
        line = re.sub(r"__([^_]+)__", r"<b>\1</b>", line)

        line = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", line)
        line = re.sub(r"(?<!_)_([^_]+)_(?!_)", r"<i>\1</i>", line)

        line = re.sub(r"~~([^~]+)~~", r"<strike>\1</strike>", line)

        line = re.sub(
            r"`([^`]+)`", r'<font face="Courier" color="#C7254E">\1</font>', line
        )

        result_lines.append(line)

    return "<br/>".join(result_lines)
