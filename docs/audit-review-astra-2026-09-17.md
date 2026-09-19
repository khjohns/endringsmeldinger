# Review: etterprøvingen 2026-09-17 og godkjenningsrettingene i `e235412`

Gjennomført 17.–18. september 2026. Gjenstand:
[etterprøvingen av sikkerhetsarkitekturen](audit-sikkerhetsarkitektur-2026-09-17.md),
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md),
[transaksjonsplanen](plans/2026-09-17-atomisk-utstedelse-og-outbox.md) og koden i
`e235412` (merget som `7c1f61e`). Forrige ledd i kjeden:
[audit av godkjenningsflyten](audit-godkjenningspanel-og-durable-levering-2026-09-16.md).

Appen er ikke i produksjon og har ingen reelle data. Alvorlighet angir mulig
konsekvens under beskrevne forutsetninger, ikke observert hendelse.

**Metode.** Syv parallelle gjennomganger med hvert sitt mandat (OAuth-flaten,
lesetilgang, prosjektkontekst og ruteregister, kodeendringene, testkvalitet,
faktapåstander, plankvalitet), pluss en uavhengig sikkerhetsgjennomgang som bare
lette etter udokumenterte funn. Reproduksjoner er kjørt som midlertidige
probetester mot ekte Flask-ruter og dekoratører med testdobler for leverandør og
lagring; probene er slettet. Ingen sporede filer er endret, og ingen kall er gjort
mot ekte Catenda. Den planlagte adversarielle motprøvingen av hvert funn ble
avbrutt for å spare forbruk — se «Forbehold».

Status for rettingene føres i
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#status-2026-09-18):
RV-01, RV-03 til RV-09, RV-11 og RV-16 er lukket med regresjonstest 2026-09-18.

**Merknad 2026-09-19.** To av funnene under er senere etterprøvd i
[vurderingen av auditfunnene](vurdering-av-auditfunn-2026-09-19.md):

- **RV-07 er lukket per kallsted, ikke som klasse.** `tillatte_saker=cases_in_project`
  ble påført to steder. `valider_grunnlag_fortsatt_gyldig`
  (`forsering_service.py:823`) itererer fortsatt fremmede saker ufiltrert, og
  `finn_forseringer_for_sak` returnerer relasjonsindeksen som den er. Gemini-sporet
  fant begge uavhengig som AUT-01 og AUT-02.
- **RV-15, viewene, er uten virkning i dagens base.** Katalogen har ingen views i
  `public`. Docstring-delen av funnet står: SQL-en kan fortsatt gjenskape dem.

Forbeholdet på linje 326 om at faktiske databaserettigheter ikke var verifisert, er
løst i [arkitekturvurderingen](arkitekturvurdering-2026-09-19.md).

## Sammendrag

Etterprøvingen er metodisk solid: den skiller konsekvent mellom bekreftet,
avkreftet og uavklart, protokollfører hva som ble avskrevet, og korrigerer
prompten der den tok feil. Tre ting endrer likevel bildet:

1. Kodeendringene i samme commit svekker fullmaktskontrollen i ett tilfelle
   (RV-01). Det er en regresjon mot atferden før `e235412`.
2. To forbehold i etterprøvingen — «ingen vei til kontraktsdata er påvist» og
   «ingen kryssprosjekttilgang er demonstrert» — lar seg oppheve fra materiale som
   allerede ligger i repoet (RV-06, RV-07).
3. Den alvorligste svakheten i godkjenningslaget er ikke berørt av noen audit i
   serien: fullmakt nøkles på en foranderlig e-poststreng (RV-03).

## Funn

