"""Private approval of change orders (endringsordrer) before issuance.

A change order does not exist as a case until it is issued, so packages are keyed by
project. The frozen request is issued with the existing EndringsordreService only after
the last approver in the amount-derived route has approved.

Like the approval of responses, issuance is recoverable: the case ID is reserved and
persisted in the package in the same transaction that approves it, before the separate
issuing operation. Creation uses expected event version 0 under that ID,
so a retry or a later read recognises an order that was already created and records the
receipt instead of issuing it twice. The events are the commit point: case creation uses
compensating rollback, not a database transaction, so metadata alone proves nothing. An
issuing attempt holds a lease, as notification delivery does. An expired lease does not
stop an old worker; atomic domain creation/fencing is still required (audit AP-04).
"""

import copy
import json
from contextlib import contextmanager
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from lib.sqlite_connection import sqlite_connection
from repositories.event_repository import ConcurrencyError
from services.approval_authority import handler_identity, number, resolve_route
from services.approval_service import digest
from services.endringsordre_service import new_eo_sak_id

ISSUE_LEASE = timedelta(minutes=5)

FIELDS = (
    "eo_nummer",
    "beskrivelse",
    "koe_sak_ids",
    "konsekvenser",
    "konsekvens_beskrivelse",
    "oppgjorsform",
    "kompensasjon_belop",
    "fradrag_belop",
    "er_estimat",
    "frist_dager",
    "ny_sluttdato",
)


def order_request(payload):
    if not isinstance(payload, dict):
        raise ValueError("Ugyldig endringsordre.")
    request = {key: copy.deepcopy(payload.get(key)) for key in FIELDS}
    for key in ("eo_nummer", "beskrivelse"):
        if not isinstance(request[key], str) or not request[key].strip():
            raise ValueError("Fyll inn endringsordrenummer og beskrivelse.")
        if len(request[key]) > 20000:
            raise ValueError("Endringsordren er for lang.")
    request["koe_sak_ids"] = request["koe_sak_ids"] or []
    request["er_estimat"] = bool(request["er_estimat"])
    return request


def order_exposure(request, daily_rate=None):
    """Authority basis for a change order, or None when it cannot be computed yet.

    The larger of addition and deduction is used, never the net: an agreed deduction
    commits the contract just as an addition does. Extension days are valued at the
    daily rate and added. Unresolved price or time requires the whole chain.
    """
    consequences = request.get("konsekvenser") or {}
    if not isinstance(consequences, dict):
        raise ValueError("Ugyldige konsekvenser.")
    addition, deduction = (
        request.get("kompensasjon_belop"),
        request.get("fradrag_belop"),
    )
    money = max(number(addition), number(deduction))
    days = request.get("frist_dager")
    if days is not None and (
        isinstance(days, bool) or not isinstance(days, int) or days < 0
    ):
        raise ValueError("Fristforlengelse må være et helt antall dager fra null.")
    end_date = request.get("ny_sluttdato")
    if end_date is not None:
        try:
            if (
                not isinstance(end_date, str)
                or date.fromisoformat(end_date).isoformat() != end_date
            ):
                raise ValueError()
        except ValueError as exc:
            raise ValueError(
                "Ny sluttdato må være en gyldig dato på formatet YYYY-MM-DD."
            ) from exc
        # We have no authoritative baseline date here. Client-supplied days (even 0)
        # cannot prove the exposure implied by the absolute date. Require the full
        # chain until a server-side contract baseline can establish consistency.
        return None
    if consequences.get("pris") and addition is None and deduction is None:
        return None
    if consequences.get("fremdrift") and days is None:
        return None
    days = number(days)
    if days > 0:
        if daily_rate is None or number(daily_rate) <= 0:
            return None
        money += days * number(daily_rate)
    return money


def order_exposure_floor(request):
    """The part of the exposure that is already agreed, whatever else is unresolved.

    An addition or deduction in the request binds the contract even when the time
    consequence cannot be valued yet, so the route must still cover it (audit RV-01).
    """
    return max(
        number(request.get("kompensasjon_belop")), number(request.get("fradrag_belop"))
    )


