-- B-02-prototype: tilgangslaget lagt oppå migrasjonene i supabase/migrations/.
--
-- IKKE EN MIGRASJON. Kjøres bare mot en kastbar lokal base, av kjor.sh.
-- Designet står i docs/design-b02-tilgangsmekanisme-2026-09-22.md.
--
-- Alternativ C i designet: RLS med kontekst for lesing, skriving til journalen
-- bare gjennom SECURITY DEFINER-kommandoer, og en skrivevakt-trigger som holder
-- også når kalleren er service_role.

-- Roller ---------------------------------------------------------------------

CREATE ROLE koe_runtime NOLOGIN NOINHERIT;
-- Workeren logger inn selv (transport T2), for å vise at samme regler holder
-- utenom PostgREST.
CREATE ROLE koe_worker LOGIN NOINHERIT;
-- Eiere av funksjonene. Ingen er medlem av dem, og ingen kan logge inn som dem.
CREATE ROLE koe_kommando NOLOGIN NOINHERIT;
CREATE ROLE koe_identitet NOLOGIN NOINHERIT;

GRANT koe_runtime TO authenticator;

-- Kontekst -------------------------------------------------------------------

CREATE SCHEMA koe_privat;
REVOKE ALL ON SCHEMA koe_privat FROM PUBLIC;
GRANT USAGE ON SCHEMA koe_privat TO koe_runtime, koe_kommando, koe_identitet;

-- PostgREST legger kravene i request.jwt.claims med is_local = true. En direkte
-- forbindelse setter den samme variabelen selv, også transaksjonslokalt.
-- En variabel som har vært satt i sesjonen, er '' etter commit, ikke NULL.
CREATE FUNCTION koe_privat.krav(p_navn TEXT) RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT nullif(
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> p_navn,
        '')
$$;

CREATE FUNCTION koe_privat.aktor_id() RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT koe_privat.krav('koe_aktor') $$;

CREATE FUNCTION koe_privat.prosjekt_id() RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT koe_privat.krav('koe_prosjekt') $$;

CREATE FUNCTION koe_privat.side() RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT s FROM (SELECT koe_privat.krav('koe_side') AS s) k WHERE s IN ('TE', 'BH')
$$;

-- Medlemskapet slås opp i basen ved hver spørring. Tilbakekalling i
-- app_project_memberships virker derfor fra neste transaksjon (B-04).
CREATE FUNCTION koe_privat.er_medlem() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.app_project_memberships m
        WHERE m.project_id = koe_privat.prosjekt_id()
          AND m.user_id::text = koe_privat.aktor_id()
          AND m.active)
$$;

-- Handlingsrett: medlem, og ikke leserolle (DB-05).
CREATE FUNCTION koe_privat.har_handlingsrett() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.app_project_memberships m
        WHERE m.project_id = koe_privat.prosjekt_id()
          AND m.user_id::text = koe_privat.aktor_id()
          AND m.active AND NOT m.viewer_override)
$$;

-- Teamet kan ikke kontrolleres i basen: brukerens lagmedlemskap hentes fra
-- Catenda ved hver forespørsel og lagres ikke. Basen krever likevel gyldig
-- medlemskap og at leserollen (viewer_override) ikke gir privat innsyn.
CREATE FUNCTION koe_privat.privat_team() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT koe_privat.krav('koe_team') WHERE koe_privat.har_handlingsrett()
$$;

ALTER FUNCTION koe_privat.er_medlem() OWNER TO koe_identitet;
ALTER FUNCTION koe_privat.har_handlingsrett() OWNER TO koe_identitet;
ALTER FUNCTION koe_privat.privat_team() OWNER TO koe_identitet;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA koe_privat FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA koe_privat
    TO koe_runtime, koe_kommando, koe_identitet;

-- Utgående levering (forenklet outbox, navnet er foreløpig) -----------------

CREATE TABLE public.utgaende_levering (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    prosjekt_id TEXT NOT NULL,
    event_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'venter',
    lease_token UUID,
    lease_utloper TIMESTAMPTZ
);
ALTER TABLE public.utgaende_levering ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.utgaende_levering FROM anon, authenticated;

-- Rettigheter ----------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO koe_runtime, koe_worker, koe_kommando, koe_identitet;

ALTER TABLE public.hendelse FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notat FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sak_metadata FORCE ROW LEVEL SECURITY;
ALTER TABLE public.app_project_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.utgaende_levering FORCE ROW LEVEL SECURITY;

-- Runtime: lese journal og saker, lese og skrive egne teamnotater. Ingen
-- skriverett på hendelse, ingen TRUNCATE, ingen tilgang til identitetstabellene.
GRANT SELECT ON public.hendelse, public.sak_metadata TO koe_runtime;
GRANT SELECT, INSERT, DELETE ON public.notat TO koe_runtime;

