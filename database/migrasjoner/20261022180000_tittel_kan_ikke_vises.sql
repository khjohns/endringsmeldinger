-- En topic fra TE med et tegn i tittelen som PDF-en av brevet ikke kan vise, gir ingen sak.
-- Utfallet `tittel_kan_ikke_vises` får en kommentar på topicen med tegnene, og når TE har
-- rettet tittelen, behandles endringen av topicen som et nytt forsøk på opprettelsen
-- (arbeidsvalgene 22.10 i #1138). Meldingen er kommentarens tegnliste, så
-- `neste_kommentar` gir den med, og et nytt forsøk skriver samme tekst. Har topicen fått en
-- sak (`koe.sak_catenda_topic`, skrevet i samme transaksjon som saken), skrives ingen
-- kommentar om avvisningen, og en endring av topicen behandles ikke.

ALTER TABLE koe.innkommende_behandling DROP CONSTRAINT innkommende_behandling_utfall;
GO

ALTER TABLE koe.innkommende_behandling ADD CONSTRAINT innkommende_behandling_utfall CHECK (utfall IN (
  N'sak_opprettet', N'topic_fra_bh', N'sakstype_ikke_stoettet', N'topic_har_sak',
  N'laget_av_integrasjonen', N'ukjent_prosjekt', N'ukjent_forfatter', N'ukjent_side',
  N'avvist', N'ugyldig_hendelse', N'ikke_behandlet_type', N'feilet', N'tittel_kan_ikke_vises'));
GO

-- Det eldste utfallet som skal ha en kommentar og ikke har en kvittering, og som ikke
-- venter etter et forsøk. `@naa` som i `neste_innkommende`.
ALTER PROCEDURE koe_api.neste_kommentar
  @naa datetime2(3) = NULL
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET @naa = ISNULL(@naa, SYSUTCDATETIME());
  SELECT TOP (1) b.innkommende_hendelse_id AS id, b.utfall, b.prosjekt_id, b.sak_id,
         b.catenda_board_id, b.catenda_topic_id, b.melding
    FROM koe.innkommende_behandling b
   CROSS APPLY (SELECT COUNT(*) AS antall, MAX(forsoekt) AS siste
                  FROM koe.innkommende_forsoek
                 WHERE innkommende_hendelse_id = b.innkommende_hendelse_id AND steg = N'kommentar') f
   WHERE b.utfall IN (N'sak_opprettet', N'topic_fra_bh', N'sakstype_ikke_stoettet', N'tittel_kan_ikke_vises')
     AND b.catenda_board_id IS NOT NULL AND b.catenda_topic_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM koe.topic_kommentar k WHERE k.innkommende_hendelse_id = b.innkommende_hendelse_id)
     AND NOT (b.utfall = N'tittel_kan_ikke_vises' AND EXISTS (
           SELECT 1 FROM koe.sak_catenda_topic t
            WHERE t.prosjekt_id = b.prosjekt_id AND t.catenda_topic_id = b.catenda_topic_id))
     AND (f.antall = 0
          OR f.siste <= DATEADD(second, -IIF(f.antall >= 8, 3600, 30 * POWER(2, f.antall - 1)), @naa))
   ORDER BY b.innkommende_hendelse_id;
END
GO

-- Om en tidligere hendelse for topicen i prosjektet ble avvist for tittelen, og ingen ga en
-- sak. Da behandles en endring av topicen som et nytt forsøk på opprettelsen.
CREATE PROCEDURE koe_api.tittel_avvist_for_topic
  @prosjekt_id nvarchar(100),
  @catenda_topic_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SELECT CAST(IIF(EXISTS (
    SELECT 1 FROM koe.innkommende_behandling
     WHERE utfall = N'tittel_kan_ikke_vises' AND prosjekt_id = @prosjekt_id
       AND catenda_topic_id = @catenda_topic_id)
    AND NOT EXISTS (
    SELECT 1 FROM koe.sak_catenda_topic
     WHERE prosjekt_id = @prosjekt_id AND catenda_topic_id = @catenda_topic_id), 1, 0) AS bit) AS avvist;
END
GO

GRANT EXECUTE ON koe_api.tittel_avvist_for_topic TO koe_runtime;
GO
