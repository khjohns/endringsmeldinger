# Gjennomføring: MS-01, MS-04 og MS-10

Gjennomført 20. september 2026 mot `b05e6e0` på grenen
`claude/les-handoffen-20-09-docs-ngo2r9`. Gjenstand: de tre beslutningene
[målskjemaet](design-maalskjema-database-2026-09-20.md) og
[handoff 20.09](handoff-2026-09-20.md) §5 setter samme frist for — **når første
ekte sak opprettes.** Forrige ledd i kjeden er
[audit: databasearkitektur](audit-databasearkitektur-2026-09-20.md) og
[målskjemaet](design-maalskjema-database-2026-09-20.md); arbeidspakken står i
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md).

**Dette er ikke en auditrunde.** Den leverer produksjonskode, migrasjoner og
regresjonstester, ikke funn. Alvorlighetskolonnen er derfor byttet mot status.

Appen er ikke i produksjon og har ingen reelle data. Basen var tom for saksdata
da endringene ble gjort — det er hele grunnen til at de kunne gjøres nå.

---

## Det korte svaret

| ID | Beslutning | Status |
| --- | --- | --- |
| MS-01 | Én hendelsestabell i stedet for tre | **Gjennomført.** `hendelse` opprettet, `koe_events`/`forsering_events`/`endringsordre_events` sluppet |
| MS-04 | `aktor_id` erstatter `aktor` som personnavn | **Gjennomført.** Journalen bærer identitet; navnet slås opp ved visning |
| MS-10 | `organisasjon_id` på `projects` | **Gjennomført.** `NOT NULL`, ingen defaultverdi |

Basen gikk fra tjue til atten tabeller. To migrasjoner er skrevet **og anvendt**;
repoet og basen er avstemt på fem katalogsnitt etter endringen.

---

## MS-01 — én hendelsestabell

**Migrasjon:** `supabase/migrations/20260920193558_hendelse_tabell.sql`
(anvendt som versjon `20260920193558`).

De tre tabellene hadde samme nitten kolonner, samme skranker og samme
fremmednøkkel. `hendelse` er opprettet med samme form: `UNIQUE (sak_id, versjon)`
som optimistisk lås, `event_id` unik, `CHECK (actorrole IN ('TE','BH'))`,
fremmednøkkel til `sak_metadata(sak_id) ON DELETE CASCADE`, indekser på `sak_id`,
`prosjekt_id` og `time`, RLS på, og policyen `Service role full access on
hendelse`.

**Rettighetene er skrevet eksplisitt.** `GRANT SELECT, INSERT, UPDATE, DELETE,
TRUNCATE, REFERENCES, TRIGGER ... TO service_role` — ikke `GRANT ALL`, som på
PostgreSQL 17 også ville gitt `MAINTAIN` og dermed skilt tabellen fra
søsknene. Det er samme sett plattformen deler ut, så rettigheten er uendret;
migrasjonen skriver den bare ned. Åtte av de atten tabellene mangler fortsatt en
slik linje (se «Grenser»).

**Kode:** `repositories/supabase_event_repository.py`. `SAKSTYPE_TO_TABLE`,
`default_table`, `_get_table_name` og `_detect_sakstype_from_event` er borte, og
`sakstype`-parameteren er fjernet fra `append`, `append_batch`, `get_events`,
`get_events_by_type` og `get_events_as_cloudevents`. Den står igjen på
`get_all_sak_ids`, der den fortsatt er et reelt filter, og utledes nå av
hendelsestypene slik `_detect_sakstype_from_event_type` alltid har gjort.

**En stille feilvei forsvant med det samme.** `get_events` uten oppgitt sakstype
løp gjennom de tre tabellene i en `try/except Exception: continue`. En kolonne
som manglet i basen ga da tom sak framfor feil — nøyaktig maskeringen felle 2 i
handoff 20.09 beskriver. Lesingen treffer nå én tabell, og feilen når kalleren.

**Kolonnen heter `actorid`, ikke `actor`.** En ny tabell fødes med riktig navn
framfor å døpes om en migrasjon senere, så MS-04s skjemaside ligger i denne
migrasjonen.

## MS-04 — `aktor_id`, ikke personnavn

`models/events.py` dokumenterte feltet som «navn **eller** bruker-ID». Feltet
heter nå `aktor_id` og bærer én ting.

**Hva verdien er:** `app_users.id`, eller `catenda:<subject>` når handlingen kom
fra en Catenda-forfatter uten konto hos oss. Feltet har `min_length=1`; en tom
aktør er ikke en gyldig identitet.

**Skrivestiene** (alle stemples av serveren, aldri av klienten):

