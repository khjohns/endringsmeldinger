# Databasearkitektur: trenger vi alle tabellene?

Gjennomført 20. september 2026 mot `6fd2b8a` på grenen
`claude/database-architecture-review-v61w41`. Gjenstand: hele `public`-skjemaet i
prosjekt `gwdxadexwktegkklyobv`, og de migrasjonsfilene repoet har for det.
Arbeidspakken står i
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#nye-arbeidspakker-og-produksjonskrav);
forrige ledd i kjeden er
[audit: database og RLS](audit-rls-database-2026-09-18.md),
[arkitekturvurderingen](arkitekturvurdering-2026-09-19.md) og
[sammenstillingen](sammenstilling-arkitektur-og-auditspor-2026-09-19.md).

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

Pakken stilte to spørsmål som ikke er det samme. Det første er arkeologi: hva er
i bruk, hva er etterlatenskap, og hva finnes i basen uten å finnes i repoet. Det
andre er utforming: blant dem som *er* i bruk, kunne de vært færre? Dokumentet
holder dem fra hverandre, fordi de krever ulike bevis. **Det første kan
konkludere med å fjerne noe. Det andre kan ikke — det leverer forslag.**

> **Hva denne runden endret.** Den er ikke bare en gjennomgang. Tre ting er
> gjort, innenfor det som var uttrykkelig bedt om: migrasjonen som manglet
> `actorteam` er **anvendt**, og DDL som fantes i basen uten å finnes i repoet er
> skrevet som migrasjonsfiler. Ingen tabell er slått sammen og ingen kolonne
> fjernet; alt slikt står som forslag i DA-12 til DA-14.

> **Merknad 2026-09-20 (kveld): DA-12 til DA-15 er avgjort.** De sto som
> forslag og åpne spørsmål her, fordi en gjennomgang ikke kan avgjøre
> designvalg alene. [Målskjemaet](design-maalskjema-database-2026-09-20.md)
> lukker dem på premisser besluttet av utvikler: hendelsestabellene slås sammen
> (MS-01), `sak_relations` fjernes (MS-08), `cached_*` blir en projeksjon med
> én skriver (MS-06, MS-07), og BIM-flaten er besluttet relevant — koblingen
> blir hendelser framfor slettbare rader (MS-13). DA-15s «mangler en
> produkteier» gjelder altså ikke lenger.
>
> Notatet fant også noe denne gjennomgangen ikke så: **vedlegg har ingen hash**,
> og det betyr noe nå som det er besluttet at bytene bare skal ligge i Catenda.

---

## De sju foreløpige punktene: hva som holdt

Masterplanens punkter var et biprodukt av en annen runde og skulle etterprøves,
ikke overtas. Utfallet:

| Foreløpig punkt | Utfall |
| --- | --- |
| 1 — repoet kan ikke opprette databasen | **Holder**, men var ufullstendig formulert. Historikken har ti rader, ikke seks. Se DA-01 |
| 2 — `actorteam`-migrasjonen aldri anvendt | **Holder** på årsaken. **Rekkevidden var feil:** det er skrivingene som feiler, ikke «enhver lesing av enhver sak». Se DA-02 |
| 3 — ingen mekanisme håndhever at migrasjon når basen | **Holder.** Se DA-03, og DA-04 for et nytt tilfelle |
| 4 — testdobbelen kan ikke fange klassen | **Holder.** Se DA-06 |
| 5 — tre tabeller uten referanser *(merket uverifisert)* | **Delvis feil.** `app_identities` er i tung bruk. `user_groups` og `magic_links` holder. Se DA-07, DA-08, DA-09 |
| 6 — spørsmål gjennomgangen bør stille | **Besvart.** To medlemskapstabeller: ja, DA-10. `catenda_models_cache`: DA-15. `sak_relations`-fremmednøkler: DA-11 og DA-13 |
| 7 — tre kandidater *(merket uverifisert)* | **Premissene holder, konklusjonene er åpne.** Se DA-12 til DA-14 |

Punkt 5 er det viktigste utfallet. Det var merket «lest ut av koden, ikke kjørt»,
og det var riktig merket: en av de tre var feil, og den feilen var av nøyaktig
den formen `AGENTS.md` advarer mot — *ikke utled kjøretidsatferd fra ett lag.*

---

## Navngitt oversikt over `public`

Ingen av tabellene var ramset opp ved navn noe sted i `docs/` før nå. Uten den
lista er enhver konklusjon om «alle tabellene» udokumentert. Radtall er eksakte
`count(*)` 20. september; opprettende migrasjon er den som oppretter tabellen
**etter** denne runden.

