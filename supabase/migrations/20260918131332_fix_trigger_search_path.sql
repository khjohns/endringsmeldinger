-- Funksjonen arvet kallerens search_path (Supabase-linten
-- function_search_path_mutable). Den bruker bare NOW(), som ligger i
-- pg_catalog, så et tomt search_path er nok.
ALTER FUNCTION public.set_catenda_project_registry_updated_at() SET search_path = '';
