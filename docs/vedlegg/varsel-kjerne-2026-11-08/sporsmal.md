# Spørsmål før kjerneøkta for varselet per kravpost (BF-14), 08.11

Fra kartleggingen før byggingen av kjernedelen av VS-U50, VS-U51 og VS-U53 (#1663, G-10 i
[BF-14](../../domenetabell/brukerforlop/BF-14.md)). Stilt av orkestratoren 08.11 som nummerert
liste i tekst, ordrett som under.

## Spørsmål 1: hvordan kravposten og varselet knyttes sammen

**Bakgrunn.** Svar 6 A 07.11 ([spørsmålsfila](../bygging-bf14-2026-11-07/sporsmal.md)) ga
navnene i lagringsformatet: et varsel etter punkt 34.3.3 eller 34.4 lagres som et eget utsagn
som viser til kravposten (`gjelder` lik kravpostens ID). Det var før VS-U50. Etter VS-U50 kan TE
i kravskjemaet oppgi at varselet for en kravpost alt er gitt, med et varsel som står i saken fra
før. Et varsel som står i saken, kan ikke få en henvisning til kravposten i ettertid, fordi
hendelsene bare legges til.

**Belegg.** VS-U50, VS-U53, G-10 i BF-14, raden for varslene etter § 34.3.3 og § 34.4 i
domenetabellen («Navn i lagringsformatet»).

**Alternativene.**
- **A (anbefalt):** Kravposten viser til varselet. Kravposten får et valgfritt felt med varselet
  som gjelder for posten, både når TE velger et varsel i saken og når TE legger til et dokument i
  kravskjemaet. Varselet viser ikke til kravposten. Raden i domenetabellen rettes.
- **B:** Svar 6 A står. Et dokument TE legger til i kravskjemaet, viser til kravposten og skrives
  etter kravet. Et varsel som står i saken fra før, knyttes med et felt på kravposten. Koblingen
  finnes da i to former.

**Hva valget styrer.** Det lagrede formatet for kravposten og varselet før første ekte hendelse
(B-17), og hvordan kjernen finner varselet for en kravpost.

## Spørsmål 2: hva kravet sier om en post der varselet ble gitt før det første kravet

**Bakgrunn.** D-16 i BF-14 sier at et varsel etter punkt 34.3.3 eller 34.4 som er sendt eller
registrert før kravet, gjelder kravpostene med den beregningsregelen i neste kravversjon, og at
kravet da ikke sier at kravet er varselet. Det sier ikke om kravet nevner varselet. VS-U51 sier:
«Er varselet sendt eller registrert i løsningen før kravet, viser kravet bare til det.» Den
setningen står i sammenheng med valget TE gjør i kravskjemaet etter VS-U50. Prototypen viser ikke
tilfellet.

**Belegg.** VS-U48, VS-U51, D-16 og D-19 i BF-14.

**Alternativene.**
- **A (anbefalt):** Kravet viser til varselet i avsnittet for kravposten, med datoen, slik VS-U51
  sier for et varsel i løsningen. Ordlyden er design.
- **B:** Kravet sier ingenting om varselet for posten, slik kjernen gjør etter #1674.

**Hva valget styrer.** Teksten i kravet for en kravpost der varselet kom før kravet.

## Svar fra oppdragsgiver

Ikke kommet.
