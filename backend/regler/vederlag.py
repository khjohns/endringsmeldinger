"""Byggherrens svar på vederlagskrav, NS 8407 § 34 og § 30.2.

`beregn_vederlag` er inngangen. De andre funksjonene er delene den bygges av,
og testes hver for seg slik de er spesifisert i `vederlagDomain.test.ts`.
"""

from dataclasses import dataclass
from decimal import Decimal

from models.events import (
    BelopVurdering,
    GrunnlagResponsResultat,
    SubsidiaerTrigger,
    VederlagBeregningResultat,
    VederlagResponsData,
    VederlagsMetode,
)
from models.sak_state import SakState
from regler import UgyldigVurdering, belop, til_krone
from regler.grunnlag import er_grunnlag_subsidiaert, forste_underkategori

NULL = Decimal("0.00")


@dataclass(frozen=True)
class Vederlagskrav:
    """TEs krav og grunnlagssporet, slik saken står. `rigg_belop` og
    `produktivitet_belop` er `None` når posten ikke er krevd."""

    hovedkrav_belop: Decimal | float | int
    metode: VederlagsMetode | None = None
    rigg_belop: Decimal | float | int | None = None
    produktivitet_belop: Decimal | float | int | None = None
    krever_justert_ep: bool = False
    kostnads_overslag: Decimal | float | int | None = None
    hovedkategori: str | None = None
    underkategori: str | None = None
    grunnlag_varslet_i_tide: bool | None = None
    grunnlag_resultat: GrunnlagResponsResultat | None = None

    @classmethod
    def fra_tilstand(cls, sak: SakState) -> "Vederlagskrav":
        """Som `deriveVederlagDomainConfig` i frontenden."""
        v, g = sak.vederlag, sak.grunnlag
        saerskilt = v.saerskilt_krav or {}

        def saerskilt_belop(navn: str):
            post = saerskilt.get(navn)
            return (post.get("belop") or 0) if isinstance(post, dict) else None

        return cls(
            hovedkrav_belop=v.krevd_belop or 0,
            metode=VederlagsMetode(v.metode) if v.metode else None,
            rigg_belop=saerskilt_belop("rigg_drift"),
            produktivitet_belop=saerskilt_belop("produktivitet"),
            krever_justert_ep=bool(v.krever_justert_ep),
            kostnads_overslag=v.kostnads_overslag,
            hovedkategori=g.hovedkategori,
            underkategori=forste_underkategori(g.underkategori),
            grunnlag_varslet_i_tide=g.grunnlag_varslet_i_tide,
            grunnlag_resultat=g.bh_resultat,
        )

    @property
    def har_rigg_krav(self) -> bool:
        return self.rigg_belop is not None

    @property
    def har_produktivitet_krav(self) -> bool:
        return self.produktivitet_belop is not None


@dataclass(frozen=True)
class Vederlagsvurdering:
    """Byggherrens vurderinger. Feltnavnene er de i `VederlagResponsData`."""

    hovedkrav_vurdering: BelopVurdering | None = None
    hovedkrav_godkjent_belop: Decimal | float | int | None = None
    rigg_vurdering: BelopVurdering | None = None
    rigg_godkjent_belop: Decimal | float | int | None = None
    produktivitet_vurdering: BelopVurdering | None = None
    produktivitet_godkjent_belop: Decimal | float | int | None = None
    hovedkrav_varslet_i_tide: bool | None = None
    rigg_varslet_i_tide: bool | None = None
    produktivitet_varslet_i_tide: bool | None = None
    aksepterer_metode: bool | None = None
    oensket_metode: VederlagsMetode | None = None
    varsel_justert_ep_ok: bool | None = None
    hold_tilbake: bool = False

    @classmethod
    def fra_data(cls, data: VederlagResponsData) -> "Vederlagsvurdering":
        felt = {f: getattr(data, f) for f in cls.__dataclass_fields__ if f != "hold_tilbake"}
        return cls(**felt, hold_tilbake=bool(data.hold_tilbake))


