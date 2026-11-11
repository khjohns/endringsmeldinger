# Sikkerhets- og kvalitetsrevisjon: Konfigurasjon og hemmeligheter (.env, miljøvariabler, fallback, lekkasjer)

**Dato:** 18. september 2026  
**Område:** Konfigurasjonshåndtering, hemmeligheter, `.env`-innlasting, fallback-verdier og informasjonslekkasje  
**Testfil:** `backend/tests/test_security/test_konfigurasjon_audit_20260918.py` (7 xfailed tester)  
**Status:** 7 svakheter identifisert og dokumentert med reproduserbare tester. Ingen produksjonskode er endret.

---

**Etterprøvd 2026-09-19** i [vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md), som vurderer alle 60
funnene fra pass 1–9 og grupperer dem i tolv rotårsaker. Funnene i dette dokumentet
er etterprøvd for CFG-01, CFG-02, CFG-03 og CFG-06, alle bekreftet. CFG-03 er
duplikat av RV-13, og de tre rutene står allerede oppført med begrunnelse i
`test_public_route_registry`. CFG-04, CFG-05 og CFG-07 er kun lest.

## Metodisk presisering

I tråd med revisjonskravene skiller rapporten strengt mellom tre kunnskapsnivåer:
1. **Kjørt og observert:** Faktisk atferd verifisert via kjøring i Pytest eller Python CLI.
2. **Lest ut av koden:** Direkte observasjon av implementasjonen i Python/Pydantic/Flask-kildekoden.
3. **Slutning:** Sikkerhetsmessige og forretningsmessige konsekvenser utledet av svakhetene.

---

## Sammendrag av funn

| ID | Alvorlighet | Kategori | Beskrivelse |
|---|---|---|---|
| **CFG-01** | **Kritisk** | Sikkerhet / Produksjon | Ufullstendig fail-closed oppstartsvalidering: Flask starter i produksjon/skymiljø med den offentlige standardnøkkelen `"dev-only-secret-CHANGE-IN-PRODUCTION"` dersom `FLASK_SECRET_KEY` mangler. |
| **CFG-02** | **Høy** | Falsk trygghet / Avvik | `CSRF_SECRET` i `.env.example` og oppstartsadvarsel er frakoblet den faktiske koden. CSRF-validering i `session.py` ignorerer hemmeligheten totalt. |
| **CFG-03** | **Høy** | Informasjonslekkasje | Uautentisert `/api/routes` eksponerer samtlige endepunkter, og `/api/health` returnerer rå `str(e)` som lekker interne vertsnavn og databasedetaljer ved feil. |
| **CFG-04** | **Middels** | Konsistens / Auth | Asymmetrisk miljøtolkning når `APP_ENV` er usatt: `production_like()` tolker miljøet som development, mens `cookie_name()` returnerer produksjons-cookien `"__Host-koe_session"` som feiler over HTTP. |
| **CFG-05** | **Middels** | Arkitektur / Fragmentering | Kritiske hemmeligheter (`SUPABASE_URL` og `SUPABASE_SECRET_KEY`) mangler i Pydantic `Settings` og leses uvalidert via rå `os.environ` i 7 ulike repositories. |
| **CFG-06** | **Høy** | CORS / Død kode | `cors_origins` i `Settings` (env var `CORS_ORIGINS`) er død kode; `cors_config.py` krever `ALLOWED_ORIGINS` og faller tilbake til localhost. |
| **CFG-07** | **Middels** | Arbeidskatalog / Skjørhet | Relativ `env_file=".env"` i `Settings` feiler stille ved oppstart fra repo-roten; settings lastes med tomme verdier. |

---

## Detaljert gjennomgang av funn

### CFG-01: Flask starter i produksjon med usikker dev-secret-key (mangler fail-closed validering)
* **Alvorlighet:** Kritisk
* **Kategori:** Sikkerhet / Produksjon
* **Berørte filer:**
  - `backend/app.py` (linje 134–140, 231–244, 338–344)
* **Kjørt og observert:**
  - Kjøring av `backend/tests/test_security/test_konfigurasjon_audit_20260918.py::test_flask_starter_i_produksjon_med_dev_secret_key` bekrefter at systemet aksepterer `"dev-only-secret-CHANGE-IN-PRODUCTION"` selv når `APP_ENV=production` og `WEBSITE_HOSTNAME` er satt.
* **Lest ut av koden:**
  - I `backend/app.py`:
    ```python
    app.config["SECRET_KEY"] = os.getenv(
        "FLASK_SECRET_KEY", "dev-only-secret-CHANGE-IN-PRODUCTION"
    )
    if app.config["SECRET_KEY"] == "dev-only-secret-CHANGE-IN-PRODUCTION":
        logger.warning(
            "⚠️  FLASK_SECRET_KEY not set - using dev default. Set in .env for production!"
        )
    ...
    if not os.getenv("FLASK_SECRET_KEY"):
        warnings.append("FLASK_SECRET_KEY ikke satt (bruker dev-default)")
    ```
  - `warnings`-listen skrives kun ut med gul tekst i terminalen før `app.run()` eksekveres ubetinget.
