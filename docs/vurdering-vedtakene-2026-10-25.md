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

Utfallet går imot inntrykket bak spørsmålet. Av 22 funn som ikke er avkreftet, er funksjonen
årsak i ett, delvis årsak i sju og ikke årsak i fjorten. Uten unntakene ville ingen av funnene
falt bort. To ville blitt bredere (VG-E-01 og VG-H-01). Et svar på grunnlaget som er
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

- Det appen sier om korrespondansen, må gjelde det som er sendt i appen. Det er grunnen til
  «Alle krav sendt i appen er avgjort» (OV-U10), og det er det VG-E-01 mangler.
- TE må kunne gjøre gjeldende at et varsel ble sendt utenfor appen, før byggherren tar
  stilling til rettidigheten. Ellers viser saken et første varsel som kan være feil, og
  visningen påstår mer enn appen vet (HF-U13). OV-U5 dekker det. Datoen oppgis i et brev fra
  appen, og appen leser ikke vedlegget. Unntaket er altså et utsagn sendt fra appen, ikke en
  lesing av et eksternt brev.

**Appens valg (A):**

- Å ta imot andre eksterne brev som dokumentasjon (OV-U4, OV-U16–OV-U21). Det gir begge
  partene ett sted å se korrespondansen, og det er veien MM-U2, MM-U25, OV-U7 og LV-U16 viser
  til når noe må sendes utenfor appen.
