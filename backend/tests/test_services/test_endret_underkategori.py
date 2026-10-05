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


def test_prekludert_svar_faller_ved_ny_underkategori():
    hendelser = _besvart("ENDRING", "IRREG", GrunnlagResponsResultat.GODKJENT, False)
    assert timeline.compute_state(hendelser).grunnlag.status == SporStatus.UNDER_FORHANDLING
    oppdatert = _grunnlag(EventType.GRUNNLAG_OPPDATERT, "ENDRING", "EO")

    grunnlag = timeline.compute_state(hendelser + [oppdatert]).grunnlag

    assert grunnlag.status == SporStatus.SENDT
    assert grunnlag.bh_resultat is None
    assert grunnlag.bh_begrunnelse is None
    assert grunnlag.grunnlag_varslet_i_tide is None
    assert grunnlag.laast is False
    assert grunnlag.respons_event_id is None


def test_vederlaget_er_subsidiaert_til_nytt_svar_paa_grunnlaget():
    hendelser = _besvart("ENDRING", "IRREG", GrunnlagResponsResultat.GODKJENT, False)
    oppdatert = _grunnlag(EventType.GRUNNLAG_OPPDATERT, "ENDRING", "EO")

    tilstand = _med_godkjent_vederlag(timeline.compute_state(hendelser + [oppdatert]))

    assert tilstand.er_subsidiaert_vederlag is True
    assert tilstand.visningsstatus_vederlag.startswith("Prekludert")

    nytt_svar = _svar(oppdatert, GrunnlagResponsResultat.GODKJENT)
    tilstand = _med_godkjent_vederlag(
        timeline.compute_state(hendelser + [oppdatert, nytt_svar])
    )

    assert tilstand.grunnlag.status == SporStatus.LAAST
    assert tilstand.grunnlag.subsidiaert_til_nytt_svar is None
    assert tilstand.er_subsidiaert_vederlag is False


def test_avslaatt_svar_faller_og_vederlaget_forblir_subsidiaert():
    hendelser = _besvart("ENDRING", "IRREG", GrunnlagResponsResultat.AVSLATT, True)
    oppdatert = _grunnlag(EventType.GRUNNLAG_OPPDATERT, "ENDRING", ["EO"])

    tilstand = _med_godkjent_vederlag(timeline.compute_state(hendelser + [oppdatert]))

    assert tilstand.grunnlag.status == SporStatus.SENDT
    assert tilstand.grunnlag.bh_resultat is None
    assert tilstand.grunnlag.subsidiaert_til_nytt_svar == "avslatt"
    assert tilstand.visningsstatus_vederlag.startswith("Avslått pga. ansvar")


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