* **Slutning:**
  Dersom en container eller skytjeneste i Azure App Service startes uten eksplisitt definert `FLASK_SECRET_KEY`, feiler ikke applikasjonen lukket. Den starter opp med en allment kjent hemmelighet. En angriper kan utnytte dette til å forfalske kryptografiske sesjoner og omgå beskyttelsesmekanismer.

---

### CFG-02: `CSRF_SECRET` er ubrukt og frakoblet den faktiske CSRF-valideringen
* **Alvorlighet:** Høy
* **Kategori:** Falsk trygghet / Konfigurasjonsdrift
* **Berørte filer:**
  - `backend/.env.example` (linje 24–28)
  - `backend/app.py` (linje 235–236)
  - `backend/core/config.py` (linje 84–86)
  - `backend/lib/auth/session.py` (linje 59–63)
  - `backend/routes/auth_routes.py` (linje 95)
* **Kjørt og observert:**
  - Kjøring av testen `test_csrf_secret_i_env_er_ubrukt_og_koblet_fra_auth` bekrefter at kildekoden til `csrf_valid` verken leser `CSRF_SECRET` eller `csrf_secret_key`.
* **Lest ut av koden:**
  - `.env.example` ber driftsansvarlig generere `CSRF_SECRET`:
    ```bash
    # CSRF Protection Secret
    # Brukes til å signere CSRF-tokens
    CSRF_SECRET=CHANGE_ME_USE_STRONG_RANDOM_STRING
    ```
  - `app.py` har en oppstartsadvarsel:
    ```python
    if not os.getenv("CSRF_SECRET"):
        warnings.append("CSRF_SECRET ikke satt")
    ```
  - `core/config.py` definerer `csrf_secret_key: str = Field(default="dev-secret-key-change-in-production")`.
  - Imidlertid genererer `auth_routes.py` tokens via `secrets.token_urlsafe(32)` som lagres i sesjonsdatabasen, og `session.py` sjekker kun:
    ```python
    def csrf_valid() -> bool:
        session = load_session()
        value = request.headers.get("X-CSRF-Token", "")
        return bool(session and value and hmac.compare_digest(value, session["csrf_token"]))
    ```
* **Slutning:**
  Variabelen `CSRF_SECRET` er rent illusorisk. Administratorer tror at hemmeligheten beskytter og signerer CSRF-tokens, og roterer den ved mistanke om kompromittering, uten at det har noen som helst effekt på systemets sikkerhet.

---

### CFG-03: Uautentisert `/api/routes` og lekkasje av rå databasefeilmeldinger i `/api/health`
* **Alvorlighet:** Høy
* **Kategori:** Informasjonslekkasje
* **Berørte filer:**
  - `backend/routes/utility_routes.py` (linje 34–44, 128–132)
* **Kjørt og observert:**
  - Kjøring av testen `test_api_health_lekker_intern_feilmelding_ved_databasefeil` bekrefter at en `RuntimeError` med intern tilkoblingsstreng og vertsnavn returneres verbatim til klienten i JSON-responsen ved `GET /api/health`.
* **Lest ut av koden:**
  - I `routes/utility_routes.py`:
    ```python
    @utility_bp.route("/api/routes", methods=["GET"])
    def list_routes():
        ...
        return jsonify(sorted(routes, key=lambda x: x["path"]))
    ```
    Endepunktet krever ingen autentisering og returnerer samtlige registrerte endepunkter i Flask, inkludert interne strukturer som `/webhook/catenda/<secret_path>`.
  - I helsesjekken:
    ```python
    except Exception as e:
        logger.warning(f"Health check: Database unavailable - {e}")
        checks["database"] = {"status": "unhealthy", "error": str(e)}
        overall_status = "degraded"
    ```
* **Slutning:**
  Offentlig eksponering av alle ruter letter rekognosering for eksterne aktører. Lekkasje av rå databasefeilmeldinger i helsesjekker kan avsløre interne Supabase-vertadresser, IP-adresser, brukernavn og nettverksarkitektur.

---

### CFG-04: Asymmetrisk miljøtolkning når `APP_ENV` er usatt
* **Alvorlighet:** Middels
* **Kategori:** Konsistens / Autentisering
* **Berørte filer:**
  - `backend/lib/auth/session.py` (linje 15–26, 45–48)
* **Kjørt og observert:**
  - Kjøring av testen `test_cookie_name_inkonsistens_nar_app_env_er_usatt` bekrefter at når `APP_ENV` er usatt, returnerer `production_like()` `False` (utviklingsmodus), mens `cookie_name()` returnerer `"__Host-koe_session"` (produksjonsmodus).
* **Lest ut av koden:**
  - `production_like()` bruker eksplisitt default:
    `os.getenv("APP_ENV", "development").strip().lower() not in {"development", "test", "testing"}`
  - `cookie_name()` mangler default:
    `"koe_session" if os.getenv("APP_ENV") == "development" else "__Host-koe_session"`
