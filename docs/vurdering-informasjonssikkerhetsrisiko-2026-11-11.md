# Vurdering av informasjonssikkerhetsrisiko før reell bruk

**Dato:** 11.11.2026. **Kontrollert commit:** `91cd3cd348a3f22a052488ee741d5fdc3949184b`.
**Formål:** knytte veilederen for risikovurdering til repoets tiltak og beslutningsgrunnlag.

## Konklusjon og avgrensning

Repoet har et godt teknisk grunnlag for risikovurderingen, men det undersøkte
grunnlaget dokumenterer ikke at risikoen ved reell bruk er akseptabel.
Veilederen er særlig relevant for å koble eksisterende tiltak til skadefølger,
driftsansvar og beslutning om restrisiko.

Foreslått første omfang er opprettelse, intern behandling, sending, levering og
senere gjenfinning av formelle varsler, inkludert tilgang, relevante integrasjoner,
lagring og brukernes rutiner. Dette er en første vurdering av grunnlaget, ikke en
fullstendig ROS, sikkerhetsaudit eller juridisk vurdering av varslenes rettsvirkning.

[Hovedplanen](plans/2026-09-16-godkjenning-og-varig-levering.md) eier funnstatus,
føringer og åpne beslutninger. [Vedtaksfila](plans/vedtak.md) eier vedtakene.
Notatet endrer ingen av disse og aksepterer ingen restrisiko.
Ifølge CLAUDE.md er løsningen ikke i produksjon og har ingen reelle data.

## Kildegrunnlag og metode

Oppdragsgiver gjenga følgende utdrag fra «Veileder risikovurdering infosikk v1.5»
i samtalen 11.11.2026:

- Kapittel 2: akseptkriterier, omfang og avgrensninger.
- Kapittel 3: verdivurdering, tabell 3 og konsekvens av utilgjengelighet.
- Avsnitt 5.1: beskrivelse av hendelsene.
- Avsnitt 5.2.1: sårbarhetsvurdering.

Den vedlagte filen kunne ikke åpnes som PDF; innholdet i utdragene er ikke
kontrollert mot originalen. Resten av veilederen er ikke lest. Veilederens
fulltekst og interne lenke gjengis ikke her.

Utdragene legger opp til å identifisere informasjonsverdier, beskrive konkrete
uønskede hendelser og vurdere tekniske, organisatoriske og menneskelige
sårbarheter sammen med eksisterende tiltak. Akseptkriteriene legger middels
risiko til virksomhetsleder, eventuelt delegert til systemeier, og høy risiko til
virksomhetsleder med rapportering til overordnet byrådsavdeling.
Det må avklares at disse kriteriene gjelder for innføringen, og hvem som har myndigheten.

Belegg følger hovedplanens skille: **L** betyr lest i kode; **K** betyr kjørt og
observert. Dokumentreferanser er dokumentert grunnlag, ikke kjørt verifikasjon.
Ingen K-belegg for produktets atferd er produsert i denne vurderingen.
Scenarioene RVG-01–RVG-08 er lokale analyse-ID-er. Den utdypende kontrollen
nedenfor knytter dem til eksisterende issues; RVG-02 omfatter et allerede sporet
avvik i #51, lest også i dagens TS-kode.
Risikonivå er ikke satt: virksomhetens konsekvens- og sannsynlighetskriterier
og tilstrekkelig driftsgrunnlag er ikke undersøkt.

## Informasjonsverdier

| Verdi | Beskyttelsesbehov som bør vurderes |
| --- | --- |
| Sendte brev med dokumentasjon | Korrekt og fullstendig innhold, bevart betydning og senere gjenfinning |
| Aktør, kontraktsside, prosjekt og tidspunkt | Pålitelig dokumentasjon av hvem som handlet, i hvilken sammenheng og når |
| Interne notater og utkast | Skjerming mot andre team, også team på samme kontraktsside |
| Krav, svar og sammenhengen mellom dem | Korrekt grunnlag for partenes videre beslutninger |
| Sending, levering og kvitteringer | Skille mellom intern registrering og faktisk levering |

Dette er en innledende kartlegging, ikke en klassifisering etter konsekvensskalaen.
Interne notater er et beskyttelsesbehov i målomfanget; [tilgangsreglene](../.claude/rules/tilgang.md)
beskriver at TS-serverens innganger for notater mangler. Behovet er ikke belegg for
at hele funksjonen finnes eller er verifisert.

## Eksisterende tiltak

| Tiltak | Belegg og grense |
| --- | --- |
| Samlet innlogging, prosjektkontroll og kontraktsrolle | **L:** [app.ts](../server/app.ts), `tilgangOgKropp`, og [autorisasjon.ts](../server/autorisasjon.ts). [register.test.ts](../server/tester/register.test.ts) inneholder HTTP-tester for blant annet sesjon, CSRF og feil prosjekt. Ingen ny kjøring. |
| Transaksjon, versjonskontroll og kommandokvittering | **L:** [kommandoer.ts](../server/kommandoer.ts). Hendelse og frosset leveringsoppdrag sendes til samme databaseprosedyre, og vedlegg bindes i transaksjonen. Databasevirkningen er ikke nyverifisert. |
| Frosset brev og leveringsgrunnlag | **L:** [levering.ts](../server/levering.ts) fryser blant annet aktør, tidspunkt, mål, versjoner og sjekksum. PDF-teksten kontrolleres mot frosset brevtekst. |
| Gjenfinning og gjenbruk ved levering | **L:** [jobber.ts](../server/jobber.ts) gjenfinner dokument/referanse, gjenbruker lagret PDF og kvitterer operasjoner separat. [levering.test.ts](../server/tester/levering.test.ts) bruker falsk Catenda; databasegruppen krever testbase. |

Tiltakene gir et konkret utgangspunkt for avsnitt 5.2.1. At en test finnes,
dokumenterer ikke siste grønne kjøring, produksjonskonfigurasjonen eller Catendas garantier.

**Nyere eksternt testunderlag finnes:** [#902](https://github.com/khjohns/endringsmeldinger/issues/902)
og [#790](https://github.com/khjohns/endringsmeldinger/issues/790) er lukket.
[Sluttkommentaren til #790](https://github.com/khjohns/endringsmeldinger/issues/790#issuecomment-6521475682)
viser til flettede prøver mot Catenda i #908/#916.
[catenda.live.test.ts](../server/tester/catenda.live.test.ts) har C1 for topic,
dokument, referanse og leveringskvitteringer og C2 for et vedlegg i et registrert
varsel via HTTP og Catenda. Dette er nåværende testkode og historisk dokumentert
prøving, ikke nykjørt bevis. Henvisningene til septembertestene i hovedplanen er
derfor ikke hele testgrunnlaget. De lokale feiltestene og de levende prøvene må
vurderes hver for seg.

## Scenarioer for første risikovurdering

### RVG-01: Et registrert varsel blir ikke levert eller fulgt opp tidsnok

Mulig skadefølge er oversittet frist, økonomisk tap eller svekket bevisgrunnlag,
avhengig av kontrakten og den konkrete situasjonen.

**Belegg:** Leveringsvernene over (**L**). Headeren i [jobber.ts](../server/jobber.ts)
beskriver behov for alltid kjørende instans og manuell oppfølging av parkerte jobber.
[Hovedplanens åpne beslutninger](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger)
fører driftsverdier og ansvar under B-09.

Vurderingen må fastsette hvor lenge et varsel kan ligge uten bekreftet levering,
deteksjons- og reaksjonstid, hvem som følger opp, og alternativ fremgangsmåte.
[Catenda-grunnlaget](plans/2026-09-16-godkjenning-og-varig-levering.md#7-catenda-leveringsgarantier)
skiller lokale feiltester fra eksterne garantier. Et GUID-felt eller et negativt
oppslag er ikke alene bevis for sikker gjentakelse.

**Utdypet kodekontroll L:** [start.ts](../server/start.ts) starter jobbkjøreren
når både Catenda-klienten og innloggingen er konfigurert. HTTP-serveren kan
ellers starte uten jobbkjøreren. I [jobber.ts](../server/jobber.ts) driver
`startJobbkjoerer` en løkke som henter klare jobber; `kjoerEnJobb` bruker lease
og operasjonskvitteringer, og `utfallAv` skiller forbigående feil fra avvist og
usikkert utfall. Det finnes dermed en leveringsmekanisme; produksjonsoppsettet
må sikre at den faktisk kjører og følges opp.

[jobber.test.ts](../server/tester/jobber.test.ts) inneholder tester for retry,
parkering, driftsstyrt omstart og utløpt lease. [levering.test.ts](../server/tester/levering.test.ts)
prøver blant annet tapt topic-svar og bekreftet tapt lease før opplasting.
[start.test.ts](../server/tester/start.test.ts) prøver prosessavslutning, men
oppsettet uten Catenda-innlogging beviser ikke alene avslutning mens en virkelig
levering pågår. Ingen av disse testene er kjørt i denne kontrollen.

Eksisterende oppfølging er [#1046](https://github.com/khjohns/endringsmeldinger/issues/1046)
(åpent krav om visning og varsling av stanset levering) og
[#926](https://github.com/khjohns/endringsmeldinger/issues/926) (åpen oppfølging
av blant annet retry og fornyelsesfeil som varer lenger enn leasen).
Dette er ikke en ny reproduksjon av #926. Uavkryssede punkter i eldre issuebeskrivelser
er ikke alene belegg for manglende kode: avvisning av ugyldig brevtekst finnes
for eksempel nå i `lagOppdrag`.

### RVG-02: Tilgangsvernet stopper legitim bruk når Catenda ikke svarer

Mulig skadefølge er at en bruker ikke får lest tidligere brev eller forberedt en
fristkritisk handling.

**Belegg L:** [autorisasjon.ts](../server/autorisasjon.ts), `oppdaterMedlemslisten`,
`lesKontraktsside` og `kontraktsside`. Foreldet medlemskap oppdateres fra
Catenda; kontraktstilknytning krever oppslag der. Uavklart tilgang avvises.
Dette er en beskyttelse og samtidig en tilgjengelighetsavhengighet. Virkningen
avhenger av den konkrete inngangen og rollen; det er ikke påstått at ethvert
Catenda-avbrudd stopper all bruk.

**Presisering etter kontroll av issues og kode:** To forskjellige situasjoner
må holdes fra hverandre:

- **Utdatert medlemsliste og mislykket oppdatering:** Det åpne
  [#51](https://github.com/khjohns/endringsmeldinger/issues/51) følger allerede
  avviket fra B-04 punkt 4. Kommentaren 30.10 knytter det uttrykkelig til TS.
  Vedtaket står under tilbakekalling i [vedtaksfila](plans/vedtak.md).
  **L:** `tilgangOgKropp` i [app.ts](../server/app.ts) kaller
  `krevProsjekttilgang`; den venter på `oppdaterMedlemslisten`.
  [medlemskap.ts](../server/medlemskap.ts), `synkroniserKobling`, lar feilen fra
  medlemshentingen gå videre. `krevProsjekttilgang` logger og kaster
  `Nektet(503, 'ACCESS_UNAVAILABLE', ...)`; ruteren gjør dette til HTTP-svaret
  før saksbehandleren kalles. [autorisasjon.test.ts](../server/tester/autorisasjon.test.ts)
  har en test som forventer nettopp 503 og logging ved gammel liste og feil i
  synkroniseringen. Testen dokumenterer dagens forventning, ikke oppfyllelse av
  B-04. Den er ikke kjørt her. Den gamle issuebeskrivelsens «uten logg» gjelder
  ikke den leste TS-stien.
- **Teamtilknytning kan ikke bekreftes:** `lesKontraktsside` gir
  `CONTRACT_ACCESS_UNAVAILABLE` når teamoppslaget feiler. DL-U15 krever bekreftet
  team for denne lesingen. [register.test.ts](../server/tester/register.test.ts)
  prøver at teamavhengige innganger gir 503, mens leserollen fortsatt kan lese
  med ferskt medlemskap. Dette er et beskrevet tilgangsvern, ikke samme avvik
  som #51. Å bruke gammel medlemsliste løser ikke alene teamavhengigheten.

Vurderingen må omfatte nødvendige lese- og skriveoperasjoner under avbrudd,
og B-09s uavklarte driftsgrenser. Kravet i #51 trenger ikke vedtas på nytt.
Unntakene ved endret eller opphevet prosjektkobling i DL-U10 må fortsatt holdes
atskilt fra vanlig foreldelse av medlemslisten.

### RVG-03: En godkjenning fremstår som legitim etter at serveren er overtatt

Mulig skadefølge er en uautorisert handling og tvist om hvem som godkjente den.

**Dokumentert grunnlag:** B-02 punkt 3 under
[fullmakt og intern godkjenning](plans/vedtak.md#fullmakt-og-intern-godkjenning)
beskriver restrisiko ved overtatt kjøretid og krever ny vurdering i ROS før
produksjon. Dette er en designforutsetning, ikke et påvist angrep eller en
nyverifisert omgåelse i dagens kode.

Scenarioet trenger vurdert sannsynlighet og konsekvens, relevante tiltak og
aksept fra riktig myndighetsnivå. Et designvalg dokumenterer ikke alene
risikoaksept etter veilederens kriterier.

**Omfanget er snevrere før første ekte sak:** [#818](https://github.com/khjohns/endringsmeldinger/issues/818)
og [#831](https://github.com/khjohns/endringsmeldinger/issues/831) er åpne, men
oppdragsgivers [avgrensning 30.10](https://github.com/khjohns/endringsmeldinger/issues/818#issuecomment-6521474432)
og [oppfølgingen i #831](https://github.com/khjohns/endringsmeldinger/issues/831#issuecomment-6521547918)
tar intern godkjenning ut av «Første ekte sak». **L:** [godkjenning.ts](../server/godkjenning.ts)
har `lagPakke` og `registrerHandling`, men søk etter disse samt
`lesGodkjenningskjede` og `erGodkjent` i serverens TypeScript-filer fant
definisjoner og testkall, ingen kall fra produktinngangene. `RUTER` i
[app.ts](../server/app.ts) inneholder ingen godkjenningspakkeinnganger.
Databasehåndhevingen er ikke kontrollert her.

RVG-03 gjelder dermed designrestrisikoen for godkjenningsomfanget, ikke en
påvist omgåelse av en ferdig koblet godkjenningsflyt. Dagens direkte sending
og den fremtidige godkjenningsflyten må vurderes hver for seg. Notatet anbefaler
ikke å bygge intern godkjenning før første sak i strid med avgrensningen.

### RVG-04: En sak kan ikke dokumenteres tilstrekkelig etter datatap, tvist eller avvikling

Mulig skadefølge er tapt eller svekket bevisgrunnlag.

**Belegg:** Frosne brev og sjekksummer (**L**, over).
[F4](plans/2026-09-16-godkjenning-og-varig-levering.md#f4--domene-bevis-og-bevaring)
stiller egne krav til eksport uten appen, dokumentversjoner, leveringskvitteringer
og tydelig angivelse av manglende materiale. B-05 og B-11 står i hovedplanens
åpne beslutninger. [F5](plans/2026-09-16-godkjenning-og-varig-levering.md#f5--produksjonsport)
krever gjenopprettingsøvelse med dokumentert RPO/RTO uten blind ny levering.

Vurderingen må omfatte hele bevisgrunnlaget, akseptabelt datatap og
gjenopprettingstid, bevaring, tidskilde og håndtering når systemets fremstilling
bestrides. Kravene er ikke belegg for at øvelsen eller eksporten er verifisert.

**Arkivflyten er delvis avklart:** Det åpne
[#1060](https://github.com/khjohns/endringsmeldinger/issues/1060) må leses med
[svarene 21.10](https://github.com/khjohns/endringsmeldinger/issues/1060#issuecomment-6309683607)
og [presiseringen samme dag](https://github.com/khjohns/endringsmeldinger/issues/1060#issuecomment-6309722639).
De beskriver at saksbehandler markerer dokumenter i Catenda, som synkroniserer
til Websak, og at vanlig PDF godtas på dette nivået. Tidspunktet for utvelgelsen,
hvilke dokumenter og vedlegg som følger med, og bevaringstid er fortsatt
avklaringspunkter. Dette er oppgitt arbeidsdeling, ikke nyverifisert integrasjon.
ROS-omfanget bør derfor ta med den manuelle utvelgelsen og overføringen videre;
en kvittering fra Catenda dokumenterer ikke alene arkivering i Websak.

### RVG-05: Feilregistrerte opplysninger blir bevart, men håndteres feil

Mulig skadefølge er beslutninger på feil grunnlag eller uklarhet om hva som er
rettet og hvilken betydning rettingen har.

**Dokumentert grunnlag:** B-16 i
[hovedplanens åpne beslutninger](plans/2026-09-16-godkjenning-og-varig-levering.md#34-åpne-beslutninger)
og korrigeringskravet i F5. Planen beskriver avklaringer om aktørrettigheter,
godkjenning og motpartsinnsyn, og krever prosessen før første ekte sak.

Uforanderlighet beskytter historikken, men sikrer ikke at opplysningen var riktig
ved registrering. Vurderingen må derfor omfatte brukerfeil, opplæring og
korrigeringsrutiner. Notatet fastsetter ingen ny korrigeringsregel.

**Korrigering finnes allerede for et avgrenset tilfelle:** **L:**
[kommando.ts](../kjerne/kommandoer/kommando.ts) definerer `korrigering` for
datoen i grunnlagskravet. [forutsetninger.ts](../kjerne/kommandoer/forutsetninger.ts)
krever henvisning til TEs siste opplysning;
[nyttelast.ts](../kjerne/kommandoer/nyttelast.ts) kontrollerer datofeltet og
avviser uendret dato; [skriving.ts](../kjerne/kommandoer/skriving.ts) skriver
et nytt utsagn med referanse til originalen.
[brukerforloep.test.ts](../kjerne/tester/brukerforloep.test.ts) krever at BF-02A,
BF-02C og BF-02D er kjørbare. Dette er lest testkode, ikke nykjørt brukerflyt.

[#1308](https://github.com/khjohns/endringsmeldinger/issues/1308) er fortsatt
åpent, men betyr ikke at datorettingen er ubegynt.
[#1309](https://github.com/khjohns/endringsmeldinger/issues/1309),
[#276](https://github.com/khjohns/endringsmeldinger/issues/276) og
[#519](https://github.com/khjohns/endringsmeldinger/issues/519) er også åpne og
følger andre rettinger og den samlede flyten. Vurder disse mot
[MM-U52](plans/vedtak.md#mm-u52), som opphever MM-U21 og endrer OV-U56,
ikke bare eldre henvisninger i issuebeskrivelsene. Scenarioet gjelder feil
bruk og utilstrekkelig håndtering av rettinger; det er ikke en påstand om at
all korrigeringsstøtte mangler.

## Supplerende scenarioer og leveringsforløp, 12.11.2026

Denne suppleringen bygger på GitHub-issues med kommentarer lest 12.11 og to
kodefiler hentet fra `main` samme dag. Den er en datert utvidelse av grunnlaget,
ikke en ny kontroll av hele committen angitt øverst. Blobene som ble lest er
`440a933a91a0ae3571cdbc1de9c36637e50a8baa` for webhooken og
`051ba8326d25fe248299e9fd6069b830127b11ca` for migrasjonsvakten.
Ingen produktkjøring eller databasekontroll er utført i suppleringen.

### RVG-06: Personopplysninger beholdes unødvendig i webhook-innboksen

Mulig skadefølge er unødvendig eksponering og bevaring av navn og e-post utenfor
journalen. Journalens bruk av aktør-ID dekker ikke automatisk integrasjonsdata.

**Belegg L:** [webhook.ts](../server/webhook.ts), `taImot` og `mottaHendelse`,
sender den mottatte kroppen videre til `koe_api.motta_hendelse` uten å fjerne
navn og e-post i TS-laget. Dette beskriver overleveringen til prosedyren;
gjeldende databasebehandling og sletterettigheter er ikke kontrollert.

[#940](https://github.com/khjohns/endringsmeldinger/issues/940) er åpent.
[Arbeidsvalget 30.10](https://github.com/khjohns/endringsmeldinger/issues/940#issuecomment-6521942934)
avklarer allerede at navn og e-post skal fjernes, mens ID-er og hendelsestype
beholdes. Kommentaren drøfter også å utelate opplysningene ved mottak.
Risikovurderingen bør følge opp dataminimering, tilgang og sletting gjennom hele
innboksløpet; dette er ikke et nytt ubesvart valg om hvorvidt opplysningene skal fjernes.

### RVG-07: En senere utgivelse gjør gamle saker uleselige

Mulig skadefølge er utilgjengelige saker og svekket bevisgrunnlag etter en
programvareoppgradering, selv om dataene fortsatt ligger i databasen.

**Issuebelegg:** Det åpne [#1058](https://github.com/khjohns/endringsmeldinger/issues/1058)
beskriver behov for faste historiske journaler som nye lesere prøves mot.
Tester der dagens kode både skriver og leser, kan dele samme endrede
formatforutsetning og derfor overse brudd med tidligere lagrede data.

Dette er et dokumentert testkrav, ikke et nyreprodusert kompatibilitetsbrudd
eller en uttømmende kontroll av dagens testdekning. Vurderingen bør etterspørre
belegg for lesing av tidligere journalformater, og håndtering av saker som
ikke forstås etter oppgradering eller tilbakerulling.

### RVG-08: Første reelle data tas i bruk før migrasjonsvernet aktiveres

Mulig skadefølge er at senere skjemaendringer ikke følger den planlagte
rekkefølgen for tillegg og fjerning, med risiko for datatap eller vanskelig
tilbakerulling.

**Belegg L:** [migrasjonsvakt.py](../.github/scripts/migrasjonsvakt.py),
`FOERSTE_EKTE_SAK` og `to_trinn`: konstanten var `None` i filen lest 12.11.
Vakten kontrollerer tillegg som er merket, men kravet om merking av alle nye
migrasjoner etter første ekte sak avhenger av at konstanten er satt.
[#1091](https://github.com/khjohns/endringsmeldinger/issues/1091) er åpent og
plasserer aktiveringen i PR-en som tar basen i bruk.

Dette er en risiko ved overgangen til reell bruk, ikke en feil ved dagens
utviklingsoppsett. Øvrige migrasjonsvern faller ikke bort fordi konstanten er
`None`. Innføringen bør dokumentere at aktivering og relevant kontroll faktisk
er utført før første reelle data.

### Presisering av RVG-01: Brukeren oppdager ikke leveringssvikten

Mulig skadefølge er at brukeren oppfatter intern registrering som fullført
levering og derfor ikke følger opp et fristkritisk brev.

**Issuebelegg:** [Kommentaren i #1046](https://github.com/khjohns/endringsmeldinger/issues/1046#issuecomment-6806034248)
opplyser at `LastetKjernesak.leveringsoppdrag` hentes, men ikke leses av
Varden, og at den eldre henvisningen til `leveringstekst` ikke lenger gjelder.
Dagens visning er ikke prøvd i denne suppleringen. Dette konkretiserer behovet
for synlig leveringsstatus og veiledning, uten å gjøre eldre UI-beskrivelser
til nye observasjoner.

### Presisering av RVG-01: Ekstern handling etter mulig utløp av lease

Mulig skadefølge er overlappende leveringsforsøk og usikker ekstern effekt.

**Issuebelegg:** [Kommentaren i #926](https://github.com/khjohns/endringsmeldinger/issues/926#issuecomment-6287390011)
beskriver forbigående feil i fornyelsen som varer gjennom hele leasetiden.
Det må skilles fra en uttrykkelig bekreftet tapt lease, som har et
avbruddsvern. Scenarioet gjelder at den gamle kjøreren kan fortsette en
ekstern handling mens en annen kjører har overtatt jobben.
Dette er eksisterende oppfølging, ikke en ny reproduksjon eller påvist duplikat.

**Nyere avklaring:** [#926](https://github.com/khjohns/endringsmeldinger/issues/926)
fører nå svaret fra 11.11 i [#1791](https://github.com/khjohns/endringsmeldinger/issues/1791):
parkering etter et fast antall leveringsforsøk er besluttet og står som
gjenstående implementering. Eksempelet «24» i issuet skal ikke her fastsettes
som endelig driftsverdi. Behovet for en øvre grense er ikke lenger et ubesvart
produktvalg.

Suppleringen anbefaler at synlig leveringssvikt, dataminimering i innboksen
og kompatibilitet ved oppgraderinger prioriteres i videre ROS-arbeid.
Oppfølgingen ligger i de eksisterende issuene; ingen nye risikonivåer,
vedtak eller parallelle bestillinger opprettes.

## Anbefalt bruk av vurderingen

Bruk scenarioene som et første avgrenset underlag, ikke en uttømmende trusselliste.
For hvert scenario bør vurderingen samle:

1. Informasjonsverdi, berørte arbeidsoperasjoner og konkret skadefølge.
2. Trussel eller årsak, sårbarheter og eksisterende tiltak med verifikasjonsbelegg.
3. Konsekvens, sannsynlighet og usikkerhet etter virksomhetens kriterier.
4. Supplerende tiltak, ansvarlig og forventet virkning.
5. Restrisiko, hvem som kan akseptere den og når den skal vurderes på nytt.

Prioriter avklaring av driftsoppfølging, fristkritiske avbrudd, alternativ varsling,
korrigering og bevisbevaring. F5 sier at status for de organisatoriske prosessene
ikke er innhentet. Det er manglende avklart grunnlag i repoet, ikke bevis på at
virksomheten mangler prosessene. Innhent eksisterende dokumentasjon før nye
tiltak bestilles. Oppfølging hører til hovedplanens eksisterende beslutninger og
arbeidspakker og [første ekte sak, #1065](https://github.com/khjohns/endringsmeldinger/issues/1065).

## GitHub-kontroll og oppfølging

Statusene over er lest fra GitHub 11.11.2026. Issuebeskrivelser, relevante
kommentarer og dagens kode er holdt fra hverandre. Et lukket issue er ikke
nykjørt verifikasjon; et åpent issue betyr ikke at alle delene mangler.

[#1019](https://github.com/khjohns/endringsmeldinger/issues/1019) er åpent, uten
kommentarer, og har uavkryssede punkter for blant annet ROS, hendelseshåndtering,
Catenda-svar, restore-øvelse og ansvarlige for B-05/B-09/B-11.
[#1065](https://github.com/khjohns/endringsmeldinger/issues/1065) plasserer
produksjonsporten i arbeidsrekkefølgen og viser til de eksisterende oppgavene.
Denne vurderingen oppretter ikke parallelle bestillinger eller endrer rekkefølgen.

Den viktigste konkrete presiseringen er #51: nåværende TS-kode og testforventning
understøtter det allerede sporede avviket ved mislykket oppdatering av gammel
medlemsliste. De andre scenarioene er presisert med implementerte mekanismer,
delvis avklarte prosesser og eksisterende oppfølging. Ingen ny sikkerhetsfeil
er reprodusert i denne kontrollen.

## Verifikasjon og grenser

- Lest: CLAUDE.md, relevante arbeidsregler, hovedplanens avgrensninger, åpne
  beslutninger og F4/F5, relevant beslutning om godkjenning, samt utvalgt
  tilgangs-, kommando- og leveringskode og tester.
- Én subagent undersøkte levering, bevisverdi og gjenoppretting; i den utdypende
  runden undersøkte en annen godkjenning og korrigering. Dette er arbeidsdeling,
  ikke ekstern sikkerhetsrevisjon.
- Produktets tester er ikke kjørt. Databasekatalog, produksjonsoppsett,
  siste CI-resultat, levende Catenda og virksomhetens driftsrutiner er ikke kontrollert.
  Arbeidsmiljøet manglet `node_modules` og `KOE_SQLSERVER_TILKOBLING`; denne
  runden ble avgrenset til kode, testforventninger og GitHub-kilder uten å sette
  opp et nytt testmiljø. Nye påstander om databasehåndheving er ikke utledet
  fra migrasjonsfiler.
- Historiske Python-, SQLite- og PostgreSQL-funn er ikke brukt som belegg for
  dagens sårbarheter; se [funnregisterets avgrensning](plans/2026-09-16-godkjenning-og-varig-levering.md#4-funnregister).
- Ingen risikonivåer, nye domenevedtak eller aksept av restrisiko er fastsatt.

