"""
Project Context Middleware

Reads X-Project-ID header from requests and sets g.project_id.
Provides get_project_id() for use in repositories and services.
"""

import logging

from flask import Flask, g, request

logger = logging.getLogger(__name__)


def init_project_context(app: Flask) -> None:
    """Register before_request handler that sets g.project_id from header."""

    @app.before_request
    def set_project_id():
        project_id = request.headers.get("X-Project-ID")
        g.project_id = project_id or None


def get_project_id() -> str | None:
    """Prosjektet denne forespørselen er autorisert for, eller None.

    None betyr ukjent prosjekt. Kallere skal behandle det som «ingen tilgang».
    """
    try:
        return getattr(g, "project_id", None)
    except RuntimeError:
        return None


def krev_autorisert_prosjekt(hva: str) -> str:
    """Prosjektet denne skrivingen er autorisert for, ellers `PermanentError`.

    `PermanentError` og ikke `ValueError`: skrivestiene er retry-dekorert, og
    `with_retry` ville forsøkt et ukjent unntak på nytt.

    Args:
        hva: Hva som skrives, kun til feilmeldingen — «hendelse», «relasjon».
    """
    # Lazy: drar inn postgrest, og modulen lastes av alt som trenger prosjekt.
    from lib.supabase.exceptions import PermanentError

    prosjekt = get_project_id()
    if not prosjekt:
        raise PermanentError(
            f"Kan ikke skrive {hva} uten autorisert prosjekt. Skrivingen "
            "skjedde utenfor en forespørselskontekst, eller X-Project-ID manglet."
        )
    return prosjekt
