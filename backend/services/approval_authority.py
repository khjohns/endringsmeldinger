"""Server-side implementation of the application's January 2026 authority matrix."""

from decimal import Decimal, InvalidOperation

LIMITS = {
    "Prosjektleder": Decimal("200000"),
    "Prosjektdirektør": Decimal("500000"),
    "Seksjonsleder": Decimal("1500000"),
    "Avdelingsleder": Decimal("3000000"),
    "Divisjonsdirektør": Decimal("5000000"),
    "Adm.dir (daglig leder)": None,
}


def number(value):
    try:
        result = Decimal(str(value if value is not None else 0))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("Ugyldig fullmaktsgrunnlag.") from exc
    if not result.is_finite() or result < 0:
        raise ValueError("Ugyldig fullmaktsgrunnlag.")
    return result


def covers(role, amount):
    return role in LIMITS and (LIMITS[role] is None or LIMITS[role] >= amount)


def exposure(items, daily_rate=None):
    """Highest total principal or subsidiary position; alternatives are never added."""
    principal = Decimal(0)
    subsidiary = Decimal(0)
    needs_rate = False
    for item in items:
        if item["track"] == "grunnlag":
            continue
        data, basis = item["data"], item.get("basis", {})
        time = item["track"] == "frist"
        assessed = number(
            data.get("godkjent_dager")
            if time
            else (
                data.get("total_godkjent_belop")
                if data.get("total_godkjent_belop") is not None
                else data.get("godkjent_belop")
            )
        )
        other = data.get(
            "subsidiaer_godkjent_dager" if time else "subsidiaer_godkjent_belop"
        )
        other = assessed if other is None else number(other)
        rejected = basis.get("resultat") == "avslatt" or (
            basis.get("hovedkategori") == "ENDRING"
            and basis.get("varsletITide") is False
        )
        main = Decimal(0) if rejected else assessed
        if time and max(main, other) > 0:
            needs_rate = True
            rate = number(daily_rate)
            if rate <= 0:
                raise ValueError(
                    "Fullmakt kan ikke beregnes: dagmulktssats må konfigureres på serveren."
                )
            main, other = main * rate, other * rate
        principal += main
        subsidiary += other
    return max(principal, subsidiary), needs_rate


def resolve_route(amount, sender, chain, minimum=None):
    """Approvers the amount requires, in chain order, ending with the one who decides.

    Mirrors resolveRoute in src/lib/approval/route.ts. An empty route means the sender
    may send within their own authority. `amount=None` requires the whole chain, but an
    unresolved total never weakens the route: `minimum` is the part already agreed, and
    someone in the chain must still cover it. Otherwise a letter over every limit could
    be issued by adding an unvalued consequence.
    """
    if amount is not None and sender and covers(sender.get("role"), amount):
        return []
    if amount is not None:
        for index, person in enumerate(chain):
            if covers(person.get("role"), amount):
                return list(chain[: index + 1])
    # Legacy chains without matrix roles still apply in full to zero-value letters.
    if chain and (amount is None or amount == 0):
        if amount is None and minimum is not None and minimum > 0:
            if not any(covers(person.get("role"), minimum) for person in chain):
                raise ValueError(
                    "Godkjenningskjeden har ikke tilstrekkelig fullmakt for brevet."
                )
        return list(chain)
    raise ValueError("Godkjenningskjeden har ikke tilstrekkelig fullmakt for brevet.")


def approval_route(items, chain, daily_rate=None, sender=None):
    amount, needs_rate = exposure(items, daily_rate)
    route = resolve_route(amount, sender, chain)
    return {
        "amount": str(amount),
        "dailyRate": str(number(daily_rate)) if needs_rate else None,
        "matrix": "2026-01",
    }, route


def validate_authority(items, chain, daily_rate=None, sender=None):
    return approval_route(items, chain, daily_rate, sender)[0]


def handler_identity(policy, actor):
    """Handlers are e-mails, or objects with a matrix role that sets their own authority."""
    for entry in (policy or {}).get("handlers", []):
        person = entry if isinstance(entry, dict) else {"id": entry}
        if str(person.get("id", "")).lower() == actor:
            return {**person, "id": actor, "name": person.get("name") or actor}
    return None
