-- RB2-04: forventet versjon kontrolleres ikke. NULL passerer konfliktsjekken.
CREATE OR REPLACE FUNCTION koe_privat.gyldig_versjon(p_versjon INTEGER) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$ SELECT true $$;
