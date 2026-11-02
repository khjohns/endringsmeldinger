-- Slettingen leser vedlegget med oppdateringslås (#923 punkt 1). Uten låsen leste
-- kontrollen et ubundet vedlegg mens en kommando holdt det for bindingen; `DELETE`
-- ventet så på kommandoen og traff 0 rader etter commit, og serveren svarte «finnes
-- ikke» for et vedlegg som finnes og er bundet. Nå venter kontrollen på kommandoen og
-- ser bindingen.
CREATE OR ALTER PROCEDURE koe_api.slett_vedlegg @vedlegg_id uniqueidentifier, @sak_id nvarchar(36)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedlegget slettes bare i en transaksjon med konteksten satt', 1;
  DECLARE @bundet bit;
  SELECT @bundet = IIF(bundet_av_event_id IS NULL, 0, 1)
    FROM koe.vedlegg WITH (UPDLOCK, HOLDLOCK)
   WHERE vedlegg_id = @vedlegg_id AND sak_id = @sak_id;
  IF @bundet = 1
    THROW 51409, N'Vedlegget er bundet til en hendelse', 1;
  DELETE koe.vedlegg WHERE vedlegg_id = @vedlegg_id AND sak_id = @sak_id AND bundet_av_event_id IS NULL;
  SELECT @@ROWCOUNT AS slettet;
END
GO
