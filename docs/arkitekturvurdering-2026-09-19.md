# Arkitekturvurdering: burde appen vært bygget på et annet fundament?

Gjennomført 19. september 2026 mot `507e225` på grenen
`claude/app-architecture-security-vbaa40`. Gjenstand: hele kodebasen, ikke en
avgrenset flate. Forrige ledd i kjeden:
[reviewen av sikkerhetsrunden](audit-review-astra-2026-09-17.md) og
[etterprøvingen av sikkerhetsarkitekturen](audit-sikkerhetsarkitektur-2026-09-17.md).
Status for tidligere funn føres i
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#status-2026-09-18).

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

> **Sammenstilt 19.09.** Det parallelle auditsporet er nå landet som `f1167de`, og
> resultatet står i
> [sammenstillingen](sammenstilling-arkitektur-og-auditspor-2026-09-19.md).
> Kort: sporet endret ingen produksjonskode, så ingen funn under er lukket, og alle
> linjehenvisninger er fortsatt gyldige. Fase 1 har fått et forarbeid og en frist —
> hendelsestabellene mangler `prosjekt_id`, og fem uavhengige oslobygg-fallbacks
> gjør tenant-attribusjonen uetterprøvbar så snart ekte data finnes. Les
> sammenstillingen sammen med dette dokumentet.
>
> **Baselinje og avgrensning mot parallelt auditspor.** Denne vurderingen er
> skrevet mot **`507e225`** («ta NS_8407.md ut av sporing»), som ved `git fetch`
> 19. september også var `origin/main`. Det pågår samtidig en trinnvis
> sikkerhetsaudit av kodebasen i et annet spor, kjørt med Gemini. Den har commits
> som **ikke er hensyntatt her** — de fantes ikke i noen hentbar ref da denne
> vurderingen ble skrevet. Funn, linjehenvisninger og kodesitater under gjelder
> derfor `507e225`. Sammenstillingen over slår fast at sporet ikke endret
> produksjonskode, så de er fortsatt gyldige — men det er sammenstillingen som
> viser det, ikke dette avsnittet.
>
> Ett unntak gjelder: databasefunnene (AR-01, AR-02, AR-07) er spørringer mot den
> **levende** basen 19. september, ikke mot en tilstand utledet av `507e225`. De
> beskriver databasen slik den var på spørretidspunktet, uansett hvilket spor som
> har formet den. Har det parallelle sporet kjørt migrasjoner samme dag, er det
> deres resultat som er målt.

**Overlevering:** [handoff 2026-09-19](handoff-2026-09-19.md) samler miljøoppsett, fire metodiske
feller, etablerte fakta som ikke bør finnes ut på nytt, og de åpne beslutningene.
Start der om du overtar arbeidet uten kontekst.

**Mandatet.** Spørsmålet var ikke «hvilke hull finnes», men «burde appen vært
bygget med en annen arkitektur for sikkerhet i flere lag, dataintegritet og
kodekvalitet». Ressursbruk ved en eventuell refaktor skulle ikke vektlegges.
Dette dokumentet svarer på det, og endrer ingen kode.

