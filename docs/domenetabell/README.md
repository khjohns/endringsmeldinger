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
av rettidighet. Radene KA-20–KA-24 kommer fra MM-U1–MM-U4 og gjelder målmodellen:
et varsel registrert etter et senere krav, en bestridelse, en godtatt preklusjon
etter en regelendring, et svar som avviker fra dagens utledning, og en sak kjernen
ikke kan tolke. Radene GR-01–GR-18 gjelder grunnlagsavhengigheten:
grunnlagsendring med og uten endret underkategori, subsidiært svar mens
grunnlaget venter på nytt svar, frafall (§ 32.3 c) og trukket grunnlag.
Radene GR-19–GR-25 gjelder enighet om vederlag og frist mens grunnlaget er
omtvistet (GR-U7).
Radene EO-01–EO-24 gjelder endringsordrene: endringsordre i KOE-saken (EO-01,
EO-23), når en KOE-sak kan inngå i en endringsordre (EO-02–EO-09),
EO-sakens livsløp (EO-10–EO-20) og KOE-tilknytningen (EO-21, EO-22, EO-24).

**Merknad 2026-10-09:** vedtakene 09.10 i hovedplanen endrer forventningen i
flere rader, som ikke er skrevet om her. MM-U9 opphever MM-U4–MM-U6, som KA-23
og KA-25 bygger på. KA-U7 endrer SK-02 for spor med enighet: en ny kravversjon
avvises der. Det gjelder rader som bygger på at en ny kravversjon opphever en
enighet, blant dem KA-03, KA-04 og KA-13. GR-U10 gjør «låst» til enighet.
Radene og bevis-sakene skrives om i #308 og #309 og viser til da vedtakene slik
de var før 09.10.

