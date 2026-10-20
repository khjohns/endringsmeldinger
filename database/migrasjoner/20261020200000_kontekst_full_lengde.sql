-- Konteksten leses i full lengde (#846), som i `koe_api.skriv_hendelse` og radsikkerheten.
-- `TRY_CAST(… AS nvarchar(n))` kutter en lengre verdi uten feil: et team på 33 tegn ble
-- et team på 32, og siden `BHX` ble `BH`. Prosedyrene her leste konteksten avkuttet og
-- lot det være radsikkerheten som stoppet skrivingen; nå avvises den av prosedyren.
-- Definisjonene er de som gjaldt fra før, bare med konteksten lest som `nvarchar(4000)`.

CREATE OR ALTER PROCEDURE koe_api.leveringsmaal
  @sak_id nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT LOWER(CONVERT(nvarchar(36), c.catenda_project_id)) AS catenda_project_id,
         LOWER(CONVERT(nvarchar(36), c.library_id)) AS library_id,
         LOWER(CONVERT(nvarchar(36), c.folder_id)) AS folder_id,
         t.catenda_board_id AS board_id,
         t.catenda_topic_id AS topic_id
    FROM koe.sak_metadata m
    JOIN koe.catenda_project_configs c ON c.internal_project_id = m.prosjekt_id AND c.is_active = 1
    LEFT JOIN koe.sak_catenda_topic t ON t.sak_id = m.sak_id AND t.prosjekt_id = m.prosjekt_id
   WHERE m.sak_id = @sak_id
     AND m.prosjekt_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
END
GO

CREATE OR ALTER PROCEDURE koe_api.lagre_vedlegg
  @vedlegg_id uniqueidentifier, @sak_id nvarchar(36), @filnavn nvarchar(200),
  @innhold varbinary(max), @innhold_sha256 nvarchar(64)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedlegget lagres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  DECLARE @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000));
  IF @team IS NULL
    THROW 51403, N'Uten entydig team lagres ikke noe vedlegg', 1;
  IF LEN(@team) > 32 OR LEN(@side) > 2
    THROW 51403, N'Teamet eller siden i konteksten har ikke den lagrede formen', 1;
  IF NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;
  IF @innhold IS NULL
    THROW 51422, N'Innholdet mangler', 1;
  INSERT koe.vedlegg (vedlegg_id, prosjekt_id, sak_id, filnavn, stoerrelse, innhold_sha256, innhold,
                      lastet_opp_av, lastet_opp_side, lastet_opp_team)
  VALUES (@vedlegg_id, @prosjekt, @sak_id, @filnavn, DATALENGTH(@innhold), @innhold_sha256, @innhold,
          TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier), @side, @team);
END
GO

CREATE OR ALTER PROCEDURE koe_api.bind_vedlegg @event_id nvarchar(36), @sak_id nvarchar(36)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedleggene bindes bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  DECLARE @data nvarchar(max) =
    (SELECT data FROM koe.hendelse WHERE event_id = @event_id AND sak_id = @sak_id AND prosjekt_id = @prosjekt);
  IF @data IS NULL
    THROW 51403, N'Ukjent hendelse', 1;
  DECLARE @vedlegg TABLE (
    vedlegg_id uniqueidentifier NULL,
    filnavn nvarchar(200) NULL,
    innhold_sha256 nvarchar(64) NULL);
  INSERT @vedlegg (vedlegg_id, filnavn, innhold_sha256)
  SELECT TRY_CAST(vedlegg_id AS uniqueidentifier), filnavn, innhold_sha256
    FROM OPENJSON(@data, N'$.dokumentasjon')
         WITH (vedlegg_id nvarchar(36) N'$.vedlegg_id', filnavn nvarchar(200) N'$.filnavn',
               innhold_sha256 nvarchar(64) N'$.innhold_sha256');
  UPDATE v SET bundet_av_event_id = @event_id
    FROM koe.vedlegg v JOIN @vedlegg b ON b.vedlegg_id = v.vedlegg_id
   WHERE v.sak_id = @sak_id AND v.prosjekt_id = @prosjekt AND v.bundet_av_event_id IS NULL
     AND v.lastet_opp_team = @team;
  IF EXISTS (
    SELECT 1 FROM @vedlegg b
     WHERE NOT EXISTS (
       SELECT 1 FROM koe.vedlegg v
        WHERE v.vedlegg_id = b.vedlegg_id AND v.sak_id = @sak_id AND v.prosjekt_id = @prosjekt
          AND v.bundet_av_event_id IS NOT NULL
          AND v.filnavn COLLATE Latin1_General_100_BIN2 = b.filnavn COLLATE Latin1_General_100_BIN2
          AND v.innhold_sha256 COLLATE Latin1_General_100_BIN2 = b.innhold_sha256 COLLATE Latin1_General_100_BIN2))
    THROW 51422, N'Et vedlegg i hendelsen finnes ikke i saken', 1;
END
GO
