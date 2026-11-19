-- Korrelasjon i driftsloggen (#1805). Tidligere rader får NULL.
ALTER TABLE koe.jobb ADD
  korrelasjons_id uniqueidentifier NULL CONSTRAINT jobb_korrelasjons_id
    DEFAULT TRY_CONVERT(uniqueidentifier, SESSION_CONTEXT(N'koe_korrelasjon')),
  logg_aktor_id uniqueidentifier NULL CONSTRAINT jobb_logg_aktor_id
    DEFAULT TRY_CONVERT(uniqueidentifier, SESSION_CONTEXT(N'koe_aktor'));
GO

ALTER TABLE koe.innkommende_hendelse ADD korrelasjons_id uniqueidentifier NULL;
GO

CREATE OR ALTER PROCEDURE koe_api.hent_jobb
  @leasetid_sekunder int
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @leasetid_sekunder IS NULL OR @leasetid_sekunder NOT BETWEEN 1 AND 3600
    THROW 51422, N'Leasetiden må være mellom 1 og 3600 sekunder', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @utloept TABLE (jobb_id uniqueidentifier PRIMARY KEY, lease uniqueidentifier NOT NULL, startet datetime2(3) NOT NULL);
  DECLARE @jobb uniqueidentifier, @lease uniqueidentifier;

  BEGIN TRANSACTION;
  INSERT @utloept (jobb_id, lease, startet)
  SELECT jobb_id, lease, lease_startet
    FROM koe.jobb WITH (UPDLOCK, READPAST, ROWLOCK)
   WHERE tilstand = N'venter' AND lease IS NOT NULL AND lease_utloeper <= @naa;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  SELECT lease, jobb_id, startet, @naa, N'usikkert', N'Leasen utløp uten kvittering.'
    FROM @utloept;
  -- Søk på nøkkelen, så oppdateringen ikke venter på rader en annen kjører har låst.
  IF EXISTS (SELECT 1 FROM @utloept)
    UPDATE j
       SET tilstand = N'parkert', lease = NULL, lease_startet = NULL, lease_utloeper = NULL, siste_forsoek = u.lease
      FROM @utloept u INNER LOOP JOIN koe.jobb j WITH (FORCESEEK) ON j.jobb_id = u.jobb_id;

  WHILE 1 = 1
  BEGIN
    SET @jobb = NULL;
    SELECT TOP (1) @jobb = j.jobb_id
      FROM koe.jobb j WITH (UPDLOCK, READPAST, ROWLOCK)
     WHERE j.tilstand = N'venter' AND j.lease IS NULL AND j.neste_forsoek <= @naa
       AND (j.jobbtype <> N'levering' OR EXISTS (SELECT 1 FROM koe.sak_catenda_topic t WHERE t.sak_id = j.sak_id))
     ORDER BY j.neste_forsoek, j.jobb_id;
    IF @jobb IS NULL BREAK;
    SET @lease = NEWID();
    IF EXISTS (
      SELECT 1 FROM koe.jobb j
        JOIN koe.catenda_project_configs c
          ON c.internal_project_id = j.prosjekt_id AND c.is_active = 1 AND c.catenda_project_id = j.catenda_project_id
        LEFT JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
       WHERE j.jobb_id = @jobb
         AND ((j.jobbtype = N'catenda_topic' AND c.topic_board_id = j.catenda_board_id)
           OR (j.jobbtype = N'levering'
               AND c.library_id = TRY_CAST(JSON_VALUE(o.innhold, '$.maal.library_id') AS uniqueidentifier)
               AND EXISTS (SELECT c.folder_id
                           INTERSECT SELECT TRY_CAST(JSON_VALUE(o.innhold, '$.maal.folder_id') AS uniqueidentifier)))))
    BEGIN
      UPDATE koe.jobb
         SET lease = @lease, lease_startet = @naa, lease_utloeper = DATEADD(second, @leasetid_sekunder, @naa),
             antall_forsoek = antall_forsoek + 1
       WHERE jobb_id = @jobb;
      BREAK;
    END
    INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
    VALUES (@lease, @jobb, NULL, @naa, N'kobling_endret',
            N'Koblingen, boardet, biblioteket eller Catenda-prosjektet er endret etter at jobben ble lagt inn.');
    UPDATE koe.jobb SET tilstand = N'parkert', siste_forsoek = @lease WHERE jobb_id = @jobb;
  END
  COMMIT;

  SELECT j.jobb_id, j.jobbtype, j.lease, j.sak_id, j.prosjekt_id,
         j.korrelasjons_id, j.logg_aktor_id AS aktor_id,
         LOWER(CONVERT(nvarchar(36), j.catenda_board_id)) AS catenda_board_id, j.tittel,
         o.dokumentnoekkel, o.innhold AS oppdrag,
         t.catenda_board_id AS topic_board_id, t.catenda_topic_id AS topic_id, k.catenda_id AS dokument_id
    FROM koe.jobb j
    LEFT JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
    LEFT JOIN koe.sak_catenda_topic t ON t.sak_id = j.sak_id AND j.jobbtype = N'levering'
    LEFT JOIN koe.leveringskvittering k ON k.leveringsoppdrag_id = j.leveringsoppdrag_id AND k.operasjon = N'dokument'
   WHERE j.jobb_id = @jobb AND j.lease = @lease;
END
GO

CREATE OR ALTER PROCEDURE koe_api.motta_hendelse
  @kilde nvarchar(4000),
  @hendelse_id nvarchar(4000),
  @hendelsestype nvarchar(4000),
  @kropp nvarchar(max),
  @ny bit OUTPUT,
  @korrelasjons_id uniqueidentifier = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.innkommende_hendelse (kilde, hendelse_id, hendelsestype, kropp, korrelasjons_id)
  SELECT @kilde, @hendelse_id, @hendelsestype, @kropp, @korrelasjons_id
   WHERE NOT EXISTS (
     SELECT 1 FROM koe.innkommende_hendelse WITH (UPDLOCK, HOLDLOCK)
      WHERE kilde = @kilde AND hendelse_id = @hendelse_id);
  SET @ny = CASE WHEN @@ROWCOUNT = 1 THEN 1 ELSE 0 END;
END
GO

CREATE OR ALTER PROCEDURE koe_api.neste_innkommende
  @naa datetime2(3) = NULL
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET @naa = ISNULL(@naa, SYSUTCDATETIME());
  SELECT TOP (1) i.id, i.hendelse_id, i.hendelsestype, i.kropp, i.korrelasjons_id,
         f.uten_topic AS forsoek_uten_topic
    FROM koe.innkommende_hendelse i
   CROSS APPLY (SELECT COUNT(*) AS antall, MAX(forsoekt) AS siste,
                       ISNULL(SUM(CAST(topic_ikke_funnet AS int)), 0) AS uten_topic
                  FROM koe.innkommende_forsoek
                 WHERE innkommende_hendelse_id = i.id AND steg = N'behandling') f
   WHERE NOT EXISTS (SELECT 1 FROM koe.innkommende_behandling b WHERE b.innkommende_hendelse_id = i.id)
     AND (f.antall = 0
          OR f.siste <= DATEADD(second, -IIF(f.antall >= 8, 3600, 30 * POWER(2, f.antall - 1)), @naa))
   ORDER BY i.id;
END
GO

CREATE OR ALTER PROCEDURE koe_api.neste_kommentar
  @naa datetime2(3) = NULL
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET @naa = ISNULL(@naa, SYSUTCDATETIME());
  SELECT TOP (1) b.innkommende_hendelse_id AS id, b.utfall, b.prosjekt_id, b.sak_id,
         b.catenda_board_id, b.catenda_topic_id, b.melding, i.korrelasjons_id
    FROM koe.innkommende_behandling b
    JOIN koe.innkommende_hendelse i ON i.id = b.innkommende_hendelse_id
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
