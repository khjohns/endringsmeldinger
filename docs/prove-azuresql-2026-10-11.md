# Prøve: tilgangsmekanismen og lagringsformene i T-SQL (B-12, #395)

**Dato og grunnlag:** 11.10.2026, kontrollert mot `6f56672` på `main`, gren
`claude/azuresql-prove-395`. Bestilt som punkt 1 i
[#395](https://github.com/khjohns/endringsmeldinger/issues/395). Vedtakene står i
hovedplanen:
[B-12, databasen](plans/2026-09-16-godkjenning-og-varig-levering.md#b-12-databasen),
[merknaden 11.10 til B-12](plans/2026-09-16-godkjenning-og-varig-levering.md#b-12-merknad-2026-10-11),
[B-19](plans/2026-09-16-godkjenning-og-varig-levering.md#b-19),
[RP-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#rp-u1),
[HF-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#hf-u1) og
[LV-U1](plans/2026-09-16-godkjenning-og-varig-levering.md#lv-u1). Dokumentet
avgjør ikke lagringsformen. Den velges etter sparringen i punkt 2 i #395.

Appen er ikke i produksjon og har ingen reelle data. Belegg er merket etter
[1.3 i hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#13-begreper-som-holdes-adskilt):
**K** kjørt og observert, **L** lest i koden, **—** ikke kontrollert. **MS** er
det Microsoft dokumenterer, lest i kildefilene i `MicrosoftDocs/sql-docs`
(grenen `live`) og `MicrosoftDocs/fabric-docs` (grenen `main`) 11.10, med
dokumentets egen dato.

Prøvekoden står i [`prove/azuresql/`](../prove/azuresql/kjor.sh). Den kjøres ikke
av `npm test` eller CI.

## 1. Spørsmålet og kort svar

Sikkerhetsinvariantene hviler i dag på RLS, `SECURITY DEFINER`, roller og
`koe_resolve_identity` i PL/pgSQL. Prøven skulle vise om de lar seg uttrykke i
T-SQL, og vise de to lagringsformene i #395 på samme brev:

- **(a)** ett dokument per brev er kilden, som tekst kontrollert med `ISJSON`,
  med avledede tabeller over utsagnene;
- **(b)** utsagnene i egne tabeller er kilden, med et frosset leveringsdokument.

Kort svar:

- **Tilgangsmekanismen lar seg uttrykke i T-SQL**, med tre forskjeller fra
  PostgreSQL som må håndteres uttrykkelig: konteksten gjelder sesjonen og
  overlever gjenbruk i poolen (SQ-02), RLS gjelder også eieren (SQ-01), og RLS
  filtrerer `inserted` i en trigger (SQ-04). Prøven binder konteksten til
  transaksjonen, og en gjenbrukt forbindelse leser og skriver ingenting etter
  COMMIT eller ROLLBACK (SQ-03).
- **Begge lagringsformene holder** det #395 ba om: samlet lagring, ingen del
  kan legges til et lagret brev, og samme tolkning i kjernen etter gjenlesing.
  Alle 50 forløpene i bevis-sakene går gjennom begge formene, og gjenlesingen er
  lik det som ble skrevet (SQ-11).
- **Formene skiller seg i det kjernen ikke kjenner.** (a) lagrer teksten, og
  saken blir ikke forstått (MM-U2). (b) har ikke plass til det og må avvise det
  ved skriving; ellers forsvinner det uten feil (SQ-14, SQ-15).
- **Identitetsoppslaget lar seg uttrykke i T-SQL** med samme issuer og
  normaliserte subjekt, og tjue samtidige oppslag gir én bruker (SQ-20).
- **Vekten:** bildet er 2,42 GB, nedlastingen tok 47 s og oppstarten 18 s, og
  serveren brukte om lag 0,5 GB minne etter oppstart (avsnitt 6).

## 2. Oppsettet

`npm --prefix prove/azuresql run prove` starter en tom container fra
`mcr.microsoft.com/mssql/server:2025-CU9-ubuntu-24.04` (SQL Server 2025,
samme bilde som i [vurderingen av JSON](vurdering-json-azure-sql-2026-10-11.md#3-testbasen-punkt-2)),
bygger én base per testfil, kjører testene og feilinnføringene, og fjerner
containeren. Azure SQL Edge er ikke brukt: den har ikke typebegrensningen i
`ISJSON` eller `json`-typen fra SQL Server 2022 og 2025 (—, ikke prøvd).

| Del | Fil | Hva |
| --- | --- | --- |
| Tabellene | [`01_skjema.sql`](../prove/azuresql/sql/01_skjema.sql) | Identitet, prosjekter, medlemskap, kontraktsteam, saker og notater; form (a) i `form_a`, form (b) i `form_b` |
| Predikatene og vaktene | [`02_sikkerhet.sql`](../prove/azuresql/sql/02_sikkerhet.sql) | RLS-predikatene, uforanderlighet og vakten mot nye deler |
| Kommandoene | [`03_kommandoer.sql`](../prove/azuresql/sql/03_kommandoer.sql) | `koe_api.sett_kontekst`, `opprett_sak`, `registrer_a`, `registrer_b`, notatene og identiteten |
| Rettigheter og policy | [`04_tilgang.sql`](../prove/azuresql/sql/04_tilgang.sql) | Rollen `koe_runtime` og sikkerhetspolicyen |
| Banen for kjernen | [`lib/baner.ts`](../prove/azuresql/lib/baner.ts) | `Bane` fra `kjerne/tester/bane.ts` gjennom begge formene |
| Testene | [`tester/`](../prove/azuresql/tester/tilgang.test.ts) | Tilgang, lagring og identitet |
| Feilinnføringene | [`feilinnfoering/`](../prove/azuresql/feilinnfoering/uten_transaksjonsbinding.sql) | Elleve feil, hver skal gi rød test |

Basen opprettes med sorteringen `Latin1_General_100_BIN2_UTF8`, slik at ID-er
sammenliknes tegn for tegn som i PostgreSQL (SQ-08). Runtime logger inn som
`koe_runtime_login`, medlem av `koe_runtime`, med `EXECUTE` på `koe_api` og
`SELECT` på tabellene for lesing. Kjernen er lest og importert, ikke endret.

## 3. Tilgangsmekanismen (B-02 alternativ C)

| ID | Forhold | Belegg |
| --- | --- | --- |
| SQ-01 | **RLS gjelder også eieren.** `sa` og `dbo` ser ingen rader uten kontekst. I PostgreSQL har eieren `BYPASSRLS` i testbasen. Det er strengere, men det betyr også at triggere, kommandoer og driftsspørringer leser gjennom predikatene | K (`RLS gjelder også sa og dbo` i `tilgang.test.ts`); MS 11.09.2025 ([Row-level security](https://learn.microsoft.com/en-us/sql/relational-databases/security/row-level-security)): «Security policies apply to all users, including dbo users» |
| SQ-02 | **Konteksten gjelder sesjonen og overlever gjenbruk.** `SESSION_CONTEXT` har ingen transaksjonslokal form som `set_config(…, true)`. `mssql` 12.7.1 (`tedious` 20.3.7) nullstiller ikke forbindelsen når poolen gir den ut igjen: på samme `@@SPID` lå `koe_aktor` igjen etter både COMMIT og ROLLBACK | K (gjenbruk med `pool.max = 1` i `tilgang.test.ts`) |
| SQ-03 | **Konteksten bindes til transaksjonen.** `koe_api.sett_kontekst` krever en åpen transaksjon og lagrer `CURRENT_TRANSACTION_ID()` som `koe_tx`. Hvert predikat og `koe_sikkerhet.handlende()`, som kommandoene leser aktøren fra, krever at `koe_tx` er transaksjonen som kjører. Etter COMMIT eller ROLLBACK leser en ny transaksjon på samme forbindelse 0 rader i hver tabell runtime kan lese, og `opprett_sak`, `registrer_a`, `registrer_b` og `skriv_notat` avvises (51403), selv om verdiene ligger igjen. Tre tabeller har ingen rader da (`koe.notat`, `form_b.opplysning` og `form_b.dokumentasjon`), så for dem viser lesingen ingenting. For `opprett_sak` er bindingen i `handlende()` første vakt og blokkpredikatet på `koe.sak_metadata` det andre laget. For de tre andre stopper filteret på `koe.sak_metadata` kommandoen før bindingen i `handlende()` får betydning. Det oppfyller akseptkriteriet i F0b om gjenbrukt forbindelse uten at noen må rydde. Kriteriet om at en satt variabel leses som tom og ikke `NULL`, gjelder `set_config` i PostgreSQL og har ingen motpart: `SESSION_CONTEXT` gir `NULL` for en nøkkel som ikke er satt, og predikatene behandler `NULL` som ingen tilgang | K; feilinnføringene `uten_transaksjonsbinding` og `handlende_uten_tx` gir rødt; MS 24.07.2017 (`CURRENT_TRANSACTION_ID` finnes i SQL Server 2016 og senere og i Azure SQL Database). Kontrollert av orkestratoren, ikke gjentatt i en test: nestet `BEGIN TRAN` og et savepoint beholder ID-en, ID-en endres etter ROLLBACK, og etter en feil med `XACT_ABORT` leser samme forbindelse 0 rader før klienten har rullet tilbake. Distribuerte og elastiske transaksjoner er ikke prøvd |
| SQ-04 | **RLS filtrerer `inserted` i en trigger.** En vakt skrevet som `IF EXISTS (SELECT … FROM inserted …)` så null rader når eieren satte inn uten kontekst, og slapp delen gjennom (fail-open). Vakten teller nå de godkjente radene og sammenlikner med `ROWCOUNT_BIG()`, som RLS ikke påvirker. ID-en til en transaksjon er bare entydig i én instans mellom to omstarter, ikke etter en omstart eller failover. Vakten krever derfor også at dokumentraden har samme `skriving`, en ny GUID kommandoen lager, legger i konteksten og fjerner igjen når delene er skrevet. En del lagt til etter kommandoen i samme transaksjon avvises | K (funnet under prøven: `påvirket 1, synlige i inserted 0`); feilinnføringene `rls_i_inserted` og `uten_skrivevakt` gir rødt; MS nevner det ikke (—) |
| SQ-05 | **`SECURITY DEFINER` svarer til eierskapskjeden.** Kommandoene og tabellene eies av `dbo`, så runtime trenger bare `EXECUTE`. Kjeden brytes av dynamisk SQL, som kommandoene ikke bruker. Runtime avvises ved `INSERT`, `UPDATE` og `DELETE` på journalen og notatene og ved lesing av identitet, medlemskap og kontraktsteam (229), ved `TRUNCATE` og `DISABLE TRIGGER` (1088), ved å slå av policyen (33268), ved `EXECUTE AS USER = 'dbo'` (15517), ved `CREATE TABLE` (262) og ved å endre en kommando (3701) | K (`rettighetene til runtime` i `tilgang.test.ts`) |
| SQ-06 | **Prosjektgrensen.** Lesing krever aktivt medlemskap i prosjektet i konteksten. Hver tabell, visning og tabellverdifunksjon runtime kan lese, har prosjektgrensen som filterpredikat: en katalogtest krever at `predicate_definition` er `koe_sikkerhet.medlem(prosjekt_id)`, eller `notat_synlig` for notatene. Unntakene er begrunnet: `form_b.felt` (formatet, ingen saksdata) og `form_b.avvik` (leser bare argumentet og feltregisteret). Uten kontekst ser runtime ingen rad i noen av tabellene, og i kontekst B ingen rad fra prosjekt A. Oppsettet har rader i hver tabell unntatt `koe.notat`, der notatene skrives senere i testfila; der er katalogtesten og notattestene beviset. Et medlem av to prosjekter ser bare prosjektet i konteksten. Skriving i en sak i et annet prosjekt, en ukjent sak, leserolle, inaktivt medlemskap, et team som ikke er kontraktsteam, et team fra et annet prosjekt, et TE-team oppgitt med side BH og manglende team gir samme svar (51403). Kommandoen lager sak-ID-en (TM-11). Et prosjekt som ikke er aktivt, gir verken lesing eller skriving, som policyen i PostgreSQL. Prøven krever team for all skriving; design v2, avsnitt 4, gjør teamet valgfritt for varsel. Det er strengere, og et varsel uten team er ikke prøvd | K; feilinnføringene `uten_prosjektgrense`, `uten_predikat.etter` (filterpredikatet fjernet fra to tabeller) og `slipper_alt.etter` (filteret byttet mot et predikat som slipper alt) gir rødt |
| SQ-07 | **Skjerming av notater på team, fail-closed.** Notatet vises bare for teamet som skrev det, med handlingsrett og riktig side. Motparten, leserollen, et fremmed team, feil side, manglende team og et team fra prosjekt B i kontekst A ser det ikke. Et team registrert i to prosjekter er ikke prøvd. Et notat uten team vises til ingen, heller ikke forfatteren. Blokkpredikatene ved `INSERT` og `UPDATE` hindrer også eieren i å skrive et notat uten team eller i en annen aktørs navn, eller flytte et notat dit (33504). Sletting gjelder bare eget notat | K; feilinnføringen `uten_teamgrense` gir rødt |
| SQ-08 | **Sorteringen.** Standardsorteringen i SQL Server og Azure SQL Database, `SQL_Latin1_General_CP1_CI_AS`, skiller ikke store og små bokstaver. Med den ville `Oslobygg` og `oslobygg`, og et team i store og små bokstaver, vært samme verdi. Prøven oppretter basen med en binær sortering, og et team med store bokstaver avvises | K (team med store bokstaver i `tilgang.test.ts`); standardsorteringen i Azure SQL Database — |
| SQ-09 | **Aktørfeltene settes av kommandoen.** `registrer_a`, `registrer_b`, `skriv_notat` og `opprett_sak` har ingen parameter for aktør, side, team eller oppretter; de stemples fra konteksten. Blokkpredikatene på dokumentraden, notatet og saken krever at feltene er konteksten, som et andre lag; eieren avvises når den oppretter en sak i en annen aktørs navn (33504). `aktor_id`, `created_by` og `event_id` lagres bare med små bokstaver, så samme UUID ikke kan stå i to former | K |
| SQ-10 | **Hva kontekstnøklene er.** Runtime kan kalle `sp_set_session_context` selv, også med `koe_tx`. Det er samme tillit som i PostgreSQL, der runtime setter kravene med `set_config`: basen kontrollerer medlemskap, side og team, men ikke at brukeren faktisk sitter i teamet (TM-03 i design v2) | L |

## 4. Lagringsformene

### 4.1 Det begge holder

| ID | Forhold | Belegg |
| --- | --- | --- |
| SQ-11 | **Samme tolkning etter gjenlesing.** Forløp A (krav i tre spor, brev med svar i grunnlag, vederlag og frist, revidert vederlagssvar og aksept) og alle 50 forløpene i `bevis-saker-maalmodell.json` kjøres med kjernens `kjoer` gjennom hver form. Kjernen leser journalen fra basen før hver utledning. Etterpå er gjenlesingen lik radene som ble skrevet, og utledningen er lik utledningen av radene i minnet | K (`lagring.test.ts`, begge former) |
| SQ-12 | **Samlet lagring.** Brevet med tre svar, delene og leveringsoppdraget lagres i én transaksjon i én kommando. En krok som kaster før COMMIT, en forbindelse som drepes med `KILL`, en feil i siste del (oppdraget er ikke et JSON-objekt) og en versjonskonflikt etterlater ingen rad i noen av tabellene. Kontrollsaken lagrer alle | K; feilinnføringen `uten_versjonskontroll` gir rødt |
| SQ-13 | **Ingen del kan legges til et lagret brev.** Runtime har ingen skriverett (229). Eieren avvises når en del settes inn i en annen transaksjon enn dokumentraden, med eller uten kontekst (51002), og ved `UPDATE` og `DELETE` på dokumentet, en del eller oppdraget (51001). Hver del er bundet til dokumentet med en fremmednøkkel over `event_id` og `prosjekt_id`; standpunktene og virkningene til svaret med `prosjekt_id`. Samme brev kan ikke registreres på nytt med flere deler (2627), og en `event_id` med store bokstaver avvises, så samme UUID ikke kan stå i to former (547). `TRUNCATE` avfyrer ingen trigger; den krever `ALTER`, som runtime ikke har, og eieren er ikke prøvd | K; fremmednøklene L (`01_skjema.sql`); `TRUNCATE` som eier — |
| SQ-23 | **Leveringsdokumentet.** I begge formene er det frosne oppdraget lik brevet slik journalen har det, og summen kan regnes på nytt av teksten basen gir tilbake | K |

### 4.2 Der de skiller seg

| ID | Forhold | (a) dokumentet er kilden | (b) tabellene er kilden | Belegg |
| --- | --- | --- | --- | --- |
| SQ-14 | **Innhold kjernen ikke kjenner** | En ukjent art, et ukjent felt, `null`, en tom liste, et tall der formatet har sann/usann, en tekst der det har et tall, et tomt objekt, et objekt der formatet har en liste og en ukjent hendelsestype lagres som tekst, og saken er ikke forstått (MM-U2) | En ukjent art og et ukjent format lagres og gir en sak som ikke er forstått. De åtte andre avvises før noe skrives (51423): de har ingen kolonne, eller de ville kommet annerledes tilbake | K (`innhold kjernen ikke kjenner`); feilinnføringen `uten_feltkontroll` gir rødt |
| SQ-15 | **Formatet har to hjem i (b)** | Formatet står bare i kjernen. De avledede tabellene leses med `TRY_CAST` og får NULL der formatet har endret seg; teksten mister ingenting, men tabellene driver like stille fra kjernen | Feltregisteret `form_b.felt`, kolonnene, kommandoen og leseren er en andre kopi av skjemaet i `kjerne/format/format.ts`. Står et felt i registeret uten at kommandoen og leseren kjenner det, godtas det og forsvinner uten feil, og kjernen forstår saken. Leveringsdokumentet har feltet, så tabellene og dokumentet er uenige | K (karakteriserende test, `et nytt felt som bare står i registeret`) |
| SQ-16 | **Tekst og tall** | `data` kommer tilbake tegn for tegn som sendt, også `æøå`, U+2028, emoji, et ensomt surrogat og NUL (som `JSON.stringify` skriver som `\u`-sekvenser) | Verdiene kommer tilbake like etter gjenoppbyggingen, også `0.30000000000000004` i en `float`-kolonne lest med driveren. `FOR JSON` skriver `float` med 16 sifre og gir `0.3`; en visning eller rapport bygd med `FOR JSON` endrer slike tall | K |
| SQ-17 | **Omfanget** | Kommandoen er om lag 50 linjer T-SQL, de avledede tabellene leses med `TRY_CAST`, og leseren er `JSON.parse` | Kommandoen er om lag 150 linjer T-SQL med kontrollen av felt og typer, ti tabeller, og leseren som bygger dokumentet opp igjen er om lag 80 linjer TypeScript | L (`03_kommandoer.sql`, `lib/baner.ts`) |
| SQ-18 | **Fabric (RP-U1)** | Kilden `data` er én `nvarchar(max)`-kolonne. Over 1 MB kortes den av i OneLake | Kilden står i kolonner, som speiles hver for seg; bare lange tekster kan kortes av. I begge formene er det frosne brevet (oppdraget i (a), leveringsdokumentet i (b)) JSON i `nvarchar(max)` og kortes av likt; forskjellen gjelder bare kilden | MS 26.02.2026 ([Azure SQL Database](https://learn.microsoft.com/en-us/fabric/mirroring/azure-sql-database-limitations)); — |
| SQ-19 | **Spørring** | De avledede tabellene gir kravene, svarene og utsagnene per brev med vanlige kolonner. Bare det som er trukket ut, kan spørres uten JSON-funksjoner | Alt innhold står i kolonner | K for at tabellene fylles; ytelse — |

For begge formene gjelder: RLS følger ikke med til Fabric. Microsoft skriver at
RLS er støttet, men at tilgangen ikke overføres til dataene i OneLake (MS
26.02.2026, samme side). Skjermingen etter team i RP-U1 må derfor etableres i
Fabric, eller notatene holdes utenfor speilingen, uansett lagringsform.

### 4.3 Det valget avhenger av

Prøven anbefaler ikke en form; det gjør sparringen og oppdragsgiver. Det
prøven viser, er dette:

- Begge formene holder kravene i HF-U1 og LV-U1 med den samme
  tilgangsmekanismen, og kjernen leser dem likt.
- I (a) er kjernen den eneste som kjenner formatet. Innhold den ikke kjenner,
  bevares og stopper saken (MM-U2). Tabellene over utsagnene er avledet av
  teksten. Å bygge dem på nytt er ikke prøvd (—), og vaktene i prøven avviser
  `UPDATE`, `DELETE` og `INSERT` utenfor brevets transaksjon, også for eieren;
  det ville kreve en egen vei, for eksempel en migrasjon som slår vaktene av.
- I (b) kjenner også basen formatet. Det gir vanlige kolonner for spørring og
  speiling, men hver endring i formatet krever en migrasjon og samme endring i
  registeret, kommandoen og leseren, og en glipp er stille (SQ-15). Innhold
  kjernen ikke kjenner, må avvises ved skriving, så en eldre basemigrasjon og en
  nyere kjerne kan ikke skrive et nytt felt før migrasjonen er ute.

## 5. Identiteten (B-19)

| ID | Forhold | Belegg |
| --- | --- | --- |
| SQ-20 | **`koe_resolve_identity` i T-SQL.** `koe.resolve_identity` leser identiteten med `UPDLOCK, HOLDLOCK`, som låser nøkkelområdet, og oppretter bruker og identitet ellers. Det svarer til `pg_advisory_xact_lock` i PL/pgSQL. Tjue samtidige oppslag av et nytt subjekt gav én bruker og én identitet. En tom e-post eller et tomt navn skriver ikke over | K (`identitet.test.ts`); L (`koe_resolve_identity` i katalogen i testbasen) |
| SQ-21 | **Den smale inngangen.** `koe_api.catenda_identitet` har låst provider og issuer (`https://api.catenda.com`, som `CatendaOAuth.BASE`) og krever `catenda_id()`-formen: 32 små heksadesimale tegn. Store bokstaver, UUID med bindestreker, 31 og 33 tegn, mellomrom til slutt, et annet tegn, tomt og `NULL` avvises (52022). Runtime kan ikke kalle den generelle funksjonen (229) | K; feilinnføringen `uten_normalisering` gir rødt |
| SQ-22 | **Ikke skrevet:** medlemssynkroniseringen (`koe_reconcile_memberships`), `koe_register_project` og `koe_set_contract_teams`. De pakker ut JSON-parametre (AJ-21 i vurderingen), som i T-SQL blir `OPENJSON` eller en tabellverdiparameter | — |

## 6. Hvor tungt det blir

Målt i skyøkta 11.10, med 4 kjerner og 15,7 GB minne. Første kjøring lastet
ned bildet på nytt; den siste kjørte etter rettingene fra code-review.

| Mål | SQL Server 2025 | `postgres:17` til sammenlikning |
| --- | --- | --- |
| Bildet på disk | 2,42 GB (634 MB komprimert) | 646 MB |
| Nedlasting fra MCR | 47,1 s (54,6 s tidligere samme dag) | — |
| Fra `docker run` til første svar | 17,6 s med nytt bilde; mellom 10,2 og 11,9 s i seks senere kjøringer, 21,9 s i én og 95,8 s i én (de to siste med om lag 805 MiB etter oppstart; årsaken er ikke undersøkt) | — |
| Minne etter oppstart | 498 MiB | — |
| Minne etter testene | mellom 607 og 628 MiB, og 936 MiB i kjøringen med 805 MiB etter oppstart | — |
| Testene i tre filer, fire baser | 52,5 s (198 tester) og 58,7 s (211) | — |
| Hele `kjor.sh` med feilinnføringene | 5 min 18 s med nedlasting og sju, 6 min 8 s uten nedlasting og med elleve | — |

**Skyøktene.** Hooken `.claude/hooks/session-start.sh` bygger i dag
PostgreSQL-testbasen. Skal den også starte SQL Server, legger det til om lag ett
minutt ved første start i en ny container (nedlasting og oppstart), 2,4 GB disk
og om lag 0,5 GB minne. Disken i skyøkta er en fast tildeling; 2,4 GB er en
merkbar del av den. Det er ikke prøvd i hooken.

**CI.** En jobb med SQL Server må laste ned bildet hver gang uten hurtigbuffer:
om lag ett minutt, pluss oppstart. Bildet ligger på MCR, ikke Docker Hub, så
grensen for uautentiserte nedlastinger som traff `postgres:17` i #327, gjelder
ikke på samme måte. Om MCR har en egen grense for delte runnere, er ikke
kontrollert (—). Developer-utgaven er for utvikling og test; om vilkårene dekker
CI i GitHub Actions, er ikke kontrollert (AJ-12 i vurderingen).

## 7. SQL Server i Docker mot Azure SQL Database

Prøven er kjørt mot SQL Server 2025 i Docker, ikke mot Azure SQL Database.

| Forhold | I prøven | I Azure SQL Database | Belegg |
| --- | --- | --- | --- |
| Innlogging for runtime | SQL-innlogging med passord | Managed identity (B-12, #78): en databasebruker `FROM EXTERNAL PROVIDER`. Rollen og rettighetene er de samme | Ikke prøvd |
| Eier og administrator | `sa` | Serveradministrator eller Entra-administrator; ingen `sa`. RLS gjelder `dbo` på samme måte | MS 11.09.2025; ikke prøvd |
| `CURRENT_TRANSACTION_ID`, `SESSION_CONTEXT`, RLS, `OPENJSON` | Prøvd | Dokumentert for Azure SQL Database | MS; ikke prøvd |
| Nullstilling av sesjonen | Driveren nullstiller ikke (SQ-02) | Avhenger av driveren, ikke av tjenesten. Bindingen til transaksjonen i SQ-03 gjelder uansett | Ikke prøvd |
| Sorteringen | Satt ved `CREATE DATABASE` | Settes når basen opprettes | Ikke prøvd |
| `READ_COMMITTED_SNAPSHOT` og akselerert gjenoppretting (ADR) | Av (standard i SQL Server) | På som standard. Orkestratoren kjørte prøven med RCSI og snapshot på: 208 av 208 grønne. Samtidige skrivinger i samme sak er ikke prøvd med det. Versjonskontrollen leser med `UPDLOCK, HOLDLOCK`, som tar lås også under RCSI | Kontroll av orkestratoren; ADR ikke prøvd |
| Kompatibilitetsnivå | Standard for SQL Server 2025 | Settes per base | Ikke prøvd |
| Oppsettet i `lib/oppsett.ts` | `CREATE LOGIN … CHECK_POLICY = OFF` og `SET SINGLE_USER` | Kjører ikke uendret: brukeren lages fra managed identity, og basen slettes uten `SINGLE_USER` | L |
| `KILL` | Prøvd | — | Ikke prøvd |
| `json`-typen og `OPENJSON` over den | Ikke brukt; begge formene lagrer tekst | AJ-07 i vurderingen | — |
| Speiling til Fabric | Ikke mulig lokalt | SQ-18 og RLS i avsnitt 4.2 | MS 26.02.2026; ikke prøvd |

## Verifikasjon og grenser

**Kjørt og observert 11.10:**

- `npm --prefix prove/azuresql run prove` fra en tom tilstand, med bildet
  fjernet først: nedlasting, oppstart og 198 av 198 tester grønne.
- Den samme kommandoen etter rettingene fra code-review og fra orkestratorens
  kontroll, med en ny container og bildet lokalt: 211 av 211 grønne, 154 i
  `lagring.test.ts` (blant dem de 50 forløpene i hver form), 45 i
  `tilgang.test.ts` og 12 i `identitet.test.ts`.
- Feilinnføringene i den siste kjøringen, hver for seg i en ny base, og alle
  oppdaget: `handlende_uten_tx` (2 røde), `rls_i_inserted` (4),
  `slipper_alt.etter` (5), `uten_feltkontroll` (8), `uten_normalisering` (8), `uten_predikat.etter` (5),
  `uten_prosjektgrense` (3), `uten_skrivevakt` (2), `uten_teamgrense` (5),
  `uten_transaksjonsbinding` (3) og `uten_versjonskontroll` (1). `kjor.sh`
  regner en feilinnføring som oppdaget bare når tester er røde og oppsettet
  ikke feilet.
- Eksperimentene i en egen container før prøven ble skrevet: transaksjonsbindingen
  i et predikat, at RLS gjelder `sa`, at poolen ikke nullstiller konteksten, og
  `FOR JSON` for `float`.

**Lest i koden og katalogen:** `koe_resolve_identity` i testbasen,
`server/autorisasjon.ts` for medlemskap og kontraktsteam, `server/levering.ts`
for leveringsoppdraget, og kjernens format i `kjerne/format/`.

**Ikke kontrollert:**

- Noe mot Azure SQL Database eller Fabric (avsnitt 7).
- Medlemssynkroniseringen og prosjektregistreringen i T-SQL (SQ-22).
- Ytelse og lagringsplass for formene, og indekser på de avledede tabellene.
- `TRUNCATE` som eier (SQ-13), break-glass og revisjonslogg.
- At `skriving` gjør vakten i SQ-04 varig over en omstart; det er lest, ikke
  prøvd med en omstart.
- Godkjenningspakker, utkast og levering ut av basen. Leveringsoppdraget i
  prøven er en forenklet form av `lagOppdrag` uten mål i Catenda.
- Hooken i skyøktene og en CI-jobb med SQL Server (avsnitt 6). `npm run lint`
  kjører prettier bare for omfanget i `package.json`, som ikke tar med
  `prove/`; formateringen der er kjørt for hånd.
- Tidsbaserte sidekanaler og samtidige skrivinger i samme sak utover
  versjonskonflikten.
