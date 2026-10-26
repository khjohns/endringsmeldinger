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
- Det særskilte kravet har beløp etter VS-U5 og OV-U22 (punkt 13).
- Punkt 8–10 knyttes til regelen partene er enige om, ikke til formen kravet hadde.

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
tak. En senere riktig beregning avvises da (KA-U7). Under A må beløpet avtales særskilt
(punkt 12).

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

Er byggherren enig i regelen TE krever, står standpunktet i første lag eller er upåvirket, og
har svaret ingen vilkår etter svaret 25.10 om vilkår, faller standpunktene sammen. Partene er
da enige om beregningsregelen uten TEs aksept. Ellers tar TE stilling ved å godta svaret
eller sende en ny kravversjon (HF-U8).

TEs aksept gjelder hele svaret, også en påberopt preklusjon og et avslag av grunnlaget
(KA-U1). Brevet for aksepten følger LV-U4 punkt 6. Når standpunktet om beregningsregelen er
subsidiært fordi grunnlaget er avslått eller prekludert, legger brevet til: «TE er enig i
beregningsregelen, men ikke i byggherrens standpunkt til grunnlaget.» Før aksepten sendes,
viser skjemaet hva aksepten omfatter. Godtar TE et svar der standpunktet om
beregningsregelen står i første lag eller er upåvirket, er partene enige om regelen svaret
oppgir. Aksepten er da ikke et avkall på kravet, og et tilbud er ikke akseptert.

En revisjon som endrer byggherrens standpunkt fra enig i TEs regel til den andre regelen,
avvises. Det motsatte er tillatt. Når byggherren har avslått et tilbud, kan en revisjon bytte
regelen byggherren oppgir, fordi ingen av dem er innrømmet TE.

Byggherren kan gjøre standpunktet avhengig av vilkår etter svaret 25.10 om vilkår.

Forhold: endrer arbeidsvalget i #479, slik at standpunktet ikke har beløp og også gjelder krav
som ikke er tilbud; LV-U31 og LV-U32 står for tilbud; utvider LV-U4 punkt 5 og punkt 6 med
brevtekstene; utvider HF-U14 til standpunktet om beregningsregelen; presiserer HF-U5, HF-U7,
HF-U9 og HF-U10 for sammenfall og aksept av et standpunkt om beregningsregelen; presiserer
KA-U1 og HF-U8; utvider svaret 25.10 om vilkår til et standpunkt som ikke godkjenner noe
beløp.»

**Alternativ B:** «Byggherren tar stilling til beregningsregelen som i alternativ A, med de
samme brevtekstene, men svaret har også et beløp, som i dag. Godkjenner byggherren hele det
beløpet TE har oppgitt, er partene enige om beløpet (HF-U7, HF-U9). Godtar TE et svar som
avviker, er partene enige om svarets beløp. Forhold: som A, men arbeidsvalget i #479 står for
beløpet, og HF-U9 og HF-U10 gjelder uendret.»

**Hva valget styrer:**

- Under B blir TEs aksept av «regningsarbeid gjelder» et avkall når beløpet er 0 kr, og en
  fast sum når det har et beløp (K). Byggherren tjener da på å svare 0 kr.
- Under A kan partene bli enige om regelen uten å bli enige om et beløp.
- Under begge omfatter TEs aksept en påberopt preklusjon. Skjemaet viser det før aksepten
  sendes.

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
- Et standpunkt om beregningsregelen etter punkt 4A har ingen verdi. Regnes det som 0,
  slipper det gjennom fullmakten uten kontroll (L, `server/fullmakt.ts`).

**Alternativ A (foreslått):** «Et svar der byggherren tar standpunkt til beregningsregelen
uten beløp, regnes i fullmakten av TEs beregning etter enhetspriser eller det gjeldende
kostnadsoverslaget. Uten beregning eller overslag behandles sporet som et krav som ikke er
tallfestet, og svaret krever hele kjeden (GFK-06). Det samme gjelder byggherrens forslag og
samtykke etter punkt 11. Forhold: presiserer GFK-06 og presiseringen 24.09, slik at TEs
beregning eller overslag er TEs krav.»

**Alternativ B:** «Et svar der byggherren tar standpunkt til beregningsregelen uten beløp,
behandles alltid som et krav som ikke er tallfestet og krever hele kjeden (GFK-06). TEs
beregning eller overslag brukes ikke som verdi. Det samme gjelder byggherrens forslag og
samtykke etter punkt 11. Forhold: utvider GFK-06.»

