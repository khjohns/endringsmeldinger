# Audit: autorisasjon og tilgangskontroll (Pass 2) — 2026-09-18

Gjennomført 18. september 2026. Gjenstand:
Rute-autorisasjon, IDOR, prosjektisolasjon og rollevalidering i Flask-backend
(`backend/routes/`, `backend/lib/auth/`, `backend/services/`).

Kryssreferanser:
- [audit-review-astra-2026-09-17.md](audit-review-astra-2026-09-17.md) (spesielt RV-07 og RV-09)
- [audit-sikkerhetsarkitektur-2026-09-17.md](audit-sikkerhetsarkitektur-2026-09-17.md) (spesielt SA-02 og S2)
- Testfil: [test_autorisasjon_audit_20260918.py](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_autorisasjon_audit_20260918.py)

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

**Etterprøvd 2026-09-19** i [vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md). AUT-01 og AUT-02 er
bekreftet, og de er ikke nye feil: `tillatte_saker=cases_in_project` ble påført to
kallsteder da RV-07 ble lukket, og `valider_grunnlag_fortsatt_gyldig`
(`forsering_service.py:823`) itererer fortsatt `avslatte_fristkrav` ufiltrert.
Masterplanen er merket tilsvarende: RV-07 er lukket per kallsted, ikke som klasse.

**AUT-03 er et andre tilfelle av samme mønster.** RV-09 ble rettet i de fire
lesestiene, men `submit_batch` stempler fortsatt `last_event_at` ubetinget
(`event_routes.py:819`), også for interne notater. AUT-04 og AUT-06 er også
bekreftet; AUT-04 treffer standardoppsettet, siden `repository_type` er `"csv"`.

## Omfang

**Undersøkt:**
- Alle 11 rute-blueprints i `backend/routes/`:
  - `event_routes.py` (hendelser, saksliste, tidslinje, batch-innsending)
  - `forsering_routes.py` (forseringssaker, forseringsgrunnlag, forseringsrespons)
  - `eo_routes.py` (endringsordre)
  - `approval_routes.py` (godkjenning av KOE)
  - `utkast_routes.py` (kladdelagring)
  - `bim_link_routes.py` (BIM-koblinger)
  - `auth_routes.py` og `project_routes.py` (autentisering og prosjektvelger)
  - `attachment_routes.py`, `webhook_routes.py`, `brevkode_routes.py`
- Tjenestelaget som ruter kaller for saksoppslag og relasjoner (`ForseringService`, `EndringsordreService`, `BaseSakService`).
- Dekoratørene `@require_auth`, `@require_role`, `@require_project_access`, `@require_contract_roles` i `backend/lib/auth/`.

**Bevisst ikke undersøkt i dette passet:**
- Fullmaktsmatrise og beløpsgrenser for godkjenning (behandles i Pass 4).
- Frontend-skjerming av knapper og visning (behandles i Pass 3 og 6).
- Databasens RLS-policyer og direktetilgang via Data API (behandlet i Pass 1 og Astra-review).

---

## Sammendrag av funn

| ID | Alvorlighet | Kategori | Funn | Metode |
| --- | --- | --- | --- | --- |
| AUT-01 | Høy | IDOR / Lekkasje | `GET /api/forsering/<sak_id>/valider-grunnlag` evaluerer saker på tvers av prosjekter | Kjørt og observert |
| AUT-02 | Høy | IDOR / Lekkasje | `GET /api/forsering/by-relatert/<sak_id>` returnerer forseringssaker fra andre prosjekter | Kjørt og observert |
| AUT-03 | Middels | Konfidensialitet | `POST /api/events/batch` oppdaterer `last_event_at` for interne notater (omgår RV-09-skjerming) | Kjørt og observert |
| AUT-04 | Middels | Stabilitet / Rute | `SakMetadataRepository` (CSV) mangler `list_by_sakstype`; gir 500-feil på `/api/cases?sakstype=` | Kjørt og observert |
| AUT-05 | Lav | Tilgang / Konsistens | `ForseringService.hent_kandidat_koe_saker` mangler prosjektfiltrering på Catenda-topics | Lest ut av koden |
| AUT-06 | Lav | Tilgang / Konsistens | `BaseSakService.hent_relaterte_saker` verifiserer ikke `prosjekt_id` for relaterte saker | Lest ut av koden |

---

## Detaljerte funn

### AUT-01: Kryssprosjektstatuslekkasje i `valider_forseringsgrunnlag` (Høy)

- **Fil og linje:** [`backend/routes/forsering_routes.py:467-490`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/forsering_routes.py#L467-L490) og [`backend/services/forsering_service.py:823-877`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/forsering_service.py#L823-L877)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_autorisasjon_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_autorisasjon_audit_20260918.py).
- **Forutsetninger:** Bruker har gyldig tilgang til `project-b`. I `project-b` finnes en forseringssak der `avslatte_fristkrav` inneholder en saks-ID fra et annet prosjekt, f.eks. `A-1` i `project-a`.
- **Svakhet:**
  `valider_forseringsgrunnlag(sak_id)` henter forseringssaken, leser listen over refererte KOE-saker (`avslatte_fristkrav`), og kaller `_hent_sak_tilstand(sak_id)` for hver sak. Metoden slår opp hendelsene for `A-1` direkte uten å sjekke om `A-1` tilhører det aktive prosjektet (`prosjekt_id`).
  Dersom saken i `project-a` har fått endret status (f.eks. at byggherre har godkjent fristkravet), returnerer endepunktet:
  ```json
  {
    "er_gyldig": false,
    "grunn": "Byggherren har endret standpunkt og godkjent fristkrav for sak A-1.",
    "pavirket_sak_id": "A-1",
    "ny_status": "godkjent"
  }
  ```
- **Konsekvens:** En part i `project-b` får detaljert innsyn i motpartens/byggherrens konfidensielle kontraktstilstand og vedtak i et helt annet prosjekt (`project-a`). Dette er et IDOR-brudd og utvider funn RV-07 fra tidligere audit.

---

### AUT-02: Kryssprosjektlekkasje i `finn_forseringer_for_sak` (Høy)

- **Fil og linje:** [`backend/routes/forsering_routes.py:289-296`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/forsering_routes.py#L289-L296) og [`backend/services/forsering_service.py:368-442`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/forsering_service.py#L368-L442)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_autorisasjon_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_autorisasjon_audit_20260918.py).
- **Forutsetninger:** Bruker i `project-a` kaller `GET /api/forsering/by-relatert/A-1` for en sak de eier i `project-a`. En forseringssak `B-F` opprettet i `project-b` refererer til `A-1`.
- **Svakhet:**
  Endepunktet sjekker tilgang til `A-1`, men `ForseringService.finn_forseringer_for_sak(sak_id)` søker gjennom *alle* forseringssaker i databasen/repositoriet (både ved scan i event-repo og via `sak_relations`-oppslag). `sak_relations`-tabellen mangler `prosjekt_id`-kolonne, og scan-koden sjekker aldri `metadata.prosjekt_id == aktivt_prosjekt`.
  Dermed returneres `B-F` med full tittel og forseringsdata:
  ```json
  {
    "sak_id": "A-1",
    "forseringer": [
      {
        "sak_id": "B-F",
        "sakstittel": "Konfidensiell forsering i prosjekt B",
        "opprettet": "...",
        "dato_varslet": "2026-09-18"
      }
    ]
  }
  ```
- **Kontrast mot god praksis i samme kodebase:**
  [`EndringsordreService.finn_eoer_for_koe`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/eo_service.py#L358-L389) sjekker eksplisitt `self._belongs_to_project(koe_sak_id)` og itererer kun over `self._project_states()`. `ForseringService` mangler tilsvarende isolasjon.
- **Konsekvens:** Konfidensielle forseringskrav og sakstitler fra andre prosjekter lekkes på tvers av organisasjoner.

---

### AUT-03: Lekkasje av intern aktivitet via `POST /api/events/batch` (Middels)

- **Fil og linje:** [`backend/routes/event_routes.py:819-835`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/event_routes.py#L819-L835)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_autorisasjon_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_autorisasjon_audit_20260918.py).
- **Forutsetninger:** En bruker legger til et internt notat (`internt_notat`) via batch-endepunktet `POST /api/events/batch`.
- **Svakhet:**
  Enkelt-event-endepunktet `submit_event` ([linje 531](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/event_routes.py#L531)) skjermer `last_event_at` eksplisitt:
  ```python
  last_event_at = None if payload.get("event_type") == "internt_notat" else now
  ```
  Dette ble innført for å lukke RV-09 (lekkasje av interne notater i sakslisten).
  Men i `submit_batch` ([linje 823](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/event_routes.py#L823)) settes:
  ```python
  metadata_repo.update_cache(
      sak_id,
      # ...
      last_event_at=now,
  )
  ```
  Dette gjøres ubetinget for hele batchen, selv om batchen utelukkende består av et internt notat.
- **Konsekvens:** Motparten ser at `last_event_at` endres i `GET /api/cases`, og kan dermed utlede at motparten har lagret et internt notat eller intern vurdering, stikk i strid med formålet til RV-09.

---

### AUT-04: SakMetadataRepository mangler `list_by_sakstype` (Middels)

- **Fil og linje:** [`backend/routes/event_routes.py:992`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/event_routes.py#L992) og [`backend/repositories/sak_metadata_repository.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/repositories/sak_metadata_repository.py)
- **Status:** Kjørt og observert som feilende test; markert som streng xfail i [`test_autorisasjon_audit_20260918.py`](file:///Users/kasper/Projects/endringsmeldinger/backend/tests/test_security/test_autorisasjon_audit_20260918.py).
- **Forutsetninger:** Applikasjonen kjører med CSV-basert metadata-repository (standard ved lokal utvikling og i filbaserte miljøer). Klienten kaller `GET /api/cases?sakstype=standard`.
- **Svakhet:**
  I `event_routes.py`:
  ```python
  if sakstype:
      metadata_list = _get_metadata_repo().list_by_sakstype(sakstype)
  ```
  Metoden `list_by_sakstype` er kun implementert i `SupabaseSakMetadataRepository` (`repositories/supabase_sak_metadata_repository.py`), men mangler helt i baseklassen / CSV-klassen `SakMetadataRepository`. Kallet kaster ufanget `AttributeError` og returnerer 500 Internal Server Error.
- **Konsekvens:** Total funksjonssvikt ved filtrering på sakstype i miljøer uten live Supabase.

---

### AUT-05: Manglende prosjektfiltrering i `ForseringService.hent_kandidat_koe_saker` (Lav)

- **Fil og linje:** [`backend/routes/forsering_routes.py:278-286`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/forsering_routes.py#L278-L286) og [`backend/services/forsering_service.py:497-573`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/forsering_service.py#L497-L573)
- **Status:** Lest ut av koden.
- **Svakhet:**
  Metoden henter kandidatsaker via `client.list_topics()` og mapper topics til metadata. Den verifiserer aldri at sakene faktisk tilhører det aktive prosjektet (`prosjekt_id`), i motsetning til `EndringsordreService.hent_kandidat_koe_saker` som eksplisitt filtrerer mot `get_project_id()`.
  Videre feiler den lukket til tom liste dersom `catenda_client` er `None`, selv om det finnes avviste saker lagret lokalt.

---

### AUT-06: `BaseSakService.hent_relaterte_saker` verifiserer ikke prosjekt på relaterte saker (Lav)

- **Fil og linje:** [`backend/routes/forsering_routes.py:244-253`](file:///Users/kasper/Projects/endringsmeldinger/backend/routes/forsering_routes.py#L244-L253) og [`backend/services/base_sak_service.py:87-140`](file:///Users/kasper/Projects/endringsmeldinger/backend/services/base_sak_service.py#L87-L140)
- **Status:** Lest ut av koden.
- **Svakhet:**
  `ForseringService.hent_relaterte_saker` arver fra `BaseSakService`. Den henter relaterte saksnumre via Catenda og slår opp metadata via `metadata_repo.get(rel_id)`. Dersom en relatert sak i Catenda peker på et saksnummer som finnes i et annet prosjekt i den felles metadatalagringen, returneres metadata for den fremmede saken uten sjekk på om `prosjekt_id` stemmer overens.

---

## Hva som passerte umerket

Under gjennomgangen ble følgende sikkerhetsmekanismer etterprøvd og funnet solide:

1. **Rute-dekorering og konsistens:**
   - Samtlige muterende endepunkter i `utkast_routes.py`, `eo_routes.py`, `forsering_routes.py` og `event_routes.py` krever både `@require_project_access` og relevante rollebegrensninger (`@require_contract_roles("TE")` osv.).
2. **CSRF-beskyttelse:**
   - Ruter med tilstandsendring (POST, PUT, DELETE) er dekorerte med CSRF-validering via dobbel-cookie (`X-CSRF-Token` header sammenliknet med sesjonens CSRF-token).
3. **Skjerming av interne notater på ordinære hendelsesoppslag:**
   - `submit_event` (enkelt-event) setter `last_event_at=None` ved opprettelse av interne notater.
   - `timeline_service.filter_internal_notes()` fjerner interne notater pålitelig dersom innlogget aktør tilhører motparten eller mangler tilknytning til forfatterteamet.
4. **Isolasjon i EndringsordreService:**
   - `EndringsordreService` har konsekvent og grundig prosjektsjekk (`_belongs_to_project`, `_project_states`) på alle spørringer for å hindre kryssprosjektlekkasje mellom KOE-saker og endringsordre.

---

## Hva som ble avskrevet med begrunnelse

1. **Hypotese: Kan en bruker manipulere `X-Project-ID` for å sende hendelser til et annet prosjekt via `POST /api/events`?**
   - *Vurdert:* `event_routes.py:339` leser `X-Project-ID`.
   - *Avkreftet:* `@require_project_access` validerer `X-Project-ID` mot listen over prosjekter brukeren har tilgang til i sin signerte sesjon (`session.get("projects")`). Dersom brukeren oppgir en prosjekt-ID de ikke har tilgang til, returneres 403 Forbidden umiddelbart.
2. **Hypotese: Kan en bruker hente utkast som tilhører andre brukere eller prosjekter via `GET /api/utkast/<sak_id>`?**
   - *Vurdert:* `utkast_routes.py`.
   - *Avkreftet:* Endepunktet verifiserer prosjekttilhørighet og bruker-ID mot det lagrede utkastet, og avviser lesere som ikke eier utkastet eller mangler prosjekttilgang.
3. **Hypotese: Kan en bruker omgå rollebegrensninger ved å endre kontraktsrolle i forespørselen?**
   - *Vurdert:* `lib/auth/decorators.py:require_contract_roles`.
   - *Avkreftet:* Kontraktsrollen leses ikke fra klientens input, men slås opp fra brukerens medlemskap i Catenda/prosjekt-konteksten via `auth.contract_role(project_id)`.

---

## Verifikasjon

Testene for AUT-01, AUT-02, AUT-03 og AUT-04 ble først kjørt som vanlige tester (bekreftet 4 feil), deretter markert med `@pytest.mark.xfail(strict=True, raises=AssertionError)`.

Kjøring av Pass 2-testsuiten:
```bash
pytest -q -p no:cacheprovider tests/test_security/test_autorisasjon_audit_20260918.py
```
**Resultat:** `4 xfailed, 4 warnings in 0.08s`.

Kjøring av hele backend-testsuiten:
```bash
pytest -q -p no:cacheprovider
```
**Resultat:** `1440 passed, 9 skipped, 5 xfailed (1 fra før AP-04 + 4 nye)`.
Ingen eksisterende tester er brutt, og ingen produksjonskode er endret.
