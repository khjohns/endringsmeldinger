# Konsolidert masterplan for review (2026-09-22-v2)

> **Merknad 2026-09-22 (sluttredigering):** Historisk forslag. Strukturen er
> brukt i den [sluttredigerte hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md), som er autoritativ. Blant
> det som er rettet der: AF-03 og tilgangsmekanismen er åpne valg (B-01, B-02),
> ikke vedtatt; vedleggsregister og leveringsstatus avvikles når alle flyter
> bruker erstatningen, ikke ved slutten av fase 2; `failOnDocumentExists=true`
> følger av dokumentmodellen (B-03); tilbakekalling og driftsverdier er åpne
> (B-04, B-09). Se [redaksjonsprotokollen](sluttredigering-hovedplan-2026-09-22.md).

**Dato:** 2026-09-22  
**Gjeldende commit:** `0bdc1dc7925631a9df7264c33812f8c10ddc6fd2` (gren `main`)  
**Status:** **Revidert reviewforslag (v2) — oppdatert etter oppfølgingsreview 22.09.**  
**Forrige ledd i dokumentkjeden:**
- [Oppfølgingsreview av Geminis konsolidering v2 (2026-09-22)](review-gemini-konsolidering-2026-09-22-v2.md) (behandler RGK2-01 til RGK2-05)
- [Første review av konsolideringen (2026-09-22)](review-gemini-konsolidering-2026-09-22.md) (behandler RGK-01 til RGK-06)
- [Konsolidert kildegrunnlag v2](konsolidering-kildegrunnlag-2026-09-22-v2.md)
- [Gjeldende masterplan (2026-09-16, sist oppdatert 21.09)](plans/2026-09-16-godkjenning-og-varig-levering.md)
- [Arkitekturføringer (AF-01–AF-06, 21.09)](arkitekturforinger-2026-09-21.md)
- [Delplan: atomisk utstedelse og outbox](plans/2026-09-17-atomisk-utstedelse-og-outbox.md)
- [Design: målskjema for databasen](design-maalskjema-database-2026-09-20.md)
- [Design: durable inbox og outbox](design-durable-inbox-outbox-2026-09-17.md)

---

## 1. Bakgrunn, formål og mandat for v2

Dette dokumentet utgjør den reviderte konsoliderte masterplanen (`v2`), oppdatert på grunnlag
av [første review](review-gemini-konsolidering-2026-09-22.md) og det etterfølgende
[oppfølgingsreviewet](review-gemini-konsolidering-2026-09-22-v2.md). Gjennomgangene har avklart
både nødvendige arkitektoniske forbedringer (minimal worker i Fase 2, riktig AUT-03- og
PG18-forklaring) og gjenstående restanser knyttet til operasjonell avstemming mot Catenda,
fullstendig kravdekning, presise fasegrenser for lagring og avstemming av faktiske beslutningskilder.

Formålet med `v2` er å levere en operativ, helhetlig og formelt uangripelig plan for den
videre utviklingen mot produksjonsgodkjenning. Planen forholder seg strengt til
kontraktsstandarden **NS 8407** for totalentrepriser, der formelle varsler mellom
totalentreprenør (TE) og byggherre (BH) har materiell juridisk vekt (krav bevares eller
prekluderes ved fristoversittelse).

Systemet har per 22. september 2026 ingen reelle produksjonsdata, og databasen er tom for
kontraktshendelser. Dette har muliggjort strukturelle DDL-opprettelser og migreringer uten
risiko for tap av historikk.

Gjeldende masterplan ([`docs/plans/2026-09-16-godkjenning-og-varig-levering.md`](plans/2026-09-16-godkjenning-og-varig-levering.md)),
opprinnelige review-dokumenter, produksjonskode, migrasjoner og eksisterende tester er
holdt **100 % urørt** under denne dokumentasjonsrevisjonen.

---

## 2. Gjeldende målarkitektur og ansvarsgrenser

Målarkitekturen bygger på prinsippet om **én felles PostgreSQL-database**, append-only
event sourcing for kontraktsjournalen, datalagsstyrt skjerming for interne notater og
utkast, og en transaksjonell inbox/outbox med eksplisitt håndtering av distribuerte feil
mot Catenda.

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
                                              | PostgREST / RPC (én transaksjon)
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
|  +---------------------+  +---------------------+  +-------------------------------+  |
|  | vedlegg             |  | godkjenningspakke   |  | utkast                        |  |
|  | (innhold_sha256 &   |  | (Migrert fra        |  | (Migrert fra                  |  |
|  |  karantenestatus)   |  |  SQLite)            |  |  SQLite)                      |  |
|  +---------------------+  +---------------------+  +-------------------------------+  |
|  +---------------------+  +--------------------------------------------------------+  |
|  | tilgangslogg        |  | Brukere, roller & konfig:                              |  |
|  | (Audit for eksport  |  | app_users, app_identities, app_project_memberships,    |  |
|  |  og sensitive data) |  | projects, catenda_contract_teams, topic_board_configs  |  |
|  +---------------------+  +--------------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
                                              |
                                              | Henter arbeid (SKIP LOCKED)
                                              v
                  +-------------------------------------------------------------+
                  |            Asynkron Outbox Worker (Køprosessor)             |
                  |  - Idempotent levering med operasjonelle sjekkpunkter       |
                  |  - Operasjonsspesifikk avstemming mot Catenda API           |
                  |  - Eksplisitt håndtering av "usikkert utfall" og alarm       |
                  |  - Beskyttelse mot zombie worker via lease-token            |
                  |  - Eksponentiell backoff med jitter og dead-letter-kø       |
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

### 2.1 Lagdelt ansvarsfordeling

1. **Klientlag (Frontend):**
   - Viser sakstilstand, tidslinje, utkast og godkjenningspanel.
   - Forholder seg utelukkende til serverkontrollerte data; genererer aldri tidsstempler,
     hendelses-ID-er eller autoritative aktørdata.
   - Respekterer kontraktsside og rolle i grensesnittet, men er aldri eneste håndhever.

2. **Applikasjonsgrense og ruter:**
   - Håndhever obligatorisk autentisering (`require_auth`), CSRF-vern og eksplisitt
     prosjektkontekst (`require_project_access`).
   - Håndhever kontraktsside (`require_contract_role`) for mutasjoner og sensitive oppslag.
   - Stempler serverstyrte felter (`aktor_id`, `aktor_rolle`, `aktor_team_id`) fra
     verifisert sesjon inn i forespørselen før parsing.
   - Hvert endepunkt kontrolleres mot det faste ruteregisteret.
   - Forbyr skjulte domenemutasjoner under GET-forespørsler (RV-14); skiller dette fra
     ordinært sesjonsvedlikehold og sikkerhetslogging.

3. **Svargrense og presentasjonslag:**
   - Slår opp personnavn fra `app_users` basert på `aktor_id` i hendelsene (`lib/aktor_navn.py`).
   - Fletter den uforanderlige kontraktsjournalen (`hendelse`) med slettbare interne
     vurderinger (`notat`) ved lesing av tidslinjen.
   - Filtrerer bort motpartens interne notater basert på aktørens verifiserte
     Catenda-team (`visible_events`).
   - Beregner aktivitetstall (`antall_events`, `siste_aktivitet`) basert utelukkende på
     det leseren har faktisk innsyn i (RV-09).

4. **Domenelag og beregningslag:**
   - Forretningsregler etter NS 8407 (`business_rules.py`).
   - `compute_state` i `timeline_service.py` er en **ren, deterministisk projeksjon**
     (AF-05): beregner sakstilstand fra hendelsesstrømmen alene, frikoblet fra Flask
     app- og request-kontekst, eksterne oppslag og nettverkskall.
   - Validerer fullmaktskjeder og godkjenningskrav (`BH_BINDENDE_EVENTS`).

5. **Datalag (PostgreSQL):**
   - Transaksjonsgrense: hendelse, godkjenning, metadataprojeksjon, vedleggsbinding,
     kommandokvittering og outbox-oppdrag committer samlet eller rulles tilbake.
   - Integritetsvern: `hendelse` er append-only, sikret mot `UPDATE`, `DELETE`, `TRUNCATE`
     og uautorisert `INSERT`.
   - Datastyrt tilgangsvern (AF-01): Prosjekt-, kontraktsside- og teamgrenser håndheves
     av databasen via dedikert `app_runtime`-rolle og `SECURITY DEFINER`-prosedyrer.
   - Logger tilgang til sensitive data og sakseksport i `tilgangslogg`.

