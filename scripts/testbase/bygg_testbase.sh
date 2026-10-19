#!/usr/bin/env bash
# Bygger en kastbar testbase fra tom: plattformstubben, deretter hver fil i
# supabase/migrations/ i filnavnrekkefølge. Stopper ved første feil.
#
# Bruk: KOE_TESTBASE_URL=postgresql://postgres@localhost:5432/koe_test \
#         scripts/testbase/bygg_testbase.sh
#
# Samme variabel styrer databasetestene i backend/tests/test_database/.
set -euo pipefail
export LC_ALL=C
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"

: "${KOE_TESTBASE_URL:?KOE_TESTBASE_URL må peke på en tom, kastbar base}"

rot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
psql_kjor=(psql "$KOE_TESTBASE_URL" --no-psqlrc --quiet -v ON_ERROR_STOP=1)

# Vern mot å bygge oppå en base som allerede har innhold — for eksempel
# prosjektets egen.
eksisterende="$("${psql_kjor[@]}" --tuples-only --no-align -c \
  "SELECT count(*) FROM pg_namespace WHERE nspname = 'auth'
     OR (nspname = 'public' AND EXISTS (
       SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace))")"
if [[ "$eksisterende" != "0" ]]; then
  echo "Basen er ikke tom (auth-skjemaet eller objekter i public finnes). Avbryter." >&2
  exit 1
fi

echo "Server: $("${psql_kjor[@]}" --tuples-only --no-align -c 'SHOW server_version')"

echo "Plattformstubb"
"${psql_kjor[@]}" -f "$rot/scripts/testbase/plattformstubb.sql"

shopt -s nullglob
migrasjoner=("$rot"/supabase/migrations/*.sql)
if (( ${#migrasjoner[@]} == 0 )); then
  echo "Fant ingen migrasjoner i supabase/migrations/." >&2
  exit 1
fi

# Regnet før migrasjonene kjøres, så den beskriver filene basen ble bygget av.
sum="$("$rot/scripts/testbase/migrasjonssum.sh")"

# Globben sorterer etter filnavn i C-lokalet; det er apply-rekkefølgen.
for fil in "${migrasjoner[@]}"; do
  echo "Migrasjon $(basename "$fil")"
  "${psql_kjor[@]}" -f "$fil"
done

# Radene migrasjonene la inn, tatt vare på mens basen er ren. Den skrivbare
# testfixturen setter `public` tilbake til dem etter hver test, også når en
# avbrutt kjøring har etterlatt rader (#697).
"${psql_kjor[@]}" <<'SQL'
CREATE SCHEMA koe_testbase;
REVOKE ALL ON SCHEMA koe_testbase FROM PUBLIC;
CREATE TABLE koe_testbase.frodata (tabell text PRIMARY KEY, rader jsonb[] NOT NULL);
DO $$
DECLARE
  tabell text;
BEGIN
  FOR tabell IN SELECT oid::regclass::text FROM pg_class
                 WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'p') LOOP
    EXECUTE format('INSERT INTO koe_testbase.frodata
                    SELECT %L, coalesce(array_agg(to_jsonb(t)), ''{}'') FROM %s t', tabell, tabell);
  END LOOP;
END $$;
SQL

# Den skrivbare testfixturen skriver bare til en base med dette merket.
"${psql_kjor[@]}" -c "DO \$\$ BEGIN
  EXECUTE format('COMMENT ON DATABASE %I IS %L', current_database(), 'koe-kastbar-testbase');
  EXECUTE format('ALTER DATABASE %I SET koe.migrasjonssum = %L', current_database(), '$sum');
END \$\$"

echo "Bygget ${#migrasjoner[@]} migrasjoner."
