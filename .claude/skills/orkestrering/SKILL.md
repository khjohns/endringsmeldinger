---
name: orkestrering
description: Når én økt fordeler issues på flere skyøkter og følger PR-ene deres fram til merge. Brukes når oppdragsgiver ber om å orkestrere, ta flere issues parallelt eller opprette økter som lager PR-er.
---

# Orkestrering av flere økter

Oppdragsgiver ser over PR-ene, svarer på spørsmål og godkjenner merge.
Orkestreringsøkta fordeler arbeidet, går gjennom resultatet og fører det inn
der det hører hjemme. Den skriver ikke koden selv.

## Runden

En runde er én orkestreringsøkt. Den velger et sett issues, fordeler dem,
går gjennom PR-ene, merger og melder fra. Når alle PR-ene i runden er merget
eller lukket og oppdragsgiver har fått avslutningen (punkt 5), er runden over
og økta ferdig. Neste runde starter i en ny økt. Det som skal videre, står i
issuene, ikke i økta.

Grunnen er kostnad. Hele konteksten sendes på nytt ved hver hendelse i økta,
og etter en time uten aktivitet er hurtigbufferen borte. Da betaler neste
vekking for hele konteksten. En økt som lever over natta, blir dyrere for hver
sjekk.

**Størrelse.** Høyst fire arbeidsøkter samtidig. Grensen settes av hvor mye
oppdragsgiver kan gå gjennom og av konflikter ved merge, ikke av antall issues.
Ber oppdragsgiver om en etikett («ta review-oppfølging»), velg runden slik:

1. Ta bort issues med `venter-på-beslutning`, og issues som rekkefølgen i
   hovedplanen holder igjen. Merknadene til AF-06 sier hvilke. Ett spørsmål om
   et avvik er greit, mer enn det hører til en egen runde.
2. Feil som stopper appen eller gir gale data, går foran opprydding.
3. Grupper etter filoverlapp (punkt 1). Det som ikke får plass, venter til
   neste runde. Si hvilke issues det gjelder, og hvorfor.

**Flere issues i én økt.** Én økt tar flere issues når de rører de samme
filene eller har samme rotårsak, og leverer én PR med `Closes` for hvert av
dem. To issues i samme fil går aldri i to parallelle økter. Høyst tre små
issues per økt. Et issue som krever kartlegging eller spørsmål til
oppdragsgiver, får egen økt.

**Én økt, én PR.** En arbeidsøkt leverer én PR og tar ikke nye oppgaver etter
at den er åpnet. Har arbeidet to naturlige PR-er, blir det to økter, i hver
sin runde når den ene bygger på den andre. Hver ny oppgave i en lang økt sender
hele den voksende konteksten på nytt, og det koster fort mer enn rettingen.

**Subagent eller økt.** Det som blir ferdig i samme tur, gjøres av en
subagent: kartlegging, kontroll av en påstand, gjennomlesing av en diff. Bare
sluttrapporten kommer tilbake, så orkestratorens kontekst holder seg liten.
Arbeid som gir en PR, får egen økt, fordi den må abonnere på PR-en og følge CI
og review over timer. En subagent deler i tillegg checkout med orkestratoren.

## 1. Kartlegg før du fordeler

- Les hvert issue og avgrens det: hva det endrer, hvilke filer det rører, og
  hva det venter på (B-ID, annet issue, rekkefølgen i hovedplanen, særlig AF-06).
- Må koden leses for å avgrense et issue, for eksempel hvilke kallere eller
  hendelsestyper som berøres, la en Explore-subagent gjøre det og levere
  konklusjonen. Orkestratoren leser ikke kode eller differ selv (punkt 3).
- Er rekkefølgen i hovedplanen til hinder, spør oppdragsgiver. Godkjenner hen et
  avvik, får hovedplanen en datert merknad i en egen liten PR.
- Del arbeidet i runder etter filoverlapp. Issues som rører samme filer, tas
  etter hverandre i én økt eller i senere runder. Parallelle PR-er i samme fil
  gir konflikter ved hver merge.
