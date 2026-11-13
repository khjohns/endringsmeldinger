---
paths:
  - "kjerne/**"
---

# Kjernen

Reglene som gjelder hele kjernen, står i `CLAUDE.md` under «Domenekjernen». Denne fila
har det som gjelder modulene i `kjerne/` og flyttinger mellom dem (#1695).

## Hva reglene leser

Arkitekturtesten i `kjerne/tester/` håndhever hva reglene leser: hvert felt og hver importert verdi som er deklarert i kjernen, står i hvitelisten `LESBART` med en klasse, som utsagn, relasjon, frosset eller predikat, og eventuelt de modulene eller funksjonene som får lese det. En oppsummering har ingen klasse, så et nytt felt eller en ny import med en oppsummering gir rød test til den er klassifisert. Testen ser ikke alt, for eksempel ikke en status som en funksjon i samme modul regner ut og returnerer; grensene står i modulheaderen i testen. Et nytt felt reglene leser, klassifiseres der. Kjente avvik står i en lukket liste med issuet som fjerner dem.

## Versjonene

Regelsettet står i `kjerne/regler/`; endres det, økes `REGELVERSJON` der. Endres resten av kjernen, økes `PROJEKSJONSVERSJON` i `kjerne/versjon.ts`. `kjerne/frosset/` bestemmer hva beslutningsgrunnlaget fryser, så endres en fil der eller frysingen eller teksten i et spor (`kjerne/spor/<spor>/frysing.ts` og `tekst.ts`), økes begge. Regelversjonsvakten i CI krever det, men ikke for en flytting som bare endrer importstiene, og heller ikke når bare kommentarene er endret (#1549).

## Hvor koden hører hjemme

- **En domeneregel ligger i `regler/` eller `utledning/`, ikke i `frosset/`.** En kontroll
  av en vurdering etter en bestemmelse, for eksempel punkt 34.1.2 eller punkt 34.2.2, er en regel
  og står i `regler/`. `frosset/` leser kravet, regner ut og fryser svaret og skriver
  teksten. Kontrollen etter OV-U23 står i utregningen fordi den er en del av lesingen av
  postene i kravet.
- **`regler/` når ikke `frosset/`**, heller ikke frysingen og teksten i et spor eller gjennom
  en annen modul. Arkitekturtesten håndhever det. En regel som trenger noe fra kravet, tar
  verdien den trenger, som kategoriene som tekst, og ikke `Krav`
  (`regler/svarkontroll.ts`).
- **Kravinnholdet og utregningen i svaret leses gjennom formatfila for sporet**
  (`spor/<spor>/format.ts`), med typen for sporet. En ny lesing av `Krav.innhold` eller
  `Svar.utregning` legges der, ikke som en ny typekonvertering hos kalleren. Det gjelder også
  serveren og visningen.
- **Teksten står i tekstlaget**: brevteksten i `frosset/brevtekst.ts`, byggeklossene den deler
  med teksten i sporene i `frosset/brevdeler.ts`, linjen for byggherrens standpunkt i
  `frosset/linje.ts` og ordene de deler med visningen i `frosset/tekst.ts`. Teksten som er
  sporets egen, står i `spor/<spor>/tekst.ts`. En tekst kan lese en regel, men en regel leser
  ikke en tekst.
- **Det som er sporets eget, står i `kjerne/spor/<spor>/`**, i én fil per rolle (#1783):
  `format.ts` (`format/`), `frysing.ts` og `tekst.ts` (`frosset/`), `utledning.ts` og
  `visning.ts` (`utledning/`, og visningen er visning) og `kommando.ts` (`kommandoer/`). En
  rollefil hører til mappen rollen står for, så grensene og versjonene for den mappen gjelder
  den, og arkitekturtesten avviser en annen fil i `spor/`. Rollene står i `ROLLER` i
  arkitekturtesten, og vaktene i Python prøves mot dem. Den felles modulen slår opp i sporet
  gjennom en `Record<Spor, …>` for rollen. Regelsettet for sporet står i `regler/`.

## Når kode flyttes mellom moduler

- `fil` i feilinnføringene følger koden. Ankerstrengene beholdes, også innrykket når det
  lar seg gjøre. Endres bare innrykket, sier commiten det.
- `LESBART` i arkitekturtesten følger funksjonen. En leser som var i samme modul, var ikke
  oppført; når den havner i en annen modul, føres den som leser. Lista over lesere utvides
  ikke ut over stedene som leste før flyttingen.
- Referansene `fil#funksjon` i `docs/domenetabell/regler.json` oppdateres, og README
  skrives med `docs/verktoy/domenetabell.py --skriv`. Søk også i den levende
  dokumentasjonen, ikke i daterte vurderinger og auditer.
- Regelversjonsvakten godtar en flytting uten nye versjoner bare i tilfellene
  `.github/scripts/flytting.py` avgjør (#309, #1549). En deling er ikke et av dem, så
  `REGELVERSJON` og `PROJEKSJONSVERSJON` økes, og startjournalene skrives på nytt med `node kjerne/tester/brukerforloep.ts --skriv`.
