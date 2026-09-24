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
    """`amount=None` kan ikke verdsettes, og dekkes bare av ubegrenset fullmakt."""
    if role not in LIMITS:
        return False
    return LIMITS[role] is None or (amount is not None and LIMITS[role] >= amount)


def _dager_i_kroner(dager, daily_rate):
    rate = number(daily_rate)
    if rate <= 0:
        raise ValueError(
            "Fullmakt kan ikke beregnes: dagmulktssats må konfigureres på serveren."
        )
    return dager * rate


def exposure(items, daily_rate=None, krav=None):
    """Highest total principal or subsidiary position; alternatives are never added.

    Godkjent ansvarsgrunnlag verdsettes per spor (GFK-06, vedtak 23.09 og 24.09):
    et spor som besvares i samme brev, har verdien i svaret. Ellers gjelder TEs
    krav i `krav` (kroner for vederlag, dager for frist). `None` betyr at kravet
    ikke er sendt eller ikke tallfestet; da er grunnlaget ukjent, og hele kjeden
    kreves. Returnerer (grunnlag, trenger_sats, ukjent).
    """
    principal = Decimal(0)
    subsidiary = Decimal(0)
    needs_rate = False
    ukjent = False
    besvart = {item["track"] for item in items}
    for item in items:
        if item["track"] == "grunnlag":
            if item["data"].get("resultat") != "godkjent":
                continue
            for spor in ("vederlag", "frist"):
                if spor in besvart:
                    continue
                verdi = (krav or {}).get(spor)
                if verdi is None:
                    ukjent = True
                    continue
                verdi = number(verdi)
                if spor == "frist" and verdi > 0:
                    needs_rate = True
                    verdi = _dager_i_kroner(verdi, daily_rate)
                principal += verdi
                subsidiary += verdi
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
            main = _dager_i_kroner(main, daily_rate)
            other = _dager_i_kroner(other, daily_rate)
        principal += main
        subsidiary += other
    return max(principal, subsidiary), needs_rate, ukjent


def resolve_route(amount, sender, chain, minimum=None, mangler_sats=False):
    """Approvers the amount requires, in chain order, ending with the one who decides.

    Mirrors resolveRoute in src/lib/approval/route.ts. An empty route means the sender
    may send within their own authority. `amount=None` requires the whole chain, but an
    unresolved total never weakens the route: `minimum` is the part already agreed, and
    someone in the chain must still cover it. Otherwise a letter over every limit could
    be issued by adding an unvalued consequence.

    Ubegrenset fullmakt sender alene, også når beløpet ikke kan verdsettes
    (vedtak 23.09). Unntaket er `mangler_sats`: uten dagmulktssats gjelder B-06,
    som ikke er avgjort, og da kreves kjeden som før.
    """
    if (
        sender
        and covers(sender.get("role"), amount)
        and not (amount is None and mangler_sats)
    ):
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


def _endrer_sluttdato(items):
    return any(
        item["track"] == "frist" and item["data"].get("ny_sluttdato") for item in items
    )


def approval_route(items, chain, daily_rate=None, sender=None, krav=None):
    """Fullmaktsgrunnlag og rute for et brev med svar.

    En ny sluttdato kan ikke verdsettes uten kontraktens gjeldende sluttdato,
    som serveren ikke har. Som for endringsordrer kreves da hele kjeden, og den
    må fortsatt dekke det som lar seg verdsette (audit GFK-02). Det samme gjelder
    godkjent ansvar for et krav som ikke er tallfestet (GFK-06). Unntaket er en
    saksbehandler med ubegrenset fullmakt, som sender alene.
    """
    amount, needs_rate, ukjent = exposure(items, daily_rate, krav)
    basis = {
        "amount": str(amount),
        "dailyRate": str(number(daily_rate)) if needs_rate else None,
        "matrix": "2026-01",
    }
    if ukjent or _endrer_sluttdato(items):
        route = resolve_route(None, sender, chain, minimum=amount)
        return {**basis, "amount": None, "minimum": str(amount)}, route
    return basis, resolve_route(amount, sender, chain)


def validate_authority(items, chain, daily_rate=None, sender=None, krav=None):
    return approval_route(items, chain, daily_rate, sender, krav)[0]


def policy_entry(entry):
    """A policy entry is either a bare e-mail or an object; normalise to an object."""
    return entry if isinstance(entry, dict) else {"id": entry}


def handler_identity(policy, actor):
    """Handlers are e-mails, or objects with a matrix role that sets their own authority."""
    for entry in (policy or {}).get("handlers", []):
        person = policy_entry(entry)
        if str(person.get("id", "")).lower() == actor:
            return {**person, "id": actor, "name": person.get("name") or actor}
    return None