6. **Asynkron Outbox Worker:**
   - Fristilt fra HTTP-forespørselen; kjører som selvstendig arbeiderprosess.
   - Henter oppdrag med `FOR UPDATE SKIP LOCKED`.
   - Sikrer at-least-once levering til Catenda med stegsjekkpunkt per deloperasjon.

---

### 2.2 Leveringskontrakt og distribuerte garantier (RGK-01, RGK2-01)

Distribuert levering mot et eksternt API (Catenda) kan ikke garantere «nøyaktig én
ekstern effekt» utelukkende ved hjelp av lokale databaselåser. Dersom et nettverkskall
utføres mot Catenda og ressursen opprettes eksternt, men nettverket bryter sammen før
arbeideren mottar HTTP-svaret, vil en lokal rollback eller blind gjenopptakelse risikere å
produsere duplikater.

Følgende normative kontrakt gjelder for leveringskjeden:

> **Hver ekstern operasjon får en dokumentert strategi for idempotens og avstemming. Lokal
> operasjons-ID og ekstern ressurs-ID er forskjellige begreper. Strategien skal beskrive
> hvordan ressursen kan gjenfinnes etter tapt svar, og når et negativt oppslag er tilstrekkelig
> grunnlag for et nytt opprettelseskall. Dersom dette ikke kan avgjøres sikkert, parkeres
> operasjonen som usikkert utfall. Ny worker får ikke anta at gammel workers eksterne kall
> stoppet da leasen utløp. Lokal kvittering og retry-oppdatering krever gjeldende lease-token.**

#### Operasjonsmatrise for Catenda Outbox

Følgende tabell definerer avstemmingsmetode og feilhåndtering per operasjon:

| Operasjon | Lokal operasjonsnøkkel | Ekstern ressursnøkkel | Avstemmingsmetode etter tapt respons | Forutsetninger og begrensninger | Håndtering ved ukjent utfall |
| --- | --- | --- | --- | --- | --- |
| **Topic** (`createTopic`) | `sak_id` + `outbox_id` | Forhåndsvalgt topic `guid` | Sjekk om topic med forhåndsvalgt GUID finnes via GET (`getTopic`). Alternativt list topics i board og match sakens tittel/referanse. | `createTopic` dokumenterer valgfritt `guid` i OpenAPI. Må verifisere API-atferd ved gjenbruk av GUID. Klienten sender i dag ikke GUID. | Parkeres som `USIKKERT_UTFALL`. Alarm utløses. Krever teknisk avstemming før retry. |
| **Dokumentopplasting** (`createLibraryItem`) | `vedlegg_id` + `innhold_sha256` | Dokumentets `guid` | Sjekk om fil med samme filnavn/sjekksum finnes i mappen. Bruk `failOnDocumentExists=true`. | **Kritisk forskjell:** `upload_document` bruker i dag `failOnDocumentExists=false`, som oppretter ny revisjon ved gjentakelse. Blind retry er forbudt. | Hvis filtilstand i biblioteket er uavklart: parkeres som `USIKKERT_UTFALL`. Ingen ny opplasting. |
| **Dokumentreferanse** (`createDocumentReference`) | `sak_id` + `vedlegg_id` | Referansens egen `guid` (forskjellig fra `document_guid`) | List dokumentreferanser på topic (`listDocumentReferences`) og match mot `document_guid`. | Referansens egen GUID må skilles fra det refererte dokumentets GUID. | Hvis referanseliste ikke kan leses: parkeres som `USIKKERT_UTFALL`. |
| **Kommentar** (`createComment`) | `sak_id` + `versjon` + delsteg | Forhåndsvalgt kommentar `guid` | Sjekk om kommentar finnes via GET på forhåndsvalgt GUID, eller list kommentarer på topic og match innholdshash/stempel. | `createComment` støtter valgfritt `guid` i OpenAPI, men atferd ved samtidig eller gjentatt POST er ikke verifisert i live API. | Parkeres som `USIKKERT_UTFALL`. Alarm utløses. |
| **Statusoppdatering** (`updateTopic`) | `sak_id` + ønsket status | Topic `guid` | GET topic details (`getTopic`) og verifiser om `topic_status` og felter matcher ønsket tilstand. | Idempotent av natur, forutsatt at eldre retry aldri overskriver en nyere ønsket sakstilstand. | Hvis GET feiler: retry etter eksponentiell backoff med jitter. |

#### Sikring mot zombie worker og utløpt lease

Dersom en arbeiderprosess henger i et tregt nettverkskall mot Catenda og leasen utløper, kan
en ny worker hente oppdraget. Et negativt oppslag (GET gir 404) beviser ikke at det forsinkede
kallet fra den gamle workeren ikke vil fullføres på Catendas side. Uten verifisert ekstern
samtidighetssikring kan begge kall få virkning. Ny worker kan derfor aldri anta at gammel
workers eksterne handling har stanset.

Videre beskyttes den lokale databasen ved at enhver oppdatering av outbox-oppdraget
(stegsjekkpunkt, statusendring) krever aktivt `lease_token`:
```sql
UPDATE utgaende_levering
SET steg = :neste_steg, sist_oppdatert = now()
WHERE id = :oppdrag_id AND lease_token = :aktivt_token AND lease_utloper > now();
```
En gammel worker som våkner til live etter at leasen er utløpt og forsøker å registrere
fullført steg, vil få 0 oppdaterte rader og må avbryte umiddelbart uten å forstyrre videre flyt.

#### Presis kommandoidempotens og grenser

1. **Avgrensing av outbox-omfang:**
   Det er den **utgående leveringen av bindende varsler og vedlegg** som flyttes ut av
   den synkrone HTTP-forespørselen. Innlogging, OAuth2 tokenfornyelse og direkte
   leseoppslag mot Catenda forblir påkrevde synkrone HTTP-operasjoner der det er hensiktsmessig.
2. **Atomisk lokal commit:**
   Hendelsen, godkjenningspakken, kommandokvitteringen og utgående leveringsordre
   skrives i nøyaktig én PostgreSQL-transaksjon via en autoritativ RPC. Avbrudd før
   commit etterlater **ingen nye eller delvise endringer** i databasen.
3. **Presis kommandoidempotens:**
   - *Identisk retry:* Mottas samme `command_id` med identisk prosjekt, aktør og
     innholdshash (`payload_hash`), avvises ikke kallet, men returnerer den eksisterende,
     lagrede kvitteringen idempotent.
   - *Motstridende gjenbruk:* Mottas samme `command_id` med avvikende prosjekt, aktør
     eller endret nyttelast, avvises forespørselen umiddelbart som ugyldig (400/422).
   - *Konkurrerende kommandoer:* To forskjellige, parallelle kommandoer som forsøker å
     opprette eller godkjenne samme sak/versjon håndteres via samtidighetslås i databasen:
     nøyaktig én transaksjon committer, mens den andre mottar `409 Conflict`.
4. **Frosset leveringsmål og konfigurasjon:**
   Mottakerkonfigurasjon, topic board-mapping og malversjoner fryses inn i outbox-oppdraget
   ved commit-tidspunktet (`topic_board_config_version`, `target_board_id`). En senere
   endring i prosjektets konfigurasjon skal aldri rute et allerede godkjent og frosset
   krav til feil ekstern mottaker under retry.

---

## 3. Oversikt over beslutninger og åpne designvalg

### 3.1 Premisser besluttet av oppdragsgiver (P1–P7)

Følgende premisser ble fastsatt 2026-09-20 og styrer arkitekturarbeidet:

