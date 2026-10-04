"""Byggherrens svar på krav om fristforlengelse, NS 8407 § 33.

`beregn_frist` er inngangen. De andre funksjonene er delene den bygges av, og
testes hver for seg slik de er spesifisert i `fristDomain.test.ts`.
`Fristkrav.fra_tilstand` leser kravet ut av saken, som
`deriveFristDomainConfig` i frontenden. Avvikene fra frontenden står med kilde
i headeren til `tests/test_regler/test_regler_frist.py`.
"""

from dataclasses import dataclass

from models.events import (
    FristBeregningResultat,
    FristResponsData,
    FristVarselType,
    GrunnlagResponsResultat,
    SubsidiaerTrigger,
)
from models.sak_state import SakState
from regler import UgyldigVurdering
from regler.grunnlag import er_prekludert, forste_underkategori

VARSEL = FristVarselType.VARSEL.value
SPESIFISERT = FristVarselType.SPESIFISERT.value
BEGRUNNELSE_UTSATT = FristVarselType.BEGRUNNELSE_UTSATT.value


@dataclass(frozen=True)
class Fristkrav:
    """TEs krav og det saken ellers sier om svaret. Feltene er de i
    `FristDomainConfig`; `varsel_type` er verdien i `FristVarselType`."""

    krevd_dager: int
    varsel_type: str | None = SPESIFISERT
    er_svar_paa_foresporsel: bool = False
    har_innsigelse_mot_varsel: bool = False
    har_tidligere_varsel_i_tide: bool = False
    er_grunnlag_subsidiaert: bool = False
    er_hele_fristen_subsidiaer_pga_grunnlag: bool = False

    @classmethod
    def fra_tilstand(cls, sak: SakState) -> "Fristkrav":
        f, g = sak.frist, sak.grunnlag
        return cls(
            krevd_dager=f.krevd_dager or 0,
            varsel_type=f.varsel_type,
            er_svar_paa_foresporsel=f.kravet_besvarer_foresporselen,
            har_innsigelse_mot_varsel=f.frist_varsel_ok is False,
            # Bare et uttrykkelig tidligere standpunkt gjør § 33.4-spørsmålet overflødig.
            har_tidligere_varsel_i_tide=f.frist_varsel_ok is True
            or (f.bh_respondert_versjon is not None and f.frist_varsel_ok is not False),
            er_grunnlag_subsidiaert=g.bh_resultat == GrunnlagResponsResultat.AVSLATT,
            er_hele_fristen_subsidiaer_pga_grunnlag=er_prekludert(
                g.hovedkategori, forste_underkategori(g.underkategori), g.grunnlag_varslet_i_tide
            ),
        )


@dataclass(frozen=True)
class Fristvurdering:
    """Byggherrens vurderinger. Feltnavnene er de i `FristResponsData`."""

    frist_varsel_ok: bool | None = None
    spesifisert_krav_ok: bool | None = None
    foresporsel_svar_ok: bool | None = None
    vilkar_oppfylt: bool | None = None
    godkjent_dager: int | None = None

    @classmethod
    def fra_data(cls, data: FristResponsData) -> "Fristvurdering":
        """Et felt modellen har fylt med standardverdien, er ikke en vurdering."""
        sendt = data.model_fields_set
        return cls(**{f: getattr(data, f) if f in sendt else None for f in cls.__dataclass_fields__})


@dataclass(frozen=True)
class Synlighet:
    frist_varsel_ok: bool
    spesifisert_krav_ok: bool
    foresporsel_svar_ok: bool


@dataclass(frozen=True)
class Fristresultat:
    """Det serveren regner ut. Feltnavnene er de i `FristResponsData`."""

    beregnings_resultat: FristBeregningResultat
    godkjent_dager: int
    subsidiaer_triggers: tuple[SubsidiaerTrigger, ...]
    subsidiaer_resultat: FristBeregningResultat | None
    subsidiaer_godkjent_dager: int | None
    er_prekludert: bool
    er_redusert: bool
    hele_fristen_subsidiaer: bool


