"""Den faste teksten i BHs forespørsel om spesifisert fristkrav (§ 33.6.2 første ledd).

Teksten ligger i `src/lib/domain/frist_foresporsel.json`, ved siden av `fristVarselDomain.ts`,
som også leser den (VM-10, #1026).
"""

import html
import json
import re
from pathlib import Path

_KILDE = Path(__file__).resolve().parents[2] / "src" / "lib" / "domain" / "frist_foresporsel.json"

FAST_TEKST: str = json.loads(_KILDE.read_text(encoding="utf-8"))["fast_tekst"]


def _normalisert(tekst: str) -> str:
    uten_tagger = html.unescape(re.sub(r"<[^>]*>", " ", tekst))
    return " ".join(uten_tagger.split())


def har_fast_tekst(tekst: str) -> bool:
    return _normalisert(FAST_TEKST) in _normalisert(tekst)
