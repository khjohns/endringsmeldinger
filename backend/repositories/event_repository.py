"""
Event store with optimistic concurrency control.

Platform: Requires Linux/macOS/WSL2 (uses fcntl for file locking)
"""

import fcntl  # Unix-only - see platform requirements
import json
import os
import tempfile
from abc import ABC, abstractmethod
from pathlib import Path

from lib.supabase.exceptions import ConflictError, PermanentError
from models.events import EventType

# Hendelsestyper som ikke hører hjemme i journalen. Interne notater er ikke
# kontraktsvarsler og bor i `notat` (MS-05); journalen skal få
# `REVOKE UPDATE, DELETE`, så en rad som kommer inn her, blir stående for godt.
UTENFOR_JOURNALEN = frozenset({EventType.INTERNT_NOTAT.value})


class JournalfoeringAvvist(PermanentError, ValueError):
    """Hendelsestypen har sitt eget lager og skal ikke i journalen (MS-05).

    Arver begge av samme grunn som `ConcurrencyError` arver `ConflictError`:
    uten `PermanentError` ville retry-dekoratøren rundt Supabase-lageret
    klassifisert avvisningen som en ukjent, forbigående feil — sovet, prøvd
    igjen, og til slutt kastet noe ruta oversetter til 500. `ValueError` er det
    rutene allerede fanger og gjør om til 400.
    """


def krev_journalhendelser(events: list) -> None:
    """Avvis hendelser som har sitt eget lager.

    Vakten ligger i lageret og ikke i ruta med vilje: det finnes to
    innsendingsruter, og en tredje ville arvet regelen bare ved å huske den.

    Raises:
        JournalfoeringAvvist: Ved en hendelsestype som ikke skal journalføres.
    """
    for event in events:
        event_type = getattr(event, "event_type", None)
        navn = getattr(event_type, "value", event_type)
        if navn in UTENFOR_JOURNALEN:
            raise JournalfoeringAvvist(
                f"{navn} skal ikke skrives til hendelsesloggen. "
                "Den har sitt eget lager (MS-05)."
            )


class ConcurrencyError(ConflictError):
    """Kastes når expected_version ikke matcher faktisk versjon.

    Arver ConflictError (en PermanentError) med vilje. Uten det ville
    retry-dekoratøren rundt Supabase-lageret klassifisert konflikten som en
    ukjent, forbigående feil: den ville sovet og prøvd igjen, og deretter kastet
    noe `except ConcurrencyError` i ruten ikke fanger — 500 i stedet for 409.
    Et nytt forsøk kan uansett ikke hjelpe, og etter et tapt svar er skrivingen
    kanskje allerede committet (audit RV-11).
    """

    def __init__(self, expected: int, actual: int):
        self.expected = expected
        self.actual = actual
        super().__init__(f"Versjonskonflikt: forventet {expected}, fikk {actual}")


class EventRepository(ABC):
    """Abstract event store with optimistic locking."""

    @abstractmethod
    def append(self, event, expected_version: int) -> int:
        """
        Append event with optimistic concurrency control.

        Args:
            event: The event to append
            expected_version: Expected current version (0 for new case)

        Returns:
            New version number

        Raises:
            ConcurrencyError: If expected_version != current version
        """
        pass

    @abstractmethod
    def append_batch(self, events: list, expected_version: int) -> int:
        """
        Atomically append multiple events.

        All events must be for the same sak_id.
        Either all succeed or none are persisted.
        """
        pass

    @abstractmethod
    def get_events(self, sak_id: str) -> tuple[list, int]:
        """
        Get all events and current version for a case.

        Returns:
            Tuple of (events_list, current_version)
        """
        pass

    def gjeldende_versjon(self, sak_id: str) -> int:
        """Sakens versjon, uten å lese hele strømmen.

        Begge lagrene har oppslaget fra før: Supabase-varianten er en
        `select versjon … limit 1` framfor et uttrekk av hver hendelse på saken.
        """
        return self._get_current_version(sak_id)


