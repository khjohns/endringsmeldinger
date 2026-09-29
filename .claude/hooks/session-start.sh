#!/bin/bash
# Oppsett for skyøkter (Claude Code on the web): Python-miljø, npm-pakker og
# en PostgreSQL 17-testbase i Docker. Maskinen har bare PostgreSQL 16, og
# Docker-daemonen starter ikke av seg selv.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

rot="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
logg=/tmp/koe-session-start.log

if [ ! -x /tmp/venv/bin/python ]; then
  python3 -m venv /tmp/venv
fi
/tmp/venv/bin/pip install --quiet --disable-pip-version-check \
  -r "$rot/backend/requirements.txt" -r "$rot/backend/requirements-dev.txt" >> "$logg" 2>&1

(cd "$rot" && npm install --no-audit --no-fund) >> "$logg" 2>&1

start_testbase() {
  if ! docker info > /dev/null 2>&1; then
    # En gjenopptatt økt arver pid-filer fra øyeblikksbildet, og dockerd venter
    # da på en containerd som ikke finnes.
    pgrep -x containerd > /dev/null || rm -f /var/run/docker/containerd/containerd.pid
    pgrep -x dockerd > /dev/null || rm -f /var/run/docker.pid
    setsid nohup dockerd > /tmp/dockerd.log 2>&1 < /dev/null &
    for _ in $(seq 1 30); do
      docker info > /dev/null 2>&1 && break
      sleep 1
    done
  fi
  docker info > /dev/null 2>&1

  local port="${KOE_TESTBASE_PORT:-54317}"
  if docker container inspect "koe-testbase-$port" > /dev/null 2>&1; then
    docker start "koe-testbase-$port" > /dev/null
    for _ in $(seq 1 30); do
      docker exec "koe-testbase-$port" pg_isready --quiet --host 127.0.0.1 && break
      sleep 1
    done
  else
    "$rot/scripts/testbase/docker_testbase.sh" start
  fi
}

if (start_testbase) >> "$logg" 2>&1; then
  url="$("$rot/scripts/testbase/docker_testbase.sh" url)"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export KOE_TESTBASE_URL='$url'" >> "$CLAUDE_ENV_FILE"
  fi
  echo "Testbase: PostgreSQL 17 i Docker (koe-testbase-${KOE_TESTBASE_PORT:-54317}), KOE_TESTBASE_URL er satt. Databasetestene kjører med vanlig pytest."
else
  echo "ADVARSEL: testbasen i PostgreSQL 17 kom ikke opp; se $logg. KOE_TESTBASE_URL er ikke satt, så databasetestene hoppes over."
fi
