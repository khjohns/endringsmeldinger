-- ============================================================
-- Sikkerhetsherding basert på Supabase Security Advisor
-- ============================================================

-- 1) Fast search_path (hindrer schema-kapring på SECURITY DEFINER-funksjoner)
CREATE OR REPLACE FUNCTION public.auto_create_project_membership() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.update_pm_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = ''
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2) Fjern RPC-eksponering for anon/authenticated på interne/følsomme funksjoner.
--    auto_create_project_membership: skal KUN kjøres av trigger, aldri via RPC.
REVOKE EXECUTE ON FUNCTION public.auto_create_project_membership() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_create_project_membership() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_create_project_membership() FROM authenticated;

--    get_user_role / get_user_role_by_email: tar vilkårlig id/e-post og omgår RLS.
--    Skal kun kalles av backend (service_role), ikke direkte fra klient.
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_role_by_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_by_email(text) TO service_role;
;
