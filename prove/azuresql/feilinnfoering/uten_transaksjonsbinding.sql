-- Feilinnføring: konteksten bindes ikke til transaksjonen. Ventet rødt: gjenbrukt forbindelse i tilgang.test.ts.

CREATE OR ALTER FUNCTION koe_sikkerhet.medlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1;
GO

CREATE OR ALTER FUNCTION koe_sikkerhet.notat_synlig(@prosjekt_id nvarchar(100), @aktor_team_id nvarchar(32))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.team_id = @aktor_team_id
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32))
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2));
GO

CREATE OR ALTER FUNCTION koe_sikkerhet.skriver(
  @prosjekt_id nvarchar(100), @aktor_id nvarchar(36), @aktor_rolle nvarchar(2), @aktor_team_id nvarchar(32))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND TRY_CAST(@aktor_id AS uniqueidentifier) = m.user_id
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.team_id = @aktor_team_id
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32))
   AND t.contract_role = @aktor_rolle
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2));
GO

CREATE OR ALTER FUNCTION koe_sikkerhet.handlende()
RETURNS TABLE AS RETURN
SELECT m.project_id AS prosjekt_id,
       LOWER(CONVERT(nvarchar(36), m.user_id)) AS aktor_id,
       t.contract_role AS side,
       t.team_id AS team_id
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32))
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2));
GO

CREATE OR ALTER FUNCTION koe_sikkerhet.oppretter(@prosjekt_id nvarchar(100), @created_by nvarchar(36))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND TRY_CAST(@created_by AS uniqueidentifier) = m.user_id
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32))
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2));
GO