| Tabell | Rader | Opprettes av | Lesere og skrivere i koden | Dom |
| --- | --- | --- | --- | --- |
| `koe_events` | 0 | `20260911073512` *(ny)* | `SupabaseEventRepository` | **I bruk.** Kandidat DA-12 |
| `forsering_events` | 0 | `20260911073512` *(ny)* | `SupabaseEventRepository` | **I bruk.** Kandidat DA-12 |
| `endringsordre_events` | 0 | `20260911073512` *(ny)* | `SupabaseEventRepository` | **I bruk.** Kandidat DA-12 |
| `sak_metadata` | 0 | `20260911073512` *(ny)* | `SupabaseSakMetadataRepository` | **I bruk.** Kolonnene: DA-14 |
| `sak_relations` | 0 | `backend/003` | `RelationRepository` | **I bruk.** Kandidat DA-13 |
| `projects` | 1 | `backend/004` | `ProjectRepository` | **I bruk** |
| `project_memberships` | 1 | `20260911080500` *(ny)* | `SupabaseMembershipRepository`, trigger | **Skrives, leses aldri.** DA-10 |
| `app_users` | 14 | `20260912150635` | `AuthRepository`, RPC | **I bruk** |
| `app_identities` | 14 | `20260912150635` | **Bare `koe_resolve_identity`** | **I bruk.** DA-07 |
| `app_sessions` | 1 | `20260912150635` | `AuthRepository` | **I bruk** |
| `app_oauth_attempts` | 0 | `20260912150635` | `AuthRepository` | **I bruk** (kortlevd) |
| `app_project_memberships` | 14 | `20260912150635` | `AuthRepository`, `membership_routes` | **I bruk** |
| `app_membership_sync` | 1 | `20260912150635` | `AuthRepository` | **I bruk** |
| `catenda_project_configs` | 1 | `20260902` | `CatendaProjectConfigRepository` | **I bruk** |
| `catenda_topic_board_configs` | 1 | `20260902` | `CatendaProjectConfigRepository` | **I bruk** |
| `catenda_contract_teams` | 2 | `20260916130000` | `AuthRepository` | **I bruk** |
| `catenda_models_cache` | 0 | `backend/006` | `BimLinkRepository` | **I bruk.** DA-15 |
| `sak_bim_links` | 0 | `backend/006` | `BimLinkRepository` | **I bruk.** DA-15 |
| `magic_links` | 0 | `20260911073512` *(ny)* | **Ingen** | **Etterlatenskap.** DA-09 |
| `user_groups` | 0 | `20260911073512` *(ny)* | **Ingen** (to ukalte RPC-er) | **Etterlatenskap.** DA-08 |

Tjue tabeller. Atten er i bruk, to er etterlatenskaper. **Ingen tabell er uten
dom** — det var akseptkriteriet.

---

## Funn

| ID | Alvorlighet | Kort |
| --- | --- | --- |
| DA-01 | Kritisk → **lukket** | Repoet kunne ikke opprette databasen: sju tabeller fantes ikke i noen migrasjonsfil |
| DA-02 | Kritisk → **lukket** | `actorteam`-migrasjonen var aldri anvendt. Alle skrivinger til Supabase-lageret feilet |
| DA-03 | Høy | Ingen mekanisme håndhever at en migrasjonsfil når basen |
| DA-04 | Middels | Tenant-migrasjonen har ulikt versjonsnummer i repoet og i basen |
| DA-05 | Middels → **lukket** | `backend/migrations/` hadde drevet fra basen på fire punkter |
| DA-06 | Middels | Skjemaet finnes i fire kilder som ikke er enige. To av dem er ikke SQL |
| DA-07 | Korreksjon | `app_identities` er i tung bruk, ikke ubrukt. Ingen referanse i koden ved navn |
| DA-08 | Lav | `user_groups` er etterlatenskap etter den forrige identitetsmodellen |
| DA-09 | Lav | `magic_links` er etterlatenskap; tokens ligger i en fil |
| DA-10 | Middels | To medlemskapstabeller. Den gamle skrives av en trigger og leses aldri |
| DA-11 | Høy *(kjent)* | Ingen RLS-policy uttrykker en prosjektgrense. Én uvirksom `authenticated`-policy står igjen |
| DA-12 | Forslag | Tre hendelsestabeller med identisk form |
| DA-13 | Forslag | `sak_relations` er en projeksjon av noe hendelsene alt bærer |
| DA-14 | Forslag | Ti `cached_*`-kolonner er skrivetidsavledninger av en append-only kilde |
| DA-15 | Åpent spørsmål | `catenda_models_cache` og `sak_bim_links` bærer en flate ingen har vurdert |

---

### DA-01 — Repoet kunne ikke opprette databasen *(kritisk, lukket denne runden)*

**Kjørt og observert.** Basens migrasjonshistorikk har ti rader. Seks av dem —
`001_koe_core_tables` til `006_koe_rls_performance`, versjon `20260911073512` til
`20260911080204` — fantes ikke i repoet i noen form. De fire andre gjør det.

Det foreløpige punktet sa «historikken lister 001 til 006». Det var sant da det
ble skrevet, men er ufullstendig nå: `lock_down_data_api`,
`lock_down_data_api_public_execute`, `fix_trigger_search_path` og
`tenant_attribution_prosjekt_id` ligger også der, og alle fire har fil. Skillet
betyr noe, fordi det er de seks *tidligste* som mangler — og det er de som
oppretter kjernen.

Følgen: sju tabeller fantes bare i basen. `koe_events`, `forsering_events`,
`endringsordre_events`, `sak_metadata`, `magic_links`, `user_groups` og
`project_memberships`.

**Kjørt og observert.** Å kjøre hele migrasjonssettet mot en tom PostgreSQL 16
stoppet på `backend/migrations/004_projects_table.sql`:

```
ERROR:  relation "sak_metadata" does not exist
```

Det bekrefter DB-01 fra databasesiden, ved kjøring og ikke ved lesing.

**Rettet.** To filer er skrevet, rekonstruert fra katalogen:

- `supabase/migrations/20260911073512_koe_kjerneskjema_rekonstruert.sql` —
  `sak_metadata`, de tre hendelsestabellene, `magic_links`, `user_groups`, med
  indekser, skranker, triggerfunksjoner og policyer.
