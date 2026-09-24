"""Datalaget over direkte tilkobling til PostgreSQL (F0b)."""

from .database import KONTEKSTVARIABEL, Database, Kontekst, opprett_database
from .feil import (
    VERSJONSKONFLIKT,
    AuthenticationError,
    ConcurrencyError,
    ConflictError,
    DatabaseIkkeKonfigurert,
    DatalagFeil,
    NotFoundError,
    PermanentError,
    RateLimitError,
    SerialiseringsFeil,
    TilgangAvvist,
    TransientError,
    UkjentUtfall,
    ValidationError,
    klassifiser,
)

__all__ = [
    "KONTEKSTVARIABEL",
    "VERSJONSKONFLIKT",
    "AuthenticationError",
    "ConcurrencyError",
    "ConflictError",
    "Database",
    "DatabaseIkkeKonfigurert",
    "DatalagFeil",
    "Kontekst",
    "NotFoundError",
    "PermanentError",
    "RateLimitError",
    "SerialiseringsFeil",
    "TilgangAvvist",
    "TransientError",
    "UkjentUtfall",
    "ValidationError",
    "klassifiser",
    "opprett_database",
]
