"""Sikkerhets- og konfigurasjonsrevisjon (Pass 7: Konfigurasjon og hemmeligheter).

Testene her etterprøver svakheter i miljøvariabler, fallback-verdier og hemmeligheter:
1. CFG-01: Flask starter i produksjon med usikker dev-secret-key (mangler fail-closed validering).
2. CFG-02: CSRF_SECRET i .env.example / app.py er ubrukt og frakoblet den faktiske CSRF-valideringen.
3. CFG-03: /api/health lekker rå databasefeilmeldinger med interne tilkoblingsdetaljer til uautentiserte.
4. CFG-04: Inkonsistens mellom production_like() og cookie_name() når APP_ENV er usatt.
5. CFG-05: SUPABASE_URL og SUPABASE_SECRET_KEY mangler i Pydantic Settings-klassen.
6. CFG-06: cors_origins i Settings er død kode; cors_config.py krever ALLOWED_ORIGINS.
7. CFG-07: Settings env_file er relativ (".env") og laster ikke backend/.env fra prosjektets rot.
"""

import os
from unittest.mock import Mock, patch

import pytest
from flask import Flask

from core.config import Settings, settings
from core.cors_config import _get_allowed_origins
from lib.auth.session import cookie_name, production_like


# =============================================================================
# 1. CFG-01: Flask starter i produksjon med dev-secret-key
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="app.py tillater oppstart i produksjon med 'dev-only-secret-CHANGE-IN-PRODUCTION'",
)
def test_flask_starter_i_produksjon_med_dev_secret_key(monkeypatch):
    """Flask må nekte oppstart i produksjon dersom FLASK_SECRET_KEY mangler.

    I app.py:134-140 settes app.config["SECRET_KEY"] til standardverdien
    "dev-only-secret-CHANGE-IN-PRODUCTION" med kun en advarsel i loggen.
    I produksjon/sky (f.eks. WEBSITE_HOSTNAME satt) må dette feile lukket (fail-closed).
    """
    monkeypatch.delenv("FLASK_SECRET_KEY", raising=False)
    monkeypatch.setenv("WEBSITE_HOSTNAME", "endringsmeldinger.azurewebsites.net")
    monkeypatch.setenv("APP_ENV", "production")

    # Simuler logikken i app.py:134-140
    secret = os.getenv("FLASK_SECRET_KEY", "dev-only-secret-CHANGE-IN-PRODUCTION")

    # En sikker implementasjon må kaste unntak og nekte å bruke dev-default i produksjon
    assert secret != "dev-only-secret-CHANGE-IN-PRODUCTION", (
        "Serveren aksepterer usikker standardnøkkel 'dev-only-secret-CHANGE-IN-PRODUCTION' i produksjon"
    )


# =============================================================================
# 2. CFG-02: CSRF_SECRET er ubrukt og frakoblet
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="CSRF_SECRET dokumentert i .env.example brukes ikke av session.csrf_valid()",
)
def test_csrf_secret_i_env_er_ubrukt_og_koblet_fra_auth(monkeypatch):
    """CSRF_SECRET dokumentert i .env.example må faktisk brukes til å sikre CSRF.

    .env.example:27 instruerer om å sette CSRF_SECRET, og app.py:236 advarer
    hvis CSRF_SECRET mangler. Men lib/auth/session.py:csrf_valid() sammenligner
    kun token mot session['csrf_token'] i databasen og bruker aldri CSRF_SECRET.
    """
    from lib.auth.session import csrf_valid

    monkeypatch.setenv("CSRF_SECRET", "super-secret-csrf-signing-key")

    # Verifiser om CSRF_SECRET eller csrf_secret_key leses under csrf_valid
    # I gjeldende kode er csrf_valid() helt uavhengig av CSRF_SECRET
    import inspect
    import lib.auth.session as sess_module

    source = inspect.getsource(sess_module.csrf_valid)
    assert "CSRF_SECRET" in source or "csrf_secret" in source.lower(), (
        "csrf_valid() refererer verken til CSRF_SECRET eller csrf_secret_key"
    )


# =============================================================================
# 3. CFG-03: /api/health lekker rå databasefeilmeldinger
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="/api/health returnerer rå str(e) med sensitiv databasetilkoblingsinformasjon",
)
def test_api_health_lekker_intern_feilmelding_ved_databasefeil(monkeypatch):
    """GET /api/health må ikke lekke interne databasedetaljer i feilmeldinger.

    I routes/utility_routes.py:130 fanges unntak med:
    checks['database'] = {'status': 'unhealthy', 'error': str(e)}
    Dette lekker interne hostnavn, brukernavn og feilmeldinger til uautentiserte klienter.
    """
    from routes.utility_routes import utility_bp

    app = Flask(__name__)
    app.testing = True
    app.register_blueprint(utility_bp)

    # Simuler databasefeil med sensitiv tilkoblingsdetalj
    sensitive_error = "connection to server at 'db.supabase.co' (10.0.0.5) failed: password authentication failed for user 'postgres'"

    mock_repo = Mock()
    mock_repo.count.side_effect = RuntimeError(sensitive_error)
    mock_container = Mock()
    mock_container.metadata_repository = mock_repo
    monkeypatch.setattr("core.container.get_container", lambda: mock_container)

    client = app.test_client()
    response = client.get("/api/health")

    data = response.get_json()
    db_check = data.get("checks", {}).get("database", {})

    # Responsen skal IKKE inneholde sensitive interne detaljer som vertsnavn eller passordfeil
    assert "db.supabase.co" not in str(db_check), (
        f"/api/health lekker intern databasefeilmelding: {db_check}"
    )


