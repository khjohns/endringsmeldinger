---
name: codex
description: Codex (OpenAI) gjennom `codex exec` i en skyøkt i endringsmeldinger. Oppsett, tillatelsesprofiler for review, sparring og bygging, bestilling og oppfølging i samme samtale. Brukes når oppdragsgiver har logget inn i verktøyøkta eller en direkte økt.
---

# Codex i skyøkta

Arbeidsformen, kontrollen og håndteringen av funn er de samme som for Gemini. De står i
[gemini-skillen](../gemini/SKILL.md) («Arbeidsformen», «Bestillingen», «Kontrollen» og
«Funn fra `/code-review`») og bare der. Hvilke PR-er som får et review med en annen
modellfamilie, står i
[leveranseskillen](../leveranse/SKILL.md#review-og-funn) («Review med en annen
modellfamilie»). Hvordan en orkestrert byggeøkt bestiller review, sparring eller bygging,
står i [verktøyøkt-skillen](../verktoyokt/SKILL.md). Her står det som er
annerledes for Codex. Codex er ikke en del av løsningen. Det Codex sier, er en påstand til
Claude har kontrollert det.

## Når

- **Review** av en PR, mot en commit som er pushet. Byggeøkta installerer ingenting.
- **Sparring** i et viktig spørsmål, med reglene i gemini-skillen, «Sparring».
- **Bygging** av et issue på en egen gren i en klon fra `main`.

Passer ikke: det samme som for Gemini (tolkning av NS 8407, vedtak, saksdata, nøkler, push og
merge). Codex har heller ikke GitHub-tilgang og kan ikke skrive kommentarer i en PR.

## Oppsett, én gang per container

1. **Nettverket.** Miljøet må tillate `auth.openai.com` og `chatgpt.com`. Miljøet «Catenda»
   gjør det ikke (403 fra proxyen). Verktøyøkta har sitt eget miljø med vertene
   (verktøyøkt-skillen). Prøven i PR-en som innførte skillen, gikk i et miljø med full
   nettverkstilgang, så det er ikke prøvd om Codex trenger flere verter.
2. **Installasjonen.** Installer i en egen mappe i scratchpad, `$CODEX_MAPPE`, ikke globalt:
   `npm i @openai/codex@0.172.0`. Binæren ligger i `node_modules/.bin/codex`. Profilen og
   kommandoen under er prøvd med 0.171.0 og 0.172.0. En nyere versjon tas i bruk når
   profilen er prøvd med den. Auto-modus i Claude Code kan stoppe installasjonen av en annen
   agent. Da godkjenner oppdragsgiver den i økta, eller bytter modus der.