class EOApprovalService:
    def __init__(self, path, orders, policy, issued):
        """`issued(sak_id)` tells whether events exist for the reserved case ID."""
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.orders = orders
        self.policy = policy or {}
        self.issued = issued
        with sqlite_connection(self.path) as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS eo_approvals (project TEXT PRIMARY KEY, body TEXT NOT NULL)"
            )

    @property
    def chain(self):
        return [{**u, "id": u["id"].lower()} for u in self.policy.get("chain", [])]

    def is_handler(self, actor):
        return handler_identity(self.policy, actor) is not None

    def authority(self, request, owner):
        sender = handler_identity(self.policy, owner)
        if sender is None:
            raise ValueError("Saksbehandlerens fullmakt er tilbakekalt.")
        amount = order_exposure(request, self.policy.get("daily_rate"))
        minimum = None if amount is not None else order_exposure_floor(request)
        route = resolve_route(amount, sender, self.chain, minimum=minimum)
        return {
            "amount": None if amount is None else str(amount),
            "minimum": None if minimum is None else str(minimum),
            "matrix": "2026-01",
            "senderRole": sender.get("role"),
            "dailyRate": (
                str(number(self.policy["daily_rate"]))
                if request.get("frist_dager")
                and self.policy.get("daily_rate") is not None
                else None
            ),
        }, route

    @contextmanager
    def transaction(self, project):
        with sqlite_connection(self.path) as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT body FROM eo_approvals WHERE project=?", (project,)
            ).fetchone()
            state = (
                json.loads(row[0])
                if row
                else {"version": 0, "packages": [], "commands": {}}
            )
            before = copy.deepcopy(state)
            yield state
            if state != before:
                db.execute(
                    "INSERT OR REPLACE INTO eo_approvals VALUES (?,?)",
                    (project, json.dumps(state)),
                )

    def visible(self, state, actor):
        result = copy.deepcopy(state)
        result.pop("commands", None)
        result.pop("audit", None)
        result["packages"] = [
            p
            for p in result["packages"]
            if p["owner"] == actor or any(s["id"] == actor for s in p["steps"])
        ]
        return result

    def read(self, project, actor):
        with self.transaction(project) as state:
            self.reconcile(state)
            return self.visible(state, actor)

    @staticmethod
    def approve_package(p):
        """Approved: reserve the case ID BEFORE the separate issuing operation."""
        p["status"] = "godkjent"
        p.setdefault("sakId", new_eo_sak_id())

    def record_issued(self, p, catenda_synced=None, recovered=False):
        p.update(
            status="utstedt",
            issuedAt=p.get("issuedAt") or datetime.now(UTC).isoformat(),
            catendaSynced=catenda_synced,
            error=None,
        )
        if recovered:
            p["recovered"] = True

    def reconcile(self, state):
        """Recover issuance receipts; return packages whose route no longer matches policy."""
        now = datetime.now(UTC).isoformat()
        for p in state["packages"]:
            if p["status"] in ("godkjent", "utstedelse_feilet"):
                if p.get("sakId") and self.issued(p["sakId"]):
                    self.record_issued(p, recovered=True)
                    state["version"] += 1
                    continue
            if p["status"] not in ("til_godkjenning", "godkjent", "utstedelse_feilet"):
                continue
            try:
                authority, route = self.authority(p["request"], p["owner"])
                stale = (
                    p["policy"] != digest(self.chain)
                    or p["authority"] != authority
                    or [s["id"] for s in p["steps"]] != [u["id"] for u in route]
                )
            except ValueError:
                stale = True
            if stale:
                p.update(
                    status="returnert",
                    returnedBy="system",
                    returnedAt=now,
                    comment="Godkjenningskjeden eller fullmaktsgrunnlaget er endret. Endringsordren krever ny godkjenning.",
                )
                p.pop("issuingAt", None)
                p.pop("issuingAttempt", None)
                state.setdefault("audit", []).append(
                    {
                        "action": "policy_return",
                        "actor": "system",
                        "at": now,
                        "packageId": p["id"],
                    }
                )
                state["version"] += 1

    def command(self, project, actor, body, issuer_name):
        if not self.is_handler(actor) and actor not in {u["id"] for u in self.chain}:
            raise PermissionError("Godkjenningsfullmakten er tilbakekalt.")
        command_id = body.get("commandId")
        if not isinstance(command_id, str) or not command_id:
            raise ValueError("Kommando-ID mangler.")
        now = datetime.now(UTC).isoformat()
        action = body.get("action")
        issue_id = None
        # Persist policy returns even when the following command is rejected or
        # conflicts. A rollback of that command must not resurrect old authority.
        with self.transaction(project) as state:
            self.reconcile(state)
        with self.transaction(project) as state:
            if command_id in state["commands"]:
                if state["commands"][command_id] != actor:
                    raise PermissionError("Kommandoen tilhører en annen bruker.")
                return self.visible(state, actor)
            if body.get("expectedVersion") != state["version"]:
                raise ConcurrencyError(
                    body.get("expectedVersion", -1), state["version"]
                )
            if action == "submit":
                if not self.is_handler(actor):
                    raise PermissionError(
                        "Bare saksbehandler kan utstede endringsordrer."
                    )
                request = order_request(body.get("request"))
                number_ = request["eo_nummer"].strip()
                if any(
                    p["request"]["eo_nummer"].strip() == number_
                    and p["status"]
                    in ("til_godkjenning", "godkjent", "utstedelse_feilet")
                    for p in state["packages"]
                ):
                    raise ValueError(f"{number_} er allerede til godkjenning.")
                if any(u["id"] == actor for u in self.chain):
                    raise ValueError("Godkjenningskjeden inneholder saksbehandleren.")
                authority, route = self.authority(request, actor)
                package = {
                    "id": str(uuid4()),
                    "status": "til_godkjenning",
                    "owner": actor,
                    "ownerName": issuer_name,
                    "createdAt": now,
                    "previousId": body.get("previousId"),
                    "request": request,
                    "authority": authority,
                    "policy": digest(self.chain),
                    "contentHash": digest(request),
                    "steps": [
                        {**u, "status": "aktiv" if index == 0 else "venter"}
                        for index, u in enumerate(route)
                    ],
                }
                state["packages"].append(package)
                if not route:
                    # Inside the handler's own authority: approved on submission.
                    self.approve_package(package)
                    issue_id = package["id"]
            else:
                p = next(
                    (p for p in state["packages"] if p["id"] == body.get("packageId")),
                    None,
                )
                if p is None:
                    raise ValueError("Fant ikke endringsordren.")
                active = next((s for s in p["steps"] if s["status"] == "aktiv"), None)
                if action == "retry":
                    if actor != p["owner"] and not any(
                        s["id"] == actor for s in p["steps"]
                    ):
                        raise PermissionError("Du har ikke tilgang til utstedelsen.")
                    if p["status"] not in ("godkjent", "utstedelse_feilet"):
                        raise ValueError("Endringsordren er ikke godkjent.")
                    p.setdefault("sakId", new_eo_sak_id())
                    issue_id = p["id"]
                elif p["status"] != "til_godkjenning":
                    raise ValueError("Endringsordren er ikke til godkjenning.")
                elif action == "withdraw":
                    if actor != p["owner"] or any(
                        s["status"] == "godkjent" for s in p["steps"]
                    ):
                        raise PermissionError(
                            "Endringsordren kan bare trekkes før første godkjenning."
                        )
                    p["status"] = "trukket"
                elif action in ("approve", "return"):
                    if not active or active["id"] != actor:
                        raise PermissionError("Bare aktiv godkjenner kan beslutte.")
                    if action == "return":
                        comment = str(body.get("comment", "")).strip()
                        if not comment:
                            raise ValueError("Skriv en begrunnelse for retur.")
                        p.update(
                            status="returnert",
                            comment=comment,
                            returnedBy=actor,
                            returnedAt=now,
                        )
                    else:
                        if digest(p["request"]) != p["contentHash"]:
                            raise ValueError(
                                "Endringsordren samsvarer ikke med godkjenningsgrunnlaget."
                            )
                        active.update(status="godkjent", decidedAt=now)
                        following = next(
                            (s for s in p["steps"] if s["status"] == "venter"), None
                        )
                        if following:
                            following["status"] = "aktiv"
                        else:
                            self.approve_package(p)
                            issue_id = p["id"]
                else:
                    raise ValueError("Ukjent handling.")
            state.setdefault("audit", []).append(
                {
                    "action": action,
                    "actor": actor,
                    "at": now,
                    "packageId": body.get("packageId"),
                    "commandId": command_id,
                }
            )
            state["commands"][command_id] = actor
            state["version"] += 1
        if issue_id:
            self.issue(project, issue_id)
        return self.read(project, actor)

    def issue(self, project, package_id):
        """Issue outside the approval transaction under the reserved case ID."""
        attempt = str(uuid4())
        with self.transaction(project) as state:
            # Also enforce on direct/background issuance, not just HTTP retries.
            # Recover committed orders before considering policy changes.
            self.reconcile(state)
            p = next(p for p in state["packages"] if p["id"] == package_id)
            if p["status"] not in ("godkjent", "utstedelse_feilet"):
                return
            started = p.get("issuingAt")
            if (
                started
                and datetime.now(UTC) - datetime.fromisoformat(started) < ISSUE_LEASE
            ):
                return  # Another attempt is issuing this order.
            p.update(issuingAt=datetime.now(UTC).isoformat(), issuingAttempt=attempt)
            frozen = copy.deepcopy(p)
        sak_id = frozen["sakId"]
        update = None
        if self.issued(sak_id):
            update = {"recovered": True}
        else:
            try:
                result = self.orders.opprett_endringsordresak(
                    **frozen["request"],
                    utstedt_av=frozen.get("ownerName") or frozen["owner"],
                    sak_id=sak_id,
                )
                update = {"catenda_synced": bool(result.get("catenda_synced"))}
            except Exception as error:
                # A concurrent attempt may have created the order under the same ID.
                if self.issued(sak_id):
                    update = {"recovered": True}
                else:
                    failure = (
                        str(error)
                        if isinstance(error, (ValueError, RuntimeError))
                        else "Utstedelsen feilet. Prøv igjen."
                    )
        with self.transaction(project) as state:
            p = next(p for p in state["packages"] if p["id"] == package_id)
            # An expired attempt must not overwrite the receipt of its replacement.
            if p.get("issuingAttempt") != attempt:
                return
            p.pop("issuingAt", None)
            p.pop("issuingAttempt", None)
            if p["status"] not in ("godkjent", "utstedelse_feilet"):
                return
            if update is None:
                p.update(status="utstedelse_feilet", error=failure)
            else:
                self.record_issued(p, **update)
            state["version"] += 1
