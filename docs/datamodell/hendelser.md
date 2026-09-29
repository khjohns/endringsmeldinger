# Hendelseskatalogen

> Generert fra docs/datamodell/hendelser.toml og backend-modellene av docs/verktoy/datamodell.py. Rett i katalogen eller modellene, ikke her.

Hver hendelsestype i `EventType`: hvem som sender den, spor, bestemmelse i NS 8407, feltene og hva den gjør med status. Hendelsene ligger i tabellen [`hendelse`](tabeller.md#hendelse), med innholdet i `data`; interne notater ligger i [`notat`](tabeller.md#notat). Sakens samlede status (`overordnet_status`) regnes av sporstatusene i `models/sak_state.py`.

Hvem som sender, modellen, forretningsreglene og feltene er hentet fra koden, og testene i `backend/tests/test_datamodell/` holder dem like. Det viser at katalogen beskriver koden, ikke at koden er riktig. Beskrivelsen, bestemmelsen og virkningen på status er skrevet for hånd, med belegg.

## Bestemmelsene og kildene

| Kilde | Betyr |
| --- | --- |
| vedtak | Et vedtak i hovedplanen (3.1) eller en ADR |
| kode | Koden oppgir bestemmelsen. Ikke kontrollert mot standardteksten, som ikke ligger i repoet |
| oppdragsgiver | Oppdragsgivers svar, med dato |
| ikke kontrollert | Ingen har kontrollert det |

## Felles for alle hendelser

Konvolutten, som `to_cloudevent` legger i egne kolonner, ikke i `data`.

| Felt i modellen | Kolonne | Innhold |
| --- | --- | --- |
| `event_id` | `event_id` | Unik ID. Settes av serveren; en verdi fra klienten avvises. |
| `sak_id` | `sak_id, subject` | Saken hendelsen hører til. |
| `event_type` | `event_type, type` | Hendelsestypen. `type` har i tillegg prefikset `no.oslo.koe.` (CloudEvents). |
| `tidsstempel` | `time` | Når serveren tok imot hendelsen, i UTC. Settes av serveren; en verdi fra klienten avvises. |
| `aktor_id` | `actorid` | `app_users.id`, aldri et navn. Settes av serveren. |
| `aktor_rolle` | `actorrole` | TE eller BH. Settes av serveren: kontraktsrollen i sesjonen, forfatterens side for webhooken, og fast rolle i tjenestene som bare skriver den ene sidens hendelser. |
| `aktor_team_id` | `actorteam` | Catenda-team-ID til aktørens organisasjon. Settes av serveren. |
| `kommentar` | `comment` | Valgfri kommentar. |
| `refererer_til_event_id` | `referstoid` | Hendelsen dette er et svar på, for eksempel kravet et BH-svar gjelder. |
| (ingen) | `versjon` | Løpenummeret i saken, satt av lageret. Det er ikke feltet `versjon` på kravhendelsene, som ikke lagres. |
| (ingen) | `prosjekt_id` | Stemples av lageret fra det autoriserte prosjektet. |

## Oversikt

| Hendelsestype | Hvem sender | Spor | Sakstype | Lagres i |
| --- | --- | --- | --- | --- |
| [`grunnlag_opprettet`](#grunnlag_opprettet) | TE | grunnlag | standard | `hendelse` |
| [`grunnlag_oppdatert`](#grunnlag_oppdatert) | TE | grunnlag | standard | `hendelse` |
| [`grunnlag_trukket`](#grunnlag_trukket) | TE | grunnlag | standard | `hendelse` |
| [`vederlag_krav_sendt`](#vederlag_krav_sendt) | TE | vederlag | standard | `hendelse` |
| [`vederlag_krav_oppdatert`](#vederlag_krav_oppdatert) | TE | vederlag | standard | `hendelse` |
| [`vederlag_krav_trukket`](#vederlag_krav_trukket) | TE | vederlag | standard | `hendelse` |
| [`frist_krav_sendt`](#frist_krav_sendt) | TE | frist | standard | `hendelse` |
| [`frist_krav_oppdatert`](#frist_krav_oppdatert) | TE | frist | standard | `hendelse` |
| [`frist_krav_spesifisert`](#frist_krav_spesifisert) | TE | frist | standard | `hendelse` |
| [`frist_krav_trukket`](#frist_krav_trukket) | TE | frist | standard | `hendelse` |
| [`respons_grunnlag`](#respons_grunnlag) | BH | grunnlag | standard | `hendelse` |
| [`respons_grunnlag_oppdatert`](#respons_grunnlag_oppdatert) | BH | grunnlag | standard | `hendelse` |
| [`respons_vederlag`](#respons_vederlag) | BH | vederlag | standard | `hendelse` |
| [`respons_vederlag_oppdatert`](#respons_vederlag_oppdatert) | BH | vederlag | standard | `hendelse` |
| [`respons_frist`](#respons_frist) | BH | frist | standard | `hendelse` |
| [`respons_frist_oppdatert`](#respons_frist_oppdatert) | BH | frist | standard | `hendelse` |
| [`te_aksepterer_respons`](#te_aksepterer_respons) | TE | valgt i hendelsen | standard | `hendelse` |
| [`forsering_varsel`](#forsering_varsel) | TE | ingen | forsering | `hendelse` |
| [`forsering_respons`](#forsering_respons) | BH | ingen | forsering | `hendelse` |
| [`forsering_stoppet`](#forsering_stoppet) | TE | ingen | forsering | `hendelse` |
| [`forsering_kostnader_oppdatert`](#forsering_kostnader_oppdatert) | TE | ingen | forsering | `hendelse` |
| [`forsering_koe_lagt_til`](#forsering_koe_lagt_til) | TE | ingen | forsering | `hendelse` |
| [`forsering_koe_fjernet`](#forsering_koe_fjernet) | TE | ingen | forsering | `hendelse` |
| [`sak_opprettet`](#sak_opprettet) | TE eller BH | ingen | standard, forsering, endringsordre | `hendelse` |
| [`internt_notat`](#internt_notat) | TE eller BH | valgt i hendelsen | standard, forsering, endringsordre | `notat` |
| [`eo_opprettet`](#eo_opprettet) | BH | ingen | endringsordre | `hendelse` |
| [`eo_koe_lagt_til`](#eo_koe_lagt_til) | BH | ingen | endringsordre | `hendelse` |
| [`eo_koe_fjernet`](#eo_koe_fjernet) | BH | ingen | endringsordre | `hendelse` |
| [`eo_utstedt`](#eo_utstedt) | BH | ingen | endringsordre, standard | `hendelse` |
| [`eo_akseptert`](#eo_akseptert) | TE | ingen | endringsordre | `hendelse` |
| [`eo_bestridt`](#eo_bestridt) | TE | ingen | endringsordre | `hendelse` |
| [`eo_revidert`](#eo_revidert) | BH | ingen | endringsordre | `hendelse` |

### `grunnlag_opprettet`

TE varsler forholdet og sitt syn på ansvaret: kategori, beskrivelse og når forholdet ble oppdaget. Varsler om vederlag, rigg/drift, produktivitet og frist kan sendes i samme hendelse (ADR-001).

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | grunnlag |
| Sakstype | standard |
| NS 8407 | Avhenger av kategorien. Grunnlaget er § 33.1 a–c eller § 33.3, med utløsende bestemmelse og varselkrav per underkategori i kategoritabellen, for eksempel § 32.2 for irregulær endring. Varslene i samme hendelse viser til § 34.1, § 34.1.3 og § 33.4. |
| Kilde for bestemmelsen | kode: backend/constants/grunnlag_categories.py; vedtak: ADR-001, beslutning 4 |
| Modell | `GrunnlagEvent`, data `GrunnlagData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: skjemaet for ny sak (NewCaseForm) |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE |
| Virkning på status | Grunnlaget blir `sendt`, versjon 1. Vederlag og frist går fra `ikke_relevant` til `utkast`. Hvert varsel i `varsler` føres inn på vederlags- eller fristsporet med innsendingsdatoen, og et spor som var `ikke_relevant` eller `utkast`, blir `sendt`. Sakstittelen settes om den mangler. |
| Behandler | `TimelineService._handle_grunnlag` |
| Funn | — |
| Belegg | L 29.09: modellen, reglene, `_handle_grunnlag` og `_apply_konsekvensvarsler`, og kallet i NewCaseForm. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `brev` | LetterSnapshot | nei | — |
| `tittel` | tekst | ja | Kort beskrivende tittel for varselet (f.eks. 'Forsinket tegningsunderlag uke 45') |
| `hovedkategori` | tekst | ja | Hovedkategori for ansvarsgrunnlag (f.eks. 'ENDRING', 'SVIKT') |
| `underkategori` | tekst \| liste av tekst | nei | Underkategori(er) - enkelt kode eller liste av koder. Valgfritt for kategorier uten underkategorier (f.eks. Force Majeure) |
| `beskrivelse` | tekst | ja | Detaljert beskrivelse av forholdet som utløste kravet |
| `dato_oppdaget` | tekst | ja | Når forholdet ble oppdaget (YYYY-MM-DD) |
| `varsler` | KonsekvensVarsler | nei | — |
| `grunnlag_varsel` | VarselInfo | nei | Info om når og hvordan BH ble varslet om forholdet |
| `vedlegg_ids` | liste av tekst | nei | Referanser til vedlagte dokumenter (bilder, rapporter, etc.) |

Toppnivåfelt i modellen som ikke lagres: `versjon`.

### `grunnlag_oppdatert`

TE reviderer grunnlaget: ny tittel, kategori, beskrivelse eller dato. Hele grunnlaget sendes på nytt.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | grunnlag |
| Sakstype | standard |
| NS 8407 | Som `grunnlag_opprettet`, uten varslene. |
| Kilde for bestemmelsen | kode: backend/constants/grunnlag_categories.py |
| Modell | `GrunnlagEvent`, data `GrunnlagData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: TeGrunnlagForm, eventuelt gjennom TEs interne kontroll (claimReview) |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, NOT_LOCKED |
| Virkning på status | Versjonen øker. Et `avslatt` grunnlag går tilbake til `sendt`; andre statuser står. Nye varsler avvises: de sendes fra vederlags- eller fristsporet (NOTICE_TRACK, som `validate` sjekker før reglene). |
| Behandler | `TimelineService._handle_grunnlag` |
| Funn | — |
| Belegg | L 29.09: modellen, `validate` og `_handle_grunnlag`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `brev` | LetterSnapshot | nei | — |
| `tittel` | tekst | ja | Kort beskrivende tittel for varselet (f.eks. 'Forsinket tegningsunderlag uke 45') |
| `hovedkategori` | tekst | ja | Hovedkategori for ansvarsgrunnlag (f.eks. 'ENDRING', 'SVIKT') |
| `underkategori` | tekst \| liste av tekst | nei | Underkategori(er) - enkelt kode eller liste av koder. Valgfritt for kategorier uten underkategorier (f.eks. Force Majeure) |
| `beskrivelse` | tekst | ja | Detaljert beskrivelse av forholdet som utløste kravet |
| `dato_oppdaget` | tekst | ja | Når forholdet ble oppdaget (YYYY-MM-DD) |
| `varsler` | KonsekvensVarsler | nei | — |
| `grunnlag_varsel` | VarselInfo | nei | Info om når og hvordan BH ble varslet om forholdet |
| `vedlegg_ids` | liste av tekst | nei | Referanser til vedlagte dokumenter (bilder, rapporter, etc.) |

Toppnivåfelt i modellen som ikke lagres: `versjon`.

### `grunnlag_trukket`

TE trekker ansvarsgrunnlaget, og med det kravene i saken.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | grunnlag |
| Sakstype | standard |
| NS 8407 | Ingen egen bestemmelse. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09 |
| Modell | `WithdrawalEvent`, data `WithdrawalData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: Kontrollrommet |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, TRACK_ACTIVE |
| Virkning på status | Grunnlaget blir `trukket`. Vederlag og frist som er aktive, det vil si ikke `ikke_relevant`, `utkast` eller `trukket`, blir også `trukket` (kaskade). Avvises når grunnlaget er låst, godkjent, ikke sendt, allerede trukket eller oppgjort ved godtatt avslag. |
| Behandler | `TimelineService._handle_grunnlag_trukket` |
| Funn | SD-02 |
| Belegg | L 29.09: `_handle_grunnlag_trukket` og `_rule_grunnlag_can_be_withdrawn`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `begrunnelse` | tekst | nei | Valgfri begrunnelse for tilbaketrekking |

### `vederlag_krav_sendt`

TE varsler eller spesifiserer et vederlagskrav. Med `varsel_type = varsel` er det et rent varsel uten metode og beløp; med `spesifisert` er det et krav med metode, beløp og eventuelle særskilte krav.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | vederlag |
| Sakstype | standard |
| NS 8407 | § 34 (vederlagsjustering): § 34.1 varsel, § 34.1.3 særskilte krav for rigg/drift og produktivitet, § 34.2.1 fastpris eller tilbud, § 34.3 enhetspriser med § 34.3.3 justerte enhetspriser, § 30.2 og § 34.4 regningsarbeid, § 34.4 fradrag. |
| Kilde for bestemmelsen | kode: backend/models/events.py (VederlagData, VederlagsMetode, VederlagKompensasjon); vedtak: ADR-001, DRF-03 i 3.1 (29.09) |
| Modell | `VederlagEvent`, data `VederlagData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: TeVederlagForm, eventuelt gjennom TEs interne kontroll (claimReview) |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, GRUNNLAG_REQUIRED |
| Virkning på status | Et rent varsel fører bare varslene inn på sporet, og sporet blir `sendt` om det var `ikke_relevant` eller `utkast`. Et spesifisert krav setter metode, beløp, begrunnelse og særskilte krav, og sporet blir `sendt`, versjon 1. Sendedatoen for varselet om justerte enhetspriser settes av serveren (DRF-03). |
| Behandler | `TimelineService._handle_vederlag` |
| Funn | — |
| Belegg | L 29.09: modellen, `_handle_vederlag`, `_rule_create_once`. K 29.09: `data` lagres med de beregnede feltene `netto_belop` og `krevd_belop`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `metode` | VederlagsMetode | nei | — |
| `belop_direkte` | tall | nei | For ENHETSPRISER/FASTPRIS_TILBUD: Beløp i NOK |
| `kostnads_overslag` | tall | nei | For REGNINGSARBEID (§30.2): Kostnadsoverslag i NOK |
| `fradrag_belop` | tall | nei | Fradrag i NOK (§34.4) - reduksjon for besparelser |
| `er_estimat` | ja/nei | nei | Om beløpet er et estimat (endelig oppgjør senere) |
| `brev` | LetterSnapshot | nei | — |
| `varsel_type` | «varsel» \| «spesifisert» | nei | — |
| `varsler` | KonsekvensVarsler | nei | — |
| `begrunnelse` | tekst | ja | Begrunnelse for kravet |
| `vedlegg_ids` | liste av tekst | nei | Referanser til vedlagte dokumenter |
| `saerskilt_krav` | SaerskiltKrav | nei | Særskilte krav for rigg/drift og/eller produktivitetstap (§34.1.3) |
| `rigg_drift_varsel` | VarselInfo | nei | Varselinfo for rigg/drift (§34.1.3) - når og hvordan BH ble varslet |
| `krever_justert_ep` | ja/nei | nei | Om kravet krever justering av kontraktens enhetspriser (§34.3.3) |
| `justert_ep_varsel` | VarselInfo | nei | Varselinfo for justerte enhetspriser (§34.3.3) |
| `varslet_for_oppstart` | ja/nei | nei | Ble BH varslet før regningsarbeidet startet? (§34.4) |
| `produktivitetstap_varsel` | VarselInfo | nei | Varselinfo for produktivitetstap (§34.1.3, 2. ledd) |
| `netto_belop` | tall | beregnet | Beregner netto beløp basert på metode. For ENHETSPRISER/FASTPRIS_TILBUD: belop_direkte - fradrag For REGNINGSARBEID: kostnads_overslag - fradrag |
| `krevd_belop` | tall | beregnet | Alias for netto_belop - brukes i state-modellen. Returnerer det totale kravet/kompensasjonen. |

Toppnivåfelt i modellen som ikke lagres: `versjon`.

### `vederlag_krav_oppdatert`

TE reviderer vederlagskravet. Hele kravet sendes på nytt.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | vederlag |
| Sakstype | standard |
| NS 8407 | Som `vederlag_krav_sendt`. |
| Kilde for bestemmelsen | kode: backend/models/events.py (VederlagData) |
| Modell | `VederlagEvent`, data `VederlagData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: TeVederlagForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, GRUNNLAG_REQUIRED, ACTIVE_CLAIM_EXISTS |
| Virkning på status | Som et spesifisert krav, men versjonen øker. Et spor som er `avslatt`, `under_forhandling` eller `delvis_godkjent`, går tilbake til `sendt`. |
| Behandler | `TimelineService._handle_vederlag` |
| Funn | — |
| Belegg | L 29.09: `_handle_vederlag`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `metode` | VederlagsMetode | nei | — |
| `belop_direkte` | tall | nei | For ENHETSPRISER/FASTPRIS_TILBUD: Beløp i NOK |
| `kostnads_overslag` | tall | nei | For REGNINGSARBEID (§30.2): Kostnadsoverslag i NOK |
| `fradrag_belop` | tall | nei | Fradrag i NOK (§34.4) - reduksjon for besparelser |
| `er_estimat` | ja/nei | nei | Om beløpet er et estimat (endelig oppgjør senere) |
| `brev` | LetterSnapshot | nei | — |
| `varsel_type` | «varsel» \| «spesifisert» | nei | — |
| `varsler` | KonsekvensVarsler | nei | — |
| `begrunnelse` | tekst | ja | Begrunnelse for kravet |
| `vedlegg_ids` | liste av tekst | nei | Referanser til vedlagte dokumenter |
| `saerskilt_krav` | SaerskiltKrav | nei | Særskilte krav for rigg/drift og/eller produktivitetstap (§34.1.3) |
| `rigg_drift_varsel` | VarselInfo | nei | Varselinfo for rigg/drift (§34.1.3) - når og hvordan BH ble varslet |
| `krever_justert_ep` | ja/nei | nei | Om kravet krever justering av kontraktens enhetspriser (§34.3.3) |
| `justert_ep_varsel` | VarselInfo | nei | Varselinfo for justerte enhetspriser (§34.3.3) |
| `varslet_for_oppstart` | ja/nei | nei | Ble BH varslet før regningsarbeidet startet? (§34.4) |
| `produktivitetstap_varsel` | VarselInfo | nei | Varselinfo for produktivitetstap (§34.1.3, 2. ledd) |
| `netto_belop` | tall | beregnet | Beregner netto beløp basert på metode. For ENHETSPRISER/FASTPRIS_TILBUD: belop_direkte - fradrag For REGNINGSARBEID: kostnads_overslag - fradrag |
| `krevd_belop` | tall | beregnet | Alias for netto_belop - brukes i state-modellen. Returnerer det totale kravet/kompensasjonen. |

Toppnivåfelt i modellen som ikke lagres: `versjon`.

### `vederlag_krav_trukket`

TE trekker vederlagskravet.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | vederlag |
| Sakstype | standard |
| NS 8407 | Ingen egen bestemmelse. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09 |
| Modell | `WithdrawalEvent`, data `WithdrawalData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: Kontrollrommet |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, TRACK_ACTIVE |
| Virkning på status | Vederlag blir `trukket`. Er frist også `ikke_relevant`, `utkast` eller `trukket`, blir grunnlaget `trukket` (omvendt kaskade). Avvises når kravet er oppgjort; et krav som bare er godkjent subsidiært, kan trekkes (TFR-03). |
| Behandler | `TimelineService._handle_vederlag_trukket` |
| Funn | — |
| Belegg | L 29.09: `_handle_vederlag_trukket`, `_check_alle_krav_trukket` og `_kravet_er_oppgjort`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `begrunnelse` | tekst | nei | Valgfri begrunnelse for tilbaketrekking |

### `frist_krav_sendt`

TE varsler om fristforlengelse eller sender et spesifisert krav. `varsel_type` skiller varsel, spesifisert krav og begrunnelse for at beregning ikke er mulig.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | frist |
| Sakstype | standard |
| NS 8407 | § 33.4 varsel om fristforlengelse, § 33.6.1 spesifisert krav, § 33.6.2 bokstav b begrunnelse for at beregning ikke er mulig. Vilkåret er § 33.1. |
| Kilde for bestemmelsen | kode: backend/models/events.py (FristVarselType, FristData); vedtak: ADR-001 |
| Modell | `FristEvent`, data `FristData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: TeFristForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, GRUNNLAG_REQUIRED |
| Virkning på status | Setter varseltype, varsel- og spesifiseringsdato, krevde dager og begrunnelse. Sporet blir `sendt`, versjon 1. Et spesifisert krav uten tidligere varsel regnes også som varsel. |
| Behandler | `TimelineService._handle_frist` |
| Funn | DRF-02 |
| Belegg | L 29.09: modellen og `_handle_frist`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `brev` | LetterSnapshot | nei | — |
| `varsel_type` | FristVarselType | nei | Type varsel sendt til BH |
| `frist_varsel` | VarselInfo | nei | Info om varsel om fristforlengelse (§33.4) - dato + metode |
| `spesifisert_varsel` | VarselInfo | nei | Info om spesifisert krav (§33.6) - dato + metode (f.eks. formelt brev/epost) |
| `antall_dager` | heltall | nei | Antall dager forlengelse (kun ved spesifisert krav) |
| `begrunnelse` | tekst | nei | Overordnet begrunnelse for fristkravet |
| `fremdriftshindring_dokumentasjon` | tekst | nei | Dokumentasjon av fremdriftshindring (f.eks. påvirkning på fremdriftsplan, kritisk linje) |
| `ny_sluttdato` | tekst | nei | Foreslått ny sluttdato (YYYY-MM-DD) |
| `vedlegg_ids` | liste av tekst | nei | Referanser til vedlagte dokumenter (fremdriftsplan, fremdriftsanalyse, etc.) |

Toppnivåfelt i modellen som ikke lagres: `versjon`.

### `frist_krav_oppdatert`

TE reviderer fristkravet.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | frist |
| Sakstype | standard |
| NS 8407 | Som `frist_krav_sendt`. |
| Kilde for bestemmelsen | kode: backend/models/events.py (FristData) |
| Modell | `FristEvent`, data `FristData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: TeFristForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, GRUNNLAG_REQUIRED, ACTIVE_CLAIM_EXISTS |
| Virkning på status | Versjonen øker, og kravet settes på nytt. Et spor som er `avslatt`, `under_forhandling` eller `delvis_godkjent`, går tilbake til `sendt`. |
| Behandler | `TimelineService._handle_frist` |
| Funn | DRF-02 |
| Belegg | L 29.09: `_handle_frist`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `brev` | LetterSnapshot | nei | — |
| `varsel_type` | FristVarselType | nei | Type varsel sendt til BH |
| `frist_varsel` | VarselInfo | nei | Info om varsel om fristforlengelse (§33.4) - dato + metode |
| `spesifisert_varsel` | VarselInfo | nei | Info om spesifisert krav (§33.6) - dato + metode (f.eks. formelt brev/epost) |
| `antall_dager` | heltall | nei | Antall dager forlengelse (kun ved spesifisert krav) |
| `begrunnelse` | tekst | nei | Overordnet begrunnelse for fristkravet |
| `fremdriftshindring_dokumentasjon` | tekst | nei | Dokumentasjon av fremdriftshindring (f.eks. påvirkning på fremdriftsplan, kritisk linje) |
| `ny_sluttdato` | tekst | nei | Foreslått ny sluttdato (YYYY-MM-DD) |
| `vedlegg_ids` | liste av tekst | nei | Referanser til vedlagte dokumenter (fremdriftsplan, fremdriftsanalyse, etc.) |

Toppnivåfelt i modellen som ikke lagres: `versjon`.

### `frist_krav_spesifisert`

TE spesifiserer antall dager etter et varsel om fristforlengelse, eventuelt som svar på BHs forespørsel.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | frist |
| Sakstype | standard |
| NS 8407 | § 33.6.1 og § 33.6.2. |
| Kilde for bestemmelsen | kode: kommentaren ved EventType.FRIST_KRAV_SPESIFISERT |
| Modell | `FristEvent`, data `FristData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: TeFristForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, GRUNNLAG_REQUIRED, ACTIVE_CLAIM_EXISTS |
| Virkning på status | Samme behandling som `frist_krav_oppdatert`: versjonen øker, og krevde dager settes. |
| Behandler | `TimelineService._handle_frist` |
| Funn | DRF-02 |
| Belegg | L 29.09: `_handle_frist`, der de to typene behandles likt. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `brev` | LetterSnapshot | nei | — |
| `varsel_type` | FristVarselType | nei | Type varsel sendt til BH |
| `frist_varsel` | VarselInfo | nei | Info om varsel om fristforlengelse (§33.4) - dato + metode |
| `spesifisert_varsel` | VarselInfo | nei | Info om spesifisert krav (§33.6) - dato + metode (f.eks. formelt brev/epost) |
| `antall_dager` | heltall | nei | Antall dager forlengelse (kun ved spesifisert krav) |
| `begrunnelse` | tekst | nei | Overordnet begrunnelse for fristkravet |
| `fremdriftshindring_dokumentasjon` | tekst | nei | Dokumentasjon av fremdriftshindring (f.eks. påvirkning på fremdriftsplan, kritisk linje) |
| `ny_sluttdato` | tekst | nei | Foreslått ny sluttdato (YYYY-MM-DD) |
| `vedlegg_ids` | liste av tekst | nei | Referanser til vedlagte dokumenter (fremdriftsplan, fremdriftsanalyse, etc.) |

Toppnivåfelt i modellen som ikke lagres: `versjon`.

### `frist_krav_trukket`

TE trekker fristkravet.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | frist |
| Sakstype | standard |
| NS 8407 | Ingen egen bestemmelse. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09 |
| Modell | `WithdrawalEvent`, data `WithdrawalData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: Kontrollrommet |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, TRACK_ACTIVE |
| Virkning på status | Frist blir `trukket`. Er vederlag også `ikke_relevant`, `utkast` eller `trukket`, blir grunnlaget `trukket` (omvendt kaskade). |
| Behandler | `TimelineService._handle_frist_trukket` |
| Funn | — |
| Belegg | L 29.09: `_handle_frist_trukket` og `_check_alle_krav_trukket`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `begrunnelse` | tekst | nei | Valgfri begrunnelse for tilbaketrekking |

### `respons_grunnlag`

BH svarer på ansvarsgrunnlaget: godkjent, avslått eller frafalt pålegg, og om grunnlaget er varslet i tide.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | grunnlag |
| Sakstype | standard |
| NS 8407 | § 32.2 (varslet i tide, bare ved endring), § 32.3 bokstav c (frafall av pålegg). Passivitet etter § 32.3 annet ledd varsles, men trekkes ikke av systemet. |
| Kilde for bestemmelsen | kode: backend/models/events.py (GrunnlagResponsData, GrunnlagResponsResultat); vedtak: B-13 i 3.1 (24.09) |
| Modell | `ResponsEvent`, data `GrunnlagResponsData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; BHs godkjenningspakke (POST /api/cases/<sak>/approvals, action publish); Frontend: GrunnlagForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, TRACK_SENT, NOT_LOCKED, NOT_ALREADY_RESPONDED |
| Virkning på status | `godkjent` gir `laast` når grunnlaget ikke er merket for sent varslet; merket for sent varslet gir `under_forhandling`. `avslatt` gir `avslatt`, og `frafalt` gir `trukket`. Svaret knyttes til gjeldende versjon av grunnlaget. |
| Behandler | `TimelineService._handle_respons_grunnlag` |
| Funn | DRF-02 |
| Belegg | L 29.09: `_handle_respons_grunnlag`, `_respons_til_status` og `public_event_block_reason`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `grunnlag_event_id` | tekst | nei | — |
| `vedlegg_ids` | liste av tekst | nei | — |
| `brev` | LetterSnapshot | nei | — |
| `resultat` | GrunnlagResponsResultat | nei | BHs vurdering av ansvarsgrunnlaget |
| `begrunnelse` | tekst | nei | BHs begrunnelse for vurderingen |
| `akseptert_kategori` | tekst | nei | BH kan akseptere men kategorisere annerledes (f.eks. fra 'prosjektering' til 'arbeidsgrunnlag') |
| `grunnlag_varslet_i_tide` | ja/nei | nei | §32.2: Var grunnlagsvarselet rettidig? Kun relevant for ENDRING-kategorien. |
| `respondert_versjon` | heltall | nei | Hvilken TE-versjon (0-indeksert) denne responsen gjelder. Settes automatisk av backend. |
| `original_respons_id` | tekst | nei | Event-ID til original respons som oppdateres (for RESPONS_*_OPPDATERT) |
| `spor` | SporType | ja | Står på toppnivå i modellen og legges i `data` ved lagring. |

### `respons_grunnlag_oppdatert`

BH endrer sitt svar på ansvarsgrunnlaget («snuoperasjon»).

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | grunnlag |
| Sakstype | standard |
| NS 8407 | Som `respons_grunnlag`. |
| Kilde for bestemmelsen | kode: samme datamodell som respons_grunnlag |
| Modell | `ResponsEvent`, data `GrunnlagResponsData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; BHs godkjenningspakke; Frontend: GrunnlagForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, TRACK_SENT, NOT_LOCKED, PREVIOUS_RESPONSE |
| Virkning på status | Samme behandling som `respons_grunnlag`. Krever et tidligere svar på gjeldende versjon (PREVIOUS_RESPONSE). |
| Behandler | `TimelineService._handle_respons_grunnlag` |
| Funn | DRF-02 |
| Belegg | L 29.09: handlertabellen i `_apply_event` og `_rule_previous_response`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `grunnlag_event_id` | tekst | nei | — |
| `vedlegg_ids` | liste av tekst | nei | — |
| `brev` | LetterSnapshot | nei | — |
| `resultat` | GrunnlagResponsResultat | nei | BHs vurdering av ansvarsgrunnlaget |
| `begrunnelse` | tekst | nei | BHs begrunnelse for vurderingen |
| `akseptert_kategori` | tekst | nei | BH kan akseptere men kategorisere annerledes (f.eks. fra 'prosjektering' til 'arbeidsgrunnlag') |
| `grunnlag_varslet_i_tide` | ja/nei | nei | §32.2: Var grunnlagsvarselet rettidig? Kun relevant for ENDRING-kategorien. |
| `respondert_versjon` | heltall | nei | Hvilken TE-versjon (0-indeksert) denne responsen gjelder. Settes automatisk av backend. |
| `original_respons_id` | tekst | nei | Event-ID til original respons som oppdateres (for RESPONS_*_OPPDATERT) |
| `spor` | SporType | ja | Står på toppnivå i modellen og legges i `data` ved lagring. |

### `respons_vederlag`

BH svarer på vederlagskravet: varsler i tide, metode, beløp per post, samlet resultat og eventuelt subsidiært standpunkt.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | vederlag |
| Sakstype | standard |
| NS 8407 | § 34.1.2 og § 34.1.3 (preklusjon), § 34.3.3 (justerte enhetspriser), § 30.2 (tilbakeholdelse ved manglende overslag). |
| Kilde for bestemmelsen | kode: backend/models/events.py (VederlagResponsData, SubsidiaerTrigger); vedtak: B-13 i 3.1 (24.09) |
| Modell | `ResponsEvent`, data `VederlagResponsData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; BHs godkjenningspakke; Frontend: VederlagForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, TRACK_SENT, NOT_ALREADY_RESPONDED |
| Virkning på status | Status følger `beregnings_resultat`: `godkjent`, `delvis_godkjent` eller `avslatt`; `hold_tilbake` gir `under_behandling`. Godkjent beløp, metode, varselvurderinger og subsidiært standpunkt settes. Resultatet lagres slik det er sendt, også når vurderingene i samme svar gir et annet (BR-01). |
| Behandler | `TimelineService._handle_respons_vederlag` |
| Funn | BR-01, SD-04, DRF-02 |
| Belegg | L 29.09: `_handle_respons_vederlag`, `_beregnings_resultat_til_status` og `_oppdater_subsidiaert_standpunkt`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `brev` | LetterSnapshot | nei | — |
| `tilleggs_begrunnelse` | tekst | nei | — |
| `vedlegg_ids` | liste av tekst | nei | — |
| `original_respons_id` | tekst | nei | Event-ID til original respons som oppdateres (for RESPONS_*_OPPDATERT) |
| `vederlag_krav_id` | tekst | nei | Event-ID til vederlagskravet som besvares |
| `respondert_versjon` | heltall | nei | Hvilken TE-versjon (0-indeksert) denne responsen gjelder. Settes automatisk av backend. |
| `hovedkrav_varslet_i_tide` | ja/nei | nei | Er vederlagskravet varslet i tide? (§34.1.2) - kun relevant for SVIKT/ANDRE |
| `rigg_varslet_i_tide` | ja/nei | nei | Er rigg/drift-kravet varslet i tide? (§34.1.3) |
| `produktivitet_varslet_i_tide` | ja/nei | nei | Er produktivitetskravet varslet i tide? (§34.1.3) |
| `varsel_justert_ep_ok` | ja/nei | nei | Er det varslet om justerte enhetspriser uten ugrunnet opphold? (§34.3.3) |
| `begrunnelse_varsel` | tekst | nei | Begrunnelse for vurdering av varsler/frister |
| `aksepterer_metode` | ja/nei | nei | Aksepterer BH den foreslåtte vederlagsmetoden? |
| `oensket_metode` | VederlagsMetode | nei | Metode BH ønsker dersom foreslått metode ikke aksepteres |
| `ep_justering_akseptert` | ja/nei | nei | Aksepterer BH justering av enhetspriser? (§34.3.3) |
| `hold_tilbake` | ja/nei | nei | Holder BH tilbake betaling? (§30.2) |
| `vederlagsmetode` | VederlagsMetode | nei | Hvilken metode BH legger til grunn (legacy) |
| `hovedkrav_vurdering` | BelopVurdering | nei | BHs vurdering av hovedkravet |
| `hovedkrav_godkjent_belop` | tall | nei | Godkjent beløp for hovedkravet i NOK |
| `rigg_vurdering` | BelopVurdering | nei | BHs vurdering av rigg/drift-kravet |
| `rigg_godkjent_belop` | tall | nei | Godkjent beløp for rigg/drift i NOK |
| `produktivitet_vurdering` | BelopVurdering | nei | BHs vurdering av produktivitetskravet |
| `produktivitet_godkjent_belop` | tall | nei | Godkjent beløp for produktivitetstap i NOK |
| `beregnings_resultat` | VederlagBeregningResultat | nei | BHs samlede vurdering av kravets størrelse |
| `total_godkjent_belop` | tall | nei | Totalt godkjent beløp i NOK (hovedkrav + særskilte krav) |
| `total_krevd_belop` | tall | nei | Totalt krevd beløp i NOK |
| `begrunnelse` | tekst | nei | Samlet begrunnelse |
| `frist_for_spesifikasjon` | tekst | nei | Frist for TE å levere ytterligere spesifikasjon (YYYY-MM-DD) |
| `subsidiaer_triggers` | liste av SubsidiaerTrigger | nei | Liste over årsaker til subsidiær vurdering |
| `subsidiaer_resultat` | VederlagBeregningResultat | nei | Subsidiært beregningsresultat |
| `subsidiaer_godkjent_belop` | tall | nei | Subsidiært godkjent beløp i NOK (totalt) |
| `subsidiaer_begrunnelse` | tekst | nei | BH's begrunnelse for subsidiær vurdering |
| `spor` | SporType | ja | Står på toppnivå i modellen og legges i `data` ved lagring. |

### `respons_vederlag_oppdatert`

BH endrer sitt svar på vederlagskravet, for eksempel ved å oppheve en tilbakeholdelse.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | vederlag |
| Sakstype | standard |
| NS 8407 | Som `respons_vederlag`. Kommentaren ved typen nevner opphevet tilbakeholdelse (§ 30.2). |
| Kilde for bestemmelsen | kode: kommentaren ved EventType.RESPONS_VEDERLAG_OPPDATERT |
| Modell | `ResponsEvent`, data `VederlagResponsData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; BHs godkjenningspakke; Frontend: VederlagForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, TRACK_SENT, PREVIOUS_RESPONSE |
| Virkning på status | Samme behandling som `respons_vederlag`. Uten `beregnings_resultat` står statusen, og bare feltene som sendes, endres. |
| Behandler | `TimelineService._handle_respons_vederlag` |
| Funn | BR-01, SD-04, DRF-02 |
| Belegg | L 29.09: `_handle_respons_vederlag`; `VederlagResponsData` har ikke feltet `resultat`, så grenen for det gjør ingenting. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `brev` | LetterSnapshot | nei | — |
| `tilleggs_begrunnelse` | tekst | nei | — |
| `vedlegg_ids` | liste av tekst | nei | — |
| `original_respons_id` | tekst | nei | Event-ID til original respons som oppdateres (for RESPONS_*_OPPDATERT) |
| `vederlag_krav_id` | tekst | nei | Event-ID til vederlagskravet som besvares |
| `respondert_versjon` | heltall | nei | Hvilken TE-versjon (0-indeksert) denne responsen gjelder. Settes automatisk av backend. |
| `hovedkrav_varslet_i_tide` | ja/nei | nei | Er vederlagskravet varslet i tide? (§34.1.2) - kun relevant for SVIKT/ANDRE |
| `rigg_varslet_i_tide` | ja/nei | nei | Er rigg/drift-kravet varslet i tide? (§34.1.3) |
| `produktivitet_varslet_i_tide` | ja/nei | nei | Er produktivitetskravet varslet i tide? (§34.1.3) |
| `varsel_justert_ep_ok` | ja/nei | nei | Er det varslet om justerte enhetspriser uten ugrunnet opphold? (§34.3.3) |
| `begrunnelse_varsel` | tekst | nei | Begrunnelse for vurdering av varsler/frister |
| `aksepterer_metode` | ja/nei | nei | Aksepterer BH den foreslåtte vederlagsmetoden? |
| `oensket_metode` | VederlagsMetode | nei | Metode BH ønsker dersom foreslått metode ikke aksepteres |
| `ep_justering_akseptert` | ja/nei | nei | Aksepterer BH justering av enhetspriser? (§34.3.3) |
| `hold_tilbake` | ja/nei | nei | Holder BH tilbake betaling? (§30.2) |
| `vederlagsmetode` | VederlagsMetode | nei | Hvilken metode BH legger til grunn (legacy) |
| `hovedkrav_vurdering` | BelopVurdering | nei | BHs vurdering av hovedkravet |
| `hovedkrav_godkjent_belop` | tall | nei | Godkjent beløp for hovedkravet i NOK |
| `rigg_vurdering` | BelopVurdering | nei | BHs vurdering av rigg/drift-kravet |
| `rigg_godkjent_belop` | tall | nei | Godkjent beløp for rigg/drift i NOK |
| `produktivitet_vurdering` | BelopVurdering | nei | BHs vurdering av produktivitetskravet |
| `produktivitet_godkjent_belop` | tall | nei | Godkjent beløp for produktivitetstap i NOK |
| `beregnings_resultat` | VederlagBeregningResultat | nei | BHs samlede vurdering av kravets størrelse |
| `total_godkjent_belop` | tall | nei | Totalt godkjent beløp i NOK (hovedkrav + særskilte krav) |
| `total_krevd_belop` | tall | nei | Totalt krevd beløp i NOK |
| `begrunnelse` | tekst | nei | Samlet begrunnelse |
| `frist_for_spesifikasjon` | tekst | nei | Frist for TE å levere ytterligere spesifikasjon (YYYY-MM-DD) |
| `subsidiaer_triggers` | liste av SubsidiaerTrigger | nei | Liste over årsaker til subsidiær vurdering |
| `subsidiaer_resultat` | VederlagBeregningResultat | nei | Subsidiært beregningsresultat |
| `subsidiaer_godkjent_belop` | tall | nei | Subsidiært godkjent beløp i NOK (totalt) |
| `subsidiaer_begrunnelse` | tekst | nei | BH's begrunnelse for subsidiær vurdering |
| `spor` | SporType | ja | Står på toppnivå i modellen og legges i `data` ved lagring. |

### `respons_frist`

BH svarer på fristkravet: varsler i tide, om forholdet har hindret fremdriften, antall dager og eventuelt subsidiært standpunkt.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | frist |
| Sakstype | standard |
| NS 8407 | § 33.1 (fremdriftshindring), § 33.4 og § 33.6 (preklusjon og reduksjon), § 33.6.2 (forespørsel om spesifisering), § 33.7 (svarplikt ved spesifisert krav) og § 5 (innsigelse mot sen varsling). |
| Kilde for bestemmelsen | kode: backend/models/events.py (FristResponsData, SubsidiaerTrigger); vedtak: ADR-001, nøytralt fristvarsel i 3.1 (23.09), B-13 i 3.1 (24.09) |
| Modell | `ResponsEvent`, data `FristResponsData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; BHs godkjenningspakke; Frontend: FristForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, TRACK_SENT, NOT_ALREADY_RESPONDED |
| Virkning på status | Status følger `beregnings_resultat`: `godkjent`, `delvis_godkjent` eller `avslatt`. Godkjente dager, ny sluttdato, varselvurderinger, vilkåret og subsidiært standpunkt settes. Et svar med dager på et nøytralt varsel godtas (TFR-06). |
| Behandler | `TimelineService._handle_respons_frist` |
| Funn | BR-01, SD-04, TFR-06, DRF-01 |
| Belegg | L 29.09: `_handle_respons_frist` og `_beregnings_resultat_til_status`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `frist_krav_id` | tekst | nei | — |
| `vedlegg_ids` | liste av tekst | nei | — |
| `brev` | LetterSnapshot | nei | — |
| `tilleggs_begrunnelse` | tekst | nei | — |
| `original_respons_id` | tekst | nei | Event-ID til original respons som oppdateres (for RESPONS_*_OPPDATERT) |
| `respondert_versjon` | heltall | nei | Hvilken TE-versjon (0-indeksert) denne responsen gjelder. Settes automatisk av backend. |
| `frist_varsel_ok` | ja/nei | nei | Er varsel om fristforlengelse sendt i tide? (§33.4). None hvis ikke relevant. |
| `spesifisert_krav_ok` | ja/nei | nei | Er spesifisert krav sendt i tide? (§33.6) |
| `foresporsel_svar_ok` | ja/nei | nei | Er svar på forespørsel sendt i tide? (§33.6.2/§5). None hvis ikke relevant. |
| `har_bh_foresporsel` | ja/nei | nei | Har BH sendt forespørsel om spesifisering? (§33.6.2). Relevant kun hvis krav er sent. |
| `dato_bh_foresporsel` | tekst | nei | Dato BH sendte forespørsel om spesifisering (§33.6.2) - YYYY-MM-DD. Brukes for å beregne om TEs svar kom i tide. |
| `begrunnelse_varsel` | tekst | nei | BHs begrunnelse for vurdering av varsling |
| `vilkar_oppfylt` | ja/nei | nei | Har forholdet medført en faktisk fremdriftshindring? (§33.1) |
| `beregnings_resultat` | FristBeregningResultat | nei | BHs vurdering av antall dager (ren beregning) |
| `godkjent_dager` | heltall | nei | Godkjent antall dager. Innvilges kun hvis Grunnlag også godkjennes. |
| `ny_sluttdato` | tekst | nei | BH-godkjent ny sluttdato (YYYY-MM-DD) |
| `begrunnelse` | tekst | nei | Samlet begrunnelse |
| `frist_for_spesifisering` | tekst | nei | Frist for TE å levere ytterligere spesifikasjon/fremdriftsplan (YYYY-MM-DD) |
| `subsidiaer_triggers` | liste av SubsidiaerTrigger | nei | Liste over årsaker til subsidiær vurdering |
| `subsidiaer_resultat` | FristBeregningResultat | nei | Subsidiært beregningsresultat |
| `subsidiaer_godkjent_dager` | heltall | nei | Subsidiært godkjent antall dager |
| `subsidiaer_begrunnelse` | tekst | nei | BH's begrunnelse for subsidiær vurdering |
| `spor` | SporType | ja | Står på toppnivå i modellen og legges i `data` ved lagring. |

### `respons_frist_oppdatert`

BH endrer sitt svar på fristkravet.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | frist |
| Sakstype | standard |
| NS 8407 | Som `respons_frist`. |
| Kilde for bestemmelsen | kode: samme datamodell som respons_frist |
| Modell | `ResponsEvent`, data `FristResponsData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; BHs godkjenningspakke; Frontend: FristForm |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, TRACK_SENT, PREVIOUS_RESPONSE |
| Virkning på status | Samme behandling som `respons_frist`. Uten `beregnings_resultat` står statusen. |
| Behandler | `TimelineService._handle_respons_frist` |
| Funn | BR-01, SD-04, TFR-06 |
| Belegg | L 29.09: `_handle_respons_frist`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `frist_krav_id` | tekst | nei | — |
| `vedlegg_ids` | liste av tekst | nei | — |
| `brev` | LetterSnapshot | nei | — |
| `tilleggs_begrunnelse` | tekst | nei | — |
| `original_respons_id` | tekst | nei | Event-ID til original respons som oppdateres (for RESPONS_*_OPPDATERT) |
| `respondert_versjon` | heltall | nei | Hvilken TE-versjon (0-indeksert) denne responsen gjelder. Settes automatisk av backend. |
| `frist_varsel_ok` | ja/nei | nei | Er varsel om fristforlengelse sendt i tide? (§33.4). None hvis ikke relevant. |
| `spesifisert_krav_ok` | ja/nei | nei | Er spesifisert krav sendt i tide? (§33.6) |
| `foresporsel_svar_ok` | ja/nei | nei | Er svar på forespørsel sendt i tide? (§33.6.2/§5). None hvis ikke relevant. |
| `har_bh_foresporsel` | ja/nei | nei | Har BH sendt forespørsel om spesifisering? (§33.6.2). Relevant kun hvis krav er sent. |
| `dato_bh_foresporsel` | tekst | nei | Dato BH sendte forespørsel om spesifisering (§33.6.2) - YYYY-MM-DD. Brukes for å beregne om TEs svar kom i tide. |
| `begrunnelse_varsel` | tekst | nei | BHs begrunnelse for vurdering av varsling |
| `vilkar_oppfylt` | ja/nei | nei | Har forholdet medført en faktisk fremdriftshindring? (§33.1) |
| `beregnings_resultat` | FristBeregningResultat | nei | BHs vurdering av antall dager (ren beregning) |
| `godkjent_dager` | heltall | nei | Godkjent antall dager. Innvilges kun hvis Grunnlag også godkjennes. |
| `ny_sluttdato` | tekst | nei | BH-godkjent ny sluttdato (YYYY-MM-DD) |
| `begrunnelse` | tekst | nei | Samlet begrunnelse |
| `frist_for_spesifisering` | tekst | nei | Frist for TE å levere ytterligere spesifikasjon/fremdriftsplan (YYYY-MM-DD) |
| `subsidiaer_triggers` | liste av SubsidiaerTrigger | nei | Liste over årsaker til subsidiær vurdering |
| `subsidiaer_resultat` | FristBeregningResultat | nei | Subsidiært beregningsresultat |
| `subsidiaer_godkjent_dager` | heltall | nei | Subsidiært godkjent antall dager |
| `subsidiaer_begrunnelse` | tekst | nei | BH's begrunnelse for subsidiær vurdering |
| `spor` | SporType | ja | Står på toppnivå i modellen og legges i `data` ved lagring. |

### `te_aksepterer_respons`

TE godtar BHs svar på ett spor, angitt i `spor`.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | valgt i hendelsen |
| Sakstype | standard |
| NS 8407 | Ingen egen bestemmelse. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09 |
| Modell | `TEAkseptererResponsEvent`, data `TEAkseptererResponsData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, BH_HAS_RESPONDED, NOT_ALREADY_ACCEPTED |
| Virkning på status | TEs aksept settes på sporet. Statusen følger BHs svar og forbedrer det aldri: avslag gir `avslatt_akseptert`, godkjent og delvis godkjent gir `godkjent`, og `hold_tilbake` og `frafalt` lar statusen stå (vedtaket 19.09, TFR-01). |
| Behandler | `TimelineService._handle_te_aksepterer_respons` |
| Funn | SD-02 |
| Belegg | L 29.09: `_handle_te_aksepterer_respons` og `_status_etter_aksept`; søk i src/ etter typen utenom typer, etiketter og mockdata. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `kommentar` | tekst | nei | Valgfri kommentar fra entreprenør |
| `spor` | SporType | ja | Står på toppnivå i modellen og legges i `data` ved lagring. |

### `forsering_varsel`

TE varsler at arbeidet forseres etter avslått fristforlengelse, med estimert kostnad, avslåtte dager og dagmulktsats.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | ingen |
| Sakstype | forsering |
| NS 8407 | § 33.8. |
| Kilde for bestemmelsen | kode: backend/models/events.py (EventType, ForseringVarselData) |
| Modell | `ForseringVarselEvent`, data `ForseringVarselData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, IS_FORSERING_CASE, NOT_ALREADY_NOTIFIED |
| Virkning på status | Fyller forseringsdataene: varslet og iverksatt dato (begge fra `dato_iverksettelse`), estimert kostnad, avslåtte dager, dagmulktsats og maksimal kostnad, dagmulkt × dager × 1,3. Ingen sporstatus endres. Kan bare sendes én gang. |
| Behandler | `TimelineService._handle_forsering_varsel` |
| Funn | — |
| Belegg | L 29.09: `_handle_forsering_varsel`, `_rule_is_forsering_case` og `_rule_forsering_not_already_notified`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `frist_krav_id` | tekst | ja | Event-ID til fristkravet som ble avslått |
| `respons_frist_id` | tekst | ja | Event-ID til BH's frist-respons som utløste forseringen |
| `estimert_kostnad` | tall | ja | Estimert kostnad for forsering i NOK |
| `begrunnelse` | tekst | ja | Begrunnelse for forsering |
| `bekreft_30_prosent` | ja/nei | nei | TE bekrefter at estimert kostnad er innenfor dagmulkt + 30% |
| `dato_iverksettelse` | tekst | ja | Dato forsering iverksettes (YYYY-MM-DD) |
| `avslatte_dager` | heltall | ja | Antall dager som ble avslått av BH |
| `dagmulktsats` | tall | ja | Dagmulktsats i NOK per dag (påkrevd for 30%-beregning) |
| `grunnlag_avslag_trigger` | ja/nei | nei | True hvis forsering utløses av grunnlagsavslag (ikke direkte frist-avslag) |

### `forsering_respons`

BH svarer på forseringsvarselet: forseringsrett per sak, 30 %-grensen, godkjent kostnad og særskilte krav.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | ingen |
| Sakstype | forsering |
| NS 8407 | § 33.8, med særskilte krav etter § 34.1.3. |
| Kilde for bestemmelsen | kode: backend/models/events.py (ForseringResponsData) |
| Modell | `ForseringResponsEvent`, data `ForseringResponsData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/forsering/<sak>/bh-respons; POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, FORSERING_NOTIFIED |
| Virkning på status | Lagrer BHs svar i forseringsdataene. Ingen status endres. |
| Behandler | `TimelineService._handle_forsering_respons` |
| Funn | GFK-04 |
| Belegg | L 29.09: `registrer_bh_respons`, `_handle_forsering_respons` og `public_event_block_reason`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `vurdering_per_sak` | liste av objekt | nei | BHs vurdering av forseringsrett per sak |
| `dager_med_forseringsrett` | heltall | nei | Antall dager BH mener TE har forseringsrett for |
| `grunnlag_fortsatt_gyldig` | ja/nei | nei | BH bekrefter at frist-avslaget fortsatt står ved lag |
| `grunnlag_begrunnelse` | tekst | nei | BHs begrunnelse hvis grunnlaget bestrides |
| `trettiprosent_overholdt` | ja/nei | nei | BH vurderer om estimert kostnad er innenfor 30%-grensen |
| `trettiprosent_begrunnelse` | tekst | nei | BHs begrunnelse ved avvik fra 30%-regelen |
| `aksepterer` | ja/nei | ja | BH aksepterer forsering |
| `godkjent_kostnad` | tall | nei | BH's godkjente forseringskostnad (kan være lavere enn estimert) |
| `begrunnelse` | tekst | ja | BH's begrunnelse for aksept/avslag |
| `rigg_varslet_i_tide` | ja/nei | nei | Om rigg/drift-varslet var rettidig |
| `produktivitet_varslet_i_tide` | ja/nei | nei | Om produktivitets-varslet var rettidig |
| `godkjent_rigg_drift` | tall | nei | Godkjent rigg/drift-beløp |
| `godkjent_produktivitet` | tall | nei | Godkjent produktivitetsbeløp |
| `subsidiaer_triggers` | liste av tekst | nei | Triggere for subsidiær vurdering (f.eks. 'grunnlag_bestridt') |
| `subsidiaer_godkjent_belop` | tall | nei | Subsidiært godkjent beløp |
| `subsidiaer_begrunnelse` | tekst | nei | Begrunnelse for subsidiært standpunkt |

### `forsering_stoppet`

TE stopper forseringen og oppgir påløpte kostnader.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | ingen |
| Sakstype | forsering |
| NS 8407 | § 33.8. |
| Kilde for bestemmelsen | kode: backend/models/events.py (ForseringStoppetData) |
| Modell | `ForseringStoppetEvent`, data `ForseringStoppetData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/forsering/<sak>/stopp; POST /api/events og /api/events/batch; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, FORSERING_NOTIFIED, NOT_ALREADY_STOPPED |
| Virkning på status | Forseringen merkes stoppet med dato; påløpte kostnader settes når de er oppgitt. Kan bare skje én gang. |
| Behandler | `TimelineService._handle_forsering_stoppet` |
| Funn | — |
| Belegg | L 29.09: `stopp_forsering`, `_handle_forsering_stoppet` og `_rule_forsering_not_already_stopped`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `dato_stoppet` | tekst | ja | Dato forsering ble stoppet (YYYY-MM-DD) |
| `paalopte_kostnader` | tall | nei | Påløpte kostnader ved stopp i NOK |
| `begrunnelse` | tekst | nei | Begrunnelse for stopp |

### `forsering_kostnader_oppdatert`

TE oppdaterer påløpte kostnader underveis i forseringen.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | ingen |
| Sakstype | forsering |
| NS 8407 | § 33.8. |
| Kilde for bestemmelsen | kode: backend/models/events.py (ForseringKostnaderOppdatertData) |
| Modell | `ForseringKostnaderOppdatertEvent`, data `ForseringKostnaderOppdatertData` |
| Lagres i | `hendelse` |
| Sendes fra | PUT /api/forsering/<sak>/kostnader; POST /api/events og /api/events/batch; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, FORSERING_NOTIFIED |
| Virkning på status | Påløpte kostnader settes. Ingen status endres. |
| Behandler | `TimelineService._handle_forsering_kostnader_oppdatert` |
| Funn | — |
| Belegg | L 29.09: `oppdater_kostnader` og `_handle_forsering_kostnader_oppdatert`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `paalopte_kostnader` | tall | ja | Påløpte kostnader i NOK |
| `kommentar` | tekst | nei | Kommentar til kostnadsoppdatering |

### `forsering_koe_lagt_til`

En KOE-sak med avslått fristkrav knyttes til forseringssaken.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | ingen |
| Sakstype | forsering |
| NS 8407 | Ingen. Appens egen registrering. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09 |
| Modell | `ForseringKoeHandlingEvent`, data `ForseringKoeHandlingData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, IS_FORSERING_CASE |
| Virkning på status | KOE-saken legges i listen over avslåtte fristkrav, om den ikke står der. |
| Behandler | `TimelineService._handle_forsering_koe_lagt_til` |
| Funn | — |
| Belegg | L 29.09: `_handle_forsering_koe_lagt_til`. Ruta POST /api/forsering/<sak>/relatert skriver ikke denne hendelsen; den lager bare relasjoner i Catenda og i `sak_relations`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `koe_sak_id` | tekst | ja | SAK-ID til KOE som legges til/fjernes |
| `koe_tittel` | tekst | nei | Tittel på KOE for visning |

### `forsering_koe_fjernet`

En KOE-sak tas ut av forseringssaken.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | ingen |
| Sakstype | forsering |
| NS 8407 | Ingen. Appens egen registrering. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09 |
| Modell | `ForseringKoeHandlingEvent`, data `ForseringKoeHandlingData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, IS_FORSERING_CASE |
| Virkning på status | KOE-saken fjernes fra listen over avslåtte fristkrav. |
| Behandler | `TimelineService._handle_forsering_koe_fjernet` |
| Funn | — |
| Belegg | L 29.09: `_handle_forsering_koe_fjernet`. Ruta DELETE /api/forsering/<sak>/relatert/<koe> skriver ikke denne hendelsen. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `koe_sak_id` | tekst | ja | SAK-ID til KOE som legges til/fjernes |
| `koe_tittel` | tekst | nei | Tittel på KOE for visning |

### `sak_opprettet`

Første hendelse i en sak: tittel, sakstype og kobling til Catenda. Feltene ligger på toppnivå i modellen og i `data` i journalen.

| | |
| --- | --- |
| Hvem sender | TE eller BH |
| Spor | ingen |
| Sakstype | standard, forsering, endringsordre |
| NS 8407 | Ingen. Appens egen registrering. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09 |
| Modell | `SakOpprettetEvent`, feltene på toppnivå |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events/batch med forventet versjon 0; Catenda-webhook for ny topic, med forfatterens side (catenda_webhook_service); POST /api/endringsordre/opprett og utstedelse fra EO-godkjenningen (endringsordre_service); Frontend: skjemaet for ny sak sender den til POST /api/events, som avviser en ukjent sak (DM-05) |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE |
| Virkning på status | Setter tittel, Catenda-topic, prosjekt- og partsnavn og sakstype. En standardsak får grunnlaget i `utkast`; en forseringssak får forseringsdata fra `forsering_data`. En ukjent sakstype blir `standard`. Forretningsreglene kjøres ikke på første hendelse i en ny sak, bare rollekontrollen i ruta. |
| Behandler | `TimelineService._handle_sak_opprettet` |
| Funn | DM-05 |
| Belegg | L 29.09: `_handle_sak_opprettet`, `require_project_access` og NewCaseForm. K 29.09: POST /api/events med en ny sak gir 403. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `prosjekt_id` | tekst | nei | Prosjekt-ID |
| `sakstittel` | tekst | ja | Sakstittel |
| `catenda_topic_id` | tekst | nei | Catenda topic GUID |
| `sakstype` | tekst | nei | Sakstype: 'standard' (KOE), 'endringsordre' (EO), eller 'forsering' |
| `prosjekt_navn` | tekst | nei | Prosjektnavn fra Catenda |
| `byggherre` | tekst | nei | Byggherre (BH) - fra topic custom field |
| `leverandor` | tekst | nei | Leverandør/Entreprenør (TE) - fra topic custom field |
| `forsering_data` | objekt | nei | Forsering-data inkl. avslatte_fristkrav, dato_varslet, estimert_kostnad (kun for forsering-saker) |

### `internt_notat`

Internt notat, synlig bare for forfatterens eget team. Er en hendelsestype i API-et, men lagres i `notat`, ikke i journalen.

| | |
| --- | --- |
| Hvem sender | TE eller BH |
| Spor | valgt i hendelsen |
| Sakstype | standard, forsering, endringsordre |
| NS 8407 | Ingen. Et notat er ikke et kontraktsvarsel. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09; vedtak: MS-05 |
| Modell | `InterntNotatEvent`, data `InterntNotatData` |
| Lagres i | `notat` |
| Sendes fra | POST /api/events; avvises i batch og av journalen (JournalfoeringAvvist); Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | Kjøres ikke: notatet lagres før reglene |
| Virkning på status | Ingen. Notatet flytter ikke sakens versjon, sendes ikke til Catenda og avvises uten entydig team (MS-05). |
| Behandler | `TimelineService._handle_internt_notat` |
| Funn | MS-05 |
| Belegg | L 29.09: `_lagre_internt_notat`, `_parse_authorized_event` og `krev_journalhendelser`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `tekst` | tekst | ja | Notat-tekst |
| `spor` | SporType | nei | Hvilket spor notatet gjelder |

### `eo_opprettet`

BH oppretter en endringsordresak med nummer, beskrivelse og KOE-saker som inngår.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | ingen |
| Sakstype | endringsordre |
| NS 8407 | § 31.3. |
| Kilde for bestemmelsen | kode: overskriften over EO-verdiene i EventType, og kategoritabellen (EO) |
| Modell | `EOOpprettetEvent`, data `EOOpprettetData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/endringsordre/opprett, når prosjektet ikke har godkjenningspolicy; Utstedelse fra EO-godkjenningen (eo_approval_service.issue); POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; Frontend: EndringsordreForm og EO-godkjenningspanelet |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE |
| Virkning på status | Saken blir en endringsordresak, og endringsordren får status `utkast`. Skrives i samme transaksjon som `sak_opprettet` og `eo_utstedt`. Sakstypen settes også når hendelsen kommer i en KOE-sak, og ingen regel stopper det (DM-07). |
| Behandler | `TimelineService._handle_eo_opprettet` |
| Funn | DM-07, TST-05, RV-19 |
| Belegg | L 29.09: `opprett_endringsordresak` og `_handle_eo_opprettet`. K 29.09: `eo_opprettet` i en KOE-sak gjennom POST /api/events (DM-07). |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `eo_nummer` | tekst | ja | Endringsordre-nummer |
| `beskrivelse` | tekst | ja | Beskrivelse av endringen |
| `relaterte_koe_saker` | liste av tekst | nei | SAK-IDs til KOE-er som inngår |
| `sakstittel` | tekst | nei | Sakstittel for EO-saken |
| `prosjekt_id` | tekst | nei | Prosjekt-ID |
| `catenda_topic_id` | tekst | nei | Catenda topic GUID |

### `eo_koe_lagt_til`

BH knytter en KOE-sak til endringsordren.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | ingen |
| Sakstype | endringsordre |
| NS 8407 | Ingen. Appens egen registrering. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09 |
| Modell | `EOKoeHandlingEvent`, data `EOKoeHandlingData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/endringsordre/<sak>/koe, når prosjektet ikke har godkjenningspolicy; POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, IS_EO_CASE |
| Virkning på status | KOE-saken legges til endringsordrens relaterte saker, om den ikke står der. |
| Behandler | `TimelineService._handle_eo_koe_lagt_til` |
| Funn | — |
| Belegg | L 29.09: `legg_til_koe` og `_handle_eo_koe_lagt_til`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `koe_sak_id` | tekst | ja | SAK-ID til KOE som legges til/fjernes |
| `koe_tittel` | tekst | nei | Tittel på KOE for visning |

### `eo_koe_fjernet`

BH tar en KOE-sak ut av endringsordren.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | ingen |
| Sakstype | endringsordre |
| NS 8407 | Ingen. Appens egen registrering. |
| Kilde for bestemmelsen | oppdragsgiver, 29.09 |
| Modell | `EOKoeHandlingEvent`, data `EOKoeHandlingData` |
| Lagres i | `hendelse` |
| Sendes fra | DELETE /api/endringsordre/<sak>/koe/<koe>, når prosjektet ikke har godkjenningspolicy; POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, IS_EO_CASE |
| Virkning på status | KOE-saken fjernes fra endringsordrens relaterte saker. |
| Behandler | `TimelineService._handle_eo_koe_fjernet` |
| Funn | — |
| Belegg | L 29.09: `fjern_koe` og `_handle_eo_koe_fjernet`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `koe_sak_id` | tekst | ja | SAK-ID til KOE som legges til/fjernes |
| `koe_tittel` | tekst | nei | Tittel på KOE for visning |

### `eo_utstedt`

BH utsteder endringsordren formelt: beskrivelse, konsekvenser, vederlag og fristforlengelse. Proaktivt i en endringsordresak, eller reaktivt i en KOE-sak der alle aktive spor er godkjent.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | ingen |
| Sakstype | endringsordre, standard |
| NS 8407 | § 31.3, med vederlag etter § 34 og frist etter § 33. |
| Kilde for bestemmelsen | kode: backend/models/events.py (EOUtstedtData, VederlagKompensasjon) |
| Modell | `EOUtstedtEvent`, data `EOUtstedtData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/endringsordre/opprett og utstedelse fra EO-godkjenningen (proaktiv); POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy (også reaktiv); Frontend: EndringsordreForm og EO-godkjenningspanelet |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, EO_CAN_BE_ISSUED |
| Virkning på status | I en endringsordresak bygges endringsordren fra hendelsen, med status `utstedt`. I en KOE-sak (reaktiv) blir grunnlaget `laast`, og vederlag og frist blir `godkjent` med beløp og dager fra endringsordren; spor som er `ikke_relevant` eller `trukket`, står. De utgåtte toppnivåfeltene `endelig_vederlag` og `endelig_frist_dager` leses av projeksjonen, men lagres ikke (DM-06). |
| Behandler | `TimelineService._handle_eo_utstedt` |
| Funn | DM-06, RV-19 |
| Belegg | L 29.09: `_handle_eo_utstedt`, `_close_spor_for_reactive_eo` og `_rule_eo_can_be_issued`. K 29.09: tilstanden før og etter lagring (DM-06). |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `eo_nummer` | tekst | ja | Endringsordre-nummer |
| `revisjon_nummer` | heltall | nei | Revisjonsnummer |
| `beskrivelse` | tekst | ja | Beskrivelse av endringen |
| `vedlegg_ids` | liste av tekst | nei | Vedlegg-IDer |
| `konsekvenser` | EOKonsekvenser | nei | Konsekvenser av endringen |
| `konsekvens_beskrivelse` | tekst | nei | Beskrivelse av konsekvensene |
| `vederlag` | VederlagKompensasjon | nei | Vederlagskompensasjon (metode, beløp, fradrag) - konsistent med VederlagData |
| `oppgjorsform` | tekst | nei | DEPRECATED: Bruk vederlag.metode |
| `kompensasjon_belop` | tall | nei | DEPRECATED: Bruk vederlag.belop_direkte |
| `fradrag_belop` | tall | nei | DEPRECATED: Bruk vederlag.fradrag_belop |
| `er_estimat` | ja/nei | nei | DEPRECATED: Bruk vederlag.er_estimat |
| `frist_dager` | heltall | nei | Fristforlengelse i dager |
| `ny_sluttdato` | tekst | nei | Ny sluttdato (YYYY-MM-DD) |
| `relaterte_koe_saker` | liste av tekst | nei | SAK-IDs til KOE-er som inngår |
| `relaterte_sak_ids` | liste av tekst | nei | Alias for relaterte_koe_saker (for bakoverkompatibilitet) |
| `netto_belop` | tall | beregnet | Beregner netto beløp. Prioriterer vederlag-feltet, faller tilbake til legacy-felter. |
| `har_priskonsekvens` | ja/nei | beregnet | Sjekker om EO har priskonsekvens |
| `har_fristkonsekvens` | ja/nei | beregnet | Sjekker om EO har fristkonsekvens |

Toppnivåfelt i modellen som ikke lagres: `eo_nummer`, `endelig_vederlag`, `endelig_frist_dager`, `signert_av_te`, `signert_av_bh`.

### `eo_akseptert`

TE aksepterer endringsordren.

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | ingen |
| Sakstype | endringsordre |
| NS 8407 | § 31.3. |
| Kilde for bestemmelsen | kode: overskriften over EO-verdiene i EventType |
| Modell | `EOAkseptertEvent`, data `EOAkseptertData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, IS_EO_CASE, EO_IS_ISSUED |
| Virkning på status | Endringsordren blir `akseptert`, med TEs kommentar og dato. Saken får samlet status `LUKKET` (vedtaket om TFR-02, 23.09). |
| Behandler | `TimelineService._handle_eo_akseptert` |
| Funn | — |
| Belegg | L 29.09: `_handle_eo_akseptert` og `_rule_eo_is_issued`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `akseptert` | ja/nei | nei | Om TE aksepterer |
| `kommentar` | tekst | nei | TEs kommentar |

### `eo_bestridt`

TE bestrider endringsordren. En endringsordre forhandles ikke; er TE uenig, føres det videre i en KOE (vedtaket om TFR-02, 23.09).

| | |
| --- | --- |
| Hvem sender | TE |
| Spor | ingen |
| Sakstype | endringsordre |
| NS 8407 | § 31.3. |
| Kilde for bestemmelsen | kode: overskriften over EO-verdiene i EventType |
| Modell | `EOBestridtEvent`, data `EOBestridtData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, IS_EO_CASE, EO_IS_ISSUED |
| Virkning på status | Endringsordren blir `bestridt`, med TEs begrunnelse som kommentar. Saken får samlet status `LUKKET` (TFR-02). |
| Behandler | `TimelineService._handle_eo_bestridt` |
| Funn | — |
| Belegg | L 29.09: `_handle_eo_bestridt`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `begrunnelse` | tekst | ja | Begrunnelse for bestridelse |
| `nytt_koe_sak_id` | tekst | nei | SAK-ID til nytt KOE som fremmes som alternativ |

### `eo_revidert`

BH reviderer en utstedt eller bestridt endringsordre.

| | |
| --- | --- |
| Hvem sender | BH |
| Spor | ingen |
| Sakstype | endringsordre |
| NS 8407 | § 31.3. |
| Kilde for bestemmelsen | kode: overskriften over EO-verdiene i EventType |
| Modell | `EORevidertEvent`, data `EORevidertData` |
| Lagres i | `hendelse` |
| Sendes fra | POST /api/events og /api/events/batch, når prosjektet ikke har godkjenningspolicy; Frontend: sendes ikke fra noe skjermbilde i dag |
| Forretningsregler | ROLE_CHECK, CASE_NOT_CLOSED, CREATE_ONCE, RESPONSE_REFERENCE, IS_EO_CASE, EO_IS_ISSUED |
| Virkning på status | Revisjonsnummeret settes, status blir `revidert`, og TEs svar nullstilles. Beskrivelse, kompensasjon, fradrag, frist og sluttdato oppdateres fra `oppdatert_data` når de er satt; `oppdatert_data.vederlag` leses ikke. |
| Behandler | `TimelineService._handle_eo_revidert` |
| Funn | — |
| Belegg | L 29.09: `_handle_eo_revidert` og `_rule_eo_is_issued`, som godtar `utstedt`, `bestridt` og `revidert`. |

Feltene i `data`:

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `ny_revisjon_nummer` | heltall | ja | Nytt revisjonsnummer |
| `endringer_beskrivelse` | tekst | ja | Beskrivelse av endringene |
| `oppdatert_data` | EOUtstedtData | nei | Oppdatert EO-data (hvis endret) |

## Delmodeller og verdilister

### BelopVurdering

`godkjent`, `delvis`, `avslatt`

### EOKonsekvenser

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `sha` | ja/nei | nei | SHA-konsekvenser |
| `kvalitet` | ja/nei | nei | Kvalitetskonsekvenser |
| `fremdrift` | ja/nei | nei | Fremdriftskonsekvenser |
| `pris` | ja/nei | nei | Priskonsekvenser |
| `annet` | ja/nei | nei | Andre konsekvenser |

### EOUtstedtData

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `eo_nummer` | tekst | ja | Endringsordre-nummer |
| `revisjon_nummer` | heltall | nei | Revisjonsnummer |
| `beskrivelse` | tekst | ja | Beskrivelse av endringen |
| `vedlegg_ids` | liste av tekst | nei | Vedlegg-IDer |
| `konsekvenser` | EOKonsekvenser | nei | Konsekvenser av endringen |
| `konsekvens_beskrivelse` | tekst | nei | Beskrivelse av konsekvensene |
| `vederlag` | VederlagKompensasjon | nei | Vederlagskompensasjon (metode, beløp, fradrag) - konsistent med VederlagData |
| `oppgjorsform` | tekst | nei | DEPRECATED: Bruk vederlag.metode |
| `kompensasjon_belop` | tall | nei | DEPRECATED: Bruk vederlag.belop_direkte |
| `fradrag_belop` | tall | nei | DEPRECATED: Bruk vederlag.fradrag_belop |
| `er_estimat` | ja/nei | nei | DEPRECATED: Bruk vederlag.er_estimat |
| `frist_dager` | heltall | nei | Fristforlengelse i dager |
| `ny_sluttdato` | tekst | nei | Ny sluttdato (YYYY-MM-DD) |
| `relaterte_koe_saker` | liste av tekst | nei | SAK-IDs til KOE-er som inngår |
| `relaterte_sak_ids` | liste av tekst | nei | Alias for relaterte_koe_saker (for bakoverkompatibilitet) |
| `netto_belop` | tall | beregnet | Beregner netto beløp. Prioriterer vederlag-feltet, faller tilbake til legacy-felter. |
| `har_priskonsekvens` | ja/nei | beregnet | Sjekker om EO har priskonsekvens |
| `har_fristkonsekvens` | ja/nei | beregnet | Sjekker om EO har fristkonsekvens |

### FristBeregningResultat

`godkjent`, `delvis_godkjent`, `avslatt`

### FristVarselType

`varsel`, `spesifisert`, `begrunnelse_utsatt`

### GrunnlagResponsResultat

`godkjent`, `avslatt`, `frafalt`

### KonsekvensVarsler

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `vederlag` | tekst | nei | — |
| `rigg_drift` | tekst | nei | — |
| `produktivitet` | tekst | nei | — |
| `frist` | tekst | nei | — |

### LetterParty

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `navn` | tekst | ja | — |
| `rolle` | tekst | ja | — |
| `adresse` | tekst | nei | — |
| `orgnr` | tekst | nei | — |

### LetterReferences

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `sakId` | tekst | ja | — |
| `sakstittel` | tekst | ja | — |
| `eventId` | tekst | ja | — |
| `sporType` | tekst | ja | — |
| `dato` | tekst | ja | — |
| `kravDato` | tekst | nei | — |

### LetterSection

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `tittel` | tekst | ja | — |
| `originalTekst` | tekst | ja | — |
| `redigertTekst` | tekst | ja | — |

### LetterSections

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `innledning` | LetterSection | ja | — |
| `begrunnelse` | LetterSection | ja | — |
| `avslutning` | LetterSection | ja | — |

### LetterSnapshot

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `tittel` | tekst | ja | — |
| `mottaker` | LetterParty | ja | — |
| `avsender` | LetterParty | ja | — |
| `referanser` | LetterReferences | ja | — |
| `seksjoner` | LetterSections | ja | — |

### SaerskiltKrav

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `rigg_drift` | SaerskiltKravItem | nei | Rigg/drift krav (§34.1.3 første ledd) |
| `produktivitet` | SaerskiltKravItem | nei | Produktivitetstap krav (§34.1.3 annet ledd) |

### SaerskiltKravItem

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `belop` | tall | nei | Beløp for dette særskilte kravet |
| `dato_klar_over` | tekst | nei | Når TE ble klar over at utgifter ville påløpe (YYYY-MM-DD). Brukes til 7-dagers varslingssjekk. |

### SporType

`grunnlag`, `vederlag`, `frist`

### SubsidiaerTrigger

`grunnlag_avslatt`, `grunnlag_prekludert_32_2`, `forseringsrett_avslatt`, `preklusjon_hovedkrav`, `preklusjon_rigg`, `preklusjon_produktivitet`, `reduksjon_ep_justering`, `preklusjon_varsel`, `reduksjon_spesifisert`, `ingen_hindring`, `metode_avslatt`

### VarselInfo

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `dato_sendt` | tekst | nei | Når varselet faktisk ble sendt til BH (YYYY-MM-DD) |
| `metode` | liste av tekst | nei | Metoder brukt for å varsle (f.eks. ['epost', 'byggemote', 'telefon']) |

### VederlagBeregningResultat

`godkjent`, `delvis_godkjent`, `avslatt`, `hold_tilbake`

### VederlagKompensasjon

| Felt | Type | Påkrevd | Beskrivelse |
| --- | --- | --- | --- |
| `metode` | VederlagsMetode | ja | Vederlagsmetode etter NS 8407 (§34) |
| `belop_direkte` | tall | nei | For ENHETSPRISER/FASTPRIS_TILBUD: Beløp i NOK |
| `kostnads_overslag` | tall | nei | For REGNINGSARBEID (§30.2): Kostnadsoverslag i NOK |
| `fradrag_belop` | tall | nei | Fradrag i NOK (§34.4) - reduksjon for besparelser |
| `er_estimat` | ja/nei | nei | Om beløpet er et estimat (endelig oppgjør senere) |
| `netto_belop` | tall | beregnet | Beregner netto beløp basert på metode. For ENHETSPRISER/FASTPRIS_TILBUD: belop_direkte - fradrag For REGNINGSARBEID: kostnads_overslag - fradrag |
| `krevd_belop` | tall | beregnet | Alias for netto_belop - brukes i state-modellen. Returnerer det totale kravet/kompensasjonen. |

### VederlagsMetode

`ENHETSPRISER`, `REGNINGSARBEID`, `FASTPRIS_TILBUD`
