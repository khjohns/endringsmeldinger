# Konsolidert masterplan for review (2026-09-21)

> **Merknad 2026-09-22:** Historisk forslag. Avløst av v2 og deretter av den
> [sluttredigerte hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md), som er autoritativ for plan og funnstatus.
> Teksten under er ikke oppdatert.

**Dato:** 2026-09-21  
**Gjeldende commit ved oppstart:** `0bdc1dc7925631a9df7264c33812f8c10ddc6fd2` (gren `main`)  
**Utgangspunkt ved oppdragsbeskrivelsen:** `fc9b179`  
**Status:** **Reviewforslag — erstatter ikke masterplanen før godkjenning.**  
**Forrige ledd i dokumentkjeden:**
- [Siste handoff (21.09 sen kveld: fristene er lukket)](handoff-2026-09-21-frister.md)
- [Gjeldende masterplan (2026-09-16, sist oppdatert 21.09)](plans/2026-09-16-godkjenning-og-varig-levering.md)
- [Arkitekturføringer (AF-01–AF-06, 21.09)](arkitekturforinger-2026-09-21.md)
- [Delplan: atomisk utstedelse og outbox](plans/2026-09-17-atomisk-utstedelse-og-outbox.md)
- [Design: målskjema for databasen](design-maalskjema-database-2026-09-20.md)
- [Design: durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md)
- [Konsolidert kildegrunnlag og dekningsmatrise](konsolidering-kildegrunnlag-2026-09-21.md)

---

## 1. Bakgrunn og formål

Denne konsoliderte planen er utarbeidet på oppdrag fra oppdragsgiver i henhold til
[`docs/prompt-gemini-konsolidering-2026-09-21.md`](prompt-gemini-konsolidering-2026-09-21.md). Formålet er å levere en metodisk,
samlet og etterprøvbar fremstilling av systemets målarkitektur, truffede beslutninger,
lukkede og åpne funn, samt en begrunnet gjennomføringsrekkefølge for resterende
arbeidspakker frem mot produksjonsgodkjenning.

Appen administrerer formelle varsler og endringskrav etter standardkontrakten **NS 8407**
mellom totalentreprenør (TE) og byggherre (BH). Hendelsene i systemet har rettslig
betydning for om økonomiske krav og fristforlengelser bevares eller prekluderes. Systemet
har per 21. september 2026 ingen reelle produksjonsdata, og databasen er tom for
kontraktshendelser. Dette har gjort det mulig å lukke strukturelle endringer med frist
før ekte saker finnes.

Konsolideringen erstatter ikke gjeldende masterplan direkte, men leveres som et
selvstendig reviewdokument sammen med det ledsagende kildegrunnlaget
[`docs/konsolidering-kildegrunnlag-2026-09-21.md`](konsolidering-kildegrunnlag-2026-09-21.md). Eksisterende produksjonskode,
tester og migrasjonsfiler holdes urørt i denne runden.

---

## 2. Gjeldende målarkitektur og ansvarsgrenser

Målarkitekturen bygger på prinsippet om **én felles PostgreSQL-database**, event sourcing
for kontraktsjournalen, skjermet lagring for interne notater, og en transaksjonell
inbox/outbox for varig integrasjon med Catenda.

