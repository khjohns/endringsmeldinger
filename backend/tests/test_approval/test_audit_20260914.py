"""Regression tests for the verified audit fixes.

See docs/audit-godkjenning-event-sourcing-2026-09-14.md. Only isolated local
stores and mocks are used; no external services are contacted.
"""

import json
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from flask import Flask, g

from models.events import parse_event, parse_event_from_request
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService
from tests.test_approval import test_approval_service as approval_fixtures
from tests.test_approval.test_approval_service import (
    ACTOR,
    CHAIN,
    approve,
    command,
    package,
)


@pytest.fixture(name="setup")
def audited_case(tmp_path):
    # Reuse the canonical local store/claim fixture without registering a global plugin.
    return approval_fixtures.setup.__wrapped__(tmp_path)


def response(claim, *, kind="respons_grunnlag", result="godkjent"):
    return parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": kind,
            "aktor_id": "BH",
            "aktor_rolle": "BH",
            "refererer_til_event_id": claim.event_id,
            "data": {
                "grunnlag_event_id": claim.event_id,
                "resultat": result,
                "begrunnelse": "Audit response",
            },
        }
    )


def test_revoked_reviewer_cannot_approve_existing_package(setup, monkeypatch):
    service, repo, item = setup
    p = package(service, item)
    from lib.auth.session import cookie_name
    from lib.project_context import init_project_context
    from routes.approval_routes import approval_bp

    app = Flask(__name__)
    app.testing = True
    init_project_context(app)
    app.register_blueprint(approval_bp)
    monkeypatch.delenv("DISABLE_AUTH", raising=False)
    monkeypatch.setenv(
        "BH_APPROVAL_POLICIES",
        json.dumps(
            {
                "p1": {
                    "handlers": [ACTOR],
                    "chain": [
                        {
                            "id": "replacement@example.test",
                            "name": "Ny",
                            "role": "Leder",
                        }
                    ],
                }
            }
        ),
    )
    auth = Mock()
    auth.repo.session.return_value = {
        "app_users": {"id": "user", "email": CHAIN[0]["id"]},
        "csrf_token": "csrf",
    }
    auth.role.return_value = "member"
    auth.contract_role.return_value = "BH"
    # contract_membership er kilden rutene bruker; den følger rollen
    # så per-test-overstyringer av contract_role fortsatt virker.
    auth.contract_membership.side_effect = lambda p, u: (
        auth.contract_role(p, u),
        "test-team-id",
    )
    app.extensions["koe_auth"] = auth
    container = SimpleNamespace(
        event_repository=repo,
        timeline_service=TimelineService(),
        metadata_repository=Mock(),
    )
    container.metadata_repository.get.return_value = SimpleNamespace(prosjekt_id="p1")
    monkeypatch.setattr("core.container.get_container", lambda: container)
    monkeypatch.setattr(
        "routes.approval_routes.ApprovalService", lambda *args, **kwargs: service
    )
    client = app.test_client()
    client.set_cookie(cookie_name(), "session")
    result = client.post(
        "/api/cases/case1/approvals",
        headers={"X-Project-ID": "p1", "X-CSRF-Token": "csrf"},
        json={
            "action": "approve",
            "packageId": p["id"],
            "commandId": str(uuid4()),
            "expectedVersion": service.read("p1", "case1")["version"],
        },
    )
    assert result.status_code == 403


def test_updated_response_cannot_change_locked_ground(setup):
    service, repo, item = setup
    claim = parse_event(repo.get_events("case1")[0][0])
    accepted = response(claim)
    state = TimelineService().compute_state([claim, accepted])
    assert state.grunnlag.laast
    update = response(claim, kind="respons_grunnlag_oppdatert", result="avslatt")
    result = BusinessRuleValidator().validate(update, state)
    assert not result.is_valid


