-- Tilgangsoppslagene for `server/autorisasjon.ts` (#658). Kjøretiden har ingen
-- rett på koblingen, medlemskapet eller kontraktsteamene; de tre prosedyrene
-- under leser dem gjennom eierskapskjeden. Hver tar prosjektet som parameter og
-- leser bare det prosjektet. Medlemskapet og kontraktsteamene leses bare for
-- aktøren som spør. Om saken er i prosjektet, leser serveren i `koe.sak_metadata`
-- under radsikkerheten, med aktøren og prosjektet i konteksten.
--
-- Prosjekt-ID-en kontrolleres som i `koe_api.medlemsliste_alder` (52043):
-- sammenlikningen i SQL Server ser bort fra mellomrom til slutt, så `p1 ` ville
-- ellers truffet `p1`.

-- Catenda-prosjektet et prosjekt er koblet til, når koblingen er aktiv
-- (`require_project_access` i `lib/auth/project_access.py`).
CREATE PROCEDURE koe_api.prosjektkobling
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  SELECT catenda_project_id AS catenda_prosjekt
    FROM koe.catenda_project_configs
   WHERE internal_project_id = @prosjekt AND is_active = 1;
END
GO

-- Aktørens aktive medlemskap i prosjektet. Et inaktivt medlemskap gir ingen rad.
CREATE PROCEDURE koe_api.prosjektmedlemskap
  @aktor uniqueidentifier,
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  SELECT role AS rolle, viewer_override AS leserolle, catenda_subject AS subjekt
    FROM koe.app_project_memberships
   WHERE project_id = @prosjekt AND user_id = @aktor AND active = 1;
END
GO

-- Prosjektets kontraktsteam, bare for en aktør med aktivt medlemskap og
-- handlingsrett i prosjektet. Hvilket av dem aktøren er med i, avgjør serveren
-- med Catendas team-API.
CREATE PROCEDURE koe_api.kontraktsteam
  @aktor uniqueidentifier,
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  SELECT t.team_id AS team, t.contract_role AS side
    FROM koe.catenda_contract_teams t
    JOIN koe.app_project_memberships m ON m.project_id = t.internal_project_id
   WHERE t.internal_project_id = @prosjekt
     AND m.user_id = @aktor AND m.active = 1 AND m.viewer_override = 0;
END
GO

GRANT EXECUTE ON koe_api.prosjektkobling TO koe_runtime;
GRANT EXECUTE ON koe_api.prosjektmedlemskap TO koe_runtime;
GRANT EXECUTE ON koe_api.kontraktsteam TO koe_runtime;
