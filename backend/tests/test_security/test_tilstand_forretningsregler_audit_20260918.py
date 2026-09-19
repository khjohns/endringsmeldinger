"""Tilstandskonsistens og NS 8407-forretningsregler (Pass 3).

Testene her etterprøver funn i tilstandsberegning og forretningsregler:
1. TE_AKSEPTERER_RESPONS forvandler et avslag fra BH til GODKJENT — på alle tre
   spor. Reproduksjonen fra 18.09 dekket bare grunnlag; vederlag og frist er
   lagt til 2026-09-19 etter at alle tre ble kjørt og observert.
2. overordnet_status ignorerer sakstype og gir INGEN_AKTIVE_SPOR for forsering og EO
3. _rule_vederlag_can_be_withdrawn blokkerer tilbaketrekking av subsidiært godkjente krav
4. require_truthy=True i _copy_fields_if_present forkaster subsidiært standpunkt på 0 kr / 0 dager
5. Godkjent og låst ansvarsgrunnlag rapporteres som 'UTKAST' i overordnet_status
"""

import pytest

from models.events import (
    ForseringResponsData,
    ForseringResponsEvent,
    ForseringVarselData,
    ForseringVarselEvent,
    FristBeregningResultat,
    FristData,
    FristEvent,
    FristResponsData,
    GrunnlagData,
    GrunnlagEvent,
    GrunnlagResponsData,
    GrunnlagResponsResultat,
    ResponsEvent,
    SakOpprettetEvent,
    SporStatus,
    SporType,
    VederlagBeregningResultat,
    VederlagData,
    VederlagEvent,
    VederlagResponsData,
    VederlagsMetode,
    WithdrawalData,
    WithdrawalEvent,
    parse_event_from_request,
)
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService


def _aksept(spor: str, refererer_til: str):
    """TE_AKSEPTERER_RESPONS slik ruta ville ha parset den."""
    return parse_event_from_request(
        {
            "sak_id": "S-1",
            "event_type": "te_aksepterer_respons",
            "refererer_til_event_id": refererer_til,
            "spor": spor,
            "aktor": "te",
            "aktor_rolle": "TE",
            "data": {"begrunnelse": "TE aksepterer avslaget"},
        }
    )


def _sak_med_godkjent_grunnlag() -> list:
    """Sak der grunnlaget er godkjent, så vederlag og frist kan prøves isolert."""
    opprettet = SakOpprettetEvent(
        sak_id="S-1",
        sakstittel="Endring",
        aktor="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    grunnlag = GrunnlagEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        data=GrunnlagData(
            tittel="Tittel",
            beskrivelse="Beskrivelse",
            hovedkategori="ENDRING",
            dato_oppdaget="2026-09-18",
        ),
    )
    godkjent = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_grunnlag",
        spor=SporType.GRUNNLAG,
        refererer_til_event_id=grunnlag.event_id,
        data=GrunnlagResponsData(
            resultat=GrunnlagResponsResultat.GODKJENT,
            begrunnelse="Byggherrens ansvar",
        ),
    )
    return [opprettet, grunnlag, godkjent]



# =============================================================================
# 1. TE_AKSEPTERER_RESPONS forvandler avslag til GODKJENT grunnlag
# =============================================================================


