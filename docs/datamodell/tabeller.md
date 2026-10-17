# Tabellregisteret

> Generert fra docs/datamodell/tabeller.toml av docs/verktoy/datamodell.py. Rett i registeret, ikke her.

Hver tabell i appens databaser, og data som ligger utenfor dem. Feltene og typene er forklart i [oppdraget for spor M, avsnitt 5](../prompt-datamodell-og-funksjonskart-2026-09-29.md#5-feltene-i-registeret). Registeret bygges i runder; «ikke kontrollert» betyr det det sier.

## Oversikt

| Tabell | Lagring | Type | Status | Transaksjon | Grunndata |
| --- | --- | --- | --- | --- | --- |
| [`hendelse`](#hendelse) | PostgreSQL | transaksjon | i bruk | Ja | Nei |
| [`leveringsoppdrag`](#leveringsoppdrag) | PostgreSQL | transaksjon | i bruk | Ja | Nei |
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
| [`koe.app_users`](#koeapp_users) | SQL Server | grunndata | uavklart | Nei | Ja |
| [`koe.app_identities`](#koeapp_identities) | SQL Server | grunndata | uavklart | Nei | Ja |
| [`koe.projects`](#koeprojects) | SQL Server | grunndata | uavklart | Nei | Ja |
| [`koe.app_project_memberships`](#koeapp_project_memberships) | SQL Server | grunndata, kopi | i bruk | Nei | Delvis |
| [`koe.catenda_contract_teams`](#koecatenda_contract_teams) | SQL Server | grunndata | uavklart | Nei | Ja |
| [`koe.catenda_project_configs`](#koecatenda_project_configs) | SQL Server | grunndata | uavklart | Nei | Ja |
| [`koe.app_membership_absences`](#koeapp_membership_absences) | SQL Server | grunndata | i bruk | Nei | Ja |
| [`koe.app_membership_sync`](#koeapp_membership_sync) | SQL Server | grunndata | i bruk | Nei | Ja |
| [`koe.sak_metadata`](#koesak_metadata) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.hendelse`](#koehendelse) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.notat`](#koenotat) | SQL Server | transaksjon | uavklart | Ja | Nei |
| [`koe.leveringsoppdrag`](#koeleveringsoppdrag) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.skrivetidspunkt`](#koeskrivetidspunkt) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.kjernebuffer`](#koekjernebuffer) | SQL Server | avledet | uavklart | Nei | Nei |
| [`koe.app_sessions`](#koeapp_sessions) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.app_oauth_attempts`](#koeapp_oauth_attempts) | SQL Server | teknisk | i bruk | Nei | Nei |

## PostgreSQL

### `hendelse`

Journalen. Én rad per formell hendelse i en sak: varsel, krav, svar, endringsordre, forsering og liknende. Innholdet ligger i `data` (JSON) og varierer med hendelsestypen; hendelseskatalogen (`hendelser.md`) beskriver typene og feltene. Sakens tilstand beregnes fra hendelsene. Radene har juridisk vekt.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Når en part sender noe i en sak: hendelsesrutene (enkeltvis og i batch), ny sak, forsering, endringsordre og publisering av en godkjent BH-pakke. En ny topic i Catenda gir også en rad, via webhook. Rader endres og slettes aldri av appen; en rettelse er en ny hendelse. Basen håndhever ikke det (MS-02). |
| Data fra Catenda | Delvis. En ny topic i Catenda oppretter en sak med første hendelse via webhook. Ellers kommer innholdet fra brukerne i appen. Dataflyt: fra Catenda i C01, C05; til Catenda i C06, C07, C14, C15 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (id); unik (event_id); unik (sak_id, versjon). Viser til: sak_id → sak_metadata.sak_id (fremmednøkkel, ON DELETE CASCADE); prosjekt_id → projects.id (uten fremmednøkkel); actorid → app_users.id (uten fremmednøkkel); actorteam → catenda_contract_teams.team_id (uten fremmednøkkel); referstoid → hendelse.event_id (uten fremmednøkkel); data → vedlegg_ids[] → vedlegg.vedlegg_id (uten fremmednøkkel). Vises til fra: approvals.body → items[].claimId (uten fremmednøkkel); approvals.body → packages[].eventIds[] (uten fremmednøkkel); catenda_delivery_status.event_id (uten fremmednøkkel); leveringsoppdrag.event_id (fremmednøkkel, ON DELETE CASCADE); notat.refererer_til_event_id (uten fremmednøkkel). |
| Kan bygges opp igjen | nei. Journalen er kilden alt annet regnes fra. |
| Personopplysninger | `actorid` peker på en bruker. Fritekst i `data` og `comment` kan inneholde personopplysninger. Vurderingen hører til DPIA-en. |
| Skrives av | backend/routes/event_routes.py; backend/services/sak_creation_service.py; backend/services/forsering_service.py; backend/services/endringsordre_service.py; backend/services/approval_service.py; backend/services/catenda_webhook_service.py (via sak_creation_service); server/lager.ts (TS-serveren i testmiljøet, #347) |
| Funn | MS-01, MS-02, MS-03, AR-02, DM-06 |
| Belegg | K 29.09: kolonnene i testbasen og prosjektet, og skrankene (også CASCADE) i testbasen. L 29.09: kallerne av `append`/`append_batch` og `create_sak`. |

### `leveringsoppdrag`

Leveringsoppdraget for et brev TS-serveren skriver (LV-U1, B-03, dokumentet). Én rad per brev, og ett brev er ett dokument i Catenda. `innhold` fryser det som skal leveres: brevet slik det ble lagret, målet i Catenda, statusetiketten og versjonene. Raden er uforanderlig; et nytt leveringsforsøk sender samme innhold. Et lagret oppdrag beviser ikke at brevet er sendt eller mottatt. Forsøk, feil og kvitteringer er ikke bygget (#371). Bare testmiljøet skriver tabellen (#347).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Når TS-serveren lagrer et brev: i samme transaksjon som hendelsen i `hendelse`. Slettes bare med saken eller hendelsen (kaskade). |
| Data fra Catenda | Nei. Målet (prosjekt, bibliotek, mappe og topic) leses fra prosjektets Catenda-konfigurasjon og saksregisteret når brevet lagres. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik (dokumentnoekkel); unik (event_id). Viser til: sak_id → sak_metadata.sak_id (fremmednøkkel, ON DELETE CASCADE); event_id → hendelse.event_id (fremmednøkkel, ON DELETE CASCADE); prosjekt_id → projects.id (uten fremmednøkkel). |
| Kan bygges opp igjen | nei. Oppdraget er det frosne brevet som skal leveres. |
| Personopplysninger | `innhold` har avsenderens `aktor_id` og brevets fritekst. |
| Skrives av | server/lager.ts |
| Funn | — |
| Belegg | K 11.10: kolonnene, skrankene og triggeren i testbasen, og skrivingen i `server/tester/skive.test.ts`. |

### `notat`

Interne notater i en sak. Synlige bare for forfatterens eget team, ikke for motparten og ikke for andre team på samme side. Ligger utenfor journalen: et notat er ikke et kontraktsvarsel og flytter ikke sakens versjon (MS-05).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Når en bruker skriver et internt notat i en sak (hendelsesruta). Forfatteren kan slette notatet. |
| Data fra Catenda | Delvis. `aktor_rolle` og `aktor_team_id` er utledet av teammedlemskapet i Catenda da notatet ble skrevet. Innholdet kommer fra brukeren. Dataflyt: fra Catenda i C05 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (notat_id). Viser til: sak_id → sak_metadata.sak_id (fremmednøkkel, ON DELETE CASCADE); prosjekt_id → projects.id (uten fremmednøkkel); aktor_id → app_users.id (uten fremmednøkkel); aktor_team_id → catenda_contract_teams.team_id (uten fremmednøkkel); refererer_til_event_id → hendelse.event_id (uten fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | `aktor_id` peker på forfatteren. `tekst` og `kommentar` er fritekst. |
| Skrives av | backend/routes/event_routes.py; backend/repositories/postgres/notat.py |
| Funn | MS-05 |
| Belegg | K 29.09: kolonnene og fremmednøkkelen i testbasen. L 29.09: sletting i lageret. Skjermingen: AGENTS.md og `lib/auth/event_visibility.py`, ikke kontrollert på nytt 29.09. |

### `sak_metadata`

Saksregisteret: én rad per sak, med prosjekt, sakstype, hvem som opprettet den, og koblingen til topic, board og prosjekt i Catenda. I tillegg ti `cached_*`-kolonner og `last_event_at` med tall regnet ut av hendelsene, til lister og rapportering. Fem `kjerne_*`-kolonner er bufferen TS-kjernen regner ut av journalen: visningen og de fire versjonene den er regnet med (B-10, #316). Tabellen blander register og projeksjon; skillet er planlagt (MS-06, MS-07).

| Felt | Innhold |
| --- | --- |
| Type | grunndata, avledet |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Opprettes når en sak lages, gjennom `SakCreationService`: fra hendelsesrutene, for endringsordrer, og fra en ny topic i Catenda via webhook. Hvordan en forseringssak får sin rad, er ikke kontrollert. `cached_*` oppdateres etter lagrede hendelser (hendelsesrutene, forsering og godkjenning). `kjerne_*` skrives bare av bufferen i TS-kjernen (`kjerne/utledning/buffer.ts`, lageret i `sprakprove/kjernelagring/bane.ts` til skrivestien i #310). |
| Data fra Catenda | Delvis. `catenda_topic_id`, `catenda_board_id` og `catenda_project_id` er ID-er fra Catenda. Dataflyt: fra Catenda i C01, C15; til Catenda i C01, C15 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (sak_id). Viser til: prosjekt_id → projects.id (uten fremmednøkkel); created_by → app_users.id (uten fremmednøkkel); catenda_project_id → catenda_project_configs.catenda_project_id (uten fremmednøkkel); catenda_board_id → catenda_topic_board_configs.topic_board_id (uten fremmednøkkel). Vises til fra: approval_outbox.case_id (uten fremmednøkkel); approvals.case_id (uten fremmednøkkel); catenda_delivery_status.case_id (uten fremmednøkkel); eo_approvals.body → packages[].sakId (uten fremmednøkkel); eo_approvals.body → packages[].request.koe_sak_ids[] (uten fremmednøkkel); hendelse.sak_id (fremmednøkkel, ON DELETE CASCADE); leveringsoppdrag.sak_id (fremmednøkkel, ON DELETE CASCADE); magic_links.sak_id (fremmednøkkel, ON DELETE CASCADE); notat.sak_id (fremmednøkkel, ON DELETE CASCADE); sak_bim_links.sak_id (fremmednøkkel, ON DELETE CASCADE); sak_relations.source_sak_id (uten fremmednøkkel); sak_relations.target_sak_id (uten fremmednøkkel); utkast.case_id (uten fremmednøkkel); vedlegg.case_id (uten fremmednøkkel). |
| Kan bygges opp igjen | delvis. `cached_*`, `kjerne_*` og `last_event_at` kan regnes ut av hendelsene. Om registerkolonnene også kan det, er ikke kontrollert. |
| Personopplysninger | `created_by` identifiserer den som opprettet saken (tre verdiformer, MG-04). |
| Skrives av | backend/services/sak_creation_service.py; backend/services/endringsordre_service.py; backend/routes/event_routes.py (update_cache); backend/routes/forsering_routes.py (update_cache); backend/routes/approval_routes.py (update_cache); sprakprove/kjernelagring/bane.ts (pgBuffer, bufferen i kjernen) |
| Funn | MS-06, MS-07, DA-14, MG-04, DM-01 |
| Belegg | K 29.09: kolonnene i testbasen og prosjektet, og kolonnekommentarene (DM-01). L 29.09: kallerne av `create` og `update_cache`. |

### `sak_relations`

Koblinger mellom saker, for eksempel hvilke KOE-er en forsering eller en endringsordre omfatter. Én rad per kobling, med type.

| Felt | Innhold |
| --- | --- |
| Type | avledet |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Når en forsering opprettes gjennom `/api/forsering/opprett`, og når en endringsordre opprettes eller KOE-er legges til eller fjernes fra den (forsering- og endringsordretjenesten). Å legge til eller fjerne KOE-er fra en forsering endrer bare Catenda, ikke denne tabellen (dataflyten, C11). |
| Data fra Catenda | Delvis. En forsering opprettet gjennom `/api/forsering/opprett` får topicens GUID fra Catenda som sak-ID. Ellers er koblingene appens egne. Dataflyt: fra Catenda i C10 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (id); unik (source_sak_id, target_sak_id, relation_type). Viser til: source_sak_id → sak_metadata.sak_id (uten fremmednøkkel); target_sak_id → sak_metadata.sak_id (uten fremmednøkkel); prosjekt_id → projects.id (uten fremmednøkkel). |
| Kan bygges opp igjen | ikke kontrollert. Koblingene finnes trolig også som hendelser (`FORSERING_KOE_*`, `EO_KOE_*`), men det er ikke sjekket at de to alltid er like. |
| Personopplysninger | Ingen kjente. |
| Skrives av | backend/services/forsering_service.py; backend/services/endringsordre_service.py |
| Funn | DA-13, MS-08, DB-04 |
| Belegg | K 29.09: kolonnene og fraværet av fremmednøkler i testbasen. L 29.09: kallerne av `add_relation`, `add_relations_batch` og `remove_relation`, og at forseringsrutene for relaterte saker ikke skriver tabellen, i fase 1c. |

### `projects`

Prosjektene i appen, med navn, beskrivelse, innstillinger, om prosjektet er aktivt, og organisasjonen det hører til (MS-10).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Registreres av drift gjennom databasefunksjonen `koe_register_project` (`scripts/catenda_admin.py`). `POST /api/projects` svarer 403 utenfor utviklingsmodus. En prosjektadministrator kan endre navn, beskrivelse og innstillinger og deaktivere prosjektet (`PATCH`). Driftsskriptet `catenda_admin.py sync-name` oppdaterer navnet direkte fra Catenda, utenom databasefunksjonen. At runtime-rollen heller ikke skal kunne kalle funksjonen, gjelder databaserettighetene og hører til F1 (B-02 punkt 4). En migrasjon legger inn prosjektet `oslobygg`, og det er i dag basens eneste prosjekt (DM-03). |
| Data fra Catenda | Delvis. Navnet kan hentes fra Catenda-prosjektet når drift registrerer prosjektet eller kjører `sync-name`. Koblingen til Catenda-prosjektet ligger i `catenda_project_configs`. Dataflyt: fra Catenda i C18, C20 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (id). Vises til fra: app_membership_sync.project_id (fremmednøkkel, ON DELETE CASCADE); app_project_memberships.project_id (fremmednøkkel, ON DELETE CASCADE); approval_outbox.project (uten fremmednøkkel); approvals.project (uten fremmednøkkel); catenda_delivery_status.project (uten fremmednøkkel); catenda_models_cache.prosjekt_id (uten fremmednøkkel); catenda_project_configs.internal_project_id (fremmednøkkel, ON DELETE CASCADE); eo_approvals.project (uten fremmednøkkel); hendelse.prosjekt_id (uten fremmednøkkel); leveringsoppdrag.prosjekt_id (uten fremmednøkkel); notat.prosjekt_id (uten fremmednøkkel); project_memberships.project_id (fremmednøkkel, ON DELETE CASCADE); sak_metadata.prosjekt_id (uten fremmednøkkel); sak_relations.prosjekt_id (uten fremmednøkkel); utkast.project (uten fremmednøkkel); vedlegg.project (uten fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | `created_by` identifiserer den som opprettet prosjektet. |
| Skrives av | databasefunksjonen koe_register_project; backend/routes/project_routes.py (PATCH; POST bare i utviklingsmodus); backend/scripts/catenda_admin.py (sync-name, direkte oppdatering av navnet); migrasjonen 20260911073600_projects.sql (startraden) |
| Funn | MS-10, MS-12, DM-03 |
| Belegg | K 29.09: kolonnene og fremmednøklene i testbasen, startraden i testbasen og en telling i prosjektet. L 29.09: rutene, med vakten mot `POST` utenfor utviklingsmodus, migrasjonene og `scripts/catenda_admin.py`; `sync-name` funnet i fase 1c. |

### `project_memberships`

Eldre medlemsliste per prosjekt, etter e-post. Erstattet av `app_project_memberships` og skal fjernes (MS-15) når `viewer` finnes der (DB-05).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | rest |
| Hvor fra appen lagres og redigeres | Triggeren `trg_auto_membership_on_project_create` legger inn en rad når et prosjekt opprettes. Koden som ser ut til å skrive tabellen, treffer en unik-skranke (AGENTS.md). Ingen leser den (DA-10). |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik (project_id, user_email). Viser til: project_id → projects.id (fremmednøkkel, ON DELETE CASCADE). |
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
| Data fra Catenda | Ja. E-post og navn kommer fra Catenda-profilen og medlemslisten. Dataflyt: fra Catenda i C01, C03, C04 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (id). Vises til fra: app_identities.user_id (fremmednøkkel, ON DELETE CASCADE); app_project_memberships.user_id (fremmednøkkel, ON DELETE CASCADE); app_sessions.user_id (fremmednøkkel, ON DELETE CASCADE); hendelse.actorid (uten fremmednøkkel); notat.aktor_id (uten fremmednøkkel); sak_metadata.created_by (uten fremmednøkkel). |
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
| Data fra Catenda | Ja. Subjektet er Catenda-ID-en. Dataflyt: fra Catenda i C01, C03, C04 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (id); unik (provider, issuer, subject). Viser til: user_id → app_users.id (fremmednøkkel, ON DELETE CASCADE). Vises til fra: app_project_memberships.catenda_subject (uten fremmednøkkel). |
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
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (token_hash). Viser til: user_id → app_users.id (fremmednøkkel, ON DELETE CASCADE). |
| Kan bygges opp igjen | nei, men tapet betyr bare at brukerne må logge inn igjen. |
| Personopplysninger | Knyttet til en bruker gjennom `user_id`, med når sesjonen ble opprettet (`created_at`) og når den utløper (`expires_at`). |
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
| Data fra Catenda | Nei, men raden hører til en innlogging hos Catenda. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (state_hash). Ingen relasjoner til andre tabeller. |
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
| Data fra Catenda | Ja. Medlemslisten hentes fra Catenda-prosjektet. Dataflyt: fra Catenda i C03, C04 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (id); unik (project_id, catenda_subject); unik (project_id, user_id). Viser til: project_id → projects.id (fremmednøkkel, ON DELETE CASCADE); user_id → app_users.id (fremmednøkkel, ON DELETE CASCADE); catenda_subject → app_identities.subject (uten fremmednøkkel). |
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
| Data fra Catenda | Delvis. `catenda_project_id` er en Catenda-ID. Dataflyt: fra Catenda i C04 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (project_id). Viser til: project_id → projects.id (fremmednøkkel, ON DELETE CASCADE); catenda_project_id → catenda_project_configs.catenda_project_id (uten fremmednøkkel). |
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
| Data fra Catenda | Ja. ID-ene er Catenda-ID-er, oppgitt ved registrering. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (internal_project_id); unik (catenda_project_id). Viser til: internal_project_id → projects.id (fremmednøkkel, ON DELETE CASCADE). Vises til fra: app_membership_sync.catenda_project_id (uten fremmednøkkel); catenda_contract_teams.internal_project_id (fremmednøkkel, ON DELETE CASCADE); catenda_models_cache.catenda_project_id (uten fremmednøkkel); catenda_topic_board_configs.internal_project_id (fremmednøkkel, ON DELETE CASCADE); sak_metadata.catenda_project_id (uten fremmednøkkel). |
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
| Data fra Catenda | Ja. `topic_board_id` er en Catenda-ID. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (topic_board_id). Viser til: internal_project_id → catenda_project_configs.internal_project_id (fremmednøkkel, ON DELETE CASCADE). Vises til fra: sak_metadata.catenda_board_id (uten fremmednøkkel). |
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
| Data fra Catenda | Ja. `team_id` er en Catenda-ID. Dataflyt: fra Catenda i C18, C19 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (internal_project_id, team_id). Viser til: internal_project_id → catenda_project_configs.internal_project_id (fremmednøkkel, ON DELETE CASCADE). Vises til fra: hendelse.actorteam (uten fremmednøkkel); notat.aktor_team_id (uten fremmednøkkel); utkast.team (uten fremmednøkkel); vedlegg.lastet_opp_team (uten fremmednøkkel). |
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
| Data fra Catenda | Ja, etter formålet. Hvordan den skulle fylles, er ikke kjent. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik (catenda_project_id, model_id). Viser til: prosjekt_id → projects.id (uten fremmednøkkel); catenda_project_id → catenda_project_configs.catenda_project_id (uten fremmednøkkel). |
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
| Data fra Catenda | Delvis. Modell- og objekt-ID-ene er fra Catenda. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik indeks (sak_id, fag, COALESCE(model_id, ''::text), COALESCE(object_global_id, ''::text)). Viser til: sak_id → sak_metadata.sak_id (fremmednøkkel, ON DELETE CASCADE). |
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
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (token). Viser til: sak_id → sak_metadata.sak_id (fremmednøkkel, ON DELETE CASCADE). |
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
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik (user_id). Viser til: manager_id → user_groups.id (fremmednøkkel, ON DELETE SET NULL); user_id → auth.users.id (fremmednøkkel, ON DELETE CASCADE). |
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
| Data fra Catenda | Delvis. Teamet og kontraktssiden er utledet av teammedlemskapet i Catenda. Innholdet kommer fra brukeren. Dataflyt: fra Catenda i C05 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (project, case_id, spor, revisjon, team). Viser til: project → projects.id (uten fremmednøkkel); case_id → sak_metadata.sak_id (uten fremmednøkkel); team → catenda_contract_teams.team_id (uten fremmednøkkel). |
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
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (project, case_id). Viser til: project → projects.id (uten fremmednøkkel); case_id → sak_metadata.sak_id (uten fremmednøkkel); body → items[].claimId → hendelse.event_id (uten fremmednøkkel); body → packages[].eventIds[] → hendelse.event_id (uten fremmednøkkel). Vises til fra: approval_outbox.id (uten fremmednøkkel). |
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
| Data fra Catenda | Nei. Dataflyt: kvittering for kall til Catenda i C07 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (id). Viser til: id → approvals.body → packages[].id (uten fremmednøkkel); project → projects.id (uten fremmednøkkel); case_id → sak_metadata.sak_id (uten fremmednøkkel). |
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
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (project). Viser til: project → projects.id (uten fremmednøkkel); body → packages[].sakId → sak_metadata.sak_id (uten fremmednøkkel); body → packages[].request.koe_sak_ids[] → sak_metadata.sak_id (uten fremmednøkkel). |
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
| Data fra Catenda | Delvis. `catenda_item_id` er Catendas ID etter opplasting. Dataflyt: fra Catenda i C05, C08; til Catenda i C08; kvittering for kall til Catenda i C08 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (project, case_id, vedlegg_id). Viser til: project → projects.id (uten fremmednøkkel); case_id → sak_metadata.sak_id (uten fremmednøkkel); lastet_opp_team → catenda_contract_teams.team_id (uten fremmednøkkel). Vises til fra: hendelse.data → vedlegg_ids[] (uten fremmednøkkel). |
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
| Data fra Catenda | Nei, men statusen gjelder et kall til Catenda. Dataflyt: kvittering for kall til Catenda i C06 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (project, case_id, event_id). Viser til: project → projects.id (uten fremmednøkkel); case_id → sak_metadata.sak_id (uten fremmednøkkel); event_id → hendelse.event_id (uten fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | backend/services/catenda_delivery_status.py |
| Funn | AR-03 |
| Belegg | L 29.09: tabelldefinisjonen og kallerne i `event_routes`. |

## SQL Server

### `koe.app_users`

Én rad per person. `id` er aktøren i journalen og notatet (AGENTS.md). Svarer til `app_users` i PostgreSQL.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | `koe.resolve_identity`, kalt gjennom `koe_api.catenda_identitet`, oppretter brukeren første gang en identitet sees. Tilbakekallet fra innloggingen kaller den fra `catendaIdentitet` i `server/innlogging.ts` (F0b-5a, #659). |
| Data fra Catenda | Delvis. Navn og e-post kommer fra Catenda-identiteten. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id). Vises til fra: koe.app_identities.user_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_membership_absences.user_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_project_memberships.user_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_sessions.user_id (fremmednøkkel, ON DELETE NO ACTION); koe.hendelse.aktor_id (fremmednøkkel, ON DELETE NO ACTION); koe.notat.aktor_id (fremmednøkkel, ON DELETE NO ACTION); koe.sak_metadata.created_by (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. `id` er aktøren i journalen. |
| Personopplysninger | Navn og e-post. |
| Skrives av | database/migrasjoner/20261016130000_mellomrom.sql (`koe.resolve_identity`, innført i `20261016090100_identitet.sql`); database/migrasjoner/20261016150000_deaktivering.sql (`koe_api.synkroniser_medlemskap`, gjennom `koe.resolve_identity`, innført i `20261016140000_medlemskap.sql`) |
| Funn | — |
| Belegg | L 16.10: migrasjonen og søk i `server/`. |

### `koe.app_identities`

Identitetene til en bruker, unike på leverandør, issuer og subjekt. En Catenda-identitet har issueren og subjektformen basen kontrollerer, så samme person ikke får to brukerrader (AGENTS.md).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | `koe.resolve_identity`, sammen med brukeren, kalt gjennom `koe_api.catenda_identitet` fra tilbakekallet i `server/innlogging.ts` (F0b-5a, #659). |
| Data fra Catenda | Ja, for leverandøren `catenda`: subjektet er Catenda-ID-en. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik (provider, issuer, subject). Viser til: user_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Subjektet identifiserer en person. |
| Skrives av | database/migrasjoner/20261016130000_mellomrom.sql (`koe.resolve_identity`, innført i `20261016090100_identitet.sql`); database/migrasjoner/20261016150000_deaktivering.sql (`koe_api.synkroniser_medlemskap`, gjennom `koe.resolve_identity`, innført i `20261016140000_medlemskap.sql`) |
| Funn | — |
| Belegg | L 16.10: migrasjonen og søk i `server/`. |

### `koe.projects`

Prosjektene. `id` er prosjektgrensen i alle tabellene med saksdata, uten standardverdi (AGENTS.md). `server/prosjekter.ts` leser prosjektene aktøren er aktivt medlem i med `koe_api.brukerens_prosjekter`, og ett av dem med `koe_api.prosjekt` (#660). Tabellen har ikke `settings` og `created_by` fra PostgreSQL.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | Ingen skriver ennå (#53, del 3). |
| Data fra Catenda | ikke kontrollert Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id). Vises til fra: koe.app_membership_absences.project_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_membership_sync.project_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_project_memberships.project_id (fremmednøkkel, ON DELETE NO ACTION); koe.catenda_contract_teams.internal_project_id (fremmednøkkel, ON DELETE NO ACTION); koe.catenda_project_configs.internal_project_id (fremmednøkkel, ON DELETE NO ACTION); koe.sak_metadata.prosjekt_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | Ingen funnet |
| Funn | — |
| Belegg | L 17.10: migrasjonen og søk i `server/`. |

### `koe.app_project_memberships`

Medlemskapet i et prosjekt, fra Catenda. Leserollen er `viewer_override`, som i PostgreSQL. `server/autorisasjon.ts` leser aktørens aktive medlemskap med `koe_api.prosjektmedlemskap` (#658). `koe_api.brukerens_prosjekter` og `koe_api.prosjekt`, kalt fra `server/prosjekter.ts`, leser bare prosjekter der aktøren har et aktivt medlemskap (#660).

| Felt | Innhold |
| --- | --- |
| Type | grunndata, kopi |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.synkroniser_medlemskap`, kalt fra `server/medlemskap.ts`, skriver medlemslisten fra Catenda og gjør medlemmer som ikke står i den, inaktive. `koe_api.deaktiver_ved_innlogging`, også kalt derfra, gjør brukerens medlemskap inaktivt i koblede prosjekter som ikke står i brukerens liste fra Catenda. `deactivated_at` er når medlemskapet sist ble gjort inaktivt, etter basens klokke; en liste hentet før det gjør det ikke aktivt igjen (DL-U8). For en bruker uten medlemskap fører innloggingen en rad i `koe.app_membership_absences`, og en liste hentet før den gir ikke et nytt medlemskap (DL-U9). Tilgangskontrollen i `server/autorisasjon.ts` og tilbakekallet i `server/innlogging.ts` kaller modulen (F0b-5b). Blir koblingen opphevet, slettet eller endret, gjør triggeren `koe.catenda_project_configs_kobling_endret` alle medlemskapene i prosjektet inaktive med `deactivated_at` satt til tidspunktet for endringen (DL-U10). |
| Data fra Catenda | Ja, medlemslisten i Catenda. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (project_id, user_id); unik (project_id, catenda_subject). Viser til: project_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION); user_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | ikke kontrollert |
| Personopplysninger | E-post og visningsnavn. |
| Skrives av | database/migrasjoner/20261016180000_fravaer.sql (`koe_api.synkroniser_medlemskap`, innført i `20261016140000_medlemskap.sql`, kalt fra `server/medlemskap.ts`); database/migrasjoner/20261016210000_catenda_id.sql (`koe_api.deaktiver_ved_innlogging`, innført i `20261016150000_deaktivering.sql`, kalt fra `server/medlemskap.ts`); database/migrasjoner/20261017230000_koblingen.sql (triggeren `koe.catenda_project_configs_kobling_endret`) |
| Funn | — |
| Belegg | L 17.10: migrasjonen og søk i `server/`. K 17.10: `server/tester/medlemskap.test.ts` (DL-U10). |

### `koe.catenda_contract_teams`

Kontraktssiden (TE eller BH) for hvert Catenda-team i et prosjekt. Teamet har `catenda_id()`-formen, som `aktor_team_id` i journalen. `server/autorisasjon.ts` leser prosjektets kontraktsteam med `koe_api.kontraktsteam`, bare for en aktør med aktivt medlemskap uten leserollen (#658).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | Ingen skriver ennå (#53, del 3). |
| Data fra Catenda | Delvis. Team-ID-en kommer fra Catenda; kontraktssiden settes i appen. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (internal_project_id, team_id). Viser til: internal_project_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.hendelse.aktor_team_id (uten fremmednøkkel); koe.notat.aktor_team_id (uten fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | Ingen funnet |
| Funn | — |
| Belegg | L 16.10: migrasjonen og søk i `server/`. |

### `koe.catenda_project_configs`

Koblingen mellom prosjektet i appen og Catenda-prosjektet, og om den er aktiv (arbeidsvalget 16.10 i #53). Svarer til `catenda_project_configs` i PostgreSQL, uten mappene for webhooken. Synkroniseringen avviser en liste fra et annet Catenda-prosjekt. `server/medlemskap.ts` leser en aktiv kobling med `koe_api.prosjektkobling` (#658, #638), og `koe_api.koblede_prosjekter` gir prosjektene koblet til brukerens Catenda-prosjekter ved innlogging. `koe_api.brukerens_prosjekter`, kalt fra `server/prosjekter.ts`, tar bare med prosjekter med aktiv kobling (#660). Triggeren `koe.catenda_project_configs_kobling_endret` gjør medlemskapene inaktive når koblingen oppheves, slettes eller endres (DL-U10). Den tomme Catenda-ID-en er ikke lov; den merker synkroniseringsraden etter en slik endring.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | Settes av driften. Ingen prosedyre skriver tabellen. |
| Data fra Catenda | Delvis. ID-en til Catenda-prosjektet. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (internal_project_id); unik (catenda_project_id). Viser til: internal_project_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | Ingen funnet |
| Funn | — |
| Belegg | L 17.10: migrasjonen og søk i `server/`. |

### `koe.app_membership_absences`

Prosjektene der innloggingens liste over brukerens Catenda-prosjekter viste at brukeren ikke er med, for en bruker uten medlemskap der (DL-U9). `observed_at` er når innloggingens liste ble hentet, etter basens klokke. En medlemsliste hentet samtidig eller før gir ikke brukeren et nytt medlemskap. Har ingen tabell i PostgreSQL.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.deaktiver_ved_innlogging`, kalt fra `server/medlemskap.ts`, setter inn raden eller flytter `observed_at` fram. `koe_api.synkroniser_medlemskap` sletter radene i prosjektet med `observed_at` før listen den skriver. Innloggingen kaller modulen fra tilbakekallet i `server/innlogging.ts` (F0b-5b). |
| Data fra Catenda | Delvis. Tidspunktet er når hentingen fra Catenda begynte. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (project_id, user_id). Viser til: project_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION); user_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | ja, ved en ny innlogging |
| Personopplysninger | Knyttet til en bruker gjennom `user_id`, med prosjektene brukeren ikke er med i og tidspunktene for innloggingene (`observed_at`, `updated_at`). |
| Skrives av | database/migrasjoner/20261016210000_catenda_id.sql (`koe_api.deaktiver_ved_innlogging`, kalt fra `server/medlemskap.ts`); database/migrasjoner/20261016180000_fravaer.sql (`koe_api.synkroniser_medlemskap`, kalt fra `server/medlemskap.ts`) |
| Funn | — |
| Belegg | L 16.10: migrasjonen og `server/tester/medlemskap.test.ts`. |

### `koe.app_membership_sync`

Når medlemslisten for prosjektet sist ble hentet, og fra hvilket Catenda-prosjekt (DL-U7). En eldre liste skriver ikke over en nyere. Alderen leses av `koe_api.medlemsliste_alder` (B-04 punkt 4), kalt fra `server/autorisasjon.ts` etter at koblingen er kontrollert (#638 punkt 2), også gjennom `ferskeMedlemmer` for hvert prosjekt i lista i `server/prosjekter.ts` (#660). Svarer til `app_membership_sync` i PostgreSQL. Etter at koblingen er opphevet, slettet eller endret, har raden den tomme Catenda-ID-en og tidspunktet for endringen, så ingen liste fra det koblede prosjektet finnes, og en liste hentet før endringen ikke skrives (DL-U10).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.synkroniser_medlemskap`, kalt fra `server/medlemskap.ts`, og triggeren `koe.catenda_project_configs_kobling_endret` når koblingen endres. |
| Data fra Catenda | Delvis. Tidspunktet er når hentingen fra Catenda begynte. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (project_id). Viser til: project_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | ja, ved en ny synkronisering |
| Personopplysninger | Ingen kjente. |
| Skrives av | database/migrasjoner/20261016180000_fravaer.sql (`koe_api.synkroniser_medlemskap`, innført i `20261016140000_medlemskap.sql`, kalt fra `server/medlemskap.ts`); database/migrasjoner/20261017230000_koblingen.sql (triggeren `koe.catenda_project_configs_kobling_endret`) |
| Funn | — |
| Belegg | L 17.10: migrasjonen og `server/tester/medlemskap.test.ts`. K 17.10: DL-U10 i samme test. |

### `koe.sak_metadata`

Saksregisteret: saken, prosjektet og sakstypen. En trigger avviser endring og sletting.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.opprett_sak`, sammen med `sak_opprettet`, kalt fra `opprettSak` i `server/kommandoer.ts`. Ingen HTTP-inngang kaller den ennå (#53). |
| Data fra Catenda | Nei Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (sak_id); unik (sak_id, prosjekt_id). Viser til: prosjekt_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION); created_by → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.hendelse.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.kjernebuffer.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.notat.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | `created_by` peker på en bruker. |
| Skrives av | database/migrasjoner/20261016230000_skranker.sql (`koe_api.opprett_sak`, kalt fra `server/kommandoer.ts`) |
| Funn | — |
| Belegg | L 16.10: migrasjonene og `server/kommandoer.ts`. K 16.10: `server/tester/kommandoer.test.ts`. |

### `koe.hendelse`

Journalen: ett dokument per brev, med teksten slik den ble sendt. En trigger avviser endring og sletting. Teamet står bare når det er entydig (DL-U4).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.opprett_sak` skriver `sak_opprettet` og `koe_api.skriv_hendelse` de andre brevene, kalt fra `server/kommandoer.ts`. `koe_api.skriv_hendelse` kalles fra `POST /api/kjerne/saker/<sak_id>/kommandoer` (#661); ingen HTTP-inngang oppretter saker ennå (#370). |
| Data fra Catenda | Nei Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (event_id); unik (event_id, sak_id, prosjekt_id); unik (sak_id, versjon). Viser til: (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); aktor_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION); aktor_team_id → koe.catenda_contract_teams.team_id (uten fremmednøkkel); refererer_til_event_id → koe.hendelse.event_id (uten fremmednøkkel). Vises til fra: koe.leveringsoppdrag.(event_id, sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.notat.refererer_til_event_id (uten fremmednøkkel). |
| Kan bygges opp igjen | nei. Journalen er kilden alt annet regnes fra. |
| Personopplysninger | `aktor_id` peker på en bruker. Fritekst i `data` kan inneholde personopplysninger. |
| Skrives av | database/migrasjoner/20261016230000_skranker.sql (`koe_api.opprett_sak`, `koe_api.skriv_hendelse`); server/kommandoer.ts |
| Funn | — |
| Belegg | L 16.10: migrasjonene og `server/kommandoer.ts`. K 16.10: `server/tester/kommandoer.test.ts`. |

### `koe.notat`

Interne notater, skjermet på teamet (AGENTS.md). Ikke et kontraktsvarsel, og kan endres og slettes (MS-05).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | Ingen skriver ennå (#53, del 3). |
| Data fra Catenda | Nei Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (notat_id). Viser til: (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); aktor_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION); aktor_team_id → koe.catenda_contract_teams.team_id (uten fremmednøkkel); refererer_til_event_id → koe.hendelse.event_id (uten fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | `aktor_id` peker på en bruker. Fritekst i `tekst` og `kommentar`. |
| Skrives av | Ingen funnet |
| Funn | — |
| Belegg | L 16.10: migrasjonen og søk i `server/`. |

### `koe.leveringsoppdrag`

Leveringsoppdraget for et brev (LV-U1, B-03), frosset i samme transaksjon som brevet. Den sammensatte fremmednøkkelen holder det i brevets sak og prosjekt.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.skriv_hendelse`, med brevet `dokument_registrert` i samme transaksjon, kalt fra `skrivHendelse` i `server/kommandoer.ts`, fra `POST /api/kjerne/saker/<sak_id>/kommandoer` (#661). |
| Data fra Catenda | Nei, men oppdraget gjelder en levering til Catenda. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik (dokumentnoekkel); unik (event_id). Viser til: (event_id, sak_id, prosjekt_id) → koe.hendelse.(event_id, sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Innholdet er brevet og kan inneholde personopplysninger. |
| Skrives av | database/migrasjoner/20261016230000_skranker.sql (`koe_api.skriv_hendelse`, kalt fra `server/kommandoer.ts`) |
| Funn | — |
| Belegg | L 16.10: migrasjonene og `server/kommandoer.ts`. K 16.10: `server/tester/kommandoer.test.ts`. |

### `koe.skrivetidspunkt`

Tidspunktet basen ga for skrivingen i en transaksjon, med økt-ID-en som nøkkel, og transaksjonen og når økta logget inn, fordi transaksjons-ID-en begynner på nytt etter en omstart. `koe_api.skriv_hendelse` godtar bare dette tidspunktet på brevet, i samme transaksjon og økt (DL-U3, svaret 16.10 i #53). Kjøretiden har ingen rett på tabellen.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.skrivetidspunkt` fører raden, og `koe_api.skriv_hendelse` sletter den i samme transaksjon. Kalt fra `skrivHendelse` i `server/kommandoer.ts`, som ruller tilbake når den ikke skriver. En kaller som committer uten å skrive, etterlater raden; `skrivetidspunkt` erstatter den neste gang samme økt-ID fører et tidspunkt. Tabellen har høyst én rad per økt-ID. |
| Data fra Catenda | Nei Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (oekt). Ingen relasjoner til andre tabeller. |
| Kan bygges opp igjen | ja. Raden brukes bare i transaksjonen som førte den. |
| Personopplysninger | Ingen kjente. |
| Skrives av | database/migrasjoner/20261016170000_kommandoform.sql (`koe_api.skrivetidspunkt`); database/migrasjoner/20261016230000_skranker.sql (`koe_api.skriv_hendelse`) |
| Funn | — |
| Belegg | L 16.10: migrasjonen. K 16.10: `server/tester/kommandoer.test.ts`. |

### `koe.kjernebuffer`

Visningen kjernen regner ut av journalen, med versjonene den er regnet med (B-10). Ingen regel og ingen bindende kommando leser den.

| Felt | Innhold |
| --- | --- |
| Type | avledet |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | Ingen skriver ennå (#53, del 3). |
| Data fra Catenda | Nei Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (sak_id). Viser til: (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | ja, fra journalen. |
| Personopplysninger | Som journalen den er regnet fra. |
| Skrives av | Ingen funnet |
| Funn | — |
| Belegg | L 16.10: migrasjonen og søk i `server/`. |

### `koe.app_sessions`

Innloggingssesjoner. Lagrer SHA-256 av sesjonstokenet, CSRF-tokenet og når sesjonen utløper, 8 timer etter opprettelsen. Svarer til `app_sessions` i PostgreSQL (B-19, #656). Kjøretiden har ingen rett på tabellen.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.opprett_sesjon` oppretter, `koe_api.slett_sesjon` sletter og `koe_api.rydd_utloepte` sletter utløpte rader. Kalt fra `server/sesjon.ts`, av tilbakekallet og utloggingen i `server/innlogging.ts` (F0b-5a, #659). |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (token_hash). Viser til: user_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei, men tapet betyr bare at brukerne må logge inn igjen. |
| Personopplysninger | Knyttet til en bruker gjennom `user_id`, med når sesjonen ble opprettet (`created_at`) og når den utløper (`expires_at`). |
| Skrives av | database/migrasjoner/20261016190000_sesjon.sql (`koe_api.opprett_sesjon`, `koe_api.rydd_utloepte`); database/migrasjoner/20261016233000_hashparametre.sql (`koe_api.slett_sesjon`, innført i `20261016190000_sesjon.sql`) |
| Funn | — |
| Belegg | L 16.10: migrasjonen. K 16.10: `server/tester/sesjon.test.ts`. |

### `koe.app_oauth_attempts`

Påbegynte innlogginger mot Catenda (OAuth). Lagrer SHA-256 av staten og av nettlesertokenet, returstien og når forsøket utløper, 600 sekunder etter opprettelsen. Svarer til `app_oauth_attempts` i PostgreSQL (B-19, #656). Kjøretiden har ingen rett på tabellen.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.opprett_innloggingsforsoek` oppretter, `koe_api.bruk_innloggingsforsoek` sletter raden når den brukes, og `koe_api.rydd_utloepte` sletter utløpte rader. Kalt fra `server/sesjon.ts`, av innloggingen og tilbakekallet i `server/innlogging.ts` (F0b-5a, #659). |
| Data fra Catenda | Nei, men raden hører til en innlogging hos Catenda. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (state_hash). Ingen relasjoner til andre tabeller. |
| Kan bygges opp igjen | nei, men radene er kortlevde. |
| Personopplysninger | Ingen kjente; bare hasher og en returadresse. |
| Skrives av | database/migrasjoner/20261016190000_sesjon.sql (`koe_api.opprett_innloggingsforsoek`, `koe_api.rydd_utloepte`); database/migrasjoner/20261016233000_hashparametre.sql (`koe_api.bruk_innloggingsforsoek`, innført i `20261016190000_sesjon.sql`) |
| Funn | — |
| Belegg | L 16.10: migrasjonen. K 16.10: `server/tester/sesjon.test.ts`. |

## Utenfor databasene

| Navn | Lagring | Beskrivelse | Lagres fra | Belegg |
| --- | --- | --- | --- | --- |
| Catenda: topics og kommentarer | Catenda | Hver sak er knyttet til en topic i Catenda (`sak_metadata.catenda_topic_id`). En ny topic kan opprette en sak via webhook. Appen oppretter selv topics og relasjoner mellom dem for forsering og endringsordre, og skriver kommentarer på topicen. | Forserings- og endringsordretjenesten (`create_topic`, `create_topic_relations`), webhook-tjenesten, synkroniseringstjenesten og hendelsesrutene (`create_comment`). Kommentar skrives når en topic blir en sak (C01), når en hendelse sendes med `POST /api/events` (C06), når et godkjent BH-svar publiseres (C07), og etter tre av forseringsrutene (C14); se `relasjoner.md`. | L 29.09: kallene i tjenestene og rutene, og i fase 1c hvert kallsted mot Catenda, kontrollert av testen for dataflyten. |
| Catenda: dokumentbiblioteket | Catenda | Vedlegg og brev lagres i Catendas dokumentbibliotek og knyttes til topicen (P4). Appen har bare registeret i `vedlegg` og kvitteringene. | Hendelsesruta, publisering av godkjente BH-svar og leveringen av vedlegg (C06, C07, C08). Opplastingen i webhook-tjenesten har ingen kaller. | L 29.09: kallene til `upload_document` og `create_document_reference`. Mappestrukturen og navngivingen er ikke kontrollert (B-03). |
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
