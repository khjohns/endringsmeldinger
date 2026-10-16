#!/usr/bin/env bash
# Starter en kastbar SQL Server i Docker for datalaget i F0b (#488).
# Developer Edition av samme bilde som prøven i prove/azuresql/. Lytter bare
# på 127.0.0.1. Serveren har ingen testbase: testhjelperen i
# server/tester/sqlserver.ts oppretter en base per testfil med innstillingene
# fra Azure SQL Database (RCSI, ADR og sorteringen) og sletter den etterpå.
#
#   scripts/testbase/docker_sqlserver.sh start     # henter bildet, starter og venter
#   scripts/testbase/docker_sqlserver.sh opprett   # henter bildet og starter, uten å vente
#   scripts/testbase/docker_sqlserver.sh vent      # venter til serveren svarer
#   scripts/testbase/docker_sqlserver.sh tilkobling  # skriver ut KOE_SQLSERVER_TILKOBLING
#   scripts/testbase/docker_sqlserver.sh bilde     # skriver ut bildet
#   scripts/testbase/docker_sqlserver.sh stopp     # stopper og sletter containeren
#
# KOE_SQLSERVER_PORT overstyrer porten (standard 14331; prøven bruker 14330).
# KOE_SQLSERVER_SA_PASSORD setter passordet for `sa` ved `start` og `opprett`,
# så hooken kan skrive ut tilkoblingen før containeren finnes; ellers er det
# tilfeldig.
set -euo pipefail

rot="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
port="${KOE_SQLSERVER_PORT:-14331}"
navn="koe-sqlserver-$port"
# Microsoft har én kilde for bildet, så hent_bilde.sh får bare den.
sqlserver_bilde="mcr.microsoft.com/mssql/server:2025-CU9-ubuntu-24.04"

passord() {
  docker container inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$navn" \
    | sed -n 's/^MSSQL_SA_PASSWORD=//p'
}

tilkobling() {
  echo "Server=127.0.0.1,$port;User Id=sa;Password=$1;Encrypt=true;TrustServerCertificate=true"
}

# Venter også mens Docker starter en krasjet server på nytt (`--restart
# on-failure:3`, #525), men gir opp med en gang den ikke blir startet igjen.
# Docker viser «restarting» til omstarten, så en container som står stoppet i
# to kontroller på rad, er stoppet for godt (som etter `docker stop`).
vent() {
  local tilstand status omstarter kode stoppet=0 sa_passord frist=$((SECONDS + 180))
  sa_passord="$(passord 2> /dev/null)" || sa_passord=""
  while ((SECONDS < frist)); do
    if docker exec "$navn" /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$sa_passord" \
      -Q 'SELECT 1' > /dev/null 2>&1; then
      return 0
    fi
    tilstand="$(docker container inspect \
      --format '{{.State.Status}} {{.RestartCount}} {{.State.ExitCode}}' "$navn" 2> /dev/null)" \
      || tilstand="mangler 0 0"
    read -r status omstarter kode <<< "$tilstand"
    if [[ "$status" =~ ^(exited|dead)$ ]]; then stoppet=$((stoppet + 1)); else stoppet=0; fi
    if [ "$status" = mangler ]; then
      echo "Containeren $navn finnes ikke." >&2
      return 1
    fi
    if ((stoppet >= 2)) \
      || { ((stoppet == 1)) && { ((omstarter >= 3)) || ((kode == 0)); }; }; then
      echo "SQL Server i $navn stoppet ($status, avslutningskode $kode, $omstarter omstarter)." >&2
      docker logs "$navn" 2>&1 | tail -40 >&2
      return 1
    fi
    sleep 1
  done
  echo "SQL Server i $navn svarte ikke på 180 s." >&2
  docker logs "$navn" 2>&1 | tail -20 >&2
  return 1
}

opprett() {
  if docker container inspect "$navn" > /dev/null 2>&1; then
    echo "Containeren $navn finnes. Kjør 'stopp' først." >&2
    exit 1
  fi
  "$rot/scripts/ci/hent_bilde.sh" "$sqlserver_bilde" "$sqlserver_bilde" >&2
  # Passordet må oppfylle kravene i SQL Server: store og små bokstaver, tall og tegn.
  # Serveren krasjet to ganger i oppstarten i skyøkta 15.10 (lsass, errno 11), så
  # Docker starter den på nytt.
  docker run --detach --name "$navn" \
    --env ACCEPT_EULA=Y --env MSSQL_PID=Developer --restart on-failure:3 \
    --env MSSQL_SA_PASSWORD="${KOE_SQLSERVER_SA_PASSORD:-Koe-$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')-Aa1}" \
    --publish "127.0.0.1:$port:1433" \
    "$sqlserver_bilde" > /dev/null
}

case "${1:-}" in
  start)
    opprett
    vent
    echo "export KOE_SQLSERVER_TILKOBLING='$(tilkobling "$(passord)")'"
    ;;
  opprett)
    opprett
    ;;
  vent)
    vent
    ;;
  tilkobling)
    # Passordet i containeren som finnes. Før den finnes, passordet hooken skal
    # opprette den med.
    if docker container inspect "$navn" > /dev/null 2>&1; then
      sa_passord="$(passord)"
    else
      sa_passord="${KOE_SQLSERVER_SA_PASSORD:-}"
    fi
    if [ -z "$sa_passord" ]; then
      echo "Passordet for sa i $navn kunne ikke leses, og KOE_SQLSERVER_SA_PASSORD er ikke satt." >&2
      exit 1
    fi
    tilkobling "$sa_passord"
    ;;
  bilde)
    echo "$sqlserver_bilde"
    ;;
  stopp)
    docker rm --force "$navn" > /dev/null 2>&1 || true
    ;;
  *)
    echo "Bruk: $0 start|opprett|vent|tilkobling|bilde|stopp" >&2
    exit 2
    ;;
esac
