# Samlevedtak: varslene etter punkt 34.3.3 og 34.4, og påberopelse av sent varsel, versjon 4

Kartlegging 26.11.2026, kontrollert på `7708574` (`main`). Del av steg 4 i #1534, runde 7 i #1065.
`vedtaksregister.py --sjekk` varsler at [VS-U87](../plans/vedtak.md#samlevedtak-sent-varsel-3) har fått
fire endringer etter at temaet ble samlet, og at den neste skrives som et samlevedtak (svar 6 og 10 i
#1534). Den neste er svarene i #2456. Fila viser til punktene uten å gjengi dem, setter ingen ID-er og
skriver ikke i `vedtak.toml`.

**Grensen.** Versjon 4 tar inn postene etter versjon 3 og svarene i #2456, og ikke mer. Nummereringen
står, og nye punkter kommer til slutt (svar 2 A i vurderingen av versjon 3). Svar 2 i #2456 føres ikke
før oppfølgingsspørsmålene under er besvart (orkestratoren i
[7199113568](https://github.com/khjohns/endringsmeldinger/issues/2456#issuecomment-7199113568)).

## Endringene

`--kjede VS-U87` og kommentarene i #2456.

| Kilde | Forhold | Hva den endrer i versjon 3 |
| --- | --- | --- |
| VS-U89 (25.11) | endrer VS-U87 | Opphever punkt 15–18, siste setning i punkt 19, og første og siste kulepunkt i beslutningsdelen. Endrer også VS-U3, OV-U99, MM-U47, EO-U39, LV-U4 og KA-U87 |
| VS-U91 (25.11) | presiserer VS-U87 punkt 23 og 25 | Brevet for en senere kravversjon sier ikke noe om varselet for en post fra et eldre krav |
| VS-U92 (26.11) | utvider beslutningsdelen (VS-U71 s5) | Et brev utenfor løsningen med varselet etter punkt 32.2 og varsler i vederlaget eller fristen legges til én gang |
| #2456 svar 1 A | utvider punkt 32 | Svaret på varselet etter punkt 33.4 som står alene: i tide eller for sent. Tillegget om nye svar står ordrett i svaret |
| #2456 svar 3 A | utvider punkt 34 og 9, 10 og 12 | Påberopelsen i svaret på varselet etter punkt 33.4 står mot senere krav, og forespørselen etter punkt 33.6.2 fastholder den (LV-U84 punkt 18) |
| #2456 svar 4 A | utvider punkt 31 setning 3 og 4 | Ingen svarfrist vises for svaret på varselet etter punkt 33.4 |
| #2456 svar 2 B med tillegg | endrer punkt 33 | Venter på spørsmål 1–4 |

## Motsigelser

- **M1 Svar 2 mot punkt 33.** Punkt 33 lar byggherren svare på varselet bare til en sendt kravversjon har
  det varselet gjelder. Svar 2 B lar byggherren svare på varselet etter punkt 33.4 til byggherren har
  svart på kravet. Oppdragsgiver la til: «Dette gjelder generelt og for alle varsler som kan komme før
  krav.» Svaret er senere og avgjør retningen, men ikke hvilke varsler og hvor lenge (spørsmål 1 og 2).
- **M2 Tillegget 26.11 mot punkt 30–35 og VS-U88.** Tillegget, ordrett: «I praksis burde det være mulig å
  også kun svare ut varsel også der varsel og krav er gitt samtidig». Punkt 30–35 gjelder et varsel som
  står alene. Står varselet i samme brev som kravet, eller er kravet selv varselet (punkt 7 og 22),
  svarer byggherren på varselet i svaret på kravet. VS-U88 punkt 2 sier at byggherren tar stilling til
  punkt 33.4 og 33.6.1 hver for seg, også når kravet var varselet, men i samme svar. Tillegget går
  lenger enn begge (spørsmål 3).
- **M3 Et svar bare på varselet og svarfristen for kravet.** Ingen vedtak sier hva et svar bare på
  varselet betyr for svarfristen for kravet. VS-U2 viser punkt 33.7 annet ledd og 34.3.3 annet ledd
  med frist og bestemmelse. Punkt 33.7 første ledd, ordrett: «Den parten som mottar krav på
  fristforlengelse, skal svare uten ugrunnet opphold etter å ha mottatt et begrunnet krav med
  angivelse av antallet dager fristforlengelse, jf. 33.6.1 og 33.6.2.» Punkt 34 har ingen svarplikt
  for vederlagskravet utover punkt 34.3.3 annet ledd, som gjelder varselet: «Den part som mottar
  varsel om justering, skal svare uten ugrunnet opphold.» (spørsmål 4)
- **M4 VS-U89 mot punkt 15–19 og beslutningsdelen.** Avgjort i VS-U89. Versjon 4 tar punktene ut (E25).

## Utkastet til versjon 4

Versjon 3 med disse endringene. Alternativ A er lagt til grunn i spørsmål 1–4. Kildene står i parentes.

- **Punkt 15–18, siste setning i punkt 19, og første og siste kulepunkt i beslutningsdelen** er tatt ut
  og erstattet med en henvisning til VS-U89. Punkt 19 gjelder TEs påberopelse i et svar. (VS-U89; E25)
- **Punkt 23 og 25** får en henvisning til VS-U91 for en senere kravversjon. (VS-U91; E26)
- **Beslutningsdelen, kulepunktet om brev med varsler (VS-U71 s5),** får VS-U92 som siste setning.
  (VS-U92; E27)
- **Punkt 31** får en ny setning: for varselet etter punkt 33.4 som står alene, viser løsningen ingen
  svarfrist, og har byggherren ingen innsigelse, trenger byggherren ikke svare. (#2456 svar 4 A; E28)
- **Punkt 32** får varselet etter punkt 33.4: byggherren kan si at varselet kom i tide eller for sent,
  og løsningen avgjør det ikke. Byggherren kan svare på nytt når datoen eller kravet endres. (#2456 svar
  1 A, med tillegget; E29)
- **Punkt 33** skrives om etter spørsmål 1 og 2: byggherren kan svare på varselet etter punkt 33.4,
  34.1.2, 34.1.3, 34.3.3 første ledd og 34.4 fram til byggherren har svart på en kravversjon med det
  varselet gjelder (kravet om fristforlengelse med dager, vederlagskravet, den særskilte
  vederlagsjusteringen eller kravposten etter punkt 23). Setningene om nytt svar, bevaringen av
  påberopelsen og byggherrens siste standpunkt står. (#2456 svar 2 B, med tillegget; E30)
- **Punkt 34** får varselet etter punkt 33.4: påberopelsen står mot hvert senere krav om
  fristforlengelse, og forespørselen etter punkt 33.6.2 fastholder den. «Som står alene» blir «i svaret
  bare på varselet», etter punkt 38. (#2456 svar 3 A; LV-U84 punkt 18; E31)
- **Punkt 38 (nytt):** står varselet i samme brev som kravet, også når kravet regnes som varselet
  (punkt 7 og 22; VS-U88 punkt 2), kan byggherren svare bare på varselet. Svaret gjelder bare varselet,
  og byggherren tar stilling til kravet i et senere svar, innenfor tidsrommet i punkt 33. Punkt 30–35
  gjelder svaret. (Tillegget 26.11; E32)
- **Punkt 39 (nytt):** et svar bare på varselet er ikke et svar på kravet. Svarfristen etter punkt 33.7
  for kravet vises fortsatt med frist og bestemmelse (VS-U2), og brevet sier at byggherren ikke har
  tatt stilling til kravet. For varselet etter punkt 34.3.3 første ledd er svaret på varselet svaret
  etter punkt 34.3.3 annet ledd, og løsningen avgjør ikke om det oppfyller svarplikten (punkt 30).
  (#2456, tillegget; E33)
- **Designdelen:** kulepunktet om at byggherren svarer på et varsel som står alene i samme svarskjema
  som kravet (VS-U61; VS-U64), gjelder også svaret bare på varselet etter punkt 38.

### Endret innhold i versjon 4

E25 VS-U89. E26 VS-U91. E27 VS-U92. E28 svar 4. E29 svar 1. E30 svar 2: tidsrommet i punkt 33 varer til
byggherren har svart på kravet, ikke til kravet er sendt, og gjelder alle varslene i vederlaget og
fristen. E31 svar 3. E32 tillegget: svar bare på varselet i samme brev som kravet. E33 svarfristen for
kravet etter et svar bare på varselet.

## Spørsmålene til oppdragsgiver

Oppfølgingen av svar 2 i #2456, med tillegget 26.11. Alle er juridiske.

1. **Hvilke varsler regelen gjelder for.**
   - **A (anbefalt):** «Byggherren kan svare bare på varselet etter punkt 33.4, 34.1.2, 34.1.3, 34.3.3
     første ledd og 34.4 før byggherren tar stilling til kravet.» Forhold: endrer VS-U87 punkt 33.
   - **B:** bare varselet etter punkt 33.4, slik spørsmål 2 i #2456 var skrevet. Punkt 33 står for
     varslene i vederlaget. Forhold: endrer VS-U87 punkt 33 for punkt 33.4.

   Belegg: tillegget «Dette gjelder generelt og for alle varsler som kan komme før krav». Varselet etter
   punkt 32.2 har sitt eget svar etter punkt 32.3 og er ikke med. Anbefaling: A, som tillegget sier.
   Styrer: kjernen for vederlaget (#2427) og fristen (#2456).
2. **Hvor lenge byggherren kan svare bare på varselet.**
   - **A (anbefalt):** «Byggherren kan svare på varselet fram til byggherren har svart på en kravversjon
     med det varselet gjelder. Deretter tar byggherren stilling i svaret på kravet.» Forhold: endrer
     VS-U87 punkt 33.
   - **B:** så lenge byggherren ikke har sagt noe om varselet i et svar på kravet. Et svar på kravet som
     ikke sier noe om varselet, lukker ikke. Forhold: endrer VS-U87 punkt 33 og snevrer inn punkt 9.

   Belegg: svar 2 B i #2456, «fram til byggherren har svart på det kravet». Anbefaling: A. Med B kan
   byggherren ta stilling til varselet etter at kravet er besvart, og punkt 33, siste setning (siste
   standpunkt for posten), får to steder. Styrer: når svaret på varselet tilbys.
3. **Varselet og kravet i samme brev.**
   - **A (anbefalt):** «Står varselet i samme brev som kravet, også når kravet regnes som varselet, kan
     byggherren svare bare på varselet. Svaret gjelder bare varselet, og byggherren tar stilling til
     kravet i et senere svar.» Forhold: utvider VS-U87 punkt 30–35 og VS-U88 punkt 2.
   - **B:** bare når varselet står som et eget varsel i brevet. Er kravet selv varselet (punkt 7 og 22),
     svarer byggherren på begge i svaret på kravet. Forhold: utvider VS-U87 punkt 30–35.

   Belegg: tillegget 26.11, og VS-U88 punkt 2, som skiller punkt 33.4 og 33.6.1 også når kravet var
   varselet. Anbefaling: A. «Varsel og krav er gitt samtidig» dekker begge. Styrer: om svarskjemaet
   tilbyr svaret bare på varselet for et brev med kravet, og #2451.
4. **Hva et svar bare på varselet betyr for svarfristen for kravet.**
   - **A (anbefalt):** «Et svar bare på varselet er ikke et svar på kravet. Svarfristen etter punkt 33.7
     for kravet vises fortsatt, og brevet sier at byggherren ikke har tatt stilling til kravet. Svaret
     på varselet etter punkt 34.3.3 første ledd er svaret etter punkt 34.3.3 annet ledd.» Forhold:
     presiserer VS-U2 og VS-U87 punkt 30.
   - **B:** et svar bare på varselet stopper visningen av svarfristen for kravet til byggherren svarer
     på kravet. Forhold: endrer VS-U2 for punkt 33.7.

   Belegg: punkt 33.7 annet ledd, ordrett: «Innsigelser mot kravet tapes dersom de ikke fremsettes
   innen fristen.» Fristen løper fra kravet, ikke fra svaret på varselet. Anbefaling: A. Med B kan
   byggherren tro at kravet er besvart, mens innsigelsene mot kravet kan tapes. Styrer: visningen av
   svarfristen og brevteksten for svaret bare på varselet.
5. **Formen (prosess).**
   - **A (anbefalt):** versjon 4 samler VS-U91 og VS-U92 og opphever dem ikke, og nummereringen står.
     VS-U89 står med sine forhold. Svarene 1, 3 og 4 i #2456 og spørsmål 1–4 føres som versjon 4, ikke
     som egne poster.
   - **B:** svarene i #2456 føres som en egen post, og versjon 4 samler den.

   Anbefaling: A. Svar 10 i #1534 sier at neste endring skrives som et samlevedtak. Styrer: vedtaks-PR-en.

## Kodefunn

Lest ut av koden, ikke kjørt.

- **K1** `hindrerSvaretPaaVarselet` i `kjerne/spor/vederlag/kommando.ts` avviser svaret på varselet når en
  sendt kravversjon har det varselet gjelder (punkt 33 i versjon 3). Med svar 2 B og spørsmål 1–2 A
  må grensen bli byggherrens svar på kravet.
- **K2** Samme funksjon krever et varsel som står alene (`varseletSvaretGjelder`). Et krav som regnes
  som varselet (punkt 22), har ikke et varsel å svare på. Spørsmål 3 A krever det.
- **K3** Fristen har ikke svar på varselet etter punkt 33.4 i kjernen (#2456).

## Forhold til #2451

#2451 gjelder ett svar på flere varsler i samme brev. Med spørsmål 3 A kan brevet også ha kravet, og
svarskjemaet i #2451 må da kunne ha raden for varselet uten svaret på kravet. Spørsmål 3 berører
derfor omfanget av #2451.

## Verifikasjon og grenser

Kildene er VS-U87, VS-U88, VS-U89, VS-U91, VS-U92 og VS-U2 med `--vis` og `--kjede`, teksten til
versjon 3 i vedtaksfila, kommentarene i #2456 og #1534 og NS 8407 punkt 33.4, 33.6, 33.7, 34.3.3 og
34.4 i `khjohns/kontrakt`. Arbeidsflyten for spørsmål 3 er ikke prøvd med forløp. Kodefunnene er ikke
kjørt.