**Hva valget styrer:**

- Under A kan et lavt overslag la en med lav fullmakt binde byggherren til en
  beregningsregel uten tak. Varselet om overskridelse (punkt 10) viser når overslaget ikke
  holder.
- Under B krever hvert avslag av et tilbud hele kjeden. Byggherren får da grunn til å svare
  med en fast sum i stedet. Det er et svar som lønner seg av andre grunner enn hva byggherren
  mener.

**Svar:**

## 8. Hva enighet om beregningsregelen betyr

**Bakgrunn.**

- OV-U3 regner kravene som avgjort når hvert krav er trukket eller har en virksom enighet. Da
  sperres trekk, ny kravversjon og revisjon.
- OV-U10 gir visningen teksten «Alle krav sendt i appen er avgjort».
- MM-U30 gir sporet høyst én betegnelse.
- Sparringen 26.10: enighet om metoden betyr ikke at kravene er avgjort.
- Forløpene: teller enigheten ikke, blir et krav om regningsarbeid aldri avgjort i
  løsningen.

**Alternativ A (foreslått):** «Enighet om beregningsregelen binder begge parter (KA-U7).
Ingen kan gå fra den alene, og den endres bare etter punkt 11. Den gjelder regelen partene er
enige om, også når TEs krav var et tilbud. Et tilbud byggherren ikke har akseptert, regnes ikke
lenger som krav i nøkkeltallene. Enigheten er ikke enighet om beløp. Den er ikke en virksom
enighet etter OV-U3 og gjør ikke vederlagskravet avgjort. Er partene enige om
beregningsregelen, er vederlagskravet avgjort når det er trukket, eller når partene har avtalt
beløpet (punkt 12). Om enigheten er betinget av grunnlaget, følger GR-U7. Sporet får
betegnelsen «Enige» (MM-U30). Linja under sier: «Om beregningsregelen: <kontraktens
enhetspriser / regningsarbeid>. Avregningen skjer utenfor løsningen.» Ved regningsarbeid sier
den også: «Kostnadsoppgavene og kontrollen av dem etter § 30.3 håndteres utenfor løsningen.»
TEs beregning og kostnadsoverslaget vises som det de er og inngår ikke i summen av virksom
enighet (MM-U28). Saken blir stående åpen i løsningen til beløpet er avtalt eller kravet er
trukket. Trekket er et avkall (KA-U22) og er ikke en vei til å lukke saken. Enighet om
beregningsregelen gir ikke enighet i vederlagssporet etter EO-U5. Forholdet til en
endringsordre uten fast beløp (§ 31.3, EO-U8) avgjøres når EO-sakene bygges. Forhold:
presiserer KA-U7, HF-U9, OV-U3 og MM-U28; presiserer MM-U30; snevrer inn EO-U5.»

**Alternativ B:** «Enighet om beregningsregelen er en virksom enighet i sporet etter OV-U3
når grunnlaget er avklart etter GR-U7, og kravene kan da være avgjort. Et nytt
kostnadsoverslag, et varsel etter § 30.2 og et forslag om endret beregningsregel godtas også
når kravene er avgjort. Saken kan inngå i en endringsordre etter EO-U5. Forhold: endrer OV-U3
med nye unntak; endrer EO-U5.»

**Hva valget styrer:**

- Under A står saken åpen i løsningen også når avregningen utenfor er ferdig, til beløpet
  avtales eller kravet trekkes. Den kan ikke inngå i en endringsordre.
- Under B sier visningen «Alle krav sendt i appen er avgjort» om et krav der beløpet ikke er
  avklart, og TE kan ikke trekke kravet etterpå.

**Svar:**

## 9. Nytt kostnadsoverslag underveis

**Bakgrunn.**

- VS-U28: «Kravet kan oppdateres med en ny kravversjon når kostnadene er kjent.»
- En ny kravversjon gjør at byggherrens svar faller bort (HF-U8). I et spor med enighet
  avvises den (KA-U7).
- Spørsmålet er N1 i #909.

