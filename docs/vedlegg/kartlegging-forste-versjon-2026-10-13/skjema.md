# Kartlegging av dagens skjemaer for KOE-saken (commit 44bbb49, 13.10)

Formål: vise hvilke valg og felt TE og BH har i dagens skjemaer, hvilken hendelse og nyttelast
skjemaet sender, og hva appen regner ut av valgene. Grunnlag for premissene i
`premisser.md`. Ingen filer i repoet er endret.

**Metode.** Lest kildekoden i `src/lib/components/kontraktsbord/`, hjelpemodulene i
`src/lib/domain/`, `src/lib/constants/`, `src/lib/kontraktsbord/` og `src/lib/approval/`,
hendelsesmodellen i `backend/models/events.py` og, der det trengtes for å forstå en
virkning, `backend/services/timeline_service.py`, `backend/services/business_rules.py` og
`backend/regler/sammenlikning.py`. Ingenting er kjørt i nettleser eller mot en base.

**Merking.** Tabellene er *lest ut av koden*. Der en påstand bygger på en antakelse eller
ikke er kontrollert, står det «antakelse» eller «ikke kontrollert». Feltnavn i
`kodeformat` er nyttelasten slik skjemaet bygger den. Serveren stempler `aktor_id`,
`aktor_rolle`, `aktor_team_id`, `tidsstempel` og `event_id` (AGENTS.md); de står ikke i
tabellene.