| ID | Alvorlighet | Funn | Kilde |
| --- | --- | --- | --- |
| RV-01 | Høy | Ny sluttdato ruter et beløp over alle fullmakter til kjeden i stedet for å avvise det | Regresjon i `e235412` |
| RV-02 | Middels | `reconcile()` kan returnere en pakke midt i utstedelse; ordren blir utstedt, posten står varig som «returnert» | Regresjon i `e235412` |
| RV-03 | Kritisk | Godkjenningsfullmakt bindes til e-poststreng, ikke identitet | Nytt |
| RV-04 | Høy | Forseringsrespons omgår godkjenningsporten | Nytt |
| RV-05 | Høy | Vedlegg lastes ned av prosjektmedlem uten kontraktsrolle | Nytt |
| RV-06 | Høy | `authenticated`-policyer gir anonymt innlogget bruker saksdata via Data API | Utvider SA-01 |
| RV-07 | Høy | Kryssprosjekttilgang lar seg demonstrere på fire veier | Utvider S2 |
| RV-08 | Middels | Supabase-lageret lagrer ikke `aktor_team_id`; interne notater kan ikke parses tilbake | Nytt |
| RV-09 | Middels | Eksistensen av interne notater lekker i saksliste, `/state` og `/context` | Utvider SA-02 |
| RV-10 | Middels | `/api/events/batch` lagrer formelle hendelser uten leveringskvittering | Utvider S3 |
| RV-11 | Middels | `ConcurrencyError` omklassifiseres til `TransientError`; 409 blir 500 og retry er ikke idempotent | Utvider S6 |
| RV-12 | Middels | Webhook: ikke-konstanttids hemmelighetssammenlikning, dedupe før behandling, døde `bcf.*`-grener | Utvider S5 |
| RV-13 | Middels | Åpne helsesjekker og 35 ruter returnerer rå unntakstekst | Nytt |
| RV-14 | Lav | GET-ruter som muterer godkjenningstilstand er CSRF-fritatt | Nytt |
| RV-15 | Lav | Hendelsestabellene finnes bare som docstring; views uten `security_invoker` | Utvider S10 |
| RV-16 | Lav | Standard `pytest` kjører skrivende live-tester mot Supabase | Nytt |
| RV-17 | Lav | Testsvakheter i reproduksjonene (strenge xfail uten `raises`, SA-01-testen slår ikke om) | Nytt |
| RV-18 | Lav | Dokumenthygiene: foreldede påstander, uflagget tilbakevist designdokument, ubesvart Del 3 | Nytt |
| RV-19 | Lav | Godkjenningspakker valideres ikke mot utstedelsesreglene | Nytt |
| RV-20 | Lav | EO-godkjenning avhenger nå av prosjektregisteret når `daily_rate` mangler | Regresjon i `e235412` |
| RV-21 | Lav | Webhooken oppretter EO-saker utenom godkjenningssperren | Utvider AP-01 |
| RV-22 | Lav | Hardkodet dagmulktssats og feilsvelging i alle sju analytics-ruter | Bekrefter SA-03 |

### RV-01 — Ny sluttdato omgår fullmaktsgrensen (høy, regresjon)

`order_exposure` returnerer `None` så snart `ny_sluttdato` er satt
(`services/eo_approval_service.py:81-96`), før det kjente beløpet vurderes.
`resolve_route(None, …)` (`services/approval_authority.py:76-85`) returnerer hele
kjeden uten å kontrollere at noen i kjeden dekker beløpet. En EO på 50 mill.
avvises uten dato, men går til kjeden og utstedes med en vilkårlig gyldig
sluttdato. Før `e235412` ble datoen ignorert, og samme krav ble avvist.

Dette bryter [brev-og-godkjenning.md:24](brev-og-godkjenning.md): «Beløp over alle
fullmakter blokkeres eksplisitt, det sendes ikke stille til høyeste nivå.»
Samme svakhet finnes fra før på to andre veier: `fremdrift=true` uten
`frist_dager`, og `frist_dager>0` uten sats (`eo_approval_service.py:99-104`).
Frontend speiler regelen (`src/lib/domain/endringsordre.ts:168`).

*Tiltak:* bruk `max(tillegg, fradrag)` som kjent nedre grense også når
tidseksponeringen er ukjent, og avvis når ingen i kjeden dekker den. Regresjonstest
for 50 mill. + sluttdato, fremdrift uten dager, og dager uten sats.

### RV-02 — Policyreturnering midt i utstedelse (middels, regresjon)

AP-02-rettingen lar `reconcile()` policysjekke pakker med status `godkjent` og
`utstedelse_feilet` (`eo_approval_service.py:208`), sette dem til `returnert` og
fjerne `issuingAt`/`issuingAttempt` (`:226-227`) — også mens en annen forespørsel
står midt i `opprett_endringsordresak`. Den første forespørselen fullfører
hendelsene, men kvitteringen forkastes fordi leasen er borte (`:412-413`), og
gjenopprettingen ser bare på `godkjent`/`utstedelse_feilet` (`:203-207`). Ordren
finnes offentlig, mens den interne posten permanent sier «krever ny godkjenning».
Utløses uten omstart av `PATCH /api/projects/<id>` med
`settings.contract.dagmulkt_sats` når policyen mangler `daily_rate`.

