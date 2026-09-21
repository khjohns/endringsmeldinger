"""Navneoppslag for aktør-identiteter.

Journalen bærer `aktor_id` og aldri et personnavn (MS-04). Verdien er
`app_users.id` og ingenting annet: webhookstien løser Catenda-forfatteren
gjennom den samme identitetsfunksjonen innloggingen bruker (MG-02), så det
finnes bare én form å slå opp.

Navnet hører til visningen og slås opp her, mot `app_users`. Slettes personen,
faller visningen tilbake til identiteten — hendelsen beviser fortsatt hvem som
handlet, uten at journalen selv bærer navnet.
"""

import logging

from flask import g, has_app_context

logger = logging.getLogger(__name__)


def _buffer() -> dict[str, str]:
    """Oppslagsbuffer per applikasjonskontekst, seedet med den innloggede.

    Leseren er nesten alltid en av de to–tre aktørene en sak viser, og navnet
    hans ligger alt i sesjonen.
    """
    if not hasattr(g, "aktor_navn_buffer"):
        innlogget = getattr(g, "user", None) or {}
        eget_navn = innlogget.get("name")
        g.aktor_navn_buffer = (
            {innlogget["id"]: eget_navn} if eget_navn and innlogget.get("id") else {}
        )
    return g.aktor_navn_buffer


def _slaa_opp(aktor_id: str) -> str | None:
    """Navnet bak identiteten, eller None.

    Hele oppslaget er vernet: et navn er en visningsdetalj, og et lager som
    svarer uventet skal aldri kunne velte tidslinjen eller brevet. Feilen
    logges — den skal ikke være stille — og visningen faller tilbake på
    identiteten.
    """
    from lib.auth.session import get_auth_service

    try:
        return get_auth_service().repo.user_name(aktor_id)
    except Exception as e:
        logger.warning(f"Navneoppslag for aktør {aktor_id} feilet: {e}")
        return None


def navn(aktor_id: str | None) -> str:
    """Navnet aktøren skal vises med, eller identiteten når den ikke lar seg slå opp."""
    if not aktor_id:
        return ""
    if not has_app_context():
        return aktor_id
    buffer = _buffer()
    if aktor_id not in buffer:
        buffer[aktor_id] = _slaa_opp(aktor_id) or aktor_id
    return buffer[aktor_id]
