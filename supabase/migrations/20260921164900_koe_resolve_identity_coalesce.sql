-- Anvendt mot gwdxadexwktegkklyobv 2026-09-21 som versjon 20260921164900.
--
-- MG-02, hindring 1: `UPDATE app_users SET email = p_email, name = p_name` var
-- ubetinget.
--
-- `app_users.email` og `name` er NOT NULL med default `''`, og kallerne sender
-- tom streng når kilden mangler feltet: `CatendaOAuth.user` gjør
-- `user.get("email") or ""`, og `koe_reconcile_memberships` gjør
-- `coalesce(m->>'email', '')`. En synkronisering eller innlogging der Catenda
-- utelater navnet, blanket derfor en ekte rad — og navnet er det
-- `lib/aktor_navn.py` slår opp for å vise hvem som handlet.
--
-- Etter dette overskriver bare en verdi som faktisk finnes. Funksjonen er
-- ellers uendret: samme signatur, samme `pg_advisory_xact_lock`, samme
-- SECURITY INVOKER og `search_path = ''`.
--
-- Definisjonen i 20260912150635 er den som var anvendt fram til nå. Den fila
-- er uforanderlig; dette er en ny migrasjon, ikke en retting av historikken.
-- Se docs/audit-maalskjema-gjennomgang-2026-09-21.md (MG-02).

CREATE OR REPLACE FUNCTION public.koe_resolve_identity(
    p_provider TEXT, p_issuer TEXT, p_subject TEXT, p_email TEXT, p_name TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_user UUID;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_provider || ':' || p_issuer || ':' || p_subject, 0));
    SELECT user_id INTO v_user FROM public.app_identities
        WHERE provider = p_provider AND issuer = p_issuer AND subject = p_subject;
    IF v_user IS NULL THEN
        INSERT INTO public.app_users(email, name)
            VALUES (coalesce(p_email, ''), coalesce(p_name, ''))
            RETURNING id INTO v_user;
        INSERT INTO public.app_identities(user_id, provider, issuer, subject)
            VALUES (v_user, p_provider, p_issuer, p_subject);
    ELSE
        UPDATE public.app_users
            SET email = coalesce(nullif(p_email, ''), email),
                name = coalesce(nullif(p_name, ''), name)
            WHERE id = v_user;
    END IF;
    RETURN v_user;
END;
$$;