*Tiltak:* ikke policyreturner en pakke med gyldig lease; utvid gjenopprettingen til
system-returnerte pakker med `sakId`.

### RV-03 — Fullmakt nøklet på e-post (kritisk)

`routes/approval_routes.py:23` utleder godkjenneren som
`(identity.get("email") or "").lower()` og sammenlikner mot `handlers`/`chain` i
`BH_APPROVAL_POLICIES`; `routes/endringsordre_routes.py:265` gjør det samme.
Identitetslaget er ellers korrekt nøklet på Catenda-subject, men
`koe_resolve_identity` overskriver `app_users.email` med leverandørens verdi ved
hver innlogging (`supabase/migrations/20260912150635_catenda_user_sessions.sql:75`),
og kolonnen har ingen UNIQUE-skranke (`:7`). Migrasjonen advarer selv i linje 2 mot
å lenke kontoer på foranderlige e-poster.

Et BH-prosjektmedlem som setter e-postadressen på Catenda-kontoen sin til en
kjedemedlems adresse, arver vedkommendes fullmakt ved neste innlogging. Reprodusert:
to ulike bruker-ID-er med samme e-post gir identisk godkjenningskontekst (200), mens
en tredje e-post gir 403.

*Tiltak:* nøkle fullmakt på `app_users.id`/`catenda_subject`. E-post kun til visning.

### RV-04 — Forseringsrespons omgår godkjenningsporten (høy)

`public_event_block_reason` (`services/approval_policy.py:43-52`) fanger `respons_*`
og EO-typene. `forsering_respons` treffer ingen av dem, og
`POST /api/forsering/<sak_id>/bh-respons` (`routes/forsering_routes.py:364-369`) har
ingen sperre. Reprodusert i policyprosjekt: `respons_vederlag` → 403
`APPROVAL_REQUIRED`, `bh-respons` med `godkjent_kostnad` 50 mill. → 200, committet.
Forsering er den dyreste enkeltbeslutningen i NS 8407 §33.8. Funnet er bekreftet av
to uavhengige gjennomganger.

*Tiltak:* legg `forsering_respons` og ruten under samme serverregel, eller
dokumenter eksplisitt i masterplanen og `brev-og-godkjenning.md` at forsering ikke
er godkjenningspliktig.

### RV-05 — Vedlegg uten kontraktsrolle (høy)

`GET /api/cases/<sak>/vedlegg` og `.../vedlegg/<id>` (`routes/vedlegg_routes.py:56-58,
134-137`) har `@require_auth` og `@require_project_access()`, men ikke
`@require_contract_role()`. `VedleggRegistry.visible` (`services/vedlegg_registry.py:142-145`)
returnerer sant for alt med status `pending`/`delivered`, uavhengig av team, og
dokumentet hentes med appens egen tjenestekonto. Reprodusert med
`contract_membership → (None, None)`: 200 og PDF-bytes for motpartens vedlegg, mens
samme bruker får 403 på utkast.

### RV-06 — Data API gir anonymt innlogget bruker saksdata (høy)

Etterprøvingen skriver at ingen vei fra auto-consent-token til kontraktsdata er
påvist, og legger Data API-testen på prioritet 2. Materialet ligger i repoet:
`backend/migrations/005_project_rls_policies.sql:19-28` gir alle med
`auth.role()='authenticated'` lesetilgang til `sak_metadata` i aktive prosjekter —
på tvers av prosjekter — med tittel, status og krevde/godkjente beløp.
`004_projects_table.sql:35-37` gir det samme for `projects.settings`, og
`006_bim_tables.sql:57-59, 66-68` for `sak_bim_links` og `catenda_models_cache`.
Anonyme Supabase-brukere bruker rollen `authenticated`. `backend/migrations/README.md:3`
sier at migrasjonene er kjørt.

Emulert mot lokal Postgres med repoets migrasjoner: som `authenticated` med
`is_anonymous=true` ble saker fra to prosjekter lest ut. Skriving var blokkert, og
`koe_events`, `app_*`- og `catenda_*`-tabellene og RPC-ene var stengt.

*Tiltak:* prioritet 0, sammen med SA-01. Fjern `auth.role()='authenticated'`-policyene,
`REVOKE ALL FROM PUBLIC, anon, authenticated` på eldre tabeller, og
`ALTER DEFAULT PRIVILEGES … REVOKE`. Merk at fjerning av Flask-blueprintene ikke
lukker Supabase-siden: anonym innlogging og OAuth-serveren konfigureres i prosjektet.

