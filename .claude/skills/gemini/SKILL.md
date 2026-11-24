---
name: gemini
description: Gemini gjennom Antigravity CLI (`agy`) i en skyøkt i endringsmeldinger. Når verktøyet passer og ikke, oppsettet (vertene, installasjonen, innloggingen og datainnsamlingen), arbeidsformen med egen klon, egen git-identitet og et miljø uten hemmeligheter, bestillingen, og hvordan Claude kontrollerer resultatet. Brukes når et issue, en kartlegging av åpne issues, et review eller sparring i et viktig spørsmål, som en arkitekturvurdering, skal gjøres av Gemini, og bare i en økt der oppdragsgiver er til stede og kan logge inn.
---

# Gemini i skyøkta

Prøvene og målingene står i PR-en som innførte skillen, og erfaringene per runde i #2256. Her står hvordan verktøyet brukes.
`agy` er ikke en del av løsningen. Det Gemini lager, er ikke levert før
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
  hver container, og tokenet kan ikke lagres i miljøet. En orkestrert byggeøkt bruker Gemini
  gjennom [reviewøkta](../reviewokt/SKILL.md).

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
5. **Arbeidsmappa.** Godkjenn en egen, tom mappe i scratchpad, og avslutt med Escape. Legg
   klonene utenfor den. I prøven lå klonene under den godkjente mappa, og `agy` skrev og
   committet uten å spørre, selv om «Tool Permission» sto på `request-review`. Godkjenningen
   gjelder trolig alt under mappa. Klonene utenfor mappa er ikke prøvd.

