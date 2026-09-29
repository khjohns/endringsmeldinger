"""Hele ruteregisteret skal være klassifisert: autentisert, eller uttrykkelig offentlig.

En hel OAuth-flate lå i appen i ti auditrunder uten at noen oppdaget den (SA-01).
Den er fjernet, og denne testen er det som hindrer at en ny flate sniker seg inn:
enhver rute uten `require_auth` må stå i `OFFENTLIGE_RUTER`, og enhver
autentisert rute uten `require_project_access` må stå i `UTEN_PROSJEKT`, begge
med begrunnelse. Testen leser kildekoden framfor å inspisere dekorerte
funksjoner, fordi en wrapper ikke kan skilles fra en annen i ettertid. At
lesingen ser hver rute, kontrolleres mot `app.url_map` (DM-04).
"""

import ast
import pathlib

import pytest

ROUTES = pathlib.Path(__file__).resolve().parents[2] / "routes"

ROUTE_METODER = {
    "get": ["GET"],
    "post": ["POST"],
    "put": ["PUT"],
    "patch": ["PATCH"],
    "delete": ["DELETE"],
}

# Bare Catenda-innlogging (P1). require_magic_link og require_entra_auth gir
# verken Catenda-sesjon, CSRF-kontroll eller prosjektgrense.
AUTH_DECORATORS = {"require_auth"}

# Ruter som med vilje er åpne, med begrunnelsen som gjelder.
OFFENTLIGE_RUTER = {
    "GET /": "Helsesjekk for plattformen; ingen data.",
    "GET /api/routes": "Ruteoversikt for utvikling. Bør vurderes fjernet, se RV-13.",
    "GET /api/magic-link/verify": "Svarer 410; lenken er erstattet av Catenda-innlogging.",
    "GET /api/health": "Driftsovervåking. Lekker i dag feiltekst, se RV-13.",
    "GET /api/health/catenda": "Driftsovervåking mot Catenda, se RV-13.",
    "GET /api/cloudevents/schemas": "Skjemadokumentasjon uten saksdata.",
    "GET /api/cloudevents/schemas/<event_type>": "Skjemadokumentasjon uten saksdata.",
    "GET /api/cloudevents/envelope-schema": "Skjemadokumentasjon uten saksdata.",
    "GET /api/cloudevents/all-schemas": "Skjemadokumentasjon uten saksdata.",
    "GET /api/auth/catenda/login": (
        "Starter Catenda-innloggingen; brukeren har ingen sesjon ennå. Lagrer "
        "bare et innloggingsforsøk med hashet state og nettleserbinding."
    ),
    "GET /api/auth/catenda/callback": (
        "Tar imot Catendas OAuth-svar. Sesjonen opprettes bare når state og "
        "nettleserbindingen svarer til et uforbrukt innloggingsforsøk."
    ),
    "POST /webhook/catenda/<secret_path>": (
        "Catenda-webhooken har ingen sesjon. Den svarer 404 uten riktig "
        "WEBHOOK_SECRET_PATH, og er rate-begrenset med limit_webhook."
    ),
}

# Autentiserte ruter som med vilje ikke er bundet til ett prosjekt.
UTEN_PROSJEKT = {
    "GET /api/projects": "Prosjektlista; filtreres på brukerens medlemskap.",
    "POST /api/projects": (
        "Prosjektet finnes ikke ennå. Svarer 403 utenfor utviklingsmodus; "
        "prosjekter registreres av systemansvarlig."
    ),
    "GET /api/csrf-token": "Gjelder sesjonen, ikke et prosjekt.",
    "GET /api/auth/session": "Gjelder sesjonen, ikke et prosjekt.",
    "POST /api/auth/logout": "Gjelder sesjonen, ikke et prosjekt.",
}

# Ruter Flask legger inn selv, uten en funksjon i routes/.
RAMMEVERKETS_RUTER = {
    "GET /static/<path:filename>": (
        "Flasks statiske filservering. Appen har ingen statisk mappe, så ruta "
        "svarer 404; se test_den_statiske_ruta_serverer_ingenting."
    ),
}


def _konstant(node, fil, funksjon):
    if not isinstance(node, ast.Constant):
        pytest.fail(f"{fil}:{funksjon}: ruteargumentet er ikke en konstant og kan ikke leses")
    return node.value


def _blueprints(tre) -> dict[str, str | None]:
    """Blueprint-variabler i modulen, med url_prefix."""
    funnet = {}
    for node in ast.walk(tre):
        if not (isinstance(node, ast.Assign) and isinstance(node.value, ast.Call)):
            continue
        kall = node.value
        if getattr(kall.func, "id", None) != "Blueprint":
            continue
        prefiks = None
        for nokkel in kall.keywords:
            if nokkel.arg == "url_prefix":
                prefiks = _konstant(nokkel.value, "Blueprint", "url_prefix")
        for maal in node.targets:
            if isinstance(maal, ast.Name):
                funnet[maal.id] = prefiks
    return funnet


def _med_prefiks(prefiks: str | None, regel: str) -> str:
    """Som Flasks BlueprintSetupState.add_url_rule."""
    if prefiks is None:
        return regel
    if regel:
        return "/".join((prefiks.rstrip("/"), regel.lstrip("/")))
    return prefiks