**Hvor skjemaene sender.** `submitEvent` (`src/lib/api/events.ts`) poster til
`/api/events`, som er Python-ruten `backend/routes/event_routes.py:438`. Ruten
`/[prosjektId]/[sakId]/kjerne` er en testskive mot TS-serveren (#347) og er ikke kartlagt.

---

## 1. Oversikt over handlingene

Hostkomponenten er `Kontrollrommet.svelte`, som velger skjema etter rolle og spor.
Knappene i lesemodus står i `ActionBar.svelte`.

| # | Hvem | Spor | Knapp i UI (lesemodus) | Komponent | Hendelsestype | Brevkontroll før sending | Intern godkjenning |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | TE | (sak) + grunnlag | «Ny sak» → «Se brev og send» | `NewCaseForm` | `sak_opprettet`, deretter `grunnlag_opprettet` | Ja, eget brev i `NewCaseForm` | Nei |
| 2 | TE | grunnlag | «Oppdater begrunnelse» | `TeGrunnlagForm` | `grunnlag_oppdatert` | Ja (`claimReview`) | Nei |
| 3 | TE | vederlag | «Varsle eller spesifiser krav» / «Spesifiser krav» / «Oppdater krav» | `TeVederlagForm` | `vederlag_krav_sendt` (varsel eller spesifisert) / `vederlag_krav_oppdatert` | Ja | Nei |
| 4 | TE | frist | «Send fristvarsel» / «Spesifiser krav» / «Oppdater krav» | `TeFristForm` | `frist_krav_sendt` / `frist_krav_spesifisert` / `frist_krav_oppdatert` | Ja | Nei |
| 5 | TE | alle tre | «Trekk» | `WithdrawModal` (sendt fra `Kontrollrommet`) | `grunnlag_trukket` / `vederlag_krav_trukket` / `frist_krav_trukket` | **Nei** | Nei |
| 6 | BH | grunnlag | «Fortsett til utfylling» → «Ferdigstill vurdering» | `GrunnlagForm` | `respons_grunnlag` / `respons_grunnlag_oppdatert` | Ja, i godkjenningspakken | **Ja** (`ClaimApprovalView`) |
| 7 | BH | vederlag | «Svar på kravet» / «Fortsett utfylling» / «Oppdater svar» | `VederlagForm` | `respons_vederlag` / `respons_vederlag_oppdatert` | Ja, i pakken | Ja |
| 8 | BH | frist (uten dager) | «Svar på varselet» | `FristVarselForm` | `frist_innsigelse_sendt` / `frist_foresporsel_sendt` | Ja (`claimReview`, rolle BH) | **Nei**, sendes direkte |
| 9 | BH | frist (med dager) | «Svar på kravet» / «Oppdater svar» | `FristForm` | `respons_frist` / `respons_frist_oppdatert` | Ja, i pakken | Ja |
| 10 | BH | alle (brev) | «Åpne brev» | `ClaimApprovalView` | ingen egen; publisering skriver hendelsene i pakken | — | Ja |

Kilder: `Kontrollrommet.svelte` (malen fra `{#if showApproval ...}`), `ActionBar.svelte`
(knappene og etikettene), `WithdrawModal.svelte` og `onconfirm` i `Kontrollrommet.svelte`.

**Finnes i hendelsesmodellen, men ikke i noe skjema:**

- `te_aksepterer_respons` (TE godtar BHs svar per spor, `TEAkseptererResponsEvent`). Backend
  har reglene (`business_rules.py:179`) og projeksjonen (`timeline_service.py:1312`). I `src/`
  finnes bare typen og etiketten «Entreprenør godtok svaret» (`eventTypeLabels.ts:43`).
  Søkt etter `te_aksepterer`, «Godta svaret», «Aksepter svar»: ingen treff i komponentene.
- `internt_notat`: ingen inngang funnet i `kontraktsbord/`. Ikke søkt videre.
- BH har ingen handling på et vederlagsvarsel uten metode: knappen er deaktivert når
  `!store.sak.vederlag.metode` (`ActionBar.svelte`, BH-grenen). Det finnes ingen innsigelse
  eller forespørsel i vederlagssporet.

**Forsering og endringsordre** (bare én linje, som bestilt): Forsering (§ 33.8) har
hendelsestyper og backendregler, men ikke noe skjema; `FristForm` viser bare en
risikomerknad ved prinsipalt avslag. Endringsordre har egne skjemaer i
`src/lib/components/endringsordre/` (`EndringsordreForm`, godkjenning) og en lenke fra saken
(`EndringsordreLink`).

---

## 2. Felles mekanikk

### 2.1 Vedlegg

| Skjema | UI | Felt | Påkrevd | Kilde |
| --- | --- | --- | --- | --- |
| Ny sak | «Vedlegg (valgfritt)», filvelger, maks 15 MB per fil, «Fjern …» | `vedlegg_ids` (lastes opp etter `sak_opprettet`, før `grunnlag_opprettet`) | Nei | `NewCaseForm.svelte`, `velgFiler`, `send` |
| Alle sporskjemaer unntatt trekk | «Vedlegg (valgfritt) · N valgt» (`<details>`), velg blant sakens vedlegg eller last opp | `vedlegg_ids` | Nei | `SkjemaStatus.svelte` → `VedleggPanel.svelte` (`valgbare`) |
| Trekk | ingen | — | — | `WithdrawModal.svelte` |

Vedleggsnavnene føyes til begrunnelsesdelen av brevet («Vedlegg» + navn):
`claimReview.svelte.ts`, `submit`; `NewCaseForm.svelte`; `documentToBrev` i `approval/letter.ts`.

### 2.2 Utkast

Sporskjemaene lagrer et felles arbeidsutkast på serveren per team, sak, spor og revisjon
(`createFormDraft`, `kontraktsbord/submission.svelte.ts`). Konflikt mellom to i samme team
gir valget «Behold min tekst» / «Hent inn deres» (`UtkastStatus.svelte`). Ny sak lagrer
utkast lokalt (`draftKey('kontraktsbord-ny', prosjektId)`). `FristVarselForm` og trekk har
ikke utkast.

### 2.3 Hvilket krav et svar gjelder

`submissionRefs(timeline, spor)` (`submission.svelte.ts`) finner **siste** kravhendelse i
sporet (`grunnlag_opprettet|oppdatert`, `<spor>_krav_sendt|oppdatert|spesifisert`; for
vederlag ikke en ren varselhendelse) og siste svar etter den. Skjemaet velger dette kravet
automatisk; brukeren velger ikke kravversjon. I godkjenningsflyten bruker `prepare`
`claimId(track)` (`approval/context.svelte.ts`), som er **siste TE-hendelse** i sporet,
uansett type. Om de to kan peke på ulike hendelser (for eksempel etter et vederlagsvarsel),
er ikke kontrollert.

### 2.4 Brevforhåndsvisning

| Avsender | Hvordan brevet lages | Kan teksten redigeres? | Bekreftelse | Kilde |
| --- | --- | --- | --- | --- |
| TE, ny sak | Eget brev: innledning «Vi varsler med dette om {tittel}.», begrunnelse = redegjørelsen + varseltekstene + vedlegg, avslutning «Med vennlig hilsen {TE}». Tittel «Varsel om endring – …» ved ENDRING uten EO, ellers «Grunnlag – …» | Nei | Avkrysning «Jeg har kontrollert brevet og vedleggene.» | `NewCaseForm.svelte`, `send`; `ClaimLetterView.svelte` |
| TE, sporene; BH, fristvarsel | `buildLetterContent`: innledning «Vi viser til {spor} i sak {id} — «{tittel}». Brevet gjelder {spor}.», begrunnelse = fakta («Krav: X kr», «Kostnadsoverslag: X kr», «Krav: N dager») + begrunnelse + varseltekster, avslutning med navn og dato | Nei (`LetterHtmlPreview` viser `redigertTekst`, ingen redigering) | Samme avkrysning | `letterContentBuilder.ts`, `claimReview.svelte.ts`, `ClaimLetterView.svelte` |
| BH, svar på grunnlag/vederlag/frist | Godkjenningspakke: tittel «Svar på endringsmelding», innledning og avslutning, per spor `decisionSummary` + begrunnelse | Innledning og avslutning kan redigeres (tekstfelt); vurderingene endres bare ved å gå tilbake til skjemaet | Godkjenningskjede | `ClaimApprovalView.svelte`, `approval/letter.ts` (`decisionSummary`, `documentToBrev`) |

Merk: TE-brevets faktalinje viser bare hovedkravet (`belop_direkte` eller
`kostnads_overslag`). Metode, rigg og drift og produktivitet står ikke i faktalinjen; de står
bare i brevet hvis TE skriver dem i begrunnelsen (`letterContentBuilder.ts`, `facts`).

### 2.5 Datoer – hvem setter dem

| Dato | Settes av | Hvordan | Kilde |
| --- | --- | --- | --- |
| `dato_oppdaget` | TE | datofelt «Når ble forholdet oppdaget?», påkrevd | `NewCaseForm.svelte` |
| `tidsstempel` | Server | — | AGENTS.md, `SakEvent` |
| Varseldato for konsekvensvarsler (`vederlag_varsel`, `rigg_drift_varsel`, `produktivitetstap_varsel`, og `frist_varsel` når den kommer fra et varsel) | Server | norsk dato for mottaket, metode «Digital innsending» | `timeline_service.py`, `_varsel_ved_innsending`, `_apply_konsekvensvarsler` |
| `frist_varsel.dato_sendt` i fristhendelser | **Klient** | eksisterende dato, ellers `new Date().toISOString().split('T')[0]` (UTC-dato), metode `digital_oversendelse` | `fristSubmissionDomain.ts`, `buildEventData` |
| `spesifisert_varsel.dato_sendt` | **Klient** | dagens UTC-dato hver gang `varsel_type` er `spesifisert`, også ved oppdatering | samme |
| `dato_revidert`, `dato_spesifisert`, `dato_endret` | Klient | dagens UTC-dato | `fristSubmissionDomain.ts`, `grunnlagDomain.ts`, `vederlagDomain.ts` |
| `svarfrist` | BH | valgfritt datofelt i forespørselen | `FristVarselForm.svelte` |
| `respondert_versjon` | Server | — | `events.py`, feltbeskrivelsen |
| `grunnlag_varsel` | Ingen | sendes bare videre fra tilstanden i oppdateringen; ingen skjema fyller den | `NewCaseForm.svelte` (feltet mangler), `buildTeRevisionEventData` |
| Brevdato | Klient | dagens dato ved forhåndsvisning | `NewCaseForm.svelte`, `letterContentBuilder.ts` |

Serveren overskriver ikke klientens `dato_sendt` i fristhendelser: `_handle_frist`
kopierer `frist_varsel` og `spesifisert_varsel` fra hendelsen (`timeline_service.py`, rundt
linje 639). Søk etter `dato_sendt`, `dato_revidert`, `dato_spesifisert` og `dato_endret` i
`backend/routes`, `backend/services` og `backend/lib` fant ingen normalisering.

### 2.6 Serverens kontroll av utregningen

For svar på vederlag og frist regner serveren ut `beregnings_resultat`, `subsidiaer_resultat`,
beløpene eller dagene og `subsidiaer_triggers`, avviser svaret ved avvik og skriver sine egne
verdier inn i hendelsen (`business_rules.py`, `_rule_serverens_utregning`;
`regler/sammenlikning.py`). For grunnlag returnerer kontrollen ingen felt.

---

## 3. TE: Ny sak (grunnlag og varsler)

Hvem: TE. Spor: grunnlag. Hendelser: `sak_opprettet` (`prosjekt_id`, `sakstype: 'standard'`,
`sakstittel`), deretter `grunnlag_opprettet`. Ruten er `/[prosjektId]/ny`.
Kilde: `NewCaseForm.svelte` (`canSend`, `send`), `KonsekvensVarsler.svelte`,
`domain/konsekvensVarsler.ts` (`buildKonsekvensVarsler`), `constants/categories.ts`
(`KRAV_STRUKTUR_NS8407`).

| UI-tekst | Felt | Mulige verdier | Påkrevd | Vises når | Appen regner ut |
| --- | --- | --- | --- | --- | --- |
| «Kort tittel på forholdet» | `tittel`, `sakstittel` | fritekst | Ja, minst 5 tegn | alltid | — |
| «Når ble forholdet oppdaget?» | `dato_oppdaget` | dato | Ja | alltid | Ingen utregning: feltet leses ikke av noen regel eller frist i `src/lib` eller `backend/regler` (søk etter `dato_oppdaget`). Hjelpeteksten sier «Datoen brukes ved vurderingen av kontraktens varslingsfrister.» |
| «Kontraktsforhold» (søk + gruppe + hjemmel) | `hovedkategori`, `underkategori` | se tabellen under | Ja | alltid | Viser regel og konsekvens fra `getKontraktsregel`; knappen heter «Send varsel» ved ENDRING uten EO, ellers «Send grunnlag» (brevtittelen følger) |
| «Redegjørelse» | `beskrivelse` | rik tekst | Ja, minst 10 tegn | alltid | — |
| «Varsler»: «Vederlagsjustering» (§ 34.1) | `varsler.vederlag` | avkrysning + valgfri forklaring | Nei | alltid | Fast tekst: «Varsel om krav på vederlagsjustering (pkt. 34.1). Totalentreprenøren varsler at det vil bli krevd vederlagsjustering. Varselet gjelder forholdet «{tittel}» … Omfanget er ikke spesifisert.» + forklaring |
| «Kapitalytelser, rigg og drift» (§ 34.1.3) | `varsler.rigg_drift` | som over | Nei | alltid | Fast tekst om særskilt varsel om rigg og drift |
| «Produktivitetstap / forstyrrelser» (§ 34.1.3) | `varsler.produktivitet` | som over | Nei | alltid | Fast tekst om særskilt varsel om produktivitet |
| «Fristforlengelse» (§ 33.4) | `varsler.frist` | som over | Nei | alltid | Fast tekst om fristforlengelse |
| «Vis varseltekst» | — | — | — | per valgt varsel | forhåndsviser teksten over |
| Vedlegg | `vedlegg_ids` | — | Nei | med prosjekt | — |
| — | `brev` | frosset brev fra forhåndsvisningen | — | — | se 2.4 |

Varslene avhenger ikke av kategorien (ADR 001). Ved FORCE_MAJEURE vises veiledningen «Force
majeure gir ikke i seg selv rett til vederlagsjustering (pkt. 33.3) …». Bunntekst: «Et
uavkrysset valg innebærer ikke at kravet er frafalt.» og «Varslingsfristene løper
uavhengig av byggherrens svar.»

**Serverens virkning av varslene** (`_apply_konsekvensvarsler`): hvert varsel legges i
sporets `varsler` med serverdato. Et fristvarsel setter `frist.frist_varsel`, og hvis
fristsporet ikke har `varsel_type`, settes `varsel_type = 'varsel'`, `begrunnelse` = teksten og
`antall_versjoner = 1`; sporet får status `sendt`. Et vederlagsvarsel setter
`vederlag_varsel`, `rigg_drift_varsel` eller `produktivitetstap_varsel`. Fristsporet blir
dermed et «foreløpig varsel» som BH kan svare på med innsigelse eller forespørsel (avsnitt 9).

**Kategoriene** (`categories.ts`):

| `hovedkategori` | UI | `underkategori` (hjemmel) |
| --- | --- | --- |
| `ENDRING` (§ 33.1 a) | Endringer | `EO` Formell endringsordre (31.3), `IRREG` Irregulær endring (Pålegg) (32.1), `VALGRETT` Begrensning av valgrett (14.6), `SVAR_VARSEL` Endring via svar på varsel (24.2.2), `LOV_GJENSTAND` (14.4), `LOV_PROSESS` (15.2), `GEBYR` (26.3), `SAMORD` (21.4) |
| `SVIKT` (§ 33.1 b) | Forsinkelse eller svikt ved byggherrens ytelser | `MEDVIRK` (22), `GRUNN` (23.1), `KULTURMINNER` (23.3), `PROSJ_RISIKO` (24.1) |
| `ANDRE` (§ 33.1 c) | Andre forhold byggherren har risikoen for | `NEKT_MH` (10.2), `SKADE_BH` (19.1), `BRUKSTAKELSE` (38.1 annet ledd), `STANS_BET` (29.2), `ANDRE_ANDRE` (33.1 c) |
| `FORCE_MAJEURE` (§ 33.3) | Force Majeure | ingen (`underkategori: null`) |

Kategorien styrer senere: § 32.2-spørsmålet til BH (ENDRING uten EO), «Frafalt» (IRREG,
VALGRETT), § 34.1.2-spørsmålet (SVIKT, ANDRE) og endringsordrevarselet (avsnitt 7–8).

---

## 4. TE: Oppdater grunnlaget

Hvem: TE. Spor: grunnlag. Hendelse: `grunnlag_oppdatert`.
Kilde: `TeGrunnlagForm.svelte` (`kanSende`, `send`), `grunnlagDomain.ts`
(`buildTeRevisionEventData`).

| UI-tekst | Felt | Verdier | Påkrevd | Vises når | Appen regner ut |
| --- | --- | --- | --- | --- | --- |
| Låst kontekst: kontraktsforhold, hjemmel, «Oppdaget …», «Sist sendt …», «Rev. N» | `tittel`, `hovedkategori`, `underkategori`, `dato_oppdaget`, `grunnlag_varsel` kopieres fra tilstanden | — | — | alltid | Kan ikke endres («Kontraktsforhold, hjemmel og dato kan ikke endres.») |
| «Byggherrens standpunkt» med «Svar på rev. N» | — | — | — | når BH har svart | Merknad «Oppdateringen sendes som en ny revisjon etter byggherrens svar.» |
| «Oppdatert begrunnelse» | `beskrivelse` og `begrunnelse` (samme tekst) | rik tekst | Ja, minst 10 tegn, og teksten må være endret (eller vedlegg valgt) | alltid | — |
| — | `original_event_id` | siste kravhendelse (`submissionRefs`) | — | — | automatisk |
| — | `dato_revidert` | dagens UTC-dato | — | — | automatisk |
| Vedlegg | `vedlegg_ids` | | Nei | | |

Nye varsler kan ikke sendes her; serveren avviser varsler i `grunnlag_oppdatert` med «Nye
varsler sendes fra vederlags- eller fristsporet.» (`business_rules.py`, `validate`).

**Serverens virkning:** En ny grunnlagsversjon etter BHs svar fjerner svaret på grunnlaget
(`_svaret_faller_bort`, GR-U1) og merker vederlags- og fristsvarene
`subsidiaert_til_nytt_svar`. Et låst grunnlag avvises med «Grunnlag er låst og kan ikke
endres» (`_rule_grunnlag_not_locked`). Grunnlaget låses når BH godkjenner uten å påberope
§ 32.2 (`timeline_service.py`, rundt linje 725). `ActionBar` viser «Oppdater begrunnelse»
uten å sjekke låsen; om knappen skjules andre steder, er ikke kontrollert.

---

## 5. TE: Krav om vederlagsjustering

Hvem: TE. Spor: vederlag. Kilde: `TeVederlagForm.svelte`, `vederlagSubmissionDomain.ts`
(`getDefaults`, `beregnCanSubmit`, `buildEventData`, `getEventType`),
`constants/paymentMethods.ts`, `KonsekvensVarsler.svelte` (`includeFrist={false}`).

### 5.1 Valget «Hva vil du sende?»

| UI-tekst | Verdi | Standard | Hendelse |
| --- | --- | --- | --- |
| «Varsel» («Varsle uten å oppgi beløp.») | `varsel_type: 'varsel'` | når sporet verken har varsler eller metode | `vederlag_krav_sendt` |
| «Spesifisert krav» («Oppgi beregningsmetode og beløp.») | (ingen `varsel_type` sendes; modellens standard er `spesifisert`) | når sporet har varsler eller metode | `vederlag_krav_sendt` uten metode i tilstanden, ellers `vederlag_krav_oppdatert` |

### 5.2 Varsel

| UI-tekst | Felt | Verdier | Påkrevd | Appen regner ut |
| --- | --- | --- | --- | --- |
| «Vederlagsjustering» (§ 34.1), «Kapitalytelser, rigg og drift» (§ 34.1.3), «Produktivitetstap / forstyrrelser» (§ 34.1.3), hver med valgfri forklaring | `varsler.vederlag`, `varsler.rigg_drift`, `varsler.produktivitet` | avkrysning + tekst | minst ett | Fast varseltekst som i avsnitt 3 |
| — | `begrunnelse` | varseltekstene slått sammen | — | automatisk |
| Vedlegg | `vedlegg_ids` | | Nei | |

Fristvarsel kan ikke velges her. Serveren krever minst ett varsel, avviser `varsler.frist`
og avviser metode og beløp i et varsel (`VederlagData.validate_notice_or_claim`). Et nytt
varsel er lov også når sporet har et spesifisert krav (`_rule_create_once`, unntaket for
`varsel_type == 'varsel'`).

### 5.3 Spesifisert krav (ny eller oppdatert)

| UI-tekst | Felt | Verdier | Påkrevd | Vises når | Appen regner ut |
| --- | --- | --- | --- | --- | --- |
| «Beregningsmetode» (§ 34.2): «Enhetspriser», «Regningsarbeid», «Fastpris» | `metode` | `ENHETSPRISER`, `REGNINGSARBEID`, `FASTPRIS_TILBUD` | Ja | spesifisert | **Forhåndsvalgt `REGNINGSARBEID`** i et nytt krav (`defaults.metode ?? 'REGNINGSARBEID'`). Hjelpetekst fra `VEDERLAGSMETODE_DESCRIPTIONS` |
| «Hovedkrav» (§ 34.1.1–34.1.2): «Kostnadsoverslag» | `kostnads_overslag` | heltall ≥ 0 kr | **Nei** (§ 30.2-kommentar i `beregnCanSubmit`) | metode = regningsarbeid | — |
| «Hovedkrav»: «Anslått beløp» / «Fast pris» | `belop_direkte` | heltall ≥ 0 kr | Ja | metode = enhetspriser / fastpris | — |
| «Særskilte krav» (§ 34.1.3): «Rigg og drift» | `saerskilt_krav.rigg_drift.belop` | heltall ≥ 0 kr | Nei | spesifisert | `harRiggKrav = belop > 0`; uten beløp sendes ikke linjen |
| «Særskilte krav»: «Produktivitetstap» | `saerskilt_krav.produktivitet.belop` | heltall ≥ 0 kr | Nei | spesifisert | som over; `saerskilt_krav = null` når ingen av dem |
| (ingen UI) | `saerskilt_krav.*.dato_klar_over` | fra eksisterende krav, ellers tom | — | — | Feltet finnes i modellen («Brukes til 7-dagers varslingssjekk»), men skjemaet har ikke noe felt for det |
| (ingen UI) | `krever_justert_ep` | `false`, eller verdien i forrige krav | — | sendes bare ved enhetspriser | TE kan ikke kreve justerte enhetspriser (§ 34.3.3) i skjemaet |
| (ingen UI) | `varslet_for_oppstart` | **`true`** som standard, eller verdien i forrige krav | — | sendes bare ved regningsarbeid | Appen sender at BH ble varslet før regningsarbeidet startet (§ 34.4) uten at TE har valgt det |
| Begrunnelse (§ 34.2): «Beskriv grunnlaget for kravet, omfanget og hvorfor den valgte beregningsmetoden passer.» | `begrunnelse` | rik tekst | Ja, minst 10 tegn | spesifisert | — |
| «Klar til sending» | — | — | — | når kan sendes | Viser «Krav om {hovedkrav},-»; summen med særskilte krav vises ikke |
| — | `grunnlag_event_id` | siste grunnlagskrav | — | — | automatisk |
| — | `original_event_id` | siste vederlagskrav | — | ved oppdatering | automatisk |
| Vedlegg | `vedlegg_ids` | | Nei | | |

Ikke i skjemaet, men i modellen (`VederlagKompensasjon`, `VederlagData`): `fradrag_belop`
(§ 34.4), `er_estimat`, `justert_ep_varsel`, `rigg_drift_varsel` og `produktivitetstap_varsel`
som egne felt. Tallfeltet godtar bare sifre (`NumberField.svelte`), så negative beløp
(fradrag) og øre kan ikke føres, selv om `belop_direkte` i modellen kan være negativt.

Serveren krever at grunnlaget er sendt (`GRUNNLAG_REQUIRED`) og avviser et nytt
`vederlag_krav_sendt` når sporet allerede har et krav (`_rule_create_once`).

---

## 6. TE: Krav om fristforlengelse

Hvem: TE. Spor: frist. Kilde: `TeFristForm.svelte` (`scenario`, `kanSende`, `send`),
`fristSubmissionDomain.ts` (`getDefaults`, `beregnVisibility`, `beregnCanSubmit`,
`buildEventData`, `getEventType`, `beregnTeStatusSummary`).

### 6.1 Scenario (utledes av tilstanden, ikke valgt av TE)

| Scenario | Vilkår i koden | Hendelse | Knapp |
| --- | --- | --- | --- |
| `new` | ingen `frist_varsel` | `frist_krav_sendt` | «Send varsel» / «Send fristkrav» |
| `spesifisering` | `frist_varsel` finnes (også fra et konsekvensvarsel i grunnlaget) | `frist_krav_spesifisert` | «Send spesifisert krav» |
| `foresporsel` | `har_bh_foresporsel` og `varsel_type !== 'spesifisert'` | `frist_krav_spesifisert`, `er_svar_pa_foresporsel: true` | som valgt |
| `edit` | `varsel_type === 'spesifisert'` og `krevd_dager` satt | `frist_krav_oppdatert` | «Send oppdatert krav» |

### 6.2 Felt

| UI-tekst | Felt | Verdier | Påkrevd | Vises når | Appen regner ut |
| --- | --- | --- | --- | --- | --- |
| «Kravstype» (§ 33.4 / § 33.6): «Foreløpig varsel», «Spesifisert krav» | `varsel_type` | `varsel`, `spesifisert` | Ja | ikke i `edit`; ikke `foresporsel` | Forhåndsvalgt `spesifisert` i `spesifisering`. «Foreløpig varsel» kan også velges i `spesifisering` (samme segmentliste) |
| «Kravstype»: «Spesifisert krav», «Utsatt beregning» | `varsel_type` | `spesifisert`, `begrunnelse_utsatt` (§ 33.6.2 b) | Ja | `foresporsel` | — |
| «Tidligere innsending – Foreløpig varsel, Sendt {dato}» | — | — | — | `frist_varsel` finnes, ikke `edit` | Tekst «Kravet kan nå spesifiseres med antall dager og begrunnelse etter § 33.6.» |
| «Utmåling» (§ 33.5): «Antall dager» | `antall_dager` | heltall > 0 | Ja | `spesifisert` | — |
| «Begrunnelse og årsakssammenheng» (§ 33.1 / § 33.5) eller «Begrunnelse for utsatt beregning» (§ 33.6.2) | `begrunnelse` | rik tekst | Ja, minst 10 tegn, for `spesifisert` og `begrunnelse_utsatt` | **skjult ved `varsel`** | — |
| (ingen UI) | `frist_varsel` | `{dato_sendt: eksisterende dato eller dagens UTC-dato, metode: ['digital_oversendelse']}` | — | alltid | Et spesifisert krav uten tidligere varsel får **også** et § 33.4-varsel med dagens dato. Helpteksten ved varsel: «Varselet registreres med dagens dato.» |
| (ingen UI) | `spesifisert_varsel` | `{dato_sendt: dagens UTC-dato, …}` | — | når `varsel_type = spesifisert`, også i `edit` | Ved oppdatering får det spesifiserte kravet ny dato (se kontrollpunkt K2) |
| (ingen UI) | `ny_sluttdato` | alltid tom | — | — | Feltet finnes i modellen, ikke i skjemaet |
| (ingen UI) | `er_svar_pa_foresporsel` | `true` i `foresporsel`, ellers `false` | — | — | automatisk |
| — | `grunnlag_event_id`, `original_event_id` (frist-kravet eller hendelsen med fristvarselet), `dato_revidert` (`edit`) / `dato_spesifisert` (`spesifisering`, `foresporsel`) | | | | automatisk |
| «Klar til sending» | — | — | — | | `beregnTeStatusSummary`, f.eks. «Krav om N dagers fristforlengelse», «Svarer på forespørsel: utsatt beregning» |
| Vedlegg | `vedlegg_ids` | | Nei | | |

Ikke i skjemaet: `fremdriftshindring_dokumentasjon` og `ny_sluttdato` (`FristData`).

**Serverens virkning** (`_handle_frist`): «Hvis spesifisert krav sendes uten at varsel (§33.4)
er sendt først, regnes det spesifiserte kravet også som varsel» (`frist.frist_varsel =
spesifisert_varsel`). `frist_varsel` fra hendelsen brukes bare når sporet ikke har
konsekvensvarsler. Modellen krever `antall_dager` og `begrunnelse` når `varsel_type =
spesifisert` (`FristData.validate_frist_fields`).

---

## 7. TE: Trekk

Hvem: TE. Spor: grunnlag, vederlag, frist. Kilde: `WithdrawModal.svelte`, `onconfirm` i
`Kontrollrommet.svelte`, `ActionBar.svelte`, `timeline_service.py`
(`_handle_grunnlag_trukket`, `_check_alle_krav_trukket`).

| UI-tekst | Felt | Verdier | Påkrevd | Vises når | Appen regner ut |
| --- | --- | --- | --- | --- | --- |
| «Trekk tilbake {grunnlaget/vederlagskravet/fristkravet}» | (hendelsestypen) | `grunnlag_trukket`, `vederlag_krav_trukket`, `frist_krav_trukket` | — | grunnlag: alltid; frist: når noe er sendt; vederlag: når metode eller varsler finnes | — |
| «Begrunnelse (valgfritt)» | `begrunnelse` | fritekst | Nei | alltid | — |
| «Kaskadeeffekt» | — | — | — | grunnlag | Tekst: «Trekking av grunnlaget vil automatisk trekke tilbake vederlagskravet og fristkravet.» Serveren gjør det. |
| «Siste aktive krav» | — | — | — | vederlag eller frist, når det andre sporet har krevd verdi 0 | Tekst: «Trekking vil automatisk trekke grunnlaget …». Serveren trekker grunnlaget når begge krav er inaktive (`trukket_alle_krav`). |

Trekk sendes uten brevforhåndsvisning og uten `brev` (`store.submit` direkte). Serveren
krever at sporet er aktivt (`TRACK_ACTIVE`).

---

## 8. BH: Svar på grunnlaget

Hvem: BH. Spor: grunnlag. Hendelse: `respons_grunnlag`, eller `respons_grunnlag_oppdatert` når
det finnes et svar etter siste krav. Sendes som «Ferdigstill vurdering» til
godkjenningspakken (`review.prepare`). Kilde: `GrunnlagForm.svelte` (`allAnswered`, `send`),
`grunnlagDomain.ts` (`getDefaults`, `getVerdictOptions`, `erPrekludert`, `buildEventData`,
`beregnPassivitet`), `kontraktsbord/endringsordre.ts` (`erEndringsordre`, `ENDRINGSORDREVARSEL`).

| UI-tekst | Felt | Verdier | Påkrevd | Vises når | Appen regner ut |
| --- | --- | --- | --- | --- | --- |
| «Varsling» (§ 32.2): «Ble varselet sendt uten ugrunnet opphold?» «Ja, i tide» / «Nei, prekludert» | `grunnlag_varslet_i_tide` | `true`, `false` | Ja når vist | ENDRING og underkategori ≠ EO | `prekludert = false-svar`; merker grunnlagsvurderingen «Subsidiært» og viser «Varselet er vurdert som for sent. Vurderingen av grunnlaget gjelder subsidiært.» |
| «Kontraktsmessig grunnlag»: «Anerkjent» / «Bestridt» / «Frafalt» | `resultat` | `godkjent`, `avslatt`, `frafalt` | Ja | «Frafalt» bare ved IRREG og VALGRETT (§ 32.3 c) | Ved `avslatt`: «Vederlags- og fristkravet behandles subsidiært.» |
| Endringsordrevarsel | — | — | — | når kjernen sier svaret blir endringsordre (godkjent uten § 32.2-innsigelse, ENDRING uten EO) | Tekst «Svaret blir en endringsordre etter § 32.3 første ledd a … Byggherren kan ikke endre godkjenningen av grunnlaget etterpå.» |
| «Begrunnelse» | `begrunnelse` | rik tekst | **Nei** (ikke i `allAnswered`; tom streng godtas av modellen) | alltid | Ingen generert tekst |
| (ingen UI) | `dager_siden_varsel` | — | — | — | Sendes aldri: `deriveGrunnlagDomainConfig` setter ikke `dato_varslet`, så `beregnPassivitet` gir 0 |
| (ingen UI) | `akseptert_kategori` | — | — | — | Finnes i `GrunnlagResponsData`, ikke i skjemaet |
| — | `regelversjon`, `grunnlag_event_id` eller `original_respons_id` + `dato_endret` | | | | automatisk |
| Vedlegg | `vedlegg_ids` | | Nei | | |

Standardverdier: i et nytt svar er ingenting forhåndsvalgt. I et oppdatert svar til samme
kravversjon forhåndsvelges forrige `resultat` og `grunnlag_varslet_i_tide` (eller `true`)
(`getDefaults`, `isUpdateMode`).

**Serverens virkning:** godkjent uten § 32.2-innsigelse låser grunnlaget; § 32.2-innsigelse gir
status `under_forhandling` (`timeline_service.py`, rundt linje 715).

---

## 9. BH: Fristvarsel uten dager – innsigelse eller forespørsel

Hvem: BH. Spor: frist. Vises i stedet for `FristForm` når fristsporet har status `sendt` og
`krevd_dager` ikke er satt (`Kontrollrommet.svelte`, `bhSvarerPaaFristvarsel`;
`fristVarselDomain.ts`, `kravetErSpesifisert`). Kilde: `FristVarselForm.svelte`,
`fristVarselDomain.ts` (`tilgjengeligeHandlinger`, `innsigelseTekst`, `foresporselTekst`,
`buildEventData`), `backend/constants/frist_foresporsel.json`.

| UI-tekst | Felt | Verdier | Påkrevd | Vises når | Appen regner ut |
| --- | --- | --- | --- | --- | --- |
| «Handling» (§ 5 / § 33.6.2): «Innsigelse mot sen varsling» | hendelsestype | `frist_innsigelse_sendt` | ett valg | når `frist_varsel_ok !== false` (ingen innsigelse fra før) | Fast tekst: «Byggherren gjør gjeldende at varselet om fristforlengelse datert {dato} ikke er gitt uten ugrunnet opphold, jf. NS 8407 § 33.4 og § 5 tredje ledd. Krav på fristforlengelse tapes dersom det ikke varsles innen fristen (§ 33.4 annet ledd).» |
| «Be om spesifisert krav» | hendelsestype | `frist_foresporsel_sendt` | ett valg | når ingen forespørsel venter på svar | Fast tekst fra `frist_foresporsel.json` (§ 33.6.2 første ledd, med a), b) og virkningen) |
| «Svarfrist»: «Be om svar innen (valgfritt)» | `svarfrist` | dato | Nei | forespørsel | Setning «Byggherren ber om svar innen {dato}.» føyes til |
| «Fast tekst i brevet» | — | — | — | etter valg | vises, kan ikke redigeres |
| «Utdypende begrunnelse» | del av `begrunnelse` (`<p>{fast tekst}</p>{tillegg}`) | rik tekst | Nei | etter valg | — |
| — | `frist_krav_id` | siste fristkrav | — | | automatisk |
| Vedlegg | `vedlegg_ids` | | Nei | | |

