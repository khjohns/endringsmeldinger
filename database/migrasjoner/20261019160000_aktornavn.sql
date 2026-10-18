-- Navnet bak aktørene i en sak, for visningen i `server/lager.ts` (F-1b, #104,
-- DM-08). Journalen bærer `aktor_id`; navnet står bare i `koe.app_users`, som
-- kjøretiden ikke har rett på. Prosedyren gir navnet til aktørene i sakens
-- hendelser og ingen andre. Hendelsene leses under radsikkerheten, så uten
-- aktøren og prosjektet i konteksten, eller for en sak i et annet prosjekt, er
-- svaret tomt. Navnet vises for alle som kan lese saken (oppdragsgiver 18.10, #820).
CREATE PROCEDURE koe_api.aktornavn
  @sak_id nvarchar(36)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT LOWER(CONVERT(nvarchar(36), u.id)) AS aktor_id, u.name AS navn
    FROM koe.app_users u
   WHERE u.id IN (SELECT h.aktor_id FROM koe.hendelse h WHERE h.sak_id = @sak_id);
END
GO

GRANT EXECUTE ON koe_api.aktornavn TO koe_runtime;
GO
