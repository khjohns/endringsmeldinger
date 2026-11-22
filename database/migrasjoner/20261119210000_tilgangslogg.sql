-- OBS-01, OBS-02. B-05: tilgangsloggen har ingen sletterutine.
CREATE TABLE koe.tilgangslogg (
  id bigint IDENTITY NOT NULL CONSTRAINT tilgangslogg_pk PRIMARY KEY,
  tidspunkt datetime2(3) NOT NULL CONSTRAINT tilgangslogg_tid DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME()),
  korrelasjons_id uniqueidentifier NULL,
  aktor_id uniqueidentifier NULL,
  prosjekt_id nvarchar(100) COLLATE Latin1_General_100_BIN2_UTF8 NULL,
  driftsidentitet sysname NULL,
  beroert_bruker_id uniqueidentifier NULL,
  forsoekt_subjekt uniqueidentifier NULL,
  forsoekt_tenant uniqueidentifier NULL,
  hendelse varchar(40) COLLATE Latin1_General_100_BIN2_UTF8 NOT NULL,
  utfall varchar(16) COLLATE Latin1_General_100_BIN2_UTF8 NOT NULL,
  grunn varchar(40) COLLATE Latin1_General_100_BIN2_UTF8 NULL,
  CONSTRAINT tilgangslogg_hendelse CHECK (hendelse IN (
    'innlogging_catenda', 'innlogging_entra', 'utlogging', 'autorisasjon',
    'leserolle_satt', 'leserolle_fjernet', 'rolle_satt', 'rolle_fjernet',
    'kontraktsteam', 'prosjektkobling', 'medlemssynk', 'medlem_deaktivert', 'medlem_fravaer', 'hr_synk',
    'stillingstittel_satt', 'stillingstittel_fjernet', 'catenda_identitet_koblet', 'entra_identitet_koblet')),
  CONSTRAINT tilgangslogg_forsoekt_identitet CHECK (
    (forsoekt_subjekt IS NULL AND forsoekt_tenant IS NULL) OR (
      forsoekt_subjekt IS NOT NULL AND aktor_id IS NULL AND utfall = 'avvist' AND (
        (hendelse = 'innlogging_catenda' AND forsoekt_tenant IS NULL)
        OR (hendelse = 'innlogging_entra' AND forsoekt_tenant IS NOT NULL)))),
  CONSTRAINT tilgangslogg_utfall CHECK (
    (utfall = 'gjennomfoert' AND grunn IS NULL AND hendelse <> 'autorisasjon')
    OR (utfall = 'avvist' AND grunn IS NOT NULL AND (
      (hendelse IN ('innlogging_catenda', 'innlogging_entra') AND grunn IN (
        'utilgjengelig', 'ugyldig_forsoek', 'leverandoer_avviste', 'kode_mangler',
        'identitet_eller_medlemskap', 'sesjon_feilet'))
      OR (hendelse = 'autorisasjon' AND grunn IN ('csrf', 'kontraktsrolle', 'tilgang_nektet')))))
);
CREATE INDEX tilgangslogg_korrelasjon ON koe.tilgangslogg (korrelasjons_id)
  WHERE korrelasjons_id IS NOT NULL;
GO

CREATE TRIGGER koe.tilgangslogg_uforanderlig ON koe.tilgangslogg
INSTEAD OF UPDATE, DELETE AS
  THROW 51001, N'Tilgangsloggen kan ikke endres eller slettes', 1;
GO

ALTER TABLE koe.toemmingsvern ADD tilgangslogg_id bigint NULL;
GO
ALTER TABLE koe.toemmingsvern ADD CONSTRAINT toemmingsvern_tilgangslogg
  FOREIGN KEY (tilgangslogg_id) REFERENCES koe.tilgangslogg(id);
GO

CREATE PROCEDURE koe.skriv_tilgangslogg
  @hendelse varchar(40),
  @korrelasjon uniqueidentifier = NULL,
  @aktor uniqueidentifier = NULL,
  @prosjekt nvarchar(100) = NULL,
  @beroert_bruker uniqueidentifier = NULL,
  @driftsidentitet sysname = NULL,
  @utfall varchar(16) = 'gjennomfoert',
  @grunn varchar(40) = NULL,
  @forsoekt_subjekt uniqueidentifier = NULL,
  @forsoekt_tenant uniqueidentifier = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.tilgangslogg
    (hendelse, korrelasjons_id, aktor_id, prosjekt_id, beroert_bruker_id, driftsidentitet, utfall, grunn,
     forsoekt_subjekt, forsoekt_tenant)
  VALUES (@hendelse, @korrelasjon, @aktor, @prosjekt, @beroert_bruker, @driftsidentitet, @utfall, @grunn,
          @forsoekt_subjekt, @forsoekt_tenant);