| Sted | Før | Nå |
| --- | --- | --- |
| `routes/event_routes.py:_parse_authorized_event` | `g.user["name"] or email or id` | `g.user["id"]` |
| `routes/forsering_routes.py` (tre ruter) | `g.user.get("name", "Ukjent BH")` | `g.user["id"]` |
| `routes/endringsordre_routes.py` (tre ruter) | `name or email or id` | `g.user["id"]` |
| `services/endringsordre_service.py` | `utstedt_av or "BH"` | `utstedt_av_id`, påkrevd |
| `services/eo_approval_service.py` | `frozen["ownerName"] or frozen["owner"]` | `frozen["owner"]` |
| `services/approval_service.py` | `item["owner"]` | uendret — var allerede en bruker-ID (RV-03) |
| `services/catenda_webhook_service.py` | `author_name` | `_aktor_id(author_subject)` |

De tre literalene `"BH"`, `"Ukjent BH"` og `"Ukjent TE"` er borte. De var
fallbacks av samme klasse som oslobygg-fallbackene: en verdi som ser ut som data
og ikke lar seg etterprøve.

**Visningen** slår opp navnet i `lib/aktor_navn.py`, mot `app_users`, med buffer
per forespørsel. `services/timeline_service.py` bruker det fem steder —
`AktorInfo.navn` tre ganger, `get_timeline`s `"aktor"`-nøkkel, og
`EOData.utstedt_av`, som er det EO-dokumentet viser. **Den eksterne kontrakten er
uendret:** de feltene inneholder fortsatt et navn.

**Oppslaget er vernet i sin helhet.** Feiler lageret, eller finnes ikke brukeren,
faller visningen tilbake på identiteten og feilen logges. Et brev som ikke lar
seg lese fordi en aktør er slettet, er verre enn et brev som viser identiteten —
og at en slettet person degraderer til en ID, er selve poenget med MS-04.

**Klienten sluttet å sende feltet.** `src/lib/api/events.ts` leste brukerens
e-postadresse fra `localStorage` og sendte den som `aktor`. Serveren forkastet
den uansett; nå sendes den ikke.

**CloudEvents-attributtet heter `actorid`.** `actor` er borte fra
`models/cloudevents.py`, `lib/cloudevents/schemas.py` og eksportruta.

## MS-10 — `organisasjon_id` på `projects`

**Migrasjon:** `supabase/migrations/20260920192448_organisasjon_id_paa_projects.sql`
(anvendt som versjon `20260920192448`).

`projects.id` er `'oslobygg'` — organisasjonsnavnet brukt som prosjekt-ID.
Kolonnen skiller de to identitetene. Den ene raden som finnes, er satt
eksplisitt; org-laget er ikke bygget, og det finnes ingen organisasjonstabell og
ingen organisasjonspolicy.

**Ingen defaultverdi, med vilje.** Backfillen er skrevet
`WHERE id = 'oslobygg' AND organisasjon_id IS NULL` framfor å treffe alt. Finnes
det en dag andre rader uten virksomhet, skal `SET NOT NULL` feile høylytt framfor
å tilskrive dem Oslobygg.

**Kode:** `organisasjon_id` er påkrevd på `Project` og `CreateProjectRequest`,
skrives av `SupabaseProjectRepository.create`, og **står ikke i
`UPDATABLE_FIELDS`**: å flytte et prosjekt mellom virksomheter i ettertid ville
gjort attribusjonen like uetterprøvbar som en defaultverdi. `POST /api/projects`
svarer `MISSING_PARAMETERS` uten den. `src/lib/types/project.ts` er utvidet
tilsvarende.

---

## Om Catenda-forfatteren

Spørsmålet kom opp under arbeidet, og svaret er verdt å skrive ned fordi det er
lett å lese feil ut av webhook-spekken.

**Webhookens nyttelast gir ikke en identitet.** `topic-event.author` i
`docs/tredjepart-api/webhook-api-openapi.yaml` er en streng: «User name that
triggered the event», med `john@doe.com` som eksempel. Navn eller e-post, ikke en
ID.

**Koden bruker den ikke.** `catenda_webhook_service` henter hele topicen fra
Topic-API-et først (`get_topic_details`, fordi nyttelasten ofte mangler
`topic_type`), og leser `bimsync_creation_author.user.ref` — som
`topic-api-openapi.yaml` kaller «Id of the user». Det er den verdien som blir
`catenda:<subject>`, og det er **samme kilde kontraktssiden utledes av**, så
rollen og identiteten hviler på samme grunnlag.

**Dette er ikke en ny avhengighet.** `_contract_side()` returnerte allerede
`None` uten subject, og da avvises topicen fail-closed. Uten `ref` ville ingen
sak blitt opprettet fra webhook, også før denne runden.

