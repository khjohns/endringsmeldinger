-- `koe_migrering.historikk.versjon` får tegnklassen (#871 punkt 4). Kolonnen er
-- `char(14)`, og utfyllingen gir bare U+0020 én form, ikke tab, NBSP eller U+200B.
-- Runneren lager historikken med kontrollen i en ny base (`HISTORIKK` i
-- `server/migrering.ts`), så her legges den bare på en historikk som mangler den.

IF OBJECT_ID(N'koe_migrering.historikk_versjon_tegnklasse', N'C') IS NULL
  ALTER TABLE koe_migrering.historikk ADD CONSTRAINT historikk_versjon_tegnklasse
    CHECK (NOT versjon COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^!-~]%');
