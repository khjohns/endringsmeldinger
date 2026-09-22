-- Steng Data API-et for anon og anonymt innlogget authenticated.
-- Se supabase/migrations/20260918100000_lock_down_data_api.sql i repoet.

-- 1. Fjern lesepolicyene som bare krever "en eller annen innlogget rolle".
DROP POLICY IF EXISTS "Authenticated users can read active projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can read project sak_metadata" ON public.sak_metadata;
DROP POLICY IF EXISTS "Authenticated users can read sak_metadata" ON public.sak_metadata;
DROP POLICY IF EXISTS "Authenticated users can read sak_bim_links" ON public.sak_bim_links;
DROP POLICY IF EXISTS "Authenticated users can read catenda_models_cache" ON public.catenda_models_cache;
DROP POLICY IF EXISTS "Authenticated users can read koe_events" ON public.koe_events;
DROP POLICY IF EXISTS "Authenticated users can read forsering_events" ON public.forsering_events;
DROP POLICY IF EXISTS "Authenticated users can read endringsordre_events" ON public.endringsordre_events;
DROP POLICY IF EXISTS "Authenticated users can read sak_relations" ON public.sak_relations;
DROP POLICY IF EXISTS "Authenticated users can read user_groups" ON public.user_groups;

-- 2. Tilbakekall tabellrettigheter.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3. Samme for det som lages senere.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- 4. Versjonsvisninger uten security_invoker omgår RLS.
DO $$
DECLARE
    v_view TEXT;
    v_supports_invoker BOOLEAN := current_setting('server_version_num')::INT >= 150000;
BEGIN
    FOREACH v_view IN ARRAY ARRAY[
        'koe_sak_versions',
        'forsering_sak_versions',
        'endringsordre_sak_versions'
    ]
    LOOP
        IF to_regclass('public.' || v_view) IS NULL THEN
            CONTINUE;
        END IF;
        IF v_supports_invoker THEN
            EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_view);
        END IF;
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', v_view);
    END LOOP;
END $$;;
