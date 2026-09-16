"""Saksavgrenset register over vedlegg, med mellomlagring fram til innsending.

Et vedlegg lastes **ikke** opp til Catenda når brukeren velger filen. Det ville
gjort dokumentet synlig for motparten før avsenderen har bestemt seg for å
sende noe, og biblioteket er delt: å fjerne det igjen rydder i Catenda, men
gjør det ikke usett. I stedet mellomlagres bytene her, og opplastingen skjer
først når hendelsen som viser til vedlegget er lagret.

Det gir to egenskaper som henger sammen:

- Et `staged` vedlegg har aldri forlatt oss, så det kan fjernes risikofritt.
- Et `pending` vedlegg er sendt i en lagret hendelse, men venter på Catenda.
- Et `delivered` vedlegg er lastet opp og koblet til saken i Catenda.

`vedlegg_id` genereres lokalt og er stabil gjennom hele livsløpet, slik at en
hendelse viser til den samme verdien før og etter levering. Catendas egen
item-ID lagres ved siden av når den finnes.

Tilgangskontroll er vår egen: backend snakker med Catenda gjennom appens
tjenestekonto, ikke brukerens Catenda-tilgang, så bibliotekets team-rettigheter
begrenser ikke hva appen kan lese.
"""

import json
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from lib.sqlite_connection import sqlite_connection

STAGED = "staged"
DELIVERED = "delivered"
PENDING = "pending"

_KOLONNER = (
    "project TEXT NOT NULL",
    "case_id TEXT NOT NULL",
    "vedlegg_id TEXT NOT NULL",
    "navn TEXT NOT NULL",
    "storrelse INTEGER NOT NULL",
    "lastet_opp_av TEXT NOT NULL",
    "lastet_opp_rolle TEXT NOT NULL",
    "tidspunkt TEXT NOT NULL",
    "status TEXT NOT NULL",
    "innhold BLOB",
    "catenda_item_id TEXT",
    "lastet_opp_team TEXT",
    "delivery_claim TEXT",
    "delivery_started TEXT",
)


