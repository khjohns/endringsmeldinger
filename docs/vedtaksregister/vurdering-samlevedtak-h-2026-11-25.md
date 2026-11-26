# Samlevedtak H: første versjon, sakene og tilgangen

Dato: 25.11.2026. Kontrollert commit: `e61b097` (`main`). Del av #1534, steg 4. Det er gruppe H i
[restkartleggingen](vurdering-restkartlegging-2026-11-17.md#forslaget): tema 35, 36, 39 og 41 i
[«Kjedene»](vurdering-klassifisering-2026-11-03.md#kjedene). Formen følger svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)).
Fila viser til postene uten å gjengi dem, og skriver ikke i `vedtak.toml`. De foreløpige ID-ene
settes når postene føres. «Rad» er plassen i `vedtak.toml` på `e61b097`; nummeret i
klassifiseringen (rad-324 osv.) er fra en eldre commit.

## Grunnlaget

`vedtaksregister.py --vis` for postene i de fire temaene, `--kjede` for OV-U1, OV-U14, OV-U2 og
HF-U23, et skript over `vedtak.toml` som lister forholdene `samler` og `opphever` til postene, og
merknaden 23.09 til B-04 i [vedtaksfila](../plans/vedtak.md).

**K1. Tema 35 er nesten samlet etter 17.11.** OV-U7 og VS-U35 er samlet i VS-U87 (25.11), MM-U35 i
MM-U47, KA-U45 i KA-U87 og OV-U55 i GR-U40, og OV-U64 og OV-U65 er opphevet. Igjen står OV-U1
(beslutning). KT-U7 hører til tema 36.

**K2. OV-U1 sier noe som ikke lenger gjelder, uten registrert forhold.** OV-U1 sier at «justering av
enhetspriser (§ 34.3.3) avvises». KA-U68 tok varselet etter punkt 34.3.3 inn i første versjon, og
det står nå i [vederlagsmetoden, versjon 3](../plans/vedtak.md#samlevedtak-vederlagsmetoden-3)
(OV-U115, E14 i versjon 2). [VS-U87](../plans/vedtak.md#samlevedtak-sent-varsel-3) sier samtidig at
totalentreprenøren kan svare på krav fra byggherren «først ved punkt 34.3.3, som avvises i første
versjon (OV-U1)». Lesningen her: varselet og kravet fra totalentreprenøren tas imot, og et krav fra
byggherren om justering etter punkt 34.3.3 avvises. Lista over det første versjon dekker, nevner
også «ingen krav» og innsigelse etter punkt 5, som OV-U7 og VS-U35 har utsatt.

**K3. KA-U1 hører ikke til tema 41.** Den står der fordi Følge nevner målformen M2 under B-14. Den
er aksept og hører til tema 1 (gruppe C). H samler den ikke.

**K4. Python-backenden finnes ikke i treet.** Kjørt og observert: `ls` i roten på `e61b097` viser
`server/` og `kjerne/`, ingen Python-backend. Overgangsreglene for Python i B-17 og B-19 er derfor
ikke tatt med i samlebeslutningen for tema 41 (E9). Kravene som gjelder uansett språk, står i punkt 3. Om leveringen og Catenda er flyttet til TS, er
ikke kontrollert her.

## Temaene

| Tema | Står igjen | Utfall |
| --- | --- | --- |
| 35 Avgrensningen av første versjon | OV-U1 | Ny versjon av OV-U1 som beslutning (spørsmål 4) |
| 36 Hvem som oppretter hvilken sak, og topicen | KT-U3, KT-U4, KT-U6, KT-U7, KT-U9, KT-U10, KT-U11, LV-U9, og rad 526 (29.09) | Samlevedtak, uten LV-U9 (spørsmål 1) |
| 39 Medlemskap og lesetilgang | DL-U7–DL-U12, DL-U15, rad 660 (B-02 punkt 4), rad 661 (B-02 punkt 5 og B-04) | Samlevedtak (spørsmål 2 og 3) |
| 41 Serverlaget, databasen og målarkitekturen | B-12, databasen, B-15, B-17, B-18, B-19, DL-U1, DL-U3, HF-U3, rad 536, 537 (B-14), 655–659 | Samlebeslutning, uten KA-U1 (spørsmål 5) |

**Ikke i H:** LV-U9 gjelder når brevet er sendt og leveringen før topicen, og samles med tema 26 og
30 (gruppe E). Rad 491 (B-02 punkt 3) gjelder utstedelsen gjennom kommandoen og hører til gruppe G.
Rad 662 (B-02 punkt 6, nødtilgang) er én beslutning uten kjede og står. OV-U2 (forsering og
endringsordre utenfor løsningen) har en egen kjede gjennom OV-U6 og står.

## Utkastet

Kilden står etter hver setning. «s2» er andre setning.

### Avgrensningen av første versjon, versjon 2 (foreløpig OV-U125), beslutning

1. Første versjon er den versjonen av løsningen som skriver den første reelle hendelsen. Den dekker
   KOE-saken med sporene grunnlaget (punkt 32, også punkt 32.2 og endringsordre etter punkt 32.3
   første ledd a i KOE-saken, GR-U12 og GR-U13), vederlaget og fristen, med grunnsettet av
   handlinger og de handlingene som bygges før første ekte sak etter OV-U97. (OV-U1 s1; OV-U97 s1
   og s4; E2)
2. Forsering etter punkt 33.8 og endringsordre som egen sak avvises til de er bygget, og føres
   utenfor løsningen etter OV-U2. (OV-U1 s2; OV-U2)
3. Et krav fra byggherren om justering av enhetsprisene etter punkt 34.3.3, og totalentreprenørens
   svar på det, avvises i første versjon. Totalentreprenørens krav om justerte enhetspriser etter
   punkt 34.3.2 og varsel etter punkt 34.3.3 tas imot etter samlevedtaket for vederlagsmetoden.
   (OV-U1 s2; KA-U68; OV-U115; VS-U87; E1)
4. Det løsningen ennå ikke kan, avvises og forenkles ikke. (OV-U1 s3)
5. Vedtakene om det som avvises eller er utsatt, står. Avgrensningen gjelder bare rekkefølgen de
   bygges i. Hva som er utsatt i et tema, står i samlevedtaket for temaet. (OV-U1 s5; OV-U7 s6;
   VS-U35 s4; E2)
6. B-17 står (samlebeslutningen for tema 41, punkt 3). (OV-U1 s4; E9)

### Sakene og topicen (foreløpig KT-U12), vedtak med beslutningsdel og designdel

1. Totalentreprenørens krav føres i en KOE-sak for alle forhold, også ved forsinkelse eller svikt ved
   byggherrens ytelser, andre forhold byggherren har risikoen for og force majeure. (KT-U9 s2)
2. Bare totalentreprenøren oppretter en KOE-sak, og bare byggherren oppretter en EO-sak. (KT-U10 s3)
3. En endringsordre kan omfatte én eller flere hele KOE-saker (MM-U34 punkt 20), i alle forhold.
   (KT-U9 s4)
4. En sak kan opprettes både fra skjemaet i løsningen og fra en topic totalentreprenøren lager i
   Catenda. Topicen er ikke et varsel eller krav i løsningen, og totalentreprenøren sender varsel og
   krav fra løsningen. Mener totalentreprenøren at topicen var varselet etter punkt 32.2, oppgir
   totalentreprenøren datoen i et brev fra løsningen etter samlevedtaket for varslingsdatoen.
   Løsningen avgjør ikke selv om topicen var et varsel. (rad 526; KT-U6 s2–s4; E3)

**Beslutningsdel.** Løsningen har tre sakstyper: krav om endringsordre (KOE), endringsordre (EO) og
forsering. Navnet på sakstypen er betegnelsen i byggherrens organisasjon og endrer ikke
brevteksten. (KT-U9 s1 og s3) En sak totalentreprenøren oppretter i løsningen, opprettes når den
første påberopelsen sendes, og ikke før. Avbryter totalentreprenøren før sending, finnes ingen sak
og ingen topic. En sak opprettet fra en topic opprettes med topicens tittel. (KT-U11 s1–s3; KT-U6
s1) En sak som opprettes i løsningen, får en topic på det topic-boardet prosjektets konfigurasjon
angir. Hvert prosjekt angir ett board for alle sakstyper, og sakstypen står i topicens type. (KT-U3;
KT-U4) Lager byggherren en topic i Catenda, oppretter løsningen ingen sak. Hendelsen beholdes i
innboksen, og topicen får en kommentar om at saken ikke er opprettet fordi bare totalentreprenøren
kan opprette en KOE-sak der. (KT-U7) Handlingen for en ny endringsordre finnes når EO-saken er
bygget. (KT-U10 s2)

**Designdel.** Handlingene heter ‹Nytt krav om endringsordre› og ‹Ny endringsordre›. (KT-U10 s1)

### Medlemskap, lesetilgang og tilbakekalling (foreløpig DL-U17), vedtak med beslutningsdel og designdel

1. Sakene og brevene kan leses i løsningen av dem som er med i et team drift har registrert for
   totalentreprenøren eller byggherren i prosjektet, og av medlemmer som har fått leserolle.
   Godkjennere leser etter GFK-U9. Andre medlemmer av Catenda-prosjektet ser ikke sakene i
   løsningen. I Catenda styrer mappen hvem som leser brevene (LV-U13). Kan løsningen ikke bekrefte
   teamet, vises ingenting. (DL-U15 s1–s5)
2. En navngitt administrator hos drift bestemmer hvilke Catenda-team som representerer
   totalentreprenøren og byggherren. (rad 660 med Følge s1)
3. Et prosjekt i løsningen gjelder én entreprisekontrakt mellom byggherren og én totalentreprenør.
   Teamene drift registrerer for totalentreprenøren, hører alle til denne totalentreprenøren, og
   drift bekrefter det når teamene registreres. Har et Catenda-prosjekt flere entreprisekontrakter,
   kan løsningen brukes for bare én av dem. (DL-U14 s1–s3; spørsmål 3)
4. Et nytt team kan legges til. Å flytte et team til den andre siden eller fjerne det avvises når
   prosjektet har saker. (DL-U13; spørsmål 3)
5. Navnet vises ved hver hendelse for alle som har tilgang til saken. (DL-U12)
6. Retten til nye handlinger opphører straks løsningen har registrert at tilgangen er borte. Klokken
   er tidspunktet synkroniseringen lagrer endringen. En godkjenning gitt mens godkjenneren hadde
   fullmakt, står, og pakken kan utstedes. Nye godkjenninger kan personen ikke gi. Utkast blir hos
   teamet, og en kollega kan fullføre og sende i eget navn. (B-04 punkt 1–3; rad 661)
7. En eldre medlemsliste skriver ikke over en nyere. Deaktiveringen ved innlogging og innloggingen er nyere enn en
   medlemsliste som ble hentet før innloggingen. En slik liste gjør ikke et medlem aktivt igjen i
   prosjektet og gir ikke en bruker et nytt medlemskap. (DL-U7 s2; DL-U8; DL-U9)
8. Feiler synkroniseringen, kan alle fortsatt handle, unntatt i tilfellene i punkt 9. (B-04 punkt 4
   s1; DL-U10)
9. Oppheves eller endres koblingen til Catenda-prosjektet, blir medlemskapene inaktive straks.
   Ingen kan handle i prosjektet før en ny medlemsliste er hentet fra det koblede
   Catenda-prosjektet. (DL-U10)
10. I et inaktivt prosjekt kan medlemmene lese sakene og brevene, men ingen kan sende brev eller
    gjøre andre handlinger, unntatt å bestride en opplysning i et innlegg. (DL-U11 s1; MM-U47 E7; E6)

**Beslutningsdel.** Synkroniseringen lagrer når medlemslisten ble hentet og fra hvilket
Catenda-prosjekt. (DL-U7 s1) Prosjekt og kontraktsteam registreres bare av drift, ikke av serveren.
(rad 660) Feiler synkroniseringen, varsles drift. Varselet utløses av alderen på listen, ikke bare av
feil. Hvor gammel listen kan bli før drift varsles, og om det skal være en ytre grense, fastsettes i
B-09. (B-04 punkt 4 s1, s3 og s4)

**Designdel.** Et inaktivt prosjekt vises i lista som inaktivt. (DL-U11 s2)

### Serverlaget, databasen og målarkitekturen (foreløpig B-20), beslutning

1. Målformene M2, M1, M4 og M5 legges til grunn med presiseringene 07.10. Løsningen er en modulær
   monolitt med serverautoritet. M3 følger grensene som endres. (rad 536 s1–s2)
2. Domenekjernen er skrevet i TypeScript og brukes både i nettleseren og på serveren. Den bygges i en
   egen permanent mappe, som ren kode med typesjekk, arkitekturtest og regelversjonsvakt i CI.
   Valget godkjenner ikke prøvekoden som produksjonskjerne. (rad 537 s1–s2; merknaden 09.10 til
   B-14 i Følge)
3. Backenden samles i TS, og TS eier KOE-, EO- og forseringsdomenet: kommandoene, valideringen,
   utledningen, journalhendelsene, beslutningsgrunnlaget og enighetsgrunnlaget. Alt som skriver i
   eller påvirker en sak, går gjennom TS. Levering og Catenda kan ligge i en tjeneste ved siden av
   så lenge den ikke leser eller skriver i databasen selv, til de flyttes. Tjenesten tolker ikke
   journalen for å avgjøre hva et brev betyr eller hva partene kan gjøre. (B-17 s2–s3 og s6;
   merknaden 09.10 til B-17; B-19 s1 og s4; E9)
3a. Testsakene fra før byttet forkastes, og det bygges ingen kompatibilitetsleser for dem. Bevis-sakene
   og domenetabellen føres videre. (B-17 s8)
4. Serverlaget velges av utviklerne og IT innenfor tre krav: én autoritativ regelbehandling,
   kontrollert adgang til bindende handlinger og historikk som kan etterprøves. Flere tjenester kan
   rulles ut som én samlet utgivelse. (B-18 s1–s2)
5. Når nødvendig saksgrunnlag er lastet, kan brukeren utforske vurderinger og se beregninger og
   brevutkast uten å vente på serverkall. Ved innsending validerer serveren på nytt. Serverbasert
   forhåndsvurdering utredes ikke som erstatning, og B-13 er uendret. (B-15 s1–s4)
6. Databasen er Azure SQL Database, med forbeholdet at IKT bekrefter at løsningen får en egen
   database på et nivå som kan speiles til Fabric (RP-U1). Datalaget bygges i TS rett mot SQL
   Server, lokalt i Docker i skyøkta og mot Azure SQL Database når det blir aktuelt. (B-12 s1–s2;
   DL-U1)
7. Én bindende kommando er én transaksjon, over direkte tilkobling til databasekommandoene, med en
   databasedriver og vanlig SQL. Det tas ikke opp igjen uten nytt konkret motbelegg. (rad 656 med
   Følge s1–s3, slik B-12 endret den)
8. Tilgangsmekanismen er alternativ C i B-02: radnivåsikkerhet med kontekst for lesing, avgrensede
   kommandoer for bindende skriving og operasjonsmodellen for journal, saksregister og kø, uttrykt
   og prøvd i T-SQL. Designet avhenger ikke av plattformen, og mekanismen virker likt lokalt, i CI
   og i Azure. (rad 657 med Følge; rad 658 s1 og Følge s1; E10)
9. Hvert brev lagres samlet som ett dokument, og det er journalens eneste kilde. Tabellene for
   spørring og rapport lages av brevene, kan lages på nytt og brukes aldri til en bindende handling
   (B-10). Ukjent innhold bevares og stopper saken (HF-U1, samlet i MM-U43). Punktet gjelder bare
   lagringsformen; hva tabellene skal inneholde, avgjøres når rapporteringen og veien til Fabric
   bygges. (HF-U3 s1–s3 med Følge)
10. Tidspunkter lagres som datetime2(3) i UTC, uten forskyvning. Serveren setter tidspunktet, og
    visningen gjør om til norsk tid. Punktet gjelder det lagrede formatet, ikke innholdet i
    rapporttabellene. (DL-U3 s1 og s3 med Følge)
11. Hendelseslageret i JSON, metadatalageret i CSV og Supabase-lagrene er ute av kjøretidsstien, og
    det bygges ingen vei ut av Supabase for den gamle stakken. Tester som trenger ekte lagring, går
    mot en skrivbar testbase over samme tilkobling som produksjonen. (rad 659 med Følge, slik B-12
    endret den; DL-U1 s1)

## Endret innhold

- **E1** OV-U1 s2: «justering av enhetspriser (§ 34.3.3) avvises» gjelder nå bare et krav fra
  byggherren. Totalentreprenørens krav og varsel tas imot (KA-U68, OV-U115). Uten forhold i dag (K2).
- **E2** OV-U1 s1: «svar, aksept, trekk, «ingen krav», innsigelse etter § 5, forespørsel …» er
  erstattet av grunnsettet (OV-U97) og vedtakene om hva som bygges før første ekte sak. «Ingen krav»
  er utsatt (OV-U7), og innsigelsen etter punkt 5 som eget brev er utsatt (VS-U35). Forkastet-teksten
  om B-01 og rekkefølgen i FK tas ikke med; den gjaldt rekkefølgen 10.10.
- **E3** KT-U6 s3: «etter OV-U5» viser til samlevedtaket for varslingsdatoen, der OV-U5 er samlet.
- **E4** «appen» er «løsningen» i alle fire (språkfila). Ordlyden ellers er uendret der ikke annet står.
- **E5** KT-U11 s4 («Det endrer avgjørelsen 16.10 (#666)») er historikk og tas ikke med.
- **E6** DL-U11: «unntatt å bestride en opplysning etter MM-U7» er lest med MM-U47 E7, som sier at
  bestridelsen sendes som innlegg og at innlegget er det eneste brevet. MM-U7 er samlet i MM-U47.
- **E7** DL-U15 s6 («Ved utdatert medlemsliste gjelder B-04») er punkt 8. Ordene om hva DL-U15
  endrer (B-02, vedtaket 18.09, DB-05), står i Følge.
- **E8** Rad 536 s3 (rekkefølgen domenetabell → kontrakt → språkprøve → M2/M1 → M4) og B-17 s9
  (trinnvis bygging og samlet aktivering av skrivestien) gjaldt byttet og tas ikke med.
- **E9** Overgangsreglene for Python i B-17 (s4–s5 og s7), B-18 (Python ved siden av), B-19 (s2–s3:
  rekkefølgen og at Python-lagrene ikke skrives om) og OV-U1 s4 tas ikke med (K4). Punkt 3 beholder
  kravet til en tjeneste ved siden av og B-17 s6 uten å nevne Python, og OV-U125 punkt 6 viser til
  punkt 3. DL-U1 s1 står i punkt 11 uten «Python- og PostgreSQL-stakk».
- **E10** Rad 658 s2 («Foreløpig mål er Azure Database for PostgreSQL»), kravet om ren PostgreSQL og
  «på Supabase» i Følge s1 er endret av B-12 og tas ikke med. Rad 655 er opphevet 23.09 og tas ikke
  med. I punkt 11 er «PostgreSQL» i rad 659 Følge s1 tatt ut, slik B-12 endret den.
- **E11** KT-U12 punkt 4 tar med raden 29.09 (rad 526), som KT-U3 utvider og KT-U6 presiserer med ord.
  Delen om en topic gjelder en topic totalentreprenøren lager (KT-U6, KT-U7).

## Forholdene

- **OV-U125** opphever OV-U1, og henvisningene til OV-U1 gjelder OV-U125, som for OV-U95 i OV-U115. OV-U97 presiserer OV-U1 og OV-U2 står; forholdene står på OV-U1. KT-U7
  presiserte OV-U1 og samles i KT-U12.
- **KT-U12** samler KT-U3, KT-U4, KT-U6, KT-U7, KT-U9, KT-U10, KT-U11 og rad 526 (med anker). Forholdene fra KT-U9 og KT-U10
  til EO-U1 og OV-U3 føres videre. LV-U9 presiserer KT-U3 og står med forholdet.
- **DL-U17** samler DL-U7–DL-U12, DL-U15, og etter spørsmål 3 A DL-U13 og DL-U14. Rad 660 og 661 får
  ankrene `b-02-punkt-4` og `b-04-tilbakekalling` og samles (README, «En rad uten anker»). MM-U47
  presiserer DL-U11 og står med forholdet. Merknaden 23.09 til B-04 står som tekst.
- **B-20** samler B-12, databasen, B-15, B-17, B-18, B-19, DL-U1, DL-U3 og HF-U3, og rad 536, 537 og
  656–659 med ankre. Rad 655 er opphevet og samles ikke.
- **Opphever eller samler (svar 4 A).** E1 løser en motsigelse uten registrert forhold mellom OV-U1
  og KA-U68, OV-U115 og VS-U87 (K2), så OV-U125 opphever OV-U1. KT-U12, DL-U17 og B-20 løser ingen
  motsigelse: E3–E7 og E11 viser til der innholdet nå står, og E8–E10 tar ikke med det som gjaldt et
  bytte. De samler derfor (spørsmål 6).

## Spørsmålene

Spørsmål 1 og 2 berører rettsregler (varselet etter punkt 32.2, hvem som kan opprette en sak og
sende brev) og legges fram som tekst. Spørsmål 3–6 er tekniske og prosessuelle.

**Juridiske**

> **1. Tilslutning, tema 36.** Gjelder utkastet «Sakene og topicen» over, med beslutningsdelen,
> designdelen, E3–E5 og E11, som samlevedtak for hvem som oppretter hvilken sak og topicen? Svar «ja»
> eller rett enkeltpunkter. Belegg: KT-U3–KT-U11 og raden 29.09
> («Saker opprettes både fra skjemaet i appen og fra en topic i Catenda»). Styrer: posten KT-U12.

> **2. Tilslutning, tema 39.** Gjelder utkastet «Medlemskap, lesetilgang og tilbakekalling» over, med
> beslutningsdelen, designdelen og E6–E7, som samlevedtak for medlemskap, lesetilgang og
> tilbakekalling? Punkt 3 og 4 avhenger av spørsmål 3. Svar «ja» eller rett enkeltpunkter. Belegg:
> DL-U7–DL-U15, B-02 punkt 4 og merknaden 23.09 til B-04. Styrer: posten DL-U17.

**Tekniske og prosessuelle**

> **3. Omfanget av tema 39.** DL-U13 og DL-U14 sier hvilke team som kan representere partene, og
> DL-U14 presiserer B-02 punkt 4, som samles. **A (anbefalt):** DL-U13 og DL-U14 samles i DL-U17 som
> punkt 3 og 4. **B:** «DL-U13 og DL-U14 står for seg, og punkt 3 og 4 tas ut. Forholdet fra DL-U14
> står på den samlede raden for B-02 punkt 4.» Anbefaling: A, fordi hvem som representerer en part,
> da står ett sted. Styrer: omfanget av DL-U17.

> **4. Tema 35.** **A (anbefalt):** OV-U1 får en ny versjon som beslutning, som utkastet over med E1
> og E2. **B:** «Temaet står. OV-U1 får forholdet ‹endret av KA-U68› for setningen om punkt 34.3.3,
> og resten leses med Følge.» Anbefaling: A. Med B står lista over det første versjon dekker, fortsatt
> med «ingen krav» og innsigelsen etter punkt 5, og VS-U87 viser til en setning som er endret.
> Styrer: posten OV-U125 og om VS-U87 kan vise til den.

> **5. Tema 41.** **A (anbefalt):** én samlebeslutning for serverlaget, databasen og
> målarkitekturen, som utkastet over med E8–E10. **B:** «Temaet står. Postene er beslutninger og
> leses med Følge.» Anbefaling: A. B-12 endrer fire rader, og B-19 endrer B-18, så hva som gjelder,
> kan ikke leses av én post. Styrer: posten B-20.

> **6. Forholdene.** **A (anbefalt):** som «Forholdene» over: OV-U125 opphever OV-U1, de tre andre
> samler, radene uten anker får anker og samles, KA-U1 går til gruppe C og LV-U9 til gruppe E.
> **B:** «Som A, men B-20 opphever B-17, B-18 og B-19, fordi E9 tar ut overgangsreglene for
> Python.» Anbefaling: A. E9 tar ut regler for et bytte, ikke en regel som gjelder. Med B viser 24
> henvisninger i `kjerne/`, `server/` og `src/` til opphevede ID-er (B-17 14, B-19 6, B-18 4), og
> kontrollen av vedtakshenvisningene feiler til de er skiftet ut. Styrer: `forhold` i de nye postene.

### Svaret

Oppdragsgivers svar står ordrett i
[7183967699](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-7183967699),
ført av orkestratoren 26.11: spørsmål 1 og 2 «ja», altså tilslutning til utkastene uten rettelser,
og A på spørsmål 3–6.

## Kodefunn

Ingen. Utkastene endrer ingenting som er vedtatt, unntatt E1, der vedtakene alt er endret (K2).
Byggestatusen i Følge (KT-U6, KT-U7: ikke bygget, #819; DL-U10 og DL-U15: ikke bygget) er ikke
kontrollert mot koden.

## Verifikasjon og grenser

- **Kjørt og observert:** `vedtaksregister.py --vis` og `--kjede` som under «Grunnlaget», skriptet
  over `vedtak.toml` og `ls` i roten, alt på `e61b097`.
- **Lest:** postene i tabellen «Temaene», merknaden 23.09 til B-04, E7 i MM-U47, E8 i HF-U23 og
  setningene om punkt 34.3.3 i OV-U115 og VS-U87.
- **Ikke kontrollert:** sitatene fra NS 8407 (teksten er ikke klonet; utkastene siterer ikke
  kontrakten), om koden følger postene, og om leveringen og Catenda er flyttet til TS.
- **Kontrollert av subagenter 25.11:** prøvingen mot vedtakene og setningskildene (K1, K2 og
  EO-sak og forsering utenfor første versjon holder; 19 funn om utelatte setninger, feil
  setningsnummer og en ufullstendig E-liste, rettet; funn 13 førte til at OV-U125 opphever OV-U1, og
  funn 15 til rad 526 og E11; ingen motstrid i alternativene) og klassene (OV-U125 og B-20 som
  foreslått; i KT-U12 er sakstypene, opprettelsestidspunktet og byggherrens topic flyttet til
  beslutningsdelen, og i DL-U17 det synkroniseringen lagrer og varselet til drift).
