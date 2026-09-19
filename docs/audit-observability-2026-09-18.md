# Sikkerhets- og kvalitetsrevisjon: Observability og revisjonsspor (logger, CloudEvents-sporbarhet, unntak)

**Dato:** 18. september 2026  
**Område:** Revisjonslogging, tilgangssporing, CloudEvents-etterlevelse, tidssonenøyaktighet og unntakshåndtering  
**Testfil:** `backend/tests/test_security/test_observability_audit_20260918.py` (6 xfailed tester)  
**Status:** 7 svakheter identifisert og dokumentert med reproduserbare tester. Ingen produksjonskode er endret.

---

**Etterprøvd 2026-09-19** i [vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md). OBS-02 er bekreftet:
ingen `abort(403)` finnes i `backend/routes/`, så `@app.errorhandler(403)` fyres
aldri. **OBS-01 er for sterkt formulert** — `audit` kalles fra
`catenda_webhook_routes.py:143` og `error_handlers.py:35,48`; det riktige funnet er
at ingen *forretningshendelse* revisjonslogges, og at 403-veien er død av grunnen
OBS-02 beskriver. De to er ett funn. **OBS-03 forskyver ingenting i dag**:
`tidsstempel` settes av serveren til `datetime.now(UTC)` og kan ikke sendes av
klienten, så tidssonekuttet gir riktig verdi. Reell kodesvakhet, men nedgradert.
**OBS-04 er bekreftet:** `cloudevents.py:109` har `... or "oslobygg"` med TODO
som erkjenner det, og `or` slår også inn på tom streng. OBS-05 til OBS-07 er kun
lest.

## Metodisk presisering

I tråd med revisjonskravene skiller rapporten strengt mellom tre kunnskapsnivåer:
1. **Kjørt og observert:** Faktisk atferd verifisert via kjøring i Pytest eller inspeksjon av filsystemet.
2. **Lest ut av koden:** Direkte observasjon av implementasjonen i Python/Flask/CloudEvents-kildekoden.
3. **Slutning:** Sikkerhetsmessige, juridiske og forretningsmessige konsekvenser utledet av svakhetene.

---

## Sammendrag av funn

| ID | Alvorlighet | Kategori | Beskrivelse |
|---|---|---|---|
| **OBS-01** | **Kritisk** | Revisjonsspor / Compliance | `AuditLogger` i `lib/monitoring/audit.py` er død kode i hele applikasjonsflyten. Ingen kravsendelser, godkjenninger, innlogginger eller saksbehandlinger logges til revisjonslogg. |
| **OBS-02** | **Høy** | Sikkerhetsobservability | `@app.errorhandler(403)` i `error_handlers.py` kalles aldri. Ruter returnerer `jsonify(), 403` direkte, slik at 100% av alle avviste tilgangsforsøk og CSRF-feil passerer uten sikkerhetslogging. |
| **OBS-03** | **Høy** | Dataintegritet / NS 8407 | `CloudEventMixin.ce_time` kutter tidssone-offset med `iso.split('+')[0] + 'Z'`, noe som forskyver tidsstempel med 2 timer (norsk sommertid) og korrumperer juridiske fristtidspunkter. |
| **OBS-04** | **Høy** | Sporbarhet / Multitenancy | `CloudEventMixin.ce_source` hardkoder `/projects/oslobygg/cases/...` for alle saker uten `prosjekt_id`, slik at hendelser fra andre leietakere feilaktig tilskrives Oslobygg KF. |
| **OBS-05** | **Middels** | Sporbarhet / E2E | `X-Request-ID` propageres ikke til hendelsestabeller eller CloudEvents. Det er umulig å koble en databasehendelse til den innkommende HTTP-forespørselen som skapte den. |
| **OBS-06** | **Middels** | Logginjeksjon / Entropi | `request_context.py` aksepterer overdimensjonert `X-Request-ID` uten sanitering, og servergenererte ID-er har kun 32-bits entropi (`uuid.hex[:8]`) med høy kollisjonsrisiko. |
| **OBS-07** | **Middels** | Informasjonslekkasje | `error_handlers.py` lekker rå `str(e)` med interne feilmeldinger og stier til klienten ved uforutsette feil når `FLASK_DEBUG=True` (standard i `.env.example`). |

---

## Detaljert gjennomgang av funn

### OBS-01: `AuditLogger` er død kode i hele applikasjonsflyten
* **Alvorlighet:** Kritisk
* **Kategori:** Revisjonsspor / Compliance
* **Berørte filer:**
  - `backend/lib/monitoring/audit.py` (linje 42–270)
  - `backend/routes/event_routes.py`
  - `backend/routes/auth_routes.py`
  - `backend/routes/approval_routes.py`