END
GO

CREATE PROCEDURE koe_api.logg_tilgang
  @hendelse varchar(40),
  @korrelasjon uniqueidentifier,
  @grunn varchar(40) = NULL,
  @aktor uniqueidentifier = NULL,
  @prosjekt nvarchar(100) = NULL,
  @forsoekt_subjekt uniqueidentifier = NULL,
  @forsoekt_tenant uniqueidentifier = NULL
AS
BEGIN
  SET NOCOUNT ON;
  IF @hendelse IS NULL OR @hendelse COLLATE Latin1_General_100_BIN2_UTF8 NOT IN
      ('innlogging_catenda', 'innlogging_entra', 'autorisasjon') OR @korrelasjon IS NULL
    THROW 52069, N'Ugyldig hendelse eller manglende korrelasjon for tilgangsloggen', 1;
  EXEC koe.skriv_tilgangslogg @hendelse, @korrelasjon, @aktor, @prosjekt,
    @utfall = 'avvist', @grunn = @grunn,
    @forsoekt_subjekt = @forsoekt_subjekt, @forsoekt_tenant = @forsoekt_tenant;
END
GO
GRANT EXECUTE ON koe_api.logg_tilgang TO koe_runtime;
GO

CREATE TRIGGER koe.catenda_project_configs_tilgangslogg ON koe.catenda_project_configs
AFTER INSERT, UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.tilgangslogg (hendelse, utfall, prosjekt_id, driftsidentitet)
  SELECT 'prosjektkobling', 'gjennomfoert', COALESCE(i.internal_project_id, d.internal_project_id),
         ORIGINAL_LOGIN()
    FROM inserted i
    FULL JOIN deleted d ON i.internal_project_id = d.internal_project_id
   WHERE i.catenda_project_id IS DISTINCT FROM d.catenda_project_id
      OR i.is_active IS DISTINCT FROM d.is_active;
END
GO

