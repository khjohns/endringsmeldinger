#!/bin/bash
# Oppsett for skyøkter (Claude Code on the web): Python-miljø, npm-pakker og
# testbasen i SQL Server i Docker.
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
# Uten stempel er forrige installasjon ukjent, og npm install er billigst.
laasefil_sum() {
  sha256sum < "$rot/package-lock.json" | cut -d' ' -f1
}
installer_npm() {
  local stempel="$rot/node_modules/.koe-laasefil" forrige
  forrige="$(cat "$stempel" 2> /dev/null)"
  if [ -n "$forrige" ] && [ "$forrige" != "$(laasefil_sum)" ]; then
    (cd "$rot" && npm ci --no-audit --no-fund) || return 1
  else
    (cd "$rot" && npm install --no-audit --no-fund) || return 1
  fi
  laasefil_sum > "$stempel"
}
if ! installer_npm >> "$logg" 2>&1; then
  echo "ADVARSEL: npm-installasjonen feilet, så npm test og typesjekken kan mangle pakker; se $logg."
fi

# Docker-daemonen starter ikke av seg selv, heller ikke når en økt gjenopptas
# (#966).
start_docker() {
  docker info > /dev/null 2>&1 && return 0
  # En gjenopptatt økt arver pid-filer fra øyeblikksbildet, og dockerd venter
  # da på en containerd som ikke finnes.
  if command -v pgrep > /dev/null; then
    pgrep -x containerd > /dev/null || rm -f /var/run/docker/containerd/containerd.pid
    pgrep -x dockerd > /dev/null || rm -f /var/run/docker.pid
  fi
  setsid nohup dockerd > /tmp/dockerd.log 2>&1 < /dev/null &
  for _ in $(seq 1 30); do
    docker info > /dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}
start_docker >> "$logg" 2>&1 || true

