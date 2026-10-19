# Vurdering: JSON i Azure SQL Database mot slik appen lagrer JSON (B-12)

**Dato og grunnlag:** 11.10.2026, kontrollert mot `0b055da` på `main`. Bestilt i
[#377](https://github.com/khjohns/endringsmeldinger/issues/377). Beslutningen er
[B-12 i hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger),
og vedtaket føres der. Spørsmålene til IKT står i
[#78](https://github.com/khjohns/endringsmeldinger/issues/78). Dette dokumentet
avgjør ikke B-12.

Appen er ikke i produksjon og har ingen reelle data. Belegg er merket etter
[1.3 i hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#13-begreper-som-holdes-adskilt):
**K** kjørt og observert, **L** lest i kode eller migrasjonsfil, **D** spurt i
katalogen i testbasen, **—** ikke kontrollert. I tillegg brukes **MS** for det
Microsoft dokumenterer, med dokumentets egen dato (`ms.date`). Alle MS-kildene
er hentet 11.10.2026. Nettpolicyen i skyøkta sperrer `learn.microsoft.com`, så
teksten er lest i kildefilene sidene bygges fra, i Microsofts repoer
`MicrosoftDocs/sql-docs` (grenen `live`) og `MicrosoftDocs/fabric-docs` (grenen
`main`). Lenkene under går til de publiserte sidene.

## 1. Spørsmålet

Oppdragsgiver heller mot Azure SQL Database, fordi virksomheten har SQL fra før
og ikke PostgreSQL. Appen lagrer mye som JSON. Før B-12 avgjøres, trengs svar på
seks punkter i #377: JSON-støtten i Azure SQL Database, om testbasen kan kjøre den
samme støtten i Docker, hvordan appen bruker JSON i dag, hva lagringsformen betyr
for det frosne brevet, alternativene, og en anbefaling.

Kort svar:

- Azure SQL Database har en egen `json`-type som er allment tilgjengelig, og den
  samme typen finnes i SQL Server 2025, som kjører i Docker. Prøvene i avsnitt 4
  er kjørt der.
- Appen bruker JSON som dokumenter: den skriver og leser hele verdien. Én spørring
  i produksjonskoden leser et felt i JSON med SQL, og tre databasefunksjoner
  pakker ut JSON-parametre. Ingen skranke leser JSON-innhold.
- JSON-støtten er derfor ikke det som gjør et bytte dyrt. Det er resten av
  datalaget (#78).
- To forhold taler mot `json`-typen for brevet og journalen: en tabell med en
  `json`-kolonne kan ikke speiles til Fabric, og typen endrer teksten ved
  lagring. Det siste gjelder `jsonb` i PostgreSQL også.

## 2. JSON i Azure SQL Database (punkt 1)

| ID | Forhold | Belegg |
| --- | --- | --- |
| AJ-01 | **Typen og tilgjengeligheten.** `json` lagrer dokumentet i et eget binært format med UTF-8 (`Latin1_General_100_BIN2_UTF8`). Typen er allment tilgjengelig i Azure SQL Database, i SQL Server 2025, i Azure SQL Managed Instance med oppdateringspolicyen SQL Server 2025 eller Always-up-to-date, og i SQL database i Fabric. Den virker på alle kompatibilitetsnivåer. Dokumentasjonen nevner ingen begrensning etter tjenestenivå i Azure SQL Database, heller ikke for serverløs eller gratistilbudet | MS 15.09.2026 ([JSON data type](https://learn.microsoft.com/en-us/sql/t-sql/data-types/json-data-type)); tjenestenivåene — |
| AJ-02 | **Validering.** Bare et objekt eller en matrise godtas på toppnivå (RFC 4627). Ugyldig JSON avvises ved innsetting. En `CHECK` kan lese innholdet med JSON-funksjonene, for eksempel `JSON_PATH_EXISTS` | MS 15.09.2026 (samme side); K 11.10 (en streng på toppnivå og avkortet JSON avvist) |
| AJ-03 | **Størrelse og nøsting.** Opptil 2 GB binært, 32K unike nøkler, 7 998 byte per nøkkel, 65 535 egenskaper i et objekt, 65 535 elementer i en matrise og 128 nivåer. TS-serveren avviser en kropp som er nøstet dypere enn 32 nivåer (`STORSTE_DYBDE` i [`server/app.ts`](../server/app.ts)) | MS 15.09.2026; K 11.10 (129 nivåer avvist: «Nested level of JSON document exceeds limit 128») |
| AJ-04 | **Indekser.** En `json`-kolonne kan ikke være nøkkel i `CREATE INDEX`. To veier finnes: en beregnet kolonne med `JSON_VALUE` og en vanlig B-treindeks, som virker for både `json` og tekst, og `CREATE JSON INDEX`, som krever en klynget primærnøkkel, bygges offline med `Sch-M`-lås og brukes av `JSON_VALUE`, `JSON_PATH_EXISTS` og `JSON_CONTAINS` | MS 15.09.2026 ([CREATE JSON INDEX](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-json-index-transact-sql)), MS 16.09.2026 ([Index JSON data](https://learn.microsoft.com/en-us/sql/relational-databases/json/index-json-data)); K 11.10 (begge opprettet) |
| AJ-05 | **Konvertering.** Bare eksplisitt, til og fra `char`, `nchar`, `varchar` og `nvarchar`. En tekstkolonne kan gjøres om til `json` med `ALTER TABLE`, men ikke tilbake | MS 15.09.2026 |
| AJ-06 | **Det klienten får.** Driverne ser typen som `varchar(max)` (TDS 7.4 og senere) eller `nvarchar(max)`. Node-driveren `mssql` 11.0.2 (`tedious` 18.6.2) gir en streng, som appen må tolke med `JSON.parse`. `pg` gir i dag et ferdig tolket objekt for `jsonb` (`lesJournal` i [`server/lager.ts`](../server/lager.ts)) | MS 15.09.2026; K 11.10 (`sys.dm_exec_describe_first_result_set` ga `varchar(max)`, driveren ga `string`) |
| AJ-07 | **`OPENJSON`** tar ikke imot `json`-typen «på noen plattformer», og verdien må da konverteres til `nvarchar(max)` først. SQL Server 2025 tar imot den. Om Azure SQL Database gjør det, sier siden ikke uttrykkelig | MS 15.09.2026; Azure SQL Database — |
| AJ-08 | **JSON som tekst.** `nvarchar(max)` med `CHECK (ISJSON(kolonne, OBJECT) = 1)` avviser ugyldig JSON og alt som ikke er et objekt. Typebegrensningen i `ISJSON` kom i SQL Server 2022. Teksten lagres tegn for tegn slik den ble sendt, og de samme JSON-funksjonene og indeksveiene virker | MS 23.07.2025 ([ISJSON](https://learn.microsoft.com/en-us/sql/t-sql/functions/isjson-transact-sql)), MS 16.09.2026; K 11.10 |
| AJ-09 | **Speiling til Fabric.** Fra Azure SQL Database kan en tabell med en `json`-kolonne ikke speiles i det hele tatt, og typen kan ikke innføres med `ALTER` i en speilet tabell. En tekstkolonne over 1 MB kortes av til 1 MB i OneLake. Fra Azure Database for PostgreSQL speiles ikke kolonner av typen `json` eller `jsonb`, men resten av tabellen speiles | MS 26.02.2026 ([Azure SQL Database](https://learn.microsoft.com/en-us/fabric/mirroring/azure-sql-database-limitations)), MS 27.02.2026 ([Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/fabric/mirroring/azure-database-postgresql-limitations)) |

AJ-09 betyr at journalen i `hendelse` ikke kan speiles fra Azure SQL Database
hvis `data` blir `json`. Fra PostgreSQL speiles journalen uten `data`, altså uten
innholdet i brevene. Ingen av de to gir Fabric innholdet så lenge det ligger i en
JSON-type. Om speiling er med i kostnadsgrunnlaget, er spørsmål 2 i #78.

## 3. Testbasen (punkt 2)

| ID | Forhold | Belegg |
| --- | --- | --- |
| AJ-10 | **SQL Server 2025 kjører i Docker** med `json`-typen, `CREATE JSON INDEX` og `ISJSON` med typebegrensning. Bildet `mcr.microsoft.com/mssql/server:2025-CU9-ubuntu-24.04` er 2,42 GB, mot 646 MB for `postgres:17`. Det startet som Enterprise Developer Edition (17.0.5005.3) i skyøkta, og registeret svarte uten unntak i nettpolicyen | K 11.10 |
| AJ-11 | **Samme motor er ikke samme tjeneste.** Microsoft beskriver `json` som samme type i SQL Server 2025 og Azure SQL Database, men Azure SQL Database oppdateres løpende og kan ligge foran. AJ-07 er et kjent avvik mellom plattformene. Prøvene i avsnitt 4 er ikke kjørt mot en Azure-database | MS 15.09.2026; Azure — |
| AJ-12 | **Lisensen.** Developer-utgaven er for utvikling og test. Det er ikke kontrollert om vilkårene dekker CI i GitHub Actions, eller om et bilde på 2,4 GB holder for CI-jobben `database` og hooken i skyøktene | — |

Databasetestene kan altså kjøre mot SQL Server 2025 i Docker, med samme
mønster som testbasen i dag. Det som må bygges, er testbasen selv: migrasjonene,
plattformstubben ([`scripts/testbase/plattformstubb.sql`](../scripts/testbase/plattformstubb.sql),
som speiler Supabase) og hjelperne i `scripts/testbase/`.

## 4. Hvordan JSON kommer tilbake (prøvene)

Samme verdier er sendt gjennom tre lagringsformer 11.10: `jsonb` i testbasen
(PostgreSQL 17, med `pg` fra repoet), `json` i SQL Server 2025 og `nvarchar(max)`
med `ISJSON` (begge med `mssql` 11.0.2). Inndata er `JSON.stringify` av et objekt,
slik [`server/lager.ts`](../server/lager.ts) skriver i dag. «Lik tekst» betyr at
strengen som kom tilbake, er den samme som ble sendt. «Lik etter tolkning» betyr at
`JSON.stringify(JSON.parse(ut))` gir inndata igjen.

| Inndata | `jsonb` (PostgreSQL) | `json` (SQL Server 2025) | `nvarchar(max)` med `ISJSON` |
| --- | --- | --- | --- |
| Vanlig objekt: tekst, beløp, null, sann, matrise | Nøklene ordnet etter lengde og så alfabetisk, mellomrom etter `:` og `,`. Ulik tekst. Etter tolkning en annen nøkkelrekkefølge | Lik tekst | Lik tekst |
| `5e-7` og `1e21` | `0.0000005` og `1000000000000000000000`. Lik etter tolkning, men med annen rekkefølge | `0.0000005000` og `1000000000000000000000.0000000000`. Lik etter tolkning | Lik tekst |
| Kontrolltegn, linjeskift, `"` og `\` | Ulik tekst, lik etter tolkning | Lik tekst | Lik tekst |
| `æøå`, U+2028, emoji, `é` | Ulik tekst, lik etter tolkning | Lik tekst | Lik tekst |
| `-0` | `0`, lik etter tolkning | Lik tekst | ikke prøvd |
| Heltall over 2^53 (`9007199254740993` i kilden, `9007199254740992` etter JS) | Lik etter tolkning | Lik tekst | ikke prøvd |
| Ensomt surrogat (`"\ud800"`) | **Avvist** ved innsetting | **Endret uten feil** til U+FFFD. Ulik også etter tolkning | Lik tekst |
| NUL-tegn (`"\u0000"`) | **Avvist** ved innsetting | Lik tekst | Lik tekst |
| Doble nøkler (`{"a":1,"b":0,"a":2}`, skrevet som SQL-litteral) | Siste verdi beholdes: `{"a": 2, "b": 0}` | **Første** verdi beholdes: `{"a":1,"b":0}` | Lagres som sendt. `ISJSON` godtar, og `JSON_VALUE` gir første verdi |

I tillegg, med en SQL-litteral i SQL Server: `json` fjerner mellomrom, beholder
nøkkelrekkefølgen og skriver `\/` som `/` og `é` som `é`.

Det viktige for appen:

- Ingen av JSON-typene gir tilbake teksten som ble sendt, i alle tilfeller.
  `jsonb` gjør det nesten aldri, `json` gjør det for vanlige objekter fra
  `JSON.stringify`, men ikke for tall i eksponentform.
- Begge JSON-typene gir samme innhold etter tolkning i de vanlige tilfellene.
  Summen i leveringsoppdraget, som regnes av kanonisk JSON etter tolkning, holder
  derfor på begge (avsnitt 5, AJ-18).
- Unntaket er det ensomme surrogatet: `json` endrer innholdet uten feil, mens
  `jsonb` avviser skrivingen. TS-serveren avviser i dag ensomme surrogater og
  NUL-tegn i kroppen med 400 før kjernen kalles (`ulagringsbarTekst` og
  `kroppsfeil` i [`server/app.ts`](../server/app.ts); L 11.10). Kjernens
  tekstskjema gjør det ikke ennå
  ([#373](https://github.com/khjohns/endringsmeldinger/issues/373)). Med `json`
  ville vernet i serveren være det eneste som hindrer en stille endring, ikke
  bare en feil.
- Doble nøkler oppstår ikke når serveren skriver `JSON.stringify` av et objekt, som
  i dag (L, `kolonneverdier` og `skrivMedOppdrag` i [`server/lager.ts`](../server/lager.ts)).
  At `json` beholder første verdi og JavaScript siste, betyr noe bare hvis rå
  JSON-tekst fra en klient lagres uten å tolkes først.

Prøveskriptene ligger ikke i repoet. De kan gjenskapes med SQL Server-bildet over,
`npm i mssql@11` i en egen mappe og verdiene i tabellen.

## 5. Hvordan appen bruker JSON i dag (punkt 3)

**Søket.** Formene jeg søkte etter i `supabase/migrations/`, `backend/`,
`server/`, `sprakprove/`, `kjerne/`, `scripts/` og `src/`: `jsonb`, `json`,
`::jsonb`, `->`, `->>`, `#>`, `@>`, `?|`, `?&`, `jsonb_*`, `json_*`,
`to_json`/`to_jsonb`, `json_agg`, `jsonb_set`, `Jsonb(`/`Json(` fra psycopg og
`.eq("data->>…")` fra PostgREST. I katalogen i testbasen, bygget fra migrasjonene:
`information_schema.columns`, `pg_indexes`, `pg_constraint`, funksjonskroppene i
`pg_proc`, `pg_policy`, `pg_views` og `pg_trigger`.

### 5.1 Det som er lagret som JSON

Hele basen har fem JSON-kolonner, alle `jsonb` i `public` (D 11.10). Migrasjonene
har flere treff fordi tre eldre hendelsestabeller med `data JSONB` er slettet i
`20260920193558_hendelse_tabell.sql`.

| ID | Kolonne | Hva | Skrives | Leses | Belegg |
| --- | --- | --- | --- | --- | --- |
| AJ-13 | `hendelse.data`, `NOT NULL` | **Journalen.** Innholdet i hver hendelse, med brevet etter [HF-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#hf-u1) | TS: `JSON.stringify` og `::jsonb` (`SETT_INN_HENDELSE`, `kolonneverdier` i [`server/lager.ts`](../server/lager.ts); tilsvarende i [`sprakprove/server/lager.ts`](https://github.com/khjohns/endringsmeldinger/blob/fc19484/sprakprove/server/lager.ts)). Python: `Jsonb(...)` i `PostgresEventRepository._rad` ([`backend/repositories/postgres/hendelse.py`](../backend/repositories/postgres/hendelse.py)), og `SupabaseEventRepository` over PostgREST ([`backend/repositories/supabase_event_repository.py`](../backend/repositories/supabase_event_repository.py)) | Hele kolonnen, tolket av driveren (`lesJournal` i [`server/lager.ts`](../server/lager.ts), `_til_hendelse` i `hendelse.py`). Ett felt leses med SQL, se AJ-19 | D, L 11.10 |
| AJ-14 | `leveringsoppdrag.innhold`, `NOT NULL` | **Leveringsoppdraget** etter [LV-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#lv-u1): brevet, målet i Catenda og versjonene. Uforanderlig (triggeren `leveringsoppdrag_vakt`) | `lagOppdrag` i [`server/levering.ts`](../server/levering.ts), skrevet med `JSON.stringify` og `::jsonb` i `skrivMedOppdrag` | Hele kolonnen (`lesOppdrag` i [`server/lager.ts`](../server/lager.ts)) | D, L 11.10; migrasjon `20261011090000_leveringsoppdrag.sql` |
| AJ-15 | `sak_metadata.kjerne_visning` | **Bufferen** (B-10, #316). Kan regnes på nytt fra journalen | Bare prøvekode: `pgBuffer` i [`sprakprove/kjernelagring/bane.ts`](../sprakprove/kjernelagring/bane.ts), `JSON.stringify` og `::jsonb`. Ingen kode i `server/` eller `backend/` rører kolonnen | Hele kolonnen, samme sted | D, L 11.10; migrasjon `20261010120000_sak_metadata_kjernebuffer.sql` |
| AJ-16 | `projects.settings`, standard `'{}'` | **Metadata:** prosjektinnstillinger | Gjennom Supabase-lageret `SupabaseProjectRepository` ([`backend/repositories/project_repository.py`](../backend/repositories/project_repository.py)) | Hele kolonnen. Feltet `contract.dagmulkt_sats` leses i Python (`authority_policy` i [`backend/services/approval_policy.py`](../backend/services/approval_policy.py)), ikke i SQL | D, L 11.10 |
| AJ-17 | `sak_bim_links.properties` | **Metadata:** IFC-egenskaper til en BIM-kobling | Av ingen lagre: `BimLinkCreate` har ikke feltet ([`backend/models/bim_link.py`](../backend/models/bim_link.py)), og både `_NY_LENKE` i [`backend/repositories/postgres/bim.py`](../backend/repositories/postgres/bim.py) og `create_link` i [`backend/repositories/bim_link_repository.py`](../backend/repositories/bim_link_repository.py) skriver fra den | Hele kolonnen, gjennom `BimLink` | D, L 11.10 |

### 5.2 Det som spørres i, sjekkes eller pakkes ut med SQL

| ID | Forhold | Belegg |
| --- | --- | --- |
| AJ-18 | **Summen i leveringsoppdraget** er SHA-256 av kanonisk JSON med sorterte nøkler (`kanonisk` og `sjekksum` i [`server/levering.ts`](../server/levering.ts)). Den regnes i TS, ikke i basen, og kan regnes på nytt av det basen gir tilbake etter tolkning. Skranken på `innhold_sha256` sjekker bare formen (64 heksadesimale tegn), ikke at summen stemmer med `innhold` | L 11.10; K 11.10 (`server/tester/skive.test.ts`, 13 av 13 grønne, blant dem kontrollen av at summen kan regnes på nytt av det basen gir tilbake) |
| AJ-19 | **Ett felt leses med SQL i produksjonskoden:** `data->>'catenda_topic_id'` for `sak_opprettet` i `find_sak_id_by_catenda_topic` ([`backend/repositories/postgres/hendelse.py`](../backend/repositories/postgres/hendelse.py)), med uttrykksindeksen `idx_hendelse_catenda_topic` (migrasjon `20260921093936_indeks_hendelse_catenda_topic.sql`). Supabase-lageret har samme spørring over PostgREST (`.eq("data->>catenda_topic_id", …)` i [`backend/repositories/supabase_event_repository.py`](../backend/repositories/supabase_event_repository.py)). Kolonnen `sak_metadata.catenda_topic_id` finnes fra før, og `get_by_topic_id` i [`backend/repositories/postgres/sak_metadata.py`](../backend/repositories/postgres/sak_metadata.py) leser den | L, D 11.10 |
| AJ-20 | **Ingen skranke leser JSON-innhold.** Én `CHECK` nevner en JSON-kolonne: `sak_metadata_kjernebuffer_samlet`, og bare om kolonnene er `NULL` samtidig. Skranken på `innhold_sha256`, en tekstkolonne, sjekker bare formen | D 11.10 |
| AJ-21 | **Tre funksjoner i `public` tar `jsonb` som parameter.** To av dem, `koe_reconcile_memberships` og `koe_set_contract_teams`, pakker den ut med `jsonb_typeof`, `jsonb_array_elements` og `->>`. Den gjeldende `koe_register_project` sender den videre til `koe_set_contract_teams` (de eldre versjonene i migrasjonene pakket den ut selv). JSON er her en måte å sende en liste på, ikke noe som lagres. RPC-kallene står i `backend/repositories/auth_repository.py` (Supabase-RPC). `backend/scripts/register_project.py` bruker dem gjennom `AuthRepository.register_project`. I T-SQL blir det `OPENJSON` over en `nvarchar(max)`-parameter eller en tabellverdiparameter. De andre åtte funksjonene og de sju triggerne rører ikke JSON | D, L 11.10 |
| AJ-22 | **Kjernen og TS-serveren bruker ingen JSON-operator i SQL.** `kjerne/` kjører ingen SQL, men feilinnføringen F51 i [`kjerne/tester/feilinnfoering.ts`](../kjerne/tester/feilinnfoering.ts) matcher SQL-teksten i `bane.ts`. `server/` bruker bare `::jsonb` ved skriving. **Testene** bruker mer: `jsonb_set` ([`sprakprove/tester/server.test.ts`](https://github.com/khjohns/endringsmeldinger/blob/ad92579/sprakprove/tester/server.test.ts)), `to_jsonb` ([`sprakprove/kjernelagring/gjenoppbygging.test.ts`](../sprakprove/kjernelagring/gjenoppbygging.test.ts)), `::jsonb` i testbasehjelperne (`server/tester/testbase.ts`, `sprakprove/tester/testbase.ts`), og i Python setter `backend/tests/test_database/conftest.py` basen tilbake med `to_jsonb` og `jsonb_populate_recordset`. `test_katalog.py` sjekker at kolonnetypen er `jsonb`, og testdobbelen `tests/fixtures/supabase_dobbel.py` etterlikner `data->>`. Plattformstubben leser `request.jwt.claims` med `->>` for å etterlikne Supabase | L 11.10 |

Følgen er at appen bruker JSON som dokumenter. Byttet til en annen JSON-type
eller til tekst rører skrivestedene i AJ-13 og AJ-14, prøvekoden i AJ-15, spørringen i AJ-19, de tre
funksjonene i AJ-21 og testene i AJ-22. Det er lite målt mot resten av datalaget,
som #78 beskriver: `pg`, `SELECT … FOR UPDATE`, triggerne og funksjonene i
PL/pgSQL og mekanismen i B-02 alternativ C.

## 6. Det frosne brevet og etterprøvbarheten (punkt 4)

**Hva som er lagret i dag.** Brevet ligger i `hendelse.data` og, frosset for
levering, i `leveringsoppdrag.innhold`. Kjernen har ingen brevtekst ennå:
`brevtekst` er `null` til #309 lager den (`lagOppdrag` i
[`server/levering.ts`](../server/levering.ts)). Det som kan sammenliknes med det
som ble sendt, er derfor innholdet, ikke en gjengitt tekst eller PDF (L 11.10).

**Hva lagringsformen betyr.**

- [MM-U9](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u9) og
  [MM-U11](plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u11) gjelder
  virkningen, som leses av innholdet. Rekkefølgen på nøklene eller mellomrom
  endrer ikke innholdet. For kjernen holder det at innholdet er det samme etter
  tolkning, og det gjør både `jsonb` og `json` i de vanlige tilfellene (avsnitt 4).
- [HF-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#hf-u1) og
  [LV-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#lv-u1) krever at
  brevet lagres samlet og frosset. Ingen av dem sier byte for byte.
- Skal noen senere kunne vise at det lagrede er det som ble sendt, byte for byte,
  må lagringen gi tilbake bytene. Det gjør bare tekst (AJ-08), eller en binær
  kolonne. `jsonb` gjør det ikke, og `json` gjør det ikke i alle tilfeller. Summen
  i AJ-18 bøter på det for innholdet: den beviser at innholdet er uendret, ikke at
  teksten er det.
- `json` kan endre innholdet uten feil (det ensomme surrogatet i avsnitt 4).
  `jsonb` avviser i stedet. Serveren stopper slike tegn før lagring i dag, men
  kjernen gjør det ikke (#373). For et frosset brev er avvisning bedre enn en stille
  endring.

**Spørsmålet til juridisk sparring**, formulert uten saksdata: «En app lagrer
formelle varsler og svar etter NS 8407 som strukturerte data, og leverer hvert
brev som et dokument til et prosjekthotell. Holder det for etterprøvbarheten at
appen kan vise at innholdet i det lagrede brevet er uendret, med en kontrollsum
over en fast tekstform av innholdet, eller må den kunne legge fram nøyaktig de
bytene som ble sendt eller vist for avsenderen? Og hva er i så fall «brevet»:
dataene, den gjengitte teksten eller dokumentet som ble levert?»

## 7. Alternativene (punkt 5)

| | (a) `json`-typen | (b) Tekst med `ISJSON` | (c) Flere egne kolonner, JSON bare for dokumentene |
| --- | --- | --- | --- |
| **Formatet i kjernen** | Uendret. Serveren må tolke strengen fra driveren selv (AJ-06) | Uendret, som (a) | Uendret for brevet. Felt som flyttes til kolonner, må skrives og leses for seg i lageret, ikke i kjernen |
| **Skrankene** | Gyldig JSON, objekt eller matrise. `CHECK` kan lese innholdet | Gyldig JSON som objekt med `ISJSON(…, OBJECT)`. `CHECK` kan lese innholdet med de samme funksjonene | Kolonnene får vanlige skranker og fremmednøkler. Dokumentene som i (a) eller (b) |
| **Brevet byte for byte** | Nei. Stille endring av ensomme surrogater | Ja, tegn for tegn som sendt | Som (a) eller (b) for dokumentene |
| **Speiling til Fabric (AJ-09)** | Tabellen speiles ikke | Speiles. Verdier over 1 MB kortes av | Kolonnene speiles. Dokumentene som i (a) eller (b) |
| **Spørring og indeks** | Beregnet kolonne eller JSON-indeks | Beregnet kolonne med B-treindeks. JSON-indeksen krever `json` | Vanlige indekser på kolonnene |
| **Kostnaden ved byttet** | Lik (b). Liten målt mot resten av datalaget (avsnitt 5) | Lik (a) | Litt mer enn (a) og (b). AJ-19 er alt løst av kolonnen `sak_metadata.catenda_topic_id` |

Hva (c) betyr konkret i dag: journalen og leveringsoppdraget er dokumenter og
bør bli det. Bufferen kan regnes på nytt og trenger ingen skranker på innholdet.
`settings` og `properties` er små metadata som leses hele. Det eneste feltet som
leses med SQL, finnes alt som kolonne (AJ-19). Det er altså lite å flytte ut av
JSON nå. Det (c) først og fremst gir, er en regel for nye felt: et felt som en
spørring, en skranke eller en fremmednøkkel trenger, blir en kolonne.

## 8. Anbefaling (punkt 6)

**Hvis B-12 lander på Azure SQL Database:** (b) og (c) sammen. Journalen og
leveringsoppdraget lagres som `nvarchar(max)` med `ISJSON(…, OBJECT)`, slik at
brevet kan vises tegn for tegn, tabellene kan speiles og ingen verdi endres uten
feil. Felt som spørringer eller skranker trenger, blir kolonner. `json` kan
brukes for bufferen hvis den aldri skal speiles, men det er enklere å ha én form.

**Uavhengig av B-12:** JSON-støtten er ikke et argument mot Azure SQL Database.
Appen bruker JSON som dokumenter, og begge plattformene lagrer dokumenter godt
nok for kjernen. Det som koster ved et bytte, er resten av datalaget (#78).
Spørsmålet om brevet byte for byte gjelder også på PostgreSQL: `jsonb` gir heller
ikke tilbake bytene. Svaret fra juridisk sparring kan derfor gjøre det riktig å
lagre den frosne formen av brevet som tekst på begge plattformene.

**Det som er usikkert:**

- Prøvene er kjørt mot SQL Server 2025 i Docker, ikke mot Azure SQL Database
  (AJ-11).
- Om Fabric-speiling er med i kostnadsgrunnlaget (#78, spørsmål 2).
- Om lisensvilkårene og størrelsen på bildet passer CI (AJ-12).
- Om andre skrivere enn TS-serveren, for eksempel Python, kan skrive ensomme
  surrogater (avsnitt 4, #373).
- Hva etterprøvbarheten krever (avsnitt 6).

## 9. Spørsmål bare oppdragsgiver kan avgjøre

1. **Hvilken form skal det frosne brevet ha?**
   - (i) Innholdet som JSON, med kontrollsum over kanonisk form, som i dag.
   - (ii) I tillegg nøyaktig den teksten som ble sendt, lagret som tekst.
   - (iii) Avvent juridisk sparring på spørsmålet i avsnitt 6.

   Anbefaling: (iii), fordi svaret avgjør om (i) holder. Valget gjelder begge
   plattformene.
2. **Skal JSON lagres som tekst med kontroll også hvis B-12 blir Azure SQL
   Database, selv om `json`-typen er raskere å spørre i?**
   - (i) Tekst med `ISJSON` for journalen og leveringsoppdraget, `json` der det
     ikke betyr noe.
   - (ii) `json` overalt.
   - (iii) Tekst overalt.

   Anbefaling: (i) eller (iii), fordi speilingen og stille endringer taler mot
   (ii), og appen nesten ikke spør i JSON (AJ-19).
3. **Skal speiling til Fabric med brevinnholdet være et krav?** Svaret avgjør om
   AJ-09 utelukker `json` for journalen, og det hører sammen med spørsmål 2 i #78.

## Verifikasjon og grenser

**Kjørt og observert 11.10:**

- SQL Server 2025 CU9 (17.0.5005.3, Enterprise Developer Edition) i Docker fra
  `mcr.microsoft.com/mssql/server:2025-CU9-ubuntu-24.04`: `json`-kolonne med
  innsetting og gjenlesing, avvisning av ugyldig JSON, en streng på toppnivå og
  129 nivåer, doble nøkler, `JSON_VALUE`, `CREATE JSON INDEX`, beregnet kolonne
  med B-treindeks, `ISJSON(…, OBJECT)` i en `CHECK`, og
  `sys.dm_exec_describe_first_result_set`.
- Rundturene i avsnitt 4 gjennom `mssql` 11.0.2 mot `json` og `nvarchar(max)`, og
  gjennom `pg` mot `jsonb` i testbasen (PostgreSQL 17).
- Katalogspørringene i avsnitt 5 mot testbasen, bygget fra migrasjonene.
- `npx vitest run server/tester/skive.test.ts`: 13 av 13 grønne.

**Lest ut av koden og migrasjonene:** skrive- og lesestedene i avsnitt 5 og det
som står om brevteksten i avsnitt 6.

**Lest i Microsofts dokumentasjon:** AJ-01–AJ-09 og AJ-11, i kildefilene til de
lenkede sidene, med datoene i tabellene. Sidene på `learn.microsoft.com` er ikke
åpnet direkte, så det er ikke kontrollert at den publiserte teksten er lik
kildefilene.

**Ikke kontrollert:**

- Noe mot en database i Azure: tjenestenivåene, serverløs, gratistilbudet og om
  Azure SQL Database oppfører seg som SQL Server 2025 i prøvene (AJ-07, AJ-11).
- Speiling til Fabric i praksis. AJ-09 bygger bare på dokumentasjonen.
- Python-driveren for SQL Server (`pyodbc` eller `mssql-python`) og hva den gir
  tilbake for `json`.
- Ytelse og lagringsplass for de tre formene.
- Lisensvilkårene for Developer-utgaven i CI, og om bildet passer CI-jobben og
  hooken (AJ-12).
- Om andre skrivere enn TS-serveren kan skrive ensomme surrogater.
- `-0` og store heltall gjennom `nvarchar(max)`.
- Hvordan resten av datalaget lar seg uttrykke i T-SQL. Det hører til #78.
