-- Mutasjon: journalpolicyen stoler på prosjektet i konteksten uten å slå opp medlemskap.
DROP POLICY runtime_les ON public.hendelse;
CREATE POLICY runtime_les ON public.hendelse FOR SELECT TO koe_runtime
    USING (prosjekt_id = (SELECT koe_privat.prosjekt_id()));
