"""Speilet av regelversjonen er likt frontendens (B-13, hovedplanen 3.1, 24.09).

Serveren avviser et svar med en annen versjon enn `regler.REGELVERSJON`. Økes
versjonen i `src/lib/domain/regelversjon.ts` uten at speilet følger, avvises
hvert svar fra skjemaene. CI-vakten i `.github/workflows/regelversjon.yml`
krever at versjonen økes når `src/lib/domain/` endres.
"""

import re
from pathlib import Path

from regler import REGELVERSJON

KONSTANT = Path(__file__).resolve().parents[3] / "src/lib/domain/regelversjon.ts"


def test_speilet_er_likt_frontendens_regelversjon():
    treff = re.search(r"^export const REGELVERSJON = (\d+);$", KONSTANT.read_text(), re.M)
    assert treff, f"Fant ikke REGELVERSJON i {KONSTANT}"
    assert int(treff.group(1)) == REGELVERSJON
