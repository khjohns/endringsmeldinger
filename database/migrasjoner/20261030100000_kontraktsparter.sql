-- Navnene på byggherren og totalentreprenøren i prosjektet (#1398). Ett prosjekt er
-- én kontrakt (DL-U14), så navnene står per prosjekt, i en egen tabell som
-- `koe.dagmulktssats`. Driften setter og retter dem med driftsskriptet
-- (`server/registrering.ts`, arbeidsvalget 30.10 i #1398); appen har ingen inngang
-- som endrer dem. Begge navnene settes sammen. Uten rad har prosjektet ingen navn.
-- Et sendt brev fryser navnene det viste (LV-U1, #1173), så en retting her endrer
-- ikke et brev.

CREATE TABLE koe.kontraktsparter (
  prosjekt_id nvarchar(100) NOT NULL CONSTRAINT kontraktsparter_pk PRIMARY KEY
    CONSTRAINT kontraktsparter_prosjekt FOREIGN KEY REFERENCES koe.projects (id)
    CONSTRAINT kontraktsparter_prosjekt_id_tegnklasse
      CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  byggherre_navn nvarchar(400) NOT NULL
    CONSTRAINT kontraktsparter_byggherre_navn CHECK (LEN(byggherre_navn) > 0),
  totalentreprenor_navn nvarchar(400) NOT NULL
    CONSTRAINT kontraktsparter_totalentreprenor_navn CHECK (LEN(totalentreprenor_navn) > 0)
);
GO

-- Setter begge navnene for et registrert prosjekt, eller skriver dem over.
CREATE PROCEDURE koe_drift.sett_kontraktsparter
  @prosjekt nvarchar(4000),
  @byggherre nvarchar(4000),
  @totalentreprenor nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  IF @byggherre IS NULL OR LEN(@byggherre) = 0 OR DATALENGTH(@byggherre) > 800
     OR DATALENGTH(@byggherre) <> DATALENGTH(LTRIM(RTRIM(@byggherre)))
    THROW 52065, N'Byggherrens navn er tomt, for langt eller har mellomrom i endene', 1;
  IF @totalentreprenor IS NULL OR LEN(@totalentreprenor) = 0 OR DATALENGTH(@totalentreprenor) > 800
     OR DATALENGTH(@totalentreprenor) <> DATALENGTH(LTRIM(RTRIM(@totalentreprenor)))
    THROW 52065, N'Totalentreprenørens navn er tomt, for langt eller har mellomrom i endene', 1;

  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.projects WITH (UPDLOCK, HOLDLOCK) WHERE id = @prosjekt)
    THROW 52073, N'Prosjektet er ikke registrert', 1;
  IF EXISTS (SELECT 1 FROM koe.kontraktsparter WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt)
    UPDATE koe.kontraktsparter
       SET byggherre_navn = @byggherre, totalentreprenor_navn = @totalentreprenor
     WHERE prosjekt_id = @prosjekt;
  ELSE
    INSERT koe.kontraktsparter (prosjekt_id, byggherre_navn, totalentreprenor_navn)
    VALUES (@prosjekt, @byggherre, @totalentreprenor);
  COMMIT;
END
GO

-- Navnene som står, for driftsskriptet.
CREATE PROCEDURE koe_drift.kontraktsparter
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT byggherre_navn, totalentreprenor_navn
    FROM koe.kontraktsparter
   WHERE prosjekt_id = @prosjekt;
END
GO

-- Navnene i et prosjekt, for en aktør med aktivt medlemskap i det, som
-- `koe_api.prosjekt`. Tilgangen er avgjort av serveren før kallet; medlemskapet
-- her er et vern til.
CREATE PROCEDURE koe_api.kontraktsparter
  @aktor uniqueidentifier,
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  SELECT k.byggherre_navn, k.totalentreprenor_navn
    FROM koe.kontraktsparter k
    JOIN koe.app_project_memberships m ON m.project_id = k.prosjekt_id
   WHERE k.prosjekt_id = @prosjekt AND m.user_id = @aktor AND m.active = 1;
END
GO

GRANT EXECUTE ON koe_drift.sett_kontraktsparter TO koe_driftsrolle;
GRANT EXECUTE ON koe_drift.kontraktsparter TO koe_driftsrolle;
GRANT EXECUTE ON koe_api.kontraktsparter TO koe_runtime;
