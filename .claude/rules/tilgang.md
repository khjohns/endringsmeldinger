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
  - "server/**"
  - "sprakprove/kjernelagring/**"
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

`server/autorisasjon.ts` speiler `require_auth`, `require_project_access` og
`require_contract_role`, i samme rekkefølge og med samme svar. Språkprøven i
`sprakprove/server/` bruker en kopi i `sprakprove/server/autorisasjon.ts`, som
leser PostgreSQL, fordi `server/autorisasjon.ts` flyttes til SQL Server (#658).

- **Registeret.** Hver inngang i TS-serveren står i `RUTER` i `server/app.ts`
  med prosjektrollen og kontraktsrollen den krever, eller en skriftlig
  begrunnelse for at den ikke krever kontraktsrolle. Ruteren kontrollerer
  tilgangen fra registeret før behandleren kalles, og en sti som ikke står der,
  gir 404. `server/tester/register.test.ts` prøver hver inngang over HTTP:
  uten sesjon, uten og med feil CSRF-token, uten prosjekt, i feil prosjekt,
  mot en sak i et annet prosjekt og uten kontraktsteam.
- **Serverstemplede felt.** En kommando har ingen aktør, ID eller tidspunkt.
  Kroppen avvises med ukjente felt, og kjernens skjema avviser ukjente felt i
  kommandoen. Aktøren er `app_users.id` fra sesjonen.
- **Oppslagene i SQL Server.** Kjøretiden har ingen rett på koblingen,
  medlemskapet eller kontraktsteamene, og leser dem med `koe_api.prosjektkobling`,
  `koe_api.prosjektmedlemskap` og `koe_api.kontraktsteam`. De to siste gir bare
  rader for aktøren som spør. Om sakene det vises til er i prosjektet, leses i
  `koe.sak_metadata` under radsikkerheten, med aktøren og prosjektet i
  konteksten. Alderen på medlemslisten leses bare i `server/autorisasjon.ts`
  (#638 punkt 2, `server/tester/arkitektur.test.ts`).
- **Prosjektgrensen** holdes også ved lesing og skriving av journalen. Lesingen
  i `server/lager.ts` og skrivingen i `server/kommandoer.ts` går hver i sin
  transaksjon med aktøren og prosjektet i konteksten. Filterpredikatet
  `koe_sikkerhet.medlem` slipper bare gjennom saker og hendelser i prosjektet i
  konteksten, så en sak utenfor finnes ikke, og blokkpredikatet
  `koe_sikkerhet.skriver` stopper en rad i et annet prosjekt.
  `koe_api.skriv_hendelse` kontrollerer og stempler prosjektet fra konteksten i
  tillegg.
- Språkprøvens server har ikke registeret. Der prøves hver inngang for seg
  (`.claude/rules/tester.md`).
