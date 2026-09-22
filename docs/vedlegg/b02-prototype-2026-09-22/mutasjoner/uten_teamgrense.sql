-- Mutasjon: notatpolicyen filtrerer bare på prosjekt. Team- og motpartsjekkene skal bli røde.
DROP POLICY runtime_les ON public.notat;
CREATE POLICY runtime_les ON public.notat FOR SELECT TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id()));
