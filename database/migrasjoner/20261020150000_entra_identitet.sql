-- Innloggingen med Entra ID (S-1c del 1, #831): hvitelisten over tenanter,
-- formkravet for en Entra-identitet og den smale inngangen
-- `koe_api.entra_identitet`, som `koe_api.catenda_identitet` for Catenda.
--
-- En Entra-identitet har issueren i v2-formen
-- `https://login.microsoftonline.com/{tid}/v2.0` og subjektet `oid`, begge som
-- GUID i små bokstaver. `sub` brukes ikke: den er forskjellig per app, så samme
-- person kunne fått to brukerrader (AGENTS.md). Kjøretiden får fortsatt ikke
-- EXECUTE på `koe.resolve_identity`.

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
-- avvises her, før noe skrives.
CREATE PROCEDURE koe_api.entra_identitet
  @issuer nvarchar(400), @subjekt nvarchar(400), @epost nvarchar(320), @navn nvarchar(400),
  @bruker uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
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
  EXEC koe.resolve_identity N'entra', @issuer, @subjekt, @epost, @navn, @bruker OUTPUT;
END
GO

GRANT EXECUTE ON koe_api.entra_identitet TO koe_runtime;
GO