CREATE POLICY runtime_les ON public.hendelse FOR SELECT TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id())
           AND (SELECT koe_privat.er_medlem()));
CREATE POLICY runtime_les ON public.sak_metadata FOR SELECT TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id())
           AND (SELECT koe_privat.er_medlem()));
CREATE POLICY runtime_les ON public.notat FOR SELECT TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id())
           AND aktor_team_id = (SELECT koe_privat.privat_team()));
CREATE POLICY runtime_skriv ON public.notat FOR INSERT TO koe_runtime
    WITH CHECK (prosjekt_id = (SELECT koe_privat.prosjekt_id())
                AND aktor_team_id = (SELECT koe_privat.privat_team())
                AND aktor_id = (SELECT koe_privat.aktor_id())
                AND aktor_rolle = (SELECT koe_privat.side()));
CREATE POLICY runtime_slett ON public.notat FOR DELETE TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id())
           AND aktor_team_id = (SELECT koe_privat.privat_team())
           AND aktor_id = (SELECT koe_privat.aktor_id()));

-- Kommandoeieren: autoriserer selv i funksjonen, derfor USING (true) her.
GRANT SELECT, INSERT ON public.hendelse TO koe_kommando;
GRANT SELECT, UPDATE (last_event_at) ON public.sak_metadata TO koe_kommando;
GRANT INSERT ON public.utgaende_levering TO koe_kommando;
CREATE POLICY kommando ON public.hendelse FOR ALL TO koe_kommando USING (true) WITH CHECK (true);
CREATE POLICY kommando ON public.sak_metadata FOR ALL TO koe_kommando USING (true) WITH CHECK (true);
CREATE POLICY kommando ON public.utgaende_levering FOR INSERT TO koe_kommando WITH CHECK (true);

-- Worker: leser journal og kø på tvers av prosjekter, oppdaterer bare
-- leveringsstatus. Ingen rettighet på notat: private data kan ikke nå ut.
GRANT SELECT ON public.hendelse, public.utgaende_levering TO koe_worker;
GRANT UPDATE (status, lease_token, lease_utloper) ON public.utgaende_levering TO koe_worker;
CREATE POLICY worker ON public.hendelse FOR SELECT TO koe_worker USING (true);
CREATE POLICY worker ON public.utgaende_levering FOR ALL TO koe_worker USING (true) WITH CHECK (true);

-- Identitetseieren: det dagens koe_resolve_identity og
-- koe_reconcile_memberships skriver og leser.
GRANT SELECT, INSERT, UPDATE ON public.app_users, public.app_identities,
    public.app_project_memberships, public.app_membership_sync TO koe_identitet;
GRANT SELECT ON public.catenda_project_configs TO koe_identitet;
CREATE POLICY identitet ON public.app_users FOR ALL TO koe_identitet USING (true) WITH CHECK (true);
CREATE POLICY identitet ON public.app_identities FOR ALL TO koe_identitet USING (true) WITH CHECK (true);
CREATE POLICY identitet ON public.app_project_memberships FOR ALL TO koe_identitet USING (true) WITH CHECK (true);
CREATE POLICY identitet ON public.app_membership_sync FOR ALL TO koe_identitet USING (true) WITH CHECK (true);
CREATE POLICY identitet ON public.catenda_project_configs FOR SELECT TO koe_identitet USING (true);

