-- Skrivevakten på journalen fjernet.
DROP TRIGGER a_skrivevakt ON public.hendelse;
DROP TRIGGER a_skrivevakt_truncate ON public.hendelse;
