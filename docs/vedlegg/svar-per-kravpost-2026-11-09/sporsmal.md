# Spørsmål før økt 2 i byggingen av BF-14: byggherrens svar per kravpost, 09.11

Fra kartleggingen før økt 2 i [BF-14](../../domenetabell/brukerforlop/BF-14.md) (#1663, G-2 og
G-9): byggherrens svar per kravpost i kjernen. Kartleggingen fant fem uavklarte spørsmål. De er
prøvd mot vedtakene på `main` (`23ae38b`), BF-14 og spørsmålsfilene
[bygging-bf14-2026-11-07](../bygging-bf14-2026-11-07/sporsmal.md) og
[varsel-kjerne-2026-11-08](../varsel-kjerne-2026-11-08/sporsmal.md). Fire av dem følger av
vedtakene og står som arbeidsvalg under. Ett juridisk spørsmål står igjen, og navnene i
lagringsformatet står i et teknisk avsnitt. Kontraktsteksten gjengis ikke her (#424).

«Samlevedtaket for vederlagsmetoden» er versjon 2 ([OV-U95](../../plans/vedtak.md#ov-u95)).

## Arbeidsvalgene: svaret følger av vedtakene

Arbeidsvalgene står til review og føres i domenetabellen eller issuet, ikke som poster i
registeret (vedtaksskillen, «Prinsipp før enkeltvedtak»). Vil oppdragsgiver noe annet, krever
det et nytt vedtak som endrer vedtakene arbeidsvalget viser til.

### Arbeidsvalg 1: lagene når kravpostene har ulikt antall lag (kartleggingens spørsmål 1)

**Lagene gjelder hele svaret i sporet, og et standpunkt står i laget innsigelsene som rammer
det, gir det.** Belegget:

- [OV-U32](../../plans/vedtak.md#ov-u32): «Laget angir rekkefølgen mellom standpunktene: et
  standpunkt i et senere lag gjelder bare hvis innsigelsene i de foregående lagene ikke fører
  fram, i den utstrekning de rammer standpunktet.»
- Samlevedtaket for vederlagsmetoden punkt 8: «Innenfor denne rekkefølgen står standpunktet i det
  laget innsigelsene i svaret gir det (OV-U32, OV-U33).»
- [KA-U57](../../plans/vedtak.md#ka-u57): «(e) Tabellen i svaret har én rad per kravpost og én
  kolonne per lag.» [OV-U73](../../plans/vedtak.md#ov-u73): «Tabellen har én rad per post med det
  krevde beløpet og det byggherren godkjenner i hvert lag, og en sumrad.»

Alternativ B i kartleggingen, lag regnet per post, strider mot KA-U57 (e) og sumraden i OV-U73.
En tabell per post er forkastet i U-10 i BF-14. Arbeidsvalget har disse delene:

1. **En post som ingen innsigelse i et lag rammer, har samme verdi i det laget som i laget før.**
   Det følger av «i den utstrekning de rammer standpunktet» (OV-U32). Summen i et lag tar med
   verdien hver post har i laget, og ikke en post uten fast beløp (OV-U73). At cellen er dempet,
   er design (U-10).
2. **Standpunktet til oppgjørsformen er en innsigelse som rammer bare posten det gjelder.**
   KA-U57 (d) sier at standpunktet til beregningsregelen gjelder én kravpost, KA-U58 gir beløpet
   «subsidiært» når byggherren mener en annen oppgjørsform, og [KA-U60](../../plans/vedtak.md#ka-u60)
   gir oppgjørsformen et lag foran beløpet. En post som ingen innsigelse rammer, er da upåvirket
   etter [OV-U33](../../plans/vedtak.md#ov-u33): «Et standpunkt i vederlag eller frist er
   upåvirket bare når byggherren i samme svar påberoper minst én innsigelse i sporet, ingen av
   påberopelsene i sporet rammer standpunktet, og grunnlaget verken er avslått eller preklusjon
   etter § 32.2 er påberopt.»
3. **Innsigelsen etter punkt 34.1.3 får et eget lag foran beløpet for den særskilte
   vederlagsjusteringen, men ikke foran oppgjørsformen for kravpostene.** KA-U57: «(b)
   Innsigelsen etter punkt 34.1.3 rammer bare den særskilte vederlagsjusteringen.» Etter OV-U32
   flytter den da ikke lagene for kravpostene eller rigg og drift. Den særskilte posten står
   prinsipalt med beløpet etter begrensningen og subsidiært med beløpet uten den (D-13;
   [OV-U89](../../plans/vedtak.md#ov-u89) punkt 8 og 14). Innsigelsen etter punkt 34.1.2 står i
   første lag og flytter lagene for hele vederlagskravet (KA-U57 (a); OV-U27).
4. **Standpunktet til varselet etter punkt 34.4 åpner ikke et nytt lag.**
   [KA-U64](../../plans/vedtak.md#ka-u64): «Standpunktet til varselet etter punkt 34.3.3 og punkt
   34.4 står i laget for oppgjørsformen til posten det gjelder, og punkt 11 i samlevedtaket står:
   løsningen utleder ingen virkning av standpunktet til varselet etter punkt 34.4.» Innsigelsen
   etter punkt 34.3.3 første ledd åpner et lag med standpunktene etter
   [VS-U4](../../plans/vedtak.md#vs-u4), og etter oppgjørsformen når byggherren mener
   regningsarbeid ([VS-U56](../../plans/vedtak.md#vs-u56)).

Eksempelet fra kartleggingen, uten innsigelse etter punkt 34.1.2 eller 34.1.3:

| Post | Lag 1 (prinsipalt) | Lag 2 (subsidiært) | Lag 3 (videre subsidiært) |
| --- | --- | --- | --- |
| P1 fast sum, byggherren mener regningsarbeid | Regningsarbeid, uten beløp | Beløpet hvis fast sum legges til grunn, eller «ikke besvart» (KA-U58) | Som lag 2 |
| P2 justerte enhetspriser, byggherren mener regningsarbeid (VS-U56) | Regningsarbeid | Varselet etter punkt 34.3.3 kom for sent: bare det byggherren måtte forstå (VS-U4) | Standpunktet til justeringen |
| P3 fast sum, godkjent som krevd | Upåvirket | Upåvirket | Upåvirket |

Kjernen i dag regner lagene for hele kravet med standpunktet til metoden i samme lag som beløpet
(`vederlagsvirkninger` i [`frosset/standpunkt.ts`](../../../kjerne/frosset/standpunkt.ts)), og
regelinputen har bare tilbud og to lag (`beregnVederlag` i
[`regler/vederlag.ts`](../../../kjerne/regler/vederlag.ts), `regnUtVederlag` i
[`frosset/utregning.ts`](../../../kjerne/frosset/utregning.ts)). Det er G-2 i BF-14.
Beslutningsgrunnlaget fryser alt ett lag per standpunkt uten øvre grense (`BESLUTNINGSGRUNNLAG` i
[`format/format.ts`](../../../kjerne/format/format.ts)).

### Arbeidsvalg 2: byggherren bestrider justeringen (kartleggingens spørsmål 3)

**Bestrider byggherren justeringen for en kravpost med justerte enhetspriser, stemmer svaret ikke
med kravet for posten, og løsningen registrerer ikke enighet uten TEs aksept.** Justeringen er en
del av TEs krav for posten ([KA-U68](../../plans/vedtak.md#ka-u68)). Belegget er prinsippet for
sammenfall, ikke HF-U28 alene:

- [GR-U7](../../plans/vedtak.md#gr-u7): «Godkjenner byggherren hele kravet i sporet, er partene
  enige uten aksept: standpunktene faller sammen (presisert av oppdragsgiver samme dag, #274).»
- [HF-U9](../../plans/vedtak.md#hf-u9), slik MM-U34 punkt 10 endret begynnelsen: enighet
  registreres «når byggherrens svar stemmer med kravet».
- [HF-U28](../../plans/vedtak.md#hf-u28) sier «bare når». Vilkårene der er nødvendige og gjør ikke
  et svar som avviker fra kravet, til sammenfall.

Godtar TE hele svaret, registreres enigheten med svarets innhold for posten (HF-U9), og den teller
som enighet om oppgjørsformen etter samlevedtaket for vederlagsmetoden punkt 13. At standpunktet
heter «godtar» eller «bestrider», er fortsatt design (S-11). Kartleggingen viste til KA-U68 og
HF-U28 som belegg. KA-U68 er en beslutning om hva første versjon tar med, og avgjør ikke
sammenfallet.

### Arbeidsvalg 3: kravet om tilbud og enigheten (kartleggingens spørsmål 4)

**Er byggherren enig i beregningsregelen for en kravpost og krever tilbud for den samtidig,
hindrer kravet om tilbud ikke at løsningen registrerer enighet.** Belegget:

- [KA-U69](../../plans/vedtak.md#ka-u69): «Løsningen registrerer og viser kravet, og utleder ingen
  virkning eller frist av det.»
- [VS-U3](../../plans/vedtak.md#vs-u3) regner punkt 34.2.1 blant bestemmelsene løsningen
  registrerer og viser: «Det betyr uten automatisk utledning, ikke uten rettsvirkning.»
- HF-U28 nevner bare innsigelsene etter punkt 34.1.2, 34.1.3, 34.3.3 og 34.4.

Å stoppe sammenfallet ville være å utlede en virkning av kravet om tilbud, som KA-U69 sier at
løsningen ikke gjør. Kostnaden for TE: tilbudet byggherren ba om, kommer som en ny kravversjon
etter registrert enighet. Samlevedtaket for vederlagsmetoden punkt 16: «Fram til endringsordren
kan TE også sende en ny kravversjon og byggherren et nytt svar etter at løsningen har registrert
enighet om regelen. Visningen viser at det nye avviker fra den registrerte enigheten, og
løsningen avgjør ikke om enigheten står (MM-U50).» Vil oppdragsgiver at kravet om tilbud skal
hindre sammenfallet, endrer det KA-U69 og HF-U28.

### Arbeidsvalg 4: varselet etter punkt 34.4 som står alene (del av kartleggingens spørsmål 2)

**Byggherren har ikke et eget strukturert svar på et varsel etter punkt 34.4 som står alene.**
[VS-U48](../../plans/vedtak.md#vs-u48) gir byggherren et svar bare på varselet etter punkt
34.3.3: «Byggherren kan svare på et varsel etter punkt 34.3.3 som står alene.» Punkt 34.4 har ikke
en svarplikt som punkt 34.3.3 annet ledd. Standpunktet til varselet etter punkt 34.4 står i svaret
på kravet, i laget for oppgjørsformen til posten (samlevedtaket for vederlagsmetoden punkt 11;
KA-U64). Ingen endring.

### Arbeidsvalg 5: svaret på varselet og det senere svaret på kravposten (del av kartleggingens spørsmål 2)

**Byggherren tar stilling per kravpost i svaret på kravet, også når byggherren har svart på
varselet før.** Sammenfallet og lagene leser standpunktene per kravpost (KA-U57 (d); HF-U28).
Svaret på varselet står slik det ble sendt, og [MM-U50](../../plans/vedtak.md#mm-u50) spørsmål 2
sier: «Løsningens vurdering av utsagnene binder ingen av partene, og løsningen avgjør ikke om en
part er bundet av et utsagn eller kan komme løs fra det (MM-U12).» Avviker svaret på kravposten
fra svaret på varselet til ugunst for TE, viser løsningen det tidligere svaret og punkt 34.3.3
annet ledd med frist og bestemmelse, uten å trekke konklusjonen, etter mønsteret i
[HF-U25](../../plans/vedtak.md#hf-u25) punkt 8: «Senker byggherren i et nytt svar dager eller
beløp byggherren har godkjent, viser løsningen det tidligere svaret og, for frist og enhetspriser,
punkt 33.7 annet ledd eller punkt 34.3.3 annet ledd med frist og bestemmelse, uten å trekke
konklusjonen (VS-U2).» Om svaret på kravposten fylles ut med svaret på varselet, er design.

## Det juridiske spørsmålet

### Spørsmål 1: hva byggherrens svar på et varsel etter punkt 34.3.3 som står alene, inneholder

**Bakgrunn.** TE kan varsle justering av enhetsprisene etter punkt 34.3.3 første ledd før kravet,
og byggherren kan svare på varselet (VS-U48). Punkt 34.3.3 annet ledd gir mottakeren en svarplikt,
og den som ikke svarer i tide, mister innsigelsene mot kravet. Begrunnelsen for VS-U48 var:
«Byggherren må kunne oppfylle svarplikten etter punkt 34.3.3 annet ledd på et varsel som står
alene.» Ingen vedtak sier hva svaret inneholder. I prototypen finnes svaret bare inne i en
kravpost (G-9 i BF-14). At standpunktet til justeringen i svaret på en kravpost heter «godtar»
eller «bestrider», er design (S-11).

**Belegg.**

- [VS-U48](../../plans/vedtak.md#vs-u48): «Byggherren kan svare på et varsel etter punkt 34.3.3
  som står alene. Løsningen avgjør ikke om varselet kom i tide eller hvilken virkning et manglende
  eller sent varsel har.»
- [VS-U4](../../plans/vedtak.md#vs-u4), delen om punkt 34.3.3 første ledd, som står etter VS-U47:
  «påberoper parten som mottar kravet eller varselet, at kravet ble spesifisert for sent etter
  § 33.6.1, eller at justering av enhetsprisene ble varslet for sent etter § 34.3.3 første ledd,
  oppgir hen prinsipalt det hen måtte forstå, og subsidiært det hen godtar hvis spesifiseringen
  eller varselet kom i tide.» «Appen regner ikke ut hva noen måtte forstå.»
- [VS-U3](../../plans/vedtak.md#vs-u3): løsningen utleder virkningen av standpunktet etter punkt
  34.3.3 første ledd, og registrerer og viser punkt 34.3.3 annet ledd med frist og bestemmelse.
  [VS-U2](../../plans/vedtak.md#vs-u2) og D-14 i BF-14: svarer byggherren ikke, viser løsningen
  bestemmelsen og fristen uten å trekke konklusjonen.
- Samlevedtaket for vederlagsmetoden punkt 5: «Det godkjenner ikke mengder, priser, kostnader
  eller noe beløp for det vederlaget.»
- Kartleggingen viste også til samlevedtaket for vederlagsmetoden punkt 11. Det punktet gjelder
  varselet etter punkt 34.4 (punkt 10), ikke punkt 34.3.3.

**Alternativene.**

- **A:** Byggherrens svar på et varsel etter punkt 34.3.3 første ledd som står alene, kan bare
  gjøre gjeldende at varselet kom for sent. Gjør byggherren det, står prinsipalt at
  totalentreprenøren bare har krav på slik justering av enhetsprisen som byggherren måtte forstå
  at forholdet ville føre til, og løsningen regner ikke ut hva byggherren måtte forstå. Byggherren
  tar stilling til selve justeringen i svaret på kravposten, og det svaret viser til svaret på
  varselet. Ellers står byggherrens syn i begrunnelsen, som løsningen ikke tolker (KA-U16).
  Løsningen avgjør ikke om varselet kom i tide, eller om svaret oppfyller svarplikten etter punkt
  34.3.3 annet ledd. Forhold: presiserer VS-U48, snevrer inn VS-U4 for et varsel som står alene
  (det subsidiære standpunktet venter til svaret på kravposten).
- **B (anbefalt):** Byggherrens svar på et varsel etter punkt 34.3.3 første ledd som står alene,
  har byggherrens standpunkt til om enhetsprisene skal justeres: byggherren godtar eller bestrider
  justeringen. Standpunktet godkjenner ikke priser, mengder eller beløp. Byggherren kan i samme
  svar gjøre gjeldende at varselet kom for sent. Da står prinsipalt at totalentreprenøren bare har
  krav på slik justering av enhetsprisen som byggherren måtte forstå at forholdet ville føre til,
  og subsidiært standpunktet til justeringen hvis varselet kom i tide (VS-U4). Løsningen regner
  ikke ut hva byggherren måtte forstå, og avgjør ikke om varselet kom i tide eller om svaret
  oppfyller svarplikten etter punkt 34.3.3 annet ledd. Byggherren tar stilling per kravpost i
  svaret på kravet. Forhold: presiserer VS-U48, bygger på VS-U4, følger samlevedtaket for
  vederlagsmetoden punkt 5.

**Anbefalt: B.** Svarplikten i punkt 34.3.3 annet ledd gjelder innsigelsene mot kravet, og VS-U4
gir alt mottakeren av «kravet eller varselet» et prinsipalt og et subsidiært standpunkt. Med A kan
byggherren bare få en innsigelse mot justeringen registrert i fritekst, som løsningen ikke tolker,
og et svar som bare godtar justeringen kan ikke uttrykkes. Kostnaden med B: byggherren tar stilling
til justeringen to ganger, på varselet og på kravposten. Avviker det siste fra det første, viser
løsningen begge (arbeidsvalg 5).

**Prøvingen mot vedtakene.** B strider ikke mot VS-U48, VS-U4, KA-U64, KA-U57 (d) eller
samlevedtaket for vederlagsmetoden punkt 5: varselet har ingen kravpost, og standpunktene per
kravpost kommer i svaret på kravet. B gjør standpunktet til justeringen til et vedtatt innhold i
svaret på varselet. For svaret på kravposten er ordene fortsatt design (S-11). A snevrer inn VS-U4
for et varsel som står alene, og det står i alternativet.

**Hva valget styrer.** Svarskjemaet for varselet etter punkt 34.3.3 (G-9), standpunktene i et svar
som gjelder et varsel, når løsningen slutter å vise fristen etter punkt 34.3.3 annet ledd, og hva
svaret på kravposten viser fra svaret på varselet.

**Svar:**

## Det tekniske avsnittet: navnene i lagringsformatet (B-17)

Svar 6 A 07.11 ([spørsmålsfila](../bygging-bf14-2026-11-07/sporsmal.md#svar-fra-oppdragsgiver-0711))
ga navnene for kravposten, standpunktet `oppgjoersform` og `gjelder` i beløpsstandpunktet og
innsigelsene etter punkt 34.3.3 og 34.4. Disse står igjen før første ekte hendelse. Navnene følger
av B-17 og mønsteret i 6 A. **Anbefalt:** de føres som arbeidsvalg i domenetabellen («Navn i
lagringsformatet»), uten et eget spørsmål.

1. **Kravet om tilbud (KA-U69):** feltet `krever_tilbud` (sann) i standpunktet `oppgjoersform`,
   fordi KA-U69 sier «sammen med standpunktet til beregningsregelen for posten». Formatet avviser
   feltet for en kravpost med oppgjørsformen `tilbud` (D-15). Forkastet: en egen art
   `tilbudskrav`, som ville gi to standpunkter med samme `gjelder` for én handling.
2. **Standpunktet til justeringen:** en egen art `justering` med `gjelder` (kravpostens `id`, eller
   varselets `id` ved svar på varselet), `hjemmel` `34.3.2` og `godtar` (sann eller usann), bare
   for en kravpost med `justert`. Egen art, ikke et felt i `oppgjoersform`, fordi den står i et
   senere lag enn oppgjørsformen og innsigelsen etter punkt 34.3.3 (VS-U4, VS-U56), og
   beslutningsgrunnlaget fryser ett lag per standpunkt (`virkninger`).
3. **Innsigelsene etter punkt 34.3.3 og 34.4:** standpunktet `rettidighet` med `hjemmel` `34.3.3`
   eller `34.4` og `gjelder` lik kravpostens `id`, som 6 A. I svaret på et varsel som står alene, er
   `gjelder` varselets `id`. `gjelder` i `rettidighet` er i dag varselet eller kravversjonen
   (`Standpunkt` i [`typer.ts`](../../../kjerne/typer.ts)); for kravposten leses varselet av
   `utledning/kravposter.ts`. `hjemmel` mangler i dag `34.3.3` og `34.4` (`Hjemmel` i `typer.ts`).
4. **`saerskilt` i beløpsstandpunktet:** verdiene `produktivitet` og `rigg_og_drift`, de samme
   navnene som i kravet. Beløpsstandpunktet har enten `gjelder` (kravposten) eller `saerskilt`.
   I dag tar formatet bare `produktivitet` (`STANDPUNKT.beloep` i `format/format.ts`).
5. **Utregningen per post og per lag:** `utregning.poster` erstatter `godkjent_beloep` og
   `subsidiaert_*`, som bare har to lag. Hver rad har `gjelder` eller `saerskilt` og `lag`, en
   liste med `lag` og `beloep`. `beloep` mangler når posten ikke har et fast beløp i laget eller
   beløpet ikke er besvart (KA-U58); hvorfor, leses av standpunktene. Summen per lag lagres ikke,
   fordi den regnes av radene og står i den frosne brevteksten (OV-U73). Hvem som leser `resultat`
   i dag, kartlegges i økt 2 før feltet endres.
6. **Svaret på et varsel som står alene** (etter spørsmål 1): et svar i sporet vederlag med
   `gjelder` lik varselets `id`, standpunktene `rettidighet` og `justering` og uten `utregning`.

Raden for varslene etter § 34.3.3 og § 34.4 i domenetabellen sier fortsatt at varslene har
`gjelder` lik kravpostens `id`. [VS-U54](../../plans/vedtak.md#vs-u54) sier at raden rettes; det
hører til økt 3 (G-10).
