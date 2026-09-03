"""Mocked contract tests for Catenda mutation endpoints.

The contracts asserted here are derived from the checked-in Catenda OpenAPI
descriptions under ``docs/tredjepart-api``.  They deliberately exercise the
real mixin methods but replace their HTTP helpers, so no credentials or live
Catenda projects are involved.
"""

import json
from unittest.mock import Mock

import pytest

from integrations.catenda import CatendaClient

BASE_URL = "https://api.catenda.invalid"
PROJECT_ID = "project-guid"
BOARD_ID = "topic-board-guid"
LIBRARY_ID = "library-guid"
FOLDER_ID = "folder-guid"
TOPIC_GUID = "11111111-1111-1111-1111-111111111111"
EXISTING_TOPIC_GUID = "22222222-2222-2222-2222-222222222222"
NEW_TOPIC_GUID = "33333333-3333-3333-3333-333333333333"


class _Response:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class _InvalidJsonResponse:
    def json(self):
        raise ValueError("invalid JSON")


@pytest.fixture
def client():
    """A real client with all request methods mocked before use."""
    result = CatendaClient(client_id="test-client", access_token="test-token")
    result.base_url = BASE_URL
    result.topic_board_id = BOARD_ID
    result.library_id = LIBRARY_ID
    result.get_headers = Mock(return_value={"Authorization": "Bearer test-token"})
    return result


@pytest.fixture
def complete_topic():
    """Writable BCF fields plus Catenda fields that must not be copied to PUT."""
    return {
        "guid": TOPIC_GUID,
        "title": "Existing title",
        "topic_type": "Request",
        "topic_status": "Open",
        "priority": "High",
        "labels": ["Electrical"],
        "assigned_to": "external@example.invalid",
        "stage": "Construction",
        "description": "Existing description",
        "due_date": "2026-09-02T12:00:00.000+0000",
        "bimsync_assigned_to": {"user": {"id": "user-guid"}},
        "bimsync_custom_fields": [{"id": "field-guid", "value": "value"}],
        "bimsync_labels": [{"id": "label-guid"}],
        "bimsync_requester": {"team": {"id": "team-guid"}},
        "creation_date": "2026-08-01T12:00:00.000+0000",
        "creation_author": "creator@example.invalid",
    }


def test_status_update_gets_then_preserves_existing_topic_fields(
    client, complete_topic
):
    """A status-only change must not erase documented BCF topic fields."""
    client._safe_request = Mock(
        side_effect=[_Response(complete_topic), _Response({"guid": TOPIC_GUID})]
    )

    result = client.update_topic(TOPIC_GUID, topic_status="Closed")

    assert result == {"guid": TOPIC_GUID}
    get_call, put_call = client._safe_request.call_args_list
    assert get_call.args[:2] == (
        "GET",
        f"{BASE_URL}/opencde/bcf/3.0/projects/{BOARD_ID}/topics/{TOPIC_GUID}",
    )
    assert get_call.kwargs["params"] == {
        "$select": (
            "topic_type,topic_status,title,priority,labels,assigned_to,stage,"
            "description,due_date,creation_date,creation_author"
        )
    }
    assert put_call.args[:2] == (
        "PUT",
        f"{BASE_URL}/opencde/bcf/3.0/projects/{BOARD_ID}/topics/{TOPIC_GUID}",
    )
    assert put_call.kwargs["json"] == {
        "title": "Existing title",
        "topic_type": "Request",
        "topic_status": "Closed",
        "priority": "High",
        "labels": ["Electrical"],
        "assigned_to": "external@example.invalid",
        "stage": "Construction",
        "description": "Existing description",
        "due_date": "2026-09-02T12:00:00.000+0000",
        "creation_date": "2026-08-01T12:00:00.000+0000",
        "creation_author": "creator@example.invalid",
    }


def test_topic_update_preserves_falsey_fields_and_can_clear_description(
    client, complete_topic
):
    complete_topic["labels"] = []
    client._safe_request = Mock(
        side_effect=[_Response(complete_topic), _Response({"guid": TOPIC_GUID})]
    )

    client.update_topic(TOPIC_GUID, description="")

    payload = client._safe_request.call_args_list[1].kwargs["json"]
    assert payload["labels"] == []
    assert payload["description"] == ""


@pytest.mark.parametrize(
    "upload_response",
    [
        pytest.param(
            {"id": "item-guid", "name": "letter.pdf", "type": "document"},
            id="defensive-object-response",
        ),
        pytest.param(
            [{"id": "item-guid", "name": "letter.pdf", "type": "document"}],
            id="documented-list-response",
        ),
    ],
)
def test_pdf_upload_normalizes_response_shapes_and_uses_resolved_ids(
    client, tmp_path, upload_response
):
    """The documented list response and a defensive object response normalize alike."""
    pdf = tmp_path / "generated-source.pdf"
    pdf.write_bytes(b"%PDF-test")
    client._make_request = Mock(return_value=_Response(upload_response))

    result = client.upload_document(
        PROJECT_ID, str(pdf), document_name="letter.pdf", folder_id=FOLDER_ID
    )

    assert result == {"id": "item-guid", "name": "letter.pdf", "type": "document"}
    request = client._make_request.call_args
    assert request.args[:2] == (
        "POST",
        f"{BASE_URL}/v2/projects/{PROJECT_ID}/libraries/{LIBRARY_ID}/items",
    )
    assert request.kwargs["data"] == b"%PDF-test"
    assert request.kwargs["headers"]["Content-Type"] == "application/octet-stream"
    params = json.loads(request.kwargs["headers"]["Bimsync-Params"])
    assert params["name"] == "letter.pdf"
    assert params["document"]["type"] == "file"
    assert params["failOnDocumentExists"] is False
    assert params["parentId"] == FOLDER_ID


