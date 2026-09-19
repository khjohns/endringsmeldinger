# Sikkerhets- og kvalitetsrevisjon: Testsuitekvalitet og blindsoner (Pass 9)

**Dato:** 18. september 2026  
**Område:** Testsuitekvalitet, over-mocking, falsk trygghet, samtidighet, delvis skriving og frontend-blindsoner  
**Testfil:** `backend/tests/test_security/test_testsuite_blindsoner_audit_20260918.py` (7 xfailed tester)  
**Status:** 7 svakheter identifisert og dokumentert med reproduserbare tester. Ingen produksjonskode er endret.

---

**Etterprøvd 2026-09-19** i [vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md), som vurderer alle 60
funnene fra pass 1–9 og grupperer dem i tolv rotårsaker. Funnene i dette dokumentet
er der lest og gruppert, men ikke reprodusert uavhengig — se dokumentets
avgrensning.

## Metodisk presisering

I tråd med revisjonskravene skiller rapporten strengt mellom tre kunnskapsnivåer:
1. **Kjørt og observert:** Faktisk atferd verifisert via kjøring i Pytest/Vitest eller inspeksjon av kildekode og testkjøringer.
2. **Lest ut av koden:** Direkte observasjon av implementasjonen i testsuiten, repositories, services og Svelte-komponenter.
3. **Slutning:** Sikkerhetsmessige, arkitektoniske og driftsmessige konsekvenser utledet av svakhetene.

---

## Sammendrag av funn

| ID | Alvorlighet | Kategori | Beskrivelse |
|---|---|---|---|
| **TST-01** | **Kritisk** | Testmetodikk / Integrasjon | Hermetisk lag-for-lag-mocking skjuler at ruter krasjer mot standard metadata-repo (`SakMetadataRepository` mangler `list_by_sakstype`). Systemet har null integrasjonstester på tvers av lagene. |
| **TST-02** | **Høy** | Samtidighet / Datatap | Samtidig saksopprettelse (`expected_version == 0`) i `JsonFileEventRepository` har ingen fillåsing. To parallelle opprettelser krasjer med ubehandlet `FileNotFoundError` (500) eller overskriver hverandre i det stille. |
| **TST-03** | **Høy** | Transaksjonssikkerhet / UoW | `TrackingUnitOfWork` gir falsk transaksjonssikkerhet for hendelser. Rollback for `EVENT_APPEND` er en ren no-op (kun en loggmelding), og etterlater saken korrupt ved feil etter hendelsesskriving. |
| **TST-04** | **Høy** | Kontrakter / Frontend-Backend | OpenAPI-spesifikasjonen mangler helt (`backend/docs/openapi.yaml` finnes ikke). Frontend og backend har fullstendig skjemadrift uten automatisk synkronisering eller typevalidering. |
| **TST-05** | **Middels/Høy** | Feilhåndtering / Nettverksbrudd | Opprettelse av endringsordre svelger Catenda-nettverksbrudd uten kompensasjon eller outbox-kø. Hvis Catenda er nede, forblir ordren usynkronisert uten gjenopprettingsmulighet. |
| **TST-06** | **Middels** | Testmiljø / Skjemadrift | Testmiljøets fil-repos (Json/CSV) har divergert fra produksjonsdatabasen (Supabase). Ulike metodenavn (`list_all_sak_ids` vs `get_all_sak_ids`) krasjer skript som `backfill_relations.py`. |
| **TST-07** | **Middels** | Testdekning / Frontend | Massiv blindsone i frontend: 58 av 87 Svelte-komponenter (66,7%) mangler tester helt, inkludert samtlige rutesider under `src/routes/` og kritiske modaler som `LetterPreviewModal` og `WithdrawModal`. |

---

## Detaljert gjennomgang av funn

### TST-01: Hermetisk lag-for-lag-mocking skjuler at ruter krasjer mot standard metadata-repo
* **Alvorlighet:** Kritisk
* **Kategori:** Testmetodikk / Integrasjon
* **Berørte filer:**
  - `backend/routes/event_routes.py` (linje 992)
  - `backend/repositories/sak_metadata_repository.py`
  - `backend/tests/test_routes/test_endringsordre_routes.py`
  - `backend/tests/test_services/test_endringsordre_service.py`
  - `backend/tests/test_core/test_unit_of_work.py`
* **Kjørt og observert:**
  - Testsuiten kjører 1440 tester i backend og 588 i frontend, og rapporterer 100% grønt.
  - Likevel krasjer `GET /api/cases?sakstype=standard` med `AttributeError: 'SakMetadataRepository' object has no attribute 'list_by_sakstype'` når backend kjører med standard lokal konfigurasjon (CSV-repository).
  - Årsaken er at alle tester i `test_routes/` mocker bort servicelaget eller repository-laget med `Mock()` / `MagicMock()`.
* **Lest ut av koden:**
  - `test_endringsordre_routes.py` mocker bort `EndringsordreService` helt via monkeypatching av `_get_endringsordre_service`.
  - `test_endringsordre_service.py` mocker bort `SakCreationService` helt via monkeypatching av `get_sak_creation_service`.
  - `test_unit_of_work.py` mocker bort `event_repository` og `metadata_repository` med rene `Mock()`-objekter.
  - Ingen tester verifiserer den helhetlige kjeden fra innkommende HTTP-forespørsel, gjennom ruten, til servicen, Unit of Work, og ned til lagringsmediet.
* **Slutning:**
  Testsuiten gir en falsk trygghet ved at enhetstestene tester konstruerte mock-kontrakter i stedet for faktisk systemintegrasjon. Avvik i metodestrukturer, parametere og typer mellom lagene passerer rett gjennom testene.

---

### TST-02: Samtidig saksopprettelse (`expected_version == 0`) i `JsonFileEventRepository` har ingen låsing
* **Alvorlighet:** Høy
* **Kategori:** Samtidighet / Datatap
* **Berørte filer:**
  - `backend/repositories/event_repository.py` (linje 124–141)
  - `backend/tests/test_repositories/test_event_repository.py`
* **Kjørt og observert:**
  - Kjøring av to samtidige tråder som kaller `repo.append_batch([event], expected_version=0)` for samme `sak_id` i `JsonFileEventRepository` resulterte i at den ene tråden krasjet med ubehandlet `FileNotFoundError`, mens den andre tråden returnerte suksess.
  - Ingen `ConcurrencyError` ble kastet for noen av trådene.
* **Lest ut av koden:**
  - Ved `expected_version == 0` i `JsonFileEventRepository.append_batch`:
    ```python
    temp_path = file_path.with_suffix(".tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    temp_path.rename(file_path)
    ```
  - Det etableres ingen fil-lås (`fcntl.flock`) ved opprettelse av ny fil. Begge tråder skriver til nøyaktig samme `.tmp`-fil (`{safe_id}.tmp`).
  - Den tråden som renamer først fjerner `.tmp`-filen. Når den andre tråden kaller `temp_path.rename(file_path)`, finnes ikke filen lenger, og Python kaster `FileNotFoundError`. Dersom den andre tråden rekker å skrive til `.tmp` før den første kaller rename, overskrives den første trådens opprettelse i det stille.
  - Testsuiten i `test_event_repository.py` tester utelukkende samtidighet på *eksisterende* saker (`expected_version > 0`). Samtidig opprettelse var aldri testet.
* **Slutning:**
  Ved samtidig saksopprettelse (f.eks. to samtidige webhooks fra Catenda eller to brukere som oppretter sak samtidig) vil systemet enten krasje med 500 Internal Server Error eller tape data ved stille overskriving.

---

### TST-03: `TrackingUnitOfWork` gir falsk transaksjonssikkerhet for hendelser
* **Alvorlighet:** Høy
* **Kategori:** Transaksjonssikkerhet / UoW
* **Berørte filer:**
  - `backend/core/unit_of_work.py` (linje 232–242)
  - `backend/tests/test_core/test_unit_of_work.py` (linje 263–274)
