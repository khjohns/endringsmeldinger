-- `koe_migrering.historikk.anvendt` får standarden `DATETRUNC(millisecond,
-- SYSUTCDATETIME())`, som de andre tidspunktene (#778 punkt 7, DL-U3). Runneren lager
-- historikken med den i en ny base (`HISTORIKK` i `server/migrering.ts`), så her
-- byttes bare en standard som ikke er den.

IF NOT EXISTS (
  SELECT 1 FROM sys.default_constraints
   WHERE name = N'historikk_anvendt' AND parent_object_id = OBJECT_ID(N'koe_migrering.historikk')
     AND definition LIKE N'%datetrunc%')
BEGIN
  ALTER TABLE koe_migrering.historikk DROP CONSTRAINT historikk_anvendt;
  ALTER TABLE koe_migrering.historikk ADD CONSTRAINT historikk_anvendt
    DEFAULT DATETRUNC(millisecond, SYSUTCDATETIME()) FOR anvendt;
END
