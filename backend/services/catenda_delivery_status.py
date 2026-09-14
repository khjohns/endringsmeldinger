"""Persistent delivery receipts for the case banner; this is not a retry queue."""

import json
import os
from pathlib import Path

from lib.sqlite_connection import sqlite_connection


class CatendaDeliveryStatus:
    def __init__(self, path=None):
        # Share the already persistent local approval database, including its volume.
        self.path = str(
            path or os.environ.get("BH_APPROVAL_DB", "koe_data/approvals.sqlite3")
        )
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite_connection(self.path) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS catenda_delivery_status (
                project TEXT, case_id TEXT, event_id TEXT, status TEXT NOT NULL,
                PRIMARY KEY (project, case_id, event_id))""")

    def record(self, project, case_id, event_id, status):
        if status not in {"pending", "failed", "delivered"}:
            raise ValueError("Invalid delivery status")
        with sqlite_connection(self.path) as db:
            db.execute(
                "INSERT OR REPLACE INTO catenda_delivery_status VALUES (?, ?, ?, ?)",
                (project, case_id, event_id, status),
            )

    def summary(self, project, case_id, event_ids):
        with sqlite_connection(self.path) as db:
            states = [
                status
                for event_id, status in db.execute(
                    "SELECT event_id,status FROM catenda_delivery_status WHERE project=? AND case_id=?",
                    (project, case_id),
                )
                if event_id in event_ids
            ]
            # Approval publication already has durable delivery status. Do not copy it:
            # successful retries must clear the banner without another write path.
            if db.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='approvals'"
            ).fetchone():
                row = db.execute(
                    "SELECT body FROM approvals WHERE project=? AND case_id=?",
                    (project, case_id),
                ).fetchone()
                if row:
                    for package in json.loads(row[0]).get("packages", []):
                        if package["status"] == "sendt":
                            states.append(package.get("notificationStatus", "pending"))
        failed = states.count("failed")
        pending = sum(s in {"pending", "sending"} for s in states)
        return {
            "status": "failed" if failed else "pending" if pending else "clear",
            "outstanding": failed + pending,
        }