| # | Premiss | Konsekvens for arkitekturen |
| --- | --- | --- |
| **P1** | **Magic links utgår helt.** | Innlogging skjer via Catenda ID eller Entra ID. Tabellen `magic_links` fjernes; tokens i `magic_links.json` saneres. |
| **P2** | **BIM er ikke i bruk i dag, men forblir relevant.** | Et BIM-objekt tilhører alltid én konkret sak. |
| **P3** | **Formålet med BIM-koblingen er analyse av tvistekomponenter.** | Aggregert analysebehov. Kobling/frakobling må logges som hendelser (`BIM_OBJEKT_KOBLET`/`FRAKOBLET`) for å bevare historikk (MS-13). |
| **P4** | **Vedlegg lagres kun i Catenda.** | Backend mellomlagrer bytene kun frem til levering. Catenda er arkiv. Vedleggsregisteret trenger en `innhold_sha256`-hash (MS-11) og antiviruskarantene. |
| **P5** | **Løsningen skal i prinsippet støtte andre virksomheter.** | `organisasjon_id` på `projects` skiller virksomhet fra prosjektnavn (MS-10). |
| **P6** | **To personer kan arbeide på samme sak i ulike spor samtidig.** | Total orden beholdes med `UNIQUE(sak_id, versjon)`. Sporuavhengige hendelser rebases ved konflikt i stedet for per-spor-versjonering (MS-03). |
| **P7** | **Arkivplikt går foran sletteplikt for kontraktsjournalen.** | Besluttet 21.09: kryptografisk sletting skal ikke bygges. Journalen bevares. Persondata minimeres via `aktor_id` (MS-04) og slettbare notater utenfor journalen (MS-05). Formell bevaringstid og sletteregler forankres i samråd med behandlingsansvarlig. |

### 3.2 Fristpunkter som er lukket mens journalen var tom

Følgende strukturelle endringer ble gjennomført før ekte saker finnes i databasen:

1. **MS-01 — Én hendelsestabell:** `koe_events`, `forsering_events` og `endringsordre_events`
   er slått sammen til tabellen `hendelse` (`20260920193558_hendelse_tabell.sql`).
2. **MS-04 — `aktor_id` i stedet for personnavn:** Journalen bærer `app_users.id`. Navneoppslag
   skjer utelukkende ved visning.
3. **MS-10 — `organisasjon_id` på `projects`:** Etablert som `NOT NULL` uten default
   (`20260920192448_organisasjon_id_paa_projects.sql`).
4. **MS-05 — Interne notater ut av journalen:** Tabellen `notat` etablert
   (`20260921153900_notat_tabell.sql`). Notater øker ikke sakens versjon, tidslinjen fletter
   kildene ved lesing, og forfatteren kan slette egne notater.
5. **MG-02 — Én identitetsform i journalen:** Webhookopprettede hendelser løser aktør via
   `koe_resolve_identity` (`20260921164900_koe_resolve_identity_coalesce.sql`). Formen
   `catenda:<subject>` er sanert.

### 3.3 Ytterligere beslutninger tatt 21.09 kveld

- **DB-05 (`viewer`-rolle):** Det er besluttet at `viewer` skal finnes som en egen leserolle
  (innsyn uten handlingsrett for revisor/rådgiver). Før den gamle tabellen `project_memberships`
  kan slettes, må `app_project_memberships` utvides til å støtte `viewer`.

### 3.4 Arkitekturføringer AF-01 til AF-06

Oppdragsgiver har sluttet seg til retningslinjene i `arkitekturforinger-2026-09-21.md`:

- **AF-01 (Prosjekt- og teamgrenser):** Datalaget må beskytte teaminterne data (notater,
  utkast, godkjenningspakker), ikke overlate skjermingen utelukkende til Python.
- **AF-02 (Transaksjon og rettigheter):** Append-only må verne både mot UPDATE/DELETE/TRUNCATE
  og mot uautorisert INSERT. Postgres med RPC beholdes som utgangspunkt.
- **AF-03 (Relasjonsintegritet):** Foretrukket retning **til videre vurdering** er en atomisk
  vedlikeholdt relasjonsprojeksjon med prosjektavgrensede fremmednøkler, fremfor ren JSONB-avledning.
- **AF-04 (Bevisførsel og dokumenter):** Dokumenthash må suppleres med dokumentversjon,
  pålitelig tidskilde, eksportverktøy og bevaringsmodell.
- **AF-05 (Ren gjenoppbygging):** Domenetilstand skal beregnes deterministisk fra hendelser
  alene (KR-04/MG-01 flyttes til svargrensen).
- **AF-06 (Verifikasjonsrekkefølge):** Ekte PostgreSQL-integrasjonstester i CI og én komplett
  EO-referanseflyt (inkludert minimal worker) prioriteres foran generell RY-opprydding.

---

### 3.5 Åpne designvalg og reviewer-anbefalinger (RGK-04, RGK2-03)

Reviewer har i reviewsammendragene gitt konkrete faglige anbefalinger til de fire åpne
valgene. Planen legger disse anbefalingene til grunn:

```
+-----------------------------------------------------------------------------------------------+
| Valg 1: Tilkoblingsmodell for atomiske transaksjoner (KONS-01)                                |
| Beslutningsstatus: Foreslått retning bekreftet                                                |
| Anbefaling: Behold PostgreSQL RPC over PostgREST som utgangspunkt.                            |
| Begrunnelse: Én RPC-forespørsel utføres i nøyaktig én PostgreSQL-transaksjon. Operasjonene    |
| samles i en autoritativ funksjon (commit_eo_approval). Direkte psycopg3-tilkobling er ikke    |
| nødvendig for atomisitet alene, og unngår å innføre et ekstra tilkoblingslag i Flask.        |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
| Valg 2: Relasjonsmodell for forsering og endringsordre (KONS-03 / AF-03)                      |
| Beslutningsstatus: Foretrukket alternativ til videre vurdering                                |
| Anbefaling: Foretrekk relasjonsprojeksjon (sak_relations) med prosjektavgrensede FK.          |
| Begrunnelse: Sikrer referanseintegritet mot sak(sak_id, prosjekt_id) og håndhever KOE-       |
| eksklusivitet direkte i databasen. Oppdateres atomisk i hendelsens transaksjon.               |
| Planen forutsetter at dette alternativet formelt velges ved godkjenning av planen.           |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
| Valg 3: Datalagets team- og tilgangsvern (KONS-04 / AF-01 / AF-02)                            |
| Beslutningsstatus: Reviewer-anbefaling under utforming                                         |
| Anbefaling: Utform runtime-rolle og databasefunksjoner samlet.                                |
| Begrunnelse: En avgrenset app_runtime-rolle uten BYPASSRLS kombineres med RLS for lesing og   |
| SECURITY DEFINER-funksjoner for skriving. Sikre funksjoner må ha fast search_path, streng    |
| EXECUTE-tildeling og verifisere aktør- og teamkontekst internt.                               |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
| Valg 4: Håndtering av flaky kappløpstest TST-02 i CI (KONS-12 / KR-15)                        |
| Beslutningsstatus: Reviewer-anbefaling under utforming                                         |
| Anbefaling: Gjør TST-02-reproduksjonen deterministisk ved styrt rekkefølge.                   |
| Begrunnelse: Å fjerne strict=True fjerner bare CI-feilen, ikke bevisets svakhet. Testen må    |
| koordinere trådene deterministisk ved den kritiske kollisjonsgrensen uten å maskere feilen.   |
+-----------------------------------------------------------------------------------------------+
```

---

## 4. Arbeidspakker i prioritert rekkefølge (RGK2-02, RGK2-03, RGK2-04)

Gjennomføringen er strukturert i seks faser (0–5). Avhengighetene mellom fasene er
innbyrdes konsistente:
- Fase 1 flytter og skjermer de navngitte **private lagrene** (`godkjenningspakke` og
  `utkast`) fra SQLite til PostgreSQL, etablerer tilgangslogging og håndterer tilbakekalling.
- Resterende lokale lagre (`vedlegg_registry.db` og `catenda_delivery_status.db`) har sin
  egen formelle avviklingsmilepæl i Fase 2 når vedleggstabellen og utgående levering etableres.
- Fase 2 fullfører en **komplett EO-referanseflyt** inkludert låserekkefølge, atomisk
  vedleggsbinding, vern av nyere utkast, forsvar i dybden for outbox, samt en **minimal worker**
  og feil-/restart-tester (inkludert zombie worker-scenariet).
- Tabellskjemaet utvikles oppgavebasert per fase uten frosne, urealistiske sluttsummer.

