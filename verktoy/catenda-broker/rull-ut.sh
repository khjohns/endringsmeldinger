#!/usr/bin/env bash
# Ruller ut token-brokeren (#806) fra en gjennomgått commit, og bare etter at
# oppdragsgiver har sett diffen siden forrige utrulling og skrevet «ja».
# Kjøres fra egen maskin, aldri fra en skyøkt.
set -euo pipefail

WRANGLER=(npx wrangler@4.147.0)
MAPPE=verktoy/catenda-broker
TILSTAND="${XDG_STATE_HOME:-$HOME/.local/state}/catenda-broker/sist-utrullet"

cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Arbeidstreet har uncommittede endringer. Rull bare ut en commit." >&2
  exit 1
fi

git fetch -q origin main
commit=$(git rev-parse HEAD)
if ! git merge-base --is-ancestor "$commit" origin/main; then
  echo "HEAD ($commit) er ikke på origin/main. Rull bare ut flettet kode." >&2
  exit 1
fi

forrige=$(cat "$TILSTAND" 2>/dev/null || true)
if [ -n "$forrige" ] && git cat-file -e "$forrige^{commit}" 2>/dev/null; then
  echo "Endringer i $MAPPE siden forrige utrulling ($forrige):"
  git --no-pager diff --stat "$forrige" "$commit" -- "$MAPPE"
  git --no-pager diff "$forrige" "$commit" -- "$MAPPE/broker.ts" "$MAPPE/wrangler.toml"
else
  echo "Ingen kjent forrige utrulling på denne maskinen. Hele brokeren:"
  git --no-pager show "$commit:$MAPPE/broker.ts"
  git --no-pager show "$commit:$MAPPE/wrangler.toml"
fi

echo
read -r -p "Rull ut $commit? Skriv ja: " svar
if [ "$svar" != "ja" ]; then
  echo "Avbrutt." >&2
  exit 1
fi

(cd "$MAPPE" && "${WRANGLER[@]}" deploy --tag "${commit:0:12}" --message "commit $commit")
mkdir -p "$(dirname "$TILSTAND")"
echo "$commit" >"$TILSTAND"
echo "Utrullet $commit."
