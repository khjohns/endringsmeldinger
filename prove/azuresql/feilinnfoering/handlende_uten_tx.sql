-- Feilinnføring: kommandoene leser konteksten uten å kreve at den gjelder
-- transaksjonen. Ventet rødt: gjenbrukt forbindelse i tilgang.test.ts, der
-- opprett_sak da når blokkpredikatet (33504) i stedet for kommandoens 51403.

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
