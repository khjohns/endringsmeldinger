-- Boardet med utfallet er der løkka skriver kommentaren, så `registrer_behandling` godtar
-- det bare når det er `topic_board_id` for prosjektet med utfallet (punkt 8 i #972). Et
-- board uten prosjekt, eller som ikke er en UUID, avvises også. Koblingen trenger ikke være
-- aktiv: behandlingen slo opp prosjektet i en aktiv kobling, og den kan være deaktivert
-- før utfallet lagres. Prosedyren er sist definert i `20261020140000_innkommende_forsoek_og_kommentar.sql`.

ALTER PROCEDURE koe_api.registrer_behandling
  @innkommende_hendelse_id bigint,
  @utfall nvarchar(40),
  @prosjekt_id nvarchar(100),
  @sak_id nvarchar(36),
  @catenda_topic_id nvarchar(100),
  @catenda_board_id nvarchar(100) = NULL,
  @melding nvarchar(400)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  IF @catenda_board_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM koe.catenda_project_configs
     WHERE internal_project_id = @prosjekt_id
       AND topic_board_id = TRY_CONVERT(uniqueidentifier, @catenda_board_id))
    THROW 54003, N'Boardet er ikke topicboardet til prosjektet med utfallet', 1;
  INSERT koe.innkommende_behandling
    (innkommende_hendelse_id, utfall, prosjekt_id, sak_id, catenda_topic_id, catenda_board_id, melding)
  SELECT @innkommende_hendelse_id, @utfall, @prosjekt_id, @sak_id, @catenda_topic_id, @catenda_board_id, @melding
   WHERE NOT EXISTS (
     SELECT 1 FROM koe.innkommende_behandling WITH (UPDLOCK, HOLDLOCK)
      WHERE innkommende_hendelse_id = @innkommende_hendelse_id);
END
GO
