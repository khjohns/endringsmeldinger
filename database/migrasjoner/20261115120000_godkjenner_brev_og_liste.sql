-- Godkjenneren leser brevene og vedleggene i saken, og finner pakkene som venter (del 4 av
-- #831, arbeidsvalgene G1 og G2 15.11).
--
-- G1: godkjenneren i en åpen pakke i saken leser kravene, svarene, de sendte brevene og
-- vedleggene i saken (GFK-U9, DL-U15). Til nå slapp `sak_synlig` godkjenneren til saken og
-- journalen, men ikke til leveringsoppdragene, kvitteringene for leveringen og vedleggene.
-- Et vedlegg som ikke er bundet til en hendelse, er et utkast og forblir teamets.
--
-- G2: listen over pakkene der aktøren står i kjeden, på tvers av prosjektene. Den leses av
-- `koe_api.ventende_pakker`, som kjører som brukeren `koe_godkjenneroppslag` uten
-- innlogging. Predikatene på pakken, stegene og handlingene slipper den brukeren gjennom,
-- og prosedyren filtrerer selv på aktøren den får og på at pakken er åpen. Ingen annen vei
-- kan bli den brukeren uten IMPERSONATE, som for `koe_grenseoppslag`
-- (`20261022190000_grenseoppslag.sql`), og kjøretiden har bare EXECUTE på prosedyren.

CREATE USER koe_godkjenneroppslag WITHOUT LOGIN;
GO

-- Aktøren i konteksten er godkjenner i en åpen pakke i saken, som i `sak_synlig`.
CREATE FUNCTION koe_sikkerhet.godkjenner_i_sak(@prosjekt_id nvarchar(100), @sak_id nvarchar(36))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT g.tilgang
  FROM koe.godkjenningspakke p
 CROSS APPLY koe_sikkerhet.godkjenner(p.prosjekt_id, p.pakke_id) g
 WHERE p.sak_id = @sak_id
   AND DATALENGTH(p.sak_id) = DATALENGTH(@sak_id)
   AND p.prosjekt_id = @prosjekt_id;
GO

CREATE FUNCTION koe_sikkerhet.oppdrag_synlig(@prosjekt_id nvarchar(100), @sak_id nvarchar(36))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.jobbkjoerer_eller_medlem(@prosjekt_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.godkjenner_i_sak(@prosjekt_id, @sak_id);
GO

CREATE FUNCTION koe_sikkerhet.leveringskvittering_synlig(
  @prosjekt_id nvarchar(100), @leveringsoppdrag_id uniqueidentifier)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.jobbkjoerer_eller_medlem(@prosjekt_id)
UNION ALL
SELECT g.tilgang
  FROM koe.leveringsoppdrag o
 CROSS APPLY koe_sikkerhet.godkjenner_i_sak(o.prosjekt_id, o.sak_id) g
 WHERE o.id = @leveringsoppdrag_id
   AND o.prosjekt_id = @prosjekt_id;
GO

-- Bare et vedlegg som er bundet til en hendelse, er sendt; utkastene er teamets.
CREATE FUNCTION koe_sikkerhet.vedlegg_synlig_for_godkjenner(
  @prosjekt_id nvarchar(100), @lastet_opp_team nvarchar(32), @bundet_av_event_id nvarchar(36),
  @sak_id nvarchar(36))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.vedlegg_synlig(@prosjekt_id, @lastet_opp_team, @bundet_av_event_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.godkjenner_i_sak(@prosjekt_id, @sak_id)
 WHERE @bundet_av_event_id IS NOT NULL;
GO

-- Brukeren bak `koe_api.ventende_pakker`, og bare for en pakke i et aktivt prosjekt.
CREATE FUNCTION koe_sikkerhet.godkjenneroppslag(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.projects p
 WHERE USER_NAME() = N'koe_godkjenneroppslag'
   AND p.id = @prosjekt_id
   AND p.is_active = 1;
GO

CREATE FUNCTION koe_sikkerhet.pakke_synlig_eller_oppslag(
  @prosjekt_id nvarchar(100), @aktor_team_id nvarchar(32), @pakke_id uniqueidentifier)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.pakke_synlig(@prosjekt_id, @aktor_team_id, @pakke_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.godkjenneroppslag(@prosjekt_id);
GO

CREATE FUNCTION koe_sikkerhet.handling_synlig_eller_oppslag(
  @prosjekt_id nvarchar(100), @aktor_team_id nvarchar(32), @pakke_id uniqueidentifier,
  @aktor_id uniqueidentifier)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.handling_synlig(@prosjekt_id, @aktor_team_id, @pakke_id, @aktor_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.godkjenneroppslag(@prosjekt_id);
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  DROP FILTER PREDICATE ON koe.leveringsoppdrag,
  DROP FILTER PREDICATE ON koe.leveringskvittering,
  DROP FILTER PREDICATE ON koe.vedlegg,
  DROP FILTER PREDICATE ON koe.godkjenningspakke,
  DROP FILTER PREDICATE ON koe.godkjenningssteg,
  DROP FILTER PREDICATE ON koe.godkjenningshandling;
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.oppdrag_synlig(prosjekt_id, sak_id) ON koe.leveringsoppdrag,
  ADD FILTER PREDICATE koe_sikkerhet.leveringskvittering_synlig(prosjekt_id, leveringsoppdrag_id)
    ON koe.leveringskvittering,
  ADD FILTER PREDICATE koe_sikkerhet.vedlegg_synlig_for_godkjenner(
    prosjekt_id, lastet_opp_team, bundet_av_event_id, sak_id) ON koe.vedlegg,
  ADD FILTER PREDICATE koe_sikkerhet.pakke_synlig_eller_oppslag(prosjekt_id, aktor_team_id, pakke_id)
    ON koe.godkjenningspakke,
  ADD FILTER PREDICATE koe_sikkerhet.pakke_synlig_eller_oppslag(prosjekt_id, aktor_team_id, pakke_id)
    ON koe.godkjenningssteg,
  ADD FILTER PREDICATE koe_sikkerhet.handling_synlig_eller_oppslag(
    prosjekt_id, aktor_team_id, pakke_id, aktor_id) ON koe.godkjenningshandling;
GO

-- De åpne pakkene der @aktor står i et steg, på tvers av prosjektene (G2). En pakke er åpen
-- når den verken er returnert eller trukket og minst ett steg ikke er godkjent, som i
-- `koe_sikkerhet.godkjenner`. `venter_paa_deg` er 1 når det første steget uten godkjenning er
-- aktørens. Raden har bare saken, prosjektet og pakken.
CREATE PROCEDURE koe_api.ventende_pakker
  @aktor uniqueidentifier
WITH EXECUTE AS N'koe_godkjenneroppslag'
AS
BEGIN
  SET NOCOUNT ON;
  IF @aktor IS NULL
    THROW 51403, N'Ingen aktør', 1;
  WITH egne AS (
    SELECT s.pakke_id, s.steg,
           (SELECT MIN(u.steg) FROM koe.godkjenningssteg u
             WHERE u.pakke_id = s.pakke_id
               AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                                WHERE h.pakke_id = u.pakke_id AND h.steg = u.steg
                                  AND h.handling = N'godkjent')) AS ventende_steg
      FROM koe.godkjenningssteg s
     WHERE s.godkjenner_id = @aktor
       AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                        WHERE h.pakke_id = s.pakke_id AND h.handling <> N'godkjent')
  )
  SELECT LOWER(CONVERT(nvarchar(36), p.pakke_id)) AS pakke_id, p.prosjekt_id, pr.name AS prosjektnavn,
         p.sak_id, p.opprettet, e.steg,
         CAST(IIF(e.steg = e.ventende_steg, 1, 0) AS bit) AS venter_paa_deg
    FROM egne e
    JOIN koe.godkjenningspakke p ON p.pakke_id = e.pakke_id
    JOIN koe.projects pr ON pr.id = p.prosjekt_id AND pr.is_active = 1
   WHERE e.ventende_steg IS NOT NULL
   ORDER BY p.opprettet, p.pakke_id;
END
GO

-- Om aktøren i konteksten står i et steg i pakken i prosjektet i konteksten, også når pakken
-- er lukket og skjult for godkjenneren. Inngangen viser da en pakke som er lukket mens
-- godkjenneren hadde den, som lukket og ikke som manglende tilgang (kravet 20.10 i #831,
-- punkt 2). Gir bare 1 eller ingen rad.
CREATE PROCEDURE koe_api.godkjenner_i_pakken
  @pakke_id uniqueidentifier
WITH EXECUTE AS N'koe_godkjenneroppslag'
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Oppslaget kjøres bare i en transaksjon med konteksten satt', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  IF @prosjekt IS NULL OR @aktor IS NULL
    THROW 51403, N'Ingen tilgang', 1;
  SELECT TOP (1) 1 AS i_kjeden
    FROM koe.godkjenningssteg s
   WHERE s.pakke_id = @pakke_id
     AND s.godkjenner_id = @aktor
     AND s.prosjekt_id = @prosjekt
     AND DATALENGTH(s.prosjekt_id) = DATALENGTH(@prosjekt);
END
GO

-- Prosjektets team for totalentreprenøren for et aktivt medlem, også med leserollen.
-- `koe_api.kontraktsteam` gir ingen rader med leserollen, men godkjennerinngangen må avvise
-- et medlem i et TE-team uansett rolle (kravet 20.10 i #831, punkt 1).
CREATE PROCEDURE koe_api.te_team
  @aktor uniqueidentifier,
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  SELECT t.team_id AS team
    FROM koe.catenda_contract_teams t
    JOIN koe.app_project_memberships m ON m.project_id = t.internal_project_id
   WHERE t.internal_project_id = @prosjekt
     AND t.contract_role = N'TE'
     AND m.user_id = @aktor AND m.active = 1;
END
GO

GRANT EXECUTE ON koe_api.ventende_pakker TO koe_runtime;
GRANT EXECUTE ON koe_api.godkjenner_i_pakken TO koe_runtime;
GRANT EXECUTE ON koe_api.te_team TO koe_runtime;
GO
