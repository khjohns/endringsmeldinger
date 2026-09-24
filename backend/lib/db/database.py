"""Pool og transaksjoner over direkte tilkobling til PostgreSQL (F0b).

Kontrakten står i docs/gjennomforing-f0b-kjernen-2026-09-23.md.
"""

from __future__ import annotations

import json
import logging
import random
import threading
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from typing import TYPE_CHECKING, TypeVar

import psycopg
from psycopg import IsolationLevel, sql
from psycopg.conninfo import conninfo_to_dict
from psycopg.pq import TransactionStatus
from psycopg_pool import ConnectionPool

from lib.db.feil import (
    DatabaseIkkeKonfigurert,
    SerialiseringsFeil,
    UkjentUtfall,
    klassifiser,
)

if TYPE_CHECKING:
    from core.config import Settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

KONTEKSTVARIABEL = "koe.krav"

_ISOLASJON = {
    IsolationLevel.READ_COMMITTED: "SET TRANSACTION ISOLATION LEVEL READ COMMITTED",
    IsolationLevel.REPEATABLE_READ: "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ",
    IsolationLevel.SERIALIZABLE: "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE",
}


@dataclass(frozen=True)
class Kontekst:
    """Rolle og krav for én transaksjon. Tom: innloggingsrollen, ingen krav.

    Kravene følger kontekstkontrakten i design v2 for B-02, avsnitt 4.
    """

    rolle: str | None = None
    aktor: str | None = None
    prosjekt: str | None = None
    side: str | None = None
    team: str | None = None

    def krav(self) -> str:
        verdier = {
            "koe_aktor": self.aktor,
            "koe_prosjekt": self.prosjekt,
            "koe_side": self.side,
            "koe_team": self.team,
        }
        for navn, verdi in verdier.items():
            if verdi is not None and not isinstance(verdi, str):
                raise TypeError(f"{navn} må være en streng")
        satt = {k: v for k, v in verdier.items() if v is not None}
        return json.dumps(satt) if satt else ""


def _sett_kontekst(conn: psycopg.Connection, kontekst: Kontekst) -> None:
    if conn.info.transaction_status != TransactionStatus.INTRANS:
        raise RuntimeError("Kontekst kan bare settes inne i en åpen transaksjon")
    if kontekst.rolle is None:
        conn.execute("SET LOCAL ROLE NONE")
    else:
        conn.execute(
            sql.SQL("SET LOCAL ROLE {}").format(sql.Identifier(kontekst.rolle))
        )
    conn.execute(
        "SELECT set_config(%s, %s, true)", (KONTEKSTVARIABEL, kontekst.krav())
    )


def _er_ren(conn: psycopg.Connection) -> bool:
    rad = conn.execute(
        "SELECT current_user = session_user,"
        " coalesce(current_setting(%s, true), '') = ''",
        (KONTEKSTVARIABEL,),
    ).fetchone()
    return rad == (True, True)


def _sjekk_ved_retur(conn: psycopg.Connection) -> None:
    """Poolens reset. Kaster forbindelsen om noe har overlevd transaksjonen."""
    if not _er_ren(conn):
        logger.error("Forbindelse med kontekst på sesjonsnivå kastet fra poolen")
        raise RuntimeError("kontekst på sesjonsnivå")