@dataclass(frozen=True)
class Preklusjon:
    hovedkrav: bool
    rigg: bool
    produktivitet: bool

    @property
    def har_prekludert_krav(self) -> bool:
        return self.hovedkrav or self.rigg or self.produktivitet


@dataclass(frozen=True)
class Totaler:
    total_krevd: Decimal
    total_krevd_inkl_prekludert: Decimal
    total_godkjent: Decimal
    total_godkjent_inkl_prekludert: Decimal
    har_metodeendring: bool
    har_prekludert_krav: bool


@dataclass(frozen=True)
class Vederlagsresultat:
    """Det serveren regner ut. Feltnavnene er de i `VederlagResponsData`."""

    beregnings_resultat: VederlagBeregningResultat
    total_godkjent_belop: Decimal
    total_krevd_belop: Decimal
    hovedkrav_godkjent_belop: Decimal
    rigg_godkjent_belop: Decimal | None
    produktivitet_godkjent_belop: Decimal | None
    subsidiaer_triggers: tuple[SubsidiaerTrigger, ...]
    subsidiaer_resultat: VederlagBeregningResultat | None
    subsidiaer_godkjent_belop: Decimal | None
    preklusjon: Preklusjon
    hele_vederlaget_subsidiaert: bool


def har_34_1_2_preklusjon(hovedkategori: str | None) -> bool:
    return hovedkategori in ("SVIKT", "ANDRE")


def er_hele_vederlaget_subsidiaert(krav: Vederlagskrav) -> bool:
    return er_grunnlag_subsidiaert(
        krav.grunnlag_resultat,
        krav.hovedkategori,
        krav.underkategori,
        krav.grunnlag_varslet_i_tide,
    )


def kan_holde_tilbake(krav: Vederlagskrav) -> bool:
    return krav.metode == VederlagsMetode.REGNINGSARBEID and not krav.kostnads_overslag


def beregn_preklusjon(vurdering: Vederlagsvurdering, krav: Vederlagskrav) -> Preklusjon:
    return Preklusjon(
        hovedkrav=har_34_1_2_preklusjon(krav.hovedkategori)
        and vurdering.hovedkrav_varslet_i_tide is False,
        rigg=krav.har_rigg_krav and vurdering.rigg_varslet_i_tide is False,
        produktivitet=krav.har_produktivitet_krav
        and vurdering.produktivitet_varslet_i_tide is False,
    )


def beregn_godkjent_belop(
    vurdering: BelopVurdering | None,
    krevd: Decimal,
    delvis_godkjent: Decimal | None,
    prekludert: bool = False,
) -> Decimal:
    if prekludert:
        return NULL
    if vurdering == BelopVurdering.GODKJENT:
        return krevd
    if vurdering == BelopVurdering.DELVIS:
        return delvis_godkjent if delvis_godkjent is not None else NULL
    return NULL


def er_kravlinje_gyldig(vurdering: BelopVurdering | None, godkjent_belop) -> bool:
    if vurdering is None:
        return False
    return not (vurdering == BelopVurdering.DELVIS and godkjent_belop is None)


def _poster(vurdering: Vederlagsvurdering, krav: Vederlagskrav, preklusjon: Preklusjon):
    """(krevd, godkjent, prekludert) for hver post som er krevd."""
    poster = [
        (
            belop(krav.hovedkrav_belop) or NULL,
            vurdering.hovedkrav_vurdering,
            belop(vurdering.hovedkrav_godkjent_belop),
            preklusjon.hovedkrav,
        )
    ]
    if krav.har_rigg_krav:
        poster.append(
            (
                belop(krav.rigg_belop),
                vurdering.rigg_vurdering,
                belop(vurdering.rigg_godkjent_belop),
                preklusjon.rigg,
            )
        )
    if krav.har_produktivitet_krav:
        poster.append(
            (
                belop(krav.produktivitet_belop),
                vurdering.produktivitet_vurdering,
                belop(vurdering.produktivitet_godkjent_belop),
                preklusjon.produktivitet,
            )
        )
    return [
        (krevd, beregn_godkjent_belop(v, krevd, delvis), prekludert)
        for krevd, v, delvis, prekludert in poster
    ]


