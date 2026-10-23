-- Boardet med utfallet er der løkka skriver kommentaren, så `registrer_behandling` godtar
-- det bare når det er `topic_board_id` for prosjektet med utfallet, eller boardet i
-- topickoblingen til saken med utfallet (punkt 8 i #972). Et board uten prosjekt, eller som
-- ikke er en UUID, avvises også. Koblingen til prosjektet trenger ikke være aktiv:
-- behandlingen slo opp prosjektet i en aktiv kobling, og den kan være deaktivert før
-- utfallet lagres. Topickoblingen gjelder en sak som alt er opprettet, også etter et byttet
-- topicboard. Har hendelsen et utfall, gjør kallet ingenting, som før. Prosedyren er sist
-- definert i `20261020140000_innkommende_forsoek_og_kommentar.sql`.

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
  IF EXISTS (SELECT 1 FROM koe.innkommende_behandling
              WHERE innkommende_hendelse_id = @innkommende_hendelse_id)
    RETURN;
  IF @catenda_board_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM koe.catenda_project_configs
     WHERE internal_project_id = @prosjekt_id
       AND topic_board_id = TRY_CONVERT(uniqueidentifier, @catenda_board_id))
  AND NOT EXISTS (
    SELECT 1 FROM koe.sak_catenda_topic
     WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt_id
       AND TRY_CONVERT(uniqueidentifier, catenda_board_id) = TRY_CONVERT(uniqueidentifier, @catenda_board_id)
       AND TRY_CONVERT(uniqueidentifier, catenda_topic_id) = TRY_CONVERT(uniqueidentifier, @catenda_topic_id))
    THROW 54003, N'Boardet er verken topicboardet til prosjektet eller boardet i topickoblingen til saken med utfallet', 1;
  INSERT koe.innkommende_behandling
    (innkommende_hendelse_id, utfall, prosjekt_id, sak_id, catenda_topic_id, catenda_board_id, melding)
  SELECT @innkommende_hendelse_id, @utfall, @prosjekt_id, @sak_id, @catenda_topic_id, @catenda_board_id, @melding
   WHERE NOT EXISTS (
     SELECT 1 FROM koe.innkommende_behandling WITH (UPDLOCK, HOLDLOCK)
      WHERE innkommende_hendelse_id = @innkommende_hendelse_id);
END
GO
