# Spørsmålene i BF-06

Spørsmålene i [bestillingen for BF-06](BF-06.md), med svarene og forslaget til vedtakstekst, etter
[vedtaksskillen](../../../.claude/skills/vedtak/SKILL.md). Vedtakene føres av orkestratoren fra
denne fila.

Versjon 4, 03.11, etter ChatGPTs vurdering av versjon 3 ([sparringen](BF-06-sparring-v3.md)),
prøvd mot vedtaksfila. Versjon 3 er commit `5f5fbd3`. Versjon 1 (commit `eb44f0a`) og versjon 2 (commit `db37c21`) ble ikke stilt.

## Endret i versjon 4

Oppdragsgiver bekrefter bare denne listen. Valgene A1, B1, C1 og D1 og modellen ellers står.

1. **Aksept og overslag (S-6, S-8, S-11).** Aksepten gjelder tilbudet om vederlag, oppgjørsform
   eller frist. Et overslag ved regningsarbeid kan ikke godtas, og enighet om regningsarbeid gjør
   ikke overslaget til et fast beløp. Utvider OV-U43 til byggherrens overslag i endringsordren.
2. **Oppgjørsformen i kjeden (S-17).** Tillegget regnes bare når både det nye og det erstattede
   utsagnet har et samlet beløp, samme omfang og samme oppgjørsform. Ellers erstatter det nye
   utsagnet det gamle i summen, uten tillegg, og et overslag brukes ikke som et fastsatt beløp.
   Følger av MM-U38. S-16 er rettet så summen teller det samme.
3. **Retting (S-11).** «Rent språklige feil behandles enklere» tas ikke inn, fordi løsningen ikke
   tolker fritekst (KA-U16). Bare et utsagn som verken er bestridt eller erstattet, kan rettes. En
   retting er ikke et nytt ledd i kjeden: til byggherrens fordel gjelder den først når
   totalentreprenøren godtar den, og til da kan utsagnet slik det ble sendt, godtas eller
   bestrides. Bestrides det, kan rettingen ikke lenger godtas i løsningen. Det rettede utsagnet
   kan bestrides i en ny KOE. Dette snevrer inn MM-U21 for en endringsordre. Hvordan rettingen
   godkjennes, er valg G.
4. **Tidspunktet for registreringen (S-2).** Sakene må være åpne når den siste godkjenningen gjøres,
   som i S-7. Ellers blir brevet dokumentasjon uten strukturert behandling: ingen aksept, ingen
   kjede og ikke med i summen, som snevrer inn MM-U38. Et brev om flere saker er valg F.
5. **«Er enig i forholdet» (S-9).** Gjelder forholdet slik endringsordren beskriver og omfatter
   det. Den faste teksten ved svikt er skrevet, og den nevner bare sporene endringsordren har
   utsagn for.
6. **Fullmakten (S-3).** Et sendt krav som ikke er tallfestet, og et utsagn uten samlet beløp,
   som regningsarbeid, krever hele kjeden (vedtaket 23.09, GFK-U3). D1 endrer også GFK-U4 for en endringsordre: den med ubegrenset fullmakt sender ikke
   alene når dagmulktssatsen mangler.
7. **Beskrivelsen (S-18).** «Med tilpasningen for svikt i S-9».
8. **Sperren (S-11).** Med E1 kan bare én KOE bestride et utsagn om gangen, så sperren oppheves når
   den KOE-en trekkes.
9. **Henvisninger (S-8).** S-8 viser til S-6 om overslaget og til S-15 om registrerte
   endringsordrer. Det endrer ikke noe der.

Nye valg:

- **E. Hvor mange KOE-er kan bestride samme utsagn?** Anbefalt E1: én om gangen, så utsagnet har
  høyst én direkte etterfølger. TE oppgir for hvert utsagn om KOE-en bestrider det, og BH ser det
  før sending hvis en ny endringsordre lukker KOE-en uten å erstatte utsagnet. E2: flere, men
  utsagnet erstattes bare én gang.
- **F. En registrert endringsordre gjelder flere saker, og én er lukket.** Anbefalt F1: hele
  registreringen stopper, BH legger brevet til som dokumentasjon, og meldingen viser veiene
  videre for de åpne sakene. F2: registreringen gjelder de åpne sakene.