* **Kjørt og observert:**
  - Ved kjøring av en operasjon under `TrackingUnitOfWork` der en hendelse skrives via `uow.events.append(event, expected_version=0)` etterfulgt av en feil, logges det kun en advarsel:
    `Cannot rollback event append for SAK-UOW-FAIL. Event sourcing is append-only.`
  - Hendelsen forblir permanent lagret i event-lageret (`version = 1`, 1 hendelse i filen), selv om operasjonen feilet og context manageren kalte `rollback()`.
* **Lest ut av koden:**
  - `TrackingUnitOfWork._default_rollback` implementerer kun sletting for `METADATA_CREATE`. For `EVENT_APPEND` gjør den ingenting:
    ```python
    elif op.operation_type == OperationType.EVENT_APPEND:
        # Events are immutable - cannot truly rollback
        logger.warning(...)
    ```
  - Testen `test_context_manager_rollback_on_exception` i `test_unit_of_work.py` maskerer dette ved å kun opprette metadata og deretter heve unntak — den tester aldri rollback når hendelser faktisk er skrevet til event-lageret!
* **Slutning:**
  Hvis en flerstegsoperasjon feiler etter at hendelsen er skrevet (f.eks. oppdatering av metadata, opprettelse av relasjoner, eller ekstern synkronisering), rulles metadata tilbake mens hendelsen blir stående. Dette etterlater databasen i en inkonsistent "spøkelsetilstand" med hendelser uten tilhørende metadata.

---

### TST-04: OpenAPI-spesifikasjonen mangler helt; full kontrakt-blindhet
* **Alvorlighet:** Høy
* **Kategori:** Kontrakter / Frontend-Backend
* **Berørte filer:**
  - `backend/scripts/generate_openapi.py`
  - `scripts/check_openapi_freshness.py` (linje 45)
  - `src/lib/types/api.ts`
  - `src/lib/types/timeline.ts`
* **Kjørt og observert:**
  - Kjøring av `python3 scripts/check_openapi_freshness.py` returnerer umiddelbart:
    `[KRITISK] openapi.yaml eksisterer ikke! Kjør: python backend/scripts/generate_openapi.py`.
  - `backend/docs/openapi.yaml` finnes ikke i repositoriet.
* **Lest ut av koden:**
  - Frontend-typene i `src/lib/types/` er 100% håndskrevne uten noen form for typesynkronisering, validering eller kodegenerering fra backendens Pydantic-modeller.
  - Frontend-testene i Vitest mocker alle API-responser manuelt med hardkodede JSON-objekter (f.eks. `CaseContextResponse` i `VedleggSubmission.test.ts`).
* **Slutning:**
  Ingen automatiserte tester verifiserer at backendens faktiske JSON-responser stemmer overens med frontends forventede felter og typer. Dette skaper grobunn for feil som FE-02 (der frontend forventet at `context` returnerte brukerens rolle, men endepunktet ikke gjorde det).

---

### TST-05: Opprettelse av endringsordre svelger Catenda-brudd uten gjenoppretting
* **Alvorlighet:** Middels/Høy
* **Kategori:** Feilhåndtering / Nettverksbrudd
* **Berørte filer:**
  - `backend/services/endringsordre_service.py` (linje 528–538)
  - `backend/services/approval_service.py` (linje 601–611)
  - `backend/routes/event_routes.py` (linje 805)
* **Kjørt og observert:**
  - Når `CatendaClient.create_topic` feiler med nettverksfeil/timeout under `opprett_endringsordresak`, svelges unntaket og servicen returnerer `catenda_synced: False`.
  - Ingen oppføring legges i noen outbox-tabell, og det finnes ingen bakgrunnsjobb eller retry-logikk.
