---
name: codex
description: Codex (OpenAI) gjennom `codex exec` i en skyøkt i endringsmeldinger, for review og sparring med en annen modellfamilie. Oppsettet (installasjon, innlogging), kommandoen med skrivebeskyttet sandkasse og skjema, hva som er prøvd og ikke, og forskjellene fra gemini-skillen. Brukes når en orkestrator eller en direkte økt vil ha et ekstra review eller sparring av Codex, uten at byggeøkta installerer noe, og bare i en økt der oppdragsgiver er til stede og kan logge inn.
---

# Codex i skyøkta

Arbeidsformen, kontrollen og håndteringen av funn er de samme som for Gemini. De står i
[gemini-skillen](../gemini/SKILL.md) («Arbeidsformen», «Bestillingen», «Kontrollen» og
«Funn fra `/code-review`») og bare der. Her står det som er annerledes for Codex.
Codex er ikke en del av løsningen. Det Codex sier, er en påstand til Claude har
kontrollert det etter [leveranseskillen](../leveranse/SKILL.md).

## Når

- **Ekstra review** av en PR, i tillegg til `/code-review` og ikke i stedet. Orkestratoren
  kjører det mot grenen til byggeøkta. Byggeøkta installerer ingenting.
- **Sparring** i et viktig spørsmål, med reglene i gemini-skillen, «Sparring».

Passer ikke: det samme som for Gemini (tolkning av NS 8407, vedtak, saksdata, nøkler, push og
merge). Codex har heller ikke GitHub-tilgang og kan ikke skrive kommentarer i en PR. Claude
poster funnene etter at de er kontrollert.

Bare i en økt der oppdragsgiver er til stede. Innloggingen gjøres for hånd i hver container.
Orkestratoren er en slik økt. De orkestrerte byggeøktene og rutinene er det ikke.

## Oppsett, én gang per container

1. **Nettverket.** `auth.openai.com` og `chatgpt.com` var tilgjengelige uten endring i
   miljøet. Mangler en vert, foreslås den med miljøverktøyene.
2. **Installasjonen.** Installer i en egen mappe i scratchpad, ikke globalt:
   `npm i @openai/codex`. Binæren ligger i `node_modules/.bin/codex`. Prøvd med 0.171.0.
3. **Innloggingen.** Start `codex login --device-auth` i `tmux`, og gi oppdragsgiver
   lenken og engangskoden. Koden gjelder i 15 minutter. Er den gått ut, startes
   kommandoen på nytt, og oppdragsgiver får den nye koden. `codex login status` bekrefter
   innloggingen. Tokenet ligger i `~/.codex/auth.json`, utenfor repoet. Les ikke fila, og
   ikke legg den i en klon.
4. **Datainnsamlingen** er ikke kartlagt. Hva Codex deler med OpenAI, og om det kan slås av,
   må kontrolleres før saksdata eller annet sensitivt går gjennom den. Gi den ingenting
   `agy` heller ikke skulle få.

## Kommandoen

Samme klon, git-identitet og `env -i` som i gemini-skillen. Klonen settes på grenen med
`git fetch` fra hovedkopien, og `git diff <base>..HEAD` legges i en fil i scratchpad.

```bash
cd "$KLON" && env -i HOME="$HOME" PATH="$PATH" TERM=xterm \
  HTTPS_PROXY="$HTTPS_PROXY" https_proxy="$https_proxy" NO_PROXY="$NO_PROXY" no_proxy="$no_proxy" \
  SSL_CERT_FILE="$SSL_CERT_FILE" NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS" \
  timeout 1500 "$CODEX" exec --sandbox read-only --ephemeral \
  --output-schema "$SKJEMA" -o svar.json "$(cat "$BESTILLING")" \
  < /dev/null > codex.log 2>&1
```

- **`< /dev/null` er påkrevd.** Med `run_in_background` har kommandoen en åpen stdin-pipe, og
  Codex står og venter på den («Reading additional input from stdin...», tom logg).
- **Skjemaet** (`--output-schema`) er et strengt JSON-skjema: `additionalProperties: false`
  og alle felt i `required`. Raden per funn har fil, linje, prioritet P0–P3, sammendrag,
  scenario og kilde. Svaret har i tillegg `kontrollert` og `usikkert`. `-o` skriver svaret
  alene til en fil, uten loggen.
- **Sandkassen er en reell sperre,** i motsetning til `agy`: med `workspace-write` ble
  skriving utenfor klonen og `/tmp` avvist («Read-only file system»). Scratchpad ligger
  under `/tmp`, så den er skrivbar. Sandkassen erstatter likevel ikke de andre sperrene
  (egen klon, `no_push`, regelsettet for `main`).
- **`read-only`** passer for review og sparring. Lesekommandoene (`git diff`, `rg`) virker.
  Kommandoer som må skrive, som `--ankre` i kjernen (oppretter en midlertidig mappe), feiler.
  Kontrollene som må skrive, kjører Claude selv.
- **Følg med uten å lese loggen:** `wc -l` på loggen og
  `grep -A1 '^exec' codex.log | tail`. Et review av en diff på 22 filer tok under ti
  minutter og 144 000 tokens.
- Kontroller `git status --porcelain` i klonen og i hovedkopien etterpå. Det skal være likt.

## Bestillingen

Som i gemini-skillen, og i tillegg:

- Diffen ligger i en fil i scratchpad, og bestillingen viser til stien. Codex kan lese
  filer i klonen og scratchpad.
- Be om én kommando per kall. Codex kjører hver kommando i `bash -lc`.
- Be om at «kontrollert» sier hva den leste og søkte etter, og at «usikkert» sier hva den
  ikke fikk kjørt. En tom funnliste er et gyldig svar, men bare med den begrunnelsen.

## Kontrollen

Som i gemini-skillen. Er funnlisten tom, kontrollerer Claude det avgjørende leddet (kallet
eller søket) og kjører det Codex ikke fikk kjørt, som arkitekturtesten og `--ankre`.
Funnene fra Codex følger stoppregelen i leveranseskillen, «Review og funn».
Claude gjør alt på GitHub: tabellen «Funn og utfall», kommentarene og issuene.

## Ikke prøvd

- Bygging og commit i en klon med `workspace-write`, og testkommandoene med
  `node_modules`-lenke.
- Sparring med `--conversation`-tilsvarende (`codex exec resume`).
- Innlogging med API-nøkkel (`request_credential` for `api.openai.com` og en dummynøkkel i
  Codex), som ville fungert uten innlogging for hånd.
- Om en `.codex/`-mappe i klonen kan endre sandkassen eller tillatelsene.
