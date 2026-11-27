-- Sesjonens levetid, tidsavbruddet ved inaktivitet og tilbakekallingen (#1806).
--
-- Levetiden og tidsavbruddet er konfigurasjon i serveren (`sesjonsvarighet` i
-- `server/sesjon.ts`) og kommer inn som parametre i sekunder; basen har ingen
-- egen verdi, men avviser en levetid over et døgn, så kjøretiden ikke kan lage en
-- sesjon som varer lenger enn konfigurasjonen tillater. `expires_at` er fortsatt tidspunktet sesjonen slutter å gjelde:
-- det tidligste av `created_at` pluss levetiden og siste bruk pluss
-- tidsavbruddet. `les_sesjon` flytter det fram ved bruk, men skriver bare når det
-- flytter seg mer enn ett minutt, eller en tidel av tidsavbruddet når det er kortere,
-- så ikke hver forespørsel blir en skriving og sesjonen aldri løper ut ved jevn bruk.
--
-- Tilbakekallingen ved tap av medlemskap er en trigger, så hver vei som gjør et
-- medlemskap inaktivt, sletter sesjonene: synkroniseringen, innloggingen og driftens
-- prosedyrer. HR-synkroniseringen sletter sesjonene til en person som mister rollen eller er
-- deaktivert.

CREATE OR ALTER PROCEDURE koe.kontroller_sesjonsvarighet
  @levetid int, @inaktivitet int
AS
BEGIN
  IF @levetid IS NULL OR @inaktivitet IS NULL OR @inaktivitet < 60 OR @levetid < @inaktivitet
      OR @levetid > 86400
    THROW 52084, N'Levetiden og tidsavbruddet for sesjonen må være oppgitt, tidsavbruddet minst 60 sekunder og høyst levetiden, og levetiden høyst et døgn', 1;
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
-- er det nye tidspunktet etter bruken, og `sekunder_igjen` tiden dit etter basens klokke. En sesjon utover levetiden avvises også når
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
     AND (v.ny > DATEADD(second, LEAST(60, @inaktivitet / 10), s.expires_at) OR v.ny < s.expires_at);

  SELECT u.id AS bruker, u.email, u.name, s.csrf_token, s.expires_at AS utloeper,
         DATEDIFF_BIG(second, @klokke, s.expires_at) AS sekunder_igjen
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

-- Sesjonene til en person som mister rollen i HR-kopien (deaktivert i Entra, borte fra
-- bildet fra Graph eller uten en stillingstittel som gir rolle), og til en person bildet
-- sier er deaktivert (`aktiv` er ikke `true`), også når brukeren har medlemskap. Ellers
-- som i `20261119210000_tilgangslogg.sql`.
CREATE OR ALTER PROCEDURE koe_api.synkroniser_hr
  @tenant uniqueidentifier, @personer nvarchar(max),
  @korrelasjon uniqueidentifier = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @tenant IS NULL OR NOT EXISTS (SELECT 1 FROM koe.entra_tenant WHERE tenant_id = @tenant)
    THROW 52024, N'Tenanten er ikke godkjent', 1;
  IF @personer IS NULL OR ISJSON(@personer, ARRAY) = 0
    THROW 52060, N'Personene fra Graph er ikke en JSON-liste', 1;
  IF EXISTS (SELECT 1 FROM OPENJSON(@personer) WITH (oid uniqueidentifier '$.oid')
              WHERE oid IS NOT NULL GROUP BY oid HAVING COUNT(*) > 1)
    THROW 52068, N'Samme oid står to ganger i bildet fra Graph', 1;
  DECLARE @issuer nvarchar(400) =
    N'https://login.microsoftonline.com/' + LOWER(CONVERT(nvarchar(36), @tenant)) + N'/v2.0';
  DECLARE @hentet datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  DECLARE @person TABLE (
    oid uniqueidentifier NOT NULL PRIMARY KEY,
    rolle nvarchar(100) NOT NULL,
    leder uniqueidentifier NULL,
    epost nvarchar(320) NULL,
    navn nvarchar(400) NULL,
    bruker uniqueidentifier NULL,
    ny bit NOT NULL DEFAULT 0
  );
  INSERT @person (oid, rolle, leder, epost, navn)
  SELECT p.oid, s.rolle, p.leder, p.epost, p.navn
    FROM OPENJSON(@personer) WITH (
           oid uniqueidentifier '$.oid',
           stillingstittel nvarchar(400) '$.stillingstittel',
           leder uniqueidentifier '$.leder',
           aktiv bit '$.aktiv',
           epost nvarchar(320) '$.epost',
           navn nvarchar(400) '$.navn') p
    JOIN koe.stillingstittel s ON s.noekkel = CAST(HASHBYTES('SHA2_256', p.stillingstittel) AS binary(32))
   WHERE p.oid IS NOT NULL AND p.aktiv = 1;

  BEGIN TRANSACTION;
  UPDATE p SET bruker = i.user_id
    FROM @person p
    JOIN koe.app_identities i WITH (UPDLOCK, HOLDLOCK)
      ON i.provider = N'entra' AND i.issuer = @issuer AND i.subject = LOWER(CONVERT(nvarchar(36), p.oid));
  DELETE @person WHERE bruker IN
    (SELECT bruker FROM @person WHERE bruker IS NOT NULL GROUP BY bruker HAVING COUNT(*) > 1);
  UPDATE @person SET bruker = NEWID(), ny = 1 WHERE bruker IS NULL;
  INSERT koe.app_users (id, email, name)
  SELECT bruker, ISNULL(epost, N''), ISNULL(navn, N'') FROM @person WHERE ny = 1;
  INSERT koe.app_identities (id, user_id, provider, issuer, subject)
  SELECT NEWID(), bruker, N'entra', @issuer, LOWER(CONVERT(nvarchar(36), oid)) FROM @person WHERE ny = 1;

  DECLARE @mistet TABLE (bruker uniqueidentifier NOT NULL PRIMARY KEY, rolle nvarchar(100) NULL);
  UPDATE h SET rolle = NULL, leder_oid = NULL, hentet = @hentet
  OUTPUT deleted.bruker_id, deleted.rolle INTO @mistet (bruker, rolle)
    FROM koe.hr_kopi h WITH (UPDLOCK, HOLDLOCK)
   WHERE h.tenant_id = @tenant AND NOT EXISTS (SELECT 1 FROM @person p WHERE p.bruker = h.bruker_id);
  UPDATE h SET tenant_id = @tenant, oid = p.oid, rolle = p.rolle, leder_oid = p.leder, hentet = @hentet
    FROM koe.hr_kopi h JOIN @person p ON p.bruker = h.bruker_id;
  INSERT koe.hr_kopi (bruker_id, tenant_id, oid, rolle, leder_oid, hentet)
  SELECT p.bruker, @tenant, p.oid, p.rolle, p.leder, @hentet
    FROM @person p
   WHERE NOT EXISTS (SELECT 1 FROM koe.hr_kopi h WHERE h.bruker_id = p.bruker);
  DELETE s FROM koe.app_sessions s
   WHERE s.user_id IN (SELECT bruker FROM @mistet WHERE rolle IS NOT NULL)
      OR s.user_id IN (
        SELECT i.user_id FROM koe.app_identities i
          JOIN OPENJSON(@personer) WITH (oid uniqueidentifier '$.oid', aktiv bit '$.aktiv') p
            ON i.subject = LOWER(CONVERT(nvarchar(36), p.oid))
         WHERE i.provider = N'entra' AND i.issuer = @issuer AND (p.aktiv IS NULL OR p.aktiv = 0));
  EXEC koe.skriv_tilgangslogg 'hr_synk', @korrelasjon;
  COMMIT;
END
GO
