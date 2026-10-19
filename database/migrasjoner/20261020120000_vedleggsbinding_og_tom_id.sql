-- Oppfølgingen av vedleggsleveringen og tegnklassen (#877).
--
-- Punkt 18: vilkåret «vedlegget er bundet i jobbens sak og prosjekt» står i én funksjon,
-- `koe.bundet_vedlegg`, som `koe_api.vedlegg_i_levering`, `koe_api.vedleggsinnhold`,
-- `koe_api.kvitter_vedlegg` og `koe_api.kvitter_levering` leser. `vedleggsinnhold`
-- krevde ikke `bundet_av_event_id IS NOT NULL`; nå gir den ikke innholdet til et vedlegg
-- som ikke er bundet. Prosedyrene og funksjonen har samme eier, så `koe_jobbkjoerer`
-- trenger ingen rett på funksjonen, som for `koe.brevets_vedlegg`.
--
-- #889 punkt 3: prosedyrene som skriver en kvittering eller en topic, prøver «tom» med
-- `DATALENGTH`, som skrankene (`20261020070000_tom_og_tegnklasse.sql`). En ID av bare
-- mellomrom gir da 547 på tegnklassen, ikke 51422.
--
-- #889 punkt 1: `koe.vedleggskvittering.catenda_id` får tegnklassen i stedet for
-- RTRIM-kontrollen, som `koe.leveringskvittering.catenda_id`.
--
-- #889 punkt 7: `koe.sak_catenda_topic.catenda_board_id` får tegnklassen. Skriverne
-- skriver bare en UUID med små bokstaver.

CREATE FUNCTION koe.bundet_vedlegg (@vedlegg_id uniqueidentifier, @sak_id nvarchar(36), @prosjekt_id nvarchar(100))
RETURNS TABLE
AS
RETURN
  SELECT v.vedlegg_id, v.innhold
    FROM koe.vedlegg v
   WHERE v.vedlegg_id = @vedlegg_id AND v.sak_id = @sak_id AND v.prosjekt_id = @prosjekt_id
     AND v.bundet_av_event_id IS NOT NULL;
GO

CREATE OR ALTER PROCEDURE koe_api.vedlegg_i_levering
  @lease uniqueidentifier
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  SELECT COALESCE(LOWER(CONVERT(nvarchar(36), v.vedlegg_id)), LOWER(b.vedlegg_tekst)) AS vedlegg_id, b.filnavn,
         CAST(IIF(v.vedlegg_id IS NULL, 0, 1) AS bit) AS finnes,
         kd.catenda_id AS dokument_id, kr.catenda_id AS referanse_id
    FROM koe.jobb j
    JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
   CROSS APPLY koe.brevets_vedlegg(o.innhold) b
   OUTER APPLY koe.bundet_vedlegg(b.vedlegg_id, j.sak_id, j.prosjekt_id) v
    LEFT JOIN koe.vedleggskvittering kd ON kd.vedlegg_id = v.vedlegg_id AND kd.operasjon = N'dokument'
    LEFT JOIN koe.vedleggskvittering kr ON kr.vedlegg_id = v.vedlegg_id AND kr.operasjon = N'dokumentreferanse'
   WHERE j.jobb_id = @jobb
   ORDER BY b.posisjon;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.vedleggsinnhold
  @lease uniqueidentifier, @vedlegg_id uniqueidentifier
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  SELECT v.innhold
    FROM koe.jobb j
    JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
   CROSS APPLY koe.bundet_vedlegg(@vedlegg_id, j.sak_id, j.prosjekt_id) v
   WHERE j.jobb_id = @jobb AND v.innhold IS NOT NULL
     AND EXISTS (SELECT 1 FROM koe.brevets_vedlegg(o.innhold) b WHERE b.vedlegg_id = @vedlegg_id);
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.kvitter_vedlegg
  @lease uniqueidentifier, @vedlegg_id uniqueidentifier, @operasjon nvarchar(20), @catenda_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @vedlegg_id IS NULL OR @operasjon IS NULL OR @catenda_id IS NULL OR DATALENGTH(@catenda_id) = 0
    THROW 51422, N'Vedlegget, operasjonen eller Catenda-ID-en mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3), @kvittert nvarchar(100);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  IF NOT EXISTS (
    SELECT 1 FROM koe.jobb j
      JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
     CROSS APPLY koe.bundet_vedlegg(@vedlegg_id, j.sak_id, j.prosjekt_id) v
     WHERE j.jobb_id = @jobb
       AND EXISTS (SELECT 1 FROM koe.brevets_vedlegg(o.innhold) b WHERE b.vedlegg_id = @vedlegg_id))
    THROW 51422, N'Vedlegget hører ikke til brevet', 1;
  SELECT @kvittert = catenda_id FROM koe.vedleggskvittering WITH (UPDLOCK, HOLDLOCK)
   WHERE vedlegg_id = @vedlegg_id AND operasjon = @operasjon;
  IF @kvittert IS NULL
  BEGIN
    INSERT koe.vedleggskvittering (vedlegg_id, operasjon, prosjekt_id, leveringsoppdrag_id, catenda_id, forsoek_id, kvittert, forutsetning)
    SELECT @vedlegg_id, @operasjon, prosjekt_id, leveringsoppdrag_id, @catenda_id, @lease, @naa,
           IIF(@operasjon = N'dokumentreferanse', N'dokument', NULL)
      FROM koe.jobb WHERE jobb_id = @jobb;
    IF @operasjon = N'dokument'
      UPDATE koe.vedlegg SET innhold = NULL WHERE vedlegg_id = @vedlegg_id;
  END
  ELSE IF @kvittert COLLATE Latin1_General_100_BIN2 <> @catenda_id COLLATE Latin1_General_100_BIN2
    THROW 51409, N'Vedlegget er kvittert med en annen Catenda-ID', 1;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.kvitter_levering
  @lease uniqueidentifier, @referanse_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF DATALENGTH(@referanse_id) = 0
    THROW 51422, N'Dokumentreferansen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3), @innhold nvarchar(max),
          @sak nvarchar(36), @prosjekt nvarchar(100);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  SELECT @innhold = o.innhold, @sak = j.sak_id, @prosjekt = j.prosjekt_id
    FROM koe.jobb j JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
   WHERE j.jobb_id = @jobb;
  IF IIF(JSON_QUERY(@innhold, '$.dokument') IS NULL, 1, 0) <> IIF(@referanse_id IS NULL, 1, 0)
    THROW 51422, N'Dokumentreferansen mangler, eller oppdraget har ikke noe dokument', 1;
  IF EXISTS (
    SELECT 1 FROM koe.brevets_vedlegg(@innhold) b
     WHERE NOT EXISTS (SELECT 1 FROM koe.bundet_vedlegg(b.vedlegg_id, @sak, @prosjekt) v
                         JOIN koe.vedleggskvittering k
                           ON k.vedlegg_id = v.vedlegg_id AND k.operasjon = N'dokumentreferanse'))
    THROW 51422, N'Et vedlegg i brevet står ikke på topicen', 1;
  IF @referanse_id IS NOT NULL
    INSERT koe.leveringskvittering (leveringsoppdrag_id, operasjon, prosjekt_id, catenda_id, forsoek_id, kvittert, forutsetning)
    SELECT leveringsoppdrag_id, N'dokumentreferanse', prosjekt_id, @referanse_id, @lease, @naa, N'dokument'
      FROM koe.jobb WHERE jobb_id = @jobb;
  EXEC koe_api.avslutt_forsoek @jobb, @lease, @startet, @naa, N'utfoert', NULL;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.kvitter_topic
  @lease uniqueidentifier, @topic_id nvarchar(100)
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
  INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id)
  SELECT sak_id, prosjekt_id, LOWER(CONVERT(nvarchar(36), catenda_board_id)), @topic_id
    FROM koe.jobb WHERE jobb_id = @jobb;
  EXEC koe_api.avslutt_forsoek @jobb, @lease, @startet, @naa, N'utfoert', NULL;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.kvitter_dokument
  @lease uniqueidentifier, @dokument_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @dokument_id IS NULL OR DATALENGTH(@dokument_id) = 0
    THROW 51422, N'Dokumentet mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  INSERT koe.leveringskvittering (leveringsoppdrag_id, operasjon, prosjekt_id, catenda_id, forsoek_id, kvittert)
  SELECT leveringsoppdrag_id, N'dokument', prosjekt_id, @dokument_id, @lease, @naa
    FROM koe.jobb WHERE jobb_id = @jobb;
  COMMIT;
END
GO

ALTER TABLE koe.vedleggskvittering DROP CONSTRAINT vedleggskvittering_catenda_id_form;
ALTER TABLE koe.vedleggskvittering ADD CONSTRAINT vedleggskvittering_catenda_id_ikke_tom
  CHECK (DATALENGTH(catenda_id) > 0);
ALTER TABLE koe.vedleggskvittering ADD CONSTRAINT vedleggskvittering_catenda_id_tegnklasse
  CHECK (NOT catenda_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');

ALTER TABLE koe.sak_catenda_topic ADD CONSTRAINT sak_catenda_topic_board_tegnklasse
  CHECK (NOT catenda_board_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');
