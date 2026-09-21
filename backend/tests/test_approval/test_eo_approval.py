"""Change orders above the handler's authority are issued only after the derived route approves."""

import json
from unittest.mock import Mock
from uuid import uuid4

import pytest

from repositories.event_repository import ConcurrencyError
from services.eo_approval_service import EOApprovalService, order_exposure

HANDLER = "pl@example.test"
POLICY = {
    "handlers": [{"id": HANDLER, "name": "Kari", "role": "Prosjektleder"}],
    "chain": [
        {"id": "pd@example.test", "name": "Ola", "role": "Prosjektdirektør"},
        {"id": "al@example.test", "name": "Anne", "role": "Avdelingsleder"},
    ],
    "daily_rate": 10000,
}


def order(**overrides):
    return {
        "eo_nummer": "EO-001",
        "beskrivelse": "Endring av fundament",
        "koe_sak_ids": [],
        "konsekvenser": {"pris": True, "fremdrift": False},
        "oppgjorsform": "ENHETSPRISER",
        "kompensasjon_belop": 150000,
        "fradrag_belop": 0,
        **overrides,
    }


@pytest.fixture
def service(tmp_path):
    created = set()

    def create(**kwargs):
        # Metadata and events are created atomically under the reserved ID.
        if kwargs["sak_id"] in created:
            raise RuntimeError("Versjonskonflikt")
        created.add(kwargs["sak_id"])
        return {"sak_id": kwargs["sak_id"], "catenda_synced": False}

    orders = Mock()
    orders.opprett_endringsordresak.side_effect = create
    result = EOApprovalService(
        tmp_path / "approval.sqlite", orders, POLICY, issued=created.__contains__
    )
    result.created = created
    return result


def run(service, action, actor=HANDLER, **body):
    version = service.read("p1", actor)["version"]
    return service.command(
        "p1",
        actor,
        {
            "action": action,
            "commandId": str(uuid4()),
            "expectedVersion": version,
            **body,
        },
        "Kari",
    )


def test_exposure_uses_larger_side_adds_days_and_flags_unresolved():
    assert order_exposure(order(kompensasjon_belop=100, fradrag_belop=300)) == 300
    assert (
        order_exposure(order(konsekvenser={"fremdrift": True}, frist_dager=2), 10)
        == 150020
    )
    assert order_exposure(order(kompensasjon_belop=None, fradrag_belop=None)) is None
    assert (
        order_exposure(order(konsekvenser={"fremdrift": True}, frist_dager=None))
        is None
    )
    assert order_exposure(order(konsekvenser={}, frist_dager=3)) is None


def test_known_amount_still_binds_when_time_exposure_is_unresolved():
    """Unknown total never makes the route weaker than the agreed amount already does."""
    from services.eo_approval_service import order_exposure_floor

    assert order_exposure_floor(order(kompensasjon_belop=100, fradrag_belop=300)) == 300
    assert order_exposure_floor(order(kompensasjon_belop=None, fradrag_belop=None)) == 0
    over_all = order(kompensasjon_belop=50_000_000, ny_sluttdato="2030-01-01")
    assert order_exposure(over_all) is None
    assert order_exposure_floor(over_all) == 50_000_000


@pytest.mark.parametrize(
    "unresolved",
    [
        {"ny_sluttdato": "2030-01-01"},
        {"konsekvenser": {"pris": True, "fremdrift": True}, "frist_dager": None},
        {"konsekvenser": {"pris": True, "fremdrift": True}, "frist_dager": 5},
    ],
)
def test_amount_over_all_authority_is_refused_even_when_exposure_is_unresolved(
    service, unresolved
):
    request = order(kompensasjon_belop=50_000_000, **unresolved)
    if "frist_dager" in unresolved and unresolved["frist_dager"]:
        service.policy = {**POLICY, "daily_rate": None}
    with pytest.raises(ValueError, match="fullmakt"):
        run(service, "submit", request=request)
    assert service.read("p1", HANDLER)["packages"] == []


