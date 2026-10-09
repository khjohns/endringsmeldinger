---
paths:
  - "backend/routes/**"
  - "backend/lib/auth/**"
  - "backend/lib/project_context.py"
  - "backend/lib/aktor_navn.py"
  - "backend/services/**"
  - "backend/repositories/**"
  - "backend/tests/test_security/**"
  - "sprakprove/**/server/**"
---

# Tilgang: mekanismene bak sikkerhetsinvariantene

Invariantene står i `AGENTS.md` og gjelder hver serverinngang, i begge språk.
Her står hvordan Python håndhever dem, og hva TS-stien mangler.

## Python

- **Rutene.** Hver rute har `require_auth` + `require_project_access` +
  eventuelt `require_contract_role` (`backend/lib/auth/`).
  `backend/tests/test_security/test_public_route_registry.py` håndhever de to
  første: en rute uten `require_auth` må stå i `OFFENTLIGE_RUTER`, og en
  autentisert rute uten `require_project_access` i `UTEN_PROSJEKT`, begge med
  skriftlig begrunnelse. Legger du til en rute, forvent å måtte begrunne den
  der. Dekoratørene teller bare under rutedekoratøren, og en rute testen ikke
  kan lese ut av `routes/`, gir rød test mot `app.url_map`.
  `require_contract_role` kontrolleres ikke.
- **CSRF** håndheves inne i `require_auth` (`backend/lib/auth/session.py`).
- **Serverstemplede felt.** `event_id` og `tidsstempel` avvises av
  `parse_event_from_request` (`backend/models/events.py`). De tre aktørfeltene
  overskrives i ruta før parsing.
- **Identiteten.** Webhookstien (`backend/services/catenda_webhook_service.py`)
  løser identiteten gjennom `koe_resolve_identity` med samme issuer
  (`CatendaOAuth.BASE`) og samme normaliserte subjekt (`catenda_id()`) som
  innloggingen. Navnet slås opp ved visning i `backend/lib/aktor_navn.py`.
- **Skjermingen** av interne notater og utkast er
  `backend/lib/auth/event_visibility.py`.
- **Prosjektgrensen.** Klientoppgitte saksrelasjoner avgrenses med
  `cases_in_project` (`backend/lib/auth/project_access.py`). `get_project_id()`
  (`backend/lib/project_context.py`) returnerer `None` når `X-Project-ID`
  mangler.

## TS-stien

`sprakprove/server/autorisasjon.ts` speiler `require_auth`,
`require_project_access` og `require_contract_role`, i samme rekkefølge og med
samme svar. Det finnes ingen registertest som fanger en inngang uten kontroll.
Den hører til overtakelsen (#310). Til da prøves hver inngang for seg, med
avvisning uten sesjon, uten CSRF-token, i feil prosjekt og med feil rolle
(`.claude/rules/tester.md`).
