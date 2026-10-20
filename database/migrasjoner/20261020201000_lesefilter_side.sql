-- Lesefilteret krever siden (#1056, del 2). Til nå slapp `medlem` gjennom hvert aktivt
-- medlem av prosjektet, så et medlem uten kontraktsteam leste sakene i basen, selv om
-- serveren nektet det (del 1, #1070). Nå leser et medlem med en side i konteksten som
-- prosjektet har et kontraktsteam på, eller med leserollen (DL-U15). Står teamet i
-- konteksten, må det være et av prosjektets team på den siden; uten team er siden
-- entydig, som i `skriver` (DL-U4).
--
-- Skrivingen og vedleggene krever siden uten leserollen: `kontraktsmedlem`.
-- Leserollen leser ikke vedlegg (oppdragsgiver 20.10: «Nei, team kreves»).
--
-- Predikatene binder `medlem` og funksjonene som bruker den, så de tas ut av
-- policyen, funksjonene lages på nytt og predikatene legges på igjen.

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  DROP FILTER PREDICATE ON koe.sak_metadata,
  DROP FILTER PREDICATE ON koe.hendelse,
  DROP FILTER PREDICATE ON koe.kjernebuffer,
  DROP BLOCK PREDICATE ON koe.kjernebuffer AFTER INSERT,
  DROP BLOCK PREDICATE ON koe.kjernebuffer AFTER UPDATE,
  DROP FILTER PREDICATE ON koe.kvittering,
  DROP BLOCK PREDICATE ON koe.kvittering AFTER INSERT,
  DROP FILTER PREDICATE ON koe.leveringsoppdrag,
  DROP BLOCK PREDICATE ON koe.leveringsoppdrag AFTER INSERT,
  DROP FILTER PREDICATE ON koe.jobb,
  DROP BLOCK PREDICATE ON koe.jobb AFTER INSERT,
  DROP FILTER PREDICATE ON koe.sak_catenda_topic,
  DROP FILTER PREDICATE ON koe.leveringskvittering,
  DROP FILTER PREDICATE ON koe.brevdokument,
  DROP FILTER PREDICATE ON koe.vedleggskvittering,
  DROP FILTER PREDICATE ON koe.vedlegg;
GO

DROP FUNCTION koe_sikkerhet.sak_synlig;
DROP FUNCTION koe_sikkerhet.jobbkjoerer_eller_medlem;
DROP FUNCTION koe_sikkerhet.vedlegg_synlig;
GO

CREATE FUNCTION koe_sikkerhet.kontraktsmedlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(m.project_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1 AND m.viewer_override = 0
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID()
   AND EXISTS (
     SELECT 1 FROM koe.catenda_contract_teams t
      WHERE t.internal_project_id = m.project_id
        AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000))
        AND DATALENGTH(t.contract_role) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)))
        AND ((t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000))
              AND DATALENGTH(t.team_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000))))
             OR SESSION_CONTEXT(N'koe_team') IS NULL));
GO

ALTER FUNCTION koe_sikkerhet.medlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.kontraktsmedlem(@prosjekt_id)
UNION ALL
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(m.project_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1 AND m.viewer_override = 1
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

-- Som i `20261020190000_godkjenner_tilgang.sql`.
CREATE FUNCTION koe_sikkerhet.sak_synlig(@prosjekt_id nvarchar(100), @sak_id nvarchar(36))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.medlem(@prosjekt_id)
UNION ALL
SELECT g.tilgang
  FROM koe.godkjenningspakke p
 CROSS APPLY koe_sikkerhet.godkjenner(p.prosjekt_id, p.pakke_id) g
 WHERE p.sak_id = @sak_id
   AND DATALENGTH(p.sak_id) = DATALENGTH(@sak_id)
   AND p.prosjekt_id = @prosjekt_id;
GO

-- Som i `20261018100000_jobber.sql`.
CREATE FUNCTION koe_sikkerhet.jobbkjoerer_eller_medlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.jobbkjoerer(@prosjekt_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.medlem(@prosjekt_id);
GO

-- Jobben legges inn av opprettelsen, med siden i konteksten, og av kjøreveien.
CREATE FUNCTION koe_sikkerhet.jobbkjoerer_eller_kontraktsmedlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.jobbkjoerer(@prosjekt_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.kontraktsmedlem(@prosjekt_id);
GO

-- Som i `20261018193000_vedlegg.sql`, med `kontraktsmedlem` for et bundet vedlegg.
CREATE FUNCTION koe_sikkerhet.vedlegg_synlig(
  @prosjekt_id nvarchar(100), @lastet_opp_team nvarchar(32), @bundet_av_event_id nvarchar(36))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.notat_synlig(@prosjekt_id, @lastet_opp_team)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.kontraktsmedlem(@prosjekt_id)
 WHERE @bundet_av_event_id IS NOT NULL
UNION ALL
SELECT tilgang FROM koe_sikkerhet.jobbkjoerer(@prosjekt_id) WHERE @bundet_av_event_id IS NOT NULL;
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.sak_synlig(prosjekt_id, sak_id) ON koe.sak_metadata,
  ADD FILTER PREDICATE koe_sikkerhet.sak_synlig(prosjekt_id, sak_id) ON koe.hendelse,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kjernebuffer,
  ADD BLOCK PREDICATE koe_sikkerhet.kontraktsmedlem(prosjekt_id) ON koe.kjernebuffer AFTER INSERT,
  ADD BLOCK PREDICATE koe_sikkerhet.kontraktsmedlem(prosjekt_id) ON koe.kjernebuffer AFTER UPDATE,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kvittering,
  ADD BLOCK PREDICATE koe_sikkerhet.kontraktsmedlem(prosjekt_id) ON koe.kvittering AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.leveringsoppdrag,
  ADD BLOCK PREDICATE koe_sikkerhet.kontraktsmedlem(prosjekt_id) ON koe.leveringsoppdrag AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.jobb,
  ADD BLOCK PREDICATE koe_sikkerhet.jobbkjoerer_eller_kontraktsmedlem(prosjekt_id) ON koe.jobb AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.sak_catenda_topic,
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.leveringskvittering,
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.brevdokument,
  ADD FILTER PREDICATE koe_sikkerhet.jobbkjoerer_eller_medlem(prosjekt_id) ON koe.vedleggskvittering,
  ADD FILTER PREDICATE koe_sikkerhet.vedlegg_synlig(prosjekt_id, lastet_opp_team, bundet_av_event_id) ON koe.vedlegg;
GO
