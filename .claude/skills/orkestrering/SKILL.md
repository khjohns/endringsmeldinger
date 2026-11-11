---
name: orkestrering
description: Når én økt fordeler issues på flere skyøkter og følger PR-ene deres fram til merge. Brukes når oppdragsgiver ber om å orkestrere, ta flere issues parallelt eller opprette økter som lager PR-er.
---

# Orkestrering av flere økter

Reglene for hver arbeidsøkt står i [arbeidsøkt-skillen](../arbeidsokt/SKILL.md), og
episodene bak reglene i [episodefila](episoder.md).

Oppdragsgiver svarer på spørsmål, ser over skjermbildene og godkjenner merge, per PR
eller på forhånd for runden (punkt 4). Oppdragsgiver leser ikke koden.
Orkestreringsøkta fordeler arbeidet, går gjennom resultatet og fører det inn
der det hører hjemme. Den skriver ikke koden selv.

## Runden

En runde er én orkestreringsøkt. Den velger et sett issues, fordeler dem,
går gjennom PR-ene, merger og melder fra. Når alle PR-ene i runden er merget
eller lukket og oppdragsgiver har fått avslutningen (punkt 5), er runden over.
Neste runde tas i samme økt når konteksten trengs for den, og ellers i en ny økt
(«Orkestratorens tid og kontekst»). Det som skal videre, står i issuene, ikke bare
i økta.

**Bølger.** Oppdragsgiver kan bestille et spor i bølger, en rekke runder der
hver orkestrator starter den neste. Bestillingen sier hva
sporet omfatter, med en etikett, en milepæl eller en liste med issues, og hvilke
spor som går parallelt. Orkestratoren starter neste runde når sin egen er over, eller når den
nærmer seg grensene i «Orkestratorens tid og kontekst». Da gjør den dette:

1. Merger det som er nær merge og avslutter etter punkt 5. En åpen PR som ikke
   er nær merge, går videre med økta som eier den.
