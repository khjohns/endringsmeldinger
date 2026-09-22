#!/usr/bin/env bash
# Bygger en kastbar PostgreSQL 17 fra supabase/migrations/, legger B-02-laget
# oppå, starter PostgREST mot den og kjører bevis.py. Rører ingen annen base.
#
# Bruk:
#   PG_BIN=/opt/homebrew/opt/postgresql@17/bin \
#   POSTGREST=/sti/til/postgrest \
#   PYTHON=/sti/til/venv/bin/python \        # med psycopg, pyjwt, requests
#     docs/vedlegg/b02-prototype-2026-09-22/kjor.sh
set -euo pipefail
export LC_ALL=C

: "${PG_BIN:?PG_BIN må peke på bin-katalogen til PostgreSQL 17}"
: "${POSTGREST:?POSTGREST må peke på postgrest-binæren}"
PYTHON="${PYTHON:-python3}"

her="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rot="$(cd "$her/../../.." && pwd)"
arbeid="$(mktemp -d)"
port="${B02_PGPORT:-55433}"
pgrst_port="${B02_PGRST_PORT:-3033}"
hemmelig="b02-prototype-hemmelighet-minst-32-tegn-lang"

rydd() {
    [[ -n "${pgrst_pid:-}" ]] && kill "$pgrst_pid" 2>/dev/null || true
    "$PG_BIN/pg_ctl" -D "$arbeid/data" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$arbeid"
}
trap rydd EXIT

"$PG_BIN/initdb" -D "$arbeid/data" -U postgres -A trust --no-locale -E UTF8 >/dev/null
"$PG_BIN/pg_ctl" -D "$arbeid/data" -o "-p $port -k $arbeid" -l "$arbeid/pg.log" -w start >/dev/null
"$PG_BIN/createdb" -h "$arbeid" -p "$port" -U postgres koe_b02

export PATH="$PG_BIN:$PATH"
KOE_TESTBASE_URL="postgresql://postgres@/koe_b02?host=$arbeid&port=$port" \
    "$rot/scripts/testbase/bygg_testbase.sh" | tail -1

# B02_MUTASJON peker på en SQL-fil som bryter en regel etter at laget er
# bygget. Da skal bevis.py bli rødt; det viser at sjekkene ikke er tomme.
for fil in "$her/01_plattform_postgrest.sql" "$her/02_b02_lag.sql" "$her/03_testdata.sql" \
           ${B02_MUTASJON:+"$B02_MUTASJON"}; do
    echo "B-02-lag $(basename "$fil")"
    PGOPTIONS="-c client_min_messages=warning" "$PG_BIN/psql" -h "$arbeid" -p "$port" -U postgres \
        -d koe_b02 --no-psqlrc --quiet -v ON_ERROR_STOP=1 --single-transaction -f "$fil" >/dev/null
done

cat >"$arbeid/postgrest.conf" <<EOF
db-uri = "postgres://authenticator@/koe_b02?host=$arbeid&port=$port"
db-schemas = "public,koe_api"
db-anon-role = "anon"
db-pool = 1
db-channel-enabled = false
jwt-secret = "$hemmelig"
server-port = $pgrst_port
log-level = "error"
EOF

# Homebrew-bygget PostgREST leter etter libpq under /opt/homebrew/opt/libpq.
export DYLD_FALLBACK_LIBRARY_PATH="$("$PG_BIN/pg_config" --pkglibdir):$("$PG_BIN/pg_config" --libdir)"
"$POSTGREST" "$arbeid/postgrest.conf" >"$arbeid/postgrest.log" 2>&1 &
pgrst_pid=$!
for _ in $(seq 1 50); do
    curl -sf "http://localhost:$pgrst_port/" >/dev/null 2>&1 && break
    sleep 0.2
done
echo "PostgREST $("$POSTGREST" --version 2>/dev/null || echo '(versjon ukjent)'), db-pool = 1"
echo "Server: $("$PG_BIN/psql" -h "$arbeid" -p "$port" -U postgres -d koe_b02 -Atc 'SHOW server_version')"
echo

B02_DSN="host=$arbeid port=$port dbname=koe_b02" \
B02_POSTGREST="http://localhost:$pgrst_port" \
B02_JWT_SECRET="$hemmelig" \
    "$PYTHON" "$her/bevis.py"