```
                  +-------------------------------------------------------------+
                  |                      Frontend (SvelteKit)                   |
                  +-------------------------------------------------------------+
                                                 | HTTP / JSON / SSE
                                                 v
                  +-------------------------------------------------------------+
                  |                  Applikasjonsserver (Flask)                 |
                  |                                                             |
                  |  +-------------------------------------------------------+  |
                  |  | Ruter & Tilgangskontroll:                             |  |
                  |  | require_auth, require_project_access,                 |  |
                  |  | require_contract_role, CSRF, Ruteregister             |  |
                  |  +-------------------------------------------------------+  |
                  |                              |                              |
                  |  +---------------------------+---------------------------+  |
                  |  |                                                       |  |
                  |  v                                                       v  |
+------------------------------------+             +------------------------------------+
|  Svargrense & Presentasjon         |             |  Domenetjenester (NS 8407)         |
|  - Aktor-navnoppslag (lib/aktor)   |             |  - Forretningsregler               |
|  - Tidslinjefletting (hend+notat)  |             |  - compute_state (ren projeksjon)  |
|  - Skjerming (visible_events)      |             |  - Godkjenningskjede & fullmakt    |
+------------------------------------+             +------------------------------------+
                  |                                                  |
                  +---------------------------+----------------------+
                                              | PostgREST / RPC / DB-forbindelse
                                              v
+---------------------------------------------------------------------------------------+
|                                PostgreSQL Database                                    |
|                                                                                       |
|  +---------------------+  +---------------------+  +-------------------------------+  |
|  | hendelse            |  | notat               |  | sak & sak_projeksjon          |  |
|  | (Append-only,       |  | (Skjermet team-     |  | (Register & atomisk           |  |
|  |  kontraktsjournal)  |  |  notat, slettbar)   |  |  avledet tilstand)            |  |
|  +---------------------+  +---------------------+  +-------------------------------+  |
|  +---------------------+  +---------------------+  +-------------------------------+  |
|  | kommando (Dedupe)   |  | utgaende_levering   |  | innkommende_hendelse (Inbox)  |  |
|  |                     |  | (Outbox m/steg)     |  |                               |  |
|  +---------------------+  +---------------------+  +-------------------------------+  |
|  +---------------------+  +--------------------------------------------------------+  |
|  | vedlegg (Staging &  |  | Brukere, roller & konfig:                              |  |
|  |  innhold_sha256)    |  | app_users, app_identities, app_project_memberships,    |  |
|  |                     |  | projects, catenda_contract_teams, topic_board_configs  |  |
|  +---------------------+  +--------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
                                              |
                                              | Henter arbeid (SKIP LOCKED)
                                              v
                  +-------------------------------------------------------------+
                  |            Asynkron Outbox Worker (Køprosessor)             |
                  |  - Idempotent levering med stegsjekkpunkt                   |
                  |  - Eksponentiell backoff, lease-sweeper, dead-letter        |
                  +-------------------------------------------------------------+
                                              |
                                              | REST API (OAuth2)
                                              v
                  +-------------------------------------------------------------+
                  |                    Catenda (Bimsync API)                    |
                  |  - Eksternt arkiv for dokumenter og PDF                     |
                  |  - Topic board for ekstern varsling og kommentarer          |
                  +-------------------------------------------------------------+
```

### Ansvarsdeling mellom lagene

1. **Klientlag (Frontend):**
   - Viser sakstilstand, tidslinje, utkast og godkjenningspanel.
   - Forholder seg til serverkontrollerte data; klienten genererer aldri tidsstempler,
     hendelses-ID-er eller autoritative aktørdata.
   - Respekterer kontraktsside og rolle i grensesnittet, men er aldri eneste håndhever.

2. **Applikasjonsgrense og ruter:**
   - Håndhever obligatorisk autentisering (`require_auth`), CSRF-vern og eksplisitt
     prosjektkontekst (`require_project_access`).
   - Håndhever kontraktsside (`require_contract_role`) for mutasjoner og sensitive oppslag.
   - Stempler serverstyrte felter (`aktor_id`, `aktor_rolle`, `aktor_team_id`) fra
     verifisert sesjon inn i forespørselen før parsing.
   - Hvert eneste endepunkt kontrolleres mot det faste ruteregisteret.

3. **Svargrense og presentasjonslag:**
   - Slår opp personnavn fra `app_users` basert på `aktor_id` i hendelsene.
   - Fletter den uforanderlige kontraktsjournalen (`hendelse`) med slettbare interne
     vurderinger (`notat`) ved lesing av tidslinjen.
   - Filtrerer bort motpartens interne notater basert på aktørens verifiserte
     Catenda-team (`visible_events`).
   - Beregner aktivitetstall (`antall_events`, `siste_aktivitet`) basert på det leseren
     har innsyn i (RV-09).

4. **Domenelag og beregningslag:**
   - Forretningsregler etter NS 8407 (`business_rules.py`).
   - `compute_state` i `timeline_service.py` er en **ren, deterministisk projeksjon**
     (AF-05): beregner utelukkende sakstilstand fra hendelsesstrømmen uten Flask-kontekst,
     uten eksterne oppslag mot `app_users` og uten nettverkskall.
   - Validerer fullmaktskjeder og godkjenningskrav (`BH_BINDENDE_EVENTS`).