```
+-------------------------------------------------------------------------------+
| Fase 0: Verifiserbar leveranseprosess og byggesikkerhet                       |
| (CI m/PostgreSQL, requirements pinning, HTTP-herding, TST-02 deterministisk,  |
|  isolert staging-miljø, RV-14/17, AR-08, FE-06)                               |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 1: Lagringsmigrering (private lagre) og sikkerhetsfundament              |
| (SQLite -> PostgreSQL for utkast/pakker, AF-01/02 runtime-rolle, DB-05 viewer,|
|  tilgangslogging, fullmaktstilbakekalling, negative tester, migration repair) |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 2: Transaksjonell kjerne og EO-referanseflyt m/minimal worker            |
| (commit_eo_approval RPC m/låserekkefølge, utkastvern, vedleggsbinding, outbox |
|  m/steg, frosset config, minimal worker m/zombie-test, karanteneskanning)     |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 3: Øvrige adaptere, fullskala worker og driftsvarsling                   |
| (BH-svar, webhook inbox, batch outbox, delt rate limiting m/kvotehåndtering,  |
|  aktiv alarm for køtid og usikre utfall)                                      |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 4: Domenegjennomgang, bevisførsel og bevaring                            |
| (NS 8407 tilstandsregler, eksportverktøy, tidskilde, a11y, Catenda SLA,       |
|  bevarings-/sletteregler, AR-04 domeneharmonisering, RV-18, RY-opprydding)    |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| Fase 5: Organisatoriske forutsetninger og produksjonssetting                  |
| (ROS-analyse, DPIA-forankring, ekstern sikkerhetsrevisjon, restore-øvelse)    |
+-------------------------------------------------------------------------------+
```

---

### Fase 0: Verifiserbar leveranseprosess og byggesikkerhet

**Mål:** Etablere et uavhengig, reproduserbart og automatisk kontrollert bygg- og
testmiljø som hindrer regresjoner og fjerner tilfeldige CI-feil før videre DDL og kodeendringer.

**Inngående oppgaver og produksjonskrav:**
1. **CI med ekte PostgreSQL-tjeneste:** Utvide `.github/workflows/ci.yml` med en PostgreSQL
   17-container (i henhold til målversjonen i `supabase/config.toml`). Rørgaten skal kjøre
   samtlige migrasjoner i `supabase/migrations/` sortert og kjøre backend-testsuiten mot basen.
2. **Byggreproduserbarhet og avhengighetspinning:** Pinne samtlige avhengigheter i
   `backend/requirements.txt` med eksakte versjoner (`==` og hash-kontroll). Legge til
   sårbarhetsskanning (`pip-audit` og `npm audit`) som blokkerende steg i CI.
3. **HTTP-herding:** Innføre Content Security Policy (CSP), HSTS, `X-Content-Type-Options: nosniff`,
   `X-Frame-Options: DENY` og `Referrer-Policy: strict-origin-when-cross-origin` i `nginx.conf`.
   Verifisere mot TipTap rich-text editor og DOMPurify.
4. **Deterministisk kappløpstest (KONS-12 / KR-15):** Omarbeide `test_tst_02_samtidig_saksopprettelse...`
   i `test_testsuite_blindsoner_audit_20260918.py`. Kontrollere trådsekvensen deterministisk
   ved hjelp av synkroniseringsprimitiver uten å maskere den underliggende feilen.
5. **Sanering av driftsfeil og åpne ruter:** Oppheve RV-13 / CFG-03 / OBS-07: Sanere rå `str(e)`
   i feilhåndterere i 7 filer og sikre helsesjekkruter med standardiserte JSON-konvolutter.
6. **Etablering av isolert staging-miljø (RGK-02):** Konfigurere et dedikert staging-prosjekt
   i Supabase og et separat test-board i Catenda for automatisert testkjøring før produksjon.
7. **Forbud mot skjulte domenemutasjoner under GET (RV-14 / RGK2-04):** Gjennomgå samtlige
   GET-endepunkter og sikre at ingen forretningsmessige tilstandsoverganger eller hendelser
   opprettes ved lesing. Skille dette strengt fra nødvendig teknisk sesjonsvedlikehold og sikkerhetslogging.
8. **Strenge xfail med raises (RV-17):** Gjennomgå alle `@pytest.mark.xfail(strict=True)` i
   testsuiten og sikre at de spesifiserer forventet feiltype (`raises=...`).
9. **Baseline for driftdetektorer (AR-08):** Evaluere de 9 driftskriptene; etablere baseline
   for gyldige kontroller i CI og sanere ødelagte/foreldede skript.
10. **XSS-verifikasjon i brevvisning (FE-06):** Verifisere at `LetterHtmlPreview.svelte` ikke
    benytter usikret interpolering av rå HTML uten DOMPurify-sanering.

**Akseptkriterier:**
- GitHub Actions kjører backend-tester mot ekte PostgreSQL 17 med grønt resultat.
- `pip install` og `npm ci` gir eksakt reproduserbare bygg fra låste versjoner.
- 0 sårbarheter med alvorlighet High/Critical i avhengighetskjedene.
- Nginx leverer strenge sikkerhetshoder; verifisert med automatiserte tester.
- CI-suiten er 100 % deterministisk grønn (ingen tilfeldige XPASS på TST-02).
- Isolert staging-miljø er provisjonert og integrert i utrullingspipelinen.
- Samtlige GET-ruter er bekreftet fri for skjulte domenemutasjoner (RV-14).

---

### Fase 1: Lagringsmigrering (private lagre) og sikkerhetsfundament

**Mål:** Eliminere SQLite for sensitive saksdata ved å migrere utkast og godkjenningspakker
til PostgreSQL, etablere datalagsstyrt tilgangsvern for prosjekt og team, innføre tilgangslogging,
og håndtere tilbakekalling av fullmakter.

**Inngående oppgaver og produksjonskrav:**
1. **Migrering av private lagre fra SQLite til PostgreSQL (RGK-04, RGK2-03):**
   - Etablere tabellene `godkjenningspakke` og `utkast` i PostgreSQL med `prosjekt_id`,
     `kontraktsside` og `team_id`.
   - Flytte data og repository-kall fra lokal SQLite (`approval_packages.db`, `drafts.db`)
     til PostgreSQL.
   - Resterende lokale lagre (`vedlegg_registry.db` og `catenda_delivery_status.db`)
     avvikles formelt i Fase 2 når `vedlegg` og `utgaende_levering` etableres.
2. **Datalagsstyrt tilgangsvern (AF-01 / MS-09 / KONS-04):**
   - Innføre RLS og tilgangsbegrensninger som skiller både på prosjekt, kontraktsside og
     team for `notat`, `utkast` og `godkjenningspakke`.
   - Sikre at en spørring med en gitt aktør-/teamkontekst aldri kan returnere andre
     teams interne notater eller utkast.
3. **Runtime-rolle og minste privilegier (AF-02 / MS-02 / KONS-05 / KONS-13 / RGK-04):**
   - Definere en egen `app_runtime`-rolle uten `BYPASSRLS`.
   - Tildele eksplisitte, **nødvendige** rettigheter per tabell i migrasjonsfilene (ikke
     generell `GRANT ALL`).
   - Tilbakekalle direkte `UPDATE`, `DELETE`, `TRUNCATE` og `INSERT` på `hendelse` for
     `app_runtime`. Append-only vernes tosidig: bindende hendelser kan kun skrives via
     autoriserte prosedyrer.
4. **Rollen `viewer` og sletting av etterlatenskaper (DB-05 / MS-15 / DA-08–DA-10 / KONS-11):**
   - Utvide `app_project_memberships` med `role = 'viewer'`.
   - Slette etterlatenskapstabellene `user_groups`, `magic_links` og `project_memberships`.
   - Slå sammen prosjektkonfigurasjon: innlemme `project_configs` på `projects` (MS-12).
5. **Tilgangs- og endringslogging (RGK2-02):**
   - Etablere tabellen `tilgangslogg` for revisjonssporing av sensitive leseoperasjoner,
     sakseksport, samt endringer i prosjekttilgang og fullmakter.
   - Sikre at autorisasjonstokens og fullstendig brevtekst i klartekst skjermes fra
     ordinære applikasjonslogger.
6. **Tilbakekalling av medlemskap og fullmakt (RGK2-02):**
   - Definere formell virkningstid og konsekvenser ved tilbakekalling av medlemskap eller fullmakt:
     * Pågående utkast merkes som inaktive for den tilbakekalte brukeren.
     * Ventende godkjenninger krever re-allokering til aktiv fullmaktshaver.
     * Allerede utstedte og committede varsler forblir rettslig gyldige og uforandret i journalen.
