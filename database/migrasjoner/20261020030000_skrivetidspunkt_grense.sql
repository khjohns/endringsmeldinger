-- Øvre grense for tiden mellom tidspunktet og skrivingen (#599, avgjort 17.10 i
-- #764 R-2). `koe_api.skriv_hendelse` avviser brevet med 51419 når det har gått
-- mer enn 30 sekunder siden `koe_api.skrivetidspunkt` ga tidspunktet, regnet med
-- basens klokke da prosedyren kjøres. Tidspunktet kan ellers ligge så lenge før
-- skrivingen som transaksjonen holdes åpen. Transaksjonen rulles tilbake, og
-- serveren skal hente et nytt tidspunkt og prøve igjen; den delen bygges i
-- `server/kommandoer.ts` (#599).
--
-- Kontrollen av tidspunktet går før låsen på journalen (#597): den avhenger ikke
-- av versjonen, så en skriving med et tidspunkt som ikke godtas, venter ikke på en
-- annen skriving til saken. Grensen prøves igjen etter låsen, så ventetiden på en
-- annen skriving ikke kommer i tillegg til grensen. Innloggingen leses med samme
-- uttrykk som i `skrivetidspunkt` (`20261016170000_kommandoform.sql`), uten
-- koblingen mot `sys.dm_exec_sessions` på økt-ID-en, som `t.oekt = @@SPID` alt
-- gir. Viser `sys.dm_exec_sessions` ikke økta, finnes ingen rad og tidspunktet
-- avvises med 51422, som før.
--
-- Prosedyren er ellers som i `20261019240000_kommandoform_og_side.sql`, med samme navn,
-- feilkoder og rettigheter. Feilkodene der gjelder, og i tillegg:
-- 51419 tidspunktet er eldre enn 30 sekunder når brevet skrives.

CREATE OR ALTER PROCEDURE koe_api.skriv_hendelse
  @sak_id nvarchar(4000), @forventet_versjon int, @event_id nvarchar(4000), @event_type nvarchar(4000),
  @tidsstempel datetime2(3), @format int, @data nvarchar(max),
  @oppdrag_id nvarchar(4000) = NULL, @dokumentnoekkel nvarchar(4000) = NULL,
  @oppdrag nvarchar(max) = NULL, @oppdrag_sha256 nvarchar(4000) = NULL,
  @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF @sak_id IS NULL
    THROW 51422, N'Saks-ID-en mangler', 1;
  IF koe.er_uuid(@kommando_id) = 0
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF koe.er_hash(@kommando_sha256) = 0
    THROW 51422, N'Summen for kommandoen er ikke 64 små heksadesimale tegn', 1;
  IF @forventet_versjon IS NULL OR @forventet_versjon < 1
    THROW 51422, N'Forventet versjon mangler eller er under 1', 1;
  IF @event_id IS NULL OR TRY_CAST(@event_id AS uniqueidentifier) IS NULL OR DATALENGTH(@event_id) <> 72
     OR @event_id COLLATE Latin1_General_100_BIN2_UTF8 <> LOWER(@event_id)
    THROW 51422, N'event_id mangler eller er ikke en UUID med små bokstaver', 1;
  IF @event_type IS NULL OR DATALENGTH(@event_type) = 0
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
    IF DATALENGTH(@dokumentnoekkel) = 0
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

  DECLARE @innlogget datetime2(3) = (SELECT CAST(login_time AS datetime2(3)) FROM sys.dm_exec_sessions WHERE session_id = @@SPID);
  DECLARE @klokke datetime2(3) =
    (SELECT tidspunkt FROM koe.skrivetidspunkt
      WHERE oekt = @@SPID AND transaksjon = CURRENT_TRANSACTION_ID() AND innlogget = @innlogget);
  IF @klokke IS NULL OR @tidsstempel <> @klokke
    THROW 51422, N'Tidspunktet er ikke basens klokke for skrivingen', 1;
  DECLARE @grense bigint = 30000;
  IF DATEDIFF_BIG(millisecond, @klokke, SYSUTCDATETIME()) > @grense
    THROW 51419, N'Det har gått mer enn 30 sekunder siden basen ga tidspunktet', 1;
  DELETE koe.skrivetidspunkt WHERE oekt = @@SPID;

  DECLARE @siste int = (SELECT MAX(versjon) FROM koe.hendelse WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id);
  IF ISNULL(@siste, 0) <> @forventet_versjon
  BEGIN
    DECLARE @konflikt nvarchar(200) = CONCAT(N'Versjonskonflikt: journalen har versjon ', ISNULL(@siste, 0));
    THROW 51409, @konflikt, 1;
  END
  IF DATEDIFF_BIG(millisecond, @klokke, SYSUTCDATETIME()) > @grense
    THROW 51419, N'Det har gått mer enn 30 sekunder siden basen ga tidspunktet', 1;

  DECLARE @skriving uniqueidentifier = NEWID();
  EXEC sp_set_session_context N'koe_skriving', @skriving;
  INSERT koe.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                       aktor_team_id, refererer_til_event_id, format, data, transaksjon, skriving)
  VALUES (@event_id, @sak_id, @prosjekt, @event_type, @forventet_versjon + 1, @tidsstempel, @aktor, @side,
          @team, NULL, @format, @data, CURRENT_TRANSACTION_ID(), @skriving);
  IF @oppdrag IS NOT NULL
    INSERT koe.leveringsoppdrag (id, prosjekt_id, sak_id, event_id, dokumentnoekkel, innhold, innhold_sha256)
    VALUES (@oppdrag_id, @prosjekt, @sak_id, @event_id, @dokumentnoekkel, @oppdrag, @oppdrag_sha256);
  INSERT koe.kvittering (prosjekt_id, aktor_id, kommando_id, kommando_sha256, sak_id, event_id)
  VALUES (@prosjekt, @aktor, @kommando_id, @kommando_sha256, @sak_id, @event_id);
  -- Delene er skrevet; ingen senere setning i transaksjonen kan legge til flere.
  EXEC sp_set_session_context N'koe_skriving', NULL;
END
GO