5. **Datalag (PostgreSQL):**
   - Transaksjonsgrense: hendelse, godkjenning, metadataprojeksjon, vedleggsbinding,
     kommandokvittering og outbox-oppdrag committer samlet eller rulles tilbake.
   - Integritetsvern: `hendelse` er append-only, beskyttet mot `UPDATE`, `DELETE`,
     `TRUNCATE` og uautorisert `INSERT`.
   - Datastyrt tilgangsvern (AF-01): Prosjekt- og teamgrenser håndheves av databasen,
     slik at nye lesestier eller direkte spørringer ikke kan lekke kryssprosjekt- eller
     kryss-team-data.

6. **Asynkron Outbox Worker:**
   - Fristilt fra HTTP-forespørselen; opererer på en serverless-sikker plattform
     (Google Cloud / Azure Container Apps).
   - Henter oppdrag med `FOR UPDATE SKIP LOCKED`.
   - Sikrer at-least-once levering til Catenda med stegsjekkpunkt per deloperasjon
     (PDF-opplasting, dokumentreferanse, kommentar, statusoppdatering).
   - Hindrer duplikater ved feil og krasj.

---

## 3. Oversikt over beslutninger og åpne designvalg

### 3.1 Premisser besluttet av oppdragsgiver (P1–P7)

Følgende premisser ble fastsatt 2026-09-20 og styrer arkitekturarbeidet:

| # | Premiss | Konsekvens for arkitekturen |
| --- | --- | --- |
| **P1** | **Magic links utgår helt.** | Innlogging skjer via Catenda ID eller Entra ID. Tabellen `magic_links` fjernes; tokens i `magic_links.json` saneres. |
| **P2** | **BIM er ikke i bruk i dag, men forblir relevant.** | Et BIM-objekt tilhører alltid én konkret sak. |
| **P3** | **Formålet med BIM-koblingen er analyse av tvistekomponenter.** | Aggregert analysebehov. Kobling/frakobling må logges som hendelser (`BIM_OBJEKT_KOBLET`/`FRAKOBLET`) for å bevare historikk (MS-13). |
| **P4** | **Vedlegg lagres kun i Catenda.** | Backend mellomlagrer bytene kun frem til levering. Catenda er arkiv. Vedleggsregisteret trenger en `innhold_sha256`-hash (MS-11). |
| **P5** | **Løsningen skal i prinsippet støtte andre virksomheter.** | `organisasjon_id` på `projects` skiller virksomhet fra prosjektnavn (MS-10). |
| **P6** | **To personer kan arbeide på samme sak i ulike spor samtidig.** | Total orden beholdes med `UNIQUE(sak_id, versjon)`. Sporuavhengige hendelser rebases ved konflikt i stedet for per-spor-versjonering (MS-03). |
| **P7** | **Arkivplikt går foran sletteplikt for kontraktsjournalen.** | Besluttet 21.09: kryptografisk sletting skal ikke bygges. Journalen bevares. Persondata minimeres via `aktor_id` (MS-04) og slettbare notater utenfor journalen (MS-05). |

### 3.2 Fristpunkter som er lukket mens journalen var tom

Alle beslutninger med tidsfrist (før journalen inneholder ekte saker) er gjennomført i kode og database:

1. **MS-01 — Én hendelsestabell:** `koe_events`, `forsering_events` og `endringsordre_events`
   er slått sammen til tabellen `hendelse` (`20260920193558_hendelse_tabell.sql`).
2. **MS-04 — `aktor_id` i stedet for personnavn:** Journalen bærer `app_users.id` (eller
   tidligere `catenda:<subø>`, nå sanert av MG-02). Navneoppslag skjer ved visning.
3. **MS-10 — `organisasjon_id` på `projects`:** Lagt til som `NOT NULL` uten default
   (`20260920192448_organisasjon_id_paa_projects.sql`).
4. **MS-05 — Interne notater ut av journalen:** Etablert tabell `notat`
   (`20260921153900_notat_tabell.sql`). Notater øker ikke sakens versjon, tidslinjen
   fletter kildene ved lesing, og forfatteren kan slette egne notater.
5. **MG-02 — Én identitetsform i journalen:** Webhookopprettede hendelser løser aktør
   via `koe_resolve_identity` (`20260921164900_koe_resolve_identity_coalesce.sql`).
   Verdiformen `catenda:<subject>` er fullstendig fjernet fra systemet.

### 3.3 Ytterligere beslutninger tatt 21.09 kveld

