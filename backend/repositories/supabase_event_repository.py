"""Supabase-lager for hendelsesloggen, i CloudEvents v1.0-format.

Alle saker ligger i tabellen `hendelse` (MS-01). Sakstypen bor på
`sak_metadata.sakstype` og velger ikke tabell.

Skjemaet står i `supabase/migrations/20260920193558_hendelse_tabell.sql` og
ingen andre steder.
"""

import os

# Supabase Python client
try:
    from supabase import Client, create_client

    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

from lib.project_context import krev_autorisert_prosjekt
from lib.supabase import ConflictError, classify_error, with_retry
from models.cloudevents import CLOUDEVENTS_NAMESPACE, CLOUDEVENTS_SPECVERSION

from .event_repository import ConcurrencyError, EventRepository

HENDELSE_TABELL = "hendelse"

# Sider ved uttrekk uten filter. PostgREST har sitt eget tak (`db-max-rows`),
# og kallerne må tåle at serveren gir færre rader enn bedt om.
SIDESTORRELSE = 500


class SupabaseEventRepository(EventRepository):
    """Hendelseslager på Supabase/PostgreSQL, i CloudEvents-format.

    Alle sakstyper ligger i `hendelse` (MS-01). Sakstypen bor på
    `sak_metadata.sakstype` og velger ikke tabell.

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
        return self.client.table(HENDELSE_TABELL)

    def _event_to_cloudevent_row(self, event, version: int) -> dict:
        """Gjør en hendelse om til en rad i CloudEvents-form."""
        sak_id = event.sak_id

        ce = event.to_cloudevent()

        return {
            "specversion": ce.get("specversion", CLOUDEVENTS_SPECVERSION),
            "event_id": str(ce.get("id")),
            "source": ce.get("source"),
            "type": ce.get("type"),
            "time": ce.get("time"),
            "subject": ce.get("subject", sak_id),
            "datacontenttype": ce.get("datacontenttype", "application/json"),
            # Identiteten til den som handlet, aldri navnet (MS-04).
            "actorid": ce.get("actorid"),
            "actorrole": ce.get("actorrole"),
            # Server-stamped: the reader's team is compared against this when
            # deciding who may see an internt_notat (lib/auth/event_visibility).
            "actorteam": ce.get("actorteam"),
            "comment": ce.get("comment"),
            "referstoid": str(ce.get("referstoid")) if ce.get("referstoid") else None,
            "data": ce.get("data", {}),
            # Stemples av serveren fra autorisert kontekst, aldri av klienten.
            "prosjekt_id": krev_autorisert_prosjekt("hendelse"),
            "sak_id": sak_id,
            "event_type": ce.get("type", "").replace(f"{CLOUDEVENTS_NAMESPACE}.", ""),
            "versjon": version,
        }

    def _row_to_event_dict(self, row: dict) -> dict:
        """Gjør en rad om til den interne hendelsesstrukturen."""
        # Supabase gir "2025-12-22 11:33:01.352433+00"; Pydantic vil ha
        # "2025-12-22T11:33:01.352433+00:00".
        time_value = row.get("time")
        if time_value and isinstance(time_value, str):
            time_value = time_value.replace(" ", "T")
            if time_value.endswith("+00"):
                time_value = time_value + ":00"
            elif time_value.endswith("-00"):
                time_value = time_value[:-3] + "-00:00"

        return {
            "event_id": row.get("event_id"),
            "sak_id": row.get("sak_id") or row.get("subject"),
            "event_type": row.get("event_type")
            or row.get("type", "").replace(f"{CLOUDEVENTS_NAMESPACE}.", ""),
            "tidsstempel": time_value,
            "aktor_id": row.get("actorid"),
            "aktor_rolle": row.get("actorrole"),
            # Rows written before the actorteam column existed have no team.
            # They stay None: event_visibility hides such notes from everyone.
            "aktor_team_id": row.get("actorteam"),
            "data": row.get("data"),
            "kommentar": row.get("comment"),
            "refererer_til_event_id": row.get("referstoid"),
            "_cloudevents": {
                "specversion": row.get("specversion"),
                "source": row.get("source"),
                "type": row.get("type"),
                "subject": row.get("subject"),
                "datacontenttype": row.get("datacontenttype"),
            },
        }

    def append(self, event, expected_version: int) -> int:
        """Legg til én hendelse med optimistisk låsing."""
        return self.append_batch([event], expected_version)

    @with_retry()
    def append_batch(self, events: list, expected_version: int) -> int:
        """Legg til flere hendelser atomisk.

        Unik-skranken (sak_id, versjon) er den optimistiske låsen: finnes
        versjonen, feiler innsettingen.

        Raises:
            ConcurrencyError: versjonskonflikt
            TransientError: nettverk/timeout etter oppbrukte forsøk
            PermanentError: auth- eller valideringsfeil
        """
        if not events:
            raise ValueError("Kan ikke legge til tom event-liste")

        sak_id = events[0].sak_id
        if not all(e.sak_id == sak_id for e in events):
            raise ValueError("Alle events må tilhøre samme sak_id")

        current_version = self._get_current_version(sak_id)
        if current_version != expected_version:
            raise ConcurrencyError(expected_version, current_version)

        rows = [
            self._event_to_cloudevent_row(event, expected_version + i + 1)
            for i, event in enumerate(events)
        ]

        try:
            self._tabell().insert(rows).execute()
            return expected_version + len(events)
        except Exception as e:
            classified = classify_error(e)
            if isinstance(classified, ConflictError):
                raise ConcurrencyError(
                    expected_version, self._get_current_version(sak_id)
                )
            raise classified from e

    @with_retry()
    def get_events(self, sak_id: str) -> tuple[list[dict], int]:
        """Alle hendelser på saken, sortert på versjon, og gjeldende versjon."""
        result = (
            self._tabell()
            .select("*")
            .eq("sak_id", sak_id)
            .order("versjon", desc=False)
            .execute()
        )

        rows = result.data if result.data else []
        if not rows:
            return [], 0

        return [self._row_to_event_dict(row) for row in rows], rows[-1]["versjon"]

    @with_retry()
    def _get_current_version(self, sak_id: str) -> int:
        """Gjeldende versjon, eller 0 når saken ikke finnes."""
        result = (
            self._tabell()
            .select("versjon")
            .eq("sak_id", sak_id)
            .order("versjon", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]["versjon"]
        return 0

    @with_retry()
    def get_all_sak_ids(self) -> list[str]:
        """Alle saks-IDer i loggen.

        Loggen har én rad per hendelse, ikke per sak, og PostgREST avkorter et
        ufiltrert uttrekk uten å si fra. Sidene hentes derfor eksplisitt, og
        neste side starter der forrige faktisk sluttet — serverens tak kan
        være lavere enn sidestørrelsen (KR-03).
        """
        sak_ids: set[str] = set()
        start = 0
        while True:
            rader = (
                self._tabell()
                .select("sak_id")
                .order("id")
                .range(start, start + SIDESTORRELSE - 1)
                .execute()
                .data
                or []
            )
            if not rader:
                return sorted(sak_ids)
            sak_ids.update(rad["sak_id"] for rad in rader)
            start += len(rader)

    @with_retry()
    def get_events_by_type(self, sak_id: str, event_type: str) -> list[dict]:
        """Hendelser av én type på saken (nyttig ved feilsøking)."""
        result = (
            self._tabell()
            .select("*")
            .eq("sak_id", sak_id)
            .eq("event_type", event_type)
            .order("versjon", desc=False)
            .execute()
        )
        return [self._row_to_event_dict(row) for row in result.data or []]

    @with_retry()
    def get_events_as_cloudevents(self, sak_id: str) -> list[dict]:
        """Hendelsene i CloudEvents-format, for eksterne integrasjoner."""
        result = (
            self._tabell()
            .select(
                "specversion, event_id, source, type, time, subject, "
                "datacontenttype, actorid, actorrole, actorteam, comment, "
                "referstoid, data"
            )
            .eq("sak_id", sak_id)
            .order("versjon", desc=False)
            .execute()
        )

        return [
            {
                "specversion": row["specversion"],
                "id": row["event_id"],
                "source": row["source"],
                "type": row["type"],
                "time": row["time"],
                "subject": row["subject"],
                "datacontenttype": row["datacontenttype"],
                "actorid": row["actorid"],
                "actorrole": row["actorrole"],
                "actorteam": row["actorteam"],
                "comment": row["comment"],
                "referstoid": row["referstoid"],
                "data": row["data"],
            }
            for row in result.data or []
        ]

    @with_retry()
    def find_sak_id_by_catenda_topic(self, catenda_topic_id: str) -> str | None:
        """Lokal sak_id for en Catenda-topic-GUID, eller None."""
        if not catenda_topic_id:
            return None

        rader = (
            self._tabell()
            .select("sak_id")
            .eq("event_type", "sak_opprettet")
            .eq("data->>catenda_topic_id", catenda_topic_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        return rader[0]["sak_id"] if rader else None


# Factory function for easy switching
def create_event_repository(backend: str | None = None, **kwargs) -> EventRepository:
    """
    Factory for creating event repository.

    Args:
        backend: "json", "supabase", or "dataverse" (future)
                 If None, reads from EVENT_STORE_BACKEND environment variable
                 Defaults to "json" if not set
        **kwargs: Backend-specific configuration

    Environment Variables:
        EVENT_STORE_BACKEND: "json" (default), "supabase", or "dataverse"

    Examples:
        # Automatic (reads EVENT_STORE_BACKEND env var)
        repo = create_event_repository()

        # Local development (explicit)
        repo = create_event_repository("json", base_path="koe_data/events")

        # Supabase testing
        repo = create_event_repository("supabase")

        # Production (future)
        repo = create_event_repository("dataverse", environment_url="...")
    """
    import logging

    logger = logging.getLogger(__name__)

    if backend is None:
        backend = os.environ.get("EVENT_STORE_BACKEND", "json")

    logger.debug(f"Creating event repository with backend: {backend}")

    if backend == "json":
        from .event_repository import JsonFileEventRepository

        return JsonFileEventRepository(**kwargs)

    elif backend == "supabase":
        return SupabaseEventRepository(**kwargs)

    elif backend == "dataverse":
        # Future implementation
        raise NotImplementedError(
            "Dataverse repository not yet implemented. "
            "See docs/TECHNOLOGY_COMPARISON.md for migration plan."
        )

    else:
        raise ValueError(f"Unknown backend: {backend}")
