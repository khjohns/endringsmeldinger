# Samlevedtak: akseptfristen og bortfall av byggherrens svar

Dato: 04.11.2026. Kontrollert commit: `0def8bd`. Del av #1534, steg 4, trinn 2.

Fila er et forslag til samlet tilslutning til reglene for akseptfristen i byggherrens svar og
for når et svar faller bort. Hver setning i forslaget viser vedtaket og eventuelt punktet den
kommer fra. Det som endrer innholdet i en eldre post, også motsigelsen forslaget løser, står i
«Endret innhold» (E1–E8), og oppdragsgiver tar stilling til hvert punkt. Spørsmålene står
ordrett slik de sendes, og svarene føres inn her. Sitatene fra vedtaksfila er ordrette og
kontrollert mot [`vedtak.md`](../plans/vedtak.md) på commiten over. Sitatene fra NS 8407 er
korte og kontrollert mot kontraktsteksten.

Kjeden er kort fordi MM-U34 punkt 17 alt har gjort fristen til en opplysning: «Byggherren kan
fortsatt registrere en akseptfrist i svaret, og den vises (HF-U15 og HF-U16 står, unntatt
setningen nedenfor).» Det som står igjen, er spredt på åtte poster, og radtekstene i HF-U5,
HF-U8, HF-U18, LV-U7 og LV-U9 sier fortsatt at fristen har en virkning. Akseptfristen finnes
ikke i koden: ingen hendelse har feltet, og ingen regel leser det (#502 er åpent).

## Postene i kjeden

«Samler»: regelen står i samlevedtaket med uendret innhold, og den gamle ID-en gjelder
fortsatt som «Samlet i samlevedtaket for akseptfristen». «Opphever»: samlevedtaket løser en
motsigelse og endrer innholdet. «Endrer»: bare de navngitte setningene endres; resten av
posten står.

| Post | Klasse | Status nå | Forhold til samlevedtaket | E-punkt |
| --- | --- | --- | --- | --- |
| HF-U15 | vedtak | gjeldende | samler, unntatt setningen om aksept av et helt avslag | E7 |
| HF-U16 | vedtak | gjeldende, endret av MM-U34 punkt 17 | samler, i ordlyden etter MM-U34 punkt 17 | E1 |
| HF-U17 | vedtak | opphevet 28.10 av MM-U34 punkt 17 | står opphevet | E3 |
| HF-U18 | vedtak med designdel | gjeldende, endret av MM-U34 punkt 17 | opphever | E2, E4 |
| HF-U19 | vedtak | opphevet 28.10 av MM-U34 punkt 17 | står opphevet | E4 |
| HF-U20 | vedtak | gjeldende, presiserer det opphevede HF-U17 | opphever | E3 |
| HF-U22 | design, bindende i VS-U3 og MM-U34 | gjeldende, endret av MM-U34 punkt 8 | ingen setning samles; forholdet til HF-U17 har ikke noe å virke på | E5 |
| HF-U14 | vedtak | opphevet 28.10 av MM-U34 punkt 15 | står opphevet | E6 |
| LV-U31 | vedtak | gjeldende, presiserer det opphevede HF-U14 | ingen setning endres; forholdet til HF-U14 har ikke noe å virke på | E6 |
| HF-U5 | vedtak | gjeldende, endret av MM-U34 punkt 4 og 17 | endrer setningene om akseptfristen og aksept etter fristen | E2 |
| HF-U8 | vedtak | gjeldende, ny ordlyd i MM-U34 punkt 2 | samler, i ordlyden etter MM-U34 punkt 2 | E2 |
| OV-U54 | vedtak med designdel | gjeldende, ny ordlyd i MM-U34 punkt 1 | endrer setningene om et svar der akseptfristen er ute | E2 |
| MM-U34 | vedtak med designdel | gjeldende | samler punkt 17; punkt 1, 2, 4 og 8 er kilder | – |
| LV-U7 | vedtak med designdel | gjeldende, endret av MM-U34 punkt 17 | samler, i ordlyden etter MM-U34 punkt 17 | E1 |
| LV-U9 | vedtak med beslutningsdel | gjeldende | endrer «og appen regner bindingen og akseptfristen fra sendingen (LV-U7)» | E8 |
| MM-U24 | design, i `system.md` | gjeldende, endret av MM-U34 punkt 17 | ingen setning samles (design); se funnene | – |
| OV-U43 | vedtak med designdel | gjeldende | ingen setning endres: «Vedtaket avgjør ikke … akseptfrister …» | – |
| OV-U49 | vedtak | opphevet 30.10 av OV-U69; D2 opphevet av MM-U34 punkt 18 | står opphevet | – |


## Forslaget

Samlevedtaket er et *vedtak* med designdel.

### A. Hvor fristen kan stå

1. Byggherren kan sette en akseptfrist bare i et svar på vederlag eller fristforlengelse som
   godkjenner et beløp eller dager, prinsipalt eller subsidiært, og som ikke stemmer med
   kravet. Et svar på grunnlaget, et helt avslag og et svar som godkjenner hele kravet, har
   ingen akseptfrist. (HF-U15; MM-U34 punkt 17)
2. Akseptfristen er en dato i svaret, og den er ute ved utgangen av datoen i norsk tid.
   Byggherren kan ikke sette en frist som ligger før datoen for svaret, eller som faller på en
   lørdag, helligdag eller høytidsdag (NS 8407 punkt 6). (HF-U16, slik MM-U34 punkt 17 lar
   det stå)
3. Hvert svar har sin egen akseptfrist. Et nytt svar kan ha en akseptfrist etter punkt 1 og
   2, også når svaret før ikke hadde en, og det kan ha en annen frist eller ingen. (MM-U34
   punkt 4 og 17, som opphevet HF-U17; E3)

### B. Fristen er en opplysning

4. Akseptfristen vises med datoen, og løsningen viser leveringskvitteringen ved siden av.
   (LV-U7 i ordlyden etter MM-U34 punkt 17)
5. Løsningen knytter ingen virkning til akseptfristen. Den regner ikke en aksept som i tide
   eller for sent, sier ikke at svaret har falt bort eller ikke lenger binder byggherren når
   fristen er ute, og avgjør ikke når et brev er kommet fram (MM-U12). (MM-U34 punkt 17,
   «fristen står som opplysning, virkningene oppheves»; HF-U16 «Om aksepten kom fram i tide
   etter avtaleloven § 2, avgjør ikke appen (MM-U12).»; LV-U7; E1)

### C. Aksept etter fristen

6. Etter akseptfristen er byggherrens svar fortsatt det gjeldende svaret i sporet, og TE kan
   godta det. (HF-U18, første setning; KA-U1 i ordlyden etter MM-U34 punkt 16; E4)
7. Godtar TE svaret etter akseptfristen, sier brevet at aksepten er sendt etter
   akseptfristen <dato> i byggherrens svar. (HF-U18 i ordlyden etter MM-U34 punkt 17)
8. Løsningen registrerer aksepten som andre aksepter etter KA-U1 og avgjør ikke virkningen av
   at den er sendt etter fristen (MM-U12). Byggherren har ikke noe eget svar på aksepten i
   løsningen. Mener byggherren at svaret ikke lenger bandt, tar byggherren det opp i et
   innlegg eller sender et nytt svar, og løsningen avgjør ikke om enigheten står. (HF-U18 i
   ordlyden etter MM-U34 punkt 17; HF-U19 opphevet av MM-U34 punkt 17; MM-U34 punkt 9 og 10;
   spørsmål 2; E4)

### D. Ny kravversjon

9. «Sender TE en ny kravversjon i sporet, også med uendrede verdier, venter sporet på nytt
   svar. Byggherrens svar på den tidligere versjonen kan da ikke godtas i løsningen (KA-U1).
   Det er en begrensning i løsningen. Løsningen sier ikke at svaret er avslått eller har
   falt bort, og avgjør ikke om byggherren fortsatt er bundet av svaret (MM-U12).» (HF-U8 i
   ordlyden etter MM-U34 punkt 2)
10. Brevet og skjemaet for en ny kravversjon er de samme, enten akseptfristen i det
    tidligere svaret er ute eller ikke. (OV-U54 i ordlyden etter MM-U34 punkt 1; E2)

### Designdel

- Skjemaet for byggherrens svar har et felt for akseptfristen bare når punkt 1 tillater det,
  og avviser en dato etter punkt 2. (HF-U15, HF-U16; utformingen står i BF-03 D-4)
- Hvor fristen vises ved kravet, og hva som står der etter fristen, er design i
  [`system.md` MM-U24](../../.interface-design/system.md#mm-u24) og i BF-03 D-4 og G-4.

## Endret innhold

**E1 Fristens virkning.** Gammel tekst: HF-U16 «En aksept som appen registrerer senest den
dagen, regner appen som i tide.»; LV-U7 «Når bindingen inntrer og når en akseptfrist løper
ut, regner appen fra sendingen av brevet og viser leveringskvitteringen ved siden av, uten å
avgjøre når brevet er kommet fram (MM-U12).» Samlevedtaket: punkt 4 og 5. Hvorfor: MM-U34
punkt 17 opphevet setningen i HF-U16 og ga LV-U7 ordlyden «Akseptfristen vises med datoen, og
appen viser leveringskvitteringen ved siden av». Punkt 5 sier samlet hva det betyr: fristen
gir ingen virkning i løsningen. Ny setning er «sier ikke at svaret har falt bort eller ikke
lenger binder byggherren når fristen er ute», som er samme regel som MM-U34 punkt 2 gir for
en ny kravversjon.

**E2 Bortfall ved fristen i radtekstene.** Gammel tekst: HF-U5 «Bindingen i appen varer til
TE godtar svaret, til TE sender en ny kravversjon (avtaleloven § 5), eller til en akseptfrist
byggherren har satt i svaret, er ute (avtaleloven § 2). En aksept etter fristen er et nytt
tilbud fra TE om å godta svaret slik det står (avtaleloven § 4). Byggherren kan godta eller
avslå tilbudet, og godtar byggherren, er partene enige om svaret slik brevet uttrykker det
(KA-U10). Sperren for aksept i FO-U5 gjelder også for en aksept etter fristen. HF-U4 gjelder
også etter at akseptfristen er ute, og mot en ny kravversjon TE sender etter fristen.»;
HF-U8 «Har byggherren satt en akseptfrist i svaret, faller svaret bort når fristen er ute
(avtaleloven § 2). En aksept etter fristen er et nytt tilbud fra TE (avtaleloven § 4). Om
rimelig tid etter avtaleloven § 3 er ute, avgjør ikke appen (MM-U12).»; OV-U54 «Har svaret
ikke et slikt standpunkt, for eksempel et helt avslag (HF-U15), et frafall (GR-U20) eller et
svar der akseptfristen er ute (HF-U5, HF-U18), sier brevet bare at kravet erstatter TEs
tidligere krav.» og «kan svaret ellers godtas, også etter akseptfristen (HF-U18), sier
skjemaet at det ikke kan godtas her når versjonen er sendt (HF-U8).» Samlevedtaket: punkt 5,
6–8 og 10. Setningene gjelder ikke lenger. Hvorfor: MM-U34 punkt 17 «Setningene om
akseptfristen i HF-U5 og HF-U8 går ut med punkt 2 og 4.», og MM-U34 punkt 1 ga OV-U54 en ny
ordlyd der brevet ikke skiller på om fristen er ute. Sperren i FO-U5 gjelder fortsatt for en
aksept etter fristen, fordi FO-U5 gjelder enhver aksept av et fristavslag; setningen i HF-U5
trengs ikke. Om HF-U4 fortsatt gjelder utsagn fra TE, avgjøres ikke her (MM-U34 punkt 6).

**E3 Ny frist i et nytt svar (motsigelsen HF-U17 og HF-U20).** Gammel tekst: HF-U20
«Reviderer byggherren et helt avslag til et svar som godkjenner et beløp eller dager,
prinsipalt eller subsidiært, uten å stemme med kravet, kan det reviderte svaret ha en
akseptfrist.» HF-U20 presiserer HF-U17 «et svar uten akseptfrist kan ikke få en ved
revisjon», som MM-U34 punkt 17 opphevet. Samlevedtaket: punkt 3. HF-U20 oppheves, fordi
regelen nå følger av punkt 1 for ethvert nytt svar og ikke er et unntak fra noe. Hvorfor:
oppdragsgiver 04.11 (1) i #1534: «HF-U20 er *vedtak* og gjeldende, med motsigelsen, til
samlevedtaket for akseptfristen opphever det.»; MM-U34 punkt 4 «Byggherren kan sende et nytt
strukturert svar, også med lavere beløp eller andre endringer.» HF-U17 står opphevet.

**E4 Aksept etter fristen.** Gammel tekst: HF-U18 «Etter akseptfristen er byggherrens svar
fortsatt det gjeldende svaret i sporet. Saken venter på TE, ikke på et nytt svar fra
byggherren. Godtar TE svaret, sier brevet at aksepten er sendt etter akseptfristen <dato> i
byggherrens svar, og at TE tilbyr å godta svaret slik det står.» MM-U34 punkt 17: «HF-U18
blir: «Godtar TE svaret etter akseptfristen, sier brevet at aksepten er sendt etter
akseptfristen <dato> i byggherrens svar. Løsningen avgjør ikke virkningen (MM-U12).»»
Samlevedtaket: punkt 6–8. «HF-U18 blir» kan leses som at hele raden er byttet ut, og da står
det ikke lenger at svaret er gjeldende og kan godtas etter fristen. Punkt 6 sier det
uttrykkelig. «Saken venter på TE, ikke på et nytt svar fra byggherren» er visning og står i
`system.md` MM-U24. Punkt 8 sier hva løsningen gjør med aksepten, som MM-U34 ikke sier
uttrykkelig etter at HF-U19 ble opphevet. Hvorfor: MM-U34 punkt 16 «Løsningen registrerer
enighet om svaret slik det står.»; punkt 9 «Fram til endringsordren kan TE sende en ny
kravversjon og byggherren et nytt svar også i et spor med registrert enighet.»; punkt 10
«Løsningen avgjør ikke om partene rettslig er enige (MM-U12).» Valget i punkt 8 er
spørsmål 2.

**E5 HF-U22 og HF-U17 (motsigelsen).** Gammel tekst: Følge for HF-U22 «vedtaket sier hva
appen viser når byggherren senker etter akseptfristen, som HF-U17 tillater» og forholdet
«Presiserer HF-U17». Samlevedtaket: HF-U22 gjelder i ordlyden fra MM-U34 punkt 8, «Senker
byggherren i et nytt svar dager eller beløp byggherren har godkjent, viser løsningen det
tidligere svaret og, for frist og enhetspriser, § 33.7 annet ledd eller § 34.3.3 annet ledd
med frist og bestemmelse, uten å trekke konklusjonen (VS-U2).», for ethvert nytt svar og
uavhengig av akseptfristen. Begrunnelsen i Følge og forholdet til HF-U17 gjelder ikke
lenger. HF-U22 samles ikke her; den hører til kjeden «Revisjon av byggherrens svar».
Hvorfor: MM-U34 punkt 8 «Gjelder ethvert nytt svar».

**E6 LV-U31 og HF-U14 (motsigelsen).** Gammel tekst: forholdet «Presiserer HF-U14» i LV-U31.
HF-U14 («En revisjon fra «aksepterer» til «aksepterer ikke» avvises») er opphevet av MM-U34
punkt 15. Samlevedtaket: LV-U31 står uendret. Den sier hva brevet sier når byggherren
godkjenner oppgjør som fast sum, og ingenting om revisjon. Forholdet til HF-U14 har ikke noe å
virke på og leses ikke som at sperren i HF-U14 står. LV-U31 samles ikke her; den hører til
kjeden «Vederlagsmetoden». Hvorfor: MM-U34 punkt 15 «HF-U14: oppheves».

**E7 Aksept av et helt avslag.** HF-U15 «TEs aksept av et helt avslag er et avkall etter HF-U10
og gjelder straks.» samles ikke her og står uendret i HF-U15. Setningen gjelder avkallet, ikke
akseptfristen, og hører til kjeden «‹Ingen krav›, avkall og godtatt avslag», der MM-U34
endret HF-U10.

**E8 LV-U9.** Gammel tekst: LV-U9 «Brevet er sendt når det er lagret i appen, og appen regner
bindingen og akseptfristen fra sendingen (LV-U7).» Samlevedtaket: «Brevet er sendt når det er
lagret i appen.» Resten av setningen gjelder ikke lenger. Hvorfor: MM-U34 punkt 17 endret
LV-U7, som LV-U9 viser til, men ikke LV-U9; MM-U34 punkt 5 «Løsningen avgjør ikke om parten
er bundet av et tidligere utsagn (MM-U12).» Resten av LV-U9 står.

## Overlapp med samlevedtaket for endringsordren

Forslaget til samlevedtak for endringsordren (grenen `claude/samlevedtak-eo-1534`) venter på
svar. Ingen setning endres av begge. De to postene og punktene begge viser til:

| Post | Endringsordren | Akseptfristen |
| --- | --- | --- |
| HF-U5 | E6: henvisningen «gjelder HF-U5 for det» i HF-U12 faller bort; HF-U5 endres ikke | E2: setningene om akseptfristen og aksept etter fristen gjelder ikke lenger |
| OV-U43 | E12: setningen «En enighet om beregningsregelen …» endres | ingen setning endres |
| MM-U34 | endrer punkt 19, 21 og 22; punkt 2, 5 og 18 er kilder | samler punkt 17; punkt 1, 2, 4, 8, 9, 10 og 16 er kilder |

Slik holdes de fra hverandre: hvert samlevedtak endrer bare setningene det siterer ordrett i
«Endret innhold». MM-U34 punkt 2 er kilde i begge og endres av ingen. Punkt 8 her («fram til
endringsordren» etter MM-U34 punkt 9) avgjør ikke hva som lukker saken; det står i
samlevedtaket for endringsordren, og etter det avvises også en aksept etter fristen når
endringsordren omfatter saken. Den vedtaks-PR-en som merges sist, fører sine forhold i Følge
for HF-U5 og MM-U34 ved siden av de andre, uten å skrive dem om.

## Funn fra prøvingen som ikke avgjøres her

- `system.md` MM-U24 sier «eller en aksept etter fristen uten registrert svar fra
  byggherren», mens MM-U34 punkt 17 strøk «eller en aksept etter fristen som venter på
  byggherren». Teksten forutsetter et svar fra byggherren på aksepten, som HF-U19 ga og MM-U34
  opphevet. Hjem: designet i `system.md` (#502).
- BF-01 siterer LV-U7 i den gamle ordlyden («Når bindingen inntrer og når en akseptfrist løper
  ut, regner appen fra sendingen av brevet …»). Hjem: BF-01, rettes ved neste versjon av
  forløpet.
- HF-U16 sperrer en frist på en lørdag, helligdag eller høytidsdag, mens NS 8407 punkt 6 sier:
  «Ender en frist på en lørdag, helligdag eller høytidsdag, forlenges fristen til nærmest
  følgende virkedag.» Sperren er vedtatt (forkastet alternativ i HF-U16: å forlenge fristen),
  og MM-U34 punkt 17 lot den stå. Mulig senere spørsmål, nå som fristen bare er en opplysning.
- Om HF-U4 fortsatt gjelder utsagn fra TE etter MM-U34 punkt 6, hører til kjeden for «i tide»
  og avkall.
- HF-U22, LV-U31 og setningen om avkall i HF-U15 samles i sine egne kjeder (E5–E7).

## Spørsmålene til oppdragsgiver

1. **Tilslutning til samlevedtaket.** Bakgrunn: MM-U34 punkt 17 gjorde akseptfristen til en
   opplysning uten virkning, men reglene står spredt på åtte poster, og radtekstene i HF-U5,
   HF-U8, HF-U18, LV-U7, LV-U9 og OV-U54 sier fortsatt at svaret faller bort eller ikke binder
   når fristen er ute. HF-U20 er gjeldende, men presiserer det opphevede HF-U17, og HF-U22 og
   LV-U31 viser til opphevede vedtak. Forslaget samler reglene i én tekst med kilde per setning
   (punkt 1–10 og designdelen), opphever HF-U18 og HF-U20 som egne regler, og endrer de
   navngitte setningene i HF-U5, OV-U54 og LV-U9. Hver innholdsendring står i E1–E8 med gammel
   tekst, ny tekst og kilde. Alternativene: **A.** «Samlevedtaket for akseptfristen gjelder med
   E1–E8. Postene det samler, gjelder som «Samlet i samlevedtaket for akseptfristen». Postene
   det opphever, gjelder ikke lenger, og i postene det endrer, gjelder de navngitte setningene
   ikke lenger.» **B.** Samme som A, med rettingene oppdragsgiver gir per E-punkt. Anbefalt: A,
   «ja». Hva valget styrer: hvilken tekst som er regelgrunnlaget for akseptfristen; de gamle
   radtekstene leses ikke lenger alene. Forholdet til andre poster: samler HF-U8, HF-U15 (uten
   setningen om avkall), HF-U16, LV-U7 og MM-U34 punkt 17; opphever HF-U18 og HF-U20; endrer
   HF-U5, OV-U54 og LV-U9; HF-U22 og LV-U31 står, uten forholdet til de opphevede vedtakene.
   Punkt 8 avgjøres i spørsmål 2. Klasse: vedtak med designdel.

2. **Aksept etter akseptfristen.** Bakgrunn: før 28.10 var en aksept etter fristen et nytt
   tilbud fra TE, som byggherren godtok eller avslo i et eget svar (HF-U5, HF-U19). MM-U34
   punkt 17 opphevet HF-U19 og ga HF-U18 ordlyden «Godtar TE svaret etter akseptfristen, sier
   brevet at aksepten er sendt etter akseptfristen <dato> i byggherrens svar. Løsningen avgjør
   ikke virkningen (MM-U12).» Det står ikke uttrykkelig om løsningen da registrerer enighet om
   svaret, eller om svaret fortsatt kan godtas etter fristen. Belegg: MM-U34 punkt 16
   «Løsningen registrerer enighet om svaret slik det står.»; punkt 9 «En registrert enighet
   bevares og vises. Fram til endringsordren kan TE sende en ny kravversjon og byggherren et
   nytt svar også i et spor med registrert enighet. Visningen viser at det nye avviker fra den
   registrerte enigheten, og løsningen avgjør ikke om enigheten står (MM-U12).»; punkt 10
   «Løsningen avgjør ikke om partene rettslig er enige (MM-U12).»; HF-U5, forkastet: «Appen
   avviser en aksept etter fristen. TE kan i stedet sende en ny kravversjon, som er det nye
   tilbudet (avtaleloven § 4).» Avtaleloven § 4 første ledd: «Kommer akcepten for sent frem, ansees den for nyt tilbud.» Annet
   ledd: «Dette gjælder dog ikke, hvis avsenderen av akcepten gaar ut fra, at den er kommet
   frem i rette tid, og tilbyderen maa forstaa dette. I saa fald skal han, hvis han ikke vil
   godta akcepten, uten ugrundet ophold gi den anden part meddelelse om det. Ellers ansees
   avtale for sluttet.»
   Alternativene:
   **A.** «Etter akseptfristen er byggherrens svar fortsatt det gjeldende svaret i sporet, og
   totalentreprenøren kan godta det. Løsningen registrerer en aksept etter fristen som andre
   aksepter, og brevet sier at aksepten er sendt etter akseptfristen <dato> i byggherrens svar.
   Løsningen avgjør ikke virkningen av at aksepten er sendt etter fristen (MM-U12). Byggherren
   har ikke noe eget svar på aksepten i løsningen. Mener byggherren at svaret ikke lenger
   bandt, tar byggherren det opp i et innlegg eller sender et nytt svar, og løsningen avgjør
   ikke om enigheten står.» Forhold: presiserer MM-U34 punkt 16 og 17; opphever HF-U18 som
   egen regel.
   **B.** «Etter akseptfristen kan totalentreprenøren godta svaret, og brevet sier at aksepten
   er sendt etter akseptfristen <dato> i byggherrens svar. Løsningen registrerer ikke enighet
   før byggherren har bekreftet aksepten i et eget valg i skjemaet for svar. Bekrefter
   byggherren ikke, står svaret som før, og løsningen avgjør ikke virkningen (MM-U12).»
   Forhold: endrer MM-U34 punkt 17, som opphevet byggherrens svar på aksepten etter fristen
   (HF-U19), og snevrer inn MM-U34 punkt 16 for aksept etter fristen.
   **C.** «Etter akseptfristen avviser løsningen en aksept av svaret. Totalentreprenøren kan
   sende en ny kravversjon.» Forhold: endrer MM-U34 punkt 17 («virkningene oppheves») og
   gjeninnfører det forkastede alternativet i HF-U5; løsningen avgjør da at fristen er ute, som
   MM-U12 sier at løsningen ikke gjør.
   Anbefalt: A. Det følger av MM-U34 punkt 16 og 17 og gir én vei for aksept; prisen er at
   enigheten registreres også når byggherren mener seg løst, og byggherren må selv si fra i et
   innlegg eller et nytt svar. Hva valget styrer: om sporet viser registrert enighet etter en
   aksept etter fristen, og om byggherren trenger et eget valg i svarskjemaet. Klasse: vedtak.

## Svarene

Ikke stilt ennå.
