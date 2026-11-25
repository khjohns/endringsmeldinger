---
name: codex
description: Codex (OpenAI) gjennom `codex exec` i en skyøkt i endringsmeldinger, for review og sparring med en annen modellfamilie. Oppsettet (verter, installasjon, innlogging), kommandoen med tillatelsesprofil som bare lar Codex lese klonen og kjøremappa, skjemaet, hva som er prøvd og ikke, og forskjellene fra gemini-skillen. Brukes når verktøyøkta, en orkestrator eller en direkte økt vil ha et review eller sparring av Codex, i en økt der oppdragsgiver har logget inn.
---

# Codex i skyøkta

Arbeidsformen, kontrollen og håndteringen av funn er de samme som for Gemini. De står i
[gemini-skillen](../gemini/SKILL.md) («Arbeidsformen», «Bestillingen», «Kontrollen» og
«Funn fra `/code-review`») og bare der. Hvilke PR-er som får et review med en annen
modellfamilie, står i
[leveranseskillen](../leveranse/SKILL.md#review-og-funn) («Review med en annen
modellfamilie»). Hvordan en orkestrert byggeøkt får et review fra en økt der oppdragsgiver
har logget inn, står i [verktøyøkt-skillen](../verktoyokt/SKILL.md). Her står det som er
annerledes for Codex. Codex er ikke en del av løsningen. Det Codex sier, er en påstand til
Claude har kontrollert det.

## Når

- **Review** av en PR, mot en commit som er pushet. Byggeøkta installerer ingenting.
- **Sparring** i et viktig spørsmål, med reglene i gemini-skillen, «Sparring».

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

Valgt av oppdragsgiver 24.11. Standardinnsatsen i katalogen er `low`, så modellen og
innsatsen settes alltid i kommandoen (`$MODELL` og `$INNSATS`).

| Oppgave | Modell | Innsats |
| --- | --- | --- |
| Review | `gpt-6.2-sol` | `high` |
| Sparring | `gpt-6.2-sol` | `medium` |
| Sparring om arkitektur og andre sammensatte spørsmål | `gpt-6.2-astra` | `high` |

En nyere Sol eller Astra kan brukes når den står i `codex debug models`. Modellen og
innsatsen står i kommentaren med svaret.

## Kommandoen

Samme klon, git-identitet og `env -i` som i gemini-skillen. Klonen settes på commiten med
`git fetch`, fra hovedkopien eller fra `origin` i verktøyøkta. Hver kjøring får en egen mappe i
scratchpad, `$KJOERING`, med bestillingen, skjemaet, diffen, svaret og loggen. Ingenting
skrives i klonen.

Diffen er den samme som GitHub viser i PR-en: `git diff origin/<base>...<sha>`, med tre
punktum og målgrenen til PR-en som `<base>`. Med to punktum viser diffen filene målgrenen har
fått etter at grenen ble laget, som slettet.

```bash
git -C "$KLON" diff "origin/$BASE...$SHA" > "$KJOERING/diff.patch"
LESBART="permissions.review.filesystem={\":minimal\"=\"read\",\"$CODEX_MAPPE\"=\"read\",\"$KLON\"=\"read\",\"$KJOERING\"=\"read\"}"
cd "$KLON" && env -i HOME="$HOME" PATH="$PATH" TERM=xterm \
  HTTPS_PROXY="$HTTPS_PROXY" https_proxy="$https_proxy" NO_PROXY="$NO_PROXY" no_proxy="$no_proxy" \
  SSL_CERT_FILE="$SSL_CERT_FILE" NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS" \
  timeout 1500 "$CODEX_MAPPE/node_modules/.bin/codex" exec \
  -m "$MODELL" -c "model_reasoning_effort=\"$INNSATS\"" \
  -c 'default_permissions="review"' -c "$LESBART" --ephemeral \
  --output-schema "$KJOERING/skjema.json" -o "$KJOERING/svar.json" \
  "$(cat "$KJOERING/bestilling.md")" \
  < /dev/null > "$KJOERING/codex.log" 2>&1
```

- **Tillatelsesprofilen avgrenser lesingen.** Med `--sandbox read-only` kan kommandoene til
  Codex lese hele filsystemet, også `~/.codex/auth.json` og innloggingen til `agy` i
  `~/.gemini`. Profilen `review` gir lesetilgang bare til systemmappene (`:minimal`),
  installasjonen av Codex, klonen og kjøremappa, og ingen skrivetilgang. Bruk ikke
  `--sandbox` sammen med profilen. Prøvd med `codex sandbox` i 0.171.0: hjemmemappa og
  passordfila til testbasen var usynlige, `git diff` og `rg` virket i klonen, og skriving i
  klonen ble avvist. `codex debug prompt-input` viste at profilen ble valgt. `codex exec`
  ber aldri om å kjøre en kommando utenfor sandkassen.
- **Kontroller profilen før kallet.** Kjør `codex debug prompt-input` med de samme flaggene, og
  se at profilen `review` er valgt. Loggen er ikke et bevis, for den viser `sandbox: read-only`
  både med og uten profilen. Kopier hele kallet, og samle ikke flaggene i en ny variabel. I
  #2337 falt `-c 'default_permissions="review"'` ut på den måten.
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
- **Oppfølging i samme samtale.** `codex exec resume <id>` er prøvd og virker, og `-o` virker med den. Id-en står i loggen som «session id» (#2256).
  Etter en kjøring med `--ephemeral` kan samtalen ikke fortsettes (#2337). Sparring som kan få
  oppfølging, kjøres derfor uten `--ephemeral`.

## Bestillingen

Malen for et review står i
[verktøyøkt-skillen](../verktoyokt/SKILL.md#bestillingen-til-verktøyet), også når Codex
kjøres utenfor verktøyøkta. For Codex gjelder i tillegg at diffen ligger i
`$KJOERING/diff.patch`, at bestillingen viser til den absolutte stien, og at Codex kan lese
klonen og kjøremappa, ikke resten av scratchpad. Codex kjører hver kommando i `bash -lc`.

## Svaret

Svaret er ukontrollert til Claude har vurdert det etter gemini-skillen, «Kontrollen». Det
postes etter [verktøyøkt-skillen, «Svaret»](../verktoyokt/SKILL.md#svaret).

## Ikke prøvd

- At profilen sperrer lesing utenfor klonen i en kjøring med `codex exec`. Sperren er prøvd
  med `codex sandbox`. Med `codex exec` er bare reviewet prøvd, i prøven av verktøyøkta
  (0.172.0).
- Bygging og commit i en klon med `workspace-write`, og testkommandoene med
  `node_modules`-lenke.
- Om en `.codex/`-mappe i klonen kan endre sandkassen eller tillatelsene.
- Oppfølging med `codex exec resume` av en sparring som er kjørt uten `--ephemeral`.
