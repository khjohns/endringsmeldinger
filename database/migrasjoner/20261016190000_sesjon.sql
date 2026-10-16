-- Sesjonen og innloggingsforsøket (B-19, #656). Svarer til `app_sessions` og
-- `app_oauth_attempts` i PostgreSQL og atferden i `backend/routes/auth_routes.py`:
-- basen lagrer bare SHA-256 av sesjonstokenet, staten og nettlesertokenet, som
-- 64 små heksadesimale tegn. En sesjon varer 8 timer og et innloggingsforsøk
-- 600 sekunder fra opprettelsen, regnet med basens klokke (DL-U3). Et forsøk
-- brukes én gang.
--
-- Tabellene har ingen saksdata og ingen `prosjekt_id`. Kjøretiden har ingen
-- rettighet på dem og når dem bare gjennom prosedyrene i `koe_api`.

CREATE TABLE koe.app_sessions (
  token_hash varchar(64) NOT NULL CONSTRAINT app_sessions_pk PRIMARY KEY
    CONSTRAINT app_sessions_token_hash_form CHECK (DATALENGTH(token_hash) = 64 AND token_hash COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  user_id uniqueidentifier NOT NULL CONSTRAINT app_sessions_user FOREIGN KEY REFERENCES koe.app_users (id),
  csrf_token varchar(128) NOT NULL CONSTRAINT app_sessions_csrf_token CHECK (LEN(csrf_token) >= 32),
  expires_at datetime2(3) NOT NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT app_sessions_created_at DEFAULT SYSUTCDATETIME()
);
CREATE INDEX app_sessions_user_id ON koe.app_sessions (user_id);
CREATE INDEX app_sessions_expires_at ON koe.app_sessions (expires_at);

CREATE TABLE koe.app_oauth_attempts (
  state_hash varchar(64) NOT NULL CONSTRAINT app_oauth_attempts_pk PRIMARY KEY
    CONSTRAINT app_oauth_attempts_state_hash_form CHECK (DATALENGTH(state_hash) = 64 AND state_hash COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  browser_hash varchar(64) NOT NULL
    CONSTRAINT app_oauth_attempts_browser_hash_form CHECK (DATALENGTH(browser_hash) = 64 AND browser_hash COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%'),
  return_path nvarchar(2048) NOT NULL,
  expires_at datetime2(3) NOT NULL
);
CREATE INDEX app_oauth_attempts_expires_at ON koe.app_oauth_attempts (expires_at);
GO

-- 1 når `@hash` er 64 små heksadesimale tegn. `DATALENGTH` fordi `=` og `LEN`
-- ser bort fra mellomrom til slutt.
CREATE FUNCTION koe.er_hash (@hash nvarchar(4000))
RETURNS bit
AS
BEGIN
  RETURN CASE
    WHEN @hash IS NOT NULL AND DATALENGTH(@hash) = 128
      AND @hash COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'%[^0-9a-f]%' THEN 1
    ELSE 0
  END;
END
GO

CREATE PROCEDURE koe_api.opprett_sesjon
  @token_hash nvarchar(4000), @bruker uniqueidentifier, @csrf_token nvarchar(4000),
  @utloeper datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF koe.er_hash(@token_hash) = 0
    THROW 52050, N'Sesjonstokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  IF @csrf_token IS NULL OR DATALENGTH(@csrf_token) < 64 OR DATALENGTH(@csrf_token) > 256
    OR @csrf_token COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^-A-Za-z0-9_]%'
    THROW 52053, N'CSRF-tokenet har ikke formen fra token_urlsafe', 1;
  IF @bruker IS NULL OR NOT EXISTS (SELECT 1 FROM koe.app_users WHERE id = @bruker)
    THROW 52051, N'Brukeren finnes ikke', 1;
  SET @utloeper = DATEADD(hour, 8, SYSUTCDATETIME());
  INSERT koe.app_sessions (token_hash, user_id, csrf_token, expires_at)
  VALUES (@token_hash, @bruker, @csrf_token, @utloeper);
END
GO

-- Brukeren og CSRF-tokenet for en sesjon som ikke er utløpt, ellers ingen rad.
CREATE PROCEDURE koe_api.les_sesjon
  @token_hash nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF koe.er_hash(@token_hash) = 0
    THROW 52050, N'Sesjonstokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  SELECT u.id AS bruker, u.email, u.name, s.csrf_token, s.expires_at AS utloeper
  FROM koe.app_sessions s
  JOIN koe.app_users u ON u.id = s.user_id
  WHERE s.token_hash = @token_hash AND s.expires_at > SYSUTCDATETIME();
END
GO

CREATE PROCEDURE koe_api.slett_sesjon
  @token_hash nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF koe.er_hash(@token_hash) = 0
    THROW 52050, N'Sesjonstokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  DELETE koe.app_sessions WHERE token_hash = @token_hash;
END
GO

-- Returstien er alt kontrollert av innloggingsinngangen (`safe_return_path` i
-- Python). Basen avviser i tillegg det som åpenbart ikke er en lokal sti.
CREATE PROCEDURE koe_api.opprett_innloggingsforsoek
  @state_hash nvarchar(4000), @nettleser_hash nvarchar(4000), @retursti nvarchar(4000),
  @utloeper datetime2(3) OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF koe.er_hash(@state_hash) = 0 OR koe.er_hash(@nettleser_hash) = 0
    THROW 52050, N'Staten eller nettlesertokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  IF @retursti IS NULL OR LEN(@retursti) > 2048
    OR @retursti COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'/%'
    OR @retursti COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'//%'
    OR CHARINDEX(N'\', @retursti) > 0
    OR @retursti COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[' + NCHAR(0) + N'-' + NCHAR(31) + NCHAR(127) + N']%'
    THROW 52052, N'Returstien er ikke en lokal sti', 1;
  SET @utloeper = DATEADD(second, 600, SYSUTCDATETIME());
  INSERT koe.app_oauth_attempts (state_hash, browser_hash, return_path, expires_at)
  VALUES (@state_hash, @nettleser_hash, @retursti, @utloeper);
END
GO

-- Bruker forsøket med staten, når nettleseren er den som startet det og
-- forsøket ikke er utløpt: raden slettes og returstien returneres i samme
-- setning, så to samtidige kall ikke begge får den. Ellers ingen rad, og et
-- forsøk med feil nettleser står, som `consume_attempt` i Python.
CREATE PROCEDURE koe_api.bruk_innloggingsforsoek
  @state_hash nvarchar(4000), @nettleser_hash nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF koe.er_hash(@state_hash) = 0 OR koe.er_hash(@nettleser_hash) = 0
    THROW 52050, N'Staten eller nettlesertokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  DELETE koe.app_oauth_attempts
  OUTPUT deleted.return_path AS retursti
  WHERE state_hash = @state_hash AND browser_hash = @nettleser_hash
    AND expires_at > SYSUTCDATETIME();
END
GO

CREATE PROCEDURE koe_api.rydd_utloepte
  @sesjoner int OUTPUT, @forsoek int OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @naa datetime2(3) = SYSUTCDATETIME();
  BEGIN TRANSACTION;
  DELETE koe.app_sessions WHERE expires_at <= @naa;
  SET @sesjoner = @@ROWCOUNT;
  DELETE koe.app_oauth_attempts WHERE expires_at <= @naa;
  SET @forsoek = @@ROWCOUNT;
  COMMIT;
END
GO

GRANT EXECUTE ON koe_api.opprett_sesjon TO koe_runtime;
GRANT EXECUTE ON koe_api.les_sesjon TO koe_runtime;
GRANT EXECUTE ON koe_api.slett_sesjon TO koe_runtime;
GRANT EXECUTE ON koe_api.opprett_innloggingsforsoek TO koe_runtime;
GRANT EXECUTE ON koe_api.bruk_innloggingsforsoek TO koe_runtime;
GRANT EXECUTE ON koe_api.rydd_utloepte TO koe_runtime;
GO
