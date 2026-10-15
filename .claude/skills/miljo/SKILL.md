---
name: miljo
description: Kommandoene for pytest, TS-typesjekk og feilinnføringer, og omveiene i skyøkta i endringsmeldinger, med gh api-søk i issues (sider og --paginate) og vitest-timeout. Brukes når en sjekk skal kjøres, eller når en kommando feiler i en skyøkt.
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

`npm run server` starter TS-serveren i `server/` (B-18), og vite-proxyen sender
`/api/kjerne` dit.

I skyøktene lager `.claude/hooks/session-start.sh` venv-en og testbasen, og meldingen fra hooken sier om databasetestene kjører.

SQL Server for datalaget i F0b (#488) starter hooken i bakgrunnen med
`scripts/testbase/docker_sqlserver.sh`, og den setter `KOE_SQLSERVER_TILKOBLING`
med en gang. Testene i `server/tester/sqlserver.test.ts` venter på serveren i
opptil tre minutter og hoppes over uten variabelen. Hver testfil får sin egen
base fra `opprettTestbase` i `server/tester/sqlserver.ts`, med innstillingene fra
Azure SQL Database. Loggen står i `/tmp/koe-sqlserver.log`. Utenfor skyøkta:

```bash
eval "$(scripts/testbase/docker_sqlserver.sh start)"   # setter KOE_SQLSERVER_TILKOBLING
npx vitest run server/tester/sqlserver.test.ts
```

Utenfor skyøktene: `python3 -m venv /tmp/venv` og `pip install -r` begge
`backend/requirements*.txt` (systempython mangler pytest).

Testutdata leses i kortform: `npx vitest run --reporter=dot | tail -30`, og
pytest med `-q` som i blokken over, også `| tail -30`. Skal hele utdataene
leses, gjør en subagent det og rapporterer bare feilene. Timeouten for en hel
vitest-kjøring står i «Miljø» i `AGENTS.md`.

## Feilinnføringer

`node kjerne/tester/feilinnfoering.ts` kjører feilinnføringene for kjernen, i
parallelle kopier av treet med hver sin testbase. Én kjøring tar lang tid; start
den i bakgrunnen. Med `--ankre` kontrollerer den bare at teksten hver
feilinnføring bytter ut, finnes nøyaktig én gang, og at hvert mål er en del av
navnet på en test, lest med `vitest list`. Det tar sekunder, og
leveranseskillen sier når det kjøres. I CI fordeler workflowen `feilinnfoering.yml` dem på tre
jobber og kjører dem om natta når kjernen, lagringstestene eller
verktøykjeden er endret, ved manuell start og på PR-er med etiketten
`feilinnfoering`.

Kjøres fra repoets rot, med testbasen oppe og `KOE_TESTBASE_URL` satt. `--ankre`
trenger ikke basen.

## Skyøkta

Reglene for skyøkta står i «Miljø» og «Hvor hva står» i `AGENTS.md`. Her står kommandoene.

Side for side i repo-listen, uten `search/issues`:
`gh api "repos/khjohns/endringsmeldinger/issues?state=all&per_page=100&page=N" --jq '.[] | select(.title | test("…"; "i"))'`.

Filtrert kjøring, som holder under arbeidet: `npx vitest run <filer>`. For en hel `npx vitest run` gjelder timeout-regelen i `AGENTS.md`.