def _dekoratornavn(dekorator) -> str | None:
    funksjon = dekorator.func if isinstance(dekorator, ast.Call) else dekorator
    return getattr(funksjon, "attr", None) or getattr(funksjon, "id", None)


def _registrering(dekorator, blueprints, fil, funksjon):
    """(sti, metoder) hvis dekoratøren registrerer en rute på en blueprint."""
    if not (
        isinstance(dekorator, ast.Call)
        and isinstance(dekorator.func, ast.Attribute)
        and isinstance(dekorator.func.value, ast.Name)
        and dekorator.func.value.id in blueprints
    ):
        return None
    attr = dekorator.func.attr
    if attr != "route" and attr not in ROUTE_METODER:
        return None
    if not dekorator.args:
        pytest.fail(f"{fil}:{funksjon}: ruta mangler sti")
    regel = _konstant(dekorator.args[0], fil, funksjon)
    metoder = ROUTE_METODER.get(attr, ["GET"])
    for nokkel in dekorator.keywords:
        if nokkel.arg == "methods":
            if attr != "route" or not isinstance(nokkel.value, ast.List | ast.Tuple):
                pytest.fail(f"{fil}:{funksjon}: methods kan ikke leses")
            metoder = [_konstant(m, fil, funksjon).upper() for m in nokkel.value.elts]
    sti = _med_prefiks(blueprints[dekorator.func.value.id], regel)
    return sti, metoder


def _ruter_i_kildekoden() -> dict[str, set[str]]:
    """«METODE sti» → dekoratørene som faktisk omslutter funksjonen ruta registrerer.

    En dekoratør over rutedekoratøren virker ikke på det Flask registrerer, og
    teller derfor ikke.
    """
    ruter: dict[str, set[str]] = {}
    for path in sorted(ROUTES.glob("*.py")):
        tre = ast.parse(path.read_text(encoding="utf-8"))
        blueprints = _blueprints(tre)
        for node in ast.walk(tre):
            if not isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
                continue
            dekoratorer = node.decorator_list
            for indeks, dekorator in enumerate(dekoratorer):
                registrert = _registrering(dekorator, blueprints, path.name, node.name)
                if registrert is None:
                    continue
                sti, metoder = registrert
                under = {_dekoratornavn(d) for d in dekoratorer[indeks + 1 :]}
                for metode in metoder:
                    nokkel = f"{metode} {sti}"
                    if nokkel in ruter:
                        pytest.fail(f"{nokkel} er registrert to ganger")
                    ruter[nokkel] = under - {None}
    return ruter


def _ruter_i_appen() -> set[str]:
    from app import app as ekte_app

    return {
        f"{metode} {regel.rule}"
        for regel in ekte_app.url_map.iter_rules()
        for metode in regel.methods - {"HEAD", "OPTIONS"}
    }


def test_lesingen_ser_hver_rute_i_appen():
    """En rute testen ikke ser, er en rute den ikke kan klassifisere (DM-04)."""
    lest = set(_ruter_i_kildekoden()) | set(RAMMEVERKETS_RUTER)
    registrert = _ruter_i_appen()
    assert registrert - lest == set(), (
        "Appen har ruter som lesingen av routes/ ikke fant. Registrer dem med "
        "@<blueprint>.route/.get/.post/.put/.patch/.delete i routes/, eller "
        "utvid lesingen."
    )
    assert lest - registrert == set(), (
        "Lesingen fant ruter appen ikke har, eller med en annen sti. Er "
        "blueprinten registrert, og med et annet url_prefix enn i Blueprint()?"
    )


def test_den_statiske_ruta_serverer_ingenting():
    from app import app as ekte_app

    assert ekte_app.static_folder is not None
    assert not pathlib.Path(ekte_app.static_folder).exists(), (
        "Appen har fått en statisk mappe. Begrunnelsen i RAMMEVERKETS_RUTER "
        "holder ikke lenger; vurder hva som serveres uten autentisering."
    )


def test_ingen_nye_offentlige_ruter():
    offentlige = {
        rute
        for rute, dekoratorer in _ruter_i_kildekoden().items()
        if not dekoratorer & AUTH_DECORATORS
    }
    assert offentlige == set(OFFENTLIGE_RUTER), (
        "En rute uten require_auth er lagt til eller fjernet. Klassifiser den: "
        "legg på require_auth under rutedekoratøren, eller før den opp i "
        "OFFENTLIGE_RUTER med begrunnelse."
    )


def test_autentiserte_ruter_har_prosjektgrense():
    uten_prosjekt = {
        rute
        for rute, dekoratorer in _ruter_i_kildekoden().items()
        if dekoratorer & AUTH_DECORATORS
        and "require_project_access" not in dekoratorer
    }
    assert uten_prosjekt == set(UTEN_PROSJEKT), (
        "En autentisert rute uten require_project_access er lagt til eller "
        "fjernet. Legg på require_project_access, eller før den opp i "
        "UTEN_PROSJEKT med begrunnelse."
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
