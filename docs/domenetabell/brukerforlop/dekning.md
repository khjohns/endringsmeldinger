<!-- Generert av `node kjerne/tester/brukerforloep.ts --skriv` fra forløpsfilene. Rett i forløpsfilene, ikke her. -->

# Dekningsoversikten for brukerforløpene

Formatet og arbeidsregelen står i [README](README.md).

| Forløp | Brukerhistorie | Status | Prøvd i | Venter på | Bevis-saker | Bestilling |
| --- | --- | --- | --- | --- | --- | --- |
| [BF-01](BF-01.json) BH påberoper at vederlagsvarselet kom for sent, og TE godtar svaret | BH vurderer varslingen og beløpet i TEs vederlagskrav, kontrollerer brevet og sender svaret. TE leser svaret, forstår at BH prinsipalt mener kravet er tapt og subsidiært godtar 60 000 kr, og godtar svaret. | kjørbar | kjernen i minnet, testbasen, demoruta, saksruta, varden | — | F-MM-V-34-1-2-nei | — |
| [BF-01V](BF-01V.json) BF-01 i Varden: BH svarer på vederlagskravet, og TE godtar svaret | Samme sak som BF-01, i den nye visningen. BH leser vederlagskravet ved siden av skjemaet, svarer på varslingen og beløpet, ser brevet også før alt er besvart, kontrollerer det og sender det, og ser leveringen for seg. TE leser svaret slik det ble sendt, ser virkningen av aksepten og godtar svaret. | planlagt | — | #1046 | — | [BF-01.md](BF-01.md) |
| [BF-02A](BF-02A.json) TE korrigerer datoen pålegget ble mottatt | TE har oppgitt feil dato for når pålegget ble mottatt, og BH har påberopt at varselet kom for sent. TE korrigerer datoen i et eget brev som viser til brevet med opplysningen. Brevet er ikke en ny kravversjon og avslår ikke BHs svar. BH ser brevet, svaret står med virkningen det hadde, og sporet venter ikke på et nytt svar. | kjørbar | kjernen i minnet, testbasen, demoruta | — | — | [BF-02A.md](BF-02A.md) |
| [BF-02B](BF-02B.json) TE sender en ny kravversjon og sier sitt standpunkt til svaret i begrunnelsen | TE er uenig i BHs svar og sender en ny kravversjon som endrer kravet. Brevet sier at kravet erstatter den tidligere kravversjonen, og at TEs standpunkt til BHs svar i brevet med svaret fremgår av begrunnelsen. Henvisningene bruker merkingen på brevene. Skjemaet minner TE før sending på å presisere om TE aksepterer, avslår eller tar forbehold knyttet til et tilbud i svaret, og sier at svaret ikke kan godtas her når den nye versjonen er sendt. Sender TE kravet utenfor løsningen og legger det til som korrespondanse med kategorien krav, fyller TE ut kravskjemaet, og løsningen lager ingen brevtekst. | planlagt | — | #1379, #1308, #807 | — | — |
| [BF-02C](BF-02C.json) TE vil rette datoen i en ny versjon av påberopelsen og blir vist til korrigeringen | TE vil rette datoen pålegget ble mottatt og begynner på en ny versjon av grunnlagskravet. Datoen kan ikke endres i en ny versjon, som gjengir TEs siste opplysning. Skjemaet anbefaler korrigeringen, og TE sender den i stedet. En ny versjon etter korrigeringen gjengir den nye datoen med henvisning til brevet med korrigeringen. | kjørbar | kjernen i minnet, testbasen, demoruta | — | — | — |
| [BF-02D](BF-02D.json) TE korrigerer datoen pålegget ble mottatt i en lukket sak | BH har påberopt at varselet kom for sent og godtatt forholdet subsidiært. TE har godtatt svaret, og saken er lukket. TE korrigerer datoen i et eget brev. Saken står lukket, utfallet endres ikke, og BH kan ta stilling til opplysningen i et innlegg. | kjørbar | kjernen i minnet, testbasen, demoruta | — | F-MM-KORR1 | — |
| [BF-03](BF-03.json) TE er uenig i svaret og sier i et innlegg at varselet kom i tide | TE har fått BHs svar, der BH prinsipalt gjør gjeldende at varselet kom for sent og subsidiært godkjenner et beløp. TE er uenig, ser hva hver vei videre gjør med svaret, og sier i et innlegg som viser til svaret at varselet kom i tide. Innlegget endrer ikke svaret, og TE kan fortsatt godta det. Etter en aksept kan TE fortsatt sende innlegg. | planlagt | — | #1381, #1377, #1379, #807 | — | [BF-03.md](BF-03.md) |
| [BF-04](BF-04.json) BH avslår forholdet og påberoper at vederlagsvarselet kom for sent | BH har svart at byggherren ikke har risikoen for forholdet, og svarer på vederlagskravet. BH påberoper at varselet etter punkt 34.1.2 kom for sent og godkjenner subsidiært 60 000 kr. BH ser hvilke innsigelser beløpet bygger på før svaret er ferdig. TE leser svaret og forstår at 60 000 kr bare gjelder hvis verken svaret på forholdet eller påberopelsen av at varselet kom for sent fører fram. | kjørbar | kjernen i minnet, testbasen, demoruta, saksruta, varden | — | — | — |
| [BF-05](BF-05.json) TE oppretter saken og påberoper forholdet | TE har fått et pålegg som TE mener er en irregulær endring. TE velger «Nytt krav om endringsordre», velger forholdet, skriver tittelen på saken og beskrivelsen av pålegget, oppgir datoen pålegget ble mottatt og kontrollerer brevet før det sendes, så kravet ikke tapes for sent varsel etter punkt 32.2. Før sending ser TE at forholdet står fast. Etter sendingen står saken med påberopelsen sendt og venter på BHs svar. | kjørbar | kjernen i minnet, testbasen, demoruta, saksruta, varden | — | — | [BF-05.md](BF-05.md) |
| [BF-06](BF-06.json) BH gjør opp én eller flere KOE-saker med en endringsordre, og TE tar stilling til den | BH godkjenner grunnlaget i en KOE-sak, og svaret er en endringsordre etter kontrakten. BH velger om endringsordren i EO-saken sendes samtidig, eller senere sammen med andre KOE-saker. I endringsordren gir BH vederlag og frist per sak, eller samlet for saker som henger sammen. Før sending ser BH hvilke saker endringsordren lukker, hvilke spor som ikke har registrert enighet, og hvilken verdi godkjenningen regnes av. TE ser hvert utsagn og sakene det gjelder, godtar eller bestrider det, og fører det som ikke er avklart, videre i en ny KOE. | planlagt | — | #1525, #1519 | — | [BF-06.md](BF-06.md) |
| [BF-07](BF-07.json) Brevhodet viser under Deres ref. hvilke av motpartens brev brevet tar stilling til | Samme sak som BF-01. Hver part leser et brev fra motparten og ser under Deres ref. hvilke av sine egne brev det svarer på, godtar, bestrider eller ellers gjelder, med merkingen fra hvert av dem. Før sending ser avsenderen i brevkontrollen den samme Deres ref. som fryses med brevet. Et brev som ikke tar stilling til noe brev fra motparten, har ingen koder under Deres ref. | planlagt | — | #1497 | — | [BF-07.md](BF-07.md) |
| [BF-10](BF-10.json) TE oppdaterer påberopelsen med en ny versjon | TE vil utdype beskrivelsen av forholdet og si sitt standpunkt til byggherrens svar. TE sender en ny versjon av påberopelsen. Forholdet, hjemmelen og datoen står fast, med veien til korrigeringen av datoen og til en ny sak. Brevet sier hvilket brev den nye versjonen erstatter og, når byggherren har svart, at TEs standpunkt til svaret fremgår av begrunnelsen. Sporet venter på nytt svar, og svaret på den tidligere versjonen kan ikke godtas i løsningen. | planlagt | — | #1615, #1379 | — | [BF-10.md](BF-10.md) |
| [BF-14](BF-14.json) TE krever vederlag med kravposter, oppgjørsform og PNS per post, og BH svarer per post | TE deler vederlagsjusteringen i kravposter med hver sin oppgjørsform og eventuelt PNS, og ser før sending hvilke poster som er tilbud etter punkt 34.2.1. I en ny versjon står alle postene som ikke er trukket, og en post TE tar ut, trekkes uttrykkelig. BH svarer per kravpost, med varselinnsigelsene, oppgjørsformen og beløpet i den rekkefølgen, og ser trappen per post og lagene samlet før svaret sendes. | planlagt | — | #1663, #1299, #1294, #1292, #1434, #1290 | — | [BF-14.md](BF-14.md) |
| [BF-20](BF-20.json) TE krever fristforlengelse per frist, og BH svarer per frist | TE varsler etter punkt 33.4 med kravet eller for seg, angir dagene for hver frist i kontrakten forholdet rammer, ser gjeldende og ny frist og rekkefølgen fristene får, og begrunner kravet. Når byggherren har bedt om dagene etter punkt 33.6.2, svarer TE med dagene eller med en begrunnelse for hvorfor de ennå ikke kan beregnes. I en ny versjon står alle fristene, og en frist TE tar ut, trekkes uttrykkelig. BH svarer på varselet, spesifiseringen og hindringen for hele kravet og på dagene per frist, og ser lagene samlet før svaret sendes. | planlagt | — | #1427 | — | [BF-20.md](BF-20.md) |

