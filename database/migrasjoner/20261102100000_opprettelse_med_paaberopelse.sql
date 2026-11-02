-- Saken og den første påberopelsen i én handling (KT-U11, #1487). `opprett_sak` tar
-- saks-ID-en fra kalleren når den er gitt: brevteksten har saksnummeret (LV-U4), så det
-- er bestemt før sendingen. Da gir kalleren også hendelses-ID-en, `sak_opprettet` får
-- tidspunktet `koe_api.skrivetidspunkt` ga for skrivingen, og ingen kvittering skrives:
-- `koe_api.skriv_hendelse` skriver den for påberopelsen i samme transaksjon, så
-- kommando-ID-en har én kvittering. En brukt saks-ID avvises av primærnøkkelen
-- `sak_metadata_pk` (2627), også for en sak i et annet prosjekt, som radsikkerheten
-- skjuler. Uten saks-ID er prosedyren som i `20261020130000_innkommende_behandling.sql`.

CREATE OR ALTER PROCEDURE koe_api.opprett_sak
  @format int, @data nvarchar(max), @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @catenda_board_id nvarchar(100), @catenda_topic_id nvarchar(100),
  @sak_id nvarchar(36) OUTPUT, @event_id nvarchar(36) OUTPUT, @tidsstempel datetime2(3) OUTPUT
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
  DECLARE @fra_klienten bit = IIF(@sak_id IS NULL, 0, 1);
  IF @fra_klienten = 1 AND (koe.er_uuid(@sak_id) = 0 OR koe.er_uuid(@event_id) = 0)
    THROW 51422, N'Saks-ID-en eller hendelses-ID-en er ikke en UUID med små bokstaver', 1;
  IF @fra_klienten = 0 AND @event_id IS NOT NULL
    THROW 51422, N'Hendelses-ID-en gis bare sammen med saks-ID-en', 1;
  IF @fra_klienten = 1 AND @catenda_topic_id IS NOT NULL
    THROW 51422, N'En sak fra en topic får ikke saks-ID-en fra klienten', 1;
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
  IF DATALENGTH(@sakstype) = 0
    THROW 51422, N'Sakstypen er tom', 1;
  IF DATALENGTH(@sakstype) > 80
    THROW 51422, N'Sakstypen er over 40 tegn', 1;
  IF @sakstype COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'
    THROW 51422, N'Sakstypen har andre tegn enn a–z og _', 1;
  DECLARE @tittel nvarchar(max), @tittel_type int;
  SELECT @antall = COUNT(*), @tittel = MAX(value), @tittel_type = MAX(type)
    FROM OPENJSON(@data) WHERE [key] = N'sakstittel';
  IF @antall <> 1 OR @tittel_type <> 1 OR LEN(@tittel) = 0
    THROW 51422, N'Sakstittelen mangler, står flere ganger eller er ikke en tekst i data', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier),
          @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)),
          @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @aktor IS NULL OR @side IS NULL OR @side NOT IN (N'TE', N'BH')
    THROW 51403, N'Ingen tilgang', 1;
  -- Låsen på koblingen tas før noe annet leses (#868 punkt 1). `koe_drift.registrer_prosjekt`
  -- og `koe_drift.sett_kontraktsteam` låser også koblingen før `koe.prosjekt_med_saker`,
  -- så de tre går etter hverandre. `registrer_prosjekt` låser `koe.projects` før koblingen;
  -- her leses `koe.projects` bare uten oppdateringslås, av fremmednøklene og blokkpredikatene.
  DECLARE @catenda_prosjekt uniqueidentifier, @board uniqueidentifier, @aktiv bit;
  SELECT @catenda_prosjekt = catenda_project_id, @board = topic_board_id, @aktiv = is_active
    FROM koe.catenda_project_configs WITH (UPDLOCK, HOLDLOCK)
   WHERE internal_project_id = @prosjekt;
  IF @aktiv IS DISTINCT FROM 1 OR @board IS NULL
    THROW 51412, N'Prosjektet har ikke noe topic-board i Catenda for nye saker', 1;
  IF @catenda_topic_id IS NOT NULL AND (koe.er_uuid(@catenda_topic_id) = 0
      OR @catenda_board_id IS DISTINCT FROM LOWER(CONVERT(nvarchar(36), @board)))
    THROW 51412, N'Topicen står ikke på prosjektets topic-board for nye saker', 1;
  -- Siden og teamet regnet serveren ut før transaksjonen. Et bytte gjør medlemskapene
  -- inaktive, og nye kontraktsteam kan ha tatt teamet ut.
  IF NOT EXISTS (SELECT 1 FROM koe_sikkerhet.oppretter(@prosjekt, @aktor))
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM koe.app_project_memberships m
                     JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
                    WHERE m.project_id = @prosjekt AND m.user_id = @aktor AND m.active = 1
                      AND m.viewer_override = 0 AND m.role IN (N'admin', N'member'))
      THROW 51403, N'Aktøren er ikke lenger aktivt medlem av prosjektet', 1;
    THROW 51403, N'Teamet er ikke lenger kontraktsteam på siden i prosjektet', 1;
  END

  IF @fra_klienten = 0
  BEGIN
    SET @sak_id = LOWER(CONVERT(nvarchar(36), NEWID()));
    SET @event_id = LOWER(CONVERT(nvarchar(36), NEWID()));
    SET @tidsstempel = DATETRUNC(millisecond, SYSUTCDATETIME());
  END
  ELSE
  BEGIN
    -- Samme klokke som `skriv_hendelse` krever for påberopelsen, som sletter raden.
    DECLARE @innlogget datetime2(3) =
      (SELECT CAST(login_time AS datetime2(3)) FROM sys.dm_exec_sessions WHERE session_id = @@SPID);
    SET @tidsstempel =
      (SELECT tidspunkt FROM koe.skrivetidspunkt
        WHERE oekt = @@SPID AND transaksjon = CURRENT_TRANSACTION_ID() AND innlogget = @innlogget);
    IF @tidsstempel IS NULL
      THROW 51422, N'Basen har ikke gitt noe tidspunkt for skrivingen', 1;
  END
  INSERT koe.sak_metadata (sak_id, prosjekt_id, sakstype, created_by) VALUES (@sak_id, @prosjekt, @sakstype, @aktor);
  INSERT koe.hendelse (event_id, sak_id, prosjekt_id, event_type, versjon, tidsstempel, aktor_id, aktor_rolle,
                       aktor_team_id, refererer_til_event_id, format, data, transaksjon, skriving)
  VALUES (@event_id, @sak_id, @prosjekt, N'sak_opprettet', 1, @tidsstempel, @aktor, @side,
          @team, NULL, @format, @data, CURRENT_TRANSACTION_ID(), NEWID());
  IF @fra_klienten = 0
    INSERT koe.kvittering (prosjekt_id, aktor_id, kommando_id, kommando_sha256, sak_id, event_id)
    VALUES (@prosjekt, @aktor, @kommando_id, @kommando_sha256, @sak_id, @event_id);
  IF @catenda_topic_id IS NULL
    INSERT koe.jobb (jobbtype, sak_id, prosjekt_id, catenda_project_id, catenda_board_id, tittel, neste_forsoek)
    VALUES (N'catenda_topic', @sak_id, @prosjekt, @catenda_prosjekt, @board, @tittel, @tidsstempel);
  ELSE
    EXEC koe_api.koble_topic @sak_id, @prosjekt, @catenda_board_id, @catenda_topic_id;
END
GO
