-- PDF-en av brevet (L-1c1, #371 del 2). Den lagres én gang per oppdrag, før første
-- opplasting (merknaden 12.10 i #371): bytene i `varbinary(max)` og SHA-256 av dem,
-- som basen regner etter. Har oppdraget alt en PDF, lagres ingen ny, og kjøreren får
-- den lagrede tilbake og laster opp den. Kjøreren har kontrollert PDF-en mot den
-- frosne brevteksten før den lagres (LV-U2, `brevdokument` i `server/levering.ts`).
--
-- Et registrert brev blir ikke et eget dokument i Catenda (LV-U11). Oppdraget sier det
-- med `dokument: null` (oppdragsformat 4), og triggeren leser bare det. Regelen om
-- tekst fra appen står da ett sted, i `lagOppdrag` (#783 punkt 6).

CREATE TABLE koe.brevdokument (
  leveringsoppdrag_id uniqueidentifier NOT NULL CONSTRAINT brevdokument_pk PRIMARY KEY
    CONSTRAINT brevdokument_oppdrag FOREIGN KEY REFERENCES koe.leveringsoppdrag (id),
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT brevdokument_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  pdf varbinary(max) NOT NULL CONSTRAINT brevdokument_pdf_ikke_tom CHECK (DATALENGTH(pdf) > 0),
  pdf_sha256 nvarchar(64) NOT NULL,
  forsoek_id uniqueidentifier NOT NULL,
  lagret datetime2(3) NOT NULL CONSTRAINT brevdokument_lagret DEFAULT SYSUTCDATETIME(),
  CONSTRAINT brevdokument_sum CHECK (pdf_sha256 = LOWER(CONVERT(nvarchar(64), HASHBYTES('SHA2_256', pdf), 2)))
);
GO

CREATE TRIGGER koe.brevdokument_uforanderlig ON koe.brevdokument INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Et brevdokument endres ikke', 1;
END
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.brevdokument,
  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer(prosjekt_id) ON koe.brevdokument AFTER INSERT;
GO

-- Som i `20261018120000_levering.sql`, men jobben følger av `$.dokument` i oppdraget.
CREATE OR ALTER TRIGGER koe.leveringsoppdrag_levering ON koe.leveringsoppdrag AFTER INSERT AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.jobb (jobbtype, sak_id, prosjekt_id, catenda_project_id, leveringsoppdrag_id, neste_forsoek)
  SELECT N'levering', i.sak_id, i.prosjekt_id,
         TRY_CAST(JSON_VALUE(i.innhold, '$.maal.catenda_project_id') AS uniqueidentifier), i.id,
         DATETRUNC(millisecond, SYSUTCDATETIME())
    FROM inserted i
   WHERE JSON_QUERY(i.innhold, '$.dokument') IS NOT NULL;
END
GO

-- PDF-en for oppdraget til leasen: den som er lagret, eller `@pdf` når ingen er det.
-- Leasen gjelder fortsatt etterpå, og forsøket fortsetter med opplastingen.
CREATE PROCEDURE koe_api.lagre_brevdokument
  @lease uniqueidentifier, @pdf varbinary(max), @pdf_sha256 nvarchar(64)
WITH EXECUTE AS N'koe_jobbkjoerer'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @pdf IS NULL OR @pdf_sha256 IS NULL
    THROW 51422, N'PDF-en eller summen mangler', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @jobb uniqueidentifier, @startet datetime2(3), @oppdrag uniqueidentifier;

  BEGIN TRANSACTION;
  EXEC koe_api.laas_lease @lease, N'levering', @naa, @jobb OUTPUT, @startet OUTPUT;
  SELECT @oppdrag = leveringsoppdrag_id FROM koe.jobb WHERE jobb_id = @jobb;
  IF NOT EXISTS (SELECT 1 FROM koe.brevdokument WITH (UPDLOCK, HOLDLOCK) WHERE leveringsoppdrag_id = @oppdrag)
    INSERT koe.brevdokument (leveringsoppdrag_id, prosjekt_id, pdf, pdf_sha256, forsoek_id, lagret)
    SELECT leveringsoppdrag_id, prosjekt_id, @pdf, @pdf_sha256, @lease, @naa
      FROM koe.jobb WHERE jobb_id = @jobb;
  SELECT pdf, pdf_sha256 FROM koe.brevdokument WHERE leveringsoppdrag_id = @oppdrag;
  COMMIT;
END
GO

GRANT EXECUTE ON koe_api.lagre_brevdokument TO koe_runtime;