def test_pdf_upload_uses_requested_document_name_for_revision_filename(
    client, tmp_path
):
    """Bimsync-Params document.filename is the named Catenda document revision."""
    pdf = tmp_path / "generated-source.pdf"
    pdf.write_bytes(b"%PDF-test")
    client._make_request = Mock(
        return_value=_Response({"id": "item-guid", "name": "letter.pdf"})
    )

    client.upload_document(
        PROJECT_ID, str(pdf), document_name="letter.pdf", folder_id=FOLDER_ID
    )

    params = json.loads(
        client._make_request.call_args.kwargs["headers"]["Bimsync-Params"]
    )
    assert params["document"]["filename"] == "letter.pdf"


@pytest.mark.parametrize(
    "upload_response",
    [[], [{"id": "one"}, {"id": "two"}], {}, _InvalidJsonResponse()],
)
def test_pdf_upload_rejects_malformed_response(client, tmp_path, upload_response):
    pdf = tmp_path / "generated-source.pdf"
    pdf.write_bytes(b"%PDF-test")
    response = (
        upload_response
        if isinstance(upload_response, _InvalidJsonResponse)
        else _Response(upload_response)
    )
    client._make_request = Mock(return_value=response)

    assert client.upload_document(PROJECT_ID, str(pdf)) is None


def test_document_reference_accepts_single_item_list_response(client):
    """References must be robust to the documented list response as uploads are."""
    client._safe_request = Mock(
        return_value=_Response(
            [{"guid": "reference-guid", "document_guid": "item-guid"}]
        )
    )

    result = client.create_document_reference(TOPIC_GUID, "item-guid")

    assert result == {"guid": "reference-guid", "document_guid": "item-guid"}
    request = client._safe_request.call_args
    assert request.args[:2] == (
        "POST",
        f"{BASE_URL}/opencde/bcf/3.0/projects/{BOARD_ID}/topics/{TOPIC_GUID}/document_references",
    )
    assert request.kwargs["json"] == {"document_guid": "item-guid"}


@pytest.mark.parametrize(
    "reference_response",
    [
        [],
        [{"guid": "one"}, {"guid": "two"}],
        {},
        "not-an-object",
        _InvalidJsonResponse(),
    ],
)
def test_document_reference_rejects_empty_or_malformed_response(
    client, reference_response
):
    response = (
        reference_response
        if isinstance(reference_response, _InvalidJsonResponse)
        else _Response(reference_response)
    )
    client._safe_request = Mock(return_value=response)

    assert client.create_document_reference(TOPIC_GUID, "item-guid") is None


def test_related_topics_gets_unions_and_puts_topic_guids_without_loss(client):
    """A relation mutation preserves existing relations and uses topic GUIDs."""
    client._safe_request = Mock(
        side_effect=[
            _Response(
                [
                    {
                        "related_topic_guid": EXISTING_TOPIC_GUID.replace("-", ""),
                        "bimsync_issue_board_ref": "other-board-guid",
                        "bimsync_issue_number": 24,
                    },
                    {"related_topic_guid": EXISTING_TOPIC_GUID},
                ]
            ),
            _Response([]),
        ]
    )

    assert (
        client.create_topic_relations(
            TOPIC_GUID,
            [EXISTING_TOPIC_GUID, NEW_TOPIC_GUID, NEW_TOPIC_GUID.replace("-", "")],
        )
        is True
    )

    get_call, put_call = client._safe_request.call_args_list
    assert get_call.args[:2] == (
        "GET",
        f"{BASE_URL}/opencde/bcf/3.0/projects/{BOARD_ID}/topics/{TOPIC_GUID}/related_topics",
    )
    assert get_call.kwargs["params"] == {"includeBimsyncProjectTopics": "true"}
    assert put_call.args[:2] == (
        "PUT",
        f"{BASE_URL}/opencde/bcf/3.0/projects/{BOARD_ID}/topics/{TOPIC_GUID}/related_topics",
    )
    assert put_call.kwargs["json"] == [
        {"related_topic_guid": EXISTING_TOPIC_GUID},
        {"related_topic_guid": NEW_TOPIC_GUID},
    ]


def test_related_topics_empty_input_is_a_noop(client):
    client._safe_request = Mock()

    assert client.create_topic_relations(TOPIC_GUID, []) is True
    client._safe_request.assert_not_called()


