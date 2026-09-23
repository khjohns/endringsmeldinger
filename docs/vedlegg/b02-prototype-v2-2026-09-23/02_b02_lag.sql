-- B-02-prototype v2: alternativ C etter reviewet (RB2-01–08).
--
-- IKKE EN MIGRASJON. Kjøres av kjor.sh mot en kastbar base, som postgres uten
-- superbrukerrettigheter, slik en migrasjon kjøres i Supabase.
-- Designet står i docs/design-b02-tilgangsmekanisme-v2-2026-09-23.md.

-- Roller ---------------------------------------------------------------------

CREATE ROLE koe_runtime NOLOGIN NOINHERIT;
-- T2: runtime logger inn selv. Ikke medlem av service_role eller authenticator.
CREATE ROLE koe_runtime_login LOGIN NOINHERIT;
CREATE ROLE koe_worker LOGIN NOINHERIT;
-- Funksjonseiere. Ingen er medlem av dem etter at laget er lagt på.
CREATE ROLE koe_kommando NOLOGIN NOINHERIT;
CREATE ROLE koe_identitet NOLOGIN NOINHERIT;

GRANT koe_runtime TO authenticator WITH INHERIT FALSE, SET TRUE;
GRANT koe_runtime TO koe_runtime_login WITH INHERIT FALSE, SET TRUE;

-- Langvarige transaksjoner holder på en gammel autorisasjon (RB2-07).
ALTER ROLE koe_runtime_login SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE koe_runtime_login SET statement_timeout = '8s';

-- Ingen midlertidige objekter for andre enn eieren (RB2-02).
DO $$ BEGIN
    EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
END $$;

CREATE SCHEMA koe_privat;
CREATE SCHEMA koe_api;
CREATE SCHEMA koe_vakt;
REVOKE ALL ON SCHEMA koe_privat, koe_api, koe_vakt FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA koe_privat REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA koe_api REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA koe_vakt REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Kontekst (RB2-04) ------------------------------------------------------------

-- Bare JSON-strenger teller. Et objekt, en liste eller en tom streng er fravær.
CREATE FUNCTION koe_privat.krav(p_navn TEXT) RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT CASE WHEN jsonb_typeof(k -> p_navn) = 'string' THEN nullif(k ->> p_navn, '') END
    FROM (SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb AS k) s
$$;

CREATE FUNCTION koe_privat.aktor_id() RETURNS UUID
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT CASE WHEN v ~* '^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$'
                THEN v::uuid END
    FROM (SELECT koe_privat.krav('koe_aktor') AS v) s
$$;

CREATE FUNCTION koe_privat.prosjekt_id() RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$ SELECT koe_privat.krav('koe_prosjekt') $$;

CREATE FUNCTION koe_privat.side() RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT s FROM (SELECT koe_privat.krav('koe_side') AS s) k WHERE s IN ('TE', 'BH')
$$;

-- Teamkravet i catenda_id()-form: 32 små heksadesimale tegn.
CREATE FUNCTION koe_privat.team_krav() RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT t FROM (SELECT koe_privat.krav('koe_team') AS t) k WHERE t ~ '^[0-9a-f]{32}$'
$$;

CREATE FUNCTION koe_privat.er_medlem() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.app_project_memberships m
        WHERE m.project_id = koe_privat.prosjekt_id()
          AND m.user_id = koe_privat.aktor_id()
          AND m.active)
$$;

-- Handlingsrett: aktivt medlem, ikke leserolle, og gyldig side.
CREATE FUNCTION koe_privat.har_handlingsrett() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT koe_privat.side() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.app_project_memberships m
        WHERE m.project_id = koe_privat.prosjekt_id()
          AND m.user_id = koe_privat.aktor_id()
          AND m.active AND NOT m.viewer_override)
$$;

-- Basen kan ikke vite om brukeren sitter i teamet (TM-03), men den kan kreve
-- at teamet er et av prosjektets kontraktsteam, på den oppgitte siden.
CREATE FUNCTION koe_privat.privat_team() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT koe_privat.team_krav()
    WHERE koe_privat.har_handlingsrett()
      AND EXISTS (
        SELECT 1 FROM public.catenda_contract_teams t
        WHERE t.internal_project_id = koe_privat.prosjekt_id()
          AND t.team_id = koe_privat.team_krav()::uuid
          AND t.contract_role = koe_privat.side())
$$;

