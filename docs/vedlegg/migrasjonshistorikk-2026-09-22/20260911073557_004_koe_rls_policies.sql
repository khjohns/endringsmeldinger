-- ============================================================
-- KOE Row Level Security
-- ============================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sak_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sak_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sak_bim_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catenda_models_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.koe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endringsordre_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forsering_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- Projects
CREATE POLICY "Service role full access on projects" ON public.projects
    USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Authenticated users can read active projects" ON public.projects FOR SELECT
    USING (((auth.role() = 'authenticated'::text) AND (is_active = true)));

-- Project memberships
CREATE POLICY "Service role full access on project_memberships" ON public.project_memberships TO service_role
    USING (true) WITH CHECK (true);
CREATE POLICY "Users can read own memberships" ON public.project_memberships FOR SELECT TO authenticated
    USING ((user_email = ( SELECT auth.email() AS email)));

-- Sak metadata (prosjekt-bevisst lesetilgang)
CREATE POLICY "Service role full access on sak_metadata" ON public.sak_metadata TO service_role
    USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read project sak_metadata" ON public.sak_metadata FOR SELECT
    USING (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
        FROM public.projects
        WHERE ((projects.id = sak_metadata.prosjekt_id) AND (projects.is_active = true))))));

-- Sak relations
CREATE POLICY "Service role full access on sak_relations" ON public.sak_relations
    USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Authenticated users can read sak_relations" ON public.sak_relations FOR SELECT
    USING ((auth.role() = 'authenticated'::text));

-- Sak BIM links
CREATE POLICY "Service role full access on sak_bim_links" ON public.sak_bim_links
    USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Authenticated users can read sak_bim_links" ON public.sak_bim_links FOR SELECT
    USING ((auth.role() = 'authenticated'::text));

-- Catenda models cache
CREATE POLICY "Service role full access on catenda_models_cache" ON public.catenda_models_cache
    USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Authenticated users can read catenda_models_cache" ON public.catenda_models_cache FOR SELECT
    USING ((auth.role() = 'authenticated'::text));

-- KOE events
CREATE POLICY "Service role full access on koe_events" ON public.koe_events TO service_role
    USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read koe_events" ON public.koe_events FOR SELECT TO authenticated
    USING (true);

-- Endringsordre events
CREATE POLICY "Service role full access on endringsordre_events" ON public.endringsordre_events TO service_role
    USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read endringsordre_events" ON public.endringsordre_events FOR SELECT TO authenticated
    USING (true);

-- Forsering events
CREATE POLICY "Service role full access on forsering_events" ON public.forsering_events TO service_role
    USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read forsering_events" ON public.forsering_events FOR SELECT TO authenticated
    USING (true);

-- Magic links
CREATE POLICY "Service role full access on magic_links" ON public.magic_links TO service_role
    USING (true) WITH CHECK (true);

-- User groups
CREATE POLICY "Service role access on user_groups" ON public.user_groups TO service_role
    USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read user_groups" ON public.user_groups FOR SELECT TO authenticated
    USING (((( SELECT auth.uid() AS uid) = user_id) OR (is_active = true)));
;