def test_response_revision_requires_a_previous_response(setup):
    _, repo, _ = setup
    claim = parse_event(repo.get_events("case1")[0][0])
    result = BusinessRuleValidator().validate(
        response(claim, kind="respons_grunnlag_oppdatert"),
        TimelineService().compute_state([claim]),
    )
    assert not result.is_valid


def test_duplicate_ground_creation_cannot_replace_locked_ground(setup):
    _, repo, _ = setup
    claim = parse_event(repo.get_events("case1")[0][0])
    state = TimelineService().compute_state([claim, response(claim)])
    assert state.grunnlag.laast
    duplicate = claim.model_copy(
        update={
            "event_id": str(uuid4()),
            "data": claim.data.model_copy(update={"beskrivelse": "Replacement"}),
        }
    )
    assert not BusinessRuleValidator().validate(duplicate, state).is_valid


def test_old_reference_does_not_answer_new_claim_revision(setup):
    _, repo, _ = setup
    claim = parse_event(repo.get_events("case1")[0][0])
    revised = parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": "grunnlag_oppdatert",
            "aktor_id": "TE",
            "aktor_rolle": "TE",
            "data": claim.data.model_dump(),
        }
    )
    state = TimelineService().compute_state([claim, revised])
    old_response = response(claim)
    assert old_response.refererer_til_event_id != revised.event_id
    assert not BusinessRuleValidator().validate(old_response, state).is_valid


def test_replay_preserves_commit_order_when_clocks_are_skewed(setup):
    _, repo, _ = setup
    claim = parse_event(repo.get_events("case1")[0][0])
    revised = parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": "grunnlag_oppdatert",
            "aktor_id": "TE",
            "aktor_rolle": "TE",
            "data": {
                **claim.data.model_dump(),
                "beskrivelse": "Latest committed description",
            },
        }
    ).model_copy(update={"tidsstempel": claim.tidsstempel - timedelta(seconds=1)})
    repo.append(revised, 1)
    rows, version = repo.get_events("case1")
    assert version == 2 and rows[-1]["event_id"] == revised.event_id
    state = TimelineService().compute_state([parse_event(e) for e in rows])
    assert state.grunnlag.beskrivelse == "Latest committed description"


def test_missing_pdf_and_failed_comment_are_not_successful_delivery(setup, monkeypatch):
    _, repo, _ = setup
    from routes import event_routes

    claim = parse_event(repo.get_events("case1")[0][0])
    state = TimelineService().compute_state([claim])
    ctx = SimpleNamespace(service=Mock())
    ctx.service.create_comment.return_value = None
    monkeypatch.setattr(event_routes, "_prepare_catenda_context", lambda _: ctx)
    monkeypatch.setattr(event_routes, "_resolve_pdf", lambda *args: (None, None, None))
    monkeypatch.setattr(event_routes, "_sync_topic_status", Mock())
    monkeypatch.setattr(
        event_routes,
        "settings",
        SimpleNamespace(dev_react_app_url="", react_app_url=""),
    )
    monkeypatch.setattr(
        "services.catenda_comment_generator.CatendaCommentGenerator.generate_comment",
        lambda *args: "Audit",
    )
    with Flask(__name__).test_request_context():
        g.project_id = "p1"
        success, _, docs = event_routes._post_to_catenda("case1", state, claim, "topic")
    ctx.service.create_comment.assert_called_once()
    assert docs == []
    assert not success


def test_frozen_letter_hash_blocks_mutation_before_approval(setup):
    service, repo, item = setup
    p = package(service, item)
    with service.transaction("p1", "case1") as (state, _):
        state["packages"][0]["letter"]["closing"] = "Changed after packaging"
    with pytest.raises(ValueError, match="Brevinnholdet"):
        command(service, "approve", CHAIN[0]["id"], packageId=p["id"])
    assert repo.get_events("case1")[1] == 1


def test_frozen_letter_hash_blocks_mutation_before_publication(setup):
    service, repo, item = setup
    p = package(service, item)
    approve(service, p["id"])
    with service.transaction("p1", "case1") as (state, _):
        state["packages"][0]["letter"]["closing"] = "Changed after approval"
    with pytest.raises(ValueError, match="Brevinnholdet"):
        command(service, "publish", packageId=p["id"])
    assert repo.get_events("case1")[1] == 1


