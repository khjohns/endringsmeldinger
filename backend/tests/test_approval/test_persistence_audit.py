"""Isolated persistence and failure-recovery regressions; no external database."""

import sqlite3
import subprocess
import sys
from datetime import UTC, datetime, timedelta

import pytest

from services.approval_service import ApprovalService
from services.business_rules import BusinessRuleValidator
from services.timeline_service import TimelineService
from tests.test_approval import test_approval_service as fixtures
from tests.test_approval.test_approval_service import approve, command, package


@pytest.fixture(name="setup")
def case(tmp_path):
    return fixtures.setup.__wrapped__(tmp_path)


@pytest.mark.parametrize(
    "older,newer", [("failed", "delivered"), ("delivered", "failed")]
)
def test_expired_delivery_attempt_cannot_replace_newer_receipt(setup, older, newer):
    service, repo, item = setup
    p = package(service, item)
    approve(service, p["id"])
    command(service, "publish", packageId=p["id"])

    def delayed_attempt(_):
        with service.transaction("p1", "case1") as (state, db):
            state["packages"][0]["notificationAttemptAt"] = (
                datetime.now(UTC) - timedelta(seconds=301)
            ).isoformat()
        service.deliver("p1", "case1", p["id"], lambda _: newer)
        return older

    service.deliver("p1", "case1", p["id"], delayed_attempt)
    assert service.read("p1", "case1")["packages"][0]["notificationStatus"] == newer
    with sqlite3.connect(service.path) as db:
        assert (
            db.execute(
                "SELECT status FROM approval_outbox WHERE id=?", (p["id"],)
            ).fetchone()[0]
            == newer
        )
    assert repo.get_events("case1")[1] == 2


def test_read_does_not_write_or_create_a_case(setup):
    service, _, _ = setup
    service.read("p1", "not-created")
    with sqlite3.connect(service.path) as db:
        assert (
            db.execute(
                "SELECT count(*) FROM approvals WHERE case_id='not-created'"
            ).fetchone()[0]
            == 0
        )


def test_transaction_exception_rolls_back_state_and_outbox(setup):
    service, _, _ = setup
    before = service.read("p1", "case1")
    with pytest.raises(OSError):
        with service.transaction("p1", "case1") as (state, db):
            state["version"] = 99
            db.execute(
                "INSERT INTO approval_outbox(id,project,case_id,body) VALUES ('failed','p1','case1','{}')"
            )
            raise OSError("Simulated storage operation failure")
    assert service.read("p1", "case1") == before
    with sqlite3.connect(service.path) as db:
        assert (
            db.execute(
                "SELECT count(*) FROM approval_outbox WHERE id='failed'"
            ).fetchone()[0]
            == 0
        )


