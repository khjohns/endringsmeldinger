"""Endret underkategori etter BHs svar krever nytt svar (B-13, vedtak 05.10, #215).

Vedtaket: låsingen og § 32.2-vurderingen fra det forrige svaret faller bort, og
grunnlaget venter på BHs svar igjen. Journalen beholder svaret som historikk.
Oppdragsgiver 05.10: hele svaret faller i tilstanden, og vederlag og frist som
BH svarte på subsidiært, forblir subsidiære til BH svarer på grunnlaget igjen.
"""

from models.events import (
    EventType,
    GrunnlagData,
    GrunnlagEvent,
    GrunnlagResponsData,
    GrunnlagResponsResultat,
    ResponsEvent,
    SakOpprettetEvent,
    SporStatus,
    SporType,
    VederlagBeregningResultat,
    VederlagResponsData,
)
from regler import REGELVERSJON
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService

timeline = TimelineService()


def _grunnlag(event_type, hovedkategori, underkategori):
    return GrunnlagEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type=event_type,
        data=GrunnlagData(
            tittel="Endret fundamentering",
            hovedkategori=hovedkategori,
            underkategori=underkategori,
            beskrivelse="Byggherren endret fundamenteringen.",
            dato_oppdaget="2026-09-01",
        ),
    )


def _svar(krav, resultat, varslet_i_tide=None, event_type=EventType.RESPONS_GRUNNLAG):
    return ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type=event_type,
        spor=SporType.GRUNNLAG,
        refererer_til_event_id=krav.event_id,
        data=GrunnlagResponsData.model_construct(
            resultat=resultat,
            begrunnelse="Vurdert",
            grunnlag_varslet_i_tide=varslet_i_tide,
            regelversjon=REGELVERSJON,
        ),
    )


def _besvart(hovedkategori, underkategori, resultat, varslet_i_tide):
    opprettet = SakOpprettetEvent(
        sak_id="S-1", aktor_id="te", aktor_rolle="TE", sakstittel="Sak", prosjekt_id="p"
    )
    krav = _grunnlag(EventType.GRUNNLAG_OPPRETTET, hovedkategori, underkategori)
    return [opprettet, krav, _svar(krav, resultat, varslet_i_tide)]


def _med_godkjent_vederlag(tilstand):
    tilstand.vederlag.status = SporStatus.GODKJENT
    tilstand.vederlag.bh_resultat = VederlagBeregningResultat.GODKJENT
    tilstand.vederlag.godkjent_belop = 100000
    return tilstand


def _vederlagssvar():
    return ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type=EventType.RESPONS_VEDERLAG,
        spor=SporType.VEDERLAG,
        refererer_til_event_id="krav",
        data=VederlagResponsData.model_construct(
            beregnings_resultat=VederlagBeregningResultat.GODKJENT,
            total_godkjent_belop=100000,
        ),
    )


def _vederlag_besvart_for_endringen(resultat, varslet_i_tide, underkategori="EO"):
    """Vederlaget er besvart mens det forrige grunnlagssvaret gjaldt."""
    hendelser = _besvart("ENDRING", "IRREG", resultat, varslet_i_tide)
    tilstand = _med_godkjent_vederlag(timeline.compute_state(hendelser))
    oppdatert = _grunnlag(EventType.GRUNNLAG_OPPDATERT, "ENDRING", underkategori)
    return timeline._apply_event(tilstand, oppdatert), oppdatert


def test_vederlaget_er_subsidiaert_til_nytt_svar_paa_grunnlaget():
    tilstand, oppdatert = _vederlag_besvart_for_endringen(
        GrunnlagResponsResultat.GODKJENT, False
    )

    assert tilstand.grunnlag.bh_resultat is None
    assert tilstand.er_subsidiaert_vederlag is True
    assert tilstand.visningsstatus_vederlag.startswith("Prekludert")

    tilstand = timeline._apply_event(
        tilstand, _svar(oppdatert, GrunnlagResponsResultat.GODKJENT)
    )

    assert tilstand.grunnlag.status == SporStatus.LAAST
    assert tilstand.vederlag.subsidiaert_til_nytt_svar is None
    assert tilstand.er_subsidiaert_vederlag is False


def test_avslaatt_svar_faller_og_vederlaget_forblir_subsidiaert():
    tilstand, _ = _vederlag_besvart_for_endringen(
        GrunnlagResponsResultat.AVSLATT, True, underkategori=["EO"]
    )

    assert tilstand.grunnlag.status == SporStatus.SENDT
    assert tilstand.grunnlag.bh_resultat is None
    assert tilstand.vederlag.subsidiaert_til_nytt_svar == "avslatt"
    assert tilstand.visningsstatus_vederlag.startswith("Avslått pga. ansvar")


def test_svar_gitt_etter_at_grunnlagssvaret_falt_er_prinsipalt():
    """Uten et grunnlagssvar regner reglene vederlagssvaret som prinsipalt; projeksjonen følger."""
    tilstand, _ = _vederlag_besvart_for_endringen(GrunnlagResponsResultat.AVSLATT, True)

    tilstand = timeline._apply_event(tilstand, _vederlagssvar())

    assert tilstand.vederlag.subsidiaert_til_nytt_svar is None
    assert tilstand.er_subsidiaert_vederlag is False


def test_ubesvart_spor_faar_ikke_subsidiaert_standpunkt():
    hendelser = _besvart("ENDRING", "IRREG", GrunnlagResponsResultat.AVSLATT, True)
    oppdatert = _grunnlag(EventType.GRUNNLAG_OPPDATERT, "ENDRING", "EO")

    tilstand = timeline.compute_state(hendelser + [oppdatert])

    assert tilstand.vederlag.subsidiaert_til_nytt_svar is None
    assert tilstand.frist.subsidiaert_til_nytt_svar is None


def test_byggherren_kan_svare_paa_nytt():
    hendelser = _besvart("ENDRING", "IRREG", GrunnlagResponsResultat.GODKJENT, False)
    oppdatert = _grunnlag(EventType.GRUNNLAG_OPPDATERT, "ENDRING", "EO")
    tilstand = timeline.compute_state(hendelser + [oppdatert])

    nytt_svar = _svar(oppdatert, GrunnlagResponsResultat.GODKJENT)

    assert BusinessRuleValidator().validate(nytt_svar, tilstand).is_valid
    assert tilstand.neste_handling["rolle"] == "BH"


def test_samme_underkategori_lar_svaret_staa():
    """Fastholder atferden før vedtaket: bare en ny underkategori krever nytt svar."""
    hendelser = _besvart("ENDRING", "IRREG", GrunnlagResponsResultat.GODKJENT, False)
    oppdatert = _grunnlag(EventType.GRUNNLAG_OPPDATERT, "ENDRING", ["IRREG"])

    grunnlag = timeline.compute_state(hendelser + [oppdatert]).grunnlag

    assert grunnlag.status == SporStatus.UNDER_FORHANDLING
    assert grunnlag.bh_resultat == GrunnlagResponsResultat.GODKJENT
    assert grunnlag.grunnlag_varslet_i_tide is False
