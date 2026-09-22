-- Anvendt mot gwdxadexwktegkklyobv 2026-09-21 som versjon 20260921091208.
--
-- KR-01: koe_register_project skrev ikke organisasjon_id.
--
-- 20260920192448 gjorde kolonnen NOT NULL uten default, men lot denne
-- funksjonen stå. Postgres skrankesjekker raden før ON CONFLICT løses, så
-- ikke bare nyregistrering feilet — også en ny registrering av et prosjekt
-- som allerede fantes. Se docs/audit-korrekthet-2026-09-21.md (KR-01).
--
-- Signaturen endres, og CREATE OR REPLACE ville da lagt en overlast ved siden
-- av den gamle. Begge ville vært kallbare, og PostgREST velger på navngitte
-- argumenter. Den gamle slippes derfor først, og rettighetene settes på nytt:
-- en ny funksjon arver ikke ACL-en til den den erstatter.
--
-- organisasjon_id settes ikke i ON CONFLICT-grenen. Å registrere et prosjekt
-- på nytt skal ikke kunne flytte det til en annen virksomhet.

DROP FUNCTION IF EXISTS public.koe_register_project(TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB);

CREATE FUNCTION public.koe_register_project(
    p_project_id TEXT,
    p_name TEXT,
    p_description TEXT,
    p_organisasjon_id TEXT,
    p_catenda_project_id UUID,
    p_library_id UUID,
    p_folder_id UUID DEFAULT NULL::uuid,
    p_topic_board_id UUID DEFAULT NULL::uuid,
    p_teams JSONB DEFAULT NULL::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
    BEGIN
        IF p_organisasjon_id IS NULL OR btrim(p_organisasjon_id) = '' THEN
            RAISE EXCEPTION 'organisasjon_id er påkrevd; det finnes ingen defaultvirksomhet';
        END IF;

        INSERT INTO public.projects (
            id, name, description, organisasjon_id, is_active, created_by
        )
        VALUES (
            p_project_id,
            p_name,
            COALESCE(p_description, 'Prosjekt ' || p_name),
            btrim(p_organisasjon_id),
            TRUE,
            'admin_cli'
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            is_active = TRUE;

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

        IF p_teams IS NOT NULL THEN
            PERFORM public.koe_set_contract_teams(p_project_id, p_teams);
        END IF;

        RETURN TRUE;
    END;
    $function$;

REVOKE ALL ON FUNCTION public.koe_register_project(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.koe_register_project(TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, JSONB) TO service_role;;
