-- Koblingen til Catenda-prosjektet og medlemskapene (F0b-5b, #614, #638).
--
-- DL-U10: blir koblingen opphevet, slettet eller endret til et annet
-- Catenda-prosjekt, blir medlemskapene i prosjektet inaktive straks, og ingen kan
-- handle der før en ny medlemsliste er hentet fra det koblede Catenda-prosjektet.
-- Triggeren under gjør medlemskapene inaktive med `deactivated_at` satt til
-- tidspunktet for endringen, så en liste hentet før den ikke gjør dem aktive igjen
-- (DL-U8). Synkroniseringsraden får den tomme Catenda-ID-en og samme tidspunkt:
-- `medlemsliste_alder` finner da ingen liste fra det koblede prosjektet, så
-- tilgangen krever en ny synkronisering, og `synkroniser_medlemskap` skriver ikke en
-- liste hentet før endringen (DL-U7). Ingen kobling kan ha den tomme ID-en.
--
-- Synkroniseringen leser koblingen med HOLDLOCK i sin transaksjon, så en endring
-- venter på en synkronisering som pågår, eller får den til å feile med 52040.

ALTER TABLE koe.catenda_project_configs
  ADD CONSTRAINT catenda_project_configs_catenda_ikke_tom
  CHECK (catenda_project_id <> CAST('00000000-0000-0000-0000-000000000000' AS uniqueidentifier));
GO

CREATE TRIGGER koe.catenda_project_configs_kobling_endret
ON koe.catenda_project_configs
AFTER UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @naa datetime2(3) = CAST(DATETRUNC(millisecond, SYSUTCDATETIME()) AS datetime2(3));
  DECLARE @tom uniqueidentifier = CAST('00000000-0000-0000-0000-000000000000' AS uniqueidentifier);
  DECLARE @endret TABLE (prosjekt nvarchar(100) NOT NULL PRIMARY KEY);
  INSERT @endret (prosjekt)
  SELECT d.internal_project_id
    FROM deleted d
    LEFT JOIN inserted i ON i.internal_project_id = d.internal_project_id
   WHERE i.internal_project_id IS NULL
      OR i.catenda_project_id <> d.catenda_project_id
      OR i.is_active <> d.is_active
  UNION
  SELECT i.internal_project_id
    FROM inserted i
    LEFT JOIN deleted d ON d.internal_project_id = i.internal_project_id
   WHERE d.internal_project_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM @endret) RETURN;

  UPDATE m
     SET active = 0, deactivated_at = @naa, updated_at = SYSUTCDATETIME()
    FROM koe.app_project_memberships m
    JOIN @endret e ON e.prosjekt = m.project_id;

  UPDATE s
     SET catenda_project_id = @tom, synced_at = @naa, updated_at = SYSUTCDATETIME()
    FROM koe.app_membership_sync s
    JOIN @endret e ON e.prosjekt = s.project_id;
  INSERT koe.app_membership_sync (project_id, catenda_project_id, synced_at)
  SELECT e.prosjekt, @tom, @naa
    FROM @endret e
   WHERE EXISTS (SELECT 1 FROM koe.projects p WHERE p.id = e.prosjekt)
     AND NOT EXISTS (SELECT 1 FROM koe.app_membership_sync s WHERE s.project_id = e.prosjekt);
END
GO

-- Prosjektene med aktiv kobling til ett av Catenda-prosjektene i listen, for
-- synkroniseringen ved innlogging. Listen er brukerens egne Catenda-prosjekter,
-- hentet med brukerens token, i `catenda_id()`-formen som i
-- `koe_api.deaktiver_ved_innlogging` (52045).
CREATE PROCEDURE koe_api.koblede_prosjekter
  @catenda_prosjekter nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  IF @catenda_prosjekter IS NULL OR ISJSON(@catenda_prosjekter, ARRAY) = 0
    THROW 52045, N'Prosjektlisten er ikke en JSON-liste', 1;
  IF EXISTS (SELECT 1 FROM OPENJSON(@catenda_prosjekter)
              WHERE type <> 1 OR DATALENGTH(value) <> 64
                 OR value COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%')
    THROW 52045, N'Et element i prosjektlisten er ikke en normalisert Catenda-prosjekt-ID', 1;
  SELECT c.internal_project_id AS prosjekt
    FROM koe.catenda_project_configs c
   WHERE c.is_active = 1
     AND c.catenda_project_id IN (
       SELECT CAST(STUFF(STUFF(STUFF(STUFF(value, 21, 0, N'-'), 17, 0, N'-'), 13, 0, N'-'), 9, 0, N'-')
                   AS uniqueidentifier)
         FROM OPENJSON(@catenda_prosjekter))
   ORDER BY c.internal_project_id;
END
GO

GRANT EXECUTE ON koe_api.koblede_prosjekter TO koe_runtime;
GO

-- De anvendte migrasjonene, så serveren kan nekte å starte mot en base som
-- avviker fra `database/migrasjoner/` (F0b-8, #662). Historikken har ingen
-- saksdata; kjøretiden får den gjennom prosedyren, ikke tabellen.
CREATE PROCEDURE koe_api.migrasjonshistorikk
AS
BEGIN
  SET NOCOUNT ON;
  SELECT versjon, filnavn, sha256 FROM koe_migrering.historikk ORDER BY versjon;
END
GO

GRANT EXECUTE ON koe_api.migrasjonshistorikk TO koe_runtime;