- `supabase/migrations/20260911080500_project_memberships_rekonstruert.sql` —
  `project_memberships` med trigger og policyer.

**Hvorfor to filer og ikke én.** Første forsøk la `project_memberships` i
kjernefila. Det ga en sirkulær avhengighet, som kjøringen avdekket:
`backend/004` gjør `UPDATE sak_metadata`, så den må komme *etter* kjernen — men
`project_memberships` har fremmednøkkel til `projects`, som `backend/004`
oppretter, så den må komme *før*. Delingen bryter sirkelen. Rekkefølgen er
dermed en skranke, ikke en detalj, og den er festet i
`tests/test_security/test_database_arkitektur_20260920.py`.

Filene er **rekonstruksjon, ikke originaltekst.** Teksten til de seks er ikke
gjenopprettbar, og fordelingen mellom dem er bevisst ikke gjenskapt. Det står i
filhodene.

### DA-02 — `actorteam`-migrasjonen var aldri anvendt *(kritisk, lukket denne runden)*

`supabase/migrations/20260918090000_event_tables_actorteam.sql` lå i repoet,
idempotent og forsiktig skrevet, og kolonnen fantes ikke på noen av de tre
hendelsestabellene.

**Kjørt og observert, før:**

```sql
select actorteam from public.koe_events limit 1;
-- ERROR: 42703: column "actorteam" does not exist
select * from public.koe_events limit 1;
-- OK
```

**Her må det foreløpige punktet korrigeres.** Det sa at «**enhver lesing av
enhver sak** gjennom Supabase-lageret» feilet. Det stemmer ikke, og forskjellen
er verdt å få riktig, fordi den peker på et annet og verre sted:

- `_get_events_from_table` og `get_events_by_type` i
  `repositories/supabase_event_repository.py` bruker `.select("*")`. De feiler
  **ikke**. Radene kommer tilbake uten nøkkelen, og `row.get("actorteam")` gir
  `None` — fail-closed, som tilsiktet.
- `get_events_cloudevents` navngir kolonnen i `.select(...)`. Den feiler — men
  kallet står i `try: ... except Exception: continue`, så den returnerer `[]`
  **stille**, for hver av de tre tabellene. Ingen feilmelding noe sted.
- **Skrivestien er den som brøt.** `append_event` bygger en `row`-dict med
  nøkkelen `"actorteam"`. En `INSERT` som navngir en kolonne som ikke finnes,
  avvises. Altså: **ingen hendelse kunne skrives** til Supabase-lageret.

Konsekvensen er alvorligere enn den opprinnelige formuleringen, ikke mildere:
lesing gikk tilsynelatende bra, og skriving var umulig. Det er den kombinasjonen
som er vanskeligst å oppdage.

**Anvendt.** Migrasjonen er kjørt mot `gwdxadexwktegkklyobv`, registrert som
`20260920152042 event_tables_actorteam`. **Kjørt og observert, etter:** kolonnen
finnes som `text`, nullable, på alle tre, og `select actorteam from koe_events`
svarer. Basen er tom, så ingen rad kan være feilmerket.

Dette bekrefter masterplanens merknad: **RV-08 sto som lukket, og koden *var*
riktig — databasen fikk aldri kolonnen.** Nå har den det.

### DA-03 — Ingen mekanisme håndhever at en migrasjonsfil når basen *(høy)*

Det finnes ingen `supabase/config.toml`, bare en `migrations`-mappe, og to
parallelle migrasjonssett: `supabase/migrations/` og `backend/migrations/`. Det
siste har en `README.md` som sier «legacy — already applied. Do not add new
migrations here», men filene der er fortsatt nødvendige for å bygge basen: de
oppretter `projects`, `sak_relations`, `catenda_models_cache` og
`sak_bim_links`.

Regelen om at DDL og migrasjonsfil skrives i samme runde står i `AGENTS.md`. Den
er husskikk, og DA-02 er beviset på at husskikk ikke er nok: fila var skrevet
korrekt og ble aldri kjørt. Ingenting fanget det på to dager.

**Forslag, ikke gjennomført:** `supabase/config.toml` pluss `supabase db push`,
eventuelt som et steg i CI mot staging. Da kan «anvendt» avledes framfor å
huskes. Se «Veien fra fil til database» nedenfor for hva som konkret gjenstår.

### DA-04 — Versjonsavvik på tenant-migrasjonen *(middels)*

**Kjørt og observert.** Basen har migrasjonen som versjon `20260920053427`. Fila
i repoet heter `20260920060000_tenant_attribution_prosjekt_id.sql`. Samme
migrasjon, to ulike versjonsnumre.

For et verktøy som avleder «anvendt» fra versjonsnummeret, er dette ikke samme
migrasjon. `supabase db push` ville forsøkt å anvende repoets versjon på nytt.
Innholdet er idempotent, så skaden ville vært liten *denne* gangen — men
mekanismen DA-03 foreslår, hviler nettopp på at versjonsnumre er identiske.

Dette er et nytt tilfelle av samme klasse som DA-02, funnet fordi
historikklista ble lest ved siden av filnavnene. Det er ikke rettet her:
å endre historikkrader er noe annet enn å skrive migrasjonsfiler.

### DA-05 — `backend/migrations/` hadde drevet fra basen *(middels, lukket denne runden)*

**Kjørt og observert.** Hele migrasjonssettet ble bygget mot en tom PostgreSQL 16
og katalogen sammenliknet med den levende basen. Fire avvik, alle i den
«legacy»-merkede mappa:

