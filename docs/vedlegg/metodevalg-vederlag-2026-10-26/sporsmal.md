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
«ja» på med rettelser per punkt. Der det finnes et reelt valg, står det andre alternativet
(B) under, også i vedtaksform. Forholdet til vedtakene står i hvert alternativ.

**Begrepet.** Med *beregningsregelen* menes her regelen kontrakten gir for justeringen når
partene ikke har avtalt den: kontraktens enhetspriser (§ 34.3.1) eller regningsarbeid (§ 34.4
og punkt 30). Et *tilbud* (§ 34.2.1) er noe annet: et forslag om et avtalt vederlag.

## Avgrensningen

Løsningen håndterer kravet, beregningsregelen, begrunnelsen og motpartens standpunkt.
Fakturering, prisposter, mengdekontroll, kostnadsoppgaver og kontrollen av dem, og
avregningen skjer utenfor løsningen (oppdragsgiver 26.10, #909).

## Forløpene som ble prøvd

De fem forløpene i kommentaren 26.10 og de tre som manglet. De tre siste er prøvd av en
subagent mot dagens modell og mot retning (i), med kjøring i kjernen i minnet på `main`
`6883ad9` (**K**), lesing av koden (**L**) og vurdering (**V**). Server og database er ikke
prøvd.

1. **Endre en avtalt beregningsregel.** I dagens modell finnes ingen vei: et krav etter
   enhetspriser eller regningsarbeid gir `UGYLDIG_FORM`, og etter enighet tilbyr kjernen TE
   bare et nytt varsel (K). Etter retning (i) trengs en egen handling med forslag og
   godtakelse, som ikke er trekk eller ny kravversjon. Et delvis samtykke kan ikke
   uttrykkes og må være «godtar ikke» (V).
2. **Tilbud, arbeidet utføres før svar, og tilbudet avslås.** I dag finnes ikke varselet
   etter § 34.4, og byggherrens avslag av tilbudet har alltid et beløp (K). Godtar TE et
   avslag med 0 kr, registreres et avkall; godtar TE et avslag med 200 000, registreres
   200 000 som fast sum; og i begge tilfeller er kravene avgjort, og TE har ingen handling
   igjen utenom et nytt varsel (K). Byggherren tjener på å svare 0 kr (V).
3. **Varslene.** Varselet etter § 34.4 må kunne sendes også etter kravet og ved et tilbud,
   fordi det knytter seg til når arbeidet settes i gang, ikke til kravet (V). Et spørsmål om
   når arbeidet startet, lønner det seg å svare uriktig på (V). Sendes varselet fra
   løsningen før et tidligere varsel er oppgitt, låses datoen (SK-12), og det tidligere kan
   ikke lenger oppgis (V). Et økt overslag er aldri et varsel av seg selv. Varselet etter
   § 30.2 kan komme flere ganger og kan ikke låses én gang per spor (V).

Gjennomgående: svaret om beregningsregelen må skilles fra beløpet. Og teller enighet om
beregningsregelen ikke etter OV-U3, blir et krav om regningsarbeid aldri avgjort i løsningen,
og saken kan ikke inngå i en endringsordre (`kanInngaaIEo` krever `kraveneErAvgjort`) (L).

## Brukerforløpet

Forslaget følger det brukeren skal få gjort:

| Steg | Hvem | Punkt |
| --- | --- | --- |
| Krever vederlag og sier hvordan det skal justeres | TE | 1, 2, 3 |
| Tar stilling til beregningsregelen | BH | 4, 5, 6, 7 |
| Er enige om beregningsregelen | begge | 8 |
| Oppgir nytt overslag og varsler overskridelse underveis | TE | 9, 10 |
| Vil endre beregningsregelen de er enige om | begge | 11 |
| Avtaler beløpet | begge | 12 |
| Det løsningen ikke tar imot | – | 13 |

---

## 1. TEs krav: tilbud, enhetspriser eller regningsarbeid

**Bakgrunn.** Formatet godtar i dag bare tilbud, og brevet sier alltid «Kravet er et tilbud
etter NS 8407 § 34.2.1» (LV-U4 punkt 2, LV-U30). VS-U28 lar TE kreve regningsarbeid «med et
anslått beløp som kravversjon». OV-U14 lar § 34.3.1 være med. Spørsmålet her er også om
beløpet i et krav etter enhetspriser binder (N2 i #909).

**Alternativ A (foreslått):** «TE oppgir i vederlagskravet hvordan TE mener vederlaget skal
justeres: som tilbud etter § 34.2.1, etter kontraktens enhetspriser etter § 34.3.1 eller som
regningsarbeid etter § 34.4 og punkt 30. Bare tilbudet er et tilbud. Et krav etter
enhetspriser eller regningsarbeid er TEs standpunkt om hvilken regel kontrakten gir. Et
beløp i det er TEs beregning eller overslag og ikke et tilbud om fast sum. Byggherrens
standpunkt om beregningsregelen godkjenner ikke mengder, priser, kostnader eller noe beløp.
Brevteksten for et krav etter enhetspriser: «TE krever justering av vederlaget etter
kontraktens enhetspriser (NS 8407 § 34.3.1). Etter TEs beregning utgjør justeringen <beløp>
kr eks. mva. Beregningen er ikke et tilbud.» For et krav om regningsarbeid: «TE krever
justering av vederlaget som regningsarbeid (NS 8407 § 34.4 og punkt 30).» Har kravet et
overslag, følger: «TE anslår kostnadene til <beløp> kr eks. mva. Overslaget er ikke et
tilbud, og vederlaget beregnes etter NS 8407 § 30.1.» Setningen «Kravet er et tilbud etter NS
8407 § 34.2.1.» står bare når kravet er et tilbud. Skjemaet for et tilbud sier at tilbudet
ikke erstatter varselet før regningsarbeid etter § 34.4 eller kostnadsoppgavene etter § 30.3
dersom tilbudet ikke aksepteres. Forhold: utvider det OV-U1 og OV-U14 bygger med krav etter
§ 34.3.1 og § 34.4; endrer LV-U30 og LV-U4 punkt 2, slik at setningen om tilbud bare står i
et tilbud; endrer VS-U28, slik at overslaget ikke er kravets beløp (punkt 2 og 9).»

**Alternativ B:** «TE oppgir i vederlagskravet om kravet er et tilbud etter § 34.2.1, et krav
etter kontraktens enhetspriser etter § 34.3.1 eller et krav om regningsarbeid etter § 34.4
og punkt 30. Beløpet i et krav etter enhetspriser er det beløpet TE krever. Byggherren tar
stilling til det som til andre beløp, og godkjenner byggherren hele beløpet, er partene
enige om det (HF-U7, HF-U9). Et krav om regningsarbeid følger alternativ A. Forhold: som A,
men presiserer HF-U7 og HF-U9 for krav etter enhetspriser.»

**Hva valget styrer:** om en full godkjenning av TEs beregning etter enhetspriser låser
beløpet. Under B kan TEs foreløpige mengder bli et tak, og en senere riktig beregning avvises
(KA-U7). Under A må beløpet avtales særskilt (punkt 12).

**Svar:**

## 2. Er overslaget obligatorisk ved regningsarbeid?

**Bakgrunn.** Etter § 30.2 første ledd kan byggherren kreve et kostnadsoverslag. Kontrakten
krever ikke et overslag for å kreve regningsarbeid. VS-U28 sier «med et anslått beløp som
kravversjon», og byggherrens krav om overslag og tilbakeholdelsen sendes utenfor løsningen.

**Alternativ A (foreslått):** «I et krav om regningsarbeid er kostnadsoverslaget valgfritt.
TE kan oppgi det i kravet eller senere (punkt 9). Uten overslag sier visningen at overslag
ikke er oppgitt, og beløpet er ukjent, ikke 0 (MM-U28). Byggherrens krav om kostnadsoverslag
og tilbakeholdelsen etter § 30.2 første ledd sendes utenfor løsningen og registreres etter
OV-U4, som etter VS-U28. Forhold: endrer VS-U28, som krever et anslått beløp i kravet;
presiserer MM-U28.»

**Alternativ B:** «Et krav om regningsarbeid har alltid et kostnadsoverslag. Overslaget er
ikke et tilbud, og vederlaget beregnes etter § 30.1. Byggherrens krav om kostnadsoverslag og
tilbakeholdelsen etter § 30.2 første ledd sendes utenfor løsningen og registreres etter
OV-U4. Forhold: presiserer VS-U28.»

**Hva valget styrer:** under A får byggherren ikke alltid et tall, og fullmakten kan ikke
regnes av et overslag (punkt 7). Under B må TE oppgi et tall før det kan anslås forsvarlig,
og tallet kan senere bli brukt som et tak.

**Svar:**

## 3. Varselet før regningsarbeidet settes i gang (§ 34.4)

**Bakgrunn.** VS-U28 lar varselet sendes fra løsningen som eget utsagn, eller lar TE oppgi
datoen for et varsel sendt utenfor. Punktet følger av VS-U28 og foreslås uten motalternativ.
Det presiserer hvordan varselet henger sammen med kravet.

**Forslag:** «Et krav om regningsarbeid er ikke i seg selv et varsel etter § 34.4 første
ledd. Varselet er et eget utsagn etter VS-U28. Det kan sendes i samme brev som kravet ved et
uttrykkelig valg uten forhåndsvalg, eller for seg. Det kan sendes også etter at
vederlagskravet er sendt, og uansett hvilken form kravet har, også ved et tilbud. Sperren i
OV-U8 for et nytt varsel etter § 34.1.2 gjelder ikke dette varselet. Før varselet sendes fra
løsningen, spør skjemaet om det er sendt et varsel utenfor løsningen. TE kan da oppgi datoen
etter OV-U5, og datoen settes én gang. Skjemaet spør ikke når arbeidet ble satt i gang.
Brevteksten: «TE varsler etter NS 8407 § 34.4 første ledd at arbeidet i sak <saksnummer>
(«<sakstittel>») utføres som regningsarbeid.» Er kravet et tilbud, følger: «Varselet gjelder
dersom byggherren ikke aksepterer tilbudet.» Byggherren kan gjøre gjeldende i svaret at
varselet ikke ble gitt eller kom for sent, uten utledet virkning (VS-U28). Forhold:
presiserer VS-U28, OV-U5 og OV-U8.»

**Hva valget styrer:** at TE kan varsle når arbeidet må settes i gang før byggherren har
svart, uten å bli presset til å oppgi når arbeidet startet.

**Svar:**

## 4. Byggherrens standpunkt om beregningsregelen

**Bakgrunn.** I dag kan byggherren bare akseptere eller ikke akseptere et tilbud (§ 34.2.2),
og svaret har alltid et beløp. «Aksepterer» gir teksten «fast sum» (LV-U32). «Aksepterer
ikke» sier at byggherren avviser tilbudet og hvilken regel byggherren mener gjelder, med et
beløp (arbeidsvalget i #479). Forløp 2 viste at TEs aksept av et slikt svar blir et avkall
eller en fast sum. Punktet samler spørsmålene 1, 3, 4 og 5 i kartleggingen.

**Alternativ A (foreslått):** «Byggherren tar i svaret på vederlagskravet stilling til
hvordan vederlaget skal justeres, som et eget standpunkt. Er kravet et tilbud, aksepterer
byggherren tilbudet, godkjenner oppgjør som fast sum med beløpet og forbeholdene i svaret
(LV-U31, LV-U32), eller aksepterer ikke tilbudet og oppgir om vederlaget etter byggherrens
syn skal justeres etter kontraktens enhetspriser eller som regningsarbeid. Er kravet etter
enhetspriser eller regningsarbeid, er byggherren enig i regelen TE krever, eller mener at den
andre regelen gjelder. Et standpunkt som ikke godkjenner oppgjør som fast sum, har ikke
beløp. Brevteksten er: «Byggherren aksepterer ikke TEs tilbud (NS 8407 § 34.2.2 første ledd),
og mener vederlaget skal justeres etter kontraktens enhetspriser (NS 8407 § 34.3.1) [som
regningsarbeid (NS 8407 § 34.4)].» «Byggherren er enig i at vederlaget skal justeres etter
kontraktens enhetspriser (NS 8407 § 34.3.1) [som regningsarbeid (NS 8407 § 34.4)].»
«Byggherren mener at kontraktens enhetspriser ikke er anvendelige, og at vederlaget skal
justeres som regningsarbeid (NS 8407 § 34.4).» «Byggherren mener at kontraktens enhetspriser
er anvendelige, og at vederlaget skal justeres etter dem (NS 8407 § 34.3.1).» Etter hvert av
disse standpunktene følger: «Standpunktet gjelder hvordan vederlaget skal beregnes. Det
godkjenner ikke mengder, priser, kostnader eller noe beløp.» Er byggherren enig i regelen TE
krever, er partene enige om beregningsregelen uten TEs aksept, fordi standpunktene faller
sammen. Mener byggherren at den andre regelen gjelder, eller aksepterer byggherren ikke
tilbudet, kan TE godta svaret eller sende en ny kravversjon (HF-U19). Godtar TE, er partene
enige om regelen byggherren oppgir. Aksepten er ikke et avkall på kravet, og tilbudet er ikke
akseptert. Brevet sier: «TE godtar at vederlaget justeres etter kontraktens enhetspriser (NS
8407 § 34.3.1) [som regningsarbeid (NS 8407 § 34.4)], slik byggherren mener i brev <n> av
<dato>.» En revisjon som endrer standpunktet fra enig til uenig, avvises, mens det motsatte er
tillatt. Byggherren kan gjøre standpunktet avhengig av vilkår etter 3b-D1. Forhold: endrer
arbeidsvalget i #479, slik at standpunktet ikke har beløp og også gjelder krav som ikke er
tilbud; snevrer inn LV-U31 og LV-U32 til tilbud; utvider LV-U4 punkt 5 med brevtekstene;
utvider HF-U14 til standpunktet om beregningsregelen; presiserer HF-U7, HF-U9 og HF-U10 for
sammenfall og aksept av et standpunkt om beregningsregelen; presiserer HF-U19; presiserer
3b-D1.»

**Alternativ B:** «Byggherren tar stilling til beregningsregelen som i alternativ A, med de
samme brevtekstene, men svaret har også et beløp, som i dag. Godkjenner byggherren hele det
beløpet TE har oppgitt, er partene enige om beløpet (HF-U7, HF-U9). Godtar TE et svar som
avviker, er partene enige om svarets beløp. Forhold: som A, men arbeidsvalget i #479 står for
beløpet, og HF-U9 og HF-U10 gjelder uendret.»

**Hva valget styrer:** under B blir TEs aksept av «regningsarbeid gjelder» med 0 kr et
avkall, og med et beløp en fast sum (K). Byggherren tjener da på å svare 0 kr. Under A kan
partene bli enige om regelen uten å bli enige om et beløp.

**Svar:**

## 5. Akseptfrist i et svar om beregningsregelen

**Bakgrunn.** HF-U15 lar byggherren sette en akseptfrist bare i et svar som godkjenner et
beløp eller dager og ikke stemmer med kravet. 3b-D1 (svaret 25.10 i #1282, ikke ført i
vedtaksfila ennå) sier at et svar med vilkår ikke stemmer med kravet, så byggherren kan sette
en akseptfrist etter HF-U15. Et standpunkt om beregningsregelen har ikke beløp etter punkt 4A.
Spørsmålet er N3 i #909.

**Alternativ A (foreslått):** «Et svar som tar standpunkt til beregningsregelen uten å
godkjenne et beløp, har ingen akseptfrist for dette standpunktet. Det gjelder også når
standpunktet ikke stemmer med kravet eller har vilkår etter 3b-D1. Om TE godtar innen rimelig
tid etter avtaleloven § 3, avgjør ikke løsningen (MM-U12). Forhold: presiserer HF-U15 og
3b-D1, slik at akseptfristen i 3b-D1 bare gjelder et svar som godkjenner beløp eller dager.»

**Alternativ B:** «Byggherren kan sette en akseptfrist i et svar som tar standpunkt til
beregningsregelen, når standpunktet ikke stemmer med kravet eller har vilkår etter 3b-D1. Er
fristen ute, faller standpunktet bort som tilbud (HF-U8), og TE kan ikke lenger godta det i
løsningen. Forhold: utvider HF-U15; presiserer 3b-D1.»

**Hva valget styrer:** under B faller byggherrens standpunkt om at for eksempel
regningsarbeid gjelder, bort som tilbud. Kontraktens regel gjelder likevel, så visningen kan
gi inntrykk av at noe er tapt som ikke er det.

**Svar:**

## 6. Standpunktet om beregningsregelen i lagene, og preklusjon etter § 34.1.2

**Bakgrunn.** N5 i #909. Utfallet i kjernen er i dag bare et beløp. Punktet følger av OV-U27,
OV-U32, OV-U33 og MM-U28 og foreslås uten motalternativ.

**Forslag:** «Standpunktet om beregningsregelen står i lagene i svaret som de andre
standpunktene i vederlagssporet (OV-U32, OV-U33). Gjør byggherren gjeldende at varselet etter
§ 34.1.2 kom for sent, står standpunktet om beregningsregelen subsidiært (OV-U27). I et lag
der byggherren bare har tatt stilling til beregningsregelen, er utfallet ukjent, ikke 0
(MM-U28). Forhold: presiserer OV-U27, OV-U32, OV-U33 og MM-U28.»

**Svar:**

## 7. Fullmakten for et svar uten beløp

**Bakgrunn.** Fullmakten regnes av beløpet byggherren godkjenner (arbeidsvalget 26.10 i
#818). Et standpunkt om beregningsregelen etter punkt 4A har ikke beløp. Regnes det som 0,
slipper det gjennom fullmakten uten kontroll (L, `server/fullmakt.ts`).

**Alternativ A (foreslått):** «Et svar der byggherren er enig i at vederlaget skal justeres
etter enhetspriser eller som regningsarbeid, eller mener at en av dem gjelder, behandles i
fullmakten som et krav som ikke er tallfestet (GFK-U3, GFK-U4). TEs beregning eller overslag
brukes ikke som verdi. Det samme gjelder byggherrens forslag og godtakelse etter punkt 11.
Forhold: presiserer GFK-U3 og GFK-U4.»

**Alternativ B:** «Et slikt svar verdsettes i fullmakten etter TEs beregning eller gjeldende
overslag. Uten beregning eller overslag behandles det som et krav som ikke er tallfestet
(GFK-U3, GFK-U4). Forhold: presiserer GFK-U4.»

**Hva valget styrer:** under A krever hvert slikt svar hele kjeden eller ubegrenset
fullmakt. Under B kan et lavt overslag la en med lav fullmakt binde byggherren til en
beregningsregel uten tak.

**Svar:**

## 8. Hva enighet om beregningsregelen betyr

**Bakgrunn.** OV-U3 regner kravene som avgjort når hvert krav er trukket eller har en virksom
enighet, og sperrer da trekk, ny kravversjon og revisjon. Sparringen 26.10: enighet om
metoden betyr ikke at kravene er avgjort. Forløpene: teller den ikke, blir et krav om
regningsarbeid aldri avgjort i løsningen.

**Alternativ A (foreslått):** «Enighet om beregningsregelen binder begge parter (KA-U7).
Ingen kan gå fra den alene, og den endres bare etter punkt 11. Den er ikke enighet om beløp
og gjør ikke vederlagskravet avgjort etter OV-U3. Et krav etter enhetspriser eller
regningsarbeid er avgjort når det er trukket, eller når partene har avtalt beløpet (punkt
12). Om enigheten er betinget av grunnlaget, følger GR-U7. Visningen sier ved sporet:
«Beregningsregelen er avklart: <kontraktens enhetspriser / regningsarbeid>. Avregningen skjer
utenfor løsningen.» Ved regningsarbeid sier den også: «Kostnadsoppgavene og kontrollen av dem
etter § 30.3 håndteres utenfor løsningen.» TEs beregning og overslag vises som det de er, og
inngår ikke i summen av virksom enighet (MM-U28). En sak der vederlagssporet bare har enighet
om beregningsregelen, oppfyller ikke EO-U5 for det sporet. Forholdet til en endringsordre uten
fast beløp (§ 31.3, EO-U8) avgjøres når EO-sakene bygges. Forhold: presiserer KA-U7, HF-U9,
OV-U3 og MM-U28; presiserer EO-U5.»

**Alternativ B:** «Enighet om beregningsregelen er en virksom enighet i sporet etter OV-U3
når grunnlaget er avklart, og kravene kan da være avgjort. Et nytt overslag, et varsel etter
§ 30.2 og et forslag om endret beregningsregel godtas også når kravene er avgjort. Saken kan
inngå i en endringsordre etter EO-U5. Forhold: endrer OV-U3 med nye unntak; presiserer EO-U5.»

**Hva valget styrer:** under A står saken åpen i løsningen også når avregningen utenfor er
ferdig, til beløpet avtales eller kravet trekkes. Under B sier visningen «Alle fremsatte krav
er avgjort» om et krav der beløpet ikke er avklart, og TE kan ikke trekke kravet etterpå.

**Svar:**

## 9. Nytt overslag underveis

**Bakgrunn.** VS-U28: «Kravet kan oppdateres med en ny kravversjon når kostnadene er kjent.»
En ny kravversjon gjør at byggherrens svar faller bort (HF-U8), og i et spor med enighet
avvises den (KA-U7). Spørsmålet er N1 i #909.

**Alternativ A (foreslått):** «TE kan oppgi et nytt kostnadsoverslag så lenge kravet om
regningsarbeid ikke er avgjort eller trukket. Overslaget er TEs eget utsagn og ikke en ny
kravversjon (KA-U2). Byggherrens svar faller ikke bort, overslaget avvises ikke fordi partene
er enige om beregningsregelen, og det er ikke et tilbud om fast sum. Tidligere overslag står
i historikken. Byggherren svarer ikke på et overslag i løsningen. Brevteksten: «TE oppgir et
nytt kostnadsoverslag på <beløp> kr eks. mva. Det erstatter overslaget i brev <n> av <dato>.
Overslaget er ikke et tilbud, og vederlaget beregnes etter NS 8407 § 30.1.» Forhold: endrer
VS-U28, slik at overslaget ikke oppdateres med en ny kravversjon; presiserer KA-U2, HF-U8 og
KA-U7.»

**Alternativ B:** «Et nytt overslag er en ny kravversjon, som VS-U28 sier. Byggherrens svar
faller bort (HF-U8), og byggherren svarer på nytt. I et spor der partene er enige om
beregningsregelen, avvises et nytt overslag (KA-U7). Forhold: presiserer VS-U28.»

**Hva valget styrer:** under B må byggherren svare på nytt på hvert overslag, og etter
enighet om regelen kan overslaget ikke oppdateres uten at TE trekker kravet, som er et
avkall (KA-U22).

**Svar:**

## 10. Varselet om at overslaget vil bli overskredet (§ 30.2 annet ledd)

**Bakgrunn.** VS-U28 sender varselet om overskridelse utenfor løsningen. Plikten inntrer når
det er grunn til å anta at overslaget vil bli overskredet, og krever ikke et nytt beløp.
Spørsmålet er N4 i #909.

**Alternativ A (foreslått):** «TE kan sende varsel etter § 30.2 annet ledd fra løsningen som
et eget utsagn med serverens dato, med eller uten nytt overslag i samme brev, og flere ganger.
Varselet viser til overslaget det gjelder. Brevteksten: «TE varsler etter NS 8407 § 30.2
annet ledd at det er grunn til å anta at kostnadsoverslaget i brev <n> av <dato> vil bli
overskredet.» Når TE oppgir et høyere overslag, viser skjemaet valget «Send også varsel etter
§ 30.2 om at det forrige overslaget vil bli overskredet», uten forhåndsvalg. Løsningen
utleder ikke et varsel av at tallet øker. Den avgjør ikke om varselet kom i tide eller hvilken
virkning et manglende varsel har (MM-U12). Datoen settes ikke én gang per spor. Et varsel sendt
utenfor løsningen registreres etter OV-U4. Forhold: endrer VS-U28, slik at varselet om
overskridelse kan sendes fra løsningen; presiserer SK-12, som ikke gjelder dette varselet.»

**Alternativ B:** «Varselet etter § 30.2 annet ledd sendes utenfor løsningen og registreres
etter OV-U4, som VS-U28 sier. Når TE oppgir et høyere overslag, sier skjemaet at overslaget
ikke er et varsel etter § 30.2, og at varselet sendes utenfor løsningen. Forhold: presiserer
VS-U28.»

**Hva valget styrer:** under B går overslaget og varselet i hver sin kanal, og TE kan tro
at et økt overslag er varsel nok.

**Svar:**

## 11. Endre en beregningsregel partene er enige om

**Bakgrunn.** KA-U7 forkastet «en ny kravversjon bare med byggherrens samtykke». I dag er
trekk den eneste veien ut av en enighet, og trekket er et avkall (KA-U22). Forløp 1.

**Alternativ A (foreslått):** «Er partene enige om beregningsregelen, kan hver av dem foreslå
at vederlaget i stedet justeres etter den andre regelen. Forslaget er et eget utsagn og ikke
en ny kravversjon eller et trekk. Motparten godtar eller godtar ikke. Til forslaget er
godtatt, gjelder enigheten partene har. Forslaget gjelder hele vederlagsjusteringen i saken,
også arbeid som er utført. En regel som bare gjelder en del, avtales utenfor løsningen og
registreres etter OV-U4. Godtar motparten bare for en del, svarer den at den ikke godtar, og
forklarer det i begrunnelsen (KA-U16). Forslaget binder forslagsstilleren til motparten har
svart, eller til en akseptfrist forslagsstilleren har satt i forslaget, er ute (HF-U16).
Løsningen har ingen handling for å kalle det tilbake. Brevet for forslaget: «TE [Byggherren]
foreslår at vederlaget i sak <saksnummer> («<sakstittel>») justeres etter kontraktens
enhetspriser (NS 8407 § 34.3.1) [som regningsarbeid (NS 8407 § 34.4)] i stedet for slik
partene ble enige om i brev <n> av <dato>. Forslaget gjelder hele vederlagsjusteringen i
saken, også arbeid som er utført.» Svaret: «Byggherren [TE] godtar forslaget i brev <n> av
<dato>. Vederlaget justeres etter kontraktens enhetspriser (NS 8407 § 34.3.1) [som
regningsarbeid (NS 8407 § 34.4)].» Eller: «Byggherren [TE] godtar ikke forslaget i brev <n>
av <dato>. Det partene ble enige om i brev <n> av <dato>, gjelder.» Overslagene står i
historikken. Varselet etter § 34.4 står med sin dato. Skal arbeid som ikke er satt i gang,
utføres som regningsarbeid, kan varselet sendes i samme brev som forslaget (punkt 3).
Forhold: utvider KA-U7, slik at en enighet om beregningsregelen kan endres ved forslag og
godtakelse; det forkastede alternativet i KA-U7, en ny kravversjon med samtykke, gjeninnføres
ikke for beløp eller dager; utvider HF-U5 og HF-U16 til forslaget; presiserer KA-U16 og
KA-U22.»

**Alternativ B:** «En beregningsregel partene er enige om i løsningen, kan ikke endres i
løsningen i første versjon. Partene avtaler en endring utenfor løsningen og registrerer
brevet etter OV-U4. Visningen viser fortsatt regelen partene ble enige om i løsningen, med
merknaden om registrerte brev (OV-U10). Forhold: presiserer KA-U7 og OV-U4.»

**Variant av A:** forslagsstilleren kan kalle tilbake forslaget til motparten har svart.
Kostnad: motparten kan ha lagt forslaget til grunn, og det faller bort uten at løsningen ser
det. Vedtaksskillen nevner et fritt tilbakekall av et bindende forslag som en blindvei fra
vurderingen 25.10.

**Hva valget styrer:** under B viser løsningen en regel partene ikke lenger følger. Under A
binder en feil i forslaget forslagsstilleren til motparten har svart.

**Svar:**

## 12. Avtalt beløp

**Bakgrunn.** Sparringen 26.10: et avtalt sluttbeløp kan vurderes senere som en valgfri
handling, trengs ikke for å støtte metodene og må aldri være obligatorisk.

**Alternativ A (foreslått):** «Første versjon har ingen handling for å avtale beløpet for et
krav etter enhetspriser eller regningsarbeid. En avtale om beløpet inngås utenfor løsningen og
registreres etter OV-U4, uten utledning. Kravet står da som etter punkt 8, med merknaden om
registrerte brev (OV-U10). En handling for å avtale beløpet kan bygges senere som et valgfritt
forslag med godtakelse, og den blir aldri obligatorisk. Forhold: presiserer OV-U4 og OV-U3.»

**Alternativ B:** «Partene kan avtale beløpet for et krav etter enhetspriser eller
regningsarbeid i løsningen ved forslag og godtakelse, som etter punkt 11. Når forslaget er
godtatt, er partene enige om beløpet etter HF-U9, og kravet er avgjort etter OV-U3 når
vilkårene der er oppfylt. Handlingen er valgfri. Forhold: utvider HF-U9; presiserer OV-U3 og
EO-U5.»

**Hva valget styrer:** under A blir et krav om regningsarbeid aldri avgjort i løsningen
med mindre det trekkes. Under B bygges en handling til nå.

**Svar:**

## 13. Det løsningen ikke tar imot, med veiledning

**Bakgrunn.** OV-U14 lyder «bare § 34.3.1, § 34.3.2 og § 34.3.3 avvises», og er lest som at
§ 34.3.1 er med og de to andre avvises (#764, kommentaren 6283767168). Forløp 1 viste at
avgrensningene presser brukeren mot regningsarbeid hvis skjemaet ikke sier hva som går
utenfor.

**Alternativ A (foreslått):** «Løsningen tar imot krav etter § 34.3.1. Krav om justerte
enhetspriser etter § 34.3.2 og varsel om justering etter § 34.3.3 avvises og sendes utenfor
løsningen og registreres etter OV-U4. Når TE velger enhetspriser eller regningsarbeid, sier
skjemaet at justerte enhetspriser sendes utenfor løsningen, og at regningsarbeid ikke bør
velges bare fordi løsningen ikke tar imot dem. Byggherrens krav om et spesifisert tilbud etter
§ 34.2.1 første ledd sendes utenfor løsningen. Et fradrag beregnet etter § 34.4 annet ledd
kan ikke kreves som regningsarbeid i løsningen. Det kreves som tilbud eller etter
enhetspriser, eller avtales utenfor løsningen og registreres. Det særskilte kravet etter
§ 34.1.3 annet ledd følger formen kravet har, og byggherrens standpunkt om beregningsregelen
gjelder hele kravet. Det begrunnede varselet etter § 34.2.2 annet ledd og den løpende
orienteringen om kostnadsutviklingen sendes utenfor løsningen og registreres etter OV-U4.
Forhold: presiserer OV-U14 og OV-U1; endrer LV-U30 for det særskilte kravet i et krav som
ikke er tilbud; presiserer OV-U23.»

**Alternativ B:** «Som A, men det særskilte kravet etter § 34.1.3 annet ledd kan bare sendes
som tilbud (OV-U23, LV-U30). Et krav etter enhetspriser eller regningsarbeid kan ikke ha det
særskilte kravet, og et slikt krav sendes utenfor løsningen og registreres. Forhold:
presiserer OV-U14, OV-U1 og OV-U23.»

**Hva valget styrer:** under B må TE som krever regningsarbeid for arbeidet, sende kravet om
nedsatt produktivitet utenfor løsningen, fordi sporet har ett vederlagskrav.

**Svar:**

---

## Ikke med i forslaget

- **TEs tilbakekall av et tilbud.** TE kan i dag erstatte et tilbud byggherren ikke har svart
  på, med en ny kravversjon. Punkt 11A lar et forslag om endret regel binde. Om tilbudet skal
  behandles likt (avtaleloven § 7), er ikke spurt her og bør tas for seg.
- **Rettspraksis** om virkningen av et manglende varsel etter § 34.4 og § 30.2 er ikke
  undersøkt. Løsningen avgjør ikke virkningen i noen av alternativene.
- **§ 31.3** og endringsordre uten fast beløp er ikke lest i denne runden (punkt 8).