CREATE FUNCTION koe_privat.sak_i_prosjekt(p_sak_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (SELECT 1 FROM public.sak_metadata
                   WHERE sak_id = p_sak_id AND prosjekt_id = koe_privat.prosjekt_id())
$$;

CREATE FUNCTION koe_privat.gyldig_versjon(p_versjon INTEGER) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
    SELECT p_versjon IS NOT NULL AND p_versjon >= 0
$$;

-- Skrivevakt (RB2-02) ------------------------------------------------------------

-- TG_ARGV[0]: roller som får INSERT. TG_ARGV[1]: roller som får UPDATE.
-- TG_ARGV[2]: kolonner som aldri endres. DELETE og TRUNCATE avvises alltid.
CREATE FUNCTION koe_privat.skrivevakt() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_kolonne TEXT;
BEGIN
    IF TG_OP = 'INSERT' AND current_user::text = ANY (string_to_array(TG_ARGV[0], ',')) THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND current_user::text = ANY (string_to_array(TG_ARGV[1], ',')) THEN
        FOREACH v_kolonne IN ARRAY string_to_array(TG_ARGV[2], ',') LOOP
            IF to_jsonb(NEW) -> v_kolonne IS DISTINCT FROM to_jsonb(OLD) -> v_kolonne THEN
                RAISE EXCEPTION '%.% kan ikke endres', TG_TABLE_NAME, v_kolonne
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
        END LOOP;
        RETURN NEW;
    END IF;
    RAISE EXCEPTION '% på % som % er avvist', TG_OP, TG_TABLE_NAME, current_user
        USING ERRCODE = 'insufficient_privilege';
END $$;

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

-- Saksattribusjon og leveringsreferanser holdes sammen av skranker (RB2-02/03).
ALTER TABLE public.sak_metadata
    ADD CONSTRAINT sak_metadata_sak_prosjekt UNIQUE (sak_id, prosjekt_id);
ALTER TABLE public.hendelse
    ADD CONSTRAINT hendelse_event_prosjekt UNIQUE (event_id, prosjekt_id),
    ADD CONSTRAINT fk_hendelse_sak_prosjekt FOREIGN KEY (sak_id, prosjekt_id)
        REFERENCES public.sak_metadata (sak_id, prosjekt_id);
ALTER TABLE public.notat
    ADD CONSTRAINT fk_notat_sak_prosjekt FOREIGN KEY (sak_id, prosjekt_id)
        REFERENCES public.sak_metadata (sak_id, prosjekt_id);
ALTER TABLE public.utgaende_levering
    ADD CONSTRAINT fk_levering_hendelse FOREIGN KEY (event_id, prosjekt_id)
        REFERENCES public.hendelse (event_id, prosjekt_id);

CREATE TRIGGER a_skrivevakt BEFORE INSERT OR UPDATE OR DELETE ON public.hendelse
    FOR EACH ROW EXECUTE FUNCTION koe_privat.skrivevakt('koe_kommando', '', '');
CREATE TRIGGER a_skrivevakt BEFORE INSERT OR UPDATE OR DELETE ON public.sak_metadata
    FOR EACH ROW EXECUTE FUNCTION koe_privat.skrivevakt(
        'koe_kommando', 'koe_kommando', 'sak_id,prosjekt_id,sakstype,created_at,created_by');
CREATE TRIGGER a_skrivevakt BEFORE INSERT OR UPDATE OR DELETE ON public.utgaende_levering
    FOR EACH ROW EXECUTE FUNCTION koe_privat.skrivevakt(
        'koe_kommando', 'koe_kommando,koe_worker', 'id,prosjekt_id,event_id');
CREATE TRIGGER a_skrivevakt_truncate BEFORE TRUNCATE ON public.hendelse
    FOR EACH STATEMENT EXECUTE FUNCTION koe_privat.skrivevakt('', '', '');
CREATE TRIGGER a_skrivevakt_truncate BEFORE TRUNCATE ON public.sak_metadata
    FOR EACH STATEMENT EXECUTE FUNCTION koe_privat.skrivevakt('', '', '');
CREATE TRIGGER a_skrivevakt_truncate BEFORE TRUNCATE ON public.utgaende_levering
    FOR EACH STATEMENT EXECUTE FUNCTION koe_privat.skrivevakt('', '', '');

-- Rettigheter ----------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO koe_runtime, koe_worker, koe_kommando, koe_identitet;
GRANT USAGE ON SCHEMA koe_privat TO koe_runtime, koe_kommando, koe_identitet;
GRANT USAGE ON SCHEMA koe_api TO koe_runtime;

-- TM-07: monteringsrett, tømming og referanser tas fra service_role.
REVOKE TRUNCATE, TRIGGER, REFERENCES
    ON public.hendelse, public.sak_metadata, public.utgaende_levering, public.notat
    FROM service_role;
REVOKE ALL ON public.utgaende_levering FROM anon, authenticated;

ALTER TABLE public.hendelse FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notat FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sak_metadata FORCE ROW LEVEL SECURITY;
ALTER TABLE public.utgaende_levering FORCE ROW LEVEL SECURITY;

-- Runtime leser. All skriving går gjennom kommandoer, også for notater (RB2-03).
GRANT SELECT ON public.hendelse, public.sak_metadata, public.notat TO koe_runtime;

CREATE POLICY runtime_les ON public.hendelse FOR SELECT TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id())
           AND (SELECT koe_privat.er_medlem()));