Innstillingene til `agy` har samme filnavn som hookoppsettet. Brokervakten stopper derfor
skallkommandoer som nevner det filnavnet. Les fila med Read (#1764).

## Arbeidsformen

Tillatelsene i `agy` er ingen sperre. Den har skrevet utenfor arbeidsmappa, også med
`--sandbox`, og i en godkjent mappe kjører den kommandoer og committer uten å spørre.
`--mode auto` er ikke tilgjengelig for kontoen. Ligger klonen utenfor den godkjente mappa, skriver
den med `--mode accept-edits`, og skallkommandoene må tillates i en liste (se «Tillatelsene»
under). Sperrene ligger derfor utenfor `agy`:

- **Egen klon per oppgave**, fra `main`, i scratchpad, med `git clone --no-hardlinks` og
  `git remote set-url --push origin no_push`. Et push ved en feil stoppes. Klonen er likevel
  ingen sperre, for `agy` kan sette adressen tilbake. Sperren er regelsettet for `main` på GitHub
  (PR kreves, force push blokkert) og at Claude pusher. `agy` har ingen GitHub-verktøy og kan
  ikke merge.
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
  ~/.local/bin/agy -p "$(cat "$BESTILLING")" --mode accept-edits --settings "$TILLATELSER" \
  --json-schema "$SKJEMA" --model gemini-4-neon-high --output-format json \
  --print-timeout 30m > svar.json
```

**Tillatelsene.** Uten skjerm kan `agy` ikke spørre. En kommando som ikke er tillatt, avvises,
og kjøringen stopper med tomt svar, selv om `status` er `SUCCESS`. Se etter `denied_actions` i
svaret og `jetski: no output produced` i stderr. Tillat kommandoene i en JSON-fil til
`--settings`: `{"permissions":{"allow":["command(git)","command(npx)", …]}}`. Gi fila et annet
navn enn hookoppsettet (#1764). Regelen er et prefiks og avviser likevel kjedede kommandoer
(`;`, `&&`) og `python - <<EOF`, også når hvert ledd er tillatt. Be derfor i bestillingen om én
kommando per kall og om skript i en fil. Lesing gjennom symlenken til `node_modules` krever
`read_file(<sti til hovedkopiens node_modules>)`. Hva som ble avvist, står i
`~/.gemini/antigravity-cli/brain/<conversation_id>/.system_generated/logs/transcript_full.jsonl`.
Fortsett samtalen med `--conversation <id>` og en utvidet liste, så går ikke arbeidet tapt.
`--dangerously-skip-permissions` stoppes av auto-modus i Claude Code.

Svaret kan ha tekst foran JSON-en. Les fra første `{"` etter teksten.

Uavhengige oppgaver startes samtidig, hver i sin klon, med `run_in_background`. Svaret har
`usage` med tokenene. `--print-timeout` stopper en kjøring som henger.
`--disable-slash-commands` hindrer at tekst i bestillingen leses som en kommando i `agy`, men
slår av `--mode`. Bruk det bare når bestillingen begynner med `/`. En
bestilling over om lag 64 kB sendes på stdin uten `-p`, fordi argumentet blir for langt. Disse
tre er hentet fra pluginen
[antigravity-for-claude-code](https://github.com/yuting0624/antigravity-for-claude-code) og er
ikke prøvd her.

**Kartlegging og review uten skriving:** `--mode plan` avviser alle skallkommandoer, også
`git show` og `grep`, og en kartlegging får da tomt svar. Kartlegg med en liste over
lesekommandoer i stedet, i en klon, og kontroller `git status` etterpå. For review: legg
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
- Be den lese filene oppgaven trenger, ved sti, så de har ett hjem og ikke gjengis i
  bestillingen. Det gjelder alltid `CLAUDE.md`, [leveranseskillen](../leveranse/SKILL.md) og
  [miljø-skillen](../miljo/SKILL.md) for testkommandoene, og i tillegg reglene i
  `.claude/rules/` for treet den endrer. Den skal også lese
  `.claude/rules/tester.md` når den skriver tester, og språkfila når den endrer synlig tekst.
  Når et spørsmål til oppdragsgiver kan oppstå, skal den lese [vedtaksskillen](../vedtak/SKILL.md).
  Skriv hvilke avsnitt som gjelder, for eksempel «Review og funn».
- Ikke [arbeidsøkt-skillen](../arbeidsokt/SKILL.md). Den styrer Claude-økta: hurtigbufferen,
  push, PR-en, CI og orkestratoren. Reglene der strider mot reglene for Gemini.
- Reglene: arbeid bare i mappa, ikke push, ikke endre remote eller git config, og commit med
  en melding etter `CLAUDE.md`.
- Sluttrapporten: hva som er endret, sjekkene med resultat, hva den søkte etter, og det den
  ikke gjorde eller er usikker på.

## Kontrollen

- Hent commitene med `git fetch "$KLON" <gren>`, og se forfatteren og `--stat`.
- **Testene i klonen og i hovedkopien** er den raske kjøringen i
  [miljø-skillen, «Rask kjøring under arbeidet»](../miljo/SKILL.md#rask-kjøring-under-arbeidet),
  med prosjektene for mappene som er endret. I tillegg kommer typesjekken for de mappene og
  `--ankre` når kjernen eller serveren er endret ([«Sjekker»](../miljo/SKILL.md#sjekker)). Hele
  samlingen og feilinnføringene kjører ikke Gemini. `env -i` fjerner
  `KOE_SQLSERVER_TILKOBLING`, så testene mot SQL Server hoppes over i klonen.
- **Claude kjører testene selv i hovedkopien.** At Gemini sier en sjekk er grønn, er en
  påstand. Er `server/` eller lagringen endret, kjører Claude også testene mot SQL Server for de
  berørte filene, i bakgrunnen. Feilinnføringene følger leveranseskillen, «Før en PR meldes
  klar». For kjernen er beviset CI-kjøringen med etiketten `feilinnfoering`, satt ved første
  push. For serveren er beviset en målrettet kjøring i bakgrunnen.
- **Eksisterende tester:** `git diff --diff-filter=MD --stat main...HEAD -- '*.test.*' '**/tester/**'`
  viser testfilene som er endret eller slettet. Claude leser de linjene og ser at bestillingen ba om endringen. Nye
  tester er forventet.
- Kjør `/code-review` etter leveranseskillen, som for annen kode. Les ikke hele diffen i
  tillegg. Det overlapper reviewet og koster kontekst.
- Svarer Gemini at ingenting trenger endring, kontrollerer Claude det avgjørende leddet, som
  kallet eller søket, og kommentaren eller PR-en sier hva som er kontrollert.
- Kontroller helst i en ny, liten økt. Hvert kall leser hele konteksten, og oppsettet av
  `agy` fyller den.
- PR-en sier at endringen er skrevet av Gemini og kontrollert av Claude, og viser sjekkene.

## Funn fra `/code-review`

Gemini vurderer funnene etter stoppregelen og retter dem som skal rettes i PR-en. Claude
kontrollerer vurderingen og gjør det som skjer på GitHub. Stoppregelen og utfallene står i
[leveranseskillen, «Review og funn»](../leveranse/SKILL.md#review-og-funn), og bare der.

1. **Bestillingen** har funnene ordrett fra `/code-review`, og diffen PR-en gjelder
   (`git diff main...HEAD`). Den har også de åpne `review-oppfølging`-issuene med sjekklistene,
   hentet med `gh api`, siden Gemini ikke kan søke selv. Gemini leser «Review og funn» i
   leveranseskillen og [vedtaksskillen](../vedtak/SKILL.md). Har Gemini skrevet koden, fortsetter
   samtalen med `--conversation <id>`. Da har den konteksten, slik leveranseskillen forutsetter
   for byggeøkta. Bestillingen sier hva issuet skal oppnå, og ber Gemini holde hver retting mot
   det. Foreslår et funn flere løsninger, er den første ikke nødvendigvis riktig. I runde 1 i
   #2256 ble tre av fire rettinger tilbakeført, fordi de fulgte forslaget mot målet i issuet.
2. **Gemini svarer etter et skjema med én rad per funn**: prioriteten P0–P3, utfallet
   (rettet, avvist, krav i issue, spørsmål eller oppfølgingsissue), begrunnelsen etter stoppregelen og commiten for et
   rettet funn. For de andre utfallene har raden teksten som skal stå i PR-en eller issuet. Hvert
   rettet funn får sin egen commit.
3. **Gemini svarer ikke selv på et spørsmål som krever en avgjørelse fra oppdragsgiver.** Et
   funn som krever et vedtak, et designvalg eller en tolkning, får utfallet «spørsmål». Det
   rettes ikke, og en bestemmelse eller et vedtak ikke sier, blir ikke tolket.
4. **Claude kontrollerer vurderingen**: hver rad mot stoppregelen, særlig «avvist» og
   «spørsmål». Et avvist funn som er P0 eller P1, rettes eller føres videre, og P0–P2
   prøves med `funnprove` før de rettes. Claude ser også
   at ingen test er svekket eller hoppet over for å bli grønn (`--stat`, og diffen i testfilene).
5. **Claude gjør det som skjer på GitHub**: tabellen «Funn og utfall», kommentarene i issuene,
   oppfølgingsissuet og spørsmålene, etter leveranseskillen og
   [GitHub-skillen](../github/SKILL.md). Et domenespørsmål stilles etter vedtaksskillen.
6. **Kontrollen av rettingene** kjøres én gang, som `/code-review` på rettingsdiffen, på
   nivået leveranseskillen sier. Funnene fra kontrollen følger leveranseskillen. Ingen ny runde
   med vurdering hos Gemini.
