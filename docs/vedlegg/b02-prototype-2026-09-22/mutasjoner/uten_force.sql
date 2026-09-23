-- RB2-review: beviset bruker ingen tabelleier uten BYPASSRLS.
ALTER TABLE public.hendelse NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notat NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sak_metadata NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.app_project_memberships NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.utgaende_levering NO FORCE ROW LEVEL SECURITY;
