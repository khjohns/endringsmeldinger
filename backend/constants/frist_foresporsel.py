"""Den faste teksten i BHs forespørsel om spesifisert fristkrav (§ 33.6.2 første ledd).

Teksten ligger i `frist_foresporsel.json`, som også `fristVarselDomain.ts` leser.
"""

import html
import json
import re
from pathlib import Path

FAST_TEKST: str = json.loads(
    (Path(__file__).with_name("frist_foresporsel.json")).read_text(encoding="utf-8")
)["fast_tekst"]


def _normalisert(tekst: str) -> str:
    uten_tagger = html.unescape(re.sub(r"<[^>]*>", " ", tekst))
    return " ".join(uten_tagger.split())


def har_fast_tekst(tekst: str) -> bool:
    return _normalisert(FAST_TEKST) in _normalisert(tekst)
