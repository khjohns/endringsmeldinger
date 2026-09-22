-- Mutasjon: skrivevakten fjernet. service_role-sjekkene skal bli røde.
DROP TRIGGER a_skrivevakt ON public.hendelse;
DROP TRIGGER a_skrivevakt_truncate ON public.hendelse;
