-- Serverstemplet Catenda-team på hendelser (aktor_team_id -> actorteam).
--
-- `internt_notat` er kun synlig for forfatterens egen organisasjon, og
-- lib/auth/event_visibility sammenlikner leserens team med dette feltet.
-- Uten kolonnen mistet Supabase-lageret feltet ved skriving: notatet kunne
-- ikke parses tilbake til InterntNotatEvent, og valideringsfeilen slo ut alle
-- senere innsendinger på saken.
--
-- Kolonnen er nullable med vilje. Hendelser skrevet før denne migrasjonen har
-- ingen kjent organisasjon, og de skal forbli skjult for alle (fail-closed)
-- framfor å bli tildelt et team i etterkant.
--
-- Event-tabellene opprettes ikke av noen migrasjon — SQL-en ligger i
-- docstringen øverst i backend/repositories/supabase_event_repository.py — så
-- hvert steg er betinget av at tabellen faktisk finnes.

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'koe_events',
        'forsering_events',
        'endringsordre_events'
    ]
    LOOP
        IF to_regclass('public.' || v_table) IS NULL THEN
            CONTINUE;
        END IF;

        EXECUTE format(
            'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS actorteam TEXT',
            v_table
        );
        EXECUTE format(
            'COMMENT ON COLUMN public.%I.actorteam IS %L',
            v_table,
            'Catenda-team-ID til aktørens organisasjon. Settes av serveren.'
        );

        -- Sikkerhet: RLS aktivert, kun tilgjengelig for backend (service_role).
        -- Samme mønster som de øvrige tabellene i dette skjemaet.
        EXECUTE format(
            'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
            v_table
        );
        EXECUTE format(
            'REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',
            v_table
        );
        EXECUTE format(
            'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role',
            v_table
        );
    END LOOP;
END;
$$;;
