# Gjennomføring: PostgreSQL 17 i CI og de første databasetestene (F0)

**Dato:** 2026-09-22. **Utgangspunkt:** commit
`17c8f85b4e00dd3dc258f4a6336ef1e53e0706c6` (`main`), gren `f0-postgresql-i-ci`.
**Oppdrag:** [arbeidsinstruksen](prompt-f0-postgresql-i-ci-2026-09-22.md).
**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
F0 i avsnitt 5 og avsnitt 6.

Notatet endrer ingen funnstatus. Statusendringene står i hovedplanen, i en
datert merknad under F0 og i radene DB-03, DB-07 og RV-17.

## 1. Hva som er gjort

| Del | Fil |
| --- | --- |
| Plattformstubb: rollene `anon`, `authenticated`, `service_role`, skjemaet `auth` med `users`, `role()` og `email()`, og rettighetene Supabase gir ved prosjektoppsett | [`scripts/testbase/plattformstubb.sql`](../scripts/testbase/plattformstubb.sql) |
| Byggeskript: stubben og deretter alle `supabase/migrations/*.sql` i filnavnrekkefølge (`LC_ALL=C`), med `ON_ERROR_STOP`. Avbryter hvis basen ikke er tom | [`scripts/testbase/bygg_testbase.sh`](../scripts/testbase/bygg_testbase.sh) |
| CI-jobben `database`: tjenestecontainer `postgres:17`, kontroll av at serveren er 17, bygg fra tom, databasetestene | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Merket `database` og skipping i innsamlingen når `KOE_TESTBASE_URL` mangler. Ingen standardverdi | [`backend/tests/conftest.py`](../backend/tests/conftest.py), [`backend/pyproject.toml`](../backend/pyproject.toml) |
| Lesende tilkobling (`default_transaction_read_only`). Mangler driveren mens variabelen er satt, blir testen rød, ikke hoppet over | [`backend/tests/test_database/conftest.py`](../backend/tests/test_database/conftest.py) |
| Databasetestene | [`backend/tests/test_database/test_katalog.py`](../backend/tests/test_database/test_katalog.py) |
| Driver for testene: `psycopg[binary]==3.3.6` | [`backend/requirements-dev.txt`](../backend/requirements-dev.txt) |
| T-5: `raises=AssertionError` på AP-04-testen | [`backend/tests/test_approval/test_audit_20260916.py`](../backend/tests/test_approval/test_audit_20260916.py) |
| T-2 for DB-03 og DB-07: de to strenge reproduksjonene er fjernet etter at katalogtestene var grønne; begrunnelsen står datert i de nye testene | [`backend/tests/test_security/test_database_rls_audit_20260918.py`](../backend/tests/test_security/test_database_rls_audit_20260918.py) |

Testene i `test_katalog.py` (10 med parametrisering):

- basen har nøyaktig de 19 tabellene prosjektet har (lista gjenbrukes fra
  `test_database_arkitektur_20260920.py`);
- `sak_metadata.prosjekt_id` er `NOT NULL` uten default (DB-03);
- `sak_bim_links.properties` finnes og er `jsonb` (DB-07);
- `prosjekt_id` på `hendelse` og `sak_relations` er `NOT NULL` uten default;
- `anon` og `authenticated` har ingen tabell-, kolonne- eller
  sekvensrettigheter og ingen `EXECUTE` på funksjoner i `public`, også arvet
  fra `PUBLIC`;
- de samme to rollene avvises når de faktisk prøver å lese hver tabell
  (`SET LOCAL ROLE` i en transaksjon som rulles tilbake).

**Stubben gir også `anon` og `authenticated` alle rettigheter,** slik
plattformen gjør. Uten det ville rettighetstestene bestått uten at
migrasjonene `20260918131137` og `20260918131223` gjorde noe. Stubben dekker
bare standardrettighetene for rollen som kjører migrasjonene (`postgres` i
Supabase), ikke dem for `supabase_admin`; se PGC-04.

DB-04s reproduksjon er urørt. Fremmednøklene venter på B-01.

## 2. Funn under arbeidet

| ID | Alvorlighet | Kort |
| --- | --- | --- |
| PGC-01 | Lav (dokument) | `AGENTS.md` og `supabase/config.toml` sier at `20260911073600_projects` gjør `UPDATE sak_metadata`. Den gjør ikke det lenger |
| PGC-02 | Info, kjent 20.09 | `koe_set_contract_teams` har annen tekst i basen enn den migrasjonene bygger. Bare innrykk og fire kommentarer skiller |
| PGC-03 | Kjent (DA-03) | Basens migrasjonshistorikk har 18 rader, repoet 23 filer |
| PGC-04 | Lav | Plattformens standardrettigheter for `supabase_admin` i `public` gir fortsatt `anon` og `authenticated` alt |

