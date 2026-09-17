# Etterprøving: sikkerhetsarkitektur og dataintegritet

Dato: 2026-09-17. Kilder: prompten i GitHub-commit `4632a5b` og designet i
`2fb1d1f`, begge inkludert i `origin/main` ved `3fb2c2b`. `git pull` hentet
referansene, men arbeidsgrenen `godkjenningspanel` har egne commits og ingen
upstream; eksplisitt fast-forward fra main ble avvist. Ingen merge er utført.
Kodekontrollen gjelder lokal `3d85ef9` med de allerede dokumenterte rettingene.
OAuth-, analytics-, sesjons- og prosjektkontekstfilene som er undersøkt er like
i HEAD og origin/main. Main mangler blant annet den nyere team-RPC-en og
godkjenningspanelet; promptens baseline kan derfor ikke brukes ukritisk.

Dette er en avgrenset etterprøving for å utvide
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md), ikke en ferdig
produksjonsaudit. Ingen produksjonskode eller database er endret denne runden.
Forrige: [audit av godkjenningsflyten](audit-godkjenningspanel-og-durable-levering-2026-09-16.md).

## S1 — OAuth-flaten: fjern uvedkommende funksjonalitet

**Bekreftet SA-01:** `app.py:211–213` registrerer tre blueprints.
`oauth_auto_consent_routes.py:52` har ingen app-autentisering og kontrollerer
heller ikke `MCP_REQUIRE_AUTH`. En GET med authorization-ID forsøker anonym
registrering og deretter godkjenning hos konfigurert Supabase. En test med ekte
Flask-rute og simulert HTTP-leverandør får 302 uten sesjon, også med flagget false.
Konsekvensen forutsetter aktiv leverandørkonfigurasjon; anonym registrering og
godkjenning i faktisk Supabase er ikke prøvd.

**Avkreftet i kontrollert vei:** vanlig `/api/oauth/.../approve` godkjenner ikke
uten Bearer-header: den returnerer 401. Den sender tokenet videre til Supabase,
som må validere det; fravær av `require_auth` alene beviser ikke åpen godkjenning.
`session.require_auth` bruker app-cookie, ikke Bearer. Eksisterende negative
autentiseringstester passerer. Ingen direkte vei fra auto-consent-token til
kontraktsdata er påvist. Direkte Data API-tilgang avhenger også av faktisk
database-GRANT/RLS og må prøves med anonymt innlogget bruker før produksjon.

Well-known-filene publiserer URL-er og protokollmetadata, ikke secret key.
Supabase-prosjektets URL er ikke i seg selv et hemmelighetsbrudd. Ingen av disse
tre blueprints har funnet frontendforbruker i `src/`. De beskriver offentlige
MCP/KOFA-data, som ikke er dette produktets formål. Anbefaling: fjern dem og
tilhørende foreldet autentiseringsflate etter avhengighetskontroll. Dette gjelder
ikke appens nødvendige Catenda OAuth-innlogging.

## Utfall for de øvrige sporene

| Spor | Etterprøvd utfall | Følge for planen |
| --- | --- | --- |
| S2 prosjektfallback | Bekreftet strukturelt: `lib/project_context.py:14–38` velger oslobygg ved manglende header og uten request. Prosjektdekoratøren kontrollerer fortsatt medlemskap; BIM-header og `g.project_id` har samme kilde i undersøkt rute. Ingen kryssprosjekttilgang er demonstrert. | Eksplisitt autorisert prosjektkontekst i API, tjenester og worker. Manglende prosjekt skal gi feil, ikke et reelt standardprosjekt. |
| S3 batchlevering | Kodebekreftet: batchruten kaller ikke `_post_to_catenda`. Ingen `/api/events/batch`-forbruker funnet i nåværende `src/`; vanlig innsending bruker enkelt-event. Påstanden om tap av dagens frontendbrev via batch er derfor ikke dokumentert. | Enten koble alle støttede batchhendelser til leveringskontrakten, eller avgrens/fjern offentlig batch. Ingen stille leveringsfrie formelle hendelser. |
| S4 analytics | **Bekreftet SA-02 med reproduksjon:** `/actors` røper navn og aktivitet fra internt notat. `/timeline` teller alle innleste hendelser. De fem andre rutene er lest: summary/by-category/frist bruker cache, vederlag og response-times velger spesifikke offentlige typer. Ingen notattekstlekkasje påvist der. | Autorisert leselag og filtrering før aggregering. Test også cache, eksport, PDF og relasjoner. Organisasjon/team er grensen, ikke bare BH/TE. |
| S5 kø/worker | Arkitekturgap bekreftet. Privat approval_outbox finnes, men ikke en felles automatisk leveringsmekanisme. Webhook har både Redis og minnefallback; promptens minnebeskrivelse er ufullstendig. Begge registrerer dedupe før behandling, uten atomisk domenekvittering. | Behold transaksjonell outbox/inbox som produksjonskrav; Redis løser ikke commit-gapet. |
| S6 PostgREST | **Påstanden om umulighet avkreftet.** Flere separate REST-kall deler ikke transaksjon, men én RPC kan gjøre flere skriver i samme transaksjon. Dette mønsteret finnes allerede i lokal `auth_repository.py` og teammigrasjonene. | Ikke krev bytte til psycopg eller Azure SQL. Bruk avgrenset RPC som planlagt; klientvalg er et implementeringsvalg. |
| S7 foreldet auth | Ingen produksjonsrute funnet med `require_supabase_auth`; modulen eksporteres fortsatt fra `lib/auth/__init__.py`, så «bare egne tester» er for kategorisk. Den har ubetinget DISABLE_AUTH-bypass og bør ikke gjenbrukes. Eldre Entra-dekoratør har allerede miljøavgrenset bypass, verifisert av tester. | Fjern ubrukt alternativ auth og eksporter, og test ruteregisteret mot en eksplisitt liste over tillatte offentlige ruter. |
| S8 Catenda-belastning | Ucachede teamoppslag finnes. «Aldri målt» er feil: audit 2026-09-15 dokumenterer seks transportrunder, median 643,5 ms for to kall, med tomme medlemslister. Det er ikke en realistisk ende-til-ende-belastningstest. | Mål autolagring, pagination, latency, 429 og samtidige brukere. Ikke innfør svakere autorisasjon basert på antatt ytelsesproblem. |
| S9 CI | `.github/workflows` finnes verken lokalt eller i origin/main. Ekstern CI/branch protection kan ikke avkreftes fra repo alene. Ruff-baselinetallet i prompten er ikke gjenmålt. | CI med tester, typesjekk, bygg og migrasjon fra tom lokal Postgres. Påkrevde sjekker før merge. |
| S10 hendelsesintegritet | Event-repository bruker `SUPABASE_SECRET_KEY`. Effektive produksjonsrettigheter og nøkkeldrift er ikke inspisert. Append-only og beskyttelse mot privilegert manipulering er ikke dokumentert verifisert. | Skill runtime-/worker-/migreringsrettigheter, test forbud mot direkte UPDATE/DELETE og uautorisert INSERT, etabler nøkkelrotasjon og uavhengig integritetskontroll. RLS alene er utilstrekkelig for privilegert backend. |

