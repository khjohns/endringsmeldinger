-- Fullmaktene og godkjenningspakkene for byggherrens svar (S-1a, del av #818).
--
-- Fullmaktene settes opp av driften etter skriftlig bestilling fra byggherren, og
-- appen viser ikke hvem som har endret dem (runde 7 i #764). Kjøretiden leser dem og
-- skriver dem ikke; driften skriver som eier. Plassen er rekkefølgen i
-- godkjenningskjeden, og en fullmakt uten grense er ubegrenset. Mangler
-- dagmulktssatsen, finnes ingen rad i `koe.dagmulktssats` (B-06).
--
-- En godkjenningspakke er et utkast til et svar: bare teamet som laget den, ser den,
-- og uten entydig team finnes den ikke (invarianten om utkast). Pakken og stegene
-- endres ikke. Hver godkjenning, retur og trekking er en ny rad i
-- `koe.godkjenningshandling`, og en godkjenning fryser fullmakten godkjenneren hadde
-- da den ble gitt, så den står om fullmakten endres senere (B-04 punkt 2).

CREATE TABLE koe.fullmakt (
  prosjekt_id nvarchar(100) NOT NULL CONSTRAINT fullmakt_prosjekt FOREIGN KEY REFERENCES koe.projects (id)
    CONSTRAINT fullmakt_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  bruker_id uniqueidentifier NOT NULL CONSTRAINT fullmakt_bruker FOREIGN KEY REFERENCES koe.app_users (id),
  tittel nvarchar(200) NOT NULL CONSTRAINT fullmakt_tittel CHECK (LEN(tittel) > 0),
  grense decimal(15, 2) NULL CONSTRAINT fullmakt_grense CHECK (grense >= 0),
  plass smallint NOT NULL CONSTRAINT fullmakt_plass CHECK (plass >= 1),
  CONSTRAINT fullmakt_pk PRIMARY KEY (prosjekt_id, bruker_id),
  CONSTRAINT fullmakt_plass_unik UNIQUE (prosjekt_id, plass)
);
GO

CREATE TABLE koe.dagmulktssats (
  prosjekt_id nvarchar(100) NOT NULL CONSTRAINT dagmulktssats_pk PRIMARY KEY
    CONSTRAINT dagmulktssats_prosjekt FOREIGN KEY REFERENCES koe.projects (id)
    CONSTRAINT dagmulktssats_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  sats decimal(15, 2) NOT NULL CONSTRAINT dagmulktssats_sats CHECK (sats > 0)
);
GO

CREATE TABLE koe.godkjenningspakke (
  pakke_id uniqueidentifier NOT NULL CONSTRAINT godkjenningspakke_pk PRIMARY KEY,
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT godkjenningspakke_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  sak_id nvarchar(36) NOT NULL
    CONSTRAINT godkjenningspakke_sak_id_uten_mellomrom CHECK (DATALENGTH(sak_id) = DATALENGTH(RTRIM(sak_id))),
  -- Pakken som ble returnert eller trukket, og som denne erstatter.
  forrige_pakke_id uniqueidentifier NULL
    CONSTRAINT godkjenningspakke_forrige FOREIGN KEY REFERENCES koe.godkjenningspakke (pakke_id),
  aktor_id uniqueidentifier NOT NULL CONSTRAINT godkjenningspakke_aktor FOREIGN KEY REFERENCES koe.app_users (id),
  aktor_rolle nvarchar(2) NOT NULL CONSTRAINT godkjenningspakke_rolle CHECK (aktor_rolle IN (N'BH')),
  aktor_team_id nvarchar(32) NOT NULL CONSTRAINT godkjenningspakke_team_form
    CHECK (DATALENGTH(aktor_team_id) = 64 AND aktor_team_id COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  brev nvarchar(max) NOT NULL CONSTRAINT godkjenningspakke_brev CHECK (ISJSON(brev) = 1),
  fullmaktsgrunnlag nvarchar(max) NOT NULL CONSTRAINT godkjenningspakke_fullmaktsgrunnlag
    CHECK (ISJSON(fullmaktsgrunnlag) = 1),
  opprettet datetime2(3) NOT NULL CONSTRAINT godkjenningspakke_opprettet DEFAULT SYSUTCDATETIME(),
  CONSTRAINT godkjenningspakke_sak FOREIGN KEY (sak_id, prosjekt_id) REFERENCES koe.sak_metadata (sak_id, prosjekt_id),
  CONSTRAINT godkjenningspakke_omfang UNIQUE (pakke_id, prosjekt_id, aktor_team_id)
);
CREATE INDEX godkjenningspakke_sak_id ON koe.godkjenningspakke (sak_id);
GO

CREATE TABLE koe.godkjenningssteg (
  pakke_id uniqueidentifier NOT NULL,
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT godkjenningssteg_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  aktor_team_id nvarchar(32) NOT NULL CONSTRAINT godkjenningssteg_team_form
    CHECK (DATALENGTH(aktor_team_id) = 64 AND aktor_team_id COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  steg tinyint NOT NULL CONSTRAINT godkjenningssteg_steg CHECK (steg >= 1),
  godkjenner_id uniqueidentifier NOT NULL
    CONSTRAINT godkjenningssteg_godkjenner FOREIGN KEY REFERENCES koe.app_users (id),
  CONSTRAINT godkjenningssteg_pk PRIMARY KEY (pakke_id, steg),
  CONSTRAINT godkjenningssteg_godkjenner_unik UNIQUE (pakke_id, godkjenner_id),
  CONSTRAINT godkjenningssteg_pakke FOREIGN KEY (pakke_id, prosjekt_id, aktor_team_id)
    REFERENCES koe.godkjenningspakke (pakke_id, prosjekt_id, aktor_team_id)
);
GO

CREATE TABLE koe.godkjenningshandling (
  pakke_id uniqueidentifier NOT NULL,
  loepenr int NOT NULL CONSTRAINT godkjenningshandling_loepenr CHECK (loepenr >= 1),
  prosjekt_id nvarchar(100) NOT NULL
    CONSTRAINT godkjenningshandling_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  handling nvarchar(20) NOT NULL
    CONSTRAINT godkjenningshandling_handling CHECK (handling IN (N'godkjent', N'returnert', N'trukket')
      AND DATALENGTH(handling) = DATALENGTH(RTRIM(handling))),
  steg tinyint NULL,
  aktor_id uniqueidentifier NOT NULL CONSTRAINT godkjenningshandling_aktor FOREIGN KEY REFERENCES koe.app_users (id),
  aktor_rolle nvarchar(2) NOT NULL CONSTRAINT godkjenningshandling_rolle CHECK (aktor_rolle IN (N'BH')),
  aktor_team_id nvarchar(32) NOT NULL CONSTRAINT godkjenningshandling_team_form
    CHECK (DATALENGTH(aktor_team_id) = 64 AND aktor_team_id COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  -- Fullmakten godkjenneren hadde da godkjenningen ble gitt (B-04 punkt 2).
  fullmakt_tittel nvarchar(200) NULL,
  fullmakt_grense decimal(15, 2) NULL,
  fullmakt_ubegrenset bit NULL,
  begrunnelse nvarchar(4000) NULL,
  tidspunkt datetime2(3) NOT NULL CONSTRAINT godkjenningshandling_tidspunkt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT godkjenningshandling_pk PRIMARY KEY (pakke_id, loepenr),
  CONSTRAINT godkjenningshandling_pakke FOREIGN KEY (pakke_id, prosjekt_id, aktor_team_id)
    REFERENCES koe.godkjenningspakke (pakke_id, prosjekt_id, aktor_team_id),
  CONSTRAINT godkjenningshandling_steg FOREIGN KEY (pakke_id, steg) REFERENCES koe.godkjenningssteg (pakke_id, steg),
  CONSTRAINT godkjenningshandling_fryst CHECK (
    (handling = N'godkjent' AND steg IS NOT NULL AND fullmakt_tittel IS NOT NULL AND fullmakt_ubegrenset IS NOT NULL
      AND (fullmakt_ubegrenset = 1 AND fullmakt_grense IS NULL OR fullmakt_ubegrenset = 0 AND fullmakt_grense IS NOT NULL))
    OR (handling <> N'godkjent' AND fullmakt_tittel IS NULL AND fullmakt_grense IS NULL AND fullmakt_ubegrenset IS NULL))
);
-- Hvert steg godkjennes én gang, og pakken returneres eller trekkes én gang.
CREATE UNIQUE INDEX godkjenningshandling_godkjent ON koe.godkjenningshandling (pakke_id, steg)
  WHERE handling = N'godkjent';
CREATE UNIQUE INDEX godkjenningshandling_avsluttet ON koe.godkjenningshandling (pakke_id)
  WHERE handling <> N'godkjent';
GO

CREATE TRIGGER koe.godkjenningspakke_uforanderlig ON koe.godkjenningspakke INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'En godkjenningspakke endres ikke', 1;
END
GO

CREATE TRIGGER koe.godkjenningssteg_uforanderlig ON koe.godkjenningssteg INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Et godkjenningssteg endres ikke', 1;
END
GO

CREATE TRIGGER koe.godkjenningshandling_uforanderlig ON koe.godkjenningshandling INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'En godkjenningshandling endres ikke', 1;
END
GO

-- Fullmaktene og dagmulktssatsen er byggherrens interne oppsett. Kjøretiden har ingen
-- rett på tabellene og leser dem her, bare som medlem med byggherresiden i konteksten.
-- Tabellene har ikke radsikkerhet, fordi filteret også gjelder eieren, og driften skal
-- kunne endre dem uten kontekst.
CREATE PROCEDURE koe_api.fullmakter
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Fullmaktene leses bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(100) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100));
  DECLARE @byggherre bit = IIF(
    TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2)) = N'BH'
    AND EXISTS (SELECT 1 FROM koe_sikkerhet.medlem(@prosjekt)), 1, 0);
  SELECT LOWER(CONVERT(nvarchar(36), bruker_id)) AS bruker_id, tittel, grense, plass
    FROM koe.fullmakt WHERE prosjekt_id = @prosjekt AND @byggherre = 1 ORDER BY plass;
  SELECT sats FROM koe.dagmulktssats WHERE prosjekt_id = @prosjekt AND @byggherre = 1;
END
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, aktor_team_id) ON koe.godkjenningspakke,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1)
    ON koe.godkjenningspakke AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, aktor_team_id) ON koe.godkjenningssteg,
  ADD BLOCK PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, aktor_team_id) ON koe.godkjenningssteg AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, aktor_team_id) ON koe.godkjenningshandling,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1)
    ON koe.godkjenningshandling AFTER INSERT;