Sendes med brevkontroll (`claimReview.submit(..., 'BH')`) og så direkte (`store.submit`),
**ikke** gjennom den interne godkjenningen. Serveren avviser en forespørsel der den faste
teksten mangler eller er endret, både i begrunnelsen og i brevet
(`FristForesporselData.validate_fast_tekst`). Ingen av handlingene setter resultat eller gjør
sporet avslått (vedtak 3.1, 23.09, kommentaren i `events.py`).

---

## 10. BH: Svar på krav om vederlagsjustering

Hvem: BH. Spor: vederlag. Hendelse: `respons_vederlag` (`vederlag_krav_id`) eller
`respons_vederlag_oppdatert` (`original_respons_id`, `dato_endret`, `vurdering_begrunnelse`).
Kilde: `VederlagForm.svelte` (`preklusjonsLinjer`, `kravlinjer`, `allAnswered`,
`resultatRader`, `send`), `vederlagDomain.ts` (`getDefaults`, `beregnAlt`, `beregnTotaler`,
`resultatAvBelop`, `buildEventData`), `deriveConfig.ts` (`deriveVederlagDomainConfig`),
`begrunnelse/vederlagBegrunnelse.ts`, `GeneratedReasoning.svelte`, `PositionExplanation.svelte`.

### 10.1 Sammendrag av TEs krav (bare visning)

