"""Validate the transport envelope of supplied PDFs (not their active content)."""

import base64
import binascii


def decode_pdf(value: str) -> bytes:
    if not isinstance(value, str):
        raise ValueError("PDF må være en base64-streng.")
    try:
        data = base64.b64decode(value, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("PDF har ugyldig base64-koding.") from exc
    if not data.startswith(b"%PDF-"):
        raise ValueError("Vedlegget mangler PDF-signatur.")
    return data
