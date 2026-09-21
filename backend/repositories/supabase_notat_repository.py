"""Supabase-lager for interne notater (MS-05).

Skjemaet står i `supabase/migrations/20260921153900_notat_tabell.sql` og ingen
andre steder.
"""

import os

try:
    from supabase import Client, create_client

    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

from lib.supabase import alle_rader, safe_execute, with_retry
from models.notat import Notat

from .notat_repository import NotatRepository

NOTAT_TABELL = "notat"


class SupabaseNotatRepository(NotatRepository):
    """Notatlager på Supabase/PostgreSQL.

    Miljøvariabler:
    - SUPABASE_URL: prosjektets URL
    - SUPABASE_SECRET_KEY: tjenestenøkkel (backend)
    """

    def __init__(self, url: str | None = None, key: str | None = None):
        if not SUPABASE_AVAILABLE:
            raise ImportError(
                "Supabase client not installed. Run: pip install supabase"
            )

        self.url = url or os.environ.get("SUPABASE_URL")
        self.key = key or os.environ.get("SUPABASE_SECRET_KEY")

        if not self.url or not self.key:
            raise ValueError(
                "Supabase credentials required. Set SUPABASE_URL and "
                "SUPABASE_SECRET_KEY environment variable or pass it to constructor."
            )

        self.client: Client = create_client(self.url, self.key)

    def _tabell(self):
        return self.client.table(NOTAT_TABELL)

    def lagre(self, notat: Notat) -> Notat:
        @with_retry()
        def _kjor() -> Notat:
            self._tabell().insert(notat.til_rad()).execute()
            return notat

        return _kjor()

    def for_sak(self, sak_id: str, prosjekt_id: str) -> list[Notat]:
        @with_retry()
        def _kjor() -> list[Notat]:
            def side(start: int, slutt: int) -> list[dict]:
                return (
                    self._tabell()
                    .select("*")
                    .eq("sak_id", sak_id)
                    .eq("prosjekt_id", prosjekt_id)
                    # notat_id som andre nøkkel: to notater kan dele
                    # tidsstempel, og da er sorteringen ustabil mellom sider.
                    .order("opprettet")
                    .order("notat_id")
                    .range(start, slutt)
                    .execute()
                    .data
                )

            return [Notat.fra_rad(rad) for rad in alle_rader(side)]

        # Et notat som ikke kan leses, skal skjules — ikke velte tidslinjen.
        # Samme valg som skjermingsfilteret gjør når teamet ikke kan bekreftes.
        return safe_execute(
            _kjor, f"Kunne ikke lese notater for {sak_id}", default=[]
        ) or []

    def hent(self, notat_id: str, prosjekt_id: str) -> Notat | None:
        @with_retry()
        def _kjor() -> Notat | None:
            svar = (
                self._tabell()
                .select("*")
                .eq("notat_id", notat_id)
                .eq("prosjekt_id", prosjekt_id)
                .limit(1)
                .execute()
            )
            return Notat.fra_rad(svar.data[0]) if svar.data else None

        return safe_execute(_kjor, f"Kunne ikke lese notat {notat_id}", default=None)

    def slett(self, notat_id: str, prosjekt_id: str) -> bool:
        @with_retry()
        def _kjor() -> bool:
            svar = (
                self._tabell()
                .delete()
                .eq("notat_id", notat_id)
                .eq("prosjekt_id", prosjekt_id)
                .execute()
            )
            return bool(svar.data)

        return bool(_kjor())
