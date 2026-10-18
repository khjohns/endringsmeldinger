-- Leveringen av vedleggene til Catenda (V-3, del av #790). Hvert vedlegg brevet binder,
-- blir et dokument i samme bibliotek og mappe som brevet, med en dokumentreferanse på
-- topicen (arbeidsvalg 7 i #790). Leveringen er fullført når brevet, hvis det har et
-- dokument, og hvert vedlegg står på topicen; da kvitterer `koe_api.kvitter_levering`
-- og jobben er utført.
--
-- Et registrert brev blir ikke et eget dokument, men vedleggene leveres (LV-U11). Derfor
-- får et oppdrag jobben også når det bare har vedlegg. Vedleggslista leses ett sted:
-- `$.brev.dokument.dokumentasjon`, som er det brevet lagret (LV-U14, #827 punkt 6).
--
-- Kvitteringen gjelder vedlegget, ikke oppdraget: et vedlegg et senere brev viser til
-- igjen, ligger alt i Catenda og leveres ikke på nytt. Når dokumentet er kvittert,
-- slettes innholdet hos oss, og ID-en, filnavnet og summen blir stående (LV-U12).
--
-- Ellers: avslutningen av et forsøk står ett sted (`koe_api.avslutt_forsoek`, #783
-- punkt 7), og den lagrede PDF-en hentes med `koe_api.lagre_brevdokument` uten PDF
-- (#805 punkt 5).

CREATE TABLE koe.vedleggskvittering (
  vedlegg_id uniqueidentifier NOT NULL
    CONSTRAINT vedleggskvittering_vedlegg FOREIGN KEY REFERENCES koe.vedlegg (vedlegg_id),
  operasjon nvarchar(20) NOT NULL
    CONSTRAINT vedleggskvittering_operasjon CHECK (operasjon IN (N'dokument', N'dokumentreferanse')),
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT vedleggskvittering_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  leveringsoppdrag_id uniqueidentifier NOT NULL
    CONSTRAINT vedleggskvittering_oppdrag FOREIGN KEY REFERENCES koe.leveringsoppdrag (id),
  catenda_id nvarchar(100) NOT NULL
    CONSTRAINT vedleggskvittering_catenda_id_form CHECK (LEN(catenda_id) > 0 AND DATALENGTH(catenda_id) = DATALENGTH(RTRIM(catenda_id))),
  forsoek_id uniqueidentifier NOT NULL,
  kvittert datetime2(3) NOT NULL CONSTRAINT vedleggskvittering_kvittert DEFAULT SYSUTCDATETIME(),
  forutsetning nvarchar(20) NULL,
  CONSTRAINT vedleggskvittering_pk PRIMARY KEY (vedlegg_id, operasjon),
  CONSTRAINT vedleggskvittering_operasjon_form CHECK (NOT operasjon COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'),
  CONSTRAINT vedleggskvittering_forutsetning_form CHECK (NOT forutsetning COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'),
  CONSTRAINT vedleggskvittering_rekkefoelge CHECK (
    (operasjon = N'dokument' AND forutsetning IS NULL)
    OR (operasjon = N'dokumentreferanse' AND forutsetning = N'dokument')),
  CONSTRAINT vedleggskvittering_forutsetning FOREIGN KEY (vedlegg_id, forutsetning)
    REFERENCES koe.vedleggskvittering (vedlegg_id, operasjon)
);
CREATE INDEX vedleggskvittering_oppdrag ON koe.vedleggskvittering (leveringsoppdrag_id);
GO

CREATE TRIGGER koe.vedleggskvittering_uforanderlig ON koe.vedleggskvittering INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'En vedleggskvittering endres ikke', 1;
END
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.vedleggskvittering,
  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer(prosjekt_id) ON koe.vedleggskvittering AFTER INSERT;
GO

-- To endringer er lov: bindingen, `bundet_av_event_id` fra NULL til en hendelse, og
-- slettingen av innholdet i et bundet vedlegg når dokumentet er kvittert (LV-U12). Hver
-- annen endring kaster som før, også begge i samme setning.
CREATE OR ALTER TRIGGER koe.vedlegg_uten_endring ON koe.vedlegg INSTEAD OF UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF UPDATE(vedlegg_id) OR UPDATE(prosjekt_id) OR UPDATE(sak_id) OR UPDATE(filnavn)
     OR UPDATE(stoerrelse) OR UPDATE(innhold_sha256) OR UPDATE(lastet_opp_av)
     OR UPDATE(lastet_opp_side) OR UPDATE(lastet_opp_team) OR UPDATE(lastet_opp)
     OR (UPDATE(innhold) AND UPDATE(bundet_av_event_id))
     OR (UPDATE(bundet_av_event_id) AND EXISTS (
           SELECT 1 FROM inserted i JOIN deleted d ON d.vedlegg_id = i.vedlegg_id
            WHERE d.bundet_av_event_id IS NOT NULL OR i.bundet_av_event_id IS NULL))
     OR (UPDATE(innhold) AND EXISTS (
           SELECT 1 FROM inserted i
            WHERE i.innhold IS NOT NULL OR i.bundet_av_event_id IS NULL
               OR NOT EXISTS (SELECT 1 FROM koe.vedleggskvittering k
                               WHERE k.vedlegg_id = i.vedlegg_id AND k.operasjon = N'dokument')))
    THROW 51001, N'Et vedlegg endres ikke', 1;
  IF UPDATE(bundet_av_event_id)
    UPDATE v SET bundet_av_event_id = i.bundet_av_event_id
      FROM koe.vedlegg v JOIN inserted i ON i.vedlegg_id = v.vedlegg_id;
  ELSE IF UPDATE(innhold)
    UPDATE v SET innhold = NULL
      FROM koe.vedlegg v JOIN inserted i ON i.vedlegg_id = v.vedlegg_id;
END
GO

-- Som i `20261018140000_brevdokument.sql`, og også for et oppdrag uten dokument som har
-- vedlegg, som et registrert brev (LV-U11).
CREATE OR ALTER TRIGGER koe.leveringsoppdrag_levering ON koe.leveringsoppdrag AFTER INSERT AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.jobb (jobbtype, sak_id, prosjekt_id, catenda_project_id, leveringsoppdrag_id, neste_forsoek)
  SELECT N'levering', i.sak_id, i.prosjekt_id,
         TRY_CAST(JSON_VALUE(i.innhold, '$.maal.catenda_project_id') AS uniqueidentifier), i.id,
         DATETRUNC(millisecond, SYSUTCDATETIME())
    FROM inserted i
   WHERE JSON_QUERY(i.innhold, '$.dokument') IS NOT NULL
      OR EXISTS (SELECT 1 FROM OPENJSON(i.innhold, '$.brev.dokument.dokumentasjon'));
END
GO

-- Avslutter forsøket med leasen: forsøket lagres, og jobben er utført, venter på neste
-- forsøk etter 30 s · 2^(n−1) med tak på 1 time, eller er parkert (invariant 7). Kalles
-- bare fra prosedyrene for løkka, i deres transaksjon, etter `koe_api.laas_lease`.
CREATE PROCEDURE koe_api.avslutt_forsoek
  @jobb uniqueidentifier, @lease uniqueidentifier, @startet datetime2(3), @naa datetime2(3),
  @utfall nvarchar(20), @melding nvarchar(400)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  INSERT koe.jobbforsoek (forsoek_id, jobb_id, startet, avsluttet, utfall, melding)
  VALUES (@lease, @jobb, @startet, @naa, @utfall, @melding);
  UPDATE koe.jobb
     SET tilstand = CASE @utfall WHEN N'utfoert' THEN N'utfoert' WHEN N'feilet' THEN N'venter' ELSE N'parkert' END,
         neste_forsoek = IIF(@utfall = N'utfoert', neste_forsoek,
                             DATEADD(second, IIF(antall_forsoek >= 8, 3600, 30 * POWER(2, antall_forsoek - 1)), @naa)),
         lease = NULL, lease_startet = NULL, lease_utloeper = NULL, siste_forsoek = @lease
   WHERE jobb_id = @jobb;
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
  INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id)
  SELECT sak_id, prosjekt_id, LOWER(CONVERT(nvarchar(36), catenda_board_id)), @topic_id
    FROM koe.jobb WHERE jobb_id = @jobb;
  EXEC koe_api.avslutt_forsoek @jobb, @lease, @startet, @naa, N'utfoert', NULL;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.registrer_jobbfeil
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
  EXEC koe_api.avslutt_forsoek @jobb, @lease, @startet, @naa, @utfall, @melding;
  COMMIT;
END
GO

-- Vedleggene brevet binder, i rekkefølgen brevet har dem, med det som er kvittert for
-- hvert. `finnes` er 0 når vedlegget ikke er bundet i saken, og leveringen kan ikke
-- gjøres.
CREATE PROCEDURE koe_api.vedlegg_i_levering
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
  SELECT LOWER(JSON_VALUE(b.value, '$.vedlegg_id')) AS vedlegg_id, JSON_VALUE(b.value, '$.filnavn') AS filnavn,
         CAST(IIF(v.vedlegg_id IS NULL, 0, 1) AS bit) AS finnes,
         kd.catenda_id AS dokument_id, kr.catenda_id AS referanse_id
    FROM koe.jobb j
    JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
   CROSS APPLY OPENJSON(o.innhold, '$.brev.dokument.dokumentasjon') b
    LEFT JOIN koe.vedlegg v
      ON v.vedlegg_id = TRY_CAST(JSON_VALUE(b.value, '$.vedlegg_id') AS uniqueidentifier)
     AND v.sak_id = j.sak_id AND v.prosjekt_id = j.prosjekt_id AND v.bundet_av_event_id IS NOT NULL
    LEFT JOIN koe.vedleggskvittering kd ON kd.vedlegg_id = v.vedlegg_id AND kd.operasjon = N'dokument'
    LEFT JOIN koe.vedleggskvittering kr ON kr.vedlegg_id = v.vedlegg_id AND kr.operasjon = N'dokumentreferanse'
   WHERE j.jobb_id = @jobb
   ORDER BY CAST(b.[key] AS int);
  COMMIT;
END
GO

-- Innholdet i et vedlegg brevet til leasen binder. Ingen rad når innholdet er slettet
-- etter kvitteringen.
CREATE PROCEDURE koe_api.vedleggsinnhold
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
     AND EXISTS (SELECT 1 FROM OPENJSON(o.innhold, '$.brev.dokument.dokumentasjon')
                      WITH (vedlegg_id nvarchar(36) N'$.vedlegg_id') b
                  WHERE TRY_CAST(b.vedlegg_id AS uniqueidentifier) = @vedlegg_id);
  COMMIT;
END
GO

-- Kvitterer én operasjon for et vedlegg brevet til leasen binder. Kvitteringen for
-- dokumentet sletter innholdet i samme transaksjon (LV-U12). En kvittering som alt står
-- med samme ID, er gjort; med en annen ID avvises den. Leasen gjelder fortsatt etterpå.
CREATE PROCEDURE koe_api.kvitter_vedlegg
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
       AND EXISTS (SELECT 1 FROM OPENJSON(o.innhold, '$.brev.dokument.dokumentasjon')
                        WITH (vedlegg_id nvarchar(36) N'$.vedlegg_id') b
                    WHERE TRY_CAST(b.vedlegg_id AS uniqueidentifier) = @vedlegg_id))
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

-- Leveringen er fullført: referansen til brevet, når oppdraget har et dokument, og en
-- kvittert referanse for hvert vedlegg. Uten dokument er `@referanse_id` NULL.
-- Kvitteringen, forsøket og jobben som utført i én transaksjon.
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
  DECLARE @jobb uniqueidentifier, @startet datetime2(3), @innhold nvarchar(max);

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  SELECT @innhold = o.innhold
    FROM koe.jobb j JOIN koe.leveringsoppdrag o ON o.id = j.leveringsoppdrag_id
   WHERE j.jobb_id = @jobb;
  IF IIF(JSON_QUERY(@innhold, '$.dokument') IS NULL, 1, 0) <> IIF(@referanse_id IS NULL, 1, 0)
    THROW 51422, N'Dokumentreferansen mangler, eller oppdraget har ikke noe dokument', 1;
  IF EXISTS (
    SELECT 1 FROM OPENJSON(@innhold, '$.brev.dokument.dokumentasjon') WITH (vedlegg_id nvarchar(36) N'$.vedlegg_id') b
     WHERE NOT EXISTS (SELECT 1 FROM koe.vedleggskvittering k
                        WHERE k.vedlegg_id = TRY_CAST(b.vedlegg_id AS uniqueidentifier)
                          AND k.operasjon = N'dokumentreferanse'))
    THROW 51422, N'Et vedlegg i brevet står ikke på topicen', 1;
  IF @referanse_id IS NOT NULL
    INSERT koe.leveringskvittering (leveringsoppdrag_id, operasjon, prosjekt_id, catenda_id, forsoek_id, kvittert, forutsetning)
    SELECT leveringsoppdrag_id, N'dokumentreferanse', prosjekt_id, @referanse_id, @lease, @naa, N'dokument'
      FROM koe.jobb WHERE jobb_id = @jobb;
  EXEC koe_api.avslutt_forsoek @jobb, @lease, @startet, @naa, N'utfoert', NULL;
  COMMIT;
END
GO

-- PDF-en for oppdraget til leasen: den som er lagret, eller `@pdf` når ingen er det.
-- Uten `@pdf` gis bare den lagrede, eller ingen rad.
CREATE OR ALTER PROCEDURE koe_api.lagre_brevdokument
  @lease uniqueidentifier, @pdf varbinary(max), @pdf_sha256 nvarchar(64)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF IIF(@pdf IS NULL, 1, 0) <> IIF(@pdf_sha256 IS NULL, 1, 0)
    THROW 51422, N'PDF-en eller summen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3), @oppdrag uniqueidentifier;

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  SELECT @oppdrag = leveringsoppdrag_id FROM koe.jobb WHERE jobb_id = @jobb;
  IF @pdf IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM koe.brevdokument WITH (UPDLOCK, HOLDLOCK) WHERE leveringsoppdrag_id = @oppdrag)
    INSERT koe.brevdokument (leveringsoppdrag_id, prosjekt_id, pdf, pdf_sha256, forsoek_id, lagret)
    SELECT leveringsoppdrag_id, prosjekt_id, @pdf, @pdf_sha256, @lease, @naa
      FROM koe.jobb WHERE jobb_id = @jobb;
  SELECT pdf, pdf_sha256 FROM koe.brevdokument WHERE leveringsoppdrag_id = @oppdrag;
  COMMIT;
END
GO

DROP PROCEDURE koe_api.lagret_brevdokument;
GO

GRANT EXECUTE ON koe_api.vedlegg_i_levering TO koe_runtime;
GRANT EXECUTE ON koe_api.vedleggsinnhold TO koe_runtime;
GRANT EXECUTE ON koe_api.kvitter_vedlegg TO koe_runtime;