- Filoverlapp mellom PR-er kontrolleres med
  `git fetch origin <branch> && git diff --name-only origin/main...origin/<branch>`,
  ikke med `get_files` fra GitHub-MCP. Det svaret har patchene med og blir for
  stort på en stor PR.
- Feil som stopper appen, går foran opprydding.

## 2. Oppdraget til hver økt

Én økt per issue, per gruppe av issues (se «Runden») eller per del av et
issue. Oppdraget skal inneholde:

- issuenummerne, og at økta skal lese issuene og `AGENTS.md` først;
- branchnavn (`claude/<kort-navn>-<issue>`);
- hvilke filer de parallelle øktene arbeider i, og at de ikke skal røres;
- avgjørelser oppdragsgiver allerede har tatt, ordrett;
- at spørsmål bare oppdragsgiver kan avgjøre (NS 8407, tiltenkt atferd), sendes
  samlet til `@parent` etter kartleggingen og før implementeringen, med
  alternativer, belegg og en anbefaling, og at økta venter på svar. Den velger
  ikke et domenevalg i stillhet. Tekniske valg innenfor oppgaven tar den selv
  og fører i PR-en. Sier oppdragsgiver at ingen følger øktene, velger økta det
  konservative alternativet og fører valget under «Åpne spørsmål», unntatt et
  valg som blir en kontrakt: en regel i domenekjernen eller et lagret navn.
  Det venter;
- at økta ikke skriver i hovedplanen, med unntaket under «Spørsmål og vedtak»;
- at funn utenfor oppdraget blir egne issues (regelen i `AGENTS.md`), og at
  økta løser et slikt funn i samme PR med `Closes #n` bare når rettingen er
  noen få linjer i en fil den allerede endrer. Alt annet venter til neste
  runde, også funn i andre øktes filer og funn som krever en avgjørelse;
- hvilke sjekker som skal kjøres før push, og nettleserkontroll der issuet
  krever det, med skillen `mockup-nettleser`. `/mockup` har demodata og en egen
  statusregel, så den viser ikke at den ekte saksruta virker, og det finnes
  ingen oppskrift for den ekte ruta i skyøkta. Det kontrollen ikke dekker, står
  i PR-beskrivelsen;
- at `/code-review` kjøres etter regelen i `AGENTS.md`, én runde før PR-en
  åpnes og én kontroll av rettingene. `/simplify` bare når oppdragsgiver ber
  om det;
- at PR-beskrivelsen er rapporten til orkestratoren: hva som er endret,
  sjekkene som er kjørt med resultat, utfallet av `/code-review`, funn utenfor
  oppdraget med issuenummer, og «Åpne spørsmål»;
- PR mot `main` med `Closes #n`, eller «Del av #n» når bare en del leveres,
  og at økta ikke merger;
- at økta abonnerer på PR-en og driver den til grønn CI;
- at økta melder fra med `send_message` til `@parent` når PR-en er grønn og
  klar for gjennomgang, og at den ikke pusher etter det uten at orkestratoren
  ber om det. En push etter meldingen kan komme etter mergen og bli stående
  utenfor `main`.

`create_session` lar deg velge modell, ikke innsatsnivå. Vil oppdragsgiver ha
et annet nivå, må det settes i økta i appen.

## Spørsmål og vedtak

Domenespørsmålene fra øktene går gjennom orkestratoren, ikke rett til
oppdragsgiver.

- **Samle før du spør.** Still spørsmålene fra øktene i ett kall med
  spørsmålsverktøyet. Hvert spørsmål har alternativer, belegg i kontraktsteksten
  eller vedtaket, en anbefaling og hva valget styrer. Kommer spørsmål fra flere
  økter omtrent samtidig, vent på dem. En økt som venter, kan arbeide videre med
  anbefalingen merket som foreslått.
- **Kontroller belegget før du spør.** Sitater fra vedtak og NS 8407 skal være
  ordrette. NS 8407-teksten ligger ikke i arbeidstreet. Hent den med
  `git show 507e2254^:docs/NS_8407.md`, etter `git fetch --unshallow origin main`
  i en grunn klone. Den legges ikke tilbake i repoet.
