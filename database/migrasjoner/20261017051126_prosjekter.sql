-- Prosjektene for `server/prosjekter.ts` (F0b-6, #660), med samme utvalg som
-- `list_projects` og `get_project` i `backend/routes/project_routes.py`.
-- Kjøretiden har ingen rett på `koe.projects`; prosedyrene leser det gjennom
-- eierskapskjeden, og bare prosjekter der aktøren har et aktivt medlemskap.
--
-- `settings` og `created_by` fra PostgreSQL har ingen kolonne i `koe.projects`;
-- serveren svarer med `{}` og `null` (#660).

-- Prosjektene i lista: aktivt medlemskap, aktiv kobling til Catenda og aktivt
-- prosjekt, som `AuthService.user_projects` og `list_active` i Python.
-- Medlemskapet kan endres av synkroniseringen, så serveren leser lista igjen
-- etter den.
CREATE PROCEDURE koe_api.brukerens_prosjekter
  @aktor uniqueidentifier
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.id, p.organisasjon_id, p.name, p.description, p.created_at, p.is_active
    FROM koe.projects p
    JOIN koe.app_project_memberships m ON m.project_id = p.id
    JOIN koe.catenda_project_configs c ON c.internal_project_id = p.id
   WHERE m.user_id = @aktor AND m.active = 1 AND c.is_active = 1 AND p.is_active = 1
   ORDER BY p.name, p.id;
END
GO

-- Ett prosjekt, for en aktør med aktivt medlemskap i det. Tilgangen er avgjort
-- av serveren før kallet; medlemskapet her er et vern til.
CREATE PROCEDURE koe_api.prosjekt
  @aktor uniqueidentifier,
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  SELECT p.id, p.organisasjon_id, p.name, p.description, p.created_at, p.is_active
    FROM koe.projects p
    JOIN koe.app_project_memberships m ON m.project_id = p.id
   WHERE p.id = @prosjekt AND m.user_id = @aktor AND m.active = 1;
END
GO

GRANT EXECUTE ON koe_api.brukerens_prosjekter TO koe_runtime;
GRANT EXECUTE ON koe_api.prosjekt TO koe_runtime;
