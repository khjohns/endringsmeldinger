# Spørsmålene i BF-06

Spørsmålene i [bestillingen for BF-06](BF-06.md), med svarene og forslaget til vedtakstekst, etter
[vedtaksskillen](../../../.claude/skills/vedtak/SKILL.md). Vedtakene føres av orkestratoren fra
denne fila.

Versjon 5, 03.11, med svarene på R-1–R-4, O-1 og O-2 og designet flyttet til bestillingen.
Versjon 4 (commit `a4632d3`) kom etter ChatGPTs vurdering av versjon 3
([sparringen](BF-06-sparring-v3.md)) og ble prøvd mot vedtaksfila. Versjon 3 er commit `5f5fbd3`. Versjon 1 (commit `eb44f0a`) og versjon 2 (commit `db37c21`) ble ikke stilt.

## Endret i versjon 5

Versjon 5 fører svarene på R-1–R-4, O-1 og O-2 og flytter designet til [BF-06.md](BF-06.md) etter
prinsippet i #1534: et vedtak sier hva som binder partene, hvilken virkning en handling har,
hvordan NS 8407 tolkes og hva løsningen teller eller regner. Versjon 4 er commit `a4632d3`.

### Svarene, ordrett

| Spørsmål | Teksten slik den ble stilt | Svaret | Kilde |
| --- | --- | --- | --- |
| R-1 (E1 og O-2) | «En endringsordre som omfatter en KOE som bestrider et utsagn, har et utsagn som erstatter det. Tillegget kan være 0.» | Først: «R1 : hva legges i å bestride utsagn? Hva er utsagn? Hvordan vet appen det?» Etter oppfølgingsspørsmålet: «R1: OK. Design vil være sentralt her slik at det ikke kompliserer unødvendig typisk koe-sak.» | #1065, kommentarene 6616942512 (teksten), 6616977149 og 6617101997 |
| R-2 (S-12) | «Endres noe i en av sakene, bekrefter byggherren listen på nytt. Endrer byggherren et utsagn, eller endres verdien godkjenningen regnes av, begynner godkjenningen på nytt. Ellers legges den fram igjen for den siste godkjenneren.» | «R2 Ja» | #1065, 6616942512 (teksten) og 6616977149 |
| R-3 (S-11 og O-4) | R-3a: «En retting kan endre beløp, dager, oppgjørsform og teksten, og gi et utsagn for et sendt krav endringsordren ikke svarte på, men ikke sakene. En retting av teksten gjelder når totalentreprenøren godtar den. Endret arbeid krever en ny endringsordre.» G1 står. | Først: «R3 - må vi ha retting? Eller bedre at BH trekker og utsteder ny?» Etter oppfølgingsspørsmålet: «r3c» | #1065, 6616942512 (R-3a), 6616977149 og 6617101997 (R-3c) |
| R-3c | «Endringsordren kan ikke rettes i løsningen. En feil til ulempe for totalentreprenøren rettes ved at totalentreprenøren bestrider utsagnet eller krever i en ny KOE, og byggherren svarer med et utsagn som erstatter det. En feil til ulempe for byggherren tar byggherren opp i et innlegg i EO-saken. Løsningen avgjør ikke virkningen, og summen viser det som ble sendt.» | Valgt. Forkastet: R-3a over, og R-3b, «byggherren trekker endringsordren og utsteder en ny». | #1065, 6617101997 |
| R-4 (erstatter F1) | «Registreringen gjelder de åpne sakene og viser at brevet også omfatter ‹sak›, som var lukket. Poster som gjelder den lukkede saken, registreres ikke.» | «R4: ja» | #1065, 6616942512 (teksten) og 6616977149 |
| O-1 | O-1 (a) under «Endret i versjon 4» | «1 og 2: enig med deg.» O-1 (a): «samme oppgjørsform» står også i S-17. | #1065, 6617137907 |
| O-2 | O-2 (a) under «Endret i versjon 4» | Samme svar. O-2 utgår som eget vedtak. Listen er design (U-17), og den delen som binder, er dekket av R-1. | #1065, 6617137907 og 6617101997 |
| E1, F1, G1 og presiseringene i versjon 4 | Under S-2, S-11 og «Endret i versjon 4» | «Enig med dine anbefalinger til spørsmålene.» F1 er erstattet av R-4, og G1 faller bort med R-3c. | #1065, 6616942512 |
| B-01 | Spørsmålet ordrett i #1423 | «B01: A» | #1423, 6616393286 |

R-3b ble ikke lagt fram som eget alternativ i vedtaksform. Teksten over er orkestratorens
gjengivelse i 6617101997, og den er en revisjon, som S-11 forkaster.

### Vedtakene for vedtaks-PR-en

Hvert vedtak står under spørsmålet med bakgrunnen, sitatene, teksten slik den ble stilt, svaret,
vedtaksteksten, de forkastede alternativene og forholdet. Tabellen viser hvor.

| Vedtak | Under | Svaret og kilden | Forholdet, kort |
| --- | --- | --- | --- |
| S-1, svaret og endringsordren samtidig | S-1 | Drøftingen 03.11, ikke med egne ord. Tas med i den samlede tilslutningen | Presiserer EO-U12 og EO-U3 |
| S-2, den registrerte endringsordren, med A1 og R-4 | S-2 | Drøftingen 03.11, og R-4 over | Snevrer inn punkt 11, 20 og 22 i MM-U34 og EO-U12. Snevrer inn MM-U38 (R-4). Endrer OV-U80. Presiserer OV-U6, EO-U3 (R-4), LV-U44 og EO-U14 |
| S-3, fullmakten, med D1 | S-3 | Drøftingen 03.11 | Endrer vedtaket 23.09 (GFK-06) og GFK-U4 for en endringsordre |
| S-4, forbehold ved registrering | S-4 | Drøftingen 03.11 | Endrer OV-U80 og KA-U45. OV-U69 står |
| S-6, samlet utsagn og overslag | S-6 | Drøftingen 03.11 | Utvider EO-U8, KA-U1 og OV-U43 |
| S-7, utkast og registrering holder ikke av saken, med B1 | S-7 | Drøftingen 03.11 | Presiserer EO-U3 |
| S-8, tilbud | S-8 | Drøftingen 03.11 | Endrer EO-U8 og OV-U43 prinsipp 5. Presiserer HF-U12 |
| S-9, svikt | S-9 | Drøftingen 03.11 | Presiserer punkt 22 og snevrer inn punkt 20 i MM-U34 |
| S-10, regningsarbeid | S-10 | Drøftingen 03.11 | Presiserer punkt 19 i MM-U34. Snevrer inn OV-U43 prinsipp 2 og 3 |
| S-11, uenighet og aksept, med C1, E1, R-1 og R-3c | S-11 | Drøftingen 03.11, og R-1 og R-3c over | Endrer EO-U4, EO-U1, EO-U8 og punkt 22 i MM-U34. Snevrer inn KA-U1 (C1), MM-U21 (R-3c) og punkt 20 i MM-U34 (R-1). Presiserer MM-U38 (R-3c) |
| S-12, endring under godkjenningen, med R-2 | S-12 | Drøftingen 03.11, og R-2 over | Utvider og presiserer GFK-U7 |
| S-14, lukkingen av en oppfølgende KOE | S-14 | Drøftingen 03.11 | Presiserer EO-U3 |
| S-15, utsagn uten krav i en registrering | S-15 | Drøftingen 03.11 | Snevrer inn S-8. Presiserer MM-U38 og OV-U80 |
| S-16, nøkkeltallene | S-16 | Drøftingen 03.11 | Endrer MM-U38 |
| S-17, kjeden og tillegget, med O-1 | S-17 | Drøftingen 03.11, og O-1 over | Endrer MM-U38 |
| S-18, én beskrivelse | S-18 | Drøftingen 03.11 | Presiserer GR-U13 |
| B-01, relasjonsprojeksjonen | #1423 | «B01: A», 6616393286 | Avgjør B-01 i hovedplanen |

Ingen vedtak: S-5 (besvart gjennom S-11), S-13 (parkert), O-2 (design, U-17), O-3 og F1
(erstattet av R-4), O-4 og G1 (falt bort med R-3c). Svarene «drøftingen 03.11» ble gitt i økta
for #1525 og har ingen kommentar-ID. De står ordrett under spørsmålet, slik versjon 3 førte dem.

### Det som er flyttet til BF-06.md

