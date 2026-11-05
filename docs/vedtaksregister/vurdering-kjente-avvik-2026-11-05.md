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

## Tabellen

«Dekket av» viser til det mergede samlevedtaket som har tatt innholdet i forholdet. «Ikke» betyr at
ingen samlevedtak har gjort det. Vedtaket som opphevet målet, har likevel avgjort saken.
«Fjernes ved» sier hva som får raden til å forsvinne fra vakttesten. «Forholdet» betyr at forholdet,
og setningen i Følge det er lest av, fjernes fra posten.

| Rad | Kjede | Motsigelse | Dekket av | Fjernes ved |
| --- | --- | --- | --- | --- |
| hf-u9 snevrer inn eo-u2 | Endringsordren som omfatter KOE-sakene | Nei. Vilkåret innsnevringen gjaldt, er opphevet av MM-U34 punkt 20 | Ikke | Forholdet, eller «opphever eo-u2» i EO-U34 |
| ov-u3 bygger på eo-u2 | Kravene er avgjort, og sperren etter det | Nei. Merknaden 13.10 er avgjort av MM-U34 punkt 20 og EO-U34 punkt 5 | EO-U34 (endrer OV-U3) | Forholdet, eller «opphever eo-u2» i EO-U34 |
| hf-u9 snevrer inn eo-u5 | Endringsordren som omfatter KOE-sakene | Nei. Som raden for EO-U2 | Ikke | Forholdet, eller «opphever eo-u5» i EO-U34 |
| ka-u12 presiserer eo-u5 | Endringsordren som omfatter KOE-sakene | Nei. MM-U34 punkt 20 stryker «som oppgjort i EO-U5», og EO-U34 punkt 15 gir ny ordlyd | EO-U34 (endrer KA-U12) | Forholdet, eller «opphever eo-u5» i EO-U34 |
| ov-u3 bygger på eo-u5 | Kravene er avgjort, og sperren etter det | Nei. Som raden for EO-U2 | EO-U34 (endrer OV-U3) | Forholdet, eller «opphever eo-u5» i EO-U34 |
| ov-u43 utvider eo-u5 | Endringsordren som omfatter KOE-sakene | Nei. Følge sier selv at MM-U34 punkt 20 har endret setningen | EO-U34 (endrer OV-U43) | Forholdet, eller «opphever eo-u5» i EO-U34 |
| ov-u55 snevrer inn eo-u5 | Retting av sendt brev | Nei. MM-U34 punkt 18 opphevet forslaget sperren gjaldt | Ikke | Forholdet, eller «opphever eo-u5» i EO-U34 |
| gfk-u2 presiserer eo-u6 | Fullmakt og godkjenningskjeden | Nei. EO-U6 står bare i spørsmålet og alternativene, og EO-U34 (E11) sier at GFK-U2 står | Ikke | Forholdet, eller «opphever eo-u6» i EO-U34 |
| ov-u2 bygger på eo-u6 | Fullmakt og godkjenningskjeden | Nei. Merknaden 10.10 er satt ut av MM-U34 punkt 22 | EO-U34 (endrer OV-U2, E11) | Forholdet, eller «opphever eo-u6» i EO-U34 |
| ov-u6 bygger på eo-u6 | Endringsordren som omfatter KOE-sakene | Nei. Merknaden 13.10 er avgjort i EO-U34 punkt 43–50 | EO-U34 (samler OV-U6) | Forholdet, eller «opphever eo-u6» i EO-U34 |
| hf-u12 presiserer eo-u9 | Endringsordren som omfatter KOE-sakene | Nei. EO-U34 punkt 41 tar innholdet | EO-U34 (endrer HF-U12, E6) | Forholdet, eller «opphever eo-u9» i EO-U34 |
| ov-u6 bygger på eo-u9 | Endringsordren som omfatter KOE-sakene | Nei. EO-U34 punkt 41 og 50 gir regelen | EO-U34 (samler OV-U6) | Forholdet, eller «opphever eo-u9» i EO-U34 |
| gr-u10 presiserer gr-u2 | Grunnlaget godkjent som endringsordre | Nei. MM-U34 punkt 11 strøk bindingen i GR-U10, og resten er ikke i strid | Ikke | Forholdet |
| gr-u22 endrer gr-u2 | Grunnlagskravet: ny versjon, hjemmel og ny sak | Nei. MM-U34 punkt 11 sier det samme om hjemmelen | Ikke | Forholdet |
| hf-u9 presiserer gr-u2 | Aksept og enighet om vederlag og frist | Nei. MM-U34 punkt 10 strøk setningene som presiserte GR-U2 | Ikke | Forholdet |
| hf-u9 presiserer ka-u7 | Kravversjon, ny kravversjon og utdyping | Nei. MM-U34 punkt 10 strøk delen om KA-U7, og punkt 9 erstatter KA-U7 | Ikke | Forholdet |
| ka-u13 snevrer inn ka-u7 | Trekk og sperrene mot trekk | Nei. Sperren bygger på § 32.3 a, ikke på KA-U7, og trekkretten står i KA-U6 | Ikke | Forholdet |
| ka-u20 presiserer ka-u7 | Vilkår og forbehold i byggherrens svar | Nei. KA-U49 (E6) opphevet setningene som nevner KA-U7 | KA-U49 (endrer KA-U20) | Forholdet |
| ov-u43 utvider ka-u7 | Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid | **Ja (svak).** Prinsipp 3 og 4 forutsetter at enigheten binder, mens MM-U34 punkt 9 lar TE sende en ny kravversjon alene | Ikke. OV-U89 og MM-U45 samler bare enkeltsetninger | Samlevedtak for kjeden, så forholdet |
| lv-u31 presiserer hf-u14 | Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid | Nei. LV-U31 sier ingenting om revisjon | HF-U23 (E6, spørsmål 1) | Forholdet |
| hf-u22 presiserer hf-u17 | Akseptfristen og bortfall av byggherrens svar | Nei. HF-U23 (E5) sier at forholdet ikke gjelder lenger | HF-U23 (E5) | Forholdet |
| hf-u7 presiserer ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. KA-U46 sier at forholdet ikke har noe å virke på | KA-U46 (E1) | Forholdet |
| ka-u31 snevrer inn ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. KA-U43 endret KA-U31, og KA-U46 samler den | KA-U46 (samler KA-U31) | Forholdet |
| ka-u41 presiserer ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Henvisningen til KA-U24 gjelder samlevedtaket | KA-U46 (samler KA-U41, E1) | Forholdet |
| ov-u4 endrer ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. KA-U46 sier at ingen setning endres | KA-U46 (E5), og MM-U43 samler OV-U4 | Forholdet |
| ov-u80 bygger på ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Unntaket står i KA-U46 punkt 6 og KA-U18. Forholdet ble ført 01.11, etter opphevelsen | KA-U46 (E1), og MM-U41 samler OV-U80 | Forholdet |
| vs-u13 bygger på ka-u24 | Byggherrens begrunnelse: plikten og datokontrollen | Nei. Henvisningen gjelder samlevedtaket | KA-U46 (E1) | Forholdet |
| hf-u7 bygger på ka-u26 | Vilkår og forbehold i byggherrens svar | Nei. KA-U49 (E1) sier at merknaden ikke gjelder lenger | KA-U49 (E1, E8) | Forholdet |
| mm-u34 endrer ka-u26 | Vilkår og forbehold i byggherrens svar | Nei. Punkt 20 opphevet vilkåret før KA-U45 opphevet hele KA-U26 | KA-U49 (E5) | Forholdet |
| mm-u34 endrer ka-u28 | Kravene er avgjort, og sperren etter det | Nei. MM-U34 strøk én setning, og KA-U45 opphevet senere hele KA-U28 | Ikke | Forholdet |
| mm-u34 endrer ov-u48 | Vilkår og forbehold i byggherrens svar | Nei. OV-U69 sier at punkt 25 faller bort | KA-U49 (E5) | Forholdet |
| mm-u34 endrer ov-u49 | Vilkår og forbehold i byggherrens svar | Nei. Punkt 18 opphevet D2 før OV-U69 opphevet hele OV-U49 | KA-U49 (E5) | Forholdet |
| mm-u34 endrer ov-u51 | Datoen varslingsplikten løper fra, og kunnskapsdatoen | Nei. Forholdet peker på feil post: setningene punkt 15 stryker, står i OV-U52 | MM-U41 (opphever OV-U52, E2 og E3) | Forholdet, eller rettet til «endrer ov-u52» |
| gr-u7 presiserer ka-u5 | Aksept og enighet om vederlag og frist | Nei. HF-U9 sier det samme som GR-U7 om aksepten | Ikke. GR-U34 presiserer GR-U7, men opphever ikke KA-U5 | Forholdet |
| ov-u3 endrer ka-u3 | Kravversjon, ny kravversjon og utdyping | Nei. HF-U9 opphevet KA-U3 og tok innholdet | Ikke | Forholdet, med Følge som viser til HF-U9 |
| mm-u30 presiserer mm-u29 | Hva løsningen utleder og hva den bare viser, og passivitet | Nei. Betegnelsene sier hva som foreligger, og det strider ikke mot MM-U40 | Ikke | Forholdet |
| mm-u8 bygger på mm-u4 | Sendte brev og regelendring | **Ja.** Teksten begynner med «MM-U4 gjelder også …», og OV-U5 har endret utfallet, så regelen må leses av MM-U4, MM-U8 og OV-U5 sammen | Ikke | Samlevedtak som samler MM-U8 og OV-U5 |
| ov-u43 presiserer mm-u28 | Betegnelser, sakslisten og nøkkeltallene | Nei. «Ukjent, ikke 0» lever videre i MM-U38, og setningen er samlet i MM-U45 | MM-U45 (M4) | Forholdet, eller «opphever mm-u28» i MM-U45 |