def test_project_leader_cannot_publish_above_displayed_200000_limit(setup):
    service, repo, ground_item = setup
    chain = [{"id": "pl@example.test", "name": "PL", "role": "Prosjektleder"}]

    def act(action, actor=ACTOR, **kwargs):
        return service.command(
            "p1",
            "case1",
            actor,
            chain,
            actor == ACTOR,
            {
                "action": action,
                "commandId": str(uuid4()),
                "expectedVersion": service.read("p1", "case1")["version"],
                **kwargs,
            },
        )

    claim = parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": "vederlag_krav_sendt",
            "aktor_id": "TE",
            "aktor_rolle": "TE",
            "data": {
                "metode": "REGNINGSARBEID",
                "kostnads_overslag": 300000,
                "begrunnelse": "Arbeid",
            },
        }
    )
    repo.append(claim, 1)
    ground = act("prepare", item=ground_item)["items"][-1]
    economy = act(
        "prepare",
        item={
            "track": "vederlag",
            "eventType": "respons_vederlag",
            "claimId": claim.event_id,
            "data": {
                "vederlag_krav_id": claim.event_id,
                "beregnings_resultat": "godkjent",
                "total_godkjent_belop": 300000,
                "begrunnelse": "Godkjent",
            },
        },
    )["items"][-1]
    with pytest.raises(ValueError, match="fullmakt"):
        act(
            "package",
            letter={
                "title": "Svar",
                "caseId": "case1",
                "caseTitle": "Audit",
                "sender": "BH",
                "recipient": "TE",
                "date": "2026-09-14",
                "introduction": "",
                "closing": "",
                "items": [ground, economy],
            },
        )["packages"][-1]
    assert repo.get_events("case1")[1] == 2


def test_concurrent_approvals_with_same_version_have_one_winner(setup):
    from concurrent.futures import ThreadPoolExecutor

    from repositories.event_repository import ConcurrencyError

    service, repo, item = setup
    p = package(service, item)
    version = service.read("p1", "case1")["version"]

    def attempt(_):
        try:
            service.command(
                "p1",
                "case1",
                CHAIN[0]["id"],
                CHAIN,
                False,
                {
                    "action": "approve",
                    "packageId": p["id"],
                    "expectedVersion": version,
                    "commandId": str(uuid4()),
                },
            )
            return "approved"
        except ConcurrencyError:
            return "conflict"

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(attempt, range(2))) == ["approved", "conflict"]
    state = service.read("p1", "case1")
    assert state["version"] == version + 1
    assert state["packages"][0]["steps"][1]["status"] == "aktiv"
    assert repo.get_events("case1")[1] == 1


@pytest.mark.parametrize("fully_approved", [False, True])
def test_policy_change_returns_package_preserves_decisions_and_requires_new_approval(
    setup, fully_approved
):
    service, repo, item = setup
    p = package(service, item)
    command(service, "approve", CHAIN[0]["id"], packageId=p["id"])
    if fully_approved:
        command(service, "approve", CHAIN[1]["id"], packageId=p["id"])
    before = service.read("p1", "case1")
    replacement = [
        {"id": "new@example.test", "name": "Ny leder", "role": "Prosjektleder"}
    ]
    service.reconcile_policy("p1", "case1", replacement)
    after = service.read("p1", "case1")
    old = after["packages"][0]
    assert old["status"] == "returnert"
    assert old["letter"] == p["letter"]
    assert old["steps"] == before["packages"][0]["steps"]
    assert old["returnedBy"] == "system"
    assert after["items"][-1]["status"] == "kladd"
    assert (
        after["items"][-1]["previousId"]
        == after["packages"][0]["letter"]["items"][0]["id"]
    )
    assert after["version"] == before["version"] + 1
    assert after["audit"][-1]["action"] == "policy_return"
    service.reconcile_policy("p1", "case1", replacement)
    assert service.read("p1", "case1") == after
    assert repo.get_events("case1")[1] == 1

    def act(action, actor=ACTOR, **kwargs):
        return service.command(
            "p1",
            "case1",
            actor,
            replacement,
            actor == ACTOR,
            {
                "action": action,
                "commandId": str(uuid4()),
                "expectedVersion": service.read("p1", "case1")["version"],
                **kwargs,
            },
        )

    with pytest.raises(ValueError):
        act("publish", packageId=p["id"])
    ready = act("prepare", item={**item, "id": after["items"][-1]["id"]})
    new = act(
        "package",
        previousId=p["id"],
        letter={**p["letter"], "items": [ready["items"][-1]]},
    )["packages"][-1]
    assert new["previousId"] == p["id"]
    assert new["steps"][0]["status"] == "aktiv"
    assert repo.get_events("case1")[1] == 1
    act("approve", replacement[0]["id"], packageId=new["id"])
    act("publish", packageId=new["id"])
    assert repo.get_events("case1")[1] == 2


