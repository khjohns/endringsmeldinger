---
name: miljo
description: Kommandoene for pytest, TS-typesjekk og feilinnføringer, hvordan utdataene holdes små, og omveiene i skyøkta i endringsmeldinger, med gh api-søk i issues (sider og --paginate) og vitest-timeout. Brukes når en sjekk skal kjøres, eller når en kommando feiler i en skyøkt.
---

# Miljø og kommandoer

Reglene for miljøet står i «Miljø» i `AGENTS.md`. Her står kommandoene og
omveiene.

## Sjekker

```bash
cd backend && /tmp/venv/bin/python -m pytest -q
npm test && npm run check:error      # skal gi 0 errors
npx tsc -p kjerne/tsconfig.json      # svelte-check ser ikke kjerne/
npx tsc -p sprakprove/tsconfig.json  # eller sprakprove/
npx tsc -p server/tsconfig.json      # eller server/
ruff check backend/                  # porten, skal være 0
```

`npm run server` starter TS-serveren i `server/` (B-18), med miljøvariablene i
headeren til `server/start.ts`. Vite-proxyen sender det `tilTsServeren()` i
`server/ruting.ts` velger, dit (F0b-8), og resten av `/api` til Python.

I skyøktene lager `.claude/hooks/session-start.sh` venv-en og starter Docker og testbasen i SQL Server.

Hooken starter ikke PostgreSQL. Trenger du katalogen i en base bygget fra
`supabase/migrations/` (`pg_proc`, `pg_trigger`, `pg_policy`, se
`.claude/rules/database.md`) eller `docs/verktoy/katalog.py`, start den selv.
Etter en endring i migrasjonene bygges den på nytt med `stopp` og `start`:

```bash
scripts/testbase/docker_testbase.sh stopp
eval "$(scripts/testbase/docker_testbase.sh start | tail -1)"   # setter KOE_TESTBASE_URL
```

SQL Server for datalaget i F0b (#488) starter hooken i bakgrunnen med
`scripts/testbase/docker_sqlserver.sh`, og den setter `KOE_SQLSERVER_TILKOBLING`
med en gang. Testene i `server/` og `sprakprove/kjernelagring/` venter på
serveren i opptil tre minutter og hoppes over uten variabelen. Hver testfil får sin egen
base fra `opprettTestbase` i `server/tester/sqlserver.ts`, med innstillingene fra
Azure SQL Database. Loggen står i `/tmp/koe-sqlserver.log`. Utenfor skyøkta:

```bash
eval "$(scripts/testbase/docker_sqlserver.sh start)"   # setter KOE_SQLSERVER_TILKOBLING
npx vitest run server/tester/sqlserver.test.ts
```

`globalSetup` bygger malen bare når en fil fra `server/` er med i kjøringen. En fullført mal brukes uten lås.

Kontraktstestene mot ekte Catenda (#902) går gjennom token-brokeren og bare
fra skyøkta, der `CATENDA_GRUNNADRESSE` og de andre `CATENDA_*`-variablene er satt.
De hoppes over uten `KOE_CATENDA_LIVE=1`, også i CI og i vanlig `npm test`.
Steg B lager topics og dokumenter med prefikset `koe-livetest-` i
`CATENDA_FOLDER_ID` og sletter dem etterpå. Feiler en sletting, blir kjøringen rød,
og meldingen sier hva som ble liggende igjen. Steg C leverer et brev ende til ende
og trenger også `KOE_SQLSERVER_TILKOBLING`; uten den hoppes C over:

```bash
KOE_CATENDA_LIVE=1 npx vitest run server/tester/catenda.live.test.ts
```

Utenfor skyøktene: `python3 -m venv /tmp/venv` og `pip install -r` begge
`backend/requirements*.txt` (systempython mangler pytest).

Timeouten for en hel vitest-kjøring står i «Miljø» i `AGENTS.md`.

## Utdata

Hvert verktøysvar blir værende i konteksten og leses på nytt i hvert kall etter
det, så svarene holdes små:

- Testutdata leses i kortform: `npx vitest run --reporter=dot | tail -30`, og
  pytest med `-q` som i blokken over, også `| tail -30`. Skal hele utdataene
  leses, gjør en subagent det og rapporterer bare feilene.
- Tell før du leser: `grep -c` eller `grep -l` først, deretter `grep -n` på
  de filene som gjelder. Et søk med mange alternativer over hele treet gir
  fort over 10 000 tegn.
- Les et vindu, ikke hele fila: `Read` med `offset` og `limit`, eller
  `sed -n 'a,bp'` rundt treffet. En hel fil leses bare når hele trengs.
- `git diff --stat` eller `--name-only` før `git diff`, og diffen fil for fil.
- Store JSON-svar, også fra MCP-verktøy, lagres til fil og leses med et kort
  skript som skriver ut bare det som trengs.

`.claude/settings.json` setter `bashOutputMaxChars` til 10 000 tegn. Lengre
utdata fra Bash lagres til fil, og økta får en kort forhåndsvisning og stien.
Les den lagrede fila med `Read` med `offset` og `limit`, eller med `grep`. `cat`
av hele fila gir bare en ny fil og en ny forhåndsvisning.

## Feilinnføringer

`node kjerne/tester/feilinnfoering.ts` kjører feilinnføringene for kjernen, i
parallelle kopier av treet med hver sin testbase. Én kjøring tar lang tid; start
den i bakgrunnen. Med `--ankre` kontrollerer den bare at teksten hver
feilinnføring bytter ut, finnes nøyaktig én gang, og at hvert mål er en del av
navnet på en test, lest med `vitest list`. Det tar sekunder, og
leveranseskillen sier når det kjøres. I CI fordeler workflowen `feilinnfoering.yml` dem på seks
jobber og kjører dem om natta når kjernen, lagringstestene eller
verktøykjeden er endret, ved manuell start og på PR-er med etiketten
`feilinnfoering`.

Kjøres fra repoets rot, med SQL Server oppe og `KOE_SQLSERVER_TILKOBLING` satt.
`--ankre` trenger ikke basen.

Med `FEILINNFOERING_UTVALG=1` kjører hver mutasjon bare filene med målene sine, slik CI gjør på en PR. Uten den kjøres hele samlingen, som om natta.

## Skyøkta

Reglene for skyøkta står i «Miljø» og «Hvor hva står» i `AGENTS.md`. Her står kommandoene.

Side for side i repo-listen, uten `search/issues`:
`gh api "repos/khjohns/endringsmeldinger/issues?state=all&per_page=100&page=N" --jq '.[] | select(.title | test("…"; "i"))'`.

Filtrert kjøring, som holder under arbeidet: `npx vitest run <filer>`. For en hel `npx vitest run` gjelder timeout-regelen i `AGENTS.md`.
