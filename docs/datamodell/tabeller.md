# Tabellregisteret

> Generert fra docs/datamodell/tabeller.toml av docs/verktoy/datamodell.py. Rett i registeret, ikke her.

Hver tabell i appens databaser, og data som ligger utenfor dem. Feltene og typene er forklart i [oppdraget for spor M, avsnitt 5](../prompt-datamodell-og-funksjonskart-2026-09-29.md#5-feltene-i-registeret). Registeret bygges i runder; «ikke kontrollert» betyr det det sier.

## Oversikt

| Tabell | Lagring | Type | Status | Transaksjon | Grunndata |
| --- | --- | --- | --- | --- | --- |
| [`hendelse`](#hendelse) | PostgreSQL | transaksjon | i bruk | Ja | Nei |
| [`leveringsoppdrag`](#leveringsoppdrag) | PostgreSQL | transaksjon | rest | Ja | Nei |
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
| [`koe.entra_tenant`](#koeentra_tenant) | SQL Server | grunndata | i bruk | Nei | Ja |
| [`koe.rolle`](#koerolle) | SQL Server | grunndata | i bruk | Nei | Ja |
| [`koe.stillingstittel`](#koestillingstittel) | SQL Server | grunndata | i bruk | Nei | Ja |
| [`koe.hr_kopi`](#koehr_kopi) | SQL Server | kopi | i bruk | Nei | Nei |
| [`koe.projects`](#koeprojects) | SQL Server | grunndata | uavklart | Nei | Ja |
| [`koe.app_project_memberships`](#koeapp_project_memberships) | SQL Server | grunndata, kopi | i bruk | Nei | Delvis |
| [`koe.catenda_contract_teams`](#koecatenda_contract_teams) | SQL Server | grunndata | uavklart | Nei | Ja |
| [`koe.catenda_project_configs`](#koecatenda_project_configs) | SQL Server | grunndata | uavklart | Nei | Ja |
| [`koe.app_membership_absences`](#koeapp_membership_absences) | SQL Server | grunndata | i bruk | Nei | Ja |
| [`koe.app_membership_sync`](#koeapp_membership_sync) | SQL Server | grunndata | i bruk | Nei | Ja |
| [`koe.sak_metadata`](#koesak_metadata) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.hendelse`](#koehendelse) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.notat`](#koenotat) | SQL Server | transaksjon | uavklart | Ja | Nei |
| [`koe.jobb`](#koejobb) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.jobbforsoek`](#koejobbforsoek) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.leveringsoppdrag`](#koeleveringsoppdrag) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.kvittering`](#koekvittering) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.brevdokument`](#koebrevdokument) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.vedlegg`](#koevedlegg) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.dagmulktssats`](#koedagmulktssats) | SQL Server | grunndata | i bruk | Nei | Ja |
| [`koe.godkjenningspakke`](#koegodkjenningspakke) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.godkjenningssteg`](#koegodkjenningssteg) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.godkjenningshandling`](#koegodkjenningshandling) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.leveringskvittering`](#koeleveringskvittering) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.vedleggskvittering`](#koevedleggskvittering) | SQL Server | transaksjon | i bruk | Ja | Nei |
| [`koe.sak_catenda_topic`](#koesak_catenda_topic) | SQL Server | grunndata | uavklart | Nei | Ja |
| [`koe.innkommende_hendelse`](#koeinnkommende_hendelse) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.innkommende_behandling`](#koeinnkommende_behandling) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.innkommende_forsoek`](#koeinnkommende_forsoek) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.topic_kommentar`](#koetopic_kommentar) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.prosjekt_med_saker`](#koeprosjekt_med_saker) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.skrivetidspunkt`](#koeskrivetidspunkt) | SQL Server | teknisk | i bruk | Nei | Nei |
| [`koe.toemmingsvern`](#koetoemmingsvern) | SQL Server | teknisk | i bruk | Nei | Nei |
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
| Skrives av | backend/routes/event_routes.py; backend/services/sak_creation_service.py; backend/services/forsering_service.py; backend/services/endringsordre_service.py; backend/services/approval_service.py; backend/services/catenda_webhook_service.py (via sak_creation_service) |
| Funn | MS-01, MS-02, MS-03, AR-02, DM-06 |
| Belegg | K 29.09: kolonnene i testbasen og prosjektet, og skrankene (også CASCADE) i testbasen. L 29.09: kallerne av `append`/`append_batch` og `create_sak`. |

### `leveringsoppdrag`

Leveringsoppdraget for et brev TS-serveren skrev fram til F0b-7 (LV-U1, B-03, dokumentet). Én rad per brev, og ett brev er ett dokument i Catenda. `innhold` fryser det som skal leveres: brevet slik det ble lagret, målet i Catenda, statusetiketten og versjonene. Raden er uforanderlig; et nytt leveringsforsøk sender samme innhold. Et lagret oppdrag beviser ikke at brevet er sendt eller mottatt. Forsøk, feil og kvitteringer er ikke bygget (#371). Ingen skriver tabellen lenger: TS-serveren skriver oppdraget i `koe.leveringsoppdrag` i SQL Server (F0b-7, #661).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | rest |
| Hvor fra appen lagres og redigeres | Ingen steder etter F0b-7 (#661). Fram til da skrev TS-serveren oppdraget i samme transaksjon som hendelsen i `hendelse`. Slettes bare med saken eller hendelsen (kaskade). |
| Data fra Catenda | Nei. Målet (prosjekt, bibliotek, mappe og topic) leses fra prosjektets Catenda-konfigurasjon og saksregisteret når brevet lagres. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik (dokumentnoekkel); unik (event_id). Viser til: sak_id → sak_metadata.sak_id (fremmednøkkel, ON DELETE CASCADE); event_id → hendelse.event_id (fremmednøkkel, ON DELETE CASCADE); prosjekt_id → projects.id (uten fremmednøkkel). |
| Kan bygges opp igjen | nei. Oppdraget er det frosne brevet som skal leveres. |
| Personopplysninger | `innhold` har avsenderens `aktor_id` og brevets fritekst. |
| Skrives av | Ingen funnet |
| Funn | — |
| Belegg | K 11.10: kolonnene, skrankene og triggeren i testbasen. L 17.10: ingen skriver i `server/` etter at `pg` er tatt ut (#661). |

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
| Hvor fra appen lagres og redigeres | Opprettes når en sak lages, gjennom `SakCreationService`: fra hendelsesrutene, for endringsordrer, og fra en ny topic i Catenda via webhook. Hvordan en forseringssak får sin rad, er ikke kontrollert. `cached_*` oppdateres etter lagrede hendelser (hendelsesrutene, forsering og godkjenning). `kjerne_*` skrives ikke lenger: bufferen i TS-kjernen lagres i SQL Server (#932). |
| Data fra Catenda | Delvis. `catenda_topic_id`, `catenda_board_id` og `catenda_project_id` er ID-er fra Catenda. Dataflyt: fra Catenda i C01, C15; til Catenda i C01, C15 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (sak_id). Viser til: prosjekt_id → projects.id (uten fremmednøkkel); created_by → app_users.id (uten fremmednøkkel); catenda_project_id → catenda_project_configs.catenda_project_id (uten fremmednøkkel); catenda_board_id → catenda_topic_board_configs.topic_board_id (uten fremmednøkkel). Vises til fra: approval_outbox.case_id (uten fremmednøkkel); approvals.case_id (uten fremmednøkkel); catenda_delivery_status.case_id (uten fremmednøkkel); eo_approvals.body → packages[].sakId (uten fremmednøkkel); eo_approvals.body → packages[].request.koe_sak_ids[] (uten fremmednøkkel); hendelse.sak_id (fremmednøkkel, ON DELETE CASCADE); leveringsoppdrag.sak_id (fremmednøkkel, ON DELETE CASCADE); magic_links.sak_id (fremmednøkkel, ON DELETE CASCADE); notat.sak_id (fremmednøkkel, ON DELETE CASCADE); sak_bim_links.sak_id (fremmednøkkel, ON DELETE CASCADE); sak_relations.source_sak_id (uten fremmednøkkel); sak_relations.target_sak_id (uten fremmednøkkel); utkast.case_id (uten fremmednøkkel); vedlegg.case_id (uten fremmednøkkel). |
| Kan bygges opp igjen | delvis. `cached_*`, `kjerne_*` og `last_event_at` kan regnes ut av hendelsene. Om registerkolonnene også kan det, er ikke kontrollert. |
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
| Hvor fra appen lagres og redigeres | Av `koe_set_contract_teams` og `koe_register_project`. Bare de levende testene gir dem team: `scripts/catenda_admin.py` avviser `--bh` og `--te` og viser til `server/registrering.ts`, som skriver kontraktsteamene i SQL Server (#1072). Etter B-02 punkt 4 skal bare drift skrive tabellen, og drift har ingen vei hit. |
| Data fra Catenda | Ja. `team_id` er en Catenda-ID. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
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

Én rad per person. `id` er aktøren i journalen og notatet (AGENTS.md). Svarer til `app_users` i PostgreSQL. Navnet leses for visningen av saken gjennom `koe_api.aktornavn`, bare for aktørene i en sak leseren kan lese (F-1b, #104), fra `lesAktornavn` i `server/lager.ts`.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | `koe.resolve_identity`, kalt gjennom `koe_api.catenda_identitet`, oppretter brukeren første gang en Catenda-identitet sees. Tilbakekallet fra innloggingen kaller den fra `catendaIdentitet` i `server/innlogging.ts` (F0b-5a, #659). En Entra-identitet oppretter aldri en bruker ved innloggingen: driften registrerer den med `koe_drift.registrer_entra_identitet`, som ny bruker eller koblet til en eksisterende (S-1c del 1, #831). `koe_api.entra_identitet` oppdaterer navn og e-post ved innloggingen. `koe_drift.koble_catenda_identitet` kobler en Catenda-identitet til en bruker med Entra-identitet og sletter brukeren identiteten stod på, når den bare har medlemskap, fravær og sesjoner (#1002). |
| Data fra Catenda | Delvis. Navn og e-post kommer fra Catenda-identiteten. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id). Vises til fra: koe.app_identities.user_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_membership_absences.user_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_project_memberships.user_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_sessions.user_id (fremmednøkkel, ON DELETE NO ACTION); koe.godkjenningshandling.aktor_id (fremmednøkkel, ON DELETE NO ACTION); koe.godkjenningspakke.aktor_id (fremmednøkkel, ON DELETE NO ACTION); koe.godkjenningssteg.godkjenner_id (fremmednøkkel, ON DELETE NO ACTION); koe.hendelse.aktor_id (fremmednøkkel, ON DELETE NO ACTION); koe.hr_kopi.bruker_id (fremmednøkkel, ON DELETE NO ACTION); koe.kvittering.aktor_id (uten fremmednøkkel); koe.notat.aktor_id (fremmednøkkel, ON DELETE NO ACTION); koe.sak_metadata.created_by (fremmednøkkel, ON DELETE NO ACTION); koe.vedlegg.lastet_opp_av (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. `id` er aktøren i journalen. |
| Personopplysninger | Navn og e-post. |
| Skrives av | database/migrasjoner/20261016130000_mellomrom.sql (`koe.resolve_identity`, innført i `20261016090100_identitet.sql`); database/migrasjoner/20261020040000_deaktiverte_medlemmer.sql (`koe_api.synkroniser_medlemskap`, innført i `20261016140000_medlemskap.sql`, som skriver gjennom prosedyren over); database/migrasjoner/20261020150000_entra_identitet.sql (`koe_drift.registrer_entra_identitet`, og `koe_api.entra_identitet`, som oppdaterer navn og e-post); database/migrasjoner/20261020170000_catenda_kobling.sql (`koe_drift.koble_catenda_identitet`) |
| Funn | — |
| Belegg | L 16.10: migrasjonen og søk i `server/`. L 18.10: `20261019160000_aktornavn.sql`. K 18.10: `server/tester/aktornavn.test.ts` mot testbasen. |

### `koe.app_identities`

Identitetene til en bruker, unike på leverandør, issuer og subjekt. En Catenda-identitet og en Entra-identitet har issueren og subjektformen basen kontrollerer, så samme person ikke får to brukerrader (AGENTS.md). For Entra er issueren v2-formen for tenanten og subjektet `oid`, begge i små bokstaver (#831).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | `koe.resolve_identity`, sammen med brukeren, kalt gjennom `koe_api.catenda_identitet` fra tilbakekallet i `server/innlogging.ts` (F0b-5a, #659). En Entra-identitet registreres av driften med `koe_drift.registrer_entra_identitet` og slås bare opp av `koe_api.entra_identitet` ved innloggingen (S-1c del 1, #831). Driften kobler en Catenda-identitet til en bruker med Entra-identitet med `koe_drift.koble_catenda_identitet`, som flytter identiteten bare når brukeren den stod på, ikke er brukt utover medlemskap, fravær og sesjoner; det er den eneste slettingen triggeren slipper gjennom (#1002). |
| Data fra Catenda | Ja, for leverandøren `catenda`: subjektet er Catenda-ID-en. For `entra` kommer subjektet fra ID-tokenet fra Entra ID. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik (provider, issuer, subject). Viser til: user_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.toemmingsvern.app_identities_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Subjektet identifiserer en person. |
| Skrives av | database/migrasjoner/20261016130000_mellomrom.sql (`koe.resolve_identity`, innført i `20261016090100_identitet.sql`); database/migrasjoner/20261020040000_deaktiverte_medlemmer.sql (`koe_api.synkroniser_medlemskap`, innført i `20261016140000_medlemskap.sql`, som skriver gjennom prosedyren over); database/migrasjoner/20261020150000_entra_identitet.sql (`koe_drift.registrer_entra_identitet`, og `koe_api.entra_identitet`, som oppdaterer navn og e-post); database/migrasjoner/20261020170000_catenda_kobling.sql (`koe_drift.koble_catenda_identitet`, som sletter én Catenda-identitet når den flyttes) |
| Funn | — |
| Belegg | L 16.10: migrasjonen og søk i `server/`. |

### `koe.entra_tenant`

Tenantene i Entra ID driften har godkjent for innloggingen (S-1c del 1, #831). `koe_api.entra_identitet` og `koe_drift.registrer_entra_identitet` avviser en tenant som ikke står her. Kjøretiden har ingen rett på tabellen.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Driften, som eier. Lest av `koe_api.entra_identitet` fra `server/entra.ts`. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (tenant_id). Ingen relasjoner til andre tabeller. |
| Kan bygges opp igjen | nei. Driftens godkjenning er kilden. |
| Personopplysninger | Nei. |
| Skrives av | database/migrasjoner/20261020150000_entra_identitet.sql (tabellen); radene skrives av driften som eier |
| Funn | — |
| Belegg | L 20.10: migrasjonen. K 20.10: `server/tester/entra.test.ts` mot testbasen. |

### `koe.rolle`

Rollene byggherren gir fullmakt etter, med beløpsgrensen i kroner, globalt for byggherren (GFK-U6, GFK-U11; S-1c del 2, #831). Ingen grense er ubegrenset (GFK-U4). Rollen er en kode med a–z og `_`. Kjøretiden har ingen rett på tabellen. `koe_api.godkjenningskjede` leser grensen når kjeden avledes, og `koe_api.registrer_godkjenningshandling` fryser rollen og grensen i godkjenningen (S-1c del 3).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Driften, med `koe_drift.sett_rolle` og `koe_drift.fjern_rolle`. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (rolle). Vises til fra: koe.hr_kopi.rolle (fremmednøkkel, ON DELETE NO ACTION); koe.stillingstittel.rolle (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. Driftens registrering er kilden. |
| Personopplysninger | Nei. |
| Skrives av | database/migrasjoner/20261020160000_hr_roller.sql (tabellen og driftsprosedyrene) |
| Funn | — |
| Belegg | L 20.10: migrasjonen. K 20.10: `server/tester/hrdata.test.ts` mot testbasen. |

### `koe.stillingstittel`

Hvilken stillingstittel (`jobTitle` i Graph) som gir hvilken rolle (S3 i #831). Tittelen må stemme tegn for tegn; nøkkelen er SHA-256 av tittelen, fordi `=` ser bort fra mellomrom til slutt. Kjøretiden leser titlene bare gjennom `koe_api.stillingstitler`.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Driften, med `koe_drift.sett_stillingstittel` og `koe_drift.fjern_stillingstittel`. Lest av `koe_api.stillingstitler` og `koe_api.synkroniser_hr` fra `server/hrdata.ts`. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (noekkel). Viser til: rolle → koe.rolle.rolle (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. Driftens registrering er kilden. |
| Personopplysninger | Nei. |
| Skrives av | database/migrasjoner/20261020160000_hr_roller.sql (tabellen og driftsprosedyrene) |
| Funn | — |
| Belegg | L 20.10: migrasjonen. K 20.10: `server/tester/hrdata.test.ts` mot testbasen. |

### `koe.hr_kopi`

HR-kopien per bruker fra Graph (S-1c del 2, #831): tenanten, `oid`, rollen, lederens `oid` og når bildet ble hentet. Hver synkronisering skriver hele bildet for tenanten; en person uten en stilling som gir rolle, eller med deaktivert konto, beholder raden uten rolle og leder (GFK-U10). Kjøretiden skriver bare gjennom `koe_api.synkroniser_hr` og har ingen rett på tabellen. Godkjenningskjeden avledes av lederne i kopien (GFK-U8) i `koe_api.godkjenningskjede`, og en rad leses bare når den er hentet for under 24 timer siden og tenanten er godkjent (S-1c del 3).

| Felt | Innhold |
| --- | --- |
| Type | kopi |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.synkroniser_hr`, kalt av jobbkjøreren gjennom `synkroniserHr` i `server/hrdata.ts`. |
| Data fra Catenda | Nei. Fra Microsoft Graph. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (bruker_id); unik (tenant_id, oid). Viser til: bruker_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION); rolle → koe.rolle.rolle (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | ja. Neste synkronisering skriver bildet på nytt. |
| Personopplysninger | Hvem som har en rolle med fullmakt, og hvem som er lederen. |
| Skrives av | server/hrdata.ts → koe_api.synkroniser_hr |
| Funn | — |
| Belegg | L 20.10: migrasjonen og `server/hrdata.ts`. K 20.10: `server/tester/hrdata.test.ts` mot testbasen og en falsk Graph. |

### `koe.projects`

Prosjektene. `id` er prosjektgrensen i alle tabellene med saksdata, uten standardverdi (AGENTS.md). `server/prosjekter.ts` leser prosjektene aktøren er aktivt medlem i med `koe_api.brukerens_prosjekter`, og ett av dem med `koe_api.prosjekt` (#660). Tabellen har ikke `settings` og `created_by` fra PostgreSQL.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | Driften registrerer prosjektet med skriptet `server/registrering.ts`, som kaller `koe_drift.registrer_prosjekt`; bare `koe_driftsrolle` kan kjøre den (F-1, #820). En ny registrering skriver over navnet og beskrivelsen og gjør prosjektet aktivt, men endrer ikke virksomheten; skriptet sier fra når `--organisasjon` er en annen (#836). |
| Data fra Catenda | Delvis. Navnet oppgis av driften; i Python kan det hentes fra Catenda-prosjektet. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id). Vises til fra: koe.app_membership_absences.project_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_membership_sync.project_id (fremmednøkkel, ON DELETE NO ACTION); koe.app_project_memberships.project_id (fremmednøkkel, ON DELETE NO ACTION); koe.catenda_contract_teams.internal_project_id (fremmednøkkel, ON DELETE NO ACTION); koe.catenda_project_configs.internal_project_id (fremmednøkkel, ON DELETE NO ACTION); koe.dagmulktssats.prosjekt_id (fremmednøkkel, ON DELETE NO ACTION); koe.prosjekt_med_saker.prosjekt_id (fremmednøkkel, ON DELETE NO ACTION); koe.sak_metadata.prosjekt_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | database/migrasjoner/20261020122000_registrering_bibliotek.sql (`koe_drift.registrer_prosjekt`, kalt fra `server/registrering.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonene og søk i `server/`. K 18.10: `server/tester/registrering.test.ts`. |

### `koe.app_project_memberships`

Medlemskapet i et prosjekt, fra Catenda. Leserollen er `viewer_override`, som i PostgreSQL. `server/autorisasjon.ts` leser aktørens aktive medlemskap med `koe_api.prosjektmedlemskap` (#658). `koe_api.brukerens_prosjekter` og `koe_api.prosjekt`, kalt fra `server/prosjekter.ts`, leser bare prosjekter der aktøren har et aktivt medlemskap (#660). `koe_api.medlemmer`, også kalt derfra, leser de aktive medlemmene for en aktør med aktivt medlemskap (#820).

| Felt | Innhold |
| --- | --- |
| Type | grunndata, kopi |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.synkroniser_medlemskap`, kalt fra `server/medlemskap.ts`, skriver medlemslisten fra Catenda og gjør medlemmer som ikke står i den, inaktive. `koe_api.deaktiver_ved_innlogging`, også kalt derfra, gjør brukerens medlemskap inaktivt i koblede prosjekter som ikke står i brukerens liste fra Catenda. `deactivated_at` er når medlemskapet sist ble gjort inaktivt, etter basens klokke; en liste hentet før det gjør det ikke aktivt igjen (DL-U8). For en bruker uten medlemskap fører innloggingen en rad i `koe.app_membership_absences`, og en liste hentet før den gir ikke et nytt medlemskap (DL-U9). Tilgangskontrollen i `server/autorisasjon.ts` og tilbakekallet i `server/innlogging.ts` kaller modulen (F0b-5b). Blir koblingen opphevet, slettet eller endret, gjør triggeren `koe.catenda_project_configs_kobling_endret` alle medlemskapene i prosjektet inaktive med `deactivated_at` satt til tidspunktet for endringen (DL-U10). `koe_api.sett_leserolle`, kalt fra `server/prosjekter.ts`, setter `viewer_override` for et annet aktivt medlem når aktøren er aktiv admin uten leserolle (#820). |
| Data fra Catenda | Ja, medlemslisten i Catenda. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (project_id, user_id); unik (project_id, catenda_subject). Viser til: project_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION); user_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | ikke kontrollert |
| Personopplysninger | E-post og visningsnavn. |
| Skrives av | database/migrasjoner/20261020040000_deaktiverte_medlemmer.sql (`koe_api.synkroniser_medlemskap`, innført i `20261016140000_medlemskap.sql`, kalt fra `server/medlemskap.ts`); database/migrasjoner/20261018060000_innloggingslaas.sql (`koe_api.deaktiver_ved_innlogging`, innført i `20261016150000_deaktivering.sql`, kalt fra `server/medlemskap.ts`); database/migrasjoner/20261020000000_synkroniseringsgrense.sql (triggeren `koe.catenda_project_configs_kobling_endret`, innført i `20261017230000_koblingen.sql`); database/migrasjoner/20261019120000_medlemmer.sql (`koe_api.sett_leserolle`, kalt fra `server/prosjekter.ts`); database/migrasjoner/20261020170000_catenda_kobling.sql (`koe_drift.koble_catenda_identitet`, som flytter medlemskapene til brukeren identiteten kobles til) |
| Funn | — |
| Belegg | L 17.10: migrasjonen og søk i `server/`. K 17.10: `server/tester/medlemskap.test.ts` (DL-U10). |

### `koe.catenda_contract_teams`

Kontraktssiden (TE eller BH) for hvert Catenda-team i et prosjekt. Teamet har `catenda_id()`-formen, som `aktor_team_id` i journalen. `server/autorisasjon.ts` leser prosjektets kontraktsteam med `koe_api.kontraktsteam`, bare for en aktør med aktivt medlemskap uten leserollen (#658).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | Driften setter teamene med skriptet `server/registrering.ts`, som kontrollerer dem mot Catenda-prosjektet og kaller `koe_drift.sett_kontraktsteam`, direkte eller gjennom `koe_drift.registrer_prosjekt` (F-1, #820). Begge sider må ha minst ett team. Skriptet krever `--en-totalentreprenoer`, driftens bekreftelse på at alle TE-teamene hører til samme totalentreprenør (DL-U14). Uten saker erstatter listen teamene; står prosjektet i `koe.prosjekt_med_saker`, kan de bare få nye team (svaret 18.10 i #764). Byttes Catenda-prosjektet, må teamene oppgis på nytt (#836). |
| Data fra Catenda | Delvis. Team-ID-en kommer fra Catenda; kontraktssiden settes av driften. Dataflyt: fra Catenda i C18, C19 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (internal_project_id, team_id). Viser til: internal_project_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.godkjenningspakke.aktor_team_id (uten fremmednøkkel); koe.hendelse.aktor_team_id (uten fremmednøkkel); koe.notat.aktor_team_id (uten fremmednøkkel); koe.vedlegg.lastet_opp_team (uten fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | database/migrasjoner/20261019140000_registrering.sql (`koe_drift.sett_kontraktsteam`, kalt fra `server/registrering.ts`); database/migrasjoner/20261020122000_registrering_bibliotek.sql (`koe_drift.registrer_prosjekt`, kalt fra `server/registrering.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonene og søk i `server/`. K 18.10: `server/tester/registrering.test.ts`. |

### `koe.catenda_project_configs`

Koblingen mellom prosjektet i appen og Catenda-prosjektet, og om den er aktiv (arbeidsvalget 16.10 i #53). Svarer til `catenda_project_configs` i PostgreSQL, uten mappene for webhooken. Synkroniseringen avviser en liste fra et annet Catenda-prosjekt. `server/medlemskap.ts` leser en aktiv kobling med `koe_api.prosjektkobling` (#658, #638), og `koe_api.koblede_prosjekter` gir prosjektene koblet til brukerens Catenda-prosjekter ved innlogging. `koe_api.brukerens_prosjekter`, kalt fra `server/prosjekter.ts`, tar bare med prosjekter med aktiv kobling (#660). Triggeren `koe.catenda_project_configs_kobling_endret` gjør medlemskapene inaktive når koblingen oppheves, slettes eller endres (DL-U10), og setter Catenda-ID-en i synkroniseringsraden til NULL. Den tomme Catenda-ID-en er ikke lov. `topic_board_id` er boardet for saker som opprettes i appen (KT-U4); uten det avviser `koe_api.opprett_sak` saken (#741). `koe_api.opprett_sak` låser raden før den leses, så en ny sak og en ny registrering eller nye kontraktsteam skrives etter hverandre (#868). Triggeren `koe.catenda_project_configs_endret` setter `updated_at` ved hver endring (#618).

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | Driften registrerer koblingen med skriptet `server/registrering.ts`, som kaller `koe_drift.registrer_prosjekt` (F-1, #820). En ny registrering skriver over Catenda-prosjektet og biblioteket og gjør koblingen aktiv. Mappen og boardet skrives over når de er oppgitt. Ellers står de hvis Catenda-prosjektet er det samme, og fjernes hvis det er byttet. Mappen fjernes også når biblioteket er byttet. Har prosjektet saker, avvises bytte av Catenda-prosjekt, og uten saker krever et bytte nye kontraktsteam (#836). |
| Data fra Catenda | Delvis. ID-ene til Catenda-prosjektet og boardet. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (internal_project_id); unik (catenda_project_id). Viser til: internal_project_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ingen kjente. |
| Skrives av | database/migrasjoner/20261020122000_registrering_bibliotek.sql (`koe_drift.registrer_prosjekt`, kalt fra `server/registrering.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonene og søk i `server/`. K 18.10: `server/tester/jobber.test.ts` og `server/tester/registrering.test.ts`. |

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
| Skrives av | database/migrasjoner/20261018060000_innloggingslaas.sql (`koe_api.deaktiver_ved_innlogging`, kalt fra `server/medlemskap.ts`); database/migrasjoner/20261020040000_deaktiverte_medlemmer.sql (`koe_api.synkroniser_medlemskap`, innført i `20261016140000_medlemskap.sql`, kalt fra `server/medlemskap.ts`); database/migrasjoner/20261020170000_catenda_kobling.sql (`koe_drift.koble_catenda_identitet`, som flytter fraværet til brukeren identiteten kobles til) |
| Funn | — |
| Belegg | L 16.10: migrasjonen og `server/tester/medlemskap.test.ts`. |

### `koe.app_membership_sync`

Når medlemslisten for prosjektet sist ble hentet, og fra hvilket Catenda-prosjekt (DL-U7). En eldre liste skriver ikke over en nyere. Alderen leses av `koe_api.medlemsliste_alder` (B-04 punkt 4), kalt fra `server/autorisasjon.ts` etter at koblingen er kontrollert (#638 punkt 2), også gjennom `ferskeMedlemmer` for hvert prosjekt i lista i `server/prosjekter.ts` (#660). Svarer til `app_membership_sync` i PostgreSQL. Etter at koblingen er opphevet, slettet eller endret, har raden ingen Catenda-ID (NULL) og tidspunktet for endringen, så ingen liste fra det koblede prosjektet finnes, og en liste hentet før endringen ikke skrives (DL-U10, #726). Den tomme Catenda-ID-en er ikke lov.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.synkroniser_medlemskap`, kalt fra `server/medlemskap.ts`, og triggeren `koe.catenda_project_configs_kobling_endret` når koblingen endres. |
| Data fra Catenda | Delvis. Tidspunktet er når hentingen fra Catenda begynte. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (project_id). Viser til: project_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | ja, ved en ny synkronisering |
| Personopplysninger | Ingen kjente. |
| Skrives av | database/migrasjoner/20261020040000_deaktiverte_medlemmer.sql (`koe_api.synkroniser_medlemskap`, innført i `20261016140000_medlemskap.sql`, kalt fra `server/medlemskap.ts`); database/migrasjoner/20261020000000_synkroniseringsgrense.sql (triggeren `koe.catenda_project_configs_kobling_endret`, innført i `20261017230000_koblingen.sql`) |
| Funn | — |
| Belegg | L 17.10: migrasjonen og `server/tester/medlemskap.test.ts`. K 17.10: DL-U10 i samme test. |

### `koe.sak_metadata`

Saksregisteret: saken, prosjektet og sakstypen. En trigger avviser endring og sletting. Sakslisten leser sakene i prosjektet med journalen gjennom `koe_api.saksliste`, under radsikkerheten, fra `server/saksliste.ts` (#1022).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.opprett_sak`, sammen med `sak_opprettet`, kalt fra `opprettSak` i `server/kommandoer.ts`, som `POST /api/kjerne/saker` kaller (#370), og som `server/hendelser.ts` kaller for en ny topic fra TE i innboksen (KT-U6, #819). |
| Data fra Catenda | Delvis. Saken kan være opprettet fra en topic i Catenda (KT-U6, C22). Dataflyt: fra Catenda i C22 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (sak_id); unik (sak_id, prosjekt_id). Viser til: prosjekt_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION); created_by → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.godkjenningspakke.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.hendelse.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.innkommende_behandling.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.jobb.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.kjernebuffer.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.notat.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.sak_catenda_topic.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.vedlegg.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | `created_by` peker på en bruker. |
| Skrives av | database/migrasjoner/20261020130000_innkommende_behandling.sql (`koe_api.opprett_sak`, innført i `20261016120000_kommandoer.sql`, kalt fra `server/kommandoer.ts`) |
| Funn | — |
| Belegg | L 16.10: migrasjonene og `server/kommandoer.ts`. K 16.10: `server/tester/kommandoer.test.ts`. L 20.10: `20261020180000_saksliste.sql`. K 20.10: `server/tester/saksliste.test.ts` mot testbasen. |

### `koe.hendelse`

Journalen: ett dokument per brev, med teksten slik den ble sendt. En trigger avviser endring og sletting. Teamet står bare når det er entydig (DL-U4). Sakslisten leser hendelsene i prosjektet gjennom `koe_api.saksliste` og regner statusen og tallene i kjernen ved lesing; ingen oppsummering lagres (#1022).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.opprett_sak` skriver `sak_opprettet` og `koe_api.skriv_hendelse` de andre brevene, kalt fra `server/kommandoer.ts`. `koe_api.skriv_hendelse` kalles fra `POST /api/kjerne/saker/<sak_id>/kommandoer` (#661), og `koe_api.opprett_sak` fra `POST /api/kjerne/saker` (#370). |
| Data fra Catenda | Delvis. Sakstittelen i `sak_opprettet` kan være tittelen på en topic i Catenda (KT-U6, C22). Dataflyt: fra Catenda i C22 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (event_id); unik (event_id, sak_id, prosjekt_id); unik (sak_id, versjon). Viser til: (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); aktor_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION); aktor_team_id → koe.catenda_contract_teams.team_id (uten fremmednøkkel); refererer_til_event_id → koe.hendelse.event_id (uten fremmednøkkel). Vises til fra: koe.kvittering.(event_id, sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.leveringsoppdrag.(event_id, sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.notat.refererer_til_event_id (uten fremmednøkkel); koe.vedlegg.(bundet_av_event_id, sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. Journalen er kilden alt annet regnes fra. |
| Personopplysninger | `aktor_id` peker på en bruker. Fritekst i `data` kan inneholde personopplysninger. |
| Skrives av | database/migrasjoner/20261020130000_innkommende_behandling.sql (`koe_api.opprett_sak`, innført i `20261016120000_kommandoer.sql`); database/migrasjoner/20261020080000_skriveprosedyrer.sql (`koe_api.skriv_hendelse`, innført i `20261016120000_kommandoer.sql`); server/kommandoer.ts |
| Funn | — |
| Belegg | L 16.10: migrasjonene og `server/kommandoer.ts`. K 16.10: `server/tester/kommandoer.test.ts`. L 20.10: `20261020180000_saksliste.sql`. K 20.10: `server/tester/saksliste.test.ts` mot testbasen. |

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

### `koe.jobb`

Jobbene jobbkjøreren gjør etter commit (B-07, arbeidsvalget 18.10 i #741). En sak fra appen får jobben `catenda_topic` i samme transaksjon, med boardet, Catenda-prosjektet og sakstittelen frosset (KT-U3, invariant 6). En sak fra en topic i innboksen får ingen jobb; den kobles til topicen (W-1b.1, #819). Et brev med tekst fra appen får jobben `levering` for leveringsoppdraget, lagt inn av triggeren `koe.leveringsoppdrag_levering` (#371). Jobben har en lease mens den gjøres, og tilstanden `venter`, `utfoert` eller `parkert`. Bare kjøreveien, `koe_jobbkjoerer`, ser og endrer jobbene; kjøretiden har ingen rett på tabellen.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.opprett_sak` og triggeren `koe.leveringsoppdrag_levering`, og endres av `koe_api.hent_jobb`, `koe_api.kvitter_topic`, `koe_api.kvitter_levering`, `koe_api.registrer_jobbfeil` og driftsverktøyet `koe_api.start_jobb_paa_nytt`. |
| Data fra Catenda | Delvis. ID-ene til Catenda-prosjektet og boardet. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (jobb_id); unik indeks (lease) WHERE ([lease] IS NOT NULL); unik indeks (leveringsoppdrag_id) WHERE ([leveringsoppdrag_id] IS NOT NULL); unik indeks (sak_id) WHERE ([jobbtype]=N'catenda_topic'). Viser til: (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); siste_forsoek → koe.jobbforsoek.forsoek_id (fremmednøkkel, ON DELETE NO ACTION); (leveringsoppdrag_id, prosjekt_id) → koe.leveringsoppdrag.(id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.jobbforsoek.jobb_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Sakstittelen kan inneholde personopplysninger. |
| Skrives av | database/migrasjoner/20261020130000_innkommende_behandling.sql (`koe_api.opprett_sak`, innført i `20261016120000_kommandoer.sql`, kalt fra `server/kommandoer.ts`); database/migrasjoner/20261018120000_levering.sql (prosedyrene for jobbkjøreren, innført i `20261018100000_jobber.sql`, kalt fra `server/jobber.ts`); database/migrasjoner/20261020121000_oppretter_tid_og_oppdragsnoekkel.sql (driftsverktøyet `koe_api.start_jobb_paa_nytt`, innført i `20261018100000_jobber.sql`); database/migrasjoner/20261020060000_vedleggslevering_innstramming.sql (triggeren `koe.leveringsoppdrag_levering`, innført i `20261018120000_levering.sql`, ved skrivingen av hendelsen); database/migrasjoner/20261020060000_vedleggslevering_innstramming.sql (`koe_api.forny_lease`, kalt fra `server/jobber.ts`); database/migrasjoner/20261020120000_vedleggsbinding_og_tom_id.sql (`koe_api.kvitter_topic` og `koe_api.kvitter_levering`, som avslutter forsøket, kalt fra `server/jobber.ts`); database/migrasjoner/20261020020000_vedleggslevering.sql (`koe_api.registrer_jobbfeil`, som avslutter forsøket gjennom `koe_api.avslutt_forsoek`, kalt fra `server/jobber.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/jobber.test.ts`. |

### `koe.jobbforsoek`

Hvert forsøk, hver feil, hver kvittering og hver omstart av en jobb for seg (LV-U1, invariant 7 og 8). Forsøket har leasens ID og lagres når utfallet er kjent: `utfoert`, `feilet`, `usikkert`, `avvist`, `kobling_endret` eller `startet_paa_nytt`, med SID-en til innloggingen som startet jobben på nytt (`sid:0x…`, eller `driften uten SID`). Raden endres ikke.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Prosedyrene for jobbkjøreren i `database/migrasjoner/20261018100000_jobber.sql`, og driftsverktøyet `koe_api.start_jobb_paa_nytt`, sist definert i `20261020121000_oppretter_tid_og_oppdragsnoekkel.sql`. |
| Data fra Catenda | Nei. Meldingen er fra klienten i `server/catenda.ts`, uten svarkropp. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (forsoek_id). Viser til: jobb_id → koe.jobb.jobb_id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.brevdokument.forsoek_id (uten fremmednøkkel); koe.jobb.siste_forsoek (fremmednøkkel, ON DELETE NO ACTION); koe.leveringskvittering.forsoek_id (uten fremmednøkkel); koe.vedleggskvittering.forsoek_id (uten fremmednøkkel). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Innloggingen til den i driften som startet en jobb på nytt. |
| Skrives av | database/migrasjoner/20261018120000_levering.sql (`koe_api.hent_jobb`); database/migrasjoner/20261020121000_oppretter_tid_og_oppdragsnoekkel.sql (driftsverktøyet `koe_api.start_jobb_paa_nytt`, innført i `20261018100000_jobber.sql`); database/migrasjoner/20261020020000_vedleggslevering.sql (`koe_api.registrer_jobbfeil`, gjennom `koe_api.avslutt_forsoek`); database/migrasjoner/20261020120000_vedleggsbinding_og_tom_id.sql (`koe_api.kvitter_topic`, innført i `20261018100000_jobber.sql`, som avslutter forsøket); database/migrasjoner/20261020120000_vedleggsbinding_og_tom_id.sql (`koe_api.kvitter_levering`, innført i `20261018120000_levering.sql`, som avslutter forsøket) |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/jobber.test.ts`. |

### `koe.leveringsoppdrag`

Leveringsoppdraget for et brev (LV-U1, B-03), frosset i samme transaksjon som brevet. Den sammensatte fremmednøkkelen holder det i brevets sak og prosjekt.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.skriv_hendelse`, med brevet `dokument_registrert` i samme transaksjon, kalt fra `skrivHendelse` i `server/kommandoer.ts`, fra `POST /api/kjerne/saker/<sak_id>/kommandoer` (#661). |
| Data fra Catenda | Nei, men oppdraget gjelder en levering til Catenda. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (id); unik (dokumentnoekkel); unik (event_id); unik (id, prosjekt_id). Viser til: (event_id, sak_id, prosjekt_id) → koe.hendelse.(event_id, sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.brevdokument.(leveringsoppdrag_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.jobb.(leveringsoppdrag_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.leveringskvittering.(leveringsoppdrag_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); koe.vedleggskvittering.(leveringsoppdrag_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Innholdet er brevet og kan inneholde personopplysninger. |
| Skrives av | database/migrasjoner/20261020080000_skriveprosedyrer.sql (`koe_api.skriv_hendelse`, innført i `20261016120000_kommandoer.sql`, kalt fra `server/kommandoer.ts`) |
| Funn | — |
| Belegg | L 16.10: migrasjonene og `server/kommandoer.ts`. K 16.10: `server/tester/kommandoer.test.ts`. |

### `koe.kvittering`

Kvitteringen per kommando (invariant 4, #418): kommando-ID-en klienten gir, summen av innholdet serveren regner ut, og saken og brevet kommandoen ga. Lagres i samme transaksjon som brevet. Nøkkelen er prosjektet, aktøren og kommando-ID-en, så kvitteringen gjelder aktøren. Samme ID med samme sum gir brevet fra kvitteringen, og samme ID med en annen sum avvises (51410).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.skriv_hendelse` og `koe_api.opprett_sak`, og leses av `koe_api.kvittering`, kalt fra `skrivHendelse` og `opprettSak` i `server/kommandoer.ts`, fra `POST /api/kjerne/saker` og `POST /api/kjerne/saker/<sak_id>/kommandoer`. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (prosjekt_id, aktor_id, kommando_id); unik (event_id). Viser til: aktor_id → koe.app_users.id (uten fremmednøkkel); (event_id, sak_id, prosjekt_id) → koe.hendelse.(event_id, sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.toemmingsvern.(kvittering_prosjekt_id, kvittering_aktor_id, kvittering_kommando_id) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Aktørens `app_users.id`. |
| Skrives av | database/migrasjoner/20261020080000_skriveprosedyrer.sql (`koe_api.skriv_hendelse`, kalt fra `server/kommandoer.ts`); database/migrasjoner/20261020130000_innkommende_behandling.sql (`koe_api.opprett_sak`, kalt fra `server/kommandoer.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonen og `server/kommandoer.ts`. K 18.10: `server/tester/kommandoer.test.ts`. |

### `koe.brevdokument`

PDF-en av brevet i et leveringsoppdrag (#371 del 2, merknaden 12.10): bytene og SHA-256 av dem, lagret én gang per oppdrag før første opplasting. Kjøreren har kontrollert at PDF-en gjengir den frosne brevteksten tro (LV-U2), og laster opp den lagrede. Basen regner summen etter. Raden endres ikke, og bare kjøreveien, `koe_jobbkjoerer`, kan legge inn en.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.lagre_brevdokument`, kalt av jobbkjøreren i `server/jobber.ts` med PDF-en når samme prosedyre uten PDF ikke gir noen lagret for oppdraget (#795 punkt 4, #805 punkt 5). |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (leveringsoppdrag_id). Viser til: (leveringsoppdrag_id, prosjekt_id) → koe.leveringsoppdrag.(id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); forsoek_id → koe.jobbforsoek.forsoek_id (uten fremmednøkkel). Vises til fra: koe.toemmingsvern.brevdokument_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. Det er PDF-en som ble levert. |
| Personopplysninger | Brevteksten kan ha navn på personer i prosjektet. |
| Skrives av | database/migrasjoner/20261020020000_vedleggslevering.sql (`koe_api.lagre_brevdokument`, innført i `20261018140000_brevdokument.sql`, kalt fra `server/jobber.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/levering.test.ts`. |

### `koe.vedlegg`

Mellomlageret for vedlegg (V-1, del av #790): filen, filnavnet, størrelsen og SHA-256 av bytene, som basen regner etter. Filen ligger her til Catenda har kvittert for den (spørsmål 1 A i #790, 18.10). Et ubundet vedlegg er et utkast som bare teamet som lastet det opp, ser og sletter. Når en hendelse viser til det, får det `bundet_av_event_id` og ses av begge kontraktssider; et bundet vedlegg slettes ikke. `koe_api.bind_vedlegg` binder vedleggene hendelsen viser til, i samme transaksjon som hendelsen (V-2). Når Catenda har kvittert for dokumentet, setter `koe_api.kvitter_vedlegg` innholdet til NULL og beholder filnavnet og summen (LV-U12, V-3). Triggeren `koe.vedlegg_uten_endring` slipper bare gjennom de to endringene.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.lagre_vedlegg` og `koe_api.slett_vedlegg`, kalt fra `server/vedlegg.ts`, `koe_api.bind_vedlegg`, kalt fra `server/kommandoer.ts`, og `koe_api.kvitter_vedlegg`, kalt av jobbkjøreren i `server/jobber.ts`. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (vedlegg_id). Viser til: (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); lastet_opp_av → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION); (bundet_av_event_id, sak_id, prosjekt_id) → koe.hendelse.(event_id, sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); lastet_opp_team → koe.catenda_contract_teams.team_id (uten fremmednøkkel). Vises til fra: koe.toemmingsvern.vedlegg_id (fremmednøkkel, ON DELETE NO ACTION); koe.vedleggskvittering.vedlegg_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. Før levering finnes filen bare her. |
| Personopplysninger | Filen og filnavnet kan ha navn på personer i prosjektet. |
| Skrives av | database/migrasjoner/20261018193000_vedlegg.sql (`koe_api.lagre_vedlegg` og `koe_api.slett_vedlegg`, kalt fra `server/vedlegg.ts`); database/migrasjoner/20261019170000_vedleggsbinding.sql (`koe_api.bind_vedlegg`, kalt fra `server/kommandoer.ts`); database/migrasjoner/20261020120000_vedleggsbinding_og_tom_id.sql (`koe_api.kvitter_vedlegg`, innført i `20261020020000_vedleggslevering.sql`, kalt fra `server/jobber.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonene. K 18.10: `server/tester/vedlegg.test.ts`. |

### `koe.dagmulktssats`

Dagmulktssatsen i prosjektet, som fristdagene verdsettes med i fullmakten (GFK-06). Uten rad mangler satsen, og fristdagene kan ikke verdsettes (B-06). Driften setter den opp.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Driften, som eier. Lest av `koe_api.dagmulktssats` fra `server/godkjenning.ts`. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (prosjekt_id). Viser til: prosjekt_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. Kontrakten er kilden. |
| Personopplysninger | Ingen. |
| Skrives av | database/migrasjoner/20261019110000_godkjenning.sql (tabellen); radene skrives av driften som eier |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/godkjenning.test.ts`. |

### `koe.godkjenningspakke`

Et svar fra byggherren til intern godkjenning (S-1a, #818): brevet, grunnlaget fullmakten ble regnet av, verdien kjeden ble avledet av, saksbehandleren og teamet. Pakken er et utkast som bare teamet som laget den, ser, og uten team finnes den ikke (AGENTS.md). Den endres ikke; en ny pakke kan erstatte en returnert eller trukket.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.lag_godkjenningspakke`, kalt fra `server/godkjenning.ts`. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (pakke_id); unik (pakke_id, prosjekt_id, aktor_team_id); unik indeks (forrige_pakke_id) WHERE ([forrige_pakke_id] IS NOT NULL). Viser til: (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); forrige_pakke_id → koe.godkjenningspakke.pakke_id (fremmednøkkel, ON DELETE NO ACTION); aktor_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION); aktor_team_id → koe.catenda_contract_teams.team_id (uten fremmednøkkel). Vises til fra: koe.godkjenningshandling.(pakke_id, prosjekt_id, aktor_team_id) (fremmednøkkel, ON DELETE NO ACTION); koe.godkjenningssteg.(pakke_id, prosjekt_id, aktor_team_id) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. |
| Personopplysninger | Saksbehandleren (`aktor_id`) og innholdet i svaret. |
| Skrives av | database/migrasjoner/20261020190000_godkjenner_tilgang.sql (`koe_api.lag_godkjenningspakke`, innført i `20261019110000_godkjenning.sql`, kalt fra `server/godkjenning.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/godkjenning.test.ts`. |

### `koe.godkjenningssteg`

Godkjennerne i en pakke i kjedens rekkefølge, avledet av hierarkiet i `koe.hr_kopi` da pakken ble laget (GFK-U8, GFK-U10). Endres ikke.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.lag_godkjenningspakke`, kalt fra `server/godkjenning.ts`. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (pakke_id, steg); unik (pakke_id, godkjenner_id). Viser til: (pakke_id, prosjekt_id, aktor_team_id) → koe.godkjenningspakke.(pakke_id, prosjekt_id, aktor_team_id) (fremmednøkkel, ON DELETE NO ACTION); godkjenner_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.godkjenningshandling.(pakke_id, steg) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. |
| Personopplysninger | Godkjennerne (`godkjenner_id`). |
| Skrives av | database/migrasjoner/20261020190000_godkjenner_tilgang.sql (`koe_api.lag_godkjenningspakke`, innført i `20261019110000_godkjenning.sql`, kalt fra `server/godkjenning.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/godkjenning.test.ts`. |

### `koe.godkjenningshandling`

Hver godkjenning, retur og trekking av en pakke, i rekkefølge. En godkjenning fryser rollen (`fullmakt_tittel`) og grensen godkjenneren hadde i `koe.rolle` da den ble gitt, så den står om rollen endres senere (B-04 punkt 2). Endres ikke.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.registrer_godkjenningshandling`, kalt fra `server/godkjenning.ts`. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (pakke_id, loepenr); unik indeks (pakke_id) WHERE ([handling]<>N'godkjent'); unik indeks (pakke_id, steg) WHERE ([handling]=N'godkjent'). Viser til: (pakke_id, prosjekt_id, aktor_team_id) → koe.godkjenningspakke.(pakke_id, prosjekt_id, aktor_team_id) (fremmednøkkel, ON DELETE NO ACTION); (pakke_id, steg) → koe.godkjenningssteg.(pakke_id, steg) (fremmednøkkel, ON DELETE NO ACTION); aktor_id → koe.app_users.id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.toemmingsvern.(godkjenningshandling_pakke_id, godkjenningshandling_loepenr) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei. |
| Personopplysninger | Den som handlet (`aktor_id`) og begrunnelsen for en retur. |
| Skrives av | database/migrasjoner/20261020190000_godkjenner_tilgang.sql (`koe_api.registrer_godkjenningshandling`, innført i `20261019110000_godkjenning.sql`, kalt fra `server/godkjenning.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/godkjenning.test.ts`. |

### `koe.leveringskvittering`

Kvitteringen for hver obligatoriske operasjon i leveringen av et brev (#371 del 1, invariant 7): `dokument` når dokumentet ligger i biblioteket, og `dokumentreferanse` når referansen står på topicen. Brevet er levert når begge radene finnes (B-03, arbeidsvalget 18.10 i #371). Et registrert brev har ingen rader (LV-U11); vedleggene kvitteres i `koe.vedleggskvittering`. Raden har leasen og ID-en Catenda ga, og endres ikke. Bare kjøreveien, `koe_jobbkjoerer`, kan legge inn en rad. Kjøretiden leser tidspunktet for `dokumentreferanse` som «levert» i visningen av saken (`lesOppdrag` i `server/lager.ts`, #764).

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.kvitter_dokument` og `koe_api.kvitter_levering`, kalt av jobbkjøreren i `server/jobber.ts`. |
| Data fra Catenda | Ja, ID-ene er Catendas. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (leveringsoppdrag_id, operasjon). Viser til: (leveringsoppdrag_id, prosjekt_id) → koe.leveringsoppdrag.(id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); (leveringsoppdrag_id, forutsetning) → koe.leveringskvittering.(leveringsoppdrag_id, operasjon) (fremmednøkkel, ON DELETE NO ACTION); forsoek_id → koe.jobbforsoek.forsoek_id (uten fremmednøkkel). Vises til fra: koe.toemmingsvern.(leveringskvittering_oppdrag_id, leveringskvittering_operasjon) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Nei. |
| Skrives av | database/migrasjoner/20261020120000_vedleggsbinding_og_tom_id.sql (`koe_api.kvitter_dokument`, innført i `20261018120000_levering.sql`, kalt fra `server/jobber.ts`); database/migrasjoner/20261020120000_vedleggsbinding_og_tom_id.sql (`koe_api.kvitter_levering`, innført i `20261018120000_levering.sql`, kalt fra `server/jobber.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/levering.test.ts`. |

### `koe.vedleggskvittering`

Kvitteringen for hver operasjon i leveringen av et vedlegg (V-3, del av #790, invariant 7): `dokument` når vedlegget ligger i biblioteket, og `dokumentreferanse` når referansen står på topicen. Kvitteringen gjelder vedlegget, ikke oppdraget, så et vedlegg et senere brev viser til igjen, leveres ikke på nytt. Raden har leasen, oppdraget som leverte og ID-en Catenda ga, og endres ikke. Bare kjøreveien, `koe_jobbkjoerer`, kan legge inn en rad. `koe_api.kvitter_levering` kvitterer leveringen som fullført først når hvert vedlegg i brevet har en referanse.

| Felt | Innhold |
| --- | --- |
| Type | transaksjon |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.kvitter_vedlegg`, kalt av jobbkjøreren i `server/jobber.ts`. |
| Data fra Catenda | Ja, ID-ene er Catendas. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (vedlegg_id, operasjon). Viser til: vedlegg_id → koe.vedlegg.vedlegg_id (fremmednøkkel, ON DELETE NO ACTION); (vedlegg_id, forutsetning) → koe.vedleggskvittering.(vedlegg_id, operasjon) (fremmednøkkel, ON DELETE NO ACTION); (leveringsoppdrag_id, prosjekt_id) → koe.leveringsoppdrag.(id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION); forsoek_id → koe.jobbforsoek.forsoek_id (uten fremmednøkkel). Vises til fra: koe.toemmingsvern.(vedleggskvittering_vedlegg_id, vedleggskvittering_operasjon) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Nei. |
| Skrives av | database/migrasjoner/20261020120000_vedleggsbinding_og_tom_id.sql (`koe_api.kvitter_vedlegg`, innført i `20261020020000_vedleggslevering.sql`, kalt fra `server/jobber.ts`) |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/levering.test.ts`. |

### `koe.sak_catenda_topic`

Sakens topic i Catenda, med boardet. Én rad per sak, som bare kan legges til: topicen lages etter at saken er lagret, og saksraden er uforanderlig. `koe_api.leveringsmaal` leser den, og leveringsoppdraget fryser topicen, eller null uten rad (F0b-7, #661). Samme topic hører ikke til to saker (#741 punkt 17). En sak fra en topic i Catenda kobles til topicen i transaksjonen som oppretter saken (W-1b.1, #819). Bare kjøreveien, `koe_jobbkjoerer`, kan legge inn en rad.

| Felt | Innhold |
| --- | --- |
| Type | grunndata |
| Status | uavklart |
| Hvor fra appen lagres og redigeres | `koe_api.kvitter_topic`, kalt av jobbkjøreren i `server/jobber.ts` etter at topicen er laget i Catenda (#741), og `koe_api.koble_topic`, kalt bare fra `koe_api.opprett_sak` når saken opprettes fra en topic i innboksen (W-1b.1, #819). |
| Data fra Catenda | Ja, ID-ene er Catendas. Dataflyt: fra Catenda i C22 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (sak_id); unik (catenda_topic_id). Viser til: (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.toemmingsvern.sak_catenda_topic_sak_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Nei. |
| Skrives av | database/migrasjoner/20261020120000_vedleggsbinding_og_tom_id.sql (`koe_api.kvitter_topic`, innført i `20261018100000_jobber.sql`, kalt fra `server/jobber.ts`); database/migrasjoner/20261020130000_innkommende_behandling.sql (`koe_api.koble_topic`, kalt fra `koe_api.opprett_sak`) |
| Funn | — |
| Belegg | L 17.10: `database/migrasjoner/20261017233000_leveringsmaal.sql`. K 18.10: `server/tester/jobber.test.ts`. |

### `koe.innkommende_hendelse`

Innboksen for webhooken fra Catenda (W-1a, #819). Hver hendelse lagres rå, med kilden, `event.id` og `event.type`, før svaret 200, og samme ID fra samme kilde lagres én gang (INT-02). Prosjektet og saken er ikke avgjort ved mottaket, så tabellen har ingen `prosjekt_id` og ingen radsikkerhet; kjøretiden har ingen rett på den og skriver med `koe_api.motta_hendelse`. Raden kan ikke endres eller slettes. Hendelsene behandles av `server/hendelser.ts`, og utfallet står i `koe.innkommende_behandling` (W-1b.1).

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.motta_hendelse`, kalt av webhooken i `server/webhook.ts`. |
| Data fra Catenda | Ja, hele kroppen er Catendas. Dataflyt: fra Catenda i C21 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (id); unik indeks (kilde, hendelse_id). Vises til fra: koe.innkommende_behandling.innkommende_hendelse_id (fremmednøkkel, ON DELETE NO ACTION); koe.innkommende_forsoek.innkommende_hendelse_id (fremmednøkkel, ON DELETE NO ACTION); koe.toemmingsvern.innkommende_hendelse_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Ja: kroppen har navnet og e-postadressen til den som laget topicen i Catenda. |
| Skrives av | database/migrasjoner/20261020124000_innkommende_hendelse.sql (`koe_api.motta_hendelse`, kalt fra `server/webhook.ts`) |
| Funn | INT-01, INT-02 |
| Belegg | L 19.10: migrasjonen. K 19.10: `server/tester/webhook.test.ts`. |

### `koe.innkommende_behandling`

Utfallet for hver hendelse i innboksen, én rad når behandlingen er ferdig (W-1b.1, #819). En hendelse uten rad er ikke behandlet. Bare en ny topic laget av TE gir en sak, med topicens tittel (KT-U6); en topic fra BH gir ingen sak (KT-U7), og heller ikke en topic som alt hører til en sak eller er laget av integrasjonen (#741 punkt 17). Saken og prosjektet står bare når utfallet er `sak_opprettet`, og prosjektet når koblingen til Catenda-prosjektet og boardet ga det. Kjøretiden har ingen rett på tabellen og skriver med `koe_api.registrer_behandling`. Boardet topicen ble slått opp på, står med utfallet, så kommentaren skrives på samme board. Raden kan ikke endres eller slettes; kommentaren tilbake til topicen (W-1b.2) står i `koe.topic_kommentar` og endrer ikke utfallet.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.registrer_behandling`, kalt av `behandleEnHendelse` i `server/jobber.ts` med utfallet fra `server/hendelser.ts`. |
| Data fra Catenda | Delvis. ID-en til topicen er Catendas. Dataflyt: fra Catenda i C22; til Catenda i C23 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (innkommende_hendelse_id). Viser til: innkommende_hendelse_id → koe.innkommende_hendelse.id (fremmednøkkel, ON DELETE NO ACTION); (sak_id, prosjekt_id) → koe.sak_metadata.(sak_id, prosjekt_id) (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.toemmingsvern.innkommende_behandling_id (fremmednøkkel, ON DELETE NO ACTION); koe.topic_kommentar.innkommende_hendelse_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Nei. `melding` er en fast feiltekst fra serveren. |
| Skrives av | database/migrasjoner/20261020140000_innkommende_forsoek_og_kommentar.sql (`koe_api.registrer_behandling`, innført i `20261020130000_innkommende_behandling.sql`, kalt fra `server/jobber.ts`) |
| Funn | — |
| Belegg | L 19.10: `database/migrasjoner/20261020130000_innkommende_behandling.sql`, `database/migrasjoner/20261020140000_innkommende_forsoek_og_kommentar.sql` og `server/hendelser.ts`. |

### `koe.innkommende_forsoek`

Forsøkene uten utfall for en hendelse i innboksen (W-1b.2, #819), med steget: `behandling` eller `kommentar`. Et forsøk lagres når Catenda eller basen ikke svarte. Hendelsen venter da før neste forsøk, lenger for hvert forsøk (30 s, dobbelt for hvert, høyst en time), og løkka går videre, så én hendelse ikke stenger innboksen (#963). `topic_ikke_funnet` merker forsøkene der Catenda ikke fant topicen; bare de teller mot grensen for `ugyldig_hendelse`. `koe_api.neste_innkommende` og `koe_api.neste_kommentar` hopper over en hendelse som venter. Kjøretiden har ingen rett på tabellen og skriver med `koe_api.registrer_innkommende_forsoek`. Raden kan ikke endres eller slettes.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.registrer_innkommende_forsoek`, kalt av `behandleEnHendelse` og `skrivEnKommentar` i `server/jobber.ts`. |
| Data fra Catenda | Delvis. `melding` kan være feilmeldingen fra Catenda. Dataflyt: fra Catenda i C22, C23 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (id). Viser til: innkommende_hendelse_id → koe.innkommende_hendelse.id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.toemmingsvern.innkommende_forsoek_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Nei. `melding` er feilklassen og meldingen fra Catenda eller basen, uten saksdata. |
| Skrives av | database/migrasjoner/20261020140000_innkommende_forsoek_og_kommentar.sql (`koe_api.registrer_innkommende_forsoek`, kalt fra `server/jobber.ts`) |
| Funn | — |
| Belegg | L 19.10: migrasjonen, `server/hendelser.ts` og `server/jobber.ts`. |

### `koe.topic_kommentar`

Kvitteringen for kommentaren løkka skrev tilbake på topicen i Catenda (W-1b.2, #819), én rad per utfall. Utfallet `sak_opprettet` gir en kommentar med lenke og saksnummer (KT-U6), `topic_fra_bh` (KT-U7) og `sakstype_ikke_stoettet` (arbeidsvalget under OV-U1 i #819) en kommentar om hvorfor ingen sak er opprettet. Kommentarene på topicen leses først, og står teksten der alt, kvitteres den, så samme tekst skrives én gang. Kjøretiden har ingen rett på tabellen og skriver med `koe_api.kvitter_kommentar`. Raden kan ikke endres eller slettes.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.kvitter_kommentar`, kalt av `skrivEnKommentar` i `server/jobber.ts` etter at kommentaren er funnet eller skrevet i Catenda. |
| Data fra Catenda | Ja, ID-en til kommentaren er Catendas. Dataflyt: fra Catenda i C23 (arket Dataflyt). |
| Relasjoner | Nøkler: primærnøkkel (innkommende_hendelse_id). Viser til: innkommende_hendelse_id → koe.innkommende_behandling.innkommende_hendelse_id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.toemmingsvern.topic_kommentar_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei |
| Personopplysninger | Nei. |
| Skrives av | database/migrasjoner/20261020140000_innkommende_forsoek_og_kommentar.sql (`koe_api.kvitter_kommentar`, kalt fra `server/jobber.ts`) |
| Funn | — |
| Belegg | L 19.10: migrasjonen, `server/hendelser.ts` og `server/jobber.ts`. |

### `koe.prosjekt_med_saker`

Prosjektene som har minst én sak. Radsikkerheten skjuler sakene også for eieren, så `koe_drift.sett_kontraktsteam` leser her om kontraktsteamene bare kan få nye team (svaret 18.10 i #764, F-1, #820). Raden kan ikke endres eller slettes. Hadde `koe.sak_metadata` rader da migrasjonen ble anvendt, ble hvert prosjekt ført, fordi sakene ikke kunne leses.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Triggeren `koe.sak_metadata_prosjekt_med_saker`, i samme transaksjon som den første saken i prosjektet. |
| Data fra Catenda | Nei. Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (prosjekt_id). Viser til: prosjekt_id → koe.projects.id (fremmednøkkel, ON DELETE NO ACTION). Vises til fra: koe.toemmingsvern.prosjekt_med_saker_id (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | nei; sakene kan ikke leses uten kontekst. |
| Personopplysninger | Ingen kjente. |
| Skrives av | database/migrasjoner/20261019140000_registrering.sql (triggeren `koe.sak_metadata_prosjekt_med_saker`) |
| Funn | — |
| Belegg | L 18.10: migrasjonen. K 18.10: `server/tester/registrering.test.ts`. |

### `koe.skrivetidspunkt`

Tidspunktet basen ga for skrivingen i en transaksjon, med økt-ID-en som nøkkel, og transaksjonen og når økta logget inn, fordi transaksjons-ID-en begynner på nytt etter en omstart. `koe_api.skriv_hendelse` godtar bare dette tidspunktet på brevet, i samme transaksjon og økt (DL-U3, svaret 16.10 i #53), og bare i 30 sekunder etter at det ble gitt (#599). Kjøretiden har ingen rett på tabellen.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | `koe_api.skrivetidspunkt` fører raden, og `koe_api.skriv_hendelse` sletter den i samme transaksjon. Kalt fra `skrivHendelse` i `server/kommandoer.ts`, som ruller tilbake når den ikke skriver. En kaller som committer uten å skrive, etterlater raden; `skrivetidspunkt` erstatter den neste gang samme økt-ID fører et tidspunkt. Tabellen har høyst én rad per økt-ID. |
| Data fra Catenda | Nei Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: primærnøkkel (oekt). Ingen relasjoner til andre tabeller. |
| Kan bygges opp igjen | ja. Raden brukes bare i transaksjonen som førte den. |
| Personopplysninger | Ingen kjente. |
| Skrives av | database/migrasjoner/20261016170000_kommandoform.sql (`koe_api.skrivetidspunkt`); database/migrasjoner/20261020080000_skriveprosedyrer.sql (`koe_api.skriv_hendelse`, innført i `20261016120000_kommandoer.sql`) |
| Funn | — |
| Belegg | L 16.10: migrasjonen. K 16.10: `server/tester/kommandoer.test.ts`. K 18.10: `server/tester/skrivetidspunkt.test.ts` (grensen på 30 sekunder). |

### `koe.toemmingsvern`

Vernet mot TRUNCATE for de uforanderlige tabellene ingen annen fremmednøkkel viser til (#582). TRUNCATE avfyrer ingen trigger, men avvises for en tabell en fremmednøkkel viser til. En nøkkel en tabell har til seg selv, hindrer ikke TRUNCATE. Tabellen kan ikke ha rader (`toemmingsvern_tom`), og kjøretiden har ingen rett på den.

| Felt | Innhold |
| --- | --- |
| Type | teknisk |
| Status | i bruk |
| Hvor fra appen lagres og redigeres | Ingen. Migrasjonen lager tabellen, og skranken avviser hver rad. |
| Data fra Catenda | Nei Dataflyt: ingen kall til Catenda skriver eller leser tabellen. |
| Relasjoner | Nøkler: ingen. Viser til: app_identities_id → koe.app_identities.id (fremmednøkkel, ON DELETE NO ACTION); brevdokument_id → koe.brevdokument.leveringsoppdrag_id (fremmednøkkel, ON DELETE NO ACTION); (godkjenningshandling_pakke_id, godkjenningshandling_loepenr) → koe.godkjenningshandling.(pakke_id, loepenr) (fremmednøkkel, ON DELETE NO ACTION); (kvittering_prosjekt_id, kvittering_aktor_id, kvittering_kommando_id) → koe.kvittering.(prosjekt_id, aktor_id, kommando_id) (fremmednøkkel, ON DELETE NO ACTION); (leveringskvittering_oppdrag_id, leveringskvittering_operasjon) → koe.leveringskvittering.(leveringsoppdrag_id, operasjon) (fremmednøkkel, ON DELETE NO ACTION); innkommende_hendelse_id → koe.innkommende_hendelse.id (fremmednøkkel, ON DELETE NO ACTION); innkommende_behandling_id → koe.innkommende_behandling.innkommende_hendelse_id (fremmednøkkel, ON DELETE NO ACTION); innkommende_forsoek_id → koe.innkommende_forsoek.id (fremmednøkkel, ON DELETE NO ACTION); topic_kommentar_id → koe.topic_kommentar.innkommende_hendelse_id (fremmednøkkel, ON DELETE NO ACTION); prosjekt_med_saker_id → koe.prosjekt_med_saker.prosjekt_id (fremmednøkkel, ON DELETE NO ACTION); sak_catenda_topic_sak_id → koe.sak_catenda_topic.sak_id (fremmednøkkel, ON DELETE NO ACTION); vedlegg_id → koe.vedlegg.vedlegg_id (fremmednøkkel, ON DELETE NO ACTION); (vedleggskvittering_vedlegg_id, vedleggskvittering_operasjon) → koe.vedleggskvittering.(vedlegg_id, operasjon) (fremmednøkkel, ON DELETE NO ACTION). |
| Kan bygges opp igjen | ja. Tabellen har ingen rader. |
| Personopplysninger | Nei. |
| Skrives av | database/migrasjoner/20261020011000_toemmingsvern.sql (lager tabellen; `toemmingsvern_tom` avviser hver rad); database/migrasjoner/20261020021000_vedleggskvittering_vern.sql (legger til fremmednøkkelen til vedleggskvitteringene); database/migrasjoner/20261020130000_innkommende_behandling.sql (legger til fremmednøkkelen til utfallene i innboksen); database/migrasjoner/20261020140000_innkommende_forsoek_og_kommentar.sql (legger til fremmednøklene til forsøkene i innboksen og kommentarkvitteringene) |
| Funn | — |
| Belegg | L 18.10: `database/migrasjoner/20261020011000_toemmingsvern.sql`. L 19.10: `database/migrasjoner/20261020021000_vedleggskvittering_vern.sql`. K 18.10: `server/tester/journal.test.ts`. |

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
| Skrives av | database/migrasjoner/20261016190000_sesjon.sql (`koe_api.opprett_sesjon`, `koe_api.rydd_utloepte`); database/migrasjoner/20261016233000_hashparametre.sql (`koe_api.slett_sesjon`, innført i `20261016190000_sesjon.sql`); database/migrasjoner/20261020170000_catenda_kobling.sql (`koe_drift.koble_catenda_identitet`, som sletter sesjonene til brukeren identiteten flyttes fra) |
| Funn | — |
| Belegg | L 16.10: de to migrasjonene i `skrivere`. K 16.10: `server/tester/sesjon.test.ts`, med plantesten for oppslaget på tokenhashen (#700). |

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
| Belegg | L 16.10: de to migrasjonene i `skrivere`. K 16.10: `server/tester/sesjon.test.ts`, med plantesten for oppslaget på statehashen (#700). |

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
