"""Svar på vederlag og frist når ansvarsgrunnlaget er avslått eller prekludert
(#168, #186; B-13 i hovedplanen 3.1).

§ 32.2 gjelder bare endring som ikke er formell endringsordre. Hendelser lagret
før forretningsreglene avviste feltet utenfor § 32.2, kan ha
`grunnlag_varslet_i_tide=False` ved EO; de prekluderer ikke.
"""

import pytest

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
from models.sak_state import GrunnlagTilstand, SakState, SaksType, VederlagTilstand
from regler.grunnlag import er_grunnlag_subsidiaert
from services.timeline_service import TimelineService

timeline = TimelineService()


def _grunnlagssvar(underkategori, resultat, varslet_i_tide):
    opprettet = SakOpprettetEvent(
        sak_id="S-1", aktor_id="te", aktor_rolle="TE", sakstittel="Sak", prosjekt_id="p"
    )
    grunnlag = GrunnlagEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type=EventType.GRUNNLAG_OPPRETTET,
        data=GrunnlagData(
            tittel="Endret fundamentering",
            hovedkategori="ENDRING",
            underkategori=underkategori,
            beskrivelse="Byggherren endret fundamenteringen.",
            dato_oppdaget="2026-09-01",
        ),
    )
    svar = ResponsEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        event_type=EventType.RESPONS_GRUNNLAG,
        spor=SporType.GRUNNLAG,
        refererer_til_event_id=grunnlag.event_id,
        data=GrunnlagResponsData.model_construct(
            resultat=resultat,
            begrunnelse="Vurdert",
            grunnlag_varslet_i_tide=varslet_i_tide,
        ),
    )
    return timeline.compute_state([opprettet, grunnlag, svar])


@pytest.mark.parametrize(
    ("resultat", "hovedkategori", "underkategori", "varslet", "forventet"),
    [
        (GrunnlagResponsResultat.AVSLATT, "ENDRING", "EO", None, True),
        ("avslatt", "SVIKT", None, None, True),
        (GrunnlagResponsResultat.GODKJENT, "ENDRING", "IRREG", False, True),
        (GrunnlagResponsResultat.GODKJENT, "ENDRING", ["IRREG"], False, True),
        (GrunnlagResponsResultat.GODKJENT, "ENDRING", "EO", False, False),
        (GrunnlagResponsResultat.GODKJENT, "ENDRING", "IRREG", True, False),
        (GrunnlagResponsResultat.GODKJENT, "SVIKT", None, False, False),
        (GrunnlagResponsResultat.FRAFALT, "ENDRING", "IRREG", True, False),
    ],
)
def test_regelen(resultat, hovedkategori, underkategori, varslet, forventet):
    assert (
        er_grunnlag_subsidiaert(resultat, hovedkategori, underkategori, varslet)
        is forventet
    )


def test_godkjent_eo_laases_selv_med_eldre_varslet_i_tide_false():
    tilstand = _grunnlagssvar("EO", GrunnlagResponsResultat.GODKJENT, False)
    assert tilstand.grunnlag.status == SporStatus.LAAST
    assert tilstand.grunnlag.laast is True


def test_godkjent_irregulaer_endring_varslet_for_sent_er_tvist():
    tilstand = _grunnlagssvar("IRREG", GrunnlagResponsResultat.GODKJENT, False)
    assert tilstand.grunnlag.status == SporStatus.UNDER_FORHANDLING
    assert tilstand.grunnlag.laast is False


@pytest.mark.parametrize(
    ("underkategori", "forventet"), [("EO", False), ("IRREG", True)]
)
def test_projeksjonen_folger_regelen(underkategori, forventet):
    sak = SakState(
        sak_id="S-1",
        sakstype=SaksType.STANDARD,
        grunnlag=GrunnlagTilstand(
            status=SporStatus.UNDER_FORHANDLING,
            hovedkategori="ENDRING",
            underkategori=underkategori,
            bh_resultat=GrunnlagResponsResultat.GODKJENT,
            grunnlag_varslet_i_tide=False,
        ),
        vederlag=VederlagTilstand(
            status=SporStatus.GODKJENT,
            bh_resultat=VederlagBeregningResultat.GODKJENT,
            godkjent_belop=100000,
        ),
    )
    assert sak.er_subsidiaert_vederlag is forventet
    assert sak.visningsstatus_vederlag.startswith("Prekludert") is forventet


def test_avslaget_staar_mens_te_oppdaterer_grunnlaget():
    """Byggherrens standpunkt gjelder til nytt svar; brev og fullmakt leser også `bh_resultat`."""
    sak = SakState(
        sak_id="S-1",
        sakstype=SaksType.STANDARD,
        grunnlag=GrunnlagTilstand(
            status=SporStatus.SENDT,
            hovedkategori="SVIKT",
            bh_resultat=GrunnlagResponsResultat.AVSLATT,
        ),
        vederlag=VederlagTilstand(
            status=SporStatus.GODKJENT,
            bh_resultat=VederlagBeregningResultat.GODKJENT,
            godkjent_belop=100000,
        ),
    )
    assert sak.er_subsidiaert_vederlag is True
