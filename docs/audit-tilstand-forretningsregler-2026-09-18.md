# Audit: tilstandskonsistens og forretningsregler (Pass 3) — 2026-09-18

Gjennomført 18. september 2026. Gjenstand:
Valideringsregler, tilstandsberegning, hendelsesrekkefølge, preklusjon,
subsidiære standpunkter og NS 8407-spillereglene
(`backend/services/business_rules.py`, `backend/services/timeline_service.py`,
`backend/models/sak_state.py`, `backend/models/events.py`).

Kryssreferanser:
- [audit-review-astra-2026-09-17.md](audit-review-astra-2026-09-17.md)
- [audit-autorisasjon-2026-09-18.md](audit-autorisasjon-2026-09-18.md) (Pass 2)
- [audit-godkjenning-fullmakt-2026-09-18.md](audit-godkjenning-fullmakt-2026-09-18.md) (Pass 4)
- Testfil: [test_tilstand_forretningsregler_audit_20260918.py](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_tilstand_forretningsregler_audit_20260918.py)

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

---

**Etterprøvd 2026-09-19** i [vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md). TFR-01 er bekreftet
som materialets alvorligste funn, med de to leddene testen ikke viser:
`kan_utstede_eo` krever `grunnlag.status ∈ {GODKJENT, LAAST}`
(`sak_state.py:1172`), så virkningen følger; og hendelsen er nåbar, siden eneste
vakter er `BH_HAS_RESPONDED` og `NOT_ALREADY_ACCEPTED` — ingen forretningsregel
nevner `AVSLATT` overhodet. Løses ikke av arkitekturarbeidet.

**Merknad 2026-09-19 (senere samme dag): TFR-01 er kartlagt videre, ikke rettet.**
Modelleringen av «TE godtar byggherrens avslag» er en åpen domenebeslutning, og
rettingen venter på den. *Kjørt og observert:* feilen gjelder **alle tre spor**,
ikke bare grunnlag — vederlag og frist går også fra `avslatt` til `godkjent`, og
`kan_utstede_eo` blir `True` i alle tre. Vakten slipper aksept av et avslag gjennom
på alle tre. Reproduksjonen er utvidet fra ett til tre spor. Fristsporet er det med
størst konsekvens: et avslått fristkrav er forutsetningen for forsering etter § 33.8.

To observasjoner gjør en senere retting billigere. `DELVIS_GODKJENT` blir også
`GODKJENT` ved aksept, men det er trolig riktig — partene er enige om det reduserte
beløpet — så feilen gjelder bare `AVSLATT`. Og `bh_resultat` er bevart på sporet,
så statusen kan utledes uten ny hendelsestype og uten migrasjon.

**Merknad 2026-09-19 (senere samme dag): avgjort og rettet.** Modelleringen ble
besluttet av oppdragsgiver: **aksept bekrefter byggherrens svar og forbedrer det
aldri.** Ny `SporStatus.AVSLATT_AKSEPTERT` betyr *oppgjort ved enighet, på
byggherrens premisser* — verken innvilget krav eller gjenstående uenighet.

| BH svarte | Etter TEs aksept | Begrunnelse |
| --- | --- | --- |
| `godkjent` | `GODKJENT` | enighet om kravet |
| `delvis_godkjent` | `GODKJENT` | enighet om byggherrens reduserte tall, bevart i `godkjent_belop`/`godkjent_dager` |
| `avslatt` | `AVSLATT_AKSEPTERT` | enighet om at intet tilkommer |
| `hold_tilbake`, `frafalt` | uendret | §30.2-tilbakeholdelse er en utsettelse i påvente av kostnadsoverslag, ikke et avslag; §32.3 c er byggherrens egen tilbaketrekking. Aksept kan ikke gjøre noen av dem til enighet om et krav |

**Virkningen på `kan_utstede_eo`:** for vederlag og frist teller et godtatt avslag
som oppgjort, på linje med `TRUKKET`, som settet allerede godtok. Valget er tatt på
et konkret scenario: er ansvaret godkjent, fristen avtalt til 20 dager og
vederlagskravet avslått og avslaget godtatt, er partene enige om alt — og da må
endringsordren som registrerer det kunne utstedes, med 20 dager og 0 kroner.
Grunnlaget er unntatt, siden det bare godtar `GODKJENT` og `LAAST`: er ansvaret
avvist og avvisningen godtatt, er saken over.

