"""Public, immutable letter snapshot. Contains no internal approval data."""

from pydantic import BaseModel, ConfigDict, Field


class LetterSection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tittel: str
    originalTekst: str
    redigertTekst: str


class LetterSections(BaseModel):
    model_config = ConfigDict(extra="forbid")
    innledning: LetterSection
    begrunnelse: LetterSection
    avslutning: LetterSection


class LetterParty(BaseModel):
    model_config = ConfigDict(extra="forbid")
    navn: str
    rolle: str
    adresse: str | None = None
    orgnr: str | None = None


class LetterReferences(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sakId: str
    sakstittel: str
    eventId: str
    sporType: str
    dato: str
    kravDato: str | None = None


class LetterSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tittel: str = Field(max_length=2000)
    mottaker: LetterParty
    avsender: LetterParty
    referanser: LetterReferences
    seksjoner: LetterSections
