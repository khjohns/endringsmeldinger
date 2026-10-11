# shellcheck shell=bash
# Testbasens bilde: det offisielle postgres:17, målversjonen i
# supabase/config.toml, under et lokalt navn som bærer versjonen, og kildene i
# den rekkefølgen hent_bilde.sh prøver dem: Googles speil av Docker Hub først,
# så ECR Public og Docker Hub selv (#327). Leses med `source` av
# scripts/ci/start_postgres.sh og scripts/testbase/docker_testbase.sh.
# shellcheck disable=SC2034
postgres_bilde="koe-testbase:postgres-17"
postgres_kilder=(
  mirror.gcr.io/library/postgres:17
  public.ecr.aws/docker/library/postgres:17
  docker.io/library/postgres:17
)
