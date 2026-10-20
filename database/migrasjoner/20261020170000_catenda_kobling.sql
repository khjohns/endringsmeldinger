-- Driften kobler en Catenda-identitet til brukeren HR-synkroniseringen laget,
-- før personen skriver noe (oppdragsgiver 20.10, #1002). Uten koblingen gir
-- første innlogging med Catenda eller medlemssynkroniseringen personen en andre
-- brukerrad, og journalen to `aktor_id` for samme person (AGENTS.md).
--
-- Står Catenda-identiteten alt på en annen bruker, flyttes den bare når den
-- andre brukeren ikke er brukt utover medlemskap, fravær og sesjoner.
-- Medlemskapene og fraværet flyttes, sesjonene slettes, og den andre brukeren
-- slettes. En fremmednøkkel fra en hendelse, et notat eller en annen rad hindrer
-- slettingen, så hele koblingen avvises (fail-closed). Det gjelder også en
-- tabell som kommer senere med en nøkkel mot `koe.app_users`.

-- En identitet endres fortsatt ikke. Det eneste unntaket er at
-- `koe_drift.koble_catenda_identitet` sletter én Catenda-identitet, den som står
-- i sesjonskonteksten `koe_flytt_identitet`. Bare eieren har rett på tabellen.
CREATE OR ALTER TRIGGER koe.app_identities_uforanderlig ON koe.app_identities INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (SELECT 1 FROM inserted)
     OR (SELECT COUNT(*) FROM deleted) <> 1
     OR NOT EXISTS (SELECT 1 FROM deleted
                     WHERE provider = N'catenda'
                       AND id = TRY_CAST(SESSION_CONTEXT(N'koe_flytt_identitet') AS uniqueidentifier))
    THROW 51001, N'En identitet endres ikke', 1;
  DELETE koe.app_identities WHERE id = (SELECT id FROM deleted);
END
GO

-- Registrerer Catenda-identiteten (`catenda_id()`-formen) på `@bruker`, som må
-- ha en Entra-identitet og ingen annen Catenda-identitet. Samme kobling igjen
-- gir ingen endring. Står identiteten på en annen bruker, flyttes den etter
-- reglene øverst i fila, ellers avvises koblingen (52029 eller 52030).
CREATE PROCEDURE koe_drift.koble_catenda_identitet
  @subjekt nvarchar(400), @bruker uniqueidentifier
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @subjekt IS NULL OR DATALENGTH(@subjekt) <> 64 OR @subjekt COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
    THROW 52022, N'Subjektet er ikke normalisert', 1;
  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.app_identities WITH (UPDLOCK, HOLDLOCK)
                  WHERE user_id = @bruker AND provider = N'entra')
    THROW 52027, N'Brukeren har ingen Entra-identitet', 1;
  IF EXISTS (SELECT 1 FROM koe.app_identities WITH (UPDLOCK, HOLDLOCK)
              WHERE user_id = @bruker AND provider = N'catenda' AND subject <> @subjekt)
    THROW 52028, N'Brukeren har en annen Catenda-identitet', 1;
  DECLARE @identitet uniqueidentifier, @annen uniqueidentifier;
  SELECT @identitet = id, @annen = user_id
    FROM koe.app_identities WITH (UPDLOCK, HOLDLOCK)
   WHERE provider = N'catenda' AND issuer = N'https://api.catenda.com' AND subject = @subjekt;
  IF @annen = @bruker
  BEGIN
    COMMIT;
    RETURN;
  END
  IF @annen IS NULL
  BEGIN
    INSERT koe.app_identities (id, user_id, provider, issuer, subject)
    VALUES (NEWID(), @bruker, N'catenda', N'https://api.catenda.com', @subjekt);
    COMMIT;
    RETURN;
  END
  IF EXISTS (SELECT 1 FROM koe.app_identities WHERE user_id = @annen AND id <> @identitet)
    THROW 52030, N'Catenda-identiteten står på en bruker med en annen identitet', 1;
  -- `koe.kvittering.aktor_id` har ingen fremmednøkkel.
  IF EXISTS (SELECT 1 FROM koe.kvittering WHERE aktor_id = @annen)
    THROW 52029, N'Catenda-identiteten står på en annen bruker som er brukt utover medlemskap og sesjon', 1;
  UPDATE koe.app_project_memberships SET user_id = @bruker WHERE user_id = @annen;
  UPDATE koe.app_membership_absences SET user_id = @bruker WHERE user_id = @annen;
  DELETE koe.app_sessions WHERE user_id = @annen;
  EXEC sp_set_session_context N'koe_flytt_identitet', @identitet;
  DELETE koe.app_identities WHERE id = @identitet;
  EXEC sp_set_session_context N'koe_flytt_identitet', NULL;
  INSERT koe.app_identities (id, user_id, provider, issuer, subject)
  VALUES (NEWID(), @bruker, N'catenda', N'https://api.catenda.com', @subjekt);
  BEGIN TRY
    DELETE koe.app_users WHERE id = @annen;
  END TRY
  BEGIN CATCH
    IF ERROR_NUMBER() <> 547 THROW;
    ROLLBACK;
    THROW 52029, N'Catenda-identiteten står på en annen bruker som er brukt utover medlemskap og sesjon', 1;
  END CATCH
  COMMIT;
END
GO

GRANT EXECUTE ON koe_drift.koble_catenda_identitet TO koe_driftsrolle;
GO
