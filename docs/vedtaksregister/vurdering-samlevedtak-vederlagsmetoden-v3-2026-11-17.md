# Samlevedtak B1: vederlagsmetoden, versjon 3

Dato: 17.11.2026. Kontrollert commit: `923690e` (`main`). Del av #1534, steg 4: gruppe B i
[restkartleggingen](vurdering-restkartlegging-2026-11-17.md#forslaget), delt etter
[spørsmålet om delingen](#spørsmålet-om-delingen-lagret-ordrett). Formen følger svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185))
og [versjon 2 for varslingsdatoen](vurdering-samlevedtak-varslingsdato-v2-2026-11-17.md).
Fila viser til punktene i [OV-U95](../plans/vedtak.md#samlevedtak-vederlagsmetoden-2) uten å
gjengi dem, og skriver ikke i `vedtak.toml`.

**Grensen.** Versjon 3 tar endringene av OV-U95 om kravpostene, tilbudet og den særskilte
vederlagsjusteringen. Varslene etter punkt 34.3.3 og 34.4 for kravpostene og byggherrens svar på dem
(VS-U48–VS-U55, VS-U57, VS-U61–VS-U65, VS-U68, VS-U69, VS-U73–VS-U75) står i samlevedtaket for
varslene og sent varsel, B2. De viser til OV-U95 og blir stående til B2 er ført. VS-U56 er med i
B1, fordi den gjelder lagene per kravpost og presiserer KA-U57 (d) og KA-U64 i punkt 23. Punkt 8, 10 og 11 står derfor som i
versjon 2. Det særskilte varselet og rigg og drift har hjemmet i
[OV-U89](../plans/vedtak.md#samlevedtak-saerskilt-varsel), unntatt det OV-U106 endrer der, som
står i punkt 23 (spørsmål 2). **Prinsippet 14.11:** vedtaket sier
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
| OV-U106 (15.11) | endrer, utvider, presiserer | Punkt 2–5, 13, 15, 19, 20 og 23: den særskilte vederlagsjusteringen er en kravpost. Punkt 2, 4, 5, 15 og 20 gjelder posten gjennom punkt 19 |
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
- **M5 Hull fra kontrollene.** Byggherren som påberoper både punkt 34.1.2 og 34.1.3 når den
  særskilte vederlagsjusteringen ikke har fast sum: OV-U89 punkt 12 har lagene med beløp, og punkt
  23 dekker bare punkt 34.1.3 alene (spørsmål 3). Trekket av den eneste kravposten, eller av alle
  postene én etter én: KA-U83 sperrer bare den særskilte vederlagsjusteringen (spørsmål 4).
- **M6 Punkt 9 og første versjon.** Punkt 9 sier at TE kan sende varselet etter punkt 30.2 i
  løsningen. Etter OV-U108 sendes det i første versjon som innlegg eller legges til som
  korrespondanse. Løses i E21.

## Utkastet til versjon 3

Punkt 1, 2, 4, 6, 8, 10, 11, 14, 15, 20 og 22 står som i versjon 2. I punkt 12, 16 og 18 gjelder
henvisningene til EO-U34 samlevedtaket for endringsordren, versjon 3 (EO-U39; E25). Nummereringen står, så
henvisningene til punktene i versjon 2 virker. Ny tekst med kilde:

- **Punkt 3.** «Krever totalentreprenøren særskilt justering etter punkt 34.1.3 annet ledd for økte
  utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid, sier kravbrevet
  det, med beløpet når posten har fast sum, og ellers oppgjørsformen for posten. Brevet sier at
  kravet kommer i tillegg når vederlagsjusteringen har minst én kravpost i tillegg til den særskilte
  vederlagsjusteringen, også når ingen kravpost har et krevd beløp. Har kravet bare den særskilte
  vederlagsjusteringen, sier brevet ikke at kravet kommer i tillegg.» (OV-U95 punkt 3; OV-U106
  s3–s4; E17, E18)
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
  s1–s3; E21) «I løsningen» i første setning omfatter da et innlegg og korrespondanse.
- **Punkt 13.** «… og om beløpet for hver kravpost med fast sum, også den særskilte
  vederlagsjusteringen når den har fast sum, og for rigg og drift …» Resten står. Enigheten
  registreres etter punkt 25. (KA-U63; OV-U106 s2; HF-U28; E18, E23)
- **Punkt 17, siste setning.** «Utover det punkt 5a, 13–16, 18, 21 og 25 sier, endrer
  samlevedtaket ingen bindinger eller sperrer.» (OV-U95 punkt 17; KA-U71; KA-U83; HF-U28; E22,
  E23)
- **Punkt 19, tillegg.** «Den særskilte vederlagsjusteringen er én kravpost med én oppgjørsform:
  fast sum etter punkt 34.2.1, kontraktens enhetspriser, også justerte enhetspriser, eller
  regningsarbeid. Reglene for kravpostene gjelder posten: beløpet ved fast sum og anslaget eller
  kostnadsoverslaget som opplysning ellers, byggherrens standpunkt til oppgjørsformen og kravet om
  spesifisert tilbud, varslene etter punkt 34.3.3 og 34.4 og innsigelsene mot dem, når et tilbud
  erstattes, og når behandlingen er ferdig.» (OV-U106 s1–s2; OV-U107; E18)
- **Punkt 21.** «Skal en kravpost ut, trekker totalentreprenøren den uttrykkelig i den nye
  kravversjonen. Brevet sier at totalentreprenøren trekker kravposten, ikke at trekket er et avkall.
  En trukket kravpost kan tas med igjen i en senere kravversjon med samme betegnelse. Hva trekket
  betyr, vurderer partene, og byggherren kan gjøre gjeldende i begrunnelsen at trekket var et
  avkall. Trekket av hele vederlagskravet er fortsatt et avkall (KA-U22).» (KA-U56; KA-U75; E22)
  «Den særskilte vederlagsjusteringen trekkes på samme måte, og kravet kan tas med igjen i en
  senere kravversjon. En ny kravversjon uten posten og uten trekk tas ikke imot. Er posten den eneste i kravet, kan den ikke trekkes alene: totalentreprenøren
  trekker da vederlagskravet etter KA-U22, og punkt 11 i samlevedtaket for trekk gjelder. Varselet
  etter punkt 34.1.3 tredje ledd står som det ble sendt.» (KA-U83; E22)
- **Punkt 23, tillegg.** «Mener byggherren at en kravpost der totalentreprenøren krever justerte
  enhetspriser, skal gjøres opp som regningsarbeid, kan byggherren likevel, subsidiært for det
  tilfellet at totalentreprenørens oppgjørsform legges til grunn, gjøre gjeldende at varselet etter
  punkt 34.3.3 første ledd kom for sent, med standpunktene etter VS-U4. Etter byggherrens syn har
  totalentreprenøren da bare krav på slik justering av enhetsprisen som byggherren måtte forstå at
  forholdet ville føre til (punkt 34.3.3 annet ledd). Løsningen avgjør ikke om varselet kom i
  tide (VS-U48).» (VS-U56; E24) «Det særskilte varselet etter punkt 34.1.3 tredje ledd gjelder bare
  den særskilte vederlagsjusteringen. Påberoper byggherren at det særskilte varselet kom for sent, og godkjenner
  byggherren fast sum for posten i laget for oppgjørsformen, gjelder punkt 8 i samlevedtaket for
  særskilt varsel. Ellers er det prinsipale standpunktet at totalentreprenøren har tapt retten til å
  påberope seg påløpte utgifter (punkt 34.1.3 tredje ledd), og subsidiært står standpunktet til
  oppgjørsformen uten begrensningen etter punkt 34.1.3. Kravet er ikke prinsipalt avslått. Løsningen
  regner ikke ut hva begrensningen gir, og avgjør ikke hvilke utgifter som er påløpt eller
  rammet.» (OV-U106 s5–s9; E18) Det subsidiære beløpet i tredje setning i punkt 23 er beløpet
  etter en innsigelse mot varselet etter punkt 34.3.3 eller 34.4 for posten (E20).
- **Punkt 24.** «For en kravpost med fast sum der byggherren ikke aksepterer tilbudet, tar svaret
  ikke stilling til beløpet. Brevet sier at tilbudet ikke er akseptert, og hvilken oppgjørsform
  byggherren mener, og sier ikke noe om det tilbudte beløpet. Vil byggherren tilby et annet fast
  beløp, godkjenner byggherren fast sum med et lavere beløp.» (KA-U72; E20)
- **Punkt 25, ny.** «Løsningen registrerer enighet uten totalentreprenørens aksept bare når
  byggherren godkjenner beløpet for hver kravpost med fast sum som krevd, er enig i oppgjørsformen
  for hver kravpost etter en beregningsregel, og godkjenner rigg og drift som krevd, uten
  innsigelse etter punkt 34.1.2, 34.1.3, 34.3.3 eller 34.4. Ellers registreres enighet om
  kravpostene først når totalentreprenøren godtar hele svaret. Løsningen avgjør ikke om byggherren
  er bundet av godkjenningen av de enkelte kravpostene (MM-U50). Enigheten om én kravpost etter
  punkt 15 finnes da først etter en aksept av hele svaret. Har byggherren krevd tilbud for en
  kravpost, gir aksepten ingen enighet om den posten (punkt 5a).» (HF-U28; OV-U106 s2; KA-U71; E23)
- **Designdelen, tillegg.** Kravbrevets setning om den særskilte vederlagsjusteringen, med og uten
  «i tillegg», er ordlyden i punkt 3 i versjon 2 (LV-U30; LV-U39; E17). Ordlyden uten fast sum,
  der brevet sier oppgjørsformen, står i bestillingen for brukerforløpet (BF-14). Skjemaet spør ikke om
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
  punkt 13. OV-U106 endrer OV-U89 punkt 7 og presiserer punkt 8 og 12: punkt 7 gjelder beløpet for
  posten bare når den har fast sum, og punkt 8 gjelder når byggherren godkjenner fast sum. Ellers
  gjelder punkt 23 (spørsmål 2).
- **E19 Punkt 5a.** Kravet om spesifisert tilbud (KA-U69, KA-U71).
- **E20 Punkt 5, 7 og 24.** Det subsidiære beløpet faller (KA-U72 opphever KA-U58 og punkt 24).
  Punkt 24 har nå regelen fra KA-U72, og at skjemaet ikke spør om beløpet, og «Godkjenner fast
  sum», er flyttet til designdelen. VS-U56 står uten forholdet til KA-U58. Det subsidiære beløpet
  i punkt 23 etter en varselinnsigelse står (KA-U57 (d); VS-U56).
- **E21 Punkt 9.** OV-U108 snevrer inn punkt 9 for første versjon: varselet etter punkt 30.2 og et
  nytt overslag sendes som innlegg eller korrespondanse.
- **E22 Punkt 17 og 21.** Trekket av en kravpost er ikke lenger et avkall (KA-U75), og E13 i
  versjon 2 gjelder ikke. Punkt 21 står fortsatt i punkt 17 for sperrene i KA-U83, og punkt 5a for
  sperren i KA-U71.
- **E23 Punkt 13, 15, 17 og 25.** Enighet uten aksept etter HF-U28. «Den særskilte
  vederlagsjusteringen … som krevd» i HF-U28 er tatt ut av punkt 25, fordi posten etter OV-U106
  følger reglene for kravpostene med fast sum og beregningsregel (OV-U106 endrer HF-U28). Siste
  setning i HF-U28 er skrevet som budskapet etter lesningen i M4. At aksepten ikke gir enighet om en
  post der byggherren krevde tilbud, er vår lesning av KA-U71.
- **E24 Punkt 23.** VS-U56.
- **E25 Punkt 12, 16 og 18.** EO-U34 er opphevet av EO-U39 med samme nummerering; henvisningene
  gjelder EO-U39 (OV-U92 (a)).
- **Hovedregelen** (OV-U92): (a) for OV-U95; henvisningene gjelder versjon 3.

### Forholdene (spørsmål 2)

Versjon 3 opphever OV-U95 (svar 4 A, fordi E20 og E22 endrer innholdet) og samler KA-U69, KA-U71,
KA-U72, KA-U75, KA-U83, OV-U106, OV-U107, OV-U108, VS-U56 og HF-U28. Samlingene og forholdene i
OV-U95 føres videre. De samlede postene beholder forholdene til andre poster, blant dem «KA-U72
opphever KA-U58», «KA-U75 opphever KA-U70» og «HF-U28 snevrer inn HF-U9». KA-U62 og KA-U67 samles
fortsatt ikke. Postene i B2 som viser til OV-U95, gjelder versjon 3 (OV-U92 (a)). Spørsmål 2 gjelder
tre forhold kontrollene fant: OV-U89 punkt 7, 8 og 12, KA-U51 punkt 1 og 11, og KA-U49 punkt 8.

## Følger som ikke endres

Fra prøvingen mot vedtakene. De følger av vedtak som står, og versjon 3 endrer dem ikke:

- Godtar totalentreprenøren et svar der byggherren prinsipalt påberoper at varselet kom for sent og
  subsidiært godkjenner, er partene enige etter det svaret sier, også om påberopelsen (HF-U9; VS-U46
  punkt 9). Det særskilte varselet gir da prinsipalt tap etter punkt 23.
- Det finnes ingen delaksept per kravpost (HF-U28; punkt 25). Et forslag om det er et nytt
  produktvalg og hører ikke til samlevedtaket.
- Er den særskilte vederlagsjusteringen den eneste posten, legger totalentreprenøren først til den
  nye posten og trekker justeringen i neste kravversjon (KA-U83). En trukket post med registrert
  enighet kan tas med igjen, og byggherren gjør avkallet gjeldende i begrunnelsen (KA-U75).

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

Oppdragsgiver 17.11, ordrett, videresendt av orkestratoren: «B: Tre deler». B1 og B4 som i A. B2 og
B3 slås sammen til ett samlevedtak for varslene etter punkt 34.3.3 og 34.4 og sent varsel, som
opphever VS-U46. KA-U49 og KA-U52 går til gruppe C som i A (orkestratoren 17.11).

## Spørsmålene, lagret ordrett

Lagret før de sendes til orkestratoren. Spørsmål 3 og 4 gjelder rettsregler og stilles i tekst.

> **1. Tilslutning.** Utkastet til versjon 3 med punkt 3, 5, 5a, 7, 9, 13, 17, 19, 21, 23, 24 og 25,
> designdelen, beslutningsdelen og «Endret innhold» E17–E25 gjelder slik det står, med svarene på
> spørsmål 2–4 og rettelsene oppdragsgiver gir per punkt. Forkastet: «Utkastet legges fram på nytt
> etter rettelsene.»

> **2. Forholdene.** Bakgrunn: svar 4 A og OV-U92; prøvingen mot vedtakene.
>
> - **A (anbefalt):** Versjon 3 opphever OV-U95 og samler de ti postene, som i «Forholdene». Den
>   endrer OV-U89 punkt 7 og presiserer punkt 8 og 12 (E18), snevrer inn KA-U51 punkt 1 og 11 for en
>   kravpost (punkt 21, etter KA-U75), og presiserer KA-U49 punkt 8 for når enighet registreres uten
>   aksept (punkt 25, etter HF-U28).
> - **B:** Som A, men versjon 3 har ingen egne forhold til OV-U89, KA-U51 og KA-U49. De står bare i
>   de samlede postene OV-U106, KA-U75 og HF-U28, og KA-U51 og KA-U49 får ingen henvisning.
>
> Anbefaling: A. Hver regel leses da av versjon 3 og vedtaket den endrer, uten å gå gjennom en
> samlet post. KA-U51 punkt 1 («TE gir avkall … ved å trekke det») og KA-U49 punkt 8 («følger av at
> svaret godkjenner hele kravet») sier ellers noe annet for en kravpost enn versjon 3. Styrer:
> `forhold` og `folge` i den nye posten.

> **3. Begge varselinnsigelsene når den særskilte vederlagsjusteringen ikke har fast sum.** Bakgrunn:
> M5. OV-U89 punkt 12 har lagene når byggherren påberoper både punkt 34.1.2 og 34.1.3, med beløp.
> Punkt 23 i versjon 3 (OV-U106) sier hva byggherren oppgir når bare det særskilte varselet påberopes
> og posten ikke har fast sum.
>
> - **A (anbefalt):** «Påberoper byggherren både at varselet etter punkt 34.1.2 og at det særskilte
>   varselet kom for sent, og har den særskilte vederlagsjusteringen ikke fast sum, oppgir byggherren
>   prinsipalt standpunktet etter punkt 34.1.2. Subsidiært står standpunktene til de andre postene,
>   og for den særskilte vederlagsjusteringen standpunktet etter punkt 23: prinsipalt at
>   totalentreprenøren har tapt retten til å påberope seg påløpte utgifter, og videre subsidiært
>   standpunktet til oppgjørsformen uten begrensningen etter punkt 34.1.3. Løsningen regner ikke ut
>   hva begrensningen gir.» Forhold: presiserer OV-U89 punkt 12; i tråd med OV-U106.
> - **B:** «Har den særskilte vederlagsjusteringen ikke fast sum, kan byggherren ikke påberope både
>   punkt 34.1.2 og 34.1.3 i et svar fra løsningen. Svaret sendes utenfor løsningen og legges til som
>   svar etter samlevedtaket for brev sendt utenfor løsningen.» Forhold: snevrer inn OV-U89 punkt 12.
>
> Anbefaling: A. Det setter sammen to regler som alt er vedtatt, uten ny virkning, og byggherren kan
> ta begge innsigelsene i ett svar. B gjør løsningen ubrukelig i et tilfelle som er vanlig når
> varselet om forholdet er sent (antakelse, ikke prøvd). Styrer: punkt 23 i versjon 3 og lagene i
> svarskjemaet (BF-14).

> **4. Trekket av den siste kravposten.** Bakgrunn: M5. KA-U83 sier at den særskilte
> vederlagsjusteringen ikke kan trekkes alene når den er den eneste posten. For en vanlig kravpost
> sier KA-U75 at trekket ikke er et avkall, men trekket av hele vederlagskravet er det (KA-U22).
>
> - **A (anbefalt):** «En kravversjon uten kravposter tas ikke imot. Vil totalentreprenøren trekke
>   den siste kravposten, trekker totalentreprenøren vederlagskravet etter KA-U22, og punkt 11 i
>   samlevedtaket for trekk gjelder.» Forhold: utvider KA-U83 til alle kravposter; presiserer KA-U75.
> - **B:** «Totalentreprenøren kan trekke den siste kravposten uten at det er et avkall.
>   Vederlagskravet står uten kravposter til en ny kravversjon, og byggherren svarer ikke på det.»
>   Forhold: snevrer inn KA-U22 for et krav der postene er trukket én etter én.
>
> Anbefaling: A. Ellers kan totalentreprenøren trekke hele kravet uten avkall ved å trekke postene
> én etter én, og regelen i KA-U22 blir uten virkning. Kostnaden for totalentreprenøren: vil han ta
> ut alle postene og beholde kravet, må han legge til den nye posten før han trekker den gamle.
> Styrer: punkt 21 i versjon 3.

> **5. Henvisningene i koden (teknisk).** Versjon 3 opphever OV-U95. `vedtakshenvisninger.py`
> krever da at henvisningene til OV-U95 også nevner versjon 3: om lag 60 i `kjerne/`, `src/`,
> `sprakprove/` og `docs/domenetabell/`, i filer kjerneøkta og Varden-økta eier.
>
> - **A (anbefalt):** Vedtaks-PR-en skifter ut henvisningene i `docs/domenetabell/`, og
>   orkestratoren ber kjerneøkta og Varden-økta skifte ut sine i samme runde, før vedtaks-PR-en
>   merges.
> - **B:** Vedtaks-PR-en skifter ut alle, også i `kjerne/`, `src/` og `sprakprove/`, etter avtale
>   med eierne.

## Svarene

- **Spørsmål 5:** orkestratoren 17.11, ordrett: «Spørsmål 5 avgjør jeg, siden det er teknisk: B.
  Vedtaks-PR-en skifter ut alle henvisningene til OV-U95, også i kjerne/, src/ og sprakprove/. Det
  skjer i en egen commit etter tilslutningen og en rebase mot main, slik som for VS-U76 i #2151.»
- **Spørsmål 1–4** er lagt fram for oppdragsgiver 17.11.

## Verifikasjon og grenser

- **Kjørt og observert:** `--sjekk` og `--vis` for postene på `923690e`; tellingen av endringene per
  samlevedtak med funksjonen `varsler` i `vedtaksregister.py`. Lest i `vedtak.md`: OV-U95, OV-U89
  punkt 7, 8, 12, 17 og 26, punkt 11 i KA-U51 og punkt 13–16 i OV-U94.
- **Kontrollene:** én subagent kontrollerte hver setning mot kilden, og én prøvde utkastet mot
  vedtakene. Funnene er rettet én gang; det som krever et valg, er spørsmål 2–4.
- **Ikke kontrollert:** sitatene fra NS 8407; at OV-U89 faller under tre endringer etter B1
  (anslag); koden.