@pytest.mark.parametrize(
    "existing_response", [None, _Response({}), _Response([{}]), _InvalidJsonResponse()]
)
def test_related_topics_get_failure_does_not_replace_relations(
    client, existing_response
):
    client._safe_request = Mock(return_value=existing_response)

    assert client.create_topic_relations(TOPIC_GUID, [NEW_TOPIC_GUID]) is False
    client._safe_request.assert_called_once()


def test_related_topics_rejects_internal_case_id_before_api_call(client):
    client._safe_request = Mock()

    assert client.create_topic_relations(TOPIC_GUID, ["SAK-20260902-120000"]) is False
    client._safe_request.assert_not_called()


def test_library_listing_uses_documented_pagination(client):
    first_page = [
        {"id": f"library-{index}", "name": f"Library {index}", "type": "document"}
        for index in range(1000)
    ]
    final_page = [
        {"id": "library-final", "name": "Final library", "type": "document"}
    ]
    client._safe_request = Mock(
        side_effect=[_Response(first_page), _Response(final_page)]
    )

    assert len(client.list_libraries(PROJECT_ID)) == 1001
    assert client._safe_request.call_args_list[0].kwargs["params"] == {
        "page": 1,
        "pageSize": 1000,
    }
    assert client._safe_request.call_args_list[1].kwargs["params"] == {
        "page": 2,
        "pageSize": 1000,
    }


def test_library_fallback_selects_only_document_library(client):
    client.list_libraries = Mock(
        return_value=[
            {"id": "classification-id", "name": "Documents", "type": "classification"},
            {"id": "document-id", "name": "Project files", "type": "document"},
        ]
    )

    assert client.select_library(PROJECT_ID, "Documents") is True
    assert client.library_id == "document-id"


def test_library_selection_fails_without_document_library(client):
    client.list_libraries = Mock(
        return_value=[
            {"id": "classification-id", "name": "Documents", "type": "classification"}
        ]
    )

    assert client.select_library(PROJECT_ID, "Documents") is False


def test_folder_creation_sends_both_documented_type_fields(client):
    client._safe_request = Mock(return_value=_Response({"id": FOLDER_ID}))

    assert client.create_folder(PROJECT_ID, "Letters") == {"id": FOLDER_ID}
    request = client._safe_request.call_args
    assert request.kwargs["json"] == {
        "name": "Letters",
        "type": "folder",
        "document": {"type": "folder"},
    }


@pytest.mark.parametrize("status_code", [200, 204])
def test_library_item_deletion_accepts_documented_and_defensive_statuses(
    client, status_code
):
    client._safe_request = Mock(return_value=_Response({}, status_code=status_code))

    assert client.delete_library_item(PROJECT_ID, FOLDER_ID) is True
    request = client._safe_request.call_args
    assert request.args[:2] == (
        "DELETE",
        f"{BASE_URL}/v2/projects/{PROJECT_ID}/libraries/{LIBRARY_ID}/items/{FOLDER_ID}",
    )


def test_document_revision_listing_uses_documented_pagination(client):
    first_page = [
        {"id": f"revision-{index}", "version": index + 1} for index in range(1000)
    ]
    final_page = [{"id": "revision-final", "version": 1001}]
    client._safe_request = Mock(
        side_effect=[_Response(first_page), _Response(final_page)]
    )

    assert len(client.list_document_revisions(PROJECT_ID, "item-guid")) == 1001
    expected_url = (
        f"{BASE_URL}/v2/projects/{PROJECT_ID}/libraries/{LIBRARY_ID}/items/"
        "item-guid/revisions"
    )
    first_call, second_call = client._safe_request.call_args_list
    assert first_call.args[:2] == ("GET", expected_url)
    assert first_call.kwargs["params"] == {
        "scope": "all",
        "page": 1,
        "pageSize": 1000,
    }
    assert second_call.kwargs["params"] == {
        "scope": "all",
        "page": 2,
        "pageSize": 1000,
    }


def test_document_reference_deletion_uses_documented_endpoint(client):
    client._safe_request = Mock(return_value=_Response({}, status_code=204))

    assert client.delete_document_reference(TOPIC_GUID, "reference-guid") is True
    request = client._safe_request.call_args
    assert request.args[:2] == (
        "DELETE",
        f"{BASE_URL}/opencde/bcf/3.0/projects/{BOARD_ID}/topics/"
        f"{TOPIC_GUID}/document_references/reference-guid",
    )


def test_webhook_creation_omits_undocumented_name(client):
    client._safe_request = Mock(
        return_value=_Response({"id": "webhook-id", "state": "ENABLED"})
    )

    client.create_webhook(
        PROJECT_ID,
        "https://callback.example.invalid/hook",
        event="issue.created",
        name="Legacy display name",
    )

    request = client._safe_request.call_args
    assert request.kwargs["json"] == {
        "event": "issue.created",
        "target_url": "https://callback.example.invalid/hook",
    }


@pytest.mark.parametrize("status_code", [200, 204])
def test_webhook_deletion_accepts_documented_and_defensive_statuses(
    client, status_code
):
    client._safe_request = Mock(return_value=_Response({}, status_code=status_code))

    assert client.delete_webhook(PROJECT_ID, "webhook-id") is True
