"""Private approval aggregate. Public events are appended only by publish().

SQLite provides durable command serialization, separate from public case history.
Publication uses persisted event IDs to recover after an event-store commit/crash.
"""

import copy
import hashlib
import json
import logging
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from api.validators import validate_event_data
from lib.sqlite_connection import sqlite_connection
from models.events import SporStatus, parse_event, parse_event_from_request
from repositories.event_repository import ConcurrencyError
from services.approval_authority import approval_route, handler_identity

logger = logging.getLogger(__name__)

TRACKS = ("grunnlag", "vederlag", "frist")


def krav_fra_tilstand(state):
    """TEs krav slik fullmakten for godkjent ansvar leser det (GFK-06).

    Kroner for vederlag, med særskilte krav; dager for frist. `None` er et krav
    som ikke er sendt eller ikke tallfestet. Et trukket krav er 0.
    """
    ikke_sendt = {SporStatus.IKKE_RELEVANT, SporStatus.UTKAST}
    vederlag, frist = state.vederlag, state.frist
    if vederlag.status == SporStatus.TRUKKET:
        kroner = 0
    elif vederlag.status in ikke_sendt or vederlag.krevd_belop is None:
        kroner = None
    else:
        saerskilt = (vederlag.saerskilt_krav or {}).values()
        kroner = abs(vederlag.krevd_belop) + sum(
            abs(k.get("belop") or 0) for k in saerskilt if isinstance(k, dict)
        )
    if frist.status == SporStatus.TRUKKET:
        dager = 0
    elif frist.status in ikke_sendt:
        dager = None
    else:
        dager = frist.krevd_dager
    return {"vederlag": kroner, "frist": dager}


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def claims(events):
    result = {}
    for event in events:
        kind = event["event_type"]
        for track in TRACKS:
            if kind.startswith(track + "_") and not kind.startswith(track + "_respons"):
                # Any newer claim/withdrawal invalidates the prepared response.
                result[track] = event["event_id"]
    return result


