# Design: tilgangsmekanisme i datalaget (grunnlag for B-02)

**Dato:** 2026-09-22. **Utgangspunkt:** commit `c25c474` (`main`, etter PR #36),
gren `b02-designgrunnlag`.
**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
B-02 i 3.4, AF-01/AF-02 i 3.2 og F1 i avsnitt 5;
[arkitekturføringene](arkitekturforinger-2026-09-21.md).
**Oppdrag:** [prompt-b02-tilgangsmekanisme-2026-09-22.md](prompt-b02-tilgangsmekanisme-2026-09-22.md),
med oppdragsgivers svar i avsnitt 2 der.
**Status:** designgrunnlag. B-02 er fortsatt åpen. Den avgjøres av
oppdragsgiver etter uavhengig review.

## Sammendrag

> **Merknad 2026-09-23 fra reviewet:**
> [Uavhengig review](review-b02-tilgangsmekanisme-2026-09-23.md) konkluderer med
> at anbefalingen kan legges til grunn med navngitte endringer. Originalbevisets
> 71/71 og de tre mutasjonene er bekreftet. Integritetsgrensen og flere
> F1-kontroller er likevel ufullstendige; se RB2-01–08. B-02 er fortsatt åpen.

Anbefalingen er alternativ C: **RLS med kontekst for lesing, avgrensede
`SECURITY DEFINER`-kommandoer for bindende skriving, og en skrivevakt-trigger på
journalen.** Kommandoene går som RPC over PostgREST.

Det avgjørende funnet er TM-01. PostgREST velger databaserolle fra `role`-kravet
i JWT-en, og `authenticator` er medlem av `service_role`. Den som kan signere et
token, kan derfor bli `service_role`, med `BYPASSRLS` og alle tabellrettigheter.
Alle alternativer der runtime snakker med PostgREST har dette til felles. Det
betyr at rolledeling alene ikke gir integritet mot en overtatt runtime. Journalen
må vernes av noe `service_role` ikke kan komme rundt. Skrivevakten slipper bare
gjennom `INSERT` der `current_user` er kommandoeieren. Prototypen viser at den
stanser `UPDATE`, `DELETE`, `TRUNCATE`, direkte `INSERT` og kaskaden fra
`sak_metadata`, også når kalleren er `service_role` (K 22.09).

Prototypen kjører mot en kastbar PostgreSQL 17 og ekte PostgREST 12.2.12. Basen
er bygget fra alle 23 migrasjonene, og den bruker dagens `koe_resolve_identity`
og `koe_reconcile_memberships`. **71 av 71 sjekker holdt.** Tre mutasjoner, som
hver fjerner én regel, gjorde henholdsvis 3, 7 og 11 sjekker røde.

## Funn fra designarbeidet

| ID | Alvorlighet | Funn | Belegg |
| --- | --- | --- | --- |
| TM-01 | Høy | Den som kan signere et JWT for PostgREST, kan bli `service_role` | D 22.09, dokumentasjon, K i prototype |
| TM-02 | Høy | `koe_resolve_identity` og `koe_reconcile_memberships` er `SECURITY INVOKER` og virker bare med `service_role` | D 22.09, K i prototype |
| TM-03 | Middels | Teamtilhørighet finnes ikke i basen. Basen kan kontrollere prosjekt og leserolle, men ikke team | L, D 22.09 |
| TM-04 | Middels | Den delte Supabase-klienten setter token på hele klienten. Et token per forespørsel på den ville lekke mellom tråder | L |
| TM-05 | Middels | En kommando som melder konflikt med SQLSTATE `40001`, ser ut til å bli kjørt om igjen av PostgREST til klienten gir opp | K i prototype, mekanismen ikke slått opp |
| TM-06 | Middels | Medlemskap alene skiller ikke leserollen fra handlingsrett (DB-05) | L, K for rettingen |
| TM-07 | Lav | `service_role` har `TRUNCATE`, `TRIGGER` og `REFERENCES` på `hendelse` | D 22.09 |
| TM-08 | Lav | Standardrettighetene for objekter `supabase_admin` oppretter i `public`, gir `anon` og `authenticated` alt | D 22.09 |

### TM-01 — et signert token kan velge `service_role`

> **Merknad 2026-09-23 fra reviewet (RB2-01):** Rollevalget er bekreftet for
> den valgte signeringsmodellen, men gjelder ikke uunngåelig all PostgREST-bruk.
> Supabase dokumenterer en forespørselsvakt. Lokalt avviste den et
> `service_role`-token og tillot `koe_runtime` med samme signeringsnøkkel.
> T2 og et avgrenset PostgREST-oppsett må sammenliknes før transportvalget låses.
> Hostet JWT-validering er fortsatt ikke prøvd. Se
> [reviewet](review-b02-tilgangsmekanisme-2026-09-23.md).

**Katalogen (D 22.09):** `authenticator` er `LOGIN NOINHERIT` og medlem av
`anon`, `authenticated` og `service_role` med `SET`, gitt av `supabase_admin`.
`service_role` har `BYPASSRLS`. Supabase-dokumentasjonen om JWT-signeringsnøkler
sier at `role` må være en eksisterende Postgres-rolle, «such as `anon`,
`authenticated`, or `service_role`». Et eget token med en egen rolle forutsetter
en nøkkel backend selv kan signere med: en importert privatnøkkel eller en delt
hemmelighet. Den samme nøkkelen kan signere `role: service_role`.

**Følge:** et design der runtime har en egen rolle, men signerer tokenet selv,
verner mot glemt filter og mot ondsinnet bruker. Det verner ikke mot en overtatt
runtime. Da må integriteten hvile på noe som gjelder også `service_role`.
`service_role` kan ikke sette `session_replication_role`, har ikke `CREATE` i
noe skjema og eier ingen tabell (D 22.09). Den kan derfor verken slå av eller
fjerne en trigger. Prototypen bekrefter det (K).

**Kilde:** [JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys),
avsnittet om å lage egne JWT-er.

### TM-02 — identitetsfunksjonene forutsetter `service_role`

> **Merknad 2026-09-23 fra reviewet (RB2-05):** DEFINER-konverteringen virker,
> men runtime kan også bruke annen issuer/provider og opprette medlemskap via
> synkronisering. Dette må behandles som betrodd myndighet, ikke som et
> uavhengig medlemskapsbevis mot overtatt runtime. Catenda-issuer/provider og
> subjektnormalisering må låses i den planlagte inngangen. Se
> [reviewet](review-b02-tilgangsmekanisme-2026-09-23.md).

`koe_resolve_identity`, `koe_reconcile_memberships`, `koe_register_project` og
`koe_set_contract_teams` er `SECURITY INVOKER` med `search_path=''`. `EXECUTE`
har bare `postgres` og `service_role` (D 22.09). Funksjonene skriver
`app_users`, `app_identities`, `app_project_memberships` og
`app_membership_sync` med kallerens rettigheter. Med en avgrenset runtime-rolle
feiler den første innloggingen. `koe_reconcile_memberships` kaller
`koe_resolve_identity` internt, så de to må få samme eier.

I prototypen er begge gjort om til `SECURITY DEFINER` med eieren
`koe_identitet`, en `NOLOGIN`-rolle uten medlemmer. `EXECUTE` er gitt til
`koe_runtime`. Begge virker som RPC over PostgREST, med `pg_advisory_xact_lock`
urørt, og runtime kan verken lese `app_identities` eller skrive `app_users`
direkte (K).

### TM-03 — team kan ikke kontrolleres i basen

`app_project_memberships` har prosjekt, bruker, Catenda-subjekt, rolle,
`viewer_override` og `active`, men ikke team (D 22.09).
[`contract_membership`](../backend/services/auth_service.py) henter brukerens
team fra Catenda ved hver skriving, uten mellomlager. Ingen tabell kobler bruker
til team (L).

**Følge:** basen kan selv kontrollere at aktøren er aktivt medlem av prosjektet
og ikke har leserollen. Teamet må den ta på tillit fra runtime. Det holder mot
glemt filter og mot ondsinnet bruker, fordi teamet aldri kommer fra klienten.
Mot en overtatt runtime holder det ikke, men lesing ved overtatt runtime er godtatt
restrisiko. Skal basen kontrollere team, må lagmedlemskap lagres som en synkronisert
tabell. Det er en medlemskapscache, og da gjelder B-04 og F3.

### TM-04 — tokenet kan ikke settes på den delte klienten

[`get_shared_client`](../backend/lib/supabase/client.py) er én klient per prosess
(`lru_cache`). I `postgrest` 2.28.0 setter `auth(token)` `self.headers["Authorization"]`
på klienten (L, `postgrest/base_client.py`). Kaller to tråder `auth()` på samme
klient, kan den ene tråden sende den andres kontekst. Dette er gjenbruksproblemet
fra F1, flyttet ett lag opp. Tokenet må følge den enkelte forespørselen.
**Ikke reprodusert.**

### TM-05 — `40001` gir omkjøring i PostgREST

Første versjon av prototypens kommando meldte versjonskonflikt med
`serialization_failure` (`40001`). Med PostgREST 12.2.12 ga klienten opp etter
10 s. Sju sekunder ut i forespørselen viste `pg_stat_activity` kallet aktivt med
et `query_start` under ett millisekund gammelt (K). Det tyder på at PostgREST
kjører transaksjonen på nytt. Mekanismen er ikke slått opp i PostgRESTs kode
eller dokumentasjon. Etter at konflikten ble meldt med `PT409`, svarte PostgREST
straks med feil (K). Transaksjonsplanens konfliktkontrakt må ta hensyn til dette.

### TM-06 — medlemskap er ikke handlingsrett

Første utkast av kommandoen krevde bare aktivt medlemskap. Det ville latt en
`viewer_override`-bruker sende varsel (lest ut av utkastet, ikke kjørt). Den
ferdige prototypen skiller `er_medlem()` (lesing av journalen) fra
`har_handlingsrett()` (medlem, ikke leserolle). Den siste brukes av kommandoer og
av teamgrensen for private data, og viewer avvises (K).

### TM-07 og TM-08

`service_role` har `TRUNCATE` og `TRIGGER` på `hendelse` fordi migrasjonen gir
dem eksplisitt (D 22.09). Skrivevakten stanser `TRUNCATE`. Med
`TRIGGER`-rettigheten kan rollen likevel opprette en trigger på journalen, hvis
den har en triggerfunksjon den får kjøre. Rettighetene bør tas bort på
integritetstabellene.

Standardrettighetene for `supabase_admin` i `public` gir `anon`, `authenticated`
og `service_role` alt (D 22.09). De treffer bare objekter plattformen selv
oppretter. De hører likevel med i rettighetstesten, som bør kontrollere alle
objekter og ikke bare dem migrasjonene lager.

## 1. Trusselmodell

Etter oppdragsgivers svar 22.09:

| Trussel | Hva skal holde | Vernet må være uavhengig av |
| --- | --- | --- |
| Glemt filter | Et nytt lesepunkt eller en ny skrivesti som glemmer prosjekt- eller teamfilteret, gir null rader eller avvisning | At den som skriver ruta, husker filteret |
| Ondsinnet bruker | Falsk `X-Project-ID`, gjettet sak- eller notat-ID og direkte kall mot Data API gir ingenting | Klientoppgitte verdier og rutedekoratørene |
| Kompromittert runtime/worker | **Integritet:** journalen kan ikke omskrives, slettes eller tømmes, og ingen hendelse kommer inn utenom kommandoene. Godkjenningsregler kan ikke senkes av runtime | Runtime-legitimasjonen, også når den kan bli `service_role` (TM-01) |
| Kompromittert runtime/worker | **Konfidensialitet:** godtatt restrisiko | — |
| Databaseadministrator, plattform | Godtatt restrisiko. Håndteres i F4 med uavhengig integritetsbevis | — |

Én begrensning bør stå eksplisitt. En overtatt runtime kan utgi seg for en hvilken
som helst bruker, fordi den både setter konteksten og har innloggingsflyten.
Den kan derfor sende en ekte kommando i en godkjenners navn. Vernet kan
garantere at ingen hendelse kommer inn utenom kommandoene, og at kommandoenes
strukturregler holder. Det kan ikke garantere at en menneskelig godkjenning
faktisk fant sted. Det krever at brukeren signerer noe runtime ikke kan
forfalske, og det ligger utenfor B-02.

## 2. Utgangspunktet i basen

Katalogen i `gwdxadexwktegkklyobv`, spurt 22.09 (D):

- Nitten tabeller i `public`, alle med RLS på og ingen med `FORCE`. Alle eies av
  `postgres`. Hver har én policy `service_role / ALL / USING (true)`.
  `project_memberships` har i tillegg den inerte e-postpolicyen (AR-07).
- `anon` og `authenticated` har ingen tabellrettigheter og ingen `EXECUTE` i
  `public`.
- `postgres` er ikke superbruker, men har `BYPASSRLS`, `CREATEROLE`, `CREATE` i
  `public` og `ADMIN` på `anon`, `authenticated`, `service_role` og
  `authenticator`.
- `service_role` har `BYPASSRLS` og alle tabellrettigheter. Den kan ikke sette
  `session_replication_role` og har ikke `CREATE` i noe skjema.
- Standardrettighetene for `postgres` i `public` gir `service_role` alt på
  tabeller, sekvenser og funksjoner.
- `pgaudit` er forhåndslastet (`shared_preload_libraries`), men utvidelsen er
  ikke opprettet.

Koden (L): backend bruker én delt `supabase-py`-klient med
`SUPABASE_SECRET_KEY` (TM-04). Fire funksjoner kalles som RPC fra
[`auth_repository.py`](../backend/repositories/auth_repository.py). Resten går
til tabellendepunktene. Team hentes fra Catenda (TM-03).

## 3. Alternativene

Alle tre alternativene bruker samme kontekstkontrakt (avsnitt 4) og samme roller
for worker, drift, migrering og break-glass (avsnitt 5). De skiller seg i hvordan
runtime når tabellene.

### Alternativ A — RLS med kontekst alene

Runtime får `SELECT` og `INSERT` på tabellene, og RLS filtrerer både lesing og
skriving på kravene i konteksten. `hendelse` får `INSERT` med `WITH CHECK` på
prosjekt og aktør, men ikke `UPDATE` eller `DELETE`.

- **Over PostgREST:** tabellendepunktene brukes som i dag. RPC trengs bare der
  flere skrivinger må være atomiske.
- **Gjenbrukte forbindelser:** PostgREST setter rolle og krav
  transaksjonslokalt. Det samme må en direkte forbindelse gjøre (avsnitt 4.3).
- **Identitetsfunksjonene:** som `SECURITY INVOKER` trenger runtime direkte
  skriverett på `app_users`, `app_identities` og medlemskapene. Da kan en feil i
  runtime også skrive medlemskap.
- **Mot trusselmodellen:** holder mot glemt filter og ondsinnet bruker. Holder
  **ikke** integriteten. Runtime kan skrive en hvilken som helst hendelsestype
  direkte, for eksempel `eo_utstedt`, og omgå godkjenningen (AF-02). Med TM-01
  kan den også omskrive journalen.

### Alternativ B — avgrensede funksjoner alene

Runtime har ingen tabellrettigheter. All lesing og skriving går gjennom
`SECURITY DEFINER`-funksjoner som autoriserer eksplisitt.

- **Over PostgREST:** bare `/rpc/*`. Lesingen i de ni repositoriene som bruker
  `.table()`, skrives om til funksjoner.
- **Gjenbrukte forbindelser:** konteksten kan komme som argumenter i stedet for
  kravvariabler, og da finnes det ingen sesjonsvariabel som kan lekke. Argumentene
  settes like fullt av runtime, så tilliten er den samme.
- **Identitetsfunksjonene:** som i C.
- **Mot trusselmodellen:** glemt filter er bare flyttet. Hver lesefunksjon må ha
  sitt eget filter, og en ny lesefunksjon uten filter lekker, slik et nytt
  lesepunkt gjør i dag. AF-01 krever vern som et nytt lesepunkt arver. Det gir
  B ikke. Integriteten holder mot `koe_runtime`, men med TM-01 kan runtime bli
  `service_role`, som har tabellrettigheter. B trenger derfor også skrivevakten.

### Alternativ C — RLS for lesing, kommandoer for bindende skriving, skrivevakt

> **Merknad 2026-09-23 fra reviewet (RB2-02/03):** Vaktbeskrivelsen under
> er ikke en full operasjonsmodell for alle integritetstabellene. Saksattribusjon
> og leveringsreferanser kan endres i prototypen, og notatets sak kan høre til
> et annet prosjekt. `koe_policy` og legitime statusendringer trenger egne regler.
> «Ingen rolle kan bli kommandoeieren» må dessuten avgrenses mot administrator:
> PG17 gir en ikke-superbruker med CREATEROLE ADMIN på rollen den oppretter.
> Katalogen viser også TEMP-rettighet for service_role; fravær av CREATE i
> eksisterende skjemaer er ikke en full kontroll av objektoppretting. Se
> [reviewet](review-b02-tilgangsmekanisme-2026-09-23.md).

- **Lesing:** runtime har `SELECT`, og RLS med `FORCE` filtrerer på kontekst og
  medlemskap. Et nytt lesepunkt arver filteret (AF-01).
- **Bindende skriving:** journalen, godkjenningspakker, fullmakt og policy skrives
  bare av `SECURITY DEFINER`-kommandoer. Hver eies av en `NOLOGIN`-rolle som ingen
  er medlem av, har `search_path=''` og har `EXECUTE` fjernet fra `PUBLIC`.
  Kommandoen autoriserer selv. Det finnes én kommando per handling, ikke en
  generell append (AF-02).
- **Slettbare private data** (`notat`, utkast): runtime kan skrive direkte, med
  RLS `WITH CHECK` på prosjekt, team, aktør og side. Notatet er ikke et
  kontraktsvarsel (MS-05).
- **Skrivevakt:** en `BEFORE INSERT OR UPDATE OR DELETE`-trigger og en
  `BEFORE TRUNCATE`-trigger på hver integritetstabell. Bare `INSERT` med
  `current_user` lik kommandoeieren slipper gjennom. Inne i en
  `SECURITY DEFINER`-funksjon er `current_user` eieren. Ellers er den kallerens
  rolle. Ingen rolle kan bli kommandoeieren, fordi den ikke har medlemmer og
  ikke kan logge inn.
- **Over PostgREST:** lesing via tabellendepunktene, bindende kommandoer via
  `/rpc/*` i et eget skjema (`koe_api`). Én RPC er én transaksjon (3.1).
- **Identitetsfunksjonene:** `SECURITY DEFINER` med eieren `koe_identitet`
  (TM-02).
- **Mot trusselmodellen:** holder mot glemt filter (RLS arves), ondsinnet bruker
  (medlemskap slås opp i basen, avsnitt 4) og kompromittert runtime for
  integritet (skrivevakten). Lesing på tvers ved overtatt runtime er som godtatt.

### Sammenlikning

| Krav | A | B | C |
| --- | --- | --- | --- |
| Glemt filter, lesing | Holder (RLS) | Må gjentas per funksjon | Holder (RLS) |
| Glemt filter, skriving | Holder for prosjekt, ikke for hendelsestype | Holder | Holder |
| Ondsinnet bruker: falsk prosjekt, gjettet ID | Holder hvis medlemskap slås opp i policyen | Holder hvis hver funksjon gjør det | Holder, K |
| Overtatt runtime: omskrive eller tømme journalen | Holder ikke (TM-01) | Holder bare med skrivevakt | Holder, K |
| Overtatt runtime: hendelse utenom kommando | Holder ikke | Holder bare med skrivevakt | Holder, K |
| Overtatt runtime: lese på tvers | Holder ikke, godtatt | Holder ikke, godtatt | Holder ikke, godtatt, K |
| Overtatt worker: lese private data | Holder (ingen rettighet) | Holder | Holder, K |
| Databaseadministrator | Utenfor | Utenfor | Utenfor |
| F1: prosjekt A gir null rader fra B | Ja | Ja, per funksjon | Ja, K |
| F1: motpart, to team, ukjent team, manglende kontekst, gjettet ID | Ja | Ja, per funksjon | Ja, K |
| F1: gjenbrukt forbindelse | Ja | Ja | Ja, K (direkte og PostgREST) |
| F1: runtime kan ikke `UPDATE`/`DELETE`/`TRUNCATE`/skrive `hendelse` | Bare for `koe_runtime`, ikke via `service_role` | Med skrivevakt | Ja, K, også `service_role` |
| Omskriving av backend | Liten | Stor: all lesing blir RPC | Middels: bindende skriving blir RPC, som F2 uansett krever |

## 4. Kontekstkontrakten

> **Merknad 2026-09-23 fra reviewet (RB2-04):** Privat lesing lykkes lokalt
> uten gyldig side når aktør/prosjekt/team ellers stemmer. Et vilkårlig team
> kan brukes ved notatinnsetting, og NULL forventet versjon passerer kommandoen.
> Sjekkene under beviser utvalgte kombinasjoner, ikke en fullstendig
> kontekst- og argumentkontrakt. Se
> [reviewet](review-b02-tilgangsmekanisme-2026-09-23.md).

### 4.1 Hva som føres inn

| Krav | Kilde | Kontrolleres i basen |
| --- | --- | --- |
| `role` | Fast `koe_runtime` i den ene funksjonen som lager token | Nei, men se TM-01 |
| `koe_aktor` | Sesjonen, `app_users.id` | Ja: aktivt medlemskap i prosjektet |
| `koe_prosjekt` | `X-Project-ID` etter `require_project_access` | Ja: medlemskap slås opp for aktør og prosjekt |
| `koe_side` | `contract_membership`, fra Catenda | Nei, verdien må være `TE` eller `BH` |
| `koe_team` | `contract_membership`, fra Catenda | Nei (TM-03). Gir bare noe når aktøren har handlingsrett |
| `exp` | Høyst 60 s | PostgREST avviser utløpt token |

Klienten setter ingenting av dette (invariant 11). Tokenet lages i ett punkt i
backend, etter `require_auth` og `require_project_access`. Rollen er fast der.
Glemmer en rute `require_project_access`, stopper basen likevel en falsk
`X-Project-ID`, fordi medlemskapet slås opp på nytt. Prototypen viser det: et
medlem av B med A i konteksten ser ingen hendelser (K).

### 4.2 Hvordan basen leser konteksten

Policyene kaller små funksjoner i skjemaet `koe_privat`. Skjemaet er ikke
eksponert.

- `krav(navn)` leser `request.jwt.claims`. Etter commit er en variabel som har
  vært satt i sesjonen `''`, ikke `NULL` (K). Derfor `nullif(..., '')`.
- `er_medlem()` og `har_handlingsrett()` er `SECURITY DEFINER` eid av
  `koe_identitet`. De slår opp `app_project_memberships` ved hver spørring.
- `privat_team()` returnerer teamkravet bare når aktøren har handlingsrett.
- Kallene pakkes i `(SELECT …)` i policyene, så de evalueres én gang per
  spørring og ikke per rad.

`request.jwt.claims` er PostgRESTs navn, men for basen er det en vanlig
tilpasset variabel. En direkte forbindelse setter den samme variabelen med
`set_config(..., true)`, så kontrakten er den samme uten PostgREST. Det svarer
til plattformsvaret: ingenting i vernet krever Supabase.

### 4.3 Gjenbrukte forbindelser

- **PostgREST** setter rollen og kravene med `set_config(..., true)` inne i
  forespørselens transaksjon. Med `db-pool = 1` hadde to påfølgende forespørsler
  samme backend-pid, og den andre så ingenting av den førstes krav (K).
- **Direkte forbindelse** (Supavisor i transaksjonsmodus eller egen pool): rolle
  med `SET LOCAL ROLE`, krav med `set_config(..., true)`, begge inne i en
  eksplisitt transaksjon. Etter commit er rollen `authenticator` og kravene
  tomme, og `authenticator` selv får ikke lese `notat` (K). Kontrollen er at
  krav satt på sesjonsnivå (`is_local = false`) følger med til neste transaksjon
  (K). `SET` uten `LOCAL` er derfor forbudt i databaselaget.
- **HTTP-klienten** er det tredje stedet konteksten kan følge med (TM-04). Tokenet
  sendes som header på den enkelte forespørselen, ikke med `auth()` på den delte
  klienten.

### 4.4 Systemkontekst

Innlogging, webhookmottak og medlemssynkronisering kjører før en aktør er kjent.
De bruker et token med `role: koe_runtime` uten `koe_*`-krav. Med det kan runtime
kalle identitetsfunksjonene, men ikke se journal eller notater (K). Når
webhookforfatteren er løst, skrives hendelsen med forfatteren som aktør gjennom
samme kommando.

## 5. Rollene

| Rolle | Innlogging | Rettigheter | Aldri | Prototype |
| --- | --- | --- | --- | --- |
| `koe_runtime` | Via `authenticator`, token med `role: koe_runtime` | `SELECT` på journal og saksdata (RLS), `SELECT`/`INSERT`/`DELETE` på `notat` og utkast (RLS), `EXECUTE` på kommandoer og identitetsfunksjoner | Skrive `hendelse`, pakker eller policy direkte. `TRUNCATE`. Identitets- og sesjonstabeller direkte | Ja |
| `koe_worker` | Egen `LOGIN` (direkte) eller token | `SELECT` på journal og kø, `UPDATE` på leveringsstatus, lease og utløp | `notat`, utkast, pakker. Skrive journal. Endre prosjekt i køen | Ja |
| `koe_drift` | Egen `LOGIN`, personlig | Lese kø, dead-letter og leveringsstatus. `EXECUTE` på manuell retry, som logger | Private data. Journal direkte | Nei |
| `koe_kommando` | Ingen (`NOLOGIN`, ingen medlemmer) | Eier kommandoene. `INSERT` på integritetstabellene, `SELECT` der det trengs | — | Ja |
| `koe_identitet` | Ingen (`NOLOGIN`, ingen medlemmer) | Eier identitetsfunksjonene og kontekstoppslagene | — | Ja |
| `koe_policy` | Ingen (`NOLOGIN`, ingen medlemmer) | Eier funksjonene som endrer godkjenningspolicy og fullmakt. `EXECUTE` bare for `koe_drift` | — | Nei |
| Migrering | `postgres` gjennom `supabase db push` | Eier alle objekter | Brukes aldri av runtime | Nei |
| Break-glass | Egen `LOGIN` med `VALID UNTIL`, opprettet ved behov | Det konkrete behovet, ikke `postgres` | Stående tilgang | Nei |

**Migrering og break-glass** er utenfor vernet. `postgres` eier tabellene og kan
slå av triggeren. `supabase_admin` er superbruker. Det er
databaseadministratoren, som er godtatt restrisiko. F1 krever at de er
«separat, tidsavgrenset og logget». Forslaget er at migrering bare skjer
gjennom `supabase db push` fra CI eller fra en navngitt person. Break-glass blir
en egen innloggingsrolle med `VALID UNTIL`, opprettet og fjernet med logget SQL.
Logging skjer med `pgaudit` (forhåndslastet, ikke opprettet, D 22.09) for
rolle- og DDL-hendelser. **Ingen av delene er prøvd.**

**Nøkkelen:** runtime får en signeringsnøkkel for egne token og en publiserbar
`apikey`, ikke `SUPABASE_SECRET_KEY`. Etter TM-01 gir det ikke mer vern mot en
overtatt runtime. Det gjør likevel at normal kode ikke kan nå `service_role` ved
et uhell. `SUPABASE_SECRET_KEY` blir driftens.

**Alternativ transport:** runtime kan i stedet logge inn direkte som en egen rolle
gjennom Supavisor. Da har den ingen nøkkel som kan velge `service_role`. Men
konteksten settes fortsatt av runtime, så lesevernet blir ikke sterkere. 3.1
sier RPC over PostgREST. Prototypen viser at C holder med begge transporter
(runtime over PostgREST, worker direkte).

## 6. B-04: tilbakekalling

> **Merknad 2026-09-23 fra reviewet (RB2-07):** «Ingen forsinkelse» er for
> absolutt når token eller transaksjoner kan leve videre etter Catenda-oppslaget.
> Lokal PostgREST godtok også manglende exp og lengre levetid enn 60 sekunder.
> En frist før virkning krever endret active-/synkroniseringslogikk, ikke bare
> en ekstra tidskolonne. B-04 er ikke avgjort, men tidskontrakten må konkretiseres.
> Supavisor er fortsatt ikke prøvd. Se
> [reviewet](review-b02-tilgangsmekanisme-2026-09-23.md).

Designet avgjør ikke B-04, men påvirker hva som er mulig:

- Medlemskap slås opp i basen ved hver spørring. Når synkroniseringen har
  satt et medlemskap inaktivt, virker det fra neste transaksjon. Prototypen:
  `koe_reconcile_memberships` med rådgiveren utelatt fra øyeblikksbildet, og
  rådgiverens neste forespørsel ser null notater og null hendelser (K).
  Hvor raskt en tilbakekalling i Catenda får virkning, avgjøres da av hvor ofte
  synkroniseringen kjører.
- Team hentes fra Catenda per forespørsel (TM-03) og har ingen forsinkelse.
- Tokenets `exp` (høyst 60 s) setter en øvre grense for hvor gammel en kontekst
  kan være.
- «Frist før virkning» krever en `gyldig_til` på medlemskapet og et policyuttrykk
  som bruker den. Det passer i samme mekanisme.
- Hva som skjer med ventende pakker og utkast, er et kontraktsspørsmål og
  uavhengig av mekanismen.

## 7. TS2-02: reservelagrene og testene

**Vurdering:** forslaget bør følges, og designet gjør det nødvendig. RLS,
rolleskifte, skrivevakten og kommandoenes transaksjon finnes bare i PostgreSQL.
JSON- og CSV-lagrene kan ikke uttrykke dem. Grønne tester mot dem sier ingenting
om F1-kriteriene. Det er samme begrensning som `AGENTS.md` beskriver for
testdoblene.

Rekkefølgen:

1. Testene i avsnitt 8 kommer først, mot PostgreSQL i CI.
2. Flyt for flyt flyttes tester som trenger ekte lagring, til PostgreSQL gjennom
   RPC eller PostgREST.
3. JSON-hendelseslageret og CSV-metadatalageret tas ut av kjøretidsstien når
   ingen støttet flyt trenger dem. De kan bli igjen som testdobler i enhetstester
   av domenelogikk.

## 8. Testplan

> **Merknad 2026-09-23 fra reviewet (RB2-06/08):** Fjerning av FORCE ga
> fortsatt 71/71; atomicitetssjekken teller bare kø-raden etter et vellykket kall.
> PID-sjekken må kreve gyldige svar og ikke-null PID. Prototypen gir nettrollene
> EXECUTE på diagnostikkfunksjonen hvem, som må ut av målmodellen. Testplanen
> mangler også F1-kriteriet om separat, tidsavgrenset og logget migrering og
> break-glass. Resultater og nødvendige tillegg står i
> [reviewet](review-b02-tilgangsmekanisme-2026-09-23.md).

Hver test logger inn som `authenticator` og bytter rolle transaksjonslokalt,
eller går gjennom PostgREST med et token. `SET ROLE` fra en superbrukersesjon
beviser mindre: `session_user` blir stående, og testen sier ingenting om
innloggingsveien.

| Kriterium (F1) | Negativ test | Mekanisme | I prototypen |
| --- | --- | --- | --- |
| Prosjekt A i kontekst gir null rader fra B | Medlem av A og B, A i konteksten, spørring etter B i `hendelse`, `notat`, `sak_metadata` | RLS + medlemskap | Ja |
| Falsk prosjekt | Medlem av B med A i konteksten | Medlemskap i policyen | Ja |
| Motpart | TE leser BHs notat | Teamkrav | Ja |
| To team på samme side | BH-rådgiver leser byggherrens notat | Teamkrav | Ja |
| Ukjent team, manglende team | Tilfeldig og manglende `koe_team` | Teamkrav | Ja |
| Manglende kontekst | Ingen krav, bare aktør, bare prosjekt | `nullif` + medlemskap | Ja |
| Gjettet ressurs-ID | Notat-ID og sak-ID fra B med A i konteksten | RLS, kommandoens sakskontroll | Ja |
| Leserolle (DB-05) | `viewer` leser journal, ikke notater, sender ikke varsel | `har_handlingsrett` | Ja |
| Gjenbrukt forbindelse | To transaksjoner på samme forbindelse, direkte og PostgREST med `db-pool = 1`, pluss kontroll med sesjonsnivå | Transaksjonslokal kontekst | Ja |
| Runtime skriver ikke til `hendelse` | `UPDATE`, `DELETE`, `TRUNCATE`, `INSERT`, `PATCH` og `DELETE` over PostgREST | Rettigheter | Ja |
| Heller ikke `service_role` | Som over, pluss kaskade, `TRUNCATE … CASCADE`, `DISABLE TRIGGER`, `session_replication_role` | Skrivevakt | Ja |
| Ingen generell append | Kommando med hendelsestype som krever godkjenning | Kommandoens typeliste | Ja |
| Kommando er atomisk | Hendelse og leveringsintensjon i samme transaksjon, konflikt skriver ingenting | Én RPC | Delvis: konflikt og atomisk innsetting. Ikke avbrudd |
| Worker | Leser kø, oppdaterer status, leser ikke `notat`, endrer ikke prosjekt | Kolonnerettigheter | Ja |
| Data API | `anon` og `authenticated` mot tabeller og RPC | Ingen rettighet | Ja |
| Identitetsfunksjonene | RPC som `koe_runtime`, ingen direkte tilgang til tabellene | `SECURITY DEFINER` | Ja |
| Tilbakekalling | Synkronisering fjerner medlem, neste forespørsel ser null | Oppslag per spørring | Ja |
| Rettigheter per rolle | Katalogtest: faktisk rettighetsmatrise lik forventet, for alle objekter i `public`, `koe_api`, `koe_privat` | `information_schema` | Nei |
| Samtidighet og avbrudd | Transaksjonsplanens akseptansetester | F2 | Nei |
| Private lagre i PostgreSQL | Utkast og pakker med samme tester som `notat` | F1 punkt 2 | Nei, tabellene finnes ikke ennå |

**Hva CI trenger:** jobben `database` bygger allerede basen fra tom på
PostgreSQL 17. Den trenger i tillegg:

1. **En skrivbar testbase.** Fixturen i `tests/test_database/conftest.py` er
   bevisst lesende (`default_transaction_read_only=on`). Rettighetstestene
   trenger en egen fixture som kobler til som `authenticator`, og data som
   lastes én gang per sesjon. Tester som skriver, må enten rulle tilbake eller få
   sin egen base.
2. **Innloggingsrollene i stubben:** `authenticator` med `LOGIN NOINHERIT` og
   medlemskap som i katalogen. Rollene fra B-02 lages av migrasjonene, ikke av
   stubben.
3. **PostgREST som tjenestecontainer**, i samme hovedversjon som prosjektet
   bruker, med en testhemmelighet. Supabase-prosjektets versjon er ikke
   kontrollert.
4. **`pyjwt` og `requests`** finnes allerede. `psycopg` er i
   `requirements-dev.txt`.
5. **Mutasjonskjøring** som valgfri jobb eller lokalt: hver mutasjon skal gi rødt.

## 9. Prototypebeviset

[`vedlegg/b02-prototype-2026-09-22/`](vedlegg/b02-prototype-2026-09-22/kjor.sh)

| Fil | Innhold |
| --- | --- |
| `kjor.sh` | Lager en kastbar klynge, bygger alle migrasjonene med `scripts/testbase/bygg_testbase.sh`, legger på laget, starter PostgREST og kjører beviset. Rydder etter seg |
| `01_plattform_postgrest.sql` | `authenticator` som i katalogen |
| `02_b02_lag.sql` | Alternativ C: roller, kontekst, policyer, rettigheter, skrivevakt, kommandoen `koe_api.send_varsel`, identitetsfunksjonene som `SECURITY DEFINER` |
| `03_testdata.sql` | To prosjekter; i A team for BH, BH-rådgiver og TE; i B BH og TE; en leser; en bruker i begge. Hendelsene skrives gjennom kommandoen |
| `bevis.py` | 71 sjekker, merket med kriteriet de prøver |
| `mutasjoner/*.sql` | Tre brudd som skal gi rødt |

```bash
PG_BIN=/opt/homebrew/opt/postgresql@17/bin \
POSTGREST=/sti/til/postgrest \
PYTHON=/sti/til/venv/bin/python \
  docs/vedlegg/b02-prototype-2026-09-22/kjor.sh
```

Resultat 22.09 (K): `71 av 71 sjekker holdt.`

| Mutasjon | Røde sjekker |
| --- | --- |
| `uten_medlemskap.sql`: journalpolicyen stoler på prosjektkravet | 3: falsk prosjekt, bare prosjekt i konteksten, tilbakekalling |
| `uten_skrivevakt.sql`: triggerne fjernet | 7: alle skrivinger som `service_role`. `DISABLE TRIGGER` og `session_replication_role` holder fortsatt, fordi de hviler på rettigheter |
| `uten_teamgrense.sql`: notatpolicyen filtrerer bare på prosjekt | 11: motpart, to team, ukjent og manglende team, leserolle, manglende kontekst, gjenbruk (direkte og PostgREST) og tilbakekalling |

Prototypen er ikke en migrasjon. Den vil ikke bli én uten omskriving: navnene
er foreløpige, og tabellene for utkast og pakker finnes ikke.

## 10. Hva som gjenstår å avgjøre

For oppdragsgiver, etter review:

1. **B-02:** alternativ C, eller et annet.
2. **Transport og nøkkel:** runtime signerer egne token over PostgREST (3.1), med
   TM-01 som kjent følge, eller runtime logger inn direkte.
3. **Team i basen:** konteksten på tillit (TM-03), eller synkroniserte
   lagmedlemskap med tilbakekallingsfrist (B-04).
4. **Break-glass og migrering:** prosedyre, hvem, og logging med `pgaudit`.
5. **Godkjenningsgrensen:** at vernet ikke kan bevise menneskelig godkjenning ved
   overtatt runtime (avsnitt 1), er akseptert, eller skal løses utenfor B-02.

## Verifikasjon og grenser

**Kjørt og observert (K):**

- Katalogspørringer mot `gwdxadexwktegkklyobv` 22.09. Bare
  katalogtabeller, ingen saksdata: `pg_proc` (eier, `prosecdef`, `proconfig`,
  `proacl` og full definisjon for tre funksjoner), `pg_policy`, `pg_trigger`,
  tabell-ACL, `pg_default_acl`, rolleattributter, `pg_auth_members` med
  `admin_option`/`set_option`, `has_parameter_privilege` for
  `session_replication_role`, skjemarettigheter, `pg_settings` og
  `pg_extension`.
- Prototypen: PostgreSQL 17.11 (Homebrew, macOS, `trust`-autentisering) og
  PostgREST 12.2.12 med `db-pool = 1`. Alle 23 migrasjonene, laget og 71 av 71
  sjekker grønne. Tre mutasjoner røde som i tabellen. TM-05 observert én gang
  i `pg_stat_activity`.

**Lest i dokumentasjon:** Supabase om JWT-signeringsnøkler og egne token
(`role` kan være `service_role`, egne nøkler kan importeres, `apikey` kreves i
tillegg), og om Postgres-roller.

**Lest ut av koden (L):** at team hentes fra Catenda
(`AuthService.contract_membership`), at klienten er delt (`get_shared_client`),
og at `auth()` setter en header på klienten (`postgrest` 2.28.0). TM-04 er ikke
reprodusert.

**Ikke kontrollert:**

- Ingenting er prøvd mot Supabase-prosjektet. Det gjelder at hostet PostgREST
  godtar et selvsignert token med `role: koe_runtime`, at `postgres` får kjøre
  `GRANT koe_runtime TO authenticator` og `ALTER … OWNER` til de nye rollene
  (laget ble lagt på som lokal superbruker), og hva `supautils` stopper.
- Hvilken PostgREST-versjon prosjektet kjører, og om den kjører `40001` om igjen
  på samme måte.
- Supavisor, både i transaksjons- og sesjonsmodus.
- Ytelse: policyfunksjoner per spørring, indeks på medlemskapsoppslaget.
- `pgaudit`, break-glass, drift- og policyrollene. De er beskrevet, ikke bygget.
- Tabellene som ikke er med i prototypen: `sak_relations`, BIM-tabellene,
  `projects`, `catenda_*`, `app_sessions`, `app_oauth_attempts`. Også
  `koe_register_project` og `koe_set_contract_teams`.
- Utkast og godkjenningspakker, som ennå bare finnes i SQLite.
- Samtidighet, avbrudd før og etter commit, og tapte svar (F2).
- At en triggerfunksjon `service_role` får kjøre, kan misbrukes med
  `TRIGGER`-rettigheten (TM-07). Bare lest ut av rettighetene.

Ingen produksjonskode, migrasjon eller database er endret.
