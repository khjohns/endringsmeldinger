# Audit: korrekthet i målskjemarunden (KR-01 til KR-14)

**Dato:** 2026-09-21 · **Commit:** `f6ceaaa` · **Område:** `9f70c45~1..f6ceaaa`
(åtte commiter, 71 filer, +2193/−1068)

Dette lukker den ene flaten [handoff 21.09](handoff-2026-09-21.md) navngir som
åpen: runden som gjennomførte MS-01, MS-04 og MS-10 er ikke gjennomgått for
korrekthet. `/simplify` er uttrykkelig kvalitet og ikke feil, og de fire
gjennomgangene i [gjennomgangen av målskjemarunden](audit-maalskjema-gjennomgang-2026-09-21.md)
ble bedt om å *ikke* lete etter korrekthetsfeil.

Forrige ledd i kjeden: [gjennomføringen](gjennomforing-maalskjema-2026-09-20.md),
[gjennomgangen (MG-01 til MG-09)](audit-maalskjema-gjennomgang-2026-09-21.md),
[målskjemaet](design-maalskjema-database-2026-09-20.md),
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md).

**Ingen produksjonskode er endret av denne runden.** Dokumentet er funnprotokoll.

---

## Funn

| ID | Alvorlighet | Sted | Kort |
| --- | --- | --- | --- |
| **KR-01** | **Høy** | `koe_register_project` (i basen), `scripts/register_project.py:57` | `organisasjon_id NOT NULL` bryter *alle* prosjektregistreringsstier — også oppdatering av et eksisterende prosjekt |
| KR-02 | Middels | `supabase_event_repository.find_sak_id_by_catenda_topic` | Ubegrenset skann av alle prosjekters `sak_opprettet`; avkorting gir duplikatsak fra webhook |
| KR-03 | Middels | `supabase_event_repository.get_all_sak_ids` | Upaginert; stille ufullstendig forseringssøk og backfill |
| KR-04 | Middels | `services/timeline_service.py:16` | `compute_state` er ikke lenger ren: avhenger av `app_users` og Flask-kontekst |
| KR-05 | Middels | `lib/aktor_navn.py:21` (`_buffer`) | Ingen memoisering utenfor request-kontekst — ett oppslag per hendelse |
| KR-06 | Middels | `lib/aktor_navn.py:49` (`_slaa_opp`) | `extensions["koe_auth"]` i stedet for `get_auth_service()`: i dev-auth slår ingen navn opp |
| KR-07 | Middels | `tests/test_services/test_business_rules.py` m.fl. | 46 testverdier fastslår nå at et personnavn er en gyldig `aktor_id` |
| KR-08 | Lav | `catenda_webhook_service._aktor_id:135` | `return ""` er en tilbakefallsgren modellen avviser (`min_length=1`). Maskert i dag |
| KR-09 | Lav | `endringsordre_service.py:555` vs `timeline_service.py:1122` | `utstedt_av` bærer UUID i ett svar og navn i et annet. Ingen levende forbruker |
| KR-10 | Lav | `catenda_webhook_service.py:357` | `sak_metadata.created_by` får personnavn fra webhook, identitet fra EO-stien |
| KR-11 | Lav | `auth_repository.user_id_for_subject:44` | Paginerende `all_rows` med `ORDER BY` for et unikt ett-rads oppslag |
| KR-12 | Lav | `supabase_event_repository._event_to_cloudevent_row:66` | Uåpnelig `else`-gren; runden rettet en skrivefeil inne i den |
| KR-13 | Lav | `scripts/backfill_relations.py:48,121` | Dobbel I/O og tapt typefilter etter MS-01 |
| KR-14 | Lav | `20260920193558_hendelse_tabell.sql:81` | `DROP TABLE` uten `CASCADE`; de gamle `*_sak_versions`-viewene er ikke nevnt |

Tre påstander fra gjennomgangen ble **avvist** — se «Avviste påstander» til slutt.
De to som ble rettet av katalogen, ikke av lesingen, står der med begrunnelse.

---

## KR-01 — `organisasjon_id NOT NULL` bryter alle prosjektregistreringsstier