«Entreprenørens krav»: beregningsmetode, «Hovedkrav», «Rigg og drift», «Produktivitetstap» og
«Sum krevd» (sum av linjene når flere enn én), og TEs begrunnelse.

### 10.2 Valg

| UI-tekst | Felt | Verdier | Påkrevd | Vises når | Appen regner ut |
| --- | --- | --- | --- | --- | --- |
| «Preklusjon» (§34.1.2 / §34.1.3): «Er kravene varslet innen kontraktens varslingsfrister?» | — | — | — | når rigg, produktivitet eller kategori SVIKT/ANDRE | — |
| «Varsling hovedkrav (§ 34.1.2)» «Ja, i tide» / «Nei, prekludert», med «Sendt {dato} · opprinnelig krav» | `hovedkrav_varslet_i_tide` | `true`, `false` | Ja når vist | kategori SVIKT eller ANDRE (ikke ENDRING, ikke FORCE_MAJEURE) | `hovedkravPrekludert` |
| «Varsling rigg og drift (§ 34.1.3)» | `rigg_varslet_i_tide` | `true`, `false` | Ja når vist | TE har rigg-linje | `riggPrekludert`; datoen er `rigg_drift_varsel` (fra konsekvensvarsel), ellers ingen dato |
| «Varsling produktivitetstap (§ 34.1.3)» | `produktivitet_varslet_i_tide` | `true`, `false` | Ja når vist | TE har produktivitetslinje | `produktivitetPrekludert` |
| «Beregningsmetode» (§ 34.2): «TE krever {metode}. Aksepterer du beregningsmetoden?» Ja / Nei | `aksepterer_metode` | `true`, `false` | Ja | alltid | `harMetodeendring`; resultatet blir aldri «godkjent» når metoden ikke aksepteres; trigger `metode_avslatt` |
| «Foretrukket metode» | `oensket_metode` | de to andre metodene | Ja ved Nei | `aksepterer_metode = false` | — |
| Per linje: «Hovedkrav» (§ 34.1.1–34.1.2), «Rigg og drift» (§ 34.1.3), «Produktivitetstap» (§ 34.1.3), «Krevd: X kr» | `hovedkrav_vurdering`, `rigg_vurdering`, `produktivitet_vurdering` | `godkjent` / `delvis` / `avslatt`, vist som «Godkjent» / «Delvis godkjent» / «Avslått», eller «Fullt beløp» / «Redusert beløp» / «Null» når hele svaret er subsidiært eller linjen er prekludert | Ja for hver vist linje | rigg og produktivitet bare når TE har linjen | Linjen merkes «Subsidiært» når prekludert |
| «Godkjent beløp» / «Subsidiært vurdert beløp», «Av X kr krevd» | `hovedkrav_godkjent_belop`, `rigg_godkjent_belop`, `produktivitet_godkjent_belop` | heltall, **avgrenset til krevd beløp** | Ja ved `delvis` | `delvis` | Ved `godkjent` = krevd, ved `avslatt` = 0 (`buildEventData`) |
| «Begrunnelse»: «Hentet fra vurderingen» (låst) + «Utdypende begrunnelse (valgfritt)» | `begrunnelse` (generert + «Utdypende begrunnelse» + tillegg), `auto_begrunnelse`, `tilleggs_begrunnelse` | — | Generert tekst sikrer at feltet ikke er tomt | når metode og hovedkrav er vurdert | Se 10.4 |
| (ingen UI) | `hold_tilbake` | alltid `false` | — | — | `kanHoldeTilbake` (§ 30.2, regningsarbeid uten overslag) regnes ut, men skjemaet sender alltid `false`; resultatet `hold_tilbake` kan ikke velges |
| (ingen UI) | `ep_justering_varslet_i_tide`, `ep_justering_akseptert` | alltid tomme | — | — | `maSvarePaJustering` (§ 34.3.3) regnes ut, men har ingen kontroll. Merk: modellen heter feltet `varsel_justert_ep_ok`, skjemaet `ep_justering_varslet_i_tide`; ikke kontrollert hva serveren gjør med det ukjente navnet |
| (ingen UI) | `begrunnelse_varsel`, `frist_for_spesifikasjon`, `vederlagsmetode` | — | — | — | Finnes i `VederlagResponsData`, ikke i skjemaet |
| Vedlegg | `vedlegg_ids` | | Nei | | |

