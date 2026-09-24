# Gjennomføring: kjernen i datalaget over direkte tilkobling (F0b, punkt 1)

**Dato:** 2026-09-23. **Utgangspunkt:** commit `56f3ad8`, gren
`fase0-beslutning-direkte-postgresql` (PR #41, ikke merget da arbeidet startet).
Gren for dette arbeidet: `f0b-kjernen-direkte-postgresql`, bygget oppå #41.
**Oppdrag:** [kjernen i F0b](prompt-f0b-kjernen-2026-09-23.md).
**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#f0b--datalaget-over-direkte-tilkobling),
beslutningen i 3.1 (23.09), og [handoffen 23.09](handoff-2026-09-23-datalag-postgresql.md),
avsnitt 4, 5 og 7.
**Neste ledd:** [uavhengig review av kjernen](prompt-review-f0b-kjernen-2026-09-23.md),
i en annen tråd. Status for F0b endres ikke før det er levert.

Oppdraget konverterer ingen repositorier og skriver ingen migrasjoner. Det legger
transporten og kontrakten som trådene i F0b punkt 2 skal bygge på.

> **Merknad 2026-09-23 etter uavhengig review:**
> [Reviewet](review-f0b-kjernen-2026-09-23.md) konkluderer med at kjernen kan
> bygges videre på med navngitte endringer (RK-01–RK-05). De 57 testene og de
> 27 opprinnelige mutasjonene er bekreftet, men to nye mutasjoner viser at
> resetten kan miste enten rolle- eller kravkontrollen uten rød test (RK-03).
> Containeren kan opprette to pooler ved samtidig første oppslag (RK-01), og
> innkoblingen av repositoriene er ikke ferdigstilt som oppdraget krevde (RK-02).
> Påstanden i avsnitt 2 om at rå commit fanges ved utgangen må avgrenses:
> `COMMIT; BEGIN` passerer sluttkontrollen med innloggingsrolle og tom kontekst
> (RK-04). Grensene omtalt i avsnitt 3 begrenser hver setning og inaktivitet,
> ikke samlet transaksjonslevetid (RK-05). Kombinasjonsforsøket MC01 viser
> sesjonsrester uten reset, men neste `transaksjon(Kontekst())` setter tom
> kontekst på nytt; avsnitt 6 skal ikke leses som belegg for arvet kontekst
> inne i neste hjelperblokk. M17 gir feil permanent underklasse, ikke
> forbigående feil, og M08 setter en feil verdi framfor å utelate settingen.
> Disse presiseringene erstatter de sterkere formuleringene nedenfor.

> **Merknad 2026-09-23 etter oppfølgingen av reviewet:** RK-01–RK-04 er fulgt
> opp i samme PR, og RK-05 står åpen før F1. Se [avsnitt 7](#7-oppfølging-av-reviewet).
> Avsnitt 4 er skrevet om til den ferdige innkoblingen, og punktet om rå
> `COMMIT` i avsnitt 2 er avgrenset. Tallene under «Verifikasjon og grenser»
> gjelder etter oppfølgingen. M08 og M17 har fått navn som beskriver hva de gjør.

> **Merknad 2026-09-24 etter verifikasjonen i [PR #47](https://github.com/khjohns/endringsmeldinger/pull/47):**
> De to restansene under RK-02 er rettet, og tekstvakten under RK-04 er lagt
> til. Avsnitt 4 beskriver nå containereierskap og prioriteten til
> `DATALAG=postgres`. Se avsnitt 8 og de daterte resultatene under
> «Verifikasjon og grenser». Ingen lagre er konvertert; RK-05 står fortsatt
> åpen før F1.

## 1. Hva som er levert

| Fil | Innhold |
| --- | --- |
| [`backend/lib/db/database.py`](../backend/lib/db/database.py) | `Kontekst`, `Database.transaksjon(kontekst)`, `Database.utfor(kontekst, arbeid)`, `opprett_database(innstillinger)` og poolens reset |
| [`backend/lib/db/feil.py`](../backend/lib/db/feil.py) | Feilhierarkiet, felles for Supabase-lagrene og direkte tilkobling, og `klassifiser()` for driverens feil |
| [`backend/lib/supabase/exceptions.py`](../backend/lib/supabase/exceptions.py) | Klassene er nå importert fra `lib/db/feil.py`. `classify_error` for supabase-py er uendret |
| [`backend/repositories/event_repository.py`](../backend/repositories/event_repository.py) | `ConcurrencyError` er flyttet til `lib/db/feil.py` og importeres herfra, så eksisterende importer virker |
| [`backend/core/config.py`](../backend/core/config.py) | `database_url` (`SecretStr`, ingen standardverdi), poolstørrelse, tidsgrenser og retry |
| [`backend/core/container.py`](../backend/core/container.py) | `container.database`, opprettet ved første bruk. `reset()` lukker poolen |
| [`backend/requirements.txt`](../backend/requirements.txt) | `psycopg[binary]==3.3.6` flyttet hit fra dev, og `psycopg-pool==3.3.3` |
| [`backend/tests/test_database/conftest.py`](../backend/tests/test_database/conftest.py) | Den lesende fixturen `testbase` er uendret. Nye: `testbase_url`, `skrivbar_base`, `container_mot_testbasen` og `testinnstillinger()` |
| [`backend/tests/test_database/test_kjerne.py`](../backend/tests/test_database/test_kjerne.py) · [`test_skrivbar_fixture.py`](../backend/tests/test_database/test_skrivbar_fixture.py) | Testene i avsnitt 6 |
| [`scripts/testbase/lokal_testbase.sh`](../scripts/testbase/lokal_testbase.sh) | Lokal oppstart: en kastbar PostgreSQL 17 med testbasen bygget |
| [`scripts/testbase/bygg_testbase.sh`](../scripts/testbase/bygg_testbase.sh) | Setter til slutt merket `koe-kastbar-testbase` som kommentar på basen |
| [`vedlegg/f0b-kjernen-2026-09-23/mutasjoner.py`](vedlegg/f0b-kjernen-2026-09-23/mutasjoner.py) | 27 mutasjoner med oppskrift |

## 2. Kontrakten slik den ble

### Kontekst

- `transaksjon(kontekst)` henter en forbindelse fra poolen, åpner en eksplisitt
  transaksjon med `conn.transaction()`, setter isolasjonsnivået og så konteksten,
  og gir forbindelsen til blokken. Normal utgang gir commit. Et unntak gir
  rollback.
- Rollen settes med `SET LOCAL ROLE`, og med `SET LOCAL ROLE NONE` når
  `Kontekst.rolle` er `None`. Kravene settes med
  `set_config('koe.krav', <json>, true)`. Begge gjelder bare transaksjonen.
- **Konteksten settes alltid, også når den er tom.** Tom kontekst er `''`. En
  forbindelse med rester av en annens sesjon (se PgBouncer i avsnitt 7) får
  dermed innloggingsrollen og tom kontekst i transaksjonen.
- `_sett_kontekst` avviser en forbindelse som ikke er i en åpen transaksjon
  (`RuntimeError`). Det finnes ingen offentlig vei som setter kontekst uten
  transaksjon, og den private kan ikke brukes slik heller.
- `conn.commit()` og `conn.rollback()` i blokken avvises av psycopg innenfor
  `conn.transaction()` (blir `PermanentError`). En rå `COMMIT` alene, eller en
  feil i basen som blokken svelger, fanges ved utgangen: `RuntimeError`, og
  ingen `COMMIT` sendes. **Sluttkontrollen er ikke et vern mot all tidlig
  commit.** Den ser bare transaksjonsstatusen: `COMMIT; BEGIN` i blokken
  passerer den, med det som ble skrevet før committet og resten uten rolle og
  krav (RK-04). Det er kallerens ansvar ikke å styre transaksjonen selv
  (avsnitt 7).
- Transaksjoner kan ikke nøstes i samme tråd (`RuntimeError`). En nøstet
  transaksjon ville vært en annen forbindelse og en annen transaksjon. Det bryter
  invariant 3 i 2.3 og gir vranglås mot en full pool.
- **Poolens reset er et andre lag.** Når forbindelsen leveres tilbake, kontrolleres
  det at `current_user = session_user` og at `koe.krav` er tom. Er noe satt på
  sesjonsnivå (for eksempel en `SET ROLE` uten `LOCAL` i et repositorium),
  kastes forbindelsen, og det logges som feil. Resetten setter ingenting
  tilbake. Den kaster bare forbindelsen, så den kan ikke skjule at det første
  laget har sviktet (se test 1 og M01, M02 og M06).
- **`''` og `NULL` er begge fravær.** En variabel som har vært satt, er `''`
  etter commit (kjørt, test 1). Kjernen leser aldri kravene. Tolkningen hører
  hjemme i basen, som i v2: `nullif(current_setting('koe.krav', true), '')`.

**Variabelnavnet er `koe.krav`, ikke `request.jwt.claims` som i prototypen.**
Nøklene inne i JSON-objektet er de samme som i v2, avsnitt 4: `koe_aktor`,
`koe_prosjekt`, `koe_side` og `koe_team`. Tolkningsreglene gjelder uendret.
F1-funksjonene tilsvarende `koe_privat.krav()` må bare lese et annet navn. Tre
grunner:

1. Med T2 finnes det ikke noe JWT. Navnet ville påstått en kilde som ikke finnes.
2. PostgREST setter `request.jwt.claims` fra tokenet ved hvert kall. Ligger basen
   hos Supabase med Data API på (B-12), ville en policy som leser det navnet,
   også lest krav fra en Data API-forespørsel. PostgREST setter ikke `koe.*`.
3. Plattformstubbens `auth.role()` leser `request.jwt.claims ->> 'role'`. Et eget
   navn holder kjernen unna policyene som fortsatt bruker `auth.role()`.

`role` og `exp` fra prototypens krav er utelatt. Rollen settes med `SET LOCAL
ROLE`, og `exp` hørte til T1v. Levetiden for en autorisasjon begrenses av
tidsgrensene på innloggingsrollen (v2, avsnitt 7).

### Retry

Retry gjelder hele transaksjonen og skjer bare i `Database.utfor(kontekst, arbeid)`.
`transaksjon()` prøver aldri noe på nytt.

| Tilfelle | Hva skjer | Hva kalleren får |
| --- | --- | --- |
| `40001` eller `40P01` | `arbeid` kjøres på nytt i en ny transaksjon, opptil `database_retry_max_forsok` ganger, med eksponentiell pause | Resultatet, eller `SerialiseringsFeil` (en `TransientError`) etter siste forsøk |
| Versjonskonflikt, SQLSTATE `KO409` | Ingen ny kjøring | `ConcurrencyError`. `expected` og `actual` hentes fra `DETAIL` om den er JSON `{"forventet": n, "faktisk": m}`, ellers `None` |
| Forbindelsen brytes under `COMMIT` | Ingen ny kjøring | `UkjentUtfall`: verken `TransientError` eller `PermanentError`. Skrivingen kan være committet. Kalleren må lese tilstanden før et nytt forsøk, eller sende samme kommando-ID når F2 gir idempotens (invariant 4) |
| Forbindelsen brytes før `COMMIT` | Ingen ny kjøring | `TransientError`. Basen har rullet tilbake |
| Andre forbigående feil (`57014`, `08xxx`, `53xxx`, poolen tom) | Ingen ny kjøring | `TransientError` |

**Hvorfor bare serialisering:** der vet vi at ingenting er committet, og at et
nytt forsøk er det basen ber om. Tidsavbrudd og overbelastning blir ikke bedre av
at kjernen gjentar dem automatisk. Da avgjør kalleren.

**`arbeid` må være fri for virkninger utenfor basen**, for eksempel kall til
Catenda, fordi funksjonen kan kjøres flere ganger.

**`KO409` framfor prototypens `PT409`:** `PT` er PostgREST sitt navnerom for
HTTP-statuskoder, og backend bruker ikke PostgREST lenger. Klassen `KO` er
ledig for implementasjonen (PostgreSQL reserverer klassene som begynner på
`0`–`4` og `A`–`H`). F1-kommandoene skal bruke `KO409`, med `DETAIL` som over.

**Regel for fase 2: et repositorium som bruker `utfor`, skal ikke ha
`@with_retry()`.** Da ville en `SerialiseringsFeil` fra `utfor` blitt prøvd på
nytt av dekoratøren også, altså retry nestet i retry (3 × 3 forsøk). `UkjentUtfall`
og alle `PermanentError` slipper uansett gjennom dekoratøren uten ny kjøring
(lest ut av `lib/supabase/retry.py`). For `DatabaseIkkeKonfigurert` er det kjørt
(`test_manglende_database_url_proves_ikke_paa_nytt`).

### Feilklassifisering

`klassifiser()` gjelder bare `psycopg.Error`. Andre unntak fra blokken, som
`ValueError` eller `JournalfoeringAvvist`, går gjennom uendret.

| SQLSTATE | Klasse | Arver |
| --- | --- | --- |
| `40001`, `40P01` | `SerialiseringsFeil` | `TransientError` |
| `KO409` | `ConcurrencyError` | `ConflictError` → `PermanentError` |
| `23505`, `23P01` | `ConflictError` | `PermanentError` |
| Øvrige `22xxx` og `23xxx` | `ValidationError` | `PermanentError` |
| `42501` | `TilgangAvvist` | `AuthenticationError` → `PermanentError` |
| `08xxx`, `53xxx`, `57014`, `57P01`–`57P03`, `25P03` | `TransientError` | |
| Ingen SQLSTATE: `OperationalError`, `InterfaceError`, `PoolTimeout` | `TransientError` | |
| Ingen SQLSTATE, andre driverfeil (for eksempel `ProgrammingError`) | `PermanentError` | |
| **Enhver annen SQLSTATE** | `PermanentError` | |

**Et ukjent svar fra basen er permanent, ikke forbigående som i `classify_error`.**
Har basen svart med en SQLSTATE, har den behandlet setningen og avvist den.
Klassene der et nytt forsøk kan hjelpe, er kjente og står over. Resten er
syntaksfeil, manglende objekter, ugyldig tilstand og avvisninger fra
kommandoer (`P0001`). Å gjenta dem gir samme svar og skjuler feilen bak tre
forsøk. Uten SQLSTATE vet vi ikke om basen svarte, og da er det forbindelsen
det gjelder: forbigående.

`DatabaseIkkeKonfigurert` er også en `PermanentError`. Den arvet først
`RuntimeError`, men `classify_error` regner et ukjent unntak som forbigående, så
under `@with_retry()` ville konfigurasjonsfeilen blitt prøvd på nytt og kommet
ut som `TransientError`. Samme felle som `AGENTS.md` beskriver for lagrene.

**Hierarkiet er felles.** `lib/supabase/exceptions.py` importerer klassene fra
`lib/db/feil.py`. `SupabaseError` er et annet navn for `DatalagFeil`. Dermed er
`PermanentError`, `ConflictError` og `ConcurrencyError` samme klasser uansett
hvilket lager som kaster dem, og `JournalfoeringAvvist` arver fortsatt
`PermanentError` og `ValueError`. Når TS2-02 fjerner `lib/supabase`, blir
`lib/db/feil.py` stående alene.

### Hemmeligheter

- `database_url` er `SecretStr` med `repr=False`. Den vises ikke i `repr(settings)`.
- En `DATABASE_URL` som ikke kan tolkes, gir `DatabaseIkkeKonfigurert` uten
  originalmeldingen (`from None`). libpq gjengir ellers hele strengen, med
  passordet, i meldingen `missing "=" after ...`.
- Klassifiserte feil gjengir ikke meldingsteksten fra basen, fordi den kan
  inneholde verdier (`Key (id)=(...)`, `invalid input syntax for type uuid: "..."`).
  Meldingen er SQLSTATE og navnet på skranke, tabell og kolonne. Originalen
  ligger i `.original` for den som leter bevisst, og årsakskjeden er undertrykt,
  så `logger.exception` skriver den ikke ut.
- Feilmeldingene fra libpq ved tilkobling inneholder vert, port og bruker, ikke
  passord. Det er kjørt for «connection refused» (test 6). Andre
  tilkoblingsfeil er ikke prøvd.

### Miljøvalg

Uten `DATABASE_URL`, eller med en tom eller blank verdi, kaster
`opprett_database` `DatabaseIkkeKonfigurert` før noen tilkobling forsøkes. Det
gjelder også `container.database`. Blankt behandles som fravær med vilje: en tom
tilkoblingsstreng får libpq til å koble seg til med `PGHOST`, `PGUSER` og
resten av `PG*`-miljøet, og det ville vært en stille reserve. Appen starter
fortsatt uten `DATABASE_URL`, fordi Supabase-lagrene er kjøretidsstien til
TS2-02. Feilen kommer ved første bruk.

Søkt etter standardverdier i `backend/lib/db/`, `core/config.py`,
`core/container.py` og fixturene, i formene fra `AGENTS.md`: `x or "verdi"`,
`getattr(..., "verdi")`, `d.get("x", "verdi")`, `os.environ.get("X", "verdi")`,
defaultargument og `Field(default=...)`. `database_url` har `default=None`.
`setdefault` brukes for `connect_timeout` og `application_name`, som ikke
velger base. Testfixturene leser bare `KOE_TESTBASE_URL` og har ingen reserve.

## 3. Valg

**Driver og pool.** `psycopg` 3 (allerede i bruk i databasetestene) og
`psycopg_pool.ConnectionPool`, synkron, fordi Flask er synkron. Poolens
forbindelser går i autocommit, så all transaksjonsstyring skjer eksplisitt i
kjernen. Poolen åpnes uten å vente (`open(wait=False)`). Første
`transaksjon()` venter høyst `database_pool_timeout` på en forbindelse.

**`conn.transaction()` framfor rå `BEGIN`.** psycopg avviser da `conn.commit()`
og `conn.rollback()` inne i blokken. En blokk som får tak i forbindelsen, kan
dermed ikke committe halvveis ved et uhell. En nøstet `conn.transaction()` i
blokken blir en `SAVEPOINT`, og det er riktig.

**Fra konfigurasjonen:** `database_pool_min`, `database_pool_max`,
`database_pool_timeout`, `database_pool_max_idle`, `database_pool_max_lifetime`,
`database_connect_timeout`, `database_retry_max_forsok`,
`database_retry_backoff_base` og `database_retry_backoff_max`. Verdiene i
`Settings` er utgangspunkter som kan overstyres med miljøvariabler.

**Kjernen setter ikke `statement_timeout` eller `idle_in_transaction_session_timeout`.**
I v2, avsnitt 7, er de satt på innloggingsrollen (`ALTER ROLE ... SET`), og det
er de som begrenser hvor lenge en gammel autorisasjon kan leve. Setter kjernen
dem fra konfigurasjonen, overstyrer den basens grense, og en feil verdi (0)
fjerner den. Grensene kommer derfor med F1-rollen. Til da har forbindelsen
ingen setningsgrense utover plattformens. Det er et hull i mellomfasen, ikke en
tilstand for produksjon.

**Ingen `check` ved utlån.** `ConnectionPool.check_connection` ville sendt en
tom spørring før hvert utlån for å oppdage en død forbindelse. Uten den gir en
forbindelse som døde mens den lå i poolen, `TransientError` ved første bruk, og
poolen kaster den. Hver transaksjon får ett rundtur mindre. Det kan endres uten
å røre kontrakten.

**Før F1** kobler backend til med den rollen `DATABASE_URL` har, og
repositoriene bruker `Kontekst()`: ingen rollebytte og ingen krav. Grensesnittet
er likevel ferdig for F1, når ruta sender aktør, prosjekt, side og team videre.

## 4. Grensesnittet for fase 2

Innkoblingen er fulgt opp etter verifikasjonen av RK-02 (24.09, avsnitt 8).
En tråd som konverterer et lager, legger til
**én ny fil** og **sine egne tester**, og endrer ingenting delt.

**Bryteren.** `DATALAG=postgres` (`Settings.datalag`) får containeren til å lage
hvert lager fra tabellen `POSTGRES_LAGRE` i
[`core/container.py`](../backend/core/container.py), med `container.database` som
eneste argument. Uten bryteren er alt som før: `EVENT_STORE_BACKEND` og de andre
bryterne velger dagens lagre. Et lager som ikke er konvertert ennå, gir
`LagerIkkeKonvertert` når det brukes med bryteren på, ikke et stille bytte til
det gamle lageret.

| Tråd | Property i containeren | Fil tråden legger til | Klasse |
| --- | --- | --- | --- |
| (a) hendelse og notat | `event_repository`, `notat_repository` | `repositories/postgres/hendelse.py`, `notat.py` | `PostgresEventRepository`, `PostgresNotatRepository` |
| (b) saksmetadata, relasjoner og BIM | `metadata_repository`, `relation_repository`, `bim_link_repository` | `sak_metadata.py`, `relasjon.py`, `bim.py` | `PostgresSakMetadataRepository`, `PostgresRelationRepository`, `PostgresBimLinkRepository` |
| (c) identitet, sesjoner, medlemskap og prosjekter | `auth_repository`, `membership_repository`, `project_repository` | `identitet.py`, `medlemskap.py`, `prosjekt.py` | `PostgresAuthRepository`, `PostgresMembershipRepository`, `PostgresProjectRepository` |
| (d) Catenda-konfigurasjon | `catenda_config_repository` | `catenda_konfig.py` | `PostgresCatendaProjectConfigRepository` |

Filene ligger i `repositories/postgres/`. Pakken finnes. Klassen tar
`Database` som eneste argument og holder dagens grensesnitt for lageret den
erstatter.

**Innkobling utenfor lagerpropertyene:** `AuthService` henter
`get_container().auth_repository`. `get_endringsordre_service()` og
`get_forsering_service()` gir relasjonsoppslaget sin egen container og
injiserer resultatet. Dermed får relasjons- og hendelseslageret samme
`Database`, også hvis den globale containeren er en annen. Ved direkte
konstruksjon uten relasjonsargument brukes fortsatt den globale containeren.
Et eksplisitt `None` betyr intet relasjonslager og utløser ikke nytt oppslag.

**Catenda-valget:** `DATALAG=postgres` overstyrer
`CATENDA_PROJECT_REGISTRY_BACKEND`, også `legacy` og et eksplisitt
`backend="legacy"` i fabrikkallet. `build_project_resolver()` bruker da
`get_container().catenda_config_repository`. Mangler PostgreSQL-modulen,
kastes `ProjectResolverConfigurationError` med `LagerIkkeKonvertert` som årsak;
legacy-konfigurasjonen brukes aldri som reserve. Et eksplisitt injisert
`registry` brukes fortsatt til testing.

Med tomt `DATALAG` velger `legacy` fortsatt enkeltprosjektregisteret og
`supabase` det varige Supabase-registeret; andre registerverdier avvises.
Auth-, relasjons- og Catenda-propertyene oppretter en ny lagerinstans per
oppslag. Relasjoner er fortsatt `None` med JSON, og en konstruksjonsfeil i det
eldre Supabase-relasjonslageret gir fortsatt `None` gjennom tjenestehjelperen.
PostgreSQL-feil blir ikke svelget.

**Regler for trådene:**

1. Lesing med `database.transaksjon(Kontekst())`, skriving med
   `database.utfor(Kontekst(), ...)`. Ingen `@with_retry()` (avsnitt 2, Retry).
2. Ingen endring i `core/container.py`, `repositories/__init__.py`,
   `lib/db/` eller fixturene. De nye klassene eksporteres ikke fra
   `repositories/__init__.py`; containeren importerer dem fra sin egen modul.
3. Testene i en egen fil under `tests/test_database/`, merket `database`, med
   `skrivbar_base` for lageret direkte eller `container_mot_testbasen` for
   tjenester og ruter. Den siste setter `DATALAG=postgres`.
4. Kallerens ansvar i avsnitt 7 gjelder. Tekstvakten
   [`test_postgres_transaksjonsgrense.py`](../backend/tests/test_security/test_postgres_transaksjonsgrense.py)
   avviser `BEGIN`, `COMMIT`, `ROLLBACK`, `SET ROLE` (og `SET LOCAL/SESSION ROLE`)
   samt `set_config` i statisk SQL under `repositories/postgres/`.

**Konfliktflater som gjenstår:** ingen i de delte filene, så lenge reglene
følges. Trenger to tråder en felles SQL-hjelper (for eksempel `dict_row` eller
paginering), legges den i `lib/db/` i en egen, liten PR først.

**Skrivbar fixture.** `skrivbar_base` gir en `Database` mot testbasen med ekte
commit, som i produksjon. Etter hver test, også en som feiler, tømmes tabellene
i `public` som var tomme ved oppstart (`TRUNCATE`), og frødata fra migrasjonene
(i dag `projects` og `project_memberships`) settes tilbake rad for rad. Det
skjer med `session_replication_role = replica`, så triggerne ikke lager nye
rader ved gjeninnsetting. Det krever at `KOE_TESTBASE_URL` er en superbruker,
og det er den både lokalt og i CI. Fixturen skriver bare til en base som har
merket fra `bygg_testbase.sh`. Prosjektets base har det ikke, og
`bygg_testbase.sh` nekter å bygge oppå en base som ikke er tom.
Øyeblikksbildet tas ved første skrivbare test i økten. En økt som ble drept midt
i en test, kan derfor ha etterlatt rader som neste økt tar for frødata. Bygg
basen på nytt da.

Den lesende fixturen (`testbase`) er uendret. Den går i autocommit med
`default_transaction_read_only`, og ser bare det som er committet.

## 5. Lokal oppstart

```bash
# PostgreSQL 17 må finnes. Homebrew: brew install postgresql@17
PG_BIN=/opt/homebrew/opt/postgresql@17/bin scripts/testbase/lokal_testbase.sh start
export KOE_TESTBASE_URL="$(scripts/testbase/lokal_testbase.sh url)"
cd backend && python -m pytest -q -m database tests/test_database
cd .. && python docs/vedlegg/f0b-kjernen-2026-09-23/mutasjoner.py
PG_BIN=/opt/homebrew/opt/postgresql@17/bin scripts/testbase/lokal_testbase.sh stopp
```

Skriptet lager et cluster i `$TMPDIR/koe-testbase` (overstyres med
`KOE_TESTBASE_KATALOG`), som bare lytter på `127.0.0.1:54317`
(`KOE_TESTBASE_PORT`) med et tilfeldig passord og uten Unix-socket. Deretter
bygger det basen med `bygg_testbase.sh`. Det stopper om binærene ikke er
versjon 17. Docker Compose er ikke laget: Docker-daemonen kjørte ikke på
maskinen, og en fil som ikke er kjørt, skulle ikke leveres. CI-jobben
`database` er uendret og bruker `bygg_testbase.sh` direkte.

## 6. Testene og hvordan de ble røde

Alle ligger i `tests/test_database/`, er merket `database` og kjøres av
CI-jobben. Kjernetestene kobler til som en innloggingsrolle uten superbruker
(`LOGIN NOINHERIT`). Den er medlem av en kastbar rolle med `INHERIT FALSE, SET
TRUE`, slik `koe_runtime_login` er av `koe_runtime` i v2. Rollene og skjemaet
opprettes av fixturen og slettes etterpå.

| Krav i oppdraget | Tester | Mutasjoner som gjør dem røde |
| --- | --- | --- |
| 1. Ingen lekkasje på gjenbrukt forbindelse | `test_kontekst_lekker_ikke_til_neste_transaksjon` (commit, rollback, feil i basen), `test_kontekst_satt_paa_sesjonsniva_kastes_med_forbindelsen`, `test_tom_kontekst_overstyrer_det_sesjonen_har`, `test_to_trader_mot_samme_pool_ser_hver_sin_kontekst` | M01, M02, M04, M06, M07, M08 |
| 2. Ikke utenfor transaksjon | `test_kontekst_kan_ikke_settes_utenfor_transaksjon`, `test_hjelperen_aapner_transaksjonen_selv`, `test_commit_inne_i_blokken_er_forbudt`, `test_transaksjon_som_er_avsluttet_i_blokken_avvises`, `test_transaksjoner_kan_ikke_nostes_i_samme_trad`, `test_transaksjon_krever_kontekst` | M03, M04, M05, M09, M10 |
| 3. Ingen delvis skriving | `test_to_skrivinger_committes_sammen`, `test_feil_etter_forste_skriving_etterlater_ingenting` (unntak i Python og feil i basen) | M03, M04 |
| 4. Feilklassifisering | `test_40001_er_serialiseringsfeil` (ekte samtidig oppdatering i `REPEATABLE READ`), `test_40P01_er_serialiseringsfeil` (ekte vranglås mellom to tråder), `test_versjonskonflikt_*`, `test_avvisninger_er_permanente` (`23505`, `23514`, `23502`, `22P02`, `22012`, `42P01`, `42601`), `test_manglende_rettighet_er_tilgang_avvist`, `test_tidsavbrudd_er_forbigaaende`, `test_tapt_forbindelse_for_commit_er_forbigaaende`, `test_tapt_forbindelse_under_commit_gir_ukjent_utfall`, `test_unntak_fra_koden_gaar_gjennom_uendret`, `test_feilmeldingen_gjengir_ikke_verdier` | M11–M13, M15, M17–M21 |
| 5. Retry | `test_40001_kjorer_hele_transaksjonen_paa_nytt`, `test_serialiseringsfeil_gir_opp_etter_siste_forsok`, `test_versjonskonflikt_kjores_ikke_paa_nytt`, `test_ukjent_utfall_kjores_ikke_paa_nytt`, `test_forbigaaende_feil_utenom_serialisering_kjores_ikke_paa_nytt` | M11, M13, M14, M16 |
| 6. Ingen `DATABASE_URL` | `test_uten_database_url_finnes_ingen_standardverdi`, `test_uten_database_url_ingen_tilkobling` (ingen, tom og blank; `PG*`-miljøet peker på testbasen, og `psycopg.Connection.connect` registrerer kall), `test_manglende_database_url_proves_ikke_paa_nytt`, `test_uleselig_database_url_lekker_ikke_passordet`, `test_base_som_ikke_svarer_gir_forbigaaende_feil_uten_passord` | M22–M24, M27 |
| Fixturen | `test_base_uten_merket_avvises`, `test_ryddingen_tommer_nye_rader_og_gjenoppretter_frodata`, `test_containeren_bruker_testbasen` | M25, M26 |
| Oppfølgingen (avsnitt 7) | `test_hver_sesjonsrest_alene_kastes_med_forbindelsen` (rolle, krav), og i [`tests/test_core/test_container_postgres.py`](../backend/tests/test_core/test_container_postgres.py): `test_samtidig_forste_oppslag_lager_en_pool`, `test_postgres_lagre_faar_containerens_database` (ett tilfelle per lager), `test_auth_service_henter_lageret_fra_containeren`, `test_relasjonslageret_hentes_fra_containeren`, `test_catenda_registeret_hentes_fra_containeren`, `test_manglende_relasjonslager_er_hoyt_naar_postgres_er_valgt` | M28–M33 |

Hver mutasjon er en tekstutskifting i én fil og står med navn i
[`mutasjoner.py`](vedlegg/f0b-kjernen-2026-09-23/mutasjoner.py). Skriptet
feiler om en mutasjon ikke gir rødt.

**To av dem er verdt å forklare:**

- **M01 (`SET` i stedet for `SET LOCAL`) blir rød gjennom det andre laget.**
  Resetten kaster forbindelsen, og testen feiler fordi neste transaksjon får en
  ny `pg_backend_pid()`, altså ingen gjenbruk. Testen krever samme pid nettopp for
  at resetten ikke skal kunne skjule et svikt i det første laget. Med M01 og M06
  sammen er lekkasjen direkte observert: neste transaksjon på samme pid så den
  kastbare rollen og kravene fra forrige transaksjon.
- **Tapt forbindelse under `COMMIT`** fremkalles av en utsatt
  skranketrigger som avslutter sin egen backend (`pg_terminate_backend(pg_backend_pid())`)
  når `COMMIT` kjører den. Klienten mister forbindelsen midt i `COMMIT`. Etterpå
  viser en uavhengig forbindelse at raden ikke finnes. Utfallet var altså kjent
  for basen, men ikke for klienten, og det er det `UkjentUtfall` sier.

## 7. Oppfølging av reviewet

Oppdragsgiver ba 23.09 om at RK-01–RK-04 ble rettet i denne PR-en, med
innkoblingen ferdig for fase 2, og at RK-05 ble stående åpen før F1.

| ID | Hva som er gjort | Test | Mutasjon |
| --- | --- | --- | --- |
| [RK-01](review-f0b-kjernen-2026-09-23.md#rk-01--første-oppslag-er-ikke-trådsikkert) | `Container.database` opprettes under en lås, med ny kontroll inne i låsen. `reset()` tar samme lås og lukker poolen | `test_samtidig_forste_oppslag_lager_en_pool`: to tråder, én opprettelse, samme objekt, lukket etter `reset()` | M30 |
| [RK-02](review-f0b-kjernen-2026-09-23.md#rk-02--innkoblingen-er-fortsatt-felles-arbeid) | `DATALAG=postgres` og `POSTGRES_LAGRE` (avsnitt 4). De tre konstruksjonsstedene utenfor containeren går gjennom den | Tester i `test_container_postgres.py` | M31–M33 |
| [RK-03](review-f0b-kjernen-2026-09-23.md#rk-03--resettestens-to-feil-skjuler-hverandre) | Kombinasjonstesten står. Ny test med rolle alene og med krav alene | `test_hver_sesjonsrest_alene_kastes_med_forbindelsen` | M28, M29 (reviewets RM01, RM02) |
| [RK-04](review-f0b-kjernen-2026-09-23.md#rk-04--sluttkontrollen-kjenner-bare-transaksjonsstatusen) | Kallerens ansvar skrevet inn under. Reproduksjonen står som streng `xfail`: den feiler til et smalere grensesnitt eventuelt bygges | `test_raa_commit_og_begin_i_blokken_etterlater_ingenting` (`xfail`) | — |
| [RK-05](review-f0b-kjernen-2026-09-23.md#rk-05--to-tidsgrenser-er-ikke-én-transaksjonsfrist) | **Åpen før F1.** Ingen kodeendring. En samlet øvre grense for en transaksjon må fastsettes og prøves sammen med F1-rollen; `transaction_timeout` i PostgreSQL 17 er et mulig virkemiddel, ikke valgt | — | — |

> **Merknad 2026-09-24 til avsnitt 7 og 8:** Tekstvakten ble utvidet i
> `286b511`. Den avviser nå også `END`, `ABORT`, `START TRANSACTION`,
> `SAVEPOINT`, `RELEASE SAVEPOINT`, `SET SESSION AUTHORIZATION`, `RESET ROLE`,
> `RESET ALL`, `DISCARD ALL`, kontekst satt med `SET koe.…`, og kallene
> `.commit()`, `.rollback()`, `.transaction()`, `.set_autocommit()` og
> tilordning til `.autocommit` under `repositories/postgres/`. Setningen under om
> savepoint med `conn.transaction()` gjelder derfor ikke for lagrene, og
> grensen i avsnitt 8 om at `conn.commit()`/`rollback()` ikke dekkes, er
> foreldet. Se [oppdraget for fase 2](prompt-f0b-fase2-repositorier-2026-09-24.md),
> avsnitt 4.

**Kallerens ansvar (RK-04).** Kjernen eier transaksjonsgrensen, og invariant 3
i 2.3 forutsetter det. Et repositorium eller en tjeneste skal derfor ikke:

- sende `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT` eller `SET TRANSACTION` som
  SQL. Trengs en savepoint, brukes `conn.transaction()` inne i blokken;
- sende `SET ROLE`, `RESET ROLE`, `SET SESSION AUTHORIZATION` eller
  `set_config` på kontekstvariabelen;
- bruke forbindelsen etter at blokken er avsluttet, eller gi den videre ut av
  blokken;
- pakke `utfor` inn i `@with_retry()` eller egen retry.

Sluttkontrollen og resetten fanger noen brudd på dette, ikke alle. En rå
psycopg-forbindelse er ikke en sikkerhetsgrense mot SQL fra backend selv. Det
som hindrer at en feil her gir tilgang, er rettighetene til F1-rollen, ikke
kjernen. Skal API-et også håndheve reglene mot feilskrevet backendkode, må et
smalere grensesnitt designes (se reviewet).

**Øvrige presiseringer fra reviewet:** den skrivbare fixturen forutsetter at
bare én pytest-prosess bruker basen om gangen. Parallelle kjøringer mot samme
base kan tømme hverandres data; bruk én kastbar base per prosess. Merket på
basen er en erklæring om at den er kastbar, ikke et bevis på hvor den står.

## 8. Restansene fra verifikasjonen i PR #47

**Dato:** 2026-09-24. **Utgangspunkt:** `754c07e`. **Kode og tester:**
`b97630f`, på grenen for [PR #42](https://github.com/khjohns/endringsmeldinger/pull/42).
Oppfølging av [verifikasjonen i PR #47](https://github.com/khjohns/endringsmeldinger/pull/47),
RK-02 og anbefalingen under RK-04. Dette er implementeringsresultater, ikke
et nytt uavhengig review. K = kjørt og observert; L = lest ut av koden.

| Punkt | Endring | Belegg |
| --- | --- | --- |
| RK-02, relasjoner | Begge tjenestefabrikkene injiserer relasjonslageret fra egen container. Hjelperen beholder eldre feilhåndtering. Eksplisitt `None` beholdes; bare utelatt argument gir globalt oppslag. | K: fire varianter med annen global container (`DATALAG` tomt eller `postgres`) krever samme databaseobjekt for hendelser og relasjoner. Fire andre varianter beholder `None` fra lokal JSON eller utilgjengelig Supabase selv med global PostgreSQL-container. |
| RK-02, Catenda | `DATALAG=postgres` har prioritet over den gamle registerbryteren. Manglende modul gir tydelig konfigurasjonsfeil med opprinnelig årsak. | K: både `legacy` og `supabase`, fra innstilling eller eksplisitt argument, velger PostgreSQL-klassen og containerens database. Begge innstillinger avvises når modulen mangler, selv med gyldig legacy-konfigurasjon. Tomt `DATALAG` beholder legacy og avviser registerverdien `postgres`. |
| RK-04, tekstvakt | Statisk SQL i `.py`- og `.sql`-filer under `repositories/postgres/` kontrolleres. Python-kommentarer/docstrings, SQL-kommentarer og siterte SQL-verdier regnes ikke som kommandoer. | K: vakten blir rød for hver av de fem påkrevde formene, og grønn igjen etter at prøvelinja fjernes. Blandede bokstavstørrelser, SQL-kommentar mellom SET og ROLE og SET LOCAL ROLE er også testet. |

**Mutasjonskontroll (K):** i en egen kastbar kopi ble bare én endring gjort om
gangen. Ingen prøvefiler ble lagt til på leveransegrenen.

| Mutasjon | Observert resultat |
| --- | --- |
| Fjern relasjonsargumentet i begge tjenestefabrikker | Fire testfeil: to finner `None` fra global JSON, to feiler på identiteten til databaseobjektet fra global PostgreSQL. Ingen oppsettsfeil. |
| Fjern overstyringen til `selected = "postgres"` | Begge legacy-variantene feiler på forventet registerklasse: de får `InMemoryCatendaProjectConfigRepository`. De to Supabase-variantene består. |
| Legg `conn.execute("BEGIN")` i `repositories/postgres/prove.py` | Tekstvakten feiler og navngir `prove.py:1: BEGIN`. |
| Samme prøve med `COMMIT` | Tekstvakten feiler og navngir `prove.py:1: COMMIT`. |
| Samme prøve med `ROLLBACK` | Tekstvakten feiler og navngir `prove.py:1: ROLLBACK`. |
| Samme prøve med `SET ROLE koe` | Tekstvakten feiler og navngir `prove.py:1: SET ROLE`. |
| Samme prøve med `SELECT set_config('koe.krav', '{}', true)` | Tekstvakten feiler og navngir `prove.py:1: set_config`. |
| Fjern prøvelinja | Tekstvakten består. |

Prøvelinjene leses som kildekode, ikke som SQL som kjøres. For å gjenta en
vaktmutasjon: bruk en kastbar checkout av `b97630f`, legg en av linjene over i
`backend/repositories/postgres/prove.py`, og kjør fra `backend`:

```bash
python -m pytest -q tests/test_security/test_postgres_transaksjonsgrense.py \
  -k test_postgres_lagre_styrer_ikke_transaksjon_eller_kontekst
```

Fjern prøvefila og kjør igjen. De to lagerkoblingene prøves i
[`test_container_postgres.py`](../backend/tests/test_core/test_container_postgres.py).
Ingen lagre, Database-metoder, migrasjoner eller xfail-reproduksjoner er endret.

## Verifikasjon og grenser

**Kjørt og observert 2026-09-24, kode `b97630f`:** macOS 26.2, Python 3.11.9,
pytest 9.0.2, PostgreSQL 17.11, psycopg 3.3.6 og psycopg-pool 3.3.3.
Ny kastbar lokalbase på port 54329, bygget fra tom med plattformstubben og
alle 23 migrasjoner. Resultatene er fra den endelige koden:

- `python -m pytest -q tests/test_database`: **59 bestått, 1 xfailed** (RK-04).
- `python -m pytest -q`, hele backend med testbasen: **1643 bestått,
  9 hoppet over, 39 xfailed**.
- Fem av fem forbudte SQL-former gjorde tekstvakten rød; gjenopprettet kopi
  ble grønn. Begge mutasjonene av innkoblingen ble også fanget (avsnitt 8).
- `ruff check backend/`: ingen feil. Lokale lenker og ankre i dette notatet,
  reviewrapporten og hovedplanen: ingen brutte lenker.

**Grenser for 24.09-kjøringen:** innkoblingstestene bruker lagerdobler; de
konverterer og prøver ingen framtidige lagre. Tekstvakten er ikke en SQL-parser
eller en sikkerhetsgrense: dynamisk sammensetting på tvers av strenger og
variabler, importert SQL og `conn.commit()`/`rollback()` dekkes ikke. Kallerregelen
og review av hvert nytt lager gjelder fortsatt. Den strenge RK-04-xfail-en er
uendret; kjernens tekniske begrensning består. Ingen delt base eller reelle
Catenda-/Supabase-kall er brukt. Alle 33 eldre mutasjoner, CI og
PgBouncer/Supavisor er ikke kjørt på nytt i denne oppfølgingen. RK-05 står
fortsatt åpen før F1, ikke før fase 2.


**Kjørt og observert (23.09, macOS 26, Python 3.11.9, PostgreSQL 17.11 fra
Homebrew, psycopg 3.3.6, psycopg-pool 3.3.3, ruff 0.16.8), etter oppfølgingen:**

- `tests/test_database/`: 59 bestått og 1 xfailed. 10 av dem er katalogtestene som fantes fra
  før, og xfail-en er RK-04.
- Hele backend-suiten med `KOE_TESTBASE_URL` satt: 1611 bestått, 9 hoppet over, 39 xfailed.
- Hele backend-suiten uten `KOE_TESTBASE_URL`: 1552 bestått, 69 hoppet over, 38 xfailed. De nye
  databasetestene hoppes over; containertestene kjøres.
- Alle 33 mutasjonene ga rød test på den endelige koden.
- Før oppfølgingen: 57 databasetester, 1589 bestått med testbasen (tre ganger på
  rad, med identiske frødata etterpå) og 1532 uten, og 27 av 27 mutasjoner.
- `ruff check backend/`: ingen feil.
- `lokal_testbase.sh start`, `url` og `stopp`, og en ombygging fra tom.

**Observert i CI (23.09, [PR #42](https://github.com/khjohns/endringsmeldinger/pull/42),
kjøring `35850648220`, commit `ff5a794`):** alle jobbene er grønne. Jobben
`database` (Linux, `postgres:17`): 57 bestått. Backend-jobben: 1532 bestått,
66 hoppet over, 38 xfailed. Jobben `database` kobler til som `postgres`, og det
er en superbruker. Fixturene trenger `CREATEROLE`, `CREATEDB` og
`session_replication_role`. Mutasjonene er ikke kjørt i CI.

**Observert i CI etter oppfølgingen (23.09, kjøring `35859558609`, commit
`21130e7`):** alle jobbene grønne. Jobben `database`: 59 bestått og 1 xfailed.
Backend-jobben: 1552 bestått, 69 hoppet over, 38 xfailed.

**Lest ut av koden, ikke kjørt:**

- At `@with_retry()` slipper `UkjentUtfall` og `PermanentError` gjennom uten ny
  kjøring (`lib/supabase/retry.py`). Kjørt bare for `DatabaseIkkeKonfigurert`.
- At psycopg_pool ruller tilbake en forbindelse som leveres i transaksjon, og
  kaster en ødelagt forbindelse i stedet for å låne den ut igjen. Det siste
  følger av testen for tapt forbindelse, der neste utlån er en fungerende
  forbindelse.

**Ikke prøvd:**

- **PgBouncer i transaksjonsmodus**, som Azure tilbyr. Kjernen holder rolle og
  kontekst innenfor transaksjonen, og det er forutsetningen for den modusen. Men
  poolens reset kjører på en annen serverforbindelse enn transaksjonen, og har
  der ingen verdi. psycopg forbereder setninger på serversiden etter fem
  kjøringer (`prepare_threshold`), og det krever PgBouncer 1.21 eller nyere med
  `max_prepared_statements`. Ingenting av dette er prøvd.
- **Supavisor** og direkte tilkobling til Supabase-prosjektet. Det er ikke koblet
  til noen delt base.
- **Azure Database for PostgreSQL.** Ingen tilgang ennå (oppdragsgiver, 23.09).
- **Gunicorn med flere prosesser.** Poolen opprettes ved første bruk, altså i
  arbeidsprosessen etter fork. Med `preload_app` og en import som berører
  `container.database`, ville poolen blitt delt mellom prosesser. Det er ikke
  prøvd.
- **`idle_in_transaction_session_timeout`** og en transaksjon som henger. Ingen
  tidsgrense er satt før F1 (avsnitt 3).
- **Tilkoblingsfeil utover «connection refused»**, for eksempel feil passord, TLS
  eller DNS, med tanke på hva libpq skriver i meldingen.
- **Docker Compose.** Ikke levert, se avsnitt 5.
- **Hele kjeden i `docs/`.** Lenkekontrollen er kjørt for dette notatet, ikke for
  hele katalogen.
