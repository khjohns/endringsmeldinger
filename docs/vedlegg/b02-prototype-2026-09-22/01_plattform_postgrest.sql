-- Det scripts/testbase/plattformstubb.sql ikke har: PostgRESTs innloggingsrolle.
-- Gjengitt etter katalogen i gwdxadexwktegkklyobv 22.09: LOGIN, NOINHERIT,
-- medlem av anon, authenticated og service_role med SET, uten INHERIT.
CREATE ROLE authenticator LOGIN NOINHERIT;
GRANT anon, authenticated, service_role TO authenticator;

-- Plattformen gir service_role alle tabellrettigheter gjennom standard-
-- rettighetene. Stubben gjør det samme; det gjentas her så beviset ikke
-- avhenger av det.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