CREATE OR ALTER PROCEDURE koe_api.sett_leserolle
  @aktor uniqueidentifier,
  @prosjekt nvarchar(4000),
  @medlem uniqueidentifier,
  @leserolle bit,
  @endret bit OUTPUT,
  @korrelasjon uniqueidentifier = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  SET @endret = 0;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  IF @aktor IS NULL OR @medlem IS NULL OR @leserolle IS NULL OR @medlem = @aktor
    RETURN;

  BEGIN TRANSACTION;
  DECLARE @ressurs nvarchar(255) = CONCAT(N'koe.medlemskap:', @prosjekt), @laas int;
  EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
  IF @laas < 0
    THROW 52044, N'Fikk ikke låsen for medlemskapet i prosjektet', 1;

  IF EXISTS (SELECT 1 FROM koe.app_project_memberships
              WHERE project_id = @prosjekt AND user_id = @aktor AND active = 1
                AND role = N'admin' AND viewer_override = 0)
  BEGIN
    UPDATE koe.app_project_memberships
       SET viewer_override = @leserolle, updated_at = SYSUTCDATETIME()
     WHERE project_id = @prosjekt AND user_id = @medlem AND active = 1;
    SET @endret = CASE WHEN @@ROWCOUNT = 1 THEN 1 ELSE 0 END;
  END
  IF @endret = 1
  BEGIN
    DECLARE @hendelse varchar(40) = CASE WHEN @leserolle = 1 THEN 'leserolle_satt' ELSE 'leserolle_fjernet' END;
    EXEC koe.skriv_tilgangslogg @hendelse, @korrelasjon, @aktor, @prosjekt, @medlem;
  END
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.synkroniser_medlemskap
  @prosjekt nvarchar(4000), @catenda_prosjekt uniqueidentifier, @medlemmer nvarchar(max),
  @hentet datetime2(3), @skrevet bit OUTPUT, @deaktivert int = NULL OUTPUT,
  @korrelasjon uniqueidentifier = NULL, @aktor uniqueidentifier = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  SET @skrevet = 0;
  SET @deaktivert = 0;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  IF @hentet IS NULL OR @hentet > SYSUTCDATETIME()
    THROW 52042, N'Hentetidspunktet mangler eller ligger fram i tid etter basens klokke', 1;
  IF @medlemmer IS NULL OR ISJSON(@medlemmer, ARRAY) = 0
    THROW 52041, N'Medlemslisten er ikke en JSON-liste', 1;

  IF EXISTS (SELECT 1 FROM OPENJSON(@medlemmer) WHERE type <> 5)
    THROW 52041, N'Et element i medlemslisten er ikke et objekt', 1;
  DECLARE @liste TABLE (
    subject nvarchar(400) NULL, email nvarchar(320) NULL, name nvarchar(400) NULL, role nvarchar(20) NULL);
  INSERT @liste (subject, email, name, role)
  SELECT subject, email, name, role
    FROM OPENJSON(@medlemmer)
         WITH (subject nvarchar(400) '$.subject', email nvarchar(320) '$.email', name nvarchar(400) '$.name', role nvarchar(20) '$.role');
  IF EXISTS (SELECT 1 FROM @liste
              WHERE subject IS NULL OR DATALENGTH(subject) <> 64
                 OR subject COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%')
    THROW 52022, N'Subjektet er ikke normalisert', 1;
  IF (SELECT COUNT(*) FROM @liste) <> (SELECT COUNT(DISTINCT subject) FROM @liste)
    THROW 52041, N'Medlemslisten har samme subjekt flere ganger', 1;
  IF EXISTS (SELECT 1 FROM @liste WHERE role IS NULL OR role NOT IN (N'admin', N'member')
                                      OR DATALENGTH(role) <> DATALENGTH(RTRIM(role)))
    THROW 52041, N'Medlemslisten har en ukjent rolle', 1;

  BEGIN TRANSACTION;
  DECLARE @ressurs nvarchar(255) = CONCAT(N'koe.medlemskap:', @prosjekt), @laas int;
  EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
  IF @laas < 0
    THROW 52044, N'Fikk ikke låsen for medlemskapet i prosjektet', 1;

  IF NOT EXISTS (SELECT 1 FROM koe.catenda_project_configs WITH (HOLDLOCK)
                  WHERE internal_project_id = @prosjekt AND catenda_project_id = @catenda_prosjekt AND is_active = 1)
    THROW 52040, N'Prosjektet er ikke koblet til dette Catenda-prosjektet', 1;
  IF EXISTS (SELECT 1 FROM koe.app_membership_sync WHERE project_id = @prosjekt AND synced_at >= @hentet)
  BEGIN
    COMMIT;
    RETURN;
  END

  DECLARE @subject nvarchar(400), @email nvarchar(320), @name nvarchar(400), @role nvarchar(20), @bruker uniqueidentifier;
  DECLARE medlem CURSOR LOCAL FAST_FORWARD FOR
    SELECT subject, NULLIF(email, N''), NULLIF(name, N''), role FROM @liste ORDER BY subject;
  OPEN medlem;
  FETCH NEXT FROM medlem INTO @subject, @email, @name, @role;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    EXEC koe.resolve_identity N'catenda', N'https://api.catenda.com', @subject, @email, @name, @bruker OUTPUT;
    UPDATE koe.app_project_memberships
       SET catenda_subject = @subject, user_email = ISNULL(@email, user_email),
           display_name = ISNULL(@name, display_name), role = @role,
           active = CASE WHEN deactivated_at IS NULL OR deactivated_at < @hentet THEN 1 ELSE active END,
           deactivated_at = CASE WHEN deactivated_at IS NULL OR deactivated_at < @hentet THEN NULL ELSE deactivated_at END,
           updated_at = SYSUTCDATETIME()
     WHERE project_id = @prosjekt AND user_id = @bruker;
    IF @@ROWCOUNT = 0
       AND NOT EXISTS (SELECT 1 FROM koe.app_membership_absences
                        WHERE project_id = @prosjekt AND user_id = @bruker AND observed_at >= @hentet)
      INSERT koe.app_project_memberships
        (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
      VALUES (@prosjekt, @bruker, @subject, ISNULL(@email, N''), ISNULL(@name, N''), @role, 0, 1);
    FETCH NEXT FROM medlem INTO @subject, @email, @name, @role;
  END
  CLOSE medlem;
  DEALLOCATE medlem;

  UPDATE koe.app_project_memberships
     SET active = 0, deactivated_at = @hentet, updated_at = SYSUTCDATETIME()
   WHERE project_id = @prosjekt AND active = 1
     AND NOT EXISTS (SELECT 1 FROM @liste l WHERE l.subject = catenda_subject);
  SET @deaktivert = @@ROWCOUNT;

  UPDATE koe.app_membership_sync
     SET catenda_project_id = @catenda_prosjekt, synced_at = @hentet, updated_at = SYSUTCDATETIME()
   WHERE project_id = @prosjekt;
  IF @@ROWCOUNT = 0
    INSERT koe.app_membership_sync (project_id, catenda_project_id, synced_at)
    VALUES (@prosjekt, @catenda_prosjekt, @hentet);
  DELETE koe.app_membership_absences WHERE project_id = @prosjekt AND observed_at < @hentet;
  SET @skrevet = 1;
  EXEC koe.skriv_tilgangslogg 'medlemssynk', @korrelasjon, @aktor, @prosjekt;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.deaktiver_ved_innlogging
  @subjekt nvarchar(400), @catenda_prosjekter nvarchar(max), @hentet datetime2(3),
  @korrelasjon uniqueidentifier = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @subjekt IS NULL OR DATALENGTH(@subjekt) <> 64
     OR @subjekt COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
    THROW 52022, N'Subjektet er ikke normalisert', 1;
  IF @hentet IS NULL OR @hentet > SYSUTCDATETIME()
    THROW 52042, N'Hentetidspunktet mangler eller ligger fram i tid etter basens klokke', 1;
  IF @catenda_prosjekter IS NULL OR ISJSON(@catenda_prosjekter, ARRAY) = 0
    THROW 52045, N'Prosjektlisten er ikke en JSON-liste', 1;
  IF EXISTS (SELECT 1 FROM OPENJSON(@catenda_prosjekter)
              WHERE type <> 1 OR DATALENGTH(value) <> 64
                 OR value COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%')
    THROW 52045, N'Et element i prosjektlisten er ikke en normalisert Catenda-prosjekt-ID', 1;

  DECLARE @liste TABLE (catenda uniqueidentifier NOT NULL PRIMARY KEY);
  INSERT @liste (catenda)
  SELECT DISTINCT CAST(STUFF(STUFF(STUFF(STUFF(value, 21, 0, N'-'), 17, 0, N'-'), 13, 0, N'-'), 9, 0, N'-')
                       AS uniqueidentifier)
    FROM OPENJSON(@catenda_prosjekter);

  DECLARE @resultat TABLE (prosjekt nvarchar(100) NOT NULL);
  DECLARE @bruker uniqueidentifier = (
    SELECT user_id FROM koe.app_identities
     WHERE provider = N'catenda' AND issuer = N'https://api.catenda.com' AND subject = @subjekt);
  IF @bruker IS NULL
  BEGIN
    SELECT prosjekt FROM @resultat;
    RETURN;
  END

  BEGIN TRANSACTION;
  DECLARE @ressurs nvarchar(255) = CONCAT(N'koe.innlogging:', @bruker), @laas int;
  EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
  IF @laas < 0
    THROW 52044, N'Fikk ikke låsen for innloggingen til brukeren', 1;

  DECLARE @prosjekter TABLE (prosjekt nvarchar(100) NOT NULL PRIMARY KEY);
  INSERT @prosjekter (prosjekt)
  SELECT internal_project_id FROM koe.catenda_project_configs
   WHERE is_active = 1 AND catenda_project_id NOT IN (SELECT catenda FROM @liste);

  DECLARE @prosjekt nvarchar(100);
  DECLARE prosjekt CURSOR LOCAL FAST_FORWARD FOR SELECT prosjekt FROM @prosjekter ORDER BY prosjekt;
  OPEN prosjekt;
  FETCH NEXT FROM prosjekt INTO @prosjekt;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @ressurs = CONCAT(N'koe.medlemskap:', @prosjekt);
    EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Shared', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @laas < 0
      THROW 52044, N'Fikk ikke låsen for medlemskapet i prosjektet', 1;
    FETCH NEXT FROM prosjekt INTO @prosjekt;
  END
  CLOSE prosjekt;
  DEALLOCATE prosjekt;

  DELETE p FROM @prosjekter p
   WHERE NOT EXISTS (SELECT 1 FROM koe.catenda_project_configs c WITH (HOLDLOCK)
                      WHERE c.internal_project_id = p.prosjekt AND c.is_active = 1
                        AND c.catenda_project_id NOT IN (SELECT catenda FROM @liste))
      OR EXISTS (SELECT 1 FROM koe.app_membership_sync s
                  WHERE s.project_id = p.prosjekt AND s.synced_at > @hentet);

  UPDATE m
     SET active = 0, deactivated_at = @hentet, updated_at = SYSUTCDATETIME()
  OUTPUT inserted.project_id INTO @resultat (prosjekt)
    FROM @prosjekter p
    JOIN koe.app_project_memberships m WITH (FORCESEEK) ON m.project_id = p.prosjekt AND m.user_id = @bruker
   WHERE (m.active = 1 OR m.deactivated_at IS NULL OR m.deactivated_at < @hentet);

  DECLARE @fravaer TABLE (prosjekt nvarchar(100) NOT NULL);
  UPDATE a
     SET observed_at = @hentet, updated_at = SYSUTCDATETIME()
  OUTPUT inserted.project_id INTO @fravaer (prosjekt)
    FROM @prosjekter p
    JOIN koe.app_membership_absences a WITH (FORCESEEK) ON a.project_id = p.prosjekt AND a.user_id = @bruker
   WHERE a.observed_at < @hentet;
  INSERT koe.app_membership_absences (project_id, user_id, observed_at)
  OUTPUT inserted.project_id INTO @fravaer (prosjekt)
  SELECT p.prosjekt, @bruker, @hentet
    FROM @prosjekter p
   WHERE NOT EXISTS (SELECT 1 FROM koe.app_project_memberships m
                      WHERE m.project_id = p.prosjekt AND m.user_id = @bruker)
     AND NOT EXISTS (SELECT 1 FROM koe.app_membership_absences a
                      WHERE a.project_id = p.prosjekt AND a.user_id = @bruker);
  INSERT koe.tilgangslogg (hendelse, utfall, korrelasjons_id, aktor_id, prosjekt_id, beroert_bruker_id)
  SELECT 'medlem_deaktivert', 'gjennomfoert', @korrelasjon, @bruker, prosjekt, @bruker FROM @resultat
  UNION ALL
  SELECT 'medlem_fravaer', 'gjennomfoert', @korrelasjon, @bruker, prosjekt, @bruker FROM @fravaer;
  COMMIT;
  SELECT prosjekt FROM @resultat ORDER BY prosjekt;
END
GO

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

  UPDATE h SET rolle = NULL, leder_oid = NULL, hentet = @hentet
    FROM koe.hr_kopi h WITH (UPDLOCK, HOLDLOCK)
   WHERE h.tenant_id = @tenant AND NOT EXISTS (SELECT 1 FROM @person p WHERE p.bruker = h.bruker_id);
  UPDATE h SET tenant_id = @tenant, oid = p.oid, rolle = p.rolle, leder_oid = p.leder, hentet = @hentet
    FROM koe.hr_kopi h JOIN @person p ON p.bruker = h.bruker_id;
  INSERT koe.hr_kopi (bruker_id, tenant_id, oid, rolle, leder_oid, hentet)
  SELECT p.bruker, @tenant, p.oid, p.rolle, p.leder, @hentet
    FROM @person p
   WHERE NOT EXISTS (SELECT 1 FROM koe.hr_kopi h WHERE h.bruker_id = p.bruker);
  EXEC koe.skriv_tilgangslogg 'hr_synk', @korrelasjon;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_drift.sett_rolle
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
  DECLARE @drift sysname = ORIGINAL_LOGIN();
  EXEC koe.skriv_tilgangslogg 'rolle_satt', @driftsidentitet = @drift;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_drift.fjern_rolle
  @rolle nvarchar(100)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF EXISTS (SELECT 1 FROM koe.stillingstittel WHERE rolle = @rolle)
     OR EXISTS (SELECT 1 FROM koe.hr_kopi WHERE rolle = @rolle)
    THROW 52061, N'Rollen er i bruk', 1;
  BEGIN TRANSACTION;
  DELETE koe.rolle WHERE rolle = @rolle AND DATALENGTH(rolle) = DATALENGTH(@rolle);
  IF @@ROWCOUNT > 0
  BEGIN
    DECLARE @drift sysname = ORIGINAL_LOGIN();
    EXEC koe.skriv_tilgangslogg 'rolle_fjernet', @driftsidentitet = @drift;
  END
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_drift.sett_kontraktsteam
  @prosjekt nvarchar(4000),
  @team nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @team IS NULL OR ISJSON(@team, ARRAY) = 0
    THROW 52060, N'Kontraktsteamene er ikke en JSON-liste', 1;
  DECLARE @ny TABLE (team_id nvarchar(4000) NULL, contract_role nvarchar(4000) NULL, type_team int NULL, type_rolle int NULL);
  INSERT @ny (team_id, contract_role, type_team, type_rolle)
  SELECT JSON_VALUE(e.value, N'$.team_id'), JSON_VALUE(e.value, N'$.contract_role'),
         (SELECT type FROM OPENJSON(e.value) WHERE [key] = N'team_id'),
         (SELECT type FROM OPENJSON(e.value) WHERE [key] = N'contract_role')
    FROM OPENJSON(@team) e
   WHERE e.type = 5;
  IF (SELECT COUNT(*) FROM OPENJSON(@team)) <> (SELECT COUNT(*) FROM @ny)
     OR EXISTS (SELECT 1 FROM @ny
                 WHERE type_team IS DISTINCT FROM 1 OR type_rolle IS DISTINCT FROM 1
                    OR DATALENGTH(team_id) <> 64
                    OR team_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
                    OR contract_role COLLATE Latin1_General_100_BIN2_UTF8 NOT IN (N'TE', N'BH'))
    THROW 52060, N'Et kontraktsteam har ikke en normalisert team-ID og siden TE eller BH', 1;
  IF EXISTS (SELECT 1 FROM @ny GROUP BY team_id HAVING COUNT(*) > 1)
    THROW 52061, N'Samme team står mer enn én gang i listen', 1;
  IF NOT EXISTS (SELECT 1 FROM @ny WHERE contract_role = N'TE')
     OR NOT EXISTS (SELECT 1 FROM @ny WHERE contract_role = N'BH')
    THROW 52062, N'Både TE og BH må ha minst ett kontraktsteam', 1;

  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.catenda_project_configs WITH (UPDLOCK, HOLDLOCK)
                  WHERE internal_project_id = @prosjekt AND is_active = 1)
    THROW 52063, N'Prosjektet har ingen aktiv kobling til Catenda', 1;
  IF EXISTS (SELECT 1 FROM koe.prosjekt_med_saker WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt)
  BEGIN
    IF EXISTS (SELECT 1 FROM koe.catenda_contract_teams t
                WHERE t.internal_project_id = @prosjekt
                  AND NOT EXISTS (SELECT 1 FROM @ny n
                                   WHERE n.team_id = t.team_id AND n.contract_role = t.contract_role))
      THROW 52064, N'Prosjektet har saker: et kontraktsteam kan ikke flyttes til den andre siden eller fjernes', 1;
  END
  ELSE
    DELETE koe.catenda_contract_teams WHERE internal_project_id = @prosjekt;
  INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role)
  SELECT @prosjekt, n.team_id, n.contract_role
    FROM @ny n
   WHERE NOT EXISTS (SELECT 1 FROM koe.catenda_contract_teams t
                      WHERE t.internal_project_id = @prosjekt AND t.team_id = n.team_id);
  DECLARE @drift sysname = ORIGINAL_LOGIN();
  EXEC koe.skriv_tilgangslogg 'kontraktsteam', @prosjekt = @prosjekt, @driftsidentitet = @drift;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.slett_sesjon
  @token_hash nvarchar(4000),
  @utlogging bit = 0, @korrelasjon uniqueidentifier = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF koe.er_hash(@token_hash) = 0
    THROW 52050, N'Sesjonstokenet er ikke en SHA-256 i små heksadesimale tegn', 1;
  DECLARE @token varchar(64) = @token_hash;
  DECLARE @aktor uniqueidentifier;
  BEGIN TRANSACTION;
  IF @utlogging = 1
    SELECT @aktor = user_id FROM koe.app_sessions WITH (UPDLOCK) WHERE token_hash = @token;
  DELETE koe.app_sessions WHERE token_hash = @token;
  IF @aktor IS NOT NULL
    EXEC koe.skriv_tilgangslogg 'utlogging', @korrelasjon, @aktor;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_api.opprett_sesjon
  @token_hash nvarchar(4000), @bruker uniqueidentifier, @csrf_token nvarchar(4000),
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
  IF @bruker IS NULL OR NOT EXISTS (SELECT 1 FROM koe.app_users WHERE id = @bruker)
    THROW 52051, N'Brukeren finnes ikke', 1;
  DECLARE @naa datetime2(3) = DATETRUNC(millisecond, SYSUTCDATETIME());
  SET @utloeper = DATEADD(hour, 8, @naa);
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

CREATE OR ALTER PROCEDURE koe_drift.sett_stillingstittel
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
  DECLARE @drift sysname = ORIGINAL_LOGIN();
  EXEC koe.skriv_tilgangslogg 'stillingstittel_satt', @driftsidentitet = @drift;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_drift.fjern_stillingstittel
  @stillingstittel nvarchar(200)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRANSACTION;
  DELETE koe.stillingstittel WHERE noekkel = CAST(HASHBYTES('SHA2_256', @stillingstittel) AS binary(32));
  IF @@ROWCOUNT > 0
  BEGIN
    DECLARE @drift sysname = ORIGINAL_LOGIN();
    EXEC koe.skriv_tilgangslogg 'stillingstittel_fjernet', @driftsidentitet = @drift;
  END
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_drift.registrer_entra_identitet
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
  DECLARE @drift sysname = ORIGINAL_LOGIN();
  EXEC koe.skriv_tilgangslogg 'entra_identitet_koblet', @driftsidentitet = @drift, @beroert_bruker = @bruker;
  COMMIT;
END
GO

CREATE OR ALTER PROCEDURE koe_drift.koble_catenda_identitet
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
  DECLARE @identitet uniqueidentifier, @annen uniqueidentifier, @drift sysname = ORIGINAL_LOGIN();
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
    EXEC koe.skriv_tilgangslogg 'catenda_identitet_koblet', @driftsidentitet = @drift, @beroert_bruker = @bruker;
    COMMIT;
    RETURN;
  END
  IF EXISTS (SELECT 1 FROM koe.app_identities WHERE user_id = @annen AND id <> @identitet)
    THROW 52030, N'Catenda-identiteten står på en bruker med en annen identitet', 1;
  -- `koe.kvittering.aktor_id` har ingen fremmednøkkel, men en kvittering skrives
  -- bare med en hendelse fra samme aktør (`koe.kvittering_samme_transaksjon`),
  -- og nøkkelen fra hendelsen hindrer slettingen under.
  UPDATE koe.app_project_memberships SET user_id = @bruker WHERE user_id = @annen;
  UPDATE koe.app_membership_absences SET user_id = @bruker WHERE user_id = @annen;
  DELETE koe.app_sessions WHERE user_id = @annen;
  DECLARE @transaksjon bigint = CURRENT_TRANSACTION_ID();
  EXEC sp_set_session_context N'koe_flytt_identitet', @identitet;
  EXEC sp_set_session_context N'koe_flytt_transaksjon', @transaksjon;
  DELETE koe.app_identities WHERE id = @identitet;
  EXEC sp_set_session_context N'koe_flytt_identitet', NULL;
  EXEC sp_set_session_context N'koe_flytt_transaksjon', NULL;
  INSERT koe.app_identities (id, user_id, provider, issuer, subject)
  VALUES (NEWID(), @bruker, N'catenda', N'https://api.catenda.com', @subjekt);
  BEGIN TRY
    DELETE koe.app_users WHERE id = @annen;
  END TRY
  BEGIN CATCH
    IF ERROR_NUMBER() <> 547 THROW;
    ROLLBACK;
    THROW 52029, N'Catenda-identiteten står på en annen bruker som er brukt utover medlemskap, fravær og sesjoner', 1;
  END CATCH
  EXEC koe.skriv_tilgangslogg 'catenda_identitet_koblet', @driftsidentitet = @drift, @beroert_bruker = @bruker;
  COMMIT;
END
GO
