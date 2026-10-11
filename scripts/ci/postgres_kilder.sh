# shellcheck shell=bash
# Kildene for det offisielle postgres:17, målversjonen i supabase/config.toml,
# i den rekkefølgen hent_bilde.sh prøver dem: Googles speil av Docker Hub
# først, så ECR Public og Docker Hub selv (#327). Leses med `source` av
# scripts/ci/start_postgres.sh og scripts/testbase/docker_testbase.sh.
# shellcheck disable=SC2034
postgres_kilder=(
  mirror.gcr.io/library/postgres:17
  public.ecr.aws/docker/library/postgres:17
  docker.io/library/postgres:17
)
