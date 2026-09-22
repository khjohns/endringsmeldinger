# Review av Geminis konsolidering

> **Merknad 2026-09-22:** RGK-01–06 er innarbeidet i den
> [sluttredigerte hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md); behandlingen står i
> [redaksjonsprotokollen](sluttredigering-hovedplan-2026-09-22.md).

**Dato:** 2026-09-22. **Kontrollert commit:**
`0bdc1dc7925631a9df7264c33812f8c10ddc6fd2` (`main`).
Gjennomgangen startet 21.09 og ble ferdigstilt 22.09.
**Status:** Review med rettelsesforslag; erstatter ikke gjeldende masterplan.

Forrige ledd: [oppdraget til Gemini](prompt-gemini-konsolidering-2026-09-21.md),
[Geminis planforslag](konsolidering-masterplan-2026-09-21.md),
[Geminis kildegrunnlag](konsolidering-kildegrunnlag-2026-09-21.md),
[gjeldende masterplan](plans/2026-09-16-godkjenning-og-varig-levering.md),
[AF-01–06](arkitekturforinger-2026-09-21.md) og
[siste handoff](handoff-2026-09-21-frister.md).

De to Gemini-dokumentene var ikke committet ved review. SHA-256 ved kontroll:

| Dokument | SHA-256 |
| --- | --- |
| Konsolidert masterplan | `cdb9ae52dc9238d73b9d59e1f1bb0d69bb3ed4af636eeb3901285d6a666ac371` |
| Konsolidert kildegrunnlag | `5ba58b2f961011c648ea25ab8089f42258ba03ae3f159b28775103f5d07ae372` |

## Vurdering

Hovedretningen er god: én hendelsesjournal, en autoritativ transaksjonskommando,
varig leveringsintensjon, datalagets vern om prosjekt og team, og deterministisk
beregning av tilstand. Geminis dokumenter gjør dette lettere å lese.

**Konsolideringen bør likevel ikke erstatte masterplanen ennå.** Den mister
eksisterende produksjonskrav, overdriver leveringsgarantier og blander historisk
funnstatus med nåværende kode. En ny, avgrenset dokumentasjonsrunde er tilstrekkelig
for å behandle funnene nedenfor; de tilsier ingen generell omlegging av arkitekturen.

PG18-resultatene er i hovedsak bekreftet uavhengig: alle 23 migrasjoner bygger,
19 tabeller opprettes, og samtlige rapporterte sjekksummer er gjenskapt. Forklaringen
på skrankeavviket må korrigeres, men avviket påviser ikke en ødelagt migrasjon.

Alvorlighet nedenfor angir konsekvensen av å bruke dokumentene som
implementeringsgrunnlag. Dette er ikke seks nye, observerte sikkerhetshendelser.

| ID | Alvorlighet | Funn | Anbefaling |
| --- | --- | --- | --- |
| RGK-01 | Høy | Leveringsgarantier og akseptkriterier mister nødvendige forutsetninger | Gjeninnfør usikkert utfall, avstemming og presis kommandoidempotens |
| RGK-02 | Høy | Den «komplette» dekningsmatrisen utelater krav og restanser | Avstem hvert krav og hver funn-ID mot kildene |
| RGK-03 | Middels | Nåværende funnstatus utledes feil fra gammel xfail og grupperte rader | Skill tidligere status, dagens observasjon og foreslått rettelse |
| RGK-04 | Middels | Faser og beslutningsstatus har innbyrdes motsetninger | Fullfør EO med worker først; konkretiser rettighetsmodellen samlet |
| RGK-05 | Middels | Årsaken til PG18-skrankeavviket er feil | Dokumenter nye NOT NULL-oppføringer i katalogen |
| RGK-06 | Middels | Verifikasjonsmerking og testlogg er ikke tilstrekkelig etterprøvbare | Rett miljø/kommandoer og skill lokal kontroll fra historiske opplysninger |

## RGK-01 — leveringskontrakten er blitt svakere

**Sted:** Geminis plan, avsnitt 2 punkt 6 og fase 2–3, særlig linje 155–157,
357–360 og 383–386. Motkilde:
[transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md),
«Autoritativ utstedelseskommando», «Worker og Catenda» og akseptansetestene.

Planforslaget sier at sjekkpunkter hindrer duplikater ved krasj, og at nettverkssvikt
gjenopptas uten duplisering av PDF eller kommentarer. Det mangler et avgjørende
tilfelle: Catenda lagrer ressursen, men svaret forsvinner før lokal kvittering.
En lokal lease og et lokalt sjekkpunkt avgjør ikke om den eksterne effekten fant sted.

