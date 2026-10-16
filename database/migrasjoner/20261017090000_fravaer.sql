-- Innloggingen er nyere enn en medlemsliste som ble hentet før innloggingen, også
-- for en bruker som ikke hadde noe medlemskap i prosjektet (DL-U9, #625).
--
-- `koe_api.deaktiver_ved_innlogging` gjør et medlemskap som finnes, inaktivt med
-- `deactivated_at = @hentet` (DL-U8). Har brukeren ikke noe medlemskap i
-- prosjektet, fører den i stedet en rad i `koe.app_membership_absences` med
-- `observed_at = @hentet`. `koe_api.synkroniser_medlemskap` lager ikke et nytt
-- medlemskap for en bruker med en slik rad når listen er hentet før eller samtidig
-- (`observed_at >= @hentet`), som et medlemskap bare blir aktivt igjen når
-- `deactivated_at < @hentet`. Et medlemskap med en oppdiktet rolle, e-post eller
-- et navn er ikke lagret i stedet; raden sier bare det innloggingens liste sa.
--
-- En liste som er skrevet, sletter radene i prosjektet med `observed_at < @hentet`:
-- en liste som skrives senere, er hentet etter denne (DL-U7), så de kan ikke
-- lenger stoppe noe.
--
-- Prosedyrene har samme navn, argumenter og rettigheter som i
-- `20261016150000_deaktivering.sql`.

-- Prosjektene der innloggingens liste over Catenda-prosjekter viste at brukeren
-- ikke er med, for en bruker uten medlemskap der (DL-U9). `observed_at` er når
-- innloggingens liste ble hentet, i samme tid som `synced_at`.
CREATE TABLE koe.app_membership_absences (
  project_id nvarchar(100) NOT NULL CONSTRAINT app_membership_absences_project FOREIGN KEY REFERENCES koe.projects (id)
    CONSTRAINT app_membership_absences_project_id_uten_mellomrom CHECK (DATALENGTH(project_id) = DATALENGTH(RTRIM(project_id))),
  user_id uniqueidentifier NOT NULL CONSTRAINT app_membership_absences_user FOREIGN KEY REFERENCES koe.app_users (id),
  observed_at datetime2(3) NOT NULL,
  updated_at datetime2(3) NOT NULL CONSTRAINT app_membership_absences_updated_at DEFAULT SYSUTCDATETIME(),
  CONSTRAINT app_membership_absences_pk PRIMARY KEY (project_id, user_id)
);
GO

CREATE OR ALTER PROCEDURE koe_api.synkroniser_medlemskap
  @prosjekt nvarchar(4000), @catenda_prosjekt uniqueidentifier, @medlemmer nvarchar(max),
  @hentet datetime2(3), @skrevet bit OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  SET @skrevet = 0;
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


-- Deaktiveringen ved innlogging (DL-U8, B-04 punkt 1). `@catenda_prosjekter` er
-- en JSON-liste med ID-ene til alle Catenda-prosjektene brukeren er med i, hentet
-- fra Catenda etter `@hentet`; er listen ufullstendig, kalles prosedyren ikke.
-- Hvert prosjekt med en aktiv kobling til et Catenda-prosjekt som ikke står i
-- listen, gjør brukerens medlemskap inaktivt, med `deactivated_at = @hentet`, så
-- en liste hentet før innloggingen ikke gjør det aktivt igjen.
--
-- Er en medlemsliste for prosjektet hentet etter innloggingens liste
-- (`synced_at > @hentet`), er den nyere, og prosedyren endrer ikke medlemskapet
-- der (DL-U7). Ved samme tidspunkt gjelder innloggingen, som i synkroniseringen,
-- der en liste bare gjør et medlem aktivt igjen når `deactivated_at < @hentet`.
--
-- Prosedyren tar applåsen `koe.medlemskap:<prosjekt>` for hvert prosjekt den kan
-- deaktivere, i sortert rekkefølge, så den ikke krysser synkroniseringen. Settet
-- regnes ut av koblingene alene, ikke av medlemskapene, så et medlemskap en
-- samtidig synkronisering skriver, ikke faller utenfor.
-- Har brukeren ikke noe medlemskap i et slikt prosjekt, fører prosedyren
-- `observed_at = @hentet` i `koe.app_membership_absences` på samme vilkår (DL-U9).
-- Resultatet er prosjektene der medlemskapet ble gjort inaktivt eller fikk et
-- nyere `deactivated_at`; en rad i `koe.app_membership_absences` er ikke med.
CREATE OR ALTER PROCEDURE koe_api.deaktiver_ved_innlogging
  @subjekt nvarchar(400), @catenda_prosjekter nvarchar(max), @hentet datetime2(3)
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
              WHERE type <> 1 OR DATALENGTH(value) <> 72 OR TRY_CAST(value AS uniqueidentifier) IS NULL)
    THROW 52045, N'Et element i prosjektlisten er ikke en Catenda-prosjekt-ID', 1;

  DECLARE @liste TABLE (catenda uniqueidentifier NOT NULL PRIMARY KEY);
  INSERT @liste (catenda)
  SELECT DISTINCT CAST(value AS uniqueidentifier) FROM OPENJSON(@catenda_prosjekter);

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
  DECLARE @prosjekter TABLE (prosjekt nvarchar(100) NOT NULL PRIMARY KEY);
  INSERT @prosjekter (prosjekt)
  SELECT internal_project_id FROM koe.catenda_project_configs
   WHERE is_active = 1 AND catenda_project_id NOT IN (SELECT catenda FROM @liste);

  DECLARE @prosjekt nvarchar(100), @ressurs nvarchar(255), @laas int;
  DECLARE prosjekt CURSOR LOCAL FAST_FORWARD FOR SELECT prosjekt FROM @prosjekter ORDER BY prosjekt;
  OPEN prosjekt;
  FETCH NEXT FROM prosjekt INTO @prosjekt;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @ressurs = CONCAT(N'koe.medlemskap:', @prosjekt);
    EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    IF @laas < 0
      THROW 52044, N'Fikk ikke låsen for medlemskapet i prosjektet', 1;
    FETCH NEXT FROM prosjekt INTO @prosjekt;
  END
  CLOSE prosjekt;
  DEALLOCATE prosjekt;

  UPDATE m
     SET active = 0, deactivated_at = @hentet, updated_at = SYSUTCDATETIME()
  OUTPUT inserted.project_id INTO @resultat (prosjekt)
    FROM koe.app_project_memberships m
    JOIN @prosjekter p ON p.prosjekt = m.project_id
   WHERE m.user_id = @bruker
     AND (m.active = 1 OR m.deactivated_at IS NULL OR m.deactivated_at < @hentet)
     AND EXISTS (SELECT 1 FROM koe.catenda_project_configs c WITH (HOLDLOCK)
                  WHERE c.internal_project_id = m.project_id AND c.is_active = 1
                    AND c.catenda_project_id NOT IN (SELECT catenda FROM @liste))
     AND NOT EXISTS (SELECT 1 FROM koe.app_membership_sync s
                      WHERE s.project_id = m.project_id AND s.synced_at > @hentet);

  UPDATE a
     SET observed_at = @hentet, updated_at = SYSUTCDATETIME()
    FROM koe.app_membership_absences a
    JOIN @prosjekter p ON p.prosjekt = a.project_id
   WHERE a.user_id = @bruker AND a.observed_at < @hentet
     AND EXISTS (SELECT 1 FROM koe.catenda_project_configs c WITH (HOLDLOCK)
                  WHERE c.internal_project_id = a.project_id AND c.is_active = 1
                    AND c.catenda_project_id NOT IN (SELECT catenda FROM @liste))
     AND NOT EXISTS (SELECT 1 FROM koe.app_membership_sync s
                      WHERE s.project_id = a.project_id AND s.synced_at > @hentet);
  INSERT koe.app_membership_absences (project_id, user_id, observed_at)
  SELECT p.prosjekt, @bruker, @hentet
    FROM @prosjekter p
   WHERE EXISTS (SELECT 1 FROM koe.catenda_project_configs c WITH (HOLDLOCK)
                  WHERE c.internal_project_id = p.prosjekt AND c.is_active = 1
                    AND c.catenda_project_id NOT IN (SELECT catenda FROM @liste))
     AND NOT EXISTS (SELECT 1 FROM koe.app_project_memberships m
                      WHERE m.project_id = p.prosjekt AND m.user_id = @bruker)
     AND NOT EXISTS (SELECT 1 FROM koe.app_membership_absences a
                      WHERE a.project_id = p.prosjekt AND a.user_id = @bruker)
     AND NOT EXISTS (SELECT 1 FROM koe.app_membership_sync s
                      WHERE s.project_id = p.prosjekt AND s.synced_at > @hentet);
  COMMIT;
  SELECT prosjekt FROM @resultat ORDER BY prosjekt;
END
GO
