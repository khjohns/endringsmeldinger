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

# Serveren krasjer av og til i oppstarten, med stakken i `sqlpal.dll` og
# `lsass.exe` (#525). En omstart i samme container har aldri reddet den, men en
# ny container har gjort det. `vent` lager derfor en stoppet container på nytt,
# med samme passord, inntil to ganger. `docker stop` gir også kode 137, så en
# container stoppes for godt med `stopp`, som sletter den. Hver oppstart får
# 180 s.
vent() {
  local tilstand status kode sa_passord frist=$((SECONDS + 180)) nye=0
  sa_passord="$(passord 2> /dev/null)" || sa_passord=""
  while ((SECONDS < frist)); do
    if docker exec "$navn" /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$sa_passord" \
      -Q 'SELECT 1' > /dev/null 2>&1; then
      return 0
    fi
    tilstand="$(docker container inspect \
      --format '{{.State.Status}} {{.State.ExitCode}}' "$navn" 2> /dev/null)" \
      || tilstand="mangler 0"
    read -r status kode <<< "$tilstand"
    if [ "$status" = mangler ]; then
      echo "Containeren $navn finnes ikke." >&2
      return 1
    fi
    if [[ "$status" =~ ^(exited|dead)$ ]]; then
      if [ "$status" = exited ] && ((nye < 2)) && [ -n "$sa_passord" ]; then
        nye=$((nye + 1))
        echo "SQL Server i $navn stoppet (avslutningskode $kode). Lager containeren på nytt ($nye av 2)." >&2
        docker logs "$navn" 2>&1 | grep -A3 'fatal error' | tail -20 >&2 || true
        docker rm --force "$navn" > /dev/null
        KOE_SQLSERVER_SA_PASSORD="$sa_passord" opprett
        frist=$((SECONDS + 180))
        continue
      fi
      echo "SQL Server i $navn stoppet ($status, avslutningskode $kode, $nye nye containere)." >&2
      docker logs "$navn" 2>&1 | tail -40 >&2
      return 1
    fi
    sleep 1
  done
  echo "SQL Server i $navn svarte ikke på 180 s etter oppstart nummer $((nye + 1))." >&2
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
  # Uten omstart i Docker: `vent` lager en krasjet container på nytt (#525).
  docker run --detach --name "$navn" \
    --env ACCEPT_EULA=Y --env MSSQL_PID=Developer \
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