7. **Negative tilgangstester og Data API-grenser (RGK2-02):**
   - Etablere automatiserte negative sikkerhetstester: kryssprosjekt, motpart, to ulike team
     på samme kontraktsside, ukjent team og direkte gjetting på ressurs-ID.
   - Verifisere at rollene `anon` og `authenticated` nektes direkte tabelltilgang via Data API,
     og at app_runtime, worker og migreringsroller har strengt avgrensede privilegier.
8. **Hemmelighetslager og rotasjonsrutiner (RGK-02):**
   - Etablere ekstern hemmelighetshåndtering (Secret Manager / Key Vault).
   - Fjerne hemmeligheter fra flate miljøvariabler; etablere rotasjonsprosedyrer.
9. **Avstemming av migrasjonshistorikk (DA-03 / DA-04 / KONS-10):**
   - Utføre `supabase migration repair` mot Supabase-prosjektet slik at tidsstemplene i
     `schema_migrations` samstemmer med filnavnene i repoet.

**Akseptkriterier:**
- Private data (utkast og godkjenningspakker) lagres i PostgreSQL med datalagsstyrt team-skjerming.
- Direkte spørring mot `notat` eller `utkast` fra annet team gir 0 rader på databasenivå.
- `app_runtime` nektes direkte `INSERT`, `UPDATE`, `DELETE` og `TRUNCATE` på `hendelse`.
- `app_project_memberships` støtter rollen `viewer`, og `project_memberships` er fjernet.
- Tilgang til sensitive lesinger og sakseksport logges i `tilgangslogg`.
- Tilbakekalling av fullmakt håndteres deterministisk uten brudd på historisk integritet.
- Negative tilgangstester for alle 5 isolasjonsscenarier er etablert og grønne.

---

### Fase 2: Transaksjonell kjerne og EO-referanseflyt m/minimal worker

**Mål:** Etablere én fullstendig, atomisk forretningsflyt for godkjenning og utstedelse
av endringsordre (EO), inkludert låserekkefølge, utkastvern, vedleggsbinding, minimal worker,
feiltester mot zombie worker, og karantene for vedlegg.

**Inngående oppgaver og produksjonskrav:**
1. **Autoritativ utstedelseskommando (`commit_eo_approval` RPC) (AF-02 / AP-04 / AR-06 / RGK2-02):**
   - Sanere kompenserende rollback i `TrackingUnitOfWork`.
   - Etablere tabellene `kommando` (idempotens) og `utgaende_levering` (outbox).
   - Implementere PostgreSQL RPC-funksjonen `commit_eo_approval` med følgende **strenge låserekkefølge og kontroller**:
     a) **Kommando-idempotens:** Sjekke `kommando`. Identisk payload returnerer lagret kvittering; endret payload avvises (400/422).
     b) **Låsing og tilstandskontroll:** Låse pakke og sak atomisk (`FOR UPDATE`). Verifisere pakkeversjon, at godkjenner har gyldig fullmakt, og at innholdet er frosset.
     c) **Policykontroll under samme lås (RV-02 / GFK-03):** Låse og verifisere gjeldende policyversjon. Policyendringer konkurrerer om samme lås, slik at en pakke aldri kan returneres mens utstedelse pågår.
     d) **Atomisk vedleggsbinding (RGK2-02):** Verifisere forventede vedlegg mot prosjekt, sak, eier/team, revisjon og at karantenestatus er `GODKJENT`.
     e) **Vern av nyere utkast (RGK2-02):** Slette innsendt utkast kun dersom utkastets revisjon fortsatt er gjeldende (hindrer at et utkast som ble redigert parallelt overskrives eller slettes feilaktig).
     f) **Skriving:** Skrive `endringsordre_utstedt` til `hendelse`, oppdatere `godkjenningspakke`, oppdatere metadataprojeksjonen (`sak_projeksjon`).
     g) **Outbox-opprettelse m/forsvar i dybden (RGK2-02):** Opprette outbox-oppdrag i `utgaende_levering` med frosset mål/config. Avvise automatisk dersom private data (notater/utkast) forsøkes lagt i outbox.
     h) **Kvittering:** Registrere kommandokvittering i `kommando`.
2. **Minimal Outbox Worker og feiltester (RGK-01 / RGK2-01 / KONS-14):**
   - Implementere en fristilt, minimal arbeiderprosess som poller `utgaende_levering` med
     `FOR UPDATE SKIP LOCKED`.
   - Implementere stegsjekkpunkter i henhold til 5-operasjonsmatrisen i avsnitt 2.2.
   - Implementere statusen `USIKKERT_UTFALL` ved uavklart nettverksavbrudd, med umiddelbar alarm.
   - Gjennomføre eksplisitte feiltester:
     * Krasj før commit: verifiser ingen nye eller delvise endringer.
     * Identisk retry etter commit: verifiser samme kvittering; endret payload avvises.
     * Konkurrerende godkjenninger: verifiser én commit og én 409 Conflict.
     * Ekstern commit med tapt respons: verifiser operasjonell avstemming mot Catenda.
     * **Gammel worker lever ved utløpt lease (zombie worker / RGK2-01):** Verifisere at gammel worker avvises ved forsøk på lokal oppdatering med utløpt `lease_token`, og at ny worker ikke overskriver tilstand ukontrollert.
3. **Avvikling av resterende SQLite-lagre (RGK2-03):**
   - Etablere tabellen `vedlegg` i PostgreSQL (migrere data fra `vedlegg_registry.db`).
   - Avvikle `CatendaDeliveryStatus` (`catenda_delivery_status.db`); outboxens `utgaende_levering` overtar all leveringssporing.
4. **Karantene og virusskanning for vedlegg (AF-04 / MS-11 / RGK-02):**
   - Feltene `innhold_sha256`, `karantene_status` (`IKKE_SKANNET`, `GODKJENT`, `AVVIST`) og `dokument_versjon`.
   - Filer mellomlagres og skannes for skadevare før frigivelse til godkjenning eller Catenda.
5. **Ren projeksjon i `compute_state` (AF-05 / KR-04 / MG-01 / MG-04 / MG-05 / KONS-07):**
   - Fjerne navneoppslag (`lib/aktor_navn`) fra `timeline_service.py:compute_state`.
   - `SakState` lagrer aktørens UUID; navneoppslag flyttes til svargrensen / presentasjonslaget.
   - Sanere `created_by` (MG-04) og `ownerName` (MG-05) i tilstandsobjektene.
6. **Kompatibilitet ved utrulling og tilbakerulling (RGK2-02):**
   - Sikre at hendelsesloggen og projeksjonene kan deserialiseres og leses trygt ved versjonsoverganger og ved eventuell tilbakerulling til forrige kodeversjon.
7. **Stram parsegrense for serverstyrte felter (MG-03):**
   - Oppdatere `parse_event_from_request` til å avvise samtlige fem serverfelt direkte på modellnivå.
8. **Relasjonsprojeksjon (AF-03 / MS-08 / KONS-03):**
   - Forutsatt at anbefalt alternativ velges ved planens godkjenning: beholde `sak_relations` som atomisk oppdatert projeksjon med fremmednøkler mot `sak(sak_id, prosjekt_id)`. Teste KOE-eksklusivitet.

**Akseptkriterier:**
- Avbrudd før commit etterlater ingen nye eller delvise endringer i databasen.
- Retry med samme command-ID og matching payload gir identisk kvittering; endret payload avvises.
- Konkurrerende utstedelser gir nøyaktig én commit og én 409 Conflict.
- Policy og pakke låses under samme transaksjon; policyretur midt i utstedelse er umulig (RV-02).
- Vedleggsbinding validerer eierskap og karantenestatus atomisk; nyere utkast overskrives ikke.
- Zombie worker nektes oppdatering etter utløpt lease; minimal worker overlever prosessrestart.
- Vedleggsregisteret og delivery status er migrert til PostgreSQL; SQLite er helt avviklet.
- `compute_state` er 100 % deterministisk og ren, uten avhengighet av Flask- eller app-kontekst.

---

### Fase 3: Øvrige adaptere, fullskala worker og driftsvarsling