- **DB-05 (`viewer`-rolle):** Det er besluttet at `viewer` skal finnes som en egen leserolle
  (innsyn uten handlingsrett for revisor/rådgiver). Før den gamle tabellen
  `project_memberships` kan slettes, må `app_project_memberships` utvides til å støtte
  `viewer`.

### 3.4 Arkitekturføringer AF-01 til AF-06

Oppdragsgiver har sluttet seg til retningslinjene i `arkitekturforinger-2026-09-21.md`:

- **AF-01 (Prosjekt- og teamgrenser):** Datalaget må beskytte teaminterne data (notater,
  utkast, godkjenningspakker), ikke overlate skjermingen utelukkende til Python.
- **AF-02 (Transaksjon og rettigheter):** Append-only må verne både mot UPDATE/DELETE og
  uautorisert INSERT. Postgres med RPC beholdes som utgangspunkt.
- **AF-03 (Relasjonsintegritet):** Sletting av `sak_relations` må revurderes; foretrukket
  retning er en atomisk vedlikeholdt relasjonsprojeksjon med fremmednøkler.
- **AF-04 (Bevisførsel og dokumenter):** Dokumenthash må suppleres med dokumentversjon,
  pålitelig tidskilde, eksportverktøy og bevaringsmodell.
- **AF-05 (Ren gjenoppbygging):** Domenetilstand skal beregnes deterministisk fra hendelser
  alene (KR-04/MG-01 flyttes til svargrensen).
- **AF-06 (Verifikasjonsrekkefølge):** Ekte PostgreSQL-integrasjonstester i CI og én komplett
  EO-referanseflyt prioriteres foran generell RY-kodeopprydding.

### 3.5 Åpne designvalg som reviewer må ta stilling til

Følgende arkitektur- og designvalg krever endelig avklaring før implementering:

1. **Tilkoblingsmodell for atomiske transaksjoner (KONS-01):**
   - *Valg A (Anbefalt):* Postgres RPC via PostgREST. Én databasefunksjon (f.eks.
     `commit_eo_approval`) utfører domeneskriving, kvittering og outbox-innsetting atomisk.
   - *Valg B:* Bytte til direkte databaseforbindelse via `psycopg3`/SQLAlchemy fra Python.
2. **Relasjonsmodell (KONS-03 / AF-03):**
   - *Valg A (Anbefalt):* Behold en atomisk oppdatert `sak_relations`-projeksjon med
     fremmednøkler og prosjektavgrensning, oppdatert i hendelsens transaksjon.
   - *Valg B:* Fjern tabellen og baser oppslag på GIN-indekser over hendelsenes JSONB.
3. **Mekanisme for datalagets team- og prosjektvern (KONS-04 / AF-01):**
   - *Valg A:* Etablere en dedikert `app_runtime`-rolle uten `BYPASSRLS` med JWT-claims
     eller sesjonsvariable (`set_config('app.current_project_id', ...)`).
   - *Valg B:* Avgrensede `SECURITY DEFINER`-prosedyrer der direkte tabelltilgang
     tilbakekalles for applikasjonens innlogging.
4. **Flaky kappløpstest i testsuiten (KONS-12 / KR-15):**
   - *Valg A:* Gjør reproduksjonen i `test_tst_02_samtidig_saksopprettelse...` deterministisk
     (f.eks. med eksplisitt mutex/låsinspeksjon).
   - *Valg B:* Fjern `strict=True` og la testen være en informativ `xfail` som ikke gjør CI rød.

---

## 4. Arbeidspakker i prioritert rekkefølge

Arbeidspakkene er organisert i avhengighetsrekkefølge med eksplisitte produksjonskrav
og testbare akseptkriterier.

```
+-------------------------------------------------------------------------------+
| Fase 0: Verifiserbar leveranseprosess og byggesikkerhet                       |
| (CI m/Postgres-tjeneste, avhengighetspinning, HTTP-herding, ruteregister)     |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 1: Sikkerhets- og tilgangsfundament i databasen                          |
| (AF-01, AF-02, runtime-rolle, DB-05 viewer, fjerning av etterlatenskaper)     |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 2: Transaksjonell kjerne og EO-referanseflyt                             |
| (AP-04, AF-02, atomisk utstedelse RPC, outbox, vedleggshash, ren projeksjon)  |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 3: Øvrige adaptere og asynkron worker                                    |
| (BH-svar, webhook inbox, vedleggslevering, fristilt bakgrunnsworker)          |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 4: Domenegjennomgang, bevisførsel og driftsherding                       |
| (NS 8407 tilstandsregler, eksportverktøy, tidskilde, a11y, Catenda-avtale)   |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 5: Organisatoriske forutsetninger og produksjonssetting                  |
| (ROS-analyse, DPIA-godkjenning, ekstern sikkerhetsvurdering, SLA/varsling)    |
+-------------------------------------------------------------------------------+
```

