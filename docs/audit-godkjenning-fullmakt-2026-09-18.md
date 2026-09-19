# Audit: godkjenning og fullmakt (Pass 4) — 2026-09-18

Gjennomført 18. september 2026. Gjenstand:
Fullmaktskontroll, beløpsgrenser, tidsfrister, godkjenningskjedens integritet,
saksbehandlerflyt, samt brev- og PDF-generering i backend
(`backend/services/approval_authority.py`, `backend/services/approval_service.py`,
`backend/services/eo_approval_service.py`, `backend/routes/approval_routes.py`,
`backend/routes/endringsordre_routes.py`, `backend/routes/letter_routes.py`,
`backend/services/approval_letter.py`, `backend/services/letter_pdf_generator.py`).

Kryssreferanser:
- [audit-review-astra-2026-09-17.md](audit-review-astra-2026-09-17.md) (spesielt RV-01, RV-02, RV-03, RV-04)
- [masterplanen for godkjenning og varig levering](plans/2026-09-16-godkjenning-og-varig-levering.md)
- [audit-autorisasjon-2026-09-18.md](audit-autorisasjon-2026-09-18.md) (Pass 2)
- Testfil: [test_godkjenning_fullmakt_audit_20260918.py](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_godkjenning_fullmakt_audit_20260918.py)

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

---

**Etterprøvd 2026-09-19** i [vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md). GFK-01 er bekreftet,
med én presisering: hele kjeden returneres, så dette er ikke selvutstedelse — men
`minimum > 0`-kontrollen hoppes over når gulvet er 0, så kjeden slipper
fullmaktskontrollen. `order_exposure_floor` må ta `daily_rate` og inkludere
`frist_dager * daily_rate`; signaturen må endres. FE-04 er samme feil i
frontend-kopien og må rettes i samme runde.

**GFK-03 er duplikat av RV-02**, som står som åpen prioritet 1 i masterplanen.
**GFK-04 er korrekt, men er allerede en truffet beslutning:** masterplanen fører
at «prosjekter med policy inntil videre ikke kan svare på forseringsvarsel, fordi
godkjenningsflyten ikke modellerer forseringssporet». Akseptert gjeld, ikke ny
feil. GFK-05 og GFK-06 er kun lest.

## Omfang

**Undersøkt:**
- Fullmaktsmatrisen og beløpsgrensene i `approval_authority.py` (`LIMITS`, `exposure`, `resolve_route`, `covers`).
- Privat godkjenningsaggregat for KOE-responser i `approval_service.py` (`ApprovalService`, `prepare`, `package`, `approve`, `reconcile_policy`, `publish`).
- Privat godkjenningsaggregat for endringsordrer i `eo_approval_service.py` (`EOApprovalService`, `order_exposure`, `order_exposure_floor`, `reconcile`, `issue`).
- Rute-endepunkter for godkjenning i `approval_routes.py` og `endringsordre_routes.py:eo_godkjenninger`.
- Brev- og PDF-generering: `letter_routes.py` (`POST /api/letter/generate`), `approval_letter.py` og `letter_pdf_generator.py`.
- Tidligere identifiserte svakheter fra Astra-review (RV-01, RV-02, RV-03, RV-04).

**Bevisst ikke undersøkt i dette passet:**
- Frontend-skjerming av knapper og godkjenningspanel i Svelte (behandles i Pass 3 og 6).
- Databasens RLS-policyer og migreringer (behandlet i Pass 1).
- Vedleggslagring og BIM-koblinger (behandles i Pass 5).

---

## Sammendrag av funn

| ID | Alvorlighet | Kategori | Funn | Metode |
| --- | --- | --- | --- | --- |
| GFK-01 | Høy | Fullmaktssvikt | `order_exposure_floor` mangler fristdager; endringsordre med fristverdi i millionklassen kan godkjennes over fullmakt | Kjørt og observert |
| GFK-02 | Høy | Fullmaktssvikt | `exposure()` ignorerer `ny_sluttdato` i KOE-fristrespons; 2 års forskyvning godkjennes uten kjede | Kjørt og observert |
| GFK-03 | Middels/Høy | Tilstand / Concurrency | `reconcile()` returnerer pakke midt under aktiv utstedelse; ordren utstedes, posten står varig som «returnert» (RV-02) | Kjørt og observert |
| GFK-04 | Middels/Høy | Funksjonssvikt / Deadlock | `forsering_respons` er blokkert av porten, men støttes ikke i `ApprovalService`; byggherren kan ikke svare | Kjørt og observert |
| GFK-05 | Middels | Tilgang / Forfalskning | `POST /api/letter/generate` tillater TE å generere offisielle BH-brev som PDF uten godkjenning | Kjørt og observert |
| GFK-06 | Lav | Domenemodell | Godkjenning av ansvarsgrunnlag alene evalueres til 0 kr uavhengig av sakens kravstørrelse | Lest ut av koden |

