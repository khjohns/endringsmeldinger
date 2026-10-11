---
paths:
  - "supabase/**"
  - "backend/repositories/**"
  - "backend/tests/fixtures/supabase_dobbel.py"
  - "backend/tests/test_database/**"
  - "scripts/testbase/**"
  - "scripts/avstem_migrasjonshistorikk.sh"
  - "docs/migrasjoner-og-testbase.md"
  - "sprakprove/**/server/**"
  - "server/**"
  - "sprakprove/kjernelagring/**"
---

# Database og migrasjoner

**Plattformen er ikke valgt (B-12).** Supabase-prosjektene brukes ikke inntil
videre; endre dem ikke, og les ikke saksdata der. Der en base trengs, er det
lokal PostgreSQL 17: testbasen, bygget fra migrasjonene med `scripts/testbase/`
(merknaden 09.10 til B-12 i hovedplanen). Det som står om Supabase her og i
`docs/migrasjoner-og-testbase.md`, beskriver oppsettet migrasjonene er skrevet
for.

**Katalogen i testbasen er kilden for skjemaet.** Migrasjonene er innholdsmessig
komplette — hver tabell, funksjon og trigger i `public` har sin DDL i
`supabase/migrations/` — men en funksjon kan være definert på nytt i en senere
fil, og rettigheter kommer også fra plattformstubben. Spør derfor katalogen
(`pg_proc`, `pg_trigger`, `pg_policy`, rettighetene) i en base bygget fra
migrasjonene, og les ikke kjøretidstilstanden ut av filene. Å utlede den fra
migrasjonsfiler er den dokumenterte årsaken til flere feilklassifiserte funn, og
docstringene er utdaterte.

**Skjemaet endres bare gjennom en migrasjonsfil i `supabase/migrations/`, aldri
med DDL rett mot en base eller med et verktøy som stempler sin egen versjon**
(som `apply_migration` over Supabase-MCP). Versjonen i basen skal være versjonen i filnavnet (DA-03). På
Supabase anvendes fila med `supabase db push`; veien fra fil til base på den
plattformen som velges, avhenger av B-12. Filnavnrekkefølgen er
apply-rekkefølgen, og CI-jobben `database` bygger hele settet mot PostgreSQL 17
ved hver PR. Åtte av nitten tabeller har ingen eksplisitt `GRANT` i repoet og
virker bare fordi Supabase deler ut rettigheter. Testbasen, stubben av
plattformen, katalogsummene og fallgruvene i PostgreSQL 18 står i
`docs/migrasjoner-og-testbase.md`.

Endrer du en migrasjon, bygg testbasen på nytt med `stopp` og `start` i
`scripts/testbase/docker_testbase.sh`, og sett `KOE_TESTBASE_URL` til den nye
URL-en.

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
og alt. Retter du et ord i en fil som er kjørt, er fila ikke lenger det basen
gjorde. Har innholdet blitt feil, skriv en ny migrasjon eller en datert merknad i
`docs/` — ikke rediger historikken.

**Repoet og en delt base skal ikke drive fra hverandre.** Anvendes en migrasjon
mot en delt base, sier fila hvor og som hvilken versjon. Det har skjedd i begge
retninger: basen var bygget av seks migrasjoner som ikke fantes i repoet, og en
repo-migrasjon lå to dager uten å være anvendt — med den følgen at `actorteam`
ikke fantes, og at **enhver skriving** til Supabase-lageret ble avvist. Begge
deler er rettet 20.09. En endring som bare finnes ett av stedene, er ikke
gjennomført.
