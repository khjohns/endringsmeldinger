-- Roller og HR-kopien (S-1c del 2, #831).
--
-- GFK-U6 og GFK-U11: driften registrerer beløpsgrensen for hver rolle, globalt
-- for byggherren. S3 (a): driften registrerer også hvilken stillingstittel
-- (`jobTitle` i Graph) som gir hvilken rolle. Hvem som har stillingen, og hvem
-- som er lederen, hentes fra Graph av synkroniseringen i `server/hrdata.ts`.
--
-- Svaret 20.10 i #831 («Registrert fra HR»): synkroniseringen registrerer
-- Entra-identiteten for hver person med en stilling som gir rolle. Innloggingen
-- oppretter fortsatt aldri en bruker.
--
-- Kopien er et øyeblikksbilde per tenant. En person som ikke lenger har en
-- stilling som gir rolle, eller som har en deaktivert konto, beholder raden uten
-- rolle og med nytt tidspunkt, så den som leser kopien, ser at rollen er mistet
-- (GFK-U10). Lederen lagres som `oid`, så lederen ikke må ha en rolle selv.
--
-- Tabellene har ingen prosjekt og ingen radsikkerhet. Kjøretiden har ingen rett
-- på dem og skriver bare gjennom `koe_api.synkroniser_hr`.

-- `NULL` er ubegrenset fullmakt, som i `koe.fullmakt` (GFK-U4).
CREATE TABLE koe.rolle (
  rolle nvarchar(100) NOT NULL CONSTRAINT rolle_pk PRIMARY KEY
    CONSTRAINT rolle_ikke_tom CHECK (DATALENGTH(rolle) > 0),
  grense decimal(15, 2) NULL CONSTRAINT rolle_grense CHECK (grense >= 0),
  CONSTRAINT rolle_form CHECK (NOT rolle COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%')
);
GO

-- Tittelen må stemme tegn for tegn med `jobTitle`. `=` ser bort fra mellomrom til
-- slutt, så nøkkelen og oppslaget er SHA-256 av tittelen.
CREATE TABLE koe.stillingstittel (
  stillingstittel nvarchar(200) NOT NULL
    CONSTRAINT stillingstittel_form CHECK (DATALENGTH(stillingstittel) > 0
      AND DATALENGTH(stillingstittel) = DATALENGTH(TRIM(stillingstittel))),
  noekkel AS CAST(HASHBYTES('SHA2_256', stillingstittel) AS binary(32)) PERSISTED NOT NULL
    CONSTRAINT stillingstittel_pk PRIMARY KEY,
  rolle nvarchar(100) NOT NULL CONSTRAINT stillingstittel_rolle FOREIGN KEY REFERENCES koe.rolle (rolle),
  CONSTRAINT stillingstittel_rolle_form CHECK (NOT rolle COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%')
);
GO

CREATE TABLE koe.hr_kopi (
  bruker_id uniqueidentifier NOT NULL CONSTRAINT hr_kopi_pk PRIMARY KEY
    CONSTRAINT hr_kopi_bruker FOREIGN KEY REFERENCES koe.app_users (id),
  tenant_id uniqueidentifier NOT NULL,
  oid uniqueidentifier NOT NULL,
  rolle nvarchar(100) NULL CONSTRAINT hr_kopi_rolle FOREIGN KEY REFERENCES koe.rolle (rolle),
  leder_oid uniqueidentifier NULL,
  hentet datetime2(3) NOT NULL,
  CONSTRAINT hr_kopi_identitet UNIQUE (tenant_id, oid),
  CONSTRAINT hr_kopi_rolle_form CHECK (NOT rolle COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^a-z_]%'),
  CONSTRAINT hr_kopi_leder_med_rolle CHECK (rolle IS NOT NULL OR leder_oid IS NULL)
);
GO

-- Lagrer øyeblikksbildet fra Graph for en godkjent tenant. `@personer` er en
-- JSON-liste med `oid`, `stillingstittel`, `leder` (`oid` eller null), `aktiv`,
-- `epost` og `navn`. Bare en aktiv person med en registrert stillingstittel får
-- rolle; en ukjent identitet for en slik person registreres som ny bruker, slik
-- `koe_drift.registrer_entra_identitet` gjør. Hver annen rad i tenanten mister
-- rollen og lederen. Alt skjer i én transaksjon, så en lesning ser enten det
-- forrige eller det nye bildet. Samme `oid` to ganger avvises (52068). Har
-- driften koblet to identiteter med rolle til samme bruker, får brukeren ingen
-- rolle: kopien har én rad per bruker, hvilken rolle som gjelder, avgjøres ikke
-- her, og koblingen kan ikke tas tilbake, så resten av tenanten synkroniseres.
CREATE PROCEDURE koe_api.synkroniser_hr
  @tenant uniqueidentifier, @personer nvarchar(max)
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

  UPDATE h SET rolle = NULL, leder_oid = NULL, hentet = @hentet
    FROM koe.hr_kopi h WITH (UPDLOCK, HOLDLOCK)
   WHERE h.tenant_id = @tenant AND NOT EXISTS (SELECT 1 FROM @person p WHERE p.bruker = h.bruker_id);
  UPDATE h SET tenant_id = @tenant, oid = p.oid, rolle = p.rolle, leder_oid = p.leder, hentet = @hentet
    FROM koe.hr_kopi h JOIN @person p ON p.bruker = h.bruker_id;
  INSERT koe.hr_kopi (bruker_id, tenant_id, oid, rolle, leder_oid, hentet)
  SELECT p.bruker, @tenant, p.oid, p.rolle, p.leder, @hentet
    FROM @person p
   WHERE NOT EXISTS (SELECT 1 FROM koe.hr_kopi h WHERE h.bruker_id = p.bruker);
  COMMIT;
END
GO

-- Driften registrerer en rolle eller endrer grensen (GFK-U6, GFK-U11).
CREATE PROCEDURE koe_drift.sett_rolle
  @rolle nvarchar(100), @grense decimal(15, 2)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;
  UPDATE koe.rolle WITH (UPDLOCK, HOLDLOCK) SET grense = @grense
   WHERE rolle = @rolle AND DATALENGTH(rolle) = DATALENGTH(@rolle);
  IF @@ROWCOUNT = 0
    INSERT koe.rolle (rolle, grense) VALUES (@rolle, @grense);
  COMMIT;
END
GO

-- En rolle som en stillingstittel eller HR-kopien viser til, kan ikke fjernes.
CREATE PROCEDURE koe_drift.fjern_rolle
  @rolle nvarchar(100)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF EXISTS (SELECT 1 FROM koe.stillingstittel WHERE rolle = @rolle)
     OR EXISTS (SELECT 1 FROM koe.hr_kopi WHERE rolle = @rolle)
    THROW 52061, N'Rollen er i bruk', 1;
  DELETE koe.rolle WHERE rolle = @rolle AND DATALENGTH(rolle) = DATALENGTH(@rolle);
END
GO

-- Driften knytter en stillingstittel til en rolle (S3 (a)). Endringen når HR-kopien
-- ved neste synkronisering.
CREATE PROCEDURE koe_drift.sett_stillingstittel
  @stillingstittel nvarchar(200), @rolle nvarchar(100)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;
  UPDATE koe.stillingstittel WITH (UPDLOCK, HOLDLOCK) SET rolle = @rolle
   WHERE noekkel = CAST(HASHBYTES('SHA2_256', @stillingstittel) AS binary(32));
  IF @@ROWCOUNT = 0
    INSERT koe.stillingstittel (stillingstittel, rolle) VALUES (@stillingstittel, @rolle);
  COMMIT;
END
GO

CREATE PROCEDURE koe_drift.fjern_stillingstittel
  @stillingstittel nvarchar(200)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE koe.stillingstittel WHERE noekkel = CAST(HASHBYTES('SHA2_256', @stillingstittel) AS binary(32));
END
GO

-- Titlene synkroniseringen spør Graph etter.
CREATE PROCEDURE koe_api.stillingstitler
AS
BEGIN
  SET NOCOUNT ON;
  SELECT stillingstittel FROM koe.stillingstittel;
END
GO

GRANT EXECUTE ON koe_api.synkroniser_hr TO koe_runtime;
GRANT EXECUTE ON koe_api.stillingstitler TO koe_runtime;
GRANT EXECUTE ON koe_drift.sett_rolle TO koe_driftsrolle;
GRANT EXECUTE ON koe_drift.fjern_rolle TO koe_driftsrolle;
GRANT EXECUTE ON koe_drift.sett_stillingstittel TO koe_driftsrolle;
GRANT EXECUTE ON koe_drift.fjern_stillingstittel TO koe_driftsrolle;
GO
