"""Tilstandskonsistens og NS 8407-forretningsregler (Pass 3).

Testene her etterprøver funn i tilstandsberegning og forretningsregler:
1. TE_AKSEPTERER_RESPONS forvandler et avslag fra BH til GODKJENT — på alle tre
   spor. Reproduksjonen fra 18.09 dekket bare grunnlag; vederlag og frist er
   lagt til 2026-09-19 etter at alle tre ble kjørt og observert.
2. overordnet_status ga INGEN_AKTIVE_SPOR for forsering og EO (TFR-02, rettet 2026-09-23)
3. Tilbaketrekking av subsidiært godkjente krav ble blokkert (TFR-03, rettet 2026-09-23)
4. Subsidiært standpunkt på 0 kr / 0 dager ble forkastet som falsy (TFR-04, rettet 2026-09-23)
5. Godkjent og låst ansvarsgrunnlag ble rapportert som 'UTKAST' (TFR-05, rettet 2026-09-23)
6. Et fullt BH-svar med dager godtas på et nøytralt fristvarsel (TFR-06)
7. Sidefunn fra spor D 23.09: subsidiært standpunkt som henger igjen (SD-01) og
   trukket grunnlag som vises som utkast (SD-02)
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
    VarselInfo,
    VederlagBeregningResultat,
    VederlagData,
    VederlagEvent,
    VederlagResponsData,
    VederlagsMetode,
    WithdrawalData,
    WithdrawalEvent,
    parse_event_from_request,
)
from models.sak_state import (
    EndringsordreData,
    EOStatus,
    ForseringData,
    FristTilstand,
    GrunnlagTilstand,
    SakState,
    SaksType,
    VederlagTilstand,
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
            "aktor_id": "te",
            "aktor_rolle": "TE",
            "data": {"begrunnelse": "TE aksepterer avslaget"},
        }
    )


def _sak_med_godkjent_grunnlag() -> list:
    """Sak der grunnlaget er godkjent, så vederlag og frist kan prøves isolert."""
    opprettet = SakOpprettetEvent(
        sak_id="S-1",
        sakstittel="Endring",
        aktor_id="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    grunnlag = GrunnlagEvent(
        sak_id="S-1",
        aktor_id="te",
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
        aktor_id="bh",
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
        aktor_id="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    e2 = GrunnlagEvent(
        sak_id="S-1",
        aktor_id="te",
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
        aktor_id="bh",
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
            "aktor_id": "te",
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
        aktor_id="te",
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
        aktor_id="bh",
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
        aktor_id="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(krevd_dager=30, begrunnelse="Krav"),
    )
    avslag = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
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
        aktor_id="te",
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
        aktor_id="bh",
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
        aktor_id="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(krevd_dager=30, begrunnelse="Sprengning forsinker råbygg"),
    )
    f_delvis = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
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
        aktor_id="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(krevd_dager=30, begrunnelse="Krav"),
    )
    avslag = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
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
        aktor_id="te",
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


def test_overordnet_status_gir_ingen_aktive_spor_for_forsering():
    """overordnet_status må reflektere forseringstilstand i stedet for 'INGEN_AKTIVE_SPOR'.

    Regresjonstest for TFR-02 (rettet 2026-09-23). I forseringssaker og
    endringsordrer er de tre sporene IKKE_RELEVANT, og statusen ble alltid
    INGEN_AKTIVE_SPOR.
    """
    timeline = TimelineService()

    e1 = SakOpprettetEvent(
        sak_id="FORS-1",
        sakstittel="Forseringssak",
        aktor_id="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
        sakstype="forsering",
        forsering_data={"avslatte_fristkrav": ["K-1"]},
    )
    e2 = ForseringVarselEvent(
        sak_id="FORS-1",
        aktor_id="te",
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
        aktor_id="bh",
        aktor_rolle="BH",
        data=ForseringResponsData(
            aksepterer=True,
            godkjent_kostnad=500000,
            begrunnelse="BH aksepterer forsering",
        ),
    )

    state = timeline.compute_state([e1, e2, e3])

    assert state.overordnet_status != "INGEN_AKTIVE_SPOR", (
        f"Akseptert forseringssak fikk overordnet_status='{state.overordnet_status}'"
    )
    assert state.overordnet_status == "UNDER_BEHANDLING"

    # Aksepten stenger ikke saken: TE kan fortsatt oppdatere påløpte kostnader.
    kostnader = parse_event_from_request(
        {
            "sak_id": "FORS-1",
            "event_type": "forsering_kostnader_oppdatert",
            "aktor_id": "te",
            "aktor_rolle": "TE",
            "data": {"paalopte_kostnader": 250000, "kommentar": "Halvveis"},
        }
    )
    resultat = BusinessRuleValidator().validate(kostnader, state)
    assert resultat.violated_rule != "CASE_NOT_CLOSED", resultat.message


def _forsering(**felt) -> SakState:
    return SakState(
        sak_id="FORS-1",
        sakstype=SaksType.FORSERING,
        forsering_data=ForseringData(avslatte_fristkrav=["K-1"], **felt),
    )


@pytest.mark.parametrize(
    ("felt", "forventet"),
    [
        ({}, "UTKAST"),
        ({"dato_varslet": "2026-09-18"}, "VENTER_PAA_SVAR"),
        ({"dato_varslet": "2026-09-18", "bh_aksepterer_forsering": False}, "UNDER_FORHANDLING"),
        ({"dato_varslet": "2026-09-18", "bh_aksepterer_forsering": True}, "UNDER_BEHANDLING"),
        ({"dato_varslet": "2026-09-18", "er_stoppet": True}, "UNDER_BEHANDLING"),
    ],
)
def test_forseringssak_faar_aldri_lukket_status(felt, forventet):
    """Besluttet av oppdragsgiver 23.09: forsering gis aldri en lukket status."""
    assert _forsering(**felt).overordnet_status == forventet


@pytest.mark.parametrize(
    ("eo_status", "forventet"),
    [
        (EOStatus.UTKAST, "UTKAST"),
        (EOStatus.UTSTEDT, "VENTER_PAA_SVAR"),
        (EOStatus.REVIDERT, "VENTER_PAA_SVAR"),
        (EOStatus.AKSEPTERT, "LUKKET"),
        (EOStatus.BESTRIDT, "LUKKET"),
    ],
)
def test_endringsordre_folger_ordrens_livslop(eo_status, forventet):
    """Besluttet av oppdragsgiver 23.09: en EO er en ordre og forhandles ikke.

    Bestrider TE, føres uenigheten videre i en KOE, og EO-saken er lukket.
    """
    state = SakState(
        sak_id="EO-1",
        sakstype=SaksType.ENDRINGSORDRE,
        endringsordre_data=EndringsordreData(
            eo_nummer="EO-1", beskrivelse="Endring", status=eo_status
        ),
    )
    assert state.overordnet_status == forventet


def test_bestridt_endringsordre_kan_fortsatt_revideres():
    """LUKKET stenger ikke EO-livsløpet: EO-hendelsene er unntatt fra sperren."""
    state = SakState(
        sak_id="EO-1",
        sakstype=SaksType.ENDRINGSORDRE,
        endringsordre_data=EndringsordreData(
            eo_nummer="EO-1", beskrivelse="Endring", status=EOStatus.BESTRIDT
        ),
    )
    assert state.overordnet_status == "LUKKET"
    revisjon = parse_event_from_request(
        {
            "sak_id": "EO-1",
            "event_type": "eo_revidert",
            "aktor_id": "bh",
            "aktor_rolle": "BH",
            "data": {"ny_revisjon_nummer": 1, "endringer_beskrivelse": "Justert omfang"},
        }
    )
    resultat = BusinessRuleValidator().validate(revisjon, state)
    assert resultat.violated_rule != "CASE_NOT_CLOSED", resultat.message


# =============================================================================
# 3. _rule_vederlag_can_be_withdrawn blokkerer tilbaketrekking av subsidiært krav
# =============================================================================


def test_vederlag_krav_trukket_blokkeres_ved_subsidiaer_enighet():
    """TE må kunne trekke et vederlagskrav som BH prinsipalt har avslått.

    Regresjonstest for TFR-03 (rettet 2026-09-23). Når BH avslår grunnlaget,
    men godkjenner beregningen subsidiært, er sporstatus GODKJENT uten at
    kravet er oppgjort.
    """
    timeline = TimelineService()
    validator = BusinessRuleValidator()

    e1 = SakOpprettetEvent(
        sak_id="S-1",
        sakstittel="Endring",
        aktor_id="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    e2 = GrunnlagEvent(
        sak_id="S-1",
        aktor_id="te",
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
        aktor_id="te",
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
        aktor_id="bh",
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
        aktor_id="bh",
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
            "aktor_id": "te",
            "aktor_rolle": "TE",
            "data": {"begrunnelse": "Trekker kravet etter grunnlagsavslag"},
        }
    )

    res = validator.validate(withdraw, state)

    assert res.is_valid is True, (
        f"TE ble nektet å trekke subsidiært vederlagskrav: {res.message}"
    )


def _frist_subsidiaert_godkjent() -> tuple[list, FristEvent]:
    """Grunnlaget avslått, fristberegningen godkjent subsidiært."""
    opprettet, grunnlag, _ = _sak_med_godkjent_grunnlag()
    avslag = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type="respons_grunnlag",
        spor=SporType.GRUNNLAG,
        refererer_til_event_id=grunnlag.event_id,
        data=GrunnlagResponsData(
            resultat=GrunnlagResponsResultat.AVSLATT, begrunnelse="Ikke ansvar"
        ),
    )
    krav = FristEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(krevd_dager=30, begrunnelse="Krav"),
    )
    subsidiaert = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type="respons_frist",
        spor=SporType.FRIST,
        refererer_til_event_id=krav.event_id,
        data=FristResponsData(
            beregnings_resultat=FristBeregningResultat.GODKJENT,
            godkjent_dager=30,
            begrunnelse="Dagene er riktige, men ansvaret avvises",
        ),
    )
    return [opprettet, grunnlag, avslag, krav, subsidiaert], subsidiaert


def _trekk_frist():
    return WithdrawalEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type="frist_krav_trukket",
        data=WithdrawalData(begrunnelse="TE trekker kravet"),
    )


def test_frist_krav_kan_trekkes_ved_subsidiaer_enighet():
    """TFR-03 gjelder begge pengesporene: også et subsidiært godkjent fristkrav kan trekkes."""
    timeline = TimelineService()
    events, _ = _frist_subsidiaert_godkjent()
    state = timeline.compute_state(events)
    assert state.frist.status == SporStatus.GODKJENT
    assert state.er_subsidiaert_frist is True

    assert BusinessRuleValidator().validate(_trekk_frist(), state).is_valid is True


def test_subsidiaer_enighet_godtatt_av_te_kan_ikke_trekkes():
    """Har TE godtatt svaret, er kravet oppgjort, og tilbaketrekking avvises."""
    timeline = TimelineService()
    events, subsidiaert = _frist_subsidiaert_godkjent()
    etter = timeline.compute_state(events + [_aksept("frist", subsidiaert.event_id)])
    assert etter.frist.te_akseptert is True

    resultat = BusinessRuleValidator().validate(_trekk_frist(), etter)
    assert resultat.is_valid is False
    assert "trekkes tilbake" in resultat.message


# =============================================================================
# 4. require_truthy=True forkaster subsidiært standpunkt på 0 kr / 0 dager
# =============================================================================


def test_subsidiaert_standpunkt_paa_null_forsvinner():
    """TimelineService må ikke forkaste subsidiaer_godkjent_belop=0 eller dager=0.

    Regresjonstest for TFR-04 (rettet 2026-09-23). Et subsidiært standpunkt på
    0 kr eller 0 dager er et standpunkt, ikke et fravær av et.
    """
    timeline = TimelineService()

    e1 = SakOpprettetEvent(
        sak_id="S-1",
        sakstittel="Endring",
        aktor_id="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    e2 = GrunnlagEvent(
        sak_id="S-1",
        aktor_id="te",
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
        aktor_id="te",
        aktor_rolle="TE",
        data=VederlagData(
            metode=VederlagsMetode.ENHETSPRISER,
            belop_direkte=50000,
            begrunnelse="Krav",
        ),
    )
    e4 = FristEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        data=FristData(antall_dager=10, begrunnelse="Fristkrav"),
    )

    resp_ved = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
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
        aktor_id="bh",
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

    assert state.vederlag.subsidiaer_godkjent_belop == 0.0, (
        f"subsidiaer_godkjent_belop ble {state.vederlag.subsidiaer_godkjent_belop} i stedet for 0.0"
    )
    assert state.frist.subsidiaer_godkjent_dager == 0, (
        f"subsidiaer_godkjent_dager ble {state.frist.subsidiaer_godkjent_dager} i stedet for 0"
    )


# =============================================================================
# 5. Godkjent ansvarsgrunnlag rapporteres som UTKAST
# =============================================================================


def test_godkjent_grunnlag_rapporteres_som_utkast():
    """En sak der BH har godkjent grunnlaget må ikke få overordnet_status='UTKAST'.

    Regresjonstest for TFR-05 (rettet 2026-09-23). Vederlag og frist er ikke
    sendt, men saken er i gang. Statusen ble besluttet av oppdragsgiver 23.09.
    """
    timeline = TimelineService()

    e1 = SakOpprettetEvent(
        sak_id="S-1",
        sakstittel="Endring",
        aktor_id="te",
        aktor_rolle="TE",
        prosjekt_id="p1",
    )
    e2 = GrunnlagEvent(
        sak_id="S-1",
        aktor_id="te",
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
        aktor_id="bh",
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

    assert state.overordnet_status != "UTKAST", (
        f"Sak med godkjent grunnlag rapporteres som '{state.overordnet_status}'"
    )
    assert state.overordnet_status == "UNDER_BEHANDLING"


def test_sak_oppgjort_ved_godtatt_avslag_rapporteres_ikke_som_ukjent():
    """overordnet_status må kjenne AVSLATT_AKSEPTERT (TFR-01)."""
    timeline = TimelineService()
    events = _sak_med_godkjent_grunnlag()

    krav = FristEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(krevd_dager=30, begrunnelse="Krav"),
    )
    avslag = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type="respons_frist",
        spor=SporType.FRIST,
        refererer_til_event_id=krav.event_id,
        data=FristResponsData(
            beregnings_resultat=FristBeregningResultat.AVSLATT,
            begrunnelse="Ingen fristforlengelse",
        ),
    )
    etter = timeline.compute_state(
        events + [krav, avslag, _aksept("frist", avslag.event_id)]
    )

    assert etter.frist.status == SporStatus.AVSLATT_AKSEPTERT

    assert etter.overordnet_status != "UKJENT"

    # Vederlagssporet er aldri sendt, så saken er ikke oppgjort (TFR-05).
    assert etter.overordnet_status == "UNDER_BEHANDLING"


# =============================================================================
# 6. Fullt BH-svar på et nøytralt fristvarsel (TFR-06)
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "TFR-06: _rule_frist_sent godtar et BH-svar som godkjenner 10 dager på et "
        "nøytralt varsel (§ 33.4) uten krevde dager; sporet blir GODKJENT. Ikke "
        "rettet: en sperre må slippe gjennom innsigelse mot sen varsling (§ 5) og "
        "forespørsel (§ 33.6.2, DRF-01), og hvordan de registreres er ikke avgjort"
    ),
)
def test_fullt_fristsvar_paa_noytralt_varsel():
    timeline = TimelineService()
    events = _sak_med_godkjent_grunnlag()
    varsel = FristEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(
            varsel_type="varsel",
            frist_varsel=VarselInfo(dato_sendt="2026-09-02", metode=["digital_oversendelse"]),
        ),
    )
    state = timeline.compute_state(events + [varsel])
    if state.frist.varsel_type != "varsel" or state.frist.krevd_dager is not None:
        pytest.fail(f"Oppsettet gir ikke et nøytralt varsel: {state.frist}")

    svar = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type="respons_frist",
        spor=SporType.FRIST,
        refererer_til_event_id=varsel.event_id,
        data=FristResponsData(
            frist_krav_id=varsel.event_id,
            frist_varsel_ok=True,
            spesifisert_krav_ok=True,
            vilkar_oppfylt=True,
            beregnings_resultat=FristBeregningResultat.GODKJENT,
            godkjent_dager=10,
            begrunnelse="Byggherren godkjenner 10 dager",
        ),
    )

    assert BusinessRuleValidator().validate(svar, state).is_valid is False


# =============================================================================
# 7. Sidefunn fra spor D 23.09 (docs/gjennomforing-spor-d-2026-09-23.md)
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason=(
        "SD-01: et nytt vederlagssvar uten subsidiært standpunkt lar det subsidiære "
        "standpunktet fra forrige svar stå i tilstanden; frontenden viser det"
    ),
)
def test_nytt_svar_uten_subsidiaert_standpunkt_fjerner_det_gamle():
    timeline = TimelineService()
    krav = VederlagEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type="vederlag_krav_sendt",
        spor=SporType.VEDERLAG,
        data=VederlagData(
            metode=VederlagsMetode.FASTPRIS_TILBUD, belop_direkte=100000, begrunnelse="Krav"
        ),
    )
    forste_svar = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type="respons_vederlag",
        spor=SporType.VEDERLAG,
        refererer_til_event_id=krav.event_id,
        data=VederlagResponsData(
            beregnings_resultat=VederlagBeregningResultat.AVSLATT,
            total_godkjent_belop=0,
            subsidiaer_resultat=VederlagBeregningResultat.GODKJENT,
            subsidiaer_godkjent_belop=100000,
            begrunnelse="Prekludert, subsidiært godkjent",
        ),
    )
    revidert = VederlagEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type="vederlag_krav_oppdatert",
        spor=SporType.VEDERLAG,
        data=VederlagData(
            metode=VederlagsMetode.FASTPRIS_TILBUD, belop_direkte=80000, begrunnelse="Revidert"
        ),
    )
    nytt_svar = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type="respons_vederlag",
        spor=SporType.VEDERLAG,
        refererer_til_event_id=revidert.event_id,
        data=VederlagResponsData(
            beregnings_resultat=VederlagBeregningResultat.GODKJENT,
            total_godkjent_belop=80000,
            begrunnelse="Godkjent",
        ),
    )

    vederlag = timeline.compute_state(
        _sak_med_godkjent_grunnlag() + [krav, forste_svar, revidert, nytt_svar]
    ).vederlag

    assert vederlag.subsidiaer_godkjent_belop is None, (
        f"Standpunktet fra forrige svar står igjen: {vederlag.subsidiaer_resultat}, "
        f"{vederlag.subsidiaer_godkjent_belop}"
    )


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="SD-02: en sak der TE har trukket grunnlaget før andre krav er sendt, vises som UTKAST",
)
def test_trukket_grunnlag_uten_andre_krav_vises_ikke_som_utkast():
    state = SakState(
        sak_id="S-1",
        sakstype=SaksType.STANDARD,
        grunnlag=GrunnlagTilstand(status=SporStatus.TRUKKET),
        vederlag=VederlagTilstand(status=SporStatus.UTKAST),
        frist=FristTilstand(status=SporStatus.UTKAST),
    )
    assert state.overordnet_status != "UTKAST"
