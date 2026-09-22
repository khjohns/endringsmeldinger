-- Plattformstubb for en kastbar PostgreSQL som skal bygges fra
-- supabase/migrations/. Kjøres én gang mot en tom base, før første migrasjon,
-- som den samme rollen som kjører migrasjonene (postgres i Supabase).
--
-- ALT I DENNE FILA KOMMER FRA SUPABASE-PLATTFORMEN, IKKE FRA MIGRASJONENE.
-- Supabase oppretter rollene, auth-skjemaet og rettighetene under ved
-- prosjektoppsett. Migrasjonene forutsetter dem uten å opprette dem. Flyttes
-- basen bort fra Supabase, må noen andre gjøre det stubben gjør her.
--
-- Stubben er ikke modellen for en framtidig runtime-rolle. Den rollen
-- avgjøres i B-02 (hovedplanen).
--
-- Rettighetene er gjengitt slik plattformen gir dem, også til anon og
-- authenticated. Ellers ville en test av at migrasjonene har tatt dem bort
-- (20260918131137, 20260918131223) bestå uten at migrasjonene gjorde noe.
-- Standardrettighetene gjengir det plattformen setter for rollen postgres.
-- Plattformen har tilsvarende for supabase_admin; de treffer ikke objekter
-- migrasjonene oppretter, og er utelatt.

-- Roller gjelder hele klyngen, så en annen testbase i samme klynge kan ha
-- opprettet dem allerede.
DO $$
DECLARE
    v_rolle TEXT;
BEGIN
    FOREACH v_rolle IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_rolle) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT', v_rolle);
        END IF;
    END LOOP;
END $$;
ALTER ROLE service_role BYPASSRLS;

CREATE SCHEMA auth;

-- Bare kolonnene migrasjonene bruker. Plattformens tabell har mange flere.
CREATE TABLE auth.users (
    id UUID PRIMARY KEY,
    email TEXT
);

CREATE FUNCTION auth.role() RETURNS TEXT
LANGUAGE sql STABLE
AS $$
    SELECT coalesce(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
    )::text
$$;

CREATE FUNCTION auth.email() RETURNS TEXT
LANGUAGE sql STABLE
AS $$
    SELECT coalesce(
        nullif(current_setting('request.jwt.claim.email', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'
    )::text
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role(), auth.email() TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
