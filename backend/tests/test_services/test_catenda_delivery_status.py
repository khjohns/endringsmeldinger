import json
import sqlite3

from services.catenda_delivery_status import CatendaDeliveryStatus


def test_receipts_survive_recreation_and_do_not_cross_cases_or_projects(tmp_path):
    path = tmp_path / "delivery.sqlite"
    store = CatendaDeliveryStatus(path)
    store.record("p1", "c1", "failed-event", "failed")
    store.record("p1", "c1", "newer-event", "delivered")
    store = CatendaDeliveryStatus(path)
    assert store.summary("p1", "c1", {"failed-event", "newer-event"}) == {
        "status": "failed",
        "outstanding": 1,
    }
    assert store.summary("p2", "c1", {"failed-event"})["status"] == "clear"
    assert store.summary("p1", "c2", {"failed-event"})["status"] == "clear"
    store.record("p1", "c1", "failed-event", "delivered")
    assert (
        store.summary("p1", "c1", {"failed-event", "newer-event"})["status"] == "clear"
    )


def test_pending_receipt_requires_a_committed_event(tmp_path):
    store = CatendaDeliveryStatus(tmp_path / "delivery.sqlite")
    store.record("p", "c", "event", "pending")
    assert store.summary("p", "c", set())["status"] == "clear"
    assert store.summary("p", "c", {"event"})["status"] == "pending"


def test_approval_retry_uses_existing_receipt_without_exposing_private_data(tmp_path):
    path = tmp_path / "delivery.sqlite"
    store = CatendaDeliveryStatus(path)
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE approvals(project TEXT, case_id TEXT, body TEXT)")
        db.execute(
            "INSERT INTO approvals VALUES (?, ?, ?)",
            (
                "p",
                "c",
                json.dumps(
                    {
                        "packages": [
                            {
                                "status": "sendt",
                                "notificationStatus": "failed",
                                "letter": {"private": "secret"},
                            },
                            {
                                "status": "til_godkjenning",
                                "notificationStatus": "failed",
                            },
                        ]
                    }
                ),
            ),
        )
    assert store.summary("p", "c", set()) == {"status": "failed", "outstanding": 1}
    with sqlite3.connect(path) as db:
        db.execute(
            "UPDATE approvals SET body=?",
            (
                json.dumps(
                    {
                        "packages": [
                            {"status": "sendt", "notificationStatus": "delivered"}
                        ]
                    }
                ),
            ),
        )
    assert store.summary("p", "c", set())["status"] == "clear"
