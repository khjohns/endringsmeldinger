# Redaksjonsprotokoll: sluttredigering av hovedplanen

**Dato:** 2026-09-22. **Kontrollert commit:**
`41c2a16191a5aadbe611e0958db8b93090b08027` (`main`).
**Status:** Protokoll over redigeringen. Ikke en kilde til løpende funnstatus;
den står bare i [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md).

Forrige ledd: [oppdraget](prompt-sluttredigering-hovedplan-2026-09-22.md),
[review av testbevis og planstatus](review-testbevis-og-planstatus-2026-09-22.md),
[konsolidert planforslag v2](konsolidering-masterplan-2026-09-22-v2.md),
[kildegrunnlag v2](konsolidering-kildegrunnlag-2026-09-22-v2.md),
[arkitekturføringene](arkitekturforinger-2026-09-21.md) og
[transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md).

Appen er ikke i produksjon og har ingen reelle data.

## 1. Utgangspunkt

- HEAD `41c2a16`, gren `main`. Ingen commit er gjort i denne runden.
- Git-status ved start: `docs/README.md` var endret lokalt med én linje
  (lenken til oppdraget). Endringen er beholdt. Øvrige usporede filer er
  ikke rørt.
- Opprinnelige versjoner er tilgjengelige i Git ved `41c2a16`:

| Fil | Blob ved start |
| --- | --- |
| `docs/plans/2026-09-16-godkjenning-og-varig-levering.md` | `9e7def005d6d5f119dfe1e708f79027581d352db` |
| `docs/vedlegg/testbevis-2026-09-22.csv` | `54c77fa5f9f83e04f114952dc50efe7e6e9e02fb` |
| `docs/audit-testbevis-2026-09-22.md` | `817e7b8219fd485d60ab1fb5a214ae3198141cbb` |
| `docs/README.md` (arbeidskopi med lokal endring) | `973a3d5ba6ed46426460134a5303464cb9597ff0` |

Hovedplanens nye tekst er skrevet fra kildene i avsnitt 5, ikke fra seg selv.
Ingen beslutning i den har denne redigeringen som eneste kilde.

## 2. Endrede dokumenter

| Dokument | Endring |
| --- | --- |
| [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) | Sluttredigert på stedet. Ankrene `#status-2026-09-18` og `#nye-arbeidspakker-og-produksjonskrav` er bevart som HTML-ankre |
| Denne protokollen | Ny |
| [README](README.md) | Hovedplanen er første inngang; runden 21.–22.09 og eldre handoffer er merket som historiske |
| [testinventaret](vedlegg/testbevis-2026-09-22.csv) | ID-er rettet; fire kolonner lagt til; GFK-04-raden rettet |
| [testrevisjonen](audit-testbevis-2026-09-22.md) | Lenker, ID-er og daterte merknader |
| [konsolidering v1](konsolidering-masterplan-2026-09-21.md), [kildegrunnlag v1](konsolidering-kildegrunnlag-2026-09-21.md), [konsolidering v2](konsolidering-masterplan-2026-09-22-v2.md), [kildegrunnlag v2](konsolidering-kildegrunnlag-2026-09-22-v2.md) | Datert merknad øverst: historisk forslag |
| [første review](review-gemini-konsolidering-2026-09-22.md), [review av v2](review-gemini-konsolidering-2026-09-22-v2.md), [review av testbevis](review-testbevis-og-planstatus-2026-09-22.md) | Datert merknad: innarbeidet |
| [transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md) | Datert merknad: underordnet, normativ for F2, åpne valg navngitt |

Ikke endret: produksjonskode, tester, migrasjoner, konfigurasjon, avhengigheter,
`AGENTS.md`, kjøreloggene under `docs/vedlegg/testbevis-2026-09-22/` og lokale filer.

