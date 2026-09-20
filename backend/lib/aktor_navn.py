"""Navneoppslag for aktør-identiteter.

Journalen bærer `aktor_id` og aldri et personnavn (MS-04). Navnet hører til
visningen og slås opp her, mot `app_users`. Slettes personen, faller visningen
tilbake til identiteten — hendelsen beviser fortsatt hvem som handlet, uten at
journalen selv bærer navnet.
"""

import logging

from flask import current_app, g, has_app_context, has_request_context

logger = logging.getLogger(__name__)

# Aktører som bare finnes i Catenda. Webhookruta møter forfattere som aldri
# har logget inn hos oss; da bærer journalen den eksterne identiteten framfor
# et navn.
CATENDA_PREFIKS = "catenda:"


def _buffer() -> dict[str, str]:
    """Oppslagsbuffer per forespørsel.

    Én sak viser typisk to–tre aktører om og om igjen. Bufferet lever bare så
    lenge forespørselen gjør, slik at et navn som endres slår gjennom ved neste
    visning framfor å henge igjen i prosessen.
    """
    if not has_request_context():
        return {}
    if not hasattr(g, "aktor_navn_buffer"):
        g.aktor_navn_buffer = {}
    return g.aktor_navn_buffer


def _repo():
    if not has_app_context():
        return None
    tjeneste = current_app.extensions.get("koe_auth")
    return getattr(tjeneste, "repo", None)


def _slaa_opp(aktor_id: str) -> str | None:
    """Navnet bak identiteten, eller None.

    Hele oppslaget er vernet: et navn er en visningsdetalj, og et lager som
    svarer uventet skal aldri kunne velte tidslinjen eller brevet. Feilen
    logges — den skal ikke være stille — og visningen faller tilbake på
    identiteten.
    """
    repo = _repo()
    if repo is None:
        return None

    try:
        bruker_id = aktor_id
        if aktor_id.startswith(CATENDA_PREFIKS):
            bruker_id = repo.user_id_for_subject(
                "catenda", aktor_id[len(CATENDA_PREFIKS) :]
            )
            if bruker_id is None:
                return None

        rader = repo.all_rows("app_users", "id,name", id=bruker_id)
        if len(rader) != 1:
            return None
        return rader[0].get("name") or None
    except Exception as e:
        logger.warning(f"Navneoppslag for aktør {aktor_id} feilet: {e}")
        return None


def navn(aktor_id: str | None) -> str:
    """Navnet aktøren skal vises med, eller identiteten når den ikke lar seg slå opp."""
    if not aktor_id:
        return ""
    buffer = _buffer()
    if aktor_id not in buffer:
        buffer[aktor_id] = _slaa_opp(aktor_id) or aktor_id
    return buffer[aktor_id]
