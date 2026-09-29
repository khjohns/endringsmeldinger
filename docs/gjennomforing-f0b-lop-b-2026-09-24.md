# Gjennomføring: saksmetadata, relasjoner og BIM over direkte tilkobling (F0b, løp b)

**Dato:** 2026-09-24, levert 2026-09-29. **Utgangspunkt:** `main` på
`0de5244` (etter PR #42 og #59), rebaset på `4b28cf7`. Gren: `f0b-lop-b-sak-relasjon-bim`. **Issue:** #56.
**Oppdrag:** [løp b i oppdraget for fase 2](prompt-f0b-fase2-repositorier-2026-09-24.md#løp-b-saksmetadata-relasjoner-og-bim).
**Forrige ledd:** [gjennomføringsnotatet for kjernen](gjennomforing-f0b-kjernen-2026-09-23.md),
avsnitt 2, 4, 7 og 8, og [hovedplanen, F0b](plans/2026-09-16-godkjenning-og-varig-levering.md#f0b--datalaget-over-direkte-tilkobling).

Løpet legger til tre lagre over `lib/db` og en testfil. Ingenting annet er
endret: ikke `core/container.py`, `repositories/__init__.py`, `lib/db/`,
fixturene, de gamle lagrene eller kallerne. Hovedplanen og `docs/README.md` får
sin merknad samlet når alle fire løp er inne (#49).

## 1. Hva som er levert

| Fil | Innhold |
| --- | --- |
| [`backend/repositories/postgres/sak_metadata.py`](../backend/repositories/postgres/sak_metadata.py) | `PostgresSakMetadataRepository`, erstatter `SupabaseSakMetadataRepository` |
| [`backend/repositories/postgres/relasjon.py`](../backend/repositories/postgres/relasjon.py) | `PostgresRelationRepository`, erstatter `RelationRepository` |
| [`backend/repositories/postgres/bim.py`](../backend/repositories/postgres/bim.py) | `PostgresBimLinkRepository`, erstatter `BimLinkRepository` |
| [`backend/tests/test_database/test_sak_relasjon_bim.py`](../backend/tests/test_database/test_sak_relasjon_bim.py) | 37 tester mot testbasen, merket `database` |

Containeren velger klassene med `DATALAG=postgres` gjennom `POSTGRES_LAGRE`,
som allerede navnga modulene. `test_containeren_gir_lagrene_over_samme_database`
viser at alle tre får `container.database`.

## 2. Metodene

Kallerne ble funnet ved søk etter hvert metodenavn i `routes/`, `services/`,
`lib/`, `core/`, `integrations/` og `scripts/`, uten avkutting. Søket tok med
`TrackingMetadataRepository` i `core/unit_of_work.py`, som sender `create`,
`delete`, `get` og `update_cache` videre, og alt annet gjennom `__getattr__`.
**Kalles** betyr her: kalles på lageret containeren gir. Fem steder lager
lageret selv med de gamle fabrikkene. De når aldri PostgreSQL-klassene og er
meldt som #70.

| Lager | Metode | Kalles fra | Status |
| --- | --- | --- | --- |
| Metadata | `create`, `delete`, `get` | unit of work, `sak_creation_service`, `endringsordre_service`, `project_access`, `integrations/catenda/auth.py`, ruter | Implementert |
| Metadata | `update_cache` | `event_routes`, `forsering_routes`, `approval_routes`, unit of work, `scripts/backfill_reporting_cache.py` | Implementert |
| Metadata | `get_by_topic_id` | `forsering_service`, `lib/helpers/sak_lookup.py` | Implementert |
| Metadata | `set_catenda_mapping` | `endringsordre_service` | Implementert |
| Metadata | `list_all` | `endringsordre_service`, `event_routes`, `backfill_reporting_cache.py` (`alle_prosjekter=True`) | Implementert |
| Metadata | `list_by_sakstype` | `event_routes` (`/api/cases?sakstype=`, AUT-04, TST-01) | Implementert |
| Metadata | `probe` | `utility_routes` (helsesjekken) | Implementert |
| Metadata | `exists`, `count_by_sakstype` | Ingen | Ikke skrevet |
| Metadata | `upsert` | Bare `scripts/create_test_sak.py`, som bruker fabrikken (#70) | Ikke skrevet |
| Relasjon | `add_relation`, `add_relations_batch`, `remove_relation` | `endringsordre_service`, `forsering_service` | Implementert |
| Relasjon | `get_containers_for_sak` | `forsering_service` | Implementert |
| Relasjon | `get_related_saks` | Ingen | Ikke skrevet |
| Relasjon | `get_all_relations`, `clear_all_relations` | Bare `scripts/backfill_relations.py`, som bruker fabrikken (#70) | Ikke skrevet |
| BIM | `get_links_for_sak`, `create_link`, `delete_link`, `get_cached_models` | `routes/bim_link_routes.py` | Implementert |
| BIM | `upsert_cached_models` | Ingen | Ikke skrevet |

`get_all_relations` og `clear_all_relations` leser og sletter i alle
prosjekter uten filter. De skrives ikke før et skript trenger dem gjennom
containeren, og da med et eksplisitt prosjekt (#70).

## 3. Valg og avvik fra Supabase-lageret

Valgene under er gjort i løpet, ikke vedtatt av oppdragsgiver. Hvert av dem
kan snus uten å røre noe annet enn lagerfila og testen.

**Relasjonene er avgrenset til prosjektet ved lesing og skriving.**
Supabase-lageret stemplet `prosjekt_id` ved skriving, men leste og slettet på
saks-ID alene. Her:

- `add_relation` og `add_relations_batch` stempler med
  `krev_autorisert_prosjekt`, som før.
- `get_containers_for_sak` leser bare rader med
  `prosjekt_id = get_project_id()`, og slår sammen med `sak_metadata` slik at
  også *kildesaken* må høre til prosjektet. Stempelet alene er ikke nok: en
  relasjon fra en sak i et annet prosjekt, skrevet i vår kontekst, bærer vårt
  prosjekt. En kilde uten saksmetadata kommer heller ikke med. Uten prosjekt:
  tom liste, som `list_all`. `forsering_service` filtrerer fortsatt resultatet
  gjennom `cases_in_project` (AUT-02). Den grensen er urørt.
- `remove_relation` sletter bare i det autoriserte prosjektet. Uten prosjekt:
  `PermanentError`.

**En eksisterende relasjon beholder prosjektet sitt.** Supabase-lageret brukte
`upsert` på `(source_sak_id, target_sak_id, relation_type)`, og en ny skriving
av samme relasjon under et annet prosjekt flyttet raden dit. Her er det
`ON CONFLICT … DO NOTHING`. Unik-nøkkelen har ikke `prosjekt_id`, og uten
dette kunne en relasjon skrevet i ett prosjekt stjele raden fra et annet
(`test_en_eksisterende_relasjon_flyttes_ikke_til_et_annet_prosjekt`).
Returverdien er antall rader som faktisk ble satt inn, og `add_relation` gir
`True` bare når raden er ny. Supabase-lageret ga alltid `True` og antall
oppgitte mål. Ingen kaller bruker verdien.

Følgen er at den første skriveren eier prosjektet til en relasjon. En rad som
en gang er stemplet feil, kan ikke rettes gjennom lageret: den er usynlig og
kan ikke fjernes fra det riktige prosjektet. Det er valgt med vilje. Å stemple
på nytt ved skriving er nettopp veien en relasjon kunne flyttes til et annet
prosjekt, og retting av feilstemplede rader er en datarettelse, ikke en
lagermetode.

**Relasjonslageret kaster.** Supabase-lageret pakket hvert kall i
`safe_execute` og ga `False`, `0` eller `[]` ved enhver feil, også når
prosjektet manglet i `add_relation`. Her går feilene ut som `DatalagFeil`
fra kjernen. Alle fire skrivekallene, i `endringsordre_service` og
`forsering_service`, fanger `Exception` og logger. Den eneste
lesekalleren går gjennom `safe_find_related` i `routes/related_cases_utils.py`,
som gjør ethvert unntak til `200` med tom liste. For ruta er utfallet derfor det
samme. Forskjellen er at feilen nå er logget som feil i ruta, ikke gjemt i
lageret.

**BIM-koblingene er avgrenset gjennom saken.** `sak_bim_links` har ingen
`prosjekt_id`. Hver spørring slår sammen med `sak_metadata` og krever
`prosjekt_id = get_project_id()`:

- `get_links_for_sak` gir tom liste for en sak i et annet prosjekt, og uten
  prosjekt.
- `create_link` setter inn med `INSERT … SELECT … FROM sak_metadata WHERE
  sak_id = %s AND prosjekt_id = %s`. En sak utenfor prosjektet, eller som ikke
  finnes, gir `NotFoundError`. Uten prosjekt: `PermanentError` fra
  `krev_autorisert_prosjekt`. Supabase-lageret satte inn for enhver sak som
  fantes.
- `delete_link` sletter bare i prosjektet, og bare i saken når den er oppgitt.
  Ruta oppgir den alltid (RV-07). Uten prosjekt: `PermanentError`.

`require_project_access` gjorde den samme kontrollen for rutene fra før.
Med `dev_auth_disabled` og uten `X-Project-ID` gir BIM-rutene nå tom liste
eller feil, der Supabase-lageret svarte.

**Topic-oppslaget er avgrenset til prosjektet.** `get_by_topic_id` leser bare
saker med `prosjekt_id = get_project_id()`, og gir `None` uten prosjekt.
Supabase-lageret slo opp på topic alene. De to kallerne gjennom containeren,
`forsering_service.hent_kandidat_koe_saker` og `lib/helpers/sak_lookup.py`,
gjør Catenda-topics om til saker uten selv å kontrollere prosjektet. Løp a
avgrenset sitt topic-oppslag (`find_sak_id_by_catenda_topic`) på samme måte.
Webhooktjenesten slår også opp på topic, men med lageret fra fabrikken (#70);
når den flyttes til containeren, trenger den prosjektkontekst, som #66 uansett
krever.

**Resten av saksmetadataene følger Supabase-lageret.** `get`, `update_cache`
og `delete` går på saks-ID alene, uten prosjektfilter. Det er bevisst:

- `get` er oppslaget `require_project_access` og `cases_in_project` bruker for
  å *finne* sakens prosjekt. Det kan ikke selv kreve et prosjekt.
- `update_cache` kalles av `backfill_reporting_cache.py` utenfor en
  forespørsel, og har flere skrivere (MS-06). Atferden holdes, som oppdraget
  sier.
- `delete` kalles av unit of work ved tilbakerulling. Slettingen går videre til
  `hendelse`, `notat`, `magic_links` og `sak_bim_links` gjennom
  `ON DELETE CASCADE`, som i Supabase-basen.

`list_all` og `list_by_sakstype` krever et prosjekt, oppgitt eller fra
konteksten, og gir tom liste uten. `list_all(alle_prosjekter=True)` uten
prosjekt gir alle, som før; det er et eksplisitt valg, ikke et tomt filter.
Supabase-lagerets `list_by_sakstype` sendte `prosjekt_id=eq.None` til PostgREST
uten prosjekt. Her er det en tom liste før spørringen.

`get_by_topic_id` sorterer på `created_at, sak_id` før `LIMIT 1`, så svaret er
det samme hver gang om to saker i prosjektet skulle ha samme topic. Supabase-lageret hadde
ingen rekkefølge. Listene har `sak_id` eller `id` som siste sorteringsnøkkel av
samme grunn.

**Et tidspunkt uten sone lagres som UTC.** Supabase-basen går i UTC og tolket
en ISO-streng uten sone slik. Over direkte tilkobling ville PostgreSQL tolket
den i øktens tidssone. `_utc` legger på UTC før skriving av `created_at` og
`last_event_at`.

**Feilklassene** kommer fra kjernen: en sak eller BIM-kobling som finnes fra
før, gir `ConflictError`; `NOT NULL`- og `CHECK`-brudd gir `ValidationError`.
Begge er `PermanentError`. `set_catenda_mapping` kaster `NotFoundError` som før.
Ingen av tabellene har versjon, så `ConcurrencyError` er ikke aktuell.

**`sak_relations` har fortsatt ingen fremmednøkler** (DB-04, venter på B-01).
Lageret kontrollerer heller ikke at kilde og mål finnes i `sak_metadata`; det
ville vært samme beslutning i en annen form.

## 4. Reglene fra oppdraget

- **Transaksjon:** lesing med `transaksjon(Kontekst())`, skriving med
  `utfor(Kontekst(), …)`. Ingen `@with_retry()`, ingen transaksjonsstyring.
  Ingen skrivefunksjon returnerer markøren; den holder forbindelsen. Tekstvakten
  `test_postgres_transaksjonsgrense.py` er grønn for de tre filene.
- **Prosjekt:** søkt med `grep` i de tre modulene etter `or "`, `getattr(`,
  `.get(`, `headers.get`, defaultargumenter, `DEFAULT` og `oslobygg`. De eneste
  treffene er `prosjekt_id or get_project_id()` i `list_all` og
  `list_by_sakstype`, som faller tilbake til den autoriserte konteksten og
  ikke til en verdi, og defaultargumentene `prosjekt_id=None`,
  `relation_type=None`, `sak_id=None` og cachefeltene. Ingen av dem gir et
  prosjekt.
- **SQL:** alle verdier er parametre. Kolonnenavn går gjennom
  `sql.Identifier` fra faste lister: modellfeltene i `SakMetadata`, `BimLink`,
  `BimLinkCreate` og `CatendaModelCache`, og nøklene i `update_cache`.
  Rundturtesten bruker en saks-ID med `'; DROP TABLE`.
- **Lesing uten prosjekt** gir tom liste eller `None`, skriving
  `PermanentError`. Unntakene er `get`, `update_cache` og `delete` (avsnitt 3).
- **`list_by_sakstype`** finnes (AUT-04, TST-01), og testes også gjennom
  containeren.
- **`cached_*`-kolonnene:** `update_cache` skriver bare feltene som er oppgitt,
  som før (MS-06).

## 5. Regler prøvd røde

Hver regel ble fjernet i en kastbar kopi av `backend/`, én om gangen, og
testfila kjørt uten `-x`. Filtrene er byttet med `%s::text IS NOT NULL`, så
parameterantallet er det samme og testen feiler på atferd, ikke på SQL-en.
Kopien ble gjenopprettet mellom hver, og var grønn til slutt (37 bestått).

| Mutasjon | Fanget av |
| --- | --- |
| M01 `list_by_sakstype` fjernet | `test_sakstype_er_avgrenset_til_prosjektet`, `test_sakslisten_per_sakstype_gaar_gjennom_containeren` |
| M02 `list_all` uten kontekst gir alle | `test_listen_uten_prosjekt_er_tom` |
| M03 `list_by_sakstype` uten prosjektfilter | de samme to som M01 |
| M04 `set_catenda_mapping` uten prosjektfilter | `test_catenda_mapping_skrives_bare_i_sakens_prosjekt` |
| M05 `update_cache` skriver også `None` | `test_cachen_oppdaterer_bare_oppgitte_felt` |
| M06 Tidspunkt uten sone lagres uten UTC | `test_tidspunkt_uten_sone_lagres_som_utc` og cachetesten |
| M07 Relasjon skrives med `get_project_id() or "oslobygg"` | begge `test_skriving_uten_autorisert_prosjekt_avvises` |
| M08 `ON CONFLICT` flytter prosjektet (Supabase-atferden) | `test_en_eksisterende_relasjon_flyttes_ikke_til_et_annet_prosjekt`, `test_samme_relasjon_to_ganger_gir_en_rad` |
| M09 Baklengs oppslag uten filter på relasjonens prosjekt | `test_relasjon_til_sak_i_annet_prosjekt_utvider_ikke_tilgangen` |
| M10 `remove_relation` uten prosjektfilter | `test_fjerning_er_avgrenset_til_prosjektet` |
| M11 `remove_relation` uten prosjektkrav | begge `test_skriving_uten_autorisert_prosjekt_avvises` |
| M12 BIM-lesing uten prosjektfilter | `test_koblinger_leses_bare_i_sakens_prosjekt` |
| M13 BIM-kobling uten kontroll av sakens prosjekt | `test_kobling_til_sak_utenfor_prosjektet_avvises` |
| M14 BIM-sletting uten sak | `test_sletting_er_avgrenset_til_sak_og_prosjekt` |
| M15 BIM-sletting uten prosjekt | samme |
| M16 BIM-kobling uten prosjektkrav | `test_kobling_til_sak_utenfor_prosjektet_avvises` |
| M17 Modellcachen uten prosjektfilter | `test_modellcachen_er_avgrenset_til_prosjektet` |
| M18 Baklengs oppslag uten kontekst leser et fast prosjekt | begge `test_baklengs_oppslag_uten_prosjekt_er_tomt` |
| M19 BIM-sletting uten prosjektkrav | `test_sletting_er_avgrenset_til_sak_og_prosjekt` |
| M20 Topic-oppslag uten prosjektfilter | `test_topic_slaas_opp_bare_i_det_autoriserte_prosjektet` |
| M21 Topic-oppslag uten kontekst leser et fast prosjekt | samme |
| M22 Baklengs oppslag uten filter på kildesakens prosjekt | `test_relasjon_til_sak_i_annet_prosjekt_utvider_ikke_tilgangen` |
| M23 Baklengs oppslag uten sammenslåing med `sak_metadata` | samme, og `test_baklengs_oppslag_ser_bare_det_autoriserte_prosjektet` |
| M24 Antall oppgitte mål i stedet for antall satt inn | `test_samme_relasjon_to_ganger_gir_en_rad`, `test_en_eksisterende_relasjon_flyttes_ikke_til_et_annet_prosjekt` |

**M16 var grønn i første runde.** Uten prosjekt stanset SQL-betingelsen mot
`sak_metadata` innsettingen likevel, som `NotFoundError`, og testen godtok
enhver `PermanentError`. Testene krever nå meldingen fra
`krev_autorisert_prosjekt`, så de viser at det er prosjektkravet som avviser,
ikke at saken mangler. M16 er kjørt på nytt og står slik over.

**Ikke prøvd rødt:** vernet mot tomt prosjekt i `get_cached_models`,
`get_links_for_sak` og `get_containers_for_sak` (`if not prosjekt: return []`),
for `None` og `''`.
Uten det sammenlikner SQL-en med `NULL` eller `''` og gir heller ingen rader,
så ingen test kan skille dem. Det er filteret som bærer regelen, og det er prøvd
(M09, M12, M17, M22).

## 6. Kolonnene i prosjektet

Katalogen i prosjektet `endringsmeldinger` ble lest 24.09 med én lesende
katalogspørring over MCP, uten saksdata. Den samme spørringen ble kjørt mot
testbasen. `md5` over kolonner (navn, type, nullbarhet, default og identitet),
skranker (`contype <> 'n'`), indekser og triggere for `sak_metadata`,
`sak_relations`, `sak_bim_links` og `catenda_models_cache` **var like på begge
sider**. Ingen avvik å rapportere. Rettigheter er ikke tatt med i summen.

## 7. `/code-review`

Kjørt på `high` mot `08acecf`. Funnene er ikke verifisert hver for seg av
reviewet; vurderingen under er løpets.

| Funn | Utfall |
| --- | --- |
| `get_containers_for_sak` avgrenser på stempelet, ikke på kildesakens prosjekt | Rettet: sammenslåing med `sak_metadata` (avsnitt 3, M22, M23) |
| `add_relation` og `add_relations_batch` melder suksess når `DO NOTHING` ikke skrev noe | Rettet: antall satt inn (M24) |
| En feilstemplet relasjon kan ikke rettes gjennom lageret | Beholdt med vilje (avsnitt 3) |
| `get`, `update_cache` og `delete` uten prosjektfilter | Beholdt (avsnitt 3). Kalleren reviewet nevner, `integrations/catenda/auth.py`, bruker `get` for å *finne* sakens prosjekt, som `require_project_access` |
| Én transaksjon per ID i `cases_in_project` og topic-oppslagene | Ikke endret. Supabase-lageret gjorde ett HTTP-kall per ID. Et samlet oppslag endrer grensesnittet; tas i `/simplify` eller F2 (#49) |
| Vernet mot tomt prosjekt gjentas per metode, og `Kontekst()` bærer ikke prosjektet | Ikke endret. Løp a gjør det samme; samles i `/simplify` (#49). Kravene i `Kontekst` hører til F1 |
| Kolonnelister og lesemønster gjentas i tre filer | Ikke endret; `/simplify` (#49) |
| Utgangspunktet i åpningen var `0de5244`, ikke `4b28cf7` | Rettet |

## 8. Oppfølging

- **#70:** fem kallere lager saksmetadata- eller relasjonslageret med de gamle
  fabrikkene, ikke gjennom containeren. Viktigst er `CatendaWebhookService`:
  med `DATALAG=postgres` skriver den saksmetadata til det gamle lageret, mens
  hendelsene går til PostgreSQL. *Lest ut av koden, ikke kjørt.* Samme fil er
  flaten for #66.
- Løp a kaster `PermanentError` ved lesing uten prosjekt. Her gir lesing uten
  prosjekt tom liste, fordi `list_all` har den kontrakten fra før og
  relasjons- og BIM-lesingene følger den. De to formene bør samles i
  `/simplify` (#49).

## Verifikasjon og grenser

**Kjørt og observert 24.09 og 29.09:** macOS 26.2, Python 3.11.9, pytest 9.0.2,
PostgreSQL 17 (Homebrew, `postgresql@17`), psycopg 3.3.6. Kastbar testbase på
port 54332 (`$TMPDIR/koe-testbase-b`), bygget fra tom av `lokal_testbase.sh`
med alle 23 migrasjoner. macOS ryddet klyngen under `$TMPDIR` mellom de to
dagene; den ble bygget på nytt fra tom 29.09, og tallene under er derfra.

- `tests/test_database/test_sak_relasjon_bim.py`: 37 bestått.
- `tests/test_database/`: 96 bestått, 1 xfailed (RK-04). Før løpet: 59 bestått
  og 1 xfailed.
- Hele backend med testbasen, på `4b28cf7` pluss grenen: **1782 bestått,
  9 hoppet over, 42 xfailed**. Uten `KOE_TESTBASE_URL`: 1686 bestått,
  106 hoppet over, 41 xfailed.
- `ruff check backend/`: ingen feil. `docs/verktoy/lenkekontroll.py` på notatet:
  ingen brutte lenker eller ankre.
- 24 av 24 mutasjoner ga rød test (avsnitt 5), på koden etter `/code-review`.

**Lest ut av koden, ikke kjørt:** kallerlista i avsnitt 2, at
`safe_find_related` gjør et unntak fra relasjonslageret til tom liste, og
webhookstien i #70.

**Ikke kontrollert:**

- Ruter og tjenester over `DATALAG=postgres` ende til ende. De trenger
  hendelseslageret fra løp a. `cases_in_project` og `list_by_sakstype` er
  testet gjennom containeren; `ForseringService` og BIM-rutene er ikke.
- Samtidige skrivere til `cached_*` (MS-06). Siste skriver vinner per kolonne,
  som før; det er ikke prøvd.
- PgBouncer og Supavisor.
- Ytelse. Ingen spørreplan er lest. Hvert oppslag er én transaksjon, også i
  løkkene i `cases_in_project` og topic-oppslagene (avsnitt 7). `get_by_topic_id` har ingen indeks på
  `catenda_topic_id`, i testbasen eller i prosjektet.
- At `@with_retry()` mangler, er ikke prøvd rødt. Regelen holdes ved lesing og
  review.
- Rettighetene på de fire tabellene er ikke sammenliknet.
- Ingen kall mot Supabase-prosjektet utover katalogspørringen i avsnitt 6.
