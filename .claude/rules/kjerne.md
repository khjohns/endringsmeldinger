---
paths:
  - "kjerne/**"
---

# Kjernen

Reglene som gjelder hele kjernen, står i `AGENTS.md` under «Domenekjernen». Denne fila
har det som gjelder modulene i `kjerne/` og flyttinger mellom dem (#1695).

## Hva reglene leser

Arkitekturtesten i `kjerne/tester/` håndhever hva reglene leser: hvert felt og hver importert verdi som er deklarert i kjernen, står i hvitelisten `LESBART` med en klasse, som utsagn, relasjon, frosset eller predikat, og eventuelt de modulene eller funksjonene som får lese det. En oppsummering har ingen klasse, så et nytt felt eller en ny import med en oppsummering gir rød test til den er klassifisert. Testen ser ikke alt, for eksempel ikke en status som en funksjon i samme modul regner ut og returnerer; grensene står i modulheaderen i testen. Et nytt felt reglene leser, klassifiseres der. Kjente avvik står i en lukket liste med issuet som fjerner dem.

## Versjonene

Regelsettet står i `kjerne/regler/`; endres det, økes `REGELVERSJON` der. Endres resten av kjernen, økes `PROJEKSJONSVERSJON` i `kjerne/versjon.ts`. `kjerne/frosset/` bestemmer hva beslutningsgrunnlaget fryser, så endres en fil der, økes begge. Regelversjonsvakten i CI krever det, men ikke for en flytting som bare endrer importstiene, og heller ikke når bare kommentarene er endret (#1549).

## Hvor koden hører hjemme

- **En domeneregel ligger i `regler/` eller `utledning/`, ikke i `frosset/`.** En kontroll
  av en vurdering etter en bestemmelse, for eksempel punkt 34.1.2 eller punkt 34.2.2, er en regel
  og står i `regler/`. `frosset/` leser kravet, regner ut og fryser svaret og skriver
  teksten. Kontrollen etter OV-U23 står i utregningen fordi den er en del av lesingen av
  postene i kravet.
- **`regler/` importerer ikke `frosset/`.** En regel som trenger noe fra kravet, tar
  verdien den trenger, som kategoriene som tekst, og ikke `Krav`
  (`regler/svarkontroll.ts`).
- **Kravinnholdet leses gjennom `frosset/kravinnhold.ts`.** En ny lesing av
  `Krav.innhold` legges der, ikke som en ny typekonvertering hos kalleren.
- **Teksten står i tekstlaget**: brevteksten i `frosset/brevtekst.ts` og ordene den deler
  med linjen og visningen i `frosset/tekst.ts`. En tekst kan lese en regel, men en regel
  leser ikke en tekst.

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