def test_te_aksepterer_avslag_gjor_grunnlag_godkjent():
    """TE_AKSEPTERER_RESPONS må ikke transformere et avslag til GODKJENT status.

    Når BH avslår ansvarsgrunnlag (GrunnlagResponsResultat.AVSLATT), skal en aksept
    fra TE registrere at TE aksepterer avslaget (dvs. saken er tapt/avsluttet),
    IKKE sette status til GODKJENT og kan_utstede_eo = True!
    """
    timeline = TimelineService()

    e1 = SakOpprettetEvent(
        sak_id="S-1",
        sakstittel="Endring",
        aktor="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    e2 = GrunnlagEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        data=GrunnlagData(
            tittel="Tittel",
            beskrivelse="Beskrivelse",
            hovedkategori="ENDRING",
            dato_oppdaget="2026-09-18",
        ),
    )
    e3 = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_grunnlag",
        spor=SporType.GRUNNLAG,
        refererer_til_event_id=e2.event_id,
        data=GrunnlagResponsData(
            resultat=GrunnlagResponsResultat.AVSLATT,
            begrunnelse="Ikke byggherrens ansvar",
        ),
    )

    state1 = timeline.compute_state([e1, e2, e3])
    assert state1.grunnlag.status == SporStatus.AVSLATT

    # TE sender TE_AKSEPTERER_RESPONS for grunnlagsavslaget
    accept_event = parse_event_from_request(
        {
            "sak_id": "S-1",
            "event_type": "te_aksepterer_respons",
            "refererer_til_event_id": e3.event_id,
            "spor": "grunnlag",
            "aktor": "te",
            "aktor_rolle": "TE",
            "data": {"begrunnelse": "TE aksepterer avslaget"},
        }
    )

    state2 = timeline.compute_state([e1, e2, e3, accept_event])

    # Feiler i dag fordi state2.grunnlag.status settes til GODKJENT og kan_utstede_eo blir True!
    assert state2.grunnlag.status != SporStatus.GODKJENT, (
        f"Avslag på ansvarsgrunnlag ble gjort om til GODKJENT: {state2.grunnlag.status}, kan_utstede_eo={state2.kan_utstede_eo}"
    )

    # Enigheten skal være dokumentert, ikke bare fraværet av godkjenning:
    # sporet er oppgjort på byggherrens premisser.
    assert state2.grunnlag.status == SporStatus.AVSLATT_AKSEPTERT
    assert state2.grunnlag.te_akseptert is True
    # Byggherrens standpunkt er bevart, så grunnlaget for forsering består.
    assert state2.grunnlag.bh_resultat == GrunnlagResponsResultat.AVSLATT
    # Er ansvaret avvist og avvisningen godtatt, er saken over.
    assert state2.kan_utstede_eo is False


def test_te_aksepterer_avslag_gjor_vederlag_godkjent():
    """Samme feil som TFR-01, på vederlagssporet.

    Reproduksjonen fra 18.09 dekket bare grunnlag. Kartleggingen 2026-09-19 kjørte
    alle tre spor og observerte identisk utfall: avslatt -> godkjent, og
    kan_utstede_eo fra False til True. _handle_te_aksepterer_respons setter
    SporStatus.GODKJENT ubetinget i alle tre grener.
    """
    timeline = TimelineService()
    events = _sak_med_godkjent_grunnlag()
    krav = VederlagEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        event_type="vederlag_krav_sendt",
        spor=SporType.VEDERLAG,
        data=VederlagData(
            krevd_belop=1000000,
            begrunnelse="Krav",
            metode=VederlagsMetode.FASTPRIS_TILBUD,
        ),
    )
    avslag = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_vederlag",
        spor=SporType.VEDERLAG,
        refererer_til_event_id=krav.event_id,
        data=VederlagResponsData(
            beregnings_resultat=VederlagBeregningResultat.AVSLATT,
            begrunnelse="Ikke grunnlag for vederlag",
        ),
    )
    events += [krav, avslag]
    assert timeline.compute_state(events).vederlag.status == SporStatus.AVSLATT

    etter = timeline.compute_state(events + [_aksept("vederlag", avslag.event_id)])
    assert etter.vederlag.status != SporStatus.GODKJENT, (
        f"Avslått vederlagskrav ble gjort om til GODKJENT: {etter.vederlag.status}, "
        f"kan_utstede_eo={etter.kan_utstede_eo}"
    )
    assert etter.vederlag.status == SporStatus.AVSLATT_AKSEPTERT

    # Et oppgjort pengekrav skal ikke blokkere en EO bygget på fristsporet:
    # grunnlaget er godkjent, og det er intet utestående krav på vederlag.
    # Samme behandling som et trukket krav (besluttet 2026-09-19).
    assert etter.kan_utstede_eo is True