**Høy.** MS-10 la `organisasjon_id TEXT NOT NULL` uten default på `projects`
(`20260920192448_organisasjon_id_paa_projects.sql:25`). Begrunnelsen er riktig og
står i migrasjonen selv: det finnes ikke noe defaultprosjekt, og et prosjekt uten
navngitt virksomhet skal ikke kunne opprettes.

Men bare én av tre skrivestier ble omskrevet. De to som faktisk registrerer
prosjekter, ble det ikke:

- `public.koe_register_project` — **lest fra `pg_proc` i den levende basen**, ikke
  fra migrasjonsfila:
  `INSERT INTO public.projects (id, name, description, is_active, created_by)`.
  Ingen `organisasjon_id`. Samme tekst står i
  `20260916133000_catenda_contract_teams_rpc_fixes.sql:88`.
- `backend/scripts/register_project.py:57` —
  `client.table("projects").upsert({id, name, description, is_active, created_by})`.
  Ingen `organisasjon_id`. Samme vei går `scripts/catenda_admin.py`.
- `POST /api/projects` **er** omskrevet og krever `organisasjon_id` — men
  `routes/project_routes.py:87` svarer `403` med mindre `dev_auth_disabled()`.
  Den omskrevne stien er altså den som bare finnes i utvikling.

**Rekkevidden er større enn «ingen nye prosjekter».** `koe_register_project` og
skriptet bruker begge `ON CONFLICT (id) DO UPDATE`, så spørsmålet er om
`NOT NULL` prøves før eller etter at konflikten løses. Observert i en kastbar
PostgreSQL 16.13 lokalt:

```
A: ny rad,           organisasjon_id utelatt → ERROR 23502
B: eksisterende rad, organisasjon_id utelatt → ERROR 23502
```

Postgres former og skrankesjekker raden før `ON CONFLICT` vurderes. **Også
oppdatering av et prosjekt som allerede finnes, feiler.** Ingen registreringssti
i det levende systemet virker.

Suiten fanger det ikke:
`tests/test_auth/test_database_contract_teams_integration.py` hopper over når
RPC-en ikke er utplassert, og lageret dekkes av testdobler som speiler repoet.
Dette er nøyaktig mønsteret `AGENTS.md` beskriver under «Testsuiten kan ikke se
at basen er uenig med repoet».

*Kjørt og observert:* katalogspørring mot `information_schema.columns` og
`pg_proc`; skrankerekkefølgen i lokal PG16.
*Lest ut av koden:* at `catenda_admin.py` går samme vei.

## KR-02 — `find_sak_id_by_catenda_topic` skanner alt og kan gi duplikatsak

**Middels.** `supabase_event_repository.py:279`:

```python
.select("sak_id, data").eq("event_type", "sak_opprettet").execute()
```

Ingen `limit`, ingen `range`, intet `prosjekt_id`-filter. Hele `data`-JSONB-en
for hver sak som noen gang er opprettet, i alle prosjekter, hentes og dekodes i
Python for å finne én topic-GUID.

PostgREST avkorter ved `db-max-rows`. At repoet selv regner med et tak, er
ikke utledet: `auth_repository.all_rows:18` paginerer i sider på 500 nettopp av
den grunn. Når loggen passerer taket, returnerer oppslaget stille `None` for en
topic som finnes, `base_sak_service` faller tilbake på den rå Catenda-GUID-en, og
webhookstien oppretter en **ny sak** i stedet for å finne den eksisterende. I en
append-only journal med rettslig vekt er en duplikatsak ikke en visningsfeil.

MS-01 gjorde dette verre, ikke bedre: der `koe_events`, `forsering_events` og
`endringsordre_events` hadde hvert sitt radbudsjett, deler alt nå ett i
`hendelse`.

Et `.eq("data->>catenda_topic_id", ...)`-filter ville fjernet skannet. Merk at
det ikke finnes noen indeks på det uttrykket — `hendelse` har i dag
`idx_hendelse_sak_id`, `idx_hendelse_prosjekt_id`, `idx_hendelse_time` og de to
unike (`event_id`, `sak_id+versjon`), og ingen på `event_type`.

*Kjørt og observert:* indekslisten fra `pg_indexes`.
*Lest ut av koden:* avkortingen — `db-max-rows` er en plattforminnstilling jeg
ikke har lest av.