## Kildene

Hvert vedtak og hver rad i domenetabellen forløpene viser til, og hvor. En kontroll
kjøres i CI. En forståelse prøves manuelt og i brukertest. Et planlagt forløp bygger
på kilden, men har ingen kontroller ennå.

| Kilde | Kontroller | Forståelse | Planlagt |
| --- | --- | --- | --- |
| [B-15](../../plans/vedtak.md#b-15) | — | — | BF-01V |
| [B-17](../../plans/vedtak.md#b-17) | — | — | BF-06, BF-14, BF-20 |
| [DL-U2](../../plans/vedtak.md#dl-u2) | — | — | BF-06, BF-07 |
| [DL-U6](../../plans/vedtak.md#dl-u6) | — | — | BF-06 |
| [EO-U3](../../plans/vedtak.md#eo-u3) | — | — | BF-03, BF-06 |
| [EO-U4](../../plans/vedtak.md#eo-u4) | — | — | BF-06 |
| [EO-U8](../../plans/vedtak.md#eo-u8) | — | — | BF-06 |
| [EO-U11](../../plans/vedtak.md#eo-u11) | — | — | BF-06 |
| [EO-U12](../../plans/vedtak.md#eo-u12) | — | — | BF-06 |
| [EO-U13](../../plans/vedtak.md#eo-u13) | — | — | BF-01V, BF-06 |
| [EO-U14](../../plans/vedtak.md#eo-u14) | — | — | BF-06 |
| [EO-U15](../../plans/vedtak.md#eo-u15) | — | — | BF-06 |
| [EO-U16](../../plans/vedtak.md#eo-u16) | — | — | BF-06 |
| [EO-U17](../../plans/vedtak.md#eo-u17) | — | — | BF-06 |
| [EO-U18](../../plans/vedtak.md#eo-u18) | — | — | BF-06 |
| [EO-U19](../../plans/vedtak.md#eo-u19) | — | — | BF-06 |
| [EO-U20](../../plans/vedtak.md#eo-u20) | — | — | BF-06 |
| [EO-U21](../../plans/vedtak.md#eo-u21) | — | — | BF-06 |
| [EO-U22](../../plans/vedtak.md#eo-u22) | — | — | BF-06 |
| [EO-U23](../../plans/vedtak.md#eo-u23) | — | — | BF-06 |
| [EO-U24](../../plans/vedtak.md#eo-u24) | — | — | BF-06 |
| [EO-U25](../../plans/vedtak.md#eo-u25) | — | — | BF-06 |
| [EO-U26](../../plans/vedtak.md#eo-u26) | — | — | BF-06 |
| [EO-U27](../../plans/vedtak.md#eo-u27) | — | — | BF-06 |
| [EO-U28](../../plans/vedtak.md#eo-u28) | — | — | BF-06 |
| [EO-U29](../../plans/vedtak.md#eo-u29) | — | — | BF-06 |
| [EO-U30](../../plans/vedtak.md#eo-u30) | — | — | BF-06 |
| [EO-U31](../../plans/vedtak.md#eo-u31) | — | — | BF-06 |
| [EO-U32](../../plans/vedtak.md#eo-u32) | — | — | BF-06 |
| [EO-U33](../../plans/vedtak.md#eo-u33) | — | — | BF-06 |
| [EO-U34](../../plans/vedtak.md#eo-u34) | — | — | BF-03, BF-06 |
| [EO-U35](../../plans/vedtak.md#eo-u35) | — | — | BF-06 |
| [EO-U36](../../plans/vedtak.md#eo-u36) | — | — | BF-06 |
| [EO-U37](../../plans/vedtak.md#eo-u37) | — | — | BF-06 |
| [EO-U38](../../plans/vedtak.md#eo-u38) | — | — | BF-03, BF-06, BF-10, BF-14 |
| [FO-U1](../../plans/vedtak.md#fo-u1) | — | — | BF-06 |
| [FO-U8](../../plans/vedtak.md#fo-u8) | — | — | BF-06 |
| [GFK-U7](../../plans/vedtak.md#gfk-u7) | — | — | BF-06 |
| [GR-U7](../../plans/vedtak.md#gr-u7) | BF-01 forholdet-er-godkjent, BF-01 bh-har-mottatt-vederlagskravet, BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret, BF-04 forholdet-er-avslaatt, BF-04 bh-har-mottatt-vederlagskravet, BF-04 te-har-mottatt-svaret | BF-01 forholdet-er-godkjent, BF-01 bh-har-mottatt-vederlagskravet, BF-04 forholdet-er-avslaatt | BF-01V, BF-14 |
| [GR-U11](../../plans/vedtak.md#gr-u11) | — | BF-05 start | — |
| [GR-U13](../../plans/vedtak.md#gr-u13) | — | — | BF-06 |
| [GR-U14](../../plans/vedtak.md#gr-u14) | — | — | BF-06 |
| [GR-U15](../../plans/vedtak.md#gr-u15) | BF-05 start | BF-05 start | — |
| [GR-U22](../../plans/vedtak.md#gr-u22) | — | BF-05 start | BF-10 |
| [GR-U27](../../plans/vedtak.md#gr-u27) | BF-02D saken-er-lukket | BF-02A te-har-mottatt-svaret, BF-02D saken-er-lukket | BF-06, BF-10 |
| [GR-U31](../../plans/vedtak.md#gr-u31) | — | BF-05 start | — |
| [GR-U32](../../plans/vedtak.md#gr-u32) | — | — | BF-06 |
| [HF-U1](../../plans/vedtak.md#hf-u1) | BF-01 te-har-mottatt-svaret, BF-04 te-har-mottatt-svaret | — | BF-01V, BF-03, BF-07 |
| [HF-U2](../../plans/vedtak.md#hf-u2) | — | — | BF-01V |
| [HF-U6](../../plans/vedtak.md#hf-u6) | — | — | BF-01V |
| [HF-U8](../../plans/vedtak.md#hf-u8) | — | — | BF-02B, BF-03 |
| [HF-U9](../../plans/vedtak.md#hf-u9) | — | BF-01 te-har-mottatt-svaret | BF-01V, BF-03 |
| [HF-U12](../../plans/vedtak.md#hf-u12) | — | — | BF-06 |
| [HF-U18](../../plans/vedtak.md#hf-u18) | — | — | BF-03 |
| [HF-U21](../../plans/vedtak.md#hf-u21) | — | — | BF-10 |
| [HF-U22](../../plans/vedtak.md#hf-u22) | — | — | BF-14 |
| [HF-U23](../../plans/vedtak.md#hf-u23) | — | — | BF-10 |
| [HF-U28](../../plans/vedtak.md#hf-u28) | — | — | BF-14 |
| KA-01 | BF-01 start, BF-01 bh-har-mottatt-vederlagskravet, BF-04 start, BF-04 bh-har-mottatt-vederlagskravet | — | — |
| [KA-U1](../../plans/vedtak.md#ka-u1) | BF-01 te-har-godtatt-svaret | BF-01 te-har-mottatt-svaret | BF-01V, BF-03, BF-06, BF-20 |
| [KA-U2](../../plans/vedtak.md#ka-u2) | BF-01 bh-har-mottatt-vederlagskravet, BF-04 bh-har-mottatt-vederlagskravet | — | — |
| [KA-U4](../../plans/vedtak.md#ka-u4) | BF-01 te-har-mottatt-svaret, BF-04 te-har-mottatt-svaret | — | BF-20 |
| [KA-U8](../../plans/vedtak.md#ka-u8) | — | — | BF-20 |
| [KA-U10](../../plans/vedtak.md#ka-u10) | BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret, BF-04 te-har-mottatt-svaret | BF-01 te-har-godtatt-svaret | BF-01V, BF-03, BF-07 |
| [KA-U13](../../plans/vedtak.md#ka-u13) | — | — | BF-06 |
| [KA-U14](../../plans/vedtak.md#ka-u14) | — | — | BF-06 |
| [KA-U16](../../plans/vedtak.md#ka-u16) | — | — | BF-01V |
| [KA-U19](../../plans/vedtak.md#ka-u19) | — | — | BF-01V, BF-10 |
| [KA-U24](../../plans/vedtak.md#ka-u24) | — | — | BF-01V |
| [KA-U31](../../plans/vedtak.md#ka-u31) | — | — | BF-01V |
| [KA-U33](../../plans/vedtak.md#ka-u33) | — | — | BF-20 |
| [KA-U41](../../plans/vedtak.md#ka-u41) | — | — | BF-01V |
| [KA-U43](../../plans/vedtak.md#ka-u43) | — | — | BF-01V |
| [KA-U45](../../plans/vedtak.md#ka-u45) | — | — | BF-03, BF-06 |
| [KA-U46](../../plans/vedtak.md#ka-u46) | — | — | BF-01V |
| [KA-U47](../../plans/vedtak.md#ka-u47) | — | — | BF-01V |
| [KA-U51](../../plans/vedtak.md#ka-u51) | — | — | BF-10, BF-14 |
| [KA-U52](../../plans/vedtak.md#ka-u52) | — | BF-02C te-vil-sende-ny-versjon | BF-10, BF-14 |
| [KA-U53](../../plans/vedtak.md#ka-u53) | — | — | BF-14 |
| [KA-U54](../../plans/vedtak.md#ka-u54) | — | — | BF-14 |
| [KA-U55](../../plans/vedtak.md#ka-u55) | — | — | BF-14 |
| [KA-U56](../../plans/vedtak.md#ka-u56) | — | — | BF-14, BF-20 |
| [KA-U57](../../plans/vedtak.md#ka-u57) | — | — | BF-14 |
| [KA-U59](../../plans/vedtak.md#ka-u59) | — | — | BF-14 |
| [KA-U60](../../plans/vedtak.md#ka-u60) | — | — | BF-14 |
| [KA-U61](../../plans/vedtak.md#ka-u61) | — | — | BF-14 |
| [KA-U62](../../plans/vedtak.md#ka-u62) | — | — | BF-14 |
| [KA-U63](../../plans/vedtak.md#ka-u63) | — | — | BF-14 |
| [KA-U64](../../plans/vedtak.md#ka-u64) | — | — | BF-14 |
| [KA-U65](../../plans/vedtak.md#ka-u65) | — | — | BF-14 |
| [KA-U66](../../plans/vedtak.md#ka-u66) | — | — | BF-14 |
| [KA-U67](../../plans/vedtak.md#ka-u67) | — | — | BF-14 |
| [KA-U68](../../plans/vedtak.md#ka-u68) | — | — | BF-14 |
| [KA-U69](../../plans/vedtak.md#ka-u69) | — | — | BF-14 |
| [KA-U70](../../plans/vedtak.md#ka-u70) | — | — | BF-14 |
| [KA-U71](../../plans/vedtak.md#ka-u71) | — | — | BF-14 |
| [KA-U72](../../plans/vedtak.md#ka-u72) | — | — | BF-14 |
| [KT-U3](../../plans/vedtak.md#kt-u3) | — | BF-05 paaberopelsen-er-sendt | — |
| [KT-U6](../../plans/vedtak.md#kt-u6) | — | BF-05 paaberopelsen-er-sendt | — |
| [KT-U7](../../plans/vedtak.md#kt-u7) | — | BF-05 start | — |
| [KT-U10](../../plans/vedtak.md#kt-u10) | — | BF-05 start | — |
| [KT-U11](../../plans/vedtak.md#kt-u11) | BF-05 start, BF-05 paaberopelsen-er-sendt | BF-05 start | — |
| [LV-U1](../../plans/vedtak.md#lv-u1) | — | — | BF-01V, BF-07 |
| [LV-U2](../../plans/vedtak.md#lv-u2) | — | — | BF-01V, BF-07 |
| [LV-U3](../../plans/vedtak.md#lv-u3) | — | — | BF-01V |
| [LV-U4](../../plans/vedtak.md#lv-u4) | — | BF-05 start | BF-01V |
| [LV-U7](../../plans/vedtak.md#lv-u7) | — | — | BF-01V |
| [LV-U9](../../plans/vedtak.md#lv-u9) | — | BF-05 paaberopelsen-er-sendt | BF-01V |
| [LV-U15](../../plans/vedtak.md#lv-u15) | — | — | BF-06 |
| [LV-U16](../../plans/vedtak.md#lv-u16) | — | — | BF-01V |
| [LV-U18](../../plans/vedtak.md#lv-u18) | — | — | BF-07 |
| [LV-U23](../../plans/vedtak.md#lv-u23) | — | — | BF-07 |
| [LV-U24](../../plans/vedtak.md#lv-u24) | — | — | BF-06 |
| [LV-U25](../../plans/vedtak.md#lv-u25) | — | — | BF-01V |
| [LV-U27](../../plans/vedtak.md#lv-u27) | BF-01 forholdet-er-godkjent, BF-01 bh-har-mottatt-vederlagskravet, BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret | — | BF-07 |
| [LV-U28](../../plans/vedtak.md#lv-u28) | — | — | BF-07 |
| [LV-U31](../../plans/vedtak.md#lv-u31) | — | — | BF-01V |
| [LV-U32](../../plans/vedtak.md#lv-u32) | — | — | BF-01V |
| [LV-U35](../../plans/vedtak.md#lv-u35) | — | BF-02A te-har-mottatt-svaret, BF-05 start | — |
| [LV-U39](../../plans/vedtak.md#lv-u39) | — | — | BF-01V |
| [LV-U41](../../plans/vedtak.md#lv-u41) | — | BF-01 forholdet-er-godkjent, BF-01 bh-har-mottatt-vederlagskravet, BF-04 forholdet-er-avslaatt, BF-04 bh-har-mottatt-vederlagskravet, BF-04 te-har-mottatt-svaret, BF-05 start | BF-01V, BF-10 |
| [LV-U42](../../plans/vedtak.md#lv-u42) | — | — | BF-07, BF-14 |
| [LV-U43](../../plans/vedtak.md#lv-u43) | — | BF-05 start | — |
| [LV-U44](../../plans/vedtak.md#lv-u44) | — | — | BF-06, BF-07 |
| [LV-U45](../../plans/vedtak.md#lv-u45) | — | — | BF-07, BF-14 |
| [LV-U46](../../plans/vedtak.md#lv-u46) | — | — | BF-07 |
| [LV-U47](../../plans/vedtak.md#lv-u47) | — | — | BF-07 |
| [LV-U48](../../plans/vedtak.md#lv-u48) | — | — | BF-07 |
| [LV-U49](../../plans/vedtak.md#lv-u49) | BF-01 forholdet-er-godkjent, BF-01 bh-har-mottatt-vederlagskravet, BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret | — | BF-07 |
| [LV-U50](../../plans/vedtak.md#lv-u50) | — | — | BF-07, BF-10 |
| [LV-U51](../../plans/vedtak.md#lv-u51) | — | — | BF-07 |
| [LV-U52](../../plans/vedtak.md#lv-u52) | — | — | BF-02B, BF-03, BF-07, BF-10 |
| [LV-U53](../../plans/vedtak.md#lv-u53) | — | BF-02A te-har-mottatt-svaret, BF-02C ny-versjon-etter-korrigeringen | BF-02B, BF-03, BF-07, BF-10 |
| [LV-U54](../../plans/vedtak.md#lv-u54) | — | — | BF-10 |
| [LV-U56](../../plans/vedtak.md#lv-u56) | — | BF-02A korrigeringen-er-sendt, BF-02C ny-versjon-etter-korrigeringen | BF-10 |
| [LV-U57](../../plans/vedtak.md#lv-u57) | — | BF-02A korrigeringen-er-sendt, BF-05 start | BF-10 |
| [LV-U66](../../plans/vedtak.md#lv-u66) | — | — | BF-01V |
| [LV-U67](../../plans/vedtak.md#lv-u67) | — | — | BF-01V, BF-06 |
| [LV-U68](../../plans/vedtak.md#lv-u68) | — | — | BF-01V, BF-06 |
| [MM-U1](../../plans/vedtak.md#mm-u1) | — | — | BF-20 |
| [MM-U9](../../plans/vedtak.md#mm-u9) | BF-01 te-har-mottatt-svaret, BF-04 te-har-mottatt-svaret | — | BF-01V, BF-07 |
| [MM-U12](../../plans/vedtak.md#mm-u12) | — | — | BF-01V, BF-03, BF-06 |
| [MM-U21](../../plans/vedtak.md#mm-u21) | — | BF-05 start | BF-06 |
| [MM-U23](../../plans/vedtak.md#mm-u23) | — | — | BF-01V |
| [MM-U25](../../plans/vedtak.md#mm-u25) | — | — | BF-01V |
| [MM-U28](../../plans/vedtak.md#mm-u28) | — | — | BF-01V |
| [MM-U32](../../plans/vedtak.md#mm-u32) | — | — | BF-01V |
| [MM-U33](../../plans/vedtak.md#mm-u33) | — | — | BF-01V, BF-03, BF-14 |
| [MM-U34](../../plans/vedtak.md#mm-u34) | BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret, BF-04 te-har-mottatt-svaret | BF-01 te-har-mottatt-svaret, BF-02C te-vil-sende-ny-versjon | BF-01V, BF-02B, BF-03, BF-06, BF-10 |
| [MM-U35](../../plans/vedtak.md#mm-u35) | — | BF-04 te-har-mottatt-svaret | BF-01V, BF-03, BF-06 |
| [MM-U36](../../plans/vedtak.md#mm-u36) | — | — | BF-01V, BF-03 |
| [MM-U37](../../plans/vedtak.md#mm-u37) | — | — | BF-01V, BF-06 |
| [MM-U38](../../plans/vedtak.md#mm-u38) | — | — | BF-06 |
| [MM-U41](../../plans/vedtak.md#mm-u41) | — | BF-05 start | BF-06 |
| [MM-U47](../../plans/vedtak.md#mm-u47) | — | BF-02A te-har-mottatt-svaret, BF-02D korrigeringen-er-sendt | BF-10 |
| [MM-U50](../../plans/vedtak.md#mm-u50) | BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret, BF-04 te-har-mottatt-svaret | BF-01 te-har-godtatt-svaret, BF-02A korrigeringen-er-sendt | BF-01V, BF-03, BF-06, BF-07 |
| [MM-U51](../../plans/vedtak.md#mm-u51) | BF-02D korrigeringen-er-sendt | BF-02A te-har-mottatt-svaret, BF-02D saken-er-lukket, BF-02D korrigeringen-er-sendt | — |
| [MM-U52](../../plans/vedtak.md#mm-u52) | BF-02A te-har-mottatt-svaret, BF-02A korrigeringen-er-sendt, BF-02C te-vil-sende-ny-versjon, BF-02C ny-versjon-etter-korrigeringen, BF-02D korrigeringen-er-sendt | BF-02A te-har-mottatt-svaret, BF-02A korrigeringen-er-sendt, BF-02C te-vil-sende-ny-versjon, BF-02C ny-versjon-etter-korrigeringen, BF-02D saken-er-lukket, BF-02D korrigeringen-er-sendt, BF-05 start | BF-06, BF-10 |
| [MM-U54](../../plans/vedtak.md#mm-u54) | — | — | BF-10 |
| [OV-U1](../../plans/vedtak.md#ov-u1) | — | — | BF-06 |
| [OV-U4](../../plans/vedtak.md#ov-u4) | — | — | BF-01V, BF-07 |
| [OV-U5](../../plans/vedtak.md#ov-u5) | — | BF-05 start | — |
| [OV-U6](../../plans/vedtak.md#ov-u6) | — | — | BF-06 |
| [OV-U7](../../plans/vedtak.md#ov-u7) | — | — | BF-03 |
| [OV-U11](../../plans/vedtak.md#ov-u11) | — | BF-05 start | — |
| [OV-U15](../../plans/vedtak.md#ov-u15) | — | — | BF-14 |
| [OV-U18](../../plans/vedtak.md#ov-u18) | — | — | BF-01V |
| [OV-U20](../../plans/vedtak.md#ov-u20) | — | — | BF-01V |
| [OV-U27](../../plans/vedtak.md#ov-u27) | BF-01 te-har-mottatt-svaret, BF-04 te-har-mottatt-svaret | BF-01 bh-har-mottatt-vederlagskravet, BF-01 te-har-mottatt-svaret, BF-04 te-har-mottatt-svaret | BF-14 |
| [OV-U28](../../plans/vedtak.md#ov-u28) | — | — | BF-01V |
| [OV-U30](../../plans/vedtak.md#ov-u30) | — | — | BF-14 |
| [OV-U31](../../plans/vedtak.md#ov-u31) | — | — | BF-14 |
| [OV-U32](../../plans/vedtak.md#ov-u32) | BF-04 te-har-mottatt-svaret | BF-04 bh-har-mottatt-vederlagskravet, BF-04 te-har-mottatt-svaret | BF-20 |
| [OV-U33](../../plans/vedtak.md#ov-u33) | BF-04 te-har-mottatt-svaret | BF-04 bh-har-mottatt-vederlagskravet | BF-20 |
| [OV-U43](../../plans/vedtak.md#ov-u43) | — | — | BF-06 |
| [OV-U52](../../plans/vedtak.md#ov-u52) | — | BF-05 start | — |
| [OV-U54](../../plans/vedtak.md#ov-u54) | BF-01 te-har-godtatt-svaret, BF-02C te-vil-sende-ny-versjon | BF-01 te-har-mottatt-svaret | BF-02B, BF-03 |
| [OV-U55](../../plans/vedtak.md#ov-u55) | — | BF-05 start | — |
| [OV-U57](../../plans/vedtak.md#ov-u57) | — | BF-05 start | BF-10 |
| [OV-U62](../../plans/vedtak.md#ov-u62) | — | — | BF-01V |
| [OV-U63](../../plans/vedtak.md#ov-u63) | — | — | BF-20 |
| [OV-U69](../../plans/vedtak.md#ov-u69) | — | — | BF-06 |
| [OV-U70](../../plans/vedtak.md#ov-u70) | — | — | BF-01V |
| [OV-U73](../../plans/vedtak.md#ov-u73) | — | — | BF-14 |
| [OV-U75](../../plans/vedtak.md#ov-u75) | — | BF-01 bh-har-mottatt-vederlagskravet, BF-04 bh-har-mottatt-vederlagskravet, BF-04 te-har-mottatt-svaret | BF-01V |
| [OV-U76](../../plans/vedtak.md#ov-u76) | — | BF-01 forholdet-er-godkjent, BF-01 bh-har-mottatt-vederlagskravet, BF-04 forholdet-er-avslaatt, BF-04 bh-har-mottatt-vederlagskravet, BF-04 te-har-mottatt-svaret, BF-05 start | BF-01V |
| [OV-U77](../../plans/vedtak.md#ov-u77) | — | BF-05 start | — |
| [OV-U78](../../plans/vedtak.md#ov-u78) | — | BF-05 start | BF-01V |
| [OV-U79](../../plans/vedtak.md#ov-u79) | — | BF-05 start | BF-01V, BF-02B, BF-03, BF-14 |
| [OV-U80](../../plans/vedtak.md#ov-u80) | — | BF-05 start | BF-02B, BF-03, BF-06, BF-07, BF-14 |
| [OV-U81](../../plans/vedtak.md#ov-u81) | — | — | BF-01V, BF-03 |
| [OV-U82](../../plans/vedtak.md#ov-u82) | — | BF-05 start | — |
| [OV-U83](../../plans/vedtak.md#ov-u83) | — | — | BF-01V |
| [OV-U84](../../plans/vedtak.md#ov-u84) | — | BF-05 start | BF-07 |
| [OV-U89](../../plans/vedtak.md#ov-u89) | — | — | BF-14 |
| [OV-U94](../../plans/vedtak.md#ov-u94) | — | — | BF-14 |
| [OV-U95](../../plans/vedtak.md#ov-u95) | — | — | BF-14 |
| [VS-U2](../../plans/vedtak.md#vs-u2) | — | — | BF-14, BF-20 |
| [VS-U3](../../plans/vedtak.md#vs-u3) | BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret, BF-04 te-har-mottatt-svaret | BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret | BF-14, BF-20 |
| [VS-U4](../../plans/vedtak.md#vs-u4) | — | — | BF-14, BF-20 |
| [VS-U9](../../plans/vedtak.md#vs-u9) | — | — | BF-03 |
| [VS-U10](../../plans/vedtak.md#vs-u10) | — | — | BF-20 |
| [VS-U11](../../plans/vedtak.md#vs-u11) | — | — | BF-01V |
| [VS-U15](../../plans/vedtak.md#vs-u15) | — | — | BF-20 |
| [VS-U16](../../plans/vedtak.md#vs-u16) | — | — | BF-20 |
| [VS-U17](../../plans/vedtak.md#vs-u17) | — | — | BF-20 |
| [VS-U18](../../plans/vedtak.md#vs-u18) | — | — | BF-20 |
| [VS-U19](../../plans/vedtak.md#vs-u19) | — | — | BF-20 |
| [VS-U20](../../plans/vedtak.md#vs-u20) | — | — | BF-20 |
| [VS-U23](../../plans/vedtak.md#vs-u23) | — | — | BF-07 |
| [VS-U24](../../plans/vedtak.md#vs-u24) | — | — | BF-03 |
| [VS-U25](../../plans/vedtak.md#vs-u25) | — | BF-05 start | — |
| [VS-U26](../../plans/vedtak.md#vs-u26) | — | BF-05 start | BF-10 |
| [VS-U27](../../plans/vedtak.md#vs-u27) | — | — | BF-07 |
| [VS-U34](../../plans/vedtak.md#vs-u34) | — | BF-05 start | BF-14 |
| [VS-U35](../../plans/vedtak.md#vs-u35) | — | — | BF-03 |
| [VS-U38](../../plans/vedtak.md#vs-u38) | — | BF-05 start | BF-14 |
| [VS-U39](../../plans/vedtak.md#vs-u39) | — | BF-05 start | — |
| [VS-U43](../../plans/vedtak.md#vs-u43) | BF-02A te-har-mottatt-svaret, BF-05 paaberopelsen-er-sendt | BF-02A te-har-mottatt-svaret | — |
| [VS-U46](../../plans/vedtak.md#vs-u46) | BF-02A korrigeringen-er-sendt, BF-02D korrigeringen-er-sendt | BF-02A korrigeringen-er-sendt | — |
| [VS-U47](../../plans/vedtak.md#vs-u47) | — | — | BF-14 |
| [VS-U48](../../plans/vedtak.md#vs-u48) | — | — | BF-14 |
| [VS-U49](../../plans/vedtak.md#vs-u49) | — | — | BF-14 |
| [VS-U50](../../plans/vedtak.md#vs-u50) | — | — | BF-14 |
| [VS-U51](../../plans/vedtak.md#vs-u51) | — | — | BF-14 |
| [VS-U52](../../plans/vedtak.md#vs-u52) | — | — | BF-14 |
| [VS-U53](../../plans/vedtak.md#vs-u53) | — | — | BF-14 |
| [VS-U54](../../plans/vedtak.md#vs-u54) | — | — | BF-14 |
| [VS-U57](../../plans/vedtak.md#vs-u57) | — | — | BF-14 |
