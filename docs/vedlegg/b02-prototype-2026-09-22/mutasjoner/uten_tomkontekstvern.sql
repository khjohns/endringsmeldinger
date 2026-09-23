-- RB2-review: tom sesjonsvariabel sendes rett til JSON-parseren etter commit.
CREATE OR REPLACE FUNCTION koe_privat.krav(p_navn TEXT) RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> p_navn, '')
$$;
