# Avhengigheter og arkitekturgrenser — 2026-10-07

**Dato:** 2026-10-07. **Kodegrunnlag:** `main` på
`68ca0ea5b593808c4513dc84ab908baf12739cdb`. Strukturkartleggingen og den
oppdaterte hovedplanen er lest fra PR #266 på `4c8860a` med `git show`.
**Forrige ledd:** [strukturkartleggingen på kontrollert PR-head](https://github.com/khjohns/endringsmeldinger/blob/4c8860a84a4aa9f388818b38471593e5592fcfb8/docs/kartlegging-struktur-spor-d-2026-10-05.md)
og [hovedplanen](../../plans/2026-09-16-godkjenning-og-varig-levering.md).
Notatet er et forskningsunderlag for samlet vedlikeholdsvurdering. Det vedtar
ingen arkitekturendring og fører ingen parallell funnstatus. Brukerens forslag
om en delt ren TypeScript-kjerne er behandlet som en hypotese som skal prøves.

## Avgrensning og hovedvurdering

En TypeScript-kjerne kan fjerne semantisk duplisering uten å erstatte Python,
databasen, autentiseringen eller PDF-motoren i første prototype. Det må måles
om denne avgrensede gevinsten er stor nok før resten av applikasjonen portes.
Dette er en arkitekturslutning fra skillet mellom de rene funksjonene i
[`backend/regler/`](../../../backend/regler/__init__.py) og adapterne i
[`core/container.py`](../../../backend/core/container.py).

Tre arbeidsomfang bør holdes adskilt:

- **Vedlikehold nå:** sikkerhetsrettinger, låsing av faktisk installerte
  avhengigheter og fjerning av dokumentert ubrukt pakkeoverflate. Et språkvalg
  er ikke en forutsetning for en nødvendig sikkerhetsoppdatering.
- **Arkitekturprototype:** ren TypeScript-kjerne, felles bevis-saker,
  avrunding, DTO-grenser og målt reduksjon av speilregler.
- **Plattform og transaksjonsflyt:** B-12, F0b, F1 og F2. Lagerbytte,
  serverutrulling og worker følger de eksisterende beslutningsportene.

Hovedplanens 29.09-merknad til B-12 gjør kostnad ved Azure SQL til en reell
beslutningsgrunn. PostgreSQL er fortsatt det eksisterende transaksjonsgrunnlaget,
men å fullføre TS2-02 før valget er tatt ville foregripe beslutningen. Dette
følger av [hovedplanen, B-12 og F0b](../../plans/2026-09-16-godkjenning-og-varig-levering.md).

## Konkrete anbefalinger

ID-ene nedenfor nummererer anbefalingene i dette underlaget. De er ikke nye
sikkerhetsfunn eller statuser i hovedplanen.

| ID | Tiltak | Tidspunkt | Alvorlighet |
| --- | --- | --- | --- |
| AVH-A-01 | Lås Python-installasjonen og bygggrunnlaget | Nå | Vedlikehold, ikke sikkerhetsklassifisert |
| AVH-A-02 | Behold psycopg og eksisterende transaksjonskontrakt | Nå / prototype | Arkitekturgrense |
| AVH-A-03 | Avvikle Supabase-klienten gjennom eksisterende TS2-02 | Etter B-12 | Allerede sporet arbeid |
| AVH-A-04 | Fjern eller skill ut Azure-pakker uten nåværende innkobling | Nå, avgrenset opprydding | Vedlikehold, ikke sikkerhetsklassifisert |
| AVH-A-05 | Gjør beløpssemantikken til et eget bevis i TypeScript-prototypen | Prototype | Korrekthetsgrense |
| AVH-A-06 | Behold ReportLab mens dokumentadapteren avgrenses | Nå / senere | Dokumentbevisgrense |
| AVH-A-07 | Bruk JSON Schema for kontrakter og corpus, ikke juridiske regler | Prototype | Valideringsgrense |
| AVH-A-08 | Behold regelversjonsvakt og skill versjonsbegrepene | Nå / prototype | Kompatibilitetsgrense |
| AVH-A-09 | Hold autentisering, database og worker på serveren | Prototype / senere | Sikkerhets- og driftsgrense |

### AVH-A-01 — lås installasjonen før en bred oppgraderingsrunde

**Lest ut av koden.** [`backend/requirements.txt`](../../../backend/requirements.txt)
bruker i hovedsak `>=`, mens psycopg og poolen har eksakte versjoner. CI
installerer kravfilene på nytt med pip. Frontenden har `package-lock.json`
og bruker `npm ci`; [`Dockerfile`](../../../Dockerfile) bruker de bevegelige
taggene `node:22-slim` og `nginx:alpine`.

**Anbefaling nå:** lag et eksplisitt, gjennomgått Python-installasjonsgrunnlag
som også låser transitive avhengigheter. Minst inngripende valg er genererte
kravfiler med hash gjennom pip-tools; uv er et godt alternativ dersom teamet
vil standardisere hele miljøflyten. Velg ett arbeidsverktøy. pip-tools kan
generere hash og oppdatere én pakke av gangen; uv kan kontrollere at låsen er
uendret med `--locked`. [pip-tools](https://github.com/jazzband/pip-tools),
[uv](https://docs.astral.sh/uv/concepts/projects/sync/).

Det er ikke nødvendig å velge backend-språk for å gjøre dette. Eksakte versjoner
og hash gjør installasjonen etterprøvbar; det gjør ikke de installerte pakkene
automatisk sikre. Docker-digest gir et bestemt baseimage, mens en tag kan flyttes.
[pip om repeterbare installasjoner](https://pip.pypa.io/en/stable/topics/repeatable-installs/),
[Docker om baseimage](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions).

**Ferdig når:** en ren CI-installasjon bruker samme avhengighetssett som den
godkjente installasjonen. Kritiske sikkerhetsrettinger leveres særskilt med
relevante regresjonstester; de venter ikke på spike eller B-12. En Python- eller
Node-hovedversjon byttes i en egen endring.

### AVH-A-02 — psycopg løser allerede den valgte oppgaven

**Lest ut av koden.** [`Database.transaksjon`, `Database.utfor` og
`opprett_database`](../../../backend/lib/db/database.py) eier transaksjonen,
setter rolle og krav transaksjonslokalt, kontrollerer tilbakelevering til poolen
og skiller serialiseringsretry fra ukjent commit-utfall.

Repoets `psycopg==3.3.6` og `psycopg-pool==3.3.3` er de gjeldende utgivelsene
i de offisielle endringsloggene ved kontrollen. 3.3.7 og 3.3.4 står som
ikke utgitt. Ingen versjonsoppgradering er derfor begrunnet her.
[psycopg](https://www.psycopg.org/psycopg3/docs/news.html),
[poolen](https://www.psycopg.org/psycopg3/docs/news_pool.html).

**Anbefaling:** behold driveren dersom Python består. Ikke innfør SQLAlchemy
bare fordi psycopg nå kan samvirke med dens pool; den funksjonen løser ikke et
påvist behov i dette laget. Tillegg for async, pipeline og Python 3.15 er heller
ikke argumenter for å endre dagens synkrone backend på Python 3.11.
[Psycopg-poolens funksjoner](https://www.psycopg.org/psycopg3/docs/advanced/pool.html).

Hvis backend senere portes til TypeScript og PostgreSQL beholdes, er
`node-postgres` et konkret, enkelt alternativ. Hele transaksjonen må bruke
samme utsjekkede klient, slik dokumentasjonen uttrykkelig krever. En ORM må
vurderes mot den samme kontrakten, ikke som erstatning for den.
[node-postgres om transaksjoner](https://node-postgres.com/features/transactions).

**Ferdig når:** driveroppgradering eller portering består de eksisterende
testene for commit, rollback, kontekstreset, versjonskonflikt og ukjent utfall.
En ORM eller annen driver aksepteres først når SQL og kontekst fortsatt er
etterprøvbare med runtime-rettighetene.

### AVH-A-03 — Supabase-pakken er aktiv, men har en vedtatt slutt

**Lest ut av koden.** `Container.project_repository`, `auth_repository`,
`membership_repository` og `catenda_config_repository` kan fortsatt lage
Supabase-lagre. Pakken er derfor ikke ubrukt. Den vedtatte avviklingen følges
i [#49](https://github.com/khjohns/endringsmeldinger/issues/49), med
[#57](https://github.com/khjohns/endringsmeldinger/issues/57) og
[#58](https://github.com/khjohns/endringsmeldinger/issues/58) for de gjenværende
løpene. B-12-merknaden er bindende for rekkefølgen.

**Anbefaling senere:** fjern pakken med de aktive kallerne og testdoblene når
TS2-02 kan fullføres. Ikke bygg en ny Supabase Auth-, Realtime-, Storage- eller
Edge Function-avhengighet som del av språkspiken. Dette ville utvide den
plattformkoblingen prosjektet allerede har vedtatt å redusere. P4 sier dessuten
at vedlegg bare lagres i Catenda. [Hovedplanens premisser](../../plans/2026-09-16-godkjenning-og-varig-levering.md).

Supabase som hostet PostgreSQL kan fortsatt være et driftsvalg uten
Supabase-klient i runtime. Offisiell veiledning skiller direkte tilkobling og
session-pool for vedvarende backend fra transaction-pool for kortlivede
funksjoner. Transaction-pool støtter ikke prepared statements eller pipeline.
Et poolbytte krever derfor egen driver- og konteksttest.
[Supabase om tilkoblingsmåter](https://supabase.com/docs/guides/database/connecting-to-postgres).

### AVH-A-04 — Azure-hosting krever ikke disse tre pakkene

**Lest ut av koden og Git-inventaret.** `azure-functions`, `azure-identity` og
`azure-keyvault-secrets` står i kravfila. Ingen imports eller klientopprettelser
for dem finnes i sporede applikasjons- og driftsfiler. `Settings` har reserverte
Azure-felt, og `is_azure_environment` har tester. Inventaret har ingen egen
`function_app.py` eller `host.json`; et gammelt Ruff-unntak nevner førstnevnte.
`backend/app.py` er Flask-entrypoint. Dagens container og `deploy.sh` bygger
og deployer frontend som nginx-SPA på Cloud Run.

**Anbefaling nå:** vurder å ta de tre pakkene ut av standardinstallasjonen
eller inn i et eksplisitt tillegg først når en faktisk Azure-kaller innføres.
Behold konfigurasjon som en separat vurdering; å slette en pakke avgjør ikke
hvilken hosting B-12 velger. Arbeidet med backend-container er allerede
[#52](https://github.com/khjohns/endringsmeldinger/issues/52).

App Service og Container Apps kan hente Key Vault-hemmeligheter gjennom
plattformens referanser og Managed Identity, så en Python-SDK er ikke en
forutsetning for dette. Oppdaterings- og rotasjonsatferd må inngå i driftskontrakten.
[App Service](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references),
[Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets).

**Ferdig når:** standardinstallasjonen, appoppstart og CI virker uten pakkene.
En eventuell ny SDK-kaller skal ha et dokumentert formål, rettigheter og test.
Ingen påstand er gjort om eksterne utrullingsfiler som ikke ligger i repoet.

### AVH-A-05 — velg beløpskontrakt før TypeScript-porteringen måles

**Lest ut av koden.** `regler.belop` og `til_krone` bruker Python `Decimal`
med `ROUND_HALF_UP`. `sammenlikning._kontroller` sender beregnede beløp videre
som `float`; hendelses- og tilstandsmodeller bruker også `float`.
Frontendens `tilOre` bruker `number`, `toPrecision(15)` og egen halv-opprunding.
[`Backend`](../../../backend/regler/__init__.py),
[`sammenlikning`](../../../backend/regler/sammenlikning.py),
[`frontend`](../../../src/lib/domain/vederlagDomain.ts).

**Anbefaling prototype:** prøv to konkrete representasjoner: heltallsøre med
avgrenset verdiområde, og en liten desimalpakke med eksplisitt presisjon og
avrundingsmodus. `decimal.js` støtter slik konfigurering, mens
`decimal.js-light` har en mindre API-flate. Light-utgaven har også dokumenterte
semantiske forskjeller; den er ikke automatisk en direkte erstatning for Python.
[decimal.js](https://mikemcl.github.io/decimal.js/),
[decimal.js-light](https://github.com/MikeMcl/decimal.js-light).

En delt `number`-implementasjon fjerner dobbeltarbeid, men beviser ikke eksakt
pengearitmetikk. En desimalpakke gjenoppretter heller ikke presisjon som allerede
har gått tapt ved JSON- eller `float`-grensen. Dette er en slutning fra de leste
konverteringene, ikke et observert feilbeløp.

**Bevis:** samme corpus for positive og negative halve øre/kroner, summering
av komponenter, 0, uendret krav, høye beløp, null og ikke-finite tall. Skill
godkjent semantikk fra dagens atferd; den åpne beslutningen om negative krav i
[#189](https://github.com/khjohns/endringsmeldinger/issues/189) skal ikke avgjøres
gjennom et pakkevalg. API-representasjonen må få sin egen kompatibilitetsprøve.

### AVH-A-06 — PDF-motor og dokumentbevis er forskjellige oppgaver

**Lest ut av koden.** `approval_letter.pdf_bytes` mapper et `LetterSnapshot`
til `BrevInnhold`; `LetterPdfGenerator.generate_letter_pdf` bygger PDF-en med
ReportLab. `markdown_to_reportlab` har et bevisst lite markupsett, med egne
tester for ressurslasting. Dette er en brukbar adaptergrense.
[`Mapping`](../../../backend/services/approval_letter.py),
[`generator`](../../../backend/services/letter_pdf_generator.py),
[`markup`](../../../backend/lib/pdf_markdown.py).

**Kjørt og observert:** to genereringer av samme syntetiske `BrevInnhold`, med
1,1 sekund mellom, ga forskjellig byteinnhold og SHA-256. Begge var 2057 byte.
Eksisterende lokal ReportLab-versjon var 4.4.10. Ingen PDF ble skrevet til disk.
Dette støtter F2s eksisterende krav om frosset dokument ved retry; det oppretter
ingen ny funnstatus.

**Anbefaling nå:** behold ReportLab og gjør den gjeldende installasjonen
etterprøvbar. Ny støtte for eksperimentell RTL og shaping i ReportLab 4.4 er
ikke et behov i dagens norske brev. PLUS-funksjoner for tagging er heller ikke
det samme som at dagens OSS-generator produserer universelt utformede dokumenter.
[ReportLab 4.4](https://docs.reportlab.com/releases/notes/whats-new-44/).

**Senere ved valgt TS-backend:** PDFKit er et konkret alternativ for strukturert
tekst og sideflyt; Playwright tilbyr HTML/CSS-utskrift. Sistnevnte tilfører en
nettleser til driftsbildet, som må vurderes mot faktisk behov for felles layout.
[PDFKit](https://pdfkit.org/docs/getting_started.html),
[Playwright PDF](https://playwright.dev/docs/api/class-page#page-pdf).

**Bevis:** brev fra frosset offentlig DTO, lange tekster og navn, norske tegn,
sidetelling og visuell rendering, null ressurslasting fra tekst, ingen teamintern
informasjon og samme lagrede dokument ved leveringsretry. Pakkeoppgradering og
rendererbytte testes hver for seg. Markdown-avviket med flere backticks er
allerede [#143](https://github.com/khjohns/endringsmeldinger/issues/143).

### AVH-A-07 — et nøytralt corpus trenger kontrakt, ikke enda en regelmotor

**Lest ut av koden.** `get_event_json_schema` bruker Pydantics
`model_json_schema(mode="serialization")`, mens CloudEvent-konvolutten merkes
draft-07. [Skjemaeksporten](../../../backend/lib/cloudevents/schemas.py).
Pydantic genererer skjema etter draft 2020-12 og skiller validering fra
serialisering. Ajv krever forskjellig klasse for 2020-12 og eldre utkast kan
ikke blandes med den i én instans.
[Pydantic](https://docs.pydantic.dev/latest/concepts/json_schema/),
[Ajv](https://ajv.js.org/json-schema.html).

**Anbefaling prototype:** bruk versjonerte JSON-filer for input og forventet
resultat, med eksplisitt JSON Schema-dialekt. Ajv er relevant hvis samme
skjemakontrakt skal valideres i TypeScript. Det er ikke grunnlag for å erstatte
alle dagens Pydantic-/skjemavalidatorer med Ajv nå.

Skjema kan bevise felt, null og unionsformer. Juridisk semantikk som avhenger
av saksforløpet må fortsatt prøves som hendelsesforløp. Behold validering uten
mutasjon i corpus-kjøreren: Ajv har valg for typekonvertering, standardverdier
og fjerning av felter, som ellers kan skjule forskjeller mellom motorene.
[Ajv-valg](https://ajv.js.org/options.html).

**Ferdig når:** corpus kan kjøres mot Python og TypeScript uten egne juridiske
forventninger i hver kjører. Deserialisering og historiske hendelser testes
særskilt; et generert serialiseringsskjema alene beviser ikke replay.

### AVH-A-08 — felles kode opphever ikke gammel klient mot ny server

**Lest ut av koden.** `REGELVERSJON` er 4 i backend og frontend. CI-vakten
kontrollerer endringer i begge domenemappene, og `kontroller_svar` avviser
en annen versjon. [Vakten](../../../.github/scripts/regelversjon.sh),
[servergrensen](../../../backend/regler/sammenlikning.py).

**Anbefaling nå og i prototype:** behold denne grensen selv om implementasjonen
blir delt. Én kilde kan bygges til flere klientutgivelser; en allerede åpnet
nettleser kan fortsatt ha eldre kode. Skill regelversjon, hendelsesskjema,
brevmal/renderer og bygg-ID. Det er en anbefalt kontrakt fra scenarioet og
B-13/B-10, ikke et forslag om fire nye infrastruktursystemer.

Hovedplanens 05.10-presisering sier at lagrede resultat, beløp og dager ikke
regnes om, mens avledet standpunkt leses med gjeldende regler. Corpus bør
derfor ha både historiske resultater og forventet gjeldende standpunkt. En
test som automatisk regenererer fasiten fra ny kode vil ikke bevise denne
forskjellen. [B-13 i hovedplanen](../../plans/2026-09-16-godkjenning-og-varig-levering.md).

### AVH-A-09 — prototypen må måle grensene som fortsatt trengs

**Anbefaling:** delt kjerne skal bare ta domenedata og gi domenesvar. Serveren
eier autentisering, CSRF, autorisert prosjekt/side/team, serverstemplede aktørfelt
og bindende kommandoer. Worker har egne database- og Catenda-rettigheter og
behandler frosne leveringsjobber. Frontenden får ingen databasenøkkel eller
privat godkjenningspakke gjennom den delte modulen.
[Sikkerhetsinvariantene](../../../AGENTS.md),
[F1 og F2](../../plans/2026-09-16-godkjenning-og-varig-levering.md).

Container Apps har avgrensede jobber som kan startes manuelt, planlagt eller
ved hendelser. Det kan drive en enkel worker uten å innføre Service Bus.
En jobbstart er ikke bevis på eksakt én effekt hos Catenda; lease, kvittering
og usikkert utfall ligger fortsatt i F2-kontrakten.
[Container Apps Jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs).

Azure SQL må vurderes på totale kostnader og gjenbevis av tilgang og transaksjon,
ikke som et driverbytte. Microsoft beskriver `SESSION_CONTEXT` som sesjonsdata,
og `read_only` gjelder den logiske forbindelsen. Det er ikke dokumentasjon for
en transaksjonslokal motpart til `set_config(..., true)`.
[Microsofts kontrakt](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-set-session-context-transact-sql).
Det åpne RK-05-arbeidet ligger i [#50](https://github.com/khjohns/endringsmeldinger/issues/50);
plattformmigrasjonene i [#53](https://github.com/khjohns/endringsmeldinger/issues/53).

**Beslutningskriterier for språkspiken:** reduseres antallet regler som må
endres to steder; kan klienten forenkles; blir avvikshåndtering mindre; består
samme corpus; hvor mye auth, approval, Catenda, persistence og PDF gjenstår;
og blir bygge- og driftsflyten enklere totalt? Biblioteknavn og total LOC alene
avgjør ikke dette.

## Verifikasjon og grenser

- **Lest ut av koden:** kravfiler, container/deploy/CI, eksisterende driver og
  pool, lagervalg i Container, beløpskonverteringer, PDF-adapter, skjemaeksport
  og regelversjonsvakt. Relevante metoder er lest i sammenheng; ingen
  runtime-sikkerhetsfeil er utledet fra importsøk alene.
- **Kjørt og observert:** Git-inventar og konsumentsøk, installert versjon i
  eksisterende `backend/venv`, og det syntetiske PDF-byteforsøket beskrevet
  under AVH-A-06. Ingen full testkjøring, brukerflyt eller exploit er kjørt.
- **Søk for Azure:** `git ls-files` og `git grep` dekker sporede skjulte filer,
  CI, scripts og entrypoints. Et supplerende filinventar med `rg --files -uu`
  fant bare SDK-ens egen `function_app.py` under lokalt miljø. Hemmelighetsfiler
  og lokale saksdata er utelatt. Andre utrullingsrepoer og plattformkonfigurasjon
  er ikke undersøkt.
- **Issues:** metadata lest med GitHub REST 07.10.2026; relevante eksisterende
  issues er lenket. Søk i åpne issue-titler og `spor-h` fant ikke et dedikert
  issue om dependency-pinning. Det er ingen garanti for at omtale ikke finnes
  i en annen issue-body. Ingen issues eller kommentarer er skrevet.
- **Produktkilder:** offisiell dokumentasjon kontrollert 07.10.2026.
  Supabase-changelog som `.md` kunne ikke leses av webverktøyet; HTML-indeksen
  og gjeldende tilkoblingsdokumentasjon ble lest. Ingen Supabase-implementasjon
  er utført.
- **Ikke kontrollert:** live databasekatalog, brukte databaseforbindelser,
  Azure-tilgang/ressurser/kostnader, ekstern drift, funksjonskall fra eksterne
  konsumenter, PDF-tilgjengelighet og visuell kvalitet, eller faktisk gevinst
  av TypeScript-prototypen. Notegrunnlaget er ikke godkjenning av en utrulling.
- Ingen produksjonskode, base, pakkeinstallasjon, Git-ref, hovedplan eller
  issue er endret. Bare dette underlagsnotatet er skrevet.
