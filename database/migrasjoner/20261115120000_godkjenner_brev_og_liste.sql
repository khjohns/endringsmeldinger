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
  WITH aapen AS (
    SELECT p.pakke_id, p.prosjekt_id, p.sak_id, p.opprettet,
           (SELECT MIN(u.steg) FROM koe.godkjenningssteg u
             WHERE u.pakke_id = p.pakke_id
               AND NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                                WHERE h.pakke_id = u.pakke_id AND h.steg = u.steg
                                  AND h.handling = N'godkjent')) AS ventende_steg
      FROM koe.godkjenningspakke p
     WHERE NOT EXISTS (SELECT 1 FROM koe.godkjenningshandling h
                        WHERE h.pakke_id = p.pakke_id AND h.handling <> N'godkjent')
  )
  SELECT LOWER(CONVERT(nvarchar(36), a.pakke_id)) AS pakke_id, a.prosjekt_id, pr.name AS prosjektnavn,
         a.sak_id, a.opprettet, s.steg,
         CAST(IIF(s.steg = a.ventende_steg, 1, 0) AS bit) AS venter_paa_deg
    FROM aapen a
    JOIN koe.godkjenningssteg s ON s.pakke_id = a.pakke_id AND s.godkjenner_id = @aktor
    JOIN koe.projects pr ON pr.id = a.prosjekt_id AND pr.is_active = 1
   WHERE a.ventende_steg IS NOT NULL
   ORDER BY a.opprettet, a.pakke_id;
END
GO

GRANT EXECUTE ON koe_api.ventende_pakker TO koe_runtime;
GO
