from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from models.events import (
    EventType,
    FristData,
    FristEvent,
    GrunnlagData,
    GrunnlagEvent,
    KonsekvensVarsler,
    VarselInfo,
    VederlagData,
    VederlagEvent,
    parse_event,
)
from services.business_rules import BusinessRuleValidator
from services.catenda_comment_generator import CatendaCommentGenerator
from services.timeline_service import TimelineService


def grunnlag(**varsler):
    return GrunnlagEvent(
        sak_id="NOTICE-1", aktor_id="TE", aktor_rolle="TE",
        tidsstempel=datetime(2026, 9, 6, 22, 30, tzinfo=UTC),
        data=GrunnlagData(tittel="Forsinket underlag", hovedkategori="SVIKT",
                          beskrivelse="Tegninger mangler", dato_oppdaget="2026-09-01",
                          varsler=KonsekvensVarsler(**varsler)),
    )


def test_separate_notices_survive_serialization_and_share_submission_timestamp():
    event = grunnlag(vederlag="Krever vederlag", rigg_drift="Rigg vil påløpe",
                     produktivitet="Forstyrrelser på annet arbeid", frist="Krever frist")
    restored = parse_event(event.model_dump(mode="json"))
    state = TimelineService().compute_state([restored])
    assert state.vederlag.metode is None
    assert state.vederlag.belop_direkte is None
    assert state.frist.krevd_dager is None
    assert state.frist.varsel_type == "varsel"
    notices = state.vederlag.varsler + state.frist.varsler
    assert len(notices) == 4
    assert {n.event_id for n in notices} == {event.event_id}
    assert {n.tidsstempel for n in notices} == {event.tidsstempel}
    assert state.vederlag.rigg_drift_varsel["dato_sendt"] == "2026-09-07"
    assert state.frist.frist_varsel.dato_sendt == "2026-09-07"
    comment = CatendaCommentGenerator().generate_comment(state, restored)
    for text in event.data.varsler.model_dump(exclude_none=True).values():
        assert text in comment


def test_unselected_notices_do_not_activate_other_tracks():
    state = TimelineService().compute_state([grunnlag(rigg_drift="Rigg vil påløpe")])
    assert state.vederlag.vederlag_varsel is None
    assert state.vederlag.produktivitetstap_varsel is None
    assert state.frist.frist_varsel is None
    assert state.frist.status == "utkast"
    empty = TimelineService().compute_state([grunnlag()])
    assert empty.vederlag.status == "utkast"
    assert empty.vederlag.varsler == []


def test_neutral_notices_do_not_assign_bh_a_calculation_response():
    from models.events import SporStatus
    state = TimelineService().compute_state([grunnlag(vederlag="Vederlag", frist="Frist")])
    state.grunnlag.status = SporStatus.GODKJENT
    assert state.neste_handling["rolle"] == "TE"
    assert state.overordnet_status == "UNDER_BEHANDLING"
    assert state.visningsstatus_vederlag == "Varslet – ikke spesifisert"
    assert state.visningsstatus_frist == "Varslet – ikke spesifisert"


def test_specification_preserves_original_notices_and_dates():
    basis = grunnlag(rigg_drift="Rigg vil påløpe", frist="Krever frist")
    later = datetime(2026, 9, 9, tzinfo=UTC)
    money = VederlagEvent(sak_id=basis.sak_id, aktor_id="TE", aktor_rolle="TE",
        tidsstempel=later, data=VederlagData(metode="ENHETSPRISER", belop_direkte=12000,
        begrunnelse="Beregnet krav", rigg_drift_varsel=VarselInfo(dato_sendt="2026-09-09")))
    days = FristEvent(sak_id=basis.sak_id, aktor_id="TE", aktor_rolle="TE",
        event_type=EventType.FRIST_KRAV_SPESIFISERT, tidsstempel=later,
        data=FristData(varsel_type="spesifisert", antall_dager=4, begrunnelse="Fire dager",
        frist_varsel=VarselInfo(dato_sendt="2026-09-09"),
        spesifisert_varsel=VarselInfo(dato_sendt="2026-09-09")))
    service = TimelineService()
    initial = service.compute_state([basis])
    assert BusinessRuleValidator().validate(days, initial).is_valid
    state = service.compute_state([basis, money, days])
    assert state.vederlag.belop_direkte == 12000
    assert state.frist.krevd_dager == 4
    assert state.vederlag.rigg_drift_varsel["dato_sendt"] == "2026-09-07"
    assert state.frist.frist_varsel.dato_sendt == "2026-09-07"
    assert len(state.vederlag.varsler) == len(state.frist.varsler) == 1


