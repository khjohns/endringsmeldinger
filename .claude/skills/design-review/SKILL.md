---
name: design-review
description: Strengt review av en diff som endrer visningen i endringsmeldinger, med hierarki, tokens, tilstander, tilgjengelighet og vedtakene om farge og ord, alvorlighet etter stoppregelen og en godkjenningsterskel. Kjøres etter design-deslop og før /code-review, i en ny økt, eller i byggeøkta når diffen i visningen er liten. Kreves når en .svelte- eller CSS-fil i src/ endres synlig.
---

# Review av visningen

Tilpasset fra `design-review` i interface-design (se
[lisensen](../grensesnitt/LISENS.md)). Les [systemfila](../../../docs/design/system.md)
og [grensesnitt-skillen](../grensesnitt/SKILL.md) først.

Spørsmålet er ikke om visningen virker og står på linje, men om hvert valg er tatt med
vilje, og om visningen sier det partene sa, verken mer eller mindre. Reviewet gir en
dom. Det endrer ingenting før dommen er gitt. Rettingene gjøres etterpå, i samme økt.

## Når og hvor

- **Når:** når diffen endrer `.svelte`- eller CSS-filer under `src/` synlig. Ren logikk
  i frontenden trenger bare `/code-review` (`AGENTS.md`, «Arbeidsform»).
- **Rekkefølgen:** etter `design-deslop` i byggeøkta, og før `/code-review`, så
  kodereviewet ser den endelige koden.
- **Hvor:** i en ny økt, på utkast-PR-en. Under om lag 200 endrede linjer i
  `.svelte`- og CSS-filer kan byggeøkta kjøre den selv (`AGENTS.md`). Reviewøkta får
  PR-nummeret og tilstanden i PR-en, ikke historikken, og arbeider etter «Review i
  ny økt» i orkestreringsskillen.

## Fem steg

### 1. Omfang og hensikt

Avgrens diffen (`git diff --name-only origin/main...`). Les hensikten i
grensesnitt-skillen og i systemfila. Reviewet vurderer mot den hensikten, ikke mot
et allment ideal. En tett sporoversikt feiler ikke fordi den er tett.

### 2. Se helheten først

Se visningen med skillen `mockup-nettleser`, i lys og mørk modus og på smal skjerm,
og den ekte saksruta når flyten krever det. Ta skjermbilder til PR-en. Spør:

- Leder én ting, eller konkurrerer alt?
- Ser du partenes siste krav og svar i hvert spor uten å lete?
- Overlever hierarkiet når du myser? Roper noe?

### 3. Linsene, én om gangen

**A · Vedtakene.** Den viktigste linsen.
- Har hvert spor høyst én betegnelse, fra lista og i rekkefølgen vedtaket gir? Har
  saken ingen samlet farge eller status der vedtaket ikke tillater det?
- Står partenes standpunkter med part, dato og brev, og er appens lesing merket som
  appens?
- Sier visningen at et krav er prekludert, tapt, oversittet eller avgjort, med ord,
  farge, ikon eller nedtelling? Det er en blocker.
- Vises et tall ingen har sagt, som «0 kr» for et prinsipalt avslag?
- Ser et annet team utkast eller interne tall?
- Vedtakene står i systemfila under «Vedtak som styrer visningen». Les vedtaket, ikke
  en gjengivelse.

**B · Hierarki og typografi.**
- Navngi fokuselementet. Vinner det? Er resten dempet?
- Holder blekknivåene (`--ink` til `--ink-3`) hierarkiet? Brukes `--ink-ghost` til noe
  som betyr noe?
- Tall, beløp og datoer i `--font-mono` med `tabular-nums`? Kontraktstekst i
  `--font-legal`?

**C · Flater og tokens.**
- Bare tokens fra `theme.css`? Ingen rå hex, og ingen tokens som ikke er definert?
- Kanter, ikke skygger, unntatt overlegg? Radius etter skalaen?
- Fungerer mørk modus, og holder kontrasten WCAG AA for tekst som betyr noe?

**D · Komposisjon.**
- Tett der parten sammenligner, luft rundt brevteksten?
- Fungerer visningen på smal skjerm uten vannrett rulling?

**E · Tilstander og animasjon.**
- Standard, hover, aktiv, fokus og deaktivert? Lasting, tom, feil og konflikt?
- Viser en handling som venter, at den venter, og beholder skjemaet ved feil?
- Treffflate på minst 40 px? Animasjonen etter grensesnitt-skillen?

**F · Gjenbruk og innhold.**
- Laget på nytt det som finnes: `<div onclick>`, egen dialog eller nedtrekksliste,
  samme lange klasse mange steder? En egen kontroll uten tastatur, fokus eller ARIA
  er en blocker.
- Negative marger, `calc()` som nødutgang eller absolutt posisjonering for å komme
  rundt flyten?
- Les hver synlige tekst: setningsstil, TE, BH, EO og KOE, «§ 33.8» med mellomrom,
  og samme ord som i domenetabellen.

### 4. Alvorlighet og filter

Alvorligheten følger stoppregelen for funn i `AGENTS.md`:

- **Blocker:** feil resultat nå, eller brudd på et vedtak, kontrakten eller
  systemfila. Også en utilgjengelig egen kontroll, en tilstand som mangler i en
  flyt, og et token som ikke er definert. Rettes i PR-en.
- **Bør rettes:** et reelt håndverksavvik som ikke gir feil resultat. Føres i
  oppfølgingsissuet bare etter reglene for det i `AGENTS.md`, ellers avvises det med
  én linje.
- **Merknad:** nevnes én gang og avvises.

Meld ikke:

- **smak:** et valg som er sammenhengende med hensikten, selv om du ville valgt
  annerledes;
- det systemfila eller et vedtak har avgjort;
- det som er utenfor diffen;
- det lint, format eller typesjekk eier.

Kan du ikke si hvorfor funnet koster brukeren noe eller bryter en regel, er det smak.
Få funn med høy sikkerhet er bedre enn en lang liste.

### 5. Rapport og dom

For hvert funn: hva som er valgt som standard eller er feil, hvorfor det koster
brukeren eller bryter en regel, og rettingen som et valg, ikke en lapp. Merk
alvorligheten. Ta med skjermbilder før og etter når du har dem.

## Godkjenningsterskel

Godkjenn ikke fordi visningen virker. For å godkjenne:

- vedtakene om betegnelse, farge, frist og ord holder;
- ett fokuspunkt, og hierarki som overlever skvisetesten;
- bare tokens fra `theme.css`, som er definert, og kontrast etter WCAG AA i begge
  modi;
- alle tilstander, og tilgjengelige kontroller fra bits-ui eller komponentene som
  finnes;
- ingen strukturelle omveier, og tekst etter språkreglene i `AGENTS.md`.

Én blocker gir **ikke godkjent**, med konkrete rettinger.

## Rettingene

Rettes i samme økt, blockerne først. Bygg om fra valget, ikke med lapper. Et
gjennomgående funn som krever mer enn en avgrenset retting, føres etter stoppregelen.
Kontrollen av rettingene gjelder bare rettingsdiffen. Dommen og håndteringen av
funnene står i PR-beskrivelsen under «Verifikasjon og grenser». Nye mønstre og valg
føres i systemfila i samme PR.