**Alternativ A (foreslått):** «Gjelder regningsarbeid etter TEs krav eller partenes enighet,
kan TE oppgi et nytt kostnadsoverslag så lenge vederlagskravet ikke er avgjort eller trukket.
Overslaget er TEs eget utsagn og ikke en ny kravversjon (KA-U2). Byggherrens svar faller ikke
bort, og overslaget avvises ikke fordi partene er enige om beregningsregelen. Det er ikke et
tilbud om fast sum. Tidligere overslag står i historikken. Byggherren svarer ikke på et
overslag i løsningen. Brevteksten: «TE oppgir nytt kostnadsoverslag etter NS 8407 § 30.2 på
<beløp> kr eks. mva. Det erstatter overslaget i brev <n> av <dato>. Overslaget er ikke et
tilbud, og vederlaget beregnes etter NS 8407 § 30.1.» Forhold: endrer VS-U28, slik at
overslaget ikke oppdateres med en ny kravversjon; presiserer KA-U2, HF-U8 og KA-U7.»

**Alternativ B:** «Et nytt kostnadsoverslag er en ny kravversjon, som VS-U28 sier.
Byggherrens svar faller bort (HF-U8), og byggherren svarer på nytt. I et spor der partene er
enige om beregningsregelen, avvises et nytt overslag (KA-U7). Forhold: presiserer VS-U28.»

**Hva valget styrer:** under B må byggherren svare på nytt på hvert overslag. Etter enighet om
regelen kan overslaget ikke oppdateres uten at TE trekker kravet, og trekket er et avkall
(KA-U22).

**Svar:**

## 10. Varselet om at overslaget vil bli overskredet (§ 30.2 annet ledd)

**Bakgrunn.**

- VS-U28 sender varselet om overskridelse utenfor løsningen.
- Plikten inntrer når det er grunn til å tro at overslaget vil bli overskredet. Den krever
  ikke et nytt beløp.
- Spørsmålet er N4 i #909. Punktet forutsetter 2A eller 2B.

**Alternativ A (foreslått):** «TE kan sende varsel etter § 30.2 annet ledd fra løsningen som
et eget utsagn med serverens dato. Det kan sendes med eller uten nytt kostnadsoverslag i samme
brev, og flere ganger. Varselet viser til overslaget det gjelder. Brevteksten: «TE varsler
etter NS 8407 § 30.2 annet ledd at kostnadsoverslaget i brev <n> av <dato> ventes å bli
overskredet.» Når TE oppgir et høyere overslag, viser skjemaet valget «Send også varsel etter
§ 30.2 om at det forrige overslaget ventes å bli overskredet», uten forhåndsvalg. Løsningen
utleder ikke et varsel av at tallet øker. Den avgjør ikke om varselet kom i tide, eller
hvilken virkning et manglende varsel har (MM-U12). Datoen settes ikke én gang per spor. Et
varsel sendt utenfor løsningen registreres etter OV-U4. Forhold: endrer VS-U28, slik at
varselet om overskridelse kan sendes fra løsningen; presiserer SK-12, som ikke gjelder dette
varselet.»

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

## 12. Avtalt beløp

**Bakgrunn.** Sparringen 26.10: et avtalt sluttbeløp kan vurderes senere som en valgfri
handling. Det trengs ikke for å støtte metodene og må aldri være obligatorisk. Prøvingen viste
at saken under 8A bare kan avgjøres ved trekk, som er et avkall.

**Alternativ A (foreslått):** «Første versjon har ingen handling for å avtale beløpet når
partene er enige om beregningsregelen. En avtale om beløpet inngås utenfor løsningen og
registreres etter OV-U4, uten utledning. Kravet står da som etter punkt 8, med merknaden om
registrerte brev (OV-U10), og saken blir stående åpen i løsningen. En handling for å avtale
beløpet kan bygges senere som et valgfritt forslag med samtykke, og den blir aldri
obligatorisk. Forhold: presiserer OV-U4 og OV-U3.»

**Alternativ B:** «Er partene enige om beregningsregelen, kan de avtale beløpet i løsningen
ved forslag og samtykke, i samme form som punkt 11. Brevet for forslaget: «<Part> foreslår at
vederlaget i sak <saksnummer> («<sakstittel>») justeres med <beløp> kr eks. mva. som endelig
oppgjør av vederlagsjusteringen i saken. Forslaget gjelder til <dato> og faller bort uten
samtykke.» Når forslaget er godtatt, er partene enige om beløpet etter HF-U9, og kravet er
avgjort etter OV-U3 når vilkårene der er oppfylt. Handlingen er valgfri. Forhold: utvider
HF-U9; presiserer OV-U3; presiserer EO-U5, slik at saken kan inngå i en endringsordre når
beløpet er avtalt.»