---

## Detaljerte funn

### GFK-01: Fullmaktsomgåelse for fristdager i endringsordrer (`order_exposure_floor`) (Høy)

- **Fil og linje:** [`backend/services/eo_approval_service.py:61-69`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/eo_approval_service.py#L61-L69) og [`backend/services/approval_authority.py:70-94`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/approval_authority.py#L70-L94)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_godkjenning_fullmakt_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_godkjenning_fullmakt_audit_20260918.py).
- **Forutsetninger:** En endringsordre inneholder en avtalt fristforlengelse (f.eks. 500 dager) kombinert med en ny sluttdato (`ny_sluttdato`), men 0 kr eller uoppgitt vederlagsbeløp.
- **Svakhet:**
  I `order_exposure` fører `ny_sluttdato` til at totaleksponeringen ikke kan beregnes og settes til `None` (fordi systemet mangler baseline-dato).
  For å hindre at en ordre med uavklart totaleksponering omgår fullmaktsgrenser, innførte RV-01 `order_exposure_floor`:
  ```python
  def order_exposure_floor(request):
      return max(
          number(request.get("kompensasjon_belop")), number(request.get("fradrag_belop"))
      )
  ```
  Denne funksjonen ser **utelukkende på vederlagsbeløp**. Den ignorerer `frist_dager * daily_rate` fullstendig.
  Når `kompensasjon_belop == 0`, blir `floor = Decimal(0)`.
  I `resolve_route(amount=None, sender, chain, minimum=0)` evalueres sjekken:
  ```python
  if amount is None and minimum is not None and minimum > 0:
      if not any(covers(person.get("role"), minimum) for person in chain):
          raise ValueError(...)
  ```
  Fordi `minimum == 0`, er `minimum > 0` usant.
  Dermed returnerer `resolve_route` kjeden som den er. Dersom kjeden kun inneholder en Prosjektleder (fullmaktsgrense 200 000 kr), kreves kun Prosjektlederens godkjenning for å utstede ordren!
- **Konsekvens:** I NS 8407 er fristforlengelse en direkte økonomisk forpliktelse (tap av dagmulktkrav for byggherren, jf. §33.8 og §40). Med en ordinær dagmulktssats på f.eks. 10 000 kr/dag (eller 50 000 kr/dag på et større prosjekt), representerer 500 dager en eksponering på henholdsvis 5 eller 25 millioner kroner. Denne forpliktelsen godkjennes og utstedes av en prosjektleder med 200 000 kr i fullmakt, fordi fullmaktsgulvet glemte dagsatsberegningen.

---

### GFK-02: Fullmaktsomgåelse ved godkjenning av `ny_sluttdato` i KOE-fristrespons (Høy)

- **Fil og linje:** [`backend/services/approval_authority.py:29-67`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/approval_authority.py#L29-L67) og [`backend/services/approval_service.py:104-111`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/approval_service.py#L104-L111)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_godkjenning_fullmakt_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_godkjenning_fullmakt_audit_20260918.py).
- **Forutsetninger:** Byggherren svarer på et fristkrav i en KOE-sak ved å godkjenne en ny sluttdato (`ny_sluttdato` i `FristResponsData`), men oppgir `godkjent_dager: 0` eller lar feltet stå tomt.
- **Svakhet:**
  I `exposure(items, daily_rate=None)` beregnes fristeksponering utelukkende slik:
  ```python
  time = item["track"] == "frist"
  assessed = number(data.get("godkjent_dager"))
  ```
  `ny_sluttdato` (f.eks. "2028-12-31", som forskyver ferdigstillelse med 2 år) ignoreres totalt.
  Dermed returnerer `exposure()`: `amount = Decimal(0)` og `needs_rate = False`.
  Når `approval_route` kaller `resolve_route(0, sender, chain)` for en saksbehandler med rolle "Prosjektleder", dekker rollen 0 kr (`covers("Prosjektleder", 0) == True`), og returnerer tom rute (`route = []`).
  Pakken markeres umiddelbart som `godkjent` ved innsending i `ApprovalService` (`mark_approved(package, events)`).
- **Konsekvens:** I motsetning til endringsordrer (hvor `ny_sluttdato` tvinger frem full godkjenningskjede), finnes det null kontroll på `ny_sluttdato` i vanlige KOE-brev. En saksbehandler kan på egen hånd binde byggherren til flerårige utsettelser av byggeprosjektets sluttfrist uten at prosjektdirektør, avdelingsleder eller adm.dir godkjenner det.

---

### GFK-03: Regresjon fra RV-02: `reconcile()` returnerer pakke midt under aktiv utstedelse (Middels/Høy)

- **Fil og linje:** [`backend/services/eo_approval_service.py:212-250, 422-435`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/eo_approval_service.py#L212-L250)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_godkjenning_fullmakt_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_godkjenning_fullmakt_audit_20260918.py).
- **Forutsetninger:** En endringsordre er godkjent og under aktiv utstedelse (`issuingAt` og `issuingAttempt` er satt). En samtidig forespørsel (f.eks. en `read()` eller en policyendring) trigger `reconcile(state)`.
- **Svakhet:**
  `reconcile()` sjekker ikke om det foreligger en aktiv lease (`issuingAt`).
  Dersom policyen oppfattes som endret (eller omberegning feiler), setter `reconcile()` pakkens status til `"returnert"` og fjerner `issuingAt` og `issuingAttempt` fra pakken.
  Når den pågående `issue()`-tråden fullfører lagringen i hendelsesloggen og forsøker å registrere kvitteringen:
  ```python
  if p.get("issuingAttempt") != attempt:
      return
  ```
  blir kvitteringen forkastet.
  Pakken forblir stående med status `"returnert"`. Ved senere kjøringer av `reconcile()` sjekkes kun pakker med status `godkjent` eller `utstedelse_feilet`:
  ```python
  if p["status"] in ("godkjent", "utstedelse_feilet"):
      if p.get("sakId") and self.issued(p["sakId"]):
          self.record_issued(p, recovered=True)
  ```
  Pakker med status `"returnert"` blir aldri sjekket mot `self.issued(sak_id)`.
- **Konsekvens:** Endringsordren er gyldig utstedt offentlig og synkronisert med Catenda, men i byggherrens interne godkjenningssystem står ordren permanent markert som «krever ny godkjenning». Dette er den urettede regresjonen beskrevet i RV-02.

---

### GFK-04: Forseringsrespons er blokkert i porten, men kan ikke behandles i `ApprovalService` (Middels/Høy)

- **Fil og linje:** [`backend/services/approval_policy.py:106-107`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/approval_policy.py#L106-L107), [`backend/routes/forsering_routes.py:402-406`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/forsering_routes.py#L402-L406), og [`backend/services/approval_service.py:24, 224-228`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/approval_service.py#L24)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_godkjenning_fullmakt_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_godkjenning_fullmakt_audit_20260918.py).
- **Forutsetninger:** Prosjektet har aktivert intern godkjenningspolicy (`BH_APPROVAL_POLICIES`). Entreprenøren har varslet forsering etter NS 8407 §33.8. Byggherren skal besvare varselet.
- **Svakhet:**
  Etter RV-04 ble `forsering_respons` lagt til i `BH_BINDENDE_EVENTS`. Både hendelsesruten og `POST /api/forsering/respons` blokkeres med 403:
  `"Svar på forseringsvarsel må publiseres gjennom intern godkjenning."`
  Men i `ApprovalService` er spormodellen hardkodet til:
  ```python
  TRACKS = ("grunnlag", "vederlag", "frist")
  ```
  Ved forsøk på å klargjøre en forseringsrespons (`action="prepare"`) kaster `ApprovalService` en `ValueError("Ugyldig vurderingstype.")`. `EOApprovalService` håndterer kun endringsordrer.
- **Konsekvens:** I prosjekter med godkjenningspolicy er byggherren **totalt forhindret fra å besvare forseringsvarsler**. Etter NS 8407 §33.8 andre ledd tapes byggherrens innsigelser dersom svar ikke gis «uten ugrunnet opphold». Systemet tvinger dermed frem en juridisk passivitet som kan påføre byggherren millionansvar for forseringskostnader.

---

### GFK-05: Uautorisert generering av formelle byggherrebrev som PDF via `/api/letter/generate` (Middels)

- **Fil og linje:** [`backend/routes/letter_routes.py:25-130`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/letter_routes.py#L25-L130)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_godkjenning_fullmakt_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_godkjenning_fullmakt_audit_20260918.py).
- **Forutsetninger:** En innlogget entreprenør-bruker (`contract_role: "TE"`) har tilgang til prosjektet.
- **Svakhet:**
  Endepunktet `POST /api/letter/generate` har kun `@require_auth` og `@require_project_access()`.
  Det mangler `@require_contract_role("BH")` og validerer ikke at innlogget bruker har tilknytning til den oppgitte avsenderen.
  En TE-bruker kan sende inn vilkårlig brevinnhold med `avsender: {"navn": "Oslobygg KF", "rolle": "BH"}` og motta et ferdig generert, offisielt utseende PDF-brev som bekrefter godkjenning av krav, uten at saken er godkjent eller registrert i hendelsesloggen.
- **Konsekvens:** Fare for forfalskning av formelle brev og omgåelse av godkjenningskjeden.

---

### GFK-06: Godkjenning av ansvarsgrunnlag alene evalueres til 0 kr uavhengig av sakens kravstørrelse (Lav / Arkitektur)

- **Fil og linje:** [`backend/services/approval_authority.py:35-36`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/approval_authority.py#L35-L36)
- **Status:** Lest ut av koden.
- **Svakhet:**
  I `exposure(items, daily_rate=None)`:
  ```python
  for item in items:
      if item["track"] == "grunnlag":
          continue
  ```
  Dersom en saksbehandler oppretter en pakke som kun inneholder vurdering av ansvarsgrunnlag (`respons_grunnlag`), evalueres eksponeringen til `Decimal(0)`.
  Saksbehandler (Prosjektleder med 200 000 kr i fullmakt) kan godkjenne pakken alene.
- **Konsekvens:** I en sak der entreprenøren krever 50 millioner kroner, vil en godkjenning av ansvarsgrunnlaget binde byggherren til at det foreligger en endring (NS 8407 §32.1). Selv om vederlagets størrelse formelt vurderes senere, er det prinsipale ansvaret allerede innrømmet av en person med 200k-fullmakt.

---

## Hva som passerte umerket

1. **RV-03 identitetsbinding:**
   - `resolve_policy_actor` i `services/approval_policy.py` håndhever at fullmakter i produksjonslignende miljøer bindes strengt til `user_id`, og avviser e-postmatching med `PermissionError`.
2. **RV-01 beløpskontroll for endringsordrer:**
   - `order_exposure_floor` fanger opp vederlagsbeløp korrekt; dersom avtalt kompensasjon overstiger kjedens maksimale fullmakt, avvises ordren selv om totaleksponeringen er uavklart.
3. **Integritets- og hashkontroll i godkjenningspakker:**
   - Både `ApprovalService` og `EOApprovalService` validerer `contentHash` og `digest(letter/request)` før godkjenning og publisering. Eventuelle forsøk på å endre tekst eller vedtak etter godkjenning avvises.
4. **Outbox-mønster og idempotent publisering:**
   - `approval_outbox` og publiseringslås sikrer at offentlige hendelser aldri dupliseres ved retries eller feil under varsling.

---

## Hva som ble avskrevet med begrunnelse

1. **Hypotese: Kan en godkjenner i kjeden godkjenne en pakke før forrige ledd har godkjent?**
   - *Vurdert:* `ApprovalService.command(action="approve")`.
   - *Avkreftet:* Koden slår opp `active = next((s for s in p["steps"] if s["status"] == "aktiv"), None)`. Bare den personen som har status "aktiv" kan beslutte pakken (`if not active or active["id"] != actor: raise PermissionError`). Følgende steg aktiveres først sekvensielt etter at aktivt steg er godkjent.
2. **Hypotese: Kan en saksbehandler trekke tilbake en pakke etter at den er godkjent av kjeden?**
   - *Vurdert:* `ApprovalService.command(action="withdraw")`.
   - *Avkreftet:* Koden krever `if actor != p["owner"] or any(s["status"] == "godkjent" for s in p["steps"]): raise PermissionError("Pakken kan bare trekkes før første godkjenning.")`.
3. **Hypotese: Kan en bruker manipulere `daily_rate` i forespørselen for å redusere beregnet fullmaktsbeløp?**
   - *Vurdert:* `approval_routes.py` og `endringsordre_routes.py`.
   - *Avkreftet:* `daily_rate` leses utelukkende fra serverens godkjenningspolicy eller prosjektkonfigurasjonen i databasen, aldri fra forespørselsdataene.

---

## Verifikasjon

Testene for GFK-01, GFK-02, GFK-03, GFK-04 og GFK-05 ble først kjørt som vanlige tester (bekreftet 5 feil), deretter markert med `@pytest.mark.xfail(strict=True, raises=AssertionError)`.

Kjøring av Pass 4-testsuiten:
```bash
pytest -q -p no:cacheprovider tests/test_security/test_godkjenning_fullmakt_audit_20260918.py
```
**Resultat:** `5 xfailed, 4 warnings in 0.09s`.

Kjøring av hele backend-testsuiten:
```bash
pytest -q -p no:cacheprovider
```
**Resultat:** `1440 passed, 9 skipped, 10 xfailed (1 AP-04 + 4 Pass 2 + 5 Pass 4)`.
Ingen eksisterende tester er brutt, og ingen produksjonskode er endret.
