import copy
from uuid import uuid4

import pytest

from models.events import parse_event_from_request
from repositories.event_repository import ConcurrencyError, JsonFileEventRepository
from services.approval_service import ApprovalService
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService

CHAIN = [
    {"id": "manager@example.test", "name": "Leder", "role": "Prosjektleder"},
    {"id": "owner@example.test", "name": "Eier", "role": "Prosjekteier"},
]
ACTOR = "handler@example.test"


@pytest.fixture
def setup(tmp_path):
    repo = JsonFileEventRepository(str(tmp_path / "events"))
    claim = parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": "grunnlag_opprettet",
            "aktor": "TE",
            "aktor_rolle": "TE",
            "data": {
                "tittel": "Endret grunnforhold",
                "hovedkategori": "SVIKT",
                "underkategori": "GRUNNFORHOLD",
                "beskrivelse": "Endret grunn",
                "dato_oppdaget": "2026-09-01",
            },
        }
    )
    repo.append(claim, 0)
    service = ApprovalService(
        tmp_path / "private.sqlite", repo, TimelineService(), BusinessRuleValidator()
    )
    item = {
        "id": "client-id",
        "track": "grunnlag",
        "eventType": "respons_grunnlag",
        "claimId": claim.event_id,
        "claimVersion": 1,
        "data": {
            "grunnlag_event_id": claim.event_id,
            "resultat": "godkjent",
            "begrunnelse": "Vi godtar ansvarsgrunnlaget.",
        },
        "form": {"private": "intern arbeidsverdi"},
    }
    return service, repo, item


def command(service, action, actor=ACTOR, team="team-bh", **kwargs):
    current = service.read("p1", "case1")
    return service.command(
        "p1",
        "case1",
        actor,
        CHAIN,
        actor == ACTOR,
        {
            "action": action,
            "expectedVersion": current["version"],
            "commandId": str(uuid4()),
            **kwargs,
        },
        team=team,
    )


def package(service, item):
    state = command(service, "prepare", item=item)
    letter = {
        "title": "Svar",
        "caseId": "case1",
        "caseTitle": "Endret grunnforhold",
        "sender": "BH",
        "recipient": "TE",
        "date": "11. september 2026",
        "introduction": "Innledning",
        "closing": "Hilsen",
        "items": [state["items"][-1]],
    }
    return command(service, "package", letter=letter)["packages"][-1]


def approve(service, package_id):
    command(service, "approve", CHAIN[0]["id"], packageId=package_id)
    return command(service, "approve", CHAIN[1]["id"], packageId=package_id)


def test_private_until_publication_and_retry(setup):
    service, repo, item = setup
    p = package(service, item)
    assert len(repo.get_events("case1")[0]) == 1
    approved = approve(service, p["id"])
    assert approved["packages"][0]["status"] == "godkjent"
    assert len(repo.get_events("case1")[0]) == 1
    sent = command(service, "publish", packageId=p["id"])
    assert sent["packages"][0]["status"] == "sendt"
    events, version = repo.get_events("case1")
    assert version == 2
    assert "brev" in events[-1]["data"]
    assert "private" not in str(events[-1])
    assert "steps" not in str(events[-1])
    command(service, "publish", packageId=p["id"])
    assert repo.get_events("case1")[1] == 2


def test_real_attachments_survive_approval_and_deliver_after_transaction(
    setup, monkeypatch
):
    from types import SimpleNamespace
    from unittest.mock import Mock

    from services.vedlegg_registry import DELIVERED, PENDING, STAGED, VedleggRegistry

    service, repo, item = setup
    monkeypatch.setenv("BH_APPROVAL_DB", service.path)
    registry = VedleggRegistry(service.path)
    attached = registry.stage(
        "p1", "case1", "vurdering.pdf", b"%PDF-test", ACTOR, "BH", "team-bh"
    )
    unused = registry.stage(
        "p1", "case1", "privat.pdf", b"%PDF-private", ACTOR, "BH", "team-bh"
    )
    item["data"]["vedlegg_ids"] = [attached["id"]]
    client = Mock()
    client.upload_document.side_effect = RuntimeError("Offline")
    monkeypatch.setattr(
        "routes.vedlegg_routes._catenda_context",
        lambda _: SimpleNamespace(
            service=client, project_id="cat", folder_id="folder", topic_id="topic"
        ),
    )
    p = package(service, item)
    frozen = p["letter"]["items"][0]
    assert frozen["data"]["vedlegg_ids"] == [attached["id"]]
    assert frozen["attachments"] == [{"id": attached["id"], "navn": "vurdering.pdf"}]
    assert attached["id"] in registry.approval_refs("p1", "case1")
    approve(service, p["id"])
    assert registry.get("p1", "case1", attached["id"])["status"] == STAGED
    result = command(service, "publish", packageId=p["id"])
    assert result["packages"][0]["status"] == "sendt"
    assert registry.get("p1", "case1", attached["id"])["status"] == PENDING
    events, version = repo.get_events("case1")
    assert events[-1]["data"]["vedlegg_ids"] == [attached["id"]]
    assert (
        "vurdering.pdf"
        in events[-1]["data"]["brev"]["seksjoner"]["begrunnelse"]["redigertTekst"]
    )
    client.upload_document.side_effect = None
    client.upload_document.return_value = {"id": "3fa85f6457174562b3fc2c963f66afa6"}
    command(service, "publish", packageId=p["id"])
    command(service, "publish", packageId=p["id"])
    assert repo.get_events("case1")[1] == version
    assert registry.get("p1", "case1", attached["id"])["status"] == DELIVERED
    assert registry.content("p1", "case1", attached["id"]) is None
    assert registry.get("p1", "case1", unused["id"])["status"] == STAGED
    assert client.upload_document.call_count == 2


