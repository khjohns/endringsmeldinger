-- #2210: les den tildelte koden under samme prosjektgrense som journalen.
CREATE PROCEDURE koe_api.les_tildelt_sakskode @sak_id nvarchar(36)
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Sakens kode leses bare i en transaksjon med konteksten satt', 1;
  SELECT kode, loepenummer
    FROM koe.sak_kode
   WHERE sak_id = @sak_id
     AND prosjekt_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
END
GO

GRANT EXECUTE ON koe_api.les_tildelt_sakskode TO koe_runtime;
