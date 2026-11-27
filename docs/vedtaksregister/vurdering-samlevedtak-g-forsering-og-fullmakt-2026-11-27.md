# Samlevedtak G1–G3: forseringen, verdien av fristdagene og godkjenningskjeden

Dato: 27.11.2026. Kontrollert commit: `d2a7bc5` (`main`). Del av #1534, steg 4, gruppe G i
[restkartleggingen](vurdering-restkartlegging-2026-11-17.md#forslaget): tema 37 og 38 i
[«Kjedene»](vurdering-klassifisering-2026-11-03.md#kjedene). Formen følger
[E4–E7](vurdering-samlevedtak-e2-varselet-sendingen-og-brevet-2026-11-26.md), vedtaksskillen,
«Samlevedtakene er unntaket», og svar 7 A
([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)).
Fila viser til postene og punktene uten å gjengi dem, og skriver ikke i `vedtak.toml`. «s3» er
tredje setning i vedtaksteksten, uten «Forkastet».

## Grunnlaget

`vedtaksregister.py --vis` og `--kjede` for postene i temaene og postene som endrer dem, og punkt 9,
33.8 og 40.3 i NS 8407 i `khjohns/kontrakt` (ikke sitert her).

**Postene som gjenstår:** tema 37: FO-U1, FO-U3, FO-U5, FO-U7, FO-U8, GFK-U3, GFK-U4 og
GFK-U16–GFK-U23. Tema 38: FO-U6, GFK-U1, GFK-U2, GFK-U6, GFK-U10–GFK-U15 og radene uten anker
«Forsering er utenfor godkjenningsflyten» (rad-190), «Godkjenning av ansvarsgrunnlaget (GFK-06)»
(rad-281), «GFK-06 presisert» (rad-282) og `ubegrenset-fullmakt` (rad-283, har fått anker). Kjeden
har i tillegg poster som ikke sto i «Kjedene» 03.11, fordi de ikke hadde forhold da eller kom
senere: FO-U2, FO-U4, FO-U9, GFK-U5, GFK-U7, GFK-U8, GFK-U9 og GFK-U24–GFK-U28.

**K1. Allerede samlet eller opphevet.** HF-U5 og KA-U1 er samlet i KA-U88 (C), og KA-U25 i HF-U35
(D). MM-U34 er samlet i flere samlevedtak. EO-U6 er opphevet av MM-U34. B-06 er avgjort av GFK-U3 og
står ikke i registeret. Fullmakten for en endringsordre i en EO-sak står i EO-U39 (EO-U17, EO-U25).
G tar bare med det som gjelder forseringssaken og svarene i KOE-saken.

**K2. FO-U7 viser til et opphevet vedtak.** MM-U34 endret FO-U7 til en setning med MM-U12, som er
opphevet av MM-U50. G1 punkt 8 viser til MM-U50 (G1 E1).

**K3. OV-U2 står.** OV-U2 presiserer FO-U5 for første versjon, men gjelder også endringsordren og er
endret av EO-U39. Den samles ikke. G1 punkt 10 gjengir s2–s3, og forholdet OV-U2 → FO-U5 leses
gjennom G1.

**K4. «Er fristen ikke registrert».** GFK-U17 s2 bruker kalenderdagene når fristen ikke er
registrert. KA-U79 (samlet i VS-U88) sier at dagene for en frist som ikke er registrert, ikke kan
verdsettes uten sats. De to møtes bare når satsen er kjent uten datoen, som for sluttfristen etter
punkt 40.3 a regnet av kontraktssummen (GFK-U16). G2 punkt 7 leser GFK-U17 s2 slik (G2 E2).

**K5. Minstebeløpet etter punkt 40.3 b.** GFK-U16 har standardverdiene for punkt 40.3 a. GFK-U18
sier at satsen etter b gjelder delfristene, med verdien av delen, men ingen post har minstebeløpet i
b. Det er spørsmål 6.

**K6. P15.** LV-U88 punkt 4 sier at avsenderen godkjenner brevet på nytt når en annen sak har fått
nummeret, og punkt 6 at avsenderen er den siste godkjenneren. Det er ikke avgjort om resten av
kjeden godkjenner på nytt
([7195253157](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-7195253157)). For
endringsordren sier EO-U39 (EO-U25) at godkjenningen begynner på nytt bare når et utsagn eller
verdien endres. Det er spørsmål 5.

**K7. Beslutningene samles ikke.** Som i D og E står GFK-U5 og GFK-U7 (beslutning), «B-02 punkt 3»
og «Policy nøkles på `user_id`» med hjemmet sitt. DL-U17 har at en gitt godkjenning står (B-04).

**K8. Foreløpige ID-er,** de neste ledige 27.11: FO-U10 for G1, GFK-U29 for G2 og GFK-U30 for G3.
Rad-190, rad-281 og rad-282 får ankrene `forsering-utenfor-godkjenning`, `gfk-06` og
`gfk-06-presisert`, så de kan samles.

## Delingen

- **G1, forseringen (tema 37, første del, og FO-U6 og rad-190 fra tema 38).**
- **G2, verdien fullmakten og 30 %-grensen regnes av (tema 37, andre del, og rad-281–rad-283).**
- **G3, fullmakten og godkjenningskjeden (tema 38).**
- **Står:** OV-U2 (K3), GFK-U5, GFK-U7, «B-02 punkt 3» og «Policy nøkles på `user_id`» (K7), og
  GR-U38, GR-U39, EO-U40 og EO-U41, som har egne regler for enigheten og endringsordren. G2 punkt 8
  gjengir delen av dem som gjelder fullmakten.

## Utkastet til G1: forseringen

Samlevedtaket er et *vedtak* med designdel. Hver setning har kilden i parentes.

1. Har byggherren prinsipalt avslått fristkravet helt eller delvis, også gjennom grunnlaget eller ved
   preklusjon, og har totalentreprenøren ikke godtatt avslaget, kan totalentreprenøren anse avslaget
   som et pålegg om forsering etter punkt 33.8. Valgretten gjelder de avslåtte dagene. Et frafall
   etter punkt 32.3 første ledd c endrer ikke valgretten. (FO-U1 s1–s2; FO-U9 s1–s2)
2. Løsningen avgjør ikke om fristkravet var berettiget, om 30 %-grensen er overskredet, eller om et
   frafall gjør at fristkravet faller bort helt eller delvis. (FO-U1 s4; FO-U3 s2; FO-U9 s3)
3. Totalentreprenøren melder valget i en forseringssak og varsler med antatt kostnad før forseringen
   iverksettes (punkt 33.8 annet ledd). Totalentreprenøren kan senere oppdatere kostnaden og melde at
   forseringen stoppes. (FO-U1 s3; FO-U2 s1–s2)
4. Vederlaget for forseringen kreves i forseringssaken etter punkt 34, og «ingen krav» i
   vederlagssporet i KOE-saken omfatter det ikke. (FO-U2 s3; HF-U35)
5. Byggherren har ingen svarplikt etter punkt 33.8 og kan stå fast på avslaget. Byggherren kan svare
   på forseringsvarselet at avslaget var berettiget, eller at 30 %-grensen er overskredet. Svaret
   registreres og vises, uten virkning i løsningen. (FO-U3 s1–s4)
6. Byggherren kan revidere fristsvaret og godkjenne dagene. Forseringssaken står da, løsningen viser
   at fristsvaret er endret, og et nytt valg er ikke mulig for godkjente dager. En senere godkjenning
   av fristen godkjenner ikke kostnadene. Byggherren kan bestride kostnaden i svaret på
   vederlagskravet, og løsningen fordeler ikke kostnadene på forserte og godkjente dager.
   (FO-U3 s3, s5; FO-U4)
7. Vil byggherren selv ha forsering, pålegger byggherren den med endringsordre etter punkt 31.2 i en
   egen EO-sak. (FO-U3 s6)
8. Totalentreprenørens valg endrer ikke byggherrens svar i løsningen. Svaret betyr det det sa da, og
   løsningen avgjør ikke om byggherren er bundet av de godkjente dagene. (FO-U7 slik MM-U34 endret
   den; MM-U50; E1)
9. Totalentreprenørens aksept av byggherrens avslag av fristkravet avvises så lenge en forseringssak
   viser til avslaget, også etter at forseringen er stoppet, og også etter akseptfristen. Et avgrenset
   oppgjør, der totalentreprenøren godtar dagene og holder fast på forseringskravet, bygges senere.
   (FO-U5 s1–s2; KA-U88, som samler HF-U5)
10. I første versjon virker sperren i punkt 9 bare når en forseringssak i løsningen viser til
    avslaget. Godtar totalentreprenøren et fristavslag i løsningen etter å ha varslet forsering
    utenfor løsningen, er det totalentreprenørens brev. (OV-U2 s2–s3; K3)
11. Byggherrens svar på vederlagskravet for forseringen går gjennom fullmakten som andre
    vederlagssvar, og et revidert fristsvar som andre fristsvar. Svaret på forseringsvarselet (punkt 5)
    sendes uten intern godkjenning, også når driften ikke har registrert roller, fordi det ikke påtar
    byggherren noe ansvar. (FO-U6; rad-190 slik FO-U6 endret den; GFK-U2 s2)
12. Er dagmulktssatsen kjent, viser løsningen 30 %-grensen som en betinget utregning med
    forutsetningene: verdien av de avslåtte dagene etter G2, tillagt 30 %. Den vises ikke som en
    avgjort grense eller et tak. Grensen regnes uten taket for det samlede dagmulktansvaret, og
    utregningen sier at taket finnes og ikke er tatt med. Gjelder fristkravet en frist som ikke er
    dagmulktbelagt, viser forseringen ingen grense; løsningen sier det og avgjør ikke hva det betyr for
    valgretten. (FO-U3 s7–s8; FO-U8; GFK-U18 s5; GFK-U20 s1; E2)

###### Designdel

- Hvordan grensen og forutsetningene vises (FO-U3 s8, FO-U8 s2), står i forløpet.

###### Endret innhold

- **E1 Punkt 8.** Henvisningen til MM-U12 i FO-U7 (MM-U34) er byttet med MM-U50 (K2).
- **E2 Punkt 12.** «Dagmulktssatsen ganget med de avslåtte dagene» er skrevet som verdien etter G2,
  som er den samme utregningen med hverdagene og fristtabellen (GFK-U17–GFK-U21).

**Samler:** FO-U1–FO-U9 og rad-190.

## Utkastet til G2: verdien fullmakten og 30 %-grensen regnes av

Samlevedtaket er et *vedtak* med designdel.

1. Fullmakten regnes per spor. Ansvaret har ingen egen verdi, og avslått og frafalt ansvar er 0.
   (rad-281 s1; rad-282 s1, s4)
2. Et spor som besvares i samme brev, har verdien i svaret; ellers gjelder totalentreprenørens krav.
   Et krav som ikke er sendt eller ikke er tallfestet, krever hele kjeden, og et trukket krav er 0.
   (rad-281 s2; rad-282 s2–s3)
3. Verdien av fristsporet er dagmulktssatsen for fristen ganget med antallet hverdager i
   forlengelsen. For fullmakten er forlengelsen dagene verdien i svaret gjelder, og for 30 %-grensen
   de avslåtte dagene. Fullmakten regnes uten taket for det samlede dagmulktansvaret.
   (rad-281 s1; GFK-U17 s1; GFK-U19 s1; FO-U8 s1)
4. Prosjektinnstillingene har fristtabellen fra kontrakten, med fristen, datoen, om fristen er
   dagmulktbelagt, og satsen, og kontraktssummen, promillen og minstebeløpet. Standardverdiene etter
   punkt 40.3 a er 1 ‰ og 3000 kr, og et avtalt fast beløp per dag registreres i stedet. Satsen etter
   punkt 40.3 a gjelder de avtalte overtakelsesfristene, og satsen etter punkt 40.3 b de
   dagmulktbelagte delfristene, med verdien av delen. (GFK-U16 s1–s4; GFK-U18 s1–s2; spørsmål 6)
5. Opplysningene om dagmulkten registreres av driften etter skriftlig bestilling fra byggherren. Den
   som utarbeider eller godkjenner et svar, kan ikke endre dem. Fristtabellen med satsene og
   kontraktssummen kan leses av begge parter og av leserollen. (GFK-U22; GFK-U23; GFK-U25)
6. Fristkravet sier hvilke frister det gjelder. Gjelder det flere dagmulktbelagte frister, er verdien
   summen for hver frist med satsen for den, og utregningen viser hver frist for seg. Løsningen avgjør
   ikke om dagmulkt kan kreves for flere frister samtidig. (GFK-U18 s3; GFK-U21)
7. Hverdagene er det punkt 40.3 regner som hverdager: mandag til lørdag, unntatt søndager, helligdager
   og høytidsdager. De telles fra fristen kravet gjelder, slik den står etter forlengelsene i andre
   saker i samme kontrakt som er godkjent eller avtalt. Er satsen kjent, men datoen for fristen ikke
   registrert, brukes kalenderdagene, og utregningen sier at det gir en høyere verdi.
   (GFK-U17 s1–s3; GFK-U19 s2; GFK-U24; GFK-U26 s1, s3; G2 E2)
8. En forlengelse er godkjent når byggherren har godkjent dagene i første lag i sitt gjeldende svar.
   Den er avtalt når totalentreprenøren har godtatt dagene i et svar, og en betinget enighet teller som
   avtalt. Dager i en endringsordre teller som godkjent av byggherren, og forlengelsen telles fra
   endringsordren. Dager byggherren har godkjent subsidiært, teller ikke når ingen enighet er
   registrert, og byggherrens gjeldende standpunkt til ansvaret avgjør om fristen er forlenget etter
   byggherrens eget syn. (GFK-U26 s2 slik EO-U40 endret den; EO-U41; GR-U39; GFK-U27; GFK-U28)
9. Mangler satsen, gjelder fristkravet en frist som ikke er dagmulktbelagt, eller en frist som ikke er
   registrert, kan dagene ikke verdsettes. Fristsporet behandles da som et krav som ikke er tallfestet
   og krever hele kjeden. (GFK-U3 s1; GFK-U20 s1; VS-U88, som samler KA-U79)
10. Kan verdien ikke regnes, kan den som har ubegrenset fullmakt, sende svaret alene; alle andre
    trenger hele kjeden. En endringsordre har alltid to underskrifter (EO-U39). (ubegrenset-fullmakt;
    GFK-U4 s1 slik EO-U17 endret den)

###### Designdel

- Hvordan utregningen viser fristene, hverdagene og forutsetningene (GFK-U17 s3, GFK-U21 s2), står i
  forløpet (BF-20).

###### Endret innhold

- **E1 Punkt 4.** Etter svaret på spørsmål 6.
- **E2 Punkt 7.** «Er fristen ikke registrert» i GFK-U17 er lest som «er datoen for fristen ikke
  registrert, men satsen kjent» (K4).

**Samler:** rad-281, rad-282, `ubegrenset-fullmakt`, GFK-U3, GFK-U4 og GFK-U16–GFK-U28.

## Utkastet til G3: fullmakten og godkjenningskjeden

Samlevedtaket er et *vedtak* med beslutningsdel.

1. Et svar fra byggherren som går gjennom fullmakten, godkjennes etter beløpsgrensen for rollen.
   Driften registrerer grensen for hver rolle, globalt for byggherren, etter skriftlig bestilling fra
   byggherren, og løsningen viser ikke hvem som har endret den. Hvem som har rollen, og hierarkiet
   hentes fra HR-dataene. (GFK-U1 slik GFK-U6 endret den; GFK-U6; GFK-U11 s1)
2. Kjeden starter hos lederen til byggherrens saksbehandler og følger lederne oppover. Alle i kjeden
   godkjenner, til og med den første med en grense som dekker verdien etter G2. (GFK-U8)
3. Saksbehandleren og hver leder i kjeden må ha en rolle driften har registrert, eventuelt med grense
   0. Mangler en av dem, kan pakken ikke lages, og en ekstern rådgiver kan da ikke sende et svar som
   krever godkjenning. (GFK-U13)
4. Kjeden fryses når pakken lages. Mangler en leder, eller er HR-kopien for gammel, kan pakken ikke
   lages, og driften varsles. Kopien er for gammel når siste vellykkede henting er mer enn 24 timer
   gammel. (GFK-U10 s1; GFK-U12 s1)
5. Har en godkjenner mistet rollen, eller er kopien for gammel når godkjenneren handler, avvises
   handlingen. Bare den siste i kjeden må fortsatt ha en grense som dekker verdien. Ellers lages
   pakken på nytt. (GFK-U10 s1; GFK-U15)
6. Har driften ikke registrert noen roller, kan svar som går gjennom fullmakten, ikke sendes fra
   løsningen, men svaret på et forseringsvarsel kan (G1 punkt 11). Ellers gjelder punkt 4 for en
   kjede som mangler. (GFK-U2; GFK-U14)
7. Godkjenneren ser bare saken og pakken der godkjenneren står i kjeden, mens pakken er åpen, og
   etterpå bare sin egen handling, aldri de interne notatene. (GFK-U9)
8. *Etter svaret på spørsmål 5.* Har en annen sak fått løpenummeret før brevet sendes (LV-U88
   punkt 4), godkjenner …

###### Beslutningsdel

- Fullmaktstabellen per prosjekt fases ut. (GFK-U11 s1)
- Når godkjenningen bygges, og at den siste godkjenningen sender, står i GFK-U5 og GFK-U7 (K7).

###### Endret innhold

- **E1 Punkt 8.** Ny regel etter spørsmål 5 (K6).

**Samler:** GFK-U1, GFK-U2, GFK-U6 og GFK-U8–GFK-U15.

## Spørsmålene

Lagret ordrett før de sendes til orkestratoren. 1 gjelder framgangsmåten. 2–6 gjelder rettsregler
og stilles som nummerert liste.

> **1. Delingen (prosess).** Tema 37 og 38 samles i tre samlevedtak: G1 for forseringen, G2 for
> verdien fullmakten og 30 %-grensen regnes av, og G3 for fullmakten og godkjenningskjeden.
> Beslutningene om når godkjenningen bygges og at den siste godkjenningen sender, og OV-U2, blir
> stående.
> - **A (anbefalt):** Tre samlevedtak, G1–G3, lagt fram samlet og ført i én vedtaks-PR. Postene under
>   «Står» blir stående.
> - **B:** To samlevedtak, ett per tema, med G2 i G1.
>
> Styrer: antall poster, og hvor regelen for verdien av fristdagene leses.

> **2. Tilslutning til G1 (juridisk).** Samlevedtaket for forseringen (foreløpig FO-U10) gjelder med
> E1–E2. Forhold: samler FO-U1–FO-U9 og raden «Forsering er utenfor godkjenningsflyten».
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt.
>
> Styrer: hvor regelen for forseringen leses.

> **3. Tilslutning til G2 (juridisk).** Samlevedtaket for verdien fullmakten og 30 %-grensen regnes av
> (foreløpig GFK-U29) gjelder med E1–E2, og med punkt 4 etter svaret på spørsmål 6. Forhold: samler
> de to radene om GFK-06, raden om ubegrenset fullmakt, GFK-U3, GFK-U4 og GFK-U16–GFK-U28.
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt.
>
> Styrer: hvor regelen for verdien av dagene leses.

> **4. Tilslutning til G3 (juridisk).** Samlevedtaket for fullmakten og godkjenningskjeden (foreløpig
> GFK-U30) gjelder med E1, og med punkt 8 etter svaret på spørsmål 5. Forhold: samler GFK-U1,
> GFK-U2, GFK-U6 og GFK-U8–GFK-U15.
> - **A (anbefalt):** Ja, som utkastet.
> - **B:** Som A, med rettelsene oppdragsgiver gir per punkt.
>
> Styrer: hvor regelen for godkjenningskjeden leses.

> **5. Nytt løpenummer i en godkjenningskjede (juridisk).** Har en annen sak fått løpenummeret før
> byggherrens første brev i saken sendes, sendes brevet ikke, og avsenderen godkjenner brevet med det
> nye nummeret på nytt (LV-U88 punkt 4). Avsenderen er den siste godkjenneren (LV-U88 punkt 6). Det er
> ikke avgjort om de andre i kjeden godkjenner på nytt.
> - **A (anbefalt):** Den siste godkjenneren i kjeden får se brevet med det nye nummeret og godkjenner
>   det på nytt. De andre godkjenningene står, fordi bare nummeret er endret, ikke utsagnene eller
>   verdien. Forhold: presiserer LV-U88 punkt 4; i tråd med EO-U39 (EO-U25) for endringsordren.
> - **B:** Godkjenningen begynner på nytt hos den første lederen i kjeden, fordi brevet de godkjente,
>   har fått et annet nummer. Forhold: presiserer LV-U88 punkt 4; avviker fra EO-U39 (EO-U25).
>
> Styrer: hvem som må handle på nytt når nummeret er tatt, og om brevet kan sendes samme dag.

> **6. Minstebeløpet for en dagmulktbelagt delfrist (juridisk).** Prosjektinnstillingene har
> standardverdiene for dagmulkten ved overskridelse av sluttfristen etter punkt 40.3 a (GFK-U16).
> Satsen for en delfrist regnes av verdien av delen (GFK-U18), men ingen post sier hva som gjelder
> når ikke annet er avtalt.
> - **A (anbefalt):** Er ikke annet avtalt, regnes satsen for en dagmulktbelagt delfrist etter punkt
>   40.3 b av verdien av delen, med standardverdiene 1 ‰ og 1500 kr, og et avtalt fast beløp per dag
>   registreres i stedet. Forhold: presiserer GFK-U16 og GFK-U18.
> - **B:** Driften registrerer satsen for hver delfrist i kroner, uten standardverdier. Forhold:
>   presiserer GFK-U18.
>
> Styrer: om løsningen regner satsen for en delfrist selv, og hva fullmakten og 30 %-grensen regnes av
> når en delfrist er registrert uten avtalt sats.

## Svarene

Ikke kommet.

## Kontrollene

Ikke gjort ennå.

## Hva #818 trenger

- Grunnlaget i #818 viser til EO-U6, som er opphevet av MM-U34. Fullmakten for svarene i KOE-saken
  står i G2 og G3, og for endringsordren i EO-U39.
- Arbeidsvalget i #818 om et svar under godkjenning når noe endres, bygger på KA-U40, B-13, B-04
  punkt 2 og LV-U2. Spørsmål 5 avgjør tilfellet der nummeret er tatt.
- GFK-U5 sier at godkjenningsinngangene bygges når innloggingen med Entra ID og rollene fra
  HR-dataene finnes.

## Verifikasjon og grenser

- **Kjørt og observert:** `--vis` og `--kjede` for postene under «Grunnlaget», og for HF-U5, KA-U1,
  MM-U34, OV-U2, EO-U6, EO-U17, EO-U25, EO-U39–EO-U41, GR-U38, GR-U39, KA-U77, KA-U79, LV-U46 og
  LV-U88 på `d2a7bc5`.
- **Ikke kontrollert:** koden, at ID-ene i K8 er ledige når postene føres, og om forløpene bør vise
  til samlevedtakene.