## Tellingen

- **Motsigelser:** 2 av 38, OV-U43 mot KA-U7 (svak) og MM-U8 mot MM-U4.
- **Korrekt ført, og innholdet dekket av et merget samlevedtak:** 23, med EO-U34 (8), KA-U46
  (6), KA-U49 (5), HF-U23 (2), MM-U41 (1) og MM-U45
  (1). OV-U4 og OV-U80 er også samlet i MM-U43 og MM-U41, men telt under KA-U46.
- **Korrekt ført, men uten samlevedtak:** 13. Opphevelsen har selv tatt innholdet: MM-U34
  (9), HF-U9 (2), KA-U45 (1) og MM-U40 (1).
- **Dekket av PR #1593:** ingen.

I alle 36 radene uten motsigelse er det forholdet i posten som holder raden i lista. Det står igjen
etter en opphevelse som har tatt innholdet. Ingen av dem trenger et nytt samlevedtak.

## Forslaget

**Trinn 2, kjedene med motsigelser som gjenstår:**

1. **Vederlagsmetoden: fast sum, beregningsregel og regningsarbeid.** Prinsipp 3 og 4 i OV-U43 sier
   «partene er enige» og forutsetter at enigheten binder. MM-U34 punkt 9 lar TE sende en ny
   kravversjon alene. Kjeden har ett samlevedtak i tabellen og deler poster med de mergede
   (OV-U43, MM-U34), men ikke med utkastet i PR #1593. Den går først, fordi motsigelsen gjelder
   en regel kjernen leser.