Den eksisterende transaksjonsplanen beskriver allerede dette: bruk ekstern
idempotens eller sikker avstemming med stabil referanse. Kan utfallet ikke avgjøres,
skal jobben stå som usikker og behandles kontrollert. Dette må med i den samlede
planens kontrakt og feiltester, ikke bare som et punkt om operatørgrensesnitt.

Følgende presiseringer må også gjeninnføres:

- Leveringsmål og konfigurasjonsversjon fryses ved commit. Endret mapping skal
  ikke sende allerede godkjent innhold til en ny mottaker.
- Samme kommando gir samme kvittering bare når prosjekt, aktør og innhold passer.
  Gjenbruk av command-ID med endret innhold avvises. To identiske forsøk må skilles
  fra to forskjellige, konkurrerende kommandoer; «én commit og én 409» dekker ikke begge.
- Avbrudd før commit gir **ingen nye eller delvise endringer**. «Null rader» er feil
  når saken allerede har historikk og metadata.
- Hele leveransen er levert først når alle obligatoriske deloperasjoner er kvittert.
  Eldre retry må ikke overstyre nyere ønsket status.
- Avgrens flytting ut av HTTP-kallet til den utgående leveringen. Et generelt forbud
  mot alle Catenda-kall under HTTP-forespørsler omfatter også autentisering og lesing,
  og er en annen endring enn den vedtatte outbox-retningen.

**Ferdig når:** Planen har separate kriterier for lokal commit, identisk retry,
motstridende kommando, ekstern commit med tapt svar, utløpt lease, endret mål og
gjenopptakelse etter prosessrestart. Ingen ubetinget garanti om én ekstern effekt.

## RGK-02 — sporbarheten er ikke fullstendig

**Sted:** Geminis kildegrunnlag, avsnitt 1 og dekningsmatrisen i avsnitt 3;
Geminis plan, arbeidspakkene. Motkilde: masterplanens «Nye arbeidspakker og
produksjonskrav» og presiseringene til pakke 3.

Oppdraget krever uttrykkelig behandling av hver arbeidspakke. Følgende krav fra
masterplanen mangler en tilsvarende konkret behandling i konsolideringen:

| Krav i gjeldende masterplan | Kildested | Nødvendig behandling |
| --- | --- | --- |
| Hemmelighetslager og rotasjon | Produksjonskrav, rad om minste privilegier | Arbeid, avhengighet og verifikasjon; ikke bare runtime-rolle |
| Karantene/skanning før frigivelse av filer | Rad om dokumenter og sporbarhet | Egen del av vedleggsflyt og akseptkriterier |
| Kapasitet og delt rate limiting | Rad om drift; presiseringene til pakke 3 | Lastforutsetninger, målbare grenser og flere instanser |
| Varsling om eldste ventende jobb og usikre utfall | Rad om drift | Konkret alarm, mottaker og test; køvisning alene er utilstrekkelig |
| Isolert staging | Rad om verifiserbar leveranseprosess | Miljøkrav og verifikasjon; omtale av filstaging dekker ikke dette |
| Bevarings-/sletteregler for filer, logger og backup | Rad om dokumenter og sporbarhet | Bevar omfanget; journalbeslutningen avgjør ikke alt dette |

RV-14, RV-17 og RV-18 mangler dessuten eksplisitt mapping i begge dokumentene,
selv om masterplanen fører dem som restanser. Noe kan være innhentet av senere arbeid;
da skal matriseraden vise hvilken datert rettelse som erstatter den gamle påstanden.
Et utelatt funn er ikke dokumentert lukket.

**Ferdig når:** Hvert kildekrav og hver funn-ID har en rad eller en eksplisitt
henvisning til en rad, med status, kilde, avhengighet og ferdigkriterium.
Duplikater kan samles, men opprinnelige ID-er og eventuelle ulike restanser må bevares.
En ren telling av ID-er eller ordtreff er ikke tilstrekkelig innholdskontroll.

## RGK-03 — gamle testforutsetninger videreføres som aktuelle funn