def test_independent_processes_have_one_command_winner_and_state_survives_restart(
    tmp_path,
):
    path = str(tmp_path / "approval.sqlite")
    ApprovalService(path, None, TimelineService(), BusinessRuleValidator())
    script = """
import json,sys
from uuid import uuid4
from services.approval_service import ApprovalService
from repositories.event_repository import ConcurrencyError
s = ApprovalService(sys.argv[1], None, None, None)
sys.stdin.readline()
try:
    s.command("p", "c", "handler", [], True, {"action":"saveLetter", "expectedVersion":0,
        "commandId":str(uuid4()), "draft":{"introduction":sys.argv[2],"closing":"","included":[]}})
    print("saved")
except ConcurrencyError:
    print("conflict")
"""
    processes = [
        subprocess.Popen(
            [sys.executable, "-c", script, path, name],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        for name in ("first", "second")
    ]
    try:
        for process in processes:
            process.stdin.write("go\n")
            process.stdin.flush()
        results = [process.communicate(timeout=20) for process in processes]
        assert sorted(out.strip() for out, _ in results) == ["conflict", "saved"], (
            results
        )
        assert all(process.returncode == 0 for process in processes)
    finally:
        for process in processes:
            if process.poll() is None:
                process.kill()
                process.wait()
    restarted = ApprovalService(path, None, None, None)
    state = restarted.read("p", "c")
    assert state["version"] == 1
    assert state["drafts"]["handler"]["introduction"] in {"first", "second"}


@pytest.mark.parametrize("kind", ["approvals", "delivery"])
def test_database_connections_are_closed_after_operations(tmp_path, monkeypatch, kind):
    from services.catenda_delivery_status import CatendaDeliveryStatus

    original = sqlite3.connect
    connections = []

    def tracked(*args, **kwargs):
        connection = original(*args, **kwargs)
        connections.append(connection)
        return connection

    monkeypatch.setattr(sqlite3, "connect", tracked)
    if kind == "approvals":
        service = ApprovalService(tmp_path / "db.sqlite", None, None, None)
        service.read("p", "c")
    else:
        service = CatendaDeliveryStatus(tmp_path / "db.sqlite")
        service.record("p", "c", "event", "pending")
        service.summary("p", "c", {"event"})
    try:
        for connection in connections:
            with pytest.raises(sqlite3.ProgrammingError, match="closed"):
                connection.execute("SELECT 1")
    finally:
        for connection in connections:
            connection.close()


def test_process_crash_rolls_back_uncommitted_private_changes(setup):
    service, _, item = setup
    package(service, item)
    before = service.read("p1", "case1")
    script = """
import os,sys
from services.approval_service import ApprovalService
s = ApprovalService(sys.argv[1], None, None, None)
with s.transaction("p1", "case1") as (state, db):
    state["version"] = 999
    db.execute("INSERT INTO approval_outbox(id,project,case_id,body) VALUES ('crash','p1','case1','{}')")
    os._exit(23)
"""
    result = subprocess.run(
        [sys.executable, "-c", script, service.path],
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert result.returncode == 23, result.stderr
    restarted = ApprovalService(service.path, None, None, None)
    assert restarted.read("p1", "case1") == before
    with sqlite3.connect(service.path) as db:
        assert (
            db.execute(
                "SELECT count(*) FROM approval_outbox WHERE id='crash'"
            ).fetchone()[0]
            == 0
        )


def test_process_crash_after_public_commit_recovers_receipt_without_duplicate_events(
    setup,
):
    service, repo, item = setup
    p = package(service, item)
    approve(service, p["id"])
    script = """
import os,sys
from services.approval_service import ApprovalService
from services.timeline_service import TimelineService
from services.business_rules import BusinessRuleValidator
from repositories.event_repository import JsonFileEventRepository
from tests.test_approval.test_approval_service import command
repo = JsonFileEventRepository(sys.argv[2])
s = ApprovalService(sys.argv[1], repo, TimelineService(), BusinessRuleValidator())
append = repo.append_batch
def crash(events, version):
    append(events, version)
    os._exit(23)
repo.append_batch = crash
command(s, "publish", packageId=sys.argv[3])
"""
    result = subprocess.run(
        [sys.executable, "-c", script, service.path, str(repo.base_path), p["id"]],
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert result.returncode == 23, result.stderr
    assert repo.get_events("case1")[1] == 2
    restarted = ApprovalService(
        service.path, repo, TimelineService(), BusinessRuleValidator()
    )
    assert restarted.read("p1", "case1")["packages"][0]["status"] == "godkjent"
    assert (
        command(restarted, "publish", packageId=p["id"])["packages"][0]["status"]
        == "sendt"
    )
    assert repo.get_events("case1")[1] == 2
    with sqlite3.connect(service.path) as db:
        assert (
            db.execute(
                "SELECT count(*) FROM approval_outbox WHERE id=?", (p["id"],)
            ).fetchone()[0]
            == 1
        )


def test_process_crash_during_delivery_leaves_reclaimable_attempt(setup):
    service, repo, item = setup
    p = package(service, item)
    approve(service, p["id"])
    command(service, "publish", packageId=p["id"])
    script = """
import os,sys
from services.approval_service import ApprovalService
s = ApprovalService(sys.argv[1], None, None, None)
s.deliver("p1", "case1", sys.argv[2], lambda _: os._exit(23))
"""
    result = subprocess.run(
        [sys.executable, "-c", script, service.path, p["id"]],
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert result.returncode == 23, result.stderr
    restarted = ApprovalService(
        service.path, repo, TimelineService(), BusinessRuleValidator()
    )
    calls = []

    def dispatch(package):
        calls.append(package["id"])
        return "delivered"

    restarted.deliver("p1", "case1", p["id"], dispatch)
    assert not calls
    with restarted.transaction("p1", "case1") as (state, db):
        state["packages"][0]["notificationAttemptAt"] = (
            datetime.now(UTC) - timedelta(seconds=301)
        ).isoformat()
    restarted.deliver("p1", "case1", p["id"], dispatch)
    assert calls == [p["id"]]
    assert (
        restarted.read("p1", "case1")["packages"][0]["notificationStatus"]
        == "delivered"
    )
    assert repo.get_events("case1")[1] == 2


def test_failed_database_write_is_not_acknowledged_and_can_be_retried(
    setup, monkeypatch
):
    service, _, _ = setup
    original = sqlite3.connect

    def rejecting(*args, **kwargs):
        db = original(*args, **kwargs)
        db.set_authorizer(
            lambda operation, table, *_: sqlite3.SQLITE_DENY
            if operation == sqlite3.SQLITE_INSERT and table == "approvals"
            else sqlite3.SQLITE_OK
        )
        return db

    body = {
        "action": "saveLetter",
        "commandId": "retry-after-write-error",
        "expectedVersion": 0,
        "draft": {"introduction": "Keep me", "closing": "", "included": []},
    }
    with monkeypatch.context() as patch:
        patch.setattr(sqlite3, "connect", rejecting)
        with pytest.raises(sqlite3.DatabaseError):
            service.command("p1", "case1", "handler", [], True, body)
    assert service.read("p1", "case1")["version"] == 0
    saved = service.command("p1", "case1", "handler", [], True, body)
    assert saved["version"] == 1
    assert saved["drafts"]["handler"]["introduction"] == "Keep me"
    assert service.command("p1", "case1", "handler", [], True, body) == saved