**Hva valget styrer:** under A blir en sak med enighet om beregningsregelen aldri avgjort i
løsningen, med mindre kravet trekkes, og trekket er et avkall. Under B kan saken avsluttes og
inngå i en endringsordre, men det bygges en handling til nå.

**Svar:**

## 13. Det løsningen ikke tar imot, med veiledning

**Bakgrunn.**

- OV-U14 lyder «bare § 34.3.1, § 34.3.2 og § 34.3.3 avvises». Det er lest som at § 34.3.1 er
  med og de to andre avvises, etter etiketten «Bare § 34.3.1» i #764 (kommentaren
  6283767168).
- Forløp 1 viste at avgrensningene presser brukeren mot regningsarbeid hvis skjemaet ikke
  sier hva som går utenfor.
- Det særskilte kravet etter § 34.1.3 annet ledd har beløp i byggherrens standpunkter (VS-U5,
  OV-U22, OV-U28). Brevet sier «Kravet er et tilbud» også når kravet bare har det særskilte
  kravet (LV-U30).
- Et fradrag er byggherrens krav (KA-U9). Formatet tar ikke imot et negativt beløp fra TE.

**Alternativ A (foreslått):** «Løsningen tar imot krav etter § 34.3.1. Krav om justerte
enhetspriser etter § 34.3.2 og varsel om justering etter § 34.3.3 avvises og sendes utenfor
løsningen og registreres etter OV-U4. Når TE velger enhetspriser eller regningsarbeid, sier
skjemaet at justerte enhetspriser sendes utenfor løsningen, og at regningsarbeid ikke bør
velges bare fordi løsningen ikke tar imot dem. Byggherrens krav om et spesifisert tilbud etter
§ 34.2.1 sendes utenfor løsningen. Et fradrag etter § 34.4 annet ledd har ingen handling i
løsningen. Det særskilte kravet etter § 34.1.3 annet ledd kan bare fremsettes i et tilbud
(OV-U23, LV-U30). Krever TE justering etter enhetspriser eller som regningsarbeid, sier
skjemaet at et krav om nedsatt produktivitet eller forstyrrelser sendes utenfor løsningen og
registreres etter OV-U4. Det samme gjelder det begrunnede varselet etter § 34.2.2 annet ledd
og den løpende orienteringen om kostnadsutviklingen. Forhold: presiserer OV-U14 og OV-U1;
snevrer inn OV-U23 til tilbud.»

**Alternativ B:** «Som A, men det særskilte kravet etter § 34.1.3 annet ledd følger formen
kravet har. I et krav etter enhetspriser eller regningsarbeid lyder setningen i LV-U30: «TE
krever i tillegg særskilt justering av vederlaget etter NS 8407 § 34.1.3 annet ledd for økte
utgifter på grunn av nedsatt produktivitet eller forstyrrelser på annet arbeid, etter
kontraktens enhetspriser (NS 8407 § 34.3.1) [som regningsarbeid (NS 8407 § 34.4)].»
Påberoper byggherren begrensningen etter § 34.1.3, oppgir byggherren ikke beløp for det
særskilte kravet, og utfallet er ukjent, ikke 0 (MM-U28). Det begrunnede varselet etter
§ 34.2.2 annet ledd og den løpende orienteringen om kostnadsutviklingen sendes utenfor
løsningen og registreres etter OV-U4. Forhold: presiserer OV-U14 og OV-U1; endrer LV-U30,
VS-U5, OV-U22 og OV-U28 for et særskilt krav som ikke er tilbud.»

**Hva valget styrer:** under A må TE som krever regningsarbeid for arbeidet, sende kravet om
nedsatt produktivitet utenfor løsningen, fordi sporet har ett vederlagskrav. Under B endres
fire vedtak om det særskilte kravet.

**Svar:**

---

## Ikke med i forslaget

- **TEs tilbakekall av et tilbud.** TE kan i dag erstatte et tilbud byggherren ikke har svart
  på, med en ny kravversjon. Punkt 11A lar et forslag om endret regel binde. Om tilbudet skal
  behandles likt (avtaleloven § 7), er ikke spurt her og bør tas for seg.
- **Rettspraksis** om virkningen av et manglende varsel etter § 34.4 og § 30.2 er ikke
  undersøkt. Løsningen avgjør ikke virkningen i noen av alternativene.
- **§ 31.3** og endringsordre uten fast beløp er ikke lest i denne runden (punkt 8).