CREATE POLICY runtime_les ON public.sak_metadata FOR SELECT TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id())
           AND (SELECT koe_privat.er_medlem()));
CREATE POLICY runtime_les ON public.notat FOR SELECT TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id())
           AND aktor_team_id = (SELECT koe_privat.privat_team()));

GRANT SELECT, INSERT ON public.hendelse TO koe_kommando;
GRANT SELECT, INSERT, UPDATE (last_event_at) ON public.sak_metadata TO koe_kommando;
GRANT SELECT, INSERT, DELETE ON public.notat TO koe_kommando;
GRANT INSERT ON public.utgaende_levering TO koe_kommando;
CREATE POLICY kommando ON public.hendelse FOR ALL TO koe_kommando USING (true) WITH CHECK (true);
CREATE POLICY kommando ON public.sak_metadata FOR ALL TO koe_kommando USING (true) WITH CHECK (true);
CREATE POLICY kommando ON public.notat FOR ALL TO koe_kommando USING (true) WITH CHECK (true);
CREATE POLICY kommando ON public.utgaende_levering FOR INSERT TO koe_kommando WITH CHECK (true);

GRANT SELECT ON public.hendelse, public.utgaende_levering TO koe_worker;
GRANT UPDATE (status, lease_token, lease_utloper) ON public.utgaende_levering TO koe_worker;
CREATE POLICY worker ON public.hendelse FOR SELECT TO koe_worker USING (true);
CREATE POLICY worker ON public.utgaende_levering FOR ALL TO koe_worker USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.app_users, public.app_identities,
    public.app_project_memberships, public.app_membership_sync TO koe_identitet;
GRANT SELECT ON public.catenda_project_configs, public.catenda_contract_teams,
    public.sak_metadata TO koe_identitet;
CREATE POLICY identitet ON public.app_users FOR ALL TO koe_identitet USING (true) WITH CHECK (true);
CREATE POLICY identitet ON public.app_identities FOR ALL TO koe_identitet USING (true) WITH CHECK (true);
CREATE POLICY identitet ON public.app_project_memberships FOR ALL TO koe_identitet USING (true) WITH CHECK (true);
CREATE POLICY identitet ON public.app_membership_sync FOR ALL TO koe_identitet USING (true) WITH CHECK (true);
CREATE POLICY identitet ON public.catenda_project_configs FOR SELECT TO koe_identitet USING (true);
CREATE POLICY identitet ON public.catenda_contract_teams FOR SELECT TO koe_identitet USING (true);
CREATE POLICY identitet ON public.sak_metadata FOR SELECT TO koe_identitet USING (true);
-- Dagens identitetsfunksjoner står urørt. Bare de smale inngangene kaller dem.
GRANT EXECUTE ON FUNCTION public.koe_resolve_identity(TEXT, TEXT, TEXT, TEXT, TEXT),
    public.koe_reconcile_memberships(TEXT, UUID, JSONB, TIMESTAMPTZ) TO koe_identitet;

-- Kommandoer -------------------------------------------------------------------