class Database:
    def __init__(self, pool: ConnectionPool, innstillinger: Settings):
        self._pool = pool
        self._innstillinger = innstillinger
        self._aktiv = threading.local()

    @contextmanager
    def transaksjon(
        self,
        kontekst: Kontekst,
        *,
        isolasjon: IsolationLevel = IsolationLevel.READ_COMMITTED,
    ) -> Iterator[psycopg.Connection]:
        """Én eksplisitt transaksjon med rolle og krav satt transaksjonslokalt.

        Commit ved normal utgang, rollback ved unntak. Kaster `UkjentUtfall`
        om forbindelsen brytes under COMMIT. Kan ikke nøstes i samme tråd.
        """
        if not isinstance(kontekst, Kontekst):
            raise TypeError("transaksjon krever en Kontekst")
        if getattr(self._aktiv, "inne", False):
            raise RuntimeError("En transaksjon er allerede åpen i denne tråden")

        self._aktiv.inne = True
        try:
            with self._pool.connection() as conn:
                yield from self._kjor(conn, kontekst, isolasjon)
        except psycopg.Error as feil:
            raise klassifiser(feil) from None
        finally:
            self._aktiv.inne = False

    def _kjor(
        self,
        conn: psycopg.Connection,
        kontekst: Kontekst,
        isolasjon: IsolationLevel,
    ) -> Iterator[psycopg.Connection]:
        fase = "start"
        try:
            with conn.transaction():
                conn.execute(_ISOLASJON[isolasjon])
                _sett_kontekst(conn, kontekst)
                fase = "kropp"
                yield conn
                if conn.info.transaction_status != TransactionStatus.INTRANS:
                    raise RuntimeError("Transaksjonen ble avsluttet eller avbrutt")
                fase = "commit"
        except psycopg.Error as feil:
            if fase == "commit" and (conn.broken or conn.closed):
                raise UkjentUtfall(
                    "Forbindelsen brøt under COMMIT. Utfallet er ukjent.",
                    original=feil,
                ) from None
            raise

    def utfor(
        self,
        kontekst: Kontekst,
        arbeid: Callable[[psycopg.Connection], T],
        *,
        isolasjon: IsolationLevel = IsolationLevel.READ_COMMITTED,
    ) -> T:
        """Kjør `arbeid` i én transaksjon. Hele transaksjonen kjøres på nytt ved
        `SerialiseringsFeil`, og bare da. `arbeid` må derfor være fri for
        virkninger utenfor basen."""
        innst = self._innstillinger
        for forsok in range(1, innst.database_retry_max_forsok + 1):
            try:
                with self.transaksjon(kontekst, isolasjon=isolasjon) as conn:
                    return arbeid(conn)
            except SerialiseringsFeil:
                if forsok == innst.database_retry_max_forsok:
                    raise
                pause = min(
                    innst.database_retry_backoff_base * 2 ** (forsok - 1),
                    innst.database_retry_backoff_max,
                )
                time.sleep(pause * random.uniform(0.5, 1.0))
        raise AssertionError("uoppnåelig")

    def lukk(self) -> None:
        self._pool.close()


def _tilkoblingsparametre(innstillinger: Settings) -> dict:
    hemmelig = innstillinger.database_url
    url = hemmelig.get_secret_value().strip() if hemmelig is not None else ""
    if not url:
        raise DatabaseIkkeKonfigurert(
            "DATABASE_URL er ikke satt. Det finnes ingen databasetilkobling."
        )
    try:
        return conninfo_to_dict(url)
    except psycopg.Error:
        raise DatabaseIkkeKonfigurert("DATABASE_URL kan ikke tolkes") from None


def opprett_database(innstillinger: Settings) -> Database:
    """Pool mot DATABASE_URL. Uten den finnes det ingen tilkobling."""
    parametre = _tilkoblingsparametre(innstillinger)
    parametre.setdefault("connect_timeout", innstillinger.database_connect_timeout)
    parametre.setdefault("application_name", "koe-backend")
    pool = ConnectionPool(
        kwargs={**parametre, "autocommit": True},
        min_size=innstillinger.database_pool_min,
        max_size=innstillinger.database_pool_max,
        timeout=innstillinger.database_pool_timeout,
        max_idle=innstillinger.database_pool_max_idle,
        max_lifetime=innstillinger.database_pool_max_lifetime,
        reset=_sjekk_ved_retur,
        name="koe",
        open=False,
    )
    pool.open(wait=False)
    return Database(pool, innstillinger)
