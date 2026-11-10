---
name: mockup-nettleser
description: Kjører den ekte saksruta og demoruta i Chromium i skyøkta. saksrute.ts sender stegene i et brukerforløp mot TS-serveren og testbasen i SQL Server, med innlogging og skjermbilder. demoruta.mjs driver brukerforløpene i Varden mot en journal i minnet. prototype.mjs forprøver en HTML-skisse av et nytt mønster. skjermbilder.sh legger skjermbildene i en PR. uu.mjs kjører axe for WCAG 2.1 A og AA. Brukes for å se en frontendendring i nettleseren, ta skjermbilder til en PR og prøve universell utforming.
---

# Saksruta og demoruta i nettleseren

## Den ekte saksruta

Den ekte saksruta `/{prosjekt}/{sak}` mot TS-serveren og testbasen i SQL Server ([DL-U1](../../../docs/plans/vedtak.md#dl-u1)) kreves
for en diff i saksvisningen, etter leveranseskillen, «Review og funn». Den kjøres med:

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
   Har forløpet `utgangspunkt.opprettes` (BF-05, KT-U11), oppretter ikke skriptet saken med
   `POST`. TE fyller ut og sender det første steget i skjemaet på `/{prosjekt}/ny` i
   nettleseren, og skriptet tar `ny-sak-skjema.png`, `ny-sak-brev.png` og `ny-sak-sendt.png`,
   kontrollerer at TE kommer til saken med kvitteringen, og at påberopelsen i journalen har
   feltene TE fylte ut. Til slutt avbryter TE et nytt skjema og kommer til sakslisten
   (`ny-sak-avbrutt.png`).
7. Tar skjermbildene `saksrute-te.png` og `saksrute-bh.png` av saksruta.
8. Med `--feil` (krever et kontrollpunkt der TE kan godta BHs svar på vederlagskravet, som
   `--forlop BF-01 --til te-har-mottatt-svaret`) framkaller skriptet feiltilstandene ved
   sendingen i Varden (#1215, #1676). TE åpner vederlagssporet, velger «Godta svaret» og
   krysser av i brevkontrollen, og `page.route` på `**/api/kjerne/saker/{sak}/kommandoer`
   svarer på `POST` i stedet for serveren: 409 `VERSJONSKONFLIKT`, 403 `FORBIDDEN`, 500
   `INTERNAL_ERROR`, og et avbrudd (`route.abort`), som er et usikkert utfall. Kroppene har
   formen serveren gir. `GET` går til serveren, så en ny innlasting etter 409 er ekte.
   Aksepten er valgt fordi den sendes gjennom brevkontrollen, som alle brevene i Varden
   bruker, uten et skjema med felt foran. Skriptet skriver teksten i `role="alert"` og tar
   `feil-409.png`, `feil-403.png`, `feil-500.png` og `feil-avbrutt.png`, med meldingen rullet
   inn i bildet. Det stopper med exit 1 hvis skjemaet ikke sender, eller ikke viser den
   forventede meldingen i `role="alert"`.

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

## Demoruta for brukerforløpene

`/demo/<ID>` viser saksvisningen for et brukerforløp mot en journal i minnet, uten
innlogging og uten server (#1330). Formatet og demoruta står i
[README for brukerforløpene](../../../docs/domenetabell/brukerforlop/README.md).

```bash
node .claude/skills/mockup-nettleser/demoruta.mjs [--url http://localhost:5173] [--utdata <mappe>]
```

Skriptet starter `vite dev` hvis ingen svarer, og driver BF-01, eller forløpet i `--forlop`
(BF-01 og BF-04 har kontrollpunktene skriptet bruker): forløpet fra begynnelsen,
så fra kontrollpunktet der BH har mottatt vederlagskravet. BH svarer i skjemaet med
«Varslet for sent» og 60 000 kr subsidiært, kontrollerer brevet og sender det. TE bytter side,
ser svaret og godtar det når forløpet har kontrollpunktet `te-har-godtatt-svaret`. Til slutt startes forløpet på nytt, og et bilde tas på 390 px.
Det skriver brevtekstene og stopper med exit 1 når brevet ikke har lagene fra standpunktet i
kontrollpunktet `te-har-mottatt-svaret` og det subsidiære beløpet, når TE fortsatt får godta etter aksepten, og ved
JavaScript-feil. Kontrollene med kilde kjøres i komponenttesten
`src/lib/components/brukerforlop/__tests__/Demoforloep.test.ts`, ikke her.

Skriptet kjører alltid Varden, den eneste saksvisningen. `--visning varden` godtas og er
standard, og en annen verdi avvises. Skjermbildene får samme navn ved hvert kontrollpunkt. I Varden skriver skriptet også listen «Gjelder hvis»
over beløpet og stopper når den ikke har ett punkt per lag foran beløpet: avslaget av
forholdet når forløpet har kontrollpunktet `forholdet-er-avslaatt`, og innsigelsen om sen
varsling. I BF-04 er det to (#1400, #1410). Demopanelet starter lukket, og
skriptet åpner det bare for å bytte side og starte på nytt, fordi det står over saken når det
er åpent. Med `?brukertest` i adressen vises saken uten panelet. `/demo/komponenter` viser
bare Varden (#1371, #1471).
Kontrollene med kilde for Varden står i `src/lib/components/varden/__tests__/Varden.test.ts`.

## Prototypen for et brukerforløp

`prototype.mjs` er den mekaniske forprøven av en HTML-skisse av et nytt mønster i
`docs/design/prototyper/` (steg 6 i skillen [brukerforlop](../brukerforlop/SKILL.md), #1347).
Et helt forløp forprøves i demoruta med `demoruta.mjs`. Demoruta
driver i dag BF-01 og BF-04, så andre forløp må bygges der før de kan forprøves. Den åpner prototypen med
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
tilstand på 390 px. Bredden rapporteres, men stopper ikke. Ellers gir
et avvik exit 1. Rapporten skrives til standard ut og er kort nok til å legges i en PR.

## Skjermbildene i PR-en

Skjermbildene ligger på grenen `skjermbilder`, som ikke har felles historikk med `main`
og aldri merges, med én mappe per PR (`pr-<nummer>/`).
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
`uu.mjs`.

**Lokalt** (#1410) trengs den globale pakken og en nettleser. `demoruta.mjs` og `uu.mjs`
viser hit når en av dem mangler.

1. Installer pakken globalt, utenfor repoet: `npm i -g playwright`. Skriptene finner den med
   `npm root -g`. `npm i playwright` i repoet er ikke lov.
2. La `PLAYWRIGHT_BROWSERS_PATH` være usatt. Da starter `demoruta.mjs` og `uu.mjs` installert
   Google Chrome (`channel: 'chrome'`), og ingen `playwright install` trengs. Chrome må ligge
   der Playwright venter den, på en Mac i `/Applications/Google Chrome.app`.
3. Er `PLAYWRIGHT_BROWSERS_PATH` satt, som i skyøkta, må mappa ha
   `chromium_headless_shell-<revisjon>` for revisjonen den globale pakken venter. Ellers
   stopper skriptet og sier hvilken mappe det lette etter.

De andre skriptene i skillen krever fortsatt `PLAYWRIGHT_BROWSERS_PATH`.

## Universell utforming med axe

```bash
node .claude/skills/mockup-nettleser/uu.mjs [--url http://localhost:5173] [--sti <sti>] [--vis 5]
```

Legger `axe.min.js` fra devDependency-en `axe-core` inn i Varden i demoruta
(`/demo/BF-01…`) og kjører reglene for WCAG 2.1 A og AA i fire oppsett: lys og mørk
modus (`colorScheme`, som `app.html` leser), på 1440 og 390 px. `--varden` godtas og er
standard. Med `--sti <sti>`, som kan gjentas, kjører den stiene i stedet, på samme måte,
for eksempel showcasen `/demo/komponenter`. axe går ikke inn i en iframe, så rammene i
showcasen kjøres som egne stier (`/demo/komponenter/ramme?…`). Det skriver reglene som er
brutt, med inntil `--vis` steder hver og forholdstallet for kontrast, og det axe ikke kan
avgjøre («kontroller»). Et brudd gir exit 1.

axe finner bare en del av feilene. Resten, og den ekte saksruta med innlogging og
feiltilstandene fra `saksrute.ts --feil`, kontrolleres for hånd etter skillen
[`uu-sjekk`](../uu-sjekk/SKILL.md). Det er ingen CI-jobb for skriptet (#1187).

## Det statiske bygget

`npm run build` og `npx vite preview --port <port>` viser SPA-fallbacken: en dyp
rute som `/P001/SAK-1` skal svare med appen. En sti uten rute gir 404 i
`vite preview`. I produksjon står fallbacken i `try_files` i `nginx.conf`.
