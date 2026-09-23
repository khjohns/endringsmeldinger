#!/usr/bin/env bash
# B-02-prototype v2. Bygger en kastbar PostgreSQL 17 som ligner Supabase:
# supabase_admin er eneste superbruker, postgres er ikke superbruker og kjører
# plattformstubben, alle migrasjonene og laget. Starter PostgREST og kjører
# beviset. Rører ingen annen base.
#
# Bruk:
#   PG_BIN=/opt/homebrew/opt/postgresql@17/bin \
#   POSTGREST=/sti/til/postgrest \
#   PYTHON=/sti/til/venv/bin/python \        # med psycopg, pyjwt, requests
#     docs/vedlegg/b02-prototype-v2-2026-09-23/kjor.sh
#
# B02_MUTASJON=<fil.sql> kjøres som supabase_admin etter laget; da skal
# beviset bli rødt. B02_BEVIS=<fil.py> bytter beviset.
set -euo pipefail
export LC_ALL=C

: "${PG_BIN:?PG_BIN må peke på bin-katalogen til PostgreSQL 17}"
: "${POSTGREST:?POSTGREST må peke på postgrest-binæren}"
PYTHON="${PYTHON:-python3}"

her="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
rot="$(cd "$her/../../.." && pwd)"
arbeid="$(mktemp -d)"
port="${B02_PGPORT:-55434}"
pgrst_port="${B02_PGRST_PORT:-3035}"
hemmelig="b02-prototype-hemmelighet-minst-32-tegn-lang"

rydd() {
    [[ -n "${pgrst_pid:-}" ]] && kill "$pgrst_pid" 2>/dev/null || true
    "$PG_BIN/pg_ctl" -D "$arbeid/data" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$arbeid"
}
trap rydd EXIT

kjor_sql() {  # rolle fil [ekstra psql-flagg]
    PGOPTIONS="-c client_min_messages=warning" "$PG_BIN/psql" -h "$arbeid" -p "$port" \
        -U "$1" -d koe_b02 --no-psqlrc --quiet -v ON_ERROR_STOP=1 "${@:3}" \
        -f "$2" >/dev/null
}

"$PG_BIN/initdb" -D "$arbeid/data" -U supabase_admin -A trust --no-locale -E UTF8 >/dev/null
"$PG_BIN/pg_ctl" -D "$arbeid/data" -o "-p $port -k $arbeid" -l "$arbeid/pg.log" -w start >/dev/null
"$PG_BIN/psql" -h "$arbeid" -p "$port" -U supabase_admin -d postgres --no-psqlrc --quiet \
    -v ON_ERROR_STOP=1 -f "$her/00_klynge.sql" >/dev/null
"$PG_BIN/createdb" -h "$arbeid" -p "$port" -U supabase_admin -O postgres koe_b02

echo "Plattformstubb som postgres"
kjor_sql postgres "$rot/scripts/testbase/plattformstubb.sql"
shopt -s nullglob
antall=0
for fil in "$rot"/supabase/migrations/*.sql; do
    kjor_sql postgres "$fil"
    antall=$((antall + 1))
done
echo "Bygget $antall migrasjoner som postgres (ikke superbruker)"

for fil in 02_b02_lag.sql 03_testdata.sql; do
    echo "B-02-lag $fil som postgres"
    kjor_sql postgres "$her/$fil" --single-transaction
done
if [[ -n "${B02_MUTASJON:-}" ]]; then
    echo "Mutasjon $(basename "$B02_MUTASJON") som supabase_admin"
    kjor_sql supabase_admin "$B02_MUTASJON" --single-transaction
fi

cat >"$arbeid/postgrest.conf" <<KONF
db-uri = "postgres://authenticator@/koe_b02?host=$arbeid&port=$port"
db-schemas = "public,koe_api"
db-anon-role = "anon"
db-pool = 1
db-channel-enabled = false
jwt-secret = "$hemmelig"
server-port = $pgrst_port
log-level = "error"
KONF

# Homebrew-bygget PostgREST leter etter libpq under /opt/homebrew/opt/libpq.
export DYLD_FALLBACK_LIBRARY_PATH="$("$PG_BIN/pg_config" --pkglibdir):$("$PG_BIN/pg_config" --libdir)"
"$POSTGREST" "$arbeid/postgrest.conf" >"$arbeid/postgrest.log" 2>&1 &
pgrst_pid=$!
for _ in $(seq 1 50); do
    curl -sf -o /dev/null -w '' "http://localhost:$pgrst_port/" 2>/dev/null && break
    curl -s -o /dev/null "http://localhost:$pgrst_port/" 2>/dev/null && break
    sleep 0.2
done
echo "PostgREST $("$POSTGREST" --version 2>/dev/null || echo '(versjon ukjent)'), db-pool = 1"
echo "Server: $("$PG_BIN/psql" -h "$arbeid" -p "$port" -U supabase_admin -d koe_b02 -Atc 'SHOW server_version')"
echo

B02_DSN="host=$arbeid port=$port dbname=koe_b02" \
B02_POSTGREST="http://localhost:$pgrst_port" \
B02_JWT_SECRET="$hemmelig" \
    "$PYTHON" "${B02_BEVIS:-$her/bevis.py}"
