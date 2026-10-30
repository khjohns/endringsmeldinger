---
name: mockup-nettleser
description: Kjører /mockup og den ekte saksruta i Chromium i skyøkta og driver byggherrens svar gjennom godkjenningsflyten til det er sendt, med skjermbilder, kontrollerer editoren (innliming, angre, låste verdier) og kjører axe for WCAG 2.1 A og AA (uu.mjs). Brukes for å se en frontendendring i nettleseren, ta skjermbilder til en PR, kontrollere godkjenningsflyten, prøve universell utforming eller prøve editoren etter en oppgradering av Tiptap, ProseMirror eller Svelte. Den ekte saksruta, med innlogging, TS-serveren og testbasen i SQL Server, kjøres med saksrute.ts, som sender stegene i et brukerforløp og framkaller feiltilstandene fra serveren (409, 403, 500 og avbrudd) med skjermbilder. Brukerforløpene i demoruta kjøres med demoruta.mjs. Et forløp i demoruta forprøves mekanisk med demoruta.mjs, og en HTML-skisse av et nytt mønster med prototype.mjs.
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

## Den ekte saksruta

`/mockup` har demodata og en egen statusregel. Den ekte saksruta `/{prosjekt}/{sak}`
mot TS-serveren og testbasen i SQL Server ([DL-U1](../../../docs/plans/vedtak.md#dl-u1)) kreves
for en diff i saksvisningen, etter `AGENTS.md`, «Arbeidsform». Den kjøres med:

```bash
node .claude/skills/mockup-nettleser/saksrute.ts [--utdata /tmp/saksrute-skjermbilder] \
  [--forlop <ID> [--til <kontrollpunkt>]] [--feil] [--behold]
```

Skriptet trenger `KOE_SQLSERVER_TILKOBLING`, som oppstartshooken setter, og port 5173
og 8090 ledige. Det tar 1–2 minutter, og rydder basen, innloggingen og prosessene
etterpå. Det skriver hvert kall med status og svar og stopper med exit 1 når et svar
ikke er det forventede:

1. Lager en migrert testbase og registrerer ett prosjekt med Catenda-kobling,
   board og kontraktsteam for TE og BH, med `settInn` som `lagOppsett` i
   `server/tester/testbase.ts`. Det er det `server/registrering.ts` gjør i drift.
   Brukere, medlemskap og sesjoner lages ikke: innloggingen lager dem.
2. Starter en falsk Catenda på 127.0.0.1 med en TE- og en BH-bruker, hver i sitt
   team. Den svarer på OAuth (`/oauth2/authorize`, `/oauth2/token`), `/v2/user`,
   `/v2/projects`, medlemslisten, teammedlemmene og topicen jobbkjøreren lager, og
   på leveringen av brev: biblioteket (søk og opplasting) og dokumentreferansene på
   topicen, med alt i minnet (#1221).
   Et annet kall skrives som «falsk Catenda: ukjent kall» og får 404, og kjøringen
   ender med exit 1.
3. Starter TS-serveren (`server/start.ts`) med en egen innlogging i rollen
   `koe_runtime`, som oppstartskontrollen krever, og `APP_ENV=development`.
   Innloggingen er ekte: ingen `DISABLE_AUTH`, og sesjonen, CSRF-tokenet,
   prosjekttilgangen og kontraktsrollen avgjøres av serveren. De ekte `CATENDA_*`-
   og `ENTRA_*`-variablene i skyøkta fjernes fra miljøet, så ingenting når Catenda.
   Så starter `vite dev` på 5173, som `AUTH_FRONTEND_URL` og proxyen forutsetter.
4. Logger inn TE og BH i hver sin nettleserkontekst gjennom
   `/api/auth/catenda/login`. Den falske Catenda velger brukeren etter cookien
   `bruker=te|bh` på sin egen adresse.
5. Oppretter saken som TE med `POST /api/kjerne/saker` fra siden (201), prøver
   kallet uten CSRF-token (403) og som BH (400 `FEIL_PART` fra kjernen: registeret
   slipper begge sider gjennom, og kjernen avviser), og leser saken med `GET` som
   begge (200, med `part` fra sesjonen).
6. Med `--forlop` sender skriptet stegene i [brukerforløpet](../../../docs/domenetabell/brukerforlop/README.md),
   til kontrollpunktet i `--til` eller til siste steg (#1330). Saken får forløpets tittel.
   Kjøreren i `kjerne/tester/kjoerer.ts` lager kommandoen og den låste teksten mot journalen
   fra `GET`, og sender den med `brevtekst` og `expected_version` til
   `POST /api/kjerne/saker/{sak}/kommandoer` fra siden til parten som handler (201).
   Serveren avviser en annen tekst (LV-U2). Kontrollene ved hvert kontrollpunkt leses av
   journalen serveren gir tilbake, så samme forløp er prøvd i minnet, mot testbasen og
   gjennom serveren. Et forløp kjøres her bare når `visninger` i forløpsfila har
   `saksruta`. Skriptet venter til jobbkjøreren har levert alle brevene til den falske Catenda.
7. Tar skjermbildene `saksrute-te.png` og `saksrute-bh.png` av saksruta.
8. Med `--feil` (krever et kontrollpunkt med grunnlagskrav og uten vederlagskrav, som
   `--forlop BF-01 --til grunnlaget-er-godkjent`) framkaller skriptet
   feiltilstandene i skjemaet (#1215). TE fyller ut vederlagskravet, går til brevet og
   krysser av, og `page.route` på `**/api/kjerne/saker/{sak}/kommandoer` svarer på
   `POST` i stedet for serveren: 409 `VERSJONSKONFLIKT`, 403 `FORBIDDEN`, 500
   `INTERNAL_ERROR`, og et avbrudd (`route.abort`), som er et usikkert utfall. Kroppene
   har formen serveren gir. `GET` går til serveren, så en ny innlasting etter 409 er ekte.
   Skriptet skriver teksten i `role="alert"` og tar `feil-409.png`, `feil-403.png`,
   `feil-500.png` og `feil-avbrutt.png`. Det stopper med exit 1 hvis skjemaet ikke sender,
   eller ikke viser den forventede meldingen i `role="alert"`.

Med `--behold` står alt og kjører til Ctrl+C, så du kan drive siden selv, for eksempel
med et eget Playwright-skript. Send aldri rett i tabellene. Slik drives skjemaene videre:

1. Start med `--forlop` og `--til` for det saken skal ha før skjemaet du vil vise. Mangler
   forløpet, skriv det i `docs/domenetabell/brukerforlop/`. Med `--behold`
   skriver skriptet adressen til saksruta, og du kan se den selv.
2. Kopier `saksrute.ts` til en fil ved siden av, så importstiene virker, og bygg videre
   etter forløpet. Der finnes `loggInn`, `kjerneKall`, `serverbane`, sidene `te` og `bh`
   og saken. Commit ikke kopien.
3. Det skjermbildet ikke skal vise, hører hjemme i forløpet. Formen på hver handling står
   i `kommandoFor` i `kjerne/tester/klient.ts`. Kjernen avviser en kommando som ikke passer
   saken, og meldingen sier hvorfor.
4. Det skjermbildet skal vise, drives i skjemaet: fyll ut, «Se brev og send»,
   avkrysningen og «Send til byggherren» (eller BHs knapp for svaret). Ta bildet før og
   etter sendingen. Vent på teksten i siden, ikke på en fast tid.

Det skriptet ikke dekker:

- Ekte Catenda: OAuth-flyten, medlemslistene og teamene er den falske leverandørens
  svar, så de prøver serverens tolkning, ikke Catendas. Kontraktstestene mot ekte
  Catenda står i [miljø-skillen](../miljo/SKILL.md).
- Webhooken, levering av brev og vedlegg til Catenda, og Entra-innloggingen.
- Leserollen, godkjennere og en bruker uten team.
- Den gamle frontenden for samme flyt.

## Demoruta for brukerforløpene

`/demo/<ID>` viser saksvisningen for et brukerforløp mot en journal i minnet, uten
innlogging og uten server (#1330). Formatet og demoruta står i
[README for brukerforløpene](../../../docs/domenetabell/brukerforlop/README.md).

```bash
node .claude/skills/mockup-nettleser/demoruta.mjs [--url http://localhost:5173] [--utdata <mappe>]
```

Skriptet starter `vite dev` hvis ingen svarer, og driver BF-01: forløpet fra begynnelsen,
så fra kontrollpunktet der BH har mottatt vederlagskravet. BH svarer i skjemaet med
«Nei, for sent» og 60 000 kr subsidiært, kontrollerer brevet og sender det. TE bytter side,
ser svaret og godtar det. Til slutt startes forløpet på nytt, og et bilde tas på 390 px.
Det skriver brevtekstene og stopper med exit 1 når brevet ikke har det prinsipale
standpunktet og det subsidiære beløpet, når TE fortsatt får godta etter aksepten, og ved
JavaScript-feil. Kontrollene med kilde kjøres i komponenttesten
`src/lib/components/brukerforlop/__tests__/Demoforloep.test.ts`, ikke her.

Med `--visning varden` går de samme stegene gjennom Varden, den eksperimentelle
visningen (#1331), og skjermbildene har de samme navnene, så de to visningene kan
sammenlignes ved hvert kontrollpunkt. Demopanelet starter lukket og legges sammen mens
brukeren handler, fordi det står over saken når det er åpent. Med `?brukertest` i
adressen vises saken uten panelet. `node .claude/skills/mockup-nettleser/uu.mjs --varden`
kjører axe mot Varden, bred og smal.
Med `--sti <sti>`, som kan gjentas, kjører den axe på samme måte mot stiene, som showcasen `/demo/komponenter` (#1371).
axe går ikke inn i en iframe, så rammene i showcasen kjøres som egne stier (`/demo/komponenter/ramme?…`).
Kontrollene med kilde for Varden står i `src/lib/components/varden/__tests__/Varden.test.ts`.

## Prototypen for et brukerforløp

`prototype.mjs` er den mekaniske forprøven av en HTML-skisse av et nytt mønster i
`docs/design/prototyper/` (steg 6 i skillen [brukerforlop](../brukerforlop/SKILL.md), #1347).
Et helt forløp forprøves i demoruta med `demoruta.mjs` (oppdragsgiver 28.10, #1331). Demoruta
driver i dag bare BF-01, så andre forløp må bygges der før de kan forprøves. Den åpner prototypen med
`file://`, uten vite, og følger klikkstiene under `prototype` i forløpsfila. Formatet står i
[README for brukerforløpene](../../../docs/domenetabell/brukerforlop/README.md#formatet).

```bash
node .claude/skills/mockup-nettleser/prototype.mjs BF-03 [--utdata <mappe>]
```

Skriptet klikker lenkene i hver klikksti med 1440 px bredde og kontrollerer at hvert klikk
fører til ankeret i stien, og at tekstene i `staar` er synlige. Bare starten settes med
ankeret. Så kontrollerer det at hver `href="#…"` har et mål, at ankrene og stegene i
stegtabellen i bestillingen finnes og er dekket av en klikksti som når ankrene i steget, og at `data-spor` stemmer
med ID-ene i bestillingen begge veier. axe (WCAG 2.1 A og AA) kjøres i hver tilstand stiene
når, og konsollfeilene samles. Forespørsler til nettet blokkeres, så nettfontene mangler på
skjermbildene. Det tas ett skjermbilde per tilstand, ett med «Vis sporbarhet» og ett per
tilstand på 390 px. Bredden rapporteres, men stopper ikke (oppdragsgiver 27.10). Ellers gir
et avvik exit 1. Rapporten skrives til standard ut og er kort nok til å legges i en PR.

## Skjermbildene i PR-en

Skjermbildene ligger på grenen `skjermbilder`, som ikke har felles historikk med `main`
og aldri merges, med én mappe per PR (`pr-<nummer>/`) (oppdragsgiver 23.10, #1222).
PR-en lenker dem derfra. En skyøkt kan ikke laste opp bilder til GitHub gjennom API-et.

```bash
.claude/skills/mockup-nettleser/skjermbilder.sh <pr> /tmp/saksrute-skjermbilder/*.png
```

- **Første gang** finnes ikke grenen, og skriptet lager den uten forelder (orphan).
- **Ellers** henter skriptet bare commiten og trærne på grenen i en midlertidig bar
  klon (`--depth=1 --filter=blob:none`), ikke bildene til andre PR-er, og legger en ny
  commit oppå med mappen byttet ut. Arbeidstreet og grenen du står på røres ikke. Et
  push som avvises fordi en annen økt kom først, prøves på nytt.
- **Lenken** skriver skriptet, i formen
  `![navn](https://raw.githubusercontent.com/khjohns/endringsmeldinger/<commit>/pr-<nummer>/<fil>)`.
  Den er festet til commiten, ikke til grenen, så den virker også etter ryddingen.
  Lim lenkene inn i PR-beskrivelsen. Opprett PR-en først, så nummeret finnes.
- **Ryddingen** gjør orkestratoren når PR-en er merget eller lukket:
  `skjermbilder.sh --slett <pr>`. Bildene blir liggende i historikken til grenen, så
  lenkene i PR-en virker fortsatt, men toppen av grenen holdes liten.

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

## Universell utforming med axe

```bash
node .claude/skills/mockup-nettleser/uu.mjs [--url http://localhost:5173] [--scenario scenario1] [--vis 5]
```

Legger `axe.min.js` fra devDependency-en `axe-core` inn i `/mockup` og kjører
reglene for WCAG 2.1 A og AA i to oppsett: lys modus (`colorScheme`, som
`app.html` leser), på 1440 og 390 px. Mørk modus vurderes ikke nå (oppdragsgiver 29.10).
I hvert oppsett skannes saken som TE og som BH
(handlingslinja og betegnelsene i sporoversikten for BH). På bred skjerm kjøres også
BHs svarskjema for fristen og for vederlaget; vederlaget i `scenario1prod`, uansett
`--scenario` (#1213). Det skriver reglene som er brutt, med inntil `--vis` steder hver og
forholdstallet for kontrast, og det axe ikke kan avgjøre («kontroller»). Et brudd
gir exit 1. Kjøringen tar om lag to minutter.

`uu.mjs` kjører bare mot `/mockup`, så den ekte saksruta, med feiltilstandene fra
`saksrute.ts --feil`, kontrolleres for hånd etter [`uu-sjekk`](../uu-sjekk/SKILL.md).

axe finner bare en del av feilene. Resten kontrolleres for hånd etter skillen
[`uu-sjekk`](../uu-sjekk/SKILL.md). Det er ingen CI-jobb for skriptet (#1187).

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
