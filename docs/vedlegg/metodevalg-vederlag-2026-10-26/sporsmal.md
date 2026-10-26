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

Deretter har sparringen lest utkastet på commit `1817c40` og kommentert rigg og drift i
forlenget byggetid etter kontraktsgrunnlaget (Del II pkt. B.2.16, OV-U36–OV-U40). Begge svarene
står ordrett nederst. En subagent prøvde dem mot vedtakene, koden og kontraktsgrunnlaget, med
to forløp til. Alle punktene holdt, og rettingene er tatt inn i punkt 1, 4, 4b, 5, 7, 8, 9, 10,
11, 12, 13 og 14.

7. **Blandet krav.** Det øvrige arbeidet kreves som regningsarbeid, og TE krever 200 000 for
   rigg og drift i forlenget byggetid. Byggherren er enig i regningsarbeid og godkjenner
   150 000 for posten, og TE godtar. Etter teksten i 4A slik den sto, ga svaret sammenfall om
   regelen. Da ble TE enten bundet til 150 000 uten å ha godtatt, eller kunne verken godta
   svaret eller kreve beløpet på nytt (L, V). Fullmakten ville blitt regnet av 150 000 alene
   (L). Nøkkeltallene ville vist 150 000 som sakens vederlag (V).
8. **Varselet etter § 34.4 og sammenfall.** Byggherren er enig i regningsarbeid, men påberoper
   at varselet etter § 34.4 kom for sent. Påberopelsen har ingen utledet virkning og gir ikke
   noe lag, så standpunktene faller sammen. TE har da ikke godtatt påberopelsen. Godtar TE et
   svar uten sammenfall, omfatter aksepten påberopelsen (KA-U1) (V).

## Brukerforløpet

Forslaget følger det brukeren skal få gjort:

| Steg | Hvem | Punkt |
| --- | --- | --- |
| Krever vederlag og sier hvordan det skal justeres | TE | 1, 2, 3 |
| Tar stilling til beregningsregelen | BH | 4, 4b, 5, 6, 7 |
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
beregning utgjør justeringen <beløp> kr eks. mva. Beregningen er ikke et tilbud.» Har kravet en
post for rigg og drift i forlenget byggetid, sier setningen i stedet: «Beregningen av det
øvrige vederlaget er ikke et tilbud.» Beløpet for posten er det beløpet TE krever for posten
(OV-U39), også når det øvrige vederlaget kreves etter enhetspriser eller som regningsarbeid
(punkt 4). For et krav
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

For det øvrige vederlaget har bare godkjenningen av oppgjør som fast sum et beløp. Posten for
rigg og drift i forlenget byggetid har sitt eget beløp (se under). Standpunktene om det
særskilte kravet etter § 34.1.3 annet ledd følger punkt 13.

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

Etter hvert av disse standpunktene følger: «Standpunktet om beregningsregelen godkjenner ikke
mengder, priser, kostnader eller noe beløp for det øvrige vederlaget.» Standpunktet står i det
laget innsigelsene i svaret gir det (OV-U32, OV-U33).

*Posten for rigg og drift i forlenget byggetid.* Har vederlagskravet en post for rigg og drift
i forlenget byggetid etter kontraktsgrunnlaget (OV-U37), behandles posten etter OV-U37–OV-U40,
også når det øvrige vederlaget kreves etter enhetspriser eller som regningsarbeid. Posten har
et eget beløp, og byggherren tar stilling til det med godkjent, delvis godkjent eller avslått
(OV-U39). Valget av beregningsregel for det øvrige vederlaget endrer ikke regelen for posten.
Et tilbud kan omfatte rigg og drift i forlenget byggetid i den faste summen. Da har kravet ingen
egen post, og løsningen tolker ikke begrunnelsen (KA-U16). TE begrunner også avgrensningen mot
kostnader som avregnes som regningsarbeid eller etter enhetspriser i samme sak. Løsningen
kontrollerer ikke overlapp.

*Sammenfall.* Standpunktene faller sammen bare når hvert standpunkt i svaret stemmer med
kravet: byggherren er enig i regelen TE krever eller godkjenner oppgjøret som fast sum,
byggherren godkjenner hele beløpet for en post for rigg og drift (OV-U38), svaret har ingen
vilkår etter svaret 25.10 om vilkår, og ingen standpunkt i svaret står i et lag etter OV-U32
(lagene regnes uten grunnlaget). Enighet om beregningsregelen for det øvrige vederlaget gir
ikke sammenfall når beløpet for posten ikke er godkjent fullt ut. Byggherrens egne
beregningsverdier for posten hindrer ikke sammenfall (OV-U39). Faller standpunktene sammen, er
partene enige om vederlagskravet uten TEs aksept. Er grunnlaget avslått eller preklusjon etter
§ 32.2 påberopt, er enigheten betinget av grunnlaget (GR-U7). Ellers tar TE stilling til hele
svaret ved å godta det eller sende en ny kravversjon (KA-U1, punkt 4b).

