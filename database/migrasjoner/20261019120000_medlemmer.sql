-- Medlemsinngangene i `server/prosjekter.ts` (F-1a, #820), med samme utvalg som
-- `list_members` og `limit_member` i `backend/routes/membership_routes.py`.
-- Kjøretiden har ingen rett på `koe.app_project_memberships`; prosedyrene leser
-- og skriver gjennom eierskapskjeden. Tilgangen er avgjort av serveren før
-- kallet; kontrollen av aktøren her er et vern til.
--
-- Medlemskapet har ingen egen ID i SQL Server; et medlem i prosjektet er
-- brukeren (`user_id`).

-- De aktive medlemmene, for en aktør med aktivt medlemskap i prosjektet.
CREATE PROCEDURE koe_api.medlemmer
  @aktor uniqueidentifier,
  @prosjekt nvarchar(4000)
AS
BEGIN
  SET NOCOUNT ON;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  -- Kontrollen står i utvalget, så svaret alltid har et resultatsett, også tomt.
  SELECT m.project_id, m.user_id, m.catenda_subject, m.user_email, m.display_name, m.role,
         m.viewer_override, m.created_at, m.updated_at
    FROM koe.app_project_memberships m
   WHERE m.project_id = @prosjekt AND m.active = 1
     AND EXISTS (SELECT 1 FROM koe.app_project_memberships a
                  WHERE a.project_id = @prosjekt AND a.user_id = @aktor AND a.active = 1)
   ORDER BY m.display_name, m.user_id;
END
GO

-- Setter leserollen (`viewer_override`) for et aktivt medlem. Aktøren må være
-- aktiv admin uten leserolle, og kan ikke endre sitt eget medlemskap, som i
-- Python. `@endret` er 0 når en av delene ikke holder; da endres ingenting.
-- Applåsen er den samme som synkroniseringens, så endringen ikke flettes inn i
-- en liste som skrives.
CREATE PROCEDURE koe_api.sett_leserolle
  @aktor uniqueidentifier,
  @prosjekt nvarchar(4000),
  @medlem uniqueidentifier,
  @leserolle bit,
  @endret bit OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  SET @endret = 0;
  IF @prosjekt IS NULL OR LEN(@prosjekt) = 0 OR DATALENGTH(@prosjekt) > 200
     OR DATALENGTH(@prosjekt) <> DATALENGTH(RTRIM(@prosjekt))
    THROW 52043, N'Prosjekt-ID-en er tom, for lang eller har mellomrom til slutt', 1;
  IF @aktor IS NULL OR @medlem IS NULL OR @leserolle IS NULL OR @medlem = @aktor
    RETURN;

  BEGIN TRANSACTION;
  DECLARE @ressurs nvarchar(255) = CONCAT(N'koe.medlemskap:', @prosjekt), @laas int;
  EXEC @laas = sp_getapplock @Resource = @ressurs, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
  IF @laas < 0
    THROW 52044, N'Fikk ikke låsen for medlemskapet i prosjektet', 1;

  IF EXISTS (SELECT 1 FROM koe.app_project_memberships
              WHERE project_id = @prosjekt AND user_id = @aktor AND active = 1
                AND role = N'admin' AND viewer_override = 0)
  BEGIN
    UPDATE koe.app_project_memberships
       SET viewer_override = @leserolle, updated_at = SYSUTCDATETIME()
     WHERE project_id = @prosjekt AND user_id = @medlem AND active = 1;
    SET @endret = CASE WHEN @@ROWCOUNT = 1 THEN 1 ELSE 0 END;
  END
  COMMIT;
END
GO

GRANT EXECUTE ON koe_api.medlemmer TO koe_runtime;
GRANT EXECUTE ON koe_api.sett_leserolle TO koe_runtime;
GO
