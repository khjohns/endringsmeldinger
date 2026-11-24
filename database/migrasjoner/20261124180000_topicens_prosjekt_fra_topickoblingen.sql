-- #1210: et nytt forsøk etter en opprettet sak når saken også når topicboardet er byttet.
-- Har topicen en topickobling med boardet fra webhooken, i et prosjekt med aktiv kobling
-- til Catenda-prosjektet fra webhooken, er prosjektet det. Ellers er prosjektet den aktive
-- koblingen med topicboardet, som før. En deaktivert kobling gir fortsatt ikke noe
-- prosjekt: triggeren på koblingen deaktiverer medlemskapene, så kvitteringen kan ikke
-- leses for forfatteren.
-- `fra_topickoblingen` sier hvilken vei prosjektet ble funnet: da finnes saken, og
-- behandlingen gir et annet utfall enn saken uten boardet, så `registrer_behandling` godtar
-- det og topicen ikke får en kommentar om at saken ikke er opprettet.
-- Prosjektet tas aldri fra kalleren. `@topic` er valgfri, så forrige utgivelse kan kalle
-- prosedyren som før. Prosedyren er sist definert i
-- `20261020130000_innkommende_behandling.sql`.

ALTER PROCEDURE koe_api.topicens_prosjekt
  @catenda_prosjekt uniqueidentifier,
  @board uniqueidentifier,
  @topic uniqueidentifier = NULL
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @prosjekt nvarchar(100) = (
    SELECT TOP (1) t.prosjekt_id FROM koe.sak_catenda_topic t
      JOIN koe.catenda_project_configs k ON k.internal_project_id = t.prosjekt_id
     WHERE @topic IS NOT NULL
       AND TRY_CONVERT(uniqueidentifier, t.catenda_topic_id) = @topic
       AND TRY_CONVERT(uniqueidentifier, t.catenda_board_id) = @board
       AND k.catenda_project_id = @catenda_prosjekt AND k.is_active = 1);
  IF @prosjekt IS NOT NULL
    SELECT @prosjekt AS prosjekt_id, CAST(1 AS bit) AS fra_topickoblingen;
  ELSE
    SELECT internal_project_id AS prosjekt_id, CAST(0 AS bit) AS fra_topickoblingen
      FROM koe.catenda_project_configs
     WHERE catenda_project_id = @catenda_prosjekt AND topic_board_id = @board AND is_active = 1;
END
GO