### 10.3 Utregning

| Utregning | Regel i koden | Felt |
| --- | --- | --- |
| Hele svaret subsidiært (grunnlaget) | `grunnlagStatus === 'avslatt'` eller ENDRING uten EO med `grunnlag_varslet_i_tide = false`. I godkjenningsflyten brukes BHs egen ferdigstilte grunnlagsvurdering (`effectiveGrunnlag`). Gir merket «Subsidiært» og en merknad, men **endrer ikke beløpsutregningen** | ingen eget felt |
| Prinsipalt godkjent | sum av ikke-prekluderte linjer; prekludert linje = 0 | `total_godkjent_belop` |
| Krevd | sum av alle linjer, også prekluderte | `total_krevd_belop` |
| Prinsipalt resultat | B-13: 0 kr → `avslatt`; godkjent ≥ krevd (til nærmeste krone) og metode akseptert → `godkjent`; ellers `delvis_godkjent` | `beregnings_resultat` |
| Subsidiært | bare når minst én linje er prekludert: alle linjer vurdert uten preklusjon | `subsidiaer_resultat`, `subsidiaer_godkjent_belop`, `subsidiaer_begrunnelse` (= samme tekst som `begrunnelse`) |
| Triggere | `preklusjon_hovedkrav`, `preklusjon_rigg`, `preklusjon_produktivitet`, `reduksjon_ep_justering` (kan ikke inntreffe i dag), `metode_avslatt` | `subsidiaer_triggers` |
| Resultatboks | «BH godkjenner / godkjenner delvis / avslår kravet prinsipalt», tabell Krav / Krevd / Prinsipalt godkjent / Subsidiært vurdert / Totalt, `PositionExplanation` («Subsidiært vurderes vederlaget til X kr, dersom innsigelsene ikke fører frem.», «Innsigelser: …» / «Prinsipalt avslag bygger på: …») | — |