def test_te_aksepterer_avslag_gjor_frist_godkjent():
    """Samme feil som TFR-01, på fristsporet.

    Fristsporet er det med størst konsekvens: et avslått fristkrav er selve
    forutsetningen for forsering etter § 33.8. Registreres avslaget som enighet,
    forsvinner grunnlaget for forseringssporet fra journalen.
    """
    timeline = TimelineService()
    events = _sak_med_godkjent_grunnlag()
    krav = FristEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(krevd_dager=30, begrunnelse="Krav"),
    )
    avslag = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_frist",
        spor=SporType.FRIST,
        refererer_til_event_id=krav.event_id,
        data=FristResponsData(
            beregnings_resultat=FristBeregningResultat.AVSLATT,
            begrunnelse="Ingen fristforlengelse",
        ),
    )
    events += [krav, avslag]
    assert timeline.compute_state(events).frist.status == SporStatus.AVSLATT

    etter = timeline.compute_state(events + [_aksept("frist", avslag.event_id)])
    assert etter.frist.status != SporStatus.GODKJENT, (
        f"Avslått fristkrav ble gjort om til GODKJENT: {etter.frist.status}, "
        f"kan_utstede_eo={etter.kan_utstede_eo}"
    )
    assert etter.frist.status == SporStatus.AVSLATT_AKSEPTERT

    # bh_resultat er uendret, så forseringssporet består: et avslått fristkrav
    # er forutsetningen for forsering etter § 33.8, og TEs aksept av avslaget
    # endrer ikke at byggherren avslo.
    assert etter.frist.bh_resultat == FristBeregningResultat.AVSLATT


def test_enighet_pa_byggherrens_premisser_gir_utstedbar_eo():
    """Hele TFR-01-beslutningen i ett scenario (KOE-118 i drøftingen 19.09).

    Uforutsette grunnforhold. Byggherren godkjenner ansvaret, avslår vederlaget
    på 800 000 i sin helhet, og gir 20 av 30 krevde dager. TE godtar begge svar.

    Partene er da enige om alt: ansvaret er byggherrens, fristen er 20 dager, og
    det tilkommer ingen penger. Systemets formål er å kunne dokumentere nettopp
    det — og byggherren må kunne utstede endringsordren som registrerer det, med
    20 dager og 0 kroner.
    """
    timeline = TimelineService()
    events = _sak_med_godkjent_grunnlag()

    v_krav = VederlagEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        event_type="vederlag_krav_sendt",
        spor=SporType.VEDERLAG,
        data=VederlagData(
            belop_direkte=800000,
            metode=VederlagsMetode.FASTPRIS_TILBUD,
            begrunnelse="Sprengning og masseutskifting",
        ),
    )
    v_avslag = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_vederlag",
        spor=SporType.VEDERLAG,
        refererer_til_event_id=v_krav.event_id,
        data=VederlagResponsData(
            beregnings_resultat=VederlagBeregningResultat.AVSLATT,
            begrunnelse="Dekkes av rigg og drift i kontraktssummen",
        ),
    )
    f_krav = FristEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(krevd_dager=30, begrunnelse="Sprengning forsinker råbygg"),
    )
    f_delvis = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_frist",
        spor=SporType.FRIST,
        refererer_til_event_id=f_krav.event_id,
        data=FristResponsData(
            beregnings_resultat=FristBeregningResultat.DELVIS_GODKJENT,
            godkjent_dager=20,
            begrunnelse="20 dager, ikke 30",
        ),
    )

    events += [v_krav, v_avslag, f_krav, f_delvis]
    assert timeline.compute_state(events).kan_utstede_eo is False

    etter = timeline.compute_state(
        events
        + [
            _aksept("frist", f_delvis.event_id),
            _aksept("vederlag", v_avslag.event_id),
        ]
    )

    # Delvis godkjent blir enighet om byggherrens tall, og tallet er bevart.
    assert etter.frist.status == SporStatus.GODKJENT
    assert etter.frist.godkjent_dager == 20

    # Avslag blir enighet om at intet tilkommer — ikke om at kravet er innvilget.
    assert etter.vederlag.status == SporStatus.AVSLATT_AKSEPTERT
    assert etter.vederlag.godkjent_belop is None

    # Og endringsordren kan utstedes: 20 dager, 0 kroner.
    assert etter.kan_utstede_eo is True


