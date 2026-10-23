#!/usr/bin/env bash
# Skjermbildene til en PR på grenen `skjermbilder`, som ikke har felles historikk med main (#1222).
#
#   .claude/skills/mockup-nettleser/skjermbilder.sh <pr> <fil>...   legger filene i pr-<pr>/
#   .claude/skills/mockup-nettleser/skjermbilder.sh --slett <pr>    fjerner pr-<pr>/
#
# Skriptet arbeider i en midlertidig bar klon, så arbeidstreet, grenen du står på og
# oppsettet i klonen din er urørt. Det henter bare commiten og trærne på grenen, ikke
# bildene (`--depth=1 --filter=blob:none`). Finnes ikke grenen, lages den uten forelder.
# Et avvist push hentes og prøves på nytt. Til slutt skrives lenkene, festet til commiten, så de virker også etter ryddingen.
set -euo pipefail

GREN=skjermbilder
REPO=khjohns/endringsmeldinger

slett=false
if [[ "${1:-}" == "--slett" ]]; then
  slett=true
  shift
fi
pr="${1:-}"
[[ "$pr" =~ ^[0-9]+$ ]] || { echo "Oppgi PR-nummeret: $0 [--slett] <pr> [fil...]" >&2; exit 1; }
shift
mappe="pr-$pr"
filer=()
if ! $slett; then
  (($#)) || { echo "Oppgi minst én fil." >&2; exit 1; }
  for fil in "$@"; do [[ -f "$fil" ]] || { echo "Finnes ikke: $fil" >&2; exit 1; }; done
  like=$(for fil in "$@"; do basename "$fil"; done | sort | uniq -d)
  [[ -z "$like" ]] || { echo "Samme filnavn to ganger: $like" >&2; exit 1; }
fi

for fil in "$@"; do filer+=("$(realpath "$fil")"); done
url=$(git remote get-url origin)
klon=$(mktemp -d)
trap 'rm -rf "$klon"' EXIT
export GIT_DIR="$klon"
git init -q --bare
git remote add origin "$url"
git config remote.origin.promisor true
git config remote.origin.partialclonefilter blob:none

for forsoek in 1 2 3 4; do
  # Rotens oppføringer utenom mappen; `--missing` slipper å hente bildene.
  # `--exit-code` gir 2 når grenen ikke finnes; en annen feil stopper skriptet.
  finnes=0
  git ls-remote --exit-code -q origin "refs/heads/$GREN" >/dev/null || finnes=$?
  ((finnes == 0 || finnes == 2)) || { echo "Fant ikke ut om $GREN finnes." >&2; exit 1; }
  if ((finnes == 0)); then
    git fetch -q --depth=1 --filter=blob:none origin "$GREN"
    forelder=$(git rev-parse FETCH_HEAD)
    rot=$(git ls-tree "$forelder" | grep -v -P "\t\Q$mappe\E$" || true)
  else
    $slett && { echo "$GREN finnes ikke; ingenting å slette."; exit 0; }
    forelder=
    rot=
  fi
  if $slett; then
    melding="fjern skjermbildene til PR #$pr"
  else
    under=$(for fil in "${filer[@]}"; do
      printf '100644 blob %s\t%s\n' "$(git hash-object -w "$fil")" "$(basename "$fil")"
    done | git mktree)
    rot+="${rot:+$'\n'}"$(printf '040000 tree %s\t%s' "$under" "$mappe")
    melding="legg til skjermbildene til PR #$pr"
  fi
  tre=$(printf '%s\n' "$rot" | { grep -v '^$' || true; } | git mktree --missing)
  if [[ -n "$forelder" && "$tre" == "$(git rev-parse "$forelder^{tree}")" ]]; then
    echo "Ingen endring på $GREN."
    commit=$forelder
    break
  fi
  commit=$(git commit-tree "$tre" ${forelder:+-p "$forelder"} -m "$melding")
  if git -c push.negotiate=false push -q origin "$commit:refs/heads/$GREN"; then break; fi
  ((forsoek < 4)) || { echo "Push til $GREN feilet fire ganger." >&2; exit 1; }
  sleep $((2 ** forsoek))
done

if ! $slett; then
  for fil in "${filer[@]}"; do
    navn=$(basename "$fil")
    echo "![$navn](https://raw.githubusercontent.com/$REPO/$commit/$mappe/$navn)"
  done
fi
