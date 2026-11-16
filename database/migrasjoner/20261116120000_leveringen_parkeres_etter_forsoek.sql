-- Leveringen parkeres etter et fast antall forsøk (svar A 11.11 på spørsmål 7 i #1791, #926).
-- Feiler forsøk nummer 24 i en levering forbigående, blir jobben parkert i stedet for å
-- vente på et nytt forsøk. Med pausene i `koe_api.avslutt_forsoek` er det om lag 17 timer
-- etter det første forsøket. Driften starter jobben på nytt med
-- `koe_api.start_jobb_paa_nytt`, som setter `antall_forsoek` til 0. Forsøket lagres med
-- utfallet og meldingen fra kjøreren, som før. Jobben for topicen prøves som før.
--
-- `koe_api.registrer_jobbfeil` gir tilstanden jobben fikk, så kjøreren kan logge at
-- leveringen er parkert.

CREATE OR ALTER PROCEDURE koe_api.avslutt_forsoek
  @jobb uniqueidentifier, @lease uniqueidentifier, @startet datetime2(3), @naa datetime2(3),
  @utfall nvarchar(20), @melding nvarchar(400)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@lease, @jobb, @startet, @naa, @utfall, @melding);
  UPDATE koe.jobb
     SET tilstand = CASE
                      WHEN @utfall = N'utfoert' THEN N'utfoert'
                      WHEN @utfall = N'feilet' AND NOT (jobbtype = N'levering' AND antall_forsoek >= 24) THEN N'venter'
                      ELSE N'parkert'
                    END,
         neste_forsoek = IIF(@utfall = N'utfoert', neste_forsoek,
                             DATEADD(second, IIF(antall_forsoek >= 8, 3600, 30 * POWER(2, antall_forsoek - 1)), @naa)),
         lease = NULL, lease_startet = NULL, lease_utloeper = NULL, siste_forsoek = @lease
   WHERE jobb_id = @jobb;
END
GO

CREATE OR ALTER PROCEDURE koe_api.registrer_jobbfeil
  @lease uniqueidentifier, @utfall nvarchar(20), @melding nvarchar(400)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @utfall IS NULL OR @utfall NOT IN (N'feilet', N'usikkert', N'avvist') OR @melding IS NULL OR LEN(@melding) = 0
    THROW 51422, N'Utfallet eller meldingen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, NULL, @naa, @jobb OUTPUT, @startet OUTPUT;
  EXEC koe_api.avslutt_forsoek @jobb, @lease, @startet, @naa, @utfall, @melding;
  SELECT tilstand FROM koe.jobb WHERE jobb_id = @jobb;
  COMMIT;
END
GO