def beregn_synlighet(krav: Fristkrav) -> Synlighet:
    """Hvilke varselspørsmål svaret skal ha. Speiler `beregnVisibility`."""
    if krav.varsel_type == BEGRUNNELSE_UTSATT:
        return Synlighet(False, False, False)
    if krav.er_svar_paa_foresporsel:
        frist_varsel_ok = krav.har_innsigelse_mot_varsel
    elif krav.varsel_type == VARSEL:
        frist_varsel_ok = True
    elif krav.varsel_type == SPESIFISERT:
        frist_varsel_ok = not krav.har_tidligere_varsel_i_tide
    else:
        frist_varsel_ok = False
    return Synlighet(
        frist_varsel_ok=frist_varsel_ok,
        spesifisert_krav_ok=krav.varsel_type == SPESIFISERT
        and not krav.er_svar_paa_foresporsel,
        foresporsel_svar_ok=krav.er_svar_paa_foresporsel,
    )


def beregn_preklusjon(vurdering: Fristvurdering, krav: Fristkrav) -> bool:
    """§ 33.4 og § 33.6.2 tredje ledd."""
    if krav.er_svar_paa_foresporsel and vurdering.foresporsel_svar_ok is False:
        return True
    if krav.varsel_type == VARSEL:
        return vurdering.frist_varsel_ok is False
    if krav.varsel_type == SPESIFISERT:
        if krav.har_tidligere_varsel_i_tide:
            return False
        return vurdering.frist_varsel_ok is False
    return False


def beregn_reduksjon(vurdering: Fristvurdering, krav: Fristkrav) -> bool:
    """§ 33.6.1, også ved siden av preklusjon etter § 33.4.

    Ved svar på forespørselen gjelder § 33.6.2 fjerde ledd i stedet.
    """
    if krav.er_svar_paa_foresporsel:
        return False
    return krav.varsel_type == SPESIFISERT and vurdering.spesifisert_krav_ok is False


def _resultat_av_dager(
    har_hindring: bool, krevd_dager: int, godkjent_dager: int
) -> FristBeregningResultat:
    if not har_hindring:
        return FristBeregningResultat.AVSLATT
    if krevd_dager == 0:
        return FristBeregningResultat.GODKJENT
    # Oppdragsgiver 04.10: 0 dager er «avslått», som 0 kr for vederlag.
    if godkjent_dager == 0:
        return FristBeregningResultat.AVSLATT
    # B-13 (3.1, 24.09): «godkjent» bare når hele kravet er godkjent.
    if godkjent_dager >= krevd_dager:
        return FristBeregningResultat.GODKJENT
    return FristBeregningResultat.DELVIS_GODKJENT


def prinsipalt_resultat(
    *, er_prekludert: bool, har_hindring: bool, krevd_dager: int, godkjent_dager: int
) -> FristBeregningResultat:
    if er_prekludert:
        return FristBeregningResultat.AVSLATT
    return _resultat_av_dager(har_hindring, krevd_dager, godkjent_dager)


def subsidiaert_resultat(
    *, har_hindring: bool, krevd_dager: int, godkjent_dager: int
) -> FristBeregningResultat:
    return _resultat_av_dager(har_hindring, krevd_dager, godkjent_dager)


def subsidiaer_triggers(
    *,
    er_grunnlag_subsidiaert: bool,
    er_prekludert: bool,
    er_redusert: bool = False,
    har_hindring: bool,
) -> tuple[SubsidiaerTrigger, ...]:
    kandidater = (
        (er_grunnlag_subsidiaert, SubsidiaerTrigger.GRUNNLAG_AVSLATT),
        (er_prekludert, SubsidiaerTrigger.PREKLUSJON_VARSEL),
        (er_redusert, SubsidiaerTrigger.REDUKSJON_SPESIFISERT),
        (not har_hindring, SubsidiaerTrigger.INGEN_HINDRING),
    )
    return tuple(trigger for gjelder, trigger in kandidater if gjelder)


PAABEROPT_33_6_1_ETTER_SVAR = (
    "§ 33.6.1 kan ikke påberopes når TE har svart på forespørselen "
    "(§ 33.6.2 fjerde ledd)"
)