En påberopelse etter § 34.4 hindrer ikke sammenfall. Den har ingen utledet virkning og gir ikke
standpunktet om beregningsregelen et lag (VS-U28, OV-U32). Faller standpunktene sammen, er
partene enige om beregningsregelen, men TE har ikke godtatt påberopelsen. Visningen sier ved
påberopelsen at TE ikke har godtatt den. TE kan bestride den i et brev som registreres etter
OV-U4.

TEs aksept gjelder hele byggherrens svar i vederlagssporet (KA-U1): standpunktet om
beregningsregelen, en påberopelse etter § 34.1.2 eller § 34.4 og eventuelle vilkår. Den
gjelder ikke byggherrens svar på grunnlaget, også når det står i samme brev. Et avslag av
grunnlaget og en påberopelse av preklusjon etter § 32.2 er standpunkter i grunnlagssporet, og
TE tar stilling til dem for seg (GR-U7). Etter aksepten gjelder:

- Står standpunktet om beregningsregelen i sporets første lag eller er upåvirket, er partene
  enige om regelen svaret oppgir, og om beløpet for en post for rigg og drift slik svaret
  oppgir det (HF-U9, OV-U38). Er grunnlaget avslått eller preklusjon etter § 32.2 påberopt, er
  enigheten betinget av grunnlaget (GR-U7, KA-U7).
- Påberoper byggherren prinsipalt at varselet etter § 34.1.2 kom for sent, er partene enige om
  at kravet ikke fører fram (HF-U9). Aksepten er da et avkall på kravet (HF-U10), og et
  subsidiært standpunkt om beregningsregelen får ingen virkning.
- Har svaret en påberopelse etter § 34.4, er TE enig i den (KA-U1). Skjemaet sier før
  aksepten sendes: «Du godtar også byggherrens påstand om at varselet etter NS 8407 § 34.4
  ikke ble gitt [kom for sent]. Løsningen avgjør ikke hvilken virkning det har.» Løsningen
  utleder ingen virkning av den (VS-U28).

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
KA-U1, GR-U7 og HF-U8 for standpunktet om beregningsregelen; presiserer HF-U7 og VS-U28 for
en påberopelse etter § 34.4; presiserer OV-U37, OV-U38 og OV-U39 for et krav der det øvrige
vederlaget ikke er et tilbud, i tråd med OV-U25 og OV-U36; utvider svaret 25.10 om vilkår til
et standpunkt som ikke godkjenner noe beløp.»

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
- Har kravet en post for rigg og drift, gir et svar som er enig i regelen, men godkjenner
  posten bare delvis, ikke sammenfall. Uten den regelen ville TE vært bundet til det lavere
  beløpet for posten uten å ha godtatt det, eller verken kunnet godta svaret eller kreve
  beløpet på nytt (prøvingen 26.10, det blandede kravet).

**Svar:**

## 4b. Standpunktet om beregningsregelen når TE sender en ny kravversjon

**Bakgrunn.**

- HF-U8: byggherrens svar faller bort når TE sender en ny kravversjon. Et uttrykkelig
  standpunkt om at et varsel kom i tide, og et avkall, faller likevel ikke bort.
- Prøvingen av det blandede kravet: TE sender en ny kravversjon med samme regel og nytt beløp
  for rigg-posten når forlengelsen er avklart (OV-U37). Da faller byggherrens standpunkt om at
  regningsarbeid gjelder, bort, og byggherren kan svare at enhetsprisene gjelder på den nye
  versjonen. TE kan tape et standpunkt byggherren alt har gitt, bare ved å oppdatere posten.
- Det samme gjelder når byggherren har avslått et tilbud med regningsarbeid og en påberopelse
  etter § 34.4. Vil TE ikke godta påberopelsen, må TE sende en ny kravversjon om
  regningsarbeid, og standpunktet om regelen faller da bort.

**Alternativ A (foreslått):** «Sender TE en ny kravversjon som krever den regelen byggherren
har sagt seg enig i eller oppgitt, faller byggherrens standpunkt om at den regelen gjelder, ikke
bort med svaret. Et svar på den nye versjonen som tar den andre regelen, avvises som en
revisjon som senker det byggherren har innrømmet (HF-U5). Resten av svaret faller bort etter
HF-U8. Forhold: utvider unntaket i HF-U8 og utvider HF-U14 til standpunktet om
beregningsregelen.»

**Alternativ B:** «HF-U8 gjelder uendret. Sender TE en ny kravversjon, sier skjemaet:
«Byggherrens svar faller bort, også standpunktet om beregningsregelen. Byggherren svarer på
nytt og er ikke bundet av det.» Forhold: presiserer HF-U8.»

**Hva valget styrer:** under A binder standpunktet om regelen byggherren også etter en ny
kravversjon. Det går ut over avtaleloven § 5 og er kostnaden for byggherren. Til gjengjeld kan
TE oppdatere rigg-posten eller avvise en påberopelse etter § 34.4 uten å miste et standpunkt om
regelen som alt er gitt. Under B må TE velge mellom å godta hele svaret og å risikere at
byggherren skifter standpunkt om regelen.

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
godtar innen rimelig tid etter avtaleloven § 3, avgjør ikke løsningen (MM-U12). Godkjenner
svaret også et beløp for posten for rigg og drift og avviker fra kravet, kan byggherren sette
en akseptfrist for svaret. Fristen gjelder hele svaret (KA-U1). Når den er ute, faller beløpet
for posten bort, og standpunktet om beregningsregelen står etter punkt 4b A, eller faller bort
etter punkt 4b B. Skjemaet sier det før svaret sendes. Forhold: presiserer HF-U15 og svaret
25.10 om vilkår, slik at akseptfristen der bare gjelder et svar som godkjenner beløp eller
dager.»

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