def test_unresolved_exposure_within_the_chain_still_requires_everyone(service):
    state = run(
        service, "submit", request=order(ny_sluttdato="2030-01-01", frist_dager=None)
    )
    package = state["packages"][-1]
    assert [step["id"] for step in package["steps"]] == [
        "pd@example.test",
        "al@example.test",
    ]
    assert package["authority"]["amount"] is None
    assert package["authority"]["minimum"] == "150000"


def test_inside_authority_issues_immediately(service):
    state = run(service, "submit", request=order())
    package = state["packages"][-1]
    assert package["steps"] == []
    assert package["status"] == "utstedt"
    assert package["sakId"] in service.created
    # Journalen føres på identiteten til den som utstedte, ikke navnet (MS-04).
    assert (
        service.orders.opprett_endringsordresak.call_args.kwargs["utstedt_av_id"]
        == HANDLER
    )


def test_sequential_route_issues_after_decider(service):
    state = run(service, "submit", request=order(kompensasjon_belop=2930000))
    package = state["packages"][-1]
    assert [s["id"] for s in package["steps"]] == ["pd@example.test", "al@example.test"]
    with pytest.raises(PermissionError):
        run(service, "approve", "al@example.test", packageId=package["id"])
    run(service, "approve", "pd@example.test", packageId=package["id"])
    service.orders.opprett_endringsordresak.assert_not_called()
    state = run(service, "approve", "al@example.test", packageId=package["id"])
    assert state["packages"][-1]["status"] == "utstedt"
    service.orders.opprett_endringsordresak.assert_called_once()


def test_exceeding_all_authority_is_refused(service):
    with pytest.raises(ValueError, match="fullmakt"):
        run(service, "submit", request=order(kompensasjon_belop=3000001))


def test_return_withdraw_and_failed_issuance_retry(service):
    package = run(service, "submit", request=order(kompensasjon_belop=400000))[
        "packages"
    ][-1]
    with pytest.raises(ValueError, match="begrunnelse"):
        run(service, "return", "pd@example.test", packageId=package["id"])
    returned = run(
        service,
        "return",
        "pd@example.test",
        packageId=package["id"],
        comment="Presiser",
    )
    assert returned["packages"][-1]["status"] == "returnert"
    again = run(service, "submit", request=order(kompensasjon_belop=400000))[
        "packages"
    ][-1]
    assert (
        run(service, "withdraw", packageId=again["id"])["packages"][-1]["status"]
        == "trukket"
    )
    third = run(service, "submit", request=order(kompensasjon_belop=400000))[
        "packages"
    ][-1]
    create = service.orders.opprett_endringsordresak.side_effect
    service.orders.opprett_endringsordresak.side_effect = ValueError(
        "EO-001 finnes allerede"
    )
    failed = run(service, "approve", "pd@example.test", packageId=third["id"])[
        "packages"
    ][-1]
    assert failed["status"] == "utstedelse_feilet"
    assert "finnes" in failed["error"]
    service.orders.opprett_endringsordresak.side_effect = create
    assert (
        run(service, "retry", packageId=third["id"])["packages"][-1]["status"]
        == "utstedt"
    )


def test_packages_are_private_to_owner_and_route(service):
    run(service, "submit", request=order(kompensasjon_belop=400000))
    assert len(service.read("p1", "pd@example.test")["packages"]) == 1
    assert service.read("p1", "al@example.test")["packages"] == []


def test_duplicate_open_number_and_stale_version(service):
    run(service, "submit", request=order(kompensasjon_belop=400000))
    with pytest.raises(ValueError, match="allerede"):
        run(service, "submit", request=order(kompensasjon_belop=400000))
    with pytest.raises(ConcurrencyError):
        service.command(
            "p1",
            HANDLER,
            {
                "action": "submit",
                "commandId": "x",
                "expectedVersion": 0,
                "request": order(),
            },
            "Kari",
        )