def test_godtatt_avslag_kan_ikke_trekkes_tilbake():
    """AVSLATT_AKSEPTERT er terminal: kravet kan ikke trekkes etterpå.

    Uten dette ville TE kunne trekke et krav de formelt har godtatt avslaget på,
    og dermed skrive om et avsluttet oppgjør. Statusen blokkeres på linje med
    GODKJENT og TRUKKET i de tre tilbaketrekkingsreglene.
    """
    timeline = TimelineService()
    validator = BusinessRuleValidator()
    events = _sak_med_godkjent_grunnlag()

    krav = FristEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(krevd_dager=30, begrunnelse="Krav"),
    )
    avslag = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_frist",
        spor=SporType.FRIST,
        refererer_til_event_id=krav.event_id,
        data=FristResponsData(
            beregnings_resultat=FristBeregningResultat.AVSLATT,
            begrunnelse="Ingen fristforlengelse",
        ),
    )
    events += [krav, avslag]

    # Før aksept står avslaget, og kravet kan fortsatt trekkes.
    trekk = WithdrawalEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        event_type="frist_krav_trukket",
        data=WithdrawalData(begrunnelse="TE trekker kravet"),
    )
    assert validator.validate(trekk, timeline.compute_state(events)).is_valid is True

    # Etter aksept er sporet oppgjort, og tilbaketrekking avvises.
    etter = timeline.compute_state(events + [_aksept("frist", avslag.event_id)])
    assert etter.frist.status == SporStatus.AVSLATT_AKSEPTERT
    resultat = validator.validate(trekk, etter)
    assert resultat.is_valid is False
    assert "trekkes tilbake" in resultat.message


# =============================================================================
# 2. overordnet_status ignorerer sakstype for forsering og endringsordrer
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="overordnet_status sjekker kun standardspor og gir INGEN_AKTIVE_SPOR for forsering og EO",
)
def test_overordnet_status_gir_ingen_aktive_spor_for_forsering():
    """overordnet_status må reflektere forseringstilstand i stedet for 'INGEN_AKTIVE_SPOR'.

    Beregningen sjekker kun grunnlag/vederlag/frist. I forseringssaker og endringsordrer
    er disse alltid IKKE_RELEVANT, så overordnet_status returnerer alltid INGEN_AKTIVE_SPOR,
    selv etter varsling og aksept.
    """
    timeline = TimelineService()

    e1 = SakOpprettetEvent(
        sak_id="FORS-1",
        sakstittel="Forseringssak",
        aktor="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
        sakstype="forsering",
        forsering_data={"avslatte_fristkrav": ["K-1"]},
    )
    e2 = ForseringVarselEvent(
        sak_id="FORS-1",
        aktor="te",
        aktor_rolle="TE",
        data=ForseringVarselData(
            frist_krav_id="frist-1",
            respons_frist_id="respons-1",
            estimert_kostnad=500000,
            begrunnelse="Forserer pga avslag",
            bekreft_30_prosent=True,
            dato_iverksettelse="2026-09-18",
            avslatte_dager=10,
            dagmulktsats=50000,
        ),
    )
    e3 = ForseringResponsEvent(
        sak_id="FORS-1",
        aktor="bh",
        aktor_rolle="BH",
        data=ForseringResponsData(
            aksepterer=True,
            godkjent_kostnad=500000,
            begrunnelse="BH aksepterer forsering",
        ),
    )

    state = timeline.compute_state([e1, e2, e3])

    # Feiler i dag fordi overordnet_status returnerer 'INGEN_AKTIVE_SPOR'
    assert state.overordnet_status != "INGEN_AKTIVE_SPOR", (
        f"Akseptert forseringssak fikk overordnet_status='{state.overordnet_status}'"
    )


