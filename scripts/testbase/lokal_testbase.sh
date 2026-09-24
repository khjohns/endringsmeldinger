#!/usr/bin/env bash
# Starter en kastbar PostgreSQL 17 lokalt og bygger testbasen i den med
# bygg_testbase.sh. Lytter bare på 127.0.0.1, med et tilfeldig passord.
#
#   scripts/testbase/lokal_testbase.sh start   # skriver ut KOE_TESTBASE_URL
#   scripts/testbase/lokal_testbase.sh url     # samme URL igjen
#   scripts/testbase/lokal_testbase.sh stopp   # stopper og sletter alt
#
# PG_BIN peker på binærene for versjon 17 om de ikke ligger først i PATH
# (Homebrew: /opt/homebrew/opt/postgresql@17/bin, Debian: /usr/lib/postgresql/17/bin).
# KOE_TESTBASE_KATALOG og KOE_TESTBASE_PORT overstyrer katalog og port.
set -euo pipefail

rot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
katalog="${KOE_TESTBASE_KATALOG:-${TMPDIR:-/tmp}/koe-testbase}"
port="${KOE_TESTBASE_PORT:-54317}"
pg_bin="${PG_BIN:-$(dirname "$(command -v pg_ctl)")}"

url() {
  echo "postgresql://postgres:$(cat "$katalog/passord")@127.0.0.1:$port/koe_test"
}

case "${1:-}" in
  start)
    versjon="$("$pg_bin/postgres" --version | sed -E 's/[^0-9]*([0-9]+).*/\1/')"
    if [[ "$versjon" != "17" ]]; then
      echo "Fant PostgreSQL $versjon i $pg_bin. Sett PG_BIN til binærene for 17." >&2
      exit 1
    fi
    if [[ -e "$katalog" ]]; then
      echo "$katalog finnes. Kjør 'stopp' først." >&2
      exit 1
    fi
    mkdir -p "$katalog"
    head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$katalog/passord"
    "$pg_bin/initdb" -D "$katalog/data" -U postgres -E UTF8 --locale=C \
      --auth=scram-sha-256 --pwfile="$katalog/passord" > "$katalog/initdb.logg"
    "$pg_bin/pg_ctl" -D "$katalog/data" -l "$katalog/server.logg" -w \
      -o "-p $port -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" start
    PGPASSWORD="$(cat "$katalog/passord")" "$pg_bin/createdb" \
      -h 127.0.0.1 -p "$port" -U postgres koe_test
    KOE_TESTBASE_URL="$(url)" "$rot/scripts/testbase/bygg_testbase.sh"
    echo
    echo "export KOE_TESTBASE_URL='$(url)'"
    ;;
  url)
    url
    ;;
  stopp)
    if [[ -d "$katalog/data" ]]; then
      "$pg_bin/pg_ctl" -D "$katalog/data" -m fast stop || true
    fi
    rm -rf "$katalog"
    ;;
  *)
    echo "Bruk: $0 start|url|stopp" >&2
    exit 2
    ;;
esac
