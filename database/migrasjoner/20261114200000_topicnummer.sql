-- Topicens løpenummer i Catenda (`bimsync_issue_number`). Lenken til en topic i Catenda
-- har nummeret, ikke topicens GUID (U-15 i BF-44; oppdragsgiver 14.11 i #1906). Nummeret
-- kommer i svaret når topicen lages, og i topicen når en sak opprettes fra en topic i
-- innboksen, så det lagres med topicen og trenger ikke noe nytt kall. Kolonnen er tom for
-- topicer som er koblet før denne fila, og når Catenda ikke ga nummeret.
-- `kvitter_topic`, `koble_topic`, `opprett_sak` og `leveringsmaal` er definert på nytt med
-- nummeret; ellers er de som i `20261020120000_vedleggsbinding_og_tom_id.sql`,
-- `20261020130000_innkommende_behandling.sql`, `20261102100000_opprettelse_med_paaberopelse.sql`
-- og `20261020200000_kontekst_full_lengde.sql`.

ALTER TABLE koe.sak_catenda_topic ADD catenda_topic_nummer int NULL
  CONSTRAINT sak_catenda_topic_nummer_positivt CHECK (catenda_topic_nummer > 0);
GO

CREATE OR ALTER PROCEDURE koe_api.kvitter_topic
  @lease uniqueidentifier, @topic_id nvarchar(100), @topic_nummer int
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @topic_id IS NULL OR DATALENGTH(@topic_id) = 0
    THROW 51422, N'Topicen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'catenda_topic', @naa, @jobb OUTPUT, @startet OUTPUT;
  INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id, catenda_topic_nummer)
  SELECT sak_id, prosjekt_id, LOWER(CONVERT(nvarchar(36), catenda_board_id)), @topic_id, @topic_nummer
    FROM koe.jobb WHERE jobb_id = @jobb;
  EXEC koe_api.avslutt_forsoek @jobb, @lease, @startet, @naa, N'utfoert', NULL;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.koble_topic
  @sak_id nvarchar(36), @prosjekt_id nvarchar(100), @catenda_board_id nvarchar(100), @catenda_topic_id nvarchar(100),
  @catenda_topic_nummer int
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id, catenda_topic_nummer)
  VALUES (@sak_id, @prosjekt_id, @catenda_board_id, @catenda_topic_id, @catenda_topic_nummer);
END
GO

CREATE OR ALTER PROCEDURE koe_api.opprett_sak
  @format int, @data nvarchar(max), @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @catenda_board_id nvarchar(100), @catenda_topic_id nvarchar(100), @catenda_topic_nummer int,
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
  IF @catenda_topic_nummer IS NOT NULL AND @catenda_topic_id IS NULL
    THROW 51422, N'Topicens nummer er gitt uten topicen', 1;
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
    EXEC koe_api.koble_topic @sak_id, @prosjekt, @catenda_board_id, @catenda_topic_id, @catenda_topic_nummer;
END
GO

CREATE OR ALTER PROCEDURE koe_api.leveringsmaal
  @sak_id nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT LOWER(CONVERT(nvarchar(36), c.catenda_project_id)) AS catenda_project_id,
         LOWER(CONVERT(nvarchar(36), c.library_id)) AS library_id,
         LOWER(CONVERT(nvarchar(36), c.folder_id)) AS folder_id,
         t.catenda_board_id AS board_id,
         t.catenda_topic_id AS topic_id,
         t.catenda_topic_nummer AS topic_nummer
    FROM koe.sak_metadata m
    JOIN koe.catenda_project_configs c ON c.internal_project_id = m.prosjekt_id AND c.is_active = 1
    LEFT JOIN koe.sak_catenda_topic t ON t.sak_id = m.sak_id AND t.prosjekt_id = m.prosjekt_id
   WHERE m.sak_id = @sak_id
     AND m.prosjekt_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
END
GO
