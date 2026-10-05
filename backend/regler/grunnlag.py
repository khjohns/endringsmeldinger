"""Byggherrens svar på ansvarsgrunnlaget, NS 8407 § 32.2 og § 32.3."""

from dataclasses import dataclass
from datetime import date

from models.events import GrunnlagResponsResultat
from regler import UgyldigVurdering

PASSIVITET_VEILEDENDE_DAGER = 10


def forste_underkategori(underkategori: str | list[str] | None) -> str | None:
    """Eldre saker har underkategorien som liste; frontenden bruker første."""
    if isinstance(underkategori, list):
        return underkategori[0] if underkategori else None
    return underkategori


def er_endring_med_32_2(hovedkategori: str | None, underkategori: str | None) -> bool:
    return hovedkategori == "ENDRING" and underkategori != "EO"


def er_paalegg(hovedkategori: str | None, underkategori: str | None) -> bool:
    return hovedkategori == "ENDRING" and underkategori in ("IRREG", "VALGRETT")


def er_prekludert(
    hovedkategori: str | None, underkategori: str | None, varslet_i_tide: bool | None
) -> bool:
    return er_endring_med_32_2(hovedkategori, underkategori) and varslet_i_tide is False


def er_grunnlag_subsidiaert(
    resultat: GrunnlagResponsResultat | str | None,
    hovedkategori: str | None,
    underkategori: str | list[str] | None,
    varslet_i_tide: bool | None,
) -> bool:
    """Hele vederlaget og hele fristen er subsidiære: ansvarsgrunnlaget er
    avslått, eller prekludert etter § 32.2."""
    return resultat == GrunnlagResponsResultat.AVSLATT or er_prekludert(
        hovedkategori, forste_underkategori(underkategori), varslet_i_tide
    )


@dataclass(frozen=True)
class Passivitet:
    dager_siden_varsel: int
    bor_varsles: bool


def beregn_passivitet(
    hovedkategori: str | None,
    underkategori: str | None,
    dato_varslet: date | None,
    idag: date,
) -> Passivitet:
    # B-13 (3.1, 24.09): passivitet etter § 32.3 annet ledd varsles bare.
    # Ti dager er veiledning, ikke «uten ugrunnet opphold».
    dager = (idag - dato_varslet).days if dato_varslet else 0
    return Passivitet(
        dager_siden_varsel=dager,
        bor_varsles=er_endring_med_32_2(hovedkategori, underkategori)
        and dager > PASSIVITET_VEILEDENDE_DAGER,
    )


def gyldige_resultater(
    hovedkategori: str | None, underkategori: str | None
) -> tuple[GrunnlagResponsResultat, ...]:
    resultater = (GrunnlagResponsResultat.GODKJENT, GrunnlagResponsResultat.AVSLATT)
    if er_paalegg(hovedkategori, underkategori):
        return (*resultater, GrunnlagResponsResultat.FRAFALT)
    return resultater


def kontroller_grunnlagssvar(
    hovedkategori: str | None,
    underkategori: str | None,
    resultat: GrunnlagResponsResultat | None,
    grunnlag_varslet_i_tide: bool | None,
) -> None:
    feil: dict[str, str] = {}
    if resultat is None:
        feil["resultat"] = "mangler"
    elif resultat not in gyldige_resultater(hovedkategori, underkategori):
        feil["resultat"] = (
            f"«{resultat.value}» kan ikke velges i denne kategorien (§ 32.3 c)"
        )
    if er_endring_med_32_2(hovedkategori, underkategori):
        if grunnlag_varslet_i_tide is None:
            feil["grunnlag_varslet_i_tide"] = "mangler (§ 32.2)"
    elif grunnlag_varslet_i_tide is not None:
        feil["grunnlag_varslet_i_tide"] = "gjelder bare § 32.2"
    if feil:
        raise UgyldigVurdering(feil)