def test_approval_cannot_freeze_another_teams_private_attachment(setup):
    from services.vedlegg_registry import VedleggRegistry

    service, _, item = setup
    entry = VedleggRegistry(service.path).stage(
        "p1", "case1", "private.pdf", b"%PDF", ACTOR, "BH", "other-team"
    )
    item["data"]["vedlegg_ids"] = [entry["id"]]
    with pytest.raises(ValueError, match="team"):
        command(service, "prepare", item=item)
    assert service.read("p1", "case1")["items"] == []


def test_return_requires_comment_and_keeps_frozen_revision(setup):
    service, repo, item = setup
    p = package(service, item)
    with pytest.raises(ValueError):
        command(service, "return", CHAIN[0]["id"], packageId=p["id"], comment=" ")
    state = command(
        service,
        "return",
        CHAIN[0]["id"],
        packageId=p["id"],
        comment="Forklar vurderingen.",
    )
    assert state["packages"][0]["letter"] == p["letter"]
    assert state["items"][0]["status"] == "erstattet"
    assert repo.get_events("case1")[1] == 1
    newer = package(service, item)
    assert newer["id"] != p["id"]
    assert newer["steps"][0]["status"] == "aktiv"


def test_active_reviewer_and_optimistic_locking(setup):
    service, _, item = setup
    p = package(service, item)
    for actor in [ACTOR, CHAIN[1]["id"], "te@example.test"]:
        with pytest.raises(PermissionError):
            command(service, "approve", actor, packageId=p["id"])
    with pytest.raises(ConcurrencyError):
        service.command(
            "p1",
            "case1",
            CHAIN[0]["id"],
            CHAIN,
            False,
            {
                "action": "approve",
                "expectedVersion": 0,
                "commandId": str(uuid4()),
                "packageId": p["id"],
            },
        )


def test_changed_claim_blocks_approval(setup):
    service, repo, item = setup
    p = package(service, item)
    old = repo.get_events("case1")[0][0]
    revised = parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": "grunnlag_oppdatert",
            "aktor": "TE",
            "aktor_rolle": "TE",
            "data": old["data"],
        }
    )
    repo.append(revised, 1)
    with pytest.raises(ValueError, match="endret"):
        command(service, "approve", CHAIN[0]["id"], packageId=p["id"])


def test_locks_revision_and_server_replaces_client_decisions(setup):
    service, _, item = setup
    prepared = command(service, "prepare", item=item)
    fake = copy.deepcopy(prepared["items"][0])
    fake["data"]["resultat"] = "avslatt"
    letter = {
        "title": "Svar",
        "caseId": "case1",
        "caseTitle": "Endring",
        "sender": "BH",
        "recipient": "TE",
        "date": "11. september 2026",
        "introduction": "",
        "closing": "",
        "items": [fake],
    }
    p = command(service, "package", letter=letter)["packages"][0]
    assert p["letter"]["items"][0]["data"]["resultat"] == "godkjent"
    with pytest.raises(ValueError, match="låst"):
        command(service, "prepare", item=item)


def test_command_idempotency(setup):
    service, _, item = setup
    body = {
        "action": "prepare",
        "expectedVersion": 0,
        "commandId": str(uuid4()),
        "item": item,
    }
    first = service.command("p1", "case1", ACTOR, CHAIN, True, body)
    assert service.command("p1", "case1", ACTOR, CHAIN, True, body) == first


def test_publication_failure_retries_without_duplicate_events(setup, monkeypatch):
    service, repo, item = setup
    p = package(service, item)
    approve(service, p["id"])
    append = repo.append_batch

    def committed_then_crashed(events, expected_version):
        append(events, expected_version)
        raise OSError("Simulated crash after event commit")

    monkeypatch.setattr(repo, "append_batch", committed_then_crashed)
    state = command(service, "publish", packageId=p["id"])
    assert state["packages"][0]["status"] == "publisering_feilet"
    monkeypatch.setattr(repo, "append_batch", append)
    state = command(service, "publish", packageId=p["id"])
    assert state["packages"][0]["status"] == "sendt"
    assert repo.get_events("case1")[1] == 2


