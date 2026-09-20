-- Tenant-attribusjon: prosjekt_id på hendelsene og relasjonsindeksen.
--
-- Uten kolonnen kan en rads prosjekttilhørighet bare utledes av `source`, som
-- skrives av ce_source — en av oslobygg-fallbackene. En rad som sier oslobygg
-- kan derfor bety «hører virkelig til Oslobygg» eller «prosjektet manglet, og
-- et fallback fylte inn», og de to lar seg ikke skille i ettertid.
--
-- Kolonnen er NOT NULL uten default med vilje. En default ville gjeninnført
-- nøyaktig den tvetydigheten migrasjonen fjerner. Alle fire tabellene er tomme
-- (kontrollert 2026-09-20: 0 rader), så det finnes ingenting å backfille og
-- ingen rad som kan bli feilmerket.
--
-- Event-tabellene opprettes ikke av noen migrasjon i repoet — DDL-en ligger i
-- docstringen øverst i backend/repositories/supabase_event_repository.py — så
-- hvert steg er betinget av at tabellen faktisk finnes.
--
-- ANVENDT mot prosjekt gwdxadexwktegkklyobv 2026-09-20 som migrasjonen
-- `tenant_attribution_prosjekt_id`, og verifisert mot katalogen etterpå.
-- Repoets migrasjonsmappe og basen har drevet fra hverandre i begge retninger
-- før (se masterplanens arbeidspakke om databasearkitektur), så denne fila er
-- protokollen over hva som faktisk ble kjørt — ikke en plan om å kjøre det.

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'koe_events',
        'forsering_events',
        'endringsordre_events',
        'sak_relations'
    ]
    LOOP
        IF to_regclass('public.' || v_table) IS NULL THEN
            RAISE NOTICE 'Hopper over %: tabellen finnes ikke', v_table;
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS prosjekt_id TEXT',
            v_table
        );

        -- Fail-closed: en rad uten prosjekt hører ikke til noe prosjekt, og
        -- skal ikke kunne skrives i det hele tatt.
        EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN prosjekt_id SET NOT NULL',
            v_table
        );

        EXECUTE format(
            'COMMENT ON COLUMN public.%I.prosjekt_id IS %L',
            v_table,
            'Appens interne prosjekt-ID. Settes av serveren fra autorisert '
            'kontekst, aldri av klienten og aldri av et fallback. Grunnlaget '
            'for tenant-isolering i RLS.'
        );

        -- Grensen skal kunne uttrykkes som en RLS-policy uten full skanning.
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON public.%I (prosjekt_id)',
            'idx_' || v_table || '_prosjekt_id',
            v_table
        );
    END LOOP;
END;
$$;

-- Den fjerde fallbacken: databasens egen default tilordnet enhver sak uten
-- oppgitt prosjekt til Oslobygg, uten spor.
ALTER TABLE public.sak_metadata ALTER COLUMN prosjekt_id DROP DEFAULT;

COMMENT ON COLUMN public.sak_metadata.prosjekt_id IS
    'Appens interne prosjekt-ID. NOT NULL uten default: en sak uten prosjekt '
    'skal avvises ved skriving framfor å bli tilordnet Oslobygg i stillhet.';
