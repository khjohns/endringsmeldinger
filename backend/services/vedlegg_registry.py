"""Saksavgrenset register over vedlegg, med mellomlagring fram til innsending.

Et vedlegg lastes **ikke** opp til Catenda når brukeren velger filen. Det ville
gjort dokumentet synlig for motparten før avsenderen har bestemt seg for å
sende noe, og biblioteket er delt: å fjerne det igjen rydder i Catenda, men
gjør det ikke usett. I stedet mellomlagres bytene her, og opplastingen skjer
først når hendelsen som viser til vedlegget er lagret.

Det gir to egenskaper som henger sammen:

- Et `staged` vedlegg har aldri forlatt oss, så det kan fjernes risikofritt.
- Et `delivered` vedlegg er i bruk i en lagret hendelse og er del av sakens
  formelle grunnlag.

`vedlegg_id` genereres lokalt og er stabil gjennom hele livsløpet, slik at en
hendelse viser til den samme verdien før og etter levering. Catendas egen
item-ID lagres ved siden av når den finnes.

Tilgangskontroll er vår egen: backend snakker med Catenda gjennom appens
tjenestekonto, ikke brukerens Catenda-tilgang, så bibliotekets team-rettigheter
begrenser ikke hva appen kan lese.
"""

import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from lib.sqlite_connection import sqlite_connection

STAGED = "staged"
DELIVERED = "delivered"

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
            for kolonne in ("status", "innhold", "catenda_item_id"):
                if kolonne not in finnes:
                    standard = " NOT NULL DEFAULT 'delivered'" if kolonne == "status" else ""
                    db.execute(f"ALTER TABLE vedlegg ADD COLUMN {kolonne} TEXT{standard}")

    def stage(self, project, case_id, navn, innhold, lastet_opp_av, rolle) -> dict:
        """Mellomlagre et vedlegg. Ingenting sendes til Catenda her.

        Returns:
            Oppføringen, uten innholdet.
        """
        vedlegg_id = str(uuid4())
        with sqlite_connection(self.path) as db:
            db.execute(
                "INSERT INTO vedlegg (project, case_id, vedlegg_id, navn, storrelse,"
                " lastet_opp_av, lastet_opp_rolle, tidspunkt, status, innhold,"
                " catenda_item_id) VALUES (?,?,?,?,?,?,?,?,?,?,NULL)",
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
                ),
            )
        return {
            "id": vedlegg_id,
            "navn": navn,
            "storrelse": len(innhold),
            "lastet_opp_av": lastet_opp_av,
            "lastet_opp_rolle": rolle,
            "status": STAGED,
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
        }

    _FELTER = (
        "vedlegg_id,navn,storrelse,lastet_opp_av,lastet_opp_rolle,tidspunkt,"
        "status,catenda_item_id"
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
        """Mellomlagret innhold, eller None når vedlegget er levert."""
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

    def delete(self, project, case_id, vedlegg_id) -> None:
        """Fjern oppføringen og eventuelt mellomlagret innhold."""
        with sqlite_connection(self.path) as db:
            db.execute(
                "DELETE FROM vedlegg WHERE project=? AND case_id=? AND vedlegg_id=?",
                (project, case_id, vedlegg_id),
            )

    def belongs_to_case(self, project, case_id, vedlegg_id) -> bool:
        """Om vedlegget er registrert på nøyaktig denne saken i dette prosjektet."""
        return self.get(project, case_id, vedlegg_id) is not None
