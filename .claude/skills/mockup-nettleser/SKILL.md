---
name: mockup-nettleser
description: Kjører /mockup i Chromium i skyøkta og driver byggherrens svar gjennom godkjenningsflyten til det er sendt, med skjermbilder, og kontrollerer editoren (innliming, angre, låste verdier). Brukes for å se en frontendendring i nettleseren, ta skjermbilder til en PR, kontrollere godkjenningsflyten eller prøve editoren etter en oppgradering av Tiptap, ProseMirror eller Svelte.
---

# /mockup i nettleseren

```bash
node .claude/skills/mockup-nettleser/godkjenning.mjs [--utdata <mappe>] [--url http://localhost:5173] [--scenario scenario1] \
  [--varsel i-tide|for-sent] [--hindring ja|nei] [--dager <n>] [--tekst]
```

Skriptet starter `vite dev` hvis ingen svarer på `--url`, og stopper den igjen
etterpå. Skjermbildene havner i `--utdata` (standard `/tmp/mockup-skjermbilder`):
vurderingen, brevet og det sendte svaret. Det feiler ved JavaScript-feil i siden.
`/mockup` bruker demolageret og trenger verken backend eller innlogging.

Svarene velges med flagg. Uten flagg svarer skriptet «Ja, i tide», «Ja, hindring»
og 30 dager.

- `--varsel i-tide|for-sent`: «Ja, i tide», eller «Nei, for sent» (og «Nei,
  prekludert» på svar til forespørsel) i alle varselspørsmål.
- `--hindring ja|nei`: «Ja, hindring», eller «Nei, ingen hindring» (§ 33.1).
- `--dager <n>`: godkjent fristforlengelse i kalenderdager, et helt tall fra 0 til
  de krevde dagene i saken (45 i `scenario1`). Feltet klipper til kravet, så
  skriptet sjekker verdien etter utfyllingen og avbryter med exit 1 hvis den er
  større.
- `--tekst`: skriver ut brevteksten og sporstatusene («Navn: status» for hver rad
  i venstrekolonnen) etter at svaret er sendt.

Ugyldig verdi gir en melding om hva som er feil, og exit 1 før nettleseren startes.

## I en git-worktree

`vite.config.ts` gir `vite dev` tilgang til `kjerne/`. Er
`node_modules` en symbolsk lenke, som i en worktree, må også lenkens mål stå i
`server.fs.allow`. Legg det inn lokalt for kjøringen, og commit det ikke.

## Stoppe en vite-server man har startet selv

`pkill -f "vite dev"` dreper Bash-skallet selv, som har mønsteret i kommandolinja
(exit 144). Bruk klammer i mønsteret, så skallets egen linje ikke treffer:
`pgrep -f "node_modules/[.]bin/vite" | xargs -r kill`. Skriptet over stopper bare
sin egen server.

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

## Editoren

```bash
node .claude/skills/mockup-nettleser/editor.mjs [--utdata <mappe>] [--url http://localhost:5173]
```

Kontrollerer `RichTextEditor` (Tiptap): skriving, fet, innliming av HTML med
skriptkode, angre og gjør om, låste verdier og at tilleggsteksten står når den
genererte teksten endres. Det skriver `OK` eller `AVVIK` per kontroll og gir
exit 1 ved avvik. Kjør det når Tiptap, ProseMirror eller Svelte oppgraderes
(#268).

Det er nyttig å vite når du driver editoren selv:

- I BH-ens fristsvar står editoren i vurderingssteget, under den genererte
  teksten (`.generated-reasoning .reasoning-text`), ikke i brevet.
  `.reasoning-text` alene treffer også TE-ens kravtekst.
- Låste verdier (`LockedValueNode`) finnes bare i grunnlagsskjemaene. Har
  grunnlaget et utkast, heter knappen «Fortsett til utfylling», ikke «Svar på
  kravet».
- Innliming prøves med en `ClipboardEvent('paste')` med `DataTransfer` mot
  `.ProseMirror`. Utklippstavlen i den hodeløse nettleseren trengs ikke.
- ProseMirror slår sammen endringer innen 500 ms til ett angre-steg. Vent før
  innlimingen hvis angre skal gi teksten fra før.

## Det statiske bygget

`npm run build` og `npx vite preview --port <port>` viser SPA-fallbacken: en dyp
rute som `/P001/SAK-1` skal svare med appen. En sti uten rute gir 404 i
`vite preview`. I produksjon står fallbacken i `try_files` i `nginx.conf`.

## Andre nettleserskript i repoet

`scripts/test_brev_godkjenning.mjs` og `scripts/test_endringsordre.mjs` bruker
installert Chrome som standard. I skyøkta, med vite kjørende:

```bash
PLAYWRIGHT_MODULE="$(npm root -g)/playwright/index.mjs" \
CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium \
TEST_BASE_URL=http://localhost:5173 node scripts/test_brev_godkjenning.mjs
```

`test_endringsordre.mjs` kjøres på samme måte.

`scripts/test_kjernesak_vederlag.ts` driver vederlagskravet fra Kontrollrommet for en
TS-sak og tar skjermbilder. Skriptet svarer selv for API-et, med journalen skrevet
av kjernen, så det trenger bare vite:

```bash
npx vite dev --port 5174 --strictPort
node scripts/test_kjernesak_vederlag.ts --utdata /tmp/kjernesak-skjermbilder
```
