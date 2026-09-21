# Opprydding etter KR-rettingene: RY-01 til RY-07

**Dato:** 2026-09-21 · **Commit:** `c6df8d3` · **Område:** rettingene i
[audit-korrekthet-2026-09-21](audit-korrekthet-2026-09-21.md) (`bab9679`,
`a0f20e6`), gjennomgått med fire vinkler: gjenbruk, forenkling, effektivitet,
altitude.

Ni funn ble rettet i `c6df8d3` og står i den commiten. **Dette dokumentet er
det som ble utsatt** — funn som er reelle, men som krever en designbeslutning
eller en endring utenfor det som ble gjennomgått. De er dyre å finne igjen,
fordi de bare synes når man ser rettingene samlet.

Forrige ledd: [korrekthetsgjennomgangen](audit-korrekthet-2026-09-21.md),
[masterplanen](plans/2026-09-16-godkjenning-og-varig-levering.md).

---

## Funn

| ID | Alvorlighet | Sted | Kort |
| --- | --- | --- | --- |
| **RY-01** | **Middels** | `supabase_event_repository`, `forsering_service`, `backfill_relations` | Tre spørsmål som `sak_metadata` er projeksjonen for, stilles til journalen |
| RY-02 | Lav | `lib/supabase/paginering.py` | Offsetpaginering er O(M²/side); keyset er konstant per side |
| RY-03 | Lav | `lib/aktor_navn.py` | Bufferet på app-konteksten vokser ubegrenset i en langtlevende prosess |
| RY-04 | Lav | `base_sak_service.py:122-135` | N+1: ett DB-oppslag og ett HTTP-kall per relatert topic |
| RY-05 | Lav | `auth_repository.memberships`, `membership_routes.py:48` | Henter alle kolonner / paginerer gjennom alt for å finne én rad |
| RY-06 | Lav | `tests/fixtures/supabase_dobbel.py` | Dobbelen etterlikner PostgREST-semantikk etter hukommelsen |
| RY-07 | Lav | `models/sak_state.py:637`, `timeline_service.py:1122` | KR-09 ble lukket mot navnet, ikke mot identiteten |

---

## RY-01 — `sak_metadata` er projeksjonen, men spørsmålene går til journalen

**Middels.** Det gjennomgående mønsteret, og det eneste med reell
arkitekturvekt. Tre spørsmål stilles til den append-only hendelsesloggen
enda `sak_metadata` er projeksjonen som finnes for å svare på dem:

| Spørsmål | Spørres i dag | Autoriteten |
| --- | --- | --- |
| Hvilke saker finnes? | `get_all_sak_ids` — én rad per *hendelse* | `sak_metadata.sak_id` (primærnøkkel) |
| Hvilken sak har denne topicen? | `find_sak_id_by_catenda_topic` | `sak_metadata.catenda_topic_id` |
| Hvilken type er saken? | `avslatte_fristkrav`-heuristikk i backfillen | `sak_metadata.sakstype` |

Forbrukerne har allerede det de trenger:
`endringsordre_service.py:111-116` foretrekker
`metadata_repository.list_all(prosjekt_id=...)` og bruker `get_all_sak_ids`
bare som fallback. `forsering_service` *har* `self.metadata_repository`
(satt `:70`, brukt `:548`) og ignorerer den i skannet på `:471`.
`list_by_sakstype("forsering", prosjekt_id=...)` ville gitt både
prosjektgrensen og sakstypen i én spørring, og gjort `tillatte_saker`-filteret
på `:475` overflødig.

**Dette lukker også KR-13.** Backfillen mistet typefilteret sitt i MS-01;
`list_by_sakstype` gir det tilbake fra autoriteten framfor fra en heuristikk.

Gjøres flyttingen, kan `get_all_sak_ids` slettes — og med den
`lib/helpers/sak_lookup.py:104-131`, som `hasattr`-gjetter mellom
`list_all_sak_ids` og `get_all_sak_ids` (TST-06-xfailen).

**Hvorfor ikke gjort:** det er en atferdsendring på tvers av tre tjenester og
et skript, og KR-rundens mandat var rettinger i det som var gjennomgått.