## KR-03 — `get_all_sak_ids` er upaginert

**Middels.** `supabase_event_repository.py:226`:
`self._tabell().select("sak_id").execute()`. Én rad per *hendelse*, ikke per
sak, mot samme tak som KR-02. Med ~1000 hendelser (grovt 100–150 saker) kuttes
settet uten feilmelding.

Tre forbrukere:

- `forsering_service._finn_forseringer_via_scan:471` — en forsering som ligger
  forbi kuttet, rapporteres som «finnes ikke».
- `scripts/backfill_relations.py:48` og `:121` — hopper stille over de samme
  sakene.

Prosjektgrensen holder: kalleren avgrenser med `tillatte_saker(...)` før state
leses, merket AUT-02 i koden. Dette er derfor ikke et sikkerhetsfunn.
Avkortingen skjer imidlertid **før** avgrensningen, så den er ikke påvirket av
den.

Også dette forverret av MS-01, av samme grunn som KR-02.

## KR-04 — `compute_state` er ikke lenger en ren projeksjon

**Middels.** `services/timeline_service.py:16` innfører
`from lib.aktor_navn import navn as aktor_navn`, brukt på fem steder
(`:1122`, `:1455`, `:1670`, `:1879`, `:2082`). Fila sier fortsatt i sin egen
åpning:

> 2. State beregnes alltid fra scratch basert på events

Nå gjør den ikke det. `AktorInfo.navn` og `EOData.utstedt_av` er resultatet av
en databaselesing mot `app_users`, gjennom Flask-kontekst.

Konsekvensen er at **samme hendelse gir ulik state avhengig av hvem som
beregnet den.** Beregnet inne i en forespørsel bærer feltene navn; beregnet fra
`eo_approval_service` eller `scripts/backfill_reporting_cache.py` bærer de rå
identiteter, fordi `koe_auth`-utvidelsen ikke finnes der (se KR-06). En
persistert rapporteringsbuffer og en live lesing er da uenige om samme hendelse.

Dette treffer også steder som ikke vil ha navn i det hele tatt:
`endringsordre_service.hent_neste_eo_nummer()` beregner state for hver sak i
prosjektet bare for å finne neste EO-nummer, og spør nå `app_users` for å gjøre
det.

Handoffen slår fast at bare ett av de fem oppslagene har en levende forbruker
(`EOData.utstedt_av`, rendret i `EndringsordreDocument.svelte`). Å løse navnet
ved svargrensen framfor inne i projeksjonen holder `compute_state` ren og
koster ingenting.

## KR-05 — `_buffer()` memoiserer ikke der det trengs mest

**Middels.** `lib/aktor_navn.py:21`:

```python
if not has_request_context():
    return {}
```

En fersk dict per kall. `navn()` skriver treffet inn i den og kaster den —
altså ingen buffer i det hele tatt utenfor en forespørsel. Modulens egen
docstring forklarer at bufferet finnes fordi «én sak viser typisk to–tre aktører
om og om igjen».

Utenfor request-kontekst — bakgrunnsutstedelse i `eo_approval_service`,
`scripts/backfill_reporting_cache.py` — betyr det ett `app_users`-oppslag per
hendelse, gjentatt for hvert `compute_state`-kall. `approval_service.validate_items`
kaller `compute_state` én gang per element i en løkke. Uten app-kontekst i det
hele tatt gir samme sti i tillegg én `Navneoppslag … feilet`-advarsel per
hendelse.

## KR-06 — `_slaa_opp` når utvidelsen på en måte som feiler i dev-auth

**Middels.** `lib/aktor_navn.py:49` indekserer direkte:
`current_app.extensions["koe_auth"].repo`. Nabofunksjonen
`lib/auth/session.py:35` finnes nettopp for dette og gjør det trygt:

```python
service = current_app.extensions.get("koe_auth")
if service is None:
    service = AuthService()
    current_app.extensions["koe_auth"] = service
```

Utvidelsen settes aldri av en app-fabrikk. Et søk gjennom hele `backend/` viser
tre steder: `session.py:41` (lat oppretting), et live-innloggingsskript, og
testoppsett. I dev-auth returnerer `require_auth` på `session.py:68` etter å ha
satt `g.user`, uten å kalle `load_session()` — så `get_auth_service()` kjøres
aldri, nøkkelen finnes ikke, `KeyError` svelges av den brede `except Exception`,
og **hver aktør på hver tidslinje vises som rå identitet**, med én advarsel per
aktør.