def beregn_totaler(
    vurdering: Vederlagsvurdering, krav: Vederlagskrav, preklusjon: Preklusjon
) -> Totaler:
    poster = _poster(vurdering, krav, preklusjon)
    return Totaler(
        total_krevd=sum((k for k, _, p in poster if not p), NULL),
        total_krevd_inkl_prekludert=sum((k for k, _, _ in poster), NULL),
        total_godkjent=sum((g for _, g, p in poster if not p), NULL),
        total_godkjent_inkl_prekludert=sum((g for _, g, _ in poster), NULL),
        har_metodeendring=vurdering.aksepterer_metode is False,
        har_prekludert_krav=preklusjon.har_prekludert_krav,
    )


def _resultat_av_belop(
    krevd: Decimal, godkjent: Decimal, har_metodeendring: bool
) -> VederlagBeregningResultat:
    # B-13 (3.1, 24.09): «godkjent» bare når hele kravet er godkjent, til
    # nærmeste krone. 99 %-terskelen i frontenden utgår.
    if godkjent == NULL:
        return VederlagBeregningResultat.AVSLATT
    if til_krone(godkjent) >= til_krone(krevd) and not har_metodeendring:
        return VederlagBeregningResultat.GODKJENT
    return VederlagBeregningResultat.DELVIS_GODKJENT


def prinsipalt_resultat(
    *,
    total_krevd_inkl_prekludert: Decimal,
    total_godkjent: Decimal,
    har_metodeendring: bool,
    hold_tilbake: bool,
) -> VederlagBeregningResultat:
    if hold_tilbake:
        return VederlagBeregningResultat.HOLD_TILBAKE
    return _resultat_av_belop(
        total_krevd_inkl_prekludert, total_godkjent, har_metodeendring
    )


def subsidiaert_resultat(
    *,
    total_krevd_inkl_prekludert: Decimal,
    total_godkjent_inkl_prekludert: Decimal,
    har_metodeendring: bool,
) -> VederlagBeregningResultat:
    return _resultat_av_belop(
        total_krevd_inkl_prekludert, total_godkjent_inkl_prekludert, har_metodeendring
    )


def subsidiaer_triggers(
    vurdering: Vederlagsvurdering, krav: Vederlagskrav, preklusjon: Preklusjon
) -> tuple[SubsidiaerTrigger, ...]:
    kandidater = (
        (preklusjon.hovedkrav, SubsidiaerTrigger.PREKLUSJON_HOVEDKRAV),
        (preklusjon.rigg, SubsidiaerTrigger.PREKLUSJON_RIGG),
        (preklusjon.produktivitet, SubsidiaerTrigger.PREKLUSJON_PRODUKTIVITET),
        (
            krav.krever_justert_ep and vurdering.varsel_justert_ep_ok is False,
            SubsidiaerTrigger.REDUKSJON_EP_JUSTERING,
        ),
        (vurdering.aksepterer_metode is False, SubsidiaerTrigger.METODE_AVSLATT),
    )
    return tuple(trigger for gjelder, trigger in kandidater if gjelder)