2. **Sendte brev og regelendring,** med MM-U8 og OV-U5. MM-U8 bygger i teksten på MM-U4, og
   OV-U5 har snudd utfallet. Kjeden er ikke merget. OV-U5 står også i kjedene for sent varsel og
   for brev registrert utenfor løsningen, så den går etter at PR #1593 er merget.

Ingen andre rader i lista viser en motsigelse som venter på trinn 2. Lista over kjente avvik er
dermed ikke et fullstendig mål på kjedene med motsigelser. Motsigelsene i
[klassifiseringen](vurdering-klassifisering-2026-11-03.md#motsigelsene-i-registeret) som ikke er
forhold til et opphevet vedtak, er ikke kartlagt her, for eksempel OV-U71 mot OV-U86.

**Radene som ikke trenger et samlevedtak (36):**

- **De 23 som er dekket,** kan fjernes nå ved at forholdet tas ut av posten. Samlevedtaket har
  allerede sagt at forholdet ikke gjelder, så det trengs ikke et nytt valg. Det gjør HF-U23 i
  spørsmål 1, KA-U46 og KA-U49 i E1, EO-U34 i E6, E11 og E12, og MM-U45 i M4.
- **For de tolv radene mot EO-U2, EO-U5, EO-U6 og EO-U9** er det et alternativ at EO-U34 fører
  «opphever» for de fire målene. Det bekrefter MM-U34 punkt 20 og 22, og det fjerner alle tolv på
  én gang, også de fire uten samlevedtak (HF-U9 ×2, GFK-U2 og OV-U55).
- **De 13 uten samlevedtak** venter på trinn 3, i temaet etter kolonnen «Kjede», eller fjernes i
  samme PR som de dekkede hvis oppdragsgiver godtar at det er en ren retting av Følge (se «Åpne
  spørsmål»). Det gjelder GR-U7, GR-U10, GR-U22, HF-U9 (fire rader), KA-U13, MM-U30, MM-U34 mot
  KA-U28, OV-U3 mot KA-U3, GFK-U2 og OV-U55.

## Åpne spørsmål

1. **Fjerne forholdet uten nytt vedtak.** Er det å ta et historisk forhold ut av posten, med
   setningen i Følge, en retting som orkestratoren kan gjøre i en teknisk PR, eller må det
   følge et samlevedtak? For de 23 dekkede har et samlevedtak alt sagt at forholdet ikke gjelder.
   For de 13 andre har bare vedtaket som opphevet målet, sagt det. Anbefaling: en teknisk PR for
   de 23, og de 13 i trinn 3.
2. **«Opphever» i EO-U34 for EO-U2, EO-U5, EO-U6 og EO-U9.** Det er en endring av en vedtatt post
   og krever en vedtaks-PR. Anbefaling: bare om PR-en etter spørsmål 1 ellers ville tatt alle tolv
   radene for hånd.
3. **Vakttesten.** En regel om at posten hoppes over når den er samlet i et samlevedtak, ville
   fjernet radene for KA-U31, KA-U41, MM-U34, OV-U4, OV-U6, OV-U43 og OV-U80. Den ville også skjult
   motsigelsen i OV-U43 mot KA-U7, for OV-U43 er samlet i OV-U89 og MM-U45. Anbefaling: ikke
   endre testen.

## Verifikasjon og grenser

- **Kjørt og observert.** Hvem som opphever hvert mål, og hvilke samlevedtak som samler hver post,
  er regnet ut med `opphevet_og_samlet` og `samlevedtakene` i `vedtaksregister.py` på `4bc80a4`.
- **Lest.** Motsigelse, kjede og «dekket av» er vurdert av fire subagenter ut fra tekst og Følge.
  De har ikke lest koden. Ingen ny subagent har kontrollert vurderingene. Den svake «ja» for
  OV-U43 mot KA-U7 bør prøves i kartleggingen av kjeden.
- **Ikke kontrollert.** At en rad faktisk forsvinner fra vakttesten når forholdet fjernes, er
  lest av `forhold_til_opphevet` og ikke kjørt. Kjeden er valgt etter temaet der målet ikke står i
  «Kjedene» (EO-U2, OV-U2). For MM-U8 er «Sendte brev og regelendring» valgt fordi MM-U9, som
  opphevet MM-U4, står der. Subagenten foreslo også «Brev og varsel sendt eller registrert utenfor
  løsningen».