**Mål:** Utvide den transaksjonelle outbox- og inbox-mekanismen til samtlige eksterne
hendelser, etablere delt rate limiting for flernodekjøring og aktive driftsalarmer.

**Inngående oppgaver og produksjonskrav:**
1. **Fullskala Outbox Worker for skyplattform (KONS-14):**
   - Etablere produksjonsrigg for worker på Google Cloud Run / Azure Container Apps med
     lease-sweeper, eksponentiell backoff med jitter, og dead-letter-håndtering.
   - Innsyn i dead-letter og manuell retry krever autorisert tilgang og reviderbar logging.
2. **Øvrige outbox-adaptere:**
   - Koble BH-svar og ordinære TE-kravmeldinger til outboxen.
   - Sikre at `/api/events/batch` registrerer leveringsintensjon i outboxen (RV-10 / INT-05).
3. **Inbox-adapter for innkommende webhooks (INT-01 / INT-02 / RV-12):**
   - Etablere tabellen `innkommende_hendelse` i PostgreSQL med unikhetskrav på
     `catenda_event_id` og SHA-256 payload-fingeravtrykk.
   - Fjerne usikker forhåndsreservering; innsetting og prosessering skjer idempotent.
4. **Delt kapasitetsstyring og rate limiting (RGK-02, RGK2-04):**
   - Innføre en distribuert rate limiter (Redis- eller DB token bucket) på tvers av flere noder:
     * **Innkommende API-beskyttelse:** Dimensjonert for normal last med avvisning (HTTP 429) ved overlast (f.eks. terskel på 100 req/s per klient) for å beskytte tjenesten.
     * **Utgående Catenda-beskyttelse:** Felles rate limiter som respekterer Catendas kvoter (f.eks. maksimalt 10 req/s aggregert på tvers av alle noder).
     * **Kvoteavslagshåndtering:** Ved mottak av 429 fra Catenda ruller worker tilbake med eksponentiell backoff og jitter, uten tap av data.
5. **Aktiv varsling og overvåking (RGK-02, RGK2-04):**
   - Etablere overvåking og aktive alarmer (Slack/Teams/PagerDuty):
     a) **Køforsinkelse:** Alarm utløses dersom eldste ubehandlede outbox-jobb overskrider definert terskel (tentativt forslag: 15 minutter).
     b) **Usikkert utfall:** Umiddelbar alarm dersom et oppdrag settes til `USIKKERT_UTFALL` eller legges i dead-letter.
     c) Automatisert helsesjekk av varslingsruten.

**Akseptkriterier:**
- Ingen utgående nettverkskall mot Catenda utføres innenfor HTTP-forespørselens levetid for noen sakstyper.
- Webhook-mottak er fullstendig idempotent og tåler container-krasj midt i mottak.
- Flere samtidige worker-noder respekterer felles rate limits mot Catenda og håndterer 429-svar med backoff.
- Testede alarmer utløses ved køforsinkelse og ved usikkert utfall.

---

### Fase 4: Domenegjennomgang, bevisførsel og bevaring

**Mål:** Verifisere samtlige tilstandsoverganger mot standarden NS 8407, etablere verktøy
for uavhengig bevisfremleggelse for voldgift, harmonisere domenemodellen i to språk,
og fastsette bevaringsregler.

**Inngående oppgaver og produksjonskrav:**
1. **Domenegjennomgang NS 8407 (RC-8):**
   - Systematisk testdekning for alle tilstandsoverganger i `business_rules.py` og
     `timeline_service.py` (TFR-02 til TFR-06, GFK-02 til GFK-06).
   - Avklare fullmaktskontroll når fristdager mangler dagmulktsats (GFK-01 / FE-04).
   - Formalisere at forsering ikke inngår i godkjenningskjeden (GFK-04, bekreftet avgrensning).
   - Vurdere gjeninnføring av `UP042` (StrEnum) mot hendelsesversjonering.
2. **Harmonisering av domenemodellen i to språk (AR-04 / RGK2-05):**
   - Sikre at domenemodellen i Python (`business_rules.py`, `timeline_service.py`) og
     TypeScript (`vederlagDomain.ts`) samordnes for å hindre asymmetri eller semantisk drift.
3. **Bevisførsel og uavhengig eksport (AF-04):**
   - Implementere en eksportfunksjon som genererer en komplett, selvstendig sakspakke:
     hendelseslogg, aktør-IDer, tidsstempler, dokumentversjoner, sjekksummer og
     leveringskvitteringer, lesbar uten at applikasjonen kjører.
   - Forankre tidsstempler mot en verifisert, pålitelig tidskilde.
4. **Bevarings- og sletteregler for filer, logger og backup (RGK-02, RGK2-04):**
   - Forankret i premiss P7: Kontraktsjournalen (`hendelse`) bevares uten kryptografisk sletting. Formelle oppbevarings- og arkivfrister fastsettes i samråd med behandlingsansvarlig.
   - Midlertidige stagingfiler for vedlegg slettes etter bekreftet overføring til Catenda (tentativt forslag: 24 timer etter kvittert levering, forutsatt at filen ikke trengs for utestående leveranser eller feilsøking).
   - Oppbevarings- og anonymiseringsregler for applikasjonslogger og backuprotasjon.
   - Fysisk fjerne slettede interne notater (`notat`) ved forfatterens slettekall.
5. **Sanering av dokumentasjonsbacklog (RV-18 / RGK2-05):**
   - Merke foreldede designnotater med daterte merknader; sanere referanser til slettede filer.
6. **Universell utforming (a11y):**
   - Løse de 3 konkrete a11y-advarslene i `WithdrawModal` og `Kontrollrommet`.
7. **Catenda-avtaleverk:**
   - Dokumentere SLA, nedetidsprosedyrer og rettslige konsekvenser av tapt Catenda-tilgang.
8. **RY-opprydding:**
   - Gjennomføre oppryddingsoppgavene RY-01 til RY-07 (indeksering, keyset-paginering).

**Akseptkriterier:**
- Samtlige NS 8407 tilstandsoverganger har dokumenterte og grønne tester.
- Domeneregler i Python og TypeScript er harmonisert (AR-04).
- En hel sak kan eksporteres til en kryptografisk etterprøvbar filpakke for oppmann/rettsapparat.
- Stagingfiler slettes etter bekreftet levering uten fare for tap av filer under pågående oppdrag.
- `npm run check` kjører med 0 feil og 0 a11y-advarsler.
- Signert Catenda SLA og driftsavtale foreligger.

---

### Fase 5: Organisatoriske forutsetninger og produksjonssetting

**Mål:** Sikre at samtlige organisatoriske, juridiske og sikkerhetsmessige forutsetninger
er oppfylt før systemet idriftssettes for Oslobygg KF.

**Inngående oppgaver og produksjonskrav:**
1. **Formell ROS-analyse:** Innhente og gjennomføre risiko- og sårbarhetsanalyse i samarbeid
   med sikkerhetsansvarlig hos Oslobygg KF.
2. **Fullføring av DPIA (RGK2-04):** Ferdigstille konsekvensvurdering for personvern basert på
   `personopplysninger-faktagrunnlag-2026-09-19.md`. Behandlingsansvarlig virksomhet (Oslobygg KF)
   forankrer vurderingen med råd fra personvernombudet og øvrige relevante fagfunksjoner.
3. **Ekstern sikkerhetsrevisjon:** Gjennomføre penetrasjonstest av API, autorisasjonslag og
   outbox/inbox av en uavhengig tredjepart.
4. **Beredskaps- og tvisteinstruks:** Etablere formell driftsinstruks for håndtering av
   påståtte tapte varsler eller bestridte fristoverskridelser.
5. **Fullskala gjenopprettingsøvelse (Restore-test):** Gjennomføre full restore fra backup
   til et tomt cluster, og etterprøve at gjenopprettingen ikke medfører utilsiktet duplikatutsending
   av historiske outbox-meldinger.

**Akseptkriterier:**
- Behandlingsansvarlig hos Oslobygg KF har forankret ROS og DPIA med råd fra personvernombudet.
- Ekstern penetrasjonstest er gjennomført uten åpne Kritiske eller Høye funn.
- RPO og RTO er dokumentert og verifisert i en vellykket restore-øvelse.
- Beredskapsinstruks er signert av produkteier.