GO

-- Lager en pakke med godkjennerne i rekkefølge (en JSON-liste med bruker-ID-er).
-- Prosjektet, saksbehandleren, siden og teamet tas fra konteksten. Hver godkjenner
-- må ha en fullmakt i prosjektet nå. Kjeden regnes av `server/fullmakt.ts`.
CREATE PROCEDURE koe_api.lag_godkjenningspakke
  @pakke_id uniqueidentifier, @sak_id nvarchar(36), @forrige_pakke_id uniqueidentifier,
  @brev nvarchar(max), @fullmaktsgrunnlag nvarchar(max), @godkjennere nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Pakken lagres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(100) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100));
  DECLARE @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  DECLARE @team nvarchar(32) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32));
  IF @team IS NULL
    THROW 51403, N'Uten entydig team lagres ingen godkjenningspakke', 1;
  IF TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2)) IS DISTINCT FROM N'BH'
    THROW 51403, N'Bare byggherren lager en godkjenningspakke', 1;
  IF NOT EXISTS (SELECT 1 FROM koe.sak_metadata WHERE sak_id = @sak_id AND prosjekt_id = @prosjekt)
    THROW 51403, N'Ukjent sak', 1;
  IF @forrige_pakke_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM koe.godkjenningspakke p
         JOIN koe.godkjenningshandling h ON h.pakke_id = p.pakke_id AND h.handling <> N'godkjent'
        WHERE p.pakke_id = @forrige_pakke_id AND p.sak_id = @sak_id)
    THROW 51409, N'Den forrige pakken er ikke returnert eller trukket i saken', 1;
  IF ISJSON(@godkjennere) = 0
    THROW 51422, N'Godkjennerne er ikke en JSON-liste', 1;

  DECLARE @steg TABLE (steg int NOT NULL PRIMARY KEY, godkjenner_id uniqueidentifier NULL);
  INSERT @steg (steg, godkjenner_id)
  SELECT CAST([key] AS int) + 1, TRY_CAST([value] AS uniqueidentifier) FROM OPENJSON(@godkjennere);
  IF NOT EXISTS (SELECT 1 FROM @steg)
    THROW 51422, N'En pakke uten godkjennere trengs ikke', 1;
  IF EXISTS (SELECT 1 FROM @steg WHERE godkjenner_id IS NULL OR godkjenner_id = @aktor)
    THROW 51422, N'En godkjenner mangler eller er saksbehandleren selv', 1;
  IF EXISTS (SELECT 1 FROM @steg s WHERE NOT EXISTS (
       SELECT 1 FROM koe.fullmakt f WHERE f.prosjekt_id = @prosjekt AND f.bruker_id = s.godkjenner_id))
    THROW 51422, N'En godkjenner har ingen fullmakt i prosjektet', 1;

  INSERT koe.godkjenningspakke (pakke_id, prosjekt_id, sak_id, forrige_pakke_id, aktor_id, aktor_rolle,
                                aktor_team_id, brev, fullmaktsgrunnlag)
  VALUES (@pakke_id, @prosjekt, @sak_id, @forrige_pakke_id, @aktor, N'BH', @team, @brev, @fullmaktsgrunnlag);
  INSERT koe.godkjenningssteg (pakke_id, prosjekt_id, aktor_team_id, steg, godkjenner_id)
  SELECT @pakke_id, @prosjekt, @team, steg, godkjenner_id FROM @steg;
