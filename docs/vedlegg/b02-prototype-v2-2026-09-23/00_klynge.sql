-- Klyngeroller som i gwdxadexwktegkklyobv (D 22.–23.09). Kjøres som
-- supabase_admin, den eneste superbrukeren, slik plattformen gjør.
-- postgres er ikke superbruker: den eier objektene og kjører migrasjonene.
CREATE ROLE postgres LOGIN NOSUPERUSER CREATEROLE BYPASSRLS INHERIT;
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT;
GRANT anon, authenticated, service_role TO authenticator WITH INHERIT FALSE, SET TRUE;
GRANT anon, authenticated, service_role, authenticator TO postgres
    WITH ADMIN TRUE, INHERIT TRUE, SET TRUE;

-- I vanlig PostgreSQL 17 får ikke postgres sette en PostgREST-parameter på
-- authenticator uten denne rettigheten. Supabase dokumenterer operasjonen for
-- postgres; hvordan plattformen tillater den, er ikke kontrollert.
GRANT SET ON PARAMETER pgrst.db_pre_request TO postgres;
