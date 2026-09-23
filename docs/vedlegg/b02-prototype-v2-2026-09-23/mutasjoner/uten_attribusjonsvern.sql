-- RB2-02: skrivevakten på sak_metadata fjernet. Saksattribusjonen kan skrives om.
DROP TRIGGER a_skrivevakt ON public.sak_metadata;