* **Lest ut av koden:**
  - I motsetning til `ApprovalService` (som har `approval_outbox` og en egen `deliver`-prosess som overlever krasj og nettverksfeil), mangler `EndringsordreService` enhver outbox-mekanisme.
  - Samme problem finnes i `POST /api/events/batch`: Hvis `lever_vedlegg_for_hendelser` feiler, fanges unntaket med `logger.exception`, men API-et returnerer `200 OK` / `success: True`.
* **Slutning:**
  Dersom Catenda har et kortvarig nettverksbrudd i det en endringsordre opprettes, opprettes ordren internt, men blir aldri synkronisert til Catenda. Det finnes ingen tester i testsuiten som presser eksterne nettverksfeil for endringsordrer eller batch-vedlegg.

---

### TST-06: Asymmetri mellom Json/CSV-repos (testmiljø) og Supabase-repos (prod)
* **Alvorlighet:** Middels
* **Kategori:** Testmiljø / Skjemadrift
* **Berørte filer:**
  - `backend/repositories/event_repository.py` (linje 237–250)
  - `backend/repositories/supabase_event_repository.py` (linje 531–550)
  - `backend/repositories/sak_metadata_repository.py`
  - `backend/repositories/supabase_sak_metadata_repository.py`
  - `backend/scripts/backfill_relations.py` (linje 48)
* **Kjørt og observert:**
  - `SupabaseEventRepository` definerer metoden `get_all_sak_ids(sakstype)`.
  - `JsonFileEventRepository` definerer metoden `list_all_sak_ids()`.
  - `SupabaseSakMetadataRepository` har `exists`, `list_by_sakstype` og `upsert`, som mangler helt i `SakMetadataRepository` (CSV).
  - Skriptet `backfill_relations.py` kaller `event_repository.get_all_sak_ids()` og krasjer med `AttributeError` ved kjøring mot standard backend.
* **Lest ut av koden:**
  - `EventRepository` (det abstrakte basisgrensesnittet) definerer ikke disse metodene enhetlig.
  - Testsuiten kjører 99% av testene mot Json/CSV eller mocks, og fanger derfor aldri opp avvikene mellom lagringsimplementasjonene.
* **Slutning:**
  Testsuiten tester en implementasjon (fil/CSV) som har et annet grensesnitt enn produksjonskoden (Supabase). Dette maskerer feil i produksjonsskript og ruter.

---

### TST-07: Massiv blindsone i frontend: 58 av 87 Svelte-komponenter mangler tester
* **Alvorlighet:** Middels
* **Kategori:** Testdekning / Frontend
* **Berørte filer:**
  - `src/lib/components/` (58 utestede filer)
  - `src/routes/` (samtlige ruter utestet)
* **Kjørt og observert:**
  - Automatisk kildekodeskanning viser at det finnes 87 `.svelte`-filer i prosjektet.
  - Kun 29 av disse komponentene refereres, importeres eller testes i testfilene under `src/`.
  - Hele 58 komponenter (66,7%) mangler enhver form for testdekning.
* **Lest ut av koden:**
  - Utestede komponenter inkluderer:
    - Samtlige rutesider: `src/routes/[prosjektId]/[sakId]/+page.svelte`, `src/routes/[prosjektId]/endringsordre/ny/+page.svelte`, `src/routes/login/+page.svelte`, etc.
    - Kritiske modaler og visninger: `LetterPreviewModal.svelte`, `WithdrawModal.svelte`, `ClaimApprovalView.svelte`, `ClaimLetterView.svelte`, `VedleggPanel.svelte`.
    - Skjemakomponenter: `TeGrunnlagForm.svelte`, `TeVederlagForm.svelte`, `TeFristForm.svelte`.
* **Slutning:**
  Frontend har store blindsoner. Kritiske feil avdekket i tidligere pass — som at `LetterPreviewModal.svelte` omgår API-klienten og mangler CSRF/auth-headere (FE-01), og at rå HTML vises som ren tekst i `LetterHtmlPreview.svelte` (FE-06) — skyldes direkte at disse komponentene aldri har hatt automatiserte tester.
