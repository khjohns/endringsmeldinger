# Audit: API-klient, prosjektbytte og sesjon

Dato: 2026-09-14. Utgangspunkt: commit `28724d5`. Supabase/RLS og live
Catenda-oppslag er utenfor omfang. Ingen innloggingshemmeligheter er lest.

## Brukerbekreftede observasjoner

Brukeren rapporterer at ekte Catenda-innlogging passerer med egen konto og en
kollegas konto. Det er dokumentert i [Catenda-innlogging](catenda-innlogging.md).
Ekstern konto er fortsatt uprøvd; forventning om samme OAuth-flyt er ikke merket
som en gjennomført test. Minnelageret i testskriptet verifiserer ikke databasedrift.

Brukeren bekrefter separate TE/BH-team og har senere bekreftet at navnene
`@BYGGHERRE` og `@TE-(PL og PGL)` brukes i alle prosjekter. Dette er
brukerbekreftet standardisering; ingen automatisk prosjektinventering er utført.
Appens eksisterende tilgangskontroll bruker team-ID-er per prosjekt, ikke navn,
e-postdomene eller antatt intern/ekstern tilhørighet. Faktiske ID-er er ikke hentet
eller konfigurert i denne runden.

## Funn og rettinger

### CLIENT-01 — Feil fra CSRF-retry skjules — rettet

API-klienten returnerte den første HTTP 403-responsen også når forespørselen med
nytt CSRF-token ga eksempelvis 409 eller 401. Dermed forsvant versjonskonfliktens
melding, og en utløpt sesjon ved retry utløste ikke innloggingsredirect.
To tester reproduserte dette før retting.

Første forsøk og retry deler nå responshåndtering. Faktisk siste status, data og
melding returneres. HTTP 401 utløser redirect også ved retry og ved tokenhenting.
Bare eksplisitt CSRF-avvisning kan gi én automatisk retry. Nettverksfeil, generell
403 eller serverfeil gir ingen automatisk gjentakelse av skrivekallet.

### CLIENT-02 — Gyldige headerformater mister prosjektavgrensning — rettet

`apiFetch` godtok `RequestInit`, men spredde `options.headers` som et vanlig objekt.
`Headers` og tuple-lister mistet dermed den eksplisitte `X-Project-ID`-verdien og
brukte globalt aktivt prosjekt. Begge varianter er reprodusert. De undersøkte
produksjonskallene brukte primært objektformen, så en faktisk kryssprosjekthendelse
er ikke påvist. Backendens tilgangskontroll forblir en separat barriere.

Headerne normaliseres nå med `Headers`, før asynkron tokenhenting. Nytt CSRF-token
kan ikke overskrives av et gammelt token i innsendte headers. Prosjektmålet beholdes
også når navigasjon endrer globalt prosjekt mens tokenhentingen pågår.

### CLIENT-03 — Prosjektoperasjoner avhenger unødvendig av globalt prosjekt — rettet

`getProject`, `updateProject` og `deactivateProject` brukte eksplisitt prosjekt-ID i
URL, men global aktiv prosjekt-ID i header. Ved navigasjon kunne disse avvike.
Kallene setter nå både URL og header fra sitt eget prosjektargument. URL-segmentet
encodes. Test dekker lesing, endring og deaktivering med et annet globalt prosjekt.
Ingen uautorisert backendoperasjon er påvist med den gamle mismatchen.

### CLIENT-04 — Forsinket tokenhenting gjeninnfører tømt CSRF-cache — rettet

En tokenforespørsel startet før `clearCsrfToken` kunne fullføre senere og overskrive
et nyere token. En test reproduserte at neste skriving brukte den gamle verdien.
Dette er en sesjons-/tilgjengelighetsfeil, ikke påvist omgåelse av serverens CSRF.

Cachen har nå en generasjon som endres ved tømming. Bare svar fra gjeldende
generasjon kan oppdatere tokenet. En gammel promise kan heller ikke nullstille en
nyere aktiv tokenforespørsel. Allerede påbegynte kall kan fremdeles fullføre;
serverens sesjons- og CSRF-kontroll gjelder fortsatt for dem.

