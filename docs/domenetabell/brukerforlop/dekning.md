<!-- Generert av `node kjerne/tester/brukerforloep.ts --skriv` fra forløpsfilene. Rett i forløpsfilene, ikke her. -->

# Dekningsoversikten for brukerforløpene

Formatet og arbeidsregelen står i [README](README.md).

| Forløp | Brukerhistorie | Status | Prøvd i | Venter på | Bevis-saker | Bestilling |
| --- | --- | --- | --- | --- | --- | --- |
| [BF-01](BF-01.json) BH påberoper at vederlagsvarselet kom for sent, og TE godtar svaret | BH vurderer varslingen og beløpet i TEs vederlagskrav, kontrollerer brevet og sender svaret. TE leser svaret, forstår at BH prinsipalt mener kravet er tapt og subsidiært godtar 60 000 kr, og godtar svaret. | kjørbar | kjernen i minnet, testbasen, demoruta, saksruta | — | F-MM-V-34-1-2-nei | — |
| [BF-01V](BF-01V.json) BF-01 i Varden: BH svarer på vederlagskravet, og TE godtar svaret | Samme sak som BF-01, i den nye visningen. BH leser vederlagskravet ved siden av skjemaet, svarer på varslingen og beløpet, ser brevet også før alt er besvart, kontrollerer det og sender det, og ser leveringen for seg. TE leser svaret slik det ble sendt, ser virkningen av aksepten og godtar svaret. | planlagt | — | #1334, #1046 | — | [BF-01.md](BF-01.md) |
| [BF-02A](BF-02A.json) TE korrigerer datoen pålegget ble mottatt | TE har oppgitt feil dato for når pålegget ble mottatt. TE korrigerer datoen i et eget brev som viser til brevet med opplysningen. Brevet er ikke en ny kravversjon og avslår ikke BHs svar. | planlagt | — | #1308, #1309 | — | — |
| [BF-02B](BF-02B.json) TE sender en ny kravversjon som avslår tilbudet i svaret | TE er uenig i BHs svar og sender en ny kravversjon som endrer kravet. Brevet sier uttrykkelig at TE avslår BHs tilbud i svaret, og skjemaet viser før sending hva den nye kravversjonen gjør med svaret. | planlagt | — | #276 | — | — |
| [BF-02C](BF-02C.json) TE prøver å rette datoen med en ny kravversjon og blir avvist | TE vil rette datoen pålegget ble mottatt og sender en ny kravversjon der bare datoen er endret. Løsningen avviser den og viser TE til korrigeringen etter OV-U52. | planlagt | — | #1308, #1309 | — | — |
| [BF-03](BF-03.json) TE er uenig i svaret og fastholder at varselet kom i tide | TE har fått BHs svar, der BH prinsipalt gjør gjeldende at varselet kom for sent og subsidiært godtar et beløp. TE er uenig, ser hva hver vei videre gjør med svaret, protesterer mot påberopelsen uten å miste muligheten til senere å godta svaret. | planlagt | — | #1336, #276 | — | [BF-03.md](BF-03.md) |

## Kildene

Hvert vedtak og hver rad i domenetabellen forløpene viser til, og hvor. En kontroll
kjøres i CI. En forståelse prøves manuelt og i brukertest. Et planlagt forløp bygger
på kilden, men har ingen kontroller ennå.

