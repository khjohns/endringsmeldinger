"""Saksavgrenset register over vedlegg lastet opp gjennom appen.

Registeret er tilgangsgrunnlaget for nedlasting. Backend snakker med Catenda
gjennom appens tjenestekonto, ikke brukerens egen Catenda-tilgang, så Catendas
team-baserte biblioteksrettigheter begrenser ikke hva appen kan lese. Det er
derfor vår egen side som må avgjøre hvem som får se hvilket dokument, og et
vedlegg hører til nøyaktig én sak i ett prosjekt.

Registeret dekker også vinduet mellom opplasting og innsending: et vedlegg kan
vises og lastes ned før hendelsen som refererer til det er lagret.
"""

import os
from datetime import UTC, datetime
from pathlib import Path

from lib.sqlite_connection import sqlite_connection


class VedleggRegistry:
    def __init__(self, path=None):
        # Deler det allerede persistente lokale lageret, inkludert volumet.
        self.path = str(
            path or os.environ.get("BH_APPROVAL_DB", "koe_data/approvals.sqlite3")
        )
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite_connection(self.path) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS vedlegg (
                project TEXT NOT NULL, case_id TEXT NOT NULL, vedlegg_id TEXT NOT NULL,
                navn TEXT NOT NULL, storrelse INTEGER NOT NULL,
                lastet_opp_av TEXT NOT NULL, lastet_opp_rolle TEXT NOT NULL,
                tidspunkt TEXT NOT NULL,
                PRIMARY KEY (project, case_id, vedlegg_id))""")

    def record(
        self, project, case_id, vedlegg_id, navn, storrelse, lastet_opp_av, rolle
    ):
        """Registrer et opplastet vedlegg på saken."""
        with sqlite_connection(self.path) as db:
            db.execute(
                "INSERT OR REPLACE INTO vedlegg VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    project,
                    case_id,
                    vedlegg_id,
                    navn,
                    int(storrelse),
                    lastet_opp_av,
                    rolle,
                    datetime.now(UTC).isoformat(),
                ),
            )

    def list(self, project, case_id) -> list[dict]:
        """Vedlegg registrert på saken, eldst først."""
        with sqlite_connection(self.path) as db:
            rows = db.execute(
                "SELECT vedlegg_id,navn,storrelse,lastet_opp_av,lastet_opp_rolle,"
                "tidspunkt FROM vedlegg WHERE project=? AND case_id=? "
                "ORDER BY tidspunkt",
                (project, case_id),
            ).fetchall()
        return [
            {
                "id": row[0],
                "navn": row[1],
                "storrelse": row[2],
                "lastet_opp_av": row[3],
                "lastet_opp_rolle": row[4],
                "tidspunkt": row[5],
            }
            for row in rows
        ]

    def belongs_to_case(self, project, case_id, vedlegg_id) -> bool:
        """Om vedlegget er registrert på nøyaktig denne saken i dette prosjektet."""
        with sqlite_connection(self.path) as db:
            return (
                db.execute(
                    "SELECT 1 FROM vedlegg WHERE project=? AND case_id=? AND vedlegg_id=?",
                    (project, case_id, vedlegg_id),
                ).fetchone()
                is not None
            )
