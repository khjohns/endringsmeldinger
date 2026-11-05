# Vurdering: de kjente forholdene til opphevede vedtak

05.11.2026. Kontrollert commit: `4bc80a4` på `main`. Del av #1534, steg 4. Kartleggingen gjelder
de 38 radene i `KJENTE_FORHOLD_TIL_OPPHEVET` i
[`vedtaksregister.py`](../verktoy/vedtaksregister.py). Den er grunnlaget for å avgjøre hva som
gjenstår i trinn 2 (samlevedtakene for kjedene med motsigelser), og for å fjerne radene i en
senere PR. Ingen post og ingen rad er endret på `4bc80a4`. Hva PR #1595 har ført, står i PR-en.

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
    forholdet ikke har noe å virke på (EO-U34 E11 og E12, HF-U23 E5 og E6, KA-U49 E1 og
    tabellraden for HF-U9 i EO-U34);
  - *ja, omdirigert*: punktet sier at henvisningen gjelder samlevedtaket (KA-U46 E1);
  - *delvis*: punktet sier bare at setningen eller målet forholdet bar, står opphevet;
  - *nei*: punktet sier ikke noe om forholdet.

  Ingen av punktene sier at forholdet *fjernes*, slik KA-U49 E2 sier om de fire radene som står i
  `FORHOLD_FJERNET_ETTER_MERGE` i dag. Hva et punkt må si for at forholdet fjernes, avgjør
  hovedregelen (se «Hovedregelen»).

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
| hf-u7 bygger på ka-u26 | Vilkår og forbehold i byggherrens svar | Nei. KA-U45 opphevet KA-U26 og tok innholdet | Annet: presisert av KA-U49 i et annet punkt | Ja, gjelder ikke: KA-U49 E1 nevner merknaden i HF-U7 som viser til KA-U26 |
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

Etter kolonnen «E-punkt» har 18 rader *ja* (14 *gjelder ikke*, 4 *omdirigert*), 6 *delvis* og 14
*nei*. Graden og E-punktet er uavhengige: ka-u31 og ov-u4 er samlet og har *nei*, og seks rader
uten samlevedtak har *ja*.