Tilbakefallet til identitet er i seg selv riktig og påbudt. Det som er galt, er
at det utløses av noe som ikke er en feil, og at det finnes to måter å nå samme
repo på. `catenda_webhook_service._auth_service()` bruker allerede den trygge.

## KR-07 — 46 testverdier snudde det testene dokumenterer

**Middels.** Dette er rundens egen felle 2, gjennomført på testene. `AGENTS.md`
fikk i samme runde regelen som navngir den. Talt med et søk etter `aktor_id`-verdier
som inneholder mellomrom:

| Fil | Antall |
| --- | --- |
| `tests/test_services/test_business_rules.py` | 28 |
| `tests/test_services/test_forsering_business_rules.py` | 8 |
| `tests/test_services/test_forsering_service_bypass.py` | 5 |
| `tests/test_security/test_integrasjoner_audit_20260918.py` | 2 |
| `tests/test_models/test_events.py` | 1 |
| `tests/test_models/test_event_parsing.py` | 1 |
| `tests/test_api/test_cloudevents_api.py` | 1 |
| **Sum** | **46** |

Verdiene er `"TE User"` (20), `"TE Bruker"` (13), `"BH User"` (9),
`"TE Saksbehandler"`, `"BH Manager"`, `"BH Bruker"`, `"Integration Test"`.

Alle er grønne, og alle fastslår nå at en visningsstreng er en gyldig
`aktor_id`. `scripts/create_test_sak.py` og `test_event_roundtrip.py` fikk
riktig behandling i runden (`"test-bruker-te"`, en UUID); disse fikk den ikke,
nettopp fordi de var grønne. Legges det format­validering på `aktor_id` senere —
eller leser noen feltet som `app_users.id` — motsies de av en test som består.

## KR-08 — `_aktor_id` har en tilbakefallsgren modellen avviser

**Lav, latent.** `catenda_webhook_service.py:135` returnerer `""` for manglende
subject. `models/events.py:395` erklærer `aktor_id` med `min_length=1`, så
`SakOpprettetEvent(aktor_id="")` gir `ValidationError` — webhooken ville endt i
500, ikke i det dokumenterte tilbakefallet. Funksjonens egen docstring lover en
identitet.

I dag er grenen maskert: `_contract_side:145` returnerer `None` først for et
falsy subject, og kalleren avviser fail-closed på `:316`. Flyttes, gjenbrukes
eller ombyttes en av de to vaktene, krasjer mottaksstien.

## KR-09 — `utstedt_av` bærer to representasjoner

**Lav.** `endringsordre_service.py:555` returnerer `"utstedt_av": utstedt_av_id`
— en UUID — mens `timeline_service.py:1122` bygger `EOData` med
`utstedt_av=aktor_navn(event.aktor_id)` — et navn. Samme feltnavn, to former,
to endepunkter, ingen merknad i OpenAPI-skjemaet.

**Ikke en visningsfeil i dag.** `src/lib/api/endringsordre.ts:42` erklærer
opprettelsessvaret som `{ success, sak_id, catenda_synced }` — `utstedt_av`
leses ikke derfra. Bare den som kommer fra state, når
`EndringsordreDocument.svelte:61`. Dette er altså formdrift, ikke en feil
leseren kan se. Verdt å merke seg: `{data.utstedt_av || 'Byggherren'}` kan aldri
falle tilbake for en UUID.

## KR-10 — `created_by` får personnavn fra én sti og identitet fra en annen

**Lav.** `catenda_webhook_service.py:357` skriver
`"created_by": author_name` til `sak_metadata` — strengen fra
`bimsync_creation_author.user.name` — i samme funksjon som to linjer over
bevisst unngår navnet for hendelsen (`aktor_id = self._aktor_id(author_subject)`,
`:331`). `endringsordre_service.py:432` ble i denne runden endret til
`created_by=utstedt_av_id`.

Samme kolonne holder nå et personnavn, en `app_users.id` eller en e-post,
avhengig av hvordan saken ble til. `sak_metadata` er ikke append-only, så dette
lar seg rette — men webhookstien er den som har identiteten tilgjengelig to
linjer unna.

