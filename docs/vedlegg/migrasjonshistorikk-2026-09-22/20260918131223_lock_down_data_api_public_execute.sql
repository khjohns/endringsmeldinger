-- Postgres gir EXECUTE til PUBLIC på nye funksjoner. En REVOKE fra anon og
-- authenticated fjerner ikke det arvede grantet, så rollene beholdt EXECUTE på
-- triggerfunksjonene. Triggere krever ikke EXECUTE av den som utløser dem —
-- rettigheten kontrolleres når triggeren opprettes — så dette er trygt å ta bort.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;;