1. **`sak_bim_links.properties` manglet.** Kolonnen finnes i basen og i
   `models/bim_link.py`, men ikke i `backend/migrations/006_bim_tables.sql`.
   Dette er DB-07, sett fra byggesiden.
2. **`SERIAL` mot `GENERATED ALWAYS AS IDENTITY`.** Repoet skriver `SERIAL` for
   `sak_relations.id`, `sak_bim_links.id` og `catenda_models_cache.id`; basen har
   identity. Ikke kosmetisk: `GENERATED ALWAYS` avviser en klientoppgitt `id`,
   `SERIAL` tar imot den.
3. **Tre policyer i feil form.** `projects`, `sak_bim_links` og
   `catenda_models_cache` står i repoet som
   `USING (auth.role() = 'service_role')` uten `TO`-ledd — de gjelder altså
   `PUBLIC` med et predikat. Basen har den hardnede formen: `TO service_role`
   med `USING (true)`.
4. **`sak_relations` fikk RLS uten policy.** `backend/003` kjører
   `ENABLE ROW LEVEL SECURITY` og oppretter ingen policy. Basen har en. En base
   bygget fra repoet ville fått en tabell med RLS på og ingen policy — fail-closed
   for enhver rolle uten `BYPASSRLS`, og umerkelig i dag fordi `service_role` har
   det.

**Rettet** i `supabase/migrations/20260920160000_avstem_backend_migrations.sql`,
som en egen avstemmingsmigrasjon framfor redigering av de «legacy»-merkede
filene. Mot den levende basen er hver setning et nullsteg; verdien ligger i at
en base bygget fra repoet blir lik den som kjører.

**Merk at xfail-reproduksjonene for DB-04 og DB-07 fortsatt er `xfail`, og det
er riktig.** De leser `backend/migrations/003` og `006` spesifikt, og de filene
er uendret. Påstanden deres — at *de filene* er ufullstendige — er fortsatt sann.

### DA-06 — Skjemaet finnes i fire kilder som ikke er enige *(middels)*

Før denne runden fantes definisjonen av hendelsestabellene fire steder:

| Kilde | Form |
| --- | --- |
| Basen | Den som gjelder |
| `backend/repositories/supabase_event_repository.py`, docstring | SQL i en Python-docstring |
| `backend/tests/test_event_roundtrip.py`, `EVENT_TABLE_COLUMNS` | Python-liste |
| Migrasjonsmappa | **Fantes ikke** (DA-01) |

**Lest ut av koden.** Docstringen er ikke bare en kopi, den er en *gal* kopi.
Den oppgir `id SERIAL PRIMARY KEY` der basen har identity; den erklærer
indeksene `idx_koe_events_type` og `idx_koe_events_subject`, som ikke finnes i
basen; og den utelater fremmednøkkelen `fk_koe_events_sak` mot `sak_metadata`,
som finnes. Den oppgir derimot `actorteam` — kolonnen som ikke fantes. En leser
som tror docstringen, får tre gale svar og ett som var sant om koden, men ikke
om basen.

Dette er det foreløpige punkt 4 pekte på fra testsiden: `EVENT_TABLE_COLUMNS`
speiler repoet, og repoet speilet ikke basen. Etter DA-01 og DA-02 er
migrasjonsmappa nå den fjerde kilden, og den er verifisert lik basen — se
«Verifikasjon» under. Docstringen er det ikke, og bør enten rettes eller vise
til migrasjonsfila. **Ikke gjort her:** det er produksjonskode, og ingen ba om
det.

### DA-07 — `app_identities` er i tung bruk *(korreksjon av foreløpig punkt 5)*

Det foreløpige punktet oppga `app_identities` blant tre tabeller med «null
referanser i produksjonskode». Det er riktig at et navnesøk gir null treff —
strengen `app_identities` finnes ikke i noen fil i repoet utenom migrasjonen som
oppretter den.

**Tabellen er likevel sentral.** Den leses og skrives av databasefunksjonen
`koe_resolve_identity`, som kalles fra `AuthRepository.identity()` ved **hver
innlogging**:

```sql
SELECT user_id INTO v_user FROM public.app_identities
    WHERE provider = p_provider AND issuer = p_issuer AND subject = p_subject;
IF v_user IS NULL THEN
    INSERT INTO public.app_users(email, name) ...
    INSERT INTO public.app_identities(user_id, provider, issuer, subject) ...
```

Den har 14 rader — like mange som `app_users` — en `UNIQUE (provider, issuer,
subject)` og en `CHECK (provider IN ('catenda','entra'))`. Det er tabellen som
gjør innlogging idempotent: uten den ville hver innlogging opprettet en ny
bruker.

Dette er akkurat fella metodeseksjonen navnga — *«et navnesøk er ikke nok»* — og
punktet var riktig merket «lest ut av koden, ikke kjørt». Den generelle lærdommen
er at **logikk i databasen er usynlig for et søk i repoet.** Ti funksjoner ligger
i `public`; de er en del av applikasjonen og står ingen steder i kodesøket.

### DA-08 — `user_groups` er etterlatenskap *(lav)*

Null rader. Elleve kolonner, seks indekser, en trigger, og to
`SECURITY DEFINER`-funksjoner som leser den: `get_user_role` og
`get_user_role_by_email`.

**Ingen av de to kalles.** De eneste treffene på `get_user_role` i repoet er
`get_user_role_in_project` i `integrations/catenda/auth.py` — et annet navn, og
et HTTP-kall til Catenda, ikke en RPC.

