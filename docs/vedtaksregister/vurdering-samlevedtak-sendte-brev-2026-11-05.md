# Samlevedtak: sendte brev og regelendring

Kartleggingen av kjeden «Sendte brev og regelendring» i steg 4, trinn 2 av
[#1534](https://github.com/khjohns/endringsmeldinger/issues/1534), runde 19 i #1065. Kjeden står i
[klassifiseringen](vurdering-klassifisering-2026-11-03.md) under «Kjedene», med postene GR-U12,
GR-U13, HF-U5, HF-U9, HF-U13, KA-U10, MM-U3, MM-U9, MM-U11, MM-U12, MM-U16, MM-U17 og rad-017
(B-13 regelversjon). Orkestratoren la til MM-U4, MM-U8 og OV-U5 fra motsigelsen under «Motsigelsene
i registeret»: MM-U8 bygger på MM-U4, som MM-U9 opphevet, og OV-U5 endret utfallet i MM-U8. Fasit er
postene i `vedtak.toml` på `main` (`d6b839d`) og svarene i #1534.

Formen følger svar 4, 7, 8 og 10 i #1534: kilde for hver setning, lista «Endret innhold», «samler»
for de gamle ID-ene og en uavhengig kontroll av klassene. Hovedregelen for forhold til opphevede
poster er svaret 05.11 ([6653185302](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6653185302),
punkt 2), og E9 sier om (a) eller (b) gjelder. Den foreløpige ID-en er MM-U50. Den kontrolleres mot
`main` når posten føres.

## Det kartleggingen fant

- **Ingen post i kjeden er samlet eller opphevet**, unntatt MM-U4 (opphevet 09.10 av MM-U9) og
  setningen om det første fristkravet i OV-U5 (samlet 04.11 av VS-U43). Kjernen i temaet står i
  MM-U9, MM-U11, MM-U12 og MM-U17, som er endret av hverandre og av OV-U4.
- **Motsigelsen.** MM-U8 sier at «MM-U4 gjelder også» for en ny opplysning, og at TE ikke kan godta
  svaret før byggherren har svart på nytt. MM-U4 er opphevet, og OV-U5 endret MM-U8 13.10: et svar
  byggherren alt har gitt, står med virkningen det hadde og blir ikke uavklart. Alternativ B i OV-U5,
  «At et varsel registrert etter svaret gjør preklusjonen eller begrensningen uavklart og sperrer TEs
  aksept», er forkastet. Innholdet er altså alt avgjort. Det som gjenstår, er at teksten i MM-U8 og
  forholdet «bygger på MM-U4» fortsatt står (E1).
- **Registrerte brev.** MM-U17 fryser vurderingen etter reglene ved registreringen. OV-U4 sa senere
  at løsningen ikke fryser noen vurdering av et registrert brev, med unntakene i OV-U5 og OV-U6, og
  OV-U80 ga et registrert krav eller svar samme virkning som et sendt (E4).
- **Enigheten.** MM-U34 punkt 10 ga HF-U9 ordlyden «Løsningen registrerer enighet» og tillegget
  «Løsningen avgjør ikke om partene rettslig er enige (MM-U12).» KA-U10 og MM-U3 sier fortsatt
  «enigheten gjelder» uten forbeholdet (E2).
- **«Binder».** HF-U13 første setning sier at det en part har meddelt, «binder slik det sto da det
  ble sendt». Svar 1 A for VS-U46 strøk den tilsvarende setningen i HF-U6, og oppdragsgiver sa 05.11
  at løsningen som hovedregel ikke låser (E3, spørsmål 2).
- **Merknaden 05.10 i rad-017** («regner aldri om») er snevret inn av MM-U9 og presisert av MM-U3 og
  MM-U11. Samlevedtaket sier den slik den gjelder nå (E5).

## Overlapp med andre samlevedtak og kjeder

| Samlevedtak eller kjede | Felles post | Det tar | Her |
| --- | --- | --- | --- |
| VS-U43 (varslingsdatoen) | OV-U5 | setningen om det første fristkravet | setningene om svaret som står, i punkt 21–22; de to samlevedtakene samler ulike setninger i OV-U5 |
| HF-U25 og HF-U26 (revisjon av svaret) | MM-U9, HF-U5, OV-U5 | merknaden om avviket og oppfordringen i MM-U9 og HF-U5 (HF-U25 E4, punkt 9 = HF-U26); setningen om revisjon i OV-U5 (HF-U25 E2) | MM-U9 unntatt merknaden; punkt 24 viser til HF-U25 punkt 1–3 |
| VS-U46 (påberopelse av sent varsel, merget 05.11) | – (HF-U6) | at et utsagn binder parten, strøket i HF-U6 (E8 der, svar 1 A); punkt 20 sier at løsningen ikke avgjør om parten er bundet | punkt 8 sier det samme om HF-U13 etter spørsmål 2 |
| HF-U23 (akseptfristen) | HF-U5 | akseptfristen og aksept etter fristen | ingenting fra HF-U5 |
| MM-U41 (retting av sendt brev) | – (OV-U11, OV-U80) | retting av datoen og at datoen settes én gang | HF-U13 siste setning nevnes bare (E8) |
| MM-U43 (saker løsningen ikke forstår) | – (OV-U4) | OV-U4 | OV-U4 er kilde for punkt 19 |
| Kjeden «Grunnlaget godkjent som endringsordre» (ikke samlet) | GR-U12, GR-U13, MM-U17, OV-U4 | – | bare frysingen av om punkt 32.2 gjaldt (E7) |
| Kjeden «Aksept og enighet om vederlag og frist» (ikke samlet) | HF-U5, HF-U9, KA-U10, MM-U3, MM-U17 | – | innholdet i enigheten og regelendring; resten av HF-U9 står |
| Kjeden «Brev og varsel sendt eller registrert utenfor løsningen» (ikke samlet) | HF-U13, MM-U1, MM-U8, OV-U5, VS-U7 | – | MM-U8 og setningene om svaret i OV-U5; retten til å oppgi datoen (MM-U1, VS-U7, OV-U5) hører dit |

## Postene i kjeden

«Samler»: regelen står i samlevedtaket, og den gamle ID-en gjelder som «Samlet i samlevedtaket for
sendte brev og regelendring». Der bare noen setninger samles, står resten av posten. «Endrer»: noen
setninger får nytt innhold, og resten samles. Kolonnen «Status nå» viser forholdene opphever,
samler og endrer; presiseringer, utvidelser og innsnevringer står i E9.

| Post | Klasse nå | Status nå | Forhold til samlevedtaket | E |
| --- | --- | --- | --- | --- |
| MM-U9 | vedtak med designdel | gjeldende; endret av MM-U17, HF-U25 og HF-U26 | samler, unntatt setningen om merknaden (HF-U25 punkt 9) | E6 |
| MM-U11 | vedtak med beslutningsdel | gjeldende; endret av MM-U17 | samler | – |
| MM-U12 | vedtak | gjeldende; endret av MM-U17 | samler | – |
| MM-U16 | vedtak med designdel og beslutningsdel | gjeldende | samler; første setning blir beslutningsdel | Klassene |
| MM-U17 | vedtak | gjeldende; endret av OV-U4 | samler, slik OV-U4 og OV-U80 endret den | E4 |
| MM-U3 | vedtak | gjeldende | endrer andre setning (ordlyden om enigheten); samler resten | E2 |
| KA-U10 | vedtak med beslutningsdel | gjeldende; endret av MM-U17 | endrer første setning (ordlyden om enigheten); samler resten | E2, Klassene |
| HF-U13 | vedtak med designdel | gjeldende; endret av OV-U80 | første setning etter spørsmål 2; samler andre til femte setning og designdelen; siste setning står | E3, E8 |
| MM-U8 | vedtak | gjeldende; endret av OV-U5; bygger på opphevet MM-U4 | samler, slik OV-U5 endret den; tredje setning endres | E1, E10 |
| GR-U12 | vedtak med designdel | gjeldende; endret av GR-U13, MM-U17, OV-U4 | samler tredje setning | E7 |
| GR-U13 | vedtak | gjeldende; endret av MM-U17, GR-U14, OV-U6 | samler sjette setning | E7 |
| HF-U9 | vedtak | gjeldende; endret av MM-U34 | samler fjerde og femte setning og tillegget fra MM-U34 punkt 10 | E2, E8 |
| OV-U5 | vedtak med designdel | gjeldende; samlet av VS-U43 for én setning; endret av HF-U25, VS-U34, LV-U53 | samler setningene om svaret som står | E1, E8 |
| HF-U5 | vedtak | gjeldende; endret av HF-U21, HF-U23, HF-U25, HF-U26, MM-U34 | nevnes bare | E8 |
| rad-017 | beslutning | gjeldende | samler merknaden 05.10 i Følge; resten står som beslutning | E5 |
| MM-U4 | vedtak | opphevet 09.10 av MM-U9 | står opphevet | E1 |

## Forslaget

Samlevedtaket er et *vedtak* med designdel og beslutningsdel. Kildene står i parentes etter hver
setning; «s» er setningen i posten, talt fra vedtaksteksten etter ID-en, og for en ny post fra det
valgte alternativet.

### A. Det sendte brevet

1. Et sendt brev bevares slik det ble sendt, og beholder virkningen det hadde da det ble sendt.
   (MM-U12 s1; MM-U9 s1)
2. En endring i løsningens regler endrer ikke virkningen av et brev som allerede er sendt: virkningen
   leses fra beslutningsgrunnlaget i brevet, og nye regler gjelder bare nye brev. (MM-U9 s2)
3. Beslutningsgrunnlaget i byggherrens svar fryser hvert standpunkt med virkningen det hadde da
   brevet ble sendt: prinsipalt eller subsidiært, preklusjon, godkjent eller avslått, beløp eller
   dager. Det fryser også om svaret godkjenner hele kravet (sammenfall). (MM-U11 s1–s2)
4. Det fryser også om punkt 32.2 gjaldt for underkategorien da brevet ble sendt, som en del av
   virkningen brevet hadde, med regelversjonen og atskilt fra det byggherren sa. (GR-U12 s3; GR-U13
   s6; E7)
5. Det som er frosset, er løsningens vurdering da brevet ble sendt, for eksempel at et standpunkt er
   uten virkning eller at punkt 32.2 gjaldt. Vurderingen er ikke en rettslig avgjørelse, og den blir
   ikke riktig eller bindende fordi den er frosset. (MM-U12 s1–s2)
6. Løsningen avgjør ikke det kontrakten overlater til partene, en oppmann eller domstolene. En senere
   avklaring registreres som et nytt utsagn, uten at brevet eller historikken skrives om. (MM-U12
   s4–s5)
7. Det en part har meddelt skriftlig etter punkt 5 i NS 8407, står slik det ble sendt. Det som ikke
   står i teksten, er ikke meddelt (LV-U3). (HF-U13 s1, endret etter spørsmål 2, og s2; E3)
8. Løsningens vurdering av utsagnene binder ingen av partene, og løsningen avgjør ikke om en part er
   bundet av et utsagn eller kan komme løs fra det (MM-U12). (HF-U13 s3; VS-U46 punkt 20, som samler
   setningen MM-U34 punkt 5 la til i HF-U6; E3)

### B. Regelendring og utledningen

9. Utfallet i sporet og vilkåret for en enighet utledes av de frosne standpunktene. (MM-U11 s3)
10. Regelen som setter standpunktene sammen til et utfall, følger gjeldende regler, også for sendte
    brev. Endres den, kan utfallet av et sendt brev endre seg. Sammensetningen følger punkt 32.3
    første ledd a–c og vedtakene om prinsipale og subsidiære standpunkter, som GR-U7. (MM-U11 Følge;
    MM-U11 s4–s5; MM-U16 s5; HF-U13 s4)
11. Det samme gjelder relasjonen mellom brev, for eksempel at et vederlagssvar er subsidiært fordi
    grunnlagssvaret er avslått. Standpunktene i ett sendt brev vurderes ikke på nytt. (rad-017,
    merknaden 05.10 slik MM-U9 snevret den inn; MM-U16 s6–s7; E5)
12. En regelendring som endrer utfallet i gamle saker, skal si det. (rad-017, merknaden 05.10; MM-U3
    s4; E5)

### C. Enigheten

13. Har TE godtatt byggherrens svar, gjelder den registrerte enigheten svaret med alle standpunktene
    og den virkningen brevet hadde da det ble sendt, slik beslutningsgrunnlaget i brevet uttrykker
    den. For et registrert svar er det vurderingen ved registreringen (punkt 19). (MM-U3 s1–s2;
    KA-U10 s1; MM-U17; MM-U34 punkt 10; E2)
14. Innholdet i enigheten er det svaret og kravet hadde da den ble inngått, og en senere endring av
    reglene endrer det ikke. Det gjelder også når reglene er endret mellom brevet og aksepten. (HF-U9
    s4; KA-U10 s2; MM-U3 s2; E2)
15. Om vilkåret for virkning er oppfylt, utledes løpende (GR-U7), så en betinget enighet blir virksom
    når grunnlaget avklares. (MM-U3, presiseringen 09.10 i Følge)
16. Ved enighet ved sammenfall (GR-U8, GR-U10) er brevet og enigheten samtidige. (KA-U10 s5)
17. Utfallet av saken utledes fortsatt med gjeldende regler (punkt 10). Løsningen avgjør ikke om
    partene rettslig er enige (MM-U12). (HF-U9 s5; HF-U9 slik MM-U34 punkt 10 endret den; E2)

### D. Brev sendt utenfor løsningen og registrert i den

18. Et brev sendt utenfor løsningen kan ha full virkning etter kontrakten. Innholdet i et
    registrert brev står som det ble sendt. (HF-U13 s5; MM-U17 s2)
19. Så langt løsningen utleder virkning av et registrert brev, etter unntakene i OV-U4 (OV-U5, OV-U6)
    og etter OV-U80, fryser beslutningsgrunnlaget løsningens vurdering etter reglene ved
    registreringen, ikke reglene da brevet ble sendt. Det gjelder også om punkt 32.2 gjaldt. (MM-U17
    s1 og Følge; HF-U13 s5; OV-U4; OV-U80; E4)
20. Registratorens vurdering av korrespondansen er heller ikke en rettslig avgjørelse, og den blir
    ikke riktig eller bindende fordi den er frosset (punkt 5). (MM-U12 s3)

### E. Et varsel TE oppgir etter byggherrens svar

21. Oppgir TE etter byggherrens svar datoen for et varsel sendt tidligere utenfor løsningen, står et
    svar byggherren alt har gitt, med virkningen det hadde, og blir ikke uavklart. Retten til å
    oppgi datoen følger OV-U5. (OV-U5, «Et svar byggherren alt har gitt …»; OV-U5 Følge; MM-U8 slik
    OV-U5 endret den; E1)
22. Svaret viser til varselet det gjaldt (HF-U1). Løsningen gir ikke svaret virkning for det senere
    varselet og avgjør ikke om svaret omfatter det. (OV-U5, de to setningene etter; E1)
23. En registrert enighet fra før opplysningen bevares, og opplysningen endrer den ikke. Løsningen
    avgjør ikke om enigheten står (MM-U12). (MM-U8 s3; MM-U34 punkt 9; E10)
24. Om byggherren kan sende et nytt svar, følger HF-U25 punkt 1–3. (HF-U25 E2, som endret setningen
    om revisjon i OV-U5)

### Designdel

- Gir dagens regler et standpunkt i et sendt svar en annen virkning, vises avviket som en merknad
  etter HF-U26. (MM-U9 s3 slik HF-U25 og HF-U26 endret den; MM-U3 s3; E6)
- Endrer en regelendring utfallet i en sak, viser saken en merknad om det. Ordlyden står i
  brukerforløpet og følger språkreglene. (MM-U16 s4, designdelen; E4)
- Vurderingen i et registrert brev vises som vurderingen ved registreringen. (MM-U17 s1, merket; E4)
- Visningen og skjemaet for TEs aksept viser hvilket varsel svaret gjaldt, og at TE senere har
  oppgitt et annet. (OV-U5, designdelen)
- Visningen påstår ikke mer enn løsningen vet. (HF-U13, designdelen)

### Beslutningsdel

- Ingen regel leser et lagret utfall. (MM-U11, beslutningsdelen)
- Aksepten viser til svaret og lagrer regelversjonen TE fikk se. Innholdet i enigheten leses fra
  beslutningsgrunnlaget og kopieres ikke. (KA-U10 s3–s4; Klassene)
- Før en regelendring tas i bruk, regnes alle saker med gamle og nye regler. Omregningen gir en
  rapport over hver sak der utfallet endres, med utfallet før og etter og hvilke handlinger som
  dermed tillates eller sperres. Rapporten legges ved vedtaket om regelendringen, og en
  regelendring som endrer utfallet i gamle saker, krever eget vedtak. (MM-U16 s1–s3; rad-017,
  merknaden 05.10; Klassene)
- Regelversjonen i hendelsen, avvisningen av en annen versjon og stoppen i `publish` står i rad-017.
  Omregning etter B-10. Formen på en senere avklaring følger B-16. (rad-017; B-10; MM-U12 s6)

## Endret innhold

**E1 MM-U8 og MM-U4 (motsigelsen).** Gammel tekst: MM-U8 s1–s2 «MM-U4 gjelder også når en ny
opplysning, ikke bare en regelendring, gjør at dagens utledning av svaret avviker fra brevet.
Registrerer TE et varsel etter at byggherren har påberopt preklusjon for det utledede varselet, er
preklusjonen uavklart, og TE kan ikke godta svaret før byggherren har svart på nytt.» Samlevedtaket:
punkt 21–22. Innholdet er OV-U5, som endret MM-U8 13.10 og forkastet alternativ B («At et varsel
registrert etter svaret gjør preklusjonen eller begrensningen uavklart og sperrer TEs aksept»), og
Følge i MM-U8 sier det alt («Leses etter OV-U5, som endret MM-U8 13.10: et svar byggherren alt har
gitt, står med virkningen det hadde, og TE kan godta det (oppdragsgiver 23.10, #1047)»). Det snur
også det forkastede alternativet i MM-U8, «å la TE godta svaret slik brevet uttrykte det».
Samlevedtaket endrer ikke innholdet, så MM-U8 samles og oppheves ikke (svar 4 A). Forholdet «MM-U8
bygger på MM-U4» har ikke noe å virke på, fordi regelen i MM-U4 ikke gjelder for en ny opplysning
heller: (b), forholdet fjernes, og raden i `KJENTE_FORHOLD_TIL_OPPHEVET` fjernes med det.
MM-U1 femte setning, VS-U7 og OV-U22 sier fortsatt «uavklart» med en merknad om OV-U5. De leses etter
punkt 21 og hører til kjeden for brev utenfor løsningen (c).

Henvisningene til MM-U8 i koden og registeret gjelder to ting. `kjerne/utledning/utled.ts`
(modulheaderen) bruker MM-U8 om at en rettidighetsvurdering gjelder det registrerte varselet, altså
punkt 22. `kjerne/kommandoer/forutsetninger.ts` (grenen for VS-U16 og OV-U5) og VS-U19 bruker MM-U8
om retten til å registrere et tidligere varsel. Den retten følger av OV-U5 (Følge i OV-U5: «Retten
VS-U16 viser til i MM-U8, å registrere et varsel sendt tidligere utenfor appen, følger av OV-U5.»).
Punkt 21 sier det, så henvisningen leder fram. Henvisningen i `forutsetninger.ts` bør vise til OV-U5
når koden likevel endres.

**E2 «Registrert enighet» også i KA-U10 og MM-U3.** Gammel tekst: KA-U10 s1 «godtar TE byggherrens
svar, gjelder enigheten svaret med den virkningen brevet hadde da det ble sendt …»; MM-U3 s2 «Har TE
godtatt et svar, gjelder enigheten svaret med alle standpunktene slik det ble godtatt (KA-U1) …».
Samlevedtaket: punkt 13 og 17. MM-U34 punkt 10 ga HF-U9 «Løsningen registrerer enighet om et
standpunkt når …» og tillegget «Løsningen avgjør ikke om partene rettslig er enige (MM-U12).»
KA-U10 og MM-U3 fikk ikke den endringen. Samlevedtaket bruker den også her, og tillegget i HF-U9
samles. Det er innholdet fra MM-U34 punkt 10 og MM-U12, ingen ny regel, men det endrer ordlyden i to
poster. Postene om enighet ved sammenfall (GR-U8, GR-U10, GR-U26, OV-U38) sier fortsatt «partene er
enige» uten forbeholdet. De samles ikke her og hører til kjeden «Aksept og enighet om vederlag og
frist».

Punkt 14 leser «da den ble inngått» i HF-U9 s4 som brevets virkning da det ble sendt, slik Følge i
KA-U10 sier: «‹fastsettes når den inngås› betyr brevets virkning, slik brevet ble godtatt.» Det er
lesingen KA-U10 alt har vedtatt, ikke et nytt valg. For et registrert svar gjelder vurderingen ved
registreringen, fordi MM-U17 endret KA-U10 (punkt 13).

**E3 «Binder slik det sto» i HF-U13.** Gammel tekst: HF-U13 s1 «Det en part har meddelt skriftlig
etter NS 8407 § 5, binder slik det sto da det ble sendt.» Samlevedtaket: punkt 7 og 8, etter
spørsmål 2. Svar 1 A for VS-U46 strøk de to setningene i HF-U6 om at et utsagn binder parten, fordi
setningen MM-U34 punkt 5 la til sier «Løsningen avgjør ikke om parten er bundet av et tidligere
utsagn (MM-U12).» Oppdragsgiver svarte 05.11 på et spørsmål om å registrere feil (oppfølgingsspørsmål
3 for VS-U46), ordrett: «Men appen låser som hovedregel ikke - det er opp til partene å vurdere
rettsvirkninger, herunder muligheten til å kalle tilbake noe som er tidligere meddelt.» Følge i
MM-U16 har et eldre prinsipp, ordrett: «Bygger på oppdragsgivers prinsipp 10.10: det som er meddelt,
binder, og en regelendring har ingen virkning for det brevene sier.» Punkt 8 er vår slutning av
svarene 05.11. Ved 2A leses også begrunnelsen i MM-U17 s3, «den som sender et brev, er bundet av det
hen har meddelt», og prinsippet 10.10 i Følge i MM-U16 som at det parten har meddelt, står som
partens utsagn, slik MM-U34 punkt 15 skrev om OV-U4. KA-U10 s6 gjengir punkt 34.2.2 i kontrakten
og endres ikke. Svar 1 A for VS-U46 er ført (VS-U46 punkt 20 og E8 der).

*Kontroll mot `main` 05.11 (`53f5f5c`):* VS-U46 er merget. Det som gjelder av HF-U6, står i VS-U46
punkt 20, og punkt 8 viser dit. Innholdet i punkt 8 er det samme. VS-U46 samler punkt 6 i MM-U34
og setningen MM-U34 punkt 5 la til i HF-U6, ikke punkt 9 og 10, så henvisningene til dem står.

**E4 Registrerte brev etter OV-U4 og OV-U80.** Gammel tekst: MM-U17 s1 «for et brev sendt utenfor
appen og registrert i den, fryser beslutningsgrunnlaget appens vurdering etter reglene ved
registreringen, merket «appens vurdering ved registreringen».» Samlevedtaket: punkt 19. OV-U4 endret
MM-U17: «Appen utleder ingenting av det: ingen standpunkt, enighet, sperre eller uavklart utfall, og
den fryser ingen vurdering av det. Unntakene står i OV-U5 og OV-U6.» HF-U13 s5 sier det samme. OV-U80
ga et registrert krav eller svar «samme virkning i løsningen som et krav eller svar sendt derfra».
Punkt 19 sier at MM-U17 gjelder i de tilfellene. Det er innholdet etter OV-U4 og OV-U80, ikke en ny
endring. Merkingen «appens vurdering ved registreringen» flyttes til designdelen, og ordlyden følger
språkreglene. Det samme gjelder merknaden i MM-U16, «Appens vurdering av utfallet er endret av nye
regler». MM-U17 s3–s5 er begrunnelsen og forkastet-teksten; de står i MM-U17 og gjentas ikke. Det
samme gjelder begrunnelsen i KA-U10 s6 og forkastet-teksten i KA-U10, MM-U11 og MM-U16.

Kostnaden ved punkt 19, som MM-U17 valgte: MM-U17 forkastet «at den som registrerer, velger
regelsettet». Etter en kjent regelendring kan den som registrerer, likevel velge regelsettet ved å
velge når brevet registreres. Regelendringer er sjeldne og rapporteres (beslutningsdelen), så
kostnaden er liten. Det står her og ikke i samlevedtaket.

**E5 Merknaden 05.10 i rad-017.** Gammel tekst, Følge i rad-017: «‹regner aldri om› gjelder de
lagrede resultatene (resultat, beløp, dager). Standpunkt som utledes ved lesing, som subsidiært
standpunkt og godtatt preklusjon, regnes med gjeldende regler. En regelendring som endrer gamle
saker, skal si det og krever eget vedtak.» Samlevedtaket: punkt 9–12 og beslutningsdelen, slik MM-U9
snevret inn, MM-U11 unntok og MM-U3 presiserte for enigheter. Ingen ny endring. Rad-017 står som
beslutning for versjonsfeltet, avvisningen og stoppen i `publish`, og `bindende_i` viser fortsatt
til MM-U9, som gjelder samlevedtaket.

**E6 Merknaden i MM-U9.** MM-U9 s3, «Gir dagens regler et standpunkt i brevet en annen virkning,
vises avviket som en merknad som oppfordrer byggherren til å revidere svaret (GR-U4).», er endret av
HF-U25 punkt 9 og HF-U26 (E4 i HF-U25). Den samles ikke her, og designdelen viser til HF-U26.
Forkastet-teksten i MM-U9 står i MM-U9.

**E7 GR-U12 og GR-U13.** Bare frysingen av om punkt 32.2 gjaldt samles (GR-U12 s3, GR-U13 s6).
At godkjenningen er en endringsordre, vilkåret i punkt 31.3 og registratorens opplysning hører til
kjeden «Grunnlaget godkjent som endringsordre», som ikke er samlet. Den kjeden tar også betegnelsen
i designdelen av GR-U12.

**E8 Setninger som står.** HF-U13 siste setning, «Et varsel er et eget utsagn med datoen det ble
sendt, og datoen settes én gang.», står; den er snevret inn av OV-U11, som MM-U41 samler. Fra HF-U9
samles bare s4–s5 og tillegget fra MM-U34 punkt 10; resten hører til kjeden «Aksept og enighet om
vederlag og frist». Fra OV-U5 samles bare setningene i punkt 21–22; retten til å oppgi datoen hører
til kjeden «Brev og varsel sendt eller registrert utenfor løsningen», og setningen om det første
fristkravet er samlet av VS-U43. HF-U5 nevnes bare. Forholdene fra HF-U5 til MM-U9, KA-U10 og OV-U5
står. Innholdet i dem er endret av HF-U23 (E2) og HF-U25 (E2, E4).

**E9 Forholdene til postene samlevedtaket samler** (hovedregelen 05.11, punkt 2). Samlevedtaket
opphever ingen post, så (a) og (b) gjelder forholdene, ikke postene. «Står» betyr at forholdet står
som før, og at det leses som et forhold til samlevedtaket der det gjelder en setning som er samlet.

| Forhold | Regel | Hvorfor |
| --- | --- | --- |
| MM-U9 opphever MM-U4, MM-U5, MM-U6 | står | regelen står i punkt 1–2 |
| MM-U8 bygger på MM-U4 | (b), fjernes | E1 |
| VS-U7 utvider MM-U8 | (b), fjernes | utvidelsen til punkt 34.1 gjaldt at preklusjonen blir uavklart, at en enighet står, og at det bare gjelder når varselet gjelder det preklusjonen gjaldt; punkt 21–23 og OV-U5 dekker alt punkt 34.1.2 og 34.1.3, og OV-U5 endret VS-U7 |
| OV-U5 endrer MM-U8 | (a) | punkt 21–22 |
| MM-U8 presiserer MM-U1 | (a) | punkt 21; setningen om uavklart preklusjon i MM-U1 hører til kjeden for brev utenfor løsningen (c) |
| MM-U17 endrer GR-U12, GR-U13, KA-U10, MM-U9, MM-U11, MM-U12 | (a) | punkt 13 og 19 |
| OV-U4 endrer MM-U17 og GR-U12 | (a) | punkt 19 |
| OV-U80 endrer HF-U13 og presiserer OV-U5 | (a) | punkt 18–19 |
| OV-U11 snevrer inn HF-U13 | står | gjelder siste setning (E8) |
| OV-U44 og OV-U46 presiserer HF-U13; OV-U46 presiserer GR-U12 og GR-U13 | står | gjelder registrering og bekreftelse (MM-U41, KA-U49) |
| MM-U34 endrer HF-U9 | (a) | punkt 13 og 17 (E2) |
| HF-U25 og HF-U26 endrer MM-U9 | står | gjelder merknaden (E6) |
| OV-U6 og GR-U14 endrer GR-U13; GR-U15 utvider GR-U13 | står | gjelder endringsordren (E7) |
| GR-U13 endrer GR-U12 | står | gjelder endringsordren (E7) |
| KA-U10 presiserer MM-U3; MM-U11 og MM-U12 presiserer MM-U9 | (a) | punkt 1–17 |
| HF-U9 presiserer MM-U3, MM-U11, MM-U16; HF-U13 presiserer MM-U12, MM-U16, MM-U17 | (a) | punkt 7–19 |
| KA-U20 presiserer MM-U3; OV-U43 og OV-U49 til HF-U9 og KA-U10; OV-U30, OV-U32 og MM-U13 presiserer MM-U11 | står | de gjelder merket brev, kravversjoner og lagdelingen, ikke det som samles |
| HF-U5 til MM-U9, KA-U10 og OV-U5 | står | E8 |
| HF-U4, OV-U8, OV-U9, OV-U11, OV-U15, OV-U24, OV-U29, OV-U41, OV-U85, VS-U28, VS-U34, LV-U19, LV-U21, LV-U29, LV-U53 til OV-U5 | står | de gjelder setningene i OV-U5 som ikke samles her |
| De andre forholdene til MM-U12 (MM-U21, MM-U23, MM-U33, MM-U41, OV-U43, KA-U20 m.fl.) | står | de bruker prinsippet i punkt 5–6 |

**E10 En enighet fra før opplysningen.** Gammel tekst: MM-U8 s3 «En enighet inngått før
opplysningen står (MM-U3).» Samlevedtaket: punkt 23. MM-U34 punkt 9 (28.10) sier: «Fram til
endringsordren kan TE sende en ny kravversjon … også i et spor med registrert enighet … løsningen
avgjør ikke om enigheten står (MM-U12).» «Står» i MM-U8 ville sagt det motsatte av det løsningen lar
partene gjøre. Punkt 23 sier at opplysningen ikke endrer enigheten, og at løsningen ikke avgjør om
den står. Det endrer ordlyden i MM-U8 etter MM-U34 punkt 9, ingen ny regel.

## Klassene

Etter testen i vedtaksskillen, prøvd uavhengig 05.11 (svar 8):

- Punkt 1–24 er *vedtak*: de sier hva et sendt brev og en enighet betyr, hva en regelendring kan og
  ikke kan endre, og hva løsningen ikke avgjør.
- Merknadene og merkingen er *design* og står i designdelen.
- Omregningen og rapporten, kravet om eget vedtak for en regelendring, regelversjonen og at ingen
  regel leser et lagret utfall er *beslutning* og står i beslutningsdelen.

To deler får en annen klasse enn i registeret. Kontrollen fant dem og prøvde dem etter trinn 2:

- MM-U16 s1, «før en regelendring rulles ut, regnes alle saker med gamle og nye regler», sier hvordan
  løsningen drives ved en regelendring, og blir beslutningsdel. Registeret har bare rapporten som
  beslutningsdel.
- KA-U10 s3, første del («Aksepten viser til svaret»), og s4 («Innholdet i enigheten leses fra
  beslutningsgrunnlaget og kopieres ikke») sier hvordan løsningen lagrer, og blir beslutningsdel. Det
  bindende innholdet står i punkt 13. Registeret har bare «at aksepten lagrer regelversjonen TE fikk
  se».

Rettingen av klassen føres i #1534 med resultatet av kontrollen når samlevedtaket føres.

## Påstander om koden

Kontrollert av subagenten 05.11 (se «Kontrollen»).

- `kjerne/utledning/utled.ts` (modulheaderen) viser til MM-U8 om at en rettidighetsvurdering gjelder
  det registrerte varselet (punkt 22). `kjerne/kommandoer/forutsetninger.ts` (grenen for VS-U16 og
  OV-U5) viser til MM-U8 om retten til å registrere et tidligere varsel, som følger av OV-U5 (E1).
- Henvisningene til MM-U17 gjelder to ting. De fleste i `kjerne/`, `server/` og `src/` gjelder at et
  registrert brev ikke har noen tekst fra løsningen. Det er vår lesing av punkt 18, «står som det ble
  sendt». `kjerne/utledning/visning.ts` (rundt `eldreKravversjon`), F52 og F53 i
  `kjerne/tester/feilinnfoering.ts` og en test i `kjerne/tester/kjerne.test.ts` gjelder frysingen
  etter reglene ved registreringen, altså punkt 19 og designdelen.

## Kontrollen

En subagent kontrollerte 05.11 kildene, klassene, statusen, forholdene, påstandene om koden og
sitatene, uavhengig av kartleggingen (svar 7 A og 8). Ti funn, alle rettet:

1. Henvisningen til MM-U8 i `forutsetninger.ts` gjelder retten til å registrere, ikke punkt 21–22.
   Rettet i E1 og punkt 21.
2. Henvisningene til MM-U17 gjelder også punkt 19. Rettet under «Påstander om koden».
3. KA-U10 s3–s4 i beslutningsdelen var en endret klasse uten merknad. Ført under «Klassene».
4. Punkt 12 (omregningen) og «krever eget vedtak» var beslutning. Flyttet til beslutningsdelen, og
   punktene er nummerert på nytt.
5. Punkt 17 og 8 hadde setninger som også står i HF-U9 (tillegget fra MM-U34 punkt 10) og HF-U6.
   Tillegget i HF-U9 samles, og HF-U6 er oppgitt som kilde for punkt 8.
6. Endret innhold som ikke sto i E-lista: HF-U9 s4 i punkt 14 (E2), HF-U13 s5 i punkt 19 (E4), det
   forkastede alternativet i MM-U8 (E1), hele MM-U12 s3 i punkt 20, og Følge i MM-U11 for punkt 10.
   Alle rettet.
7. «Status nå» manglet forhold. Kolonnen viser nå opphever, samler og endrer, og de manglende er lagt
   til.
8. E9 manglet forhold. Lagt til.
9. Punkt 24 viser til HF-U25 punkt 1–3, ikke bare punkt 1.
10. Belegget i spørsmål 2 sto uten sammenheng og uten prinsippet 10.10 i MM-U16. Rettet i E3 og
    spørsmål 2.

Kontrollert uten funn: setningsnumrene, at innholdet ellers er det samme eller står i E-lista,
sitatene, «Klasse nå» for alle radene, og at ingen annen post i kjeden er samlet.

## Prøvingen

En subagent prøvde 05.11 alternativene mot vedtakene og arbeidsflyten med fem forløp (vedtaksskillen).

**Mot vedtakene.** Rettet: 1A forutsatte 2A, og forholdet til HF-U13 følger nå svaret på spørsmål 2.
MM-U8 s3 («En enighet … står») stred mot MM-U34 punkt 9 og er rettet i punkt 23 (E10). Ved 2A sier
begrunnelsen i MM-U17 og prinsippet 10.10 i MM-U16 fortsatt «bundet» og «binder»; det står nå i 2A
og E3. 2B stred mot HF-U6 slik MM-U34 punkt 5 endret den, uten å si det; det står nå i 2B. Påstanden
om koden i E1 er rettet, og grunnen for (b) for VS-U7 er utvidet. Påstanden i anbefalingen til
spørsmål 1 om at «de tre postene» om enigheten sier det samme, gjelder aksept, ikke sammenfall (E2).
Punkt 13 sier nå hva som gjelder for et registrert svar, og E2 sier hvordan HF-U9 s4 leses. Ingen
gjeldende vedtakstekst strider mot punkt 21; MM-U1, VS-U7 og OV-U22 har merknader om OV-U5 (E1).

**Forløpene.**

1. Byggherren svarer med preklusjon, og TE oppgir etterpå et tidligere varsel. TE kan godta svaret.
   TE vil ofte heller at byggherren svarer på nytt. Da kan TE vente på at byggherren sender et nytt
   svar, eller sende en ny kravversjon og miste muligheten til å godta det gamle svaret (MM-U34
   punkt 2). Riktig, men tungvint. Forslaget til brukerforløpet, ikke til samlevedtaket: visningen
   for byggherren kan si at byggherren kan sende et nytt svar (HF-U25 punkt 1), uten oppfordring,
   som HF-U26.
2. Byggherren svarer før TE oppgir datoen. Svaret står, men TE kan oppgi datoen alt med kravet
   (OV-U5). Ingen endring.
3. Regelendring etter svaret og før aksepten. Aksepten med en annen regelversjon avvises (rad-017),
   TE laster på nytt, ser merknaden og godtar. Ingen posisjon tapes.
4. Byggherren registrerer et svar sendt utenfor løsningen etter en kjent regelendring. Kostnaden
   står i E4.
5. TE godtar og angrer. TE kan sende en ny kravversjon fram til endringsordren (MM-U34 punkt 9).
   Punkt 23 sier nå det samme.

## Spørsmålene til oppdragsgiver

Lagret ordrett før de ble sendt. Begge er juridiske og stilles i tekst, ikke med spørsmålsverktøyet.

**1. Tilslutning til samlevedtaket for sendte brev og regelendring.** Forslaget over, punkt 1–24
med designdelen, beslutningsdelen og «Endret innhold» E1–E10. Samlevedtaket sier ett sted at et
sendt brev beholder virkningen det hadde, hva en regelendring kan endre (sammensetningen til et
utfall og relasjonen mellom brev) og ikke kan endre (standpunktene i et sendt brev og innholdet i en
enighet), at vurderingen som fryses, ikke er en rettslig avgjørelse, og at et registrert brev
vurderes etter reglene ved registreringen der løsningen utleder virkning av det. E1 løser
motsigelsen: en ny opplysning gjør ikke et svar uavklart, slik det ble avgjort 13.10 for et varsel
totalentreprenøren oppgir etter svaret. E4–E9 samler ordlyden slik senere vedtak alt har endret
den, uten nytt innhold. E2 og E10 endrer ordlyden etter MM-U34: en enighet etter aksept omtales som
registrert enighet, med forbeholdet om at løsningen ikke avgjør om partene rettslig er enige, og en
enighet fra før en ny opplysning «står» ikke, men bevares, og løsningen avgjør ikke om den står. E3
avgjøres i spørsmål 2. Omregningen før en regelendring og kravet om eget vedtak for den blir
beslutning, og det samme gjør to setninger om hvordan aksepten lagres («Klassene»).

- **A (anbefalt):** «Reglene for sendte brev og regelendring står i samlevedtaket MM-U50, punkt
  1–24 med designdelen, beslutningsdelen og E1–E10. MM-U3, MM-U8, MM-U9 (unntatt tredje setning),
  MM-U11, MM-U12, MM-U16, MM-U17, KA-U10, HF-U13 (unntatt siste setning), tredje setning i GR-U12,
  sjette setning i GR-U13, fjerde og femte setning i HF-U9 med tillegget fra MM-U34 punkt 10,
  setningene i OV-U5 om et svar byggherren alt har gitt, og merknaden 05.10 i B-13 regelversjon
  gjelder som «Samlet i samlevedtaket for sendte brev og regelendring». Forhold: samler de postene;
  endrer første setning i KA-U10 og andre setning i MM-U3 (E2) og tredje setning i MM-U8 (E10).
  Forholdet til første setning i HF-U13 følger svaret på spørsmål 2. Forholdene «MM-U8 bygger på
  MM-U4» og «VS-U7 utvider MM-U8» fjernes (E9). Klasse: vedtak med designdel og beslutningsdel.»
- **B:** «Som A, men KA-U10, MM-U3 og MM-U8 beholder «enigheten gjelder» og «En enighet inngått før
  opplysningen står» uten forbeholdet om at løsningen ikke avgjør om partene rettslig er enige, eller
  om enigheten står. E2 og E10 gjelder ikke, og samlevedtaket strider da i ordlyden mot MM-U34
  punkt 9 og 10.»

*Belegg:* MM-U34 punkt 10, ordrett: «‹Partene er enige om et standpunkt når …› blir ‹Løsningen
registrerer enighet om et standpunkt når …› … Tillegg: ‹Løsningen avgjør ikke om partene rettslig er
enige (MM-U12).›» MM-U34 punkt 9: «Fram til endringsordren kan TE sende en ny kravversjon … også i
et spor med registrert enighet … løsningen avgjør ikke om enigheten står (MM-U12).» OV-U5, forkastet
alternativ B: «At et varsel registrert etter svaret gjør preklusjonen eller begrensningen uavklart og
sperrer TEs aksept.» MM-U12: «Appen avgjør ikke det kontrakten overlater til partene, en oppmann
eller domstolene.»

*Anbefaling:* A. Da sier vedtakene om en enighet etter aksept det samme som MM-U34, og MM-U8 sier
ikke lenger noe OV-U5 har forkastet. Postene om enighet ved sammenfall har fortsatt den gamle
ordlyden og tas i kjeden for aksept og enighet (E2).

*Hva valget styrer:* teksten i MM-U50, forholdene til de samlede postene, klassen for to setninger
i KA-U10 og første setning i MM-U16, og at raden for MM-U8 i lista over kjente forhold til
opphevede poster fjernes.

**2. Binder det en part har meddelt, eller står det slik det ble sendt?** I dag sier ett vedtak at
det en part har meddelt skriftlig etter punkt 5 i NS 8407, «binder slik det sto da det ble sendt».
Et annet vedtak sier at løsningen ikke avgjør om parten er bundet av et tidligere utsagn, og
samlevedtaket for påberopelse av sent varsel strøk 05.11 en setning om at et utsagn binder parten.
Spørsmålet er hva samlevedtaket skal si om det en part har meddelt. Om en meddelelse binder etter
kontrakten og avtaleloven, endres ikke av valget; valget gjelder hva løsningen sier om det.

- **A (anbefalt):** «Det en part har meddelt skriftlig etter punkt 5 i NS 8407, står slik det ble
  sendt. Det som ikke står i teksten, er ikke meddelt (LV-U3). Løsningens vurdering av utsagnene
  binder ingen av partene, og løsningen avgjør ikke om en part er bundet av et utsagn eller kan komme
  løs fra det (MM-U12). Forhold: endrer første setning i HF-U13. Begrunnelsen i tredje setning i
  MM-U17 («den som sender et brev, er bundet av det hen har meddelt») og prinsippet fra 10.10 i
  MM-U16 («det som er meddelt, binder») leses som at det parten har meddelt, står som partens
  utsagn.»
- **B:** «Det en part har meddelt skriftlig etter punkt 5 i NS 8407, binder slik det sto da det ble
  sendt. Det som ikke står i teksten, er ikke meddelt (LV-U3). Løsningens vurdering av utsagnene
  binder ingen av partene. Forhold: samler første til tredje setning i HF-U13 uendret. Det endrer
  setningen MM-U34 punkt 5 la til i HF-U6, «Løsningen avgjør ikke om parten er bundet av et
  tidligere utsagn (MM-U12).», og strider mot den tilsvarende setningen i samlevedtaket for
  påberopelse av sent varsel.»

*Belegg:* HF-U13, ordrett: «Det en part har meddelt skriftlig etter NS 8407 § 5, binder slik det sto
da det ble sendt.» Setningen MM-U34 punkt 5 la til i HF-U6: «Løsningen avgjør ikke om parten er
bundet av et tidligere utsagn (MM-U12).» Følge i MM-U16: «Bygger på oppdragsgivers prinsipp 10.10:
det som er meddelt, binder, og en regelendring har ingen virkning for det brevene sier.» Oppdragsgiver
05.11, i svaret om å registrere feil i samlevedtaket for påberopelse av sent varsel: «Men appen låser
som hovedregel ikke - det er opp til partene å vurdere rettsvirkninger, herunder muligheten til å
kalle tilbake noe som er tidligere meddelt.»

*Anbefaling:* A. Med B sier samlevedtaket at meddelelsen binder, mens HF-U6 og samlevedtaket for
påberopelse av sent varsel sier at løsningen ikke avgjør det. Prinsippet fra 10.10 gjaldt at en
regelendring ikke endrer det brevene sier, og det står i punkt 1–2 og 7 også med A. At A er i tråd
med svaret 05.11, er vår slutning; svaret ble gitt om å registrere feil, ikke om dette vedtaket.

*Hva valget styrer:* punkt 7 og 8 i MM-U50 og forholdet til HF-U13. Ingen sperre eller handling i
løsningen endres.
