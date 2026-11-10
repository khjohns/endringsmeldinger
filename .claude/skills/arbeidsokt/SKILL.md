---
name: arbeidsokt
description: Reglene for en skyøkt som bygger, reviewer eller retter en PR i endringsmeldinger. Hurtigbufferen og kontekstgrensene, tilstanden i PR-en, når reviewet går i en ny økt, og de faste reglene for en orkestrert arbeidsøkt (spørsmål til orkestratoren, utkast, venting på CI og meldingen når PR-en er klar). Brukes av alle skyøkter når arbeidet starter, også en direkte økt som ikke er orkestrert.
---

# Arbeidsøkta

Reglene gjelder hver skyøkt som bygger, reviewer eller retter, også en direkte økt
(`AGENTS.md`, «Arbeidsform»). Det orkestratoren gjør, står i
[orkestreringsskillen](../orkestrering/SKILL.md). Episodene bak grensene står i
[episodefila](../orkestrering/episoder.md).

## Hvorfor grensene finnes

Hele konteksten sendes på nytt ved hvert kall til modellen, i økta og i hver
subagent. Et kall er én forespørsel til modellen: en melding til økta, et svar fra
GitHub, en ferdig bakgrunnskommando, en påminnelse og hvert verktøyresultat. Hurtigbufferen
gjør kallet billig når det kommer under en time etter forrige kall i økta, uansett hvor
lenge økta har pågått. Kommer det senere, skrives hele konteksten til bufferen på nytt,
for Opus 5.5 om lag 40 ganger prisen for å lese den. Subagentene har en buffer på fem minutter.
Kostnaden vokser derfor med antall kall ganger kontekststørrelsen, og et stort
verktøysvar tidlig i økta leses på nytt i hvert kall etter det
([hurtigbufferen i Claude Code](https://code.claude.com/docs/en/prompt-caching#cache-lifetime)).

## Tid og kontekst

- **Hold hurtigbufferen varm.** Det som teller, er tiden mellom to kall, ikke hvor lenge
  økta har pågått. Venter økta på CI eller feilinnføringene og regner med å fortsette
  innen en time, venter den med en bakgrunnskommando som vekker den. Venter den på noe
  som kan ta over en time, for eksempel et svar fra oppdragsgiver, og har den passert om
  lag 150 000 tokens, skriver den tilstanden i PR-en og stopper. Den vekkes ikke igjen:
  en ny, liten økt tar over fra PR-en, vedtakene og issuet. Still derfor spørsmålene
  tidlig, og send svarene samlet så snart de foreligger, helst innen en time.
- **Mens et spørsmål venter.** Økta kartlegger og spør først, og tar så det som ikke
  avhenger av svaret. Det som avhenger av svaret, bygges ikke på øktas egen anbefaling.
  Er resten gjort, følger økta «Hold hurtigbufferen varm». I en orkestrert runde avgjør
  orkestratoren om annet arbeid skal settes i gang mens økta venter, eller spør
  oppdragsgiver.
- **Melder fra om egen størrelse.** Etter hvert hovedsteg (kartlegging, bygging,
  review, rettinger) skriver økta tilstanden i PR-en, eller i issuet før PR-en
  finnes. Brukt kontekst måler økta med transkriptet, ikke med `get_session`:
  `jq -s '[.[]|select(.type=="assistant" and (.isSidechain|not) and .message.usage)]|last|.message.usage|.input_tokens+.cache_read_input_tokens+.cache_creation_input_tokens+.output_tokens' ~/.claude/projects/*/"$CLAUDE_CODE_SESSION_ID".jsonl`
  gir konteksten etter siste API-kall, og tallet skrives i PR-en (#731). Finnes
  ikke transkriptet, anslår økta brukt kontekst ut fra det den har lest og
  kjørt, og skriver anslaget i PR-en. Et oppdrag avgrenses slik at økta kan gjøre det
  ferdig under om lag 400 000 tokens. Ved om lag 400 000 tokens begynner økta å
  forberede overleveringen, og ved om lag 500 000 stopper den: pusher, skriver
  tilstanden i PR-en og melder fra. Den tar ikke nye oppgaver etter 400 000, uten å
  vente på orkestratorens sjekk. Tilstanden skal gjøre det mulig å lese seg inn på
  nytt: vedtakene, arbeidsvalgene i issuet, kravene i PR-beskrivelsen og hva som
  gjenstår (#484).
- **Vekket etter over en time.** En økt som vekkes etter over en time uten
  kall, kan være komprimert av Claude Code (`idleCompaction`, standardverdien
  beholdes), og behandles da som komprimert: den leser vedtakene, issuet og
  PR-beskrivelsen på nytt før den fortsetter (#779).
- **Endringer i `AGENTS.md` virker ikke i økta som gjør dem.** Fila lastes når økta
  starter, og igjen først etter en komprimering. En økt som retter `AGENTS.md`,
  arbeider videre etter den gamle teksten.
- **Subagenter har egne grenser**, i kall og tokens: se
  skillen [`subagenter`](../subagenter/SKILL.md).
- **Små verktøysvar.** Les smalt og tell før du leser: se «Utdata» i
  [miljø-skillen](../miljo/SKILL.md#utdata).
- **Review i ny økt.** Byggeøkta pusher, skriver tilstanden i PR-en og stopper,
  uten å kjøre `/code-review`, og lar PR-en stå som utkast. Unntaket er en liten
  diff, om lag 300 endrede linjer utenom tester og `docs/`: er byggeøkta under om
  lag 400 000 tokens, kjører den `/code-review` og rettingene
  selv, og en ny reviewøkt trengs ikke. Den samme økta kan ikke kjøre
  `/design-review` eller reviewet av samspillet mellom reglene, som krever ny
  kontekst. En ny, liten økt tar
  reviewet og rettingene fra PR-en etter leveranseskillen, «Review og funn», og markerer PR-en klar når
  reviewet er gjort og de lokale sjekkene er grønne. Den får en avgrenset
  bestilling: PR-nummeret, reviewbestillingen og tilstanden i PR-en, ikke hele
  historikken. Den fortsetter samme PR, så den teller ikke i grensen på tre PR-er
  per runde. For økter som ikke er orkestrert, gjelder dette bare når diffen
  rører `kjerne/` eller er over om lag 800 endrede linjer utenom `docs/` (#484, #490, #491).

## I en orkestrert økt

Oppdraget sier hva som skal gjøres, og hva som er fasit. Dette gjelder i tillegg,
uten at oppdraget gjentar det:

- **Les først** issuene, `AGENTS.md` og denne skillen.
- **Spørsmål.** Spørsmål bare oppdragsgiver kan avgjøre (NS 8407, tiltenkt atferd),
  sendes samlet til `@parent` etter kartleggingen og før implementeringen, med
  alternativer, belegg og en anbefaling. Mens den venter, følger økta
  «Mens et spørsmål venter». Den velger ikke et domenevalg i stillhet. Tekniske valg innenfor oppgaven tar den selv
  og fører i PR-en. Sier oppdraget at ingen følger øktene, velger økta det
  konservative alternativet og fører valget under «Åpne spørsmål», unntatt et
  valg som blir en kontrakt: en regel i domenekjernen eller et lagret navn.
  Det venter. For kjerne-oppgaver er spørsmålene samlet i kartleggingen, og
  svarene står i oppdraget. Dekker ikke svarene det byggeøkta møter, stanser
  den og spør på samme måte.
- **Hovedplanen.** Økta skriver ikke i hovedplanen, unntatt når oppdraget sier at
  den er den eneste PR-en i runden som rører planen. Da kan den føre et vedtak
  den trenger, slik [vedtaksskillen](../vedtak/SKILL.md) sier.
- **Feil utenfor oppdraget**, som ikke er reviewfunn, blir egne issues (regelen i
  `AGENTS.md`). Økta løser en slik feil i samme PR med `Closes #n` bare når
  rettingen er noen få linjer i en fil den allerede endrer. Alt annet venter til neste
  runde, også funn i andre øktes filer og funn som krever en avgjørelse.
- **Store lesinger**, som kartlegging over mange filer og CI-logger, gjøres av
  subagenter, så øktas egen kontekst holder seg liten (#425).
  Små oppslag gjør økta selv (`AGENTS.md`, «Arbeidsform»), og subagentene følger
  skillen [`subagenter`](../subagenter/SKILL.md).
- **Review.** Byggeøkta kjører ikke `/code-review`. Reviewet og rettingene gjøres i
  en ny økt, unntatt for en liten diff etter «Review i ny økt». Reviewet følger
  [leveranseskillen, «Review og funn»](../leveranse/SKILL.md#review-og-funn).
- **PR-beskrivelsen er rapporten til orkestratoren:** hva som er endret,
  sjekkene som er kjørt med resultat, funn utenfor oppdraget med issuenummer,
  samleissuet med nummer når det finnes, og «Åpne spørsmål». Reviewøkta legger til
  utfallet av `/code-review`.
- **PR mot `main`** med `Closes #n`, eller «Del av #n» når bare en del leveres.
  Økta merger ikke.
- **Utkast.** Byggeøkta åpner PR-en som utkast og lar den stå. Reviewøkta markerer den
  klar (`ready_for_review`) når reviewet er gjort og de lokale sjekkene er
  grønne. CI og regelversjonsvakten kjører ikke på utkast og ikke ved push til
  `main` (#390), så hver push til et utkast er gratis, og hver
  push til en klar PR koster en full kjøring. Feilinnføringene kjører også på et
  utkast når etiketten `feilinnfoering` er satt. Etiketten settes derfor først
  når PR-en meldes klar, så hele settet (om lag 26 minutter i CI) kjører én
  gang per PR og ikke ved hver push. Hva økta kjører lokalt av feilinnføringene,
  står i [miljø-skillen](../miljo/SKILL.md#feilinnføringer).
- **Ikke abonner på PR-en** (`subscribe_pr_activity`). Hver hendelse
  vekker økta og leser hele konteksten på nytt, også en grønn kjøring, egne
  pusher og mergen. Etter hver push venter økta på CI med én bakgrunnskommando
  som poller sjekkene på committen. Den retter det som er rødt, og melder fra
  når alt er grønt. Review og rød CI etter en oppdatering mot `main` sier
  orkestratoren fra om, fordi det er orkestratoren som oppdaterer.
- **Meld fra** med `send_message` til `@parent` når PR-en er grønn og
  klar for gjennomgang. Økta pusher ikke etter det uten at orkestratoren
  ber om det. En push etter meldingen kan komme etter mergen og bli stående
  utenfor `main`.
