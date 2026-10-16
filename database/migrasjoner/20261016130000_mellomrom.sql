-- Mellomrom til slutt i nøkler, ID-er og kontekst (#566, #581). `=`, `IN`, `<>`,
-- `UNIQUE` og fremmednøkler i SQL Server ser bort fra mellomrom til slutt, også
-- med den binære sorteringen, og `LEN` teller dem ikke. `p1 ` treffer da `p1`,
-- og en andre verdiform kan lagres i journalen og aldri rettes.
--
-- Kontrollen er den samme overalt: `DATALENGTH(kol) = DATALENGTH(RTRIM(kol))`.
-- `RTRIM` fjerner bare mellomrom (U+0020), som er det `=` ser bort fra.
-- Kolonnene med fast form (subjektet og teamet i `catenda_id()`-formen,
-- `event_id`, summen) har kontrollen alt. `sak_id` i journalen, notatet,
-- oppdraget og bufferen er nvarchar(36) med fremmednøkkel til saken, som nå har
-- 36 tegn: en verdi med mellomrom til slutt kan ikke svare til en sak.
-- Siden i journalen og notatet er nvarchar(2), så `TE ` lagres som `TE`.
--
-- Predikatene sammenlikner konteksten med lik `DATALENGTH` i tillegg til `=`,
-- som identitetsmigrasjonen gjør for issueren. Policyen binder dem, så den tas
-- ned og legges på igjen her, med de samme predikatene som i
-- `20261016110000_tilgang.sql`.

ALTER TABLE koe.app_identities ADD
  CONSTRAINT app_identities_provider_uten_mellomrom CHECK (DATALENGTH(provider) = DATALENGTH(RTRIM(provider))),
  CONSTRAINT app_identities_issuer_uten_mellomrom CHECK (DATALENGTH(issuer) = DATALENGTH(RTRIM(issuer))),
  CONSTRAINT app_identities_subject_uten_mellomrom CHECK (DATALENGTH(subject) = DATALENGTH(RTRIM(subject)));

ALTER TABLE koe.projects ADD
  CONSTRAINT projects_id_uten_mellomrom CHECK (DATALENGTH(id) = DATALENGTH(RTRIM(id))),
  CONSTRAINT projects_organisasjon_id_uten_mellomrom CHECK (DATALENGTH(organisasjon_id) = DATALENGTH(RTRIM(organisasjon_id)));

ALTER TABLE koe.app_project_memberships ADD
  CONSTRAINT memberships_project_id_uten_mellomrom CHECK (DATALENGTH(project_id) = DATALENGTH(RTRIM(project_id))),
  CONSTRAINT memberships_role_uten_mellomrom CHECK (DATALENGTH(role) = DATALENGTH(RTRIM(role)));

ALTER TABLE koe.catenda_contract_teams ADD
  CONSTRAINT contract_teams_internal_project_id_uten_mellomrom
    CHECK (DATALENGTH(internal_project_id) = DATALENGTH(RTRIM(internal_project_id)));

-- Saksnummeret er en tilfeldig ID som `koe_api.opprett_sak` lager (DL-U6), med
-- samme form som `event_id`.
ALTER TABLE koe.sak_metadata ADD
  CONSTRAINT sak_metadata_sak_id_form CHECK (
    TRY_CAST(sak_id AS uniqueidentifier) IS NOT NULL
    AND DATALENGTH(sak_id) = 72
    AND sak_id COLLATE Latin1_General_100_BIN2_UTF8 = LOWER(sak_id)),
  CONSTRAINT sak_metadata_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  CONSTRAINT sak_metadata_sakstype_uten_mellomrom CHECK (DATALENGTH(sakstype) = DATALENGTH(RTRIM(sakstype)));

ALTER TABLE koe.hendelse ADD
  CONSTRAINT hendelse_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  CONSTRAINT hendelse_event_type_uten_mellomrom CHECK (DATALENGTH(event_type) = DATALENGTH(RTRIM(event_type))),
  CONSTRAINT hendelse_refererer_til_event_id_form CHECK (
    refererer_til_event_id IS NULL
    OR (TRY_CAST(refererer_til_event_id AS uniqueidentifier) IS NOT NULL
        AND DATALENGTH(refererer_til_event_id) = 72
        AND refererer_til_event_id COLLATE Latin1_General_100_BIN2_UTF8 = LOWER(refererer_til_event_id)));

ALTER TABLE koe.notat ADD
  CONSTRAINT notat_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  CONSTRAINT notat_spor_uten_mellomrom CHECK (DATALENGTH(spor) = DATALENGTH(RTRIM(spor))),
  CONSTRAINT notat_refererer_til_event_id_form CHECK (
    refererer_til_event_id IS NULL
    OR (TRY_CAST(refererer_til_event_id AS uniqueidentifier) IS NOT NULL
        AND DATALENGTH(refererer_til_event_id) = 72
        AND refererer_til_event_id COLLATE Latin1_General_100_BIN2_UTF8 = LOWER(refererer_til_event_id)));

ALTER TABLE koe.leveringsoppdrag ADD
  CONSTRAINT leveringsoppdrag_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id))),
  CONSTRAINT leveringsoppdrag_dokumentnoekkel_uten_mellomrom
    CHECK (DATALENGTH(dokumentnoekkel) = DATALENGTH(RTRIM(dokumentnoekkel)));

ALTER TABLE koe.kjernebuffer ADD
  CONSTRAINT kjernebuffer_prosjekt_id_uten_mellomrom CHECK (DATALENGTH(prosjekt_id) = DATALENGTH(RTRIM(prosjekt_id)));
