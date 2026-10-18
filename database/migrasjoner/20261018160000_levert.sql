-- «Levert» i visningen av saken (L-1c2, #371): kjøretiden leser kvitteringen for
-- dokumentreferansen, som er tidspunktet brevet står på topicen (oppdragsgiver 18.10,
-- #764). Filterpredikatet fra `20261018120000_levering.sql` slipper bare et medlem av
-- prosjektet i konteksten gjennom.
--
-- Kjøreren henter PDF-en som alt er lagret for oppdraget, før den lager en ny
-- (#795 punkt 4). `lagre_brevdokument` gir fortsatt den lagrede når to forsøk lagrer.

GRANT SELECT ON koe.leveringskvittering TO koe_runtime;
GO

-- PDF-en som er lagret for oppdraget til leasen, eller ingen rad.
CREATE PROCEDURE koe_api.lagret_brevdokument
  @lease uniqueidentifier
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  SELECT d.pdf
    FROM koe.brevdokument d
    JOIN koe.jobb j ON j.leveringsoppdrag_id = d.leveringsoppdrag_id
   WHERE j.jobb_id = @jobb;
  COMMIT;
END
GO

GRANT EXECUTE ON koe_api.lagret_brevdokument TO koe_runtime;