## 7. Fullmakten for et svar om beregningsregelen

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

- Kontraktsgrunnlaget gir prosjektleder og byggeleder beløpsgrenser og fullmakt til å avvise
  krav, og sier at ingen andre kan påføre byggherren forpliktelser uten særskilt fullmakt (Del II
  pkt. 6 og pkt. 28). Et standpunkt om at regningsarbeid gjelder, binder byggherren uten tak.
- Godkjenner svaret et beløp for rigg-posten, ville dagens kode verdsette svaret av det beløpet
  alene (L, `server/fullmakt.ts`). En som har fullmakt til det beløpet, kunne da binde
  byggherren til regningsarbeid uten tak.

**Antatt, ikke påvist:** at byggherren svarer med en fast sum for å slippe hele kjeden, og hvor
stor risikoen er når en med lav fullmakt binder byggherren til en regel.

**Alternativ A (foreslått):** «Et svar der byggherren tar standpunkt til beregningsregelen,
kan ikke verdsettes. Det gjelder også når svaret godkjenner et beløp for posten for rigg og
drift i forlenget byggetid. Svaret krever hele kjeden, eller den som har ubegrenset fullmakt,
som en endringsordre uten beløp (GFK-06, vedtaket 23.09, GFK-U4). Kjeden må dekke det
godkjente beløpet for posten. TEs beregning og kostnadsoverslag brukes ikke som verdi. Det
samme gjelder byggherrens forslag og samtykke etter punkt 11. Godkjenner byggherren oppgjør
som fast sum, har svaret verdien i svaret (presiseringen 24.09). Et avslag uten standpunkt om
regelen er fortsatt 0 (presiseringen 24.09). Forhold: utvider GFK-06 til et svar med
standpunkt om beregningsregelen.»

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

**Åpent spørsmål under begge:** byggeleder kan avvise krav etter Del II pkt. 28. Et standpunkt
om at den andre regelen gjelder, er mer enn en avvisning, fordi det binder byggherren til den
regelen hvis TE godtar. Skal byggeleder kunne sende det uten hele kjeden? Anbefaling: nei,
etter A.

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
- Under regningsarbeid er beløpet normalt først kjent etter avregningen etter § 30.3, ofte
  lenge etter at arbeidet er utført. Partene kan likevel avtale et beløp tidligere (punkt 12).
- Kontraktsgrunnlaget krever signert endringsordre ved fakturering av endringsarbeid (Del II
  pkt. 184). Uten en vei inn i endringsordren i løsningen må partene fullføre den delen av
  arbeidsflyten utenfor løsningen.
- Den første sparringen 26.10 sa at enighet om metoden ikke av seg selv skal gi følgene av at
  kravene er avgjort. Utkastet fulgte det (det tidligere 8A). Den andre sparringen viste at
  trekk, som er et avkall, da ble eneste vei til å lukke saken, og at saken ikke kan inngå i
  en endringsordre. Etter føringen om arbeidsmåte foreslås derfor at enigheten avslutter
  vederlagskravet i løsningen.

**Alternativ A (foreslått):** «Enighet om beregningsregelen binder begge parter (KA-U7,
HF-U9). Løsningen skiller mellom tre forhold: at partene er enige om beregningsregelen, at
behandlingen av vederlagskravet er ferdig i løsningen, og at beløpet fortsatt avregnes utenfor
løsningen. Enigheten er en virksom enighet i vederlagssporet etter OV-U3 når grunnlaget er
avklart etter GR-U7, og svaret ikke har vilkår som er uavklart etter svaret 25.10 om vilkår.
Har det slike vilkår, regnes kravet ikke som avgjort før de er avklart, og saken kan ikke inngå
i en endringsordre. Ellers er enigheten betinget. Enigheten gjelder regelen partene er enige
om, også når TEs krav var et tilbud. Et tilbud byggherren ikke har akseptert, regnes da ikke
lenger som krav i nøkkeltallene. Enigheten er ikke enighet om beløp for det øvrige vederlaget.
TEs beregning og kostnadsoverslaget inngår ikke i summen av virksom enighet, og utfallet for
det øvrige vederlaget er ukjent, ikke 0 (MM-U28). Sporet får betegnelsen «Enige» (MM-U30).
Linja under sier: «Beregningsregelen er avtalt: <kontraktens enhetspriser / regningsarbeid>.
Beløpet avregnes utenfor løsningen.» Ved regningsarbeid sier den også: «Kostnadsoppgavene og
kontrollen av dem etter § 30.3 håndteres utenfor løsningen.» Saksteksten etter OV-U10 står.

