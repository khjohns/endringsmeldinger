-- Permanent, backend-only routing configuration for Catenda webhooks.
--
-- projects.id is TEXT in the existing application schema, so all FK columns
-- that refer to it are TEXT as well. Catenda resource IDs are native UUIDs.

CREATE TABLE IF NOT EXISTS public.catenda_project_configs (
    internal_project_id TEXT PRIMARY KEY
        REFERENCES public.projects(id) ON DELETE CASCADE,
    catenda_project_id UUID NOT NULL UNIQUE,
    library_id UUID NOT NULL,
    folder_id UUID NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catenda_topic_board_configs (
    topic_board_id UUID PRIMARY KEY,
    internal_project_id TEXT NOT NULL
        REFERENCES public.catenda_project_configs(internal_project_id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary/unique keys protect uniqueness. These indexes support the two active
-- routing lookups without duplicating those constraints.
CREATE INDEX IF NOT EXISTS idx_catenda_project_configs_active_project
    ON public.catenda_project_configs (catenda_project_id)
    WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_catenda_topic_board_configs_active_project
    ON public.catenda_topic_board_configs (internal_project_id)
    WHERE is_active;

CREATE OR REPLACE FUNCTION public.set_catenda_project_registry_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_catenda_project_configs_updated_at
    ON public.catenda_project_configs;
CREATE TRIGGER set_catenda_project_configs_updated_at
    BEFORE UPDATE ON public.catenda_project_configs
    FOR EACH ROW EXECUTE FUNCTION public.set_catenda_project_registry_updated_at();

DROP TRIGGER IF EXISTS set_catenda_topic_board_configs_updated_at
    ON public.catenda_topic_board_configs;
CREATE TRIGGER set_catenda_topic_board_configs_updated_at
    BEFORE UPDATE ON public.catenda_topic_board_configs
    FOR EACH ROW EXECUTE FUNCTION public.set_catenda_project_registry_updated_at();

ALTER TABLE public.catenda_project_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catenda_topic_board_configs ENABLE ROW LEVEL SECURITY;

-- Routing configuration is read by the backend service role only. Do not grant
-- browser users read access: Catenda project, library and board identifiers are
-- operational integration configuration, not user-facing project metadata.
REVOKE ALL ON public.catenda_project_configs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.catenda_topic_board_configs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catenda_project_configs
    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catenda_topic_board_configs
    TO service_role;

DROP POLICY IF EXISTS "Service role full access on catenda_project_configs"
    ON public.catenda_project_configs;
CREATE POLICY "Service role full access on catenda_project_configs"
    ON public.catenda_project_configs
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role full access on catenda_topic_board_configs"
    ON public.catenda_topic_board_configs;
CREATE POLICY "Service role full access on catenda_topic_board_configs"
    ON public.catenda_topic_board_configs
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);