def test_policy_change_recovers_already_committed_publication(setup, monkeypatch):
    service, repo, item = setup
    p = package(service, item)
    approve(service, p["id"])
    append = repo.append_batch

    def committed_then_crashed(events, version):
        append(events, version)
        raise OSError("Crash after public commit")

    monkeypatch.setattr(repo, "append_batch", committed_then_crashed)
    assert (
        command(service, "publish", packageId=p["id"])["packages"][0]["status"]
        == "publisering_feilet"
    )
    assert repo.get_events("case1")[1] == 2
    service.reconcile_policy("p1", "case1", [])
    recovered = service.read("p1", "case1")
    assert recovered["packages"][0]["status"] == "sendt"
    assert len(recovered["items"]) == 1
    assert repo.get_events("case1")[1] == 2
    dispatch = Mock(return_value="delivered")
    service.deliver("p1", "case1", p["id"], dispatch)
    dispatch.assert_called_once()


def test_policy_change_stops_stale_command_and_commits_return(setup):
    from repositories.event_repository import ConcurrencyError

    service, _, item = setup
    p = package(service, item)
    version = service.read("p1", "case1")["version"]
    chain = [{**CHAIN[0], "role": "Prosjektdirektør"}, CHAIN[1]]
    with pytest.raises(ConcurrencyError):
        service.command(
            "p1",
            "case1",
            CHAIN[0]["id"],
            chain,
            False,
            {
                "action": "approve",
                "packageId": p["id"],
                "commandId": str(uuid4()),
                "expectedVersion": version,
            },
        )
    assert service.read("p1", "case1")["packages"][0]["status"] == "returnert"


def test_timeline_transport_preserves_commit_positions(setup):
    from lib.cloudevents.http_binding import format_timeline_response

    _, repo, _ = setup
    claim = parse_event(repo.get_events("case1")[0][0])
    earlier_clock = claim.model_copy(
        update={
            "event_id": str(uuid4()),
            "tidsstempel": claim.tidsstempel - timedelta(seconds=1),
        }
    )
    events = format_timeline_response([claim, earlier_clock])
    assert [(e["id"], e["streamposition"]) for e in events] == [
        (claim.event_id, 1),
        (earlier_clock.event_id, 2),
    ]


