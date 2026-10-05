#!/usr/bin/env bash
# B-13 (hovedplanen 3.1, 24.09) og #191: endres reglene i src/lib/domain/ eller
# backend/regler/, må REGELVERSJON økes i begge speilene.
# Lokalt: BASE=<sha> .github/scripts/regelversjon.sh
set -u

if [ -z "${BASE:-}" ]; then
  echo "Bruk: BASE=<sha> $0" >&2
  exit 2
fi
cd "$(git rev-parse --show-toplevel)" || exit 2

ts=src/lib/domain/regelversjon.ts
py=backend/regler/__init__.py
fixtur=backend/tests/fixtures/skjemaenes_nyttelast.json
endret=$(git diff --name-only "$BASE"...HEAD -- src/lib/domain backend/regler \
  ":(exclude)src/lib/domain/__tests__") || exit 2
if [ -z "$endret" ]; then
  echo "Ingen endring i src/lib/domain/ eller backend/regler/ utenom testene."
  exit 0
fi
echo "Endret:"; echo "$endret"
les_ts() { sed -n 's/^export const REGELVERSJON = \([0-9][0-9]*\);$/\1/p'; }
les_py() { sed -n 's/^REGELVERSJON = \([0-9][0-9]*\)$/\1/p'; }
feil=0
kontroller() {
  fil=$1; for=$(git show "$BASE:$fil" 2>/dev/null | $2); etter=$($2 < "$fil")
  echo "$fil: ${for:-ingen} -> ${etter:-ingen}"
  if [ -z "$etter" ] || [ "$etter" -le "${for:-0}" ]; then
    echo "::error file=$fil::Reglene er endret. Øk REGELVERSJON i $ts og $py, og regenerer $fixtur."
    feil=1
  fi
}
kontroller "$ts" les_ts
kontroller "$py" les_py
if [ "$feil" -eq 0 ]; then
  echo "::notice file=$fixtur::REGELVERSJON er økt. Regenerer $fixtur med npx vitest run -u src/lib/kontraktsbord/skjemanyttelast.test.ts."
fi
echo
echo "Når REGELVERSJON er økt, må fixturen $fixtur regenereres,"
echo "ellers feiler npm test. Backend-testene leser samme fixture:"
echo "  npx vitest run -u src/lib/kontraktsbord/skjemanyttelast.test.ts"
echo "  cd backend && /tmp/venv/bin/python -m pytest -q"
exit $feil