- **Prøv hvert alternativ mot vedtakene i 3.1.** Et alternativ som strider mot
  et vedtak, er enten feil eller et forslag om å oppheve vedtaket, og det skal
  stå i alternativet.
- **Passer svaret ikke på et alternativ, still et oppfølgingsspørsmål** med
  lesningene du ser. Velg ikke selv.
- **Send svaret ordrett** til hver økt det berører, også til økter som ikke
  stilte spørsmålet.

Vedtakene føres i hovedplanen. Arbeidsøktene skriver ikke der.

- Svarene fra en spørsmålsrunde fører orkestratoren inn i én liten PR, med en ID
  per vedtak og daterte merknader på radene de presiserer. Den merges før
  arbeids-PR-ene, som viser til ID-ene. Da får parallelle PR-er ikke konflikt i
  3.1.
- Rører bare én PR i runden planen, kan den økta føre et vedtak den trenger, i
  samme PR.
- En vedtakstekst skrives ikke om etter merge. La en subagent kontrollere den
  mot det valgte alternativet og mot vedtakene den presiserer før merge, også
  når orkestratoren har skrevet den.
- Merknaden om at et punkt i en arbeidspakke er levert, skriver orkestratoren i
  en egen liten PR etter mergen.

## 3. Gjennomgang når øktene er ferdige

Øktene melder fra når de er bedt om det (punkt 2). Sett i tillegg én sjekk med
`send_later` som sikkerhetsnett, innen en time mens noe venter.

Send ikke nye issues til en økt som er i gang. De venter til neste runde.
Samle det en økt skal ha, i én melding, og vent på svaret før neste. Meldinger
som krysser hverandre, gir dobbelt arbeid.

Gjør dette for hver PR:

1. Les PR-beskrivelsen. Mangler den noe av det punkt 2 krever, hent de
   siste meldingene fra økta (`list_events` med `kinds: ["assistant"]` og lav
   `limit`). Les ikke diffen selv: skal den vurderes ut over reviewet økta har
   kjørt, la en subagent lese den og levere konklusjon og funn.
2. Funn som ikke er meldt som issue, kontrolleres og meldes. Finnes det et
   issue for samme rotårsak, legg funnet som kommentar der. Et funn som økta
   har tilskrevet testmiljøet, sjekkes før det avskrives.
3. Samle de åpne spørsmålene fra alle PR-ene og still dem til oppdragsgiver
   etter «Spørsmål og vedtak».
4. Før svarene inn der de hører hjemme: vedtak i hovedplanen etter «Spørsmål og
   vedtak», arbeidsvalg som kommentar i PR-en eller issuet. Ny oppfølging blir
   et nytt issue.
5. Kontroller CI på siste commit. Er den rød, la subagenten `ci-logg` finne
   første feilende steg, og send funnet til økta som eier PR-en.

## 4. Merge

Merge bare når oppdragsgiver har godkjent det og CI er grønn på siste commit.
Bruk `expectedHeadSha`, slik at en push som kom etter gjennomgangen, stopper
mergen.

Når en PR i runden er merget, oppdateres hver av de neste mot `main`
(`update_pull_request_branch`) og må ha grønn CI på den nye committen før den
merges. Regelsettet krever ikke at grenen er à jour, og ingen konflikt betyr
ikke at kombinasjonen er testet: to PR-er uten felles filer kan endre
hverandres oppførsel. Bruk den nye committen som `expectedHeadSha`.

## 5. Avslutning

Si til oppdragsgiver hva som er merget, hvilke issues som er lukket, hvilke nye
issues som er opprettet, og hva som gjenstår. Slett sjekker som ikke har gått,
og ta ikke en ny runde i samme økt.

## Milepæler og etiketter

Reglene står i `AGENTS.md` under «Hvor hva står». Unntak fra rekkefølgen i AF-06
står i hovedplanen, ikke i issuet.
