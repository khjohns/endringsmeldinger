# Samlevedtak: kravversjon, ny kravversjon og utdyping

Kartleggingen av kjeden «Kravversjon, ny kravversjon og utdyping» i steg 4, trinn 2 av
[#1534](https://github.com/khjohns/endringsmeldinger/issues/1534), runde 25 i #1065. Kjeden står i
[klassifiseringen](vurdering-klassifisering-2026-11-03.md) under «Kjedene», med postene HF-U5,
HF-U8, HF-U9, KA-U1, KA-U2, KA-U3, KA-U7, KA-U40, MM-U21, MM-U34, OV-U3, OV-U43, OV-U54, OV-U55,
OV-U56, rad-001 («SK-02 og SK-03: et oppdatert krav fra TE åpner sporet igjen …») og rad-002
(«Hver oppdatering fra TE av et vederlags- eller fristkrav er en ny kravversjon …»). Fasit er
postene i `vedtak.toml` og vedtaksfila på `main` (`27f8bab`) og svarene i #1534.

Formen følger svar 4, 7, 8 og 10 i #1534 og [samlevedtaket for trekk](vurdering-samlevedtak-trekk-2026-11-05.md)
(KA-U51). Den foreløpige ID-en er KA-U52; vedtaksøkta setter den endelige.

**Venter på #1309.** Hva en ny kravversjon gjør med et svar som har en aksept av en retting av
varseldatoen (MM-U52 punkt 20), stilles i spørsmålene før byggingen av #1309, og svaret føres i
`vedtak.toml` før dette samlevedtaket. Det tas inn i punkt 5 når det er ført. Samlevedtaket her
siterer MM-U52 punkt 10 og 20 uendret og endrer dem ikke.

## Det kartleggingen fant

- **To opphevede vedtak bærer fortsatt fem forhold.** KA-U7 (en ny kravversjon i et spor med
  enighet avvises) er opphevet 28.10 av MM-U34 punkt 9, og KA-U3 (en ny kravversjon avvises etter
  `OMFORENT`) er opphevet 15.10 av HF-U9. Likevel står `hf-u9 presiserer ka-u7`, `ov-u3 endrer
  ka-u3`, `ka-u20 presiserer ka-u7`, `ov-u43 utvider ka-u7` og `ka-u13 snevrer inn ka-u7` i
  `KJENTE_FORHOLD_TIL_OPPHEVET`. Alle fem er uvirksomme: MM-U34 punkt 10 strøk setningene i HF-U9,
  KA-U49 E6 opphevet setningene i KA-U20, OV-U94 E5 sier at utvidelsen i OV-U43 «ikke har noe å
  virke på», og KA-U51 E4 viser henvisningen i KA-U13 til punkt 3 i samlevedtaket for trekk.
  Leddet i OV-U3 «KA-U3 gjelder kravene som er sendt» har ingenting å virke på. Rad-001 og
  rad-002 viser i Følge fortsatt til KA-U7 og KA-U3 som gjeldende endringer.
- **Rad-001 sier at aksepten faller, MM-U34 punkt 9 at enigheten bevares.** Rad-001 (05.10):
  «Det venter på nytt svar, og en aksept av forrige svar faller.» MM-U34 punkt 9 (28.10): «En
  registrert enighet bevares og vises.» Etter HF-U9 slik MM-U34 punkt 10 endret den, registrerer
  løsningen enighet når TE har godtatt byggherrens svar. KA-U51 E2 leser punkt 9 likt: «etter
  MM-U34 punkt 9 opphever en ny kravversjon ikke en registrert enighet». Det som står igjen av
  rad-001, er at et svar på en tidligere versjon ikke kan godtas (HF-U23 punkt 9).
- **MM-U34 punkt 1 ga OV-U54 ny ordlyd uten å si hvor langt den rekker.** Punkt 1 erstatter
  «kjernen» (en ny kravversjon er TEs avslag), og korrigeringen står nå i MM-U52 punkt 13. Resten av
  OV-U54 bygger på avslaget («Avslaget gjelder tilbudet i svaret i samme spor …», «Bestemmelsen
  gjelder bare når en ny kravversjon ellers er tillatt (KA-U7, OV-U3) …»). Det eneste som står på
  egne bein, er at en innsigelse bevares som påberopelse og at et frafall står (E3).
- **Hva som ikke er en kravversjon, står spredt.** KA-U2 (beslutning), MM-U52 punkt 10 og 13,
  OV-U94 punkt 2, MM-U34 punkt 24 og MM-U52 punkt 15. Ingen av dem strider mot hverandre, og punkt 2
  i forslaget samler dem uten nytt innhold.
- **Utdypingen har ikke lenger egne regler.** MM-U41 E5 og MM-U52 punkt 14–15 tok utdypingen ut av
  OV-U55; den er et innlegg etter MM-U34 punkt 24 og MM-U47. Valget i skjemaet mellom utdyping og ny
  kravversjon falt med OV-U55 og er design, som avgjøres i brukerforløpet, ikke her.

## Overlapp med andre samlevedtak

| Samlevedtak eller kjede | Felles post | Det samlevedtaket tok | Her |
| --- | --- | --- | --- |
| HF-U23 (akseptfristen) | HF-U8, HF-U5, MM-U34 punkt 2 | HF-U8 hel, i ordlyden etter punkt 2 (punkt 9); E2 i HF-U5 | punkt 3 viser til punkt 9 der |
| HF-U25 og HF-U26 (revisjon av svaret) | HF-U5, rad-001 s3 | vernet mot revisjon; E2 i rad-001 s3 | nevnes |
| MM-U50 (sendte brev) | HF-U9 | s4–s5 og tillegget fra MM-U34 punkt 10 | HF-U9 s8 er kilde for punkt 7 |
| MM-U52 (retting av sendt brev) | OV-U54, MM-U21, MM-U34 punkt 1 | korrigeringen (punkt 13), datobrevet (punkt 10), aksepten av rettingen (punkt 20), utdypingen (punkt 15) | punkt 2 og 5 viser dit; punkt 10 og 20 endres ikke |
| MM-U47 (innlegg) | MM-U34 punkt 24, OV-U55 | utdypingen som innlegg | punkt 2 viser dit |
| OV-U94 (vederlagsmetoden) | OV-U43, MM-U34 punkt 9 og 12 | regningsarbeid uten anslått beløp som kravversjon (punkt 2); E5 om KA-U7 | punkt 2 viser dit; avsnittet om overlapp der gir punkt 9 og 12 hit |
| KA-U51 (trekk) | HF-U9, KA-U7, KA-U13 | HF-U9 s6, KA-U7 «TE kan trekke kravet», E2 og E4 | henvisningen i KA-U13 s5 til KA-U7 gjelder punkt 3 i KA-U51, ikke dette |
| EO-U38 (endringsordren) | OV-U3, MM-U34 punkt 12 | sperren fra endringsordren er sendt (punkt 12) | punkt 6 viser dit |
| VS-U46 (særskilt varsel) | MM-U34 | «i tide» og avkall står mot hver senere kravversjon | punkt 10 viser dit |
| Kjeden «Kravene er avgjort, og sperren etter det» (ikke samlet) | OV-U3, KA-U11, MM-U34 punkt 12 | – | her bare sperren mot ny kravversjon; predikatet og de andre sperrene hører dit |

## Postene i kjeden

«Samler»: regelen står i samlevedtaket med uendret innhold. «Opphever»: posten er alt opphevet, og
samlevedtaket tar innholdet slik at henvisningene til den gjelder samlevedtaket (OV-U92 (a)).
«Endrer»: samlevedtaket endrer innholdet i navngitte setninger.

| Post | Klasse | Status nå | Forhold til samlevedtaket | E-punkt |
| --- | --- | --- | --- | --- |
| rad-001 | vedtak | gjeldende; s3 endret av HF-U25 E2 | samler; s2 endres | E1 |
| rad-002 | vedtak | gjeldende | samler | E2 |
| KA-U40 | vedtak | gjeldende | samler | – |
| OV-U54 | vedtak med designdel og beslutningsdel | gjeldende; endret av MM-U34 punkt 1, HF-U23, MM-U41, MM-U52, LV-U53 | samler; alt unntatt innsigelsen og frafallet gjelder ikke | E3 |
| MM-U34 | vedtak med designdel og beslutningsdel | gjeldende; delvis samlet i HF-U23, VS-U46, OV-U89, OV-U91, MM-U48 og MM-U49 | samler punkt 1, 9, strykningen i punkt 10 og sperren mot ny kravversjon i punkt 12 | – |
| KA-U7 | vedtak | opphevet 28.10 av MM-U34 punkt 9 | opphever; henvisningene gjelder samlevedtaket | E5 |
| KA-U3 | vedtak | opphevet 15.10 av HF-U9 | opphever; henvisningene gjelder samlevedtaket | E5 |
| OV-U55 | vedtak med designdel og beslutningsdel | gjeldende; endret av MM-U34 punkt 3, 18 og 24, LV-U53, MM-U41, MM-U52 | endrer to setninger | E4 |
| GR-U1 | vedtak | gjeldende; snevret inn av HF-U8 | endrer s2 | E6 |
| OV-U3 | vedtak med designdel | gjeldende; endret av MM-U34 punkt 12, OV-U43, MM-U35, EO-U38 | står; kilde for punkt 7 | – |
| HF-U9 | vedtak | gjeldende; endret av MM-U34 punkt 10 og KA-U51; delvis samlet i MM-U50 | står; s8 er kilde for punkt 7 | – |
| KA-U1 | vedtak | gjeldende; endret av MM-U34 punkt 16 | står; kilde for punkt 3 | – |
| KA-U2 | beslutning, bindende i OV-U3 | gjeldende | står; kilde for punkt 2 | – |
| HF-U5, HF-U8 | vedtak | HF-U8 samlet i HF-U23; HF-U5 endret av HF-U23, HF-U25, HF-U26 | nevnes bare | – |
| OV-U43, OV-U56, MM-U21 | – | OV-U43 samlet i OV-U94, MM-U45 og OV-U89; OV-U56 beslutning uten rest her; MM-U21 opphevet av MM-U41 og MM-U52 | nevnes bare | – |

## Forslaget

Samlevedtaket er et *vedtak* med designdel og beslutningsdel. Kildene står i parentes etter hver
setning; «s» er setningen i posten. Der en regel har et annet gjeldende hjem, viser punktet dit i
stedet for å gjengi den.

### A. Hva en kravversjon er

1. Hvert krav TE sender i et spor, er en kravversjon. Hver oppdatering av kravet er en ny
   kravversjon, også når verdiene er uendret. Det gjelder grunnlag, vederlag og frist. (rad-002 s1;
   GR-U1 s1; KA-U2)
2. Disse brevene er ikke kravversjoner: et frittstående varsel, et trekk og byggherrens innsigelse
   eller forespørsel (KA-U2); en korrigering av en faktisk opplysning TE har oppgitt i kravet
   (MM-U52 punkt 13); en retting etter MM-U52 punkt 8, 12 eller 18, og brevet der TE endrer sin
   opplysning om når pålegget ble mottatt eller TE ble klar over forholdet (MM-U52 punkt 10); og
   et innlegg, også TEs utdyping av et krav (MM-U34 punkt 24; MM-U52 punkt 15). TE kan likevel
   sende en ny kravversjon i stedet for en korrigering (MM-U52 punkt 13; MM-U34 punkt 1). I et krav
   om regningsarbeid gjelder OV-U94 punkt 2 og 9.

### B. Hva en ny kravversjon gjør

3. Sender TE en ny kravversjon, venter sporet på nytt svar, og byggherrens svar på den tidligere
   versjonen kan ikke godtas i løsningen. Regelen står i HF-U23 punkt 9. (rad-001 s1–s2; rad-002
   s2; E1, E6)
4. Brevet sier: ‹Dette kravet erstatter TEs tidligere kravversjon i brev <n> av <dato>.› Har
   byggherren svart på den tidligere versjonen, legger brevet til: ‹TEs standpunkt til BHs
   tidligere svar fremgår av begrunnelsen.› Tidligere brev bevares uendret. Teksten gjelder bare
   brev som sendes etter vedtaket (MM-U9). (MM-U34 punkt 1; E3)
5. En registrert enighet bevares. Det gjelder også en aksept TE har gitt av svaret på den
   tidligere versjonen, fordi aksepten er en registrert enighet. Utenom sperrene i punkt 6 kan TE
   sende en ny kravversjon og byggherren et nytt svar også i et spor med registrert enighet, og
   løsningen avgjør ikke om enigheten står. (MM-U34 punkt 9; HF-U9 s1 slik MM-U34 punkt 10 endret
   den; MM-U50 punkt 13; MM-U43 punkt 7; OV-U94 punkt 16; E1, E5) *Hva en ny kravversjon gjør med
   byggherrens aksept av en retting av varseldatoen, avgjøres i spørsmål 2.*
6. At kravene i saken er avgjort, sperrer ikke en ny kravversjon (MM-U34 punkt 12; MM-U43 punkt
   7). Sperrene står andre steder: for en sak lukket etter GR-U27 i GR-U27 og MM-U43 punkt 6, for et
   krav TE har trukket i KA-U51 punkt 11, og for en KOE-sak som en sendt endringsordre eller en
   godkjent registrering av en endringsordre omfatter, i EO-U38 punkt 12. (E4, E5)
7. I et spor der TE ikke har sendt et krav, går TEs første krav i samme sak, unntatt der punkt 6
   sperrer. (OV-U3; HF-U9 s8; EO-U38 punkt 12)
8. Hever TE kravet i en ny kravversjon før byggherren har svart, svarer byggherren bare på
   gjeldende kravversjon, og løsningen avgjør ikke om den tidligere kravversjonen binder TE.
   (KA-U40)

### C. Det som står mot en ny kravversjon

9. En innsigelse byggherren har fremsatt, bevares som påberopelse med tidspunktet (VS-U46 punkt
   6), uten at løsningen avgjør om den er virksom. Om den står mot en ny versjon, avgjøres i
   VS-U46 (punkt 7 og E2 der). Et frafall står (GR-U20). (OV-U54; E3)
10. Et uttrykkelig standpunkt om at et varsel kom i tide, står mot hver senere kravversjon etter
    VS-U46 punkt 8 og 13. En ny grunnlagsversjon kan ikke endre datoen TE har oppgitt etter VS-U26,
    eller hjemmelen, etter MM-U52 punkt 10 og 14.

### Beslutningsdel

- At et svar på en tidligere versjon ikke kan godtas (punkt 3), er en begrensning i løsningen, ikke
  en tolkning av kontrakten (HF-U23 punkt 9; MM-U34 punkt 16). Løsningen og godkjenningsflyten
  bruker definisjonen i punkt 1 og 2; KA-U2 viser hvilke hendelser i Python-stien det gjelder.

### Designdel

- Visningen viser at det nye avviker fra den registrerte enigheten (MM-U34 punkt 9).
- Påminnelsen i skjemaet før en ny kravversjon står i HF-U23 punkt 10, og anbefalingen av
  korrigeringen i MM-U52.
- Om skjemaet lar TE velge mellom en utdyping og en ny kravversjon, avgjøres i brukerforløpet.

## Endret innhold

- **E1.** Rad-001 s2: «Det venter på nytt svar, og en aksept av forrige svar faller.» Leddet «og en
  aksept av forrige svar faller» gjelder ikke: etter MM-U34 punkt 9 bevares en registrert enighet,
  og en aksept TE har gitt, er en registrert enighet (HF-U9 slik MM-U34 punkt 10 endret den;
  MM-U50 punkt 13; KA-U51 E2 leser det likt). At svaret på den tidligere versjonen ikke kan godtas
  etter en ny versjon, står i punkt 3. Rad-001 s3 gjelder alt ikke etter HF-U25 E2.
- **E2.** Rad-002: avgrensningen etter KA-U3 («gjelder til saken er `OMFORENT`») og endringen etter
  KA-U7 («i et spor med enighet avvises oppdateringen») gjelder ikke; de to vedtakene er opphevet,
  og punkt 5 og 6 gjelder. Innsnevringen etter OV-U54 (en ny kravversjon som bare retter en
  opplysning, avvises) er opphevet av MM-U34 punkt 1.
- **E3.** OV-U54: setningene fra «I løsningen er en ny kravversjon TEs avslag …» til «Det gjelder
  også når TE bare endrer en opplysning.», «Avslaget gjelder tilbudet i svaret i samme spor; en ny
  grunnlagsversjon avslår ikke svarene på vederlag og frist (HF-U21).» og «Endrer HF-U8 og
  presiserer HF-U5: bortfallet av et tilbud som fortsatt binder byggherren, følger av avslaget i
  brevet.» gjelder ikke. MM-U34 punkt 1 ga ny ordlyd (punkt 4), og HF-U23 har tatt akseptfristen.
  «Skjemaet sier også at et uttrykkelig standpunkt om at et varsel kom i tide, og et avkall, står
  (HF-U4, HF-U8).» falt alt med MM-U41 E2, som MM-U52 fører videre. Korrigeringen står i MM-U52
  punkt 13, og «En ny kravversjon som bare retter en slik opplysning, avvises, og TE sender
  korrigeringen i stedet.» er opphevet av MM-U34 punkt 1. Det som står, er punkt 9.
- **E4.** OV-U55: «sperrene etter enighet (KA-U7, OV-U3)» og «En enighet i saken står (KA-U7).»
  leses etter punkt 5 og 6: enighet og avgjorte krav sperrer ikke en ny grunnlagsversjon, sperrene
  er de punkt 6 viser til, og en registrert enighet bevares.
- **E5.** KA-U3 og KA-U7 er opphevet. Samlevedtaket tar det som gjelder om ny kravversjon i et
  spor med enighet og etter at kravene er avgjort (punkt 5 og 6), og henvisningene til KA-U3 og
  KA-U7 gjelder samlevedtaket. Unntaket er KA-U13 s5, der KA-U51 E4 viser henvisningen til punkt 3
  i samlevedtaket for trekk.
- **E6.** GR-U1 s2: «Svaret på forrige versjon faller i tilstanden og står i journalen, grunnlaget
  venter på nytt svar, og en aksept av forrige svar avvises (KA-U1).» Leddet «Svaret på forrige
  versjon faller i tilstanden» gjelder ikke. Etter HF-U23
  punkt 9 (fra MM-U34 punkt 2) kan svaret ikke godtas i løsningen, og løsningen sier ikke at det
  har falt bort.

## Valgt avgrensning

- **De fem forholdene mot KA-U3 og KA-U7** (`hf-u9`, `ov-u3`, `ka-u20`, `ov-u43`, `ka-u13`)
  forsvinner fra `KJENTE_FORHOLD_TIL_OPPHEVET` når samlevedtaket opphever KA-U3 og KA-U7 (E5):
  forholdet leses da som et forhold til samlevedtaket (README, «Et gjeldende vedtak presiserer …»).
  Det er prøvd i minnet mot `forhold_til_opphevet`, ikke kjørt.
- **De fem radene fra MM-U34 og raden `ov-u43 presiserer mm-u28` tas ikke her.** Målene (KA-U26,
  KA-U28, OV-U48, OV-U49, OV-U51, MM-U28) er opphevet av poster som ikke er samlevedtak, så et
  samlevedtak som samler MM-U34 eller OV-U43, fjerner dem ikke. De hører til kjedene om vilkår og
  forbehold, varslingsdatoen, betegnelsene og «kravene er avgjort». `mm-u34 endrer ka-u28` hører
  til den siste, som ikke er samlet. Samlevedtaket her tar bare sperren mot ny kravversjon i MM-U34
  punkt 12, så raden venter på den kjeden.

## Funn som ikke avgjøres her

- **Ny grunnlagsversjon og svarene i vederlag og frist** (HF-U5, HF-U21, GR-U19, GR-U22) hører til
  grunnlagskjeden. GR-U19 («underkategorien kan bare endres når § 32.2 gjelder likt») og låsen i
  MM-U52 punkt 14 kan stride; det prøves der.
- **KA-U40 viser til MM-U12**, som MM-U50 har opphevet. Punkt 8 tar innholdet uten henvisningen.
- **KA-U2 lister hendelsesnavn fra Python-stien.** Den er en beslutning, og navnene velges på nytt
  etter B-17. Punkt 2 gjør definisjonen uavhengig av navnene.

## Klassene

En subagent klassifiserte postene og forslaget fra teksten før den så klassekolonnen (svar 8). Den
er enig i klassene for rad-001, rad-002, KA-U40, OV-U54, OV-U55 og KA-U2, og i at forslaget er
vedtak med designdel og beslutningsdel. Den fant fire feil i fordelingen av punktene, som er rettet:

- Punkt 3 hadde begrensningen i løsningen både i regelpunktet og i beslutningsdelen; punkt 3 viser
  nå til HF-U23 punkt 9.
- Punkt 2 og beslutningsdelen ga definisjonen to hjem; punkt 1 og 2 er nå definisjonen, og KA-U2
  viser hendelsene.
- Setningen om visningen i punkt 5 står nå i designdelen.
- Punkt 6 gjengav EO-U38 punkt 12 og viser nå dit.

Klassene til de gamle postene endres ikke her.

## Prøvingen

En annen subagent prøvde forslaget én gang mot vedtaksfila 05.11 (vedtaksskillen, «Prøv hvert
alternativ …»). Rettet etter prøvingen:

- Punkt 10 tok inn igjen «… og et avkall, står», som falt med MM-U41 E2. Punkt 10 viser nå bare til
  VS-U46 punkt 8 og 13, og E3 viser til MM-U41 E2.
- Punkt 5–7 manglet sperrene etter GR-U27 og trekk, og «en godkjent registrering» fra EO-U38 punkt
  12. Sperrene står nå i punkt 6, og punkt 5 og 7 viser dit.
- Leddet i GR-U1 s2 «Svaret på forrige versjon faller i tilstanden» strider mot HF-U23 punkt 9 og er nå E6.
- Punkt 1 gjorde det første kravet til en «ny» versjon; det skiller nå kravversjon og ny
  kravversjon.
- Punkt 2 viste til OV-U94 punkt 2 for overslag og varsel, som står i punkt 9 der, og manglet
  rettingene etter MM-U52 punkt 8, 12 og 18.
- Punkt 9 viser til VS-U46 punkt 6 i stedet for VS-U9, som er samlet der.
- Punkt 4 manglet vilkåret «Teksten gjelder bare brev som sendes etter vedtaket (MM-U9)».
- Designdelen og punkt 3 og 5 viser til HF-U23, MM-U52 og OV-U94 der regelen alt har et hjem.

E1, E2 og E5 holdt. Prøvingen fant ingen motstrid med MM-U10, MM-U33, OV-U90, OV-U91, GR-U20 eller
GR-U23. KA-U8 (0 dager eller 0 kr) hører til kjeden om «ingen krav».

Spørsmål 2 og de rettede punktene er prøvd én gang til; se «Prøvingen av spørsmål 2».

## Spørsmålene til oppdragsgiver

Spørsmål 1 er en tilslutning til innhold du alt har vedtatt, og stilles i tekst. Spørsmål 2
gjelder en virkning ingen post sier noe om. Svar for eksempel «1 A, 2 A».

**1. Tilslutning til samlevedtaket for kravversjon.**

*Bakgrunn:* Reglene om kravversjon står i flere vedtak fra 05.10 til 26.10. Vedtaket 28.10 om
registrert enighet endret dem, men to opphevede vedtak (at en ny kravversjon avvises etter at saken
er omforent, og at en enighet binder begge parter slik at en ny kravversjon i et spor med enighet
avvises) bærer fortsatt fem forhold i registeret, og vedtaket 05.10 sier fortsatt at en aksept av
forrige svar faller når totalentreprenøren sender et oppdatert krav.

*Belegg:* forslaget over, punkt 1–10 med beslutningsdelen og designdelen, og E1–E6. Punktene er
vedtatt innhold med henvisningene skrevet om. E1–E6 tar bort setninger som senere vedtak alt har
gjort uvirksomme.

- **A (anbefalt):** «Samlevedtaket for kravversjon gjelder med E1–E6. Det opphever vedtaket om at
  en ny kravversjon avvises etter at saken er omforent, og vedtaket om at en enighet binder begge
  parter og at en ny kravversjon i et spor med enighet avvises; henvisningene til dem gjelder
  samlevedtaket, unntatt der samlevedtaket for trekk viser henvisningen til sitt punkt 3. Vedtakene
  om at et oppdatert krav åpner sporet igjen, om at hver oppdatering er en ny kravversjon, om en
  hevet kravversjon før byggherren har svart, og om en ny kravversjon som avslag på byggherrens
  tilbud, gjelder som «Samlet i samlevedtaket for kravversjon». Det samme gjelder punkt 1 og 9,
  strykningen i punkt 10 og sperren mot ny kravversjon i punkt 12 i vedtaket 28.10 om registrert
  enighet. I vedtaket om en utdypende begrunnelse og en ny grunnlagsversjon med samme hjemmel og i
  vedtaket om at en ny grunnlagsversjon åpner sporet, gjelder de setningene E4 og E6 navngir, ikke
  lenger.»
- **B:** Samme som A, med rettelsene du gir per punkt eller E-punkt.

*Anbefaling:* A. Innholdet er det du alt har vedtatt, og E-punktene følger av senere vedtak.

*Hva valget styrer:* hvilken tekst som er regelgrunnlaget for kravversjon i KOE-sakene, og at
`KJENTE_FORHOLD_TIL_OPPHEVET` mister de fem radene mot de to opphevede vedtakene. Etter Følge i
vedtaket 08.10 om aksepten er det bygget at en ny kravversjon opphever en aksept (SK-02); etter E1
fjernes den virkningen fra koden.

*Forholdet:* samler rad-001, rad-002, KA-U40, OV-U54 og MM-U34 (punkt 1, 9, 10 og 12, så langt de
gjelder ny kravversjon); opphever KA-U3 og KA-U7 (E5); endrer OV-U55 (E4) og GR-U1 (E6).

*Klassen:* vedtak med designdel og beslutningsdel.

**2. Om en ny kravversjon tar bort byggherrens aksept av en retting av varseldatoen.**

*Bakgrunn:* Samlevedtaket for retting av sendt brev (05.11) lar byggherren godta
totalentreprenørens retting til en tidligere varseldato i et svar i sporet. Ingen post sier hva som
skjer med den aksepten når totalentreprenøren deretter sender en ny kravversjon. Etter punkt 3 over
kan totalentreprenøren da ikke lenger godta svaret aksepten står i. Orkestratoren behandlet det som
en følge av punkt 19 i samlevedtaket for retting, men det er ikke bekreftet av deg.

*Belegg:* Samlevedtaket for retting av sendt brev, punkt 19: «Datoen som gjelder, er datoen i den
rettingen som sist begynte å gjelde, enten straks fordi den var til en senere dag, eller da
byggherren godtok den; uten en slik retting er det datoen totalentreprenøren først oppga.» Punkt 20:
«Et nytt svar etter punkt 6 tar ikke bort en aksept i svaret det erstatter.» Punkt 10: «En ny
grunnlagsversjon kan ikke endre datoen. Den gjengir totalentreprenørens siste opplysning, med
henvisning til brevet med korrigeringen, og endrer ikke tidligere brev eller premissene i tidligere
svar.» Punkt 10 og 20 endres ikke av noen av alternativene.

- **A (anbefalt):** «Sender totalentreprenøren en ny kravversjon etter at byggherren i et svar har
  godtatt totalentreprenørens retting til en tidligere varseldato, står aksepten av rettingen, og
  datoen i rettingen gjelder fortsatt etter punkt 19 i samlevedtaket for retting av sendt brev. At
  svaret på den tidligere versjonen ikke kan godtas i løsningen, gjelder standpunktene i svaret og
  ikke aksepten av rettingen.»
- **B:** «Sender totalentreprenøren en ny kravversjon, faller byggherrens aksept av rettingen
  sammen med svaret den sto i, og datoen som gjaldt før aksepten, gjelder igjen til byggherren
  godtar rettingen i et svar på den nye versjonen.»

*Anbefaling:* A. Aksepten er byggherrens svar på totalentreprenørens tilbud om å rette datoen, ikke
en del av byggherrens tilbud som den nye versjonen erstatter. Punkt 19 regner datoen fra aksepten,
punkt 20 lar et nytt svar ikke ta bort aksepten, og punkt 10 sier at en ny grunnlagsversjon ikke kan
endre datoen. B lar byggherren komme fra en aksept fordi totalentreprenøren sender en ny versjon av
et annet standpunkt, og gjør punkt 10 uklart.

*Hva valget styrer:* punkt 5 i samlevedtaket (setningen i kursiv erstattes av det valgte), og
hvilken dato kjernen regner som gjeldende etter en ny kravversjon i #1309.

*Forholdet:* A presiserer samlevedtaket for retting av sendt brev, punkt 19 og 20. B endrer punkt 19
der for en ny kravversjon.

*Klassen:* vedtak.

## Svarene

*Føres når oppdragsgiver har svart.*

## Verifikasjon og grenser

Lest ut av vedtaksfila og `vedtak.toml` på `main` (`27f8bab`), vurderingsfilene for KA-U51, OV-U94,
MM-U52, kjente avvik og klassifiseringen. `python3 docs/verktoy/vedtaksregister.py --sjekk` er grønn
på `main`. Ingen kode er kjørt utover det.
