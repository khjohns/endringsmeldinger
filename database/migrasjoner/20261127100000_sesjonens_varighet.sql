-- Sesjonens levetid, tidsavbruddet ved inaktivitet og tilbakekallingen (#1806).
--
-- Levetiden og tidsavbruddet er konfigurasjon i serveren (`sesjonsvarighet` i
-- `server/sesjon.ts`) og kommer inn som parametre i sekunder; basen har ingen
-- egen verdi. `expires_at` er fortsatt tidspunktet sesjonen slutter å gjelde:
-- det tidligste av `created_at` pluss levetiden og siste bruk pluss
-- tidsavbruddet. `les_sesjon` flytter det fram ved bruk, men skriver bare når det
-- flytter seg mer enn ett minutt, så ikke hver forespørsel blir en skriving.
--
-- Tilbakekallingen er triggere, så hver vei som gjør et medlemskap inaktivt eller
-- tar rollen fra HR-kopien, sletter sesjonene: synkroniseringen, innloggingen og
-- driftens prosedyrer.

CREATE OR ALTER PROCEDURE koe.kontroller_sesjonsvarighet
  @levetid int, @inaktivitet int
AS
BEGIN
  IF @levetid IS NULL OR @inaktivitet IS NULL OR @inaktivitet < 60 OR @levetid < @inaktivitet
    THROW 52084, N'Levetiden og tidsavbruddet for sesjonen må være oppgitt, og tidsavbruddet minst 60 sekunder og høyst levetiden', 1;
END
GO

CREATE OR ALTER PROCEDURE koe_api.opprett_sesjon
  @token_hash nvarchar(4000), @bruker uniqueidentifier, @csrf_token nvarchar(4000),
  @levetid int, @inaktivitet int,
  @utloeper datetime2(3) OUTPUT,
  @innlogging varchar(40) = NULL,
  @gammel_hash nvarchar(64) = NULL,
  @korrelasjon uniqueidentifier = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF koe.er_hash(@token_hash) = 0
    THROW 52050, N'Sesjonstokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  IF @csrf_token IS NULL OR DATALENGTH(@csrf_token) < 64 OR DATALENGTH(@csrf_token) > 256
    OR @csrf_token COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^-A-Za-z0-9_]%'
    THROW 52053, N'CSRF-tokenet har ikke formen fra token_urlsafe', 1;
  EXEC koe.kontroller_sesjonsvarighet @levetid, @inaktivitet;
  IF @bruker IS NULL OR NOT EXISTS (SELECT 1 FROM koe.app_users WHERE id = @bruker)
    THROW 52051, N'Brukeren finnes ikke', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  SET @utloeper = DATEADD(second, @inaktivitet, @naa);
  IF @innlogging IS NOT NULL AND (@korrelasjon IS NULL OR
      @innlogging COLLATE Latin1_General_100_BIN2_UTF8 NOT IN ('innlogging_catenda', 'innlogging_entra'))
    THROW 52069, N'Ugyldig hendelse eller manglende korrelasjon for tilgangsloggen', 1;

  BEGIN TRANSACTION;
  IF @gammel_hash IS NOT NULL
    EXEC koe_api.slett_sesjon @gammel_hash;
  INSERT koe.app_sessions (token_hash, user_id, csrf_token, expires_at, created_at)
  VALUES (@token_hash, @bruker, @csrf_token, @utloeper, @naa);
  IF @innlogging IS NOT NULL
    EXEC koe.skriv_tilgangslogg @innlogging, @korrelasjon, @bruker;
  COMMIT;
END
GO

-- Brukeren og CSRF-tokenet for en sesjon som gjelder, ellers ingen rad. `utloeper`
-- er det nye tidspunktet etter bruken. En sesjon utover levetiden avvises også når
-- `expires_at` er satt med en lengre levetid enn den som gjelder nå.
CREATE OR ALTER PROCEDURE koe_api.les_sesjon
  @token_hash nvarchar(4000), @levetid int, @inaktivitet int
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF koe.er_hash(@token_hash) = 0
    THROW 52050, N'Sesjonstokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  EXEC koe.kontroller_sesjonsvarighet @levetid, @inaktivitet;
  DECLARE @token varchar(64) = @token_hash;
  -- `datetime2(7)` i sammenlikningen, som i `rydd_utloepte`.
  DECLARE @klokke datetime2(7) = SYSUTCDATETIME();
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, @klokke);

  UPDATE s
     SET expires_at = v.ny
    FROM koe.app_sessions s
   CROSS APPLY (SELECT LEAST(DATEADD(second, @levetid, s.created_at), DATEADD(second, @inaktivitet, @naa)) AS ny) v
   WHERE s.token_hash = @token AND s.expires_at > @klokke
     AND DATEADD(second, @levetid, s.created_at) > @klokke
     AND (v.ny > DATEADD(second, 60, s.expires_at) OR v.ny < s.expires_at);

  SELECT u.id AS bruker, u.email, u.name, s.csrf_token, s.expires_at AS utloeper
    FROM koe.app_sessions s
    JOIN koe.app_users u ON u.id = s.user_id
   WHERE s.token_hash = @token AND s.expires_at > @klokke
     AND DATEADD(second, @levetid, s.created_at) > @klokke;
END
GO

-- Sesjonene til en bruker som har mistet det siste aktive medlemskapet. En bruker
-- som aldri har hatt et, som godkjenneren uten medlemskap (GFK-U9), berøres ikke.
CREATE TRIGGER koe.app_project_memberships_tilbakekall ON koe.app_project_memberships
AFTER UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  DELETE s FROM koe.app_sessions s
   WHERE s.user_id IN (SELECT user_id FROM deleted WHERE active = 1)
     AND NOT EXISTS (SELECT 1 FROM koe.app_project_memberships m
                      WHERE m.user_id = s.user_id AND m.active = 1);
END
GO

-- Sesjonene til en bruker som mister rollen i HR-kopien. `koe_api.synkroniser_hr`
-- tar rollen fra en person som er deaktivert i Entra, er borte fra bildet fra Graph
-- eller ikke lenger har en stillingstittel som gir rolle.
CREATE TRIGGER koe.hr_kopi_tilbakekall ON koe.hr_kopi
AFTER UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  DELETE s FROM koe.app_sessions s
   WHERE s.user_id IN (
     SELECT d.bruker_id FROM deleted d
       LEFT JOIN inserted i ON i.bruker_id = d.bruker_id
      WHERE d.rolle IS NOT NULL AND i.rolle IS NULL);
END
GO
