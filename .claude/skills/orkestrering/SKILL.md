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

**Størrelse.** Høyst tre PR-er per runde (oppdragsgiver 12.10, #425). En reviewøkt
som fortsetter samme PR, teller ikke i grensen (oppdragsgiver 14.10, #491).
Tekniske issues som ikke krever svar fra oppdragsgiver, teller heller ikke i
grensen. Runden kan ta mange av dem så lenge de lar seg orkestrere etter
filoverlapp, og de tekniske valgene tas mellom orkestratoren og øktene, ikke av
oppdragsgiver. Et valg som blir en kontrakt, en regel i domenekjernen eller et
lagret navn, er ikke teknisk og venter på oppdragsgiver, som under «2. Oppdraget
til hver økt». Merge krever fortsatt godkjenning fra oppdragsgiver
(oppdragsgiver 16.10, #600: «tekniske issues som ikke behøver avklaringer for meg kan vi ta mange av,
så lenge det lar seg orkestrere, og beslutningene går mellom deg og sesjonene
(og ikke meg)»).
Grensen settes av hvor mye oppdragsgiver kan gå gjennom, av konflikter ved
merge og av kostnaden, ikke av antall issues.
Ber oppdragsgiver om en etikett («ta review-oppfølging»), velg runden slik:

1. Ta bort issues med `venter-på-beslutning`, og issues som rekkefølgen i
   hovedplanen holder igjen. Merknadene til AF-06 sier hvilke. Ett spørsmål om
   et avvik er greit, mer enn det hører til en egen runde.
2. Feil som stopper appen eller gir gale data, går foran opprydding.
3. Grupper etter filoverlapp (punkt 1). Det som ikke får plass, venter til
   neste runde. Si hvilke issues det gjelder, og hvorfor. Punktene i et
   samleissue `review-oppfølging` grupperes på samme måte, og føres etter
   stoppregelen i `AGENTS.md`.

**Flere issues i én økt.** Én økt tar flere issues når de rører de samme
filene eller har samme rotårsak, og leverer én PR med `Closes` for hvert av
dem. To issues i samme fil går aldri i to parallelle økter. Høyst tre små
issues per økt. Et issue som krever kartlegging eller spørsmål til
oppdragsgiver, får egen økt. Spørsmålene før bygging står under «1. Kartlegg
før du fordeler».

**Én økt, én PR.** En arbeidsøkt leverer én PR og tar ikke nye oppgaver etter
at den er åpnet. Har arbeidet to naturlige PR-er, blir det to økter, i hver
sin runde når den ene bygger på den andre. Hver ny oppgave i en lang økt sender
hele den voksende konteksten på nytt, og det koster fort mer enn rettingen.

**Størrelse per økt.** Orkestratoren anslår diffen ut fra avgrensningen i issuet,
før økta startes. Ventes mer enn om lag 800 endrede linjer utenom `docs/`, deles
arbeidet: én økt per bestemmelse eller delområde, i hver sin runde når den ene
bygger på den andre (oppdragsgiver 14.10, #484).

**Subagent eller økt.** Det som blir ferdig i samme tur, gjøres av en
subagent: kartlegging, kontroll av en påstand, gjennomlesing av en diff. Bare
sluttrapporten kommer tilbake, så orkestratorens kontekst holder seg liten.
Arbeid som gir en PR, får egen økt, fordi den må følge CI og rettinger over
timer. En subagent deler i tillegg checkout med orkestratoren.

Unntaket er en liten PR med dokumentasjon eller mekanisk arbeid. Den kan
leveres av subagenten `mekanisk-pr`, som arbeider på egen branch i eget
arbeidstre og ikke kan skrive i `kjerne/`, `server/`, `backend/`, `supabase/`
eller `sprakprove/` (#439). Vernet er hooken `skrivevakt` i
`.claude/settings.json`, som velger vakt etter agenten kallet kommer fra (#442).
`mekanisk-pr` lar PR-en stå som utkast. Subagenten
`diffkontroll` kontrollerer diffen mot bestillingen, og `/code-review` kjøres
etter regelen i `AGENTS.md`, før PR-en markeres klar. Rettinger sendes til
`mekanisk-pr` med `SendMessage`.

**Innsats for orkestratoren.** Orkestratoren skriver ikke kode og kjører på
innsats `high`, ikke `xhigh` (oppdragsgiver 12.10, #425). Innsatsen settes i
appen. Subagenten som prøver alternativene mot vedtakene, beholder
standardmodellen.

**Modell for subagenten.** Mekaniske kontroller går på `model: "haiku"` med
`effort: "medium"`, eller `"high"` når kontrollen har flere steg (oppdragsgiver
10.10). Det gjelder polling av CI, sammenligning med skript av kolonner, ankre
og tokens, lenkekontroll, lesing av CI-logger, og kontroll av at en diff bare
inneholder de bestilte endringene. Oppdraget sier nøyaktig hva som skal
kontrolleres, og hva rapporten skal inneholde. Kontroll av juss, vedtak og kode
går på standardmodellen.

**Modell for mekaniske arbeidsøkter.** En arbeidsøkt med rent mekanisk
arbeid, som infrastruktur, CI-bilder og ren flytting, kan gå på Haiku med
innsats `high`, aldri en økt som rører kjernen, vedtak eller tilgang
(oppdragsgiver 12.10, #425 og #439). Modellen velges i `create_session`;
innsatsen settes i appen.

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
- **Spørsmål før bygging.** For oppgaver i `kjerne/` kartlegger en subagent i
  orkestratoren først, og samler domenespørsmålene etter «Spørsmål og vedtak».
  Byggeøkta starter med svarene i oppdraget. Krever en oppgave utenfor kjernen
  mange spørsmål, kartlegger og spør én økt, og en ny økt bygger med svarene
  (oppdragsgiver 14.10, #484).
- Feil som stopper appen, går foran opprydding.

## 2. Oppdraget til hver økt

Én økt per issue, per gruppe av issues (se «Runden») eller per del av et
issue. Oppdraget skal inneholde:

- issuenummerne, og at økta skal lese issuene og `AGENTS.md` først;
- branchnavn (`claude/<kort-navn>-<issue>`);
- hvilke filer de parallelle øktene arbeider i, og at de ikke skal røres så
  lenge PR-en som eier fila, er åpen. Si uttrykkelig at fordelingen opphører
  når den PR-en er merget. Ellers kan tillatelsessystemet i økta nekte den å
  tilpasse seg etterpå, slik det skjedde med arkitekturtesten i FK runde 2;
- avgjørelser oppdragsgiver allerede har tatt, ordrett;
- at spørsmål bare oppdragsgiver kan avgjøre (NS 8407, tiltenkt atferd), sendes
  samlet til `@parent` etter kartleggingen og før implementeringen, med
  alternativer, belegg og en anbefaling, og at økta venter på svar. Den velger
  ikke et domenevalg i stillhet. Tekniske valg innenfor oppgaven tar den selv
  og fører i PR-en. Sier oppdragsgiver at ingen følger øktene, velger økta det
  konservative alternativet og fører valget under «Åpne spørsmål», unntatt et
  valg som blir en kontrakt: en regel i domenekjernen eller et lagret navn.
  Det venter. For kjerne-oppgaver er spørsmålene samlet i kartleggingen (punkt 1),
  og svarene står i oppdraget. Dekker ikke svarene det byggeøkta møter, stanser
  den og spør på samme måte;
- at økta ikke skriver i hovedplanen, med unntaket under «Spørsmål og vedtak»;
- at feil utenfor oppdraget, som ikke er reviewfunn, blir egne issues (regelen i
  `AGENTS.md`), og at økta løser en slik feil i samme PR med `Closes #n` bare når
  rettingen er noen få linjer i en fil den allerede endrer. Alt annet venter til neste
  runde, også funn i andre øktes filer og funn som krever en avgjørelse;
- at oppdraget er avgrenset til om lag 45–60 minutter med aktivt arbeid, og
  hvordan økta venter (se «Kontekst i arbeidsøktene»);
- at økta melder fra om egen størrelse etter hvert hovedsteg, og stopper ved om
  lag 150 000 tokens (se «Kontekst i arbeidsøktene»);
- at kartlegging, lesing av store filer og CI-logger gjøres av subagenter, så
  øktas egen kontekst holder seg liten (oppdragsgiver 12.10, #425);
- hvilke sjekker som skal kjøres før push, og nettleserkontroll der issuet
  krever det, med skillen `mockup-nettleser`. `/mockup` har demodata og en egen
  statusregel, så den viser ikke at den ekte saksruta virker, og det finnes
  ingen oppskrift for den ekte ruta i skyøkta. Det kontrollen ikke dekker, står
  i PR-beskrivelsen;
- at byggeøkta ikke kjører `/code-review`, og at reviewet og rettingene gjøres i
  en ny økt (se «Kontekst i arbeidsøktene»);
- at reviewet følger stoppregelen for funn i `AGENTS.md`, og kontrollen av
  rettingsdiffen på samme nivå som `AGENTS.md` krever for PR-en. `/simplify`
  kjøres bare når oppdragsgiver har bestilt eller godkjent den (se
  «`/simplify`»), og da før `/code-review`;
- at PR-beskrivelsen er rapporten til orkestratoren: hva som er endret,
  sjekkene som er kjørt med resultat, funn utenfor oppdraget med issuenummer,
  samleissuet med nummer når det finnes, og «Åpne spørsmål». Reviewøkta legger til
  utfallet av `/code-review`;
- PR mot `main` med `Closes #n`, eller «Del av #n» når bare en del leveres,
  og at økta ikke merger;
- at byggeøkta åpner PR-en som utkast og lar den stå. Reviewøkta markerer den
  klar (`ready_for_review`) når reviewet er gjort og de lokale sjekkene er
  grønne. CI og regelversjonsvakten kjører ikke på utkast og ikke ved push til
  `main` (#390), så hver push til et utkast er gratis, og hver
  push til en klar PR koster en full kjøring. Feilinnføringene kjører også på et
  utkast når etiketten `feilinnfoering` er satt. Etiketten settes derfor først
  når PR-en meldes klar, så hele settet (om lag 26 minutter i CI) kjører én
  gang per PR og ikke ved hver push. Før det kontrollerer økta ankrene lokalt
  (#430) og kjører de feilinnføringene som gjelder endringen (oppdragsgiver
  12.10, FK runde 9);
- at økta ikke abonnerer på PR-en (`subscribe_pr_activity`). Hver hendelse
  vekker økta og leser hele konteksten på nytt, også en grønn kjøring, egne
  pusher og mergen. Etter hver push venter økta på CI med én bakgrunnskommando
  som poller sjekkene på committen. Den retter det som er rødt, og melder fra
  når alt er grønt. Review og rød CI etter en oppdatering mot `main` sier
  orkestratoren fra om, fordi det er orkestratoren som oppdaterer;
- at økta melder fra med `send_message` til `@parent` når PR-en er grønn og
  klar for gjennomgang, og at den ikke pusher etter det uten at orkestratoren
  ber om det. En push etter meldingen kan komme etter mergen og bli stående
  utenfor `main`.

`create_session` lar deg velge modell, ikke innsatsnivå. Vil oppdragsgiver ha
et annet nivå, må det settes i økta i appen.

## Spørsmål og vedtak

Domenespørsmålene fra øktene går gjennom orkestratoren, ikke rett til
oppdragsgiver.

- **Det prinsipielle først.** Still først spørsmålene som avgjør retningen. Et
  eksempel er om appen skal vurdere selv eller bare registrere, eller hva et
  sendt brev binder. Detaljene venter til retningen er avgjort: for
  kjerne-oppgaver stilles de i kartleggingen (punkt 1), ellers i byggeøkta for
  bestemmelsen. I FK runde 3 trengte spørsmålene fem kontrollrunder, fordi
  alternativene ble detaljerte før retningen var valgt.
- **Den som stilte spørsmålet, retter det.** Finner kontrollen feil, sender
  orkestratoren funnene til økta som stilte spørsmålet. Orkestratoren skriver
  ikke spørsmålet om selv. Skriver orkestratoren likevel, går teksten gjennom
  samme kontroll. Er spørsmålet stilt av kartleggingssubagenten (punkt 1), kjøres
  den på nytt med funnene.
- **Samle før du spør.** Still spørsmålene fra øktene samlet. Hvert spørsmål
  har alternativer, belegg i kontraktsteksten eller vedtaket, en anbefaling og
  hva valget styrer. Kommer spørsmål fra flere økter omtrent samtidig, vent på
  dem. En økt som venter, kan arbeide videre med anbefalingen merket som
  foreslått.
- **Still dem slik oppdragsgiver kan svare.** Skill de juridiske spørsmålene fra
  de tekniske. Still de juridiske i kontraktens språk, uten kodenavn, og legg de
  tekniske fram med en anbefaling som kan godtas samlet. Spørsmålsverktøyet tar
  høyst fire spørsmål per kall. Er det flere, eller vil oppdragsgiver det, legg
  dem fram som en nummerert liste i tekst med anbefalt svar, så oppdragsgiver
  kan svare «ja» eller rette enkeltpunkter.
- **Hvert spørsmål står på egne bein i verktøyet.** Tekst du skriver før et
  kall til spørsmålsverktøyet, vises ikke for oppdragsgiver i appen. Bakgrunnen,
  alternativene og anbefalingen skal derfor stå i selve spørsmålet og i
  beskrivelsene av alternativene. Trengs mer tekst, avslutt turen med listen i
  stedet for å kalle verktøyet (FK runde 5).
- **Lagre spørsmålene ordrett før du stiller dem.** Skriv hvert spørsmål med
  alle alternativene, etikett og beskrivelse slik de vises i verktøyet, til en
  fil før kallet. Før svarene inn i samme fil. Vedtaket føres fra den fila,
  også de forkastede alternativene, av orkestratoren eller en subagent. I FK
  runde 4 ga fila bare etikettene for de forkastede alternativene, og
  vedtaks-PR-en fikk tekster fra et utkast oppdragsgiver ikke hadde sett.
- **Prinsipp før enkeltvedtak.** Følger svaret av et vedtatt prinsipp, trengs
  ikke et eget vedtak. Valget føres da som arbeidsvalg i paragrafmatrisen,
  domenetabellen eller issuet, med henvisning til prinsippet, og står til
  review. Et eget vedtak trengs når valget ikke følger av et prinsipp, endrer et
  vedtak eller blir en kontrakt. Er spørsmålene mange og detaljerte, gå rett
  til én samlet tilslutning: ett helhetlig forslag, eventuelt prøvd i juridisk
  sparring, som oppdragsgiver kan svare «ja» på med rettelser per punkt. I FK
  runde 4 tok spørsmålene for byggedel 1 tre versjoner før oppdragsgiver
  sluttet seg til en samlet vurdering.
- **Juridisk sparring.** Vil oppdragsgiver drøfte spørsmålene med en annen
  modell eller en rådgiver, lag en selvstendig prompt med bakgrunnen,
  prinsippene og spørsmålene, uten saksdata. Et svar fra sparringen gjelder
  først når oppdragsgiver slutter seg til det, og det prøves mot vedtakene som
  andre svar. Lagre svaret ordrett i en fil og la en subagent prøve det mot
  vedtakene og koden før spørsmålene stilles. I FK runde 6 fant prøvingen at en
  anbefaling sparringen kalte teknisk, snudde planen for leveringen, og at et
  sitat fra et vedtak var halvt.
- **Skriv alternativene i vedtaksform.** Det valgte alternativet blir
  vedtaksteksten ordrett, og et alternativ oppdragsgiver forkaster, blir
  «Forkastet» ordrett ([vedtaksregisteret](../../../docs/vedtaksregister/README.md)).
  Skriv dem derfor i kontraktens begreper og uten kodenavn (avsnitt 8 i
  hovedplanen), og så fullstendige at de kan stå alene i 3.1.
- **Kontroller belegget før du spør.** Sitater fra vedtak og NS 8407 skal være
  ordrette og hele setninger, og de føres som `sitat` i registeret
  ([vakttestene](../../../docs/vedtaksregister/README.md#vakttestene)). NS 8407-teksten er opphavsrettsbeskyttet og ligger
  i det private repoet `khjohns/kontrakt`. Legg det til med `add_repo`, som kloner
  det til `../kontrakt`, der verktøyet leser det, eller sett `NS8407_TEKST` til fila. Ellers
  hoppes sitattestene over lokalt. Teksten legges aldri i dette repoet, i et issue eller i en PR
  (#424). Påstander om koden i
  spørsmålene kontrolleres av en subagent. En økt ser bare det den har lett
  etter.
- **Prøv hvert alternativ mot vedtakene i 3.1, én gang, når spørsmålet
  stilles.** Det er skjønn og ingen vakttest ser det. En subagent gjør det, med
  kildene: strider alternativet mot et vedtak, og stemmer forholdet
  (presiserer, utvider, snevrer inn, endrer, opphever) med spørsmålet? Et
  alternativ som strider mot et vedtak, er enten feil eller et forslag om å
  oppheve vedtaket, og det skal stå i alternativet. Forholdet skrives i
  spørsmålet, så det følger svaret inn i registeret.
- **Passer svaret ikke på et alternativ, still et oppfølgingsspørsmål** med
  lesningene du ser. Velg ikke selv.
- **Send svaret ordrett** til hver økt det berører, også til økter som ikke
  stilte spørsmålet. Retter et senere svar et tidligere, si uttrykkelig hvilken
  tekst som ikke lenger gjelder.

Vedtakene føres i hovedplanen gjennom
[vedtaksregisteret](../../../docs/vedtaksregister/README.md). Arbeidsøktene
skriver ikke der.

- Svarene fra en spørsmålsrunde fører orkestratoren inn i én liten PR: én ny
  post i `docs/vedtaksregister/vedtak.toml` per vedtak, med spørsmålet,
  alternativene, det valgte, svaret ordrett, kilden, forholdet til andre vedtak
  og sitatene. `python3 docs/verktoy/vedtaksregister.py` skriver raden i 3.1 og
  henvisningen i Følge hos vedtaket forholdet gjelder. Skriv ikke i 3.1 for
  hånd. PR-en merges før arbeids-PR-ene, som viser til ID-ene. Da får
  parallelle PR-er ikke konflikt i 3.1. Lenker et vedtak til et dokument i en
  arbeids-PR, merges den PR-en først, så lenken virker.
- Rører bare én PR i runden planen, kan den økta føre et vedtak den trenger, i
  samme PR, på samme måte.
- En vedtakstekst skrives ikke om, verken når den føres eller etter merge.
  [Vakttestene](../../../docs/vedtaksregister/README.md#vakttestene) i CI
  erstatter kontrollrundene av vedtaksteksten. Det som krever skjønn, er
  kontrollert én gang, da spørsmålet ble stilt (over). Kommer et svar som ikke
  passer på et alternativ, stilles et oppfølgingsspørsmål.
- Før vedtaks-PR-en merges, kontrollerer en subagent én gang `folge` i de nye
  postene, hver endret `folge` i en importert post og hver ny eller endret
  tekst i `etter` og `innledning` mot svarene ordrett. Den ser etter ord oppdragsgiver ikke har sagt, slutninger,
  beskrivelser av dagens atferd uten belegg, og arbeidsstatus.
- Merknaden om at et punkt i en arbeidspakke er levert, skriver orkestratoren i
  en egen liten PR etter mergen.

## `/simplify`

`/simplify` kjøres når oppdragsgiver ber om det eller godkjenner orkestratorens
forslag (`AGENTS.md`). Orkestratoren foreslår den for en gren som

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
- **Etterpå:** testene og feilinnføringene kjøres på nytt.
- **PR-beskrivelsen** sier hva som ble endret og hva som ble avvist.

## Kontekst i arbeidsøktene

Hele konteksten sendes på nytt ved hver hendelse i en økt. Hurtigbufferen gjør
det billig innenfor en time. Etter en time uten aktivitet skrives hele
konteksten på nytt ved neste vekking, og det er dyrest når konteksten er stor.
Øktene venter ofte lenger enn en time på oppdragsgiver, CI eller review. Med
stor kontekst blir de også dårligere: etter en komprimering arbeider økta på et
sammendrag, og ordrette vedtak og rettelser kan gå tapt.

- **Arbeid i timer, ikke i døgn.** Hurtigbufferen varer en time. Et oppdrag
  avgrenses slik at økta kan bli ferdig på om lag 45–60 minutter med aktivt
  arbeid. Den kan gå over for å gjøre seg ferdig, innen 150 000 tokens: pushe,
  skrive tilstanden i PR-beskrivelsen og melde fra. Venter økta på CI eller
  feilinnføringene og regner med å fortsette innen en time, venter den med en bakgrunnskommando
  som vekker den, så hurtigbufferen holder seg varm. Venter den lenger, for
  eksempel på oppdragsgiver, skriver den tilstanden i PR-en og stopper. En ny,
  liten økt tar over med en avgrenset bestilling (under), i stedet for at den
  store økta vekkes kald. Det samme gjelder orkestratoren: runden avgrenses til
  om lag én time med aktivt arbeid, sikkerhetssjekkene settes innen 55 minutter
  mens noe pågår, og etter mer enn en time uten aktivitet avsluttes runden
  heller enn å vekkes (oppdragsgiver 12.10, #425).
- **Følg med i hver sjekk.** `get_session` viser brukt kontekst
  (`external_metadata.context_usage.used_tokens`) og kostnad
  (`external_metadata.usage.cost_usd`).
- **Melder fra om egen størrelse.** Etter hvert hovedsteg (kartlegging, bygging,
  review, rettinger) skriver økta tilstanden i PR-en, eller i issuet før PR-en
  finnes. Etter hvert hovedsteg leser økta sin egen kontekst med `get_session`
  uten `session_id`, i feltet `external_metadata.context_usage.used_tokens`.
  Har den passert om lag 150 000 tokens, stopper den der og tar ikke nye
  oppgaver, uten å vente på orkestratorens sjekk. Tilstanden skal gjøre det mulig
  å lese seg inn på nytt: vedtakene i hovedplanen, arbeidsvalgene i issuet,
  kravene i PR-beskrivelsen og hva som gjenstår. En ny, liten økt tar over fra
  PR-en (oppdragsgiver 14.10, #484).
- **Review i ny økt.** Byggeøkta pusher, skriver tilstanden i PR-en og stopper,
  uten å kjøre `/code-review`, og lar PR-en stå som utkast. En ny, liten økt tar
  reviewet og rettingene fra PR-en etter `AGENTS.md`, og markerer PR-en klar når
  reviewet er gjort og de lokale sjekkene er grønne. Den får en avgrenset
  bestilling: PR-nummeret, reviewbestillingen og tilstanden i PR-en, ikke hele
  historikken. Den fortsetter samme PR, så den teller ikke i grensen på tre PR-er
  per runde. For økter som ikke er orkestrert, gjelder dette bare når diffen
  rører `kjerne/` eller er over om lag 800 endrede linjer utenom `docs/`
  (oppdragsgiver 14.10, #484, #490 og #491).
- **Ved om lag 300 000 tokens, eller etter en komprimering,** sender
  orkestratoren én samlet sjekkliste over det som gjenstår, med kildene som
  skal leses på nytt. Gjenstår mer enn rettinger og CI, overtar en ny økt fra
  PR-en og issuene. Den gamle pusher det den har, og avsluttes. Den nye økta
  får en avgrenset bestilling: sjekklisten, PR-nummeret og de konkrete kildene.
  Økta skal ha stoppet ved 150 000 tokens, så dette er en reserve. Den leser ikke
  hele historikken og arbeider under de samme grensene
  (oppdragsgiver 12.10, #425).
- **Venting.** Har en økt stoppet ved om lag 150 000 tokens og ventet mer enn en
  time på oppdragsgiver, vekkes den ikke. En ny økt overtar fra PR-en,
  vedtakene og issuet. Skriv derfor tilstanden i PR-beskrivelsen før økta
  begynner å vente, for eksempel som utkast-PR. Still spørsmålene tidlig, og
  send svarene samlet så snart de foreligger, helst innen en time.
- **Skriv svarene der de kan leses igjen** før de sendes: vedtak i hovedplanen
  og arbeidsvalg i issuet. Meldingen viser dit.
- **Send færre meldinger.** Hver melding til en stor økt koster en ny lesing av
  hele konteksten.

Det samme gjelder orkestratoren. Tilstanden holdes i issuene og PR-ene, ikke
bare i samtalen. Orkestratoren gjentar ikke lange lister i samtalen.
Spørsmålene står i én fil som oppdragsgiver får, og samtalen viser bare det som
er endret. Passerer orkestratoren om lag 300 000 tokens, avsluttes runden når
PR-ene som er nær merge, er merget. Resten går til neste runde.

## 3. Gjennomgang når øktene er ferdige

Øktene melder fra når de er bedt om det (punkt 2). Sett i tillegg én sjekk med
`send_later` som sikkerhetsnett, innen 55 minutter mens noe venter.

Send ikke nye issues til en økt som er i gang. De venter til neste runde.
Samle det en økt skal ha, i én melding, og vent på svaret før neste. Meldinger
som krysser hverandre, gir dobbelt arbeid.

Gjør dette for hver PR:

1. Les PR-beskrivelsen. Mangler den noe av det punkt 2 krever, hent de
   siste meldingene fra økta (`list_events` med `kinds: ["assistant"]` og lav
   `limit`). Les ikke diffen selv: skal den vurderes ut over reviewet økta har
   kjørt, la en subagent lese den og levere konklusjon og funn.
2. Funn som verken er ført eller avvist etter stoppregelen i `AGENTS.md`,
   kontrolleres og meldes. Det føres i PR-ens samleissue, eller legges i issuet
   for samme rotårsak når det finnes. Et funn som økta har tilskrevet
   testmiljøet, sjekkes før det avskrives.
   Legger PR-en til en serverinngang, en tabell eller en migrasjon, lar
   orkestratoren en subagent på standardmodellen kontrollere hver
   sikkerhetsinvariant i `AGENTS.md` mot koden før merge, uavhengig av
   `/code-review` i økta. Kontrollen spør katalogen i en egen base bygget fra
   migrasjonene, ikke bare filene. I FK runde 5 fant den et hull i rettighetene
   som to runder `/code-review high` hadde oversett (PR #372).
3. Samle de åpne spørsmålene fra alle PR-ene og still dem til oppdragsgiver
   etter «Spørsmål og vedtak».
4. Før svarene inn der de hører hjemme: vedtak i hovedplanen etter «Spørsmål og
   vedtak», arbeidsvalg som kommentar i PR-en eller issuet. Ny oppfølging fra
   review følger stoppregelen i `AGENTS.md`. Annen ny oppfølging blir et nytt
   issue.
5. Kontroller CI på siste commit. Er den rød, la subagenten `ci-logg` finne
   første feilende steg, og send funnet til økta som eier PR-en.

## 4. Merge

Merge bare når oppdragsgiver har godkjent det og CI er grønn på siste commit.
Bruk `expectedHeadSha`, slik at en push som kom etter gjennomgangen, stopper
mergen. Regelsettet på `main` krever de fire CI-jobbene (Backend, Database,
Frontend, Lint) fra repoet ble offentlig 11.10.

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
`kjerne/`, `sprakprove/kjernelagring/` eller verktøyet for feilinnføringene
(oppdragsgiver 12.10, FK runde 9). De prøver om testene i kjernen fanger feil,
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
issues som er opprettet, og hva som gjenstår. Slett sjekker som ikke har gått,
og ta ikke en ny runde i samme økt.

## Milepæler og etiketter

Reglene står i `AGENTS.md` under «Hvor hva står». Unntak fra rekkefølgen i AF-06
står i hovedplanen, ikke i issuet.
