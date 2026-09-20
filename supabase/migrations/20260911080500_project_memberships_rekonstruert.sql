-- project_memberships — den e-postbaserte medlemskapstabellen. Skrives av
-- triggeren nedenfor, og leses ingen steder (DA-10).
--
-- REKONSTRUKSJON, IKKE ORIGINALTEKST. Tabellen finnes i basen uten at noen
-- migrasjonsfil oppretter den. Hvilken migrasjon som gjorde det er ukjent:
-- den er ikke blant de seks koe-migrasjonene i basens historikk, og
-- backend/migrations/ begynner på 003. Versjonsnummeret i filnavnet er valgt
-- for rekkefølge, ikke for opphav — fila må komme ETTER
-- backend/migrations/004, som oppretter `public.projects`.
--
-- Innholdet er lest ut av katalogen i prosjekt gwdxadexwktegkklyobv
-- 2026-09-20. Alt er idempotent.

CREATE TABLE IF NOT EXISTS public.project_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL
        REFERENCES public.projects(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    external_id TEXT,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('admin', 'member', 'viewer')),
    display_name TEXT,
    invited_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_pm_project
    ON public.project_memberships (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_email
    ON public.project_memberships (user_email);
CREATE INDEX IF NOT EXISTS idx_pm_external_id
    ON public.project_memberships (external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.project_memberships ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_project_memberships_updated_at
    ON public.project_memberships;
CREATE TRIGGER update_project_memberships_updated_at
    BEFORE UPDATE ON public.project_memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_pm_updated_at();

CREATE OR REPLACE FUNCTION public.auto_create_project_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.project_memberships (project_id, user_email, role, invited_by)
        VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by)
        ON CONFLICT (project_id, user_email) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_membership_on_project_create ON public.projects;
CREATE TRIGGER trg_auto_membership_on_project_create
    AFTER INSERT ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.auto_create_project_membership();


DROP POLICY IF EXISTS "Service role full access on project_memberships"
    ON public.project_memberships;
CREATE POLICY "Service role full access on project_memberships"
    ON public.project_memberships FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Arvet fra den forrige identitetsmodellen: en lesepolicy for rollen
-- `authenticated`. Den er uvirksom i dag — 20260918131137 tok fra `anon` og
-- `authenticated` alle tabellrettigheter, så rollen når ikke tabellen i det
-- hele tatt. Gjengitt fordi den finnes i basen. Se DA-11.
DROP POLICY IF EXISTS "Users can read own memberships" ON public.project_memberships;
CREATE POLICY "Users can read own memberships"
    ON public.project_memberships FOR SELECT TO authenticated
    USING (user_email = (SELECT auth.email()));