Hele setninger som bare sier hvordan skjemaet eller visningen er bygget, er tatt ut av
vedtakstekstene og står som U-punkter i [BF-06.md](BF-06.md#det-brukeren-skal-finne-og-forstå).
Ingen ord er lagt til i en vedtakstekst.

- S-2: «Skjemaet fylles ut etter det brevet sier.» → U-20.
- S-6: «Standarden er ett utsagn per sak og spor.» → U-19.
- S-8: «Skjemaet har ikke noe valg mellom standpunkt og tilbud, og utsagnene har ingen slik
  merkelapp.» → U-20.
- O-2, listen i skjemaet for den nye KOE-en → U-17.
- Designpunktene fra gjennomgangen av brukeropplevelsen (6616942512) → U-13–U-16 og U-18. Merknaden
  til R-1 om at bestridelsen ikke skal komplisere en vanlig KOE-sak → U-12.

Disse setningene har design og binding i samme setning og står i vedtaksteksten, fordi de ikke kan
deles uten nye ord. De tas i oppryddingen etter #1534, eller deles i vedtaks-PR-en hvis
oppdragsgiver godtar en ny formulering:

- S-1: «spør svarskjemaet når endringsordren i EO-saken sendes» og valgene i svarskjemaet.
- S-2: «bruker registreringen samme skjema som en endringsordre sendt fra løsningen» og
  «Kontrollen før registreringen viser kravversjoner som er sendt etter datoen på brevet.», som
  står sammen med «Løsningen avgjør ikke virkningen.». A1: «vises ved siden av koden» og «Merket på
  KOE-sakene viser koden».
- S-6: «Skjemaet viser avviket».
- S-7: «stopper sendingen og sier hvilken».
- S-11: «Løsningen viser alle registrerte enigheter om samme oppgjør».
- S-12: «bekrefter byggherren listen på nytt» (R-2). I versjon 4 var bekreftelsen et produktvalg
  og ikke et vedtak. Nå står den i teksten oppdragsgiver har godtatt.

### Teksten om fristene, kontrollert mot kontrakten

Designpunktet om svaret på endringsordren hadde en tekst om at fristene for å varsle uenighet
gjelder selv om løsningen ikke krever svar. Den er kontrollert mot NS 8407 i `khjohns/kontrakt`
(commit `5540b60`) og er ikke tatt inn. Kontrakten har ingen frist for å varsle uenighet med en
endringsordre. Endringsordren binder uten aksept (punkt 31.3 annet ledd). Fristene gjelder kravene
og varslene: varsel om og spesifisering av fristforlengelse (punkt 33.4 og 33.6.1), særskilt varsel
om rigg og drift (34.1.3), varsel om justering av enhetspriser (34.3.3), varsel om at reglene om
regningsarbeid ikke kan anvendes (34.2.2) og varsel om at overslaget vil bli overskredet (30.2).
Etter avslag på et krav om vederlag eller frist gjelder søksmålsfristen i punkt 35.2, og krav som
ikke er med i sluttoppstillingen, kan ikke fremsettes senere (39.1). Om en endringsordre som gir
mindre enn kravet, er et avslag etter punkt 35.2, er en tolkning som ikke er avgjort. Spørsmålet
står i «Åpne spørsmål» i BF-06.md.

### Samspillet som står åpent

Svarene passer på tekstene som ble stilt. Samspillet med de andre valgene gir disse lesningene.
Økta har ikke valgt, og vedtaksteksten under har ingen ord for dem.

1. **R-4 og tidspunktet (S-2, S-7).** «De åpne sakene» sier ikke når saken skal være åpen. (a)
   Når den siste godkjenningen gjøres, som presisering 4 i versjon 4, uten «ellers stopper hele
   registreringen». (b) Når registreringen legges fram, og en sak som lukkes under godkjenningen,
   følger S-12. B1 (S-7) sier: «Er saken tatt av en annen endringsordre før den siste
   godkjenningen, stopper sendingen eller registreringen.» Med R-4 kan det leses (a) at
   godkjenningen avvises og byggherren bekrefter listen på nytt (R-2), og at registreringen så
   gjelder de åpne sakene, eller (b) at «eller registreringen» i B1 ikke lenger gjelder.
2. **R-1 og den registrerte endringsordren (S-15).** Et brev sendt utenfor løsningen kan omfatte
   en KOE som bestrider et utsagn, uten et utsagn som erstatter det. (a) R-1 gjelder det som
   sendes fra løsningen, og registreringen gjengir brevet (S-15, OV-U80). (b) Registreringen
   krever utsagnet.
3. **R-3c og registreringen.** (a) «Endringsordren kan ikke rettes i løsningen» gjelder også en
   registrering byggherren har ført feil (F-5). (b) Den gjelder brevet, og en feil i
   registreringen er et annet spørsmål.
4. **R-3c og EO-U9.** Forholdet i 6617101997 er «snevrer inn MM-U21 og EO-U9 for endringsordrer».
   EO-U9 ble opphevet 28.10 av punkt 22 i MM-U34, så forholdet til EO-U9 kan ikke føres. Forholdet
   under S-11 er derfor «Snevrer inn MM-U21 for en endringsordre», med EO-U9 nevnt som opphevet.

### Spørsmålene om samspillet, til oppdragsgiver

Punkt 4 er avgjort av orkestratoren 03.11 slik det er ført. Punkt 1–3 legges fram slik, ordrett.
Alle tre berører rettsregler og stilles i tekst, ikke med spørsmålsverktøyet. Svar gjerne med en
bokstav per spørsmål.

**T-1. Når må en sak være åpen for at en registrert endringsordre skal gjelde den?**

*Bakgrunn.* Byggherren kan registrere en endringsordre som er sendt på papir eller e-post. Du har
godtatt at registreringen gjelder de sakene som er åpne: «Registreringen gjelder de åpne sakene og
viser at brevet også omfatter ‹sak›, som var lukket. Poster som gjelder den lukkede saken,
registreres ikke.» Teksten sier ikke når saken må være åpen. Du har også godtatt: «Er saken tatt
av en annen endringsordre før den siste godkjenningen, stopper sendingen eller registreringen.»
Og: «Endres noe i en av sakene etter at endringsordren eller registreringen er lagt fram til
godkjenning, ved en ny kravversjon, et trekk, en aksept, en lukking eller et nytt svar, avvises
den siste godkjenningen. Endres noe i en av sakene, bekrefter byggherren listen på nytt.»

*Alternativene i vedtaksform.*
- (a) «En registrert endringsordre gjelder de sakene som er åpne når den siste godkjenningen
  gjøres. Lukkes en sak etter at registreringen er lagt fram til godkjenning, avvises den siste
  godkjenningen, og byggherren bekrefter listen på nytt. Registreringen gjelder deretter de sakene
  som fortsatt er åpne. Endres verdien godkjenningen regnes av, begynner godkjenningen på nytt. Er
  ingen av sakene åpne, stopper registreringen.»
- (b) «En registrert endringsordre gjelder de sakene som er åpne når den siste godkjenningen
  gjøres. Lukkes en sak etter at registreringen er lagt fram til godkjenning, faller saken ut av
  registreringen uten at godkjenningen avvises. Er ingen av sakene åpne, stopper registreringen.»

*Forholdet.* (a) presiserer de to valgene over: «stopper … registreringen» betyr at den siste
godkjenningen avvises, og en lukking er en endring etter valget om godkjenningen. (b) endrer valget
om at registreringen stopper, og endrer valget om godkjenningen for en registrering, fordi verdien
godkjenningen regnes av, da endres uten ny godkjenning. GFK-U7 står i begge: «Kan svaret ikke
sendes fordi kravet er endret etter at svaret ble lagt fram, avvises godkjenningen.»

*Hva valget styrer.* Om den som godkjenner, alltid godkjenner den listen over saker som faktisk
lukkes.

*Anbefaling: (a).* Med (b) godkjenner den med fullmakt en liste som kan bli kortere etterpå uten
at noen ser det. (a) bruker samme regel som for en endringsordre sendt fra løsningen. At en sak
sjelden lukkes mens en registrering venter, er en antakelse. Tas en sak av en endringsordre sendt
fra løsningen mens en registrering med tidligere brevdato venter, går saken til den senere
endringsordren i begge alternativene, og løsningen avgjør ikke virkningen.

**T-2. Må en registrert endringsordre ha et utsagn som erstatter et utsagn totalentreprenøren har bestridt?**

*Bakgrunn.* Du har godtatt: «En endringsordre som omfatter en KOE som bestrider et utsagn, har et
utsagn som erstatter det. Tillegget kan være 0.» Et brev byggherren har sendt utenfor løsningen, kan
omfatte en slik KOE uten å si noe om det bestridte utsagnet. Du har også godtatt: «En registrert
endringsordre gjengir det brevet sier, også utsagn om vederlag og frist for krav
totalentreprenøren ikke har sendt.» OV-U80: «Der skjemaet og dokumentet spriker, er dokumentet
partens meddelelse.»

*Alternativene i vedtaksform.*
- (a) «Regelen om at en endringsordre som omfatter en KOE som bestrider et utsagn, har et utsagn
  som erstatter det, gjelder endringsordrer som sendes fra løsningen. En registrert endringsordre
  gjengir det brevet sier. Sier brevet ikke noe om det bestridte utsagnet, står det som bestridt
  og kan ikke godtas, og totalentreprenøren kan bestride det på nytt i en ny KOE.»
- (b) «Også en registrert endringsordre som omfatter en KOE som bestrider et utsagn, har et utsagn
  som erstatter det. Sier brevet ikke noe om det bestridte utsagnet, kan brevet ikke registreres
  som endringsordre i en EO-sak.»

*Forholdet.* (a) snevrer inn regelen om utsagnet som erstatter det bestridte, for en registrert
endringsordre, og presiserer at registreringen gjengir brevet. Den presiserer også valget om at
bare én KOE om gangen kan bestride et utsagn, regelen om at sperren bare oppheves når KOE-en
trekkes, og kjeden: utsagnet har ingen etterfølger og er fortsatt det siste i kjeden. (b) snevrer
inn adgangen til å registrere en endringsordre i en EO-sak, endrer valget om at en registrert
endringsordre gjengir det brevet sier, for et slikt brev, og står i strid med OV-U80.

*Hva valget styrer.* Om byggherren kan registrere et brev slik det er, eller må ta det opp med
totalentreprenøren først.

*Anbefaling: (a).* Brevet er alt sendt, og registreringen skal ikke si mer enn brevet (OV-U80).
Med (b) blir KOE-en stående åpen selv om byggherren har sendt en endringsordre som omfatter den,
og byggherren må sende en ny endringsordre fra løsningen for å lukke den. Prisen ved (a): KOE-en
lukkes, og totalentreprenøren kan tro at kravet er gjort opp. Bestillingen skal vise at det
bestridte utsagnet står uten et utsagn som erstatter det (U-21). Det er byggherren som fører om
brevet har et slikt utsagn, fordi løsningen ikke tolker brevet (KA-U16).

**T-3. Kan byggherren rette en registrering som ikke stemmer med brevet?**

*Bakgrunn.* Du har godtatt: «Endringsordren kan ikke rettes i løsningen.» En registrering er
byggherrens gjengivelse av et brev som alt er sendt, og den kan være ført feil, for eksempel et
beløp som ikke står i brevet. OV-U80: «Der skjemaet og dokumentet spriker, er dokumentet partens
meddelelse.»

*Alternativene i vedtaksform.*
- (a) «En registrert endringsordre kan ikke rettes i løsningen, heller ikke når registreringen
  ikke stemmer med brevet. Byggherren tar feilen opp i et innlegg i EO-saken, og brevet er
  byggherrens meddelelse. Løsningen avgjør ikke hva en aksept av en post som ikke stemmer med
  brevet, betyr.»
- (b) «Stemmer en godkjent registrering ikke med brevet, kan byggherren rette registreringen.
  Rettingen går gjennom godkjenningen etter fullmakten, endrer ikke hvilke saker registreringen
  omfatter, og brevet står uendret. Har totalentreprenøren godtatt eller bestridt posten før
  rettingen, gjelder aksepten eller bestridelsen posten slik den var registrert.»

*Forholdet.* (a) presiserer at regelen om at endringsordren ikke kan rettes, også gjelder en
registrering. Den snevrer inn OV-U80 for en registrert endringsordre: «Avsenderen retter en feil
kategori eller et feil varsel etter MM-U21.» Og den presiserer «summen viser det som ble sendt»:
summen viser registreringen, ikke brevet. (b) snevrer inn regelen om at endringsordren ikke kan
rettes, for en registrering. MM-U21 gjelder ikke, fordi rettingen gjelder etter fullmakten uten
motpartens aksept.

*Hva valget styrer.* Om summen og kjeden kan vise et beløp brevet ikke har, når registreringen er
feil.

*Anbefaling: (a), med en svakhet.* Én regel for alt som er sendt, og brevet gjelder uansett
(OV-U80). Prisen er at summen kan vise et feil beløp til en ny endringsordre erstatter utsagnet. Er
et beløp ført for høyt, kan totalentreprenøren godta posten, og løsningen viser da en enighet om et
beløp brevet ikke har. Byggherren har bare et innlegg å svare med. (b) løser det, men sier ikke
hva aksepten etterpå betyr. En sak som er tatt med ved en feil, lukkes i begge alternativene. At
feil i registreringen er sjeldne, er en antakelse.

## Endret i versjon 4

**Besvart 03.11.** Oppdragsgiver svarte på orkestratorens anbefalinger i oppdraget for versjon 4:
«Enig med dine anbefalinger til spørsmålene.» Svaret gjelder valgene E1, F1 og G1 og
presiseringene under. De står i vedtaksform under spørsmålene, slik A–D er ført.

1. **Aksept og overslag (S-6, S-8, S-11).** Aksepten gjelder tilbudet om vederlag, oppgjørsform
   eller frist. Et overslag ved regningsarbeid kan ikke godtas, og enighet om regningsarbeid gjør
   ikke overslaget til et fast beløp. S-8 viser til S-6 og S-15.
2. **Oppgjørsformen i kjeden (S-17).** Tillegget regnes bare når begge utsagnene har et samlet
   beløp og samme omfang. Ellers erstatter det nye utsagnet det gamle i summen, uten tillegg.
3. **Retting (S-11, G1).** «Rent språklige feil behandles enklere» er avvist (KA-U16). Hver retting
   av en endringsordre går gjennom fullmakten, og nytt arbeid krever en ny endringsordre.
4. **Tidspunktet for registreringen (S-2, F1).** Sakene må være åpne når den siste godkjenningen
   gjøres. Ellers stopper hele registreringen, og brevet blir dokumentasjon uten strukturert
   behandling.
5. **S-9.** «Er enig i forholdet» gjelder forholdet slik endringsordren beskriver og omfatter det,
   og den faste teksten ved svikt nevner bare sporene endringsordren har utsagn for.
6. **S-3.** Et sendt krav som ikke er tallfestet, krever hele kjeden. D1 endrer også GFK-U4 for en
   endringsordre.
7. **S-18.** «Med tilpasningen for svikt i S-9».
8. **Sperren (S-11, E1).** Bare én KOE kan bestride et utsagn om gangen, så et utsagn har høyst én
   direkte etterfølger.

**Ikke sett av oppdragsgiver.** Prøven av arbeidsflyten og prøven mot vedtaksfila fant det som
står under. Ingen av funnene endrer et valgt alternativ. Funn som ville endret et alternativ, står
som oppfølgingsspørsmål med en anbefaling.

*Forholdene, rettet etter prøven mot vedtaksfila.* Teksten i alternativene er ikke endret.
- Punkt 1 *utvider* OV-U43, og presiserer den ikke. Overslaget i OV-U43 prinsipp 2 er
  totalentreprenørens opplysning etter punkt 30.2, og regelen gjelder her byggherrens overslag.
- Punkt 4 og F1 *snevrer inn* MM-U38. Et brev som blir dokumentasjon, telles ikke i summen av
  «alle sendte endringsordrer».
- S-16 er rettet etter punkt 2. Summen teller tillegget når det regnes, og ellers det nye
  utsagnet i stedet for det erstattede. Før sa S-16 at summen alltid teller tillegget.
- Etter vedtaksprøven gjelder S-3 også et utsagn uten samlet beløp, for eksempel regningsarbeid:
  det krever hele kjeden, som et krav som ikke er tallfestet (vedtaket 23.09). Prototypen viser
  det allerede (steg 10 i BF-06.md). Dette følger av vedtaket og er ikke et nytt valg.

*Oppfølgingsspørsmål.* Besvart 03.11, se «Endret i versjon 5»: O-1 (a) er valgt, O-2 utgår som
vedtak (U-17), O-3 er erstattet av R-4, og O-4 faller bort med R-3c. Teksten under er slik den
ble stilt.

- **O-1. Vilkåret for differansen.** S-16 regner differansen mot et utsagn når kravet har «samme
  omfang og oppgjørsform». S-17 regner tillegget når utsagnene har «et samlet beløp og samme
  omfang». Går en fast sum over til enhetspriser med et samlet beløp, gir S-17 et tillegg, mens
  S-16 viser kravet for seg. (a) S-17 får også «samme oppgjørsform», så de to reglene regner
  differansen i de samme tilfellene. Anbefalt. (b) Vilkårene står som de er.
- **O-2. Tillegg til E1.** (a) Skjemaet for den nye KOE-en lister utsagnene i endringsordren for
  saken, og totalentreprenøren oppgir for hvert om KOE-en bestrider det. Løsningen prøver ikke
  svaret (MM-U12). Lukker en ny endringsordre den bestridende KOE-en uten et utsagn som erstatter
  det bestridte, viser kontrollen før sending det til byggherren, uten å stoppe sendingen.
  Anbefalt. Uten listen lønner det seg for totalentreprenøren å oppgi «gjelder noe nytt», godta
  posten og samtidig kreve mer. Uten varselet blir utsagnet stående sperret uten at noen har ment
  det, og byggherren må sende en ny endringsordre, eventuelt med tillegg 0. (b) E1 står uten
  tilleggene.
- **O-3. Tillegg til F1.** (a) Byggherren legger selv brevet til som dokumentasjon, i stedet for at
  det skjer automatisk, så en feil i skjemaet ikke legger brevet i feil sak. Meldingen viser
  veiene videre for de åpne sakene: å registrere brevet som svar på forholdet etter OV-U6, eller å
  sende en endringsordre fra løsningen. Den sier også at en sak bare fjernes fra skjemaet når
  brevet ikke omfatter den. Anbefalt. Ellers lønner det seg å fjerne den lukkede saken for å få
  registreringen gjennom, og det er den delregistreringen F1 forbyr. (b) F1 står uten
  tilleggene.
- **O-4. Rettingen og kjeden (S-11).** (a) Bare et utsagn som verken er bestridt eller erstattet,
  kan rettes. En retting er ikke et nytt ledd i kjeden. En retting til byggherrens fordel gjelder
  først når totalentreprenøren godtar den, og til da kan utsagnet slik det ble sendt, godtas eller
  bestrides. Bestrides utsagnet, kan rettingen ikke lenger godtas i løsningen, og løsningen avgjør
  ikke om byggherren er bundet av den (MM-U12). Det rettede utsagnet kan bestrides i en ny KOE som
  andre utsagn. Forhold: snevrer inn MM-U21 for en endringsordre, fordi et bestridt utsagn heller
  ikke kan rettes i motpartens favør. Byggherren sender da en ny endringsordre. Anbefalt. Uten
  dette kan en retting som ikke er godtatt, bli siste ledd i kjeden, og totalentreprenøren kan
  verken godta eller bestride det som ble sendt. (b) MM-U21 gjelder uten presisering.
  Byggherrens retting av et bestridt utsagn til totalentreprenørens fordel gjelder straks, og
  kjeden må da ta stilling til rettingen.

## Grunnlaget for spørsmålene

Versjon 3 ble rettet 03.11 etter prøvingen mot vedtaksfila.
Spørsmålene ble i stedet stilt og besvart i drøftingen med oppdragsgiver 03.11, med sparring med
ChatGPT og en gjennomgang av NS 8407 og konkurransegrunnlaget del II i `khjohns/kontrakt`
(commit `5540b60`). Mange alternativer ble stilt i kortform. Denne versjonen skriver hvert valgt
alternativ ut i vedtaksform, så oppdragsgiver kan se teksten før den blir vedtak.

Alle spørsmålene er besvart (versjon 5). Ingenting er ført som vedtak.
Vedtakstekstene under gjengir arbeidsmåten, D-punktene og S-punktene i
[BF-06.md](BF-06.md). De legger ikke til noe nytt. Der en formulering ikke er sett av
oppdragsgiver i den formen, står det under **Merknad**. Fire valg ble lagt fram for seg og besvart 03.11: A1 om koden for en registrert endringsordre
(S-2), B1 om at ingenting som venter på godkjenning, holder av saken (S-7), C1 om aksept av et
utsagn som svarer på en eldre kravversjon (S-11), og D1 om to signaturer (S-3).

Sitater fra vedtak er ordrette fra [vedtaksfila](../../plans/vedtak.md). Sitater fra NS 8407 og
del II er korte og står med punktnummer. Teksten ligger i det private repoet.

## S-1. Sendes endringsordren i EO-saken samtidig med godkjenningen av forholdet?

**Bakgrunn.** EO-U12: «Godkjenning av grunnlaget alene lukker ikke KOE-saken, selv om
godkjenningen er en endringsordre etter kontrakten.» Oppdragsgiver sa før drøftingen at
løsningen må «legge opp til» at byggherren utsteder endringsordren samtidig med svaret.
Prosedyren for endringshåndtering sier at det skal utstedes endringsordre når byggherren godtar
at det er grunnlag. Teksten i versjon 2 ble ikke stilt.

**Spørsmålet slik det ble stilt.** Det ble lagt fram som flyt 1 i oversikten over arbeidsmåten
03.11, med to valg i svarskjemaet: «Send svaret og endringsordren nå» og «Send svaret nå,
endringsordren senere».

**Svaret.** Ikke besvart med egne ord. Oppdragsgiver bygget videre på de to valgene i alle
rundene 03.11, også da veien fra svaret på forholdet ble lagt inn i skissen («Ta punkt 1-5 nå»).

**Forslag til vedtakstekst.** «Når byggherren godkjenner forholdet uten å påberope preklusjon, i
en underkategori der punkt 32.2 gjelder, spør svarskjemaet når endringsordren i EO-saken sendes. Ved ‹Send svaret og endringsordren nå› lager skjemaet
endringsordren i en ny EO-sak som omfatter saken. De to brevene godkjennes samlet etter
fullmakten (S-3) og sendes samtidig og udelelig, og KOE-saken lukkes. Ved ‹Send svaret nå,
endringsordren senere› sendes svaret alene, saken står åpen, og vederlag og frist behandles videre
i saken til en endringsordre i en EO-sak omfatter den. Svaret er i begge tilfeller en
endringsordre etter punkt 32.3 første ledd a, jf. punkt 31.3.»

**Forkastet.**
- «Når byggherren godkjenner forholdet uten å påberope preklusjon, i en underkategori der punkt
  32.2 gjelder, sender byggherren alltid samtidig en endringsordre i en EO-sak som omfatter saken,
  og saken lukkes.» Forhold: endrer EO-U12.
- «Løsningen foreslår ikke en endringsordre i EO-saken sammen med svaret. Saken står åpen til
  byggherren sender en endringsordre i en EO-sak som omfatter den.»

**Forhold.** Presiserer EO-U12 og EO-U3. GR-U14 og GR-U32 står. At ingen av valgene er forhåndsvalgt, er
designmålet U-2 i bestillingen og ikke et vedtak.

**Merknad.** Valget er ikke bekreftet med egne ord. Det tas med i den samlede tilslutningen.

## S-2. Hva gjør en registrert endringsordre med KOE-saken?

**Bakgrunn.** OV-U6: «Registreringen er byggherrens godkjenning av grunnlaget og går gjennom
fullmakten som en godkjenning av grunnlaget etter GFK-06.» OV-U80: «Byggherrens egen
endringsordre er et valg i svaret, på vilkårene i OV-U6.» og «Der skjemaet og dokumentet
spriker, er dokumentet partens meddelelse.» Punkt 20 i MM-U34: «Bare en endringsordre byggherren
sender uttrykkelig som endringsordre i en EO-sak, lukker saken (EO-U12).» Teksten i versjon 2 ble
ikke stilt.

**Spørsmålet slik det ble stilt.** «Registrert endringsordre: ja, både flyten og skjemaet må
oppdateres», med fem punkter: skjemaet for registrering, tidspunktet, poster uten krav (S-15),
modellen for oppgjøret og P-3. Forslaget til tidspunktet var: «Registreringen godtas bare når
sakene fortsatt er åpne når den registreres.»

**Svaret.** Oppdragsgiver 03.11, til forslaget om å registrere i en EO-sak: «B. Ja dette er
særskilt unntak med tydelig informasjon til BH som registrerer EO.» (fra reviewet av #1519). Til
forslagene om registreringen: «Ja. Enig med dine anbefalinger».

**Forslag til vedtakstekst.** «Byggherren kan registrere en endringsordre sendt utenfor
løsningen på to måter. Registreres den som svar på forholdet etter OV-U6, står saken åpen, og
vederlag og frist behandles videre i saken. Registreres den som endringsordre i en EO-sak, bruker
registreringen samme skjema som en endringsordre sendt fra løsningen, med brevet som vedlegg,
datoen det ble sendt og dokumentkoden i brevet. Det
lages ingen brevtekst, og der skjemaet og brevet spriker, er brevet byggherrens meddelelse.
Registreringen går gjennom godkjenningen etter fullmakten og lukker sakene den omfatter når den
er godkjent. Den har datoen brevet ble sendt. Registreringen gjelder de åpne sakene og viser at
brevet også omfatter ‹sak›, som var lukket. Poster som gjelder den lukkede saken, registreres ikke.
Kontrollen før registreringen viser kravversjoner som er sendt etter datoen på brevet. Løsningen
avgjør ikke virkningen. Totalentreprenøren kan godta et utsagn i en registrert endringsordre, en
ny KOE kan bestride det, og det kan inngå i en kjede etter S-17, som for en endringsordre sendt fra
løsningen.»

**Forkastet.**
- «En registrert endringsordre registreres bare som svar på forholdet etter OV-U6, og saken står
  åpen til byggherren sender en endringsordre i en EO-sak.»
- «Byggherren opplyser ved registreringen om endringsordren avslutter saken. Ved ja lukkes saken,
  ellers står den åpen.»

**Forhold.** Utvider punkt 20 og 22 i MM-U34 og EO-U12: registrering i en EO-sak lukker saken på
samme måte som sending. Snevrer inn MM-U38: et brev som blir dokumentasjon fordi en sak er lukket,
telles ikke i summen av vederlag i sendte endringsordrer. Endrer OV-U80: setningen om byggherrens egen endringsordre gjelder
registrering som svar på forholdet. Presiserer OV-U6. EO-U14 og LV-U44 gjelder koden, se merknaden.
Versjon 5, rettet etter prøven mot vedtaksfila: «Utvider punkt 20 og 22 i MM-U34 og EO-U12» blir
«Snevrer inn punkt 11, 20 og 22 i MM-U34 og EO-U12». Punkt 11 i MM-U34: «Saken lukkes bare av en
endringsordre byggherren sender i en EO-sak.» Registreringen er et unntak fra «bare», og OV-U6
førte samme slags unntak som «Snevrer inn OV-U4». Snevringen av MM-U38 for et brev som blir
dokumentasjon, faller bort med F1. I stedet snevrer R-4 inn MM-U38: postene i brevet for den
lukkede saken telles ikke, selv om brevet er sendt.

**Merknad.** Versjon 4 hadde regelen om at registreringen bare godtas når sakene er åpne når den
siste godkjenningen gjøres. Versjon 5 erstatter den med R-4. Når saken skal være åpen, står i
«Samspillet som står åpent», punkt 1.

**Endret i versjon 5.** Setningene fra F1 er erstattet av R-4 ordrett. «Skjemaet fylles ut etter
det brevet sier.» er flyttet til U-20 i bestillingen.

**Valg A, besvart 03.11.** Spørsmålet slik det ble stilt: «A. Hvilket nummer får en registrert
endringsordre? LV-U44 (vedtatt i dag) sier at en EO-sak får koden EO-nn med løpenummer når
byggherren oppretter den. EO-U14 forkastet at byggherren bruker sin egen nummerering. Et brev sendt
utenfor løsningen har likevel sitt eget nummer.» Alternativene: «A1. EO-saken får løsningens kode
etter LV-U44. Brevets eget nummer lagres som brevets referanse og vises ved siden av. Merket i
sakslisten bruker løsningens kode. Anbefalt: det følger LV-U44 og EO-U14.» og «A2. Merket bruker
brevets eget nummer. Det strider mot EO-U14.» Svaret: «A1».

Tillegg til vedtaksteksten: «EO-saken for en registrert endringsordre får koden etter LV-U44.
Brevets eget nummer lagres som brevets referanse og vises ved siden av koden. Merket på KOE-sakene
viser koden etter EO-U14.» Forkastet: «Merket viser brevets eget nummer.» Forhold: presiserer
LV-U44 og EO-U14.

**Endret i versjon 4.** Tidspunktet er «når den siste godkjenningen gjøres», som i tillegget fra
valg B (S-7), i stedet for «når den registreres». Konsekvensen for brevet står uttrykkelig.
Merknaden over gjelder den nye formuleringen.

**Valg F, besvart 03.11.** Spørsmålet slik orkestratoren la det fram i oppdraget: et brev som
gjelder flere saker der én er lukket. Alternativene: «F1 (anbefalt): hele registreringen stopper og
sier hvilken sak som er lukket. Brevet legges til som dokumentasjon i sakene det gjelder, og
løsningen registrerer ikke deler av et brev. F2: registreringen gjelder de åpne sakene, og brevet
blir dokumentasjon i den lukkede.» Svaret: «Enig med dine anbefalinger til spørsmålene.»

Tillegg til vedtaksteksten: «Er en av sakene en registrert endringsordre omfatter, lukket når den
siste godkjenningen gjøres, stopper hele registreringen og sier hvilken sak som er lukket. Brevet
legges til som dokumentasjon i sakene det gjelder, og løsningen registrerer ikke deler av et
brev.» Forkastet: «Registreringen gjelder de åpne sakene, og brevet blir dokumentasjon i den
lukkede.» Forhold: presiserer S-2 og EO-U3, og snevrer inn MM-U38: et brev som blir dokumentasjon,
telles ikke i summen. I tråd med OV-U80 («Der skjemaet og dokumentet spriker, er dokumentet partens
meddelelse.»).

*Prøven av arbeidsflyten* (subagent, 03.11) fant at F1 holder, og fant to tillegg. De stod som
oppfølgingsspørsmål O-3.

**Valg F erstattet av R-4, besvart 03.11.** Teksten slik den ble stilt (#1065, 6616942512): «R-4
(erstatter F1): ‹Registreringen gjelder de åpne sakene og viser at brevet også omfatter ‹sak›, som
var lukket. Poster som gjelder den lukkede saken, registreres ikke.›» Svaret: «R4: ja» (#1065,
6616977149).

Vedtakstekst: «Registreringen gjelder de åpne sakene og viser at brevet også omfatter ‹sak›, som
var lukket. Poster som gjelder den lukkede saken, registreres ikke.» Den står i vedtaksteksten
over. Forkastet: F1 over, «Er en av sakene en registrert endringsordre omfatter, lukket når den
siste godkjenningen gjøres, stopper hele registreringen og sier hvilken sak som er lukket. Brevet
legges til som dokumentasjon i sakene det gjelder, og løsningen registrerer ikke deler av et
brev.», og F2, «Registreringen gjelder de åpne sakene, og brevet blir dokumentasjon i den
lukkede.» Forhold: presiserer EO-U3 og snevrer inn MM-U38 (se forholdet over). I tråd med OV-U80 («Der skjemaet og dokumentet
spriker, er dokumentet partens meddelelse.»). O-3 faller bort.

## S-3. Hvordan regnes fullmakten for en endringsordre i en EO-sak?

**Bakgrunn.** Presiseringen av GFK-06 24.09 i vedtaksfila: «GFK-06 presisert: ansvar har ingen
egen verdi, fullmakten regnes per spor. Et spor som besvares i samme brev, har verdien i svaret;
ellers gjelder TEs krav. Et krav som ikke er sendt, krever hele kjeden som et krav som ikke er
tallfestet; et trukket krav er 0. Avslått og frafalt ansvar er 0» Del II A.1.4 har beløpsgrensene for fullmakt per rolle. GFK-U7: «Den siste godkjenningen
sender svaret med det samme.» LV-U15: «Brevet har to signaturer: den som utarbeidet svaret, og den
som godkjente det med fullmakt til svaret.» Teksten i versjon 2 ble ikke stilt.

**Spørsmålet slik det ble stilt.** Lagt fram i modellen 03.11, punkt 6 og 9 i ChatGPTs andre
runde, og som punkt 7 i «Modellen samlet»: «Fullmakten bruker grensene i A.1.4 og kjeden i
GFK-vedtakene.»

**Svaret.** Oppdragsgiver 03.11 om dagens praksis: «Faktisk er det kun EO som må gjennom
fullmaktskjeden.» Til modellen: «Ja, før det inn slik.»

**Forslag til vedtakstekst.** «En endringsordre i en EO-sak går gjennom godkjenningen etter
fullmakten. Verdien regnes per utsagn og summeres for hele utsendingen. Et utsagn som gjelder
flere saker samlet, verdsettes én gang, og verdien dekker kravene i sakene det gjelder. Der
endringsordren ikke svarer på et krav som er sendt, gjelder kravet. Et krav som er sendt, men ikke
er tallfestet, og et utsagn uten samlet beløp, krever hele kjeden. Et krav som ikke er sendt,
krever hele kjeden bare når endringsordren sendes samtidig med svaret på forholdet, eller selv
er svaret på forholdet. Et trukket krav er 0. Et
utsagn som erstatter et bestridt utsagn, verdsettes med det samlede beløpet i tilbudet.
Beløpsgrensene er kontraktens, og kjeden følger vedtakene om godkjenning. Sendes svaret på
forholdet og endringsordren samtidig, godkjennes de samlet, og avvises godkjenningen, sendes
ingen av dem. Den siste godkjenningen sender.»

**Forkastet.**
- «Sender byggherren svaret på forholdet og endringsordren samtidig, godkjennes hvert brev for
  seg, og hvert brev sendes når det er godkjent.»
- «Fullmakten prøves per utsagn for seg mot beløpsgrensene.»

**Forhold.** Endrer presiseringen av GFK-06 24.09: den gjelder en endringsordre i en EO-sak, og
regelen om krav som ikke er sendt, snevres inn. GFK-U2, GFK-U3, GFK-U4, GFK-U6, GFK-U7 og LV-U15
står. Del II A.1.4 gir beløpsgrensene, og GFK-U6 sier hvordan de registreres.

**Valg D, besvart 03.11.** Spørsmålet slik det ble stilt: «D. Kan den med ubegrenset fullmakt
sende alene? Vedtaket 23.09 sier at den som har ubegrenset fullmakt, kan sende alene når beløpet
ikke kan verdsettes. Prosedyren og LV-U15 krever to signaturer. EO-U6, som endret vedtaket 23.09,
er opphevet.» Alternativene: «D1. Ingen sender alene. Endringsordren har alltid to signaturer, som
LV-U15 og prosedyren krever. Det endrer vedtaket 23.09. Anbefalt.» og «D2. Vedtaket 23.09 står.»
Svaret: «D1».

Tillegg til vedtaksteksten: «Ingen sender en endringsordre alene. Den har alltid to signaturer:
den som utarbeidet den, og den som godkjente den med fullmakt (LV-U15), også når beløpet ikke kan
verdsettes.» Forkastet: «Den som har ubegrenset fullmakt, kan sende alene når beløpet ikke kan
verdsettes.» Forhold: endrer vedtaket 23.09 om ubegrenset fullmakt. LV-U15 står.

**Endret i versjon 4.** Vedtaksteksten sier uttrykkelig at et sendt krav som ikke er tallfestet,
og et utsagn uten samlet beløp, for eksempel regningsarbeid, krever hele kjeden. Det følger av
vedtaket 23.09 om GFK-06 («Er kravet ikke tallfestet, kreves hele kjeden»), GFK-U3 og GFK-U20, og
prototypen viser det allerede (steg 10 i BF-06.md). Forholdet for valg D1 er rettet: GFK-U4 sier at
den med ubegrenset fullmakt kan sende alene når dagmulktssatsen mangler, «som for et krav som ikke
er tallfestet». GFK-U4 presiserer vedtaket 23.09, så D1 endrer begge for en endringsordre. Rettet
forhold for D1: «Endrer vedtaket 23.09 om ubegrenset fullmakt og GFK-U4 for en endringsordre i en
EO-sak: den som har ubegrenset fullmakt, sender ikke alene, heller ikke når beløpet ikke kan
verdsettes eller dagmulktssatsen mangler. For svar i KOE-saken står de. GFK-U3 og GFK-U20 står, og
for en endringsordre gjelder GFK-U20 bare med GFK-U3. LV-U15 står.» Vedtaket 23.09 ble endret
10.10 av EO-U6 for en endringsordre som svar på grunnlaget, og EO-U6 ble opphevet 28.10 (punkt 22
i MM-U34), som spørsmålet D sa.

**Endret i versjon 5.** G1 («Hver retting av en endringsordre går gjennom godkjenningen etter
fullmakten.») faller bort med R-3c, så fullmakten gjelder ingen retting. Vedtaksteksten er uendret.

**Merknad.** Regelen om at et krav som ikke er sendt, krever hele kjeden bare når endringsordren
også er svaret på forholdet, og regelen om at et erstattende utsagn verdsettes med det samlede
beløpet, kom fra sparringen og er ikke stilt som eget spørsmål.

## S-4. Stilles spørsmålet om vilkår eller forbehold når byggherren registrerer et svar?

**Bakgrunn.** OV-U69: «Første versjon har ikke et eget spørsmål om vilkår eller forbehold i
byggherrens svar, og ingen egne felt for særskilte vilkår.» OV-U80: «Spørsmålet i OV-U48 og
OV-U49 stilles i svarskjemaet.» KA-U45: «Byggherrens forbehold i et registrert svar fanges etter
OV-U48 og OV-U49.» De to siste viser til vedtak som OV-U69 hadde opphevet. Teksten i versjon 2 ble
ikke stilt.

**Spørsmålet slik det ble stilt.** «S-4 er i praksis avgjort: erklæringen ‹uten forbehold› er
parkert, så spørsmålet om forbehold stilles ikke ved registrering (OV-U69 står).»

**Svaret.** Oppdragsgiver 03.11: «Ja. Enig med dine anbefalinger».

**Forslag til vedtakstekst.** «Spørsmålet om vilkår eller forbehold stilles ikke, heller ikke når
byggherren registrerer korrespondanse som svar eller en endringsordre. Vilkår, forbehold og andre
betingelser skriver parten i begrunnelsen eller i et innlegg.»

**Forkastet.**
- «Spørsmålet om vilkår eller forbehold stilles når byggherren registrerer korrespondanse som
  svar. Svarer byggherren ja, står korrespondansen som dokumentasjon og er ikke et svar.»
  Forhold: endrer OV-U69.

**Forhold.** Endrer OV-U80: setningene «Spørsmålet i OV-U48 og OV-U49 stilles i svarskjemaet.» og
«Svarer byggherren ja, står korrespondansen som dokumentasjon, merket ‹Svaret har forbehold
skjemaet ikke kan uttrykke›.» gjelder ikke. Endrer
KA-U45: setningen om at forbehold i et registrert svar fanges etter OV-U48 og OV-U49, gjelder ikke.
OV-U69 står.

## S-5. Svarer totalentreprenøren på endringsordren som helhet, eller på hvert utsagn?

**Bakgrunn.** EO-U4: «Byggherren reviderer bare en bestridt endringsordre.» EO-U8: «Hvert utsagn
sier hva det er: byggherrens standpunkt, et tilbud eller en gjengivelse av noe som er avtalt.»
HF-U12: «Når den oppfyller § 31.3 første ledd (GR-U13), binder den TE fra den er mottatt (§ 31.3
annet ledd), uten aksept, og den er ikke et tilbud.»

**Spørsmålet slik det ble stilt.** «Skal jeg ta punkt 1 inn som et eget spørsmål S-5 sammen med
de andre?», der punkt 1 var at «TE svarer bare på hvert utsagn».

**Svaret.** Besvart gjennom S-11. Oppdragsgiver 03.11: «I utgangspunktet godtar ikke TE, kun
mottar.»

**Forslag til vedtakstekst.** Ingen. Det som er valgt, står i vedtaksteksten i S-11.

## S-6. Kan et utsagn gjelde flere saker samlet, og er et overslag en egen art?

**Bakgrunn.** EO-U8: «Ved flere KOE-saker summeres ikke dagene uten videre (§ 33.5).» OV-U43 skiller
et tilbud om fast sum fra et krav etter en beregningsregel, og et overslag er en opplysning.

**Spørsmålet slik det ble stilt.** «Skal vederlaget også kunne samles?» med alternativene
«A (anbefalt): Alle spor og poster kan samles, med de tre grensene over. B: Bare fristen og poster
som følger av den, som rigg og drift i forlenget byggetid, kan samles. C: Ingenting samles, og alt
står per sak.»

**Svaret.** Oppdragsgiver 03.11: «A. Legg det inn.» Senere samme dag: «Løsningen utleder ikke
rettsvirkninger. Den registreres. Det kan være at ‹avtalen› er med forbehold, gitt i fritekst.»
Den første av de tre grensene, at avtalt vederlag står for seg, ble da tatt ut.

**Forslag til vedtakstekst.** «Et utsagn i endringsordren gjelder ett spor eller én post i én sak
eller i en gruppe saker, og svarer på kravversjonene i sakene det gjelder. Byggherren kan gi ett utsagn for flere saker. Et samlet utsagn har én
oppgjørsform, og vederlaget samles per post: vederlagsjustering, særskilt vederlagsjustering og
rigg og drift. Totalentreprenøren kan bare godta eller bestride et samlet utsagn samlet. Et
overslag ved regningsarbeid er en opplysning, ikke et tilbud, og det kan ikke godtas. Et utsagn kan avvike fra en
registrert enighet. Skjemaet viser avviket, og løsningen avgjør ikke om endringsordren endrer det
som er avtalt.»

**Forkastet.**
- «Bare fristforlengelsen og poster som følger av den, som rigg og drift i forlenget byggetid,
  kan samles for flere saker.»
- «Hvert utsagn gjelder én sak. Ingenting samles.»

**Forhold.** Utvider EO-U8: et utsagn kan gjelde kravversjonene i flere saker. Utvider KA-U1:
aksepten gjelder et utsagn over flere saker. Utvider OV-U43: et overslag i endringsordren er en
opplysning som ikke kan godtas. Punkt 9 og 23 i MM-U34 står.

**Merknad.** At sakene henger sammen, er byggherrens vurdering og ikke et vilkår løsningen prøver.

**Endret i versjon 4.** «og det kan ikke godtas» er lagt til, så aksepten i S-11 ikke kan gjelde
et overslag. Det utvider OV-U43, der overslaget i prinsipp 2 er totalentreprenørens opplysning
etter punkt 30.2, til et overslag i byggherrens endringsordre. Forholdet er rettet til «Utvider
OV-U43».

**Endret i versjon 5.** «Standarden er ett utsagn per sak og spor.» er flyttet til U-19.

## S-7. Holder et utkast til endringsordre av saken?

**Bakgrunn.** EO-U3: «en KOE-sak inngår i høyst én endringsordre, også når den er bestridt.» Et
utkast er skjermet per team etter sikkerhetsinvarianten for utkast.

**Spørsmålet slik det ble stilt.** Punkt 6 i listen over vedtak på oversiktssiden 03.11: «En sak
‹inngår› i en endringsordre fra den er sendt eller registrert, ikke mens den ligger i et utkast».

**Svaret.** Ikke besvart med egne ord. Lagt til grunn i alle rundene 03.11.

**Forslag til vedtakstekst.** «En KOE-sak inngår i en endringsordre fra endringsordren er sendt
eller registrert, ikke mens den ligger i et utkast. To utkast kan omfatte samme sak. Er saken alt
med i en sendt endringsordre når byggherren sender, stopper sendingen og sier hvilken. Kontrollen
gjøres samlet med sendingen.»

**Forkastet.**
- «En sak som er lagt i et utkast til endringsordre, kan ikke legges i et annet utkast.»

**Forhold.** Presiserer EO-U3.

**Merknad.** Valget er ikke bekreftet med egne ord. Det tas med i den samlede tilslutningen.

**Valg B, besvart 03.11.** Spørsmålet slik det ble stilt: «B. Holder en registrering som venter
på godkjenning, av saken? S-7 sier at et utkast ikke holder av saken. Men en registrering gjelder
et brev som alt er sendt, og den lukker sakene først når den er godkjent.» Alternativene: «B1. Nei.
Den holder ikke av saken, som ellers. Er saken tatt av en annen endringsordre før den siste
godkjenningen, stopper registreringen (S-12). Anbefalt: én regel for alt som venter på
godkjenning.» og «B2. Ja. En registrering som venter på godkjenning, holder av saken.» Svaret:
«B1».

Tillegg til vedtaksteksten: «Verken et utkast, en endringsordre eller en registrering som venter
på godkjenning, holder av saken. Saken inngår i endringsordren fra den er sendt, eller fra
registreringen er godkjent. Er saken tatt av en annen endringsordre før den siste godkjenningen,
stopper sendingen eller registreringen.» Forkastet: «En registrering som venter på godkjenning,
holder av saken.» Forhold: presiserer EO-U3.

## S-8. Er vederlag og frist i endringsordren byggherrens standpunkt eller et tilbud?

**Bakgrunn.** EO-U8: «Hvert utsagn sier hva det er: byggherrens standpunkt, et tilbud eller en
gjengivelse av noe som er avtalt.» Prosedyren sier at byggherren kan gi den fristforlengelsen
byggherren mener er riktig, gjennom endringsordren.

**Spørsmålet slik det ble stilt.** Oppdragsgiver reiste det selv, til påstanden «Prosedyren sier
bare at BH kan gi ‹den fristforlengelse han mener er riktig gjennom EO›. Det er et standpunkt, ikke
et tilbud.» Samtidig ble det spurt: «Følger tilbud om oppgjør fra prosedyre eller dagens word
skjema?» og sagt: «I KOE-sak kan BH kun svare på krav, ikke gi tilbud uoppfordret uten et
eksisterende krav.»

**Svaret.** Oppdragsgiver 03.11: «Nei, det er jo klart et tilbud når det fremgårav EO. Om TE er
uenig sender han KOE og viser til EO.»

**Forslag til vedtakstekst.** «Vederlag og frist i en endringsordre er byggherrens tilbud, eller en gjengivelse av en
registrert enighet. Er
totalentreprenøren uenig, sender totalentreprenøren en ny KOE og viser til endringsordren.
Byggherren gir utsagn om vederlag og frist bare for krav totalentreprenøren har sendt, og ikke
tilbud i et spor uten krav. En endringsordre som ikke omfatter noen KOE-sak, står alene med
vederlag og frist. Et overslag ved regningsarbeid er en opplysning, ikke et tilbud (S-6). En
registrert endringsordre gjengir det brevet sier (S-15).»

**Forkastet.**
- «Byggherren velger for hvert utsagn om det er byggherrens standpunkt eller et tilbud om
  oppgjør.»

**Forhold.** Endrer EO-U8: et utsagn om vederlag eller frist i en endringsordre er et tilbud eller
en gjengivelse, ikke et standpunkt. Endrer OV-U43 prinsipp 5: «Endringsordren skiller mellom
byggherrens standpunkt og en regel partene alt har avtalt». Presiserer HF-U12: pålegget er ikke
et tilbud, men vederlag og frist i endringsordren er det.

**Merknad.** At en endringsordre uten KOE-sak står alene, følger av EO-U8 og svaret om å la
endringsordren omfatte ingen KOE-sak («Ellers enig med deg.»).

**Endret i versjon 4.** De to setningene om overslaget og den registrerte endringsordren er lagt
til som henvisninger til S-6 og S-15. De endrer ikke noe der.

**Endret i versjon 5.** «Skjemaet har ikke noe valg mellom standpunkt og tilbud, og utsagnene har
ingen slik merkelapp.» er flyttet til U-20.

## S-9. Kan en KOE-sak om svikt eller et annet forhold som ikke er en endring, tas med i en endringsordre?

**Bakgrunn.** Punkt 31.3: endringsordren skal gi beskjed om at det kreves en endring, og hva den
går ut på. Punkt 22 i MM-U34: «Sender byggherren en endringsordre i en EO-sak som svar på et
grunnlagskrav, omfatter endringsordren hele KOE-saken og lukker den.»

**Spørsmålet slik det ble stilt.** «S-9. Kan en KOE-sak om svikt eller et annet risikoforhold tas
med i en endringsordre?» med alternativene A: ja, med beskrivelsen av hva endringsordren gjelder,
B: nei, og C: bare i en egen endringsordre uten pålegg.

**Svaret.** Oppdragsgiver 03.11: «EO er altså ikke bare pålegg; det er også erkjennelse av
ansvar. MEN: det innebærer ikke at ansvar for et forhold som ikke er kategorisert som endring blir
erkjent som at dette er en endring da EO utstedes. Det kan godt være en standard forbehold tekst
for slike tilfeller.» Presisert samme dag: «erkjenner kun ansvar innenfor det som følger av EO, og
eventuelt tidligere uttalelser i KOE-sak. Omfanget av dette er opp til partene å tolke. Ingen
erkjennelse av ansvar for nødvendigvis alle TEs påberopelser.» Til forslaget om feltet ved svikt:
«Ja, før det inn slik.»

**Forslag til vedtakstekst.** «En endringsordre formaliserer kravene og er byggherrens instruks og
eventuelt erkjennelse av ansvar, innenfor det som følger av endringsordren og byggherrens tidligere utsagn i
KOE-saken. Den er ikke nødvendigvis en erkjennelse av alt totalentreprenøren har påberopt, og hvor
langt den rekker, er opp til partene å tolke. Omfatter endringsordren en sak der forholdet ikke er
besvart eller er avslått, sier endringsordren uttrykkelig at byggherren er enig i forholdet i
saken, slik endringsordren beskriver og omfatter det. Omfatter den en sak om svikt eller et annet
forhold som ikke er en endring, har brevet en fast tekst: ‹Endringsordren gjelder også ‹sak›, der
totalentreprenøren påberoper ‹forholdet›. For dette forholdet gjelder endringsordren
‹vederlagsjustering og/eller fristforlengelse›. Den innebærer ikke at byggherren mener forholdet er
en endring.› Teksten nevner bare sporene endringsordren har utsagn for i saken. Den ene
beskrivelsen i endringsordren (S-18) beskriver da følgene som gjøres opp, og omfatter
endringsordren både endringer og svikt, beskriver den både pålegget og følgene. En sak som er lukket, fordi den inngår i en sendt
endringsordre eller fordi totalentreprenøren har godtatt avslaget på forholdet eller trukket det,
kan ikke tas med.»

**Forkastet.**
- «En KOE-sak om svikt eller et annet forhold som ikke er en endring, gjøres opp med svar og
  enighet i KOE-saken, uten endringsordre.» Forhold: endrer punkt 20 og 22 i MM-U34, fordi
  saken da aldri lukkes.
- «En KOE-sak om svikt eller et annet forhold som ikke er en endring, kan bare tas med i en egen
  endringsordre uten pålegg.»

**Forhold.** Presiserer punkt 22 i MM-U34 og EO-U3. Snevrer inn punkt 20 i MM-U34: en sak lukket
etter GR-U27 kan ikke tas med. Ordvalget «er enig i forholdet» følger GR-U32. HF-U12 og GR-U13
står, men for en sak om svikt finnes det ikke noe pålegg, så om bindingen etter punkt 31.3 gjelder
den saken, avgjør ikke løsningen. GR-U27 står.

**Endret i versjon 4.** «Er enig i forholdet» er knyttet til forholdet slik endringsordren
beskriver og omfatter det, så bekreftelsen ikke sier mer enn erkjennelsen i første setning. Ordet
følger GR-U32 («nytt ord: ‹er enig i›»). Den faste teksten ved svikt er skrevet etter utkastet
under og nevner bare sporene endringsordren har utsagn for i saken. Teksten er vårt forslag.

**Merknad (versjon 3).** Den faste teksten er ikke skrevet. Utkastet 03.11 var: «Endringsordren gjelder også
KOE-019, der totalentreprenøren påberoper svikt ved byggherrens ytelser. For dette forholdet
gjelder endringsordren vederlagsjustering og fristforlengelse. Den innebærer ikke at byggherren
mener forholdet er en endring.» Oppdragsgiver antok at GR-U27 betydde lukket av en tidligere
endringsordre. GR-U27 gjelder totalentreprenørens aksept av avslaget og trekk av forholdet, og
lukking av en tidligere endringsordre følger av EO-U3. Begge stenger.

## S-10. Hvor følges regningsarbeid opp etter endringsordren?

**Bakgrunn.** Punkt 30.2: totalentreprenøren skal varsle byggherren «dersom det er grunn til å anta
at kostnadsoverslaget vil bli overskredet». Punkt 30.3 har oppgaver og kontroll med frister for
begge. OV-U43: «Etter at behandlingen er ferdig, godtas fortsatt overslag og varsler etter
prinsipp 2 og en endring etter prinsipp 4.» Punkt 19 i MM-U34 tar imot innlegg, dokumentasjon og
innsigelser i en lukket sak.

**Spørsmålet slik det ble stilt.** Først: «S-10. Kan totalentreprenøren sende overslag og varsel
etter punkt 30.2 og 34.4 i en sak som er lukket med endringsordre?» Så: «Holder det at varselet
etter punkt 30.2 sendes som innlegg i den lukkede saken, og at regningsoppgavene legges til som
dokumentasjon?» Til slutt, spørsmål C: «Skal varselet etter punkt 30.2 og regningsoppgavene sendes
som innlegg i EO-saken i stedet for i den lukkede KOE-saken?»

**Svaret.** Oppdragsgiver 03.11: «S-10: Saken er lukket. Hva betyr det? Hva er behovet for at TE
skal kunne sende varsler osv? Det er noe annet med innlegg; det er ikke krav som sådan (da brukes
skjemaene) men dokumentasjon og avklaringer til saken, har jeg tenkt.» Så: «S-10: da er det OK».
Til spørsmål C: «Ja, før det inn slik.»

**Forslag til vedtakstekst.** «Fastsetter endringsordren regningsarbeid, sender
totalentreprenøren overslag, varsel om at overslaget vil bli overskredet, og regningsoppgaver som
innlegg i EO-saken. Byggherrens merknader sendes samme vei. Kostnader over overslaget for samme
arbeid er avregning etter oppgjørsformen. Nytt arbeid eller annen kompensasjon er et krav i en ny
KOE.»

**Forkastet.**
- «Varselet om at overslaget vil bli overskredet sendes som innlegg i den lukkede KOE-saken, og
  regningsoppgavene legges til der som dokumentasjon.»
- «Overslag og varsler tas imot som egne varsler i en sak som er lukket med endringsordre.»

**Forhold.** Presiserer punkt 19 i MM-U34. Snevrer inn OV-U43 prinsipp 2 og 3: overslag og varsler
etter endringsordren sendes som innlegg i EO-saken. MM-U35 står.

## S-11. Hvordan fører totalentreprenøren uenighet med et utsagn, og kan totalentreprenøren godta et utsagn?

**Bakgrunn.** Punkt 31.3: når totalentreprenøren mottar endringsordren, «blir han forpliktet til
å utføre endringsarbeidet». EO-U4: «Byggherren reviderer bare en bestridt endringsordre.» Punkt 19
i MM-U34: «Er TE uenig, sender TE en ny KOE.»

**Spørsmålet slik det ble stilt.** «S-11. Hvordan fører totalentreprenøren uenighet med en post i
endringsordren?» med alternativene A: bare med en ny KOE, uten revisjon, og B: bestridelse i
EO-saken og revisjon. Så: om totalentreprenøren skal kunne godta en post uten forbehold. Så
modellen M1b, der totalentreprenøren ikke godtar. Til slutt «Modellen samlet» med aksept av en
post.

**Svaret.** Oppdragsgiver 03.11: «S-11: A. Det disiplinerer også BH før utsendelse av EO.» Så:
«S-11 presisering: I utgangspunktet godtar ikke TE, kun mottar. Det er byggherrens instruks, evt
erkjennelse av ansvar, ikke noe TE godtar. Om det derimot er gode grunner for at TE godtar
vederlagsjustering og fristforlengelse som angitt, så er jeg likevel åpen for det. Da er det uten
forbehold; ellers tenker jeg KOE-sak er riktig vei.» Til modellen med aksept av en post: «Ja, før
det inn slik.»

**Forslag til vedtakstekst.** «Totalentreprenøren mottar endringsordren. Totalentreprenøren kan
godta et utsagn i EO-saken, og aksepten gjelder hele utsagnet: tilbudet om vederlag,
oppgjørsform eller frist. Et overslag ved regningsarbeid kan ikke godtas, og godtar
totalentreprenøren et utsagn om regningsarbeid, gjør det ikke overslaget til et fast beløp. Det finnes ingen aksept av
endringsordren som helhet, og svaret er frivillig. Fravær av protest er ikke enighet. Løsningen
viser alle registrerte enigheter om samme oppgjør, også en fra KOE-saken som utsagnet avviker
fra, og avgjør ikke hvilken som gjelder. Er totalentreprenøren uenig, eller er et krav ikke
besvart, sender totalentreprenøren en ny KOE fra den lukkede saken, eller en ny KOE når endringsordren ikke
omfatter noen KOE-sak. Den viser til endringsordren
og oppgir om den bestrider et utsagn, gjelder et krav endringsordren ikke svarte på, eller gjelder
noe nytt. Kravet i den nye KOE-en er det samlede kravet for det utsagnet gjelder. Når et utsagn er
bestridt, behandles resten av oppgjøret i den nye KOE-en, og utsagnet kan verken godtas eller
rettes i løsningen. Det er en begrensning i løsningen. Løsningen sier ikke at utsagnet er avslått
eller har falt bort, og avgjør ikke om byggherren fortsatt er bundet av det (MM-U12). Sperren
oppheves bare hvis den nye KOE-en trekkes før den er gjort opp i en ny
endringsordre. Forholdet i den nye KOE-en er ‹endringsordre›, og løsningen utvider ikke
byggherrens tidligere erkjennelse. Endringsordren revideres ikke.»

**Forkastet.**
- «Totalentreprenøren bestrider et utsagn i EO-saken, og byggherren kan revidere endringsordren.
  Revisjonen godkjennes på nytt, og godtatte utsagn står.»
- «Totalentreprenøren mottar endringsordren og godtar ikke utsagn. Uenighet føres i en ny KOE.»
  Forhold: endrer EO-U8.
- «Totalentreprenøren kan godta et utsagn bare når det ikke allerede gjengir en registrert
  enighet uten forbehold, så hvert utsagn har én vei til registrert enighet.»

**Forhold.** Endrer EO-U4: byggherren reviderer ikke endringsordren, og setningene om revisjon og
bestridelse gjelder ikke. At sakene bare endres før utstedelse, står. Endrer EO-U1 og EO-U8:
«TEs aksept av endringsordren omfatter ikke hvert selvstendige utsagn i den» gjelder ikke, fordi
det ikke finnes noen aksept av endringsordren som helhet. Endrer punkt 22 i MM-U34: «Revisjon
følger EO-U4.» gjelder ikke. Presiserer MM-U21: en retting er ikke en revisjon. Presiserer punkt 19
og 21 i MM-U34. KA-U1 og punkt 9 i MM-U34 står. Forholdet «endringsordre» følger KA-U13 og GR-U32.
Versjon 5: «Presiserer MM-U21» gjelder ikke lenger. Forholdet til MM-U21 står under R-3c.

**Merknad.** «Da er det uten forbehold» ble ikke tatt med som erklæring, fordi erklæringen ble
parkert (S-13). Aksepten gjelder hele utsagnet etter KA-U1. Reglene om retting og om at sperren
oppheves når den nye KOE-en trekkes, kom fra sparringen og er ikke stilt som egne spørsmål.

**Valg C, besvart 03.11.** Spørsmålet slik det ble stilt: «C. Kan totalentreprenøren godta et
utsagn som svarer på en eldre kravversjon? KA-U1 avviser aksept av et svar på en tidligere
kravversjon. Hvis endringsordren ble sendt mens en ny kravversjon kom (F-10), kan
totalentreprenøren da ikke godta utsagnet.» Alternativene: «C1. Ja. Saken er lukket, og
endringsordren er det endelige tilbudet. Aksepten gjelder utsagnet slik det står. Det snevrer inn
KA-U1 for endringsordre. Anbefalt: ellers kan en post aldri godtas i det tilfellet.» og «C2. Nei.
KA-U1 står, og totalentreprenøren må sende en ny KOE.» Svaret: «C1».

Tillegg til vedtaksteksten: «Totalentreprenøren kan godta et utsagn i en endringsordre også når
det svarer på en tidligere kravversjon. Aksepten gjelder utsagnet slik det står.» Forkastet:
«Svarer utsagnet på en tidligere kravversjon, avvises aksepten etter KA-U1, og
totalentreprenøren sender en ny KOE.» Forhold: snevrer inn KA-U1 for utsagn i en endringsordre.

**Endret i versjon 4.** Aksepten gjelder tilbudet, og et overslag kan ikke godtas (punkt 1).
Setningen «En retting som øker verdien, går gjennom fullmakten.» er tatt ut. Hvilke rettinger som
går gjennom fullmakten, avgjøres i valg G. «Rent språklige feil behandles enklere», som
sparringen foreslo, er ikke tatt inn, fordi løsningen ikke tolker fritekst (KA-U16). Med valg E1
bestrider bare én KOE et utsagn om gangen, så sperren oppheves når den KOE-en trekkes. Rettingen i
kjeden er oppfølgingsspørsmål O-4.

**Valg E, besvart 03.11.** Spørsmålet slik orkestratoren la det fram i oppdraget: «Hvor mange
KOE-er kan bestride samme utsagn?» Bakgrunnen var eksempelet i sparringen: en post på 600 000 kr
som bestrides i to KOE-er, gjøres opp til 800 000 og 900 000 kr, og gir summen 1 100 000 kr. Alternativene: «E1 (anbefalt): et
utsagn kan bare bestrides av én KOE om gangen som ikke er lukket eller trukket. Kontrollen ved
sendingen sikrer at et utsagn har høyst én direkte etterfølger. E2: flere KOE-er kan bestride
samme utsagn, men utsagnet kan bare erstattes én gang. E1 løser også spørsmålet i punkt 4 om når
sperren oppheves.» Svaret: «Enig med dine anbefalinger til spørsmålene.»

Tillegg til vedtaksteksten: «Et utsagn kan bare bestrides av én KOE om gangen som ikke er lukket
eller trukket. Kontrollen ved sendingen sikrer at et utsagn har høyst én direkte etterfølger.»
Forkastet: «Flere KOE-er kan bestride samme utsagn, men utsagnet kan bare erstattes én gang.»
Forhold: presiserer S-11, S-16 og S-17. Med én KOE om gangen telles differansen mot et utsagn bare
én gang i nøkkeltallet.

*Prøven av arbeidsflyten* (subagent, 03.11) gikk gjennom fem forløp. Det var to team som bestrider
samme post samtidig, et trekk fulgt av en ny KOE, en ny endringsordre som lukker KOE-en uten å
erstatte det bestridte, en samlet post over to saker og et nytt beløp mens KOE-en er åpen. E1 kom
i mål i alle. E2 ga en blindvei, fordi den andre KOE-en aldri kan få et utsagn som erstatter det
bestridte. Prøven fant to tillegg til E1, som står som oppfølgingsspørsmål O-2.

**Valg G, besvart 03.11, falt bort med R-3c.** Spørsmålet slik orkestratoren la det fram i oppdraget: hvilke
rettinger av en endringsordre går gjennom godkjenningen etter fullmakten? Alternativene: «G1
(anbefalt): hver retting av en endringsordre går gjennom godkjenningen etter fullmakten, og nytt
eller endret arbeid krever en ny endringsordre, sagt i skjemaet, uten at løsningen prøver det. G2:
bare en retting som øker verdien, går gjennom fullmakten, som i versjon 3.» Svaret: «Enig med dine
anbefalinger til spørsmålene.»

Tillegg til vedtaksteksten: «Hver retting av en endringsordre går gjennom godkjenningen etter
fullmakten. Nytt eller endret arbeid krever en ny endringsordre. Skjemaet for rettingen sier det,
og løsningen prøver det ikke.» Forkastet: «Bare en retting av en endringsordre som øker verdien,
går gjennom godkjenningen etter fullmakten.» Forhold: presiserer MM-U21 og S-3. LV-U15 og D1 står.

Versjon 5: G1 føres ikke. Med R-3c finnes ingen retting av en endringsordre i løsningen. G1 og G2
står som forkastet under R-3c.

**Valg R-3, besvart 03.11.** Spørsmålet slik det ble stilt, R-3 (S-11 og O-4): «En retting kan
endre beløp, dager, oppgjørsform og teksten, og gi et utsagn for et sendt krav endringsordren ikke
svarte på, men ikke sakene. En retting av teksten gjelder når totalentreprenøren godtar den.
Endret arbeid krever en ny endringsordre.» G1 står. (#1065, 6616942512.) Svaret: «R3 - må vi ha
retting? Eller bedre at BH trekker og utsteder ny?» (#1065, 6616977149). Oppfølgingsspørsmålet ble
stilt i orkestreringsøkta med R-3a, R-3b og R-3c. Svaret: «r3c» (#1065, 6617101997).

Vedtakstekst, R-3c ordrett: «Endringsordren kan ikke rettes i løsningen. En feil til ulempe for
totalentreprenøren rettes ved at totalentreprenøren bestrider utsagnet eller krever i en ny KOE,
og byggherren svarer med et utsagn som erstatter det. En feil til ulempe for byggherren tar
byggherren opp i et innlegg i EO-saken. Løsningen avgjør ikke virkningen, og summen viser det som
ble sendt.»

Forkastet:
- R-3a: «En retting kan endre beløp, dager, oppgjørsform og teksten, og gi et utsagn for et sendt
  krav endringsordren ikke svarte på, men ikke sakene. En retting av teksten gjelder når
  totalentreprenøren godtar den. Endret arbeid krever en ny endringsordre.», med G1: «Hver retting
  av en endringsordre går gjennom godkjenningen etter fullmakten. Nytt eller endret arbeid krever
  en ny endringsordre. Skjemaet for rettingen sier det, og løsningen prøver det ikke.»
- R-3b: «byggherren trekker endringsordren og utsteder en ny». Det er en revisjon, som S-11
  forkaster. Teksten er orkestratorens gjengivelse i 6617101997.
- Fra versjon 4, setningene i S-11: «En feil byggherren oppdager etter sending, rettes etter
  MM-U21. En retting kan endre beløp, dager og feil i teksten, men ikke sakene endringsordren
  omfatter. En retting som er til fordel for begge parter på ulike punkter, gjelder først når
  motparten godtar den, og aksepten gjelder bare rettingen.» Og O-4 (a) under «Endret i
  versjon 4».

Sitat, MM-U21: «En retting i motpartens favør gjelder som en revisjon i motpartens favør, også for
en endringsordre (utvider EO-U9). En retting til avsenderens fordel er et tilbud om å endre det
brevet sa, og den gjelder når motparten godtar den.»

Forhold: snevrer inn MM-U21 for en endringsordre: en endringsordre rettes ikke i løsningen, heller
ikke i motpartens favør. EO-U9 er opphevet 28.10 av punkt 22 i MM-U34, så forholdet til den føres
ikke (se «Samspillet som står åpent», punkt 4). Presiserer S-11: «Endringsordren revideres ikke»
står. Endrer valget G1 og presiseringen 3 i versjon 4, som faller bort. S-17 og R-1 står, og en feil
til ulempe for totalentreprenøren rettes gjennom kjeden. «Summen viser det som ble sendt»
presiserer MM-U38.

**Valg R-1, besvart 03.11.** Spørsmålet slik det ble stilt, R-1 (E1 og O-2): «En endringsordre som
omfatter en KOE som bestrider et utsagn, har et utsagn som erstatter det. Tillegget kan være 0.»
(#1065, 6616942512.) Svaret: «R1 : hva legges i å bestride utsagn? Hva er utsagn? Hvordan vet
appen det?» (#1065, 6616977149). Etter oppfølgingsspørsmålet: «R1: OK. Design vil være sentralt her
slik at det ikke kompliserer unødvendig typisk koe-sak.» (#1065, 6617101997).

Vedtakstekst: «En endringsordre som omfatter en KOE som bestrider et utsagn, har et utsagn som
erstatter det. Tillegget kan være 0.»

Forkastet: O-2 (b), «E1 står uten tilleggene.» Det andre tillegget i O-2 (a), at kontrollen før
sending viser byggherren en ny endringsordre uten et utsagn som erstatter det bestridte, «uten å
stoppe sendingen», er ikke ført. R-1 krever utsagnet. Listen i O-2 (a) er design (U-17).

Forhold: presiserer S-11, E1, S-14 og S-17. Snevrer inn punkt 20 i MM-U34, som sier: «Byggherren
kan la en endringsordre omfatte én eller flere hele KOE-saker, også når løsningen ikke har
registrert enighet.» R-1 legger til et vilkår når en av sakene bestrider et utsagn. Merknaden om designet er U-12 i bestillingen, ikke en
del av vedtaket (#1534).

## S-12. Avvises den siste godkjenningen når noe endres i en av sakene?

**Bakgrunn.** GFK-U7: «Den siste godkjenningen sender svaret med det samme. Kan svaret ikke sendes
fordi kravet er endret etter at svaret ble lagt fram, avvises godkjenningen.»

**Spørsmålet slik det ble stilt.** «S-12. Skal byggherren bekrefte listen over sakene på nytt når
noe endres i en av dem mens endringsordren er til godkjenning?» med A: ja, den siste godkjenningen
avvises, og B: nei, endringen vises for godkjenneren.

**Svaret.** Oppdragsgiver 03.11: «S-12: A Det høres fornuftig ut, uten å være særlig til ulempe for
brukeropplevelsen.»

**Forslag til vedtakstekst.** «Endres noe i en av sakene etter at endringsordren eller
registreringen er lagt fram til godkjenning, ved en ny kravversjon, et trekk, en aksept, en lukking
eller et nytt svar, avvises den siste godkjenningen. Endres noe i en av sakene, bekrefter
byggherren listen på nytt. Endrer byggherren et utsagn, eller endres verdien godkjenningen regnes
av, begynner godkjenningen på nytt. Ellers legges den fram igjen for den siste godkjenneren.
Innlegg og dokumentasjon stopper ikke sendingen. Sendes svaret på forholdet og endringsordren
samtidig, sendes begge eller ingen.»

**Forkastet.**
- «Endringen vises for godkjenneren, som kan sende likevel.» Forhold: endrer GFK-U7.

**Forhold.** Utvider GFK-U7 til en endringsordre i en EO-sak og til registreringen i S-2. Se
valg R-2 under for forholdet i versjon 5.

**Merknad.** At godkjenningen begynner på nytt, kom fra sparringen.

**Valg R-2, besvart 03.11.** Spørsmålet slik det ble stilt, R-2 (S-12): «Endres noe i en av
sakene, bekrefter byggherren listen på nytt. Endrer byggherren et utsagn, eller endres verdien
godkjenningen regnes av, begynner godkjenningen på nytt. Ellers legges den fram igjen for den
siste godkjenneren.» (#1065, 6616942512.) Svaret: «R2 Ja» (#1065, 6616977149).

Vedtaksteksten over er satt sammen av versjon 4 og R-2, uten nye ord: første setning og de to
siste fra versjon 4, og R-2 ordrett i midten. Forkastet: setningen fra versjon 4, «Byggherren ser
endringen, og godkjenningen begynner på nytt.», som R-2 erstatter. Forhold: utvider GFK-U7 til en
endringsordre i en EO-sak og til registreringen, og presiserer GFK-U7 for dem: godkjenningen
begynner bare på nytt når et utsagn eller verdien endres. I versjon 4 var bekreftelsen av listen
et produktvalg. Med R-2 står den i vedtaksteksten.

## S-13. Kan en part erklære «uten forbehold»?

**Bakgrunn.** OV-U69 opphevet spørsmålet om vilkår eller forbehold.

**Spørsmålet slik det ble stilt.** «S-13. Skal en part kunne erklære ‹uten forbehold› i et krav,
et svar eller en aksept?» med A: valgfri erklæring, B: enighet bare med erklæringen, og C: ingen
erklæring.

**Svaret.** Oppdragsgiver 03.11 spurte: «Hva hvis feks en KOE-sak krav/svar har én checkbox for
‹ingen forbehold›, for å kunne registrere enighet (uten st appen sier det sikkert: kan fortsatt
være omstendigheter som gjør avtalen ugyldig eller utsatt for revisjon)». Til A: «Ja, før det inn
slik.» Til modellen der erklæringen er parkert: «Ja, før det inn slik.»

**Forslag til vedtakstekst.** Ingen. Erklæringen er parkert og kan tas opp igjen for KOE-saken hvis
brukerprøven viser behov. OV-U69 står.

## S-14. Hvordan lukkes en KOE som følger opp oppgjøret etter en endringsordre?

**Bakgrunn.** Del II D.1.9: godkjente endringsordrer «skal faktureres separat pr. endringsordre»,
med signert endringsordre fra byggherren. Del II til punkt 27.3 og 39.2 skiller mellom omtvistet og
uomtvistet delfaktura.

**Spørsmålet slik det ble stilt.** «S-14. Hvordan lukkes en KOE som følger opp oppgjøret etter en
endringsordre?» med A: med en ny endringsordre, B: ved registrert enighet om alle kravene, og C:
saken står åpen.

**Svaret.** Oppdragsgiver 03.11: «Ja, før det inn slik.»

**Forslag til vedtakstekst.** «En KOE som følger opp oppgjøret etter en endringsordre, lukkes som
andre KOE-saker, med en endringsordre i en EO-sak.»

**Forkastet.**
- «En KOE som bare følger opp oppgjøret etter en endringsordre, lukkes ved registrert enighet om
  alle kravene i saken.» Forhold: endrer punkt 11 og 20 i MM-U34.
- «En KOE som følger opp oppgjøret etter en endringsordre, står åpen. Status per spor viser
  enigheten.»

**Forhold.** Presiserer EO-U3. Punkt 19–22 i MM-U34 står.

## S-17. Hvordan regnes et utsagn som erstatter et bestridt utsagn?

**Bakgrunn.** MM-U38: «For vederlag er tallene summen av kravene med beløp og summen av vederlaget
i alle sendte endringsordrer i prosjektet, også dem som ikke omfatter en KOE-sak, med fradrag
trukket fra, eks. mva.» Uten en regel for tillegg ville en ny endringsordre som gjør opp en
bestridt post, bli talt i tillegg til den første.

**Spørsmålet slik det ble stilt.** Lagt fram samlet med S-14 som regelen om tillegg med kjeden:
«En post i en endringsordre som gjør opp en KOE som bestrider en tidligere post, erstatter den
posten.», med null og reduksjon, at den siste posten i kjeden gjelder for aksept og bestridelse,
og fullmakten.

**Svaret.** Oppdragsgiver 03.11: «Ja, før det inn slik.»

**Forslag til vedtakstekst.** «Et utsagn i en endringsordre som gjør opp et bestridt utsagn,
erstatter det, og har flere utsagn vært bestridt samlet, erstatter det alle. Utsagnet oppgir det
samlede beløpet i tilbudet og tillegget mot utsagnet eller utsagnene det erstatter direkte.
Tillegget regnes bare når både det nye utsagnet og hvert utsagn det erstatter, har et samlet beløp,
samme omfang og samme oppgjørsform. Ellers erstatter det nye utsagnet det gamle i summen, uten tillegg, og et overslag
brukes ikke som et tidligere fastsatt beløp. Et utsagn har høyst én direkte etterfølger (valg E).
Tillegget kan være 0 eller negativt. En reduksjon endrer ikke en tidligere registrert enighet, men
vises som avvik. Bare det siste utsagnet i kjeden kan godtas eller bestrides, og de tidligere
forblir sperret, også når den nye KOE-en er lukket. Summen av vederlag i sendte endringsordrer
teller tilleggene. Dette er beregningsregler, og de avgjør ikke hva partene rettslig har avtalt.»

**Forkastet.**
- «Et utsagn i en endringsordre som gjør opp et bestridt utsagn, står for seg, og summen teller
  begge.»

**Forhold.** Endrer MM-U38: summen teller tillegget og ikke hele vederlaget i hver sendte
endringsordre, og et erstattet utsagn med overslag telles ikke lenger for seg. Presiserer S-14.
Versjon 5, rettet etter prøven mot vedtaksfila. Før stod «Presiserer MM-U38». S-16 fører samme
forhold.

**Endret i versjon 4.** Setningene om når tillegget regnes, og om én direkte etterfølger, er lagt
til. Den første følger av MM-U38: «endringsordrer uten samlet beløp telles for seg, fordi beløpet
er ukjent og ikke 0». Eksempel: EO-014 har regningsarbeid med overslag 600 000 kr, og EO-015 gir
fast sum 800 000 kr. EO-015 erstatter posten, summen teller 800 000 kr, og posten i EO-014 telles
ikke lenger for seg. Det vises ikke noe tillegg på 200 000 kr. Prøven mot vedtaksfila fant at
S-16 sa at summen alltid teller tillegget. S-16 er rettet til å telle det S-17 sier, som følger av
punktet oppdragsgiver har godtatt. At S-16 krever «samme omfang og oppgjørsform» og S-17 bare
«samme omfang», er oppfølgingsspørsmål O-1.

**Endret i versjon 5, valg O-1.** Spørsmålet slik det ble stilt, O-1 (a) under «Endret i
versjon 4»: «S-17 får også ‹samme oppgjørsform›, så de to reglene regner differansen i de samme
tilfellene.» Svaret: «1 og 2: enig med deg.» (#1065, 6617137907). Vedtaksteksten har fått
«, samme omfang og samme oppgjørsform» i stedet for «og samme omfang». Forkastet: O-1 (b),
«Vilkårene står som de er.» Forhold: S-16 og S-17 regner differansen i de samme tilfellene.

**Merknad.** Regelen om tillegg med kjeden, null og negative tillegg og sperren for tidligere
utsagn kom fra sparringen og ble lagt fram samlet før svaret. Det forkastede alternativet er ikke
stilt som eget alternativ.

## S-15. Kan en registrert endringsordre ha utsagn for krav totalentreprenøren ikke har sendt?

**Bakgrunn.** S-8: byggherren gir utsagn om vederlag og frist bare for krav som er sendt.

**Spørsmålet slik det ble stilt.** «Skal en registrert endringsordre kunne ha poster for spor der
totalentreprenøren ikke har sendt krav?» med «A. Ja. Registreringen gjengir det brevet sier, og
regelen om bare å svare på krav gjelder det som sendes fra løsningen.» og «B. Nei. Beløpet står
bare i dokumentet.»

**Svaret.** Oppdragsgiver 03.11: «Ja. Enig med dine anbefalinger».

**Forslag til vedtakstekst.** «En registrert endringsordre gjengir det brevet sier, også utsagn
om vederlag og frist for krav totalentreprenøren ikke har sendt. Regelen om at byggherren bare
svarer på krav som er sendt, gjelder det som sendes fra løsningen. En registrert endringsordre
telles i summen av vederlag i sendte endringsordrer.»

**Forkastet.**
- «En registrert endringsordre har bare utsagn for krav totalentreprenøren har sendt. Beløp for
  andre spor står bare i dokumentet.»

**Forhold.** Snevrer inn valget i S-8 for registrerte endringsordrer. Presiserer MM-U38 og OV-U80
(«Et valg godtas der den samme handlingen sendt fra løsningen ville vært godtatt»): en registrering
kan ha utsagn som ikke kan sendes fra løsningen.

## S-16. Hvordan teller nøkkeltallene en KOE som bestrider en post i en endringsordre?

**Bakgrunn.** MM-U38: «Hvert kort viser kravene i sakene som ingen sendt endringsordre omfatter,
og endringsordrene, side om side og med samme vekt.» Og: «For vederlag er tallene summen av
kravene med beløp og summen av vederlaget i alle sendte endringsordrer i prosjektet, også dem som
ikke omfatter en KOE-sak, med fradrag trukket fra, eks. mva.» En ny KOE som bestrider en post (S-11),
er ikke omfattet av noen sendt endringsordre før den er gjort opp. Med regelen i dag telles hele
det samlede kravet i den nye KOE-en som krav utenfor endringsordre, samtidig som posten står i
summen av endringsordrene. En post på 600 000 kr og et samlet krav på 800 000 kr gir da 1,4 mill.
kr. Når den nye KOE-en er gjort opp, ville summen av endringsordrene telle både 600 000 kr og
800 000 kr uten regelen om tillegg i S-17.

**Spørsmålet slik det ble stilt.** «S-16. Når en ny KOE bestrider en post i en endringsordre,
teller nøkkeltallet for krav utenfor endringsordre bare differansen mellom kravet og posten, når
kravet har samme omfang og oppgjørsform. Ellers vises kravet for seg, uten at det legges til
summen. Summen av endringsordrene teller tilleggene etter regelen om tillegg. Anbefaling: ja.»

**Svaret.** Oppdragsgiver 03.11: «Ja, skriv seksjonen og S-16 nå». Svaret ba om at spørsmålet
skrives inn. Valget tas med i den samlede tilslutningen.

**Forslag til vedtakstekst.** «Bestrider en KOE et utsagn i en sendt endringsordre, telles kravet i
nøkkeltallet for krav utenfor endringsordrene bare med differansen mellom kravet og utsagnet, når
kravet har samme omfang og oppgjørsform som utsagnet. Ellers vises kravet for seg og legges ikke
til summen. Summen av vederlaget i endringsordrene teller et utsagn som erstatter et
bestridt utsagn, etter S-17: tillegget når det regnes, og ellers det nye utsagnet i stedet for det
erstattede. Tallene er beregninger og avgjør ikke hva partene har
avtalt.»

**Forkastet.**
- «Nøkkeltallet teller hele kravet i en KOE som bestrider et utsagn, som andre krav utenfor
  endringsordrene.»
- «En KOE som bestrider et utsagn, holdes utenfor nøkkeltallene til den er gjort opp i en ny
  endringsordre.»

**Forhold.** Endrer MM-U38. Presiserer S-17. MM-U37 står.

**Merknad.** Sakslisten i Varden er bygget (#1450). Nøkkeltallene for kravene regnes i
`noekkeltall` i `src/lib/components/varden/saksliste.ts`, som hopper over saker som inngår i en
endringsordre. Halvdelen for endringsordrene og fanen for endringsordrene kommer med EO-saken
(#1423). Regelen bygges der.

## S-18. Har endringsordren én beskrivelse av endringen?

**Bakgrunn.** Punkt 31.3: endringsordren skal gi beskjed om at det kreves en endring, og hva den
går ut på. GR-U13 sier hva som skal til for at et brev er en endringsordre etter punkt 31.3.

**Spørsmålet slik det ble stilt.** Skissen hadde ett felt per sak, «Hva endringen i KOE-017 går ut
på».

**Svaret.** Oppdragsgiver 03.11: «Det er en EO. Selv om den samler flere KOEr, tenker jeg disse
blir samlet fordi de har en innbyrdes sammenheng. Da trenger vi kun en endringsbeskrivelse, ikke en
for hver KOE.» Tidligere samme dag: «Under punkt 2: Endringen tenker jeg må beskrives fullt ut. Dette
er byggherrens INSTRUKS. Bør ikke vise til tidligere krav da.»

**Forslag til vedtakstekst.** «En endringsordre har én beskrivelse av endringen, også når den
omfatter flere KOE-saker. Beskrivelsen er byggherrens pålegg, med tilpasningen for svikt i S-9, og beskriver endringen fullt ut uten
å vise til totalentreprenørens krav. Sakene står i brevet som referanser. Avviker beskrivelsen fra
pålegget i kravet eller fra svaret på forholdet, avgjør ikke løsningen hva som gjelder.»

**Forkastet.**
- «En endringsordre har én beskrivelse av endringen for hver KOE-sak den omfatter.»

**Forhold.** Presiserer GR-U13. GR-U14, punkt 23 i MM-U34 og MM-U12 står.

**Endret i versjon 4.** «Med tilpasningen for svikt i S-9» er lagt til, fordi beskrivelsen ved
svikt beskriver følgene som gjøres opp og ikke er et pålegg.

## Samlet forslag

Modellen for oppgjøret etter endringsordren, som vedtakstekstene over gjengir:

1. **Lukking.** En KOE-sak lukkes bare når byggherren sender en endringsordre i en EO-sak som
   omfatter den, eller når en registrert endringsordre som omfatter den, er godkjent, eller når totalentreprenøren godtar avslaget på forholdet eller
   trekker det. Godkjenningen av forholdet lukker ikke saken (S-1, S-2, S-7).
2. **Endringsordren.** Den har én beskrivelse av endringen (S-18) og formaliserer kravene som
   byggherrens instruks og eventuelt erkjennelse av ansvar, innenfor det som følger av den (S-9). Vederlag og frist i
   den er byggherrens tilbud, bare for krav som er sendt (S-8).
3. **Utsagnene.** Ett per sak og spor, eller samlet for flere saker (S-6).
4. **Aksept.** Totalentreprenøren mottar endringsordren og kan godta tilbudet i et utsagn, men
   ikke et overslag. Løsningen viser alle enigheter og avvik og avgjør ikke hvilken som gjelder
   (S-6, S-11).
5. **Ny KOE.** Uenighet og ubesvarte krav går i en ny KOE som oppgir hva den bestrider. Et bestridt
   utsagn kan ikke godtas, og bare én KOE kan bestride det om gangen (E1). Endringsordren
   revideres ikke og kan ikke rettes i løsningen (S-11, R-3c).
6. **Kjeden og tillegget.** Den nye KOE-en lukkes med en ny endringsordre (S-14), der utsagnet
   erstatter det bestridte og oppgir samlet beløp og tillegg. En endringsordre som omfatter den
   nye KOE-en, har et slikt utsagn (R-1). Tillegget regnes bare når begge utsagnene har et samlet
   beløp, samme omfang og samme oppgjørsform (S-17, O-1).
7. **Oversikten.** Beløpet i endringsordren, det som er godtatt, det som er bestridt som
   differanse når det er sammenlignbart, ubesvarte krav og regningsarbeid som avregnes (S-16).
8. **Regningsarbeid.** Overslag, varsler og oppgaver sendes som innlegg i EO-saken (S-10).
9. **Fullmakt.** Per utsagn, summert, med kontraktens beløpsgrenser. Endringer under godkjenningen
   stopper sendingen, og godkjenningen begynner på nytt når et utsagn eller verdien endres (S-3,
   S-12, R-2).
10. **Registrering.** Datoen brevet ble sendt. Den gjelder de åpne sakene, og poster for en
    lukket sak registreres ikke (S-2, R-4, S-15).
11. **Forbehold.** Spørsmålet om forbehold stilles ikke, og erklæringen «uten forbehold» er
    parkert (S-4, S-13).
12. **Saksoversikten.** Fanen for endringsordrene viser aksept og bestridelse per utsagn og
    tillegget, og nøkkeltallene teller et bestridt utsagn som differanse og et tillegg som tillegg
    (S-16, «Saksoversikten» i `BF-06.md`).

## Kontraktsgrunnlaget

Hva kontrakten underbygger, og hva som er løsningens egne valg, står i
[BF-06.md, «Kontraktsgrunnlaget»](BF-06.md#kontraktsgrunnlaget).
