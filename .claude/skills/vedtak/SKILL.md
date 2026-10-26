---
name: vedtak
description: Spørsmålene til oppdragsgiver om domenet og vedtakene som føres av svarene, i endringsmeldinger. Hvordan spørsmålene stilles, kontrolleres og lagres, og hvordan vedtaks-PR-en føres i vedtaksregisteret. Brukes når domenespørsmål skal stilles til oppdragsgiver, eller når svar skal føres som vedtak.
---

# Spørsmål og vedtak

Domenespørsmålene fra øktene går gjennom orkestratoren, ikke rett til
oppdragsgiver.

- **Vedtak ved behov.** Nye domenevedtak stilles bare når et issue i den
  kritiske stien trenger dem (oppdragsgiver 20.10, [spørsmål 4](../../../docs/vedlegg/vurdering-maalbilde-2026-10-20/sporsmal.md)).
  Den kritiske stien er milepælen «Første ekte sak».
- **Det prinsipielle først.** Still først spørsmålene som avgjør retningen. Et
  eksempel er om appen skal vurdere selv eller bare registrere, eller hva et
  sendt brev binder. Detaljene venter til retningen er avgjort: for
  kjerne-oppgaver stilles de i kartleggingen (punkt 1 i
  [orkestreringsskillen](../orkestrering/SKILL.md#1-kartlegg-før-du-fordeler)), ellers i byggeøkta for
  bestemmelsen. I FK runde 3 trengte spørsmålene fem kontrollrunder, fordi
  alternativene ble detaljerte før retningen var valgt.
- **Den som stilte spørsmålet, retter det.** Finner kontrollen feil, sender
  orkestratoren funnene til økta som stilte spørsmålet. Orkestratoren skriver
  ikke spørsmålet om selv. Skriver orkestratoren likevel, går teksten gjennom
  samme kontroll. Er spørsmålet stilt av kartleggingssubagenten (punkt 1 i
  orkestreringsskillen), kjøres den på nytt med funnene.
- **Samle før du spør.** Still spørsmålene fra øktene samlet. Hvert spørsmål
  har alternativer, belegg i kontraktsteksten eller vedtaket, en anbefaling og
  hva valget styrer. Kommer spørsmål fra flere økter omtrent samtidig, vent på
  dem. En økt som venter, kan arbeide videre med anbefalingen merket som
  foreslått.
- **Still dem slik oppdragsgiver kan svare.** Skill de juridiske spørsmålene fra
  de tekniske. Har et spørsmål både en juridisk og en teknisk side, regnes det som
  juridisk. Spørsmål som berører rettsregler (NS 8407, kontraktens bestemmelser,
  preklusjon, varsling og lignende) stilles aldri med spørsmålsverktøyet
  (`AskUserQuestion`): «Ønsker fremover at alle domenespørsmål som berører
  rettsregler ikke bruker spørsmålsverktøyet» (oppdragsgiver 23.10). De legges
  fram som en nummerert liste i tekst, med bakgrunn, belegg i kontraktsteksten
  eller vedtaket, alternativene i vedtaksform, anbefalt svar og hva valget styrer,
  så oppdragsgiver kan svare «ja» eller rette enkeltpunkter. Still de juridiske i
  kontraktens språk, uten kodenavn. Tekniske spørsmål og spørsmål om prioritering
  kan fortsatt stilles med spørsmålsverktøyet, med en anbefaling som kan godtas
  samlet. Spørsmålsverktøyet tar høyst fire spørsmål per kall. Er
  det flere tekniske spørsmål, eller vil oppdragsgiver det, legg dem fram som en
  nummerert liste i tekst med anbefalt svar.
- **Hvert spørsmål står på egne bein i verktøyet.** Tekst du skriver før et
  kall til spørsmålsverktøyet, vises ikke for oppdragsgiver i appen. Bakgrunnen,
  alternativene og anbefalingen skal derfor stå i selve spørsmålet og i
  beskrivelsene av alternativene. Trengs mer tekst, avslutt turen med listen i
  stedet for å kalle verktøyet (FK runde 5).
- **Lagre spørsmålene ordrett før du stiller dem.** Skriv hvert spørsmål med
  alle alternativene, etikett og beskrivelse slik de vises i verktøyet eller
  står i listen, til en fil før spørsmålet stilles. Før svarene inn i samme fil. Vedtaket føres fra den fila,
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
- **Prøv arbeidsflyten før vedtaksteksten skrives.** Når et spørsmål endrer hva
  en bruker gjør i appen, prøver en subagent retningen med tre til fem konkrete
  forløp, også forløp der brukeren angrer eller har gjort en feil. Utgangspunktet
  er hva brukeren skal få gjort, ikke vedtakene som finnes. Den spør: kommer
  brukeren i mål i appen, lønner det seg å svare uriktig på et kontrollspørsmål,
  utløser en opplysning en rettslig handling ingen mente å gjøre, kan en part
  utilsiktet tape en posisjon, og finnes det en blindvei? Tre grenser gjelder
  likevel: appen tolker ikke fritekst (KA-U16), appen avgjør ikke det kontrakten
  overlater til partene (MM-U12), og en forenkling forklares med hva den koster
  den andre parten. Ren ordlyd og samsvar mellom vedtak trenger ikke denne
  prøvingen. I vurderingen av vedtakene 25.10 (#1282) godkjente prøvingen mot
  vedtaksfila en sendesperre som gjorde det lønnsomt å svare nei. Forløpene fant
  blindveiene, og rettingene som bare skulle gi samsvar, la til nye: en ny adgang
  til å svekke et svar, et trekk av et avtalt krav og et fritt tilbakekall av et
  bindende forslag (oppdragsgiver 25.10).
- **Skriv alternativene i vedtaksform.** Det valgte alternativet blir
  vedtaksteksten ordrett, og et alternativ oppdragsgiver forkaster, blir
  «Forkastet» ordrett ([vedtaksregisteret](../../../docs/vedtaksregister/README.md)).
  Skriv dem derfor i kontraktens begreper og uten kodenavn (avsnitt 8 i
  hovedplanen), og så fullstendige at de kan stå alene i vedtaksfila.
- **Kontroller belegget før du spør.** Sitater fra vedtak og NS 8407 skal være
  ordrette og hele setninger, og de føres som `sitat` i registeret
  ([vakttestene](../../../docs/vedtaksregister/README.md#vakttestene)). NS 8407-teksten er opphavsrettsbeskyttet og ligger
  i det private repoet `khjohns/kontrakt`. Legg det til med `add_repo`, som kloner
  det til `../kontrakt`, der verktøyet leser det, eller sett `NS8407_TEKST` til fila. Ellers
  hoppes sitattestene over lokalt. Teksten legges aldri i dette repoet, i et issue eller i en PR
  (#424). Påstander om koden i
  spørsmålene kontrolleres av en subagent. En økt ser bare det den har lett
  etter.
- **Prøv hvert alternativ mot vedtakene i vedtaksfila, én gang, når spørsmålet
  stilles.** Det er skjønn og ingen vakttest ser det. En subagent gjør det, med
  kildene: strider alternativet mot et vedtak, og stemmer forholdet
  (presiserer, utvider, snevrer inn, endrer, opphever) med spørsmålet? Et
  alternativ som strider mot et vedtak, er enten feil eller et forslag om å
  oppheve vedtaket, og det skal stå i alternativet. Forholdet skrives i
  spørsmålet, så det følger svaret inn i registeret. Prøvingen er ikke slavisk:
  et vedtak kan være feil. Funnene deles i fire typer: indre feil i
  alternativet, motstrid der alternativet bør vike, motstrid der vedtaket bør
  vike (med forholdet som må stå i alternativet), og en arbeidsflyt som er
  riktig, men tungvint. En motstrid legges fram som et valg, og rettes ikke
  automatisk med den nærmeste regelen som finnes.
- **Passer svaret ikke på et alternativ, still et oppfølgingsspørsmål** med
  lesningene du ser. Velg ikke selv.
- **Send svaret ordrett** til hver økt det berører, også til økter som ikke
  stilte spørsmålet. Retter et senere svar et tidligere, si uttrykkelig hvilken
  tekst som ikke lenger gjelder.

Vedtakene føres i [vedtaksfila](../../../docs/plans/vedtak.md), som er
autoritativ for dem og var avsnitt 3.1 i hovedplanen (#1020), gjennom
[vedtaksregisteret](../../../docs/vedtaksregister/README.md). Arbeidsøktene
skriver ikke der.

- Svarene fra en spørsmålsrunde fører orkestratoren inn i én liten PR: én ny
  post i `docs/vedtaksregister/vedtak.toml` per vedtak, med spørsmålet,
  alternativene, det valgte, svaret ordrett, kilden, forholdet til andre vedtak
  og sitatene. `python3 docs/verktoy/vedtaksregister.py` skriver raden i
  vedtaksfila og henvisningen i Følge hos vedtaket forholdet gjelder. Skriv ikke
  i vedtaksfila for hånd. PR-en merges før arbeids-PR-ene, som viser til ID-ene.
  Da får parallelle PR-er ikke konflikt i vedtaksfila. Lenker et vedtak til et dokument i en
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
- Byggestatus føres ikke i `folge`. Den lages av `docs/verktoy/byggestatus.py`
  av koden og issuene (oppdragsgiver 20.10, #1021), og vakttesten melder ny
  byggestatus i Følge. `folge` kan nevne issuet som bygger vedtaket, «Bygges i
  #n», og visningen leser tilstanden derfra.
- Merknaden om at et punkt i en arbeidspakke er levert, skriver orkestratoren i
  en egen liten PR etter mergen.
