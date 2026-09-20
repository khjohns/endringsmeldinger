# Audit: databasens faktiske tilstand, RLS og migrasjoner (Pass 1) — 2026-09-18

Gjennomført 18. september 2026. Gjenstand:
Databasemigrasjoner, tabellstrukturer, fremmednøkler, RLS-policyer (Row Level Security),
tilgangsrettigheter og skjemakonsistens mot backend-kode og modeller
(`backend/migrations/`, `supabase/migrations/`, `backend/repositories/supabase_sak_metadata_repository.py`,
`backend/repositories/supabase_event_repository.py`, `backend/repositories/bim_link_repository.py`,
`backend/repositories/membership_repository.py`, `backend/models/project_membership.py`,
`backend/models/bim_link.py`).

Kryssreferanser:
- [audit-review-astra-2026-09-17.md](audit-review-astra-2026-09-17.md) (spesielt RV-06, RV-08, RV-15)
- [audit-sikkerhetsarkitektur-2026-09-17.md](audit-sikkerhetsarkitektur-2026-09-17.md) (spesielt SA-01, S2, S10)
- [audit-autorisasjon-2026-09-18.md](audit-autorisasjon-2026-09-18.md) (Pass 2)
- Testfil: [test_database_rls_audit_20260918.py](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_database_rls_audit_20260918.py)

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

---

**Etterprøvd 2026-09-19** i [vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md), mot faktisk skjema i
databasen. DB-01, DB-03, DB-04, DB-05 og DB-06 er bekreftet. **DB-02 og DB-07 har
riktig premiss, men konsekvensen inntreffer ikke** — kolonnene finnes i databasen,
så `update_cache()` krasjer ikke; funnene gjelder migrasjonsdrift, ikke driftsfeil.
**DB-08 er uten virkning**: det finnes ingen views i `public`. Merk at testene som
reproduserer DB-02 og DB-07 leser SQL-filer, ikke databasen, og derfor forblir
`xfail` uansett hva databasen inneholder.

**Merknad 2026-09-20: DB-06 og DB-03 er lukket, kontrollert mot basen.**
Migrasjonen `20260920060000_tenant_attribution_prosjekt_id` er anvendt: de tre
hendelsestabellene og `sak_relations` har nå `prosjekt_id TEXT NOT NULL` uten
default, med indeks (DB-06), og `sak_metadata`s `DEFAULT 'oslobygg'` er droppet
(DB-03). *Kjørt og observert:* en rad uten prosjekt avvises med `23502`.
Tabellene var tomme, så ingen rad kunne bli feilmerket.

To presiseringer. **DB-06s reproduksjonstest leser modulens docstring, ikke
databasen** — den er grønn fordi DDL-en der er oppdatert, og beviser altså
docstringen. Skjemaet er verifisert med katalogspørring, ikke med testen; det står
skrevet inn i testen. Og **DB-04 er bare delvis lukket**: `sak_relations` har fått
`prosjekt_id`, men fremmednøklene mangler fortsatt.

Merk også at dette *ikke* lukker AR-01. Kolonnen gjør at en prosjektpolicy lar seg
skrive; ingen policy er skrevet, og samtlige er fortsatt
`service_role / ALL / USING (true)`.

## Omfang

**Undersøkt:**
- Fullstendighet og kjørbarhet i migrasjonskatalogene `backend/migrations/` og `supabase/migrations/`.
- Samsvar mellom repositories/modeller i Python og tabellstrukturene definert i SQL.
- Hardkodede verdier, standardprosjekter og multitenant-isolasjon i databaseskjemaet.
- Radnivåsikkerhet (RLS), manglende policyer og kryssprosjekt-lekkasjer.
- Integritetsskranker, CHECK-constraints og fremmednøkler (FK) mellom relasjonstabeller.
- PostgreSQL-views og `security_invoker`-konfigurasjon.