* **Kjørt og observert:**
  - Søk i hele kodebasen viser at `audit.log_event` kun kalles i `scripts/webhook_listener.py` og i testfilen `test_audit.py`.
  - Inspeksjon av `audit.log` i prosjektkatalogen viser kun 4 linjer generert fra webhook-tester. Ingen reelle hendelser har noen gang blitt logget.
* **Lest ut av koden:**
  - `lib/monitoring/audit.py` definerer en omfattende `AuditLogger` med JSON Lines-støtte for hendelsestyper som `auth`, `access`, `modify`, `security` og `webhook`.
  - Ingen av kjerneendepunktene i appen (verken `submit_event`, `approve_package`, `issue_order` eller innloggingsendepunktene i `auth_routes.py`) importerer eller kaller `audit.log_event()`.
* **Slutning:**
  Applikasjonen mangler fullstendig et uavhengig revisjonsspor for juridiske og økonomiske handlinger. I en tvist etter NS 8407 der en part bestrider hvem som godkjente et millionbeløp eller sendte et varsel, finnes det ingen manipulationssikker aktivitetslogg som dokumenterer handlingen uavhengig av den muterbare hendelsestabellen.

---

### OBS-02: 403-avvisninger omgår `error_handlers.py` og logges aldri
* **Alvorlighet:** Høy
* **Kategori:** Sikkerhetsobservability / Tilsyn
* **Berørte filer:**
  - `backend/routes/error_handlers.py` (linje 44–51)
  - `backend/lib/auth/session.py` (linje 92–94)
  - `backend/lib/auth/project_access.py` (linje 57–60)
  - `backend/routes/approval_routes.py` (linje 100)
* **Kjørt og observert:**
  - Kjøring av `backend/tests/test_security/test_observability_audit_20260918.py::test_403_avvisning_omgar_errorhandler_og_audit_logging` bekrefter at når en forespørsel avvises med 403 i `@require_auth` (f.eks. manglende CSRF-token), kalles aldri `errorhandler(403)` og `audit.log_access_denied()` blir aldri eksekvert.
* **Lest ut av koden:**
  - I `error_handlers.py`:
    ```python
    @app.errorhandler(403)
    def forbidden_handler(e):
        user = g.get("user", {})
        audit.log_access_denied(
            user=user.get("email", "anonymous"), resource=request.path, reason=str(e)
        )
        return jsonify({"error": "Forbidden", "detail": str(e)}), 403
    ```
  - Flasks `@app.errorhandler` fanger kun opp unntak (`abort(403)` / `HTTPException`).
  - Men `require_auth` og `require_project_access` kaster ikke unntak; de returnerer direkte en respons: `return jsonify(...), 403`.
* **Slutning:**
  Sikkerhetsovervåkingen er blind for angrep. Brute-force-forsøk, CSRF-angrep og uautoriserte IDOR-forsøk som avvises av dekoratørene genererer null revisjonsoppføringer, fordi feilhåndtereren aldri kobles inn.

---

### OBS-03: `CloudEventMixin.ce_time` kutter tidssone-offset og forskyver tidspunkt med 2 timer
* **Alvorlighet:** Høy
* **Kategori:** Dataintegritet / NS 8407
* **Berørte filer:**
  - `backend/models/cloudevents.py` (linje 139–151)
* **Kjørt og observert:**
  - Kjøring av testen `test_cloudevents_ce_time_korrumperer_tidssone_med_to_timer` bekrefter at et tidsstempel med norsk sommertid `2026-06-15T12:00:00+02:00` konverteres til `2026-06-15T12:00:00Z` i stedet for det korrekte `2026-06-15T10:00:00Z`.
* **Lest ut av koden:**
  - I `models/cloudevents.py`:
    ```python
    if isinstance(tidsstempel, datetime):
        iso = tidsstempel.isoformat()
        if "+" in iso:
            iso = iso.split("+")[0]
        elif iso.endswith("Z"):
            return iso
        return iso + "Z"
    ```
  - Koden fjerner strengen `+02:00` og erstatter den med `Z`, uten å justere klokkeslettet tilsvarende offset-forskjellen.
* **Slutning:**
  Dette medfører at alle hendelser opprettet i sommertid fremstår som inntruffet to timer i fremtiden når de formidles via CloudEvents. Etter NS 8407 §33.4 og §33.6, der dager og klokkeslett for varsling avgjør om et krav er prekludert, kan to timers feilforskyvning over midnatt eller helg avgjøre et millionsøksmål til fordel for feil part.

---

### OBS-04: `CloudEventMixin.ce_source` hardkoder Oslobygg KF for alle saker
* **Alvorlighet:** Høy
* **Kategori:** Sporbarhet / Multi-tenancy
* **Berørte filer:**
  - `backend/models/cloudevents.py` (linje 104–111)
* **Kjørt og observert:**
  - Kjøring av testen `test_cloudevents_ce_source_hardkoder_oslobygg_uten_prosjekt` bekrefter at en hendelse for en sak `KOE-BERGEN-001` uten satt `prosjekt_id` får `source: "/projects/oslobygg/cases/KOE-BERGEN-001"`.
