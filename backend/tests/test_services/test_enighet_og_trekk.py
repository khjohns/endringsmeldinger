"""Enighet og trekk i den forbedrede Python-baselinen (#274).

Code-review av prøvegrenen fant at et trukket krav kunne godtas og at et
trukket grunnlag kunne åpnes igjen, da aksepten og GR-U1 ble bygget om. Et
trukket krav kan ikke tas opp igjen (vedtaket om trukket krav 05.10, 3.1).
"""

import pytest

from tests.test_domenetabell import korpus
from tests.test_domenetabell.test_kravversjon_og_aksept import Domenebane


def _bane(*handlinger):
    bane = Domenebane()
    for h in handlinger:
        godtatt, melding = bane.send(h)
        if not godtatt:
            pytest.fail(f"Forutsetning: {h['handling']} avvist: {melding}")
    return bane


AVSLAG = {"handling": "vederlagssvar", "vurdering": "avslatt"}
AKSEPT = {"handling": "aksept", "spor": "vederlag"}


def test_et_trukket_vederlag_kan_ikke_godtas():
    prefiks = korpus.KORPUS["prefikser"]["basis"]
    if not _bane(*prefiks, AVSLAG).send(AKSEPT)[0]:
        pytest.fail("Kontrollsak: aksepten avvises også uten trekk")

    bane = _bane(*prefiks, AVSLAG, {"handling": "trekk", "spor": "vederlag"})
    godtatt, melding = bane.send(AKSEPT)

    assert not godtatt and "trukket" in melding
    assert bane.tilstand()["vederlag"]["status"] == "trukket"


def test_et_trukket_grunnlag_aapnes_ikke_av_en_ny_versjon():
    bane = _bane(
        {"handling": "grunnlag", "underkategori": "EO"},
        {"handling": "grunnlagssvar", "resultat": "avslatt"},
        {"handling": "trekk", "spor": "grunnlag"},
    )
    if bane.tilstand()["grunnlag"]["status"] != "trukket":
        pytest.fail("Forutsetning: grunnlaget er ikke trukket")

    bane.send({"handling": "grunnlag_ny_versjon", "underkategori": "EO"})

    assert bane.tilstand()["grunnlag"]["status"] == "trukket"