Det avgjørende er fremmednøkkelen: `user_groups.user_id` peker på
**`auth.users`** — Supabase Auth. Appen bruker sin egen `app_users`, og
masterplanen har allerede bestemt at anonym innlogging og OAuth-serveren skal
slås av i Supabase-konsollet. `user_groups` hører til identitetsmodellen som ble
forlatt. `approval_role`-kolonnen med `('PL','SL','AL','DU','AD')` er dessuten et
tidligere forsøk på godkjenningskjeden, som i dag ligger i
`BH_APPROVAL_POLICIES`.

**Forslag:** fjernes, sammen med de to funksjonene. Null rader, null lesere,
og en fremmednøkkel til et skjema som skal stenges. Ikke gjennomført — sletting
av tabeller var ikke i mandatet.

### DA-09 — `magic_links` er etterlatenskap *(lav)*

Null rader, ti kolonner, fremmednøkkel til `sak_metadata`. Ingen kode rører den:
det finnes ingen `.table("magic_links")` noe sted.

`MagicLinkManager` i `lib/auth/magic_link.py` lagrer i stedet tokens i
`koe_data/magic_links.json`, med en `RLock` rundt fil-I/O. Det er verdt å merke
seg at **filen er det dårligere valget** — den er ett av SQLite- og
fil-lagrene arkitekturvurderingen vil flytte i fase 1, og på en autoskalert
container uten varig disk overlever den ikke en omstart. Tabellen som allerede
finnes, ville løst det.

**To veier, og valget hører til fase 1:** enten tas tabellen i bruk og fila
fjernes, eller tabellen fjernes og magic links regnes som efemere. Det som ikke
bør bestå, er at begge finnes og bare den svakeste brukes.

### DA-10 — To medlemskapstabeller; den gamle leses aldri *(middels)*

Det foreløpige punkt 6 spurte om begge er i bruk. Svaret er nei — ikke slik man
skulle tro.

| | `project_memberships` | `app_project_memberships` |
| --- | --- | --- |
| Nøkkel | `user_email` (tekst) | `user_id` → `app_users` |
| Roller | `admin`, `member`, `viewer` | `admin`, `member` |
| Rader | 1 | 14 |
| Skrives av | Trigger på `projects`, og `project_routes` | `AuthRepository`, `koe_reconcile_memberships` |
| **Leses av** | **Ingenting** | `membership_routes`, `AuthRepository` |

`SupabaseMembershipRepository` har fullt lesegrensesnitt, men det eneste kallet i
hele backend er `_get_membership_repo().add(...)` i
`routes/project_routes.py`. Ingen rute leser tabellen.

**Og skrivestien er i praksis død.** Triggeren
`trg_auto_membership_on_project_create` setter allerede inn skaperen som `admin`
ved `AFTER INSERT ON projects`, med `ON CONFLICT DO NOTHING`. Koden gjør så det
samme rett etterpå — og treffer `UNIQUE (project_id, user_email)`. Kallet står i
`try/except` som logger `"Failed to add creator as admin member"` på
`warning`-nivå. Altså: **triggeren gjør jobben, koden feiler hver gang, og
loggen sier at noe gikk galt selv om resultatet er riktig.**

Merk at `viewer`-rollen bare finnes i den gamle tabellen. DB-05 er funnet om at
`ProjectMembership`-modellen med `role='viewer'` bryter `CHECK`-skranken på den
*nye* tabellen; her er den andre halvdelen av samme forvirring.

**Forslag:** `project_memberships`, triggeren, funksjonen
`auto_create_project_membership` og det døde kallet i `project_routes` fjernes
samlet. Men `viewer`-begrepet må først avklares mot DB-05 og
`viewer_override`-kolonnen på den nye tabellen — det er en domenebeslutning, ikke
en oppryddingsbeslutning.

### DA-11 — Ingen RLS-policy uttrykker en prosjektgrense *(høy, kjent)*

**Kjørt og observert.** Alle tjue tabellene har RLS på, og det finnes tjueén
policyer. Tjue av dem er samme form — én per tabell: `service_role`, `ALL`,
`USING (true) WITH CHECK (true)`.

Det bekrefter det masterplanen alt sier: kolonnen `prosjekt_id` gjør at en
prosjektpolicy *lar seg* skrive, men ingen er skrevet. Grensen håndheves i
applikasjonen. Dette er AR-01, og hører til pakke 1, ikke til denne.

**Én ting er nytt.** Den tjueførste policyen er
`project_memberships → "Users can read own memberships"`, for rollen
`authenticated`, med `USING (user_email = (SELECT auth.email()))`.

Den er **uvirksom**, og det er kontrollert på laget som avgjør:

```
information_schema.role_table_grants
  → anon og authenticated har null rettigheter på samtlige tabeller i public
pg_proc.proacl
  → ingen EXECUTE for anon eller authenticated på noen funksjon i public
```

`20260918131137_lock_down_data_api.sql` tok fra begge roller alt. En policy uten
et `GRANT` i bunnen er ingenting — rollen når ikke tabellen. Dette er altså
**ikke et sikkerhetsfunn**, og det skal stå tydelig, for formen på policyen
inviterer til motsatt konklusjon. Den er en etterlatenskap etter den forrige
identitetsmodellen, av samme slekt som DA-08, og bør fjernes sammen med tabellen.

### DA-12 — Tre hendelsestabeller med identisk form *(forslag)*

