# Vurdering: de kjente forholdene til opphevede vedtak

05.11.2026. Kontrollert commit: `4bc80a4` på `main`. Del av #1534, steg 4. Kartleggingen gjelder
de 38 radene i `KJENTE_FORHOLD_TIL_OPPHEVET` i
[`vedtaksregister.py`](../verktoy/vedtaksregister.py). Den er grunnlaget for å avgjøre hva som
gjenstår i trinn 2 (samlevedtakene for kjedene med motsigelser), og for å fjerne radene i en
senere PR. Ingen post og ingen rad er endret.

## Grunnlaget

- **Hva en rad er.** En rad er et forhold (presiserer, utvider, snevrer inn, endrer eller bygger
  på) fra en gjeldende post til et opphevet vedtak. `forhold_til_opphevet` hopper over forholdet
  bare når målet er opphevet av et gjeldende samlevedtak. Den hopper ikke over forholdet når
  posten er samlet i et samlevedtak, eller når et samlevedtak endrer posten.
- **Hvem som har opphevet målene.** Ingen av målene er opphevet av et samlevedtak.
  MM-U34 (28.10) har opphevet EO-U2, EO-U5, EO-U6, EO-U9, GR-U2, KA-U7, HF-U14 og HF-U17. KA-U43
  (31.10) har opphevet KA-U24, og KA-U45 (01.11) KA-U26 og KA-U28. OV-U69 (30.10) har opphevet
  OV-U48 og OV-U49, og OV-U52 (25.10) OV-U51. HF-U9 (15.10) har opphevet KA-U3 og KA-U5, MM-U9
  MM-U4, MM-U40 (02.11) MM-U29, og MM-U37–MM-U39 (02.11) MM-U28. Derfor står alle de 38 radene,
  også der et samlevedtak har ryddet innholdet.