### 10.4 Generert begrunnelse

`generateVederlagResponseBegrunnelse` skriver BHs tekst av valgene, for eksempel: «Byggherren
godtar (ikke) den foreslåtte beregningsmetoden …», «{Krav} på X kr avvises prinsipalt som
prekludert iht. §34.1.2, da varselet ikke ble fremsatt «uten ugrunnet opphold» …»,
«Subsidiært, dersom … ikke anses prekludert, …», «Samlet … utgjør etter dette X kr»,
«Grunnlagsvarselet ble ikke fremsatt «uten ugrunnet opphold» (§32.2). Vurderingen av
vederlagskravet nedenfor gjelder derfor subsidiært …», «Kontraktsforholdet er avvist. …».
BH kan ikke redigere den genererte teksten, bare legge til («Beløp, dager og konklusjoner
endres i valgene over.»).

### 10.5 Standardverdier

Nytt svar: ingenting forhåndsvalgt. Oppdatert svar til samme kravversjon: forrige verdier
forhåndsvelges, og der forrige svar mangler en verdi, settes `true` for varslingsspørsmålene
og metoden og `godkjent` for hovedkravet (`getDefaults`, `?? true`, `?? 'godkjent'`).

---

## 11. BH: Svar på krav om fristforlengelse (med dager)

