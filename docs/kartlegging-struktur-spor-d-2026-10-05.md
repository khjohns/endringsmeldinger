# Strukturkartlegging av spor D — 2026-10-05

**Dato:** 2026-10-05. **Utgangspunkt:** `main` på
`68ca0ea5b593808c4513dc84ab908baf12739cdb`, etter runde 5 (#245, #247, #251,
#254). Arbeidstreet var rent.
**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md)
(B-13 i [3.1](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger)
og [4.2](plans/2026-09-16-godkjenning-og-varig-levering.md#42-gemini-sporet-1809-aut-db-tfr-gfk-int-fe-cfg-obs-tst)),
[designnotatet for B-13](design-b13-sannhetskilde-2026-09-23.md),
[kartleggingen av domenereglene i frontend](kartlegging-domeneregler-frontend-2026-09-23.md)
og [oppdraget for spor D](prompt-spor-d-br01-2026-09-23.md).
**Oppdraget:** [prompt-strukturkartlegging-spor-d-2026-10-05.md](prompt-strukturkartlegging-spor-d-2026-10-05.md).
**Status:** kartlegging. Dokumentet endrer ingen produksjonskode. Vedtakene
oppdragsgiver tok underveis, står i hovedplanen 3.1. Om målformene i
avsnitt 7 legges til grunn, er B-14 (3.4, #263).

Appen er ikke i produksjon og har ingen reelle data.

## Sammendrag

**Hypotesen holder i hovedsak, men vekten ligger et annet sted enn antatt.**
Hendelsesloggen er ikke problemet. Ingen av funnene ligger i det som er
lagret; de ligger i hvordan det leses. Alle fem mønstrene finnes i koden, med
fire rettelser:

1. **M2 er større og mer alvorlig enn hypotesen sier.** Det er ikke bare felt
   som henger igjen. Sporstatusen skrives av ni til tolv hendelsestyper, hver
   med sin egen delvise overgangstabell, og aksepten er ikke bundet til svaret
   den gjelder. Tre forløp er kjørt gjennom forretningsreglene og
   projeksjonen: en sak blir `OMFORENT` med utstedbar EO for et krav som er
   tapt etter § 32.2 (SK-01), og for et krav byggherren ikke har svart på
   (SK-02); og en aksept blir stående etter at svaret den gjaldt, er endret
   (SK-03).
2. **M1 er to slutninger med samme navn.** «Hele svaret er subsidiært» ser på
   grunnlaget alene (brev, fullmakt, frontend). «Subsidiær enighet» krever i
   tillegg at sporets beløp eller dager er godkjent (`er_subsidiaert_*`).
   API-et sender bare den andre. Frontenden regner derfor den første selv, på
   elleve steder med tre varianter av regelen (tabell 1.1), og ingen av dem
   leser `subsidiaert_til_nytt_svar` (#250).
3. **M3 holder bare delvis.** De fleste ulovlige kombinasjonene avhenger av
   saken (kategorien, kravet, grunnlagets svar), ikke av hendelsen alene. En
   modell per varseltype løser `FristData` (#237), men ikke #189, #235 eller
   § 32.2-omfanget. Valideringen ligger i tre lag, og det ene validerer felt
   som ikke finnes.
4. **M4 og M5 holder,** og hver har en ny forekomst: samlet status kan bli
   `UKJENT` (SK-04), og `ActionBar` leser `null` som en sendt frist (SK-08).

Av de 19 åpne issuene med `spor-d` hører 13 til et av mønstrene. Fem
forsvinner med målformene og tre delvis. Elleve må rettes eller avgjøres
uansett form: fem er spørsmål om NS 8407 eller tiltenkt atferd, tre er nye
funksjoner, og tre er rettinger som står for seg (avsnitt 6). Ett av
spørsmålene (#231) ble avgjort underveis. Hypotesen plasserer fire issues feil.

Kartleggingen ga tretten nye funn, SK-01–SK-13 (avsnitt 5); SK-12 og SK-13 kom fra kontrollen i egen kontekst. Oppdragsgiver
avgjorde underveis hva SK-01, SK-02, SK-03 og #235 skal gi, og valgte
rekkefølgen M2, M1, M4, M5, M3. Etter en ekstern vurdering av forslagene tok
oppdragsgiver sju vedtak til samme dag (7.0).

## Belegg

**Kjørt og observert (K 2026-10-05).** Forløpene i avsnitt 1 og 5 er kjørt
som hendelser gjennom `BusinessRuleValidator.validate` og
`TimelineService.compute_state`, slik `/api/events` gjør, men uten HTTP og
uten lagring. Svarene bærer verdiene regelmodulen regner ut, så de passerer
`COMPUTED_RESULT`. Reproduksjonene står i
[`test_strukturkartlegging_spor_d.py`](../backend/tests/test_services/test_strukturkartlegging_spor_d.py)
(åtte strenge `xfail`) og
[`strukturkartlegging_spor_d.test.ts`](../src/lib/components/kontraktsbord/__tests__/strukturkartlegging_spor_d.test.ts)
(fire `it.fails`). Hver er kjørt med `--runxfail` og som vanlig `it` for å se
at den feiler på målassertionen. Eierskapstabellen i avsnitt 2 er laget med et
AST-skript over `timeline_service.py` og rettet for hånd.

**Lest ut av koden (L).** Alt annet: frontendens slutninger, statusmengdene,
datamodellene, typene og serialiseringen. Tre Explore-agenter søkte i
frontenden, i statusmengdene og i typene. Påstandene fra dem som står her, er
kontrollert mot koden; én er avvist og én nyansert (Verifikasjon og
grenser).

**Søkte former.** Python, TypeScript og Svelte, utenom tester:
`subsidiaer`, `subsidiær`, `subsidiaert`, `Subsidiært`, `prekluder`,
`erPrekludert`, `erGrunnlag`, `erGrunnlagetSubsidiaert`,
`erGrunnlagSubsidiaer`, `erEndringMed32_2`, `varslet_i_tide`, `varsletITide`,
`frafalt`, `er_frafalt`, `isDisputed`, `bh_resultat`, `beregnings_resultat`,
`subsidiaer_resultat`, `subsidiaer_triggers`, `er_subsidiaert_*`,
`visningsstatus`, `laast`, `prinsipalt`, `hele_vederlaget_subsidiaert`,
`hele_fristen`, `subsidiaert_til_nytt_svar`, `grunnlag_avslatt`,
`grunnlag_prekludert_32_2`, `LUKKEDE_STATUSER`, `LUKKET*`, `OMFORENT`,
`closed`, `ferdig_statuser`, `inactive_statuses`, `INACTIVE_STATUSES`,
`IKKE_TRUKKET_FRA`, `overordnet_status`, `neste_handling`, `kan_utstede_eo`,
`AVSLATT_AKSEPTERT`, `TRUKKET`, `Record<SporStatus`, `Record<OverordnetStatus`,
`cached_status`, `followUp`, `=== undefined`, `!== undefined`,
`model_dump`, `exclude_none`, `computed_field`, `openapi`, `model_json_schema`.

## 1. Kart over slutningene (M1 og M4)

«Regelversjon» betyr at stedet ligger under vakten i
`.github/workflows/regelversjon.yml` (`src/lib/domain/` eller
`backend/regler/`), så en endring krever ny `REGELVERSJON`.

### 1.1 Hele svaret på vederlag og frist er subsidiært på grunn av grunnlaget

Spørsmålet: er svaret prinsipalt avslått gjennom ansvarsgrunnlaget, og
hvorfor? Årsakene er avslag, preklusjon etter § 32.2, at grunnlagssvaret har
falt ved endret underkategori (`subsidiaert_til_nytt_svar`, #215), og frafall
som unntak.

| Sted | Lag | Leser | Regel | Regelversjon |
| --- | --- | --- | --- | --- |
| `regler/grunnlag.py` `er_grunnlag_subsidiaert` | regler | resultat, kategori, `varslet_i_tide` | avslag eller § 32.2 | ja |
| `regler/vederlag.py` `er_hele_vederlaget_subsidiaert` | regler | grunnlaget i tilstanden | som over; frafall ikke unntatt. Verdien brukes ikke av noen i backend | ja |
| `regler/frist.py` `Fristkrav.fra_tilstand` | regler | grunnlaget i tilstanden | avslag og § 32.2 holdes atskilt; bare avslag gir triggeren `grunnlag_avslatt`, som lagres | ja |
| `sak_state.py` `_subsidiaer_grunn` | projeksjon | `subsidiaert_til_nytt_svar`, så grunnlaget | som `er_grunnlag_subsidiaert`, men leser `subsidiaert_til_nytt_svar` først | nei |
| `timeline_service.py` `_svaret_faller_bort` | projeksjon | `_subsidiaer_grunn` ved skrivetid | fryser grunnen i sporet når underkategorien endres (bevisst, vedtak 05.10) | nei |
| `approval_authority.py` `grunnlag_er_subsidiaert`, `exposure` | fullmakt | `basis` frosset ved `prepare` | avslag eller § 32.2; frafall ikke unntatt | nei |
| `approval_letter.py` `decision_summary` | brev (beslutningslinjen) | `basis` | som fullmakten | nei |
| `grunnlagDomain.ts` `erGrunnlagetSubsidiaert` | frontend-domene | grunnlagsfeltene | speil av `er_grunnlag_subsidiaert` | ja |
| `deriveConfig.ts` vederlag og frist | frontend-domene | grunnlaget i tilstanden | vederlag: avslag eller § 32.2; frist: atskilt som i backend | ja |
| `fristDomain.ts` `beregnAlt` (`port2`, `port3`) | frontend-domene | konfigurasjonen | bare avslag; § 32.2 mangler | ja |
| `fristBegrunnelse.ts` `generateFristBeregningSection` | brevtekst (T-a) | skjemaets inndata | bare avslag; § 32.2 gir ikke «Subsidiært» | ja |
| `fristBegrunnelse.ts`, `vederlagBegrunnelse.ts`, innledningen | brevtekst (T-a) | skjemaets inndata | § 32.2 før avslag | ja |
| `approval/authority.ts` `calculateAuthority` | fullmakt (frontend) | `item.basis` | speil av `exposure` | nei |
| `approval/letter.ts` `decisionSummary` | brev (frontend) | `item.basis` | speil av `decision_summary` | nei |
| `approval/context.svelte.ts` `effectiveGrunnlag` | godkjenning | tilstanden og eget ferdigstilt grunnlagssvar | overstyrer grunnlaget før skjemaene regner | nei |
| `derive.ts` `svaretErSubsidiaert` | komponent | grunnlagsfeltene | avslag eller § 32.2; frafall unntatt bare for vederlag; leser ikke `subsidiaert_til_nytt_svar` | nei |
| `derive.ts` `grunnlagTriggers` | komponent | grunnlagsfeltene | utleder `grunnlag_avslatt` og `grunnlag_prekludert_32_2` til visning | nei |
| `FristForm.svelte`, `VederlagForm.svelte` (melding og årsak) | komponent | konfigurasjonen | avslag før § 32.2 | nei |
| `forsering_service.py` kandidatsøk, avslåtte dager (to steder) og `valider_grunnlag_fortsatt_gyldig` | forsering | `frist.bh_resultat` | bare fristens eget resultat; grunnlaget teller ikke (SK-06) | nei |

**Stedene gir ulikt svar på samme input.** Tre forløp. Backendkolonnene er K. Frontendkolonnen er `it.fails` for B og lest (L) for A og C:

| Forløp | Brev og fullmakt | `er_subsidiaert_vederlag` | `er_subsidiaert_frist` | Regelmodulen | Frontend (`svaretErSubsidiaert`) |
| --- | --- | --- | --- | --- | --- |
| A: frafall og § 32.2 (IRREG, `varslet_i_tide=false`), vederlag og frist godkjent | subsidiært | nei | ja | vederlag: ja; frist: ja, uten trigger | vederlag nei, frist ja |
| B: avslag, deretter ny underkategori; vederlag og frist var godkjent | ikke berørt (nytt svar regnes prinsipalt) | ja | ja | nei (nytt svar) | nei (#250, `it.fails`) |
| C: § 32.2-preklusjon, frist godkjent | subsidiært | ja | ja | frist: ingen trigger; avslag ville gitt `grunnlag_avslatt` (#234, streng `xfail`) | ja, med trigger |

Forløp A er #235. Etter vedtaket 05.10 skal kombinasjonen avvises (3.1), og
reproduksjonen er skrevet om til en avvisningstest med kontrollsak.

### 1.2 Subsidiær enighet

`er_subsidiaert_vederlag` og `er_subsidiaert_frist` (`sak_state.py`) er sanne
bare når grunnlaget er subsidiært **og** sporets eget resultat er godkjent
eller delvis godkjent. De brukes av `visningsstatus_*` og av regelen om
tilbaketrekking (`_kravet_er_oppgjort`, TFR-03). I frontenden leses de ett
sted, `deriveConfig.ts` (`harSubsidiaereSvar`), og verdien brukes ikke.
`derive.ts` sier det rett ut i en kommentar: serverfeltet gjelder bare et
godkjent beløp, så frontenden regner sitt eget.

`VederlagTilstand.visningsstatus` og `FristTilstand.visningsstatus` er en
tredje betydning: «avslått, subsidiært godkjent» ut fra sporets eget
subsidiære standpunkt, uten grunnlaget.

### 1.3 Resultatet av sporets egne vurderinger

Resultat, beløp og dager, prinsipalt og subsidiært, av § 33.4, § 33.6, § 33.1,
§ 34.1.2, § 34.1.3 og § 34.2.2. Her er speilet villet (B-13, alternativ (2) i
streng form): klienten regner, serveren regner og avviser ved avvik. Stedene
utenfor de to speilene er det som glir.

| Sted | Lag | Regelversjon | Kontrollert av serveren |
| --- | --- | --- | --- |
| `regler/frist.py`, `regler/vederlag.py` | regler | ja | er fasit |
| `fristDomain.ts`, `vederlagDomain.ts` | frontend-domene | ja | ja, `RESULT_MISMATCH` |
| `fristBegrunnelse.ts` (konklusjonen), `vederlagBegrunnelse.ts` | brevtekst (T-a) | ja | nei; teksten er partens |
| `FristForm.svelte`, `VederlagForm.svelte` (`resultat`, `prinsipaltGodkjent`) | komponent | nei | nei; ser bort fra grunnlaget (SK-07) |
| `VederlagOverview.svelte` (`assessedAmount`) | komponent | nei | nei; egen kopi av `beregnGodkjentBelop` |
| `mockup/store.svelte.ts` | mockup | nei | nei; #187 rettet resultatregelen, men `grunnlag_varslet_i_tide` skrives aldri |
| `saksoversikt/overview.ts` `overviewStats` («Prinsipalt godkjent») | komponent | nei | nei; summerer `cached_sum_godkjent` (SK-07) |

Beregningsavsnittet i `fristBegrunnelse.ts` (`generateFristBeregningSection`)
gir «kan ikke imøtekommes» ved 0 krevde dager, der `resultatAvDager` gir
«godkjent». Det hører til #179.

### 1.4 Grunnlagets status og låsing

| Sted | Lag | Regel |
| --- | --- | --- |
| `timeline_service.py` `_handle_respons_grunnlag` | projeksjon | godkjent og ikke prekludert gir `LAAST`; preklusjon gir `UNDER_FORHANDLING`, uansett resultat; frafall gir `TRUKKET` |
| `timeline_service.py` `_status_etter_aksept` | projeksjon | `godkjent` gir `GODKJENT` uten låsing, også ved preklusjon (SK-01) |
| `timeline_service.py` `_close_spor_for_reactive_eo` | projeksjon | reaktiv EO gir `LAAST` |
| `business_rules.py` `_rule_grunnlag_not_locked` | forretningsregler | `laast` eller `LAAST` |
| `derive.ts` (ansvarslinjen), `GrunnlagOverview.svelte` | komponent | «Prekludert (§ 32.2)» utledes av grunnlagsfeltene; `laast` leses ikke |

### 1.5 Lukket eller åpen, og samlet status (M4)

| Sted | Lag | Innhold | `LUKKET_AVSLATT` |
| --- | --- | --- | --- |
| `sak_state.py` `LUKKEDE_STATUSER` | projeksjon | `OMFORENT`, `LUKKET`, `LUKKET_TRUKKET`, `LUKKET_AVSLATT` | ja |
| `sak_state.py` `overordnet_status` | projeksjon | egen rollup; kan gi `INGEN_AKTIVE_SPOR` og `UKJENT`, aldri `SENDT` | ja |
| `catenda_service.py` `OVERORDNET_TO_CATENDA_STATUS` | integrasjon | `LUKKET`, `LUKKET_TRUKKET` og `LUKKET_AVSLATT` gir «Lukket»; `OMFORENT` gir «Omforent» | ja |
| `catenda_comment_generator.py` `_format_overordnet_status` | integrasjon | `LUKKET_TRUKKET` gir «Trukket» | ja |
| `saksoversikt/overview.ts` `closed` | komponent | `OMFORENT`, `LUKKET`, `LUKKET_TRUKKET`, `akseptert` | nei (#229, `it.fails`) |
| `domain/followUp.ts` `caseFollowUp` | frontend-domene | `OMFORENT`, `LUKKET`, `LUKKET_TRUKKET` | nei (#229, `it.fails`) |
| `case-list/CaseListRow.svelte` `statusToBadgeVariant` | komponent | `LUKKET_AVSLATT` faller til «uavklart» | nei (#229) |
| `types/timeline.ts` `OverordnetStatus` | typer | har `SENDT`; mangler `INGEN_AKTIVE_SPOR`, `UKJENT` | ja (SK-09) |

Mengdene for sporstatus er heller ikke like:

| Mengde | Sted | `AVSLATT_AKSEPTERT` | `LAAST` |
| --- | --- | --- | --- |
| `ferdig_statuser` | `overordnet_status` | ja | ja |
| godkjent for EO | `kan_utstede_eo` | ja | ja |
| `IKKE_TRUKKET_FRA` | tilbaketrekking | ja | nei (sjekkes for seg) |
| allerede avsluttet | `_rule_not_already_accepted` | nei | bare grunnlag |
| `inactive_statuses` | kaskade og omvendt kaskade | nei | nei |
| hoppes over ved reaktiv EO | `_close_spor_for_reactive_eo` | nei (blir `GODKJENT`) | — |
| `INACTIVE_STATUSES` | mockup | nei | nei |

Frafall skrives som `TRUKKET` (`_respons_til_status`). Sammen med to godtatte
avslag gir det `UKJENT` (SK-04, streng `xfail`). En endringsordre som er
bestridt, er `LUKKET` i backend (TFR-02), men gir byggherren en oppgave i
`WorkQueue.svelte`. Det kan være riktig, fordi EO-hendelsene er unntatt fra
sperren for lukkede saker og en bestridt EO kan revideres. Det er ikke prøvd.

### 1.6 Neste handling

`neste_handling` (`sak_state.py`) og `caseFollowUp` (`followUp.ts`) er to
rollups med ulike regler. Backend er statusbasert og håndterer ikke et
grunnlag i `UNDER_FORHANDLING` (SK-05: «Ingen ventende handlinger» mens saken
er under forhandling, K). Frontenden ser på `bh_resultat` og
`bh_respondert_versjon` per spor. `neste_handling` vises ikke i noe UI; den
brukes i Catenda-kommentaren og i `SakOversikt.neste_handling_rolle`.

## 2. Eierskap i projeksjonen (M2)

**Eget innhold** er en verdi som står i én hendelse. **Avledet** er regnet av
flere hendelser eller av tilstanden. Hendelsestypene er de som skriver feltet
direkte eller gjennom hjelperne (`_apply_konsekvensvarsler`,
`_svaret_faller_bort`, `_check_alle_krav_trukket`,
`_oppdater_subsidiaert_standpunkt`, `_close_spor_for_reactive_eo`). `*`
markerer «bare hvis satt i hendelsen».

### 2.1 GrunnlagTilstand

| Felt | Art | Skrives av | Merknad |
| --- | --- | --- | --- |
| `tittel`, `hovedkategori`, `underkategori`, `beskrivelse`, `dato_oppdaget`, `grunnlag_varsel`, `krav_event_id` | eget innhold (TE) | `grunnlag_opprettet`, `grunnlag_oppdatert` | én eier |
| `bh_resultat`, `bh_begrunnelse`, `grunnlag_varslet_i_tide`, `respons_event_id` | eget innhold (BH) | `respons_grunnlag(_oppdatert)`; nullstilles av `grunnlag_oppdatert` ved ny underkategori | to eiere, bevisst (vedtak 05.10, #215) |
| `bh_respondert_versjon` | avledet | `respons_grunnlag(_oppdatert)` | |
| `status` | avledet | `sak_opprettet`, `grunnlag_opprettet`, `grunnlag_oppdatert`, `grunnlag_trukket`, `vederlag_krav_trukket`, `frist_krav_trukket`, `respons_grunnlag(_oppdatert)`, `te_aksepterer_respons`, `eo_utstedt` | ti typer, hver med sin delvise overgang |
| `laast` | avledet | `respons_grunnlag(_oppdatert)`, `grunnlag_oppdatert`, `eo_utstedt` | settes ved skrivetid av underkategorien da; nullstilles nå når den endres |
| `te_akseptert` | avledet | `te_aksepterer_respons`; nullstilles av `grunnlag_oppdatert` ved ny underkategori | ikke bundet til svaret; et revidert svar beholder aksepten (SK-03) |
| `trukket_begrunnelse` | eget innhold | `grunnlag_trukket` | |
| `trukket_alle_krav` | avledet | `vederlag_krav_trukket`, `frist_krav_trukket` | |
| `antall_versjoner`, `siste_event_id`, `siste_oppdatert` | avledet | grunnlags-, svar-, trekkings- og aksepthendelser | metadata |

### 2.2 VederlagTilstand

| Felt | Art | Skrives av | Merknad |
| --- | --- | --- | --- |
| `metode`, `belop_direkte`, `kostnads_overslag`, `krever_justert_ep`, `begrunnelse`, `saerskilt_krav`, `krav_event_id` | eget innhold (TE) | `vederlag_krav_sendt`, `vederlag_krav_oppdatert` (ikke ved rent varsel) | én eier; settes alltid (SD-03) |
| `varslet_for_oppstart` | eget innhold | `vederlag_krav_*`* | |
| `rigg_drift_varsel`, `produktivitetstap_varsel` | eget innhold | `vederlag_krav_*`* og konsekvensvarsel fra `grunnlag_opprettet` eller `vederlag_krav_*` | siste krav vinner, med mindre et konsekvensvarsel er registrert (SK-12) |
| `vederlag_varsel`, `varsler` | eget innhold | konsekvensvarsel fra `grunnlag_opprettet` eller `vederlag_krav_*` | |
| `justert_ep_varsel` | avledet ved skrivetid | `vederlag_krav_*` | bevisst: serverens dato (DRF-03) |
| `bh_resultat` | eget innhold (BH) | `respons_vederlag(_oppdatert)`* | |
| `bh_begrunnelse`, `bh_metode` | eget innhold (BH) | `respons_vederlag(_oppdatert)`* (bare sannhetsverdi) | `bh_metode` fylles fra `vederlagsmetode`, som ingen klient sender (SK-11); SD-04 |
| `varsel_justert_ep_ok`, `begrunnelse_varsel` | eget innhold (BH) | `respons_vederlag(_oppdatert)`* | SD-04 |
| `godkjent_belop` | eget innhold (BH) | `respons_vederlag(_oppdatert)`*, `eo_utstedt` | reaktiv EO overskriver svaret med EO-beløpet |
| `subsidiaer_*` | eget innhold (BH) | `respons_vederlag(_oppdatert)`; nullstilles ved fullt svar | SD-01 |
| `subsidiaert_til_nytt_svar` | avledet ved skrivetid | `grunnlag_oppdatert` (setter), `respons_grunnlag(_oppdatert)` og `respons_vederlag(_oppdatert)` (nullstiller) | bevisst frosset (vedtak 05.10) |
| `status` | avledet | `grunnlag_opprettet`, konsekvensvarsel, `grunnlag_trukket`, `vederlag_krav_sendt`, `vederlag_krav_oppdatert`, `vederlag_krav_trukket`, `respons_vederlag(_oppdatert)`, `te_aksepterer_respons`, `eo_utstedt` | `vederlag_krav_oppdatert` åpner bare fra `AVSLATT`, `UNDER_FORHANDLING` og `DELVIS_GODKJENT` (SK-02) |
| `te_akseptert` | avledet | `te_aksepterer_respons` | nullstilles aldri (SK-02, SK-03) |
| `bh_respondert_versjon`, `respons_event_id` | avledet | `respons_vederlag(_oppdatert)` | |
| `trukket_begrunnelse` / `trukket_via_grunnlag` | eget innhold / avledet | `vederlag_krav_trukket` / `grunnlag_trukket` | |

### 2.3 FristTilstand

| Felt | Art | Skrives av | Merknad |
| --- | --- | --- | --- |
| `krevd_dager`, `begrunnelse`, `varsel_type`, `spesifisert_varsel`, `krav_event_id` | eget innhold (TE) | `frist_krav_sendt`, `frist_krav_oppdatert`, `frist_krav_spesifisert`; `varsel_type`, `begrunnelse` også fra konsekvensvarsel | |
| `frist_varsel` | eget innhold | konsekvensvarsel, `frist_krav_*` | siste krav vinner, med mindre et konsekvensvarsel er registrert; datoen kan flyttes (SK-12, K) |
| `frist_varsel_ok`, `begrunnelse_varsel` | eget innhold (BH) | `respons_frist(_oppdatert)`*, `frist_innsigelse_sendt` | to hendelser med ulik betydning: § 33.4-vurderingen i svaret og innsigelsen etter § 5. `Fristkrav.fra_tilstand` leser begge som innsigelse |
| `spesifisert_krav_ok`, `vilkar_oppfylt` | eget innhold (BH) | `respons_frist(_oppdatert)`* | modellen har standardverdien `True`, så de lagres og kopieres også når spørsmålet ikke er stilt |
| `foresporsel_svar_ok`, `godkjent_dager`, `ny_sluttdato` | eget innhold (BH) | `respons_frist(_oppdatert)`*; `godkjent_dager` også `eo_utstedt` | SD-04 (`ny_sluttdato`, K) |
| `har_bh_foresporsel`, `dato_bh_foresporsel`, `foresporsel_krav_id`, `frist_for_spesifisering` | eget innhold (BH) | `frist_foresporsel_sendt` | én eier etter #182 og #238 |
| `foresporsel_besvart_krav_id` | avledet ved skrivetid | `frist_krav_*` | bevisst: § 33.6.2 fjerde ledd gjelder kravet som svarte |
| `bh_resultat`, `bh_begrunnelse`, `subsidiaer_*` | eget innhold (BH) | `respons_frist(_oppdatert)` | som vederlag |
| `subsidiaert_til_nytt_svar`, `status`, `te_akseptert`, `bh_respondert_versjon`, `respons_event_id`, `trukket_*` | avledet | som vederlag, med frist-hendelsene | `status` skrives av tolv typer, medregnet et fristvarsel som følger med vederlagskravet |

### 2.4 Felt som er avledet ved skrivetid, men leses mot gjeldende tilstand

Det var feilen i #215. Den er rettet for grunnlaget ved at svaret faller når
underkategorien endres. Den samme formen står igjen her:

- **Sporstatus** (`status` i alle tre) avledes ved skrivetid av den hendelsen
  som kom sist, med en delvis overgangstabell i hver handler. `overordnet_status`,
  `kan_utstede_eo`, `neste_handling` og `visningsstatus_*` regner av den ved
  lesetid som om den beskrev gjeldende krav og svar. Den gjør ikke det etter
  et oppdatert krav (SK-02) eller etter aksept av en preklusjon (SK-01).
- **`te_akseptert`** beskriver et svar, men er ikke bundet til
  `respons_event_id` (SK-03).
- **`godkjent_belop` og `godkjent_dager`** skrives både av svaret og av
  reaktiv EO.
- **Varslene fra TE** (`frist_varsel`, `rigg_drift_varsel`,
  `produktivitetstap_varsel`) er eget innhold i det første kravet, men
  overskrives av hvert senere krav. Datoen for varselet etter § 33.4 kan
  dermed flyttes, også bakover (SK-12, K).
- **`cached_sum_godkjent`** i metadata settes til `vederlag.godkjent_belop`
  ved skrivetid og vises som «Prinsipalt godkjent» (SK-07).

Bevisst frosset er `subsidiaert_til_nytt_svar` (vedtak 05.10),
`justert_ep_varsel` (DRF-03) og `foresporsel_besvart_krav_id`.

### 2.5 Forsering og endringsordre

`ForseringData` skrives av `sak_opprettet` og forseringshendelsene, med ett
legacy-par (`bh_aksepterer_forsering` og `bh_respons.aksepterer`) som begge
settes av `forsering_respons`. `EndringsordreData` erstattes helt av
`eo_utstedt` og endres felt for felt av de andre EO-hendelsene. Ingen felt der
har flere eiere med ulik betydning. Lest, ikke kjørt.

## 3. Datamodellen for hendelsene (M3)

Valideringen av en hendelse ligger i tre lag før reglene:
`api/validators.py` på rå dict, Pydantic-modellen, og forretningsreglene med
regelmodulen, som har tilstanden. Godkjenningsflyten kaller alle tre
(`ApprovalService.validate_items`).

| Modell | Lovlige kombinasjoner etter domenet | Modellen | `api/validators.py` | Forretningsregler og regler | Ikke håndhevet |
| --- | --- | --- | --- | --- | --- |
| `GrunnlagData` | underkategori hører til hovedkategorien; varsler bare ved opprettelse | nei (`str`) | ja | varsler ved oppdatering avvises (`NOTICE_TRACK`) | — |
| `VederlagData` | varsel uten metode og beløp; spesifisert med metode; enhetspriser og fastpris med `belop_direkte`; regningsarbeid med overslag | varsel/spesifisert | beløp per metode; `justert_ep_varsel` avvises | kravet må ha grunnlag | `belop_direkte` ved regningsarbeid, `krever_justert_ep` utenfor enhetspriser. Et fristvarsel i `varsler` avvises i et rent varsel, men godtas i et spesifisert krav og setter fristsporet til `SENDT` (K). Varselkontrollen ved `inkluderer_*` gjelder felt ingen modell har (SK-11) |
| `FristData` | varsel uten dager; spesifisert med dager og begrunnelse; begrunnelse utsatt uten dager | bare spesifisert | dager ved oppdatering og spesifisering; varselinfo ved opprettelse | — | dager ved `varsel` og `begrunnelse_utsatt` (#237) |
| `GrunnlagResponsData` | resultat; frafall bare ved pålegg; `grunnlag_varslet_i_tide` bare ved § 32.2; ikke frafall sammen med preklusjon (vedtak 05.10) | full eller delvis | resultat og begrunnelse | regelmodulen (`kontroller_grunnlagssvar`) | frafall med preklusjon (#235); `akseptert_kategori` leses ikke (SK-11) |
| `VederlagResponsData` | vurdering per krevd post; delvis med beløp mellom 0 og kravet; tilbakeholdelse bare ved regningsarbeid uten overslag | full eller delvis | `beregnings_resultat` | regelmodulen | delvis ved fradrag (#189, uavklart); `oensket_metode` projiseres ikke, `vederlagsmetode` sendes ikke (SK-11) |
| `FristResponsData` | varselspørsmålene etter kravets art; dager mellom 0 og kravet; ikke § 33.6.1 når kravet svarte på forespørselen | forespørselsfeltene avvises (#182, #238) | `beregnings_resultat`, `vilkar_oppfylt` | regelmodulen; kravet må ha dager (`CLAIM_SPECIFIED`) | § 5-innsigelse i fullt svar og innsigelse mot sent svar (#175, uavklart) |
| `FristInnsigelseData`, `FristForesporselData` | bare på et krav uten dager; forespørselen med den faste teksten | fast tekst (#173) | — | `CLAIM_UNSPECIFIED`, referanse, ikke to ganger | — |
| `TEAkseptererResponsData`, `WithdrawalData` | aksept av et svar som ikke er avsluttet | — | — | `BH_HAS_RESPONDED`, `NOT_ALREADY_ACCEPTED` | aksepten peker ikke på svaret (SK-03) |
| `ForseringVarselData` | avslåtte dager og dagmulktsats fra sakene | — | — | varslet én gang | `avslatte_dager`, `dagmulktsats` og `grunnlag_avslag_trigger` tas fra klienten |
| `EOUtstedtData` | ett beløp, én liste over KOE-saker | — | — | reaktiv EO krever `kan_utstede_eo` | to representasjoner av beløpet og av KOE-listen; toppnivåfelt utenfor `data` (DM-06, #94) |

**Delvise svar finnes ikke lenger i praksis.** Alle svarmodellene sier at et
svar med `original_respons_id` kan være delvis, og projeksjonen kopierer
svarfeltene bare når de er satt. Men `validate_respons_event` krever resultat i
alle nye svar, og regelmodulen krever hele vurderingen (B-13). Delvise svar
kan bare komme fra eldre hendelser. Det er formen SD-04 (#76) står i.

**Vurdering: en modell per varseltype, eller en diskriminert union.**
- For `FristData` holder det. `varsel_type` som `Literal` i tre modeller gjør
  dager ved varsel umulig (#237) og fjerner `antall_dager: int | None` fra det
  spesifiserte kravet. `frist_krav_oppdatert` uten `varsel_type` må da enten
  arve typen fra tilstanden i ruta eller få typen påkrevd.
- For `VederlagData` gir den samme mekanisme det modellvalidatoren gjør i dag,
  bare tydeligere. Liten gevinst.
- For svarene holder det ikke. Lovligheten avhenger av kategorien, kravet og
  grunnlagets svar, og bare regelmodulen har dem. Det som hjelper, er å fjerne
  delvis-semantikken: svaret er én verdi som erstatter forrige svar helt.
- `extra="forbid"` på `*Data` ville gjort felt som forsvinner stille, synlige
  (DRF-02). Frontenden sender i dag flere slike felt (`auto_begrunnelse`,
  `dato_endret`, `dager_siden_varsel`, `vurdering_begrunnelse`, L), så de må
  ryddes først.
- `api/validators.py` dupliserer modellene og bør krympe til det modellene
  ikke kan uttrykke.

## 4. Kontrakten mellom API og frontend (M5)

**I dag.** Typene i `src/lib/types/` (1 506 linjer, `timeline.ts` 1 129) er
skrevet for hånd. Toppteksten i `timeline.ts` sier at de «mirror the backend
models exactly». Ingen generator kobler Pydantic til TypeScript, og ingen test
i CI sammenlikner dem. Det som finnes:

- `backend/scripts/generate_openapi.py` (2 115 linjer) dekker seks modeller,
  beskriver tilstanden som `{"type": "object"}`, og importerer `yaml`, som
  ikke står i noen requirements-fil. Utdataene finnes ikke.
- `scripts/state_drift.py` og tre søsterskript sammenlikner med regex og AST.
  De er ikke i CI, og `requirements-dev.txt` sier at seks av ni feiler. Kjørt
  av agenten: «7 av 7 modeller har avvik». `state_drift` regner `?:` og
  `| None` som samme ting, så avviket mellom `null` og `undefined` rapporteres
  ikke.
- `/api/cloudevents/schemas` leverer JSON Schema per hendelsestype på
  kjøretid. Frontenden henter dem aldri.
- Reproduksjonen av TST-04 leter etter `backend/docs/openapi.yaml` relativt
  til `backend/`, og kan ikke bli XPASS (SK-10).
- Det som faktisk vokter: fixturen `skjemaenes_nyttelast.json`, som frontenden
  skriver og backend sender gjennom `/api/events`, og vakten på
  `REGELVERSJON`.

**Avviket.** Tilstanden serialiseres med `model_dump(mode="json")` uten
`exclude_none` (`public_state`), så hvert `X | None` kommer som `null`.
`timeline.ts` har 310 `?:` og 18 `| null`. Hendelsesdata i tidslinjen
serialiseres med `exclude_none=True`, så der passer `?:`. Klienten validerer
ikke svaret (`apiFetch` returnerer `data as T`). Følgen er formen i #184,
#241 og nå SK-08: en sammenlikning med `undefined` som er sann for `null`. Det
finnes 58 sammenlikninger med `=== undefined` eller `!== undefined` i `src/`
utenom tester (L, ikke gjennomgått hver for seg). I tillegg mangler felt i
typene (`subsidiaert_til_nytt_svar`; `respons_event_id`; `krav_event_id` i grunnlag og vederlag, ikke i frist), og
typene har felt API-et aldri sender (`fradrag_belop`, `er_estimat` og
`netto_belop` i `VederlagTilstand`; `nytt_antall_dager`,
`er_svar_pa_foresporsel` og flere i hendelsesdataene).

**Hva generering koster.** Lest og anslått, ikke prøvd:
- Et skript som skriver JSON Schema fra `SakState`, tidslinjens hendelser og
  `*Data` med `model_json_schema(mode="serialization")`, og
  `json-schema-to-typescript` til `src/lib/types/generated/`. Under 150
  linjer. En CI-sjekk som genererer på nytt og feiler ved diff.
- `computed_field` må med i skjemaet (`mode="serialization"` tar dem med).
  `overordnet_status` er `str` og må bli en enum i backend for å gi en union
  (SK-09). `neste_handling` er `dict` og må få en modell.
- Den største kostnaden er frontenden: når `X | null` kommer inn, viser
  `npm run check:error` hvert sted som leser feltet som `undefined`. Det er
  poenget, men det er trolig dusinvis av steder i komponentene (skjønn, ikke
  talt).
- Skrivesiden (byggerne i `src/lib/domain/`, typet som
  `Record<string, unknown>`) kan bindes til de genererte `*Data`-typene
  etterpå.

## 5. Funn

| ID | Alvorlighet | Mønster | Kort | Belegg | Issue |
| --- | --- | --- | --- | --- | --- |
| SK-01 | middels | M2, M4 | TE kan godta en § 32.2-preklusjon; saken blir `OMFORENT` med utstedbar EO | Streng `xfail`, K | #255 |
| SK-02 | middels | M2 | Et oppdatert krav åpner ikke sporet; status og aksept fra forrige svar står | Tre strenge `xfail`, én med kontrollsak, K | #256 |
| SK-03 | lav | M2 | Byggherren kan revidere et svar TE har godtatt | Streng `xfail` med kontrollsak, K | #256 |
| SK-04 | lav | M4 | Frafall gir `TRUKKET`; godtatte avslag gir `UKJENT` | Streng `xfail`, K | #257 |
| SK-05 | lav | M4 | `neste_handling` håndterer ikke et prekludert grunnlag | K | #255 |
| SK-06 | lav | M1 | Forsering ser bare på fristens eget resultat | L | #258 |
| SK-07 | lav | M1 | Skjemaene og prosjektoversikten kaller et subsidiært svar prinsipalt | L | #259 |
| SK-08 | lav | M5 | `ActionBar` leser `krevd_dager: null` som sendt | L | #260 |
| SK-09 | lav | M4, M5 | `OverordnetStatus` avviker fra det backend lager | L | #260 |
| SK-10 | lav | M5 | TST-04-reproduksjonen kan ikke bli XPASS | L | #261 |
| SK-11 | lav | M3 | Svarmodellene og validatorene har felt uten virkning | L | #262 |
| SK-12 | lav | M2 | Et senere krav kan flytte datoen for et registrert varsel (§ 33.4, § 34.1.3) | Streng `xfail` med kontrollsak, K | #264 |
| SK-13 | lav | M5 | Forseringsrutene returnerer tilstanden utenom `public_state` | L | #265 |

Alvorlighet angir mulig konsekvens under beskrevne forutsetninger, som i
hovedplanen.

### SK-01 — godtatt § 32.2-preklusjon gir OMFORENT (middels)

`_status_etter_aksept` (`timeline_service.py`) gir `GODKJENT` når byggherrens
resultat er «godkjent», uten å se på preklusjonen. Forløpet (K): IRREG,
vederlag 100 000 kr og frist 20 dager, svar «godkjent» med
`grunnlag_varslet_i_tide=false`, vederlag og frist godkjent subsidiært. Før
aksepten er grunnlaget `UNDER_FORHANDLING` og saken `UNDER_FORHANDLING`, men
`neste_handling` sier «Ingen ventende handlinger» (SK-05). Etter at TE godtar
grunnlagssvaret: grunnlaget `GODKJENT`, `laast=False`, saken `OMFORENT` og
dermed lukket, `kan_utstede_eo=True`, og `neste_handling` ber byggherren
utstede EO. `er_subsidiaert_vederlag` er fortsatt sann, og
`visningsstatus_vederlag` sier «Prekludert (Subsidiært enighet …)».

**Vedtak 05.10 (3.1):** aksepten er et godtatt avslag: `AVSLATT_AKSEPTERT`,
`LUKKET_AVSLATT`, ingen EO. Reproduksjonen er
`test_godtatt_preklusjon_etter_32_2_er_godtatt_avslag`.

### SK-02 — et oppdatert krav åpner ikke sporet (middels)

`_handle_vederlag` og `_handle_frist` setter status tilbake til `SENDT` bare
fra `AVSLATT`, `UNDER_FORHANDLING` og `DELVIS_GODKJENT`.
`_rule_active_vederlag_exists` og `_rule_active_frist_exists` godtar en
oppdatering fra alle statuser utenom `IKKE_RELEVANT` og `UTKAST`. Forløp (K):

- Vederlag godkjent fullt med 100 000 kr. TE øker kravet til 250 000 kr.
  Sporet står som `GODKJENT` med `godkjent_belop=100000`. Byggherren godkjenner
  fristen, og saken blir `OMFORENT` og lukket, med utstedbar EO. Det nye kravet
  er aldri besvart, og etter `OMFORENT` kan det ikke besvares.
- Delvis godkjent, TE godtar (sporet blir `GODKJENT`), TE oppdaterer kravet:
  status og `te_akseptert=True` står.
- Trukket krav som oppdateres, står som `TRUKKET` med nytt beløp.
- Godtatt avslag på vederlaget, der grunnlaget er frafalt: TE kan fortsatt
  oppdatere kravet.

**Vedtak 05.10 (3.1):** et oppdatert krav fra TE åpner sporet igjen, og
aksepten faller. Hver oppdatering er en ny kravversjon, også med uendrede
verdier. Et trukket krav kan ikke tas opp igjen; oppdateringen avvises.
Reproduksjonene er
`test_oppdatert_krav_etter_full_godkjenning_venter_paa_nytt_svar`,
`test_oppdatert_krav_etter_aksept_opphever_aksepten` og
`test_trukket_krav_kan_ikke_oppdateres`, den siste med samme oppdatering uten
tilbaketrekking som kontrollsak.

### SK-03 — byggherren kan revidere et godtatt svar (lav)

`RESPONS_*_OPPDATERT` kontrollerer ikke `te_akseptert`, og
`_handle_respons_*` nullstiller den ikke. Forløp (K): delvis 50 000 kr, TE
godtar, byggherren reviderer til 20 000 kr. Sporet blir `DELVIS_GODKJENT` med
`te_akseptert=True`, og TE får «Entreprenør har allerede akseptert» når TE vil
ta stilling. **Vedtak 05.10 (3.1):** revisjonen avvises.
Reproduksjonen er `test_byggherren_kan_ikke_revidere_et_godtatt_svar`, med
samme revisjon før aksepten som kontrollsak.

### SK-04 — frafall som TRUKKET, og UKJENT (lav)

`_respons_til_status` gir `TRUKKET` for frafall, en status som ellers betyr at
TE har trukket kravet. Forløp (K): frafall, vederlag og frist avslått, TE
godtar begge. Sporene er `TRUKKET`, `AVSLATT_AKSEPTERT`,
`AVSLATT_AKSEPTERT`. Ingen regel i `overordnet_status` treffer, og saken blir
`UKJENT`, med «Ingen ventende handlinger». Det er formen `AGENTS.md` advarer
mot. Med vederlag og frist godkjent blir saken `OMFORENT`, mens
`visningsstatus_vederlag` sier «Avventer (pålegg frafalt)». Mengdene i 1.5
forklarer resten: kaskaden ved trukket grunnlag overskriver et godtatt avslag
til `TRUKKET`, og reaktiv EO overskriver det til `GODKJENT`. **Vedtak 05.10
(3.1):** frafall gir grunnlaget en egen sporstatus, `FRAFALT`, som rollupen
regner som avklart grunnlag på linje med godkjent.

### SK-05 — neste handling ved prekludert grunnlag (lav)

Se SK-01. `neste_handling` har grener for grunnlag i `UTKAST`, `SENDT`,
`AVSLATT_AKSEPTERT` og `AVSLATT`, ikke `UNDER_FORHANDLING`. Ført i #255.

### SK-06 — forsering ser bare på fristens eget resultat (lav)

`hent_kandidat_koe_saker`, oppsummeringen av relaterte saker og
`_beregn_avslatte_dager` i `forsering_service.py` bruker
`frist.bh_resultat == "avslatt"`. Et fristkrav som er prinsipalt avslått
gjennom ansvarsgrunnlaget, men der dagene er godkjent subsidiært
(vedtak 05.10 om #168), er ikke kandidat. Delvis avslag teller ikke. Det
samme kandidatsøket tar med saker med `LUKKET_AVSLATT` (#230). Et fjerde sted,
`valider_grunnlag_fortsatt_gyldig`, leser bare `frist.bh_resultat` og melder
«BH har endret standpunkt» når dagene er godkjent subsidiært. Lest.

### SK-07 — subsidiært svar kalt prinsipalt (lav)

`FristForm.svelte` og `VederlagForm.svelte` viser «BH godkjenner kravet
prinsipalt» ut fra `computed.prinsipaltResultat`, som ikke ser på grunnlaget,
rett under meldingen om at grunnlaget er avslått. `overviewStats` summerer
`cached_sum_godkjent` (= `vederlag.godkjent_belop`) under overskriften
«Prinsipalt godkjent · KOE», også når grunnlaget er avslått eller prekludert.
Samme familie som #214, som rettet saksvisningen. Lest.

### SK-08 — `krevd_dager: null` lest som sendt (lav)

`ActionBar.svelte` (`hasFristSubmission`) tester
`store.sak.frist.krevd_dager !== undefined`. API-et sender `null` for et
fristspor uten krav. Da viser linjen «Varslet – ikke spesifisert» i stedet for
«Ikke varslet», TE får «Spesifiser krav» i stedet for «Send fristvarsel», og
byggherren får «Svar på varselet». Lest, ikke kjørt i nettleser mot ekte API.

### SK-09 — `OverordnetStatus` avviker fra backend (lav)

`overordnet_status` er `str` i backend og kan gi `INGEN_AKTIVE_SPOR` og
`UKJENT`. Typen i `timeline.ts` har dem ikke, men har `SENDT`, som backend
aldri lager. `OVERORDNET_STATUS_LABELS` og `OVERORDNET_STATUS_STYLES` er
uttømmende over typen, ikke over backend. `cached_status` kan i tillegg være
`UNDER_VARSLING` (startverdi) og `utstedt`.

### SK-10 — TST-04-reproduksjonen (lav)

`test_tst_04_openapi_spec_mangler_og_er_ikke_i_synk` bruker
`Path("backend/docs/openapi.yaml")`. CI og den lokale kjøringen starter
pytest i `backend/`. Testen er grønn av feil grunn
(`.claude/rules/tester.md`).

### SK-11 — felt uten virkning (lav)

`_handle_respons_vederlag` fyller `bh_metode` fra `vederlagsmetode`
(«legacy»), som ingen klient sender. Skjemaet sender `oensket_metode`, som
lagres og kopieres inn i regelmodulens `Vederlagsvurdering`, men ikke brukes i
noen utregning og ikke projiseres. `akseptert_kategori`,
`ep_justering_akseptert` og `frist_for_spesifikasjon` lagres og leses av
ingen. `validate_vederlag_event` krever varsel ved `inkluderer_rigg_drift` og
`inkluderer_produktivitetstap`, som ingen hendelsesmodell har, og dokumenterer
alternative feltnavn (`nytt_belop_direkte`) som ingen modell kjenner.

### SK-12 — varseldatoen kan flyttes (lav)

`_handle_frist` setter `frist_varsel` fra hvert nytt fristkrav, med mindre et
konsekvensvarsel er registrert. `_handle_vederlag` gjør det samme for
`rigg_drift_varsel` og `produktivitetstap_varsel`. Forløp (K): varsel etter
§ 33.4 med dato 02.09, spesifisering med varseldato 01.08, oppdatering med
01.07. Forretningsreglene godtar begge, og tilstanden viser 01.07. Journalen
beholder 02.09, men skjemaet, visningen og brevet leser tilstanden.
Skjemaet sender varselet på nytt med hvert krav (`fristSubmissionDomain.ts`).
Funnet av kontrollen i egen kontekst. **Vedtak 05.10 (3.1):** datoen og
metoden for et varsel settes én gang, og et senere krav med en annen dato
avvises. Reproduksjonen er `test_varseldatoen_kan_ikke_flyttes_av_et_senere_krav`,
med uendret dato som kontrollsak.

### SK-13 — tilstand utenom `public_state` (lav)

`public_state` sier at hvert svar som bærer en `SakState`, går gjennom den.
Forseringsrutene for byggherrens svar, stopp og kostnader returnerer
`forsering_service._get_updated_state`, som er `state.model_dump(mode="json")`.
Relasjonsvisningene bruker `strip_activity_metadata` på `model_dump()`. Om
forseringsveien har betydning for skjermingen, er ikke vurdert; notatene
ligger ikke lenger i journalen (MS-05). Funnet av kontrollen i egen kontekst.

## 6. Issueregister

Alle åpne issues med `spor-d` på utgangspunktet, uten de nye #255–#263.
«Forsvinner» betyr at målformen i avsnitt 7 gjør feilen umulig; «uansett» at
den må rettes eller avgjøres uansett form.

| Issue | Mønster | Med målformen | Merknad |
| --- | --- | --- | --- |
| #252 | M1 (brevtekst) | uansett | Teksten er partens (T-a) og lages i klienten. Standpunktet fra serveren gir riktig inndata, men nivåene i teksten må rettes i generatoren. Samme fil mangler «Subsidiært» ved § 32.2 i dagavsnittet (1.1) |
| #250 | M1 | forsvinner | Frontenden leser standpunktet i stedet for å regne |
| #246 | M4 (forutsetning) | uansett | Delte konstanter fra `backend/constants/` i frontenden forutsetter at Vite slipper dem gjennom. Ikke en domenefeil |
| #237 | M3 | forsvinner | En modell per varseltype i `FristData` |
| #235 | M1 | uansett, nå avgjort | Vedtak 05.10: kombinasjonen avvises |
| #234 | M1 | forsvinner | Grunnlagsårsaken hører til standpunktet, ikke til svaret |
| #231 | M4 | uansett, nå avgjort | Vedtak 05.10: `LUKKET_TRUKKET` |
| #230 | M1 og M4 | delvis | Kandidatsøket bør lese standpunktet og lukket-settet; SK-06 |
| #229 | M4 | forsvinner | Lukket-settet fra backend |
| #220 | ingen | uansett | Omfanget av § 32.2 er et spørsmål om NS 8407. Teksten i § 32.1–32.3 er nå gitt (vedtaket 05.10), men § 14.6, § 21.4, § 24.2.2 og § 26.3 mangler. Hypotesen plasserer den i M1; regelen ligger alt ett sted |
| #192 | ingen | uansett | Lagring av den låste teksten (B-13 T-a) |
| #189 | ingen | uansett | Delvis godkjenning av fradrag er et spørsmål om NS 8407 |
| #179 | ingen | uansett | Krav på 0 i frist og vederlag. Tekstkopien i `fristBegrunnelse.ts` avviker også (1.3) |
| #175 | M3 | uansett | § 5 og § 33.6.2 b krever avklaring før modellen kan uttrykke dem |
| #142 | ingen | uansett | Ny funksjon (brev ved tilbaketrekking, B-03) |
| #94 | M3 | forsvinner delvis | DM-06: toppnivåfelt i `EOUtstedtEvent`. Hypotesen har den i M2; feilen er at modellen godtar felt utenfor `data` |
| #76 | M2 | forsvinner | SD-04: svaret erstattes helt |
| #69 | ingen | uansett | Ny funksjon (EO etter frafall). Vedtaket 05.10 om #235 bygger på samme ledd, § 32.3 c |
| #64 | M3 og M4 | delvis | Paraply: DRF-02 forsvinner med `extra="forbid"`; SD-02 er #231 |

**Fordelingen.** Forsvinner: #229, #234, #237, #250, #76. Delvis: #94, #230,
#64. Spørsmål om NS 8407 eller tiltenkt atferd: #175, #179, #189, #220, og
#231 til den ble avgjort 05.10. Nye funksjoner: #69, #142, #192. Rettinger
som står for seg: #235 (etter vedtaket 05.10), #246, #252.

**Der hypotesen plasserer issues feil:**
- **#220** står i M1, og **#189** i M3, men begge er spørsmål om innholdet i
  regelen, ikke om hvor den regnes. Regelen for #220 ligger alt ett sted
  (#219). Det samme gjelder #179, som ikke står i hypotesen.
- **#94** (DM-06) står i M2, men feilen er at modellen godtar felt utenfor
  `data`: M3. **#182 og #238** hører til begge: modellen godtok felt som bare
  en annen hendelse skal sette.
- **#187** (lukket) var en kopi av resultatregelen i mockup. Den hører til 1.3,
  der speilet er villet, ikke til M1s spørsmål om grunnlaget.

**Der hypotesen plasserer riktig, men målformen ikke løser alt:** #211 og #252
gjelder brevteksten. Med T-a blir de ikke borte med et standpunkt fra
serveren; de blir lettere.

## 7. Forslag

Avsnittet ble utvidet 05.10 etter en ekstern vurdering av første utkast.
Kodepåstandene i vurderingen er kontrollert (7.1); det som ikke holdt, er
rettet. Spørsmålene den reiste, er besvart av oppdragsgiver og står som vedtak
i hovedplanen 3.1. Resten er forslag under B-14.

**Arbeidsregelen:** uavklart domenespørsmål → avgjørelse → invariant →
bevis-sak → implementasjon. Ingen PR avgjør et spørsmål om NS 8407 i
forbifarten.

### 7.0 Status

**Avgjort** (hovedplanen 3.1, og rekkefølgen i merknaden til B-14 i 3.4):
- rekkefølgen M2, M1, M4, M5, M3, dersom målformene legges til grunn;
- SK-01, SK-02 og SK-03, og #235;
- hver oppdatering fra TE er en ny kravversjon; et trukket krav kan ikke tas
  opp igjen; frafall gir sporstatusen `FRAFALT`; trukket grunnlag før andre
  krav gir `LUKKET_TRUKKET`; avslag sammen med § 32.2 er lovlig, med
  preklusjonen som hovedgrunn;
- datoen for et registrert varsel er låst (SK-12);
- «projeksjonen regner aldri om» gjelder lagrede resultater; standpunkt som
  utledes, regnes med gjeldende regler;
- null-policyen for API-et; et evalueringsendepunkt utredes ikke nå;
- fra før, B-13: backend eier det som lagres med rettsvirkning eller styrer
  systemets handlinger, projeksjonen regner aldri om reglene, og teksten er
  partens (T-a).

**Foreslått, ikke avgjort** (B-14): målformene under, med bindinger mellom
krav, svar og aksept i stedet for en felles tilstandsmaskin; standpunktet fra
serveren; `pending_actions` skilt fra `capabilities`; offentlige DTO-er bare
der formen skiller seg; ingen kontraktstesting med Pact nå.

**Må avgjøres før en bestemt PR:** 7.2.

### 7.1 Kontrollert mot koden

| Påstand i vurderingen | Utfall |
| --- | --- |
| Hendelsesloggen er sannhetskilden for tilstanden | Holder for saken: `compute_state` bygger alt av hendelsene. Ved siden av ligger `cached_*` i metadata (lister og visning; ingen regel leser dem), notater (MS-05, ikke tilstand), godkjenningspakkene til `publish`, og relasjonsprojeksjonen (B-01). L |
| `/api/events` returnerer tilstanden | Holder: svaret har `state` fra `public_state` og `new_version`. L |
| Frontenden lapper tilstanden lokalt etter en innsending | Holder ikke. `submit` i `src/lib/kontraktsbord/context.svelte.ts` henter saken på nytt (`refresh`) og erstatter hele tilstanden, med en versjonsvakt. Bare mockup lapper lokalt. `refresh` henter også tidslinjen, historikken og Catenda-status, som svaret fra `/api/events` ikke har. Den nye hentingen kan derfor ikke bare erstattes av tilstanden i svaret. L |
| Hva `public_state` er | `redact_activity_metadata(...).model_dump(mode="json")`, uten `exclude_none`. Den er ikke det ene stedet docstringen sier: forseringsrutene og relasjonsvisningene serialiserer selv (SK-13). L |
| `BusinessRuleValidator` kan deles i regler for tilstand og for nyttelast | Holder. 29 av 33 registrerte regler leser bare tilstanden, hendelsestypen, sporet og rollen. Fire leser nyttelasten: `CREATE_ONCE` (bare unntaket for rent varsel), `RESPONSE_REFERENCE`, `CLAIM_REFERENCE` og `COMPUTED_RESULT`; i tillegg varselkontrollen i `validate` (`NOTICE_TRACK`). Kjørt som AST-skript. Delingen er en merking av reglene, ikke en omskriving |
| `krav_event_id` og `respons_event_id` er autoritative | Delvis. Begge settes for alle tre sporene, og `RESPONSE_REFERENCE` sammenlikner svarets referanse med `krav_event_id`. Men koblingen mellom svar og kravversjon går gjennom tall (`bh_respondert_versjon` mot `antall_versjoner`), og aksepten har ingen referanse. L |
| Hvilke felt frontenden sender | Fixturen `skjemaenes_nyttelast.json`, som frontendens byggere skriver: fristsvaret sender `auto_begrunnelse` og `krevd_dager`, vederlagssvaret `auto_begrunnelse`. Ingen av dem finnes i modellene. K |
| Avslag sammen med `grunnlag_varslet_i_tide=false` | Godtas. Grunnlaget blir `UNDER_FORHANDLING`, og `neste_handling` går videre til vederlaget (SK-05). K |
| `visningsstatus_*` og `neste_handling` leverer norsk tekst | Holder. L |

### 7.2 Beslutningsport per PR

Hvert spørsmål avgjøres som én forventet atferd og ett eksempelforløp, og
forløpet blir bevis-saken.

| PR | Må være avgjort først | Status |
| --- | --- | --- |
| M2 PR 1–3 | hva som er en ny kravversjon; trukket krav som oppdateres | avgjort 05.10 |
| M2 PR 4 | status ved trukket grunnlag (#231) | avgjort 05.10 |
| M2 PR 5 | status ved frafall (SK-04) | avgjort 05.10 |
| M1 PR 1–2 | flere grunner samtidig (avslag og § 32.2); regelversjonen for standpunkt som utledes ved lesing | avgjort 05.10 |
| M1 PR 4 og videre | omfanget av § 32.2 (#220), for så vidt standpunktet avhenger av det | åpent; teksten til § 14.6, § 21.4, § 24.2.2 og § 26.3 mangler |
| M3, svarmodellene | delvis godkjenning av fradrag (#189); § 5 og § 33.6.2 b (#175) | åpent |
| — | krav på 0 (#179) | åpent; blokkerer ingen PR i planen |

### 7.3 Bevis-saker

- Utgangspunktet er de ni strenge `xfail`, de fire `it.fails` og
  kontrollsakene, navngitt med funn-ID eller issue.
- De løftes fra forretningsreglene og projeksjonen til HTTP (`/api/events`)
  og godkjenningsflyten (`ApprovalService.validate_items`) før M2 PR 2. Ingen
  av dem er kjørt der i dag.
- Mangler: SK-05 (kjørt, uten test), SK-08 (lest; trenger en komponenttest)
  og forløp B i 1.1 på backendsiden.
- Kontrakts- og gylne tester av hele `public_state` for 5–10 representative
  saker. Felt, typer og nullverdier dekkes av generatoren i M5a.
- En bevis-sak endres bare når et vedtak endrer forventet atferd, i egen PR
  med vedtaket som kilde. En refaktorering endrer ikke atferd uten at en
  bevis-sak viser det.

### M2 — sporstatus avledet av krav, svar og aksept

**Orkestratorens alternativ:** en eierskapstabell for feltene, håndhevet av en
test. **Holder, men er ikke nok.** Tabellen fanger at en hendelse skriver et
felt den ikke eier. Men feilene i SK-01–SK-04 ligger i felt som er avledet og
skrives av mange: `status` og `te_akseptert`. Dem kan ingen tabell gi én eier.

**Målform.** Hvert spor holder tre referanser og innholdet de peker på:
gjeldende krav, svaret og aksepten. Bindingen er eksplisitt, ikke «siste
hendelse vinner»: svaret peker på kravets `event_id`, aksepten på svarets.
`status` og `te_akseptert` regnes ved lesing:
- et krav uten svar på gjeldende versjon venter på svar;
- et svar på gjeldende versjon gir resultatets status;
- en aksept av gjeldende svar gir `GODKJENT` eller `AVSLATT_AKSEPTERT`, og ved
  § 32.2-preklusjon `AVSLATT_AKSEPTERT`;
- et nytt krav gjør svaret og aksepten til historikk.

**Hva som er en ny kravversjon,** avgjøres i én funksjon i `backend/regler/`
(for eksempel `er_ny_kravversjon`), med tabellen som data. Ingen andre steder
tolker hendelsestypen. Etter vedtakene 05.10 gir hver `vederlag_krav_*` og
`frist_krav_*` som ikke er et rent varsel, en ny versjon, også med uendrede
verdier. Konsekvensvarsler, innsigelse og forespørsel gjør det ikke. En
oppdatering av et trukket krav avvises.

Svaret erstattes helt, fordi alle nye svar er fulle (avsnitt 3). Det fjerner
`_copy_fields_if_present` fra svarhandlerne og dermed SD-04. Ikke lag én stor
`SporStatus` for alle kombinasjoner: den regnes av de tre referansene.

**Erstatter:** overgangene i `_handle_vederlag`, `_handle_frist`,
`_handle_respons_*`, `_handle_te_aksepterer_respons` og
`_status_etter_aksept`. Projeksjonen regner fortsatt aldri om reglene
(B-13): den leser resultatet som er lagret.

**PR-er:**
1. Eierskapstabellen som data, og en test som kjører hver hendelsestype og
   feiler når et felt utenfor tabellen endres. Avvikene i dag står i tabellen
   som kjente unntak med funn-ID.
2. Aksepten bindes til svaret (`akseptert_respons_id`), og forretningsreglene
   avviser revisjon av et godtatt svar (SK-03).
3. Sporstatus avledes ved lesing for vederlag og frist, med
   `er_ny_kravversjon`, avvisning av oppdatert trukket krav (SK-02, #76) og
   låste varsler (SK-12).
4. Grunnlaget samme vei, med preklusjonen (SK-01, SK-05) og
   `LUKKET_TRUKKET` ved trukket grunnlag (#231).
5. `FRAFALT` som sporstatus (SK-04), med regelen i `AGENTS.md` om å lete opp
   alt som teller statuser.

SK-01 og SK-04 får kontrollsaker før PR 4 og 5: et godtatt avslag uten
preklusjon, og frafall med godkjente svar, skal virke som før.

**Frontend:** ingen endring utover at feltene får riktige verdier, og
`FRAFALT` i de uttømmende kartene.

### M1 — standpunktet per spor fra serveren

**Orkestratorens alternativ:** backend regner ut ett standpunkt per spor og
sender det i API-et; brev, fullmakt og visning leser det. **Holder, med to
presiseringer.**

1. Standpunktet lagres ikke. Vedtaket 05.10 under B-13 sier at det utledes av
   grunnlaget. Det er en verdi i tilstanden, regnet ved lesing, ikke et felt i
   svaret. Grunnlagstriggerne tas ut av det lagrede svaret (#234).
2. Brevet og fullmakten kan ikke lese tilstanden alene. En pakke kan ha et
   grunnlagssvar som ikke er sendt ennå (`basis`, `effectiveGrunnlag`).
   Funksjonen tar derfor grunnlaget som argument, ikke tilstanden.

**Målform.** `regler.grunnlag.standpunkt(grunnlag, spor) -> Standpunkt`. I
første PR har den `subsidiaert: bool`, `hovedgrunn` og `arsaker` (en mengde av
«avslått» og «prekludert»). Flere grunner samtidig finnes alt: tabell 1.1 har
to prioriteringer, og vedtaket 05.10 gjør avslag sammen med § 32.2 lovlig med
preklusjonen først. Prioriteringen defineres i `backend/regler/` og speiles
i `src/lib/domain/` under regelversjonsvakten, fordi brevteksten lages i
klienten (T-a) og et evalueringsendepunkt ikke utredes nå. Det er to steder,
men ett av dem er fasit. Komponentene og skjemaene eier bare presentasjonen. Resultatfeltene (prinsipalt og
subsidiært) legges til når en forbruker trenger dem. Funksjonen leser
`subsidiaert_til_nytt_svar` og tar frafall med etter vedtakene 05.10.
`SakState` eksponerer `standpunkt_vederlag` og `standpunkt_frist`.
`er_subsidiaert_*` beholder navnet eller får et som sier «subsidiær enighet»
(1.2).

**Erstatter:** `_subsidiaer_grunn`, `grunnlag_er_subsidiaert` i fullmakten,
`decision_summary`s egen avgjørelse, `svaretErSubsidiaert`,
`grunnlagTriggers`, `grunnlagetErPrekludert` og deler av `bhStandpunkt` i
`derive.ts`, og forseringens kandidatsøk (SK-06).

**Hva som blir veiledning, og hva som må være igjen.** Visningen (`derive.ts`,
oversiktene, `LeftSidebar`, `CenterRead`) leser standpunktet og regner ikke.
Skjemaet og brevteksten må fortsatt regne for et svar som ikke er sendt: de
viser et forslag før serveren har sett det, og teksten er byggherrens (T-a).
Der blir `erGrunnlagetSubsidiaert` stående som speil under
regelversjonsvakten; et evalueringsendepunkt utredes ikke nå (vedtak 05.10).
Frontenden kan forhåndsvise, men fastsetter aldri autoritativ tilstand eller
lovlige overganger. Fullmakten i frontenden (`authority.ts`, `letter.ts`) kan
lese pakkens standpunkt fra serveren, fordi pakken alltid går gjennom
`prepare`.

**PR-er:**
1. `standpunkt` i `backend/regler/` med testsettet fra `grunnlagDomain.test.ts`
   og en ny bevis-sak med avslag og § 32.2 samtidig. `SakState` eksponerer det.
   Ingen endring i atferd.
2. Brevet og fullmakten bruker det. Avvisningen av frafall med preklusjon
   (#235) kommer i samme runde.
3. Saksvisningen bruker det (#250, SK-07 for oversikten).
4. Triggerne ut av det lagrede fristsvaret (#234). Ny regelversjon.
5. Forseringen (SK-06, #230).

**Forhold til B-13.** Backend eier standpunktet, som styrer systemets
handlinger. Teksten er fortsatt partens (T-a). Standpunktet regnes ved lesing
med gjeldende regler, og en senere regelendring (for eksempel #220) endrer det
også i gamle saker. Det samme gjelder «godtatt preklusjon» i M2. Vedtaket
05.10 (3.1) presiserer at «projeksjonen regner aldri om» gjelder de lagrede
resultatene, og at en regelendring som endrer gamle saker, skal si det og
krever eget vedtak.

### M4 — statusmengder, `pending_actions` og `capabilities`

**Orkestratorens alternativ:** mengdene ligger i backend og eksporteres slik
`frist_foresporsel.json` gjør. **Holder, men dekker bare halve mønsteret.**
Den andre halvdelen er de to rollupene for neste handling. Forutsetningen for
eksporten er #246: importen fra `backend/constants/` feiler i `vite dev` (K i
#246).

**Målform.**
- En enum for samlet status i backend (i dag `str`), med `lukket` som
  egenskap, og én mengde for «inaktiv» og én for «ferdig» spor, eksportert
  som JSON.
- `pending_actions`: hva noen må gjøre, som
  `{type, target_id, eligible_roles, metadata}` med maskinelle typer. Rollen
  er ikke en del av oppgavens identitet; `neste_handling_rolle` blir
  `eligible_roles`. Erstatter `neste_handling` (i dag en `dict`) og
  `caseFollowUp`.
- `capabilities`: hva denne rollen kan gjøre nå. Ikke et nytt regelsett. Den
  evaluerer tilstandsreglene i `BusinessRuleValidator` for (tilstand, rolle,
  hendelsestype, spor), uten nyttelast; en innsending evaluerer i tillegg
  nyttelastreglene. Én regelkilde, to evalueringer (7.1). Forretningsreglene
  er ikke de eneste portene: godkjenningspolicyen (`public_event_block_reason`,
  403 `APPROVAL_REQUIRED`) og kontraktsrollen (`require_contract_role`) må
  med. Ellers sier `capabilities` at byggherren kan sende et svar som
  avvises i et prosjekt med policy.
- Ingen norsk tekst i domenemodellen. `visningsstatus_*` og `neste_handling`
  blir koder, og teksten flyttes til frontenden. Catenda-kommentaren er
  presentasjon i integrasjonslaget og kan beholde tekst, men leser kodene.

**Rekkefølge:** etter M2, fordi alt dette leser den avledede statusen.

**PR-er:** 1) enum og eksport (SK-09); 2) frontendens lukket-sett (#229);
3) mengdene i kaskadene og reaktiv EO (SK-04); 4) reglene merkes som
tilstand eller nyttelast; 5) `capabilities`; 6) `pending_actions` erstatter
`neste_handling` og `caseFollowUp`.

### M5 — kontrakten, i to deler

**Orkestratorens alternativ:** genererte frontendtyper. **Holder** for
lesesiden, og deles i to.

**M5a, kontraktshygiene.** `src/lib/types/generated/` fra Pydantic etter
null-policyen (vedtak 05.10): `X | null` i tilstanden, valgfrie felt i
tidslinjens hendelser. En CI-sjekk som feiler ved diff. `timeline.ts`
re-eksporterer de genererte typene der de finnes. `overordnet_status` som enum
(SK-09), `ActionBar` (SK-08), manglende felt, og TST-04 (SK-10). Kostnaden er
anslått i avsnitt 4.

**M5b, DTO-grense.** Eksplisitte offentlige typer bare der intern og offentlig
form skiller seg: `Standpunkt`, `Capabilities`, `PendingAction`. `public_state`
får en eksplisitt returtype som første steg. Mapperen skrives felt for felt,
så et nytt påkrevd felt knekker den med én gang, og en test viser at alle
påkrevde offentlige felt leveres. Alle svar med tilstand går gjennom den,
også forseringsrutene og relasjonsvisningene (SK-13). Svaret fra
`/api/events` mangler tidslinjen, historikken og Catenda-status som `refresh`
henter, så den nye hentingen blir stående til svaret har dem (7.1).

**Ikke nå:** kontraktstesting med Pact. OpenAPI eller JSON Schema, genererte
typer og endepunktstester er nok så lenge backend og frontend slippes
sammen. Egne endepunkter per domenekommando er også utenfor planen:
hendelsestypene er kommandoene, og fixturen `skjemaenes_nyttelast.json`
vokter dem gjennom `/api/events`.

**PR-er:** M5a: 1) generatoren og CI-sjekken for `SakState` og tilstandene;
2) stedene `check:error` da viser (SK-08 og resten av null-avvikene);
3) tidslinjens hendelsesdata; 4) skrivesiden. M5b: 5) returtype for
`public_state` og alle svar gjennom den (SK-13); 6) de offentlige typene fra
M1 og M4; 7) svaret fra `/api/events` med det `refresh` trenger.

### M3 — datamodellen for hendelsene, løpende

**Orkestratorens alternativ:** en datamodell per varseltype. **Holder for
`FristData`, ikke som generell form** (avsnitt 3).

**Fast rekkefølge for hvert felt som ryddes:** frontenden slutter å sende
feltet; en test gjennom HTTP bekrefter det; `extra="forbid"` slås på;
feltet fjernes fra modellen. Først ut er `auto_begrunnelse` og `krevd_dager`
i svarene (7.1).

**PR-er:** 1) `FristData` som diskriminert union (#237); 2) delvis-semantikken
fjernes fra svarmodellene, sammen med M2 PR 3; 3) felt uten virkning
(SK-11); 4) `extra="forbid"` etter rekkefølgen over (DRF-02);
5) `api/validators.py` krymper til det modellene ikke kan uttrykke.

### 7.4 Hvem eier hva

| Spørsmål | Eier |
| --- | --- |
| Hva skjedde? | Hendelsesloggen |
| Hvilken tilstand følger av det? | Projeksjonen (`sak_state.py`, `timeline_service.py`). Leser lagret resultat og regner aldri om reglene (B-13) |
| Hvilket krav, svar og aksept hører sammen? | Bindingene i M2 |
| Hva er tillatt etter kontrakten? | Backend: `backend/regler/` og forretningsreglene |
| Hva må noen gjøre? | `pending_actions` |
| Hva kan rollen gjøre nå? | `capabilities`, utledet av forretningsreglene |
| Hvordan eksponeres det? | Offentlige typer (M5b) |
| Hvordan presenteres det? | Frontenden |
| Forslag før sending | Frontenden, med speilet under regelversjonsvakten |
| Beslutningslinjen i brevet | Serveren (`decision_summary`), etter vedtaket 05.10 under B-13 (#168) |
| Begrunnelsesteksten i brevet | Parten (T-a): lages i klienten og lagres (#192) |

### 7.5 Ikke gjør

- Én stor `SporStatus` for alle juridiske kombinasjoner, eller et generelt
  rammeverk for tilstandsmaskiner.
- Frontend som fastsetter autoritativ tilstand eller lovlige overganger.
- Et API som eksponerer `SakState` rått etter M5b.
- Norsk tekst i domenemodellen.
- Pact nå.
- Omskriving av historiske hendelser etter produksjonssetting.
- En refaktorering som avgjør et uavklart spørsmål om NS 8407.

### 7.6 Sekvens

0. Beslutningsporten (7.2). Avgjort for M2 og M1 PR 1–2.
1. Bevis-sakene løftet til HTTP og godkjenning (7.3).
2. M2 PR 1–5.
3. M1.
4. M4, med merkingen av reglene før `capabilities`.
5. M5a, deretter M5b.
6. M3 løpende, med rekkefølgen per felt.

### 7.7 Før første produksjonssetting

Utenfor spor D, men ført her så det ikke glemmes. Hører til F5 og B-10.

- **Nå:** `extra="forbid"` på `*Data`, døde felt ut, strengere skrivemodeller
  (M3). Appen har ingen reelle data, så det koster ingen migrering.
- **Før produksjon:** versjonering av hendelsene med oppgradering til
  gjeldende modell, tolerant lesing av historiske hendelser, tester som
  bygger dagens tilstand av representative hendelsesstrømmer, og en strategi
  for migrering og bevaring (B-05). Kravene gjelder fullt, fordi tilstanden
  regnes av loggen (7.1).

## Verifikasjon og grenser

**Kjørt.** Backend-suiten før arbeidet: 2 296 bestått, 9 hoppet over,
36 `xfail` (K 2026-10-05, PostgreSQL 17 i Docker). De ni nye reproduksjonene
er strenge `xfail` og feiler på målassertionen med `--runxfail`. SK-03, SK-12,
#235 og testen for trukket krav (SK-02) har kontrollsaker som består. SK-01
og SK-04 har ikke kontrollsak ennå (7.3). Kontrollene
i 7.1 er gjort etter den eksterne vurderingen: to er kjørt (fixturen og
kombinasjonen avslag og § 32.2), ett er et AST-skript over
forretningsreglene, resten er lest. De fire `it.fails` feiler på målassertionen når
de kjøres som vanlig `it`. Alle forløp i avsnitt 1 og 5 som er merket K, er
kjørt gjennom forretningsreglene og projeksjonen, ikke gjennom HTTP, lagring
eller godkjenningsflyten.

**Avvist eller nyansert fra agentene.** Agenten for M5 leste Vite-koden slik
at importen fra `backend/constants/` virker i `vite dev`; #246 og #253 er
observert motsatt, og det observerte gjelder. Samme agent fant at
`SakState.dagmulktsats` alltid er `undefined` mot ekte API; det stemmer, men
feltet brukes bare i demoen (`demoDailyRate`), så det er ikke ført som funn.
Triggerlistene i `FristForm` og `VederlagForm` som legger til grunnlagsårsaken,
er kontrollert: de er bare visning (`PositionExplanation`) og sendes ikke.
AST-skriptet tilla `_apply_konsekvensvarsler` skriving i grunnlaget; den
skriver bare vederlag og frist, og tabellene i avsnitt 2 er rettet for hånd.

**Ikke kontrollert.**
- Ingenting er kjørt i nettleser. SK-07 og SK-08 er lest.
- Forseringen (SK-06) og `ForseringVarselData` er lest, ikke kjørt.
- Godkjenningsflyten er ikke kjørt for forløpene; brev og fullmakt er prøvd
  ved å kalle `grunnlag_er_subsidiaert` og `decision_summary` med serverens
  `basis`.
- De 58 sammenlikningene med `undefined` er ikke gjennomgått hver for seg.
- Anslagene for M5 er ikke prøvd.
- Om en bestridt EO skal gi byggherren en oppgave (1.5), er ikke prøvd.
- `docs/NS_8407.md` finnes ikke i containeren. Teksten i § 31.3 og § 32.1–32.3
  kom fra oppdragsgiver 05.10 og er ikke committet.

**Kontroll i egen kontekst.** En agent uten denne konteksten leste
dokumentet mot koden 05.10 (det første forsøket stoppet på en kvote). Den
kjørte reproduksjonene, forløpene A–C, SK-01, SK-02 og tellingene, og leste
minst én rad i hver tabell. Hovedfunnene SK-01–SK-05, forløpstabellen,
issueregisteret og AST-tellingen i 7.1 holdt. Rettet etter kontrollen:
- «første varsel vinner» i 2.2 og 2.3 var feil; siste krav vinner. Det ga
  SK-12 (K), vedtaket om låste varsler og en ny reproduksjon.
- `public_state` er ikke det ene stedet tilstanden serialiseres (SK-13).
- `refresh` henter mer enn tilstanden; M5b er rettet.
- SK-06 manglet et fjerde sted, `valider_grunnlag_fortsatt_gyldig`.
- #189 står i hypotesen (M3); hypotesen plasserer fire issues feil, ikke tre.
- Rekkefølgen er avgjort i merknaden til B-14 i 3.4, ikke i 3.1.
- Mindre: 0-dagersteksten står i beregningsavsnittet; `OMFORENT` gir
  «Omforent» i Catenda; `FristTilstand` har `krav_event_id`; `oensket_metode`
  brukes ikke i noen utregning; frontendkolonnen i forløp A og C er lest.
- M1 og M2 regner ved lesing med gjeldende regler, i spenning med vedtaket
  om regelversjon. Oppdragsgiver presiserte vedtaket 05.10 (3.1).
- `capabilities` må ta med godkjenningspolicyen og kontraktsrollen.
- Målassertionen i SK-04 var for svak (`!= "UKJENT"`); den krever nå en
  lukket status, etter vedtaket om `FRAFALT`.

Avvist: kontrollen mente at `validate_respons_event` bare gjelder første svar.
`validate_event_data` fjerner `_oppdatert` før oppslaget, så reviderte svar
går gjennom samme kontroll (L, `api/validators.py`).

Kontrollen leste ikke 1.6, 2.5, `ForseringVarselData` eller
`EOUtstedtData`, og kontrollerte ikke påstandene om `generate_openapi.py`,
`state_drift` og `/api/cloudevents/schemas`.