def paaberoper_33_6_1_etter_svar_paa_foresporsel(
    er_svar_paa_foresporsel: bool, spesifisert_krav_ok: bool | None
) -> bool:
    return er_svar_paa_foresporsel and spesifisert_krav_ok is False


def _er_heltall(verdi) -> bool:
    return isinstance(verdi, int) and not isinstance(verdi, bool)


def kontroller(vurdering: Fristvurdering, krav: Fristkrav) -> None:
    """Hele svaret kreves (B-13), og § 33.6.2 fjerde ledd håndheves."""
    feil: dict[str, str] = {}
    synlig = beregn_synlighet(krav)
    spoersmaal = (
        (synlig.frist_varsel_ok, "frist_varsel_ok", "§ 33.4"),
        (synlig.spesifisert_krav_ok, "spesifisert_krav_ok", "§ 33.6.1"),
        (synlig.foresporsel_svar_ok, "foresporsel_svar_ok", "§ 33.6.2"),
        (True, "vilkar_oppfylt", "§ 33.1"),
    )
    for gjelder, felt, hjemmel in spoersmaal:
        if gjelder and getattr(vurdering, felt) is None:
            feil[felt] = f"mangler ({hjemmel})"

    if paaberoper_33_6_1_etter_svar_paa_foresporsel(
        krav.er_svar_paa_foresporsel, vurdering.spesifisert_krav_ok
    ):
        feil["spesifisert_krav_ok"] = PAABEROPT_33_6_1_ETTER_SVAR

    dager = vurdering.godkjent_dager
    if dager is None:
        feil["godkjent_dager"] = "mangler (§ 33.5)"
    elif not _er_heltall(dager):
        feil["godkjent_dager"] = "er ikke et helt antall dager"
    elif dager < 0:
        feil["godkjent_dager"] = "kan ikke være negativt"
    elif dager > krav.krevd_dager:
        feil["godkjent_dager"] = "er flere enn de krevde dagene"

    if feil:
        raise UgyldigVurdering(feil)


def beregn_frist(krav: Fristkrav, vurdering: Fristvurdering) -> Fristresultat:
    """Regn ut svaret av vurderingene og kravet. Kaster `UgyldigVurdering` når
    svaret ikke er helt (B-13: en oppdatering må ha med hele svaret)."""
    kontroller(vurdering, krav)
    er_prekludert_ = beregn_preklusjon(vurdering, krav)
    er_redusert = beregn_reduksjon(vurdering, krav)
    har_hindring = vurdering.vilkar_oppfylt is True
    dager = vurdering.godkjent_dager

    prinsipalt = prinsipalt_resultat(
        er_prekludert=er_prekludert_,
        har_hindring=har_hindring,
        krevd_dager=krav.krevd_dager,
        godkjent_dager=dager,
    )
    subsidiaert = subsidiaert_resultat(
        har_hindring=har_hindring, krevd_dager=krav.krevd_dager, godkjent_dager=dager
    )
    # Subsidiært standpunkt bare når avslaget har en annen grunn enn dagene.
    vis_subsidiaert = er_prekludert_ or not har_hindring

    return Fristresultat(
        beregnings_resultat=prinsipalt,
        godkjent_dager=0 if prinsipalt == FristBeregningResultat.AVSLATT else dager,
        subsidiaer_triggers=subsidiaer_triggers(
            er_grunnlag_subsidiaert=krav.er_grunnlag_subsidiaert,
            er_prekludert=er_prekludert_,
            er_redusert=er_redusert,
            har_hindring=har_hindring,
        ),
        subsidiaer_resultat=subsidiaert if vis_subsidiaert else None,
        subsidiaer_godkjent_dager=dager
        if vis_subsidiaert and subsidiaert != FristBeregningResultat.AVSLATT
        else None,
        er_prekludert=er_prekludert_,
        er_redusert=er_redusert,
        hele_fristen_subsidiaer=krav.er_grunnlag_subsidiaert
        or krav.er_hele_fristen_subsidiaer_pga_grunnlag,
    )