- **G. Hvilke rettinger av en endringsordre går gjennom fullmakten?** Anbefalt G1: hver retting.
  G2: bare en retting som øker verdien, som i versjon 3.

## Grunnlaget for spørsmålene

Versjon 3 ble rettet 03.11 etter prøvingen mot vedtaksfila.
Spørsmålene ble i stedet stilt og besvart i drøftingen med oppdragsgiver 03.11, med sparring med
ChatGPT og en gjennomgang av NS 8407 og konkurransegrunnlaget del II i `khjohns/kontrakt`
(commit `5540b60`). Mange alternativer ble stilt i kortform. Denne versjonen skriver hvert valgt
alternativ ut i vedtaksform, så oppdragsgiver kan se teksten før den blir vedtak.

**Slik svarer du:** «ja» til listen «Endret i versjon 4» og valgene E, F og G, eller rettelser per
punkt. Resten av fila var lagt fram som versjon 3. Ingenting er ført som vedtak.
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
datoen det ble sendt og dokumentkoden i brevet. Skjemaet fylles ut etter det brevet sier. Det
lages ingen brevtekst, og der skjemaet og brevet spriker, er brevet byggherrens meddelelse.
Registreringen går gjennom godkjenningen etter fullmakten og lukker sakene den omfatter når den
er godkjent. Den har datoen brevet ble sendt, men godtas bare når sakene er åpne når den siste
godkjenningen gjøres. Er en sak lukket da, stopper registreringen og sier hvilken sak som er
lukket. Byggherren legger brevet til som dokumentasjon i sakene det gjelder, og løsningen
registrerer ikke deler av et brev (valg F). Brevet får da ingen strukturert behandling: totalentreprenøren kan ikke
godta utsagnene i det, det inngår ikke i en kjede, og det telles ikke i summen av vederlag i
sendte endringsordrer. Kontrollen før registreringen viser kravversjoner som er sendt etter datoen på brevet. Løsningen
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

**Merknad.** Regelen om at registreringen bare godtas når sakene er åpne, er formulert her for
første gang som vedtakstekst. Svaret var tilslutning til anbefalingen.

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

**Valg F. En registrert endringsordre gjelder flere saker, og én av dem er lukket når den siste
godkjenningen gjøres. Stopper hele registreringen?**

*Bakgrunn.* En sak lukkes når den inngår i en sendt endringsordre (EO-U3), eller når
totalentreprenøren godtar avslaget på forholdet eller trekker det (GR-U27). Valg B1 sier at
ingenting som venter på godkjenning, holder av saken. Et brev sendt utenfor løsningen kan derfor
gjelde en sak som er lukket i løsningen før registreringen er godkjent. Registrert i en EO-sak
lukker brevet sakene det omfatter (over), og en sak inngår i høyst én endringsordre (EO-U3).

- **F1. Hele registreringen stopper.** «Er en av sakene en registrert endringsordre omfatter,
  lukket når den siste godkjenningen gjøres, stopper registreringen og sier hvilken sak som er
  lukket. Byggherren legger brevet til som dokumentasjon i sakene det gjelder, og løsningen
  registrerer ikke deler av et brev. De åpne sakene står åpne, og meldingen viser veiene videre:
  byggherren kan registrere brevet som svar på forholdet etter OV-U6 eller sende en endringsordre
  fra løsningen. Meldingen sier at en sak bare fjernes fra skjemaet når brevet ikke omfatter den.»
  Anbefalt: brevet er én
  meddelelse, og en registrering av en del ville vist en endringsordre med et annet omfang enn den
  totalentreprenøren fikk. Det koster byggherren en ny handling for de åpne sakene, og
  totalentreprenøren ser brevet i alle sakene.
- **F2. Registreringen gjelder de åpne sakene.** «Er en av sakene en registrert endringsordre
  omfatter, lukket når den siste godkjenningen gjøres, gjelder registreringen de åpne sakene, og
  brevet legges til som dokumentasjon i den lukkede. Skjemaet viser at registreringen ikke dekker
  hele brevet.»

*Prøven av arbeidsflyten* (subagent, 03.11) fant at F1 holder. Den fant også at det lønner seg å
fjerne den lukkede saken fra skjemaet for å få registreringen gjennom, som er den delregistreringen
F1 forbyr. Løsningen kan ikke prøve det, så meldingen sier når en sak kan fjernes. At byggherren
selv legger brevet til som dokumentasjon, hindrer at en feil i skjemaet legger brevet i feil sak.