@pytest.mark.parametrize(
    "pdf,comment,status",
    [(True, True, True), (False, True, True), (True, False, True), (True, True, False)],
)
def test_delivery_requires_all_catenda_operations(
    setup, monkeypatch, tmp_path, pdf, comment, status
):
    from routes import event_routes

    _, repo, _ = setup
    claim = parse_event(repo.get_events("case1")[0][0])
    state = TimelineService().compute_state([claim])
    path = tmp_path / "letter.pdf"
    path.write_bytes(b"%PDF-test")
    monkeypatch.setattr(event_routes, "_prepare_catenda_context", lambda _: Mock())
    monkeypatch.setattr(
        event_routes, "_resolve_pdf", lambda *args: (str(path), "letter.pdf", "client")
    )
    monkeypatch.setattr(
        event_routes,
        "_upload_and_link_pdf",
        lambda *args: {"id": "document"} if pdf else None,
    )
    monkeypatch.setattr(event_routes, "_post_catenda_comment", lambda *args: comment)
    monkeypatch.setattr(event_routes, "_sync_topic_status", lambda *args: status)
    assert event_routes._post_to_catenda("case1", state, claim, "topic")[0] is (
        pdf and comment and status
    )


@pytest.mark.parametrize("new_rate", [15000, 50000, None])
def test_server_rate_change_returns_time_package(setup, new_rate):
    service, repo, item = setup
    service.authority_policy = {"daily_rate": 10000}
    claim = parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": "frist_krav_sendt",
            "aktor_id": "TE",
            "aktor_rolle": "TE",
            "data": {
                "varsel_type": "spesifisert",
                "antall_dager": 5,
                "begrunnelse": "Fem dager",
            },
        }
    )
    repo.append(claim, 1)
    ground = command(service, "prepare", item=item)["items"][-1]
    time = command(
        service,
        "prepare",
        item={
            "track": "frist",
            "eventType": "respons_frist",
            "claimId": claim.event_id,
            "data": {
                "frist_krav_id": claim.event_id,
                "beregnings_resultat": "godkjent",
                "godkjent_dager": 5,
                "spesifisert_krav_ok": True,
                "vilkar_oppfylt": True,
                "begrunnelse": "Godkjent",
            },
        },
    )["items"][-1]
    letter = {
        "title": "Svar",
        "caseId": "case1",
        "caseTitle": "Audit",
        "sender": "BH",
        "recipient": "TE",
        "date": "2026-09-14",
        "introduction": "",
        "closing": "",
        "items": [ground, time],
        "authorityContext": {"dailyRate": 1},
    }
    p = command(service, "package", letter=letter)["packages"][-1]
    assert p["letter"]["authorityContext"]["dailyRate"] == 10000
    assert float(p["authority"]["amount"]) == 50000
    command(service, "approve", CHAIN[0]["id"], packageId=p["id"])
    service.authority_policy["daily_rate"] = new_rate
    service.reconcile_policy("p1", "case1", CHAIN)
    returned = service.read("p1", "case1")["packages"][0]
    assert returned["status"] == "returnert"
    assert returned["steps"][0]["status"] == "godkjent"
    assert returned["letter"] == p["letter"]
    assert repo.get_events("case1")[1] == 2


def test_response_track_cannot_override_event_type(setup):
    from models.events import SporType

    _, repo, _ = setup
    claim = parse_event(repo.get_events("case1")[0][0])
    event = response(claim).model_copy(update={"spor": SporType.VEDERLAG})
    assert (
        not BusinessRuleValidator()
        .validate(event, TimelineService().compute_state([claim]))
        .is_valid
    )


def test_frozen_letter_delivery_rejects_regenerated_case_pdf(
    setup, monkeypatch, tmp_path
):
    from routes import event_routes

    _, repo, _ = setup
    claim = parse_event(repo.get_events("case1")[0][0])
    state = TimelineService().compute_state([claim])
    path = tmp_path / "fallback.pdf"
    path.write_bytes(b"%PDF-unapproved-case-report")
    monkeypatch.setattr(event_routes, "_prepare_catenda_context", lambda _: Mock())
    monkeypatch.setattr(
        event_routes,
        "_resolve_pdf",
        lambda *args: (str(path), "fallback.pdf", "server"),
    )
    upload = Mock()
    monkeypatch.setattr(event_routes, "_upload_and_link_pdf", upload)
    assert not event_routes._post_to_catenda(
        "case1", state, claim, "topic", require_supplied_pdf=True
    )[0]
    upload.assert_not_called()
    assert not path.exists()