## KR-11 — unikt oppslag gjennom paginerende hjelper

**Lav.** `auth_repository.py:44` svarer på «hvilken bruker har denne
(provider, subject)» med
`all_rows("app_identities", "id,user_id", provider=..., subject=...)` — som
utsteder `select(...).order("id").range(0, 499)`. `.limit(2)` ville svart på det
samme og latt `len(rader) != 1`-vakten stå. Metoden ligger på mottaksstien
(`_aktor_id`) og navnestien (`_slaa_opp`), begge én gang per hendelse.

Indeksen finnes — `app_identities_provider_issuer_subject_key` på
`(provider, issuer, subject)`, verifisert i `pg_indexes` — så dette er en sortert
rundtur for mye, ikke et sekvensielt skann.

## KR-12 — uåpnelig gren, med en retting inni

**Lav.** `supabase_event_repository.py:66`: `if hasattr(event, "to_cloudevent")`.
Kjørt mot modellene: alle 16 hendelsestypene i `AnyEvent` arver
`CloudEventMixin` og har `to_cloudevent`. `else`-grenen (`:70–88`) kan ikke nås.

Runden brukte likevel en retting der — `event_dict.get("referrer_til_event_id")`
→ `refererer_til_event_id` — som ingen kan observere og ingen test dekker. Grenen
antyder en andre serialiseringskontrakt som må vedlikeholdes ved siden av
`CloudEventMixin.to_cloudevent`.

*Kjørt og observert:* `issubclass`-sjekken over `typing.get_args(AnyEvent)`.

## KR-13 — backfillen mistet typefilteret sitt

**Lav.** `scripts/backfill_relations.py:48` og `:121` kaller begge
`get_all_sak_ids()` og leser så `get_events(sak_id)` for hver sak. To passeringer
over hele loggen der de før leste hver sin tabell: `2 + 2N` rundturer mot
`2 + (N_forsering + N_eo)`.

Ingen av løkkene erstattet skranken tabellvalget ga. Kommentarene sier det rett
ut — «Løkka under plukker ut forseringssakene selv, på `avslatte_fristkrav`» —
men en hendelsestype som senere bærer `avslatte_fristkrav` eller
`relaterte_koe_saker` på en sak som verken er forsering eller EO, får da
relasjonen påstemplet uten feil. Autoriteten for sakstype er
`sak_metadata.sakstype`; ingen av løkkene leser den.

## KR-14 — `DROP TABLE` uten `CASCADE`, med uomtalte viewer

**Lav, betinget.** `20260920193558_hendelse_tabell.sql:81–83` slipper de tre
gamle hendelsestabellene uten `CASCADE`.
`20260918131137_lock_down_data_api.sql:58–79` behandler uttrykkelig
`koe_sak_versions`, `forsering_sak_versions` og `endringsordre_sak_versions` som
objekter som *kan* finnes, hver vernet med `to_regclass`. Finnes ett av dem,
avbryter `DROP TABLE` med «cannot drop table … because other objects depend on
it» — etter at `CREATE TABLE` og `GRANT`-ene er skrevet.

**Katalogen nedgraderer dette.** Ingen av de tre viewene finnes i prosjektet, og
de tre tabellene er borte. En base bygget fra migrasjonssettet alene får dem
aldri, siden de ble laget utenfor settet. Tilfellet som faller, er en klone av en
eldre prod-tilstand. Migrasjonen er dessuten anvendt og skal ikke redigeres.

---

## Avviste påstander

Gjennomgangen produserte tre påstander som ikke holdt. De står her fordi to av
dem ble avvist av katalogen og én av å lese hele stedet — de tre mekanismene
`AGENTS.md` navngir som opphav til feilklassifiserte funn.

