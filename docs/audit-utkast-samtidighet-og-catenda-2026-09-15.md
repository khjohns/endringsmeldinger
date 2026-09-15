# Etterkontroll: utkast, samtidighet og Catenda-kall

Dato: 2026-09-15. Utgangspunkt: `5e4f01a` (etter merge av PR #25).
Forrige logger: [tilgangslaget](audit-tilgangslaget-opprydding-2026-09-15.md),
[serverutkast](audit-utkast-serverlagring-2026-09-15.md) og
[overleveringen](handoff-gpt-astra-2026-09-15.md).

## Konklusjon

Etterprøvingen var nødvendig. Utkastregisteret kunne overskrive en kollegas tekst
uten konflikt ved faktisk samtidighet, selv om forrige audit beskrev det som trygt.
Klienten kunne også konkurrere med sin egen lagring og sletting. Dette er rettet.
Alle nye regresjonsscenarier feilet før sin respektive retting.

Catenda er tilgjengelig. To ferske teamoppslag tok omtrent 0,64 sekunder i denne
målingen. Jeg innfører ikke en autorisasjonscache på dette grunnlaget: observert
trafikk, belastning og hele tilgangsbanen er ennå ikke målt. Fersk teamkontroll og
1,2 sekunders venting etter siste endring beholdes. Unødvendig førstegangslagring
og overlappende skriving fra samme skjema er fjernet.

## Måling og faktisk miljø

`backend/scripts/setup_authentication.py` fornyet det utløpte API-tokenet via
client credentials og lagret det i `backend/.env`. Tokenverdier er ikke skrevet
i auditlogg eller testartefakter. Prosjekt- og bibliotekvalg ble beholdt.

Gjenkjørbar måling:

```sh
cd backend
venv/bin/python -u scripts/measure_catenda_membership.py
```

Skriptet bruker den eksisterende `CatendaOAuth.team_members`/`collection`-banen
og teller faktiske HTTP-kall. To tilgjengelige team velges; standardnavn prioriteres.
Dette utvalget konfigurerer ingen kontraktsroller.

| Runde | Tid for begge team | HTTP-kall |
| --- | ---: | ---: |
| 1 | 636 ms | 2 |
| 2 | 644 ms | 2 |
| 3 | 643 ms | 2 |
| 4 | 672 ms | 2 |
| 5 | 651 ms | 2 |
| 6 | 639 ms | 2 |

Median: **643,5 ms**. Begge team returnerte tomme medlemslister. Ett av de to
hadde et eksakt standardnavn fra overleveringen. Ingen ekstra side måtte hentes.
Teamlisten har teamets ID/navn under `user`, ikke på medlemsradens toppnivå;
de innledende utvalgsforsøkene ga derfor ingen gyldig tidsmåling og er ikke
inkludert i tabellen.

**Begrensning:** dette er en transportmåling fra utviklingsmaskinen, ikke
`contract_membership` gjennom Flask og database, en måling med store team,
en personlig innlogging eller en belastningstest. `CATENDA_CONTRACT_TEAMS` er
ikke konfigurert i dette backend-miljøet. Team-ID-er er ikke gjettet eller lagt inn.

Overleveringens «hvert 1,2. sekund mens brukeren skriver» er upresist. Timeren
nullstilles ved hver endring. Ved sammenhengende skriving skjer ingen lagring før
pausen. Med to team er rundt 100 teamforespørsler per minutt per redaktør en
teoretisk øvre takt ved gjentatte pauser, ikke observert brukertrafikk. Lav
responstid alene ville heller ikke bevist at en slik samlet trafikk er uproblematisk.

Neste beslutningsgrunnlag for eventuell cache er antall redaktører, faktiske
PUT-kall, ventetid og feil/ratebegrensning med riktig mapping. En cache må i så
fall ha en eksplisitt tilbakekallingsfrist for utkast og fortsatt fersk kontroll
ved formell innsending. En slik ny tilgangsregel innføres ikke her.

### Supabase: tilgjengelig, men registeret er ikke migrert

En lesing av `projects` gjennom backendens Supabase-klient lykkes. Oppslag mot
`catenda_project_configs`, `app_users` og `app_project_memberships` svarer
`PGRST205`: tabellen finnes ikke i Data API-ets skjemacache.

Brukeren presiserte at prosjekt-resolveren ikke er migrert. Det stemmer med
[§8A–8B i Catenda-dataflyten](catenda-dataflyt.md#8a-trinn-2a--prosjekt-resolveren-implementert).
Den manglende registertabellen er **kjent oppsettsstatus**, ikke et nytt
resolverfunn. Auth-tabellene tilhører den separate migrasjonen
`supabase/migrations/20260912150635_catenda_user_sessions.sql`.

Ingen migrasjoner, registerrader eller RLS-policyer er endret. En REST-lesing er
ikke en RLS-audit eller et sikkert bevis for hvilke objekter som finnes fysisk
i Postgres. Direkte SQL-/MCP-tilgang var ikke tilgjengelig i denne økten.
Feilsøkingen fulgte [Supabases observabilitetsdokumentasjon](https://supabase.com/docs/guides/observability);
[endringsloggen](https://supabase.com/changelog) ble også kontrollert.

## Bekreftede funn og rettinger

### UT-01 — Høy: to samtidige lagringer lykkes på samme versjon

`UtkastRegistry.lagre` leste gjeldende versjon før SQLite startet en
skrivetransaksjon. `with connection` starter ikke i seg selv en transaksjon,
og `SELECT` gjør heller ikke det med denne klientkonfigurasjonen. To forbindelser
kunne derfor lese samme versjon, begge godta den og begge utføre
`INSERT OR REPLACE`. Den siste overskrev den første; begge fikk suksess.

Reprodusert med to tråder, hver med sin reelle SQLite-forbindelse, både mot et
tomt register og mot versjon 1. Begge fikk suksess før retting. En testbarriere
tvinger begge ulåste lesinger før skriving; med aktiv transaksjon fjernes denne
kunstige ventingen. Testen godtar bare én vinner og kontrollerer lagret innhold.

**Rettet:** `BEGIN IMMEDIATE` før versjonslesingen holder lesing, kontroll og
skriving i samme transaksjon. Den andre skribenten leser vinnerens versjon og får
`UtkastKonflikt`. Dette gjelder prosesser som deler samme SQLite-fil, ikke flere
backendinstanser med hver sin fil.

Den tidligere testen med «samtidig» i navnet gjorde to sekvensielle kall. Den
beviste avvisning av en gammel versjon, men ikke atomisk versjonskontroll.

### UT-02 — Middels: samme skjema kunne sende overlappende PUT-kall

Ved treg første lagring kunne neste pause starte en ny lagring med samme
`forventet_versjon`. Det kunne gi en konflikt med brukerens egen tekst. En
tilbakeføring til opprinnelig tekst mens en endring var på vei ble dessuten
oppfattet som «uendret» og aldri sendt tilbake til serveren.

**Rettet:** bare én lagring er aktiv per skjema. Siste ventende snapshot sendes
etter kvitteringen og bruker den kvitterte versjonen. En tilbakeføring må også
lagres når en eldre endring er på vei. Konflikt eller nettverksfeil utløser ikke
automatisk overskriving/replay av køen. Eksisterende konfliktvalg beholdes.

### UT-03 — Middels: sletting konkurrerte med autolagring

`clear()` endret en vanlig boolsk verdi som ikke ryddet den allerede planlagte
timeren. Timerens callback kontrollerte heller ikke verdien. En planlagt PUT
kunne dermed kjøre etter DELETE. Ved pågående PUT ble DELETE sendt før PUT var
ferdig, slik at rekkefølgen kunne gjenopprette et nettopp slettet utkast.

**Rettet:** tømming stopper timer/kø, callbacken kontrollerer tømming, og DELETE
venter på egen aktive PUT. Sen kvittering endrer ikke status tilbake til «lagret».

Dette lukker den lokale rekkefølgefeilen. Ved nettverksavbrudd kan serveren
fortsatt fullføre en PUT etter at klienten har fått feil. Opprydding ved innsending
må derfor fortsatt håndheves server-side for en full garanti.

### UT-04 — Lav: åpning av tomt skjema opprettet utkast uten redigering

Når GET returnerte `null`, ble `sistLagretJson` stående `null`. Standardfeltene
ble dermed lagret etter 1,2 sekunder selv uten endring, i strid med forrige audits
påstand om ingen tom skriving.

**Rettet:** standardinnholdet registreres som sammenligningsgrunnlag før lasting.
Bare faktisk endring gir førstegangslagring. En allerede lagret serverversjon
gjenopprettes fortsatt som før.

### TEST-01 — Miljøavhengig CSRF-test og lint

Første fulle backendkjøring: 1279 passerer, én feiler fordi en uinnlogget
CSRF-test arver `DISABLE_AUTH=true` fra utviklingsmiljøet. Isolert kjøring med
`DISABLE_AUTH=false` passerer. Testen setter nå denne forutsetningen eksplisitt;
produksjonskontrollen er ikke endret. Utdatert omtale av slettet CSRF-modul er rettet.

Lint fant 30 feil utelukkende i JavaScript som følger installerte Python-pakker
i `backend/venv`. ESLint ignorerer nå `venv`/`.venv`, slik at lokal installasjon
av backendavhengigheter ikke endrer frontendens lintresultat.

## Selvstendig vurdering av de andre auditene

Dette er en vurdering av bevisene og gjenværende arbeid, med full lokal
regresjonskjøring. Det er ikke en ny full ende-til-ende-audit av hvert område.

| Audit | Vurdering etter denne gjennomgangen |
| --- | --- |
| [Tilgangslaget](audit-tilgangslaget-opprydding-2026-09-15.md) | Fersk teamkontroll beholdes. Request-memoet gir ingen cache på tvers av forespørsler; lagkoblingen til Flask er ikke i seg selv et sikkerhetsfunn. Påstanden om ingen referanser til legacy-auth stemmer ikke, se under. |
| [Serverutkast](audit-utkast-serverlagring-2026-09-15.md) | Må korrigeres: atomisk samtidighet og ingen førstegangsskriving var ikke bevist. Rettet i UT-01–04. Gjenoppretting ved fanekrasj er heller ikke dekket av at teksten står i et åpent skjema. |
| [Utkast og samarbeid](audit-utkast-samarbeid-2026-09-14.md) | Krav om fletting, strukturerte felt og tilstedeværelse er fortsatt uoppfylt. 409-valget forkaster en versjon uten gjenoppretting. Dette bør prioriteres foran opprydding av auth-kode. CRDT er et mulig designvalg, ikke i seg selv et bevis for at en separat ny tjeneste er nødvendig. |
| [Autentisering](audit-autentisering-2026-09-14.md) | Lokale tester av cookie, CSRF, roller og tilbakekalling passerer. Fornyet teknisk API-token er ikke en test av personlig innlogging eller varige Supabase-sesjoner. |
| [Klient/prosjekt/sesjon](audit-klient-prosjekt-sesjon-2026-09-14.md) | Tidligere klientregresjoner passerer. Utkast er et nytt asynkront sømpunkt som de eldre testene ikke dekket; UT-02–03 viser behovet. Full flerfane-/sesjonsbyttetest står igjen. |
| [Persistens](audit-persistens-gjenoppretting-2026-09-14.md) | Testene av commit, prosesskrasj og gamle leveringsforsøk er nyttige og passerer. De omfattet ikke samtidighet i det senere utkastregisteret. Varig volum og backup/restore av `BH_APPROVAL_DB` står fortsatt igjen. |
| [Godkjenning/event sourcing](audit-godkjenning-event-sourcing-2026-09-14.md) | Regresjoner av fullmakter, frosset innhold og replay passerer. Det gir ikke i seg selv garanti for nøyaktig én ekstern levering eller atomisk commit mellom SQLite, Supabase og Catenda. Ingen ny domeneregel endret. |
| [Backend-hendelsesflyt](audit-backend-hendelsesflyt-2026-09-15.md) | Teamavgrensning av notater og forseringsregresjoner passerer. Durable webhook inbox/outbox er fortsatt avtalt arbeid i §8C. Historiske formuleringer må leses sammen med senere vedleggsoppfølging. |
| [PDF/Catenda](audit-pdf-catenda-2026-09-14.md) | Transport- og markupregresjoner passerer. Global Send/PDF-ruting, delvis levering og retry-duplikater er fortsatt egne integrasjonspunkter. Ingen levende dokument-/kommentarlevering utført her. |
| [Vedleggsflyt](audit-vedleggsflyt-2026-09-15.md) | Tester av mellomlagring, referanser, tilgang og levering passerer. Å kunne autentisere mot Catenda beviser ikke upload/revisjon/reference-kjeden. Live vedleggsverifikasjon står fortsatt igjen. |
| [Begrunnelsestekst/død kode](audit-begrunnelsestekst-og-dodkode-2026-09-14.md) | Generatorregresjonene passerer. Dette er ingen ny juridisk vurdering. Beholdt forseringsgenerator og testfixtures røres ikke; ende-til-ende-koblingen må vurderes som funksjonalitet. |
| [Formatering](audit-formatering-2026-09-14.md) | Relevante regresjoner passerer. Ingen ny feil påvist; tidssonevarianter, låste talltokens og CSV-tidsstempler prioriteres under teksttap og integrasjonslevering. |

### Påstander som avskrives eller avgrenses

- **«Auth-modulene har ingen referanser utenfor seg selv.»** Feil på nåværende
  kode: `backend/lib/auth/__init__.py` importerer og eksporterer begge.
  `test_auth_interactions.py` bruker også Entra-dekoratøren. Dette beviser ikke
  at de håndhever aktive ruter, men sletting av filene alene vil bryte pakkens
  import. Ingen sletting utført.
- **«Lokal eierbuffer beskytter de seks serverutkastene ved krasj.»**
  `createFormDraft` bruker ikke `draft.ts`/localStorage. Nettverksfeil lar teksten
  stå i minnet, men fanekrasj, reload eller navigasjon før kvittering kan miste
  den. Dette må skilles fra de eieravgrensede lokale ny-sak-/EO-utkastene.
- **«409 betyr alltid at en kollega har skrevet en nyere tekst.»** Backend kan
  også returnere 409 med `utkast=null` etter sletting. Kodekontrollen viser at
  konfliktpanelet krever et objekt og derfor ikke dekker dette tilfellet.
  Egen reproduksjon og håndtering står igjen; ikke lukket av UT-01–04.
- **«Appen er verifisert mot Supabase fordi databasen svarer.»** Ingen slik
  konklusjon trekkes. Registrering, auth-migrasjon og RLS-verifikasjon gjenstår.

## Videre prioritering

1. Gjenoppretting av usendt tekst ved navigasjon/nettverksbrudd, slettet utkast
   i konfliktflyten og bevaring av forkastede konfliktversjoner.
2. Serverstyrt avslutning av utkast ved innsending. Revisjonsnøkkel alene er ikke
   en serverkontroll av at arbeidsrevisjonen er avsluttet.
3. Anvend og verifiser prosjektregister/auth-oppsett som beskrevet i eksisterende
   dokumentasjon; deretter full tilgangstest med reelle TE/BH-team.
4. Live vedleggs-/brevkjede og avtalt inbox/outbox-arbeid, med retry og feil etter
   hver enkelt ekstern sideeffekt.
5. Samarbeidsmekanisme og varig lagring/restore, før reell bruk. Legacy-opprydding
   er lavere prioritet enn disse funksjons- og persistenskravene.

## Verifikasjon

| Kontroll | Resultat |
| --- | --- |
| `cd backend && venv/bin/python -m pytest -q` | **1280 passerer**, 5 avhengighetsadvarsler |
| `npx vitest run` | **534 passerer**, 44 filer |
| `npm run check` | **0 feil, 10 eksisterende advarsler** |
| `npm run lint` | **Passerer** |
| `npm run build` | **Passerer** |
| Ruff på de fire nye/endrede Python-filene | **Passerer** |
| `ruff check services/ routes/ lib/ tests/` | 15 eksisterende treff med lokalt installert Ruff; ingen treff i endrede filer. Handoffens tall 16 gjenskapes ikke i dette miljøet. |
| `git diff --check` | **Passerer** |

Nye regresjoner: to backendvarianter for parallelle skrivinger, og fem
frontendscenarier for tom åpning, overlapp, tilbakeføring, ventende timer og
sletting under aktiv lagring. Samtlige ble observert røde før retting.
Vanlig testkjøring bruker isolerte lagre og krever ikke levende Catenda/Supabase.

Endringene omfatter ikke innføring av cache, database-migrering, nye
samarbeidstjenester eller ekstern dokumentlevering.
