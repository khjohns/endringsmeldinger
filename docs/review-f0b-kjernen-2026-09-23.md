# Uavhengig review: kjernen i datalaget (F0b, punkt 1)

**Dato:** 2026-09-23. **Kontrollert commit:** `55ad006c1e24e87d09831fd6735e563bf441391f`,
grenen `f0b-kjernen-direkte-postgresql`, [PR #42](https://github.com/khjohns/endringsmeldinger/pull/42).
PR-basisen var `fase0-beslutning-direkte-postgresql`. Hele PR-diffen er lest.
Reviewet er gjort i en annen agenttråd enn implementeringen.

**Oppdrag:** [review av kjernen](prompt-review-f0b-kjernen-2026-09-23.md).
**Forrige ledd:** [oppdraget for kjernen](prompt-f0b-kjernen-2026-09-23.md) og
[gjennomføringsnotatet](gjennomforing-f0b-kjernen-2026-09-23.md).
Kontrakten er kontrollert mot [hovedplanen, 2.3 og F0b](plans/2026-09-16-godkjenning-og-varig-levering.md),
[handoffen, 5 og 7](handoff-2026-09-23-datalag-postgresql.md) og
[B-02 v2, 4 og 7](design-b02-tilgangsmekanisme-v2-2026-09-23.md).
Auditkjeden er ikke gjennomgått.

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet beskriver mulig
konsekvens under de oppgitte forutsetningene, ikke en observert produksjonshendelse.
K betyr kjørt lokalt og observert 23.09; L betyr lest ut av koden.

> **Merknad 2026-09-24:** De to restansene fra verifikasjonen i
> [PR #47](https://github.com/khjohns/endringsmeldinger/pull/47) er fulgt opp i
> kode `b97630f` på #42-grenen, med tekstvakt for RK-04. Resultater og grenser
> står i [gjennomføringsnotatet, avsnitt 8](gjennomforing-f0b-kjernen-2026-09-23.md#8-restansene-fra-verifikasjonen-i-pr-47).
> Dette er en implementeringsoppfølging, ikke et nytt uavhengig review.
> Den opprinnelige konklusjonen nedenfor gjelder fortsatt `55ad006`.

## Konklusjon

**Kjernen kan bygges videre på med navngitte endringer.** Normal bruk av
`transaksjon` og `utfor` holder transportkontrakten: eksplisitt transaksjon,
lokal kontekst, rollback, klassifiserte driverfeil og ingen automatisk retry
ved ukjent COMMIT-utfall. Ingen kontekstlekkasje mellom normale forespørsler ble
observert. Invariant 3 holder innenfor én slik blokk, men er ikke en garanti
mot at kalleren selv sender transaksjonskommandoer, og sammensatte kommandoer
på tvers av repositorier er ennå ikke implementert.

Før punkt 2 bør en samlet oppfølging:

1. Gjøre første opprettelse av `Container.database` trådsikker (RK-01).
2. Fullføre innkoblingspunktene for repositoriene, slik oppdraget krevde,
   med injisert `Database` og avklart eierskap til fabrikkene (RK-02).
3. Ta de to separate resettestene inn i CI (RK-03).
4. Presisere kallernes ansvar: ingen rå transaksjonsstyring, ingen bruk av
   forbindelsen etter blokken og ingen gammel retry-dekoratør rundt `utfor`.
   Ikke presenter sluttkontrollen som et vern mot all tidlig commit (RK-04).

RK-05 må avklares før F1s tidskontrakt regnes som oppfylt; det krever ikke en ny
transport for fase 2. Reviewet endrer ingen produksjonskode, migrasjon eller
delt base. F0b er ikke ferdig med dette reviewet.

| ID | Alvorlighet | Funn | Belegg |
| --- | --- | --- | --- |
| RK-01 | Middels | Samtidig første oppslag lager to pooler; reset lukker bare én | K, deterministisk fletting rundt ekte poolopprettelse |
| RK-02 | Middels | Containeren er ikke ferdig definert for uavhengige repositorietråder | L, hele containeren og aktuelle fabrikker |
| RK-03 | Middels | Resetten kan miste én av to kontroller uten at noen av de 57 testene feiler | K, RM01 og RM02 |
| RK-04 | Middels, avgrenset til feil bruk av SQL-grensesnittet | `COMMIT; BEGIN` slipper gjennom sluttkontrollen uten kontekst og kan etterlate delvis skriving | K, ekte SQL gjennom offentlig hjelper |
| RK-05 | Middels, tidskontrakten før F1 | Setnings- og inaktivitetstimeout gir ingen samlet levetid for transaksjonskonteksten | K med korte grenser; L for betydningen i F1 |

## RK-01 — første oppslag er ikke trådsikkert

**Fil og symbol:** [`core/container.py`](../backend/core/container.py),
`Container.database` og `Container.reset`.

Begge tråder kan passere `if self._database is None`. En barriere inne i en
tynn wrapper rundt den ekte `opprett_database` gjør flettingen deterministisk:
begge får hver sin fungerende `Database`, mens containeren bare beholder den
siste. Etter `reset()` er nøyaktig én av poolene lukket (K).

Dette gjør den konfigurerte poolgrensen til en grense per utilsiktet pool, og
repositorier kan bli sittende med ulike databaseobjekter. Testen beholder begge
referansene og lukker dem eksplisitt; den måler ikke hvor lenge en referanseløs
pool ellers ville leve. Dette er ikke observert kontekstlekkasje.

**Nødvendig endring:** synkroniser opprettelsen eller opprett poolen én gang i en
definert prosesslivssyklus før trådene bruker den. En test skal kreve samme
objekt ved samtidige oppslag og at oppryddingen lukker alle opprettede ressurser.
Reviewets reproduksjon fastslår dagens feil, ikke ønsket atferd.

## RK-02 — innkoblingen er fortsatt felles arbeid

**Fil og symbol:** [`core/container.py`](../backend/core/container.py),
`event_repository`, `metadata_repository`, `project_repository`,
`membership_repository` og `bim_link_repository`; fabrikkene
[`create_event_repository`](../backend/repositories/supabase_event_repository.py)
og [`create_metadata_repository`](../backend/repositories/supabase_sak_metadata_repository.py).

Oppdraget krever at hver tråd bare legger til eget repositorium og tester.
Containeren har fått en pool-property, men de eksisterende propertyene sender
ikke `self.database` videre. Prosjekt, medlemskap og BIM konstrueres direkte
med de gamle klassene. Hendelse og metadata bruker fabrikker uten injisert
database. Å legge til `PostgresEventRepository(database)` alene kobler den
derfor ikke inn (L).

Gjennomføringsnotatet erkjenner dette i avsnitt 4, punkt 2: hver tråd skal
endre sin property eller fabrikk. Det er en innsnevring av leveransekravet,
ikke oppfyllelse av det. Konfliktflatene er containerens importer, typehint og
propertyer, samt eksportene i `repositories/__init__.py`. Auth og
Catenda-konfigurasjon har i tillegg egne konstruksjonssteder utenfor containeren.

**Nødvendig endring:** ferdigstill den felles innkoblingskontrakten før trådene
starter, uten å konvertere lagrene i denne oppfølgingen. Avklar hvilke fabrikker
trådene eier og hvordan de får samme `Database`. Fixturen kan brukes til direkte
repositorietester allerede. `container_mot_testbasen` beviser i dag bare at
`container.database` peker på testbasen; den omkobler ikke de gamle lagrene.

## RK-03 — resettestens to feil skjuler hverandre

**Fil og symbol:** [`lib/db/database.py`](../backend/lib/db/database.py),
`_er_ren`; [`test_kjerne.py`](../backend/tests/test_database/test_kjerne.py),
`test_kontekst_satt_paa_sesjonsniva_kastes_med_forbindelsen`.

Resettesten setter både rolle og krav på sesjonsnivå. Dermed blir forbindelsen
kastet selv om én kontroll er borte:

| Mutasjon | Eksisterende databasetester | Separate reviewtester |
| --- | --- | --- |
| RM01: `return rad[0]`, ignorer krav | 57 bestått | krav alene gir rød assertion |
| RM02: `return rad[1]`, ignorer rolle | 57 bestått | rolle alene gir rød assertion |

Den nåværende implementeringen kontrollerer begge riktig. Funnet gjelder
regresjonsvernet: det er ikke bevist at hver regel er nødvendig for grønn suite.
**Nødvendig endring:** behold dagens kombinasjonstest og legg til én test per
felt, som i vedlegget. Det krever ingen produksjonsendring.

## RK-04 — sluttkontrollen kjenner bare transaksjonsstatusen

**Fil og symbol:** [`lib/db/database.py`](../backend/lib/db/database.py),
`Database._kjor`; `test_transaksjon_som_er_avsluttet_i_blokken_avvises` i
[`test_kjerne.py`](../backend/tests/test_database/test_kjerne.py).

Gjennomføringsnotatet sier allerede at rå `COMMIT` kan ha committet før kjernen
melder feil. Forsøket utvider denne kjente begrensningen (K):

- Skriv rad 71, send `COMMIT; BEGIN`, kast `ValueError`: rad 71 finnes etterpå.
- Start med den avgrensede rollen og full kontekst, send `COMMIT; BEGIN`:
  neste spørring ser innloggingsrollen og `''`. Den kan skrive en rad som den
  avgrensede rollen bare hadde leserett til. Blokken avsluttes uten feil.

Sluttkontrollen ser `INTRANS` etter den nye `BEGIN` og kan ikke vite at det er
en annen transaksjon. Dette går gjennom `transaksjon()` uten å berøre private
metoder. Samtidig krever det at **betrodd backendkode sender rå kontroll-SQL**;
reviewet har ikke funnet noen rute som lar en klient gjøre det. En rå
psycopg-forbindelse er ikke en sikkerhetsgrense mot SQL fra kalleren.

**Nødvendig presisering:** invariant 3 forutsetter at kjernen alene eier
transaksjonsgrensen. Repositorier skal ikke sende `BEGIN`, `COMMIT`, `ROLLBACK`
eller endre rolle/kontekst selv. Behold reproduksjonen som dokumentert grense.
Hvis kravet er at API-et også skal håndheve dette mot feilskrevet backendkode,
må et smalere grensesnitt designes; dagens sjekk kan ikke omtales som den
garantien. Ingen klient- eller F1-rettigheter er endret eller godkjent her.

## RK-05 — to tidsgrenser er ikke én transaksjonsfrist

**Fil og symbol:** [`lib/db/database.py`](../backend/lib/db/database.py),
`opprett_database` og `Database._kjor`; tidskontrakten i
[B-02 v2, avsnitt 7](design-b02-tilgangsmekanisme-v2-2026-09-23.md#7-rb2-07--tidskontrakten).

Begge innstillingene fra innloggingsrollen beholdes etter rollebyttet (K): med
100 ms grense gir en lang setning `57014`, og en inaktiv transaksjon avsluttes
med `25P03`. Begge oversettes til `TransientError`; neste utlån virker.
Kjernen overstyrer ikke grensene.

Men med **begge** grenser satt til 200 ms kunne samme transaksjon utføre ti
setninger à 40 ms og beholde rollen i mer enn 400 ms (K). Det er forventet:
`statement_timeout` gjelder hver setning, mens den andre bare gjelder venting
på neste klientspørring. PostgreSQL 17 har en egen `transaction_timeout` for
samlet transaksjonstid. Se [PostgreSQL 17: tidsgrenser](https://www.postgresql.org/docs/17/runtime-config-client.html#GUC-TRANSACTION-TIMEOUT).

**Nødvendig oppfølging før F1:** fastsett en faktisk samlet levetid hvis gammel
teamautorisasjon skal ha en øvre tidsgrense. De to eksisterende grensene kan
ikke alene dokumentere den. `transaction_timeout` er et mulig virkemiddel,
ikke prøvd eller valgt av dette reviewet. Medlemskapsoppslag per setning i
`READ COMMITTED` er en annen garanti; funnet opphever ikke den.

## Mutasjoner og øvrige forsøk

[Kjøreoppskriften](vedlegg/review-f0b-kjernen-2026-09-23/README.md) og
[sammendraget](vedlegg/review-f0b-kjernen-2026-09-23/resultater.json) følger med.
Mutasjonene anvendes bare i en kastbar kopi av Git HEAD. Arbeidstreet muteres
ikke. JUnit-resultatene skiller testfeil fra oppsettsfeil.

Alle M01–M27 ga minst én faktisk testfeil, ingen oppsettsfeil. Dette bekrefter
de navngitte mutasjonene, ikke enhver påstand i ethvert testnavn:

- M03 stanser ved kontekstvaktens `RuntimeError`, før testens skriving.
  M04 fjerner også vakten og viser faktisk autocommit og delvis skriving.
- M17 heter «skranker er forbigående», men fjerner bare spesialklassifiseringen;
  fallbacken er fortsatt `PermanentError`. Testene fanger at underklassen
  `ValidationError` mangler. Navnet beskriver ikke mutasjonen riktig.
- M08 erstatter tom streng med `lekket`; den utelater ikke `set_config`.
- RM01/RM02 viser to reelle blindsoner. MC01 kombinerer sesjonsrolle,
  sesjonskrav og fjernet reset: rå sesjonsinspeksjon finner restene, mens en
  etterfølgende `transaksjon(Kontekst())` stempler tom kontekst på nytt.
  «Lekkasje i sesjonen» og «arvet kontekst inne i neste hjelperblokk» er derfor
  forskjellige påstander på denne commiten.

| Vinkel | Kjørt og observert |
| --- | --- |
| Commit, rollback, Python-unntak, SQL-feil | Opprinnelige tester krever samme backend-pid og innloggingsrolle/tom kontekst etterpå |
| To tråder mot samme pool | Hver tråd ser sitt prosjekt; separat container-race er RK-01 |
| Behandler som ikke lukkes | Holder den eneste forbindelsen. Neste tråd får `TransientError` etter poolgrensen på 150 ms, ikke gammel kontekst. `gen.close()` ruller tilbake, og samme pid kan brukes rent igjen |
| Avbrutt transaksjon | Ny setning etter svelget divisjonsfeil gir permanent `25P02`, og første skriving er rullet tilbake |
| `40001`/`40P01`, versjonskonflikt | Ekte samtidig oppdatering/vranglås klassifiseres riktig. `KO409` blir `ConcurrencyError`, uten retry |
| Gammel retry-dekoratør rundt `utfor` | Ni kjøringer ved vedvarende `40001` med 3 × 3 forsøk. Ett forsøk ved ukjent COMMIT-utfall |
| Brutt forbindelse | Før commit: rollback og `TransientError`. Under commit: `UkjentUtfall`, ett forsøk; utsatt trigger avslutter forbindelsen før raden blir varig |
| Base som ikke svarer | Opprinnelig test mot lokal port 1 gir pooltimeout uten passord i feilen eller fanget logg |
| Skrivbar fixture etter feil | En bevisst rød test committer en rad; neste test bekrefter at finalizeren fjernet den |
| Lesende og skrivbar fixture samtidig | Leser ser null rader før commit, én etter commit; oppryddingen går etter testen |
| Umerket base | Egen lokal, umerket base avvises før skrivbare tester får bruke den |

**Feil og hemmeligheter:** `ConcurrencyError` arver fortsatt `ConflictError`
og `PermanentError`; `JournalfoeringAvvist` arver fortsatt `PermanentError`
og `ValueError` (L, og backend-suiten er grønn). Ukjent SQLSTATE blir permanent;
ukjente Python-unntak passerer uendret. En naken `ValueError` er dermed ikke
automatisk en lageravvisning. Repositoriene må fortsatt bruke domenets
permanente feil. Tester kontrollerer at SQL-verdier, passord i uleselig URL og
passord ved «connection refused» ikke vises i feil/logg. `.original` beholder
driverfeilen; bevisst logging av den er utenfor denne garantien.

**Miljøvalg og invarianter:** alle forekomster av `DATABASE_URL`/`database_url`
ble søkt opp i backend, scripts, CI, frontend og Supabase-katalogen i repoet.
I kjernen, konfigurasjonen, containeren og fixturene ble formene `x or verdi`,
`getattr`, `dict.get`, miljø-/headeroppslag med default, defaultargument,
`Field(default=...)` og `setdefault` gjennomgått. Ingen tilkoblingsreserve ble
funnet i denne stien. `None`, tom og blank verdi avvises før et tilkoblingskall,
også når `PG*` peker på en fungerende base. CI har en eksplisitt test-URL;
`.env.example` har en kommentert illustrasjon, ikke en runtime-default.
Katalogtestene bekrefter fravær av prosjekt-default på lokalbasens
`sak_metadata`, `hendelse` og `sak_relations`. Det er ikke en ny audit av alle
eldre prosjektvalg i applikasjonen.

Kontekstfeltene har ingen defaultprosjekt eller klientoppslag. Rolleidentifikatoren
siteres, og JSON-verdiene parameteriseres. Kjernen validerer strengtypen, mens
UUID, teamform, medlemskap og tomme felt skal håndheves av F1-funksjonene.
`koe.krav` med de fire `koe_*`-nøklene passer den dokumenterte T2-kontrakten;
byttet av variabelnavn er begrunnet. Dette reviewet beviser ikke framtidige
policyer eller at en framtidig rute sender autorisert kontekst.

**Fixturens grense:** merket på databasen er en eksplisitt erklæring om at den
er kastbar, ikke et bevis på fysisk plassering. En umerket base avvises.
Oppryddingen gjelder eksisterende tabeller i `public`, og krever serielle
testkjøringer mot hver base. Parallelle pytest-prosesser kan ellers tømme
hverandres committede data (L); bruk én kastbar base per tråd/prosess.
Øyeblikksbildet reparerer ikke etter et drept testløp. Nye skjemaer, tabeller
eller roller krever egen opprydding, slik kjernetesten allerede gjør.

## Verifikasjon og grenser

**Kjørt og observert:** macOS 26.2, Python 3.11.9, PostgreSQL 17.11 (Homebrew),
psycopg 3.3.6, psycopg-pool 3.3.3, pytest 9.0.2 og ruff 0.16.8.
Basen ble startet med `lokal_testbase.sh` på egen port og bygget fra tom med
`bygg_testbase.sh`, plattformstubben og alle 23 migrasjoner.

- Hele backend-suiten: **1589 bestått, 9 hoppet over, 38 xfailed**.
- Opprinnelige databasetester: **57 bestått**.
- Reviewforsøk: **14 bestått**; flere av disse fastslår dagens svakheter.
- Fixtureforsøk: **én tilsiktet testfeil og én bestått oppryddingskontroll**.
- M01–M27 røde; RM01/RM02 grønne i gammel suite og røde i nye resettester;
  MC01 rød ved sesjonsinspeksjon og grønn ved ny kontekststempling.
- `ruff check backend/` og lint av reviewvedlegget: ingen feil.

Sandkassen blokkerte først delt minne og deretter TCP mot localhost. Gyldige
testresultater er fra kjøringene med nødvendig lokal tilgang. Ingen delt base
ble kontaktet. Opprinnelige lokale endringer i blant annet `package-lock.json`
er ikke tatt med. Ingen kjernetester eller produksjonsfiler ble endret.

**Ikke kontrollert:** Azure, Supavisor, PgBouncer i transaksjonsmodus,
forberedte setninger gjennom mellomliggende pooler, Gunicorn/fork,
TLS-/DNS-/passordfeil, reelt nettverksbrudd etter at serveren har gjort commit,
produksjonskatalogen eller de framtidige F1-policyene. COMMIT-forsøket beviser
klassifisering og fravær av retry ved brudd under commit, ikke alle mulige
nettverksutfall. Den samlede tidsgrensen ble prøvd med millisekunder, ikke med
v2s 8/10 sekunder. CI-resultatene fra implementeringsnotatet er ikke kjørt på
nytt av dette lokale reviewet. Den fulle auditkjeden er ikke lest.
