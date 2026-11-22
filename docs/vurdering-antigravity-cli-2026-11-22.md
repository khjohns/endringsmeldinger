# Vurdering: Antigravity CLI i skyøkta

22.11.2026. Kontrollert commit: `3cc8355` på `main`. Ingen kode i repoet er endret.

Antigravity CLI (`agy`) er Googles kommandolinjeverktøy for Gemini. Det erstatter Gemini CLI for
abonnenter på Google AI Pro og Ultra. Dette er en prøve av verktøyet i en skyøkt, ikke en del av
løsningen. Appen er ikke i produksjon og har ingen reelle data.

## Kjørt og observert

- **Installasjon.** Det offisielle skriptet ble lest før det ble kjørt. Det henter en binær fra
  Googles utgivelsestjener, sjekker SHA-512 mot en manifestfil fra samme tjener og legger
  binæren i `~/.local/bin/agy`. Versjon 1.5.14.
- **Nettverk.** Skriptet, OAuth-innloggingen og et API-kall gikk gjennom nettverket i skyøkta uten
  endringer i miljøet.
- **Innlogging.** Abonnementet bruker Google OAuth. Det er ikke en API-nøkkel. `agy` skriver ut en
  lenke, brukeren åpner den på egen maskin og limer koden fra `antigravity.google/oauth-callback`
  inn i terminalen. Økta kjørte `agy` i en pseudoterminal i bakgrunnen for å ta imot koden.
  Tokenet ligger i skyøkta og forsvinner når containeren resirkuleres. `/logout` sletter det.
- **Bruk uten grensesnitt.** `agy -p "<prompt>"` kjører én prompt. `agy models` lister modellene.
- **Tillatelsene lenken ber om:** e-postadresse og profil, `cloud-platform` (Google Cloud),
  tre interne Antigravity-tillatelser og `openid`. Ingen Gmail-tillatelse.
- **Modellene på kontoen** (`agy models`): Gemini 4 Neon, Argon og Hydrogen, Gemini 3.8 Flash,
  to orkestratorer, Claude Opus 5.5, Claude Sonnet 5.5 og GPT-OSS 120B. Gemini 4 har nivåene low,
  medium, high og delvis xhigh.

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

## Forsiktighet

- `agy` sender det den får, til Google. Saksdata, kontraktsinnhold, personnavn, nøkler og
  tilgangsopplysninger skal ikke sendes (`CLAUDE.md`, «Hvor hva står»).
- [Catenda-brokeren](../verktoy/catenda-broker/README.md) holder bare Catenda-hemmeligheter og
  kan ikke bære Google-innlogging.
- Verktøyet er ikke bestilt til noe i løsningen. Brukes det til repoarbeid, gjelder samme regler
  for review og leveranse som ellers.

## Verifikasjon og grenser

- **Kjørt og observert:** installasjonen, innloggingen, listen fra `agy models` og én prompt med
  svaret «hei».
- **Lest fra nettet:** egnetheten per modell, utfasingen av Gemini CLI og prisene.
- **Ikke kontrollert:** kvalitet, hastighet og kostnad på modellene mot oppgaver i repoet,
  kvotene i abonnementet, og hva skriptets selvoppdatering gjør over tid.
