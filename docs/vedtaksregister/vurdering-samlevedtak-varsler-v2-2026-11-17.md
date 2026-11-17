# Samlevedtak B2: varslene etter punkt 34.3.3 og 34.4, og sent varsel, versjon 2

Dato: 17.11.2026. Kontrollert commit: `bd11924` (`main`). Del av #1534, steg 4: gruppe B i
[restkartleggingen](vurdering-restkartlegging-2026-11-17.md#forslaget), delt etter svaret
«B: Tre deler» på spørsmål B-0
([6948258685](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6948258685)).
B2 og B3 i alternativ A er slått sammen her. Formen følger svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185))
og [versjon 3 for vederlagsmetoden](vurdering-samlevedtak-vederlagsmetoden-v3-2026-11-17.md).
Fila viser til punktene i [VS-U46](../plans/vedtak.md#samlevedtak-sent-varsel) uten å gjengi dem,
og skriver ikke i `vedtak.toml`.

**Grensen.** Versjon 2 er versjon 1 med to nye avsnitt: G om varslene etter punkt 34.3.3 første
ledd og 34.4 for kravpostene, og H om byggherrens svar på et varsel som står alene. Hva varselet
etter punkt 34.4 gir byggherren i svaret på kravposten, står i
[OV-U115](../plans/vedtak.md#samlevedtak-vederlagsmetoden-3) punkt 11. Varslene etter punkt
34.1.2 og 34.1.3 har hjemmet i [OV-U89](../plans/vedtak.md#samlevedtak-saerskilt-varsel) og i
[OV-U114](../plans/vedtak.md#samlevedtak-brev-utenfor) punkt 22. Versjon 2 tar bare med det
VS-U64 sier om svaret på dem. Fristene og spesifiseringen er B4 (VS-U47). MM-U54 og MM-U56 er
ikke med: de gjelder ny versjon av påberopelsen av forholdet og innlegget der, ikke sent varsel, og
hører til forholdet (GR-U40). De står i varselet for VS-U46 bare gjennom MM-U34. KA-U49 og KA-U52
er gruppe C. **Prinsippet 14.11:** vedtaket sier budskapet, og ordlyden står i designdelen.

## Postene

`vedtaksregister.py --sjekk`: «vs-u46: har fått 9 endringer etter at temaet er samlet». Versjon 2
samler 23 poster: fem som endrer VS-U46, og kjeden for varslene etter punkt 34.3.3 og 34.4, som
ikke hadde samlevedtak. Forholdene er de i registeret (`--kjede`).

| Post | Klasse | Forhold | Hva den gir versjon 2 |
| --- | --- | --- | --- |
| VS-U48 (07.11) | vedtak | presiserer OV-U95, KA-U68 | Punkt 21, 22 og 30: TE varsler eller sender kravet, og svaret på varselet etter punkt 34.3.3 |
| VS-U49 (08.11) | vedtak | presiserer VS-U48 | Punkt 22: kravposten som varsel |
| VS-U50 (08.11) | vedtak | presiserer VS-U49, utvider VS-U48 | Punkt 23: varselet er alt gitt |
| VS-U51 (08.11) | vedtak | presiserer VS-U50 | Punkt 24: dokumentet lagt til i kravskjemaet |
| VS-U52 (08.11) | vedtak | utvider OV-U80 | Punkt 28: korrespondanse som varsel etter punkt 34.3.3 og 34.4 |
| VS-U53 (08.11) | design | presiserer VS-U50, VS-U51 | Designdelen |
| VS-U54 (08.11) | beslutning | presiserer VS-U50 | Beslutningsdelen: feltet |
| VS-U55 (08.11) | vedtak | presiserer VS-U51, VS-U48, VS-U34, LV-U29 | Punkt 25 |
| VS-U57 (09.11) | vedtak | presiserer VS-U48 | Punkt 30 |
| VS-U61 (10.11) | vedtak | utvider VS-U48, OV-U95, VS-U46, presiserer VS-U57 | Punkt 7, 30, 31 og 34 |
| VS-U62 (10.11) | vedtak | presiserer VS-U48, VS-U57, bygger på VS-U46 | Punkt 33 |
| VS-U63 (10.11) | vedtak | snevrer inn VS-U46 | Punkt 7, 8, 10, 12 og 31 |
| VS-U64 (10.11) | vedtak | utvider VS-U48, VS-U46, presiserer OV-U89 | Punkt 7, 32–34 |
| VS-U65 (10.11) | vedtak | bygger på HF-U29 | Punkt 35. Teksten sier «følger HF-U25», som HF-U29 opphevet 05.11 (E18) |
| VS-U67 (12.11) | beslutning | bygger på MM-U10 | Beslutningsdelen: ett brev per sak |
| VS-U68 (12.11) | vedtak | utvider VS-U48, VS-U52, snevrer inn VS-U48 | Punkt 27 |
| VS-U69 (12.11) | vedtak | snevrer inn VS-U62, endrer VS-U54, utvider VS-U50, presiserer VS-U61 | Punkt 23, 33 og 34 |
| VS-U71 (13.11) | beslutning | endrer VS-U67 | Beslutningsdelen: fristen i eget brev |
| VS-U72 (16.11) | vedtak | utvider VS-U39 | Punkt 29 |
| VS-U73 (17.11) | vedtak | utvider og presiserer VS-U55 | Punkt 25 og 26 |
| VS-U74 (17.11) | vedtak | snevrer inn OV-U80 | Punkt 26 |
| VS-U75 (17.11) | vedtak | presiserer VS-U73 | Punkt 25 og 26 |
| OV-U105 (15.11) | vedtak | snevrer inn VS-U46 | Punkt 12 |

OV-U80, VS-U34 og VS-U39 er samlet i OV-U114, KA-U68 og OV-U106 er samlet i OV-U115, og OV-U95 er
opphevet av OV-U115. Henvisningene til dem gjelder samlevedtakene.

## Motsigelser og hull

- **M1 Hvilket varsel en kravpost gjelder.** Arbeidsvalget i Følge hos VS-U48 sier at et varsel sendt
  før det første kravet gjelder alle kravpostene med beregningsregelen. VS-U62 (andre setning) og
  VS-U55 («før det første kravet med kravposten (D-16 i BF-14)») bygger på det. VS-U69 endrer
  arbeidsvalget: totalentreprenøren velger varselet for posten, og det er forhåndsvalgt når saken har
  ett slikt varsel. Løses i E14.
- **M2 Feltet.** VS-U54 sier at feltet for varselet er valgfritt. VS-U69 gjør det påkrevd for en
  kravpost når saken har et varsel ingen kravpost viser til. Løses i beslutningsdelen (E14).
- **M3 Punkt 7 gjelder bare punkt 33.4.** E2 i versjon 1 lot stå åpent om en påberopelse etter punkt
  32.2, 34.1.2 eller 34.1.3 står mot senere versjoner. VS-U64 avgjør det for påberopelsen i svaret på
  et varsel etter punkt 34.1.2 og 34.1.3 som står alene, og VS-U61 for svaret på et varsel etter punkt
  34.3.3 og 34.4. For en påberopelse i svaret på kravet etter punkt 32.2, 34.1.2 og 34.1.3 er det
  fortsatt ikke avgjort. Løses i E11.
- **M4 «I tide» for punkt 34.3.3.** Punkt 8 og 10 gjelder alle varsler, og VS-U61 og VS-U62 viser til
  dem for svaret på et varsel etter punkt 34.3.3. VS-U63 tar det uttrykkelige «i tide» bort bare for
  punkt 34.4. VS-U57 sier bare at byggherren kan gjøre gjeldende at varselet kom for sent. Kjernen har
  for kravposten med justerte enhetspriser i dag bare om byggherren påberoper at varselet kom for sent
  (`varselForSent` i `kjerne/regler/vederlag.ts`, lest), og BF-14 er taus (D-14, D-20). Spørsmål 3.
- **M5 Registrerte svar.** Punkt 12 tredje setning sier at et registrert brev ikke gir noe standpunkt
  om påberopelsen. OV-U105 og OV-U114 punkt 5 gir et svar lagt til med svarskjemaet samme virkning
  som et svar sendt fra løsningen. Løses i E13.
- **M6 Ett brev per sak.** VS-U67 lar et brev fra løsningen ha varsler i vederlaget og fristen. VS-U71
  endrer det for brev fra løsningen. Løses i beslutningsdelen (E16).
- **M7 Svar 3 A og 5 A i VS-U48.** Følge hos VS-U48 sier at teksten for 3 A og 5 A ikke brukes som
  vedtakstekst. Den er ikke med (E17).
- **M8 HF-U25.** VS-U65 sier «følger HF-U25», som HF-U29 opphevet før VS-U65 ble vedtatt. Løses i
  E18.

## Utkastet til versjon 2

Punkt 1–6, 9, 11 og 13–20, designdelen og «Endret innhold» E1–E10 står som i versjon 1.
Nummereringen står, så henvisningene til punktene i versjon 1 virker. Henvisningene til OV-U95
gjelder OV-U115, og til OV-U80, VS-U34 og VS-U39 gjelder de OV-U114. Ny tekst med kilde («s2» er
andre setning i postens vedtakstekst):

- **Punkt 7, tillegg.** «Det samme gjelder en påberopelse i svaret på et varsel etter punkt 34.1.2,
  34.1.3, 34.3.3 første ledd og 34.4 som står alene (punkt 34). For varselet etter punkt 34.4 gjelder
  punkt 31.» (VS-U61; VS-U63; VS-U64; E11, E12)
- **Punkt 8, 10 og 12, første setning, tillegg.** «For varselet etter punkt 34.4 gjelder punkt 31.»
  (VS-U63; E12)
- **Punkt 12, tredje setning.** «Et brev lagt til som dokumentasjon gir ikke noe standpunkt om
  påberopelsen, enten det ikke sier noe om rettidigheten eller uttrykkelig gir den opp, og følger
  MM-U43 punkt 9.» Ny setning: «Et svar byggherren har sendt utenfor løsningen og lagt til som svar
  etter OV-U114 punkt 5, har samme virkning for påberopelsen som et svar sendt fra løsningen. Sier
  byggherren i skjemaet uttrykkelig at varselet kom i tide, eller gir påberopelsen opp, leser
  løsningen påberopelsen som oppgitt fra datoen svaret ble sendt (punkt 10 og 12, første setning).
  Sier svaret ikke noe om varselet, leses det med påberopelsen (punkt 9). Byggherren kan senere
  påberope det samme på nytt etter punkt 13, som et nytt utsagn med sitt eget tidspunkt (punkt 6). Om
  en godkjenning i et svar som er lagt til, er en endringsordre, avgjøres etter EO-U39 punkt 45, ikke
  av at påberopelsen er oppgitt.» (OV-U105 s1–s5; E13)

###### G. Varslene etter punkt 34.3.3 og 34.4

- **Punkt 21.** «For varselet etter punkt 34.3.3 første ledd og punkt 34.4 velger totalentreprenøren
  i skjemaet om totalentreprenøren bare varsler eller sender kravet. Totalentreprenøren kan
  registrere et brev sendt utenfor løsningen med datoen for varselet. Løsningen avgjør ikke om
  varselet kom i tide, eller hvilken virkning et manglende eller sent varsel har.» (VS-U48 s1, s3 og
  s5)
- **Punkt 22.** «Sender totalentreprenøren kravet, regnes det også som varselet. En kravpost med
  regningsarbeid eller justerte enhetspriser regnes som varsel for seg når den ikke hadde den
  oppgjørsformen i en tidligere versjon, enten posten er ny eller har skiftet oppgjørsform, og når den
  ikke viser til et varsel etter punkt 23. Brevet sier at kravet er varselet for den posten.» (VS-U48
  s2; VS-U49; VS-U69; E14)
- **Punkt 23.** «For hver kravpost som etter punkt 22 ville vært varsel, kan totalentreprenøren i
  kravskjemaet oppgi at varselet for posten etter punkt 34.3.3 eller 34.4 alt er gitt.
  Totalentreprenøren velger et varsel som er sendt eller registrert i løsningen, eller legger til et
  brev sendt utenfor løsningen som korrespondanse med kategorien varsel, med datoen. Brevet sier da
  ikke at kravet er varselet for posten, men at varselet for posten ble gitt i det brevet, med datoen.
  Har saken et varsel etter samme bestemmelse som ingen kravpost viser til, velger totalentreprenøren
  for posten hvilket av varslene den gjelder, eller at kravet er varselet for posten. Kravet sendes
  ikke uten valget. En kravpost gjelder varselet den viser til. Et feil valg rettes i en ny
  kravversjon, men tidsrommet for svaret på et varsel som en sendt kravversjon har vist til, åpnes
  ikke igjen (punkt 33). Løsningen kontrollerer ikke at brevet er et varsel for posten, og byggherren
  kan bestride datoen. Velger totalentreprenøren ikke et varsel, viser skjemaet før sending hvilke
  poster kravet regnes som varsel for.» (VS-U50 s1–s6; VS-U69 s1, s3–s5; E14)
- **Punkt 24.** «Legger totalentreprenøren i kravskjemaet til et dokument sendt utenfor løsningen som
  varselet for en kravpost, sier kravet at det er totalentreprenøren som opplyser at varselet ble gitt
  i dokumentet, og dokumentet legges ved kravet. Er varselet sendt eller registrert i løsningen før
  kravet, viser kravet bare til det. Kravet viser til dokumentet slik brevene ellers viser til
  korrespondanse.» (VS-U51 s1–s3)
- **Punkt 25.** «Er et varsel gitt før kravet, viser kravet kort til det, med brevet eller dokumentet
  det står i, og gjentar ikke varselet. Det gjelder varselet for en kravpost etter punkt 23, varselet
  etter punkt 33.4 i fristforlengelsen, og varslene etter punkt 34.1.2 og 34.1.3 i en ny kravversjon
  når varselet ble gitt i et tidligere brev. Et krav sendt fra løsningen har ikke som vedlegg brevet
  eller dokumentet med varselet etter punkt 33.4 i fristforlengelsen eller et varsel for en kravpost
  i vederlaget som alt står i saken, eller en fil som ligger ved det. Løsningen tar ikke imot kravet med
  et slikt vedlegg. Hver fil ved varselet regnes som en del av brevet eller dokumentet med varselet,
  og begrunnelsen kan vise til filene der. Løsningen vurderer ikke om kravet er tilstrekkelig
  dokumentert. Et dokument lagt til som varsel i kravskjemaet i samme handling legges ved kravet
  (punkt 24).» (VS-U55 s1–s2; VS-U73 s1–s3; VS-U75 s1–s5; E14, E15)
- **Punkt 26.** «Et brev sendt utenfor løsningen som både varsler og krever i et spor, legges til med
  kategorien krav, og kravet gjelder som varselet etter de samme reglene som et krav sendt fra
  løsningen. Gjelder kravet som varsel etter punkt 33.4, 34.1.2 eller 34.1.3, tar løsningen ikke imot
  det samme brevet som varsel etter den bestemmelsen. Er brevet lagt til som varsel etter bestemmelsen
  før kravet, står varselet, og kravet har brevet som vedlegg. Et krav sendt utenfor løsningen og
  lagt til som korrespondanse har brevet som ble sendt som vedlegg, også når brevet alt står i saken
  som varsel.» (VS-U74 s1–s3; VS-U73 s4; VS-U75 s6)
- **Punkt 27.** «Totalentreprenøren kan sende flere varsler etter punkt 34.3.3 første ledd og punkt
  34.4 i samme brev, ett for hvert arbeid. Hvert varsel har en beskrivelse av arbeidet det gjelder,
  og beskrivelsen står i brevet. Et varsel sendt fra løsningen må ha beskrivelsen, også når brevet
  har ett varsel. Ved registrering av et brev sendt utenfor løsningen kan beskrivelsen fylles ut, men
  må ikke. Varslene etter punkt 33.4, 34.1.2 og 34.1.3 har ingen beskrivelse. Løsningen leser ikke av
  beskrivelsen hvilket arbeid varselet gjelder.» (VS-U68 s1–s6; VS-U52 s2)
- **Punkt 28.** «Totalentreprenøren kan også velge varsel etter punkt 34.3.3 første ledd og etter
  punkt 34.4 når korrespondanse legges til som varsel (OV-U114 punkt 18). Det gjelder kravpostene
  etter punkt 22 og 23.» (VS-U52 s1 og s3)
- **Punkt 29.** «Registrerer totalentreprenøren et varsel eller krav etter NS 8407 kapittel 33 eller
  34 som totalentreprenøren har sendt utenfor løsningen, viser løsningen den samme opplysningen om
  kravene i kapittel B i kontraktsgrunnlaget som ved varselet etter punkt 32.2. Opplysningen står
  uansett hvilken type og sendemåte totalentreprenøren oppgir, og løsningen avgjør ikke om dokumentet
  oppfyller kravene (OV-U114 punkt 9).» (VS-U72 s1–s2)

###### H. Byggherrens svar på et varsel som står alene

- **Punkt 30.** «Byggherren kan svare på et varsel etter punkt 34.3.3 første ledd som står alene.
  Svaret har byggherrens standpunkt til om enhetsprisene skal justeres: byggherren godtar eller
  bestrider justeringen. Standpunktet godkjenner ikke priser, mengder eller beløp. Byggherren kan i
  samme svar gjøre gjeldende at varselet kom for sent. Da står prinsipalt at totalentreprenøren bare
  har krav på slik justering av enhetsprisen som byggherren måtte forstå at forholdet ville føre til,
  og subsidiært standpunktet til justeringen hvis varselet kom i tide (VS-U4). Løsningen regner ikke
  ut hva byggherren måtte forstå, og avgjør ikke om varselet kom i tide eller om svaret oppfyller
  svarplikten etter punkt 34.3.3 annet ledd. Byggherren tar stilling per kravpost i svaret på
  kravet.» (VS-U48 s4; VS-U57 s1–s6; VS-U61 s5)
- **Punkt 31.** «I svaret på et varsel etter punkt 34.4 som står alene, kan byggherren gjøre gjeldende
  at varselet kom for sent. Løsningen utleder ingen virkning av det (OV-U115 punkt 11). Punkt 34.4
  gir ingen svarplikt, og løsningen viser ingen svarfrist for det varselet. Har byggherren ingen
  innsigelse mot varselet, trenger byggherren ikke svare. For varselet etter punkt 34.4 har byggherren
  ett standpunkt: i svaret på varselet at varselet kom for sent, og i svaret på kravposten at varselet
  ikke ble gitt eller kom for sent (OV-U115 punkt 11). Ellers sier brevet ingenting om varselet, og
  løsningen tilbyr ikke et uttrykkelig standpunkt om at varselet kom i tide. Har byggherren gjort
  gjeldende at varselet kom for sent, kan byggherren gi det opp uttrykkelig i et senere svar på
  varselet eller på kravet, og brevet sier at innsigelsen er gitt opp. Et senere svar som ikke sier
  noe, gir den ikke opp (punkt 9 og 12).» (VS-U61 s2–s4 og s6; VS-U63 s1–s4; E12)
- **Punkt 32.** «Byggherren kan svare på et varsel etter punkt 34.1.2 eller det særskilte varselet
  etter punkt 34.1.3 som står alene, og si at varselet kom i tide eller kom for sent. Gjelder saken en
  endring, der punkt 34.1.2 ikke krever varsel, tilbys ikke standpunktet etter punkt 34.1.2 (OV-U89
  punkt 13). Løsningen avgjør ikke om varselet kom i tide (OV-U89 punkt 14).» (VS-U64 s1–s2 og s5)
- **Punkt 33.** «Byggherren kan svare på et varsel etter punkt 34.3.3 første ledd eller punkt 34.4 så
  lenge ingen sendt kravversjon har en kravpost som gjelder varselet (punkt 23). Viser ingen kravpost
  til varselet, kan byggherren fortsatt svare på det. Byggherren kan svare på et varsel etter punkt
  34.1.2 eller 34.1.3 så lenge ingen sendt kravversjon har det varselet gjelder: vederlagskravet for
  punkt 34.1.2, og den særskilte vederlagsjusteringen for punkt 34.1.3. Byggherren kan sende et nytt
  svar på varselet innenfor samme tidsrom, og det erstatter det forrige. En påberopelse i et tidligere
  svar bevares med tidspunktet, og et nytt svar gir den opp bare når det sier det uttrykkelig (punkt 6,
  10 og 12). Deretter tar byggherren stilling i svaret på kravposten, eller på vederlagskravet for
  punkt 34.1.2 og 34.1.3, og det er byggherrens siste standpunkt for posten.» (VS-U62 s1, s3–s6;
  VS-U64 s3; E14)
- **Punkt 34.** «En påberopelse i svaret på et varsel som står alene, står mot hver senere kravversjon
  med det varselet gjelder, til byggherren uttrykkelig gir den opp, og svaret på kravet viser til den
  og gjentar den som utgangspunkt (punkt 9, 10 og 12). For varselet etter punkt 34.3.3 og 34.4 står
  den bare mot kravpostene som gjelder varselet.» (VS-U61 s7; VS-U62 s7; VS-U64 s4; VS-U69 s6; E11)
- **Punkt 35.** «Svaret på et varsel lagt til mellom to krav gjelder bare varselet. Svaret på
  kravpostene i forrige brev står uendret. Vil byggherren endre det, sender byggherren et nytt svar
  på kravversjonen etter HF-U29.» (VS-U65; E18)

###### Designdelen, tillegg

- Byggherren svarer på et varsel som står alene, i samme svarskjema som svaret på kravet. (VS-U61;
  VS-U64)
- Dokumentet totalentreprenøren legger til i kravskjemaet som varselet for en kravpost, står i saken
  som et eget brev, med totalentreprenøren som avsender og datoen det ble sendt, blant brevene om
  saken og i tidslinja. Kravet viser til det og legger det ved. Nummeret i saken følger LV-U45.
  Ordlyden er design. (VS-U53; VS-U51; VS-U55)
- Har saken ett slikt varsel som i punkt 23, fjerde setning, er det forhåndsvalgt. (VS-U69 s2)
- Hvor opplysningen i punkt 29 står i skjemaene, og ordlyden i den. (VS-U72)

###### Beslutningsdelen, tillegg

- Kravposten viser til varselet for posten med et felt, både når totalentreprenøren velger et varsel
  som står i saken, og når totalentreprenøren legger til et dokument i kravskjemaet. Feltet er
  påkrevd i tilfellet i punkt 23, fjerde setning, og ellers valgfritt. Varselet viser ikke til
  kravposten. (VS-U54 s1–s2; VS-U69 s4; E14)
- Hvert varsel etter punkt 34.3.3 og 34.4 er et eget utsagn. (VS-U68 s2)
- Et brev med varsler fra løsningen gjelder én sak. Totalentreprenøren kan sende flere varsler i
  vederlaget i samme brev, for eksempel for flere arbeider. Varselet om fristforlengelse sendes fra
  skjemaet for fristen, i et eget brev. Varsler i flere saker sendes som ett brev per sak, og et brev
  sendt utenfor løsningen som varslet i flere saker, registreres i hver sak. Et brev sendt utenfor
  løsningen som varslet i både vederlaget og fristforlengelsen, registreres én gang med begge
  varslene. (VS-U71 s1–s5; VS-U67; E16)
- Forseringen etter punkt 33.8 er ikke bygget, og punkt 29 gjelder den når den bygges. (VS-U72 s3)
- Den egne innsigelsen mot varslene etter punkt 34.1.2, 34.1.3, 34.3.3 og 34.4 er utsatt etter første
  kulepunkt i versjon 1, og regelen om den står. (VS-U61 s8–s9; VS-U64 s6)

### Endret innhold

- **E11 Punkt 7 og 34.** Punkt 7 gjaldt bare punkt 33.4 (E2). VS-U61 og VS-U64 utvider det til
  påberopelsen i svaret på et varsel etter punkt 34.1.2, 34.1.3, 34.3.3 og 34.4 som står alene. For en
  påberopelse i svaret på kravet etter punkt 32.2, 34.1.2 og 34.1.3 er det fortsatt ikke avgjort.
- **E12 Punkt 7, 8, 10, 12 og 31.** VS-U63 snevrer inn punkt 8 og 10 for punkt 34.4: oppgivelsen er
  den eneste måten å gå bort fra påberopelsen på. Punkt 7 og 12, første setning, nevner også «i
  tide» og har fått samme henvisning. Punkt 8 og 10 gjelder ellers som før (spørsmål 3).
- **E13 Punkt 12.** OV-U105 snevrer inn tredje setning. «Et registrert brev» er nå et brev lagt til
  som dokumentasjon (OV-U114 punkt 4). Et svar lagt til med svarskjemaet har virkning som et svar fra
  løsningen. «Er påberopelsen oppgitt» i OV-U105 er skrevet som at løsningen leser den som oppgitt,
  som i punkt 12 første setning, fordi løsningen ikke avgjør bindingen (punkt 20). «OV-U6 og» er tatt
  ut, fordi EO-U39 samler OV-U6.
- **E14 Punkt 22, 23, 25 og 33 og feltet.** Arbeidsvalget i Følge hos VS-U48, at et varsel sendt før
  det første kravet gjelder alle kravpostene med beregningsregelen, gjelder ikke (VS-U69). En
  kravpost gjelder varselet den viser til. VS-U62 andre setning og «før det første kravet med
  kravposten» i VS-U55 er skrevet om etter det. «Hvis et slikt varsel ikke er registrert i løsningen
  før» i VS-U48 s2 og «når det ikke er registrert et varsel for posten før» i VS-U49 er skrevet som
  at posten ikke viser til et varsel. At feltet er påkrevd bare i tilfellet i VS-U69, er vår lesning
  av VS-U54 og VS-U69 sammen. At domenetabellen rettes (VS-U54 s3), er en arbeidsoppgave og ikke med.
  «For posten» i punkt 33 gjelder kravposten, og vederlagskravet for punkt 34.1.2 og 34.1.3.
- **E15 Punkt 25.** VS-U55, VS-U73 og VS-U75 er satt sammen. «Ordlyden er design» i VS-U55 står i
  designdelen.
- **E16 Beslutningsdelen.** VS-U71 endrer VS-U67: «også i vederlaget og fristforlengelsen» utgår for
  brev fra løsningen. At varsler i begge spor i samme brev venter (#1886, VS-U71 s6), er arbeidsstatus
  og står i issuet.
- **E17 Svar 3 A og 5 A.** Følge hos VS-U48 sier at teksten for 3 A og 5 A ikke brukes som
  vedtakstekst. Den er ikke med: at en kravpost med regningsarbeid kan sendes uten eget varsel og
  skjemaet ikke spør om det, og datoen og svarplikten for en kravpost med justerte enhetspriser.
  Datoen for varselet følger samlevedtaket for varslingsdatoen (VS-U76), og svarplikten følger av
  punkt 34.3.3 annet ledd.
- **E18 Punkt 35.** VS-U65 viser til HF-U25, som HF-U29 opphevet 05.11. Henvisningen gjelder HF-U29,
  som registeret alt fører («bygger på HF-U29»).
- **Hovedregelen** (OV-U92): (a) for VS-U46; henvisningene gjelder versjon 2.

### Forholdene (spørsmål 2)

Versjon 2 opphever VS-U46 (svar 4 A, fordi E12–E14 endrer innholdet) og samler de 23 postene i
tabellen. Samlingene og forholdene i VS-U46 føres videre. De samlede postene beholder forholdene
til andre poster. Versjon 2 utvider OV-U114 punkt 18 (VS-U52) og 21 (VS-U72), snevrer inn OV-U114
punkt 18 og presiserer punkt 19 for et krav som også er varsel (VS-U74), presiserer OV-U114 punkt
18–19 (VS-U55, tidligere VS-U34), presiserer OV-U115 punkt 10 og 11 og KA-U68-delen (VS-U48) og
utvider punkt 11 til svaret på varselet (VS-U61), og presiserer OV-U89 punkt 8–12 (VS-U64). OV-U115
utvider punkt 21–23 og 33 til den særskilte vederlagsjusteringen gjennom OV-U106; det forholdet står
i OV-U115.

## Spørsmålene, lagret ordrett

Lagret før de sendes til orkestratoren. Spørsmål 3 gjelder rettsregler og stilles i tekst.

> **1. Tilslutning.** Utkastet til versjon 2 med punkt 7, 8, 10 og 12, de nye punktene 21–35,
> designdelen, beslutningsdelen og «Endret innhold» E11–E18 gjelder slik det står, med grensen
> (MM-U54 og MM-U56 er ikke med), svarene på spørsmål 2–3 og rettelsene oppdragsgiver gir per
> punkt. Forkastet: «Utkastet legges fram på nytt etter rettelsene.»

> **2. Forholdene.** Bakgrunn: svar 4 A og OV-U92.
>
> - **A (anbefalt):** Versjon 2 opphever VS-U46 og samler de 23 postene, som i «Forholdene». Den
>   utvider OV-U114 punkt 18 og 21, snevrer inn OV-U114 punkt 18, presiserer OV-U114 punkt 18–19,
>   presiserer OV-U115 punkt 10 og 11 og utvider punkt 11 til svaret på varselet, og presiserer OV-U89
>   punkt 8–12.
> - **B:** Som A, men versjon 2 har ingen egne forhold til OV-U114, OV-U115 og OV-U89. De står bare i
>   de samlede postene, som viser til OV-U80, VS-U34, VS-U39, KA-U68 og OV-U95.
>
> Anbefaling: A. Postene de samlede postene viser til, er samlet eller opphevet, så forholdene i dem
> viser til tekst som ikke lenger gjelder. Styrer: `forhold` og `folge` i den nye posten.

> **3. Skal «i tide» snevres inn for varselet etter punkt 34.3.3 første ledd?** Bakgrunn: M4. Punkt 8
> og 10 i samlevedtaket for sent varsel gjelder alle varsler: byggherren kan si uttrykkelig at et
> varsel kom i tide, og det står mot senere kravversjoner til byggherren påberoper at det kom for sent.
> VS-U61 og VS-U62 viser til dem for svaret på et varsel etter punkt 34.3.3. Bare for varselet etter
> punkt 34.4 er de snevret inn (VS-U63). Ingen post nevner «i tide» for punkt 34.3.3 særskilt, og
> kjernen har i dag bare om byggherren påberoper at varselet kom for sent.
>
> - **A (anbefalt):** «Punkt 8 og 10 gjelder også varselet etter punkt 34.3.3 første ledd: byggherren
>   kan i svaret på varselet eller på kravposten si uttrykkelig at varselet kom i tide.» Forhold:
>   presiserer VS-U57; bekrefter det punkt 8 og 10 sier i dag.
> - **B:** «For varselet etter punkt 34.3.3 første ledd tilbyr løsningen ikke et uttrykkelig standpunkt
>   om at varselet kom i tide. Har byggherren gjort gjeldende at varselet kom for sent, kan byggherren
>   gi det opp uttrykkelig i et senere svar på varselet eller på kravet, og brevet sier at innsigelsen
>   er gitt opp. Et senere svar som ikke sier noe, gir den ikke opp. Svarplikten etter punkt 34.3.3
>   annet ledd og virkningen etter første ledd (punkt 30) står.» Forhold: snevrer inn punkt 7, 8, 10 og
>   12 for punkt 34.3.3 første ledd.
>
> Anbefaling: A. Det er regelen som gjelder, og bare B endrer noe. Løsningen utleder virkningen av
> standpunktet etter punkt 34.3.3 første ledd (VS-U3), og byggherren har svarplikt etter annet ledd.
> Grunnen for VS-U63, at løsningen ikke utleder noen virkning for punkt 34.4, gjelder ikke her.
> Kostnaden: ett valg til i svaret, og kjernen må få standpunktet (i dag bare «for sent»). Styrer:
> punkt 30 og valgene i svaret på varselet og kravposten (BF-14, D-14 og D-20).

## Svarene

- **Spørsmål 1–3:** oppdragsgiver 17.11, ordrett, videresendt av orkestratoren (#1534): «1 ja, 2 A,
  3 A». Det er tilslutning til utkastet med E11–E18 uten rettelser, forholdene etter 2 A, og at punkt
  8 og 10 gjelder også varselet etter punkt 34.3.3 første ledd (3 A). Svaret på spørsmål 3 står som
  siste setning i punkt 30. Posten er ført som VS-U77.

## Verifikasjon og grenser

- **Kjørt og observert:** `--sjekk` og `--kjede VS-U46` på `bd11924`; et skript over `vedtak.toml`
  for forholdene inn og ut av postene. Lest i `vedtak.md`: VS-U46 med E1–E10, OV-U114 punkt 3–5, 9,
  18–22, og valgt tekst og Følge i postene i tabellen.
- **Kontrollene:** én subagent kontrollerte hver setning mot kilden, og én prøvde utkastet og
  alternativene mot vedtakene og leste BF-14 og `kjerne/regler/vederlag.ts` for spørsmål 3. Funnene
  er rettet én gang; det som krever et valg, er spørsmål 2 og 3.
- **Ikke kontrollert:** sitatene fra NS 8407; koden utover det M4 sier.
