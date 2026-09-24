"""Feilhierarkiet for datalaget, felles for Supabase-lagrene og direkte tilkobling.

Kontrakten for klassifiseringen står i
docs/gjennomforing-f0b-kjernen-2026-09-23.md.
"""

from __future__ import annotations

import json

import psycopg
from psycopg_pool import PoolTimeout

VERSJONSKONFLIKT = "KO409"


class DatalagFeil(Exception):
    def __init__(self, message: str, original: Exception | None = None):
        super().__init__(message)
        self.original = original


class TransientError(DatalagFeil):
    """Kan lykkes om den prøves igjen senere."""


class PermanentError(DatalagFeil):
    """Kan aldri lykkes. Prøves ikke igjen."""

    def __init__(
        self,
        message: str,
        original: Exception | None = None,
        code: str | None = None,
        details: str | None = None,
    ):
        super().__init__(message, original)
        self.code = code
        self.details = details


class AuthenticationError(PermanentError):
    pass


class TilgangAvvist(AuthenticationError):
    pass


class NotFoundError(PermanentError):
    pass


class ConflictError(PermanentError):
    pass


class ValidationError(PermanentError):
    pass


class RateLimitError(TransientError):
    def __init__(
        self,
        message: str,
        retry_after: int | None = None,
        original: Exception | None = None,
    ):
        super().__init__(message, original)
        self.retry_after = retry_after


class SerialiseringsFeil(TransientError):
    """40001 eller 40P01. Hele transaksjonen kan kjøres på nytt."""


class UkjentUtfall(DatalagFeil):
    """Forbindelsen brøt under COMMIT. Skrivingen kan ha blitt committet."""


class ConcurrencyError(ConflictError):
    """Forventet versjon stemte ikke.

    En `ConflictError` med vilje: en permanent feil prøves ikke på nytt, og etter
    et tapt svar kan skrivingen allerede være committet (RV-11).
    """

    def __init__(self, expected: int | None = None, actual: int | None = None):
        self.expected = expected
        self.actual = actual
        super().__init__(f"Versjonskonflikt: forventet {expected}, fikk {actual}")


class DatabaseIkkeKonfigurert(PermanentError):
    pass


def _versjonskonflikt(feil: psycopg.Error) -> ConcurrencyError:
    try:
        detalj = json.loads(feil.diag.message_detail or "")
    except ValueError:
        detalj = None
    if not isinstance(detalj, dict):
        detalj = {}
    forventet, faktisk = detalj.get("forventet"), detalj.get("faktisk")
    konflikt = ConcurrencyError(
        forventet if isinstance(forventet, int) else None,
        faktisk if isinstance(faktisk, int) else None,
    )
    konflikt.original = feil
    konflikt.code = VERSJONSKONFLIKT
    return konflikt


def _melding(feil: psycopg.Error, sqlstate: str) -> str:
    """Uten meldingsteksten fra basen: den kan gjengi verdier."""
    deler = [f"SQLSTATE {sqlstate}"]
    for navn in ("constraint_name", "table_name", "column_name"):
        verdi = getattr(feil.diag, navn, None)
        if verdi:
            deler.append(f"{navn}={verdi}")
    return " ".join(deler)


def klassifiser(feil: psycopg.Error) -> DatalagFeil:
    sqlstate = feil.sqlstate

    if sqlstate is None:
        if isinstance(feil, (psycopg.OperationalError, psycopg.InterfaceError)):
            navn = "PoolTimeout" if isinstance(feil, PoolTimeout) else "forbindelse"
            return TransientError(f"Databasen svarte ikke ({navn})", original=feil)
        return PermanentError(
            f"Driverfeil: {type(feil).__name__}", original=feil, code=None
        )

    if sqlstate == VERSJONSKONFLIKT:
        return _versjonskonflikt(feil)

    melding = _melding(feil, sqlstate)
    if sqlstate in ("40001", "40P01"):
        return SerialiseringsFeil(melding, original=feil)
    if sqlstate in ("23505", "23P01"):
        return ConflictError(melding, original=feil, code=sqlstate)
    if sqlstate.startswith(("22", "23")):
        return ValidationError(melding, original=feil, code=sqlstate)
    if sqlstate == "42501":
        return TilgangAvvist(melding, original=feil, code=sqlstate)
    if sqlstate.startswith(("08", "53")) or sqlstate in (
        "57014",
        "57P01",
        "57P02",
        "57P03",
        "25P03",
    ):
        return TransientError(melding, original=feil)
    return PermanentError(melding, original=feil, code=sqlstate)
