-- Avstemming av backend/migrations/ mot basens faktiske skjema (DA-05).
--
-- `backend/migrations/` er merket «legacy — already applied» og skal ikke
-- redigeres. Tre steder er de likevel ikke i takt med basen. Forskjellene er
-- målt 2026-09-20 ved å bygge hele migrasjonssettet mot en tom PostgreSQL 16
-- og sammenlikne katalogen med prosjekt gwdxadexwktegkklyobv.
--
-- Mot basen er hver setning under et nullsteg. Verdien ligger i at en base
-- bygget fra repoet blir lik den som kjører.

-- 1. sak_bim_links.properties finnes i basen og i models/bim_link.py,
--    men ikke i backend/migrations/006_bim_tables.sql.
ALTER TABLE public.sak_bim_links
    ADD COLUMN IF NOT EXISTS properties JSONB;

-- 2. Basen bruker GENERATED ALWAYS AS IDENTITY der repoet skriver SERIAL.
--    Forskjellen er ikke kosmetisk: GENERATED ALWAYS avviser en klientoppgitt
--    `id`, SERIAL tar imot den.
DO $$
DECLARE
    v_table TEXT;
    v_next BIGINT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'sak_relations',
        'sak_bim_links',
        'catenda_models_cache'
    ]
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = v_table
              AND column_name = 'id' AND is_identity = 'NO'
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN id DROP DEFAULT', v_table);
            EXECUTE format(
                'DROP SEQUENCE IF EXISTS public.%I', v_table || '_id_seq');
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN id '
                'ADD GENERATED ALWAYS AS IDENTITY', v_table);

            EXECUTE format('SELECT COALESCE(MAX(id), 0) + 1 FROM public.%I',
                           v_table) INTO v_next;
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN id RESTART WITH %s',
                v_table, v_next);
        END IF;
    END LOOP;
END;
$$;

-- 3. Tre policyer står i repoet som USING (auth.role() = 'service_role') uten
--    TO-ledd, og gjelder dermed PUBLIC med et predikat. Basen har den
--    hardnede formen: TO service_role med USING (true). Samme virkning i dag,
--    men bare den siste holder om predikatet en gang skulle svikte.
DO $$
DECLARE
    v_table TEXT;
    v_policy TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'projects',
        'sak_bim_links',
        'catenda_models_cache'
    ]
    LOOP
        v_policy := 'Service role full access on ' || v_table;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                       v_policy, v_table);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO service_role '
            'USING (true) WITH CHECK (true)', v_policy, v_table);
    END LOOP;
END;
$$;

-- 4. backend/migrations/003_sak_relations.sql slår på RLS uten å opprette
--    noen policy. Basen har en. En base bygget fra repoet får dermed en
--    tabell med RLS på og ingen policy; det er fail-closed for enhver rolle
--    uten BYPASSRLS, og merkes ikke i dag fordi service_role har det.
DROP POLICY IF EXISTS "Service role full access on sak_relations"
    ON public.sak_relations;
CREATE POLICY "Service role full access on sak_relations"
    ON public.sak_relations FOR ALL TO service_role
    USING (true) WITH CHECK (true);
