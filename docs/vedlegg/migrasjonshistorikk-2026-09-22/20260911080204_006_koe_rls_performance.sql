-- ============================================================
-- Ytelsesfiks basert på Performance Advisor:
-- auth_rls_initplan + multiple_permissive_policies
-- ============================================================

-- projects
DROP POLICY "Service role full access on projects" ON public.projects;
CREATE POLICY "Service role full access on projects" ON public.projects
    TO service_role USING (true) WITH CHECK (true);

DROP POLICY "Authenticated users can read active projects" ON public.projects;
CREATE POLICY "Authenticated users can read active projects" ON public.projects
    FOR SELECT TO authenticated
    USING (is_active = true);

-- sak_metadata
DROP POLICY "Authenticated users can read project sak_metadata" ON public.sak_metadata;
CREATE POLICY "Authenticated users can read project sak_metadata" ON public.sak_metadata
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id = sak_metadata.prosjekt_id AND projects.is_active = true
    ));

-- sak_relations
DROP POLICY "Service role full access on sak_relations" ON public.sak_relations;
CREATE POLICY "Service role full access on sak_relations" ON public.sak_relations
    TO service_role USING (true) WITH CHECK (true);

DROP POLICY "Authenticated users can read sak_relations" ON public.sak_relations;
CREATE POLICY "Authenticated users can read sak_relations" ON public.sak_relations
    FOR SELECT TO authenticated
    USING (true);

-- sak_bim_links
DROP POLICY "Service role full access on sak_bim_links" ON public.sak_bim_links;
CREATE POLICY "Service role full access on sak_bim_links" ON public.sak_bim_links
    TO service_role USING (true) WITH CHECK (true);

DROP POLICY "Authenticated users can read sak_bim_links" ON public.sak_bim_links;
CREATE POLICY "Authenticated users can read sak_bim_links" ON public.sak_bim_links
    FOR SELECT TO authenticated
    USING (true);

-- catenda_models_cache
DROP POLICY "Service role full access on catenda_models_cache" ON public.catenda_models_cache;
CREATE POLICY "Service role full access on catenda_models_cache" ON public.catenda_models_cache
    TO service_role USING (true) WITH CHECK (true);

DROP POLICY "Authenticated users can read catenda_models_cache" ON public.catenda_models_cache;
CREATE POLICY "Authenticated users can read catenda_models_cache" ON public.catenda_models_cache
    FOR SELECT TO authenticated
    USING (true);
;
