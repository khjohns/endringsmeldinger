# Spørsmålene om fristoversikten (BF-45)

Spørsmålene til oppdragsgiver fra designsløyfa for siden for fristforlengelsen i Varden (#1900), lagret
ordrett før de stilles ([vedtaksskillen](../../../.claude/skills/vedtak/SKILL.md)). Bestillingen er
[BF-45](../../domenetabell/brukerforlop/BF-45.md). Svarene føres i denne fila og i bestillingen.

Ingen av spørsmålene berører en rettsregel. De er valg om visningen og arbeidsflyten og blir U-punkter i
bestillingen, ikke vedtak. Det som følger av et vedtak eller av BF-44, står under «Avgrensning» og stilles
ikke.

## Utgangspunktet

Siden følger BF-44 i oppsett B med panel B: tråden med handlingen ved brevet og brevet ved siden av,
saksomslaget til venstre og «Kravet og svaret» under tråden. Det som er nytt for fristen, er at kravet har
én rad per frist i kontrakten ([KA-U73](../../plans/vedtak.md#ka-u73),
[KA-U74](../../plans/vedtak.md#ka-u74)), at dagene ikke legges sammen ([BF-20 U-1](../../domenetabell/brukerforlop/BF-20.md)),
og at lagene i svaret er ulike: varselet etter punkt 33.4 og hindringen gjelder hele kravet
([KA-U80](../../plans/vedtak.md#ka-u80), [KA-U81](../../plans/vedtak.md#ka-u81)), mens dagene
byggherren måtte forstå og dagene byggherren godtar, står per frist ([KA-U78](../../plans/vedtak.md#ka-u78)).
Utregningen har lagene per frist etter #1903.

Den gamle prototypen `fristoversikt.html` (v1) har ett tall for dagene og står igjen som commit `59bd3d0`.

## Avgrensning

Dette er ikke spørsmål.

- **Mønsteret fra BF-44.** Tråden, panelet, topplinja, akseptfristen ved brevet, «Andre handlinger» og
  pakken til godkjenning følger [BF-44](../../domenetabell/brukerforlop/BF-44.md) og systemfila.
- **Ingen sum.** Dagene gjelder hver frist for seg ([BF-20 U-1 og U-12](../../domenetabell/brukerforlop/BF-20.md)).
- **Innsigelsene som rammer hele kravet, står én gang** ([BF-20 U-12](../../domenetabell/brukerforlop/BF-20.md),
  systemfila, «Leselinja for et svar med lag»).
- **Gjeldende frist** tar med forlengelsene i andre saker ([KA-U77](../../plans/vedtak.md#ka-u77),
  [GFK-U26](../../plans/vedtak.md#gfk-u26)).
- **Forsering** føres som egen sak utenfor løsningen, og saken viser at den ikke støttes ennå
  ([OV-U2](../../plans/vedtak.md#ov-u2)). Spørsmål 3 gjelder bare hvordan.
- **Verdien for fullmakten** i pakken til godkjenning er summen for de dagmulktbelagte fristene, med hver
  frist for seg ([GFK-U21](../../plans/vedtak.md#gfk-u21), [GFK-U20](../../plans/vedtak.md#gfk-u20)).

## Spørsmålene

**1. Kortet med kravet og svaret når kravet har flere frister.** I vederlaget har kortet én målestokk for
summen og en tabell per post. Fristen har ingen sum, og to av lagene er like for alle fristene.

- **A (anbefalt).** Lagene som gjelder hele kravet, står én gang øverst, med vilkåret i brevets ord
  («Prinsipalt: 0 dager for alle fristene. Byggherren gjør gjeldende at varselet etter punkt 33.4 kom for
  sent.»). Under står én blokk per frist: nummeret og navnet, gjeldende frist, og målestokken i dager med
  kravet åpent og hvert lag som er ulikt per frist fylt. Alle fristene har samme skala. Ingen egen tabell.
- **B.** Lagene som gjelder hele kravet, står én gang øverst som i A. Under står en tabell med én rad per
  frist og én kolonne for kravet og for hvert lag, som «Lagene samlet» i svarskjemaet, uten målestokk.
- **C.** En fristlinje: fristene på en tidsakse med gjeldende frist, den krevde datoen og datoen i hvert lag,
  som tidslinja i `fristkrav-te.html`.

Anbefalingen: A har samme form som vederlaget (kravet åpent og det godkjente fylt, systemfila «Brevene»),
og dagene for fristene kan sammenlignes på samme skala. B sier det samme med tall og kan bli valget på smal
skjerm. C setter datoene i kontrakten på samme linje som datoene i tråden, og avstanden mellom fristene
sier ikke noe om kravet. Prototypen har A og B som en bryter i mockup-linja.

**2. Ny dato ved dagene.** Brevet angir bare dagene ([BF-20 D-9](../../domenetabell/brukerforlop/BF-20.md)).
Skjemaet for kravet viser ny dato regnet fra gjeldende frist (BF-20 U-2).

- **A (anbefalt).** Ved dagene i kravet og i hvert lag står ny dato, og blokken for fristen sier én gang hva
  datoen er regnet fra: «Gjeldende frist 26. august 2027: avtalt 16. august, forlenget 10 dager i sak E-009».
- **B.** Bare dagene i lagene. Ny dato står bare ved kravet.
- **C.** Bare dagene. Datoene står i skjemaet for kravet.

Anbefalingen: datoen er det partene planlegger etter, og visningen regner den på samme måte som skjemaet.
Linja om gjeldende frist sier hva datoen bygger på, slik [MM-U23](../../../.interface-design/system.md#mm-u23)
krever for et tall som ikke står i brevet.

**3. Forsering etter punkt 33.8 på siden.** Forsering føres som egen sak utenfor løsningen
([OV-U2](../../plans/vedtak.md#ov-u2)). Totalentreprenøren kan velge forsering når byggherren prinsipalt har
avslått dager ([FO-U1](../../plans/vedtak.md#fo-u1)). Kjernen tilbyr ikke handlingen.

- **A (anbefalt).** Under «Andre handlinger» for totalentreprenøren står «Anse avslaget som pålegg om
  forsering», i samme form som de andre, med linja «Forsering er ikke bygget i Varden og sendes som egen sak.»
  Raden står bare når byggherren prinsipalt har avslått dager. Ingen utregning på siden.
- **B.** Som A, med 30 %-grensen (dagmulkten for de avslåtte dagene og 30 % tillegg) i raden, som i den
  gamle prototypen.
- **C.** En melding under kortet med kravet og svaret om at forsering ikke støttes ennå, uten handling.

Anbefalingen: A sier det OV-U2 krever der totalentreprenøren leter etter handlingen, i formen systemfila
har for en brevtype som ikke er bygget. Grensen hører til forløpet for forsering (#1436), der den regnes
per frist ([GFK-U19](../../plans/vedtak.md#gfk-u19)–[GFK-U21](../../plans/vedtak.md#gfk-u21)).

**4. Å ta ut én frist.** Totalentreprenøren tar ut en frist i en ny versjon av kravet
([KA-U75](../../plans/vedtak.md#ka-u75), BF-20 U-10). Å trekke hele kravet er et avkall
([KA-U76](../../plans/vedtak.md#ka-u76)) og står som «Trekk kravet» under «Andre handlinger».

- **A (anbefalt).** Ingen egen handling. Linja under «Revider krav» sier at fristene kan endres eller tas ut
  i det nye brevet.
- **B.** En egen rad «Ta ut en frist» under «Andre handlinger», som åpner skjemaet for det nye kravet med
  fristen merket «Trekkes».

Anbefalingen: å ta ut en frist er et nytt brev med kravet, og en egen rad ville sett ut som et trekk med en
annen virkning enn «Trekk kravet».

## Svarene

Ikke besvart ennå.
