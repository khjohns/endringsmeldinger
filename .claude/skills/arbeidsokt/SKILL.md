---
name: arbeidsokt
description: Reglene for en skyøkt som bygger, reviewer eller retter en PR i endringsmeldinger. Tiden og kontekstgrensene, tilstanden i PR-en, påminnelsen, når reviewet går i en ny økt, og de faste reglene for en orkestrert arbeidsøkt (spørsmål til orkestratoren, utkast, venting på CI og meldingen når PR-en er klar). Brukes av alle skyøkter når arbeidet starter, også en direkte økt som ikke er orkestrert.
---

# Arbeidsøkta

Reglene gjelder hver skyøkt som bygger, reviewer eller retter, også en direkte økt
(`AGENTS.md`, «Arbeidsform»). Det orkestratoren gjør, står i
[orkestreringsskillen](../orkestrering/SKILL.md). Episodene bak grensene står i
[episodefila](../orkestrering/episoder.md).

## Hvorfor grensene finnes

Hele konteksten sendes på nytt ved hvert kall til modellen, i økta og i hver
subagent. Hurtigbufferen gjør det billig innenfor en time. Etter en time uten
aktivitet skrives hele konteksten på nytt ved neste vekking. Kostnaden vokser
derfor med antall kall ganger kontekststørrelsen, og et stort verktøysvar tidlig
i økta leses på nytt i hvert kall etter det. Med stor kontekst blir øktene også
dårligere: etter en komprimering arbeider økta på et sammendrag, og ordrette
vedtak og rettelser kan gå tapt.

## Tid og kontekst

- **Arbeid i timer, ikke i døgn.** Et oppdrag avgrenses slik at økta kan bli
  ferdig på om lag 45–60 minutter med aktivt arbeid. Den kan gå over for å gjøre
  seg ferdig, innen grensen i «Melder fra om egen størrelse»: pushe, skrive
  tilstanden i PR-beskrivelsen og melde fra. Venter økta på CI eller
  feilinnføringene og regner med å fortsette innen en time, venter den med en
  bakgrunnskommando som vekker den, så hurtigbufferen holder seg varm. Venter
  den lenger, for eksempel på oppdragsgiver, skriver den tilstanden i PR-en og
  stopper. Den vekkes ikke
  igjen: en ny, liten økt tar over fra PR-en, vedtakene og issuet. Still derfor
  spørsmålene tidlig, og send svarene samlet så snart de foreligger, helst innen
  en time.
