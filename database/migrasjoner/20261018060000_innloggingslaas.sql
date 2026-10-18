-- `koe_api.deaktiver_ved_innlogging` tar applåsen `koe.medlemskap:<prosjekt>` som
-- `Shared`, ikke `Exclusive` (#636). Synkroniseringen tar den fortsatt som
-- `Exclusive`, så innloggingen og synkroniseringen av et prosjekt går fortsatt
-- etter hverandre, men to innlogginger venter ikke lenger på hverandre. Før ga en
-- innlogging som holdt låsene i over 10 s, 52044 for hver samtidig innlogging.
--
-- To innlogginger for samme bruker skriver de samme radene, så prosedyren tar
-- først applåsen `koe.innlogging:<bruker>` som `Exclusive`. Den tas før låsene for
-- prosjektene, og synkroniseringen tar den ikke, så rekkefølgen gir ingen vranglås.
--
-- Vilkåret for hvilke prosjekter innloggingen får røre, står én gang: `@prosjekter`
-- filtreres etter at låsene er tatt, og de tre setningene slår bare opp der (#671).
-- Settet låsene tas for, er det samme som før, regnet ut av koblingene alene.
-- `UPDATE`-setningene slår opp radene på primærnøkkelen med `FORCESEEK`. En
-- skanning tar en U-lås på hver rad den leser, så den ville vente på en annen
-- brukers innlogging som har endret en rad i samme prosjekt.
--
-- Prosedyren har samme navn, argumenter, resultat og rettigheter som i
-- `20261016210000_catenda_id.sql`.

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

  UPDATE a
     SET observed_at = @hentet, updated_at = SYSUTCDATETIME()
    FROM @prosjekter p
    JOIN koe.app_membership_absences a WITH (FORCESEEK) ON a.project_id = p.prosjekt AND a.user_id = @bruker
   WHERE a.observed_at < @hentet;
  INSERT koe.app_membership_absences (project_id, user_id, observed_at)
  SELECT p.prosjekt, @bruker, @hentet
    FROM @prosjekter p
   WHERE NOT EXISTS (SELECT 1 FROM koe.app_project_memberships m
                      WHERE m.project_id = p.prosjekt AND m.user_id = @bruker)
     AND NOT EXISTS (SELECT 1 FROM koe.app_membership_absences a
                      WHERE a.project_id = p.prosjekt AND a.user_id = @bruker);
  COMMIT;
  SELECT prosjekt FROM @resultat ORDER BY prosjekt;
END
GO
