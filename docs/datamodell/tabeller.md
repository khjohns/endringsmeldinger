# Tabellregisteret

> Generert fra docs/datamodell/tabeller.toml av docs/verktoy/datamodell.py. Rett i registeret, ikke her.

Hver tabell i appens databaser, og data som ligger utenfor dem. Feltene og typene er forklart i [oppdraget for spor M, avsnitt 5](../prompt-datamodell-og-funksjonskart-2026-09-29.md#5-feltene-i-registeret). Registeret bygges i runder; «ikke kontrollert» betyr det det sier.

## Oversikt

| Tabell | Lagring | Type | Status | Transaksjon | Grunndata |
| --- | --- | --- | --- | --- | --- |
| [`hendelse`](#hendelse) | PostgreSQL | transaksjon | i bruk | Ja | Nei |
| [`notat`](#notat) | PostgreSQL | transaksjon | i bruk | Ja | Nei |
| [`sak_metadata`](#sak_metadata) | PostgreSQL | grunndata, avledet | i bruk | Nei | Delvis |
| [`sak_relations`](#sak_relations) | PostgreSQL | avledet | i bruk | Nei | Nei |
| [`projects`](#projects) | PostgreSQL | grunndata | i bruk | Nei | Ja |
| [`project_memberships`](#project_memberships) | PostgreSQL | grunndata | rest | Nei | Ja |
| [`app_users`](#app_users) | PostgreSQL | grunndata | i bruk | Nei | Ja |
| [`app_identities`](#app_identities) | PostgreSQL | grunndata | i bruk | Nei | Ja |
| [`app_sessions`](#app_sessions) | PostgreSQL | teknisk | i bruk | Nei | Nei |
| [`app_oauth_attempts`](#app_oauth_attempts) | PostgreSQL | teknisk | i bruk | Nei | Nei |
| [`app_project_memberships`](#app_project_memberships) | PostgreSQL | grunndata, kopi | i bruk | Nei | Delvis |
| [`app_membership_sync`](#app_membership_sync) | PostgreSQL | teknisk | i bruk | Nei | Nei |
| [`catenda_project_configs`](#catenda_project_configs) | PostgreSQL | grunndata | i bruk | Nei | Ja |
| [`catenda_topic_board_configs`](#catenda_topic_board_configs) | PostgreSQL | grunndata | i bruk | Nei | Ja |
| [`catenda_contract_teams`](#catenda_contract_teams) | PostgreSQL | grunndata | i bruk | Nei | Ja |
| [`catenda_models_cache`](#catenda_models_cache) | PostgreSQL | kopi | uavklart | Nei | Nei |
| [`sak_bim_links`](#sak_bim_links) | PostgreSQL | transaksjon | i bruk | Ja | Nei |
| [`magic_links`](#magic_links) | PostgreSQL | teknisk | rest | Nei | Nei |
| [`user_groups`](#user_groups) | PostgreSQL | grunndata | rest | Nei | Ja |
| [`utkast`](#utkast) | SQLite | teknisk | i bruk | Nei | Nei |
| [`approvals`](#approvals) | SQLite | transaksjon | i bruk | Ja | Nei |
| [`approval_outbox`](#approval_outbox) | SQLite | teknisk | i bruk | Nei | Nei |
| [`eo_approvals`](#eo_approvals) | SQLite | transaksjon | i bruk | Ja | Nei |
| [`vedlegg`](#vedlegg) | SQLite | transaksjon | i bruk | Ja | Nei |
| [`catenda_delivery_status`](#catenda_delivery_status) | SQLite | teknisk | i bruk | Nei | Nei |

## PostgreSQL

### `hendelse`

Journalen. Én rad per formell hendelse i en sak: varsel, krav, svar, endringsordre, forsering og liknende. Innholdet ligger i `data` (JSON) og varierer med hendelsestypen; hendelseskatalogen i fase 1b beskriver typene. Sakens tilstand beregnes fra hendelsene. Radene har juridisk vekt.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Når en part sender noe i en sak: hendelsesrutene (enkeltvis og i batch), ny sak, forsering, endringsordre og publisering av en godkjent BH-pakke. En ny topic i Catenda gir også en rad, via webhook. Rader endres og slettes aldri av appen; en rettelse er en ny hendelse. Basen håndhever ikke det (MS-02). |
| Data fra Catenda | Delvis. En ny topic i Catenda oppretter en sak med første hendelse via webhook. Ellers kommer innholdet fra brukerne i appen. |
| Relasjoner | `sak_id` → `sak_metadata.sak_id` (fremmednøkkel, ON DELETE CASCADE). Én rad per sak og versjonsnummer (`UNIQUE (sak_id, versjon)`), og `event_id` er unik. `actorid` er `app_users.id`, uten fremmednøkkel. `referstoid` viser etter navnet til en annen hendelse, uten fremmednøkkel; bruken er ikke kontrollert. |
| Kan bygges opp igjen | nei. Journalen er kilden alt annet regnes fra. |
| Personopplysninger | `actorid` peker på en bruker. Fritekst i `data` og `comment` kan inneholde personopplysninger. Vurderingen hører til DPIA-en. |
| Skrives av | backend/routes/event_routes.py; backend/services/sak_creation_service.py; backend/services/forsering_service.py; backend/services/endringsordre_service.py; backend/services/approval_service.py; backend/services/catenda_webhook_service.py (via sak_creation_service) |
| Funn | MS-01, MS-02, MS-03, AR-02 |
| Belegg | K 29.09: kolonnene i testbasen og prosjektet, og skrankene (også CASCADE) i testbasen. L 29.09: kallerne av `append`/`append_batch` og `create_sak`. |

### `notat`

Interne notater i en sak. Synlige bare for forfatterens eget team, ikke for motparten og ikke for andre team på samme side. Ligger utenfor journalen: et notat er ikke et kontraktsvarsel og flytter ikke sakens versjon (MS-05).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Når en bruker skriver et internt notat i en sak (hendelsesruta). Forfatteren kan slette notatet. |
| Data fra Catenda | Nei. |
| Relasjoner | `sak_id` → `sak_metadata.sak_id` (fremmednøkkel). `aktor_id` er `app_users.id`, `aktor_team_id` er Catenda-team-ID, begge uten fremmednøkkel. `refererer_til_event_id` kan vise til en hendelse, uten fremmednøkkel. |
| Kan bygges opp igjen | nei |
| Personopplysninger | `aktor_id` peker på forfatteren. `tekst` og `kommentar` er fritekst. |
| Skrives av | backend/routes/event_routes.py; backend/repositories/postgres/notat.py |
| Funn | MS-05 |
| Belegg | K 29.09: kolonnene og fremmednøkkelen i testbasen. L 29.09: sletting i lageret. Skjermingen: AGENTS.md og `lib/auth/event_visibility.py`, ikke kontrollert på nytt 29.09. |

### `sak_metadata`

Saksregisteret: én rad per sak, med prosjekt, sakstype, hvem som opprettet den, og koblingen til topic, board og prosjekt i Catenda. I tillegg ti `cached_*`-kolonner og `last_event_at` med tall regnet ut av hendelsene, til lister og rapportering. Tabellen blander register og projeksjon; skillet er planlagt (MS-06, MS-07).

| Felt | Innhold |
| --- | --- |
| Type | grunndata, avledet |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Opprettes når en sak lages, gjennom `SakCreationService`: fra hendelsesrutene, for endringsordrer, og fra en ny topic i Catenda via webhook. Hvordan en forseringssak får sin rad, er ikke kontrollert. `cached_*` oppdateres etter lagrede hendelser (hendelsesrutene, forsering og godkjenning). |
| Data fra Catenda | Delvis. `catenda_topic_id`, `catenda_board_id` og `catenda_project_id` er ID-er fra Catenda. |
| Relasjoner | Primærnøkkel `sak_id`. `hendelse`, `notat`, `sak_bim_links` og `magic_links` har fremmednøkkel hit. `sak_relations` viser hit uten fremmednøkkel. `prosjekt_id` viser til `projects.id` uten fremmednøkkel. |
| Kan bygges opp igjen | delvis. `cached_*` og `last_event_at` kan regnes ut av hendelsene. Om registerkolonnene også kan det, er ikke kontrollert. |
| Personopplysninger | `created_by` identifiserer den som opprettet saken (tre verdiformer, MG-04). |
| Skrives av | backend/services/sak_creation_service.py; backend/services/endringsordre_service.py; backend/routes/event_routes.py (update_cache); backend/routes/forsering_routes.py (update_cache); backend/routes/approval_routes.py (update_cache) |
| Funn | MS-06, MS-07, DA-14, MG-04, DM-01 |
| Belegg | K 29.09: kolonnene i testbasen og prosjektet, og kolonnekommentarene (DM-01). L 29.09: kallerne av `create` og `update_cache`. |

### `sak_relations`

Koblinger mellom saker, for eksempel hvilke KOE-er en forsering eller en endringsordre omfatter. Én rad per kobling, med type.

| Felt | Innhold |
| --- | --- |
| Type | avledet |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Når KOE-er legges til eller fjernes fra en forsering eller en endringsordre (forsering- og endringsordretjenesten). |
| Data fra Catenda | Nei. |
| Relasjoner | `source_sak_id` og `target_sak_id` viser til `sak_metadata.sak_id`, uten fremmednøkler (DB-04, B-01). `prosjekt_id` settes av serveren. |
| Kan bygges opp igjen | ikke kontrollert. Koblingene finnes trolig også som hendelser (`FORSERING_KOE_*`, `EO_KOE_*`), men det er ikke sjekket at de to alltid er like. |
| Personopplysninger | Ingen kjente. |
| Skrives av | backend/services/forsering_service.py; backend/services/endringsordre_service.py |
| Funn | DA-13, MS-08, DB-04 |
| Belegg | K 29.09: kolonnene og fraværet av fremmednøkler i testbasen. L 29.09: kallerne av `add_relation`, `add_relations_batch` og `remove_relation`. |

### `projects`

Prosjektene i appen, med navn, beskrivelse, innstillinger, om prosjektet er aktivt, og organisasjonen det hører til (MS-10).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | To veier: rutene `POST` og `PATCH /api/projects`, og databasefunksjonen `koe_register_project`, som drift kaller gjennom `scripts/catenda_admin.py`. Etter vedtaket i B-02 punkt 4 skal bare drift registrere prosjekter; det er ikke bygget (F1). En migrasjon legger inn prosjektet `oslobygg` som startrad. |
| Data fra Catenda | Nei, ikke direkte. Koblingen til Catenda-prosjektet ligger i `catenda_project_configs`. |
| Relasjoner | Primærnøkkel `id`. `app_project_memberships`, `app_membership_sync`, `catenda_project_configs` og `project_memberships` har fremmednøkkel hit. `prosjekt_id` i andre tabeller viser hit uten fremmednøkkel. Triggeren `trg_auto_membership_on_project_create` skriver `project_memberships` ved ny rad. |
| Kan bygges opp igjen | nei |
| Personopplysninger | `created_by` identifiserer den som opprettet prosjektet. |
| Skrives av | backend/routes/project_routes.py; databasefunksjonen koe_register_project |
| Funn | MS-10, MS-12 |
| Belegg | K 29.09: kolonnene og fremmednøklene i testbasen. L 29.09: rutene, migrasjonene og `scripts/catenda_admin.py`. |

### `project_memberships`

Eldre medlemsliste per prosjekt, etter e-post. Erstattet av `app_project_memberships` og skal fjernes (MS-15) når `viewer` finnes der (DB-05).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | rest |
| Hvor fra appen lagres og redigeres | Triggeren `trg_auto_membership_on_project_create` legger inn en rad når et prosjekt opprettes. Koden som ser ut til å skrive tabellen, treffer en unik-skranke (AGENTS.md). Ingen leser den (DA-10). |
| Data fra Catenda | Nei. |
| Relasjoner | `project_id` → `projects.id` (fremmednøkkel). |
| Kan bygges opp igjen | ikke relevant; tabellen skal fjernes. |
| Personopplysninger | `user_email`, `display_name`, `external_id`. |
| Skrives av | triggerfunksjonen auto_create_project_membership |
| Funn | DA-10, MS-15, AR-07 |
| Belegg | K 29.09: kolonnene og triggeren i testbasen. D 20.09: ingen leser (databaseauditen). |

### `app_users`

Brukerne. Én rad per person, med e-post og navn. `id` er identiteten journalen bærer i `aktor_id`.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Bare gjennom databasefunksjonen `koe_resolve_identity`. Den kalles ved innlogging, når en webhook fra Catenda har en forfatter, og for hvert medlem når medlemslisten synkroniseres. E-post og navn oppdateres fra Catenda hver gang. |
| Data fra Catenda | Ja. E-post og navn kommer fra Catenda-profilen og medlemslisten. |
| Relasjoner | Primærnøkkel `id`. `app_identities`, `app_sessions` og `app_project_memberships` har fremmednøkkel hit. `hendelse.actorid` og `notat.aktor_id` viser hit uten fremmednøkkel. |
| Kan bygges opp igjen | nei. `id` må være stabil, fordi journalen viser til den. |
| Personopplysninger | `email` og `name`. |
| Skrives av | databasefunksjonen koe_resolve_identity |
| Funn | MG-02 |
| Belegg | K 29.09: kolonnene og fremmednøklene i testbasen. L 29.09: funksjonen i migrasjonene og kallerne i `auth_service`, `catenda_webhook_service` og `koe_reconcile_memberships`. |

### `app_identities`

Kobler en bruker til en ekstern identitet: tilbyder, utsteder og subjekt i Catenda. Sørger for at samme person får samme brukerrad uansett vei inn.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Bare gjennom `koe_resolve_identity`, som også er eneste leser. Ingen Python-kode leser eller skriver tabellen direkte (DA-07). |
| Data fra Catenda | Ja. Subjektet er Catenda-ID-en. |
| Relasjoner | `user_id` → `app_users.id` (fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | `subject` er en ekstern identifikator for en person. |
| Skrives av | databasefunksjonen koe_resolve_identity |
| Funn | DA-07, MG-02 |
| Belegg | K 29.09: kolonnene og fremmednøkkelen i testbasen. L 29.09: funksjonen i migrasjonene; søket etter tabellnavnet i Python-koden gir bare to docstringer. |

### `app_sessions`

Innloggingssesjoner. Lagrer en hash av sesjonstokenet, CSRF-tokenet og når sesjonen utløper.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Opprettes ved innlogging og slettes ved utlogging (innloggingsrutene). Utløpte rader ryddes av `scripts/sync_catenda_memberships.py`. Om skriptet kjører noe sted, er ikke kontrollert. |
| Data fra Catenda | Nei. |
| Relasjoner | `user_id` → `app_users.id` (fremmednøkkel). |
| Kan bygges opp igjen | nei, men tapet betyr bare at brukerne må logge inn igjen. |
| Personopplysninger | Knyttet til en bruker gjennom `user_id`. |
| Skrives av | backend/routes/auth_routes.py; backend/scripts/sync_catenda_memberships.py |
| Funn | — |
| Belegg | K 29.09: kolonnene i testbasen. L 29.09: rutene og skriptet. |

### `app_oauth_attempts`

Påbegynte innlogginger mot Catenda (OAuth). Kortlevde rader som binder tilbakekallet til nettleseren som startet innloggingen.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Opprettes når innloggingen starter, og brukes opp når Catenda sender brukeren tilbake (innloggingsrutene). |
| Data fra Catenda | Nei, men raden hører til en innlogging hos Catenda. |
| Relasjoner | Ingen fremmednøkler. |
| Kan bygges opp igjen | nei, men radene er kortlevde. |
| Personopplysninger | Ingen kjente; bare hasher og en returadresse. |
| Skrives av | backend/routes/auth_routes.py |
| Funn | — |
| Belegg | K 29.09: kolonnene i testbasen. L 29.09: rutene. |

### `app_project_memberships`

Hvem som er medlem av hvilket prosjekt, med rolle, og om medlemskapet er aktivt. En kopi av medlemslisten i Catenda, pluss appens egen `viewer_override`.

| Felt | Innhold |
| --- | --- |
| Type | grunndata, kopi |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Databasefunksjonen `koe_reconcile_memberships` synkroniserer mot Catenda ved innlogging, fra medlemsruta og fra skriptet `scripts/sync_catenda_memberships.py`. Medlemsruta setter `viewer_override`. Innloggingen kan også deaktivere medlemskap. |
| Data fra Catenda | Ja. Medlemslisten hentes fra Catenda-prosjektet. |
| Relasjoner | `project_id` → `projects.id` og `user_id` → `app_users.id` (fremmednøkler). |
| Kan bygges opp igjen | delvis. Fra Catenda, bortsett fra `viewer_override`. |
| Personopplysninger | `user_email`, `display_name` og `catenda_subject`. |
| Skrives av | databasefunksjonen koe_reconcile_memberships; backend/repositories/auth_repository.py (deactivate_user_projects, viewer_override); backend/routes/membership_routes.py |
| Funn | DB-05 |
| Belegg | K 29.09: kolonnene og fremmednøklene i testbasen. L 29.09: funksjonen i migrasjonene og kallerne i `auth_service` og `membership_routes`. |

### `app_membership_sync`

Når medlemslisten for et prosjekt sist ble synkronisert fra Catenda. Hindrer at en eldre synkronisering overskriver en nyere.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Av `koe_reconcile_memberships`, samtidig med medlemskapene. |
| Data fra Catenda | Delvis. `catenda_project_id` er en Catenda-ID. |
| Relasjoner | `project_id` → `projects.id` (fremmednøkkel). |
| Kan bygges opp igjen | ja, ved neste synkronisering. |
| Personopplysninger | Ingen kjente. |
| Skrives av | databasefunksjonen koe_reconcile_memberships |
| Funn | — |
| Belegg | K 29.09: kolonnene i testbasen. L 29.09: funksjonen i migrasjonene. |

### `catenda_project_configs`

Kobler et prosjekt i appen til prosjektet, dokumentbiblioteket og mappen i Catenda.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Av `koe_register_project`, som drift kaller gjennom `scripts/catenda_admin.py`. |
| Data fra Catenda | Ja. ID-ene er Catenda-ID-er, oppgitt ved registrering. |
| Relasjoner | `internal_project_id` → `projects.id` (fremmednøkkel). `catenda_topic_board_configs` og `catenda_contract_teams` har fremmednøkkel hit. |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | databasefunksjonen koe_register_project |
| Funn | MS-12 |
| Belegg | K 29.09: kolonnene og fremmednøklene i testbasen. L 29.09: funksjonen og skriptet. |

### `catenda_topic_board_configs`

Hvilke topic boards i Catenda som hører til et prosjekt. Brukes blant annet til å finne prosjektet når en webhook kommer.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Av `koe_register_project`, som drift kaller gjennom `scripts/catenda_admin.py`. |
| Data fra Catenda | Ja. `topic_board_id` er en Catenda-ID. |
| Relasjoner | `internal_project_id` → `catenda_project_configs.internal_project_id` (fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | databasefunksjonen koe_register_project |
| Funn | MS-12 |
| Belegg | K 29.09: kolonnene og fremmednøkkelen i testbasen. L 29.09: funksjonen. Bruken ved webhook er ikke kontrollert 29.09. |

### `catenda_contract_teams`

Hvilke Catenda-team som representerer TE og BH i et prosjekt. Appen utleder en brukers kontraktsside og team herfra og fra medlemskapet i Catenda.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Av `koe_set_contract_teams` og `koe_register_project`, som drift kaller gjennom `scripts/catenda_admin.py`. Etter B-02 punkt 4 er det bare drift som skal gjøre dette. |
| Data fra Catenda | Ja. `team_id` er en Catenda-ID. |
| Relasjoner | `internal_project_id` → `catenda_project_configs.internal_project_id` (fremmednøkkel). |
| Kan bygges opp igjen | nei. Hvilket team som er hvilken side, er et valg drift gjør. |
| Personopplysninger | Ingen kjente. |
| Skrives av | databasefunksjonen koe_set_contract_teams; databasefunksjonen koe_register_project |
| Funn | — |
| Belegg | K 29.09: kolonnene og fremmednøkkelen i testbasen. L 29.09: funksjonene og skriptet. |

### `catenda_models_cache`

Ment som kopi av BIM-modellene i Catenda per prosjekt, med fag. Tre BIM-ruter leser den og gir tomme lister når den er tom.

| Felt | Innhold |
| --- | --- |
| Type | kopi |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | Ikke funnet. Ingen kode, databasefunksjon eller trigger skriver tabellen, og `upsert_cached_models` har ingen kaller (DM-02, foreløpig). |
| Data fra Catenda | Ja, etter formålet. Hvordan den skulle fylles, er ikke kjent. |
| Relasjoner | `prosjekt_id` viser til `projects.id` uten fremmednøkkel. |
| Kan bygges opp igjen | ja, i prinsippet fra Catenda. |
| Personopplysninger | Ingen kjente. |
| Skrives av | Ingen funnet |
| Funn | DM-02, DA-15 |
| Belegg | L 29.09: lesere og skrivere i repoet og Git-historikken. K 29.09: ingen funksjon, trigger eller Edge Function i prosjektet nevner tabellen, og statistikken viser 0 rader. |

### `sak_bim_links`

Kobler en sak til et objekt i en BIM-modell, med modell, objekt-ID, IFC-type, egenskaper og hvem som koblet. Formålet er å se hvilke komponenter som fører til tvist (P2, P3).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Når en bruker kobler et objekt til en sak eller fjerner koblingen (BIM-rutene). |
| Data fra Catenda | Delvis. Modell- og objekt-ID-ene er fra Catenda. |
| Relasjoner | `sak_id` → `sak_metadata.sak_id` (fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | `linked_by` identifiserer den som koblet (e-post, lest i ruta). |
| Skrives av | backend/routes/bim_link_routes.py |
| Funn | DA-15, MS-13, MS-14 |
| Belegg | K 29.09: kolonnene og fremmednøkkelen i testbasen. L 29.09: rutene. |

### `magic_links`

Etterlatenskap fra en eldre innlogging med lenke på e-post. Magic links utgår (P1), og tabellen skal fjernes (MS-15).

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | rest |
| Hvor fra appen lagres og redigeres | Ingen kode leser eller skriver tabellen (DA-09). `MagicLinkManager` i `lib/auth/magic_link.py` lagrer i en JSON-fil, ikke her. |
| Data fra Catenda | Nei. |
| Relasjoner | `sak_id` → `sak_metadata.sak_id` (fremmednøkkel). |
| Kan bygges opp igjen | ikke relevant; tabellen skal fjernes. |
| Personopplysninger | `email`. |
| Skrives av | Ingen funnet |
| Funn | DA-09, MS-15 |
| Belegg | K 29.09: kolonnene i testbasen. D 20.09: ingen lesere. L 29.09: `MagicLinkManager`. |

### `user_groups`

Etterlatenskap: brukergrupper med roller og leder. Ingen kode bruker den, og den skal fjernes (MS-15).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | rest |
| Hvor fra appen lagres og redigeres | Ingen. To databasefunksjoner, `get_user_role` og `get_user_role_by_email`, leser tabellen, men ingen kaller dem (DA-08). |
| Data fra Catenda | Nei. |
| Relasjoner | `user_id` → `auth.users` (fremmednøkkel til Supabase-plattformens tabell) og `manager_id` → `user_groups.id`. Fremmednøkkelen til `auth.users` må løses hvis basen flyttes fra Supabase (B-12). |
| Kan bygges opp igjen | ikke relevant; tabellen skal fjernes. |
| Personopplysninger | `display_name`, `department` og koblingen til en bruker. |
| Skrives av | Ingen funnet |
| Funn | DA-08, MS-15 |
| Belegg | K 29.09: kolonnene og fremmednøklene i testbasen. D 20.09: ingen kallere. |

## SQLite

### `utkast`

Teamets arbeidsutkast til et svar eller krav, per sak, spor og revisjon. Utkastet tilhører teamet, ikke personen, og er skjult for alle andre. `versjon` avviser samtidige lagringer.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Når en bruker skriver i et skjema: utkastrutene (`GET`, `PUT` og `DELETE` på `/api/cases/<sak_id>/utkast/<spor>`). |
| Data fra Catenda | Nei. Teamet er en Catenda-team-ID. |
| Relasjoner | Nøkkel: prosjekt, sak, spor, revisjon og team. Viser til saken og teamet uten fremmednøkler. |
| Kan bygges opp igjen | nei |
| Personopplysninger | `oppdatert_av` og fritekst i `innhold`. |
| Skrives av | backend/services/utkast_registry.py |
| Funn | AR-03 |
| Belegg | L 29.09: tabelldefinisjonen og rutene. |

### `approvals`

Byggherrens interne godkjenning av svar i en sak: poster, godkjenningspakker og kommandoer, lagret som ett JSON-dokument per sak. Når en pakke er godkjent og publisert, skrives svarene til journalen.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Godkjenningsrutene, gjennom `ApprovalService`. |
| Data fra Catenda | Nei. |
| Relasjoner | Nøkkel: prosjekt og sak. Publiserte hendelser lagres i `hendelse`, og varslingsjobben i `approval_outbox`. |
| Kan bygges opp igjen | nei |
| Personopplysninger | Godkjennere og saksbehandlere i JSON-dokumentet; ikke kontrollert i detalj. |
| Skrives av | backend/services/approval_service.py |
| Funn | AR-03, MG-05 |
| Belegg | L 29.09: tabelldefinisjonen og `ApprovalService`. |

### `approval_outbox`

Kø for varsling etter at en godkjenningspakke er publisert. Én rad per pakke, med status (`pending`, `sending`, `delivered`, `failed`, `not_configured`).

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Av `ApprovalService` ved publisering og levering. |
| Data fra Catenda | Nei. |
| Relasjoner | `id` er pakkens ID i `approvals`. |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | backend/services/approval_service.py |
| Funn | AR-03 |
| Belegg | L 29.09: tabelldefinisjonen og `publish`/`deliver`. |

### `eo_approvals`

Godkjenning av endringsordrer før utstedelse, lagret som ett JSON-dokument per prosjekt.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Endringsordrerutene, gjennom `EOApprovalService`. |
| Data fra Catenda | Nei. |
| Relasjoner | Nøkkel: prosjekt. Viser til endringsordresakene uten fremmednøkler. |
| Kan bygges opp igjen | nei |
| Personopplysninger | Godkjennere i JSON-dokumentet; ikke kontrollert i detalj. |
| Skrives av | backend/services/eo_approval_service.py |
| Funn | AR-03 |
| Belegg | L 29.09: tabelldefinisjonen og `EOApprovalService`. |

### `vedlegg`

Register over vedlegg i en sak, med status: `staged` (valgt, ikke sendt), `pending` (sendt i en lagret hendelse, venter på Catenda) og `delivered` (lastet opp og koblet i Catenda). Filinnholdet mellomlagres her fram til opplastingen.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Vedleggsrutene og hendelsesrutene, gjennom `VedleggRegistry`. |
| Data fra Catenda | Delvis. `catenda_item_id` er Catendas ID etter opplasting. |
| Relasjoner | Nøkkel: prosjekt, sak og `vedlegg_id`. Hendelser viser til `vedlegg_id`, uten fremmednøkkel. |
| Kan bygges opp igjen | nei |
| Personopplysninger | Filinnholdet kan inneholde personopplysninger; ikke kontrollert. |
| Skrives av | backend/services/vedlegg_registry.py |
| Funn | AR-03, MS-11 |
| Belegg | L 29.09: tabelldefinisjonen og modulheaderen. |

### `catenda_delivery_status`

Kvittering per hendelse for levering til Catenda (`pending`, `failed`, `delivered`), vist i banneret på saken. Ikke en kø for nye forsøk.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Hendelsesrutene. |
| Data fra Catenda | Nei, men statusen gjelder et kall til Catenda. |
| Relasjoner | Nøkkel: prosjekt, sak og `event_id`. Viser til `hendelse.event_id` uten fremmednøkkel. |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | backend/services/catenda_delivery_status.py |
| Funn | AR-03 |
| Belegg | L 29.09: tabelldefinisjonen og kallerne i `event_routes`. |

## Utenfor databasene

| Navn | Lagring | Beskrivelse | Lagres fra | Belegg |
| --- | --- | --- | --- | --- |
| Catenda: topics og kommentarer | Catenda | Hver sak er knyttet til en topic i Catenda (`sak_metadata.catenda_topic_id`). En ny topic kan opprette en sak via webhook. Appen oppretter selv topics og relasjoner mellom dem for forsering og endringsordre, og skriver kommentarer på topicen. | Forserings- og endringsordretjenesten (`create_topic`, `create_topic_relations`), webhook-tjenesten, synkroniseringstjenesten og hendelsesrutene (`create_comment`). | L 29.09: kallene i tjenestene og rutene. Hvilke hendelser som gir kommentar, er ikke kontrollert (fase 1c). |
| Catenda: dokumentbiblioteket | Catenda | Vedlegg og brev lagres i Catendas dokumentbibliotek og knyttes til topicen (P4). Appen har bare registeret i `vedlegg` og kvitteringene. | Hendelses- og vedleggsrutene og webhook-tjenesten. | L 29.09: kallene til `upload_document` og `create_document_reference`. Mappestrukturen og navngivingen er ikke kontrollert (B-03). |
| Webhook-reservasjon | Redis eller minne | Hindrer at samme webhook fra Catenda behandles to ganger. Ligger i Redis med utløpstid når `REDIS_URL` er satt, og ellers i minnet til prosessen, der den forsvinner ved omstart. | `lib/security/webhook_security.py`, ved hver webhook. | L 29.09: modulen. Om Redis brukes i et utrullet miljø, er ikke kontrollert. |

## Typer og belegg

| Kode | Betyr |
| --- | --- |
| `transaksjon` | Rader som registrerer noe en part eller bruker har gjort |
| `grunndata` | Prosjekter, brukere, medlemskap og oppsett som andre rader viser til |
| `avledet` | Kan bygges opp igjen fra andre tabeller og rettes ikke for hånd |
| `kopi` | Kopi av data fra Catenda |
| `teknisk` | Sesjoner, synkroniseringsstatus, køer og kvitteringer |
| K | kjørt og observert (med dato) |
| L | lest i kode eller migrasjonsfil (med dato) |
| D | kontrollert i databasekatalogen tidligere (med dato) |
| H | historisk dokumentert i en audit |