**«`approval_letter.snapshot` fryser personnavn i journalen og bryter MS-04.»**
Avvist. `services/approval_letter.py` er **uendret i denne runden**
(`git log 9f70c45~1..HEAD -- backend/services/approval_letter.py` → tom). Videre
er `letter["sender"]` og `letter["recipient"]` partsnavn, ikke personnavn:
`ClaimApprovalView.svelte:96–97` sender `store.bhNavn` og `store.teNavn`. Et
formelt NS 8407-brev *skal* navngi partene. Invarianten som ble sitert, er
dessuten skrevet om `aktor_id`-feltet — «Journalen bærer `aktor_id`, aldri et
personnavn» — ikke om alt innhold i et brev. Mekanismen påstanden beskriver er
riktig lest (`mark_approved` → `publicationEvents` → `append_batch`), men den
fører ikke dit påstanden sier.

**«Ingen indeks på `app_identities(provider, subject)`, så hvert kall er et
sekvensielt skann pluss sortering.»** Faktafeil.
`app_identities_provider_issuer_subject_key` finnes på `(provider, issuer,
subject)`, erklært som `UNIQUE (provider, issuer, subject)` i
`20260912150635_catenda_user_sessions.sql:17`. Påstanden kom av å lese etter
`CREATE INDEX` og ikke etter skranken som gir en. Ytelsespoenget i KR-11 står
uavhengig av det.

**«`get_all_sak_ids` og forseringsskannet krysser prosjektgrensen.»** Ikke
framsatt som sikkerhetsfunn i gjennomgangen, men verdt å avklare siden formen
likner RV-07: `_finn_forseringer_via_scan:475` avgrenser med
`tillatte_saker(sak_ids_to_search)` før state leses, merket AUT-02 i koden.
Prosjektgrensen holder. Det som ikke holder, er fullstendigheten — KR-03.

---

## Verifikasjon og grenser

**Kjørt og observert**

- `backend`-suiten: **1484 bestått, 42 xfailed**, `/tmp/venv`, ~9 s.
- `ruff check backend/`: **rent**.
- `npm run check:error`: **4844 filer, 0 errors, 9 warnings, 6 filer med
  problemer**. (Gjennomgangen kunne ikke kjøre denne — `node_modules` manglet.
  Den er installert og kjørt her.)
- `npm test`: **51 filer, 590 tester, alle bestått**, 50 s.
- Katalogspørringer mot prosjekt `endringsmeldinger` (`gwdxadexwktegkklyobv`)
  over `information_schema.columns`, `pg_proc`, `pg_class`, `pg_indexes`.
  Kun katalog; ingen saksdata lest.
- Skrankerekkefølgen i KR-01: kastbar PostgreSQL 16.13 lokalt, `initdb` + to
  `INSERT … ON CONFLICT DO UPDATE` med en `NOT NULL`-kolonne utelatt.
- KR-12: `issubclass(a, CloudEventMixin)` over `typing.get_args(AnyEvent)`.
- KR-07: opptellingen er et regulært søk etter `aktor_id`-verdier med mellomrom.

**Lest ut av koden, ikke observert**

- Avkortingen i KR-02 og KR-03. `db-max-rows` er en PostgREST-innstilling på
  Supabase-prosjektet som jeg ikke har lest av; at et tak finnes, er utledet av
  at `auth_repository.all_rows` paginerer i sider på 500. Terskelen i teksten er
  plattformens dokumenterte standard, ikke en avlest verdi.
- KR-06s utløsning i dev-auth er utledet av kontrollflyten i `require_auth`, ikke
  kjørt med `DISABLE_AUTH=true`.
- KR-04s divergens mellom persistert buffer og live lesing er utledet, ikke
  framkalt.
- At `scripts/catenda_admin.py` går samme vei som `register_project.py` i KR-01.

**Ikke kontrollert**

- **Migrasjonssettet er ikke bygget fra tomt i denne runden.** De fem
  katalogsjekksummene i gjennomføringen er ikke reprodusert; KR-14 hviler på
  lesing av to migrasjonsfiler pluss katalogens svar på hva som finnes nå.
- Ingen RLS-policy er gjennomgått. Runden endret ingen, men det er ikke det
  samme som at de fortsatt passer `hendelse`.
- Frontendkoden er ikke gjennomgått for korrekthet utover de to filene runden
  rørte og de forbrukerne KR-09 følger.
- Ytelsestallene i KR-02, KR-03, KR-05 og KR-13 er ikke målt.
- Ingen av funnene har en reproduksjonstest ennå. KR-01 er den som egner seg
  best for en, og den kan skrives uten å røre basen.
