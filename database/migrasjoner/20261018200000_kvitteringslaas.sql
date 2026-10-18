-- Låsen på kvitteringen gjelder bare nøkkelen (#792 punkt 1).
--
-- Oppslaget tar en applås på nøkkelen (prosjektet, aktøren og kommando-ID-en) med
-- `sp_getapplock`, eid av transaksjonen, og leser kvitteringen uten range-lås. En
-- samtidig kommando med samme nøkkel venter på den første og leser kvitteringen
-- etter COMMIT; kommandoer med andre nøkler i samme gap i indeksen venter ikke.
-- Gis ikke låsen innen ti sekunder, kastes 51408: et forsøk med samme nøkkel kan
-- ennå committe, så utfallet er usikkert.
--
-- Feilkodene og rettighetene er ellers som i `20261018123000_kvittering.sql`.

CREATE OR ALTER PROCEDURE koe_api.kvittering
  @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @versjon int OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF @kommando_id IS NULL OR TRY_CAST(@kommando_id AS uniqueidentifier) IS NULL OR DATALENGTH(@kommando_id) <> 72
     OR @kommando_id COLLATE Latin1_General_100_BIN2_UTF8 <> LOWER(@kommando_id)
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF @kommando_sha256 IS NULL OR DATALENGTH(@kommando_sha256) <> 128 OR @kommando_sha256 COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
    THROW 51422, N'Summen for kommandoen er ikke 64 små heksadesimale tegn', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  IF @prosjekt IS NULL OR @aktor IS NULL
    THROW 51403, N'Ingen tilgang', 1;
  -- Navnet på en applås er høyst 255 tegn, så nøkkelen går inn som en sum.
  DECLARE @ressurs nvarchar(255) = N'koe.kvittering:' + CONVERT(nvarchar(64),
    HASHBYTES('SHA2_256', CONCAT(@prosjekt, NCHAR(0), CONVERT(nvarchar(36), @aktor), NCHAR(0), @kommando_id)), 2);
  DECLARE @laas int;
  EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
  IF @laas < 0
    THROW 51408, N'Låsen på kvitteringen ble ikke gitt', 1;
  DECLARE @sum nvarchar(64);
  SELECT @sum = k.kommando_sha256, @sak_id = k.sak_id, @event_id = k.event_id, @versjon = h.versjon
    FROM koe.kvittering k
    JOIN koe.hendelse h ON h.event_id = k.event_id
   WHERE k.prosjekt_id = @prosjekt AND k.aktor_id = @aktor AND k.kommando_id = @kommando_id;
  IF @sum IS NOT NULL AND @sum <> @kommando_sha256
    THROW 51410, N'Kommando-ID-en er brukt for en annen kommando', 1;
END
GO