| Fil | Innhold |
| --- | --- |
| [regler.json](regler.json) | Kilder, tolkningsstatuser og radene i tabellen |
| [bevis-saker.json](bevis-saker.json) | Forløp med handlinger, kontroller, kjente avvik og invarianter |
| [bevis-saker-maalmodell.json](bevis-saker-maalmodell.json) | Forløp A–E fra [modellforslaget](../forslag-maalmodell-2026-10-09.md) med kilde per kontroll. Kjøres bare mot målmodellen i [`sprakprove/maalmodell/`](../../sprakprove/maalmodell/) (#304), merket «(målmodellen)» i tabellen |
| [`domenetabell.py`](../verktoy/domenetabell.py) | Kontrollerer referansene og skriver tabellen under |
| [`test_domenetabell/`](../../backend/tests/test_domenetabell/) | Kjører bevis-sakene mot Python-projeksjonen i minnet |
| [`test_domenetabell_lagring.py`](../../backend/tests/test_database/test_domenetabell_lagring.py) | Kjører dem gjennom `/api/events` og `/api/events/batch` mot testbasen, med gjenlesing |
| [kontrakt.json](kontrakt.json) | Kommando, lagret hendelse og offentlig tilstand for flyten i språkprøven (#272), som JSON Schema; se [Kontrakten for flyten](#kontrakten-for-flyten) |

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
| **Gjeldende svar** | Svaret på gjeldende kravversjon. Finnes ikke når sporet venter på svar | `gjeldende_respons_event_id` i tilstanden, `null` når sporet venter på svar. `respons_event_id` og `bh_resultat` står igjen etter en ny kravversjon | KA-U1, [KT-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#kt-u1) |
| **Standpunkt** | Byggherrens stilling til ett spørsmål i svaret: rettidighet, vilkår, beløp eller dager, subsidiært standpunkt. Ett svar har flere standpunkter | Felt i `GrunnlagResponsData`, `VederlagResponsData` og `FristResponsData` | B-13, [metodeprøven](../vedlegg/metodeprove-frist-2026-10-08/README.md) |
| **Innsigelse** | Et standpunkt som bestrider kravet eller rettidigheten, i et svar eller som egen handling | `frist_innsigelse_sendt`, `*_ok: false` | Vedtaket om nøytralt fristvarsel 23.09 |
| **Aksept** | TEs godtakelse av hele det gjeldende svaret, med alle standpunktene. Delvis enighet er ikke aksept | `te_aksepterer_respons` med svaret i `refererer_til_event_id`, `te_akseptert` | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) |
| **Enighet** | Standpunktene i sporet faller sammen: TE har godtatt gjeldende svar, eller svaret godkjenner hele kravet. Gjelder sporets egne spørsmål, ikke ansvaret | `enighet` på vederlag og frist i tilstanden (#274) | [GR-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7) |
| **Avklart grunnlag** | Byggherren har godkjent grunnlaget uten preklusjon etter § 32.2, eller frafalt pålegget | `grunnlag.avklart` i tilstanden (#274) | GR-U7 |
| **Oppgjort** | Enighet i sporet, og avklart grunnlag. Erstatter at statusen `godkjent` betydde begge deler | `oppgjort` på vederlag og frist i tilstanden (#274) | GR-U7, [KA-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u5) |
| **Rettidighetsvurdering** | Byggherrens vurdering i svaret: i tide (`true`), for sent (`false`) eller ikke vurdert (utelatt i hendelsen, `null` i tilstanden). Om spørsmålet gjelder kravet, utledes av kravet | `frist_varsel_ok`, `spesifisert_krav_ok`, `foresporsel_svar_ok`, `grunnlag_varslet_i_tide` | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4) |
| **Subsidiært til nytt svar** | Et svar på vederlag eller frist som var subsidiært fordi grunnlaget var avslått eller prekludert, og som forblir det mens grunnlaget venter på nytt svar. Et nytt svar på sporet eller grunnlaget avslutter det | `subsidiaert_til_nytt_svar` | Vedtaket om endret underkategori 05.10, [GR-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u1), [GR-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u4) |
| **Frafall** | Byggherrens svar på grunnlaget etter § 32.3 c: pålegget frafalles mot endringsordre for utført arbeid. Ikke et trekk fra TE | `GrunnlagResponsResultat.FRAFALT` (`frafalt`); sporstatusen er `TRUKKET` i dag (SK-04) | Vedtaket om `FRAFALT` 05.10, [GR-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3) |
| **Endringsordre (EO)** | Byggherrens ordre om en endring (§ 31.3), utstedt i en egen EO-sak. TE godtar eller bestrider den; den forhandles ikke | Sakstypen `endringsordre`, `endringsordre_data`, hendelsene `eo_*` | V-TFR02, [EO-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u1) |
| **Utgave** | Endringsordren slik den er utstedt eller revidert. TE svarer én gang på hver | `revisjon_nummer` | [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) |
| **KOE-tilknytning** | At en KOE-sak inngår i en endringsordre. Står i EO-saken, høyst én per KOE-sak | `relaterte_koe_saker`, `eo_koe_lagt_til`, `eo_koe_fjernet`, `sak_relations` | [EO-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u3) |
| **Klar for endringsordre** | KOE-saken kan inngå i en endringsordre | `kan_utstede_eo`, kandidatene i `EndringsordreService` (avviker: DT-06) | [EO-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2) |
| **Sporstatus**, **samlet status** | Oppsummering for visning. Ikke en rettslig konklusjon og ikke et vilkår i et vedtak: et vedtak som bruker et statusnavn, gjelder innholdet statusen oppsummerer | `SporStatus`, `overordnet_status` | [Hovedplanen, 3.1](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), merknaden 09.10 |

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
| KA-01 | Byggherren svarer på gjeldende kravversjon. | Svaret gjelder den versjonen, og sporet får status etter serverens resultat. | Resultat, beløp eller dager og subsidiært standpunkt regnet av serveren. | Byggherrens standpunkt til versjonen er tatt. | Byggherrens vurderinger i svaret; se KA-18a–KA-18c. | registrering | [V-B13](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-01, F-MM-E1 (målmodellen) | — |
| KA-02 | TE sender en ny kravversjon etter et svar som ikke er godtatt (delvis godkjent). | Sporet venter på svar (`SENDT`). | Ikke vurdert for den nye versjonen. Forrige svar gjelder forrige versjon. | Ingen enighet om den nye versjonen. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-KRAVVERSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-02 | — |
| KA-03 | TE sender en ny kravversjon etter et fullt godkjent svar. | Sporet venter på svar. Saken blir ikke `OMFORENT` og EO kan ikke utstedes før byggherren har svart. | Ikke vurdert for den nye versjonen. | Godkjenningen gjaldt forrige versjon. Den nye versjonen er ikke avgjort. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-KRAVVERSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-03 | — |
| KA-04 | TE sender en ny kravversjon etter å ha godtatt svaret. | Aksepten faller, og sporet venter på svar. | Ikke vurdert for den nye versjonen. | Enigheten gjaldt forrige versjon. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-04 | — |
| KA-05 | TE sender en ny kravversjon etter å ha godtatt et avslag. | Aksepten faller, og sporet venter på svar. | Ikke vurdert for den nye versjonen. | Det godtatte avslaget gjaldt forrige versjon. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-05 | — |
| KA-06 | TE sender en ny kravversjon med uendrede verdier. | Ny kravversjon, som KA-02: sporet venter på svar. | Ikke vurdert for den nye versjonen. | Som KA-02. | Byggherrens svar på den nye versjonen: ikke vurdert. | registrering | [V-KRAVVERSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-06 | — |
| KA-07 | TE godtar mens sporet venter på svar på en ny kravversjon. | Aksepten avvises, og journalen er uendret. | Ingen svar på gjeldende versjon. | Ingen enighet. Svaret på forrige versjon kan ikke godtas. | — | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-07, F-MM-E1 (målmodellen) | — |
| KA-08a | TE godtar et gjeldende svar som er avslått. | Aksepten registreres. Sporet blir `AVSLATT_AKSEPTERT`. | Uendret: avslått. | Kravet er oppgjort på byggherrens premisser. | — | registrering | [V-TFR01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-KA-08a | — |
| KA-08b | TE godtar et gjeldende svar som er delvis godkjent. | Aksepten registreres. Sporet blir `GODKJENT`, med byggherrens beløp. | Uendret: delvis godkjent. | Enighet om byggherrens beløp. | — | registrering | [KA-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u5), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-KA-08b | — |
| KA-09 | TE godtar et fristsvar som er prinsipalt avslått fordi varselet etter § 33.4 kom for sent, med subsidiært godkjente dager. | Godtatt avslag (`AVSLATT_AKSEPTERT`). De subsidiære dagene gjør ikke sporet `GODKJENT`. | Prinsipalt avslått (preklusjon trukket av systemet), subsidiært godkjente dager. | Aksepten gjelder hele svaret, også preklusjonen (KA-U1). Etter § 33.4 annet ledd er kravet da tapt, og de subsidiære dagene får ingen virkning. Om byggherrens innsigelse kom i tide (§ 5 tredje ledd), er uten betydning når TE godtar den. | Byggherrens vurdering av varselet: for sent. | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), NS 33.4 annet ledd, [V-B13-PREKLUSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-TFR01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 5 tredje ledd | avklart tolkning | F-KA-09 | — |
| KA-10 | TE godtar et grunnlagssvar som påberoper at grunnlaget er varslet for sent (§ 32.2). | Godtatt avslag: grunnlaget `AVSLATT_AKSEPTERT`, saken `LUKKET_AVSLATT`, EO kan ikke utstedes. | Prinsipalt prekludert, subsidiært godkjent grunnlag. | Godtatt avslag. | Byggherrens vurdering av grunnlagsvarselet: for sent. | registrering | [V-SK01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), NS 32.2 første ledd | avklart tolkning | F-KA-10, F-MM-C (målmodellen) | — |
| KA-11 | Byggherren reviderer et svar TE har godtatt. | Revisjonen avvises, og journalen er uendret. | Det godtatte svaret står. | Enigheten står. | — | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-11, F-MM-A (målmodellen) | — |
| KA-12 | Byggherren reviderer et svar som ikke er godtatt, på gjeldende kravversjon. | Revisjonen godtas. | Det reviderte svaret. | Byggherrens nye standpunkt til versjonen. | — | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-B13](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | arbeidshypotese | F-KA-12, F-MM-A (målmodellen), F-MM-E4 (målmodellen) | — |
| KA-13 | TE har godtatt et svar, sender en ny kravversjon og godtar byggherrens svar på den. | Den nye aksepten godtas. | Svaret på den nye versjonen. | Enighet om den nye versjonen. | — | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-KA-13 | — |
| KA-14 | TE oppdaterer et krav som er trukket. | Oppdateringen avvises, og journalen er uendret. Et nytt krav om samme forhold går i en ny sak. | — | Et trukket krav kan ikke tas opp igjen. | — | registrering | [V-TRUKKET](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-14 | SK-02 |
| KA-15 | TE sender et frittstående konsekvensvarsel (rigg og drift) etter et spesifisert vederlagskrav. | Ingen ny kravversjon. Gjeldende krav er det samme i projeksjonen og i godkjenningsflyten, og byggherren kan svare på det. | Uendret. | Varselet er et eget varsel, ikke et nytt krav. | — | registrering | [KA-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u2) | avklart tolkning | F-KA-15 | DT-02 |
| KA-16 | Byggherren sender forespørsel om spesifisert fristkrav, og TE spesifiserer. | Forespørselen er ingen kravversjon. Når kravet kan besvares, er gjeldende krav det samme i projeksjonen og godkjenningsflyten. | — | — | — | registrering | [KA-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u2), NS 33.6.2 første ledd | avklart tolkning | F-KA-16 | — |
| KA-17 | TE sender en ny kravversjon etter at saken er `OMFORENT`. | Kravversjonen avvises, og journalen er uendret. | — | Saken er oppgjort. Et nytt krav går i en ny sak. | — | registrering | [KA-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u3) | avklart tolkning | F-KA-17 | — |
| KA-18a | Byggherren svarer på et fristkrav som besvarte forespørselen etter § 33.6.2. Spørsmålet etter § 33.6.1 gjelder ikke og vurderes ikke. | `spesifisert_krav_ok` er utelatt i hendelsen og `null` i tilstanden. | Ingen begrensning etter § 33.6.1. | Byggherren skal svare etter § 33.7 og kan ikke påberope at fristen i § 33.6.1 er oversittet (§ 33.6.2 fjerde ledd). | Ikke vurdert. | registrering | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4), [V-API-NULL](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 33.6.2 fjerde ledd | avklart tolkning | F-KA-18a | — |
| KA-18b | Byggherren vurderer spesifiseringen som i tide. | `spesifisert_krav_ok` er `true` i hendelsen og tilstanden. | Ingen begrensning etter § 33.6.1. | Kravet begrenses ikke etter § 33.6.1. Har byggherren ikke gjort sen spesifisering gjeldende i tide, anses den gitt i tide (§ 5 tredje ledd). | I tide. | registrering | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4), NS 33.6.1, NS 5 tredje ledd | avklart tolkning | F-KA-18b | — |
| KA-18c | Byggherren vurderer spesifiseringen som for sent. | `spesifisert_krav_ok` er `false`, og svaret har utløseren `reduksjon_spesifisert`. | Begrensning etter § 33.6.1, regnet av serveren. | TE har bare krav på slik fristforlengelse som byggherren måtte forstå (§ 33.6.1). Forutsetter at innsigelsen er fremsatt i tide (§ 5 tredje ledd, § 33.7 annet ledd); det avgjør ikke produktet. | For sent. | registrering | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4), NS 33.6.1, NS 5 tredje ledd, NS 33.7 annet ledd, [V-B13](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-18c | — |
| KA-19 | TE spesifiserer fristkravet, eller registrerer varselet etter § 33.4 på nytt, med en annen dato enn den registrerte. | Spesifiseringen eller registreringen avvises, og varselet står med datoen og metoden det fikk første gang. Låsen gjelder et registrert varsel, ikke et varsel som bare er utledet av det spesifiserte kravet (KA-20). | — | Varselet er sendt én gang. Datoen kan ikke flyttes av en senere kravversjon. | — | sendt/mottatt | [V-SK12](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [MM-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u1) | avklart tolkning | F-KA-19, F-MM-D (målmodellen) | SK-12 |
| KA-20 | TE har sendt et spesifisert fristkrav uten registrert varsel etter § 33.4, og byggherren har påberopt at varselet kom for sent. TE registrerer deretter varselet med en tidligere sendedato. | Registreringen godtas som første registrering, uten ny kravversjon. Byggherrens svar står og er fortsatt gjeldende svar. Preklusjonen i svaret gjaldt varselet slik det var registrert da, og er uavklart til byggherren tar stilling. Har TE godtatt svaret før registreringen, står enigheten. TE kan ikke godta svaret før byggherren har svart på nytt (MM-U8). | Svaret står uendret. Byggherren har ikke tatt stilling til rettidigheten av det registrerte varselet. | Varselet er registrert for første gang. Preklusjonen faller ikke av seg selv. | Byggherrens vurdering av varselet utledet av kravet: for sent. Det registrerte varselet: ikke vurdert. | sendt/mottatt | [MM-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u1), [V-SK12](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), [MM-U8](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u8) | avklart tolkning | F-MM-D (målmodellen), F-MM-D-godtatt (målmodellen) | — |
| KA-21 | Byggherren bestrider at et varsel TE har registrert, ble mottatt, også etter at saken er avsluttet. | Bestridelsen lagres som byggherrens utsagn om opplysningen. Opplysningen om sendingen står, og preklusjonen verken faller eller oppstår av seg selv. Visningen viser både TEs opplysning og bestridelsen. I en avsluttet sak registreres bestridelsen uten virkning på utfallet, og andre kommandoer avvises fortsatt. | Bestrider mottaket. Rettidigheten er ikke vurdert. | Systemet avgjør ikke hvem som har rett. | Ikke vurdert. | sendt/mottatt | [MM-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u1), [MM-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u7) | avklart tolkning | F-MM-D (målmodellen), F-MM-D-avsluttet (målmodellen) | — |
| KA-22 | TE har godtatt et grunnlagssvar som påberoper at grunnlaget er varslet for sent (§ 32.2), og en senere regelendring gjør at § 32.2 ikke gjelder kategorien. | Saken forblir avslått. Enigheten gjelder svaret med virkningen standpunktene hadde etter reglene da TE godtok det. Dagens utledning viser at regelen er endret. | Prinsipalt prekludert, med ansvaret som subsidiært standpunkt, slik svaret ble godtatt. | Virkningen av enigheten ble fastsatt da den ble inngått. | Byggherrens vurdering av grunnlagsvarselet: for sent. | registrering | [MM-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u3), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), [V-SK01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-MM-C3c (målmodellen) | — |
| KA-23 | En regelendring gir et standpunkt i byggherrens sendte svar en annen virkning før TE har godtatt det. | Dagens utledning av svaret følger de nye reglene, og svaret merkes som avvikende fra brevet. Brevet og beslutningsgrunnlaget står uendret. TEs aksept avvises, og journalen er uendret; byggherren har revisjon som ventende handling. Et svar der brevet stemmer med dagens utledning, kan godtas, også når regelversjonen er nyere enn da svaret ble sendt. En aksept med en annen regelversjon eller et annet enighetsgrunnlag enn serverens avvises. | Svaret slik brevet uttrykte det. Dagens utledning kan avvike. | TE godtar hele svaret slik brevet uttrykker det. | — | registrering | [MM-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u4), [MM-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u3), [V-B13-REGELVERSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-MM-C3b (målmodellen), F-MM-C3d (målmodellen), F-MM-C3d-kontroll (målmodellen) | — |
| KA-24 | Kjernen kan ikke tolke en hendelse på saken: en ukjent type eller et ukjent format, en referanse som ikke finnes i saken, eller svar på samme kravversjon som ikke er én kjede der hver revisjon erstatter det forrige (to første svar, en forgrening, en selvreferanse eller en sirkel). | Ingen bindende kommando godtas fra noen part, og ingen handlinger tilbys. Journalen kan leses. Visningen sier at saken ikke kan utledes, hvilke hendelser som ikke er tolket, og at et varsel med frist må sendes utenfor appen. | — | — | — | registrering | [MM-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u2) | avklart tolkning | F-MM-E3 (målmodellen), F-MM-E4 (målmodellen), F-MM-E5 (målmodellen), F-MM-E6 (målmodellen), F-MM-E7 (målmodellen) | — |
| KA-25 | Byggherren har svart på grunnlaget med preklusjon etter § 32.2 og subsidiært godkjent, og partene er enige om beløp og dager på vilkår av at grunnlaget avklares. En regelendring gjør at § 32.2 ikke gjelder kategorien før TE har godtatt svaret på grunnlaget. | Svaret merkes som avvikende fra brevet, og grunnlaget er uavklart til byggherren svarer på nytt. Enighetene forblir betinget, saken avsluttes ikke, og byggherren kan revidere svaret. Når byggherren godkjenner grunnlaget på nytt, blir enighetene virksomme med uendret innhold. | Svaret slik brevet uttrykte det: prinsipalt prekludert, subsidiært godkjent. Dagens utledning avviker. | Byggherren bindes ikke til et utfall brevet ikke uttrykte. | Byggherrens vurdering av grunnlagsvarselet: for sent. Uten virkning etter regelendringen. | registrering | [MM-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u5), [MM-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#mm-u4), [GR-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7) | avklart tolkning | F-MM-AC (målmodellen) | — |
| KA-26 | TE trekker vederlagskravet etter at byggherren har godkjent hele kravet, mens saken ikke er avsluttet. | Trekket godtas. Enigheten om beløpet får ingen virkning, og vederlaget er trukket. Saken er ikke avsluttet så lenge grunnlag og frist står åpne. | Godkjent vederlag. | Kravet er trukket. Enigheten gjaldt et krav som ikke lenger er fremmet. | — | registrering | [KA-U6](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u6), [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-MM-B3 (målmodellen) | — |
| GR-01 | TE endrer underkategorien etter at byggherren har avslått grunnlaget og svart subsidiært på vederlag og frist. | Grunnlagssvaret faller i tilstanden, og grunnlaget venter på svar (`SENDT`). Svarene på vederlag og frist forblir subsidiære. | Ikke vurdert for den nye versjonen. Svarene på vederlag og frist står som subsidiære standpunkter. | Byggherren har ikke tatt stilling til ansvaret for den nye underkategorien. Det forrige svaret står i journalen som historikk. | — | registrering | [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-01 | — |
| GR-02 | TE endrer underkategorien fra pålegg (IRREG) til endringsordre (EO) etter et svar som påberoper preklusjon etter § 32.2, og byggherren godkjenner deretter grunnlaget. | Svaret og § 32.2-vurderingen faller, og vederlag og frist forblir subsidiære til grunnlaget besvares. Når grunnlaget godkjennes, er vederlag og frist prinsipalt godkjent, saken `OMFORENT` og EO kan utstedes. | Først prinsipalt prekludert, subsidiært godkjent. Etter det nye svaret: godkjent grunnlag, og de subsidiære standpunktene får virkning. | Det subsidiære standpunktet får virkning når grunnlaget godkjennes. | Byggherrens § 32.2-vurdering (for sent) faller med svaret. Med underkategori EO gjelder ikke varslingsplikten i 32.2. | registrering | [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-B13-GRUNNLAG-AVSLATT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 31.3 første ledd, NS 32.2 første ledd | avklart tolkning | F-GR-02 | — |
| GR-03 | TE godtar grunnlagssvaret etter å ha endret underkategorien, før byggherren har svart igjen. | Aksepten avvises, og journalen er uendret. | Ingen svar på gjeldende versjon. | Ingen enighet. Svaret på forrige versjon kan ikke godtas. | — | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-03 | — |
| GR-04 | TE sender en ny kravversjon av grunnlaget med uendret underkategori etter et avslag. | Som GR-01: grunnlagssvaret faller i tilstanden, grunnlaget venter på svar, og svarene på vederlag og frist forblir subsidiære. | Ikke vurdert for den nye versjonen. | Avslaget gjaldt forrige versjon. | — | registrering | [GR-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u1) | avklart tolkning | F-GR-04 | — |
| GR-05 | TE sender en ny kravversjon av grunnlaget med uendret underkategori etter et svar som påberoper preklusjon etter § 32.2. | Svaret og § 32.2-vurderingen faller, grunnlaget venter på svar (`SENDT`), og svarene på vederlag og frist forblir subsidiære. | Ikke vurdert for den nye versjonen. | Preklusjonen gjaldt forrige versjon. Byggherren må ta stilling på nytt. | Byggherrens § 32.2-vurdering for den nye versjonen: ikke vurdert. | registrering | [GR-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u1), [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.2 første ledd | avklart tolkning | F-GR-05 | — |
| GR-06 | TE godtar forrige grunnlagssvar etter en ny kravversjon av grunnlaget med uendret underkategori. | Aksepten avvises, og journalen er uendret. Saken blir ikke `LUKKET_AVSLATT`. | Ingen svar på gjeldende versjon. | Ingen enighet. Svaret på forrige versjon kan ikke godtas. | — | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), [GR-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u1) | avklart tolkning | F-GR-06 | — |
| GR-07 | TE endrer underkategorien etter at byggherren har godkjent og låst grunnlaget. | Endringen avvises, og journalen er uendret. | Det godkjente grunnlaget står. | Ansvaret er avklart. Grunnlaget kan ikke endres. | — | registrering | [GR-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u2) | avklart tolkning | F-GR-07 | — |
| GR-08 | Byggherren reviderer vederlagssvaret mens grunnlaget venter på nytt svar etter endret underkategori, og avslår deretter grunnlaget igjen. | Det reviderte svaret er prinsipalt så lenge grunnlaget ikke har svar. Når grunnlaget avslås, er vederlagssvaret subsidiært. | Først prinsipalt delvis godkjent, deretter subsidiært, utledet av grunnlaget. | Byggherrens standpunkt til beløpet står. Om det er prinsipalt eller subsidiært, følger av grunnlagssvaret. | — | registrering | [GR-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u4), [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-B13-GRUNNLAG-AVSLATT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-08 | — |
| GR-09 | TE trekker grunnlaget før vederlag eller frist er sendt. | Saken er `LUKKET_TRUKKET`. | — | Kravet er trukket. Spor som ikke er sendt, regnes som trukket. | — | registrering | [V-SD02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-09 | SD-02 |
| GR-10 | TE trekker grunnlaget når bare vederlaget er sendt. | Vederlaget trekkes med, og saken er `LUKKET_TRUKKET`. | — | Fristen er ikke sendt og regnes som trukket. | — | registrering | [V-SD02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [GR-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u5) | avklart tolkning | F-GR-10 | SD-02 |
| GR-11 | TE trekker grunnlaget etter at byggherren har godkjent vederlaget prinsipalt mens grunnlaget ventet på svar. | Vederlag og frist trekkes med, også det godkjente vederlaget, og saken er `LUKKET_TRUKKET`. | Godkjent vederlag. Grunnlaget er ikke besvart. | Ansvarsgrunnlaget bærer kravene. Trekkes det, faller de. | — | registrering | [GR-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u5) | avklart tolkning | F-GR-11, F-MM-B2 (målmodellen) | — |
| GR-12 | TE oppdaterer grunnlaget etter å ha trukket det, før vederlag eller frist er sendt. | Oppdateringen avvises, og journalen er uendret. | — | Et trukket krav kan ikke tas opp igjen. Saken er lukket. | — | registrering | [V-TRUKKET](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-SD02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-12 | SD-02 |
| GR-13 | Byggherren frafaller pålegget (§ 32.3 c). | Grunnlaget får status `FRAFALT`, ikke `TRUKKET`. | Frafalt, med grunnlaget varslet i tide. | Pålegget er frafalt mot endringsordre for utført arbeid. TE har ikke trukket noe. | Byggherrens § 32.2-vurdering: i tide. | registrering | [V-FRAFALT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.3 første ledd bokstav c | avklart tolkning | F-GR-13, F-MM-B1 (målmodellen) | SK-04 |
| GR-14 | Byggherren frafaller pålegget og godkjenner deretter vederlag og frist. | Svarene er prinsipale. Saken er `OMFORENT`, og EO utstedes ikke fra KOE-saken (`kan_utstede_eo` er `false`). | Frafalt grunnlag. Prinsipalt godkjent vederlag og frist. | Avklart grunnlag. Endringsordren for utført arbeid går i en egen EO-sak (#69). | — | registrering | [GR-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3), [V-235](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.3 første ledd bokstav c | avklart tolkning | F-GR-14 | — |
| GR-15 | Byggherren frafaller pålegget og avslår vederlag og frist, og TE godtar begge avslagene. | Saken er `OMFORENT`, ikke `UKJENT`. EO utstedes ikke fra KOE-saken. | Frafalt grunnlag. Avslått vederlag og frist. | Kravene er oppgjort ved godtatt avslag. | — | registrering | [GR-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3), [V-FRAFALT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-TFR01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-GR-15, F-MM-B1 (målmodellen) | — |
| GR-16 | Byggherren frafaller pålegget før vederlag eller frist er sendt. | Saken er `UNDER_BEHANDLING`, som ved godkjent grunnlag der resten ikke er sendt. | Frafalt grunnlag. | Grunnlaget er avklart. TE kan fortsatt sende vederlag og frist. | — | registrering | [V-FRAFALT](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-TFR05](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.3 første ledd bokstav c | avklart tolkning | F-GR-16 | — |
| GR-17 | Byggherren frafaller pålegget og påberoper samtidig at grunnlaget er varslet for sent (§ 32.2). | Svaret avvises, og journalen er uendret. | — | Frafall skjer mot endringsordre og kan ikke kombineres med preklusjon. | Byggherrens § 32.2-vurdering: for sent. Det er kombinasjonen som avvises. | registrering | [V-235](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.3 første ledd bokstav c, NS 32.2 første ledd | avklart tolkning | F-GR-17, F-MM-B1x (målmodellen) | #235 |
| GR-18 | TE har endret grunnlaget fra pålegg (IRREG) til endringsordre (EO), og byggherren svarer «frafalt». | Svaret avvises, og journalen er uendret. | — | Svarvalgene i 32.3, også frafall, gjelder et varsel etter 32.2 om et pålegg etter 32.1. Et grunnlag med endringsordre har ikke noe pålegg å frafalle. | — | registrering | [V-B13-FRAFALL](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 32.1, NS 32.3 første ledd bokstav c | avklart tolkning | F-GR-18 | — |
| GR-19 | TE godtar et delvis godkjent vederlagssvar mens byggherren har avslått grunnlaget. | Aksepten godtas. Kravet er ikke oppgjort: saken er ikke `OMFORENT`, og EO kan ikke utstedes. | Avslått grunnlag. Delvis godkjent vederlag, subsidiært. | Partene er enige om beløpet, ikke om ansvaret. Enigheten får virkning hvis grunnlaget godkjennes. | — | registrering | [GR-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-GR-19, F-MM-A (målmodellen), F-MM-A1 (målmodellen) | — |
| GR-20 | TE har godtatt vederlagssvaret mens grunnlaget er avslått, og godtar deretter avslaget på grunnlaget. | Saken er `LUKKET_AVSLATT`, og EO kan ikke utstedes. | Avslått grunnlag. | Kravet er avslått. Enigheten om beløpet får ingen virkning. | — | registrering | [GR-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-GR-19, F-MM-A5a (målmodellen) | — |
| GR-21 | TE endrer underkategorien etter et avslag og godtar vederlagssvaret mens grunnlaget venter på nytt svar. Byggherren godkjenner deretter grunnlaget. | Aksepten godtas. Når grunnlaget godkjennes, står byggherrens beløp som avtalt, og saken er `OMFORENT` med fristen godkjent. | Først avslått grunnlag og subsidiært delvis godkjent vederlag. Etter det nye svaret: godkjent grunnlag. | Enigheten om beløpet får virkning når grunnlaget godkjennes. Byggherren har gitt beløpet og trenger ikke svare på vederlaget igjen. | — | registrering | [GR-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), [V-215](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u5) | avklart tolkning | F-GR-21, F-MM-A5b (målmodellen) | — |
| GR-22 | TE godtar vederlagssvaret før byggherren har svart på grunnlaget, og byggherren godkjenner deretter grunnlaget. | Aksepten godtas, og saken er ikke `OMFORENT` før grunnlaget er godkjent. Etter godkjenningen står byggherrens beløp som avtalt. | Delvis godkjent vederlag. Grunnlaget er ikke besvart, deretter godkjent. | Enighet om beløpet før ansvaret er avklart. Kravet er oppgjort når grunnlaget godkjennes. | — | registrering | [GR-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), [KA-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u5) | avklart tolkning | F-GR-22 | — |
| GR-23 | Byggherren reviderer et vederlagssvar TE har godtatt, mens grunnlaget venter på nytt svar etter endret underkategori. | Revisjonen avvises, og journalen er uendret. Et svar TE ikke har godtatt, kan byggherren revidere mens grunnlaget venter. | Det godtatte svaret står. | En enighet står, også mens grunnlaget venter. Revisjonsretten etter GR-U4 gjelder svar som ikke er godtatt. | — | registrering | [GR-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [GR-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u4) | avklart tolkning | F-GR-23, F-MM-A5b (målmodellen) | — |
| GR-24 | Byggherren godkjenner hele fristkravet mens grunnlaget er avslått, og godkjenner senere grunnlaget. | Det er enighet om dagene uten aksept, men kravet er ikke oppgjort før grunnlaget er avklart. Når grunnlaget godkjennes, er fristen oppgjort. | Avslått grunnlag. Fristen godkjent, subsidiært. | Standpunktene om dagene faller sammen. Ansvaret er omtvistet til grunnlaget godkjennes. | — | registrering | [GR-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7) | avklart tolkning | F-GR-24, F-MM-A (målmodellen), F-MM-A5b (målmodellen) | — |
| GR-25 | TE godtar et vederlagssvar som godkjenner hele kravet. | Aksepten avvises, og journalen er uendret: partene er allerede enige. | Godkjent vederlag. | Enigheten finnes uten aksept. | — | registrering | [GR-U7](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u7), [GR-U8](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u8) | avklart tolkning | F-GR-25, F-MM-A (målmodellen) | — |
| GR-26 | TE godtar byggherrens frafall av pålegget (§ 32.3 c). | Aksepten avvises, og journalen er uendret. Grunnlaget er avklart uten aksept, og byggherren kan fortsatt revidere frafallet. | Frafalt, med grunnlaget varslet i tide. | Frafallet er byggherrens standpunkt, ikke en enighet. | — | registrering | [GR-U9](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u9), [GR-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#gr-u3) | avklart tolkning | F-MM-B1 (målmodellen) | — |
| EO-01 | Byggherren utsteder en endringsordre i en KOE-sak som er `OMFORENT` (`eo_utstedt` i KOE-saken). | Utstedelsen avvises, og journalen er uendret. Sporene står med de avtalte beløpene og dagene. | — | En endringsordre utstedes som EO-sak, der TE kan godta eller bestride den. Enigheten i KOE-saken står. | — | registrering | [EO-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u1), [V-B02-3](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-EO-KOE](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-EO-01 | DT-05 |
| EO-02 | Byggherren har godkjent grunnlaget, og TE har ikke sendt vederlag eller frist. | Saken er `UNDER_BEHANDLING`, og `kan_utstede_eo` er `false`. | Godkjent grunnlag. | Ansvaret er avklart, men det finnes ikke noe krav å formalisere. TE kan fortsatt sende vederlag og frist. | — | registrering | [EO-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2), [V-TFR05](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-EO-02 | DT-06 |
| EO-03 | Byggherren har godkjent grunnlaget og vederlaget, og TE har ikke sendt frist. | `kan_utstede_eo` er `false`. Saken er ikke `OMFORENT`. | Godkjent grunnlag og vederlag. | Et spor TE fortsatt kan sende, hindrer endringsordre. | — | registrering | [EO-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2), [V-TFR05](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-EO-03 | DT-06 |
| EO-04 | TE trekker vederlag og frist etter at byggherren har godkjent grunnlaget. | `kan_utstede_eo` er `false`. | Godkjent grunnlag. | Ingen godkjent vederlag eller frist å formalisere. | — | registrering | [EO-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2) | avklart tolkning | F-EO-04 | — |
| EO-05 | Byggherren godkjenner vederlaget og avslår fristen, og TE godtar avslaget. | Saken er `OMFORENT`, og `kan_utstede_eo` er `true`. | Godkjent vederlag. Avslått frist. | Fristen er oppgjort ved godtatt avslag; vederlaget kan formaliseres. | — | registrering | [EO-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2), [V-TFR01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-EO-05 | — |
| EO-06 | TE godtar et delvis godkjent vederlagssvar, og byggherren godkjenner fristen. | Saken er `OMFORENT`, og `kan_utstede_eo` er `true`. | Delvis godkjent vederlag, godtatt av TE. Godkjent frist. | Byggherrens beløp er avtalt (KA-U5) og kan formaliseres. | — | registrering | [EO-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2), [KA-U5](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u5) | avklart tolkning | F-EO-06 | — |
| EO-07 | Byggherren knytter en KOE-sak som ikke er `OMFORENT`, til en EO-sak gjennom `/api/events` (`eo_koe_lagt_til`). | Tilknytningen avvises, og journalen er uendret. Når KOE-saken er `OMFORENT`, godtas samme tilknytning. | — | Bare et omforent krav kan formaliseres. | — | registrering | [EO-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u2) | avklart tolkning | F-EO-07 | DT-08 |
| EO-08 | Byggherren oppretter en EO-sak med en omforent KOE-sak. | `kan_utstede_eo` er `false` i KOE-saken. | — | KOE-saken inngår i en endringsordre og kan ikke inngå i en annen. | — | registrering | [EO-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u3) | avklart tolkning | F-EO-08 | DT-07 |
| EO-09 | Byggherren knytter en KOE-sak til en EO-sak mens den inngår i en annen EO-sak som TE har bestridt. | Tilknytningen avvises, og journalen er uendret. | — | KOE-saken inngår i høyst én endringsordre, også når den er bestridt. TEs uenighet føres i en ny KOE. | — | registrering | [EO-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u3), [V-TFR02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-EO-09 | DT-08 |
| EO-10 | Byggherren oppretter en EO-sak (`eo_opprettet`). | Endringsordren er `UTKAST`, og saken er `UTKAST`. | — | Endringsordren er ikke utstedt. | — | registrering | [V-TFR02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-EO-10 | — |
| EO-11 | Byggherren utsteder endringsordren. | Endringsordren er `UTSTEDT`, og saken `VENTER_PAA_SVAR`. | Endringsordrens beløp og dager. | Byggherren har pålagt endringen. TE har ikke svart. | — | registrering | [V-TFR02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-EO-11 | — |
| EO-12 | TE godtar endringsordren. | Endringsordren er `AKSEPTERT`, og saken `LUKKET`. | — | Endringsordren er avtalt. | — | registrering | [V-TFR02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-EO-12 | — |
| EO-13 | TE bestrider endringsordren. | Endringsordren er `BESTRIDT`, og saken `LUKKET`. | — | En endringsordre forhandles ikke. TEs uenighet føres i en KOE. | — | registrering | [V-TFR02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-EO-13 | — |
| EO-14 | Byggherren reviderer en bestridt endringsordre, og TE godtar revisjonen. | Etter revisjonen er endringsordren `REVIDERT` med revisjon 1, TEs svar er nullstilt, og saken `VENTER_PAA_SVAR`. Etter aksepten er saken `LUKKET`. | Den reviderte endringsordren. | TE svarer på den nye utgaven. | — | registrering | [V-TFR02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | avklart tolkning | F-EO-14 | — |
| EO-15 | TE godtar en endringsordre som ikke er utstedt. | Aksepten avvises, og journalen er uendret. | — | Det finnes ingen utstedt endringsordre å godta. | — | registrering | [V-TFR02](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | avklart tolkning | F-EO-15 | — |
| EO-16 | Byggherren utsteder samme endringsordre på nytt før TE har svart. | Utstedelsen avvises, og endringsordren står med beløpet fra første utstedelse. | Første utstedelse. | Endringsordren utstedes én gang. En ny utgave er en revisjon. | — | registrering | [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | avklart tolkning | F-EO-16 | DT-09 |
| EO-17 | Byggherren utsteder endringsordren på nytt etter at TE har godtatt den. | Utstedelsen avvises. Endringsordren står som `AKSEPTERT`, med TEs aksept og det avtalte beløpet. | Den godtatte endringsordren. | En akseptert endringsordre er endelig. | — | registrering | [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | avklart tolkning | F-EO-17 | DT-09 |
| EO-18 | Byggherren reviderer en utstedt endringsordre som TE ikke har bestridt. | Revisjonen avvises, og endringsordren står som `UTSTEDT` med revisjon 0. En bestridt endringsordre kan revideres. | Den utstedte endringsordren. | Byggherren reviderer bare en bestridt endringsordre. | — | registrering | [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | avklart tolkning | F-EO-18 | DT-09 |
| EO-19 | TE bestrider endringsordren en gang til. | Den andre bestridelsen avvises, og journalen er uendret. | — | TE svarer én gang på hver utgave. | — | registrering | [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | avklart tolkning | F-EO-19 | DT-09 |
| EO-20 | TE godtar endringsordren etter å ha bestridt den. | Aksepten avvises, og endringsordren står som `BESTRIDT`. | — | TE svarer én gang på hver utgave. En revisjon gir TE et nytt svar. | — | registrering | [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | avklart tolkning | F-EO-20 | DT-09 |
| EO-21 | Byggherren knytter en omforent KOE-sak til en EO-sak etter utstedelsen. | Tilknytningen avvises, og journalen er uendret. Før utstedelsen godtas den. | — | KOE-tilknytningen endres bare før utstedelse. | — | registrering | [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | avklart tolkning | F-EO-21 | DT-09 |
| EO-22 | Byggherren fjerner en KOE-sak fra en utstedt endringsordre. | Fjerningen avvises, og KOE-saken inngår fortsatt. Før utstedelsen godtas den. | — | KOE-tilknytningen endres bare før utstedelse. | — | registrering | [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | avklart tolkning | F-EO-22 | DT-09 |
| EO-23 | Byggherren oppretter en endringsordre i en KOE-sak (`eo_opprettet`). | Opprettelsen avvises, og journalen er uendret. Samme opprettelse godtas i en EO-sak. | — | En endringsordresak kan følge av en KOE-sak, men ikke erstatte den. | — | registrering | [V-EO-KOE](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [EO-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u1) | avklart tolkning | F-EO-23 | — |
| EO-24 | Byggherren utsteder en EO-sak med en KOE-sak i utkastet, og utstedelsen nevner ikke KOE-sakene. | KOE-saken inngår fortsatt i endringsordren. | — | Tilknytningen er registrert før utstedelse (EO-U4). At en utstedelse uten KOE-liste ikke fjerner den, er ikke vedtatt. | — | registrering | [EO-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#eo-u4) | arbeidshypotese | F-EO-24 | DT-10 |
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
- Et forløp gjelder én KOE-sak, `hoved`. `sakstype` gir hovedsaken en annen
  sakstype (`endringsordre`), og `saker` navngir flere saker med sakstype. Et
  steg eller en kontroll med `sak` gjelder den saken. `$navn` i en handling
  eller forventning er sakens ID, for eksempel `"koe": "$hoved"`. Prefikset
  gjelder bare en hovedsak av typen `standard`. Kontrollen i
  `domenetabell.py` avviser ukjente saker og en `koe` som ikke viser til en
  KOE-sak.

**Domenekrav og dagens kontrakt.** Forventningen er virkningen i raden:
avvist eller godtatt, status, beløp, dager, tilknytning. Stiene i kontrollene
(`kan_utstede_eo`, `endringsordre_data.status`), `lagret.*` og hendelsesnavnene
i `korpus.py` er dagens API og journal. De hører til adapteren, ikke til
forventningen. En kjører mot en annen implementering oversetter dem, og den
skal ikke gjenbruke Python-reglene som bygger svarene (`beregn_vederlag`,
`beregn_frist`). Aksepten viser til det siste svaret i sporet
(`respons_event_id`), altså svaret TE har sett, også når det gjelder en
tidligere kravversjon. Om det er gjeldende svar, avgjør serveren (KA-U1).

## Baner

| Bane | Hva den prøver | Kjøres |
| --- | --- | --- |
| Domenet | Validering av data, parsing, forretningsreglene og projeksjonen i minnet, i samme rekkefølge som `/api/events`. Hendelsen journalen ville fått, er `to_cloudevent()` i minnet | `backend/tests/test_domenetabell/`, i CI |
| `/api/events` og testbasen | Ruta med ekte dekoratører og lagre mot PostgreSQL. Avvisning gir uendret journal, og tilstanden i svaret er lik tilstanden regnet av journalen etter gjenlesing | `backend/tests/test_database/test_domenetabell_lagring.py`, i CI-jobben `database` |
| `/api/events/batch` og testbasen | Som over, med hver handling som eneste hendelse i en batch | Samme fil, parameteren `batch` |
| Batcher med flere hendelser | Forløpet sendt med TEs påfølgende handlinger i én batch, den første sammen med `sak_opprettet`, gir samme journal og tilstand som enkeltvis. En batch med en avvist TE-handling lagrer ingenting, og samme batch uten den godtas. Likhet mellom to innganger, ikke en domenefasit | Samme fil, `test_forlop_i_batcher_gir_samme_journal_og_tilstand` og `test_batch_med_en_avvist_hendelse_lagrer_ingenting` |
| Godkjenningsflyten | Bare invarianten om gjeldende krav mot `claims()` | Begge banene over |
| Flere saker | Hver sak er en egen bane av samme slag. En avvisning skal la journalen i alle sakene stå uendret | Domenebanen og begge rutebanene. Ikke i batchtestene, som sender én sak |

Ikke kjørt: byggherrens svar i batch med andre hendelser (et svar viser til
hendelser i tilstanden, og en batch har én kontraktsrolle), hele
godkjenningsflyten med pakker og publisering, Catenda, frontendens skjemaer og
en TypeScript-kjører. Tilfellene av en avvist hendelse i en batch utledes av
korpuset; testen feiler hvis det ikke finnes noen.
Kontrollsakene (`prov`) prøves mot forretningsreglene også i databasebanen,
fordi en prøve gjennom ruta ville skrevet hendelsen. Gjenlesingen regner
tilstanden som samme innloggede bruker som ruta, fordi projeksjonen slår opp
navnet i `utstedt_av` (KR-04, MG-01).

## Kontrakten for flyten

[kontrakt.json](kontrakt.json) er kontrakten fra #272 for den representative
flyten i språkprøven (#274): vederlag med grunnlagsavhengighet, et fristscenario
med spesifisert krav og TEs aksept. Radene den dekker, står i `x-rader`. Den
skiller tre grenser:

| Grense | Definisjon i skjemaet | Hva den sier |
| --- | --- | --- |
| Kommando | `konvolutt`, `batchkonvolutt`, `kommando.*`, `serverfelt` | Det klienten sender til `/api/events` og `/api/events/batch`, med svar- og kravreferanser og `expected_version` |
| Lagret hendelse | `rad`, `hendelse.*` | Raden i `hendelse`. `data` har bare satte felt, og `referstoid` er referansen |
| Offentlig tilstand | `tilstand`, `tilstand.*` | Feltene flyten bruker. Alle finnes alltid, `null` når de mangler verdi |

Aksepten er den eneste nye kommandoen, og den er streng: et ukjent felt i
kommandoen eller i `data` avvises, og svaret TE godtar, må være
`<spor>.gjeldende_respons_event_id` ([KT-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#kt-u1)).
De andre kommandoene i flyten er tolerante som før: et ukjent felt i `data`
forkastes ved lagring, og `null` i et valgfritt felt lagres som utelatt.
Skjemaet beskriver det flyten sender i dem, ikke alt serveren godtar. Historikken leses tolerant, og `hendelse.*` beskriver det en leser må
godta: en aksept lagret før #272 har `referstoid` lik `null`, og et fristsvar fra før kan ha `spesifisert_krav_ok`
lik `true` uten at vurderingen er gjort (DT-03).

`x-bruk` på tilstandsfeltene skiller tre ting. «forventning» er en opplysning en
rad i tabellen krever. «kommando» trengs for å bygge en kommando. «adapter»
leses bare av kjøreren i `korpus.py`, med dagens navn, og er ikke noe en annen
implementering må tilby. `x-begrep` viser til begrepene over.

I fristscenariet er kravet spesifisert uten forespørsel, så byggherren skal
vurdere spesifiseringen etter § 33.6.1. Vurderingen som er utelatt og `null`, er
§ 33.6.2 (`foresporsel_svar_ok`). At `spesifisert_krav_ok` er utelatt når
spørsmålet ikke gjelder (KA-18a, DT-03), prøves av korpuset med forespørselen.

Skjemaet bruker et lite utvalg av JSON Schema 2020-12. Validatoren i
[`kontrakt.py`](../../backend/tests/test_domenetabell/kontrakt.py) kan akkurat
det utvalget, og et annet nøkkelord gir rød test. Testene står i
[`test_kontrakt.py`](../../backend/tests/test_domenetabell/test_kontrakt.py)
(skjemaet mot modellene, korpusets kommandoer, data og tilstand i minnet) og
[`test_kontrakt_aksept.py`](../../backend/tests/test_database/test_kontrakt_aksept.py)
(aksept, avvisninger, versjonskonflikt, nullpolitikk og historikk gjennom begge
rutene mot testbasen).

Ikke i kontrakten: grensen for godkjenningspakker, kommandoene utenfor flyten,
genererte typer (#274) og en hviteliste for hele tilstanden (#292).

## Dekning og grenser

Tabellen dekker radene over, ikke hele livsløpet. Ikke dekket ennå:
forsering. I grunnlagsdelen er ikke prøvd: revisjon av
grunnlagssvaret (`respons_grunnlag_oppdatert`), frafall ved valgrett
(`VALGRETT`), andre hovedkategorier enn endring, endret underkategori mellom
to pålegg, og passivitet etter § 32.3 annet ledd. Flere
innsigelser i ett brev og senere dokumentert korrespondanse er avgrenset i
metodeprøvene, ikke her.

I endringsordredelen er EO-sakene sendt gjennom `/api/events` og
`/api/events/batch`, som kjører forretningsreglene. Ikke prøvd:
`/api/endringsordre/opprett` og godkjenningskommandoen
(`EOApprovalService`), som skriver opprettelse og utstedelse i samme
transaksjon og kontrollerer kandidatene og beløpet; at en
godkjenningspolicy stopper `eo_*` i de offentlige rutene; at beløpet i
endringsordren samsvarer med enigheten i KOE-sakene; en aksept med
`akseptert: false`; KOE-hendelser i en EO-sak; en EO-sak før `eo_opprettet`
(samlet status `INGEN_AKTIVE_SPOR`); og endringsordren for utført arbeid etter
frafall (#69). Endringsordre i KOE-saken er prøvd med én forløpsvariant,
selv om dagens kode avviker på flere måter (DT-05).

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
alene. Radene GR-01–GR-25 bygger på vedtakene i 3.1. Der teksten i punkt 31.3 og
32.1–32.3 bærer forventningen, står punktet som egen kilde. Passivitet etter
§ 32.3 annet ledd og valgrett (som ikke står i punkt 32) brukes ikke i noen rad.
Radene EO-01–EO-24 bygger på vedtakene i 3.1 alene; punkt 31 brukes ikke som
egen kilde der. Punkt 34 (vederlagsjustering) og 35 (uenighet om endringer)
er ikke lest og brukes ikke.

Begrepslisten i [testinventaret](../vedlegg/testinventar-271-2026-10-08/README.md#4-begrepsavklaring-som-grunnlag-for-domenetabellen-271)
var foreløpig og er erstattet av denne.
