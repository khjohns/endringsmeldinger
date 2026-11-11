# Arkiv for hovedplanen

**Opprettet:** 2026-10-24 ([#1020](https://github.com/khjohns/endringsmeldinger/issues/1020)), etter oppdragsgivers svar 20.10 på spørsmål 4 i
[vurderingen av målbildet](../vedlegg/vurdering-maalbilde-2026-10-20/sporsmal.md): «Flytt 3.1 til en
generert fil ved siden av planen, og flytt de historiske funnene og merknadene til et
arkiv. […] Autoriteten flyttes uttrykkelig.»

Arkivet har det som var historisk i [hovedplanen](2026-09-16-godkjenning-og-varig-levering.md) 24.10,
og senere daterte arkiveringer, flyttet ordrett:

- **Avsluttede funn** (avsnitt 4 her): rader i funnregisteret med status *Lukket*,
  *Gjennomført*, *Bortfalt*, *Avvist*, *Regel*, *Korreksjon*, *Fordelt* eller flyttet,
  og uten pakke som gjenstår. Arkivet er autoritativt for statusen deres. Åpnes et
  funn igjen, flyttes raden tilbake til hovedplanen med en datert merknad.
- **Leveransemerknadene til arbeidspakkene** (avsnitt 5 her): de daterte merknadene
  som fører det som er levert, og de redaksjonelle merknadene som strukturen i planen
  alt viser. Merknadene som fortsatt styrer omfanget eller rekkefølgen, står i planen.
- **Verifikasjonen av redigeringene** av planen fram til 24.10.
- **Senere arkiveringer:** [11.11](#arkivering-11112026), med redaksjonshistorikk,
  leveransebelegg og avsluttede bestillinger. Videreførte krav står i hovedplanen.

Arkivet endres ikke, bortsett fra at nye arkiveringer legges til med dato. Nye
merknader føres i hovedplanen. Vedtakene står i [vedtaksfila](vedtak.md), og
gjeldende føringer (3.2) og de åpne beslutningene (3.4) står i hovedplanen.

## 4. Avsluttede funn

Statusordene og kildene står i [funnregisteret i hovedplanen](2026-09-16-godkjenning-og-varig-levering.md#4-funnregister).

### 4.1 Godkjenning og levering: AP, S, RV, SA

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AP-01 | Lukket | Alternative EO-innganger. `e235412`, 17.09. Testinventarets rad med `test_stale_reserved_id_…` gjelder AP-04, ikke AP-01 | H, K 17.09 | — |
| AP-02 | Lukket | Endret fullmakt før utstedelse. `e235412` | H | — |
| AP-03 | Lukket | Sluttdato i fullmaktsgrunnlaget. `e235412`; regresjon rettet som RV-01 | H | — |
| AP-05 | Lukket | Felles satsoppslag. `e235412` | H | — |
| S1–S10 | Fordelt | S1 → SA-01. S2 → RC-2, lukket 20.09. S3 → RV-10. S4 → SA-02/03. S5 → RV-12, F3. S6 besvart: én RPC gir atomisk flerstegsskriving. S7 lukket med SA-01 (ingen `require_supabase_auth` i produksjonskode, L 22.09). S8 → kapasitet, B-09. S9 → AR-05. S10 → AR-02, MS-02 | H, L | Se ID |
| RV-01 | Lukket | Fullmaktsgulv når grunnlaget er uberegnet | H | — |
| RV-04 | Lukket | `forsering_respons` under godkjenningsporten | H | — |
| RV-05 | Lukket | Vedlegg krever kontraktsside | H | — |
| RV-08 | Lukket | `actorteam` i basen (`20260920152042`) | D 20.09 | — |
| RV-09 | Lukket | Aktivitetstall etter det leseren ser. Skrivesiden i batchruta: se AUT-03 | H | — |
| RV-11 | Lukket | Versjonskonflikt gir 409 | H | — |
| RV-15 | Lukket | Hendelsestabeller uten migrasjon: lukket med DB-01/DA-01. Viewene finnes ikke (DB-08) | D 19.–20.09 | — |
| RV-16 | Lukket | Live-tester er opt-in | H | — |
| RV-21 | Lukket | Lukket med INT-04 | H | — |
| RV-22 | Lukket | Analytics slettet | H | — |
| SA-01 | Lukket | Supabase-OAuth-flaten fjernet | H | — |
| SA-02, SA-03 | Lukket | Analytics slettet | H | — |

#### Domenet i KOE-, EO- og forseringssakene

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| TFR-01 | Lukket | `AVSLATT_AKSEPTERT`, 19.09 | H | — |
| TFR-02 | Lukket | `overordnet_status` ga `INGEN_AKTIVE_SPOR` for forsering og EO. Testinventarets FR-01. **Merknad 2026-09-23:** statusene er besluttet av oppdragsgiver. Forsering får aldri en lukket status, fordi TE kan oppdatere kostnader og stoppe etter BHs svar: ikke varslet `UTKAST`, varslet `VENTER_PAA_SVAR`, avslått `UNDER_FORHANDLING`, akseptert `UNDER_BEHANDLING`; stopp endrer ikke statusen. En EO er en ordre og forhandles ikke; uenighet føres i en KOE: `UTKAST`; utstedt og revidert `VENTER_PAA_SVAR`; akseptert og bestridt `LUKKET`. EO-hendelsene er unntatt fra sperren for lukkede saker. Ingen nye statusverdier | K 23.09 | — |
| TFR-03 | Lukket | Tilbaketrekking ble blokkert ved subsidiær enighet. Testinventarets FR-02. **Merknad 2026-09-23:** rettet for vederlag og frist. Et krav som bare er godkjent subsidiært (`er_subsidiaert_*`), kan trekkes; godkjenner BH grunnlaget senere, er det oppgjort. Reproduksjonen er ordinær test, med nye tester for frist og for sperren etter at grunnlaget er godkjent | K 23.09 | — |
| TFR-04 | Lukket | 0 og 0,0 ble forkastet som falsy. Testinventarets FR-03. **Merknad 2026-09-23:** rettet ved at `_copy_fields_if_present` bare hopper over `None`; parameteren `require_truthy` er fjernet, og `subsidiaer_triggers` følger samme regel. Den strenge `xfail` er gjort om til ordinær test med uendrede assertions | K 23.09 | — |
| TFR-05 | Lukket | Godkjent grunnlag ble rapportert som `UTKAST`. Testinventarets FR-04. **Merknad 2026-09-23:** oppdragsgiver valgte `UNDER_BEHANDLING` for en sak der grunnlaget er godkjent eller låst og resten ikke er sendt. To ordinære tester som låste `UTKAST` (`test_not_omforent_with_utkast_tracks` og `test_sak_oppgjort_ved_godtatt_avslag_rapporteres_ikke_som_ukjent`), er endret etter beslutningen. Et grunnlag som er trukket, eller der avslaget er godtatt, gir fortsatt `UTKAST` (SD-02) | K 23.09 | — |
| TFR-06 | Lukket | Respons på uspesifisert fristvarsel. **Merknad 2026-09-23:** reprodusert: BH kan godkjenne 10 dager på et nøytralt varsel uten krevde dager, og sporet blir `GODKJENT`. Ikke rettet, fordi en sperre må slippe gjennom innsigelse mot sen varsling (§ 5) og forespørselen (§ 33.6.2, DRF-01), og hvordan de registreres er ikke avgjort. **Avgjort 23.09** (3.1): innsigelse og forespørsel blir egne handlinger, og et svar med dager avvises til kravet er spesifisert **Merknad 2026-10-04:** rettet etter vedtaket (#62). Et svar med dager og resultat (`respons_frist`, `respons_frist_oppdatert`) avvises så lenge kravet ikke har dager (`CLAIM_SPECIFIED`, § 33.7); det gjelder også `begrunnelse_utsatt` (§ 33.6.2 femte ledd). Innsigelse mot sen varsling er den nye hendelsen `frist_innsigelse_sendt` (§ 5 tredje ledd), som setter `frist_varsel_ok=false` og verken resultat eller status. En sak med et krav uten dager gir `UNDER_BEHANDLING`, ikke `VENTER_PAA_SVAR`, og neste handling er TEs. `SporStatus` er ikke utvidet. Reproduksjonen er ordinær test. Gjennomføringen står i [notatet om nøytralt fristvarsel](../gjennomforing-noytralt-fristvarsel-2026-10-04.md). **Merknad 2026-10-05:** vedtak (oppdragsgiver) og bygget: den faste teksten etter § 33.6.2 første ledd må stå uendret i både `begrunnelse` og brevet til `frist_foresporsel_sendt`, ellers 400. Teksten ligger i `backend/constants/frist_foresporsel.json`, som frontenden også leser (#173). Et fristsvar med `har_bh_foresporsel` eller `dato_bh_foresporsel` avvises med 400; bare forespørselen setter dem (#182) | K 2026-10-04 | — |
| GFK-02 | Lukket | `exposure()` ignorerte `ny_sluttdato`. **Merknad 2026-09-23:** rettet i `approval_route`: en ny sluttdato i et fristsvar gir `amount=None`, krever hele kjeden, og kjeden må dekke det som lar seg verdsette (`minimum`), som for endringsordrer. Uten dagmulktssats er atferden uendret (B-06); testen påstår bare at ruten aldri blir kortere enn kjeden. Frontendens `calculateAuthority` speiler ikke dette, men skjemaet sender ikke `ny_sluttdato`. **Avgjort 23.09** (3.1): ubegrenset fullmakt skal kunne sende alene. **Merknad 2026-09-24:** bygget. En avsender med ubegrenset fullmakt får tom rute også når beløpet ikke kan verdsettes, for fristsvar og endringsordrer, og også uten konfigurert kjede. Alle andre trenger fortsatt hele kjeden. Unntatt er en endringsordre med fristdager uten dagmulktssats: der gjelder B-06, og kjeden kreves som før. Pakker i omløp med ubegrenset avsender blir returnert ved neste avstemming, fordi ruta endres. `test_ny_sluttdato_kan_ikke_godkjennes_av_saksbehandler_alene` påstod det motsatte og er snudd etter vedtaket, som `test_ny_sluttdato_kan_sendes_alene_med_ubegrenset_fullmakt`. **Merknad 2026-10-10:** vedtaket er endret av [EO-U6](vedtak.md#eo-u6) (3.1) for en endringsordre som er byggherrens svar på grunnlaget i en KOE-sak. Funnstatusen er uendret | K 23.09 | — |
| GFK-06 | Lukket | Godkjent grunnlag alene verdsettes til 0 kr. **Merknad 2026-09-23:** reprodusert gjennom `ApprovalService`: en prosjektleder godkjenner ansvaret for et krav på 50 mill. alene, og pakken godkjennes ved innsending. Ikke rettet: hvordan en slik godkjenning skal verdsettes, er en fullmaktsbeslutning for byggherren. **Avgjort 23.09** (3.1): TEs krevde beløp, og hele kjeden når kravet ikke er tallfestet. **Merknad 2026-09-24:** rettet etter vedtaket og presiseringen samme dag (3.1). `exposure` verdsetter godkjent ansvar per spor av TEs krav, som `ApprovalService` leser av saken (`krav_fra_tilstand`), og setter i pakkens `authorityContext.krav`. Krav som ikke er sendt eller tallfestet, gir hele kjeden med det verdsatte som gulv. Endrer TE kravet etter at pakken er laget, returneres pakken. Krevde dager uten sats avvises som for et fristsvar (B-06 uendret). Frontendens `calculateAuthority` og `kravFraSak` speiler regelen. Særskilte krav som henger igjen i tilstanden (SD-03), gir for høy verdi. Reproduksjonen er ordinær test med strengere påstander; tre ordinære tester som godkjente ansvar uten krav, har fått trukne eller tallfestede krav i oppsettet, og to tellinger av hendelser er gjort relative | K 24.09 | — |
| BR-01 | Lukket | BHs `beregnings_resultat` lagres som sendt, også når vurderingene i samme svar gir et annet resultat. Sporstatus, `overordnet_status` og `kan_utstede_eo` følger konklusjonen: et fristsvar uten fremdriftshindring (§ 33.1) og et vederlagssvar med 0 kr, begge merket «godkjent», ga `GODKJENT`, `OMFORENT` og utstedbar EO. Reprodusert gjennom `/api/events` og godkjenningsflyten, med kontrollsak. Rettes etter B-13. **Merknad 2026-09-24:** B-13 avgjort med (2) (3.1); svaret skal avvises. `/api/events/batch` er en tredje inngang som reproduksjonene ikke dekker. **Merknad 2026-10-04:** rettet etter B-13 (#63). Regelmodulen `backend/regler/` regner ut resultat, beløp, dager og subsidiært standpunkt, og forretningsreglene sammenlikner med klientens verdier for alle tre inngangene. Et svar med annet resultat avvises med `RESULT_MISMATCH` og serverens verdi, et ufullstendig svar med `ASSESSMENT_INVALID`, og en annen `regelversjon` med `RULE_VERSION`. Er verdiene like, lagres serverens. Regelversjonen lagres i hendelsen og kontrolleres på nytt ved `publish`. CI-vakten `regelversjon.yml` krever at den økes når `src/lib/domain/` endres. Fullmakten regnes av modulens tall. Arbeidsvalgene 04.10 står i #63. De fire reproduksjonene er ordinære tester, og batchruta har egne | K 2026-10-04 | D |
| DRF-01 | Lukket | BHs forespørsel etter § 33.6.2 kan ikke sendes fra skjemaet. Frontenden sender `send_foresporsel`, modellen kjenner bare `har_bh_foresporsel`, og validatoren avviser svaret med 400. Må løses sammen med TFR-06. **Avgjort 23.09** (3.1): forespørselen blir en egen handling som ikke gjør sporet avslått **Merknad 2026-10-04:** rettet etter vedtaket (#62). Forespørselen er den nye hendelsen `frist_foresporsel_sendt` med påkrevd brev (§ 33.6.2 første ledd) og valgfri svarfrist. Den setter `har_bh_foresporsel` og verken resultat eller status, og åpner ikke forsering. Innsigelse og forespørsel binder ikke byggherren og sendes uten intern godkjenning (oppdragsgiver 2026-10-04). Skjemaet sender ikke lenger `send_foresporsel`; BH får eget skjema (`FristVarselForm`) for et krav uten dager. Reproduksjonen er ordinær test med payloaden skjemaet nå sender; assertionene er uendret | K 2026-10-04 | — |
| DRF-03 | Lukket | TEs varsel om justerte enhetspriser (§ 34.3.3) lagres med `dato_sendt` lik oppdagelsesdatoen, ikke sendedatoen. **Merknad 2026-09-29:** rettet etter vedtaket samme dag (3.1). Tidslinjen setter `justert_ep_varsel` av hendelsens `tidsstempel` i norsk tid når metoden er enhetspriser og TE krever justering, og fjerner det når kravet om justering tas ut. `validate_vederlag_event` avviser en dato fra klienten, også i et rent varsel; skjemaet sender den ikke lenger. Hendelser som alt bærer en klientdato, projiseres med serverens dato. **Merknad 2026-10-10:** vedtaket er endret av [VS-U8](vedtak.md#vs-u8) (3.1) for et varsel sendt utenfor appen og registrert i den. Funnstatusen er uendret | K 29.09 | — |
| SD-01 | Lukket | Et nytt vederlags- eller fristsvar uten subsidiært standpunkt lar standpunktet fra forrige svar stå i tilstanden, og frontenden viser det. Journalen og brevet er riktige. Ført inn 23.09 fra [gjennomføringen av spor D](../gjennomforing-spor-d-2026-09-23.md#sd-01-subsidiært-standpunkt-fra-forrige-svar). **Merknad 2026-09-29:** rettet. Et svar med `beregnings_resultat` er fullt og erstatter hele det subsidiære standpunktet, også når skjemaet reviderer med `original_respons_id`; en oppdatering uten resultat endrer bare det den sender. Reproduksjonen er ordinær test, med egne tester for fristsporet, revidert svar og oppdatering uten resultat. Andre svarfelt med samme feil er SD-04 | K 29.09 | — |
| SD-03 | Lukket | Et oppdatert vederlagskrav uten særskilte krav (§ 34.1.3) lar de gamle stå i tilstanden: `_handle_vederlag` kopierer `saerskilt_krav` bare når feltet er satt, og skjemaet sender `null` når TE fjerner dem. Fullmakten for godkjent ansvar teller dem med (GFK-06), så verdien blir for høy og ruten lengre, ikke kortere. Funnet i code-review av GFK-06 24.09. **Merknad 2026-09-29:** rettet. `saerskilt_krav` settes alltid, som `belop_direkte`; skjemaet for revidert krav sender alltid de særskilte kravene. Reproduksjonen er ordinær test | K 29.09 | — |
| SK-01 | Lukket | TE kan godta byggherrens svar om at grunnlaget er prekludert etter § 32.2. Grunnlaget blir `GODKJENT` uten låsing, saken `OMFORENT` og lukket, og EO kan utstedes for beløp og dager som bare er godkjent subsidiært. Før aksepten gir `neste_handling` «Ingen ventende handlinger» mens saken er under forhandling (SK-05). Tiltenkt atferd er vedtatt 05.10 (3.1). **Merknad 2026-10-09:** rettet i `6e4c2d8` (#297, #274). En godtatt preklusjon er et godtatt avslag: grunnlaget blir `AVSLATT_AKSEPTERT`, saken `LUKKET_AVSLATT`, og `kan_utstede_eo` er `false`. Reproduksjonen `test_godtatt_preklusjon_etter_32_2_er_godtatt_avslag` er ordinær test med uendrede assertions. `neste_handling` før aksepten er SK-05 | K 2026-10-09 | — |
| SP-01 | Lukket | Klientspeilet runder beløp annerledes enn serveren. `tilOre` i `src/lib/domain/vederlagDomain.ts` runder via `toPrecision(15)`, mens `regler.belop` går via `str()` og `Decimal`. 1234567,8949999998 blir 1234567,90 i klienten og 1234567,89 på serveren, og fra omtrent 1e13 kr mister klienten øre (10000000000000,006 blir 10000000000000,00 mot ,01). Serveren avviser da svaret med `RESULT_MISMATCH`. Skjemaet tar bare hele kroner fra byggherren, men TEs krav kan ha desimaler. Funnet i språkprøven (#274), der TS-kjernen regner i hele øre med samme semantikk som `Decimal` **Merknad 2026-11-09:** begge sidene i sammenlikningen er slettet: speilet i klienten (`src/lib/domain/vederlagDomain.ts`) og Python-serveren (#49). Beløpet regnes bare i kjernen, i `beloep()` i `kjerne/regler/beloep.ts`, og beløpstilfellene fra språkprøven står i `kjerne/tester/beloep.test.ts` (#1731, #1733 punkt 3). Ingen avvik gjenstår | K 2026-10-08 (formelen kjørt med Node; tabellen i `sprakprove/grensetilfeller.json` holder for `regler.belop`); K 2026-11-09 (#1731) | D |
| SK-03 | Lukket | Byggherren kan revidere et svar TE har godtatt. `te_akseptert` blir stående, så TE kan ikke ta stilling til det nye svaret. Tiltenkt atferd er vedtatt 05.10 (3.1). **Merknad 2026-10-09:** rettet i `6e4c2d8` (#297, #274). Regelen `RESPONSE_ACCEPTED` avviser en revisjon av et godtatt svar, også mens grunnlaget venter (GR-U7, rad GR-23). Reproduksjonen `test_byggherren_kan_ikke_revidere_et_godtatt_svar` er ordinær test med kontrollsaken. At et fullt godkjent svar også er låst, hører til GR-U7 og #298, ikke SK-03 | K 2026-10-09 | — |
| DT-01 | Lukket | TE kan godta byggherrens svar på en tidligere kravversjon. Etter et delvis godkjent svar på 60 000 kr og en ny kravversjon på 80 000 kr godtas aksepten, sporet blir `GODKJENT` og 60 000 kr står som avtalt, uten at byggherren har svart på 80 000 kr. Aksepten (`te_aksepterer_respons`) peker ikke på noe svar, og `BH_HAS_RESPONDED` ser bare at et svar finnes. Frontenden sender ikke aksept i dag; ruta tar imot den. Tiltenkt atferd er KA-U1 (3.1). **Merknad 2026-10-08:** rettet (#272, KT-U1). Aksepten viser til svaret, og `CURRENT_RESPONSE` avviser et svar på en tidligere kravversjon, et revidert svar og et svar i en annen sak eller et annet spor | Ordinær test, K 2026-10-08 | D |
| DT-03 | Lukket | `FristResponsData.spesifisert_krav_ok` har standardverdien `true`. Et fristsvar der spørsmålet ikke gjelder, lagres med `"spesifisert_krav_ok": true` i journalen, og `FristOverview` viser «Fremsatt i tide». Kjørt for svar på forespørselen etter § 33.6.2 annet ledd a, der byggherren etter fjerde ledd ikke kan påberope § 33.6.1. Lest for et oppdatert krav med dager der `varsel_type` ikke er «spesifisert»; validatoren for oppdateringer sjekker ikke typen. Regelmodulen ser bort fra standardverdien (`Fristvurdering.fra_data`), så resultatet påvirkes ikke. Journalen er append-only, så verdien kan ikke rettes i ettertid. `vilkar_oppfylt` har samme standardverdi, men kreves alltid av validatoren. Tiltenkt atferd er KA-U4 (3.1). **Merknad 2026-10-08:** rettet (#272). Feltet har ingen standardverdi; et svar uten vurderingen lagres uten feltet, og tilstanden har `null`. `FristOverview` viser ikke en vurdering som er `null`; før ble den vist som «For sent», også for `frist_varsel_ok`. Hendelser lagret før står | Ordinær test mot testbasen, K 2026-10-08 | D |
| DT-11 | Lukket | TE kan godta et vederlags- eller fristsvar som er subsidiært til nytt svar mens grunnlaget venter på nytt svar. Vederlaget blir `GODKJENT` med byggherrens subsidiære beløp, og godkjenner byggherren deretter grunnlaget, blir saken `OMFORENT` med utstedbar EO uten at byggherren har sett vederlaget igjen. Kjørt 08.10 på grenen til #293: subsidiært svar på 60 000 kr, ny grunnlagsversjon med endret underkategori, aksept, grunnlaget godkjent. Uten aksepten står saken `UNDER_FORHANDLING`. Tiltenkt atferd var GR-U6 (3.1). **Merknad 2026-10-08:** ikke en feil. GR-U7 erstatter GR-U6: forløpet er enighet om beløpet, som får virkning når grunnlaget godkjennes (rad GR-21) | Ordinær test, K 2026-10-08 | D |

#### Tilgang, database, integrasjon, frontend, konfigurasjon og test

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AUT-01, AUT-02 | Lukket | Prosjektgrense i forseringens lesestier, 19.09 | H | — |
| AUT-06 | Lukket | `hent_relaterte_saker` krever `tillatte_saker` | H | — |
| DB-01 | Lukket | Repoet bygger basen fra tom (DA-01) | D 20.09 | — |
| DB-02 | Lukket | Kolonnene fantes i basen; migrasjonene rettet | D 20.09 | — |
| DB-03 | Lukket | `DEFAULT 'oslobygg'` droppet (`20260920053427`). Katalogtest i `tests/test_database/` erstatter reproduksjonen som leste en slettet fil (T-2, 22.09). **Merknad 2026-10-19:** belegget var `test_sak_metadata_prosjekt_id_har_ingen_default` i `backend/tests/test_database/test_katalog.py` ([ad92579](https://github.com/khjohns/endringsmeldinger/blob/ad92579/backend/tests/test_database/test_katalog.py)). Testen er slettet i #935 etter avgjørelsen i #764 (svar 10 og 11), og funnet prøves ikke lenger mot basen i CI. Funnstatus er uendret | K 22.09 (PG 17 lokalt), D 22.09 | — |
| DB-06 | Lukket | `prosjekt_id` på journalen (5a) | D 20.09 | — |
| DB-07 | Lukket | `properties jsonb` på `sak_bim_links` finnes i basen og bygges av `20260920160000`. Katalogtest i `tests/test_database/` erstatter reproduksjonen som bare leste `20260911073800` (T-2, 22.09). Testinventaret førte funnet som DB-06. **Merknad 2026-10-19:** belegget var `test_sak_bim_links_har_properties` i `backend/tests/test_database/test_katalog.py` ([ad92579](https://github.com/khjohns/endringsmeldinger/blob/ad92579/backend/tests/test_database/test_katalog.py)). Testen er slettet i #935 etter avgjørelsen i #764 (svar 10 og 11), og funnet prøves ikke lenger mot basen i CI. Funnstatus er uendret | K 22.09 (PG 17 lokalt), D 22.09 | — |
| DB-08 | Bortfalt | Viewene finnes ikke | D 19.09 | — |
| INT-04 | Lukket | Siden utledes av lagmedlemskap | H | — |
| INT-07 | Lukket | Kommentargeneratoren kjente ikke `standard`. **Merknad 2026-09-23:** oppslagene er nøklet på `SaksType`, og `koe` er fjernet; ingen kaller sender det. Reproduksjonen er ordinær test, og forsering og endringsordre er dekket. Samme nøkkel står i tittelen i `reportlab_pdf_generator`, men der gir reserveteksten nesten samme tittel. **Merknad 2026-10-03:** generatoren er slettet (#140) | K 23.09 | — |
| FE-01 | Lukket | `LetterPreviewModal` sender prosjekt, CSRF og credentials (20.09) | H | — |
| FE-04 | Lukket | Med GFK-01 | H | — |
| FE-05 | Lukket | `activeProjectId` er `null` ved ukjent prosjekt (20.09) | H | — |
| OBS-03 | Lukket | Latent: `ce_time` kuttet offset. **Merknad 2026-09-23:** reprodusert på enhetsnivå med `+02:00` og `-05:00` (den siste ga den ugyldige strengen `…-05:00Z`); ingen kjørested gir i dag annet enn UTC. Rettet med `astimezone(UTC)`, naiv tid regnes fortsatt som UTC. Aktuelt i F0b, der `timestamptz` kommer tilbake i øktens tidssone | K 23.09 | — |
| OBS-04 | Lukket | `ce_source` skriver `unknown` (20.09) | H | — |
| TST-02 | Lukket | Samtidig opprettelse i `JsonFileEventRepository`, rettet 22.09: saksfilen skrives til en unik midlertidig fil og publiseres med `os.link`, som feiler når filen finnes. To samtidige opprettelser gir én sak og én `ConcurrencyError`, også når begge har passert eksistenssjekken eller skrevet ferdig. Gjelder bare JSON-lageret; Supabase-lageret er ikke kjørt. Samme sak som KR-15 | K 22.09, L | — |
| CFG-05, CFG-06, CFG-07 | Bortfalt | Supabase-nøkler utenfor `Settings`; død `CORS_ORIGINS`; relativ `env_file`. **Merknad 2026-11-08:** `Settings` i `backend/core/config.py` er slettet med Python-stien (PR #1719) | H | — |

### 4.3 Arkitektur og database: AR, DA, MS

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| AR-05 | Lukket | CI med PostgreSQL 17-jobb (PR #33). Regelsettet `main` krever de fire jobbene, har ingen bypass og krever oppdatert gren (lest med GitHub-API-et 22.09) | K 22.09 | — |
| AR-08 | Bortfalt | Seks av ni driftdetektorer feilet. **Merknad 2026-11-08:** driftdetektorene er slettet med PR #1719 | H | — |
| DA-01, DA-02, DA-05, DA-06 | Lukket | 20.09 | D 20.09 | — |
| DA-03 | Lukket | Migrasjonsmappa er eneste kilde. Historikken avstemt 22.09: 23 rader, samme versjoner som filene; `db push --dry-run` er tom. Originalteksten til de slettede radene er arkivert | K 22.09 | — |
| DA-07 | Korreksjon | `app_identities` er i bruk | D 20.09 | — |
| DA-12 | Lukket | Gjennomført som MS-01 | D 20.09 | — |
| MS-01 | Gjennomført | `hendelse` | D 20.09 | — |
| MS-04 | Gjennomført | `aktor_id` i journalen | D 20.09 | — |
| MS-10 | Gjennomført | `projects.organisasjon_id NOT NULL` | D 20.09 | — |
| DM-04 | Lukket | Ruteregistertesten så bare dekoratøren `route` (sju ruter deklarert med `.get`/`.post`/`.patch` var usynlige for den), godtok `require_magic_link` og `require_entra_auth` som autentisering, og kontrollerte ikke `require_project_access`. En ny rute uten autentisering ga grønn test. Ingen eksponert rute funnet. **Merknad 2026-09-29:** rettet i testen. Den leser alle rutedekoratørene med blueprintens `url_prefix` og sammenlikner med `app.url_map`. Bare `require_auth` teller som autentisering, og bare under rutedekoratøren. `require_project_access` kreves, med fem unntak i `UTEN_PROSJEKT`. `login`, `callback` og webhooken står i `OFFENTLIGE_RUTER` med begrunnelse; webhooken sto før som autentisert gjennom `limit_webhook`, som er en rate-begrensning. Ti mutasjoner, blant dem de to fra runden, gir rød test. `require_contract_role` kontrolleres ikke | K 29.09 | — |
| DM-07 | Lukket | `eo_opprettet` hadde ingen regel om sakstype, og behandleren gjorde saken til en endringsordresak uansett. BH fikk 201 for `eo_opprettet` i en KOE-sak gjennom `POST /api/events` i et prosjekt uten godkjenningspolicy, og saken ble vist som en endringsordre med status `UTKAST`. Stred mot vedtaket 29.09 i 3.1. **Merknad 2026-10-05:** rettet (#97). Forretningsregelen `IS_EO_CASE` gjelder nå `eo_opprettet`, så BH får 400 i en KOE-sak | Ordinær test, K 05.10 | D |

### 4.4 Målskjemarunden 21.09: KR, MG, RY

| ID | Status | Restanse og merknad | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| KR-01, KR-02, KR-03, KR-05 til KR-12 | Lukket | `bab9679` og påfølgende indeksmigrasjoner | H 21.09 | — |
| KR-14 | Avvist | Anvendt migrasjon er uforanderlig | H | — |
| KR-15 | Lukket | Samme sak som TST-02. Den ustabile strenge `xfail` er erstattet av en deterministisk reproduksjon (T-4), som ble XPASS da TST-02 ble rettet 22.09, og er gjort om til en ordinær test | H, K 22.09 | — |
| MG-02 | Lukket | Én identitetsform i journalen | D 21.09 | — |
| MG-06 | Lukket | Indeksen fra KR-11 (`20260921102148`). Fila sier at den er anvendt 21.09 | H, L | — |
| MG-07 | Lukket | Serverfilter og indeks fra KR-02 (`20260921093936`). Fila sier at den er anvendt 21.09 | H, L | — |
| MG-09 | Regel | I `.claude/rules/database.md` | — | — |

### 4.6 Foreløpige funn, ikke kontrollert

| ID | Status | Funn | Belegg | Pakke |
| --- | --- | --- | --- | --- |
| BR-01 | Reprodusert 23.09, flyttet til 4.2 | Se 4.2. Den opprinnelige påstanden (L 23.09) holdt. | K 23.09 | D |

## 5. Leveransemerknader til arbeidspakkene

### Merknader: 5. Arbeidspakker

> **Merknad 2026-09-23 til avsnitt 5:** F0b er ny og kommer mellom F0 og F1.
> Den følger av beslutningen om direkte tilkobling (3.1). Pakkene er ikke
> omnummerert, fordi F1–F5 er referert fra mange dokumenter.

> **Merknad 2026-10-09 til avsnitt 5:** FK er ny og står etter F2. Den følger
> av B-17 og merknaden 09.10 der. Pakkene er heller ikke nå omnummerert.

### Merknader: F0 — Verifikasjonsgrunnlag

> **Merknad 2026-09-22 (F0, punkt 1):** CI-jobben `database` bygger basen fra
> tom på PostgreSQL 17 med plattformstubben og kjører katalogtestene i
> `backend/tests/test_database/` (merket `database`, styrt av
> `KOE_TESTBASE_URL`). Kjørt lokalt mot PG 17.11 og observert grønn i CI
> (PR #33, 22.09). T-2 er gjort for DB-03 og DB-07, T-5 er gjort. Punkt 3
> (DA-03) og punkt 2 (påkrevde sjekker, AR-05) er gjort 22.09. Gjenstår:
> T-1, T-3, T-4 og DB-04s fremmednøkler (B-01).
> Rolletesten bruker `SET ROLE anon/authenticated`; en test som logger inn som
> ikke-privilegert rolle, venter på B-02. Se
> [gjennomføringsnotatet](../gjennomforing-f0-postgresql-ci-2026-09-22.md).
>
> **Merknad 2026-09-22 (F0, punkt 4: T-1, T-3, T-4):** T-1 er gjort: den
> strenge `xfail` for AUT-03 er erstattet av en ordinær test som viser at
> batchruta avviser internt notat med `400 INTERNT_NOTAT_IKKE_I_BATCH`, og at
> verken journal, notatlager eller `last_event_at` skrives. T-3 er gjort:
> FE-02-testen har gyldig sesjon og saken i prosjektet, og feiler nå på
> målassertionen om rolle. T-4 er gjort: kappløpet i
> `JsonFileEventRepository` er reprodusert deterministisk ved
> eksistenssjekken, med reell lagring og `strict=True`. Den ustabile testen
> og testen fra 22.09 (RTB-02) er erstattet, så TST-02 gir ingen tilfeldig rød
> port. Anbefalingen i 3.3 om TST-02 er dermed fulgt. Funnene FE-02, TST-02 og
> KR-15 er fortsatt åpne. Gjenstår i F0: DB-04s fremmednøkler (B-01). Se
> [notatet](../gjennomforing-f0-testvedlikehold-2026-09-22.md).
>
> **Merknad 2026-09-22 (TST-02 rettet):** `JsonFileEventRepository`
> publiserer en ny saksfil med `os.link` framfor `rename`, og TST-02 og KR-15
> er lukket. T-4-reproduksjonen ble XPASS og er gjort om til en ordinær test,
> med en test til for flettingen der begge skriverne har skrevet ferdig. Se
> [notatet](../gjennomforing-tst02-2026-09-22.md).

### Merknader: F0b — Datalaget over direkte tilkobling

> **Merknad 2026-10-16 til F0b, leveranse 1:** Levert: poolen og transaksjonshjelperen
> mot SQL Server i [`server/datalag.ts`](../../server/datalag.ts)
> ([#419](https://github.com/khjohns/endringsmeldinger/issues/419), PR #530 og PR #539).
> Hjelperen setter konteksten skrivebeskyttet og bundet til transaksjonen, og
> nullstiller og kontrollerer forbindelsen etter COMMIT eller ROLLBACK, eller forkaster
> den. Akseptkriteriet om kontekst på en gjenbrukt forbindelse etter commit eller
> rollback er bevist med en pool på én forbindelse i
> [`server/tester/datalag.test.ts`](../../server/tester/datalag.test.ts) mot testbasen.
> Testbasen for SQL Server kjører lokalt i skyøkta og i CI-jobben «SQL Server (testbasen
> for datalaget)», som er påkrevd på `main`
> ([#488](https://github.com/khjohns/endringsmeldinger/issues/488), PR #545). Testbasen i
> CI hører til leveranse 2.
>
> Ikke levert i leveranse 1: managed identity mot Azure, som følges i
> [#78](https://github.com/khjohns/endringsmeldinger/issues/78); feilklassifiseringen med
> retry, en klasse for avvisning som aldri prøves på nytt og en egen klasse for
> versjonskonflikt, og en test med flere skrivinger for kravet om ingen delvise
> skrivinger, følges i [#555](https://github.com/khjohns/endringsmeldinger/issues/555).

> **Merknad 2026-10-16 til F0b, leveranse 2:** Levert i TS-stien: migrasjonene i T-SQL og
> veien fra fil til base ([#53](https://github.com/khjohns/endringsmeldinger/issues/53)).
> Migrasjonene og runneren kom med
> [#559](https://github.com/khjohns/endringsmeldinger/pull/559), runneren ble strammet inn i
> [#572](https://github.com/khjohns/endringsmeldinger/pull/572), og runneren holder én fast
> forbindelse etter [#630](https://github.com/khjohns/endringsmeldinger/pull/630). Testbasen
> lokalt og i CI kom med [#545](https://github.com/khjohns/endringsmeldinger/pull/545).
> Medlemskapet er bygget med
> [#612](https://github.com/khjohns/endringsmeldinger/pull/612) (synkroniseringen) og
> [#633](https://github.com/khjohns/endringsmeldinger/pull/633) (deaktiveringen ved innlogging,
> [DL-U8](vedtak.md#dl-u8)). Mellomrom til slutt i nøkler og ID-er avvises i SQL Server
> ([#606](https://github.com/khjohns/endringsmeldinger/pull/606)). Inngangene som kaller
> medlemskapet, er ikke bygget ([#375](https://github.com/khjohns/endringsmeldinger/issues/375);
> krav i [#637](https://github.com/khjohns/endringsmeldinger/issues/637) og
> [#638](https://github.com/khjohns/endringsmeldinger/issues/638)).

> **Merknad 2026-10-17 til F0b:** levert: journalen og leveringsoppdraget for kommandoinngangene i [`server/`](../../server/) leses og skrives i SQL Server, og `pg` er ute av `server/` ([#661](https://github.com/khjohns/endringsmeldinger/issues/661), PR #738, merge 395a5be). Migrasjonen `20261017233000_leveringsmaal.sql` gir koblingen til Catenda-prosjektet kolonnene `library_id` og `folder_id`, og tabellen `koe.sak_catenda_topic` for topicen per sak. Leveringsmålet leses med `koe_api.leveringsmaal`, og kjøretiden får ingen ny tabellrett. Ikke levert: skrivingen av topicen i Catenda, som er skilt ut i [#741](https://github.com/khjohns/endringsmeldinger/issues/741), og leveringen ([#371](https://github.com/khjohns/endringsmeldinger/issues/371)).

> **Merknad 2026-10-20 til F0b:** levert: W-1b.2, kommentarene tilbake til topicen, grensen på webhooken og forsøk som venter ([PR #971](https://github.com/khjohns/endringsmeldinger/pull/971), merge c6977e6, del av [W-1, #819](https://github.com/khjohns/endringsmeldinger/issues/819)).

> **Merknad 2026-10-20 til RK-05:** levert: en samlet frist på 30 s for transaksjonen ([PR #1005](https://github.com/khjohns/endringsmeldinger/pull/1005), merge ad0ebed, lukker [#50](https://github.com/khjohns/endringsmeldinger/issues/50)).

### Merknader: FK — KOE-, EO- og forseringsdomenet i TS (B-17)

> **Merknad 2026-10-10 til FK:** målmodellen er flyttet til den permanente
> kjernemappa [`kjerne/`](../../kjerne/) og skrevet om etter MM-U9, MM-U11,
> GR-U10, KA-U7, KA-U10, KA-U11, KA-U13 og EO-U5 (#308, PR #328). CI håndhever
> typesjekk, prettier, navnereglene og regelversjonsvakten for mappa. Bevis-sakene
> for forløp A–E kjøres mot kjernen i minnet og mot testbasen i CI (K 10.10,
> `da1ed81` på `main`).
> Lagringsformatet er foreslått i [designnotatet](../design-hendelsesformat-2026-10-09.md)
> og ikke bygget (#273).

> **Merknad 2026-10-10 til FK, runde 2:** lagringsformatet er bygget i
> [`kjerne/`](../../kjerne/) etter [HF-U1](vedtak.md#hf-u1) og [HF-U2](vedtak.md#hf-u2) (#273,
> PR #340). Det har én rad `dokument_registrert` per dokument, uttrykkelige
> referanser og kolonnen `format`, med migrasjon. Hendelsestypene TS skriver,
> står i [`kjernehendelser.toml`](../datamodell/kjernehendelser.toml) (#320).
> Med formatet er GR-U12, GR-U13, KA-U14, KA-U15, MM-U13 og MM-U14 bygget i
> kjernen. Endringsordren har utfallene ja, nei og ikke avklart, og sperren mot
> trekk av grunnlaget følger den. Arkitekturtesten håndhever hva reglene får
> lese, med en hviteliste. Regelversjonsvakten krever begge versjonene når
> `standpunkt.ts` endres (#329, #330, PR #339). Bevis-sakene kjøres mot kjernen
> i minnet og mot testbasen i CI (K 10.10, `e19dedd` på `main`). De 48
> feilinnføringene er kjørt i arbeidsøkta og ikke i CI (PR #340). Frontenden kan
> importere kjernen, og visningene leser statusene gjennom ett lesepunkt per
> visning (del av #313, PR #333). B-18 er avgjort ([B-18](vedtak.md#b-18)). Ikke bygget:
> vurderingene i #341, kodene i #335 og leveringsintensjonen i TS-stien (#310).

> **Merknad 2026-10-11 til FK, runde 5 (#347):** skiva er levert (PR #372). Et
> grunnlagskrav og et vederlagskrav går fra en egen side i frontenden gjennom
> TS-serveren i den nye mappa [`server/`](../../server/), med tilgangskontrollen,
> til kjernen, journalen og leveringsoppdraget, som lagres i samme transaksjon
> ([LV-U1](vedtak.md#lv-u1)), og tilbake til visningen. Tabellen `leveringsoppdrag` er
> uforanderlig. Prøvd mot testbasen i CI (K 11.10, `4ee5d9a` i PR #372). Ikke
> bygget: brevteksten (#369), opprettelsen av en sak som kommando (#370),
> leveringsforsøkene og workeren (#371) og én vertsadresse for TS og Python
> (#376). Oppdraget har ingen brevtekst og leveres ikke før #369. Innloggingen
> flyttes til TS ([B-19](vedtak.md#b-19), #375).

> **Merknad 2026-10-12 til FK, runde 7:** byggedel 1 del 1 er levert (PR #394,
> del av #309): «ingen krav», innsigelsen og protesten etter § 5, påberopt
> passivitet, merkingen og avklaringen, sperrene etter [KA-U20](vedtak.md#ka-u20),
> [KA-U22](vedtak.md#ka-u22) og [KA-U26](vedtak.md#ka-u26)–[KA-U30](vedtak.md#ka-u30) med unntakene fra
> dem, og lesereglene etter [MM-U18](vedtak.md#mm-u18) og [MM-U19](vedtak.md#mm-u19).
> Feilinnføringene F1–F104 er kjørt i CI og alle oppdaget (K 11.10, `0c330ad` i
> PR #394). Følge i radene for disse vedtakene sier fortsatt «Ikke bygget».
> Prøven mot SQL Server i Docker er levert (PR #406, punkt 1 i #395): alternativ
> C i B-02 lar seg uttrykke i T-SQL med konteksten bundet til transaksjonen, og
> begge lagringsformene holder på det som er prøvd
> ([rapporten](../prove-azuresql-2026-10-11.md)). Lagringsformen er ikke valgt
> (#395). Hovedplanen er sluttredigert etter [B-12, databasen](vedtak.md#b-12-databasen),
> og [B-19](vedtak.md#b-19) (PR #404; se 1.2), og vedtakene om brevteksten er ført i 3.1
> (PR #412). Ikke bygget: brevteksten (#369) og resten av byggedel 1.

> **Merknad 2026-10-12 til FK, runde 8:** brevteksten er bygget i kjernen og
> fryses i brevet og i leveringsoppdraget (#369, PR #410), etter vedtakene om
> brevteksten (PR #412) og [LV-U5](vedtak.md#lv-u5) (#414). Feilinnføringene er kjørt i
> CI og alle oppdaget (K 12.10, `426784c` i PR #410). Vedtakene i 3.1 føres nå
> gjennom [vedtaksregisteret](../vedtaksregister/README.md), med vakttester i CI
> (#413, PR #416 og PR #422). Lagringsformen er avgjort med [HF-U3](vedtak.md#hf-u3)
> (#395). Ikke bygget: lagringsformen i datalaget for Azure SQL (F0b), leveringen
> (#371) og resten av byggedel 1.

> **Merknad 2026-10-12 til FK, runde 15:** byggedel 1 er levert (del av #309).
> Byggherrens senere begrunnelse er bygget i kjernen etter [KA-U34](vedtak.md#ka-u34) og
> [KA-U35](vedtak.md#ka-u35). Når kravene er avgjort, sier avvisningen hvordan de ble
> avgjort ([KA-U11](vedtak.md#ka-u11), #448, PR #458). Grunnlagsradene i domenetabellen er
> prøvd mot kjernen med bevis-saker, uten avvik (PR #450 og PR #462).
> Feilinnføringene er kjørt i CI og alle oppdaget (K 12.10, `a70591c` i PR #458).
> Følge i radene for KA-U34 og KA-U35 sier fortsatt «Ikke bygget». Ikke bygget:
> [KA-U36](vedtak.md#ka-u36) (#468), leveringen (#371) og de neste byggedelene av #309.

> **Merknad 2026-10-15 til FK:** KK-07 og KK-08 er levert i
> [PR #495](https://github.com/khjohns/endringsmeldinger/pull/495), som er del av
> [#309](https://github.com/khjohns/endringsmeldinger/issues/309) og del 2 av
> [#407](https://github.com/khjohns/endringsmeldinger/issues/407). KK-07 knytter
> påberopelsen etter § 33.4 til varselet. KK-08 gjelder [OV-U5](vedtak.md#ov-u5), som endrer
> MM-U8 og VS-U7: et svar byggherren alt har gitt, står med virkningen det hadde, også
> når TE registrerer et varsel etter svaret.
> Del 2 av #407 er [VS-U20](vedtak.md#vs-u20) og rettingen av arbeidsvalget 15.10 på #309.
> Del 1 av #407 er ikke levert: lesingen der § 33.4 ikke kunne gi preklusjon.
> Belegg: [KK-07](../vedlegg/review-kontraktskontroll-ov-vs-2026-10-13.md#kk-07-kjernen-knytter-påberopelsen-til-siste-kravversjon-ikke-varselet)
> og [KK-08](../vedlegg/review-kontraktskontroll-ov-vs-2026-10-13.md#kk-08-kjernen-gjør-i-dag-preklusjonen-uavklart-når-te-oppgir-et-varsel);
> belegget er datert 13.10 og endres ikke. Følge i radene for [VS-U20](vedtak.md#vs-u20),
> [OV-U5](vedtak.md#ov-u5) og [HF-U1](vedtak.md#hf-u1) sier fortsatt «Ikke bygget». Frontenden (`src/`)
> er ikke endret i PR #495. Følgene for skjema og visning står på
> [#313](https://github.com/khjohns/endringsmeldinger/issues/313).

> **Merknad 2026-10-17 til FK:** levert:
> - Opprettelsen av en KOE-sak er bygget som kommando i kjernen og som inngangen `POST /api/kjerne/saker` i TS-serveren. Saken og `sak_opprettet` skrives i samme transaksjon, med prosjektet fra autorisert kontekst ([#370](https://github.com/khjohns/endringsmeldinger/issues/370), PR #742, merge 407687a). Topicen i Catenda for en sak som opprettes i appen, er ikke bygget. Den er skilt ut i [#741](https://github.com/khjohns/endringsmeldinger/issues/741) etter vedtak KT-U3 (PR #740, merge a3b1b47).
> - TS-sakene vises i Kontrollrommet med de eksisterende skjemaene ([#718](https://github.com/khjohns/endringsmeldinger/issues/718)): et felles brevskall for `Brevkontroll` og `ClaimLetterView` (PR #728, merge da1c9c3), Kontrollrommet for TS-saken i stedet for `Saksbilde` (PR #730, merge 97650bb), og `TeVederlagForm` for TS-saker (PR #736, merge 4f9ae6b). `Vederlagsskjema.svelte` er fjernet. For TS-saker skjules §§ 34.1.2/34.1.3, særskilte krav og vedlegg, og utkast er av (arbeidsvalgene i [#718](https://github.com/khjohns/endringsmeldinger/issues/718), kommentaren 6230282330).

> **Merknad 2026-10-18 til FK:** levert: punkt V-2 i
> [#790](https://github.com/khjohns/endringsmeldinger/issues/790), bindingen av
> vedlegg i brevet ([PR #826](https://github.com/khjohns/endringsmeldinger/pull/826),
> merge fee5cb1).
> - Et vedlegg i brevet må finnes i vedleggsoppslaget, og det bindes i
>   skrivetransaksjonen etter at saken er låst. Et ukjent vedlegg avvises med
>   `VEDLEGG_FINNES_IKKE`. Et vedlegg fra en annen sak og et ubundet vedlegg fra
>   et annet team avvises også, og da skrives ingenting. `koe_api.bind_vedlegg`
>   leser vedleggene fra den lagrede hendelsen og kontrollerer at hvert vedlegg
>   er bundet med samme filnavn og hash. Ellers rulles skrivingen tilbake (51422).
>   Et gjentak med kvittering binder ikke på nytt ([KT-U5](vedtak.md#kt-u5)).
> - Brevet lagrer for hvert vedlegg ID, filnavn og hash. Serveren fyller inn
>   filnavn og hash fra mellomlageret, og klienten oppgir bare ID-en
>   ([LV-U14](vedtak.md#lv-u14)). Et registrert varsel krever brevet som vedlegg
>   ([OV-U4](vedtak.md#ov-u4)). Brevteksten lister filnavnene.
> - Migrasjonen er `20261019170000_vedleggsbinding.sql`.
> - Belegg i PR #826: `/code-review high` på de to byggecommitene ga 10 funn. Ingen
>   gir feil resultat nå eller bryter et vedtak, så ingen er rettet i koden. Seks
>   står i [#827](https://github.com/khjohns/endringsmeldinger/issues/827)
>   (`review-oppfølging`), og fire er avvist i PR-en. Samspillsreviewet med bl.a.
>   LV-U14, KT-U5, OV-U4 og MM-U9 ga ingen brudd. Feilinnføringene F125, F126,
>   F164, F167 og F287–F291 ble oppdaget, og `feilinnfoering.ts --ankre` er grønn.

> **Merknad 2026-10-20 til FK:** levert: S-2a.3a, brevet med varselet som vedlegg i fristkravet, og datoen for varselet kontrollert i kjernen ([PR #982](https://github.com/khjohns/endringsmeldinger/pull/982), merge 6f7276c, del av [S-2, #909](https://github.com/khjohns/endringsmeldinger/issues/909) og [#828](https://github.com/khjohns/endringsmeldinger/issues/828)).

> **Merknad 2026-10-20 til FK:** levert: S-2a.3b1, protest, påberopt passivitet og senere begrunnelse avvises i første versjon ([PR #994](https://github.com/khjohns/endringsmeldinger/pull/994), merge e270e44, del av [#587](https://github.com/khjohns/endringsmeldinger/issues/587), delingen i [S-2, #909](https://github.com/khjohns/endringsmeldinger/issues/909)).

> **Merknad 2026-10-20 til FK:** levert: S-1c del 1, innlogging med Entra ID og identitet, uten prosjekttilgang utover S5 ([PR #995](https://github.com/khjohns/endringsmeldinger/pull/995), merge b3cea92, del av [#831](https://github.com/khjohns/endringsmeldinger/issues/831)).

### Merknader: Spor D — domenefeil

> **Merknad 2026-09-23 til spor D:** TFR-02–TFR-05, GFK-02, INT-07 og OBS-03
> er rettet; se radene i 4.2 og
> [gjennomføringen](../gjennomforing-spor-d-2026-09-23.md). Statusene i TFR-02
> og TFR-05 er besluttet av oppdragsgiver. TFR-06 og GFK-06 er reprodusert,
> men ikke rettet, fordi rettingen krever en avklaring (spørsmål 1 og 2 i
> gjennomføringen). SD-01 og SD-02 er nye. Spørsmål 3 gjelder fullmakten når
> beløpet ikke kan verdsettes, for både KOE og EO.
>
> **Merknad 2026-09-23 (senere samme dag):** oppdragsgiver har besvart
> spørsmål 1–3; vedtakene står i 3.1. Ingen av dem er bygget. Spørsmål 1 er
> det største: innsigelse og forespørsel på et nøytralt fristvarsel blir egne
> handlinger, og rettingen av TFR-06 og DRF-01 bygger på det. DRF-01 og TFR-06 må løses sammen: en sperre mot

> **Merknad 2026-10-05 til spor D:** Strukturkartleggingen er levert:
> [kartlegging-struktur-spor-d-2026-10-05.md](../kartlegging-struktur-spor-d-2026-10-05.md).
> Den registrerer SK-01–SK-13 (4.2) og foreslår målformer for mønstrene M1–M5.
> Om de legges til grunn, er B-14 (3.4).

### Merknader: Spor M — datamodell og funksjonskart

> **Merknad 2026-09-29:** fase 1b er levert:
> [hendelseskatalogen](https://github.com/khjohns/endringsmeldinger/blob/5ff4eb4/docs/datamodell/hendelser.md) med vakttest og to nye ark
> i Excel-fila. DM-05–DM-07 er funnet under kartleggingen; se
> [gjennomføringsnotatet for 1b](../gjennomforing-spor-m-1b-2026-09-29.md).

> **Merknad 2026-09-29:** fase 1c er levert, og med den punkt 1, datamodellen:
> [relasjonene og dataflyten mot Catenda](../datamodell/relasjoner.md), med
> ER-diagram generert fra katalogen, vakttester og to nye ark i Excel-fila.
> DM-08 er funnet under kartleggingen; se
> [gjennomføringsnotatet for 1c](../gjennomforing-spor-m-1c-2026-09-29.md).

## Verifikasjon og grenser for redigeringene før 24.10

Redigeringen er dokumentarbeid. Kontrollene er beskrevet i
[redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md).

**Lest nå (22.09):** funnkilder og testfilenes egne ID-er for hver rad i
testinventaret; `xfail`-dekoratørene med AST; migrasjonsfilene for
`sak_relations`, `sak_bim_links` og indeksene; Catenda-klientens opplasting og
opprettelse; de nevnte OpenAPI-operasjonene.

**Historisk dokumentert:** alt merket D eller H, testkjøringene fra 22.09
(merket K 22.09, kjørt av testrevisjonen og reviewene), og levende
Catenda-tester fra 3. september.

**Ikke kontrollert nå:** den levende databasekatalogen, full testsuite,
levende Catenda-atferd, organisatoriske prosesser og rettslige krav.
Funn fra auditene 14.–16.09 som ikke har vært ført i denne planen, er ikke
registrert på nytt enkeltvis.

**Endringen 23.09** er dokumentarbeid: oppdragsgivers beslutning om alternativ C
og T2, Azure PostgreSQL som foreløpig mål, TS2-02 vedtatt, B-12 og F0b. Kilden er
oppdragsgivers bekreftelse 23.09 og [handoffen](../handoff-2026-09-23-datalag-postgresql.md).
Ingen kode, migrasjon eller database er endret eller lest på nytt. Påstandene om
Azure, Fabric og IKTs svar er gjengitt fra handoffen og ikke kontrollert her.

**Endringen 23.09, BR-01:** BR-01 er reprodusert og flyttet fra 4.6 til 4.2,
DRF-01–DRF-03 er ført inn, og B-13 har fått en merknad. Belegget er testene i
`backend/tests/test_security/test_beregningsresultat_br01_20260923.py`, kjørt
23.09, og kartleggingen, der det som bare er lest, er merket L.

**Endringen 23.09, spor D:** radene for TFR-02–TFR-06, GFK-02, GFK-06, INT-07
og OBS-03 er oppdatert, SD-01–SD-02 er ført inn, og spor D har fått en
merknad. Belegget er testene som er nevnt i radene, kjørt 23.09 med hele
backend-suiten grønn; se [gjennomføringen](../gjennomforing-spor-d-2026-09-23.md#verifikasjon-og-grenser).

**Endringen 29.09, B-12 og spor M:** merknadene under B-12 og F0b, spor M,
og DM-01–DM-04. Funnene er beskrevet i
[gjennomføringsnotatet for 1a](../gjennomforing-spor-m-1a-2026-09-29.md).
- Opplysningen om at en SQL Database er aktuell, kommer fra oppdragsgiver.
  Hva IKT har lagt til grunn, er ikke kjent.
- DM-01, DM-03 og den katalogkontrollerte delen av DM-02 er kjørt mot
  prosjektet og testbasen 29.09. DM-04 er vist med to mutasjoner mot
  ruteregistertesten, begge tilbakestilt.
- Resten er lest ut av koden; se
  [oppdraget, avsnitt 4](../prompt-datamodell-og-funksjonskart-2026-09-29.md#4-utgangspunktet-2909).
- Ingen kode, migrasjon eller database er endret.

**Endringen 29.09, DM-04:** raden for DM-04 er lukket. Belegget er
`backend/tests/test_security/test_public_route_registry.py`, kjørt 29.09 med
hele backend-suiten grønn uten testbasen, og ti mutasjoner mot `routes/` og
`app.py`, alle røde i testen de gjaldt, alle tilbakestilt; se
[merknaden i gjennomføringsnotatet](../gjennomforing-spor-m-1a-2026-09-29.md#merknad-2026-09-29-til-dm-04).
Ingen produksjonskode er endret.

**Endringen 29.09, spor M 1b:** merknaden under spor M, DM-05–DM-07, og
radene i 3.1 om saksopprettelse og om EO-sak og KOE-sak. Kilden for radene er
oppdragsgivers svar 29.09. DM-05–DM-07 er reprodusert mot testbasen med
kontrollsaker; se
[gjennomføringsnotatet for 1b](../gjennomforing-spor-m-1b-2026-09-29.md#verifikasjon-og-grenser).
Ingen produksjonskode, migrasjon eller database er endret.

**Endringen 29.09, spor M 1c:** merknaden under spor M og DM-08 i 4.6. DM-08
er lest ut av koden, ikke kjørt, og står derfor som foreløpig uten
alvorlighet; se
[gjennomføringsnotatet for 1c](../gjennomforing-spor-m-1c-2026-09-29.md#verifikasjon-og-grenser).
Ingen produksjonskode, migrasjon eller database er endret.


**Endringen 07.10, review av #266 og #270:** B-14, AF-06-unntaket, B-10/F2/F5
og de åpne B-15/B-16 er dokumentert etter oppdragsgivers tilslutning i samtalen.
Arbeidet omfatter dokumenter og GitHub-oppfølging, ikke implementering.
Kontrollgrunnlag og verktøygrenser står i
[reviewnotatet](../review-oppfolging-arkitektur-2026-10-07.md#verifikasjon-og-grenser).

**Endringene 08.10–09.10** før sluttredigeringen er listet i endringsloggen i
toppteksten ved `5d067cc3`. Belegget står i de daterte merknadene og radene de
gjelder.

**Sluttredigeringen 09.10** er dokumentarbeid mot `5d067cc3`. Kilden for
vedtakene er oppdragsgivers svar i samtalen 09.10, på spørsmål med
alternativer. Ordlyden følger det valgte alternativet. Ingen kode, migrasjon
eller database er endret. Milepælen for FK er opprettet, og issuene som
vedtakene avgjør, lukkes av PR-en.

- **Ført inn:** MM-U9, GR-U10, KA-U7–KA-U9, GR-U11, FO-U1, VS-U1 og VS-U2 som
  nye rader i 3.1. Daterte merknader til B-17 (endringsordre og forsering),
  B-14 (permanent mappe), regelversjon og passivitet under B-13, MM-U4–MM-U6
  (opphevet), MM-U8, GR-U2, GR-U7, SK-02/SK-03, kravversjon, KA-U3 og KA-U6 i
  3.1; invariant 9, 11 og 12; AF-06; F0b, F2 og spor D; 4.2 (Python-feil i
  KOE-domenet), SK-02, SK-06, DM-01, DM-05 og DM-06. Ny arbeidspakke FK.
- **Omordnet uten endring i vedtak eller funnstatus:** 3.1 etter kontraktstema.
  B-15, merknaden til B-04 og merknaden 07.10 til B-14 er flyttet fra 3.4 til
  3.1. 4.2 er delt i to tabeller. Merknadene til B-12 og de fire unntakene fra
  AF-06 03.–04.10 er samlet.
- **Tatt ut og bevart i Git:** endringsloggen i toppteksten, kolonnen «I dag» i
  2.2 med merknaden 23.09 til den, og radene og merknadene for de avgjorte
  beslutningene i 3.4, unntatt det som er flyttet. Avsnitt 6 har fått nytt navn.
- **Kjørt:** `python3 docs/verktoy/lenkekontroll.py` over hele `docs/` (ingen
  nye brudd; bruddet i `adr/001` er kjent),
  `python3 docs/verktoy/domenetabell.py` og
  `/tmp/venv/bin/python docs/verktoy/datamodell.py` (exit 0, ingen genererte
  filer endret), og `tests/test_domenetabell` og `tests/test_datamodell` uten
  testbasen. Ankrene andre dokumenter lenker til, er beholdt.
- **Ikke kontrollert:** byggestatusen i «Følge» og i funnregisteret er ikke
  prøvd på nytt. At prøveserveren i `sprakprove/server/` mangler en
  registertest, er lest (L 09.10). Fordelingen av issues bak merknaden i 4.2 er
  hovedøktas. Redigeringen gjør ingen egen vurdering av NS 8407; vedtakene
  09.10 bygger på oppdragsgivers lesning.

**Endringen 09.10, FK runde 1,** er dokumentarbeid. Kilden er oppdragsgivers
svar i samtalen 09.10 på spørsmål fra arbeidsøktene for #273 og #308, med
alternativer, belegg i NS 8407 og en anbefaling. Ordlyden følger det valgte
alternativet. For EO-U5 og KA-U12 følger den svar på oppfølgingsspørsmål. Sitatene
fra NS 8407 er kontrollert mot teksten i `507e2254^:docs/NS_8407.md`.

- **Ført inn:** MM-U10, KA-U10, KA-U11, KA-U12 og EO-U5 som nye rader i 3.1.
  Daterte merknader til B-03, MM-U3, KA-U6, KA-U8, MM-U7, GR-U9 og EO-U2.
- **Ført inn i PR-en for #273:** MM-U11 som ny rad i 3.1, etter et
  oppfølgingsspørsmål fra gjennomgangen av formatforslaget, og en datert
  merknad til KA-U10. Merknaden under B-10 i 3.4 viser til designnotatet.
- **Ført inn på spørsmål fra #308:** KA-U13 som ny rad i 3.1, fra reviewet av
  samspillet mellom reglene, og daterte merknader til KA-U6, KA-U7, KA-U12, GR-U5
  og GR-U10.
- **Kjørt:** `python3 docs/verktoy/lenkekontroll.py` på planen.
- **Ikke kontrollert:** at vedtakene er bygget. Det gjør #308 og #273.

**Endringen 10.10, avslutningen av FK runde 1,** er dokumentarbeid. GR-U12 er
oppdragsgivers svar 10.10 på et spørsmål fra den uavhengige gjennomgangen av
PR #328. Ordlyden følger det valgte alternativet og oppdragsgivers tillegg om
varselet i frontenden.

- **Ført inn:** GR-U12 som ny rad i 3.1, daterte merknader til GR-U10, KA-U13 og
  MM-U11, og merknaden 10.10 til FK. Lenkene til `sprakprove/maalmodell/` i 1.2
  og 3.4 viser nå til `kjerne/`.
- **Kjørt:** `python3 docs/verktoy/lenkekontroll.py` på planen, `docs/README.md`
  og designnotatet.
- **Ikke kontrollert:** at GR-U12 er bygget. Det gjør #273 og #313.

**Sluttredigeringen 11.10** er dokumentarbeid mot `6f56672`. Kilden for F0b,
merknaden til KA-U12, ordbyttet i B-13 og KA-U30 er oppdragsgivers svar 11.10
på spørsmål med alternativer, formidlet av orkestratoren for FK runde 7.

- **Rettet utenfor vedtakene:** 1.2, 2.1, 2.2, 3.2, 3.3, 3.4, F0, F1, F2, FK og
  avsnitt 6, etter B-12, databasen, og B-19 (#396). F0b har nytt innhold, og
  merknadene 23.09–09.10 der er samlet under «Historikk». Utdaterte
  ventepunkter er fjernet.
- **Ført inn:** KA-U30 som ny rad i 3.1. Ordbyttet i B-13 og merknaden til
  KA-U12 i Følge. En setning om navn på hendelser, felt og koder i merknaden
  øverst i 3.1.
- **Kjørt:** et skript som viser at ankrene og cellene i vedtakskolonnen i 3.1
  er uendret, unntatt ordet i B-13 og den nye raden KA-U30;
  `python3 docs/verktoy/lenkekontroll.py` på planen,
  `docs/verktoy/datamodell.py`, `docs/verktoy/domenetabell.py` og
  `tests/test_datamodell` og `tests/test_domenetabell` uten testbasen.
- **Ikke kontrollert:** byggestatusen i «Følge» og i funnregisteret. Påstandene
  om Azure SQL bygger på vurderingen av JSON i Azure SQL og designnotatet om
  inbox og outbox, ikke på en egen kjøring.


## Arkivering 11.11.2026

Redaksjonshistorikk, leveransebelegg og den avsluttede bestillingen for spor M
er flyttet fra hovedplanen 11.11. Tekstene under står ordrett, bortsett fra
at interne lenker til hovedplanen har fått filnavn. De beskriver sitt daterte
grunnlag, særlig den senere slettede Python-/Supabase-stien. De er ikke
verifikasjon av TS-stien eller en gjeldende arbeidskø. Videreførte krav og
føringene for omfang og rekkefølge står fortsatt i hovedplanen. De opprinnelige
arbeidspakkene er også bevart her; de er historisk underlag til de kompakte
kravene i hovedplanen, ikke en aktuell utførelsesplan.

### Redaksjonshistorikk til og med 11.10

Teksten før sluttredigeringen 11.10 er bevart i Git:
`git show 6f56672:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `9421cba77197f29648d7be092e0a7861d1740ea3`). Den har teksten som
forutsatte PostgreSQL eller at Python beholder databasedelen, slik den sto før
[B-12, databasen](vedtak.md#b-12-databasen) og [B-19](vedtak.md#b-19) (#396).

Teksten før sluttredigeringen 10.10 er bevart i Git:
`git show 7460838:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `a325fbc3b0934cea3bb09c1839d85edbf493f5ab`). Den har de daterte
merknadene i kolonnen «Følge» i 3.1 slik de sto før de ble innarbeidet (#346).
Bare 3.1 ble redigert.

Teksten før sluttredigeringen 09.10 er bevart i Git:
`git show 5d067cc3:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `82d8b4e2fd28ea8d9a6c17755f28129e3e3b0dcc`). Den har endringsloggen fra
22.09 til 09.10 i toppteksten, kolonnen «I dag» i 2.2, den tidligere
rekkefølgen i 3.1 og radene og merknadene for de avgjorte beslutningene i 3.4.

Første sluttredigering var 22.09. Den erstattet de tidligere statuslagene i
denne fila og de to konsolideringsforslagene. Teksten før den er
`git show 41c2a16:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `9e7def005d6d5f119dfe1e708f79027581d352db`), og
[redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md) viser hvordan
hvert krav og hver funnfamilie ble ført videre.

### Hva sluttredigeringene innarbeidet

Sluttredigeringen 22.09 innarbeidet AF-01–AF-06, reviewene RGK-01–06 og
RGK2-01–05, reviewet av testbeviset (RTB-01–05) og det korrigerte
testinventaret ([redaksjonsprotokollen](../sluttredigering-hovedplan-2026-09-22.md)).
Sluttredigeringen 09.10 innarbeidet vedtakene 09.10 og ordnet 3.1 etter
kontraktstema. Sluttredigeringen 10.10 innarbeidet de daterte merknadene i
Følge-kolonnen i 3.1 (#346); teksten før er
`git show 7460838:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`
(blob `a325fbc3b0934cea3bb09c1839d85edbf493f5ab`). Sluttredigeringen 11.10
rettet teksten utenfor vedtakene etter B-12, databasen, og B-19 (#396), ga F0b
nytt innhold, byttet ordet «ansvarsgrunnlaget» i B-13 etter HF-U2 (#384) og
førte inn KA-U30; teksten før er
`git show 6f56672:docs/plans/2026-09-16-godkjenning-og-varig-levering.md`.
Endrer noe status, rettes det her med en datert merknad.

### Levert review-oppfølging 17.10

> **Merknad 2026-10-17 til AF-06 (review-oppfølging i FK og F0b, levert):**
> punktene i merknaden 17.10 om review-oppfølging i FK og F0b er levert: serveren
> i [#755](https://github.com/khjohns/endringsmeldinger/pull/755), kjernen i
> [#762](https://github.com/khjohns/endringsmeldinger/pull/762), verktøyene i
> [#757](https://github.com/khjohns/endringsmeldinger/pull/757) og vaktene i
> [#758](https://github.com/khjohns/endringsmeldinger/pull/758).

### Python-stien slettet 08.11

> **Merknad 2026-11-08 til F0b:** levert: punkt 4, TS2-02. Python-stien, reservelagrene og PostgreSQL-migrasjonene er slettet, og CI kjører vaktene for verktøyene i en egen jobb ([PR #1716](https://github.com/khjohns/endringsmeldinger/pull/1716), merge 5ff4eb4; [PR #1717](https://github.com/khjohns/endringsmeldinger/pull/1717), merge ce87a30; [PR #1719](https://github.com/khjohns/endringsmeldinger/pull/1719), merge e3f31de; lukker [#49](https://github.com/khjohns/endringsmeldinger/issues/49)). AR-08 og CFG-05, CFG-06 og CFG-07 er flyttet til arkivet: gjenstanden for dem er slettet.

### F0b i Python over PostgreSQL

**Historikk, Python over PostgreSQL (23.09–09.10):** F0b fulgte av
beslutningen 23.09 om direkte tilkobling (3.1). Kjernen `lib/db` med pool,
`transaksjon(kontekst)` og retry for hele transaksjonen ble levert 24.09
(PR #42), etter et [uavhengig review](../review-f0b-kjernen-2026-09-23.md) der
RK-01–RK-04 ble fulgt opp
([gjennomføringsnotatet](../gjennomforing-f0b-kjernen-2026-09-23.md); oppsettet
i [handoffen 23.09](../handoff-2026-09-23-datalag-postgresql.md), avsnitt 7).
RK-05, en samlet øvre grense for en transaksjon, står åpen før F1 (#50).
Løp c og d og TS2-02 ble avhengige av B-12 29.09 og av B-18 09.10, og bygges
ikke i Python etter B-19.

### Spor M avsluttet 30.10

Merknadene til spor M om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-spor-m--datamodell-og-funksjonskart).

**Avhenger av:** ingenting. B-12 avgjør bare fase 4. **Ført inn:** 29.09, etter
oppdragsgivers ønske og IKTs forespørsel om en tabellbeskrivelse som
systemdokumentasjon.

**Leveranse:**
1. **Datamodellen.** Et tabellregister med vakttest og eksport til IKTs
   regneark, en hendelseskatalog, og relasjoner og dataflyt mot Catenda.
2. **Funksjonskart.** For hver funksjon: hva brukeren gjør, hva som skjer bak
   kulissene, og hva som er tiltenkt, med kilde.
3. **Atferdstester per område.** Ordinære tester der atferden holder. Avvik
   blir funn med ID og streng `xfail`.
4. **Etter B-12:** beskrivelsene inn i databasen.

Kartleggingen går i faser, og en senere fase kan rette en tidligere.

**Samordning med spor D:** områdene for varsel, frist, vederlag, svar,
forsering og EO i fase 3 er den systematiske gjennomgangen av
tilstandsovergangene som spor D beskriver.

**Testene går gjennom rutene og containeren**, ikke mot SQL, slik at de kan
kjøres mot et annet datalag.

Oppdraget er [spor M](../prompt-datamodell-og-funksjonskart-2026-09-29.md).
Arbeidet følges i
[#79](https://github.com/khjohns/endringsmeldinger/issues/79).

> **Merknad 2026-10-30 til spor M:** sporet er avsluttet. Fase 1, datamodellen, er levert i `docs/datamodell/` med vakttestene, og vedlikeholdet står i `.claude/rules/dokumentasjon.md`. Fase 2–3 skulle kartlegge Python- og Supabase-stien, som er overgangskode ([DL-U2](vedtak.md#dl-u2), [B-19](vedtak.md#b-19)). Hva TS-stien gjør, vises av [brukerforløpene](../domenetabell/brukerforlop/dekning.md). #79, #83, #86, #89, #100, #101 og #103 er lukket som foreldet. #90, #429 og #554 står fortsatt.

### Milepæler og arbeidsvalg 30.10

> **Merknad 2026-10-30 til avsnitt 6 (milepælene):** milepælene F2 og opprydding etter AF-06 er lukket 30.10, uten åpne issues. F2 utgår etter merknaden 09.10 til F2, og oppryddingen som står igjen, er [#49](https://github.com/khjohns/endringsmeldinger/issues/49) i milepælen [Første ekte sak](https://github.com/khjohns/endringsmeldinger/milestone/7). Milepælen «Lesevisning etter målmodellen» heter nå [Varden og brukerforløpene](https://github.com/khjohns/endringsmeldinger/milestone/6). Arbeidsvalgene oppdragsgiver gjorde samme dag, står i [kommentaren i #1065](https://github.com/khjohns/endringsmeldinger/issues/1065#issuecomment-6521439363): første ekte sak tas i Varden ([#1414](https://github.com/khjohns/endringsmeldinger/issues/1414)), intern godkjenning (#818) er tatt ut av Første ekte sak, frontendarbeid kontrolleres mot brukerforløpene i stedet for mot sammenligningen med den gamle frontenden i #1080, og metodevalget i OV-U43 går gjennom et brukerforløp (#1299). Merknaden 20.10 til AF-06 om å verifisere før dagens skjema og visninger slettes, er ikke endret av svarene.

### Den opprinnelige rettingsbestillingen for spor D

Kan gå parallelt. Hver retting får regresjonstest og holdes innenfor sitt
funn. TFR-02 til TFR-06, GFK-02, GFK-06, INT-07, OBS-03, BR-01 (reprodusert
23.09, rettes etter B-13), DRF-01–DRF-03, SD-01–SD-04, og restansen på
GFK-01 etter [GFK-U3](vedtak.md#gfk-u3).

BH-svar på et nøytralt varsel må slippe forespørselen etter § 33.6.2 gjennom. Deretter systematisk gjennomgang av
tilstandsovergangene mot NS 8407, med dokumentert forventet overgang og test
per hendelsestype. Utvides `SporStatus`, gjelder regelen i
`.claude/rules/python-domene.md` om å lete opp alt som teller statuser.

### Opprinnelig arbeidspakke F0

Merknadene til F0 om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-f0--verifikasjonsgrunnlag).

**Avhenger av:** ingenting. **Status:** delvis. CI kjører backend, frontend,
typesjekk og lint (19.09). Migrasjonene er bygd mot tom PostgreSQL manuelt
(PG16 20.–21.09, PG18 22.09; historisk).

> **Merknad 2026-10-11 til F0 ([B-12, databasen](vedtak.md#b-12-databasen)):** jobben i
> punkt 1 og veien fra fil til base i punkt 3 gjelder PostgreSQL, som er
> testbasen til datalaget for Azure SQL finnes. Tilsvarende for Azure SQL hører
> til F0b, punkt 2.

**Leveranse:**

1. En CI-jobb som bygger alle migrasjoner mot tom PostgreSQL 17 (målversjonen
   i `supabase/config.toml`) med plattformstubben (`scripts/testbase/`), og kjører
   databasetester mot den. Stubben dokumenterer hvilke rettigheter som kommer
   fra plattformen.
2. Påkrevde sjekker på `main` i GitHub-innstillingene.
3. Avstemt migrasjonshistorikk i basen (DA-03), og en dokumentert vei fra fil
   til base.
4. Testvedlikehold, uten å svekke noen assertion:
   - **T-1** AUT-03: erstatt reproduksjonen med datert begrunnelse, slik FE-01
     ble erstattet 20.09. Den ordinære avvisningstesten finnes.
   - **T-2** DB-03, DB-04, DB-07: katalogtester mot PostgreSQL i stedet for
     tekstsøk i enkeltfiler. DB-04s tester for fremmednøkler venter på B-01.
   - **T-3** FE-02: gyldig sesjon i testoppsettet, så målassertionen nås.
   - **T-4** KR-15/TST-02: deterministisk reproduksjon ved eksistenssjekken, med
     reell lagring. Behold `strict=True` til den finnes.
   - **T-5** RV-17: `raises=` på AP-04-testen.

**Akseptkriterier:** jobben bygger basen fra tom og feiler ved en migrasjon som
sorterer feil; minst én test kjører mot ekte PostgreSQL med en ikke-privilegert
rolle; autorisasjon er ikke globalt mocket bort i disse testene; live-tester er
fortsatt eksplisitt adskilt; ingen tilfeldig rød port fra TST-02; basens
historikk og mappa stemmer.

**Tester som beviser:** katalogtestene i T-2; en test som viser at
`anon` og `authenticated` ikke leser tabeller eller kjører funksjoner.

### Opprinnelig arbeidspakke F0b

Merknadene til F0b om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-f0b--datalaget-over-direkte-tilkobling).

> **Merknad 2026-10-11 til F0b ([B-12, databasen](vedtak.md#b-12-databasen), [B-19](vedtak.md#b-19)):**
> oppdragsgiver bestemte 11.10 at F0b får nytt innhold: datalaget i TS over
> direkte tilkobling til Azure SQL. ID og anker er beholdt. Det F0b var for
> Python over PostgreSQL, er historikk (under), og teksten før er i Git (se
> toppteksten). F0b kommer før eller sammen med #310 (FK), og F1 kommer etter
> F0b som før.

> **Merknad 2026-11-08 til F0b:** levert: punkt 4, TS2-02. Python-stien, reservelagrene og PostgreSQL-migrasjonene er slettet, og CI kjører vaktene for verktøyene i en egen jobb ([PR #1716](https://github.com/khjohns/endringsmeldinger/pull/1716), merge 5ff4eb4; [PR #1717](https://github.com/khjohns/endringsmeldinger/pull/1717), merge ce87a30; [PR #1719](https://github.com/khjohns/endringsmeldinger/pull/1719), merge e3f31de; lukker [#49](https://github.com/khjohns/endringsmeldinger/issues/49)). AR-08 og CFG-05, CFG-06 og CFG-07 er flyttet til arkivet: gjenstanden for dem er slettet.

**Avhenger av:** B-12, databasen, og B-19 (3.1). Tilgangsmekanismen i B-02
alternativ C prøves tidlig i T-SQL ([B-12, databasen](vedtak.md#b-12-databasen), #395). Lagringsformen er avgjort med
[HF-U3](vedtak.md#hf-u3) (se [merknaden 11.10 til B-12](2026-09-16-godkjenning-og-varig-levering.md#b-12-merknad-2026-10-11) og
merknaden 24.10 etter den). Containerdelen avhenger
av hostingen i B-12. Arbeidet følges i
[milepælen F0b](https://github.com/khjohns/endringsmeldinger/milestone/1).

F0b bytter plattformen og veien til basen, ikke rettighetene. Datalaget etter
F0b, før rollene i F1 finnes, er ikke en produksjonstilstand. F1 og produksjonsporten gjelder; F1 er tilpasset Azure
SQL i merknaden 11.10 der.

**Leveranse:**

1. **Kjernen i TS:** direkte tilkobling til Azure SQL med managed identity
   ([B-12, databasen](vedtak.md#b-12-databasen)), pool og en transaksjonshjelper som
   setter kontekst for transaksjonen. `SESSION_CONTEXT` gjelder sesjonen, så
   at konteksten ikke følger en gjenbrukt forbindelse, må bevises på nytt
   (merknaden 29.09 under B-12). Feilklassifisering for driveren: en
   avvisning som aldri kan lykkes, prøves ikke på nytt, og versjonskonflikt
   har en egen klasse.
2. **Migrasjonene i T-SQL** og veien fra fil til base (#53), med en testbase av
   samme slag lokalt og i CI.
3. **Flyttingen fra Python ([B-19](vedtak.md#b-19), #375):** det Python gjør mot
   databasen, flyttes til TS før databasen byttes, først innloggingen og
   sesjonen, identiteten og synkroniseringen av medlemskap, og ellers blant
   annet webhookens innboks. Identiteten løses med samme issuer og
   normaliserte subjekt for alle veier inn (`AGENTS.md`). Løp c og d i den
   tidligere teksten (#57, #58) erstattes av flyttingen.
4. **TS2-02:** JSON-, CSV- og Supabase-lagrene og Python-lagrene over
   PostgreSQL ut av kjøretidsstien når flyttingen er gjort (#49). De skrives
   ikke om for Azure SQL (B-19).
5. **Container** og utrulling når hostingen i B-12 er avklart (#52).

**Akseptkriterier:** samme kode virker lokalt, i CI og mot Azure SQL; ingen
Python-kode leser eller skriver i databasen; en feil midt i en transaksjon
etterlater ingen delvise skrivinger; kontekst fra én forespørsel finnes ikke på
en gjenbrukt forbindelse etter commit eller rollback; innloggingen,
medlemssynkroniseringen og webhooken gir samme person én brukerrad.

**Tester som beviser:** lagertestene mot testbasen i CI; en test med pool på én
forbindelse som viser at kontekst ikke lekker; en test per feilklasse i
driveren; en test som viser at samme person gir én brukerrad fra hver vei inn.

**Kontroll:** kjernen får uavhengig review før lagrene bygges på den.
`/simplify` skal la sikkerhetskontrollene stå: transaksjonslokal kontekst,
fail-closed-kontroller som ser dobbelte ut, eksplisitte fjerninger av
rettigheter og like svar for «ukjent» og «ikke tilgang».

**Historikk, Python over PostgreSQL (23.09–09.10):** F0b fulgte av
beslutningen 23.09 om direkte tilkobling (3.1). Kjernen `lib/db` med pool,
`transaksjon(kontekst)` og retry for hele transaksjonen ble levert 24.09
(PR #42), etter et [uavhengig review](../review-f0b-kjernen-2026-09-23.md) der
RK-01–RK-04 ble fulgt opp
([gjennomføringsnotatet](../gjennomforing-f0b-kjernen-2026-09-23.md); oppsettet
i [handoffen 23.09](../handoff-2026-09-23-datalag-postgresql.md), avsnitt 7).
RK-05, en samlet øvre grense for en transaksjon, står åpen før F1 (#50).
Løp c og d og TS2-02 ble avhengige av B-12 29.09 og av B-18 09.10, og bygges
ikke i Python etter B-19.

### Opprinnelig arbeidspakke F2

**Avhenger av:** F0b og F1-rollene; B-01 for KOE-tilknytning og relasjoner; B-08
for reservasjonen; B-03 for dokumentoperasjonen; B-07 for drivmekanismen; B-10
for kompatibilitetskravet.

**Leveranse:** Kontrakten i
[transaksjonsplanen](2026-09-17-atomisk-utstedelse-og-outbox.md) er normativ.
Testkravene fastsettes før implementering, og én ansvarlig beholder oversikten
over transaksjonsgrensene. En grønn suite erstatter ikke dokumentasjon av hva
som er testet. Kort:

1. `commit_eo_approval` som én databasekommando i én transaksjon over direkte
   tilkobling (3.1, endret 23.09 fra «én RPC»): kommandokvittering kontrolleres
   under lås; policy, pakke og saksstrømmer låses i dokumentert rekkefølge;
   pakkeversjon, godkjenner, fullmakt, policyversjon og frosset innhold
   kontrolleres (RV-02, RV-19, RV-20); EO-nummer og KOE-tilknytning reserveres;
   hendelser, metadata, relasjoner, vedleggsbinding, pakkestatus, outbox og
   kvittering skrives samlet. Ingen kompensasjonssletting (AP-04, TST-05).
2. Vedleggstabell med hash, dokumentversjon og karantenestatus. Skanning før
   frigivelse. Staging med opprydding av foreldreløse filer.
3. Minimal worker: `SKIP LOCKED` i kort transaksjon, lease-token, backoff med
   jitter, `USIKKERT_UTFALL`, én strategi per ekstern operasjon (avsnitt 7).
   Frosset prosjekt, board og konfigurasjonsversjon (INT-06 for EO).
4. Ren projeksjon: navneoppslag ut av `compute_state` (KR-04, MG-01, MG-08).
   Register og projeksjon (MS-06, MS-07, MG-04). Rebase-regler (MS-03).
5. Parsegrensen avviser alle fem serverfelt (MG-03), med ruter og
   `approval_service` endret samtidig.
6. Ny skrivesti bak eksplisitt konfigurasjon, én autoritativ sti per prosjekt.
   Den gamle kompenserende stien stenges når den nye er aktiv.

**Akseptkriterier:** transaksjonsplanens akseptansetester 1–6 er grønne mot
ekte PostgreSQL med uavhengige forbindelser og feilinjeksjon ved hver
skrivegrense. I tillegg: identisk retry gir samme kvittering; endret innhold
med samme ID avvises; to ulike kommandoer gir én commit og én konflikt; gammel
worker som fortsatt lever, kan ikke kvittere etter utløpt lease; en ny worker
parkerer ved uavklart ekstern effekt; privat data avvises ved opprettelse av
jobb; gamle hendelser leses av ny kode, og tilbakerulling gjør ikke nye
hendelser uleselige; historiske teststrømmer gir samme tilstand uten Flask,
database eller nett. AP-04 regnes ikke som løst med lengre lease.

**Tester som beviser:** AP-04- og RV-02-reproduksjonene blir XPASS og gjøres
om til ordinære tester; nye PostgreSQL-tester for samtidighet og feilpunkter;
lokale feiltester for Catenda i avsnitt 7.

**Presisering 07.10, B-10:** Bevis gjenoppbygging etter regel-/projeksjonsendring
uten nye sakshendelser, også for lagrede oversikter. Dokumenter versjonen som
beregnet visningen, hvordan foreldet innhold oppdages, og når det bygges på nytt.
Prøv gamle og nye skrivere/lesere, utrulling og tilbakerulling. En leser som ikke
forstår en rettslig relevant hendelse, må stanse bindende kommandoer; historikken
kan fortsatt gjøres tilgjengelig med uttrykkelig begrensning. Frosne brev,
beslutninger og leveringsdokumenter endres ikke ved gjenoppbygging.

> **Merknad 2026-10-09 til F2 (B-17), oppdatert ved sluttredigeringen 11.10:** Endringsordre- og forseringssakene går
> til TS sammen med KOE-sakene (merknaden til [B-17](vedtak.md#b-17)). F2 slik den er
> skrevet, utgår:
>
> - Kommandoen i punkt 1, med KOE-tilknytningen, hører til FK.
>   Transaksjonsplanens kontrakt og akseptansetester gjelder kommandoen der, og
>   invariant 3 er uendret. Funnene kommandoen skal løse (AP-04, RV-02, RV-19,
>   RV-20, TST-05), følger den.
> - Kravene i punkt 4 gjelder utledningen og registeret for disse sakstypene i
>   TS-stien (FK). Punkt 5 (MG-03) gjelder TS-stien som invariant 11. Punkt 6
>   erstattes av at skrivestien byttes samlet (B-17).
> - Vedleggstabellen i punkt 2 og den minimale workeren i punkt 3 er levering
>   og integrasjon (B-17). Etter [B-19](vedtak.md#b-19) kan Python beholde dem bare så
>   lenge de ikke leser eller skriver i databasen selv, og Python henter ikke
>   leveringsoppdraget direkte fra basen ([LV-U1](vedtak.md#lv-u1)).
> - Akseptkriteriet om at gamle hendelser leses av ny kode, gjelder mellom
>   TS-versjoner (merknaden til invariant 9). Kriteriet om historiske
>   teststrømmer erstattes av bevis-sakene i domenetabellen, som føres videre
>   (B-17).
> - Fra 11.10 betyr «ekte PostgreSQL» og «PostgreSQL-tester» i
>   akseptkriteriene og testene over en ekte database av samme slag som
>   produksjonen, Azure SQL ([B-12, databasen](vedtak.md#b-12-databasen)).

### Opprinnelig arbeidspakke FK

Merknadene til FK om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-fk--koe--eo--og-forseringsdomenet-i-ts-b-17).

**Avhenger av:** B-17 med merknaden 09.10 (endringsordre og forsering følger
KOE). Målmodellen i den permanente mappa, skrevet om etter MM-U9 og GR-U10
([#308](https://github.com/khjohns/endringsmeldinger/issues/308)). Format og
versjonering etter B-10
([#273](https://github.com/khjohns/endringsmeldinger/issues/273)).
Serverplasseringen, B-18
([#311](https://github.com/khjohns/endringsmeldinger/issues/311)). Arbeidet
følges i [milepælen FK](https://github.com/khjohns/endringsmeldinger/milestone/5).

**Leveranse:**

1. TS-kjernen bygget ut til hele KOE-, EO- og forseringsdomenet, med vedtakene
   i 3.1 og domenetabellen som forventning
   ([#309](https://github.com/khjohns/endringsmeldinger/issues/309)).

   > **Merknad 2026-10-30 til punkt 1:** #309 er lukket 30.10 (oppdragsgiver 30.10:
   > «309 kan lukkes»). Hva kjernen trenger, styres nå av
   > [brukerforløpene](../domenetabell/brukerforlop/dekning.md), ikke av en bevis-sak
   > per rad i domenetabellen. Byggedel 4, endringsordre og forsering, følges i
   > [#1423](https://github.com/khjohns/endringsmeldinger/issues/1423). En henvisning
   > til byggedel 4 av #309, også i avsnitt 6, gjelder den.

2. Skrivestien for KOE-, EO- og forseringssakene overtatt samlet i TS, med
   Python bare for levering og integrasjon
   ([#310](https://github.com/khjohns/endringsmeldinger/issues/310)). Byttet
   omfatter skjemaer, API, batch, godkjenningspublisering, webhooks og
   bakgrunnsjobber (B-17).

**Akseptkriterier på pakkenivå:**

- Ingen Python-kode skriver i journalen for KOE-, EO- eller forseringssaker,
  heller ikke indirekte (B-17).
- Hver inngang i TS-stien krever autentisering med CSRF, prosjekttilgang og
  eventuelt kontraktsrolle, og et register med test feiler når en inngang
  mangler en kontroll (2.1, merknaden til invariant 11 og 12).
- Et brev lagres med beslutningsgrunnlaget og leveringsintensjonen i samme
  transaksjon som hendelsen (invariant 3, MM-U9).
- Bevis-sakene i domenetabellen går gjennom hele kjeden: kommando, lagring,
  gjenlesing og utledning i TS-stien.

> **Merknad 2026-10-10 til FK, runde 3 (#347):** oppdragsgiver har godkjent et
> unntak fra rekkefølgen #309 før #310. Skiva i
> [#347](https://github.com/khjohns/endringsmeldinger/issues/347), en
> gjennomgående prøve av TS-stien, kan gå før #309 er ferdig bygget, parallelt
> med første byggedel av #309. Den endrer ikke `kjerne/`.

> **Merknad 2026-10-10 til FK, runde 4 (#358):** [OV-U1](vedtak.md#ov-u1) avgrenser
> første versjon av TS-stien til KOE-saken og endrer rekkefølgen: #310 kommer før
> byggedel 4 av #309 (endringsordre og forsering) og før § 34.3.3 i byggedel 3.
> Brev om det som avvises, følger [OV-U2](vedtak.md#ov-u2).

> **Merknad 2026-10-11 til FK, rekkefølgen etter B-19:** databasen er Azure SQL
> ([B-12, databasen](vedtak.md#b-12-databasen)). Databasebyttet skjer før eller sammen med #310.
> Derfor forutsetter #310 at det Python gjør mot databasen, er flyttet til TS (#375,
> [B-19](vedtak.md#b-19)), og at datalaget for Azure SQL finnes (F0b). Kjernen i #309 importerer ingen
> database og bygges videre. Lagringstestene mot testbasen følger lagringsformen (#395).

### Opprinnelig arbeidspakke spor D

Merknadene til spor D om det som er levert eller ordnet fram til 24.10, står i [arkivet](arkiv.md#merknader-spor-d--domenefeil).

Kan gå parallelt. Hver retting får regresjonstest og holdes innenfor sitt
funn. TFR-02 til TFR-06, GFK-02, GFK-06, INT-07, OBS-03, BR-01 (reprodusert
23.09, rettes etter B-13), DRF-01–DRF-03, SD-01–SD-04, og restansen på
GFK-01 etter [GFK-U3](vedtak.md#gfk-u3).

BH-svar på et nøytralt varsel må slippe forespørselen etter § 33.6.2 gjennom. Deretter systematisk gjennomgang av
tilstandsovergangene mot NS 8407, med dokumentert forventet overgang og test
per hendelsestype. Utvides `SporStatus`, gjelder regelen i
`.claude/rules/python-domene.md` om å lete opp alt som teller statuser.

> **Merknad 2026-10-07 til spor D:** Målretningen er vedtatt med
> presiseringene under B-14. Gjennomføringen følger domenetabell og bevis,
> smal kontrakt og språkprøve før større ombygging av M2/M1. Små uavhengige
> rettinger beholder sin avgrensning. Ingen av SK-funnene lukkes av vedtaket.

> **Merknad 2026-10-09 til spor D:** Spor D er lukket for rettinger i
> Python-koden for KOE-, EO- og forseringssakene (merknaden 09.10 i 4.2).
> Unntak er sikkerhet og feil som hindrer test eller demo. Kontraktsinnholdet i
> funnene går til FK som rader og bevis-saker (#309) eller som krav til
> TS-serveren (#310).

### Historiske arbeidsvalg fram mot TS-overgangen

> **Merknadene 03.10 og 04.10 til AF-06 (unntak), samlet ved sluttredigeringen
> 09.10:** Oppdragsgiver har godkjent avgrensede unntak for oppryddinger som
> ikke rører datalaget, autentiseringen eller webhookstien, og som ikke
> forutsetter et databasevalg: #106, #107, #108, feilrettingen #72,
> frontenddelen av #110, frontenddelen av #111 (modulbeskrivelsene i
> `fristDomain.ts`, `grunnlagDomain.ts`, `vederlagDomain.ts`,
> `fristSubmissionDomain.ts` og `vederlagSubmissionDomain.ts`), de to
> Catenda-metodene uten kallere i #102 (`WebhookService.handle_pdf_upload` og
> `BaseSakService._create_topic_with_relations`), de reserverte
> PDF-parameterne i #146, #109 og den avgrensede deloppgaven i #49
> (SystemContext, `/api/validate-user` og `CSVRepository`). Backfill-skriptet i
> #102, backenddelen av #111 og logger-delen av #110 følger rekkefølgen i
> avsnitt 5.

> **Merknad 2026-10-07 til AF-06:** B-14 gir et avgrenset unntak for
> domenetabell, bevis-saker, smal kommando-/API-kontrakt og beslutningsprøven
> før større språkspesifikk ombygging. Prøven bruker eksisterende PostgreSQL
> og en isolert teststi. Den erstatter ingen autoritativ produksjonssti,
> åpner ikke database-/hostingvalget og godkjenner ingen full portering.
> Sikkerhetsvedlikehold og små uavhengige rettinger kan fortsette innen sine
> eksisterende føringer. F1/F2s sikkerhets- og transaksjonskrav gjelder fortsatt.

> **Merknad 2026-10-09 til AF-06 (B-17):** For KOE-, EO- og forseringssakene
> følger rekkefølgen B-17 og arbeidspakken FK (avsnitt 5), ikke F0b–F2.
> Oppdragsgiver avgjorde samme dag at endringsordre- og forseringssakene går
> til TS sammen med KOE-sakene (merknaden til [B-17](vedtak.md#b-17)).

> **Merknad 2026-10-09 til AF-06 (#102, #162):** Oppdragsgiver har godkjent at
> backfill-skriptet i #102 (`backend/scripts/backfill_relations.py`) og
> testskriptene i #162 (`create_test_sak.py` og `test_full_flow.py`) slettes nå.
> De rettes ikke. Skriptene krever Supabase-lageret eller utviklingsbypass, og de
> bygger saker og relasjoner fra testsaker som forkastes etter B-17.

> **Merknad 2026-10-10 til AF-06 (#347):** avviket fra rekkefølgen i FK for skiva i
> #347 står i merknaden 10.10 til FK, runde 3 (avsnitt 5).

> **Merknad 2026-10-11 til AF-06 ([B-12, databasen](vedtak.md#b-12-databasen), [B-19](vedtak.md#b-19)):**
> «Ekte PostgreSQL-tester» betyr fra 11.10 tester mot en ekte database av samme
> slag som produksjonen, Azure SQL. Lagerovergangen i TS2-02 bygges ikke i
> Python: lagrene slettes når det Python gjør mot databasen, er flyttet til TS
> (B-19, #375). Prøven mot eksisterende PostgreSQL i merknaden 07.10 og
> testbasen for kjernens lagringstester gjelder til datalaget for Azure SQL
> finnes.

> **Merknad 2026-10-16 til AF-06 (rekkefølgen i FK og F0b):** oppdragsgiver
> godkjente forslaget om rekkefølgen 16.10 med «Ja, som foreslått». Rekkefølgen
> og unntaket er:
>
> - Skrivestien og frontenden prioriteres foran resten av #587 og foran #514,
>   #516 og #550.
> - Oppfølgingsfunn fra review i FK og F0b (etiketten `review-oppfølging`) tas
>   ikke i rundene før #310 er levert, unntatt funn som gir feil resultat i et
>   forløp første versjon kan nå gjennom skjemaene. Samleissuene fra nye PR-er
>   følger samme prioritering.
> - Byggedel 4 (EO og forsering) venter til #310 er levert, slik [OV-U1](vedtak.md#ov-u1)
>   allerede sier.
> - Oppdelingen av #375 og kartleggingen av skrivestien (#375, #310, #370, #371,
>   #376, #418, #487 og #313) gjøres samlet for FK og F0b, og fordelingen av
>   filer legges fram for oppdragsgiver.

> **Merknad 2026-10-17 til AF-06 (review-oppfølging i FK og F0b):** oppdragsgiver
> godkjente 17.10 at en runde tar de anbefalte punktene fra sorteringen i
> [#709](https://github.com/khjohns/endringsmeldinger/issues/709#issuecomment-6237500889),
> som unntak fra merknaden 16.10. Svaret, ordrett: «Ja opprett issue og lag prompt
> til orkestrator som kan ta dine anbefalte issues (alle anbefalte - den velger selv
> å avslutte og prompte neste orkestrator dersom dens egen kontekst blir for høy)».
> Punktene er:
>
> - F0b, serveren: #750, #739 punkt 1, #716 punkt 2 og #724 punkt 1.
> - FK, kjernen: #550, #474 punkt 1, #562 punkt 1 og 2, #580 punkt 1 og #496.
> - Verktøyene: #604.
> - Vaktene i `.claude/`: #563. Oppdragsgiver svarte 17.10 om hvem som godkjenner
>   endringen: «Ja, du godkjenner i appen (Recommended)».

> **Merknad 2026-10-17 til AF-06 (retningen fram til #310):** oppdragsgiver
> svarte 17.10 på tre spørsmål om retningen fram til #310 (spørsmål 3 gjelder
> etterfølgeren til [#655](https://github.com/khjohns/endringsmeldinger/issues/655)). Planen står i
> [#764](https://github.com/khjohns/endringsmeldinger/issues/764). Spørsmålene og
> svarene, ordrett:
>
> 1. «Hvilken hovedretning skal arbeidet ha fram til aktiveringen (#310)?» Svar:
>    «Funksjon + medfølgende (Recommended)», som lyder: «Neste plan mot #310 er
>    hovedsporet. Én runde med kjernegjelden før byggedel 2 (nytt unntak fra
>    merknaden 16.10). Annen review-oppfølging tas bare i filer som runden uansett
>    endrer.» Forkastet: «Review-oppfølging først»: «To eller tre runder som
>    tømmer gruppe 3 (om lag 165 punkter) før ny funksjon. Mye av frontenddelen
>    kan bli overflødig når skjemaene og #313 bygges.»; «Bare funksjon»:
>    «Stoppen i merknaden 16.10 står uendret til #310 er levert, utover
>    unntaksrunden som pågår. Kjernegjelden venter også.»
> 2. «Skal vi ta oppryddingen uten kode nå: avvise Python-punkter etter DL-U2,
>    rette foreldede etiketter og stille de 22 spørsmålene som venter på deg,
>    samlet?» Svar: «Ja, nå (Recommended)», som lyder: «Én liten runde, mest i
>    issuene. Spørsmålene stilles i grupper med alternativer og anbefaling.»
>    Forkastet: «Bare oppryddingen»: «Avvisninger og etiketter nå. Spørsmålene
>    stilles når hvert punkt blir aktuelt.»; «Nei, vent»: «La gruppe 4 og 5 stå
>    til den ukentlige sorteringen.»
> 3. «Hva skal det nye planissuet (etterfølgeren til #655) ta først?» Svar:
>    «Levering + topic (Recommended)», som lyder: «Spørsmålene i #741, deretter
>    #371 og #741 med felles jobbkjører, og #418. Dette stenger aktiveringen
>    uansett.» Forkastet: «BH-svaret først»: «Byggherrens svarskjema og
>    godkjenningsflyten i TS, slik at en sak har begge sider før leveringen
>    bygges.»; «Begge parallelt»: «Levering i F0b-sporet og BH-svaret i
>    FK-sporet, med én felles orkestrator som i runde 5.»
