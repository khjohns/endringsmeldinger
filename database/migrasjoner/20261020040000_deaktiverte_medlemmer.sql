-- `koe_api.synkroniser_medlemskap` returnerer i `@deaktivert` hvor mange
-- medlemskap listen gjorde inaktive (#825 punkt 1). Tallet telles under applåsen
-- og i samme transaksjon som skrivingen, og er `deactivated` i
-- `POST /members/sync` i TS-serveren. Det er 0 når listen ikke skrives (DL-U7).
--
-- `@deaktivert` har standardverdien NULL, så et kall uten parameteren er gyldig.
-- Ellers har prosedyren samme argumenter, rettigheter og virkning som i
-- `20261016180000_fravaer.sql`.

CREATE OR ALTER PROCEDURE koe_api.synkroniser_medlemskap
  @prosjekt nvarchar(4000), @catenda_prosjekt uniqueidentifier, @medlemmer nvarchar(max),
  @hentet datetime2(3), @skrevet bit OUTPUT, @deaktivert int = NULL OUTPUT
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
  COMMIT;
END
GO
