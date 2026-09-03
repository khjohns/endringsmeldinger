#!/usr/bin/env python3
"""Controlled live checks for Catenda API contracts.

The script uses a topic type outside the application's KOE/EO/forsering filter,
and only deletes resources it creates itself. Run from ``backend`` with
``--mutating`` to acknowledge the temporary writes.
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import UUID, uuid4

from reportlab.pdfgen import canvas

# Direct script execution puts ``backend/scripts`` on sys.path. Add the backend
# root before importing application modules, matching the other live scripts.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.config import settings
from integrations.catenda import CatendaClient

DOMAIN_TOPIC_TYPES = {"Krav om endringsordre", "Endringsordre", "Forsering"}
TOPIC_FIELDS = (
    "topic_type",
    "topic_status",
    "title",
    "priority",
    "labels",
    "assigned_to",
    "stage",
    "description",
    "due_date",
    "creation_date",
    "creation_author",
)


def _same_guid(left: str, right: str) -> bool:
    return left.replace("-", "").lower() == right.replace("-", "").lower()


def _canonical_guid(value: str) -> str:
    return str(UUID(value.strip()))


def _authenticated_client() -> CatendaClient:
    if not settings.catenda_client_id:
        raise RuntimeError("CATENDA_CLIENT_ID mangler")

    client = CatendaClient(
        client_id=settings.catenda_client_id,
        client_secret=settings.catenda_client_secret or None,
    )
    if settings.catenda_access_token:
        client.set_access_token(settings.catenda_access_token)
        if client.ensure_authenticated():
            return client

    if not settings.catenda_client_secret or not client.authenticate():
        raise RuntimeError("Kunne ikke autentisere mot Catenda")
    return client


def _create_contract_topic(
    client: CatendaClient,
    *,
    title: str,
    topic_type: str,
    topic_status: str,
    extra_fields: dict | None = None,
) -> dict:
    payload = {
        "title": title,
        "topic_type": topic_type,
        "topic_status": topic_status,
        **(extra_fields or {}),
    }
    url = (
        f"{client.base_url}/opencde/bcf/3.0/projects/"
        f"{client.topic_board_id}/topics"
    )
    response = client._safe_request(
        "POST", url, "Feil ved oppretting av kontraktstest-topic", json=payload
    )
    if response is None:
        raise RuntimeError("Catenda avviste oppretting av kontraktstest-topic")
    topic = response.json()
    if not isinstance(topic, dict) or not topic.get("guid"):
        raise RuntimeError("Topic-respons mangler guid")
    return topic


def _write_test_pdf(path: Path, text: str) -> None:
    pdf = canvas.Canvas(str(path))
    pdf.drawString(72, 760, text)
    pdf.save()


def _related_guids(relations: list[dict]) -> set[str]:
    result: set[str] = set()
    for relation in relations:
        guid = relation.get("related_topic_guid")
        if isinstance(guid, str):
            result.add(_canonical_guid(guid))
    return result


def _wait_for_revision_count(
    client: CatendaClient,
    project_id: str,
    item_id: str,
    expected_count: int,
    timeout_seconds: float = 15,
) -> list[dict]:
    deadline = time.monotonic() + timeout_seconds
    while True:
        revisions = client.list_document_revisions(project_id, item_id)
        if len(revisions) >= expected_count:
            return revisions
        if time.monotonic() >= deadline:
            return revisions
        time.sleep(1)


def run_live_checks(*, mutating: bool, cross_board: bool = False) -> bool:
    if not mutating:
        raise RuntimeError("Bruk --mutating for å opprette og rydde testressurser")
    if (
        not settings.catenda_project_id
        or not settings.catenda_topic_board_id
        or not settings.catenda_library_id
    ):
        raise RuntimeError(
            "CATENDA_PROJECT_ID, CATENDA_TOPIC_BOARD_ID og "
            "CATENDA_LIBRARY_ID må være satt"
        )

    client = _authenticated_client()
    project_id = settings.catenda_project_id
    configured_library_id = settings.catenda_library_id
    client.topic_board_id = settings.catenda_topic_board_id
    client.library_id = configured_library_id

    suffix = uuid4().hex[:10]
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    folder_id: str | None = None
    webhook_id: str | None = None
    topic_ids: list[tuple[str, str]] = []
    document_ids: list[str] = []
    document_reference: tuple[str, str] | None = None
    checks_ok = False
    cleanup_ok = True

    try:
        print("[1/7] Leser paginert library-liste og validerer document-library")
        libraries = client.list_libraries(project_id)
        configured_library = next(
            (
                library
                for library in libraries
                if _same_guid(str(library.get("id", "")), configured_library_id)
            ),
            None,
        )
        if not configured_library:
            raise RuntimeError("Konfigurert library finnes ikke i Catenda-responsen")
        if configured_library.get("type") != "document":
            raise RuntimeError("Konfigurert library har ikke type=document")
        print("      OK: konfigurert document-library funnet")

        print("[2/7] Oppretter og leser en midlertidig testmappe")
        folder = client.create_folder(
            project_id,
            f"codex-contract-probe-{timestamp}-{suffix}",
            parent_id=settings.catenda_folder_id or None,
        )
        if not folder or not folder.get("id"):
            raise RuntimeError("Catenda returnerte ingen ID for testmappen")
        folder_id = str(folder["id"])
        stored_folder = client.get_library_item(project_id, folder_id)
        top_level_type = stored_folder.get("type") if stored_folder else None
        document_type = (
            (stored_folder.get("document") or {}).get("type")
            if stored_folder
            else None
        )
        if "folder" not in (top_level_type, document_type):
            raise RuntimeError("Testmappen kunne ikke leses tilbake som type=folder")
        print(
            "      OK: folder-payload ble akseptert og lest tilbake "
            f"(type={top_level_type}, document.type={document_type})"
        )

        print("[3/7] Oppretter og sletter et midlertidig webhook-abonnement")
        webhook = client.create_webhook(
            project_id,
            f"https://example.invalid/catenda-contract-probe/{suffix}",
            event="model.created",
        )
        if not webhook or not webhook.get("id"):
            raise RuntimeError("Catenda returnerte ingen ID for testwebhook")
        webhook_id = str(webhook["id"])
        if not client.delete_webhook(project_id, webhook_id):
            raise RuntimeError("Testwebhook kunne ikke slettes")
        webhook_id = None
        print("      OK: webhook-payload og DELETE-respons ble akseptert")

        extensions = client.get_topic_board_extensions() or {}
        statuses = list(extensions.get("topic_status") or [])
        non_domain_types = [
            topic_type
            for topic_type in (extensions.get("topic_type") or [])
            if topic_type not in DOMAIN_TOPIC_TYPES
        ]
        if len(statuses) < 2 or not non_domain_types:
            raise RuntimeError(
                "Boardet må ha minst to statuser og én ikke-domene-topic-type"
            )
        topic_type = non_domain_types[0]
        initial_status, changed_status = statuses[:2]

        print("[4/7] Verifiserer statusoppdatering uten tap av topic-felter")
        seeded_fields: dict = {
            "description": f"Contract probe {suffix}",
            "due_date": "2030-01-15T12:00:00.000+0000",
        }
        if extensions.get("topic_label"):
            seeded_fields["labels"] = list(extensions["topic_label"][:2])
        if extensions.get("priority"):
            seeded_fields["priority"] = extensions["priority"][0]
        if extensions.get("users"):
            seeded_fields["assigned_to"] = extensions["users"][0]
        if extensions.get("stage"):
            seeded_fields["stage"] = extensions["stage"][0]

        topic_a = _create_contract_topic(
            client,
            title=f"CODEX-CONTRACT-A-{timestamp}-{suffix}",
            topic_type=topic_type,
            topic_status=initial_status,
            extra_fields=seeded_fields,
        )
        topic_a_id = str(topic_a["guid"])
        topic_ids.append((settings.catenda_topic_board_id, topic_a_id))
        before = client.get_topic_details(topic_a_id, select=TOPIC_FIELDS)
        if not before:
            raise RuntimeError("Kunne ikke lese status-testtopic før oppdatering")
        for field, requested_value in seeded_fields.items():
            if before.get(field) != requested_value:
                raise RuntimeError(f"Catenda bevarte ikke opprettet felt: {field}")

        if not client.update_topic(topic_a_id, topic_status=changed_status):
            raise RuntimeError("Statusoppdatering feilet")
        after = client.get_topic_details(topic_a_id, select=TOPIC_FIELDS)
        if not after or after.get("topic_status") != changed_status:
            raise RuntimeError("Ny topic-status kunne ikke leses tilbake")
        preserved_fields = {
            key for key in before if key in TOPIC_FIELDS and key != "topic_status"
        }
        changed_fields = {
            field
            for field in preserved_fields
            if before.get(field) != after.get(field)
        }
        if changed_fields:
            raise RuntimeError(
                "Statusoppdatering endret andre topic-felter: "
                f"{', '.join(sorted(changed_fields))}"
            )
        print(
            "      OK: status endret; øvrige returnerte BCF-felter bevart "
            f"({', '.join(sorted(preserved_fields))})"
        )

        print("[5/7] Verifiserer PDF-revisjoner og document reference")
        with TemporaryDirectory(prefix="catenda-contract-") as temp_dir:
            first_pdf = Path(temp_dir) / "first.pdf"
            second_pdf = Path(temp_dir) / "second.pdf"
            unique_pdf = Path(temp_dir) / "unique.pdf"
            _write_test_pdf(first_pdf, "Catenda contract revision one")
            _write_test_pdf(second_pdf, "Catenda contract revision two")
            _write_test_pdf(unique_pdf, "Catenda contract unique document")
            shared_name = f"codex-contract-{timestamp}-{suffix}.pdf"

            first_upload = client.upload_document(
                project_id,
                str(first_pdf),
                document_name=shared_name,
                folder_id=folder_id,
            )
            if not first_upload or not first_upload.get("id"):
                raise RuntimeError("Første PDF-opplasting feilet")
            shared_item_id = str(first_upload["id"])
            document_ids.append(shared_item_id)
            first_revisions = _wait_for_revision_count(
                client, project_id, shared_item_id, 1
            )
            if not first_revisions or not all(r.get("id") for r in first_revisions):
                raise RuntimeError("Første dokumentrevisjon mangler revisjons-ID")

            second_upload = client.upload_document(
                project_id,
                str(second_pdf),
                document_name=shared_name,
                folder_id=folder_id,
            )
            if not second_upload or not second_upload.get("id"):
                raise RuntimeError("Andre PDF-opplasting feilet")
            second_item_id = str(second_upload["id"])
            if not any(_same_guid(second_item_id, item) for item in document_ids):
                document_ids.append(second_item_id)
            if not _same_guid(shared_item_id, second_item_id):
                raise RuntimeError("Samme dokumentnavn opprettet et nytt library item")
            second_revisions = _wait_for_revision_count(
                client, project_id, shared_item_id, len(first_revisions) + 1
            )
            if len(second_revisions) != len(first_revisions) + 1:
                raise RuntimeError("Samme dokumentnavn opprettet ikke én ny revisjon")
            if not all(r.get("id") for r in second_revisions):
                raise RuntimeError("Dokumentrevisjon mangler revisjons-ID")
            if not all(r.get("name") == shared_name for r in second_revisions):
                raise RuntimeError("Revisjonsnavn samsvarer ikke med ønsket PDF-navn")

            # Document API returns compact item IDs, while the BCF endpoint in
            # Catenda expects the UUID representation with dashes.
            reference_document_guid = _canonical_guid(shared_item_id)
            reference = client.create_document_reference(
                topic_a_id,
                reference_document_guid,
                description="Temporary Catenda contract probe",
            )
            if not reference or not reference.get("guid"):
                raise RuntimeError("Oppretting av document reference feilet")
            reference_id = str(reference["guid"])
            document_reference = (topic_a_id, reference_id)
            references = client.list_document_references(topic_a_id)
            if not any(
                _same_guid(
                    str(item.get("document_guid", "")), reference_document_guid
                )
                for item in references
            ):
                raise RuntimeError("Document reference kunne ikke leses tilbake")

            unique_upload = client.upload_document(
                project_id,
                str(unique_pdf),
                document_name=f"codex-contract-unique-{timestamp}-{suffix}.pdf",
                folder_id=folder_id,
            )
            if not unique_upload or not unique_upload.get("id"):
                raise RuntimeError("Opplasting med unikt navn feilet")
            unique_item_id = str(unique_upload["id"])
            document_ids.append(unique_item_id)
            if _same_guid(unique_item_id, shared_item_id):
                raise RuntimeError("Unikt dokumentnavn gjenbrukte eksisterende item")
            print(
                "      OK: samme navn ga samme item og én ny revisjon; "
                "unikt navn ga nytt item; én reference ble lest tilbake"
            )

        print("[6/7] Verifiserer related_topics i samme board")
        topic_b = _create_contract_topic(
            client,
            title=f"CODEX-CONTRACT-B-{timestamp}-{suffix}",
            topic_type=topic_type,
            topic_status=initial_status,
        )
        topic_b_id = str(topic_b["guid"])
        topic_ids.append((settings.catenda_topic_board_id, topic_b_id))
        topic_c = _create_contract_topic(
            client,
            title=f"CODEX-CONTRACT-C-{timestamp}-{suffix}",
            topic_type=topic_type,
            topic_status=initial_status,
        )
        topic_c_id = str(topic_c["guid"])
        topic_ids.append((settings.catenda_topic_board_id, topic_c_id))

        if not client.create_topic_relations(topic_a_id, [topic_b_id]):
            raise RuntimeError("A→B-relasjonen feilet")
        a_after_b = _related_guids(client.list_related_topics(topic_a_id))
        b_after_a = _related_guids(client.list_related_topics(topic_b_id))
        if _canonical_guid(topic_b_id) not in a_after_b:
            raise RuntimeError("A→B kunne ikke leses fra A")
        reverse_relation_is_automatic = _canonical_guid(topic_a_id) in b_after_a

        if not client.create_topic_relations(topic_a_id, [topic_c_id]):
            raise RuntimeError("A→C-relasjonen feilet")
        a_after_c = _related_guids(client.list_related_topics(topic_a_id))
        c_after_a = _related_guids(client.list_related_topics(topic_c_id))
        if not {
            _canonical_guid(topic_b_id),
            _canonical_guid(topic_c_id),
        }.issubset(a_after_c):
            raise RuntimeError("A→C erstattet eller skjulte eksisterende A→B")
        reverse_c_is_automatic = _canonical_guid(topic_a_id) in c_after_a
        if reverse_relation_is_automatic != reverse_c_is_automatic:
            raise RuntimeError("Catenda ga inkonsistent reverse relation-semantikk")

        # Probe the server contract directly: does PUT replace the relation
        # collection or add to it? The application still uses GET–union–PUT so
        # it is safe under either behavior.
        relations_url = (
            f"{client.base_url}/opencde/bcf/3.0/projects/"
            f"{client.topic_board_id}/topics/{topic_a_id}/related_topics"
        )
        raw_put = client._safe_request(
            "PUT",
            relations_url,
            "Feil ved direkte kontroll av related_topics PUT-semantikk",
            json=[{"related_topic_guid": _canonical_guid(topic_b_id)}],
        )
        if raw_put is None:
            raise RuntimeError("Direkte related_topics PUT feilet")
        after_raw_put = _related_guids(client.list_related_topics(topic_a_id))
        put_replaces_collection = _canonical_guid(topic_c_id) not in after_raw_put
        reverse_text = "ja" if reverse_relation_is_automatic else "nei"
        put_text = "erstatter" if put_replaces_collection else "er additiv for"
        print(
            "      OK: klienten bevarte A→B etter A→C; "
            f"Catenda PUT {put_text} samlingen; automatisk reverse: {reverse_text}"
        )

        if not cross_board:
            print("[7/7] Cross-board related_topics hoppet over (bruk --cross-board)")
            checks_ok = True
            return checks_ok

        print("[7/7] Verifiserer related_topics på tvers av boards")
        boards = client.list_topic_boards(project_id)
        secondary_boards: list[tuple[str, dict]] = []
        for board in boards:
            board_id = str(board.get("project_id") or board.get("id") or "")
            if not board_id or _same_guid(
                board_id, settings.catenda_topic_board_id
            ):
                continue
            candidate_extensions = client.get_topic_board_extensions(board_id) or {}
            candidate_types = [
                candidate_type
                for candidate_type in (candidate_extensions.get("topic_type") or [])
                if candidate_type not in DOMAIN_TOPIC_TYPES
            ]
            candidate_statuses = candidate_extensions.get("topic_status") or []
            actions = candidate_extensions.get("project_actions") or []
            if candidate_types and candidate_statuses and "createTopic" in actions:
                secondary_boards.append((board_id, candidate_extensions))
        if not secondary_boards:
            raise RuntimeError(
                "Fant ikke sekundærboard med createTopic og ikke-domene-type"
            )

        # A board can permit topic creation while Catenda still rejects a
        # cross-board relation to it. Probe at most three eligible boards to
        # distinguish a board-specific ACL/configuration issue from a general
        # API behavior without generating excessive temporary resources.
        selected_secondary: tuple[str, dict, str] | None = None
        failed_board_count = 0
        for secondary_board_id, secondary_extensions in secondary_boards[:3]:
            secondary_type = next(
                candidate_type
                for candidate_type in secondary_extensions["topic_type"]
                if candidate_type not in DOMAIN_TOPIC_TYPES
            )
            secondary_status = secondary_extensions["topic_status"][0]
            client.topic_board_id = secondary_board_id
            topic_d = _create_contract_topic(
                client,
                title=f"CODEX-CONTRACT-D-{timestamp}-{suffix}",
                topic_type=secondary_type,
                topic_status=secondary_status,
            )
            topic_d_id = str(topic_d["guid"])
            topic_ids.append((secondary_board_id, topic_d_id))

            client.topic_board_id = settings.catenda_topic_board_id
            if client.create_topic_relations(topic_a_id, [topic_d_id]):
                selected_secondary = (
                    secondary_board_id,
                    secondary_extensions,
                    topic_d_id,
                )
                break
            failed_board_count += 1

        if not selected_secondary:
            raise RuntimeError(
                "Catenda avviste cross-board related_topics mot "
                f"{failed_board_count} separate boards"
            )

        secondary_board_id, secondary_extensions, topic_d_id = selected_secondary
        secondary_type = next(
            candidate_type
            for candidate_type in secondary_extensions["topic_type"]
            if candidate_type not in DOMAIN_TOPIC_TYPES
        )
        secondary_status = secondary_extensions["topic_status"][0]
        client.topic_board_id = secondary_board_id
        topic_e = _create_contract_topic(
            client,
            title=f"CODEX-CONTRACT-E-{timestamp}-{suffix}",
            topic_type=secondary_type,
            topic_status=secondary_status,
        )
        topic_e_id = str(topic_e["guid"])
        topic_ids.append((secondary_board_id, topic_e_id))

        client.topic_board_id = settings.catenda_topic_board_id
        a_after_d = _related_guids(client.list_related_topics(topic_a_id))
        if _canonical_guid(topic_d_id) not in a_after_d:
            raise RuntimeError("Cross-board A→D kunne ikke leses fra A")
        client.topic_board_id = secondary_board_id
        d_after_a = _related_guids(client.list_related_topics(topic_d_id))
        if _canonical_guid(topic_a_id) not in d_after_a:
            raise RuntimeError("Cross-board A→D var ikke synlig reverse fra D")

        client.topic_board_id = settings.catenda_topic_board_id
        if not client.create_topic_relations(topic_a_id, [topic_e_id]):
            raise RuntimeError("Cross-board A→E-relasjonen feilet")
        a_after_e = _related_guids(client.list_related_topics(topic_a_id))
        if not {
            _canonical_guid(topic_d_id),
            _canonical_guid(topic_e_id),
        }.issubset(a_after_e):
            raise RuntimeError("Cross-board A→E fjernet eksisterende A→D")
        client.topic_board_id = secondary_board_id
        e_after_a = _related_guids(client.list_related_topics(topic_e_id))
        if _canonical_guid(topic_a_id) not in e_after_a:
            raise RuntimeError("Cross-board A→E var ikke synlig reverse fra E")
        print(
            "      OK: to cross-board-relasjoner ble bevart og var automatisk "
            "synlige begge veier"
        )
        checks_ok = True
    finally:
        if document_reference:
            print("[cleanup] Sletter document reference")
            topic_id, reference_id = document_reference
            client.topic_board_id = settings.catenda_topic_board_id
            cleanup_ok = (
                client.delete_document_reference(topic_id, reference_id)
                and cleanup_ok
            )
        for board_id, topic_id in reversed(topic_ids):
            print("[cleanup] Sletter testtopic")
            client.topic_board_id = board_id
            cleanup_ok = client.delete_topic(topic_id) and cleanup_ok
        for document_id in reversed(document_ids):
            print("[cleanup] Sletter testdokument")
            cleanup_ok = (
                client.delete_library_item(project_id, document_id) and cleanup_ok
            )
        if webhook_id:
            print("[cleanup] Sletter testwebhook")
            cleanup_ok = client.delete_webhook(project_id, webhook_id) and cleanup_ok
        if folder_id:
            print("[cleanup] Sletter testmappe")
            cleanup_ok = (
                client.delete_library_item(project_id, folder_id) and cleanup_ok
            )
        if not cleanup_ok:
            raise RuntimeError("Live-sjekk fullført, men opprydding feilet")
    return checks_ok


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mutating",
        action="store_true",
        help="Tillat midlertidig opprettelse og sletting i Catenda-testprosjektet",
    )
    parser.add_argument(
        "--cross-board",
        action="store_true",
        help="Kjør også kontrakten for relasjoner mellom to topic boards",
    )
    args = parser.parse_args()

    try:
        return (
            0
            if run_live_checks(
                mutating=args.mutating, cross_board=args.cross_board
            )
            else 1
        )
    except Exception as exc:
        print(f"FEIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
