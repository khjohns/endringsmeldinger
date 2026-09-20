-- Kjerneskjemaet: hendelsestabellene, sak_metadata, magic_links og user_groups.
--
-- REKONSTRUKSJON, IKKE ORIGINALTEKST. Basens migrasjonshistorikk fører opp
-- `001_koe_core_tables` til `006_koe_rls_performance` (versjon 20260911073512
-- til 20260911080204). Ingen av de seks finnes i repoet, og teksten deres er
-- ikke gjenopprettbar. Denne fila er lest ut av katalogen i prosjekt
-- gwdxadexwktegkklyobv 2026-09-20 og gjengir den tilstanden objektene faktisk
-- har — ikke hvilken av de seks som gjorde hva. Fordelingen mellom dem er
-- derfor bevisst ikke gjenskapt.
--
-- Filnavnets versjon er den første av de seks, slik at `supabase db push`
-- ser den som anvendt. De fem øvrige historikkradene har fortsatt ingen fil;
-- se docs/audit-databasearkitektur-2026-09-20.md (DA-03, DA-04 og «Veien fra
-- fil til database») for hva som skal til for å avstemme dem.
--
-- Fila forutsetter ingenting av repoet selv, bare Supabase-plattformens
-- `auth.users` og rollen `service_role`. Den skal kjøres FØR
-- backend/migrations/004, som endrer sak_metadata.
-- Alt er idempotent: den er et nullsteg mot en base som allerede har skjemaet.

-- ============================================================
-- sak_metadata — saksregisteret. Hendelsestabellene og magic_links
-- har fremmednøkkel hit, så den må opprettes først.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sak_metadata (
    sak_id TEXT PRIMARY KEY,

    -- Tenant: NOT NULL uten default med vilje. En default ville gjort
    -- attribusjonen uetterprøvbar (se 20260920060000).
    prosjekt_id TEXT NOT NULL,

    catenda_topic_id TEXT,
    catenda_board_id TEXT,
    catenda_project_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL,
    sakstype TEXT DEFAULT 'standard',

    -- Skrivetidsavledninger av hendelsesstrømmen. Se DA-14.
    cached_title TEXT,
    cached_status TEXT,
    last_event_at TIMESTAMPTZ,
    cached_sum_krevd NUMERIC,
    cached_sum_godkjent NUMERIC,
    cached_dager_krevd INTEGER,
    cached_dager_godkjent INTEGER,
    cached_hovedkategori TEXT,
    cached_underkategori TEXT,
    cached_forsering_paalopt NUMERIC,
    cached_forsering_maks NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_sak_metadata_prosjekt
    ON public.sak_metadata (prosjekt_id);

ALTER TABLE public.sak_metadata ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Hendelsestabellene. Tre tabeller med identisk form — én per sakstype.
-- `id` er GENERATED ALWAYS AS IDENTITY i basen, ikke SERIAL slik
-- docstringen i backend/repositories/supabase_event_repository.py oppgir.
-- ============================================================

DO $$
DECLARE
    v_table TEXT;
    v_unique TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'koe_events',
        'forsering_events',
        'endringsordre_events'
    ]
    LOOP
        v_unique := CASE v_table
            WHEN 'koe_events' THEN 'unique_koe_sak_version'
            WHEN 'forsering_events' THEN 'unique_forsering_sak_version'
            ELSE 'unique_eo_sak_version'
        END;

        EXECUTE format($fmt$
            CREATE TABLE IF NOT EXISTS public.%I (
                id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

                -- CloudEvents v1.0, påkrevde attributter
                specversion TEXT NOT NULL DEFAULT '1.0',
                event_id UUID NOT NULL UNIQUE,
                source TEXT NOT NULL,
                type TEXT NOT NULL,

                -- CloudEvents, valgfrie attributter
                time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                subject TEXT NOT NULL,
                datacontenttype TEXT DEFAULT 'application/json',

                -- CloudEvents, utvidelser. Settes av serveren, aldri av klienten.
                actor TEXT NOT NULL,
                actorrole TEXT NOT NULL CHECK (actorrole IN ('TE', 'BH')),
                comment TEXT,
                referstoid UUID,

                data JSONB NOT NULL,

                sak_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                versjon INTEGER NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),

                prosjekt_id TEXT NOT NULL,

                CONSTRAINT %I UNIQUE (sak_id, versjon),
                CONSTRAINT %I FOREIGN KEY (sak_id)
                    REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE
            )
        $fmt$, v_table, v_unique, 'fk_' || v_table || '_sak');

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON public.%I (sak_id)',
            'idx_' || v_table || '_sak_id', v_table
        );
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON public.%I (prosjekt_id)',
            'idx_' || v_table || '_prosjekt_id', v_table
        );

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    END LOOP;
END;
$$;

-- Bare koe_events har tidsindeks i basen. Ikke speilet på de to andre.
CREATE INDEX IF NOT EXISTS idx_koe_events_time ON public.koe_events ("time");

-- ============================================================
-- magic_links — tabellen er ubrukt; MagicLinkManager lagrer i fil.
-- Tatt med fordi den finnes i basen. Se DA-09.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.magic_links (
    token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sak_id TEXT NOT NULL
        REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    last_accessed TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_magic_links_sak_id
    ON public.magic_links (sak_id);

ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Delte triggerfunksjoner.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_pm_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================
-- user_groups — hører til den forrige identitetsmodellen (Supabase Auth).
-- Fremmednøkkelen peker på auth.users, mens appen i dag bruker app_users.
-- Null rader, og de to leserne nedenfor kalles ikke fra koden. Se DA-08.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL CHECK (group_name IN ('byggherre', 'entreprenør')),
    user_role TEXT,
    approval_role TEXT
        CHECK (approval_role IS NULL OR approval_role IN ('PL', 'SL', 'AL', 'DU', 'AD')),
    display_name TEXT,
    department TEXT,
    manager_id UUID REFERENCES public.user_groups(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_groups_user_id
    ON public.user_groups (user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_name
    ON public.user_groups (group_name);
CREATE INDEX IF NOT EXISTS idx_user_groups_user_role
    ON public.user_groups (user_role);
CREATE INDEX IF NOT EXISTS idx_user_groups_active
    ON public.user_groups (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_groups_approval_role
    ON public.user_groups (approval_role) WHERE approval_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_groups_manager_id
    ON public.user_groups (manager_id) WHERE manager_id IS NOT NULL;

ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_user_groups_updated_at ON public.user_groups;
CREATE TRIGGER update_user_groups_updated_at
    BEFORE UPDATE ON public.user_groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TABLE(user_role TEXT, group_name TEXT, approval_role TEXT,
              display_name TEXT, department TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.get_user_role_by_email(p_email TEXT)
RETURNS TABLE(user_role TEXT, group_name TEXT, approval_role TEXT,
              display_name TEXT, department TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- ============================================================
-- RLS-policyer. Alle er service_role / ALL / USING (true) — grensen
-- håndheves i dag av applikasjonen, ikke av basen. Se DA-11.
-- ============================================================

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'sak_metadata',
        'koe_events',
        'forsering_events',
        'endringsordre_events',
        'magic_links'
    ]
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public.%I',
            'Service role full access on ' || v_table, v_table
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO service_role '
            'USING (true) WITH CHECK (true)',
            'Service role full access on ' || v_table, v_table
        );
    END LOOP;
END;
$$;

-- user_groups har et avvikende policynavn i basen ("access", ikke
-- "full access"). Gjengitt som den er, ikke normalisert.
DROP POLICY IF EXISTS "Service role access on user_groups" ON public.user_groups;
CREATE POLICY "Service role access on user_groups"
    ON public.user_groups FOR ALL TO service_role
    USING (true) WITH CHECK (true);