*Forhold.* Begge presiserer S-2 og EO-U3. F1 snevrer inn MM-U38 for hele brevet, F2 for den
lukkede saken: det som blir dokumentasjon, telles ikke i summen. F1 er i tråd med OV-U80 («Der skjemaet og dokumentet
spriker, er dokumentet partens meddelelse.»). F2 gir et skjema som bevisst spriker fra brevet.

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
eller i en gruppe saker, og svarer på kravversjonene i sakene det gjelder. Standarden er ett utsagn
per sak og spor. Byggherren kan gi ett utsagn for flere saker. Et samlet utsagn har én
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
registrert endringsordre gjengir det brevet sier (S-15). Skjemaet har ikke noe valg mellom standpunkt og tilbud, og utsagnene har ingen
slik merkelapp.»

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
oppheves bare når KOE-en som bestrider utsagnet, trekkes før den er gjort opp i en ny
endringsordre. Forholdet i den nye KOE-en er ‹endringsordre›, og løsningen utvider ikke
byggherrens tidligere erkjennelse. Endringsordren revideres ikke. En feil byggherren oppdager
etter sending, rettes etter MM-U21. En retting kan endre beløp, dager og feil i teksten, men ikke
sakene endringsordren omfatter, og bare et utsagn som verken er bestridt eller erstattet, kan
rettes. En retting er ikke et nytt ledd i kjeden. En retting til avsenderens fordel gjelder først
når motparten godtar den, og til da kan utsagnet slik det ble sendt, godtas eller bestrides.
Bestrides utsagnet, kan en retting som ikke er godtatt, ikke lenger godtas i løsningen, og
løsningen avgjør ikke om byggherren er bundet av den (MM-U12). En
retting som er til fordel for begge parter på ulike punkter, gjelder først når motparten godtar
den, og aksepten gjelder bare rettingen. Utsagnet slik det er rettet, kan bestrides i en ny KOE som
andre utsagn.»

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
og 21 i MM-U34. Snevrer inn MM-U21 for en endringsordre: bare et utsagn som verken er bestridt
eller erstattet, kan rettes, også i motpartens favør. KA-U1 og punkt 9 i MM-U34 står. Forholdet «endringsordre» følger KA-U13 og GR-U32.

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

**Endret i versjon 4.** Aksepten gjelder tilbudet, og et overslag kan ikke godtas (punkt 1 i
endringslisten). «Rent språklige feil behandles enklere», som sparringen foreslo, er ikke tatt inn:
løsningen tolker ikke fritekst (KA-U16) og kan ikke skille en språklig feil fra en endring i
innholdet. MM-U21 sier alt at en retting er et nytt utsagn med henvisning, og at brevet står
uendret. Setningen «En retting som øker verdien, går gjennom fullmakten.» er tatt ut og står nå som
G2. Prøven av arbeidsflyten fant at en retting til byggherrens fordel ikke kan bli siste ledd i
kjeden før totalentreprenøren har godtatt den. Ellers kunne totalentreprenøren verken godta eller
bestride utsagnet slik det ble sendt, og tapte en posisjon. Setningene om at bare et utsagn som
verken er bestridt eller erstattet, kan rettes, at en retting ikke er et nytt ledd i kjeden, og
at det rettede utsagnet kan bestrides, er lagt til etter det. Prøven mot vedtaksfila fant at en
retting som ikke er godtatt, ble hengende når utsagnet bestrides. Setningen om det er lagt til, og
løsningen avgjør ikke om byggherren er bundet (MM-U12). Sperren er knyttet til KOE-en som
bestrider utsagnet. Forholdet er rettet: å sperre rettingen av et bestridt utsagn, også i
motpartens favør, snevrer inn MM-U21. Om byggherren kan trekke tilbake en retting som ikke er
godtatt, er ikke regulert her. MM-U21 gjelder.

**Valg E. Hvor mange KOE-er kan bestride samme utsagn?**

