-- Oppfølgingen av vedleggsleveringen (#876, `20261020020000_vedleggslevering.sql`).
--
-- Vedleggslista i brevet leses ett sted: `koe.brevets_vedlegg` gir stien
-- `$.brev.dokument.dokumentasjon` og castingen av `vedlegg_id` for triggeren og de fire
-- prosedyrene som leste den hver for seg. En ID som ikke er en UUID, gir `vedlegg_id`
-- NULL og finnes da aldri.
--
-- `koe_api.kvitter_levering` krever at hvert vedlegg i brevet er bundet i jobbens sak og
-- prosjekt, ikke bare at det har en kvittert referanse.
--
-- `koe_api.forny_lease` forlenger leasen til et forsøk som pågår. Leveringen fornyer den
-- før hvert vedlegg og før brevet, så leasetiden gjelder ett steg og ikke hele
-- leveringen, som har ett steg per vedlegg.

CREATE FUNCTION koe.brevets_vedlegg (@innhold nvarchar(max))
RETURNS TABLE
AS
RETURN
  SELECT CAST(b.[key] AS int) AS posisjon,
         JSON_VALUE(b.value, '$.vedlegg_id') AS vedlegg_tekst,
         TRY_CAST(JSON_VALUE(b.value, '$.vedlegg_id') AS uniqueidentifier) AS vedlegg_id,
         JSON_VALUE(b.value, '$.filnavn') AS filnavn
    FROM OPENJSON(@innhold, '$.brev.dokument.dokumentasjon') b;
GO

CREATE OR ALTER TRIGGER koe.leveringsoppdrag_levering ON koe.leveringsoppdrag AFTER INSERT AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.jobb (jobbtype, sak_id, prosjekt_id, catenda_project_id, leveringsoppdrag_id, neste_forsoek)
  SELECT N'levering', i.sak_id, i.prosjekt_id,
         TRY_CAST(JSON_VALUE(i.innhold, '$.maal.catenda_project_id') AS uniqueidentifier), i.id,
         DATETRUNC(millisecond, SYSUTCDATETIME())
    FROM inserted i
   WHERE JSON_QUERY(i.innhold, '$.dokument') IS NOT NULL
      OR EXISTS (SELECT 1 FROM koe.brevets_vedlegg(i.innhold));
END
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
  SELECT LOWER(b.vedlegg_tekst) AS vedlegg_id, b.filnavn,
         CAST(IIF(v.vedlegg_id IS NULL, 0, 1) AS bit) AS finnes,
         kd.catenda_id AS dokument_id, kr.catenda_id AS referanse_id
    FROM koe.jobb j
    JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
   CROSS APPLY koe.brevets_vedlegg(o.innhold) b
    LEFT JOIN koe.vedlegg v
      ON v.vedlegg_id = b.vedlegg_id
     AND v.sak_id = j.sak_id AND v.prosjekt_id = j.prosjekt_id AND v.bundet_av_event_id IS NOT NULL
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
    JOIN koe.vedlegg v ON v.vedlegg_id = @vedlegg_id AND v.sak_id = j.sak_id AND v.prosjekt_id = j.prosjekt_id
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
  IF @vedlegg_id IS NULL OR @operasjon IS NULL OR @catenda_id IS NULL OR LEN(@catenda_id) = 0
    THROW 51422, N'Vedlegget, operasjonen eller Catenda-ID-en mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3), @kvittert nvarchar(100);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  IF NOT EXISTS (
    SELECT 1 FROM koe.jobb j
      JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
      JOIN koe.vedlegg v ON v.vedlegg_id = @vedlegg_id AND v.sak_id = j.sak_id AND v.prosjekt_id = j.prosjekt_id
                        AND v.bundet_av_event_id IS NOT NULL
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
  IF LEN(@referanse_id) = 0
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
     WHERE NOT EXISTS (SELECT 1 FROM koe.vedlegg v
                         JOIN koe.vedleggskvittering k
                           ON k.vedlegg_id = v.vedlegg_id AND k.operasjon = N'dokumentreferanse'
                        WHERE v.vedlegg_id = b.vedlegg_id AND v.sak_id = @sak AND v.prosjekt_id = @prosjekt
                          AND v.bundet_av_event_id IS NOT NULL))
    THROW 51422, N'Et vedlegg i brevet står ikke på topicen', 1;
  IF @referanse_id IS NOT NULL
    INSERT koe.leveringskvittering (leveringsoppdrag_id, operasjon, prosjekt_id, catenda_id, forsoek_id, kvittert, forutsetning)
    SELECT leveringsoppdrag_id, N'dokumentreferanse', prosjekt_id, @referanse_id, @lease, @naa, N'dokument'
      FROM koe.jobb WHERE jobb_id = @jobb;
  EXEC koe_api.avslutt_forsoek @jobb, @lease, @startet, @naa, N'utfoert', NULL;
  COMMIT;
END
GO

-- Forlenger leasen til `@leasetid_sekunder` fra nå. En utløpt eller ukjent lease
-- fornyes ikke (54001), som i `koe_api.laas_lease`.
CREATE PROCEDURE koe_api.forny_lease
  @lease uniqueidentifier, @leasetid_sekunder int
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @leasetid_sekunder IS NULL OR @leasetid_sekunder NOT BETWEEN 1 AND 3600
    THROW 51422, N'Leasetiden må være mellom 1 og 3600 sekunder', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, NULL, @naa, @jobb OUTPUT, @startet OUTPUT;
  UPDATE koe.jobb SET lease_utloeper = DATEADD(second, @leasetid_sekunder, @naa) WHERE jobb_id = @jobb;
  COMMIT;
END
GO

GRANT EXECUTE ON koe_api.forny_lease TO koe_runtime;
