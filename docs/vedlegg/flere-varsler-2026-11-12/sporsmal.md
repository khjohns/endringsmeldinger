# Spørsmål om flere varsler i ett brev, 12.11

Spørsmålene S-1–S-3 i [BF-37](../../domenetabell/brukerforlop/BF-37.md#spørsmålene) fra designsløyfa
i #1837, for punkt 5 i #1823. Grunnlaget er prototypen
[varsler-i-ett-brev.html](../../design/prototyper/varsler-i-ett-brev.html), v1. At prototypen er tegnet
etter det anbefalte alternativet, er ikke et svar. Spørsmålene gjelder rettsregler og stilles som
nummerert liste i tekst, gjennom orkestratoren. Alternativene er prøvd mot vedtakene og i fem forløp av
en subagent én gang 12.11, og funnene er rettet. Kontraktsteksten gjengis ikke her (#424). Den er lest i
`khjohns/kontrakt` 12.11.

Utgangspunktet er svar 2 C fra oppdragsgiver 12.11 i
[#1663](https://github.com/khjohns/endringsmeldinger/issues/1663#issuecomment-6822749766), ordrett:
«2: A blir vel ikke riktig. Ofte helt nødvendig å varsle flere forhold i ett brev. Jeg tenker C - B er
bare upraktisk.»

## Det kartleggingen fant

- **Et brev kan alt ha flere utsagn i flere spor.** TE kan i samme brev sende krav, varsel, aksept og
  trekk ([MM-U10](../../plans/vedtak.md#mm-u10)), og brevteksten lages av alle utsagnene
  ([LV-U3](../../plans/vedtak.md#lv-u3)). Kjernen lagrer et dokument med en liste av utsagn, men
  `send_varsel` tar én hjemmel og har ingen beskrivelse (G-1 og G-2 i BF-37).
- **Når et varsel avvises.** Fra løsningen avvises et nytt varsel etter punkt 33.4 når fristkravet er
  sendt ([VS-U16](../../plans/vedtak.md#vs-u16)), og et nytt varsel etter punkt 34.1.2 når
  vederlagskravet er sendt ([OV-U89](../../plans/vedtak.md#ov-u89) punkt 3). Et varsel sendt tidligere
  utenfor løsningen kan fortsatt registreres. Det særskilte varselet etter punkt 34.1.3 kan sendes så
  lenge det ikke er sendt eller oppgitt et særskilt varsel om det samme kravet før
  ([OV-U90](../../plans/vedtak.md#ov-u90)). Ingen vedtak setter en grense for hvor mange varsler etter
  punkt 34.3.3 eller 34.4 en sak kan ha: TE kan bare varsle (VS-U48) og registrere (VS-U52) hver gang.
- **Varslene etter punkt 34.3.3 og 34.4 gjelder kravpostene.** Et varsel sendt eller registrert før det
  første kravet gjelder kravpostene med den beregningsregelen i neste kravversjon (arbeidsvalget i Følge
  hos [VS-U48](../../plans/vedtak.md#vs-u48)). Løsningen kan ikke se hvilket arbeid varselet gjelder
  ([VS-U52](../../plans/vedtak.md#vs-u52)). En kravpost kan vise til varselet med et valgfritt felt
  ([VS-U54](../../plans/vedtak.md#vs-u54)). Tidsrommet for byggherrens svar på varselet varer så lenge
  ingen sendt kravversjon har en kravpost varselet gjelder ([VS-U62](../../plans/vedtak.md#vs-u62)), og en
  påberopelse i svaret står mot hver senere kravversjon med en kravpost varselet gjelder
  ([VS-U61](../../plans/vedtak.md#vs-u61)).
- **En beskrivelse i et varsel har presedens.** TEs varsel etter punkt 32.2 fra løsningen må ha en
  beskrivelse av pålegget, og et registrert varsel kan stå uten
  ([GR-U15](../../plans/vedtak.md#gr-u15)). Der har beskrivelsen en rettslig funksjon: den er det
  endringsordren viser til som hva endringen går ut på. Punkt 34.3.3 og 34.4 sier ikke hva varselet skal
  inneholde.
- **Innsigelsen etter punkt 5 tredje ledd gjelder hvert varsel** (vår tolkning), også når brevet og datoen
  er felles. Løsningen avgjør ikke om et varsel etter punkt 34.3.3 eller 34.4 kom i tide (VS-U48).

## Avgrensning

Dette er ikke spørsmål.

- **Varsler i vederlaget og fristforlengelsen i samme brev** følger av MM-U10. At varselet etter punkt
  33.4 kan stå som en rad i skjemaet «Bare varsle, uten krav», er design (U-4 i BF-37).
- **Registrering av et brev sendt utenfor løsningen med flere varsler** følger av
  [OV-U80](../../plans/vedtak.md#ov-u80) («totalentreprenøren velger ett eller flere varsler») og
  VS-U52. Datoen gjelder alle varslene i dokumentet.
- **Et brev med både krav og et varsel for et annet arbeid** er P-1 i BF-37 og stilles ikke nå.
- **Ordlyden i brevet** er design (U-6 i BF-37), som for varslene i BF-14.

## Spørsmål 1 (S-1): varsler i flere saker i samme brev

**Bakgrunn.** Oppdragsgiver skrev «flere forhold». I løsningen har hver sak ett forhold, og et nytt
forhold påberopes i en ny sak (BF-05). Etter begrepene i løsningen betyr «flere forhold» derfor flere
saker. Svaret kan også bety flere varsler, for eksempel for flere arbeider, i samme sak, og bare det er
tegnet. Et brev fra byggherren kan gjelde flere saker når det er en endringsordre
([EO-U19](../../plans/vedtak.md#eo-u19)), men ingen vedtak sier det for et brev fra totalentreprenøren.

**Alternativene.**

- **A (anbefalt):** Et brev med varsler fra løsningen gjelder én sak. Totalentreprenøren kan sende flere
  varsler i saken i samme brev, for eksempel for flere arbeider, også i vederlaget og fristforlengelsen.
  Varsler i flere saker sendes som ett brev per sak, og et brev sendt utenfor løsningen som varslet i
  flere saker, registreres i hver sak. Forhold: følger MM-U10.
- **B:** Et brev med varsler fra løsningen kan gjelde flere saker. Brevet har varslene for hver sak, står
  i hver sak det gjelder og er ett dokument. Forhold: utvider MM-U10 til flere saker.

**Anbefalingen.** A for første versjon. Varslene i en sak følger saken, svaret og fristene for den, og det
trengs ingen ny modell for et brev på tvers av saker. A koster totalentreprenøren ett brev per sak der
totalentreprenøren i dag kan sende ett brev for flere saker, og en registrering per sak av et slikt brev.
Det er en antakelse at svaret gjaldt samme sak. Er det flere saker oppdragsgiver mener, trengs B, og det
krever en egen bestilling, som endringsordren for flere saker.

**Hva valget styrer.** Om skjemaet for varsel hører til saken eller til prosjektet, og om kommandoen
kan gjelde flere saker.

## Spørsmål 2 (S-2): flere varsler etter punkt 34.3.3 eller 34.4 i samme brev, og beskrivelsen

**Bakgrunn.** TE vil varsle to regningsarbeid i samme brev, før arbeidet settes i gang (F-1 i BF-37).
I dag har varselet ingen beskrivelse, og løsningen kan ikke se hvilket arbeid det gjelder (VS-U52).
Punkt 34.4 første ledd sier at byggherren skal varsles før regningsarbeidet settes i gang. Punkt 34.3.3
første ledd sier når varselet om justering skal gis og hva det koster å ikke varsle. Ingen av dem sier
hva varselet skal inneholde. Et krav om beskrivelse er derfor et valg for løsningen, ikke en følge av
kontrakten.

**Alternativene.**

- **A (anbefalt):** Totalentreprenøren kan sende flere varsler etter punkt 34.3.3 første ledd og punkt
  34.4 i samme brev, ett for hvert arbeid. Hvert varsel er et eget utsagn med en beskrivelse av arbeidet
  det gjelder, og beskrivelsen står i brevet. Et varsel sendt fra løsningen må ha beskrivelsen, også når
  brevet har ett varsel. Ved registrering av et brev sendt utenfor løsningen kan beskrivelsen fylles ut,
  men må ikke. Varslene etter punkt 33.4, 34.1.2 og 34.1.3 har ingen beskrivelse. Løsningen leser ikke av
  beskrivelsen hvilket arbeid varselet gjelder. Forhold: utvider VS-U48 og VS-U52, snevrer inn VS-U48 ved
  at et varsel fra løsningen ikke sendes uten beskrivelsen, og endrer U-11 og D-16 i BF-14 for et brev med
  ett varsel. Følger mønsteret i GR-U15 for registreringen.
- **B:** Som A, men beskrivelsen er valgfri også i et varsel sendt fra løsningen. Forhold: utvider VS-U48
  og VS-U52.
- **C:** Et brev har høyst ett varsel etter hver bestemmelse. Varselet har en valgfri beskrivelse, som kan
  nevne flere arbeider. Flere varsler etter samme bestemmelse sendes i hvert sitt brev. Forhold: presiserer
  VS-U48.

**Anbefalingen.** A. Med flere varsler etter samme bestemmelse er beskrivelsen det eneste som skiller
dem, både for byggherren som svarer og for totalentreprenøren som senere viser til ett av dem (S-3). Det
koster totalentreprenøren én linje per varsel, og et varsel kan alltid registreres uten. Med B kan
byggherren få et varsel uten å vite hvilket arbeid det gjelder. Med C kan byggherren ikke svare på ett
arbeid for seg, og en påberopelse mot varselet rammer alle arbeidene. Varslene etter punkt 33.4, 34.1.2 og
34.1.3 får ingen beskrivelse, fordi en fri tekst der kunne snevre inn et varsel som gjelder hele kravet,
og løsningen tolker ikke teksten (KA-U16).

**Hva valget styrer.** Kommandoen og det lagrede feltet for beskrivelsen (B-17), skjemaet og brevteksten.

## Spørsmål 3 (S-3): hvilken kravpost et varsel gjelder, når saken har flere

**Bakgrunn.** Spørsmålet gjelder uansett svar på S-2, fordi en sak kan få flere varsler etter samme
bestemmelse i hvert sitt brev. TE har varslet regningsarbeid for gravingen (varsel 1) og for omleggingen
av fjernvarmerøret (varsel 2). Senere krever TE P2 for gravingen. Etter arbeidsvalget i Følge hos VS-U48
gjelder begge varslene P2. Da står en påberopelse mot varsel 2 mot P2 (VS-U61), og tidsrommet for svaret
på varsel 2 er over når P2 er sendt (VS-U62), selv om omleggingen ikke er krevd ennå. For punkt 34.3.3 har
byggherren svarplikt, og mister innsigelsene når svaret ikke kommer (punkt 34.3.3 annet ledd). Byggherren
mister da muligheten til å svare på varselet alene uten å ha ment det. Det samme skjer når TE har ett
varsel og krever to poster for ulike arbeider: varselet gjelder begge, og brevet sier at begge er varslet.

**Alternativene.**

- **A:** Et varsel etter punkt 34.3.3 første ledd eller punkt 34.4 sendt eller registrert før det første
  kravet gjelder alle kravpostene med den beregningsregelen i neste kravversjon, også når saken har flere
  slike varsler. Forhold: følger arbeidsvalget i Følge hos VS-U48 og VS-U62.
- **B:** Har saken mer enn ett varsel etter samme bestemmelse som ingen kravpost viser til, velger
  totalentreprenøren i kravskjemaet for hver kravpost med den beregningsregelen som ikke hadde den i en
  tidligere versjon, hvilket av varslene den gjelder, eller at kravet er varselet for posten. Kravet sendes
  ikke uten valget. Har saken ett slikt varsel, sendt eller registrert før det første kravet, gjelder det
  kravposten uten valg. Kravposten viser til varselet med feltet i VS-U54. Et feil valg rettes i en ny
  kravversjon, men tidsrommet for svaret på et varsel som en sendt kravversjon har vist til, åpnes ikke
  igjen (VS-U62). En påberopelse i svaret på et varsel står bare mot kravpostene som gjelder det (VS-U61).
  Forhold: snevrer inn VS-U62 og arbeidsvalget i Følge hos VS-U48, snevrer inn VS-U54 ved at feltet er
  påkrevd når saken har flere varsler, utvider VS-U50 til poster med et tidligere varsel, presiserer
  VS-U61.
- **C (anbefalt):** Har saken et varsel etter samme bestemmelse som ingen kravpost viser til, velger
  totalentreprenøren i kravskjemaet for hver kravpost med den beregningsregelen som ikke hadde den i en
  tidligere versjon, hvilket av varslene den gjelder, eller at kravet er varselet for posten. Har saken ett
  slikt varsel, er det forhåndsvalgt. Kravet sendes ikke uten valget. Kravposten viser til varselet med
  feltet i VS-U54. Et feil valg rettes i en ny kravversjon, men tidsrommet for svaret på et varsel som en
  sendt kravversjon har vist til, åpnes ikke igjen (VS-U62). En påberopelse i svaret på et varsel står bare
  mot kravpostene som gjelder det (VS-U61). Forhold: endrer arbeidsvalget i Følge hos VS-U48 og D-16 i
  BF-14 («gjelder uten valg»), snevrer inn VS-U62, endrer VS-U54 ved at feltet er påkrevd for slike poster,
  utvider VS-U50 til poster med et tidligere varsel, presiserer VS-U61.

**Anbefalingen.** C. A gir en påberopelse virkning mot et arbeid den ikke gjaldt, og avslutter tidsrommet
for svaret på et varsel for et arbeid som ikke er krevd. For punkt 34.3.3 kan byggherren da miste retten
til å svare på varselet alene uten å ha ment det. B løser det når saken har flere varsler, men har samme
blindvei når saken har ett varsel og to kravposter for ulike arbeider: totalentreprenøren kan ikke si at
den andre posten ikke er varslet, og brevet sier uriktig at den er det. C gir et valg i hvert krav med en
slik post, men varselet er forhåndsvalgt når det er ett. C endrer at et varsel før kravet gjelder uten valg,
som er tegnet og godkjent i BF-14.

**Hva valget styrer.** Spørsmålet i «Varslene» i kravskjemaet (U-7 i BF-37), hvilke kravposter en
påberopelse står mot, og tidsrommet for svaret på varselet.

## Svarene

Stilt av orkestratoren 12.11 som nummerert liste i tekst, slik spørsmålene står over (commit `fe3317a`).
Oppdragsgiver svarte ordrett
([#1837](https://github.com/khjohns/endringsmeldinger/issues/1837#issuecomment-6833194004)):

> A, A, C.
> Det var for varsler

Det betyr S-1 A, S-2 A og S-3 C. Orkestratoren fører vedtakene i en egen vedtaks-PR.
