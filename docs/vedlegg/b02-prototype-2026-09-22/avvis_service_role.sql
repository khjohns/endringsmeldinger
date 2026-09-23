-- RB2-01: lokalt transportforsøk, ikke en migrasjon eller komplett API-policy.
CREATE FUNCTION public.review_sjekk_rolle() RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF current_user = 'service_role' THEN
        RAISE EXCEPTION 'service_role avvist av reviewets forespørselsvakt'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_sjekk_rolle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_sjekk_rolle()
    TO koe_runtime, anon, authenticated, service_role;
ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.review_sjekk_rolle';
