"""PDF input must never become ReportLab resource-loading markup."""

from unittest.mock import Mock

import pytest

from services.letter_pdf_generator import BrevPart, LetterPdfGenerator
from services.reportlab_pdf_generator import ReportLabPdfGenerator


@pytest.fixture
def image_reader(monkeypatch):
    reader = Mock(side_effect=RuntimeError("Unexpected resource access"))
    monkeypatch.setattr("reportlab.platypus.paraparser.ImageReader", reader)
    return reader


@pytest.mark.parametrize("field", ["navn", "adresse", "orgnr"])
@pytest.mark.parametrize(
    "source", ["https://example.invalid/image.png", "/private/tmp/private-image.png"]
)
def test_recipient_fields_are_plain_text(image_reader, field, source):
    values = {"navn": "Mottaker", "rolle": "TE", field: f'<img src="{source}"/>'}
    LetterPdfGenerator()._build_recipient(BrevPart(**values))
    image_reader.assert_not_called()


def test_report_body_does_not_load_images(image_reader):
    text = '<img src="https://example.invalid/image.png"/> **Viktig** & 1 < 2'
    paragraph = ReportLabPdfGenerator()._wrap_text(text)
    image_reader.assert_not_called()
    assert "Viktig" in paragraph.getPlainText()
    assert "& 1 < 2" in paragraph.getPlainText()


@pytest.mark.parametrize("field", ["navn", "rolle", "dato"])
def test_report_signatures_are_plain_text(image_reader, field):
    person = {"navn": "Ansatt", "rolle": "Leder", "dato": "2026-09-14"}
    person[field] = '<img src="https://example.invalid/image.png"/>'
    ReportLabPdfGenerator()._build_signature_section(person, person)
    image_reader.assert_not_called()


@pytest.mark.parametrize("auth_error", [False, True])
def test_temporary_pdf_removed_when_upload_raises(monkeypatch, tmp_path, auth_error):
    from types import SimpleNamespace

    from integrations.catenda import CatendaAuthError
    from routes import event_routes

    path = tmp_path / "contract.pdf"
    path.write_bytes(b"%PDF-test")
    monkeypatch.setattr(event_routes, "_prepare_catenda_context", lambda _: Mock())
    monkeypatch.setattr(
        event_routes,
        "_resolve_pdf",
        lambda *args: (str(path), "contract.pdf", "client"),
    )
    error = CatendaAuthError("Expired") if auth_error else RuntimeError("Upload failed")
    monkeypatch.setattr(event_routes, "_upload_and_link_pdf", Mock(side_effect=error))
    if auth_error:
        with pytest.raises(CatendaAuthError):
            event_routes._post_to_catenda("case", SimpleNamespace(), None, "topic")
    else:
        assert not event_routes._post_to_catenda(
            "case", SimpleNamespace(), None, "topic"
        )[0]
    assert not path.exists()


def test_failed_server_generation_removes_temporary_pdf(monkeypatch, tmp_path):
    from routes import event_routes

    monkeypatch.setattr(event_routes.tempfile, "tempdir", str(tmp_path))
    monkeypatch.setattr(event_routes, "_get_event_repo", lambda: Mock())
    monkeypatch.setattr(
        ReportLabPdfGenerator,
        "generate_pdf",
        Mock(side_effect=RuntimeError("Rendering failed")),
    )
    assert event_routes._resolve_pdf("case", None, None, None) == (None, None, None)
    assert list(tmp_path.iterdir()) == []


def test_valid_pdf_transport_roundtrips():
    import base64

    from lib.pdf_input import decode_pdf

    data = b"%PDF-1.4\nexample"
    assert decode_pdf(base64.b64encode(data).decode("ascii")) == data


def test_invalid_supplied_pdf_does_not_become_an_unrelated_report(monkeypatch):
    from routes import event_routes

    generate = Mock()
    monkeypatch.setattr(ReportLabPdfGenerator, "generate_pdf", generate)
    assert event_routes._resolve_pdf("case", None, "aGVsbG8=", None) == (
        None,
        None,
        None,
    )
    generate.assert_not_called()
