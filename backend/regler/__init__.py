"""NS 8407-reglene for byggherrens svar, eid av backend (B-13, BR-01).

Rene funksjoner: vurderingene og kravet inn, resultatet ut. Ingen Flask, ingen
lagring og ingen klokke; dagens dato er et argument. Forklaringen står i
`docs/design-b13-sannhetskilde-2026-09-23.md`.
"""

from decimal import ROUND_HALF_UP, Decimal

# Speil av REGELVERSJON i src/lib/domain/regelversjon.ts. En test holder dem like.
REGELVERSJON = 3

ORE = Decimal("0.01")
KRONE = Decimal("1")


class UgyldigVurdering(ValueError):
    """Svaret mangler eller har en vurdering reglene ikke kan regne ut av.

    `felt` navngir feltene, med navnene i svarmodellen.
    """

    def __init__(self, feil: dict[str, str]):
        self.feil = dict(feil)
        super().__init__("; ".join(f"{felt}: {grunn}" for felt, grunn in feil.items()))

    @property
    def felt(self) -> tuple[str, ...]:
        return tuple(self.feil)


def belop(verdi) -> Decimal | None:
    """Et beløp til hele øre. Flyttall går via tekst, slik at 0.1 + 0.2 blir 0.30."""
    if verdi is None:
        return None
    return Decimal(str(verdi)).quantize(ORE, rounding=ROUND_HALF_UP)


def til_krone(verdi: Decimal) -> Decimal:
    return verdi.quantize(KRONE, rounding=ROUND_HALF_UP)
