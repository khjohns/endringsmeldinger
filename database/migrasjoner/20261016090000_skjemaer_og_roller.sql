-- Skjemaene og rollen for kjøretiden (#53, del 1). Skjemaene er de samme som i
-- prøven (`prove/azuresql/sql/01_skjema.sql`): `koe` har tabellene og de
-- generelle prosedyrene, `koe_sikkerhet` predikatene og `koe_api` de smale
-- inngangene kjøretiden får kalle. Brukerne til rollene opprettes ved
-- utrullingen (`CREATE USER … FROM EXTERNAL PROVIDER`, A8 og A9 i #78), ikke her.
--
-- Basen må ha den binære sorteringen (#78, A3): med standardsorteringen er
-- `Oslobygg` og `oslobygg` samme prosjekt (SQ-08).

IF CONVERT(nvarchar(128), DATABASEPROPERTYEX(DB_NAME(), 'Collation')) <> N'Latin1_General_100_BIN2_UTF8'
  THROW 53001, N'Basen har ikke sorteringen Latin1_General_100_BIN2_UTF8', 1;
GO

CREATE SCHEMA koe;
GO
CREATE SCHEMA koe_sikkerhet;
GO
CREATE SCHEMA koe_api;
GO

CREATE ROLE koe_runtime;
GO