**Kjørt og observert.** `koe_events`, `forsering_events` og
`endringsordre_events` er ikke bare like, de er identiske: nitten kolonner med
samme navn, type, nullbarhet og default, samme `CHECK (actorrole IN ('TE','BH'))`,
samme fremmednøkkel til `sak_metadata`, samme `UNIQUE (event_id)`, samme
`UNIQUE (sak_id, versjon)`. Kolonne-sjekksummene er bit for bit like.

Eneste forskjell: `koe_events` har i tillegg `idx_koe_events_time`. De to andre
har den ikke — noe som i seg selv er en utilsiktet asymmetri.

Argumentet for én tabell med en sakstypekolonne står ved lag, og er blitt
**sterkere** av denne runden. Alt som må gjøres mot hendelsene, må i dag gjøres
tre ganger: én RLS-policy per tabell å skrive når prosjektgrensen skal ned i
basen (DA-11), ett sted per tabell å tilbakekalle `UPDATE`/`DELETE`, én
append-only-trigger per tabell. Denne runden måtte selv skrive `actorteam` i en
løkke over tre navn, og `20260918131137` lister dem tre ganger.

Mot det står to ting, og de er reelle:

- **`UNIQUE (sak_id, versjon)` over én tabell er en annen samtidighetsprofil.**
  I dag er versjonskonflikter avgrenset per sakstype. Sammenslått konkurrerer
  alle saker om samme indeks. Siden `sak_id` er med i nøkkelen, er ikke det
  åpenbart verre — men det er ikke vist, og transaksjonsplanen bygger på dagens
  form.
- **[Transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md)
  forutsetter tre tabeller.**

**Derfor: avgjøres sammen med transaksjonsplanen, ikke etterpå og ikke her.**
Basen er tom, så en sammenslåing koster i dag ingen datamigrasjon. Det argumentet
har en utløpsdato.

### DA-13 — `sak_relations` som projeksjon *(forslag)*

`sak_relations` er en CQRS-projeksjon: relasjonene ligger også i hendelsene. Den
finnes for oppslagshastighet på en base som i dag har null rader i begge.

**Lest ut av koden, og det avgjørende er at alternativet allerede finnes.**
`ForseringService.finn_forseringer_for_koe` har to veier:

```python
if self.relation_repository:
    return self._finn_forseringer_via_index(sak_id, tillatte_saker=...)
return self._finn_forseringer_via_scan(sak_id, tillatte_saker=...)
```

Skannestien utleder samme svar fra hendelsene. Den er skrevet for JSON-lageret,
men den beviser at projeksjonen ikke bærer informasjon hendelsene mangler.

Kostnaden er konsistens. Projeksjonen må vedlikeholdes i takt, og den har alt
drevet: DB-04 fant at den manglet fremmednøkler, og **det er fortsatt sant.**
Kontrollert denne runden: `sak_relations` har null fremmednøkler, mens hver
eneste andre tabell med en `sak_id` har
`REFERENCES sak_metadata(sak_id) ON DELETE CASCADE`. Den er den eneste
avvikeren, hvilket taler mot at utelatelsen var bevisst. Slettes en sak, blir
relasjonsradene foreldreløse.

Det finnes dessuten et skript, `scripts/backfill_relations.py`, med
`clear_all_relations()` og gjenoppbygging fra hendelsene. At det finnes, er selv
et argument: projeksjonen har trengt reparasjon før.

**To forslag, i rekkefølge.** Kortsiktig: legg på fremmednøklene — det er
DB-04, og det gjelder uansett hva som skjer med tabellen. Langsiktig: mål om et
indeksert oppslag i hendelsene holder, før projeksjonen beholdes. Med en tom base
er spørsmålet billig å avgjøre nå og dyrt senere.

### DA-14 — De ti `cached_*`-kolonnene *(forslag)*

**Kjørt og observert.** Nøyaktig ti kolonner på `sak_metadata` heter `cached_*`:
`cached_title`, `cached_status`, `cached_sum_krevd`, `cached_sum_godkjent`,
`cached_dager_krevd`, `cached_dager_godkjent`, `cached_hovedkategori`,
`cached_underkategori`, `cached_forsering_paalopt`, `cached_forsering_maks`.
`last_event_at` er en ellevte av samme slag uten navnet.

De er **i bruk**, og det er kontrollert i hele kjeden: skrives fra
`routes/event_routes.py` ved hver hendelse, leses tilbake i sakslisten, og
brukes i frontend av `CaseListRow.svelte` (`cached_title`,
`cached_hovedkategori`). DB-02 handlet om at åtte av dem manglet i migrasjonene;
etter DA-01 er alle ti erklært.

Spørsmålet ingen har stilt, er om de bør finnes. Hver av dem er en avledning av
en append-only kilde, regnet ut ved skriving og lagret ved siden av kilden. Det
er per konstruksjon mulig at de kommer ut av takt — og
`scripts/backfill_reporting_cache.py` finnes nettopp for å regne dem om igjen.
Et skript som eksisterer for å reparere en cache, er et argument om at cachen
kan bli feil.

Her er innsatsen høyere enn for DA-13, fordi disse kolonnene er **det
sakslisten viser**. Blir `cached_status` feil, viser oversikten feil status på en
sak der en preklusjonsfrist kan stå på spill.