---

### Fase 0: Verifiserbar leveranseprosess og byggesikkerhet

**Mål:** Etablere et uavhengig, reproduserbart og automatisk kontrollert bygg- og
testmiljø som fanger regresjoner før videre kodeendringer.

**Inngående funn og oppgaver:**
- Verifiserbar leveranseprosess (delvis levert; utvide CI med PostgreSQL).
- Byggreproduserbarhet: Pinne samtlige avhengigheter i `backend/requirements.txt` (i dag
  har 100 % `>=`). Legge til sårbarhetsskanning (`pip-audit` / `npm audit`) i CI.
- HTTP-herding: Innføre CSP, HSTS, `X-Content-Type-Options` og `frame-ancestors` i
  `nginx.conf` (testet mot TipTap/DOMPurify).
- Håndtere KR-15: Fjerne tilfeldig rød gate fra kappløpstesten `TST-02`.
- Oppheve RV-13 / CFG-03 / OBS-07: Sanere rå `str(e)` i feilhåndterere og sikre helsesjekkruter.

**Akseptkriterier:**
1. GitHub Actions kjører backend-tester mot en reell PostgreSQL 17-tjenestecontainer
   hvor alle 23 migrasjoner kjøres i `sort`-rekkefølge.
2. `pip install` og `npm ci` gir eksakt reproduserbare bygg fra låste versjoner.
3. Ingen kjente sårbarheter med alvorlighet High/Critical i avhengighetskjedene.
4. Klientleveransen fra Nginx inkluderer strenge sikkerhetshoder, verifisert med
   automatiserte headertester.
5. CI-suiten er 100 % deterministisk grønn (KR-15 løst).

---

### Fase 1: Sikkerhets- og tilgangsfundament i databasen

**Mål:** Flytte tenant-, team- og integritetsgrenser ned i databasen, slik at
applikasjonsfeil eller nye spørrestier ikke kan krysse prosjekter eller lekke interne data.

**Inngående funn og oppgaver:**
- **AF-01 / MS-09:** Innføre datalagshåndhevet vern for prosjekt, kontraktsside og team.
  Interne notater, utkast og godkjenningspakker skjermes i basen.
- **AF-02 / MS-02:** Definere separat `app_runtime`-rolle uten `BYPASSRLS`. Innføre
  databasefunksjoner for skriving, tilbakekalle direkte `UPDATE`, `DELETE` og `TRUNCATE` på
  `hendelse`. Sikre eksplisitte `GRANT`-rettigheter for alle 19 tabeller (KONS-13).
- **DB-05:** Utvide `app_project_memberships` med `role = 'viewer'`.
- **MS-15 / DA-08 / DA-09 / DA-10:** Fjerne etterlatenskapstabellene `project_memberships`,
  `magic_links` og `user_groups`.
- Oppdatere migrasjonshistorikken i basen via `supabase migration repair` (DA-03/KONS-10).

**Akseptkriterier:**
1. Direkte spørring med runtime-legitimasjon mot `hendelse`, `notat`, `sak_metadata` og
   `vedlegg` med prosjektkontekst A gir 0 rader fra prosjekt B.
2. Direkte spørring mot `notat` fra et annet team på samme kontraktsside gir 0 rader.
3. Runtime-rollen nektes `UPDATE`, `DELETE` og `TRUNCATE` på `hendelse` på databasenivå.
4. `app_project_memberships` håndterer rollen `viewer`, og `project_memberships` er fjernet.
5. Samtlige 19 tabeller har eksplisitt dokumenterte og tildelte rettigheter i migrasjonsfilene.

---

### Fase 2: Transaksjonell kjerne og EO-referanseflyt

**Mål:** Etablere én fullstendig, atomisk forretningsflyt for godkjenning og offentlig
utstedelse av endringsordre (EO), uten bruk av kompenserende sletting.

