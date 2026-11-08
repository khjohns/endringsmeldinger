---
paths:
  - "kjerne/**"
---

# Kjernen

Reglene som gjelder hele kjernen, står i `AGENTS.md` under «Domenekjernen». Denne fila
har det som gjelder modulene i `kjerne/` og flyttinger mellom dem (#1695).

## Hvor koden hører hjemme

- **En domeneregel ligger i `regler/` eller `utledning/`, ikke i `frosset/`.** En kontroll
  av en vurdering etter en bestemmelse, for eksempel § 34.1.2 eller § 34.2.2, er en regel
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
- Regelversjonsvakten godtar bare en fil som er lik byte for byte utenfor importene. En
  deling er ikke det, så `REGELVERSJON` og `PROJEKSJONSVERSJON` økes, og startjournalene
  skrives på nytt med `node kjerne/tester/brukerforloep.ts --skriv`.