**Én ting må avklares først, og den er ikke som den ser ut:**
`sak_metadata.catenda_topic_id` har **ingen indeks**. Se «Avvist påstand».

## RY-02 — offsetpaginering

**Lav.** `lib/supabase/paginering.py` bruker `range(start, slutt)`, som
PostgREST oversetter til `OFFSET`. Side *k* tvinger serveren til å gå gjennom
og forkaste `k × 500` indekstupler; samlet O(M²/500).

Keyset ville vært konstant per side: behold `.order("id")`, hent `id` med, og
bruk `.gt("id", siste)` + `.limit(...)` framfor `.range(...)`. Det ville
fortsatt tålt at serveren gir færre rader enn bedt om.

**Hvorfor ikke gjort:** hjelperen er nettopp innført og deles av tre kallere;
formendringen bør gjøres når det finnes rader å måle på. Basen er tom i dag.

## RY-03 — navnebufferet vokser ubegrenset utenfor en forespørsel

**Lav.** KR-05 flyttet bufferet fra request- til app-konteksten. Per
webforespørsel er levetiden uendret — Flask skyver og popper app-kontekst per
request. Men begrunnelsen var bakgrunnsarbeid og skript, og der spenner én
`app.app_context()` typisk over hele prosessen: dicten vokser da over hver
`aktor_id` som er vist, og friskes aldri opp.

Den gamle docstringens garanti — «et navn som endres slår gjennom ved neste
visning» — holder altså ikke lenger i akkurat det tilfellet endringen siktet
på. En `functools.lru_cache(maxsize=…)` på modulnivå ville vært begrenset,
delt og uavhengig av kontekst, med `g` bare som bærer av den innloggedes navn.

**Hvorfor ikke gjort:** `lru_cache` endrer når et endret navn slår gjennom, og
hører sammen med KR-04 — som står åpen.

## RY-04 — N+1 rundt topic-oppslaget

**Lav.** `base_sak_service.py:122-135` kaller `find_sak_id_by_catenda_topic`
inne i løkka over relaterte topics, ved siden av
`client.get_topic_details(relatert_guid)`. Det gir N databaserundturer og N
HTTP-kall per forespørsel.

KR-02 gjorde hvert enkelt kall langt billigere, men fjernet ikke løkka. Ett
samlet oppslag — `.in_(...)` over GUID-ene, og mapping i Python — ville gjort
det til én rundtur.

## RY-05 — uttrekk som henter mer enn de trenger

**Lav.** To steder i samme familie som KR-11:

- `auth_repository.memberships` går gjennom `all_rows` med `columns="*"`:
  alle kolonner på alle medlemskapsrader. Kallerne
  (`auth_service.py:219`, `membership_routes.py:74`) bruker en håndfull felter.
- `membership_routes.py:48` paginerer gjennom hele `catenda_project_configs`
  via `repo.configs()` for å finne én rad, mens
  `auth_repository.project_config(project_id)` er nøyaktig det indekserte
  enkeltoppslaget. Direkte analog til KR-11.

## RY-06 — dobbelen etterlikner PostgREST etter hukommelsen

**Lav.** `tests/fixtures/supabase_dobbel.py` fikk `range()` og `->>` fordi
produksjonskoden begynte å bruke dem. Fire tester dekker dem nå
(`tests/test_repositories/test_lageruttrekk.py`), så tillegget er ikke lenger
udekket — men semantikken er gjenskapt fra hukommelsen: `str()`-tvangen av en
JSON-verdi, `None` for manglende nøkkel, og at `range` avkorter før `limit`.
Hvert av dem er et sted dobbelen kan være *enig med testen og uenig med
serveren*.

Dobbelens egen docstring advarer mot nettopp den feilklassen for kolonnesettet.
Den gjelder nå også filtersemantikken.

Et bedre grep: `FakeSupabaseClient` logger allerede `brukte_tabeller` for at en
test skal kunne slå fast *hva koden ba om* (MS-01). Utvides den loggen til
filtre, `range` og `limit`, kan lagertestene hevde spørringsformen framfor
hvilke rader et hjemmelaget PostgREST ville gitt. Da kan `_felt` og
`_range`-plukkingen slettes.

## RY-07 — KR-09 ble lukket mot navnet, ikke mot identiteten

