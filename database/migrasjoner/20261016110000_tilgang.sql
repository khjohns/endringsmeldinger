-- Radsikkerheten og rettighetene for kjøretiden (#53, del 2, DL-U5). Kilden er
-- prøven (`prove/azuresql/sql/02_sikkerhet.sql` og `04_tilgang.sql`), med tre
-- avvik: et brev kan stå uten team når siden er entydig (DL-U4), mens notatet
-- fortsatt krever team (AGENTS.md); kjøretiden får rettigheter per objekt, ikke
-- per skjema (arbeidsvalg 5); og kjernebufferen er egen tabell (arbeidsvalg 1).
--
-- Konteksten står i SESSION_CONTEXT og er bundet til transaksjonen med `koe_tx`
-- (`server/datalag.ts`). Verdiene leses som nvarchar(4000) og sammenliknes uten
-- å kortes: en CAST til kolonnens lengde ville kuttet en for lang verdi, så
-- `TEX` ble `TE`, og et team med en hale ble et kjent team.
--
-- Predikatene står hver for seg, uten å kalle hverandre, så en feilinnføring kan
-- bytte ut én av dem. Policyen binder dem (SCHEMABINDING), så etter denne fila
-- endres de bare ved at en ny migrasjon tar policyen ned først.

CREATE FUNCTION koe_sikkerhet.medlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- Notatet: handlingsrett (ikke leserolle) og et team som er et av prosjektets
-- kontraktsteam på siden i konteksten. Et notat uten team, eller med et annet
-- team, vises ikke.
CREATE FUNCTION koe_sikkerhet.notat_synlig(@prosjekt_id nvarchar(100), @aktor_team_id nvarchar(32))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.team_id = @aktor_team_id
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000))
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000))
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- Bindende skriving, et andre lag bak kommandoene: handlingsrett, og
-- aktørfeltene i raden er konteksten. Siden må være en side prosjektet har et
-- kontraktsteam på. Teamet er enten et av prosjektets kontraktsteam på den
-- siden, eller tomt både i raden og i konteksten (DL-U4): et brev uten team når
-- konteksten har et, avvises, fordi teamet føres når det er entydig.
-- `@team_kreves` er 1 for notatet, som aldri står uten team (AGENTS.md).
CREATE FUNCTION koe_sikkerhet.skriver(
  @prosjekt_id nvarchar(100), @aktor_id uniqueidentifier, @aktor_rolle nvarchar(2),
  @aktor_team_id nvarchar(32), @team_kreves bit)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.user_id = @aktor_id
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.contract_role = @aktor_rolle
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000))
   AND ((t.team_id = @aktor_team_id
         AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000)))
        OR (@aktor_team_id IS NULL AND SESSION_CONTEXT(N'koe_team') IS NULL AND @team_kreves = 0))
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- Opprettelse av en sak: handlingsrett, `created_by` er aktøren i konteksten,
-- og siden og teamet i konteksten holder etter samme regel som for brevet.
CREATE FUNCTION koe_sikkerhet.oppretter(@prosjekt_id nvarchar(100), @created_by uniqueidentifier)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.user_id = @created_by
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000))
   AND (t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000))
        OR SESSION_CONTEXT(N'koe_team') IS NULL)
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- Én policy for alle tabellene med saksdata. Filterpredikatet gjelder også
-- eieren. Notatet kan endres og slettes bare av forfatteren (MS-05,
-- `NotatRepository.slett`); bufferen og oppdraget skrives bare i prosjektet i
-- konteksten.
CREATE SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.sak_metadata,
  ADD BLOCK PREDICATE koe_sikkerhet.oppretter(prosjekt_id, created_by) ON koe.sak_metadata AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.hendelse,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 0) ON koe.hendelse AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, aktor_team_id) ON koe.notat,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1) ON koe.notat AFTER INSERT,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1) ON koe.notat BEFORE UPDATE,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1) ON koe.notat AFTER UPDATE,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1) ON koe.notat BEFORE DELETE,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.leveringsoppdrag,
  ADD BLOCK PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.leveringsoppdrag AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kjernebuffer,
  ADD BLOCK PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kjernebuffer AFTER INSERT,
  ADD BLOCK PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kjernebuffer AFTER UPDATE
WITH (STATE = ON, SCHEMABINDING = ON);
GO

-- Kjøretiden leser saksdataene gjennom radsikkerheten og skriver bare med
-- kommandoene i `koe_api` (del 3). Rettighetene er per objekt (arbeidsvalg 5),
-- så den leser ikke identitet, medlemskap, kontraktsteam eller historikken, og
-- den har ingen rett i `koe_sikkerhet`.
GRANT SELECT ON koe.sak_metadata TO koe_runtime;
GRANT SELECT ON koe.hendelse TO koe_runtime;
GRANT SELECT ON koe.notat TO koe_runtime;
GRANT SELECT ON koe.leveringsoppdrag TO koe_runtime;
GRANT SELECT ON koe.kjernebuffer TO koe_runtime;
GO

-- En identitet binder issuer og subjekt til én bruker. Bare
-- `koe.resolve_identity` skriver tabellen, og bare med INSERT; en endret
-- binding ville flyttet en person til en annen brukerrad (AGENTS.md).
CREATE TRIGGER koe.app_identities_uforanderlig ON koe.app_identities INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'En identitet endres ikke', 1;
END
GO
