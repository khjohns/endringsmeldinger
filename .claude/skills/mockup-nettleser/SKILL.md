---
name: mockup-nettleser
description: Kjører /mockup i Chromium i skyøkta og driver byggherrens svar gjennom godkjenningsflyten til det er sendt, med skjermbilder. Brukes for å se en frontendendring i nettleseren, ta skjermbilder til en PR eller kontrollere godkjenningsflyten.
---

# /mockup i nettleseren

```bash
node .claude/skills/mockup-nettleser/godkjenning.mjs [--utdata <mappe>] [--url http://localhost:5173] [--scenario scenario1]
```

Skriptet starter `vite dev` hvis ingen svarer på `--url`, og stopper den igjen
etterpå. Skjermbildene havner i `--utdata` (standard `/tmp/mockup-skjermbilder`):
vurderingen, brevet og det sendte svaret. Det feiler ved JavaScript-feil i siden.
`/mockup` bruker demolageret og trenger verken backend eller innlogging.

## Til #246 er rettet

`/mockup` laster ikke i `vite dev`: `src/lib/domain/fristVarselDomain.ts`
importerer en JSON-fil under `backend/constants/`, som er utenfor Vites
tillatelsesliste, og skriptet venter på «Byggherre BH» til tidsavbrudd.
Omvei: legg `fs: { allow: ['backend/constants'] }` under `server` i
`vite.config.ts`, kjør skriptet, og fjern linja igjen. Commit den aldri. I en
git-worktree der `node_modules` er en symbolsk lenke, må lenkens mål også stå i
lista. Fjern avsnittet når #246 er rettet.

## Nettleseren

Bruk den globale playwright-pakken (`npm root -g`), ikke `npm i playwright`.
Den globale er låst til nettleserne i `PLAYWRIGHT_BROWSERS_PATH`
(`/opt/pw-browsers`); en nyere versjon leter etter en revisjon som ikke finnes,
og `launch()` feiler med «Executable doesn't exist». Kjør aldri
`playwright install`. Skriptet laster pakken med `createRequire` fra den
globale mappa, fordi `import` ikke leser `NODE_PATH`, og stopper med en tydelig
melding hvis revisjonen ikke finnes.

Skal du skrive et eget skript, kopier `globalPlaywright()` fra
`godkjenning.mjs`.

## Godkjenningsflyten

Rekkefølgen skriptet følger, og som trengs om du driver flyten selv:

1. «Byggherre BH» → et spor i venstrekolonnen → «Svar på kravet».
2. Svaralternativene er `role="radio"`, ikke knapper:
   `getByRole('radio', { name: 'Ja, i tide' })`.
3. «Ferdigstill vurdering» blir aktiv når alle spørsmål er besvart.
4. I brevet: kryss av «Jeg har kontrollert brevet og vedleggene.» i
   `.approval-panel`, så «Send til godkjenning» (over fullmakt) eller
   «Send svar» (innenfor).
5. Bytt godkjenner med `getByLabel('Demo · vis som').selectOption(id)`, ikke
   ved å klikke på teksten. Hver godkjenner krysser av «Jeg har kontrollert
   brevet.» før «Godkjenn» eller «Godkjenn og send» blir aktiv.
6. Ferdig når panelet viser «Svaret er sendt».

## Andre nettleserskript i repoet

`scripts/test_brev_godkjenning.mjs` og `scripts/test_endringsordre.mjs` bruker
installert Chrome som standard. I skyøkta, med vite kjørende:

```bash
PLAYWRIGHT_MODULE="$(npm root -g)/playwright/index.mjs" \
CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium \
TEST_BASE_URL=http://localhost:5173 node scripts/test_brev_godkjenning.mjs
```

`test_endringsordre.mjs` kjøres på samme måte.
