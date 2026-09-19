# Audit: eksterne integrasjoner (Pass 5) — 2026-09-18

Gjennomført 18. september 2026. Gjenstand:
Integrasjon mot Catenda API, webhook-mottak og autentisering, duplikatsikring,
hendelseskonvertering, BCF-kompatibilitet, vedleggs- og dokumenthåndtering samt
leveringsstatus for formelle meldinger
(`backend/routes/catenda_webhook_routes.py`, `backend/services/catenda_webhook_service.py`,
`backend/services/webhook_security.py`, `backend/routes/vedlegg_routes.py`,
`backend/services/catenda_service.py`, `backend/services/catenda_comment_generator.py`,
`backend/routes/event_routes.py`, `backend/services/delivery_status.py`).

Kryssreferanser:
- [audit-review-astra-2026-09-17.md](audit-review-astra-2026-09-17.md) (spesielt RV-10, RV-14, RV-21)
- [masterplanen for godkjenning og varig levering](plans/2026-09-16-godkjenning-og-varig-levering.md)
- [audit-autorisasjon-2026-09-18.md](audit-autorisasjon-2026-09-18.md) (Pass 2)
- [audit-godkjenning-fullmakt-2026-09-18.md](audit-godkjenning-fullmakt-2026-09-18.md) (Pass 4)
- [audit-tilstand-forretningsregler-2026-09-18.md](audit-tilstand-forretningsregler-2026-09-18.md) (Pass 3)
- Testfil: [test_integrasjoner_audit_20260918.py](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_integrasjoner_audit_20260918.py)

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

---

**Etterprøvd 2026-09-19** i [vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md), som vurderer alle 60
funnene fra pass 1–9 og grupperer dem i tolv rotårsaker. Funnene i dette dokumentet
er der lest og gruppert, men ikke reprodusert uavhengig — se dokumentets
avgrensning.

## Omfang

**Undersøkt:**
- Webhook-autentisering, hemmelighetsvalidering og timing-beskyttelse i `catenda_webhook_routes.py` og `webhook_security.py`.
- Feilhåndtering og transaksjonssikkerhet ved webhook-mottak (`is_duplicate_event`, HTTP 200 vs 500/retry).
- Validering av webhook-nyttelast og støttede hendelsestyper (`validate_webhook_event_structure`, BCF-eventer).
- Rolle- og tilgangshåndhevelse for saker opprettet via Catenda Webhook (`handle_new_topic_created`, `aktor_rolle`).
- Catenda-synkronisering og leveringsstatus ved batch-innsending av hendelser (`POST /api/events/batch`, `CatendaDeliveryStatus`).
- Multitenancy og prosjektkonfigurasjon for Catenda i `_prepare_catenda_context` og `vedlegg_routes.py`.
- Formatering av opprettelses- og varselkommentarer i Catenda (`CatendaCommentGenerator`, sakstype-nøkler).

**Bevisst ikke undersøkt i dette passet:**
- Autentisering av sluttbruker via Catenda OAuth2 (behandlet i Pass 2).
- Intern godkjenningsfullmakt for byggherre (behandlet i Pass 4).
- Databasens RLS-policyer og migreringer (behandlet i Pass 1).

---

## Sammendrag av funn

| ID | Alvorlighet | Kategori | Funn | Metode |
| --- | --- | --- | --- | --- |
| INT-01 | Middels | Sikkerhet / Timing | Webhook-hemmelighet sammenlignes uten konstant tid (`!=`), og hemmelig sti lekker i applikasjonsloggen | Kjørt og observert |
| INT-02 | Høy | Datatap / Integritet | Webhook-feil svelges med HTTP 200, og duplikatnøkkel reserveres slik at Catenda dropper retry og saken tapes | Kjørt og observert |
| INT-03 | Middels | Funksjonssvikt / Død kode | Sikkerhetsvalidator avviser BCF-hendelser med 400 Bad Request; rutehåndterere for BCF er død kode | Kjørt og observert |
| INT-04 | Høy | Sikkerhet / NS 8407 | Webhook tillater opprettelse av endringsordre med `aktor_rolle="TE"`, og omgår byggherrens godkjenningsport (RV-21) | Kjørt og observert |
| INT-05 | Høy | Integritet / Falsk trygghet | `POST /api/events/batch` dropper Catenda-levering, mens `CatendaDeliveryStatus` feilaktig rapporterer status som "clear" (RV-10) | Kjørt og observert |
| INT-06 | Middels | Flerprosjekt / Konfigurasjon | `_prepare_catenda_context` overstyrer sakens Catenda-prosjekt med globale `.env`-verdier; vedlegg feiler i flerprosjektmiljø | Kjørt og observert |
| INT-07 | Middels | UI / NS 8407-tekst | `CatendaCommentGenerator` slår opp `"koe"` i stedet for `"standard"`; nye KOE-saker får generisk fallback i Catenda | Kjørt og observert |

