---
name: gemini
description: Gemini gjennom Antigravity CLI (`agy`) i en skyøkt i endringsmeldinger. Når verktøyet passer og ikke, oppsettet (vertene, installasjonen, innloggingen og datainnsamlingen), arbeidsformen med egen klon, egen git-identitet og et miljø uten hemmeligheter, bestillingen, og hvordan Claude kontrollerer resultatet. Brukes når et issue, en kartlegging av åpne issues, et review eller sparring i et viktig spørsmål, som en arkitekturvurdering, skal gjøres av Gemini, og bare i en økt der oppdragsgiver er til stede og kan logge inn.
---

# Gemini i skyøkta

Prøvene, målingene og det som ikke er prøvd, står i
[vurderingen](../../../docs/vurdering-antigravity-cli-2026-11-22.md). Her står hvordan
verktøyet brukes. `agy` er ikke en del av løsningen. Det Gemini lager, er ikke levert før
Claude har kontrollert det etter [leveranseskillen](../leveranse/SKILL.md).

## Når

Passer:

- **Kartlegging av åpne issues mot koden:** er issuet løst, og hva står igjen. To av tre
  issues i prøven var allerede løst.
- **Små issues med prøvbare forventninger utenfor kjernen:** tekst, dokumentasjon, verktøy
  og avhengigheter.
- **Review med en annen modellfamilie,** i tillegg til `/code-review` og ikke i stedet.
- **Sparring i viktige spørsmål**, som arkitekturvurderinger, før Claude legger fram en
  anbefaling. Se «Sparring» under. Om sparringen er god, vurderes underveis.
- **Bygging i kjernen etter et vedtak**, med de samme kontrollene som ellers: feilinnføringene,
  regelversjonsvakten og arkitekturtesten.

Passer ikke:

- Å avgjøre tolkningen av NS 8407 eller det et vedtak ikke sier. Det avgjør oppdragsgiver,
  uansett modell (`CLAUDE.md`, «Domenekjernen»). Gemini kan gi innspill, ikke avgjøre.
- Spørsmål til oppdragsgiver, vedtak, push og merge. Vedtak krever dialogen med oppdragsgiver,
  og `agy` ser ikke samtalen. Push og merge er sperrene.
- Saksdata, nøkler og tilgangsopplysninger. `agy` sender det den får, til Google.
- Økter uten oppdragsgiver, som orkestrerte økter og rutiner. Innloggingen gjøres for hånd i
  hver container, og tokenet kan ikke lagres i miljøet.

## Oppsett, én gang per container

1. **Nettverket.** Miljøet må tillate `antigravity.google` og oppdateringsverten
   `antigravity-cli-auto-updater-974169037036.us-central1.run.app`. Binæren lastes fra
   `storage.googleapis.com`. Mangler en vert, foreslås den med miljøverktøyene.
2. **Installasjonen.** Last ned `https://antigravity.google/cli/install.sh` til en egen mappe
   i scratchpad, les skriptet og kjør det. Det sjekker SHA-512 og legger `agy` i
   `~/.local/bin`.
3. **Innloggingen.** Start `agy` i `tmux` og velg Google OAuth. Gi oppdragsgiver lenken, og
   lim koden inn med `tmux send-keys -l`. Koden skrives ikke noe annet sted.
4. **Datainnsamlingen.** Haken på siden «Terms of Service & Data Use» er satt på forhånd.
   Fjern den, og kontroller i `/settings` at «Enable Telemetry» er `off`.
5. **Arbeidsmappa.** Godkjenn en tom mappe i scratchpad, og avslutt med Escape.

