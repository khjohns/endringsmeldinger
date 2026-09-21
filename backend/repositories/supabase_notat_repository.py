"""Supabase-lager for interne notater (MS-05).

Skjemaet står i `supabase/migrations/20260921153900_notat_tabell.sql` og ingen
andre steder.
"""

from lib.supabase import alle_rader, create_supabase_client, with_retry
from models.notat import Notat

from .notat_repository import NotatRepository

NOTAT_TABELL = "notat"


class SupabaseNotatRepository(NotatRepository):
    """Notatlager på Supabase/PostgreSQL."""

    def __init__(self, url: str | None = None, key: str | None = None):
        self.client = create_supabase_client(url=url, key=key)

    def _tabell(self):
        return self.client.table(NOTAT_TABELL)

    @with_retry()
    def lagre(self, notat: Notat) -> Notat:
        self._tabell().insert(notat.til_rad()).execute()
        return notat

    @with_retry()
    def _side(self, sak_id: str, prosjekt_id: str, start: int, slutt: int) -> list[dict]:
        return (
            self._tabell()
            .select("*")
            .eq("sak_id", sak_id)
            .eq("prosjekt_id", prosjekt_id)
            # notat_id som andre nøkkel: to notater kan dele tidsstempel, og da
            # er sorteringen ustabil mellom sider.
            .order("opprettet")
            .order("notat_id")
            .range(start, slutt)
            .execute()
            .data
        )

    def for_sak(self, sak_id: str, prosjekt_id: str) -> list[Notat]:
        rader = alle_rader(
            lambda start, slutt: self._side(sak_id, prosjekt_id, start, slutt)
        )
        return [Notat.fra_rad(rad) for rad in rader]

    @with_retry()
    def hent(self, sak_id: str, notat_id: str, prosjekt_id: str) -> Notat | None:
        svar = (
            self._tabell()
            .select("*")
            .eq("sak_id", sak_id)
            .eq("notat_id", notat_id)
            .eq("prosjekt_id", prosjekt_id)
            .limit(1)
            .execute()
        )
        return Notat.fra_rad(svar.data[0]) if svar.data else None

    @with_retry()
    def slett(
        self, sak_id: str, notat_id: str, prosjekt_id: str, aktor_id: str
    ) -> bool:
        # Alle fire grensene som likhetsfiltre i én setning: et oppslag først
        # ville vært to rundturer, og et vindu mellom kontroll og sletting.
        svar = (
            self._tabell()
            .delete()
            .eq("sak_id", sak_id)
            .eq("notat_id", notat_id)
            .eq("prosjekt_id", prosjekt_id)
            .eq("aktor_id", aktor_id)
            .execute()
        )
        return bool(svar.data)