**Bevisst ikke undersøkt i dette passet:**
- Live nettverkskall mot ekstern Supabase-instans (`RUN_LIVE_SUPABASE` aldri satt).
- Frontend-komponenter og Svelte 5 runes (behandles i Pass 6).

---

## Sammendrag av funn

| ID | Alvorlighet | Kategori | Funn | Metode |
| --- | --- | --- | --- | --- |
| DB-01 | Kritisk | Migrasjoner / Deploy | Migrasjonskjeden feiler på tom database: `sak_metadata` og hendelsestabeller mangler `CREATE TABLE` | Kjørt og observert |
| DB-02 | Høy | Skjemadrift / Krasj | 8 rapporteringskolonner (`cached_sum_krevd` osv.) mangler i databasen; repository-kall og backfill krasjer | Kjørt og observert |
| DB-03 | Høy | Multitenancy / Isolasjon | `004_projects_table.sql` setter `DEFAULT 'oslobygg'` på sak_metadata; fremmede saker lekker til Oslobygg | Kjørt og observert |
| DB-04 | Middels/Høy | Integritet / RLS | `sak_relations` mangler `prosjekt_id`, mangler fremmednøkler til `sak_metadata`, og har RLS uten policyer | Kjørt og observert |
| DB-05 | Middels | Skjemakonflikt | `ProjectMembership`-modellen tillater `role='viewer'`, mens databasen avviser den med `CHECK`-feil | Kjørt og observert |
| DB-06 | Høy | RLS / Arkitektur | Hendelsestabellene mangler `prosjekt_id`-kolonne; umuliggjør direkte leietaker-isolering i RLS | Kjørt og observert |
| DB-07 | Lav/Middels | Skjemadrift | `BimLink`-modellen har `properties`-felt som ikke finnes i tabellen `sak_bim_links` | Kjørt og observert |
| DB-08 | Middels | RLS / Rettigheter | Versjonsvisninger (`koe_sak_versions` osv.) omgår RLS uten `security_invoker = true` på eldre Postgres | Lest ut av koden |

---

## Detaljerte funn

### DB-01: Migrasjonskjeden feiler på tom database (Kritisk)

