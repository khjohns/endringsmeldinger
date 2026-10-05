"""Godtatt avslag på grunnlaget lukker saken (vedtak 05.10, #213), og
`eo_opprettet` krever en endringsordresak (DM-07, #97)."""

import pytest

from models.events import (
    EOOpprettetData,
    EOOpprettetEvent,
    FristData,
    FristEvent,
    SporType,
)
from models.sak_state import (
    FristTilstand,
    GrunnlagTilstand,
    SakState,
    SaksType,
    SporStatus,
    VederlagTilstand,
)
from services.business_rules import BusinessRuleValidator
from services.catenda_comment_generator import CatendaCommentGenerator
from services.catenda_service import map_status_to_catenda


def _sak(vederlag: SporStatus, frist: SporStatus) -> SakState:
    return SakState(
        sak_id="S-1",
        sakstype=SaksType.STANDARD,
        grunnlag=GrunnlagTilstand(status=SporStatus.AVSLATT_AKSEPTERT),
        vederlag=VederlagTilstand(status=vederlag),
        frist=FristTilstand(status=frist),
    )


@pytest.mark.parametrize(
    "vederlag, frist",
    [
        (SporStatus.GODKJENT, SporStatus.GODKJENT),
        (SporStatus.GODKJENT, SporStatus.IKKE_RELEVANT),
        (SporStatus.IKKE_RELEVANT, SporStatus.GODKJENT),
        (SporStatus.GODKJENT, SporStatus.AVSLATT),
        (SporStatus.SENDT, SporStatus.UNDER_BEHANDLING),
        (SporStatus.TRUKKET, SporStatus.AVSLATT_AKSEPTERT),
        (SporStatus.UTKAST, SporStatus.UTKAST),
    ],
)
def test_godtatt_avslag_paa_grunnlaget_lukker_saken(vederlag, frist):
    sak = _sak(vederlag, frist)

    assert sak.overordnet_status == "LUKKET_AVSLATT"
    assert sak.kan_utstede_eo is False


def test_lukket_avslatt_avviser_nye_krav():
    sak = _sak(SporStatus.GODKJENT, SporStatus.IKKE_RELEVANT)
    krav = FristEvent(
        sak_id="S-1",
        aktor_id="te",
        aktor_rolle="TE",
        event_type="frist_krav_sendt",
        spor=SporType.FRIST,
        data=FristData(krevd_dager=10, begrunnelse="Krav"),
    )

    resultat = BusinessRuleValidator().validate(krav, sak)

    assert not resultat.is_valid
    assert resultat.violated_rule == "CASE_NOT_CLOSED"


def test_lukket_avslatt_vises_som_lukket_i_catenda():
    assert map_status_to_catenda("LUKKET_AVSLATT") == "Lukket"
    assert (
        CatendaCommentGenerator()._format_overordnet_status("LUKKET_AVSLATT")
        == "Avsluttet – avslag godtatt"
    )


def _eo_opprettet() -> EOOpprettetEvent:
    return EOOpprettetEvent(
        sak_id="S-1",
        aktor_id="bh",
        aktor_rolle="BH",
        data=EOOpprettetData(eo_nummer="EO-1", beskrivelse="Endring"),
    )


def test_eo_opprettet_avvises_i_en_koe_sak():
    sak = SakState(sak_id="S-1", sakstype=SaksType.STANDARD)

    resultat = BusinessRuleValidator().validate(_eo_opprettet(), sak)

    assert not resultat.is_valid
    assert resultat.violated_rule == "IS_EO_CASE"


def test_eo_opprettet_godtas_i_en_endringsordresak():
    sak = SakState(sak_id="S-1", sakstype=SaksType.ENDRINGSORDRE)

    assert BusinessRuleValidator().validate(_eo_opprettet(), sak).is_valid
