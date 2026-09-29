#!/usr/bin/env bash
# Starter en kastbar PostgreSQL 17 i Docker og bygger testbasen i den med
# bygg_testbase.sh. Samme bilde som CI-jobben `database` (postgres:17).
# Lytter bare på 127.0.0.1, med et tilfeldig passord.
#
#   scripts/testbase/docker_testbase.sh start   # skriver ut KOE_TESTBASE_URL
#   scripts/testbase/docker_testbase.sh url     # samme URL igjen
#   scripts/testbase/docker_testbase.sh stopp   # stopper og sletter containeren
#
# For maskiner uten PostgreSQL 17 installert, som skyøktene (Ubuntu har 16).
# KOE_TESTBASE_PORT overstyrer porten; én container per port, så parallelle
# løp kan ha hver sin base.
set -euo pipefail

rot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
port="${KOE_TESTBASE_PORT:-54317}"
bilde="postgres:17"
navn="koe-testbase-$port"

url() {
  local passord
  passord="$(docker exec "$navn" printenv POSTGRES_PASSWORD)"
  echo "postgresql://postgres:$passord@127.0.0.1:$port/koe_test"
}

hent_bilde() {
  if docker image inspect "$bilde" > /dev/null 2>&1; then
    return 0
  fi
  # Docker Hub svarer av og til 429 Too Many Requests.
  local forsok ventetid=2
  for forsok in 1 2 3 4 5; do
    if docker pull --quiet "$bilde" > /dev/null; then
      return 0
    fi
    echo "Henting av $bilde feilet (forsøk $forsok). Venter ${ventetid}s." >&2
    sleep "$ventetid"
    ventetid=$((ventetid * 2))
  done
  echo "Fikk ikke hentet $bilde." >&2
  return 1
}

case "${1:-}" in
  start)
    if docker container inspect "$navn" > /dev/null 2>&1; then
      echo "Containeren $navn finnes. Kjør 'stopp' først." >&2
      exit 1
    fi
    hent_bilde
    docker run --detach --name "$navn" \
      --env POSTGRES_PASSWORD="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')" \
      --env POSTGRES_DB=koe_test \
      --publish "127.0.0.1:$port:5432" \
      "$bilde" > /dev/null
    # Bildet starter serveren én gang for initdb og så på nytt; pg_isready
    # over TCP svarer først når den endelige serveren lytter på porten.
    for _ in $(seq 1 60); do
      if docker exec "$navn" pg_isready --quiet --host 127.0.0.1 --username postgres; then
        break
      fi
      sleep 1
    done
    docker exec "$navn" pg_isready --quiet --host 127.0.0.1 --username postgres
    KOE_TESTBASE_URL="$(url)" "$rot/scripts/testbase/bygg_testbase.sh"
    echo
    echo "export KOE_TESTBASE_URL='$(url)'"
    ;;
  url)
    url
    ;;
  stopp)
    docker rm --force "$navn" > /dev/null 2>&1 || true
    ;;
  *)
    echo "Bruk: $0 start|url|stopp" >&2
    exit 2
    ;;
esac
