-- Konteksten og predikatene (B-02 alternativ C i T-SQL, #395).
--
-- Konteksten står i SESSION_CONTEXT, som gjelder sesjonen og ikke
-- transaksjonen, og som `mssql`-poolen ikke nullstiller når en forbindelse
-- gjenbrukes. `koe_api.sett_kontekst` binder den derfor til transaksjonen:
-- `koe_tx` er CURRENT_TRANSACTION_ID() da konteksten ble satt, og hvert
-- predikat krever at den er transaksjonen som kjører nå. Etter COMMIT eller
-- ROLLBACK gjelder konteksten ikke lenger, selv om verdiene ligger igjen.
--
-- Predikatene står hver for seg, uten å kalle hverandre, så en
-- feilinnføring kan bytte ut én av dem før sikkerhetspolicyene bindes
-- (04_tilgang.sql).

CREATE FUNCTION koe_sikkerhet.medlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- Privat innsyn: handlingsrett (ikke leserolle) og et team som er et av
-- prosjektets kontraktsteam på den oppgitte siden. Et notat uten team, eller
-- med et annet team, vises ikke.
CREATE FUNCTION koe_sikkerhet.notat_synlig(@prosjekt_id nvarchar(100), @aktor_team_id nvarchar(32))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.team_id = @aktor_team_id
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32))
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2))
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- Bindende skriving: som privat innsyn, og aktørfeltene i raden skal være
-- konteksten. Brukes som blokkpredikat, et andre lag bak kommandoene.
CREATE FUNCTION koe_sikkerhet.skriver(
  @prosjekt_id nvarchar(100), @aktor_id nvarchar(36), @aktor_rolle nvarchar(2), @aktor_team_id nvarchar(32))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND TRY_CAST(@aktor_id AS uniqueidentifier) = m.user_id
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.team_id = @aktor_team_id
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32))
   AND t.contract_role = @aktor_rolle
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2))
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- Det kommandoene leser: aktøren, siden og teamet når konteksten gir
-- handlingsrett i prosjektet. Ingen rad ellers.
CREATE FUNCTION koe_sikkerhet.handlende()
RETURNS TABLE AS RETURN
SELECT m.project_id AS prosjekt_id,
       LOWER(CONVERT(nvarchar(36), m.user_id)) AS aktor_id,
       t.contract_role AS side,
       t.team_id AS team_id
  FROM koe.app_project_memberships m
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(100))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(32))
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(2))
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- Uforanderlighet: journalen, dokumentene og alle deler av et brev endres og
-- slettes aldri, heller ikke av eieren. TRUNCATE avfyrer ingen trigger; den
-- krever ALTER på tabellen, som runtime ikke har.
DECLARE @tabell sysname, @sql nvarchar(max);
DECLARE t CURSOR LOCAL FAST_FORWARD FOR
  SELECT s.name + N'.' + o.name
    FROM sys.tables o JOIN sys.schemas s ON s.schema_id = o.schema_id
   WHERE s.name IN (N'form_a', N'form_b') AND o.name <> N'felt';
OPEN t;
FETCH NEXT FROM t INTO @tabell;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'CREATE TRIGGER ' + @tabell + N'_uforanderlig ON ' + @tabell
    + N' INSTEAD OF UPDATE, DELETE AS BEGIN SET NOCOUNT ON; '
    + N'THROW 51001, N''Et lagret brev endres ikke'', 1; END';
  EXEC (@sql);
  FETCH NEXT FROM t INTO @tabell;
END
CLOSE t;
DEALLOCATE t;
GO

-- Ingen del kan legges til et ferdig brev: en del godtas bare i transaksjonen
-- som skrev dokumentraden. Raden må være synlig (RLS) og ha samme
-- transaksjon; ellers avvises delen, også for eieren uten kontekst.
--
-- RLS filtrerer også `inserted` i triggeren. Uten kontekst ville
-- `IF EXISTS (SELECT … FROM inserted …)` sett null rader og sluppet alt
-- gjennom. Triggeren teller derfor de godkjente radene og sammenlikner med
-- ROWCOUNT_BIG() for setningen, som RLS ikke påvirker.
CREATE TABLE #deler (skjema sysname, tabell sysname, forelder sysname);
INSERT #deler VALUES
  (N'form_a', N'krav', N'form_a.hendelse'), (N'form_a', N'svar', N'form_a.hendelse'),
  (N'form_a', N'utsagn', N'form_a.hendelse'), (N'form_a', N'leveringsoppdrag', N'form_a.hendelse'),
  (N'form_b', N'sak_opprettet', N'form_b.dokument'), (N'form_b', N'krav', N'form_b.dokument'),
  (N'form_b', N'svar', N'form_b.dokument'), (N'form_b', N'standpunkt', N'form_b.dokument'),
  (N'form_b', N'virkning', N'form_b.dokument'), (N'form_b', N'utsagn', N'form_b.dokument'),
  (N'form_b', N'opplysning', N'form_b.dokument'), (N'form_b', N'dokumentasjon', N'form_b.dokument'),
  (N'form_b', N'leveringsdokument', N'form_b.dokument');
DECLARE @skjema sysname, @tabell sysname, @forelder sysname, @sql nvarchar(max);
DECLARE d CURSOR LOCAL FAST_FORWARD FOR SELECT skjema, tabell, forelder FROM #deler;
OPEN d;
FETCH NEXT FROM d INTO @skjema, @tabell, @forelder;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @sql = N'CREATE TRIGGER ' + @skjema + N'.' + @tabell + N'_samme_transaksjon ON '
    + @skjema + N'.' + @tabell + N' AFTER INSERT AS BEGIN '
    + N'DECLARE @rader bigint = ROWCOUNT_BIG(); SET NOCOUNT ON; '
    + N'IF @rader <> (SELECT COUNT_BIG(*) FROM inserted i WHERE EXISTS (SELECT 1 FROM ' + @forelder
    + N' f WHERE f.event_id = i.event_id AND f.prosjekt_id = i.prosjekt_id'
    + N' AND f.transaksjon = CURRENT_TRANSACTION_ID())) '
    + N'THROW 51002, N''En del kan ikke legges til et lagret brev'', 1; END';
  EXEC (@sql);
  FETCH NEXT FROM d INTO @skjema, @tabell, @forelder;
END
CLOSE d;
DEALLOCATE d;
DROP TABLE #deler;
GO

CREATE TRIGGER koe.sak_metadata_uforanderlig ON koe.sak_metadata INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'Saken flyttes og slettes ikke', 1;
END
GO
