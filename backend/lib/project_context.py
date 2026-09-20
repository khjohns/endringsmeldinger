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


def krev_autorisert_prosjekt(hva: str) -> str:
    """Prosjektet denne skrivingen er autorisert for, ellers en feil.

    Fail-closed: uten autorisert kontekst finnes det ikke noe prosjekt å
    tilskrive raden, og da skal den ikke skrives. Å gjette her ville
    gjenopprettet nøyaktig den tvetydigheten kolonnen `prosjekt_id` fjerner —
    en rad kunne ikke i ettertid skilles fra en som virkelig hørte til.

    Feilen er `PermanentError` og ikke `ValueError`, fordi skrivestiene er
    retry-dekorert: `with_retry` klassifiserer ukjente unntak som transiente og
    ville forsøkt på nytt, mens `PermanentError` slipper rett gjennom. Nye
    forsøk gir uansett ikke en forespørsel en kontekst den ikke hadde.

    Args:
        hva: Hva som skrives, kun til feilmeldingen — «hendelse», «relasjon».
    """
    # Lazy: lib.supabase.exceptions drar inn postgrest, og denne modulen lastes
    # av alt som trenger prosjektkontekst.
    from lib.supabase.exceptions import PermanentError

    prosjekt = get_project_id()
    if not prosjekt:
        raise PermanentError(
            f"Kan ikke skrive {hva} uten autorisert prosjekt. Skrivingen "
            "skjedde utenfor en forespørselskontekst, eller X-Project-ID manglet."
        )
    return prosjekt