| Kilde | Kontroller | Forståelse | Planlagt |
| --- | --- | --- | --- |
| [B-15](../../plans/vedtak.md#b-15) | — | — | BF-01V |
| [GR-U7](../../plans/vedtak.md#gr-u7) | BF-01 grunnlaget-er-godkjent, BF-01 bh-har-mottatt-vederlagskravet, BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret | BF-01 grunnlaget-er-godkjent, BF-01 bh-har-mottatt-vederlagskravet | BF-01V |
| [HF-U1](../../plans/vedtak.md#hf-u1) | BF-01 te-har-mottatt-svaret | — | BF-01V, BF-03 |
| [HF-U5](../../plans/vedtak.md#hf-u5) | — | — | BF-03 |
| [HF-U6](../../plans/vedtak.md#hf-u6) | — | — | BF-01V |
| [HF-U8](../../plans/vedtak.md#hf-u8) | — | — | BF-03 |
| [HF-U9](../../plans/vedtak.md#hf-u9) | — | BF-01 te-har-mottatt-svaret | BF-01V, BF-03 |
| [HF-U18](../../plans/vedtak.md#hf-u18) | — | — | BF-03 |
| KA-01 | BF-01 start, BF-01 bh-har-mottatt-vederlagskravet | — | — |
| [KA-U1](../../plans/vedtak.md#ka-u1) | — | BF-01 te-har-mottatt-svaret | BF-01V, BF-03 |
| [KA-U2](../../plans/vedtak.md#ka-u2) | BF-01 bh-har-mottatt-vederlagskravet | — | — |
| [KA-U4](../../plans/vedtak.md#ka-u4) | BF-01 te-har-mottatt-svaret | — | — |
| [KA-U7](../../plans/vedtak.md#ka-u7) | BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret | BF-01 te-har-mottatt-svaret | BF-03 |
| [KA-U10](../../plans/vedtak.md#ka-u10) | BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret | BF-01 te-har-godtatt-svaret | BF-03 |
| [KA-U29](../../plans/vedtak.md#ka-u29) | — | — | BF-03 |
| [KA-U31](../../plans/vedtak.md#ka-u31) | — | — | BF-01V |
| [LV-U1](../../plans/vedtak.md#lv-u1) | — | — | BF-01V |
| [LV-U2](../../plans/vedtak.md#lv-u2) | — | — | BF-01V |
| [LV-U3](../../plans/vedtak.md#lv-u3) | — | — | BF-01V |
| [LV-U4](../../plans/vedtak.md#lv-u4) | — | — | BF-01V, BF-03 |
| [LV-U7](../../plans/vedtak.md#lv-u7) | — | — | BF-01V |
| [LV-U9](../../plans/vedtak.md#lv-u9) | — | — | BF-01V |
| [LV-U16](../../plans/vedtak.md#lv-u16) | — | — | BF-01V |
| [LV-U25](../../plans/vedtak.md#lv-u25) | — | — | BF-01V |
| [MM-U3](../../plans/vedtak.md#mm-u3) | — | — | BF-03 |
| [MM-U9](../../plans/vedtak.md#mm-u9) | BF-01 te-har-mottatt-svaret | — | BF-01V |
| [MM-U12](../../plans/vedtak.md#mm-u12) | — | — | BF-01V |
| [MM-U23](../../plans/vedtak.md#mm-u23) | — | — | BF-01V |
| [MM-U28](../../plans/vedtak.md#mm-u28) | — | — | BF-01V |
| [MM-U32](../../plans/vedtak.md#mm-u32) | — | — | BF-01V |
| [OV-U4](../../plans/vedtak.md#ov-u4) | — | — | BF-03 |
| [OV-U7](../../plans/vedtak.md#ov-u7) | — | — | BF-03 |
| [OV-U27](../../plans/vedtak.md#ov-u27) | BF-01 te-har-mottatt-svaret | BF-01 bh-har-mottatt-vederlagskravet, BF-01 te-har-mottatt-svaret | — |
| [OV-U28](../../plans/vedtak.md#ov-u28) | — | — | BF-01V |
| [OV-U52](../../plans/vedtak.md#ov-u52) | — | — | BF-02A, BF-02C |
| [OV-U54](../../plans/vedtak.md#ov-u54) | BF-01 te-har-godtatt-svaret | BF-01 te-har-mottatt-svaret | BF-02B, BF-02C, BF-03 |
| [OV-U64](../../plans/vedtak.md#ov-u64) | — | — | BF-03 |
| [OV-U65](../../plans/vedtak.md#ov-u65) | — | — | BF-03 |
| [OV-U66](../../plans/vedtak.md#ov-u66) | — | — | BF-03 |
| [VS-U1](../../plans/vedtak.md#vs-u1) | — | — | BF-03 |
| [VS-U3](../../plans/vedtak.md#vs-u3) | BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret | BF-01 te-har-mottatt-svaret, BF-01 te-har-godtatt-svaret | BF-03 |
| [VS-U9](../../plans/vedtak.md#vs-u9) | — | — | BF-03 |
