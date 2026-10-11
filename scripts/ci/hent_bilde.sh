#!/usr/bin/env bash
# Henter et containerbilde fra den første av flere kilder som svarer, og gir
# det et lokalt navn. Delte runnere treffer de anonyme grensene hos Docker Hub
# («toomanyrequests») og ECR Public («Data limit exceeded») (#327); en
# `services:`-blokk gir opp etter tre forsøk mot én kilde.
#
# Bruk: scripts/ci/hent_bilde.sh <lokalt navn> <kilde>...
#
# Kildene prøves i rekkefølge, i opptil tre runder med økende venting mellom,
# og hver henting avbrytes etter tre minutter. Med tre kilder er det verste
# tilfellet under en halvtime, innenfor timeout-minutes i feilinnfoering.yml.
# Skriptet skriver ut kilden og digesten det fikk, og feiler først når ingen
# kilde svarte i noen runde. Ligger bildet alt lokalt under det lokale navnet
# eller en av kildene, hentes det ikke på nytt.
set -euo pipefail

if (( $# < 2 )); then
  echo "Bruk: $0 <lokalt navn> <kilde>..." >&2
  exit 2
fi

lokalt="$1"
shift

if id="$(docker image inspect --format '{{.Id}}' "$lokalt" 2> /dev/null)"; then
  echo "$lokalt finnes lokalt ($id) og hentes ikke."
  exit 0
fi
for kilde in "$@"; do
  if id="$(docker image inspect --format '{{.Id}}' "$kilde" 2> /dev/null)"; then
    docker tag "$kilde" "$lokalt"
    echo "$lokalt finnes lokalt som $kilde ($id) og hentes ikke."
    exit 0
  fi
done

# macOS har ikke timeout uten coreutils.
tidsavbrudd=()
if command -v timeout > /dev/null; then
  tidsavbrudd=(timeout 180)
fi

ventetid=20
for runde in 1 2 3; do
  for kilde in "$@"; do
    echo "Runde $runde: henter $kilde"
    if ${tidsavbrudd[@]+"${tidsavbrudd[@]}"} docker pull --quiet "$kilde"; then
      docker tag "$kilde" "$lokalt"
      # Docker lagrer Docker Hub-bilder uten docker.io/library/ i RepoDigests.
      repo="${kilde%:*}"
      repo="${repo#docker.io/}"
      repo="${repo#library/}"
      digest="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$kilde" |
        awk -F@ -v repo="$repo" '$1 == repo')"
      echo "::notice title=Containerbilde::$lokalt hentet fra $kilde ($digest)"
      exit 0
    fi
    echo "::warning title=Containerbilde::Henting av $kilde feilet i runde $runde."
  done
  if (( runde < 3 )); then
    echo "Ingen kilde svarte. Venter ${ventetid}s."
    sleep "$ventetid"
    ventetid=$((ventetid * 3))
  fi
done

echo "::error title=Containerbilde::Fikk ikke hentet $lokalt fra noen kilde: $*"
exit 1
