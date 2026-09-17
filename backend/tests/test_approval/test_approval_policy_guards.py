"""Cross-route regressions for AP-01, AP-02, AP-03 and AP-05."""

import copy
import json
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest

from repositories.event_repository import ConcurrencyError
from routes.endringsordre_routes import endringsordre_bp
from services.approval_policy import authority_policy
from services.eo_approval_service import order_exposure
from tests.test_approval import test_approval_routes as approval_tests
from tests.test_approval import test_eo_approval as eo_tests
from tests.test_approval.test_eo_approval import HANDLER, POLICY, order, run
from tests.test_routes import test_endringsordre_routes as eo_route_tests
from tests.test_routes import test_event_security as event_tests

event_api = event_tests.api
eo_api = eo_route_tests.api
approval_api = approval_tests.api
eo_service = eo_tests.service


@pytest.mark.parametrize(
    "location,batch", [("nested", False), ("nested", True), ("envelope", True)]
)
def test_alternative_case_type_representations_cannot_create_eo(
    event_api, monkeypatch, location, batch
):
    monkeypatch.setenv("BH_APPROVAL_POLICIES", json.dumps({"p": POLICY}))
    event_api.auth.contract_role.return_value = "BH"
    event = {"event_type": "sak_opprettet", "sakstittel": "EO"}
    body = {
        "sak_id": "case",
        "expected_version": 0,
        **({"events": [event]} if batch else {"event": event}),
    }
    if location == "nested":
        event["data"] = {"sakstype": "endringsordre"}
    else:
        body["sakstype"] = "endringsordre"
    response = event_tests.post(event_api, body, batch=batch)
    assert response.status_code == 403, response.json
    assert response.json["error"] == "APPROVAL_REQUIRED"
    event_api.container.event_repository.append_batch.assert_not_called()
    event_api.container.event_repository.append.assert_not_called()


@pytest.mark.parametrize(
    "method,url,service_method",
    [
        ("POST", "/api/endringsordre/case/koe", "legg_til_koe"),
        ("DELETE", "/api/endringsordre/case/koe/koe", "fjern_koe"),
    ],
)
def test_other_projects_policy_does_not_block_direct_relation_changes(
    eo_api, monkeypatch, method, url, service_method
):
    monkeypatch.setenv("BH_APPROVAL_POLICIES", json.dumps({"other-project": POLICY}))
    operation = getattr(eo_api.service, service_method)
    operation.return_value = {"catenda_synced": False}
    result = eo_api.client.open(
        url,
        method=method,
        json={"koe_sak_id": "koe"},
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )
    assert result.status_code == 200, result.json
    operation.assert_called_once()


def test_explicit_rate_needs_no_project_repository_initialization():
    factory = Mock(side_effect=RuntimeError("Project database unavailable"))
    for rate in (None, 15000):
        assert (
            authority_policy({"daily_rate": rate}, "p", factory)["daily_rate"] == rate
        )
    factory.assert_not_called()


@pytest.mark.parametrize("batch", [False, True])
@pytest.mark.parametrize(
    "kind",
    [
        "eo_opprettet",
        "eo_utstedt",
        "eo_revidert",
        "eo_koe_lagt_til",
        "eo_koe_fjernet",
        "sak_opprettet",
    ],
)
def test_public_eo_mutations_require_approval(event_api, monkeypatch, batch, kind):
    monkeypatch.setenv("BH_APPROVAL_POLICIES", json.dumps({"p": POLICY}))
    event_api.auth.contract_role.return_value = "BH"
    event = {
        "event_type": kind,
        "sakstype": "endringsordre",
        "data": {
            "eo_nummer": "EO-1",
            "beskrivelse": "Change",
            "koe_sak_id": "koe",
        },
    }
    result = event_tests.post(
        event_api,
        {
            "sak_id": "case",
            "expected_version": 1,
            **({"events": [event]} if batch else {"event": event}),
        },
        batch=batch,
    )
    assert result.status_code == 403, result.json
    assert result.json["error"] == "APPROVAL_REQUIRED"
    event_api.container.event_repository.append.assert_not_called()
    event_api.container.event_repository.append_batch.assert_not_called()


@pytest.mark.parametrize(
    "method,url",
    [
        ("POST", "/api/endringsordre/case/koe"),
        ("DELETE", "/api/endringsordre/case/koe/koe"),
    ],
)
def test_direct_relation_changes_cannot_change_approved_content(
    eo_api, monkeypatch, method, url
):
    monkeypatch.setenv("BH_APPROVAL_POLICIES", json.dumps({"p": POLICY}))
    result = eo_api.client.open(
        url,
        method=method,
        json={"koe_sak_id": "koe"},
        headers={"X-Project-ID": "p", "X-CSRF-Token": "csrf"},
    )
    assert result.status_code == 403
    assert result.json["error"] == "APPROVAL_REQUIRED"
    eo_api.service.legg_til_koe.assert_not_called()
    eo_api.service.fjern_koe.assert_not_called()


@pytest.mark.parametrize("batch", [False, True])
@pytest.mark.parametrize("kind", ["eo_akseptert", "eo_bestridt"])
def test_te_decisions_are_not_blocked_by_bh_approval_policy(
    event_api, monkeypatch, batch, kind
):
    monkeypatch.setenv("BH_APPROVAL_POLICIES", json.dumps({"p": POLICY}))
    event_api.auth.contract_role.return_value = "TE"
    event = {"event_type": kind, "data": {"begrunnelse": "TEs beslutning"}}
    result = event_tests.post(
        event_api,
        {
            "sak_id": "case",
            "expected_version": 1,
            **({"events": [event]} if batch else {"event": event}),
        },
        batch=batch,
    )
    # Fixture's actual version is 7: reaching the optimistic concurrency guard
    # verifies that real auth/parsing permitted TE rather than rejecting policy.
    assert result.status_code == 409, result.json


