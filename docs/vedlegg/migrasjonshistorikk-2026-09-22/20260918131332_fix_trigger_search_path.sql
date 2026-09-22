-- Funksjonen arvet kallerens search_path. Den bruker bare NOW(), som ligger i
-- pg_catalog, så et tomt search_path er nok og fjerner muligheten for at en
-- rolle med egen schema kan påvirke hva som kalles.
ALTER FUNCTION public.set_catenda_project_registry_updated_at() SET search_path = '';;
