-- Run ONLY against an isolated empty Postgres database, as its owner.
\set ON_ERROR_STOP on
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.projects(id TEXT PRIMARY KEY);
\ir ../../../supabase/migrations/20260902_catenda_project_registry.sql
\ir ../../../supabase/migrations/20260912150635_catenda_user_sessions.sql

INSERT INTO public.projects VALUES ('p');
INSERT INTO public.catenda_project_configs(internal_project_id, catenda_project_id, library_id)
VALUES ('p', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');

DO $$
DECLARE a UUID; b UUID;
BEGIN
    a := public.koe_resolve_identity('catenda', 'https://api.catenda.com', 'u1', 'same@example.com', 'One');
    b := public.koe_resolve_identity('entra', 'tenant-id', 'oid', 'same@example.com', 'Two');
    IF a = b THEN RAISE EXCEPTION 'Email linked separate identities'; END IF;
    IF a <> public.koe_resolve_identity('catenda', 'https://api.catenda.com', 'u1', 'changed@example.com', 'One') THEN
        RAISE EXCEPTION 'Mutable email changed identity';
    END IF;
    IF has_table_privilege('anon', 'public.app_sessions', 'SELECT') OR
       has_table_privilege('authenticated', 'public.app_sessions', 'SELECT') OR
       has_function_privilege('anon', 'public.koe_resolve_identity(text,text,text,text,text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'Browser access to backend auth data';
    END IF;
END;
$$;

SELECT public.koe_reconcile_memberships('p', '22222222-2222-2222-2222-222222222222',
    '[{"subject":"u1","email":"a@example.com","name":"One","role":"admin"},
      {"subject":"u2","email":"b@example.com","name":"Two","role":"member"}]', now() - interval '10 seconds');
UPDATE public.app_project_memberships SET viewer_override = true WHERE catenda_subject = 'u1';
SELECT public.koe_reconcile_memberships('p', '22222222-2222-2222-2222-222222222222',
    '[{"subject":"u1","email":"new@example.com","name":"One","role":"member"}]', now() - interval '5 seconds');

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.app_project_memberships WHERE catenda_subject = 'u1'
                  AND role = 'member' AND viewer_override AND active AND user_email = 'new@example.com') THEN
        RAISE EXCEPTION 'Role/email/viewer reconciliation failed';
    END IF;
    IF EXISTS (SELECT 1 FROM public.app_project_memberships WHERE catenda_subject = 'u2' AND active) THEN
        RAISE EXCEPTION 'Removed membership remained active';
    END IF;
    IF public.koe_reconcile_memberships('p', '22222222-2222-2222-2222-222222222222', '[]', now() - interval '20 seconds') THEN
        RAISE EXCEPTION 'Old snapshot overwrote newer one';
    END IF;
    BEGIN
        PERFORM public.koe_reconcile_memberships('p', '22222222-2222-2222-2222-222222222222',
            '[{"subject":"u1","email":"wrong","name":"wrong","role":"member"},
              {"subject":"u3","email":"c","name":"Three","role":"viewer"}]', now());
        RAISE EXCEPTION 'Invalid snapshot accepted';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'Invalid membership role' THEN RAISE; END IF;
    END;
    IF EXISTS (SELECT 1 FROM public.app_project_memberships WHERE user_email = 'wrong') THEN
        RAISE EXCEPTION 'Invalid snapshot partially committed';
    END IF;
END;
$$;

-- OAuth consumption and session expiry are SQL predicates, not process memory.
INSERT INTO public.app_oauth_attempts VALUES ('hash', 'browser', '/', now() + interval '10 minutes');
DO $$
DECLARE n INTEGER;
BEGIN
    DELETE FROM public.app_oauth_attempts WHERE state_hash = 'hash' AND browser_hash = 'wrong' AND expires_at > now();
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'Wrong browser consumed state'; END IF;
    DELETE FROM public.app_oauth_attempts WHERE state_hash = 'hash' AND browser_hash = 'browser' AND expires_at > now();
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'State was not consumed'; END IF;
    DELETE FROM public.app_oauth_attempts WHERE state_hash = 'hash' AND browser_hash = 'browser' AND expires_at > now();
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'State replay succeeded'; END IF;
END;
$$;
SET ROLE service_role;
SELECT count(*) FROM public.app_sessions;
SELECT public.koe_resolve_identity('catenda', 'https://api.catenda.com', 'service-test', '', '');
RESET ROLE;
SELECT 'Catenda schema security and reconciliation tests passed' AS result;