class JsonFileEventRepository(EventRepository):
    """
    JSON file-based event store with file locking.

    Storage format per case:
    {
        "version": 5,
        "events": [...]
    }
    """

    def __init__(self, base_path: str = "koe_data/events"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, sak_id: str) -> Path:
        # Sanitize sak_id for filesystem
        safe_id = sak_id.replace("/", "_").replace("\\", "_")
        return self.base_path / f"{safe_id}.json"

    def _load_with_lock(self, sak_id: str) -> tuple[dict, any]:
        """Load data with exclusive lock, returns (data, file_handle)."""
        file_path = self._get_file_path(sak_id)

        if not file_path.exists():
            return {"version": 0, "events": []}, None

        f = open(file_path, "r+", encoding="utf-8")
        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
        data = json.load(f)
        return data, f

    def append(self, event, expected_version: int) -> int:
        return self.append_batch([event], expected_version)

    def append_batch(self, events: list, expected_version: int) -> int:
        """
        Atomic batch append with optimistic locking.

        Uses file locking to ensure atomicity.
        """
        if not events:
            raise ValueError("Kan ikke legge til tom event-liste")

        krev_journalhendelser(events)

        sak_id = events[0].sak_id
        if not all(e.sak_id == sak_id for e in events):
            raise ValueError("Alle events må tilhøre samme sak_id")

        file_path = self._get_file_path(sak_id)

        # Create new file for version 0
        if expected_version == 0:
            if file_path.exists():
                raise ConcurrencyError(0, self._get_current_version(sak_id))

            data = {
                "version": len(events),
                "events": [e.model_dump(mode="json") for e in events],
            }

            fd, temp_path = tempfile.mkstemp(
                dir=self.base_path, prefix=f".{file_path.stem}.", suffix=".tmp"
            )
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2, default=str)
                # `rename` erstatter en eksisterende saksfil i det stille; `link` feiler (TST-02).
                os.link(temp_path, file_path)
            except FileExistsError:
                raise ConcurrencyError(0, self._get_current_version(sak_id)) from None
            finally:
                os.unlink(temp_path)

            return len(events)

        # Existing file - lock and update
        data, f = self._load_with_lock(sak_id)

        try:
            current_version = data.get("version", 0)

            if current_version != expected_version:
                raise ConcurrencyError(expected_version, current_version)

            # Append events
            for event in events:
                data["events"].append(event.model_dump(mode="json"))

            new_version = current_version + len(events)
            data["version"] = new_version

            # Write directly to locked file handle
            f.seek(0)
            f.truncate()
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
            f.flush()
            os.fsync(f.fileno())  # Ensure data is written to disk

            return new_version

        finally:
            if f:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                f.close()

    def get_events(self, sak_id: str) -> tuple[list[dict], int]:
        """
        Get all events and current version for a case.

        Returns:
            Tuple of (events_list as dicts, current_version)
        """
        file_path = self._get_file_path(sak_id)

        if not file_path.exists():
            return [], 0

        # Use shared lock for reading to prevent reading during writes
        with open(file_path, encoding="utf-8") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            try:
                data = json.load(f)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)

        events = data.get("events", [])
        version = data.get("version", len(events))

        return events, version

    def _get_current_version(self, sak_id: str) -> int:
        _, version = self.get_events(sak_id)
        return version

    def find_sak_id_by_catenda_topic(self, catenda_topic_id: str) -> str | None:
        """
        Find local sak_id given a Catenda topic GUID.

        Scans all event files and checks the SAK_OPPRETTET event for
        matching catenda_topic_id.

        Args:
            catenda_topic_id: Catenda topic GUID to look up

        Returns:
            Local sak_id if found, None otherwise
        """
        if not catenda_topic_id:
            return None

        # Scan all event files
        for file_path in self.base_path.glob("*.json"):
            try:
                with open(file_path, encoding="utf-8") as f:
                    data = json.load(f)

                events = data.get("events", [])
                if not events:
                    continue

                # Check first event (SAK_OPPRETTET)
                first_event = events[0]
                if first_event.get("catenda_topic_id") == catenda_topic_id:
                    return first_event.get("sak_id")

            except Exception:
                continue

        return None

    def list_all_sak_ids(self) -> list[str]:
        """
        List all sak_ids in the repository.

        Returns:
            List of sak_id strings
        """
        sak_ids = []
        for file_path in self.base_path.glob("*.json"):
            # Extract sak_id from filename
            sak_id = file_path.stem
            sak_ids.append(sak_id)
        return sak_ids
