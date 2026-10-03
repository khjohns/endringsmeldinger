"""Karakterisering av Markdown-konverteringen til ReportLab-markup i PDF-ene.

Testene fastholder dagens atferd, slik den var i både brev- og
rapportgeneratoren på 799619d1 før konverteringen ble samlet (#107). De ble
kjørt grønt mot begge de gamle implementasjonene før flyttingen.
Forventningene er lest ut av koden, ikke av en Markdown-standard eller
NS 8407, og de sier ingenting om hvorvidt atferden er riktig.

Fire særheter ble rettet i #124 etter oppdragsgivers beslutning 03.10, fordi
kursiv midt i et ord kan endre lesningen av et formelt brev. Radene som
fastholdt dem, er flyttet fra `TILFELLER` til `RETTET_I_124` med den nye
forventningen, og kilden er issuet, ikke koden.
"""

import pytest

from lib.pdf_markdown import markdown_to_reportlab
from services import letter_pdf_generator, reportlab_pdf_generator

KODE = '<font face="Courier" color="#C7254E">'

TILFELLER = [
    # Overskrifter
    ("# Tittel", '<font size="14"><b>Tittel</b></font>'),
    ("## Under", '<font size="12"><b>Under</b></font>'),
    ("### Tredje", '<font size="11"><b>Tredje</b></font>'),
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


# Hver rad var før #124 en karakterisering av en særhet. Forventningen kommer
# fra issuet: understrek og stjerne inne i ord og mellom mellomrom gir ikke
# kursiv, og `\r\n` normaliseres.
RETTET_I_124 = [
    # Var `snake<i>case</i>navn`.
    ("snake_case_navn", "snake_case_navn"),
    ("NS_8407_32_2", "NS_8407_32_2"),
    ("æ_ø_å", "æ_ø_å"),
    ("2*3*4", "2*3*4"),
    ("ord*midt*i", "ord*midt*i"),
    # Samme regel for fet.
    ("snake__dobbel__navn", "snake__dobbel__navn"),
    ("ord**midt**i", "ord**midt**i"),
    # Var `a <i> b </i> c`.
    ("a * b * c", "a * b * c"),
    ("a _ b _ c", "a _ b _ c"),
    ("** a **", "** a **"),
    # Markøren ved ordgrense virker som før.
    ("(_kursiv_)", "(<i>kursiv</i>)"),
    ("«*kursiv*»", "«<i>kursiv</i>»"),
    ("_flere ord_", "<i>flere ord</i>"),
    ("_snake_case_", "<i>snake_case</i>"),
    ("__snake_case__", "<b>snake_case</b>"),
    ("_a_ og _b_", "<i>a</i> og <i>b</i>"),
    ("__a__ og __b__", "<b>a</b> og <b>b</b>"),
    ("**fet**.", "<b>fet</b>."),
    ("***begge***", "<i><b>begge</b></i>"),
    # Var `a\r<br/>b`.
    ("a\r\nb", "a<br/>b"),
    ("a\r\n\r\nb", "a<br/><br/>b"),
    ("a\rb", "a<br/>b"),
    ("# Tittel\r\n- punkt", '<font size="14"><b>Tittel</b></font><br/>    • punkt'),
]

# Var `#### Fjerde`. Issuet ba om et standpunkt, ikke et bestemt utfall. Valgt:
# nivå 4–6 blir fet tekst i brødtekstens størrelse, ikke en mindre font, og nivå
# 7 er ikke en overskrift i Markdown. Valget står under «Åpne spørsmål» i PR-en.
OVERSKRIFT_NIVA_4_TIL_6 = [
    ("#### Fjerde", "<b>Fjerde</b>"),
    ("##### Femte", "<b>Femte</b>"),
    ("###### Sjette", "<b>Sjette</b>"),
    ("####### Sjuende", "####### Sjuende"),
    ("####Uten mellomrom", "####Uten mellomrom"),
    ("#### A & <b>", "<b>A &amp; &lt;b&gt;</b>"),
]


@pytest.mark.parametrize("generator", [letter_pdf_generator, reportlab_pdf_generator])
def test_begge_generatorene_bruker_den_felles_konverteringen(generator):
    assert generator.markdown_to_reportlab is markdown_to_reportlab


@pytest.mark.parametrize(("inndata", "forventet"), TILFELLER)
def test_konvertering_fastholder_dagens_atferd(inndata, forventet):
    assert markdown_to_reportlab(inndata) == forventet


def test_flere_linjer_konverteres_hver_for_seg():
    tekst = "# Varsel\nVi viser til **krav**.\n- punkt _a_\n1. punkt b"
    assert markdown_to_reportlab(tekst) == (
        '<font size="14"><b>Varsel</b></font><br/>'
        "Vi viser til <b>krav</b>.<br/>"
        "    • punkt <i>a</i><br/>"
        "    1. punkt b"
    )


@pytest.mark.parametrize(("inndata", "forventet"), RETTET_I_124)
def test_ingen_fet_eller_kursiv_inne_i_ord_eller_mellom_mellomrom_124(
    inndata, forventet
):
    assert markdown_to_reportlab(inndata) == forventet


@pytest.mark.parametrize(("inndata", "forventet"), OVERSKRIFT_NIVA_4_TIL_6)
def test_overskrift_niva_4_til_6_blir_fet_tekst_124(inndata, forventet):
    assert markdown_to_reportlab(inndata) == forventet
