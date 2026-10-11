#!/usr/bin/env bash
# Starter testbasen for CI: det offisielle postgres:17, målversjonen i
# supabase/config.toml, hentet med hent_bilde.sh, så en kilde som avviser
# nedlastingen ikke stopper jobben (#327). Basen svarer på adressen under,
# som KOE_TESTBASE_URL i workflowen må være lik.
#
# Bruk: KOE_TESTBASE_URL=... scripts/ci/start_postgres.sh
set -euo pipefail

forventet="postgresql://postgres:postgres@localhost:5432/koe_test"
if [[ "${KOE_TESTBASE_URL:-}" != "$forventet" ]]; then
  echo "::error title=Testbase::KOE_TESTBASE_URL må være $forventet."
  exit 1
fi

rot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bilde="koe-testbase:postgres-17"
navn="koe-testbase"

# Googles speil av Docker Hub først, så ECR Public og Docker Hub selv.
"$rot/scripts/ci/hent_bilde.sh" "$bilde" \
  mirror.gcr.io/library/postgres:17 \
  public.ecr.aws/docker/library/postgres:17 \
  docker.io/library/postgres:17

docker run --detach --name "$navn" \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_DB=koe_test \
  --publish 5432:5432 \
  "$bilde" > /dev/null

# Bildet starter serveren én gang for initdb og så på nytt; pg_isready over
# TCP svarer først når den endelige serveren lytter på porten.
for _ in $(seq 1 60); do
  if [[ "$(docker inspect --format '{{.State.Running}}' "$navn")" != true ]]; then
    break
  fi
  if docker exec "$navn" pg_isready --quiet --host 127.0.0.1 --username postgres; then
    echo "Testbasen svarer på localhost:5432."
    exit 0
  fi
  sleep 1
done

docker logs "$navn" >&2
echo "::error title=Testbase::PostgreSQL stoppet eller svarte ikke innen 60 sekunder."
exit 1
