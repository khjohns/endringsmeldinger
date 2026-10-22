-- Prosjektgrensen og kvitteringen uten kontraktssiden (#1106). Lesefilteret krever siden
-- (#1056), så kontrollen av sakene det vises til, avgjorde siden før prosjektgrensen, og
-- innboksen leste kvitteringen med siden TE før forfatterens side var avgjort.
--
-- To prosedyrer kjører som en egen bruker uten innlogging, `koe_grenseoppslag`, og
-- filterpredikatene på `koe.sak_metadata` og `koe.kvittering` slipper den gjennom for
-- prosjektet i konteksten når aktøren i konteksten er et aktivt medlem, med eller uten
-- side. Ingen annen vei kan bli den brukeren uten IMPERSONATE, som for `koe_jobbkjoerer`
-- (`20261018100000_jobber.sql`), og kjøretiden har bare EXECUTE på de to prosedyrene.
-- Prosjektet og aktøren tas fra konteksten, aldri fra kalleren.

CREATE USER koe_grenseoppslag WITHOUT LOGIN;
GO

CREATE FUNCTION koe_sikkerhet.grenseoppslag(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
 WHERE USER_NAME() = N'koe_grenseoppslag'
   AND m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(m.project_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

CREATE FUNCTION koe_sikkerhet.sak_synlig_eller_grenseoppslag(@prosjekt_id nvarchar(100), @sak_id nvarchar(36))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.sak_synlig(@prosjekt_id, @sak_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.grenseoppslag(@prosjekt_id);
GO

CREATE FUNCTION koe_sikkerhet.medlem_eller_grenseoppslag(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT tilgang FROM koe_sikkerhet.medlem(@prosjekt_id)
UNION ALL
SELECT tilgang FROM koe_sikkerhet.grenseoppslag(@prosjekt_id);
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  DROP FILTER PREDICATE ON koe.sak_metadata,
  DROP FILTER PREDICATE ON koe.kvittering;
GO

ALTER SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.sak_synlig_eller_grenseoppslag(prosjekt_id, sak_id) ON koe.sak_metadata,
  ADD FILTER PREDICATE koe_sikkerhet.medlem_eller_grenseoppslag(prosjekt_id) ON koe.kvittering;
GO

-- Sakene blant @saker (en JSON-liste) som er i prosjektet i konteksten, uavhengig av siden.
-- Serveren sammenlikner ID-ene eksakt, så likhet med mellomrom til slutt gir ikke en sak.
CREATE PROCEDURE koe_api.saker_i_prosjektet
  @saker nvarchar(max)
WITH EXECUTE AS N'koe_grenseoppslag'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Oppslaget kjøres bare i en transaksjon med konteksten satt', 1;
  IF ISJSON(@saker) = 0
    THROW 51422, N'Sakene er ikke en JSON-liste', 1;
  SELECT s.sak_id, s.prosjekt_id
    FROM koe.sak_metadata s
   WHERE s.sak_id IN (SELECT [value] FROM OPENJSON(@saker))
     AND s.prosjekt_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000));
END
GO

-- Saken fra kvitteringen for kommandoen til aktøren i prosjektet, uavhengig av siden
-- (#963), med samme lås og samme avvisning av en annen sum som `koe_api.kvittering`
-- (`20261020110000_laasfeil.sql`).
CREATE PROCEDURE koe_api.kvittert_sak
  @kommando_id nvarchar(4000), @kommando_sha256 nvarchar(4000),
  @sak_id nvarchar(36) OUTPUT
WITH EXECUTE AS N'koe_grenseoppslag'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @@TRANCOUNT = 0 OR TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) IS DISTINCT FROM CURRENT_TRANSACTION_ID()
    THROW 51000, N'Kommandoen kjøres bare i en transaksjon med konteksten satt', 1;
  IF koe.er_uuid(@kommando_id) = 0
    THROW 51422, N'Kommando-ID-en mangler eller er ikke en UUID med små bokstaver', 1;
  IF koe.er_hash(@kommando_sha256) = 0
    THROW 51422, N'Summen for kommandoen er ikke 64 små heksadesimale tegn', 1;
  DECLARE @prosjekt nvarchar(4000) = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)),
          @aktor uniqueidentifier = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier);
  IF @prosjekt IS NULL OR @aktor IS NULL
    THROW 51403, N'Ingen tilgang', 1;
  DECLARE @ressurs nvarchar(255) = N'koe.kvittering:' + CONVERT(nvarchar(64),
    HASHBYTES('SHA2_256', CONCAT(@prosjekt, NCHAR(0), CONVERT(nvarchar(36), @aktor), NCHAR(0), @kommando_id)), 2);
  DECLARE @laas int;
  EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
  IF @laas IN (-1, -2, -3)
    THROW 51408, N'Låsen på kvitteringen ble ikke gitt', 1;
  IF @laas < 0
    THROW 51407, N'Kallet på låsen for kvitteringen feilet', 1;
  DECLARE @sum nvarchar(64);
  SELECT @sum = k.kommando_sha256, @sak_id = k.sak_id
    FROM koe.kvittering k
   WHERE k.prosjekt_id = @prosjekt AND k.aktor_id = @aktor AND k.kommando_id = @kommando_id;
  IF @sum IS NOT NULL AND @sum <> @kommando_sha256
    THROW 51410, N'Kommando-ID-en er brukt for en annen kommando', 1;
END
GO

GRANT EXECUTE ON koe_api.saker_i_prosjektet TO koe_runtime;
GRANT EXECUTE ON koe_api.kvittert_sak TO koe_runtime;
GO