- **Melder fra om egen størrelse.** Etter hvert hovedsteg (kartlegging, bygging,
  review, rettinger) skriver økta tilstanden i PR-en, eller i issuet før PR-en
  finnes. Brukt kontekst måler økta med transkriptet, ikke med `get_session`:
  `jq -s '[.[]|select(.type=="assistant" and (.isSidechain|not) and .message.usage)]|last|.message.usage|.input_tokens+.cache_read_input_tokens+.cache_creation_input_tokens+.output_tokens' ~/.claude/projects/*/"$CLAUDE_CODE_SESSION_ID".jsonl`
  gir konteksten etter siste API-kall, og tallet skrives i PR-en (#731). Finnes
  ikke transkriptet, anslår økta brukt kontekst ut fra det den har lest og
  kjørt, og skriver anslaget i PR-en. Har økta passert om lag 150 000 tokens, stopper
  den der og tar ikke nye oppgaver, uten å vente på orkestratorens sjekk. Det
  gjelder ikke når økta har pågått under en time: da fortsetter den forbi 150 000
  til oppgaven er ferdig, begynner å forberede overleveringen ved om lag 400 000
  tokens og stopper ved om lag 500 000 tokens. Grensen forutsetter at økta blir
  ferdig innen timen, mens hurtigbufferen er varm. Etter en
  time, eller etter en pause over en time, gjelder 150 000 som før. En økt som har passert 150 000 når
  timen er gått, tar ikke nye steg, men kan pushe og skrive tilstanden, slik
  «Arbeid i timer» sier. Økta setter en påminnelse med `send_later` om 45
  minutter når den starter, og skriver `trigger_id` i tilstanden i PR-en (eller i
  issuet før PR-en finnes), så den kan slettes etter en komprimering eller av en
  ny økt. Når påminnelsen kommer, vurderer økta tre utfall: kan den bli ferdig
  innen en time fra start uten å passere grensen som gjelder den, fortsetter
  den. Kan den ikke det, men et naturlig stoppunkt er nært, gjør den seg ferdig
  dit, pusher og
  skriver tilstanden i PR-en. Ellers stopper den, slik at en ny økt overtar fra
  PR-en. Stopper økta, av hvilken grunn som helst (ferdig, stoppgrensen eller
  venting på oppdragsgiver), sletter den påminnelsen med `delete_trigger`, så
  den ikke vekker en økt som har stoppet.
  Avvises `send_later` (i byggeøkter med «lineage depth 8», #1031), skriver økta i
  PR-en at påminnelsen ble avvist. Økta holder da selv øye med tiden og brukt
  kontekst etter de samme grensene. Orkestratorens sjekk med `get_session` er
  sikkerhetsnettet.
  Tilstanden skal gjøre det mulig å lese seg inn på nytt: vedtakene i
  hovedplanen, arbeidsvalgene i issuet, kravene i PR-beskrivelsen og hva som
  gjenstår.
- **Vekket etter over en time.** En økt som vekkes etter over en time uten
  aktivitet, kan være komprimert av Claude Code (`idleCompaction`, standardverdien
  beholdes), og behandles da som komprimert: den leser vedtakene, issuet og
  PR-beskrivelsen på nytt før den fortsetter.
- **Subagenter har egne grenser**, i kall og tokens: se
  skillen [`subagenter`](../subagenter/SKILL.md).
- **Små verktøysvar.** Les smalt og tell før du leser: se «Utdata» i
  [miljø-skillen](../miljo/SKILL.md#utdata).
- **Review i ny økt.** Byggeøkta pusher, skriver tilstanden i PR-en og stopper,
  uten å kjøre `/code-review`, og lar PR-en stå som utkast. Unntaket er en liten
  diff, om lag 300 endrede linjer utenom tester og `docs/`: er byggeøkta under om
  lag 400 000 tokens og innenfor timen, kjører den `/code-review` og rettingene
  selv, og en ny reviewøkt trengs ikke. Den samme økta kan ikke kjøre
  `/design-review` eller reviewet av samspillet mellom reglene, som krever ny
  kontekst. En ny, liten økt tar
  reviewet og rettingene fra PR-en etter leveranseskillen, «Review og funn», og markerer PR-en klar når
  reviewet er gjort og de lokale sjekkene er grønne. Den får en avgrenset
  bestilling: PR-nummeret, reviewbestillingen og tilstanden i PR-en, ikke hele
  historikken. Den fortsetter samme PR, så den teller ikke i grensen på tre PR-er
  per runde. For økter som ikke er orkestrert, gjelder dette bare når diffen
  rører `kjerne/` eller er over om lag 800 endrede linjer utenom `docs/`.

## I en orkestrert økt

Oppdraget sier hva som skal gjøres, og hva som er fasit. Dette gjelder i tillegg,
uten at oppdraget gjentar det:

- **Les først** issuene, `AGENTS.md` og denne skillen.
- **Spørsmål.** Spørsmål bare oppdragsgiver kan avgjøre (NS 8407, tiltenkt atferd),
  sendes samlet til `@parent` etter kartleggingen og før implementeringen, med
  alternativer, belegg og en anbefaling, og økta venter på svar. Den velger
  ikke et domenevalg i stillhet. Tekniske valg innenfor oppgaven tar den selv
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
  subagenter, så øktas egen kontekst holder seg liten.
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