**Terminalitet.** Søk etter mønsteret ga en konsekvens funnteksten ikke nevner: de
tre tilbaketrekkingsreglene ville latt TE trekke et krav de formelt har godtatt
avslaget på. `AVSLATT_AKSEPTERT` er lagt i `blocked_statuses` sammen med `GODKJENT`
og `TRUKKET`.

`bh_resultat` er uendret av aksepten, så **forseringssporet består**:
`valider_grunnlag_fortsatt_gyldig` leser `bh_resultat` og ikke `status`, og et
avslått fristkrav er forutsetningen for forsering etter § 33.8.

Frontend speiler statusen, med etiketten «Avslag godtatt» og nøytral badge som
`trukket` — ikke rød, fordi avslaget ikke lenger er omtvistet. De tre
`xfail`-reproduksjonene er gjort om til ordinære regresjonstester, og scenarioet
over er lagt til som egen test.

**TFR-02 er bekreftet:** `overordnet_status` (`sak_state.py:1099`) leser bare
`grunnlag`, `vederlag` og `frist`. For forsering og EO er alle tre
`IKKE_RELEVANT`, så listen blir tom og statusen `INGEN_AKTIVE_SPOR`.
TFR-03 til TFR-06 er kun lest.

## Omfang

**Undersøkt:**
- `BusinessRuleValidator` i `services/business_rules.py`:
  - Fellesregler (`ROLE_CHECK`, `CASE_NOT_CLOSED`, `CREATE_ONCE`, `RESPONSE_REFERENCE`).
  - Sporspesifikke regler for grunnlag, vederlag og frist.
  - Regler for tilbaketrekking av krav (`GRUNNLAG_TRUKKET`, `VEDERLAG_KRAV_TRUKKET`, `FRIST_KRAV_TRUKKET`).
  - Regler for aksept av motpartens respons (`TE_AKSEPTERER_RESPONS`).
  - Regler for forsering (§33.8) og endringsordrer (§31.3).
- `TimelineService` i `services/timeline_service.py`:
  - Hendelseshåndterere for alle hendelsestyper (`_handle_respons_grunnlag`, `_handle_respons_vederlag`, `_handle_respons_frist`, `_handle_te_aksepterer_respons`).
  - Mappere mellom domeneresultater og `SporStatus`.
  - Feltkopiering via `_copy_fields_if_present`.
- `SakState` i `models/sak_state.py`:
  - Beregnede felter (`overordnet_status`, `kan_utstede_eo`, `er_subsidiaert_vederlag`, `er_subsidiaert_frist`, `visningsstatus_vederlag`, `visningsstatus_frist`).
  - Konsistens mellom grunnlagsansvar og underliggende vederlags-/fristkrav.

**Bevisst ikke undersøkt i dette passet:**
- Rute-autorisasjon og prosjektsjekk (dekket i Pass 2).
- Fullmaktsmatrise og brev-PDF-generering (dekket i Pass 4).
- Database-RLS og migrasjoner (dekket i Pass 1).

---

## Sammendrag av funn

| ID | Alvorlighet | Kategori | Funn | Metode |
| --- | --- | --- | --- | --- |
| TFR-01 | Kritisk | Domenelogikk / Integritet | `TE_AKSEPTERER_RESPONS` forvandler et avslag fra BH til et godkjent grunnlag og setter `kan_utstede_eo = True` | Kjørt og observert |
| TFR-02 | Høy | Tilstand / Rapportering | `overordnet_status` ignorerer sakstype; forseringssaker og endringsordrer rapporteres alltid som `"INGEN_AKTIVE_SPOR"` | Kjørt og observert |
| TFR-03 | Middels | Forretningsregler / Lås | `_rule_vederlag_can_be_withdrawn` og fristmotparten blokkerer tilbaketrekking av prinsipalt avslåtte krav med subsidiær enighet | Kjørt og observert |
| TFR-04 | Middels | Dataintegritet | `require_truthy=True` i `_copy_fields_if_present` forkaster subsidiært standpunkt på 0 kr / 0 dager som falsy | Kjørt og observert |
| TFR-05 | Middels | UI / Saksliste | Sak med formelt godkjent og låst ansvarsgrunnlag rapporteres som `"UTKAST"` i overordnet status | Kjørt og observert |
| TFR-06 | Lav | Validering | Manglende sperre mot respons på uspesifisert fristvarsel (`_rule_frist_sent`) | Lest ut av koden |