> **Merknad 2026-09-22 (senere samme dag):** Etter redigeringen er `AGENTS.md`
> oppdatert etter avtale med oppdragsgiver: hovedplanen som eneste statuskilde,
> RV-07-henvisningen, målversjon og PG18-skranker, regelen om funn-ID-er i
> avledede dokumenter og lenker fra `docs/`. README har fått en lenkekontroll med
> ankre (`docs/verktoy/lenkekontroll.py`) og belegg-merkingen. Oppdraget for neste
> runde er [PostgreSQL 17 i CI](prompt-f0-postgresql-i-ci-2026-09-22.md).

## 3. Rettelser

### 3.1 Påkrevde rettelser fra oppdraget

| Kilde | Tiltak | Målseksjon |
| --- | --- | --- |
| RTB-01: AP-ID | Rad 1 i inventaret rettet fra AP-01 til AP-04; testens egen `reason` sier AP-04. AP-01 er ikke gjenåpnet | Hovedplan 4.1 (AP-01, AP-04); CSV rad 1; testrevisjon §1, §4, §5 |
| RTB-01: GFK-04 | Klassifisering som åpen feil og forslaget om å innføre forseringsstøtte er fjernet. Observasjonen står: testen forventer støtte og feiler med `ValueError`. Opprinnelig tekst er sitert i merknadskolonnen | Hovedplan 3.1, 4.2; CSV rad 11; testrevisjon §3 |
| RTB-01: TFR-ID-er | FR-01–FR-04 → TFR-02–TFR-05 i inventar og rapport | Hovedplan 4.2; CSV rad 39–42; testrevisjon |
| RTB-02: TST-02/KR-15 | Den nye testen er ikke deterministisk. Oppgaven om kontrollert fletting beholdes (T-4). Ingen tester endret, `strict=True` beholdt. JSON-feilen avgrenset til `JsonFileEventRepository` | Hovedplan 4.2 (TST-02), 4.4 (KR-15), F0; CSV rad 33 |
| RTB-03: AP-04/RV-02 | Punktrettingene er merket utilstrekkelige. Kravet om transaksjon, samordnet låsing, kommandoidempotens og atomisk leveringsintensjon står i invariant 3 og F2 | Hovedplan 2.3, 4.1, F2; CSV rad 1, 10; testrevisjon §3, §5 |
| RTB-04: Catenda | Tidligere kontrakttester gjenbrukt som historiske resultater. GUID-støtte skilt fra bevist idempotens. `upload_url` rettet: klienten bruker `Bimsync-Params` | Hovedplan 7; testrevisjon §6 |
| RTB-05: lenker | 73 lenkeforekomster (22 unike mål) rettet fra `backend/` til `../backend/`. Nye avsnittslenker er kontrollert mot faktiske ankre | Testrevisjonen; avsnitt 7 her |
| AUT-03 | Lekkasjen føres ikke som nåværende funn: batchruta avviser før skriving. Testvedlikehold som egen restanse (T-1) | Hovedplan 4.2, F0 |
| DB-03/DB-04 | DB-03 lukket (default droppet); testen leser en slettet fil. DB-04: `prosjekt_id` finnes, fremmednøkler mangler. Testene leser én historisk fil og beviser ikke dagens skjema (T-2) | Hovedplan 4.2, F0 |
| MG-03 | Forsvar i dybden; klientforfalskning ikke påvist | Hovedplan 4.4; CSV rad 26 |
| FE-01 | Testen i inventaret gjelder FE-02, ikke FE-01. Den feiler på autentiseringsforutsetningen i eget oppsett og undersøker ikke kontrakten (T-3). FE-01 er lukket 20.09 | Hovedplan 4.2; CSV rad 8 |

### 3.2 Andre ID-feil funnet ved gjennomgang av alle radene

Hver rad er holdt opp mot testfilas modulheader, testens `reason` og funntabellen
i auditen. Feilene er av samme type som RTB-01.

