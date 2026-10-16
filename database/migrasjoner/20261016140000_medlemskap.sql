-- Medlemssynkroniseringen (#53, del 3b, DL-U7): koblingen til Catenda-prosjektet,
-- når medlemslisten ble hentet og fra hvilket Catenda-prosjekt, prosedyren som
-- skriver en liste, og en smal lesing av listens alder. Svarer til
-- `catenda_project_configs`, `app_membership_sync` og `koe_reconcile_memberships`
-- i PostgreSQL (`supabase/migrations/20260912150635_catenda_user_sessions.sql`).
--
-- Synkroniseringen er et systemkall uten aktør og prosjektkontekst (RB2-04), så
-- prosedyrene går utenom `transaksjon()` og har sin egen transaksjon, som
-- `koe.resolve_identity`. Ingen av tabellene her har saksdata, så de har ingen
-- predikater, og kjøretiden leser dem bare gjennom prosedyrene.
--
-- En prosjekt-ID eller en rolle med mellomrom til slutt avvises: `=` ser bort
-- fra dem, så `p1 ` ville truffet koblingen til `p1` og skrevet medlemskap under
-- en annen form av samme prosjekt. Kontrollen har formen fra
-- `20261016130000_mellomrom.sql` (#566).

-- Koblingen settes av driften (arbeidsvalget 16.10 i #53). Et Catenda-prosjekt
-- hører til ett prosjekt i appen.
CREATE TABLE koe.catenda_project_configs (
  internal_project_id nvarchar(100) NOT NULL CONSTRAINT catenda_project_configs_pk PRIMARY KEY
    CONSTRAINT catenda_project_configs_project FOREIGN KEY REFERENCES koe.projects (id)
    CONSTRAINT catenda_project_configs_internal_project_id_uten_mellomrom
      CHECK (DATALENGTH(internal_project_id) = DATALENGTH(RTRIM(internal_project_id))),
  catenda_project_id uniqueidentifier NOT NULL CONSTRAINT catenda_project_configs_catenda UNIQUE,
  is_active bit NOT NULL,
  created_at datetime2(3) NOT NULL CONSTRAINT catenda_project_configs_created_at DEFAULT SYSUTCDATETIME(),
  updated_at datetime2(3) NOT NULL CONSTRAINT catenda_project_configs_updated_at DEFAULT SYSUTCDATETIME()
);

-- `synced_at` er når listen ble hentet, fra kalleren; `updated_at` er når basen
-- skrev den.
CREATE TABLE koe.app_membership_sync (
  project_id nvarchar(100) NOT NULL CONSTRAINT app_membership_sync_pk PRIMARY KEY
    CONSTRAINT app_membership_sync_project FOREIGN KEY REFERENCES koe.projects (id)
    CONSTRAINT app_membership_sync_project_id_uten_mellomrom CHECK (DATALENGTH(project_id) = DATALENGTH(RTRIM(project_id))),
  catenda_project_id uniqueidentifier NOT NULL,
  synced_at datetime2(3) NOT NULL,
  updated_at datetime2(3) NOT NULL CONSTRAINT app_membership_sync_updated_at DEFAULT SYSUTCDATETIME()
);

-- Når medlemskapet sist ble gjort inaktivt, i samme tid som listens `synced_at`.
-- En liste hentet før dette gjør det ikke aktivt igjen (DL-U8); synkroniseringen
-- setter det til tidspunktet for listen som fjernet medlemmet.
ALTER TABLE koe.app_project_memberships ADD deactivated_at datetime2(3) NULL;
GO

-- Skriver en fullstendig medlemsliste for prosjektet. `@medlemmer` er en
-- JSON-liste med `subject` i `catenda_id()`-formen, `email`, `name` og `role`.
-- `@skrevet` er 0 når en liste hentet samtidig eller senere alt er skrevet (DL-U7);
-- da endres ingenting. Applåsen per prosjekt holder sammenlikningen og
-- skrivingen samlet. Deaktiveringen ved innlogging er ikke bygget; den må ta
-- samme lås (DL-U8).
-- `viewer_override` og kontraktsteamene skrives ikke her.
CREATE PROCEDURE koe_api.synkroniser_medlemskap
  @prosjekt nvarchar(100), @catenda_prosjekt uniqueidentifier, @medlemmer nvarchar(max),
  @hentet datetime2(3), @skrevet bit OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  SET @skrevet = 0;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom eller har mellomrom til slutt', 1;
  IF @hentet IS NULL OR @hentet > DATEADD(second, 30, SYSUTCDATETIME())
    THROW 52042, N'Hentetidspunktet mangler eller ligger fram i tid', 1;
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
    SELECT subject, ISNULL(email, N''), ISNULL(name, N''), role FROM @liste ORDER BY subject;
  OPEN medlem;
  FETCH NEXT FROM medlem INTO @subject, @email, @name, @role;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    EXEC koe.resolve_identity N'catenda', N'https://api.catenda.com', @subject, @email, @name, @bruker OUTPUT;
    UPDATE koe.app_project_memberships
       SET catenda_subject = @subject, user_email = @email, display_name = @name, role = @role,
           active = CASE WHEN deactivated_at IS NULL OR deactivated_at < @hentet THEN 1 ELSE active END,
           deactivated_at = CASE WHEN deactivated_at IS NULL OR deactivated_at < @hentet THEN NULL ELSE deactivated_at END,
           updated_at = SYSUTCDATETIME()
     WHERE project_id = @prosjekt AND user_id = @bruker;
    IF @@ROWCOUNT = 0
      INSERT koe.app_project_memberships
        (project_id, user_id, catenda_subject, user_email, display_name, role, viewer_override, active)
      VALUES (@prosjekt, @bruker, @subject, @email, @name, @role, 0, 1);
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
  SET @skrevet = 1;
  COMMIT;
END
GO

-- Når listen for prosjektet ble hentet, og alderen i sekunder etter basens
-- klokke (B-04 punkt 4). En liste fra et annet Catenda-prosjekt enn det
-- prosjektet er koblet til nå, gjelder ikke, og gir ingen rad.
CREATE PROCEDURE koe_api.medlemsliste_alder
  @prosjekt nvarchar(100)
AS
BEGIN
  SET NOCOUNT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom eller har mellomrom til slutt', 1;
  SELECT s.synced_at AS hentet, DATEDIFF_BIG(millisecond, s.synced_at, SYSUTCDATETIME()) / 1000 AS alder_sekunder
    FROM koe.app_membership_sync s
    JOIN koe.catenda_project_configs c
      ON c.internal_project_id = s.project_id AND c.catenda_project_id = s.catenda_project_id AND c.is_active = 1
   WHERE s.project_id = @prosjekt;
END
GO

GRANT EXECUTE ON koe_api.synkroniser_medlemskap TO koe_runtime;
GRANT EXECUTE ON koe_api.medlemsliste_alder TO koe_runtime;
GO