CREATE FUNCTION koe_api.opprett_sak(p_sak_id TEXT, p_sakstype TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF p_sak_id IS NULL OR p_sak_id = '' THEN
        RAISE EXCEPTION 'ugyldig argument' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF NOT koe_privat.har_handlingsrett() THEN
        RAISE EXCEPTION 'mangler gyldig kontekst' USING ERRCODE = 'insufficient_privilege';
    END IF;
    INSERT INTO public.sak_metadata (sak_id, prosjekt_id, created_by, sakstype)
    VALUES (p_sak_id, koe_privat.prosjekt_id(), koe_privat.aktor_id()::text, p_sakstype);
    RETURN p_sak_id;
END $$;

CREATE FUNCTION koe_api.send_varsel(
    p_sak_id TEXT, p_type TEXT, p_data JSONB, p_forventet_versjon INTEGER
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_prosjekt TEXT := koe_privat.prosjekt_id();
    v_neste INTEGER;
    v_event UUID := gen_random_uuid();
BEGIN
    IF p_sak_id IS NULL OR p_type IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object'
       OR NOT koe_privat.gyldig_versjon(p_forventet_versjon) THEN
        RAISE EXCEPTION 'ugyldig argument' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF NOT koe_privat.har_handlingsrett() THEN
        RAISE EXCEPTION 'mangler gyldig kontekst' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_type NOT IN ('grunnlag_varsel', 'vederlag_krav', 'frist_krav') THEN
        RAISE EXCEPTION 'hendelsestypen % har egen kommando', p_type
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NOT koe_privat.sak_i_prosjekt(p_sak_id) THEN
        RAISE EXCEPTION 'ukjent sak' USING ERRCODE = 'insufficient_privilege';
    END IF;
    PERFORM 1 FROM public.sak_metadata WHERE sak_id = p_sak_id FOR UPDATE;
    SELECT coalesce(max(versjon), 0) + 1 INTO v_neste
        FROM public.hendelse WHERE sak_id = p_sak_id;
    IF v_neste <> p_forventet_versjon + 1 THEN
        -- Ikke 40001: PostgREST ser ut til å kjøre det om igjen (TM-05).
        RAISE EXCEPTION 'versjonskonflikt' USING ERRCODE = 'PT409';
    END IF;
    INSERT INTO public.hendelse (event_id, source, type, subject, actorid, actorrole,
        actorteam, data, sak_id, event_type, versjon, prosjekt_id)
    VALUES (v_event, 'koe', p_type, p_sak_id, koe_privat.aktor_id()::text, koe_privat.side(),
        koe_privat.privat_team(), p_data, p_sak_id, p_type, v_neste, v_prosjekt);
    UPDATE public.sak_metadata SET last_event_at = now() WHERE sak_id = p_sak_id;
    INSERT INTO public.utgaende_levering (prosjekt_id, event_id) VALUES (v_prosjekt, v_event);
    RETURN v_event;
END $$;

-- Notater: serveren lager ID-en, saken kontrolleres før skranken, og alle
-- avvisninger er like (RB2-03).
CREATE FUNCTION koe_api.skriv_notat(p_sak_id TEXT, p_tekst TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_team TEXT := koe_privat.privat_team();
    v_id UUID := gen_random_uuid();
BEGIN
    IF p_sak_id IS NULL OR p_tekst IS NULL OR p_tekst = '' THEN
        RAISE EXCEPTION 'ugyldig argument' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    IF v_team IS NULL OR NOT koe_privat.sak_i_prosjekt(p_sak_id) THEN
        RAISE EXCEPTION 'ukjent sak' USING ERRCODE = 'insufficient_privilege';
    END IF;
    INSERT INTO public.notat (notat_id, sak_id, prosjekt_id, aktor_id, aktor_rolle,
        aktor_team_id, tekst)
    VALUES (v_id, p_sak_id, koe_privat.prosjekt_id(), koe_privat.aktor_id()::text,
        koe_privat.side(), v_team, p_tekst);
    RETURN v_id;
END $$;

-- Samme svar for ukjent notat og andres notat.
CREATE FUNCTION koe_api.slett_notat(p_notat_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    DELETE FROM public.notat
    WHERE notat_id = p_notat_id
      AND prosjekt_id = koe_privat.prosjekt_id()
      AND aktor_team_id = koe_privat.privat_team()
      AND aktor_id = koe_privat.aktor_id()::text;
    RETURN FOUND;
END $$;

-- Identitet (RB2-05) -------------------------------------------------------------

-- Issuer og provider er låst; subjektet må ha catenda_id()-formen.
CREATE FUNCTION koe_api.catenda_identitet(p_subject TEXT, p_email TEXT, p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF p_subject IS NULL OR p_subject !~ '^[0-9a-f]{32}$' THEN
        RAISE EXCEPTION 'ugyldig subjekt' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    RETURN public.koe_resolve_identity('catenda', 'https://api.catenda.com', p_subject,
        coalesce(p_email, ''), coalesce(p_name, ''));
END $$;

-- Betrodd myndighet: den som leverer øyeblikksbildet, bestemmer medlemskapene.
CREATE FUNCTION koe_api.synkroniser_medlemmer(
    p_project TEXT, p_catenda_project UUID, p_members JSONB, p_started_at TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF jsonb_typeof(p_members) IS DISTINCT FROM 'array' OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_members) m
        WHERE jsonb_typeof(m -> 'subject') IS DISTINCT FROM 'string'
           OR m ->> 'subject' !~ '^[0-9a-f]{32}$') THEN
        RAISE EXCEPTION 'ugyldig øyeblikksbilde' USING ERRCODE = 'invalid_parameter_value';
    END IF;
    RETURN public.koe_reconcile_memberships(p_project, p_catenda_project, p_members, p_started_at);
END $$;

-- Bare for beviset: viser hvilken forbindelse og rolle PostgREST brukte.
CREATE FUNCTION koe_api.hvem() RETURNS JSONB
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT jsonb_build_object(
        'pid', pg_backend_pid(),
        'rolle', current_user,
        'krav', nullif(current_setting('request.jwt.claims', true), ''))
$$;

-- Forespørselsvakt for Data API (RB2-01, RB2-07) ------------------------------

CREATE FUNCTION koe_vakt.foresporsel() RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_exp NUMERIC;
BEGIN
    IF current_user::text <> 'koe_runtime' THEN
        RAISE EXCEPTION 'rollen % er ikke tillatt i Data API', current_user
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    v_exp := CASE WHEN jsonb_typeof(nullif(current_setting('request.jwt.claims', true), '')::jsonb
                                    -> 'exp') = 'number'
                  THEN (current_setting('request.jwt.claims', true)::jsonb ->> 'exp')::numeric END;
    IF v_exp IS NULL OR v_exp > extract(epoch FROM now()) + 60 THEN
        RAISE EXCEPTION 'token må utløpe innen 60 sekunder'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
END $$;
GRANT USAGE ON SCHEMA koe_vakt TO anon, authenticated, service_role, koe_runtime;
GRANT EXECUTE ON FUNCTION koe_vakt.foresporsel() TO anon, authenticated, service_role, koe_runtime;
ALTER ROLE authenticator SET pgrst.db_pre_request = 'koe_vakt.foresporsel';

-- Rettigheter på funksjonene ---------------------------------------------------

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA koe_privat, koe_api FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA koe_privat TO koe_runtime, koe_kommando, koe_identitet;
REVOKE EXECUTE ON FUNCTION koe_privat.skrivevakt() FROM koe_runtime, koe_kommando, koe_identitet;
GRANT EXECUTE ON FUNCTION koe_api.opprett_sak(TEXT, TEXT),
    koe_api.send_varsel(TEXT, TEXT, JSONB, INTEGER),
    koe_api.skriv_notat(TEXT, TEXT),
    koe_api.slett_notat(UUID),
    koe_api.catenda_identitet(TEXT, TEXT, TEXT),
    koe_api.synkroniser_medlemmer(TEXT, UUID, JSONB, TIMESTAMPTZ),
    koe_api.hvem()
    TO koe_runtime;

-- Eierskifte (RB2-08) ----------------------------------------------------------

-- postgres er ikke superbruker. ALTER ... OWNER krever at den kan SET ROLE til
-- den nye eieren, og at eieren har CREATE i skjemaet. Begge gis midlertidig og
-- tas tilbake før laget er ferdig.
GRANT koe_kommando, koe_identitet TO postgres WITH INHERIT FALSE, SET TRUE;
GRANT CREATE ON SCHEMA koe_api TO koe_kommando, koe_identitet;
GRANT CREATE ON SCHEMA koe_privat TO koe_identitet;

ALTER FUNCTION koe_privat.er_medlem() OWNER TO koe_identitet;
ALTER FUNCTION koe_privat.har_handlingsrett() OWNER TO koe_identitet;
ALTER FUNCTION koe_privat.privat_team() OWNER TO koe_identitet;
ALTER FUNCTION koe_privat.sak_i_prosjekt(TEXT) OWNER TO koe_identitet;
ALTER FUNCTION koe_api.opprett_sak(TEXT, TEXT) OWNER TO koe_kommando;
ALTER FUNCTION koe_api.send_varsel(TEXT, TEXT, JSONB, INTEGER) OWNER TO koe_kommando;
ALTER FUNCTION koe_api.skriv_notat(TEXT, TEXT) OWNER TO koe_kommando;
ALTER FUNCTION koe_api.slett_notat(UUID) OWNER TO koe_kommando;
ALTER FUNCTION koe_api.catenda_identitet(TEXT, TEXT, TEXT) OWNER TO koe_identitet;
ALTER FUNCTION koe_api.synkroniser_medlemmer(TEXT, UUID, JSONB, TIMESTAMPTZ) OWNER TO koe_identitet;

REVOKE CREATE ON SCHEMA koe_api FROM koe_kommando, koe_identitet;
REVOKE CREATE ON SCHEMA koe_privat FROM koe_identitet;
REVOKE koe_kommando, koe_identitet FROM postgres;