class ApprovalService:
    def __init__(
        self, path, event_repo, timeline_service, validator, authority_policy=None
    ):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.events = event_repo
        self.timeline = timeline_service
        self.validator = validator
        self.authority_policy = authority_policy or {}
        with sqlite_connection(self.path) as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS approvals (project TEXT, case_id TEXT, body TEXT NOT NULL, PRIMARY KEY(project,case_id))"
            )
            db.execute(
                "CREATE TABLE IF NOT EXISTS approval_outbox (id TEXT PRIMARY KEY, project TEXT, case_id TEXT, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending')"
            )

    @contextmanager
    def transaction(self, project, case_id):
        with sqlite_connection(self.path) as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT body FROM approvals WHERE project=? AND case_id=?",
                (project, case_id),
            ).fetchone()
            state = (
                json.loads(row[0])
                if row
                else {"version": 0, "items": [], "packages": [], "commands": {}}
            )
            before = copy.deepcopy(state)
            yield state, db
            if state != before:
                db.execute(
                    "INSERT OR REPLACE INTO approvals VALUES (?,?,?)",
                    (project, case_id, json.dumps(state)),
                )

    def read(self, project, case_id):
        with sqlite_connection(self.path) as db:
            row = db.execute(
                "SELECT body FROM approvals WHERE project=? AND case_id=?",
                (project, case_id),
            ).fetchone()
            state = (
                json.loads(row[0])
                if row
                else {"version": 0, "items": [], "packages": [], "commands": {}}
            )
            return self.public(state)

    @staticmethod
    def public(state):
        result = copy.deepcopy(state)
        result.pop("commands", None)
        for p in result["packages"]:
            p.pop("publicationEvents", None)
        return result

    def krav(self, case_id):
        raw, _ = self.events.get_events(case_id)
        return krav_fra_tilstand(
            self.timeline.compute_state([parse_event(e) for e in raw])
        )

    def route(self, owner, items, chain, case_id):
        """Authority basis and the approvers it requires for this owner's letter."""
        return approval_route(
            items,
            chain,
            self.authority_policy.get("daily_rate"),
            handler_identity(self.authority_policy, owner),
            self.krav(case_id),
        )

    def stale(self, p, chain, case_id):
        authority, route = self.route(p["owner"], p["letter"]["items"], chain, case_id)
        return (
            p["policy"]["version"] != digest(chain)
            or p.get("authority") != authority
            or [s["id"] for s in p["steps"]] != [u["id"] for u in route]
        )

    @staticmethod
    def mark_approved(p, events):
        p["status"] = "godkjent"
        # Persist IDs BEFORE the separate publication operation.
        from services.approval_letter import snapshot

        public_letter = snapshot(p["letter"], p["id"])
        p["publicationEvents"] = [
            e.model_copy(
                update={"data": e.data.model_copy(update={"brev": public_letter})}
            ).model_dump(mode="json")
            for e in events
        ]

    @staticmethod
    def basis(ground, refs):
        return {
            "claimId": refs.get("grunnlag", ""),
            "resultat": ground.bh_resultat,
            "varsletITide": ground.grunnlag_varslet_i_tide,
            "hovedkategori": ground.hovedkategori,
        }

    def validate_items(self, case_id, items, check_basis=True):
        raw, version = self.events.get_events(case_id)
        refs = claims(raw)
        existing = [parse_event(e) for e in raw]
        if not existing:
            raise ValueError("Saken finnes ikke.")
        validated = []
        # Validate in domain order, so dependent subsidiary decisions see the package's grunnlag.
        for item in sorted(items, key=lambda i: TRACKS.index(i["track"])):
            if refs.get(item["track"]) != item["claimId"]:
                raise ValueError(
                    "Kravet er endret. Revider vurderingen før du fortsetter."
                )
            data = copy.deepcopy(item["data"])
            validate_event_data(item["eventType"], data)
            event = parse_event_from_request(
                {
                    "sak_id": case_id,
                    "event_type": item["eventType"],
                    "refererer_til_event_id": item["claimId"],
                    "aktor_id": item["owner"],
                    "aktor_rolle": "BH",
                    "data": data,
                }
            )
            state = self.timeline.compute_state(existing + validated)
            if (
                check_basis
                and item["track"] != "grunnlag"
                and item.get("basis") != self.basis(state.grunnlag, refs)
            ):
                raise ValueError(
                    "Ansvarsgrunnlaget er endret eller utelatt. Revider økonomi- og fristvurderingen mot grunnlaget som skal gjelde for sendingen."
                )
            result = self.validator.validate(event, state)
            if not result.is_valid:
                raise ValueError(result.message)
            from routes.event_routes import enrich_event_with_version

            validated.append(enrich_event_with_version(event, state))
        return validated, version

    def command(self, project, case_id, actor, chain, can_prepare, body, team=None):
        from services.vedlegg_registry import VedleggRegistry

        attachments = VedleggRegistry(self.path)
        if not can_prepare and actor not in {u["id"] for u in chain}:
            raise PermissionError("Godkjenningsfullmakten er tilbakekalt.")
        self.reconcile_policy(project, case_id, chain)
        now = datetime.now(UTC).isoformat()
        command_id = body.get("commandId")
        if not isinstance(command_id, str) or not command_id:
            raise ValueError("Kommando-ID mangler.")
        with self.transaction(project, case_id) as (state, db):
            if command_id in state["commands"]:
                if state["commands"][command_id] != actor:
                    raise PermissionError("Kommandoen tilhører en annen bruker.")
                return self.public(state)
            if body.get("expectedVersion") != state["version"]:
                raise ConcurrencyError(
                    body.get("expectedVersion", -1), state["version"]
                )
            action = body.get("action")
            if action == "saveLetter":
                if not can_prepare:
                    raise PermissionError("Bare saksbehandler kan redigere brevutkast.")
                draft = body.get("draft", {})
                if any(
                    not isinstance(draft.get(key), str) or len(draft[key]) > 20000
                    for key in ("introduction", "closing")
                ) or not isinstance(draft.get("included"), list):
                    raise ValueError("Ugyldig brevutkast.")
                state.setdefault("drafts", {})[actor] = {
                    key: copy.deepcopy(draft[key])
                    for key in ("introduction", "closing", "included")
                }
            elif action == "prepare":
                if not can_prepare:
                    raise PermissionError("Bare saksbehandler kan ferdigstille.")
                item = copy.deepcopy(body["item"])
                if item.get("track") not in TRACKS or item.get("eventType") not in [
                    f"respons_{item['track']}",
                    f"respons_{item['track']}_oppdatert",
                ]:
                    raise ValueError("Ugyldig vurderingstype.")
                if any(
                    i["track"] == item["track"] and i["status"] == "til_godkjenning"
                    for i in state["items"]
                ):
                    raise ValueError("Vurderingen er låst under godkjenning.")
                previous_id = item.get("previousId")
                if previous_id and not any(
                    i["id"] == previous_id
                    and i["owner"] == actor
                    and i["status"] == "erstattet"
                    for i in state["items"]
                ):
                    raise PermissionError(
                        "Den tidligere revisjonen kan ikke redigeres av denne brukeren."
                    )
                item.update(
                    id=str(uuid4()), owner=actor, status="ferdigstilt", createdAt=now
                )
                validated, _ = self.validate_items(case_id, [item], check_basis=False)
                validated[0].data.vedlegg_ids = attachments.validate_refs(
                    project, case_id, validated[0].data.vedlegg_ids, team
                )
                item["attachments"] = [
                    {"id": v["id"], "navn": v["navn"]}
                    for v in attachments.list(project, case_id)
                    if v["id"] in validated[0].data.vedlegg_ids
                ]
                raw, _ = self.events.get_events(case_id)
                ground = self.timeline.compute_state(
                    [parse_event(e) for e in raw]
                ).grunnlag
                pending_ground = next(
                    (
                        i
                        for i in reversed(state["items"])
                        if i["track"] == "grunnlag"
                        and i["owner"] == actor
                        and i["status"] in ("ferdigstilt", "til_godkjenning")
                    ),
                    None,
                )
                if item["track"] != "grunnlag" and pending_ground:
                    ground = ground.model_copy(
                        update={
                            "bh_resultat": pending_ground["data"].get("resultat"),
                            "grunnlag_varslet_i_tide": pending_ground["data"].get(
                                "grunnlag_varslet_i_tide"
                            ),
                        }
                    )
                basis = self.basis(ground, claims(raw))
                if item.get("basis") and item["basis"] != basis:
                    raise ValueError(
                        "Ansvarsgrunnlaget er endret. Last inn vurderingen på nytt."
                    )
                item["basis"] = basis
                item["data"] = validated[0].data.model_dump(
                    mode="json", exclude_none=True
                )
                item["data"].pop("brev", None)
                for old in state["items"]:
                    if old["track"] == item["track"] and old["status"] in (
                        "ferdigstilt",
                        "kladd",
                    ):
                        if old["owner"] != actor:
                            raise PermissionError(
                                "Vurderingen tilhører en annen saksbehandler."
                            )
                        old["status"] = "erstattet"
                item["contentHash"] = digest(
                    {
                        "data": item["data"],
                        "basis": item["basis"],
                        "form": item.get("form"),
                    }
                )
                state["items"].append(item)
            elif action == "revise":
                item = next(i for i in state["items"] if i["id"] == body["itemId"])
                if item["owner"] != actor or item["status"] != "ferdigstilt":
                    raise PermissionError("Vurderingen kan ikke revideres nå.")
                item["status"] = "erstattet"
                state["items"].append(
                    {
                        **copy.deepcopy(item),
                        "id": str(uuid4()),
                        "previousId": item["id"],
                        "status": "kladd",
                        "createdAt": now,
                    }
                )
            elif action == "package":
                if not can_prepare:
                    raise PermissionError(
                        "Bare saksbehandler kan sende til godkjenning."
                    )
                letter = copy.deepcopy(body["letter"])
                ids = [i["id"] for i in letter["items"]]
                items = [i for i in state["items"] if i["id"] in ids]
                if (
                    not items
                    or len(items) != len(ids)
                    or len(set(i["track"] for i in items)) != len(items)
                ):
                    raise ValueError("Velg én ferdigstilt revisjon per vurdering.")
                if any(
                    i["owner"] != actor or i["status"] != "ferdigstilt" for i in items
                ):
                    raise PermissionError("Vurderingene må være dine og ferdigstilte.")
                if len(set(u["id"] for u in chain)) != len(chain) or any(
                    u["id"] == actor for u in chain
                ):
                    raise ValueError("Godkjenningskjeden inneholder saksbehandleren.")
                events, _ = self.validate_items(case_id, items)
                authority, route = self.route(actor, items, chain, case_id)
                previous = body.get("previousId")
                if previous and not any(
                    p["id"] == previous
                    and p["owner"] == actor
                    and p["status"] in ("returnert", "trukket")
                    for p in state["packages"]
                ):
                    raise ValueError("Ugyldig tidligere pakke.")
                for item in items:
                    item["status"] = "til_godkjenning"
                letter["items"] = copy.deepcopy(
                    items
                )  # Never trust client-provided decision copies.
                letter["caseId"] = case_id
                # The preview and frozen package use the same server rate as authority checks.
                letter["authorityContext"] = {
                    **(letter.get("authorityContext") or {}),
                    "dailyRate": float(self.authority_policy["daily_rate"])
                    if self.authority_policy.get("daily_rate") is not None
                    else None,
                    "krav": self.krav(case_id),
                    "matrixVersion": "2026-01",
                }
                for key in (
                    "introduction",
                    "closing",
                    "title",
                    "sender",
                    "recipient",
                    "caseTitle",
                    "date",
                ):
                    if not isinstance(letter.get(key), str) or len(letter[key]) > 20000:
                        raise ValueError("Ugyldig brevfelt: " + key)
                package = {
                    "id": str(uuid4()),
                    "status": "til_godkjenning",
                    "owner": actor,
                    "ownerName": (
                        handler_identity(self.authority_policy, actor) or {}
                    ).get("name"),
                    "createdAt": now,
                    "previousId": previous,
                    "policy": {"type": "configured-chain", "version": digest(chain)},
                    "authority": authority,
                    "letter": letter,
                    "contentHash": digest(letter),
                    "steps": [
                        {**u, "status": "aktiv" if index == 0 else "venter"}
                        for index, u in enumerate(route)
                    ],
                }
                if not route:
                    # Inside the handler's own authority: approved on submission.
                    self.mark_approved(package, events)
                state["packages"].append(package)
            elif action in ("approve", "return", "withdraw", "publish"):
                p = next(p for p in state["packages"] if p["id"] == body["packageId"])
                if action in ("approve", "publish") and p["status"] != "sendt":
                    if p["policy"]["version"] != digest(chain):
                        raise ValueError(
                            "Godkjenningskjeden er endret. Pakken må behandles på nytt."
                        )
                    if self.stale(p, chain, case_id):
                        raise ValueError(
                            "Fullmaktsgrunnlaget er endret. Pakken må behandles på nytt."
                        )
                if action == "publish":
                    if actor != p["owner"] and not any(
                        s["id"] == actor for s in p["steps"]
                    ):
                        raise PermissionError("Du har ikke tilgang til sending.")
                    if p["status"] not in ("godkjent", "publisering_feilet", "sendt"):
                        raise ValueError("Pakken er ikke godkjent.")
                    self.publish(project, case_id, state, p, db, now)
                else:
                    if p["status"] != "til_godkjenning":
                        raise ValueError("Pakken er ikke til godkjenning.")
                    active = next(
                        (s for s in p["steps"] if s["status"] == "aktiv"), None
                    )
                    if action == "withdraw":
                        if actor != p["owner"] or any(
                            s["status"] == "godkjent" for s in p["steps"]
                        ):
                            raise PermissionError(
                                "Pakken kan bare trekkes før første godkjenning."
                            )
                        p["status"] = "trukket"
                    else:
                        if not active or active["id"] != actor:
                            raise PermissionError(
                                "Bare aktiv godkjenner kan beslutte pakken."
                            )
                        if action == "return":
                            comment = body.get("comment", "").strip()
                            if not comment:
                                raise ValueError("Skriv en begrunnelse for retur.")
                            p.update(
                                status="returnert",
                                comment=comment,
                                returnedBy=actor,
                                returnedAt=now,
                            )
                        else:
                            events, _ = self.validate_items(
                                case_id, p["letter"]["items"]
                            )
                            if digest(p["letter"]) != p["contentHash"]:
                                raise ValueError(
                                    "Brevinnholdet samsvarer ikke med godkjenningsgrunnlaget."
                                )
                            active.update(status="godkjent", decidedAt=now)
                            following = next(
                                (s for s in p["steps"] if s["status"] == "venter"), None
                            )
                            if following:
                                following["status"] = "aktiv"
                            else:
                                self.mark_approved(p, events)
                    if p["status"] in ("returnert", "trukket"):
                        for item in list(state["items"]):
                            if any(i["id"] == item["id"] for i in p["letter"]["items"]):
                                item["status"] = "erstattet"
                                state["items"].append(
                                    {
                                        **copy.deepcopy(item),
                                        "id": str(uuid4()),
                                        "previousId": item["id"],
                                        "status": "kladd",
                                        "createdAt": now,
                                    }
                                )
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
            state["version"] += 1
            state["commands"][command_id] = actor
            result = self.public(state)
        # Release the SQLite approval transaction before attachment delivery writes
        # to the same database. Also recover after an earlier event-store commit.
        if action == "publish":
            package = next(p for p in state["packages"] if p["id"] == body["packageId"])
            if package["status"] == "sendt":
                try:
                    from routes.vedlegg_routes import lever_vedlegg_for_hendelser

                    lever_vedlegg_for_hendelser(
                        project,
                        case_id,
                        [parse_event(e) for e in package["publicationEvents"]],
                    )
                except Exception:
                    logger.exception(
                        "Brev publisert; vedleggslevering feilet for %s", case_id
                    )
        return result

    def reconcile_policy(self, project, case_id, chain):
        """Return uncommitted packages for fresh approval when authority changes."""
        now = datetime.now(UTC).isoformat()
        with self.transaction(project, case_id) as (state, db):
            changed = False
            for p in state["packages"]:
                if p["status"] not in {
                    "til_godkjenning",
                    "godkjent",
                    "publisering_feilet",
                }:
                    continue
                try:
                    stale = self.stale(p, chain, case_id)
                except ValueError:
                    stale = True
                if not stale:
                    continue
                # A public commit is irreversible here; recover its private receipt.
                ids = {e["event_id"] for e in p.get("publicationEvents", [])}
                if ids:
                    raw, _ = self.events.get_events(case_id)
                    found = ids & {e["event_id"] for e in raw}
                    if found:
                        if found != ids:
                            raise ValueError(
                                "Ufullstendig publisering krever administrativ kontroll."
                            )
                        self.publish(project, case_id, state, p, db, now)
                        changed = True
                        continue
                p.update(
                    status="returnert",
                    returnedBy="system",
                    returnedAt=now,
                    comment="Godkjenningskjeden eller fullmaktsgrunnlaget er endret. Brevet krever ny godkjenning.",
                )
                for item in list(state["items"]):
                    if any(i["id"] == item["id"] for i in p["letter"]["items"]):
                        item["status"] = "erstattet"
                        state["items"].append(
                            {
                                **copy.deepcopy(item),
                                "id": str(uuid4()),
                                "previousId": item["id"],
                                "status": "kladd",
                                "createdAt": now,
                            }
                        )
                state.setdefault("audit", []).append(
                    {
                        "action": "policy_return",
                        "actor": "system",
                        "at": now,
                        "packageId": p["id"],
                    }
                )
                changed = True
            if changed:
                state["version"] += 1

    def publish(self, project, case_id, state, p, db, now):
        if p["status"] == "sendt":
            return
        if digest(p["letter"]) != p["contentHash"]:
            raise ValueError("Brevinnholdet er endret etter godkjenning.")
        stored, _ = self.events.get_events(case_id)
        ids = [e["event_id"] for e in p["publicationEvents"]]
        found = {e["event_id"] for e in stored}.intersection(ids)
        if found and len(found) != len(ids):
            raise ValueError("Ufullstendig publisering krever administrativ kontroll.")
        if not found:
            try:
                _, version = self.validate_items(case_id, p["letter"]["items"])
                for event in p["publicationEvents"]:
                    event["tidsstempel"] = now
                publiserte = [parse_event(e) for e in p["publicationEvents"]]
                self.events.append_batch(publiserte, version)
            except (ValueError, ConcurrencyError) as error:
                p.update(status="publisering_feilet", error=str(error))
                return
            except Exception:
                p.update(
                    status="publisering_feilet", error="Sending feilet. Prøv igjen."
                )
                return
        p.update(status="sendt", sentAt=now, eventIds=ids)
        p.pop("error", None)
        for item in state["items"]:
            if any(i["id"] == item["id"] for i in p["letter"]["items"]):
                item["status"] = "sendt"
        # Durable integration handoff, never duplicate public responses on notification retry.
        db.execute(
            "INSERT OR IGNORE INTO approval_outbox(id,project,case_id,body) VALUES (?,?,?,?)",
            (
                p["id"],
                project,
                case_id,
                json.dumps({"eventIds": ids, "packageId": p["id"]}),
            ),
        )

    def deliver(self, project, case_id, package_id, dispatch):
        """Claim one outbox job. Notification retries never append response events."""
        with self.transaction(project, case_id) as (state, db):
            p = next(p for p in state["packages"] if p["id"] == package_id)
            if p["status"] != "sendt":
                return
            job = db.execute(
                "SELECT status FROM approval_outbox WHERE id=?", (package_id,)
            ).fetchone()
            if not job or job[0] == "delivered":
                return
            if (
                job[0] == "sending"
                and (
                    datetime.now(UTC)
                    - datetime.fromisoformat(
                        p.get("notificationAttemptAt", datetime.now(UTC).isoformat())
                    )
                ).total_seconds()
                < 300
            ):
                return
            attempt_id = str(uuid4())
            p["notificationAttemptId"] = attempt_id
            p["notificationAttemptAt"] = datetime.now(UTC).isoformat()
            db.execute(
                "UPDATE approval_outbox SET status=? WHERE id=?",
                ("sending", package_id),
            )
            p["notificationStatus"] = "sending"
            frozen = copy.deepcopy(p)
        try:
            result = dispatch(frozen)
        except Exception:
            result = "failed"
        if result not in ("delivered", "not_configured", "failed"):
            result = "failed"
        with self.transaction(project, case_id) as (state, db):
            p = next(p for p in state["packages"] if p["id"] == package_id)
            # A timed-out worker must not overwrite the receipt of its replacement.
            if p.get("notificationAttemptId") != attempt_id:
                return
            p["notificationStatus"] = result
            db.execute(
                "UPDATE approval_outbox SET status=? WHERE id=?", (result, package_id)
            )