Har vederlagskravet en post for rigg og drift i forlenget byggetid, er vederlagskravet avgjort
når partene er enige om både regelen for det øvrige vederlaget og beløpet for posten, eller
når kravet er trukket. Beløpet for posten inngår i summen av virksom enighet. Det øvrige
vederlaget gjør det ikke, og nøkkeltallene sier hvor mange saker summen ikke dekker fullt ut.
Linja under betegnelsen sier da: «Rigg og drift i forlenget byggetid: <beløp> kr eks. mva.
Beregningsregelen for det øvrige vederlaget er avtalt: <kontraktens enhetspriser /
regningsarbeid>. Det øvrige vederlaget avregnes utenfor løsningen.» Krever TE enhetspriser
eller regningsarbeid uten posten, sier skjemaet: «Har du krav på rigg og drift i forlenget
byggetid, oppgi posten nå, med forlengelsen du legger til grunn. Er byggherren enig i
beregningsregelen, kan posten ikke legges til i denne saken senere.» Godtar TE et svar som
ikke aksepterer tilbudet, og kravet har ingen post, sier skjemaet: «Kravet har ingen post for
rigg og drift i forlenget byggetid. Godtar du svaret, kan posten ikke legges til i denne
saken.»

Når kravene er avgjort, godtas fortsatt TEs nye kostnadsoverslag (punkt 9), varselet etter
§ 30.2 (punkt 10), varselet etter § 34.4 (punkt 3), og et forslag om endret beregningsregel og
svaret på det (punkt 11). Overslag og varsler endrer ikke enigheten og åpner ikke sporet. Et
godtatt forslag etter punkt 11 erstatter regelen i enigheten, uten å åpne sporet. Et nytt beløp
for posten avvises (OV-U38). Saken kan inngå i en endringsordre etter EO-U5, og endringsordren
gjengir regelen som avtalt (EO-U8, punkt 14). Forhold: endrer OV-U3, med en ny form for
virksom enighet og nye unntak fra sperren; presiserer OV-U10, MM-U28 og MM-U30; presiserer
OV-U37 og OV-U38; presiserer EO-U5 og EO-U8; presiserer KA-U7 og HF-U9.»

**Variant av A:** saksteksten etter OV-U10 endres for saker der bare beregningsregelen er
avtalt: «Kravene sendt i løsningen er ferdig behandlet. Vederlaget: beregningsregelen er
avtalt, og beløpet avregnes utenfor løsningen.» Det endrer OV-U10.

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
tilbudet. Kostnadsoverslaget endrer ikke tilbudet.» Aksepterer byggherren tilbudet, får
overslaget ingen virkning i løsningen. Vil TE sende en ny kravversjon mens tilbudet er
ubesvart, sier skjemaet: «Tilbudet i brev <n> av <dato> er ikke besvart. En ny kravversjon
erstatter tilbudet i løsningen, og byggherren kan da ikke godta det her (HF-U8). Løsningen
avgjør ikke om TE er løst fra tilbudet. Vil du bare gi kostnadsinformasjon, oppgi
kostnadsoverslag i stedet; det endrer ikke tilbudet.» Forhold:
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
svart på, følger: «Varselet gjelder dersom byggherren ikke aksepterer tilbudet. Varselet
endrer ikke tilbudet.» Når TE oppgir et høyere overslag, viser skjemaet valget «Send også varsel etter § 30.2
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
partene har. Forslaget gjelder det øvrige vederlaget i saken, også arbeid som er utført. Det
gjelder ikke posten for rigg og drift i forlenget byggetid, som følger OV-U37–OV-U40. En
regel som bare gjelder en del, avtales utenfor løsningen og registreres etter OV-U4. Samtykker
motparten bare for en del, svarer den at den ikke samtykker, og forklarer det i begrunnelsen
(KA-U16). Brevet for forslaget: «<Part> foreslår at vederlaget i sak <saksnummer>
(«<sakstittel>») justeres etter kontraktens enhetspriser (NS 8407 § 34.3.1) [som
regningsarbeid (NS 8407 § 34.4)] i stedet for slik partene ble enige om i brev <n> av <dato>.
Forslaget gjelder hele den øvrige vederlagsjusteringen i saken, også arbeid som er utført,
men ikke rigg og drift i forlenget byggetid. Forslaget
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
det endelige oppgjøret av vederlagsjusteringen i saken i løsningen.

**Svar:**

## 13. Det løsningen ikke tar imot, og kravet om nedsatt produktivitet

**Bakgrunn.**

- OV-U14 lyder «bare § 34.3.1, § 34.3.2 og § 34.3.3 avvises». Det er lest som at § 34.3.1 er
  med og de to andre avvises, etter etiketten «Bare § 34.3.1» i #764 (kommentaren
  6283767168).
- Forløp 1 viste at avgrensningene presser brukeren mot regningsarbeid hvis skjemaet ikke
  sier hva som går utenfor.
- Kontraktsgrunnlaget (Del II pkt. B.2.16) endrer § 34.1.3. Varslingsplikten og tapet av retten
  gjelder bare kravet om nedsatt produktivitet og forstyrrelser etter annet ledd (OV-U25). Rigg
  og drift følger formlene i kontraktsgrunnlaget (OV-U36–OV-U40, punkt 4). Kontraktsgrunnlaget
  bytter bare ut første setning i tredje ledd. Setningen om at TE taper retten til å påberope
  seg påløpte utgifter, står.
