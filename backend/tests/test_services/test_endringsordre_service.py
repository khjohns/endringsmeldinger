"""EO validation, project isolation and persisted event replay."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from models.events import (
    EOKoeHandlingData,
    EOKoeHandlingEvent,
    EventType,
    SakOpprettetEvent,
)
from models.sak_metadata import SakMetadata
from models.sak_state import (
    FristTilstand,
    GrunnlagTilstand,
    SakState,
    SporStatus,
    VederlagTilstand,
)
from repositories.event_repository import JsonFileEventRepository
from services.endringsordre_service import EndringsordreService
from services.timeline_service import TimelineService


def agreed_koe(sak_id="KOE-1", amount=120000, days=None):
    return SakState(
        sak_id=sak_id,
        sakstittel=f"Krav {sak_id}",
        grunnlag=GrunnlagTilstand(status=SporStatus.GODKJENT),
        vederlag=VederlagTilstand(
            status=SporStatus.GODKJENT if amount is not None else SporStatus.UTKAST,
            metode="FASTPRIS_TILBUD" if amount is not None else None,
            belop_direkte=amount,
            godkjent_belop=amount,
        ),
        frist=FristTilstand(
            status=SporStatus.GODKJENT if days is not None else SporStatus.UTKAST,
            krevd_dager=days,
            godkjent_dager=days,
        ),
    )


@pytest.fixture
def environment(tmp_path, monkeypatch):
    monkeypatch.setenv("EVENT_STORE_BACKEND", "json")
    events = JsonFileEventRepository(str(tmp_path / "events"))
    metadata = {}
    koe_states = {}
    repo = Mock()
    repo.get.side_effect = metadata.get
    # Intentionally return every project: service must enforce its own boundary too.
    repo.list_all.side_effect = lambda **kwargs: list(metadata.values())
    timeline = TimelineService()
    compute = Mock()
    compute.compute_state.side_effect = lambda items: koe_states.get(
        items[0].sak_id
    ) or timeline.compute_state(items)
    service = EndringsordreService(
        event_repository=events,
        timeline_service=compute,
        metadata_repository=repo,
        relation_repository=Mock(),
    )
    creation = Mock()

    def persist(*, metadata: SakMetadata, events: list):
        version = service.event_repository.append_batch(events, expected_version=0)
        repo_data[metadata.sak_id] = metadata
        return SimpleNamespace(success=True, error=None, version=version)

    repo_data = metadata
    creation.create_sak_with_metadata.side_effect = persist
    monkeypatch.setattr(
        "services.sak_creation_service.get_sak_creation_service", lambda: creation
    )

    def seed(state, project="oslobygg"):
        metadata[state.sak_id] = SakMetadata(
            sak_id=state.sak_id,
            prosjekt_id=project,
            created_at=datetime.now(UTC),
            created_by="seed",
            cached_title=state.sakstittel,
        )
        koe_states[state.sak_id] = state
        events.append(
            SakOpprettetEvent(
                sak_id=state.sak_id,
                event_type=EventType.SAK_OPPRETTET,
                aktor="seed",
                aktor_rolle="TE",
                sakstittel=state.sakstittel,
            ),
            expected_version=0,
        )

    return SimpleNamespace(
        service=service,
        creation=creation,
        events=events,
        metadata=metadata,
        seed=seed,
        timeline=timeline,
        repo=repo,
    )


def issue(env, **overrides):
    payload = dict(eo_nummer="EO-001", beskrivelse="Endret fundament", koe_sak_ids=[])
    payload.update(overrides)
    return env.service.opprett_endringsordresak(**payload)


@pytest.mark.parametrize(
    "method", ["FASTPRIS_TILBUD", "ENHETSPRISER", "REGNINGSARBEID"]
)
@pytest.mark.parametrize("amount,deduction", [(200000, 50000), (0, 10000), (0, 0)])
def test_money_and_deadline_survive_event_replay(
    environment, method, amount, deduction
):
    result = issue(
        environment,
        oppgjorsform=method,
        kompensasjon_belop=amount,
        fradrag_belop=deduction,
        er_estimat=True,
        frist_dager=0,
        ny_sluttdato="2027-01-25",
        utstedt_av="BH Saksbehandler",
    )
    state = environment.service._load_state(result["sak_id"])
    data = state.endringsordre_data
    assert data.kompensasjon_belop == amount
    assert data.fradrag_belop == deduction
    assert data.netto_belop == amount - deduction
    assert data.er_estimat is True
    assert data.frist_dager == 0
    assert data.ny_sluttdato == "2027-01-25"
    assert data.utstedt_av == "BH Saksbehandler"
    assert data.status == "utstedt"
    assert environment.metadata[result["sak_id"]].prosjekt_id == "oslobygg"


def test_direct_order_preserves_unresolved_consequences(environment):
    result = issue(environment, konsekvenser={"pris": True, "fremdrift": True})
    data = environment.service._load_state(result["sak_id"]).endringsordre_data
    assert data.konsekvenser.pris and data.konsekvenser.fremdrift
    assert data.kompensasjon_belop is None
    assert data.frist_dager is None
    assert data.ny_sluttdato is None
    assert data.relaterte_koe_saker == []


def test_two_orders_created_in_same_second_have_unique_ids(environment):
    first = issue(environment)
    second = issue(environment, eo_nummer="EO-002")
    assert first["sak_id"] != second["sak_id"]


@pytest.mark.parametrize(
    "changes",
    [
        {"eo_nummer": "   "},
        {"beskrivelse": "   "},
        {"beskrivelse": 1},
        {"koe_sak_ids": "KOE-1"},
        {"koe_sak_ids": [None]},
        {"koe_sak_ids": ["KOE-1", "KOE-1"]},
        {"kompensasjon_belop": -1},
        {"kompensasjon_belop": float("inf")},
        {"kompensasjon_belop": float("nan")},
        {"kompensasjon_belop": "10"},
        {"fradrag_belop": True},
        {"fradrag_belop": -1},
        {"frist_dager": -1},
        {"frist_dager": 1.5},
        {"frist_dager": True},
        {"ny_sluttdato": "2026-02-30"},
        {"ny_sluttdato": "20260101"},
        {"oppgjorsform": "ukjent"},
        {"er_estimat": "false"},
        {"konsekvenser": []},
        {"konsekvenser": {"pris": "false"}},
        {"kompensasjon_belop": 100},
    ],
)
def test_invalid_input_fails_before_any_write(environment, changes):
    with pytest.raises(ValueError):
        issue(environment, **changes)
    environment.creation.create_sak_with_metadata.assert_not_called()
    assert environment.metadata == {}


def test_formalizes_multiple_agreed_cases_and_removes_them_from_candidates(environment):
    environment.seed(agreed_koe("KOE-1", amount=120000))
    environment.seed(agreed_koe("KOE-2", amount=None, days=7))
    candidates = environment.service.hent_kandidat_koe_saker()
    assert len(candidates) == 2
    assert candidates[0]["har_vederlagskrav"] is True
    assert candidates[0]["har_fristkrav"] is False
    assert candidates[1]["har_fristkrav"] is True
    result = issue(
        environment,
        koe_sak_ids=["KOE-1", "KOE-2"],
        oppgjorsform="FASTPRIS_TILBUD",
        kompensasjon_belop=120000,
        frist_dager=7,
    )
    assert environment.service.hent_kandidat_koe_saker() == []
    context = environment.service.hent_komplett_eo_kontekst(
        result["sak_id"], tillatte_saker=set
    )
    assert set(context["sak_states"]) == {"KOE-1", "KOE-2"}
    assert context["oppsummering"]["antall_koe_saker"] == 2
    assert context["oppsummering"]["total_godkjent_vederlag"] == 120000
    assert (
        environment.service.finn_eoer_for_koe("KOE-1")[0]["eo_sak_id"]
        == result["sak_id"]
    )
    # Even a missing relation projection must not allow reusing a KOE.
    environment.service.relation_repository.get_containers_for_sak.return_value = []
    with pytest.raises(ValueError, match="allerede"):
        issue(
            environment,
            eo_nummer="EO-002",
            koe_sak_ids=["KOE-1"],
            oppgjorsform="FASTPRIS_TILBUD",
            kompensasjon_belop=120000,
        )
    assert environment.creation.create_sak_with_metadata.call_count == 1


@pytest.mark.parametrize(
    "claim", ["missing", "disputed", "ground_only", "other_project"]
)
def test_ineligible_koe_rejected_and_hidden(environment, claim):
    if claim != "missing":
        state = agreed_koe()
        if claim == "disputed":
            state.vederlag.status = SporStatus.UNDER_BEHANDLING
        if claim == "ground_only":
            state = agreed_koe(amount=None)
        environment.seed(
            state, project="another-project" if claim == "other_project" else "oslobygg"
        )
    assert environment.service.hent_kandidat_koe_saker() == []
    with pytest.raises(ValueError, match="omforente"):
        issue(
            environment,
            koe_sak_ids=["KOE-1"],
            oppgjorsform="FASTPRIS_TILBUD",
            kompensasjon_belop=120000,
        )
    environment.creation.create_sak_with_metadata.assert_not_called()


@pytest.mark.parametrize(
    "overrides,reason",
    [
        ({}, "beløp"),
        ({"kompensasjon_belop": 120000, "oppgjorsform": "FASTPRIS_TILBUD"}, "frist"),
        ({"er_estimat": True}, "estimat"),
    ],
)
def test_formalization_requires_settled_consequences(environment, overrides, reason):
    environment.seed(agreed_koe(days=7))
    with pytest.raises(ValueError, match=reason):
        issue(environment, koe_sak_ids=["KOE-1"], **overrides)
    environment.creation.create_sak_with_metadata.assert_not_called()


def test_formalization_rejects_outdated_agreed_amount(environment):
    environment.seed(agreed_koe())
    with pytest.raises(ValueError, match="gjeldende enighet"):
        issue(
            environment,
            koe_sak_ids=["KOE-1"],
            oppgjorsform="FASTPRIS_TILBUD",
            kompensasjon_belop=119999,
        )
    environment.creation.create_sak_with_metadata.assert_not_called()


def test_formalization_compares_net_amount_in_cents(environment):
    environment.seed(agreed_koe(amount=0.1))
    environment.seed(agreed_koe("KOE-2", amount=0.2))
    result = issue(
        environment,
        koe_sak_ids=["KOE-1", "KOE-2"],
        oppgjorsform="FASTPRIS_TILBUD",
        kompensasjon_belop=100.3,
        fradrag_belop=100,
    )
    assert result["sak_id"] in environment.metadata


def test_duplicate_number_rejected_and_next_number_follows_highest(environment):
    issue(environment, eo_nummer="EO-009")
    assert environment.service.hent_neste_eo_nummer() == {
        "neste_nummer": "EO-010",
        "antall_eksisterende": 1,
    }
    with pytest.raises(ValueError, match="nummeret"):
        issue(environment, eo_nummer=" eo-009 ")


def test_issued_order_cannot_be_changed_via_legacy_relation_routes(environment):
    environment.seed(agreed_koe())
    result = issue(environment)
    for action in (environment.service.legg_til_koe, environment.service.fjern_koe):
        with pytest.raises(ValueError, match="utstedt"):
            action(result["sak_id"], "KOE-1")
    _, version = environment.events.get_events(result["sak_id"])
    assert version == 3


def test_context_does_not_return_foreign_project_links(environment):
    environment.seed(agreed_koe("OTHER"), project="another-project")
    result = issue(environment)
    environment.events.append(
        EOKoeHandlingEvent(
            sak_id=result["sak_id"],
            event_type=EventType.EO_KOE_LAGT_TIL,
            aktor="legacy",
            aktor_rolle="BH",
            data=EOKoeHandlingData(koe_sak_id="OTHER"),
        ),
        expected_version=3,
    )
    context = environment.service.hent_komplett_eo_kontekst(
        result["sak_id"], tillatte_saker=set
    )
    assert context["relaterte_saker"] == []
    assert context["sak_states"] == {}
    with pytest.raises(ValueError, match="prosjektet"):
        environment.service.finn_eoer_for_koe("OTHER")


def test_backlink_lookup_failure_is_not_an_empty_success(environment):
    environment.seed(agreed_koe())
    environment.repo.list_all.side_effect = RuntimeError("unavailable")
    with pytest.raises(RuntimeError, match="unavailable"):
        environment.service.finn_eoer_for_koe("KOE-1")


@pytest.fixture
def catenda_sync(environment, monkeypatch):
    from core.config import settings

    monkeypatch.setattr(settings, "catenda_enabled", "true")
    monkeypatch.setattr(settings, "catenda_project_registry_backend", "legacy")
    monkeypatch.setattr(settings, "catenda_project_id", "catenda-project")
    monkeypatch.setattr(settings, "catenda_topic_board_id", "correct-board")
    client = Mock()
    client.topic_board_id = "changed-by-another-service"
    client.create_topic.return_value = {"guid": "new-topic-guid"}
    client.create_topic_relations.return_value = True
    environment.service.client = client

    def save_mapping(*, sak_id, prosjekt_id, topic_id, board_id, catenda_project_id):
        metadata = environment.metadata[sak_id]
        assert metadata.prosjekt_id == prosjekt_id
        metadata.catenda_topic_id = topic_id
        metadata.catenda_board_id = board_id
        metadata.catenda_project_id = catenda_project_id

    environment.repo.set_catenda_mapping.side_effect = save_mapping
    return client


def test_catenda_sync_maps_local_ids_and_persists_new_topic(environment, catenda_sync):
    environment.seed(agreed_koe())
    metadata = environment.metadata["KOE-1"]
    metadata.catenda_project_id = "catenda-project"
    metadata.catenda_board_id = "correct-board"
    metadata.catenda_topic_id = "koe-topic-guid"
    result = issue(
        environment,
        koe_sak_ids=["KOE-1"],
        oppgjorsform="FASTPRIS_TILBUD",
        kompensasjon_belop=120000,
    )
    assert result["catenda_sync_status"] == "synced"
    assert environment.metadata[result["sak_id"]].catenda_topic_id == "new-topic-guid"
    catenda_sync.create_topic_relations.assert_any_call(
        topic_id="new-topic-guid", related_topic_guids=["koe-topic-guid"]
    )
    catenda_sync.create_topic_relations.assert_any_call(
        topic_id="koe-topic-guid", related_topic_guids=["new-topic-guid"]
    )
    assert catenda_sync.topic_board_id == "changed-by-another-service"


def test_catenda_does_not_send_unmapped_local_koe_ids(environment, catenda_sync):
    environment.seed(agreed_koe())
    result = issue(
        environment,
        koe_sak_ids=["KOE-1"],
        oppgjorsform="FASTPRIS_TILBUD",
        kompensasjon_belop=120000,
    )
    assert result["catenda_sync_status"] == "not_configured"
    catenda_sync.create_topic.assert_not_called()
    assert result["sak_id"] in environment.metadata


def test_catenda_skips_unsupported_outbound_project(
    environment, catenda_sync, monkeypatch
):
    monkeypatch.setattr(
        "services.endringsordre_service.get_project_id", lambda: "another-project"
    )
    result = issue(environment)
    assert result["catenda_sync_status"] == "not_configured"
    catenda_sync.create_topic.assert_not_called()


def test_catenda_relation_failure_keeps_local_order_and_saved_mapping(
    environment, catenda_sync
):
    environment.seed(agreed_koe())
    metadata = environment.metadata["KOE-1"]
    metadata.catenda_project_id = "catenda-project"
    metadata.catenda_board_id = "correct-board"
    metadata.catenda_topic_id = "koe-topic-guid"
    catenda_sync.create_topic_relations.return_value = False
    result = issue(
        environment,
        koe_sak_ids=["KOE-1"],
        oppgjorsform="FASTPRIS_TILBUD",
        kompensasjon_belop=120000,
    )
    assert result["catenda_sync_status"] == "failed"
    assert result["catenda_synced"] is False
    assert environment.metadata[result["sak_id"]].catenda_topic_id == "new-topic-guid"
    assert (
        environment.service._load_state(result["sak_id"]).endringsordre_data.status
        == "utstedt"
    )


def test_reserved_case_id_is_used_once_and_orphan_metadata_is_replaced(environment):
    reserved = "EO-20260916-reservert01"
    # An interrupted creation left metadata without events under the reserved ID.
    environment.metadata[reserved] = SakMetadata(
        sak_id=reserved,
        prosjekt_id="oslobygg",
        created_at=datetime.now(UTC),
        created_by="avbrutt",
    )
    environment.repo.delete.side_effect = lambda sak_id: environment.metadata.pop(
        sak_id
    )
    assert issue(environment, sak_id=reserved)["sak_id"] == reserved
    environment.repo.delete.assert_called_once_with(reserved)
    assert environment.events.get_events(reserved)[1] == 3
    with pytest.raises(ValueError, match="allerede utstedt"):
        issue(environment, eo_nummer="EO-002", sak_id=reserved)
    assert environment.events.get_events(reserved)[1] == 3