| Rad | Inventaret sa | Riktig | Grunnlag |
| --- | --- | --- | --- |
| 7 | DB-06 | DB-07 | `reason` og auditen: `properties` på `sak_bim_links` er DB-07. DB-06 er `prosjekt_id` på journalen, lukket 20.09 |
| 20 | CFG-03 | CFG-02 | `CSRF_SECRET` er CFG-02 i testfila og auditen |
| 21 | CFG-04 | CFG-03 | `/api/health` er CFG-03 (= RV-13) |
| 22 | CFG-02 | CFG-04 | `APP_ENV` og `cookie_name()` er CFG-04 |
| 27 | OBS-02 | OBS-01 / OBS-02 | Testfila dekker begge; ett funn etter 19.09 |
| 29 | OBS-04 | OBS-05 | Korrelasjons-ID er OBS-05. OBS-04 (`ce_source`) er lukket 20.09 |
| 30 | OBS-01 | OBS-06 | `X-Request-ID` er OBS-06 |
| 31 | OBS-05 | OBS-07 | Rå unntakstekst ved `app.debug` er OBS-07 |

Også statusen er rettet der inventaret var i strid med registrert status: DB-07
er lukket (kolonnen er deklarert i `20260920160000`), og OBS-03 er latent (19.09).

### 3.3 Rettelser av konsolideringsforslaget v2

