<!-- Generert av `node kjerne/tester/brukerforloep.ts --skriv` fra forløpsfilene. Rett i forløpsfilene, ikke her. -->

# Dekningsoversikten for brukerforløpene

Formatet og arbeidsregelen står i [README](README.md).

| Forløp | Brukerhistorie | Status | Prøvd i | Venter på | Bevis-saker | Bestilling |
| --- | --- | --- | --- | --- | --- | --- |
| [BF-01](BF-01.json) BH påberoper at vederlagsvarselet kom for sent, og TE godtar svaret | BH vurderer varslingen og beløpet i TEs vederlagskrav, kontrollerer brevet og sender svaret. TE leser svaret, forstår at BH prinsipalt mener kravet er tapt og subsidiært godtar 60 000 kr, og godtar svaret. | kjørbar | kjernen i minnet, testbasen, demoruta, saksruta | — | F-MM-V-34-1-2-nei | — |
| [BF-02A](BF-02A.json) TE korrigerer datoen pålegget ble mottatt | TE har oppgitt feil dato for når pålegget ble mottatt. TE korrigerer datoen i et eget brev som viser til brevet med opplysningen. Brevet er ikke en ny kravversjon og avslår ikke BHs svar. | planlagt | — | #1308, #1309 | — | — |
| [BF-02B](BF-02B.json) TE sender en ny kravversjon som avslår tilbudet i svaret | TE er uenig i BHs svar og sender en ny kravversjon som endrer kravet. Brevet sier uttrykkelig at TE avslår BHs tilbud i svaret, og skjemaet viser før sending hva den nye kravversjonen gjør med svaret. | planlagt | — | #276 | — | — |
| [BF-02C](BF-02C.json) TE prøver å rette datoen med en ny kravversjon og blir avvist | TE vil rette datoen pålegget ble mottatt og sender en ny kravversjon der bare datoen er endret. Løsningen avviser den og viser TE til korrigeringen etter OV-U52. | planlagt | — | #1308, #1309 | — | — |
| [BF-03](BF-03.json) TE er uenig i svaret og fastholder at varselet kom i tide | TE har fått BHs svar, der BH prinsipalt gjør gjeldende at varselet kom for sent og subsidiært godtar et beløp. TE er uenig, ser hva hver vei videre gjør med svaret, protesterer mot påberopelsen uten å miste muligheten til senere å godta svaret. | planlagt | — | #1336, #276 | — | [BF-03.md](BF-03.md) |
