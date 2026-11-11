# Catenda-innlogging og prosjekttilgang

Implementert i SvelteKit-SPA-en og Flask-backenden i samme repo. Entra-innlogging
er utsatt. Catenda Authorization Code brukes uten PKCE, som ennå ikke er aktivert
for applikasjonen. Ingen hemmeligheter eller leverandørtokens sendes til frontend.

## Datamodell og migrasjon

`supabase/migrations/20260912150635_catenda_user_sessions.sql` oppretter:

| Tabell | Formål |
| --- | --- |
| `app_users` | Intern, stabil bruker-ID; e-post/navn er kontakt-/visningsdata |
| `app_identities` | Kobler `(provider, issuer, subject)` til intern bruker |
| `app_sessions` | Hash av tilfeldig sesjons-ID, CSRF-verdi og utløp |
| `app_oauth_attempts` | Hash av state og nettleserbinding; engangsbruk, ti minutter |
| `app_project_memberships` | Catenda-medlemskap knyttet til intern bruker og prosjekt |
| `app_membership_sync` | Tidspunkt og Catenda-prosjekt for siste komplette snapshot |

Catenda-identiteten bruker `/v2/user.id`. For senere Entra-støtte brukes tenant-ID
som `issuer` og `oid` som `subject`, etter validering av OIDC-tokenet. Kobling av
Entra og Catenda til samme interne bruker må kreve kontrollert identitetsbevis;
lik e-post kobler aldri kontoer automatisk.

Den gamle `project_memberships`-tabellen og `external_id` beholdes urørt. Den
e-postbaserte modellen er ikke autoritativ for de nye sesjonene. En egen tabell
unngår å overta gamle e-postkoblinger eller blande Entra- og Catenda-ID-er i ett
felt. API-et bruker fortsatt `ProjectMembership`-formatet, utvidet med intern
`user_id`, kilde og lokal viewer-begrensning. Gamle lokale tilganger overføres ikke
automatisk. Nye medlemskap hentes fra Catenda ved første innlogging/synk.

Alle nye tabeller har RLS og bare backendens `service_role` har tilganger.
RPC-funksjonene bruker `SECURITY INVOKER`; `anon` og `authenticated` har verken
tabelltilgang eller rett til å kalle dem. Migrasjonen er testet i en isolert lokal
Postgres-database; den er ikke kjørt mot det eksterne Supabase-prosjektet.

## Innlogging og sesjoner

1. Frontend navigerer til `GET /api/auth/catenda/login?return_to=/prosjekt/sak`.
2. Flask lager tilfeldig state og nettleserbinding. Hashene lagres i databasen,
   nettleserbindingen i en HttpOnly-cookie. Callback-URI kommer kun fra konfigurasjon.
3. `GET /api/auth/catenda/callback` forbruker gyldig state atomisk, bytter koden
   server-side og henter identitet, prosjekter og komplette medlemslister.
4. Flask setter en tilfeldig sesjons-ID i `__Host-koe_session`, med HttpOnly,
   Secure, SameSite=Lax, Path=/ og åtte timers utløp. Kun hash lagres i databasen.
5. Frontend bruker `GET /api/auth/session` og cookies på API-kall. Endringer krever
   også en CSRF-verdi som tilhører akkurat denne sesjonen.
6. `POST /api/auth/logout` sletter sesjonen i databasen og tømmer cookien.

Returadressen begrenses til lokale stier. Innloggingsfeil gir en generisk melding.
API-et aksepterer ikke magic-link Bearer-token. Nye kommentarer i Catenda lenker
til vanlige prosjekt-/saksadresser uten token. Historiske magic-link-hjelpere
finnes fortsatt for eldre scripts/tester, men brukes ikke som appinnlogging.

Personlige Catenda access-/refresh-tokens beholdes ikke etter callbacken. Appens
sesjon er uavhengig av Catenda-tokenets levetid. Dette unngår lagring og rotasjon
av personlige leverandørtokens; løpende synk bruker integrasjonens egen legitimasjon.

## Autorisasjon og synk

Bare prosjekter i `catenda_project_configs` er med. Interne prosjekt-ID-er og
Catenda-prosjekt-ID-er er separate. `owner`/`administrator` gir app-rollen `admin`,
og `member` gir `member`. Ukjente roller avvises.

`viewer_override=true` begrenser et eksisterende medlem til lesetilgang. Den
overlever synk, men gir ingen tilgang når Catenda-medlemskapet deaktiveres.
En administrator kan endre begrensningen for andre medlemmer, ikke seg selv.
Lokale API-er for å opprette/slette medlemmer eller tildele admin er fjernet.
BH/TE og økonomiske godkjenningsfullmakter er separate fra disse tilgangsrollene;
denne endringen gir ingen nye fullmakter basert på Catenda-adminstatus.

### Kontraktsrolle fra Catenda-team