### RV-07 — Kryssprosjekttilgang lar seg demonstrere (høy)

Fire veier, alle reprodusert med ekte ruter og dekoratører:

- `GET /api/forsering/<sak>/kontekst` returnerer `sak_states` for en referert sak i
  et annet prosjekt, med sakstittel, mens direkte oppslag på samme sak gir 403.
  Leseren var `viewer` uten kontraktsrolle.
- `DELETE /api/saker/<sak>/bim-links/<id>` sletter på link-id alene
  (`eq("id", 999)`), uten å kontrollere sak eller prosjekt.
- `PATCH /api/projects/<id>` krever `admin`, men ikke kontraktsrolle. Med
  `dagmulkt_sats = 1` faller eksponeringen for 60 dagers fristforlengelse fra
  9 000 000 til 60, og ruten går fra hele kjeden til ingen godkjenning.
- Nestet `prosjekt_id` i hendelsen er klientstyrt og gir forfalsket
  `ce_source = /projects/project-a/cases/B-1`.

I tillegg svarer `/api/routes` (87 ruter) og `/api/cloudevents/schemas` uten sesjon.

### RV-08 til RV-22 — kortform

- **RV-08:** `SupabaseEventRepository._event_to_cloudevent_row` (`:304-325`) bygger
  raden uten `aktor_team_id`, som `InterntNotatEvent` krever (`models/events.py:885`).
  Et notat lagret via Supabase kan ikke parses tilbake; `ValidationError` arver
  `ValueError` og fanges i `event_routes.py:483-491`, så alle senere innsendinger på
  saken gir 400. Premisset for prioritet 1 i masterplanen — at teamgrensen finnes i
  lagrede hendelser — holder altså ikke for Supabase-backenden.
- **RV-09:** `event_visibility.py:83-84` slår fast at notatets *eksistens* er
  skjermingsverdig. `last_event_at` oppdateres for interne notater
  (`event_routes.py:507, 531-535`) og vises som «Siste aktivitet» i sakslisten;
  `/state` og `/context` gir `antall_events` og `siste_aktivitet`
  (`timeline_service.py:236-238`). Analytics har ingen frontendforbruker — lekkasjen
  i faktisk brukerflate er større enn den i analytics.
- **RV-10:** batchruten leverer ikke til Catenda og skriver ingen kvittering, så
  saksbanneret viser «clear» for en formell hendelse motparten aldri får
  (`event_routes.py:647-850`, `services/catenda_delivery_status.py:31-58`).
- **RV-11:** `ConcurrencyError` arver `Exception` og klassifiseres av `with_retry`
  som `TransientError` (`lib/supabase/retry.py:108-120`). 409 blir 500, og en retry
  etter tapt svar gir feil utfall. Krever idempotensnøkkel i RPC-kontrakten.
- **RV-12:** `routes/catenda_webhook_routes.py:112` sammenlikner hemmeligheten med
  `!=` i stedet for `hmac.compare_digest`; `is_duplicate_event` registrerer før
  behandling (`:133-136`) mens alle utfall gir 200, så en re-levering svelges;
  `bcf.*`-grenene (`:147, 152`) avvises av `validate_webhook_event_structure` og er
  døde.
- **RV-13:** `/api/health` og `/api/health/catenda` er uautentiserte og returnerer
  `str(e)` (`routes/utility_routes.py:130, 145-191`). 35 ruter returnerer
  `message: str(e)` og nuller ut skjermingen i `error_handlers.py:53-75`.
- **RV-14:** CSRF håndheves bare for ikke-GET (`lib/auth/session.py:76`), mens
  `GET /api/cases/<sak>/approvals` kaller `reconcile_policy` og
  `GET /api/endringsordre/godkjenninger` kaller `reconcile()` — skrivende
  operasjoner nås med `SameSite=Lax`-navigasjon.
- **RV-15:** Hendelsestabellene har ingen migrasjon; eneste definisjon er docstringen
  i `repositories/supabase_event_repository.py:16-160`, der RLS slås på uten policyer
  og tre views opprettes uten `security_invoker`. Views uten `security_invoker`
  omgår RLS for roller med SELECT.