## Kontroller uten nye funn

| Kontroll | Evidens og avgrensning |
| --- | --- |
| TE/BH er entydig og prosjektavgrenset | 18 eksisterende backendtester passerer: ingen rolle ved manglende mapping, tvetydig medlemskap eller providerfeil; fjerning fra team får effekt ved neste kontroll. |
| Query-cache avgrenses med prosjekt | Kodekontroll av `caseList` og `caseContext`: både query key og queryFn inkluderer prosjekt-ID. |
| Sakskontekst byttes ikke stille | Workspace-regresjoner passerer for annen sak, gamle svar og versjonslåsing under redigering. |
| Ingen automatisk replay ved nettverksfeil | Test bekrefter ett skriveforsøk og status 0 etter nettverksfeil. CSRF-retry har hard grense på ett ekstra forsøk. |
| Utlogging krever CSRF | Kodekontroll: `require_auth` validerer CSRF på mutasjoner, også logout. Logout sletter serversesjonen og utløper cookie. Frontend tømmer token og gjør full navigasjon først etter vellykket logout. |
| Backend bestemmer kontraktssiden | `contract_role` sammenligner stabil Catenda-subject med medlemmer i konfigurerte team-ID-er. Observert teamnavn brukes ikke som tilgangsregel. |

## Verifikasjon

```sh
npm test -- src/lib/api src/lib/kontraktsbord src/lib/approval
npm run check
npm run build
cd backend
venv/bin/python -m pytest tests/test_auth/test_contract_role.py -q
```

52 frontendtester og 18 backendtester passerer. Typekontroll har 0 feil og
19 eksisterende advarsler. Produksjonsbygg passerer.
`git diff --check` passerer. Fem testvarianter feilet på forventet feil før retting
(fire fra CLIENT-01/02, én fra CLIENT-04) og er nå ordinære regresjonstester.

## Gjenstående omfang

Dette er ikke en full ende-til-ende-test av samtidige nettleserfaner, bytte av
innlogget person, alle legacy-API-kall eller lokal lagring av utkast. Ekstern konto,
registrering av faktiske TE/BH-team-ID-er og driftsverifikasjon av tjenestetoken står
fortsatt igjen. Tidligere utsatt Catenda-mapping/inbox/outbox og Supabase/RLS er
ikke gjenåpnet eller markert verifisert i denne delgjennomgangen.


## Anbefalt neste audit

1. Lokale utkast ved utlogging, brukerbytte og flere faner. `draft.ts` bruker
   localStorage, og ny-sak-utkast nøkles med prosjekt-ID. Undersøk alle kallsteder
   for brukeravgrensning før et eventuelt funn om innsyn rapporteres som bekreftet.
2. Persistens og feilgjenoppretting for godkjennings-/leveringskvitteringer:
   restart, flere prosesser og utilgjengelig lagring, uten Supabase/RLS eller
   implementering av den utsatte Catenda-outboxen.
3. Samspill mellom aktive og eldre innloggingsbaner: bekreft at magic link,
   Entra og dev-bypass ikke gir andre rettigheter enn tilsiktet Catenda-tilgang.

Mulig oppsettsforbedring: finn prosjektets standardteam ved bekreftede navn, og
bruk de returnerte ID-ene til eksisterende mapping. Manglende/dupliserte team må
stoppe oppsettet, ikke gi en gjettet kontraktsside. Ikke implementert i denne runden.


Oppfølging av lokale utkast: se [utkast og samarbeid](audit-utkast-samarbeid-2026-09-14.md).
Brukeren har avklart felles teamutkast med samtidig redigering. Tidligere forslag
om personlige utkast er ikke valgt som hovedløsning; reproduksjonen av eierløs
lokal gjenoppretting er fortsatt et åpent funn.

Auth-samspill er dokumentert i [audit av innloggingsbaner](audit-autentisering-2026-09-14.md).
