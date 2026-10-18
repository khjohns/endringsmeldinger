-- Mellomlageret for vedlegg (V-1, del av #790). Et vedlegg lastes opp til appen før
-- brevet registreres eller sendes, og ligger her til Catenda har kvittert for det
-- (spørsmål 1 A i #790, 18.10). Bytene står i `innhold` med SHA-256 av dem, som
-- basen regner etter, som i `koe.brevdokument`.
--
-- Et ubundet vedlegg er et utkast: bare teamet som lastet det opp, ser og sletter
-- det, og uten entydig team finnes det ikke (invarianten om utkast). Når en hendelse
-- viser til vedlegget, får det `bundet_av_event_id` (arbeidsvalg 4 i #790) og ses av
-- begge kontraktssider og jobbkjøreren. Bindingen og slettingen av innholdet etter
-- levering kommer i V-2 og V-3; til da endres ingen rad, og et bundet vedlegg slettes
-- ikke.

CREATE TABLE koe.vedlegg (
  vedlegg_id uniqueidentifier NOT NULL CONSTRAINT vedlegg_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT vedlegg_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  sak_id nvarchar(36) NOT NULL,
  filnavn nvarchar(200) NOT NULL
    CONSTRAINT vedlegg_filnavn CHECK (LEN(filnavn) > 0 AND DATALENGTH(filnavn) = DATALENGTH(RTRIM(filnavn))),
  stoerrelse int NOT NULL CONSTRAINT vedlegg_stoerrelse CHECK (stoerrelse BETWEEN 1 AND 15728640),
  innhold_sha256 nvarchar(64) NOT NULL,
  innhold varbinary(max) NULL,
  lastet_opp_av uniqueidentifier NOT NULL CONSTRAINT vedlegg_lastet_opp_av FOREIGN KEY REFERENCES koe.app_users (id),
  lastet_opp_side nvarchar(2) NOT NULL CONSTRAINT vedlegg_lastet_opp_side CHECK (lastet_opp_side IN (N'TE', N'BH')),
  lastet_opp_team nvarchar(32) NOT NULL CONSTRAINT vedlegg_lastet_opp_team_form
    CHECK (DATALENGTH(lastet_opp_team) = 64 AND lastet_opp_team COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  lastet_opp datetime2(3) NOT NULL CONSTRAINT vedlegg_lastet_opp DEFAULT SYSUTCDATETIME(),
  bundet_av_event_id nvarchar(36) NULL,
  CONSTRAINT vedlegg_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id),
  -- Hendelsen som binder, er i samme sak og prosjekt.
  CONSTRAINT vedlegg_bundet_av FOREIGN KEY (bundet_av_event_id, sak_id, prosjekt_id)
    REFERENCES koe.hendelse (event_id, sak_id, prosjekt_id),
  CONSTRAINT vedlegg_sum CHECK (
    innhold IS NULL
    OR (innhold_sha256 = LOWER(CONVERT(nvarchar(64), HASHBYTES('SHA2_256', innhold), 2))
        AND DATALENGTH(innhold) = stoerrelse)),
  CONSTRAINT vedlegg_sum_form CHECK (
    DATALENGTH(innhold_sha256) = 128 AND innhold_sha256 COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  -- Innholdet slettes bare for et bundet vedlegg, etter levering (spørsmål 1 A).
  CONSTRAINT vedlegg_innhold_til_levert CHECK (innhold IS NOT NULL OR bundet_av_event_id IS NOT NULL)
);
CREATE INDEX vedlegg_sak_id ON koe.vedlegg (sak_id);
CREATE INDEX vedlegg_prosjekt_id ON koe.vedlegg (prosjekt_id);
GO

CREATE TRIGGER koe.vedlegg_uten_endring ON koe.vedlegg INSTEAD OF UPDATE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Et vedlegg endres ikke', 1;
END
GO

CREATE TRIGGER koe.vedlegg_bundet ON koe.vedlegg AFTER DELETE AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM deleted WHERE bundet_av_event_id IS NOT NULL)
    THROW 51001, N'Et bundet vedlegg slettes ikke', 1;
END
GO

-- Teamet som lastet opp, ser vedlegget alltid. Et bundet vedlegg ses også av et medlem
-- med kontraktsside i konteksten («Vedlegg er kontraktskorrespondanse»), og av
-- jobbkjøreren, som leverer det.
CREATE FUNCTION koe_sikkerhet.vedlegg_synlig(
  @prosjekt_id nvarchar(100), @lastet_opp_team nvarchar(32), @bundet_av_event_id nvarchar(36))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.notat_synlig(@prosjekt_id, @lastet_opp_team)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.medlem(@prosjekt_id)
 WHERE @bundet_av_event_id IS NOT NULL
   AND TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)) IN (N'TE', N'BH')
UNION ALL
SELECT tilgang FROM koe_sikkerhet.jobbkjoerer(@prosjekt_id) WHERE @bundet_av_event_id IS NOT NULL;
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.vedlegg_synlig(prosjekt_id, lastet_opp_team, bundet_av_event_id) ON koe.vedlegg,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, lastet_opp_av, lastet_opp_side, lastet_opp_team, 1)
    ON koe.vedlegg AFTER INSERT,
  ADD BLOCK PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, lastet_opp_team) ON koe.vedlegg BEFORE DELETE;
GO

-- Lagrer et ubundet vedlegg i saken. Prosjektet, avsenderen, siden og teamet tas fra
-- konteksten, så klienten ikke kan oppgi dem.
CREATE PROCEDURE koe_api.lagre_vedlegg
  @vedlegg_id uniqueidentifier, @sak_id nvarchar(36), @filnavn nvarchar(200),
  @innhold varbinary(max), @innhold_sha256 nvarchar(64)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedlegget lagres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(100) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100));
  DECLARE @team nvarchar(32) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32));
  IF @team IS NULL
    THROW 51403, N'Uten entydig team lagres ikke noe vedlegg', 1;
  IF NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;
  IF @innhold IS NULL
    THROW 51422, N'Innholdet mangler', 1;
  INSERT koe.vedlegg (vedlegg_id, prosjekt_id, sak_id, filnavn, stoerrelse, innhold_sha256, innhold,
                      lastet_opp_av, lastet_opp_side, lastet_opp_team)
  VALUES (@vedlegg_id, @prosjekt, @sak_id, @filnavn, DATALENGTH(@innhold), @innhold_sha256, @innhold,
          TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier),
          TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2)), @team);
END
GO

-- Sletter et ubundet vedlegg i saken som teamet i konteksten har lastet opp. Gir
-- `slettet` 0 når det ikke finnes, eller ikke er synlig for teamet.
CREATE PROCEDURE koe_api.slett_vedlegg @vedlegg_id uniqueidentifier, @sak_id nvarchar(36)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedlegget slettes bare i en transaksjon med konteksten satt', 1;
  IF EXISTS (SELECT 1 FROM koe.vedlegg WHERE vedlegg_id = @vedlegg_id AND sak_id = @sak_id
                                         AND bundet_av_event_id IS NOT NULL)
    THROW 51409, N'Vedlegget er bundet til en hendelse', 1;
  DELETE koe.vedlegg WHERE vedlegg_id = @vedlegg_id AND sak_id = @sak_id AND bundet_av_event_id IS NULL;
  SELECT @@ROWCOUNT AS slettet;
END
GO

GRANT SELECT ON koe.vedlegg TO koe_runtime;
GRANT EXECUTE ON koe_api.lagre_vedlegg TO koe_runtime;
GRANT EXECUTE ON koe_api.slett_vedlegg TO koe_runtime;