- **RV-16:** `tests/conftest.py:25-26` importerer `app`, som laster `.env`, og
  `tests/test_auth/test_database_contract_teams_integration.py` skriver derfor mot
  konfigurert Supabase ved vanlig `pytest`. Med tomme `SUPABASE_*` hoppes 9 tester
  over. Testinstansen er ufarlig (brukeravklaring 2026-09-17), men suiten er ikke
  nettverksfri, og CI vil skrive mot samme instans.
- **RV-17:** SA-01-testen registrerer blueprinten på en ny `Flask()` og slår ikke om
  når registreringen fjernes fra `app.py`; slettes modulen, faller hele testfilen ut
  ved innsamling. `MCP_REQUIRE_AUTH` leses aldri av ruten. Strenge xfail mangler
  `raises=AssertionError`, så en refaktorering kan skjule at reproduksjonen har
  sluttet å virke. SA-02-testen dekker bare `top_actors` og N+1-stien, ikke `by_role`,
  `/timeline` eller batchstien. Fiksturer importeres fra andre testmoduler, som
  dermed lastes to ganger under ulike modulnavn.
- **RV-18:** Se «Dokumenter og plan».
- **RV-19:** `order_request`/`order_exposure` godtar beløp som strenger og
  konsekvensverdier som ikke er bool; `EndringsordreService` avviser dem først ved
  utstedelse (`services/endringsordre_service.py:301-317`). Hele kjeden kan godkjenne
  en pakke som bare kan ende i `utstedelse_feilet`.
- **RV-20:** EO-ruten kaller nå `authority_policy` med prosjektregisteret
  (`routes/endringsordre_routes.py:272-276`). Uten Supabase-legitimasjon gir GET og
  POST 400 med konfigurasjonstekst. Eksempelpolicyen i `brev-og-godkjenning.md:44-53`
  har ikke `daily_rate`.
- **RV-21:** Webhooken oppretter `sak_opprettet` med `sakstype=endringsordre` og
  hardkodet `aktor_rolle="TE"` (`services/catenda_webhook_service.py:239-285`) uten
  policysjekk, mens samme hendelse blokkeres på `/api/events`.
- **RV-22:** `DAGMULKTSATS = 150000` (`routes/analytics_routes.py:36`) brukes for alle
  prosjekter. Alle sju rutene returnerer 200 med tomme tall ved lagringsfeil
  (`:80-84, 114, 146-147, 172-173, 563-564`), og 500-svarene returnerer `str(e)`.

## Det som passerer

- SA-01 er reprodusert i den ekte appen: 302 uten sesjon, uavhengig av
  `MCP_REQUIRE_AUTH`. Ingen frontendforbruker av de tre blueprintene.
- SA-02 og SA-03 er korrekt kodebekreftet; omfanget er større enn beskrevet (RV-09, RV-22).
- Avkreftelsen av åpen `approve` stemmer: 401 uten Bearer, og `session.require_auth`
  bruker cookie, ikke Bearer.
- PostgREST-korreksjonen er riktig. Mønsteret fantes i `origin/main`
  (`koe_reconcile_memberships`, `20260912150635_catenda_user_sessions.sql:62-117`),
  ikke bare lokalt — designet kunne vært falsifisert fra sitt eget grunnlag.
- S8-korreksjonen stemmer mot audit 2026-09-15; S9 stemmer (ingen CI finnes).
- Testtallene stemmer: 19 bestått og 2 xfail for de oppgitte filene,
  128 bestått og 1 xfail i `tests/test_approval`, 1386 bestått og 3 xfail i hele suiten.

**Avskrevet i denne gjennomgangen:** utkast er fail-closed på team i lesing, lagring
og sletting; TE kan ikke lese BH-pakker; en saksbehandler kan ikke godkjenne sin egen
pakke; et fjernet kjedemedlem kan ikke godkjenne via lagret `commandId`; interne
notater når verken brev, PDF, Catenda-kommentar, eksport eller `/api/cases`;
vedleggsnøkler har ingen path traversal, og nedlasting setter `nosniff` og
`octet-stream`; `koe_set_contract_teams` og `koe_register_project` har ingen
HTTP-rute og er `REVOKE`-et; `dev_auth_disabled()` er fail-secure ved uventet
`APP_ENV`; CSRF for mutasjoner bruker `compare_digest` og er stengt på tvers av
opprinnelser; webhookens prosjektruting krysssjekker board mot register.

## Dokumenter og plan (RV-18)

