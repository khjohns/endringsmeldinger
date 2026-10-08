# Domenetabell

Vedtatt forventet atferd for saksforløpet, med kilde og tolkningsstatus per
rad og bevis-saker som kan kjøres mot en implementering. Tabellen er
referansen for begrepene under B-14 og [#271](https://github.com/khjohns/endringsmeldinger/issues/271).
[Hovedplanen](../plans/2026-09-16-godkjenning-og-varig-levering.md) er fortsatt
autoritativ for vedtak og funnstatus. Radene viser til vedtakene og gjentar dem
ikke. Kjente avvik står bare som funn-ID.

Første del gjelder kravversjon og aksept (SK-02, SK-03), med tilgrensende rader om
godtatt preklusjon, låste varsler og byggherrens vurdering av rettidighet.

| Fil | Innhold |
| --- | --- |
| [regler.json](regler.json) | Kilder, tolkningsstatuser og radene i tabellen |
| [bevis-saker.json](bevis-saker.json) | Forløp med handlinger, kontroller, kjente avvik og invarianter |
| [`domenetabell.py`](../verktoy/domenetabell.py) | Kontrollerer referansene og skriver tabellen under |
| [`test_domenetabell/`](../../backend/tests/test_domenetabell/) | Kjører bevis-sakene mot Python-projeksjonen i minnet |
| [`test_domenetabell_lagring.py`](../../backend/tests/test_database/test_domenetabell_lagring.py) | Kjører dem gjennom `/api/events` mot testbasen, med gjenlesing |

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
| **Sporstatus**, **samlet status** | Oppsummering for visning og regler. Ikke en rettslig konklusjon i seg selv | `SporStatus`, `overordnet_status` | AGENTS.md |

**To tidsakser.** *Registrering* er rekkefølgen i journalen, med `tidsstempel`
satt av serveren. *Sendt/mottatt* er når et varsel eller brev faktisk ble sendt
eller mottatt, for eksempel `frist_varsel.dato_sendt`. Kolonnen «Tidsakse» sier
hvilken raden bygger på.

## Tabellen

Skrevet av `python3 docs/verktoy/domenetabell.py --skriv`. Rett i JSON-filene,
ikke her. «Kjent avvik» er funn-ID-en i hovedplanens funnregister.

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
| KA-08b | TE godtar et gjeldende svar som er delvis godkjent. | Aksepten registreres. Sporet blir `GODKJENT`, med byggherrens beløp. | Uendret: delvis godkjent. | Enighet om byggherrens beløp. | — | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | arbeidshypotese | F-KA-08b | — |
| KA-09 | TE godtar et fristsvar som er prinsipalt avslått fordi varselet etter § 33.4 kom for sent, med subsidiært godkjente dager. | Godtatt avslag (`AVSLATT_AKSEPTERT`). De subsidiære dagene gjør ikke sporet `GODKJENT`. | Prinsipalt avslått (preklusjon trukket av systemet), subsidiært godkjente dager. | Aksepten gjelder hele svaret, også preklusjonen. | Byggherrens vurdering av varselet: for sent. | registrering | [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1), [V-B13-PREKLUSJON](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-SK01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | arbeidshypotese | F-KA-09 | — |
| KA-10 | TE godtar et grunnlagssvar som påberoper at grunnlaget er varslet for sent (§ 32.2). | Godtatt avslag: grunnlaget `AVSLATT_AKSEPTERT`, saken `LUKKET_AVSLATT`, EO kan ikke utstedes. | Prinsipalt prekludert, subsidiært godkjent grunnlag. | Godtatt avslag. | Byggherrens vurdering av grunnlagsvarselet: for sent. | registrering | [V-SK01](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-KA-10 | SK-01 |
| KA-11 | Byggherren reviderer et svar TE har godtatt. | Revisjonen avvises, og journalen er uendret. | Det godtatte svaret står. | Enigheten står. | — | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-11 | SK-03 |
| KA-12 | Byggherren reviderer et svar som ikke er godtatt, på gjeldende kravversjon. | Revisjonen godtas. | Det reviderte svaret. | Byggherrens nye standpunkt til versjonen. | — | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [V-B13](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | arbeidshypotese | F-KA-12 | — |
| KA-13 | TE har godtatt et svar, sender en ny kravversjon og godtar byggherrens svar på den. | Den nye aksepten godtas. | Svaret på den nye versjonen. | Enighet om den nye versjonen. | — | registrering | [V-SK02-SK03](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), [KA-U1](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u1) | avklart tolkning | F-KA-13 | SK-03 |
| KA-14 | TE oppdaterer et krav som er trukket. | Oppdateringen avvises, og journalen er uendret. Et nytt krav om samme forhold går i en ny sak. | — | Et trukket krav kan ikke tas opp igjen. | — | registrering | [V-TRUKKET](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-14 | SK-02 |
| KA-15 | TE sender et frittstående konsekvensvarsel (rigg og drift) etter et spesifisert vederlagskrav. | Ingen ny kravversjon. Gjeldende krav er det samme i projeksjonen og i godkjenningsflyten, og byggherren kan svare på det. | Uendret. | Varselet er et eget varsel, ikke et nytt krav. | — | registrering | [KA-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u2) | avklart tolkning | F-KA-15 | DT-02 |
| KA-16 | Byggherren sender forespørsel om spesifisert fristkrav, og TE spesifiserer. | Forespørselen er ingen kravversjon. Når kravet kan besvares, er gjeldende krav det samme i projeksjonen og godkjenningsflyten. | — | — | — | registrering | [KA-U2](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u2) | avklart tolkning | F-KA-16 | — |
| KA-17 | TE sender en ny kravversjon etter at saken er `OMFORENT`. | Kravversjonen avvises, og journalen er uendret. | — | Saken er oppgjort. Et nytt krav går i en ny sak. | — | registrering | [KA-U3](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u3) | avklart tolkning | F-KA-17 | — |
| KA-18a | Byggherren svarer på et fristkrav som besvarte forespørselen etter § 33.6.2. Spørsmålet etter § 33.6.1 gjelder ikke og vurderes ikke. | `spesifisert_krav_ok` er utelatt i hendelsen og `null` i tilstanden. | Ingen begrensning etter § 33.6.1. | Spesifiseringen kan ikke møtes med § 33.6.1. | Ikke vurdert. | registrering | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4), [V-API-NULL](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger), NS 33.6.2 fjerde ledd | avklart tolkning | F-KA-18a | DT-03 |
| KA-18b | Byggherren vurderer spesifiseringen som i tide. | `spesifisert_krav_ok` er `true` i hendelsen og tilstanden. | Ingen begrensning etter § 33.6.1. | Kravet begrenses ikke etter § 33.6.1. | I tide. | registrering | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4), NS 33.6.1 | avklart tolkning | F-KA-18b | — |
| KA-18c | Byggherren vurderer spesifiseringen som for sent. | `spesifisert_krav_ok` er `false`, og svaret har utløseren `reduksjon_spesifisert`. | Begrensning etter § 33.6.1, regnet av serveren. | Kravet kan begrenses etter § 33.6.1. | For sent. | registrering | [KA-U4](../plans/2026-09-16-godkjenning-og-varig-levering.md#ka-u4), NS 33.6.1, [V-B13](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-18c | — |
| KA-19 | TE spesifiserer fristkravet med en annen dato for varselet etter § 33.4 enn det registrerte. | Spesifiseringen avvises, og varselet står med datoen og metoden det fikk første gang. | — | Varselet er sendt én gang. Datoen kan ikke flyttes av en senere kravversjon. | — | sendt/mottatt | [V-SK12](../plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger) | avklart tolkning | F-KA-19 | SK-12 |
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
  Kjøreren gjør det til en streng `xfail`; avviket normaliseres ikke bort.
- `invarianter` prøves etter hvert steg i alle forløp, med egne kjente avvik.

## Baner

| Bane | Hva den prøver | Kjøres |
| --- | --- | --- |
| Domenet | Validering av data, parsing, forretningsreglene og projeksjonen i minnet, i samme rekkefølge som `/api/events`. Hendelsen journalen ville fått, er `to_cloudevent()` i minnet | `backend/tests/test_domenetabell/`, i CI |
| `/api/events` og testbasen | Ruta med ekte dekoratører og lagre mot PostgreSQL. Avvisning gir uendret journal, og tilstanden i svaret er lik tilstanden regnet av journalen etter gjenlesing | `backend/tests/test_database/test_domenetabell_lagring.py`, i CI-jobben `database` |
| Godkjenningsflyten | Bare invarianten om gjeldende krav mot `claims()` | Begge banene over |

Ikke kjørt: `/api/events/batch`, hele godkjenningsflyten med pakker og
publisering, Catenda, frontendens skjemaer og en TypeScript-kjører.
Kontrollsakene (`prov`) prøves mot forretningsreglene også i databasebanen,
fordi en prøve gjennom ruta ville skrevet hendelsen.

## Dekning og grenser

Tabellen dekker radene over, ikke hele livsløpet. Ikke dekket ennå:
grunnlagsendring med og uten endret underkategori, frafall, subsidiært svar
mens grunnlaget venter på nytt svar, EO-særforløp og forsering. Flere
innsigelser i ett brev og senere dokumentert korrespondanse er avgrenset i
metodeprøvene, ikke her.

Én forløpsvariant per rad er prøvd, med faste beløp og datoer. Antall forløp
beviser ikke dekning av domenet. Kontrollen i `domenetabell.py` viser at
kilder, rader, forløp og funn-ID-er henger sammen. Den viser ikke at en
forventning er juridisk riktig. Rader med tolkningsstatus `arbeidshypotese` må
avklares før de brukes som bindende produktkrav.

Teksten i NS 8407 er ikke lest i denne delen. Radene med standardkilde bygger på
regelmodulen og tidligere vedtak, slik kildene sier.

Begrepslisten i [testinventaret](../vedlegg/testinventar-271-2026-10-08/README.md#4-begrepsavklaring-som-grunnlag-for-domenetabellen-271)
var foreløpig og er erstattet av denne.