**Lav, men den peker framover.** KR-09 hadde to representasjoner av
`utstedt_av`: en UUID i opprettelsessvaret og et navn i state. Rettingen
slettet UUID-en — altså den representasjonen MS-04 peker mot («journalen bærer
`aktor_id`, aldri et personnavn») — og beholdt navnet.

Valget var riktig for *denne* runden: opprettelsessvarets felt hadde ingen
leser, og å legge navneoppslag tilbake i en skrivesti er uttrykkelig forbudt i
handoff 21.09. Men konsekvensen er at `models/sak_state.py:637` nå uimotsagt
sier «Navn på person som utstedte EO», og at
`tests/test_services/test_endringsordre_service.py:157` består fordi oppslaget
faller tilbake til identiteten.

Når KR-04 gjøres — navnet løses ved svargrensen — må feltet, beskrivelsen og
testen snus. Det er billigere å vite det nå enn å oppdage det da.

---

## Avvist påstand

**«Den nye indeksen på `hendelse` duplikerer et billigere hjem, fordi
`sak_metadata.catenda_topic_id` allerede har `idx_sak_metadata_catenda_topic`.»**

To av de fire gjennomgangene konkluderte slik, uavhengig av hverandre. **Den
indeksen finnes ikke.** Katalogspørring mot prosjektet gir tre indekser på
`sak_metadata`: `sak_metadata_pkey` (`sak_id`) og `idx_sak_metadata_prosjekt`
(`prosjekt_id`) — og ingen på `catenda_topic_id`.

Påstanden kom av å lese migrasjonsfiler i stedet for å spørre katalogen, som er
den dokumenterte årsaken til feilklassifiseringer i denne serien. Den er verdt
å ha skrevet ned, fordi den snur konklusjonen i RY-01: flyttes topic-oppslaget
til `sak_metadata`, må den tabellen indekseres først — ellers byttes en
indeksert spørring mot en sekvensiell.

---

## Verifikasjon og grenser

**Kjørt og observert**

- Backend: **1488 passed, 9 skipped, 42 xfailed**. `ruff check backend/` rent.
- Frontend: `npm run check:error` **0 errors** over 4844 filer; `npm test`
  **590 tester**.
- **Migrasjonssettet bygget fra tomt.** 21 filer, ren `sort`-rekkefølge, mot en
  kastbar PostgreSQL 16.13 med Supabase-plattformen stubbet (rollene `anon`,
  `authenticated`, `service_role`; skjemaet `auth` med `users`, `auth.role()`
  og `auth.email()`; `GRANT ALL … TO service_role` pluss default privileges).
  Null feil, 18 tabeller. Katalogen er identisk med prosjektets på fem snitt:

  | Snitt | md5 |
  | --- | --- |
  | Kolonner | `800f137a373d76ca933f81d232fd03a6` |
  | Skranker | `2f8a3112c03b641e5312173273b8135c` |
  | Indekser | `9b86e55a9a527a857483d72b410a4f7c` |
  | Policyer | `117cdb62a9661c8968b6fb042f492c27` |
  | Rettigheter | `0ccf95d54ad136732c9a05cad7b18f37` |

  **Ikke sammenliknbare med tidligere summer** — spørringene er skrevet på nytt.
  Rettighetssnittet er avgrenset til `anon`, `authenticated` og `service_role`,
  fordi plattformens øvrige roller ikke finnes i stubben.

**Lest ut av koden, ikke observert**

- Kostnadsanslagene i RY-02, RY-04 og RY-05. Ingenting er målt; basen er tom.
- RY-03s ubegrensede vekst er utledet av `g`-semantikken, ikke framkalt i en
  langtlevende prosess.

**Ikke kontrollert**

- Ingen av RY-funnene har en reproduksjonstest.
- RLS-policyene er ikke gjennomgått på nytt. Summen over viser at de er de
  samme som prosjektets, ikke at de er riktige.
- Funksjoner og triggere inngår **ikke** i de fem snittene. At alle ti
  funksjoner og fem triggere finnes i repoet, er kontrollert ved navn mot
  `pg_proc` og `pg_trigger` — ikke ved å sammenlikne kroppene deres.