---

### 4.1 Oppgavebasert tabellutvikling per fase (RGK2-03)

I stedet for å låse fremtidige tabelltall til et fiksert regnestykke, beskrives tabellstrukturen
i skjemaet `public` som en oppgavebasert utvikling styrt av konkrete avhengigheter:

- **Utgangspunkt i dag (etter MS-05):** 19 tabeller i `public`.
- **Fase 1 (Sikkerhetsfundament og private lagre):**
  * *Dropper 3 etterlatenskapstabeller:* `magic_links`, `user_groups`, `project_memberships` (-3).
  * *Etablerer private lagre fra SQLite:* `godkjenningspakke`, `utkast` (+2).
  * *Slår sammen konfigurasjon:* `project_configs` innlemmes på `projects` (MS-12) (-1).
  * *Etablerer audit-sporing:* `tilgangslogg` (+1).
  * *Endelig netto:* Avhenger av om sesjons- og policykonfigurasjon forblir egne tabeller eller samles.
- **Fase 2 (Transaksjonell kjerne og vedlegg):**
  * *Etablerer leveringskjerne:* `utgaende_levering`, `kommando` (+2).
  * *Flytter vedleggsregister fra SQLite:* `vedlegg` (+1) (avvikler SQLite `vedlegg.db` og `catenda_delivery_status.db`).
  * *Deler metadata:* `sak_metadata` deles i `sak` (register) og `sak_projeksjon` (avledet tilstand) (+1).
  * *Relasjoner:* `sak_relations` videreføres med fremmednøkler forutsatt at anbefalt relasjonsprojeksjon velges.
- **Fase 3 (Webhook inbox):**
  * *Etablerer webhook-inbox:* `innkommende_hendelse` (+1).
- **Fase 4–5 (Driftsstabilisering):**
  * Skjemastrukturen er stabil; optimalisering av indekser og partisjonering.

---

## 5. Sporbarhet tilbake til opprinnelige pakker og produksjonskrav (RGK-02, RGK2-02)

| Område / Krav | Kilde i masterplan / audit | Status og plassering i denne planen |
| --- | --- | --- |
| **0 — Lukk eksponering** | SA-01, SA-02, SA-03, RV-06, RV-22 | **Lukket i koden.** Ruteregister håndhever; overvåkes i **Fase 0**. |
| **1 — Felles sikkerhetsgrenser** | AR-01, RV-07, AUT-01, AUT-02, AUT-03, AF-01, MS-09 | Delvis i kode; team- og prosjektvern flyttes til databasen i **Fase 1**. |
| **1 — Verifiserbar leveranseprosess** | AR-05, S9, DA-03, DA-04, KONS-10 | Delvis i repo; fullføres med ekte PostgreSQL i CI i **Fase 0**. |
| **1 — Isolert staging-miljø** | Masterplan produksjonskrav (linje 304–309) | Etableres som separat Supabase/Catenda-miljø i **Fase 0**. |
| **1 — Forbud mot skjulte mutasjoner (RV-14)** | RV-14, Masterplan linje 165 | Verifisering av at GET-ruter er fri for domenemutasjoner i **Fase 0**. |
| **1 — Strenge xfail med raises (RV-17)** | RV-17, Masterplan linje 168 | Gjennomgå xfail-dekoratører i testsuiten i **Fase 0**. |
| **1 — Driftdetektorer (AR-08)** | AR-08, Arkitekturvurdering 19.09 | Baseline gyldige skript i CI; sanere ødelagte i **Fase 0**. |
| **1 — HTML-interpolering (FE-06)** | FE-06, Vurdering 19.09 | Verifisere DOMPurify-sanering i brevforhåndsvisning i **Fase 0**. |
| **1 — Hemmelighetslager og rotasjon** | Masterplan produksjonskrav (linje 304–309) | Eksternt hvelv og automatiserte rotasjonsrutiner i **Fase 1**. |
| **1 — Tilgangs- og endringslogging** | Masterplan produksjonskrav (RGK2-02) | `tilgangslogg` for sensitive lesinger og sakseksport i **Fase 1**. |
| **1 — Tilbakekalling av medlemskap/fullmakt**| Masterplan produksjonskrav (RGK2-02) | Formell virkningstid og konsekvenser i **Fase 1**. |
| **1 — Negative tilgangstester** | Masterplan produksjonskrav (RGK2-02) | Tester for prosjekt-, motpart- og teamisolasjon i **Fase 1**. |
| **1 — Databasearkitektur** | DA-01–DA-15, MS-01–MS-15 | Fristpunkter lukket; private lagre i **Fase 1**; kjerne i **Fase 2**. |
| **1 — Byggreproduserbarhet** | Requirements pinning, pip-audit | Behandles og gates i **Fase 0**. |
| **1 — HTTP-herding** | Nginx CSP, HSTS, frame-ancestors | Behandles og testes i **Fase 0**. |
| **1 — Sanering av driftsfeil (RV-13)** | RV-13, CFG-03, OBS-07 | Rå `str(e)` saneres og helsesjekker sikres i **Fase 0**. |
| **2 — Atomisk domene og levering** | AP-01–AP-05, AR-06, TST-03, INT-05, RV-10, AF-02 | Autoritativ RPC m/låserekkefølge, outbox og minimal worker i **Fase 2**. |
| **2 — Atomisk vedleggsbinding & utkastvern** | Masterplan produksjonskrav (RGK2-02) | Vedleggsvalidering og beskyttelse av nyere utkast i **Fase 2**. |
| **2 — Forsvar i dybden for outbox** | Masterplan produksjonskrav (RGK2-02) | Outbox avviser notater/utkast; dead-letter tilgangskontroll i **Fase 2**. |
| **2 — Minste privilegier & integritet** | AR-02, S10, MS-02, KONS-05, KONS-13 | `app_runtime`-rolle og eksplisitte nødvendige rettigheter i **Fase 1**. |
| **2 — Karantene og virusskanning** | Masterplan produksjonskrav (linje 304–309) | Integrert i vedleggsflyten i **Fase 2**. |
| **2 — Ren tilstandsprojeksjon** | AF-05, KR-04, MG-01, MG-04, MG-05 | `compute_state` renses for navneoppslag i **Fase 2**. |
| **2 — Kompatibilitet ved utrulling/rollback**| Masterplan produksjonskrav (RGK2-02) | Bakoverkompatibel hendelsesdeserialisering i **Fase 2**. |
| **2 — Domenegjennomgang NS 8407** | TFR-01–TFR-06, GFK-01–GFK-06, UP042 | TFR-01/GFK-01 lukket; GFK-04 avgrenset; resten i **Fase 4**. |
| **2 — Bevisførsel og framleggelse** | AF-04, MS-11, eksportverktøy | Frosne dokumentversjoner og uavhengig eksport i **Fase 4**. |
| **3 — Fullskala worker og adaptere** | KONS-14, BH-svar, webhook inbox | Skalerbar worker, inbox-tabell og batch-outbox i **Fase 3**. |
| **3 — Delt kapasitet & rate limiting**| Masterplan produksjonskrav (linje 304–309) | Kvantifisert rate limiter for API og Catenda i **Fase 3**. |
| **3 — Aktiv driftsvarsling** | Masterplan produksjonskrav (linje 304–309) | Alarm ved køforsinkelse og ved `USIKKERT_UTFALL` i **Fase 3**. |
| **3 — Bevarings- og sletteregler** | Masterplan produksjonskrav (linje 304–309) | Sletting av stagingfiler, loggretensjon og backup i **Fase 4**. |
| **4 — Harmonisering av domenemodell (AR-04)**| AR-04, Arkitekturvurdering 19.09 | Samordning av Python og TypeScript domenemodell i **Fase 4**. |
| **4 — Dokumentasjonsbacklog (RV-18)** | RV-18, Masterplan linje 168 | Daterte merknader på foreldede dokumenter i **Fase 4**. |
| **4 — Universell utforming (a11y)** | 3 advarsler i Svelte-komponenter | Løses i **Fase 4**. |
| **4 — Catenda-avhengighet og SLA** | SLA, driftsavtale, oppetid | Forankres og signeres i **Fase 4**. |
| **5 — Organisatoriske forutsetninger**| ROS, DPIA, ekstern pentest, restore | Forankres av behandlingsansvarlig hos Oslobygg KF i **Fase 5**. |

