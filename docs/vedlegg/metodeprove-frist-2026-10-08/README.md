# Metodeprøve: fristkrav, svar og tidsinnsigelser

**Dato:** 2026-10-08. **Arbeidstreets grunnlag:**
`98a06534cb0b447b30fff00e4a9c84bc861e2c77`.
Oppfølging av samtalens første prøve og
[#271](https://github.com/khjohns/endringsmeldinger/issues/271).
[Hovedplanen](../../plans/2026-09-16-godkjenning-og-varig-levering.md)
er fortsatt autoritativ for vedtak og funnstatus.

## Resultat og avgrensning

**Merknad 2026-10-08 til U4 og MP-02:** U4 ble først holdt uavklart etter
oppdragsgivers ønske. Etter gjennomgang av LB-2017-177705 side 24 er
deltolkningen avklart for prøven i
[hovedplanens MP-U4](../../plans/vedtak.md#mp-u4).
Den tidligere rekursive arbeidshypotesen er erstattet. Forløpene P2-01,
P2-03 og P2-10/P2-11 og feilinnføringen MUT-5 er korrigert; P2-14 kontrollerer
utfallet allerede før TE protesterer. MP-02 nedenfor beskriver gjeldende modell.

P1-17–P1-19 er merket `avklart_tolkning`. Forløp som også bygger på syntetiske
modellvalg eller andre arbeidshypoteser, er merket `delvis_avklart` i resultatene,
med eksplisitt kobling til U4. Øvrige tolkninger er ikke godkjent gjennom denne
avklaringen. De sju avvisningene er `modellkonvensjon`, ikke konklusjoner om
juridisk lovlighet. U1–U3 står fortsatt som åpne spørsmål. Feilinnføringene
arver tolkningsstatus fra kontrollforløpet.

De 16 første kontrollsakene er flyttet til JSON. TypeScript-modellen gir samme
resultater for de 297 premisskombinasjonene og 81 forespørselskombinasjonene som
den første Python-prøven. Sammenlikningen er karakterisering av prøve 1, ikke
et selvstendig bevis på juridisk riktighet.

Prøve 2 har 18 forløp, 80 prefikser, sju forventede avvisninger og fire isolerte
feilinnføringer. Alle forventningene består.

**Merknad 2026-10-08 til videre prøve 1 og 2 (#284):** Prøve 3 (ett brev med
flere innsigelser) og prøve 4 (senere dokumentert korrespondanse) bygger på
samme modell og kjører. De har til sammen 11 forløp, ni avvisninger og fire
nye feilinnføringer. Forventningene bygger på MP-U5–MP-U7, som oppdragsgiver
avklarte samme dag. Resultatene for prøve 2 er uendret; utledningen har fått
nye felt (`dokumenter`, `virker_mot`, `motstrid`, `avgjort`, `utsendelser`). Feilinnføringene gir avvik på de
utpekte målassertionene; kontrollene er grønne igjen uten feilinnføringene.
[Resultatfilen](resultater.json) angir faktisk utfall, forventning og filhasher.

**Merknad 08.10 til første prøve:** Python var et engangsforsøk i samtalen.
Dette vedlegget erstatter det som videre arbeidsgrunnlag. Ingen Python-fil eller
resultatfil i `/tmp` trengs for å kjøre prøven. De historiske resultatene er
representert ved kontrollerte hasher i JSON-korpuset. Samsvar med disse
hashene gjør ikke forventningene uavhengige av den tidligere implementeringen.
De navngitte kontrollsakene har egne kildehenvisninger og eksplisitte forventninger.

Prøven forutsetter rettidig nøytralt varsel, mottak og grunnleggende formkrav
etter punkt 5, ingen kontraktsavvik og at saken er utenfor sluttoppgjøret.
Spesifiseringene inneholder begrunnet antall dager. Den omfatter én forespørsel,
høyst én begrunnelse etter bokstav b og én spesifisering. Datoer, faktisk
brevinnhold og «uten ugrunnet opphold» avgjøres ikke av programmet. Rettidighet
og innholdets tilstrekkelighet er uttrykkelige, syntetiske vurderingspremisser.

## Kjøring og filer

Fra repoets rot, med de eksisterende Node-avhengighetene:

```bash
node --experimental-strip-types --disable-warning=ExperimentalWarning docs/vedlegg/metodeprove-frist-2026-10-08/kjor.mjs
./node_modules/.bin/tsc -p docs/vedlegg/metodeprove-frist-2026-10-08/tsconfig.json
```

Kjørt med Node 22.17.1. TypeScript-modellene typekontrolleres separat. Kjøreren
er JavaScript og validerer JSON-inndata med repoets eksisterende Zod-pakke;
ingen pakker eller konfigurasjon er lagt til i applikasjonen. Dette unngår en
ny avhengighet til Node-typepakken bare for prøvens fil- og konsollhåndtering.

| Fil | Rolle |
| --- | --- |
| [regler.json](regler.json) | Kilder, prøveforventninger, modellvalg og spørsmål |
| [bevis-saker.json](bevis-saker.json) | Premisser, handlinger, referanser, forventede virkninger og avvisninger |
| [grunnmodell.ts](grunnmodell.ts) | Isolert modell for prøve 1 |
| [forlopsmodell.ts](forlopsmodell.ts) | Isolert modell for prøve 2; `leggTil` og `utled` |
| [kjor.mjs](kjor.mjs) | Leser JSON, kontrollerer forventninger, utfører feilinnføring og skriver resultat |
| [resultater.json](resultater.json) | Reproduserbar kjøreprotokoll, ikke nye forventninger |

Forventningene står i JSON og produseres ikke av modellene. En annen
implementering kan lese samme korpus. Språkuavhengighet innebærer her et felles
input-/forventningsformat; modellen og kjøreren er fortsatt kjørbar JS/TS-kode.

### Formatkontrakt

- `kilder` viser tekstgrunnlag eller modellvalg. En kildehenvisning betyr ikke
  at utledningen er godkjent. `forventningsgrunnlag` skiller juridiske
  arbeidshypoteser, avklarte tolkninger og modellkonvensjoner.
  `tolkningssporsmal` peker på kjente åpne spørsmål; en tom liste betyr ikke
  at tolkningen er avklart. `avklarte_tolkninger` viser via regelgrunnlaget
  til vedtak i hovedplanen og rettskilden. Kjøreren kontrollerer referansene.
- `enkeltsaker`: komplette premisser og forventninger fra prøve 1 samt tre
  nye punkt 5-kontroller. P1-11–P1-16 gjelder nå uttrykkelig innsigelser mot
  omfanget etter 33.7; P1-17–P1-19 gjelder sen spesifisering etter punkt 5.
- `handlinger`: navngitte syntetiske mottak og vurderingspremisser. `id` er
  meldingsidentiteten, `til` er målmeldingen, `sak` er prøvesaken.
- `forlop`: ordnet liste med handlingsnavn og kontroller etter et bestemt antall
  steg. Forventningsobjektet velger feltene som kontrolleres. Ukjent feltnavn
  feiler, også ved skrivefeil. Hvert forløp har en sluttkontroll.
- `rettidig.TE` og `rettidig.BH`: hver parts vurdering. `true` betyr rettidig,
  `false` betyr for sent og `null` betyr uavklart. De er ikke partsutsagn om
  hverandres rettslige binding. Enighet er et premiss i denne prøven, ikke et
  nytt krav til partenes bruk av produktet eller en endring av B-13.
- `innsigelsesgrunnlag`: skiller punkt 5 fra 33.7. En protest mot en
  punkt 5-innsigelse får `ingen_ny_frist_etter_punkt_5`. Meldingen og
  vurderingspremissene bevares, men prøven tillegger ikke den oppgitte
  rettidigheten virkning som en ny punkt 5-frist.
- `avklart_ingen_tidsinnsigelse`: et uttrykkelig premiss om fravær av virksom
  tidsinnsigelse. Dette er ikke en klokkehendelse eller en automatisk slutning
  fra en tom journal. Produktets belegg for en slik avklaring er ikke bestemt.
- `svarplikt_33_7`: om plikten er utløst av et kvalifisert krav, ikke om det
  fortsatt ventes på svar. `begrensning_33_6_1` gjelder bare den undersøkte
  tidsinnsigelsen, ikke samlet krav eller antall dager.
- `avvisninger`: forventet feilkode og kontroll av uendret prøvehistorikk.
  `utenfor_provens_omfang` betyr ingen vurdering av juridisk lovlighet.
- `brev`: én journalpost med felles part og mottak og en liste innsigelser.
  Hver innsigelse har egen `id`, `til`, `grunn` og `rettidig` (MP-U5). Et brev
  får ingen samlet status; `dokumenter` viser hvilke innsigelser det inneholder.
- En innsigelse med `til` lik et brev er en protest mot hele brevet (MP-U6).
  `virker_mot` viser virkningen for hver innsigelse i brevet.
- `senere_dokumentert`: en innsigelse registrert etter et premiss om fravær av
  virksom tidsinnsigelse mot samme melding. Uten merket avvises den som før.
  Med merket står begge, og `motstrid` viser dem til `motstrid_avgjort`
  utpeker den som gjelder (MP-U7). Den andre blir `tilsidesatt`.
- `utsendt`: et sendt brev som gjengir utledningen for en spesifisering
  (`begrensning_33_6_1`) eller en innsigelse. Gjengivelsen må stemme ved
  sending og endres aldri. `utsendelser` viser om dagens utledning avviker.
- `feilinnforinger`: kontrollsak, målassertion og konkret endring. Forventningen
  må bestå før endringen og feile på målfeltet med endringen. MUT-5 kjører en
  midlertidig kopi av modellen med rekursjonssperren fjernet; kopien slettes
  etter kontrollen. De øvrige feilinnføringene endrer prøvehistorikken i minnet.

## Observerte egenskaper ved metoden

Dette er metodeobservasjoner, ikke nye feilfunn i appen. Alvorlighet for
produksjonsfeil er derfor ikke klassifisert.

| ID | Observasjon | Alvorlighet | Belegg |
| --- | --- | --- | --- |
| MP-01 | Forespørselens svarhistorikk må bevares | Ikke relevant | P2-04, P2-13, MUT-B |
| MP-02 | Innsigelser må skilles etter rettsgrunnlag; punkt 5 er ikke rekursiv | Ikke relevant | P2-01–P2-03, P2-10/P2-11, P2-14–P2-18, MUT-5, MUT-337 |
| MP-03 | Uenighet må skilles fra avklart premiss | Ikke relevant | P2-05, P2-06, P2-12, MUT-U |
| MP-04 | Et brev er ett dokument, men ikke én rettslig handling | Ikke relevant | P3-01–P3-07, MUT-BREV-PROTEST, MUT-BREV-FELLES |
| MP-05 | Senere kunnskap endrer utledningen, ikke journalen eller sendte brev | Ikke relevant | P4-01–P4-04, MUT-DOK, MUT-UTSENDT |

### MP-01: samme spesifisering, forskjellig forhistorie

I `utled` i [forløpsmodellen](forlopsmodell.ts) gir P2-04 et direkte svar etter
bokstav a. P2-13 bruker den samme rettidige spesifiseringen etter et kvalifisert
svar b. Den andre veien leder videre til 33.6.1, selv om spesifiseringen viser
til den opprinnelige forespørselen. En generell «har mottatt forespørsel»-verdi
er utilstrekkelig. MUT-B fjerner begrunnelsen: målverdien for avskjæring endres
fra `false` til `true`, og kontrollen oppdager det.

### MP-02: rettsgrunnlaget setter grensen for tidsinnsigelser

[LB-2017-177705, side 24](https://cms.law/en/media/local/cms-kluge/files/dommer/lb-2017-177705#page=24)
behandler punkt 5 ved sen spesifisering etter 33.6.1. Retten avviser en ny
frist for å påberope oversittelsen av punkt 5-fristen selv. Dommen er en
lagmannsrettsavgjørelse; den er grunnlaget for den avgrensede avklaringen MP-U4,
ikke et belegg for alle virkninger av 33.7.

P2-01 går gjennom forespørsel → rettidig svar b → sen spesifisering → sen
BH-innsigelse → TE-protest. Begrensningen etter 33.6.1 faller bort allerede
ved den sene BH-innsigelsen, før TE-protesten. P2-14 stopper der. P2-03,
P2-10 og P2-11 viser at fravær av TE-protest, sen TE-protest eller fravær av
svar på den ikke gjenoppliver BHs tidsinnsigelse. P2-02 beholder den rettidige
BH-innsigelsen som kontroll. TEs opprinnelige vurderingspremiss «for sent»
bevares i journalen; rettidighetsvirkningen omskriver ikke historikken.

P2-15–P2-17 holder tidsinnsigelsen og en innsigelse mot antall dager atskilt.
Den siste vurderes fortsatt etter 33.7 sammenholdt med punkt 5. P2-18 viser
at et rettidig svar om omfanget ikke erstatter en tidsinnsigelse mot sen
spesifisering. Dette er avgrensede kontrollforløp, ikke en avgjørelse om
samlet krav eller faktisk fristforlengelse.

MUT-5 gjeninnfører den gamle rekursjonen: P2-14 går feilaktig fra `false`
til `null` for begrensningen. MUT-337 fjerner TE-protesten mot den sene
innsigelsen om omfanget: den innsigelsen går fra tapt til uavklart. Slik
kontrolleres både avgrensningen og at punkt 5 fortsatt brukes på ordinære svar.

### MP-03: uenighet er informasjon

`enighet` og `utled` i [forløpsmodellen](forlopsmodell.ts) beholder vurderingene
fra begge sider. I P2-05 mener TE at BH svarte for sent, mens BH mener svaret
var rettidig. Den samlede prøveutledningen er uavklart. MUT-U lar BHs vurdering
vinne: målassertionen oppdager at en uavklart innsigelse feilaktig er blitt
klassifisert som ikke tapt på tidsgrunnlaget.

Dette er en undersøkelse av hvordan uenighet kan representeres, ikke et vedtak
om å endre appens beregning av BHs eget standpunkt. Prøven beregner heller ikke
alternative resultater fullt ut for hver part.

### Prøve 3: ett brev med flere innsigelser

BH sender ett brev, `br1`, med en punkt 5-innsigelse mot sen spesifisering
(`i1`) og en innsigelse mot omfanget etter 33.7 (`o1`). I P3-01 er `i1` for
sen og `o1` rettidig. I P3-02 er det motsatt. Virkningene følger hver
innsigelse: i P3-01 faller begrensningen etter 33.6.1 bort mens `o1` står, og
i P3-02 gjelder begrensningen mens `o1` er uavklart til fravær av protest er
avklart (U3). En samlet status for brevet ville skjult begge forskjellene.
MUT-BREV-FELLES gir alle innsigelsene i brevet den første innsigelsens
vurdering, og P3-01 oppdager det.

En TE-protest mot hele brevet (P3-03) rammer `o1` og gir ingen ny frist mot
`i1` (MP-U6). P3-04 er kontrollen med protest mot bare `o1`, og gir samme
virkning for den. P3-05 avklarer fravær av protest mot brevet. P3-06 viser at
en sen protest ikke er virksom, og P3-07 at protesten ikke gjenoppliver en sen
punkt 5-innsigelse. MUT-BREV-PROTEST knytter protesten til brevets første
innsigelse i stedet for brevet, og P3-03 oppdager at `o1` da blir uavklart.

### Prøve 4: senere dokumentert korrespondanse

I P4-02 er det avklart at BH ikke har noen virksom tidsinnsigelse mot TEs sene
spesifisering (`ak1`). TE sender et brev (`u1`) som gjengir at begrensningen
etter 33.6.1 ikke gjelder. Deretter dokumenterer BH en tidligere e-post med en
rettidig punkt 5-innsigelse (`e1`, `senere_dokumentert`). Prefikset før
registreringen gir fortsatt `false`. Etter registreringen er begrensningen
uavklart, `motstrid` viser `ak1` og `e1`, og `u1` står uendret, men merket
som utdatert (MP-U7). P4-03 og P4-04 avgjør motstriden hver sin vei. Bare
avgjørelsen for innsigelsen gjør `u1` utdatert. P4-01 viser at merket alene,
uten motstrid, ikke endrer virkningen.

MUT-DOK lar dokumentasjonen vinne automatisk, og P4-02 oppdager at
begrensningen da blir `true` i stedet for uavklart. MUT-UTSENDT skriver det
sendte brevet om til dagens utledning, og kontrollen oppdager at merket for
utdatert forsvinner. Avvisningene P4-A1–P4-A5 viser at motstrid krever merket,
at et nytt premiss ikke kan legges oppå motstriden, at et brev ikke kan gjengi
noe annet enn utledningen, og at en avgjørelse krever motstrid og en part i den.

<a id="metodelardommer"></a>

## Metodelærdommer fra prøven

**Merknad 2026-10-08:** Det var utilstrekkelig bare å merke forventningene
som foreløpige. Før korrigeringen bygget både `rettidighet`, bevis-sakene og
MUT-5 på samme antakelse om gjentatt anvendelse av punkt 5. De grønne testene
og den oppdagede feilinnføringen ga derfor ingen uavhengig støtte til denne
tolkningen. Dommen i MP-02 endret forventningsgrunnlaget, og flere kontrollsaker
og selve feilinnføringen måtte endres. At en annen språkmodell støttet den
opprinnelige tolkningen, ga heller ikke slik støtte.

Dette er en observert svakhet ved forventningsarbeidet i prøven, ikke et nytt
produksjonsfunn. De varige arbeidsreglene står i
[testinstruksjonene](../../../.claude/rules/tester.md#domeneforventninger-og-metodeprover).
Vedtak står i hovedplanen; oppfølging og gjenstående bevisbehov spores i
[#271](https://github.com/khjohns/endringsmeldinger/issues/271).

Prøven gir heller ikke belegg for overgangen fra virkelige brev til ferdig
klassifiserte premisser. P2-15–P2-18 skiller innsigelser som objekter, men
prøver ikke flere innsigelser i samme dokument med felles mottak. Senere
dokumentert korrespondanse, fulle partsvise utledninger og regelendring mot
faktisk lagret historikk er heller ikke prøvd. Dette er avgrensninger og
mulige undersøkelser, ikke påviste feil eller nye juridiske vedtak.

### Prioriterte videre prøver

Prøven bør deretter utfordres på om virkelige dokumenter og uenighet kan bli
til sporbare premisser. Fire avgrensede undersøkelser peker seg ut:

1. **Ett brev med flere innsigelser.** La samme BH-brev inneholde både «kravet
   er spesifisert for sent» og «bare tre av ti dager er dokumentert». Begge
   innsigelsene må beholde eget rettsgrunnlag og egen virkning, mens brevet og
   felles mottak bevares samlet. En samlet status for svaret eller kravet vil
   ellers skjule forskjellen.
2. **Senere dokumentert korrespondanse.** Registrer at en tidligere e-post
   dokumenteres etter at journalen først manglet en virksom innsigelse. Ny
   dokumentasjon må kunne endre dagens avledede vurdering uten å omskrive den
   tidligere journalen eller allerede sendte brev. Dette prøver bevis- og
   versjonsgrensen uten å avgjøre den åpne løsningen for rettelser i B-16.
3. **Partsvise resultater ved uenighet.** Vis hva resultatet blir etter BHs
   premisser og etter TEs premisser, og hvilket premiss som skaper forskjellen.
   Skill uenighet om fakta fra manglende opplysninger og fra uavklart
   rettstolkning. `null` bør ikke skjule disse tre tilfellene.
4. **Regelendring mot samme historikk.** Kjør samme hendelsesforløp på nytt
   med en korrigert regel og kontroller at avledet vurdering kan endres uten at
   opprinnelig svar, begrunnelse eller dokument omskrives. Denne prøven må
   senere gå gjennom faktisk lagring og gjenlesing; en JSON-rundtur i minnet er
   ikke tilstrekkelig.

**Merknad 2026-10-08:** Punkt 1 og 2 er prøvd i prøve 3 og 4 (#284). Hvordan
virkelige brev blir til premisser, er fortsatt ikke prøvd: prøvene starter med
innsigelsene ferdig klassifisert. Punkt 3 og 4 står åpne.

Start med punkt 1 og deretter punkt 2. De utfordrer hvordan byggeklossene
hentes fra dokumenter og hvordan ny kunnskap forholder seg til en allerede
ført journal. Punkt 3 og 4 følger når den avgrensede forløpsmodellen er
etablert, og bør ikke brukes som belegg for juridiske vedtak før premissene
og lagringsgrensene er avklart.

## Spørsmål og videre bevisbehov

U1–U3 i [regelgrunnlaget](regler.json) er fortsatt åpne spørsmål. U4–U7 viser
til de avgrensede avklaringene MP-U4–MP-U7 i hovedplanen. Det er mulig å prøve kjente,
avklarte forutsetninger uten å avgjøre disse. Før de aktuelle situasjonene
brukes som bindende produktforventninger, må det avklares hvordan mangelfullt
eller bestridt svar b, mangelfull forespørsel og dokumentert fravær av virksom
tidsinnsigelse skal behandles.

Prøven viser at skillet mellom forløpsfakta, partsvis vurdering og betinget
virkning er nyttig. Den viser også at regelkartleggingen må følge innsigelser
som egne objekter. Det er ikke nok med en samlet status for «kravet» eller
«svaret».

## Verifikasjon og grenser

**Kjørt og observert 08.10 for prøve 3 og 4:** samme kontroller som under
gir 29 forløp, 137 prefikser, 16 avvisninger og åtte feilinnføringer som blir
oppdaget. I tillegg ble fem feil innført midlertidig i en kopi av
`forlopsmodell.ts`: motstrid gir ikke `null`, protest mot brevet når ikke
innsigelsene, gjengivelsen kontrolleres ikke, senere dokumentasjon slipper
gjennom uten merket, og avgjørelsen tilsidesetter ikke. Hver ble fanget av
henholdsvis P4-02, P3-03, P4-A3, P4-A1 og P4-03, og resultatene var
byte-identiske etter tilbakestilling. Prøven avgjør ikke bevisverdien av en
senere dokumentert e-post, hvem som kan avgjøre motstrid, eller B-16.

**Kjørt og observert 08.10:** kontrollene i [kjøreren](kjor.mjs), typekontroll
av de to TypeScript-modellene, gjenoppbygging av hvert prøvd prefiks og
JSON-serialisering/gjenlesing i minnet. Alle 19 enkeltsaker, 18 forløp og sju
avvisninger består; de fire feilinnføringene oppdages på utpekt målfelt.
Før rettingen feilet forventningen om bortfall av 33.6.1-begrensningen uten
TE-protest mot den gamle modellen: `null` i stedet for `false`. Filhashene i
[resultatene](resultater.json) identifiserer den kjørte koden og korpuset.

**Lest:** punkt 5, 33.6.1, 33.6.2 og 33.7 i
den lokale standardteksten `docs/NS_8407.md` (usporet, se `.gitignore`), kontrollert mot den eksterne
standardgjengivelsen angitt i [regler.json](regler.json), samt LB-2017-177705
side 23–24. Forutsetningene rundt
33.4 er avgrenset; appens produksjonsregler er ikke en forventningsgenerator.

**Ikke kontrollert:** appens ruter, godkjenning, database, Catenda, autorisasjon,
faktisk levering, samtidighet, regelversjonering, alle kombinasjoner av
rettslige forhold eller alle mulige hendelsesforløp. JSON-rundtur er ikke
bevis på varig lagring. Ingen uavhengig juridisk vurdering er gjennomført.
Ingen produksjonskode eller eksisterende applikasjonstester er endret. #271 er ikke
fullført av denne metodeprøven.