- Kravet om nedsatt produktivitet skal etter § 34.2.2 annet ledd beregnes etter § 34.3 og
  § 34.4 så langt de passer. I dag kan det bare sendes som tilbud (OV-U23, LV-U30).
- Byggherrens begrensning etter § 34.1.3 tredje ledd har i dag et beløp (VS-U5, OV-U22).
  Under regningsarbeid finnes det ikke noe beløp å oppgi.
- Hvilke utgifter tapet rammer når varselet kom for sent, er ikke avklart. Den andre
  sparringen 26.10 viste til LE-2017-113189, som ifølge sparringen ikke avgjorde spørsmålet.
  Dommen er ikke kontrollert her.
- Et fradrag er byggherrens krav (KA-U9). Formatet tar ikke imot et negativt beløp fra TE.

Punktet skiller tre ting: at byggherren kan påberope begrensningen, hvilken avgrensning
byggherren gjør gjeldende, og hva løsningen selv utleder.

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
byggherren ikke beløp. Byggherren angir avgrensningen selv, enten med en dato, slik at
begrensningen etter byggherrens syn rammer utgifter påløpt før den datoen, eller i
begrunnelsen. Brevet sier, med ordlyden i OV-U28: «Byggherren gjør gjeldende at varselet om
særskilt justering for nedsatt produktivitet eller forstyrrelser etter NS 8407 § 34.1.3
tredje ledd i brev <n> av <dato> kom for sent, og at TE har tapt retten til å påberope seg
påløpte utgifter som grunnlag for kravet.» Deretter enten: «Byggherren mener begrensningen
rammer utgifter påløpt før <dato>.» eller: «Byggherren angir avgrensningen i begrunnelsen.»
Subsidiært gjelder regelen uten begrensning. Lagene følger OV-U27 og OV-U32, og utfallet er
ukjent, ikke 0 (MM-U28). Løsningen avgjør ikke hvilke utgifter som er påløpt eller rammet
(VS-U5), og tolker ikke begrunnelsen (KA-U16). En revisjon som flytter datoen senere, senker
det byggherren har innrømmet og avvises (HF-U5). En tidligere dato er tillatt. Godtar TE
svaret, godtar TE at varselet kom for sent, og avgrensningen slik byggherren har angitt den
(KA-U1, KA-U10). Skjemaet sier før aksepten: «Du godtar at varselet kom for sent, og at retten
til å påberope deg utgifter påløpt før <dato> er tapt.» eller «Du godtar at varselet kom for
sent, og avgrensningen byggherren angir i begrunnelsen.» Det begrunnede varselet etter
§ 34.2.2 annet ledd og den løpende orienteringen om kostnadsutviklingen sendes utenfor
løsningen og registreres etter OV-U4. Forhold: presiserer OV-U14 og OV-U1; i tråd med OV-U25;
endrer LV-U30; endrer VS-U5 og OV-U22 for et særskilt krav som ikke er tilbud, slik at
byggherren angir avgrensningen med dato eller i begrunnelsen i stedet for med beløp; OV-U28
står med sin ordlyd; OV-U23 og OV-U27 står.»

**Alternativ B:** «Som A, men løsningen fastsetter avgrensningen: prinsipalt er standpunktet
at TE har tapt retten til å påberope seg utgifter påløpt før varselet i brev <n> av <dato> kom
fram. Brevet: «Byggherren gjør gjeldende at varselet … kom for sent, og at TE har tapt retten
til å påberope seg utgifter påløpt før varselet som grunnlag for kravet.» Forhold: som A, men
utvider OV-U28 med brevteksten med skjæringspunkt.»

**Alternativ C:** «Som A, men det særskilte kravet etter § 34.1.3 annet ledd kan bare
fremsettes i et tilbud (OV-U23, LV-U30). Krever TE justering etter enhetspriser eller som
regningsarbeid, sier skjemaet at et krav om nedsatt produktivitet eller forstyrrelser sendes
utenfor løsningen og registreres etter OV-U4. Det samme gjelder det begrunnede varselet etter
§ 34.2.2 annet ledd og den løpende orienteringen om kostnadsutviklingen. Forhold: presiserer
OV-U14 og OV-U1; snevrer inn OV-U23 til tilbud.»

**Hva valget styrer:**

- Under A og B kan TE fremme hele vederlagskravet i løsningen etter samme regel, og byggherren
  svarer på én regel for hele kravet.
- Under A er avgrensningen byggherrens standpunkt, og TEs aksept gjelder det byggherren har
  angitt. Under B blir en tolkning som ikke er avklart, obligatorisk brevtekst som TE kan godta.
- Under C må TE som krever regningsarbeid for arbeidet, sende kravet om nedsatt produktivitet
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
- Kontraktsgrunnlaget krever signert endringsordre ved fakturering av endringsarbeid, med
  dokumentasjon for regningsarbeid (Del II pkt. 184). Endringsordren kan utstedes utenfor
  løsningen. Uten en vei inn i endringsordren i løsningen må partene fullføre den delen av
  arbeidsflyten utenfor.

