"""Regression tests for strict helpers in the live Catenda flow script."""

from unittest.mock import MagicMock

from scripts.test_full_flow import BaseTester


def make_tester(*, library_id="library-id"):
    client = MagicMock()
    tester = BaseTester(
        client=client,
        project_id="project-id",
        library_id=library_id,
        folder_id=None,
        topic_board_id="board-id",
    )
    return tester, client


def test_pdf_verification_fails_when_library_is_not_configured():
    tester, client = make_tester(library_id=None)

    assert tester.verify_pdf_upload("topic-id", timeout_seconds=0) is False
    client.list_document_references.assert_not_called()


def test_pdf_verification_succeeds_when_reference_exists():
    tester, client = make_tester()
    client.list_document_references.return_value = [
        {"guid": "reference-id", "description": "Letter"}
    ]

    assert tester.verify_pdf_upload("topic-id", timeout_seconds=0) is True
    client.list_document_references.assert_called_once_with("topic-id")


def test_pdf_verification_fails_at_timeout_without_reference():
    tester, client = make_tester()
    client.list_document_references.return_value = []

    assert tester.verify_pdf_upload("topic-id", timeout_seconds=0) is False
    client.list_document_references.assert_called_once_with("topic-id")