---

## Detaljerte funn

### TFR-01: `TE_AKSEPTERER_RESPONS` forvandler et avslag til et godkjent krav (Kritisk)

- **Fil og linje:** [`backend/services/timeline_service.py:1272-1301`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/timeline_service.py#L1272-L1301) og [`backend/services/business_rules.py:692-738`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/business_rules.py#L692-L738)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_tilstand_forretningsregler_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_tilstand_forretningsregler_audit_20260918.py).
- **Forutsetninger:** Byggherren har avslått ansvarsgrunnlaget (`GrunnlagResponsResultat.AVSLATT`) og begrunnet at forholdet ikke er byggherrens risiko. Entreprenøren sender hendelsen `TE_AKSEPTERER_RESPONS` for grunnlagssporet (f.eks. for å signalisere at avslaget tas til etterretning).
- **Svakhet:**
  `BusinessRuleValidator._rule_not_already_accepted` sjekker kun at TE ikke har akseptert tidligere og at sporet ikke er i `{GODKJENT, LAAST, TRUKKET}`. Den sjekker **ikke** om BHs respons faktisk var godkjennende eller avslående.
  I `TimelineService._handle_te_aksepterer_respons` utføres følgende ubetinget:
  ```python
  if spor == SporType.GRUNNLAG:
      state.grunnlag.te_akseptert = True
      state.grunnlag.status = SporStatus.GODKJENT
  ```
  Koden forutsetter feilaktig at en aksept fra TE bare kan skje ved et imøtekommende tilbud/delvis godkjenning.
  Når koden setter `state.grunnlag.status = SporStatus.GODKJENT`, slår `kan_utstede_eo` om til:
  ```python
  if self.grunnlag.status in {SporStatus.GODKJENT, SporStatus.LAAST}:
      return True
  ```
- **Konsekvens:** Byggherrens avslag blir magisk forvandlet til en juridisk bindende godkjenning av ansvarsgrunnlaget i systemet. Entreprenøren kan deretter gå videre og utstede endringsordre basert på et krav som byggherren eksplisitt har avvist.

---

### TFR-02: `overordnet_status` ignorerer sakstype for forsering og endringsordrer (Høy)

- **Fil og linje:** [`backend/models/sak_state.py:1085-1158`](file:///Users/kasper/Projects/endringsmeldinger/backend/models/sak_state.py#L1085-L1158)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_tilstand_forretningsregler_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_tilstand_forretningsregler_audit_20260918.py).
- **Forutsetninger:** En sak av typen forsering (`sakstype="forsering"`) eller endringsordre (`sakstype="endringsordre"`) opprettes, varsles eller besvares i prosjektet.
- **Svakhet:**
  `overordnet_status` ser utelukkende på `[self.grunnlag.status, self.vederlag.status, self.frist.status]`:
  ```python
  aktive_statuser = [s for s in statuser if s != SporStatus.IKKE_RELEVANT]

  if not aktive_statuser:
      return "INGEN_AKTIVE_SPOR"
  ```
  For forseringssaker og endringsordrer er de tre standardsporene alltid `IKKE_RELEVANT`. `aktive_statuser` er derfor tom.
  Funksjonen sjekker aldri `self.sakstype`, `self.forsering_data` eller `self.endringsordre_data`.
  Dermed returneres `"INGEN_AKTIVE_SPOR"` for samtlige forserings- og endringsordresaker, uansett om de er varslet, akseptert for millionbeløp, revidert eller fullført.
- **Konsekvens:** Total funksjonssvikt i sakslisteoversikten (`GET /api/cases`), i metadata-cachen og i statusrapportering for alle andre sakstyper enn standard KOE.

---

### TFR-03: Blokkering av tilbaketrekking ved subsidiært godkjente krav (Middels)

- **Fil og linje:** [`backend/services/business_rules.py:624-660`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/business_rules.py#L624-L660) og [`backend/services/timeline_service.py:1319-1342`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/timeline_service.py#L1319-L1342)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_tilstand_forretningsregler_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_tilstand_forretningsregler_audit_20260918.py).
- **Forutsetninger:** Byggherren har avslått grunnlag (`grunnlag.status = AVSLATT`), men har vurdert vederlags- eller fristberegningen subsidiært og funnet den regnemessig korrekt (`beregnings_resultat = GODKJENT`).
- **Svakhet:**
  I `TimelineService._beregnings_resultat_til_status` mappes `beregnings_resultat == "godkjent"` direkte til `SporStatus.GODKJENT`, uten hensyn til at ansvarsgrunnlaget er avslått.
  Når entreprenøren innser at grunnlaget er avslått og velger å trekke vederlagskravet (`VEDERLAG_KRAV_TRUKKET`), avviser `BusinessRuleValidator._rule_vederlag_can_be_withdrawn` handlingen:
  ```python
  blocked_statuses = {
      SporStatus.IKKE_RELEVANT,
      SporStatus.UTKAST,
      SporStatus.GODKJENT,
      SporStatus.TRUKKET,
  }
  if state.vederlag.status in blocked_statuses:
      return ValidationResult(is_valid=False, message="Vederlagskrav kan ikke trekkes...")
  ```
- **Konsekvens:** Entreprenøren sperres fra å trekke et krav som byggherren prinsipalt nekter å betale, og saken låses unødvendig i en kunstig tvistesituasjon.

---

### TFR-04: `require_truthy=True` forkaster subsidiært standpunkt på 0 kr / 0 dager (Middels)

- **Fil og linje:** [`backend/services/timeline_service.py:66-95, 772-781, 861-870`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/timeline_service.py#L66-L95)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_tilstand_forretningsregler_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_tilstand_forretningsregler_audit_20260918.py).
- **Forutsetninger:** Byggherren tar et prinsipalt avslag og angir et subsidiært standpunkt med 0 kr i godkjent vederlag (`subsidiaer_godkjent_belop = 0.0`) eller 0 dager i fristforlengelse (`subsidiaer_godkjent_dager = 0`).
- **Svakhet:**
  Feltkopieringen kaller:
  ```python
  _copy_fields_if_present(event.data, vederlag, ["subsidiaer_godkjent_belop", ...], require_truthy=True)
  ```
  I funksjonen sjekkes:
  ```python
  if require_truthy:
      if value:
          setattr(target, field, value)
  ```
  Fordi `0` og `0.0` er falsy i Python (`bool(0) == False`), settes aldri feltet. På `state.vederlag` og `state.frist` forblir verdien `None`.
- **Konsekvens:** Et formelt og vanlig juridisk standpunkt (subsidiært 0 kr / 0 dager) svelges stille og vises som udefinert (`None`) i tilstandsmodellen og i genererte brev.

---

### TFR-05: Godkjent og låst ansvarsgrunnlag rapporteres som "UTKAST" (Middels)

- **Fil og linje:** [`backend/models/sak_state.py:1153-1157`](file:///Users/kasper/Projects/endringsmeldinger/backend/models/sak_state.py#L1153-L1157)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_tilstand_forretningsregler_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_tilstand_forretningsregler_audit_20260918.py).
- **Forutsetninger:** En sak opprettes med grunnlag, og byggherren godkjenner ansvarsgrunnlaget (`grunnlag.status = SporStatus.LAAST`). Entreprenøren har ennå ikke sendt inn vederlagskrav eller fristkrav (de står som `UTKAST`).
- **Svakhet:**
  Logikken i `overordnet_status`:
  ```python
  if any(s == SporStatus.UTKAST for s in aktive_statuser):
      ferdig_eller_utkast = ferdig_statuser | {SporStatus.UTKAST}
      if all(s in ferdig_eller_utkast for s in aktive_statuser):
          return "UTKAST"
  ```
  Her er `aktive_statuser = [SporStatus.LAAST, SporStatus.UTKAST, SporStatus.UTKAST]`. Begge delbetingelser oppfylles, og metoden returnerer `"UTKAST"`.
- **Konsekvens:** Saken fremstår i sakslisten som et usendt «UTKAST», til tross for at varsel om endring er formelt fremsatt, saksbehandlet og godkjent av byggherren etter NS 8407 §32.

---

### TFR-06: Manglende sperre mot respons på uspesifisert fristvarsel (Lav)

- **Fil og linje:** [`backend/services/business_rules.py:407-411, 452-461`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/business_rules.py#L407-L411)
- **Status:** Lest ut av koden.
- **Svakhet:**
  I vederlagssporet sjekker `_rule_vederlag_sent`:
  ```python
  if state.vederlag.varsler and not state.vederlag.metode:
      return ValidationResult(False, "Vederlaget er varslet, men det foreligger ikke et spesifisert krav...")
  ```
  I fristsporet mangler `_rule_frist_sent` tilsvarende kontroll for nøytrale varsler etter NS 8407 §33.4 (`state.frist.varsel_type == "varsel"`). Byggherren kan dermed sende en full `RESPONS_FRIST` med utmåling og dager på et fristvarsel hvor entreprenøren ennå ikke har spesifisert antall dager.

---

## Hva som passerte umerket

1. **Rolleinndeling per hendelsestype:**
   - `validate_actor_role` håndhever streng separasjon mellom TE-handlinger (varsler, krav, tilbaketrekkinger) og BH-handlinger (responser, utstedelse, revisjon av EO).
2. **Beskyttelse mot reopprettelse av spor:**
   - `_rule_create_once` hindrer pålitelig at allerede opprettede spor eller saker overskrives av nye opprettelseshendelser.
3. **Låsing av godkjent grunnlag:**
   - `_rule_grunnlag_not_locked` sikrer at et formelt godkjent og låst grunnlag ikke kan endres i ettertid med `GRUNNLAG_OPPDATERT`.
4. **Referansekonsistens:**
   - `_rule_response_reference` validerer at alle BH-responser eksplisitt refererer til `krav_event_id` for det gjeldende kravet i sporet.

---

## Hva som ble avskrevet med begrunnelse

1. **Hypotese: Kan en part sende vederlagskrav før grunnlaget i det hele tatt er opprettet?**
   - *Vurdert:* `_rule_grunnlag_required`.
   - *Avkreftet:* Regelen avviser `VEDERLAG_KRAV_SENDT` og `FRIST_KRAV_SENDT` med `ValidationResult(False, "Grunnlag må være sendt før du kan sende krav")` dersom grunnlaget er `IKKE_RELEVANT` eller `UTKAST`.
2. **Hypotese: Kan BH svare to ganger på samme versjon av et krav uten å oppdatere forrige svar?**
   - *Vurdert:* `_rule_grunnlag_not_already_responded`, `_rule_vederlag_not_already_responded`, `_rule_frist_not_already_responded`.
   - *Avkreftet:* Reglene håndhever at dersom BH allerede har respondert på gjeldende versjon, må `respons_*_oppdatert` benyttes i stedet.

---

## Verifikasjon

Testene for TFR-01, TFR-02, TFR-03, TFR-04 og TFR-05 ble først kjørt som vanlige tester (bekreftet 5 feil), deretter markert med `@pytest.mark.xfail(strict=True, raises=AssertionError)`.

Kjøring av Pass 3-testsuiten:
```bash
pytest -q -p no:cacheprovider tests/test_security/test_tilstand_forretningsregler_audit_20260918.py
```
**Resultat:** `5 xfailed, 4 warnings in 0.07s`.

Kjøring av hele backend-testsuiten:
```bash
pytest -q -p no:cacheprovider
```
**Resultat:** `1440 passed, 9 skipped, 15 xfailed (1 AP-04 + 4 Pass 2 + 5 Pass 4 + 5 Pass 3)`.
Ingen eksisterende tester er brutt, og ingen produksjonskode er endret.