**Sted:** Geminis kildegrunnlag, matriseraden AUT-03, linje 85.
**Symboler:** `submit_batch` i
[`backend/routes/event_routes.py`](../backend/routes/event_routes.py),
`test_batchruta_avviser_internt_notat` i
[`test_notat_lagring.py`](../backend/tests/test_routes/test_notat_lagring.py) og
`test_batch_innsending_lekker_internt_notat_i_last_event_at` i
[`test_autorisasjon_audit_20260918.py`](../backend/tests/test_security/test_autorisasjon_audit_20260918.py).

Gemini fører AUT-03 som åpen og verifisert ved kodelesing: batchruta skal fortsatt
oppdatere det offentlige tidsstempelet for interne notater. Dagens rute avviser
derimot notatet med `400 INTERNT_NOTAT_IKKE_I_BATCH` før journal- og metadataskriving.
Den ordinære testen for denne avvisningen passerer.

Den gamle strenge xfail-testen forventer først `201`. Kjørt med `--runxfail`
feiler den på denne forutsetningen, før påstanden om `last_event_at` undersøkes.
At den fortsatt gir XFAIL er derfor ikke belegg for at den opprinnelige lekkasjen
er nåbar. Dette er en konkret testblindflekk, ikke grunn til å svekke assertionen.

Andre statusrader trenger tilsvarende presisering:

- MG-04 gjelder tre verdiformer i `sak_metadata.created_by`. MG-05 gjelder
  frosset `ownerName` i godkjenningspakken. Den sammenslåtte raden beskriver bare
  sistnevnte. Se [MG-gjennomgangen](audit-maalskjema-gjennomgang-2026-09-21.md).
- MG-08 står som «Lukket / Info» sammen med MG-09, mens begrunnelsen sier at MG-08
  løses med fortsatt åpne MG-01. En avhengig fremtidig rettelse er ikke gjennomført.
- «GFK-02–06 åpne» inkluderer GFK-04, som masterplanen uttrykkelig behandler som
  en truffet avgrensningsbeslutning, ikke en ny feil.
- KR-04/MG-01 er fortsatt relevant som krav om ren projeksjon. Begrunnelsen må
  samtidig gjengi rettelsen: `aktor_navn` bruker nå `has_app_context()`. Fravær av
  HTTP-request er ikke i seg selv fravær av navneoppslag; skillet mellom app-kontekst
  og request-kontekst må bevares.

KONS-04 overdriver også sitt kodebelegg: `SupabaseNotatRepository.for_sak` henter
ikke alle notater i prosjektet; `_side` filtrerer på både sak og prosjekt.
Teamvern i datalaget er fortsatt nødvendig som arkitekturføring, men lesing av
repository alene beviser ikke at dagens rute lekker notater. Kallkjeden og det
etterfølgende synlighetsfilteret må inngå i en slik påstand.

**Ferdig når:** Matrisen skiller masterplanens registrerte status fra dagens
observasjon og foreslått statusendring. AUT-03 føres som konkret avvik som krever
datert rettelse og separat vurdering av den foreldede reproduksjonen. Eksisterende
tester er ikke endret i dette reviewet.

## RGK-04 — gjennomføringsrekkefølge og beslutningsstatus må strammes opp

**Sted:** Geminis plan, avsnitt 3.5 og fase 1–3; kildegrunnlagets MS-08 og KONS-03.

Fase 2 kalles en fullstendig EO-referanseflyt, men arbeiderprosessen bygges først
i fase 3 sammen med øvrige adaptere. Den eksisterende transaksjonsplanen krever
verifisert EO-levering, restart og usikre utfall **før** utvidelse til neste adapter.
Flytt en minimal worker og disse feiltestene inn i EO-referanseflyten.

Avhengighetene mellom lagrene må også bli eksplisitte: fase 1 krever databasevern
for utkast og godkjenningspakker, men flyttingen fra SQLite er ikke en tydelig
forutgående oppgave. Fase 1 tester `vedlegg`, mens flyttingen dit først ligger i
fase 2. Beskriv hvilke tabeller som finnes ved hver milepæl og når private data
faktisk er omfattet av datalagets vern. Unngå å fryse måltallet til «19 tabeller»
mens samme plan både legger til og fjerner tabeller.

AF-03 sier at relasjonsprojeksjon er foretrukket **til videre vurdering**.
Geminis beslutningsoversikt holder valget åpent, mens matrisen sier GIN-forslaget
er erstattet og fase 2 behandler relasjonsprojeksjonen som besluttet.
Før samme beslutningsstatus alle steder. Forslaget om GIN som «sekundært
revisjonsspor» trenger egen begrunnelse; en indeks er ikke et uavhengig bevislager.

