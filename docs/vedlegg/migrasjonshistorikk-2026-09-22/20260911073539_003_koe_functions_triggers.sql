-- ============================================================
-- KOE functions + triggers
-- ============================================================

CREATE FUNCTION public.auto_create_project_membership() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO project_memberships (project_id, user_email, role, invited_by)
        VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by)
        ON CONFLICT (project_id, user_email) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_pm_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.get_user_role(p_user_id uuid) RETURNS TABLE(user_role text, group_name text, approval_role text, display_name text, department text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ug.user_role,
        ug.group_name,
        ug.approval_role,
        ug.display_name,
        ug.department
    FROM public.user_groups ug
    WHERE ug.user_id = p_user_id
      AND ug.is_active = true;
END;
$$;

CREATE FUNCTION public.get_user_role_by_email(p_email text) RETURNS TABLE(user_role text, group_name text, approval_role text, display_name text, department text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ug.user_role,
        ug.group_name,
        ug.approval_role,
        ug.display_name,
        ug.department
    FROM public.user_groups ug
    JOIN auth.users u ON u.id = ug.user_id
    WHERE u.email = p_email
      AND ug.is_active = true;
END;
$$;

-- Triggere
CREATE TRIGGER trg_auto_membership_on_project_create
    AFTER INSERT ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.auto_create_project_membership();

CREATE TRIGGER update_project_memberships_updated_at
    BEFORE UPDATE ON public.project_memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_pm_updated_at();

CREATE TRIGGER update_user_groups_updated_at
    BEFORE UPDATE ON public.user_groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
;
