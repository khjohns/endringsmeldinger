#!/usr/bin/env bash
# Skriver summen av det testbasen bygges av: bygg_testbase.sh, plattformstubben
# og migrasjonene i filnavnrekkefølge. bygg_testbase.sh lagrer den i basen
# (`koe.migrasjonssum`), og oppstartshooken og testoppsettet i TS
# nekter eller bygger på nytt en base med en annen sum (#379).
#
# Bruk: scripts/testbase/migrasjonssum.sh [rot]   # rot er repoet, som standard dette
set -euo pipefail
export LC_ALL=C

cd "${1:-$(dirname "${BASH_SOURCE[0]}")/../..}"
# macOS har shasum, ikke sha256sum.
sha256() { if command -v sha256sum > /dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi; }
sha256 scripts/testbase/bygg_testbase.sh scripts/testbase/plattformstubb.sql supabase/migrations/*.sql \
  | sha256 | cut -d' ' -f1
