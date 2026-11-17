# Samlevedtak B1: vederlagsmetoden, versjon 3

Dato: 17.11.2026. Kontrollert commit: `923690e` (`main`). Del av #1534, steg 4: gruppe B i
[restkartleggingen](vurdering-restkartlegging-2026-11-17.md#forslaget), delt etter
[spørsmålet om delingen](#spørsmålet-om-delingen-lagret-ordrett). Formen følger svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185))
og [versjon 2 for varslingsdatoen](vurdering-samlevedtak-varslingsdato-v2-2026-11-17.md).
Fila viser til punktene i [OV-U95](../plans/vedtak.md#samlevedtak-vederlagsmetoden-2) uten å
gjengi dem, og skriver ikke i `vedtak.toml`.

**Grensen.** Versjon 3 tar endringene av OV-U95 om kravpostene, tilbudet og den særskilte
vederlagsjusteringen. Varslene etter punkt 34.3.3 og 34.4 for kravpostene (VS-U48–VS-U55, VS-U68,
VS-U73–VS-U75) er B2, og byggherrens svar på varselet (VS-U57, VS-U61–VS-U65, VS-U69) er B3. De
viser til OV-U95 og blir stående til B2 og B3 er ført. Punkt 8, 10 og 11 står derfor som i
versjon 2. Det særskilte varselet og rigg og drift har hjemmet i
[OV-U89](../plans/vedtak.md#samlevedtak-saerskilt-varsel). **Prinsippet 14.11:** vedtaket sier
budskapet, og ordlyden står i designdelen til forløpet finnes.

## De 10 endringene

`vedtaksregister.py --sjekk`: «ov-u95: har fått 25 endringer». Ti av dem er B1:

| Post | Forhold | Hva den endrer i OV-U95 |
| --- | --- | --- |
| KA-U69 (07.11) | utvider | Punkt 5: byggherren kan kreve spesifisert tilbud for en post etter en beregningsregel |
| HF-U28 (07.11) | snevrer inn KA-U63 | Punkt 13 og 15: enighet uten totalentreprenørens aksept bare når alt er godkjent som krevd |
| VS-U56 (08.11) | presiserer KA-U57, KA-U64 | Punkt 23: subsidiær varselinnsigelse etter punkt 34.3.3 når byggherren mener regningsarbeid |
| KA-U71 (09.11) | presiserer KA-U69 | Punkt 5: kravet om tilbud og enighet om regelen i samme svar utelukker hverandre |
| KA-U72 (10.11) | endrer | Punkt 5, 7 og 24: svaret tar ikke stilling til beløpet når tilbudet ikke aksepteres |
| KA-U75 (11.11) | endrer KA-U56 | Punkt 17 og 21: trekket av en kravpost er ikke et avkall |
| KA-U83 (14.11) | utvider | Punkt 21: trekket av den særskilte vederlagsjusteringen |
| OV-U106 (15.11) | endrer, utvider, presiserer | Punkt 3, 4, 13, 19, 20 og 23: den særskilte vederlagsjusteringen er en kravpost |
| OV-U107 (15.11) | presiserer OV-U106, KA-U53 | Punkt 19: én kravpost med én oppgjørsform |
| OV-U108 (15.11) | presiserer | Punkt 9 og 14: kostnadsoverslaget og varselet etter punkt 30.2 i første versjon |

## Motsigelser og hull

- **M1 Punkt 24 er opphevet.** KA-U72 opphever punkt 24, men punkt 5 og 7 viser fortsatt dit for
  «beløpet subsidiært». Løses i E20.
- **M2 Trekket av en kravpost.** Punkt 17 nevner punkt 21 blant bindingene, og E13 sier at
  trekket «er et avkall etter KA-U51». KA-U75 sier at brevet ikke kaller trekket et avkall, og at
  posten kan tas med igjen. Løses i E22.
- **M3 Den særskilte vederlagsjusteringen.** Punkt 3 har bare beløpet, og punkt 13 krever enighet
  om «beløpet» for den særskilte vederlagsjusteringen. Etter OV-U106 har posten en oppgjørsform som
  de andre. Løses i E18.
- **M4 «Punkt 15 tredje setning» i HF-U28.** HF-U28 er vedtatt samme dag som OV-U95. Punkt 15 i
  versjon 1 har to setninger, så henvisningen gjelder versjon 2: «Enighet om beregningsregelen for
  én post tar ikke bort tilbudet for en annen.» Vår lesning: enigheten om én post, som den setningen
  forutsetter, finnes først etter regelen i HF-U28. Løses i E23.
- **M5 Punkt 9 og første versjon.** Punkt 9 sier at TE kan sende varselet etter punkt 30.2 i
  løsningen. Etter OV-U108 sendes det i første versjon som innlegg eller legges til som
  korrespondanse. Løses i E21.

## Utkastet til versjon 3

Punkt 1, 2, 4, 6, 8, 10–12, 14, 16, 18, 20 og 22 står som i versjon 2. Nummereringen står, så
henvisningene til punktene i versjon 2 virker. Ny tekst med kilde:

- **Punkt 3.** «Krever totalentreprenøren særskilt justering etter punkt 34.1.3 annet ledd for økte
  utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid, sier kravbrevet
  det, med beløpet når posten har fast sum, og ellers oppgjørsformen for posten. Brevet sier at
  kravet kommer i tillegg når vederlagsjusteringen har minst én kravpost i tillegg til den særskilte
  vederlagsjusteringen, også når ingen kravpost har et krevd beløp.» (OV-U95 punkt 3; OV-U106 s3–s4;
  E17, E18)
- **Punkt 5, siste setning.** «For en kravpost med fast sum gjelder punkt 24.» (KA-U72; E20)
- **Punkt 5a, ny.** «Byggherren kan i svaret kreve at totalentreprenøren gir et spesifisert tilbud
  for en kravpost totalentreprenøren krever etter en beregningsregel (punkt 34.2.1 første ledd),
  sammen med standpunktet til beregningsregelen for posten. Svaret kan da ikke samtidig godta
  beregningsregelen for posten, og løsningen registrerer ikke enighet om oppgjørsformen for den.
  Løsningen registrerer og viser kravet om tilbud, og utleder ingen virkning eller frist av det.»
  (KA-U69; KA-U71; E19)
- **Punkt 7, siste setning.** «Aksepterer byggherren ikke tilbudet for en kravpost med fast sum,
  gjelder punkt 24.» (KA-U72; E20)
- **Punkt 9, tillegg.** «I første versjon oppgis kostnadsoverslaget i kravposten. Et nytt overslag
  uten ny kravversjon, og varselet etter punkt 30.2 annet ledd, sendes som innlegg eller legges til
  som korrespondanse, også etter at behandlingen er ferdig. Løsningen leser dem ikke.» (OV-U108
  s1–s3; E21)
- **Punkt 13.** «… og om beløpet for hver kravpost med fast sum, også den særskilte
  vederlagsjusteringen når den har fast sum, og for rigg og drift …» Resten står. Enigheten
  registreres etter punkt 25. (KA-U63; OV-U106 s2; HF-U28; E18, E23)
- **Punkt 17, siste setning.** «Utover det punkt 13–16, 18 og 25 sier, endrer samlevedtaket ingen
  bindinger eller sperrer.» (OV-U95 punkt 17; KA-U75; HF-U28; E22, E23)
- **Punkt 19, tillegg.** «Den særskilte vederlagsjusteringen er én kravpost med én oppgjørsform:
  fast sum etter punkt 34.2.1, kontraktens enhetspriser, også justerte enhetspriser, eller
  regningsarbeid. Reglene for kravpostene gjelder den.» (OV-U106 s1–s2; OV-U107; E18)
- **Punkt 21.** «Skal en kravpost ut, trekker totalentreprenøren den uttrykkelig i den nye
  kravversjonen. Brevet sier at totalentreprenøren trekker kravposten, ikke at trekket er et avkall.
  En trukket kravpost kan tas med igjen i en senere kravversjon med samme betegnelse. Hva trekket
  betyr, vurderer partene, og byggherren kan gjøre gjeldende i begrunnelsen at trekket var et
  avkall. Trekket av hele vederlagskravet er fortsatt et avkall (KA-U22).» (KA-U56; KA-U75; E22)
  «Det samme gjelder den særskilte vederlagsjusteringen. En ny kravversjon uten posten og uten trekk
  tas ikke imot. Er posten den eneste i kravet, kan den ikke trekkes alene: totalentreprenøren
  trekker da vederlagskravet etter KA-U22, og punkt 11 i samlevedtaket for trekk gjelder. Varselet
  etter punkt 34.1.3 tredje ledd står som det ble sendt.» (KA-U83; E22)
- **Punkt 23, tillegg.** «Mener byggherren at en kravpost der totalentreprenøren krever justerte
  enhetspriser, skal gjøres opp som regningsarbeid, kan byggherren likevel, subsidiært for det
  tilfellet at totalentreprenørens oppgjørsform legges til grunn, gjøre gjeldende at varselet etter
  punkt 34.3.3 første ledd kom for sent, med standpunktene etter VS-U4. Etter byggherrens syn har
  totalentreprenøren da bare krav på slik justering av enhetsprisen som byggherren måtte forstå at
  forholdet ville føre til (punkt 34.3.3 annet ledd). Løsningen avgjør ikke om varselet kom i
  tide.» (VS-U56; E24) «Påberoper byggherren at det særskilte varselet kom for sent, og godkjenner
  byggherren fast sum for posten i laget for oppgjørsformen, gjelder punkt 8 i samlevedtaket for
  særskilt varsel. Ellers er det prinsipale standpunktet at totalentreprenøren har tapt retten til å
  påberope seg påløpte utgifter (punkt 34.1.3 tredje ledd), og subsidiært står standpunktet til
  oppgjørsformen uten begrensningen etter punkt 34.1.3. Kravet er ikke prinsipalt avslått. Løsningen
  regner ikke ut hva begrensningen gir, og avgjør ikke hvilke utgifter som er påløpt eller
  rammet.» (OV-U106 s6–s9; E18)
- **Punkt 24.** «For en kravpost med fast sum der byggherren ikke aksepterer tilbudet, tar svaret
  ikke stilling til beløpet. Brevet sier at tilbudet ikke er akseptert, og hvilken oppgjørsform
  byggherren mener, og sier ikke noe om det tilbudte beløpet. Vil byggherren tilby et annet fast
  beløp, godkjenner byggherren fast sum med et lavere beløp.» (KA-U72; E20)
- **Punkt 25, ny.** «Løsningen registrerer enighet uten totalentreprenørens aksept bare når
  byggherren godkjenner beløpet for hver kravpost med fast sum som krevd, er enig i oppgjørsformen
  for hver kravpost etter en beregningsregel, og godkjenner rigg og drift som krevd, uten
  innsigelse etter punkt 34.1.2, 34.1.3, 34.3.3 eller 34.4. Ellers registreres enighet om
  kravpostene først når totalentreprenøren godtar hele svaret. Løsningen avgjør ikke om byggherren
  er bundet av godkjenningen av de enkelte kravpostene (MM-U50). Punkt 15, tredje setning, gjelder
  da bare etter en aksept av hele svaret.» (HF-U28; OV-U106 s2; E23)
- **Designdelen, tillegg.** Kravbrevets setning om den særskilte vederlagsjusteringen, med og uten
  «i tillegg», er ordlyden i punkt 3 i versjon 2 (LV-U30; LV-U39; E17). Skjemaet spør ikke om
  beløpet når byggherren ikke aksepterer tilbudet, og et annet fast beløp gis med «Godkjenner fast
  sum» (KA-U72). Er overslaget i en ny kravversjon høyere enn i den forrige, sier kravskjemaet at
  overslaget ikke er et varsel etter punkt 30.2 annet ledd, og at varselet sendes som innlegg. Er
  overslaget det eneste som er endret, sier kravskjemaet også at byggherren da svarer på nytt på
  kravet, og at overslaget kan gis i et innlegg (OV-U108 s4–s5). Resten står.
- **Beslutningsdelen, tillegg.** Handlingsregisteret har en rad for varselet etter punkt 30.2 som
  sendes som innlegg (OV-U108 s6). Resten står.

### Endret innhold

- **E17 Punkt 3.** Ordlyden flyttes til designdelen, og punktet sier budskapet (prinsippet 14.11 i
  vedtaksskillen). Siste setning i versjon 2 (E16) står med samme innhold.
- **E18 Punkt 3, 13, 19 og 23.** Den særskilte vederlagsjusteringen er én kravpost med oppgjørsform
  (OV-U106, OV-U107). Uten fast sum er det enighet om oppgjørsformen, ikke beløpet, som teller etter
  punkt 13. «Endrer OV-U89» i OV-U106 føres videre: punkt 7 og 12 der gjelder beløpet for posten
  bare når den har fast sum.
- **E19 Punkt 5a.** Kravet om spesifisert tilbud (KA-U69, KA-U71).
- **E20 Punkt 5, 7 og 24.** Det subsidiære beløpet faller (KA-U72 opphever KA-U58 og punkt 24).
  Punkt 24 har nå regelen fra KA-U72. VS-U56 står uten forholdet til KA-U58.
- **E21 Punkt 9.** Varselet etter punkt 30.2 og et nytt overslag sendes i første versjon som innlegg
  eller korrespondanse (OV-U108).
- **E22 Punkt 17 og 21.** Trekket av en kravpost er ikke lenger et avkall (KA-U75), og E13 i
  versjon 2 gjelder ikke. Punkt 21 nevnes ikke blant bindingene. KA-U83 gjelder den særskilte
  vederlagsjusteringen.
- **E23 Punkt 13, 15, 17 og 25.** Enighet uten aksept etter HF-U28. «Den særskilte
  vederlagsjusteringen … som krevd» i HF-U28 er tatt ut av punkt 25, fordi posten etter OV-U106
  følger reglene for kravpostene med fast sum og beregningsregel (OV-U106 endrer HF-U28). Lesningen
  av «punkt 15 tredje setning» står i M4.
- **E24 Punkt 23.** VS-U56.
- **Hovedregelen** (OV-U92): (a) for OV-U95; henvisningene gjelder versjon 3.

### Forholdene

Versjon 3 opphever OV-U95 (svar 4 A, fordi E20 og E22 endrer innholdet) og samler KA-U69, KA-U71,
KA-U72, KA-U75, KA-U83, OV-U106, OV-U107, OV-U108, VS-U56 og HF-U28. Samlingene og forholdene i
OV-U95 føres videre. De samlede postene beholder forholdene til andre poster, blant dem «KA-U72
opphever KA-U58», «KA-U75 opphever KA-U70», «OV-U106 endrer OV-U89» og «HF-U28 snevrer inn HF-U9».
KA-U62 og KA-U67 samles fortsatt ikke. Postene i B2 og B3 som viser til OV-U95, gjelder versjon 3
(OV-U92 (a)).

## Spørsmålet om delingen, lagret ordrett

Sendt til orkestratoren 17.11 før kartleggingen av B1, med varslene og postene som gir dem
(tabellen over og `--sjekk` på `923690e`). Prosess, ikke juridisk.

> **Spørsmål B-0: Hvordan skal gruppe B deles?**
>
> - **A (anbefalt):** fire samlevedtak, i denne rekkefølgen:
>   - B1. Vederlagsmetoden, versjon 3: opphever OV-U95 og samler KA-U69, KA-U71, KA-U72, KA-U75,
>     KA-U83, OV-U106–OV-U108, VS-U56 og HF-U28. Nullstiller OV-U95 (sammen med B2) og MM-U50.
>     OV-U89 får et forhold til B1 og faller etter mitt anslag under tre endringer.
>   - B2. Varslene for kravpostene etter punkt 34.3.3 og 34.4 (ny kjede): samler VS-U48–VS-U55,
>     VS-U68 og VS-U73–VS-U75, og postene i kjeden uten varsel (VS-U67, VS-U71, VS-U72). Den dekker
>     hva varselet er, hvordan TE varsler, og hvordan kravet viser til varselet.
>   - B3. Påberopelse av sent varsel og «i tide», versjon 2: opphever VS-U46 og samler VS-U57,
>     VS-U61–VS-U65, VS-U69 og OV-U105, altså byggherrens svar på varselet og påberopelsen.
>     Kartleggingen avgjør om MM-U54 og MM-U56 hører hjemme her eller i påberopelsen av forholdet
>     (GR-U40). B3 kartlegges etter B2, fordi VS-U61 og VS-U64 utvider VS-U48.
>   - B4. Fristene i kontrakten og spesifiseringen: en ny versjon av VS-U47 med fristkjeden KA-U73,
>     KA-U74 og KA-U76–KA-U81.
>   - KA-U49 og KA-U52 tas ut av B og blir små nye versjoner i gruppe C, der kravversjonen og
>     byggherrens svar står.
>   - Hver PR har én vurderingsfil på høyst om lag 250 linjer. B1 og B2 kan kartlegges parallelt
>     fordi de ikke har felles poster, men `vedtak.toml` eies av én PR om gangen.
> - **B:** tre samlevedtak: B1 og B4 som over, med B2 og B3 slått sammen til ett samlevedtak for
>   varslene etter punkt 34.3.3 og 34.4 og sent varsel. Det gir færre tilslutninger, men om lag 30
>   poster og VS-U46 med 20 punkter i én vurdering, over grensen på 250 linjer.
> - **C:** ett samlevedtak for hele B, slik bestillingen lyder. Det gir én tilslutning, men om lag
>   60 poster og tre gamle samlevedtak (OV-U95, VS-U46, OV-U89) i én tekst, langt over grensen i
>   vedtaksskillen.
>
> Styrer: antall PR-er og tilslutninger i B, og om KA-U49, KA-U52 og VS-U47 hører til B.

Svaret er ikke kommet.
