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
- Blokken kan ikke avslutte transaksjonen selv. `conn.commit()` avvises av
  psycopg innenfor `conn.transaction()` (blir `PermanentError`). En rå `COMMIT`
  eller en feil i basen som blokken svelger, fanges ved utgangen:
  `RuntimeError`, og ingen `COMMIT` sendes. Med rå `COMMIT` er det som ble skrevet
  før den, committet. Kjernen melder det, men kan ikke hindre det.
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

En tråd som konverterer ett repositorium:

1. Skriver repositoriet med `Database` som eneste avhengighet, for eksempel
   `PostgresEventRepository(database)`. Hver metode bruker
   `database.transaksjon(Kontekst())` for lesing og `database.utfor(...)` for
   skriving, uten `@with_retry()`.
2. Endrer sin egen property i `core/container.py`, eller sin egen
   `create_*`-fabrikk, til å bruke `self.database`. `container.database` og
   `_database` finnes allerede og skal ikke endres.
3. Skriver testene i en egen fil under `tests/test_database/`, merket
   `database`, med `skrivbar_base` (eller `container_mot_testbasen` for ruter).
   Fixturene skal ikke endres.

**Konfliktflater som gjenstår (lest ut av koden):** to tråder som begge endrer
`repositories/__init__.py` eller hver sin del av `core/container.py`. Hver tråd
eier sin egen property. Endringene berører ulike linjer, men de ligger i samme
fil. Kommer to tråder til å trenge en felles hjelper for SQL (for eksempel
`dict_row` eller paginering), bør den legges i `lib/db/` i en egen, liten PR
først.

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

## Verifikasjon og grenser

**Kjørt og observert (23.09, macOS 26, Python 3.11.9, PostgreSQL 17.11 fra
Homebrew, psycopg 3.3.6, psycopg-pool 3.3.3, ruff 0.16.8):**

- `tests/test_database/`: 57 bestått, 10 av dem katalogtestene som fantes fra
  før.
- Hele backend-suiten med `KOE_TESTBASE_URL` satt: 1589 bestått, 9 hoppet over,
  38 xfailed, tre ganger på rad mot samme base. Frødata var identiske etterpå,
  med samme ID.
- Hele backend-suiten uten `KOE_TESTBASE_URL`: 1532 bestått, 66 hoppet over,
  38 xfailed. Tallet bestått er det samme som før. De nye testene hoppes over.
- Alle 27 mutasjonene ga rød test på den endelige koden.
- `ruff check backend/`: ingen feil.
- `lokal_testbase.sh start`, `url` og `stopp`, og en ombygging fra tom.

**Lest ut av koden, ikke kjørt:**

- At `@with_retry()` slipper `UkjentUtfall` og `PermanentError` gjennom uten ny
  kjøring (`lib/supabase/retry.py`). Kjørt bare for `DatabaseIkkeKonfigurert`.
- At psycopg_pool ruller tilbake en forbindelse som leveres i transaksjon, og
  kaster en ødelagt forbindelse i stedet for å låne den ut igjen. Det siste
  følger av testen for tapt forbindelse, der neste utlån er en fungerende
  forbindelse.

**Ikke prøvd:**

- **CI.** Testene er ikke kjørt i jobben `database` før PR-en. Jobben kobler til
  som `postgres`, og det er en superbruker. Fixturene trenger `CREATEROLE`,
  `CREATEDB` og `session_replication_role`.
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