GO

-- Oppslaget i `koe.resolve_identity` bruker `=`, så `abc ` ville funnet brukeren
-- til `abc` uten å skrive noe, og kontrollen i tabellen ville ikke slått til.
-- Prosedyren avviser derfor mellomrom til slutt før oppslaget. Ellers er den
-- som i `20261016090100_identitet.sql`.
ALTER PROCEDURE koe.resolve_identity
  @provider nvarchar(16), @issuer nvarchar(400), @subject nvarchar(400), @email nvarchar(320), @name nvarchar(400),
  @user_id uniqueidentifier OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF DATALENGTH(@provider) <> DATALENGTH(RTRIM(@provider))
     OR DATALENGTH(@issuer) <> DATALENGTH(RTRIM(@issuer))
     OR DATALENGTH(@subject) <> DATALENGTH(RTRIM(@subject))
    THROW 52022, N'Identiteten har mellomrom til slutt', 1;
  BEGIN TRANSACTION;
  SET @user_id = (SELECT user_id FROM koe.app_identities WITH (UPDLOCK, HOLDLOCK)
                   WHERE provider = @provider AND issuer = @issuer AND subject = @subject);
  IF @user_id IS NULL
  BEGIN
    SET @user_id = NEWID();
    INSERT koe.app_users (id, email, name) VALUES (@user_id, ISNULL(@email, N''), ISNULL(@name, N''));
    INSERT koe.app_identities (id, user_id, provider, issuer, subject)
    VALUES (NEWID(), @user_id, @provider, @issuer, @subject);
  END
  ELSE
    UPDATE koe.app_users
       SET email = ISNULL(NULLIF(@email, N''), email), name = ISNULL(NULLIF(@name, N''), name)
     WHERE id = @user_id;
  COMMIT;
END
GO

DROP SECURITY POLICY koe_sikkerhet.tilgang;
GO

ALTER FUNCTION koe_sikkerhet.medlem(@prosjekt_id nvarchar(100))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(m.project_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

ALTER FUNCTION koe_sikkerhet.notat_synlig(@prosjekt_id nvarchar(100), @aktor_team_id nvarchar(32))
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(m.project_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.team_id = @aktor_team_id
   AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000))
   AND DATALENGTH(t.team_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000)))
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000))
   AND DATALENGTH(t.contract_role) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)))
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

ALTER FUNCTION koe_sikkerhet.skriver(
  @prosjekt_id nvarchar(100), @aktor_id uniqueidentifier, @aktor_rolle nvarchar(2),
  @aktor_team_id nvarchar(32), @team_kreves bit)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(m.project_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.user_id = @aktor_id
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.contract_role = @aktor_rolle
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000))
   AND DATALENGTH(t.contract_role) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)))
   AND ((t.team_id = @aktor_team_id
         AND t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000))
         AND DATALENGTH(t.team_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000))))
        OR (@aktor_team_id IS NULL AND SESSION_CONTEXT(N'koe_team') IS NULL AND @team_kreves = 0))
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

ALTER FUNCTION koe_sikkerhet.oppretter(@prosjekt_id nvarchar(100), @created_by uniqueidentifier)
RETURNS TABLE WITH SCHEMABINDING AS RETURN
SELECT 1 AS tilgang
  FROM koe.app_project_memberships m
  JOIN koe.projects p ON p.id = m.project_id AND p.is_active = 1
  JOIN koe.catenda_contract_teams t ON t.internal_project_id = m.project_id
 WHERE m.project_id = @prosjekt_id
   AND m.project_id = TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000))
   AND DATALENGTH(m.project_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_prosjekt') AS nvarchar(4000)))
   AND m.user_id = TRY_CAST(SESSION_CONTEXT(N'koe_aktor') AS uniqueidentifier)
   AND m.user_id = @created_by
   AND m.active = 1 AND m.viewer_override = 0 AND m.role IN (N'admin', N'member')
   AND t.contract_role = TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000))
   AND DATALENGTH(t.contract_role) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_side') AS nvarchar(4000)))
   AND ((t.team_id = TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000))
         AND DATALENGTH(t.team_id) = DATALENGTH(TRY_CAST(SESSION_CONTEXT(N'koe_team') AS nvarchar(4000))))
        OR SESSION_CONTEXT(N'koe_team') IS NULL)
   AND TRY_CAST(SESSION_CONTEXT(N'koe_tx') AS bigint) = CURRENT_TRANSACTION_ID();
GO

CREATE SECURITY POLICY koe_sikkerhet.tilgang
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.sak_metadata,
  ADD BLOCK PREDICATE koe_sikkerhet.oppretter(prosjekt_id, created_by) ON koe.sak_metadata AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.hendelse,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 0) ON koe.hendelse AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.notat_synlig(prosjekt_id, aktor_team_id) ON koe.notat,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1) ON koe.notat AFTER INSERT,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1) ON koe.notat BEFORE UPDATE,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1) ON koe.notat AFTER UPDATE,
  ADD BLOCK PREDICATE koe_sikkerhet.skriver(prosjekt_id, aktor_id, aktor_rolle, aktor_team_id, 1) ON koe.notat BEFORE DELETE,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.leveringsoppdrag,
  ADD BLOCK PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.leveringsoppdrag AFTER INSERT,
  ADD FILTER PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kjernebuffer,
  ADD BLOCK PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kjernebuffer AFTER INSERT,
  ADD BLOCK PREDICATE koe_sikkerhet.medlem(prosjekt_id) ON koe.kjernebuffer AFTER UPDATE
WITH (STATE = ON, SCHEMABINDING = ON);
GO
