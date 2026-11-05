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
- **Samlevedtak med forhold til posten** er regnet ut av registeret: forholdene fra de gjeldende
  samlevedtakene (`samlevedtakene` i verktøyet) til posten i raden. Raden får den sterkeste
  graden: posten er *samlet* i et samlevedtak, posten har et *annet forhold* til et (endres,
  presiseres, utvides eller snevres inn), eller *ingen*. Graden sier ikke om forholdet til det
  opphevede målet er avklart. Det sier kolonnen «E-punkt».
- **E-punkt** sier om et punkt under «Endret innhold» (E-punkt), en tabellrad eller en merknad i
  vurderingsfila for et samlevedtak sier noe om forholdet til det opphevede målet:
  - *ja, gjelder ikke*: punktet sier at forholdet eller setningen det bar, ikke gjelder, eller at
    forholdet ikke har noe å virke på (EO-U34 E11 og E12, HF-U23 E5 og E6, og tabellraden for
    HF-U9 i EO-U34);
  - *ja, omdirigert*: punktet sier at henvisningen gjelder samlevedtaket (KA-U46 E1);
  - *delvis*: punktet sier bare at setningen eller målet forholdet bar, står opphevet;
  - *nei*: punktet sier ikke noe om forholdet.

  Ingen av punktene sier at forholdet *fjernes*, slik KA-U49 E2 sier om de fire radene som står i
  `FORHOLD_FJERNET_ETTER_MERGE` i dag. Om «gjelder ikke» er nok som kilde, er spørsmål 1.

## Tabellen