- At byggherrens endringsordre kan registreres som svar på grunnlaget (OV-U6). Når
  byggherren kan svare på grunnlaget i appen (#818), kan byggherren gjøre det samme med et
  svar fra appen.
- Om registratoren skal fylle ut innholdet med virkning. OV-U4 valgte det bort i første
  versjon.

**Hvordan appen håndterer et brev den ikke kan lese:** den leser det ikke. Det er OV-U4. Det
oppdragsgiver beskriver, at appen ikke kan tolke et brev som ikke er fylt inn gjennom
skjemaet, er grunnen til at OV-U4 ble valgt 13.10, og funnene viser ikke at appen i dag
forsøker å tolke brevene. Problemene som finnes, er tekster som sier mer enn appen vet
(VG-E-01, VG-H-03), og de rettes i ordlyden.

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
    unntaket som gir et registrert brev virkning. Til byggherren kan svare på grunnlaget i
    appen (#818), finnes det da ingen vei til en godkjenning av grunnlaget i appen.
- **Anbefaling:** A. Funnene viser ikke at funksjonen gjør appen vanskeligere, og appen
  forsøker ikke å tolke brevene. Feilene som finnes, er tekster som sier mer enn appen vet,
  og de rettes i ordlyden (spørsmål 2 og 9). OV-U5 trengs etter kontrakten: uten det kan TE
  ikke bevare et varsel sendt utenfor appen i saken. Vil oppdragsgiver forenkle, er E stedet
  å kutte: den fjerner den ene registreringen med virkning og en kommando som ikke er
  bygget, og taper lite når byggherren kan svare på grunnlaget i appen.
- **Hva valget styrer:** registreringsskjemaet (#807, #1045, #1119), om byggherren kan
  godkjenne grunnlaget med en endringsordre fra utenfor appen, og om TE kan bevare et varsel
  sendt utenfor appen.
- **Virkning på de andre spørsmålene:** Ved D faller spørsmål 9 bort, og ordlyden i spørsmål 8
  endres. Ved C blir spørsmål 2 smalere, spørsmål 4 må stilles på nytt for registrerte brev, og
  spørsmål 8 og 9 endres. B og E endrer ikke de andre spørsmålene.

### Spørsmål 2. Forbeholdet når grunnlaget ikke er besvart i appen (VG-E-01, VG-H-01)

- **Bakgrunn:** Når byggherren svarer på vederlag eller frist mens grunnlaget ikke er besvart,
  sier brevet: «Byggherren har ennå ikke svart på grunnlaget i TEs krav i brev <n> av <dato>.»
  (GR-U26). Har byggherren svart utenfor appen, med eller uten registrering, sier byggherrens
  eget brev da noe som ikke stemmer, og byggherren er bundet av det hen sender fra appen. Utveien
  GR-U26 gir, å svare på grunnlaget i samme brev, finnes ikke i TS-ruta i dag (#818), så hvert
  vederlagssvar får setningen. I underkategoriene der § 32.2 gjelder, kan TE også lese
  setningen som at byggherren ikke har svart etter § 32.3 annet ledd (vår vurdering, ikke prøvd).
- **Belegg:** § 32.3 annet ledd. GR-U26, OV-U4 og OV-U10.
- **Alternativene:**
  - **A (anbefalt):** «Når byggherren svarer på vederlag eller frist mens gjeldende versjon av
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
- **Anbefaling:** A. Setningen blir sann uten at appen avgjør hva et brev utenfor appen er.
- **Hva valget styrer:** den låste forbeholdsteksten i hvert vederlags- og fristsvar. Regelverket
  og brevteksten endres, så regelversjonen økes.
- **Avhenger av spørsmål 1:** nei. Ved C blir tilfellet med et registrert svar borte, men ikke
  tilfellet med et svar som ikke er registrert.

### Spørsmål 3. «Forbeholdene» når byggherren godkjenner hele tilbudet (VG-B-01, VG-C-01)

- **Bakgrunn:** Når byggherren godkjenner oppgjør som fast sum, sier brevet «Byggherren
  godkjenner oppgjør som fast sum med beløpet og forbeholdene som fremgår av svaret», også når
  hele beløpet er godkjent (LV-U32). Tilfellet ble lagt fram 24.10 (forkastet alternativ B i
  LV-U32), og svaret sa at «forbeholdene» viser til byggherrens standpunkter i svaret, med lag
  og forbeholdet for ubesvart grunnlag. Godkjenner byggherren hele beløpet uten noe slikt,
  regner appen partene som enige (GR-U7), men brevet peker likevel mot et forbehold. Skriver
  byggherren et vilkår i begrunnelsen, sier brevet «forbeholdene» mens appen sier «partene er
  enige» og «Alle krav sendt i appen er avgjort» (K, forløp 10 i del 1). Etter avtaleloven § 6
  første ledd er et svar med forbehold avslag og nytt tilbud, og etter § 34.2.2 første ledd
  gjelder et avtalt vederlag bare når tilbudet er akseptert. Skjemateksten om at appen ikke
  tolker begrunnelsen, er vedtatt (KA-U19, OV-U4) og står i avsnitt 4.
- **Belegg:** § 34.2.2 første ledd, avtaleloven § 6. LV-U31, LV-U32, GR-U7, GR-U8, HF-U7,
  KA-U16, KA-U19, OV-U4.
- **Alternativene:**
  - **A (anbefalt):** «Godkjenner byggherren hele det krevde beløpet og oppgjør som fast sum i
    første lag, og ikke under forbeholdet for ubesvart grunnlag, sier brevet: ‹Byggherren
    godkjenner oppgjør som fast sum med beløpet som fremgår av svaret.› Ellers gjelder LV-U32.
    Endrer LV-U32.»
  - **B:** «Som i dag (LV-U32).»
  - **C:** «Setningen står som LV-U32 sier. Har byggherren skrevet en begrunnelse til en full
    godkjenning, regnes svaret ikke som sammenfall, og TE må godta det. Endrer GR-U7 og HF-U7
    for svar fra appen, og strider mot KA-U16 og GR-U8, som da også må endres.»
- **Anbefaling:** A. Brevet peker da ikke mot et forbehold appen ikke gir virkning, og
  setningen står der LV-U32 ble valgt for den. C ville la appen tolke begrunnelsen.
- **Hva valget styrer:** den faste setningen i vederlagssvaret ved full godkjenning.
- **Avhenger av spørsmål 1:** nei.

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
- **Alternativene i spørsmål 1** er prøvd mot vedtaksfila av en subagent i denne økta.
  Alternativene i spørsmål 2–11 er prøvd av verifiseringsøktene; endringene deres er tatt inn.
- **Rapportenes grenser gjelder**, blant annet: akseptfristen, rigg og drift som post,
  kunnskapsdatoen, merking av registrerte brev, frafall og forsering er ikke prøvd; Python-stien
  er bare lest for VG-A-03; forløp 9 i del 4 er ikke kjørt, fordi kjernen ikke har relasjoner
  mellom saker.
- `python3 docs/verktoy/lenkekontroll.py docs/vurdering-vedtakene-2026-10-25.md` er kjørt.
