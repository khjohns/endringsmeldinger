"""Grensetilfellene i sprakprove/grensetilfeller.json mot backend/regler/ (#274, P1-4).

TS-kjernen kjører gruppene for beløp, krone og frist i samme tabell
(`sprakprove/tester/grensetilfeller.test.ts`). Vederlaget har egne forventninger der
(#1317), så vederlagsgruppen gjelder bare Python-stien. Kilden står per gruppe i tabellen.
"""

import json
import pathlib
from decimal import Decimal

import pytest

from models.events import BelopVurdering, VederlagsMetode
from regler import UgyldigVurdering, belop, til_krone
from regler.frist import Fristkrav, Fristvurdering, beregn_frist
from regler.vederlag import Vederlagskrav, Vederlagsvurdering, beregn_vederlag

TABELL = json.loads(
    (pathlib.Path(__file__).resolve().parents[3] / "sprakprove" / "grensetilfeller.json").read_text(
        encoding="utf-8"
    )
)


def _feltet_som_feiler(regn) -> tuple[str, ...]:
    try:
        regn()
    except UgyldigVurdering as feil:
        return feil.felt
    return ()


@pytest.mark.parametrize("t", TABELL["belop"]["tilfeller"], ids=lambda t: str(t["inn"]))
def test_belop_i_hele_ore(t):
    assert belop(t["inn"]) * 100 == Decimal(t["ore"])


@pytest.mark.parametrize("t", TABELL["til_krone"]["tilfeller"], ids=lambda t: t["ore"])
def test_naermeste_krone(t):
    assert til_krone(Decimal(t["ore"]) / 100) == Decimal(t["krone"])


@pytest.mark.parametrize("t", TABELL["vederlag"]["tilfeller"])
def test_vederlag(t):
    krav = Vederlagskrav(
        hovedkrav_belop=t["krevd"],
        metode=VederlagsMetode.FASTPRIS_TILBUD,
        hovedkategori="ENDRING",
        underkategori="EO",
    )
    vurdering = Vederlagsvurdering(
        hovedkrav_vurdering=BelopVurdering(t["vurdering"]) if "vurdering" in t else None,
        hovedkrav_godkjent_belop=t.get("godkjent"),
        aksepterer_metode=t.get("aksepterer_metode", True),
    )
    if "feil" in t:
        assert t["feil"] in _feltet_som_feiler(lambda: beregn_vederlag(krav, vurdering))
    else:
        assert beregn_vederlag(krav, vurdering).beregnings_resultat.value == t["resultat"]


@pytest.mark.parametrize("t", TABELL["frist"]["tilfeller"])
def test_frist(t):
    krav = Fristkrav(krevd_dager=t["krevd"], varsel_type="spesifisert")
    vurdering = Fristvurdering(
        frist_varsel_ok=True,
        spesifisert_krav_ok=t.get("spesifisering_i_tide", True),
        vilkar_oppfylt=t.get("hindring", True),
        godkjent_dager=t["dager"],
    )
    if "feil" in t:
        assert t["feil"] in _feltet_som_feiler(lambda: beregn_frist(krav, vurdering))
        return
    r = beregn_frist(krav, vurdering)
    assert r.beregnings_resultat.value == t["resultat"]
    if "subsidiaer_resultat" in t:
        assert r.subsidiaer_resultat.value == t["subsidiaer_resultat"]