| Rad | Kjede | Motsigelse | Samlevedtak med forhold til posten | E-punkt |
| --- | --- | --- | --- | --- |
| hf-u9 snevrer inn eo-u2 | Endringsordren som omfatter KOE-sakene | Nei. Vilkåret innsnevringen gjaldt, er opphevet av MM-U34 punkt 20 | Ingen | Ja, gjelder ikke, i en tabellrad: EO-U34, raden for HF-U9 («forholdet til EO-U2 og EO-U5 har ikke noe å virke på»). E12 nevner bare EO-U5 |
| ov-u3 bygger på eo-u2 | Kravene er avgjort, og sperren etter det | Nei. Merknaden 13.10 er avgjort av MM-U34 punkt 20 og EO-U34 punkt 5 | Annet: endret av EO-U34, utvidet av MM-U41 | Ja, gjelder ikke: EO-U34 E12 |
| hf-u9 snevrer inn eo-u5 | Endringsordren som omfatter KOE-sakene | Nei. Som raden for EO-U2 | Ingen | Ja, gjelder ikke: EO-U34 E12 |
| ka-u12 presiserer eo-u5 | Endringsordren som omfatter KOE-sakene | Nei. MM-U34 punkt 20 stryker «som oppgjort i EO-U5», og EO-U34 punkt 15 gir ny ordlyd | Annet: endret av EO-U34 | Ja, gjelder ikke: EO-U34 E12 |
| ov-u3 bygger på eo-u5 | Kravene er avgjort, og sperren etter det | Nei. Som raden for EO-U2 | Annet: endret av EO-U34, utvidet av MM-U41 | Ja, gjelder ikke: EO-U34 E12 |
| ov-u43 utvider eo-u5 | Endringsordren som omfatter KOE-sakene | Nei. EO-U34 punkt 5: setningen gjelder ikke som vilkår | Samlet i OV-U89 og MM-U45, endret av EO-U34 | Ja, gjelder ikke: EO-U34 E12 |
| ov-u55 snevrer inn eo-u5 | Retting av sendt brev | Nei. MM-U34 punkt 18 opphevet forslaget sperren gjaldt | Annet: endret av MM-U41 | Ja, gjelder ikke: EO-U34 E12 |
| gfk-u2 presiserer eo-u6 | Fullmakt og godkjenningskjeden | Nei. EO-U6 står bare i de forkastede alternativene | Ingen | Ja, gjelder ikke: EO-U34 E11 |
| ov-u2 bygger på eo-u6 | Fullmakt og godkjenningskjeden | Nei. Merknaden 10.10 er satt ut av MM-U34 punkt 22 | Annet: endret av EO-U34 | Ja, gjelder ikke: EO-U34 E11 |
| ov-u6 bygger på eo-u6 | Endringsordren som omfatter KOE-sakene | Nei. Merknaden 13.10 er avgjort i EO-U34 punkt 43–50 | Samlet i EO-U34 | Ja, gjelder ikke: EO-U34 E11 |
| hf-u12 presiserer eo-u9 | Endringsordren som omfatter KOE-sakene | Nei. EO-U34 punkt 41 tar innholdet | Annet: endret av EO-U34 | Nei: E6 gjelder EO-U8 og HF-U5 |
| ov-u6 bygger på eo-u9 | Endringsordren som omfatter KOE-sakene | Nei. EO-U34 punkt 41 og 50 gir regelen | Samlet i EO-U34 | Ja, gjelder ikke: EO-U34 E11 |
| gr-u10 presiserer gr-u2 | Grunnlaget godkjent som endringsordre | Nei. MM-U34 punkt 11 strøk bindingen i GR-U10, og resten er ikke i strid | Ingen | Nei |
| gr-u22 endrer gr-u2 | Grunnlagskravet: ny versjon, hjemmel og ny sak | Nei. MM-U34 punkt 11 sier det samme om hjemmelen | Annet: snevret inn av MM-U41 i andre setninger | Nei |
| hf-u9 presiserer gr-u2 | Aksept og enighet om vederlag og frist | Nei. MM-U34 punkt 10 strøk setningene som presiserte GR-U2 | Ingen | Nei |
| hf-u9 presiserer ka-u7 | Kravversjon, ny kravversjon og utdyping | Nei. MM-U34 punkt 10 strøk delen om KA-U7, og punkt 9 erstatter KA-U7 | Ingen | Nei |
| ka-u13 snevrer inn ka-u7 | Trekk og sperrene mot trekk | Nei for forholdet. Men se «Motsigelsen raden ikke fanger»: KA-U13 mot MM-U34 punkt 12 | Ingen | Nei |
| ka-u20 presiserer ka-u7 | Vilkår og forbehold i byggherrens svar | Nei. Setningene som nevner KA-U7, er snevret inn av KA-U45 | Annet: endret av KA-U49 | Delvis: KA-U49 E6 navngir setningene |
| ov-u43 utvider ka-u7 | Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid | **Ja (svak).** Mest prinsipp 3, også prinsipp 4: de forutsetter at enigheten binder. MM-U34 punkt 9 lar TE sende en ny kravversjon alene, og punkt 12 opphever sperren når kravene er avgjort | Samlet i OV-U89 og MM-U45, endret av EO-U34. OV-U89 og MM-U45 samler bare enkeltsetninger | Nei |
| lv-u31 presiserer hf-u14 | Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid | Nei. LV-U31 sier ingenting om revisjon | Ingen | Ja, gjelder ikke: HF-U23 E6 |
| hf-u22 presiserer hf-u17 | Akseptfristen og bortfall av byggherrens svar | Nei. HF-U22 gjelder i ordlyden fra MM-U34 punkt 8 | Ingen | Ja, gjelder ikke: HF-U23 E5 |
| hf-u7 presiserer ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Henvisningen gjelder samlevedtaket | Annet: presisert av KA-U49 | Ja, omdirigert: KA-U46 E1 |
| ka-u31 snevrer inn ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. KA-U43 endret KA-U31 | Samlet i KA-U46 | Nei: E1 nevner ikke KA-U31 |
| ka-u41 presiserer ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Henvisningen gjelder samlevedtaket | Samlet i KA-U46 | Ja, omdirigert: KA-U46 E1 |
| ov-u4 endrer ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. OV-U4 (13.10) er eldre enn KA-U43 | Samlet i MM-U43 | Nei: KA-U46 E5 sier ingenting om forholdet |
| ov-u80 bygger på ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Unntaket står i KA-U46 punkt 6 og KA-U18. Forholdet ble ført 01.11, etter opphevelsen | Samlet i MM-U41, endret av EO-U34 | Ja, omdirigert: KA-U46 E1 |
| vs-u13 bygger på ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Henvisningen gjelder samlevedtaket | Ingen | Ja, omdirigert: KA-U46 E1 |
| hf-u7 bygger på ka-u26 | Vilkår og forbehold i byggherrens svar | Nei. KA-U45 opphevet KA-U26 og tok innholdet | Annet: presisert av KA-U49 i et annet punkt | Nei: KA-U49 E1 nevner verken HF-U7 eller KA-U26 |
| mm-u34 endrer ka-u26 | Vilkår og forbehold i byggherrens svar | Nei. Punkt 20 opphevet vilkåret før KA-U45 opphevet hele KA-U26 | Samlet i HF-U23, MM-U48, MM-U49, OV-U89 og OV-U91. Også endret av KA-U49, EO-U34 og MM-U47 | Delvis: KA-U49 E5 sier at leddet står og at KA-U26 er opphevet |
| mm-u34 endrer ka-u28 | Kravene er avgjort, og sperren etter det | Nei. MM-U34 strøk én setning, og KA-U45 opphevet senere hele KA-U28 | Samlet i fem, som raden over | Nei |
| mm-u34 endrer ov-u48 | Vilkår og forbehold i byggherrens svar | Nei. OV-U69 sier at punkt 25 faller bort | Samlet i fem, som raden over | Delvis: KA-U49 E5, punkt 25 står opphevet |
| mm-u34 endrer ov-u49 | Vilkår og forbehold i byggherrens svar | Nei. Punkt 18 opphevet D2 før OV-U69 opphevet hele OV-U49 | Samlet i fem, som raden over | Delvis: KA-U49 E5, D2-delen står opphevet |
| mm-u34 endrer ov-u51 | Datoen varslingsplikten løper fra, og kunnskapsdatoen | Nei. Forholdet peker på feil post: setningene punkt 15 stryker, står i OV-U52 | Samlet i fem, som raden over. MM-U41 opphever OV-U52, men har ingen relasjon til MM-U34 | Delvis: MM-U41 E2 og E3 sier at OV-U51 alt var opphevet |
| gr-u7 presiserer ka-u5 | Aksept og enighet om vederlag og frist | Nei. HF-U9 sier det samme som GR-U7 om aksepten | Annet: presisert av GR-U34, som ikke opphever KA-U5 | Nei |
| ov-u3 endrer ka-u3 | Kravversjon, ny kravversjon og utdyping | Nei. HF-U9 opphevet KA-U3 og tok innholdet | Annet: endret av EO-U34, utvidet av MM-U41 | Nei |
| mm-u30 presiserer mm-u29 | Hva løsningen utleder og hva den bare viser, og passivitet | Nei. Betegnelsene sier hva som foreligger, og det strider ikke mot MM-U40 | Ingen | Nei |
| mm-u8 bygger på mm-u4 | Sendte brev og regelendring | **Ja.** Teksten begynner med «MM-U4 gjelder også …», og Følge sier «Leses etter OV-U5», som har endret utfallet. Regelen må leses av MM-U4, MM-U8 og OV-U5 sammen | Ingen | Nei |
| ov-u43 presiserer mm-u28 | Betegnelser, sakslisten og nøkkeltallene | Nei. «Ukjent, ikke 0» lever videre i MM-U38 | Samlet i OV-U89 og MM-U45, endret av EO-U34 | Delvis: M4 i vurderingsfila for MM-U45 sier at henvisningen rettes etter svar 14 |

