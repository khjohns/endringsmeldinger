"""Speilet av regelversjonen er likt frontendens (B-13, hovedplanen 3.1, 24.09).

Serveren avviser et svar med en annen versjon enn `regler.REGELVERSJON`. Økes
versjonen i `src/lib/domain/regelversjon.ts` uten at speilet følger, avvises
hvert svar fra skjemaene. CI-vakten i `.github/workflows/regelversjon.yml`
krever at versjonen økes i begge når `src/lib/domain/` eller `backend/regler/`
endres (#191).
"""

import re
from pathlib import Path

from regler import REGELVERSJON

ROT = Path(__file__).resolve().parents[3]
KONSTANT = ROT / "src/lib/domain/regelversjon.ts"
# TS-kjernen i språkprøven (#274). Python og TS-serveren leser hverandres svar i port 2.
SPRAKPROVE = ROT / "sprakprove/kjerne/regelversjon.ts"


def _versjon(fil: Path) -> int:
    treff = re.search(r"^export const REGELVERSJON = (\d+);$", fil.read_text(), re.M)
    assert treff, f"Fant ikke REGELVERSJON i {fil}"
    return int(treff.group(1))


def test_speilet_er_likt_frontendens_regelversjon():
    assert _versjon(KONSTANT) == REGELVERSJON


def test_sprakprovens_kjerne_har_samme_regelversjon():
    assert _versjon(SPRAKPROVE) == REGELVERSJON
