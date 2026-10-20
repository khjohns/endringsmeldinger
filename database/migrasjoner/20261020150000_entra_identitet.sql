-- Innloggingen med Entra ID (S-1c del 1, #831): hvitelisten over tenanter,
-- formkravet for en Entra-identitet og den smale inngangen
-- `koe_api.entra_identitet`, som `koe_api.catenda_identitet` for Catenda.
--
-- En Entra-identitet har issueren i v2-formen
-- `https://login.microsoftonline.com/{tid}/v2.0` og subjektet `oid`, begge som
-- GUID i små bokstaver. `sub` brukes ikke: den er forskjellig per app, så samme
-- person kunne fått to brukerrader (AGENTS.md). Kjøretiden får fortsatt ikke
-- EXECUTE på `koe.resolve_identity`, og innloggingen oppretter aldri en bruker:
-- driften registrerer identiteten (svaret 20.10 i #831).

-- Tenantene driften har godkjent. Driften legger til og fjerner tenanter, så
-- tabellen har ingen trigger mot endring. Kjøretiden har ingen rett på den.
CREATE TABLE koe.entra_tenant (
  tenant_id uniqueidentifier NOT NULL CONSTRAINT entra_tenant_pk PRIMARY KEY,
  created_at datetime2(3) NOT NULL CONSTRAINT entra_tenant_created_at DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME())
);
GO

-- Formen kontrolleres med binær sortering og lengden i tillegg, som for Catenda:
-- `=` og `LIKE` ser ellers bort fra store bokstaver og mellomrom til slutt.
ALTER TABLE koe.app_identities ADD CONSTRAINT app_identities_entra_form CHECK (
  provider <> N'entra'
  OR (DATALENGTH(subject) = 72
      AND subject COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'
      AND DATALENGTH(issuer) = DATALENGTH(N'https://login.microsoftonline.com//v2.0') + 72
      AND issuer COLLATE Latin1_General_100_BIN2_UTF8
          LIKE N'https://login.microsoftonline.com/[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]/v2.0'));
GO

-- Den smale inngangen for Entra: leverandøren er låst, issueren må være v2-formen
-- for en godkjent tenant, og subjektet en `oid` i små bokstaver. En annen form
-- avvises her. Innloggingen oppretter aldri en bruker: en identitet driften ikke
-- har registrert med `koe_drift.registrer_entra_identitet`, avvises uten at noe
-- skrives (oppdragsgiver 20.10, #831). Navn og e-post oppdateres som i
-- `koe.resolve_identity`.
CREATE PROCEDURE koe_api.entra_identitet
  @issuer nvarchar(400), @subjekt nvarchar(400), @epost nvarchar(320), @navn nvarchar(400),
  @bruker uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @subjekt IS NULL OR DATALENGTH(@subjekt) <> 72
     OR @subjekt COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'
    THROW 52022, N'Subjektet er ikke en oid i små bokstaver', 1;
  DECLARE @tenant nvarchar(36) = SUBSTRING(@issuer, 35, 36);
  IF @issuer IS NULL
     OR @tenant COLLATE Latin1_General_100_BIN2_UTF8 NOT LIKE N'[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'
     OR DATALENGTH(@issuer) <> DATALENGTH(N'https://login.microsoftonline.com//v2.0') + 72
     OR @issuer COLLATE Latin1_General_100_BIN2_UTF8 <> N'https://login.microsoftonline.com/' + @tenant + N'/v2.0'
     OR NOT EXISTS (SELECT 1 FROM koe.entra_tenant WHERE tenant_id = TRY_CAST(@tenant AS uniqueidentifier))
    THROW 52024, N'Issueren er ikke v2-formen for en godkjent tenant', 1;
  SET @bruker = (SELECT user_id FROM koe.app_identities
                  WHERE provider = N'entra' AND issuer = @issuer AND subject = @subjekt);
  IF @bruker IS NULL
    THROW 52025, N'Entra-identiteten er ikke registrert av driften', 1;
  UPDATE koe.app_users
     SET email = ISNULL(NULLIF(@epost, N''), email), name = ISNULL(NULLIF(@navn, N''), name)
   WHERE id = @bruker;
END
GO

-- Driften registrerer en Entra-identitet, som ny bruker når `@bruker` er NULL,
-- ellers koblet til den eksisterende brukeren, så samme person har én
-- `aktor_id` (S5 og svaret 20.10 i #831). Tenanten må være godkjent. En
-- identitet som alt er registrert, kan ikke flyttes til en annen bruker; samme
-- registrering igjen gir samme bruker. Tenant og `oid` tas som GUID, så formen i
-- tabellen følger av konverteringen.
CREATE PROCEDURE koe_drift.registrer_entra_identitet
  @tenant uniqueidentifier, @oid uniqueidentifier, @epost nvarchar(320), @navn nvarchar(400),
  @bruker uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @tenant IS NULL OR @oid IS NULL OR NOT EXISTS (SELECT 1 FROM koe.entra_tenant WHERE tenant_id = @tenant)
    THROW 52024, N'Tenanten er ikke godkjent', 1;
  DECLARE @issuer nvarchar(400) =
    N'https://login.microsoftonline.com/' + LOWER(CONVERT(nvarchar(36), @tenant)) + N'/v2.0';
  DECLARE @subjekt nvarchar(400) = LOWER(CONVERT(nvarchar(36), @oid));
  BEGIN TRANSACTION;
  DECLARE @registrert uniqueidentifier =
    (SELECT user_id FROM koe.app_identities WITH (UPDLOCK, HOLDLOCK)
      WHERE provider = N'entra' AND issuer = @issuer AND subject = @subjekt);
  IF @registrert IS NOT NULL
  BEGIN
    IF @bruker IS NOT NULL AND @bruker <> @registrert
      THROW 52026, N'Entra-identiteten er registrert på en annen bruker', 1;
    SET @bruker = @registrert;
    COMMIT;
    RETURN;
  END
  IF @bruker IS NULL
  BEGIN
    SET @bruker = NEWID();
    INSERT koe.app_users (id, email, name) VALUES (@bruker, ISNULL(@epost, N''), ISNULL(@navn, N''));
  END
  ELSE IF NOT EXISTS (SELECT 1 FROM koe.app_users WHERE id = @bruker)
    THROW 52051, N'Brukeren finnes ikke', 1;
  INSERT koe.app_identities (id, user_id, provider, issuer, subject)
  VALUES (NEWID(), @bruker, N'entra', @issuer, @subjekt);
  COMMIT;
END
GO

GRANT EXECUTE ON koe_api.entra_identitet TO koe_runtime;
GRANT EXECUTE ON koe_drift.registrer_entra_identitet TO koe_driftsrolle;
GO