END
GO

-- Registrerer en godkjenning, en retur eller en trekking. Godkjenningen og returen
-- gis av godkjenneren i det neste steget som ikke er godkjent, trekkingen av
-- saksbehandleren. En godkjenning krever en fullmakt nå (B-04 punkt 1), og fryser den.
CREATE PROCEDURE koe_api.registrer_godkjenningshandling
  @pakke_id uniqueidentifier, @handling nvarchar(20), @begrunnelse nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Handlingen lagres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(100) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100));
  DECLARE @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  DECLARE @team nvarchar(32) = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32));
  IF @team IS NULL OR TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2)) IS DISTINCT FROM N'BH'
    THROW 51403, N'Ukjent pakke', 1;

  DECLARE @saksbehandler uniqueidentifier;
  SELECT @saksbehandler = aktor_id FROM koe.godkjenningspakke WITH (UPDLOCK, HOLDLOCK)
   WHERE pakke_id = @pakke_id AND prosjekt_id = @prosjekt;
  IF @saksbehandler IS NULL
    THROW 51403, N'Ukjent pakke', 1;
  IF EXISTS (SELECT 1 FROM koe.godkjenningshandling WHERE pakke_id = @pakke_id AND handling <> N'godkjent')
    THROW 51409, N'Pakken er returnert eller trukket', 1;

  DECLARE @steg tinyint, @godkjenner uniqueidentifier;
  SELECT TOP (1) @steg = s.steg, @godkjenner = s.godkjenner_id
    FROM koe.godkjenningssteg s
   WHERE s.pakke_id = @pakke_id
     AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                      WHERE h.pakke_id = s.pakke_id AND h.steg = s.steg AND h.handling = N'godkjent')
   ORDER BY s.steg;
  IF @steg IS NULL
    THROW 51409, N'Pakken er godkjent i alle steg', 1;

  DECLARE @tittel nvarchar(200), @grense decimal(15, 2), @ubegrenset bit;
  IF @handling = N'trukket'
  BEGIN
    IF @aktor IS DISTINCT FROM @saksbehandler
      THROW 51403, N'Bare saksbehandleren trekker pakken', 1;
    SET @steg = NULL;
  END
  ELSE IF @handling IN (N'godkjent', N'returnert')
  BEGIN
    IF @aktor IS DISTINCT FROM @godkjenner
      THROW 51403, N'Pakken venter ikke på deg', 1;
    IF @handling = N'godkjent'
    BEGIN
      SELECT @tittel = tittel, @grense = grense, @ubegrenset = IIF(grense IS NULL, 1, 0)
        FROM koe.fullmakt WHERE prosjekt_id = @prosjekt AND bruker_id = @aktor;
      IF @tittel IS NULL
        THROW 51403, N'Du har ikke lenger fullmakt i prosjektet', 1;
    END
  END
  ELSE
    THROW 51422, N'Ukjent handling', 1;

  INSERT koe.godkjenningshandling (pakke_id, loepenr, prosjekt_id, handling, steg, aktor_id, aktor_rolle,
                                   aktor_team_id, fullmakt_tittel, fullmakt_grense, fullmakt_ubegrenset, begrunnelse)
  SELECT @pakke_id, ISNULL(MAX(loepenr), 0) + 1, @prosjekt, @handling, @steg, @aktor, N'BH', @team,
         @tittel, @grense, @ubegrenset, @begrunnelse
    FROM koe.godkjenningshandling WHERE pakke_id = @pakke_id;
END
GO

GRANT SELECT ON koe.godkjenningspakke TO koe_runtime;
GRANT SELECT ON koe.godkjenningssteg TO koe_runtime;
GRANT SELECT ON koe.godkjenningshandling TO koe_runtime;
GRANT EXECUTE ON koe_api.fullmakter TO koe_runtime;
GRANT EXECUTE ON koe_api.lag_godkjenningspakke TO koe_runtime;
GRANT EXECUTE ON koe_api.registrer_godkjenningshandling TO koe_runtime;