**Alternativ A (foreslått):** «Et utsagn om pris i en endringsordre kan være en
beregningsregel uten beløp: at vederlaget justeres etter kontraktens enhetspriser (§ 34.3.1)
eller som regningsarbeid (§ 34.4 og punkt 30). Oppgir byggherren regelen i endringsordren uten
at den er avtalt, er utsagnet byggherrens standpunkt, og TE godtar eller bestrider det (EO-U8,
KA-U1). Endringsordren pålegger likevel arbeidet (§ 31.3 annet ledd). Godtar TE, er partene
enige om regelen, som etter punkt 4 og 8. Enighet om beregningsregelen er enighet i
vederlagssporet etter EO-U5. Er regelen avtalt i en KOE-sak som inngår, gjengir endringsordren
den som avtalt, med henvisning til brevet der enigheten ble inngått, og TE tar ikke stilling
til den på nytt. Endringsordren kan ikke ensidig endre den (EO-U8). Har vederlagskravet en post
for rigg og drift, gjengir endringsordren regelen for det øvrige vederlaget og det avtalte
beløpet for posten hver for seg: «Vederlaget for øvrig justeres som regningsarbeid (NS 8407
§ 34.4 og punkt 30) og avregnes utenfor løsningen. For rigg og drift i forlenget byggetid er
avtalt <beløp> kr eks. mva.» Beløpet for posten er ikke det samlede vederlaget for endringen.
Et kostnadsoverslag kan gjengis som opplysning, men ikke som tak eller avtalt beløp. Vilkår som
ikke er avklart etter svaret 25.10 om vilkår, sperrer som før. Fullmakten for en endringsordre
med en beregningsregel følger punkt 7. TEs kostnadsoverslag, varselet etter § 30.2 og varselet
etter § 34.4 hører til regelen partene er enige om, enten den er avtalt i et KOE-svar eller i en
endringsordre (punkt 3, 9 og 10). Hvor TE fører dem når regelen er avtalt i en endringsordre
uten KOE-sak, og hvordan regelen endres etter at saken har inngått i en endringsordre, avgjøres
når EO-sakene bygges. Forhold: presiserer EO-U8, slik at et utsagn om pris kan være en
beregningsregel uten beløp; presiserer EO-U5, slik at enighet om beregningsregelen er enighet
i sporet; følger punkt 7 og 8.»

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
  «påløpte» betyr i § 34.1.3 tredje ledd, er ikke undersøkt. LE-2017-113189, som den andre
  sparringen viste til, er ikke kontrollert. Løsningen avgjør ikke virkningen i noen av
  alternativene.
