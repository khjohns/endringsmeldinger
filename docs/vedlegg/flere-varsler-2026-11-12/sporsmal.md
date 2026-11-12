# Spørsmål om flere varsler i ett brev, 12.11

Spørsmålene S-1–S-3 i [BF-37](../../domenetabell/brukerforlop/BF-37.md#åpne-spørsmål) fra designsløyfa
i #1837, for punkt 5 i #1823. Grunnlaget er prototypen
[varsler-i-ett-brev.html](../../design/prototyper/varsler-i-ett-brev.html), v1. At prototypen er tegnet
etter det anbefalte alternativet, er ikke et svar. Spørsmålene gjelder rettsregler og stilles som
nummerert liste i tekst, gjennom orkestratoren. Kontraktsteksten gjengis ikke her (#424). Den er lest i
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
- **Tre av varslene gis én gang i sporet.** Varselet etter punkt 33.4 avvises etter fristkravet
  ([VS-U16](../../plans/vedtak.md#vs-u16)), varselet etter punkt 34.1.2 etter vederlagskravet
  ([OV-U89](../../plans/vedtak.md#ov-u89) punkt 3), og det særskilte varselet etter punkt 34.1.3 når et
  særskilt varsel om det samme kravet er sendt eller oppgitt før
  ([OV-U90](../../plans/vedtak.md#ov-u90)). Datoen settes én gang (OV-U80, OV-U90). Flere varsler i ett brev betyr derfor i praksis flere varsler
  etter punkt 34.3.3 og 34.4, ett per arbeid, og de andre varslene samlet i samme brev.
- **Varslene etter punkt 34.3.3 og 34.4 gjelder kravpostene.** Et varsel sendt eller registrert før det
  første kravet gjelder kravpostene med den beregningsregelen (arbeidsvalget i Følge hos
  [VS-U48](../../plans/vedtak.md#vs-u48)). Løsningen kan ikke se hvilket arbeid varselet gjelder
  ([VS-U52](../../plans/vedtak.md#vs-u52)). En kravpost kan vise til varselet med et felt
  ([VS-U54](../../plans/vedtak.md#vs-u54)). Tidsrommet for byggherrens svar på varselet bygger på hvilke
  kravposter det gjelder ([VS-U62](../../plans/vedtak.md#vs-u62)), og en påberopelse i svaret står mot
  hver senere kravversjon med en kravpost varselet gjelder ([VS-U61](../../plans/vedtak.md#vs-u61)).
- **En beskrivelse i et varsel har presedens.** TEs varsel etter punkt 32.2 fra løsningen må ha en
  beskrivelse av pålegget, og et registrert varsel kan stå uten
  ([GR-U15](../../plans/vedtak.md#gr-u15)).
- **Punkt 5 tredje ledd gjelder hvert varsel.** Rettidigheten vurderes for hvert varsel, også når
  brevet og datoen er felles. Løsningen avgjør ikke om et varsel etter punkt 34.3.3 eller 34.4 kom i tide
  (VS-U48).

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

**Bakgrunn.** Oppdragsgiver skrev «flere forhold». I løsningen har hver sak ett forhold, og en sak har
sin egen hendelsesstrøm. Et nytt forhold påberopes i en ny sak (BF-05). Svaret kan bety flere arbeider
og varsler i samme sak, eller varsler i flere saker. Bare det første er tegnet. Et brev fra byggherren
kan gjelde flere saker når det er en endringsordre ([EO-U19](../../plans/vedtak.md#eo-u19)), men ingen
vedtak sier det for et brev fra totalentreprenøren.

**Alternativene.**

- **A (anbefalt):** Et brev med varsler fra løsningen gjelder én sak. Totalentreprenøren kan varsle
  flere forhold i saken i samme brev, også i vederlaget og fristforlengelsen. Varsler i flere saker
  sendes som ett brev per sak. Forhold: følger MM-U10.
- **B:** Et brev med varsler fra løsningen kan gjelde flere saker. Brevet har varslene for hver sak, står
  i hver sak det gjelder og er ett dokument. Forhold: utvider MM-U10 til flere saker.

**Anbefalingen.** A. Varslene i en sak følger saken, svaret og fristene for den, og det trengs ingen ny
modell for et brev på tvers av saker. Det er en antakelse at «flere forhold» i svaret gjaldt samme sak.
B krever en egen bestilling, som endringsordren for flere saker.

**Hva valget styrer.** Om skjemaet for varsel hører til saken eller til prosjektet, og om kommandoen
kan gjelde flere saker.

## Spørsmål 2 (S-2): flere varsler etter punkt 34.3.3 eller 34.4 i samme brev, og beskrivelsen

**Bakgrunn.** TE vil varsle to regningsarbeid i samme brev, før arbeidet settes i gang (F-1 i BF-37).
I dag har varselet ingen beskrivelse, og løsningen kan ikke se hvilket arbeid det gjelder (VS-U52).
Punkt 34.4 første ledd sier at byggherren skal varsles før regningsarbeidet settes i gang. Punkt 34.3.3
første ledd sier når varselet om justering skal gis og hva det koster å ikke varsle. Ingen av dem sier
hva varselet skal inneholde.

**Alternativene.**

- **A (anbefalt):** Totalentreprenøren kan sende flere varsler etter punkt 34.3.3 første ledd og punkt
  34.4 i samme brev, ett for hvert arbeid. Hvert varsel er et eget utsagn med en beskrivelse av arbeidet
  det gjelder, og beskrivelsen står i brevet. Et varsel sendt fra løsningen må ha beskrivelsen. Et varsel
  i et brev sendt utenfor løsningen kan registreres uten. Varslene etter punkt 33.4, 34.1.2 og 34.1.3 kan
  ha en beskrivelse, men må ikke. Løsningen leser ikke av beskrivelsen hvilket arbeid varselet gjelder.
  Forhold: utvider VS-U48 og VS-U52, etter mønsteret i GR-U15.
- **B:** Som A, men beskrivelsen er valgfri også i et varsel sendt fra løsningen. Forhold: utvider VS-U48
  og VS-U52.
- **C:** Et brev har høyst ett varsel etter hver bestemmelse. Varselet har en valgfri beskrivelse, som kan
  nevne flere arbeider. Forhold: presiserer VS-U48.

**Anbefalingen.** A. Med flere varsler etter samme bestemmelse er beskrivelsen det eneste som skiller
dem, både for byggherren som svarer og for totalentreprenøren som senere viser til ett av dem (S-3). Det
koster totalentreprenøren én linje per varsel. Med B kan byggherren få et varsel uten å vite hvilket
arbeid det gjelder. Med C kan byggherren ikke svare på ett arbeid for seg, og en påberopelse mot varselet
rammer alle arbeidene.

**Hva valget styrer.** Kommandoen og det lagrede feltet for beskrivelsen (B-17), skjemaet og brevteksten,
og om S-3 trengs.

## Spørsmål 3 (S-3): hvilken kravpost et varsel gjelder, når saken har flere

**Bakgrunn.** Gjelder bare hvis S-2 er A eller B. TE har varslet regningsarbeid for gravingen (varsel 1)
og for omleggingen av fjernvarmerøret (varsel 2) i samme brev. Byggherren har svart at varsel 2 kom for
sent. Senere krever TE P2 for gravingen. Etter arbeidsvalget i Følge hos VS-U48 gjelder begge varslene
P2, så påberopelsen mot varsel 2 står mot P2 (VS-U61), og tidsrommet for svaret på varsel 2 er over når
P2 er sendt (VS-U62), selv om omleggingen ikke er krevd ennå.

**Alternativene.**

- **A:** Et varsel etter punkt 34.3.3 første ledd eller punkt 34.4 sendt eller registrert før det første
  kravet gjelder alle kravpostene med den beregningsregelen i neste kravversjon, også når saken har flere
  slike varsler. Forhold: følger arbeidsvalget i Følge hos VS-U48 og VS-U62.
- **B (anbefalt):** Har saken mer enn ett varsel etter samme bestemmelse som ingen kravpost viser til,
  velger totalentreprenøren i kravskjemaet for hver kravpost med den beregningsregelen hvilket av varslene
  den gjelder, eller at kravet er varselet for posten. Kravet sendes ikke uten valget. Har saken ett slikt
  varsel, gjelder det kravposten uten valg. Kravposten viser til varselet med feltet i VS-U54. Et varsel
  ingen kravpost gjelder, kan byggherren fortsatt svare på (VS-U62), og en påberopelse i svaret på et
  varsel står bare mot kravpostene som gjelder det (VS-U61). Forhold: snevrer inn VS-U62 og arbeidsvalget
  i Følge hos VS-U48, presiserer VS-U54 og VS-U61.
- **C:** Som B, men totalentreprenøren velger også når saken har ett slikt varsel. Varselet er forhåndsvalgt.
  Forhold: endrer arbeidsvalget i Følge hos VS-U48, snevrer inn VS-U62, presiserer VS-U54 og VS-U61.

**Anbefalingen.** B. A gir en påberopelse virkning mot et arbeid den ikke gjaldt, og avslutter tidsrommet
for svaret på et varsel for et arbeid som ikke er krevd. B endrer ingenting for en sak med ett varsel, som
er tegnet og godkjent i BF-14 (D-16 der). C retter også saken der TE har ett varsel og to kravposter for
ulike arbeider, men gir et valg i hvert krav.

**Hva valget styrer.** Spørsmålet i «Varslene» i kravskjemaet (U-7 i BF-37), hvilke kravposter en
påberopelse står mot, og tidsrommet for svaret på varselet.

## Svarene

Ikke stilt ennå.