**Metode.** Lesing av backend (~73 000 linjer Python), frontend, migrasjoner og
auditserien; kjøring av begge testsuitene, ruff, svelte-check og ni driftskript;
og — det som skiller denne runden fra de foregående — **spørringer mot den
faktiske databasen** og mot GitHub. Kontrollene er gjengitt i sin helhet under
[«Kontroller som er kjørt»](#kontroller-som-er-kjørt), slik at de kan etterprøves.
Alle databasespørringer var lesninger mot systemkatalogen. Ingen saksdata er lest,
ingen skriving er utført, og ingen sporede filer utenom dette dokumentet er endret.

## Konklusjon

**Nei til omskriving. Ja til å bytte fundamentet under domenet.**

Det verdifulle i repoet er ikke koden, men domenekunnskapen: NS 8407-taksonomien,
preklusjonsreglene, skillet mellom kontraktsside og organisasjon, fullmaktsmatrisen
— og auditfunnene selv. En greenfield-omskriving setter nettopp det i fare og måtte
gjenoppdage sikkerhetsegenskaper som har tatt måneder å etablere.

Fire strukturelle valg er likevel feil, og de konvergerer ikke ved å fikses funn
for funn. AR-01 og AR-02 er nye og verifiserte denne runden; AR-04 var kjent, men
er nå målt. AR-03 er oppgradert til kritisk etter at driftsplattformen ble avklart
senere samme dag: Google Cloud nå, mulig Azure Container Apps senere. Begge sletter
den lokale SQLite-fila ved skalering til null, så godkjenninger, utkast og
mellomlagrede vedleggsbytes tapes ved normal drift — ikke bare ved utrulling.

## Funn

| ID | Alvorlighet | Funn | Status |
| --- | --- | --- | --- |
| AR-01 | Høy | Ingen policy i databasen uttrykker prosjekt-, kontraktsside- eller teamgrense. All tenant-logikk finnes bare i Python. | Nytt, verifisert mot basen |
| AR-02 | Høy | Hendelseslageret er ikke append-only. Ingen trigger, regel eller rettighet hindrer UPDATE eller DELETE. | Utvider S10, nå verifisert |
| AR-03 | Kritisk | Kontraktsjournalen er delt mellom Postgres og en lokal SQLite-fil uten felles transaksjon. På den valgte plattformen slettes fila ved skalering til null. | Oppgradert 19.09 etter plattformavklaring |
| AR-04 | Middels | Domenemodellen finnes i to implementasjoner, holdt sammen av driftdetektorer som selv har forfalt. | Kjent, nå målt |
| AR-05 | Middels | Ingen CI. Avkreftet eksternt, ikke bare fra repoet. | Lukker S9 |
| AR-06 | Middels | `TrackingUnitOfWork` sin kompenserende rollback er usunn — reprodusert i repoets egen `xfail`. | Kjent som AP-04, uløst |
| AR-07 | Lav | Rest av e-postnøklet policy på `project_memberships`, inert i dag. | Nytt |
| AR-08 | Lav | Driftdetektorene kan ikke gates: seks av ni feiler, én på sin egen parser. | Nytt |

## Det som er riktig bygget

Dette er ikke høflighet. Følgende bør overleve enhver refaktor uendret:

1. **Event sourcing for kontraktsjournalen.** Formelle varsler under NS 8407 *er*
   en append-only logg av talehandlinger med tidsstempler. At `SakState` utledes
   er riktig modellering.
2. **Tredelt autorisasjon i ortogonale akser** — identitet, prosjektmedlemskap og
   rolle, kontraktsside og team. De fleste systemer slår sammen kontraktsside og
   tilgangsnivå. Begrunnelsen i `lib/auth/event_visibility.py` for at en side kan
   ha flere team er ekte domeneforståelse, ikke overkonstruksjon.
3. **CSRF håndhevet inne i `require_auth`** (`lib/auth/session.py:76`), slik at en
   ny mutasjonsrute ikke kan glemme den. Sikkerhet ved konstruksjon.
4. **Fail-closed-disiplinen.** `production_like()` behandler ukjent `APP_ENV` som
   produksjon; notater uten `aktor_team_id` skjules for alle, også forfatteren.
5. **Ruteregisteret.** `tests/test_security/test_public_route_registry.py` leser
   rutefilene med AST og krever at enhver udekorert rute står oppført med skriftlig
   begrunnelse. Dette er et sterkere vern enn det de fleste kodebaser har, og det
   løser problemet «ny rute glemmer dekoratør» permanent.
6. **Auditkulturen** med kryssede, skeptiske dokumenter som protokollfører hva som
   *ikke* er verifisert.

## AR-01 — grensen ligger ikke i dataene

All trafikk går mot Supabase som `service_role`. Sju repositories og den delte
klienten i `lib/supabase/client.py` bruker `SUPABASE_SECRET_KEY`; ingen bruker en
publiserbar nøkkel.

[RV-06](audit-review-astra-2026-09-17.md) er bekreftet fortsatt lukket ved ny
kontroll 19. september: `anon` og `authenticated` har verken SELECT eller INSERT
på noen av de 20 tabellene i `public`, og RLS er aktivert overalt. Det som *ikke*
er protokollført tidligere, er hva policyene faktisk sier. Alle har samme form:

```
policyname: "Service role full access on koe_events"
roles:      {service_role}
cmd:        ALL
qual:       true
```

`service_role` har `rolbypassrls = true`. Policyene evalueres derfor aldri for
den rollen som utgjør all apptrafikk. Det finnes **ikke én policy i databasen som
uttrykker en prosjektgrense, en kontraktssidegrense eller en teamgrense**. RLS er
i praksis et «nekt alle unntatt den som uansett omgår RLS». `relforcerowsecurity`
er dessuten `false` på samtlige tabeller, så også tabelleier omgår.

Konsekvensen er at hele tenant-modellen lever i Python-dekoratører, og at én
glemt kontroll på ett lesepunkt er full kryssprosjektlesing. Auditserien viser at
dette ikke er hypotetisk: `cases_in_project()` måtte innføres fordi klientoppgitte
relasjoner utvidet prosjektgrensen (RV-07), og `redact_activity_metadata()` fordi
aktivitetstall røpet motpartens interne notater (RV-09). Det er samme feilform på
to steder, og den formen er iboende i arkitekturen.

**Alternativet.** Koble til Postgres med en per-request rolle uten
superrettigheter, RLS på og `FORCE`, og request-konteksten satt inne i
transaksjonen:

```sql
SET LOCAL app.user_id      = '...';
SET LOCAL app.project_id   = '...';
SET LOCAL app.contract_team = '...';
```

Da blir notatfiltrering, prosjektskop og vedleggssynlighet radpolicyer som gjelder
uansett hvilken kodesti som leser. Dekoratørene blir andre forsvarslinje i stedet
for eneste. Etterprøvingens S6 slo fast at RPC gir transaksjoner; neste steg er at
psycopg gir **både** transaksjoner **og** RLS. PostgREST med `service_role` gir
ingen av delene.

## AR-02 — journalen er ikke append-only

S10 i [etterprøvingen](audit-sikkerhetsarkitektur-2026-09-17.md) lot dette stå
åpent: «Append-only og beskyttelse mot privilegert manipulering er ikke dokumentert
verifisert.» Nå er det verifisert, og svaret er at vernet ikke finnes.

De eneste triggerne i `public` er fire `updated_at`-settere og én auto-medlemskaps-
trigger på `projects`. Det finnes ingen trigger, regel eller tilbakekalt rettighet
som hindrer UPDATE eller DELETE på `koe_events`, `forsering_events` eller
`endringsordre_events`. `service_role` har `ALL`.

«Append-only» er altså en egenskap ved at applikasjonen ikke sender UPDATE, ikke
ved journalen. For et system hvis formål er å bevise hva som ble varslet når, er
det en vesensforskjell: en kompromittert nøkkel, et skript eller en feilrettende
engangsspørring kan endre historikken uten spor.

Låsebeskrankningene finnes derimot som forutsatt: `UNIQUE (sak_id, versjon)` på
alle tre tabellene, pluss `UNIQUE (event_id)`. Racet i `append_batch`
(`repositories/supabase_event_repository.py:422→436`) leser gjeldende versjon før
den inserter, så to samtidige skrivinger kan begge bygge rader for samme versjon —
men beskrankningen fanger den andre. Korrekt, men korrekt ved en beskrankning
snarere enn ved design, og ikke utvidbart til «append hendelse + oppdater
projeksjon + køopp levering» atomisk.

Halvparten av RV-15 er samtidig moot: versjonsvisningene `koe_sak_versions`,
`forsering_sak_versions` og `endringsordre_sak_versions` finnes ikke i denne
databasen. Katalogen inneholder ingen views i `public`.

**Tiltak.** `REVOKE UPDATE, DELETE` på hendelsestabellene for runtime-rollen, og
skill runtime-, worker- og migreringsrettigheter. Rettinger gjøres med
kompenserende hendelser, ikke med UPDATE.

**Forutsetning, lagt til 19.09.** Dette tiltaket kan ikke kjøres før bevarings- og
slettemodellen for journalen er besluttet. Hendelsene bærer `aktor` — personnavn —
og `internt_notat` er fritekst om navngitte personer. Gjøres journalen uforanderlig
først, er sletteveien borte; beholdes sletteveien, er journalen ikke uforanderlig.
For Oslobygg KF trekker regelsettene i hver sin retning. Masterplanen fører dette
som egen arbeidspakke på nivå 1, altså *før* dette tiltaket.

[Datakartleggingen](personopplysninger-faktagrunnlag-2026-09-19.md) gir en konkret vei ut, og den
er billigere enn forutsetningen antyder. To endringer gjør `REVOKE UPDATE, DELETE`
uproblematisk:

1. **`aktor` lagres som bruker-ID, ikke navn.** Journalen blir pseudonym, og sletting
   skjer ved å endre én rad i `app_users` — uten å røre den uforanderlige strømmen.
2. **Interne notater flyttes ut av hendelsestabellene.** De er arbeidsnotater uten
   virkning overfor motparten, ikke kontraktsvarsler, og trenger ikke samme permanens.
   Den frie teksten — kategorien med høyest risiko — blir da slettbar.

Begge koster ingenting i dag: **alle tre hendelsestabellene er tomme.** Endringen av
`aktor` hører dessuten i samme migrasjon som `prosjekt_id` (se AR-01), siden begge
endrer de samme tre tabellene.

Rekkefølgen er likevel ikke valgfri: å ettermontere en slettevei i en uforanderlig journal er blant de dyreste
endringene som finnes, og fristen er den samme som for tenant-attribusjonen —
før ekte persondata finnes.

## AR-03 — delt persistens uten felles transaksjon

| Hva | Hvor |
| --- | --- |
| Hendelser, `sak_metadata`, prosjekter, medlemskap, BIM-lenker | Supabase/Postgres |
| Godkjenninger, **outbox**, utkast, **vedleggsbytes**, leveringsstatus | SQLite, `koe_data/approvals.sqlite3` |
| Fortsatt støttet backend | CSV (`core/config.py:80`) |

`approval_outbox` opprettes i `services/approval_service.py:59` — i SQLite, mens
hendelsen den skal levere ligger i Postgres. **En transaksjonell outbox som ikke
er i samme transaksjon som domeneskrivingen er bare en kø med ekstra steg.**
`delivery_claim` og `INSERT OR IGNORE`-dedupen virker per prosess.

`sak_metadata` skrives dessuten utenfor enhver transaksjon i innsendingsveien:
`routes/event_routes.py:535` og `:819` kaller `update_cache()` etter at hendelsen
er lagret. Feiler det andre kallet, står projeksjonen feil uten at noe oppdager det.
Opprettelsesveien går riktignok gjennom `TrackingUnitOfWork`
(`services/sak_creation_service.py:128,187`) — men se AR-06 for hva den garantien
er verdt.

### Plattformen avgjør, og den er avklart

Spørsmålet som sto åpent i første utkast — hvor backend skal kjøre — er besvart
19. september: **Google Cloud nå, med Azure Container Apps som mulig senere mål.**
Det avgjør alvorsgraden, og svaret er ugunstig: begge er samme klasse, serverløse
containere med efemer disk og horisontal autoskalering. SQLite er ikke teknisk
gjeld på en slik plattform, den er en feil som utløses av normal drift.

Tre konsekvenser følger av valget, ikke av noe repoet gjør galt i dag:

1. **Skalering til null sletter fila.** `deploy.sh` bruker allerede
   `--min-instances=0` for SPA-en. Med samme oppsett for backend forsvinner
   `koe_data/approvals.sqlite3` hver gang trafikken stilner — ikke bare ved
   utrulling. Godkjenninger i outboxen, utkast under arbeid og mellomlagrede
   vedleggsbytes er borte ved neste kaldstart.
2. **Flere instanser gir flere sannheter.** En godkjenning opprettet på instans A
   finnes ikke for instans B. `delivery_claim` og `INSERT OR IGNORE`-dedupen
   beskytter innenfor én prosess, så samtidige instanser kan levere samme pakke
   to ganger — eller vise et tomt godkjenningspanel til den som skal godkjenne.
3. **Vedleggsbytes spiser arbeidsminnet.** Cloud Runs containerfilsystem er som
   standard minnebasert, og `vedlegg_registry` lagrer innholdet som `BLOB`
   (`innhold BLOB`, grense 15 MiB per fil i `vedlegg_routes.py`). Bytene teller
   altså mot instansens minnegrense. SPA-en kjører på `--memory=128Mi`; får
   backend en tilsvarende tildeling, er noen få mellomlagrede vedlegg nok til at
   instansen tar slutt på minne — og en OOM-drept instans tar godkjenningene med
   seg.

**Det finnes ingen god volummontering som redder mønsteret.** Cloud Storage via
FUSE gir ikke fillåsingen SQLite krever, og NFS/Filestore og Azure Files (SMB) har
notorisk upålitelig rådgivende låsing for SQLite. Å montere et volum bytter
datatap mot databasekorrupsjon. Det er ikke en forbedring.

**Portabilitetsargumentet peker samme vei.** Nettopp fordi Azure kan bli aktuelt
senere, er plattformspesifikk fillagring det dårligste stedet å legge
kontraktsdata. Postgres flyttes mellom Supabase, Cloud SQL og Azure Database for
PostgreSQL uten at applikasjonen merker det. Et montert filvolum må bygges om ved
hver flytting.

**Timingen er god.** Det finnes ingen backend-`Dockerfile`, ingen
`cloudbuild.yaml` og ingen Cloud Run-tjenestedefinisjon i repoet — bare SPA-ens
`Dockerfile`. Utrullingen er altså fortsatt en beslutning, ikke en installasjon
som må avvikles. AR-03 kan lukkes før første produksjonsdeploy i stedet for etter.

**Alternativet.** Én Postgres for hendelser, godkjenninger, outbox, utkast og
vedleggsmetadata, slik at «append hendelse OG køopp levering» er ett `COMMIT`.
Vedleggsbytes i objektlager — Cloud Storage nå, Blob Storage ved en eventuell
flytting — med referanse og hash committet transaksjonelt. Da er det eneste
plattformavhengige leddet en adapter foran objektlageret.

## AR-04 — domenemodellen finnes to ganger

Reglene lever i Python (`business_rules.py`, `timeline_service.py` på 2226 linjer,
`approval_authority.py`) og i TypeScript (`vederlagDomain.ts` 23k,
`fristDomain.ts`, `grunnlagDomain.ts`, `approval/authority.ts`, `approval/route.ts`).
`services/approval_authority.py:73` sier det rett ut: *«Mirrors resolveRoute in
src/lib/approval/route.ts.»*

Fem driftdetektorer i `scripts/` finnes utelukkende fordi det er to sannhetskilder.
For sikkerhetsspørsmålet betyr det at fullmaktsmatrisen og preklusjonsreglene
*brukeren ser* ligger i frontend-kopien. Divergerer de, vises brukeren en annen
regel enn serveren håndhever. Ikke et angrep, men i et bevissystem er «skjermbildet
sa dette var innenfor min fullmakt» et reelt problem.

**Alternativet.** Én kilde, generert utover: Pydantic → JSON Schema og OpenAPI
(`scripts/generate_openapi.py` finnes allerede) → generert TypeScript og Zod i CI.
Frontend eier presentasjon og optimistisk UI, aldri en juridisk konklusjon.

## AR-05 — ingen CI

S9 slo fast at ekstern CI ikke kunne avkreftes fra repoet alene. Det er nå
avkreftet fra kilden: GitHub rapporterer `total_count: 0` workflows for
`khjohns/endringsmeldinger`. `.husky/pre-commit` kjører `lint-staged`, altså
prettier.

Det som gjør dette til det billigste punktet i hele vurderingen, er at portene
allerede er grønne:

| Port | Status 2026-09-19 |
| --- | --- |
| `pytest` | **1440 bestått**, 9 hoppet, 1 `xfail` — på **9,1 sekunder** |
| `vitest` | **583 bestått** i 50 filer — 49 sekunder |
| `svelte-check` | **0 errors**, 9 warnings — `npm run check:error` gater i dag |
| `ruff check` | **41 errors**, 24 auto-fiksbare — gater ikke i dag |
| driftskript | 3 av 9 grønne — se AR-08 |

CI er altså ikke «rydd opp først». Det er en workflow-fil, én `ruff --fix`-runde,
og en beslutning om hvilke driftskript som skal baselines.

> **Merknad 2026-09-19 (senere samme dag): AR-05 er lukket.**
> `.github/workflows/ci.yml` finnes, med tre gatende jobber — `pytest`, `vitest` og
> `svelte-check --threshold error`. GitHubs `total_count: 0` gjelder ikke lenger.
>
> Anslaget i avsnittet over holdt på ett punkt og bommet på ett. **Workflow-fila var
> nok** — portene var grønne, og alle tre er verifisert fra ren tilstand. Men
> **`ruff --fix`-runden er ikke riktig svar alene:** av 73 feil er 14 `UP042`, som
> vil gjøre `class X(str, Enum)` om til `StrEnum`. Det endrer `str()` og
> f-string-interpolering på 14 domeneenums som serialiseres inn i hendelsesloggen
> (kontrollert kjørt: `str(...)` går fra `'Gammel.GODKJENT'` til `'godkjent'`).
> Regelen bør slås av framfor rettes. De øvrige 59 er trygge.
>
> `ruff` og `eslint` er derfor holdt utenfor CI inntil videre: en ikke-gatende sjekk
> er samme feil som driftdetektorene. En fil-basert sperrehake ble prøvd og forkastet
> — den flagget gammel gjeld i filer endringen tilfeldigvis rørte.

## AR-06 — kompenserende rollback er usunn, og dere har bevist det

`tests/test_approval/test_audit_20260916.py:114` er en `strict` xfail:

> `AP-04: stale creation attempt deletes committed metadata`

Testen kjører to samtidige opprettelser av samme sak. Den gamle arbeideren leser
versjon 0 og pauser; den nye committer; den gamles kompenserende rollback sletter
metadataen den nye nettopp skrev. Det er ikke en hypotese om `TrackingUnitOfWork` —
det er den reproduserte, uløste konsekvensen av «best-effort kompensasjon i stedet
for transaksjon», rødmerket i repoets egen suite.

AP-04 løses ikke i kompensasjonslogikken. Den løses av AR-03: når opprettelsen er
én transaksjon, finnes det ingen rollback å kjøre for sent.

## AR-07 — e-postnøklet policyrest

`project_memberships` har fortsatt policyen «Users can read own memberships» for
`authenticated`, med `user_email = auth.email()`. Den er inert i dag fordi GRANT-en
er tilbakekalt, og `has_table_privilege` er `false` for begge roller.

Den er likevel nøklet på e-post, altså identitetsmodellen commit `d0b54dc`
(«bind godkjenningsfullmakt til bruker-ID, ikke e-postadresse») eksplisitt gikk
bort fra som svar på RV-03. Den våkner hvis noen gir SELECT tilbake. Bør droppes,
ikke bare avvæpnes.

## AR-08 — driftdetektorene kan ikke gates, og én er ødelagt

Ni skript kjørt i `--ci`-modus: `contract_drift`, `event_field_usage` og
`label_coverage` passerer. `state_drift`, `validation_drift`, `category_drift`,
`constant_drift`, `docs_drift` og `check_drift` feiler.

> **Merknad 2026-09-19 (senere samme dag): bekreftet, med én presisering.** Kjørt på
> nytt: samme tre passerer, samme seks feiler. Presiseringen gjelder **`--ci`-flagget,
> som er avgjørende.** Uten det returnerer alle ni exit 0, også de som rapporterer
> kritiske funn i utskriften. Kjører man dem uten flagget — som er det nærliggende —
> ser alle ni grønne ut. Det er verdt å vite for den som kobler dem på CI, og det er
> en felle jeg gikk i selv før jeg leste dette avsnittet.

`category_drift` feiler på **sin egen parser**. Den rapporterer «0 hovedkategorier
i frontend» mot backends fire, men `src/lib/constants/categories.ts` ligger nøyaktig
der skriptet leter (`scripts/category_drift.py:302`) og inneholder kategoriene.
Verktøyet klarer ikke lenger å lese filen, og ingen har oppdaget det — fordi
ingenting kjører det.

Det er den presise grunnen til at driftdeteksjon er feil svar på to sannhetskilder:
detektoren forfaller like stille som driften den skulle fange. `state_drift`
rapporterer for øvrig 7 kritiske og 106 advarsler, der advarslene i hovedsak er
representasjonsforskjeller (`TS=string` mot `Py=str | None`). De sju kritiske er
ikke gjennomgått enkeltvis her.

## Målarkitektur

```
┌─────────────────────────────────────────────────────┐
│ SvelteKit SPA — kun presentasjon                    │
│ typer + Zod GENERERT fra backend-skjema             │
└───────────────────────┬─────────────────────────────┘
                        │ cookie + CSRF
┌───────────────────────▼─────────────────────────────┐
│ Flask: autoriser → valider → ÉN kommando → svar     │
│ dekoratørene beholdes som andre forsvarslinje       │
├─────────────────────────────────────────────────────┤
│ Domenelag (rammeverksfritt)                         │
│   decide(state, command) -> [events]                │
│   testbart uten Flask, uten database                │
├─────────────────────────────────────────────────────┤
│ psycopg, per-request rolle, SET LOCAL app.*         │
└───────────────────────┬─────────────────────────────┘
                        │ én transaksjon
┌───────────────────────▼─────────────────────────────┐
│ Postgres — RLS PÅ og FORCE, grensen ligger i data   │
│  events · metadata · approvals · outbox · utkast    │
│  COMMIT: hendelse + projeksjon + leveringsjobb      │
│  hendelsestabeller uten UPDATE/DELETE for runtime   │
└───────────────────────┬─────────────────────────────┘
                        │ FOR UPDATE SKIP LOCKED
┌───────────────────────▼─────────────────────────────┐
│ Worker → Catenda (frosset mål + innholdshash)       │
└─────────────────────────────────────────────────────┘
```

## Rekkefølge

**Fase 0 — gjør dagens tilstand håndhevet.** Ingen arkitekturendring.
CI med `pytest`, `vitest`, `check:error` og `ruff` (etter én `--fix`-runde).
Migrasjoner som eneste skjemakilde: DDL-en for hendelsestabellene ut av
docstringen i `repositories/supabase_event_repository.py` og inn i ekte
migrasjoner, med ren Postgres i CI. Driftskriptene baselines eller repareres —
`category_drift` først, siden den er ødelagt. `REVOKE UPDATE, DELETE` (AR-02) og
drop av restpolicyen (AR-07) hører også hit; begge er små og uavhengige.

*Hvorfor først:* alt etterpå er store endringer, og de kan ikke gjøres trygt uten
håndhevede porter. Dette konverterer også auditserien fra prosa til tester.

**Fase 1 — én database, med grensen i den.** Alt til Postgres, SQLite bort.
Per-request rolle, RLS med `FORCE`, `SET LOCAL`. Hendelsesappend som én
transaksjonell funksjon. Lukker AR-01, AR-03 og AR-06.

*Hvorfor nummer to:* dette gjør hele klasser av de funnede feilene umulige, og må
komme før koden reorganiseres — ellers gjøres reorganiseringen to ganger.

**Fase 2 — sideeffekter ut av forespørselen.** Catenda-levering til outbox med egen
worker mot samme Postgres. `FOR UPDATE SKIP LOCKED`, frosset mål og innholdshash
ved commit, eksplisitt terminalfeil med varsling. `event_routes.py` krymper fra
1597 linjer til autoriser–valider–kommando.

Plattformvalget legger én føring her. `deliver()`
(`services/approval_service.py:612`) tar i dag en `dispatch`-callable og kjøres
inne i en forespørsel; det finnes ingen bakgrunnsprosess. På en tjeneste som
skalerer til null kjører ingenting mellom forespørslene, så en mislykket levering
har ingen retry-vei før neste bruker tilfeldigvis gjør noe. Workeren må derfor
drives av noe utenfor forespørselen: Cloud Scheduler mot et internt
worker-endepunkt, Cloud Tasks, eller en tjeneste med `--min-instances=1`. Det
tilsvarende på Azure Container Apps er en KEDA-skalert jobb eller en fast replika.
Valget er ikke tatt, og bør tas sammen med fase 1 — ikke etterpå, siden outboxens
plassering og workerens drivmekanisme er samme beslutning.

**Fase 3 — ett domene, generert utover.** Lukker AR-04. Driftskriptene blir
byggesteg eller slettes.

**Fase 4 — opprydding.** CSV-backenden, `DEFAULT_PROJECT_ID = "oslobygg"`
(`lib/project_context.py:14`) som stille gjør manglende header til et ekte
prosjekt, magic links om de er ubrukte, og mockup-rutene ut av produksjonsbundlen
(`src/routes/+layout.ts:14`).

## Kontroller som er kjørt

Mot prosjektet `endringsmeldinger` (`gwdxadexwktegkklyobv`, Postgres 17,
`ACTIVE_HEALTHY`), 19. september 2026. Begge er rene katalogslesninger.

**1. Rettigheter og RLS per tabell** — kontrollspørringen migrasjonen selv
foreskriver, utvidet med RLS-status:

```sql
SELECT c.relname, r.rolname,
       has_table_privilege(r.rolname, c.oid, 'SELECT') AS kan_lese,
       has_table_privilege(r.rolname, c.oid, 'INSERT') AS kan_skrive,
       c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','v');
```

Resultat: 20 tabeller, ingen views. `kan_lese` og `kan_skrive` er `false` for
begge roller på samtlige. `relrowsecurity` er `true` overalt,
`relforcerowsecurity` er `false` overalt.

**2. Policyer, BYPASSRLS, triggere og beskrankninger:**

```sql
SELECT schemaname||'.'||tablename, policyname, roles::text, cmd, qual
FROM pg_policies WHERE schemaname='public';

SELECT rolname, rolbypassrls FROM pg_roles
WHERE rolbypassrls AND rolname NOT LIKE 'pg\_%';

SELECT c.relname, t.tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal;

SELECT c.relname, con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
WHERE c.relnamespace='public'::regnamespace AND con.contype='u';
```

Resultat: samtlige policyer er `{service_role} / ALL / qual=true`, med det ene
unntaket i AR-07. `rolbypassrls` er sann for `postgres`, `service_role`,
`supabase_admin`, `supabase_etl_admin` og `supabase_read_only_user`. Fem triggere:
fire `updated_at`-settere og én auto-medlemskapstrigger — ingen på
hendelsestabellene.
`UNIQUE (sak_id, versjon)` og `UNIQUE (event_id)` finnes på alle tre
hendelsestabellene.

**3. GitHub:** `list_workflows` for `khjohns/endringsmeldinger` gir
`total_count: 0`.

**4. Lokalt:** `pytest` (1440/9/1 på 9,1 s), `npm test` (583 på 49 s),
`npm run check` (0 errors, 9 warnings), `ruff check` (41 errors), og ni driftskript
i `--ci`-modus. Testene ble kjørt i et rent virtuelt miljø utenfor repoet; ingen
`RUN_LIVE_SUPABASE`, altså ingen nettverkskall fra suiten.

## Verifikasjon og grenser

Bekreftet denne runden: AR-01, AR-02, AR-05, AR-07, AR-08 og tallene i AR-04 og
AR-06. AR-03 er kodebekreftet, og alvorsgraden er fastsatt etter at plattformen ble
oppgitt. Plattformvalget er opplyst av utvikler, ikke lest ut av en
utrullingskonfigurasjon — det finnes ingen slik konfigurasjon for backend i repoet.
Atferden som er beskrevet (efemer disk, skalering til null, minnebasert
containerfilsystem) følger av plattformenes dokumenterte standardoppsett og er
ikke målt på en kjørende tjeneste, siden ingen finnes ennå. Endres oppsettet —
`--min-instances=1`, montert volum, én fast instans — endres konsekvensen, men
ikke anbefalingen: se avsnittet om hvorfor volummontering bytter datatap mot
korrupsjon.

**Ikke verifisert:** hemmelighetsrotasjon; backup og gjenoppretting; de sju kritiske funnene i
`state_drift` enkeltvis; faktisk lastbilde; om Supabase-konsollets anonyme
innlogging og OAuth-server er slått av (beslutningen står i masterplanen, men
konsolltilstanden er ikke inspisert herfra).

At tidligere auditer var smalere og fant færre funn, er ikke bevis for at disse
grensene var sikre. Motsatt: at denne runden bekrefter at Data API-nedstengingen
holder, er ikke bevis for at tenant-grensen holder — AR-01 er nettopp at den
grensen ikke finnes i databasen i det hele tatt.

### Hva som er datert til hva

Kontrollene har ulike baselinjer, og forskjellen har betydning når dette
sammenstilles med det parallelle auditsporet:

| Kontroll | Gjelder |
| --- | --- |
| Kodelesing, linjehenvisninger, filstørrelser | `507e225` |
| `pytest`, `vitest`, `svelte-check`, `ruff`, driftskript | `507e225`, kjørt 19.09 |
| Rettigheter, policyer, triggere, beskrankninger | **Levende database 19.09** |
| Fravær av GitHub Actions-workflows | **Levende GitHub 19.09** |

De to nederste radene kan altså vise en tilstand som er nyere enn `507e225`.
Motsatt kan de tre øverste være foreldet av commits fra det andre sporet. Ved
sammenstilling bør hvert funn kontrolleres på nytt mot gjeldende `main`: et funn
som allerede er lukket der, er lukket, og et sitat som ikke lenger finnes i koden,
er et sitat fra en tidligere tilstand — ikke et tegn på at funnet var galt.

## Gjenstående

Ingen kodeendring er gjort. Dette dokumentet lukker ingen punkter i auditserien,
men gir svar på to som sto åpne: S9 (ekstern CI) og halve S10 (append-only).
Begge svarene er negative.

Spørsmålet om driftsplattform, som sto åpent i første utkast, er besvart og
innarbeidet. Det flytter AR-03 fra teknisk gjeld til en feil som utløses av normal
drift, og gjør fase 1 til en forutsetning for første produksjonsdeploy snarere enn
en opprydding etterpå.

Åpent: om `deliver()` skal drives av Cloud Scheduler, Cloud Tasks eller en fast
instans (se fase 2), og om vedleggsbytes skal til Cloud Storage nå eller vente til
fase 1 er landet.

Sammenstillingen mot Gemini-sporet er **utført** og står i eget dokument. Utfallet:
sporet lukket ingen av funnene her, fordi det ikke endret produksjonskode, og det
fant uavhengig fire nye tilfeller av lekkasjeformen AR-01 forutsa (AUT-01, AUT-02,
AUT-05, AUT-06). Til gjengjeld ga det fase 1 et forarbeid vurderingen ikke hadde:
hendelsestabellene mangler `prosjekt_id`, så RLS-policyen skissert under AR-01 kan
ikke skrives før kolonnen finnes og er backfilt fra `sak_metadata`.
