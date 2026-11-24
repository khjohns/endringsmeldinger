---
name: codex
description: Codex (OpenAI) gjennom `codex exec` i en skyøkt i endringsmeldinger, for review og sparring med en annen modellfamilie. Oppsettet (installasjon, innlogging), kommandoen med tillatelsesprofil som bare lar Codex lese klonen og kjøremappa, skjemaet, hva som er prøvd og ikke, og forskjellene fra gemini-skillen. Brukes når reviewøkta, en orkestrator eller en direkte økt vil ha et ekstra review eller sparring av Codex, og bare i en økt der oppdragsgiver har logget inn. En orkestrert byggeøkt bruker Codex gjennom reviewøkta.
---

# Codex i skyøkta

Arbeidsformen, kontrollen og håndteringen av funn er de samme som for Gemini. De står i
[gemini-skillen](../gemini/SKILL.md) («Arbeidsformen», «Bestillingen», «Kontrollen» og
«Funn fra `/code-review`») og bare der. Her står det som er annerledes for Codex.
Codex er ikke en del av løsningen. Det Codex sier, er en påstand til Claude har
kontrollert det etter [leveranseskillen](../leveranse/SKILL.md).

## Når

- **Ekstra review** av en PR, i tillegg til `/code-review` og ikke i stedet. Byggeøkta
  installerer ingenting. I en orkestrert runde kjører [reviewøkta](../reviewokt/SKILL.md)
  det mot commiten byggeøkta har pushet.
- **Sparring** i et viktig spørsmål, med reglene i gemini-skillen, «Sparring».

Passer ikke: det samme som for Gemini (tolkning av NS 8407, vedtak, saksdata, nøkler, push og
merge). Codex har heller ikke GitHub-tilgang og kan ikke skrive kommentarer i en PR.
Reviewøkta poster svaret som en ukontrollert kommentar, og Claude fører vurderingen
(«Kontrollen»).

Innloggingen gjøres for hånd i hver container, så Codex kjører bare i en økt der
oppdragsgiver har logget inn: reviewøkta, orkestratoren eller en direkte økt. De orkestrerte
byggeøktene og rutinene bruker reviewøkta.

## Oppsett, én gang per container

1. **Nettverket.** `auth.openai.com` og `chatgpt.com` var tilgjengelige uten endring i
   miljøet. Mangler en vert, foreslås den med miljøverktøyene.
2. **Installasjonen.** Installer i en egen mappe i scratchpad, `$CODEX_MAPPE`, ikke globalt:
   `npm i @openai/codex`. Binæren ligger i `node_modules/.bin/codex`. Prøvd med 0.171.0.
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

Innloggingen og installasjonen forsvinner når containeren tas tilbake etter en periode uten
aktivitet. Kontroller `codex login status` før hver kjøring.

## Kommandoen

Samme klon, git-identitet og `env -i` som i gemini-skillen. Klonen settes på commiten med
`git fetch`, fra hovedkopien eller fra `origin` i reviewøkta. Hver kjøring får en egen mappe i
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
- **`< /dev/null` er påkrevd.** Med `run_in_background` har kommandoen en åpen stdin-pipe, og
  Codex står og venter på den («Reading additional input from stdin...», tom logg).
- **Skjemaet** (`--output-schema`) er et strengt JSON-skjema: `additionalProperties: false`
  og alle felt i `required`. Raden per funn har fil, linje, prioritet P0–P3, sammendrag,
  scenario og kilde. Svaret har i tillegg `kontrollert` og `usikkert`. `-o` skriver svaret
  alene til en fil, uten loggen.
- **Sandkassen er en reell sperre,** i motsetning til `agy`. Den erstatter likevel ikke de
  andre sperrene (egen klon, `no_push`, regelsettet for `main`).
- **Ingen kommando kan skrive, og `node` ligger utenfor profilen.** Testene, `--ankre` i
  kjernen og andre skript kjører derfor ikke. Kontrollene som må kjøre, kjører Claude selv.
- **Følg med uten å lese loggen:** `wc -l "$KJOERING/codex.log"` og
  `grep -A1 '^exec' "$KJOERING/codex.log" | tail`. Et review av en diff på 22 filer tok under
  ti minutter og 144 000 tokens.
- Kontroller `git status --porcelain` i klonen og i hovedkopien etterpå. Det skal være likt.

## Bestillingen

Som i gemini-skillen, og i tillegg:

- Diffen ligger i `$KJOERING/diff.patch`, og bestillingen viser til den absolutte stien.
  Codex kan lese klonen og kjøremappa, ikke resten av scratchpad.
- Be om én kommando per kall. Codex kjører hver kommando i `bash -lc`.
- Be om at «kontrollert» sier hva den leste og søkte etter, og at «usikkert» sier hva den
  ikke fikk kjørt. En tom funnliste er et gyldig svar, men bare med den begrunnelsen.

Malen for review-bestillingen står i [reviewøkt-skillen](../reviewokt/SKILL.md#bestillingen-til-verktøyet).

## Kontrollen

Som i gemini-skillen. Er funnlisten tom, kontrollerer Claude det avgjørende leddet (kallet
eller søket) og kjører det Codex ikke fikk kjørt, som arkitekturtesten og `--ankre`.
Funnene fra Codex følger stoppregelen i leveranseskillen, «Review og funn».

Svaret er ukontrollert til Claude har vurdert det. Reviewøkta poster det ordrett som en
kommentar merket «ukontrollert» ([reviewøkt-skillen](../reviewokt/SKILL.md#svaret)), og
byggeøkta fører vurderingen i tabellen «Funn og utfall». Ellers poster Claude funnene etter at
de er kontrollert. Svar på sparring postes ikke i PR-en.

## Ikke prøvd

- `codex exec` med profilen `review` fra ende til ende. Profilen er prøvd med `codex sandbox`
  og `codex debug prompt-input`, ikke i en kjøring med innlogging.
- Bygging og commit i en klon med `workspace-write`, og testkommandoene med
  `node_modules`-lenke.
- Sparring med `--conversation`-tilsvarende (`codex exec resume`).
- Innlogging med API-nøkkel (`request_credential` for `api.openai.com` og en dummynøkkel i
  Codex), som ville fungert uten innlogging for hånd.
- Om en `.codex/`-mappe i klonen kan endre sandkassen eller tillatelsene.
