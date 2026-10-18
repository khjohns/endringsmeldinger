-- Grensen for en ny medlemsliste uten markør (#726 punkt 6).
--
-- DL-U10: blir koblingen opphevet, slettet eller endret, får synkroniseringsraden
-- `catenda_project_id = NULL` og tidspunktet for endringen i `synced_at`. NULL er
-- ingen liste fra noe Catenda-prosjekt, så `medlemsliste_alder` finner ingen liste
-- uansett skranken på koblingen, og `synkroniser_medlemskap` skriver fortsatt ikke
-- en liste hentet før endringen (DL-U7). Den tomme Catenda-ID-en var markøren før
-- dette, og holdt bare så lenge `catenda_project_configs_catenda_ikke_tom` stod.
-- Skranken under stopper den tomme ID-en også i synkroniseringsraden.

ALTER TABLE koe.app_membership_sync ALTER COLUMN catenda_project_id uniqueidentifier NULL;
GO

UPDATE koe.app_membership_sync
   SET catenda_project_id = NULL
 WHERE catenda_project_id = CAST('00000000-0000-0000-0000-000000000000' AS uniqueidentifier);
GO

ALTER TABLE koe.app_membership_sync
  ADD CONSTRAINT app_membership_sync_catenda_ikke_tom
  CHECK (catenda_project_id <> CAST('00000000-0000-0000-0000-000000000000' AS uniqueidentifier));
GO

CREATE OR ALTER TRIGGER koe.catenda_project_configs_kobling_endret
ON koe.catenda_project_configs
AFTER UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @naa datetime2(3) = CAST(DATETRUNC(millisecond, SYSUTCDATETIME()) AS datetime2(3));
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
     SET catenda_project_id = NULL, synced_at = @naa, updated_at = SYSUTCDATETIME()
    FROM koe.app_membership_sync s
    JOIN @endret e ON e.prosjekt = s.project_id;
  INSERT koe.app_membership_sync (project_id, catenda_project_id, synced_at)
  SELECT e.prosjekt, NULL, @naa
    FROM @endret e
   WHERE EXISTS (SELECT 1 FROM koe.projects p WHERE p.id = e.prosjekt)
     AND NOT EXISTS (SELECT 1 FROM koe.app_membership_sync s WHERE s.project_id = e.prosjekt);
END
GO
