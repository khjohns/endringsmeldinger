#!/usr/bin/env bash
# Regelversjonsvakten. Tre kontroller, som hver kan feile:
#
# 1. B-13 (hovedplanen 3.1, 24.09) og #191: endres reglene i src/lib/domain/
#    eller backend/regler/, må REGELVERSJON økes i begge speilene.
# 2. B-14 (merknaden 09.10) og #308: endres regelsettet i kjerne/regler/, må
#    REGELVERSJON i kjerne/regler/regelsett.ts økes. Det samme gjelder
#    kjerne/standpunkt.ts, som bestemmer hva beslutningsgrunnlaget fryser
#    (MM-U11, #330). Den krever også PROJEKSJONSVERSJON, som resten av
#    kjernen. Finnes kjerne/ uten standpunkt.ts, feiler vakten, så kravet
#    ikke forsvinner ved en omdøping. Endres resten av
#    TS-koden i kjernen utenom testene, må PROJEKSJONSVERSJON i
#    kjerne/versjon.ts økes, fordi et bufret resultat ellers kan brukes av en
#    kjerne som regner annerledes (2.7 i modellforslaget).
# 3. B-10 og #316: et nytt format leses i én versjon før det skrives i den
#    neste. FORMAT i kjerne/format.ts kan derfor bare økes til LESERFORMAT slik
#    det stod i BASE, og LESERFORMAT er aldri lavere enn FORMAT. Kontrollen ser
#    på diffen mot BASE, ikke på hva som er rullet ut; en PR som både leser og
#    skriver et nytt format, feiler.
#
# Lokalt: BASE=<sha> .github/scripts/regelversjon.sh
set -u

if [ -z "${BASE:-}" ]; then
  echo "Bruk: BASE=<sha> $0" >&2
  exit 2
fi
cd "$(git rev-parse --show-toplevel)" || exit 2

feil=0

# Versjonen i $1 før og etter, lest med $2. Feiler når den ikke er økt.
okt() {
  fil=$1; for=$(git show "$BASE:$fil" 2>/dev/null | $2); etter=$($2 < "$fil" 2>/dev/null)
  echo "$fil: ${for:-ingen} -> ${etter:-ingen}"
  [ -n "$etter" ] && [ "$etter" -gt "${for:-0}" ]
}

# --- 1. Speilene i frontenden og Python ---
ts=src/lib/domain/regelversjon.ts
py=backend/regler/__init__.py
fixtur=backend/tests/fixtures/skjemaenes_nyttelast.json
endret=$(git diff --name-only "$BASE"...HEAD -- src/lib/domain backend/regler \
  ":(exclude)src/lib/domain/__tests__") || exit 2
if [ -z "$endret" ]; then
  echo "Ingen endring i src/lib/domain/ eller backend/regler/ utenom testene."
else
  echo "Endret:"; echo "$endret"
  les_ts() { sed -n 's/^export const REGELVERSJON = \([0-9][0-9]*\);$/\1/p'; }
  les_py() { sed -n 's/^REGELVERSJON = \([0-9][0-9]*\)$/\1/p'; }
  speilfeil=0
  for par in "$ts les_ts" "$py les_py"; do
    set -- $par
    if ! okt "$1" "$2"; then
      echo "::error file=$1::Reglene er endret. Øk REGELVERSJON i $ts og $py, og regenerer $fixtur."
      speilfeil=1
    fi
  done
  if [ "$speilfeil" -eq 0 ]; then
    echo "::notice file=$fixtur::REGELVERSJON er økt. Regenerer $fixtur med npx vitest run -u src/lib/kontraktsbord/skjemanyttelast.test.ts."
  fi
  echo
  echo "Når REGELVERSJON er økt, må fixturen $fixtur regenereres,"
  echo "ellers feiler npm test. Backend-testene leser samme fixture:"
  echo "  npx vitest run -u src/lib/kontraktsbord/skjemanyttelast.test.ts"
  echo "  cd backend && /tmp/venv/bin/python -m pytest -q"
  feil=$speilfeil
fi

# --- 2. Kjernen ---
regelsett=kjerne/regler/regelsett.ts
versjon=kjerne/versjon.ts
les_regelversjon() { sed -n 's/^export const REGELVERSJON = \([0-9][0-9]*\);$/\1/p'; }
les_projeksjon() { sed -n 's/^export const PROJEKSJONSVERSJON = \([0-9][0-9]*\);$/\1/p'; }
echo
standpunkt=kjerne/standpunkt.ts
if [ -d kjerne ] && [ ! -f "$standpunkt" ]; then
  echo "::error::$standpunkt finnes ikke. Flytt kravet om REGELVERSJON i $0 med funksjonene som bestemmer hva beslutningsgrunnlaget fryser."
  feil=1
fi
regler=$(git diff --name-only "$BASE"...HEAD -- ':(glob)kjerne/regler/**/*.ts' \
  "$standpunkt") || exit 2
if [ -z "$regler" ]; then
  echo "Ingen endring i kjerne/regler/ eller kjerne/standpunkt.ts."
else
  echo "Endret i regelsettet:"; echo "$regler"
  if ! okt "$regelsett" les_regelversjon; then
    echo "::error file=$regelsett::Regelsettet i kjernen er endret. Øk REGELVERSJON i $regelsett."
    feil=1
  fi
fi
utledning=$(git diff --name-only "$BASE"...HEAD -- ':(glob)kjerne/**/*.ts' \
  ":(exclude)kjerne/regler" ":(exclude)kjerne/tester") || exit 2
if [ -z "$utledning" ]; then
  echo "Ingen endring i kjernen utenom regelsettet og testene."
else
  echo "Endret i kjernen:"; echo "$utledning"
  if ! okt "$versjon" les_projeksjon; then
    echo "::error file=$versjon::Kjernen er endret. Øk PROJEKSJONSVERSJON i $versjon."
    feil=1
  fi
fi

# --- 3. Formatet i to trinn ---
format=kjerne/format.ts
les_konstant() { sed -n "s/^export const $1 = \([0-9][0-9]*\);\$/\1/p"; }
echo
if [ -f "$format" ]; then
  for_tekst=$(git show "$BASE:$format" 2>/dev/null)
  skriver_for=$(les_konstant FORMAT <<< "$for_tekst")
  # Før LESERFORMAT fantes, leste kjernen høyst FORMAT.
  leser_for=$(les_konstant LESERFORMAT <<< "$for_tekst")
  leser_for=${leser_for:-$skriver_for}
  skriver=$(les_konstant FORMAT < "$format"); leser=$(les_konstant LESERFORMAT < "$format")
  echo "$format: FORMAT ${skriver_for:-ingen} -> ${skriver:-ingen}, LESERFORMAT ${leser_for:-ingen} -> ${leser:-ingen}"
  if [ -z "$skriver" ] || [ -z "$leser" ]; then
    echo "::error file=$format::Fant ikke FORMAT og LESERFORMAT. Flytt kontrollen i $0 med konstantene."
    feil=1
  elif [ "$leser" -lt "$skriver" ]; then
    echo "::error file=$format::LESERFORMAT ($leser) er lavere enn FORMAT ($skriver). Kjernen må lese det den skriver."
    feil=1
  elif [ -n "$skriver_for" ] && [ "$skriver" -gt "$skriver_for" ] && [ "$skriver" -gt "$leser_for" ]; then
    echo "::error file=$format::FORMAT er økt til $skriver, men versjonen før leste bare format $leser_for. Øk LESERFORMAT i en egen utrulling først (B-10)."
    feil=1
  fi
fi
exit $feil
