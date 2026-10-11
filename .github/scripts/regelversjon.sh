#!/usr/bin/env bash
# Regelversjonsvakten. Tre kontroller, som hver kan feile:
#
# 1. B-13 (hovedplanen 3.1, 24.09) og #191: endres reglene i src/lib/domain/
#    eller backend/regler/, må REGELVERSJON økes i begge speilene.
# 2. B-14 (merknaden 09.10) og #308: endres regelsettet i kjerne/regler/, må
#    REGELVERSJON i kjerne/regler/regelsett.ts økes. Det samme gjelder
#    kjerne/frosset/, som bestemmer hva beslutningsgrunnlaget fryser
#    (MM-U11, #330, #309). Den krever også PROJEKSJONSVERSJON, som resten av
#    kjernen. Finnes kjerne/ uten frosset/standpunkt.ts, feiler vakten, så
#    kravet ikke forsvinner ved en omdøping. Endres resten av
#    TS-koden i kjernen utenom testene, må PROJEKSJONSVERSJON i
#    kjerne/versjon.ts økes, fordi et bufret resultat ellers kan brukes av en
#    kjerne som regner annerledes (2.7 i modellforslaget). En fil der en
#    flytting bare har endret importstiene, regnes ikke som endret (#309,
#    .github/scripts/flytting.py). En fil som flyttes ut av regler/ eller
#    frosset/, regnes som endret.
# 3. B-10 og #316: et nytt format leses i én versjon før det skrives i den
#    neste. FORMAT i kjerne/format/format.ts kan derfor bare økes til LESERFORMAT slik
#    det stod i BASE, LESERFORMAT senkes aldri, og LESERFORMAT er aldri lavere
#    enn FORMAT. Kontrollen ser på diffen mot BASE, ikke på hva som er rullet
#    ut; en PR som både leser og skriver et nytt format, feiler.
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
standpunkt=kjerne/frosset/standpunkt.ts
if [ -d kjerne ] && [ ! -f "$standpunkt" ]; then
  echo "::error::$standpunkt finnes ikke. Flytt kravet om REGELVERSJON i $0 med funksjonene som bestemmer hva beslutningsgrunnlaget fryser."
  feil=1
fi
# En fil der bare importstiene er endret av en flytting, regnes ikke som endret
# (#309); .github/scripts/flytting.py avgjør det.
fra=$(git merge-base "$BASE" HEAD) || exit 2
flytting=$(git diff --name-status -M "$fra" HEAD -- ':(glob)kjerne/**/*.ts' \
  ":(exclude)kjerne/tester") || exit 2
endret=$(python3 "$(dirname "$0")/flytting.py" "$fra" --dekket kjerne/regler/ kjerne/frosset/ \
  <<< "$flytting") || exit 2
flyttet=$(comm -23 <(awk -F'\t' '{ print $NF }' <<< "$flytting" | grep . | sort) <(sort <<< "$endret"))
if [ -n "$flyttet" ]; then
  echo "Bare flyttet, med importstiene ombundet:"; echo "$flyttet"
fi
regler=$(grep -E '^kjerne/(regler|frosset)/' <<< "$endret")
if [ -z "$regler" ]; then
  echo "Ingen endring i kjerne/regler/ eller kjerne/frosset/."
else
  echo "Endret i regelsettet:"; echo "$regler"
  if ! okt "$regelsett" les_regelversjon; then
    echo "::error file=$regelsett::Regelsettet i kjernen er endret. Øk REGELVERSJON i $regelsett."
    feil=1
  fi
fi
utledning=$(grep -v '^kjerne/regler/' <<< "$endret" | grep .)
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
format=kjerne/format/format.ts
les_konstant() { sed -n "s/^export const $1 = \([0-9][0-9]*\);\$/\1/p"; }
echo
if [ -d kjerne ] && [ ! -f "$format" ]; then
  echo "::error::$format finnes ikke. Flytt kontrollen av formatet i $0 med konstantene FORMAT og LESERFORMAT."
  feil=1
fi
if [ -f "$format" ]; then
  # Er fila flyttet, leses versjonen i BASE fra fila som da hadde konstanten,
  # også når git ikke kjenner igjen omdøpingen.
  for_sti=$format
  if ! git cat-file -e "$BASE:$format" 2>/dev/null; then
    for_sti=$(git grep -l '^export const FORMAT = ' "$BASE" -- kjerne ':(exclude)kjerne/tester' \
      | head -n 1 | cut -d: -f2-)
  fi
  for_tekst=$(git show "$BASE:$for_sti" 2>/dev/null)
  skriver_for=$(les_konstant FORMAT <<< "$for_tekst")
  # Før LESERFORMAT fantes, leste kjernen høyst FORMAT.
  leser_for=$(les_konstant LESERFORMAT <<< "$for_tekst")
  leser_for=${leser_for:-$skriver_for}
  skriver=$(les_konstant FORMAT < "$format"); leser=$(les_konstant LESERFORMAT < "$format")
  echo "$format: FORMAT ${skriver_for:-ingen} -> ${skriver:-ingen}, LESERFORMAT ${leser_for:-ingen} -> ${leser:-ingen}"
  if [ -z "$skriver" ] || [ -z "$leser" ]; then
    echo "::error file=$format::Fant ikke FORMAT og LESERFORMAT. Flytt kontrollen i $0 med konstantene."
    feil=1
  elif [ -n "$leser_for" ] && [ "$leser" -lt "$leser_for" ]; then
    echo "::error file=$format::LESERFORMAT er senket fra $leser_for til $leser. Saker med rader i format $leser_for ville stoppe (MM-U2). En tilbakerulling er en eldre utgivelse, ikke en endring i koden (B-10)."
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