* **Lest ut av koden:**
  - `ce_source` er implementert som:
    ```python
    proj_id = getattr(self, "prosjekt_id", None) or "oslobygg"
    sak_id = getattr(self, "sak_id", "unknown")
    return f"/projects/{proj_id}/cases/{sak_id}"
    ```
  - Siden hendelsestabellene mangler `prosjekt_id` (påvist i DB-06), har hendelser fra databasen alltid `prosjekt_id = None`.
* **Slutning:**
  I henhold til CloudEvents v1.0-spesifikasjonen skal `source` entydig identifisere konteksten hendelsen oppstod i. Ved å hardkode standardverdien `"oslobygg"` forurenser systemet hendelsesstrømmer i flerprosjekt- og multi-tenant-miljøer.

---

### OBS-05: Manglende ende-til-ende sporbarhet fra HTTP-forespørsel til databasehendelse
* **Alvorlighet:** Middels
* **Kategori:** Sporbarhet / E2E
* **Berørte filer:**
  - `backend/core/request_context.py` (linje 28–36)
  - `backend/models/events.py`
  - `backend/models/cloudevents.py`
  - `backend/routes/event_routes.py` (linje 371–620)
* **Kjørt og observert:**
  - Testen `test_hendelser_mangler_request_id_og_sporbarhet` bekrefter at hverken `SakEvent` eller `CloudEventMixin` har felter for `request_id`, `correlation_id` eller W3C `traceparent`.
* **Lest ut av koden:**
  - `request_context.py` genererer en `request_id` og legger den på `g.request_id`.
  - Denne verdien skrives kun til konsolloggen. Den sendes aldri inn i `event.data`, lagres ikke i databasen, og videreføres ikke ved publisering til eksterne systemer (Catenda).
* **Slutning:**
  Det er umulig å korrelere en hendelse lagret i hendelseslageret med HTTP-adgangsloggen, brukerens nettlesersesjon eller en spesifikk feilmelding i serverloggen.

---

### OBS-06: `request_context.py` aksepterer overdimensjonert `X-Request-ID` uten validering
* **Alvorlighet:** Middels
* **Kategori:** Logginjeksjon / Entropi
* **Berørte filer:**
  - `backend/core/request_context.py` (linje 30–34)
* **Kjørt og observert:**
  - Kjøring av testen `test_request_context_aksepterer_vilkarlig_header_uten_sanitering` bekrefter at en klient-header på over 1000 tegn med injisert loggtekst aksepteres rått og reflekteres i response-headers og loggfelter.
* **Lest ut av koden:**
  - I `request_context.py`:
    ```python
    request_id = request.headers.get("X-Request-ID")
    if not request_id:
        request_id = uuid.uuid4().hex[:8]
    g.request_id = request_id
    ```
  - Det finnes ingen lengdebegrensning, alfanumerisk mønstersjekk eller rensing.
  - I tillegg har den servergenererte fallback-ID-en kun 8 hex-tegn (32 bits entropi), som gir en betydelig kollisjonsrisiko i distribuerte systemer.
* **Slutning:**
  Klienter kan oversvømme loggfiler med vilkårlige payloads og manipulere logganalysesystemer.

---

### OBS-07: Lekkasje av rå unntaksdetaljer til klienter når debug-modus er aktiv
* **Alvorlighet:** Middels
* **Kategori:** Informasjonslekkasje / Feilhåndtering
* **Berørte filer:**
  - `backend/routes/error_handlers.py` (linje 64–75)
* **Kjørt og observert:**
  - Kjøring av testen `test_unhandled_exception_lekker_detaljer_i_debug_modus` bekrefter at når `app.debug = True`, returnerer feilhåndtereren den rå interne unntaksmeldingen (f.eks. database- og stidetaljer) i JSON-attributtet `detail`.
* **Lest ut av koden:**
  - I `error_handlers.py`:
    ```python
    @app.errorhandler(Exception)
    def handle_unexpected_error(e):
        ...
        return jsonify({
            "error": "Internal Server Error",
            "detail": str(e) if app.debug else "An unexpected error occurred.",
        }), 500
    ```
  - Siden `FLASK_DEBUG=True` er satt i `.env.example`, vil et system startet fra standardoppsettet lekke interne kildekodemeldinger til enhver bruker ved feil.
* **Slutning:**
  Interne implementasjonsdetaljer, databasefeil og serverstier eksponeres for brukere og potensielle angripere.

---

## Verifikasjon og reproduksjon

Kjør alle testene i Pass 8:
```bash
./backend/venv/bin/pytest backend/tests/test_security/test_observability_audit_20260918.py -v
```
**Resultat:** 6 xfailed (strengt håndhevet med `strict=True` og `raises=AssertionError`).
