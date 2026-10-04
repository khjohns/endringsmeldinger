---
paths:
  - "supabase/**"
  - "backend/repositories/**"
  - "backend/tests/fixtures/supabase_dobbel.py"
  - "backend/tests/test_database/**"
  - "scripts/testbase/**"
  - "scripts/avstem_migrasjonshistorikk.sh"
  - "docs/migrasjoner-og-testbase.md"
---

# Database og migrasjoner

**Plattformen er ikke endelig valgt.** Hvilken database og hosting appen skal
kjøre på, er B-12 i hovedplanen. Det som står om PostgreSQL og Supabase her,
beskriver dagens oppsett.

Databasen kan inspiseres direkte gjennom Supabase-MCP — prosjekt `endringsmeldinger`,
ref `gwdxadexwktegkklyobv`. **Bruk det.** Migrasjonene er innholdsmessig komplette —
hver tabell, funksjon og trigger i `public` har sin DDL i `supabase/migrations/` — men
de svarer ikke på det katalogen svarer på: om en fil er anvendt (ikke alle er
registrert i basens historikk), om definisjonen i fila er den som faktisk kjører, og
hvilke rettigheter som gjelder. Å utlede kjøretidstilstand fra migrasjonsfiler er den
dokumenterte årsaken til flere feilklassifiserte funn, og docstringene er utdaterte.
Hold deg til katalogspørringer; saksdata er konfidensiell kontraktskorrespondanse.

Et eldre prosjekt `unified-timeline` (`iyetsvrteyzpirygxenu`) er INACTIVE og skal
ikke røres.

**Migrasjoner anvendes med `supabase db push`, aldri med `apply_migration`
over MCP.** MCP stempler sitt eget tidsstempel, og versjonen i basen skal være
versjonen i filnavnet (DA-03). Filnavnrekkefølgen er apply-rekkefølgen, og
CI-jobben `database` bygger hele settet mot PostgreSQL 17 ved hver PR. Åtte av
nitten tabeller har ingen eksplisitt `GRANT` i repoet og virker bare fordi
Supabase deler ut rettigheter. Hvordan migrasjonene verifiseres mot prosjektet
uten å røre basen, med testbasen, stubben av plattformen, katalogsummene og
fallgruvene i PostgreSQL 18, står i `docs/migrasjoner-og-testbase.md`.

Endrer du en migrasjon, bygg testbasen på nytt med `stopp` og `start` i
`scripts/testbase/docker_testbase.sh`, og sett `KOE_TESTBASE_URL` til den nye
URL-en.

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

**Endrer du databasen, skriv migrasjonsfila i samme runde.** All DDL skal ligge i
`supabase/migrations/` med samme SQL som faktisk ble kjørt, og fila skal si at den
er anvendt. Repoet og basen har drevet fra hverandre i begge retninger før: basen
var bygget av seks migrasjoner som ikke fantes i repoet, og en repo-migrasjon lå
to dager uten å være anvendt — med den følgen at `actorteam` ikke fantes, og at
**enhver skriving** til Supabase-lageret ble avvist. Begge deler er rettet
20.09. En endring som bare finnes ett av stedene er ikke gjennomført.