**Inngående funn og oppgaver:**
- **AP-04 / AR-06 / TST-03:** Sanere kompenserende rollback i `TrackingUnitOfWork`.
- **AF-02:** Implementere den autoritative utstedelseskommandoen (`commit_eo_approval` RPC).
  Atomisk skriving av hendelse, pakkeoppdatering, outbox-oppdrag og kommandokvittering.
- **AF-03 / MS-08:** Etablere prosjektavgrenset, atomisk vedlikeholdt relasjonsprojeksjon
  for relaterte KOE-saker med fremmednøkler.
- **AF-04 / MS-11:** Flytte vedleggstabellen til PostgreSQL; innføre `innhold_sha256`.
- **AF-05 / KR-04 / MG-01:** Gjøre `compute_state` til en ren projeksjon; flytte
  navneoppslag for `utstedt_av` til svargrensen.
- **MG-03:** Sikre at parsegrensen i modellen avviser samtlige serverstyrte felter.
- **RV-01 / GFK-01 / FE-04:** Avklare fullmaktskontroll når fristdager mangler dagmulktsats.
- **RV-02 / GFK-03:** Forhindre policyretur midt i pågående utstedelse.
- **MS-06 / MS-07:** Dele `sak_metadata` i register (`sak`) og projeksjon (`sak_projeksjon`).

**Akseptkriterier:**
1. Avbrudd eller krasj umiddelbart før commit etterlater null rader i metadata, hendelser
   og outbox.
2. Avbrudd etter commit gir identisk, idempotent kvittering ved retry med samme command-ID.
3. Samtidige godkjenninger for samme sak/nummer gir nøyaktig én commit og én 409 Conflict.
4. `compute_state` kjører uavhengig av web-kontekst og databaseforbindelse, og produserer
   identisk resultat for historiske hendelsesstrømmer.
5. Vedlegg er knyttet med SHA-256-sjekksum i samme transaksjon som hendelsen.

---

### Fase 3: Øvrige adaptere og asynkron worker

**Mål:** Utvide den transaksjonelle outbox- og inbox-mekanismen til samtlige eksterne
innsendings- og mottaksveier, og etablere en fristilt bakgrunnsworker.

**Inngående funn og oppgaver:**
- **Bakgrunnsworker (KONS-14):** Utvikle en fristilt arbeiderprosess for Google Cloud /
  Azure Container Apps med `FOR UPDATE SKIP LOCKED`, lease-token, backoff og lease-sweeper.
- **Outbox-adaptere:** Koble BH-svar og ordinære TE-hendelser til outboxen.
- **RV-10 / INT-05:** Sikre at `/api/events/batch` registrerer leveringsintensjon i outboxen.
- **Inbox-adapter (Webhook):** Etablere `innkommende_hendelse`-tabell (del 4.6 i inbox-design).
  Deduplisere på `fingeravtrykk` (SHA-256) og Catenda event-ID.
- **INT-02 / RV-12:** Sanere webhookens sårbarhet ved feilende prosessering (fjerne forhåndsreservering).
- Etablere operatørgrensesnitt/logging for dead-letter-køer og usikre utfall.

**Akseptkriterier:**
1. Ingen eksterne nettverkskall mot Catenda utføres innenfor HTTP-forespørselens levetid.
2. Webhook-mottak er idempotent og overlever containeromstart uten tap av hendelser.
3. Nettverkssvikt mot Catenda gjenopptas automatisk ved siste ufullførte delsteg
   (stegsjekkpunkt), uten duplisering av PDF eller kommentarer.
4. Dead-letter-oppføringer krever autorisert tilgang til prosjekt og kontraktsside for innsyn.

---

### Fase 4: Domenegjennomgang, bevisførsel og driftsherding

**Mål:** Verifisere at samtlige tilstandsoverganger er i streng overensstemmelse med NS 8407,
og etablere verktøy for uavhengig bevisfremleggelse.

**Inngående funn og oppgaver:**
- **Domenegjennomgang NS 8407 (RC-8):** Systematisk testing av samtlige tilstandsoverganger
  i `business_rules.py` og `timeline_service.py` (TFR-02 til TFR-06).
- Vurdere gjeninnføring av `UP042` (StrEnum) i lys av hendelsesversjonering.
- **Bevisførsel og framleggelse (AF-04):** Etablere en uavhengig eksportfunksjon for en hel
  sak (hendelser, aktører, tidsstempler, dokumentversjoner, sjekksummer og leveringskvitteringer).