**Forslag, ikke konklusjon:** vurder en `VIEW` eller en materialisert projeksjon
som utledes fra hendelsene, framfor ti kolonner oppdatert fra rutelaget på hver
skriving. Dette henger sammen med DA-12 — er hendelsene i én tabell, er en slik
avledning vesentlig enklere å skrive. Og det henger sammen med
domenegjennomgangen: `cached_status` er `overordnet_status`-rollupen, og det er
den TFR-01 viste at man kan ta feil av.

### DA-15 — BIM-flaten er ikke vurdert av noen *(åpent spørsmål)*

`catenda_models_cache` (7 kolonner) og `sak_bim_links` (13 kolonner) er begge i
bruk via `BimLinkRepository` og `routes/bim_link_routes.py`, og begge har null
rader.

Det foreløpige punkt 6 spurte «hva er `catenda_models_cache`?». Svaret: en cache
over Catenda-modeller per prosjekt, fylt av `upsert_cached_models` og lest av
tre ruter. Den er altså i bruk etter bokstaven.

Men **ingen audit i kjeden har vurdert BIM-flaten**, og den bærer
`sak_bim_links.properties` — en `jsonb` for IFC property sets — som er nøyaktig
den kolonnen som manglet i migrasjonen (DA-05). Ti av tretten kolonner på
`sak_bim_links` er nullable. Det er en flate med null bruk i dag og en egen
rutegruppe.

**Spørsmålet, ikke besvart her:** er BIM-koblingen en besluttet del av
leveransen, eller et påbegynt spor? Svaret avgjør om to tabeller og en
rutegruppe skal vedlikeholdes gjennom fundamentbyttet. Det er et
produkt­spørsmål, ikke et databasespørsmål, og det har ingen eier i planen.

---

## Veien fra fil til database

Akseptkriteriet krever at «repoets migrasjonsmappe og basens faktiske skjema
stemmer, og det finnes en dokumentert vei fra fil til database».

**Første halvdel er oppnådd og målt.** Hele settet ble bygget mot en tom
PostgreSQL 16 og sammenliknet med `gwdxadexwktegkklyobv`:

| Katalogsnitt | Bygget fra repoet | Levende base |
| --- | --- | --- |
| Tabeller i `public` | 20 | 20 |
| Kolonner (md5) | `b23b841f…57a8` | `b23b841f…57a8` |
| Skranker (md5) | `97544d16…7760` | `97544d16…7760` |
| Indekser (md5) | `e9f4c2da…72c0` | `e9f4c2da…72c0` |
| Policyer (md5) | `1e269660…59e7` | `1e269660…59e7` |
| Funksjoner | 10 | 10 |

Fire av fire snitt er identiske. Av de ti funksjonene er åtte bit-identiske. De
to siste — `koe_register_project` og `koe_set_contract_teams` — avviker, men
**bare i innrykk og strippede kommentarer**: normalisert for blanktegn og
kommentarer er sjekksummene like, og begge er `SECURITY INVOKER` begge steder.
Basen ble altså ikke bygget fra repoets fil ordrett, men den er semantisk lik.

**Rekkefølgen er en del av resultatet** og er ikke utledbar av filnavnene alene:

```
supabase/migrations/20260911073512_koe_kjerneskjema_rekonstruert.sql
backend/migrations/004_projects_table.sql
supabase/migrations/20260911080500_project_memberships_rekonstruert.sql
backend/migrations/003_sak_relations.sql
backend/migrations/006_bim_tables.sql
backend/migrations/005_project_rls_policies.sql
supabase/migrations/20260902_catenda_project_registry.sql
... (øvrige supabase/migrations i versjonsrekkefølge)
supabase/migrations/20260920160000_avstem_backend_migrations.sql
```

**Andre halvdel gjenstår, og er ikke gjort her.** Tre ting mangler før veien er
automatisk framfor dokumentert:

1. **`supabase/config.toml` finnes ikke.** Uten den er `supabase db push` ikke
   konfigurert mot prosjektet.
2. **Fem historikkrader har ingen fil.** `002_koe_indexes` til
   `006_koe_rls_performance` ligger i basens historikk; innholdet er foldet inn i
   kjerneskjemafila, som bærer den første av de seks versjonene. `db push` vil
   melde avvik til de fem er avstemt med `supabase migration repair --status
   applied`. Det er en endring av historikk, ikke av skjema, og er bevisst ikke
   utført.
3. **DA-04 må avgjøres:** repoets `20260920060000` mot basens `20260920053427`.
4. **`backend/migrations/` må enten flyttes inn eller få sin rolle skrevet ned.**
   Mappa er merket «legacy», men fire filer der er fortsatt nødvendige for å
   bygge basen, og to av dem må kjøre midt inne i `supabase/migrations`-sekvensen.
   Så lenge det er tilfelle, er «migrasjonsmappa er eneste kilde» ikke sant.

---

## Svar på arbeidspakkens to spørsmål

**Arkeologi.** Tjue tabeller. Atten i bruk, to etterlatenskaper (`user_groups`,
`magic_links`), og én — `project_memberships` — som skrives, aldri leses, og
bare henger sammen via en trigger. Sju tabeller fantes ikke i repoet; nå gjør de
det. Ingen tabell er fjernet: det lå utenfor mandatet, og forslagene står i
DA-08, DA-09 og DA-10.

**Utforming.** Hver tabell som er i bruk har fått et svar på om den burde vært
slått sammen med en annen:

