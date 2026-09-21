"""Interne notater, lagret utenfor den uforanderlige journalen (MS-05).

Et internt notat er ikke et kontraktsvarsel (`AGENTS.md`), og trenger derfor
ikke journalens permanens. Notatet bor i tabellen `notat` — vanlige
rettigheter, egen oppbevaringsregel — mens `hendelse` er append-only.

Notatet vises likevel i tidslinjen. `til_hendelse` gjør raden om til den
`InterntNotatEvent` resten av lesestien allerede kjenner, slik at
skjermingsfilteret, CloudEvents-formateringen og klienten er uendret.

Skjemaet står i `supabase/migrations/20260921153900_notat_tabell.sql`.
"""

from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

from models.events import InterntNotatData, InterntNotatEvent, SporType


class Notat(BaseModel):
    """Ett internt notat, slik det ligger i `notat`."""

    notat_id: str = Field(default_factory=lambda: str(uuid4()))
    sak_id: str
    prosjekt_id: str

    aktor_id: str = Field(..., min_length=1)
    aktor_rolle: Literal["TE", "BH"]
    # Skjermingen går på team. Et notat uten entydig team kan ingen lese, heller
    # ikke forfatteren, så det skal ikke kunne oppstå. Basen har samme skranke.
    aktor_team_id: str = Field(..., min_length=1)

    tekst: str = Field(..., min_length=1)
    spor: SporType | None = None
    kommentar: str | None = None
    refererer_til_event_id: str | None = None

    opprettet: datetime = Field(default_factory=lambda: datetime.now(UTC))
    endret: datetime | None = None

    @classmethod
    def fra_hendelse(cls, event: InterntNotatEvent, prosjekt_id: str) -> "Notat":
        """Bygg notatet av den innsendte hendelsen.

        Hendelsen er allerede parset og aktørfeltene stemplet av ruta, så det
        som hentes herfra er serverens egne verdier — ikke klientens.
        """
        return cls(
            notat_id=event.event_id,
            sak_id=event.sak_id,
            prosjekt_id=prosjekt_id,
            aktor_id=event.aktor_id,
            aktor_rolle=event.aktor_rolle,
            aktor_team_id=event.aktor_team_id,
            tekst=event.data.tekst,
            spor=event.data.spor,
            kommentar=event.kommentar,
            refererer_til_event_id=event.refererer_til_event_id,
            opprettet=event.tidsstempel,
        )

    def til_hendelse(self) -> InterntNotatEvent:
        """Notatet som den hendelsen lesestien og klienten allerede kjenner."""
        return InterntNotatEvent(
            event_id=self.notat_id,
            sak_id=self.sak_id,
            prosjekt_id=self.prosjekt_id,
            tidsstempel=self.opprettet,
            aktor_id=self.aktor_id,
            aktor_rolle=self.aktor_rolle,
            aktor_team_id=self.aktor_team_id,
            kommentar=self.kommentar,
            refererer_til_event_id=self.refererer_til_event_id,
            data=InterntNotatData(tekst=self.tekst, spor=self.spor),
        )

    def til_rad(self) -> dict:
        """Raden slik `notat`-tabellen erklærer den.

        Feltnavnene *er* kolonnenavnene. Holder de to seg like, er raden
        modellen — og et nytt felt kan ikke bli glemt her.
        Testdobbelens `NOTAT_KOLONNER` er vakten mot at de glir fra hverandre.
        """
        return self.model_dump(mode="json")

    @classmethod
    def fra_rad(cls, rad: dict) -> "Notat":
        return cls.model_validate(rad)
