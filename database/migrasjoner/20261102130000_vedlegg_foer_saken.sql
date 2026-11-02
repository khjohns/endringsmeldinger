-- Slettingen leser vedlegget med oppdateringslås (#923 punkt 1). Uten låsen leste
-- kontrollen et ubundet vedlegg mens en kommando holdt det for bindingen; `DELETE`
-- ventet så på kommandoen og traff 0 rader etter commit, og serveren svarte «finnes
-- ikke» for et vedlegg som finnes og er bundet. Nå venter kontrollen på kommandoen og
-- ser bindingen.
CREATE OR ALTER PROCEDURE koe_api.slett_vedlegg @vedlegg_id uniqueidentifier, @sak_id nvarchar(36)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedlegget slettes bare i en transaksjon med konteksten satt', 1;
  DECLARE @bundet bit;
  SELECT @bundet = IIF(bundet_av_event_id IS NULL, 0, 1)
    FROM koe.vedlegg WITH (UPDLOCK, HOLDLOCK)
   WHERE vedlegg_id = @vedlegg_id AND sak_id = @sak_id;
  IF @bundet = 1
    THROW 51409, N'Vedlegget er bundet til en hendelse', 1;
  DELETE koe.vedlegg WHERE vedlegg_id = @vedlegg_id AND sak_id = @sak_id AND bundet_av_event_id IS NULL;
  SELECT @@ROWCOUNT AS slettet;
END
GO

-- Vedlegg som lastes opp før saken finnes (#1037, #1487): vedleggene i den første
-- påberopelsen og dokumentet med varselet etter punkt 32.2 som alt er sendt (VS-U38).
-- Raden er et utkast, som et ubundet vedlegg i `koe.vedlegg`: bare teamet som lastet den
-- opp, ser og sletter den, og bare TE laster opp, fordi bare TE oppretter en sak (KT-U10).
-- Når saken opprettes, flytter `koe_api.flytt_vedlegg_til_sak` radene påberopelsen og
-- varselet viser til, inn i `koe.vedlegg` med samme ID, i samme transaksjon, og
-- `koe_api.bind_vedlegg` binder dem der. En rad endres ikke; den slettes eller flyttes.
CREATE TABLE koe.vedlegg_uten_sak (
  vedlegg_id uniqueidentifier NOT NULL CONSTRAINT vedlegg_uten_sak_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL CONSTRAINT vedlegg_uten_sak_prosjekt REFERENCES koe.projects (id)
    CONSTRAINT vedlegg_uten_sak_prosjekt_id_tegnklasse
      CHECK (NOT prosjekt_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%'),
  filnavn nvarchar(200) NOT NULL
    CONSTRAINT vedlegg_uten_sak_filnavn CHECK (DATALENGTH(filnavn) > 0 AND DATALENGTH(filnavn) = DATALENGTH(RTRIM(filnavn))),
  stoerrelse int NOT NULL CONSTRAINT vedlegg_uten_sak_stoerrelse CHECK (stoerrelse BETWEEN 1 AND 15728640),
  innhold_sha256 nvarchar(64) NOT NULL,
  innhold varbinary(max) NOT NULL,
  lastet_opp_av uniqueidentifier NOT NULL CONSTRAINT vedlegg_uten_sak_lastet_opp_av REFERENCES koe.app_users (id),
  lastet_opp_side nvarchar(2) NOT NULL CONSTRAINT vedlegg_uten_sak_lastet_opp_side CHECK (lastet_opp_side = N'TE'),
  lastet_opp_team nvarchar(32) NOT NULL CONSTRAINT vedlegg_uten_sak_lastet_opp_team_form
    CHECK (DATALENGTH(lastet_opp_team) = 64 AND lastet_opp_team COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  lastet_opp datetime2(3) NOT NULL CONSTRAINT vedlegg_uten_sak_lastet_opp DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME()),
  CONSTRAINT vedlegg_uten_sak_sum CHECK (
    innhold_sha256 = LOWER(CONVERT(nvarchar(64), HASHBYTES('SHA2_256', innhold), 2))
    AND DATALENGTH(innhold) = stoerrelse),
  CONSTRAINT vedlegg_uten_sak_sum_form CHECK (
    DATALENGTH(innhold_sha256) = 128 AND innhold_sha256 COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%')
);
CREATE INDEX vedlegg_uten_sak_prosjekt_id ON koe.vedlegg_uten_sak (prosjekt_id);
GO

CREATE TRIGGER koe.vedlegg_uten_sak_uten_endring ON koe.vedlegg_uten_sak INSTEAD OF UPDATE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Et vedlegg endres ikke', 1;
END
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, lastet_opp_team) ON koe.vedlegg_uten_sak,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, lastet_opp_av, lastet_opp_side, lastet_opp_team, 1)
    ON koe.vedlegg_uten_sak AFTER INSERT,
  ADD BLOCK PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, lastet_opp_team) ON koe.vedlegg_uten_sak BEFORE DELETE;
GO

-- Som `koe_api.lagre_vedlegg` i `20261020200000_kontekst_full_lengde.sql`, uten sak og bare for TE.
CREATE PROCEDURE koe_api.lagre_vedlegg_uten_sak
  @vedlegg_id uniqueidentifier, @filnavn nvarchar(200), @innhold varbinary(max), @innhold_sha256 nvarchar(64)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedlegget lagres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  DECLARE @side nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000));
  IF @team IS NULL
    THROW 51403, N'Uten entydig team lagres ikke noe vedlegg', 1;
  IF DATALENGTH(@team) <> 64 OR @team COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
     OR @side IS NULL OR DATALENGTH(@side) <> 4 OR @side NOT IN (N'TE', N'BH')
    THROW 51403, N'Teamet eller siden i konteksten har ikke den lagrede formen', 1;
  IF @side <> N'TE'
    THROW 51403, N'Bare TE laster opp vedlegg til en ny sak', 1;
  IF @innhold IS NULL
    THROW 51422, N'Innholdet mangler', 1;
  INSERT koe.vedlegg_uten_sak (vedlegg_id, prosjekt_id, filnavn, stoerrelse, innhold_sha256, innhold,
                               lastet_opp_av, lastet_opp_side, lastet_opp_team)
  VALUES (@vedlegg_id, @prosjekt, @filnavn, DATALENGTH(@innhold), @innhold_sha256, @innhold,
          TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier), @side, @team);