| V2 sa | Hovedplanen sier | Grunnlag |
| --- | --- | --- |
| Datalaget håndheves «via dedikert `app_runtime`-rolle og `SECURITY DEFINER`-prosedyrer» | Åpent valg, B-02 | AF-01, AF-02; RGK-04 var en anbefaling |
| Relasjonsprojeksjonen forutsettes valgt ved godkjenning av planen | Åpent valg, B-01. Ikke vedtatt i sluttredigeringen | AF-03; oppdraget §5 |
| `failOnDocumentExists=true` som generelt krav | Følger av dokumentmodellen, B-03 | RTB-04; Catenda-dataflyten §11 |
| Tilbakekalling: utkast inaktive, pakker realloceres, committede varsler «rettslig gyldige» | Åpent valg, B-04 | Masterplanen 16.09; oppdraget §5 |
| Vedleggsregister og leveringsstatus avvikles i fase 2; «SQLite er helt avviklet» | Vedleggsregisteret avvikles når alle flyter bruker vedleggstabellen, leveringsstatus når alle leveringsveier bruker outbox (F3) | `CatendaDeliveryStatus` brukes av de ordinære hendelsesrutene i `event_routes.py`, og vedleggsregisteret også av `vedlegg_routes.py` og `approval_service.py` (L 22.09) |
| «Ingen utgående kall mot Catenda i HTTP-forespørselen for noen sakstyper» | Ingen støttet formell innsendingsvei mangler varig leveringsintensjon | RGK-01 |
| Terskler 15 min, 24 t, 100 req/s, 10 req/s | Forslag uten kilde, B-09 | RGK2-04 |
| `X-Frame-Options`, `Referrer-Policy` og «0 High/Critical» | Masterplanens liste (CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors`) og «besluttet terskel» | Masterplanen 19.09 |
| «0 a11y-advarsler», «signert SLA», «pentest uten åpne kritiske/høye», «instruks signert av produkteier» | Kravnivå avklares; akseptkriterier fastsettes av ansvarlige | Ingen beslutningskilde |
| `listDocumentReferences` | `getDocumentReferences` | Lokal OpenAPI, operationId |
| Byggreproduserbarhet: «100 % av prod-deps har `>=`» | Ikke overtatt. Masterplanen 19.09 oppga 10 av 21; ikke målt på nytt | Motstrid mellom kildene |
| Faste tabelltall per fase | Ingen tabelltall | RGK2-03 |

## 4. Testinventaret

Inventaret er lest med Pythons `csv`-modul. 42 rader, samme node-ID-er og samme
rekkefølge som ved start. Uendret per rad: `node_id`, `kildested`, `påstand`,
`lag_og_backend`, `strict`, `raises`, `forutsetninger`, `kommando_og_logg`,
`observert_utfall`, `første_feilsted` og `målassertion_nådd`. Alle 42 loggfiler
som `kommando_og_logg` viser til, finnes.

Endringer: `funn_id` er rettet i 14 rader, og opprinnelig verdi står i den nye
kolonnen `opprinnelig_funn_id`. I rad 11 (GFK-04) er `dokumentert_status`,
`bevisstatus` og `foreslått_tiltak` rettet; de opprinnelige verdiene er sitert i
merknaden. Nye kolonner: `registrert_status_2026-09-22`,
`kategori_2026-09-22` og `merknad_2026-09-22`.

**Kategorier, beregnet fra det korrigerte inventaret:**

| Kategori | Rader | Betydning |
| --- | --- | --- |
| Åpent funn – reprodusert kjøretidsbrudd | 22 | Testen når målassertionen, og funnet er åpent i hovedplanen |
| Åpent funn – statisk belegg | 12 | Testen leser kildekode, modell eller filer. Beviser avvik, ikke kjøretidssvikt |
| Åpent funn – latent eller forsvar i dybden | 2 | MG-03 og OBS-03. Mekanismen finnes, virkningen er ikke nåbar i dag |
| Åpent funn – testen når ikke målassertion | 1 | FE-02. Funnet er åpent, testen beviser det ikke |
| Lukket eller ikke nåbart – testvedlikehold | 3 | AUT-03, DB-03, DB-07 |
| Delvis utbedret – testen leser historisk fil | 1 | DB-04 |
| Vedtatt avgrensning – ikke feil | 1 | GFK-04 |

Geminis 25/3/14 er de samme radene før retting: de 22 pluss GFK-04, MG-03 og
OBS-03 utgjorde 25; de tre som feilet før målassertion er AUT-03, DB-03 og FE-02;
de 14 statiske er de 12 pluss DB-04 og DB-07.

**Antall rader er ikke antall feil.** De 22 radene i første kategori gjelder 21
funn, fordi AP-04 har to tester. RV-10/INT-05 og RV-13/CFG-03 er duplikater, og
CFG-03 og OBS-07 hører til samme rotårsak. Ingen rad er erklært nyverifisert i
denne runden; testutfallene er fra kjøringen 22.09.

## 5. Dekningsmatrise

Behandling: **Videreført** (samme innhold, ny plass), **Slått sammen**,
**Korrigert** (innholdet er endret, med grunn), **Historisk** (gjennomført
eller erstattet; bevart i Git).

### 5.1 Den gamle masterplanen

| Avsnitt eller krav i masterplanen ved `41c2a16` | Behandling | Ny plass |
| --- | --- | --- |
| Merknad 21.09: retning etter AF-01–AF-06 | Videreført | 3.2, avsnitt 5 |
| Merknad 21.09: konsolidering i nye reviewdokumenter | Historisk | Erstattet av denne sluttredigeringen |
| Bakgrunn og dokumentkjede | Slått sammen | 1.2 |
| Status 18.09: RV-01, 03–09, 11, 16, 22, SA-01–03 | Videreført | 4.1 |
| Merknadene 19.09 til RV-07, AUT-01/02 | Slått sammen | 4.1 RV-07, 4.2 AUT-01/02 |
| Beslutninger i rettingene: forsering, policyformat, Catenda-innlogging, vedlegg | Videreført | 3.1 |
| Struktur fra opprydningen (`BH_BINDENDE_EVENTS`, `tillatte_saker`, `event_visibility`) | Historisk | Implementert; grensene står i 2.1 |
| KR-01–KR-15, RY-01–RY-07 | Videreført | 4.4 |
| Prioritert liste RV-02, 10, 13, 19–21, 12, 14, 15, 17, 18 | Videreført | 4.1 og pakkene |
| Overlapp RV mot Gemini-sporet | Slått sammen | Duplikatrader i 4.1–4.2 |
| GFK-04 som truffet beslutning; INT-04 avgjort | Videreført | 3.1, 4.2 |
| Rotårsaker og de tre uavhengige sakene | Videreført | Avsnitt 5 «Rotårsakene», 4.2 |
| Merknad 5a: tenant-attribusjon, fjorten fallbacks | Slått sammen | Invariant 12; 4.2 DB-03, DB-06, FE-05, OBS-04. Detaljene er historiske |
| Prosjektpolicy lar seg skrive, men er ikke skrevet | Videreført | 2.2, AR-01, F1 |
| Status for de tre (19.09) | Videreført | 4.2 |
| Fem TFR-funn løses ikke av arkitekturarbeidet | Videreført | Spor D |
| Utenfor koden: konsoll og policy | Videreført | F5, RV-03, RV-06 |
| Pakke 0: lukk eksponering | Historisk | Lukket; 4.1 SA-01–03 |
| Pakke 1: felles sikkerhetsgrenser, inkl. leselag før aggregering, eksport og PDF | Videreført | F1 |
| Pakke 1: verifiserbar leveranseprosess | Videreført | F0; staging og driftseierskap i F5 |
| Pakke 2: atomisk domene og levering | Videreført | F2, F3 |
| Pakke 2: minste privilegier, hemmeligheter, Data API-tester, break-glass | Videreført | F1 |
| Pakke 3: frosset dokument, karantene, tilgangslogg, revisjon, bevaring, logger, integritetsbevis | Videreført | F1, F2, F4 |
| Pakke 3: restore, avstemming, varsling, kapasitet, driftsprosedyre | Videreført | F3, F5 |
| Pakke 1: databasearkitektur og mekanisme fra fil til base | Videreført | 4.3, F0 |
| Pakke 1: oppbevaring og sletting i journalen | Korrigert | Besvart av P7 (3.1). Det som gjenstår, er B-05 |
| Pakke 1: byggreproduserbarhet; HTTP-herding | Videreført | Spor H |
| Pakke 2: domenegjennomgang NS 8407 | Videreført | Spor D |
| Pakke 1: Catenda-avhengigheten | Videreført | F5 |
| Pakke 1: universell utforming | Videreført | F4 |
| Pakke 2: bevisførsel, eksport, tidskilde, bestridelse | Videreført | F4, B-11 |
| Merknadene om CI, lint og `ruff`-pinning | Slått sammen | F0 status, spor H |
| Driftskriptene | Videreført | AR-08, spor H |
| `UP042` | Videreført | B-10 |
| Foreløpige databasefunn 20.09 og metodekravene | Historisk | Gjennomført som DA-auditen; statusen står i 4.3 |
| DA-status, DA-03-merknaden, åtte tabeller uten `GRANT` | Videreført | 4.3, F0, F1 |
| DA-12–DA-15 lukket av målskjemaet | Korrigert | 4.3; DA-13 er gjenåpnet av AF-03 som B-01 |
| MS-01, MS-04, MS-10, MS-05, MG-02 gjennomført | Videreført | 4.3, 4.4 |
| MS-02 ulåst | Videreført | F1 |
| MG-01–MG-09 | Videreført | 4.4 |
| «Kjør `/code-review` mot runden» | Historisk | Utført som KR-auditen |
| Vedlegg uten hash | Videreført | MS-11, F2 |
| «Ingenting i målskjemaet er implementert» | Korrigert | 2.2: MS-01, 04, 05 og 10 er gjennomført |
| Inert `authenticated`-policy | Videreført | AR-07 |
| Presisering: egenskapsbasert tenant-kriterium | Videreført | F1 akseptkriterier |
| Presisering: kapasitet og rate limiting med flere instanser | Videreført | F3, B-09 |
| Ingen utrulling før porten; rettigheter før neste migrasjon | Videreført | 3.1, F1 |
| Beslutninger som skal inn i implementeringen | Videreført | 3.1, 2.3, B-04, F3, spor H |
| Merknad 21.09 (kveld): tre beslutninger | Videreført | 3.1 |
| Enkel databasebasert worker; avstemming er ekstra vern | Videreført | 3.1, invariant 7 |
| Organisatoriske forutsetninger | Videreført | F5 |
| Opprinnelig leveranserekkefølge, testkrav før implementering, én ansvarlig for transaksjonsgrensene | Videreført | F2, F3, F5; punkt 1 er historisk |

### 5.2 AF-01–AF-06

| Føring | Ny plass | Merknad |
| --- | --- | --- |
| AF-01 | 2.3 (1), 3.2, B-02, F1 | Akseptkriteriet om gjenbrukte forbindelser er med i F1 |
| AF-02 | 2.3 (2, 3), 3.2, B-02, F1, F2 | Trusselskillet er kravet til B-02 |
| AF-03 | B-01 | Ikke vedtatt |
| AF-04 | 2.3 (10), F2, F4 | |
| AF-05 | 2.3 (9), F2, B-10 | |
| AF-06 | Avsnitt 5 og 6 | Rekkefølgen styrer pakkene |

### 5.3 Kildegrunnlag v2

Hver rad i v2-matrisen har fått en linje i hovedplanens register (avsnitt 4)
eller en plass i en pakke. Familiene:

| Familie | Behandling | Ny plass |
| --- | --- | --- |
| Pakke 0–3 og produksjonskravene | Videreført; v2-avvik korrigert (3.3 her) | Avsnitt 5 |
| SA, RV | Videreført | 4.1 |
| AP | Videreført; RTB-01 og RTB-03 innarbeidet | 4.1 |
| AUT | Korrigert: AUT-03 lukket for batchruta; AUT-05 og AUT-06 tatt med | 4.2 |
| DB | Korrigert: DB-07 lukket, DB-04 delvis, DB-08 bortfalt | 4.2 |
| TFR, GFK | Videreført; GFK-04 avgrenset; GFK-02, 05, 06 skilt ut | 4.2, spor D |
| INT, FE, CFG, OBS, TST | Videreført; ID-rettelser i 3.2; FE-06 inkonklusiv | 4.2 |
| AR | Videreført, alle åtte | 4.3 |
| DA | Videreført, alle femten | 4.3 |
| MS | Videreført; MS-08, 09, 11 som justert av AF | 4.3 |
| KR, MG, RY | Videreført; MG-06, MG-07 lukket via KR-11, KR-02 | 4.4 |
| S1–S10 | Videreført | 4.1 |
| Organisatoriske forutsetninger | Videreført; «status ikke innhentet» | F5 |
| KONS-01–14 | Behandlet: 01 → 3.1; 02, 09 → merknader finnes i delplan og målskjema; 03 → B-01; 04 → B-02, F1; 05 → invariant 2; 06 → AF-04; 07 → F2; 08 → avsnitt 5; 10 → F0; 11 → F1; 12 → T-4; 13 → F1; 14 → F2 og F3 | Se ID |

### 5.4 Transaksjonsplanen

Delplanen er normativ for F2 (hovedplan 1.2 og F2). Hovedplanen gjentar ikke hele
kontrakten. Hvert hovedkrav har en plass: kommandokontrakten og låserekkefølgen
(invariant 3, F2.1), idempotens (invariant 4), versjonert policy (F1.2, F2.1),
EO- og KOE-reservasjon (F2.1, B-08), outbox og kvittering (F2.1, F2.3),
worker og lease (invariant 7, F2.3), frosset mål (invariant 6), PDF-staging
(F2.2), akseptansetestene 1–6 (F2), driftssynlighet (F3), konfigurasjonsflagg og
stenging av gammel sti (F2.6), uavhengig sluttaudit (F5).

### 5.5 Reviewfunn

| ID | Innarbeidet i |
| --- | --- |
| RGK-01 | Invariant 3, 4, 7; F2-akseptkriterier; Catenda-matrisen |
| RGK-02 | F1, F2, F3, F5; RV-14, RV-17, RV-18 i 4.1 |
| RGK-03 | AUT-03, MG-04, MG-05, MG-08, GFK-04, MG-01 i registeret |
| RGK-04 | Minimal worker i F2; lagringsrekkefølge; 3.3; B-01, B-02 |
| RGK-05, RGK-06 | Belegg merket K, L, D, H; PG18-resultatene står som historiske i F0 |
| RGK2-01 | Avsnitt 7; invariant 7 |
| RGK2-02 | Invariant 3–8; F1, F2 |
| RGK2-03 | Ingen tabelltall; SQLite-avvikling i F3; B-01 |
| RGK2-04 | P7 uten «evig» frist; DPIA forankres av behandlingsansvarlig; B-09; RV-14 avgrenset |
| RGK2-05 | AR-04, AR-08, FE-06 i registeret; «status ikke innhentet» i F5 |
| RTB-01–05 | Avsnitt 3.1 her |

## 6. Inngående lenker og ankre

To dokumenter lenker til `#status-2026-09-18`
([arkitekturvurderingen](arkitekturvurdering-2026-09-19.md) og
[reviewen av sikkerhetsrunden](audit-review-astra-2026-09-17.md)), og ett til
`#nye-arbeidspakker-og-produksjonskrav`
([databasearkitekturen](audit-databasearkitektur-2026-09-20.md)). Begge ankrene
er bevart som HTML-ankre ved funnregisteret og arbeidspakkene, der innholdet nå
står. Andre dokumenter lenker til fila uten anker. Tekstlige henvisninger til
gamle merknader, for eksempel «merknaden 2026-09-21 (kveld)» i handoffene, gjelder
den bevarte versjonen i Git. README viser nå dit.

## Verifikasjon og grenser

### Kjørt nå

- `git rev-parse HEAD`, `git status --short`, `git diff --stat 41c2a16 -- docs/`
  og `git hash-object` på kildefilene: se avsnitt 1.
- AST-gjennomgang av de 42 testene i inventaret: dekoratør, `reason` og
  docstring. Grunnlaget for ID-rettelsene i 3.2.
- AST-telling av `xfail` i `backend/tests`: 42 markeringer, én uten `raises=`.
- CSV-kontroll med `csv.DictReader` mot `git show 41c2a16:…`: 42 rader, uendrede
  proveniensfelt, endrede felt som listet i avsnitt 4. Alle 42 loggfiler finnes.
- Lenke- og ankerkontroll over alle endrede Markdown-filer. Skriptet fjerner
  kodeblokker og inline-kode, løser mål relativt til fila, og kontrollerer
  fragmenter mot overskrifter etter GitHubs slug-regler og mot eksplisitte
  `id`-ankre. Resultat: 0 brutte filmål og 0 brutte ankre i de endrede filene.
  Linjeankre som `#L116-L165` mot kildefiler kan ikke kontrolleres slik; de er
  ikke endret, og linjetallene kan ha drevet.
- Ingen tester, database- eller API-kall er kjørt.

### Lest nå

Hele masterplanen ved `41c2a16`, v2 og kildegrunnlaget, AF-01–AF-06,
transaksjonsplanen, begge Gemini-reviewene, testrevisjonen og inventaret,
reviewet av testbeviset, Catenda-dataflyten avsnitt 8C–11, vurderingen av
auditfunnene (del 1–4), funntabellene i auditene 18.–21.09, migrasjonsfilene
for `hendelse`, `sak_relations`, `sak_bim_links` og indeksene, SQLite-brukerne i
backend, `upload_document`, `create_topic`, `create_comment`, mock-kontraktene og
kontraktskriptet ved GUID-håndteringen, og operasjonene `createTopic`,
`createComment`, `getComment`, `getComments`, `getDocumentReferences`,
`createDocumentReference`, `updateTopic` og `createLibraryItem` i lokal OpenAPI.

### Historisk dokumentert

Katalogkontroller mot Supabase (18.–21.09), PG16- og PG18-byggene, testkjøringene
22.09 i testrevisjonen og reviewene, og de levende Catenda-testene fra
3. september. De er gjengitt som historiske, ikke som nye målinger. Gamle
testtider er ikke ført fram.

### Ikke kontrollert

- Den levende databasekatalogen. Supabase-MCP ble ikke brukt; påstander merket D
  er historiske.
- Full testsuite, og om de 42 testene gir samme utfall i dag.
- Levende Catenda-atferd, organisatoriske prosesser, avtaler og rettslige krav.
- Funn fra auditene 14.–16.09 som aldri har vært ført i masterplanen, er ikke
  registrert på nytt enkeltvis.
- AUT-05, RV-17s øvrige delpunkter og RV-18 er ikke kontrollert på nytt i koden.