Innstillingene til `agy` har samme filnavn som hookoppsettet. Brokervakten stopper derfor
skallkommandoer som nevner det filnavnet. Les fila med Read (#1764).

## Arbeidsformen

`agy -p` håndhever ikke tillatelsene. Den kjører kommandoer og committer uten å spørre, og
den har skrevet utenfor arbeidsmappa, også med `--sandbox`. `--mode auto` er ikke tilgjengelig
for kontoen. Sperrene ligger derfor utenfor `agy`:

- **Egen klon per oppgave**, fra `main`, i scratchpad, med `git clone --no-hardlinks` og
  `git remote set-url --push origin no_push`. Et push ved en feil stoppes. Klonen er likevel
  ingen sperre, for `agy` kan sette adressen tilbake. Sperren er regelsettet for `main` og at
  Claude pusher.
- **Egen git-identitet:** `git config user.name "Gemini (agy)"` og
  `git config user.email agy@invalid` i klonen. Uten den står commiten med identiteten i
  containeren, som er Claudes.
- **Ingen hemmeligheter i miljøet.** Start `agy` med `env -i` og bare `HOME`, `PATH`, `TERM`,
  proxyen og sertifikatene. Da ser den ikke `CATENDA_*` og de andre variablene i miljøet.
- **`node_modules`:** lenk til hovedkopiens med `ln -s` når oppgaven kjører testene. Lenk ikke
  når oppgaven endrer avhengighetene.
- **Hovedkopien:** ta `git status --porcelain` før og etter. Det skal være likt.

```bash
cd "$KLON" && env -i HOME="$HOME" PATH="$PATH" TERM=xterm \
  HTTPS_PROXY="$HTTPS_PROXY" https_proxy="$https_proxy" NO_PROXY="$NO_PROXY" no_proxy="$no_proxy" \
  SSL_CERT_FILE="$SSL_CERT_FILE" GIT_SSL_CAINFO="$GIT_SSL_CAINFO" NODE_EXTRA_CA_CERTS="$NODE_EXTRA_CA_CERTS" \
  ~/.local/bin/agy -p "$(cat "$BESTILLING")" --model gemini-4-neon-high --output-format json > svar.json
```

Uavhengige oppgaver startes samtidig, hver i sin klon, med `run_in_background`. Svaret har
`usage` med tokenene.

**Review uten skriving:** `--mode plan` avviser alle skallkommandoer, også `git show`. Legg
diffen i bestillingen, og be om funnene etter et skjema med `--json-schema`. Funnene
kontrolleres etter stoppregelen i leveranseskillen.

## Sparring

En subagent fra Claude deler Claudes antakelser, og en fork arver i tillegg det økta tror.
Gemini 4 Argon er en annen modellfamilie og har andre blindsoner.

1. **Argon svarer før den ser Claudes konklusjon.** Bestillingen har spørsmålet, alternativene,
   de relevante filene og vedtakene som binder. Den har ikke Claudes anbefaling, så svaret ikke
   forankres i den. Kjør med `--mode plan` og `--json-schema`: anbefaling, antakelser, risiko
   og hva som må undersøkes.
2. **Deretter kan Argon kritisere Claudes vurdering**, i samme samtale med `--conversation`.
3. **Claude kontrollerer det de er uenige om**, mot koden og katalogen etter
   resonneringsreglene i `CLAUDE.md`. Det som står igjen, legges fram for oppdragsgiver som
   alternativer, med hvem som mente hva.

Argon avgjør ingenting. Juridiske spørsmål kan få samme sparring før de legges fram, men
legges fram slik [vedtaksskillen](../vedtak/SKILL.md) sier.

## Bestillingen

- Issueteksten med kommentarene, hentet med `gh api`. `agy` har ikke tilgang til GitHub.
- Be den lese `CLAUDE.md`, reglene i `.claude/rules/` for treet den endrer, og språkfila når
  den endrer synlig tekst.
- Reglene: arbeid bare i mappa, ikke push, ikke endre remote eller git config, og commit med
  en melding etter `CLAUDE.md`.
- Sluttrapporten: hva som er endret, sjekkene med resultat, hva den søkte etter, og det den
  ikke gjorde eller er usikker på.

## Kontrollen

- Hent commitene med `git fetch "$KLON" <gren>`, og se forfatteren og `--stat`.
- Kjør sjekkene selv i hovedkopien. At Gemini sier en sjekk er grønn, er en påstand.
- Kjør `/code-review` etter leveranseskillen, som for annen kode. Les ikke hele diffen i
  tillegg. Det overlapper reviewet og koster kontekst.
- Svarer Gemini at ingenting trenger endring, kontrollerer Claude det avgjørende leddet, som
  kallet eller søket, og kommentaren eller PR-en sier hva som er kontrollert.
- Kontroller helst i en ny, liten økt. Hvert kall leser hele konteksten, og oppsettet av
  `agy` fyller den.
- PR-en sier at endringen er skrevet av Gemini og kontrollert av Claude, og viser sjekkene.