3. **Innloggingen.** Start `codex login --device-auth` i `tmux`, og gi oppdragsgiver
   lenken og engangskoden. Koden gjelder i 15 minutter. Er den gått ut, startes
   kommandoen på nytt, og oppdragsgiver får den nye koden. `codex login status` bekrefter
   innloggingen. Tokenet ligger i `~/.codex/auth.json`, utenfor repoet. Les ikke fila, og
   ikke legg den i en klon. Svarer Codex «device code login is not enabled», må
   innloggingen med engangskode slås på i sikkerhetsinnstillingene i ChatGPT, eller av
   administratoren for arbeidsområdet ([OpenAI](https://developers.openai.com/codex/auth)).
4. **Datainnsamlingen** er ikke kartlagt. Hva Codex deler med OpenAI, og om det kan slås av,
   må kontrolleres før saksdata eller annet sensitivt går gjennom den. Gi den ingenting
   `agy` heller ikke skulle få.

## Modellen

Modellene og innsatsen for review og sparring er valgt av oppdragsgiver. Standardinnsatsen
i katalogen er `low`, så modellen og innsatsen settes alltid i kommandoen
(`$MODELL` og `$INNSATS`).

| Oppgave | Modell | Innsats |
| --- | --- | --- |
| Review | `gpt-6.2-sol` | `high` |
| Sparring | `gpt-6.2-sol` | `medium` |
| Sparring om arkitektur og andre sammensatte spørsmål | `gpt-6.2-astra` | `high` |
| Bygging | `gpt-6.2-sol` | `medium` |

En nyere Sol eller Astra kan brukes når den står i `codex debug models`. Modellen og
innsatsen står i kommentaren med svaret.

## Kommandoen

### Review og sparring

Samme klon, git-identitet og `env -i` som i gemini-skillen. Klonen settes på commiten med
`git fetch`, fra hovedkopien eller fra `origin` i verktøyøkta. Hver kjøring får en egen mappe i
scratchpad, `$KJOERING`, med bestillingen, skjemaet, diffen, svaret og loggen. Ingenting
skrives i klonen.

Diffen er den samme som GitHub viser i PR-en: `git diff origin/<base>...<sha>`, med tre
punktum og målgrenen til PR-en som `<base>`. Med to punktum viser diffen filene målgrenen har
fått etter at grenen ble laget, som slettet.

```bash
git -C "$KLON" diff "origin/$BASE...$SHA" > "$KJOERING/diff.patch"
cd "$KLON" && env -i HOME="$HOME" PATH="$PATH" TERM=xterm \
  HTTPS_PROXY="$HTTPS_PROXY" https_proxy="$https_proxy" NO_PROXY="$NO_PROXY" no_proxy="$no_proxy" \
  SSL_CERT_FILE="$SSL_CERT_FILE" NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS" \
  timeout 1500 "$CODEX_MAPPE/node_modules/.bin/codex" exec \
  -m "$MODELL" -c "model_reasoning_effort=\"$INNSATS\"" \
  -c 'default_permissions="review"' \
  -c "permissions.review.filesystem={\":minimal\"=\"read\",\"$CODEX_MAPPE\"=\"read\",\"$KLON\"=\"read\",\"$KJOERING\"=\"read\"}" \
  --ephemeral \
  --output-schema "$KJOERING/skjema.json" -o "$KJOERING/svar.json" \
  "$(cat "$KJOERING/bestilling.md")" \
  < /dev/null > "$KJOERING/codex.log" 2>&1
```

Sparring som kan få oppfølging, kjøres uten `--ephemeral` (se «Oppfølging i samme samtale»).

- **Tillatelsesprofilen avgrenser lesingen.** Med `--sandbox read-only` kan kommandoene til
  Codex lese hele filsystemet, også `~/.codex/auth.json` og innloggingen til `agy` i
  `~/.gemini`. Profilen `review` gir lesetilgang bare til systemmappene (`:minimal`),
  installasjonen av Codex, klonen og kjøremappa, og ingen skrivetilgang. Bruk ikke
  `--sandbox` sammen med profilen. Prøvd med `codex sandbox` i 0.171.0: hjemmemappa og
  passordfila til testbasen var usynlige, `git diff` og `rg` virket i klonen, og skriving i
  klonen ble avvist. `codex exec` ber aldri om å kjøre en kommando utenfor sandkassen.
- **Kontroller profilen før kallet.** Kjør `codex debug prompt-input` med de to `-c`-flaggene
  for profilen fra blokken, og se at profilen `review` er valgt. `prompt-input` avviser `-m`,
  `--ephemeral`, `--output-schema` og `-o`, som bare `codex exec` tar. Prøvd 25.11 med blokken
  over (#2256). Loggen viser `sandbox: read-only` både med og uten profilen. Kopier hele kallet
  med alle flaggene. Det gjelder også `resume`. En variabel med flaggene kan miste
  `-c 'default_permissions="review"'` (#2337).
- **`< /dev/null` er påkrevd.** Med `run_in_background` har kommandoen en åpen stdin-pipe, og
  Codex står og venter på den («Reading additional input from stdin...», tom logg).
- **Skjemaet** (`--output-schema`) må være strengt: `additionalProperties: false` og alle
  felt i `required`. `-o` skriver svaret alene til en fil, uten loggen. Skriv dette til
  `$KJOERING/skjema.json`:

  ```json
  {
    "type": "object",
    "additionalProperties": false,
    "required": ["funn", "kontrollert", "usikkert"],
    "properties": {
      "funn": {
        "type": "array",
        "items": {
          "type": "object",
          "additionalProperties": false,
          "required": ["fil", "linje", "prioritet", "sammendrag", "scenario", "kilde"],
          "properties": {
            "fil": { "type": "string" },
            "linje": { "type": "integer" },
            "prioritet": { "type": "string", "enum": ["P0", "P1", "P2", "P3"] },
            "sammendrag": { "type": "string" },
            "scenario": { "type": "string" },
            "kilde": { "type": "string" }
          }
        }
      },
      "kontrollert": { "type": "string" },
      "usikkert": { "type": "string" }
    }
  }
  ```
- **Sandkassen er en reell sperre,** i motsetning til `agy`. Den erstatter likevel ikke de
  andre sperrene i gemini-skillen, «Arbeidsformen».
- **Ingen kommando kan skrive, og `node` ligger utenfor profilen.** Testene, `--ankre` i
  kjernen og andre skript kjører derfor ikke. Claude kjører dem i kontrollen når diffen
  trenger dem.
- **Følg med uten å lese loggen:** `wc -l "$KJOERING/codex.log"` og
  `grep -A1 '^exec' "$KJOERING/codex.log" | tail`. Et review av en diff på 22 filer tok under
  ti minutter og 144 000 tokens. Et review av denne skillen i prøven av verktøyøkta tok 43
  sekunder og 55 000 tokens.
- Kontroller `git status --porcelain` i klonen og i hovedkopien etterpå. Det skal være likt.

### Bygging

Lag klonen fra `main` etter «Arbeidsformen» i gemini-skillen. Bruk en egen git-identitet og
opprett grenen `codex/<kort-navn>-<issue>` før kallet. Legg bestillingen, svaret og loggen i
`$KJOERING`.

Bruk absolutte stier. Sett `$NODE_MAPPE` til Node-installasjonen og `$HOVEDKOPI` til hovedkopien
av repoet. Opprett en egen tmp-mappe i scratchpad og sett `$TMPDIR` til den. Bruk
`node_modules`-lenken etter «Arbeidsformen» i gemini-skillen.

Profilen `bygg` gir lesetilgang til systemmappene (`:minimal`), installasjonene av Codex og
Node, hovedkopiens `node_modules` og kjøremappa. Den gir skrivetilgang til klonen, klonens
`.git` og tmp-mappa. Git trenger den egne skrivetilgangen til `.git` for å committe. Bruk
`env -i` og utelat `--sandbox` og `--ephemeral`. Profilen er prøvd i #2532. Skriving utenfor
de skrivbare mappene og lesing av `~/.gemini` ble avvist i kontrollkjøringen.

```bash
cd "$KLON" && env -i HOME="$HOME" PATH="$NODE_MAPPE/bin:$PATH" TERM=xterm TMPDIR="$TMPDIR" \
  HTTPS_PROXY="$HTTPS_PROXY" https_proxy="$https_proxy" NO_PROXY="$NO_PROXY" no_proxy="$no_proxy" \
  SSL_CERT_FILE="$SSL_CERT_FILE" NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS" \
  timeout 1500 "$CODEX_MAPPE/node_modules/.bin/codex" exec \
  -m "$MODELL" -c "model_reasoning_effort=\"$INNSATS\"" \
  -c 'default_permissions="bygg"' \
  -c "permissions.bygg.filesystem={\":minimal\"=\"read\",\"$CODEX_MAPPE\"=\"read\",\"$NODE_MAPPE\"=\"read\",\"$HOVEDKOPI/node_modules\"=\"read\",\"$KLON\"=\"write\",\"$KLON/.git\"=\"write\",\"$TMPDIR\"=\"write\",\"$KJOERING\"=\"read\"}" \
  -o "$KJOERING/svar.md" "$(cat "$KJOERING/bestilling.md")" \
  < /dev/null > "$KJOERING/codex.log" 2>&1
```

Kontroller at `bygg` er valgt med `codex debug prompt-input` og de to profilflaggene.
Kontroller `git status --porcelain` og commitene i klonen etterpå. Sammenlign
`git status --porcelain` i hovedkopien før og etter.

### Oppfølging i samme samtale

Bruk `codex exec resume <id>` med sesjons-ID-en fra «session id» i loggen. Ved bygging
kopierer du hele byggekallet og bytter `exec` til `exec resume <id>`. Behold `-o` og alle
`-c`-flaggene, også de to for `bygg`. Kopier hvert flagg i sin helhet.
Ikke samle flaggene i en variabel. Bruk oppfølgingen som bestilling. En samtale som ble
kjørt med `--ephemeral`, kan ikke fortsettes.

## Bestillingen

Malene for review og bygging står i
[verktøyøkt-skillen](../verktoyokt/SKILL.md#bestillingen-til-verktøyet). Bruk dem også
utenfor verktøyøkta. Codex laster verken `CLAUDE.md` eller `.claude/`, og repoet har ingen
`AGENTS.md`. Ta derfor med filnavnene fra
[leselista i byggebestillingen](../verktoyokt/SKILL.md#bygging-med-codex). Legg issuet og
de relevante kommentarene i kjøremappa. Ved review viser bestillingen til den absolutte
stien til `$KJOERING/diff.patch`. Codex kjører hver kommando i `bash -lc`.

## Svaret

Claude kontrollerer svaret etter gemini-skillen, «Kontrollen». Leveringen står i
[verktøyøkt-skillen, «Svaret»](../verktoyokt/SKILL.md#svaret).

## Ikke prøvd

- Kontroll av lesesperren med profilen `review` i `codex exec`.
- En større PR med profilen `bygg`.
- Testkommandoene i byggeprofilen med lesetilgang til hovedkopiens `node_modules`.
- Om en `.codex/`-mappe i klonen kan endre sandkassen eller tillatelsene.
- Oppfølging med `codex exec resume` av en sparring som er kjørt uten `--ephemeral`.