## Motsigelsen raden ikke fanger

KA-U13 sier at trekket «i alle tilfeller» er sperret når «kravene er avgjort (KA-U11)». MM-U34
punkt 12 opphever sperren mot trekk når kravene er avgjort, og lar den gjelde fra endringsordren
er sendt. MM-U34 har ikke noe forhold til KA-U13, så vakttesten ser ikke dette. Etter det valgte
alternativet i MM-U34 gjelder GR-U27 for saker der TE har godtatt avslaget på grunnlaget eller
trukket grunnlaget, og GR-U27 sier at «KA-U13 står på dette punktet, og punkt 12 i MM-U34 gjelder
ikke disse sakene». Den mulige motsigelsen gjelder derfor bare de andre sakene. Den står i kjeden
«Trekk og sperrene mot trekk», og den er funnet av kontrollen, ikke av raden ka-u13 mot ka-u7.

## Tellingen

| Utfall | Rader |
| --- | ---: |
| Motsigelse | 2 (OV-U43 mot MM-U34 punkt 9 og 12, svak, og MM-U8 mot OV-U5). I tillegg den mulige motsigelsen KA-U13 mot MM-U34 punkt 12 |
| Posten er samlet i et samlevedtak | 14: ov-u6 ×2 (EO-U34), ka-u31 og ka-u41 (KA-U46), ov-u4 (MM-U43), ov-u80 (MM-U41), ov-u43 ×3 (OV-U89 og MM-U45) og mm-u34 ×5 (HF-U23, MM-U48, MM-U49, OV-U89 og OV-U91) |
| Posten har et annet forhold til et samlevedtak | 12: ov-u3 ×3, ka-u12, ov-u2 og hf-u12 (EO-U34), ov-u55 og gr-u22 (MM-U41), ka-u20 og hf-u7 ×2 (KA-U49) og gr-u7 (GR-U34) |
| Ingen | 12: gfk-u2, gr-u10, hf-u22, hf-u9 ×4, ka-u13, lv-u31, mm-u30, mm-u8 og vs-u13 |

Etter kolonnen «E-punkt» har 17 rader *ja* (13 *gjelder ikke*, 4 *omdirigert*), 6 *delvis* og 15
*nei*. Graden og E-punktet er uavhengige: ka-u31 og ov-u4 er samlet og har *nei*, og seks rader
uten samlevedtak har *ja*.

I de 36 radene uten motsigelse er det forholdet i posten som holder raden i lista. Ingen av dem
trenger et nytt samlevedtak. Etter merge kan forholdet ikke fjernes fritt. README,
[«Etter merge»](README.md), sier at en ny post kan få forholdene `opphever`, `samler` og
`bygger på`, at et forhold kan bli `opphever` eller `samler` når et senere vedtak har tatt
innholdet (svar 14 i PR #1537), og at andre forhold står. Verktøyet godtar i tillegg at et forhold
fjernes når det står i `FORHOLD_FJERNET_ETTER_MERGE` med kilde.

## Forslaget

**Trinn 2, kjedene med motsigelser som gjenstår:**

1. **Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid.** Prinsipp 3 og 4 i OV-U43
   mot MM-U34 punkt 9 og 12. Motsigelsen gjelder en regel kjernen leser. Kjeden deler ikke
   poster med utkastet i PR #1593, utover MM-U34.
2. **Trekk og sperrene mot trekk.** KA-U13 mot MM-U34 punkt 12, for de sakene GR-U27 ikke
   gjelder. Kjeden deler HF-U9, KA-U7 og MM-U34 med kjeden over, så den går etter den eller
   sammen med den.
3. **Sendte brev og regelendring,** med MM-U8 og OV-U5. OV-U5 står også i kjeden for sent
   varsel, så den går etter at PR #1593 er merget.

Lista over kjente avvik er ikke et fullstendig mål på kjedene med motsigelser. KA-U13 viser det.
Motsigelsene i [klassifiseringen](vurdering-klassifisering-2026-11-03.md#motsigelsene-i-registeret)
som ikke er forhold til et opphevet vedtak, er ikke kartlagt her, for eksempel OV-U71 mot OV-U86.

**De 36 radene uten motsigelse,** fordelt på spørsmålene under:

| Gruppe | Rader | Spørsmål |
| --- | ---: | --- |
| E-punkt *ja, gjelder ikke* | 13: hf-u9 ×2, ov-u3 mot eo-u2 og eo-u5, ka-u12, ov-u43 mot eo-u5, ov-u55, gfk-u2, ov-u2, ov-u6 ×2, lv-u31 og hf-u22 | 1, og 3 for de elleve mot EO-postene |
| Forhold til KA-U24 | 6: hf-u7, ka-u41, ov-u80 og vs-u13 (*omdirigert*), ka-u31 og ov-u4 (*nei*) | 2 |
| Forhold til EO-U9 uten E-punkt | 1: hf-u12 | 3, ellers 4 |
| Resten med *nei* | 10: gr-u10, gr-u22, hf-u9 mot gr-u2 og ka-u7, ka-u13, hf-u7 mot ka-u26, mm-u34 mot ka-u28, gr-u7, ov-u3 mot ka-u3 og mm-u30 | 4 |
| Resten med *delvis* | 6: ka-u20, mm-u34 mot ka-u26, ov-u48, ov-u49 og ov-u51, og ov-u43 mot mm-u28 | 5 |

## Åpne spørsmål

Spørsmålene legges fram av orkestratoren etter vedtaksskillen. De gjelder føringen i registeret,
ikke kontraktens regler. «Trinn 3» er det siste trinnet i steg 4 i #1534: samlevedtakene for
resten av de 41 temaene, per prefiks. En rad som står til trinn 3, fjernes når samlevedtaket for
kjeden gir kilden.

1. **Er «gjelder ikke» i et samlevedtak kilde for å fjerne forholdet?** For 13 rader sier et
   E-punkt eller en tabellrad i et samlevedtak at forholdet eller setningen det bar, ikke gjelder,
   eller at forholdet ikke har noe å virke på (EO-U34 E11 og E12 og raden for HF-U9, HF-U23 E5 og
   E6). Kilden for de fire radene i `FORHOLD_FJERNET_ETTER_MERGE` i dag, KA-U49 E2, sier
   uttrykkelig at «forholdene fjernes». At «gjelder ikke» betyr det samme, er en antakelse.
   - A: «Sier et samlevedtak at et forhold fra en annen post ikke gjelder eller ikke har noe å
     virke på, fjernes forholdet, med punktet i samlevedtaket som kilde. Innholdet i posten
     endres ikke.»
   - B: «Et forhold fjernes etter merge bare når samlevedtaket sier at det fjernes. Ellers står
     forholdet til samlevedtaket for kjeden i trinn 3.»

   Anbefaling: A. Virkning: de 13 radene forsvinner fra lista når forholdene er fjernet. For
   hf-u9 mot eo-u2 er kilden en tabellrad, ikke et E-punkt. Svaret avgjør ikke de fire radene
   med *omdirigert* (spørsmål 2).
2. **KA-U46 og KA-U24.** KA-U46 E1 sier at henvisningene til KA-U24 «gjelder samlevedtaket».
   Det er det verktøyet leser når et samlevedtak opphever målet (svar 4 A 04.11 i #1534). KA-U43
   har opphevet KA-U24, og KA-U46 har ikke noe forhold til KA-U24.
   - A: «KA-U46 opphever KA-U24, som KA-U43 alt har opphevet. Et forhold fra en gjeldende post
     til KA-U24 leses som et forhold til KA-U46.»
   - B: «Forholdene til KA-U24 står til samlevedtaket for kjeden i trinn 3.»

   Anbefaling: A, fordi E1 sier det samme med ord. Virkning (kjørt, se «Verifikasjon»): alle seks
   radene forsvinner, også ka-u31 og ov-u4, som E1 ikke nevner. Følge for KA-U24 får en andre
   opphevelse, av KA-U46. Vakttesten godtar et nytt `opphever` etter merge, men i et samlevedtak
   krever det et valg med kilde, som for EO-U34 i spørsmål 3 (svar 14 i PR #1537).
3. **EO-U34 og EO-U2, EO-U5, EO-U6 og EO-U9.** MM-U34 har opphevet de fire. EO-U34 samler kjeden,
   men har ikke noe forhold til dem. EO-U34 fikk forholdene «som i tabellen «Postene i kjeden»»,
   så et nytt forhold krever et valg med kilde (svar 14 i PR #1537).
   - A: «EO-U34 opphever EO-U2, EO-U5, EO-U6 og EO-U9, som MM-U34 alt har opphevet. Et forhold
     fra en gjeldende post til en av de fire leses som et forhold til EO-U34.»
   - B: «EO-U34 får ikke noe forhold til EO-U2, EO-U5, EO-U6 og EO-U9. Forholdene til dem tas
     etter spørsmål 1 og 4.»

   Anbefaling: B. Virkning av A (kjørt): alle tolv radene forsvinner, også hf-u12 mot eo-u9, som
   ikke har E-punkt, og Følge for de fire får en andre opphevelse, av EO-U34. Men da leses for
   eksempel «HF-U9 snevrer inn EO-U2» som et forhold til EO-U34, mens EO-U34 sier at forholdet
   «har ikke noe å virke på», og E11 og E12 sier at setningene ikke gjelder. Ved B og A i
   spørsmål 1 forsvinner elleve av radene, og hf-u12 går til spørsmål 4.
4. **Forholdene uten E-punkt, der vedtaket som opphevet målet, har tatt innholdet.** Ti rader har
   *nei* i kolonnen «E-punkt», og hf-u12 kommer i tillegg ved B i spørsmål 3. Kolonnen
   «Motsigelse» sier *nei* for alle: posten sier ikke noe i strid med vedtaket som opphevet
   målet. Det er lest av subagenter, ikke kontrollert av et samlevedtak.
   - A: «Et forhold fra en gjeldende post til et opphevet vedtak fjernes når vedtaket som opphevet
     målet, har tatt innholdet, og posten ikke sier noe i strid med det. Vurderingen av de kjente
     forholdene 05.11 er kilden for hvilke forhold det gjelder.»
   - B: «Forholdene står til samlevedtaket for kjeden i trinn 3, som gir kilden.»

   Anbefaling: A, fordi forholdet er historisk og ikke bærer noe innhold som gjelder. At lesingen
   av de ti radene er riktig, er en antakelse; den er ikke kontrollert uavhengig rad for rad.
   ka-u13 mot ka-u7 fjernes ved A, men den mulige motsigelsen mellom KA-U13 og MM-U34 punkt 12
   står i trinn 2.
5. **Forholdene der et samlevedtak sier at målet står opphevet.** Seks rader har *delvis*: et
   samlevedtak sier hvilken del av setningen eller målet som står opphevet (KA-U49 E5 og E6,
   MM-U41 E2 og E3, M4 for MM-U45), men ikke noe om forholdet.
   - A: som A i spørsmål 4, også for disse seks.
   - B: «Forholdene står til samlevedtaket for kjeden i trinn 3, som gir kilden.»

   Anbefaling: B, fordi samlevedtaket alt har sagt hvilken del som står, og forholdet bør rettes
   der, for eksempel mm-u34 mot ov-u51, som peker på feil post.
6. **Vakttesten.** En regel om at posten hoppes over når den er samlet i et samlevedtak, ville
   fjernet de 14 radene der posten er samlet. Den ville også skjult motsigelsen i OV-U43 mot
   MM-U34 punkt 9 og 12, for OV-U43 er samlet i OV-U89 og MM-U45. Anbefaling: ikke endre testen.

## Verifikasjon og grenser

- **Kjørt og observert.** Hvem som opphever hvert mål, og hvilke samlevedtak som har et forhold
  til hver post, er regnet ut med `opphevet_og_samlet`, `samlevedtakene` og
  `forhold_til_opphevet` i `vedtaksregister.py` på `4bc80a4`. Teksten i KA-U13, i det valgte
  alternativet i MM-U34 punkt 12 og i GR-U27 er lest i registeret.
- **Kjørt på en kopi av `main` (`4bc80a4`), ikke ført.** Med `opphever` for EO-U2, EO-U5, EO-U6
  og EO-U9 i EO-U34 godtar `vedtaksregister.py --sjekk` at to poster, MM-U34 og EO-U34, opphever
  samme vedtak. Den eneste feilen var de tolv radene som «finnes ikke lenger», og med dem fjernet
  fra `KJENTE_FORHOLD_TIL_OPPHEVET` og vedtaksfila skrevet på nytt var registeret gyldig. Med
  `opphever` for KA-U24 i KA-U46 var de eneste feilene de seks radene mot KA-U24. pytest er ikke
  kjørt. Sitatene fra NS 8407 er hoppet over, fordi teksten ikke var klonet.
- **Lest.** Motsigelse og kjede er vurdert av fire subagenter ut fra tekst og Følge. De har ikke
  lest koden. Den første uavhengige kontrollen på `791426f` (svar 8 i #1534) fant at «dekket» var
  for grovt, og at KA-U13 er en mulig motsigelse. Den andre, på `a7c2edf`, fant at gradene ikke
  hadde et kriterium. Graden er nå regnet ut av registeret, og E-punktene er kontrollert mot
  vurderingsfilene for EO-U34 (E11, E12), HF-U23 (E5, E6), KA-U46 (E1), KA-U49 (E2, E5, E6),
  MM-U41 (E2, E3) og MM-U45 (M4).
- **Ikke kontrollert.** At en rad forsvinner når forholdet fjernes etter spørsmål 1, 4 eller 5,
  er lest av `forhold_til_opphevet` og ikke kjørt. Hvordan verktøyet skriver Følge i en importert
  post når et forhold i `FORHOLD_FJERNET_ETTER_MERGE` fjernes, er ikke kontrollert. Kjeden er
  valgt etter temaet der målet ikke står i «Kjedene» (EO-U2, OV-U2). For MM-U8 er «Sendte brev
  og regelendring» valgt fordi MM-U9, som opphevet MM-U4, står der. Det rettede dokumentet er
  ikke kontrollert på nytt.
- **Avvik i README.** «Etter merge» i [README](README.md) nevner bare `FORHOLD_FOERT_ETTER_MERGE`.
  Begge listene finnes i `vedtaksregister.py`, men det er `FORHOLD_FJERNET_ETTER_MERGE` som lar et
  forhold fjernes, så unntaket i README viser til feil liste.
