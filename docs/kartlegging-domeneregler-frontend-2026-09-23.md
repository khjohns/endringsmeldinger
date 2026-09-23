# Kartlegging: frontendens NS 8407-regler og det som lagres — 2026-09-23

**Dato:** 2026-09-23, mot `05b3aa7` (`main`).
**Forrige ledd:** [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
B-13 i avsnitt 3.4 og BR-01 i funnregisteret.
[Oppdraget](prompt-spor-d-br01-2026-09-23.md), del 1.
**Reproduksjonene:**
[`test_beregningsresultat_br01_20260923.py`](../backend/tests/test_security/test_beregningsresultat_br01_20260923.py).

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

Dokumentet er grunnlag for B-13. Det avgjør ikke B-13 og retter ingenting.
Det er skrevet for en jurist: hva frontenden regner ut, hvilken bestemmelse
utregningen bygger på, og hva som står i journalen hvis klienten sender noe
annet enn utregningen ville gitt.

## Sammendrag

Frontenden har 3 783 linjer TypeScript i `src/lib/domain/`: 2 436 i
regelfilene og 1 347 som skriver begrunnelsestekst. Reglene avgjør
preklusjon, reduksjon, godkjent beløp og antall dager, prinsipalt og
subsidiært resultat og hvilke subsidiære grunner som gjelder. Resultatene sendes med i hendelsen.

**Backend regner ingen av dem ut på nytt og kontrollerer ingen av dem.** Den
lagrer det klienten sender. Det er kjørt for BHs resultat på vederlag og frist
(BR-01, K 23.09). For de øvrige feltene er det lest (L): serveren validerer at
feltet finnes og har gyldig verdi, ikke at det følger av de andre feltene.

Konsekvensen er at journalen kan bære et BH-svar som motsier seg selv, og at
systemet handler på konklusjonen alene. Et fristsvar med «ingen
fremdriftshindring» og resultatet «godkjent» gjør sporet `GODKJENT`, saken
`OMFORENT` og en endringsordre utstedbar (K 23.09).

Kartleggingen fant i tillegg tre feil i grensesnittet mellom frontend og
backend (DRF-01–DRF-03). Den alvorligste er at byggherrens forespørsel etter
§ 33.6.2 ikke kan sendes fra skjemaet.

## Funn

| ID | Alvorlighet | Funn | Belegg |
| --- | --- | --- | --- |
| BR-01 | Middels | BHs `beregnings_resultat` lagres som sendt, også når vurderingene i samme svar gir et annet resultat. Sporstatus, samlet status og EO-adgang følger konklusjonen | K 23.09 |
| DRF-01 | Middels | Byggherrens forespørsel om spesifisert fristkrav (§ 33.6.2) avvises med 400 når den sendes fra skjemaet. Frontenden sender `send_foresporsel`, backend kjenner bare `har_bh_foresporsel` | K 23.09 |
| DRF-02 | Lav | Felt med rettslig innhold forsvinner uten feilmelding: `dager_siden_varsel` (§ 32.3), `ep_justering_varslet_i_tide` (§ 34.3.3) og `er_svar_pa_foresporsel` (§ 33.6.2 fjerde ledd). I dag latent, fordi skjemaene ikke fyller dem | K 23.09 (parser), L (skjemaene) |
| DRF-03 | Middels | TEs varsel om justerte enhetspriser (§ 34.3.3) lagres med sendedato lik oppdagelsesdatoen for forholdet, ikke datoen varselet ble sendt | L 23.09 |

### BR-01: resultatet lagres som sendt

`services/timeline_service.py`, `_handle_respons_vederlag` og
`_handle_respons_frist`: `beregnings_resultat` kopieres til `bh_resultat`, og
`_beregnings_resultat_til_status` gjør det til sporstatus. Ingen av lagene før
kontrollerer resultatet mot vurderingene:

| Lag | Symbol | Hva det kontrollerer |
| --- | --- | --- |
| API-validator | `api/validators.py`, `validate_respons_event` | At `beregnings_resultat` finnes; for frist også `spesifisert_krav_ok` og `vilkar_oppfylt` |
| Modell | `models/events.py`, `VederlagResponsData`, `FristResponsData` | Gyldig enumverdi; at resultatet finnes i et nytt svar |
| Forretningsregler | `services/business_rules.py`, `RESPONS_VEDERLAG`, `RESPONS_FRIST` | At kravet er sendt, at svaret gjelder gjeldende krav, at BH ikke allerede har svart |
| Godkjenningsflyten | `services/approval_service.py`, `validate_items` | De samme tre lagene, pluss at ansvarsgrunnlaget ikke er endret |

**Kjørt og observert (23.09).** Fire strenge `xfail`-tester, alle med ekte
validator, parser, forretningsregler, hendelseslager og tidslinje. Hvert svar
sendes først med riktig resultat på en kontrollsak, som lagres; resultatet er
dermed det eneste som skiller:

- Vederlagssvar via `/api/events`: hovedkravet avslått, 0 kr godkjent,
  resultat «godkjent». Svar 201; sporet lagres med `bh_resultat=godkjent`,
  `status=GODKJENT`, `godkjent_belop=0.0`.
- Fristsvar via `/api/events`: `vilkar_oppfylt=false`, resultat «godkjent».
  Svar 201; `bh_resultat=godkjent`, `status=GODKJENT`.
- Samme vederlagssvar gjennom godkjenningsflyten
  (`/api/cases/<sak>/approvals`: `prepare`, `package`, `publish`). Pakken
  publiseres; sporet blir `GODKJENT`, og det frosne brevet sier «godkjent».

- Begge svarene på samme sak: `overordnet_status=OMFORENT` og
  `kan_utstede_eo=True`, for en sak der BH har avslått alt i vurderingene.

En midlertidig avvisning av svarene i validatoren gjorde alle fire til XPASS,
så testene fanger også en retting etter alternativ (2) (K 23.09, mutasjon,
ikke committet).

**Alvorlighet: middels.** Svaret binder den som sender det; ingen part kan
endre motpartens standpunkt på denne måten. Men journalen har juridisk vekt,
og en selvmotsigende hendelse kan ikke rettes, bare avløses av et nytt svar.
Risikoen er størst ved versjonsforskjell mellom frontend og backend eller
ved en klient som er endret. Et resultat «avslått» der vurderingene gir
«godkjent» åpner forsering etter § 33.8, fordi `ForseringService` leser
`frist.bh_resultat` (L).

### DRF-01: forespørselen etter § 33.6.2 når ikke journalen

`src/lib/domain/fristDomain.ts`, `buildEventData`: når BH krysser av for
forespørsel, sendes `send_foresporsel: true` og `beregnings_resultat:
"avslatt"`. `FristResponsData` har ikke feltet `send_foresporsel`, men har
`har_bh_foresporsel`, som tidslinjen kopierer til sporet og TEs skjema leser
(`TeFristForm.svelte`). Frontenden sender aldri `har_bh_foresporsel`.

Valget vises bare for et nøytralt varsel (§ 33.4). Da er spørsmålene om
spesifisert krav og vilkår skjult og står som `undefined`, og JSON utelater
dem. `validate_respons_event` krever begge og avviser svaret med
`400 spesifisert_krav_ok er påkrevd` (K 23.09, streng `xfail`). Godkjenningsflyten
kaller samme validator (L).

Følgen er at byggherren ikke kan bruke systemet til å utløse virkningen i
§ 33.6.2 tredje ledd: at TEs krav tapes hvis TE ikke svarer. TEs skjema for
svar på forespørsel (scenarioet `foresporsel`) kan heller ikke nås, fordi
skjemaene aldri setter `har_bh_foresporsel`. Ingenting feil lagres; handlingen
lar seg bare ikke gjøre.

To forhold må avgjøres før rettingen, og de henger sammen med TFR-06:

1. Hvordan en forespørsel skal registreres. Frontenden sender den som et
   avslag. Blir den lagret slik, blir sporet `AVSLATT`, og forsering etter
   § 33.8 åpnes på et krav byggherren ikke har tatt stilling til.
2. TFR-06 er at BH kan svare fullt ut på et nøytralt varsel. Rettes det med
   en sperre, må sperren slippe forespørselen gjennom.

*Merknad 2026-09-23 (senere samme dag):* avgjort av oppdragsgiver.
Forespørselen blir en egen handling som ikke gjør sporet avslått og ikke åpner
forsering; se [hovedplanen, 3.1](plans/2026-09-16-godkjenning-og-varig-levering.md#31-vedtatte-premisser-og-beslutninger).

### DRF-02: felt som forsvinner uten feilmelding

Svarmodellene har Pydantics standard `extra="ignore"`. Et felt modellen ikke
kjenner, fjernes ved parsing uten feil (K 23.09, parset direkte):

| Hendelse | Felt frontenden sender | Bestemmelse | Modellen har |
| --- | --- | --- | --- |
| `respons_grunnlag` | `dager_siden_varsel` (`grunnlagDomain.buildEventData`) | § 32.3 annet ledd, passivitet | Ingenting |
| `respons_vederlag` | `ep_justering_varslet_i_tide` (`vederlagDomain.buildEventData`) | § 34.3.3 første ledd | `varsel_justert_ep_ok` |
| `frist_krav_spesifisert` | `er_svar_pa_foresporsel` (`fristSubmissionDomain.buildEventData`) | § 33.6.2 fjerde ledd | Ingenting |

I dag er alle tre latente (L). Skjemaet for grunnlagssvar får konfigurasjonen
fra `deriveGrunnlagDomainConfig`, som ikke tar med `dato_varslet`, så
`dager_siden_varsel` blir alltid 0 og sendes ikke. `VederlagForm.svelte` har
ikke § 34.3.3-spørsmålet i skjematilstanden. Og `er_svar_pa_foresporsel`
bygger på `har_bh_foresporsel`, som DRF-01 hindrer. Retter man DRF-01 eller
kobler inn spørsmålene, forsvinner svarene.

Harmløse felt som også fjernes: `auto_begrunnelse` (kopi av `begrunnelse`),
`krevd_dager`, `dato_endret`, `vurdering_begrunnelse` og TEs `vilkar_oppfylt`.

### DRF-03: sendedatoen for § 34.3.3-varselet

`src/lib/domain/vederlagSubmissionDomain.ts`, `buildEventData`: krever TE
justerte enhetspriser, settes `justert_ep_varsel.dato_sendt` til
`grunnlag.dato_oppdaget` (kalt med den verdien fra `TeVederlagForm.svelte`).
Modellen beskriver feltet som «når varselet faktisk ble sendt til BH»
(`VarselInfo.dato_sendt`). Backend lagrer datoen uendret (L).

§ 34.3.3 første ledd krever varsel «uten ugrunnet opphold». Journalen sier da
at varselet ble sendt den dagen forholdet ble oppdaget, uansett når det ble
sendt. Etter § 5 tredje ledd anses et varsel som rettidig hvis mottakeren ikke
innvender det motsatte uten ugrunnet opphold. En dato som ser rettidig ut, kan
dermed få byggherren til å la være å innvende. Det faktiske tidspunktet står i
hendelsens `tidsstempel`, som serveren setter, så det lar seg rekonstruere.

## Hvordan tabellene leses

Gruppene er de oppdraget ber om:

- **Veiledning:** hvilke spørsmål som vises, standardverdier, hjelpetekst,
  varsler og sperrer i skjemaet. Resultatet sendes ikke.
- **Lagres med rettsvirkning:** resultat, beløp, dager, preklusjon, reduksjon,
  subsidiært standpunkt, varseldatoer og begrunnelsestekst.
- **Styrer systemets handlinger:** verdier backend bruker til å bestemme hva
  systemet gjør: sporstatus, samlet status, EO-adgang, forsering, fullmakt.

«Journalen» er hendelsen slik den ligger i hendelsesloggen. «Tilstanden» er
det tidslinjen regner ut av journalen (`SakState`). Der ikke annet står, er
svaret på «hva står i journalen hvis klienten sender noe annet» det samme:
**klientens verdi, uendret.**

## Gruppe 2: lagres med rettsvirkning

### Byggherrens svar på fristkrav (§ 33), `fristDomain.ts`

| Utregning | Hva den avgjør | Bestemmelse | Sendes som | Backend | Belegg |
| --- | --- | --- | --- | --- | --- |
| `beregnPreklusjon` | Om fristkravet er tapt fordi varselet kom for sent, eller fordi TEs svar på en forespørsel kom for sent | § 33.4 annet ledd; § 33.6.2 tredje ledd; § 5 | Indirekte: `beregnings_resultat="avslatt"` og `subsidiaer_triggers=["preklusjon_varsel"]`. Grunnlaget sendes som `frist_varsel_ok`, `foresporsel_svar_ok` | Lagrer grunnlaget og resultatet. Regner ikke ut preklusjon | L |
| `beregnReduksjon` | Om kravet er begrenset til det BH «måtte forstå», fordi spesifiseringen kom for sent | § 33.6.1 annet punktum | `subsidiaer_triggers=["reduksjon_spesifisert"]`; grunnlaget som `spesifisert_krav_ok` | Lagrer. Regner ikke ut | L |
| `beregnPrinsipaltResultat` | Prinsipalt resultat: avslått ved forespørsel, preklusjon eller ingen hindring; ellers godkjent ved minst 99 % av krevde dager, delvis ellers | § 33.1 (hindring), § 33.4, § 33.5 | `beregnings_resultat` | Kopieres til `bh_resultat` og sporstatus | **K 23.09 (BR-01)** |
| `beregnSubsidiaertResultat` | Resultatet hvis preklusjonen ikke holder | § 33.1, § 33.5 | `subsidiaer_resultat` | Kopieres | L |
| `beregnSubsidiaerTriggers` | Grunnene til subsidiær behandling | § 33.4, § 33.6.1, § 33.1; grunnlag avslått | `subsidiaer_triggers` | Kopieres. Verdiene må være gyldige koder, logikken kontrolleres ikke | L |
| `buildEventData` | Godkjente dager settes til 0 når prinsipalt resultat er avslag; subsidiære dager lik de vurderte | § 33.5 | `godkjent_dager`, `subsidiaer_godkjent_dager` | Kopieres. `godkjent_dager` inngår i fullmakten (gruppe 3) | L |

### Byggherrens svar på vederlagskrav (§ 34, § 30.2), `vederlagDomain.ts`

| Utregning | Hva den avgjør | Bestemmelse | Sendes som | Backend | Belegg |
| --- | --- | --- | --- | --- | --- |
| `beregnHovedkravPrekludert` (med `har34_1_2Preklusjon`) | Om hovedkravet er tapt for sent varsel. Gjelder bare svikt og andre forhold, ikke endring | § 34.1.2 annet ledd | Indirekte: beløpet teller ikke prinsipalt; `subsidiaer_triggers=["preklusjon_hovedkrav"]`. Grunnlaget som `hovedkrav_varslet_i_tide` | Lagres i journalen, kopieres ikke til tilstanden | L |
| `beregnRiggPrekludert`, `beregnProduktivitetPrekludert` | Om særskilte krav for rigg og drift eller produktivitet er tapt | § 34.1.3 tredje ledd | Som over, med `preklusjon_rigg` og `preklusjon_produktivitet`; grunnlaget som `rigg_varslet_i_tide`, `produktivitet_varslet_i_tide` | Som over | L |
| `beregnGodkjentBelop` og beløpene i `buildEventData` | Godkjent beløp per post: hele kravet ved godkjent, oppgitt beløp ved delvis, 0 ved avslag eller preklusjon | § 34.2–34.4 | `hovedkrav_godkjent_belop`, `rigg_godkjent_belop`, `produktivitet_godkjent_belop` | Lagres i journalen. Summen kontrolleres ikke mot postene | L |
| `beregnTotaler` | Samlet krevd og godkjent, prinsipalt (uten prekluderte poster) og subsidiært (med) | § 34.1.2, § 34.1.3 | `total_godkjent_belop`, `total_krevd_belop`, `subsidiaer_godkjent_belop` | `total_godkjent_belop` blir sporets `godkjent_belop`. Inngår i fullmakt, EO-kontroll og rapportering (gruppe 3) | L |
| `beregnPrinsipaltResultat` | Holdes betalingen tilbake: `hold_tilbake`. Ellers avslått ved 0 kr, godkjent ved minst 99 % uten metodeendring, delvis ellers | § 30.2 første ledd; § 34.2.2 | `beregnings_resultat` | Kopieres til `bh_resultat` og sporstatus | **K 23.09 (BR-01)** |
| `beregnSubsidiaertResultat` | Resultatet hvis preklusjonen ikke holder | § 34.1.2, § 34.1.3 | `subsidiaer_resultat` | Kopieres | L |
| `beregnSubsidiaerTriggers` | Preklusjon per post, sen EP-varsling, metode avvist | § 34.1.2, § 34.1.3, § 34.3.3 | `subsidiaer_triggers` | Kopieres | L |

### Byggherrens svar på ansvarsgrunnlaget (§ 32), `grunnlagDomain.ts`

| Utregning | Hva den avgjør | Bestemmelse | Sendes som | Backend | Belegg |
| --- | --- | --- | --- | --- | --- |
| `erEndringMed32_2` | Om varslingsplikten i § 32.2 gjelder: endring, men ikke formell endringsordre | § 32.1, § 32.2 | Avgjør om `grunnlag_varslet_i_tide` sendes | Backend lar `grunnlag_varslet_i_tide=false` holde sporet åpent (`UNDER_FORHANDLING`) uansett kategori. Fullmakt og brev bruker regelen bare for `ENDRING` | L |
| `beregnPassivitet` | Om byggherren er passiv: mer enn 10 dager siden varselet | § 32.3 annet ledd | `dager_siden_varsel`, som forsvinner (DRF-02) | Ingenting. Passivitet finnes ikke i backend | L |
| `getVerdictOptions` (via `erPaalegg`) | Om «frafalt» kan velges: bare ved irregulær endring og valgrett | § 32.3 første ledd bokstav c | Avgjør hvilke `resultat` som kan velges | Backend godtar `frafalt` for alle kategorier | L |

### TEs krav, `fristSubmissionDomain.ts` og `vederlagSubmissionDomain.ts`

| Utregning | Hva den avgjør | Bestemmelse | Sendes som | Backend | Belegg |
| --- | --- | --- | --- | --- | --- |
| `fristSubmissionDomain.buildEventData` | Sendedato for fristvarselet og det spesifiserte kravet: dagens dato fra klientens klokke, eller en tidligere dato TE oppgir | § 33.4, § 33.6.1, § 5 | `frist_varsel.dato_sendt`, `spesifisert_varsel.dato_sendt` | Lagres. Serverens `tidsstempel` lagres ved siden av | L |
| `vederlagSubmissionDomain.buildEventData` | Sendedato for varsel om justerte enhetspriser, satt lik oppdagelsesdatoen | § 34.3.3 første ledd | `justert_ep_varsel.dato_sendt` | Lagres (DRF-03) | L |
| `konsekvensVarsler.buildKonsekvensVarsler` | Selve varselteksten for vederlag, rigg og drift, produktivitet og frist, med hjemmel | § 33.4, § 34.1, § 34.1.3 | `varsler` | Lagres. Backend krever at hvert valgt varsel har tekst | L |

### Begrunnelsestekstene, `begrunnelse/`

`generateFristResponseBegrunnelse`, `generateVederlagResponseBegrunnelse` og
`generateForseringResponseBegrunnelse` (1 347 linjer med
`shared.ts`) skriver standpunktet som prosa ut fra de samme vurderingene. Et
eksempel: «Kravet er derfor prinsipalt tapt etter §33.4. Innsigelsen om sen
varsling fremsettes med dette svaret, jf. §5.»

Skjemaene setter `begrunnelse` til denne teksten, med BHs tillegg etter.
Teksten havner i hendelsen og i det frosne brevet (`approval_letter.snapshot`).
Den har rettsvirkning: det er her innsigelsen etter § 5 tredje ledd fremsettes
skriftlig. Backend genererer og kontrollerer den ikke (L). Retter B-13 bare
resultatfeltet, kan teksten fortsatt si noe annet enn resultatet.

## Gruppe 3: styrer systemets handlinger

Utregningene som bestemmer hva systemet gjør, ligger i backend. Men de
bygger på verdier fra gruppe 2, som klienten har regnet ut:

| Handling | Backend-symbol | Bygger på klientens | Belegg |
| --- | --- | --- | --- |
| Sporstatus | `TimelineService._beregnings_resultat_til_status` | `beregnings_resultat` | K 23.09 |
| Samlet status (`OMFORENT` osv.) og saksliste | `SakState.overordnet_status`, `update_cache` | Sporstatus | K 23.09 |
| EO-adgang | `SakState.kan_utstede_eo` | Sporstatus | K 23.09 |
| Forsering etter § 33.8 | `ForseringService`, sjekker `frist.bh_resultat == "avslatt"` | `beregnings_resultat` | L |
| Fullmaktsnivå for BH-svar | `approval_authority.exposure` | `total_godkjent_belop`, `godkjent_dager`, `subsidiaer_godkjent_*` | L |
| EO-beløp mot KOE-enigheten | `EndringsordreService`, «Beløpet må samsvare med gjeldende enighet» | `SakState.sum_godkjent`, som er `total_godkjent_belop` | L |
| Rapportering | `update_cache` (`cached_sum_godkjent`, `cached_dager_godkjent`) | `total_godkjent_belop`, `godkjent_dager` | L |
| Oppfølgingsoppgaver | `followUp.caseFollowUp` (frontend) og `services/follow_up_context.py` | `bh_resultat` | L |

Én regel eier backend allerede selv: i fullmakten og i brevet regnes et
vederlags- eller fristsvar som prinsipalt avslått når ansvarsgrunnlaget er
avslått, eller når kategorien er endring og grunnlaget varslet for sent
(`approval_authority.exposure`, `approval_letter.decision_summary`). Grunnlaget
(`basis`) setter serveren selv fra tilstanden. Fullmakten for endringsordrer
regnes også helt i backend (`eo_approval_service.order_exposure`); frontendens
`eoExposure` er en kopi for visning.

Summen er det svake leddet i fullmakten. `exposure` bruker
`total_godkjent_belop` slik klienten sendte den. Brevet og tilstanden viser
samme tall, så godkjenningen dekker det brevet sier. Men delbeløpene i
journalen kan si noe annet, og det er ikke kontrollert om det har
betydning for hva byggherren er bundet av (L).

## Gruppe 1: veiledning

Disse sendes ikke, eller bestemmer bare hva som vises. Oversikten er kort
fordi B-13 sier at de ikke berøres.

| Fil | Utregninger |
| --- | --- |
| `fristDomain.ts` | `getDefaults`, `beregnVisibility`, `getDynamicPlaceholder` |
| `vederlagDomain.ts` | `getDefaults`, `erHelVederlagSubsidiaerPgaGrunnlag`, `erSubsidiaer`, `harPreklusjonsSteg`, `kanHoldeTilbake`, `maSvarePaJustering`, `erKravlinjeGyldig`, `getVurderingBadge`, `getDynamicPlaceholder`, `deriveVurdering`, `getGodkjentForDisplay` |
| `grunnlagDomain.ts` | `getDefaults`, `erForceMajeure`, `erPrekludert`, `erSnuoperasjon`, `getDynamicPlaceholder`, `getBhUpdateDefaults`, `detekterEndringer` |
| `fristSubmissionDomain.ts` | `getDefaults`, `beregnVisibility`, `beregnPreklusjonsvarsel` (varsel etter 7 og 14 dager), `beregnCanSubmit`, `getDynamicPlaceholder`, `beregnTeStatusSummary`, `beregnRevisionContext`, `getEventType` |
| `vederlagSubmissionDomain.ts` | `getDefaults`, `beregnVisibility`, `beregnCanSubmit`, `getDynamicPlaceholder`, `beregnTeStatusSummary`, `getEventType` |
| `endringsordre.ts` | `validateEODraft` (backend kontrollerer beløpet mot KOE-enigheten selv), `buildEORequest`, `eoAmount`, `eoExposure`, `eoExposureFloor` |
| `followUp.ts`, `deriveConfig.ts` | Oppfølgingsoppgaver og avledning av skjemakonfigurasjon fra tilstanden |

To av dem har rettslig betydning selv om de bare er veiledning:

- **Standardverdier ved endring av svar.** `fristDomain.getDefaults` og
  `vederlagDomain.getDefaults` setter varselspørsmålene til «i tide» når
  forrige svar mangler verdien. En byggherre som endrer et svar uten å se
  etter, frafaller da en preklusjonsinnsigelse (§ 5 tredje ledd) (L).
- **Hvilke spørsmål som stilles.** `deriveFristDomainConfig` avgjør om
  § 33.4-spørsmålet vises. Vises det ikke, kan byggherren ikke gjøre
  preklusjon gjeldende i skjemaet. `VederlagForm.svelte` stiller heller ikke
  spørsmålene om tilbakeholdelse (§ 30.2, `holdTilbake: false` er fast) og
  justerte enhetspriser (§ 34.3.3) (L).

## Hva backend må eie dersom den skal eie gruppe 2 og 3

Anslaget gjelder regler som i dag bare finnes i frontenden. Linjetallene er
TypeScript med typer og kommentarer; Python blir kortere.

| Del | I frontenden i dag | Anslag i backend | Avhenger av |
| --- | --- | --- | --- |
| Vederlag: preklusjon per post, beløp, totaler, resultater og grunner | `vederlagDomain.ts`, om lag 280 av 699 linjer | 150–200 linjer | B-13 (1)–(3); 99 %-terskelen |
| Frist: preklusjon, reduksjon, resultater og grunner | `fristDomain.ts`, om lag 95 av 339 linjer | 60–80 linjer | B-13; DRF-01 (hvordan forespørselen lagres) |
| Grunnlag: § 32.2 og passivitet (§ 32.3) | `grunnlagDomain.ts`, om lag 25 linjer | 20–40 linjer | Om passivitet skal trekkes av systemet eller bare varsles (B-13); tidskilde (B-11) |
| Varseldatoer som serveren setter | `fristSubmissionDomain`, `vederlagSubmissionDomain`, om lag 20 linjer | 10–20 linjer | B-11 |
| Fullmakt av delbeløp i stedet for klientens sum | Finnes i backend, bygger på `total_godkjent_belop` | 10–20 linjer | At summen regnes av serveren |
| Begrunnelsestekstene | `begrunnelse/`, 1 347 linjer | 0 hvis teksten regnes som partens egen formulering; ellers den største posten | B-13 |

Til sammen **250–350 linjer Python** for gruppe 2 og 3 uten tekstene.
Spesifikasjonen finnes: `vederlagDomain.test.ts` (101 tilfeller, 1 108
linjer), `fristDomain.test.ts` (53 tilfeller, 603 linjer) og
`grunnlagDomain.test.ts` (52 tilfeller, 553 linjer) kan oversettes til
backend-tester. Inngangsdataene finnes i `SakState`: kategori, krevde beløp per
post, varseltype og tidligere svar (L). To regler må finnes begge steder så
lenge frontenden skal vise resultatet før innsending. Da er det backend som
avgjør, og frontenden som forhåndsviser.

*Merknad 2026-09-23 (designnotatet for B-13):* «tidligere svar» stemmer bare
delvis. Tilstanden har resultatet, totalbeløpet og det subsidiære
standpunktet fra forrige svar, men ikke byggherrens vurdering av hver post,
varselspørsmålene, metoden eller tilbakeholdelsen
(`_handle_respons_vederlag`, L). En delvis oppdatering kan derfor ikke regnes
ut av `SakState` alene; se
[designnotatet](design-b13-sannhetskilde-2026-09-23.md#4-anbefaling-2-i-streng-form),
«Delvise oppdateringer».

## Spørsmål som må avklares

Disse er uklare i NS 8407 eller i koden. Kartleggingen velger ikke tolkning.

1. **99 %-terskelen.** Frontenden kaller et svar «godkjent» når minst 99 % av
   kravet er godkjent (`beregnPrinsipaltResultat` i begge filene). Et
   vederlagskrav på 1 000 000 kr der 990 000 godkjennes, blir «godkjent», ikke
   «delvis godkjent». Terskelen står ikke i NS 8407. Er den ønsket, og hvem
   eier den?
2. **Passivitet (§ 32.3 annet ledd).** Standarden sier «uten ugrunnet
   opphold»; frontenden bruker fast 10 dager. Skal systemet trekke
   konklusjonen, eller bare varsle? Dette er B-13s andre spørsmål.
3. **Forespørselen (§ 33.6.2).** Er den et svar på kravet, eller en egen
   handling? Skal den endre sporstatus? Se DRF-01.
4. **§ 32.2 og kategori.** Frontenden spør bare om varslet tid ved endring
   som ikke er formell endringsordre. Backend lar `grunnlag_varslet_i_tide=false`
   holde sporet åpent for alle kategorier. Skal backend avvise feltet utenfor
   § 32.2?
5. **«Frafalt» (§ 32.3 c).** Frontenden tilbyr det bare for irregulær endring
   og valgrett. Backend godtar det for alle kategorier. Skal backend avvise
   det?
6. **Sum og poster.** Er det totalen eller postene i et vederlagssvar som
   binder byggherren når de spriker?

## Verifikasjon og grenser

**Kjørt og observert (23.09):** de fem strenge `xfail`-testene i
`test_beregningsresultat_br01_20260923.py` (fire for BR-01, én for DRF-01),
først uten `xfail` for å se feilen, deretter som `xfail`. BR-01-testene er i
tillegg kjørt mot en midlertidig mutasjon som avviser svarene; alle fire ble
XPASS. DRF-01-testen feiler med `pytest.fail`, ikke `AssertionError`, hvis
svaret avvises av en annen grunn enn de manglende feltene. DRF-02 er kjørt ved
å parse hendelsene direkte med `parse_event_from_request`.

**Lageret i reproduksjonene** er `JsonFileEventRepository`. Det tas ut av
kjørestien i F0b (TS2-02), og testene må da flyttes til lageret som erstatter
det.

**Lest ut av koden (23.09):** alle filene i `src/lib/domain/`, i sin helhet,
og kallene fra `VederlagForm.svelte`, `FristForm.svelte`,
`GrunnlagForm.svelte`, `TeVederlagForm.svelte` og `TeFristForm.svelte`.
I backend: `api/validators.py`, svarmodellene i `models/events.py`,
`services/business_rules.py`, svarhåndtererne i `services/timeline_service.py`,
`services/approval_service.py`, `services/approval_authority.py`,
`services/approval_letter.py` og utdrag av `ForseringService`,
`EndringsordreService` og `SakState`.

**Sideobservasjon, ikke funn:** `ResponsEvent.data` er en union uten
diskriminator. Et fristsvar som bare har `beregnings_resultat`, parses som
`VederlagResponsData` og avvises av sporkontrollen. Skjemaene sender
frist-spesifikke felt, så det treffer ikke dem (K 23.09, parser).

**Ikke kontrollert:**

- Komponenter utenfor `src/lib/domain/` som regner selv, blant annet
  forseringssvaret og `src/lib/approval/` (fullmaktsvisning og rute). Bare
  det som kaller `buildEventData`, er fulgt.
- Om brev, PDF eller Catenda-kommentarer viser `justert_ep_varsel.dato_sendt`
  (DRF-03).
- Frontendens tester er ikke kjørt i denne runden, og ingen frontendkode er
  endret.
- NS 8407 er lest i en lokal kopi som ikke er i repoet. Tolkningene over er
  kartleggerens og ikke juridisk kvalitetssikret.
- Linjeanslagene i avsnittet om backend er skjønn, ikke målt.
