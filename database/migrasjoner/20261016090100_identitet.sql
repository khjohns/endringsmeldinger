-- Identitet, prosjekter, medlemskap og kontraktsteam (#53, del 1), og
-- `koe.resolve_identity`, som svarer til `koe_resolve_identity` i PostgreSQL
-- (SQ-20 og SQ-21 i `docs/prove-azuresql-2026-10-11.md`).
--
-- Tidspunktene er `datetime2(3)` i UTC, satt av serveren med SYSUTCDATETIME()
-- (DL-U3). Prosjektet har ingen standardverdi noe sted (AGENTS.md).
-- Kontrollene av ID-formene bruker en binær sortering uttrykkelig, så de holder
-- også om en kolonne skulle få en annen sortering.

CREATE TABLE koe.app_users (
  id uniqueidentifier NOT NULL CONSTRAINT app_users_pk PRIMARY KEY,
  email nvarchar(320) NOT NULL,
  name nvarchar(400) NOT NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT app_users_created_at DEFAULT SYSUTCDATETIME()
);

-- Én rad per person (AGENTS.md): en Catenda-identitet har issueren
-- `https://api.catenda.com` (`CatendaOAuth.BASE`) og subjektet i
-- `catenda_id()`-formen, 32 små heksadesimale tegn. En annen form ville gitt
-- samme person en andre brukerrad. `=` ser bort fra mellomrom til slutt, så
-- lengden kontrolleres i tillegg.
CREATE TABLE koe.app_identities (
  id uniqueidentifier NOT NULL CONSTRAINT app_identities_pk PRIMARY KEY,
  user_id uniqueidentifier NOT NULL CONSTRAINT app_identities_user FOREIGN KEY REFERENCES koe.app_users (id),
  provider nvarchar(16) NOT NULL CONSTRAINT app_identities_provider CHECK (provider IN (N'catenda', N'entra')),
  issuer nvarchar(400) NOT NULL CONSTRAINT app_identities_issuer CHECK (LEN(issuer) > 0),
  subject nvarchar(400) NOT NULL CONSTRAINT app_identities_subject CHECK (LEN(subject) > 0),
  CONSTRAINT app_identities_catenda_form CHECK (
    provider <> N'catenda'
    OR (issuer = N'https://api.catenda.com' COLLATE Latin1_General_100_BIN2_UTF8
        AND DATALENGTH(issuer) = DATALENGTH(N'https://api.catenda.com')
        AND DATALENGTH(subject) = 64
        AND subject COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%')),
  CONSTRAINT app_identities_unik UNIQUE (provider, issuer, subject)
);
CREATE INDEX app_identities_user_id ON koe.app_identities (user_id);

CREATE TABLE koe.projects (
  id nvarchar(100) NOT NULL CONSTRAINT projects_pk PRIMARY KEY CONSTRAINT projects_id CHECK (LEN(id) > 0),
  name nvarchar(400) NOT NULL,
  description nvarchar(max) NULL,
  organisasjon_id nvarchar(100) NOT NULL CONSTRAINT projects_organisasjon_id CHECK (LEN(organisasjon_id) > 0),
  is_active bit NOT NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT projects_created_at DEFAULT SYSUTCDATETIME()
);

-- Medlemskapet fra Catenda. Leserollen er `viewer_override`, ikke en egen rolle,
-- som i PostgreSQL. `catenda_subject` er subjektet i `catenda_id()`-formen.
CREATE TABLE koe.app_project_memberships (
  project_id nvarchar(100) NOT NULL CONSTRAINT memberships_project FOREIGN KEY REFERENCES koe.projects (id),
  user_id uniqueidentifier NOT NULL CONSTRAINT memberships_user FOREIGN KEY REFERENCES koe.app_users (id),
  catenda_subject nvarchar(32) NOT NULL CONSTRAINT memberships_catenda_subject_form
    CHECK (DATALENGTH(catenda_subject) = 64 AND catenda_subject COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  user_email nvarchar(320) NOT NULL,
  display_name nvarchar(400) NOT NULL,
  role nvarchar(10) NOT NULL CONSTRAINT memberships_role CHECK (role IN (N'admin', N'member')),
  viewer_override bit NOT NULL,
  active bit NOT NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT memberships_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT memberships_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT memberships_pk PRIMARY KEY (project_id, user_id),
  CONSTRAINT memberships_project_subject UNIQUE (project_id, catenda_subject)
);
CREATE INDEX memberships_user_id_aktiv ON koe.app_project_memberships (user_id) WHERE active = 1;

-- Teamet i `catenda_id()`-formen, som `aktor_team_id` i journalen.
CREATE TABLE koe.catenda_contract_teams (
  internal_project_id nvarchar(100) NOT NULL CONSTRAINT contract_teams_project FOREIGN KEY REFERENCES koe.projects (id),
  team_id nvarchar(32) NOT NULL CONSTRAINT contract_teams_form
    CHECK (DATALENGTH(team_id) = 64 AND team_id COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  contract_role nvarchar(2) NOT NULL CONSTRAINT contract_teams_role CHECK (contract_role IN (N'TE', N'BH')),
  created_at datetime2(3) NOT NULL CONSTRAINT contract_teams_created_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT contract_teams_pk PRIMARY KEY (internal_project_id, team_id)
);
GO

-- Den generelle identitetsprosedyren. Kjøretiden har ikke EXECUTE på den; den
-- smale inngangen under når den gjennom eierskapskjeden. UPDLOCK og HOLDLOCK
-- låser nøkkelområdet, så samtidige kall med samme identitet gir én bruker, som
-- `pg_advisory_xact_lock` i PostgreSQL (SQ-20). En tom e-post eller et tomt
-- navn skriver ikke over det som står.
CREATE PROCEDURE koe.resolve_identity
  @provider nvarchar(16), @issuer nvarchar(400), @subject nvarchar(400), @email nvarchar(320), @name nvarchar(400),
  @user_id uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;
  SET @user_id = (SELECT user_id FROM koe.app_identities WITH (UPDLOCK, HOLDLOCK)
                   WHERE provider = @provider AND issuer = @issuer AND subject = @subject);
  IF @user_id IS NULL
  BEGIN
    SET @user_id = NEWID();
    INSERT koe.app_users (id, email, name) VALUES (@user_id, ISNULL(@email, N''), ISNULL(@name, N''));
    INSERT koe.app_identities (id, user_id, provider, issuer, subject)
    VALUES (NEWID(), @user_id, @provider, @issuer, @subject);
  END
  ELSE
    UPDATE koe.app_users
       SET email = ISNULL(NULLIF(@email, N''), email), name = ISNULL(NULLIF(@name, N''), name)
     WHERE id = @user_id;
  COMMIT;
END
GO

-- Den smale inngangen for Catenda (RB2-05, SQ-21): provider og issuer er låst,
-- og subjektet må ha `catenda_id()`-formen. Normaliseringen gjøres av kalleren;
-- en annen form avvises her, før noe skrives.
CREATE PROCEDURE koe_api.catenda_identitet
  @subjekt nvarchar(400), @epost nvarchar(320), @navn nvarchar(400), @bruker uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  IF @subjekt IS NULL OR DATALENGTH(@subjekt) <> 64 OR @subjekt COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
    THROW 52022, N'Subjektet er ikke normalisert', 1;
  EXEC koe.resolve_identity N'catenda', N'https://api.catenda.com', @subjekt, @epost, @navn, @bruker OUTPUT;
END
GO

GRANT EXECUTE ON koe_api.catenda_identitet TO koe_runtime;
GO