---

## 6. Svarmatrise for reviewfunn (RGK-01–06 og RGK2-01–05)

| ID | Funn i review | Håndtering i oppdatert v2 | Plassering i v2 |
| --- | --- | --- | --- |
| **RGK2-01** | Avstemmingsgaranti per operasjon; GUID-støtte alene utilstrekkelig; zombie worker-scenariet manglet. | Innarbeidet normativ kontrakt og en 5-operasjonsmatrise for Catenda API (Topic, Filopplasting, Referanse, Kommentar, Status). Skilt mellom lokal nøkkel og ekstern nøkkel. Beskrevet håndtering ved `failOnDocumentExists=true` mot ny revisjon ved `false`. Beskrevet zombie worker og krav om aktivt `lease_token` for DB-oppdateringer. | Avsnitt 2.2, 4 (Fase 2) |
| **RGK2-02** | Flere kildekrav manglet i v2: låserekkefølge for policy/pakke, utkastvern, vedleggsvalidering, tilgangslogging, fullmaktstilbakekalling, utrullingskompatibilitet og negative tester. | Samtlige 7 krav er eksplisitt innarbeidet med avhengighet og akseptkriterier: låserekkefølge i `commit_eo_approval`, revisjonssjekk på utkast før sletting, forsvar i dybden for outbox, `tilgangslogg`, fullmaktstilbakekallingsregler, utrullingskompatibilitet og negative tilgangstester. | Avsnitt 4 (Fase 1 og 2), Avsnitt 5 |
| **RGK2-03** | Fasekriterier og tabelltall motsa oppgavene: SQLite krevdes fjernet i Fase 1 mens vedlegg lå i Fase 2; AF-03 var forutsatt vedtatt; statiske tabelltall. | Korrigert fasegrense: Fase 1 flytter de navngitte private lagrene (utkast og godkjenningspakker). Resterende SQLite (vedlegg og delivery status) avvikles i Fase 2. AF-03 er presisert med forbehold om endelig vedtak. Statisk tabellregnskap erstattet med oppgavebasert utvikling per fase. | Avsnitt 4 (Fase 1 og 2), Avsnitt 4.1 |
| **RGK2-04** | Uavklarte driftsverdier fremsto som vedtatt («evigvarende arkivplikt», 15 min / 24 timer, «ingen 429», ombud som godkjenner, vid GET-regel). | Korrigert ordlyd: P7 refererer til at journalen bevares uten kryptografisk sletting; formelle frister avklares med behandlingsansvarlig. DPIA forankres av behandlingsansvarlig med råd fra ombudet. Terskelverdier (15 min, 24 t) merket som tentative forslag. Rate limiting definert med 429-avvisning og backoff. RV-14 avgrenset til forbud mot domenemutasjoner. | Avsnitt 2.1, 3.1, 4 (Fase 0, 3, 4, 5) |
| **RGK2-05** | Kildegrunnlaget manglet kolonner, proveniens og mapping for AR-04, AR-08, FE-06; feilaktig referanse til «avsnitt 8». | Kildegrunnlag v2 oppdatert med separate kolonner for kildested og verifikasjonskategori. AR-04, AR-08, FE-06 fullt mappet. Råloggproveniens presisert for samlede testtider. Henvisninger rettet til faktiske avsnitt (Avsnitt 7). | Avsnitt 4, 5; Kildegrunnlag v2 Avsnitt 4, 7 |

---

## 7. Verifikasjon og grenser

### 7.1 Kjørt og observert lokalt
1. **Samlet teststatus i repoet (historisk baseline fra oppstartskjøring 21.09/22.09):**
   - Backend pytest kjørt med `backend/venv/bin/python -m pytest -q`:
     **1527 passed, 9 skipped, 42 xfailed, 7 warnings på 9.29 s**.
   - Frontend vitest kjørt med `npm test -- --run`:
     **51 testfiler, 590 tester passert på 31.10 s**.
   - Svelte-diagnostikk (`npm run check:error`): **0 feil, 9 advarsler** (3 a11y, 6 runes-advarsler).
   - Lint (`ruff check backend/`): **0 feil**.
2. **Målrettede testkjøringer i denne økten:**
   - Målrettet test av AUT-03 med `backend/venv/bin/python -m pytest -q tests/test_routes/test_notat_lagring.py::test_batchruta_avviser_internt_notat tests/test_security/test_autorisasjon_audit_20260918.py::test_batch_innsending_lekker_internt_notat_i_last_event_at --runxfail`:
     **1 passed, 1 failed** (bekrefter at ruten avviser med `400 INTERNT_NOTAT_IKKE_I_BATCH` og at xfail feiler på statuskoden `201`).
   - Automatisk lenkekontroll over alle markdownfiler i `docs/`: **0 brutte lenker**.
3. **Katalogverifikasjon mot PostgreSQL 18.6 (lokalt testcluster):**
   - Samtlige 23 migrasjoner i `supabase/migrations/` bygger feilfritt og etablerer 19 tabeller i `public`.
   - Katalogsjekksum for `contype <> 'n'` er eksakt `cfeb38f87cc002e1b2e5959f02e2bacb`, bit-identisk med referansen. De 105 ekstra skrankene er PG18s interne `NOT NULL`-representasjon (`contype = 'n'`).

### 7.2 Lest ut av koden og spesifikasjoner
1. `docs/tredjepart-api/topic-api-openapi.yaml`: `createTopic` (linje 680), `createComment` (linje 997), og `createDocumentReference` (linje 1131) støtter valgfritt felt `guid`.
2. `docs/tredjepart-api/document-api-openapi.yaml`: `createLibraryItem` (linje 262) dokumenterer `failOnDocumentExists`: ved `false` opprettes ny revisjon, ved `true` avvises eksisterende filnavn.
3. `backend/integrations/catenda/mixins/comments.py`: `create_comment` sender i dag kun kommentarinnhold uten forhåndsvalgt GUID.
4. `backend/services/vedlegg_registry.py`: Benytter SQLite (`vedlegg.db`) for lokal mellomlagring.
5. `backend/services/catenda_delivery_status.py`: Benytter SQLite (`catenda_delivery_status.db`) for leveringskvitteringer.
6. `backend/routes/event_routes.py:778–791`: `submit_batch` avviser internt notat med `400 INTERNT_NOTAT_IKKE_I_BATCH`.
7. `backend/repositories/supabase_notat_repository.py:30–43`: `_side` filtrerer på både `sak_id` og `prosjekt_id`.
8. `backend/lib/aktor_navn.py:56`: Bruker `has_app_context()` for å sjekke applikasjonskontekst.
9. `backend/services/timeline_service.py:1122`: Kaller `aktor_navn.navn()` under tilstandsberegning.

### 7.3 Historisk dokumentert i tidligere runder
1. Supabase-prosjektet `gwdxadexwktegkklyobv` kjører PostgreSQL 17.6 og har 19 tabeller i `public`.
2. Katalogsjekksummer fra PG16 (MS-05) ble protokollført i `docs/gjennomforing-ms05-2026-09-21.md`.
3. Observasjonen om «1 XPASS / 20» for KR-15 stammer fra testkjøringer dokumentert i auditnotatet `docs/audit-korrekthet-2026-09-21.md`.
4. Premissene P1–P7 og fristpunktene MS-01, MS-04, MS-10, MS-05, MG-02 er protokollført i masterplanen og handoffs.

### 7.4 Ikke kontrollert / Status ikke innhentet (utenfor repo)
1. Ekstern Supabase-database (`gwdxadexwktegkklyobv`): Ingen spørringer eller DDL er kjørt mot den eksterne databasen i denne runden.
2. Catenda Bimsync live API: Ingen eksterne nettverkskall er foretatt; API-atferd ved duplikate forhåndsvalgte GUID-er er ikke testet mot live tjeneste.
3. Organisatoriske forhold (ROS-analyse, DPIA-forankring, ekstern penetrasjonstest, formell driftsinstruks, fullskala restore-test): Status er ikke innhentet fra Oslobygg KF / driftspartnere, og må avklares med behandlingsansvarlig og systemeiere.
4. Produksjonskode, eksisterende tester og migrasjonsfiler i repoet er **100 % uendret**.