---

## Detaljerte funn

### INT-01: Usikker validering av webhook-hemmelighet og logglekkasje (Middels)

- **Fil og linje:** [`backend/routes/catenda_webhook_routes.py:110-116`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/catenda_webhook_routes.py#L110-L116)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_integrasjoner_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_integrasjoner_audit_20260918.py).
- **Forutsetninger:** Webhook-endepunktet mottar et kall på URL `/api/catenda/webhook/<secret_path>`.
- **Svakhet:**
  1. Koden benytter direkte ulikhet (`secret_path != expected_secret`) i stedet for konstanttids-sammenligning (`hmac.compare_digest`). Dette åpner for timing-angrep dersom en angriper prøver å gjette den hemmelige URL-stien.
  2. Ved feil logges deler av den mottatte hemmeligheten ukryptert:
     ```python
     logger.warning(f"Invalid webhook secret path received: {secret_path[:8]}...")
     ```
     Dersom den faktiske hemmeligheten deler prefiks med den gjettede stien, eller dersom en legitim hemmelighet sendes feilaktig, lekker hemmelige tegn inn i sentrale loggsystemer.
- **Konsekvens for NS 8407:**
  Catenda Webhooks brukes til å synkronisere formelle hendelser inn i endringsloggen. Kompromittering av webhook-hemmeligheten muliggjør injeksjon av falske hendelser eller forfalskede topics utenom autentisert grensesnitt.

---

### INT-02: Webhook-feil svelges med HTTP 200 og duplikatnøkkel reserveres (Høy)

- **Fil og linje:** [`backend/routes/catenda_webhook_routes.py:133-149`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/catenda_webhook_routes.py#L133-L149)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_integrasjoner_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_integrasjoner_audit_20260918.py).
- **Forutsetninger:** Catenda sender en `issue.created`-webhook for et nytt emne, men den underliggende behandlingen i `handle_new_topic_created` feiler (f.eks. på grunn av midlertidig I/O-feil, repository-lås eller uventet feilsvar).
- **Svakhet:**
  1. I rutehåndtereren sjekkes `is_duplicate_event(event_id)` før saksopprettelsen utføres. Dette registrerer `event_id` i `processed_events`-settet.
  2. Når `handle_new_topic_created` returnerer `{"success": False, "error": "Feilet under lagring"}`, svarer ruten likevel med HTTP 200 OK:
     ```python
     result = service.handle_new_topic_created(payload)
     return jsonify(result), 200
     ```
  3. Fordi Catenda mottar 200 OK, anser Catenda leveringen som vellykket.
  4. Dersom Catenda likevel skulle prøve igjen (retry), møtes forespørselen av:
     ```python
     if is_duplicate_event(event_id):
         return jsonify({"status": "already_processed"}), 202
     ```
- **Konsekvens for NS 8407:**
  Saken blir aldri opprettet i KOE-systemet, og hendelsen tapes fullstendig uten mulighet for gjenoppretting. Formelle krav eller pålegg som opprettes i Catenda forsvinner fra saksbehandlingen.

---

### INT-03: Sikkerhetsvalidator avviser BCF-hendelser med 400 Bad Request (Middels)

- **Fil og linje:** [`backend/services/webhook_security.py:197-208`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/webhook_security.py#L197-L208) og [`backend/routes/catenda_webhook_routes.py:147, 152`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/catenda_webhook_routes.py#L147-L152)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_integrasjoner_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_integrasjoner_audit_20260918.py).
- **Forutsetninger:** Catenda sender hendelser med BCF-standardiserte hendelsesnavn (`bcf.issue.created`, `bcf.comment.created`).
- **Svakhet:**
  Rutehåndtereren i `catenda_webhook_routes.py` har eksplisitte forgreninger for BCF-typer:
  ```python
  if event_type in ["issue.created", "bcf.issue.created"]:
      ...
  elif event_type in ["comment.created", "bcf.comment.created"]:
      ...
  ```
  Imidlertid kalles `validate_webhook_event_structure(payload)` først. I `webhook_security.py` er `SUPPORTED_EVENT_TYPES` definert som:
  ```python
  SUPPORTED_EVENT_TYPES = {
      "issue.created",
      "issue.updated",
      "comment.created",
      "document.uploaded",
  }
  ```
  BCF-typene finnes ikke i listen. Validatoren avviser dermed gyldige BCF-payloads med `400 Bad Request` og feilmelding `"Unsupported event type"`.
- **Konsekvens for NS 8407:**
  Forgreningene for BCF i rutehåndtereren er død kode. Dersom et prosjekt benytter BCF-konfigurerte webhooks fra Catenda, feiler all synkronisering med 400 Bad Request.

---

### INT-04: Webhook tillater TE å opprette endringsordre uten godkjenning (Høy)

- **Fil og linje:** [`backend/services/catenda_webhook_service.py:221, 260-264`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/catenda_webhook_service.py#L221-L264)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_integrasjoner_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_integrasjoner_audit_20260918.py).
- **Forutsetninger:** En bruker i Catenda oppretter et nytt Topic med emnetype `"Endringsordre"`. Catenda sender en webhook `issue.created` til systemet.
- **Svakhet:**
  I `WebhookService.handle_new_topic_created`:
  1. `topic_type` oversettes til sakstype:
     ```python
     if "endringsordre" in topic_type:
         sakstype = "endringsordre"
     ```
  2. Saksopprettelsen kaller deretter:
     ```python
     event = SakOpprettetEvent(
         sak_id=sak_id,
         sakstittel=title,
         sakstype=sakstype,
         aktor=author_name,
         aktor_rolle="TE",  # <--- Hardkodet TE uansett hvem som oppretter topic
         prosjekt_id=project_ctx.internal_project_id,
         catenda_topic_id=topic_id,
         ...
     )
     ```
  3. Koden sjekker verken forfatterens reelle rolle i prosjektet eller om forfatteren har byggherre-fullmakt.
- **Konsekvens for NS 8407:**
  Etter NS 8407 § 31.1 er det **kun byggherren** som kan utstede en endringsordre. Entreprenøren fremmer krav om endringsordre (§ 32.1). Videre omgår denne kodebanen fullstendig det strenge godkjenningskravet som håndheves på `/api/events` (RV-21 / GFK-01), slik at en endringsordre kan stiftes i systemet av en entreprenør uten godkjenning fra BH.

---

### INT-05: Batch-innsending dropper Catenda-levering og rapporterer feilaktig "clear" (Høy)

- **Fil og linje:** [`backend/routes/event_routes.py:647-845`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/event_routes.py#L647-L845) og [`backend/services/delivery_status.py:90-115`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/delivery_status.py#L90-L115)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_integrasjoner_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_integrasjoner_audit_20260918.py).
- **Forutsetninger:** En bruker sender inn formelle hendelser via batch-endepunktet `POST /api/events/batch` (som brukes av moderne frontend-flyter for atomære endringer).
- **Svakhet:**
  1. I enkelt-endepunktet `POST /api/events` kalles `_post_to_catenda(event, sak_id, ...)` og leveringen registreres i `CatendaDeliveryStatus`.
  2. I `POST /api/events/batch` appendes hendelsene til event-repositoryet, men det gjøres **aldri noe kall** til `_post_to_catenda` eller Catenda API.
  3. Videre oppretter ikke batch-endepunktet noen oppføring i leveringstabellen for de nye hendelses-ID-ene.
  4. Når klienten kaller `GET /api/cases/<sak_id>/context` for å sjekke leveringsstatus, gjør `CatendaDeliveryStatus.summary` en spørring mot leveringstabellen. Siden det ikke finnes noen rader for hendelsene (hverken `pending` eller `failed`), konkluderer den med:
     ```python
     return {"status": "clear", "pending_count": 0, "failed_count": 0}
     ```
- **Konsekvens for NS 8407:**
  Byggherren eller entreprenøren tror at varselet eller svaret er sendt over til motparten i Catenda. I realiteten ligger meldingen kun lokalt i backend-databasen. Dette skaper en falsk trygghet og fører til oversittelse av varslingsfrister etter NS 8407 § 5 og § 32.

---

### INT-06: `_prepare_catenda_context` overstyrer sakens prosjekt med globale `.env`-verdier (Middels)

- **Fil og linje:** [`backend/routes/event_routes.py:101-137`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/event_routes.py#L101-L137) og [`backend/routes/vedlegg_routes.py:53`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/vedlegg_routes.py#L53)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_integrasjoner_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_integrasjoner_audit_20260918.py).
- **Forutsetninger:** Systemet kjører i et miljø med flere prosjekter (multitenancy), der hver sak har tilhørende prosjekt-ID og Catenda-prosjekt/bibliotek registrert i sakens metadata.
- **Svakhet:**
  I `_prepare_catenda_context(sak_id)`:
  ```python
  catenda_config = settings.get_catenda_config()
  return CatendaContext(
      project_id=catenda_config.get("catenda_project_id", ""),
      library_id=catenda_config.get("catenda_library_id", ""),
      folder_id=catenda_config.get("catenda_folder_id", ""),
      ...
  )
  ```
  Metoden henter utelukkende `catenda_project_id` og `catenda_library_id` fra de globale miljøvariablene i `settings` (`CATENDA_PROJECT_ID`), og ignorerer fullstendig prosjektspesifikke innstillinger fra `sak_metadata` eller `CatendaProjectConfig`.
- **Konsekvens for NS 8407:**
  Dersom en sak tilhører et annet prosjekt enn det ene som er definert i `.env`, vil opplasting og nedlasting av vedlegg (`vedlegg_routes.py`) og kommentarposteringer forsøke å laste opp dokumenter til feil prosjekt eller feile med 502/503. Dokumenter kan dermed lekke på tvers av prosjekter i Catenda.

---

### INT-07: `CatendaCommentGenerator` slår opp `"koe"` i stedet for `"standard"` (Middels)

- **Fil og linje:** [`backend/services/catenda_comment_generator.py:128-145`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/catenda_comment_generator.py#L128-L145)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_integrasjoner_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_integrasjoner_audit_20260918.py).
- **Forutsetninger:** En sak opprettes med `sakstype="standard"` (som er standard sakstype for KOE i hele resten av kodebasen, f.eks. `SAKSTYPER = ["standard", "endringsordre", ...]`).
- **Svakhet:**
  `CatendaCommentGenerator` definerer oppslagstabellene:
  ```python
  sakstype_map = {
      "koe": "Krav om endringsordre",
      "endringsordre": "Endringsordre",
      ...
  }
  next_step_map = {
      "koe": "Entreprenør sender varsel (grunnlag)",
      ...
  }
  ```
  Når sakstypen er `"standard"`, feiler oppslaget, og koden faller tilbake til generisk tekst:
  - Tittel: `**Ny Sak opprettet**`
  - Neste steg: `**Neste steg:** Se sak for detaljer`
- **Konsekvens for NS 8407:**
  Partene i Catenda får ikke presis veiledning om at dette gjelder et formelt «Krav om endringsordre», og varselet om neste prosessuelle steg (varsling av grunnlag etter § 32.1) uteblir.

---

## Samlet vurdering av eksterne integrasjoner

Integrasjonslaget mot Catenda bærer preg av å være bygget for ett enkelt testprosjekt (`single-tenant`) og mangler robusthet på to kritiske områder:
1. **Transaksjonell sikkerhet ved levering:** Batch-innsendinger av hendelser når aldri Catenda, og feilstatus rapporteres som friskmeldt (`clear`), mens feilende webhooks svelges med HTTP 200 slik at uopprettede saker tapes permanent.
2. **Rollehåndhevelse ved mottak:** Webhook-mottaket respekterer ikke NS 8407s partsroller og tillater opprettelse av endringsordrer fra entreprenør uten fullmaktskontroll.
