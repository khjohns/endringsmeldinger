# Samlevedtak: protest, bestridelse og innlegg, og sperren etter enighet

Dato: 04.11.2026. Kontrollert commit: `5e6d91e`. Del av #1534, steg 4, trinn 2 (runde 14 i #1065).

Fila er et forslag til samlet tilslutning til reglene for protest, bestridelse og innlegg, og for
det som er igjen av sperren etter enighet. Hver setning i forslaget viser vedtaket og eventuelt
setningen den kommer fra. «s3» betyr den tredje setningen i vedtaksteksten i
[`vedtak.md`](../plans/vedtak.md) på commiten over, med «Forkastet» utenfor tellingen. Det som
endrer innholdet i en eldre post, også en motsigelse forslaget løser, står i «Endret innhold»
(E1–E6), og oppdragsgiver tar stilling til hvert punkt. Spørsmålene står ordrett slik de sendes,
og svarene føres inn her. Forslaget siterer ikke NS 8407.

Kjeden i [klassifiseringen](vurdering-klassifisering-2026-11-03.md#kjedene) har 14 poster: KA-U29,
MM-U7, MM-U14, MM-U34, MM-U35, MP-U4, MP-U6, OV-U7, OV-U64, OV-U65, OV-U66, OV-U67, OV-U68 og VS-U9.
Gjennomgangen bruker også MM-U33, VS-U35, KA-U1, GR-U27, EO-U34 og LV-U53 som kilder.

## Det kartleggingen fant

Klassifiseringen sier: «OV-U64–OV-U66 er opphevet av MM-U34, mens OV-U67 og OV-U68, som presiserer
dem, står, og bestridelsen er gjort til et innlegg av MM-U34 punkt 24 og MM-U35.» Gjennomgangen
fant dette:

- **Sperren etter enighet er opphevet, men presiseringene står.** MM-U34 punkt 13: «Sperren mot
  protest, innsigelse, bestridelse, påberopt passivitet og merking mot det en enighet omfatter,
  oppheves.» OV-U67 punkt 1 s2 («En innsigelse mot det gjeldende kravet etter at partene er enige,
  avvises.»), punkt 3 og punkt 4 presiserer den opphevede sperren og står likevel. Det samme gjør
  OV-U68 s3 («En innsigelse mot den kravversjonen følger de vanlige reglene.»), som bare har
  mening når en sperre finnes. Punkt 2 i OV-U67, om hva en enighet omfatter, har ingen leser etter
  at sperren er opphevet. Det som binder, følger av KA-U1. Spørsmål 2 avgjør det.
- **Protest og bestridelse: innlegg for godt eller utsatt?** MM-U34 punkt 24 (28.10): «OV-U64,
  regelen om hva en protest gjelder, og protestformene oppheves. TEs utdyping, byggherrens senere
  begrunnelse og bestridelsen av en opplysning blir innlegg.» MM-U33 steg 3: «Løsningen har ingen
  egne prosesser for ulike typer innsigelser og protester, og ingen egen modell for subsidiær
  aksept.» De senere vedtakene sier «i første versjon». MM-U35 s1 (01.11) har «I første versjon
  sender en part …», og VS-U35 s2 (01.11) sier: «Påberopelsen av passivitet og bestridelsen av en
  opplysning er fortsatt utsatt (OV-U7).» OV-U7 sier om bestridelse og protest: «Vedtakene står og
  bygges senere». Spørsmål 1 avgjør det.
- **Protestregelen.** MM-U34 punkt 24 opphevet «regelen om hva en protest gjelder». VS-U9 s4 («Regelen
  fra metodeprøven om hva en protest gjelder (MP-U6), tas inn i appen.») står i Følge bare som
  endret. MP-U4 og MP-U6 er vedtak for metodeprøven («Gjelder prøven.» og «Avgrenset til prøven»
  i Følge). E2 avgjør det.
- **KA-U29** viser til «de samme utsagnene som når kravene er avgjort». Etter MM-U34 punkt 12 har
  «kravene er avgjort» ingen sperre. GR-U27 gjelder lukkingen etter et godtatt avslag: «Innlegg og
  dokumentasjon kan fortsatt legges til.» E3 avgjør det.
- **MM-U7 s3** («At saken er avsluttet, sperrer kommandoer som kan endre utfallet, ikke partenes
  standpunkt til en opplysning.») står nå i EO-U34 punkt 12, med «avsluttet» lest som «lukket med
  endringsordre» (MM-U34 punkt 12). E5.

**Koden**, lest av en subagent 04.11 på `5e6d91e` (`kjerne/`, `server/`, `src/`):

- Sperren etter enighet er ikke bygget. OV-U64–OV-U68 har ingen treff i koden. Ingen kode regner ut
  hva en enighet omfatter. `kjerne/kommandoer/forutsetninger.ts:76-79` sier at innsigelsen godtas
  «mot det en registrert enighet omfatter (MM-U34 punkt 13)».
- Innlegget er ikke bygget. Det finnes ingen kommandotype for innlegg (`kjerne/kommandoer/kommando.ts`).
  Det bygges i #1377.
- Protest, bestridelse og påberopt passivitet avvises fra appen med `IKKE_I_FOERSTE_VERSJON`
  (`forutsetninger.ts:111-123`), med henvisning til OV-U7.
- Protestregelen etter MP-U6 er bygget for registrerte brev: `kanFaaProtest`
  (`kjerne/utledning/utled.ts:139-152`), brukt av `kanGjelde` (`utled.ts:935-936`). Protestene samles
  uten virkning på utfallet (`utled.ts:199-200`). Regelen strider mot MM-U34 punkt 24 (E2).
- Etter et godtatt avslag av grunnlaget godtas innsigelsen, og andre kommandoer avvises med
  `FORHOLD_AVVIST` (`forutsetninger.ts:166-169`).
- En sak som ikke er forstått, avviser alle kommandoer unntatt `registrere_brev`
  (`forutsetninger.ts:158-163`).

## Overlapp med andre samlevedtak i arbeid

Kontrollert 04.11 mot #1572 (saker løsningen ikke forstår), #1573 (revisjon av byggherrens svar),
#1575 (særskilt varsel) og #1578 (vilkår og forbehold), og mot de mergede samlevedtakene EO-U34,
KA-U46, MM-U41 og HF-U23. Fordelingen er meldt til orkestratoren og står under «Fordelingen».

- **KA-U29**: #1578 har «og merking etter KA-U20» (E6 der).
- **MM-U14 og MM-U35**: #1572 snevrer inn MM-U14, og MM-U44 i #1572 utvider MM-U35 til en sak
  løsningen ikke forstår. Her er MM-U14 bare kilde, og punkt 5 viser til samlevedtaket der.
- **MM-U34 punkt 19** er samlet i EO-U34 punkt 12. Her er det bare kilde. Punkt 9, 11 og 24 er
  kilder i #1573, #1575, KA-U46 og MM-U41. Ingen av dem samler punkt 24.
- **VS-U9** står også i kjeden «Påberopelse av sent varsel, ‹i tide› og innsigelsen etter punkt 5».
  Her tas bare s4. Resten er kilde.
- **OV-U7**: merkingen hører til #1578, KA-U34–KA-U39 til KA-U46, og innsigelsen som eget brev til
  påberopelseskjeden (VS-U35).

## Postene i kjeden

«Samler»: regelen står i samlevedtaket med uendret innhold, og den gamle ID-en gjelder fortsatt
som «Samlet i samlevedtaket for protest og innlegg». «Opphever»: samlevedtaket løser en motsigelse
og endrer innholdet i hele posten, og posten gjelder ikke lenger. «Endrer»: bare de navngitte
setningene eller punktene endres. Resten av posten står, samlet her eller i en annen kjede.
Klassene kontrolleres uavhengig (svar 8); se «Prøvingen».

| Post | Klasse | Status nå | Forhold til samlevedtaket | E-punkt |
| --- | --- | --- | --- | --- |
| MM-U35 | vedtak med designdel og beslutningsdel | gjeldende, presisert av MM-U36, endret av LV-U53 | samler s1–s8; ved spørsmål 1 A endres «I første versjon» i s1 for protest og bestridelse | E1 |
| MM-U7 | vedtak | gjeldende, endret av MM-U34 | samler s1–s2; s3 er samlet i EO-U34 punkt 12 | E1, E5 |
| KA-U29 | vedtak | gjeldende, endret av MM-U35, snevret inn av KA-U45 | endrer: setningene om bestridelse, innsigelse, protest og påberopt passivitet (s1–s2) gjelder som innlegg; merkingen hører til #1578; s3 hører til kjeden «Kravene er avgjort, og sperren etter det» | E3 |
| MM-U34 | vedtak med designdel og beslutningsdel | gjeldende | endrer: samler punkt 13 og 24, delen om OV-U7 i siste kulepunkt i punkt 15 og lesingen av «Saken er avsluttet» i MM-U7 i punkt 12; resten hører til andre kjeder | E6 |
| OV-U67 | vedtak | gjeldende, endret av MM-U34 | opphever ved spørsmål 2 A; ved B samles punkt 1 s1 og punkt 2, og punkt 1 s2, punkt 3 og punkt 4 står opphevet | E4 |
| OV-U68 | vedtak | gjeldende, endret av MM-U34 | opphever ved spørsmål 2 A, og s1 står i designdelen; ved B samles s1–s2, og s3 står opphevet | E4 |
| OV-U7 | beslutning, bindende i VS-U3 | gjeldende | endrer: ved spørsmål 1 A tas bestridelse (MM-U7, MM-U14), protest mot en innsigelse og delene av KA-U29 om bestridelse og protest ut av det som «bygges senere»; resten hører til andre kjeder | E1 |
| VS-U9 | vedtak | gjeldende | endrer: s4 står opphevet; resten hører til påberopelseskjeden | E2 |
| MP-U6 | vedtak | gjeldende, endret av MM-U34 | står for metodeprøven; løsningen anvender den ikke | E2 |
| MP-U4 | vedtak | gjeldende | står for metodeprøven; kilde | E2 |
| OV-U64, OV-U65, OV-U66 | beslutning; vedtak; vedtak | opphevet 28.10 av MM-U34 | står opphevet | – |
| MM-U14 | vedtak | gjeldende; snevres inn i #1572 | står; hører til #1572 | – |
| MM-U33, VS-U35, KA-U1, GR-U27, EO-U34, LV-U53, MM-U36 | – | gjeldende | står; kilder og belegg | – |

## Forslaget

Samlevedtaket for protest, bestridelse og innlegg. Hver setning har kilden i parentes.
Samlevedtaket er et *vedtak* med designdel og beslutningsdel. Punkt 1 og 8 står etter svaret på
spørsmål 1, og punkt 12 etter svaret på spørsmål 2.

### A. Innlegget

1. Protest mot en innsigelse og bestridelse av en opplysning sendes som innlegg i fritekst.
   (MM-U35 s1; MM-U34 punkt 24) *Ved spørsmål 1 A står ordlyden i alternativ A her.*
2. Innlegget viser til ett brev i saken, også et brev som er registrert i løsningen. (MM-U35 s2)
3. Det sendes som brev på den kanalen partene har avtalt, som de andre brevene fra løsningen.
   (MM-U35 s3)
4. Løsningen tolker ikke innlegget og endrer ikke utfallet eller et standpunkt på grunnlag av det.
   (MM-U35 s5; MM-U33 steg 3)
5. Innlegget sperrer ingenting og kan sendes etter et svar, en enighet og en endringsordre.
   (MM-U35 s6; EO-U34 punkt 12) I en sak løsningen ikke forstår, gjelder samlevedtaket for saker
   løsningen ikke forstår. (MM-U44 i #1572)
6. Løsningen avgjør ikke om innlegget kom i tide eller hvilken virkning det har. (MM-U35 s7)
7. Påberopelsen i et svar av at et varsel kom for sent etter en bestemmelse, står som standpunkt i
   svaret, og løsningen utleder virkningen av den som før. (MM-U35 s8; VS-U9 s1)

### B. Protest og bestridelse

8. Løsningen har ingen egen handling for protest mot en innsigelse. Den avgjør ikke hvilke
   innsigelser en protest gjelder, om protesten er berettiget, eller om den opphever innsigelsen.
   (MM-U33 steg 3; MM-U34 punkt 24; MM-U35 s5 og s7; E2)
9. En part kan bestride en opplysning fra motparten, for eksempel at et varsel ble mottatt, også
   etter at saken er lukket med endringsordre. (MM-U7 s1; MM-U34 punkt 12) Bestridelsen
   registreres uten virkning på utfallet. (MM-U7 s2; MM-U34 punkt 24)
10. Har TE godtatt byggherrens avslag av grunnlaget, kan partene fortsatt sende innlegg, også med
    innsigelse, protest, påberopt passivitet og bestridelse av en opplysning. De registreres og
    vises uten virkning på utfallet i løsningen. (KA-U29 s1–s2; GR-U27 s3; E3)
11. Metodeprøvens regler om protest (MP-U4 og MP-U6) gjelder prøven. Løsningen anvender dem ikke på
    en protest i et innlegg. (MP-U4, Følge; MP-U6, Følge; MM-U34 punkt 24; E2)

### C. Enigheten

12. En registrert enighet sperrer ikke innlegg, innsigelse, protest, bestridelse eller påberopt
    passivitet. (MM-U34 punkt 13; MM-U35 s6) Løsningen avgjør ikke om et slikt utsagn er virksomt
    mot enigheten (MM-U12). (MM-U33 s4; E4) *Ved spørsmål 2 B kommer setningene i alternativ B
    til.*

### Designdel

- Innlegget har en tittel parten skriver. Brevet har tittelen som overskrift og sier ‹<Part> viser
  til brev <merking> av <dato>:›, og teksten følger. (MM-U35 s2 og s4; LV-U53 s1)
- Skjemaet for svar og aksept viser innleggene fra begge parter som viser til brevene. (MM-U36 s1,
  flyttet til BF-01 U-11)
- Byggherrens uttrykkelige standpunkt i et tidligere svar om at varselet kom i tide, bevares og
  vises med enigheten. (OV-U68 s1 slik MM-U34 punkt 13 endret den; E4)

### Beslutningsdel

- I første versjon sendes også innsigelsen etter punkt 5 tredje ledd som eget brev og påberopelsen
  av passivitet etter punkt 32.3 annet ledd som innlegg. (MM-U35 s1; VS-U35 s1–s3) Når de bygges,
  hører til kjeden for påberopelse av sent varsel og innsigelsen etter punkt 5.
- Det en part sender fra appen, står som partens utsagn. (MM-U34 punkt 15, siste kulepunkt, om
  OV-U7)

## Endret innhold

**E1. Protest og bestridelse er innlegg, ikke utsatt (spørsmål 1).** MM-U34 punkt 24 gjorde dem
til innlegg uten forbehold, mens MM-U35 s1, VS-U35 s2 og OV-U7 sier «i første versjon» og «bygges
senere». Ved spørsmål 1 A tas bestridelse (MM-U7, MM-U14), protest mot en innsigelse (protesten i
VS-U1 og protestregelen i VS-U9) og delene av KA-U29 om bestridelse og protest ut av lista i OV-U7
over det som bygges senere. I MM-U35 s1 og VS-U35 s2 gjelder «i første versjon» og «fortsatt
utsatt» da bare innsigelsen som eget brev og påberopelsen av passivitet. Ved B står OV-U7, MM-U35
og VS-U35 som de er, og MM-U34 punkt 24 leses som «i første versjon».

**E2. Protestregelen.** VS-U9 s4 («Regelen fra metodeprøven om hva en protest gjelder (MP-U6), tas
inn i appen.») står opphevet, slik MM-U34 punkt 24 sier. MP-U4 og MP-U6 står som vedtak for
metodeprøven, og løsningen anvender dem ikke (punkt 11). Berørt kode: `kanFaaProtest` i
`kjerne/utledning/utled.ts` leser regelen for registrerte brev og skal fjernes.

**E3. KA-U29 etter at sperren er opphevet.** «De samme utsagnene som når kravene er avgjort» leses
etter MM-U34 punkt 12 ikke som en sperre. Setningene om bestridelse, innsigelse, protest og
påberopt passivitet gjelder som innlegg (punkt 10). s3 («Det som kan endre utfallet, for eksempel
et nytt svar som endrer et standpunkt, avvises fortsatt») og lukkingen etter et godtatt avslag
hører til kjeden «Kravene er avgjort, og sperren etter det» (GR-U27).

**E4. Det som står igjen av sperren etter enighet (spørsmål 2).** OV-U67 punkt 1 s2, punkt 3 og
punkt 4 og OV-U68 s3 presiserer sperren MM-U34 punkt 13 opphevet, og står opphevet med den. Ved
spørsmål 2 A oppheves OV-U67 og OV-U68 helt: det TE godtar ved aksept, følger KA-U1, og OV-U68 s1
står i designdelen. Ved B samles OV-U67 punkt 1 s1 og punkt 2 og OV-U68 s1–s2 som regelen for hva
en enighet omfatter.

**E5. MM-U7 s3.** Sperren ved «avsluttet» står i EO-U34 punkt 12, som gjelder fra endringsordren er
sendt. MM-U7 s3 samles der og ikke her.

**E6. MM-U34.** Punkt 13 og 24, delen om OV-U7 i siste kulepunkt i punkt 15 og lesingen av «Saken
er avsluttet» i MM-U7 i punkt 12 samles her. Resten av MM-U34 hører til andre kjeder etter
fordelingen.

## Fordelingen

Foreslått til orkestratoren 04.11 før forslaget ble skrevet, etter setning:

1. KA-U29: her setningene om bestridelse, innsigelse, protest og påberopt passivitet (s1–s2);
   «og merking etter KA-U20» i #1578; s3 i kjeden «Kravene er avgjort, og sperren etter det».
2. MM-U34: her punkt 13, punkt 24, delen om OV-U7 i siste kulepunkt i punkt 15 og lesingen av MM-U7
   i punkt 12. Punkt 19 er samlet i EO-U34.
3. MM-U14: #1572. Her bare kilde.
4. MM-U35: samles her. Tilfellet «saken er ikke forstått» står i MM-U44 i #1572.
5. VS-U9: her bare s4. Resten i påberopelseskjeden.
6. OV-U7: her bestridelse, protest og delene av KA-U29.

Orkestratoren 04.11, ordrett: «Fordelingen er godtatt slik du foreslo, punkt 1–7. Den er ført i
https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6633691183. En setning som er
gitt til en kjede som ikke er startet, er bare kilde her.» Punkt 7 i meldingen var at OV-U64–OV-U68,
MP-U4 og MP-U6 ikke deler setninger med andre kjeder.

## Prøvingen

*Føres inn når kontrollene er gjort: kilden for hver setning, alternativene mot vedtaksfila,
påstandene om koden og klassene etter testen i vedtaksskillen.*

Forløp: ingen av spørsmålene endrer hva en bruker gjør i appen. Med begge alternativene i spørsmål
1 sendes protest og bestridelse som innlegg i første versjon. Spørsmål 2 endrer ikke det TE godtar
ved aksept (KA-U1). Arbeidsflyten er derfor ikke prøvd med forløp.

## Spørsmålene til oppdragsgiver

Ordrett slik de sendes. Spørsmål 2 er juridisk og stilles i tekst.

**1. Protest og bestridelse etter første versjon (beslutning).**
Bakgrunn: Et vedtak fra 28.10 gjorde protest mot en innsigelse og bestridelse av en opplysning
til innlegg i fritekst og opphevet protestformene og regelen om hva en protest gjelder. Senere
vedtak fra 01.11 sier at partene sender dem som innlegg «i første versjon», og at bestridelsen er
«fortsatt utsatt». Avgrensningen for første versjon sier at de «står og bygges senere». Med begge
alternativene sendes de som innlegg nå, og løsningen tolker dem ikke.
Belegg: MM-U34 punkt 24 «OV-U64, regelen om hva en protest gjelder, og protestformene oppheves.
TEs utdyping, byggherrens senere begrunnelse og bestridelsen av en opplysning blir innlegg.»;
MM-U33 steg 3 «Løsningen har ingen egne prosesser for ulike typer innsigelser og protester, og
ingen egen modell for subsidiær aksept.»; MM-U35 «I første versjon sender en part innsigelse etter
punkt 5 tredje ledd, protest mot en innsigelse, påberopelse av passivitet etter punkt 32.3 annet
ledd og bestridelse av en opplysning som innlegg i fritekst.»; VS-U35 «Påberopelsen av passivitet
og bestridelsen av en opplysning er fortsatt utsatt (OV-U7).»; OV-U7 «Vedtakene står og bygges
senere; avgrensningen gjelder rekkefølgen, som i OV-U1.»
- **A (anbefalt):** «Protest mot en innsigelse og bestridelse av en opplysning sendes som innlegg
  i fritekst, også etter første versjon. Løsningen har ingen egen handling for dem. Forhold: samler
  MM-U34 punkt 24; endrer OV-U7 (bestridelse, protest mot en innsigelse og delene av KA-U29 om dem
  tas ut av det som bygges senere), MM-U35 s1 og VS-U35 s2 («i første versjon» og «fortsatt
  utsatt» gjelder bare innsigelsen som eget brev og påberopelsen av passivitet); i tråd med MM-U33
  steg 3.»
- **B:** «Protest mot en innsigelse og bestridelse av en opplysning sendes som innlegg i første
  versjon. De står som egne utsagn uten virkning på utfallet og bygges senere. Forhold: presiserer
  MM-U34 punkt 24 (gjelder første versjon); samler OV-U7, MM-U35 s1 og VS-U35 s2.»
Anbefaling: A. MM-U33 sier at løsningen ikke har egne prosesser for protester, og protestformene og
protestregelen er opphevet. Med B ville et senere eget utsagn for protest trenge regler som er
opphevet, og MM-U7 og KA-U29 gir bestridelsen ingen virkning på utfallet. Ingen part mister en
mulighet med A, fordi innlegget kan sendes når som helst og ikke sperres.
Styrer: om avvisningen i første versjon skal vise til et innlegg for godt, og om kommandoene for
protest og bestridelse fjernes eller står utsatt.

**2. Hva som står igjen av sperren etter enighet (juridisk).**
Bakgrunn: Et vedtak fra 27.10 lot en registrert enighet sperre protest, innsigelse og bestridelse
mot det enigheten omfatter. To vedtak fra 28.10 presiserte hva en enighet omfatter, for å avgrense
sperren. Et vedtak samme dag opphevet sperren, men presiseringene står. En av dem sier fortsatt
at en innsigelse mot det gjeldende kravet etter enigheten avvises. Det totalentreprenøren godtar
ved aksept, er hele det konkrete svaret på gjeldende kravversjon, med alle standpunktene i det.
Belegg: MM-U34 punkt 13 «Sperren mot protest, innsigelse, bestridelse, påberopt passivitet og
merking mot det en enighet omfatter, oppheves.»; OV-U67 «1. En enighet omfatter det gjeldende kravet
i sporet, svaret og standpunktene i svaret. En innsigelse mot det gjeldende kravet etter at partene
er enige, avvises.»; OV-U67 punkt 2 slik MM-U34 punkt 3 endret den, med «Eldre kravversjoner og
svarene på dem omfattes ikke.»; OV-U68 slik MM-U34 punkt 13 endret den: «Byggherrens uttrykkelige
standpunkt i et tidligere svar om at varselet kom i tide, bevares og vises med enigheten.»; KA-U1
«TEs aksept gjelder hele det konkrete svaret byggherren har gitt på gjeldende kravversjon i sporet,
med alle standpunktene i det: preklusjon, vilkår, beløp eller dager og subsidiære standpunkter.»
- **A (anbefalt):** «En registrert enighet sperrer ikke innsigelse, protest, bestridelse eller
  påberopt passivitet, og løsningen avgjør ikke om de er virksomme mot enigheten (MM-U12). Hva TE
  godtar ved aksept, følger KA-U1. Byggherrens uttrykkelige standpunkt i et tidligere svar om at
  varselet kom i tide, bevares og vises med enigheten. Forhold: opphever OV-U67 og OV-U68; samler
  MM-U34 punkt 13; i tråd med KA-U1.»
- **B:** «En registrert enighet sperrer ikke innsigelse, protest, bestridelse eller påberopt
  passivitet, og løsningen avgjør ikke om de er virksomme mot enigheten (MM-U12). En enighet
  omfatter det gjeldende kravet og det gjeldende svaret, med de standpunktene som står mot det
  gjeldende kravet, og varselet og opplysningene et standpunkt om varslingen bygger på. Eldre
  kravversjoner og svarene på dem omfattes ikke. Byggherrens uttrykkelige standpunkt i et tidligere
  svar om at varselet kom i tide, bevares og vises med enigheten. Forhold: samler OV-U67 punkt 1 s1
  og punkt 2 og OV-U68 s1–s2; endrer OV-U67 (punkt 1 s2, punkt 3 og punkt 4 står opphevet) og
  OV-U68 (s3 står opphevet); samler MM-U34 punkt 13.»
Anbefaling: A. Etter at sperren er opphevet, leser ingen regel hva en enighet omfatter, og koden har
ingen slik utregning. Med B har løsningen to beskrivelser av det partene er enige om, KA-U1 og
OV-U67, som kan gli fra hverandre. A endrer ikke hva TE godtar, og ingen part taper en posisjon,
fordi løsningen ikke sperrer noe på grunnlag av enigheten.
Styrer: om registeret har en egen regel for hva en enighet omfatter, og om visningen må regne den ut.

**3. Samlet tilslutning til forslaget (prosess).**
- **A (anbefalt):** forslaget i punkt 1–12 med designdelen og beslutningsdelen, og E1–E6, gjelder
  slik det står, med svarene på spørsmål 1 og 2 og rettelsene oppdragsgiver gir per punkt. De gamle
  ID-ene står som «Samlet i …» eller «Opphevet av …» etter tabellen «Postene i kjeden».
- **B:** forslaget legges fram på nytt etter rettelsene.
Styrer: om en ny økt kan skrive postene når svarene foreligger.

## Svarene

*Føres inn når de foreligger.*