2. Skriver overleveringen som kommentar i issuet bestillingen viser til, eller
   i et nytt issue med sporets milepæl eller etikett: hva som er merget, de
   åpne PR-ene med økt-ID, de neste issuene i rekkefølge, avgjørelsene fra
   oppdragsgiver ordrett eller med lenke, og filene det parallelle sporet
   arbeider i. Har bølgeissuet en rekkefølge i beskrivelsen, begynner
   overleveringen med trinnet runden står på, og den sier hvorfor et issue
   eventuelt er tatt fra et senere trinn. Rekkefølgen endres bare av
   oppdragsgiver, og da i beskrivelsen (#1065).
3. Sletter sjekkene sine.
4. Starter neste orkestrator med `create_session`, med bare dette repoet i
   `source_url` («Miljø» i `CLAUDE.md`). Oppdraget er kort: les
   `CLAUDE.md`, denne skillen og overleveringen, og hva sporet omfatter. Det
   gjengir ikke historikken. Har bølgeissuet en prompt, brukes den ordrett.
5. Sier til oppdragsgiver hva som er merget, og gir lenken til overleveringen
   og ID-en til den nye økta.

**Én økt i runden.** Går det bare én arbeidsøkt i neste runde, vurderer
orkestratoren om den trengs. Trengs den ikke, starter den ikke en ny orkestrator.
Arbeidsøkta eier sporet videre og overleverer selv. Byggeøkta kjører reviewet selv, som «Review i
byggeøkta» i [arbeidsøkt-skillen](../arbeidsokt/SKILL.md#tid-og-kontekst) sier,
og legger PR-en fram for oppdragsgiver og merger etter punkt 4 når
oppdragsgiver har godkjent det. Etter mergen skriver den overleveringen i
bølgeissuet, som i steg 2 over. Er neste issue relatert, tar den det selv etter
«Flere PR-er i én økt». Ellers starter den neste byggeøkt når neste runde bare
har én økt, og en ny orkestrator når den har flere. Overleveringen sier hvilken økt som eier
sporet.
En økt på dybde 8 får ikke satt påminnelsen med `send_later` («lineage depth 8»,
#1031). Dybden står i `lineage.depth` når økta kaller `get_session` uten
`session_id`. Er økta selv på dybde 7 eller dypere, eller avvises
`create_session`, starter den ikke neste økt selv. Den sier fra til oppdragsgiver at
neste økt må startes for hånd, og legger ved en kort prompt. Prompten viser til
`CLAUDE.md`, denne skillen og overleveringen, slik steg 4 over sier.

En orkestrator starter ingen ny runde når sporet er tomt, når det som
gjenstår, venter på oppdragsgiver, eller når oppdragsgiver har sagt stopp.
Venter det på oppdragsgiver, stiller den spørsmålene etter «Spørsmål og vedtak»
og stopper. Forhåndsgodkjenningen for merge (punkt 4) gjelder bare runden den
ble gitt i, så den nye orkestratoren spør på nytt når den legger fram runden.
To parallelle spor rører aldri samme fil samtidig. En fil begge trenger, går til
det ene sporet, og det andre venter.

**Størrelse.** Runden har ingen fast grense på antall PR-er. Den avgrenses av hvor
mange spørsmål og skjermbilder oppdragsgiver skal se på samtidig, av filoverlapp og
av at hver økt får arbeid som henger sammen (#425, #491).
Tekniske issues som ikke krever svar fra oppdragsgiver, kan runden ta mange av så lenge de lar seg orkestrere etter
filoverlapp, og de tekniske valgene tas mellom orkestratoren og øktene, ikke av
oppdragsgiver. Et valg som blir en kontrakt, en regel i domenekjernen eller et
lagret navn, er ikke teknisk og venter på oppdragsgiver, som under «Spørsmål» i
arbeidsøkt-skillen. Merge krever fortsatt godkjenning fra oppdragsgiver. Godkjenningen kan gis per PR eller på forhånd for runden
(punkt 4).
Ber oppdragsgiver om en etikett («ta review-oppfølging»), velg runden slik:

1. Ta bort issues med `venter-på-beslutning`, og issues som rekkefølgen i #1065
   eller føringen AF-06 holder igjen. Ett spørsmål om
   et avvik er greit, mer enn det hører til en egen runde.
2. Feil som stopper appen eller gir gale data, går foran opprydding.
3. Grupper etter filoverlapp (punkt 1). Det som ikke får plass, venter til
   neste runde. Si hvilke issues det gjelder, og hvorfor. Punktene i et
   samleissue `review-oppfølging` grupperes på samme måte, og føres etter
   stoppregelen for funn i leveranseskillen.

**Fordelingen.** Issues som rører de samme filene og reglene eller har samme
rotårsak, går til samme økt, så konteksten den har bygget, brukes på nytt. Urelaterte
issues får hver sin økt. To issues i samme fil går aldri i to parallelle økter. Et issue som krever kartlegging
eller spørsmål til oppdragsgiver, starter i egen økt. Spørsmålene før bygging står under «1. Kartlegg
før du fordeler».

**Flere PR-er i én økt.** En økt kan levere flere PR-er etter hverandre, og ta det
neste relaterte issuet mens CI går på den forrige. Den gjør det så lenge konteksten
trengs for arbeidet, etter «Fortsett så lenge konteksten trengs» i
[arbeidsøkt-skillen](../arbeidsokt/SKILL.md#tid-og-kontekst). Et urelatert issue får
en ny økt, fordi hvert kall leser hele den voksende konteksten.

**Størrelse per PR.** Det er ingen grense på antall linjer. Arbeidet deles i flere
PR-er bare når delene kan merges hver for seg, for eksempel én per bestemmelse eller
delområde. Henger delene sammen, tar samme økt dem etter hverandre.

**Subagent eller økt.** Det som blir ferdig i samme tur, gjøres i økta eller av
en subagent etter skillen [`subagenter`](../subagenter/SKILL.md). Arbeid som gir en PR, får egen
økt, fordi den må følge CI og rettinger over timer. En subagent deler i tillegg
checkout med orkestratoren.

En liten PR med dokumentasjon eller mekanisk arbeid leveres av en mekanisk
arbeidsøkt på Haiku («Modell for mekaniske arbeidsøkter»), som lar PR-en stå
som utkast. Subagenten `diffkontroll` kontrollerer diffen mot bestillingen før
merge, og `/code-review` kjøres etter leveranseskillen, «Review og funn», før PR-en markeres
klar.

**Innsats for orkestratoren.** Orkestratoren skriver ikke kode og kjører på
innsats `high`, ikke `xhigh` (#425). En orkestrator som
startes med `create_session`, får `effort: "high"` der. Ellers settes innsatsen i
appen.

**Modell for mekaniske arbeidsøkter.** En arbeidsøkt med rent mekanisk
arbeid, som infrastruktur, CI-bilder og ren flytting, kan gå på Haiku med
innsats `high`, aldri en økt som rører kjernen, vedtak eller tilgang (#425, #439). Modellen og innsatsen velges i
`create_session`, med `model` og `effort`.

## 1. Kartlegg før du fordeler

- Les hvert issue og avgrens det: hva det endrer, hvilke filer det rører, og
  hva det venter på (B-ID, annet issue, rekkefølgen i
  [#1065](https://github.com/khjohns/endringsmeldinger/issues/1065) eller føringen
  AF-06 i hovedplanen).
- Må koden leses for å avgrense et issue, for eksempel hvilke kallere eller
  hendelsestyper som berøres, la en Explore-subagent gjøre det og levere
  konklusjonen. Orkestratoren leser ikke kode eller differ selv (punkt 3).
- Er rekkefølgen i #1065 eller føringen AF-06 til hinder, spør oppdragsgiver.
  Godkjenner hen et avvik fra AF-06, får hovedplanen en datert merknad i en egen
  liten PR. En endret rekkefølge føres i #1065.
- Del arbeidet i runder etter filoverlapp. Issues som rører samme filer, tas
  etter hverandre i én økt eller i senere runder. Parallelle PR-er i samme fil
  gir konflikter ved hver merge.
- **Review-oppfølging i hver runde.** Når filene er fordelt, slår
  orkestratoren opp de åpne punktene i issuene med `review-oppfølging` som
  gjelder filene hver økt likevel endrer. Punktene tas med i bestillingen, med
  issuenummer og punkt. Byggeøkta legger
  ikke til punkter selv. Punkter i filer runden ikke rører, venter. Regelen
  gjelder også i FK og F0b før #310.
  Et punkt som har stått åpent i mer enn fire uker, venter ikke lenger.
  Orkestratoren legger slike punkter fram for oppdragsgiver ved starten av runden,
  med en anbefaling for hvert: en egen ryddrunde, eller avvisning med én linje i
  issuet.
- Filoverlapp mellom PR-er kontrolleres med
  `git fetch origin <branch> && git diff --name-only origin/main...origin/<branch>`,
  ikke med `get_files` fra GitHub-MCP. Det svaret har patchene med og blir for
  stort på en stor PR.
- **Spørsmål før bygging.** For oppgaver i `kjerne/` kartlegger en subagent i
  orkestratoren først, og samler domenespørsmålene etter «Spørsmål og vedtak».
  Byggeøkta starter med svarene i oppdraget. Krever en oppgave utenfor kjernen
  mange spørsmål, kartlegger og spør økta selv. Kommer svarene mens konteksten er varm,
  bygger den videre. Ellers tar en ny økt over med svarene, etter «Mens et spørsmål
  venter» i arbeidsøkt-skillen (#484).
- Feil som stopper appen, går foran opprydding.

### Oppgavetypene

Avgjør oppgavetypen før oppdraget skrives. Den bestemmer skillene og kontrollene, og
oppdraget sier hvilken det er. Kontrollene står i kilden tabellen viser til, og
tabellen gjentar dem ikke (#1338).

| Oppgavetype | Kjennetegn | Skillene | Kontrollene og reviewet |
| --- | --- | --- | --- |
| Designsløyfe | Bestilling og prototype for et brukerforløp, etiketten `bestilling`. Rører bare `docs/` | `brukerforlop`, og `vedtak` for D- og S-punktene | «Kontrollene» i `brukerforlop`. Kan være én økt sammen med oppdragsgiver |
| Vedtaks-PR | Svar fra oppdragsgiver føres som vedtak | `vedtak` | Vakttestene i vedtaksskillen. Orkestratoren fører den («Spørsmål og vedtak») |
| Bygging i kjernen, på serveren eller i lagringen | `kjerne/`, `server/`, `sprakprove/`, migrasjonene | `leveranse` og `miljo`, og `brukerforlop` når issuet viser til en bestilling | Leveranseskillen, «Review og funn», og «Review i byggeøkta» i arbeidsøkt-skillen |
| Bygging av visningen | `.svelte`- eller CSS-filer i `src/`, eller synlig tekst i `src/lib` | Som over, og `interface-design`, `mockup-nettleser`, `/design-deslop` og `/design-review`, i det omfanget leveranseskillen, «Review og funn», gir dem. Viser issuet til en bestilling, også `brukerforlop`, for byggeøkta, ryddeøkta og reviewøkta. Et designvalg går gjennom avvikstabellen i `brukerforlop`, steg 4, også uten bestilling | Leveranseskillen, «Review og funn». Med bestilling kjøres `/design-review` også mot den, etter «Sammenligne en bygget visning» i `brukerforlop`, i den rekkefølgen leveranseskillen gir. Avvikstabellen og skjermbildene side om side, i samme bredde, står i PR-en før den meldes klar. `/design-deslop` endrer ikke det bestillingen fastsetter, med mindre endringen føres som bevisst endring i avvikstabellen. En bevisst endring er ikke godkjent før oppdragsgiver har sagt ja (#1492) |
| Dokumentasjon og mekanisk arbeid | `docs/`, skillene, lenker, flytting, CI, papercuts | En mekanisk arbeidsøkt på Haiku, med `github` | `diffkontroll` mot bestillingen før merge, leveranseskillen, «Review og funn», og «Subagent eller økt» |
| Review i ny økt | Fortsetter en PR fra en byggeøkt som har overlevert | `code-review`, og `/simplify` når den er bestilt («`/simplify`») | Leveranseskillen, «Review og funn» |

En PR som blander typene, følger den strengeste.

## 2. Oppdraget til hver økt

Én økt per gruppe av relaterte issues (se «Fordelingen»), som den tar etter hverandre. Oppdraget er kort. De faste reglene for en arbeidsøkt står i
[arbeidsøkt-skillen](../arbeidsokt/SKILL.md), og oppdraget gjengir dem ikke.
Oppdraget skal inneholde:

- issuenummerne, og at økta skal lese issuene, `CLAUDE.md` og skillen `arbeidsokt` først;
- oppgavetypen etter «Oppgavetypene», med skillene og kontrollene den gir. Punktene
  under om review, feilinnføring og nettleser gjelder bygging, ikke designsløyfa;
- branchnavn (`claude/<kort-navn>-<issue>`);
- hvilke filer de parallelle øktene arbeider i, og at de ikke skal røres så
  lenge PR-en som eier fila, er åpen. Si uttrykkelig at fordelingen opphører
  når den PR-en er merget. Ellers kan tillatelsessystemet i økta nekte den å
  tilpasse seg etterpå;
- avgjørelser oppdragsgiver allerede har tatt, ordrett;
- kildene som er fasit: issuet, bestillingen, vedtakene og kommentarene med arbeidsvalg.
  Oppdraget sier hvilken som er fasit, og gjengir eller tolker ikke innholdet. Funn fra
  kartleggingen er utgangspunkt, ikke krav. Peker issuet på en bestilling, er bestillingen
  fasit, og en skisse utenfor prototypene i `docs/design/prototyper/` gjelder bare der
  bestillingen ikke endrer noe. For bygging i Varden
  er prototypene i `docs/design/prototyper/` og issuene fasit sammen (#1450). Motstrid mellom dem avklares med oppdragsgiver før byggeøkta starter, og oppdraget
  viser ikke til den gamle visningen som utgangspunkt. Bestillingen fra designsløyfa er
  fortsatt fasit der den finnes. Økta leser kildene selv og skriver akseptkriteriene ut fra dem, etter
  leveranseskillen. Avviker oppdraget fra en kilde, gjelder kilden, og økta skriver avviket
  i PR-en. En begrensning på lesingen, som «Les ikke historikken», gjelder aldri kildene
  som er fasit (#1492);
- for kjerne-oppgaver: svarene på domenespørsmålene fra kartleggingen (punkt 1);
- om ingen følger øktene, når oppdragsgiver har sagt det;
- om økta er den eneste PR-en i runden som rører hovedplanen;
- hvilke relaterte issues økta tar etter hverandre, og i hvilken rekkefølge;
- hvilke sjekker som skal kjøres før push, og nettleserkontroll der issuet
  krever det, med skillen `mockup-nettleser`. Endrer økta visningen, sier oppdraget
  at den følger skillen `interface-design`, og hvem som kjører `/design-deslop` og
  `/design-review` etter leveranseskillen, «Review og funn». Demoruta har en journal i minnet,
  så den viser ikke at den ekte saksruta virker; den ekte ruta
  kjøres med «Den ekte saksruta» i skillen. Det kontrollen ikke dekker, står
  i PR-beskrivelsen;
- hvem som kjører reviewet, etter «Review i byggeøkta» i arbeidsøkt-skillen. `/simplify`
  kjøres bare når oppdragsgiver har bestilt eller godkjent den (se
  «`/simplify`»), og da før `/code-review`.

`create_session` setter modellen med `model` og innsatsen med `effort`. Innsatsen
arves ikke fra orkestratoren. Sett den bare når denne skillen eller oppdragsgiver
gir et nivå.

## 3. Gjennomgang når øktene er ferdige

Øktene melder fra når PR-en er klar ([arbeidsøkt-skillen](../arbeidsokt/SKILL.md#i-en-orkestrert-økt)). Sett i tillegg én sjekk med
`send_later` som sikkerhetsnett, innen 55 minutter mens noe venter.

Send ikke nye issues til en økt midt i en oppgave. Et relatert issue kan gis når økta
melder PR-en klar eller venter på CI. Samle det en økt skal ha, i én melding, og vent på svaret før neste. Meldinger
som krysser hverandre, gir dobbelt arbeid.

Gjør dette for hver PR:

1. Les PR-beskrivelsen. Mangler den noe av det arbeidsøkt-skillen krever, hent de
   siste meldingene fra økta (`list_events` med `kinds: ["assistant"]` og lav
   `limit`). Les ikke diffen selv: skal den vurderes ut over reviewet økta har
   kjørt, la en subagent lese den og levere konklusjon og funn.
2. Funn som verken er rettet, ført eller avvist etter stoppregelen for funn i
   leveranseskillen, kontrolleres og meldes. Skal funnet rettes i PR-en etter
   stoppregelen, sendes det til økta som eier PR-en. Ellers føres det i PR-ens
   samleissue, eller legges i issuet for samme rotårsak når det finnes. Et funn som økta har tilskrevet
   testmiljøet, sjekkes før det avskrives.
   Legger PR-en til en serverinngang, en tabell eller en migrasjon, lar
   orkestratoren en subagent på standardmodellen kontrollere hver
   sikkerhetsinvariant i `CLAUDE.md` mot koden før merge, uavhengig av
   `/code-review` i økta. Kontrollen spør katalogen i en egen base bygget fra
   migrasjonene, ikke bare filene.
3. Samle de åpne spørsmålene fra alle PR-ene og still dem til oppdragsgiver
   etter «Spørsmål og vedtak».
4. Før svarene inn der de hører hjemme: vedtak i vedtaksregisteret etter «Spørsmål og
   vedtak», arbeidsvalg som kommentar i PR-en eller issuet. Ny oppfølging fra
   review følger stoppregelen for funn i leveranseskillen. Annen ny oppfølging blir et nytt
   issue.
5. Kontroller CI på siste commit. Er den rød, la subagenten `ci-logg` finne
   første feilende steg, og send funnet til økta som eier PR-en.

## 4. Merge

Merge bare når oppdragsgiver har godkjent det og CI er grønn på siste commit.

**Forhåndsgodkjenning.** Når runden legges fram, spør orkestratoren om
oppdragsgiver godkjenner merge av alle PR-er i runden som oppfyller vilkårene.
Svarer oppdragsgiver ja, merger orkestratoren uten å spørre per PR. Godkjenningen
gjelder bare den runden. Vilkårene er:

- CI er grønn på siste commit, også etter oppdateringen mot `main` (under);
- økta har kjørt `/code-review` og markert PR-en klar;
- PR-en har ingen åpne spørsmål til oppdragsgiver;
- kontrollen av sikkerhetsinvariantene i punkt 3.2 er gjort der PR-en legger til
  en serverinngang, en tabell eller en migrasjon.

Godkjenningen gjelder ikke en PR som rører `kjerne/`, fører et vedtak i
vedtaksregisteret eller endrer `CLAUDE.md` eller en skill. Den venter på
oppdragsgiver som før. Avslutningen (punkt 5) sier hvilke
PR-er som er merget på forhånd.

Bruk `expectedHeadSha`, slik at en push som kom etter gjennomgangen, stopper
mergen. Hvilke CI-jobber regelsettet på `main` krever, står i regelsettet:
`gh api repos/khjohns/endringsmeldinger/rules/branches/main`.

Integrasjonen i skyøkta kan ikke starte en Actions-kjøring på nytt (403). En ny
kjøring kommer med en oppdatering mot `main` når grenen er bak, ellers må
oppdragsgiver trykke *Re-run* i GitHub. Står jobbene uten runner og med en
annotasjon om betaling eller utgiftsgrense, er Actions-kvoten brukt opp. Det
kan bare oppdragsgiver rette. Si fra til øktene med én gang, så de kjører
sjekkene lokalt og ikke feilsøker CI (FK runde 6).

Når en PR i runden er merget, oppdateres hver av de neste mot `main`
(`update_pull_request_branch`) og må ha grønn CI på den nye committen før den
merges. Regelsettet krever ikke at grenen er à jour, og ingen konflikt betyr
ikke at kombinasjonen er testet: to PR-er uten felles filer kan endre
hverandres oppførsel. Bruk den nye committen som `expectedHeadSha`.

Feilinnføringene trenger ikke kjøres på nytt etter oppdateringen når de var
grønne på PR-ens forrige commit, og ingen PR som er merget siden, har rørt
`kjerne/`, `sprakprove/kjernelagring/` eller verktøyet for feilinnføringene. De prøver om testene i kjernen fanger feil,
og det kan bare slike endringer flytte. Den vanlige CI-en kjøres fortsatt, og
nattjobben kjører hele settet på `main` når kjernen er endret. Kontroller
filene med `git diff --name-only` mellom de to basene, og skriv det i
merge-kommentaren eller til oppdragsgiver.

Vent på CI etter oppdateringen med en bakgrunnskommando som poller
`check-runs` på den nye committen, ikke med `sleep` i forgrunnen. REST-formen
virker også i skyøkta:
`gh api -X PUT repos/<eier>/<repo>/pulls/<n>/update-branch -f expected_head_sha=<SHA>`
og `gh api -X PUT repos/<eier>/<repo>/pulls/<n>/merge -f sha=<hele SHA-en> -f merge_method=merge`.

## 5. Avslutning

Si til oppdragsgiver hva som er merget, hvilke issues som er lukket, hvilke nye
issues som er opprettet, og hva som gjenstår. Slett sjekker som ikke har gått. En ny
runde i samme økt følger «Orkestratorens tid og kontekst».

## Spørsmål og vedtak

Hvordan domenespørsmålene fra øktene stilles til oppdragsgiver, og hvordan
svarene føres som vedtak, står i [vedtaksskillen](../vedtak/SKILL.md). Les den
før en spørsmålsrunde og før en vedtaks-PR.

## `/simplify`

`/simplify` kjøres når oppdragsgiver ber om det eller godkjenner orkestratorens
forslag (leveranseskillen, «Review og funn»). Orkestratoren foreslår den for en gren som

- har mye ny eller omskrevet produksjonskode, som tommelfingerregel over 500
  endrede linjer utenom tester og `docs/`. Mål det med `git diff --shortstat`
  og `--stat`, ikke ved å lese diffen;
- er bygget i flere omganger, for eksempel med domenesvar som endret retning
  underveis;
- har tester eller feilinnføringer som fanger endret atferd.

Foreslå den når runden legges fram, for økter som ventes å gi en slik gren, og
ellers når en gren viser seg å bli det. Foreslå den ikke for rene
dokumentendringer, for en PR som er merget, eller for en liten diff som er
gjennomgått.

Bestillingen til økta sier:

- **Når:** før `/code-review`, så reviewet ser den endelige koden. Er reviewet
  alt kjørt, kjøres én `/code-review` til på endringene `/simplify` gjorde.
- **Omfang:** bare kildefilene, ikke testene og `docs/`.
- **Grenser:** atferden er uendret, og ingen lagrede navn, kontrakter eller
  predikater endres. Det `/simplify` foreslår ut over det, avvises og føres i
  PR-en.
- **Etterpå:** testene kjøres på nytt. Feilinnføringene for kjernen kjøres i CI, og
  for serveren kjøres de ID-ene som hører til endringen.
- **PR-beskrivelsen** sier hva som ble endret og hva som ble avvist.

## Orkestratorens tid og kontekst

Hvorfor grensene finnes, og grensene for arbeidsøktene, står i
[arbeidsøkt-skillen](../arbeidsokt/SKILL.md). For orkestratoren gjelder dette:

- **Hold hurtigbufferen varm.** Mens noe venter, setter orkestratoren sjekkene med
  `send_later` under en time fra hverandre. Venter runden på noe som kan ta over en
  time, for eksempel oppdragsgiver, og har orkestratoren passert om lag 150 000 tokens,
  skriver den overleveringen og stopper heller enn å vekkes (#425).
- **Orkestratoren overleverer når konteksten ikke lenger trengs.** Som arbeidsøktene
  vurderer den etter hver sjekk, og alltid over om lag 400 000 tokens, om det den har i
  konteksten, trengs for resten av sporet. Er resten større og konteksten mest
  avsluttede PR-er, gjør den overgangen i «Bølger», steg 1–5, også med PR-er som er
  åpne. Hver av dem går videre med økta som eier den, og neste orkestrator overtar
  sjekkene. Ved om lag 800 000 tokens overleverer den uansett. I et spor som ikke går i
  bølger, skriver orkestratoren overleveringen og stopper. Den utsetter ikke
  overleveringen for å vente på CI, et review eller oppdragsgiver.
- **Følg med i hver sjekk.** Orkestratoren leser brukt kontekst
  (`external_metadata.context_usage.used_tokens`) og kostnad
  (`external_metadata.usage.cost_usd`) for hver økt med `get_session` i hver
  sjekk, og bruker grensene under også når en økt ikke har meldt fra.
  `get_session` oppdateres bare når en tur ender. Er `used_tokens` 0, eller
  mangler `usage`, har økta ikke fullført sin første tur. Ellers er verdien fra
  siste avsluttede tur, og den kan ligge en hel tur bak. Orkestratoren leser da
  tallet økta skriver i PR-en eller i issuet, fordi `list_events` heller ikke
  viser noe før turen er ferdig. `usage.cost_usd` kan mangle i svaret (#731).
- **Passerer en økt grensen sin uten å stoppe, eller blir den komprimert,**
  sender orkestratoren én samlet sjekkliste over det som gjenstår, med kildene
  som skal leses på nytt. Grensen er om lag 800 000 tokens, eller om
  lag 150 000 tokens for en økt som venter på noe som kan ta over en time
  ([arbeidsøkt-skillen](../arbeidsokt/SKILL.md#tid-og-kontekst)). Har en økt passert om
  lag 400 000 uten å skrive vurderingen sin i PR-en, ber orkestratoren om den.
  Gjenstår mer enn rettinger og CI, overtar en ny økt fra PR-en og issuene. Den gamle pusher det den har, og avsluttes. Er
  økta fortsatt over grensen ved neste sjekk, avbryter orkestratoren den med
  `interrupt_session` og sender ingen ny melding. Hver melding leser hele den
  store konteksten på nytt. Den nye økta
  får en avgrenset bestilling: sjekklisten, PR-nummeret og de konkrete kildene,
  og arbeider under de samme grensene. Nærmer orkestratoren selv seg om lag
  800 000 tokens, avsluttes runden når PR-ene som er nær merge, er merget. Resten går
  til neste runde (#425).
- **Skriv svarene der de kan leses igjen** før de sendes: vedtak i vedtaksregisteret
  og arbeidsvalg i issuet. Meldingen viser dit.
- **Send færre meldinger.** Hver melding til en stor økt koster en ny lesing av
  hele konteksten.

Orkestratoren holder tilstanden i issuene og PR-ene, ikke bare i samtalen. Den
gjentar ikke lange lister i samtalen. Spørsmålene står i én fil som
oppdragsgiver får, og samtalen viser bare det som er endret.

## Milepæler og etiketter

Reglene og etikettene står i [GitHub-skillen](../github/SKILL.md). Unntak fra rekkefølgen i AF-06 står i
hovedplanen, ikke i issuet.
