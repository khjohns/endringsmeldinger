-- New identity-based access model. Legacy project_memberships remains intact;
-- its mutable email identifiers must never silently link OAuth accounts.
BEGIN;

CREATE TABLE public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.app_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('catenda', 'entra')),
    issuer TEXT NOT NULL,
    subject TEXT NOT NULL,
    UNIQUE (provider, issuer, subject)
);
CREATE INDEX ON public.app_identities(user_id);

CREATE TABLE public.app_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.app_sessions(user_id);
CREATE INDEX ON public.app_sessions(expires_at);
CREATE TABLE public.app_oauth_attempts (
    state_hash TEXT PRIMARY KEY,
    browser_hash TEXT NOT NULL,
    return_path TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ON public.app_oauth_attempts(expires_at);

CREATE TABLE public.app_project_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    catenda_subject TEXT NOT NULL,
    user_email TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    viewer_override BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id),
    UNIQUE (project_id, catenda_subject)
);
CREATE INDEX ON public.app_project_memberships(user_id) WHERE active;
CREATE TABLE public.app_membership_sync (
    project_id TEXT PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
    catenda_project_id UUID NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL
);

-- Provider identity is the only account key. Email is display/contact data.
-- The lock prevents concurrent first logins creating duplicate/orphan accounts.
CREATE FUNCTION public.koe_resolve_identity(
    p_provider TEXT, p_issuer TEXT, p_subject TEXT, p_email TEXT, p_name TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_user UUID;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_provider || ':' || p_issuer || ':' || p_subject, 0));
    SELECT user_id INTO v_user FROM public.app_identities
        WHERE provider = p_provider AND issuer = p_issuer AND subject = p_subject;
    IF v_user IS NULL THEN
        INSERT INTO public.app_users(email, name) VALUES (p_email, p_name) RETURNING id INTO v_user;
        INSERT INTO public.app_identities(user_id, provider, issuer, subject)
            VALUES (v_user, p_provider, p_issuer, p_subject);
    ELSE
        UPDATE public.app_users SET email = p_email, name = p_name WHERE id = v_user;
    END IF;
    RETURN v_user;
END;
$$;

-- A complete validated snapshot is committed in one transaction. An older
-- overlapping fetch cannot overwrite a newer one. Local viewer limits survive.
CREATE FUNCTION public.koe_reconcile_memberships(
    p_project TEXT, p_catenda_project UUID, p_members JSONB, p_started_at TIMESTAMPTZ
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE m JSONB; v_user UUID; v_previous TIMESTAMPTZ;
BEGIN
    IF jsonb_typeof(p_members) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Expected complete membership snapshot';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('membership:' || p_project, 0));
    IF NOT EXISTS (SELECT 1 FROM public.catenda_project_configs
        WHERE internal_project_id = p_project AND catenda_project_id = p_catenda_project AND is_active) THEN
        RAISE EXCEPTION 'Project mapping changed';
    END IF;
    SELECT synced_at INTO v_previous FROM public.app_membership_sync WHERE project_id = p_project;
    IF v_previous >= p_started_at THEN RETURN false; END IF;
    IF p_started_at > now() + interval '30 seconds' THEN RAISE EXCEPTION 'Invalid snapshot time'; END IF;
    IF (SELECT count(*) FROM jsonb_array_elements(p_members)) <>
       (SELECT count(DISTINCT value->>'subject') FROM jsonb_array_elements(p_members)) THEN
        RAISE EXCEPTION 'Duplicate or missing subject';
    END IF;
    FOR m IN SELECT value FROM jsonb_array_elements(p_members) ORDER BY value->>'subject' LOOP
        IF m->>'role' IS NULL OR m->>'role' NOT IN ('admin', 'member') THEN
            RAISE EXCEPTION 'Invalid membership role';
        END IF;
        v_user := public.koe_resolve_identity('catenda', 'https://api.catenda.com',
            m->>'subject', coalesce(m->>'email', ''), coalesce(m->>'name', ''));
        INSERT INTO public.app_project_memberships
            (project_id, user_id, catenda_subject, user_email, display_name, role)
        VALUES (p_project, v_user, m->>'subject', m->>'email', m->>'name', m->>'role')
        ON CONFLICT (project_id, user_id) DO UPDATE SET
            user_email = excluded.user_email, display_name = excluded.display_name,
            role = excluded.role, active = true, updated_at = now();
    END LOOP;
    UPDATE public.app_project_memberships SET active = false, updated_at = now()
        WHERE project_id = p_project AND active AND catenda_subject NOT IN
            (SELECT value->>'subject' FROM jsonb_array_elements(p_members));
    INSERT INTO public.app_membership_sync(project_id, catenda_project_id, synced_at)
        VALUES (p_project, p_catenda_project, p_started_at)
        ON CONFLICT (project_id) DO UPDATE SET
            catenda_project_id = excluded.catenda_project_id, synced_at = excluded.synced_at;
    RETURN true;
END;
$$;

-- These are app sessions, not Supabase Auth sessions. Only the backend service
-- role may access them. No browser grants, user-editable JWT claims or definer RPCs.
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['app_users','app_identities','app_sessions',
        'app_oauth_attempts','app_project_memberships','app_membership_sync'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', t);
        EXECUTE format('CREATE POLICY backend_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
    END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.koe_resolve_identity(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.koe_reconcile_memberships(TEXT,UUID,JSONB,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.koe_resolve_identity(TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.koe_reconcile_memberships(TEXT,UUID,JSONB,TIMESTAMPTZ) TO service_role;
COMMIT;
