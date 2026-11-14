---
name: orkestrering
description: Når én økt fordeler issues på flere skyøkter og følger PR-ene deres fram til merge. Brukes når oppdragsgiver ber om å orkestrere, ta flere issues parallelt eller opprette økter som lager PR-er.
---

# Orkestrering av flere økter

Reglene for hver arbeidsøkt, også grensene for kontekst, står i
[arbeidsøkt-skillen](../arbeidsokt/SKILL.md). Begrunnelsene og episodene står i
[episodefila](episoder.md), og omveiene i miljøet i
[miljø-skillen](../miljo/SKILL.md#orkestreringen-i-skyøkta).

Oppdragsgiver svarer på spørsmål, ser over skjermbildene og godkjenner merge, per PR
eller på forhånd for runden (punkt 4), men leser ikke koden. Orkestreringsøkta
fordeler arbeidet, går gjennom resultatet og fører det inn der det hører hjemme. Den
skriver ikke koden selv.

En runde er én orkestreringsøkt: den velger et sett issues, fordeler dem, går gjennom
PR-ene, merger og melder fra. Runden er over når alle PR-ene i den er merget eller
lukket og oppdragsgiver har fått avslutningen (punkt 5).

## Når runden starter

1. Innsatsen er `high` («Modell og innsats»).
2. Kartlegg hvert issue og del runden etter filoverlapp (punkt 1).
3. Slå opp review-oppfølgingen i filene runden rører, og legg fram punktene som er
   eldre enn fire uker (punkt 1).
4. Samle domenespørsmålene for `kjerne/` før byggingen (punkt 1).
5. Avgjør oppgavetypen for hver økt («Oppgavetypene») og om `/simplify` bestilles.
6. Fordel og skriv oppdragene (punkt 2).
7. Legg fram runden og spør om forhåndsgodkjenning for merge (punkt 4).
8. Sett sjekken med `send_later` (punkt 3).

## Før merge

1. PR-en er gått gjennom («Gjennomgang av hver PR», punkt 3).
2. Oppdragsgiver har godkjent, per PR eller på forhånd, og vilkårene og unntakene i
   «Forhåndsgodkjenning» er sjekket (punkt 4).
3. PR-en er oppdatert mot `main`, eller et unntak gjelder, CI er grønn på siste
   commit, og mergen bruker `expectedHeadSha` (punkt 4).

## 1. Kartlegg før du fordeler

- Les hvert issue og avgrens det: hva det endrer, hvilke filer det rører, og hva det
  venter på (B-ID, annet issue, rekkefølgen i
  [#1065](https://github.com/khjohns/endringsmeldinger/issues/1065) eller føringen
  AF-06 i hovedplanen).
- Må koden leses for å avgrense et issue, for eksempel hvilke kallere eller
  hendelsestyper som berøres, gjør en Explore-subagent det og leverer konklusjonen.
  Orkestratoren leser ikke kode eller differ selv.
- Er rekkefølgen i #1065 eller AF-06 til hinder, spør oppdragsgiver. Et godkjent
  avvik fra AF-06 får en datert merknad i hovedplanen i en egen liten PR. En endret
  rekkefølge føres i #1065.
- **Filoverlapp.** Issues som rører samme filer, tas etter hverandre i én økt eller i
  senere runder. Kontroller overlappen med
  `git fetch origin <branch> && git diff --name-only origin/main...origin/<branch>`,
  ikke med `get_files` fra GitHub-MCP.
- Feil som stopper appen, går foran opprydding.
- **Review-oppfølging i hver runde.** Når filene er fordelt, tas de åpne punktene i
  issuene med `review-oppfølging` i filene hver økt likevel endrer, med i bestillingen
  med issuenummer og punkt. Byggeøkta legger ikke til punkter selv. Punkter i filer
  runden ikke rører, venter, men ikke mer enn fire uker: eldre punkter legges fram for
  oppdragsgiver ved starten av runden, med en anbefaling for hvert om en egen
  ryddrunde eller avvisning med én linje i issuet. Regelen gjelder også i FK og F0b
  før #310.
- **Spørsmål før bygging.** For `kjerne/` kartlegger en subagent i orkestratoren
  først og samler domenespørsmålene etter «Spørsmål og vedtak», og byggeøkta starter
  med svarene i oppdraget. Utenfor kjernen kartlegger og spør økta selv når det er
  mange spørsmål, og bygger videre hvis svarene kommer mens konteksten er varm; ellers
  tar en ny økt over med svarene («Mens et spørsmål venter» i arbeidsøkt-skillen,
  #484).
- **Kjernen før visningen.** Manglene kontrollen i «Klar til bygging» i
  [`brukerforlop`](../brukerforlop/SKILL.md#klar-til-bygging) finner, går til en
  kjerneøkt før byggeøkta for visningen starter. Mens de bygges, tar Varden-økta et
  issue som ikke trenger dem.

**Størrelsen på runden.** Ingen fast grense på antall PR-er. Runden avgrenses av hvor
mange spørsmål og skjermbilder oppdragsgiver skal se på samtidig, av filoverlapp og av
at hver økt får arbeid som henger sammen (#425). Tekniske issues uten spørsmål kan den
ta mange av, så lenge filoverlappen tillater det, og de tekniske valgene tas mellom
orkestratoren og øktene, ikke av oppdragsgiver. Et valg som blir en kontrakt, en regel i domenekjernen eller
et lagret navn, venter på oppdragsgiver («Spørsmål» i arbeidsøkt-skillen).

Ber oppdragsgiver om en etikett («ta review-oppfølging»), velges runden slik:

1. Ta bort issues med `venter-på-beslutning` og issues som #1065 eller AF-06 holder
   igjen. Ett spørsmål om et avvik er greit; flere hører til en egen runde.
2. Feil som stopper appen eller gir gale data, går foran opprydding.
3. Grupper etter filoverlapp. Det som ikke får plass, venter til neste runde; si
   hvilke issues og hvorfor. Punktene i et samleissue `review-oppfølging` grupperes
   likt og føres etter stoppregelen for funn i leveranseskillen.

## 2. Fordel og skriv oppdragene

**Fordelingen.**

- Issues med samme filer og regler eller samme rotårsak går til samme økt. Urelaterte
  issues får hver sin økt.
- To issues i samme fil går aldri i to parallelle økter, og to parallelle spor rører
  aldri samme fil samtidig. En fil begge trenger, går til det ene sporet, og det andre
  venter.
- Et issue som krever kartlegging eller spørsmål til oppdragsgiver, starter i egen økt.
- **Flere PR-er i én økt.** En økt kan levere flere PR-er etter hverandre og ta det
  neste relaterte issuet mens CI går på den forrige, så lenge konteksten trengs
  («Fortsett så lenge konteksten trengs» i
  [arbeidsøkt-skillen](../arbeidsokt/SKILL.md#tid-og-kontekst)). Et urelatert issue får
  ny økt.
- **Størrelse per PR.** Ingen grense på antall linjer. Arbeidet deles i flere PR-er
  bare når delene kan merges hver for seg, for eksempel én per bestemmelse eller
  delområde. Henger delene sammen, tar samme økt dem etter hverandre.
- **Subagent eller økt.** Det som blir ferdig i samme tur, gjøres i økta eller av en
  subagent etter skillen [`subagenter`](../subagenter/SKILL.md). Arbeid som gir en PR,
  får egen økt.
- **Mekanisk arbeid.** En liten PR med dokumentasjon eller mekanisk arbeid leveres av
  en mekanisk arbeidsøkt på Haiku («Modell og innsats»), som lar PR-en stå som utkast.
  `diffkontroll` kontrollerer diffen mot bestillingen før merge, og `/code-review`
  kjøres etter leveranseskillen, «Review og funn», før PR-en markeres klar.

**Oppdraget** går til én økt per gruppe av relaterte issues. Det er kort og gjengir
ikke de faste reglene i [arbeidsøkt-skillen](../arbeidsokt/SKILL.md). Det inneholder:

- issuenummerne, og at økta leser issuene, `CLAUDE.md` og skillen `arbeidsokt` først;
- oppgavetypen etter «Oppgavetypene», med skillene og kontrollene den gir. Punktene
  under om review, feilinnføring og nettleser gjelder bygging, ikke designsløyfa;
- branchnavn (`claude/<kort-navn>-<issue>`);
- filene de parallelle øktene arbeider i, som ikke røres så lenge PR-en som eier fila,
  er åpen, og uttrykkelig at fordelingen opphører når den PR-en er merget;
- avgjørelser oppdragsgiver allerede har tatt, ordrett;
- kildene som er fasit: issuet, bestillingen, vedtakene og kommentarene med
  arbeidsvalg. Oppdraget sier hvilken som er fasit, og gjengir eller tolker ikke
  innholdet. Funn fra kartleggingen er utgangspunkt, ikke krav. Peker issuet på en
  bestilling, er den fasit, og en skisse utenfor `docs/design/prototyper/` gjelder bare
  der bestillingen ikke endrer noe. For bygging i Varden er prototypene i
  `docs/design/prototyper/` og issuene fasit sammen (#1450); motstrid avklares med
  oppdragsgiver før byggeøkta starter, og oppdraget viser ikke til den gamle visningen
  som utgangspunkt. Bestillingen fra designsløyfa er fortsatt fasit der den finnes.
  Økta leser kildene selv og skriver akseptkriteriene ut fra dem, etter
  leveranseskillen. Avviker oppdraget fra en kilde, gjelder kilden, og økta skriver
  avviket i PR-en. En begrensning på lesingen, som «Les ikke historikken», gjelder
  aldri kildene som er fasit (#1492);
- for kjerne-oppgaver: svarene på domenespørsmålene fra kartleggingen;
- om ingen følger øktene, når oppdragsgiver har sagt det;
- om økta er den eneste PR-en i runden som rører hovedplanen;
- hvilke relaterte issues økta tar etter hverandre, og i hvilken rekkefølge;
- sjekkene før push, og nettleserkontroll med skillen `mockup-nettleser` der issuet
  krever det. Endrer økta visningen, sier oppdraget at den følger `interface-design`,
  og hvem som kjører `/design-deslop` og `/design-review` etter leveranseskillen,
  «Review og funn». Demoruta viser ikke at den ekte saksruta virker; den kjøres med
  «Den ekte saksruta» i skillen. Det kontrollen ikke dekker, står i PR-beskrivelsen;
- hvem som kjører reviewet, etter «Review i byggeøkta» i arbeidsøkt-skillen, og
  `/simplify` før `/code-review` når orkestratoren har bestilt den;
- svarene på det som ellers blir spørsmål: importlinjer i en annen økts fil kan endres
  i en egen commit uten å spørre, tekniske valg i egne filer tar økta og fører i PR-en,
  og `/simplify` står i oppdraget når et kriterium er kjent (oppdragsgiver 13.11).

`create_session` setter modellen med `model` og innsatsen med `effort`. Innsatsen
arves ikke fra orkestratoren; sett den bare når denne skillen eller oppdragsgiver gir
et nivå.

## 3. Følg øktene

Orkestratoren holder tilstanden i issuene og PR-ene, ikke bare i samtalen, og gjentar
ikke lange lister der. Spørsmålene står i én fil som oppdragsgiver får, og samtalen
viser bare det som er endret.

**Meldinger.** Øktene melder fra når PR-en er klar
([arbeidsøkt-skillen](../arbeidsokt/SKILL.md#i-en-orkestrert-økt)).

- Orkestratoren sender en melding bare når økta må gjøre noe: en bestilling, et svar,
  funn som skal rettes, en rebase av dens egen PR eller endret eierskap til en fil den
  arbeider i. Ingen orientering om andre økter, som et bytte av økt eller en merge som
  ikke angår mottakeren.
- Ingen nye issues midt i en oppgave. Et relatert issue kan gis når økta melder PR-en
  klar eller venter på CI. Samle det en økt skal ha, i én melding, og vent på svaret
  før neste.
- Skriv svarene der de kan leses igjen før de sendes: vedtak i vedtaksregisteret og
  arbeidsvalg i issuet. Meldingen viser dit.

**Sjekkene.**

- Mens noe venter, står sjekkene med `send_later` som sikkerhetsnett, innen 55
  minutter og under en time fra hverandre.
- Venter flere PR-er på CI, poller én bakgrunnskommando alle.
- I hver sjekk leser orkestratoren brukt kontekst og kostnad for hver økt med
  `get_session`, og bruker grensene under også når en økt ikke har meldt fra. Feltene,
  og når tallet er for gammelt, står i
  [miljø-skillen](../miljo/SKILL.md#orkestreringen-i-skyøkta); da leses tallet økta
  skriver i PR-en eller issuet (#731).
- **En økt over grensen.** Passerer en økt grensen sin
  ([arbeidsøkt-skillen](../arbeidsokt/SKILL.md#tid-og-kontekst)) uten å stoppe, eller
  blir den komprimert, sender orkestratoren én samlet sjekkliste over det som gjenstår,
  med kildene som skal leses på nytt. Har en økt passert om lag 400 000 tokens uten å
  skrive vurderingen sin i PR-en, ber orkestratoren om den. Gjenstår mer enn rettinger
  og CI, pusher den gamle økta det den har og avsluttes, og en ny økt overtar fra PR-en
  og issuene med en avgrenset bestilling: sjekklisten, PR-nummeret og de konkrete
  kildene, under de samme grensene. Er økta fortsatt over grensen ved neste sjekk,
  avbryter orkestratoren den med `interrupt_session` og sender ingen ny melding.

### Gjennomgang av hver PR

1. Les PR-beskrivelsen. Mangler den noe arbeidsøkt-skillen krever, hent de siste
   meldingene fra økta (`list_events` med `kinds: ["assistant"]` og lav `limit`). Skal
   diffen vurderes ut over reviewet økta har kjørt, leser en subagent den og leverer
   konklusjon og funn.
2. Funn som verken er rettet, ført eller avvist etter stoppregelen for funn i
   leveranseskillen, kontrolleres og meldes. Skal funnet rettes i PR-en, sendes det
   til økta som eier den. Ellers føres det i PR-ens samleissue, eller i issuet for
   samme rotårsak når det finnes. Er økta ved grensen sin, fører orkestratoren funnene
   i samleissuet selv og sender dem ikke til økta. Et funn økta har tilskrevet testmiljøet, sjekkes før det
   avskrives.
3. **Sikkerhetsinvariantene.** Legger PR-en til en serverinngang, en tabell eller en
   migrasjon, kontrollerer en subagent på standardmodellen hver sikkerhetsinvariant i
   `CLAUDE.md` mot koden før merge, uavhengig av `/code-review` i økta. Kontrollen
   spør katalogen i en egen base bygget fra migrasjonene, ikke bare filene.
4. Samle de åpne spørsmålene fra alle PR-ene og still dem etter «Spørsmål og vedtak».
5. Før svarene inn: vedtak i vedtaksregisteret etter «Spørsmål og vedtak», arbeidsvalg
   som kommentar i PR-en eller issuet. Ny oppfølging fra review følger stoppregelen for
   funn; annen ny oppfølging blir et nytt issue.
6. Kontroller CI på siste commit. Er den rød, finner subagenten `ci-logg` første
   feilende steg, og funnet sendes til økta som eier PR-en.

## 4. Merge

Merge bare når oppdragsgiver har godkjent det og CI er grønn på siste commit. Bruk
`expectedHeadSha`, så en push etter gjennomgangen stopper mergen. CI-jobbene
regelsettet på `main` krever, står i
`gh api repos/khjohns/endringsmeldinger/rules/branches/main`. Kommandoene for
oppdatering og merge står i [miljø-skillen](../miljo/SKILL.md#orkestreringen-i-skyøkta).

**Forhåndsgodkjenning.** Når runden legges fram, spør orkestratoren om oppdragsgiver
godkjenner merge av alle PR-er i runden som oppfyller vilkårene under. Svarer
oppdragsgiver ja, merger orkestratoren uten å spørre per PR. Godkjenningen gjelder
bare den runden, så en ny orkestrator spør på nytt. Vilkårene:

- CI er grønn på siste commit, også etter oppdateringen mot `main`;
- økta har kjørt `/code-review` og markert PR-en klar;
- PR-en har ingen åpne spørsmål til oppdragsgiver;
- sikkerhetsinvariantene er kontrollert (punkt 3) der PR-en legger til en
  serverinngang, en tabell eller en migrasjon.

En PR som rører `kjerne/`, fører et vedtak i vedtaksregisteret eller endrer
`CLAUDE.md` eller en skill, er unntatt og venter på oppdragsgiver. Avslutningen sier
hvilke PR-er som er merget på forhånd.

En ren flytting i `kjerne/` er likevel omfattet av forhåndsgodkjenningen når formatet
og atferden er uendret, ingen eksisterende testforventning er endret, feilinnføringene
er grønne i CI og PR-en sier at den er en ren flytting. En gren som endres til et felt
med samme virkning, som i #1783, regnes som en flytting når PR-en har test og
feilinnføring for feltet. Oppdragsgiver 13.11: «Forhåndsgodkjenningen for rene
flyttinger: ja det er ok».

**Oppdater mot `main`.** Når en PR i runden er merget, oppdateres hver av de neste mot
`main` (`update_pull_request_branch`) og må ha grønn CI på den nye committen før merge,
også uten konflikt. Den nye committen er `expectedHeadSha`. Vent på CI med en
bakgrunnskommando som poller `check-runs` på committen, ikke med `sleep` i
forgrunnen. Rett etter oppdateringen har committen ingen kjøringer, så pollingen venter
til de påkrevde jobbene finnes, ikke bare til ingen kjøring står igjen. En PR som går
under unntaket for tekst, kan merges først uten at de andre må oppdateres på nytt.

- **Unntaket for tekst.** Er alt som er merget siden PR-ens base, Markdown i
  `.claude/skills/`, `CLAUDE.md` eller `docs/`, trengs ingen oppdatering og ny CI. Det
  gjelder ikke vedtaksregisteret, domenetabellen, brukerforløpene og skriptene.
  Kontroller med `git diff --name-only` mellom basen og `main`, og skriv det i
  merge-kommentaren (oppdragsgiver 13.11).
- **Feilinnføringene** kjøres ikke på nytt etter oppdateringen når de var grønne på
  forrige commit, og ingen PR merget siden har rørt `kjerne/`,
  `sprakprove/kjernelagring/` eller verktøyet for feilinnføringene. Den vanlige CI-en
  kjøres fortsatt, og nattjobben kjører hele settet på `main` når kjernen er endret.
  Kontroller med `git diff --name-only` mellom de to basene, og skriv det i
  merge-kommentaren eller til oppdragsgiver.
- **Når CI ikke kjører.** Skyøkta kan ikke starte en kjøring på nytt. En ny kjøring
  kommer med en oppdatering mot `main` når grenen er bak; ellers trykker oppdragsgiver
  *Re-run*. Er Actions-kvoten brukt opp (kjennetegnet står i miljø-skillen), kan bare
  oppdragsgiver rette det: si fra til øktene med én gang, så de kjører sjekkene lokalt
  og ikke feilsøker CI.

## 5. Avslutt og overlever

**Avslutningen.** Si til oppdragsgiver hva som er merget, hvilke issues som er lukket
og opprettet, og hva som gjenstår. Slett sjekker som ikke har gått. Det som skal
videre, står i issuene, ikke bare i økta.

**Neste runde** tas i samme økt når konteksten trengs for den, og ellers i en ny økt.
Ingen ny runde startes når sporet er tomt, når det som gjenstår, venter på
oppdragsgiver, eller når oppdragsgiver har sagt stopp. Venter det på oppdragsgiver,
stiller orkestratoren spørsmålene etter «Spørsmål og vedtak» og stopper.

**Orkestratorens kontekst.** Grensene i
[arbeidsøkt-skillen](../arbeidsokt/SKILL.md#tid-og-kontekst) gjelder også
orkestratoren (#425), med overleveringen der arbeidsøkta skriver tilstanden i PR-en.
Vurderingen etter hver sjekk og over om lag 400 000 tokens gjelder resten av sporet:
er resten større og konteksten mest avsluttede PR-er, gjør den overgangen i «Bølger»,
også med åpne PR-er, som går videre med øktene som eier dem, mens neste orkestrator
overtar sjekkene. Ved om lag 800 000 tokens overleverer den uansett, og når den nærmer
seg det, avsluttes runden når PR-ene som er nær merge, er merget; resten går til neste
runde. I et spor uten bølger skriver den overleveringen og stopper. Den
utsetter ikke overleveringen for å vente på CI, et review eller oppdragsgiver.

### Bølger

Oppdragsgiver kan bestille et spor i bølger: runder der hver orkestrator starter den
neste. Bestillingen sier hva sporet omfatter (en etikett, en milepæl eller en liste med
issues) og hvilke spor som går parallelt. Når runden er over eller orkestratoren
nærmer seg grensene over, gjør den dette:

1. Merger det som er nær merge og avslutter. En åpen PR som ikke er nær merge, går
   videre med økta som eier den.
2. Skriver overleveringen som kommentar i issuet bestillingen viser til, eller i et
   nytt issue med sporets milepæl eller etikett: hva som er merget, de åpne PR-ene med
   økt-ID, de neste issuene i rekkefølge, avgjørelsene fra oppdragsgiver ordrett eller
   med lenke, og filene det parallelle sporet arbeider i. Har bølgeissuet en rekkefølge
   i beskrivelsen, begynner overleveringen med trinnet runden står på, og sier hvorfor
   et issue eventuelt er tatt fra et senere trinn. Rekkefølgen endres bare av
   oppdragsgiver, og da i beskrivelsen (#1065).
3. Sletter sjekkene sine.
4. Starter neste orkestrator med `create_session`, med bare dette repoet i
   `source_url` («Miljø» i `CLAUDE.md`). Oppdraget er kort: les `CLAUDE.md`, denne
   skillen og overleveringen, og hva sporet omfatter, uten historikken. Har
   bølgeissuet en prompt, brukes den ordrett.
5. Sier til oppdragsgiver hva som er merget, og gir lenken til overleveringen og ID-en
   til den nye økta.

Er økta på dybde 7 eller dypere
([miljø-skillen](../miljo/SKILL.md#orkestreringen-i-skyøkta)), eller avvises
`create_session`, starter den ikke neste økt selv. Den sier fra til oppdragsgiver at
neste økt må startes for hånd, med en kort prompt som viser til `CLAUDE.md`, denne
skillen og overleveringen, som i steg 4.

**Én økt i runden.** Går det bare én arbeidsøkt i neste runde, vurderer orkestratoren
om den trengs. Trengs den ikke, starter den ingen ny orkestrator, og arbeidsøkta eier
sporet videre og overleverer selv. Den kjører reviewet selv («Review i byggeøkta» i
[arbeidsøkt-skillen](../arbeidsokt/SKILL.md#tid-og-kontekst)), legger PR-en fram for
oppdragsgiver og merger etter punkt 4 når oppdragsgiver har godkjent. Etter mergen
skriver den overleveringen i bølgeissuet som i steg 2. Er neste issue relatert, tar den
det selv etter «Flere PR-er i én økt». Ellers starter den neste byggeøkt når neste
runde har én økt, og en ny orkestrator når den har flere. Overleveringen sier hvilken
økt som eier sporet. Dybderegelen over gjelder også den.

## Oppgavetypene

Avgjør oppgavetypen før oppdraget skrives; den bestemmer skillene og kontrollene, og
oppdraget sier hvilken det er. Kontrollene står i kilden tabellen viser til, og
tabellen gjentar dem ikke (#1338).

| Oppgavetype | Kjennetegn | Skillene | Kontrollene og reviewet |
| --- | --- | --- | --- |
| Designsløyfe | Bestilling og prototype for et brukerforløp, etiketten `bestilling`. Rører bare `docs/` | `brukerforlop`, `interface-design` med [systemfila](../../../.interface-design/system.md) før skissen, og `vedtak` for D- og S-punktene | «Kontrollene» i `brukerforlop`. Kan være én økt sammen med oppdragsgiver |
| Vedtaks-PR | Svar fra oppdragsgiver føres som vedtak | `vedtak` | Vakttestene i vedtaksskillen. Orkestratoren fører den («Spørsmål og vedtak») |
| Bygging i kjernen, på serveren eller i lagringen | `kjerne/`, `server/`, `sprakprove/`, migrasjonene | `leveranse` og `miljo`, og `brukerforlop` når issuet viser til en bestilling | Leveranseskillen, «Review og funn», og «Review i byggeøkta» i arbeidsøkt-skillen |
| Bygging av visningen | `.svelte`- eller CSS-filer i `src/`, eller synlig tekst i `src/lib` | Som over, og `interface-design`, `mockup-nettleser`, `/design-deslop` og `/design-review`, i det omfanget leveranseskillen, «Review og funn», gir dem. Viser issuet til en bestilling, også `brukerforlop`, for byggeøkta, ryddeøkta og reviewøkta. Et designvalg går gjennom avvikstabellen i `brukerforlop`, steg 4, også uten bestilling | Leveranseskillen, «Review og funn». Med bestilling kjøres `/design-review` også mot den, etter «Sammenligne en bygget visning» i `brukerforlop`, i den rekkefølgen leveranseskillen gir. Avvikstabellen og skjermbildene side om side, i samme bredde, står i PR-en før den meldes klar. `/design-deslop` endrer ikke det bestillingen fastsetter, med mindre endringen føres som bevisst endring i avvikstabellen. En bevisst endring er ikke godkjent før oppdragsgiver har sagt ja (#1492) |
| Dokumentasjon og mekanisk arbeid | `docs/`, skillene, lenker, flytting, CI, papercuts | En mekanisk arbeidsøkt på Haiku, med `github` | `diffkontroll` mot bestillingen før merge, leveranseskillen, «Review og funn», og «Mekanisk arbeid» i punkt 2 |
| Review i ny økt | Fortsetter en PR fra en byggeøkt som har overlevert | `code-review`, og `/simplify` når den er bestilt («`/simplify`») | Leveranseskillen, «Review og funn» |

En PR som blander typene, følger den strengeste.

## `/simplify`

Orkestratoren bestiller `/simplify` selv når et kriterium under gjelder, uten å spørre
oppdragsgiver, og sier i avslutningen av runden hvilke grener den er kjørt på
(oppdragsgiver 13.11). Oppdragsgiver kan også be om den. Den ser etter gjenbruk,
duplisering og kode som kan forenkles i én diff, og hvor stor diffen er, avgjør ikke.
Den bestilles for en gren som

- legger til ny produksjonskode: en ny komponent, modul eller utregning, særlig i
  visningen og på serveren, der en ny del lett blir en kopi av en som finnes;
- er bygget i flere omganger, for eksempel med domenesvar som endret retning;
- rører filer der reviewet tidligere har gitt funn om duplisering eller to kilder for
  samme verdi.

Den bestilles ikke for en ren flytting, for `docs/` og skillene, for en liten retting
eller for en PR som er merget. Den står i oppdraget for økter som ventes å gi en slik
gren. Ellers bestilles den når byggeøkta melder at et kriterium gjelder («I en
orkestrert økt» i [arbeidsøkt-skillen](../arbeidsokt/SKILL.md#i-en-orkestrert-økt)).
Den skal treffe der den finner noe (oppdragsgiver 13.11).

Bestillingen til økta sier:

- **Når:** før `/code-review`, så reviewet ser den endelige koden. Er reviewet alt
  kjørt, kjøres én `/code-review` til på endringene `/simplify` gjorde.
- **Omfang:** bare kildefilene, ikke testene og `docs/`.
- **Grenser:** atferden er uendret, og ingen lagrede navn, kontrakter eller predikater
  endres. Et forslag ut over grensene gjennomføres ikke i PR-en; det er et funn etter
  stoppregelen for funn i leveranseskillen, med kilden `/simplify` i «Funn og utfall».
  Duplisering og to kilder avvises ikke.
- **Etterpå:** testene kjøres på nytt. Feilinnføringene for kjernen kjøres i CI, og for
  serveren de ID-ene som hører til endringen.
- **PR-beskrivelsen** sier hva som ble endret, og «Funn og utfall» har forslagene som
  ikke ble gjennomført.

## Modell og innsats

- **Orkestratoren** skriver ikke kode og kjører på innsats `high`, ikke `xhigh`
  (#425). Startes den med `create_session`, får den `effort: "high"` der; ellers
  settes innsatsen i appen.
- **Mekaniske arbeidsøkter**, med rent mekanisk arbeid som infrastruktur, CI-bilder og
  ren flytting, kan gå på Haiku med innsats `high`, aldri en økt som rører kjernen,
  vedtak eller tilgang (#439). Modellen og innsatsen settes i `create_session`.

## Spørsmål og vedtak

Hvordan domenespørsmålene stilles til oppdragsgiver, og hvordan svarene føres som
vedtak, står i [vedtaksskillen](../vedtak/SKILL.md). Les den før en spørsmålsrunde og
før en vedtaks-PR.

## Milepæler og etiketter

Reglene og etikettene står i [GitHub-skillen](../github/SKILL.md). Unntak fra
rekkefølgen i AF-06 står i hovedplanen, ikke i issuet.