def test_policy_change_returns_open_package(service):
    package = run(service, "submit", request=order(kompensasjon_belop=400000))[
        "packages"
    ][-1]
    service.policy = {**POLICY, "chain": POLICY["chain"][1:]}
    assert service.read("p1", HANDLER)["packages"][-1]["status"] == "returnert"
    assert package["status"] == "til_godkjenning"


def test_direct_issuance_is_blocked_when_policy_exists(monkeypatch, tmp_path):
    from flask import Flask, g

    from routes.endringsordre_routes import endringsordre_bp

    app = Flask(__name__)
    app.testing = True
    app.register_blueprint(endringsordre_bp)
    app.before_request(lambda: setattr(g, "project_id", "p1"))
    monkeypatch.setenv("DISABLE_AUTH", "true")
    monkeypatch.setenv("BH_APPROVAL_DB", str(tmp_path / "approval.sqlite"))
    monkeypatch.setenv("BH_APPROVAL_POLICIES", json.dumps({"p1": POLICY}))
    orders = Mock()
    monkeypatch.setattr(
        "routes.endringsordre_routes._get_endringsordre_service", lambda: orders
    )
    client = app.test_client()
    response = client.post("/api/endringsordre/opprett", json=order())
    assert response.status_code == 403
    orders.opprett_endringsordresak.assert_not_called()


def test_crash_after_creation_is_recovered_without_a_second_order(service):
    create = service.orders.opprett_endringsordresak.side_effect

    def create_then_crash(**kwargs):
        create(**kwargs)
        raise OSError("prosessen stoppet etter lagring")

    service.orders.opprett_endringsordresak.side_effect = create_then_crash
    package = run(service, "submit", request=order())["packages"][-1]
    assert package["status"] == "utstedt"
    assert package["recovered"] is True
    assert len(service.created) == 1


def test_crash_between_approval_and_issuance_is_recovered_on_read(service, monkeypatch):
    package = run(service, "submit", request=order(kompensasjon_belop=400000))[
        "packages"
    ][-1]
    # The process stops after the approval commit, before the issuing operation ran.
    monkeypatch.setattr(service, "issue", lambda *args: None)
    approved = run(service, "approve", "pd@example.test", packageId=package["id"])
    reserved = approved["packages"][-1]
    assert reserved["status"] == "godkjent"
    assert reserved["sakId"]
    monkeypatch.undo()
    # Another worker had created the order under the reserved ID.
    service.created.add(reserved["sakId"])
    assert service.read("p1", HANDLER)["packages"][-1]["status"] == "utstedt"
    service.orders.opprett_endringsordresak.assert_not_called()


def test_retry_after_unrecorded_success_does_not_issue_twice(service, monkeypatch):
    package = run(service, "submit", request=order(kompensasjon_belop=400000))[
        "packages"
    ][-1]
    monkeypatch.setattr(service, "issue", lambda *args: None)
    run(service, "approve", "pd@example.test", packageId=package["id"])
    monkeypatch.undo()
    service.issue("p1", package["id"])
    service.issue("p1", package["id"])
    assert service.orders.opprett_endringsordresak.call_count == 1
    assert service.read("p1", HANDLER)["packages"][-1]["status"] == "utstedt"


def test_concurrent_issuing_attempt_holds_a_lease(service, monkeypatch):
    package = run(service, "submit", request=order(kompensasjon_belop=400000))[
        "packages"
    ][-1]
    monkeypatch.setattr(service, "issue", lambda *args: None)
    run(service, "approve", "pd@example.test", packageId=package["id"])
    monkeypatch.undo()
    with service.transaction("p1") as state:
        from datetime import UTC, datetime

        state["packages"][-1].update(
            issuingAt=datetime.now(UTC).isoformat(), issuingAttempt="other-worker"
        )
    service.issue("p1", package["id"])
    service.orders.opprett_endringsordresak.assert_not_called()
    assert service.read("p1", HANDLER)["packages"][-1]["status"] == "godkjent"
