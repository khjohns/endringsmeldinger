#!/usr/bin/env bash
# Prøven av tilgangsmekanismen og lagringsformene i T-SQL (#395).
#
# Starter en tom SQL Server-container, kjører testene i tester/ og hver
# feilinnføring i feilinnfoering/, måler bildet, nedlastingen, oppstarten og
# minnet, og fjerner containeren. Kjøres fra hvor som helst:
#
#   npm --prefix prove/azuresql run prove
#
# Miljø: PROVE_BILDE (bildet), PROVE_MSSQL_PORT (port på 127.0.0.1, standard
# 14330), PROVE_BEHOLD=1 (la containeren stå), PROVE_UTEN_FEILINNFOERING=1.
# Kjøres ikke av `npm test` eller CI-jobbene.

set -euo pipefail

BILDE=${PROVE_BILDE:-mcr.microsoft.com/mssql/server:2025-CU9-ubuntu-24.04}
PORT=${PROVE_MSSQL_PORT:-14330}
NAVN="koe-azuresql-prove-$$"
MAPPE=$(cd "$(dirname "$0")" && pwd)
ROT=$(cd "$MAPPE/../.." && pwd)

passord() { echo "Prove-$(openssl rand -hex 12)-Aa1"; }
SA_PASSORD=$(passord)
RUNTIME_PASSORD=$(passord)
sekunder() { echo "$(date +%s.%N) - $1" | bc | xargs printf '%.1f'; }

rydd() { [ "${PROVE_BEHOLD:-}" = 1 ] || docker rm -f "$NAVN" >/dev/null 2>&1 || true; }
trap rydd EXIT

[ -d "$MAPPE/node_modules/mssql" ] || npm ci --prefix "$MAPPE" --no-audit --no-fund

echo "== Bildet: $BILDE"
if docker image inspect "$BILDE" >/dev/null 2>&1; then
  echo "Nedlasting: bildet fantes lokalt, ikke målt"
else
  start=$(date +%s.%N)
  docker pull -q "$BILDE" >/dev/null
  echo "Nedlasting: $(sekunder "$start") s"
fi
docker image inspect "$BILDE" --format 'Størrelse på disk: {{.Size}} byte' |
  awk '{printf "%s %s %s %.2f GB\n", $1, $2, $3, $4 / 1e9}'

echo "== Oppstart"
start=$(date +%s.%N)
docker run -d --name "$NAVN" -e ACCEPT_EULA=Y -e MSSQL_PID=Developer -e "MSSQL_SA_PASSWORD=$SA_PASSORD" \
  -p "127.0.0.1:$PORT:1433" "$BILDE" >/dev/null
until docker exec "$NAVN" /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$SA_PASSORD" -Q 'SELECT 1' \
  >/dev/null 2>&1; do
  sleep 0.5
  if [ "$(sekunder "$start" | cut -d. -f1)" -gt 180 ]; then
    echo "Serveren svarte ikke på 180 s" >&2
    docker logs "$NAVN" | tail -20 >&2
    exit 1
  fi
done
echo "Fra docker run til første svar: $(sekunder "$start") s"
docker exec "$NAVN" /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$SA_PASSORD" -h -1 \
  -Q "SET NOCOUNT ON; SELECT CONCAT('Versjon: ', CONVERT(nvarchar(128), SERVERPROPERTY('ProductVersion')), ', ', CONVERT(nvarchar(128), SERVERPROPERTY('Edition')))"
echo "Minne etter oppstart: $(docker stats --no-stream --format '{{.MemUsage}}' "$NAVN")"

export PROVE_MSSQL_VERT=127.0.0.1 PROVE_MSSQL_PORT=$PORT
export PROVE_MSSQL_SA_PASSORD=$SA_PASSORD PROVE_MSSQL_RUNTIME_PASSORD=$RUNTIME_PASSORD
vitest() { (cd "$ROT" && npx vitest run --config prove/azuresql/vitest.config.ts "$@"); }

echo "== Testene"
start=$(date +%s.%N)
vitest
echo "Testene tok $(sekunder "$start") s"
echo "Minne etter testene: $(docker stats --no-stream --format '{{.MemUsage}}' "$NAVN")"
topp=$(docker exec "$NAVN" cat /sys/fs/cgroup/memory.peak 2>/dev/null || true)
[ -n "$topp" ] && echo "Høyeste minnebruk i containeren: $((topp / 1024 / 1024)) MiB"

if [ "${PROVE_UTEN_FEILINNFOERING:-}" != 1 ]; then
  echo "== Feilinnføringene (hver skal gi rød test)"
  declare -A MAAL=(
    [uten_transaksjonsbinding]=tilgang
    [handlende_uten_tx]=tilgang
    [uten_predikat.etter]=tilgang
    [slipper_alt.etter]=tilgang
    [uten_prosjektgrense]=tilgang
    [uten_teamgrense]=tilgang
    [rls_i_inserted]=lagring
    [uten_feltkontroll]=lagring
    [uten_versjonskontroll]=lagring
    [uten_skrivevakt]=lagring
    [uten_normalisering]=identitet
  )
  overlevde=0
  for fil in "$MAPPE"/feilinnfoering/*.sql; do
    navn=$(basename "$fil" .sql)
    maal=${MAAL[$navn]:?"$navn mangler mål i kjor.sh"}
    if utdata=$(PROVE_MUTASJON=$fil vitest "prove/azuresql/tester/$maal.test.ts" 2>&1); then
      echo "OVERLEVDE: $navn ($maal.test.ts er grønn)"
      overlevde=1
    else
      roede=$(echo "$utdata" | grep -oE 'Tests +[0-9]+ failed' | grep -oE '[0-9]+' || true)
      if [ -z "$roede" ] || echo "$utdata" | grep -q 'Failed Suites'; then
        # Rødt av oppsettet beviser ikke at testene ser feilen.
        echo "OPPSETTET FEILET: $navn"
        echo "$utdata" | tail -20
        overlevde=1
      else
        echo "Oppdaget: $navn ($roede røde i $maal.test.ts)"
      fi
    fi
  done
  [ "$overlevde" = 0 ] || { echo "En feilinnføring overlevde" >&2; exit 1; }
fi
echo "== Ferdig"