- Etablere forsvarlig tidskilde for tidsstempling av juridisk bindende varsler.
- **Universell utforming:** Løse de tre konkrete a11y-advarslene i Svelte-komponentene
  (`WithdrawModal`, `Kontrollrommet`).
- **Avhengigheten av Catenda:** Dokumentere SLA, kontraktsmessig virkning av Catenda-nedetid,
  og rutiner ved tapt prosjekttilgang.
- Utføre oppryddingsoppgavene RY-01 til RY-07 (indeksere `catenda_topic_id` på `sak_metadata`,
  keyset-paginering, osv.).

**Akseptkriterier:**
1. Hver hendelsestype har en formelt dokumentert tilstandsovergang testet mot NS 8407.
2. En sak kan eksporteres til et selvstendig, verifiserbart format som kan fremlegges
   for voldgift/oppmann uten at applikasjonen kjører.
3. `npm run check` kjører med 0 a11y-advarsler.
4. Juridisk og teknisk risikovurdering for Catenda-avhengigheten er signert av produkteier.

---

### Fase 5: Organisatoriske forutsetninger og produksjonssetting

**Mål:** Sikre at organisatoriske, juridiske og sikkerhetsmessige rammer er oppfylt før
systemet settes i drift for Oslobygg KF.

**Inngående oppgaver:**
- Gjennomføre formell **ROS-analyse** (Risiko- og sårbarhetsanalyse).
- Fullføre **DPIA** (Vurdering av personvernkonsekvenser) basert på
  `personopplysninger-faktagrunnlag-2026-09-19.md`. Forankre beslutningen om at arkivplikt
  går foran sletteplikt i et formelt rettslig notat.
- Gjennomføre **ekstern sikkerhetsvurdering** (penetrasjonstest av API og autorisasjonslag).
- Etablere formell prosedyre for **hendelseshåndtering** ved bestridte frister eller
  påstått tapte varsler.
- Gjennomføre en fullskala **restore-øvelse** fra backup, og verifisere at gjenoppretting
  ikke utløser utilsiktet re-levering av outbox-meldinger.

**Akseptkriterier:**
1. Godkjent ROS-analyse og DPIA foreligger fra Oslobygg KFs personvernombud/sikkerhetsleder.
2. Ekstern sikkerhetsrevisjon er gjennomført uten åpne kritiske eller høye funn.
3. RPO og RTO er dokumentert og etterprøvd gjennom en vellykket gjenopprettingstest.

---

## 5. Sporbarhet tilbake til opprinnelige pakker og funn

| Opprinnelig arbeidspakke / område | Hovedfunn og referanser | Status og plassering i denne planen |
| --- | --- | --- |
| **0 — Lukk eksponering** | SA-01, SA-02, SA-03, RV-06, RV-22 | **Lukket.** Ruteregister håndhevet; overvåkes i Fase 0. |
| **1 — Felles sikkerhetsgrenser** | AR-01, RV-07, AUT-01, AUT-02, AUT-03, AF-01, MS-09 | **Delvis lukket i koden;** flyttes til datalaget i **Fase 1**. |
| **1 — Verifiserbar leveranseprosess** | AR-05, S9, DA-03, DA-04, KONS-10 | **Delvis levert;** fullføres med ekte Postgres i CI i **Fase 0**. |
| **1 — Databasearkitektur** | DA-01–DA-15, MS-01–MS-15 | **Fristpunkter lukket;** resten håndteres i **Fase 1 og 2**. |
| **1 — Oppbevaring og sletting** | P7, MS-04, MS-05, MG-02, DPIA | **Fristpunkter lukket;** DPIA forankres i **Fase 5**. |
| **1 — Byggreproduserbarhet** | Requirements pinning, pip-audit | Behandles i **Fase 0**. |
| **1 — HTTP-herding** | Nginx CSP, HSTS, headers | Behandles i **Fase 0**. |
| **1 — Catenda-avhengighet** | SLA, risiko, oppetid | Behandles i **Fase 4**. |
| **1 — Universell utforming** | a11y, svelte-check | Behandles i **Fase 4**. |
| **2 — Atomisk domene og levering** | AP-01–AP-05, AR-06, TST-03, INT-05, RV-10, AF-02 | Referanseflyt i **Fase 2**; adaptere/worker i **Fase 3**. |
| **2 — Minste privilegier & integritet** | AR-02, S10, MS-02, KONS-05, KONS-13 | Behandles i **Fase 1**. |
| **2 — Domenegjennomgang NS 8407** | TFR-01–TFR-06, GFK-01–GFK-06, UP042 | TFR-01/GFK-01 lukket; resten behandles i **Fase 4**. |
| **2 — Bevisførsel og framleggelse** | AF-04, MS-11, eksportverktøy | Behandles i **Fase 4**. |
| **3 — Dokumenter og sporbarhet** | AF-04, vedleggshash, revisjonslogg | Behandles i **Fase 2 og 4**. |
| **3 — Gjenoppretting og drift** | AR-03, outbox-kø, lease, restore | Behandles i **Fase 3 og 5**. |