class VedleggRegistry:
    def __init__(self, path=None):
        # Deler det allerede persistente lokale lageret, inkludert volumet.
        self.path = str(
            path or os.environ.get("BH_APPROVAL_DB", "koe_data/approvals.sqlite3")
        )
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite_connection(self.path) as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS vedlegg ("
                + ", ".join(_KOLONNER)
                + ", PRIMARY KEY (project, case_id, vedlegg_id))"
            )
            # Tabellen kan stamme fra en tidligere versjon uten mellomlagring.
            finnes = {rad[1] for rad in db.execute("PRAGMA table_info(vedlegg)")}
            for kolonne in (
                "status",
                "innhold",
                "catenda_item_id",
                "lastet_opp_team",
                "delivery_claim",
                "delivery_started",
            ):
                if kolonne not in finnes:
                    standard = (
                        " NOT NULL DEFAULT 'delivered'" if kolonne == "status" else ""
                    )
                    db.execute(
                        f"ALTER TABLE vedlegg ADD COLUMN {kolonne} TEXT{standard}"
                    )

    def stage(
        self, project, case_id, navn, innhold, lastet_opp_av, rolle, team=None
    ) -> dict:
        """Mellomlagre et vedlegg. Ingenting sendes til Catenda her.

        Returns:
            Oppføringen, uten innholdet.
        """
        vedlegg_id = str(uuid4())
        with sqlite_connection(self.path) as db:
            db.execute(
                "INSERT INTO vedlegg (project, case_id, vedlegg_id, navn, storrelse,"
                " lastet_opp_av, lastet_opp_rolle, tidspunkt, status, innhold,"
                " catenda_item_id,lastet_opp_team) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?)",
                (
                    project,
                    case_id,
                    vedlegg_id,
                    navn,
                    len(innhold),
                    lastet_opp_av,
                    rolle,
                    datetime.now(UTC).isoformat(),
                    STAGED,
                    innhold,
                    team,
                ),
            )
        return {
            "id": vedlegg_id,
            "navn": navn,
            "storrelse": len(innhold),
            "lastet_opp_av": lastet_opp_av,
            "lastet_opp_rolle": rolle,
            "status": STAGED,
            "lastet_opp_team": team,
        }

    def _rad_til_dict(self, rad) -> dict:
        return {
            "id": rad[0],
            "navn": rad[1],
            "storrelse": rad[2],
            "lastet_opp_av": rad[3],
            "lastet_opp_rolle": rad[4],
            "tidspunkt": rad[5],
            "status": rad[6],
            "catenda_item_id": rad[7],
            "lastet_opp_team": rad[8],
        }

    _FELTER = (
        "vedlegg_id,navn,storrelse,lastet_opp_av,lastet_opp_rolle,tidspunkt,"
        "status,catenda_item_id,lastet_opp_team"
    )

    @staticmethod
    def visible(entry, team):
        return entry["status"] in (PENDING, DELIVERED) or bool(
            team and entry.get("lastet_opp_team") == team
        )

    def validate_refs(self, project, case_id, refs, team):
        """Validate and canonicalize IDs before freezing an event or approval."""
        from lib.auth.domain import catenda_id

        known = {catenda_id(v["id"]): v for v in self.list(project, case_id)}
        result = []
        for ref in refs:
            entry = known.get(catenda_id(ref))
            if entry is None or not self.visible(entry, team):
                raise ValueError(
                    "Vedlegget er ikke tilgjengelig på denne saken for ditt team."
                )
            if entry["id"] not in result:
                result.append(entry["id"])
        return result

    def approval_refs(self, project, case_id):
        """Prepared and frozen attachments cannot be deleted beneath approval."""
        with sqlite_connection(self.path) as db:
            if not db.execute(
                "SELECT 1 FROM sqlite_master WHERE name='approvals'"
            ).fetchone():
                return set()
            row = db.execute(
                "SELECT body FROM approvals WHERE project=? AND case_id=?",
                (project, case_id),
            ).fetchone()
        if not row:
            return set()
        state = json.loads(row[0])
        items = [i for i in state["items"] if i["status"] != "erstattet"]
        for package in state["packages"]:
            items.extend(package.get("letter", {}).get("items", []))
        return {ref for i in items for ref in i.get("data", {}).get("vedlegg_ids", [])}

    def mark_pending(self, project, case_id, vedlegg_id):
        with sqlite_connection(self.path) as db:
            db.execute(
                "UPDATE vedlegg SET status=? WHERE project=? AND case_id=? AND vedlegg_id=? AND status=?",
                (PENDING, project, case_id, vedlegg_id, STAGED),
            )

    def claim_delivery(self, project, case_id, vedlegg_id):
        """Serialize retry workers without holding SQLite locked during HTTP."""
        token = str(uuid4())
        now = datetime.now(UTC)
        with sqlite_connection(self.path) as db:
            changed = db.execute(
                "UPDATE vedlegg SET delivery_claim=?,delivery_started=?"
                " WHERE project=? AND case_id=? AND vedlegg_id=? AND status=?"
                " AND (delivery_claim IS NULL OR delivery_started<?)",
                (
                    token,
                    now.isoformat(),
                    project,
                    case_id,
                    vedlegg_id,
                    PENDING,
                    (now - timedelta(minutes=10)).isoformat(),
                ),
            ).rowcount
        return token if changed else None

    def release_delivery(self, project, case_id, vedlegg_id, token):
        with sqlite_connection(self.path) as db:
            db.execute(
                "UPDATE vedlegg SET delivery_claim=NULL,delivery_started=NULL"
                " WHERE project=? AND case_id=? AND vedlegg_id=? AND delivery_claim=?",
                (project, case_id, vedlegg_id, token),
            )

    def list(self, project, case_id) -> list[dict]:
        """Vedlegg registrert på saken, eldst først. Uten innhold."""
        with sqlite_connection(self.path) as db:
            rader = db.execute(
                f"SELECT {self._FELTER} FROM vedlegg WHERE project=? AND case_id=?"
                " ORDER BY tidspunkt",
                (project, case_id),
            ).fetchall()
        return [self._rad_til_dict(rad) for rad in rader]

    def get(self, project, case_id, vedlegg_id) -> dict | None:
        """Én oppføring, uten innhold."""
        with sqlite_connection(self.path) as db:
            rad = db.execute(
                f"SELECT {self._FELTER} FROM vedlegg"
                " WHERE project=? AND case_id=? AND vedlegg_id=?",
                (project, case_id, vedlegg_id),
            ).fetchone()
        return self._rad_til_dict(rad) if rad else None

    def content(self, project, case_id, vedlegg_id) -> bytes | None:
        """Mellomlagret innhold, eller None når opplastingen er kvittert."""
        with sqlite_connection(self.path) as db:
            rad = db.execute(
                "SELECT innhold FROM vedlegg"
                " WHERE project=? AND case_id=? AND vedlegg_id=?",
                (project, case_id, vedlegg_id),
            ).fetchone()
        return rad[0] if rad and rad[0] is not None else None

    def mark_delivered(self, project, case_id, vedlegg_id, catenda_item_id) -> None:
        """Marker som levert og slipp det mellomlagrede innholdet.

        Catenda holder dokumentet etter dette; å beholde bytene ville vært den
        dobbeltlagringen vi bevisst unngår.
        """
        with sqlite_connection(self.path) as db:
            db.execute(
                "UPDATE vedlegg SET status=?, catenda_item_id=?, innhold=NULL"
                " WHERE project=? AND case_id=? AND vedlegg_id=?",
                (DELIVERED, catenda_item_id, project, case_id, vedlegg_id),
            )

    def mark_uploaded(self, project, case_id, vedlegg_id, catenda_item_id):
        """Keep the upload receipt even when linking to the topic fails."""
        with sqlite_connection(self.path) as db:
            db.execute(
                "UPDATE vedlegg SET catenda_item_id=?,innhold=NULL"
                " WHERE project=? AND case_id=? AND vedlegg_id=?",
                (catenda_item_id, project, case_id, vedlegg_id),
            )

    def delete(self, project, case_id, vedlegg_id) -> None:
        """Fjern oppføringen og eventuelt mellomlagret innhold."""
        from lib.auth.domain import catenda_id

        with sqlite_connection(self.path) as db:
            # Serialize against approval prepare/package in the same database.
            db.execute("BEGIN IMMEDIATE")
            if catenda_id(vedlegg_id) in {
                catenda_id(ref) for ref in self.approval_refs(project, case_id)
            }:
                raise ValueError("Vedlegget er brukt i en ferdigstilt vurdering.")
            deleted = db.execute(
                "DELETE FROM vedlegg WHERE project=? AND case_id=? AND vedlegg_id=? AND status=?",
                (project, case_id, vedlegg_id, STAGED),
            ).rowcount
            if not deleted:
                raise ValueError("Vedlegget er allerede sendt eller fjernet.")

    def belongs_to_case(self, project, case_id, vedlegg_id) -> bool:
        """Om vedlegget er registrert på nøyaktig denne saken i dette prosjektet."""
        return self.get(project, case_id, vedlegg_id) is not None
