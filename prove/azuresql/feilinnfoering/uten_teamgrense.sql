-- Feilinnføring: notatet vises for prosjektets kontraktsteam på siden, uten at det er notatets team. Ventet rødt: interne notater i tilgang.test.ts.

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
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32))
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2))
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO
