# Audit: innloggingsbaner og tilgangssamspill

Dato: 2026-09-14. Omfanget er backend-rutene som er aktive i Flask-appen, samt
de eldre magic-link- og Entra-dekoratørene. Supabase/RLS og live identitets-
leverandører er ikke testet.

## Konklusjon

De aktive saksrutene bruker den provider-uavhengige cookie-sesjonen. Et Bearer-
token i `Authorization`-headeren kan ikke erstatte sesjonen, og `ENTRA_ENABLED`
endrer ikke denne kontrollen. Prosjektrolle og TE/BH-kontraktrolle blir deretter
kontrollert mot Catenda-medlemskap på serversiden.

Magic link er fortsatt en mulig fremtidig innloggingskanal for fullmektige eller
godkjennere uten Catenda-konto. Den eksisterende `/api/magic-link/verify`-ruten
er imidlertid bevisst avviklet og svarer 410; dette er en produktbeslutning, ikke
en bekreftelse på at magic-link-funksjonaliteten må fjernes. En eventuell
gjenåpning må kobles til samme sesjons-, prosjekt- og godkjenningskontroller som
Catenda-innloggingen.

## Funn og retting

### AUTH-01 — Høy: legacy dev-bypass kunne brukes i alle miljøer — rettet

`require_magic_link` godtok `DISABLE_AUTH=true` alene. Den kunne dermed omgå
magic-link-tokenkontrollen i et produksjonsmiljø dersom variabelen ble satt.
Bypassen bruker nå samme `dev_auth_disabled()` som resten av appen: både
`DISABLE_AUTH=true` og testing eller `APP_ENV=development` må være aktive.
Selve magic-link-verifiseringen er uendret.

### AUTH-02 — Ingen aktiv rute funnet som bruker legacy Entra/magic-link-dekoratør

Rutesøk og registrerte blueprints viser at domene-API-et bruker
`require_auth`/`require_project_access`. Legacy-dekoratørene er derfor ikke en
parallell tilgangsbane for dagens saksbehandling, men de er testet fordi de er
eksportert og kan bli brukt av senere ruter.

## Testet samspill

Det er lagt til 15 tester i `backend/tests/test_auth/test_auth_interactions.py`:

- produksjon/staging avviser dev-bypass; testing/development tillater den;
- Bearer-token uten cookie gir 401, også når `ENTRA_ENABLED` endres;
- cookie-identiteten bestemmer bruker selv når en annen Bearer-verdi sendes;
- CSRF-token fra Alice avvises etter bytte til Bobs sesjon;
- ukjent sesjon og utilgjengelig auth-lagring gir henholdsvis 401 og 503 uten
  fallback til Bearer-token;
- den avviklede magic-link-ruten oppretter ikke sesjon.

Dette bekrefter ikke en live Catenda-, Entra- eller magic-link-innlogging. Det
gjenstår også å utforme godkjennerflyten dersom magic link skal brukes som
alternativ identitetsleverandør.

## Neste delgjennomgang

Domenelaget er dekket i
[generert begrunnelsestekst og domenelagets rekkevidde](audit-begrunnelsestekst-og-dodkode-2026-09-14.md).
Den runden retter en §34.1.2-påstand i brevtekst ved ENDRING, gjenoppretter en rød
frontendtest som lå brutt gjennom denne auditrunden, og kartlegger NS 8407-regelmoduler
som ikke er nåbare fra noen rute.