### PGC-01 — Rekkefølgebegrunnelsen er foreldet

`20260911073600_projects.sql` sier selv at backfill-seksjonen ble utelatt da
fila ble flyttet 20.09. Den har ingen `UPDATE` og ingen referanse til
`sak_metadata`. Kjørt og observert: flyttes fila foran kjerneskjemaet
(versjon `20260911000000`), bygger hele settet uten feil. Rekkefølgen er
likevel en reell skranke: flyttes `project_memberships_rekonstruert` foran
`projects`, stopper bygget med `relation "public.projects" does not exist`
(exit 3). Påstanden i `AGENTS.md` (avsnittet om filnavnrekkefølgen) og i
kommentaren i `supabase/config.toml` bør rettes til å vise til
`project_memberships` → `projects`. Ikke rettet her; `AGENTS.md` er utenfor
oppdraget. Vakten `test_kjerneskjemaet_kommer_for_projects_migrasjonen` leser
fortsatt tekst og er ikke berørt.

### PGC-02 — Én funksjonstekst avviker

Summene over funksjonsdefinisjoner var ulike (se avsnitt 3). Per funksjon:
ni av ti er like. `koe_set_contract_teams(text, jsonb)` skiller seg bare i
innrykk og fire `--`-kommentarer; `diff -w` uten kommentarlinjene er tom.
Logikk, `search_path`, `SECURITY INVOKER` og eier er like. Trolig ble
funksjonen anvendt fra en annen tekst enn `20260916133000`, som heller ikke
står i basens historikk (PGC-03). Ingen virkning på atferd. Samme avvik er
beskrevet i [databasearkitekturauditen](audit-databasearkitektur-2026-09-20.md#veien-fra-fil-til-database);
den gang avvek også `koe_register_project`, som nå er lik.

### PGC-03 — Historikken er ikke avstemt

`list_migrations` gir 18 rader: `001_koe_core_tables` til
`006_koe_rls_performance` (seks rader for det som i repoet er én fil), og tolv
som svarer til filer. Ti filer har ingen rad: `20260911073600`,
`073700`, `073800`, `080500`, `080600`, `20260912140000`, `20260912150635`,
`20260916130000`, `20260916133000` og `20260920160000`. Fem av de tolv radene
har et annet tidsstempel enn filnavnet (`20260921091758`, `094013`, `105303`,
`153902`, `165158`; jf. `AGENTS.md` om `apply_migration`). Dette er DA-03 og
ikke nytt; det er rapportert, ikke rettet.

### PGC-04 — Plattformens egne standardrettigheter

`pg_default_acl` i basen har for eier `supabase_admin` i `public`
`arwdDxtm` til `anon` og `authenticated` på tabeller, `rwU` på sekvenser og
`X` på funksjoner. Migrasjonene kjører som `postgres` og treffes ikke; for
`postgres` står bare `service_role` igjen, som stubben og migrasjonene til
sammen gir. Et objekt i `public` opprettet av `supabase_admin` — for eksempel
en utvidelse installert der — ville likevel fått rettighetene. Testbasen har
ingen `supabase_admin`, så rettighetstestene kan ikke fange det. Endringen av dette
hører til B-02/F1, ikke F0.

## 3. Katalogkontroll mot prosjektet

Lesende spørringer mot `gwdxadexwktegkklyobv` over Supabase-MCP 22.09, bare
katalog, ingen saksdata:

- PostgreSQL 17.6.
- `sak_metadata.prosjekt_id`, `hendelse.prosjekt_id`,
  `sak_relations.prosjekt_id`: `NOT NULL`, ingen default.
  `sak_bim_links.properties` finnes.
- `anon` og `authenticated`: ingen rader i `role_table_grants`, ingen
  `EXECUTE` på funksjoner i `public` (heller ikke via `PUBLIC`), ingen
  sekvensrettigheter. `USAGE` på skjemaet `public`, som plattformen gir.
- Summer (`md5(string_agg(...))`) over kolonner (162), skranker uten
  `contype = 'n'` (55), indekser (64), policyer (20), tabellrettigheter for
  de tre rollene (133), `EXECUTE` for de tre rollene (10) og triggere (5) er
  **like** i basen og i det lokale PG17-bygget. Funksjonsdefinisjonene (10)
  er ulike, se PGC-02.

## 4. Det som må gjøres av noen med tilgang

1. **Påkrevde sjekker på `main` (F0 punkt 2).** En administrator av
   `khjohns/endringsmeldinger` legger jobbene `Backend (pytest + ruff)`,
   `Database (PostgreSQL 17 + migrasjoner)`, `Frontend (vitest)` og
   `Lint og typesjekk` inn som påkrevde statussjekker i en
   grenbeskyttelsesregel eller et ruleset for `main`. Det kan først gjøres
   etter at jobben `database` har kjørt minst én gang i GitHub, fordi GitHub
   bare tilbyr sjekker det har sett.
2. **Migrasjonshistorikken i basen (F0 punkt 3, DA-03).** Krever
   databaselegitimasjon til prosjektet og må gjøres av den som eier det i
   Supabase. Kommandolista i
   [databasearkitekturauditen](audit-databasearkitektur-2026-09-20.md#veien-fra-fil-til-database)
   er skrevet 20.09 og må lages på nytt: fem senere migrasjoner er anvendt
   over MCP med andre versjoner enn filnavnene (PGC-03), og de må enten
   repareres eller filene gis basens versjon. Etterpå skal
   `supabase migration list` vise samme versjoner på begge sider og
   `supabase db push --dry-run` ingenting å gjøre.

## 5. Naturlig neste steg

- **I F0:** T-1 (AUT-03) og T-3 (FE-02) er små og uavhengige. T-4
  (KR-15/TST-02) trenger en deterministisk reproduksjon med reell lagring og
  kan nå skrives mot testbasen. Deretter en test som logger inn som en
  ikke-privilegert rolle (ikke bare `SET ROLE`) når B-02 har bestemt
  hvilken.
- **Parallelt:** rett PGC-01 i `AGENTS.md` og `config.toml`; spor D
  (for eksempel TFR-04); designarbeidet for B-02.

## Verifikasjon og grenser

**Kjørt lokalt og observert (22.09, macOS, PostgreSQL 17.11 fra Homebrew):**

- Byggeskriptet mot en ny klynge og tom base: 23 migrasjoner, exit 0.
  Deretter CI-jobbens steg i samme rekkefølge: versjonskontroll
  (`170011`), bygg, `pytest -m database tests/test_database`: 10 bestått.
- Negativ kontroll 1: bygg uten `20260918131137` og `20260918131223`. De fem
  rettighetstestene blir røde, de fem øvrige grønne.
- Negativ kontroll 2: `project_memberships` sortert foran `projects`. Bygget
  stopper med exit 3. (Den første varianten, `projects` foran kjerneskjemaet,
  bygget uten feil; se PGC-01.)
- Negativ kontroll 3: skriptet mot en bygget base avbryter med «Basen er ikke
  tom».
- Uten `KOE_TESTBASE_URL`: de 10 hoppes over i innsamlingen, med grunn.
- Hele backend-suiten uten variabelen: 1529 bestått, 19 hoppet over (9 før,
  pluss de 10 databasetestene), 40 xfailed (42 før; to reproduksjoner fjernet). `ruff check backend/` med
  den pinnede 0.16.8: ingen feil.
- AST-telling: 40 strenge `xfail`, alle med `raises=`.

**Kontrollert i den levende katalogen:** avsnitt 3 og PGC-02–PGC-04.

**Observert i CI (22.09, [PR #33](https://github.com/khjohns/endringsmeldinger/pull/33),
kjøring `35762884390`):** alle fire jobbene grønne. Jobben `database` rapporterte
`server_version_num=170011` (17.11, Debian-bygg), «Bygget 23 migrasjoner.» og
10 bestått. De negative kontrollene er bare kjørt lokalt.

**Ikke kontrollert:**

- innlogging som ikke-privilegert rolle; rolletesten bruker `SET ROLE` fra en
  superbrukertilkobling;
- at stubben gjengir plattformen utover det migrasjonene bruker. Den er
  sammenholdt med basens `pg_default_acl`, ikke med Supabases oppsettskript;
- `supabase db push` eller Supabase CLI i det hele tatt;
- frontend-suiten og typesjekken (ingen endring der);
- dokumentene i auditkjeden som viser til de to fjernede testene. De er
  historiske; `audit-testbevis-2026-09-22.md` har fått en merknad.
