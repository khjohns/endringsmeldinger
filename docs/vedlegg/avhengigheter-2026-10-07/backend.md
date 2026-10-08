# Python- og backend-avhengigheter

Dato: 2026-10-07. Lest lokalt tre på commit
`68ca0ea5b593808c4513dc84ab908baf12739cdb` og kartleggingen i PR #266 fra
`4c8860a84a4aa9f388818b38471593e5592fcfb8` med `git show`. Underlag til
avhengighetsvurderingen; ingen oppgradering eller produksjonsendring er utført.
Funnstatus og beslutninger står fortsatt bare i
[hovedplanen](../../plans/2026-09-16-godkjenning-og-varig-levering.md).
PR-kartleggingen gjelder M1 standpunkt, M2 krav/svar/aksept, M3 validering,
M4 handlinger og M5 offentlig kontrakt.

## Hvilke avhengigheter brukes, og hva kan oppgraderes?

### Konklusjon

Behold Flask og Pydantic mens domenekontrakten utformes. Gjør installasjonene
reproduserbare først, og ta deretter sikkerhets- og kompatibilitetsoppdateringer
i avgrensede grupper. De fleste deklarasjonene tillater nye hovedversjoner
ved hver installasjon. Pakkeoppgradering alene løser ikke problemene i M1–M5.

### Kildebelagte opplysninger

«Installert» er kjørt og observert med
`backend/venv/bin/python` og `importlib.metadata.version`, ikke systempython.
PyPI-kolonnen er verifisert 07.10.2026 fra offentlig JSON-endepunkt
`https://pypi.org/pypi/<pakke>/json`; dato er opplastingstid for utgivelsen.
Hver pakkenavnlenke viser til den eksakte kontrollerte utgivelsen. Dette er
utgivelsesmetadata, ikke resultat fra å løse eller installere nye krav.
Faktisk bruk er lest fra hele relevante moduler, importsøk i Python-kode,
skript, Makefile og CI. `—` betyr ikke installert i den lokale prosjekt-venv-en.