*Bakgrunn.* S-17 sier at et utsagn som gjør opp et bestridt utsagn, erstatter det, og at summen
teller tillegget. Ingenting hindrer i dag at to KOE-er bestrider samme utsagn og hver blir gjort
opp i en ny endringsordre. Eksempel fra sparringen: en post på 600 000 kr bestrides i to KOE-er.
Den ene gjøres opp til samlet 800 000 kr, tillegg 200 000 kr. Den andre gjøres opp til samlet
900 000 kr, tillegg 300 000 kr mot samme post. Summen blir 1 100 000 kr, selv om oppgjøret for
posten er 800 000 eller 900 000 kr. EO-U3 og S-7 hindrer at samme KOE-sak inngår i to
endringsordrer, men ikke at samme utsagn erstattes to ganger.

- **E1. Én KOE om gangen.** «Et utsagn kan bestrides av bare én KOE om gangen som verken er
  lukket eller trukket. Et samlet utsagn bestrides samlet i én KOE (S-6). Kontrollen gjøres samlet
  med sendingen av KOE-en og sier hvilken KOE som alt bestrider utsagnet. Vil totalentreprenøren
  endre kravet, sender totalentreprenøren en ny kravversjon i den KOE-en. Skjemaet for den nye
  KOE-en lister utsagnene i endringsordren for saken, og totalentreprenøren oppgir for hvert om
  KOE-en bestrider det. Løsningen prøver ikke svaret (MM-U12). Et utsagn har dermed høyst én
  direkte etterfølger, og flere utsagn kan erstattes av ett samlet utsagn. Lukker en ny
  endringsordre den bestridende KOE-en uten et utsagn som erstatter det bestridte, viser kontrollen
  før sending det til byggherren, uten å stoppe sendingen. Utsagnet forblir sperret, og
  totalentreprenøren kan bestride det i en ny KOE.» Anbefalt: det løser forgreningen der den
  oppstår, og det gir sperren i S-11 ett vilkår: den oppheves når den ene KOE-en trekkes. Det
  koster totalentreprenøren at et annet team må bruke KOE-en som finnes. Det koster byggherren
  en ny endringsordre, eventuelt med tillegg 0, hvis totalentreprenøren vil godta et utsagn som
  ble stående sperret, og en ny endringsordre i stedet for en retting når et bestridt utsagn skal
  endres til totalentreprenørens fordel.
- **E2. Flere KOE-er, én erstatning.** «Flere KOE-er kan bestride samme utsagn, men utsagnet kan
  bare erstattes én gang. Kontrollen gjøres samlet med sendingen av endringsordren. Sperren
  oppheves når alle KOE-ene som bestrider utsagnet, er trukket.» Prøven av arbeidsflyten fant en
  blindvei: den andre KOE-en kan aldri få et utsagn som erstatter det bestridte, og nøkkeltallet
  i S-16 teller differansen for hver av dem.

*Forhold.* Begge presiserer S-11 og S-17. E1 presiserer også S-16: med én KOE om gangen telles
differansen mot et utsagn bare én gang. E2 krever i tillegg en regel i S-16 for flere krav mot
samme utsagn. Kontrollen ved sendingen er samme slags kontroll som i S-7 og G-5 i BF-06.md.

*Prøven av arbeidsflyten* (subagent, 03.11) gikk gjennom fem forløp: to team som bestrider samme
post samtidig, et trekk og en ny KOE, en ny endringsordre som ikke erstatter det bestridte, en
samlet post over to saker og et nytt beløp mens KOE-en er åpen. E1 kom i mål i alle, med
varselet og listen over utsagnene som er tatt inn over. Listen er der fordi det ellers lønner seg
for totalentreprenøren å oppgi «gjelder noe nytt» i stedet for å bestride, og så både godta posten
og kreve mer. Løsningen kan ikke prøve svaret, men byggherren ser det og kan avslå.

**Valg G. Hvilke rettinger av en endringsordre går gjennom godkjenningen etter fullmakten?**

*Bakgrunn.* MM-U21: «En retting er et nytt utsagn fra avsenderen, med henvisning til brevet den
retter, og brevet står uendret.» Versjon 3 sa at en retting som øker verdien, går gjennom
fullmakten. En retting i teksten kan endre omfanget eller vilkårene uten å endre beløpet, og
løsningen kan ikke skille en språklig feil fra en endring i innholdet (KA-U16).

- **G1. Hver retting.** «Hver retting av en endringsordre går gjennom godkjenningen etter
  fullmakten, som en endringsordre, og verdien regnes av utsagnene slik de er rettet. Nytt eller
  endret arbeid krever en ny endringsordre. Skjemaet for rettingen sier det, og løsningen prøver
  det ikke.» Anbefalt: godkjenneren har signert det rettingen endrer, også når den reduserer beløpet
  eller bare endrer teksten. Det koster en langsommere retting av en ren skrivefeil.
