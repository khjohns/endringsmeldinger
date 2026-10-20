-- Sakene i prosjektet i konteksten, med journalen, for sakslisten i
-- `server/saksliste.ts` (#1022). Statusen og tallene regnes av kjernen i
-- serveren ved lesing, så prosedyren gir hendelsene og ingen oppsummering.
-- Sakene og hendelsene leses under radsikkerheten, og prosjektet i konteksten
-- avgrenser i tillegg. Uten konteksten i en transaksjon avvises kallet.
CREATE PROCEDURE koe_api.saksliste
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Sakslisten leses bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  SELECT s.sak_id, s.sakstype, s.created_at AS opprettet,
         h.event_id, h.event_type, h.versjon, h.tidsstempel, h.aktor_id, h.aktor_rolle,
         h.aktor_team_id, h.refererer_til_event_id, h.format, h.data
    FROM koe.sak_metadata s
    JOIN koe.hendelse h ON h.sak_id = s.sak_id AND h.prosjekt_id = s.prosjekt_id
   WHERE s.prosjekt_id = @prosjekt
   ORDER BY s.sak_id, h.versjon;
END
GO

GRANT EXECUTE ON koe_api.saksliste TO koe_runtime;
GO