I de 36 radene uten motsigelse er det forholdet i posten som holder raden i lista. Etter merge
kan forholdet ikke fjernes fritt. README, [«Etter merge»](README.md), sier at en ny post kan få
forholdene `opphever`, `samler` og `bygger på`, at et forhold kan bli `opphever` eller `samler`
når et senere vedtak har tatt innholdet (svar 14 i PR #1537), og at andre forhold står. Verktøyet
godtar i tillegg at et forhold fjernes når det står i `FORHOLD_FJERNET_ETTER_MERGE` med kilde.
Hvilken vei hver rad går, sier hovedregelen.

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

## Hovedregelen

Oppdragsgiver svarte 05.11 «hovedregelen som foreslått» (runde 18 i #1065, punkt 2 i
[6653185302](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6653185302)).
Svaret erstatter spørsmål 1–5 i kartleggingen på `50862e9`. Forslaget, ordrett:

> - **(a)** Sier samlevedtaket at innholdet i den gamle posten nå står i samlevedtaket («henvisningene gjelder samlevedtaket»), opphever samlevedtaket også den gamle posten (måte 1). Det gir A i spørsmål 2.
> - **(b)** Sier samlevedtaket at forholdet eller setningen ikke gjelder, eller ikke har noe å virke på, fjernes forholdet (måte 2). Det gir B i spørsmål 3 og A i spørsmål 1.
> - **(c)** Sier samlevedtaket ingenting om det, står forholdet. Samlevedtaket for kjeden må da ta det med, også når kjeden alt er samlet. Det tas i neste samlevedtak som rører kjeden, ikke i trinn 3. Det gjelder spørsmål 4 og 5.
>
> Regelen gjelder også for kommende samlevedtak: hvert av dem sier i «Endret innhold» om (a) eller (b) gjelder for forholdene til postene det samler.

Måte 1 er at samlevedtaket også opphever den gamle posten, så verktøyet leser forholdet som et
forhold til samlevedtaket. Måte 2 er at forholdet fjernes, med et punkt i samlevedtaket som kilde.
Svaret var ikke kontrollert før det ble gitt. Regelen er ført som post i registeret,
[OV-U92](../plans/vedtak.md#ov-u92), og svaret på oppfølgingsspørsmål 1 som
[OV-U93](../plans/vedtak.md#ov-u93).

## Fordelingen

Hver rad er prøvd mot ordlyden i punktet som er oppgitt som kilde. «Kjeden» for (c) er kjeden i
tabellen over, og samlevedtaket som tar forholdet, er det neste som rører den.

**(a) Samlevedtaket opphever den gamle posten: 6 rader.** KA-U46 E1, «Henvisningene til KA-U24»,
sier «Samlevedtaket: henvisningene gjelder samlevedtaket». (a) gjelder posten, ikke forholdet:
når KA-U46 opphever KA-U24, leses hvert forhold til KA-U24 som et forhold til KA-U46. Virkningen
for ka-u31 og ov-u4, som E1 ikke nevner, sto i A i spørsmål 2, som (a) gir.

| Rad | Begrunnelse | Kilde |
| --- | --- | --- |
| hf-u7 presiserer ka-u24 | E1 nevner forholdet «presiserer KA-U24» i HF-U7 | KA-U46 E1 |
| ka-u31 snevrer inn ka-u24 | Forholdet gjelder KA-U24, som KA-U46 opphever. E1 nevner ikke KA-U31 | KA-U46 E1 |
| ka-u41 presiserer ka-u24 | E1 siterer KA-U41 som gammel tekst | KA-U46 E1 |
| ov-u4 endrer ka-u24 | Som ka-u31. E1 nevner ikke OV-U4 | KA-U46 E1 |
| ov-u80 bygger på ka-u24 | E1 siterer OV-U80 som gammel tekst | KA-U46 E1 |
| vs-u13 bygger på ka-u24 | E1 siterer VS-U13 som gammel tekst | KA-U46 E1 |

**(b) Forholdet fjernes: 9 rader.** Punktet sier at forholdet eller setningen det bar, ikke
gjelder eller ikke har noe å virke på. EO-U34 opphever ikke EO-U2, EO-U5, EO-U6 og EO-U9 (B i
spørsmål 3, som (b) gir). For HF-U9 er kilden en rad i tabellen «Postene i kjeden». Den regnes
som en del av EO-U34, fordi posten i registeret sier at EO-U34 «samler, opphever og endrer som i
tabellen «Postene i kjeden»». M4 for MM-U45 er derimot en merknad i vurderingsfila, som posten
ikke viser til (se (c)).

| Rad | Begrunnelse | Kilde |
| --- | --- | --- |
| hf-u9 snevrer inn eo-u2 | «forholdet til EO-U2 og EO-U5 har ikke noe å virke på». E12 nevner HF-U9 bare som gammel tekst | EO-U34, tabellen «Postene i kjeden», raden for HF-U9 |
| hf-u9 snevrer inn eo-u5 | Samme setning | EO-U34, raden for HF-U9 |
| ov-u43 utvider eo-u5 | «setningen i OV-U43 gjelder ikke som vilkår» | EO-U34 E12 |
| ov-u2 bygger på eo-u6 | «setningene om EO-U6 og EO-U9 gjelder ikke». Merknaden i OV-U2 er sitert som gammel tekst | EO-U34 E11 |
| ov-u6 bygger på eo-u6 | Samme setning. Merknaden i OV-U6 er sitert som gammel tekst | EO-U34 E11 |
| ov-u6 bygger på eo-u9 | Samme setning og merknad | EO-U34 E11 |
| lv-u31 presiserer hf-u14 | «Forholdet til HF-U14 har ikke noe å virke på» | HF-U23 E6 |
| hf-u22 presiserer hf-u17 | «Begrunnelsen i Følge og forholdet til HF-U17 gjelder ikke lenger.» | HF-U23 E5 |
| hf-u7 bygger på ka-u26 | E1 sier at Følgen i KA-U16 «gjelder ikke lenger», og «Det samme gjelder merknadene som bygger på KA-U16 s6», blant dem HF-U7 «Et forbehold appen ikke kan uttrykke, følger KA-U16 og KA-U26 …». Merknaden bærer forholdet | KA-U49 E1 |

**(c) Forholdet står til neste samlevedtak som rører kjeden: 23 rader.** Ingen av punktene sier
at innholdet står i samlevedtaket, eller at forholdet eller setningen ikke gjelder. De seks
radene med *delvis* sier at setningen eller målet står opphevet, men ikke noe om forholdet; de
var spørsmål 5, som (c) gjelder. De fem siste radene sier noe om setningen eller posten, men ikke
med ordene i (b). Etter svaret B på oppfølgingsspørsmål 1 står de etter (c).

| Rad | Begrunnelse | Kilde | Kjeden |
| --- | --- | --- | --- |
| hf-u12 presiserer eo-u9 | E11 nevner ikke HF-U12. E6 gjelder EO-U8 og HF-U5 | Ingen (EO-U34 E6 endrer andre setninger) | Endringsordren som omfatter KOE-sakene |
| gr-u10 presiserer gr-u2 | Ingen samlevedtak har forhold til GR-U10 | Ingen | Grunnlaget godkjent som endringsordre |
| gr-u22 endrer gr-u2 | MM-U41 snevrer inn andre setninger og sier ikke noe om GR-U2 | Ingen (MM-U41) | Grunnlagskravet: ny versjon, hjemmel og ny sak |
| hf-u9 presiserer gr-u2 | Ingen samlevedtak har forhold til HF-U9 her | Ingen | Aksept og enighet om vederlag og frist |
| hf-u9 presiserer ka-u7 | Som raden over | Ingen | Kravversjon, ny kravversjon og utdyping |
| ka-u13 snevrer inn ka-u7 | Ingen samlevedtak har forhold til KA-U13 | Ingen | Trekk og sperrene mot trekk (trinn 2, nr. 2) |
| ka-u20 presiserer ka-u7 | E6 navngir setningene KA-U45 snevret inn, men ikke forholdet | KA-U49 E6 (*delvis*) | Vilkår og forbehold i byggherrens svar |
| ov-u43 utvider ka-u7 | Motsigelse (svak). Ingen punkt sier noe om forholdet | Ingen | Vederlagsmetoden (trinn 2, nr. 1) |
| mm-u34 endrer ka-u26 | E5: «leddet “vilkåret i KA-U26” i punkt 20 står, og KA-U26 er opphevet» | KA-U49 E5 (*delvis*) | Vilkår og forbehold i byggherrens svar |
| mm-u34 endrer ka-u28 | Ingen punkt sier noe om forholdet | Ingen | Kravene er avgjort, og sperren etter det |
| mm-u34 endrer ov-u48 | E5: punkt 25 står opphevet | KA-U49 E5 (*delvis*) | Vilkår og forbehold i byggherrens svar |
| mm-u34 endrer ov-u49 | E5: delen «OV-U49 D2» i punkt 18 står opphevet | KA-U49 E5 (*delvis*) | Vilkår og forbehold i byggherrens svar |
| mm-u34 endrer ov-u51 | E2 og E3 sier at OV-U51 alt var opphevet. Forholdet peker på feil post | MM-U41 E2 og E3 (*delvis*) | Datoen varslingsplikten løper fra, og kunnskapsdatoen |
| gr-u7 presiserer ka-u5 | GR-U34 presiserer GR-U7, men opphever ikke KA-U5 og sier ikke noe om forholdet | Ingen (GR-U34) | Aksept og enighet om vederlag og frist |
| ov-u3 endrer ka-u3 | EO-U34 og MM-U41 sier ikke noe om KA-U3 | Ingen | Kravversjon, ny kravversjon og utdyping |
| mm-u30 presiserer mm-u29 | Ingen samlevedtak har forhold til MM-U30 | Ingen | Hva løsningen utleder og hva den bare viser, og passivitet |
| mm-u8 bygger på mm-u4 | Motsigelse. Ingen samlevedtak har forhold til MM-U8 | Ingen | Sendte brev og regelendring (trinn 2, nr. 3) |
| ov-u43 presiserer mm-u28 | M4 sier at henvisningen «rettes når Følge rettes etter svar 14», men M4 er en merknad i vurderingsfila og ikke et punkt i samlevedtaket | MM-U45, M4 (*delvis*) | Betegnelser, sakslisten og nøkkeltallene |
| ov-u3 bygger på eo-u2 | Merknaden i OV-U3 er sitert som gammel tekst. Tabellen sier «endrer merknaden om EO-U2 og EO-U5», og det nye innholdet er punkt 5 («enighet er ikke vilkår for at en sak inngår») | EO-U34 E12 og raden for OV-U3 | Kravene er avgjort, og sperren etter det |
| ov-u3 bygger på eo-u5 | Som raden over | EO-U34 E12 og raden for OV-U3 | Kravene er avgjort, og sperren etter det |
| ov-u55 snevrer inn eo-u5 | «Sperren i OV-U55 […] tas ikke med», fordi MM-U34 punkt 18 opphevet forslaget sperren gjelder. Tabellen: «ingen setning samles» | EO-U34 E12 og raden for OV-U55 | Retting av sendt brev |
| ka-u12 presiserer eo-u5 | «“som oppgjort i EO-U5” faller bort». «Faller bort» står ikke i (b) | EO-U34 E12 | Endringsordren som omfatter KOE-sakene |
| gfk-u2 presiserer eo-u6 | «GFK-U2 nevner endringsordren bare i de forkastede alternativene og står.» Tabellen: «ingen setning endres; fullmakten for en endringsordre følger EO-U17» | EO-U34 E11 og raden for GFK-U2 | Fullmakt og godkjenningskjeden |

**Talt:** (a) 6, (b) 9, (c) 23, til sammen 38, etter svaret B på oppfølgingsspørsmål 1.

Kolonnen «E-punkt» i tabellen over er kartleggingen. Fordelingen prøver hver rad mot ordlyden i
hovedregelen og i svaret på oppfølgingsspørsmål 1, så en rad med *ja, gjelder ikke* kan stå i (c) her.

## Funnene fra den andre kontrollen

Kontrollen av `50862e9` fant fire funn (runde 18 i #1065,
[6653239320](https://github.com/khjohns/endringsmeldinger/issues/1065#issuecomment-6653239320)).

1. **«Spørsmål 1, A, er smalere enn virkningen. E11, E12 og OV-U55 bærer ikke alle de 13
   radene.»** Delvis løst. Hovedregelen fordeler rad for rad etter hva punktet sier, så
   virkningen følger ordlyden og ikke en telling. Åtte av de 13 radene har ordene i (b). For fem
   rader sier E11 og E12 noe om setningen eller posten med andre ord. Det løser ikke
   hovedregelen. Det var oppfølgingsspørsmål 1, og etter svaret B står de fem radene etter (c).
2. **«hf-u12 passer ikke i A i spørsmål 4.»** Løst. Hovedregelen legger spørsmål 4 under (c),
   og (c) krever ikke at vedtaket som opphevet målet, har tatt innholdet. hf-u12 mot eo-u9 er
   (c): E11 nevner ikke HF-U12.
3. **«Spørsmål 5 viser til “som A i spørsmål 4”, og spørsmål 6 har ingen alternativer.»** Løst.
   Spørsmål 1–5 er erstattet av hovedregelen, så henvisningen faller bort. Spørsmål 6 gjaldt om
   vakttesten skal hoppe over en post som er samlet. Etter (c) står forholdet til samlevedtaket
   for kjeden tar det med, «også når kjeden alt er samlet». En vakttest som hoppet over en
   samlet post, ville tatt raden ut av lista før det. At testen derfor ikke endres, er vår
   slutning fra (c), ikke et eget svar. Spørsmål 6 er tatt ut.
4. **«B kan bli en blindvei for kjeder som alt er samlet.»** Løst. (c) sier at forholdet tas
   «i neste samlevedtak som rører kjeden, ikke i trinn 3», også når kjeden alt er samlet. Det
   som står igjen, er en virkning: en rad står i lista til et samlevedtak rører kjeden, og
   lista blir ikke tom før det.

## Oppfølgingsspørsmål 1: hva punktet må si for at forholdet fjernes

Spørsmålet gjelder føringen i registeret, ikke kontraktens regler. Det er stilt 05.11 (runde 19 i
#1065) og lagret i PR #1595,
[6654191865](https://github.com/khjohns/endringsmeldinger/pull/1595#issuecomment-6654191865).

**Bakgrunnen.** (b) fjerner forholdet når «samlevedtaket [sier] at forholdet eller setningen ikke
gjelder, eller ikke har noe å virke på». For fem forhold sier samlevedtaket EO-U34 noe om
setningen eller posten, men med andre ord:

- KA-U12 mot EO-U5: E12 sier «“som oppgjort i EO-U5” faller bort», og punkt 15 gir ny ordlyd.

- OV-U3 mot EO-U2 og EO-U5: E12 siterer merknaden i OV-U3 som gammel tekst, og tabellen sier
  at EO-U34 «endrer merknaden om EO-U2 og EO-U5». Det nye innholdet er punkt 5: «enighet er ikke
  vilkår for at en sak inngår».
- OV-U55 mot EO-U5: E12 sier at sperren i OV-U55 «tas ikke med», fordi MM-U34 punkt 18
  opphevet forslaget sperren gjelder. Tabellen sier «ingen setning samles».
- GFK-U2 mot EO-U6: E11 sier «GFK-U2 nevner endringsordren bare i de forkastede alternativene og
  står.» Tabellen sier «ingen setning endres».

**Alternativene.**

- **A:** «Skriver et samlevedtak om setningen som bar forholdet, sier det at setningen faller
  bort eller ikke tas med fordi målet er opphevet, eller sier det at målet bare står i de
  forkastede alternativene, fjernes forholdet etter (b), med punktet som kilde.»
- **B:** «Et forhold fjernes etter (b) bare når punktet sier med ord at forholdet eller
  setningen ikke gjelder eller ikke har noe å virke på. Ellers står forholdet etter (c).»

**Anbefaling: B.** (b) begynner med «Sier samlevedtaket at …», og hovedregelen sier at hvert
kommende samlevedtak «sier i “Endret innhold” om (a) eller (b) gjelder». Begge krever at
samlevedtaket sier det. A lar oss lese det ut av andre ord, og det var den slutningen funn 1
gjaldt. Ulempen ved B er at fem rader står lenger, også ka-u12, der «faller bort» ligger
nærmest ordene i (b).

**Hva valget styrer.** Ved A fjernes 14 forhold med punktet som kilde i PR-en som fjerner
radene. Ved B fjernes 9, og de fem står til neste samlevedtak for kjedene «Kravene er avgjort,
og sperren etter det», «Endringsordren som omfatter KOE-sakene», «Retting av sendt brev» og
«Fullmakt og godkjenningskjeden».

**Svaret.** Oppdragsgiver svarte 05.11 (runde 19 i #1065), ordrett: «Ja, B»
([6654361760](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6654361760)).
Oppdragsgiver spurte først «Hva anbefaler du?», og orkestratoren anbefalte B med begrunnelsen i
spørsmålet. B er valgt, og A er forkastet. De fem radene står etter (c), i fordelingen over.

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
- **Ikke kontrollert.** At en rad forsvinner når forholdet fjernes etter (b),
  er lest av `forhold_til_opphevet` og ikke kjørt. Hvordan verktøyet skriver Følge i en importert
  post når et forhold i `FORHOLD_FJERNET_ETTER_MERGE` fjernes, er ikke kontrollert. Kjeden er
  valgt etter temaet der målet ikke står i «Kjedene» (EO-U2, OV-U2). For MM-U8 er «Sendte brev
  og regelendring» valgt fordi MM-U9, som opphevet MM-U4, står der. Fordelingen er kontrollert
  av en subagent mot hovedregelen ordrett og kildene (PR #1595); rettingene etter kontrollen er
  ikke kontrollert på nytt.
- **Avvik i README.** «Etter merge» i [README](README.md) nevner bare `FORHOLD_FOERT_ETTER_MERGE`.
  Begge listene finnes i `vedtaksregister.py`, men det er `FORHOLD_FJERNET_ETTER_MERGE` som lar et
  forhold fjernes, så unntaket i README viser til feil liste.
