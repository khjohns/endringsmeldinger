"""Executable audit findings for 93d630a; strict xfails are unresolved defects.

No external services. Real auth decorators, event parsing/rules, SQLite approval
transactions and JSON event persistence where relevant; providers are test doubles.
"""

import copy
import json
from types import SimpleNamespace

import pytest

from models.events import EOOpprettetData, EOOpprettetEvent, SakOpprettetEvent
from services.timeline_service import TimelineService
from tests.test_approval import test_eo_approval as eo_tests
from tests.test_approval.test_eo_approval import POLICY, order, run
from tests.test_routes import test_event_security as event_tests
from tests.test_routes.test_event_security import post
from tests.test_services import test_endringsordre_service as order_tests

# Reuse existing fixtures without copying their provider/storage test doubles.
eo_service = eo_tests.service
api = event_tests.api
environment = order_tests.environment


@pytest.mark.parametrize("batch", [False, True])
def test_eo_policy_blocks_generic_event_api(api, monkeypatch, batch):
    monkeypatch.setenv("BH_APPROVAL_POLICIES", json.dumps({"p": POLICY}))
    api.auth.contract_role.return_value = "BH"
    api.container.metadata_repository.get.return_value.catenda_topic_id = None
    initial = [
        SakOpprettetEvent(
            sak_id="case",
            aktor_id="BH",
            aktor_rolle="BH",
            sakstittel="EO",
            sakstype="endringsordre",
        ),
        EOOpprettetEvent(
            sak_id="case",
            aktor_id="BH",
            aktor_rolle="BH",
            data=EOOpprettetData(eo_nummer="EO-1", beskrivelse="EO"),
        ),
    ]
    api.container.event_repository.get_events.return_value = (
        [e.model_dump(mode="json") for e in initial],
        2,
    )
    api.container.event_repository.append_batch.return_value = 3
    api.container.event_repository.append.return_value = 3
    api.container.timeline_service = TimelineService()
    monkeypatch.setattr(
        "routes.vedlegg_routes.lever_vedlegg_for_hendelser", lambda *a: None
    )
    event = {
        "event_type": "eo_utstedt",
        "data": {
            "eo_nummer": "EO-1",
            "beskrivelse": "Without approval",
            "kompensasjon_belop": 9000000,
        },
    }
    response = post(
        api,
        {
            "sak_id": "case",
            "expected_version": 2,
            **({"events": [event]} if batch else {"event": event}),
        },
        batch=batch,
    )
    assert response.status_code == 403, response.get_json()
    api.container.event_repository.append_batch.assert_not_called()
    api.container.event_repository.append.assert_not_called()


def test_failed_issuance_requires_new_approval_after_authority_change(eo_service):
    create = eo_service.orders.opprett_endringsordresak.side_effect
    eo_service.orders.opprett_endringsordresak.side_effect = RuntimeError(
        "temporary failure"
    )
    p = run(eo_service, "submit", request=order())["packages"][-1]
    assert p["status"] == "utstedelse_feilet"
    policy = copy.deepcopy(POLICY)
    policy["handlers"][0]["role"] = "Uten fullmakt"
    eo_service.policy = policy
    eo_service.orders.opprett_endringsordresak.side_effect = create
    try:
        run(eo_service, "retry", packageId=p["id"])
    except (ValueError, PermissionError):
        pass
    assert not eo_service.created, (
        "Old self-approval still issues after authority is revoked"
    )


def test_absolute_end_date_without_days_is_not_self_approved(eo_service):
    p = run(
        eo_service,
        "submit",
        request=order(
            konsekvenser={},
            frist_dager=None,
            ny_sluttdato="2035-01-01",
        ),
    )["packages"][-1]
    assert p["steps"], (
        "Unknown time exposure should require approval, not self-issuance"
    )


@pytest.mark.xfail(
    strict=True, reason="AP-04: stale creation attempt deletes committed metadata"
)
def test_stale_reserved_id_attempt_cannot_delete_successful_creation(
    environment, monkeypatch
):
    from core.unit_of_work import TrackingUnitOfWork
    from services.sak_creation_service import SakCreationService

    env = environment
    service = env.service
    repo = service.metadata_repository
    repo.create.side_effect = lambda m: env.metadata.__setitem__(m.sak_id, m)
    repo.delete.side_effect = lambda sid: env.metadata.pop(sid, None) is not None
    container = SimpleNamespace(
        event_repository=service.event_repository, metadata_repository=repo
    )
    container.create_unit_of_work = lambda: TrackingUnitOfWork(container)
    monkeypatch.setattr("core.container.get_container", lambda: container)
    monkeypatch.setattr(
        "services.sak_creation_service.get_sak_creation_service", SakCreationService
    )
    args = dict(
        eo_nummer="EO-1",
        beskrivelse="EO",
        koe_sak_ids=[],
        sak_id="EO-reserved-audit",
        utstedt_av_id="BH",
    )
    get_events = service.event_repository.get_events
    intercepted = False

    def interleaved_read(sid, **kwargs):
        nonlocal intercepted
        result = get_events(sid, **kwargs)
        if sid == args["sak_id"] and result[1] == 0 and not intercepted:
            intercepted = True
            # Deterministic scheduling: old worker has read version 0, pauses;
            # replacement worker commits before the old worker inspects metadata.
            service.opprett_endringsordresak(**args)
        return result

    monkeypatch.setattr(service.event_repository, "get_events", interleaved_read)
    try:
        service.opprett_endringsordresak(**args)
    except (ValueError, RuntimeError):
        pass
    assert get_events(args["sak_id"])[1] == 3
    assert args["sak_id"] in env.metadata, (
        "Committed events survive but metadata is deleted"
    )
