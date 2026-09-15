"""Felles arbeidsutkast, avgrenset til én organisasjon i én sak.

Utkastet tilhører **teamet**, ikke personen. Flere saksbehandlere i samme
organisasjon skal kunne arbeide i samme tekst, og det var hele poenget med å
flytte utkastet av nettleseren: lokal lagring har ingen eier vi har bekreftet,
så en ny bruker i samme nettleser kunne få den forrige brukerens kravtekst.

Grensen går på Catenda-team-ID, ikke på kontraktsside. En side kan ha flere
team — byggherren og en ekstern rådgiver er ulike organisasjoner på samme side
— så et TE/BH-skille ville latt rådgiveren redigere byggherrens tekst. Dette er
samme grense som interne notater bruker (`lib/auth/event_visibility.py`).

Regelen er fail-closed: uten en entydig organisasjon finnes det ikke noe utkast
å hente eller skrive. `AuthService.contract_membership` gir `None` som team når
brukeren treffer flere team på samme side, og registeret avviser det her i
stedet for å behandle «ukjent» som en egen delt bøtte.

Catenda er kilden for hvem som sitter i hvilket team, men ikke vakten:
backend snakker med Catenda gjennom appens tjenestekonto, ikke brukerens, så
bibliotekets teamrettigheter begrenser ikke hva appen kan lese. Hvert oppslag
her må derfor bære teamet som argument.

Revisjonen er en del av identiteten. En innsending fryser sitt grunnlag, og
arbeid som fortsetter etterpå hører til neste revisjon — det som allerede er
sendt skal ikke kunne endres av at noen skriver videre i skjemaet.

`versjon` teller skrivinger og brukes til å avvise samtidige lagringer. Det er
**ikke** fletting: to som skriver i samme avsnitt samtidig får en konflikt, ikke
en sammenslått tekst. Det er et bevisst mellomtrinn — «siste skriving vinner»
ville tapt tekst stille, og en konflikt som vises er ærligere enn det. Ekte
tekstsamarbeid står fortsatt åpent i docs/audit-utkast-samarbeid-2026-09-14.md.
"""

import json
import os
from datetime import UTC, datetime
from pathlib import Path

from lib.sqlite_connection import sqlite_connection

_KOLONNER = (
    "project TEXT NOT NULL",
    "case_id TEXT NOT NULL",
    "spor TEXT NOT NULL",
    "revisjon INTEGER NOT NULL",
    "team TEXT NOT NULL",
    "kontraktsside TEXT NOT NULL",
    "innhold TEXT NOT NULL",
    "versjon INTEGER NOT NULL",
    "oppdatert_av TEXT NOT NULL",
    "oppdatert TEXT NOT NULL",
)

_NOKKEL = "project, case_id, spor, revisjon, team"


class UtkastKonflikt(Exception):
    """Utkastet er endret av noen andre siden klienten leste det.

    Bærer gjeldende tilstand slik at klienten kan vise hva som faktisk står
    lagret i stedet for bare å melde at lagringen mislyktes.
    """

    def __init__(self, gjeldende: dict | None):
        super().__init__("Utkastet er endret av en annen i teamet.")
        self.gjeldende = gjeldende


class UtkastRegistry:
    def __init__(self, path=None):
        # Deler det allerede persistente lokale lageret, inkludert volumet.
        self.path = str(
            path or os.environ.get("BH_APPROVAL_DB", "koe_data/approvals.sqlite3")
        )
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite_connection(self.path) as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS utkast ("
                + ", ".join(_KOLONNER)
                + f", PRIMARY KEY ({_NOKKEL}))"
            )

    @staticmethod
    def _krev_team(team):
        """Fail-closed: «ingen entydig organisasjon» er ikke en organisasjon."""
        if not team:
            raise ValueError("Utkast krever en entydig Catenda-team-ID")
        return team

    @staticmethod
    def _rad_til_dict(rad) -> dict:
        return {
            "innhold": json.loads(rad[0]),
            "versjon": rad[1],
            "oppdatert_av": rad[2],
            "oppdatert": rad[3],
            "kontraktsside": rad[4],
        }

    def _hent(self, db, project, case_id, spor, revisjon, team) -> dict | None:
        rad = db.execute(
            "SELECT innhold, versjon, oppdatert_av, oppdatert, kontraktsside"
            f" FROM utkast WHERE {_NOKKEL.replace(', ', ' = ? AND ')} = ?",
            (project, case_id, spor, revisjon, team),
        ).fetchone()
        return self._rad_til_dict(rad) if rad else None

    def hent(self, project, case_id, spor, revisjon, team) -> dict | None:
        """Teamets utkast for denne saken, sporet og revisjonen."""
        self._krev_team(team)
        with sqlite_connection(self.path) as db:
            return self._hent(db, project, case_id, spor, revisjon, team)

    def lagre(
        self,
        project,
        case_id,
        spor,
        revisjon,
        team,
        kontraktsside,
        innhold,
        oppdatert_av,
        forventet_versjon,
    ) -> dict:
        """Skriv utkastet, men bare hvis det står på versjonen klienten leste.

        Args:
            forventet_versjon: `None` når klienten mener utkastet ikke finnes,
                ellers versjonen den leste. Begge kontrolleres — en klient som
                tror utkastet er tomt skal ikke kunne slette kollegaens tekst.

        Raises:
            UtkastKonflikt: Lagret versjon er en annen enn den forventede.
        """
        self._krev_team(team)
        with sqlite_connection(self.path) as db:
            # SELECT starter ikke en transaksjon i sqlite3. Lås før lesing,
            # slik at to redaktører ikke begge godtar samme forventede versjon.
            db.execute("BEGIN IMMEDIATE")
            gjeldende = self._hent(db, project, case_id, spor, revisjon, team)
            lagret_versjon = gjeldende["versjon"] if gjeldende else None
            if lagret_versjon != forventet_versjon:
                raise UtkastKonflikt(gjeldende)
            versjon = (lagret_versjon or 0) + 1
            oppdatert = datetime.now(UTC).isoformat()
            db.execute(
                "INSERT OR REPLACE INTO utkast (project, case_id, spor, revisjon,"
                " team, kontraktsside, innhold, versjon, oppdatert_av, oppdatert)"
                " VALUES (?,?,?,?,?,?,?,?,?,?)",
                (
                    project,
                    case_id,
                    spor,
                    revisjon,
                    team,
                    kontraktsside,
                    json.dumps(innhold),
                    versjon,
                    oppdatert_av,
                    oppdatert,
                ),
            )
        return {
            "innhold": innhold,
            "versjon": versjon,
            "oppdatert_av": oppdatert_av,
            "oppdatert": oppdatert,
            "kontraktsside": kontraktsside,
        }

    def slett(self, project, case_id, spor, revisjon, team) -> None:
        """Forkast teamets utkast. Andre teams utkast røres ikke."""
        self._krev_team(team)
        with sqlite_connection(self.path) as db:
            db.execute(
                f"DELETE FROM utkast WHERE {_NOKKEL.replace(', ', ' = ? AND ')} = ?",
                (project, case_id, spor, revisjon, team),
            )
