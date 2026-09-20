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
        # Ingen default. Et fravær av X-Project-ID betyr at forespørselen ikke
        # oppgir noe prosjekt — ikke at den mener Oslobygg. Tidligere fylte et
        # fallback inn her, og en rad skrevet etterpå kunne ikke i ettertid
        # skilles fra en rad som virkelig hørte til Oslobygg.
        project_id = request.headers.get("X-Project-ID")
        g.project_id = project_id or None


def get_project_id() -> str | None:
    """
    Prosjektet denne forespørselen er autorisert for, eller None.

    None betyr at prosjektet er ukjent, og kallere skal behandle det som
    «ingen tilgang» framfor å gjette. Utenfor en forespørselskontekst finnes
    ingen autorisert kontekst i det hele tatt, og da er svaret også None.
    """
    try:
        return getattr(g, "project_id", None)
    except RuntimeError:
        # Utenfor Flask-forespørselskontekst
        return None