# SQL Server for datalaget i F0b (#488) starter i bakgrunnen, så økter som ikke
# trenger den, ikke venter på oppstarten. Tilkoblingen skrives ut med en gang,
# også før containeren finnes (#527). Testhjelperen venter på serveren.
sqllogg=/tmp/koe-sqlserver.log
# Bakgrunnsjobben: steget, så `vent`, innenfor fristen. Fristen dekker hentingen
# (hent_bilde.sh gir opp etter om lag ti minutter med én kilde) og `vent`.
# `timeout` dreper sin egen prosessgruppe, også `docker pull` i hent_bilde.sh,
# som kjører med `--foreground` og blir i gruppen. Jobben selv står utenfor
# gruppen, så den overlever fristen. Feiler steget eller `vent`, eller går fristen
# ut, er det en feil (#761): jobben fjerner stempelet og containeren, så
# testhjelperen ikke kobler seg til en server hooken har meldt som feilet, og neste
# kjøring lager containeren på nytt (#913). Startlåsen (fd 9) slippes når jobben er
# ferdig, etter at containeren er fjernet.
sqlserver_bakgrunn() {
  local status=0 start=$SECONDS
  timeout --kill-after 10 "$FRIST" bash -c '"$@" > /dev/null && "$SKRIPT" vent' _ "$@" \
    || status=$?
  if [ "$status" = 0 ]; then
    echo "$CONTAINER" > "$STEMPEL"
    return
  fi
  rm -f "$STEMPEL"
  "$SKRIPT" stopp
  # 137 er også statusen når barnet drepes med SIGKILL utenfra, for eksempel ved
  # OOM. Da har fristen ikke gått ut.
  if [ "$status" = 124 ] || { [ "$status" = 137 ] && [ $((SECONDS - start)) -ge "$FRIST" ]; }; then
    echo "Fristen på $FRIST s for oppstarten av SQL Server gikk ut. Stempelet og containeren er fjernet, så neste kjøring av hooken lager containeren på nytt."
  else
    echo "Oppstarten av SQL Server feilet med status $status. Stempelet og containeren er fjernet, så neste kjøring av hooken lager containeren på nytt."
  fi
  return "$status"
}
export -f sqlserver_bakgrunn
start_sqlserver() {
  docker info > /dev/null 2>&1 || return 1
  local skript="$rot/scripts/testbase/docker_sqlserver.sh" port="${KOE_SQLSERVER_PORT:-14331}"
  local navn="koe-sqlserver-$port" stempel="/tmp/koe-sqlserver-$port.container"
  local passordfil="/tmp/koe-sqlserver-$port.passord" container steg
  # Skriptet bærer bildet, så summen av det avgjør om containeren lages på nytt.
  container="$(sha256sum < "$skript" | cut -d' ' -f1)" || return 1
  # To låser. Forgrunnslåsen (fd 8) holdes mens en kjøring rydder og bestemmer
  # passordet, så en ny kjøring som venter på den, ser containeren og passordfila
  # slik de blir, og aldri en gammel container som er i ferd med å slettes (#563).
  # Startlåsen (fd 9) holdes også av bakgrunnsjobben til serveren svarer, har gitt
  # opp eller fristen har gått ut, så en ny kjøring ikke lager containeren på nytt
  # mens den starter.
  exec 8> "/tmp/koe-sqlserver-$port.forgrunn.lock" 9> "/tmp/koe-sqlserver-$port.lock"
  if ! flock --wait 120 8; then
    echo "En annen kjøring av hooken har holdt forgrunnslåsen for $navn i over 120 s." >&2
    return 3
  fi
  if ! flock --nonblock 9; then
    echo "En annen kjøring av hooken starter $navn." >&2
    exec 8>&- 9>&-
    KOE_SQLSERVER_SA_PASSORD="$(cat "$passordfil" 2> /dev/null)" "$skript" tilkobling
    return
  fi
  : > "$sqllogg"
  # Stempelet skrives først når serveren har svart, så en container som aldri
  # kom opp, lages på nytt ved neste kjøring i stedet for å startes igjen (#525).
  # En container med stempel har svart før; den beholder stempelet mens den
  # startes, og mister det når starten eller `vent` feiler eller fristen går ut.
  if ! docker container inspect "$navn" > /dev/null 2>&1 \
    || [ "$(cat "$stempel" 2> /dev/null)" != "$container" ]; then
    rm -f "$stempel"
    "$skript" stopp
    if [ ! -s "$passordfil" ]; then
      (umask 077 && echo "Koe-$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')-Aa1" > "$passordfil") \
        || return 1
    fi
    KOE_SQLSERVER_SA_PASSORD="$(cat "$passordfil")"
    export KOE_SQLSERVER_SA_PASSORD
    # Bildet (2,4 GB) hentes i bakgrunnen. Finnes det, lages containeren her, så
    # en feil i `docker run` vises i meldingen fra hooken.
    if docker image inspect "$("$skript" bilde)" > /dev/null 2>&1; then
      "$skript" opprett > /dev/null || return 1
      steg=(:)
    else
      steg=("$skript" opprett)
    fi
  else
    steg=(docker start "$navn")
  fi
  SKRIPT="$skript" STEMPEL="$stempel" CONTAINER="$container" FRIST=1800 \
    setsid nohup bash -c 'sqlserver_bakgrunn "$@"' \
    _ "${steg[@]}" >> "$sqllogg" 2>&1 < /dev/null 8>&- &
  exec 8>&- 9>&-
  "$skript" tilkobling
}

sqlstatus=0
tilkobling="$(start_sqlserver 2>> "$sqllogg")" || sqlstatus=$?
if [ "$sqlstatus" = 0 ]; then
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export KOE_SQLSERVER_TILKOBLING='$tilkobling'" >> "$CLAUDE_ENV_FILE"
  fi
  echo "SQL Server: starter i bakgrunnen (koe-sqlserver-${KOE_SQLSERVER_PORT:-14331}), KOE_SQLSERVER_TILKOBLING er satt. Testene i server/tester/sqlserver.test.ts venter på den; logg i $sqllogg."
elif [ "$sqlstatus" = 3 ]; then
  echo "ADVARSEL: en annen kjøring av hooken starter SQL Server og ble ikke ferdig med forgrunnen på 120 s; se $sqllogg. KOE_SQLSERVER_TILKOBLING er ikke satt. Kjør hooken på nytt når den andre kjøringen er ferdig."
elif ! docker info > /dev/null 2>&1; then
  echo "ADVARSEL: SQL Server startet ikke fordi Docker ikke svarer; se $logg. KOE_SQLSERVER_TILKOBLING er ikke satt, så testene i server/tester/sqlserver.test.ts hoppes over."
else
  echo "ADVARSEL: SQL Server startet ikke; se $sqllogg. KOE_SQLSERVER_TILKOBLING er ikke satt, så testene i server/tester/sqlserver.test.ts hoppes over."
fi
