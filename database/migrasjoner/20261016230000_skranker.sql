-- Skrankene ett sted (#647 del A, #629, #631, #609). Prosedyrene er eneste kilde
-- for formen på argumentene; `server/kommandoer.ts` prøver den ikke selv og
-- oversetter 51422 til `UgyldigKommando`. Prosedyrene er ellers som i
-- `20261016170000_kommandoform.sql`, med samme navn, feilkoder og rettigheter.
--
-- Hendelsestypen, sakstypen og dokumentnøkkelen har en lukket tegnklasse i stedet
-- for kontrollen mot mellomrom til slutt fra `20261016130000_mellomrom.sql`, som
-- bare stoppet U+0020: tabulator, NBSP og U+3000 ble en andre verdiform (#609).
-- Tegnklassen prøves med den binære sorteringen, så hvert tegn utenfor, også store
-- bokstaver og tegn utenfor BMP, avvises. Skranken på tabellen og kontrollen i
-- prosedyren har samme klasse; prosedyren gir 51422 med en melding som sier hva
-- som hindrer, før skranken gir 547.
--
-- Sakstypen leses med `OPENJSON`, så en sakstype som er et tall, en liste, et
-- objekt eller står flere ganger, avvises med en egen melding, og en lang tekst
-- leses uten å kortes (#631). `@oppdrag_id` er tekst, så en ID som ikke er en UUID,
-- gir 51422 fra prosedyren og ikke en feil i driveren (#629).

ALTER TABLE koe.sak_metadata DROP CONSTRAINT sak_metadata_sakstype_uten_mellomrom;
ALTER TABLE koe.sak_metadata ADD CONSTRAINT sak_metadata_sakstype_form
  CHECK (NOT sakstype COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%');

ALTER TABLE koe.hendelse DROP CONSTRAINT hendelse_event_type_uten_mellomrom;
ALTER TABLE koe.hendelse ADD CONSTRAINT hendelse_event_type_form
  CHECK (NOT event_type COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%');

ALTER TABLE koe.leveringsoppdrag DROP CONSTRAINT leveringsoppdrag_dokumentnoekkel_uten_mellomrom;
ALTER TABLE koe.leveringsoppdrag ADD CONSTRAINT leveringsoppdrag_dokumentnoekkel_form
  CHECK (NOT dokumentnoekkel COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^-a-z0-9_]%');
GO

CREATE OR ALTER PROCEDURE koe_api.opprett_sak
  @format int, @data nvarchar(max),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @tidsstempel datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF @format IS NULL OR @format < 1
    THROW 51422, N'Formatet mangler eller er under 1', 1;
  IF @data IS NULL OR ISJSON(@data, OBJECT) = 0
    THROW 51422, N'data mangler eller er ikke et JSON-objekt', 1;
  DECLARE @sakstype nvarchar(max), @sakstype_type int, @antall int;
  SELECT @antall = COUNT(*), @sakstype = MAX(value), @sakstype_type = MAX(type)
    FROM OPENJSON(@data) WHERE [key] = N'sakstype';
  IF @antall = 0
    THROW 51422, N'Sakstypen mangler i data', 1;
  IF @antall > 1
    THROW 51422, N'Sakstypen står flere ganger i data', 1;
  IF @sakstype_type <> 1
    THROW 51422, N'Sakstypen er ikke en tekst i data', 1;
  IF LEN(@sakstype) = 0
    THROW 51422, N'Sakstypen er tom', 1;
  IF DATALENGTH(@sakstype) > 80
    THROW 51422, N'Sakstypen er over 40 tegn', 1;
  IF @sakstype COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'
    THROW 51422, N'Sakstypen har andre tegn enn a–z og _', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier),
          @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)),
          @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @aktor IS NULL OR @side IS NULL OR @side NOT IN (N'TE', N'BH')
    THROW 51403, N'Ingen tilgang', 1;

  SET @sak_id = LOWER(CONVERT(nvarchar(36), NEWID()));
  SET @event_id = LOWER(CONVERT(nvarchar(36), NEWID()));
  SET @tidsstempel = DATETRUNC(millisecond, SYSUTCDATETIME());
  INSERT koe.sak_metadata (sak_id, prosjekt_id, sakstype, created_by) VALUES (@sak_id, @prosjekt, @sakstype, @aktor);
  INSERT koe.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                       aktor_team_id, refererer_til_event_id, format, data, transaksjon, skriving)
  VALUES (@event_id, @sak_id, @prosjekt, N'sak_opprettet', 1, @tidsstempel, @aktor, @side,
          @team, NULL, @format, @data, CURRENT_TRANSACTION_ID(), NEWID());
END
GO

CREATE OR ALTER PROCEDURE koe_api.skriv_hendelse
  @sak_id nvarchar(4000), @forventet_versjon int, @event_id nvarchar(4000), @event_type nvarchar(4000),
  @tidsstempel datetime2(3), @format int, @data nvarchar(max),
  @oppdrag_id nvarchar(4000) = NULL, @dokumentnoekkel nvarchar(4000) = NULL,
  @oppdrag nvarchar(max) = NULL, @oppdrag_sha256 nvarchar(4000) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF @sak_id IS NULL
    THROW 51422, N'Saks-ID-en mangler', 1;
  IF @forventet_versjon IS NULL OR @forventet_versjon < 1
    THROW 51422, N'Forventet versjon mangler eller er under 1', 1;
  IF @event_id IS NULL OR TRY_CAST(@event_id AS uniqueidentifier) IS NULL OR DATALENGTH(@event_id) <> 72
     OR @event_id COLLATE Latin1_General_100_BIN2_UTF8 <> LOWER(@event_id)
    THROW 51422, N'event_id mangler eller er ikke en UUID med små bokstaver', 1;
  IF @event_type IS NULL OR LEN(@event_type) = 0
    THROW 51422, N'Hendelsestypen mangler', 1;
  IF DATALENGTH(@event_type) > 200
    THROW 51422, N'Hendelsestypen er over 100 tegn', 1;
  IF @event_type COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'
    THROW 51422, N'Hendelsestypen har andre tegn enn a–z og _', 1;
  IF @event_type = N'sak_opprettet'
    THROW 51422, N'sak_opprettet skrives bare av opprett_sak', 1;
  IF @tidsstempel IS NULL
    THROW 51422, N'Tidspunktet mangler', 1;
  IF @format IS NULL OR @format < 1
    THROW 51422, N'Formatet mangler eller er under 1', 1;
  IF @data IS NULL OR ISJSON(@data, OBJECT) = 0
    THROW 51422, N'data mangler eller er ikke et JSON-objekt', 1;
  IF (@event_type = N'dokument_registrert'
      AND (@oppdrag IS NULL OR @oppdrag_id IS NULL OR @dokumentnoekkel IS NULL OR @oppdrag_sha256 IS NULL))
     OR (@event_type <> N'dokument_registrert'
         AND (@oppdrag IS NOT NULL OR @oppdrag_id IS NOT NULL OR @dokumentnoekkel IS NOT NULL OR @oppdrag_sha256 IS NOT NULL))
    THROW 51422, N'Leveringsoppdraget kreves for dokument_registrert og bare for den', 1;
  IF @oppdrag IS NOT NULL
  BEGIN
    IF LEN(@dokumentnoekkel) = 0
      THROW 51422, N'Dokumentnøkkelen er tom', 1;
    IF DATALENGTH(@dokumentnoekkel) > 200
      THROW 51422, N'Dokumentnøkkelen er over 100 tegn', 1;
    IF @dokumentnoekkel COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^-a-z0-9_]%'
      THROW 51422, N'Dokumentnøkkelen har andre tegn enn a–z, 0–9, _ og -', 1;
    IF TRY_CAST(@oppdrag_id AS uniqueidentifier) IS NULL OR DATALENGTH(@oppdrag_id) <> 72
      THROW 51422, N'Oppdragets ID er ikke en UUID', 1;
    IF ISJSON(@oppdrag, OBJECT) = 0
      THROW 51422, N'Oppdraget er ikke et JSON-objekt', 1;
    IF DATALENGTH(@oppdrag_sha256) <> 128 OR @oppdrag_sha256 COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
      THROW 51422, N'Summen for oppdraget er ikke 64 små heksadesimale tegn', 1;
  END
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier),
          @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)),
          @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @aktor IS NULL OR @side IS NULL OR @side NOT IN (N'TE', N'BH')
     OR TRY_CAST(@sak_id AS uniqueidentifier) IS NULL OR DATALENGTH(@sak_id) <> 72
     OR @sak_id COLLATE Latin1_General_100_BIN2_UTF8 <> LOWER(@sak_id)
     OR NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;

  DECLARE @siste int = (SELECT MAX(versjon) FROM koe.hendelse WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id);
  IF ISNULL(@siste, 0) <> @forventet_versjon
  BEGIN
    DECLARE @konflikt nvarchar(200) = CONCAT(N'Versjonskonflikt: journalen har versjon ', ISNULL(@siste, 0));
    THROW 51409, @konflikt, 1;
  END

  DECLARE @klokke datetime2(3) =
    (SELECT t.tidspunkt FROM koe.skrivetidspunkt t
       JOIN sys.dm_exec_sessions s ON s.session_id = t.oekt AND CAST(s.login_time AS datetime2(3)) = t.innlogget
      WHERE t.oekt = @@SPID AND t.transaksjon = CURRENT_TRANSACTION_ID());
  IF @klokke IS NULL OR @tidsstempel <> @klokke
    THROW 51422, N'Tidspunktet er ikke basens klokke for skrivingen', 1;
  DELETE koe.skrivetidspunkt WHERE oekt = @@SPID;

  DECLARE @skriving uniqueidentifier = NEWID();
  EXEC sp_set_session_context N'koe_skriving', @skriving;
  INSERT koe.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                       aktor_team_id, refererer_til_event_id, format, data, transaksjon, skriving)
  VALUES (@event_id, @sak_id, @prosjekt, @event_type, @forventet_versjon + 1, @tidsstempel, @aktor, @side,
          @team, NULL, @format, @data, CURRENT_TRANSACTION_ID(), @skriving);
  IF @oppdrag IS NOT NULL
    INSERT koe.leveringsoppdrag (id, prosjekt_id, sak_id, event_id, dokumentnoekkel, innhold, innhold_sha256)
    VALUES (@oppdrag_id, @prosjekt, @sak_id, @event_id, @dokumentnoekkel, @oppdrag, @oppdrag_sha256);
  -- Delene er skrevet; ingen senere setning i transaksjonen kan legge til flere.
  EXEC sp_set_session_context N'koe_skriving', NULL;
END
GO
