-- RB2-04: teamkravet godtas uten å være et av prosjektets kontraktsteam på den siden.
CREATE OR REPLACE FUNCTION koe_privat.privat_team() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT koe_privat.team_krav() WHERE koe_privat.har_handlingsrett()
$$;