def test_package_validates_ground_dependencies_and_publishes_two_tracks_atomically(
    setup,
):
    service, repo, item = setup
    claim = parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": "vederlag_krav_sendt",
            "aktor": "TE",
            "aktor_rolle": "TE",
            "data": {
                "metode": "REGNINGSARBEID",
                "kostnads_overslag": 100,
                "begrunnelse": "Ekstra arbeid",
            },
        }
    )
    repo.append(claim, 1)
    ground = command(service, "prepare", item=item)["items"][-1]
    economy = command(
        service,
        "prepare",
        item={
            "track": "vederlag",
            "eventType": "respons_vederlag",
            "claimId": claim.event_id,
            "claimVersion": 1,
            "data": {
                "vederlag_krav_id": claim.event_id,
                "beregnings_resultat": "godkjent",
                "total_godkjent_belop": 100,
                "begrunnelse": "Dokumentert kostnad.",
            },
        },
    )["items"][-1]
    letter = {
        "title": "Svar",
        "caseId": "case1",
        "caseTitle": "Endring",
        "sender": "BH",
        "recipient": "TE",
        "date": "11. september 2026",
        "introduction": "",
        "closing": "",
        "items": [economy],
    }
    with pytest.raises(ValueError, match="Ansvarsgrunnlaget"):
        command(service, "package", letter=letter)
    letter["items"] = [ground, economy]
    p = command(service, "package", letter=letter)["packages"][-1]
    approve(service, p["id"])
    assert repo.get_events("case1")[1] == 2
    command(service, "publish", packageId=p["id"])
    events, version = repo.get_events("case1")
    assert version == 4
    assert [e["event_type"] for e in events[-2:]] == [
        "respons_grunnlag",
        "respons_vederlag",
    ]
    assert events[-2]["data"]["brev"] == events[-1]["data"]["brev"]


def test_notification_retries_do_not_repeat_public_responses(setup):
    service, repo, item = setup
    p = package(service, item)
    approve(service, p["id"])
    command(service, "publish", packageId=p["id"])
    service.deliver("p1", "case1", p["id"], lambda _: "failed")
    assert service.read("p1", "case1")["packages"][0]["notificationStatus"] == "failed"
    service.deliver("p1", "case1", p["id"], lambda _: "delivered")
    assert (
        service.read("p1", "case1")["packages"][0]["notificationStatus"] == "delivered"
    )
    service.deliver("p1", "case1", p["id"], lambda _: pytest.fail("Already delivered"))
    assert repo.get_events("case1")[1] == 2


def test_changed_claim_between_last_approval_and_publish_stays_private(setup):
    service, repo, item = setup
    p = package(service, item)
    approve(service, p["id"])
    previous = repo.get_events("case1")[0][0]
    revised = parse_event_from_request(
        {
            "sak_id": "case1",
            "event_type": "grunnlag_oppdatert",
            "aktor": "TE",
            "aktor_rolle": "TE",
            "data": previous["data"],
        }
    )
    repo.append(revised, 1)
    state = command(service, "publish", packageId=p["id"])
    assert state["packages"][0]["status"] == "publisering_feilet"
    assert all(
        not e["event_type"].startswith("respons_") for e in repo.get_events("case1")[0]
    )


def test_publisering_leverer_vedlegg(setup, monkeypatch):
    """Brevpublisering er «sendt» for BH-siden og må levere vedlegg.

    Publiseringen bruker append_batch, som er en egen vei enn enkeltinnsending.
    Uten dette ville et vedlegg brevet viser til aldri nådd Catenda.
    """
    service, _repo, item = setup
    levert = []
    monkeypatch.setattr(
        "routes.vedlegg_routes.lever_vedlegg_for_hendelser",
        lambda prosjekt, sak, hendelser: levert.append((prosjekt, sak, len(hendelser))),
    )

    p = package(service, item)
    approve(service, p["id"])
    state = command(service, "publish", packageId=p["id"])

    assert state["packages"][0]["status"] == "sendt"
    assert levert and levert[0][0] == "p1" and levert[0][1] == "case1"


def test_feilet_vedleggslevering_stopper_ikke_publisering(setup, monkeypatch):
    """Hendelsene er lagret; en integrasjonsfeil skal ikke gjøre brevet usendt."""
    service, _repo, item = setup
    monkeypatch.setattr(
        "routes.vedlegg_routes.lever_vedlegg_for_hendelser",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("Catenda nede")),
    )

    p = package(service, item)
    approve(service, p["id"])
    state = command(service, "publish", packageId=p["id"])

    assert state["packages"][0]["status"] == "sendt"
