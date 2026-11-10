---
name: vedtak
description: Spørsmålene til oppdragsgiver om domenet og vedtakene som føres av svarene, i endringsmeldinger. Hvordan spørsmålene stilles, kontrolleres og lagres, og hvordan vedtaks-PR-en føres i vedtaksregisteret. Brukes når domenespørsmål skal stilles til oppdragsgiver, eller når svar skal føres som vedtak.
---

# Spørsmål og vedtak

Episodene bak reglene står i [episodefila](episoder.md).

Domenespørsmålene fra øktene går gjennom orkestratoren, ikke rett til
oppdragsgiver.

## Hva som er et vedtak

- **Hva et vedtak er.** Et vedtak sier hva som binder partene, hvilken virkning en handling
  har, hvordan NS 8407 tolkes, og hva løsningen teller eller regner. Hvordan skjemaet,
  visningen og arbeidsflyten er bygget opp, står i brukerforløpet og endres av brukerprøven
  uten nytt vedtak (#1534). «Hva løsningen teller eller regner» leses
  som det som regnes med etter kontrakten. Hva oversiktene summerer, er beslutning eller
  design. Klassen avgjøres av testen under, i denne rekkefølgen (#1534):
  1. Har raden en setning om hva som binder partene, hvilken virkning en handling har,
     hvordan kontrakten tolkes (NS 8407 og kontraktsgrunnlaget), hva som regnes med etter
     kontrakten (frist, beløp, enighet, «i tide»), eller hvem som har tilgang, og står
     setningen ikke i et annet gjeldende vedtak? Da er raden *vedtak*, og resten av teksten er design- eller beslutningsdel.
  2. Sier raden hvordan løsningen er bygget, lagrer, leverer eller drives, eller hva som
     venter til en senere versjon? Da er raden *beslutning*. Den avgjøres av
     oppdragsgiver og endres med en ny beslutning.
  3. Ellers sier raden hvordan skjemaet, visningen og arbeidsflyten er bygget opp. Da er
     den *design*, og står i brukerforløpet eller `system.md`. Brukerprøven endrer den uten
     vedtak, men en endring som ville endre noe et vedtak sier, krever nytt vedtak.

  En *post* er en rad i [vedtaksregisteret](../../../docs/vedtaksregister/README.md), og
  *vedtak* er klassen. Hver post har en klasse, og feltene for delene og det andre hjemmet
  står i [registeret](../../../docs/vedtaksregister/README.md#klassen).
- **Hvem som retter klassen.** Klassen er en arbeidsvurdering. Orkestratoren kan rette den,
  men bare etter at en subagent eller en egen økt har kontrollert rettingen uavhengig,
  etter testen over. Rettingen føres i issuet med resultatet av kontrollen. Det samme
  gjelder klassen for en ny post (#1534).
- **Vedtak ved behov.** Nye domenevedtak stilles bare når et issue i den
  kritiske stien trenger dem.
  Den kritiske stien er milepælen «Første ekte sak». Unntakene er samlevedtakene: for alle
  temaene i steg 4 i #1534 (svar 21 B i [PR #1537](https://github.com/khjohns/endringsmeldinger/pull/1537)),
  og for et vedtak som har fått sin tredje endring etter at temaet er samlet (svar 6 og 10 i
  #1534, [6623299573](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623299573) og [6623620205](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623620205)).
  `vedtaksregister.py` varsler om det.
- **Prinsipp før enkeltvedtak.** Følger svaret av et vedtatt prinsipp, trengs
  ikke et eget vedtak. Valget føres da som arbeidsvalg i paragrafmatrisen,
  domenetabellen eller issuet, med henvisning til prinsippet, og står til
  review. Et eget vedtak trengs når valget ikke følger av et prinsipp, endrer et
  vedtak eller blir en kontrakt. Et valg om skjemaet, visningen eller arbeidsflyten føres i
  brukerforløpet og ikke som en post i registeret. Er spørsmålene mange og detaljerte, gå rett til én
  samlet tilslutning: ett helhetlig forslag, eventuelt prøvd i juridisk
  sparring, som oppdragsgiver kan svare «ja» på med rettelser per punkt.

## Innholdet i et spørsmål

- **Det prinsipielle først.** Still først spørsmålene som avgjør retningen. Et
  eksempel er om appen skal vurdere selv eller bare registrere, eller hva et
  sendt brev binder. Detaljene venter til retningen er avgjort: for
  kjerne-oppgaver stilles de i kartleggingen (punkt 1 i
  [orkestreringsskillen](../orkestrering/SKILL.md#1-kartlegg-før-du-fordeler)), ellers i byggeøkta for
  bestemmelsen.
- **Ett spørsmål, én beslutning.** Alternativene svarer på samme spørsmål. Blander et
  spørsmål det som følger av et vedtak med et nytt produktvalg, deles det: det som følger
  av vedtaket, skrives som avgrensning med vedtaket som belegg, og det nye valget blir et
  eget spørsmål, gjerne utenfor oppgaven (#1336).
- **Skriv alternativene i vedtaksform.** Det valgte alternativet blir
  vedtaksteksten ordrett, og et alternativ oppdragsgiver forkaster, blir
  «Forkastet» ordrett ([vedtaksregisteret](../../../docs/vedtaksregister/README.md)).
  Skriv dem derfor i kontraktens begreper og uten kodenavn (avsnitt 8 i
  hovedplanen), og så fullstendige at de kan stå alene i vedtaksfila.
- **En virkning gjengis med alle vilkårene.** Sier et alternativ, en anbefaling eller en
  tekst i en skisse hvor lenge noe binder eller gjelder, tas hvert vilkår i vedtaket med,
  også de som ikke virker aktuelle i saken (#1336).
- **Skill belegg fra antakelse i anbefalingen.** Bygger en anbefaling på hva brukere
  gjør eller trenger, som «den vanligste veien», sier den at det er en antakelse, eller
  viser til prøven som fant det (#1336).

## Kontrollene før spørsmålene stilles

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
- **Prøv arbeidsflyten før vedtaksteksten skrives.** Når et spørsmål endrer hva
  en bruker gjør i appen, prøver en subagent retningen med tre til fem konkrete
  forløp, også forløp der brukeren angrer eller har gjort en feil. Utgangspunktet
  er hva brukeren skal få gjort, ikke vedtakene som finnes. Den spør: kommer
  brukeren i mål i appen, lønner det seg å svare uriktig på et kontrollspørsmål,
  utløser en opplysning en rettslig handling ingen mente å gjøre, kan en part
  utilsiktet tape en posisjon, og finnes det en blindvei? Tre grenser gjelder
  likevel: appen tolker ikke fritekst (KA-U16), appen avgjør ikke det kontrakten
  overlater til partene (MM-U12, opphevet av MM-U50), og en forenkling forklares med hva den koster
  den andre parten. Ren ordlyd og samsvar mellom vedtak trenger ikke denne
  prøvingen.
- **Juridisk sparring.** Vil oppdragsgiver drøfte spørsmålene med en annen
  modell eller en rådgiver, lag en selvstendig prompt med bakgrunnen,
  prinsippene og spørsmålene, uten saksdata. Et svar fra sparringen gjelder
  først når oppdragsgiver slutter seg til det, og det prøves mot vedtakene som
  andre svar. Lagre svaret ordrett i en fil og la en subagent prøve det mot
  vedtakene og koden før spørsmålene stilles.
- **Den som stilte spørsmålet, retter det.** Finner kontrollen feil, sender
  orkestratoren funnene til økta som stilte spørsmålet. Orkestratoren skriver
  ikke spørsmålet om selv. Skriver orkestratoren likevel, går teksten gjennom
  samme kontroll. Er spørsmålet stilt av kartleggingssubagenten (punkt 1 i
  orkestreringsskillen), kjøres den på nytt med funnene.

## Når spørsmålene stilles

- **Samle før du spør.** Still spørsmålene fra øktene samlet. Hvert spørsmål
  har alternativer, belegg i kontraktsteksten eller vedtaket, en anbefaling og
  hva valget styrer. Kommer spørsmål fra flere økter omtrent samtidig, vent på
  dem. En økt som venter, tar bare det som ikke avhenger av svaret
  ([arbeidsøkt-skillen](../arbeidsokt/SKILL.md#tid-og-kontekst)).
- **Still dem slik oppdragsgiver kan svare.** Skill de juridiske spørsmålene fra
  de tekniske. Har et spørsmål både en juridisk og en teknisk side, regnes det som
  juridisk. Spørsmål som berører rettsregler (NS 8407, kontraktens bestemmelser,
  preklusjon, varsling og lignende) stilles aldri med spørsmålsverktøyet
  (`AskUserQuestion`): «Ønsker fremover at alle domenespørsmål som berører
  rettsregler ikke bruker spørsmålsverktøyet». De legges
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
  også de forkastede alternativene, av orkestratoren eller en subagent.

## Når svaret kommer

- **Passer svaret ikke på et alternativ, still et oppfølgingsspørsmål** med
  lesningene du ser. Velg ikke selv.
- **Send svaret ordrett** til hver økt det berører, også til økter som ikke
  stilte spørsmålet. Retter et senere svar et tidligere, si uttrykkelig hvilken
  tekst som ikke lenger gjelder.

## Vedtaks-PR-en

Vedtakene føres i [vedtaksfila](../../../docs/plans/vedtak.md), som er
autoritativ for dem og var avsnitt 3.1 i hovedplanen (#1020), gjennom
[vedtaksregisteret](../../../docs/vedtaksregister/README.md). Arbeidsøktene
skriver ikke der.

- Svarene fra en spørsmålsrunde fører orkestratoren inn i én liten PR: én ny
  post i `docs/vedtaksregister/vedtak.toml` per svar, med spørsmålet,
  alternativene, det valgte, svaret ordrett, kilden, forholdet til andre poster,
  sitatene og klassen etter testen i «Hva som er et vedtak». `python3 docs/verktoy/vedtaksregister.py` skriver raden i
  vedtaksfila og henvisningen i Følge hos vedtaket forholdet gjelder. Skriv ikke
  i vedtaksfila for hånd. PR-en merges før arbeids-PR-ene, som viser til ID-ene.
  Da får parallelle PR-er ikke konflikt i vedtaksfila. Lenker et vedtak til et dokument i en
  arbeids-PR, merges den PR-en først, så lenken virker.
- Rører bare én PR i runden planen, kan den økta føre et vedtak den trenger, i
  samme PR, på samme måte.
- En vedtakstekst skrives ikke om, verken når den føres eller etter merge.
  [Vakttestene](../../../docs/vedtaksregister/README.md#vakttestene) i CI
  erstatter kontrollrundene av vedtaksteksten. Det som krever skjønn, er
  kontrollert én gang, da spørsmålet ble stilt («Kontrollene før spørsmålene stilles»). Kommer et svar som ikke
  passer på et alternativ, stilles et oppfølgingsspørsmål.
- **Samlevedtakene er unntaket** fra regelen over, i de samme tilfellene som under «Vedtak ved
  behov». Et samlevedtak skriver regelen for et tema med nye ord og føres med forholdet
  `samler` til vedtakene det samler. Formen, med kilden for hver setning og lista «Endret
  innhold», står i svar 7 A i #1534 ([6623423185](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623423185)).
  Løser samlevedtaket en motsigelse og endrer innholdet, opphever det i stedet (svar 4 A, [6623211248](https://github.com/khjohns/endringsmeldinger/issues/1534#issuecomment-6623211248)).
  Kartleggingen av et samlevedtak holdes liten (#1065). Vurderingsfila
  har høyst om lag 150 linjer for en ny versjon av et samlevedtak og om lag 250 for en ny
  kjede, og den viser til punktene uten å gjengi dem. Alternativene prøves én gang mot
  vedtakene, og funnene rettes én gang. Kartleggingsøkta sender spørsmålene før om lag
  150 000 tokens. Klarer den ikke det, skriver den tilstanden og stopper. Postene og
  kjedene slås opp med `vedtaksregister.py --vis` og `--kjede`, og subagentene følger
  skillen [`subagenter`](../subagenter/SKILL.md).
- Før vedtaks-PR-en merges, kontrollerer en subagent én gang `folge` i de nye
  postene, hver endret `folge` i en importert post og hver ny eller endret
  tekst i `etter` og `innledning` mot svarene ordrett. Den ser etter ord oppdragsgiver ikke har sagt, slutninger,
  beskrivelser av dagens atferd uten belegg, og arbeidsstatus.
- **Berørte forløp.** Føres et vedtak, kontrolleres [dekning.md](../../../docs/domenetabell/brukerforlop/dekning.md)
  og bestillingene (`BF-xx.md`) mot vedtak-ID-en: viser et forløp til vedtaket, eller
  burde det gjøre det? De berørte forløpene nevnes i vedtaks-PR-en.
- **Berørt kode.** Oppheves, endres eller snevres et vedtak inn, sier oppdraget til
  byggeøkta at koden for den gamle regelen fjernes, slik
  [leveranseskillen](../leveranse/SKILL.md#under-implementering) sier.
- Byggestatus føres ikke i `folge`. Den lages av `docs/verktoy/byggestatus.py`
  av koden og issuene (#1021), og vakttesten melder ny
  byggestatus i Følge. `folge` kan nevne issuet som bygger vedtaket, «Bygges i
  #n», og visningen leser tilstanden derfra.
- Merknaden om at et punkt i en arbeidspakke er levert, skriver orkestratoren i
  en egen liten PR etter mergen.
