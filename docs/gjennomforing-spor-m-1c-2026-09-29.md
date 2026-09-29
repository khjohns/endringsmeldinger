# Gjennomføring: relasjoner, ER-diagram og dataflyt mot Catenda (spor M, 1c)

**Dato:** 2026-09-29. **Commit:** grenen `claude/relasjoner-er-diagram-yvhekh`
over `main` på `45929ac`. Appen er ikke i produksjon og har ingen reelle data.
Alvorlighet angir mulig konsekvens under beskrevne forutsetninger, ikke
observert hendelse.

**Forrige ledd:** [oppdraget for spor M](prompt-datamodell-og-funksjonskart-2026-09-29.md),
fase 1c i avsnitt 3, og gjennomføringsnotatene for
[1a](gjennomforing-spor-m-1a-2026-09-29.md) og
[1b](gjennomforing-spor-m-1b-2026-09-29.md), som registrene følger mønsteret
til. [Catenda-dataflyten](catenda-dataflyt.md) beskriver målarkitekturen og
API-kontraktene; denne runden beskriver hva koden gjør i dag. Status for
funnene står i [hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md#4-funnregister).
Arbeidet følges i [#82](https://github.com/khjohns/endringsmeldinger/issues/82).

## 1. Hva som er levert

Med dette er datamodellen i fase 1 komplett, og regnearket kan sendes til IKT
([#90](https://github.com/khjohns/endringsmeldinger/issues/90)).

- [`datamodell/katalog.json`](datamodell/katalog.json): skjemaet slik
  katalogene viser det. PostgreSQL-delen er lest fra `pg_catalog` i testbasen
  bygget fra migrasjonene, med kolonner, primærnøkler, unike nøkler,
  fremmednøkler, funksjoner og triggere. SQLite-delen er lest fra
  `sqlite_master` etter at klassene som eier tabellene, har opprettet dem i en
  tom fil. [`verktoy/katalog.py`](verktoy/katalog.py) lager fila.
- [`datamodell/relasjoner.toml`](datamodell/relasjoner.toml): 54 relasjoner,
  15 fremmednøkler og 39 koblinger uten fremmednøkkel, med antall,
  beskrivelse og belegg. 15 kolonner som ser ut som nøkler uten å vise til en
  tabell, står med begrunnelse.
- [`datamodell/dataflyt.toml`](datamodell/dataflyt.toml): 20 flyter med 63
  piler mellom tabellene og Catenda. Hver pil har endepunktet og kallkjeden,
  fra der handlingen starter til klienten eller databasefunksjonen.
- [`datamodell/relasjoner.md`](datamodell/relasjoner.md), generert: to
  ER-diagrammer (PostgreSQL, og SQLite med tabellene i PostgreSQL det viser
  til), to flytdiagrammer (inn fra og ut til Catenda), relasjonene, flytene og
  en oversikt over hvilke tabeller som får data fra eller sender data til
  Catenda. Diagrammene er Mermaid og lages av
  [`verktoy/relasjoner.py`](verktoy/relasjoner.py) og
  [`verktoy/dataflyt.py`](verktoy/dataflyt.py).
- Regnearket har to nye ark, «Relasjoner» og «Dataflyt». Kolonne 7 i
  «Tabeller» lages nå fra relasjonsregisteret og katalogen, og kolonne 6 får
  flyt-ID-ene lagt til. Feltet `relasjoner` i `tabeller.toml` er fjernet;
  innholdet står i relasjonsregisteret eller følger av katalogen.

Testene i
[`test_relasjoner_og_dataflyt.py`](../backend/tests/test_datamodell/test_relasjoner_og_dataflyt.py)
feiler når:
- en fremmednøkkel i katalogen mangler oppføring, eller en oppføring med art
  «fremmednøkkel» ikke finnes i katalogen
- en kolonne som ser ut som en nøkkel eller en personreferanse, verken er med
  i en relasjon eller har en begrunnelse
- en tabell eller kolonne i registrene ikke finnes i katalogen
- et sted i backend kaller Catenda-klienten uten å stå som kode i en pil eller
  under `uten_flyt`
- en kodereferanse ikke er definert i fila, eller en databasefunksjon ikke
  finnes i katalogen
- SQLite-delen av katalogen ikke er skjemaet koden oppretter
- de genererte filene er utdaterte

[`test_katalog_json.py`](../backend/tests/test_database/test_katalog_json.py)
kjører i CI-jobben `database` og holder PostgreSQL-delen lik en base bygget fra
migrasjonene. En ny migrasjon gjør den røde til `katalog.py` er kjørt.

**Hvordan kallene til Catenda finnes.** Med AST, ikke med tekstsøk. En metode
i klientlaget (`integrations/catenda/`, `lib/auth/catenda_oauth.py` og
`services/catenda_service.py`) som selv gjør et HTTP-kall, eller kaller en som
gjør det, er et Catenda-kall. Hvert sted utenfor klientlaget som kaller en slik
metode, er et kallsted. `authenticate` og `ensure_authenticated` er unntatt,
fordi de bare henter et token. 29.09 er det 120 kallsteder, og 115 uten de som
bare autentiserer. Av dem står 33 i appen og driftsskriptene: 30 er piler i
dataflyten, og tre står under `uten_flyt` (to uten kaller, og visningen av team
i `catenda_admin.py`). De øvrige 82 er i utviklerskript, som står under
`uten_flyt` fil for fil.

**Oppdragsgivers svar 29.09,** gitt med spørsmålsverktøyet:

| Spørsmål | Svar |
| --- | --- |
| Hvordan skal IKT få ER-diagrammet og dataflyten? | Mermaid i `relasjoner.md`, som GitHub tegner, og to nye ark i regnearket. Ikke SVG eller bilde i Excel, som ville krevd Graphviz i CI |

## 2. Funn

| ID | Funn | Alvorlighet | Belegg |
| --- | --- | --- | --- |
| DM-08 | Fem kolonner viser til en person med navn eller e-post, ikke `app_users.id` | Foreløpig | L 29.09 |

### DM-08 — personreferanser uten identitet *(foreløpig)*

**Sted:** `vedlegg.lastet_opp_av` (`last_opp_vedlegg` i
[`vedlegg_routes.py`](../backend/routes/vedlegg_routes.py)),
`utkast.oppdatert_av` (`lagre_utkast` i
[`utkast_routes.py`](../backend/routes/utkast_routes.py)),
`sak_bim_links.linked_by` (`create_bim_link` i
[`bim_link_routes.py`](../backend/routes/bim_link_routes.py)),
`projects.created_by` (`koe_register_project` og `POST /api/projects`) og
`project_memberships.invited_by`.

**Lest ut av koden (L 29.09):**
- `vedlegg.lastet_opp_av` er navnet, ellers e-posten, ellers ID-en.
- `utkast.oppdatert_av` er e-posten, ellers navnet, ellers ID-en.
- `sak_bim_links.linked_by` er e-posten, ellers `unknown`.
- `projects.created_by` er `admin_cli` fra databasefunksjonen og e-posten i
  utviklingsmodus.
- `project_memberships.invited_by` er e-post, i en tabell som skal fjernes
  (MS-15).

Journalen bærer `app_users.id` og aldri et navn (`AGENTS.md`), og MG-04 gjelder
den samme blandingen i `sak_metadata.created_by`. Disse fem kolonnene er ikke
journalen, men de sier hvem som gjorde noe i en sak: hvem som lastet opp et
vedlegg, hvem som sist skrev i et utkast, hvem som koblet et BIM-objekt.

**Konsekvens:** kolonnene kan ikke kobles sikkert til en bruker. Et nytt navn
i Catenda endrer ikke det som er lagret, og to personer med samme navn kan
ikke skilles. Et innsyn eller en sletting etter personvernreglene må søke på
både navn og e-post. Hvilken verdi som ble lagret, avhenger av hvilke felt
Catenda-profilen hadde.

**Ikke kontrollert:** hvilke former som faktisk står i basen; det krever en
spørring mot saksdata. Om det er meningen at vedleggsregisteret skal vise et
navn framfor en identitet. Alvorlighet settes når funnet er reprodusert.

## 3. Observasjoner uten eget funn

- **Relasjonene mellom saker ligger tre steder,** og de skrives ulikt (L 29.09):
  - Endringsordren skriver hendelsen, `sak_relations` og relasjonen i Catenda
    (C15).
  - `POST /api/forsering/opprett` skriver `sak_relations` og Catenda, men
    ingen hendelse (C10).
  - `POST` og `DELETE /api/forsering/<sak_id>/relatert` endrer bare Catenda
    (C11). `GET /api/forsering/by-relatert/<sak_id>` leser `sak_relations` og
    ser dermed ikke endringen, mens `GET /api/forsering/<sak_id>/relaterte`
    leser Catenda og gjør det.

  Frontenden kaller ingen av forseringsrutene (1b, avsnitt 3). Hvordan
  relasjoner skal lagres, er B-01.
- **Relasjonsrutene sender sak-ID-er som topic-GUID-er** til Catenda (C10,
  C11 og C15 ved endring). En sak opprettet fra en topic har sak-ID
  `SAK-<tidsstempel>`, og klienten avviser en ID som ikke er en GUID, uten å
  kaste. Endringsordren bruker topic-ID-en fra `sak_metadata` ved opprettelse.
  Ikke kjørt.
- **Team-ID-er har to verdiformer.** Hendelsen, notatet, utkastet og vedlegget
  lagrer teamet som 32 heksadesimaler uten bindestreker (`catenda_id`), mens
  `catenda_contract_teams.team_id` er `uuid`. En sammenstilling i SQL må
  normalisere. Det samme gjelder `sak_metadata.catenda_project_id` og
  `catenda_board_id`, som er `text` mot `uuid` i konfigurasjonen; verdiformen
  der er ikke kontrollert.
- **`hendelse.sak_id` har `ON DELETE CASCADE`.** Slettes en rad i
  `sak_metadata`, sletter basen journalen for saken. Hører til MS-02.
- **Levering bruker globale innstillinger for prosjekt, bibliotek og mappe**
  (INT-06), og `catenda_project_configs.library_id` og `folder_id` leses bare
  av prosjektresolveren, som ikke laster opp noe.
- **`scripts/backfill_relations.py` kan ikke skrive over PostgreSQL.** Lageret
  krever et autorisert prosjekt, og skriptet har ingen forespørsel å hente det
  fra (L 29.09).
- **To metoder kaller Catenda uten å ha noen kaller:**
  `WebhookService.handle_pdf_upload` og
  `BaseSakService._create_topic_with_relations`, heller ikke i testene.

## 4. Rettet i registrene fra 1a og 1b

- `projects` har en skriver til: `catenda_admin.py sync-name` oppdaterer navnet
  direkte fra Catenda, utenom `koe_register_project` (C20). 1a fant den ikke,
  fordi søket gikk etter databasefunksjonen og rutene.
- `sak_relations`: forseringsrutene for relaterte saker skriver ikke tabellen.
- Katalogen for `forsering_koe_lagt_til` sa at `POST
  /api/forsering/<sak>/relatert` lager relasjoner i Catenda og i
  `sak_relations`. Ruta lager bare relasjonen i Catenda. Belegget er rettet
  med en merknad.
- Oppføringene for kommentarer og dokumentbiblioteket i Catenda under «utenfor»
  sier nå hvilke flyter som skriver dem. «Hvilke hendelser som gir kommentar»
  var satt til fase 1c.

## Verifikasjon og grenser

**Kjørt og observert 29.09:**
- `katalog.py` mot testbasen (PostgreSQL 17, bygget fra migrasjonene) og mot en
  tom SQLite-fil.
- Samme sum (`md5`) over fremmednøkler, primærnøkler og unike nøkler i
  testbasen og i prosjektet `endringsmeldinger`: 44 skranker begge steder.
- Funksjonene og triggerne i prosjektet og i testbasen: de samme ti
  funksjonene, som nevner de samme tabellene i kildeteksten, og de samme fem
  triggerne. `koe_set_contract_teams` har annen tekst,
  men bare innrykk og kommentarer (PGC-02).
- De fire Mermaid-diagrammene rendret med `mermaid-cli` 11 og Chromium, uten
  feil. `mermaid-cli` er ikke en avhengighet i repoet.
- Testene for registrene, sju av dem som mutasjoner av vaktene, og hele
  backend-suiten med testbasen.

**Lest ut av koden:** klientlaget, hvert kallsted i dataflyten med
kallkjeden, `koe_register_project`, `koe_set_contract_teams`,
`koe_reconcile_memberships` og `koe_resolve_identity` i migrasjonene, og
verdiformene i relasjonene.

**Ikke kontrollert:**
- noe kall mot Catenda; endepunktene er lest i klienten, ikke observert
- verdiformene i basen, og om koblingene uten fremmednøkkel holder i dataene;
  det krever spørringer mot saksdata
- om driftsskriptene kjøres noe sted, og hvor ofte
- frontenden; hvilke skjermbilder som utløser hvilke flyter, er fase 2
- hvilke Catenda-kall utviklerskriptene gjør, utover at de ikke skriver tabeller
- om Redis brukes i et utrullet miljø
- hvordan relasjonene ser ut i Azure SQL Database