def test_later_notice_does_not_replace_existing_claim_or_its_response():
    basis = grunnlag()
    claim = VederlagEvent(sak_id=basis.sak_id, aktor_id="TE", aktor_rolle="TE",
        tidsstempel=datetime(2026, 9, 8, tzinfo=UTC),
        data=VederlagData(metode="ENHETSPRISER", belop_direkte=12000, begrunnelse="Beregnet"))
    notice = VederlagEvent(sak_id=basis.sak_id, aktor_id="TE", aktor_rolle="TE",
        tidsstempel=datetime(2026, 9, 9, tzinfo=UTC),
        data=VederlagData(varsel_type="varsel", begrunnelse="Nye riggkostnader",
                         varsler=KonsekvensVarsler(rigg_drift="Rigg vil påløpe")))
    service = TimelineService()
    before = service.compute_state([basis, claim])
    assert BusinessRuleValidator().validate(notice, before).is_valid
    after = service.compute_state([basis, claim, notice])
    assert after.vederlag.belop_direkte == before.vederlag.belop_direkte
    assert after.vederlag.antall_versjoner == before.vederlag.antall_versjoner
    assert len(after.vederlag.varsler) == 1


@pytest.mark.parametrize("data", [
    {"varsel_type": "varsel"},
    {"varsel_type": "varsel", "varsler": {"frist": "Frist"}},
    {"varsel_type": "varsel", "varsler": {"vederlag": "Vederlag"}, "belop_direkte": 0},
    {"varsel_type": "varsel", "varsler": {"vederlag": "   "}},
    {"varsel_type": "spesifisert"},
])
def test_invalid_notice_or_claim_rejected(data):
    with pytest.raises(ValidationError):
        VederlagData(begrunnelse="Begrunnelse", **data)


def test_force_majeure_allows_initial_and_later_compensation_notices():
    event = grunnlag(vederlag="Krever vederlag", rigg_drift="Rigg", produktivitet="Produktivitet", frist="Frist")
    event.data.hovedkategori = "FORCE_MAJEURE"
    from models.sak_state import SakState
    initial = SakState(sak_id=event.sak_id)
    validator = BusinessRuleValidator()
    assert validator.validate(event, initial).is_valid
    state = TimelineService().compute_state([event])
    assert len(state.vederlag.varsler) == 3
    assert len(state.frist.varsler) == 1
    later = VederlagEvent(sak_id=event.sak_id, aktor_id="TE", aktor_rolle="TE",
        data=VederlagData(varsel_type="varsel", begrunnelse="Annet ansvarsgrunnlag",
                         varsler=KonsekvensVarsler(vederlag="Krever vederlag")))
    assert validator.validate(later, state).is_valid


def test_pdf_contains_each_notice_and_can_be_generated():
    from services.reportlab_pdf_generator import ReportLabPdfGenerator
    event = grunnlag(vederlag="Vederlag for underlag", rigg_drift="Rigg & drift vil påløpe",
                     produktivitet="Forstyrrelser på annet arbeid", frist="Krever frist")
    state = TimelineService().compute_state([event])
    generator = ReportLabPdfGenerator()
    paragraphs = generator._build_vederlag_section(state) + generator._build_frist_section(state)
    text = " ".join(p.getPlainText() for p in paragraphs if hasattr(p, "getPlainText"))
    for notice in state.vederlag.varsler + state.frist.varsler:
        assert notice.tekst in text
    assert generator.generate_pdf(state).startswith(b"%PDF")