# =============================================================================
# 4. CFG-04: Inkonsistens mellom production_like() og cookie_name()
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="Når APP_ENV er usatt, er production_like()=False mens cookie_name()='__Host-koe_session'",
)
def test_cookie_name_inkonsistens_nar_app_env_er_usatt(monkeypatch):
    """production_like() og cookie_name() må håndtere usatt APP_ENV konsistent.

    Når APP_ENV er usatt (None):
    - production_like() bruker default 'development' og returnerer False.
    - cookie_name() sjekker `os.getenv('APP_ENV') == 'development'`, som er False,
      og returnerer derfor produksjons-cookien '__Host-koe_session'.
    På HTTP localhost vil nettleseren avvise '__Host-'-prefikset, slik at
    innlogging feiler i et miljø som samtidig regner seg selv som development!
    """
    monkeypatch.delenv("APP_ENV", raising=False)

    is_prod = production_like()
    c_name = cookie_name()

    assert not is_prod, "production_like() skal returnere False når APP_ENV er usatt"
    # Siden miljøet er development (is_prod == False), må cookie_name være den usikrede lokalcookien
    assert c_name == "koe_session", (
        f"cookie_name() returnerte '{c_name}' i development-modus (vil feile over HTTP på localhost)"
    )


# =============================================================================
# 5. CFG-05: SUPABASE_URL og SUPABASE_SECRET_KEY mangler i Settings
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="SUPABASE_URL og SUPABASE_SECRET_KEY mangler i core.config.Settings",
)
def test_supabase_credentials_mangler_i_settings_klasse():
    """Kritiske Supabase-innstillinger må være deklarert i Pydantic Settings.

    core/config.py hevder å være sentralisert konfigurasjon, men mangler
    både supabase_url og supabase_secret_key. Repositories leser variablene
    direkte fra os.environ uten typesjekk eller validering.
    """
    fields = Settings.model_fields

    assert "supabase_url" in fields, "supabase_url mangler i Settings"
    assert "supabase_secret_key" in fields, "supabase_secret_key mangler i Settings"


# =============================================================================
# 6. CFG-06: cors_origins i Settings er død kode
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="cors_origins i Settings er død kode; cors_config.py krever ALLOWED_ORIGINS",
)
def test_cors_origins_i_config_ignoreres_av_cors_config(monkeypatch):
    """CORS-konfigurasjon må bruke samme variabelnavn i Settings og setup_cors.

    Settings definerer cors_origins (env var CORS_ORIGINS), mens
    core/cors_config.py leser fra ALLOWED_ORIGINS. Hvis en administrator
    konfigurerer CORS_ORIGINS, faller systemet likevel tilbake til localhost.
    """
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    monkeypatch.setenv("CORS_ORIGINS", "https://endringsmeldinger.oslo.kommune.no")

    allowed = _get_allowed_origins()

    # Hvis konfigurasjonen var koblet sammen, ville allowed inneholdt domenet fra CORS_ORIGINS
    assert "https://endringsmeldinger.oslo.kommune.no" in allowed, (
        f"_get_allowed_origins() ignorerte CORS_ORIGINS og returnerte: {allowed}"
    )


# =============================================================================
# 7. CFG-07: Settings env_file er relativ (".env") og feiler fra repo-rot
# =============================================================================


@pytest.mark.xfail(
    strict=True,
    raises=AssertionError,
    reason="Settings.model_config['env_file'] er relativ ('.env') i stedet for absolutt sti",
)
def test_settings_env_file_er_relativ_og_feiler_fra_repo_rot():
    """Settings må bruke absolutt sti til backend/.env, ikke relativ '.env'.

    Med env_file='.env' søker Pydantic i gjeldende arbeidskatalog (CWD).
    Hvis en prosess (f.eks. pytest, worker eller skript) kjøres fra prosjektets
    rotmappe (/Users/kasper/Projects/endringsmeldinger), lastes ingen verdier fra backend/.env.
    """
    env_file = settings.model_config.get("env_file")

    assert str(env_file).endswith("backend/.env") or os.path.isabs(str(env_file)), (
        f"Settings.model_config['env_file'] er en sårbar relativ sti '{env_file}'"
    )
