# Vurdering av vedtakene 25.10: samlet vurdering og spørsmål til oppdragsgiver

## Innledning

Dokumentet samler den kritiske gjennomgangen av vedtakene 25.10 og legger fram
spørsmålene den reiser. Det hører til pausen i #1065. Appen er ikke i produksjon og har
ingen reelle data. Dokumentet har ingen alvorlighetsgrad.

- **Kontrollert commit:** `569666b` (`main`, «Merge pull request #1281»), den samme som i
  alle de seks rapportene.
- **Kildene:** de seks rapportene står på hver sin gren og tas ikke inn her.

  | Rapport | Gren | Commit |
  | --- | --- | --- |
  | Del 1: partens utsagn og appens vurdering (A), brevet og visningen (B) | `claude/vurdering-vedtakene-del1` | `1d044a1` |
  | Del 2: enighet og binding (C), grunnlag og kravversjoner (D) | `claude/vurdering-vedtakene-del2` | `50b883f` |
  | Del 3: innsigelser og lag (E), tall og fullmakt (F) | `claude/vurdering-vedtakene-del3` | `a764db2` |
  | Del 4: saken og kontrakten samlet (G), eksterne brev og grensesnitt (H) | `claude/vurdering-vedtakene-del4` | `18284ed` |
  | Verifisering av del 1 og 2 | `claude/vurdering-vedtakene-verifisering1` | `fdc2899` |
  | Verifisering av del 3 og 4 | `claude/vurdering-vedtakene-verifisering2` | `28e2883` |

- **Metoden:** fire økter gikk gjennom hvert sitt område av vedtakene og kjørte forløp i
  kjernen. To uavhengige økter prøvde funnene og spørsmålene med mål om å avkrefte dem.
  Kontraktsteksten i `khjohns/kontrakt` er lest i alle seks; her vises det bare til
  bestemmelsene.

Verifiseringen går foran delrapporten. Et avkreftet funn står bare under avsnitt 5. Et
spørsmål som holdt med endring, står i den endrede formen. Funn-ID-ene er rapportenes
(`VG-<område>-<n>`), ikke hovedplanens.

Belegg: **K** kjørt og observert 25.10 i en av rapportene, **L** lest i kode, **—** ikke
kontrollert.

## 2. Registrering av brev sendt utenfor appen

Oppdragsgiver spurte 25.10 om funksjonen gjør appen vanskeligere, om den trengs, og hvordan
appen skal håndtere brev den ikke kan lese. Verifiseringene merket hvert funn med om
funksjonen er årsaken, og om funnet faller bort hvis registrerte brev bare er dokumentasjon,
uten unntakene i OV-U5 og OV-U6.

### Hvilke funn som kommer av funksjonen

Av 22 funn som ikke er avkreftet, er funksjonen årsak i ett, delvis årsak i sju og ikke årsak
i fjorten. Uten unntakene ville ingen av funnene falt bort. Tellingen viser om funksjonen er
årsak til feilene som ble funnet. Den sier lite om hvor krevende unntakene er å bygge og
vedlikeholde. Begrunnelsen for å beholde dem må derfor være nytten og at appen gjengir
partenes handlinger riktig (se «Hva kontrakten krever»). To ville blitt bredere (VG-E-01 og VG-H-01). Et svar på grunnlaget som er
byggherrens endringsordre etter OV-U6, gir i dag et grunnlagssvar i utledningen og dermed
ikke forbeholdet for ubesvart grunnlag; uten unntaket ville også det svaret gitt forbeholdet.
Det er lest i koden, ikke kjørt. Kommandoen som skriver en slik registrering, er ikke bygget.

| Funn | Funksjonen er årsak | Uten unntakene |
| --- | --- | --- |
| VG-H-03 «motparten har registrert brev» for byggherren | ja | står |
| VG-A-02 skjemateksten etter KA-U19 og OV-U4 | delvis | står |
| VG-B-02 etikettene vises ikke | delvis | står; forløp 5 faller, forløp 1 står |
| VG-B-03 MP-U7 mot senere vedtak | delvis | står |
| VG-D-01 datoen i grunnlagskravet | delvis | står, med svakere sammenlikning |
| VG-E-01 forbeholdet for ubesvart grunnlag | delvis | står, bredere |
| VG-H-01 (duplikat av VG-E-01) | delvis | står, bredere |
| VG-G-04 nøkkeltallene | delvis | står |
| VG-A-01, VG-A-03, VG-B-01, VG-B-04, VG-C-01, VG-C-02, VG-E-02, VG-F-01, VG-F-02, VG-F-03, VG-G-01, VG-G-02, VG-G-03, VG-H-02 | nei | står |

Forbeholdet for ubesvart grunnlag (VG-E-01) oppstår også uten registrering: det treffer hver
gang byggherren har svart utenfor appen. I TS-ruta i dag kan byggherren ikke svare på
grunnlaget i appen (#818), så hvert vederlagssvar får forbeholdet.

### Gjeldende vedtak og åpne issues

- **Grunnregelen:** et registrert brev er dokumentasjon, og appen utleder ingenting av det
  (OV-U4). Den som registrerer, oppgir sporene eller saken, datoen og en kort beskrivelse
  (OV-U16). Retting og feil sak følger OV-U17 og OV-U18. Saken og kravet viser brevene med
  merknaden «Appen vurderer ikke innholdet» (OV-U19, OV-U20, OV-U21).
- **Unntak 1:** TE kan oppgi datoen for sitt eget varsel, eller for et krav TE også har sendt
  utenfor appen, i et brev fra appen med dokumentet som vedlegg (OV-U5). Byggherren tar
  stilling til rettidigheten med datoen som premiss. En feil dato rettes etter OV-U11.
- **Unntak 2:** byggherren kan registrere sin egen endringsordre som svar på grunnlaget, og
  den gir en godkjenning (OV-U6), bare som svar på et krav sendt fra appen (OV-U12), og
  uten senere avklaring av § 31.3 i første versjon (OV-U13).
- **Eldre vedtak endret av OV-U4:** MM-U17 (appens vurdering ved registreringen fryses) og
  MM-U19 (et registrert brev som strider mot en enighet, får ingen virkning) gjelder nå bare
  det som ikke er dokumentasjon.
- **Bygget:** registreringen som dokumentasjon i kjernen, varselet etter § 33.4, § 34.1.2 og
  § 34.1.3, lesingen av en endringsordre etter OV-U6, og visningen etter OV-U20 og OV-U21.
- **Ikke bygget:** registreringsskjemaet i klienten (#807), en registrering av et vilkårlig
  brev med innhold appen ikke kan sende (#1045), en registrert forespørsel etter § 33.6.2
  (#1119), varselet etter § 32.2 og datoen for et krav sendt utenfor appen (OV-U5), kommandoen
  etter OV-U6, og OV-U11, OV-U12 og OV-U41.

### Hva kontrakten krever, og hva som er appens valg

**Etter kontrakten (O):** § 5 første ledd krever at varsler, krav og svar er skriftlige og
sendt til partenes representanter eller avtalte adresser, og e-post til avtalt adresse regnes
som skriftlig. Etter annet ledd regnes også et varsel eller krav i et møtereferat etter § 4.2
som skriftlig. Bestemmelsen binder ikke partene til appen. Et varsel sendt på e-post, i et
referat eller i et brev
utenfor appen er like gyldig som et sendt fra appen, og preklusjon etter § 32.2, § 33.4,
§ 34.1.2 og § 34.1.3 avhenger av når varselet faktisk ble sendt. Appen kan derfor ikke
hindre korrespondanse utenfor seg, og den kan ikke behandle et varsel den ikke kjenner som
et varsel som ikke finnes.

**Det som følger av det, uansett hvordan funksjonen bygges (T):**

- Appen må vise hva vurderingen bygger på, og ikke framstille sin oversikt som fullstendig.
  Det er grunnen til «Alle krav sendt i appen er avgjort» (OV-U10), og det er det VG-E-01
  mangler.
- TE må kunne gjøre gjeldende at et varsel ble sendt utenfor appen, før byggherren tar
  stilling til rettidigheten. Ellers viser saken et første varsel som kan være feil, og
  visningen påstår mer enn appen vet (HF-U13). OV-U5 dekker det. Datoen oppgis i et brev fra
  appen, og appen leser ikke vedlegget. Unntaket er altså et utsagn sendt fra appen, ikke en
  lesing av et eksternt brev.

**Appens valg (A):**

- Å ta imot andre eksterne brev som dokumentasjon (OV-U4, OV-U16–OV-U21). Det gir begge
  partene ett sted å se korrespondansen, og det er veien MM-U2, MM-U25, OV-U7 og LV-U16 viser
  til når noe må sendes utenfor appen.
- At byggherrens endringsordre kan registreres som svar på grunnlaget (OV-U6). Det gjengir
  en handling byggherren alt har gjort. En ny godkjenning fra appen er en annen handling, med
  en ny dato og et uklart forhold til den opprinnelige ordren.
- Om registratoren skal fylle ut innholdet med virkning. OV-U4 valgte det bort i første
  versjon.

**Hvordan appen håndterer et brev den ikke kan lese:** den leser det ikke. Det er OV-U4. Det
oppdragsgiver beskriver, at appen ikke kan tolke et brev som ikke er fylt inn gjennom
skjemaet, er grunnen til at OV-U4 ble valgt 13.10, og funnene viser ikke at appen i dag
forsøker å tolke brevene. Problemene som finnes, er tekster som sier mer enn appen vet
(VG-E-01, VG-H-03), og de rettes i ordlyden. Skillet som bærer funksjonen, går mellom å
oppbevare et brev og å la en part gi en uttrykkelig, strukturert opplysning som appen
bruker. Et vedlegg alene endrer ikke saken. Unntakene i OV-U5 og OV-U6 er slike opplysninger.

Alternativene er prøvd mot vedtaksfila i spørsmål 1.

## 3. Spørsmålene til oppdragsgiver

Spørsmålene berører rettsreglene og stilles i tekst. Oppdragsgiver kan svare «ja» til
anbefalingene eller rette enkeltpunkter. Det valgte alternativet blir vedtaksteksten ordrett,
og et forkastet blir «Forkastet» ordrett. Svarene føres i en egen vedtaks-PR. Spørsmål 1
står først fordi svaret kan gjøre andre overflødige. Det står ved hvert spørsmål.

### Spørsmål 1. Brev sendt utenfor appen

- **Bakgrunn:** Avsnitt 2. Kort sagt: partene kan sende varsler og krav utenfor appen, og det
  gjør de. Appen leser ikke slike brev (OV-U4), med to unntak: TEs opplysning om datoen for et
  varsel eller krav sendt utenfor appen (OV-U5), og byggherrens endringsordre registrert som
  svar på grunnlaget (OV-U6). Funksjonen er årsak i ett av 22 funn og delvis i sju. Uten
  unntakene ville ingen funn falt bort.
- **Belegg:** NS 8407 § 5 om skriftlige meldinger, preklusjonsbestemmelsene i § 32.2, § 33.4,
  § 34.1.2 og § 34.1.3, og § 31.3. Vedtakene OV-U4–OV-U6, OV-U11–OV-U13, OV-U16–OV-U21,
  MM-U17, MM-U19, HF-U13, GR-U12 og GR-U13.
- **Alternativene:**
  - **A (anbefalt):** «Et brev sendt utenfor appen og registrert i den er dokumentasjon, som i
    OV-U4. Appen leser det ikke. Unntakene i OV-U5 og OV-U6 står. Alt appen sier om
    korrespondansen i saken, gjelder det som er sendt i appen. Bekrefter OV-U4–OV-U6 og
    vedtakene som presiserer dem.»
    Strider ikke mot noe vedtak.
  - **B:** «Et brev sendt utenfor appen og registrert i den er alltid dokumentasjon. TE kan ikke
    oppgi datoen for et varsel eller krav sendt utenfor appen som premiss for byggherrens svar,
    og byggherren kan ikke registrere en endringsordre som svar på grunnlaget. Opphever
    unntakene i OV-U5 og OV-U6.»
    Opphever OV-U6 (B er det OV-U6 forkastet) og unntaket i OV-U5, og endrer MM-U1, MM-U8,
    VS-U7, VS-U16, VS-U28, KT-U6, HF-U13 og OV-U3. OV-U9, OV-U11, OV-U12, OV-U13 og delen av
    OV-U41 om brev utenfor appen faller bort. Følgen: TE kan ikke gjøre gjeldende i appen at et
    varsel ble sendt i tide utenfor appen, og saken viser det første kravet fra appen som det
    første varselet, også når det er feil etter kontrakten. Det strider mot HF-U13 («visningen
    påstår ikke mer enn appen vet»).
  - **C:** «Den som registrerer et brev sendt utenfor appen, fyller ut de samme opplysningene
    som i skjemaet i appen: krav, svar, aksept, varsel og trekk. Registreringen får samme
    virkning som et utsagn sendt fra appen, merket som registratorens lesing av brevet. Brevet er
    fortsatt det autoritative uttrykket for partens standpunkt. Hver side registrerer bare sine
    egne brev. Opphever det OV-U4 forkastet, og endrer OV-U4.»
    Krever at merkingen av forbehold og sperrene etter KA-U16, KA-U20 og KA-U26 bygges, som
    OV-U7 utsatte, ellers har et forbehold i et registrert brev ingen form. Endrer OV-U10,
    OV-U16, OV-U19, OV-U21, HF-U4, HF-U13, VS-U23 og VS-U27, og opphever OV-U12; OV-U5 og
    OV-U6 blir regelen. Byggherrens registrerte svar må gå gjennom fullmakten (OV-U6). Det er
    mest arbeid, og registratorens lesing styrer utledningen.
  - **D:** «Appen tar ikke imot brev sendt utenfor appen. En part kan sette en merknad på saken
    eller sporet om at det finnes korrespondanse utenfor appen, og appen viser merknaden uten å
    lese noe av den. Opphever OV-U4, OV-U6 og vedtakene som presiserer dem.»
    Endrer OV-U1, OV-U3, OV-U7, MM-U2, MM-U25, VS-U23, VS-U27, VS-U28, LV-U16 og KA-U35, som
    alle viser til registrering når noe må sendes utenfor appen. OV-U12, OV-U13,
    OV-U16–OV-U21, LV-U11, MM-U17 og MM-U19 faller bort. OV-U5 kan stå bare hvis TE kan legge
    det eksterne varselet ved brevet fra appen der datoen oppgis; ellers gjelder følgene i B
    også her. Partene mister stedet der begge ser korrespondansen.
  - **E:** «Som A, men byggherren kan ikke registrere en endringsordre sendt utenfor appen som
    svar på grunnlaget. Byggherren godkjenner grunnlaget fra appen, og i underkategoriene der
    § 32.2 gjelder, er godkjenningen da en endringsordre (GR-U12, GR-U13). Endringsordren kan
    registreres som dokumentasjon. Opphever OV-U6, OV-U12 og OV-U13.»
    Endrer leddene om registrert korrespondanse i GR-U12, GR-U13 og KA-U14. Fjerner det ene
    unntaket som gir et registrert brev virkning. Men å registrere en endringsordre som alt er
    sendt, og å sende en ny godkjenning, er forskjellige handlinger. En ny godkjenning har en
    annen dato og kan gjøre forholdet til den opprinnelige ordren uklart. Til byggherren kan
    svare på grunnlaget i appen (#818), finnes det heller ingen vei til en godkjenning av
    grunnlaget i appen. E er en mulig avgrensning, ikke en forenkling uten tap.
- **Anbefaling:** A. Appen forsøker ikke å tolke brevene, og feilene som finnes, er tekster som
  sier mer enn appen vet. De rettes i ordlyden (spørsmål 2 og 9). Unntakene beholdes for
  nytten: uten OV-U5 kan TE ikke bevare et varsel sendt utenfor appen i saken, og OV-U6 gjengir
  en endringsordre byggherren alt har utstedt, i stedet for å kreve en ny handling.
- **Hva valget styrer:** registreringsskjemaet (#807, #1045, #1119), om byggherren kan
  godkjenne grunnlaget med en endringsordre fra utenfor appen, og om TE kan bevare et varsel
  sendt utenfor appen.
- **Virkning på de andre spørsmålene:** Ved D faller spørsmål 9 bort, og ordlyden i spørsmål 8
  endres. Ved C blir spørsmål 2 smalere, spørsmål 4 må stilles på nytt for registrerte brev, og
  spørsmål 8 og 9 endres. B og E endrer ikke de andre spørsmålene.
- **Svar 25.10 (oppdragsgiver):** A, med en presisering etter sparring i økta. Spørsmål 2–9
  står derfor som de er. Oppdragsgiver ordrett:
  - «**Jeg anbefaler A, men med en presisering av hva som gir opplysningene virkning i
    appen.** […] Det viktige skillet er mellom **å oppbevare et brev** og **å la en part avgi
    en strukturert opplysning som appen bruker**. Et vedlegg alene bør ikke endre sakens
    status. Men parten må kunne gjøre et eksternt varsel eller en ekstern endringsordre
    relevant for behandlingen i appen.»
  - «**Antallet funn sier lite om funksjonens kompleksitet.** […] Begrunnelsen for å beholde
    dem bør være nytten og en korrekt gjengivelse av partenes handlinger.»
  - «E er et mulig avgrensningsvalg, men jeg synes dokumentet undervurderer forskjellen mellom
    å registrere en tidligere handling og å foreta en ny.»
  - Til ordlyden under: «Ja, jeg er enig i ordlyden og at dette føres som en **presisering**,
    med grunnlag i vedtakene du har kontrollert.»
  - Om OV-U6: «Jeg mente ikke at byggherren skal kunne velge en annen kravversjon.
    Registreringen skal fortsatt gjelde gjeldende grunnlagskrav sendt fra appen, etter OV-U6
    og OV-U12. Poenget mitt var å bevare skillet mellom registreringen av en tidligere
    endringsordre og en ny godkjenning, ikke å utvide hvilke krav registreringen kan
    besvare.»

  **Vedtaksteksten** (oppdragsgivers forslag med tre justeringer fra økta, godkjent 25.10):

  > Et brev sendt utenfor appen og registrert i den er dokumentasjon. Appen utleder ingen
  > standpunkt, enighet, sperre eller uavklart utfall av innholdet (OV-U4). OV-U5 og OV-U6
  > står, med vedtakene som presiserer dem. Virkningen bygger på partens uttrykkelige,
  > strukturerte opplysninger etter de vedtakene, ikke på appens lesing av vedlegget. Appen
  > skiller mellom dokumentasjon, partens opplysninger og det appen utleder, og viser hva
  > vurderingen bygger på. Verken appens utledning eller den registrerte korrespondansen
  > framstilles som en fullstendig oversikt over partenes rettsstilling. Bekrefter
  > OV-U4–OV-U6. Presiserer OV-U4 og HF-U13.

  Justeringene var: (1) «gir ikke i seg selv grunnlag for appens utledning» ble til opplistingen
  i OV-U4, fordi at et brev er registrert, styrer visningen etter OV-U19–OV-U21; (2) «med
  vedtakene som presiserer dem» ble lagt til; (3) siste setning gjelder også appens egen
  utledning. Forkastet: B, C, D og E slik de står over. Svaret føres i vedtaksregisteret i en
  egen vedtaks-PR.

### Spørsmål 2. Forbeholdet når grunnlaget ikke er besvart i appen (VG-E-01, VG-H-01)

- **Bakgrunn:** Når byggherren svarer på vederlag eller frist mens grunnlaget ikke er besvart,
  sier brevet: «Byggherren har ennå ikke svart på grunnlaget i TEs krav i brev <n> av <dato>.»
  (GR-U26). Har byggherren svart utenfor appen, med eller uten registrering, sier byggherrens
  eget brev da noe som ikke stemmer, og byggherren er bundet av det hen sender fra appen. Utveien
  GR-U26 gir, å svare på grunnlaget i samme brev, finnes ikke i TS-ruta i dag (#818), så hvert
  vederlagssvar får setningen. I underkategoriene der § 32.2 gjelder, kan TE også lese
  setningen som at byggherren ikke har svart etter § 32.3 annet ledd (vår vurdering, ikke prøvd).
  En endringsordre registrert etter OV-U6 som svar på gjeldende kravversjon er et grunnlagssvar,
  og da kommer forbeholdet ikke (L, `forbeholdForGrunnlaget` i `kjerne/frosset/brevtekst.ts`).
- **Belegg:** § 5 annet ledd, § 32.3 annet ledd. GR-U23, GR-U26, OV-U4, OV-U6, OV-U10 og HF-U13.
- **Alternativene:**
  - **A:** «Når byggherren svarer på vederlag eller frist mens gjeldende versjon av
    grunnlaget ikke er besvart i appen, sier brevet: ‹Byggherren har ikke svart i appen på
    grunnlaget i TEs krav i brev <n> av <dato>. Standpunktene nedenfor gjelder under
    forutsetning av at grunnlaget for kravet foreligger.› Appen avgjør ikke om et brev sendt
    utenfor appen er et svar på grunnlaget. Endrer ordlyden i GR-U26. I tråd med OV-U4 og
    OV-U10.»
  - **B:** «Har byggherren registrert et brev sendt utenfor appen i grunnlagssporet etter TEs
    gjeldende krav om grunnlaget, viser forbeholdet til brevet: ‹Byggherren har sendt brev om
    grunnlaget utenfor appen <dato>. Standpunktene nedenfor gjelder under forutsetning av at
    grunnlaget for kravet foreligger.› Appen vurderer ikke innholdet. Endrer GR-U26 og OV-U4.»
    B lar sporet og datoen registratoren oppga, styre en låst setning, og treffer ikke et svar
    utenfor appen som ikke er registrert.
  - **C:** «Teksten i GR-U26 står.»
  - **D (anbefalt):** «Når byggherren svarer på vederlag eller frist mens gjeldende versjon av
    grunnlaget ikke er besvart i appen og grunnlaget ikke er avklart ved frafall (GR-U23),
    spør skjemaet: ‹Har du allerede svart utenfor appen på grunnlaget i TEs krav i brev <n> av
    <dato>?› Brevnummeret og datoen er kravets. Svaret er obligatorisk. Svarer byggherren nei,
    sier brevet som i dag: ‹Byggherren har ennå ikke svart på grunnlaget i TEs krav i brev <n>
    av <dato>. Standpunktene nedenfor gjelder under forutsetning av at grunnlaget for kravet
    foreligger.› Setningen er byggherrens egen opplysning; appen kontrollerer den ikke. Svarer
    byggherren ja, oppgir byggherren et registrert dokument, eller dokumenttypen (brev, e-post
    eller annet dokument), datoen og en kort identifikasjon. Valget av dokumenttype sier ikke
    noe om formkravet i § 5. Brevet sier da: ‹For byggherrens standpunkt til grunnlaget i TEs
    krav i brev <n> av <dato> vises det til byggherrens <dokumenttype> av <dato>. Standpunktene
    nedenfor gjelder under forutsetning av at grunnlaget for kravet foreligger. Henvisningen og
    forbeholdet endrer ikke byggherrens tidligere meddelte standpunkt til grunnlaget.›
    Henvisningen gjelder gjeldende versjon av grunnlaget og følger ikke med en ny versjon. Den
    gir ikke i seg selv et grunnlagssvar, en godkjenning eller et avslag i appens utledning, og
    vederlag og frist er fortsatt betinget av grunnlaget etter GR-U7 og GR-U26. Endrer ordlyden
    i GR-U26 og utvider det. I tråd med OV-U4, OV-U10, HF-U13 og vedtaket om brev sendt
    utenfor appen 25.10 (spørsmål 1).»
- **Anbefaling:** D. Det obligatoriske valget gjør «ennå ikke svart» til byggherrens
  uttrykkelige opplysning, og henvisningen gjør brevet riktig når svaret finnes utenfor appen.
  Forbeholdet står i begge tilfeller, så brevet og utledningen stemmer overens. A gjør setningen
  sann, men lar et kontraktsbrev si noe om appen i stedet for om byggherrens handling. Valget
  verifiserer ikke at opplysningen er riktig; det plasserer ansvaret for den hos byggherren.
- **Hva valget styrer:** den låste forbeholdsteksten i hvert vederlags- og fristsvar, og ved D
  et nytt valg i svarskjemaet. Regelverket og brevteksten endres, så regelversjonen økes.
- **Avhenger av spørsmål 1:** nei.
- **Svar 25.10 (oppdragsgiver):** D, med rettelsene fra sparringen, sammen med 2b-A.
  Oppdragsgiver ordrett:
  - «Ja, jeg anbefaler D i spørsmål 2, med rettelsene vi har gjennomgått, sammen med 2b-A.»
  - «D: BH viser til et tidligere svar. Henvisningen gir ikke i seg selv et strukturert
    grunnlagssvar i løsningen. Brevet presiserer at henvisningen og forbeholdet ikke endrer BHs
    tidligere meddelte standpunkt.»
  - «2b-A: BH bekrefter uttrykkelig det tidligere standpunktet gjennom den vanlige svarflyten.
    Bekreftelsen er et nytt utsagn som løsningen bygger utledningen på.»
  - «BH kan la henvisningen stå uten å bekrefte. Bekreftelse skal heller ikke kreve en
    tidligere henvisning etter D; dokumentet kan oppgis i selve bekreftelsen.»

  Forkastet: A, B og C slik de står. Etter svaret er setningen «Bekreftelsen krever ingen
  tidligere henvisning, og en henvisning kan stå uten en bekreftelse.» lagt inn i 2b-A. Svaret
  føres i vedtaksregisteret i en egen vedtaks-PR.
- **Sparring 25.10:** oppdragsgiver foreslo at byggherren kan krysse av og vise til et tidligere
  svar, og ba om at det som skjer etter henvisningen, løses nå (spørsmål 2b). D og 2b er
  utformet i sparring mellom økta, oppdragsgiver og en annen modell. Oppdragsgiver sluttet seg
  til denne vurderingen fra sparringen, ordrett:
  - «Før dette inn som forslag i PR #1282, med én rettelse om datoen og en tydeligere
    språkregel. Det er ikke et endelig vedtak om D eller 2b.»
  - «Skillet mellom henvisning, bekreftelse og nytt standpunkt er nå tydelig. Det er også
    riktig at en henvisning uten registrert innhold ikke kan behandles som en kjent ekstern
    godkjenning. Begrensningen må fremgå uten at oversikten fremstiller det nye svaret som
    rettslig overordnet det tidligere.»
  - «Behold ‹avsluttet utenfor løsningen› som eget avklaringspunkt. Og siden fristsetningen
    ikke beskriver noen eksisterende beregning, bør den fjernes; før videre fristbehandling som
    en uttrykkelig avgrensning eller et åpent spørsmål.»

  Språkregelen fra sparringen, om ordet «appen» i vedtak, skjema og brev, føres i en egen PR
  (oppdragsgiver 25.10). Alternativene her bruker derfor ordene i vedtaksfila i dag.

### Spørsmål 2b. Når byggherren senere bekrefter et svar gitt utenfor appen

- **Bakgrunn:** En henvisning etter D løser brevteksten, men ikke hvordan saken kommer videre.
  Grunnlaget er fortsatt ubesvart i appen, og saken kan ikke regnes som avgjort før grunnlaget
  er avklart (GR-U7, OV-U3). Har byggherren svart utenfor appen, og er svaret ikke en
  endringsordre som kan registreres etter OV-U6, er den eneste veien i dag et nytt svar fra
  appen. Det tvinger fram en ny meddelelse om et standpunkt byggherren alt har meddelt, med en
  ny dato. Velger byggherren et annet standpunkt enn det eksterne svaret, kan appen ikke se
  det, fordi en henvisning ikke har innhold.
- **Belegg:** § 5 tredje ledd, § 31.3, § 32.3. GR-U1, GR-U7, GR-U10, GR-U12, GR-U13, GR-U26,
  OV-U3–OV-U7, OV-U12, OV-U13, KA-U16, KA-U19, LV-U7, MM-U12 og vedtaket om spørsmål 1.
- **Alternativene:**
  - **A (anbefalt):** «Byggherren kan svare på gjeldende versjon av grunnlaget ved å bekrefte et
    svar gitt utenfor appen på den versjonen. Byggherren oppgir dokumentet som ved henvisningen
    etter GR-U26: et registrert dokument, eller dokumenttypen, datoen og en kort identifikasjon.
    Bekreftelsen krever ingen tidligere henvisning, og en henvisning kan stå uten en
    bekreftelse. Byggherren velger standpunktet som i et svar fra appen. At standpunktet samsvarer med det
    tidligere svaret, er byggherrens opplysning. Brevet sier: ‹Byggherren bekrefter sitt svar
    på grunnlaget i TEs krav i brev <n> av <dato>, gitt i <dokumenttype> av <dato>: …›, og ved
    påberopt preklusjon: ‹Byggherren bekrefter at hen i <dokumenttype> av <dato> gjorde
    gjeldende at …›. Bekreftelsen er et nytt utsagn i et brev fra appen. Den går gjennom
    fullmakten og brevkontrollen, og appens utledning bygger på standpunktet byggherren
    bekrefter. Skjemaet spør om det tidligere svaret hadde et forbehold eller vilkår som
    standpunktene ikke kan uttrykke. Svarer byggherren ja, kan svaret ikke bekreftes.
    Byggherren kan i stedet velge å gi et nytt svar etter reglene nedenfor. Henvisningen til
    det tidligere svaret kan stå uten en bekreftelse. Kontrollene ved sending
    gjelder bekreftelsen. De avgjør ikke om det tidligere svaret oppfylte kravene til
    endringsordre eller fullmakt, eller hva det bandt partene til. Etter LV-U7 regner appen
    akseptfristen fra sendingen av bekreftelsen, og bindingen ved bekreftelsen likeså. Det er
    appens beregning; den avgjør ikke når byggherren rettslig ble bundet, verken av
    bekreftelsen eller av det tidligere svaret. Har byggherren allerede gjort en påberopelse
    gjeldende utenfor appen, må rettidigheten vurderes ut fra den tidligere meddelelsen;
    bekreftelsen dokumenterer byggherrens opplysning om dette, men fastslår ikke at
    påberopelsen ble fremsatt eller var rettidig. Appen registrerer datoen for bekreftelsen og
    byggherrens opplysning om datoen for det eksterne svaret hver for seg, og bekreftelsen
    innebærer ikke at andre frister starter på nytt. Godkjenner byggherren grunnlaget uten
    påberopt preklusjon i en underkategori der § 32.2 gjelder, oppgir byggherren om det
    tidligere svaret var en endringsordre etter § 31.3. Opplysningen er byggherrens, ikke en
    klassifisering appen har fastslått. Var det en endringsordre, avvises bekreftelsen med
    beskjed om å registrere endringsordren etter OV-U6. Var det ikke det, utsteder byggherren nå
    en endringsordre: skjemaet og brevet sier det uttrykkelig, brevet har teksten GR-U13 krever,
    og det kalles ikke en bekreftelse (GR-U12, GR-U13). Viser det tidligere svaret til et krav
    som bare er registrert som dokumentasjon, avvises bekreftelsen som etter OV-U12. Har
    byggherren vist til et svar utenfor appen og gir i stedet et nytt svar, velger byggherren
    det uttrykkelig, skjemaet sier at byggherren kan være bundet av det tidligere svaret, og
    brevet sier at byggherren tidligere viste til <dokumenttype> av <dato>. Visningen viser
    henvisningen sammen med det nye svaret, sier at utledningen bygger på svaret i appen og at
    det tidligere dokumentet ikke er tolket, og framstiller ikke det nye svaret som rettslig
    overordnet det tidligere. Bekreftelsen er en ny vei for å gi et svar utenfor appen virkning
    i utledningen, og den følger ikke av OV-U5 og OV-U6. Utvider GR-U26 og vedtaket om brev
    sendt utenfor appen 25.10 (spørsmål 1). Presiserer GR-U12, GR-U13, OV-U12, OV-U13, KA-U19
    og HF-U13, og anvender LV-U7. I tråd med OV-U4 og MM-U12.»
  - **B:** «Et svar gitt utenfor appen gir et svar på grunnlaget i appen bare når det er en
    endringsordre registrert etter OV-U6, med vilkårene i OV-U12. Ellers svarer byggherren på
    grunnlaget fra appen som et nytt svar, og byggherren kan i begrunnelsen vise til det
    tidligere svaret. Bekrefter OV-U4 og OV-U6.»
- **Anbefaling:** A, som forslag og som en ny vei som må besluttes uttrykkelig. Et forbehold
  som ikke kan uttrykkes, gjør at svaret ikke kan bekreftes. Å bekrefte avgrensede deler av
  svaret holdes utenfor, som en avgrensning av produktet. Byggherren kan bekrefte et tidligere
  meddelt standpunkt, med uttrykkelig henvisning til det tidligere svaret, og appen får et
  uttrykkelig, strukturert standpunkt å bygge på, uten å lese det eksterne dokumentet.
  Virkningen av bekreftelsen gjelder appens utledning; den sier ikke at det eksterne svaret
  var uten rettsvirkning før bekreftelsen. 2b-A kan vedtas og bygges uten beregning av
  kontraktsfristene etter § 32.3 og § 5 tredje ledd. Før slik beregning innføres, må relevante
  hendelser og tidspunkter avklares særskilt. Bekreftelsen starter ikke i seg selv disse
  fristene på nytt.
- **Hva valget styrer:** grunnlagsskjemaet, brevteksten for en bekreftelse og visningen av en
  henvisning ved siden av et nytt svar. Regelverket og brevteksten endres.
- **Avhenger av:** spørsmål 2, alternativ D, for at henvisningen finnes. A krever ingen
  henvisning; bekreftelsen oppgir da dokumentet selv. A gir et svar utenfor appen virkning i utledningen
  gjennom et brev fra appen, og det må vurderes mot svaret på spørsmål 1, som sier at
  virkningen bygger på opplysninger etter OV-U5 og OV-U6.
- **Merknader fra oppdragsgiver 25.10**, tatt inn i A, ordrett:
  - «En bekreftelse som selv blir en endringsordre, er også en ny handling. […] skjema og brev
    må uttrykkelig si at BH nå utsteder en endringsordre. Det bør ikke skjules under
    betegnelsen ‹bekreftelse›. Valget om det tidligere svaret var en endringsordre er BHs
    opplysning, ikke en klassifisering løsningen har fastslått.»
  - «Forbehold som ikke følger med, kan endre standpunktets innhold. […] Da må BH enten
    bekrefte uttrykkelig avgrensede deler eller gi et nytt standpunkt.»
  - «Formuleringen om at ‹bindingen … regnes fra sendingen› bør dessuten være tydelig
    avgrenset til LV-U7s modell. En intern regel avgjør ikke alene når BH rettslig blir bundet.
    Akseptfrist og binding er også forskjellige spørsmål.»
  - «Jeg støtter at 2b-A beskrives som en ny, uttrykkelig besluttet vei, fremfor som noe som
    allerede følger av OV-U5 og OV-U6. […] godkjenner derfor ikke den endelige vedtaksteksten
    ennå.»
  - Til de tre rettelsene i begrunnelsen, valget av nytt svar og fristavsnittet, som er tatt
    inn: «Tilslutningen til rettelsene er ikke en endelig godkjenning av 2b-A; det åpne
    fristspørsmålet står fortsatt.»
- **Svar 25.10 (oppdragsgiver):** A, slik teksten står. Fristspørsmålet står åpent for en senere
  fristberegning og hindrer ikke at bekreftelsesordningen vedtas. Oppdragsgiver ordrett:
  - «Ja til 2b-A slik teksten nå er gjengitt. Fristspørsmålet kan stå åpent for senere
    fristberegning, uten å hindre at bekreftelsesordningen vedtas. Jeg vil dermed justere min
    tidligere reservasjon om at hele 2b-A måtte vente.»
  - «Kontraktens ordlyd: § 32.3 knytter svarplikten til mottatt varsel og begrunnelsesplikten
    til avslaget. Den oppstiller ingen egen regel om at en senere bekreftelse starter disse
    fristene på nytt.»
  - «Praksis: LH-2016-96291 illustrerer at også innsigelsen om at byggherren svarte for sent,
    må fremsettes rettidig etter § 5 tredje ledd. Avgjørelsen løser ikke spørsmålet om senere
    bekreftelser, men viser hvorfor de opprinnelige meddelelsene må beholdes som relevante
    hendelser.»
  - «Bekreftelsesordningen trenger ikke avgjøre fristspørsmålene. Det holder at den ikke
    nullstiller frister, fremstiller bekreftelsesdatoen som den opprinnelige svardatoen eller
    avgjør om det tidligere svaret var rettidig.»
  - «LV-U7 beholdes som den uttrykkelig avgrensede modellen dere beskriver, ikke som en
    generell rettsregel om binding.»

  Anbefalingen er rettet etter svaret. Forkastet: B slik den står. Avgjørelsen LH-2016-96291 er
  oppdragsgivers kilde og ikke lest i økta. Svaret føres i vedtaksregisteret i en egen
  vedtaks-PR.
- **Åpne avklaringspunkter, uten anbefaling.** Ingen av dem hindrer at A vedtas:
  1. **Fristene.** Kjernen regner i dag ingen frist fra datoen for byggherrens svar (L, søk i
     `kjerne/regler/` og `kjerne/utledning/`). Identifiserte fristspørsmål, ikke en uttømmende
     liste: svar uten ugrunnet opphold etter § 32.3 annet ledd (påberopelsen er utsatt, VS-U3
     og OV-U7), begrunnelse av avslag etter § 32.3 tredje ledd, og påberopelse etter § 5
     tredje ledd av at et varsel eller svar kom for sent, også TEs påberopelse av at
     byggherren svarte for sent. For selve bekreftelsen regner appen akseptfristen og
     bindingen etter LV-U7; det er appens beregning, ikke en avgjørelse av når byggherren
     rettslig ble bundet. Før løsningen beregner noen av de nevnte kontraktsfristene etter
     § 32.3 og § 5 tredje ledd, må det avklares hvilken hendelse fristen regnes fra når
     svaret er bekreftet. Til da viser appen ingen dato som en sikker
     kontraktsfrist.
  2. **Saken er avsluttet utenfor appen.** Har partene gjort opp hele saken utenfor appen,
     løser en bekreftelse bare grunnlaget. Om saken skal kunne avsluttes administrativt, merket
     at oppgjøret ikke er utledet i appen, avgjøres særskilt og innføres ikke gjennom
     henvisningen.

### Spørsmål 3. «Forbeholdene» når byggherren godkjenner hele det krevde beløpet (VG-B-01, VG-C-01)

- **Bakgrunn:** Når byggherren godkjenner oppgjør som fast sum, sier brevet «Byggherren
  godkjenner oppgjør som fast sum med beløpet og forbeholdene som fremgår av svaret», også når
  hele beløpet er godkjent (LV-U32). Tilfellet ble lagt fram 24.10 (forkastet alternativ B i
  LV-U32), og svaret sa: «Den faste teksten beskriver hva BH godkjenner, uten å erklære aksept
  av hele tilbudet på grunnlag av beløpet alene. Den fungerer også med subsidiære standpunkter
  og forbeholdet etter GR-U26.» Godkjenner byggherren hele beløpet uten noe slikt, regner
  løsningen partene som enige (GR-U7), men brevet peker likevel mot et forbehold.
  Skriver byggherren et vilkår i begrunnelsen, sier brevet «forbeholdene» mens visningen sier
  «partene er enige» og «Alle krav sendt i appen er avgjort» (K, forløp 10 i del 1). Etter
  § 34.2.2 første ledd gjelder unntaket fra beregningsreglene når tilbudet er akseptert, og
  samme beløp er ikke alene nok dersom svaret samtidig endrer tilbudets vilkår. Etter
  avtaleloven § 6 første ledd er en avvikende aksept som hovedregel avslag og nytt tilbud;
  annet ledd har et unntak, som gjelder at den som svarer, mener at svaret stemmer med
  tilbudet, at tilbyderen må forstå det, og at tilbyderen ikke sier fra uten ugrunnet opphold.
  Det avgjørende er avviket i innhold, ikke om ordet «forbehold» brukes. HF-U7 sier om annet
  ledd: «Om et avvik er så lite at det likevel blir avtale (avtaleloven § 6 annet ledd),
  avgjør ikke appen (MM-U12).» Det er ikke en presis gjengivelse av annet ledd, og det
  avklares særskilt (#1284). Spørsmål 3 og 3b bygger ikke på at avvikets størrelse alene avgjør om
  avtale er inngått. Skjemateksten om at løsningen ikke tolker begrunnelsen, er vedtatt (KA-U19, OV-U4)
  og står i avsnitt 4. Spørsmålet gjelder den faste setningen. Et vilkår i utdypningen står i
  brevet uansett hva setningen sier; forskjellen mellom brevet og det løsningen registrerer,
  er spørsmål 3b.
- **Belegg:** § 34.2.2 første ledd, avtaleloven § 6. LV-U31, LV-U32, GR-U7, GR-U8, HF-U7,
  KA-U16, KA-U19, OV-U4.
- **Alternativene:**
  - **A (anbefalt):** «Godkjenner byggherren oppgjør som fast sum i et svar som etter
    løsningens regler gir sammenfall med kravet (GR-U7), og er svaret ikke gitt under forbeholdet for ubesvart grunnlag
    (GR-U26), sier brevet: ‹Byggherren godkjenner oppgjør som fast sum med beløpet som fremgår
    av svaret.› Ellers gjelder LV-U32.
    Endringen gjelder bare den faste setningen. Den endrer ikke hvordan utdypningen behandles
    eller når løsningen registrerer enighet (GR-U7, KA-U16), og den fastslår ikke at svaret er uten
    forbehold. Endrer LV-U32.»
  - **B:** «Som i dag (LV-U32).»
  - **C:** «Setningen står som LV-U32 sier. Har byggherren skrevet en begrunnelse til en full
    godkjenning, regnes svaret ikke som sammenfall, og TE må godta det. Endrer GR-U7, GR-U10 og
    HF-U7 for svar fra løsningen, og strider mot KA-U16, KA-U19, KA-U26, GR-U8 og GR-U26, som
    da også må endres.»
- **Anbefaling:** A, sammen med spørsmål 3b. A snur en setning som ble vedtatt 24.10, for det
  tilfellet der svaret gir sammenfall. Vilkåret er knyttet til sammenfall og ikke til beløpet,
  fordi et svar med samme beløp ikke gir sammenfall når en begrensning etter § 34.1.3 står i et
  lag (HF-U7). A er en tekstendring: brevet viser ikke til
  forbehold som kanskje ikke finnes, og sier heller ikke uttrykkelig at hele tilbudet er
  akseptert. Den løser ikke at et vilkår i utdypningen kan avvike fra tilbudet. Alene gjør A
  brevet noe svakere i det tilfellet, fordi «forbeholdene» i det minste viser leseren til
  resten av svaret; derfor anbefales A sammen med 3b. C tolker ikke begrunnelsen, men bruker
  at det finnes tekst, som en sperre mot sammenfall. C frarådes likevel: en ren forklaring,
  som «Beløpet er kontrollert mot tilbudet», ville da kreve TEs aksept uten at svaret avviker,
  og C gjør det KA-U16 forkastet, at et svar med forbehold ikke gir sammenfall.
- **Hva valget styrer:** den faste setningen i vederlagssvaret når svaret gir sammenfall.
  Brevteksten fryses med brevet, så både regelversjonen og projeksjonsversjonen økes.
- **Avhenger av:** spørsmål 3b, som anbefales vedtatt sammen med A. Ikke av spørsmål 1.
- **Svar 25.10 (oppdragsgiver):** A, sammen med 3b-A. Oppdragsgiver ordrett: «Ja», til
  anbefalingen «Spørsmål 3: A, sammen med 3b.» Forkastet: B og C slik de står. Svaret føres i
  vedtaksregisteret i en egen vedtaks-PR.
- **Sparring 25.10:** forslaget er rettet etter to runder med andre modeller. Sparringen er
  ikke oppdragsgivers svar, og alternativene står åpne. Ordrett:
  - «Jeg støtter A som en avgrenset retting av brevteksten, men ikke begrunnelsen om at den
    løser problemet med forbehold i utdypningen. Det er to forskjellige spørsmål.»
  - «Å fjerne ‹og forbeholdene› fra den faste setningen fjerner ikke vilkåret fra brevet.
    Løsningen kan fortsatt registrere sammenfall etter sin modell, mens brevet inneholder et
    mulig avvik fra tilbudet.»
  - «Rett kritikken av C: C tolker ikke innholdet i begrunnelsen. Den bruker at tekst finnes
    som en sperre mot automatisk sammenfall.»
  - «3-A kan stå som foreslått. Jeg er enig i å behandle det sammen med 3b.»

### Spørsmål 3b. Vilkår i et svar som godkjenner hele kravet

- **Bakgrunn:** TE krever 100 000 kroner. Byggherren godkjenner 100 000 kroner og skriver i
  utdypningen: «Dette forutsetter at TE frafaller fristkravet.» Løsningen registrerer
  sammenfall (GR-U7), mens brevet kan være et avslag og nytt tilbud etter avtaleloven § 6
  første ledd. Løsningen tolker ikke utdypningen (KA-U16), og et forbehold valgene ikke kan
  uttrykke, skal sendes utenfor løsningen og registreres (KA-U19, OV-U4). I dag står det bare
  som fast tekst i skjemaet (avsnitt 4, punkt 2). Svaret på spørsmål 2b bruker samme mønster
  for en bekreftelse: byggherren opplyser selv om det tidligere svaret hadde et forbehold eller
  vilkår som standpunktene ikke kan uttrykke.
- **Belegg:** avtaleloven § 6, § 34.2.2 første ledd. GR-U7, GR-U10, HF-U7, KA-U16, KA-U19,
  KA-U26, OV-U4, MM-U12 og svaret på spørsmål 2b.
- **Alternativene:**
  - **A (anbefalt):** «Gir byggherrens svar etter løsningens regler ellers sammenfall med
    kravet i et spor (GR-U7, GR-U10), opplyser byggherren før sending om godkjenningen er
    avhengig av vilkår eller forbehold som ikke kan uttrykkes med valgene i skjemaet.
    Opplysningen gis for hvert spor der svaret ellers gir sammenfall, også når et forbehold
    gjelder flere spor. Skjemaet spør: ‹Er godkjenningen avhengig av andre vilkår eller
    forbehold enn dem som uttrykkes gjennom valgene du har gjort og den faste brevteksten?›
    Veiledningen sier: ‹Forbeholdet for ubesvart grunnlag og forbeholdene som uttrykkes i
    lagene i svaret, omfattes ikke av spørsmålet.› Spørsmålet har ingen forhåndsvalg.
    Sendingen avvises når opplysningen mangler, og når byggherren svarer ja. Byggherren kan
    endre svaret dersom standpunktet da kan uttrykkes korrekt med valgene i skjemaet, eller
    sende svaret utenfor løsningen og registrere det (KA-U19). Registrering som dokumentasjon
    etter OV-U4 gir ikke i seg selv et nytt utledet standpunkt; hva løsningen utleder for
    sporet, følger de øvrige reglene. Registrerer byggherren en endringsordre som svar på
    grunnlaget etter OV-U6, spør skjemaet: ‹Inneholder endringsordren vilkår eller forbehold
    som begrenser godkjenningen av grunnlaget, og som ikke uttrykkes gjennom valgene du har
    gjort i registreringen?› Ved ja kan dokumentet ikke registreres som svar på grunnlaget
    etter OV-U6. Det kan fortsatt registreres som dokumentasjon etter OV-U4. At endringsordren
    lar vederlag eller frist stå uavklart, omfattes ikke av spørsmålet. Et vilkår om vederlag
    eller frist omfattes likevel dersom det gjør godkjenningen av grunnlaget betinget. Sperren avgjør ikke dokumentets
    rettslige virkning. Opplysningen er byggherrens og lagres med sendingen eller
    registreringen, atskilt fra den utledede virkningen. Den gjelder den svarversjonen som
    sendes eller registreres. Den er ikke en del av brevet og framstilles ikke som en
    erklæring meddelt TE. Løsningen kontrollerer ikke opplysningen mot utdypningen eller
    dokumentet og tolker ikke teksten. Står det likevel et vilkår i utdypningen, er brevet det
    autoritative uttrykket for byggherrens standpunkt (B-03). Sammenfallet er da løsningens
    utledning av valgene og avgjør ikke om partene rettslig er enige (MM-U12). Utvider KA-U19
    og OV-U6. I tråd med KA-U16, HF-U7 og OV-U4.»
  - **B:** «Som i dag: skjemaet sier fast at løsningen beregner virkningen ut fra valgene
    (KA-U19), uten et eget spørsmål.»
  - **C:** «Svarer byggherren ja, kan svaret sendes, men det gir ikke sammenfall. Det regnes
    som avslag i forening med nytt tilbud, som TE må godta (HF-U7). Endrer KA-U16, KA-U26,
    GR-U7, GR-U8 og GR-U10.»
- **Anbefaling:** A. Verken NS 8407 eller avtaleloven krever dette spørsmålet. Det er et valg
  i produktet for å minske avstanden mellom svaret byggherren mener å gi, og det løsningen
  registrerer. Byggherren opplyser selv om begrensningen, og løsningen tolker ikke
  utdypningen. A er en ny sendesperre, ikke bare en presisering av skjemateksten i KA-U19.
  Avgrensningen til svar som ellers gir sammenfall, reduserer risikoen der enigheten
  registreres uten en handling fra TE. Den løser ikke alle tilfeller: godtar TE et delvis svar,
  registreres enighet om de strukturerte verdiene, mens et vilkår i utdypningen kan gjelde et
  annet spor. C frarådes: den gjør hvert ja til et betinget tilbud, mens løsningen ikke ser
  hvilket spor vilkåret gjelder, og den gjør det KA-U16 forkastet. Registreringen etter OV-U6
  er tatt med fordi den også gir sammenfall; ellers ville et svar sendt utenfor løsningen og
  registrert som endringsordre gå rundt sperren. Der gjelder spørsmålet bare vilkår som
  begrenser godkjenningen av grunnlaget, fordi en endringsordre kan avklare grunnlaget mens
  vederlag og frist er uavklart. Et uriktig nei, eller TEs aksept av et delvis svar, kan
  fortsatt gi forskjell mellom brevet og det løsningen registrerer. Det er en uttrykkelig
  avgrensning, ikke noe sperren løser.
- **Hva valget styrer:** et obligatorisk valg i svarskjemaet når svaret ellers gir sammenfall,
  i alle spor, og i registreringen etter OV-U6, med en sperre som serveren håndhever. Bare et
  nei lagres, som byggherrens utsagn; et ja hindrer sendingen eller registreringen. Serveren kontrollerer at
  opplysningen finnes og ikke er ja, men ikke om den er riktig. Regelverket endres, så
  regelversjonen økes, og projeksjonsversjonen også hvis opplysningen fryses med brevet.
- **Føringer for utformingen:**
  - Spørsmålet i 2b-A gjelder det tidligere svaret, og 3b gjelder svaret som sendes nå. Ved en
    bekreftelse kan skjemaet samle dem i ett spørsmål bare med en ordlyd som dekker begge.
    Svaret på det ene besvarer ikke automatisk det andre.
  - Visningen viser ikke opplysningen til TE som en del av brevet.
  - Opplysningen gis når svaret utarbeides, og følger svaret gjennom godkjenningen etter
    fullmakten (GFK-06), så den som godkjenner, ser den. Endres svaret etterpå, gis
    opplysningen på nytt og følger fullmaktsflyten for den nye versjonen.
- **Avhenger av:** spørsmål 3, som anbefales vedtatt sammen med A, og svaret på spørsmål 2b
  for føringen. Ikke av spørsmål 1.
- **Svar 25.10 (oppdragsgiver):** A, med utvidelsen til OV-U6 og avgrensningen av vilkår om
  vederlag og frist fra den siste kontrollen. Oppdragsgiver ordrett: «Ja», til anbefalingen
  «Spørsmål 3b: A, med utvidelsen til OV-U6 og avgrensningen over.» Forkastet: B og C slik de
  står. Føringene for utformingen føres som arbeidsvalg i byggeissuet. Svaret føres i
  vedtaksregisteret i en egen vedtaks-PR.
- **Prøvd mot vedtaksfila 25.10** av en subagent. Ingen alternativ strider mot et vedtak som
  ikke er nevnt. Prøvingen ga disse rettelsene i 3 og 3b: vilkåret i 3-A knyttes til
  sammenfall, svaret 24.10 siteres ordrett, listene over vedtak som C endrer, er utvidet,
  spørsmålet i 3b-A holder forbeholdet for ubesvart grunnlag og lagene utenfor, OV-U4 og
  registreringen etter OV-U6 er tatt med, og begge versjonene økes når brevteksten endres.
- **Kvalitetssikring 25.10** av den andre modellen i sparringen. Rettelsene er tatt inn:
  sammenfall «etter løsningens regler», spørsmålet viser til valgene byggherren har gjort, et
  eget spørsmål ved registrering etter OV-U6 som bare gjelder grunnlaget og ikke sperrer
  registrering som dokumentasjon, «sporet står ubesvart» er erstattet, og opplysningen gjelder
  svarversjonen. Merknaden om HF-U7 og avtaleloven § 6 annet ledd står i spørsmål 3. Ordrett:
  - «Ja som produktvalg, men med en egen ordlyd og en avgrenset sperre. Her registreres et
    allerede sendt dokument.»
  - «Det viktigste er at kontrollen av en ekstern endringsordre gjelder om dokumentet kan
    representeres som grunnlagsgodkjenning, uten å sperre vanlig dokumentregistrering eller
    kreve at beløp og frist også er avklart.»
  - «Med disse rettelsene mener jeg 3-A og 3b-A er godt nok avgrenset til å legges fram som
    anbefalte alternativer.»
- **Siste kontroll 25.10** av samme modell, på commit `89a97b8`: setningen om vederlag og
  frist i registreringen etter OV-U6 var for vid og er byttet. Sperren følger byggherrens
  opplysning om grunnlagsgodkjenningen; løsningen vurderer fortsatt ikke pris og tid i
  endringsordren (OV-U6). Ordrett:
  - «Jeg anbefaler 3-A og 3b-A, inkludert utvidelsen til OV-U6, med én siste presisering.»
  - «Med denne rettelsen har jeg ingen flere merknader. […] Anbefalingen gjelder
    produktvalget; den innebærer ingen vurdering av det enkelte dokumentets rettsvirkning.»
  3b-A er ikke det KA-U19 utsatte, et varsel styrt av ord i utdypningen.
- **Sparring 25.10:** spørsmålet kom fra sparringen om spørsmål 3. Fem rettelser fra andre
  runde er tatt inn: opplysningen er byggherrens, sperren håndheves på serveren, byggherren
  ledes ikke til et misvisende standpunkt, de to spørsmålene holdes atskilt, og A beskrives som
  en utvidelse. Sparringen er ikke oppdragsgivers svar. Ordrett:
  - «Den underliggende risikoen bør stå som et eget avklaringspunkt: Hvordan skal løsningen
    håndtere at BH uttrykkelig oppgir vilkår som de strukturerte standpunktene ikke kan
    uttrykke? […] Det krever ikke at løsningen tolker fritekst; BH kan selv opplyse om slike
    vilkår finnes.»
  - «Ikke led BH til å velge et misvisende standpunkt. […] BH skal ikke redusere beløpet eller
    velge avslag bare for å komme forbi sperren.»
  - «Verken NS 8407 eller avtaleloven krever akkurat dette kontrollspørsmålet. Det er et
    produktvalg for å redusere avstanden mellom partens tilsiktede svar og det løsningen
    registrerer. Jeg støtter A fremfor automatisk å klassifisere ethvert ‹ja› som avslag og
    nytt tilbud etter C.»
  - «Alternativene bør fortsatt stå som åpne; dette er tilslutning til å føre inn og prøve
    forslaget.»

### Spørsmål 4. Vedtaket om motstridende dokumentasjon (VG-B-03)

- **Bakgrunn:** MP-U7 (08.10, fra metodeprøven) sier at en senere dokumentert innsigelse mot
  premisset om at det ikke finnes noen virksom tidsinnsigelse, gir «uavklart: motstridende
  dokumentasjon», og at et sendt brev som avviker fra dagens utledning, merkes som utdatert.
  Senere vedtak sier det motsatte: en innsigelse etter svaret «endrer ikke et tidligere svar
  eller en enighet» (VS-U9), og et registrert brev gir ikke noe «uavklart utfall» (OV-U4).
  Registeret fører ikke forholdet, og Følge til VS-U1 sier «I tråd med MP-U5, MP-U7». MP-U7
  er ikke bygget. Etter innledningen i vedtaksfila gjelder et senere vedtak foran, så dette er
  en bekreftelse.
- **Belegg:** § 5 tredje ledd. MP-U7, VS-U1, VS-U9, OV-U4, HF-U11.
- **Alternativene:**
  - **A (anbefalt):** «MP-U7 er endret av VS-U9 og OV-U4 for saker i appen: en innsigelse
    sendt etter svaret, eller et registrert brev, gjør ikke utfallet uavklart, og et sendt brev
    merkes ikke som utdatert.»
  - **B:** «MP-U7 gjelder for innsigelser sendt fra appen. En innsigelse etter § 5 tredje ledd
    sendt fra appen, som strider mot premisset i et sendt svar, gir ‹uavklart: motstridende
    dokumentasjon› til en egen handling avgjør det. Registrerte brev følger OV-U4. Endrer VS-U9
    og HF-U11.»
- **Anbefaling:** A. B ville la appen trekke en slutning av en påberopelse, som HF-U11 sier at
  den ikke skal.
- **Hva valget styrer:** forholdet i registeret. Følge til VS-U1 rettes samtidig.
- **Avhenger av spørsmål 1:** ved C må spørsmålet stilles på nytt for registrerte brev.

### Spørsmål 5. Datoen varslingsplikten løper fra i grunnlagskravet (VG-D-01)

- **Bakgrunn:** TE oppgir i grunnlagskravet datoen pålegget ble mottatt eller TE ble klar over
  forholdet (VS-U26). I dag kan TE endre datoen i en ny grunnlagsversjon (GR-U22), også til en
  senere dato. Brevet viser bare den nye (K, forløp 6 i del 2). Byggherrens påberopelse av at
  varselet kom for sent faller med versjonen (HF-U8, #1127), så byggherren svarer på nytt. For
  varseldatoen og kunnskapsdatoen gjelder rettingsmodellen: en retting til TEs fordel gjelder
  først når byggherren godtar den, og alle datoene vises (MM-U21, OV-U11, OV-U41). Ingen vedtak
  avgjør hvilken modell som gjelder for datoen i grunnlagskravet.
- **Belegg:** § 32.2 første ledd, § 34.1.2 annet ledd, § 5 tredje ledd. VS-U26, GR-U22, HF-U8,
  MM-U21, OV-U11, OV-U41.
- **Alternativene:**
  - **A:** «Datoen varslingsplikten løper fra settes én gang i grunnlagskravet. En ny
    grunnlagsversjon kan ikke endre den. TE retter den etter MM-U21 med henvisning til brevet
    med opplysningen: en tidligere dato gjelder straks, en senere dato gjelder når byggherren
    godtar rettingen. Alle datoene TE har oppgitt, vises som TEs utsagn, og et svar byggherren
    alt har gitt, står med virkningen det hadde. Utvider MM-U21 og OV-U11 til datoen i VS-U26,
    og snevrer inn GR-U22.»
  - **B (anbefalt):** «En ny grunnlagsversjon kan endre datoen varslingsplikten løper fra, men
    brevet sier da hvilken dato TE oppga i forrige versjon. Presiserer GR-U22 og VS-U26.»
  - **C:** «En ny grunnlagsversjon kan endre datoen varslingsplikten løper fra. Den nye datoen
    gjelder straks som TEs opplysning, og brevet viser bare den. Presiserer GR-U22 og VS-U26.»
- **Anbefaling:** B. Delrapporten anbefalte A. Jeg anbefaler B fordi byggherren uansett svarer
  på nytt på den nye versjonen (HF-U8) og da ser begge datoene, mens A krever en
  rettingsflyt (MM-U21) som ikke er bygget, også for en ren skrivefeil.
- **Hva valget styrer:** formatet for grunnlagskravet og brevteksten.
- **Avhenger av spørsmål 1:** nei.

### Spørsmål 6. Beløp med øre (VG-F-02)

- **Bakgrunn:** TE kan kreve et beløp med øre. Byggherrens beløp er full godkjenning når begge
  rundes til samme krone (B-13, HF-U7). Krever TE 100 000,40 kr og godkjenner byggherren
  99 999,60 kr, blir partene enige uten aksept om byggherrens beløp, og brevet sier
  «Byggherren godkjenner 99 999,60 kr eks. mva.» i formen for full godkjenning (K). Etter HF-U7
  avgjør appen ikke om et lite avvik likevel blir avtale.
- **Belegg:** B-13, HF-U7, LV-U4 punkt 5, OV-U39 (hele kroner).
- **Alternativene:**
  - **A:** «Er byggherrens beløp ikke likt det krevde til hele øre, sier brevet ‹byggherren
    godkjenner <x> av de krevde <y>›, også når beløpene er like til nærmeste krone. Enigheten
    gjelder beløpet byggherren oppga. Endrer HF-U7.»
  - **B (anbefalt):** «Beløpet i et krav og i byggherrens svar oppgis i hele kroner. Presiserer
    B-13 og HF-U7.»
  - **C:** «Et svar er full godkjenning av beløpet bare når det er likt det krevde til hele øre.
    Endrer B-13 ‹til nærmeste krone›.»
  - **D:** «Som i dag.»
- **Anbefaling:** B. Problemet forsvinner uten å endre et vedtak, og OV-U39 bruker alt hele
  kroner.
- **Hva valget styrer:** formatet for beløp før første ekte sak. Regelverket endres.
- **Avhenger av spørsmål 1:** nei.

### Spørsmål 7. Overtakelsesdatoen i posten for rigg og drift (VG-G-02)

- **Bakgrunn:** OV-U37 sier at appen viser forlengelsen og «den nye overtakelsesdatoen» som TEs
  premiss. OV-U39 lister det TE oppgir, og der er ingen overtakelsesdato, bare forlengelsen og
  perioden. Etter kontraktsgrunnlaget regnes forlengelsen mot den avtalte nye datoen for
  overtakelse i kontrakten, som gjelder kontrakten samlet. To saker med overlappende
  forlengelse kan da vise to ulike datoer for samme kontrakt. Ikke bygget (#1171).
- **Belegg:** kontraktsgrunnlaget Del II pkt. B.2.16. OV-U36, OV-U37, OV-U39.
- **Alternativene:**
  - **A (anbefalt):** «Saken viser ikke en ny overtakelsesdato. Den viser forlengelsen og
    perioden TE oppgir, som TEs premiss. Overtakelsesdatoen for kontrakten samlet føres ikke i
    appen. Endrer OV-U37, i tråd med OV-U36 og OV-U39.»
  - **B:** «TE oppgir i posten den nye overtakelsesdatoen TE legger til grunn for kontrakten, og
    saken viser den som TEs premiss, ikke som avtalt. Appen sammenlikner ikke datoene i ulike
    saker. Utvider OV-U39.»
- **Anbefaling:** A. Datoen gjelder kontrakten samlet, som OV-U36 fører utenfor appen.
- **Hva valget styrer:** skjemaet og visningen av posten i #1171.
- **Avhenger av spørsmål 1:** nei.

### Spørsmål 8. Nøkkeltallene i prosjektoversikten (VG-G-04)

- **Bakgrunn:** «Krevd vederlag» og «Enighet om vederlag» summerer bare det som er sendt i
  appen. Krav og svar i brev sendt utenfor appen og kompensasjonen i uendret byggetid er ikke
  med, og krav i flere saker for samme kostnad telles hver for seg. Overskriftene sier ikke det.
  OV-U10 endret statusteksten av samme grunn.
- **Belegg:** MM-U28, OV-U10, OV-U36, OV-U37.
- **Alternativene:**
  - **A (anbefalt):** «Nøkkeltallene for vederlag sier at de gjelder krav og enigheter sendt i
    appen. Krav og svar i brev sendt utenfor appen og kompensasjonen for rigg og drift i uendret
    byggetid er ikke med. Krav i flere saker kan gjelde samme kostnad, og appen kontrollerer det
    ikke. Presiserer MM-U28, i tråd med OV-U10, OV-U36 og OV-U37.»
  - **B:** «Nøkkeltallene står som i MM-U28.»
- **Anbefaling:** A, av samme grunn som OV-U10.
- **Hva valget styrer:** overskriftene og teksten i oversikten.
- **Avhenger av spørsmål 1:** ordlyden endres ved C og D.

### Spørsmål 9. Hvilke registrerte brev som vises ved kravet (VG-H-03)

- **Bakgrunn:** Ved et krav som venter på svar, viser appen «motpartens registrerte brev»
  (OV-U20). Vedtaket sier ikke om «motparten» leses ut fra kravet eller ut fra den som leser.
  I dag vises bare byggherrens brev, også for byggherren selv, og byggherren som skal svare, ser
  ikke TEs registrerte brev ved kravet. Etter OV-U4 tar partene brevene i betraktning når de
  svarer.
- **Belegg:** OV-U4, OV-U20.
- **Alternativene:**
  - **A (anbefalt):** «Ved kravet som venter på svar viser appen den som leser, motpartens
    registrerte brev som hører til sporet eller saken og ikke er rettet: TE ser byggherrens, og
    byggherren ser TEs. Presiserer OV-U20.»
  - **B:** «Ved kravet som venter på svar viser appen begge partenes registrerte brev som hører
    til sporet eller saken og ikke er rettet, med avsenderen, beskrivelsen som avsenderens
    beskrivelse og merknaden ‹Appen vurderer ikke innholdet›. Utvider OV-U20.»
  - **C:** «Ved kravet vises bare byggherrens registrerte brev, også for byggherren. Teksten sier
    ‹byggherren har registrert brev›. Presiserer OV-U20.»
- **Anbefaling:** A. Den holder seg innenfor ordlyden i OV-U20 og gir byggherren TEs brev når
  byggherren skal svare.
- **Hva valget styrer:** hvilke brev visningen viser ved kravet, og teksten i journalen.
- **Avhenger av spørsmål 1:** faller bort ved D, og endres ved C.

### Spørsmål 10. Avgrensningen av fristkrav mot andre saker (VG-G-03)

- **Bakgrunn:** Appen ser ikke fristkrav i andre saker og summerer ikke dagene (EO-U8). For
  posten for rigg og drift begrunner TE avgrensningen mot andre saker (OV-U37, OV-U39). For
  fristkravet sier ingen tekst noe om andre saker. At veiledningen etter § 33.5 sier at appen
  ikke ser andre saker, presiserer VS-U18 og føres som arbeidsvalg (spørsmål 11). Spørsmålet her
  er bare om TE skal bes om en begrunnelse.
- **Belegg:** § 33.5 første ledd annet punktum. VS-U18, OV-U37, OV-U39.
- **Alternativene:**
  - **A (anbefalt):** «Skjemaet for fristkravet ber ikke TE begrunne avgrensningen mot fristkrav
    i andre saker. Veiledningen etter VS-U18 sier at appen ikke ser dem. Presiserer VS-U18.»
  - **B:** «Skjemaet for fristkravet ber TE begrunne hvordan kravet er avgrenset mot fristkrav i
    andre saker som gjelder samme periode, slik OV-U37 og OV-U39 gjør for posten for rigg og
    drift. Begrunnelsen er ikke påkrevd. Utvider VS-U18.»
- **Anbefaling:** A. Appen ber da ikke om mer enn kontrakten krever av fristkravet.
- **Hva valget styrer:** fristskjemaet (VS-U18 er ikke bygget).
- **Avhenger av spørsmål 1:** nei.

### Spørsmål 11. Fire arbeidsvalg som føres uten vedtak

Disse følger av gjeldende vedtak etter verifiseringene og føres som arbeidsvalg i issuet, med
henvisning til vedtaket. Svarer oppdragsgiver «ja», føres de slik. Vil oppdragsgiver ha et
punkt som vedtak, stilles det i vedtaks-PR-en.

1. **Fullmakten for et svar med flere lag (VG-F-03):** fullmakten regnes av beløpet byggherren
   godtar om ingen av innsigelsene fører fram, i hvert spor, og fristdagene ganget med
   dagmulktssatsen. Det er det høyeste beløpet byggherren binder seg til i noe lag. I tråd med
   B-13 (05.10) og presiseringen 24.09 av GFK-06. Føres i #818.
2. **Veiledningen om andre saker i fristskjemaet (VG-G-03):** veiledningen ved § 33.5 i
   fristkravet og fristsvaret sier at appen ikke ser fristkrav i andre saker, og at
   forlengelsen i flere saker ikke uten videre kan legges sammen. Presiserer VS-U18, i tråd med
   EO-U8. Føres i issuet som bygger VS-U18.
3. **Vederlagsskjemaet mens bare tilbud kan sendes (VG-H-02):** til andre metoder er bygget,
   sier skjemaet at kravet bare kan sendes fra appen som tilbud etter § 34.2.1, og at et krav
   etter en annen metode sendes utenfor appen. Skjemaet foreslår ikke at TE velger tilbud.
   Utvider MM-U25. Føres i #909.
4. **Opplysningen i byggherrens svarskjema (VG-A-02, VG-C-02):** skjemaet sier at appen
   beregner virkningen ut fra valgene og ikke tolker begrunnelsen, at byggherren er bundet av
   det hen sender fra appen, og, når svaret godkjenner hele kravet i et spor, at partene da er
   enige og at byggherren ikke kan revidere svaret. Er grunnlaget ikke besvart, sier skjemaet at
   enigheten blir betinget av ansvaret om byggherren senere avslår grunnlaget. Følger KA-U19,
   OV-U4, GR-U7 og GR-U26. Føres i #313.


## 4. Funnene som følger av gjeldende vedtak

Disse rettes uten nytt vedtak. Ingen av dem rettes i denne PR-en.

1. **VG-A-01: beslutningslinja sier «prekludert» som byggherrens standpunkt.** Når
   byggherren gjør gjeldende at et varsel kom for sent, sier linja i det frosne
   beslutningsgrunnlaget «Byggherrens standpunkt: prinsipalt prekludert (§ 33.4)», mens
   brevet sier at byggherren gjør gjeldende at varselet kom for sent (K, forløp 5 i del 1).
   - **Vedtakene:** MM-U23, HF-U11 og HF-U2. Ingen vedtak gir ordlyden. #492 (lukket) la
     til «Byggherrens standpunkt:», men ordet står igjen.
   - **Kodestedet:** `beslutningslinje` i `kjerne/frosset/standpunkt.ts`.
   - **Minste retting:** linja gjengir påberopelsen slik brevet sier den, for eksempel
     «prinsipalt varselet etter § 33.4 kom for sent, subsidiært godkjent med 20 dager». Begge
     versjonene økes, fordi `kjerne/frosset/` endres. Allerede frosne linjer står (MM-U9).
     Testene i `kjerne/tester/brevtekst.test.ts`, `docs/domenetabell/regler.json` og
     bevis-sakene med samme tekst rettes.
2. **VG-A-02 og VG-C-02: svarskjemaet mangler teksten om hva appen leser og hva som
   binder.** Skjemaet sier ikke at appen beregner virkningen ut fra valgene og ikke tolker
   begrunnelsen, eller at byggherren er bundet av det hen sender fra appen. Byggherren som
   godkjenner hele kravet, får bare et grønt ikon, og vet ikke at partene da er enige og at
   svaret ikke kan revideres (L).
   - **Vedtakene:** KA-U19 slik OV-U4 endret den, og GR-U7. Følge til KA-U19 sier at
     skjemaet hører til #313.
   - **Kodestedet:** `VederlagForm.svelte` (`kjerneresultat`) og
     `src/lib/components/kjernesak/Brevkontroll.svelte`.
   - **Minste retting:** teksten etter KA-U19 og OV-U4, og opplysningen om bindingen, føres
     som krav i #313. Avslår byggherren grunnlaget senere, blir enigheten betinget av
     ansvaret (GR-U7, GR-U26), så skjemaet sier ikke at den «står». Se også spørsmål 11.
3. **VG-B-02: etikettene som vedtakene krever, vises ikke.** Kjernen regner ut at et svar
   gjaldt et annet varsel enn det TE senere har oppgitt, at en enighet er betinget av
   grunnlaget, at et standpunkt nå er subsidiært, og at en enighet er uten virkning. Ingen
   komponent i den ekte saksruta viser det, og TE kan godta et svar uten å se det (K,
   forløp 1 og 5 i del 1).
   - **Vedtakene:** OV-U5 («Visningen og skjemaet for TEs aksept viser hvilket varsel det
     var …»), GR-U26, MM-U28 og MM-U30.
   - **Kodestedet:** `etiketter` i `kjerne/utledning/visning.ts` (riktig), og
     `Sporbilde.etiketter` i `src/lib/kjernesak/saksbilde.ts`, som ingen komponent leser.
   - **Minste retting:** #732 punkt 1 utvides med `subsidiaert` og `enige_betinget`, med
     OV-U5 og GR-U26 som kilde. OV-U5 krever varselet i visningen og akseptskjemaet, ikke i
     brevteksten.
4. **VG-F-01: kjernen forkaster et motstridende beløp uten å avvise.** Vurderingen
   «godkjent» med 50 000 kr for et krav på 125 000 kr avvises med `ANNET_RESULTAT`, og
   tallet 125 000 kr står i avvisningen. Sender klienten det, lagres 125 000 kr, og
   50 000 kr blir borte. «Avslått» med 50 000 kr gir det samme med 0 kr (K). Skjemaet sender
   ikke slike par, så konsekvensen er lav.
   - **Vedtakene:** B-13 (resultatet oppsummerer vurderingene), og regelen i `AGENTS.md` om
     at det kjernen ikke kan, avvises og ikke forenkles.
   - **Kodestedet:** `kontroller` og `beregnGodkjentBeloep` i `kjerne/regler/vederlag.ts`.
   - **Minste retting:** avvis et beløp ved «godkjent» som ikke er likt det krevde, og ved
     «avslått» som ikke er 0, med `UGYLDIG_VURDERING`. `REGELVERSJON` økes.
5. **VG-H-03: «motparten har registrert brev» står også for byggherren, om byggherrens egne
   brev.** `brevVedKravet` tar bare byggherrens brev, og journalen sier «motparten» til
   begge partene (L).
   - **Vedtaket:** OV-U20. Merknaden «Appen vurderer ikke innholdet» står ved journalposten
     og kreves ikke ved kravet.
   - **Kodestedet:** `brevVedKravet` i `kjerne/utledning/visning.ts` og
     `src/lib/components/kjernesak/Kjernejournal.svelte`.
   - **Minste retting:** teksten sier hvem som har registrert brevet, til spørsmål 9 er
     besvart. Funksjonen for registrerte brev er årsaken til dette funnet (avsnitt 2).
6. **VG-A-03: Python-stien fastslår preklusjon.** `FristOverview.svelte`,
   `VederlagOverview.svelte`, `CenterRead.svelte` og `GrunnlagOverview.svelte` skriver
   «prekludert», og valget «Nei, prekludert» står i `GrunnlagForm.svelte` og
   `FristForm.svelte` (L). Det strider mot MM-U23. TS-ruta når dem ikke. Det følger
   [DL-U2](plans/vedtak.md#dl-u2) og rettes ikke. #1268 dekker bare `VederlagOverview` og
   rigg og drift. Stedene er ført som kommentar i #1268.

**Rettinger som er arbeidsvalg** og ikke følger av et vedtak:

- **VG-E-02: lagtabellen i byggherrens vederlagsskjema.** Hver rad fra lag 3 og oppover heter
  «videre subsidiært», så begrensningen etter § 34.1.3 og posten ser ut til å stå i samme
  lag. Preklusjonen etter § 34.1.2 og lagene fra grunnlaget har ingen rad (L). Brevet og linja
  over tabellen er riktige (K). OV-U32 gjelder brevet, ikke tabellen. Retting:
  `vederlagslag` i `src/lib/kjernesak/vederlagssvar.ts` leverer laget videre, og tabellen i
  `VederlagForm.svelte` grupperer etter det.

## 5. Kjente funn, duplikater og avkreftede funn

**Kjent:**

- VG-A-02: skjemateksten etter KA-U19 er planlagt i #313, men issuet nevner ikke kravet (se
  avsnitt 4, punkt 2).
- VG-B-02: etikettene i visningen (#732), med to nye forløp (se avsnitt 4, punkt 3).
- VG-G-01: regelsettet og demoen behandler rigg og drift som om kravet kan prekluderes etter
  § 34.1.3 (#1268 for demoen, #1171 for kjernen, med økt regelversjon).
- VG-H-02: TE kan bare sende vederlagskravet som tilbud (#909). Meldingen «Velg tilbud» kan
  ikke vises i praksis. Det nye er teksten, se spørsmål 11.

**Duplikat:**

- VG-C-01 er VG-B-01 (spørsmål 3).
- VG-H-01 er VG-E-01 (spørsmål 2).

**Avkreftet:**

- VG-D-02 (første kunnskapsdato): OV-U41 avgjør det. Føres som arbeidsvalg i #1171.
- VG-D-03 (akseptbrevet nevner byggherrens standpunkt til grunnlaget): standpunktet finnes
  (GR-U1), og teksten strider ikke mot svaret i #1260.
- VG-D-04 (`subsidiaert` uten gjeldende svar): følger GR-U1. Visningen avgjøres i #732.

**Spørsmål som ikke holdt:**

- Del 2, spørsmål 1 (forbehold i begrunnelsen): slått sammen med spørsmål 3. Alternativ A
  ville endret KA-U16 og LV-U32, ikke snevret dem inn.
- Del 2, spørsmål 2 (opplysning til byggherren): følger av OV-U4 og GR-U7 (avsnitt 4, punkt 2).
- Del 2, spørsmål 4 (første kunnskapsdato): avgjort av OV-U41.
- Del 3, spørsmål 1 (forbeholdet): slått sammen med spørsmål 2. Alternativ A og B leste noe
  ut av det registrerte brevet, som OV-U4 forbyr.

**Avvist etter stoppregelen:**

- VG-B-04: forbeholdet og etikettene i skjemaets tabell har andre ord enn brevet. Brevkontrollen
  viser den låste teksten før sending.
- Lesemodellen gir hver beløpspost svarets samlede resultat. Ingen visning leser feltet per
  post.
- `utregning.resultat` er «godkjent» uten sammenfall. HF-U7 er fulgt; bare navnet kan
  misforstås.

Jeg er ikke uenig i noen av dommene i verifiseringene.

## 6. Kontrollert og riktig håndtert

Brevet og frysingen:

- Brevteksten avsenderen ser i brevkontrollen, er den som fryses; et avvik avvises med
  `ANNEN_BREVTEKST` (L). LV-U2.
- Forbeholdet for ubesvart grunnlag fryses og står uendret etter et senere grunnlagsavslag (K).
  GR-U26, MM-U11.
- Full godkjenning under forbeholdet gir enighet om beløpet uten aksept, betinget av
  grunnlaget, og byggherren kan ikke revidere (K). GR-U7, GR-U26.
- Etter TEs aksept av avslaget på grunnlaget avvises revisjonen av vederlagssvaret, og
  enigheten får ingen virkning (K). GR-U7, SK-01.
- Brevteksten for påberopt sen varsling sier at byggherren «gjør gjeldende at varselet … i
  brev <n> av <dato> kom for sent» (K). LV-U21, HF-U11.
- Datoer fra partene vises som partens opplysning (L). VS-U25, OV-U5.

Nye opplysninger og kravversjoner:

- Et svar står med virkningen det hadde når TE senere oppgir et tidligere varsel, og TE kan
  godta det (K). OV-U5.
- En ny opplysning gir ingen falsk merknad om endret regel (K, L). MM-U9.
- Et vederlagssvar gitt mens en ny grunnlagsversjon venter, er ikke subsidiært (K).
- Enighet om vederlaget før fristsvaret er virksom, og et senere fristsvar endrer den ikke (K).
  KA-U7, GR-U7, OV-U38.
- En ny påberopelse etter et uttrykkelig «i tide» avvises for alle hjemlene (L). HF-U4.

Innsigelser, lag og beløp:

- § 34.1.2 rammer hele kravet, § 34.1.3 bare posten, og rekkefølgen grunnlag → § 34.1.2 →
  justeringen og begrensningen → posten bevares i brev, linje og frosne lag (K). OV-U22,
  OV-U27, OV-U32, B-13.
- Tap av hele kravet er skilt fra begrensningen (K). VS-U5.
- Sen spesifisering med de samme dagene, og begrensning lik posten, gir ikke sammenfall (K).
  HF-U7.
- Avrunding til hele øre deles av utregningen, brevet og fullmakten (L).
- Ingen verdi fra byggherren fylles inn fra TE, og en manglende vurdering avvises (L). KA-U4.
- Klientens regelspeil for vederlaget har paritetstest mot kjernen (K, 21 tester).

Registrerte brev og saken samlet:

- Et registrert brev gir ingen standpunkt, enighet, sperre eller forbehold, og begge partene
  kan fortsatt sende fra appen, også etter et eksternt svar med forbehold (K). OV-U4, OV-U7.
- Ved «venter på svar» vises byggherrens registrerte brev i sporet, og saken har merknaden
  etter OV-U19 (K). OV-U4, OV-U20.
- «Appen vurderer ikke innholdet» står per brev og for saken (L). OV-U4, OV-U19.
- Registreringen av et varsel sendt utenfor appen har påkrevd dato og vedlegg og ingen
  brevkontroll (L). OV-U5, MM-U17.
- Fristdagene summeres ikke på tvers av saker (L). EO-U8.
- Kompensasjonen i uendret byggetid regnes ikke i noen sak (L). OV-U36.
- En avvisning vises før brevkontrollen (L). MM-U32.
- Ingen regel leser visningen; arkitekturtesten håndhever det (L). MM-U13.

## 7. Verifikasjon og grenser

- **Denne økta har ikke kjørt kode.** Belegget K og L er rapportenes. Forløpene i
  rapportene ble kjørt i kjernen i minnet, ikke gjennom serveren, testbasen eller
  nettleseren.
- **Kontraktsteksten** (`khjohns/kontrakt`, commit `5540b60`) er lest i denne økta for § 5
  (avsnitt 2), § 32.3 annet ledd (spørsmål 2) og formelen for forlenget byggetid i Del II
  pkt. B.2.16 (spørsmål 7). De andre bestemmelsene spørsmålene viser til, er kontrollert av
  verifiseringsøktene (§ 31.3, § 32.2, § 33.4, § 33.5, § 34.1.2, § 34.1.3, § 34.2.1, § 34.2.2
  og avtaleloven § 6).
- **Alternativene i spørsmål 1, alternativ D i spørsmål 2 og spørsmål 2b** er prøvd mot
  vedtaksfila av en subagent i denne økta.
  Alternativene i spørsmål 2–11 er prøvd av verifiseringsøktene; endringene deres er tatt inn.
- **Rapportenes grenser gjelder**, blant annet: akseptfristen, rigg og drift som post,
  kunnskapsdatoen, merking av registrerte brev, frafall og forsering er ikke prøvd; Python-stien
  er bare lest for VG-A-03; forløp 9 i del 4 er ikke kjørt, fordi kjernen ikke har relasjoner
  mellom saker.
- `python3 docs/verktoy/lenkekontroll.py docs/vurdering-vedtakene-2026-10-25.md` er kjørt.
