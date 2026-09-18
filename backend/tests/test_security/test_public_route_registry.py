"""Hele ruteregisteret skal være klassifisert: autentisert, eller uttrykkelig offentlig.

En hel OAuth-flate lå i appen i ti auditrunder uten at noen oppdaget den (SA-01).
Den er fjernet, og denne testen er det som hindrer at en ny flate sniker seg inn:
enhver rute uten autentiseringsdekoratør må stå i listen under, og listen må
begrunnes. Testen leser kildekoden framfor å inspisere dekorerte funksjoner,
fordi en wrapper ikke kan skilles fra en annen i ettertid.
"""

import ast
import pathlib

import pytest

ROUTES = pathlib.Path(__file__).resolve().parents[2] / "routes"

# Dekoratører som gjør ruten utilgjengelig uten en verifisert identitet.
# limit_webhook er med fordi webhooken autentiseres av en hemmelig sti og
# signatur, ikke av en sesjon.
AUTH_DECORATORS = {
    "require_auth",
    "require_magic_link",
    "require_entra_auth",
    "limit_webhook",
}

# Ruter som med vilje er åpne, med begrunnelsen som gjelder.
OFFENTLIGE_RUTER = {
    "/": "Helsesjekk for plattformen; ingen data.",
    "/api/routes": "Ruteoversikt for utvikling. Bør vurderes fjernet, se RV-13.",
    "/api/magic-link/verify": "Svarer 410; lenken er erstattet av Catenda-innlogging.",
    "/api/health": "Driftsovervåking. Lekker i dag feiltekst, se RV-13.",
    "/api/health/catenda": "Driftsovervåking mot Catenda, se RV-13.",
    "/api/cloudevents/schemas": "Skjemadokumentasjon uten saksdata.",
    "/api/cloudevents/schemas/<event_type>": "Skjemadokumentasjon uten saksdata.",
    "/api/cloudevents/envelope-schema": "Skjemadokumentasjon uten saksdata.",
    "/api/cloudevents/all-schemas": "Skjemadokumentasjon uten saksdata.",
}


def _uautentiserte_ruter() -> set[str]:
    funnet = set()
    for path in sorted(ROUTES.glob("*.py")):
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            if not isinstance(node, ast.FunctionDef):
                continue
            navn, regler = set(), []
            for dekorator in node.decorator_list:
                if isinstance(dekorator, ast.Call):
                    attr = getattr(dekorator.func, "attr", None) or getattr(
                        dekorator.func, "id", None
                    )
                    if attr == "route" and dekorator.args:
                        argument = dekorator.args[0]
                        if isinstance(argument, ast.Constant):
                            regler.append(argument.value)
                    if attr:
                        navn.add(attr)
                else:
                    attr = getattr(dekorator, "attr", None) or getattr(
                        dekorator, "id", None
                    )
                    if attr:
                        navn.add(attr)
            if regler and not navn & AUTH_DECORATORS:
                funnet.update(regler)
    return funnet


def test_ingen_nye_offentlige_ruter():
    assert _uautentiserte_ruter() == set(OFFENTLIGE_RUTER), (
        "En rute uten autentisering er lagt til eller fjernet. Klassifiser den: "
        "legg på en autentiseringsdekoratør, eller før den opp i OFFENTLIGE_RUTER "
        "med begrunnelse."
    )


@pytest.mark.parametrize("prefiks", ["/oauth", "/api/oauth", "/.well-known", "/mcp"])
def test_supabase_oauth_flaten_er_borte(prefiks):
    """Appen logger inn med Catenda. Ingen Supabase-consent eller MCP-discovery."""
    from app import app as ekte_app

    treff = [
        str(regel) for regel in ekte_app.url_map.iter_rules() if str(regel).startswith(prefiks)
    ]
    assert treff == [], f"Uventet rute under {prefiks}: {treff}"


def test_supabase_tokenvalidatoren_er_fjernet():
    """Validatoren tok imot anonyme tokens og hadde ubetinget DISABLE_AUTH-bypass."""
    import lib.auth as auth

    assert not hasattr(auth, "require_supabase_auth")
    with pytest.raises(ImportError):
        __import__("lib.auth.supabase_validator")
