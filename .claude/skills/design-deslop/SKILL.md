---
name: design-deslop
description: Rask rydding av en diff som endrer visningen i endringsmeldinger. Fjerner det som får grensesnittet til å se generert ut (flatt hierarki, rå verdier i stedet for tokens, manglende tilstander, egne kontroller der en finnes), uten å endre atferden. Kjøres av byggeøkta på egen diff før design-review og før PR-en meldes klar. Gir ingen dom; det gjør design-review.
---

# Rydding i visningen

Tilpasset fra `design-deslop` i interface-design (se
[lisensen](../grensesnitt/LISENS.md)). Les [systemfila](../../../docs/design/system.md)
og [grensesnitt-skillen](../grensesnitt/SKILL.md) først.

Én jobb: få diffen til å holde seg til systemet og slutte å se generert ut. Rask,
avgrenset og uten endret atferd. Dette er ikke et review med godkjenningsterskel. Det
er `design-review`.

**Omfang:** linjene diffen endrer i `.svelte`- og CSS-filer under `src/`
(`git diff --name-only origin/main...`). Gammel rot i urørt kode tas ikke med.

## Runde 1: myse

Se den ferdige visningen med skillen `mockup-nettleser`, i lys og mørk modus. Mys.

1. **Ingen fokuspunkt.** Alt konkurrerer. → Gjør det brukeren kom for, tydeligst,
   og demp resten.
2. **Flatt hierarki.** Etikett, verdi og metadata ser like ut. → Vekt og blekknivå
   (`--ink`, `--ink-2`, `--ink-3`), ikke bare størrelse.
3. **Ensformig.** Samme kort, samme mellomrom og samme tetthet overalt. → Grupper
   tett, og sett luft mellom gruppene.
4. **Farge uten mening.** En statusfarge for pynt, eller flere aksenter. → Grønne
   nyanser for struktur, statusfarge bare der systemfila sier det.
5. **Linjer som gjør jobben til avstand.** → Fjern skillelinjer der avstand eller en
   flate er nok.

## Runde 2: lese diffen

- **Tokens:** rå hex, `rgb()`, rå `px` for kanter → tokenet i `theme.css`. Et token
  som ikke er definert (#1184) → et som er definert.
- **Typografi:** tall, beløp, datoer og ID-er uten `--font-mono` og `tabular-nums`
  → med. Kontraktstekst og brev i `--font-legal`.
- **Flater og kanter:** skygge på noe som ikke er et overlegg → kant med `--rule`.
  Radius som avviker fra det systemfila sier → det den sier.
- **Tilstander:** hover, fokus, aktiv eller deaktivert mangler → legg til. Mangler
  hele tilstanden for lasting, tom eller feil, er det byggearbeid. Noter det til
  `design-review`.
- **Animasjon:** `transition: all`, `ease-in`, over 300 ms, eller animasjon på noe
  som gjentas ofte → etter grensesnitt-skillen.
- **Avstand:** verdier utenfor 4 px-rutenettet → rutenettet. Usymmetrisk padding uten
  grunn → symmetrisk. Negative marger, `calc()` som nødutgang eller absolutt
  posisjonering for å komme rundt flyten → den enkle layouten.
- **Laget på nytt:** `<div onclick>` → `<button>` eller `<a>`. Egen nedtrekksliste,
  dialog eller tooltip → bits-ui eller komponenten som finnes. Samme lange klasse
  mange steder → en komponent eller en klasse i `theme.css`. En egen kontroll uten
  tastatur, fokus eller ARIA er også en feil. Meld den selv om den ser riktig ut.

## Rør ikke

- Det systemfila eller et vedtak har avgjort. Det er et valg, ikke rot.
- Et avvik med en grunn, som en kraftigere kant på fokuskortet.
- Det prettier og eslint eier.
- Ord, betegnelser og tekst. De følger vedtakene og hører til `design-review` og
  `/code-review`.

Er du i tvil, la det stå og noter det.

## Grenser

- Atferden er uendret, unntatt en tydelig visuell feil.
- Små, avgrensede endringer. Blir det ombygging, noter det til `design-review`.
- Følg stilen i fila: Tailwind-klasser der fila bruker dem, klasser og tokens i
  `theme.css` ellers.
- Kjør `npm run lint` og `npx svelte-check` etterpå.

## Rapporten

En tabell per kategori med **Før** og **Etter**, én rad per retting, med fil og
egenskap. Rettingene fra runde 1 først. Avslutt med én eller to setninger, og med det
som er notert til `design-review`. Rapporten står i PR-beskrivelsen under
«Verifikasjon og grenser».
