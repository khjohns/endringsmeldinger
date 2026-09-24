# Gjennomføring: journalen og notatene over direkte tilkobling (F0b, løp a)

**Dato:** 2026-09-24. **Utgangspunkt:** `main` på `0de5244` (etter PR #42 og
#59). Gren: `f0b-lop-a-hendelse-notat`. **Issue:** #55.
**Oppdrag:** [løp a i oppdraget for fase 2](prompt-f0b-fase2-repositorier-2026-09-24.md#løp-a-hendelse-og-notat).
**Forrige ledd:** [gjennomføringsnotatet for kjernen](gjennomforing-f0b-kjernen-2026-09-23.md),
avsnitt 2, 4, 7 og 8, og [hovedplanen, F0b](plans/2026-09-16-godkjenning-og-varig-levering.md#f0b--datalaget-over-direkte-tilkobling).

Løpet legger til to lagre over `lib/db` og en testfil. Ingenting delt er endret:
ikke `core/container.py`, `repositories/__init__.py`, `lib/db/`, fixturene eller
de gamle lagrene. Hovedplanen og `docs/README.md` får sin merknad samlet når
alle fire løp er inne (#49).

## 1. Hva som er levert

| Fil | Innhold |
| --- | --- |
| [`backend/repositories/postgres/hendelse.py`](../backend/repositories/postgres/hendelse.py) | `PostgresEventRepository`, erstatter `SupabaseEventRepository` |
| [`backend/repositories/postgres/notat.py`](../backend/repositories/postgres/notat.py) | `PostgresNotatRepository`, erstatter `SupabaseNotatRepository` |
| [`backend/tests/test_database/test_hendelse_og_notat.py`](../backend/tests/test_database/test_hendelse_og_notat.py) | 32 tester mot testbasen, merket `database` |

Containeren velger klassene med `DATALAG=postgres` gjennom `POSTGRES_LAGRE`,
som allerede navnga modulene. Testen
`test_containeren_gir_lagrene_over_samme_database` viser at begge får
`container.database`.

## 2. Metodene

Kallerne ble funnet ved søk i `routes/`, `services/`, `lib/`, `core/` og
`scripts/`, også gjennom `TrackingEventRepository` i `core/unit_of_work.py`, som
sender `append`, `append_batch` og `get_events` videre.

| Lager | Metode | Kalles fra | Status |
| --- | --- | --- | --- |
| Hendelse | `append`, `append_batch` | ruter, `sak_creation_service`, `approval_service`, unit of work, `scripts/create_test_sak.py` | Implementert |
| Hendelse | `get_events` | ruter og tjenester, blant annet `approval_service`, `forsering_service`, `endringsordre_service` | Implementert |
| Hendelse | `gjeldende_versjon` | `routes/event_routes.py` (etter lagret notat) | Implementert |
| Hendelse | `get_all_sak_ids` | `lib/helpers/sak_lookup.py`, `scripts/backfill_relations.py` | Implementert |
| Hendelse | `find_sak_id_by_catenda_topic` | `services/base_sak_service.py` | Implementert |
| Hendelse | `get_events_by_type`, `get_events_as_cloudevents` | Ingen i kjøretidsstien. Den siste bare fra en test av Supabase-lageret | Ikke skrevet |
| Notat | `lagre`, `for_sak`, `slett` | `routes/event_routes.py` | Implementert |
| Notat | `hent` | Ingen | Ikke skrevet |

`hent` er abstrakt i `NotatRepository`. Derfor arver `PostgresNotatRepository`
ikke den abstrakte klassen. Containeren nevner typen bare under
`TYPE_CHECKING`, og ingen kode sjekker `isinstance`. Valget er oppdragsgivers
(avsnitt 3). `PostgresEventRepository` arver `EventRepository`, fordi alle
tre abstrakte metoder kalles.

## 3. Beslutninger og avvik fra Supabase-lageret

**Lesing er avgrenset til det autoriserte prosjektet.** Vedtatt av
oppdragsgiver 24.09. `get_events`, `gjeldende_versjon`, `get_all_sak_ids` og
`find_sak_id_by_catenda_topic` legger til `prosjekt_id = get_project_id()`.
Uten prosjekt kastes `PermanentError`, som for skriving. Supabase-lageret leste
på `sak_id` alene og lot grensen ligge i `require_project_access` og
`cases_in_project`. Den grensen står fortsatt; filteret er et lag til.
Følger:

- `get_all_sak_ids` gir sakene i ett prosjekt, ikke alle. Forserings- og
  EO-tjenestene avgrenset allerede etterpå (AUT-02), så resultatet er det samme.
- Versjonskontrollen i `append_batch` er *ikke* avgrenset. `(sak_id, versjon)`
  er unik på tvers av prosjekter, og kontrollen følger skranken
  (`test_versjonskontrollen_gjelder_saken_ikke_prosjektet`).
- Et skript som leser gjennom containeren, trenger prosjektkontekst.
  `scripts/backfill_relations.py` bygger i dag lageret selv med
  `create_event_repository()` og merker ingenting før #49 fjerner de gamle
  lagrene.

**Skriving stempler prosjektet som før**, med `krev_autorisert_prosjekt`. At
saken tilhører det prosjektet, kontrolleres av `require_project_access`, ikke
av lageret. Oppdragsgiver valgte bort en egen kontroll mot
`sak_metadata.prosjekt_id`.

**Bare versjonsskranken blir `ConcurrencyError`.** Supabase-lageret gjorde
*enhver* `ConflictError` ved innsetting til versjonskonflikt, også et brudd på
`event_id`-skranken. Her blir bare `unique_hendelse_sak_versjon` oversatt. Et
duplikat av `event_id` er ikke en versjonskonflikt, og en ny henting av saken
kan ikke rette det. Det forblir `ConflictError`, som er en `PermanentError`.
`ConcurrencyError` arver `ConflictError`, så kallere som fanger den brede
klassen, fanger begge.

**Tidsstempelet leveres som streng i UTC** (`…+00:00`), samme form som
Supabase-lageret normaliserte til. `event_id`, `referstoid` og notatets UUID-er
leses som tekst, slik modellene og kallerne forventer.

**`slett` tolker notat-ID-en som UUID før spørringen.** En ID som ikke er en
UUID, gir `False` og dermed 404, ikke en valideringsfeil fra basen. Store og
små bokstaver behandles likt, som i PostgREST.

## 4. Reglene fra oppdraget

- **Transaksjon:** lesing med `transaksjon(Kontekst())`, skriving med
  `utfor(Kontekst(), …)`. Ingen `@with_retry()`, ingen transaksjonsstyring i
  lagrene. Tekstvakten `test_postgres_transaksjonsgrense.py` er grønn for de to
  nye filene.
- **Versjonskonflikt:** versjonen leses inne i skrivetransaksjonen. Er den ikke
  den forventede, kastes `ConcurrencyError` før innsetting; det hindrer hull når
  forventet versjon er for høy. To skrivere som begge har lest samme versjon,
  stanses av unik-skranken, og den andre får `ConcurrencyError`.
- **Append-only:** journalen har ingen metode som endrer eller sletter, og
  modulen inneholder verken `UPDATE` eller `DELETE`.
- **`JournalfoeringAvvist`:** `krev_journalhendelser` kjøres før noe sendes til
  basen, uendret fra Supabase-lageret.
- **Notatet:** ligger i `notat` og flytter ikke sakens versjon. Hvert kall bærer
  sak og prosjekt, og `slett` også eieren. Et notat uten team avvises av
  modellen, og av basen hvis modellen omgås.

## 5. Regler prøvd røde

Hver regel ble fjernet i en kastbar kopi av `backend/`, én om gangen. Deretter
ble testfila kjørt uten `-x`. Alle 23 mutasjoner ga rød test, og kopien ble
gjenopprettet mellom hver. Mutasjonene i filtrene bytter kolonnen med
`%s::text IS NOT NULL`, så parameterantallet er det samme og testen feiler på
atferd, ikke på SQL-en. Et første forsøk uten `::text` feilet på typen til
parameteret; de radene er kjørt på nytt og står slik under.

| Mutasjon | Fanget av |
| --- | --- |
| M1 Ingen versjonskontroll før innsetting | `test_feil_forventet_versjon_gir_konflikt[3]` |
| M2 Unik-skranken oversettes ikke | begge `test_samtidig_*` |
| M3 Enhver unik-feil blir versjonskonflikt | `test_feil_midt_i_batchen_etterlater_ingenting` |
| M4 Ingen journalvakt | `test_internt_notat_journalfores_ikke` |
| M5 Skriving med `get_project_id() or "oslobygg"` | `test_skriving_uten_autorisert_prosjekt_avvises` |
| M6 Bare første rad i batchen settes inn | seks tester, blant dem `test_batch_gir_fortlopende_versjoner` |
| M7 Topic-oppslag uten typefilter | `test_topic_slaas_opp_bare_paa_sak_opprettet` |
| M8 `get_all_sak_ids` uten `DISTINCT` | `test_alle_sak_ids_teller_saker_ikke_hendelser` |
| M9 Journalen får en `slett` | `test_journalen_har_ingen_vei_til_endring_eller_sletting` |
| M10–M13 Hver av de fire lesingene uten prosjektfilter | `test_lesing_ser_bare_det_autoriserte_prosjektet` |
| M14 Lesing med `or "oslobygg"` | alle fire `test_lesing_uten_autorisert_prosjekt_avvises` |
| M15 Versjonskontrollen avgrenset til prosjektet | `test_versjonskontrollen_gjelder_saken_ikke_prosjektet` |
| N1 `for_sak` uten prosjektfilter | `test_notatene_er_avgrenset_til_sak_og_prosjekt` |
| N2 `for_sak` uten saksfilter | samme |
| N3 `for_sak` uten rekkefølge | `test_notatene_kommer_i_tidsrekkefolge` |
| N4 `slett` uten eier | `test_sletting_utenfor_grensene_gjor_ingenting[annen-forfatter]` |
| N5 `slett` uten prosjekt | `…[annet-prosjekt]` |
| N6 `slett` uten sak | `…[annen-sak]` |
| N7 Notat-ID sendes rått til basen | `test_ugyldig_notat_id_er_ikke_funnet` |
| N8 `lagre` skriver ingenting | ni tester |

**Samtidighetstestene** er deterministiske. Hver skriver har sin egen pool og
dermed sin egen forbindelse. En tredje forbindelse holder
`LOCK TABLE hendelse IN SHARE ROW EXCLUSIVE MODE`, som slipper lesingen av
versjonen gjennom, men stanser innsettingen. Testen venter til begge står i kø
i `pg_locks`, og slipper så låsen. Begge har da lest samme versjon. Det gjelder
både opprettelse av en ny sak (forventet versjon 0, TST-02 og KR-15) og en batch
mot en eksisterende versjon. Utfallet er én commit og én `ConcurrencyError`
med `actual` satt.

## 6. Kolonnene i prosjektet

Katalogen i prosjektet `endringsmeldinger` ble lest 24.09 med én lesende
katalogspørring over MCP, uten saksdata. Den samme spørringen ble kjørt mot
testbasen. `md5` over kolonner (navn, type, nullbarhet, default og identitet),
skranker (`contype <> 'n'`), indekser, triggere og rettigheter for `hendelse` og
`notat`, og kolonnene for `sak_metadata`, **var like på begge sider**. Ingen
avvik å rapportere.

## 7. Oppfølging

- Webhookstien stempler ikke prosjektet. Det gjelder også `SupabaseEventRepository`.
  `catenda_webhook_service` oppretter saken med `prosjekt_id` fra resolveren,
  men lagret stempler hendelsen fra `g.project_id`. Den settes fra
  `X-Project-ID`, som en webhook ikke sender. *Lest ut av koden, ikke kjørt:*
  hendelsen avvises da med `PermanentError`, og saken opprettes ikke.
  Tjenestetesten må vente på løp b (`sak_metadata`). Meldt som eget issue.
- `routes/catenda_webhook_routes.py` bygger et eget hendelseslager med
  `create_event_repository()`, utenom containeren. Tjenesten lagrer det, men
  bruker det ikke; opprettelsen går gjennom containeren. Hører til #49.

## Verifikasjon og grenser

**Kjørt og observert 24.09:** macOS 26.2, Python 3.11.9, pytest 9.1.1,
PostgreSQL 17.11 (Homebrew), psycopg 3.3.6, psycopg-pool 3.3.3, ruff 0.16.8.
Kastbar testbase på port 54331, bygget fra tom av `lokal_testbase.sh` med alle
23 migrasjoner.

- `tests/test_database/test_hendelse_og_notat.py`: 32 bestått.
- Hele backend med testbasen: **1768 bestått, 9 hoppet over, 42 xfailed**. Før
  løpet: 59 bestått og 1 xfailed i `tests/test_database`.
- `ruff check backend/`: ingen feil.
- 23 av 23 mutasjoner ga rød test (avsnitt 5).

**Lest ut av koden, ikke kjørt:** kallerlista i avsnitt 2, og følgene av
lesefilteret for tjenestene og skriptene i avsnitt 3 og 7.

**Ikke kontrollert:**

- Tjenester og ruter over `DATALAG=postgres`. De trenger saksmetadata og
  relasjoner fra løp b; lagrene er testet direkte, som oppdraget sa.
- CI. Jobben `database` er ikke kjørt for grenen ennå.
- PgBouncer og Supavisor.
- Ytelse. Lesingen av journalen går på `idx_hendelse_sak_id`, men ingen
  spørreplan er lest.
- At `@with_retry()` mangler, er ikke prøvd rødt. Dekoratøren prøver ikke
  `PermanentError` på nytt, og da blir ingen av testene røde av at den legges
  til. Regelen holdes ved lesing og review.
- Ingen kall mot Supabase-prosjektet utover katalogspørringen i avsnitt 6.
