# Audit: persistens og feilgjenoppretting

Dato: 2026-09-14. Basis: godkjenning og leveringskvitteringer i `28724d5`.
Tidligere ucommittede frontend-/auditendringer er beholdt separat i arbeidskopien.

## Avklart driftskontekst og omfang

Brukeren bekrefter **én Flask-backendinstans; appen er ikke i produksjon**.
Repoets `Dockerfile` og `deploy.sh` gjelder frontend (statisk SPA/nginx).
Det er derfor ikke grunnlag for å rapportere tap av produksjonsdata eller et
konkret feilkonfigurert backendvolum. Fremtidig produksjonslagring er ikke verifisert.

> **Presisering 2026-09-15:** brukeren har bekreftet at databasen heller ikke inneholder
> reelle data. Dette er den tidligste protokollføringen av at appen ikke er i produksjon,
> og forutsetningen gjelder alle auditloggene i denne mappen. De øvrige loggene fra
> 2026-09-14 tok ikke høyde for den; forbeholdene deres om historiske strømmer og
> migrering er gjennomgått og presisert enkeltvis. Se
> [gjennomgangen av produksjonsforbehold](audit-backend-hendelsesflyt-2026-09-15.md).

Kontrollert: lokal SQLite for godkjenninger, outbox og Catenda-kvitteringer;
transaksjonsgrenser, konkurrerende prosesser, restart, prosessavbrudd og feilkvitteringer.
Supabase/RLS, live Catenda, maskinkrasj/strømbrudd og backup-restore er ikke testet.
JSON-eventlager brukes kun isolert i testene; tidligere utsatt JSON-konkurransefunn
er ikke gjenåpnet. Ingen deploy, innloggingshemmeligheter eller eksterne kall.

## Funn og rettinger

### PERSIST-01 — Middels: gammelt leveringsforsøk overskriver nyere kvittering — rettet

`ApprovalService.deliver` ga et forsøk 300 sekunders tidsvindu. Etter dette kunne
et nytt forsøk starte, men det gamle kunne fremdeles komme tilbake og ubetinget
skrive både pakkens notificationStatus og outbox-status. Testene reproduserte både
at gammel feil overskrev nyere delivered, og at gammel delivered overskrev nyere feil.

Hvert forsøk får nå en unik `notificationAttemptId`. Ved kvittering kontrolleres
ID-en innenfor SQLite-transaksjonen. Et forsøk som er erstattet kan ikke oppdatere
statusen. Ingen SQL-skjemaendring trengs: ID-en lagres i eksisterende privat JSON.

Dette stopper feiloverskriving av lokale kvitteringer. Det gjør **ikke** eksterne
Catenda-kall idempotente og stopper ikke et gammelt nettverkskall som allerede kjører.
Duplikate eksterne kommentarer/dokumenter ved tidsavbrudd er fortsatt del av senere
outbox-/integrasjonsarbeid. Deploy av endringen bør skje uten aktive gamle workers,
siden gammel kode ikke kjenner kontrollen av forsøks-ID.

### PERSIST-02 — Lav/middels: SQLite-forbindelser lukkes ikke deterministisk — rettet

Bruken av `with sqlite3.connect(...)` avsluttet transaksjonen, men lukket ikke
selve forbindelsen. To tester holdt referanse til forbindelsene og bekreftet at de
fortsatt kunne brukes etter fullført godkjennings-/kvitteringsoperasjon.
Dette er en ressurslivssyklusfeil; faktisk utmattelse av filbeskrivelser er ikke målt.

En felles `lib/sqlite_connection.py` håndterer commit/rollback og eksplisitt close
også ved unntak. Begge tjenestene bruker denne. Testene verifiserer lukking uten å
være avhengige av Python garbage collection. Timeout er konsistent satt til 15 sekunder.

### PERSIST-03 — Lav: lesing skriver tomme saker og eksisterende snapshots — rettet

`ApprovalService.read` brukte en skrivelåsende transaksjon som alltid gjorde
INSERT OR REPLACE. En test viste at lesing av et ikke-opprettet privat saksrom
opprettet en rad i databasen. Lesing førte også til unødvendige skriv av eksisterende data.

`read` bruker nå SELECT og oppretter ingen rad. Den generelle transaksjonen skriver
bare tilbake privat state når denne faktisk er endret. Direkte outbox-SQL får fortsatt
commit selv om state er uendret. `reconcile_policy` har fremdeles skrivelås fordi
policyendring kan returnere pakker; dette er ikke fjernet eller kalt ren lesing.

## Kontroller som passerer

| Scenario | Verifikasjon |
| --- | --- |
| To uavhengige prosesser med samme expectedVersion | Én kommando lagres, den andre får ConcurrencyError. Ny tjenesteinstans leser versjon 1 og vinnerens data. |
| Vanlig unntak under transaksjon | Både state-endring og outbox-INSERT rulles tilbake. |
| Faktisk prosessavbrudd før privat commit | Underprosess avsluttes med `os._exit(23)` inne i transaksjonen. Etter restart er tidligere godkjenningsdata uendret, og ucommittet outbox-rad mangler. |
| Faktisk prosessavbrudd etter offentlig event-commit | Offentlig versjon øker én gang; privat pakke er fortsatt godkjent etter restart. Retry gjenkjenner lagrede event-ID-er, markerer sendt og oppretter én outbox-rad uten nye svarhendelser. |
| Prosessavbrudd etter overtatt leveringsjobb | Sending forblir registrert. Før utløp starter ikke en ny dispatch; etter simulert utløp kan jobben overtas og leveres. Offentlig versjon endres ikke. |
| Avvist databaseskriving | SQLite-authorizer injiserer en skrivefeil. Kommandoen kaster, privat versjon forblir 0. Samme commandId kan lagres etter at feilen er fjernet; videre identisk retry lager ingen ny versjon. Dette simulerer skriveavvisning, ikke full fysisk disk. |
| Kvitteringer overlever ny instans | Tidligere tester for prosjekt-/saksgrenser, gamle feil etter nyere suksess og godkjenningsretry passerer fortsatt. |
| API og eksisterende godkjenningskontroller | Relevante tester for frosset brev, fullmakt, aktørkontroll og synkfeilvisningens serverstatus passerer. |

## Verifikasjon og gjenkjøring

```sh
cd backend
venv/bin/python -m pytest tests/test_approval tests/test_services/test_catenda_delivery_status.py tests/test_routes/test_event_security.py -q
```

**83 tester passerer**, fire eksisterende avhengighetsadvarsler. Ny auditfil har
11 tester; fem varianter feilet før retting (to gamle kvitteringer, én leseskriving,
to åpne forbindelser). De er nå ordinære regresjonstester, uten xfail.
Ruff på endrede Python-filer og `git diff --check` passerer.
Ingen frontendkode endret i denne delgjennomgangen.

## Før eventuell produksjonssetting

Avklar varig lagring og sikkerhetskopiering av `BH_APPROVAL_DB`, og gjennomfør
restore-test. Flere uavhengige backendcontainere med hver sin SQLite-fil gir ikke
felles tilstand. Denne auditen bekrefter konkurransekontroll for prosesser som
bruker samme lokale fil, ikke distribuert lagring eller nettverksfilsystemer.

Automatisk scanning/gjenopptakelse av hengende jobber, eksterne duplikater og retry
av enkeltinnsendinger til Catenda gjenstår i avtalt inbox/outbox-arbeid. Prosess-
krasjtestene er ikke bevis for atomisk commit på tvers av ulike lagringssystemer;
de bekrefter bare de konkret testede gjenopprettingsbanene med stabile event-ID-er.
