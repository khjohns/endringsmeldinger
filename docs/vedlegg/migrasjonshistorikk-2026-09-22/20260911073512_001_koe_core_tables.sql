-- ============================================================
-- KOE (Endringsmeldinger) core tables
-- Migrert fra unified-timeline (schema-only, ingen data)
-- ============================================================

-- 1. Projects (multi-prosjekt-støtte)
CREATE TABLE public.projects (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT projects_pkey PRIMARY KEY (id)
);

-- 2. Project memberships
CREATE TABLE public.project_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id text NOT NULL,
    user_email text NOT NULL,
    external_id text,
    role text DEFAULT 'member'::text NOT NULL,
    display_name text,
    invited_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_memberships_pkey PRIMARY KEY (id),
    CONSTRAINT project_memberships_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text, 'viewer'::text]))),
    CONSTRAINT project_memberships_project_id_user_email_key UNIQUE (project_id, user_email),
    CONSTRAINT project_memberships_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);

-- 3. Sak metadata (case metadata / cached reporting fields)
CREATE TABLE public.sak_metadata (
    sak_id text NOT NULL,
    prosjekt_id text DEFAULT 'oslobygg'::text NOT NULL,
    catenda_topic_id text,
    catenda_board_id text,
    catenda_project_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text NOT NULL,
    sakstype text DEFAULT 'standard'::text,
    cached_title text,
    cached_status text,
    last_event_at timestamp with time zone,
    cached_sum_krevd numeric,
    cached_sum_godkjent numeric,
    cached_dager_krevd integer,
    cached_dager_godkjent integer,
    cached_hovedkategori text,
    cached_underkategori text,
    cached_forsering_paalopt numeric,
    cached_forsering_maks numeric,
    CONSTRAINT sak_metadata_pkey PRIMARY KEY (sak_id)
);

COMMENT ON COLUMN public.sak_metadata.cached_sum_krevd IS 'Cached vederlag.krevd_belop for rapportering';
COMMENT ON COLUMN public.sak_metadata.cached_sum_godkjent IS 'Cached vederlag.godkjent_belop for rapportering';
COMMENT ON COLUMN public.sak_metadata.cached_dager_krevd IS 'Cached frist.krevd_dager for rapportering';
COMMENT ON COLUMN public.sak_metadata.cached_dager_godkjent IS 'Cached frist.godkjent_dager for rapportering';
COMMENT ON COLUMN public.sak_metadata.cached_hovedkategori IS 'Cached grunnlag.hovedkategori for rapportering';
COMMENT ON COLUMN public.sak_metadata.cached_underkategori IS 'Cached grunnlag.underkategori for rapportering';
COMMENT ON COLUMN public.sak_metadata.cached_forsering_paalopt IS 'Cached forsering_data.paalopte_kostnader';
COMMENT ON COLUMN public.sak_metadata.cached_forsering_maks IS 'Cached forsering_data.maks_forseringskostnad';

-- 4. Sak relations (forsering/endringsordre -> underliggende saker)
CREATE TABLE public.sak_relations (
    id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    source_sak_id text NOT NULL,
    target_sak_id text NOT NULL,
    relation_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sak_relations_pkey PRIMARY KEY (id),
    CONSTRAINT sak_relations_relation_type_check CHECK ((relation_type = ANY (ARRAY['forsering'::text, 'endringsordre'::text]))),
    CONSTRAINT sak_relations_source_sak_id_target_sak_id_relation_type_key UNIQUE (source_sak_id, target_sak_id, relation_type)
);

-- 5. Catenda models cache
CREATE TABLE public.catenda_models_cache (
    id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    prosjekt_id text NOT NULL,
    catenda_project_id text NOT NULL,
    model_id text NOT NULL,
    model_name text NOT NULL,
    fag text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT catenda_models_cache_pkey PRIMARY KEY (id),
    CONSTRAINT catenda_models_cache_catenda_project_id_model_id_key UNIQUE (catenda_project_id, model_id)
);

-- 6. Sak BIM links (many-to-many mot Catenda-modeller/objekter)
CREATE TABLE public.sak_bim_links (
    id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    sak_id text NOT NULL,
    fag text NOT NULL,
    model_id text,
    model_name text,
    object_id bigint,
    object_global_id text,
    object_name text,
    object_ifc_type text,
    linked_by text NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    kommentar text,
    properties jsonb,
    CONSTRAINT sak_bim_links_pkey PRIMARY KEY (id),
    CONSTRAINT sak_bim_links_sak_id_fkey FOREIGN KEY (sak_id) REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE
);

-- 7. KOE events (CloudEvents-tabell for hoved-saksflyten)
CREATE TABLE public.koe_events (
    id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    specversion text DEFAULT '1.0'::text NOT NULL,
    event_id uuid NOT NULL,
    source text NOT NULL,
    type text NOT NULL,
    "time" timestamp with time zone DEFAULT now() NOT NULL,
    subject text NOT NULL,
    datacontenttype text DEFAULT 'application/json'::text,
    actor text NOT NULL,
    actorrole text NOT NULL,
    comment text,
    referstoid uuid,
    data jsonb NOT NULL,
    sak_id text NOT NULL,
    event_type text NOT NULL,
    versjon integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT koe_events_pkey PRIMARY KEY (id),
    CONSTRAINT koe_events_event_id_key UNIQUE (event_id),
    CONSTRAINT unique_koe_sak_version UNIQUE (sak_id, versjon),
    CONSTRAINT koe_events_actorrole_check CHECK ((actorrole = ANY (ARRAY['TE'::text, 'BH'::text]))),
    CONSTRAINT fk_koe_events_sak FOREIGN KEY (sak_id) REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE
);

-- 8. Endringsordre events (§31.3)
CREATE TABLE public.endringsordre_events (
    id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    specversion text DEFAULT '1.0'::text NOT NULL,
    event_id uuid NOT NULL,
    source text NOT NULL,
    type text NOT NULL,
    "time" timestamp with time zone DEFAULT now() NOT NULL,
    subject text NOT NULL,
    datacontenttype text DEFAULT 'application/json'::text,
    actor text NOT NULL,
    actorrole text NOT NULL,
    comment text,
    referstoid uuid,
    data jsonb NOT NULL,
    sak_id text NOT NULL,
    event_type text NOT NULL,
    versjon integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT endringsordre_events_pkey PRIMARY KEY (id),
    CONSTRAINT endringsordre_events_event_id_key UNIQUE (event_id),
    CONSTRAINT unique_eo_sak_version UNIQUE (sak_id, versjon),
    CONSTRAINT endringsordre_events_actorrole_check CHECK ((actorrole = ANY (ARRAY['TE'::text, 'BH'::text]))),
    CONSTRAINT fk_endringsordre_events_sak FOREIGN KEY (sak_id) REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE
);

-- 9. Forsering events (§33.8)
CREATE TABLE public.forsering_events (
    id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    specversion text DEFAULT '1.0'::text NOT NULL,
    event_id uuid NOT NULL,
    source text NOT NULL,
    type text NOT NULL,
    "time" timestamp with time zone DEFAULT now() NOT NULL,
    subject text NOT NULL,
    datacontenttype text DEFAULT 'application/json'::text,
    actor text NOT NULL,
    actorrole text NOT NULL,
    comment text,
    referstoid uuid,
    data jsonb NOT NULL,
    sak_id text NOT NULL,
    event_type text NOT NULL,
    versjon integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT forsering_events_pkey PRIMARY KEY (id),
    CONSTRAINT forsering_events_event_id_key UNIQUE (event_id),
    CONSTRAINT unique_forsering_sak_version UNIQUE (sak_id, versjon),
    CONSTRAINT forsering_events_actorrole_check CHECK ((actorrole = ANY (ARRAY['TE'::text, 'BH'::text]))),
    CONSTRAINT fk_forsering_events_sak FOREIGN KEY (sak_id) REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE
);

-- 10. Magic links (passordløs tilgang til en sak)
CREATE TABLE public.magic_links (
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    sak_id text NOT NULL,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false,
    used_at timestamp with time zone,
    revoked boolean DEFAULT false,
    revoked_at timestamp with time zone,
    last_accessed timestamp with time zone,
    CONSTRAINT magic_links_pkey PRIMARY KEY (token),
    CONSTRAINT magic_links_sak_id_fkey FOREIGN KEY (sak_id) REFERENCES public.sak_metadata(sak_id) ON DELETE CASCADE
);

-- 11. User groups (BH/TE-rolletilknytning)
CREATE TABLE public.user_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    group_name text NOT NULL,
    user_role text GENERATED ALWAYS AS (
        CASE group_name
            WHEN 'byggherre'::text THEN 'BH'::text
            WHEN 'entreprenør'::text THEN 'TE'::text
            ELSE NULL::text
        END) STORED,
    approval_role text,
    display_name text,
    department text,
    manager_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_groups_pkey PRIMARY KEY (id),
    CONSTRAINT user_groups_user_id_key UNIQUE (user_id),
    CONSTRAINT user_groups_approval_role_check CHECK (((approval_role IS NULL) OR (approval_role = ANY (ARRAY['PL'::text, 'SL'::text, 'AL'::text, 'DU'::text, 'AD'::text])))),
    CONSTRAINT user_groups_group_name_check CHECK ((group_name = ANY (ARRAY['byggherre'::text, 'entreprenør'::text]))),
    CONSTRAINT user_groups_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.user_groups(id) ON DELETE SET NULL,
    CONSTRAINT user_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
;
