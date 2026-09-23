# Design v2: tilgangsmekanisme i datalaget (grunnlag for B-02)

**Dato:** 2026-09-23. **Utgangspunkt:** commit `0125b1a` (`main`, etter PR #37
og #38), gren `b02-designrevisjon`.
**Forrige ledd:** [designet v1](design-b02-tilgangsmekanisme-2026-09-22.md) og
[det uavhengige reviewet](review-b02-tilgangsmekanisme-2026-09-23.md) (RB2-01–08).
Oppdragsgivers svar står i [oppdraget](prompt-b02-tilgangsmekanisme-2026-09-22.md#2-oppdragsgivers-svar).
**Status:** revidert designgrunnlag. B-02 og B-04 er åpne. Dokumentet avgjør
ingenting. Det svarer på hvert navngitte endringskrav fra reviewet.

> **Merknad 2026-09-23: T2 er valgt.** Oppdragsgiver har valgt alternativ C og
> transport T2 (avsnitt 9, punkt 1 og 2). Anbefalingen om T1v i sammendraget og
> avsnitt 1 er dermed ikke fulgt. Forespørselsvakten og porten mot hostet
> PostgREST bortfaller, og TM-09 og TM-10 gjelder ikke en backend uten
> PostgREST. Premisset i hovedplanens 3.1 er endret; se
> [merknaden der](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger).
> Punkt 3–6 i avsnitt 9 er åpne. Det som står om T2 i avsnitt 7, gjelder
> fortsatt: Supavisor er ikke prøvd, og tidsgrensene er satt, men ikke
> observert som atferd. Foreløpig målplattform er Azure PostgreSQL. Der er
> Supavisor ikke aktuelt, men poolingen fra F0b må prøves på samme måte.

## Sammendrag

Anbefalingen er fortsatt alternativ C, med endringene reviewet krevde:

- **Transport (RB2-01):** tre varianter er sammenliknet og to er prøvd.
  PostgREST med **forespørselsvakt** (T1v) slipper bare `koe_runtime` inn i
  Data API, og bare med token som utløper innen 60 s. Direkte innlogging (T2)
  bruker en rolle som ikke kan bli `service_role`. Anbefalingen er T1v, med en
  port: to egenskaper må bekreftes mot det hostede prosjektet før første
  F1-migrasjon. Ellers T2.
- **Integritet (RB2-02):** skrivevakten er generalisert til en operasjonsmodell
  per tabell og kolonne: hvem som får legge til, hvem som får endre, og hvilke
  kolonner som aldri endres. Den gjelder journalen, saksregisteret og køen.
  Sammensatte fremmednøkler binder sak, hendelse, notat og kø til samme
  prosjekt. `service_role` har mistet `TRUNCATE`, `TRIGGER` og `REFERENCES`, og
  `PUBLIC` har mistet `TEMPORARY`.
- **Private skrivestier (RB2-03):** runtime har ingen direkte skriverett, heller
  ikke på notater. Notater skrives og slettes gjennom kommandoer. Serveren lager
  ID-en, og alle avvisninger ser like ut.
- **Kontekst og argumenter (RB2-04):** bare JSON-strenger teller som krav.
  UUID-er normaliseres. Privat innsyn krever gyldig side og et team som er et av
  prosjektets kontraktsteam på den siden. Ugyldige argumenter avvises med
  `22023`.
- **Identitet (RB2-05):** smale innganger med låst issuer og provider og
  subjekt i `catenda_id()`-form. Runtime får ikke kalle de generiske
  funksjonene. Synkroniseringen er skrevet ned som betrodd myndighet.
- **Bevis (RB2-06, RB2-08):** prototypen bygges nå slik Supabase gjør:
  `supabase_admin` er eneste superbruker, og `postgres` er ikke superbruker og
  kjører stubben, alle 23 migrasjonene og laget, med midlertidige rettigheter
  for eierskiftet. **155 av 155 sjekker holdt. Tolv mutasjoner ga hver mellom 1
  og 22 røde sjekker** (K 23.09).

Tre spørsmål er fortsatt oppdragsgivers: transporten (premisset i 3.1), hva
«ikke omgå godkjenning» skal bety ved overtatt runtime, og tidskontrakten i B-04
(avsnitt 9).

## Nye funn

| ID | Alvorlighet | Funn | Belegg |
| --- | --- | --- | --- |
| TM-09 | Middels | I vanlig PostgreSQL 17 kan `postgres` uten superbrukerrettigheter ikke sette `pgrst.db_pre_request` på `authenticator`. Det krever `GRANT SET ON PARAMETER` fra en superbruker | K 23.09 lokalt. Supabase dokumenterer operasjonen for `postgres`; hvordan plattformen tillater den, er ikke kontrollert |
| TM-10 | Middels | Med forespørselsvakten slutter `SUPABASE_SECRET_KEY` å virke mot Data API. Dagens backend bruker bare den nøkkelen. Vakten kan derfor ikke slås på før backend bruker `koe_runtime`-token | L, K for vakten |
| TM-11 | Lav | `sak_id` er global primærnøkkel. En opprettelse med valgt ID kan avsløre at en sak finnes i et annet prosjekt | L. Ikke kontrollert om backend lager sak-ID-en selv |
| TM-12 | Middels | `catenda_contract_teams` blir sikkerhetsbærende når basen kontrollerer teamet mot den. Den som skriver tabellen (`koe_register_project`, `koe_set_contract_teams`), bestemmer hvilke team som gir privat innsyn | L, D 22.09 |

## 1. RB2-01 — transport og signeringsmyndighet

| Variant | Hva runtime har | Kan runtime bli `service_role`? | Status |
| --- | --- | --- | --- |
| T1: PostgREST, eget token, ingen vakt | Signeringsnøkkel | Ja, i Data API (TM-01) | Avvist som alene |
| **T1v: PostgREST med forespørselsvakt** | Signeringsnøkkel | Tokenet kan signeres, men vakten avviser alle roller unntatt `koe_runtime` før kallet (K). Andre Supabase-produkter enn Data API er ikke vernet av vakten | Anbefalt, med port |
| T2: direkte innlogging | Passord til `koe_runtime_login` | Nei. Rollen er bare medlem av `koe_runtime` og kan ikke `SET ROLE` til `service_role`, `authenticator`, `koe_kommando` eller `postgres` (K) | Prøvd, fullverdig alternativ |

**Vakten** (`koe_vakt.foresporsel`, satt som `pgrst.db_pre_request` på
`authenticator`) avviser en annen rolle enn `koe_runtime`. Den avviser også et
token uten `exp`, eller med `exp` mer enn 60 s fram. Prøvd over ekte PostgREST:

- `service_role`, `authenticated` og anonym forespørsel ble avvist.
- Token uten `exp` og token med 61 s og ett døgns levetid ble avvist.
- Et gyldig runtime-token ble sluppet inn (K).

Mutasjonen uten vakt gjør fem sjekker røde. `authenticated` avvises da
fortsatt, fordi rollen ikke har rettigheter.

**Hvorfor T1v:** den beholder premisset i 3.1 (RPC over PostgREST) og dagens
klientbibliotek. Mot integritetstruslene står den ikke alene: skrivevakten og
rettighetene holder også når kalleren er `service_role` (avsnitt 2). Vakten er
et ytterligere lag, ikke det eneste.

T2 er sterkere på ett punkt: runtime har ingen nøkkel som kan velge rolle. Det
spiller en rolle for det vakten ikke dekker, som Realtime og Storage. Mot
integriteten i `public` gir det ingen forskjell så lenge skrivevakten står.
Kostnaden er en databasedriver og pooling i Flask og omskriving av de ni
repositoriene. Supavisor er ikke prøvd.

**Porten før første F1-migrasjon** (ikke prøvd, krever det hostede prosjektet):

1. Hostet PostgREST godtar et token backend selv har signert, med
   `role: koe_runtime`.
2. `postgres` får sette `pgrst.db_pre_request` på `authenticator` (TM-09), og
   vakten avviser et `service_role`-token mot det hostede Data API-et.

Feiler ett av punktene, er T2 veien, og 3.1 må endres.

**Rekkefølge (TM-10):** backend går over til `koe_runtime`-token før vakten slås
på. Drift bruker en personlig direkte innlogging, ikke `SUPABASE_SECRET_KEY`
mot Data API.

## 2. RB2-02 — operasjonsmodell for integritetsbærende data

Skrivevakten er én triggerfunksjon med tre argumenter: roller som får legge til,
roller som får endre, og kolonner som aldri endres. `DELETE` og `TRUNCATE`
avvises alltid. Vakten avgjør på `current_user`, som inne i en
`SECURITY DEFINER`-kommando er eieren.

| Tabell | Legge til | Endre | Aldri endres | Skranker | Prototype |
| --- | --- | --- | --- | --- | --- |
| `hendelse` | `koe_kommando` | Ingen | Alt | `(sak_id, prosjekt_id)` → `sak_metadata` | Ja |
| `sak_metadata` | `koe_kommando` | `koe_kommando` (projeksjon) | `sak_id`, `prosjekt_id`, `sakstype`, `created_at`, `created_by` | Unik `(sak_id, prosjekt_id)` | Ja |
| `utgaende_levering` | `koe_kommando` | `koe_kommando`, `koe_worker` | `id`, `prosjekt_id`, `event_id` | `(event_id, prosjekt_id)` → `hendelse` | Ja |
| `notat` | Kommando (`skriv_notat`) | Ingen | — | `(sak_id, prosjekt_id)` → `sak_metadata` | Ja, uten vakt: slettbart (MS-05) |
| Godkjenningspakke | `koe_kommando` | Tillatte statusoverganger, én kommando per overgang | Innhold, mål, policyversjon | Pakke → sak og policyversjon i samme prosjekt | Nei |
| Policyversjon, fullmakt | `koe_policy` (drift) | Ingen. Ny versjon i stedet | Alt | Versjon → prosjekt | Nei |
| Utkast | Kommando | Kommando, med revisjonskontroll (invariant 5) | Prosjekt, sak, team | Utkast → sak i samme prosjekt | Nei |

For de fire tabellene som ikke finnes ennå, beskriver raden målet. Tillatte
statusoverganger for pakker hører til F2-kommandoen og må få egne tester der.

**Prøvd som `service_role` (K):** alle disse ble avvist med `42501`:

- `UPDATE`, `DELETE`, `TRUNCATE`, `INSERT`, `MERGE`, `ON CONFLICT` og `COPY` på
  journalen;
- å flytte en sak til et annet prosjekt, å endre projeksjonen og å slette en sak;
- å endre prosjektet i køen, å legge en notat-ID i køen og å slette fra køen;
- `TRUNCATE … CASCADE`, å montere en triggerfunksjon og å lage en midlertidig
  tabell;
- `DISABLE TRIGGER`, `session_replication_role`, `SET ROLE koe_kommando` og
  `GRANT koe_kommando`.

En kontroll viser at `service_role` fortsatt kan endre `notat`. Rettighetene
finnes altså, og det er vakten og tilbakekallene som stanser den.

Mutasjonene viser at skrankene er et andre lag. Uten attribusjonsvernet avvises
flyttingen av saken fortsatt, men av fremmednøkkelen (`23503`). Uten køvernet
avvises en notat-ID i køen av fremmednøkkelen til `hendelse`.

**Eierskap, presisert:** «ingen rolle kan bli kommandoeieren» gjelder ikke
administratoren. En rolle med `CREATEROLE` får `ADMIN` på rollene den oppretter,
og kan gi seg selv `SET` (reviewet, K). Laget gjør akkurat det for eierskiftet,
og tar `SET` tilbake etterpå. Prototypen kontrollerer at `postgres` ikke har
`SET` på funksjonseierne når laget er ferdig (K). `postgres` kan likevel gi seg
selv rettigheten igjen. Det er databaseadministratoren, som er godtatt
restrisiko.

## 3. RB2-03 — private skrivestier

- **Ingen direkte skriving.** Runtime har bare `SELECT`. `INSERT` og `DELETE` på
  `notat` avvises (K).
- **`koe_api.skriv_notat(sak, tekst)`:** kommandoen lager ID-en, kontrollerer at
  saken hører til prosjektet før skranken kan slå til, og stempler aktør, side,
  team og prosjekt fra konteksten (K). Sak i B, ukjent sak og ukjent team gir
  samme `42501 ukjent sak` (K). Unik- og fremmednøkkelfeil kan dermed ikke nås
  fra runtime.
- **`koe_api.slett_notat(id)`:** gir `false` både for andres notat, et ukjent
  notat og et notat i et annet prosjekt, og sletter ingenting av dem (K).
- **Igjen:** tidsbaserte sidekanaler er ikke målt. `opprett_sak` tar ID-en som
  argument (TM-11). Anbefalingen er at kommandoen lager sak-ID-en selv.

## 4. RB2-04 — kontekstkontrakten

| Tilgang | Krav som må finnes og være gyldige | Kontrollert i basen |
| --- | --- | --- |
| Offentlig lesing (journal, saker) | `koe_aktor`, `koe_prosjekt` | Aktivt medlemskap |
| Privat lesing (notater, utkast) | Som over, pluss `koe_side` og `koe_team` | Handlingsrett (ikke leserolle), og teamet er et kontraktsteam for prosjektet på den siden |
| Skriving | Som privat lesing. For varsel er teamet valgfritt | Som over, pluss argumentene |
| Systemkall (innlogging, webhook, synk) | Ingen `koe_*`-krav | Bare identitetsinngangene er tilgjengelige |
| Alle, over Data API | `role: koe_runtime`, `exp` høyst 60 s fram | Forespørselsvakten (T1v) |

**Tolkning:** bare en JSON-streng er et krav. Et objekt, en liste eller en tom
streng regnes som fravær (K). Aktøren normaliseres til `uuid`, så store bokstaver
gir samme bruker (K). Teamet må ha `catenda_id()`-formen, 32 små heksadesimale
tegn. Andre former gir null (K). Ekstra krav ignoreres.

**Argumenter:** `NULL` eller negativ versjon, `NULL` type, data som ikke er et
JSON-objekt, tomt notat og `NULL` sak avvises med `22023` før noe annet skjer (K).

**Team (TM-03, innsnevret):** basen kan ikke vite om brukeren sitter i teamet.
Den kan kreve at teamet er et av prosjektets kontraktsteam, på den oppgitte
siden. Et tilfeldig team, et team fra et annet prosjekt og et TE-team oppgitt
med side BH gir null innsyn og avvist skriving (K). At brukeren faktisk hører
til teamet, tas fortsatt på tillit fra runtime, som henter det fra Catenda.

## 5. RB2-05 — identitet som myndighetsgrense

- **`koe_api.catenda_identitet(subjekt, e-post, navn)`:** provider og issuer er
  låst i funksjonen, og funksjonen har ingen parameter for dem (K). Store
  bokstaver, bindestreker og andre former enn `catenda_id()` avvises (K).
- **`koe_api.synkroniser_medlemmer(...)`:** avviser et øyeblikksbilde med et
  subjekt som ikke er normalisert (K), og kaller dagens
  `koe_reconcile_memberships`.
- **De generiske funksjonene** står urørt og kan bare kalles av `koe_identitet`.
  Runtime får ikke kalle dem, heller ikke over PostgREST, og leser ingen
  identitetstabell (K).
- **Betrodd myndighet:** den som leverer øyeblikksbildet, bestemmer
  medlemskapene. Det er runtime, fordi runtime henter det fra Catenda. En
  overtatt runtime kan gi en ny identitet handlingsrett. Reviewet viste det, og
  v2 endrer det ikke.
- **Samme gjelder for kontraktsteamene (TM-12).** Forslaget er at
  `koe_register_project` og `koe_set_contract_teams` bare kan kalles av drift.
  Da kan runtime ikke gjøre et nytt team gyldig for privat innsyn.
- **Godkjenning og fullmakt** får en egen eier (`koe_policy`, avsnitt 2) med
  `EXECUTE` bare for drift. Synkroniseringen kan ikke endre policy.

**Må avklares av oppdragsgiver:** en overtatt runtime kan opptre som en hvilken
som helst bruker. Mekanismen kan garantere at en EO bare utstedes gjennom
kommandoen, og at kommandoens regler holder: pakke, policyversjon, fullmakt og
siden. Den kan ikke garantere at en ekte person trykket «godkjenn». Oppdragsgiver
velger mellom:

- **(a)** «ikke omgå godkjenning» betyr den strukturelle garantien. Det er det
  B-02 kan levere.
- **(b)** Det kreves bevis på menneskelig godkjenning, for eksempel en signatur
  fra brukerens egen innlogging som basen kan kontrollere uten runtime. Det er
  et eget design utenfor B-02.

## 6. RB2-06 — hva beviset nå dekker

[`vedlegg/b02-prototype-v2-2026-09-23/`](vedlegg/b02-prototype-v2-2026-09-23/kjor.sh)
bygger basen slik Supabase gjør. `00_klynge.sql` oppretter rollene som
superbruker. Deretter kjører `postgres` stubben, migrasjonene, laget og
testdataene. Saker, hendelser og notater skrives gjennom kommandoene. Beviset
bruker tre veier inn: T1 emulert og over ekte PostgREST, T2, og en
tilsynsforbindelse som leser fasit og injiserer feil.

**155 av 155 sjekker holdt (K 23.09).** Endringer fra v1 etter reviewet:

- **Atomisitet:** en injisert feil i køinnsettingen etterlater ingen hendelse.
- **Konflikt:** en versjonskonflikt skriver ingenting, målt på antall rader i
  begge tabellene.
- **PID-sjekken:** krever to vellykkede kall og en PID som ikke er null.
- **Worker:** at statusen faktisk ble endret, kontrolleres i raden.
- **`hvem()`:** bare `koe_runtime` får kalle den. Den er fortsatt en testhjelper
  og skal ikke inn i migrasjonene.
- **Rettighetsmatrise** fra katalogen:
  - tabellrettigheter for `koe_runtime`, `koe_worker`, `anon`, `authenticated`,
    `authenticator` og `koe_runtime_login`;
  - `EXECUTE` for runtime og nettrollene;
  - at `service_role` ikke har `TRUNCATE`, `TRIGGER` eller `REFERENCES`;
  - hvem som eier kommandoene;
  - at ingen funksjonseier eller runtime har `CREATE`;
  - at bare de forventede innloggingsrollene finnes.
- **`FORCE`:** kontrolleres bare i katalogen. Tabellene eies av `postgres`, som
  har `BYPASSRLS`, så `FORCE` virker ikke mot eieren. Det verner bare hvis
  eierskapet flyttes til en rolle uten `BYPASSRLS`.

| Mutasjon | Holdt | Hva som ble rødt |
| --- | --- | --- |
| `uten_teamgrense.sql` | 133 | 22 sjekker: team, side, kontekst, gjenbruk, tilbakekalling |
| `uten_skrivevakt.sql` | 149 | Skrivinger, `MERGE`, `ON CONFLICT` og `COPY` som `service_role` |
| `uten_foresporselsvakt.sql` | 150 | `service_role`-token, manglende og for lang `exp`, meldingen fra vakten |
| `uten_koevern.sql` | 152 | Prosjekt og notat-ID i køen (nå `23503` fra skranken), sletting |
| `uten_medlemskap.sql` | 152 | Falsk prosjekt, bare prosjekt, tilbakekalling |
| `uten_argumentkontroll.sql` | 153 | `NULL` og negativ versjon |
| `uten_attribusjonsvern.sql` | 153 | Flytting (nå `23503`) og endret projeksjon |
| `uten_prosjektkontroll.sql` | 153 | Lik avvisning for sak i B og ukjent sak (skranken svarer `23503`) |
| `uten_teamvalidering.sql` | 153 | TE-team med side BH, notat med ukjent team |
| `trigger_tilbake.sql` | 153 | Montering av trigger, rettighetsmatrisen |
| `identitet_til_runtime.sql` | 154 | Rettighetsmatrisen |
| `temp_tilbake.sql` | 154 | Midlertidig tabell |

Loggene ligger i [`resultater-2026-09-23/`](vedlegg/b02-prototype-v2-2026-09-23/resultater-2026-09-23/bevis.log).

**Reviewets reproduksjoner i v2:**

| Reproduksjon (RB2) | v2 |
| --- | --- |
| Unik-skranken røper notat-ID fra B | Runtime når ikke skranken. `skriv_notat` lager ID-en |
| Notat kan referere sak i B | Avvist likt som ukjent sak, og av skranken |
| Ugyldig eller manglende side gir privat innsyn | Null innsyn |
| Store bokstaver i aktør-UUID gir null | Normaliseres |
| Ukjent team kan opprette notat | Avvist |
| `NULL` versjon passerer | `22023` |
| `NULL` type stoppes av `NOT NULL` | `22023` fra kommandoen |
| Token uten `exp` eller med ett døgns levetid godtas | Avvist av vakten (T1v) |
| Eksisterende triggerfunksjon kan monteres | Avvist, `TRIGGER` tatt fra `service_role` |
| Endret metadata gir samme saksstrøm to prosjekter | Avvist av skrivevakten på `sak_metadata` og av skranken |
| `service_role` kan skrive om køen | Avvist |
| Annen issuer gir annen bruker; `entra` godtas | Runtime når ikke den generiske funksjonen |
| Synk gir ny identitet handlingsrett | Uendret. Betrodd myndighet (avsnitt 5) |
| `CREATEROLE` gir `ADMIN` som kan bli `SET` | Uendret. Presisert som administratorgrense |
| Utfallene for `SET NULL`, `SET DEFAULT`, `RESTRICT` og `NO ACTION` ved sletting | Ikke kjørt på nytt. Skrivevakten på `sak_metadata` avviser nå selve slettingen |

## 7. RB2-07 — tidskontrakten

> **Merknad 2026-09-23 til tidsgrensen for T2:**
> [Kjernereviewet, RK-05](review-f0b-kjernen-2026-09-23.md#rk-05--to-tidsgrenser-er-ikke-én-transaksjonsfrist)
> har prøvd at kjernen bevarer begge innstillingene, og at de utløses. De gir
> likevel ingen øvre grense for samlet transaksjonstid: mange korte setninger
> kan holde transaksjonen og teamkonteksten levende. Raden nedenfor angir
> setnings- og inaktivitetsgrenser, ikke en verifisert transaksjonsfrist.
> En slik frist må fastsettes og prøves før F1s tidskontrakt er oppfylt.

| Hva kan være gammelt | Øvre grense | Belegg |
| --- | --- | --- |
| Tokenet (T1v) | 60 s. Vakten avviser lengre og manglende `exp` | K |
| Transaksjonen (T2) | `statement_timeout` 8 s og `idle_in_transaction_session_timeout` 10 s på `koe_runtime_login` | K for innstillingene, ikke for atferden |
| Medlemskapet i basen | Den neste setningen etter at synkroniseringen har committet, også inne i en åpen transaksjon (`READ COMMITTED`) | K |
| Medlemskapet i Catenda | Hvor ofte synkroniseringen kjører | Ikke fastsatt (B-04) |
| Teamet | Levetiden til tokenet eller transaksjonen etter Catenda-oppslaget | L |

**B-04:** reviewet har rett i at alternativene ikke er gratis. En «frist før
virkning» krever en tilstandsmodell der tilbakekallingen registreres med
tidspunkt og virkning. Policyene må lese virkningstidspunktet, ikke bare
`active`. Oppdragsgiver må velge klokken:

- da Catenda-endringen skjedde (Catenda gir ikke tidspunktet i
  øyeblikksbildet);
- da synkroniseringen oppdaget den;
- da den ble committet lokalt.

Det må også avgjøres hva som skjer når synkroniseringen ikke har kjørt på lenge.
Ventende pakker og utkast er uendret et kontraktsspørsmål.

Supavisor er fortsatt ikke prøvd. T2 regnes ikke som verifisert før det er gjort.

## 8. RB2-08 — F1-porten og testplanen

**Migrering og break-glass** er separat, tidsavgrenset og logget. Forslaget er
dette:

- **Migrering:** bare `supabase db push` fra CI eller fra en navngitt person.
  Eierskifter bruker midlertidig `SET` og `CREATE`, som tas tilbake i samme
  migrasjon. Det er prøvd som `postgres` uten superbrukerrettigheter (K).
- **Break-glass:** en egen innloggingsrolle for én hendelse. Den gis bare de
  rettighetene hendelsen krever. Til slutt får den `NOLOGIN`, åpne sesjoner
  avsluttes med `pg_terminate_backend`, og rollen slettes. `VALID UNTIL` gjelder
  bare passordet og er ikke nok alene.
- **Logging:** `pgaudit` opprettes (D 22.09: forhåndslastet, ikke opprettet),
  med `pgaudit.log` for roller og DDL på `postgres` og break-glass-rollen.

| F1-leveranse | Kontroll | Status |
| --- | --- | --- |
| Roller og rettigheter | Rettighetsmatrisen, som katalogtest i CI | Prototype (K) |
| Migrering og break-glass | Katalogtest: ingen uventet innloggingsrolle; `pgaudit` finnes og er konfigurert. Øvelse med logg | Innloggingsrollene (K), resten ikke |
| Private lagre i PostgreSQL | Samme negative tester som `notat` for utkast og pakker | Tabellene finnes ikke |
| Teamvern før aggregering, eksport og PDF | Test av leselaget med to team og motpart | Ikke startet |
| Append-only (MS-02) | Skrivevakten og mutasjonene | Prototype (K) |
| `viewer` (DB-05) | Leser journal, ikke notater, sender ikke | Prototype (K) |
| Tilgangslogg (OBS-01/02) | Test av at sensitive lesinger og endringer i tilgang logges | Ikke startet |
| Tilbakekalling (B-04) | Etter beslutningen | Mekanismen (K) |
| Hemmeligheter og rotasjon | Rotasjon av signeringsnøkkel eller passord uten nedetid | Ikke startet |

**CI og TS2-02** (reviewets punkter, tatt inn):

- Den lesende katalogfixturen beholdes. Rettighetstestene får en egen base per
  testgruppe, fordi HTTP-kall går på andre forbindelser enn pytest og ikke kan
  rulles tilbake.
- PostgREST startes etter at basen er bygget, med fast versjon.
- Roller er felles for klyngen, så én klynge per CI-jobb.
- Plattformstubben bør kjøres som i v2: roller opprettet av superbrukeren, og
  alt annet av `postgres` uten superbrukerrettigheter. Ellers blir funn som
  TM-09 og eierskiftereglene aldri prøvd i CI.

## 9. Hva oppdragsgiver må avgjøre

1. **B-02:** alternativ C med operasjonsmodellen i avsnitt 2.
2. **Transport:** T1v med porten i avsnitt 1, eller T2. Velges T2, eller feiler
   porten, må premisset i 3.1 endres.
3. **Godkjenning ved overtatt runtime:** (a) strukturell garanti eller (b) bevis
   på menneskelig godkjenning (avsnitt 5).
4. **Kontraktsteam og prosjektregistrering:** bare drift, eller runtime med
   godtatt restrisiko (TM-12).
5. **B-04:** klokken og hva som skjer når synkroniseringen er gammel (avsnitt 7).
6. **Break-glass:** prosedyren i avsnitt 8, eller en annen.

## Verifikasjon og grenser

**Kjørt og observert (K 23.09):**

- PostgreSQL 17.11 (Homebrew, macOS, `trust`) og PostgREST 12.2.12 (`cd3cf9e`)
  med `db-pool = 1`.
- Klyngen er satt opp som i Supabase: `supabase_admin` er eneste superbruker, og
  `postgres` er `NOSUPERUSER CREATEROLE BYPASSRLS` med `ADMIN` på
  plattformrollene.
- Alle 23 migrasjonene, laget og testdataene er kjørt som `postgres`.
- 155 av 155 sjekker holdt. Tolv mutasjoner ga røde sjekker som i tabellen.
- TM-09 er observert som `permission denied to set parameter`.

**Lest i dokumentasjon:** Supabases forespørselsvakt (via reviewet), og
PostgreSQL 17 om `CREATEROLE` og `ALTER … OWNER` (via reviewet).

**Lest ut av koden (L):** at backend bare bruker `SUPABASE_SECRET_KEY` (TM-10),
`catenda_id()` og at team hentes fra Catenda.

**Ikke kontrollert:**

- Ingenting er prøvd mot det hostede prosjektet. Det gjelder begge punktene i
  porten, hvordan `supautils` behandler rollene, og om `REVOKE TEMPORARY … FROM
  PUBLIC` bryter noe i plattformen.
- Supavisor, og tidsgrensene på T2 som atferd.
- Realtime og Storage med et `service_role`-token.
- Tidsbaserte sidekanaler, og om backend lager `sak_id` selv (TM-11).
- Godkjenningspakker, policy, fullmakt og utkast. De er beskrevet, ikke bygget.
- `pgaudit`, break-glass-øvelsen, rotasjon og tilgangslogg.
- Om `koe_register_project` og `koe_set_contract_teams` kalles fra andre steder
  enn backend.
- Ytelse.

Ingen produksjonskode, migrasjon eller database er endret. Katalogen i
prosjektet er ikke lest på nytt for v2. D-påstandene er fra 22. og 23.09.
