"""Karakterisering av Markdown-konverteringen til ReportLab-markup i PDF-ene.

Testene fastholder dagens atferd, slik den var i både brev- og
rapportgeneratoren på 799619d1 (#107). Forventningene er lest ut av koden,
ikke av en Markdown-standard eller NS 8407, og de sier ingenting om hvorvidt
atferden er riktig. Flere rader viser særheter som er beholdt med vilje,
for eksempel at `snake_case` gir kursiv.
"""

import pytest

from services.letter_pdf_generator import _markdown_to_reportlab
from services.reportlab_pdf_generator import ReportLabPdfGenerator

IMPLEMENTASJONER = {
    "brev": _markdown_to_reportlab,
    "rapport": ReportLabPdfGenerator()._markdown_to_reportlab,
}

KODE = '<font face="Courier" color="#C7254E">'

TILFELLER = [
    # Overskrifter
    ("# Tittel", '<font size="14"><b>Tittel</b></font>'),
    ("## Under", '<font size="12"><b>Under</b></font>'),
    ("### Tredje", '<font size="11"><b>Tredje</b></font>'),
    ("#### Fjerde", "#### Fjerde"),
    ("#Uten mellomrom", "#Uten mellomrom"),
    ("# **fet** tittel", '<font size="14"><b><b>fet</b> tittel</b></font>'),
    ("# A & B", '<font size="14"><b>A &amp; B</b></font>'),
    # Fet og kursiv, begge former
    ("**fet**", "<b>fet</b>"),
    ("__fet__", "<b>fet</b>"),
    ("*kursiv*", "<i>kursiv</i>"),
    ("_kursiv_", "<i>kursiv</i>"),
    ("***begge***", "<i><b>begge</b></i>"),
    ("**uavsluttet", "**uavsluttet"),
    ("snake_case_navn", "snake<i>case</i>navn"),
    ("a * b * c", "a <i> b </i> c"),
    ("2 * 3 = 6", "2 * 3 = 6"),
    # Gjennomstreking og kode
    ("~~strøket~~", "<strike>strøket</strike>"),
    ("`kode`", f"{KODE}kode</font>"),
    ("`a < b`", f"{KODE}a &lt; b</font>"),
    # Lenker blir tekst med adressen i parentes
    (
        "[lenke](https://example.invalid/a?b=1&c=2)",
        "lenke (https://example.invalid/a?b=1&amp;c=2)",
    ),
    ('[x](" onload="y)', "x (&quot; onload=&quot;y)"),
    # Lister
    ("- punkt", "    • punkt"),
    ("* punkt", "    • punkt"),
    ("+ punkt", "    • punkt"),
    ("  - innrykket", "    • innrykket"),
    ("\t- tabulator", "    • tabulator"),
    ("-ikke liste", "-ikke liste"),
    ("- ", "- "),
    ("1. første", "    1. første"),
    ("  12. tolvte", "    12. tolvte"),
    ("1.ikke", "1.ikke"),
    ("- **fet** _kursiv_", "    • <b>fet</b> <i>kursiv</i>"),
    # Linjeskift
    ("linje 1\nlinje 2", "linje 1<br/>linje 2"),
    ("a\n\nb", "a<br/><br/>b"),
    ("a\r\nb", "a\r<br/>b"),
    ("", ""),
    # Norsk tekst
    ("Æøå ÆØÅ – «sitat» §32.2", "Æøå ÆØÅ – «sitat» §32.2"),
    # XML-spesialtegn og markup i inndata escapes før konverteringen
    ("a & b < c > d \"e\" 'f'", "a &amp; b &lt; c &gt; d &quot;e&quot; &#x27;f&#x27;"),
    ("<b>ikke fet</b>", "&lt;b&gt;ikke fet&lt;/b&gt;"),
    (
        '<img src="https://example.invalid/x.png"/>',
        "&lt;img src=&quot;https://example.invalid/x.png&quot;/&gt;",
    ),
    ('<font color="red">x</font>', "&lt;font color=&quot;red&quot;&gt;x&lt;/font&gt;"),
    ("&amp;", "&amp;amp;"),
]


@pytest.mark.parametrize("konverter", IMPLEMENTASJONER.values(), ids=IMPLEMENTASJONER)
@pytest.mark.parametrize(("inndata", "forventet"), TILFELLER)
def test_konvertering_fastholder_dagens_atferd(konverter, inndata, forventet):
    assert konverter(inndata) == forventet


@pytest.mark.parametrize("konverter", IMPLEMENTASJONER.values(), ids=IMPLEMENTASJONER)
def test_flere_linjer_konverteres_hver_for_seg(konverter):
    tekst = "# Varsel\nVi viser til **krav**.\n- punkt _a_\n1. punkt b"
    assert konverter(tekst) == (
        '<font size="14"><b>Varsel</b></font><br/>'
        "Vi viser til <b>krav</b>.<br/>"
        "    • punkt <i>a</i><br/>"
        "    1. punkt b"
    )
