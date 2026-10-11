#!/usr/bin/env bash
# Bygger testbasen i KOE_TESTBASE_URL på nytt fra migrasjonene i arbeidstreet:
# sletter basen, oppretter den tom på samme server og kjører bygg_testbase.sh.
# URL-en og passordet er de samme etterpå, så en KOE_TESTBASE_URL som er satt
# i økta, virker fortsatt (#379).
#
# Bruk: KOE_TESTBASE_URL=... scripts/testbase/bygg_paa_nytt.sh
#
# Avbryter uten å slette noe når basen ikke er merket kastbar av
# bygg_testbase.sh.
set -euo pipefail
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"

: "${KOE_TESTBASE_URL:?KOE_TESTBASE_URL må peke på testbasen}"

rot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
psql_kjor=(psql --no-psqlrc --quiet -v ON_ERROR_STOP=1 --tuples-only --no-align)

merke="$("${psql_kjor[@]}" "$KOE_TESTBASE_URL" -c \
  "SELECT shobj_description(oid, 'pg_database') FROM pg_database WHERE datname = current_database()")"
if [[ "$merke" != "koe-kastbar-testbase" ]]; then
  echo "KOE_TESTBASE_URL peker ikke på en base bygget av bygg_testbase.sh. Avbryter." >&2
  exit 1
fi
navn="$("${psql_kjor[@]}" "$KOE_TESTBASE_URL" -c 'SELECT current_database()')"

# Basen kan ikke slettes fra en tilkobling til den selv, så kommandoene går
# gjennom vedlikeholdsbasen `postgres` på samme server.
uten_sporring="${KOE_TESTBASE_URL%%\?*}"
vedlikehold="${uten_sporring%/*}/postgres${KOE_TESTBASE_URL#"$uten_sporring"}"
"${psql_kjor[@]}" "$vedlikehold" -c "DROP DATABASE \"$navn\" WITH (FORCE)"
"${psql_kjor[@]}" "$vedlikehold" -c "CREATE DATABASE \"$navn\""

"$rot/scripts/testbase/bygg_testbase.sh"
