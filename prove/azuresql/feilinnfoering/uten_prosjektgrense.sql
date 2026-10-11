-- Feilinnføring: lesingen kontrollerer medlemskap, men ikke prosjektet i konteksten. Ventet rødt: medlem av begge prosjektene i tilgang.test.ts.

CREATE OR ALTER FUNCTION koe_sikkerhet.medlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
 WHERE m.project_id = @prosjekt_id
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO
