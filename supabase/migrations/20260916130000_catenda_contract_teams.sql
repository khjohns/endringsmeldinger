-- Catenda Contract Teams (BH/TE) per prosjekt.
--
-- Lagrer eksplisitte team-ID-er for kontraktssider.
-- Primærnøkkelen (internal_project_id, team_id) garanterer at samme team
-- aldri kan tildeles både BH og TE i samme prosjekt.
-- Flere team per kontraktsside støttes naturlig.

CREATE TABLE IF NOT EXISTS public.catenda_contract_teams (
    internal_project_id TEXT NOT NULL
        REFERENCES public.catenda_project_configs(internal_project_id) ON DELETE CASCADE,
    team_id UUID NOT NULL,
    contract_role TEXT NOT NULL CHECK (contract_role IN ('BH', 'TE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (internal_project_id, team_id)
);

-- Sikkerhet: RLS aktivert, kun tilgjengelig for backend (service_role)
ALTER TABLE public.catenda_contract_teams ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.catenda_contract_teams FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catenda_contract_teams TO service_role;

DROP POLICY IF EXISTS "Service role full access on catenda_contract_teams"
    ON public.catenda_contract_teams;
CREATE POLICY "Service role full access on catenda_contract_teams"
    ON public.catenda_contract_teams
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- Atomisk erstatning av kontraktsteams for et prosjekt.
-- Validerer at prosjektet finnes og er aktivt før endringer gjøres.
CREATE OR REPLACE FUNCTION public.koe_set_contract_teams(
    p_project TEXT,
    p_teams JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_item JSONB;
    v_team_id UUID;
    v_role TEXT;
    v_has_bh BOOLEAN := FALSE;
    v_has_te BOOLEAN := FALSE;
BEGIN
    -- Lås prosjektraden med FOR UPDATE slik at samtidige endringer på samme prosjekt serialiseres
    PERFORM 1 FROM public.catenda_project_configs
    WHERE internal_project_id = p_project AND is_active = TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Aktivt prosjekt ikke funnet: %', p_project;
    END IF;

    IF jsonb_typeof(p_teams) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'p_teams må være et JSONB array av objekter';
    END IF;

    -- Slett eksisterende team atomisk i samme transaksjon
    DELETE FROM public.catenda_contract_teams
    WHERE internal_project_id = p_project;

    -- Sett inn nye team og sjekk at begge sider representeres
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_teams)
    LOOP
        v_team_id := (v_item->>'team_id')::UUID;
        v_role := (v_item->>'contract_role')::TEXT;

        IF v_role NOT IN ('BH', 'TE') THEN
            RAISE EXCEPTION 'Ugyldig contract_role: % (må være BH eller TE)', v_role;
        END IF;

        IF v_role = 'BH' THEN
            v_has_bh := TRUE;
        ELSIF v_role = 'TE' THEN
            v_has_te := TRUE;
        END IF;

        INSERT INTO public.catenda_contract_teams (internal_project_id, team_id, contract_role)
        VALUES (p_project, v_team_id, v_role);
    END LOOP;

    -- Valider at begge kontraktssider faktisk er representert
    IF NOT (v_has_bh AND v_has_te) THEN
        RAISE EXCEPTION 'Både BH og TE må være representert i p_teams';
    END IF;

    RETURN TRUE;
END;
$$;

-- Avgrens tilgang til RPC-funksjonen: kun backend service_role har EXECUTE
REVOKE ALL ON FUNCTION public.koe_set_contract_teams(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.koe_set_contract_teams(TEXT, JSONB) TO service_role;

-- Samlet, atomisk registrering av prosjekt, integrasjonskonfigurasjon,
-- topic board og eventuelle kontraktsteams i én transaksjon.
CREATE OR REPLACE FUNCTION public.koe_register_project(
    p_project_id TEXT,
    p_name TEXT,
    p_description TEXT,
    p_catenda_project_id UUID,
    p_library_id UUID,
    p_folder_id UUID DEFAULT NULL,
    p_topic_board_id UUID DEFAULT NULL,
    p_teams JSONB DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_item JSONB;
    v_team_id UUID;
    v_role TEXT;
    v_has_bh BOOLEAN := FALSE;
    v_has_te BOOLEAN := FALSE;
BEGIN
    -- 1. Prosjekt i projects-tabellen
    INSERT INTO public.projects (id, name, description, is_active, created_by)
    VALUES (p_project_id, p_name, COALESCE(p_description, 'Prosjekt ' || p_name), TRUE, 'admin_cli')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = TRUE;

    -- 2. Catenda prosjektkonfigurasjon
    INSERT INTO public.catenda_project_configs (
        internal_project_id, catenda_project_id, library_id, folder_id, is_active
    )
    VALUES (
        p_project_id, p_catenda_project_id, p_library_id, p_folder_id, TRUE
    )
    ON CONFLICT (internal_project_id) DO UPDATE SET
        catenda_project_id = EXCLUDED.catenda_project_id,
        library_id = EXCLUDED.library_id,
        folder_id = EXCLUDED.folder_id,
        is_active = TRUE;

    -- 3. Topic board konfigurasjon dersom oppgitt
    IF p_topic_board_id IS NOT NULL THEN
        INSERT INTO public.catenda_topic_board_configs (
            topic_board_id, internal_project_id, is_active
        )
        VALUES (
            p_topic_board_id, p_project_id, TRUE
        )
        ON CONFLICT (topic_board_id) DO UPDATE SET
            internal_project_id = EXCLUDED.internal_project_id,
            is_active = TRUE;
    END IF;

    -- 4. Kontraktsteam dersom oppgitt
    IF p_teams IS NOT NULL AND jsonb_typeof(p_teams) = 'array' AND jsonb_array_length(p_teams) > 0 THEN
        DELETE FROM public.catenda_contract_teams
        WHERE internal_project_id = p_project_id;

        FOR v_item IN SELECT * FROM jsonb_array_elements(p_teams)
        LOOP
            v_team_id := (v_item->>'team_id')::UUID;
            v_role := (v_item->>'contract_role')::TEXT;

            IF v_role NOT IN ('BH', 'TE') THEN
                RAISE EXCEPTION 'Ugyldig contract_role: % (må være BH eller TE)', v_role;
            END IF;

            IF v_role = 'BH' THEN
                v_has_bh := TRUE;
            ELSIF v_role = 'TE' THEN
                v_has_te := TRUE;
            END IF;

            INSERT INTO public.catenda_contract_teams (internal_project_id, team_id, contract_role)
            VALUES (p_project_id, v_team_id, v_role);
        END LOOP;

        IF NOT (v_has_bh AND v_has_te) THEN
            RAISE EXCEPTION 'Både BH og TE må være representert i p_teams';
        END IF;
    END IF;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.koe_register_project(TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.koe_register_project(TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB) TO service_role;
