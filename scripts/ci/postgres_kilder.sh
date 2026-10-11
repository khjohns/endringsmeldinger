# shellcheck shell=bash
# Testbasens bilde: det offisielle postgres i målversjonen fra
# supabase/config.toml, under et lokalt navn som bærer versjonen, og kildene i
# den rekkefølgen hent_bilde.sh prøver dem: Googles speil av Docker Hub først,
# så ECR Public og Docker Hub selv (#327). Leses med `source` av
# scripts/ci/start_postgres.sh, scripts/testbase/docker_testbase.sh og
# session-start-hooken.
# shellcheck disable=SC2034
postgres_versjon=17
postgres_bilde="koe-testbase:postgres-$postgres_versjon"
postgres_kilder=(
  "mirror.gcr.io/library/postgres:$postgres_versjon"
  "public.ecr.aws/docker/library/postgres:$postgres_versjon"
  "docker.io/library/postgres:$postgres_versjon"
)