END
GO

-- Sletter et vedlegg uten sak som teamet i konteksten har lastet opp. Gir `slettet` 0 når
-- det ikke finnes, er flyttet til en sak eller ikke er synlig for teamet.
CREATE PROCEDURE koe_api.slett_vedlegg_uten_sak @vedlegg_id uniqueidentifier
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedlegget slettes bare i en transaksjon med konteksten satt', 1;
  DELETE koe.vedlegg_uten_sak WHERE vedlegg_id = @vedlegg_id;
  SELECT @@ROWCOUNT AS slettet;
END
GO

-- Flytter vedleggene i `@ider` (en JSON-liste med ID-er) inn i den nye saken, ubundne, med
-- samme ID, og sletter dem her. Bare aktørens egne vedlegg i prosjektet flyttes, fordi
-- blokkpredikatet `skriver` på `koe.vedlegg` krever at aktøren i konteksten er den som
-- lastet opp. Mangler ett, flyttes ingen (51422). Kalles i opprettelsen etter
-- `koe_api.opprett_sak` og før `koe_api.skriv_hendelse`.
CREATE PROCEDURE koe_api.flytt_vedlegg_til_sak @sak_id nvarchar(36), @ider nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Vedleggene flyttes bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
  DECLARE @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  DECLARE @team nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000));
  IF @prosjekt IS NULL OR @aktor IS NULL OR @team IS NULL
     OR NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;
  IF @ider IS NULL OR ISJSON(@ider, ARRAY) = 0
    THROW 51422, N'Vedleggene er ikke en JSON-liste', 1;
  DECLARE @valgt TABLE (vedlegg_id uniqueidentifier NULL);
  INSERT @valgt (vedlegg_id) SELECT DISTINCT TRY_CAST(value AS uniqueidentifier) FROM OPENJSON(@ider);
  DECLARE @antall int = (SELECT COUNT(*) FROM @valgt);
  IF EXISTS (SELECT 1 FROM @valgt WHERE vedlegg_id IS NULL)
    THROW 51422, N'Et vedlegg har ikke en UUID som ID', 1;
  INSERT koe.vedlegg (vedlegg_id, prosjekt_id, sak_id, filnavn, stoerrelse, innhold_sha256, innhold,
                      lastet_opp_av, lastet_opp_side, lastet_opp_team, lastet_opp)
  SELECT v.vedlegg_id, v.prosjekt_id, @sak_id, v.filnavn, v.stoerrelse, v.innhold_sha256, v.innhold,
         v.lastet_opp_av, v.lastet_opp_side, v.lastet_opp_team, v.lastet_opp
    FROM koe.vedlegg_uten_sak v WITH (UPDLOCK, HOLDLOCK)
    JOIN @valgt s ON s.vedlegg_id = v.vedlegg_id
   WHERE v.prosjekt_id = @prosjekt AND v.lastet_opp_av = @aktor AND v.lastet_opp_team = @team;
  IF @@ROWCOUNT <> @antall
    THROW 51422, N'Et vedlegg finnes ikke blant vedleggene aktøren har lastet opp til en ny sak', 1;
  DELETE v FROM koe.vedlegg_uten_sak v JOIN @valgt s ON s.vedlegg_id = v.vedlegg_id;
END
GO

GRANT SELECT ON koe.vedlegg_uten_sak TO koe_runtime;
GRANT EXECUTE ON koe_api.lagre_vedlegg_uten_sak TO koe_runtime;
GRANT EXECUTE ON koe_api.slett_vedlegg_uten_sak TO koe_runtime;
GRANT EXECUTE ON koe_api.flytt_vedlegg_til_sak TO koe_runtime;
GO
