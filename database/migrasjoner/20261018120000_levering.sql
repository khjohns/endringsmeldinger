-- Leveringen av brevet til Catenda (L-1b, #371 del 1).
--
-- Leveringsoppdraget (LV-U1) får en jobb av typen `levering` i samme transaksjon som
-- brevet, lagt inn av triggeren `koe.leveringsoppdrag_levering`, så `skriv_hendelse`
-- står som før. Bare et brev med tekst fra appen får jobben; et registrert brev har
-- ingen tekst å levere (MM-U17) og venter på L-1c. Jobben hentes først når saken har
-- topic. Hvert leveringsforsøk står i `koe.jobbforsoek`, som for topicen.
--
-- Brevet er levert når dokumentet ligger i biblioteket og dokumentreferansen står på
-- topicen (B-03, arbeidsvalget 18.10 i #371). Hver av de to operasjonene kvitteres for
-- seg i `koe.leveringskvittering` (invariant 7), så et forsøk etter en kvittert
-- opplasting bare lager referansen.
--
-- Ellers etter review av L-1a (#778): et forsøk som Catenda avviste varig, eller en
-- jobbtype kjøreren ikke kjenner, parkeres som `avvist`; kontrollen av leasen står ett
-- sted (`koe_api.laas_lease`); og en jobb som startes på nytt, begynner backoffen
-- forfra.

ALTER TABLE koe.jobb DROP CONSTRAINT jobb_jobbtype;
GO

ALTER TABLE koe.jobb ADD
  leveringsoppdrag_id uniqueidentifier NULL
    CONSTRAINT jobb_leveringsoppdrag FOREIGN KEY REFERENCES koe.leveringsoppdrag (id),
  CONSTRAINT jobb_jobbtype CHECK (jobbtype IN (N'catenda_topic', N'levering'));
GO

ALTER TABLE koe.jobb ADD CONSTRAINT jobb_leveringsmaal CHECK (
  (jobbtype = N'levering' AND leveringsoppdrag_id IS NOT NULL AND catenda_project_id IS NOT NULL)
  OR (jobbtype <> N'levering' AND leveringsoppdrag_id IS NULL));
CREATE UNIQUE INDEX jobb_en_levering_per_oppdrag ON koe.jobb (leveringsoppdrag_id) WHERE leveringsoppdrag_id IS NOT NULL;
GO

ALTER TABLE koe.jobbforsoek DROP CONSTRAINT jobbforsoek_utfall;
GO

ALTER TABLE koe.jobbforsoek ADD CONSTRAINT jobbforsoek_utfall
  CHECK (utfall IN (N'utfoert', N'feilet', N'usikkert', N'avvist', N'kobling_endret', N'startet_paa_nytt'));
GO

-- Én rad per obligatorisk operasjon, og referansen forutsetter dokumentet. Ingen
-- tabell viser til kvitteringen, så den som har ALTER, kan tømme den med TRUNCATE,
-- som `koe.sak_catenda_topic`. `forsoek_id` er leasen; forsøket med samme ID lagres
-- når forsøket er over.
CREATE TABLE koe.leveringskvittering (
  leveringsoppdrag_id uniqueidentifier NOT NULL
    CONSTRAINT leveringskvittering_oppdrag FOREIGN KEY REFERENCES koe.leveringsoppdrag (id),
  operasjon nvarchar(20) NOT NULL
    CONSTRAINT leveringskvittering_operasjon CHECK (operasjon IN (N'dokument', N'dokumentreferanse')),
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT leveringskvittering_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  catenda_id nvarchar(100) NOT NULL
    CONSTRAINT leveringskvittering_catenda_id_form CHECK (LEN(catenda_id) > 0 AND DATALENGTH(catenda_id) = DATALENGTH(RTRIM(catenda_id))),
  forsoek_id uniqueidentifier NOT NULL,
  kvittert datetime2(3) NOT NULL CONSTRAINT leveringskvittering_kvittert DEFAULT SYSUTCDATETIME(),
  forutsetning nvarchar(20) NULL,
  CONSTRAINT leveringskvittering_pk PRIMARY KEY (leveringsoppdrag_id, operasjon),
  CONSTRAINT leveringskvittering_operasjon_form CHECK (NOT operasjon COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'),
  CONSTRAINT leveringskvittering_forutsetning_form CHECK (NOT forutsetning COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'),
  CONSTRAINT leveringskvittering_rekkefoelge CHECK (
    (operasjon = N'dokument' AND forutsetning IS NULL)
    OR (operasjon = N'dokumentreferanse' AND forutsetning = N'dokument')),
  CONSTRAINT leveringskvittering_forutsetning FOREIGN KEY (leveringsoppdrag_id, forutsetning)
    REFERENCES koe.leveringskvittering (leveringsoppdrag_id, operasjon)
);
GO

CREATE TRIGGER koe.leveringskvittering_uforanderlig ON koe.leveringskvittering INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'En leveringskvittering endres ikke', 1;
END
GO

-- Kjøreveien leser oppdraget og topicen og skriver kvitteringen. Et medlem leser dem.
ALTER SECURITY POLICY koe_sikkerhet.tilgang
  DROP FILTER PREDICATE ON koe.leveringsoppdrag,
  DROP FILTER PREDICATE ON koe.sak_catenda_topic;
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.leveringsoppdrag,
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.sak_catenda_topic,
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.leveringskvittering,
  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer(prosjekt_id) ON koe.leveringskvittering AFTER INSERT;
GO

-- Jobben for et brev med tekst fra appen, med Catenda-prosjektet fra det frosne målet.
-- Kuttet som `@naa` i `hent_jobb`, så jobben er klar straks.
CREATE TRIGGER koe.leveringsoppdrag_levering ON koe.leveringsoppdrag AFTER INSERT AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.jobb (jobbtype, sak_id, prosjekt_id, catenda_project_id, leveringsoppdrag_id, neste_forsoek)
  SELECT N'levering', i.sak_id, i.prosjekt_id,
         TRY_CAST(JSON_VALUE(i.innhold, '$.maal.catenda_project_id') AS uniqueidentifier), i.id,
         DATETRUNC(millisecond, SYSUTCDATETIME())
    FROM inserted i
   WHERE JSON_QUERY(i.innhold, '$.brev.brevtekst') IS NOT NULL;
END
GO

-- Leasen som gjelder, låst for kvitteringen. Kastes 54001 når den er utløpt, ukjent
-- eller gjelder en annen jobbtype. Kalles bare fra prosedyrene for løkka, i deres
-- transaksjon.
CREATE PROCEDURE koe_api.laas_lease
  @lease uniqueidentifier, @jobbtype nvarchar(40), @naa datetime2(3),
  @jobb uniqueidentifier OUTPUT, @startet datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  SELECT @jobb = NULL, @startet = NULL;
  SELECT @jobb = jobb_id, @startet = lease_startet
    FROM koe.jobb WITH (UPDLOCK, ROWLOCK)
   WHERE lease = @lease AND lease_utloeper > @naa AND (@jobbtype IS NULL OR jobbtype = @jobbtype);
  IF @jobb IS NULL
    THROW 54001, N'Leasen gjelder ikke', 1;
END
GO

-- Som i `20261018100000_jobber.sql`, med leveringen: den hentes når saken har topic,
-- og parkeres når koblingen, Catenda-prosjektet, biblioteket eller mappen er endret
-- etter frysingen (invariant 6).
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

CREATE OR ALTER PROCEDURE koe_api.kvitter_topic
  @lease uniqueidentifier, @topic_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @topic_id IS NULL OR LEN(@topic_id) = 0
    THROW 51422, N'Topicen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'catenda_topic', @naa, @jobb OUTPUT, @startet OUTPUT;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@lease, @jobb, @startet, @naa, N'utfoert', NULL);
  INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id)
  SELECT sak_id, prosjekt_id, LOWER(CONVERT(nvarchar(36), catenda_board_id)), @topic_id
    FROM koe.jobb WHERE jobb_id = @jobb;
  UPDATE koe.jobb
     SET tilstand = N'utfoert', lease = NULL, lease_startet = NULL, lease_utloeper = NULL, siste_forsoek = @lease
   WHERE jobb_id = @jobb;
  COMMIT;
END
GO

-- Dokumentet ligger i biblioteket. Leasen gjelder fortsatt, og forsøket fortsetter
-- med referansen.
CREATE PROCEDURE koe_api.kvitter_dokument
  @lease uniqueidentifier, @dokument_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @dokument_id IS NULL OR LEN(@dokument_id) = 0
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

-- Referansen står på topicen, og brevet er levert: kvitteringen, forsøket og jobben
-- som utført i én transaksjon.
CREATE PROCEDURE koe_api.kvitter_levering
  @lease uniqueidentifier, @referanse_id nvarchar(100)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @referanse_id IS NULL OR LEN(@referanse_id) = 0
    THROW 51422, N'Dokumentreferansen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  INSERT koe.leveringskvittering (leveringsoppdrag_id, operasjon, prosjekt_id, catenda_id, forsoek_id, kvittert, forutsetning)
  SELECT leveringsoppdrag_id, N'dokumentreferanse', prosjekt_id, @referanse_id, @lease, @naa, N'dokument'
    FROM koe.jobb WHERE jobb_id = @jobb;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@lease, @jobb, @startet, @naa, N'utfoert', NULL);
  UPDATE koe.jobb
     SET tilstand = N'utfoert', lease = NULL, lease_startet = NULL, lease_utloeper = NULL, siste_forsoek = @lease
   WHERE jobb_id = @jobb;
  COMMIT;
END
GO

-- Et forsøk som feilet. Et usikkert eller avvist utfall parkerer jobben (invariant 7);
-- ellers prøves den igjen etter 30 s · 2^(n−1), med tak på 1 time (arbeidsvalget 18.10).
DROP PROCEDURE koe_api.registrer_jobbfeil;
GO

CREATE PROCEDURE koe_api.registrer_jobbfeil
  @lease uniqueidentifier, @utfall nvarchar(20), @melding nvarchar(400)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @utfall IS NULL OR @utfall NOT IN (N'feilet', N'usikkert', N'avvist') OR @melding IS NULL OR LEN(@melding) = 0
    THROW 51422, N'Utfallet eller meldingen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, NULL, @naa, @jobb OUTPUT, @startet OUTPUT;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@lease, @jobb, @startet, @naa, @utfall, @melding);
  UPDATE koe.jobb
     SET tilstand = IIF(@utfall = N'feilet', N'venter', N'parkert'),
         neste_forsoek = DATEADD(second, IIF(antall_forsoek >= 8, 3600, 30 * POWER(2, antall_forsoek - 1)), @naa),
         lease = NULL, lease_startet = NULL, lease_utloeper = NULL, siste_forsoek = @lease
   WHERE jobb_id = @jobb;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.start_jobb_paa_nytt
  @jobb_id uniqueidentifier
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME()), @forsoek uniqueidentifier = NEWID();
  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.jobb WITH (UPDLOCK, ROWLOCK) WHERE jobb_id = @jobb_id AND tilstand = N'parkert')
    THROW 54002, N'Jobben finnes ikke eller er ikke parkert', 1;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@forsoek, @jobb_id, NULL, @naa, N'startet_paa_nytt', LEFT(ORIGINAL_LOGIN(), 400));
  UPDATE koe.jobb
     SET tilstand = N'venter', neste_forsoek = @naa, antall_forsoek = 0, siste_forsoek = @forsoek
   WHERE jobb_id = @jobb_id;
  COMMIT;
END
GO

GRANT EXECUTE ON koe_api.registrer_jobbfeil TO koe_runtime;
GRANT EXECUTE ON koe_api.kvitter_dokument TO koe_runtime;
GRANT EXECUTE ON koe_api.kvitter_levering TO koe_runtime;