# =============================================================================
# 3. _rule_vederlag_can_be_withdrawn blokkerer tilbaketrekking av subsidiært krav
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="Beregningsstatus GODKJENT blokkerer tilbaketrekking selv når kravet prinsipalt er avslått",
)
def test_vederlag_krav_trukket_blokkeres_ved_subsidiaer_enighet():
    """TE må kunne trekke et vederlagskrav som BH prinsipalt har avslått.

    Når BH avslår grunnlag, men godkjenner beregningen subsidiært, settes
    state.vederlag.status = GODKJENT.
    _rule_vederlag_can_be_withdrawn blokkerer tilbaketrekking når status er GODKJENT.
    Dermed kan ikke TE trekke et krav som er prinsipalt avslått.
    """
    timeline = TimelineService()
    validator = BusinessRuleValidator()

    e1 = SakOpprettetEvent(
        sak_id="S-1",
        sakstittel="Endring",
        aktor="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    e2 = GrunnlagEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        data=GrunnlagData(
            tittel="T",
            beskrivelse="B",
            hovedkategori="ENDRING",
            dato_oppdaget="2026-09-18",
        ),
    )
    e3 = VederlagEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        data=VederlagData(
            metode=VederlagsMetode.ENHETSPRISER,
            belop_direkte=50000,
            begrunnelse="Krav",
        ),
    )

    # BH avslår grunnlag
    e4 = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_grunnlag",
        spor=SporType.GRUNNLAG,
        refererer_til_event_id=e2.event_id,
        data=GrunnlagResponsData(
            resultat=GrunnlagResponsResultat.AVSLATT, begrunnelse="Ikke ansvar"
        ),
    )

    # BH godkjenner beregningen subsidiært
    e5 = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_vederlag",
        spor=SporType.VEDERLAG,
        refererer_til_event_id=e3.event_id,
        data=VederlagResponsData(
            beregnings_resultat=VederlagBeregningResultat.GODKJENT,
            total_godkjent_belop=50000,
            begrunnelse="Beregning ok, men avslått pga ansvar",
        ),
    )

    state = timeline.compute_state([e1, e2, e3, e4, e5])
    assert state.er_subsidiaert_vederlag is True

    # TE ønsker å trekke vederlagskravet
    withdraw = parse_event_from_request(
        {
            "sak_id": "S-1",
            "event_type": "vederlag_krav_trukket",
            "refererer_til_event_id": e3.event_id,
            "aktor": "te",
            "aktor_rolle": "TE",
            "data": {"begrunnelse": "Trekker kravet etter grunnlagsavslag"},
        }
    )

    res = validator.validate(withdraw, state)

    # Feiler i dag fordi res.is_valid er False ('status er godkjent')
    assert res.is_valid is True, (
        f"TE ble nektet å trekke subsidiært vederlagskrav: {res.message}"
    )


