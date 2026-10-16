-- Hashkolonnene i `koe.app_sessions` og `koe.app_oauth_attempts` er `varchar(64)`,
-- mens prosedyrene tar `nvarchar(4000)`. Sammenlikner `WHERE` kolonnen med
-- parameteren, konverterer basen kolonnen og leser hele tabellen (#691). Etter
-- `koe.er_hash` er verdien 64 heksadesimale tegn, så den kopieres uten tap til en
-- lokal `varchar(64)`, og oppslaget søker i primærnøkkelen.
--
-- Bare sammenlikningen er endret. Prosedyrene har samme navn, argumenter, feil og
-- rettigheter som i `20261016190000_sesjon.sql`.

-- Brukeren og CSRF-tokenet for en sesjon som ikke er utløpt, ellers ingen rad.
CREATE OR ALTER PROCEDURE koe_api.les_sesjon
  @token_hash nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF koe.er_hash(@token_hash) = 0
    THROW 52050, N'Sesjonstokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  DECLARE @token varchar(64) = @token_hash;
  SELECT u.id AS bruker, u.email, u.name, s.csrf_token, s.expires_at AS utloeper
  FROM koe.app_sessions s
  JOIN koe.app_users u ON u.id = s.user_id
  WHERE s.token_hash = @token AND s.expires_at > SYSUTCDATETIME();
END
GO

CREATE OR ALTER PROCEDURE koe_api.slett_sesjon
  @token_hash nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF koe.er_hash(@token_hash) = 0
    THROW 52050, N'Sesjonstokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  DECLARE @token varchar(64) = @token_hash;
  DELETE koe.app_sessions WHERE token_hash = @token;
END
GO

-- Bruker forsøket med staten, når nettleseren er den som startet det og
-- forsøket ikke er utløpt: raden slettes og returstien returneres i samme
-- setning, så to samtidige kall ikke begge får den. Ellers ingen rad, og et
-- forsøk med feil nettleser står, som `consume_attempt` i Python.
CREATE OR ALTER PROCEDURE koe_api.bruk_innloggingsforsoek
  @state_hash nvarchar(4000), @nettleser_hash nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF koe.er_hash(@state_hash) = 0 OR koe.er_hash(@nettleser_hash) = 0
    THROW 52050, N'Staten eller nettlesertokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  DECLARE @state varchar(64) = @state_hash, @nettleser varchar(64) = @nettleser_hash;
  DELETE koe.app_oauth_attempts
  OUTPUT deleted.return_path AS retursti
  WHERE state_hash = @state AND browser_hash = @nettleser
    AND expires_at > SYSUTCDATETIME();
END
GO
