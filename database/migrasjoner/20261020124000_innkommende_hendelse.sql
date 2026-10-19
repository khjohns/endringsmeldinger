-- Innboksen for webhooken fra Catenda (W-1a, #819). Hendelsen lagres før svaret 200,
-- så Catenda prøver igjen når lagringen feiler (INT-02). Samme `event.id` fra samme
-- kilde lagres én gang. Behandlingen kommer i W-1b og skriver ikke i denne tabellen,
-- så raden er uforanderlig. Kroppen er den rå teksten Catenda sendte; prosjektet og
-- saken er ikke avgjort når den lagres, så tabellen har ingen `prosjekt_id`.
-- Kjøretiden har ingen rett på tabellen og skriver med `koe_api.motta_hendelse`.
CREATE TABLE koe.innkommende_hendelse (
  id bigint IDENTITY(1, 1) NOT NULL CONSTRAINT innkommende_hendelse_pk PRIMARY KEY,
  kilde nvarchar(20) NOT NULL CONSTRAINT innkommende_hendelse_kilde CHECK (kilde = N'catenda'),
  hendelse_id nvarchar(100) NOT NULL CONSTRAINT innkommende_hendelse_hendelse_id_ikke_tom CHECK (DATALENGTH(hendelse_id) > 0),
  hendelsestype nvarchar(100) NOT NULL CONSTRAINT innkommende_hendelse_hendelsestype_ikke_tom CHECK (DATALENGTH(hendelsestype) > 0),
  kropp nvarchar(max) NOT NULL CONSTRAINT innkommende_hendelse_kropp_json CHECK (ISJSON(kropp) = 1),
  -- Trimmet til millisekunder, så verdien er den samme som blir lagret (#778 punkt 11, DL-U3).
  mottatt datetime2(3) NOT NULL
    CONSTRAINT innkommende_hendelse_mottatt DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME()),
  -- Tegnklassen for ID-ene (#609), som tabellkontroller fordi en kolonne har høyst én kolonnekontroll.
  CONSTRAINT innkommende_hendelse_kilde_tegnklasse
    CHECK (NOT kilde COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  CONSTRAINT innkommende_hendelse_hendelse_id_tegnklasse
    CHECK (NOT hendelse_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  CONSTRAINT innkommende_hendelse_hendelsestype_tegnklasse
    CHECK (NOT hendelsestype COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%')
);
GO

CREATE UNIQUE INDEX innkommende_hendelse_unik ON koe.innkommende_hendelse (kilde, hendelse_id);
GO

CREATE TRIGGER koe.innkommende_hendelse_uforanderlig ON koe.innkommende_hendelse INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'En mottatt hendelse endres ikke', 1;
END
GO

ALTER TABLE koe.toemmingsvern ADD innkommende_hendelse_id bigint NULL
  CONSTRAINT toemmingsvern_innkommende_hendelse REFERENCES koe.innkommende_hendelse (id);
GO

-- Lagrer hendelsen, eller ingenting når samme kilde har sendt samme ID før. `@ny` er 1
-- for en ny rad. Låsen på nøkkelområdet gjør at to samtidige leveringer av samme ID
-- gir én rad og ingen brudd på den unike indeksen.
CREATE PROCEDURE koe_api.motta_hendelse
  @kilde nvarchar(4000),
  @hendelse_id nvarchar(4000),
  @hendelsestype nvarchar(4000),
  @kropp nvarchar(max),
  @ny bit OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.innkommende_hendelse (kilde, hendelse_id, hendelsestype, kropp)
  SELECT @kilde, @hendelse_id, @hendelsestype, @kropp
   WHERE NOT EXISTS (
     SELECT 1 FROM koe.innkommende_hendelse WITH (UPDLOCK, HOLDLOCK)
      WHERE kilde = @kilde AND hendelse_id = @hendelse_id);
  SET @ny = CASE WHEN @@ROWCOUNT = 1 THEN 1 ELSE 0 END;
END
GO

GRANT EXECUTE ON koe_api.motta_hendelse TO koe_runtime;