# =============================================================================
# 4. require_truthy=True forkaster subsidiært standpunkt på 0 kr / 0 dager
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="_copy_fields_if_present med require_truthy=True forkaster 0 og 0.0 som falsy",
)
def test_subsidiaert_standpunkt_paa_null_forsvinner():
    """TimelineService må ikke forkaste subsidiaer_godkjent_belop=0 eller dager=0.

    _copy_fields_if_present kalles med require_truthy=True for subsidiære felter.
    0 og 0.0 evalueres som falsy, så verdiene blir aldri satt på state.
    """
    timeline = TimelineService()

    e1 = SakOpprettetEvent(
        sak_id="S-1",
        sakstittel="Endring",
        aktor="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    e2 = GrunnlagEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        data=GrunnlagData(
            tittel="T",
            beskrivelse="B",
            hovedkategori="ENDRING",
            dato_oppdaget="2026-09-18",
        ),
    )
    e3 = VederlagEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        data=VederlagData(
            metode=VederlagsMetode.ENHETSPRISER,
            belop_direkte=50000,
            begrunnelse="Krav",
        ),
    )
    e4 = FristEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        data=FristData(antall_dager=10, begrunnelse="Fristkrav"),
    )

    resp_ved = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_vederlag",
        spor=SporType.VEDERLAG,
        refererer_til_event_id=e3.event_id,
        data=VederlagResponsData(
            beregnings_resultat=VederlagBeregningResultat.AVSLATT,
            subsidiaer_resultat=VederlagBeregningResultat.AVSLATT,
            subsidiaer_godkjent_belop=0.0,
            subsidiaer_begrunnelse="Subsidiært godkjennes 0 kr",
        ),
    )

    resp_frist = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_frist",
        spor=SporType.FRIST,
        refererer_til_event_id=e4.event_id,
        data=FristResponsData(
            beregnings_resultat=FristBeregningResultat.AVSLATT,
            subsidiaer_resultat=FristBeregningResultat.AVSLATT,
            subsidiaer_godkjent_dager=0,
            subsidiaer_begrunnelse="Subsidiært godkjennes 0 dager",
        ),
    )

    state = timeline.compute_state([e1, e2, e3, e4, resp_ved, resp_frist])

    # Feiler i dag fordi 0.0 og 0 ble svelget og står som None
    assert state.vederlag.subsidiaer_godkjent_belop == 0.0, (
        f"subsidiaer_godkjent_belop ble {state.vederlag.subsidiaer_godkjent_belop} i stedet for 0.0"
    )
    assert state.frist.subsidiaer_godkjent_dager == 0, (
        f"subsidiaer_godkjent_dager ble {state.frist.subsidiaer_godkjent_dager} i stedet for 0"
    )


# =============================================================================
# 5. Godkjent ansvarsgrunnlag rapporteres som UTKAST
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="overordnet_status returnerer UTKAST når grunnlag er godkjent og låst, fordi vederlag/frist er uopprettet",
)
def test_godkjent_grunnlag_rapporteres_som_utkast():
    """En sak der BH har godkjent grunnlaget må ikke få overordnet_status='UTKAST'.

    Når grunnlag er godkjent og låst, men vederlag/frist ennå ikke er sendt inn,
    viser saken overordnet status 'UTKAST' fordi uopprettede spor står som UTKAST.
    """
    timeline = TimelineService()

    e1 = SakOpprettetEvent(
        sak_id="S-1",
        sakstittel="Endring",
        aktor="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    e2 = GrunnlagEvent(
        sak_id="S-1",
        aktor="te",
        aktor_rolle="TE",
        data=GrunnlagData(
            tittel="T",
            beskrivelse="B",
            hovedkategori="ENDRING",
            dato_oppdaget="2026-09-18",
        ),
    )
    e3 = ResponsEvent(
        sak_id="S-1",
        aktor="bh",
        aktor_rolle="BH",
        event_type="respons_grunnlag",
        spor=SporType.GRUNNLAG,
        refererer_til_event_id=e2.event_id,
        data=GrunnlagResponsData(
            resultat=GrunnlagResponsResultat.GODKJENT, begrunnelse="Godkjent"
        ),
    )

    state = timeline.compute_state([e1, e2, e3])
    assert state.grunnlag.status == SporStatus.LAAST

    # Feiler i dag fordi overordnet_status returnerer 'UTKAST'
    assert state.overordnet_status != "UTKAST", (
        f"Sak med godkjent grunnlag rapporteres som '{state.overordnet_status}'"
    )