@pytest.mark.parametrize("change", ["sender", "chain", "rate", "removed_sender"])
def test_background_issuance_rechecks_policy_and_persists_return(
    eo_service, monkeypatch, change
):
    original_issue = eo_service.issue
    monkeypatch.setattr(eo_service, "issue", lambda *args: None)
    p = run(
        eo_service, "submit", request=order(kompensasjon_belop=100000, frist_dager=1)
    )["packages"][-1]
    assert p["status"] == "godkjent"
    policy = copy.deepcopy(POLICY)
    if change == "sender":
        policy["handlers"][0]["role"] = "Uten fullmakt"
    elif change == "chain":
        policy["chain"] = policy["chain"][1:]
    elif change == "rate":
        policy["daily_rate"] = 200000
    else:
        policy["handlers"] = []
    eo_service.policy = policy
    original_issue("p1", p["id"])
    current = eo_service.read("p1", HANDLER)
    assert current["packages"][-1]["status"] == "returnert"
    assert eo_service.read("p1", HANDLER)["version"] == current["version"]
    eo_service.orders.opprett_endringsordresak.assert_not_called()


def test_policy_return_survives_conflicting_command_without_prior_get(
    eo_service, monkeypatch
):
    monkeypatch.setattr(eo_service, "issue", lambda *args: None)
    state = run(eo_service, "submit", request=order())
    p = state["packages"][-1]
    eo_service.policy = {**POLICY, "chain": POLICY["chain"][1:]}
    with pytest.raises(ConcurrencyError):
        eo_service.command(
            "p1",
            HANDLER,
            {
                "action": "retry",
                "packageId": p["id"],
                "expectedVersion": state["version"],
                "commandId": str(uuid4()),
            },
            "Kari",
        )
    # Inspect storage directly: GET must not be responsible for persisting return.
    with eo_service.transaction("p1") as stored:
        assert stored["packages"][-1]["status"] == "returnert"
        assert stored["audit"][-1]["action"] == "policy_return"


def test_committed_order_is_recovered_even_after_policy_change(eo_service, monkeypatch):
    monkeypatch.setattr(eo_service, "issue", lambda *args: None)
    p = run(eo_service, "submit", request=order())["packages"][-1]
    eo_service.created.add(p["sakId"])
    eo_service.policy = {"handlers": [], "chain": []}
    current = eo_service.read("p1", HANDLER)["packages"][-1]
    assert current["status"] == "utstedt"
    assert current["recovered"] is True
    eo_service.orders.opprett_endringsordresak.assert_not_called()


@pytest.mark.parametrize("days", [None, 0, 7])
@pytest.mark.parametrize("flag", [False, True])
def test_absolute_date_cannot_be_overridden_by_client_days_or_flags(days, flag):
    assert (
        order_exposure(
            order(
                ny_sluttdato="2035-01-01",
                frist_dager=days,
                konsekvenser={"fremdrift": flag},
            ),
            10000,
        )
        is None
    )


@pytest.mark.parametrize(
    "fields",
    [
        {"ny_sluttdato": "2035-02-30"},
        {"ny_sluttdato": "20350101"},
        {"ny_sluttdato": 20350101},
        {"frist_dager": -1},
        {"frist_dager": 1.5},
        {"frist_dager": True},
        {"frist_dager": "0"},
    ],
)
def test_invalid_time_basis_is_rejected_before_package_is_stored(eo_service, fields):
    with pytest.raises(ValueError):
        run(eo_service, "submit", request=order(**fields))
    assert eo_service.read("p1", HANDLER)["packages"] == []
    eo_service.orders.opprett_endringsordresak.assert_not_called()


def test_both_approval_routes_resolve_same_project_rate_and_override(
    approval_api, monkeypatch
):
    client, container = approval_api
    client.application.register_blueprint(endringsordre_bp)
    monkeypatch.setattr("routes.endringsordre_routes._get_container", lambda: container)
    monkeypatch.setattr(
        "routes.endringsordre_routes._get_endringsordre_service", Mock()
    )
    container.project_repository = Mock()
    container.project_repository.get.return_value = SimpleNamespace(
        settings={"contract": {"dagmulkt_sats": 12000}}
    )
    urls = ["/api/cases/c1/approvals", "/api/endringsordre/godkjenninger"]
    for url in urls:
        response = client.get(url)
        assert response.status_code == 200, response.json
        assert response.json["dailyRate"] == 12000
    assert container.project_repository.get.call_count == 2
    assert all(
        c.args == ("p1",) for c in container.project_repository.get.call_args_list
    )
    for override in (15000, None):
        monkeypatch.setenv(
            "BH_APPROVAL_POLICIES",
            json.dumps(
                {
                    "p1": {
                        "handlers": ["test@example.com"],
                        "chain": [],
                        "daily_rate": override,
                    }
                }
            ),
        )
        for url in urls:
            response = client.get(url)
            assert response.status_code == 200, response.json
            assert response.json["dailyRate"] == override
    assert container.project_repository.get.call_count == 2
