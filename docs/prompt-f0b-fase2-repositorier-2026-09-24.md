# Oppdrag: repositoriene over direkte tilkobling (F0b, punkt 2)

**Dato:** 2026-09-24. **Utgangspunkt:** `main` etter PR #42 (kjernen). Kontroller
HEAD og Git-status selv. Dette er en arbeidsinstruks. Den endrer ikke
funnstatus eller beslutninger.

**Forrige ledd:** [kjerneoppdraget](prompt-f0b-kjernen-2026-09-23.md),
[gjennomføringsnotatet for kjernen](gjennomforing-f0b-kjernen-2026-09-23.md) og
[reviewet av kjernen](review-f0b-kjernen-2026-09-23.md).
Beslutningen står i [hovedplanen, 3.1](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger),
og pakken under F0b i avsnitt 5.

Fire løp kan gå parallelt, hvert i sin egen økt og med sitt eget issue i
[milepælen F0b](https://github.com/khjohns/endringsmeldinger/milestone/1).
Avsnitt 1–4 gjelder alle. Avsnitt 5 sier hva hvert løp eier.

## 1. Mål

Hvert lager får en PostgreSQL-implementasjon over kjernen (`lib/db`), bak
dagens grensesnitt og med tester mot ekte PostgreSQL. Med `DATALAG=postgres`
bruker containeren den nye klassen; uten bryteren er alt som før.

Ferdig for et løp når:

1. Klassene i løpets rad i avsnitt 5 finnes i `repositories/postgres/` og tar
   `Database` som eneste argument.
2. Hver metode som noen kaller i dag, er implementert og har en test mot ekte
   PostgreSQL. Et lager som ikke er i bruk, er ikke en grunn til å skrive det.
3. Hele backend-suiten, databasetestene og `ruff check backend/` er grønne.

## 2. Les først, og bare dette

- `AGENTS.md` i sin helhet. Særlig sikkerhetsinvariantene, «Hvor hva står» og
  resonneringsreglene.
- Gjennomføringsnotatet for kjernen: avsnitt 2 (Retry), **4 (grensesnittet for
  fase 2)**, **7 (kallerens ansvar)** og 8.
- Hovedplanen: F0b, invariantene i 2.3 og radene for funnene løpet ditt nevner.
- Løpets issue.
- Dagens implementasjon av lageret du erstatter (se avsnitt 5), hele klassen.

Les ikke auditkjeden. Trenger du noe derfra, noter at du brukte det.

## 3. Oppsett

- **Egen arbeidskatalog.** Lag en `git worktree` for grenen din. Arbeid ikke i
  hovedkatalogen; andre økter kan ha en annen gren sjekket ut der.
- **Egen testbase.** Den skrivbare fixturen tømmer tabellene etter hver test, så
  to prosesser mot samme base ødelegger for hverandre. Bruk porten og katalogen
  for løpet ditt:

  | Løp | `KOE_TESTBASE_PORT` | `KOE_TESTBASE_KATALOG` |
  | --- | --- | --- |
  | a | 54331 | `$TMPDIR/koe-testbase-a` |
  | b | 54332 | `$TMPDIR/koe-testbase-b` |
  | c | 54333 | `$TMPDIR/koe-testbase-c` |
  | d | 54334 | `$TMPDIR/koe-testbase-d` |

  Start med `scripts/testbase/lokal_testbase.sh start`, og sett
  `KOE_TESTBASE_URL` til URL-en den skriver ut.

## 4. Felles regler

**Grensesnittet er det kallerne bruker, ikke den abstrakte klassen.**
Supabase-lagrene har metoder som ikke står i basisklassen (TST-06). Søk etter
hver metode i `routes/`, `services/`, `lib/`, `core/` og `scripts/`. Implementer
alt som kalles, med samme navn, argumenter, returtyper og unntak som
Supabase-lageret. Supabase-lageret er produksjonsstien, ikke JSON-lageret. En
metode ingen kaller, skrives ikke; nevn den i notatet.

**Kjernen eier transaksjonen** (notatet, avsnitt 4 og 7):

- lesing med `database.transaksjon(Kontekst())`, skriving med
  `database.utfor(Kontekst(), ...)`;
- ingen `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `SET ROLE`,
  `SET SESSION AUTHORIZATION` eller `set_config`, og ingen `conn.commit()`,
  `conn.rollback()`, `conn.transaction()` eller `autocommit`. Tekstvakten
  (`tests/test_security/test_postgres_transaksjonsgrense.py`) avviser dem.
  Notatet avsnitt 7 nevner `conn.transaction()` for savepoints; vakten gjelder
  foran det. Trenger du en savepoint, skriv det i issuet før du lager den;
- ingen `@with_retry()` og ingen egen retry. `utfor` kjører hele transaksjonen
  på nytt ved serialiseringsfeil, og bare da;
- forbindelsen brukes ikke etter blokken og gis ikke ut av den.

**Feil blir riktig klasse.** Kjernen klassifiserer driverfeilene (`lib/db/feil.py`).
En avvisning som aldri kan lykkes, er `PermanentError`. Versjonskonflikt er
`ConcurrencyError` (SQLSTATE `KO409` eller unik-skranke, som kjernen oversetter),
ikke en naken `ValueError`. Behold de unntakstypene kallerne fanger i dag.

**Invariantene i `AGENTS.md` gjelder uendret.** Særlig:

- `prosjekt_id` er påkrevd ved hver lesing og skriving. Ingen standardverdi, og
  ikke noe tomt filter som betyr «alle». Søk etter alle de seks formene i
  resonneringsreglene før du skriver at det ikke finnes noen.
- `aktor_id` er `app_users.id` og ingenting annet.
- Interne notater og utkast er fail-closed på team.

**SQL skrives med parametre.** Tabell- og kolonnenavn som ikke er faste, går
gjennom `psycopg.sql.Identifier` og en fast liste over tillatte navn. Verdier
settes aldri inn med strengformatering.

**Rør ikke det som er delt:** `core/container.py`, `repositories/__init__.py`,
`lib/db/` og fixturene i `tests/test_database/conftest.py`. Trenger to løp en
felles SQL-hjelper, legges den i `lib/db/` i en egen, liten PR først, og det
avtales i issuene.

**Rør ikke de gamle lagrene.** JSON-, CSV- og Supabase-lagrene slettes samlet
senere (#49). Ingen sammensatte transaksjoner på tvers av lagrene; det er F2.

**Kolonnene er basens, ikke doblenes.** `HENDELSE_KOLONNER` og
`tests/fixtures/supabase_dobbel.py` speiler repoet, ikke basen. Testbasen er
bygget fra migrasjonene. Har du tilgang til Supabase-MCP, kontroller kolonnene
for tabellene dine i katalogen i prosjektet, bare med lesende
katalogspørringer og uten saksdata. Avvik rapporteres, de rettes ikke her.

**Tester:** i en egen fil under `tests/test_database/`, merket `database`.
`skrivbar_base` for lageret direkte, `container_mot_testbasen` for tjenester
og ruter. Hver regel over som har en test, skal du ha sett rød: fjern regelen i
en kastbar kopi og kjør testen.

## 5. Løpene

### Løp a: hendelse og notat

**Issue:** #55.

**Eier:** `repositories/postgres/hendelse.py` (`PostgresEventRepository`) og
`repositories/postgres/notat.py` (`PostgresNotatRepository`).
**Erstatter:** `SupabaseEventRepository` og `SupabaseNotatRepository`.

- Journalen er append-only. Lageret har ingen metode som endrer eller sletter en
  hendelse.
- `append` og `append_batch` med forventet versjon: to samtidige skrivinger mot
  samme versjon gir én commit og én `ConcurrencyError`. Test med to uavhengige
  forbindelser, også for samtidig opprettelse av samme sak (TST-02 og KR-15
  gjaldt JSON-lageret; samme egenskap må holde her).
- `JournalfoeringAvvist` for hendelser som aldri kan lagres.
- Notatet ligger i `notat`, utenfor journalen: det flytter ikke sakens versjon,
  og det kan slettes (MS-05). Et notat uten `aktor_team_id` vises til ingen.
- Tjenestetester som trenger relasjoner, venter på løp b. Test lageret direkte.

### Løp b: saksmetadata, relasjoner og BIM

**Issue:** #56.

**Eier:** `sak_metadata.py` (`PostgresSakMetadataRepository`), `relasjon.py`
(`PostgresRelationRepository`) og `bim.py` (`PostgresBimLinkRepository`).
**Erstatter:** `SupabaseSakMetadataRepository`, `RelationRepository` og
`BimLinkRepository` (de to siste går over Supabase i dag).

- `list_by_sakstype` finnes i Supabase-lageret, men ikke i CSV-lageret (AUT-04,
  TST-01). Den skal finnes her.
- Relasjoner er avgrenset til prosjektet. En relasjon som klienten oppgir, skal
  ikke utvide tilgangen (RV-07, AUT-01/02); se `cases_in_project` i
  `lib/auth/project_access.py`. Test en relasjon til en sak i et annet
  prosjekt.
- `sak_relations` har ingen fremmednøkler ennå (DB-04, venter på B-01). Ikke
  legg dem til.
- De ti `cached_*`-kolonnene i `sak_metadata` har flere skrivere i dag (MS-06).
  Hold dagens atferd; én skriver er F2.

### Løp c: identitet, sesjoner, medlemskap og prosjekter

**Issue:** #57.

**Eier:** `identitet.py` (`PostgresAuthRepository`), `medlemskap.py`
(`PostgresMembershipRepository`) og `prosjekt.py` (`PostgresProjectRepository`).
**Erstatter:** `AuthRepository`, `SupabaseMembershipRepository` og
`SupabaseProjectRepository`.

- De fire databasefunksjonene kalles med vanlig SQL: `koe_resolve_identity`,
  `koe_reconcile_memberships`, `koe_register_project` og
  `koe_set_contract_teams`. Samme issuer (`CatendaOAuth.BASE`) og samme
  normaliserte subjekt (`catenda_id()`) som i dag; én annen form gir samme
  person to brukerrader.
- Flere av tabellene leses og skrives av databasefunksjoner og triggere, ikke av
  koden. `app_identities` har ingen treff i repoet, og `project_memberships`
  fylles av en trigger. Spør `pg_proc` og `pg_trigger` i testbasen før du
  skriver at noe ikke er i bruk (resonneringsreglene).
- `AuthRepository.all_rows(table, ...)` tar tabellnavn som argument. Tabellnavnet
  går gjennom en fast liste, aldri rett inn i SQL.
- Sesjoner lagres som digest av token, aldri tokenet selv.
- Ikke endre atferden ved feilende medlemssynkronisering. Den hører til F1 (#51).
  Ikke fjern `koe_register_project` eller `koe_set_contract_teams` fra lageret;
  at bare drift skal kunne kalle dem, er en rettighet i F1, og
  administratorskriptene bruker dem i dag.

### Løp d: Catenda-konfigurasjon

**Issue:** #58.

**Eier:** `catenda_konfig.py` (`PostgresCatendaProjectConfigRepository`).
**Erstatter:** `SupabaseCatendaProjectConfigRepository`.

- Oppslaget skal aldri falle tilbake til globale Catenda-prosjekt-ID-er eller
  legacy-konfigurasjonen. Et prosjekt som ikke finnes, gir ingen treff, og
  resolveren avviser.
- `DATALAG=postgres` velger allerede denne klassen (notatet, avsnitt 4). Test
  `build_project_resolver` med `container_mot_testbasen`.
- Løpet er lite. Er det ferdig tidlig, kan økten ta `/code-review` på et av de
  andre løpene, men ikke skrive i dem.

## 6. Kontroll og levering

- **Én PR per løp**, med `Closes #n` for løpets issue. `/code-review` før PR-en
  meldes klar.
- **Et kort gjennomføringsnotat per løp**,
  `docs/gjennomforing-f0b-lop-<a–d>-<dato>.md`, etter repoets form: hvilke
  metoder som er implementert, hvilke som ikke kalles, hvilke regler som er
  prøvd røde og hvordan, og **«Verifikasjon og grenser»**.
- **Ikke skriv i hovedplanen eller `docs/README.md`.** Fire parallelle PR-er
  under samme pakke gir konflikter. Planen får én merknad når alle fire er inne,
  og notatene får sine rader i indeksen da (#49).
- **Oppfølging** du ikke løser, blir et issue med `review-oppfølging`.
- `/simplify` kjøres samlet når alle fire er inne, ikke per løp (#49).