def _kontroller(vurdering: Vederlagsvurdering, krav: Vederlagskrav) -> None:
    feil: dict[str, str] = {}

    def post(navn: str, v: BelopVurdering | None, godkjent, krevd) -> None:
        if v is None:
            feil[f"{navn}_vurdering"] = "mangler"
            return
        if not er_kravlinje_gyldig(v, godkjent):
            feil[f"{navn}_godkjent_belop"] = "mangler ved delvis godkjenning"
            return
        if v == BelopVurdering.DELVIS:
            if not Decimal(str(godkjent)).is_finite():
                feil[f"{navn}_godkjent_belop"] = "er ikke et tall"
                return
            g = belop(godkjent)
            if g < NULL:
                feil[f"{navn}_godkjent_belop"] = "kan ikke være negativt"
            elif g > (belop(krevd) or NULL):
                feil[f"{navn}_godkjent_belop"] = "er høyere enn det krevde beløpet"

    post(
        "hovedkrav",
        vurdering.hovedkrav_vurdering,
        vurdering.hovedkrav_godkjent_belop,
        krav.hovedkrav_belop,
    )
    if krav.har_rigg_krav:
        post("rigg", vurdering.rigg_vurdering, vurdering.rigg_godkjent_belop, krav.rigg_belop)
    if krav.har_produktivitet_krav:
        post(
            "produktivitet",
            vurdering.produktivitet_vurdering,
            vurdering.produktivitet_godkjent_belop,
            krav.produktivitet_belop,
        )

    spoersmaal = (
        (har_34_1_2_preklusjon(krav.hovedkategori), "hovedkrav_varslet_i_tide", "§ 34.1.2"),
        (krav.har_rigg_krav, "rigg_varslet_i_tide", "§ 34.1.3"),
        (krav.har_produktivitet_krav, "produktivitet_varslet_i_tide", "§ 34.1.3"),
        (True, "aksepterer_metode", "§ 34.2.2"),
    )
    # `varsel_justert_ep_ok` kreves ikke: skjemaet stiller ikke § 34.3.3-spørsmålet,
    # og feltet det sender, fjernes av parseren (DRF-02).
    for gjelder, felt, hjemmel in spoersmaal:
        if gjelder and getattr(vurdering, felt) is None:
            feil[felt] = f"mangler ({hjemmel})"

    if vurdering.hold_tilbake and not kan_holde_tilbake(krav):
        feil["hold_tilbake"] = (
            "bare ved regningsarbeid uten kostnadsoverslag (§ 30.2)"
        )

    if feil:
        raise UgyldigVurdering(feil)


def beregn_vederlag(krav: Vederlagskrav, vurdering: Vederlagsvurdering) -> Vederlagsresultat:
    """Regn ut svaret av vurderingene og kravet. Kaster `UgyldigVurdering` når
    svaret ikke er helt (B-13: en oppdatering må ha med hele svaret)."""
    _kontroller(vurdering, krav)
    preklusjon = beregn_preklusjon(vurdering, krav)
    totaler = beregn_totaler(vurdering, krav, preklusjon)
    ingen_preklusjon = Preklusjon(hovedkrav=False, rigg=False, produktivitet=False)
    per_post = [g for _, g, _ in _poster(vurdering, krav, ingen_preklusjon)]
    rigg = per_post[1] if krav.har_rigg_krav else None
    produktivitet = per_post[-1] if krav.har_produktivitet_krav else None
    vis_subsidiaert = totaler.har_prekludert_krav

    return Vederlagsresultat(
        beregnings_resultat=prinsipalt_resultat(
            total_krevd_inkl_prekludert=totaler.total_krevd_inkl_prekludert,
            total_godkjent=totaler.total_godkjent,
            har_metodeendring=totaler.har_metodeendring,
            hold_tilbake=vurdering.hold_tilbake,
        ),
        total_godkjent_belop=totaler.total_godkjent,
        total_krevd_belop=totaler.total_krevd_inkl_prekludert,
        hovedkrav_godkjent_belop=per_post[0],
        rigg_godkjent_belop=rigg,
        produktivitet_godkjent_belop=produktivitet,
        subsidiaer_triggers=subsidiaer_triggers(vurdering, krav, preklusjon),
        subsidiaer_resultat=subsidiaert_resultat(
            total_krevd_inkl_prekludert=totaler.total_krevd_inkl_prekludert,
            total_godkjent_inkl_prekludert=totaler.total_godkjent_inkl_prekludert,
            har_metodeendring=totaler.har_metodeendring,
        )
        if vis_subsidiaert
        else None,
        subsidiaer_godkjent_belop=totaler.total_godkjent_inkl_prekludert
        if vis_subsidiaert
        else None,
        preklusjon=preklusjon,
        hele_vederlaget_subsidiaert=er_hele_vederlaget_subsidiaert(krav),
    )
