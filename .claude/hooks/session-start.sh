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

# Økta starter på en løsrevet HEAD, mens lokal main ligger der øyeblikksbildet
# ble tatt, så `main...HEAD` blir hele historikken. Bare fremoverspoling:
# lokale commits på main blir stående.
oppdater_main() {
  timeout 60 git -C "$rot" fetch --quiet origin main || return 0
  [ "$(git -C "$rot" symbolic-ref -q --short HEAD)" = main ] && return 0
  if ! git -C "$rot" rev-parse -q --verify refs/heads/main > /dev/null; then
    git -C "$rot" branch main origin/main
  elif git -C "$rot" merge-base --is-ancestor main origin/main; then
    git -C "$rot" branch -f main origin/main
  fi
}
oppdater_main >> "$logg" 2>&1 || true

# Et steg som feiler, stopper ikke hooken: resten kan fortsatt virke, og
# advarselen sier hva som mangler.
if [ ! -x /tmp/venv/bin/python ]; then
  python3 -m venv /tmp/venv >> "$logg" 2>&1 || echo "ADVARSEL: python3 -m venv /tmp/venv feilet; se $logg."
fi
if ! /tmp/venv/bin/pip install --quiet --disable-pip-version-check \
  -r "$rot/backend/requirements.txt" -r "$rot/backend/requirements-dev.txt" >> "$logg" 2>&1; then
  echo "ADVARSEL: pip install for backend feilet, så pytest kan mangle pakker; se $logg."
fi

# npm ci når låsefila er endret siden forrige installasjon, ellers npm install.
installer_npm() {
  local stempel="$rot/node_modules/.koe-laasefil" laas
  laas="$(sha256sum "$rot/package-lock.json")" || return 1
  if [ "$(cat "$stempel" 2> /dev/null)" = "$laas" ]; then
    (cd "$rot" && npm install --no-audit --no-fund) || return 1
  else
    (cd "$rot" && npm ci --no-audit --no-fund) || return 1
  fi
  echo "$laas" > "$stempel"
}
if ! installer_npm >> "$logg" 2>&1; then
  echo "ADVARSEL: npm-installasjonen feilet, så npm test og typesjekken kan mangle pakker; se $logg."
fi

# Summen av det testbasen bygges av. Avviker den fra summen containeren ble
# bygget med, er containeren fra et eldre øyeblikksbilde og bygges på nytt.
testbase_sum() {
  (cd "$rot" && find supabase/migrations scripts/testbase -type f -print0 \
    | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)
}

start_testbase() {
  if ! docker info > /dev/null 2>&1; then
    # En gjenopptatt økt arver pid-filer fra øyeblikksbildet, og dockerd venter
    # da på en containerd som ikke finnes.
    if command -v pgrep > /dev/null; then
      pgrep -x containerd > /dev/null || rm -f /var/run/docker/containerd/containerd.pid
      pgrep -x dockerd > /dev/null || rm -f /var/run/docker.pid
    fi
    setsid nohup dockerd > /tmp/dockerd.log 2>&1 < /dev/null &
    for _ in $(seq 1 30); do
      docker info > /dev/null 2>&1 && break
      sleep 1
    done
  fi
  # Kalt som vilkår i if gjelder ikke set -e her; hvert steg sjekkes selv.
  docker info > /dev/null 2>&1 || return 1

  local port="${KOE_TESTBASE_PORT:-54317}"
  local navn="koe-testbase-$port" stempel="/tmp/koe-testbase-$port.sum" sum
  sum="$(testbase_sum)" || return 1
  if docker container inspect "$navn" > /dev/null 2>&1 \
    && [ "$(cat "$stempel" 2> /dev/null)" = "$sum" ]; then
    docker start "$navn" > /dev/null || return 1
    for _ in $(seq 1 30); do
      docker exec "$navn" pg_isready --quiet --host 127.0.0.1 && break
      sleep 1
    done
    docker exec "$navn" pg_isready --quiet --host 127.0.0.1 || return 1
  else
    "$rot/scripts/testbase/docker_testbase.sh" stopp
    "$rot/scripts/testbase/docker_testbase.sh" start || return 1
    echo "$sum" > "$stempel"
  fi
}

if (start_testbase) >> "$logg" 2>&1 \
  && url="$("$rot/scripts/testbase/docker_testbase.sh" url 2>> "$logg")"; then
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export KOE_TESTBASE_URL='$url'" >> "$CLAUDE_ENV_FILE"
  fi
  echo "Testbase: PostgreSQL 17 i Docker (koe-testbase-${KOE_TESTBASE_PORT:-54317}), KOE_TESTBASE_URL er satt. Databasetestene kjører med vanlig pytest, og npm test kjører også TS-databasetestene i sprakprove/. Kjør dem ikke samtidig mot samme base."
else
  echo "ADVARSEL: testbasen i PostgreSQL 17 kom ikke opp; se $logg. KOE_TESTBASE_URL er ikke satt, så databasetestene i pytest og i sprakprove/ hoppes over, og grønn suite sier ingenting om datalaget. Maskinen har bare PostgreSQL 16. Kjør hooken på nytt med CLAUDE_CODE_REMOTE=true."
fi