- **Lesingen.** Fire subagenter leste hver sin gruppe av rader, gruppert etter målet. De leste
  teksten, Følge og forholdene for postene og målene, tabellen «Kjedene» i
  [klassifiseringen](vurdering-klassifisering-2026-11-03.md#kjedene) og vurderingsfilene for
  samlevedtakene. Vurderingsfila for sent varsel i PR #1593 er lest. Utkastet der samler blant
  annet MM-U34 og OV-U7, men opphever ingen av målene og fjerner ingen rad.
- **Motsigelse** betyr her at to gjeldende poster sier ulikt om det samme, så den gjeldende
  regelen ikke kan leses av én post. **Nei** betyr at forholdet er korrekt ført, men historisk:
  posten er eldre enn opphevelsen, og vedtaket som opphevet målet, eller et senere vedtak, har
  tatt innholdet uten at posten sier noe i strid med det.

- **Dekket** har tre grader, etter den uavhengige kontrollen
  ([kommentaren i PR #1595](https://github.com/khjohns/endringsmeldinger/pull/1595#issuecomment-6652412946)):
  posten er *samlet* i et samlevedtak, posten er bare *endret* av det, eller samlevedtaket har
  *ingen relasjon* til posten, men et punkt under «Endret innhold» (E-punkt) sier at forholdet
  ikke gjelder. En rad uten relasjon og uten et slikt E-punkt er ikke dekket.
- **E-punkt** i tabellen sier om et E-punkt eller en merknad i vurderingsfila for samlevedtaket
  uttrykkelig sier at forholdet ikke gjelder (*ja*), bare sier at setningen eller målet
  forholdet bar, står opphevet (*delvis*), eller ikke sier noe om det (*nei*).

## Tabellen

«Forhold til samlevedtaket» viser relasjonen mellom posten og samlevedtaket. «Ikke dekket» betyr
at ingen merget samlevedtak har en relasjon til posten med et E-punkt, eller at E-punktet mangler.
Vedtaket som opphevet målet, har likevel tatt innholdet, med unntakene som er merket med *ja* i
kolonnen «Motsigelse».

| Rad | Kjede | Motsigelse | Forhold til samlevedtaket | E-punkt |
| --- | --- | --- | --- | --- |
| hf-u9 snevrer inn eo-u2 | Endringsordren som omfatter KOE-sakene | Nei. Vilkåret innsnevringen gjaldt, er opphevet av MM-U34 punkt 20 | Ingen relasjon (EO-U34: «ingen setning endres») | Ja: EO-U34, raden for HF-U9 («forholdet til EO-U2 og EO-U5 har ikke noe å virke på») og E12, som bare nevner EO-U5 |
| ov-u3 bygger på eo-u2 | Kravene er avgjort, og sperren etter det | Nei. Merknaden 13.10 er avgjort av MM-U34 punkt 20 og EO-U34 punkt 5 | Endret av EO-U34 | Ja: EO-U34 E12 |
| hf-u9 snevrer inn eo-u5 | Endringsordren som omfatter KOE-sakene | Nei. Som raden for EO-U2 | Ingen relasjon | Ja: EO-U34 E12 |
| ka-u12 presiserer eo-u5 | Endringsordren som omfatter KOE-sakene | Nei. MM-U34 punkt 20 stryker «som oppgjort i EO-U5», og EO-U34 punkt 15 gir ny ordlyd | Endret av EO-U34 | Ja: EO-U34 E12 |
| ov-u3 bygger på eo-u5 | Kravene er avgjort, og sperren etter det | Nei. Som raden for EO-U2 | Endret av EO-U34 | Ja: EO-U34 E12 |
| ov-u43 utvider eo-u5 | Endringsordren som omfatter KOE-sakene | Nei. EO-U34 punkt 5: setningen gjelder ikke som vilkår | Endret av EO-U34 | Ja: EO-U34 E12 |
| ov-u55 snevrer inn eo-u5 | Retting av sendt brev | Nei. MM-U34 punkt 18 opphevet forslaget sperren gjaldt | Ingen relasjon | Ja: EO-U34 E12 |
| gfk-u2 presiserer eo-u6 | Fullmakt og godkjenningskjeden | Nei. EO-U6 står bare i de forkastede alternativene | Ingen relasjon | Ja: EO-U34 E11 |
| ov-u2 bygger på eo-u6 | Fullmakt og godkjenningskjeden | Nei. Merknaden 10.10 er satt ut av MM-U34 punkt 22 | Endret av EO-U34 | Ja: EO-U34 E11 |
| ov-u6 bygger på eo-u6 | Endringsordren som omfatter KOE-sakene | Nei. Merknaden 13.10 er avgjort i EO-U34 punkt 43–50 | Samlet i EO-U34 | Ja: EO-U34 E11 |
| hf-u12 presiserer eo-u9 | Endringsordren som omfatter KOE-sakene | Nei. EO-U34 punkt 41 tar innholdet | Endret av EO-U34 | Nei: E6 gjelder EO-U8 og HF-U5 |
| ov-u6 bygger på eo-u9 | Endringsordren som omfatter KOE-sakene | Nei. EO-U34 punkt 41 og 50 gir regelen | Samlet i EO-U34 | Ja: EO-U34 E11 |
| gr-u10 presiserer gr-u2 | Grunnlaget godkjent som endringsordre | Nei. MM-U34 punkt 11 strøk bindingen i GR-U10, og resten er ikke i strid | Ikke dekket | Nei |
| gr-u22 endrer gr-u2 | Grunnlagskravet: ny versjon, hjemmel og ny sak | Nei. MM-U34 punkt 11 sier det samme om hjemmelen | Ikke dekket. MM-U41 snevrer inn GR-U22 i andre setninger | Nei |
| hf-u9 presiserer gr-u2 | Aksept og enighet om vederlag og frist | Nei. MM-U34 punkt 10 strøk setningene som presiserte GR-U2 | Ikke dekket | Nei |
| hf-u9 presiserer ka-u7 | Kravversjon, ny kravversjon og utdyping | Nei. MM-U34 punkt 10 strøk delen om KA-U7, og punkt 9 erstatter KA-U7 | Ikke dekket | Nei |
| ka-u13 snevrer inn ka-u7 | Trekk og sperrene mot trekk | Nei for forholdet. Men se «Motsigelsen raden ikke fanger»: KA-U13 mot MM-U34 punkt 12 | Ikke dekket | Nei |
| ka-u20 presiserer ka-u7 | Vilkår og forbehold i byggherrens svar | Nei. Setningene som nevner KA-U7, er snevret inn av KA-U45 | Endret av KA-U49 | Delvis: KA-U49 E6 navngir setningene |
| ov-u43 utvider ka-u7 | Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid | **Ja (svak).** Mest prinsipp 3, også prinsipp 4: de forutsetter at enigheten binder. MM-U34 punkt 9 lar TE sende en ny kravversjon alene, og punkt 12 opphever sperren når kravene er avgjort | Ikke dekket. OV-U89 og MM-U45 samler bare enkeltsetninger | Nei |
| lv-u31 presiserer hf-u14 | Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid | Nei. LV-U31 sier ingenting om revisjon | Ingen relasjon (HF-U23) | Ja: HF-U23 E6 og spørsmål 1 |
| hf-u22 presiserer hf-u17 | Akseptfristen og bortfall av byggherrens svar | Nei. HF-U22 gjelder i ordlyden fra MM-U34 punkt 8 | Ingen relasjon (HF-U23) | Ja: HF-U23 E5 |
| hf-u7 presiserer ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Henvisningen gjelder samlevedtaket | Ingen relasjon (KA-U46) | Ja: KA-U46 E1 |
| ka-u31 snevrer inn ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. KA-U43 endret KA-U31 | Samlet i KA-U46 | Nei: E1 nevner ikke KA-U31 |
| ka-u41 presiserer ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Henvisningen gjelder samlevedtaket | Samlet i KA-U46 | Ja: KA-U46 E1 |
| ov-u4 endrer ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. OV-U4 (13.10) er eldre enn KA-U43 | Samlet i MM-U43 | Nei: KA-U46 E5 sier ingenting om forholdet |
| ov-u80 bygger på ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Unntaket står i KA-U46 punkt 6 og KA-U18. Forholdet ble ført 01.11, etter opphevelsen | Samlet i MM-U41 | Ja: KA-U46 E1 |
| vs-u13 bygger på ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Henvisningen gjelder samlevedtaket | Ingen relasjon (KA-U46) | Ja: KA-U46 E1 |
| hf-u7 bygger på ka-u26 | Vilkår og forbehold i byggherrens svar | Nei. KA-U45 opphevet KA-U26 og tok innholdet | Ikke dekket. KA-U49 presiserer HF-U7 i et annet punkt | Nei: KA-U49 E1 nevner verken HF-U7 eller KA-U26 |
| mm-u34 endrer ka-u26 | Vilkår og forbehold i byggherrens svar | Nei. Punkt 20 opphevet vilkåret før KA-U45 opphevet hele KA-U26 | Endret av KA-U49 | Delvis: KA-U49 E5 sier at leddet står og at KA-U26 er opphevet |
| mm-u34 endrer ka-u28 | Kravene er avgjort, og sperren etter det | Nei. MM-U34 strøk én setning, og KA-U45 opphevet senere hele KA-U28 | Ikke dekket | Nei |
| mm-u34 endrer ov-u48 | Vilkår og forbehold i byggherrens svar | Nei. OV-U69 sier at punkt 25 faller bort | Endret av KA-U49 | Delvis: KA-U49 E5, punkt 25 står opphevet |
| mm-u34 endrer ov-u49 | Vilkår og forbehold i byggherrens svar | Nei. Punkt 18 opphevet D2 før OV-U69 opphevet hele OV-U49 | Endret av KA-U49 | Delvis: KA-U49 E5, D2-delen står opphevet |
| mm-u34 endrer ov-u51 | Datoen varslingsplikten løper fra, og kunnskapsdatoen | Nei. Forholdet peker på feil post: setningene punkt 15 stryker, står i OV-U52 | Ikke dekket. MM-U41 opphever OV-U52, men har ingen relasjon til MM-U34 | Delvis: MM-U41 E2 og E3 sier at OV-U51 alt var opphevet |
| gr-u7 presiserer ka-u5 | Aksept og enighet om vederlag og frist | Nei. HF-U9 sier det samme som GR-U7 om aksepten | Ikke dekket. GR-U34 presiserer GR-U7, men opphever ikke KA-U5 | Nei |
| ov-u3 endrer ka-u3 | Kravversjon, ny kravversjon og utdyping | Nei. HF-U9 opphevet KA-U3 og tok innholdet | Ikke dekket | Nei |
| mm-u30 presiserer mm-u29 | Hva løsningen utleder og hva den bare viser, og passivitet | Nei. Betegnelsene sier hva som foreligger, og det strider ikke mot MM-U40 | Ikke dekket | Nei |
| mm-u8 bygger på mm-u4 | Sendte brev og regelendring | **Ja.** Teksten begynner med «MM-U4 gjelder også …», og Følge sier «Leses etter OV-U5», som har endret utfallet. Regelen må leses av MM-U4, MM-U8 og OV-U5 sammen | Ikke dekket | Nei |
| ov-u43 presiserer mm-u28 | Betegnelser, sakslisten og nøkkeltallene | Nei. «Ukjent, ikke 0» lever videre i MM-U38 | Samlet i MM-U45 og OV-U89 | Delvis: M4 i vurderingsfila for MM-U45 sier at henvisningen rettes etter svar 14 |

## Motsigelsen raden ikke fanger

KA-U13 sier at trekket «i alle tilfeller» er sperret når «kravene er avgjort (KA-U11)». MM-U34
punkt 12 opphever sperren mot trekk når kravene er avgjort, og lar den gjelde fra endringsordren
er sendt. MM-U34 har ikke noe forhold til KA-U13, så vakttesten ser ikke dette. Punkt 12
avhenger av spørsmål 2 i MM-U34 for saker der TE har godtatt avslaget på grunnlaget. Det er en
mulig motsigelse i kjeden «Trekk og sperrene mot trekk», og den er funnet av kontrollen, ikke av
raden ka-u13 mot ka-u7.

## Tellingen

| Utfall | Rader |
| --- | ---: |
| Motsigelse | 2 (OV-U43 mot KA-U7, svak, og MM-U8 mot MM-U4). I tillegg den mulige motsigelsen KA-U13 mot MM-U34 punkt 12 |
| Samlet i et samlevedtak | 7: ov-u6 ×2 (EO-U34), ka-u31 og ka-u41 (KA-U46), ov-u4 (MM-U43), ov-u80 (MM-U41) og ov-u43 mot mm-u28 (MM-U45) |
| Bare endret av et samlevedtak | 10: ov-u3 ×2, ka-u12, ov-u43 mot eo-u5, ov-u2 og hf-u12 (EO-U34), ka-u20 og mm-u34 mot ka-u26, ov-u48 og ov-u49 (KA-U49) |
| Ingen relasjon, men et E-punkt sier at forholdet ikke gjelder | 8: hf-u9 ×2, ov-u55 og gfk-u2 (EO-U34), lv-u31 og hf-u22 (HF-U23), hf-u7 mot ka-u24 og vs-u13 (KA-U46) |
| Ikke dekket | 11: gr-u10, gr-u22, hf-u9 mot gr-u2 og ka-u7, ka-u13, hf-u7 mot ka-u26, mm-u34 mot ka-u28 og ov-u51, gr-u7, ov-u3 mot ka-u3 og mm-u30 |
| Dekket av PR #1593 | 0 |

Etter kolonnen «E-punkt» har 17 rader *ja*, 6 *delvis* og 15 *nei*. Tre av radene med *nei* er
samlet eller endret: ka-u31, ov-u4 og hf-u12.

I de 36 radene uten motsigelse er det forholdet i posten som holder raden i lista. Ingen av dem
trenger et nytt samlevedtak. Etter merge kan forholdet ikke fjernes fritt. README,
[«Etter merge»](README.md), sier at en merget post bare kan *få* `opphever`, `samler` og
`bygger på`, og at andre forhold står, unntatt de som står i `FORHOLD_FJERNET_ETTER_MERGE` med
kilde. Ni rader står i importerte poster, der Følge står ordrett og bare kan få tillegg: gr-u10,
gr-u7, ka-u12, ka-u13, ka-u20, ka-u31, mm-u8, ov-u2 og vs-u13.

## Forslaget

**Trinn 2, kjedene med motsigelser som gjenstår:**

1. **Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid.** Prinsipp 3 og 4 i OV-U43
   mot MM-U34 punkt 9 og 12. Motsigelsen gjelder en regel kjernen leser. Kjeden deler ikke
   poster med utkastet i PR #1593, utover MM-U34.
2. **Trekk og sperrene mot trekk.** KA-U13 mot MM-U34 punkt 12. Kjeden deler HF-U9, KA-U7 og
   MM-U34 med kjeden over, så den går etter den eller sammen med den.
3. **Sendte brev og regelendring,** med MM-U8 og OV-U5. OV-U5 står også i kjeden for sent
   varsel, så den går etter at PR #1593 er merget.

Lista over kjente avvik er ikke et fullstendig mål på kjedene med motsigelser. KA-U13 viser det.
Motsigelsene i [klassifiseringen](vurdering-klassifisering-2026-11-03.md#motsigelsene-i-registeret)
som ikke er forhold til et opphevet vedtak, er ikke kartlagt her, for eksempel OV-U71 mot OV-U86.

**De 36 radene uten motsigelse:**

- **De 17 med E-punkt *ja*** kan føres i `FORHOLD_FJERNET_ETTER_MERGE` med E-punktet som
  kilde, og forholdet fjernes. Det trengs ikke et nytt valg, slik spørsmål 1 spør om.
- **De tolv radene mot EO-U2, EO-U5, EO-U6 og EO-U9** forsvinner alle hvis EO-U34 får
  «opphever» for de fire. Elleve av dem har E-punkt *ja*, og for hf-u9 mot eo-u2 er
  belegget tabellraden i EO-U34. hf-u12 mot eo-u9 har ikke E-punkt. Se spørsmål 2.
- **De 19 andre** (6 *delvis*, 13 *nei*) venter på en beslutning etter spørsmål 1, eller på
  trinn 3 i kjeden kolonnen «Kjede» viser.

## Åpne spørsmål

Spørsmålene legges fram av orkestratoren etter vedtaksskillen.

1. **Kilden for å fjerne et forhold etter merge.** For 17 rader sier et E-punkt uttrykkelig at
   forholdet ikke gjelder, og det kan være kilden i `FORHOLD_FJERNET_ETTER_MERGE`, slik KA-U49
   E2 (V2 A) var det for de fire radene der nå: hf-u9 mot eo-u2 og eo-u5, ov-u3 mot eo-u2 og
   eo-u5, ka-u12, ov-u43 mot eo-u5, ov-u55, gfk-u2, ov-u2, ov-u6 ×2, lv-u31, hf-u22, hf-u7 mot
   ka-u24, ka-u41, ov-u80 og vs-u13. Oppdragsgiver må avgjøre de 19 andre: A, én beslutning
   om at et forhold til et vedtak som er opphevet av et senere vedtak som har tatt innholdet,
   fjernes, med tabellen her som oversikt; B, radene står til trinn 3, og hvert samlevedtak der
   gir kilden. Anbefaling: B for de seks *delvis*, fordi samlevedtaket alt har sagt hvilken del
   som står, og A for de 13 *nei*, fordi det er vedtaket som opphevet målet, som har tatt
   innholdet. For de ni importerte postene må Følge få et tillegg som sier at forholdet er
   fjernet.
2. **«Opphever» i EO-U34 for EO-U2, EO-U5, EO-U6 og EO-U9.** Vakttesten godtar at en merget post
   får `opphever`, men EO-U34 fikk forholdene «som i tabellen «Postene i kjeden»», så et nytt
   forhold krever et valg med kilde (svar 14 i PR #1537). A: EO-U34 får «opphever» for de fire,
   som bekrefter MM-U34 punkt 20 og 22, og alle tolv radene forsvinner. B: de tolv tas etter
   spørsmål 1. Anbefaling: A, fordi det dekker hf-u12 mot eo-u9, som ikke har E-punkt, og
   fordi opphevelsen er gjort av MM-U34.
3. **Vakttesten.** En regel om at posten hoppes over når den er samlet i et samlevedtak, ville
   fjernet radene for KA-U31, KA-U41, MM-U34, OV-U4, OV-U6, OV-U43 og OV-U80. Den ville også
   skjult motsigelsen i OV-U43 mot KA-U7, for OV-U43 er samlet i OV-U89 og MM-U45. Anbefaling:
   ikke endre testen.

## Verifikasjon og grenser

- **Kjørt og observert.** Hvem som opphever hvert mål, og hvilke samlevedtak som samler hver post,
  er regnet ut med `opphevet_og_samlet` og `samlevedtakene` i `vedtaksregister.py` på `4bc80a4`.
  Teksten i KA-U13 og MM-U34 punkt 12 er lest i registeret.
- **Lest.** Motsigelse og kjede er vurdert av fire subagenter ut fra tekst og Følge. De har ikke
  lest koden. En uavhengig kontroll på `791426f` (svar 8 i #1534) fant at «dekket» var for grovt,
  og at KA-U13 er en mulig motsigelse. Gradene og E-punktene er rettet etter den og kontrollert mot
  vurderingsfilene for EO-U34 (E11, E12), KA-U46 (E1), KA-U49 (E5, E6), MM-U41 (E2, E3) og MM-U45
  (M4). For hf-u9 mot eo-u2 er belegget tabellraden for HF-U9 i EO-U34. E12 nevner bare EO-U5.
- **Ikke kontrollert.** At en rad forsvinner fra vakttesten når forholdet fjernes, er lest av
  `forhold_til_opphevet` og ikke kjørt. Kjeden er valgt etter temaet der målet ikke står i
  «Kjedene» (EO-U2, OV-U2). For MM-U8 er «Sendte brev og regelendring» valgt fordi MM-U9, som
  opphevet MM-U4, står der. Det rettede dokumentet er ikke kontrollert på nytt.
- **Avvik i README.** «Etter merge» i [README](README.md) kaller lista `FORHOLD_FOERT_ETTER_MERGE`,
  mens `vedtaksregister.py` har `FORHOLD_FJERNET_ETTER_MERGE`. Fila her bruker navnet i koden.
