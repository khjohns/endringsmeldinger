-- Notatpolicyen filtrerer bare på prosjekt.
DROP POLICY runtime_les ON public.notat;
CREATE POLICY runtime_les ON public.notat FOR SELECT TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id()));
