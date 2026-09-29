# Gjennomføring: hendelseskatalogen, første runde (spor M, 1b)

**Dato:** 2026-09-29. **Commit:** grenen `claude/oppdraget-spor-m-avsnitt-2-3-9qwkmh`
over `main` på `6bb2e33`. Appen er ikke i produksjon og har ingen reelle data.
Alvorlighet angir mulig konsekvens under beskrevne forutsetninger, ikke
observert hendelse.

**Forrige ledd:** [oppdraget for spor M](prompt-datamodell-og-funksjonskart-2026-09-29.md),
avsnitt 2 og fase 1b i avsnitt 3, og
[gjennomføringsnotatet for 1a](gjennomforing-spor-m-1a-2026-09-29.md), som
katalogen følger mønsteret til. Status for funnene står i
[hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#4-funnregister).
Arbeidet følges i [#81](https://github.com/khjohns/endringsmeldinger/issues/81).

## 1. Hva som er levert

- [`datamodell/hendelser.toml`](datamodell/hendelser.toml): én oppføring per
  verdi i `EventType`, 32 i alt. Hver oppføring har hvem som sender, spor,
  sakstype, bestemmelse i NS 8407 med kilde, modell, innsendingsveier,
  virkning på status, funn og belegg. Konvolutten, feltene som ligger i egne
  kolonner, står én gang.
- [`verktoy/hendelseskatalog.py`](verktoy/hendelseskatalog.py) henter fra
  koden det koden kan svare på:
  - feltene i `data`, fra Pydantic-modellene, med delmodeller og verdilister
  - forretningsreglene per type, fra `BusinessRuleValidator`
  - felt i modellen som ikke lagres (DM-06)
- [`verktoy/datamodell.py`](verktoy/datamodell.py) skriver
  [`datamodell/hendelser.md`](datamodell/hendelser.md) og to nye ark i
  Excel-fila.
- Testene i
  [`test_hendelseskatalog.py`](../backend/tests/test_datamodell/test_hendelseskatalog.py)
  feiler når:
  - en hendelsestype mangler oppføring, eller en oppføring mangler type
  - avsenderen ikke er den rollekontrollen (`ROLE_CHECK`) slipper gjennom
  - modellen ikke er den `parse_event` bruker, eller datamodellen ikke er en
    av modellens
  - behandleren ikke finnes i `TimelineService`
  - en bestemmelse mangler kjent kilde, eller en funn-ID ikke står i
    hovedplanen
  - feltene i katalogen ikke dekker det `to_cloudevent` lagrer
  - de genererte filene er utdaterte

Testene mot koden viser at katalogen beskriver koden, ikke at koden er riktig.
Hvem som *skal* kunne sende hva, prøves mot NS 8407 og vedtakene i fase 3.

**Oppdragsgivers svar 29.09,** gitt med spørsmålsverktøyet:

| Spørsmål | Svar |
| --- | --- |
| Skal skjemaet for ny sak kunne opprette saker? | Ja. Saker skal kunne opprettes både fra appen og fra en topic i Catenda (DM-05) |
| Bestemmelse for de seks app-interne typene: `sak_opprettet`, `forsering_koe_lagt_til`, `forsering_koe_fjernet`, `eo_koe_lagt_til`, `eo_koe_fjernet` og `internt_notat` | Ingen bestemmelse i NS 8407 |
| Bestemmelse for `grunnlag_trukket`, `vederlag_krav_trukket`, `frist_krav_trukket` og `te_aksepterer_respons` | Ingen egen bestemmelse |
| Er det meningen at `eo_opprettet` på en KOE-sak gjør den om til en endringsordresak? | Nei. En endringsordresak kan følge av en KOE-sak, men ikke erstatte den, verken i historikken eller som en egen hendelse i KOE-saken (DM-07) |
| Hva IKT får av katalogen | To nye ark: «Hendelsestyper» med én rad per type, og «Hendelsesfelt» med feltene. Innsendingsveier, regler, belegg og funn står bare i `hendelser.md` |

### Kildene for bestemmelsene

Standardteksten ligger ikke lenger i repoet (`507e225`), så ingen bestemmelse
er kontrollert mot den i denne runden. Katalogen skiller mellom:

| Kilde | Typer |
| --- | --- |
| Koden oppgir bestemmelsen, og et vedtak i hovedplanen eller ADR-001 viser til den | `grunnlag_opprettet`, `vederlag_krav_sendt`, `frist_krav_sendt`, `respons_grunnlag`, `respons_vederlag`, `respons_frist` |
| Bare koden oppgir den | De øvrige kravene og svarene, de fire forseringstypene med § 33.8, og `eo_opprettet`, `eo_utstedt`, `eo_akseptert`, `eo_bestridt` og `eo_revidert` med § 31.3 |
| Oppdragsgiver, 29.09 | De ti typene i tabellen over |
| Ikke kontrollert | Ingen |

For `eo_akseptert`, `eo_bestridt` og `eo_revidert` er kilden bare overskriften
over EO-verdiene i `EventType`. Det er den svakeste kilden i katalogen.

## 2. Funn

| ID | Funn | Alvorlighet | Belegg |
| --- | --- | --- | --- |
| DM-05 | Skjemaet for ny sak får 403: `POST /api/events` avviser `sak_opprettet` for en ny sak | Middels | K 29.09 |
| DM-06 | Felt projeksjonen leser, men som journalen ikke lagrer | Lav | K 29.09 |
| DM-07 | `eo_opprettet` på en KOE-sak gjør den om til en endringsordresak | Middels | K 29.09 |

### DM-05 — skjemaet for ny sak kan ikke opprette saken *(middels)*

**Sted:** `require_project_access` i
[`project_access.py`](../backend/lib/auth/project_access.py), og
`NewCaseForm.svelte`, som sender gjennom `submitEvent` i `src/lib/api/events.ts`.

- **Lest ut av koden (L 29.09):**
  - Skjemaet lager en ny UUID og sender `sak_opprettet` som enkelthendelse til
    `POST /api/events` med forventet versjon 0.
  - Dekoratøren slår opp metadata for saken. En sak uten metadata godtas bare
    når endepunktet er `events.submit_batch`, forventet versjon er 0 og første
    hendelse er `sak_opprettet`. Ellers svarer den 403.
- **Kjørt (K 29.09)** mot testbasen, med ekte ruter, dekoratører og lagre og
  bare innloggingstjenesten byttet ut:
  - Skjemaets forespørsel gir 403 `FORBIDDEN`, og ingenting lagres.
  - Samme hendelse til `/api/events/batch` gir 201, og saken står i journalen.
    Brukeren har altså tilgang, og lageret kan opprette saken.

Med `DISABLE_AUTH` i utviklingsmodus hopper dekoratøren over kontrollen. Da
når forespørselen lageret, som over PostgreSQL avviser en sak uten metadata.
Den veien er lest, ikke kjørt.

**Konsekvens:** utenfor utviklingsmodus kan en sak i dag bare opprettes fra en
topic i Catenda. Oppdragsgiver har bekreftet at skjemaet skal virke.

**Reproduksjon:** streng `xfail` i
[`test_ny_sak_dm05.py`](../backend/tests/test_database/test_ny_sak_dm05.py),
med batch-ruta som kontrollsak.

**Ikke avgjort:** om skjemaet skal bruke batch-ruta, eller om enkeltruta skal
opprette metadata. Batch-ruta lagrer uten leveringsintensjon (RV-10), og det
blir aktuelt om skjemaet tar den i bruk.

### DM-06 — felt projeksjonen leser, men som journalen ikke lagrer *(lav)*

**Sted:** `CloudEventMixin.to_cloudevent`, `EOUtstedtEvent` og
`_close_spor_for_reactive_eo` i `services/timeline_service.py`.

Har hendelsen en datamodell, lagrer `to_cloudevent` bare `data`. Toppnivåfelt
utenom konvolutten og `spor` forsvinner. Generatoren lister dem:
- `versjon` på de sju kravtypene. Den leses ikke av noen, og løpenummeret i
  kolonnen `versjon` er noe annet.
- Fem utgåtte felt på `eo_utstedt`: `eo_nummer`, `endelig_vederlag`,
  `endelig_frist_dager`, `signert_av_te` og `signert_av_bh`.

Søket etter lesere dekket `event.<felt>` og `getattr(event, "<felt>")` i
backend utenom testene. Tre steder leser feltene på `eo_utstedt`:
- `_close_spor_for_reactive_eo` bruker `endelig_vederlag` og
  `endelig_frist_dager` når en endringsordre lukker en KOE-sak og `data` ikke
  har beløp eller dager.
- `lib/cloudevents/http_binding.py` bruker `eo_nummer` og `endelig_vederlag`
  i sammendraget, med `data` som reserve.
- `TimelineService._serialize_event_data` og `_get_event_summary`, som bare
  kalles fra `get_timeline`. Den har ingen kaller, heller ikke i testene
  (L 29.09; også påvist i [målskjemagjennomgangen](audit-maalskjema-gjennomgang-2026-09-21.md)),
  og fjernes i [#95](https://github.com/khjohns/endringsmeldinger/pull/95).

**Kjørt (K 29.09)** mot testbasen: en KOE-sak lukket av en endringsordre med
`endelig_vederlag` gir godkjent beløp 100 000 kr i tilstanden regnet av
hendelsene i minnet, og ingen verdi når hendelsene leses tilbake. Med samme
beløp i `data.vederlag` er tilstanden lik før og etter.

**Konsekvens:** ruta regner tilstanden og `sak_metadata`-cachen av hendelsen i
minnet, så svaret og cachen viser et beløp journalen ikke har. Det bryter
invariant 9 i hovedplanen: tilstand beregnes fra hendelser alene. Latent,
fordi ingen skjermbilder sender feltene; `POST /api/events` godtar dem fra BH
i et prosjekt uten godkjenningspolicy.

**Reproduksjon:** streng `xfail` i
[`test_hendelse_rundtur_dm06.py`](../backend/tests/test_database/test_hendelse_rundtur_dm06.py),
med `data.vederlag` som kontrollsak.

### DM-07 — `eo_opprettet` på en KOE-sak gjør den om til en endringsordresak *(middels)*

**Sted:** reglene for `eo_opprettet` i `BusinessRuleValidator._get_rules_for_event`
og `TimelineService._handle_eo_opprettet`.

- **Lest ut av koden (L 29.09):**
  - `eo_opprettet` har ingen regel om sakstype, bare de felles reglene.
    `CREATE_ONCE` stopper den bare når saken allerede har en endringsordre.
  - Behandleren setter sakstypen til endringsordre og lager en endringsordre
    med status `utkast`, uansett hvilken sak hendelsen kommer i.
  - `POST /api/events` slipper den gjennom fra BH når prosjektet ikke har
    godkjenningspolicy. Med policy avvises den som BH-bindende.
- **Kjørt (K 29.09)** mot testbasen, med ekte ruter, dekoratører og lagre og
  bare innloggingstjenesten byttet ut. En KOE-sak med sendt grunnlag er
  opprettet av TE gjennom batch-ruta.
  - BH sender `eo_opprettet` i KOE-saken og får 201.
  - Tilstanden i svaret har sakstype `endringsordre` og samlet status `UTKAST`,
    enda grunnlaget er `sendt`.
  - Kontrollen: et BH-svar på grunnlaget i samme sak gir 201. BH har tilgang,
    og ruta tar imot BHs hendelser der.

**Tiltenkt atferd:** oppdragsgivers svar 29.09. En endringsordresak kan følge av
en KOE-sak, men ikke erstatte den, verken i historikken eller som en egen
hendelse i KOE-saken.

**Konsekvens:** KOE-saken vises som en endringsordre, og kravene i den faller ut
av sporstatusene som styrer samlet status. Hendelsen står i journalen og kan
ikke fjernes.

**Reproduksjon:** streng `xfail` i
[`test_eo_paa_koe_sak_dm07.py`](../backend/tests/test_database/test_eo_paa_koe_sak_dm07.py).
Den godtar bare en avvisning med `BUSINESS_RULE_VIOLATION` og en uendret
journal, så en avvisning av en annen grunn blir ikke XPASS.

## 3. Observasjoner uten eget funn

Til fase 2 og 3. Ingen av dem har en kilde for tiltenkt atferd ennå.

- **Grunnlags-, krav- og svartypene er ikke sperret til KOE-saker.**
  Forsering- og EO-typene har regler for sakstype, disse har ikke (L 29.09).
- **Forseringsflyten skriver ikke sine egne hendelser** (L 29.09). Område 4.
  - `POST /api/forsering/opprett` lager en topic i Catenda og relasjoner, men
    ingen hendelse.
  - Saken oppstår når webhooken ser topicen, uten `forsering_data`.
  - Rutene for relaterte saker skriver ikke `forsering_koe_lagt_til` eller
    `forsering_koe_fjernet`.
  - Frontenden kaller ingen forseringsruter.
- **`forsering_varsel` setter varslet dato lik iverksettelsesdatoen** fra
  klienten, ikke innsendingsdatoen. DRF-03 avgjorde at sendedatoen for et
  annet varsel settes av serveren. Område 4.
- **`eo_revidert` leser ikke `oppdatert_data.vederlag`,** bare de utgåtte
  beløpsfeltene i samme modell (L 29.09). Område 5.
- **Tretten typer sendes ikke fra noe skjermbilde:**
  - `te_aksepterer_respons`
  - de seks forseringstypene
  - `eo_koe_lagt_til`, `eo_koe_fjernet`
  - `eo_akseptert`, `eo_bestridt`, `eo_revidert`
  - `internt_notat`

  Søket var etter typenavnet i `src/`, utenom typer, etiketter, mockdata og
  tester (L 29.09). Forsering og EO-lenkene har egne ruter; de andre har bare
  `POST /api/events`. Fase 2.
- **`data` er ikke bare det klienten sendte.** Beregnede felt lagres med,
  blant annet `netto_belop` og `krevd_belop` i vederlagskravet og
  `har_priskonsekvens` i endringsordren, og `spor` flyttes inn i `data` (K
  29.09). Det har betydning ved feilsøking og ved en ny plattform.

## Verifikasjon og grenser

**Kjørt og observert 29.09:**
- DM-05, DM-06 og DM-07 mot testbasen (PostgreSQL 17), med kontrollsaker, og
  reproduksjonene med `--runxfail` for å se at de feiler på det de skal
- `to_cloudevent` for et krav, et svar, en endringsordre og en ny sak
- testene for katalogen, fire av dem som mutasjoner av vakta
- hele backend-suiten med testbasen

**Lest ut av koden:** `models/events.py`, `services/business_rules.py`,
`services/timeline_service.py`, innsendingsrutene og tjenestene som skriver
hendelser, `require_project_access`, `public_event_block_reason` og skjemaene
i `src/lib/components/kontraktsbord/`.

**Ikke kontrollert:**
- bestemmelsene mot standardteksten
- grensesnittet i nettleseren; hvilke skjermbilder som sender hva, er lest
- om forseringsflyten eller EO-reaksjonene fra TE er i bruk noe sted
- hvordan katalogen ser ut i Azure SQL Database
- virkningen på status utover behandleren i `TimelineService`; samlet status
  i `sak_state.py` er ikke gått gjennom per type