| Kandidat | Svar |
| --- | --- |
| De tre hendelsestabellene | **Slå dem sammen — men avgjør det sammen med transaksjonsplanen.** Identiske i basen, og alt sikkerhetsarbeid må i dag gjøres tre ganger |
| `sak_relations` | **Legg på fremmednøklene nå (DB-04). Vurder fjerning:** skannestien beviser at hendelsene bærer samme informasjon |
| De ti `cached_*` | **Behold foreløpig, men de er en avledning med reparasjonsskript.** Hører sammen med DA-12 og domenegjennomgangen |
| `project_memberships` | **Fjernes**, etter at `viewer`-begrepet er avklart mot DB-05 |
| `user_groups`, `magic_links` | **Fjernes** (`magic_links`: eller tas i bruk framfor fila) |
| `catenda_models_cache`, `sak_bim_links` | **Ingen dom — mangler en produkteier.** DA-15 |
| De øvrige ti | **Beholdes.** Hver har en entydig rolle og minst én leser |

---

## Verifikasjon og grenser

**Kjørt og observert denne runden:**

- Katalogspørringer mot `gwdxadexwktegkklyobv`: tabeller, kolonner, skranker,
  indekser, policyer, grants, funksjonskropper, triggere, radtall, historikk.
- At `select actorteam` feilet med `42703` før migrasjonen og svarer etter.
- At `select *` mot `koe_events` gikk bra hele tiden — grunnlaget for korreksjonen
  i DA-02.
- At `anon` og `authenticated` har **null** tabellrettigheter og **null**
  `EXECUTE` — grunnlaget for at DA-11s `authenticated`-policy er uvirksom.
- At hele migrasjonssettet bygger en tom PostgreSQL 16, og at resultatet er
  katalogidentisk med basen på fire av fire snitt.
- At `backend/004` alene feiler med `relation "sak_metadata" does not exist`, og
  at rekkefølgen kjerneskjema → `004` → `project_memberships` er nødvendig.
- Backend-suiten: **1461 passert, 9 hoppet over, 41 xfail**. `ruff check
  backend/`: 0. Frontend: **590 tester i 51 filer passert**, `npm run
  check:error` gir 0 errors (9 warnings, uendret). Ingen frontend-fil er endret
  denne runden.
- At de to nye testene i `test_database_arkitektur_20260920.py` faktisk feiler
  når kjerneskjemafila fjernes — en grønn test som ikke kan feile, beviser
  ingenting.

**Lest ut av koden, ikke kjørt:**

- At `get_events_cloudevents` svelger feilen i `except Exception: continue` og
  returnerer `[]`. Kodestien er lest; den er ikke fremtvunget mot en base uten
  kolonnen.
- At `append_event` ville blitt avvist av `INSERT`. Avledet av at `row`-dicten
  navngir `actorteam` og at kolonnen ikke fantes. **Ingen skriving er forsøkt mot
  basen** — den er tom og skal forbli det.
- At `project_memberships` aldri leses. Basert på at det eneste kallet mot
  `SupabaseMembershipRepository` i backend er `.add(...)`. Søkt etter både
  klassenavn, modulnavn og container-attributtet.
- At `get_user_role` og `get_user_role_by_email` ikke kalles. Søkt i hele repoet,
  også frontend.
- At `sak_relations` kan utledes av hendelsene. Basert på at
  `_finn_forseringer_via_scan` finnes og gjør det; skannestien er ikke kjørt.

**Ikke kontrollert:**

- **Om noe utenfor repoet rører tabellene.** Edge functions, eksterne jobber,
  Supabase-konsollet eller et annet miljø. Alle «ingen lesere»-dommer (DA-08,
  DA-09, DA-10) gjelder *dette repoet*. Ingen edge functions er listet, men det
  er ikke det samme som at ingen finnes.
- **Ytelse.** Ingen dom om `sak_relations` eller `cached_*` hviler på en måling.
  Basen er tom; det finnes ingen spørreplan å lese. «Holder et indeksert
  oppslag?» er stilt, ikke besvart.
- **De fem historikkradene uten fil.** At kjerneskjemafila gjengir *nettopp* det
  `001`–`006` gjorde, er ikke vist og kan ikke vises. Det som er vist, er at
  sluttilstanden stemmer. Fordelingen mellom de seks er tapt.
- **`supabase db push`.** Påstandene om hva verktøyet ville gjort (DA-04, punkt
  2 over) er lest ut av verktøyets dokumenterte semantikk. Kommandoen er ikke
  kjørt — det finnes ingen `config.toml`, og et staging-miljø finnes ikke.
- **Om `20260918090000` gjorde noe *annet* enn å legge til kolonnen.**
  Migrasjonen kjører også `ENABLE ROW LEVEL SECURITY`, `REVOKE` og `GRANT` på de
  tre tabellene. De var allerede i den tilstanden, så anvendelsen var et nullsteg
  der — kontrollert etterpå, ikke før.

**En grense til, av metodisk art.** Denne gjennomgangen fant at ett av tre
punkter i en «uverifisert»-merket liste var feil. Det er ikke et argument for at
resten av dette dokumentet er riktig. DA-07 ble funnet fordi ti databasefunksjoner
ble lest — og det var ikke en planlagt kontroll, det var noe som falt ut av å
hente funksjonskroppene for migrasjonsfilene. **Har man funnet ett tilfelle, har
man ikke funnet alle:** det er godt mulig at flere «ubrukte» dommer over ville
falt om noe annet enn kodesøk og katalogen ble lest. Den neste steinen å snu er
Supabase-konsollet — edge functions, webhooks og planlagte jobber — som ikke er
synlig herfra i det hele tatt.
