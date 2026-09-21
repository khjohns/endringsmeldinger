"""Sidevis uthenting fra PostgREST.

PostgREST avkorter et uttrekk ved `db-max-rows` uten å si fra, så et ufiltrert
`select` må hentes i sider. Taket er en serverinnstilling og kan være lavere enn
sidestørrelsen her; derfor starter neste side der forrige faktisk sluttet, ikke
der den ble bedt om å slutte (KR-03).
"""

SIDESTORRELSE = 500

# Vern mot en server som svarer med rader i det uendelige.
MAKS_SIDER = 200


def alle_rader(hent_side) -> list[dict]:
    """Alle radene `hent_side(start, slutt)` gir, side for side.

    `hent_side` får inklusive radnumre, som `range()` hos PostgREST.
    """
    rader: list[dict] = []
    start = 0
    for _ in range(MAKS_SIDER):
        side = hent_side(start, start + SIDESTORRELSE - 1) or []
        if not side:
            return rader
        rader.extend(side)
        start += len(side)
    raise RuntimeError("Pagineringsgrensen er nådd")
