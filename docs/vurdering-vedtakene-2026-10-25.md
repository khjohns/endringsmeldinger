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

Språkregelen om hva løsningen kalles, er ført i #1283. I alternativene i spørsmål 4–10 står
«løsningen». Ordrette sitater fra vedtak og svar, og merknaden «Appen vurderer ikke innholdet»
(OV-U4), beholder «appen». Alternativene i spørsmål 1–3b står slik de ble besvart.

**Revurderingen 25.10.** Etter svarene 25.10 ble spørsmål 2b, 3b, 5 og 5b vurdert på nytt i
sparring med to andre modeller. Denne gangen var spørsmålet om løsningen gir en god
arbeidsmåte, ikke bare om den samsvarer med vedtakene. Revurderingen står ved hvert spørsmål:
én føring for utformingen (2b), to nye alternativer (3b-D og 5-D) og en endring av avvisningen
i 5b-B, og et eget alternativ for OV-U41 (5-E). Hvert nytt alternativ sier
hvilket svar fra 25.10 det erstatter hvis det velges. Til oppdragsgiver har valgt, står svarene
fra 25.10.

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
- **Føring for utformingen, revurderingen 25.10 (arbeidsvalg, ikke vedtakstekst):**
  henvisningen etter 2-D og bekreftelsen etter 2b-A kan gis i samme skjema og i samme brev som
  svaret på vederlag eller frist. Det følger av GR-U26, som lar byggherren besvare grunnlaget i
  samme brev, og av 2b-A, som ikke krever en tidligere henvisning. Svarer byggherren ja på
  spørsmålet i 2-D, velger byggherren mellom å bare vise til dokumentet og å bekrefte
  standpunktet nå. Bekreftelsen er et uttrykkelig valg uten forhåndsvalg. Dokumentopplysningene
  oppgis én gang og brukes i begge. Velger byggherren å bekrefte, viser skjemaet spørsmålene i
  2b-A: standpunktet, også en påberopt preklusjon og subsidiære standpunkter, forbeholdet i det
  tidligere svaret og, når grunnlaget godkjennes uten påberopt preklusjon i en underkategori der
  § 32.2 gjelder, om det tidligere svaret var en endringsordre. Kontrollene, fullmakten og
  brevteksten følger handlingen byggherren velger, og forhåndsvisningen viser hva brevet
  inneholder. Skjemaet viser følgen av svaret om særskilte vilkår ved hvert spor: for
  grunnlaget stopper et ja sendingen, mens et ja for vederlag og frist gir et svar med vilkår
  hvis spørsmål 3b, alternativ D velges. Bekrefter byggherren grunnlaget uten påberopt
  preklusjon i en underkategori der § 32.2 gjelder, og var det tidligere svaret ikke en
  endringsordre, utsteder byggherren nå en endringsordre etter 2b-A, og skjemaet sier det.
  Bekrefter byggherren, får brevet bekreftelsen i stedet for henvisningen og
  forbeholdet for ubesvart grunnlag, og standpunktene følger GR-U26: avslås grunnlaget eller
  påberopes preklusjon, gjelder den subsidiære strukturen. Avvises bekreftelsen, fordi det
  tidligere svaret hadde et forbehold eller var en endringsordre som skal registreres etter
  OV-U6, kan svaret på vederlag eller frist sendes med henvisningen alene. Ingen vedtakstekst
  endres. Føringen føres i byggeissuet for grunnlagssvaret når
  vedtaket føres. Tilfellet blir sjeldnere når byggherren kan svare på grunnlaget i TS-ruta
  (#818).
- **Sparring om føringen 25.10**, ordrett. Den ene modellen: «Spør med én gang i samme boks:
  ‹Vil du registrere hva standpunktet i det svaret var nå, slik at grunnlaget blir oppdatert i
  appen?›» Den andre: «Det er ingen grunn til at det juridiske skillet må bli to skjemaer eller
  dobbeltregistrering.» og «Kontroller og brevinnhold må følge den handlingen BH velger […].
  Dokumentopplysningene bør gjenbrukes, mens bekreftelsen fortsatt er et uttrykkelig valg.»
  Den andre modellen rettet også valgene i det første forslaget, «[Ja: Avslått] / [Ja:
  Godkjent]»: de må dekke preklusjon, subsidiære standpunkter og en endringsordre.

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
- **Revurderingen 25.10: alternativ D (foreslått).** Forslaget har ikke vært lagt fram for
  oppdragsgiver. Velges D, erstatter det svaret 25.10 (3b-A) for svar på vederlag og frist
  sendt fra løsningen. 3b-A står for svar på grunnlaget og for registrering av en endringsordre
  etter OV-U6. D har tre deler: svaret med vilkår (D1), avklaringen av vilkårene (D2) og
  sperren for endringsordre (D3). Hver del er en ny produktregel, ikke en tekstlig opprydding,
  og de vedtas samlet.
  - **D1, svaret med vilkår:** «Godkjenner byggherrens svar på vederlag eller frist noe,
    prinsipalt eller subsidiært, opplyser byggherren for sporet om godkjenningen er avhengig av
    vilkår eller forbehold som ikke kan uttrykkes med valgene i skjemaet. Skjemaet spør: ‹Er
    godkjenningen avhengig av andre vilkår eller forbehold enn dem som uttrykkes gjennom valgene
    du har gjort og den faste brevteksten?› Veiledningen sier: ‹Forbeholdet for ubesvart
    grunnlag og forbeholdene som uttrykkes i lagene i svaret, omfattes ikke av spørsmålet.›
    Spørsmålet stilles når svaret utarbeides, det har ingen forhåndsvalg, og sendingen avvises
    når opplysningen mangler. Opplysningen er byggherrens og lagres med svarversjonen.
    Løsningen kontrollerer den ikke mot utdypningen og tolker ikke teksten.

    Svarer byggherren nei, gjelder de øvrige reglene. Står det likevel et vilkår i
    utdypningen, er brevet det autoritative uttrykket for byggherrens standpunkt (B-03), og
    sammenfallet er løsningens utledning av valgene og avgjør ikke om partene rettslig er enige
    (MM-U12).

    Svarer byggherren ja, kan svaret sendes, og brevet sier for sporet: ‹Godkjenningen er gitt
    på vilkår som fremgår av svaret.› Byggherren kan oppgi hvilke andre spor vilkårene berører.
    Henvisningen vises ved disse sporene til vilkårene er avklart, men endrer ikke utledningen
    eller sperrer handlinger der. Opplysningen er byggherrens, og løsningen kontrollerer ikke
    koblingen mot teksten. Svaret gir ikke sammenfall med kravet, og TE tar stilling ved å godta
    eller ikke godta svaret (HF-U7). Reglene og sperrene for TEs aksept gjelder (HF-U18,
    FO-U5).

    Før TE har godtatt svaret, avvises en revisjon som endrer opplysningen fra nei til ja,
    fordi den svekker det byggherren har gitt (HF-U5, HF-U6). I en revisjon av et svar med ja
    opplyser byggherren at vilkårene er uendret fra det tidligere svaret. Nye eller endrede
    vilkår avvises. Byggherren frafaller vilkårene ikke i en revisjon, men i et eget utsagn
    med henvisning til brevet med vilkårene, så resten av svaret står uendret. Et frafall
    gjelder betingelser for byggherrens godkjenning, og byggherren opplyser at frafallet ikke
    reduserer byggherrens egne ytelser eller andre innrømmelser i svaret i brev <n>. Brevet
    sier: ‹Byggherren frafaller vilkårene i svaret i brev <n> av <dato>. Svaret står ellers
    uendret, og frafallet reduserer ikke byggherrens ytelser eller andre innrømmelser i det.›
    Frafaller byggherren alle vilkårene, gjelder svaret som et svar uten særskilte vilkår, og
    gir det sammenfall med kravet, er partene enige (GR-U7). Utsagnet går gjennom fullmakten
    som et svar (GFK-06). Opplysningene er byggherrens, og løsningen tolker ikke
    utdypningen.

    Godtar TE, sier brevet: ‹TE godtar byggherrens svar i brev <n> av <dato>, med vilkårene som
    fremgår av svaret.› Løsningen registrerer da enighet med særskilte vilkår i sporet. Den
    tolker ikke vilkårene og avgjør ikke om de er oppfylt. Løsningen endrer ikke utledningen i
    andre spor automatisk som følge av aksepten, og den avgjør ikke hvilken rettslig betydning
    vilkårene har for disse sporene. Enigheten binder etter KA-U7: en ny kravversjon og
    byggherrens revisjon i sporet avvises, og TE kan trekke kravet (KA-U6). Om enigheten er
    betinget av grunnlaget eller uten virkning, følger GR-U7 som for annen enighet. Vilkår som
    ikke er avklart, er et eget forhold i tillegg: til de er avklart etter avklaringsreglene
    nedenfor, regnes kravet ikke som avgjort etter OV-U3, og beløpet inngår ikke i summen av
    virksom enighet, også når grunnlaget er avklart. Sporets betegnelse er ‹Enige›, og linja
    under viser begge forholdene, med henvisning til brevet med vilkårene. Nøkkeltallene viser
    enigheten særskilt og sier hva den bygger på.

    Svar på grunnlaget og registrering av en endringsordre etter OV-U6 omfattes ikke. Der
    avvises sendingen, eller registreringen som svar på grunnlaget, når byggherren opplyser om
    slike vilkår. Det er en avgrensning av støtten for særskilte vilkår i første versjon, ikke
    en regel om at slike svar er utelukket.

    Endrer GR-U7 og GR-U8 når byggherren svarer ja, og snevrer inn GR-U26 og HF-U5. Endrer
    KA-U16, som forkastet foreløpig at et svar med forbehold ikke gir sammenfall, for svar der
    byggherren selv opplyser om vilkår. Endrer KA-U19 for svar på vederlag og frist sendt fra
    løsningen. Endrer svaret 25.10 på spørsmål 8 om nøkkeltallene: også vilkår som ikke er
    avklart, holder et beløp utenfor virksom enighet. Utvider MM-U28 og LV-U4, og presiserer
    OV-U3 og MM-U30. I tråd med HF-U7, KA-U7, LV-U32 og MM-U12.»
  - **D2, avklaringen av vilkårene:** «Har partene enighet med særskilte vilkår i et spor, kan
    en part sende et forslag om å avklare vilkårene, med henvisning til brevet med vilkårene.
    Parten velger hva avklaringen gjelder: at vilkårene er oppfylt, at bestemte vilkår
    frafalles, eller at avtalen endres, og beskriver det. Brevet har en fast setning for valget.
    Parten opplyser om alle de særskilte vilkårene i sporet er avklart, eller om noen består, og
    at avklaringen ikke endrer beløpet eller dagene i enigheten. Gjelder avklaringen et
    frafall, opplyser parten også at frafallet ikke reduserer partens egne ytelser eller andre
    innrømmelser i svaret. Forslaget har en akseptfrist parten setter. Det finnes høyst ett
    åpent forslag om vilkårene i et brev: et nytt forslag fra en av partene avvises til det
    åpne er godtatt, avslått eller har falt bort. Forslaget og aksepten går gjennom fullmakten
    som et svar (GFK-06). Skjemaet sier før sending at forslaget ikke kan trekkes, og hvor
    lenge det binder. Brevet sier: ‹Forslaget gjelder til <dato> og faller bort uten aksept.› Før sending er forslaget et utkast og kan endres. Det sendte forslaget binder
    avsenderen som et tilbud etter reglene for byggherrens svar (HF-U5, HF-U6, LV-U7): det kan
    ikke trekkes eller svekkes i løsningen, og bindingen varer til motparten godtar eller avslår
    det, eller akseptfristen er ute. Motparten kan godta eller avslå forslaget, og aksepten viser til akkurat
    dette forslaget. Taushet har ingen virkning i løsningen (MM-U12). Godtar motparten, registrerer
    løsningen partenes tilslutning til avklaringen, uten å fastslå at en beskrivelse av faktum
    er sann. Er alle de særskilte vilkårene i sporet avklart, faller virkningen etter D1 av
    vilkår som ikke er avklart, bort, og enigheten følger GR-U7 og MM-U28. Henvisningene i andre
    spor viser da avklaringen. Består noen vilkår, står virkningen. Faller et forslag bort,
    sier visningen at vilkårene består etter løsningens registrering. Innholdet i enigheten er
    svaret og kravet med avklaringene partene har sluttet seg til. En avklaring kan ikke endre
    beløpet eller dagene i første versjon. At løsningen krever motpartens tilslutning, er et
    produktvalg. Det sier ikke at et ensidig frafall er uten rettslig virkning. Utvider LV-U4.
    Presiserer HF-U9, KA-U10, OV-U3 og MM-U28. Anvender HF-U5, HF-U6, LV-U7 og GFK-06 på
    forslaget. I tråd med MM-U12.»
  - **D3, endringsordre:** «En sak der et spor har enighet med særskilte vilkår som ikke er
    avklart, kan ikke inngå i en endringsordre (EO-U5). Sperren gjelder hele saken, fordi en sak
    inngår i høyst én endringsordre og gjengis der samlet (EO-U3, EO-U8). Den gjelder ikke saker
    uten slike vilkår. Snevrer inn EO-U5, slik KA-U26 gjør for et registrert brev merket med et
    forbehold.» Koden krever i dag at kravene er avgjort før en sak kan inngå i en endringsordre
    (L, `kanInngaaIEo` i `kjerne/utledning/utled.ts`, arbeidsvalget i #493), så D3 er i praksis
    bygget gjennom OV-U3. Det erstatter ikke vedtaket.
  - **Begrunnelse:** sperren i 3b-A belønner et uriktig svar. Løsningen kontrollerer ikke
    opplysningen, og når et ja stopper sendingen og et nei slipper gjennom, blir det svart nei.
    3b-A nevner selv et uriktig nei som en kjent begrensning. Etter D1 har et ja en tydelig og
    brukbar følge: sammenfallet uteblir, og TE må ta stilling. Det er det HF-U7 sier om et svar
    med et vilkår, og løsningen bygger det på byggherrens egen opplysning, ikke på en tolkning
    av utdypningen. Byggherren slipper å sende svaret utenfor løsningen. Fordi spørsmålet
    stilles ved hvert svar som godkjenner noe, og ikke bare ved sammenfall, lukker D1 også
    hullet 3b-A lot stå: at TE godtar et delvis svar uten at vilkåret er registrert. Med et ja
    gjelder setningen om forbeholdene i LV-U32 og ikke setningen i 3-A, så brevet og
    registreringen stemmer overens.

    D1 gjelder ikke grunnlaget i første versjon. Det er et produktvalg, ikke noe kontrakten
    krever: en godkjenning av grunnlaget uten påberopt preklusjon er en endringsordre etter
    § 32.3 a (GR-U10) og avklarer grunnlaget for de andre sporene (GR-U7, OV-U3), og modellen
    har ingen handling for å avklare et vilkår i et slikt svar. Ved registrering etter OV-U6 er
    dokumentet alt sendt, og et ja fører bare til at det registreres som dokumentasjon; derfor
    står 3b-A der.

    D2 er nødvendig fordi D1 ellers gir en blindvei. Prøvingen med forløp viste at kravene i en
    sak med en enighet med vilkår bare kunne bli avgjort på to måter: at TE trekker kravet
    partene er enige om, eller at saken inngår i en endringsordre med vilkårene uavklart. D2 gir
    oppfylt, frafalt og endret én arbeidsflyt, men holder dem atskilt med et valg og en fast
    setning, så løsningen ikke tolker teksten. Etter TEs aksept kreves begge parters
    tilslutning, fordi løsningen ikke kan klassifisere virkningen av en avklaring sikkert: et
    vilkår kan også inneholde noe byggherren har lovet. Før aksepten er svaret et tilbud, og
    byggherren kan frafalle vilkår i en revisjon etter D1. Forslaget binder som et tilbud fordi
    løsningen bruker de samme reglene for tilbud ellers; skal forslag i stedet kunne trekkes
    fritt, er det et eget valg som må stå i vedtaket og i brevet. Akseptfristen er obligatorisk
    så løsningen ikke må avgjøre hva som er rimelig tid etter avtaleloven § 3. D3 lukker veien
    gjennom endringsordren.
  - **Kostnaden:** D gir enigheten et nytt forhold, vilkår som ikke er avklart, ved siden av
    virkningen etter GR-U7 og MM-U28. Det har følger for sperren etter KA-U7, for når kravene er
    avgjort (OV-U3), for endringsordren (EO-U5), for nøkkeltallene og for linja under
    betegnelsen (MM-U30). D2 er en ny handling med forslag, akseptfrist, aksept og avslag. Brevet
    får nye faste setninger for vilkårene, frafallet, aksepten og avklaringen. Ordlyden i
    oversikten fastsettes når den bygges, med linse A i design-review. Regelversjonen og
    projeksjonsversjonen økes. Om en sak med vilkår som ingen av partene vil avklare, kan
    avsluttes administrativt, avgjøres sammen med avklaringspunkt 2 i spørsmål 2b.
  - **Prøvd mot vedtaksfila 25.10** av en subagent, sammen med 5-D og føringen i 2b. Rettelsene
    er tatt inn: D er avgrenset til vederlag og frist, forholdene til GR-U7, GR-U8, GR-U26,
    MM-U28, MM-U30 og LV-U4 er rettet, revisjonen og TEs aksept er dekket, og henvisningene til
    svar som ikke er ført, er skrevet ut. Etter sparringen ble avgrensningen til vederlag og
    frist beskrevet som et produktvalg, «aldri virksom» erstattet med «ikke automatisk
    virksom», setningen om andre spor skrevet om fra en rettsregel til løsningens atferd, og
    forslaget om at byggherren alene kan avklare vilkårene tatt ut.
  - **Prøvd med fire forløp 25.10** av en subagent: vilkår som kobler sporene, byggherren
    frafaller vilkåret, TE mener vilkåret er oppfylt, og TE retter en henvisning eller en dato.
    Funnene og sparringen etter dem ga D2 og D3, at virkningen etter GR-U7 og vilkårene er to
    forhold, sperren for endringsordre, setningen om svaret nei fra 3b-A, frafallet som et valg
    med fast setning og forholdet til HF-U5, og at byggherren selv oppgir hvilke andre spor
    vilkårene berører.
  - **Åpent spørsmål fra prøvingen med forløp 25.10 (commit `3779571`):** skal TE kunne
    trekke et krav som en del av et forslag etter D2, med virkning først når byggherren godtar
    forslaget? Uten det kan TE trekke fristkravet for å oppfylle et vilkår og så miste kravet
    hvis byggherren avslår at vilkåret er oppfylt. Anbefaling: ja.
  - **Prøvd mot vedtakene og arbeidsflyten 25.10** av en subagent, på commit `94dc93c`, med
    linsen at et vedtak som gir dårligere arbeidsflyt, kan vike. Rettelsene er tatt inn: D2 har
    avslag, akseptfrist og en regel for taushet, valget oppfylt, frafalt eller endret er
    strukturert, og forholdene til HF-U9, KA-U10 og svaret på spørsmål 8 er ført. En revisjon av
    et svar med ja kan ikke legge til eller endre vilkår. Sparringen etter prøvingen gjorde
    forslaget bindende som et tilbud i stedet for fritt tilbakekallelig, og avgrenset frafallet
    til betingelser for byggherrens godkjenning, uten å redusere byggherrens ytelser. Prøvingen
    foreslo at byggherren kan frafalle vilkårene alene også etter TEs aksept. Det er ikke tatt
    inn, fordi løsningen ikke kan se om et vilkår også inneholder noe byggherren har lovet.
  - **Føringene for utformingen** over gjelder D med én endring: etter D er opplysningen en del
    av brevet, fordi den har virkning for TE.
  - **Sparring 25.10**, ordrett. Den ene modellen: «Ikke blokker sending! La et ‹Ja› sperre for
    automatisk enighet i stedet, slik at TE må ta stilling til (akseptere/avslå) svaret med
    vilkåret.» Den andre: «Motparten kan godta hele det identifiserte brevet, inkludert
    vilkårene. Løsningen registrerer denne tilslutningen. Den kan ikke dermed avgjøre at
    vilkårene er oppfylt, eller automatisk endre andre spor.» og «Opplysningen bør følge svaret
    uavhengig av om beløpet ellers ville gitt sammenfall.» og «Avklar derfor virkningen for både
    nøkkeltall, sperrer mot nye kravversjoner og ‹alle fremsatte krav er avgjort›. En ny etikett
    alene er ikke tilstrekkelig.» og «Behold kontrollen ved OV-U6 som foreslått.»

### Spørsmål 4. Vedtaket om motstridende dokumentasjon (VG-B-03)

- **Bakgrunn:** MP-U7 (08.10, fra metodeprøven) sier at en senere dokumentert innsigelse mot
  premisset om at det ikke finnes noen virksom tidsinnsigelse, gir «uavklart: motstridende
  dokumentasjon», og at et sendt brev som avviker fra dagens utledning, merkes som utdatert.
  Tilfellet i [metodeprøven](vedlegg/metodeprove-frist-2026-10-08/README.md#prøve-4-senere-dokumentert-korrespondanse)
  er en tidligere e-post med en rettidig innsigelse, som byggherren dokumenterer etter at det
  er avklart at ingen tidsinnsigelse virker. Senere vedtak sier det motsatte av MP-U7: en
  innsigelse etter svaret «endrer ikke et tidligere svar eller en enighet» (VS-U9), og et
  registrert brev gir ikke noe «uavklart utfall» (OV-U4). Følge til VS-U1 sier «I tråd med
  MP-U5, MP-U7». Følge til MP-U7 sier «Tiltenkt atferd for prøven», og ingen vedtak har tatt
  MP-U7 inn i løsningen, slik VS-U9 gjorde med MP-U6. MP-U7 er ikke bygget. Innledningen i
  vedtaksfila sier om vedtakene: «De tas ikke opp igjen uten at beslutningen eksplisitt
  oppheves.» Følge sier når et senere vedtak gjelder foran, og ingen post i registeret har et
  forhold til MP-U7. Motstriden avgjøres derfor av dette vedtaket.
- **Belegg:** § 5 tredje ledd. MP-U7, VS-U1, VS-U9, OV-U4, OV-U5, HF-U4, HF-U11, MM-U9.
- **Alternativene:**
  - **A (anbefalt):** «For saker i løsningen endres MP-U7 på punktene om uavklart utfall og
    merking av sendte brev som utdatert, slik at disse samsvarer med VS-U9 og OV-U4. En
    innsigelse sendt fra løsningen etter svaret gjør ikke i seg selv et tidligere utledet
    utfall uavklart. Det gjør heller ikke et registrert brev, også når brevet dokumenterer en
    tidligere innsigelse. De endrer ikke et tidligere svar eller en enighet. Et sendt brev
    merkes ikke som utdatert av denne grunnen. Innsigelsen vises etter VS-U1, og brevet etter
    OV-U4. Løsningen avgjør ikke hvilken rettslig betydning de har.»
  - **B:** «MP-U7 gjelder for innsigelser sendt fra løsningen. En innsigelse etter § 5 tredje
    ledd sendt fra løsningen, som strider mot premisset i et sendt svar, gir ‹uavklart:
    motstridende dokumentasjon› til en egen handling avgjør det. Registrerte brev følger
    OV-U4. Endrer VS-U3, VS-U9, VS-U24, OV-U3, OV-U7, HF-U4, HF-U11 og KA-U29, og MM-U3,
    KA-U7 og GR-U10 for en enighet.»
- **Anbefaling:** A. B lar en senere påberopelse fra den ene parten endre et utledet utfall og
  kreve en ny handling, i strid med VS-U9. Å vise «uavklart» er ikke i seg selv en rettslig
  avgjørelse; det er virkningen på utfallet som strider mot vedtakene. Registrerte brev følger
  fortsatt OV-U4 også etter B, så B dekker heller ikke tilfellet MP-U7 kom fra. B strider
  dessuten mot vedtakene om at en innsigelse etter § 5 tredje ledd er et utsagn uten
  utledning, og mot HF-U4 når byggherren har sagt «i tide», og den bygger på en handling som
  ikke er avgjort (B-16). OV-U5 sier det samme som A for et varsel registrert etter svaret:
  «Et svar byggherren alt har gitt, står med virkningen det hadde og blir ikke uavklart.» To
  avgrensninger gjelder A:
  - «Ingen standpunkt» i OV-U4 betyr at løsningen ikke utleder et standpunkt av
    registreringen. Det betyr ikke at brevet er uten et rettslig relevant standpunkt.
  - At dokumentasjonen ikke endrer et utledet utfall, betyr ikke at den er uten betydning for
    partenes rettigheter. Siste setning i A sier det.

  Leddene i MP-U7 om at begge opplysningene står i journalen, og at tidligere utledninger og
  sendte brev ikke endres, står. De stemmer med VS-U9 og MM-U9.
- **Hva valget styrer:** forholdet «endrer» til MP-U7 i registeret. «I tråd med MP-U5, MP-U7»
  i Følge til VS-U1 rettes samtidig.
- **Sparring 25.10:** A og anbefalingen er rettet etter sparring mellom økta, oppdragsgiver og
  en annen modell: første setning, tilfellet med en tidligere innsigelse som dokumenteres
  senere, «en enighet» som i VS-U9, og grunnlaget mot B. Premisset om at et senere vedtak
  alltid gjelder foran, er trukket. Prøvingen mot vedtaksfila etter sparringen fant at
  forholdet i B var ufullstendig, og det er rettet.
- **Avhenger av spørsmål 1:** ved C må spørsmålet stilles på nytt for registrerte brev.
- **Svar 25.10 (oppdragsgiver):** A. Oppdragsgiver ordrett: «Jeg godkjenner A». Forkastet: B
  slik den står. Svaret føres i vedtaksregisteret i en egen vedtaks-PR.

### Spørsmål 5. TEs opplysning om mottaksdato eller kunnskapsdato i grunnlagskravet (VG-D-01)

- **Bakgrunn:** TE oppgir i grunnlagskravet datoen pålegget ble mottatt eller TE ble klar over
  forholdet (VS-U26). I dag kan TE endre datoen i en ny grunnlagsversjon (GR-U22), også til en
  senere dato. Brevet viser bare den nye (K, forløp 6 i del 2). En ny versjon er tillatt bare i
  et spor uten enighet og før kravene i saken er avgjort (KA-U7, OV-U3). Etter HF-U8 faller
  byggherrens svar bort som tilbud med den nye versjonen, og sporet venter på nytt svar; det er
  unntaket i HF-U6 for TEs nye kravversjon. Et frafall faller ikke bort (GR-U20). Om det
  er riktig når versjonen bare retter en opplysning, er spørsmål 5b. En påberopelse av at
  varselet kom for sent faller ikke bort med svaret: «Den første innsigelsen og tidspunktet
  bevares», og et senere svar viser til innsigelsen og gjentar den som utgangspunkt (VS-U9,
  VS-U11). Et uttrykkelig standpunkt om at varselet kom i tide, faller heller ikke bort, og en
  senere påberopelse av at det kom for sent, avvises (HF-U4, HF-U8). Oppdragsgiver valgte 22.10
  at påberopelsen etter § 32.2 gjelder det første grunnlagskravet for pålegget, og at
  «Mottaksdatoen er TEs opplysning i den gjeldende versjonen» (#1127). Valget er ikke ført som
  vedtak, og det gjelder ikke kunnskapsdatoen. For varseldatoen og kunnskapsdatoen etter
  § 34.1.3 gjelder rettingsmodellen: en retting til TEs fordel gjelder først når byggherren
  godtar den (MM-U21, OV-U11, OV-U41). For kunnskapsdatoen beholdes og vises alle datoene TE har
  oppgitt (OV-U41). Rettingsmodellen i MM-U21 er ikke bygget. Registeret avklarer ikke
  uttrykkelig forholdet mellom versjonsmodellen og MM-U21 for datoopplysningen i
  grunnlagskravet, men valget i #1127 gir føring for mottaksdatoen. Datoen TE oppgir, er ikke
  nødvendigvis fristens rettslige utgangspunkt: etter § 34.1.2 løper fristen fra TE «blir eller
  burde ha blitt klar over» forholdet. Grunnlagskravet er heller ikke et varsel etter § 33.4
  eller § 34.1.2 (VS-U26), så rettidigheten etter de bestemmelsene behandles i fristsvaret og
  vederlagssvaret.
- **Belegg:** § 32.2 første ledd, § 34.1.2 annet ledd, § 5 tredje ledd. VS-U26, GR-U22, HF-U4,
  HF-U5, HF-U6, HF-U8, HF-U21, GR-U20, VS-U9, VS-U11, KA-U7, OV-U3, MM-U9, MM-U21, OV-U5, OV-U7, OV-U11,
  OV-U41, KA-U24, LV-U4, #1127.
- **Alternativene:**
  - **A (anbefalt):** «TEs opplysning om når pålegget ble mottatt eller TE ble klar over forholdet, settes
    én gang i grunnlagskravet. En ny grunnlagsversjon kan ikke endre den. TE retter den etter
    MM-U21 med henvisning til brevet med opplysningen. En tidligere dato er en retting i
    byggherrens favør og erstatter den tidligere opplysningen i løsningen straks. En senere dato
    er en retting til TEs fordel og erstatter ikke den tidligere opplysningen i løsningen før
    byggherren har godtatt den. Alle datoene TE har oppgitt, beholdes og vises som TEs utsagn.
    Rettingen endrer ikke virkningen av et svar byggherren allerede har gitt. Virkningen av en
    senere ny kravversjon følger HF-U8. Løsningen avgjør ikke når varslingsfristen begynte å
    løpe, eller om varselet var rettidig. Utvider rettingsmodellen i OV-U41 til
    datoopplysningen i VS-U26, presiserer VS-U26 og snevrer inn GR-U22. Følger MM-U21.»
  - **B:** «TE kan i en ny grunnlagsversjon endre sin opplysning om når pålegget ble
    mottatt eller TE ble klar over forholdet. Adgangen gjelder bare når en ny grunnlagsversjon
    ellers er tillatt, og åpner ikke for en ny versjon etter enighet eller etter at kravene i
    saken er avgjort (KA-U7, OV-U3). Endres datoen, viser brevet både den nye datoen og datoen
    TE oppga i forrige versjon, med henvisning til det tidligere brevet. Tidligere opplysninger
    og brev står uendret, og alle datoene TE har oppgitt, beholdes og vises som TEs utsagn. Den
    nye datoen er TEs opplysning, ikke en dato løsningen har fastslått som riktig. En
    opplysning om når TE faktisk ble klar over forholdet, fastslår ikke når TE burde ha blitt
    klar over det. Byggherren tar stilling til rettidigheten i svaret der rettidigheten etter
    den aktuelle bestemmelsen behandles, og kan der godta eller bestride datoen. Et svar på
    vederlag eller frist som alt er gitt, står etter en ny grunnlagsversjon (HF-U21). En ny
    grunnlagsversjon åpner ikke i seg selv for et nytt svar eller en revisjon i vederlags- eller
    fristsporet. Byggherren kan behandle den endrede opplysningen i et senere svar på en
    tillatt ny kravversjon i det aktuelle sporet, eller i en revisjon som ellers er tillatt
    etter HF-U5, GR-U7 og OV-U3. Har byggherren
    i et utsagn sendt fra løsningen uttrykkelig sagt at varselet kom i tide, eller gitt opp
    innsigelsen, avvises en senere
    påberopelse av at det samme varselet kom for sent etter samme bestemmelse, også etter en
    endret dato (HF-U4). En påberopelse byggherren alt har fremsatt, bevares med tidspunktet,
    og et senere svar gjentar den som utgangspunkt (VS-U9, VS-U11). Løsningen avgjør ikke når
    varslingsfristen begynte å løpe, eller om varselet var rettidig. Når opplysningen endres
    gjennom en ny grunnlagsversjon etter GR-U22, behandles endringen etter reglene for nye
    kravversjoner og ikke etter rettingsmodellen i MM-U21. Dette innebærer ikke i seg selv at
    det foreligger et nytt rettslig krav eller at noen varslingsfrist begynner på nytt.
    Brevsetningen gjelder bare nye brev (MM-U9). Presiserer GR-U22 og VS-U26, snevrer inn
    MM-U21 for endring av datoopplysningen i VS-U26 gjennom en tillatt ny grunnlagsversjon, og
    utvider LV-U4.»
  - **C:** «En ny grunnlagsversjon kan endre TEs opplysning om når pålegget ble mottatt eller
    TE ble klar over forholdet. Den nye datoen gjelder straks som TEs opplysning, og brevet
    viser bare den. Presiserer GR-U22 og VS-U26, og snevrer inn MM-U21 for endring av
    datoopplysningen i VS-U26 gjennom en tillatt ny grunnlagsversjon.»
- **Anbefaling:** A, sammen med 5b-B. Det avgjørende er følgen for byggherrens svar. I
  grunnlagssporet binder et svar byggherren som tilbud når byggherren prinsipalt har påberopt at
  varselet etter § 32.2 kom for sent og subsidiært godkjenner grunnlaget (HF-U5, HF-U7); en
  godkjenning uten påberopt preklusjon gir enighet ved sammenfall, og da avvises en ny versjon
  (GR-U10, KA-U7; `godkjennerHeleKravet` i `kjerne/frosset/standpunkt.ts`). Følgen gjelder
  der § 32.2 gjelder kategorien, som mottaksdatoen i VS-U26. Det er nettopp tilfellet der TE har grunn til å rette
  mottaksdatoen. Etter B må TE da sende en ny versjon, og den avslår tilbudet med den
  subsidiære godkjenningen (HF-U8, spørsmål 5b). Byggherren svarer på nytt og kan etter
  modellens regler også avslå grunnlaget materielt. En faktakorrigering bør ikke ha den følgen.
  Etter A står svaret, den opprinnelige opplysningen står, og den nye vises som TEs utsagn.
  Partene kan være uenige om datoen uten at den subsidiære godkjenningen åpnes på nytt.

  A avviker fra føringen i #1127 om at «Mottaksdatoen er TEs opplysning i den gjeldende
  versjonen»: etter A kan en senere mottaksdato bare komme inn ved en retting byggherren
  godtar. Velges A, må det avviket besluttes uttrykkelig. A krever rettingsflyten i MM-U21, som
  ikke er bygget; til den er bygget, kan datoen ikke endres i løsningen. Det er en
  leveranseavhengighet, ikke en grunn til å velge en annen handling for TE. 5b-B sier at
  rettingen bygges før første ekte sak. Hovedplanen har alt korrigeringsprosessen etter B-16 som
  krav før produksjon, «også hvis løsningen er en manuell prosess»; 5b-B gjør kravet strengere.
  A gir også samme modell som for kunnskapsdatoen etter § 34.1.3 (OV-U41).

  B er et mulig produktvalg og følger #1127, men følgen må stå konkret: TE kan miste
  byggherrens subsidiære godkjenning av grunnlaget som bindende tilbud ved å rette
  mottaksdatoen. Etter B kan en ny grunnlagsversjon dessuten bære en datoopplysning til TEs
  fordel uten byggherrens godkjenning, mens en retting av varseldatoen til TEs fordel ikke
  erstatter den tidligere opplysningen før byggherren har godtatt rettingen (OV-U11). C gjør
  endringen vanskelig å oppdage. Ingen av alternativene avgjør hvilken dato som faktisk er
  riktig. Delrapporten anbefalte A. Valget er en produktmodell; kontrakten krever ikke akkurat
  rettingsmodellen i MM-U21.
- **Hva valget styrer:** formatet for grunnlagskravet og brevteksten.
- **Avhenger av:** spørsmål 5b. De avgjøres sammen, fordi følgen av B for byggherrens svar
  avgjøres der. 5-B og 5-C kan ikke velges sammen med 5b-B, fordi de lar datoen endres i en ny
  versjon, mens 5b-B legger korrigeringen til MM-U21. De andre kombinasjonene henger sammen.
  Anbefalt er 5-A med 5b-B. Ikke av spørsmål 1.
- **Svar 25.10 (oppdragsgiver):** A, sammen med 5b-B, med uttrykkelig avvik fra valget 22.10
  i #1127 om at mottaksdatoen er TEs opplysning i den gjeldende versjonen. Oppdragsgiver
  ordrett: «Dere virker enige så da er jeg fornøyd med deres anbefaling.» Anbefalingen var
  «A, sammen med 5b-B», og den sa at avviket fra #1127 må besluttes uttrykkelig. Forkastet: B
  og C slik de står. Svaret føres i vedtaksregisteret i en egen vedtaks-PR, og #1127 føres
  etter dette svaret.
- **Sparring 25.10:** B, A og anbefalingen er rettet etter sparring mellom økta, oppdragsgiver
  og en annen modell: TEs opplysning skilles fra fristens rettslige utgangspunkt, byggherren
  bestrider datoen i svaret (OV-U41, fordi bestridelse som eget utsagn er utsatt etter OV-U7),
  påberopelsen bevares (VS-U9), og forholdet til MM-U21 er skrevet i B. A har fått ordlyden fra
  OV-U41. Prøvingen mot vedtaksfila etter sparringen fant at B manglet grensen i HF-U4 for et
  «i tide» byggherren alt har gitt, og at forholdene i A og B var ufullstendige. Det er rettet.
  I en ny runde ble forholdet til MM-U21 i B og C endret fra «presiserer» til «snevrer inn»,
  fordi HF-U8 regulerer bortfallet av byggherrens tilbud, ikke hvordan en korrigert opplysning
  behandles. HF-U4 er skrevet ut i B, rettidigheten er lagt til svaret der den behandles, og
  grensene i KA-U7 og OV-U3 er tatt inn. Den andre prøvingen mot vedtaksfila fant at frafallet
  (GR-U20), unntaket i HF-U6 og avgrensningen i HF-U4 til utsagn sendt fra løsningen manglet, og
  at 5-B og 5b-B ikke kan velges sammen. Det er rettet. B sier også at et svar på vederlag eller
  frist står etter en ny grunnlagsversjon (HF-U21), så byggherren tar stilling til en endret
  kunnskapsdato der først ved en ny kravversjon i sporet. I en ny runde ble setningen om
  HF-U21 utvidet med grensene i GR-U7 og OV-U3, begrunnelsen for B bygget på retten til å
  fremsette et nytt faktisk utsagn, og følgen for en subsidiær godkjenning av grunnlaget og
  forholdet til OV-U11 skrevet ut. Etter den runden snudde sparringen anbefalingen fra B til A,
  sammen med 5b-B, fordi B lar en faktakorrigering avslå byggherrens subsidiære godkjenning av
  grunnlaget. Alternativene står åpne.
- **Revurderingen 25.10: alternativ D (foreslått).** Forslaget har ikke vært lagt fram for
  oppdragsgiver. Velges D, erstatter det svaret 25.10 (5-A), og 5b-B presiseres (se spørsmål
  5b).
  - **D:** «TE kan endre sin opplysning etter VS-U26 om når pålegget ble mottatt eller TE ble
    klar over forholdet, i et eget brev med henvisning til brevet med opplysningen. Brevet er
    ikke en ny kravversjon og avslår ikke byggherrens svar. Det sier: ‹TE oppgir nå at
    <pålegget ble mottatt | TE ble klar over forholdet> <dato>. I brev <n> av <dato> oppga TE
    <dato>.› Den nye opplysningen gjelder straks som TEs siste opplysning, uten byggherrens
    godkjenning, også når datoen er senere. Den nye opplysningen erstatter ikke innholdet i
    tidligere brev eller premissene i tidligere svar. Tidligere opplysninger beholdes og vises,
    og visningen sier hvilken opplysning et svar gjaldt. Løsningen avgjør ikke hvilken
    opplysning som er riktig, når varslingsfristen begynte å løpe eller om varselet var
    rettidig. En ny grunnlagsversjon kan ikke endre datoen. Den gjengir TEs siste opplysning,
    med henvisning til brevet med korrigeringen, og endrer ikke tidligere brev eller premissene
    i tidligere svar. I underkategorien endringsordre,
    der TE ikke oppgir noen slik dato, avvises brevet. Brevet godtas også i et spor med enighet
    og når kravene er avgjort, og det endrer ikke utfallet. Et svar byggherren alt har gitt,
    står med virkningen det hadde. Byggherren tar stilling til opplysningen i et senere svar der
    rettidigheten etter den aktuelle bestemmelsen behandles, eller i en revisjon som ellers er
    tillatt (HF-U5). Sporet venter ikke på et nytt svar i løsningen, og løsningen avgjør ikke om
    korrigeringen gir byggherren en plikt etter kontrakten (MM-U12). Korrigeringen gir ikke
    byggherren adgang til å svekke et svar som alt er gitt. En påberopelse byggherren alt har fremsatt, bevares med
    tidspunktet (VS-U9). Har byggherren i et utsagn sendt fra løsningen uttrykkelig sagt at
    varselet kom i tide, eller gitt opp innsigelsen, står det (HF-U4). Snevrer inn MM-U21 for
    datoopplysningen i VS-U26, og snevrer inn GR-U22. Presiserer VS-U26. Utvider OV-U3
    og LV-U4. OV-U11 står. OV-U41 avgjøres i alternativ E.»
  - **Begrunnelse:** etter MM-U21 kan TE alt si den nye datoen straks; byggherrens godkjenning
    avgjør bare hvilken dato som gjelder i løsningen. For datoen i VS-U26 er det ikke nødvendig.
    Byggherren mister ikke noe så lenge grensene i D holdes: den nye opplysningen erstatter
    ikke premissene i et svar, den tidligere står synlig, og løsningen sier ikke hvilken som er
    riktig. D beholder det 5-A og 5b-B skulle sikre, at en faktakorrigering ikke avslår
    byggherrens subsidiære godkjenning av grunnlaget, uten en godkjenningsflyt for datoen. D
    avviker fortsatt fra føringen i #1127, fordi datoen ikke endres i en ny versjon, men den
    ligger nærmere: den nye datoen gjelder straks som TEs opplysning. Løsningen regner i dag
    ingen frist ut fra datoen; den står i brevteksten og kontrolleres for at den finnes (L,
    `kjerne/frosset/brevtekst.ts`, `kjerne/utledning/visning.ts`). Det er en opplysning om hva
    D krever å bygge, ikke grunnlaget for unntaket.
  - **Avgrensningen:** D er et navngitt unntak for opplysningene i VS-U26, ikke en generell regel.
    Sparringen forkastet en generell regel om at motpartens godkjenning bare kreves når
    løsningen bruker opplysningen som premiss for en utledning. Om godkjenning trengs, bør ikke
    avhenge av hva koden leser. OV-U11 står, fordi datoen for et varsel sendt utenfor
    løsningen er premiss for nye svar og avgjør hvilket varsel som er det første (HF-U13).
    OV-U41 gjelder samme slags opplysning, TEs utsagn om når TE faktisk ble klar over noe, men
    for varselet etter § 34.1.3, og der krever en senere dato fortsatt byggherrens godkjenning.
    Det er ingen prinsipiell grunn til forskjellen, og OV-U41 legges derfor fram uttrykkelig som
    alternativ E.
    D gir ikke byggherren ny adgang til å svekke et svar som alt er gitt, heller ikke når den
    nye datoen er tidligere. OV-U5 og OV-U11 har en slik adgang for varseldatoen. Å gi den her
    er et eget valg som må vurderes mot HF-U4 og HF-U5. Rettingen etter MM-U21 står for beløp, avkall og andre
    utsagn som endrer partenes rettigheter eller plikter.
  - **Prøvd mot vedtaksfila 25.10** av en subagent. Rettelsene er tatt inn: forholdet til MM-U21
    heter «snevrer inn», brevet godtas etter enighet og når kravene er avgjort (OV-U3),
    byggherrens stillingtaken følger HF-U5, underkategorien endringsordre
    er dekket, og forholdet til OV-U41 er skrevet ut. En åpning prøvingen foreslo, at byggherren
    ved en tidligere dato kunne ta stilling på nytt etter mønsteret i OV-U11, er tatt ut igjen
    etter sparringen.
  - **Sparring 25.10**, ordrett. Den ene modellen: «Kutt ut kravet om at BH må ‹godkjenne›
    rettingen!» Den andre: «For datoopplysningene i VS-U26 støtter jeg et nytt utsagn som straks
    vises som TEs siste opplysning, uten BHs godkjenning og uten å avslå BHs svar.» og «Om
    motpartens godkjenning trengs, bør ikke avhenge utelukkende av hva dagens kode leser. En
    opplysning kan ha betydning for partenes disposisjoner selv om løsningen ikke bruker den.
    Omvendt gjør bruk i en beregning ikke automatisk godkjenning nødvendig.» og «Kall den ‹TEs
    siste opplysning›, ikke ‹riktig dato›, ‹avtalt dato› eller et nytt felles premiss.»

- **Revurderingen 25.10: alternativ E (foreslått), kunnskapsdatoen etter OV-U41.** Forslaget har
  ikke vært lagt fram for oppdragsgiver. E kan bare velges sammen med 5-D, og endrer OV-U41,
  vedtatt 24.10.
  - **E:** «TE kan endre opplysningen om når TE ble klar over at økte utgifter på grunn av
    nedsatt produktivitet eller forstyrrelser på annet arbeid ville påløpe (§ 34.1.3 annet
    ledd), i et eget utsagn med henvisning til varselet det gjelder. Den nye opplysningen gjelder
    straks som TEs siste opplysning, uten byggherrens godkjenning, også når datoen er senere.
    Den erstatter ikke innholdet i tidligere brev eller premissene i tidligere svar. Alle
    datoene TE har oppgitt, beholdes og vises, og visningen sier hvilken opplysning et svar
    gjaldt. Løsningen avgjør ikke hvilken dato som faktisk eller rettslig skal legges til grunn,
    og beregner ikke rettidighet eller preklusjonsvirkning. Et svar byggherren alt har gitt,
    står med virkningen det hadde. Byggherren tar stilling i et senere svar der rettidigheten
    behandles, eller i en revisjon som ellers er tillatt (HF-U5). Sporet venter ikke på et nytt
    svar i løsningen. Endrer OV-U41 på punktet om retting til TEs fordel. Snevrer inn MM-U21.»
  - **Begrunnelse:** OV-U41 og datoopplysningen i 5-D gjelder samme slags opplysning, TEs utsagn
    om når TE faktisk ble klar over noe, og det er ingen prinsipiell grunn til at de skal rettes
    ulikt. Står OV-U41, må godkjenningsflyten etter MM-U21 bygges for denne ene datoen. OV-U11
    står, fordi varseldatoen etter OV-U5 er premiss for nye svar og avgjør hvilket varsel som er
    det første (HF-U13). E vurderes uttrykkelig og endrer ikke OV-U41 gjennom 5-D.

### Spørsmål 5b. En ny kravversjon som avslag på byggherrens svar (HF-U8)

- **Bakgrunn:** HF-U8 (15.10) sier: «Den nye kravversjonen er TEs avslag på svaret og et nytt
  tilbud (avtaleloven § 5 og § 6).» Det gjelder «også med uendrede verdier». Vurderingen bak
  vedtaket (#504) skilte loven fra produktvalget i raden for vedtaket 05.10 om at hver
  oppdatering er en ny kravversjon: «En ny versjon avslår svaret også med
  uendrede verdier. At den er en kravversjon også da, er et produktvalg.» Vedtaksteksten har
  ikke det skillet. Etter avtaleloven § 5 og § 6 avgjør innholdet i TEs meddelelse om
  byggherrens tilbud er avslått. Brevet ved en ny versjon sier i dag bare: «Kravet erstatter
  TEs krav i brev <n> av <dato>.» (LV-U4 punkt 1). En ny versjon som bare retter en opplysning,
  er da ikke nødvendigvis et avslag etter sitt innhold, men løsningen behandler den som det.
  HF-U5 sier at bindingen i løsningen varer til TE sender en ny kravversjon. En retting som
  lar svaret stå (MM-U21), er vedtatt, men ikke bygget. I dag er en ny kravversjon derfor den
  eneste måten TE kan endre en opplysning i et krav på i løsningen. OV-U41 gir en egen vei for
  kunnskapsdatoen etter § 34.1.3, som bygges i #1171. Et brev sendt
  utenfor løsningen og registrert der, endrer ikke opplysningen (OV-U4). Vedtaket 05.10 sier
  at «Hver oppdatering fra TE av et vederlags- eller fristkrav er en ny kravversjon, også når
  verdiene er uendret.» KA-U2 regner også grunnlagsversjonene som kravversjoner. I
  grunnlagssporet gir en godkjenning av hele grunnlaget sammenfall og dermed enighet (GR-U7),
  så en ny versjon avvises (KA-U7). Et tilbud som fortsatt binder i grunnlagssporet, er derfor
  en subsidiær godkjenning av grunnlaget der byggherren prinsipalt har påberopt at varselet
  kom for sent (HF-U7; `godkjennerHeleKravet` i `kjerne/frosset/standpunkt.ts`).
- **Belegg:** avtaleloven §§ 4–6. HF-U4, HF-U5, HF-U6, HF-U7, HF-U8, HF-U15, HF-U18, HF-U21,
  GR-U7, GR-U20, FO-U5, FO-U7, VS-U9, KA-U2, KA-U7, OV-U3, OV-U4, LV-U4, MM-U9, MM-U21, vedtaket
  05.10 om nye kravversjoner.
- **Alternativene:**
  - **A:** «I løsningen er en ny kravversjon TEs avslag på byggherrens tilbud i
    svaret på gjeldende kravversjon i samme spor, også med uendrede verdier, når svaret har et
    standpunkt som fortsatt binder byggherren etter HF-U5: godkjent grunnlag, beløp eller
    dager, prinsipalt eller subsidiært. Bestemmelsen gjelder bare når en ny kravversjon ellers
    er tillatt (KA-U7, OV-U3); et svar som har gitt enighet, åpner ikke for en ny kravversjon.
    Brevet sier avslaget uttrykkelig: ‹TE avslår byggherrens tilbud i svaret i brev <n> av
    <dato> og fremsetter det reviderte kravet nedenfor.› Har svaret ikke et slikt standpunkt,
    for eksempel et helt avslag (HF-U15), et frafall (GR-U20) eller et svar der akseptfristen er
    ute (HF-U5, HF-U18), sier brevet bare at kravet erstatter TEs tidligere krav. Finnes det et
    svar på gjeldende kravversjon, sier skjemaet før TE sender hva den nye versjonen gjør med
    det: avslår den et tilbud som fortsatt binder byggherren, sier skjemaet det, også når TEs
    aksept er sperret (FO-U5); kan svaret ellers godtas, også etter akseptfristen (HF-U18), sier
    skjemaet at det ikke kan godtas her når versjonen er sendt (HF-U8). Det gjelder også når TE
    bare endrer en opplysning. Skjemaet sier også at et uttrykkelig standpunkt om at et varsel
    kom i tide, og et avkall, står (HF-U4, HF-U8). Avslaget gjelder tilbudet i svaret i samme
    spor; en ny grunnlagsversjon avslår ikke svarene på vederlag og frist (HF-U21). En
    innsigelse byggherren har fremsatt, bevares som påberopelse med tidspunktet (VS-U9), uten
    at løsningen avgjør om den er virksom, og et frafall står (GR-U20). Den nye teksten gjelder
    bare nye brev (MM-U9). Endrer HF-U8 og presiserer HF-U5: bortfallet av et tilbud som
    fortsatt binder byggherren, følger av avslaget i brevet. At et svar på en tidligere
    kravversjon ikke kan godtas i løsningen, følger fortsatt av versjonsmodellen (HF-U8).
    Utvider LV-U4.»
  - **B (anbefalt):** «Som A, med dette tillegget. En endring som bare retter en faktisk
    opplysning TE har oppgitt i kravet, som en dato, et nummer eller en henvisning, uten å
    endre det TE krever, er en korrigering. Korrigeringen er et eget utsagn etter MM-U21, ikke
    en ny kravversjon, og lar svaret stå. En ny kravversjon som bare retter en slik opplysning,
    avvises, og TE sender korrigeringen i stedet. Rettingen etter MM-U21 bygges før første ekte
    sak, og det som står åpent om den under B-16, avgjøres da. Snevrer i tillegg inn vedtaket
    05.10 om at hver oppdatering av et vederlags- eller fristkrav er en ny kravversjon, KA-U2 og
    GR-U22, og presiserer MM-U21.»
  - **C:** «HF-U8 står. Brevet sier som i dag at kravet erstatter TEs tidligere krav.»
- **Anbefaling:** B, sammen med 5-A. B har avslagsregelen fra A for reelle nye kravversjoner,
  som en uttrykkelig og informert handling. Virkningen følger da av
  innholdet i brevet, slik avtaleloven § 5 og § 6 forutsetter, og TE ser følgen før brevet
  sendes. A knytter avslaget til et standpunkt som binder byggherren etter HF-U5, ikke til om
  TE kan godta svaret. Da står avslaget også når aksepten er sperret mens svaret binder (FO-U5,
  FO-U7), og brevet sier ikke at TE avslår et tilbud når svaret er et helt avslag (HF-U15).
  Etter akseptfristen er tilbudet bortfalt (avtaleloven § 2, HF-U8), og brevet trenger ikke avslå
  det; at TE ikke lenger kan tilby å godta svaret her etter HF-U18, er en begrensning i
  løsningen, ikke en regel om hva partene senere kan avtale. B legger til en vei for å rette
  en opplysning uten å avslå byggherrens svar. Uten den må TE avslå et tilbud for å rette en
  opplysning i kravet, også byggherrens subsidiære godkjenning av grunnlaget (spørsmål 5). B
  krever rettingsflyten i MM-U21, som ikke er bygget, og avgjørelsen av det som står åpent om
  den under B-16: aktørrettigheter, godkjenning og innsyn for motparten. A er det minste
  alternativet, men lar en ren retting avslå svaret.
  Til den finnes, er et brev utenfor løsningen dokumentasjon (OV-U4) og endrer ikke
  opplysningen i løsningen. C lar et produktvalg stå som om det fulgte av loven. A bygger på
  tilbudsmodellen i HF-U5 og sier ikke at hvert svar fra byggherren rettslig er et tilbud i
  alle deler. Eldre kravversjoner får ikke et avslag lagt til i ettertid.
- **Hva valget styrer:** brevteksten ved en ny kravversjon og skjemaet før sending. Brevteksten
  fryses med brevet, så regelversjonen og projeksjonsversjonen økes. Ordlyden i skjemaet føres
  som arbeidsvalg i byggeissuet. Sparringen foreslo: «Når du sender denne kravversjonen, avslår
  du byggherrens tilbud i brev <n>. Du kan da ikke godta det her. Det gjelder også når du bare
  retter en opplysning.» Etter akseptfristen: «Akseptfristen er utløpt. Sender du en ny
  kravversjon, kan du ikke lenger tilby å godta dette svaret her.» Velges B, får hovedplanen en
  datert merknad ved B-16 og produksjonsporten F5 når vedtaket føres, fordi rekkefølgen har sitt
  hjem der.
- **Avhenger av:** spørsmål 5. De avgjøres sammen. 5b-B kan ikke velges sammen med 5-B eller
  5-C, fordi de lar datoen endres i en ny versjon, mens 5b-B legger korrigeringen til MM-U21. De
  andre kombinasjonene henger sammen. Anbefalt er 5-A med 5b-B. Ikke av spørsmål 1.
- **Svar 25.10 (oppdragsgiver):** B, sammen med 5-A, med leveransekravet i B: rettingen etter
  MM-U21 bygges før første ekte sak. Det går lenger enn hovedplanens krav før produksjon, som
  åpner for en manuell prosess (B-16). Oppdragsgiver ordrett: «Dere virker enige så da er jeg
  fornøyd med deres anbefaling.» Forkastet: C slik den står. A inngår i B; i
  vedtaksregisteret føres B med teksten i A skrevet ut ordrett, så vedtaket kan stå alene.
  Svaret føres i vedtaksregisteret i en egen vedtaks-PR.
- **Føring for arbeidet med B-16 (sparringen 25.10, ikke del av vedtaksteksten):** byggherrens
  godkjenning av en korrigert dato skilles fra byggherrens vurdering av rettidigheten.
  Byggherren kan godta at TE mottok pålegget en bestemt dag og fortsatt mene at varselet kom
  for sent. Godkjenningen av rettingen er ikke i seg selv et «i tide»-standpunkt eller et
  frafall av innsigelsen etter HF-U4, som bare gjelder et uttrykkelig utsagn. Ført i #276.
- **Sparring 25.10:** spørsmålet kom fra oppdragsgiver i sparringen om spørsmål 5, og er
  utformet i sparring mellom økta, oppdragsgiver og en annen modell. Den rettet «TE godtar
  ikke» til et uttrykkelig avslag, avgrenset avslaget til et svar som kan godtas, og tok ut
  begrunnelsen om at TE kan rette uten å avslå, fordi MM-U21 ikke er bygget. Prøvingen mot
  vedtaksfila fant at avgrensningen til et svar som kan godtas, ikke passet med en sperret
  aksept (FO-U5), et helt avslag (HF-U15), et frafall (GR-U20) og svarene i andre spor
  (HF-U21), og at forholdet i B var uklart. A er avgrenset til et standpunkt som binder etter
  HF-U5, og B er rettet. I en ny runde fikk A grensen for enighet (KA-U7, OV-U3), skjemaet
  dekker en sperret aksept og tiden etter akseptfristen, og virkningen av versjonsmodellen er
  skilt fra virkningen av avslaget. B er skrevet som A med en egen retting, og forholdet til
  vedtaket 05.10 er kontrollert mot vedtaksteksten. Deretter snudde sparringen anbefalingen fra
  A til B, sammen med 5-A (se spørsmål 5). Prøvingen av den nye anbefalingen fant at B ikke
  avgrenset hva en korrigering er, og at forholdet til GR-U22 manglet; det er rettet.
  Alternativene står åpne.
- **Revurderingen 25.10 (foreslått):** forslaget har ikke vært lagt fram for oppdragsgiver
  som vedtakstekst. Velges det sammen med 5-D, erstatter det avvisningen i svaret 25.10 (5b-B)
  av en ny kravversjon som bare retter en opplysning. Avslagsregelen fra 5b-A for nye
  kravversjoner står. Oppdragsgiver ga to føringer 25.10, ordrett: «bør det være påkrevd for
  TE å oppgi grunnlag først? Det går raskt og setter betingelser for øvrige spor. Utdypende
  begrunnelse til grunnlaget kan TE sende i ny revisjon» og «det skal ikke være mulig for TE å
  endre kategori etter sendt grunnlag. Jeg ser ingen grunn til at TE skal kunne endre
  henvisning til EO heller.» At grunnlaget sendes først, er vedtatt (KA-U15) og bygget (L,
  `GRUNNLAG_IKKE_SENDT` i `kjerne/kommandoer/forutsetninger.ts`). At kategorien står, er
  vedtatt i GR-U22.
  - **Utdyping og korrigering:** «Når TE har sendt grunnlaget, står hovedkategorien,
    underkategorien og, i underkategorien endringsordre, henvisningen til endringsordren. En ny
    grunnlagsversjon kan ikke endre dem. Datoopplysningen i grunnlagskravet om når pålegget
    ble mottatt eller TE ble klar over forholdet, endres bare etter egne regler. Vil TE påberope
    en annen hjemmel eller en annen endringsordre, går det i en ny sak etter GR-U22. En enighet
    i saken står (KA-U7), og løsningen flytter den ikke til den nye saken. TE kan sende en
    utdypende begrunnelse eller korrigere en betegnelse, for eksempel nummeret på samme
    endringsordre, med henvisning til kravet. TE velger i skjemaet mellom dette og en ny
    kravversjon, og skjemaet sier følgen av hvert valg. Utdypingen endrer ikke kravets
    strukturerte opplysninger og behandles ikke som en ny kravversjon. Den endrer ikke i seg
    selv løsningens utledning av tidligere svar eller enigheter, og den godtas også i et spor
    med enighet og når kravene er avgjort. Sporet venter ikke på et nytt svar i løsningen.
    Byggherren kan ta utdypingen med i et senere svar eller i en revisjon som ellers er
    tillatt (HF-U5). Brevet sier: ‹TE utdyper sitt krav om <grunnlaget / justering av
    vederlaget / fristforlengelse> i brev <n> av <dato>:›, og TEs tekst følger. Tidligere utsagn
    og dokumentkoblinger står uendret. Løsningen tolker ikke teksten for å avgjøre om den
    inneholder et endret krav eller andre rettslige utsagn. En ny grunnlagsversjon med samme hjemmel er fortsatt mulig
    der GR-U22 og sperrene etter enighet (KA-U7, OV-U3) tillater den, og den avslår byggherrens
    tilbud i grunnlagssporet etter avslagsregelen. Varseldatoen etter OV-U11 og rettinger fra
    byggherren følger MM-U21. Endrer avvisningen i svaret 25.10 på spørsmål 5b. Snevrer inn
    GR-U22 for henvisningen til endringsordren og MM-U21 for opplysninger i fritekst. Endrer
    OV-U7, som utsatte senere begrunnelse fra løsningen, for TEs utdyping. Utvider OV-U3 og
    LV-U4. Følger mønsteret i KA-U34.» Henvisningene til svarene 25.10 byttes med vedtaks-ID-ene når svarene
    føres.
  - **Begrunnelse:** arbeidsmåten oppdragsgiver beskriver, et raskt grunnlag og en utdypet
    begrunnelse senere, er god og har støtte i kontrakten: der § 32.2 gjelder, skal TE varsle
    uten ugrunnet opphold. Men i dag kan TE bare utdype gjennom en ny grunnlagsversjon, og har
    byggherren svart, avslår den byggherrens tilbud, også en subsidiær godkjenning av
    grunnlaget. Et eget utsagn lar TE utdype uten den følgen. At henvisningen til
    endringsordren står, lukker veien prøvingen fant: en ny grunnlagsversjon med en annen
    endringsordre mens vederlaget var avtalt, flyttet byggherrens enighet om beløpet til et
    annet dokument uten byggherrens tilslutning. En skrivefeil i nummeret forklares i et
    utsagn i fritekst; er det en annen endringsordre, er det en annen hjemmel og en ny sak,
    der overføringen ikke er et avkall (GR-U22). Avvisningen i 5b-B kunne ikke håndheves, fordi
    løsningen ikke tolker fritekst og ikke kan skille en skrivefeil fra et bytte i et tekstfelt
    (L, `endringsordre` i `KRAVINNHOLD`, `kjerne/format/format.ts`). Skillet følger derfor TEs
    valg, som i spørsmål 3b. Utdyping og korrigering av en betegnelse er samme handling, fordi
    ingen av dem endrer noe felt. Datoopplysningen er ikke låst: den korrigeres etter 5-D uten
    å åpne byggherrens svar på nytt.
  - **Spørsmål til oppdragsgiver om rekkefølgen:** byggherrens senere begrunnelse etter KA-U34
    er samme mekanisme for den andre parten, og OV-U7 utsatte den. Skal den bygges sammen med
    TEs utdyping i første versjon? Anbefaling: ja. Handlingen er den samme, og partene får like
    muligheter. Begge endrer OV-U7.
  - **Leveransekravet, alternativene:** utsagnet og brevet etter 5-D bygges før første ekte
    sak i begge alternativene, fordi de er TEs vei til å utdype eller rette uten å avslå
    byggherrens svar. Rettingen etter MM-U21 gjelder da varseldatoen etter OV-U11, rettinger
    fra byggherren og kunnskapsdatoen etter OV-U41 hvis 5-E ikke velges. Hovedplanen krever
    under B-16 en korrigeringsprosess før produksjon, men godtar en manuell prosess.
    - **L1:** «Rettingen etter MM-U21 for de tilfellene den gjelder, bygges før første ekte
      sak.» Dette er kravet fra svaret 25.10.
    - **L2:** «Rettingen etter MM-U21 for de tilfellene den gjelder, bygges før produksjon.
      Fram til den er bygget, rettes slike opplysninger i den manuelle prosessen etter B-16.
      Utsagnet for utdyping og korrigering og brevet etter 5-D bygges før første ekte sak.»

    Sparringen mener L2 kan være nok. Valget er oppdragsgivers.
  - **Prøvd mot vedtakene og arbeidsflyten 25.10** av en subagent, på commit `94dc93c`, og med
    fire forløp på commit `3779571`. Rettelsene er tatt inn: utsagnet endrer ingen felt, TE
    opplyser at det gjelder samme krav, og hva MM-U21 dekker, er samkjørt. Forløpene fant at en
    ny grunnlagsversjon kunne bytte endringsordre etter enighet; oppdragsgivers føring lukker
    det. Prøvingen foreslo at TE trekker og fremmer kravet i en ny sak; sparringen byttet det
    ut, og GR-U22 gir nå veien uten avkall. Sparringen etter oppdragsgivers føring skrev om
    utdypingen så vedtaket beskriver løsningens behandling og ikke garanterer at en tekst TE
    kaller utdyping, er uten rettslig betydning, og fant forholdet til OV-U7.
  - **Sparring 25.10**, ordrett: «Samme endring kan ha samme betydning uansett lagringsform.
    Å bytte hvilken endringsordre kravet bygger på, er ikke nødvendigvis en ren
    opplysningsretting fordi henvisningen står i fritekst.» og «Løsningen trenger ikke tolke
    friteksten. TE må velge hvilken handling hen foretar.» og «‹Trekker og fremmer kravet i en
    ny sak› kan påføre TE et avkall og fjerne en eksisterende enighet.»

### Spørsmål 6. Beløp med øre (VG-F-02)

- **Bakgrunn:** Formatet og kjernen tar imot beløp med øre. Skjemaene tar i dag bare sifre og
  gjør «100 000,40» om til 10 000 040 kr. Det er en egen feil (#1285). Løsningen regner
  byggherrens beløp som full godkjenning når begge rundes til samme krone (B-13, «til nærmeste
  krone»). Krever TE 100 000,40 kr og godkjenner byggherren 99 999,60 kr, må byggherren velge
  «delvis». Løsningen regner likevel beløpet som fullt godkjent. Når de andre vilkårene for
  sammenfall er oppfylt, registrerer den enighet uten at TE har godtatt svaret. Svaret krever
  heller ingen begrunnelse, selv om KA-U24 krever det ved delvis godkjenning. Brevet sier
  «Byggherren godkjenner 99 999,60 kr eks. mva.» i formen for full godkjenning (K, L). KA-U9
  sier: «Det er «godkjent» når beløpene er like, og «delvis» når byggherrens beløp er mindre
  gunstig for TE.» Etter avtaleloven § 6 første ledd er et svar som fremtrer som aksept, men
  avviker fra tilbudet, som hovedregel avslag og nytt tilbud, også når avviket er lite. Annet
  ledd gjelder at den som svarer, mener at svaret stemmer med tilbudet, at tilbyderen må forstå
  det, og at tilbyderen ikke sier fra uten ugrunnet opphold. Det er ingen regel om avrunding.
  Omtalen av annet ledd i HF-U7 avklares i #1284. OV-U39 avrunder bare regnestykket til hele
  kroner. OV-U40 runder også av beløpet parten oppgir («avrundet på samme måte»), og det tyder
  på at det beløpet kan ha øre. Et beløp med brøkdeler av øre rundes i dag av til øre uten at
  noen ser det, også før kontrollen av at byggherrens beløp ikke er høyere enn kravet (K). Den
  avrundingen står ikke i et vedtak.
- **Belegg:** B-13, KA-U9, KA-U24, HF-U7, LV-U4 punkt 5, OV-U39, OV-U40, avtaleloven § 6.
- **6a. Presisjonen:**
  - **A (anbefalt):** «Beløp parten krever eller godkjenner, prinsipalt og subsidiært, også et
    anslått beløp ved regning (VS-U28), beløpet for hver post og beløpet etter en påberopt
    begrensning, oppgis i kroner med høyst to desimaler. Desimalkommaet bevares: 100 000,40 er
    100 000 kroner og 40 øre. Et beløp med brøkdeler av øre, eller i et format løsningen ikke
    støtter, avvises tydelig. Det rundes ikke av og gjøres ikke om ved å fjerne skilletegn.
    Kontrollen gjøres på verdien parten sendte, før kontrollen av beløpene, resultatet, kravet
    om begrunnelse og sammenfallet utledes. Avsluttende nuller godtas når verdien fortsatt er
    et helt antall øre. Antatt kostnad ved forsering (FO-U2) og beløp i en endringsordre (EO-U8)
    følger samme regel når de bygges (OV-U1). Beregningsverdiene i OV-U39 og avrundingen av
    regnestykket står uendret.»
    Forholdet til vedtakene: ny regel. Presiserer OV-U39 («beløpet TE krever, i kroner ekskl.
    mva.»). At beløp i dag rundes av til øre, er ikke vedtatt.
  - **B:** «Beløp parten krever eller godkjenner, prinsipalt og subsidiært, også et anslått
    beløp ved regning (VS-U28), beløpet for hver post og beløpet etter en påberopt begrensning,
    oppgis i hele kroner. Et beløp med desimaler som ikke er null, avvises og rundes ikke av.
    Antatt kostnad ved forsering (FO-U2) og beløp i en endringsordre (EO-U8) følger samme regel
    når de bygges (OV-U1). Grensen gjelder ikke beregningsverdiene i OV-U39.»
    Forholdet til vedtakene: ny regel for krav og svar. Presiserer OV-U39 for beløpet TE krever
    i posten for rigg og drift. Avrundingen av partens beløp i OV-U40 får ingen virkning.
- **6b. Sammenlikningen:**
  - **A (anbefalt):** «Løsningen sammenlikner beløpene i krav og svar i hele øre, uten avrunding
    til hele kroner. Et beløp som er mindre gunstig for TE enn det krevde (KA-U9), er ikke full
    godkjenning av beløpet, selv om beløpene blir like når de rundes til hele kroner. De andre
    vilkårene for sammenfall står uendret. Løsningen avgjør ikke om partene likevel har inngått
    avtale etter en konkret rettslig vurdering (MM-U12).»
    Forholdet til vedtakene: endrer B-13 «til nærmeste krone» for beløp. Dagene endres ikke.
    Presiserer HF-U7: «krone» i «i kravets egen enhet: krone eller dag» er enheten, og beløpet
    sammenliknes med øre. I tråd med KA-U9. OV-U40 står uendret.
  - **B:** «Som i dag (B-13).»
    Forholdet til vedtakene: B-13 «til nærmeste krone» står. To ulike beløp som rundes til samme
    hele krone, regnes som like, og det gjør unntak fra KA-U9 og HF-U7 for de beløpene. Regelen
    gjelder ikke ethvert avvik under én krone: et mindre avvik kan havne på hver sin side av en
    avrundingsgrense.
- **Anbefaling:** 6a-A og 6b-A. Et krav om hele kroner er et produktvalg som ikke kreves av de
  gjennomgåtte kontraktsbestemmelsene, og det kan tvinge en part til å oppgi et annet beløp enn
  den ellers ville krevd eller godkjent. 6b-A anbefales også hvis 6a-B velges, så avrundingen
  ikke ligger igjen og kommer tilbake om grensen senere endres. Det tidligere alternativet om
  bare brevteksten er tatt ut: brevet ville si delvis godkjenning, mens løsningen fortsatt
  registrerte enighet.
- **Hva valget styrer:** sammenlikningen i kjernen, i skjemaet og i brevteksten, kravet om
  begrunnelse, og avvisningen av brøkdeler av øre. Skjemaene tar imot beløpet eller avviser
  det, men gjør det ikke om (#1285). Brevteksten fryses med brevet, så både regelversjonen og
  projeksjonsversjonen økes. Brevteksten følger resultatet uten endring i LV-U4. Python-stien
  følger DL-U2.
- **Avhenger av spørsmål 1:** nei.
- **Svar 25.10 (oppdragsgiver):** 6a-A og 6b-A. Oppdragsgiver ordrett: «Støtter meg til Astra:
  6a-A og 6b-A. De nye funnene styrker anbefalingen.» Presiseringene om desimalkommaet, om
  kontrollen før avrunding og om avsluttende nuller i svaret er tatt inn i 6a-A, og
  presiseringen av 6b-B i forholdet. Ordrett:
  - «Desimalkomma skal bevares: 100 000,40 skal bli 100 000 kroner og 40 øre. Et format
    løsningen ikke støtter, skal avvises tydelig, aldri omformes ved å fjerne skilletegn.»
  - «Valider før avrunding: Brøkdeler av øre avvises før beløpskontroller, resultat,
    begrunnelseskrav og sammenfall utledes. Avsluttende nuller kan godtas når verdien fortsatt
    er et helt antall øre.»
  - «Rett beskrivelsen av 6b-B: Dagens regel er ikke generelt et unntak for ‹avvik under én
    krone›. Den gjelder ulike beløp som avrundes til samme hele krone. Også mindre avvik kan
    havne på hver sin side av en avrundingsgrense.»
  - «Feilen i #1285 må være rettet før ekte bruk. Prøvingen bør kontrollere hele forløpet fra
    inntasting til sendt brev, inkludert at et mindre gunstig beløp ikke blir full godkjenning
    eller slipper begrunnelse på grunn av avrunding.» Ført som kommentar i #1285.

  Forkastet: 6a-B og 6b-B slik de står. Svaret føres i vedtaksregisteret i en egen vedtaks-PR.
- **Sparring 25.10:** spørsmålet ble rettet etter oppdragsgivers kritikk av den første formen,
  der B («hele kroner») var anbefalt fordi «problemet forsvinner uten å endre et vedtak».
  Kritikken ordrett: «B er et mulig produktvalg, men ‹problemet forsvinner uten å endre et
  vedtak› er ikke tilstrekkelig underbygget. At OV-U39 avrunder et beregningsresultat til hele
  kroner, betyr ikke nødvendigvis at alle krav og svar skal begrenses til hele kroner.» To
  runder med en annen modell ga omfanget i 6a, avvisningen i stedet for avrunding, kontrollen
  før avrunding og ordlyden i 6b-A. Sparringen er ikke oppdragsgivers svar. Ordrett:
  - «Avtaleloven § 6 første ledd gjelder svar som fremtrer som aksept, men avviker fra
    tilbudet. Annet ledd er ingen generell avrundingsregel.»
  - «Jeg anbefaler derfor å endre B-13 uttrykkelig. KA-U9s senere dato løser ikke forholdet
    alene; dere har allerede avklart at senere vedtak ikke automatisk går foran.»
  - «Et krav om hele kroner kan tvinge parten til å oppgi et annet beløp enn det parten ellers
    ville krevd eller godkjent.»
  - «Kontrollen må skje før avrunding. […] Et beløp som allerede er avrundet, kan ikke
    valideres mot den opprinnelige opplysningen.»
- **Prøvd mot vedtaksfila 25.10** av en subagent, som også kontrollerte påstandene om koden og
  kjørte avrundingen. Prøvingen ga disse rettelsene: omfanget i 6a dekker subsidiært beløp,
  anslag ved regning, forsering og endringsordrer, forholdet i 6b-A nevner HF-U7, 6b-B har
  forhold, sitatet fra KA-U9 er ordrett, OV-U40 står som slutning, enigheten forutsetter de
  andre vilkårene for sammenfall, KA-U24 er tatt med, begge versjonene økes, og feilen i
  skjemaene er ført i #1285. Presiseringene i svaret kom etter prøvingen.

### Spørsmål 7. Datoene bak forlengelsen i posten for rigg og drift (VG-G-02)

- **Bakgrunn:** OV-U37 sier: «Appen viser forlengelsen og den nye overtakelsesdatoen som TEs
  premiss, ikke som avtalt.» OV-U39 lister det TE oppgir, og der er ingen overtakelsesdato, bare
  forlengelsen i hverdager og perioden. Etter kontraktsgrunnlaget Del II pkt. B.2.16 er
  forlengelsen differansen mellom opprinnelig og ny byggetid. Opprinnelig byggetid regnes fra
  avtalt oppstart på byggeplass, eller første mulige igangsetting når datoen ikke er avtalt, til
  avtalt overtakelse. Ny byggetid regnes fra faktisk igangsetting på byggeplass til avtalt ny
  dato for overtakelse. Begge regnes i hverdager. Forlengelsen er derfor ikke alltid lik
  forskyvningen av overtakelsen. Med opprinnelig byggetid på 100 hverdager, igangsetting 5
  hverdager etter avtalt oppstart og overtakelse 10 hverdager senere er ny byggetid 105
  hverdager og forlengelsen 5. Å kontrollere forlengelsen krever begge datoene, sammenholdt med
  opprinnelig byggetid. OV-U37 nevner én av dem, OV-U39 ingen. Ulike saker kan bygge på ulike
  overtakelsesdatoer uten at løsningen dermed viser flere avtalte datoer. Perioden i OV-U39 er
  alt en strukturert verdi som ikke brukes i regnestykket. Ikke bygget (#1171).
- **Belegg:** kontraktsgrunnlaget Del II pkt. B.2.16. OV-U37, OV-U39, KT-U8, MM-U23.
- **Alternativene:**
  - **A:** «Saken viser ikke en egen overtakelsesdato. TE begrunner forlengelsen ut fra datoene
    kontraktsgrunnlaget bruker: faktisk igangsetting på byggeplass og den nye overtakelsesdatoen
    TE legger til grunn.»
    Forholdet til vedtakene: endrer OV-U37 («Appen viser forlengelsen og den nye
    overtakelsesdatoen som TEs premiss, ikke som avtalt.»).
  - **B (anbefalt):** «TE oppgir i posten datoen TE legger til grunn for faktisk igangsetting på
    byggeplass, og den nye overtakelsesdatoen TE legger til grunn ved beregningen av
    forlengelsen. Løsningen avviser en ny overtakelsesdato som ikke er etter datoen for
    igangsetting. Datoene står i
    brevet og visningen som TEs opplysninger. Løsningen fastslår ikke at datoene er riktige
    eller at overtakelsesdatoen er avtalt. Byggherren kan oppgi egne datoer i svaret; de står
    som byggherrens opplysninger og erstatter ikke TEs. Datoer byggherren ikke oppgir, er ikke
    tatt stilling til, og løsningen fyller dem ikke inn med TEs. Datoene følger det OV-U39 sier
    om de andre verdiene, men inngår ikke i regnestykket. Avvikende datoer hindrer ikke i seg
    selv at løsningen registrerer enighet om beløpet, og løsningen avgjør ikke hva enigheten
    omfatter. Løsningen beregner eller kontrollerer
    ikke forlengelsen ut fra datoene, kontrollerer ikke datoene mot perioden og sammenlikner
    ikke datoene mellom saker. TE begrunner fortsatt hvilken forlengelse posten gjelder, og
    avgrensningen mot krav i andre saker.»
    Forholdet til vedtakene: utvider OV-U39 og presiserer OV-U37. I tråd med KT-U8 og MM-U23.
    Kontrollen av rekkefølgen er et produktvalg; den følger ikke av formelen i B.2.16.
- **Anbefaling:** B. OV-U39 har valgt strukturerte verdier for det regnestykket bruker, også
  byggherrens egne, og perioden er alt en verdi utenfor regnestykket. Datoene er det
  forlengelsen er definert av, og B gjør partenes premisser etterprøvbare uten at løsningen
  avgjør hvilken forlengelse som er riktig. Ved å følge OV-U39 hindrer avvikende datoer ikke i
  seg selv at løsningen registrerer enighet om beløpet, og de utløser ikke alene kravet til
  begrunnelse. Begrunnelsen i den første formen, at datoen gjelder kontrakten samlet, som OV-U36
  fører utenfor, er tatt ut: OV-U36 gjelder kompensasjonen i uendret byggetid.
- **Hva valget styrer:** skjemaet, brevteksten og visningen av posten, og feltene i posten
  før første ekte sak (B-17). Bygges i #1171.
- **Avhenger av spørsmål 1:** nei.
- **Svar 25.10 (oppdragsgiver):** B. Oppdragsgiver ordrett: «7B og 8A». Forkastet: A slik den
  står. Svaret føres i vedtaksregisteret i en egen vedtaks-PR.
- **Sparring 25.10:** spørsmålet ble rettet i tre runder med en annen modell. I den første formen
  var A anbefalt, med begrunnelsen at datoen gjelder kontrakten samlet. Sparringen er ikke
  oppdragsgivers svar. Ordrett:
  - «OV-U36 fører kompensasjonen for rigg og drift i uendret byggetid utenfor løsningen. Det
    begrunner ikke alene å utelate en beregningsopplysning for forlenget byggetid.»
  - «Valget bør begrunnes i hvilke opplysninger som trengs for å forstå og kontrollere posten.»
  - «Begge datoene er partens opplysninger. Faktisk igangsetting er en opplysning om et
    hendelsesforløp; overtakelsesdatoen kan være avtalt eller bare lagt til grunn av parten.»
  - «Kravet om at overtakelsesdatoen er etter igangsettingen, er en valideringsregel i
    produktet, ikke noe som følger av den siterte formelen alene.»
- **Prøvd mot vedtaksfila 25.10** av en subagent, sammen med spørsmål 8. Prøvingen ga disse
  rettelsene: datoene følger OV-U39 uten å inngå i regnestykket, rekkefølgen og perioden er
  avklart, sitatet fra OV-U37 er helt, og opprinnelig byggetid regnes fra oppstart på
  byggeplass. Presiseringene fra tredje sparringsrunde kom etter prøvingen.

### Spørsmål 8. Nøkkeltallene i prosjektoversikten (VG-G-04)

- **Bakgrunn:** Oversikten viser «Krevd vederlag» og «Enighet om vederlag». Under enigheten står
  «Virksom enighet, etter appens lesing», «Betinget: … kr», «Subsidiært svar fra BH: … kr» og
  eventuelt antallet uten beløp (L). Overskriftene sier ikke hva summene bygger på. Prøvd 25.10
  gjennom kjernen (K): «Krevd vederlag» er summen av gjeldende kravversjon i forståtte saker der
  kravet står, også når kravene er avgjort. Trukne krav og saker avsluttet ved godtatt avslag
  eller trukket grunnlag er ikke med. «Enighet om vederlag» er summen av virksomme enigheter,
  ved aksept eller sammenfall. I de to avsluttede tilfellene og etter trekk av vederlagskravet
  har enigheten ingen virkning og er ikke med. Betinget enighet og subsidiære svar som TE ikke
  har godtatt, står hver for seg uten å telles to ganger. Det subsidiære tallet er beløpet
  byggherren godtar om ingen påberopelse fører fram (OV-U31), også poster byggherren har
  godkjent prinsipalt, og et svar uten subsidiært standpunkt som ikke er godtatt, står i ingen
  sum. Summen følger arbeidsvalgene 20.10 og 22.10 etter MM-U28 (#1029, #1052), men
  merkingen «Subsidiært svar fra BH» sier ikke det. En endringsordre registrert etter OV-U6 kan
  gjøre en betinget enighet virksom, og andre registrerte brev endrer ingen sum. Krav i flere
  saker for samme kostnad telles hver for seg. OV-U10 endret statusteksten av samme grunn.
- **Belegg:** MM-U28, MM-U2, GR-U7, KA-U6, KA-U22, OV-U4, OV-U6, OV-U10, OV-U31, OV-U36, OV-U37.
- **Alternativene:**
  - **A (anbefalt):** «Nøkkeltallene for vederlag sier hva summene bygger på. ‹Krevd vederlag› er
    summen av TEs gjeldende krav i saker løsningen forstår og der kravet står, også når kravene
    er avgjort. Et trukket krav og en sak som er avsluttet ved et godtatt avslag på grunnlaget
    eller et trukket grunnlag, er ikke med. ‹Enighet om vederlag› er summen av beløpene
    løsningen leser som virksom enighet, enten TE har godtatt svaret eller svaret stemmer med
    kravet. Betinget enighet vises særskilt. En enighet uten virkning, som etter et godtatt
    avslag på grunnlaget, et trukket grunnlag eller et trukket vederlagskrav, er ikke med. En
    enighet uten beløp telles som antall, atskilt fra kronesummen. Byggherrens svar som TE ikke
    har godtatt, regnes ikke som enighet. Svar med et subsidiært standpunkt som TE ikke har
    godtatt, vises særskilt med beløpet byggherren godtar om ingen påberopelse fører fram. Hele
    beløpet i disse svarene er med, også poster som er godkjent prinsipalt, og merkingen sier
    det, og at beløpet ikke er enighet. Svar med bare prinsipale standpunkter som ikke er
    godtatt, er ikke med i noen sum. Samme beløp telles ikke både som svar og som enighet.
    Saker løsningen ikke forstår, er ikke med i noen sum, og oversikten sier ved summene hvor
    mange de er.
    Beløp i dokumenter som bare er registrert som dokumentasjon etter OV-U4, inngår ikke i
    summene. Byggherrens svar på grunnlaget avgjør om enigheten om et beløp er betinget eller
    virksom, også når svaret er en endringsordre registrert etter OV-U6. Kompensasjonen for rigg
    og drift i uendret byggetid er ikke med. Krav i flere saker kan gjelde samme kostnad, og
    løsningen kontrollerer det ikke.»
    Forholdet til vedtakene: presiserer MM-U28 og arbeidsvalgene 20.10 og 22.10 (#1029, #1052).
    I tråd med MM-U2, GR-U7, KA-U6, KA-U22, OV-U4, OV-U6, OV-U10, OV-U31, OV-U36 og OV-U37.
  - **B:** «Nøkkeltallene står som i MM-U28.»
- **Anbefaling:** A, av samme grunn som OV-U10. A beskriver summene slik de er; den endrer dem
  ikke.
- **Hva valget styrer:** overskriftene og forklaringene i oversikten, også merkingen av det
  subsidiære tallet og plasseringen av antallet saker som ikke er med. Summene endres ikke.
  Ordlyden i oversikten fastsettes når den bygges, med linse A i design-review. En egen sum for
  alle svar TE ikke har godtatt, er et eget spørsmål.
- **Avhenger av spørsmål 1:** svaret A endrer ikke ordlyden.
- **Svar 25.10 (oppdragsgiver):** A. Oppdragsgiver ordrett: «7B og 8A». Forkastet: B slik den
  står. Svaret føres i vedtaksregisteret i en egen vedtaks-PR.
- **Sparring 25.10:** spørsmålet ble rettet i tre runder med en annen modell. Den første formen
  sa at nøkkeltallene gjelder «krav og enigheter sendt i løsningen». Sparringen er ikke
  oppdragsgivers svar. Ordrett:
  - «Enighet kan registreres ved sammenfall uten en egen aksept. Teksten bør beskrive
    beregningsgrunnlaget, ikke forutsette at enigheten er et sendt dokument.»
  - «Opplys dersom saker utelates fordi løsningen ikke kan beregne dem; en ufullstendig sum må
    ikke fremstå som komplett.»
  - «Da unngår dere at 130 000 kroner blir lest som enten bare subsidiære poster eller samlet
    beløp BH har godkjent i prosjektet. En egen sum for alle ubesvarte tilbud bør eventuelt
    behandles separat.»
  Merkingen sparringen foreslo, «BHs beløp uten gjennomslag for påberopelsene», er ikke tatt
  inn. 8-A bruker uttrykket fra OV-U31, «om ingen påberopelse fører fram».
- **Prøvd mot vedtaksfila og kjørt 25.10** av en subagent, sammen med spørsmål 7. Sju forløp ble
  kjørt gjennom kjernen og nøkkeltallene. Prøvingen ga disse rettelsene: kravsummen omfatter
  saker der kravene er avgjort, det subsidiære tallet er beskrevet slik det regnes, enighet uten
  virkning og uten beløp er tatt med, og setningen om bekreftelse etter 2b er erstattet av en om
  byggherrens svar på grunnlaget. Presiseringene fra tredje sparringsrunde kom etter prøvingen.

### Spørsmål 9. Hvilke registrerte brev som vises ved kravet (VG-H-03)

- **Bakgrunn:** Ved et krav som venter på svar, viser appen «motpartens registrerte brev»
  (OV-U20). Vedtaket sier ikke om «motparten» leses ut fra kravet eller ut fra den som leser.
  I dag vises bare byggherrens brev, også for byggherren selv, og byggherren som skal svare, ser
  ikke TEs registrerte brev ved kravet. Etter OV-U4 tar partene brevene i betraktning når de
  svarer.
- **Belegg:** OV-U4, OV-U20.
- **Alternativene:**
  - **A (anbefalt):** «Ved kravet som venter på svar viser løsningen den som leser, motpartens
    registrerte brev som hører til sporet eller saken og ikke er rettet: TE ser byggherrens, og
    byggherren ser TEs. Presiserer OV-U20.»
  - **B:** «Ved kravet som venter på svar viser løsningen begge partenes registrerte brev som hører
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
    i andre saker. Veiledningen etter VS-U18 sier at løsningen ikke ser dem. Presiserer VS-U18.»
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
- Avrunding til hele øre deles av utregningen, brevet og fullmakten (L). Etter svaret på
  spørsmål 6 avvises brøkdeler av øre i stedet.
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
  vedtaksfila av en subagent i denne økta. Det samme er spørsmål 4, 5 og 5b etter sparringen, mot
  `3407b88`; vedtaksregisteret er ikke endret siden `569666b`.
  Alternativene i spørsmål 2–11 er prøvd av verifiseringsøktene; endringene deres er tatt inn.
- **Rapportenes grenser gjelder**, blant annet: akseptfristen, rigg og drift som post,
  kunnskapsdatoen, merking av registrerte brev, frafall og forsering er ikke prøvd; Python-stien
  er bare lest for VG-A-03; forløp 9 i del 4 er ikke kjørt, fordi kjernen ikke har relasjoner
  mellom saker.
- `python3 docs/verktoy/lenkekontroll.py docs/vurdering-vedtakene-2026-10-25.md` er kjørt.
