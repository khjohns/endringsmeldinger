# Spørsmål til oppdragsgiver 26.10: hvordan vederlaget skal justeres

Den egne vedtaksrunden for metodevalget i [#909](https://github.com/khjohns/endringsmeldinger/issues/909).
Grunnlaget er [kartleggingen](https://github.com/khjohns/endringsmeldinger/issues/909#issuecomment-6408706559)
og [forløpene og rettelsene fra sparringen](https://github.com/khjohns/endringsmeldinger/issues/909#issuecomment-6409045089)
26.10. Utgangspunktet er retning (i) der.

Spørsmålene berører rettsregler og stilles som en nummerert liste i tekst, ikke med
spørsmålsverktøyet (vedtaksskillen). Fila er skrevet før spørsmålene ble stilt, og
alternativene står ordrett slik de legges fram. Svarene føres inn ordrett under hvert
punkt. **Ingenting er valgt.**

Forslaget er ett samlet forslag (alternativ A i hvert punkt), som oppdragsgiver kan svare
«ja» på med rettelser per punkt. Der det finnes et reelt valg, står de andre alternativene
under, også i vedtaksform. Forholdet til vedtakene står i hvert alternativ.

**Begrepene.**

- *Beregningsregelen* er regelen kontrakten gir for justeringen når partene ikke har avtalt
  den: kontraktens enhetspriser (§ 34.3.1) eller regningsarbeid (§ 34.4 og punkt 30). HF-U14
  kaller det samme «beregningsmåten». Begge ordene føres i domenetabellen.
- Et *tilbud* (§ 34.2.1) er et forslag om et avtalt vederlag, *oppgjør som fast sum* i
  vedtakene.
- *Kostnadsoverslaget* er overslaget etter § 30.2.
- *Svaret 25.10 om vilkår* er alternativ D1 i spørsmål 3b i
  [vurderingen av vedtakene](https://github.com/khjohns/endringsmeldinger/pull/1282). Det er
  besluttet av oppdragsgiver 25.10, men ennå ikke ført i vedtaksfila. Det får sin ID når det
  føres.

## Avgrensningen

Løsningen håndterer kravet, beregningsregelen, begrunnelsen og motpartens standpunkt.
Fakturering, prisposter, mengdekontroll, kostnadsoppgavene og kontrollen av dem, og
avregningen skjer utenfor løsningen (oppdragsgiver 26.10, #909).

## Forløpene som ble prøvd

De fem forløpene i kommentaren 26.10 og de tre som manglet. De tre siste er prøvd av en
subagent mot dagens modell og mot retning (i). Den kjørte dem i kjernen i minnet på `main`
`6883ad9` (**K**), leste koden (**L**) og vurderte (**V**). Server og database er ikke prøvd.

1. **Endre en avtalt beregningsregel.** I dagens modell finnes ingen vei: et krav etter
   enhetspriser eller regningsarbeid gir `UGYLDIG_FORM`, og etter enighet tilbyr kjernen TE
   bare et nytt varsel (K). Etter retning (i) trengs en egen handling med forslag og
   samtykke, som ikke er trekk eller ny kravversjon. Et delvis samtykke kan ikke uttrykkes
   (V).
2. **Tilbud, arbeidet utføres før svar, og tilbudet avslås.** I dag finnes ikke varselet
   etter § 34.4, og byggherrens avslag av tilbudet har alltid et beløp (K):
   - godtar TE et avslag med 0 kr, registreres et avkall;
   - godtar TE et avslag med 200 000, registreres 200 000 som fast sum;
   - i begge tilfeller er kravene avgjort, og TE har ingen handling igjen utenom et nytt
     varsel.

   Byggherren tjener på å svare 0 kr (V).
3. **Varslene.**
   - Varselet etter § 34.4 må kunne sendes også etter kravet og ved et tilbud. Det knytter
     seg til når arbeidet settes i gang, ikke til kravet (V).
   - Et spørsmål om når arbeidet startet, lønner det seg å svare uriktig på (V).
   - Sendes varselet fra løsningen før et tidligere varsel er oppgitt, låses datoen (SK-12),
     og det tidligere kan ikke lenger oppgis (V).
   - Et økt overslag er aldri et varsel av seg selv. Varselet etter § 30.2 kan komme flere
     ganger og kan ikke låses én gang per spor (V).

Gjennomgående:

- Svaret om beregningsregelen må skilles fra beløpet.
- Teller enighet om beregningsregelen ikke etter OV-U3, blir et krav om regningsarbeid aldri
  avgjort i løsningen. Saken kan da heller ikke inngå i en endringsordre (`kanInngaaIEo`
  krever `kraveneErAvgjort`) (L).

Utkastet ble deretter prøvd mot vedtaksfila av en ny subagent. Rettelsene er tatt inn:
- VS-U28 sender selve kostnadsoverslaget utenfor løsningen (punkt 2).
- TEs aksept omfatter hele svaret, også en påberopt preklusjon (KA-U1) (punkt 4).
- Sammenfall krever et svar uten vilkår og preklusjon (HF-U7) (punkt 4).
- Fullmakten følger GFK-06 (punkt 7).
- Det særskilte kravet har beløp etter VS-U5 og OV-U22 (punkt 13). Etter den andre
  sparringen foreslås et skjæringspunkt i stedet for beløp, når kravet ikke er et tilbud.
- Punkt 8–10 knyttes til regelen partene er enige om, ikke til formen kravet hadde.

Etter det har sparringen lest utkastet (commit `ab02fbd`), og oppdragsgiver har gitt en
føring. Begge står ordrett under. En subagent prøvde sparringen mot vedtakene og koden, og
prøvde også forløpet sparringen ba om og to forløp med endringsordren. Alle fem punktene i
sparringen holdt, og rettingene er tatt inn i punkt 4, 7, 8, 9, 10, 12, 13 og det nye punkt
14.

**Føringen fra oppdragsgiver 26.10, ordrett:** «Til orientering er vedtakene veldig begrenset
på dette området og vi må finne den løsningen som best ivaretar en god arbeidsmåte for
partene å håndtere kontraktsforholdet her, både når det gjelder KOE og EO». Alternativene er
derfor vurdert etter partenes arbeidsmåte. At et alternativ endrer et vedtak, er ikke et
argument mot det.

**Forløpene etter sparringen:**

4. **Tilbudet er ubesvart, og arbeidet utføres som regningsarbeid.** Med punkt 9 og 10 slik de
   sto, kunne TE ikke oppgi overslag eller varsle overskridelse uten å sende en ny
   kravversjon. Det kaller i praksis tilbake tilbudet. Ellers måtte TE sende alt utenfor
   løsningen (V). Et overslag under et ubesvart tilbud er verken et tilbakekall av eller et
   forbehold til tilbudet, når brevet sier at tilbudet står (V). Byggherren kan la tilbudet
   stå og se overslagene før byggherren velger. Kontrakten demper det med «rimelig tid» etter
   § 34.2.1, men løsningen avgjør det ikke (V).
5. **Byggherren utsteder en endringsordre der vederlaget justeres som regningsarbeid eller
   etter enhetspriser, uten beløp.** § 31.3 krever ikke et beløp i endringsordren. EO-U8 lar
   endringsordren ha utsagn om pris, men nevner «tallene». Det finnes ikke noe sted for TEs
   overslag og varsler når regelen er avtalt i en endringsordre (L, V).
6. **En KOE-sak med enighet om regelen, men ikke om beløpet, skal inngå i en endringsordre.**
   Det er ikke mulig i dag (`kanInngaaIEo` krever `kraveneErAvgjort`, L). Hindringen er OV-U3
   og EO-U5, ikke kontrakten (V).

## Brukerforløpet

Forslaget følger det brukeren skal få gjort:

| Steg | Hvem | Punkt |
| --- | --- | --- |
| Krever vederlag og sier hvordan det skal justeres | TE | 1, 2, 3 |
| Tar stilling til beregningsregelen | BH | 4, 5, 6, 7 |
| Er enige om beregningsregelen, og vederlagskravet er ferdig i løsningen | begge | 8 |
| Oppgir overslag og varsler overskridelse underveis, også mens et tilbud er ubesvart | TE | 9, 10 |
| Vil endre beregningsregelen de er enige om | begge | 11 |
| Avtaler beløpet | begge | 12 |
| Det løsningen ikke tar imot | – | 13 |
| Tar saken inn i en endringsordre, eller avtaler regelen i en endringsordre | begge | 14 |

---

## 1. TEs krav: tilbud, enhetspriser eller regningsarbeid

**Bakgrunn.**

- Formatet godtar i dag bare tilbud. Brevet sier alltid «Kravet er et tilbud etter NS 8407
  § 34.2.1.» (LV-U4 punkt 2, LV-U30).
- VS-U28: «I første versjon kan totalentreprenøren kreve vederlag etter regning (§ 34.4) fra
  appen, med et anslått beløp som kravversjon.»
- OV-U14 lyder «bare § 34.3.1, § 34.3.2 og § 34.3.3 avvises». Det er lest som at § 34.3.1 er
  med (punkt 13).
- HF-U5 behandler TEs krav som tilbud etter avtaleloven.
- Punktet tar også stilling til om beløpet i et krav etter enhetspriser binder (N2 i #909).

**Alternativ A (foreslått):** «TE oppgir i vederlagskravet hvordan TE mener vederlaget skal
justeres: som tilbud etter § 34.2.1, etter kontraktens enhetspriser etter § 34.3.1 eller som
regningsarbeid etter § 34.4 og punkt 30. Et krav etter enhetspriser eller regningsarbeid er
ikke et tilbud om fast sum. Det er TEs standpunkt om hvilken beregningsregel kontrakten gir,
og et tilbud etter HF-U5 bare om beregningsregelen. Et beløp i et krav etter enhetspriser er
TEs beregning og ikke et tilbud. Byggherrens standpunkt om beregningsregelen godkjenner ikke
mengder, priser, kostnader eller noe beløp. Brevteksten for et krav etter enhetspriser: «TE
krever justering av vederlaget etter kontraktens enhetspriser (NS 8407 § 34.3.1). Etter TEs
beregning utgjør justeringen <beløp> kr eks. mva. Beregningen er ikke et tilbud.» For et krav
om regningsarbeid: «TE krever justering av vederlaget som regningsarbeid (NS 8407 § 34.4 og
punkt 30).» Setningen «Kravet er et tilbud etter NS 8407 § 34.2.1.» står bare når kravet er
et tilbud. Skjemaet for et tilbud sier at tilbudet ikke erstatter varselet før regningsarbeid
etter § 34.4 eller kostnadsoppgavene etter § 30.3, dersom tilbudet ikke aksepteres. Forhold:
utvider det OV-U1 og OV-U14 bygger med krav etter § 34.3.1 og § 34.4; presiserer HF-U5 for et
krav som ikke er tilbud; endrer LV-U30 og utvider LV-U4 punkt 2, slik at setningen om tilbud
bare står i et tilbud; endrer VS-U28, slik at et krav om regningsarbeid ikke har et anslått
beløp som kravversjon (punkt 2 og 9).»

**Alternativ B:** «Som A, men beløpet i et krav etter enhetspriser er det beløpet TE krever.
Brevteksten: «TE krever justering av vederlaget etter kontraktens enhetspriser (NS 8407
§ 34.3.1) med <beløp> kr eks. mva.» Byggherren tar stilling til beløpet som til andre beløp.
Godkjenner byggherren hele beløpet, er partene enige om det (HF-U7, HF-U9). Forhold: som A,
men presiserer HF-U7 og HF-U9 for krav etter enhetspriser.»

**Hva valget styrer:** under B kan en full godkjenning gjøre TEs foreløpige mengder til et
tak. En senere riktig beregning avvises da (KA-U7). Under A avregnes
beløpet utenfor løsningen, eller avtales særskilt (punkt 8 og 12).

**Svar:**

## 2. Kostnadsoverslaget ved regningsarbeid

**Bakgrunn.**

- Etter § 30.2 kan byggherren kreve et kostnadsoverslag. Kontrakten krever ikke et overslag
  for å kreve regningsarbeid. Varslingsplikten i § 30.2 annet ledd knytter seg til
  overslaget.
- VS-U28: «Kostnadsoverslaget, totalentreprenørens varsel om at det vil bli overskredet, og
  tilbakeholdelsen etter § 30.2, og oppgavene og kontrollen etter § 30.3, sendes utenfor
  appen og registreres etter OV-U4.»
- Retning (i) tar overslaget inn i løsningen. Spørsmålet er om overslaget i løsningen er
  overslaget etter § 30.2, og om det er obligatorisk.

**Alternativ A (foreslått):** «TE kan oppgi kostnadsoverslaget etter § 30.2 i løsningen, i
kravet om regningsarbeid eller senere (punkt 9). Overslaget er valgfritt. Uten overslag sier
visningen at overslag ikke er oppgitt, og beløpet er ukjent, ikke 0 (MM-U28). Et krav om
regningsarbeid uten overslag er ikke et krav på 0 (KA-U8). Brevet sier, etter kravet eller
for seg: «TE oppgir kostnadsoverslag etter NS 8407 § 30.2 på <beløp> kr eks. mva. Overslaget
er ikke et tilbud, og vederlaget beregnes etter NS 8407 § 30.1.» Skjemaet sier at
varslingsplikten i § 30.2 annet ledd gjelder overslaget som oppgis. Byggherrens krav om
overslag og tilbakeholdelsen etter § 30.2 sendes fortsatt utenfor løsningen og registreres
etter OV-U4. Forhold: endrer VS-U28, slik at kostnadsoverslaget kan oppgis i løsningen og ikke
er kravets beløp; presiserer MM-U28 og KA-U8.»

**Alternativ B:** «Som A, men et krav om regningsarbeid har alltid et kostnadsoverslag.
Forhold: endrer VS-U28, slik at kostnadsoverslaget oppgis i løsningen og ikke er kravets beløp.»

**Alternativ C:** «Et krav om regningsarbeid har et anslått beløp, som VS-U28 sier. Anslaget
er ikke kostnadsoverslaget etter § 30.2. Kostnadsoverslaget og varselet om at det vil bli
overskredet sendes utenfor løsningen og registreres etter OV-U4, som VS-U28 sier. Forhold:
presiserer VS-U28.»

**Hva valget styrer:**

- Under A og B kan TE og byggherren følge overslaget og varselet om overskridelse i
  løsningen (punkt 9 og 10).
- Under A får byggherren ikke alltid et tall, og fullmakten må da regne svaret som ikke
  tallfestet (punkt 7).
- Under B må TE oppgi et tall før det kan anslås forsvarlig, og tallet kan senere bli brukt
  som et tak. Varslingsplikten knytter seg da også til dette tallet.
- Under C finnes to tall, anslaget i løsningen og overslaget utenfor. Punkt 10 må da følge
  10B.

**Svar:**

## 3. Varselet før regningsarbeidet settes i gang (§ 34.4)

**Bakgrunn.** VS-U28 lar varselet sendes fra løsningen som eget utsagn, eller lar TE oppgi
datoen for et varsel sendt utenfor, «som etter OV-U5». Punktet følger av VS-U28 og foreslås
uten motalternativ. Det presiserer hvordan varselet henger sammen med kravet.

**Forslag:** «Et krav om regningsarbeid er ikke i seg selv et varsel etter § 34.4 første
ledd. Varselet er et eget utsagn etter VS-U28. Det kan sendes for seg, eller i samme brev som
et krav eller et forslag etter punkt 11 ved et uttrykkelig valg uten forhåndsvalg. Det kan
sendes også etter at vederlagskravet er sendt, uansett hvilken form kravet har, også ved et
tilbud. Sperren i OV-U8 for et nytt varsel etter § 34.1.2 gjelder ikke dette varselet. Før
varselet sendes fra løsningen, spør skjemaet om det er sendt et varsel utenfor løsningen. TE
kan da oppgi datoen etter OV-U5. Datoen settes én gang (SK-12), og er et varsel etter § 34.4
registrert i sporet, kan det ikke sendes et nytt. Skjemaet spør ikke når arbeidet ble satt i
gang. Brevteksten: «TE varsler etter NS 8407 § 34.4 første ledd at arbeidet i sak
<saksnummer> («<sakstittel>») utføres som regningsarbeid.» Er kravet et tilbud, følger:
«Varselet gjelder dersom byggherren ikke aksepterer tilbudet.» Byggherren kan gjøre gjeldende
i svaret at varselet ikke ble gitt eller kom for sent, uten utledet virkning (VS-U28).
Forhold: presiserer VS-U28, OV-U5, OV-U8 og SK-12.»

**Hva valget styrer:** TE kan varsle når arbeidet må settes i gang før byggherren har svart,
uten å bli presset til å oppgi når arbeidet startet. Kostnaden: svarer TE at det ikke er
sendt et varsel utenfor, og sender fra løsningen, kan et tidligere varsel ikke oppgis senere.

**Svar:**

## 4. Byggherrens standpunkt om beregningsregelen, og TEs aksept

**Bakgrunn.**

- I dag kan byggherren bare godkjenne oppgjør som fast sum (LV-U32) eller ikke akseptere
  tilbudet. Ved avslaget sier byggherren hvilken regel byggherren mener gjelder, og svaret
  har alltid et beløp (arbeidsvalget i #479).
- Forløp 2 viste at TEs aksept av et slikt svar blir et avkall eller en fast sum (K).
- TEs aksept gjelder hele svaret, også preklusjon og subsidiære standpunkter (KA-U1).
- Punktet samler spørsmålene 1, 3, 4 og 5 i kartleggingen.

**Alternativ A (foreslått):**

«Byggherren tar i svaret på vederlagskravet stilling til hvordan vederlaget skal justeres,
som et eget standpunkt:

- **Er kravet et tilbud,** godkjenner byggherren oppgjør som fast sum med beløpet og
  forbeholdene i svaret (LV-U31, LV-U32), eller aksepterer ikke tilbudet og oppgir om
  vederlaget etter byggherrens syn skal justeres etter kontraktens enhetspriser eller som
  regningsarbeid.
- **Er kravet etter enhetspriser eller regningsarbeid,** er byggherren enig i regelen TE
  krever, eller mener at den andre regelen gjelder.

Bare godkjenningen av oppgjør som fast sum har et beløp. Standpunktene etter VS-U5 og OV-U22
om et særskilt krav etter § 34.1.3 står som før.

Brevtekstene:

- «Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd), og mener vederlaget
  skal justeres etter kontraktens enhetspriser (NS 8407 § 34.3.1) [som regningsarbeid (NS
  8407 § 34.4)].»
- «Byggherren er enig i at vederlaget skal justeres etter kontraktens enhetspriser (NS 8407
  § 34.3.1) [som regningsarbeid (NS 8407 § 34.4)].»
- «Byggherren mener at kontraktens enhetspriser ikke er anvendelige, og at vederlaget skal
  justeres som regningsarbeid (NS 8407 § 34.4).»
- «Byggherren mener at kontraktens enhetspriser er anvendelige, og at vederlaget skal
  justeres etter dem (NS 8407 § 34.3.1).»

Etter hvert av disse standpunktene følger: «Standpunktet gjelder hvordan vederlaget skal
beregnes. Det godkjenner ikke mengder, priser, kostnader eller noe beløp.» Standpunktet står
i det laget innsigelsene i svaret gir det (OV-U32, OV-U33).

Er byggherren enig i regelen TE krever, står standpunktet i sporets første lag eller er
upåvirket (lagene regnes uten grunnlaget, OV-U32), og har svaret ingen vilkår etter svaret
25.10 om vilkår, faller standpunktene sammen. Partene er da enige om beregningsregelen uten
TEs aksept. Er grunnlaget avslått eller preklusjon etter § 32.2 påberopt, er enigheten
betinget av grunnlaget (GR-U7). Ellers tar TE stilling ved å godta svaret eller sende en ny
kravversjon (HF-U8).

TEs aksept gjelder hele byggherrens svar i vederlagssporet (KA-U1): standpunktet om
beregningsregelen, en påberopelse etter § 34.1.2 eller § 34.4 og eventuelle vilkår. Den
gjelder ikke byggherrens svar på grunnlaget, også når det står i samme brev. Et avslag av
grunnlaget og en påberopelse av preklusjon etter § 32.2 er standpunkter i grunnlagssporet, og
TE tar stilling til dem for seg (GR-U7). Etter aksepten gjelder:

- Står standpunktet om beregningsregelen i sporets første lag eller er upåvirket, er partene
  enige om regelen svaret oppgir. Er grunnlaget avslått eller preklusjon etter § 32.2
  påberopt, er enigheten betinget av grunnlaget (GR-U7, KA-U7).
- Påberoper byggherren prinsipalt at varselet etter § 34.1.2 kom for sent, er partene enige om
  at kravet ikke fører fram (HF-U9). Aksepten er da et avkall på kravet (HF-U10), og et
  subsidiært standpunkt om beregningsregelen får ingen virkning.
- Har svaret en påberopelse etter § 34.4, er TE enig i den. Løsningen utleder ingen virkning
  av den (VS-U28).

Brevet for aksepten følger LV-U4 punkt 6. Er standpunktet subsidiært fordi grunnlaget er
avslått eller preklusjon etter § 32.2 er påberopt, legger brevet til: «TE er enig i
beregningsregelen, men ikke i byggherrens standpunkt til grunnlaget.» Før aksepten sendes,
viser skjemaet hvert standpunkt aksepten omfatter, og sier det uttrykkelig når aksepten er et
avkall. Utenom det tilfellet er aksepten ikke et avkall, og et tilbud er ikke akseptert.

En revisjon som endrer byggherrens standpunkt fra enig i TEs regel til den andre regelen,
avvises. Det motsatte er tillatt. Når byggherren har avslått et tilbud, kan en revisjon bytte
regelen byggherren oppgir, fordi ingen av dem er innrømmet TE.

Byggherren kan gjøre standpunktet avhengig av vilkår etter svaret 25.10 om vilkår.

Forhold: endrer arbeidsvalget i #479, slik at standpunktet ikke har beløp og også gjelder krav
som ikke er tilbud; LV-U31 og LV-U32 står for tilbud; utvider LV-U4 punkt 5 og punkt 6 med
brevtekstene; utvider HF-U14 til standpunktet om beregningsregelen; presiserer HF-U5, HF-U7,
HF-U9 og HF-U10 for sammenfall og aksept av et standpunkt om beregningsregelen; presiserer
KA-U1, GR-U7 og HF-U8 for standpunktet om beregningsregelen; utvider svaret 25.10 om vilkår
til et standpunkt som ikke godkjenner noe beløp.»

**Alternativ B:** «Byggherren tar stilling til beregningsregelen som i alternativ A, med de
samme brevtekstene, men svaret har også et beløp, som i dag. Godkjenner byggherren hele det
beløpet TE har oppgitt, er partene enige om beløpet (HF-U7, HF-U9). Godtar TE et svar som
avviker, er partene enige om svarets beløp. Forhold: som A, men arbeidsvalget i #479 står for
beløpet, og HF-U9 og HF-U10 gjelder uendret.»

**Hva valget styrer:**

- Under B blir TEs aksept av «regningsarbeid gjelder» et avkall når beløpet er 0 kr, og en
  fast sum når det har et beløp (K). Byggherren tjener da på å svare 0 kr.
- Under A kan partene bli enige om regelen uten å bli enige om et beløp.
- Under begge omfatter TEs aksept en påberopt preklusjon etter § 34.1.2, men ikke
  grunnlagssvaret eller en preklusjon etter § 32.2. Skjemaet viser det før aksepten sendes.

**Svar:**

## 5. Akseptfrist i et svar om beregningsregelen

**Bakgrunn.**

- HF-U15 lar byggherren sette en akseptfrist bare i et svar som godkjenner et beløp eller
  dager og ikke stemmer med kravet.
- Svaret 25.10 om vilkår sier at et svar med vilkår ikke stemmer med kravet, så byggherren
  kan sette en akseptfrist (HF-U15).
- Et standpunkt om beregningsregelen har ikke beløp etter punkt 4A.
- Spørsmålet er N3 i #909.

**Alternativ A (foreslått):** «Et svar som tar standpunkt til beregningsregelen uten å
godkjenne et beløp, har ingen akseptfrist for dette standpunktet. Det gjelder også når
standpunktet ikke stemmer med kravet eller har vilkår etter svaret 25.10 om vilkår. Om TE
godtar innen rimelig tid etter avtaleloven § 3, avgjør ikke løsningen (MM-U12). Forhold:
presiserer HF-U15 og svaret 25.10 om vilkår, slik at akseptfristen der bare gjelder et svar
som godkjenner beløp eller dager.»

**Alternativ B:** «Byggherren kan sette en akseptfrist i et svar som tar standpunkt til
beregningsregelen, når standpunktet ikke stemmer med kravet eller har vilkår etter svaret
25.10 om vilkår. Fristen følger HF-U16. Etter fristen er en aksept et nytt tilbud fra TE
(HF-U5, HF-U18). Forhold: utvider HF-U15; presiserer svaret 25.10 om vilkår.»

**Hva valget styrer:** under B gjør fristen at byggherrens standpunkt om at for eksempel
regningsarbeid gjelder, ikke lenger binder byggherren som tilbud. Kontraktens regel gjelder
likevel, så visningen kan gi inntrykk av at noe er tapt som ikke er det.

**Svar:**

## 6. Standpunktet om beregningsregelen i lagene, og preklusjon etter § 34.1.2

**Bakgrunn.** N5 i #909. Utfallet i kjernen er i dag bare et beløp. Punktet følger av OV-U27,
OV-U32, OV-U33 og MM-U28 og foreslås uten motalternativ.

**Forslag:** «Gjør byggherren gjeldende at varselet etter § 34.1.2 kom for sent, står
standpunktet om beregningsregelen subsidiært (OV-U27, OV-U32). I et lag der byggherren bare
har tatt stilling til beregningsregelen, er utfallet ukjent, ikke 0 (MM-U28). Forhold:
presiserer OV-U27, OV-U32, OV-U33 og MM-U28.»

**Svar:**

## 7. Fullmakten for et svar uten beløp

**Bakgrunn.**

- GFK-06 regner fullmakten av TEs krevde beløp, og et krav som ikke er tallfestet, krever
  hele kjeden.
- Presiseringen 24.09: «Et spor som besvares i samme brev, har verdien i svaret; ellers
  gjelder TEs krav.»
- Hele kjeden kan erstattes av den som har ubegrenset fullmakt (vedtaket 23.09, GFK-U4).
- En endringsordre med regningsarbeid uten beløp kan ikke verdsettes, og krever i dag
  ubegrenset fullmakt eller hele kjeden (L).
- Et standpunkt om beregningsregelen etter punkt 4A har ingen verdi. Regnes det som 0,
  slipper det gjennom fullmakten uten kontroll (L, `server/fullmakt.ts`).

**Påvist (L, V):**

- Et nytt overslag utløser ingen ny kontroll av fullmakten (punkt 9A). En ny kravversjon gjør
  det (HF-U8).
- Overslaget er ikke et tak, siden § 30.1 gir betaling for nødvendige kostnader og § 30.2
  forutsetter at overslaget kan bli overskredet. TEs krav etter GFK-06 er et tak for den
  kravversjonen.
- Oppdragsgiver forkastet i GFK-U3 at fullmakten regnes av en verdi kontraktsdataene ikke gir.
- Alternativ B gjør det lettere å binde byggherren til regningsarbeid gjennom et KOE-svar enn
  gjennom en endringsordre.
- Har TE sendt et tilbud, finnes det normalt ikke noe overslag. Begge alternativene krever da
  hele kjeden når byggherren avslår tilbudet med en regel.

**Antatt, ikke påvist:** at byggherren svarer med en fast sum for å slippe hele kjeden, og hvor
stor risikoen er når en med lav fullmakt binder byggherren til en regel.

**Alternativ A (foreslått):** «Et svar der byggherren tar standpunkt til beregningsregelen uten
å godkjenne et beløp, kan ikke verdsettes. Det krever hele kjeden, eller den som har ubegrenset
fullmakt, som en endringsordre uten beløp (GFK-06, vedtaket 23.09). TEs beregning og
kostnadsoverslag brukes ikke som verdi. Det samme gjelder byggherrens forslag og samtykke
etter punkt 11. Godkjenner byggherren oppgjør som fast sum, har svaret verdien i svaret
(presiseringen 24.09). Forhold: utvider GFK-06 til et svar uten beløp.»

**Alternativ B:** «Tar byggherren i svaret standpunkt til beregningsregelen uten å godkjenne et
beløp, regnes fullmakten for svaret av en verdi. Verdien er TEs beregning i et krav etter
enhetspriser, eller det kostnadsoverslaget TE sist har oppgitt når svaret utarbeides. Verdien
brukes bare i byggherrens interne kontroll av fullmakten. Den er ikke kravets beløp, ikke et
avtalt beløp og ikke et tak, og den står ikke i brevet. Finnes verken beregning eller
overslag, kan svaret ikke verdsettes. Svaret krever da hele kjeden, eller den som har
ubegrenset fullmakt (GFK-06, vedtaket 23.09). Oppgir TE senere et overslag over verdien
fullmakten ble regnet av, står standpunktet som er sendt. Visningen for byggherrens team sier
da at standpunktet ble godkjent for en lavere verdi. Det samme gjelder byggherrens forslag og
samtykke etter punkt 11. Godkjenner byggherren oppgjør som fast sum, har svaret verdien i
svaret (presiseringen 24.09). Forhold: utvider GFK-06 og presiseringen 24.09 til et svar uten
beløp.»

**Hva valget styrer:** under A kreves hele kjeden for hvert standpunkt om beregningsregelen,
og KOE-svaret og endringsordren behandles likt. Under B kan en med lav fullmakt binde
byggherren til en regel der kostnadene kan vokse forbi verdien uten ny kontroll. Setningen om
visningen i B er ny funksjonalitet og demper bare den følgen.

**Svar:**

## 8. Når vederlagskravet er ferdig i løsningen

**Bakgrunn.**

- OV-U3 regner kravene som avgjort når hvert krav er trukket eller har en virksom enighet. Da
  sperres trekk, ny kravversjon og revisjon.
- OV-U10 gir visningen teksten «Alle krav sendt i appen er avgjort». MM-U30 gir sporet høyst
  én betegnelse.
- EO-U5 lar en KOE-sak inngå i en endringsordre når grunnlaget er godkjent og minst ett av
  vederlag og frist har enighet. Et spor TE fortsatt kan sende, hindrer.
- § 31.3 krever ikke at endringsordren har et beløp. EO-U8 lar endringsordren gjengi noe
  partene har avtalt.
- Under regningsarbeid kan beløpet først avtales etter avregningen etter § 30.3, ofte lenge
  etter at arbeidet er utført.
- Den første sparringen 26.10 sa at enighet om metoden ikke av seg selv skal gi følgene av at
  kravene er avgjort. Utkastet fulgte det (det tidligere 8A). Den andre sparringen viste at
  trekk, som er et avkall, da ble eneste vei til å lukke saken, og at saken ikke kan inngå i
  en endringsordre. Etter føringen om arbeidsmåte foreslås derfor at enigheten avslutter
  vederlagskravet i løsningen.

**Alternativ A (foreslått):** «Enighet om beregningsregelen binder begge parter (KA-U7,
HF-U9). Den er en virksom enighet i vederlagssporet etter OV-U3 når grunnlaget er avklart etter
GR-U7, og ellers betinget. Den gjelder regelen partene er enige om, også når TEs krav var et
tilbud. Et tilbud byggherren ikke har akseptert, regnes da ikke lenger som krav i
nøkkeltallene. Enigheten er ikke enighet om beløp. TEs beregning og kostnadsoverslaget inngår
ikke i summen av virksom enighet, og utfallet er ukjent, ikke 0 (MM-U28). Sporet får
betegnelsen «Enige» (MM-U30). Linja under sier: «Om beregningsregelen: <kontraktens
enhetspriser / regningsarbeid>. Beløpet avregnes utenfor løsningen.» Ved regningsarbeid sier
den også: «Kostnadsoppgavene og kontrollen av dem etter § 30.3 håndteres utenfor løsningen.»
Når kravene er avgjort, godtas fortsatt TEs nye kostnadsoverslag (punkt 9), varselet etter
§ 30.2 (punkt 10), varselet etter § 34.4 (punkt 3), og et forslag om endret beregningsregel
og svaret på det (punkt 11). Ingen av dem endrer utfallet eller åpner sporet. Et godtatt
forslag erstatter regelen i enigheten. Vilkår som ikke er avklart etter svaret 25.10 om
vilkår, virker som før. Saken kan inngå i en endringsordre etter EO-U5, og endringsordren
gjengir regelen som avtalt (EO-U8, punkt 14). Forhold: endrer OV-U3, med en ny form for
virksom enighet og nye unntak fra sperren; presiserer OV-U10, MM-U28 og MM-U30; presiserer
EO-U5 og EO-U8; presiserer KA-U7 og HF-U9.»

**Alternativ B:** «Enighet om beregningsregelen binder begge parter (KA-U7), men er ikke en
virksom enighet etter OV-U3. Er partene enige om beregningsregelen, kan en part foreslå at
avregningen og oppgjøret av vederlagsjusteringen i saken skjer utenfor løsningen. Forslaget
følger formen i punkt 11. Når motparten samtykker, regnes vederlagskravet som avgjort etter
OV-U3. Samtykket er verken enighet om et beløp eller et avkall. Brevet: «<Part> foreslår at
avregningen og oppgjøret av vederlaget i sak <saksnummer> («<sakstittel>») etter
<beregningsregelen> skjer utenfor løsningen. Forslaget er ikke et avkall og ikke en avtale om
beløp. Forslaget gjelder til <dato> og faller bort uten samtykke.» Etter samtykket godtas
overslag, varsler og forslag om endret regel som i alternativ A. Forhold: endrer OV-U3, med en
ny måte å bli avgjort på; presiserer OV-U10 og EO-U5.»

**Alternativ C:** «I første versjon blir et vederlagskrav der partene bare er enige om
beregningsregelen, ikke avgjort i løsningen. Saken står åpen og kan ikke inngå i en
endringsordre. Skjemaet for trekk sier, når sporet har enighet om beregningsregelen, at
trekket er et avkall og ikke en måte å avslutte saken på. Begrensningen tas opp igjen før
EO-sakene bygges (OV-U1), og den binder ikke hvordan en sak med enighet om beregningsregelen
inngår i en endringsordre. Forhold: presiserer OV-U3; EO-U5 står.»

**Alternativ D:** «Enighet om beregningsregelen binder begge parter (KA-U7), men er ikke en
virksom enighet etter OV-U3. Vederlagskravet er avgjort når partene har avtalt beløpet etter
punkt 12B, eller når kravet er trukket. Forhold: presiserer OV-U3, KA-U7 og HF-U9; snevrer inn
EO-U5.»

**Hva valget styrer:**

- Under A er vederlagskravet ferdig i løsningen når partene er enige om regelen og grunnlaget
  er avklart. Visningen sier «Alle krav sendt i appen er avgjort», med linja om at beløpet
  avregnes utenfor. TE kan ikke trekke kravet etterpå, men enigheten binder uansett, og et
  trekk ville vært et avkall.
- Under B trengs et ekstra steg med samtykke. Steget gir ikke partene noe A ikke gir.
- Under C står saken åpen, og trekk er eneste vei til å lukke den. Det er en begrensning
  partene må akseptere i første versjon.
- Under D kan saken først avsluttes når beløpet er kjent, ofte lenge etter arbeidet.

**Svar:**

## 9. Kostnadsoverslag underveis, også mens et tilbud er ubesvart

**Bakgrunn.**

- VS-U28: «Kravet kan oppdateres med en ny kravversjon når kostnadene er kjent.»
- En ny kravversjon gjør at byggherrens svar faller bort (HF-U8). I et spor med enighet
  avvises den (KA-U7).
- Forløp 4: TE må kunne gi kostnadsinformasjon mens et tilbud er ubesvart, uten å kalle
  tilbake tilbudet.
- Spørsmålet er N1 i #909.

**Alternativ A (foreslått):** «TE kan oppgi et kostnadsoverslag etter § 30.2 når
regningsarbeid er TEs krav, byggherrens standpunkt eller partenes enighet, eller når TE har
sendt eller oppgitt et varsel etter § 34.4 i sporet (punkt 3). Det gjelder også mens et tilbud
er ubesvart. TE kan oppgi et nytt overslag så lenge kravet ikke er trukket, også etter at
kravene er avgjort (punkt 8). Overslaget er TEs eget utsagn og ikke en ny kravversjon (KA-U2).
Byggherrens svar faller ikke bort, og overslaget avvises ikke fordi partene er enige om
beregningsregelen. Det er ikke et tilbud om fast sum, og det endrer ikke et tilbud TE har gitt.
Tidligere overslag står i historikken. Byggherren svarer ikke på et overslag i løsningen.
Brevteksten: «TE oppgir [nytt] kostnadsoverslag etter NS 8407 § 30.2 på <beløp> kr eks. mva.
[Det erstatter overslaget i brev <n> av <dato>.] Overslaget er ikke et tilbud, og vederlaget
beregnes etter NS 8407 § 30.1.» Er TEs gjeldende krav et tilbud byggherren ikke har svart på,
følger: «Overslaget gjelder arbeidet som utføres som regningsarbeid i påvente av byggherrens
svar på tilbudet i brev <n> av <dato>, og legges til grunn dersom byggherren ikke aksepterer
tilbudet. Tilbudet står.» Aksepterer byggherren tilbudet, får overslaget ingen virkning i
løsningen. Vil TE sende en ny kravversjon mens tilbudet er ubesvart, sier skjemaet: «Tilbudet
i brev <n> av <dato> er ikke besvart. Et tilbud binder TE til byggherren har tatt stilling til
det innen rimelig tid (NS 8407 § 34.2.1). Løsningen avgjør ikke om en ny kravversjon løser TE
fra tilbudet. Vil du bare gi kostnadsinformasjon, oppgi kostnadsoverslag i stedet.» Forhold:
endrer VS-U28, slik at overslaget ikke oppdateres med en ny kravversjon; presiserer KA-U2,
HF-U6, HF-U8 og KA-U7; følger OV-U3 slik punkt 8 avgjør.»

**Alternativ B:** «Et nytt kostnadsoverslag er en ny kravversjon, som VS-U28 sier.
Byggherrens svar faller bort (HF-U8), og byggherren svarer på nytt. I et spor der partene er
enige om beregningsregelen, avvises et nytt overslag (KA-U7). Mens et tilbud er ubesvart, kan
overslaget bare gis i en ny kravversjon eller utenfor løsningen. Forhold: presiserer VS-U28.»

**Hva valget styrer:** under B må byggherren svare på nytt på hvert overslag. Etter enighet om
regelen kan overslaget ikke oppdateres uten at TE trekker kravet, og trekket er et avkall
(KA-U22). Mens et tilbud er ubesvart, må TE i praksis kalle tilbake tilbudet for å gi
kostnadsinformasjon i løsningen.

**Svar:**

## 10. Varselet om at overslaget vil bli overskredet (§ 30.2 annet ledd)

**Bakgrunn.**

- VS-U28 sender varselet om overskridelse utenfor løsningen.
- Plikten inntrer når det er grunn til å tro at overslaget vil bli overskredet. Den krever
  ikke et nytt beløp.
- Spørsmålet er N4 i #909. Punktet forutsetter 2A eller 2B.

**Alternativ A (foreslått):** «TE kan sende varsel etter § 30.2 annet ledd fra løsningen som
et eget utsagn med serverens dato. Det kan sendes med eller uten nytt kostnadsoverslag i samme
brev, flere ganger, også mens et tilbud er ubesvart og etter at kravene er avgjort (punkt 8).
Varselet viser til overslaget det gjelder, oppgitt i løsningen eller i et brev registrert etter
OV-U4. Brevteksten: «TE varsler etter NS 8407 § 30.2 annet ledd at kostnadsoverslaget i brev
<n> av <dato> ventes å bli overskredet.» Er TEs gjeldende krav et tilbud byggherren ikke har
svart på, følger: «Varselet gjelder dersom byggherren ikke aksepterer tilbudet. Tilbudet
står.» Når TE oppgir et høyere overslag, viser skjemaet valget «Send også varsel etter § 30.2
om at det forrige overslaget ventes å bli overskredet», uten forhåndsvalg. Løsningen utleder
ikke et varsel av at tallet øker. Den avgjør ikke om varselet kom i tide, eller hvilken
virkning et manglende varsel har (MM-U12). Datoen settes ikke én gang per spor. Et varsel
sendt utenfor løsningen registreres etter OV-U4. Forhold: endrer VS-U28, slik at varselet om
overskridelse kan sendes fra løsningen; presiserer SK-12, som ikke gjelder dette varselet;
følger OV-U3 slik punkt 8 avgjør.»

**Alternativ B:** «Varselet etter § 30.2 annet ledd sendes utenfor løsningen og registreres
etter OV-U4, som VS-U28 sier. Når TE oppgir et høyere overslag, sier skjemaet at overslaget
ikke er et varsel etter § 30.2, og at varselet sendes utenfor løsningen. Forhold: presiserer
VS-U28.»

**Hva valget styrer:** under B står overslaget i løsningen og varselet utenfor. TE kan da tro
at et økt overslag er varsel nok.

**Svar:**

## 11. Endre en beregningsregel partene er enige om

**Bakgrunn.**

- KA-U7 forkastet «en ny kravversjon bare med byggherrens samtykke».
- I dag er trekk den eneste veien ut av en enighet, og trekket er et avkall (KA-U22).
- Forslaget om å avklare vilkår i svaret 25.10 om vilkår (D2) har samme form som dette
  punktet: forslag, akseptfrist, aksept eller avslag, og høyst ett åpent forslag.
- LV-U4 punkt 5 forbeholder «godtar» og «aksept» TEs aksept.
- Forløp 1.

**Alternativ A (foreslått):** «Er partene enige om beregningsregelen, kan hver av dem foreslå
at vederlaget i stedet justeres etter den andre regelen. Forslaget er et eget utsagn og ikke
en ny kravversjon eller et trekk. Det har en akseptfrist forslagsstilleren setter (HF-U16).
Det binder forslagsstilleren som et tilbud til motparten har svart eller fristen er ute (HF-U5,
HF-U6), og det kan ikke kalles tilbake i løsningen. Det finnes høyst ett åpent forslag i
sporet. Motparten samtykker eller samtykker ikke. Til forslaget er godtatt, gjelder enigheten
partene har. Forslaget gjelder hele vederlagsjusteringen i saken, også arbeid som er utført. En
regel som bare gjelder en del, avtales utenfor løsningen og registreres etter OV-U4. Samtykker
motparten bare for en del, svarer den at den ikke samtykker, og forklarer det i begrunnelsen
(KA-U16). Brevet for forslaget: «<Part> foreslår at vederlaget i sak <saksnummer>
(«<sakstittel>») justeres etter kontraktens enhetspriser (NS 8407 § 34.3.1) [som
regningsarbeid (NS 8407 § 34.4)] i stedet for slik partene ble enige om i brev <n> av <dato>.
Forslaget gjelder hele vederlagsjusteringen i saken, også arbeid som er utført. Forslaget
gjelder til <dato> og faller bort uten samtykke.» Svaret: «<Part> samtykker i forslaget i
brev <n> av <dato>. Vederlaget justeres etter kontraktens enhetspriser (NS 8407 § 34.3.1)
[som regningsarbeid (NS 8407 § 34.4)].» Eller: «<Part> samtykker ikke i forslaget i brev <n>
av <dato>. Det partene ble enige om i brev <n> av <dato>, gjelder.» Overslagene står i
historikken. Er det ikke registrert noe varsel etter § 34.4 i sporet, kan varselet sendes i
samme brev som forslaget (punkt 3). Forhold: utvider KA-U7 og HF-U9, slik at en enighet om
beregningsregelen kan endres ved forslag og samtykke; det forkastede alternativet i KA-U7, en
ny kravversjon med samtykke, gjeninnføres ikke for beløp eller dager; utvider HF-U5, HF-U6 og
HF-U16 til forslaget; presiserer KA-U16 og KA-U22.»

**Alternativ B:** «En beregningsregel partene er enige om i løsningen, kan ikke endres i
løsningen i første versjon. Partene avtaler en endring utenfor løsningen og registrerer
brevet etter OV-U4. Visningen viser fortsatt regelen partene ble enige om i løsningen, med
merknaden om registrerte brev (OV-U10). Forhold: presiserer KA-U7 og OV-U4.»

**Hva valget styrer:** under B viser løsningen en regel partene ikke lenger følger. Under A
binder en feil i forslaget forslagsstilleren til motparten har svart eller fristen er ute.

**Svar:**

## 12. Avtale om beløpet

**Bakgrunn.** Sparringen 26.10: et avtalt sluttbeløp kan vurderes senere som en valgfri
handling. Det trengs ikke for å støtte metodene og må aldri være obligatorisk. Den andre
sparringen: det var ikke en anbefaling om å gjøre avkall til eneste avslutning. Under 8A
avslutter enigheten om regelen vederlagskravet, så en avtale om beløpet er ikke nødvendig for
å lukke saken. Under 8D er den nødvendig.

**Alternativ A (foreslått, under 8A, 8B eller 8C):** «Første versjon har ingen handling for å
avtale beløpet når partene er enige om beregningsregelen. En avtale om beløpet inngås utenfor
løsningen og registreres etter OV-U4, uten utledning. En valgfri handling for å avtale
beløpet kan bygges senere, og den blir aldri obligatorisk. Forhold: presiserer OV-U4.»

**Alternativ B (nødvendig under 8D):** «Er partene enige om beregningsregelen, kan hver av dem
foreslå et beløp som endelig oppgjør av vederlagsjusteringen i saken. Forslaget følger formen i
punkt 11. Brevet: «<Part> foreslår at vederlaget i sak <saksnummer> («<sakstittel>») justeres
med <beløp> kr eks. mva. som endelig oppgjør av vederlagsjusteringen i saken. Forslaget gjelder
til <dato> og faller bort uten samtykke.» Godtas forslaget, er partene enige om beløpet etter
HF-U9. Handlingen er valgfri. Forhold: utvider HF-U9; presiserer OV-U3.»

**Hva valget styrer:** under A bygges ingen handling for beløpet nå. Under B kan partene føre
sluttoppgjøret i løsningen.

**Svar:**

## 13. Det løsningen ikke tar imot, og det særskilte kravet

**Bakgrunn.**

- OV-U14 lyder «bare § 34.3.1, § 34.3.2 og § 34.3.3 avvises». Det er lest som at § 34.3.1 er
  med og de to andre avvises, etter etiketten «Bare § 34.3.1» i #764 (kommentaren
  6283767168).
- Forløp 1 viste at avgrensningene presser brukeren mot regningsarbeid hvis skjemaet ikke
  sier hva som går utenfor.
- Et krav om nedsatt produktivitet eller forstyrrelser etter § 34.1.3 annet ledd skal etter
  § 34.2.2 annet ledd beregnes etter § 34.3 og § 34.4 så langt de passer. I dag kan det bare
  sendes som tilbud (OV-U23, LV-U30).
- Byggherrens begrensning etter § 34.1.3 tredje ledd har i dag et beløp (VS-U5, OV-U22).
  OV-U28 uttrykker den også som at TE «har tapt retten til å påberope seg påløpte utgifter som
  grunnlag for kravet».
- Et fradrag er byggherrens krav (KA-U9). Formatet tar ikke imot et negativt beløp fra TE.

**Alternativ A (foreslått):** «Løsningen tar imot krav etter § 34.3.1. Krav om justerte
enhetspriser etter § 34.3.2 og varsel om justering etter § 34.3.3 avvises og sendes utenfor
løsningen og registreres etter OV-U4. Når TE velger enhetspriser eller regningsarbeid, sier
skjemaet at justerte enhetspriser sendes utenfor løsningen, og at regningsarbeid ikke bør
velges bare fordi løsningen ikke tar imot dem. Byggherrens krav om et spesifisert tilbud etter
§ 34.2.1 sendes utenfor løsningen. Et fradrag etter § 34.4 annet ledd har ingen handling i
løsningen. Det særskilte kravet etter § 34.1.3 annet ledd følger formen kravet har. I et krav
etter enhetspriser eller regningsarbeid lyder setningen i LV-U30: «TE krever i tillegg
særskilt justering av vederlaget etter NS 8407 § 34.1.3 annet ledd for økte utgifter på grunn
av nedsatt produktivitet eller forstyrrelser på annet arbeid, etter kontraktens enhetspriser
(NS 8407 § 34.3.1) [som regningsarbeid (NS 8407 § 34.4)], jf. § 34.2.2 annet ledd.»
Påberoper byggherren begrensningen etter § 34.1.3 tredje ledd for et slikt krav, oppgir
byggherren ikke beløp. Prinsipalt er standpunktet at TE har tapt retten til å påberope seg
utgifter påløpt før varselet i brev <n> av <dato> kom fram. Subsidiært gjelder regelen uten
begrensning. Brevet: «Byggherren gjør gjeldende at varselet om særskilt justering for nedsatt
produktivitet eller forstyrrelser etter NS 8407 § 34.1.3 tredje ledd i brev <n> av <dato> kom
for sent, og at TE har tapt retten til å påberope seg utgifter påløpt før varselet som grunnlag
for kravet.» Lagene følger OV-U27 og OV-U32. Utfallet er ukjent, ikke 0 (MM-U28). Løsningen
avgjør ikke hvilke utgifter som er påløpt før varselet (VS-U5). Det begrunnede varselet etter
§ 34.2.2 annet ledd og den løpende orienteringen om kostnadsutviklingen sendes utenfor
løsningen og registreres etter OV-U4. Forhold: presiserer OV-U14 og OV-U1; endrer LV-U30;
endrer VS-U5 og OV-U22, slik at begrensningen for et særskilt krav som ikke er tilbud, har et
skjæringspunkt i stedet for et beløp; utvider OV-U28 med brevteksten uten beløp; OV-U23 og
OV-U27 står.»

At «påløpte» i § 34.1.3 tredje ledd leses som påløpt før det sene varselet, er vår tolkning,
ikke ordlyden.

**Alternativ B:** «Som A, men det særskilte kravet etter § 34.1.3 annet ledd kan bare
fremsettes i et tilbud (OV-U23, LV-U30). Krever TE justering etter enhetspriser eller som
regningsarbeid, sier skjemaet at et krav om nedsatt produktivitet eller forstyrrelser sendes
utenfor løsningen og registreres etter OV-U4. Det samme gjelder det begrunnede varselet etter
§ 34.2.2 annet ledd og den løpende orienteringen om kostnadsutviklingen. Forhold: presiserer
OV-U14 og OV-U1; snevrer inn OV-U23 til tilbud.»

**Hva valget styrer:**

- Under A kan TE fremme hele vederlagskravet i løsningen etter samme regel, og byggherren
  svarer på én regel for hele kravet.
- Under B må TE som krever regningsarbeid for arbeidet, sende kravet om nedsatt produktivitet
  og byggherrens svar på det utenfor løsningen. Byggherren må da påberope § 34.1.2 både i og
  utenfor løsningen (OV-U27). En endringsordre kan gjengi et ufullstendig vederlag.

**Svar:**

## 14. Endringsordren

**Bakgrunn.**

- EO-sakene bygges ikke i første versjon (OV-U1). Føringen ber om en arbeidsmåte for både
  KOE og EO.
- § 31.3 krever ikke at endringsordren har et beløp.
- EO-U8 lar endringsordren ha utsagn om pris som byggherrens standpunkt, et tilbud eller en
  gjengivelse av noe som er avtalt, og sier at «tallene» står alene uten KOE-sak.
- EO-U5 krever enighet i minst ett av vederlag og frist for at en KOE-sak kan inngå.
- Forløp 5 og 6 viste at det mangler et sted for TEs overslag og varsler når regelen er avtalt
  i en endringsordre, og at en KOE-sak med enighet om regelen ikke kan inngå.

**Alternativ A (foreslått):** «Et utsagn om pris i en endringsordre kan være en
beregningsregel uten beløp: at vederlaget justeres etter kontraktens enhetspriser (§ 34.3.1)
eller som regningsarbeid (§ 34.4 og punkt 30). Godtar TE et slikt utsagn, er partene enige om
regelen, som etter punkt 4 og 8. Enighet om beregningsregelen er enighet i vederlagssporet
etter EO-U5. En KOE-sak der partene er enige om regelen, kan inngå i en endringsordre, og
endringsordren gjengir regelen som avtalt og at beløpet avregnes utenfor løsningen. Et
kostnadsoverslag kan gjengis som opplysning, men ikke som tak eller avtalt beløp.
Endringsordren kan ikke ensidig endre regelen (EO-U8). Vilkår som ikke er avklart etter svaret
25.10 om vilkår, sperrer som før. TEs kostnadsoverslag, varselet etter § 30.2 og varselet etter
§ 34.4 hører til regelen partene er enige om, enten den er avtalt i et KOE-svar eller i en
endringsordre (punkt 3, 9 og 10). Hvor TE fører dem når regelen er avtalt i en endringsordre
uten KOE-sak, og hvordan regelen endres etter at saken har inngått i en endringsordre,
avgjøres når EO-sakene bygges. Forhold: presiserer EO-U8, slik at et utsagn om pris kan være en
beregningsregel uten beløp; presiserer EO-U5, slik at enighet om beregningsregelen er enighet
i sporet; følger punkt 8.»

**Alternativ B:** «Hvordan en endringsordre uttrykker en beregningsregel uten beløp, og om en
KOE-sak med enighet om regelen kan inngå i en endringsordre, avgjøres når EO-sakene bygges
(OV-U1). Forhold: EO-U5 og EO-U8 står.»

**Hva valget styrer:** under A er det avgjort nå at regningsarbeid og enhetspriser kan følge
saken inn i en endringsordre, og at den samme regelen gjelder i KOE og EO. Under B kan
EO-sakene bygges på en annen forståelse enn KOE-saken.

**Svar:**

---

## Ikke med i forslaget

- **TEs tilbakekall av et tilbud og TEs akseptfrist i tilbudet.** TE kan i dag erstatte et
  tilbud byggherren ikke har svart på, med en ny kravversjon. Punkt 11A lar et forslag om
  endret regel binde. Forløp 4 viste at byggherren kan la tilbudet stå og se overslagene før
  byggherren velger. Om tilbudet skal binde (avtaleloven § 7), og om TE skal kunne sette en
  akseptfrist i tilbudet (avtaleloven § 2), er ikke spurt her. Det bør tas i en egen runde, og
  det vil utvide HF-U5 og HF-U16.
- **Hvor TEs oppfølging ligger** når regelen er avtalt i en endringsordre uten KOE-sak, og
  hvordan regelen endres etter at saken har inngått i en endringsordre (punkt 14). Avgjøres
  når EO-sakene bygges.
- **Rettspraksis** om virkningen av et manglende varsel etter § 34.4 og § 30.2, og om hva
  «påløpte» betyr i § 34.1.3 tredje ledd, er ikke undersøkt. Løsningen avgjør ikke virkningen
  i noen av alternativene.

## Sparringen etter utkastet, ordrett

Sparringen leste utkastet på commit `ab02fbd`. Svaret er lagret ordrett før det ble prøvd. Det
gjelder ikke før oppdragsgiver slutter seg til det (vedtaksskillen).

> Ja. Jeg har hentet commit ab02fbd og lest hele spørsmålsdokumentet. Det er den siste committen jeg fikk på claude/metodevalg-vedtaksrunde.
>
> Jeg ville ikke svart ja til hele pakken ennå. Selve teksten viser noen vesentlige problemer som oppsummeringen ikke får tydelig frem.
>
> 1. Punkt 4 motsier seg selv om TEs aksept.
>
> Først står:
>
> «TEs aksept gjelder hele svaret, også en påberopt preklusjon og et avslag av grunnlaget.»
>
> Deretter skal akseptbrevet si:
>
> «TE er enig i beregningsregelen, men ikke i byggherrens standpunkt til grunnlaget.»
>
> Begge kan ikke beskrive samme aksept. Her må dere skille mellom innsigelser i vederlagssporet, som aksepten kan omfatte, og standpunktet i grunnlagssporet, som GR-U7 nettopp lar partene være uenige om. Det er også forskjell på preklusjon etter § 34.1.2 og etter § 32.2.
>
> Dette er den viktigste konkrete rettingen før valget.
>
> 2. Punkt 8-A og 12-A gir samlet en permanent åpen sak.
>
> Teksten erkjenner at avregningen kan være ferdig utenfor løsningen, mens saken fortsatt står åpen og ikke kan inngå i en endringsordre. Den eneste tilgjengelige handlingen som kan gjøre kravet avgjort, er trekk med avkall.
>
> Det er ikke en tilfredsstillende avslutning på brukerforløpet. Min tidligere anbefaling om at avtalt sluttbeløp kan vente, var ikke en anbefaling om å gjøre avkall til eneste avslutningsmulighet.
>
> Dere bør velge mellom:
>
> * valgfri avtale om beløpet, som 12-B;
> * administrativ merking av at videre avregning eller oppgjør håndteres utenfor, uten utledning av avkall eller beløpsenighet;
> * en uttrykkelig, midlertidig begrensning som dere faktisk aksepterer for første versjon.
>
> Spørsmålet om endringsordre uten fast beløp bør undersøkes før den generelle sperren i 8-A velges. Dokumentet sier selv at dette ikke er lest.
>
> 3. Punkt 7 gjør overslaget til fullmaktsgrunnlag, men kaller det samtidig TEs krav.
>
> Slutten av 7-A sier:
>
> «… slik at TEs beregning eller overslag er TEs krav.»
>
> Det kolliderer med skillet dere nettopp innfører. Skriv heller at overslaget brukes som verdi i den interne fullmaktskontrollen, uten å bli kravsbeløp, avtalt beløp eller tak.
>
> Valget mellom 7-A og 7-B trenger dessuten en selvstendig begrunnelse. Et senere overskridelsesvarsel løser ikke automatisk at en saksbehandler allerede har godkjent en beregningsregel med ubegrenset beløp. Samtidig er påstanden om at full godkjenningskjede får BH til å velge fast sum, en antatt brukerrisiko – ikke et påvist resultat.
>
> 4. Punkt 13-A anbefales hovedsakelig fordi alternativet endrer flere vedtak.
>
> At 13-B endrer fire vedtak, er ikke i seg selv et argument mot det. Det er nettopp slike valg denne runden skal avklare.
>
> 13-A sender produktivitetskravet ut av løsningen når resten av kravet følger regningsarbeid eller enhetspriser. Vurder den arbeidsdelingen konkret før dere velger den. Antallet vedtak som må endres, bør ikke avgjøre produktavgrensningen.
>
> 5. Et brukerforløp mangler i punkt 9–10.
>
> Punkt 3 lar TE varsle regningsarbeid mens et tilbud fortsatt står ubesvart. Men 9-A tillater nytt overslag bare når regningsarbeid følger av TEs krav eller partenes enighet.
>
> Prøv derfor:
>
> Tilbudet står ubesvart, arbeidet utføres som regningsarbeid i påvente av avklaring, og TE må oppgi eller oppdatere overslaget og varsle overskridelse.
>
> Det må være mulig uten at TE først må avslå eller erstatte tilbudet bare for å gi kostnadsinformasjon.
>
> Hovedretningen står: skill beregningsregelen fra beløpet, og la overslag oppdateres uten å oppheve svar. Men særlig punkt 4 og kombinasjonen 8/12 må avklares før samlet tilslutning.
>
> Jeg har nå kontrollert dokumentets faktiske ordlyd og commitdiffen. Jeg har ikke kjørt koden eller kontrollert alle henvisningene mot hele vedtaksregisteret.
