-- Steng Data API-et for anon og anonymt innlogget authenticated.
--
-- Appen snakker med databasen som service_role gjennom backend. Ingen klient
-- bruker Supabase-klienten direkte: frontend har ingen Supabase-klient, og all
-- lesing går gjennom Flask, som håndhever prosjekt, kontraktsside og team.
--
-- De eldre migrasjonene (004-006) ga likevel enhver rolle med
-- auth.role() = 'authenticated' leserett til sak_metadata, projects,
-- sak_bim_links og catenda_models_cache. Anonym innlogging i Supabase gir
-- nettopp rollen authenticated. Sammen med den åpne consent-flaten kunne en
-- utenforstående dermed lese sakstitler, status og krevde/godkjente beløp på
-- tvers av prosjekter gjennom PostgREST, uten å røre Flask (audit RV-06).
--
-- I tillegg gir Supabase som standard SELECT/INSERT/UPDATE/DELETE til anon og
-- authenticated på nye tabeller i public i eldre prosjekter. Policyene over var
-- derfor bare den ene halvdelen; rettighetene må også tilbakekalles.
--
-- Migrasjonen rører ikke service_role, som har egne GRANTs.

-- 1. Fjern lesepolicyene som bare krever "en eller annen innlogget rolle".
--    Kontroll mot den faktiske databasen 2026-09-18 viste at hendelsestabellene
--    har samme mønster med `USING (true)`, uten at det står i noen migrasjonsfil.
--    Det er hele kontraktshistorikken, inkludert interne notater med tekst.
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

-- 2. Tilbakekall tabellrettigheter. Uten SELECT hjelper det ikke om en framtidig
--    policy skulle slippe rollen inn igjen.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3. Samme for det som lages senere, slik at neste tabell eller RPC ikke må
--    huske å gjøre det selv.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- 4. Versjonsvisningene i hendelseslageret er opprettet uten security_invoker.
--    En vanlig view kjører med eierens rettigheter, så RLS på koe_events blir
--    omgått for enhver rolle som har SELECT på viewet. Visningene opprettes ikke
--    av noen migrasjon (SQL-en ligger i docstringen i
--    repositories/supabase_event_repository.py), så hvert steg er betinget.
--    Ingen kode i repoet spør mot disse visningene (kun definisjonen i
--    docstringen), så de bør vurderes fjernet helt. Her tilbakekalles de først,
--    slik at tilbakekallingen ikke avhenger av at noen tør slette.
--    security_invoker finnes fra PostgreSQL 15. Supabase kjører 15 eller nyere,
--    men en lokal klynge kan være eldre, og da er REVOKE vernet som gjelder.
DO $$
DECLARE
    v_view TEXT;
    v_supports_invoker BOOLEAN := current_setting('server_version_num')::INT >= 150000;
BEGIN
    IF NOT v_supports_invoker THEN
        RAISE NOTICE 'security_invoker krever PostgreSQL 15+; setter bare REVOKE her.';
    END IF;
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
END $$;

-- Kontroll etter kjøring (skal gi false for begge roller og alle tabeller):
--
--   SELECT c.relname, r.rolname,
--          has_table_privilege(r.rolname, c.oid, 'SELECT') AS kan_lese
--   FROM pg_class c
--   CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
--   WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'v');
--
--   SELECT tablename, policyname, roles, qual FROM pg_policies WHERE schemaname = 'public';