---

## Verifikasjon og grenser

### Kjørt og observert

- **Begge migrasjonene er anvendt** mot `gwdxadexwktegkklyobv`, som versjon
  `20260920192448` og `20260920193558`. Katalogen bekrefter atten tabeller i
  `public`, `hendelse` med `actorid TEXT NOT NULL`, og
  `projects.organisasjon_id TEXT NOT NULL` uten default.
- **De tre tabellene hadde null rader** ved en spørring kjørt umiddelbart før
  `DROP TABLE`. Ingen sak, ingen hendelse, ingen relasjon gikk tapt.
- **Hele migrasjonssettet — atten filer — bygger en tom PostgreSQL 16 i ren
  `sort`-rekkefølge**, med Supabase-plattformen stubbet etter oppskriften i
  `AGENTS.md`. Katalogen er identisk med prosjektets på **fem av fem** snitt:

  | Snitt | md5 |
  | --- | --- |
  | Kolonner | `10469d4409352742073dfaa97b5f28c1` |
  | Skranker | `82b0b30f00e7b495c3c646604971212e` |
  | Indekser | `422b3d2800d97199bd4a05ad84db7c03` |
  | Policyer | `61452f0fa081848c4ecbc392474f5778` |
  | Rettigheter | `8e9d3cd94a35f2929ba5ec016a136843` |

  **Summene er ikke sammenliknbare med handoff 20.09s.** Spørringene er skrevet
  på nytt i denne runden, og et annet uttrykk gir et annet md5 selv på identisk
  skjema. De er reproduserbare fordi spørringene står ordrett i gjennomføringen:
  `md5(string_agg(...))` over `information_schema.columns`, `pg_constraint`,
  `pg_indexes`, `pg_policies` og `information_schema.role_table_grants`, alle
  filtrert på `public`.
- **Testene:** 1482 passerte, 9 hoppet over, 41 `xfail`. `ruff check backend/`
  er 0. Frontend: 590 tester, `npm run check:error` 0 errors.
- **Åtte av atten tabeller mangler eksplisitt `GRANT`** — talt programmatisk
  over migrasjonsfilene, ikke anslått: `catenda_models_cache`, `magic_links`,
  `project_memberships`, `projects`, `sak_bim_links`, `sak_metadata`,
  `sak_relations`, `user_groups`.

### Lest ut av koden, ikke kjørt

- **Ingen skriving mot den ekte basen er utført.** `hendelse` har aldri hatt en
  rad. At innsending, lesing og CloudEvents-eksport virker mot Supabase, hviler
  på testdobler som speiler migrasjonsfila — den klassen avvik testsuiten per
  `AGENTS.md` ikke kan se.
- **Navneoppslaget er ikke kjørt mot ekte `app_users`.** Testene bruker et
  dobbelt lager. At `koe_resolve_identity` faktisk har lagt Catenda-forfatteren
  i `app_identities` med `provider = 'catenda'`, er lest ut av
  `auth_service.login`, ikke observert.
- **Webhookflyten er ikke kjørt ende-til-ende** mot Catenda.

### Ikke gjort

- **MS-05** (interne notater ut av journalen) er ikke gjennomført, selv om
  målskjemaets rekkefølge setter den sammen med MS-04 og MS-10. Den er større
  enn de tre: tidslinjen i grensesnittet må flette to kilder, og
  `event_visibility` må dekke begge. Den har samme frist.
- **`sak_metadata.created_by`** bærer fortsatt e-post eller navn, både fra
  `event_routes` og fra webhooken. Registeret er ikke journalen — raden kan
  endres og slettes — så MS-04s argument treffer den ikke. Den hører til MS-06,
  som deler `sak_metadata` i register og projeksjon.
- **Utkastregisteret** (`routes/utkast_routes.py`) lagrer fortsatt e-post på den
  som sist endret et utkast. Utkast er ikke append-only, og var aldri i
  journalen.
- **MS-02** (append-only håndhevet av basen) er ikke rørt.
  Runtime-legitimasjonen kan fortsatt `UPDATE` og `DELETE` i `hendelse`.
  Målskjemaets rekkefølge setter den etter at journalens form er endelig, og det
  er den nå.
- **Migrasjonshistorikken** i basen stemmer fortsatt ikke med mappa.
  `supabase migration repair` krever legitimasjon denne sesjonen ikke har.
  Alignmenten er 8 av 18 etter denne runden — de to nye er registrert, de gamle
  seksten er det som før.
- **Ytelse er ikke målt.** MS-01s påstand om at samtidighet ikke blir et problem
  av at tre tabeller blir én, er fortsatt et resonnement om indeksform og
  volumanslag, ikke en test.
