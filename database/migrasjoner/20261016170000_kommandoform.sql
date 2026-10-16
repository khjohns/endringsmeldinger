-- Kommandoene prøver formen på argumentene før de skriver (#605, #607, #596).
-- Migrasjonen definerer prosedyrene fra `20261016120000_kommandoer.sql` med
-- samme navn og rettigheter. I `skriv_hendelse` er `@sak_id`, `@event_id`,
-- `@event_type`, `@dokumentnoekkel` og `@oppdrag_sha256` nvarchar(4000), og i
-- `opprett_sak` leses sakstypen inn i en nvarchar(4000), så en for lang verdi
-- ikke kortes stille til kolonnens lengde før kontrollen (#605). En verdi over
-- 4000 tegn kortes til 4000 og er da for lang for hver av kolonnene, så den
-- avvises.
--
-- Formene er skrankene på tabellene (`20261016100000_journal.sql` og
-- `20261016130000_mellomrom.sql`). Prosedyrene prøver dem selv, så et argument i
-- feil form gir 51422 med en melding som sier hva som hindrer, og ikke 547 fra en
-- skranke (#607). Saks-ID-en prøves mot `sak_metadata_sak_id_form`, og en annen
-- form gir 51403 som en ukjent sak: SQL Server ser bort fra mellomrom til slutt
-- når to tekster sammenliknes, så oppslaget alene ville funnet saken.
--
-- Feilkodene:
-- 51000 kommandoen kan ikke kjøres i denne økta: utenfor transaksjonen, uten
-- kontekst bundet til den, eller når `sys.dm_exec_sessions` ikke viser økta, så
-- tidspunktet ikke kan bindes til den (#596). Det siste er et avvik i miljøet,
-- ikke i argumentene. 51403 ukjent sak (likt for ingen tilgang, ukjent sak, sak i
-- et annet prosjekt og en saks-ID i en annen form). 51409 versjonskonflikt, med
-- meldingen `Versjonskonflikt: journalen har versjon N`, der N er journalens
-- versjon; `server/kommandoer.ts` leser N ut av meldingen, så formen er en
-- kontrakt. 51422 ugyldig argument.

CREATE OR ALTER PROCEDURE koe_api.skrivetidspunkt @tidspunkt datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Tidspunktet hentes bare i en transaksjon med konteksten satt', 1;
  DECLARE @innlogget datetime2(3) = (SELECT CAST(login_time AS datetime2(3)) FROM sys.dm_exec_sessions WHERE session_id = @@SPID);
  IF @innlogget IS NULL
    THROW 51000, N'sys.dm_exec_sessions viser ikke økta, så tidspunktet kan ikke bindes til den', 1;
  SET @tidspunkt = DATETRUNC(millisecond, SYSUTCDATETIME());
  DELETE koe.skrivetidspunkt WHERE oekt = @@SPID;
  INSERT koe.skrivetidspunkt (oekt, transaksjon, innlogget, tidspunkt)
  VALUES (@@SPID, CURRENT_TRANSACTION_ID(), @innlogget, @tidspunkt);
END
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
  DECLARE @sakstype nvarchar(4000) = JSON_VALUE(@data, N'$.sakstype');
  IF @sakstype IS NULL OR LEN(@sakstype) = 0
    THROW 51422, N'Sakstypen mangler i data', 1;
  IF DATALENGTH(@sakstype) > 80
    THROW 51422, N'Sakstypen er over 40 tegn', 1;
  IF DATALENGTH(@sakstype) <> DATALENGTH(RTRIM(@sakstype))
    THROW 51422, N'Sakstypen har mellomrom til slutt', 1;
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
  @oppdrag_id uniqueidentifier = NULL, @dokumentnoekkel nvarchar(4000) = NULL,
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
  IF DATALENGTH(@event_type) <> DATALENGTH(RTRIM(@event_type))
    THROW 51422, N'Hendelsestypen har mellomrom til slutt', 1;
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
    IF DATALENGTH(@dokumentnoekkel) <> DATALENGTH(RTRIM(@dokumentnoekkel))
      THROW 51422, N'Dokumentnøkkelen har mellomrom til slutt', 1;
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