* **Slutning:**
  Hvis `APP_ENV` ikke er satt i miljøet, tror forretningsreglene at de kjører i en lempelig utviklingskontekst, mens sesjonshåndteringen forsøker å sette en `__Host-`-cookie. Fordi `__Host-`-cookies avvises av moderne nettlesere over ukryptert HTTP (`http://localhost`), vil innlogging feile stille uten klar feilmelding for utviklere.

---

### CFG-05: Kritiske Supabase-hemmeligheter mangler i Pydantic `Settings`
* **Alvorlighet:** Middels
* **Kategori:** Arkitektur / Fragmentering
* **Berørte filer:**
  - `backend/core/config.py` (linje 12–172)
  - `backend/repositories/project_repository.py` (linje 31–32)
  - `backend/repositories/membership_repository.py` (linje 30–31)
  - `backend/repositories/relation_repository.py` (linje 57–58)
  - `backend/repositories/bim_link_repository.py` (linje 32–33)
  - `backend/repositories/supabase_event_repository.py` (linje 46–47)
* **Kjørt og observert:**
  - Kjøring av testen `test_supabase_credentials_mangler_i_settings_klasse` bekrefter at `Settings.model_fields` verken har `supabase_url` eller `supabase_secret_key`.
* **Lest ut av koden:**
  - Repositories utfører spredte oppslag direkte i `os.environ`:
    ```python
    self.url = url or os.environ.get("SUPABASE_URL")
    self.key = key or os.environ.get("SUPABASE_SECRET_KEY")
    ```
* **Slutning:**
  Pydantic Settings tilbyr typesikkerhet, masking (`repr=False`), trimming og tidlig validering ved oppstart. Ved å utelate applikasjonens mest kritiske nøkkel (`SUPABASE_SECRET_KEY`, som omgår all RLS) mister man kontroll over nøkkelintegriteten, og systemet krasjer sent under runtime dersom nøkkelen mangler.

---

### CFG-06: `cors_origins` i `Settings` er død kode; `cors_config.py` krever `ALLOWED_ORIGINS`
* **Alvorlighet:** Høy
* **Kategori:** CORS / Konfigurasjonsavvik
* **Berørte filer:**
  - `backend/core/config.py` (linje 94)
  - `backend/core/cors_config.py` (linje 7–10)
* **Kjørt og observert:**
  - Kjøring av testen `test_cors_origins_i_config_ignoreres_av_cors_config` viser at når `CORS_ORIGINS` settes til et produksjonsdomene og `ALLOWED_ORIGINS` er usatt, returnerer CORS-oppsettet utelukkende localhost-adressene.
* **Lest ut av koden:**
  - `core/config.py:94`:
    `cors_origins: str = "http://localhost:5173"`
  - `core/cors_config.py:7-10`:
    ```python
    def _get_allowed_origins():
        return [value.strip() for value in os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",") if value.strip()]
    ```
* **Slutning:**
  Dersom en driftstekniker følger `config.py` og setter `CORS_ORIGINS` for produksjon, ignoreres dette totalt. API-et vil enten blokkere den legitime produksjonsfrontend-en eller åpne for uønsket lokal trafikk.

---

### CFG-07: Relativ `env_file=".env"` i `Settings` feiler stille ved oppstart fra repo-roten
* **Alvorlighet:** Middels
* **Kategori:** Arbeidskatalog / Skjørhet
* **Berørte filer:**
  - `backend/core/config.py` (linje 166–171)
* **Kjørt og observert:**
  - Kjøring fra rotmappen:
    `PYTHONPATH=backend python3 -c "from core.config import settings; print(repr(settings.catenda_project_id))"`
    returnerer `''` (tom streng).
  - Kjøring fra `backend/`-mappen:
    `python3 -c "from core.config import settings; print(repr(settings.catenda_project_id))"`
    returnerer den faktiske ID-en fra `backend/.env`.
  - Testen `test_settings_env_file_er_relativ_og_feiler_fra_repo_rot` bekrefter at stien er relativ (`.env`).
* **Lest ut av koden:**
  - `model_config = SettingsConfigDict(env_file=".env", ...)` benytter en relativ sti som løses mot arbeidskatalogen til kjørende prosess (`os.getcwd()`).
* **Slutning:**
  Uavhengige skript, cron-oppgaver, migreringer eller bakgrunnstjenester som starter fra prosjektets rotkatalog vil feile stille og operere med tomme standardinnstillinger, selv om `backend/.env` er korrekt konfigurert.

---

## Verifikasjon og reproduksjon

Kjør alle testene i Pass 7:
```bash
./backend/venv/bin/pytest backend/tests/test_security/test_konfigurasjon_audit_20260918.py -v
```
**Resultat:** 7 xfailed (strengt håndhevet med `strict=True` og `raises=AssertionError`).
