# Samlevedtak A3: retting av sendt brev v4, varslingsdatoen v3 og brev sendt utenfor v2

Dato: 25.11.2026. Kontrollert commit: `c8992f4` (`main`). Del av #1534, steg 4, i formen etter svar
7 A ([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)),
med [A1](vurdering-samlevedtak-brev-utenfor-2026-11-17.md) og
[A2](vurdering-samlevedtak-varslingsdato-v2-2026-11-17.md) som mønster. Fila viser til punktene i
[MM-U55](../plans/vedtak.md#samlevedtak-retting-3), [VS-U76](../plans/vedtak.md#samlevedtak-varslingsdato-2)
og [OV-U114](../plans/vedtak.md#samlevedtak-brev-utenfor) uten å gjengi dem, og skriver ikke i
`vedtak.toml`. De foreløpige ID-ene settes når postene føres.

**Grensen.** A3 tar med endringene etter 17.11 og det som trengs for å lese regelen av ett vedtak.
Det som bare endrer andre temaer, står med sine forhold, og versjonene viser dit. **Prinsippet
14.11:** vedtaket sier budskapet, ordlyden står i designdelen.

## Tre poster, ikke én

A3 blir tre poster i én PR: versjon 4 av MM-U55, versjon 3 av VS-U76 og versjon 2 av OV-U114.

- De tre er hvert sitt tema med egen tekst: retting av sendt brev, varslingsdatoen og brev sendt
  utenfor løsningen. Én post måtte nummerere punktene på nytt, og henvisninger som «MM-U55 punkt
  10», «VS-U76 punkt 6a» og «OV-U114 punkt 15» i andre poster, forløpene og `kjerne/` virker bare når
  nummereringen står (OV-U92 (a)).
- Endringene fra 25.11 går på tvers, men hver setning har ett tema: datoen i påberopelsen hører til
  retting (MM-U55 punkt 10), kunnskapsdatoen til varslingsdatoen (VS-U76 punkt 12–14), og et brev
  sendt før det siste til brev sendt utenfor (OV-U114 punkt 14–15). Setningen får hjemmet der, og de
  andre versjonene viser dit.
- Én PR, fordi OV-U122, VS-U83 og VS-U85 endrer to eller tre av postene, og en samling i bare én av
  dem ville la de andre stå med en endring som ikke er samlet.

## Endringene

`vedtaksregister.py --sjekk` på `c8992f4`: MM-U55 6, VS-U76 4 og OV-U114 5 endringer.

| Post | Forhold | Hva den endrer |
| --- | --- | --- |
| OV-U98 (15.11, samlet i OV-U114) | presiserer MM-U55 | Punkt 8 og 18: en retting av datoen endrer ikke hva som er gjeldende. Står i OV-U114 punkt 17 |
| VS-U77 (17.11) | utvider, snevrer inn og presiserer OV-U114 | Punkt 18 (VS-U77 punkt 28), 18–19 (punkt 26) og 21 (punkt 29) |
| OV-U118 (25.11) | snevrer inn og presiserer OV-U114 | Punkt 14, 10 og 15: et krav sendt før det siste prøves mot kravversjonene som var sendt da. Utvider også OV-U115 og KA-U76 |
| OV-U119 (25.11) | presiserer OV-U114 | Punkt 15: betegnelsen på kravpostene. Presiserer også OV-U115 |
| OV-U120 (25.11) | presiserer OV-U114 og VS-U76 | OV-U114 punkt 15 og VS-U76 punkt 6a: et eldre krav som varsel etter punkt 34.3.3 og 34.4. Presiserer også VS-U77 og VS-U80 |
| OV-U121 (25.11) | (ikke registrert mot OV-U114) | Avgrenser OV-U114 punkt 15 etter alternativet: en påberopelse med et annet forhold. Presiserer GR-U40 |
| OV-U122 (25.11) | presiserer MM-U55, VS-U76 og OV-U114 | MM-U55 punkt 10, VS-U76 punkt 5 og OV-U114 punkt 15: en eldre påberopelse med en annen dato |
| VS-U82 (25.11) | utvider MM-U55 | Beslutningsdelen: opplysningen og utsagnet om kunnskapsdatoen bygges før første ekte sak. Presiserer OV-U99 punkt 1, som viser til beslutningsdelen i MM-U55 |
| VS-U83 (25.11) | snevrer inn MM-U55 og VS-U76 | MM-U55 punkt 12 og VS-U76 punkt 12 og 14: en kunnskapsdato senere enn brevet avvises |
| VS-U84 (25.11) | utvider MM-U55 | Punkt 12 og 24: utsagnet om kunnskapsdatoen godtas i en lukket sak. Utvider også GR-U27, som MM-U51 |
| VS-U85 (25.11) | snevrer inn og presiserer VS-U76, presiserer MM-U55 | VS-U76 punkt 12 og 14 og MM-U55 punkt 12: hvor kunnskapsdatoen endres |

## Motsigelser og hull

- **M1 Kunnskapsdatoen har to hjem.** MM-U55 punkt 12 og VS-U76 punkt 14 sier begge at
  totalentreprenøren kan endre den. VS-U83–VS-U85 er registrert mot begge. Løses i E2: reglene for
  hvor datoen står og endres, får hjemmet i VS-U76 punkt 12a og 12b, og MM-U55 punkt 12 viser dit.
- **M2 «også når datoen er senere».** MM-U55 punkt 12 lar en senere dato gjelde straks. VS-U83
  avviser en dato som er senere enn datoen brevet er sendt. Lest alene sier punkt 12 at den godtas.
  Løses i E2.
- **M3 «når det er det første varselet».** VS-U76 punkt 12 lar datoen stå i vederlagskravet når det
  er det første varselet. Etter VS-U85 står den som totalentreprenørens siste opplysning også når et
  varsel lagt til senere blir det første. Løses i E2.
- **M4 Punkt 19 i OV-U114** bruker «grunnlagskravet». Løses i E7.

Ingen av dem krever et valg: hver løses av en post vedtatt 25.11, og E1–E7 fører den inn.

## Utkastet

Punktene som ikke nevnes, står som i versjonen før, og nummereringen står. Ny tekst med kilde:

### Retting av sendt brev, versjon 4 (foreløpig MM-U58)

- **Punkt 10, nytt siste ledd.** «En påberopelse av forholdet sendt før totalentreprenørens siste
  påberopelse i saken tas imot også når den oppgir en annen dato for når pålegget ble mottatt eller
  totalentreprenøren ble klar over forholdet. Datoen står som opplysningen i det brevet og endrer
  ikke totalentreprenørens siste opplysning, som bare endres ved en korrigering etter dette punktet.
  Er totalentreprenørens siste opplysning senere enn datoen brevet ble sendt, tas brevet ikke imot
  før opplysningen er korrigert etter dette punktet, fordi brevet ellers blir det første varselet med
  en dato før opplysningen (punkt 6a i samlevedtaket for varslingsdatoen).» (OV-U122; E1)
- **Punkt 12, nytt siste ledd.** «Hvor datoen står, når den avvises, og at den bare endres i et eget
  utsagn, står i punkt 12, 12a, 12b og 14 i samlevedtaket for varslingsdatoen. For en lukket sak
  gjelder punkt 24.» (VS-U83; VS-U85; VS-U84; E2, E3)
- **Punkt 18, ny siste setning.** «En retting etter punkt 8 eller dette punktet endrer ikke hvilket
  krav eller svar som er gjeldende (punkt 17 i samlevedtaket for brev sendt utenfor løsningen).»
  (OV-U98 s9; OV-U114 punkt 17; E4)
- **Punkt 24, nytt ledd.** «Det samme gjelder totalentreprenørens utsagn etter punkt 14 i
  samlevedtaket for varslingsdatoen, som supplerer eller endrer datoen totalentreprenøren ble klar
  over at økte utgifter etter punkt 34.1.3 annet ledd ville påløpe. Utsagnet godtas også i et spor
  med enighet og når kravene er avgjort, og det endrer ikke utfallet. Et svar byggherren alt har gitt,
  står med virkningen det hadde, og en påberopelse byggherren alt har fremsatt, bevares med
  tidspunktet. I en lukket sak kan byggherren ta stilling i et innlegg, og saken står lukket.
  Avvisningen etter punkt 12a der gjelder også her.» (VS-U84; E3)
- **Beslutningsdelen, ny setning.** «Før første ekte sak bygges også opplysningen om kunnskapsdatoen
  der punkt 12 i samlevedtaket for varslingsdatoen sier den kan stå, og det egne utsagnet etter punkt
  14 der.» (VS-U82; E5)

### Varslingsdatoen, versjon 3 (foreløpig VS-U86)

- **Punkt 5, ny setning.** «En påberopelse sendt før totalentreprenørens siste påberopelse med en
  annen dato følger punkt 10 i samlevedtaket for retting av sendt brev.» (OV-U122; E1)
- **Punkt 6a, ny setning.** «For varselet etter punkt 34.3.3 og 34.4 for en kravpost i et
  vederlagskrav sendt før det siste kravet i sporet gjelder OV-U120.» (OV-U120; E6)
- **Punkt 12a, nytt.** «Løsningen avviser en kunnskapsdato etter punkt 34.1.3 som er senere enn
  datoen brevet med opplysningen er sendt: for et brev fra løsningen datoen det sendes, og for
  korrespondanse datoen den som legger den til, oppgir at den ble sendt. Andre datoer i saken sperrer
  ikke. Det er en kontroll av at totalentreprenørens egne datoer kan stemme, ikke en vurdering av om
  varselet kom i tide.» (VS-U83; E2)
- **Punkt 12b, nytt.** VS-U85 ordrett, med «VS-U76 punkt 9» og «VS-U76 punkt 14» som «punkt 9» og
  «punkt 14», «som OV-U122 sier» som «som punkt 10 i samlevedtaket for retting av sendt brev sier», og
  «(VS-U83)» som «(punkt 12a)». (VS-U85; E2)
- **Punkt 14, ny setning.** «Avvisningen etter punkt 12a gjelder også utsagnet. Hvor det godtas i en
  lukket sak og i en sak en endringsordre omfatter, står i punkt 24 i samlevedtaket for retting av
  sendt brev.» (VS-U83; VS-U84; E2, E3)

### Brev sendt utenfor løsningen, versjon 2 (foreløpig OV-U123)

- **Punkt 14.** «… med unntakene i punkt 15a, 18 og 24.» (OV-U118; E6)
- **Punkt 15a, nytt.** «Et krav eller en påberopelse sendt før det siste i sporet eller saken følger
  også OV-U118 for hva kravet prøves mot, OV-U119 for betegnelsen på kravpostene, OV-U120 for
  varselet for en kravpost etter punkt 34.3.3 og 34.4, OV-U121 for en påberopelse med et annet
  forhold, og punkt 10 i samlevedtaket for retting av sendt brev for en påberopelse med en annen
  dato.» (OV-U118–OV-U122; E6)
- **Punkt 18, ny setning.** «Varsel etter punkt 34.3.3 første ledd og 34.4 kan også velges (punkt 28
  i samlevedtaket for varslene etter punkt 34.3.3 og 34.4).» (VS-U77 punkt 28; E6)
- **Punkt 19, ny setning og språk.** «Et brev som både varsler og krever i et spor, følger punkt 26 i
  samlevedtaket for varslene etter punkt 34.3.3 og 34.4.» «Grunnlagskravet» blir «påberopelsen av
  forholdet». (VS-U77 punkt 26; E6, E7)
- **Punkt 21, ny setning.** «Opplysningen om kravene i kapittel B i kontraktsgrunnlaget ved et varsel
  eller krav etter kapittel 33 eller 34 står i punkt 29 der.» (VS-U77 punkt 29; E6)

### Endret innhold

- **E1** MM-U55 punkt 10 og VS-U76 punkt 5: en eldre påberopelse med en annen dato (OV-U122).
- **E2** VS-U76 punkt 12a, 12b og 14, og MM-U55 punkt 12: avvisningen av en senere kunnskapsdato og
  hvor datoen endres (VS-U83, VS-U85; M1–M3).
- **E3** MM-U55 punkt 12 og 24 og VS-U76 punkt 14: utsagnet om kunnskapsdatoen i en lukket sak
  (VS-U84, som MM-U51 for punkt 10).
- **E4** MM-U55 punkt 18: OV-U98 er samlet i OV-U114 punkt 17, og versjon 4 viser dit.
- **E5** beslutningsdelen i MM-U55 (VS-U82). OV-U99 punkt 1 viser til beslutningsdelen og leser den.
- **E6** henvisningene til postene som står (OV-U118–OV-U121, VS-U77), etter spørsmål 2.
- **E7** språket i OV-U114 punkt 19 (som E5 i VS-U76).
- **Hovedregelen** (OV-U92): (a) for alle tre. Henvisningene gjelder den nye versjonen.

### Forholdene (spørsmål 2)

Hver versjon opphever versjonen før (svar 4 A, fordi E2 endrer innholdet i MM-U55 punkt 12 og VS-U76
punkt 12; for OV-U114 for at tellingen begynner på null, som i A1). Forholdene i versjonen før føres
videre. OV-U122, VS-U83 og VS-U85 samles i de versjonene de endrer, VS-U82 og VS-U84 i versjon 4 av
MM-U55. Forholdene deres til OV-U99 og GR-U27 står på de samlede postene, slik MM-U51s forhold til
GR-U27 står etter at MM-U55 samlet den. OV-U118–OV-U121 og VS-U77 står med sine forhold, fordi de også
endrer OV-U115, KA-U76, VS-U77, VS-U80 og GR-U40, og forholdene til de gamle versjonene gjelder de nye
(OV-U92 (a)).

## Spørsmålene

> **1. Tilslutning.** Gjelder utkastet over, med punktene for de tre versjonene og E1–E7, som
> samlevedtak for retting av sendt brev (versjon 4), varslingsdatoen (versjon 3) og brev sendt
> utenfor løsningen (versjon 2)? Svar «ja» eller rett enkeltpunkter. Styrer: de tre nye postene.

> **2. Forholdene.** Bakgrunn: svar 4 A og OV-U92. Alternativer: **A (anbefalt)** som «Forholdene»
> over. **B:** «Som A, men OV-U118–OV-U121 samles også i versjon 2 av brev sendt utenfor løsningen,
> med teksten deres i punkt 15a. Forholdene deres til OV-U115, KA-U76, VS-U77, VS-U80 og GR-U40 står
> på de samlede postene.» Anbefaling: A. Postene gjelder mest kravpostene (OV-U115), varslene etter
> punkt 34.3.3 og 34.4 (VS-U77) og påberopelsen (GR-U40), og hører hjemme der når de temaene samles.
> Med B får versjon 2 regler fra tre andre temaer. Styrer: `folge` i de nye postene.

## Berørt kode og forløp

- **Henvisningene.** Når versjonene opphever MM-U55, VS-U76 og OV-U114, skiftes henvisningene ut i
  samme PR, som for VS-U46 i #2168. Sist talt: om lag 50 filer i `kjerne/`, `src/`,
  `docs/domenetabell/` og `docs/datamodell/`. `kjerne/` og `docs/domenetabell/` eies av #2389 så
  lenge den er åpen.
- **Forløpene** som viser til de tre postene, står i `docs/domenetabell/brukerforlop/`. Henvisningene
  skiftes ut; innholdet endres ikke, fordi A3 bare fører inn poster som er vedtatt.
- **Kodefunn:** ingen. A3 endrer ikke noe vedtatt, og OV-U118–OV-U122 og VS-U82–VS-U85 bygges i
  #2011 og #2012.

## Verifikasjon og grenser

- **Kjørt og observert:** `vedtaksregister.py --sjekk` og `--kjede` for de tre postene, og `--vis`
  for postene i tabellen, på `c8992f4`. Tellingen av filene med `grep`.
- **Lest:** punktene i MM-U55, VS-U76 og OV-U114 i `vedtak.md`, VS-U77 punkt 21–29, og Følge i
  OV-U98, OV-U99 og MM-U51.
- **Ikke kontrollert:** sitatene fra NS 8407 (teksten er ikke klonet), og om koden i `kjerne/` og
  `src/` følger punktene. Prøvingen mot vedtakene og kontrollen av klassene gjøres av subagenter.
