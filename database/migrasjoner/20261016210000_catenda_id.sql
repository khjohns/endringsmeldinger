-- `koe_api.deaktiver_ved_innlogging` tar Catenda-prosjektene i formen fra
-- `catendaId()` i `server/autorisasjon.ts`: 32 heksadesimale tegn med små
-- bokstaver, uten bindestreker. Det er formen Python-stien normaliserer
-- prosjektlisten til (`catenda_id()`), og formen subjektet har (#637).
-- `20261016150000_deaktivering.sql` godtok bare UUID-formen med bindestreker, så
-- en liste fra `catendaId()` ga 52045 ved hver innlogging. Et element i en annen
-- form, også UUID-formen med bindestreker, avvises fortsatt med 52045.
--
-- Bare valideringen og omformingen av listen er endret. Prosedyren har samme navn,
-- argumenter og rettigheter som i `20261016180000_fravaer.sql`.

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