| Pakke | Deklarert | Installert | Aktuell stabil, utgitt | Faktisk bruk | Anbefaling |
| --- | --- | --- | --- | --- | --- |
| [Flask](https://pypi.org/project/Flask/3.1.3/) | `>=3.1.0` | 3.1.3 | 3.1.3, 19.02.2026 | `app.py`, 14 blueprints, auth/context, testklient | Behold, lås 3.1-serien og hevet sikkerhetsgulv |
| [Flask-CORS](https://pypi.org/project/Flask-CORS/6.0.5/) | `>=4.0.0` | 6.0.2 | 6.0.5, 08.06.2026 | `core/cors_config.py:setup_cors` | Oppdater innen 6.0 og test preflight/cookies/origins |
| [Werkzeug](https://pypi.org/project/Werkzeug/3.1.9/) | `>=3.1.0` | 3.1.6 | 3.1.9, 27.09.2026 | `HTTPException`, `secure_filename`, live-testserver, transitivt Flask | Oppdater med Flask; test Host, multipart og 413 |
| [Flask-Limiter](https://pypi.org/project/Flask-Limiter/4.1.1/) | `>=4.0.0` | 4.1.1 | 4.1.1, 06.12.2025 | `lib/security/rate_limiter.py`, submit/webhook-dekoratører | Allerede aktuell; felles lagring er viktigere enn versjon |
| [limits](https://pypi.org/project/limits/5.8.0/) | `>=5.0.0` | 5.8.0 | 5.8.0, 05.02.2026 | Flask-Limiters lagringsmotor; ingen direkte import funnet | Lås transitivt; direkte deklarasjon kan være bevisst kompatibilitetsgulv |
| [requests](https://pypi.org/project/requests/2.34.2/) | `>=2.32.0` | 2.32.5 | 2.34.2, 14.05.2026 | Catenda-mixins, `CatendaOAuth`, CLI/live-skript | Behold og oppdater sammen med urllib3 |
| [urllib3](https://pypi.org/project/urllib3/2.8.0/) | `>=2.6.0` | 2.6.3 | 2.8.0, 15.09.2026 | Direkte `Retry` i `CatendaClientBase._create_session` | Prioriter ny sikkerhetsutgivelse; verifiser retry/proxy/streaming |
| [httpx](https://pypi.org/project/httpx/0.28.1/) | `>=0.27.0` | 0.28.1 | 0.28.1, 06.12.2024 | `lib/supabase/exceptions.py`, Supabase-SDK, tester | Behold mens Supabase-stien finnes; OAuth bruker requests |
| [python-dotenv](https://pypi.org/project/python-dotenv/1.2.4/) | `>=1.2.0` | 1.2.2 | 1.2.4, 01.10.2026 | `app.py`, flere administrative skript | Lås; samordne med Settings, ikke fjern før skript er kartlagt |
| [pydantic](https://pypi.org/project/pydantic/2.13.5/) | `>=2.0.0` | 2.12.5 | 2.13.5, 28.08.2026 | Hendelser, tilstand, brev, prosjekter, API-modeller, dokumentverktøy | Behold v2; test serialisering og skjema før 2.13 |
| [pydantic-settings](https://pypi.org/project/pydantic-settings/2.15.0/) | `>=2.0.0` | 2.13.1 | 2.15.0, 07.08.2026 | `core/config.py:Settings` | Behold; eksplisitt filplassering og startvalidering |
| [python-json-logger](https://pypi.org/project/python-json-logger/4.2.0/) | `>=2.0.0` | 4.0.0 | 4.2.0, 15.08.2026 | `core/logging_config.py:CustomJsonFormatter` | Oppdater innen v4 og bruk ny modulsti |
| [reportlab](https://pypi.org/project/reportlab/5.0.1/) | `>=4.0.0` | 4.4.10 | 5.0.1, 20.08.2026 | `LetterPdfGenerator`, kontraktslive-test | Behold; v5 er egen kontrollert PDF-oppgradering |
| [python-dateutil](https://pypi.org/project/python-dateutil/2.9.0.post0/) | `>=2.9.0` | 2.9.0.post0 | 2.9.0.post0, 01.03.2024 | Ingen import i repoets Python-kode; også transitiv SDK-avhengighet | Kandidat for fjerning fra direkte krav, ikke fra transitive lock |
| [supabase](https://pypi.org/project/supabase/2.32.0/) | `>=2.27.0` | 2.28.0 | 2.32.0, 02.10.2026 | `lib/supabase/client.py` og eksisterende lagre/auth | Arkitekturagent dekker overgangen; fortsatt i bruk |
| [psycopg](https://pypi.org/project/psycopg/3.3.6/) | `[binary]==3.3.6` | 3.3.6 | 3.3.6, 18.09.2026 | `lib/db`, PostgreSQL-lagre, DB-tester, bevis-skript | Allerede aktuell og pinnet; behold |
| [psycopg-pool](https://pypi.org/project/psycopg-pool/3.3.3/) | `==3.3.3` | 3.3.3 | 3.3.3, 22.09.2026 | `lib/db/database.py:ConnectionPool` | Allerede aktuell og pinnet; behold |
| [gunicorn](https://pypi.org/project/gunicorn/26.2.0/) | `>=23.0.0` | 25.1.0 | 26.2.0, 24.08.2026 | Deklarert WSGI-server; ingen aktiv startkommando funnet i repo | Behold som deploy-kandidat til B-12 er avklart; ny major krever deploy-test |
| [azure-functions](https://pypi.org/project/azure-functions/2.3.0/) | `>=1.17.0` | 1.24.0 | 2.3.0, 28.08.2026 | Ingen aktiv `function_app.py`, `host.json` eller import funnet | Kandidat for fjerning/valgfri gruppe; v2 krever Python ≥3.13 |
| [azure-identity](https://pypi.org/project/azure-identity/1.26.0/) | `>=1.15.0` | 1.25.3 | 1.26.0, 01.10.2026 | Reserverte Azure-configfelt, ingen SDK-import funnet | Plattformagent dekker behov; ikke installer for hypotetisk fremtid |
| [azure-keyvault-secrets](https://pypi.org/project/azure-keyvault-secrets/4.11.3/) | `>=4.7.0` | 4.10.0 | 4.11.3, 02.10.2026 | `azure_keyvault_url` finnes, ingen klientbruk funnet | Kandidat for valgfri plattformgruppe |
| [pytest](https://pypi.org/project/pytest/9.1.1/) | `>=7.0.0` | 9.0.2 | 9.1.1, 19.06.2026 | Testport i begge Python-CI-jobber | Lås aktuell 9.x, ikke fortsett å erklære bare ≥7 |
| [pytest-cov](https://pypi.org/project/pytest-cov/7.1.0/) | `>=4.0.0` | 7.0.0 | 7.1.0, 21.03.2026 | `Makefile:test-cov`; plugin lastes lokalt | Behold for dekning; CI bruker foreløpig ikke dekning |
| [pytest-mock](https://pypi.org/project/pytest-mock/3.16.0/) | `>=3.10.0` | — | 3.16.0, 27.09.2026 | Ingen `mocker`-fixture/import funnet; unittest.mock/monkeypatch brukes | Kandidat for fjerning fra dev-krav |
| [ruff](https://pypi.org/project/ruff/0.16.10/) | `==0.16.8` | 0.16.8 | 0.16.10, 01.10.2026 | Begge CI-portene/Makefile og pyproject-regler | Behold pin; egen kontroll ved 0.16.10, ingen masseformattering |
| [mypy](https://pypi.org/project/mypy/2.4.0/) | `>=1.0.0` | — | 2.4.0, 01.10.2026 | `Makefile:check`, pyproject-konfig; ikke CI | Beslutt faktisk typeport først; ikke bytt verktøy uten baseline |
| [pytest-asyncio](https://pypi.org/project/pytest-asyncio/1.4.0/) | `>=0.21.0` | — | 1.4.0, 26.05.2026 | Ingen async-test/fixture-markør funnet | Kandidat for fjerning, ikke ukritisk hopp fra 0.x til 1.x |
| [faker](https://pypi.org/project/faker/40.41.0/) | `>=20.0.0` | — | 40.41.0, 05.10.2026 | Ingen `Faker`/faker-import eller fixture funnet | Kandidat for fjerning |
| [openpyxl](https://pypi.org/project/openpyxl/3.1.5/) | `>=3.1.0` | — | 3.1.5, 28.06.2024 | `docs/verktoy/datamodell.py` laster ved Excel-generering | Behold som dokumentverktøy; ikke erklær ubrukt |

**Siste stabile er ikke automatisk anbefalt mål.** For den første låste
baselinjen bør Pydantic 2.12.5, ReportLab 4.4.10 og pytest 9.0.2 beholdes som
kjente lokale versjoner, mens kjente sårbarheter kontrolleres separat.
Pydantic 2.13.5 og ReportLab 5.0.1 er kandidater etter skjema-/rundturtester
og PDF-kontroll, ikke ferdig verifiserte oppgraderingsmål. Pytest 9.1.1 er en
mindre oppdatering fra det installerte 9.0.2, men pluginer og hele samlingen
må kontrolleres fra ren installasjon. En ny installasjon med de åpne kravene
kan allerede velge disse nyere versjonene.

Python: `pyproject.toml` krever ≥3.11 og retter Ruff/MyPy mot 3.11; begge
Python-CI-jobbene bruker 3.11. Lokal venv er 3.11.9. Python.org oppgir
3.14.8 (30.09.2026) som siste stabile 3.14-utgivelse og 3.15 som pre-release;
3.11 får sikkerhetsrettinger til oktober 2027. Planlagt dato er ikke bevis
for utgivelse. [Utgivelser](https://www.python.org/downloads/),
[støtteoversikt](https://devguide.python.org/versions/).

### Vurderinger og grenser

Ingen Python-lockfil, `dependabot.yml`, Renovate-konfigurasjon eller
Python-avhengighetsaudit er funnet i repoet. CI installerer begge åpne kravfiler
uavhengig i backend- og databasejobben. Pip-cache gjør ikke dette til et låst
miljø. Pyproject er verktøykonfigurasjon og minimums-Python, uten prosjektets
avhengigheter. Dockerfile bygger og serverer frontend, og beviser ingen
backend-runtime. [CI](../../../.github/workflows/ci.yml),
[krav](../../../backend/requirements.txt),
[dev-krav](../../../backend/requirements-dev.txt),
[pyproject](../../../backend/pyproject.toml), [Dockerfile](../../../Dockerfile).

Azure Functions 2.3.0 kan ikke installeres på dagens Python3.11; pip vil velge
en kompatibel eldre utgivelse. PyPI viser 1.25.0 (05.08.2026, Python ≥3.10)
som aktuell kompatibel 1.x-utgivelse. Å oppdatere Python til 3.13+ kan dermed
også endre Azure Functions-major selv om samme kravfil brukes. Dette er
kompatibilitetsrisiko, ikke observert kjøre-feil.

## Hvilke tiltak løser konkrete behov?

### Konklusjon

Først låsing og sikkerhet i transportlaget. Dernest kan eksisterende Pydantic
funksjoner støtte M3/M5, men valg av domenets sannhetskilde må komme før store
modellomskrivinger. Tabellen er prioriterte forslag, ikke nye auditfunn eller
en parallell statusliste. Alvorlighet er ikke klassifisert uten egen
reproduksjon og nåbarhetsanalyse.

| Forslag | Prioritet | Begrunnelse | Alvorlighet |
| --- | --- | --- | --- |
| AVH-B-01 | 1 | Lås miljøene og kontroller kjente sårbarheter | Ikke klassifisert |
| AVH-B-02 | 1 | Oppdater Requests/urllib3 som én transportgruppe | Ikke klassifisert |
| AVH-B-03 | 2 | Flask/Werkzeug/CORS og allerede tilgjengelige grenser | Ikke klassifisert |
| AVH-B-04 | 2 | Hendelsesvarianter i Pydantic, sammen med M3 | Ikke klassifisert |
| AVH-B-05 | 2 | Eksplisitt offentlig respons og serialisering, sammen med M5 | Ikke klassifisert |
| AVH-B-06 | 2 | Kontrollert ReportLab5-oppgradering | Ikke klassifisert |
| AVH-B-07 | 3 | Settings og logging uten parallelle konfigurasjonskilder | Ikke klassifisert |
| AVH-B-08 | 3 | Fjern ubegrunnede direkte og dev-avhengigheter | Ikke klassifisert |
| AVH-B-09 | 3 | Målrettet typeport og sekvenstester for M1/M2/M4 | Ikke klassifisert |
| AVH-B-10 | 3 | Planlegg Python3.14, uten rammeverksbytte som forutsetning | Ikke klassifisert |

### AVH-B-01: Reproduserbare installasjoner før større oppgraderinger

**Fil/symbol:** kravfilene og `.github/workflows/ci.yml`, begge
«Installer avhengigheter»-steg. **Forslag:** Behold lesbare direkte krav som
inngang, generer låste runtime-/utviklingsfiler med transitive versjoner og
hashes, og la CI/deploy installere dem. `uv pip compile --generate-hashes`
kan brukes uten å migrere prosjektstruktur; alternativt pip-tools. En full
`uv`-prosjektmigrasjon er et separat valg. Sett eksplisitte hovedversjonsgrenser
der kompatibilitet faktisk er testet. Verktøyversjonen for lockgenerering
må også være kontrollert. [uv compile](https://docs.astral.sh/uv/pip/compile/),
[pip og hashes](https://pip.pypa.io/en/stable/topics/secure-installs/).

**Kompatibilitet:** Gjør først en låst baseline rundt det miljøet som faktisk
passerer portene; «låst» er ikke det samme som «uten sårbarheter». Legg til
`pip-audit` av de løste filene og en kontrollert oppdateringsprosess, eventuelt
Dependabot/Renovate. Audit gir kjente advisories, og erstatter ikke applikasjonens
sikkerhetstester. [pip-audit](https://github.com/pypa/pip-audit).
**Test:** Installer fra tomt miljø på samme Python/platform som CI, kjør alle
porter og kastbar PostgreSQL-jobb, kontroller `pip check`, og sammenlikn løste
versjoner i de to jobbene. **Arkitektur:** Uavhengig av M1–M5 og TS-kjerne;
produksjonsserver og plattformgrupper avhenger av B-12.

### AVH-B-02: Transportgruppen Requests/urllib3

**Fil/symbol:** `CatendaClientBase._create_session`, `_make_request` i
`integrations/catenda/base.py` og `CatendaOAuth._request` i
`lib/auth/catenda_oauth.py`. **Forslag:** Requests2.34.2 + urllib3 2.8.0 som én
avgrenset oppgradering. urllib3 2.8 har sikkerhetsrettinger for HTTPS-proxy TLS,
ubundet chunk-størrelseslinje og Deflate-loop. Dette prioriterer transport,
men beviser ingen utnyttelse i KOE. Requests2.33 fikser `extract_zipped_paths`;
ingen direkte bruk av denne utilityen er funnet. [urllib3-endringer](https://urllib3.readthedocs.io/en/stable/changelog.html),
[Requests-endringer](https://raw.githubusercontent.com/psf/requests/main/HISTORY.md).

**Kompatibilitet:** Proxy-TLS-konfigurasjon strammes i urllib3 2.8. Requests2.34
har egne typeannotasjoner. Python3.11 støttes. HTTPAdapter og Retry finnes
allerede; jitter, Retry-After, timeouts og adapter er ikke nye muligheter som
krever HTTP-klientbytte. Dagens retryliste inkluderer POST/PATCH, og både
adapteren og ytterløkken kan gjenta forbindelsesfeil. Verifiser antall forsøk
og idempotens før policyen eventuelt endres; dette er lest, ikke ny feiltest.
**Test:** eksisterende `test_catenda_client_retry.py`,
`test_catenda_mutation_contracts.py`, OAuth/auth-interaksjoner, dokumentopplasting
og timeout/proxy/redirect-kontroll. **Arkitektur:** Uavhengig av TS-kjerne;
leveringskøens semantikk er relevant før retry-policyendring.

HTTPX0.28.1 er allerede installert og siste verifiserte stabile. V0.28 fjernet
`proxies=`/`app=`, endret JSON-koding og strammet SSL-API. Ingen direkte bruk av
de fjernede argumentene er funnet. HTTPX er ikke den nåværende OAuth-klienten.
Det er ikke nok gevinst i et Requests→HTTPX-bytte nå til å omskrive Catenda-mixins,
feiltyper og tester. [HTTPX0.28](https://github.com/encode/httpx/releases/tag/0.28.0).

### AVH-B-03: Flask3.1-funksjoner som allerede er tilgjengelige

**Fil/symbol:** `app.py`-konfigurasjon, `setup_cors`, `init_limiter`.
**Forslag:** Hold Flask3.1.3, oppdater Werkzeug til3.1.9 og CORS til6.0.5 med
regresjonstest. Flask3.1.1/3.1.3 har sikkerhetsrettinger, og minimum3.1.0 er
derfor et svakt erklært gulv selv om lokal Flask er oppdatert.
[Flask-endringer](https://flask.palletsprojects.com/en/stable/changes/),
[Werkzeug-endringer](https://werkzeug.palletsprojects.com/en/stable/changes/),
[CORS-utgivelser](https://github.com/corydolphin/flask-cors/releases).

Nøkkelrotasjon, `MAX_FORM_MEMORY_SIZE` og `MAX_FORM_PARTS` brukes allerede.
`TRUSTED_HOSTS` og størrelse per request er tilgjengelige i Flask3.1, men ingen
bruk er funnet. Vurder eksplisitte hostnavn og mindre JSON-/webhookgrenser
enn vedleggsgrensen når hosting og driftsgrenser avklares. Dette er
konfigurasjonsmuligheter, ikke dokumenterte hostangrep.
Werkzeug3.1.9 endrer også håndtering av URL-encoded skjema slik at
`max_form_memory_size` ikke er grensen der, bare `max_content_length`.
Windows `safe_join`-advisory gjelder ikke uten Windows og denne lesestien;
lokal Mac og Linux-CI beviser ikke Windows-eksponering.

Limiter bruker allerede meta limits, headers og valgbare strategier. Dagens
`memory://` er per prosess; flerarbeider-deploy trenger felles lager og korrekt
proxy-/IP-grense. Skifte versjon løser ikke den grensen. Ikke legg til Redis
før plattform og drift er bestemt. [Limiter-konfigurasjon](https://flask-limiter.readthedocs.io/en/stable/configuration.html).
**Test:** ekte autorisert request, ukjent Host, CORS preflight/ikke-tillatt
origin, JSON/multipart over grensen og 429 på tvers av arbeidere.
**Arkitektur:** B-12/B-09, uavhengig av domenekjernens språk.

### AVH-B-04: Bruk taggede varianter for M3, uten å brekke historikken

**Fil/symbol:** `models/events.py:AnyEvent`, `parse_event`,
`ResponsEvent.valider_data_etter_spor`, `api/validators.py:validate_event_data`.
**Forslag:** Skill nye kommandoer fra lagrede hendelser og definer varianter
med `Literal`-tagg og diskriminert union. Dette kan gjøre gyldig kombinasjon
av spor, metode og data synlig både for typekontroll og JSON Schema.
`TypeAdapter` kan samle parsing og skjemaeksport. Dette finnes allerede i v2;
ingen2.13-oppgradering er nødvendig for kjernen av tiltaket.
[Taggede unioner](https://docs.pydantic.dev/latest/concepts/unions/).

Dagens parsing velger eksplisitt modell fra `event_type`, og responsens
før-validator velger dataklasse fra `spor`. Derfor er det feil å si at alt nå
avgjøres av usikker smart-unionmatching. Problemet er gjentatte typekart og
regler i API-modellen og domenet. Strukturelle varianter kan redusere denne
fordelingen; juridiske regler som trenger sakens tilstand må fortsatt ligge
i domenekjernen. Pydantic oppgir at smart-unionalgoritmen kan endres mellom
minorversjoner, så ikke gjør en slik heuristikk til hendelseskontrakt.

**Kompatibilitet:** `lagret=True` og `ValidationInfo.context` har allerede en
bevisst rolle for historiske hendelser. Bevar normalisering og gamle verdier
i en leser, og stram bare inn nye kommandoer. `model_validate(extra='forbid')`
fra2.12 kan støtte per-kall-grensen, men en ny request-DTO er klarere enn å
gjøre hele `SakEvent` streng. Sak-opprettelsens utypede `data` trenger egen
modell; et toppnivåflagg alene løser ikke dette. [Konfigurasjon](https://docs.pydantic.dev/latest/api/config/),
[2.12-endringer](https://pydantic.dev/articles/pydantic-v2-12-release).
**Test:** hele eventtypekatalogen, alle tre innsendinger,
historiske hendelse→CloudEvent→parse-rundturer, motstridende spor/data og
ukjente nøstede felt. **Arkitektur:** Avhenger av M3 og eierskapet til en mulig
TS-kjerne. Dersom TS eier domenet, behold Pydantic som transport-/historikkgrense;
ikke bygg samme domeneregler på nytt i begge språk.

### AVH-B-05: Eksplisitt offentlig DTO og stabil serialisering for M5

**Fil/symbol:** `lib/auth/event_visibility.py:public_state`, forseringsrutene,
`models/api_responses.py`, `CloudEventMixin.to_cloudevent`.
**Forslag:** Gjør offentlig respons til en egen lukket DTO/skjema, med én
projektering fra autorisert domenetilstand. Eksporter separat validerings-
og serialiseringsskjema. Eksisterende CloudEvents-skjema bruker allerede
`mode='serialization'`; dette er ikke en ubrukt funksjon.
`exclude_computed_fields` fra nyere v2 kan erstatte vedlikehold av en liste
over beregnede felt der formatet krever dette, men krever rundturtest.
[Serialisering](https://docs.pydantic.dev/latest/concepts/serialization/),
[modeller](https://docs.pydantic.dev/latest/concepts/models/).

**Kompatibilitet:** Team/prosjektfilteret må fremdeles kjøres før DTO-bygging.
Skjema/serializer er ikke autorisasjon. Ikke løs intern/offentlig grense med
2.13-funksjonen `polymorphic_serialization=True`: den tar med felter fra
underklasser, også felter som basisannotasjonen skjuler. `exclude_if` på
computed fields er heller ikke en access-policy. Modellens `frozen=True`
hindrer vanlig attributtsetting, men fryser ikke nøstede lister/dicts og
beviser ikke at journalen er append-only. [2.13-endringer](https://pydantic.dev/articles/pydantic-v2-13-release).
**Test:** alle responsrutene, mutation-responsene, forsering/EO,
notatmetadata for samme/annet/ukjent team og et nytt internt felt som aldri
skal nå API/brev. **Arkitektur:** M5; selve DTO-grensen kan bygges uavhengig,
men det avledede innholdet bestemmes av M1–M4/TS-valget.

### AVH-B-06: ReportLab5 som egen oppgradering

**Fil/symbol:** `services/letter_pdf_generator.py:LetterPdfGenerator`,
`lib/pdf_markdown.py:markdown_to_reportlab`, `test_pdf_security.py`.
**Forslag:** Evaluer5.0.1 som siste stabile og lås valgt versjon. Offisiell
sdist `CHANGES.md` sier at5.0 gjør `trustedHosts=None` til «ingen verter
stoles på» i `open_for_read`;5.0.1 anvender kontrollen på redirect-verter.
Metadata krever Python≥3.9, så3.11 er kompatibel. [ReportLab5.0.1](https://pypi.org/project/reportlab/5.0.1/),
[offisiell sdist](https://files.pythonhosted.org/packages/4a/51/dbe28534ae12c852f61be91f039f343305fd1f34f1c66b8de75afae7a525/reportlab-5.0.1.tar.gz).

**Kompatibilitet:** Dagens brev escapes før Paragraph-markup, og eksisterende
tester stenger bildefil-/URL-lesing fra fritekst. Ikke konkluder med SSRF i
denne flyten ut fra pakkens gamle rådgivning alene. Visuell PDF-regresjon,
sidebryting, æøå, lenker, tabeller og lange tekster er viktige siden brevet er
autoritativt. WeasyPrint gir HTML/CSS-gevinst, men innfører nettverks-/font-/native
runtime og omskriving uten å løse M1–M5; ingen dokumentert gevinst som nå
begrunner bytte. **Test:** eksisterende PDF-/Markdown-tester og rendering av
representative syntetiske brev på begge versjoner i isolerte miljøer.
**Arkitektur:** Brevkontrakten beholdes; runtime/pakkebygg avhenger av B-12.

### AVH-B-07: Samordne Settings og rydd deprecations

**Fil/symbol:** `core/config.py:Settings`, `app.py:load_dotenv`,
`core/cors_config.py`, `core/logging_config.py:CustomJsonFormatter`,
`models/project.py`, `models/sak_metadata.py`.
**Forslag:** Pydantic Settings kan allerede ta absolutt `_env_file`, aliases,
hemmeligheter og startvalidering. Bruk én autoritativ konfigurasjonsvei med
eksplisitt plassering i stedet for relativ `.env` kombinert med `os.getenv`
og eksisterende Settings-felt. Dette retter implementering, ikke bare versjon.
De kjente CFG-ID-ene avgjøres av hovedplanen. [Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/).

Testkjøringen observerte deprecated `pythonjsonlogger.jsonlogger` og
Pydantic `json_encoders` i de to nevnte modellene. Bruk
`pythonjsonlogger.json.JsonFormatter` og standard dato-serialisering eller
`field_serializer` når et særlig wireformat trengs. JSON-logger4.2 endrer
dict-logging slik at innkommende dict ikke muteres;4.0 endret parameter-navn
i formatter-metoder, så test den konkrete underklassen fremfor en generell
«kompatibel»-påstand. [Logger-endringer](https://nhairs.github.io/python-json-logger/latest/changelog/).
**Test:** start fra forskjellig arbeidsmappe, manglende/feil config,
syntetiske hemmeligheter som aldri vises, og faktisk formatert logg med request
ID og exception. **Arkitektur:** Mest uavhengig av domenet; Azure secrets
velges med plattformen.

### AVH-B-08: Smalere avhengighetsflate

**Fil/symbol:** runtime-/dev-krav, `Makefile`, `docs/verktoy/datamodell.py`.
**Forslag:** Vurder å fjerne de direkte kravene for dateutil, Faker,
pytest-mock og pytest-asyncio hvis bredt søk og en ren CI-installasjon bekrefter
at det ikke finnes eksterne kallere. Azure SDK-pakker går i en plattformgruppe
hvis aktiv bruk faktisk velges. Ikke fjern `httpx`, `openpyxl`, `gunicorn` eller
`limits` bare fordi de har få/ingen imports: henholdsvis SDK-feilklassifisering,
dynamisk Excel-generering, deploy-CLI og Limiter-transitiv bruk gjelder.
**Kompatibilitet:** Transitive pakker blir fortsatt med i lock når nødvendig;
direkte erklæring kan også uttrykke et bevisst minimum.
**Test:** samme porter fra tomt miljø, OpenAPI- og datamodell-/Excel-verktøy
som er aktive, og dokumenterte driftsskript. **Arkitektur:** Plattformgrupper
og Supabase-fjerning avhenger av B-12/TS2-02, øvrig dev-opprydding gjør ikke det.

### AVH-B-09: Typeport og sekvenstester før flere verktøybytter

**Fil/symbol:** `pyproject.toml:[tool.mypy]`, `Makefile:check`,
`models/events.py`, M1/M2/M4-projeksjonen.
**Forslag:** Mypy er deklarert og Makefile-kallet finnes, men det gater ikke CI
og mangler lokalt. Start med en avgrenset typekontroll av ren domenekjerne og
transporttyper, med eksplisitt baseline. Pydantic har en
[offisiell Mypy-plugin](https://docs.pydantic.dev/latest/integrations/mypy/);
vurder den før bytte til en ny checker. Ruff er bevisst pinnet; oppdatering er
ikke et argument for `ruff format .`.

Det mest relevante nye testbiblioteket er Hypothesis for hendelsessekvenser:
krav→svar→aksept→nytt krav→nytt svar, låst varsel, rett side/team og replay av
samme logg. Stateful testing genererer operasjoner og reduserer en feil til
en mindre sekvens. M1/M2 trenger dette mer enn tilfeldige navn fra Faker.
Dette anbefales som nytt arbeid; biblioteket er ikke installert eller prøvd
her. [Hypothesis stateful](https://hypothesis.readthedocs.io/en/latest/stateful.html).
**Test:** invariants mot en uavhengig referansemodell/kontrakteksempler,
ikke assertions som speiler samme implementering. **Arkitektur:** Ved TS-kjerne
kan tilsvarende testing gjøres med fast-check der; del testvektorer og
forventninger fremfor to parallelle regelsett.

### AVH-B-10: Python3.14 som kontrollert mål

**Fil/symbol:** CI-python-versjon, pyproject minimum/mål, runtimekonfigurasjon.
**Forslag:** Planlegg ordinær Python3.14.8 som kandidat.3.11 kan fortsatt
vedlikeholdes kortsiktig, men lokal3.11.9 er fra2024 og en ny sikkerhetspatch
i samme serie bør også vurderes. Ikke kombiner runtime-skifte, nye majors,
nytt rammeverk og TS-kjerne i én endring. Pydantic2.12 har støtte for3.14;
annotasjoner/lazy evaluering er relevante kompatibilitetspunkter.
[Python3.14](https://docs.python.org/3/whatsnew/3.14.html),
[Pydantic2.12](https://pydantic.dev/articles/pydantic-v2-12-release).
**Test:** CI-matrise gammel/ny runtime med de samme låste pakkene, alle DB-,
CloudEvents-, PDF- og auth-tester. Kontroller psycopg binary-wheels og faktisk
WSGI-worker/deploy. Ingen gevinst er målt for free-threaded Python; velg
vanlig build. **Arkitektur:** B-12 bestemmer deploy-støtten; TS-kjerne gjør
Python mindre sentral, men fjerner ikke behovet for vedlikehold av Python-adaptere.

## Hjelper FastAPI eller andre rammeverk, og hva er verifisert?

### Konklusjon

FastAPI gir automatisk OpenAPI, request-/response-modeller og ASGI. Det kan
være et godt adaptervalg hvis Python beholdes og asynkron I/O blir et reelt
behov. Et bytte nå flytter HTTP-laget og sikkerhetsdekoratørene, mens M1–M4
fortsatt krever et domenevalg. [FastAPI-funksjoner](https://fastapi.tiangolo.com/features/).

Flask async-views øker ikke i seg selv antallet samtidige requests per worker;
hver request holder en worker, og bakgrunnsoppgaver skal ikke startes som
vilkårlige tasks i viewet. Quart er nærmere Flask hvis ASGI senere blir
nødvendig, men også det må begrunnes av målt behov. [Flask async](https://flask.palletsprojects.com/en/stable/async-await/).

### Vurderinger

Ved delt TS-domenekjerne må det først velges hvor serveren kjører domenet:
TypeScript-server, en eksplisitt tjenestegrense eller en annen kontrollert
adapter. Å velge FastAPI løser ikke Python↔TS-grensen. En OpenAPI-kontrakt
kan forbedres med eksisterende Pydantic-skjema uten å endre autentisering,
CSRF, prosjekt/team-filter, journalen eller driftsserver samtidig.

Det er derfor ikke dokumentert tilstrekkelig grunnlag for FastAPI-, Quart-,
HTTPX- eller WeasyPrint-migrasjon som første tiltak. Det er en vurdering ut
fra kode og behov; ingen ytelses- eller migrasjonsprototype er kjørt.

### Verifikasjon og grenser

**Kjørt og observert:** pakkeversjoner og Python i prosjektets venv,
offisielle PyPI JSON-metadata, `pip check` («No broken requirements found»),
lesing i minnet av offisiell ReportLab5.0.1-sdist og følgende eksisterende tester:

```bash
cd backend
venv/bin/python -m pytest -q -p no:cacheprovider \
  tests/test_models/test_events.py \
  tests/test_models/test_event_parsing.py \
  tests/test_api/test_validators.py
```

Resultat: **198 passerte**, tre advarsler: én deprecated logger-modul og
to deprecated Pydantic `json_encoders`. Dette er belegg for den installerte
baselinjen, ikke for nye pakker. `pip check` kontrollerer avhengigheter til
allerede installerte pakker, og beviser ikke at alle deklarerte dev-pakker
er installert.

**Lest ut av koden:** imports og dynamiske kall i backend/skript/
dokumentverktøy, aktive Makefile-/CI-kommandoer, krav og runtime-deklarasjoner,
event-parsing, responsvalidering, CloudEvent-serialisering, offentlig state,
OAuth/HTTP-retry, PDF-escaping og eksisterende sikkerhetstester. PR266 er
lest fra git-objektet; den kartleggingsfila finnes ikke på lokal HEAD.

**Ikke kontrollert:** nye pakker i et installert miljø, full testsuite,
databasetester, faktisk deploy/produksjonsmiljø eller ekstern CI-konfig,
GitHub security alerts, full CVE-skanning, last/proxy/servermålinger,
visuell PDF-regresjon eller et rammeverksbytte. Ingen installasjon, migrasjon,
baseendring eller issueendring er utført av denne kartleggingsagenten.
Koordinatorens oppfølgingsissues er lenket fra den samlede vurderingen.
Dette innfører ingen ny funnstatus og overstyrer ingen beslutning i hovedplanen.