---

## 6. Verifikasjon og grenser

### Kjørt og observert under denne konsolideringen
1. **Teststatus:**
   - Backend pytest kjørt lokalt: **1527 bestått, 9 hoppet over, 42 xfail, 0 feil** (9.29 s).
   - Frontend vitest kjørt lokalt: **51 testfiler, 590 tester bestått, 0 feil** (31.10 s).
   - Svelte-diagnostikk (`svelte-check`): **0 feil, 9 advarsler** (3 a11y, 6 runes state-advarsler).
   - Lint (`ruff check backend/`): **0 feil**.
2. **Git-status:**
   - HEAD identifisert som `0bdc1dc7925631a9df7264c33812f8c10ddc6fd2` på gren `main`.
   - Bekreftet at `0bdc1dc` la til arkitekturføringene og oppdragsbeskrivelsen over `fc9b179`.
3. **Dokumentkjede og lenkekontroll:**
   - Automatisk lenkekontroll over alle markdownfiler i `docs/`: **0 brutte interne lenker**.
4. **Verifikasjon mot lokal PostgreSQL 18.6:**
   - Alle 23 migrasjonsfiler i `supabase/migrations/` ble kjørt i `sort`-rekkefølge mot en tom database på PostgreSQL 18.6 (Homebrew).
   - Samtlige 23 migrasjoner bygget feilfritt og etablerte nøyaktig 19 tabeller i `public`.
   - Katalogsjekksummer for kolonner, indekser, policyer og rettigheter er bit-identiske med PostgreSQL 16-referansen i `docs/gjennomforing-ms05-2026-09-21.md`.

### Lest ut av koden
1. `SupabaseNotatRepository.for_sak` filtrerer kun på sak og prosjekt, ikke team. Teamfiltreringen skjer utelukkende i `visible_events` i Python.
2. `TrackingUnitOfWork._default_rollback` for `EVENT_APPEND` er en ren loggadvarsel og utfører ingen kompensasjon.
3. `timeline_service.py` kaller `aktor_navn` under `_handle_eo_utstedt`, noe som gjør tilstandsberegningen avhengig av eksterne oppslag.
4. `ApprovalService.deliver()` kalles kun synkront fra HTTP-ruter; det eksisterer ingen uavhengig bakgrunnsworker i koden.
5. `nginx.conf` inneholder kun enkle cache-headere og mangler sikkerhetshoder som CSP og HSTS.
6. `requirements.txt` inneholder kun åpne versjonskrav (`>=`). Kun `ruff==0.16.8` er pinnet i `requirements-dev.txt`.

### Dokumentert i tidligere runder
1. Supabase-databasen `gwdxadexwktegkklyobv` kjører PostgreSQL 17.6 og inneholder 19 tabeller i skjemaet `public`.
2. Katalogen ble verifisert identisk med migrasjonssettet på fem snitt (kolonner, skranker, indekser, policyer, rettigheter) etter MS-05 i `71d9115`.
3. Beslutningene P1–P7, fristpunktene MS-01, MS-04, MS-10, MS-05, MG-02, samt DB-05 viewer-rollen er protokollført i masterplanen og tilhørende gjennomføringsdokumenter.

### Ikke kontrollert i denne runden
1. Supabase MCP-verktøy var ikke tilgjengelig i miljøet; ingen direkte spørringer mot `gwdxadexwktegkklyobv` er utført i denne økten.
2. Catendas produksjons-API har ikke vært kontaktet; ingen eksterne nettverkskall er utført.
3. Ingen produksjonskode eller eksisterende testfiler er endret.