Hvem: BH. Spor: frist. Hendelse: `respons_frist` eller `respons_frist_oppdatert`
(`original_respons_id`). Kilde: `FristForm.svelte` (`allAnswered`, `send`, malen),
`fristDomain.ts` (`getDefaults`, `beregnVisibility`, `beregnPreklusjon`, `beregnReduksjon`,
`beregnAlt`, `buildEventData`), `deriveConfig.ts` (`deriveFristDomainConfig`),
`begrunnelse/fristBegrunnelse.ts`.

### 11.1 Valg

| UI-tekst | Felt | Verdier | Påkrevd | Vises når | Appen regner ut |
| --- | --- | --- | --- | --- | --- |
| «Varsling og frister» (§ 33.4 / § 33.6): «Foreløpig varsel (§ 33.4)» «Ja, i tide» / «Nei, for sent», med «Sendt {dato}» | `frist_varsel_ok` | `true`, `false` | Ja når vist | `varsel_type = varsel`; eller `spesifisert` uten tidligere uttrykkelig BH-standpunkt om varselet (`harTidligereVarselITide`); ved svar på forespørsel bare når BH har sendt innsigelse | `erPrekludert`; **forhåndsvalgt «Nei»** når BH har sendt innsigelse (`harInnsigelseMotVarsel`) |
| «Spesifisert krav (§ 33.6.1)» «Ja, i tide» / «Nei, for sent» | `spesifisert_krav_ok` | `true`, `false` | Ja når vist | `spesifisert`, ikke svar på forespørsel | `erRedusert` (§ 33.6.1): merker utmålingen «Subsidiært» og viser «Det spesifiserte kravet er fremsatt for sent. Utmålingen nedenfor gjelder subsidiært og begrenses til det åpenbare.» Dagene reduseres ikke automatisk |
| «Svar på forespørsel (§ 33.6.2)» «Ja, i tide» / «Nei, prekludert» | `foresporsel_svar_ok` | `true`, `false` | Ja når vist | kravet besvarer en forespørsel (`kravet_besvarer_foresporselen`) | `false` → `erPrekludert` |
| «Årsakssammenheng» (§ 33.1): «Foreligger det en hindring …?» «Ja, hindring» / «Nei, ingen hindring» | `vilkar_oppfylt` | `true`, `false` | Ja | alltid | `false` → prinsipalt avslått, dagene blir subsidiære (#211) |
| «Utmåling» (§ 33.5): «Godkjent fristforlengelse» / «Subsidiært vurdert fristforlengelse», «Av N dager krevd» | `godkjent_dager` | heltall 0 … krevd | Ja | alltid | Avgrenset til krevd |
| «Begrunnelse»: generert (låst) + «Utdypende begrunnelse (valgfritt)» | `begrunnelse`, `auto_begrunnelse`, `tilleggs_begrunnelse` | — | generert tekst sikrer innhold | når årsakssammenheng og dager er besvart | Se 11.3 |
| (ingen UI) | `ny_sluttdato`, `begrunnelse_varsel` | — | — | — | Finnes i `FristResponsData`, ikke i skjemaet |
| Vedlegg | `vedlegg_ids` | | Nei | | |

### 11.2 Utregning

| Utregning | Regel | Felt |
| --- | --- | --- |
| Preklusjon | svar på forespørsel for sent; eller varsel og `frist_varsel_ok = false`; eller spesifisert uten tidligere BH-standpunkt og `frist_varsel_ok = false` | (inngår i resultat og triggere) |
| Prinsipalt resultat | prekludert eller ingen hindring → `avslatt`; ellers B-13: 0 dager → `avslatt`, alle dager → `godkjent`, ellers `delvis_godkjent` | `beregnings_resultat`; `godkjent_dager` = 0 ved prinsipalt avslag |
| Subsidiært | når prekludert eller ingen hindring: resultat av dagene alene | `subsidiaer_resultat`, `subsidiaer_godkjent_dager` (tom når subsidiært avslått), `subsidiaer_begrunnelse` |
| Triggere | `grunnlag_avslatt` (når grunnlaget er avslått), `preklusjon_varsel`, `reduksjon_spesifisert`, `ingen_hindring` | `subsidiaer_triggers` |
| Hele svaret subsidiært (grunnlaget) | grunnlag avslått eller § 32.2-preklusjon: merknad og «Subsidiært»-merking; endrer ikke resultatet | — |
| Resultatboks | «BH godkjenner / godkjenner delvis / avslår kravet prinsipalt», Krevd / Prinsipalt godkjent / Subsidiært vurdert, § 33.6.1-merknad | — |
| Forseringsrisiko | ved prinsipalt avslag: «Forseringsrisiko etter § 33.8. Dersom avslaget er uberettiget, kan TE velge å anse det som et pålegg om forsering.» | — |
| — | `krevd_dager`, `frist_krav_id`, `regelversjon` | automatisk |

Merk: `vederlagDomain` legger ikke grunnlagstriggerne i `subsidiaer_triggers` (de vises bare i
`PositionExplanation`), mens `fristDomain` legger `grunnlag_avslatt` i nyttelasten. Serveren
regner ut og overskriver triggerne (2.6); om den legger til `grunnlag_avslatt`, er ikke
kontrollert.

### 11.3 Generert begrunnelse

`generateFristResponseBegrunnelse` skriver for eksempel: «Byggherren gjør gjeldende at varselet
ikke ble fremsatt «uten ugrunnet opphold». Kravet er derfor prinsipalt tapt etter §33.4. …»,
«Kravet avvises som prekludert iht. §33.6.2 tredje ledd, jf. §5. …», «Varslingskravene i
§33.4 anses oppfylt.», «Det erkjennes/bestrides at forholdet har hindret fremdriften, jf.
§33.1.», «Subsidiært, hva gjelder antall dager: …», «Byggherren gjør oppmerksom på at
dersom avslaget skulle vise seg å være uberettiget, …» (forsering og 30 %-grensen).

### 11.4 Standardverdier og rekkevidde

Nytt svar: ingenting forhåndsvalgt, unntatt `frist_varsel_ok = false` etter innsigelse. Oppdatert
svar til samme kravversjon: forrige verdier, med `true` og krevde dager der de mangler
(`getDefaults`). Grenen for `begrunnelse_utsatt` i `FristForm` nås ikke gjennom
`Kontrollrommet`, fordi et krav uten `krevd_dager` går til `FristVarselForm` (antakelse ut
fra `kravetErSpesifisert`; ikke kjørt).

---

## 12. BH: Brev og intern godkjenning

Kilde: `ClaimApprovalView.svelte`, `approval/context.svelte.ts` (`prepare`, `command`),
`approval/domain.ts` (`ApprovalCommand`), `approval/authority.ts` (`calculateAuthority`,
ikke lest i detalj), `backend/services/approval_service.py` (`publish`, ikke lest i detalj).

| UI-tekst | Hva det gjør | Felt / kommando |
| --- | --- | --- |
| «Ferdigstill vurdering» (i sporskjemaet) | lagrer vurderingen som `ferdigstilt` med hendelsestype, nyttelast, skjemautkast, krav-ID, kravversjon og grunnlagsgrunnlag (`basis`) | `prepare` |
| Innledning / Avslutning (redigerbare tekstfelt) | brevets ramme | `saveLetter` |
| «Se beregning · fullmaktsmatrise januar 2026» | «Høyeste samlede standpunkt legges til grunn. Alternative standpunkter summeres ikke.» Frist verdsettes som dager × dagmulktssats | visning |
| «Send svar» / «Send til godkjenning» | etter egen fullmakt | `package`, eventuelt `publish` |
| «Godkjenn» / «Godkjenn og send», «Returner» («Hva må saksbehandler endre?»), «Trekk fra godkjenning», «Prøv sending igjen» | godkjenningskjeden | `approve`, `return`, `withdraw`, `publish` |
| Endringsordrevarsel | når et svar på grunnlaget i pakken blir endringsordre | `brevetBlirEndringsordre` |

Publisering skriver hendelsene i pakken med frosset brev (antakelse ut fra
`approval_service.py`, `mark_approved` og `publish`; ikke lest i sin helhet).

---

## 13. Kontrollpunktene i premissene: hva koden gjør i dag

| # | Kontrollpunkt | Funn (lest ut av koden) | Kilde |
| --- | --- | --- | --- |
| K1 | Kravet brukt som varsel etter § 33.4 | Ja, to steder. Klienten setter `frist_varsel` = dagens dato på et spesifisert krav uten tidligere varsel, og serveren setter `frist_varsel = spesifisert_varsel` når varsel mangler. BH får spørsmålet «Foreløpig varsel (§ 33.4)» med denne datoen. TE tar ikke stilling til premisset. | `fristSubmissionDomain.ts`, `buildEventData`; `timeline_service.py`, `_handle_frist` |
| K2 | Dato for spesifisert krav | `spesifisert_varsel.dato_sendt` settes til dagens dato også i `frist_krav_oppdatert`, og serveren overskriver tilstanden. Datoen BH ser ved «Spesifisert krav (§ 33.6.1)» kan dermed bli oppdateringsdatoen. Ikke kjørt. | samme |
| K3 | Utsagn appen sender uten valg | `varslet_for_oppstart: true` ved regningsarbeid; `krever_justert_ep: false` ved enhetspriser; `hold_tilbake: false` i hvert vederlagssvar; metoden er forhåndsvalgt regningsarbeid | `vederlagSubmissionDomain.ts`, `TeVederlagForm.svelte`, `VederlagForm.svelte` |
| K4 | Videreføring av tidligere svar | Bare innenfor samme kravversjon: et oppdatert svar forhåndsfyller forrige valg, med `true` / `godkjent` der verdien mangler. Etter en ny kravversjon er skjemaet tomt (svaret ligger før kravet i `submissionRefs`). Serveren fjerner grunnlagssvaret ved ny grunnlagsversjon. | `getDefaults` i `vederlagDomain.ts`, `fristDomain.ts`, `grunnlagDomain.ts`; `_svaret_faller_bort` |
| K5 | Hvilket krav et svar gjelder | Siste krav velges automatisk; skjemaet viser «Sendt … · rev. N» men lar ikke BH velge. Se 2.3 om mulig avvik mellom skjema og godkjenning. | `submissionRefs`, `claimId` |
| K6 | Generert brevtekst | BH-svarets begrunnelse skrives av valgene og kan bare suppleres. TE-brevets innledning skrives av appen («Vi varsler med dette om …», «Vi viser til …»). Ingen tekst av typen «du har ikke svart» eller «partene er enige» funnet i generatorene som er lest. | `vederlagBegrunnelse.ts`, `fristBegrunnelse.ts`, `letterContentBuilder.ts`, `NewCaseForm.svelte` |
| K7 | Appen konkluderer om rettsstillingen | Knappetekster «Nei, prekludert» (§ 32.2, § 34.1.2/34.1.3, § 33.6.2), stempelet «Prekludert» i resultattabellen og visningen «Prekludert (§ 32.2)» i grunnlagssporet. Det er BHs valg, men ordlyden er appens. | `GrunnlagForm.svelte`, `VederlagForm.svelte`, `FristForm.svelte`, `derive.ts` (`bhPosition`) |
| K8 | Resultatoverskrift når grunnlaget er avslått | Overskriften bygger på `prinsipaltResultat`, som ikke tar hensyn til at hele svaret er subsidiært. Med avslått grunnlag og fullt beløp kan boksen vise «BH godkjenner kravet prinsipalt», mens brevets `decisionSummary` skriver «Prinsipalt avslått (grunnlaget)». Ikke kontrollert i nettleser. | `VederlagForm.svelte` og `FristForm.svelte` (`resultat`); `approval/letter.ts` |
| K9 | Sperrer | Grunnlaget låses ved BH-godkjenning uten § 32.2-innsigelse, og da avvises både TEs oppdatering og BHs oppdaterte svar. `RESPONSE_ACCEPTED` stopper et oppdatert svar etter TEs aksept. Ny vederlagskravhendelse avvises når sporet har krav (`CREATE_ONCE`). | `business_rules.py` |
| K10 | Automatiske virkninger av trekk | Trekk av grunnlaget trekker aktive vederlags- og fristkrav; trekk av siste aktive krav trekker grunnlaget. Modalen varsler om begge. | `timeline_service.py`; `WithdrawModal.svelte` |
| K11 | Tilgjengelige handlinger | BH kan ikke svare på et vederlagsvarsel uten metode. TE kan ikke godta et svar i UI. BHs fristinnsigelse og forespørsel går utenom intern godkjenning. Ikke funnet: «ingen krav» (i tråd med premiss 5). | `ActionBar.svelte`; avsnitt 1 |
| K12 | Summer | BHs vederlagsskjema summerer linjene (prinsipalt og subsidiært hver for seg). Fullmakten bruker høyeste standpunkt og summerer ikke alternativer. TEs «Klar til sending» viser bare hovedkravet. | `vederlagDomain.ts`, `ClaimApprovalView.svelte`, `TeVederlagForm.svelte` |
| K13 | Begrunnelsesplikt | BHs svar på grunnlaget kan sendes uten begrunnelse; vederlag og frist får alltid generert tekst; TE må skrive minst 10 tegn i alle krav unntatt fristvarsel og vederlagsvarsel. | skjemaene |
| K14 | «Venter på svar» | `ActionBar` viser «Avventer svar fra {BH}» / «Kravet er ikke besvart» av `bh_resultat`, og «Forespørsel om spesifisert krav sendt» av `foresporsel_krav_id`. Fristveiledning i saksoversikten (`domain/followUp.ts`) er ikke kartlagt. | `ActionBar.svelte` |

---

## 14. Ikke funnet eller ikke kontrollert

- Ikke kjørt i nettleser eller mot testbasen; alle virkninger er lest ut av koden.
- Demomodusen (`$lib/mockup/store.svelte`) er ikke kartlagt; skjemaene har egne demogrener.
- `approval/authority.ts`, `approval/domain.ts` og `backend/services/approval_service.py` er bare
  lest i utsnitt.
- Hvordan serveren behandler felt skjemaet sender som modellen ikke har
  (`ep_justering_varslet_i_tide`, `auto_begrunnelse`, `vurdering_begrunnelse`,
  `dato_revidert`, `dato_spesifisert`, `dato_endret`, `er_svar_pa_foresporsel`,
  `vilkar_oppfylt` i fristkravet): `SakEvent` har `extra: allow`, men datamodellene er ikke
  kontrollert felt for felt.
- Om fristsporet fortsatt har status `sendt` etter innsigelse eller forespørsel (avgjør om
  `FristVarselForm` vises igjen): ikke kontrollert.
- Om «Trekk» og «Oppdater begrunnelse» skjules for et låst eller trukket spor andre steder enn
  i `ActionBar`: ikke kontrollert.
- Interne notater: ingen inngang funnet i `kontraktsbord/`.
- TS-kjernens kommandoer (`kjerne/`) og testskiva `/kjerne` er ikke sammenliknet med skjemaene.
