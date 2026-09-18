-- Postgres gir EXECUTE til PUBLIC på nye funksjoner. En REVOKE fra anon og
-- authenticated fjerner ikke det arvede grantet, så rollene beholdt EXECUTE på
-- triggerfunksjonene selv etter forrige migrasjon. Kontroll mot databasen viste
-- tre slike funksjoner.
--
-- Triggere krever ikke at den som utløser dem har EXECUTE — rettigheten
-- kontrolleres når triggeren opprettes — så dette er trygt å ta bort.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
