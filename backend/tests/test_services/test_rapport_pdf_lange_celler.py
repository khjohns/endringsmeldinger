"""Rapport-PDF-en skal lages også når én tabellcelle er høyere enn en side (#121)."""

import re

import pytest

from models.events import SporStatus
from models.sak_state import (
    EndringsordreData,
    ForseringData,
    GrunnlagTilstand,
    SakState,
    SaksType,
)
from services.reportlab_pdf_generator import ReportLabPdfGenerator

LINJER = [f"Linje {n:03d} i en lang beskrivelse av forholdet." for n in range(1, 121)]
LANG_TEKST = "\n\n".join(LINJER)


def _antall_sider(pdf: bytes) -> int:
    return len(re.findall(rb"/Type /Page\b(?!s)", pdf))


def _celletekst(elementer) -> str:
    tekst = []
    for element in elementer:
        for rad in getattr(element, "_cellvalues", []):
            for celle in rad:
                tekst.append(celle.getPlainText() if hasattr(celle, "getPlainText") else str(celle))
    return "\n".join(tekst)


def _koe_med_lang_beskrivelse() -> SakState:
    return SakState(
        sak_id="SAK-121",
        sakstittel="Lang beskrivelse",
        grunnlag=GrunnlagTilstand(
            status=SporStatus.AVSLATT,
            beskrivelse=LANG_TEKST,
            bh_resultat="avslatt",
            bh_begrunnelse=LANG_TEKST,
        ),
    )


@pytest.mark.parametrize(
    "state",
    [
        _koe_med_lang_beskrivelse(),
        SakState(
            sak_id="SAK-121-F",
            sakstittel="Forsering",
            sakstype=SaksType.FORSERING,
            forsering_data=ForseringData(
                avslatte_fristkrav=["SAK-1"],
                dato_varslet="2026-01-01",
                estimert_kostnad=1000.0,
                begrunnelse="Kort begrunnelse.",
                bh_aksepterer_forsering=False,
                bh_begrunnelse=LANG_TEKST,
                avslatte_dager=5,
                dagmulktsats=1000.0,
            ),
        ),
        SakState(
            sak_id="SAK-121-E",
            sakstittel="Endringsordre",
            sakstype=SaksType.ENDRINGSORDRE,
            endringsordre_data=EndringsordreData(eo_nummer="EO-1", beskrivelse=LANG_TEKST),
        ),
    ],
    ids=["koe", "forsering", "endringsordre"],
)
def test_celle_lengre_enn_en_side_gir_pdf(state):
    pdf = ReportLabPdfGenerator().generate_pdf(state)

    assert pdf is not None
    assert pdf.startswith(b"%PDF")
    assert _antall_sider(pdf) > 1


def test_delt_celle_beholder_all_tekst_i_rekkefolge():
    elementer = ReportLabPdfGenerator()._build_grunnlag_section(_koe_med_lang_beskrivelse())
    tekst = _celletekst(elementer)

    posisjoner = [tekst.find(linje) for linje in LINJER]
    assert -1 not in posisjoner
    assert posisjoner == sorted(posisjoner)
    assert tekst.count("Beskrivelse:") == 1
    assert tekst.count("Begrunnelse:") == 1


def test_kort_celle_deles_ikke():
    state = SakState(
        sak_id="SAK-121-K",
        grunnlag=GrunnlagTilstand(status=SporStatus.SENDT, beskrivelse="Kort tekst."),
    )
    elementer = ReportLabPdfGenerator()._build_grunnlag_section(state)
    tabell = next(e for e in elementer if hasattr(e, "_cellvalues"))

    assert len(tabell._cellvalues) == 1