-- Dagens funksjoner er SECURITY INVOKER og virker bare fordi kalleren er
-- service_role. Med en avgrenset runtime må de eies av en rolle som har
-- rettighetene, og kjøres som den.
ALTER FUNCTION public.koe_resolve_identity(TEXT, TEXT, TEXT, TEXT, TEXT) SECURITY DEFINER;
ALTER FUNCTION public.koe_resolve_identity(TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO koe_identitet;
ALTER FUNCTION public.koe_reconcile_memberships(TEXT, UUID, JSONB, TIMESTAMPTZ) SECURITY DEFINER;
ALTER FUNCTION public.koe_reconcile_memberships(TEXT, UUID, JSONB, TIMESTAMPTZ) OWNER TO koe_identitet;
GRANT EXECUTE ON FUNCTION public.koe_resolve_identity(TEXT, TEXT, TEXT, TEXT, TEXT),
    public.koe_reconcile_memberships(TEXT, UUID, JSONB, TIMESTAMPTZ) TO koe_runtime;

-- Skrivevakt på journalen ------------------------------------------------------

-- Gjelder alle roller uten unntak for BYPASSRLS og tabellrettigheter:
-- service_role, en JWT med vilkårlig rolle, og kaskaden fra sak_metadata.
-- current_user er koe_kommando bare inne i en kommando som eies av den.
CREATE FUNCTION koe_privat.hendelse_skrivevakt() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF TG_OP = 'INSERT' AND current_user = 'koe_kommando' THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'hendelse er append-only: % som % er avvist', TG_OP, current_user
        USING ERRCODE = 'insufficient_privilege';
END $$;
REVOKE ALL ON FUNCTION koe_privat.hendelse_skrivevakt() FROM PUBLIC;

CREATE TRIGGER a_skrivevakt BEFORE INSERT OR UPDATE OR DELETE ON public.hendelse
    FOR EACH ROW EXECUTE FUNCTION koe_privat.hendelse_skrivevakt();
CREATE TRIGGER a_skrivevakt_truncate BEFORE TRUNCATE ON public.hendelse
    FOR EACH STATEMENT EXECUTE FUNCTION koe_privat.hendelse_skrivevakt();

-- Kommandoer -------------------------------------------------------------------

CREATE SCHEMA koe_api;
REVOKE ALL ON SCHEMA koe_api FROM PUBLIC;
GRANT USAGE ON SCHEMA koe_api TO koe_runtime, anon, authenticated, service_role;
-- ALTER OWNER krever at den nye eieren kan opprette i skjemaet, når den som
-- kjører migrasjonen ikke er superbruker (postgres i Supabase er det ikke).
GRANT CREATE ON SCHEMA koe_api TO koe_kommando;

-- Én kommando for ordinære varsler. Ikke en generell append: typer som krever
-- godkjenning, har egne kommandoer (F2) og avvises her.
CREATE FUNCTION koe_api.send_varsel(
    p_sak_id TEXT, p_type TEXT, p_data JSONB, p_forventet_versjon INTEGER
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_prosjekt TEXT := koe_privat.prosjekt_id();
    v_aktor TEXT := koe_privat.aktor_id();
    v_side TEXT := koe_privat.side();
    v_neste INTEGER;
    v_event UUID := gen_random_uuid();
BEGIN
    IF v_prosjekt IS NULL OR v_aktor IS NULL OR v_side IS NULL
       OR NOT koe_privat.har_handlingsrett() THEN
        RAISE EXCEPTION 'mangler gyldig kontekst' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_type NOT IN ('grunnlag_varsel', 'vederlag_krav', 'frist_krav') THEN
        RAISE EXCEPTION 'hendelsestypen % har egen kommando', p_type
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    -- Gjettet sak-ID fra et annet prosjekt gir samme svar som en ukjent.
    PERFORM 1 FROM public.sak_metadata
        WHERE sak_id = p_sak_id AND prosjekt_id = v_prosjekt FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ukjent sak' USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT coalesce(max(versjon), 0) + 1 INTO v_neste
        FROM public.hendelse WHERE sak_id = p_sak_id;
    IF v_neste <> p_forventet_versjon + 1 THEN
        -- Ikke 40001: PostgREST prøver serialiseringsfeil på nytt i det uendelige.
        RAISE EXCEPTION 'versjonskonflikt' USING ERRCODE = 'PT409';
    END IF;
    INSERT INTO public.hendelse (event_id, source, type, subject, actorid, actorrole,
        actorteam, data, sak_id, event_type, versjon, prosjekt_id)
    VALUES (v_event, 'koe', p_type, p_sak_id, v_aktor, v_side,
        koe_privat.krav('koe_team'), p_data, p_sak_id, p_type, v_neste, v_prosjekt);
    UPDATE public.sak_metadata SET last_event_at = now() WHERE sak_id = p_sak_id;
    INSERT INTO public.utgaende_levering (prosjekt_id, event_id) VALUES (v_prosjekt, v_event);
    RETURN v_event;
END $$;

-- Bare for beviset: viser hvilken forbindelse og rolle PostgREST brukte.
CREATE FUNCTION koe_api.hvem() RETURNS JSONB
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT jsonb_build_object(
        'pid', pg_backend_pid(),
        'rolle', current_user,
        'krav', nullif(current_setting('request.jwt.claims', true), ''))
$$;

ALTER FUNCTION koe_api.send_varsel(TEXT, TEXT, JSONB, INTEGER) OWNER TO koe_kommando;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA koe_api FROM PUBLIC;
GRANT EXECUTE ON FUNCTION koe_api.send_varsel(TEXT, TEXT, JSONB, INTEGER) TO koe_runtime;
GRANT EXECUTE ON FUNCTION koe_api.hvem() TO koe_runtime, anon, authenticated, service_role;