## Ytterligere integritetsfunn

**SA-03, kodebekreftet:** `analytics_routes.py:36,650–667` bruker hardkodet
dagmulktssats 150 000 for alle prosjekter. Dette er ingen tilgangsomgåelse, men
kan gi feil økonomisk oversikt selv etter at satsoppslaget for godkjenning er
rettet. Prosjektsats og eksplisitt «ukjent» må brukes konsekvent. Flere analytics-
hjelpere fanger dessuten lagringsfeil og returnerer tomme/delvise data med 200;
«ingen krav» må skilles fra «data kunne ikke lastes». Begge tas med i leselagets
datakvalitetskrav; ingen retting er gjort her.

OAuth-proxyene logger hele leverandørsvar. Disse kan inneholde redirect-URL med
autorisasjonskode eller annen sensitiv informasjon. Ingen reelle logger er
undersøkt. Minimer og sladd sikkerhetslogger, og fjern uvedkommende proxykode.

## Korreksjoner til inbox/outbox-forslaget

- Én parent-leveranse med flere operasjoner kan ha entydig `delivered`: alle
  obligatoriske operasjoner er kvittert. Å aggregere flere rader er ikke i seg
  selv tvetydig. Behold operasjonskvittering og en klart definert samlet status.
- Frys autorisert mål og konfigurasjonsversjon ved commit, ikke en vilkårlig URL.
  Ved omkobling til et annet Catenda-prosjekt må gamle jobber stoppes/avklares,
  ikke automatisk omdirigeres. Valider mål og tillatt vert i adapteren.
- Ekstern levering er ikke ubetinget garantert: varige feil, slettet mål og
  usikkert utfall krever varsling og manuell behandling. GET-før-POST alene
  stopper heller ikke to samtidige opprettelser.
- Vedleggsbinding trenger eksakt kontroll av prosjekt, sak, eier/team, staged-
  status og antall oppdaterte rader. SQL-skissen med bare `sak_id`/status og en
  UPDATE uten radantall er ikke en tilstrekkelig autorisasjonskontrakt.
- Ikke slett bytes automatisk ved ekstern levering uten å beslutte bevaring av
  det faktisk sendte brevet og vedleggene. Blob-staging kan gi atomisk binding
  av referanse/hash; det krever ikke at alle bytes ligger i hendelsesdatabasen.
- Konsolidering fjerner ikke restore-kravet. Gjenoppretting må omfatte private
  data, artifacts, køkvitteringer og avstemming mot allerede utførte eksterne
  effekter. En gammel backup kan ellers utløse ny levering av sendte brev.
- Avstemmingsjobb er nyttig som ekstra kontroll, men erstatter ikke atomisk
  registrering når leveringsintensjon, mål og frosset innhold må bevares. Det
  beskjedne volumet tilsier én enkel Postgres-worker, ikke en distribuert køplattform.

RPC-korreksjonen er kontrollert mot
[PostgRESTs transaksjonsdokumentasjon](https://docs.postgrest.org/en/stable/references/transactions.html)
og [Supabase databasefunksjoner](https://supabase.com/docs/guides/database/functions).

## Verifikasjon og grenser

`tests/test_security/test_architecture_audit_20260917.py` gir to strenge xfail-
reproduksjoner av ønsket sikkerhetsatferd som dagens kode bryter (SA-01/02), og
én bestått negativ consent-test. Sammen med `test_auth_interactions.py` og
`test_analytics_project_scope.py`: **19 bestått, 2 forventede feil**. Faktiske
Flask-ruter/dekoratører er brukt; leverandør, sesjonskilde og repositories er
testdobler. Ingen ekstern godkjenning, live Data API eller full app-deploy er testet.

Ikke verifisert: alle ruter mot faktiske databaseprivilegier, staging/backup/
restore, ekte anonym Supabase-bruker, hele lastbildet, hemmelighetsrotasjon,
ekstern CI eller driftstilgang. Tidligere grønne tester og færre funn i smalere
auditer er ikke bevis for at disse grensene er sikre.