- **Oppmann etter § 35.2.** Kontraktsgrunnlaget stryker § 35.2 første ledd bokstav a (Del II
  pkt. 40), mens VS-U3 lar appen vise oppmann før overtakelsen. Det ligger utenfor denne runden
  og står i [#1288](https://github.com/khjohns/endringsmeldinger/issues/1288).

## Krav til byggingen

Prøvingen fant disse kravene til kode som ikke er bygget ennå (L). De føres som kommentar i
#909 når vedtakene er fattet, og står her bare til da.

- Et svar med standpunkt om beregningsregelen og beløp for rigg-posten må ikke gi sammenfall
  bare fordi summene er like (`resultatAvBeloep` sammenlikner summer). Standpunktet om at den
  andre regelen gjelder, må hindre sammenfall på samme måte som `aksepterer_metode === false`
  gjør i dag.
- Utfallet for vederlag (`utfall` i `kjerne/frosset/standpunkt.ts`) må kunne uttrykke en kjent
  del og en ukjent del, så nøkkeltallene kan vise beløpet for rigg-posten og at resten er
  ukjent.
- Fullmakten (`brevverdi` i `server/fullmakt.ts`) må regne et svar med standpunkt om regelen
  som ikke verdsettbart, med beløpet for rigg-posten som gulv (`Brevverdi.gulv`).
- En påberopelse etter § 34.4 må holdes uten virkning. Legges den inn som `rettidighet` med ny
  hjemmel, regner `avvisesPrinsipalt` den som prinsipal avvisning når regelsettet gir virkning
  1.
- `rigg_varslet_i_tide` i regelsettet strider mot OV-U25 og fjernes når #1171 bygges.

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

## Sparringen på 1817c40, ordrett

> Jeg har hentet og lest utkastet på 1817c40. Retningen er bedre, men jeg anbefaler fortsatt ikke et samlet «ja». Det gjenstår særlig tre vesentlige rettinger: punkt 8, brevteksten i punkt 9 og skjæringspunktet i punkt 13.
>
> 1. Punkt 8-A: Jeg støtter arbeidsmåten, men «avgjort» må avgrenses tydeligere.
>
> Med avregningen utenfor er det fornuftig å kunne fullføre behandlingen av beregningsregelen og la saken inngå i en endringsordre uten et avtalt beløp. Jeg støtter derfor retningen i 8-A fremfor et ekstra samtykke bare til arbeidsdelingen.
>
> Men teksten sier fortsatt «Alle krav sendt i appen er avgjort». En underlinje om ekstern avregning retter ikke fullt ut inntrykket av at selve vederlagskravet er avgjort.
>
> Jeg anbefaler at vedtaket uttrykkelig skiller mellom:
>
> * enighet om beregningsregelen;
> * at behandlingen av denne delen er ferdig i løsningen;
> * at beløpet fortsatt avregnes utenfor.
>
> Eksempel på visning:
>
> «Beregningsregelen er avtalt. Beløpet avregnes utenfor løsningen.»
>
> Det må samtidig stå direkte i 8-A at uavklarte tilleggsvilkår hindrer den virkningen som ellers lar kravet regnes som ferdig. «Vilkår … virker som før» er for indirekte når første setning allerede erklærer enigheten virksom.
>
> Setningen «Ingen av dem endrer utfallet» må også rettes: Et godtatt forslag om ny beregningsregel endrer innholdet i enigheten, selv om det ikke gjenåpner behandlingen.
>
> 2. Punkt 9: Skjemaet avgjør tilbudets binding mens dokumentet sier at spørsmålet er utsatt.
>
> Skjemaet skal nå si:
>
> «Et tilbud binder TE til byggherren har tatt stilling til det innen rimelig tid …»
>
> Det er mer kategorisk enn § 34.2.1-teksten dere har lagt frem. Bestemmelsen pålegger BH å ta stilling innen rimelig tid; den formuleringen avgjør ikke alene alle spørsmål om tilbudets binding og opphør. Dessuten står akkurat dette som et uavklart spørsmål nederst i dokumentet.
>
> Bytt til:
>
> «Tilbudet i brev ‹n› av ‹dato› er ikke besvart. Et kostnadsoverslag endrer ikke tilbudet. En ny kravversjon kan få andre følger. Løsningen avgjør ikke om TE er løst fra tilbudet.»
>
> «Tilbudet står» i selve overslagsbrevet bør også vurderes bevisst: Det kan leses som en ny bekreftelse av tilbudet. «Dette kostnadsoverslaget endrer ikke tilbudet» uttrykker den tilsiktede avgrensningen bedre.
>
> 3. Punkt 13: Støtt produktivitetskravet, men ikke fastsett skjæringspunktet slik ennå.
>
> Jeg støtter at produktivitetskravet skal kunne håndteres også uten fastsumtilbud. Det følger likevel ikke at løsningen må erstatte beløpet med en fast regel om alle utgifter før varselets fremkomst.
>
> Jeg fant relevant rettspraksis: I LE-2017-113189 behandlet lagmannsretten § 34.1.3. Retten skilte mellom et rettidig varsel og et sent varsel, og omtalte muligheten for å beholde krav på ennå ikke påløpte utgifter ved sen varsling som et spørsmål den ikke avgjorde i det aktuelle tilfellet. Dommen etablerer dermed ikke den generelle skjæringsregelen utkastet bygger på. 
>
> Det er bra at tolkningen er merket, men merkingen alene er ikke tilstrekkelig når den blir obligatorisk brevtekst som TE senere kan godta.
>
> Mitt forslag er å beholde BHs uttrykkelige påberopelse av begrensningen, uten automatisk å fastsette datoen eller hvilke utgifter den rammer. Eventuell nærmere avgrensning må fremgå som BHs standpunkt. Den konkrete akseptvirkningen må beskrives tilsvarende.
>
> 4. Punkt 4: Hovedmotstriden er rettet, men én kobling mangler.
>
> Skillet mellom § 34.1.2 og grunnlagssporets § 32.2 er nå tydeligere.
>
> Men sammenfallsregelen krever bare samme beregningsregel, riktig lag og ingen tilleggsvilkår. Samtidig sier teksten at TE ved uttrykkelig aksept også godtar en påberopelse etter § 34.4.
>
> Prøv derfor:
>
> TE krever regningsarbeid. BH er enig i beregningsregelen, men påberoper manglende eller sent varsel etter § 34.4.
>
> Løsningen må ikke gjennom sammenfall registrere at TE har godtatt denne påberopelsen. Enighet om regelen kan foreligge samtidig som innsigelsen er omtvistet. Dette må fremgå uttrykkelig.
>
> 5. Punkt 7 og 14: Jeg støtter retningen.
>
> 7-A har nå en selvstendig begrunnelse for fullmaktskontrollen.
>
> 14-A gir en bedre sammenheng mellom KOE og EO. Behold skillet mellom at BH oppgir en beregningsregel i endringsordren, og at regelen gjengis som allerede avtalt. Uavklarte vilkår må fortsatt sperre der det er vedtatt.
>
> To mindre rettinger:
>
> * Punkt 8 sier at beløpet ved regningsarbeid bare kan avtales etter avregningen. Det er for kategorisk; partene kan avtale et beløp tidligere.
> * Punkt 12 kaller avtale om beløpet i én sak «sluttoppgjøret». Bruk «endelig oppgjør av vederlagsjusteringen i saken», slik brevteksten allerede gjør.
>
> Min anbefaling: Behold hovedretningen i 7-A, revidert 8-A, 9-A, 10-A, 12-A og 14-A. Rett koblingen i punkt 4, og skill støtten for produktivitetskravet fra den usikre skjæringsregelen i punkt 13 før pakken vedtas.
>
> Jeg har lest dokumentet, men ikke kjørt koden eller kontrollert samtlige vedtaksrelasjoner. Rettspraksissøket var målrettet, ikke uttømmende.

## Sparringen om rigg og drift, ordrett

Svaret gjelder funnet om kontraktsgrunnlaget Del II pkt. B.2.16 og pkt. 184 i økta 26.10.

> Ja, rigg og drift må tas inn før pakken vedtas. Men rettingen bør justeres, og kontraktsavviket løser ikke innvendingen min til skjæringspunktet for produktivitet.
>
> 1. Rigg-posten må behandles særskilt – uten at resten av kravet styrer beregningsregelen.
>
> Claudes funn er viktig: Vederlagskravet kan inneholde både en beregningsregel for øvrige arbeider og et konkret beløp for rigg og drift. Da holder ikke «bare fast sum har beløp».
>
> Jeg støtter at den avtalte formelen fortsatt gjelder rigg-posten når øvrig vederlag kreves etter enhetspriser eller regningsarbeid. Men formuleringen «uansett hvilken beregningsregel» bør ikke utilsiktet utelukke et uttrykkelig tilbud og en senere avtale om fast sum som også omfatter posten.
>
> Skriv heller:
>
> «Når øvrig vederlag kreves etter enhetspriser eller som regningsarbeid, behandles posten for rigg og drift i forlenget byggetid fortsatt etter OV-U37–OV-U40. Posten har et eget beløp som byggherren tar stilling til. Valget av beregningsregel for øvrig vederlag endrer ikke postens beregningsregel.»
>
> 2. Sammenfall krever mer enn samme regel og samme rigg-beløp.
>
> Forslaget sier nå at partene er enige når BH godtar regelen for resten og hele rigg-beløpet. Det mangler vilkår, varslingsinnsigelser og de øvrige betingelsene vi allerede har diskutert.
>
> Tilføy:
>
> «Sammenfall forutsetter at standpunktene stemmer for alle delene av kravet, og at de øvrige vilkårene for sammenfall er oppfylt. Enighet om beregningsregelen for øvrig vederlag er ikke alene tilstrekkelig når rigg-posten står uavklart.»
>
> Dette må gjennomføres både i punkt 4 og i vilkårene for avslutning etter punkt 8. Grunnlagsforbeholdet og tilleggsvilkår må fortsatt behandles særskilt.
>
> 3. Prøvingen må også omfatte fullmakt, nøkkeltall og endringsordre.
>
> Ikke begrens prøvingen til OV-U25 og OV-U36–OV-U40. Bruk dette konkrete forløpet:
>
> Øvrig arbeid kreves som regningsarbeid. TE krever samtidig 200 000 kroner for rigg og drift. BH godtar regningsarbeid, men bare 150 000 kroner for rigg-posten. TE godtar deretter svaret.
>
> Kontroller at:
>
> * svaret ikke gir automatisk sammenfall;
> * fullmakten ikke regnes bare av de 150 000 kronene når resten er uten beløpstak;
> * nøkkeltallene skiller avtalt rigg-beløp fra overslaget for regningsarbeidet;
> * endringsordren kan gjengi begge deler uten å fremstille rigg-beløpet som totalvederlaget.
>
> Dette er en direkte følge av å støtte blandede poster i samme krav.
>
> 4. Produktivitet: kontraktsavviket bekrefter virkeområdet, ikke skjæringspunktet.
>
> At tapsregelen står uendret, bekrefter at den fortsatt må håndteres for produktivitetskravet. Det fastslår ikke alene at den obligatoriske brevteksten skal avgrense tapet til alle utgifter før varselets fremkomst.
>
> Min tidligere innvending til punkt 13 står derfor. Henvisning til B.2.16 og OV-U25 er riktig, men den erstatter ikke vurderingen av denne tolkningen. Skill mellom:
>
> * at BH kan påberope begrensningen;
> * hvilken avgrensning BH gjør gjeldende;
> * hva løsningen selv utleder.
>
> 5. Fakturakravet støtter behovet for EO-støtte, men begrunnelsen er for kategorisk.
>
> Hvis pkt. 184 har innholdet Claude beskriver, styrker det behovet for en praktisk vei til en signert endringsordre uten fast beløp.
>
> Men «uten en vei inn i endringsordren kan TE ikke fakturere» bør ikke brukes om manglende funksjonalitet i løsningen. Endringsordren kan fortsatt utstedes utenfor tjenesten. Produktproblemet er at brukeren ellers må fullføre denne delen av arbeidsflyten utenfor.
>
> Min anbefaling: Ta inn rigg-rettingen med presiseringene over, og prøv det blandede kravet gjennom svar, aksept, fullmakt, nøkkeltall og EO. Legg til kontraktshenvisningene i punkt 13 og 14, men behold skjæringspunktet i 13 som et særskilt uavklart spørsmål.
>
> Jeg har vurdert kontraktsopplysningene slik de er gjengitt her; jeg har ikke selv hentet pkt. 184 eller de øvrige nye utdragene fra kontrakt-repoet.