- Headeren i etterprøvingen er foreldet slik den ble merget: «Ingen merge er
  utført», «Main mangler … team-RPC-en og godkjenningspanelet» og «Ingen
  produksjonskode eller database er endret denne runden» — i en commit som endrer
  sju kodefiler. Masterplanen:66-67 sier fortsatt «ikke committet», og
  09-16-auditen:21 «rettet i arbeidskatalogen».
- Transaksjonsplanen har bare ett commit (`e235412`) og er ny, ikke revidert.
  De tre mønstrene som avvises i «Korreksjoner til inbox/outbox-forslaget» står
  uendret i [designdokumentet](design-durable-inbox-outbox-2026-09-17.md)
  (`:159-160, :176-177, :442-443`), som ingen av de nye dokumentene lenker til.
  Dokumentets kjernekonklusjon om at hendelseslageret må bort fra PostgREST er nå
  motsagt, uten at dokumentet er merket foreldet.
- Del 3 i prompten er ubesvart på tre punkter: påstanden om at auditserien
  «konvergerer», anbefalingen om å ferdigstille framfor å bygge om, og forholdstallet
  0,38 mellom test- og produksjonskode.
- `e235412` slettet seks plandokumenter fra mars (3 851 linjer) uten at det er nevnt
  i commit-meldingen eller i noe dokument.
  `audit-begrunnelsestekst-og-dodkode-2026-09-14.md:115` viser nå til en fil som ikke
  finnes.
- «Samlet produksjonsport» brukes som beslutningskriterium, men er aldri definert som
  en konkret sjekkliste. Eierskap er flagget, ikke tildelt.
- `docs/endringsordre.md:53` sier fortsatt at leasen hindrer samtidig opprettelse,
  som er nettopp overpåstanden AP-04 påpeker.

## Anbefalt rekkefølge

1. RV-01 og RV-03 — fullmaktskontrollen må stemme før noe annet bygges på den.
2. RV-04 og RV-05 — hull i samme port, begge enkle å lukke.
3. RV-06 sammen med SA-01 på prioritet 0, med live negativtest for `anon` og anonymt
   innlogget `authenticated` mot hver tabell og view.
4. RV-07 og RV-09 inn i masterplanens prioritet 1; leselaget må dekke referansefelter
   og avledet metadata, ikke bare hendelsestekst.
5. RV-08 før leselaget bygges, med round-trip-test per repository-implementasjon.
6. RV-02, RV-11, RV-19 inn i transaksjonsplanen som eksplisitte akseptkriterier.

## Verifikasjon

Kjørt i `backend/` med `venv`:

- `pytest tests/test_security/test_architecture_audit_20260917.py tests/test_auth/test_auth_interactions.py tests/test_routes/test_analytics_project_scope.py -q` → 19 bestått, 2 xfail.
- `pytest tests/test_approval -q` → 128 bestått, 1 xfail.
- Hele suiten → 1386 bestått, 3 xfail (se RV-16 om live-kall).
- `--runxfail` på reproduksjonene feiler på riktig assertion for SA-01, SA-02 og AP-04.
- Probetester (slettet etter kjøring) reproduserte RV-01, RV-02, RV-03, RV-04, RV-05,
  RV-07, RV-08, RV-09, RV-10, RV-11, RV-12, RV-13, RV-21 og RV-22 mot ekte ruter og
  dekoratører. RV-06 er emulert mot lokal Postgres med repoets migrasjoner.
- `ruff check services/ routes/ lib/ tests/` → 20 feil (10 I001, 7 F401, 2 E741,
  1 F841), ingen UP042. Promptens baselinetall gjaldt andre stier.

## Forbehold

Den planlagte adversarielle motprøvingen av hvert funn ble avbrutt, så funnene hviler
på én gjennomgang hver, med de reproduksjonene som er oppgitt. RV-01, RV-03, RV-05 og
RV-08 er i tillegg etterprøvd ved lesing av koden, og probene bak RV-07 er kjørt på
nytt uavhengig.

Ikke verifisert: faktiske databaserettigheter i Supabase-prosjektet (RV-06 og RV-15 er
emulert, ikke prøvd live), om anonym innlogging og OAuth-serveren faktisk er på,
staging, backup og restore, hemmelighetsrotasjon, ekstern CI eller branch protection,
og hele lastbildet mot Catenda. Grønne tester i denne runden er ikke bevis for at
disse grensene er sikre.
