# Domenetabell

Vedtatt forventet atferd for saksforløpet, med kilde og tolkningsstatus per
rad og bevis-saker som kan kjøres mot en implementering. Tabellen er
referansen for begrepene under B-14 og [#271](https://github.com/khjohns/endringsmeldinger/issues/271).
[Hovedplanen](../plans/2026-09-16-godkjenning-og-varig-levering.md) er fortsatt
autoritativ for vedtak og funnstatus. Radene viser til vedtakene og gjentar dem
ikke. Kjente avvik står bare som funn-ID, eller som issuenummer når et vedtak i
3.1 ikke har noen funn-ID (#235).

Radene KA-01–KA-19 gjelder kravversjon og aksept (SK-02, SK-03), med
tilgrensende rader om godtatt preklusjon, låste varsler og byggherrens vurdering
av rettidighet. Radene GR-01–GR-18 gjelder grunnlagsavhengigheten:
grunnlagsendring med og uten endret underkategori, subsidiært svar mens
grunnlaget venter på nytt svar, frafall (§ 32.3 c) og trukket grunnlag.

| Fil | Innhold |
| --- | --- |
| [regler.json](regler.json) | Kilder, tolkningsstatuser og radene i tabellen |
| [bevis-saker.json](bevis-saker.json) | Forløp med handlinger, kontroller, kjente avvik og invarianter |
| [`domenetabell.py`](../verktoy/domenetabell.py) | Kontrollerer referansene og skriver tabellen under |
| [`test_domenetabell/`](../../backend/tests/test_domenetabell/) | Kjører bevis-sakene mot Python-projeksjonen i minnet |
| [`test_domenetabell_lagring.py`](../../backend/tests/test_database/test_domenetabell_lagring.py) | Kjører dem gjennom `/api/events` og `/api/events/batch` mot testbasen, med gjenlesing |

## Begreper

Begrepene under er de tabellen og bevis-sakene bruker. Kolonnen «I API og kode»
viser navnene som finnes i dag. Lagrede hendelsesnavn og API-felt er kontrakter
og beholdes; tabellen bestiller ingen omdøping.

| Begrep | Betydning | I API og kode | Grunnlag |
| --- | --- | --- | --- |
| **Krav** | TEs formelle krav i ett spor: ansvarsgrunnlag, vederlag eller frist | Hendelsene `grunnlag_*`, `vederlag_krav_*`, `frist_krav_*` | AGENTS.md |
| **Kravversjon** | Én innsending av kravet. Hver innsending er en ny versjon, også med uendrede verdier. Et frittstående konsekvensvarsel, et trekk og byggherrens innsigelse eller forespørsel er ikke kravversjoner | `antall_versjoner` (antallet), `versjon` på hendelsen | Vedtaket om kravversjon 05.10, [KA-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u2) |
| **Gjeldende krav** | Sporets siste kravversjon | `krav_event_id` i projeksjonen, `claimId` fra `submissionRefs` i frontenden, `claims()` i godkjenningsflyten (avviker: DT-02) | KA-U2 |
| **Svar** | Byggherrens hendelse og brev om én kravversjon. En revisjon erstatter svaret på samme versjon | `respons_*`, `respons_*_oppdatert`, `respons_event_id`, `bh_respondert_versjon` (0-indeksert) | B-13, B-03 |
| **Gjeldende svar** | Svaret på gjeldende kravversjon. Finnes ikke når sporet venter på svar | Ikke eget felt. `bh_resultat` står igjen i tilstanden etter en ny kravversjon | KA-U1 |
| **Standpunkt** | Byggherrens stilling til ett spørsmål i svaret: rettidighet, vilkår, beløp eller dager, subsidiært standpunkt. Ett svar har flere standpunkter | Felt i `GrunnlagResponsData`, `VederlagResponsData` og `FristResponsData` | B-13, [metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md) |
| **Innsigelse** | Et standpunkt som bestrider kravet eller rettidigheten, i et svar eller som egen handling | `frist_innsigelse_sendt`, `*_ok: false` | Vedtaket om nøytralt fristvarsel 23.09 |
| **Aksept** | TEs godtakelse av hele det gjeldende svaret, med alle standpunktene. Delvis enighet er ikke aksept | `te_aksepterer_respons`, `te_akseptert` | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) |
| **Rettidighetsvurdering** | Byggherrens vurdering i svaret: i tide (`true`), for sent (`false`) eller ikke vurdert (utelatt i hendelsen, `null` i tilstanden). Om spørsmålet gjelder kravet, utledes av kravet | `frist_varsel_ok`, `spesifisert_krav_ok`, `foresporsel_svar_ok`, `grunnlag_varslet_i_tide` | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4) |
| **Subsidiært til nytt svar** | Et svar på vederlag eller frist som var subsidiært fordi grunnlaget var avslått eller prekludert, og som forblir det mens grunnlaget venter på nytt svar. Et nytt svar på sporet eller grunnlaget avslutter det | `subsidiaert_til_nytt_svar` | Vedtaket om endret underkategori 05.10, [GR-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u1), [GR-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u4) |
| **Frafall** | Byggherrens svar på grunnlaget etter § 32.3 c: pålegget frafalles mot endringsordre for utført arbeid. Ikke et trekk fra TE | `GrunnlagResponsResultat.FRAFALT` (`frafalt`); sporstatusen er `TRUKKET` i dag (SK-04) | Vedtaket om `FRAFALT` 05.10, [GR-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3) |
| **Sporstatus**, **samlet status** | Oppsummering for visning og regler. Ikke en rettslig konklusjon i seg selv | `SporStatus`, `overordnet_status` | AGENTS.md |