- **Fil og linje:** [`backend/migrations/004_projects_table.sql:45-54`](file:///Users/kasper/Projects/endringsmeldinger/backend/migrations/004_projects_table.sql#L45-L54) og [`backend/repositories/supabase_sak_metadata_repository.py:13-27`](file:///Users/kasper/Projects/endringsmeldinger/backend/repositories/supabase_sak_metadata_repository.py#L13-L27)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_database_rls_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_database_rls_audit_20260918.py).
- **Forutsetninger:** Prosjektet settes opp i et nytt miljø, f.eks. CI/CD eller ny Supabase-instans, og migrasjonene kjøres fra start.
- **Svakhet:**
  1. I `backend/migrations/004_projects_table.sql` kjøres følgende SQL:
     ```sql
     UPDATE sak_metadata SET prosjekt_id = 'oslobygg' WHERE prosjekt_id IS NULL;
     ALTER TABLE sak_metadata ALTER COLUMN prosjekt_id SET DEFAULT 'oslobygg';
     ALTER TABLE sak_metadata ALTER COLUMN prosjekt_id SET NOT NULL;
     ```
  2. Tabellen `sak_metadata` er **aldri opprettet** i noen migrasjonsfil. Det finnes verken `001` eller `002` i `backend/migrations/` eller `supabase/migrations/`.
  3. `CREATE TABLE sak_metadata` finnes utelukkende i docstringen øverst i `backend/repositories/supabase_sak_metadata_repository.py`.
  4. Tilsvarende gjelder hendelsestabellene (`koe_events`, `forsering_events`, `endringsordre_events`): de er aldri opprettet av noen migrasjonsfil, noe som også eksplisitt bekreftes i kommentaren i `supabase/migrations/20260918090000_event_tables_actorteam.sql:13-15`:
     > "Event-tabellene opprettes ikke av noen migrasjon — SQL-en ligger i docstringen øverst i backend/repositories/supabase_event_repository.py — så hvert steg er betinget av at tabellen faktisk finnes."
- **Konsekvens for NS 8407:**
  Systemet kan ikke rulles ut deterministisk eller automatisk fra kildekoden. En tom database vil krasje på migrasjon 004 med `ERROR: relation "sak_metadata" does not exist`.

---

### DB-02: 8 manglende rapporteringskolonner i `sak_metadata` (Høy)

- **Fil og linje:** [`backend/repositories/supabase_sak_metadata_repository.py:118-128, 146-156, 212-250`](file:///Users/kasper/Projects/endringsmeldinger/backend/repositories/supabase_sak_metadata_repository.py#L118-L250) og [`backend/scripts/backfill_reporting_cache.py:6-11`](file:///Users/kasper/Projects/endringsmeldinger/backend/scripts/backfill_reporting_cache.py#L6-L11)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_database_rls_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_database_rls_audit_20260918.py).
- **Forutsetninger:** Backend kjører mot en Supabase-database som er opprettet i henhold til repoets migrasjoner eller docstrings.
- **Svakhet:**
  Python-koden i `SupabaseSakMetadataRepository` mapper og oppdaterer følgende 8 kolonner for hurtigrapportering:
  - `cached_sum_krevd`
  - `cached_sum_godkjent`
  - `cached_dager_krevd`
  - `cached_dager_godkjent`
  - `cached_hovedkategori`
  - `cached_underkategori`
  - `cached_forsering_paalopt`
  - `cached_forsering_maks`

  Ingen av disse 8 kolonnene finnes i repoets tabelldefinisjon eller noen av migrasjonsfilene.
- **Konsekvens for NS 8407:**
  Enhver hendelsesinnsending som kaller `metadata_repo.update_cache()` (f.eks. `event_routes.py:543` eller `825`) og vedlikeholdsscriptet `backfill_reporting_cache.py` feiler umiddelbart i PostgreSQL med:
  `ERROR: column "cached_sum_krevd" of relation "sak_metadata" does not exist`.
  Kravsbeløp og godkjente summer blir ikke oppdatert.

---

### DB-03: Hardkodet prosjektfallback i databaseskjemaet (`DEFAULT 'oslobygg'`) (Høy)

- **Fil og linje:** [`backend/migrations/004_projects_table.sql:49-54`](file:///Users/kasper/Projects/endringsmeldinger/backend/migrations/004_projects_table.sql#L49-L54)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_database_rls_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_database_rls_audit_20260918.py).
- **Forutsetninger:** Systemet kjører med flere prosjekter og organisasjoner (multitenancy).
- **Svakhet:**
  I `004_projects_table.sql` settes databasedefault:
  ```sql
  ALTER TABLE sak_metadata ALTER COLUMN prosjekt_id SET DEFAULT 'oslobygg';
  ```
  Dersom en sak opprettes via en rute eller integrasjon der `prosjekt_id` faller bort eller ikke sendes eksplisitt, vil PostgreSQL automatisk sette `prosjekt_id = 'oslobygg'` i stedet for å avvise innsettingen som ugyldig via `NOT NULL`.
- **Konsekvens for NS 8407:**
  Konfidensielle endringskrav fra helt andre oppdragsgivere og entreprenører blir i det stille tilordnet Oslobygg KF. Oslobyggs saksbehandlere vil se fremmede krav i sin saksliste, og motparten i det aktuelle prosjektet mister tilgangen til saken.

---

### DB-04: `sak_relations` mangler `prosjekt_id`, fremmednøkler og har RLS uten policyer (Middels/Høy)

- **Fil og linje:** [`backend/migrations/003_sak_relations.sql:13-46`](file:///Users/kasper/Projects/endringsmeldinger/backend/migrations/003_sak_relations.sql#L13-L46)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_database_rls_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_database_rls_audit_20260918.py).
- **Forutsetninger:** Relasjoner opprettes mellom KOE-saker og forseringer eller endringsordrer.
- **Svakhet:**
  1. `sak_relations` har kolonnene `source_sak_id`, `target_sak_id`, `relation_type`. Tabellen mangler `prosjekt_id`.
  2. Tabellen har ingen `FOREIGN KEY ... REFERENCES sak_metadata(sak_id)`. Ved sletting eller arkivering av saker blir relasjonsradene liggende som udokumenterte foreldreløse data.
  3. `ALTER TABLE sak_relations ENABLE ROW LEVEL SECURITY;` er aktivert, men migrasjonen oppretter ingen tilgangspolicyer. Det er heller ikke mulig å lage en enkel, indeksert RLS-policy for prosjektisolasjon uten å joine mot `sak_metadata`.
- **Konsekvens for NS 8407:**
  Dette forårsaker svakheten avdekket i Pass 2 (AUT-06): Relasjonsoppslag mellom forseringssaker og KOE-saker kan ikke filtreres direkte på prosjekt i databasen, og saker fra andre prosjekter lekker gjennom relasjonsindeksen.

---

### DB-05: Modellen `ProjectMembership` krasjer mot databasens CHECK-skranke (Middels)

- **Fil og linje:** [`backend/models/project_membership.py:20`](file:///Users/kasper/Projects/endringsmeldinger/backend/models/project_membership.py#L20) og [`supabase/migrations/20260912150635_catenda_user_sessions.sql:45`](file:///Users/kasper/Projects/endringsmeldinger/supabase/migrations/20260912150635_catenda_user_sessions.sql#L45)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_database_rls_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_database_rls_audit_20260918.py).
- **Forutsetninger:** En bruker gis lesetilgang (`viewer`) til et prosjekt.
- **Svakhet:**
  - `ProjectMembership`-modellen i Python definerer:
    `role: Literal["admin", "member", "viewer"]`
  - Databasetabellen `app_project_memberships` har derimot:
    `role TEXT NOT NULL CHECK (role IN ('admin', 'member'))`
    og lagrer i stedet seertilgang i en egen boolsk kolonne: `viewer_override BOOLEAN NOT NULL DEFAULT false`.
- **Konsekvens for NS 8407:**
  Forsøk på å opprette eller oppdatere et medlemskap med `role="viewer"` fra domenekoden krasjer i databasen med `violates check constraint "app_project_memberships_role_check"`.

---

### DB-06: Hendelsestabellene mangler `prosjekt_id`-kolonne (Høy)

- **Fil og linje:** [`backend/repositories/supabase_event_repository.py:25-56`](file:///Users/kasper/Projects/endringsmeldinger/backend/repositories/supabase_event_repository.py#L25-L56) og [`supabase/migrations/20260918090000_event_tables_actorteam.sql`](file:///Users/kasper/Projects/endringsmeldinger/supabase/migrations/20260918090000_event_tables_actorteam.sql)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_database_rls_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_database_rls_audit_20260918.py).
- **Forutsetninger:** Hendelseshistorikk lagres i `koe_events`, `forsering_events` eller `endringsordre_events`.
- **Svakhet:**
  Tabellene har kolonner for CloudEvents-attributter (`specversion`, `id`, `source`, `type`, `time`, `subject`, `actor`, `actorrole`, `actorteam`, `data`, `sak_id`, `event_type`, `versjon`), men **ingen** `prosjekt_id`-kolonne.
  Prosjekt-ID-en ligger kun begravd i tekststrengen `source` (`/projects/{prosjekt_id}/cases/{sak_id}`).
- **Konsekvens for NS 8407:**
  Databasebasert radnivåsikkerhet (RLS) kan ikke skille hendelser fra ulike prosjekter uten enten å foreta dyr strengparsing på `source` eller en JOIN mot `sak_metadata` for hver eneste event-rad. Det svekker muligheten for leietaker-isolering på databasenivå.

---

### DB-07: `BimLink`-modellen har `properties`-felt som mangler i databasen (Lav/Middels)

- **Fil og linje:** [`backend/models/bim_link.py:24`](file:///Users/kasper/Projects/endringsmeldinger/backend/models/bim_link.py#L24) og [`backend/migrations/006_bim_tables.sql:21-38`](file:///Users/kasper/Projects/endringsmeldinger/backend/migrations/006_bim_tables.sql#L21-L38)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_database_rls_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_database_rls_audit_20260918.py).
- **Forutsetninger:** BIM-objekter med IFC propertysett, mengder eller materialer kobles til en KOE-sak.
- **Svakhet:**
  Modellen `BimLink` deklarerer `properties: dict[str, Any] | None = None`. Databasetabellen `sak_bim_links` har ingen `properties`-kolonne (hverken `JSONB` eller `TEXT`).
- **Konsekvens for NS 8407:**
  Dersom BIM-koblinger berikes med IFC property data (f.eks. areal- eller materialdokumentasjon for et endringskrav), forkastes dataene ved lesing fra databasen, eller innsetting feiler dersom repositoryet inkluderer feltet i insert-spørringen.

---

### DB-08: Versjonsvisninger omgår RLS på eldre PostgreSQL-versjoner (Middels)

- **Fil og linje:** [`backend/repositories/supabase_event_repository.py:148-160`](file:///Users/kasper/Projects/endringsmeldinger/backend/repositories/supabase_event_repository.py#L148-L160) og [`supabase/migrations/20260918131137_lock_down_data_api.sql:57-79`](file:///Users/kasper/Projects/endringsmeldinger/supabase/migrations/20260918131137_lock_down_data_api.sql#L57-L79)
- **Status:** Lest ut av koden; bekrefter og utvider RV-15.
- **Forutsetninger:** Databasen kjører på en PostgreSQL-versjon eldre enn 15, eller viewene gjenopprettes fra repository-docstringen.
- **Svakhet:**
  I `supabase_event_repository.py` opprettes `koe_sak_versions`, `forsering_sak_versions` og `endringsordre_sak_versions` med standard `CREATE VIEW`.
  I PostgreSQL kjører vanlige views under eierens rettigheter (SECURITY DEFINER-semantikk), noe som omgår RLS på de underliggende hendelsestabellene for enhver rolle som har SELECT-tilgang.
  Migrasjonen `20260918131137_lock_down_data_api.sql` setter `security_invoker = true` kun dersom serverversjonen er 15 eller nyere, og viewene finnes ikke engang i migrasjonshistorikken.
- **Konsekvens for NS 8407:**
  Rettigheter og RLS-begrensninger på hendelsestabellene kan omgås ved å spørre mot versjonsvisningene dersom SELECT-rettigheter gis.

---

## Samlet vurdering av database og migrasjoner

Databaselaget har store mangler med hensyn til reproducerbarhet og skjemaintegritet:
1. **Mangler kilde til sannhet i migrasjoner:** Kjerne-tabellene (`sak_metadata`, `koe_events`, `forsering_events`, `endringsordre_events`, `project_memberships`) finnes ikke som migrasjonsfiler i repoet, men kun i Python-docstrings og markdown-filer. En ren `supabase db push` eller migrasjon fra bunnen av feiler umiddelbart.
2. **Skjemadrift:** Koden har utviklet seg (f.eks. 8 hurtigrapporteringskolonner på `sak_metadata` og `properties` på BIM-lenker) uten tilhørende migrasjoner.
3. **Multitenant-sårbarheter i skjema:** Hardkodet `DEFAULT 'oslobygg'` på `prosjekt_id` og mangel på `prosjekt_id`-kolonne i hendelses- og relasjonstabellene undergraver isolasjonen mellom oppdragsgivere.
