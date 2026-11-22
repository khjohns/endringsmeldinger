# Vurdering: Antigravity CLI i skyøkta

22.11.2026. Kontrollert commit: `3cc8355` på `main`. Ingen kode i repoet er endret.

Antigravity CLI (`agy`) er Googles kommandolinjeverktøy for Gemini. Det erstatter Gemini CLI for
abonnenter på Google AI Pro og Ultra. Dette er en prøve av verktøyet i en skyøkt, ikke en del av
løsningen. Appen er ikke i produksjon og har ingen reelle data.

## Kjørt og observert

Alle kall brukte konstruert innhold (en liten `kalk.py` utenfor repoet), aldri repokode.

- **Installasjon.** Det offisielle skriptet ble lest før det ble kjørt. Det henter en binær fra
  Googles utgivelsestjener, sjekker SHA-512 mot en manifestfil fra samme tjener og legger
  binæren i `~/.local/bin/agy`. Versjon 1.5.14.
- **Nettverk.** Skriptet, OAuth-innloggingen og API-kall gikk gjennom nettverket i skyøkta uten
  endringer i miljøet.
- **Innlogging.** Abonnementet bruker Google OAuth. Det er ikke en API-nøkkel. `agy` skriver ut en
  lenke, brukeren åpner den på egen maskin og limer koden fra `antigravity.google/oauth-callback`
  inn i terminalen. Økta kjørte `agy` i en pseudoterminal i bakgrunnen for å ta imot koden.
  Tokenet ligger som fil under `~/.gemini/antigravity-cli/` i skyøkta og forsvinner når
  containeren resirkuleres. `/logout` sletter det.
- **Tillatelsene lenken ber om:** e-postadresse og profil, `cloud-platform` (Google Cloud),
  tre interne Antigravity-tillatelser og `openid`. Ingen Gmail-tillatelse.
- **Modellene på kontoen** (`agy models`): Gemini 4 Neon, Argon og Hydrogen, Gemini 3.8 Flash,
  to orkestratorer, Claude Opus 5.5, Claude Sonnet 5.5 og GPT-OSS 120B. Gemini 4 har nivåene low,
  medium, high og delvis xhigh.
- **Forbruk.** `--output-format json` gir `usage` per kall (inn-, ut-, tenke- og cache-tokens).
  Små oppgaver brukte 9 000 til 23 000 tokens per kall, mest systemprompt og verktøydefinisjoner.
  Det gir ikke kvoten i abonnementet.
- **Gjenopptak.** `--conversation <id>` fortsetter en samtale, og `-c` den siste. En samtale
  gjenopptatt etter ca. 8 minutter hentet 7 199 av 11 558 tokens fra cache.
- **Tilbakemelding i samme samtale.** `agy` rettet to feil i `kalk.py`. Samme samtale ble
  gjenopptatt med tilbakemelding om `ValueError` for tom liste, og den ble gjort riktig.
- **Tillatelser i print-modus.** `agy -p` redigerer filer og kjører kommandoer uten å spørre, og
  skrev en fil utenfor arbeidsmappen, både uten og med `--sandbox`. Flagget begrenser tilsynelatende
  bare terminalen.
- **Strukturert svar.** `--json-schema` ga JSON som fulgte skjemaet. `--output-format stream-json`
  gir hendelser, og `init` lister verktøyene, blant dem nettleser, subagenter og MCP-kall.
- **Skråstrekkommandoer.** `/context` finnes, men bare i det interaktive grensesnittet.
- **Push til `main`.** Regelsettet for `main` hadde først ikke krav om PR og ikke blokkering av
  force push, bare krav om sjekker og forbud mot sletting. Bypass-listen var tom, og regelsettet
  gjelder bare `main`. Eieren slo på begge reglene. En tom testcommit pushet fra skyøkta til
  `main` ble deretter avvist med «Changes must be made through a pull request» og «5 of 5
  required status checks are expected».

## Hva Gemini 4-modellene er egnet for

Lest fra nettet, ikke prøvd i repoet. Det meste kommer fra tredjeparts blogger og Googles egne
utgivelsesinnlegg, og det finnes ingen uavhengig sammenligning.