**To tidsakser.** *Registrering* er rekkefølgen i journalen, med `tidsstempel`
satt av serveren. *Sendt/mottatt* er når et varsel eller brev faktisk ble sendt
eller mottatt, for eksempel `frist_varsel.dato_sendt`. Kolonnen «Tidsakse» sier
hvilken raden bygger på.

## Tabellen

Skrevet av `python3 docs/verktoy/domenetabell.py --skriv`. Rett i JSON-filene,
ikke her. «Kjent avvik» er funn-ID-en i hovedplanens funnregister, eller
issuenummeret til et vedtak i 3.1.

<!-- domenetabell:start -->
| ID | Tilfelle | Forventet | BHs standpunkt (B-13) | Rettslig virkning | Rettidighet | Tidsakse | Kilder | Tolkningsstatus | Bevis-saker | Kjent avvik |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KA-01 | Byggherren svarer på gjeldende kravversjon. | Svaret gjelder den versjonen, og sporet får status etter serverens resultat. | Resultat, beløp eller dager og subsidiært standpunkt regnet av serveren. | Byggherrens standpunkt til versjonen er tatt. | Byggherrens vurderinger i svaret; se KA-18a–KA-18c. | registrering | [V-B13](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-01 | — |
| KA-02 | TE sender en ny kravversjon etter et svar som ikke er godtatt (delvis godkjent). | Sporet venter på svar (`SENDT`). | Ikke vurdert for den nye versjonen. Forrige svar gjelder forrige versjon. | Ingen enighet om den nye versjonen. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-KRAVVERSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-02 | — |
| KA-03 | TE sender en ny kravversjon etter et fullt godkjent svar. | Sporet venter på svar. Saken blir ikke `OMFORENT` og EO kan ikke utstedes før byggherren har svart. | Ikke vurdert for den nye versjonen. | Godkjenningen gjaldt forrige versjon. Den nye versjonen er ikke avgjort. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-KRAVVERSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-03 | SK-02 |
| KA-04 | TE sender en ny kravversjon etter å ha godtatt svaret. | Aksepten faller, og sporet venter på svar. | Ikke vurdert for den nye versjonen. | Enigheten gjaldt forrige versjon. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-04 | SK-02 |
| KA-05 | TE sender en ny kravversjon etter å ha godtatt et avslag. | Aksepten faller, og sporet venter på svar. | Ikke vurdert for den nye versjonen. | Det godtatte avslaget gjaldt forrige versjon. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-05 | SK-02 |
| KA-06 | TE sender en ny kravversjon med uendrede verdier. | Ny kravversjon, som KA-02: sporet venter på svar. | Ikke vurdert for den nye versjonen. | Som KA-02. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-KRAVVERSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-06 | — |
| KA-07 | TE godtar mens sporet venter på svar på en ny kravversjon. | Aksepten avvises, og journalen er uendret. | Ingen svar på gjeldende versjon. | Ingen enighet. Svaret på forrige versjon kan ikke godtas. | — | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-07 | DT-01 |
| KA-08a | TE godtar et gjeldende svar som er avslått. | Aksepten registreres. Sporet blir `AVSLATT_AKSEPTERT`. | Uendret: avslått. | Kravet er oppgjort på byggherrens premisser. | — | registrering | [V-TFR01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-KA-08a | — |
| KA-08b | TE godtar et gjeldende svar som er delvis godkjent. | Aksepten registreres. Sporet blir `GODKJENT`, med byggherrens beløp. | Uendret: delvis godkjent. | Enighet om byggherrens beløp. | — | registrering | [KA-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u5), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-KA-08b | — |
| KA-09 | TE godtar et fristsvar som er prinsipalt avslått fordi varselet etter § 33.4 kom for sent, med subsidiært godkjente dager. | Godtatt avslag (`AVSLATT_AKSEPTERT`). De subsidiære dagene gjør ikke sporet `GODKJENT`. | Prinsipalt avslått (preklusjon trukket av systemet), subsidiært godkjente dager. | Aksepten gjelder hele svaret, også preklusjonen (KA-U1). Etter § 33.4 annet ledd er kravet da tapt, og de subsidiære dagene får ingen virkning. Om byggherrens innsigelse kom i tide (§ 5 tredje ledd), er uten betydning når TE godtar den. | Byggherrens vurdering av varselet: for sent. | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), NS 33.4 annet ledd, [V-B13-PREKLUSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-TFR01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 5 tredje ledd | avklart tolkning | F-KA-09 | — |
| KA-10 | TE godtar et grunnlagssvar som påberoper at grunnlaget er varslet for sent (§ 32.2). | Godtatt avslag: grunnlaget `AVSLATT_AKSEPTERT`, saken `LUKKET_AVSLATT`, EO kan ikke utstedes. | Prinsipalt prekludert, subsidiært godkjent grunnlag. | Godtatt avslag. | Byggherrens vurdering av grunnlagsvarselet: for sent. | registrering | [V-SK01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), NS 32.2 første ledd | avklart tolkning | F-KA-10 | SK-01 |
| KA-11 | Byggherren reviderer et svar TE har godtatt. | Revisjonen avvises, og journalen er uendret. | Det godtatte svaret står. | Enigheten står. | — | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-11 | SK-03 |
| KA-12 | Byggherren reviderer et svar som ikke er godtatt, på gjeldende kravversjon. | Revisjonen godtas. | Det reviderte svaret. | Byggherrens nye standpunkt til versjonen. | — | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-B13](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | arbeidshypotese | F-KA-12 | — |
| KA-13 | TE har godtatt et svar, sender en ny kravversjon og godtar byggherrens svar på den. | Den nye aksepten godtas. | Svaret på den nye versjonen. | Enighet om den nye versjonen. | — | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-KA-13 | SK-03 |
| KA-14 | TE oppdaterer et krav som er trukket. | Oppdateringen avvises, og journalen er uendret. Et nytt krav om samme forhold går i en ny sak. | — | Et trukket krav kan ikke tas opp igjen. | — | registrering | [V-TRUKKET](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-14 | SK-02 |
| KA-15 | TE sender et frittstående konsekvensvarsel (rigg og drift) etter et spesifisert vederlagskrav. | Ingen ny kravversjon. Gjeldende krav er det samme i projeksjonen og i godkjenningsflyten, og byggherren kan svare på det. | Uendret. | Varselet er et eget varsel, ikke et nytt krav. | — | registrering | [KA-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u2) | avklart tolkning | F-KA-15 | DT-02 |
| KA-16 | Byggherren sender forespørsel om spesifisert fristkrav, og TE spesifiserer. | Forespørselen er ingen kravversjon. Når kravet kan besvares, er gjeldende krav det samme i projeksjonen og godkjenningsflyten. | — | — | — | registrering | [KA-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u2), NS 33.6.2 første ledd | avklart tolkning | F-KA-16 | — |
| KA-17 | TE sender en ny kravversjon etter at saken er `OMFORENT`. | Kravversjonen avvises, og journalen er uendret. | — | Saken er oppgjort. Et nytt krav går i en ny sak. | — | registrering | [KA-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u3) | avklart tolkning | F-KA-17 | — |
| KA-18a | Byggherren svarer på et fristkrav som besvarte forespørselen etter § 33.6.2. Spørsmålet etter § 33.6.1 gjelder ikke og vurderes ikke. | `spesifisert_krav_ok` er utelatt i hendelsen og `null` i tilstanden. | Ingen begrensning etter § 33.6.1. | Byggherren skal svare etter § 33.7 og kan ikke påberope at fristen i § 33.6.1 er oversittet (§ 33.6.2 fjerde ledd). | Ikke vurdert. | registrering | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4), [V-API-NULL](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 33.6.2 fjerde ledd | avklart tolkning | F-KA-18a | DT-03 |
| KA-18b | Byggherren vurderer spesifiseringen som i tide. | `spesifisert_krav_ok` er `true` i hendelsen og tilstanden. | Ingen begrensning etter § 33.6.1. | Kravet begrenses ikke etter § 33.6.1. Har byggherren ikke gjort sen spesifisering gjeldende i tide, anses den gitt i tide (§ 5 tredje ledd). | I tide. | registrering | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4), NS 33.6.1, NS 5 tredje ledd | avklart tolkning | F-KA-18b | — |
| KA-18c | Byggherren vurderer spesifiseringen som for sent. | `spesifisert_krav_ok` er `false`, og svaret har utløseren `reduksjon_spesifisert`. | Begrensning etter § 33.6.1, regnet av serveren. | TE har bare krav på slik fristforlengelse som byggherren måtte forstå (§ 33.6.1). Forutsetter at innsigelsen er fremsatt i tide (§ 5 tredje ledd, § 33.7 annet ledd); det avgjør ikke produktet. | For sent. | registrering | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4), NS 33.6.1, NS 5 tredje ledd, NS 33.7 annet ledd, [V-B13](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-18c | — |
| KA-19 | TE spesifiserer fristkravet med en annen dato for varselet etter § 33.4 enn det registrerte. | Spesifiseringen avvises, og varselet står med datoen og metoden det fikk første gang. | — | Varselet er sendt én gang. Datoen kan ikke flyttes av en senere kravversjon. | — | sendt/mottatt | [V-SK12](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-19 | SK-12 |
| GR-01 | TE endrer underkategorien etter at byggherren har avslått grunnlaget og svart subsidiært på vederlag og frist. | Grunnlagssvaret faller i tilstanden, og grunnlaget venter på svar (`SENDT`). Svarene på vederlag og frist forblir subsidiære. | Ikke vurdert for den nye versjonen. Svarene på vederlag og frist står som subsidiære standpunkter. | Byggherren har ikke tatt stilling til ansvaret for den nye underkategorien. Det forrige svaret står i journalen som historikk. | — | registrering | [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-01 | — |
| GR-02 | TE endrer underkategorien fra pålegg (IRREG) til endringsordre (EO) etter et svar som påberoper preklusjon etter § 32.2, og byggherren godkjenner deretter grunnlaget. | Svaret og § 32.2-vurderingen faller, og vederlag og frist forblir subsidiære til grunnlaget besvares. Når grunnlaget godkjennes, er vederlag og frist prinsipalt godkjent, saken `OMFORENT` og EO kan utstedes. | Først prinsipalt prekludert, subsidiært godkjent. Etter det nye svaret: godkjent grunnlag, og de subsidiære standpunktene får virkning. | Det subsidiære standpunktet får virkning når grunnlaget godkjennes. | Byggherrens § 32.2-vurdering (for sent) faller med svaret. Med underkategori EO gjelder ikke varslingsplikten i 32.2. | registrering | [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-B13-GRUNNLAG-AVSLATT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 31.3 første ledd, NS 32.2 første ledd | avklart tolkning | F-GR-02 | — |
| GR-03 | TE godtar grunnlagssvaret etter å ha endret underkategorien, før byggherren har svart igjen. | Aksepten avvises, og journalen er uendret. | Ingen svar på gjeldende versjon. | Ingen enighet. Svaret på forrige versjon kan ikke godtas. | — | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-03 | — |
| GR-04 | TE sender en ny kravversjon av grunnlaget med uendret underkategori etter et avslag. | Som GR-01: grunnlagssvaret faller i tilstanden, grunnlaget venter på svar, og svarene på vederlag og frist forblir subsidiære. | Ikke vurdert for den nye versjonen. | Avslaget gjaldt forrige versjon. | — | registrering | [GR-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u1) | avklart tolkning | F-GR-04 | DT-04 |
| GR-05 | TE sender en ny kravversjon av grunnlaget med uendret underkategori etter et svar som påberoper preklusjon etter § 32.2. | Svaret og § 32.2-vurderingen faller, grunnlaget venter på svar (`SENDT`), og svarene på vederlag og frist forblir subsidiære. | Ikke vurdert for den nye versjonen. | Preklusjonen gjaldt forrige versjon. Byggherren må ta stilling på nytt. | Byggherrens § 32.2-vurdering for den nye versjonen: ikke vurdert. | registrering | [GR-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u1), [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.2 første ledd | avklart tolkning | F-GR-05 | DT-04 |
| GR-06 | TE godtar forrige grunnlagssvar etter en ny kravversjon av grunnlaget med uendret underkategori. | Aksepten avvises, og journalen er uendret. Saken blir ikke `LUKKET_AVSLATT`. | Ingen svar på gjeldende versjon. | Ingen enighet. Svaret på forrige versjon kan ikke godtas. | — | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), [GR-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u1) | avklart tolkning | F-GR-06 | DT-04 |
| GR-07 | TE endrer underkategorien etter at byggherren har godkjent og låst grunnlaget. | Endringen avvises, og journalen er uendret. | Det godkjente grunnlaget står. | Ansvaret er avklart. Grunnlaget kan ikke endres. | — | registrering | [GR-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u2) | avklart tolkning | F-GR-07 | — |
| GR-08 | Byggherren reviderer vederlagssvaret mens grunnlaget venter på nytt svar etter endret underkategori, og avslår deretter grunnlaget igjen. | Det reviderte svaret er prinsipalt så lenge grunnlaget ikke har svar. Når grunnlaget avslås, er vederlagssvaret subsidiært. | Først prinsipalt delvis godkjent, deretter subsidiært, utledet av grunnlaget. | Byggherrens standpunkt til beløpet står. Om det er prinsipalt eller subsidiært, følger av grunnlagssvaret. | — | registrering | [GR-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u4), [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-B13-GRUNNLAG-AVSLATT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-08 | — |
| GR-09 | TE trekker grunnlaget før vederlag eller frist er sendt. | Saken er `LUKKET_TRUKKET`. | — | Kravet er trukket. Spor som ikke er sendt, regnes som trukket. | — | registrering | [V-SD02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-09 | SD-02 |
| GR-10 | TE trekker grunnlaget når bare vederlaget er sendt. | Vederlaget trekkes med, og saken er `LUKKET_TRUKKET`. | — | Fristen er ikke sendt og regnes som trukket. | — | registrering | [V-SD02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [GR-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u5) | avklart tolkning | F-GR-10 | SD-02 |
| GR-11 | TE trekker grunnlaget etter at byggherren har godkjent vederlaget prinsipalt mens grunnlaget ventet på svar. | Vederlag og frist trekkes med, også det godkjente vederlaget, og saken er `LUKKET_TRUKKET`. | Godkjent vederlag. Grunnlaget er ikke besvart. | Ansvarsgrunnlaget bærer kravene. Trekkes det, faller de. | — | registrering | [GR-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u5) | avklart tolkning | F-GR-11 | — |
| GR-12 | TE oppdaterer grunnlaget etter å ha trukket det, før vederlag eller frist er sendt. | Oppdateringen avvises, og journalen er uendret. | — | Et trukket krav kan ikke tas opp igjen. Saken er lukket. | — | registrering | [V-TRUKKET](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-SD02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-12 | SD-02 |
| GR-13 | Byggherren frafaller pålegget (§ 32.3 c). | Grunnlaget får status `FRAFALT`, ikke `TRUKKET`. | Frafalt, med grunnlaget varslet i tide. | Pålegget er frafalt mot endringsordre for utført arbeid. TE har ikke trukket noe. | Byggherrens § 32.2-vurdering: i tide. | registrering | [V-FRAFALT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.3 første ledd bokstav c | avklart tolkning | F-GR-13 | SK-04 |
| GR-14 | Byggherren frafaller pålegget og godkjenner deretter vederlag og frist. | Svarene er prinsipale. Saken er `OMFORENT`, og EO utstedes ikke fra KOE-saken (`kan_utstede_eo` er `false`). | Frafalt grunnlag. Prinsipalt godkjent vederlag og frist. | Avklart grunnlag. Endringsordren for utført arbeid går i en egen EO-sak (#69). | — | registrering | [GR-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3), [V-235](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.3 første ledd bokstav c | avklart tolkning | F-GR-14 | — |
| GR-15 | Byggherren frafaller pålegget og avslår vederlag og frist, og TE godtar begge avslagene. | Saken er `OMFORENT`, ikke `UKJENT`. EO utstedes ikke fra KOE-saken. | Frafalt grunnlag. Avslått vederlag og frist. | Kravene er oppgjort ved godtatt avslag. | — | registrering | [GR-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3), [V-FRAFALT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-TFR01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-15 | SK-04 |
| GR-16 | Byggherren frafaller pålegget før vederlag eller frist er sendt. | Saken er `UNDER_BEHANDLING`, som ved godkjent grunnlag der resten ikke er sendt. | Frafalt grunnlag. | Grunnlaget er avklart. TE kan fortsatt sende vederlag og frist. | — | registrering | [V-FRAFALT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-TFR05](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.3 første ledd bokstav c | avklart tolkning | F-GR-16 | SK-04 |
| GR-17 | Byggherren frafaller pålegget og påberoper samtidig at grunnlaget er varslet for sent (§ 32.2). | Svaret avvises, og journalen er uendret. | — | Frafall skjer mot endringsordre og kan ikke kombineres med preklusjon. | Byggherrens § 32.2-vurdering: for sent. Det er kombinasjonen som avvises. | registrering | [V-235](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.3 første ledd bokstav c, NS 32.2 første ledd | avklart tolkning | F-GR-17 | #235 |
| GR-18 | TE har endret grunnlaget fra pålegg (IRREG) til endringsordre (EO), og byggherren svarer «frafalt». | Svaret avvises, og journalen er uendret. | — | Svarvalgene i 32.3, også frafall, gjelder et varsel etter 32.2 om et pålegg etter 32.1. Et grunnlag med endringsordre har ikke noe pålegg å frafalle. | — | registrering | [V-B13-FRAFALL](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.1, NS 32.3 første ledd bokstav c | avklart tolkning | F-GR-18 | — |
<!-- domenetabell:slutt -->

## Formatet

Formatet bygger på [metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md#formatkontrakt).
Prøvemodellen er ikke gjenbrukt: forventningene kjøres mot applikasjonen.

- `regler.json`: `kilder` er vedtak i hovedplanen 3.1 (med radetiketten
  kontrollen leter etter) eller punkter i NS 8407. `tolkningsstatuser`
  forklarer statusene. Hver rad har kilder og én tolkningsstatus.
- `bevis-saker.json`: et forløp starter fra et navngitt `prefiks` og har
  `steg`, som er handlinger med parametre. Handlingene er domenets, ikke
  Python-modellens; kjøreren lager forespørslene slik `/api/events` tar imot
  dem.
- `kontroller` gjelder tilstanden `etter` et antall steg i forløpet (0 er etter
  prefikset). Nøklene er stier i tilstanden slik API-et sender den
  (`vederlag.status`, `overordnet_status`), `avvist` for steget som nettopp ble
  sendt, eller `lagret.<hendelsestype>.<felt>` for det journalen fikk. Verdien
  `"utelatt"` betyr at feltet ikke finnes i hendelsen. `{"ikke": x}` og
  `{"inneholder": x}` er de eneste operatorene.
- `rolle`: `forutsetning` må holde for at forløpet prøver noe, `mal` er
  forventningen, og `kontroll` prøver en handling (`prov`) uten å legge den
  til. En kontrollsak skiller seg fra målet bare i det ene forholdet, så en
  avvisning gjelder funnet og ikke noe annet.
- `forventningsgrunnlag` skal være den svakeste tolkningsstatusen blant radene
  forløpet beviser.
- `kjent_avvik` merker et forløp der dagens kode avviker, med funn-ID og issue.
  Et vedtatt issue uten funn-ID i funnregisteret står med issuenummeret som
  funn (`"funn": "#235"`), og kontrollen krever en vedtaksrad for issuet i 3.1. Kjøreren gjør det til en streng `xfail`; avviket
  normaliseres ikke bort.
- `invarianter` prøves etter hvert steg i alle forløp, med egne kjente avvik.

## Baner

| Bane | Hva den prøver | Kjøres |
| --- | --- | --- |
| Domenet | Validering av data, parsing, forretningsreglene og projeksjonen i minnet, i samme rekkefølge som `/api/events`. Hendelsen journalen ville fått, er `to_cloudevent()` i minnet | `backend/tests/test_domenetabell/`, i CI |
| `/api/events` og testbasen | Ruta med ekte dekoratører og lagre mot PostgreSQL. Avvisning gir uendret journal, og tilstanden i svaret er lik tilstanden regnet av journalen etter gjenlesing | `backend/tests/test_database/test_domenetabell_lagring.py`, i CI-jobben `database` |
| `/api/events/batch` og testbasen | Som over, med hver handling som eneste hendelse i en batch | Samme fil, parameteren `batch` |
| Godkjenningsflyten | Bare invarianten om gjeldende krav mot `claims()` | Begge banene over |

Ikke kjørt: batcher med flere hendelser, hele godkjenningsflyten med pakker og
publisering, Catenda, frontendens skjemaer og en TypeScript-kjører.
Kontrollsakene (`prov`) prøves mot forretningsreglene også i databasebanen,
fordi en prøve gjennom ruta ville skrevet hendelsen.

## Dekning og grenser

Tabellen dekker radene over, ikke hele livsløpet. Ikke dekket ennå:
EO-særforløp og forsering. I grunnlagsdelen er ikke prøvd: revisjon av
grunnlagssvaret (`respons_grunnlag_oppdatert`), frafall ved valgrett
(`VALGRETT`), andre hovedkategorier enn endring, endret underkategori mellom
to pålegg, og passivitet etter § 32.3 annet ledd. Flere
innsigelser i ett brev og senere dokumentert korrespondanse er avgrenset i
metodeprøvene, ikke her.

Én forløpsvariant per rad er prøvd, med faste beløp og datoer. Antall forløp
beviser ikke dekning av domenet. Kontrollen i `domenetabell.py` viser at
kilder, rader, forløp og funn-ID-er henger sammen. Den viser ikke at en
forventning er juridisk riktig. Rader med tolkningsstatus `arbeidshypotese` må
avklares før de brukes som bindende produktkrav.

Av NS 8407 er punkt 5, 6, 31, 32 og 33.4–33.8 lest (gjengitt av oppdragsgiver 08.10).
Kildene i `regler.json` skiller tekstgrunnlaget fra slutningen tabellen
trekker. Rettidigheten etter § 5 tredje ledd og § 33.7 annet ledd er premisser:
tabellen registrerer byggherrens vurdering, men avgjør ikke om en innsigelse
kom i tide. Fristforlengelsen ved helligdager (punkt 6) brukes ikke i noen rad.
Vederlagsbestemmelsene er ikke lest; radene KA-02–KA-08 bygger på vedtakene
alene. Radene GR-01–GR-18 bygger på vedtakene i 3.1. Der teksten i punkt 31.3 og
32.1–32.3 bærer forventningen, står punktet som egen kilde. Passivitet etter
§ 32.3 annet ledd og valgrett (som ikke står i punkt 32) brukes ikke i noen rad.

Begrepslisten i [testinventaret](../vedlegg/testinventar-271-2026-10-08/README.md#4-begrepsavklaring-som-grunnlag-for-domenetabellen-271)
var foreløpig og er erstattet av denne.