- **G2. Bare en retting som øker verdien.** «En retting av en endringsordre som øker verdien, går
  gjennom godkjenningen etter fullmakten. Andre rettinger sendes av den som har fullmakt til
  endringsordren.» Som i versjon 3. En endring i teksten uten nytt beløp går da ikke gjennom
  kjeden.

*Forhold.* Begge presiserer MM-U21 og S-3. G1 er i tråd med LV-U15 og D1 (to signaturer).
Prøven av arbeidsflyten (subagent, 03.11) fant at G1 holder, med rettingen i kjeden som er tatt
inn i vedtaksteksten over.

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
eller et nytt svar, avvises den siste godkjenningen. Byggherren ser endringen, og godkjenningen
begynner på nytt. Innlegg og dokumentasjon stopper ikke sendingen. Sendes svaret på forholdet og
endringsordren samtidig, sendes begge eller ingen.»

**Forkastet.**
- «Endringen vises for godkjenneren, som kan sende likevel.» Forhold: endrer GFK-U7.

**Forhold.** Utvider GFK-U7 til en endringsordre i en EO-sak og til registreringen i S-2. At
byggherren bekrefter listen over sakene før sending, er et produktvalg i bestillingen og ikke et
vedtak.

**Merknad.** At godkjenningen begynner på nytt, kom fra sparringen.

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

**Forhold.** Presiserer MM-U38 og S-14.

**Endret i versjon 4.** Setningene om når tillegget regnes, og om én direkte etterfølger, er lagt
til. Den første følger av MM-U38: «endringsordrer uten samlet beløp telles for seg, fordi beløpet
er ukjent og ikke 0». Eksempel: EO-014 har regningsarbeid med overslag 600 000 kr, og EO-015 gir
fast sum 800 000 kr. EO-015 erstatter posten, summen teller 800 000 kr, og posten i EO-014 telles
ikke lenger for seg. Det vises ikke noe tillegg på 200 000 kr. Vilkåret har også «samme
oppgjørsform», som S-16, så de to reglene regner differansen i de samme tilfellene. S-16 er rettet
tilsvarende: summen teller det S-17 sier, ikke alltid tillegget. Prøven mot vedtaksfila fant
motsigelsen.

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
   utsagn kan verken godtas eller rettes, og med det anbefalte valget E1 kan bare én KOE bestride
   det om gangen. Endringsordren revideres ikke, og med det anbefalte valget G1 går hver retting
   gjennom fullmakten (S-11).
6. **Kjeden og tillegget.** Den nye KOE-en lukkes med en ny endringsordre (S-14), der utsagnet
   erstatter det bestridte og oppgir samlet beløp og tillegg. Tillegget regnes bare når begge
   utsagnene har et samlet beløp, samme omfang og samme oppgjørsform (S-17).
7. **Oversikten.** Beløpet i endringsordren, det som er godtatt, det som er bestridt som
   differanse når det er sammenlignbart, ubesvarte krav og regningsarbeid som avregnes (S-16).
8. **Regningsarbeid.** Overslag, varsler og oppgaver sendes som innlegg i EO-saken (S-10).
9. **Fullmakt.** Per utsagn, summert, med kontraktens beløpsgrenser. Endringer under godkjenningen
   stopper sendingen (S-3, S-12).
10. **Registrering.** Samme skjema, datoen brevet ble sendt, og bare når sakene er åpne når den
    siste godkjenningen gjøres. Ellers blir brevet dokumentasjon, med det anbefalte valget F1 for
    hele brevet (S-2, S-15).
11. **Forbehold.** Spørsmålet om forbehold stilles ikke, og erklæringen «uten forbehold» er
    parkert (S-4, S-13).
12. **Saksoversikten.** Fanen for endringsordrene viser aksept og bestridelse per utsagn og
    tillegget, og nøkkeltallene teller et bestridt utsagn som differanse og et tillegg som tillegg
    (S-16, «Saksoversikten» i `BF-06.md`).

## Kontraktsgrunnlaget

Hva kontrakten underbygger, og hva som er løsningens egne valg, står i
[BF-06.md, «Kontraktsgrunnlaget»](BF-06.md#kontraktsgrunnlaget).
