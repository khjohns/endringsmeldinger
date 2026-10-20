---
paths:
  - "supabase/**"
  - "database/**"
  - "backend/repositories/**"
  - "backend/tests/fixtures/supabase_dobbel.py"
  - "scripts/testbase/**"
  - "scripts/avstem_migrasjonshistorikk.sh"
  - "docs/migrasjoner-og-testbase.md"
  - "server/**"
  - "sprakprove/kjernelagring/**"
---

# Database og migrasjoner

Supabase-prosjektene brukes ikke; endre dem ikke, og les ikke saksdata der. For
Python-stien og migrasjonene i `supabase/migrations/` er testbasen lokal
PostgreSQL 17, bygget med `scripts/testbase/` (merknaden 09.10 til B-12 i
hovedplanen). Datalaget i TS bygges mot SQL Server
([DL-U1](../../docs/plans/2026-09-16-godkjenning-og-varig-levering.md#dl-u1)). Det
som står om Supabase her og i `docs/migrasjoner-og-testbase.md`, beskriver
oppsettet migrasjonene er skrevet for.

**Katalogen i testbasen er kilden for skjemaet.** Migrasjonene er innholdsmessig
komplette — hver tabell, funksjon og trigger i `public` har sin DDL i
`supabase/migrations/` — men en funksjon kan være definert på nytt i en senere
fil, og rettigheter kommer også fra plattformstubben. Spør derfor katalogen
(`pg_proc`, `pg_trigger`, `pg_policy`, rettighetene) i en base bygget fra
migrasjonene, og les ikke kjøretidstilstanden ut av filene. Å utlede den fra
migrasjonsfiler er den dokumenterte årsaken til flere feilklassifiserte funn, og
docstringene er utdaterte.

**Skjemaet endres bare gjennom en migrasjonsfil — `supabase/migrations/` for
PostgreSQL, `database/migrasjoner/` for SQL Server — aldri med DDL rett mot en
base eller med et verktøy som stempler sin egen versjon** (som `apply_migration`
over Supabase-MCP). Versjonen i basen skal være versjonen
i filnavnet (DA-03). Filnavnrekkefølgen er apply-rekkefølgen, og CI-jobben
`database` bygger hele settet mot PostgreSQL 17
ved hver PR. Ingen test i TS eller Python bruker den basen (#931). Åtte av
nitten tabeller har ingen eksplisitt `GRANT` i repoet og
virker bare fordi Supabase deler ut rettigheter. Testbasen, stubben av
plattformen, katalogsummene og fallgruvene i PostgreSQL 18 står i
`docs/migrasjoner-og-testbase.md`.

Når PostgreSQL-basen må bygges fra tom, står i «Miljø» i `AGENTS.md`.

**SQL Server: migrasjonene i T-SQL ligger i `database/migrasjoner/`, aldri i
`supabase/migrations/`, og anvendes bare av runneren i `server/migrering.ts`**
(#53, arbeidsvalget 16.10). Filnavnet er `ÅÅÅÅMMDDTTMMSS_navn.sql`; prefikset er
versjonen, og filnavnrekkefølgen er rekkefølgen. Fila deles på linjer med bare
`GO`, og hver fil anvendes i én transaksjon. `koe_migrering.historikk` lagrer
versjonen og sha256 av hele fila, og runneren nekter å kjøre når en anvendt fil
er endret, fjernet eller får en ny fil foran seg. Historikktabellen er det eneste
runneren lager selv. Testbasene bygges fra filene med `opprettMigrertTestbase` i
`server/tester/sqlserver_migrert.ts`, og katalogen i en slik base er kilden, som
for PostgreSQL. Tidspunkter er `datetime2(3)` i UTC med `SYSUTCDATETIME()`
([DL-U3](../../docs/plans/2026-09-16-godkjenning-og-varig-levering.md#dl-u3)).
Brukerne til rollene (`CREATE USER … FROM EXTERNAL PROVIDER`) hører til
utrullingen, ikke migrasjonene (A8 og A9 i #78).

**Fra første ekte sak har skjemaet to trinn** ([DL-U16](../../docs/plans/2026-09-16-godkjenning-og-varig-levering.md#dl-u16)).
En SQL Server-migrasjon legger da bare til og heter `ÅÅÅÅMMDDTTMMSS_navn_tillegg.sql`.
Det som fjernes eller endres, slutter én utgivelse å bruke, og fjernes først i
utgivelsen etter, i en fil som heter `…_fjerning.sql`. Forrige utgivelse starter
mot en base med en nyere `_tillegg`-fil den ikke har (`vurder` i
`server/migrering.ts`), så en tilbakerulling ett trinn trenger ingen
gjenoppretting av basen. En nyere `_fjerning`-fil eller en umarkert fil stopper
oppstarten, som før. En utgivelse med en `_fjerning`-fil kan derfor bare rulles
tilbake ved å gjenopprette basen, så fjerningene legges i egne utgivelser uten
annen endring ([oppdragsgiver 20.10](https://github.com/khjohns/endringsmeldinger/issues/1057#issuecomment-6297925264)). Migrasjonsvakten kontrollerer at en ny `_tillegg`-fil bare
legger til, etter formene i `.github/scripts/tilleggsregel.py`, og avviser det
den ikke kan avgjøre; fra versjonen i `FOERSTE_EKTE_SAK` i
`.github/scripts/migrasjonsvakt.py` krever den at hver ny fil er markert.
Konstanten settes i PR-en som tar basen i bruk for første ekte sak (#1091). At den
forrige utgivelsen ikke lenger bruker det en `_fjerning`-fil fjerner, ser ikke
vakten; det må reviewet kontrollere. Markeringen står i historikken, så den
endres ikke for en anvendt fil. De eksisterende migrasjonene er ikke markert og
berøres ikke.

**Hver tabell i `koe` har en trigger mot endring** (`INSTEAD OF UPDATE, DELETE`
som kaster 51001), utenom den lukkede listen `UTEN_TRIGGER` i
`server/tester/journal.test.ts`, der hver tabell står med begrunnelsen
(arbeidsvalg 3 i #53). En ny tabell i `koe` får triggeren eller en linje i
listen; ellers er testen rød. TRUNCATE avfyrer ingen trigger, men avvises (4712)
for en tabell som en fremmednøkkel fra en annen tabell viser til; en nøkkel
tabellen har til seg selv, hindrer det ikke (#582). Har en ny uforanderlig tabell
ingen slik nøkkel mot seg, får `koe.toemmingsvern` en kolonne med fremmednøkkel
mot den, med `ALTER TABLE koe.toemmingsvern ADD` i en ny migrasjon, slik
`database/migrasjoner/20261020021000_vedleggskvittering_vern.sql` gjør. Kolonnen
legges til i én sats og fremmednøkkelen i neste, etter `GO`; i samme sats feiler
den med «Invalid column name». En ny `nvarchar`-kolonne i vernet får
tegnklassekontrollen (#609), som de andre. Tabellen lages i
`20261020011000_toemmingsvern.sql`, som er anvendt og ikke endres. Testen av
TRUNCATE i `server/tester/journal.test.ts` prøver hver tabell med triggeren og
tabellene i `OGSAA_UTEN_TOEMMING`, og er rød for en av dem uten vern. En tabell
uten triggeren som ikke skal kunne tømmes, føres i `OGSAA_UTEN_TOEMMING`.

**Runneren kjøres som `dbo`, databaseeieren** (#564). Da eies skjemaene filene
lager, av `dbo`, og eierskapskjeden fra `koe_api` og `koe_drift` til tabellene og
predikatene holder (#567). Gi aldri et skjema eieren `dbo` i ettertid med
`ALTER AUTHORIZATION ON SCHEMA`: eierbyttet fjerner rettighetene på objektene i
skjemaet. `kontrollerIdentitet` i `server/migrering.ts` avviser en annen
identitet før applåsen, og runneren leser identiteten igjen etter hver sats, så
en fil som slutter i `EXECUTE AS` uten `REVERT`, stoppes (#866). Testene står i
`server/tester/migrering.test.ts`.

**Radsikkerheten i SQL Server er én policy, `koe_sikkerhet.tilgang`, med
`SCHEMABINDING`** (DL-U5, `database/migrasjoner/20261016110000_tilgang.sql`;
predikatene er sist definert i `20261016130000_mellomrom.sql`).
Den gjelder også eieren: uten kontekst ser ingen noe, så en test som leser
saksdata, leser i en transaksjon med konteksten satt. En ny tabell med
saksdata får filterpredikatet `medlem(prosjekt_id)` og et blokkpredikat for
skrivingen; kjøretiden får rettigheter per objekt, aldri per skjema
(arbeidsvalg 5 i #53). Policyen binder predikatene, så en migrasjon som endrer
et predikat, tar policyen ned og legger den på igjen i samme fil.
`server/tester/tilgang.test.ts` krever filterpredikatet på hver tabell
kjøretiden kan lese, og nøyaktig rettighetene den har.

**En `GRANT` begrenser ikke det en rolle alt har.** Plattformstubben og
Supabase gir `service_role` alle rettigheter på nye tabeller
(`scripts/testbase/plattformstubb.sql`). En tabell som bare skal leses og
utvides, trenger `REVOKE ALL … FROM service_role` før `GRANT`. Eieren berøres
ikke av rettighetene, så skal tabellen være uforanderlig også for eieren, må en
trigger stoppe `UPDATE`, `DELETE` og `TRUNCATE`. Prøv dem som `service_role` i
en test, og les rettighetene i katalogen. Funnet i PR #372 11.10, etter to
runder `/code-review high`.

**Testsuiten kan ikke se at basen er uenig med repoet.** Supabase-lageret dekkes
bare av testdobler, og doblene speiler repoet — `HENDELSE_KOLONNER` i
`tests/fixtures/supabase_dobbel.py` er tro mot migrasjonsfila, ikke mot
databasen. Da `actorteam` manglet i basen, var suiten grønn mens *enhver* skriving til
Supabase-lageret feilet. Grønn suite er derfor ikke bevis for at en skjemaendring
har nådd fram; det er katalogspørringen som er beviset.

**En avvisning fra et Supabase-lager må være en `PermanentError`.**
Skrivemetodene er dekorert med `@with_retry()`, og `classify_error` regner et
ukjent unntak som forbigående. Kaster du en naken `ValueError` for å avvise noe
som aldri kan lykkes — feil hendelsestype, manglende felt — sover lageret og
prøver igjen, og kalleren får `TransientError` framfor det ruta oversetter til
400. `ConcurrencyError` arver `ConflictError` nettopp av denne grunnen, og
`JournalfoeringAvvist` arver `PermanentError` og `ValueError`. Observert 21.09.

**En anvendt migrasjon er uforanderlig — også kommentarene.**
`supabase_migrations.schema_migrations.statements` lagrer rågteksten, kommentarer
og alt, og summen i `koe_migrering.historikk` gjelder hele fila. Retter du et ord i en fil som er kjørt, er fila ikke lenger det basen
gjorde. Har innholdet blitt feil, skriv en ny migrasjon eller en datert merknad i
`docs/` — ikke rediger historikken. CI-jobben `Migrasjoner` håndhever det for
begge mappene; hva den kontrollerer, står i `.github/scripts/migrasjonsvakt.py`
(#1057). `server/tester/oppgradering.test.ts` setter inn rader i
`koe.projects` og `koe.app_membership_sync` før
`20261020000000_synkroniseringsgrense.sql` og kjører alle SQL Server-migrasjonene
fra og med den over radene. En senere SQL Server-migrasjon som endrer rader i
andre tabeller, trenger egne rader der. For `supabase/migrations/` finnes ingen
slik test (#931).

**Repoet og en delt base skal ikke drive fra hverandre.** Anvendes en migrasjon
mot en delt base, sier fila hvor og som hvilken versjon. Det har skjedd i begge
retninger: basen var bygget av seks migrasjoner som ikke fantes i repoet, og en
repo-migrasjon lå to dager uten å være anvendt — med den følgen at `actorteam`
ikke fantes, og at **enhver skriving** til Supabase-lageret ble avvist. Begge
deler er rettet 20.09. En endring som bare finnes ett av stedene, er ikke
gjennomført.