| Modell | Typisk bruk | Kilde |
| --- | --- | --- |
| Hydrogen | Daglig utførelse; kan være utfører i en orkestrator | tredjepart |
| Argon | Bred frontmodell for koding, kunnskapsarbeid og cyberforsvar; lavere tokenforbruk enn Carbon | Google, tredjepart |
| Neon | Agentisk koding med vekt på sikker kode; mellom Hydrogen og Carbon | Google, tredjepart |
| Carbon | Lange og vanskelige ingeniøroppgaver; står ikke i kontoens modelliste | Google, tredjepart |
| Orchestrator | Neon som planlegger og Hydrogen som utfører i én økt | Google, tredjepart |

Nivåene (low til xhigh) styrer hvor mye modellen resonnerer. Prisene i kildene er datert og
ikke kontrollert mot en offisiell side.

Cachen hos Gemini: implisitt cache er på som standard for Gemini 2.5 og nyere, uten garantert
levetid. Eksplisitt cache har en standard levetid på 1 time. Om `agy` bruker eksplisitt cache, er
ikke undersøkt.

## Forsiktighet

- `agy` sender det den får, til Google. Saksdata, kontraktsinnhold, personnavn, nøkler og
  tilgangsopplysninger skal ikke sendes (`CLAUDE.md`, «Hvor hva står»).
- Innloggingsguiden har en forhåndsvalgt avkrysning om at Google kan samle og bruke
  interaksjonsdata. Valget ble ikke tatt bevisst, og det er uavklart om det ble akseptert.
- [Catenda-brokeren](../verktoy/catenda-broker/README.md) holder bare Catenda-hemmeligheter og
  kan ikke bære Google-innlogging.
- Verktøyet er ikke bestilt til noe i løsningen. Brukes det til repoarbeid, gjelder samme regler
  for review og leveranse som ellers.

## Forslag: sperre mot merge og push

`agy` kjører i samme container som økta og har de samme git-rettighetene. Økta er derfor ikke en
sikker avgrensning. `agy` har ingen MCP-servere, så den kan ikke merge via GitHub-verktøyene til
Claude. Forslaget, i prioritert rekkefølge:

1. **Beskytt `main` på GitHub** med et regelsett som krever PR og blokkerer direkte push og force
   push. Det er den eneste sperren som holder uansett hva som kjører. Gjort 22.11.2026 og prøvd
   med et push fra skyøkta (se «Kjørt og observert»). Antallet godkjenninger er satt slik at
   eieren kan merge sin egen PR.
2. **Gi `agy` en egen klon uten push-adresse** (`git remote set-url --push origin no_push`).
   Den kan commite lokalt, men ikke pushe. Claude henter og leser diffen og pusher selv til
   utviklingsgrenen. En `git worktree` er ikke nok, siden den deler konfigurasjonen med repoet.
3. **Skriv i prompten at `agy` aldri skal pushe eller merge.** Dette er en påminnelse, ikke en
   sperre.

En lokal sperre i hookoppsettet er ikke foreslått. Vakten for hookoppsettet krever godkjenning fra
oppdragsgiver.

## Verifikasjon og grenser

- **Kjørt og observert:** alt under «Kjørt og observert».
- **Lest fra nettet:** egnetheten per modell, utfasingen av Gemini CLI, cachelevetiden og prisene.
- **Ikke testet:**
  - cachens faktiske levetid over tid (1, 5, 15 og 60 minutter);
  - kvalitet, hastighet og kostnad på modellene mot oppgaver i repoet;
  - review av en kjent diff med en bevisst feil;
  - forbruket mot kvoten i abonnementet, og `/context` og andre skråstrekkommandoer;
  - om `agy` bruker eksplisitt cache, og minimumsgrensen for Gemini 4;
  - om `gh` i containeren har et token `agy` kan bruke;
  - push til `main` fra en annen konto med bypass (listen er tom);
  - at klonen uten push-adresse stopper et push;
  - at force push til `main` avvises (regelen er slått på, men ikke prøvd);
  - hva selvoppdateringen i skriptet gjør over tid.
- **Ikke gjort:** klonen uten push-adresse (punkt 2) og instruksen i prompten (punkt 3) er ikke
  satt opp.
