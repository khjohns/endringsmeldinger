"""PDF input must never become ReportLab resource-loading markup."""

from unittest.mock import Mock

import pytest

from services.letter_pdf_generator import BrevPart, LetterPdfGenerator


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


MARKDOWN_MED_MARKUP = [
    '<img src="https://example.invalid/image.png"/>',
    '**<img src="/private/tmp/private-image.png"/>**',
    '[<img src="https://example.invalid/a.png"/>](https://example.invalid)',
    '- `<img src="https://example.invalid/b.png"/>`',
    '# <img src="https://example.invalid/c.png"/>',
]


@pytest.mark.parametrize("text", MARKDOWN_MED_MARKUP)
def test_letter_sections_do_not_load_images(image_reader, text):
    from services.letter_pdf_generator import (
        BrevInnhold,
        BrevReferanser,
        BrevSeksjoner,
    )

    part = BrevPart(navn="Part", rolle="TE")
    brev = BrevInnhold(
        tittel="Brev",
        mottaker=part,
        avsender=part,
        referanser=BrevReferanser(
            sak_id="SAK-1",
            sakstittel="Sak",
            event_id="hendelse-1",
            spor_type="grunnlag",
            dato="2026-10-01",
        ),
        seksjoner=BrevSeksjoner(innledning=text, begrunnelse=text, avslutning=text),
    )
    assert LetterPdfGenerator().generate_letter_pdf(brev).startswith(b"%PDF")
    image_reader.assert_not_called()


@pytest.mark.parametrize("auth_error", [False, True])
def test_temporary_pdf_removed_when_upload_raises(monkeypatch, tmp_path, auth_error):
    from types import SimpleNamespace

    from integrations.catenda import CatendaAuthError
    from routes import event_routes

    monkeypatch.setattr(event_routes.tempfile, "tempdir", str(tmp_path))
    monkeypatch.setattr(event_routes, "_prepare_catenda_context", lambda _: Mock())
    error = CatendaAuthError("Expired") if auth_error else RuntimeError("Upload failed")
    monkeypatch.setattr(event_routes, "_upload_and_link_pdf", Mock(side_effect=error))
    if auth_error:
        with pytest.raises(CatendaAuthError):
            event_routes._post_to_catenda(
                "case", SimpleNamespace(), None, "topic", letter_pdf=b"%PDF-test"
            )
    else:
        assert not event_routes._post_to_catenda(
            "case", SimpleNamespace(), None, "topic", letter_pdf=b"%PDF-test"
        )[0]
    assert list(tmp_path.iterdir()) == []
