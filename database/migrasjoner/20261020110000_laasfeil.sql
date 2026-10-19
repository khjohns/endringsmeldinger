-- Bare et svar fra `sp_getapplock` der et annet forsøk med samme nøkkel kan committe,
-- gir 51408 (#816 punkt 4, oppdragsgiver 19.10): -1 (tidsgrensen gikk ut), -2
-- (kallet ble avbrutt) og -3 (valgt som vranglåsoffer). Med dem er utfallet usikkert,
-- og et nytt forsøk kan gis. -999 er en feil i kallet: låsen ble aldri tatt, og den
-- gir 51407, som serveren svarer med 500.
--
-- Prosedyren er ellers som i `20261019240000_kommandoform_og_side.sql`.

CREATE OR ALTER PROCEDURE koe_api.kvittering
  @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @versjon int OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF koe.er_uuid(@kommando_id) = 0
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF koe.er_hash(@kommando_sha256) = 0
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
  IF @laas IN (-1, -2, -3)
    THROW 51408, N'Låsen på kvitteringen ble ikke gitt', 1;
  IF @laas < 0
    THROW 51407, N'Kallet på låsen for kvitteringen feilet', 1;
  DECLARE @sum nvarchar(64);
  SELECT @sum = k.kommando_sha256, @sak_id = k.sak_id, @event_id = k.event_id, @versjon = h.versjon
    FROM koe.kvittering k
    JOIN koe.hendelse h ON h.event_id = k.event_id
   WHERE k.prosjekt_id = @prosjekt AND k.aktor_id = @aktor AND k.kommando_id = @kommando_id;
  IF @sum IS NOT NULL AND @sum <> @kommando_sha256
    THROW 51410, N'Kommando-ID-en er brukt for en annen kommando', 1;
END
GO