Mine anbefalinger til de fire valgene Gemini løfter:

1. **Behold PostgreSQL RPC over PostgREST som utgangspunkt.** En forespørsel kjører
   i én transaksjon; samle skrivingen i én kommando og test den faktiske grensen.
   Atomisitet alene gjør ikke samtidighetskontrollen riktig. Direkte psycopg-tilgang
   er ikke nødvendig bare for å få flerstegsskriving atomisk.
   [PostgRESTs transaksjonsmodell](https://docs.postgrest.org/en/stable/references/transactions.html).
2. **Foretrekk relasjonsprojeksjon med prosjektavgrensede fremmednøkler**, med
   én autoritativ skriver og test av gjenoppbygging og eventuell KOE-eksklusivitet.
   Dette er en reviewer-anbefaling om å fastsette AF-03s foretrukne retning.
3. **Utform runtime-rolle og databasefunksjoner samlet.** Begrenset rolle, RLS og
   avgrensede `SECURITY DEFINER`-funksjoner kan kombineres. En slik funksjon bruker
   eierens rettigheter og trenger derfor egne autorisasjonskontroller, trygg
   `search_path` og avgrenset `EXECUTE`. Ingen generell direkte skriveadgang til
   bindende hendelser. Dokumenter også hvem som kan sette aktør-/teamkonteksten;
   et fritt valgt prosjekt- eller teamfelt er ikke identitetsbevis.
   [PostgreSQL om sikker utforming av funksjoner](https://www.postgresql.org/docs/18/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).
4. **Gjør TST-02-reproduksjonen deterministisk.** Styr rekkefølgen ved den konkrete
   kappløpsgrensen uten å legge inn en lås som fjerner feilen som undersøkes.
   Behold en meningsfull test av den opprinnelige svakheten. Å fjerne `strict=True`
   løser bare den tilfeldige CI-feilen, ikke svakheten i beviset.

KONS-13 bør gi eksplisitte **nødvendige** rettigheter per rolle. Stubben trenger
Supabases eksisterende service-rettigheter for å sammenlikne dagens skjema; det
betyr ikke at den nye runtime-rollen skal få `GRANT ALL` på alle tabeller.

## RGK-05 — PG18-avviket er forklart med feil mekanisme

**Sted:** Geminis kildegrunnlag, avsnitt 6.3, og PG18-oppsummeringen i planforslaget.
**Katalog:** `pg_constraint.contype`, `convalidated`, `conenforced`.

Gemini forklarer den ulike skrankesummen som kosmetisk endring i
`pg_get_constraintdef`. Min lokale kontroll gjenskapte både den avvikende summen
og referansesummen, ved å filtrere bort de nye NOT NULL-oppføringene:

| Måling | Resultat på lokal PG18.6 |
| --- | --- |
| Migrasjoner kjørt uten feil | 23 av 23 |
| Tabeller i `public` | 19 |
| Kolonner | `53ff1083d2ba7cab670d7c19c4be361d` |
| Indekser | `030ef2a97bb62e96b3ac7c48dc9f7ca4` |
| Policyer | `674f3e9e31db289f53c33f3590f36fbe` |
| Tabellrettigheter for stubrollene | `d8908d88e033f139208d38ff52ddf121` |
| Alle skrankeoppføringer | `79fd0419fec2c138a2ff5c012edd692a` |
| Skranker med `contype <> 'n'` | `cfeb38f87cc002e1b2e5959f02e2bacb` |
| NOT NULL-oppføringer (`contype = 'n'`) | 105 |
| Skranker som ikke er validert eller håndhevet | 0 |

Den filtrerte skrankesummen er identisk med PG16-referansen i
[MS-05-gjennomføringen](gjennomforing-ms05-2026-09-21.md). Kolonnesummen omfatter
`is_nullable` og er også lik. Det konkrete avviket forklares dermed av de ekstra
katalogradene. PostgreSQL 18 innførte nettopp lagring av kolonnenes NOT NULL-skranker
i `pg_constraint`. [Utgivelsesnotater for PostgreSQL 18](https://www.postgresql.org/docs/18/release-18.html).

SQL brukt i tillegg til de fem uendrede spørringene fra MS-05-dokumentet:

```sql
SELECT contype, count(*)
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
GROUP BY contype ORDER BY contype;

SELECT md5(string_agg(t, E'\n' ORDER BY t)) FROM (
  SELECT conrelid::regclass::text || ':' || conname || ':'
         || pg_get_constraintdef(oid) AS t
  FROM pg_constraint
  WHERE connamespace = 'public'::regnamespace AND contype <> 'n'
) s;

SELECT count(*) FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND (NOT convalidated OR NOT conenforced);
```

Fordeling: `c=11`, `f=15`, `n=105`, `p=19`, `u=10`. En versjonstilpasset
sammenlikning må fortsatt kontrollere nullbarhet, validering og håndheving;
NOT NULL skal ikke bare ignoreres.

**Korrekt konklusjon:** Det testede migrasjonssettet bygger på lokal PostgreSQL
18.6 med den beskrevne plattformstubben og gir disse katalogresultatene.
Dette er ikke i seg selv verifikasjon av eksternt Supabase-skjema, PostgREST,
kjøretidsrettigheter eller all datamigreringsatferd. `supabase/config.toml`
angir fortsatt hovedversjon 17. CI bør dekke faktisk målversjon; lokal oppgradering
til 18 endrer ikke automatisk den eksterne databasen.

## RGK-06 — verifikasjonsstatus trenger bedre kildeangivelse

**Sted:** Geminis kildegrunnlag, avsnitt 3, KONS-12 og avsnitt 6–7.

Oppgitt backend-kommando bruker `/usr/bin/python3`. I dette arbeidsmiljøet er den
Python 3.9.6 uten pytest; dokumentet oppgir samtidig Python 3.11 i virtuelt miljø.
Mine relevante tester lot seg kjøre med `backend/venv/bin/python`. Den oppgitte
kommandoen er dermed ikke en reproduserbar beskrivelse av det oppgitte miljøet.
Dette påviser en loggfeil, ikke at Gemini aldri kjørte testene.

«1 XPASS / 20» for KR-15 er ført som verifisert i denne runden, men den viste
testloggen dokumenterer ikke tjue repetisjoner. Samme resultat står i tidligere
masterplan/handoff. Oppgi repetisjonskommando og resultater dersom det ble kjørt
på nytt; ellers merk det som historisk observasjon.

Flere matriserader bruker «i basen» eller «verifisert i denne runden» om forhold
som bare er lest i migrasjoner eller hentet fra tidligere katalogkontroll.
Skill mellom lokal PG18-katalog, tidligere ekstern katalog og dagens eksterne
tilstand. Ingen av rundene her hadde tilgjengelig Supabase-MCP for ny kontroll.
En stub som selv tildeler service-rettigheter, beviser heller ikke at en flytting
uten disse rettighetene virker.

Det samme gjelder organisatoriske forhold: «Ingen ROS gjennomført» og «Ingen
formell driftsinstruks» står ved siden av «Ikke kontrollert (utenfor repo)».
Skriv at dokumentasjon eller status ikke er innhentet. Formell godkjenningsmyndighet
og rettslige krav må avklares med ansvarlige; fravær i repoet fastsetter ingen av dem.

**Ferdig når:** Testloggene navngir faktisk interpreter, kommando, dato/commit og
resultat. Hver verifikasjon er merket kjørt lokalt, lest i kode, historisk dokumentert
eller ikke kontrollert, uten å gi den sterkere status enn kilden støtter.

## Avgrenset oppdrag for neste dokumentasjonsrunde

Bruk det opprinnelige Gemini-oppdragets arbeidsregler og behandle RGK-01–06.
Lever reviderte forslag som nye `v2`-dokumenter, og bevar denne reviewens kildefiler.
Gjeldende masterplan og andre historiske dokumenter oppdateres først når forslagene
er gjennomgått. Produksjonskode, migrasjoner og eksisterende tester holdes urørt.

1. Start med komplett krav-/ID-mapping. Bevar både statuskilden og eventuelle
   motstridende observasjoner; ikke lukk funn bare fordi en samlet suite er grønn.
2. Gjeninnfør leveringskontrakten og flytt minimal worker med feiltester inn i
   EO-referanseflyten. Gjør faseavhengighetene for lagring og tilgangsvern konkrete.
3. Skill truffet beslutning, foretrukket alternativ og reviewer-anbefaling.
4. Rett PG18-forklaring og testproveniens. Nye tester kjøres bare for konkrete,
   gjenstående usikkerheter, i isolert miljø med eksterne kall avskåret.
5. Avslutt med en svarmatrise for RGK-01–06: rettet hvor, verifikasjon og restusikkerhet.
   Påstander om komplett dekning må kunne kontrolleres fra matrisen.

## Verifikasjon og grenser

### Kjørt og observert

- Et kastbart PostgreSQL 18.6-cluster ble opprettet med Homebrew-binærfilene under
  `/opt/homebrew/opt/postgresql@18/bin`. `initdb` brukte UTF-8 og `--no-locale`.
  Serveren lyttet bare på en lokal Unix-socket, med `listen_addresses=''`.
  Ingen ekstern database ble brukt. Clusteret ble stoppet etter kontrollen.
- Stubben opprettet `anon`, `authenticated`, `service_role` med `BYPASSRLS`,
  `auth.users`, `auth.role()` og `auth.email()`, samt eksplisitte og fremtidige
  tabellrettigheter til `service_role`. Alle migrasjoner ble kjørt sortert med
  `psql -X -v ON_ERROR_STOP=1`. Resultater og ekstra SQL står under RGK-05.
  Lokale rålogger og stub finnes i
  `/private/tmp/koe-review-gemini-pg18-w6i4hvdt/`; dette er midlertidige arbeidsfiler.
- Målrettet test av gammel AUT-03-reproduksjon og dagens avvisning:

```bash
cd backend
RUN_LIVE_SUPABASE=0 venv/bin/python -m pytest -q -p no:cacheprovider \
  tests/test_routes/test_notat_lagring.py::test_batchruta_avviser_internt_notat \
  tests/test_security/test_autorisasjon_audit_20260918.py::test_batch_innsending_lekker_internt_notat_i_last_event_at \
  --runxfail
```

Resultat: **1 passed, 1 failed**. Feilen er den gamle testens forventning om `201`;
faktisk svar er `400 INTERNT_NOTAT_IKKE_I_BATCH`. Dette er resultatet av å undersøke
xfail-årsaken, ikke en ny påvist lekkasje.

En forutgående, bredere kjøring av `test_notat_lagring.py`,
`test_internt_notat_confidentiality.py`, `test_aktor_navn.py` og samme AUT-03-test,
uten `--runxfail`, ga **32 passed, 1 xfailed, 1 failed**. Den siste feilen var
`test_notatet_hindrer_ikke_neste_innsending`: lokal autentiseringskonfigurasjon
ga `401 CATENDA_TOKEN_EXPIRED`. Testen forsøkte tokenfornyelse mot Catenda, men
DNS/nettverk var blokkert. Den kjøringen var derfor ikke fullt isolert fra eksterne
tjenester. Feilen er ikke grunnlag for en ny konklusjon om produksjonskoden.

Kontroll av inline-lenker til lokale filer i `docs/`, uten kodeblokker og uten
kontroll av fragmentankre, fant ingen manglende mål. Dette er en avgrenset
lenkekontroll, ikke verifikasjon av alle referanseformater eller innholdet i kildene.

### Lest og sammenliknet

Begge Gemini-dokumentene er sammenliknet med oppdraget, masterplanen,
arkitekturføringene, transaksjonsplanen og relevante audit-/gjennomføringsdokumenter.
Kode og eksisterende tester er lest ved de konkrete funnstedene. PostgreSQLs
primærdokumentasjon er kontrollert for katalogendringen og funksjonsrettigheter.

### Ikke kontrollert

- Hele backend-/frontend-suiten, typesjekk og ruff er ikke kjørt på nytt i dette
  reviewet. Geminis samlede testtall er ikke uavhengig bekreftet her.
- Ingen ny ekstern Supabase-katalogkontroll, migrasjonsanvendelse eller repair.
  Ingen saksdata er hentet fra Supabase. Lokal kataloglikhet beviser ikke at
  repo og ekstern database er like i dag.
- Ingen ny PG17-kjøring, PostgREST-integrasjonstest eller komplett negativ
  rettighetstest. PG18-byggingen alene beviser ikke tilgangsvern.
- Ingen bekreftelse av Catendas idempotensgarantier, avtaleforhold, driftsprosesser
  utenfor repoet eller rettslig tilstrekkelighet.
- Gjennomgangen er ikke en ny fullstendig applikasjonsaudit. Funnlisten omfatter
  konkrete avvik i konsolideringen, ikke en garanti om at alle øvrige påstander stemmer.

Det eneste nye repoartefaktet fra reviewet er dette dokumentet. Geminis forslag,
masterplanen, produksjonskode, migrasjoner og eksisterende tester er bevart.