Skriving av kontraktshendelser krever nå en entydig TE/BH-tilknytning fra Catenda.
Serverkonfigurasjonen `CATENDA_CONTRACT_TEAMS` kobler interne prosjekt-ID-er til
Catenda-team-ID-er. Eksempel (erstatt alle eksempel-ID-er før bruk):

```json
{
  "internt-prosjekt": {
    "TE": ["11111111-1111-1111-1111-111111111111"],
    "BH": ["22222222-2222-2222-2222-222222222222"]
  }
}
```

Begge sider skal ha minst én team-ID; flere team per side er tillatt. Teamnavn,
e-postdomener og app-rollen admin brukes ikke til å utlede kontraktssiden.
Det samme teamet kan ikke representere begge sider. Konfigurasjonen ligger på
serveren og krever ingen ny databasemigrasjon.

Etter prosjektets vanlige tilgangskontroll hentes teammedlemmer fra
`GET /v2/projects/{project-id}/teams/{team-id}/members` med integrasjonens token.
Identiteten sammenlignes med medlemskapets `catenda_subject`, aldri e-post.
Oppslaget følger den eksisterende pagineringskontrollen. Det gjøres på hver
beskyttet forespørsel, uten gjenbruk av teamfullmakter mellom forespørsler.
Integrasjonskontoen må ha lesetilgang til de konfigurerte teamene.

Manglende tilknytning, eller medlemskap på begge sider, gir 403. Feil hos Catenda
eller ugyldig konfigurasjon gir 503. Manglende prosjektkonfigurasjon gir ingen
skriverett. Lesing av vanlige saker krever fortsatt bare prosjektmedlemskap.
Intern BH-behandling krever både BH-teamtilknytning og den eksisterende
godkjenningspolicyen. EO-handlinger krever BH; forseringshandlinger krever TE,
med unntak av BH-respons. Generelle hendelser kontrolleres per hendelsestype.

Aktørnavn og hendelsens TE/BH-rolle settes av serveren ved både enkelt- og
batchinnsending. Klientens rollevalg er bare en visningspreferanse og gir ikke
fullmakt. Dev-bypass beholder muligheten til å simulere begge sider lokalt.

**Før produksjonssetting:** Sett faktiske team-ID-er for hvert prosjekt og
verifiser teamoppslag med integrasjonskontoen. Uten denne konfigurasjonen blir
kontraktsskriving avvist. Dette er testet med lokale, isolerte provider-/DB-mocker;
ingen migrasjon eller kontroll mot den eksterne databasen er utført.

Ved innlogging hentes medlemmene i brukerens registrerte prosjekter. Prosjekter
brukeren ikke lenger har i Catenda fjernes også fra brukerens lokale tilganger.
Hele medlemslisten pagineres og valideres før en prosjektoppdatering. Snapshotet
oppdaterer navn/rolle, reaktiverer returnerte medlemmer og deaktiverer manglende
medlemmer i én transaksjon. Ufullstendige svar/feil deaktiverer ingen medlemmer.
Eldre samtidige snapshot kan ikke overskrive nyere.

Cache har standard levetid 15 minutter, konfigurerbar mellom ett minutt og én time.
Fersk cache brukes uten medlemskapskall til Catenda. Ved utløp kreves vellykket
oppdatering før tilgang gis; nedetid gir 503, uten å forlenge gamle tilganger.
Det tidligere åpne prosjektunntaket for `oslobygg` er fjernet. Prosjekt i URL og
header må stemme overens, og saker/relaterte saker må tilhøre prosjektet.

| Endepunkt | Kontrakt |
| --- | --- |
| `GET /api/auth/session` | `{user: {id,email,name,...}, csrfToken}` eller 401 |
| `GET /api/csrf-token` | `{csrfToken, expiresIn}`; krever sesjon |
| `POST /api/auth/logout` | CSRF-header; `{success:true}` |
| `GET /api/projects/:id/members` | `{members: ProjectMembership[]}` |
| `POST /api/projects/:id/members/sync` | Admin + CSRF; `{success,members,deactivated}` |
| `PATCH /api/projects/:id/members/:membershipId` | Admin + CSRF; `{viewer_override:boolean}` |

En scheduler kan kjøre følgende fra `backend/` hvert femte minutt:

```sh
venv/bin/python scripts/sync_catenda_memberships.py
```

Scriptet bruker integrasjonens token/client credentials, oppdaterer alle registrerte
prosjekter og rydder utløpte sesjoner/innloggingsforsøk. Feil gir exit-kode 1.
Ingen scheduler er opprettet eksternt. Admin-endepunktet kan brukes manuelt.

## Konfigurasjon før aktivering

Kjør migrasjonen før backend deployes. Behold registrerte prosjekter fra eksisterende
Catenda-register; registrer eventuelle manglende prosjekter der.

Backend trenger `CATENDA_CLIENT_ID`, `CATENDA_CLIENT_SECRET`, `SUPABASE_URL`,
`SUPABASE_SECRET_KEY` og:

```dotenv
APP_ENV=production
DISABLE_AUTH=false
AUTH_FRONTEND_URL=https://app.example.no
CATENDA_LOGIN_REDIRECT_URI=https://app.example.no/api/auth/catenda/callback
AUTH_MEMBERSHIP_MAX_AGE_SECONDS=900
ALLOWED_ORIGINS=https://app.example.no
```

Registrer nøyaktig callback-URI i Catenda-applikasjonen. Bruk helst samme origin
med `/api`-proxy til Flask. Separate subdomener må være samme site for Lax-cookies;
en frontend på `vercel.app` og et API på et annet nettsted støttes ikke av denne
cookiekonfigurasjonen. CORS tillater bare eksplisitte origins, ikke alle Vercel-domener.
Proxy-/accesslogger må ikke lagre callbackens query-parametre.

Lokal utvikling: `APP_ENV=development`, frontend/callback på `http://localhost:5173`
via eksisterende Vite-proxy. Da brukes `koe_session` uten Secure. Kun eksplisitt
`APP_ENV=development` (eller tester) tillater `DISABLE_AUTH=true`.

Integrasjonens legitimasjon må kunne lese komplette medlemslister i alle aktuelle
prosjekter. Et utløpt statisk `CATENDA_ACCESS_TOKEN` stopper bakgrunnssynk og tilgang
når cachen utløper. Verifiser driftsopplegget for tjenestetoken før produksjonssetting;
client credentials er ifølge Catenda bare tilgjengelig for Boost-kunder.

## Brukerbekreftet innloggingstest 2026-09-14

Brukeren rapporterer vellykket Catenda-innlogging både med egen konto og en
kollegas konto, gjennom testflyten nedenfor. Dette er to reelle kontotester,
ikke bare stubber. Resultatet er brukerbekreftet; Codex har ikke observert testene
eller hentet tokens. Testflyten bruker minnelager og verifiserer ikke Supabase-drift.

Dette støtter at OAuth-flyten fungerer for flere individuelle Catenda-kontoer.
En ekstern brukerkonto er foreløpig **ikke testet**. Forventningen er samme OAuth-flyt,
men prosjektmedlemskap, eventuell prosjektgodkjenning og TE/BH-teamtilgang må fortsatt
verifiseres for en representativ ekstern konto før den banen markeres testet.

Brukeren bekrefter også at Catenda-prosjektene opprettes med egne TE- og BH-team.
Brukeren har nå bekreftet at navnene `@BYGGHERRE` og `@TE-(PL og PGL)` brukes i
alle prosjekter. Dette er brukerbekreftet standardisering, ikke en automatisk
inventering av alle prosjektene. Navnene kan brukes til å finne team ved oppsett,
men medlemskap kontrolleres fortsatt mot team-ID: appen bruker eksplisitt mapping
av team-ID-er per prosjekt i `CATENDA_CONTRACT_TEAMS`. Prosjektmedlemskap gir adgang
til prosjektet; entydig teammedlemskap bestemmer kontraktssiden ved beskyttede
handlinger. Manglende mapping eller medlemskap i begge sider gir ingen skriverett.
Faktiske team-ID-er må registreres for hvert prosjekt; ingen ID-er er gjettet her.

## Gjenstående eksterne avklaringer

En ekte OAuth-test kan kjøres med den eksisterende lokale callbacken:

```sh
cd backend
venv/bin/python scripts/setup_authentication.py --test-login
```

Testen bruker `CATENDA_REDIRECT_URI=http://127.0.0.1:18080/callback` fra `.env`,
åpner nettleseren og bruker appens innloggingsruter, state-validering, personoppslag,
medlemskapshenting og sesjonscookie. Testlageret er kun i minnet og forsvinner ved
avslutning. Den skriver verken tokens til `.env` eller data til Supabase. Dette
verifiserer den faktiske Catenda-flyten, men erstatter ikke testen av databasedrift.
Et eksisterende organisasjonstoken fra oppsettsskriptet er ikke personinnlogging.

- PKCE aktiveres senere av Catenda Support; ingen automatisk fallback eller PKCE-flagg nå.
- Om appen trenger særskilt prosjektgodkjenning må bekreftes med Catenda.
- Bekreft at `members?userType=user` omfatter ønsket tilgang gjennom team/organisasjon.
  Inntil da gir løsningen bare tilgang til brukere som faktisk finnes i denne listen.
- Ekte nettleserinnlogging er brukerbekreftet for to kontoer som beskrevet over.
  Suppler med en representativ ekstern konto og verifiser prosjekt-/teamtilgangen.
  Automatiske tester bruker fortsatt stubbet Catenda og lokal database.

Kilder: [Catenda OAuth](https://developers.catenda.com/authentication),
[Catenda-bruker](https://developers.catenda.com/user-api/get-current-user),
[Supabase API-sikkerhet](https://supabase.com/docs/guides/api/securing-your-api).
