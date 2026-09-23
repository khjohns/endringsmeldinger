-- RB2-03: kommandoene sjekker at saken finnes, ikke at den hører til prosjektet.
CREATE OR REPLACE FUNCTION koe_privat.sak_i_prosjekt(p_sak_id TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (SELECT 1 FROM public.sak_metadata WHERE sak_id = p_sak_id)
$$;
