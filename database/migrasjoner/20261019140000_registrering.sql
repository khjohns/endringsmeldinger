-- Registreringen av prosjektet, koblingen til Catenda og kontraktsteamene, for
-- driftsskriptet `server/registrering.ts` (F-1, #820). Som i Python gjøres den av
-- driften med et skript, ikke gjennom en inngang i appen (svaret 18.10 i #820):
-- prosedyrene ligger i `koe_drift`, og bare `koe_driftsrolle` får kjøre dem.
-- Kjøretiden får ingen rett her. Brukeren til rollen hører til utrullingen
-- (A8 og A9 i #78).
--
-- Kontraktsteamene avgjør kontraktssiden (RV-07). Har prosjektet saker, kan de
-- bare få nye team; å flytte et team til den andre siden eller fjerne det
-- avvises (svaret 18.10 i #764, «Runde 8: avgjort 18.10»).
--
-- Radsikkerheten skjuler sakene også for eieren, så prosedyrene kan ikke lese
-- `koe.sak_metadata`. Triggeren `koe.sak_metadata_prosjekt_med_saker` fører
-- derfor prosjektet i `koe.prosjekt_med_saker` i samme transaksjon som den
-- første saken; raden kan ikke endres eller slettes.

CREATE SCHEMA koe_drift;
GO

CREATE ROLE koe_driftsrolle;
GO

CREATE TABLE koe.prosjekt_med_saker (
  prosjekt_id nvarchar(100) NOT NULL CONSTRAINT prosjekt_med_saker_pk PRIMARY KEY
    CONSTRAINT prosjekt_med_saker_prosjekt FOREIGN KEY REFERENCES koe.projects (id)
    CONSTRAINT prosjekt_med_saker_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  created_at datetime2(3) NOT NULL CONSTRAINT prosjekt_med_saker_created_at DEFAULT SYSUTCDATETIME()
);
GO

CREATE TRIGGER koe.prosjekt_med_saker_uforanderlig ON koe.prosjekt_med_saker INSTEAD OF UPDATE, DELETE AS
BEGIN
  SET NOCOUNT ON;
  THROW 51001, N'At prosjektet har saker, endres ikke', 1;
END
GO

-- `inserted` filtreres ikke av radsikkerheten. Låsen gjør at samtidige første
-- saker i samme prosjekt venter på hverandre i stedet for å bryte nøkkelen.
CREATE TRIGGER koe.sak_metadata_prosjekt_med_saker ON koe.sak_metadata AFTER INSERT AS
BEGIN
  SET NOCOUNT ON;
  INSERT koe.prosjekt_med_saker (prosjekt_id)
  SELECT DISTINCT i.prosjekt_id
    FROM inserted i
   WHERE NOT EXISTS (SELECT 1 FROM koe.prosjekt_med_saker p WITH (UPDLOCK, HOLDLOCK)
                      WHERE p.prosjekt_id = i.prosjekt_id);
END
GO

-- Saker lagret før migrasjonen kan ikke leses under radsikkerheten. Har tabellen
-- rader, regnes hvert prosjekt som et prosjekt med saker, så ingen saks
-- kontraktsside kan flyttes.
IF EXISTS (SELECT 1 FROM sys.partitions
            WHERE object_id = OBJECT_ID(N'koe.sak_metadata') AND index_id IN (0, 1) AND rows > 0)
  INSERT koe.prosjekt_med_saker (prosjekt_id) SELECT id FROM koe.projects;
GO

-- Kontraktsteamene i prosjektet, som en JSON-liste av `{team_id, contract_role}`
-- med team-ID-en i `catenda_id()`-formen. Begge sider må ha minst ett team, og
-- et team står på én side. Uten saker erstatter listen teamene; med saker må
-- hvert team som står, stå på samme side i listen.
CREATE PROCEDURE koe_drift.sett_kontraktsteam
  @prosjekt nvarchar(4000),
  @team nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @team IS NULL OR ISJSON(@team, ARRAY) = 0
    THROW 52060, N'Kontraktsteamene er ikke en JSON-liste', 1;
  DECLARE @ny TABLE (team_id nvarchar(4000) NULL, contract_role nvarchar(4000) NULL, type_team int NULL, type_rolle int NULL);
  INSERT @ny (team_id, contract_role, type_team, type_rolle)
  SELECT JSON_VALUE(e.value, N'$.team_id'), JSON_VALUE(e.value, N'$.contract_role'),
         (SELECT type FROM OPENJSON(e.value) WHERE [key] = N'team_id'),
         (SELECT type FROM OPENJSON(e.value) WHERE [key] = N'contract_role')
    FROM OPENJSON(@team) e
   WHERE e.type = 5;
  IF (SELECT COUNT(*) FROM OPENJSON(@team)) <> (SELECT COUNT(*) FROM @ny)
     OR EXISTS (SELECT 1 FROM @ny
                 WHERE type_team IS DISTINCT FROM 1 OR type_rolle IS DISTINCT FROM 1
                    OR DATALENGTH(team_id) <> 64
                    OR team_id COLLATE Latin1_General_100_BIN2_UTF8 LIKE N'%[^0-9a-f]%'
                    OR contract_role COLLATE Latin1_General_100_BIN2_UTF8 NOT IN (N'TE', N'BH'))
    THROW 52060, N'Et kontraktsteam har ikke en normalisert team-ID og siden TE eller BH', 1;
  IF EXISTS (SELECT 1 FROM @ny GROUP BY team_id HAVING COUNT(*) > 1)
    THROW 52061, N'Samme team står mer enn én gang i listen', 1;
  IF NOT EXISTS (SELECT 1 FROM @ny WHERE contract_role = N'TE')
     OR NOT EXISTS (SELECT 1 FROM @ny WHERE contract_role = N'BH')
    THROW 52062, N'Både TE og BH må ha minst ett kontraktsteam', 1;

  BEGIN TRANSACTION;
  IF NOT EXISTS (SELECT 1 FROM koe.catenda_project_configs WITH (UPDLOCK, HOLDLOCK)
                  WHERE internal_project_id = @prosjekt AND is_active = 1)
    THROW 52063, N'Prosjektet har ingen aktiv kobling til Catenda', 1;
  IF EXISTS (SELECT 1 FROM koe.prosjekt_med_saker WITH (UPDLOCK, HOLDLOCK) WHERE prosjekt_id = @prosjekt)
  BEGIN
    IF EXISTS (SELECT 1 FROM koe.catenda_contract_teams t
                WHERE t.internal_project_id = @prosjekt
                  AND NOT EXISTS (SELECT 1 FROM @ny n
                                   WHERE n.team_id = t.team_id AND n.contract_role = t.contract_role))
      THROW 52064, N'Prosjektet har saker: et kontraktsteam kan ikke flyttes til den andre siden eller fjernes', 1;
  END
  ELSE
    DELETE koe.catenda_contract_teams WHERE internal_project_id = @prosjekt;
  INSERT koe.catenda_contract_teams (internal_project_id, team_id, contract_role)
  SELECT @prosjekt, n.team_id, n.contract_role
    FROM @ny n
   WHERE NOT EXISTS (SELECT 1 FROM koe.catenda_contract_teams t
                      WHERE t.internal_project_id = @prosjekt AND t.team_id = n.team_id);
  COMMIT;
END
GO

-- Registrerer prosjektet og koblingen, eller registrerer et prosjekt på nytt, som
-- `koe_register_project` i PostgreSQL: navnet, beskrivelsen og koblingen skrives
-- over, og prosjektet og koblingen blir aktive. Uten `@board` står boardet, men
-- bare når Catenda-prosjektet er det samme; ellers fjernes det. Virksomheten endres ikke ved ny
-- registrering. Endres koblingen, gjør triggeren
-- `koe.catenda_project_configs_kobling_endret` medlemskapene inaktive (DL-U10).
-- Med `@team` settes kontraktsteamene i samme transaksjon.
CREATE PROCEDURE koe_drift.registrer_prosjekt
  @prosjekt nvarchar(4000),
  @navn nvarchar(4000),
  @beskrivelse nvarchar(max),
  @organisasjon nvarchar(4000),
  @catenda_prosjekt uniqueidentifier,
  @bibliotek uniqueidentifier,
  @mappe uniqueidentifier,
  @board uniqueidentifier,
  @team nvarchar(max)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(LTRIM(RTRIM(@prosjekt)))
    THROW 52065, N'Prosjekt-ID-en er tom, for lang eller har mellomrom i endene', 1;
  IF @organisasjon IS NULL OR LEN(@organisasjon) = 0 OR DATALENGTH(@organisasjon) > 200
     OR DATALENGTH(@organisasjon) <> DATALENGTH(LTRIM(RTRIM(@organisasjon)))
    THROW 52065, N'Virksomheten er tom, for lang eller har mellomrom i endene; det finnes ingen standardvirksomhet', 1;
  IF @navn IS NULL OR LEN(@navn) = 0 OR DATALENGTH(@navn) > 800
    THROW 52065, N'Navnet er tomt eller for langt', 1;
  IF @catenda_prosjekt IS NULL OR @bibliotek IS NULL
    THROW 52065, N'Catenda-prosjektet og biblioteket må oppgis', 1;

  BEGIN TRANSACTION;
  IF EXISTS (SELECT 1 FROM koe.projects WITH (UPDLOCK, HOLDLOCK) WHERE id = @prosjekt)
    UPDATE koe.projects
       SET name = @navn, description = ISNULL(@beskrivelse, N'Prosjekt ' + @navn), is_active = 1
     WHERE id = @prosjekt;
  ELSE
    INSERT koe.projects (id, name, description, organisasjon_id, is_active)
    VALUES (@prosjekt, @navn, ISNULL(@beskrivelse, N'Prosjekt ' + @navn), @organisasjon, 1);

  IF EXISTS (SELECT 1 FROM koe.catenda_project_configs WITH (UPDLOCK, HOLDLOCK) WHERE internal_project_id = @prosjekt)
    UPDATE koe.catenda_project_configs
       SET catenda_project_id = @catenda_prosjekt, library_id = @bibliotek, folder_id = @mappe,
           topic_board_id = CASE WHEN @board IS NOT NULL THEN @board
                                 WHEN catenda_project_id = @catenda_prosjekt THEN topic_board_id END,
           is_active = 1
     WHERE internal_project_id = @prosjekt;
  ELSE
    INSERT koe.catenda_project_configs (internal_project_id, catenda_project_id, library_id, folder_id, topic_board_id, is_active)
    VALUES (@prosjekt, @catenda_prosjekt, @bibliotek, @mappe, @board, 1);

  IF @team IS NOT NULL
    EXEC koe_drift.sett_kontraktsteam @prosjekt, @team;
  COMMIT;
END
GO

-- Koblingen og kontraktsteamene i prosjektet, for skriptet: koblingen trengs for
-- å kontrollere teamene mot Catenda, og teamene vises.
CREATE PROCEDURE koe_drift.kontraktsteam
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT LOWER(CONVERT(nvarchar(36), c.catenda_project_id)) AS catenda_project_id, c.is_active,
         CAST(CASE WHEN EXISTS (SELECT 1 FROM koe.prosjekt_med_saker s WHERE s.prosjekt_id = c.internal_project_id)
                   THEN 1 ELSE 0 END AS bit) AS har_saker
    FROM koe.catenda_project_configs c
   WHERE c.internal_project_id = @prosjekt;
  SELECT team_id, contract_role
    FROM koe.catenda_contract_teams
   WHERE internal_project_id = @prosjekt
   ORDER BY contract_role, team_id;
END
GO

GRANT EXECUTE ON koe_drift.sett_kontraktsteam TO koe_driftsrolle;
GRANT EXECUTE ON koe_drift.registrer_prosjekt TO koe_driftsrolle;
GRANT EXECUTE ON koe_drift.kontraktsteam TO koe_driftsrolle;
